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
    console.log("🔄 Harem Altın'a istek gönderiliyor (backend)...");

    const response = await axios.post(
      'https://www.haremaltin.com/dashboard/ajax/doviz',
      'dil_kodu=tr',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.haremaltin.com/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 20000, // 20 saniye timeout
      }
    );

    const data = response.data;

    if (data && typeof data === 'object' && data.data) {
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
    const status = error.response?.status || 500;

    return res.status(status).json({
      error: 'Harem Altın sunucusuna bağlanılamadı',
      details: error.message || String(error),
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Harem Altın backend proxy ${PORT} portunda çalışıyor`);
});
