const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');

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
    console.log("🔄 Harem Altın'a Puppeteer ile istek gönderiliyor...");

    // Chromium'u başlat (Render için optimize edilmiş)
    chromium.setGraphicsMode(false);
    
    browser = await puppeteer.launch({
      args: [...chromium.args, '--single-process', '--no-zygote'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    page = await browser.newPage();

    // User-Agent ayarla
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

    // Cloudflare challenge'ı bekle
    console.log('⏳ Cloudflare challenge bekleniyor...');
    await page.waitForTimeout(5000);

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
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Referer': 'https://www.haremaltin.com/canli-piyasalar/',
            'Origin': 'https://www.haremaltin.com',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: formData.toString(),
        }
      );

      return await fetchResponse.json();
    });

    // Browser'ı kapat
    await browser.close();
    browser = null;
    page = null;

    // Yanıtı kontrol et
    if (response && typeof response === 'object' && response.data) {
      console.log('✅ Harem Altın verisi başarıyla alındı');
      
      // Trend hesapla (basit - gram altın fiyatına göre)
      const gramPrice = parseFloat(
        (response.data.ALTIN?.satis || '0')
          .toString()
          .replace(/\./g, '')
          .replace(',', '.')
      );
      
      // PropertiesService yerine basit bir trend hesaplama
      // (Her istekte stable döndür, Flutter tarafında trend hesaplanacak)
      const result = {
        success: true,
        trend: 'stable', // Flutter tarafında hesaplanacak
        data: {
          gram: response.data.ALTIN || {},
          ceyrek: response.data.CEYREK_YENI || {},
          yarim: response.data.YARIM_YENI || {},
          tam: response.data.TAM_YENI || {},
        },
      };
      
      return res.json(result);
    }

    console.error('❌ Beklenmeyen API yanıtı formatı:', JSON.stringify(response));
    return res.status(500).json({
      success: false,
      error: 'Beklenmeyen API yanıtı formatı',
      response: response,
    });
  } catch (error) {
    console.error('❌ Harem Altın backend hatası:', error.message || error.toString());
    console.error('Stack trace:', error.stack);

    // Browser'ı kapat (eğer açıksa)
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

    return res.status(500).json({
      success: false,
      error: 'Harem Altın sunucusuna bağlanılamadı',
      details: error.message || String(error),
      type: error.constructor.name,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Harem Altın backend proxy ${PORT} portunda çalışıyor`);
});
