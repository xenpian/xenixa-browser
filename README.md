# Xenixa Browser

Özel Chromium C++ motoru ile Electron tabanlı tarayıcı.

## Özellikler

- ✅ Electron tabanlı uygulama yapısı
- ✅ Özel C++ Chromium motoru entegrasyonu
- ✅ Tab sistemi (tarayıcı gibi)
- ✅ Modern ve şık UI
- ✅ Native bridge ile C++ entegrasyonu
- ✅ URL navigasyonu
- ✅ Tab yönetimi (oluşturma, kapatma, geçiş)

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Native modülleri derle
npm run build-native

# Uygulamayı başlat
npm start
```

## Yapı

```
xenixa/
├── electron/
│   ├── main.js           # Electron ana süreci
│   ├── preload.js        # Preload script
│   └── native-bridge.js  # Native C++ bridge
├── native/
│   ├── xen_engine.h      # C++ header
│   ├── xen_engine.cpp    # C++ implementation
│   └── xen_webview.cpp   # WebView implementation
├── ui/
│   ├── index.html        # Ana UI
│   ├── styles.css        # Stiller
│   └── renderer.js       # Renderer process
├── binding.gyp           # Node native binding config
└── package.json          # Node.js config
```

## Native C++ Motoru

Bu proje Electron'un kendi Chromium motorunu kullanmak yerine özel bir C++ Chromium entegrasyonu kullanır:

- `native/xen_engine.cpp`: Ana motor implementasyonu
- `native/xen_webview.cpp`: WebView entegrasyonu
- `binding.gyp`: Native modül build konfigürasyonu

## Tab Sistemi

- Yeni tab oluşturma (+ butonu)
- Tab kapatma (× butonu)
- Tablar arası geçiş
- Her tab için bağımsız URL navigasyonu

## Geliştirme

```bash
# Native modülleri rebuild et
npm run rebuild

# Electron'u development mode'da çalıştır
npm start
```

## Notlar

- Native modüller için Visual Studio Build Tools gereklidir (Windows)
- Node.js ve npm kurulu olmalıdır
- Chromium C++ entegrasyonu geliştirme aşamasındadır
