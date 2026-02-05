# 🔧 Render Build Fix - Puppeteer Chrome Kurulumu

## Sorun
Puppeteer Chrome binary'sini bulamıyor: "Could not find Chrome (ver. 131.0.6778.204)"

## Çözüm

### 1. Render Dashboard'da Build Command'ı Güncelle

Render Dashboard → Service Settings → Build Command:

```bash
npm install && npm run build
```

**VEYA** (eğer yukarıdaki çalışmazsa):

```bash
npm install && npx puppeteer browsers install chrome
```

### 2. Environment Variables Ekle

Render Dashboard → Environment:

```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
```

### 3. Manual Deploy

1. Render Dashboard → Deploy sekmesi
2. "Manual Deploy" → "Deploy latest commit"
3. Build loglarını izle - "Installing Chrome" mesajını görmelisin

## Notlar

- Build süresi 5-10 dakika sürebilir (Chrome indiriliyor)
- İlk deploy daha uzun sürebilir
- Build başarılı olursa "✅ Browser başlatıldı" mesajını göreceksin

