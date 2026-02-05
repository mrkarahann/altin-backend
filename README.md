# Harem Altın Backend Proxy

Bu Node.js servisi, Flutter uygulamasının Harem Altın verilerine erişmesini sağlar.

## 🚀 Render.com'a Deploy (Ücretsiz)

### Adım 1: GitHub'a Yükle

1. GitHub'da yeni bir repository oluştur (örnek: `altin-backend`)
2. Backend klasörünü GitHub'a push et:

```bash
cd backend/backend
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/KULLANICI_ADI/altin-backend.git
git push -u origin main
```

### Adım 2: Render.com'da Servis Oluştur

1. https://render.com adresine git ve ücretsiz hesap oluştur
2. "New +" → "Web Service" seç
3. GitHub repository'ni bağla
4. Ayarlar:
   - **Name:** `altin-backend` (veya istediğin isim)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free` (ücretsiz)
5. "Create Web Service" tıkla

### Adım 3: URL'i Al

Deploy tamamlandıktan sonra Render sana bir URL verecek:
- Örnek: `https://altin-backend.onrender.com`

Bu URL'i Flutter uygulamasındaki `PriceService`'e yazacağız.

## 📱 Flutter Tarafı

Deploy sonrası `lib/services/price_service.dart` dosyasındaki `_apiUrl` değerini Render URL'in ile değiştir:

```dart
static const String _apiUrl = 'https://altin-backend.onrender.com/gold-prices';
```

## 🔧 Lokal Test (Opsiyonel)

Lokal test için:

```bash
cd backend/backend
npm install
npm start
```

Sunucu `http://localhost:3000` üzerinde çalışır.
