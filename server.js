const express = require('express');
const axios = require('axios');
const cors = require('cors');

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
  try {
    console.log("🔄 Harem Altın'a axios ile istek gönderiliyor...");

    // Rastgele delay ekle (100-500ms) - gerçek insan davranışına benzesin
    const delay = Math.floor(Math.random() * 400) + 100; // 100-500ms arası
    await new Promise(resolve => setTimeout(resolve, delay));

    const response = await axios.post(
      'https://www.haremaltin.com/dashboard/ajax/doviz',
      'dil_kodu=tr',
      {
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Origin': 'https://www.haremaltin.com',
          'Referer': 'https://www.haremaltin.com/canli-piyasalar/',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        },
        timeout: 20000, // 20 saniye timeout
      }
    );

    const data = response.data;

    // Yanıtı kontrol et
    if (data && typeof data === 'object' && data.data) {
      console.log('✅ Harem Altın verisi başarıyla alındı');
      return res.json({ data: data.data });
    }

    console.error('❌ Beklenmeyen API yanıtı formatı:', JSON.stringify(data));
    return res.status(500).json({
      error: 'Beklenmeyen API yanıtı formatı',
      response: data,
    });
  } catch (error) {
    // Cloudflare 403 hatası kontrolü
    if (error.response?.status === 403) {
      console.log('Cloudflare Blocked');
      return res.status(403).json({
        error: 'Harem Altın sunucusuna bağlanılamadı',
        details: 'Cloudflare Blocked',
        status: 403,
      });
    }

    // Diğer hatalar için detaylı log
    console.error('❌ Harem Altın backend hatası:', error.message || error.toString());
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    }

    return res.status(error.response?.status || 500).json({
      error: 'Harem Altın sunucusuna bağlanılamadı',
      details: error.message || String(error),
      status: error.response?.status || 500,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Harem Altın backend proxy ${PORT} portunda çalışıyor`);
});
