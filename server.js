const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Stealth plugin'i ekle
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basit sağlık kontrolü
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Harem Altın backend proxy çalışıyor' });
});

// Harem Altın proxy endpoint
app.get('/gold-prices', async (req, res) => {
  let browser = null;
  let page = null;
  
  try {
    console.log("🔄 Harem Altın'a Puppeteer Stealth ile istek gönderiliyor...");

    // Browser'ı başlat (Render için kritik argümanlar)
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote',
      ],
      timeout: 60000, // 60 saniye timeout
    });

    page = await browser.newPage();

    // User-Agent ayarla (gerçek Windows Chrome)
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );

    // Viewport ayarla
    await page.setViewport({ width: 1920, height: 1080 });

    // Sayfaya git
    console.log('📄 Canlı piyasalar sayfasına gidiliyor...');
    await page.goto('https://www.haremaltin.com/canli-piyasalar/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // AJAX isteğinin tamamlanması için bekle
    console.log('⏳ AJAX isteği bekleniyor...');
    await page.waitForTimeout(2000); // 2 saniye bekle

    // Sayfa içindeki verileri çek
    console.log('📡 Sayfa içindeki veriler çekiliyor...');
    const response = await page.evaluate(async () => {
      // Önce localStorage veya window objesinden veri çekmeyi dene
      let goldData = null;

      // window objesinde altın verilerini ara
      if (window.altinData || window.goldData || window.piyasaData) {
        goldData = window.altinData || window.goldData || window.piyasaData;
      }

      // Eğer window'da yoksa, AJAX isteğini manuel olarak yap
      if (!goldData) {
        const formData = new URLSearchParams();
        formData.append('dil_kodu', 'tr');

        const fetchResponse = await fetch(
          'https://www.haremaltin.com/dashboard/ajax/doviz',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'Referer': 'https://www.haremaltin.com/canli-piyasalar/',
              'Origin': 'https://www.haremaltin.com',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: formData.toString(),
          }
        );

        goldData = await fetchResponse.json();
      }

      return goldData;
    });

    // Browser'ı kapat (memory limit için kritik)
    await browser.close();
    browser = null;
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

    // Browser'ı kapat (eğer açıksa) - memory limit için kritik
    if (page) {
      try {
        await page.close();
      } catch (e) {
        // Ignore
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore
      }
    }

    // Cloudflare 403 hatası kontrolü
    if (error.message && error.message.includes('403')) {
      console.log('Cloudflare Blocked');
      return res.status(403).json({
        error: 'Harem Altın sunucusuna bağlanılamadı',
        details: 'Cloudflare Blocked',
        status: 403,
      });
    }

    return res.status(500).json({
      error: 'Harem Altın sunucusuna bağlanılamadı',
      details: error.message || String(error),
      type: error.constructor.name,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Harem Altın backend proxy ${PORT} portunda çalışıyor`);
});
