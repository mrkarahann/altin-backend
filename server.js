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

// Browser'ı başlat (lazy initialization)
async function getBrowser() {
  if (!browser) {
    console.log('🚀 Puppeteer browser başlatılıyor...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });
    console.log('✅ Browser başlatıldı');
  }
  return browser;
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
    await page.waitForTimeout(3000);

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

    console.error('❌ Beklenmeyen API yanıtı formatı');
    return res.status(500).json({
      error: 'Beklenmeyen API yanıtı formatı',
      response: response,
    });
  } catch (error) {
    console.error('❌ Harem Altın backend hatası:', error.message || error.toString());

    // Sayfayı kapat (eğer açıksa)
    if (page) {
      try {
        await page.close();
      } catch (e) {
        // Ignore
      }
    }

    const status = error.response?.status || 500;

    return res.status(status).json({
      error: 'Harem Altın sunucusuna bağlanılamadı',
      details: error.message || String(error),
      status: status,
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
