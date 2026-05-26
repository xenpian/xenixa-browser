const { app, BrowserWindow, ipcMain, shell, session, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');

// Catch uncaught exceptions to prevent internal Electron errors (such as Render frame disposed) from crashing the application.
process.on('uncaughtException', (error) => {
  if (error && error.message && error.message.includes('Render frame was disposed')) {
    console.warn('[MAIN] Suppressed uncaught exception:', error);
    return;
  }
  console.error('[MAIN] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[MAIN] Unhandled Rejection at:', promise, 'reason:', reason);
});

let torProcess = null;
let torConnectedState = false;
let torConnectingState = false;

let permissionsRegistry = {};
let permissionsFilePath = '';

let settingsRegistry = {
  customWarpPath: '',
  customTorPath: ''
};
let settingsFilePath = '';

function loadPermissions() {
  try {
    if (fs.existsSync(permissionsFilePath)) {
      permissionsRegistry = JSON.parse(fs.readFileSync(permissionsFilePath, 'utf8'));
    }
  } catch (err) {
    console.error("Failed to load permissions registry:", err);
  }
}

function savePermissions() {
  try {
    fs.writeFileSync(permissionsFilePath, JSON.stringify(permissionsRegistry, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to save permissions registry:", err);
  }
}

function loadSettings() {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
      settingsRegistry = { ...settingsRegistry, ...data };
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settingsRegistry, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}

function getPermissionState(origin, permission) {
  if (!permissionsRegistry[origin]) return 'prompt';
  return permissionsRegistry[origin][permission] || 'prompt';
}

function setPermissionState(origin, permission, state) {
  if (!permissionsRegistry[origin]) permissionsRegistry[origin] = {};
  permissionsRegistry[origin][permission] = state;
  savePermissions();
}

function getPermissionKey(permission, details) {
  if (permission === 'media') {
    const mediaTypes = (details && details.mediaTypes) ? details.mediaTypes : [];
    const hasVideo = mediaTypes.includes('video');
    const hasAudio = mediaTypes.includes('audio');
    if (hasVideo && hasAudio) return 'media-video-audio';
    if (hasVideo) return 'camera';
    if (hasAudio) return 'microphone';
    return 'media';
  }
  return permission;
}

function getOrigin(url) {
  try {
    return new URL(url).origin;
  } catch (e) {
    return url;
  }
}

const handlePermissionCheck = (webContents, permission, requestingOrigin, details) => {
  if (!webContents || webContents.isDestroyed()) return false;
  let origin = requestingOrigin;
  if (!origin) {
    try {
      origin = new URL(webContents.getURL()).origin;
    } catch (e) {
      try {
        origin = webContents.getURL();
      } catch (err) {
        return false;
      }
    }
  }
  origin = getOrigin(origin);
  const key = getPermissionKey(permission, details);
  const state = getPermissionState(origin, key);
  return state === 'granted';
};

const handlePermissionRequest = (webContents, permission, callback, details) => {
  if (!webContents || webContents.isDestroyed()) {
    callback(false);
    return;
  }
  const win = webContents.getOwnerBrowserWindow ? webContents.getOwnerBrowserWindow() : null;
  if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
    const requestId = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    let requestingUrl;
    try {
      requestingUrl = (details && details.requestingUrl) ? details.requestingUrl : webContents.getURL();
    } catch (e) {
      callback(false);
      return;
    }
    const origin = getOrigin(requestingUrl);
    const key = getPermissionKey(permission, details);

    const state = getPermissionState(origin, key);
    if (state === 'granted') {
      callback(true);
      return;
    }
    if (state === 'denied') {
      callback(false);
      return;
    }

    permissionRequests.set(requestId, {
      callback,
      origin,
      key
    });

    try {
      win.webContents.send('permission-request', {
        id: requestId,
        url: requestingUrl,
        permission: permission,
        mediaTypes: (details && details.mediaTypes) ? details.mediaTypes : [],
        webContentsId: webContents.id
      });
    } catch (err) {
      callback(false);
      permissionRequests.delete(requestId);
    }
  } else {
    callback(false);
  }
};

// WhatsApp ve diğer sitelerin Electron'u tanımaması için Chrome user agent kullan
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FIREFOX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0';
app.userAgentFallback = CHROME_UA;

const openWindows = new Set();
const activeDownloadSessions = new Set(); // çift kayıt önleme
const permissionRequests = new Map();

// İndirme handler'ı
async function handleDownload(win, item) {
  if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) return;
  const downloadId = Date.now().toString() + Math.random().toString(36).slice(2, 7);
  const savePath = path.join(os.homedir(), 'Downloads', item.getFilename());

  try {
    item.setSavePath(savePath);
  } catch (e) {
    console.error("Failed to set save path:", e);
  }

  // Dosya ikonunu al (Windows'un gerçek ikonu) — async/await ile düzgün çek
  let fileIconDataUrl = null;
  try {
    const img = await app.getFileIcon(savePath, { size: 'normal' });
    fileIconDataUrl = img ? img.toDataURL() : null;
  } catch (_e) {}

  if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
    try {
      win.webContents.send('download-started', {
        id: downloadId,
        filename: item.getFilename(),
        totalBytes: item.getTotalBytes(),
        savePath,
        fileIcon: fileIconDataUrl,
      });
    } catch (e) {}
  }

  let lastBytes = 0;
  let lastTime = Date.now();

  item.on('updated', (_e, state) => {
    if (win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) return;
    if (state === 'progressing') {
      const now = Date.now();
      const received = item.getReceivedBytes();
      const elapsed = (now - lastTime) / 1000 || 1;
      const speed = Math.round((received - lastBytes) / elapsed);
      lastBytes = received;
      lastTime = now;

      try {
        win.webContents.send('download-progress', {
          id: downloadId,
          receivedBytes: received,
          totalBytes: item.getTotalBytes(),
          speed: Math.max(0, speed),
          isPaused: item.isPaused(),
        });
      } catch (err) {}
    }
  });

  item.once('done', (_e, state) => {
    if (win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) {
      cleanupIPC();
      return;
    }
    // Tamamlanınca gerçek dosya ikonunu gönder
    app.getFileIcon(savePath, { size: 'normal' }).then(img => {
      if (win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) return;
      const iconUrl = img ? img.toDataURL() : null;
      win.webContents.send('download-done', {
        id: downloadId,
        state,
        savePath,
        fileIcon: iconUrl,
      });
    }).catch(() => {
      if (win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) return;
      win.webContents.send('download-done', { id: downloadId, state, savePath, fileIcon: null });
    }).finally(() => {
      cleanupIPC();
    });
  });

  function cleanupIPC() {
    ipcMain.removeAllListeners(`download-pause-${downloadId}`);
    ipcMain.removeAllListeners(`download-resume-${downloadId}`);
    ipcMain.removeAllListeners(`download-cancel-${downloadId}`);
  }

  ipcMain.on(`download-pause-${downloadId}`, () => {
    try {
      item.pause();
    } catch (e) {}
  });
  ipcMain.on(`download-resume-${downloadId}`, () => {
    try {
      item.resume();
    } catch (e) {}
  });
  ipcMain.on(`download-cancel-${downloadId}`, () => {
    try {
      item.cancel();
    } catch (e) {}
  });
}

function createWindow(initialUrl = 'about:blank', x = null, y = null, isPopup = false) {
  const width = isPopup ? 650 : 1620;
  const height = isPopup ? 750 : 950;

  const winOptions = {
    width,
    height,
    icon: path.join(__dirname, '../ui/assets/logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
      // webSecurity kaldırıldı — false yapmak Chromium service worker
      // origin doğrulamasıyla çakışarak renderer process'i sonlandırıyordu.
      // CORS yerine onHeadersReceived ile header ekleniyor.
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff00',
      symbolColor: 'rgb(255, 255, 255)',
      height: 40
    },
    frame: false
  };
  
  if (x !== null && y !== null) {
    winOptions.x = Math.round(x - width / 2);
    winOptions.y = Math.round(y - height / 2);
  }

  const win = new BrowserWindow(winOptions);

  const indexPath = path.join(__dirname, '../ui/index.html');
  const fileUrl = new URL(`file://${indexPath}`);
  if (initialUrl && initialUrl !== 'about:blank') {
    fileUrl.searchParams.set('initialUrl', initialUrl);
  }
  if (isPopup) {
    fileUrl.searchParams.set('popup', 'true');
  }

  win.webContents.setWindowOpenHandler((details) => {
    if (win.isDestroyed() || win.webContents.isDestroyed()) return { action: 'deny' };
    try {
      win.webContents.send('webview-new-window', {
        url: details.url,
        disposition: details.disposition,
        features: details.features
      });
    } catch (e) {}
    return { action: 'deny' };
  });

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // Güvenlik uyarılarını ve bilinen Electron uyarılarını filtrele
    if (message.includes('Electron Security Warning') || message.includes('allowpopups')) return;
    console.log(`[RENDERER-CONSOLE] ${message} (at ${sourceId}:${line})`);
  });

  win.loadURL(fileUrl.toString());
  // DevTools sadece development'ta aç (NODE_ENV=development veya --dev flag)
  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools();
  }

  // webview event'leri
  win.webContents.on('did-attach-webview', (_event, webContents) => {
    if (!webContents || webContents.isDestroyed()) return;

    // Webview user agent'ını Chrome olarak ayarla
    try {
      webContents.setUserAgent(CHROME_UA);
    } catch (e) {}

    // Intercept window.open in webview and forward to renderer
    webContents.setWindowOpenHandler((details) => {
      if (win.isDestroyed() || webContents.isDestroyed()) return { action: 'deny' };
      try {
        win.webContents.send('webview-new-window', {
          url: details.url,
          disposition: details.disposition,
          features: details.features
        });
      } catch (e) {}
      return { action: 'deny' };
    });

    // Google accounts/login sayfaları için Firefox user agent kullanarak güvenlik engelini aş
    webContents.on('did-start-navigation', (_e, url, _isInPlace, isMainFrame) => {
      if (webContents.isDestroyed()) return;
      if (isMainFrame) {
        try {
          const hostname = new URL(url).hostname;
          const isGoogleAccount = hostname === 'accounts.google.com' || hostname.endsWith('.accounts.google.com');
          const targetUA = isGoogleAccount ? FIREFOX_UA : CHROME_UA;
          if (webContents.getUserAgent() !== targetUA) {
            webContents.setUserAgent(targetUA);
          }
        } catch (err) {
          if (webContents.isDestroyed()) return;
          const targetUA = url.includes('accounts.google.') ? FIREFOX_UA : CHROME_UA;
          if (webContents.getUserAgent() !== targetUA) {
            webContents.setUserAgent(targetUA);
          }
        }
      }
    });

    webContents.on('context-menu', (_e, params) => {
      if (win.isDestroyed() || webContents.isDestroyed()) return;
      try {
        win.webContents.send('webview-context-menu', params);
      } catch (e) {}
    });
    webContents.on('before-input-event', (_e, input) => {
      if (win.isDestroyed() || webContents.isDestroyed()) return;
      try {
        if (input.type === 'mouseDown') {
          win.webContents.send('webview-clicked');
        }
        // Klavye kısayollarını ana pencereye ilet (webview focus'u kısayolları yutar)
        if (input.type === 'keyDown') {
          win.webContents.send('webview-keydown', {
            key: input.key,
            code: input.code,
            ctrlKey: input.control,
            shiftKey: input.shift,
            altKey: input.alt,
            metaKey: input.meta,
          });
        }
      } catch (e) {}
    });
    webContents.on('zoom-changed', (_e, direction) => {
      if (win.isDestroyed() || webContents.isDestroyed()) return;
      try {
        win.webContents.send('webview-zoom', direction);
      } catch (e) {}
    });
    // Her webview session'ı için sadece bir kez dinle
    try {
      const sess = webContents.session;
      if (sess && sess !== session.defaultSession) {
        sess.setPermissionRequestHandler(handlePermissionRequest);
        sess.setPermissionCheckHandler(handlePermissionCheck);
      }
      if (!activeDownloadSessions.has(sess)) {
        activeDownloadSessions.add(sess);
        sess.on('will-download', (_e, item) => {
          if (win.isDestroyed()) return;
          handleDownload(win, item);
        });
      }
    } catch (e) {}
  });

  // Ana pencere session'ı (webview dışı indirmeler için)
  const mainSess = win.webContents.session;
  if (!activeDownloadSessions.has(mainSess)) {
    activeDownloadSessions.add(mainSess);
    mainSess.on('will-download', (_e, item) => {
      handleDownload(win, item);
    });
  }

  openWindows.add(win);

  win.on('closed', () => {
    openWindows.delete(win);
  });
}

app.on('ready', () => {
  permissionsFilePath = path.join(app.getPath('userData'), 'permissions.json');
  loadPermissions();
  settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
  loadSettings();
  app.setAppUserModelId('com.xenixa.browser');

  // Google'ın Electron'u tespit etmek için kullandığı Client Hints başlıklarını kaldır
  // Bu başlıklar olunca Google "Bu tarayıcı güvenli olmayabilir" hatası veriyor
  const BLOCKED_HEADERS = new Set([
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
    'sec-ch-ua-arch',
    'sec-ch-ua-bitness',
    'sec-ch-ua-full-version',
    'sec-ch-ua-full-version-list',
    'sec-ch-ua-model',
    'sec-ch-ua-wow64',
    'x-requested-with',
  ]);

  const { session } = require('electron');
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    const headers = details.requestHeaders;
    for (const key of Object.keys(headers)) {
      if (BLOCKED_HEADERS.has(key.toLowerCase())) {
        delete headers[key];
      }
    }
    
    // Google Giriş sayfaları için HTTP düzeyinde Firefox UA kullanarak engeli kaldır
    let targetUA = CHROME_UA;
    try {
      const hostname = new URL(details.url).hostname;
      if (hostname === 'accounts.google.com' || hostname.endsWith('.accounts.google.com')) {
        targetUA = FIREFOX_UA;
      }
    } catch (_err) {
      if (details.url.includes('accounts.google.')) {
        targetUA = FIREFOX_UA;
      }
    }
    
    // Case-insensitive user-agent güncellemesi yap
    let uaSet = false;
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'user-agent') {
        headers[key] = targetUA;
        uaSet = true;
      }
    }
    if (!uaSet) {
      headers['User-Agent'] = targetUA;
    }
    
    callback({ requestHeaders: headers });
  });

  // ── CORS: Yanıt başlıklarına izin ver ─────────────────────────────────────
  // webSecurity:false yerine daha güvenli çözüm:
  // Gelen yanıtlara CORS başlıkları ekleyerek cross-origin içeriklerin yüklenmesine izin ver.
  session.defaultSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    const respHeaders = details.responseHeaders || {};

    // Mevcut CORS başlıklarını override et
    respHeaders['Access-Control-Allow-Origin'] = ['*'];
    respHeaders['Access-Control-Allow-Methods'] = ['GET, POST, PUT, PATCH, DELETE, OPTIONS'];
    respHeaders['Access-Control-Allow-Headers'] = ['*'];
    respHeaders['Access-Control-Allow-Credentials'] = ['true'];

    // X-Frame-Options'ı kaldır (iframe/webview içi yüklemeler için)
    delete respHeaders['x-frame-options'];
    delete respHeaders['X-Frame-Options'];

    // Content-Security-Policy'yi kaldır (sitelerin kendi CSP'si değil, Electron'unkini)
    // Sadece file:// kaynaklı (kendi UI sayfalarımız) için kaldır
    const isFileUrl = details.url && details.url.startsWith('file://');
    if (!isFileUrl) {
      // Harici sitelerin CSP'sine dokunma — kendi güvenliklerini korusun
    }

    callback({ responseHeaders: respHeaders });
  });

  session.defaultSession.setPermissionRequestHandler(handlePermissionRequest);
  session.defaultSession.setPermissionCheckHandler(handlePermissionCheck);

  // ── Tor / .onion desteği ──────────────────────────────────────────────────
  // Tor Browser veya standalone Tor çalışıyorsa .onion siteleri açılır.
  // Tor Browser: SOCKS5 127.0.0.1:9150
  // Standalone Tor: SOCKS5 127.0.0.1:9050
  // Her iki porta da bağlanmayı dene
  const net = require('net');
  function checkTorPort(port) {
    return new Promise(resolve => {
      const socket = new net.Socket();
      socket.setTimeout(500);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('error', () => resolve(false));
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.connect(port, '127.0.0.1');
    });
  }

  async function setupTorProxy() {
    const torBrowserPort = await checkTorPort(9150);
    const torPort = torBrowserPort ? 9150 : (await checkTorPort(9050) ? 9050 : null);

    if (torPort) {
      console.log(`[TOR] Tor proxy bulundu: 127.0.0.1:${torPort}`);
      // Sadece .onion istekleri için proxy kullan
      session.defaultSession.setProxy({
        proxyRules: `socks5://127.0.0.1:${torPort}`,
        proxyBypassRules: '<-loopback>,<local>'
      });
      torConnectedState = true;
    } else {
      console.log('[TOR] Tor proxy bulunamadı. .onion siteleri açılamaz.');
      torConnectedState = false;
    }
  }

  setupTorProxy();

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (openWindows.size === 0) {
    createWindow();
  }
});

ipcMain.on('window-minimize', (_event) => {
  const win = BrowserWindow.fromWebContents(_event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-maximize', (_event) => {
  const win = BrowserWindow.fromWebContents(_event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (_event) => {
  const win = BrowserWindow.fromWebContents(_event.sender);
  if (win) win.close();
});

ipcMain.on('toggle-devtools', (_event) => {
  const win = BrowserWindow.fromWebContents(_event.sender);
  if (win) win.webContents.toggleDevTools();
});

ipcMain.on('toggle-fullscreen', (_event) => {
  const win = BrowserWindow.fromWebContents(_event.sender);
  if (win) {
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    } else {
      win.setFullScreen(true);
    }
  }
});

ipcMain.on('open-new-window', (_event, { url, x, y, isPopup }) => {
  createWindow(url, x, y, isPopup);
});

ipcMain.on('permission-response', (_event, { id, allowed }) => {
  const req = permissionRequests.get(id);
  if (req) {
    const { callback, origin, key } = req;
    const state = allowed ? 'granted' : 'denied';
    setPermissionState(origin, key, state);
    callback(allowed);
    permissionRequests.delete(id);
  }
});

ipcMain.on('open-file-location', (_event, filePath) => {
  shell.showItemInFolder(filePath);
});

// ── Uygulama ikonu değiştirme ─────────────────────────────────────────────────
ipcMain.on('set-app-icon', (_event, dataUrl) => {
  try {
    const { nativeImage } = require('electron');
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    const tmpPath = path.join(app.getPath('temp'), 'xenixa_custom_icon.png');
    fs.writeFileSync(tmpPath, buffer);

    const img = nativeImage.createFromPath(tmpPath);
    if (img.isEmpty()) {
      console.error('set-app-icon: nativeImage is empty');
      return;
    }

    openWindows.forEach(win => {
      try {
        win.setIcon(img);
        // Windows'ta görev çubuğu overlay ikonu olarak da set et
        if (process.platform === 'win32' && win.setOverlayIcon) {
          win.setOverlayIcon(img, 'custom icon');
        }
        if (process.platform === 'win32') {
          const wasVisible = win.isVisible();
          const wasMinimized = win.isMinimized();
          if (wasVisible && !wasMinimized) {
            win.hide();
            setImmediate(() => {
              win.setIcon(img);
              win.show();
            });
          }
        }
      } catch (e) {
        console.error('setIcon error:', e);
      }
    });
  } catch (err) {
    console.error('set-app-icon error:', err);
  }
});

ipcMain.on('reset-app-icon', (_event) => {
  try {
    const { nativeImage } = require('electron');
    const defaultIcon = path.join(__dirname, '../ui/assets/logo.png');
    const img = nativeImage.createFromPath(defaultIcon);
    openWindows.forEach(win => {
      try {
        win.setIcon(img);
        if (process.platform === 'win32') {
          const wasVisible = win.isVisible();
          if (wasVisible && !win.isMinimized()) {
            win.hide();
            setImmediate(() => {
              win.setIcon(img);
              win.show();
            });
          }
        }
      } catch (_e) {}
    });
  } catch (err) {
    console.error('reset-app-icon error:', err);
  }
});

ipcMain.on('debug-log', (_event, msg) => {
  console.log('[DEBUG-RENDERER]', msg);
});

// ── Webview Synchronous Dialog HTTP Server ───────────────────────────────────
let dialogServerPort = 0;
const pendingDialogs = new Map();

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/dialog') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const dialogId = Date.now().toString() + Math.random().toString(36).slice(2, 7);
        pendingDialogs.set(dialogId, res);
        
        // Aktif pencereye gönder
        const activeWin = BrowserWindow.getFocusedWindow() || Array.from(openWindows)[0];
        if (activeWin) {
          activeWin.webContents.send('webview-dialog-request', {
            id: dialogId,
            type: data.type,
            message: data.message,
            defaultValue: data.defaultValue
          });
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result: null }));
          pendingDialogs.delete(dialogId);
        }
      } catch (err) {
        res.writeHead(500);
        res.end();
      }
    });
  } else if (req.method === 'POST' && req.url === '/permission-state') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { origin, permission } = data;
        const state = getPermissionState(origin, permission);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ state }));
      } catch (err) {
        res.writeHead(500);
        res.end();
      }
    });
  } else if (req.method === 'POST' && req.url === '/request-permission') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { origin, permission, mediaTypes } = data;
        const requestId = Date.now().toString() + Math.random().toString(36).slice(2, 7);
        
        permissionRequests.set(requestId, {
          callback: (allowed) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ allowed }));
          },
          origin,
          key: getPermissionKey(permission, { mediaTypes })
        });

        // Send to active window
        const activeWin = BrowserWindow.getFocusedWindow() || Array.from(openWindows)[0];
        if (activeWin) {
          activeWin.webContents.send('permission-request', {
            id: requestId,
            url: origin,
            permission: permission,
            mediaTypes: mediaTypes || [],
            webContentsId: activeWin.webContents.id
          });
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ allowed: false }));
          permissionRequests.delete(requestId);
        }
      } catch (err) {
        res.writeHead(500);
        res.end();
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(0, '127.0.0.1', () => {
  dialogServerPort = server.address().port;
  console.log(`[DIALOG-SERVER] Listening on port ${dialogServerPort}`);
});

ipcMain.on('get-dialog-port', (event) => {
  event.returnValue = dialogServerPort;
});

ipcMain.on('webview-dialog-response', (event, { id, result }) => {
  const res = pendingDialogs.get(id);
  if (res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result }));
    pendingDialogs.delete(id);
  }
});

// ── WARP (Cloudflare) IPC ─────────────────────────────────────────────────────

function getWarpCli() {
  if (settingsRegistry.customWarpPath && fs.existsSync(settingsRegistry.customWarpPath)) {
    return `"${settingsRegistry.customWarpPath}"`;
  }
  for (const p of WARP_PATHS) {
    if (fs.existsSync(p)) return `"${p}"`;
  }
  return '"C:\\Program Files\\Cloudflare\\Cloudflare WARP\\warp-cli.exe"';
}

function runWarp(args) {
  return new Promise((resolve) => {
    const cli = getWarpCli();
    exec(`${cli} ${args}`, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, output: stderr || err.message });
      } else {
        resolve({ ok: true, output: stdout.trim() });
      }
    });
  });
}

ipcMain.handle('warp-status', async () => {
  const result = await runWarp('status');
  if (!result.ok) return { installed: false, connected: false, status: 'not_installed' };
  const out = result.output.toLowerCase();
  // "Status update: Connected" veya "Connected" içeriyorsa bağlı
  const connected = out.includes('connected') && !out.includes('disconnected');
  return { installed: true, connected, status: result.output };
});

ipcMain.handle('warp-connect', async () => {
  return await runWarp('connect');
});

ipcMain.handle('warp-disconnect', async () => {
  return await runWarp('disconnect');
});

// ── Araç Dosya Konumu Doğrulama ───────────────────────────────────────────────
// WARP ve Tor için bilinen kurulum yollarını kontrol eder
const WARP_PATHS = [
  'C:\\Program Files\\Cloudflare\\Cloudflare WARP\\warp-cli.exe',
  'C:\\Program Files (x86)\\Cloudflare\\Cloudflare WARP\\warp-cli.exe',
];

const TOR_PATHS = [
  'C:\\Users\\' + os.userInfo().username + '\\Desktop\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe',
  'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe',
  'C:\\Program Files\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe',
  'C:\\Program Files (x86)\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe',
  'C:\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe',
];

ipcMain.handle('check-tool-paths', async () => {
  // WARP kontrolü
  let warpFound = null;
  if (settingsRegistry.customWarpPath && fs.existsSync(settingsRegistry.customWarpPath)) {
    warpFound = settingsRegistry.customWarpPath;
  } else {
    for (const p of WARP_PATHS) {
      if (fs.existsSync(p)) { warpFound = p; break; }
    }
  }

  // Tor kontrolü — bilinen yollar + PATH üzerinden
  let torFound = null;
  if (settingsRegistry.customTorPath && fs.existsSync(settingsRegistry.customTorPath)) {
    torFound = settingsRegistry.customTorPath;
  } else {
    for (const p of TOR_PATHS) {
      if (fs.existsSync(p)) { torFound = p; break; }
    }
  }

  // PATH üzerinden tor.exe ara
  if (!torFound) {
    torFound = await new Promise(resolve => {
      exec('where tor.exe', { timeout: 3000 }, (err, stdout) => {
        if (!err && stdout.trim()) resolve(stdout.trim().split('\n')[0].trim());
        else resolve(null);
      });
    });
  }

  // Tor port kontrolü (çalışıyor mu?)
  const net = require('net');
  function checkPort(port) {
    return new Promise(resolve => {
      const s = new net.Socket();
      s.setTimeout(400);
      s.on('connect', () => { s.destroy(); resolve(true); });
      s.on('error', () => resolve(false));
      s.on('timeout', () => { s.destroy(); resolve(false); });
      s.connect(port, '127.0.0.1');
    });
  }
  const torPort9150 = await checkPort(9150);
  const torPort9050 = await checkPort(9050);
  const torRunning = torPort9150 || torPort9050;
  const torActivePort = torPort9150 ? 9150 : (torPort9050 ? 9050 : null);

  return {
    warp: {
      found: !!warpFound,
      path: warpFound || null,
      customPath: settingsRegistry.customWarpPath || '',
      checkedPaths: WARP_PATHS,
    },
    tor: {
      found: !!torFound,
      path: torFound || null,
      customPath: settingsRegistry.customTorPath || '',
      running: torRunning,
      activePort: torActivePort,
      checkedPaths: TOR_PATHS,
    },
  };
});

// Gözat butonu için dialog çağrısı
ipcMain.handle('browse-tool-path', async (event, { type }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: type === 'warp' ? 'Cloudflare warp-cli.exe Seçin' : 'tor.exe Seçin',
    filters: [
      { name: 'Executables', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const chosenPath = result.filePaths[0];
  if (fs.existsSync(chosenPath)) {
    return chosenPath;
  }
  return null;
});

// Ayarları kaydet
ipcMain.handle('save-tool-paths', async (event, { warpPath, torPath }) => {
  if (warpPath !== undefined) settingsRegistry.customWarpPath = warpPath;
  if (torPath !== undefined) settingsRegistry.customTorPath = torPath;
  saveSettings();

  // Tor custom path değiştiyse proxy ayarlarını kontrol et
  if (torPath !== undefined) {
    const net = require('net');
    function checkTorPort(port) {
      return new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(500);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('error', () => resolve(false));
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.connect(port, '127.0.0.1');
      });
    }
    const torBrowserPort = await checkTorPort(9150);
    const torPort = torBrowserPort ? 9150 : (await checkTorPort(9050) ? 9050 : null);
    if (torPort) {
      session.defaultSession.setProxy({
        proxyRules: `socks5://127.0.0.1:${torPort}`,
        proxyBypassRules: '<-loopback>,<local>'
      });
    }
  }

  return { success: true };
});

// ── Tor (Ağı) IPC Handlers ──────────────────────────────────────────────────

async function findTorExecutable() {
  if (settingsRegistry.customTorPath && fs.existsSync(settingsRegistry.customTorPath)) {
    return settingsRegistry.customTorPath;
  }
  for (const p of TOR_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  // PATH üzerinden ara
  return new Promise(resolve => {
    exec('where tor.exe', { timeout: 3000 }, (err, stdout) => {
      if (!err && stdout.trim()) resolve(stdout.trim().split('\n')[0].trim());
      else resolve(null);
    });
  });
}

function checkPort(port) {
  return new Promise(resolve => {
    const net = require('net');
    const s = new net.Socket();
    s.setTimeout(400);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.connect(port, '127.0.0.1');
  });
}

function waitForPort(port, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const interval = setInterval(async () => {
      const isOpen = await checkPort(port);
      if (isOpen) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 500);
  });
}

ipcMain.handle('tor-status', async () => {
  const torPort9150 = await checkPort(9150);
  const torPort9050 = await checkPort(9050);
  const torRunning = torPort9150 || torPort9050;
  
  const exePath = await findTorExecutable();
  
  return {
    installed: !!exePath,
    connected: torConnectedState,
    connecting: torConnectingState,
    running: torRunning,
    port: torPort9150 ? 9150 : (torPort9050 ? 9050 : null)
  };
});

ipcMain.handle('tor-connect', async () => {
  if (torConnectedState) return { ok: true };
  
  torConnectingState = true;
  
  // 1. Portları kontrol et, halihazırda çalışıyorsa direkt bağlan
  const torPort9150 = await checkPort(9150);
  const torPort9050 = await checkPort(9050);
  
  let activePort = torPort9150 ? 9150 : (torPort9050 ? 9050 : null);
  
  if (activePort) {
    await session.defaultSession.setProxy({
      proxyRules: `socks5://127.0.0.1:${activePort}`,
      proxyBypassRules: '<-loopback>,<local>'
    });
    torConnectedState = true;
    torConnectingState = false;
    return { ok: true, port: activePort };
  }
  
  // 2. Çalışmıyorsa exe bulup başlat
  const torExe = await findTorExecutable();
  if (!torExe) {
    torConnectingState = false;
    return { ok: false, error: 'Tor çalıştırılabilir dosyası bulunamadı. Ayarlardan dosya konumunu doğrulayın.' };
  }
  
  const { spawn } = require('child_process');
  const tempTorDataDir = path.join(app.getPath('userData'), 'tor_data');
  if (!fs.existsSync(tempTorDataDir)) {
    fs.mkdirSync(tempTorDataDir, { recursive: true });
  }
  
  try {
    torProcess = spawn(torExe, ['--DataDirectory', tempTorDataDir, '--SocksPort', '9050'], {
      detached: true,
      stdio: 'ignore'
    });
    torProcess.unref();
    
    torProcess.on('exit', (code) => {
      console.log(`[TOR] Tor process exited with code ${code}`);
      torProcess = null;
      if (torConnectedState) {
        session.defaultSession.setProxy({});
        torConnectedState = false;
      }
    });
  } catch (err) {
    torConnectingState = false;
    return { ok: false, error: 'Tor başlatılamadı: ' + err.message };
  }
  
  // 9050 portunun açılmasını bekle
  const portOpened = await waitForPort(9050, 15000);
  if (portOpened) {
    await session.defaultSession.setProxy({
      proxyRules: 'socks5://127.0.0.1:9050',
      proxyBypassRules: '<-loopback>,<local>'
    });
    torConnectedState = true;
    torConnectingState = false;
    return { ok: true, port: 9050 };
  } else {
    try {
      if (torProcess) torProcess.kill();
    } catch (e) {}
    torProcess = null;
    torConnectingState = false;
    return { ok: false, error: 'Tor bağlantısı zaman aşımına uğradı (9050 portu açılmadı).' };
  }
});

ipcMain.handle('tor-disconnect', async () => {
  torConnectedState = false;
  torConnectingState = false;
  
  await session.defaultSession.setProxy({});
  
  if (torProcess) {
    try {
      torProcess.kill();
    } catch (e) {}
    torProcess = null;
  }
  
  return { ok: true };
});

app.on('will-quit', () => {
  if (torProcess) {
    try {
      torProcess.kill();
    } catch (e) {}
  }
});

// ─────────────────────────────────────────────────────────────────────────────
