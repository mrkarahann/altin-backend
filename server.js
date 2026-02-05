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

    const response = await axios.post(
      'https://www.haremaltin.com/dashboard/ajax/doviz',
      'dil_kodu=tr',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.haremaltin.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://www.haremaltin.com',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'X-Requested-With': 'XMLHttpRequest',
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
