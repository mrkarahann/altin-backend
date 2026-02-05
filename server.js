const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Puppeteer browser instance (singleton)
let browser = null;
let browserInitPromise = null;

// Browser'ı başlat (lazy initialization, thread-safe)
async function getBrowser() {
  if (browserInitPromise) {
    return browserInitPromise;
  }

  browserInitPromise = (async () => {
    if (!browser) {
      console.log('🚀 Puppeteer browser başlatılıyor...');
      try {
        // Chrome executable path'i kontrol et (opsiyonel - Puppeteer otomatik bulacak)
        let executablePath;
        try {
          executablePath = puppeteer.executablePath();
          console.log('📦 Chrome path bulundu:', executablePath);
        } catch (e) {
          console.log('⚠️ Chrome path bulunamadı, Puppeteer otomatik bulacak');
          executablePath = undefined;
        }
        
        browser = await puppeteer.launch({
          headless: true,
          // executablePath belirtme - Puppeteer kendi bulsun
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process', // Render free tier için önemli
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-default-apps',
            '--disable-features=TranslateUI',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-sync',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-default-browser-check',
            '--no-first-run',
            '--safebrowsing-disable-auto-update',
            '--enable-automation',
            '--password-store=basic',
            '--use-mock-keychain',
          ],
          timeout: 60000, // 60 saniye timeout
        });
        console.log('✅ Browser başlatıldı');
      } catch (error) {
        console.error('❌ Browser başlatma hatası:', error.message);
        console.error('Stack:', error.stack);
        browserInitPromise = null;
        throw error;
      }
    }
    return browser;
  })();

  return browserInitPromise;
}

// Basit sağlık kontrolü
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Harem Altın backend proxy çalışıyor' });
});

// Harem Altın proxy endpoint
app.get('/gold-prices', async (req, res) => {
  let page = null;
  try {
    console.log("🔄 Harem Altın'a Puppeteer ile istek gönderiliyor...");

    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();

    // User-Agent ve diğer header'ları ayarla
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Viewport ayarla
    await page.setViewport({ width: 1920, height: 1080 });

    // Ana sayfaya git (cookie'ler için)
    console.log('📄 Ana sayfaya gidiliyor...');
    await page.goto('https://www.haremaltin.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Cloudflare challenge'ı bekle (eğer varsa)
    console.log('⏳ Cloudflare challenge bekleniyor...');
    await page.waitForTimeout(5000); // 5 saniye bekle

    // API endpoint'ine POST isteği yap
    console.log('📡 API endpoint\'ine istek gönderiliyor...');
    const response = await page.evaluate(async () => {
      const formData = new URLSearchParams();
      formData.append('dil_kodu', 'tr');

      const fetchResponse = await fetch(
        'https://www.haremaltin.com/dashboard/ajax/doviz',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://www.haremaltin.com/',
            'Origin': 'https://www.haremaltin.com',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: formData.toString(),
        }
      );

      return await fetchResponse.json();
    });

    // Sayfayı kapat
    await page.close();
    page = null;

    // Yanıtı kontrol et
    if (response && typeof response === 'object' && response.data) {
      console.log('✅ Harem Altın verisi başarıyla alındı');
      return res.json({ data: response.data });
    }

    console.error('❌ Beklenmeyen API yanıtı formatı:', JSON.stringify(response));
    return res.status(500).json({
      error: 'Beklenmeyen API yanıtı formatı',
      response: response,
    });
  } catch (error) {
    console.error('❌ Harem Altın backend hatası:', error.message || error.toString());
    console.error('Stack trace:', error.stack);

    // Sayfayı kapat (eğer açıksa)
    if (page) {
      try {
        await page.close();
      } catch (e) {
        // Ignore
      }
    }

    // Browser'ı sıfırla (eğer crash olduysa)
    if (error.message && error.message.includes('Target closed')) {
      console.log('🔄 Browser crash oldu, yeniden başlatılacak...');
      browser = null;
      browserInitPromise = null;
    }

    return res.status(500).json({
      error: 'Harem Altın sunucusuna bağlanılamadı',
      details: error.message || String(error),
      type: error.constructor.name,
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM sinyali alındı, browser kapatılıyor...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Harem Altın backend proxy ${PORT} portunda çalışıyor`);
});
