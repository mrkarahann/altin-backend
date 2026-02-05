const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie jar oluştur
const cookieJar = new CookieJar();
const axiosWithCookies = wrapper(axios.create({ jar: cookieJar }));

// Basit sağlık kontrolü
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Harem Altın backend proxy çalışıyor' });
});

// Harem Altın proxy endpoint
app.get('/gold-prices', async (req, res) => {
  try {
    console.log("🔄 Harem Altın'a istek gönderiliyor (backend)...");

    // Önce ana sayfaya gidip cookie'leri al
    try {
      await axiosWithCookies.get('https://www.haremaltin.com/', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
        },
        timeout: 10000,
      });
      console.log('✅ Ana sayfa ziyareti başarılı, cookie\'ler alındı');
    } catch (e) {
      console.log('⚠️ Ana sayfa ziyareti başarısız, devam ediliyor...');
    }

    // Şimdi API endpoint'ine istek at
    const response = await axiosWithCookies.post(
      'https://www.haremaltin.com/dashboard/ajax/doviz',
      'dil_kodu=tr',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.haremaltin.com/',
          'Origin': 'https://www.haremaltin.com',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'X-Requested-With': 'XMLHttpRequest',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'Connection': 'keep-alive',
        },
        timeout: 20000,
        maxRedirects: 5,
      }
    );

    const data = response.data;

    if (data && typeof data === 'object' && data.data) {
      console.log('✅ Harem Altın verisi başarıyla alındı');
      // Flutter tarafıyla uyumlu format: { data: {...} }
      return res.json({ data: data.data });
    }

    console.error('❌ Beklenmeyen API yanıtı formatı (backend)');
    return res.status(500).json({
      error: 'Beklenmeyen API yanıtı formatı',
    });
  } catch (error) {
    console.error(
      '❌ Harem Altın backend hatası:',
      error.message || error.toString()
    );
    
    // Daha detaylı hata bilgisi
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    }
    
    const status = error.response?.status || 500;

    return res.status(status).json({
      error: 'Harem Altın sunucusuna bağlanılamadı',
      details: error.message || String(error),
      status: status,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Harem Altın backend proxy ${PORT} portunda çalışıyor`);
});
