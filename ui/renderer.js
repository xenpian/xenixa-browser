const { ipcRenderer } = require('electron');
const path = require('path');

const HOME_TITLE = 'xenixa';

// Dinamik uygulama adı — applyBrandSettings tarafından güncellenir
function getAppName() {
    return localStorage.getItem('xenixa_app_name') || HOME_TITLE;
}

let tabs = [];
let activeTabId = null;
let welcomeSearchRevealed = false;
let activeWebview = null; // Pointer to the active tab's webview element
let activeSystemDialog = null;

// Kalıcılık verileri
let searchHistory = [];
let visitedTabs = [];
let siteVisitCounts = {}; // { "https://youtube.com": 12, ... } — ziyaret sayacı

const tabsContainer = document.getElementById('tabsContainer');
const newTabBtn = document.getElementById('newTabBtn');
const urlBar = document.getElementById('urlBar');
const goBtn = document.getElementById('goBtn');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const refreshBtn = document.getElementById('refreshBtn');
const homeBtn = document.getElementById('homeBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const welcomeSearchInput = document.getElementById('welcomeSearchInput');
const tabsScroll = document.getElementById('tabsScroll');
const suggestionsBox = document.getElementById('suggestionsBox');
const menuBtn = document.getElementById('menuBtn');
const menuDropdown = document.getElementById('menuDropdown');
const menuBackdrop = document.getElementById('menuBackdrop');
const securityIcon = document.getElementById('securityIcon');
const progressBar = document.getElementById('progressBar');
const bookmarkToggleBtn = document.getElementById('bookmarkToggleBtn');
const bookmarkIcon = document.getElementById('bookmarkIcon');
const quickBookmarks = document.getElementById('quickBookmarks');

// WARP
const warpBtn = document.getElementById('warpBtn');
const warpTooltip = document.getElementById('warpTooltip');
const warpStatusDot = document.getElementById('warpStatusDot');
const warpTooltipStatus = document.getElementById('warpTooltipStatus');
const warpToggleBtn = document.getElementById('warpToggleBtn');

// Tor
const torBtn = document.getElementById('torBtn');
const torTooltip = document.getElementById('torTooltip');
const torStatusDot = document.getElementById('torStatusDot');
const torTooltipStatus = document.getElementById('torTooltipStatus');
const torToggleBtn = document.getElementById('torToggleBtn');

const contextMenu = document.getElementById('contextMenu');
const contextMenuBackdrop = document.getElementById('contextMenuBackdrop');
const tabContextMenu = document.getElementById('tabContextMenu');
const downloadsBtn = document.getElementById('downloadsBtn');
const downloadsPanel = document.getElementById('downloadsPanel');
const downloadsBadge = document.getElementById('downloadsBadge');
const downloadsBackdrop = document.getElementById('downloadsBackdrop');

// Find Bar
const findBar = document.getElementById('findBar');
const findInput = document.getElementById('findInput');
const findCount = document.getElementById('findCount');
const findPrevBtn = document.getElementById('findPrev');
const findNextBtn = document.getElementById('findNext');
const findCloseBtn = document.getElementById('findClose');

// ── Özel Sayfalar (xenixa://) — dosyanın başında tanımla ─────────────────────
const SPECIAL_PAGES = {
    'xenixa://history':         'pages/history.html',
    'xenixa://downloads':       'pages/downloads.html',
    'xenixa://settings':        'pages/settings.html',
    'xenixa://bookmarks':       'pages/bookmarks.html',
    'xenixa://permission-test': 'pages/permission-test.html',
};

const SPECIAL_PAGE_TITLES = {
    'xenixa://history':         'Geçmiş',
    'xenixa://downloads':       'İndirilenler',
    'xenixa://settings':        'Ayarlar',
    'xenixa://bookmarks':       'Yer İşaretleri',
    'xenixa://permission-test': 'İzin Testi',
};

function isSpecialPage(url) {
    return url && url.startsWith('xenixa://');
}

function getSpecialPagePath(url) {
    const rel = SPECIAL_PAGES[url];
    if (!rel) return null;
    const base = window.location.href.replace(/\/[^/]+$/, '/');
    // Veriyi URL'ye encode ederek geç — executeJavaScript'e gerek kalmaz
    let dataParam = '';
    if (url === 'xenixa://history') {
        const data = { visitedTabs, siteVisitCounts, searchHistory };
        dataParam = '?data=' + encodeURIComponent(JSON.stringify(data));
    } else if (url === 'xenixa://downloads') {
        let dlHistory = [];
        try { dlHistory = JSON.parse(localStorage.getItem('xenixa_downloads_history') || '[]'); } catch(_e) {}
        dataParam = '?data=' + encodeURIComponent(JSON.stringify(dlHistory));
    } else if (url === 'xenixa://settings') {
        const data = { searchEngine: localStorage.getItem('xenixa_search_engine') || 'google' };
        dataParam = '?data=' + encodeURIComponent(JSON.stringify(data));
    } else if (url === 'xenixa://bookmarks') {
        loadBookmarks();
        const data = { bookmarks };
        dataParam = '?data=' + encodeURIComponent(JSON.stringify(data));
    }
    return base + rel + dataParam;
}

// ─────────────────────────────────────────────────────────────────────────────

// ─── Arama Motoru ─────────────────────────────────────────────────────────────
const SEARCH_ENGINES = {
    google:     { name: 'Google',       url: 'https://www.google.com/search?q=',         favicon: 'https://www.google.com/favicon.ico' },
    duckduckgo: { name: 'DuckDuckGo',   url: 'https://duckduckgo.com/?q=',               favicon: 'https://duckduckgo.com/favicon.ico' },
    bing:       { name: 'Bing',         url: 'https://www.bing.com/search?q=',            favicon: 'https://www.bing.com/favicon.ico' },
    brave:      { name: 'Brave Search', url: 'https://search.brave.com/search?q=',        favicon: 'https://www.google.com/s2/favicons?domain=search.brave.com&sz=32' },
    ecosia:     { name: 'Ecosia',       url: 'https://www.ecosia.org/search?q=',          favicon: 'https://www.google.com/s2/favicons?domain=ecosia.org&sz=32' },
    startpage:  { name: 'Startpage',    url: 'https://www.startpage.com/search?q=',       favicon: 'https://www.google.com/s2/favicons?domain=startpage.com&sz=32' },
    yahoo:      { name: 'Yahoo',        url: 'https://search.yahoo.com/search?p=',        favicon: 'https://www.yahoo.com/favicon.ico' },
    yandex:     { name: 'Yandex',       url: 'https://yandex.com/search/?text=',          favicon: 'https://yandex.com/favicon.ico' },
    perplexity: { name: 'Perplexity AI',url: 'https://www.perplexity.ai/search?q=',       favicon: 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32' },
};

let currentEngine = localStorage.getItem('xenixa_search_engine') || 'google';

function getSearchUrl(query) {
    const engine = SEARCH_ENGINES[currentEngine] || SEARCH_ENGINES.google;
    return engine.url + encodeURIComponent(query);
}

function setSearchEngine(engineKey) {
    currentEngine = engineKey;
    localStorage.setItem('xenixa_search_engine', engineKey);
    updateSearchEngineUI();
}

function updateSearchEngineUI() {
    const engine = SEARCH_ENGINES[currentEngine] || SEARCH_ENGINES.google;
    const icon = document.getElementById('searchEngineIcon');
    if (icon) {
        icon.src = engine.favicon;
        icon.alt = engine.name;
    }
    // Active class güncelle
    document.querySelectorAll('.search-engine-item').forEach(el => {
        el.classList.toggle('active', el.dataset.engine === currentEngine);
    });
}

function toggleSearchEngineDropdown() {
    const dd = document.getElementById('searchEngineDropdown');
    if (!dd) return;
    dd.classList.toggle('visible');
}

function hideSearchEngineDropdown() {
    const dd = document.getElementById('searchEngineDropdown');
    if (dd) dd.classList.remove('visible');
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Autocomplete (inline ghost text) ───────────────────────────────────────
let autocompleteValue = ''; // Tamamlanmış öneri (ghost — display text)
let autocompleteRealUrl = ''; // Gerçek navigate edilecek URL
let typedBeforeAutocomplete = ''; // Kullanıcının gerçekten yazdığı kısım
let suppressAutocomplete = false; // Delete/Backspace sonrası autocomplete'i bir kez bastır

// Popüler siteler — geçmişte eşleşme yoksa fallback
const POPULAR_SITES = [
    'youtube.com', 'google.com', 'facebook.com', 'twitter.com', 'x.com',
    'instagram.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'netflix.com',
    'twitch.tv', 'github.com', 'stackoverflow.com', 'linkedin.com', 'tiktok.com',
    'discord.com', 'spotify.com', 'whatsapp.com', 'telegram.org', 'gmail.com',
    'drive.google.com', 'docs.google.com', 'maps.google.com', 'translate.google.com',
    'outlook.com', 'microsoft.com', 'apple.com', 'yahoo.com', 'bing.com',
    'ebay.com', 'paypal.com', 'dropbox.com', 'notion.so', 'figma.com',
    'canva.com', 'medium.com', 'quora.com', 'pinterest.com', 'tumblr.com',
    'twitch.tv', 'kick.com', 'dailymotion.com', 'vimeo.com', 'soundcloud.com',
];

function getTopAutocomplete(query) {
    if (!query) return '';
    const q = query.toLowerCase().replace(/^https?:\/\/(www\.)?/, '');

    // 1. siteVisitCounts'tan eşleşen URL'leri bul, ziyaret sayısına göre sırala
    const countMatches = Object.entries(siteVisitCounts)
        .filter(([url]) => {
            const clean = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '');
            return clean.startsWith(q) || url.toLowerCase().startsWith(query.toLowerCase());
        })
        .sort((a, b) => b[1] - a[1]);

    if (countMatches.length > 0) return countMatches[0][0];

    // 2. visitedTabs'tan URL eşleşmesi
    const visitedMatchUrl = visitedTabs.find(t => {
        const clean = t.url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '');
        return clean.startsWith(q) || t.url.toLowerCase().startsWith(query.toLowerCase());
    });
    if (visitedMatchUrl) return visitedMatchUrl.url;

    // 3. searchHistory
    const historyMatch = searchHistory.find(h => h.toLowerCase().startsWith(query.toLowerCase()));
    if (historyMatch) return historyMatch;

    // 4. Popüler siteler fallback
    const popularMatch = POPULAR_SITES.find(site => site.startsWith(q));
    if (popularMatch) return 'https://www.' + popularMatch;

    return '';
}

function applyAutocomplete() {
    // Suppress flag aktifse bu seferlik atla, flag'i sıfırla
    if (suppressAutocomplete) {
        suppressAutocomplete = false;
        autocompleteValue = '';
        autocompleteRealUrl = '';
        typedBeforeAutocomplete = urlBar.value;
        return;
    }

    const fullValue = urlBar.value;
    // Eğer zaten autocomplete uygulanmışsa, typed kısmı selectionStart'a kadar
    const typed = autocompleteValue
        ? fullValue.substring(0, urlBar.selectionStart || fullValue.length)
        : fullValue;

    typedBeforeAutocomplete = typed;

    if (!typed) {
        autocompleteValue = '';
        autocompleteRealUrl = '';
        return;
    }

    const suggestion = getTopAutocomplete(typed);
    if (suggestion) {
        // Öneri typed ile başlıyorsa inline göster
        const suggestionClean = suggestion.replace(/^https?:\/\/(www\.)?/, '');
        const typedClean = typed.replace(/^https?:\/\/(www\.)?/, '');
        const displaySuggestion = suggestionClean.toLowerCase().startsWith(typedClean.toLowerCase())
            ? typed + suggestionClean.slice(typedClean.length)
            : suggestion;

        if (displaySuggestion.toLowerCase() !== typed.toLowerCase()) {
            autocompleteValue = displaySuggestion;
            autocompleteRealUrl = suggestion;
            requestAnimationFrame(() => {
                if (typedBeforeAutocomplete === typed) {
                    urlBar.value = displaySuggestion;
                    urlBar.setSelectionRange(typed.length, displaySuggestion.length);
                }
            });
            return;
        }
    }
    autocompleteValue = '';
    autocompleteRealUrl = '';
}
// ─────────────────────────────────────────────────────────────────────────────

function buildContextMenuItems(params) {
    const items = [];

    const hasLink = params.linkURL && params.linkURL.length > 0;
    const hasImage = params.mediaType === 'image';
    const hasText = params.selectionText && params.selectionText.trim().length > 0;
    const isEditable = params.isEditable;

    // Bağlantı seçenekleri
    if (hasLink) {
        items.push({ icon: 'fa-solid fa-arrow-up-right-from-square', label: 'Bağlantıyı yeni sekmede aç', action: () => createNewTab(params.linkURL) });
        items.push({ icon: 'fa-solid fa-window-restore', label: 'Bağlantıyı yeni pencerede aç', action: () => ipcRenderer.send('open-new-window', { url: params.linkURL }) });
        items.push({ separator: true });
        items.push({ icon: 'fa-solid fa-download', label: 'Bağlantıyı farklı kaydet...', action: () => activeWebview && activeWebview.downloadURL(params.linkURL) });
        items.push({ icon: 'fa-solid fa-link', label: 'Bağlantı adresini kopyala', action: () => navigator.clipboard.writeText(params.linkURL) });
        items.push({ separator: true });
    }

    // Resim seçenekleri
    if (hasImage) {
        items.push({ icon: 'fa-solid fa-image', label: 'Resmi yeni sekmede aç', action: () => createNewTab(params.srcURL) });
        items.push({ icon: 'fa-solid fa-download', label: 'Resmi farklı kaydet...', action: () => activeWebview && activeWebview.downloadURL(params.srcURL) });
        items.push({ icon: 'fa-solid fa-copy', label: 'Resmi kopyala', action: () => activeWebview && activeWebview.copyImageAt(params.x, params.y) });
        items.push({ icon: 'fa-solid fa-link', label: 'Resim adresini kopyala', action: () => navigator.clipboard.writeText(params.srcURL) });
        items.push({ icon: 'fa-solid fa-magnifying-glass', label: 'Resmi Google ile ara', action: () => createNewTab(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(params.srcURL)}`) });
        items.push({ separator: true });
    }

    // Metin seçimi seçenekleri
    if (hasText) {
        items.push({ icon: 'fa-solid fa-copy', label: 'Kopyala', action: () => activeWebview && activeWebview.copy() });
        items.push({ icon: 'fa-solid fa-magnifying-glass', label: `"${params.selectionText.slice(0, 20)}${params.selectionText.length > 20 ? '...' : ''}" için Google'da ara`, action: () => createNewTab(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`) });
        items.push({ separator: true });
    }

    // Düzenlenebilir alan seçenekleri
    if (isEditable) {
        if (!hasText) {
            items.push({ icon: 'fa-solid fa-clipboard', label: 'Yapıştır', action: () => activeWebview && activeWebview.paste() });
        } else {
            items.push({ icon: 'fa-solid fa-scissors', label: 'Kes', action: () => activeWebview && activeWebview.cut() });
            items.push({ icon: 'fa-solid fa-copy', label: 'Kopyala', action: () => activeWebview && activeWebview.copy() });
            items.push({ icon: 'fa-solid fa-clipboard', label: 'Yapıştır', action: () => activeWebview && activeWebview.paste() });
        }
        items.push({ separator: true });
    }

    // Genel seçenekler (her zaman göster)
    if (!hasLink && !hasImage && !hasText && !isEditable) {
        items.push({ icon: 'fa-solid fa-arrow-left', label: 'Geri', action: () => activeWebview && activeWebview.goBack(), disabled: activeWebview && !activeWebview.canGoBack() });
        items.push({ icon: 'fa-solid fa-arrow-right', label: 'İleri', action: () => activeWebview && activeWebview.goForward(), disabled: activeWebview && !activeWebview.canGoForward() });
        items.push({ icon: 'fa-solid fa-rotate-right', label: 'Yenile', action: () => activeWebview && activeWebview.reload() });
        items.push({ separator: true });
        items.push({ icon: 'fa-solid fa-floppy-disk', label: 'Sayfayı farklı kaydet...', action: () => activeWebview && activeWebview.getWebContentsId && ipcRenderer.send('save-page', activeWebview.getWebContentsId()) });
        items.push({ icon: 'fa-solid fa-print', label: 'Yazdır...', action: () => activeWebview && activeWebview.print() });
        items.push({ separator: true });
    }

    // Sayfa kaynağı / geliştirici araçları
    items.push({ icon: 'fa-solid fa-code', label: 'İncele', action: () => activeWebview && activeWebview.openDevTools() });

    return items;
}

function showContextMenu(x, y, params) {
    if (!contextMenu) return;

    const items = buildContextMenuItems(params);
    contextMenu.innerHTML = '';

    items.forEach(item => {
        if (item.separator) {
            const sep = document.createElement('div');
            sep.className = 'context-menu-separator';
            contextMenu.appendChild(sep);
            return;
        }

        const el = document.createElement('div');
        el.className = 'context-menu-item' + (item.disabled ? ' disabled' : '');
        el.innerHTML = `<i class="${item.icon}"></i><span>${item.label}</span>`;
        el.addEventListener('click', () => {
            hideContextMenu();
            item.action();
        });
        contextMenu.appendChild(el);
    });

    // Önce görünür yap, sonra boyutları ölç
    contextMenu.style.left = '0px';
    contextMenu.style.top = '0px';
    contextMenu.classList.add('visible');
    if (contextMenuBackdrop) contextMenuBackdrop.classList.add('visible');

    const menuW = contextMenu.offsetWidth;
    const menuH = contextMenu.offsetHeight;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const finalX = x + menuW > winW ? winW - menuW - 4 : x;
    const finalY = y + menuH > winH ? winH - menuH - 4 : y;

    contextMenu.style.left = `${finalX}px`;
    contextMenu.style.top = `${finalY}px`;
}

function hideContextMenu() {
    if (contextMenu) contextMenu.classList.remove('visible');
    if (contextMenuBackdrop) contextMenuBackdrop.classList.remove('visible');
}

// ── Tab Sağ Tıklama Menüsü ────────────────────────────────────────────────────
let lastClosedTab = null; // Kapatılan sekmeyi yeniden aç için

function showTabContextMenu(x, y, tabId) {
    if (!tabContextMenu) return;
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const hasRight = tabIndex < tabs.length - 1;
    const hasDuplicates = tabs.filter(t => t.url === tab.url).length > 1;
    const isAudible = tab.audible;
    const isMuted = tab.muted;

    const items = [
        // Grup 1
        { label: 'Sağa yeni sekme', action: () => { const i = tabs.findIndex(t => t.id === tabId); createNewTabAt(i + 1); } },
        { label: 'Sekmeyi yeni pencereye taşı', action: () => popOutTab(tabId, x, y), disabled: tabs.length <= 1 },
        { separator: true },
        // Grup 2
        { label: 'Yeniden Yükle', shortcut: 'Ctrl+R', action: () => { if (tab.webview) tab.webview.reload(); } },
        { label: 'Sekmeyi Kopyala', action: () => createNewTab(tab.url) },
        { label: isAudible && !isMuted ? 'Sekmenin sesini kapat' : 'Sekmenin sesini aç', action: () => toggleTabMute(tabId) },
        { separator: true },
        // Grup 3
        { label: 'Kapat', shortcut: 'Ctrl+W', action: () => closeTab(tabId) },
        { label: 'Diğer sekmeleri kapat', action: () => closeOtherTabs(tabId), disabled: tabs.length <= 1 },
        { label: 'Sağdaki sekmeleri kapat', action: () => closeTabsToRight(tabId), disabled: !hasRight },
        { separator: true },
        // Grup 4
        { label: 'Kapatılan sekmeyi yeniden aç', action: () => reopenLastClosedTab(), disabled: !lastClosedTab },
    ];

    tabContextMenu.innerHTML = '';

    items.forEach(item => {
        if (item.separator) {
            const sep = document.createElement('div');
            sep.className = 'tab-context-separator';
            tabContextMenu.appendChild(sep);
            return;
        }
        const el = document.createElement('div');
        el.className = 'tab-context-item' + (item.disabled ? ' disabled' : '');
        el.innerHTML = `
            <span class="tab-context-item-label">${item.label}</span>
            ${item.shortcut ? `<span class="tab-context-item-shortcut">${item.shortcut}</span>` : ''}
        `;
        if (!item.disabled) {
            el.addEventListener('click', () => {
                hideTabContextMenu();
                item.action();
            });
        }
        tabContextMenu.appendChild(el);
    });

    // Pozisyon hesapla
    tabContextMenu.style.left = '0px';
    tabContextMenu.style.top = '0px';
    tabContextMenu.classList.add('visible');

    const menuW = tabContextMenu.offsetWidth;
    const menuH = tabContextMenu.offsetHeight;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    tabContextMenu.style.left = `${Math.min(x, winW - menuW - 4)}px`;
    tabContextMenu.style.top = `${Math.min(y, winH - menuH - 4)}px`;
}

function hideTabContextMenu() {
    if (tabContextMenu) tabContextMenu.classList.remove('visible');
}

function createNewTabAt(index) {
    createNewTab('about:blank');
    // Yeni sekmeyi doğru konuma taşı
    const newTab = tabs[tabs.length - 1];
    tabs.splice(tabs.length - 1, 1);
    tabs.splice(Math.min(index, tabs.length), 0, newTab);
    renderTabs();
}

function toggleTabMute(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !tab.webview) return;
    tab.muted = !tab.muted;
    try { tab.webview.setAudioMuted(tab.muted); } catch(_e) {}
    renderTabs();
}

function closeOtherTabs(keepTabId) {
    const toClose = tabs.filter(t => t.id !== keepTabId);
    toClose.forEach(t => {
        cleanupTabState(t);
        if (t.webview) t.webview.remove();
    });
    tabs = tabs.filter(t => t.id === keepTabId);
    switchTab(keepTabId);
    saveOpenTabsState();
}

function closeTabsToRight(tabId) {
    const idx = tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;
    const toClose = tabs.slice(idx + 1);
    toClose.forEach(t => {
        cleanupTabState(t);
        if (t.webview) t.webview.remove();
    });
    tabs = tabs.slice(0, idx + 1);
    if (!tabs.find(t => t.id === activeTabId)) {
        switchTab(tabs[tabs.length - 1].id);
    }
    saveOpenTabsState();
    renderTabs();
}

function reopenLastClosedTab() {
    if (!lastClosedTab) return;
    createNewTab(lastClosedTab.url);
    lastClosedTab = null;
}
// ─────────────────────────────────────────────────────────────────────────────

// ── İndirme Yönetimi ─────────────────────────────────────────────────────────
let downloads = []; // { id, filename, totalBytes, receivedBytes, speed, state, savePath, isPaused }

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatSpeed(bps) {
    if (!bps) return '';
    return formatBytes(bps) + '/s';
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
        pdf: 'fa-solid fa-file-pdf', zip: 'fa-solid fa-file-zipper', rar: 'fa-solid fa-file-zipper',
        mp4: 'fa-solid fa-film', mkv: 'fa-solid fa-film', avi: 'fa-solid fa-film',
        mp3: 'fa-solid fa-music', wav: 'fa-solid fa-music',
        jpg: 'fa-solid fa-image', jpeg: 'fa-solid fa-image', png: 'fa-solid fa-image', gif: 'fa-solid fa-image',
        exe: 'fa-solid fa-terminal', msi: 'fa-solid fa-terminal',
        doc: 'fa-solid fa-file-word', docx: 'fa-solid fa-file-word',
        xls: 'fa-solid fa-file-excel', xlsx: 'fa-solid fa-file-excel',
    };
    return map[ext] || 'fa-solid fa-file';
}

function toggleDownloadsPanel() {
    if (!downloadsPanel) return;
    if (downloadsPanel.classList.contains('visible')) {
        hideDownloadsPanel();
    } else {
        renderDownloadsPanel();
        downloadsPanel.classList.add('visible');
        if (downloadsBackdrop) downloadsBackdrop.classList.add('visible');
    }
}

function hideDownloadsPanel() {
    if (downloadsPanel) downloadsPanel.classList.remove('visible');
    if (downloadsBackdrop) downloadsBackdrop.classList.remove('visible');
}

function renderDownloadsPanel() {
    if (!downloadsPanel) return;
    downloadsPanel.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'downloads-panel-header';
    header.innerHTML = `<span class="downloads-panel-title">İndirilenler</span>`;

    if (downloads.length > 0) {
        const clearBtn = document.createElement('button');
        clearBtn.className = 'downloads-clear-btn';
        clearBtn.textContent = 'Temizle';
        clearBtn.addEventListener('click', () => {
            downloads = downloads.filter(d => d.state === 'progressing');
            renderDownloadsPanel();
            updateDownloadsBadge();
        });
        header.appendChild(clearBtn);
    }
    downloadsPanel.appendChild(header);

    if (downloads.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'downloads-empty';
        empty.innerHTML = '<i class="fa-solid fa-download" style="font-size:24px;display:block;margin-bottom:8px;color:#5f6368"></i>Henüz indirme yok';
        downloadsPanel.appendChild(empty);
        return;
    }

    downloads.forEach((dl, idx) => {
        if (idx > 0) {
            const sep = document.createElement('div');
            sep.className = 'download-item-separator';
            downloadsPanel.appendChild(sep);
        }

        const item = document.createElement('div');
        item.className = 'download-item';
        item.id = `dl-item-${dl.id}`;

        const pct = dl.totalBytes > 0 ? Math.round((dl.receivedBytes / dl.totalBytes) * 100) : 0;
        const isActive = dl.state === 'progressing';
        const isDone = dl.state === 'completed';

        // Dosya ikonu — gerçek Windows ikonu varsa onu kullan, yoksa fallback
        const fileIconHtml = dl.fileIcon
            ? `<img src="${dl.fileIcon}" class="download-file-icon" alt="">`
            : `<img src="" class="download-file-icon download-file-icon-fallback" alt="" data-ext="${escapeHtml(dl.filename.split('.').pop().toLowerCase())}">`;

        let metaText = '';
        if (isActive) {
            metaText = dl.totalBytes > 0
                ? `${formatBytes(dl.receivedBytes)} / ${formatBytes(dl.totalBytes)} · ${formatSpeed(dl.speed)}`
                : `${formatBytes(dl.receivedBytes)} · ${formatSpeed(dl.speed)}`;
            if (dl.isPaused) metaText = 'Duraklatıldı · ' + formatBytes(dl.receivedBytes);
        } else if (isDone) {
            metaText = `${formatBytes(dl.totalBytes)} · Tamamlandı`;
        } else {
            metaText = 'İptal edildi';
        }

        let actionsHtml = '';
        if (isActive) {
            if (dl.isPaused) {
                actionsHtml += `<button class="download-action-btn" title="Devam et" onclick="resumeDownload('${dl.id}')"><i class="fa-solid fa-play"></i></button>`;
            } else {
                actionsHtml += `<button class="download-action-btn" title="Duraklat" onclick="pauseDownload('${dl.id}')"><i class="fa-solid fa-pause"></i></button>`;
            }
            actionsHtml += `<button class="download-action-btn" title="İptal et" onclick="cancelDownload('${dl.id}')"><i class="fa-solid fa-xmark"></i></button>`;
        } else if (isDone) {
            actionsHtml += `<button class="download-action-btn" title="Klasörde göster" onclick="showInFolder('${dl.savePath.replace(/\\/g, '\\\\')}')"><i class="fa-solid fa-folder-open"></i></button>`;
        }

        item.innerHTML = `
            <div class="download-item-top">
                <div class="download-file-icon-wrap">${fileIconHtml}</div>
                <div class="download-item-info">
                    <div class="download-item-name" title="${escapeHtml(dl.filename)}">${escapeHtml(dl.filename)}</div>
                    <div class="download-item-meta">${metaText}</div>
                </div>
                <div class="download-item-actions">${actionsHtml}</div>
            </div>
            ${isActive ? `<div class="download-progress-bar"><div class="download-progress-fill" style="width:${pct}%"></div></div>` : ''}
        `;

        // Tamamlanan dosyalar için sürükle-bırak (devre dışı - Electron kısıtı)
        if (isDone && dl.savePath) {
            item.draggable = false;
        }

        downloadsPanel.appendChild(item);
    });
}

function updateDownloadsBadge() {
    if (!downloadsBtn || !downloadsBadge) return;
    const active = downloads.filter(d => d.state === 'progressing').length;
    // Buton hep görünür
    downloadsBtn.style.display = 'flex';
    downloadsBadge.classList.toggle('active', active > 0);
}

function pauseDownload(id) {
    ipcRenderer.send(`download-pause-${id}`);
    const dl = downloads.find(d => d.id === id);
    if (dl) { dl.isPaused = true; renderDownloadsPanel(); }
}

function resumeDownload(id) {
    ipcRenderer.send(`download-resume-${id}`);
    const dl = downloads.find(d => d.id === id);
    if (dl) { dl.isPaused = false; renderDownloadsPanel(); }
}

function cancelDownload(id) {
    ipcRenderer.send(`download-cancel-${id}`);
}

function showInFolder(savePath) {
    ipcRenderer.send('open-file-location', savePath);
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Zoom Göstergesi ───────────────────────────────────────────────────────────
let zoomHideTimer = null;

function applyZoom(direction) {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || !tab.webview || tab.url === 'about:blank') return;

    if (tab.zoomFactor === undefined) tab.zoomFactor = 1.0;

    const delta = direction === 'in' ? 0.1 : -0.1;
    tab.zoomFactor = Math.min(3.0, Math.max(0.25, tab.zoomFactor + delta));

    tab.webview.setZoomFactor(tab.zoomFactor);
    showZoomIndicator(tab.zoomFactor);
}

function showZoomIndicator(factor) {
    const indicator = document.getElementById('zoomIndicator');
    const levelEl = document.getElementById('zoomLevel');
    if (!indicator || !levelEl) return;

    const pct = Math.round(factor * 100);
    levelEl.textContent = `${pct}%`;

    // Zoom seviyesine göre ikon değiştir
    const icon = indicator.querySelector('i');
    if (icon) {
        icon.className = factor >= 1 ? 'fa-solid fa-magnifying-glass-plus' : 'fa-solid fa-magnifying-glass-minus';
    }

    indicator.classList.add('visible');

    // 1.5 saniye sonra gizle
    clearTimeout(zoomHideTimer);
    zoomHideTimer = setTimeout(() => {
        indicator.classList.remove('visible');
    }, 1500);
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Sayfa Yükleme Progress Bar ────────────────────────────────────────────────
let progressTimer = null;
let progressValue = 0;

function showProgressBar() {
    const bar = document.getElementById('pageProgressBar');
    if (!bar) return;
    progressValue = 0;
    bar.style.width = '0%';
    bar.style.opacity = '1';
    bar.style.transition = 'none';
    // Sahte ilerleme animasyonu
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
        if (progressValue < 85) {
            progressValue += Math.random() * 8;
            bar.style.transition = 'width 0.3s ease';
            bar.style.width = Math.min(progressValue, 85) + '%';
        }
    }, 200);
}

function hideProgressBar() {
    const bar = document.getElementById('pageProgressBar');
    if (!bar) return;
    clearInterval(progressTimer);
    bar.style.transition = 'width 0.2s ease';
    bar.style.width = '100%';
    setTimeout(() => {
        bar.style.opacity = '0';
        bar.style.width = '0%';
    }, 250);
}
// ─────────────────────────────────────────────────────────────────────────────

// ── SSL / Güvenlik Göstergesi ─────────────────────────────────────────────────
function updateSecurityIcon(url) {
    const siteInfoBtn = document.getElementById('siteInfoBtn');
    const siteInfoIcon = document.getElementById('siteInfoIcon');
    const urlSearchIcon = document.getElementById('urlSearchIcon');

    if (!siteInfoBtn || !siteInfoIcon) return;

    if (!url || url === 'about:blank' || isSpecialPage(url)) {
        // Arama ikonu göster, site info gizle
        siteInfoBtn.style.display = 'none';
        if (urlSearchIcon) urlSearchIcon.style.display = 'block';
        return;
    }

    // Site info butonunu göster, arama ikonunu gizle
    siteInfoBtn.style.display = 'flex';
    if (urlSearchIcon) urlSearchIcon.style.display = 'none';

    if (url.startsWith('https://')) {
        siteInfoIcon.className = 'fa-solid fa-lock';
        siteInfoBtn.className = 'site-info-btn';
        siteInfoBtn.title = 'Bağlantı güvenli (HTTPS)';
    } else if (url.includes('.onion')) {
        siteInfoIcon.className = 'fa-solid fa-circle-dot';
        siteInfoBtn.className = 'site-info-btn tor';
        siteInfoBtn.title = 'Tor ağı üzerinden bağlı (.onion)';
    } else if (url.startsWith('http://')) {
        siteInfoIcon.className = 'fa-solid fa-lock-open';
        siteInfoBtn.className = 'site-info-btn insecure';
        siteInfoBtn.title = 'Bağlantı güvenli değil (HTTP)';
    } else {
        siteInfoIcon.className = 'fa-solid fa-circle-info';
        siteInfoBtn.className = 'site-info-btn neutral';
        siteInfoBtn.title = 'Site bilgisi';
    }
}

function showSiteInfoPanel() {
    const panel = document.getElementById('siteInfoPanel');
    if (!panel) return;

    const tab = tabs.find(t => t.id === activeTabId);
    const url = tab ? tab.url : '';

    let hostname = '—';
    try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch(_e) {}

    // Domain'leri doldur
    ['siteInfoDomain','siteInfoDomain2','siteInfoDomain3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = hostname;
    });

    // Güvenlik durumu — ana sayfa
    const secIcon = document.getElementById('siteInfoSecIcon');
    const secLabel = document.getElementById('siteInfoSecLabel');
    if (secIcon && secLabel) {
        if (url.startsWith('https://')) {
            secIcon.className = 'fa-solid fa-lock site-info-item-icon';
            secLabel.textContent = 'Bağlantı güvenli';
        } else if (url.startsWith('http://')) {
            secIcon.className = 'fa-solid fa-lock-open site-info-item-icon insecure';
            secLabel.textContent = 'Bağlantı güvenli değil';
        } else {
            secIcon.className = 'fa-solid fa-circle-info site-info-item-icon';
            secLabel.textContent = 'Bağlantı bilgisi yok';
        }
    }

    // Güvenlik sayfası içeriği
    const secIcon2 = document.getElementById('siteInfoSecIcon2');
    const secTitle2 = document.getElementById('siteInfoSecTitle2');
    const secDesc2 = document.getElementById('siteInfoSecDesc2');
    if (secIcon2 && secTitle2 && secDesc2) {
        if (url.startsWith('https://')) {
            secIcon2.className = 'fa-solid fa-lock site-info-sec-icon';
            secTitle2.textContent = 'Bağlantı güvenli';
            secDesc2.textContent = 'Bilgileriniz (örneğin şifreler veya kredi kartı numaraları), bu siteye gönderilirken gizli olur.';
        } else if (url.startsWith('http://')) {
            secIcon2.className = 'fa-solid fa-lock-open site-info-sec-icon insecure';
            secTitle2.textContent = 'Bağlantı güvenli değil';
            secDesc2.textContent = 'Bu siteye gönderdiğiniz bilgiler başkaları tarafından görülebilir.';
        } else {
            secIcon2.className = 'fa-solid fa-circle-info site-info-sec-icon';
            secTitle2.textContent = 'Bağlantı bilgisi yok';
            secDesc2.textContent = 'Bu sayfa için güvenlik bilgisi mevcut değil.';
        }
    }

    // Çerez sayısını al — webview session üzerinden
    const cookieCountEl = document.getElementById('siteInfoCookieCount');
    if (cookieCountEl && tab && tab.webview && url.startsWith('http')) {
        try {
            tab.webview.getWebContentsId && tab.webview.executeJavaScript('document.cookie').then(cookies => {
                const count = cookies ? cookies.split(';').filter(c => c.trim()).length : 0;
                cookieCountEl.textContent = `${count} çerez kullanılıyor`;
            }).catch(() => {
                cookieCountEl.textContent = 'Çerez bilgisi alınamadı';
            });
        } catch(_e) {
            cookieCountEl.textContent = 'Çerez bilgisi alınamadı';
        }
    } else if (cookieCountEl) {
        cookieCountEl.textContent = 'Çerez yok';
    }

    // Ana sayfayı göster
    siteInfoGoTo('main');
    panel.classList.add('visible');
}

function siteInfoGoTo(page) {
    document.querySelectorAll('.site-info-page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`siteInfoPage${page.charAt(0).toUpperCase() + page.slice(1)}`);
    if (target) target.classList.add('active');
}

function hideSiteInfoPanel() {
    const panel = document.getElementById('siteInfoPanel');
    if (panel) panel.classList.remove('visible');
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Yer İşaretleri (Bookmarks) ────────────────────────────────────────────────
let bookmarks = [];

function loadBookmarks() {
    try {
        bookmarks = JSON.parse(localStorage.getItem('xenixa_bookmarks') || '[]');
    } catch(_e) { bookmarks = []; }
}

function saveBookmarks() {
    localStorage.setItem('xenixa_bookmarks', JSON.stringify(bookmarks));
}

function updateQuickBookmarks() {
    if (!quickBookmarks) return;
    
    loadBookmarks();
    
    if (bookmarks.length === 0) {
        quickBookmarks.innerHTML = '';
        quickBookmarks.classList.remove('visible');
        return;
    }
    
    quickBookmarks.innerHTML = bookmarks.slice(0, 10).map(bookmark => `
        <div class="quick-bookmark-item" data-url="${escapeHtml(bookmark.url)}">
            <img class="quick-bookmark-favicon" src="https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}" alt="" onerror="this.style.display='none'">
            <span class="quick-bookmark-title">${escapeHtml(bookmark.title || bookmark.url)}</span>
        </div>
    `).join('');
    
    quickBookmarks.querySelectorAll('.quick-bookmark-item').forEach(item => {
        item.addEventListener('click', () => {
            navigateToUrl(item.dataset.url);
        });
    });
}

function updateBookmarkButton() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.url === 'about:blank') {
        bookmarkToggleBtn.classList.remove('bookmarked');
        bookmarkIcon.className = 'fa-solid fa-bookmark';
        return;
    }
    
    loadBookmarks();
    const existingBookmark = bookmarks.find(b => b.url === tab.url);
    
    if (existingBookmark) {
        bookmarkToggleBtn.classList.add('bookmarked');
        bookmarkIcon.className = 'fa-solid fa-bookmark';
    } else {
        bookmarkToggleBtn.classList.remove('bookmarked');
        bookmarkIcon.className = 'fa-regular fa-bookmark';
    }
}

function isBookmarked(url) {
    return bookmarks.some(b => b.url === url);
}

function addBookmark(url, title) {
    if (!url || url === 'about:blank' || isSpecialPage(url)) return;
    if (isBookmarked(url)) return;
    bookmarks.unshift({ url, title: title || url, date: Date.now() });
    saveBookmarks();
    updateBookmarkIcon();
}

function removeBookmark(url) {
    bookmarks = bookmarks.filter(b => b.url !== url);
    saveBookmarks();
    updateBookmarkIcon();
}

function toggleBookmark() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.url === 'about:blank' || isSpecialPage(tab.url)) return;
    if (isBookmarked(tab.url)) {
        removeBookmark(tab.url);
    } else {
        addBookmark(tab.url, tab.title);
    }
}

function updateBookmarkIcon() {
    const btn = document.getElementById('bookmarkBtn');
    if (!btn) return;
    const tab = tabs.find(t => t.id === activeTabId);
    const bookmarked = tab && isBookmarked(tab.url);
    btn.querySelector('i').className = bookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
    btn.title = bookmarked ? 'Yer işaretinden kaldır' : 'Yer işaretine ekle';
    btn.classList.toggle('bookmarked', !!bookmarked);
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Find in Page (Ctrl+F) ─────────────────────────────────────────────────────
let findActive = false;

function openFindBar() {
    if (!findBar || !findInput) return;
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.url === 'about:blank' || isSpecialPage(tab.url)) return;

    findActive = true;
    findBar.classList.add('visible');
    requestAnimationFrame(() => {
        findInput.focus();
        findInput.select();
    });

    if (findInput.value.trim()) {
        startFind(findInput.value);
    }
}

function closeFindBar() {
    if (!findBar) return;
    findActive = false;
    findBar.classList.remove('visible');
    if (findCount) {
        findCount.textContent = '';
        findCount.classList.remove('no-results');
    }
    if (activeWebview && typeof activeWebview.stopFindInPage === 'function') {
        try { activeWebview.stopFindInPage('clearSelection'); } catch(_e) {}
    }
}

// Yeni arama başlat (input değişince)
function startFind(text) {
    if (!activeWebview || typeof activeWebview.findInPage !== 'function') return;
    if (!text) {
        if (findCount) { findCount.textContent = ''; findCount.classList.remove('no-results'); }
        try { activeWebview.stopFindInPage('clearSelection'); } catch(_e) {}
        return;
    }
    // Önce mevcut aramayı durdur, sonra yeniden başlat
    try { activeWebview.stopFindInPage('keepSelection'); } catch(_e) {}
    try {
        activeWebview.findInPage(text, { forward: true, findNext: false, matchCase: false });
    } catch(_e) {}
}

// Mevcut aramada ileri/geri git
function doFind(forward) {
    const text = findInput ? findInput.value : '';
    if (!text || !activeWebview || typeof activeWebview.findInPage !== 'function') return;
    try {
        activeWebview.findInPage(text, { forward, findNext: true, matchCase: false });
    } catch(_e) {}
}

function setupFindBarEvents() {
    if (!findInput) return;

    findInput.addEventListener('input', () => {
        const text = findInput.value;
        startFind(text);
    });

    findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (e.shiftKey) {
                doFind(false);
            } else {
                doFind(true);
            }
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            closeFindBar();
        }
    });

    if (findPrevBtn) findPrevBtn.addEventListener('click', () => doFind(false));
    if (findNextBtn) findNextBtn.addEventListener('click', () => doFind(true));
    if (findCloseBtn) findCloseBtn.addEventListener('click', () => closeFindBar());
}
// ─────────────────────────────────────────────────────────────────────────────

// ── WARP (Cloudflare) ─────────────────────────────────────────────────────────
let warpConnected = false;
let warpInstalled = false;
let warpTooltipVisible = false;

async function warpCheckStatus() {
    if (!warpBtn) return;
    try {
        const result = await ipcRenderer.invoke('warp-status');
        warpInstalled = result.installed;
        warpConnected = result.connected;
        updateWarpUI();
    } catch(_e) {
        warpInstalled = false;
        warpConnected = false;
        updateWarpUI();
    }
}

function updateWarpUI() {
    if (!warpBtn) return;

    // Buton rengi
    warpBtn.classList.toggle('connected', warpConnected);
    warpBtn.classList.remove('connecting');

    // Status dot
    if (warpStatusDot) {
        warpStatusDot.className = 'warp-status-dot' + (warpConnected ? ' connected' : '');
    }

    // Durum metni
    if (warpTooltipStatus) {
        if (!warpInstalled) {
            warpTooltipStatus.textContent = 'warp-cli bulunamadı. Cloudflare WARP uygulamasını yükleyin.';
        } else if (warpConnected) {
            warpTooltipStatus.textContent = 'Bağlı — Cloudflare WARP aktif';
        } else {
            warpTooltipStatus.textContent = 'Bağlı değil';
        }
    }

    // Toggle butonu
    if (warpToggleBtn) {
        warpToggleBtn.disabled = !warpInstalled;
        if (warpConnected) {
            warpToggleBtn.textContent = 'Bağlantıyı Kes';
            warpToggleBtn.className = 'warp-toggle-btn disconnect';
        } else {
            warpToggleBtn.textContent = 'Bağlan';
            warpToggleBtn.className = 'warp-toggle-btn';
        }
    }
}

function showWarpTooltip() {
    if (!warpTooltip) return;
    warpTooltipVisible = true;
    warpTooltip.classList.add('visible');
    warpCheckStatus();
}

function hideWarpTooltip() {
    if (!warpTooltip) return;
    warpTooltipVisible = false;
    warpTooltip.classList.remove('visible');
}

function setupWarpEvents() {
    if (!warpBtn) return;

    warpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (warpTooltipVisible) {
            hideWarpTooltip();
        } else {
            // Diğer panelleri kapat
            hideMenu();
            hideDownloadsPanel();
            hideSearchEngineDropdown();
            hideTorTooltip();
            showWarpTooltip();
        }
    });

    if (warpToggleBtn) {
        warpToggleBtn.addEventListener('click', async () => {
            warpToggleBtn.disabled = true;
            warpBtn.classList.add('connecting');
            if (warpStatusDot) warpStatusDot.className = 'warp-status-dot connecting';
            if (warpTooltipStatus) warpTooltipStatus.textContent = warpConnected ? 'Bağlantı kesiliyor...' : 'Bağlanıyor...';

            try {
                if (warpConnected) {
                    await ipcRenderer.invoke('warp-disconnect');
                } else {
                    await ipcRenderer.invoke('warp-connect');
                }
                // Durum güncellemesi için kısa bekle
                setTimeout(() => warpCheckStatus(), 1500);
            } catch(_e) {
                warpCheckStatus();
            }
        });
    }

    // İlk durum kontrolü
    warpCheckStatus();
}

// ── Tor (Ağı) ─────────────────────────────────────────────────────────────
let torConnected = false;
let torInstalled = false;
let torTooltipVisible = false;

async function torCheckStatus() {
    if (!torBtn) return;
    try {
        const result = await ipcRenderer.invoke('tor-status');
        torInstalled = result.installed;
        torConnected = result.connected;
        updateTorUI();
    } catch(_e) {
        torInstalled = false;
        torConnected = false;
        updateTorUI();
    }
}

function updateTorUI() {
    if (!torBtn) return;

    // Buton rengi
    torBtn.classList.toggle('connected', torConnected);
    torBtn.classList.remove('connecting');

    // Status dot
    if (torStatusDot) {
        torStatusDot.className = 'tor-status-dot' + (torConnected ? ' connected' : '');
    }

    // Durum metni
    if (torTooltipStatus) {
        if (!torInstalled) {
            torTooltipStatus.textContent = 'tor.exe bulunamadı. Ayarlar sayfasından Tor konumunu doğrulayın.';
        } else if (torConnected) {
            torTooltipStatus.textContent = 'Bağlı — Tor Ağı aktif';
        } else {
            torTooltipStatus.textContent = 'Bağlı değil';
        }
    }

    // Toggle butonu
    if (torToggleBtn) {
        torToggleBtn.disabled = !torInstalled;
        if (torConnected) {
            torToggleBtn.textContent = 'Bağlantıyı Kes';
            torToggleBtn.className = 'tor-toggle-btn disconnect';
        } else {
            torToggleBtn.textContent = 'Bağlan';
            torToggleBtn.className = 'tor-toggle-btn';
        }
    }
}

function showTorTooltip() {
    if (!torTooltip) return;
    torTooltipVisible = true;
    torTooltip.classList.add('visible');
    torCheckStatus();
}

function hideTorTooltip() {
    if (!torTooltip) return;
    torTooltipVisible = false;
    torTooltip.classList.remove('visible');
}

function setupTorEvents() {
    if (!torBtn) return;

    torBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (torTooltipVisible) {
            hideTorTooltip();
        } else {
            // Diğer panelleri kapat
            hideMenu();
            hideDownloadsPanel();
            hideSearchEngineDropdown();
            hideWarpTooltip();
            showTorTooltip();
        }
    });

    if (torToggleBtn) {
        torToggleBtn.addEventListener('click', async () => {
            torToggleBtn.disabled = true;
            torBtn.classList.add('connecting');
            if (torStatusDot) torStatusDot.className = 'tor-status-dot connecting';
            if (torTooltipStatus) torTooltipStatus.textContent = torConnected ? 'Bağlantı kesiliyor...' : 'Bağlanıyor...';

            try {
                if (torConnected) {
                    await ipcRenderer.invoke('tor-disconnect');
                } else {
                    const res = await ipcRenderer.invoke('tor-connect');
                    if (!res.ok) {
                        alert(res.error || 'Tor bağlantısı başarısız oldu.');
                    }
                }
                // Durum güncellemesi için kısa bekle
                setTimeout(() => torCheckStatus(), 1500);
            } catch(_e) {
                torCheckStatus();
            }
        });
    }

    // İlk durum kontrolü
    torCheckStatus();
}
// ─────────────────────────────────────────────────────────────────────────────

function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const isPopupMode = urlParams.get('popup') === 'true';

    if (isPopupMode) {
        document.body.classList.add('popup-window');
        const urlBar = document.getElementById('urlBar');
        if (urlBar) {
            urlBar.readOnly = true;
            urlBar.style.cursor = 'default';
        }
        const homeBtn = document.getElementById('homeBtn');
        const bookmarkToggleBtn = document.getElementById('bookmarkToggleBtn');
        const pinToggleBtn = document.getElementById('pinToggleBtn');
        const croxyProxyBtn = document.getElementById('croxyProxyBtn');
        const menuBtn = document.getElementById('menuBtn');
        const downloadsBtn = document.getElementById('downloadsBtn');
        
        if (homeBtn) homeBtn.style.display = 'none';
        if (bookmarkToggleBtn) bookmarkToggleBtn.style.display = 'none';
        if (pinToggleBtn) pinToggleBtn.style.display = 'none';
        if (croxyProxyBtn) croxyProxyBtn.style.display = 'none';
        if (menuBtn) menuBtn.style.display = 'none';
        if (downloadsBtn) downloadsBtn.style.display = 'none';
    }

    loadHistoryAndPersistence();
    updateSearchEngineUI();
    setupEventListeners();
    setupFindBarEvents();
    setupWarpEvents();
    setupTorEvents();
    initWelcomeSettings();
    if (backBtn) backBtn.disabled = true;
    if (forwardBtn) forwardBtn.disabled = true;
    restoreOpenTabs();
}

function loadHistoryAndPersistence() {
    try {
        const storedHistory = localStorage.getItem('xenixa_history');
        if (storedHistory) {
            searchHistory = JSON.parse(storedHistory);
        }
    } catch (e) {
        console.error("Arama geçmişi yüklenemedi:", e);
    }

    try {
        const storedVisited = localStorage.getItem('xenixa_visited_tabs');
        if (storedVisited) {
            visitedTabs = JSON.parse(storedVisited);
        }
    } catch (e) {
        console.error("Ziyaret edilen sekmeler geçmişi yüklenemedi:", e);
    }

    try {
        const storedCounts = localStorage.getItem('xenixa_visit_counts');
        if (storedCounts) {
            siteVisitCounts = JSON.parse(storedCounts);
        }
    } catch (e) {
        console.error("Ziyaret sayaçları yüklenemedi:", e);
    }
}

function addToSearchHistory(query) {
    if (!query || query === 'about:blank') return;

    // Çift kayıtları önle, en son aramayı en üste al
    searchHistory = searchHistory.filter(q => q !== query);
    searchHistory.unshift(query);

    // Geçmiş boyutunu sınırla
    if (searchHistory.length > 100) {
        searchHistory.pop();
    }

    localStorage.setItem('xenixa_history', JSON.stringify(searchHistory));
}

function addToVisitedTabs(title, url) {
    if (!url || url === 'about:blank') return;
    if (isSpecialPage(url)) return; // xenixa:// sayfalarını kaydetme
    const finalTitle = title || url;

    // Ziyaret sayacını artır
    siteVisitCounts[url] = (siteVisitCounts[url] || 0) + 1;
    localStorage.setItem('xenixa_visit_counts', JSON.stringify(siteVisitCounts));

    // Çift kayıtları önle
    visitedTabs = visitedTabs.filter(t => t.url !== url);
    visitedTabs.unshift({ title: finalTitle, url, date: Date.now() });

    // En son 500 ziyareti tut (geçmiş sayfası için yeterli)
    if (visitedTabs.length > 500) {
        visitedTabs.pop();
    }

    localStorage.setItem('xenixa_visited_tabs', JSON.stringify(visitedTabs));
}

function saveOpenTabsState() {
    const tabsToSave = tabs
        .filter(t => !isSpecialPage(t.url)) // özel sayfaları kaydetme
        .map(t => ({
            id: t.id,
            url: t.url,
            title: t.title,
            favicon: t.favicon
        }));
    localStorage.setItem('xenixa_open_tabs', JSON.stringify(tabsToSave));
    localStorage.setItem('xenixa_active_tab_id', activeTabId);
}

function restoreOpenTabs() {
    let restoredTabs = [];
    let restoredActiveTabId = null;

    try {
        const storedTabs = localStorage.getItem('xenixa_open_tabs');
        if (storedTabs) {
            restoredTabs = JSON.parse(storedTabs);
        }
        restoredActiveTabId = localStorage.getItem('xenixa_active_tab_id');
    } catch (e) {
        console.error("Sekmeler geri yüklenemedi:", e);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const initialUrl = urlParams.get('initialUrl');

    if (initialUrl && initialUrl !== 'about:blank') {
        // Pop-out pencere ise oturum sekmesini geri yükleme, doğrudan yeni sekmeyi yükle
        createNewTab(initialUrl);
    } else if (restoredTabs && restoredTabs.length > 0) {
        // Kaydedilmiş sekmeleri geri yükle
        restoredTabs.forEach(t => {
            const newTab = {
                id: t.id,
                url: t.url,
                title: t.title,
                favicon: t.favicon,
                webview: null,
                permissionRequests: [],
                activeDialog: null
            };

            const webview = document.createElement('webview');
            const preloadPath = 'file:///' + path.join(__dirname, 'webview-preload.js').replace(/\\/g, '/');
            webview.setAttribute('webpreferences', 'contextIsolation=yes, nodeIntegration=no, webSecurity=no');
            webview.setAttribute('allowpopups', '');
            webview.setAttribute('preload', preloadPath);
            webview.className = 'tab-webview';
            webview.style.display = 'none';

            document.getElementById('webviewContainer').appendChild(webview);
            newTab.webview = webview;

            setupSingleWebviewEvents(newTab);

            if (newTab.url !== 'about:blank') {
                webview.src = newTab.url;
            }

            tabs.push(newTab);
        });

        // Aktif sekmeyi geri yükle
        const tabExists = tabs.some(t => String(t.id) === String(restoredActiveTabId));
        const finalActiveId = tabExists ? restoredActiveTabId : tabs[0].id;

        requestAnimationFrame(() => {
            switchTab(finalActiveId);
        });
    } else {
        createNewTab('about:blank');
    }
}

function resetTabToHome(tab) {
    tab.url = 'about:blank';
    tab.title = getAppName();
    tab.favicon = null;
}

function showWelcomeScreen() {
    welcomeScreen.style.display = 'flex';
    if (activeWebview) {
        activeWebview.classList.remove('visible');
        activeWebview.style.display = 'none';
    }
    welcomeScreen.classList.remove('search-revealed');
    welcomeSearchRevealed = false;
    welcomeSearchInput.value = '';
    renderTopSites();
    applyWelcomeBg();
    applyWelcomeLogoVisibility();
    applyWelcomeSearchBoxVisibility();
}

// ── Anasayfa Ayarları ─────────────────────────────────────────────────────────

// Yüklenen resimleri array olarak sakla: [{ id, dataUrl }]
function loadBgImages() {
    try { return JSON.parse(localStorage.getItem('xenixa_bg_images') || '[]'); } catch(_e) { return []; }
}
function saveBgImages(arr) {
    localStorage.setItem('xenixa_bg_images', JSON.stringify(arr));
}

function applyWelcomeLogoVisibility() {
    const logo = document.getElementById('welcomeLogo');
    if (!logo) return;
    const hidden = localStorage.getItem('xenixa_logo_hidden') === '1';
    logo.style.display = hidden ? 'none' : '';
}

function applyWelcomeSearchBoxVisibility() {
    const searchWrap = document.getElementById('welcomeSearchWrap');
    if (!searchWrap) return;
    const hidden = localStorage.getItem('xenixa_searchbox_hidden') === '1';
    searchWrap.style.display = hidden ? 'none' : '';
}

// ── Marka ayarları (logo + isim) ──────────────────────────────────────────────
function applyBrandSettings() {
    const customLogo = localStorage.getItem('xenixa_app_logo');
    const customName = localStorage.getItem('xenixa_app_name');

    // Tüm logo img'lerini güncelle (assets/logo.png kullananlar)
    document.querySelectorAll('img[src*="logo.png"], img.tab-logo, img.welcome-logo').forEach(img => {
        img.src = customLogo || img.src.replace(/^data:.*/, '') || img.getAttribute('data-default-src') || 'assets/logo.png';
        if (customLogo) {
            img.src = customLogo;
        } else {
            // Varsayılana dön
            if (img.classList.contains('tab-logo')) img.src = 'assets/logo.png';
            if (img.classList.contains('welcome-logo')) img.src = 'assets/logo.png';
        }
    });

    // Görev çubuğu + pencere ikonu güncelle (Electron main process)
    if (customLogo) {
        ipcRenderer.send('set-app-icon', customLogo);
    } else {
        ipcRenderer.send('reset-app-icon');
    }

    // Marka önizlemesini güncelle
    const previewImg = document.getElementById('brandLogoPreviewImg');
    const previewIcon = document.getElementById('brandLogoPreviewIcon');
    if (previewImg && previewIcon) {
        if (customLogo) {
            previewImg.src = customLogo;
            previewImg.style.display = 'block';
            previewIcon.style.display = 'none';
        } else {
            previewImg.style.display = 'none';
            previewIcon.style.display = '';
        }
    }

    // Uygulama adını güncelle
    const appName = customName || 'Xenixa';

    // HOME_TITLE dinamik olarak güncelle
    window._appName = appName;

    // Pencere başlığı
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab || activeTab.url === 'about:blank') {
        document.title = appName;
    }

    // Tab başlıklarını yeniden render et (about:blank sekmeleri)
    renderTabs();

    // Popup title
    const popupTitle = document.getElementById('popupTitle');
    if (popupTitle) popupTitle.textContent = appName;
}

function applyWelcomeBg() {
    const bg = localStorage.getItem('xenixa_welcome_bg');
    const bgShow = localStorage.getItem('xenixa_bg_show') !== '0';
    const bgVideo = localStorage.getItem('xenixa_welcome_video');
    const videoEl = document.getElementById('welcomeBgVideo');

    // Önce videoyu sıfırla
    if (videoEl) {
        videoEl.style.display = 'none';
        videoEl.pause();
        videoEl.src = '';
    }

    if (bgVideo && bgShow) {
        // Video arka plan
        welcomeScreen.style.backgroundImage = '';
        welcomeScreen.style.backgroundColor = '';
        welcomeScreen.classList.add('has-bg');
        if (videoEl) {
            videoEl.src = bgVideo;
            videoEl.muted = localStorage.getItem('xenixa_bg_video_sound') !== '1';
            videoEl.style.display = 'block';
            videoEl.play().catch(() => {});
        }
        return;
    }

    if (bg && bgShow) {
        if (bg.startsWith('linear-gradient')) {
            welcomeScreen.style.backgroundImage = bg;
            welcomeScreen.style.backgroundColor = '';
        } else if (bg.startsWith('#')) {
            welcomeScreen.style.backgroundImage = 'none';
            welcomeScreen.style.backgroundColor = bg;
        } else {
            welcomeScreen.style.backgroundImage = `url("${bg}")`;
            welcomeScreen.style.backgroundColor = '';
        }
        welcomeScreen.classList.add('has-bg');
    } else {
        welcomeScreen.style.backgroundImage = '';
        welcomeScreen.style.backgroundColor = '';
        welcomeScreen.classList.remove('has-bg');
    }
}

function openWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    const backdrop = document.getElementById('welcomeModalBackdrop');
    if (!modal || !backdrop) return;

    const bgShow = localStorage.getItem('xenixa_bg_show') !== '0';
    const bgShowToggle = document.getElementById('bgShowToggle');
    if (bgShowToggle) bgShowToggle.checked = bgShow;

    const topSitesToggle = document.getElementById('topSitesToggle');
    if (topSitesToggle) topSitesToggle.checked = localStorage.getItem('xenixa_topsites_hidden') !== '1';

    const logoShowToggle = document.getElementById('logoShowToggle');
    if (logoShowToggle) logoShowToggle.checked = localStorage.getItem('xenixa_logo_hidden') !== '1';

    const searchBoxShowToggle = document.getElementById('searchBoxShowToggle');
    if (searchBoxShowToggle) searchBoxShowToggle.checked = localStorage.getItem('xenixa_searchbox_hidden') !== '1';

    // Video ses toggle — sadece video varsa göster
    const videoSoundRow = document.getElementById('videoSoundRow');
    const bgVideoSoundToggle = document.getElementById('bgVideoSoundToggle');
    const hasVideo = !!localStorage.getItem('xenixa_welcome_video');
    if (videoSoundRow) videoSoundRow.style.display = hasVideo ? 'flex' : 'none';
    if (bgVideoSoundToggle) bgVideoSoundToggle.checked = localStorage.getItem('xenixa_bg_video_sound') === '1';

    renderBgImageCards();
    updateBgCardSelection();

    // Brand tab — mevcut değerleri yükle
    const brandNameInput = document.getElementById('brandNameInput');
    if (brandNameInput) {
        brandNameInput.value = localStorage.getItem('xenixa_app_name') || '';
    }
    // Logo önizlemesini güncelle
    const previewImg = document.getElementById('brandLogoPreviewImg');
    const previewIcon = document.getElementById('brandLogoPreviewIcon');
    const customLogo = localStorage.getItem('xenixa_app_logo');
    if (previewImg && previewIcon) {
        if (customLogo) {
            previewImg.src = customLogo;
            previewImg.style.display = 'block';
            previewIcon.style.display = 'none';
        } else {
            previewImg.style.display = 'none';
            previewIcon.style.display = '';
        }
    }

    modal.classList.add('visible');
    backdrop.classList.add('visible');
}

function closeWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    const backdrop = document.getElementById('welcomeModalBackdrop');
    if (modal) modal.classList.remove('visible');
    if (backdrop) backdrop.classList.remove('visible');
}

// Yüklenen resimleri grid'e render et
function renderBgImageCards() {
    const grid = document.getElementById('wmBgGrid');
    if (!grid) return;

    // Eski resim/video kartlarını temizle
    grid.querySelectorAll('.wm-bg-uploaded').forEach(c => c.remove());

    const images = loadBgImages();
    const activeBg = localStorage.getItem('xenixa_welcome_bg');
    const activeVideo = localStorage.getItem('xenixa_welcome_video');

    // Yüklenen resimleri ekle
    images.forEach(img => {
        const card = document.createElement('div');
        card.className = 'wm-bg-card wm-bg-uploaded';
        card.dataset.imgId = img.id;

        const isSelected = activeBg === img.dataUrl;
        if (isSelected) card.classList.add('selected');

        card.innerHTML = `
            <img src="${img.dataUrl}" alt="">
            <div class="wm-bg-check" style="display:${isSelected ? 'flex' : 'none'}">
                <i class="fa-solid fa-check"></i>
            </div>
        `;

        card.addEventListener('click', () => {
            localStorage.removeItem('xenixa_welcome_video');
            const videoEl = document.getElementById('welcomeBgVideo');
            if (videoEl) { videoEl.style.display = 'none'; videoEl.pause(); videoEl.src = ''; }
            setBg(img.dataUrl);
        });

        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showBgImageContextMenu(e.clientX, e.clientY, img.id, 'image');
        });

        const uploadVideoCard = document.getElementById('wmUploadVideoCard');
        if (uploadVideoCard && uploadVideoCard.nextSibling) {
            grid.insertBefore(card, uploadVideoCard.nextSibling);
        } else {
            grid.appendChild(card);
        }
    });

    // Video kartı varsa ekle
    if (activeVideo) {
        const vcard = document.createElement('div');
        vcard.className = 'wm-bg-card wm-bg-uploaded wm-bg-video-card';
        vcard.dataset.videoCard = '1';
        vcard.classList.add('selected');
        vcard.innerHTML = `
            <div class="wm-bg-video-thumb">
                <i class="fa-solid fa-film"></i>
                <span>Video</span>
            </div>
            <div class="wm-bg-check" style="display:flex"><i class="fa-solid fa-check"></i></div>
        `;
        vcard.addEventListener('click', () => {
            localStorage.setItem('xenixa_welcome_video', activeVideo);
            applyWelcomeBg();
            updateBgCardSelection();
        });
        vcard.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showBgImageContextMenu(e.clientX, e.clientY, null, 'video');
        });
        grid.appendChild(vcard);
    }
}

// Resim/video sağ tık menüsü
let bgImgCtxMenu = null;
function showBgImageContextMenu(x, y, imgId, type) {
    if (bgImgCtxMenu) bgImgCtxMenu.remove();

    bgImgCtxMenu = document.createElement('div');
    bgImgCtxMenu.className = 'context-menu visible';
    bgImgCtxMenu.style.left = `${x}px`;
    bgImgCtxMenu.style.top = `${y}px`;
    bgImgCtxMenu.style.zIndex = '999999';
    bgImgCtxMenu.innerHTML = `
        <div class="context-menu-item" id="bgImgCtxDelete">
            <i class="fa-solid fa-trash"></i><span>${type === 'video' ? 'Videoyu sil' : 'Resmi sil'}</span>
        </div>
    `;
    document.body.appendChild(bgImgCtxMenu);

    bgImgCtxMenu.querySelector('#bgImgCtxDelete').addEventListener('click', () => {
        if (type === 'video') {
            deleteVideo();
        } else {
            deleteBgImage(imgId);
        }
        bgImgCtxMenu.remove();
        bgImgCtxMenu = null;
    });

    const closeCtx = (e) => {
        if (bgImgCtxMenu && !bgImgCtxMenu.contains(e.target)) {
            bgImgCtxMenu.remove();
            bgImgCtxMenu = null;
            document.removeEventListener('mousedown', closeCtx);
        }
    };
    setTimeout(() => document.addEventListener('mousedown', closeCtx), 0);
}

function deleteVideo() {
    localStorage.removeItem('xenixa_welcome_video');
    localStorage.removeItem('xenixa_bg_video_sound');
    const videoEl = document.getElementById('welcomeBgVideo');
    if (videoEl) { videoEl.style.display = 'none'; videoEl.pause(); videoEl.src = ''; }
    welcomeScreen.classList.remove('has-bg');
    const videoSoundRow = document.getElementById('videoSoundRow');
    if (videoSoundRow) videoSoundRow.style.display = 'none';
    renderBgImageCards();
    updateBgCardSelection();
}

function deleteBgImage(imgId) {
    let images = loadBgImages();
    const deleted = images.find(i => i.id === imgId);
    images = images.filter(i => i.id !== imgId);
    saveBgImages(images);

    // Eğer silinen resim aktifse arka planı temizle
    if (deleted && localStorage.getItem('xenixa_welcome_bg') === deleted.dataUrl) {
        localStorage.removeItem('xenixa_welcome_bg');
        applyWelcomeBg();
    }
    renderBgImageCards();
    updateBgCardSelection();
}

function updateBgCardSelection() {
    const bg = localStorage.getItem('xenixa_welcome_bg');

    // Tüm kartlardan seçimi kaldır
    document.querySelectorAll('.wm-bg-card, .wm-color-swatch').forEach(c => {
        c.classList.remove('selected');
        const check = c.querySelector('.wm-bg-check');
        if (check) check.style.display = 'none';
    });

    if (!bg) return;

    if (bg.startsWith('linear-gradient')) {
        document.querySelectorAll('.wm-bg-gradient').forEach(c => {
            if (c.dataset.gradient === bg) {
                c.classList.add('selected');
                const check = c.querySelector('.wm-bg-check');
                if (check) check.style.display = 'flex';
            }
        });
    } else if (bg.startsWith('#')) {
        document.querySelectorAll('.wm-color-swatch').forEach(c => {
            if (c.dataset.color === bg) {
                c.classList.add('selected');
                const check = c.querySelector('.wm-bg-check');
                if (check) check.style.display = 'flex';
            }
        });
    } else {
        // Resim
        document.querySelectorAll('.wm-bg-uploaded').forEach(c => {
            const images = loadBgImages();
            const img = images.find(i => i.id === c.dataset.imgId);
            if (img && img.dataUrl === bg) {
                c.classList.add('selected');
                const check = c.querySelector('.wm-bg-check');
                if (check) check.style.display = 'flex';
            }
        });
    }
}

function setBg(value) {
    if (value) {
        localStorage.setItem('xenixa_welcome_bg', value);
        localStorage.setItem('xenixa_bg_show', '1');
        const bgShowToggle = document.getElementById('bgShowToggle');
        if (bgShowToggle) bgShowToggle.checked = true;
    } else {
        localStorage.removeItem('xenixa_welcome_bg');
    }
    applyWelcomeBg();
    updateBgCardSelection();
}

function initWelcomeSettings() {
    const settingsBtn = document.getElementById('welcomeSettingsBtn');
    const modalClose = document.getElementById('welcomeModalClose');
    const backdrop = document.getElementById('welcomeModalBackdrop');
    const bgFileInput = document.getElementById('bgFileInput');
    const topSitesToggle = document.getElementById('topSitesToggle');
    const bgShowToggle = document.getElementById('bgShowToggle');
    const wmCustomColor = document.getElementById('wmCustomColor');

    // Sayfa yüklenince kayıtlı tercihleri uygula
    applyWelcomeLogoVisibility();
    applyWelcomeSearchBoxVisibility();
    applyBrandSettings();

    if (settingsBtn) settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); openWelcomeModal(); });
    if (modalClose) modalClose.addEventListener('click', closeWelcomeModal);
    if (backdrop) backdrop.addEventListener('click', closeWelcomeModal);

    // Sidebar nav
    document.querySelectorAll('.wm-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.wm-nav-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.wm-tab').forEach(t => t.classList.remove('active'));
            item.classList.add('active');
            const tab = document.getElementById(`wm-tab-${item.dataset.tab}`);
            if (tab) tab.classList.add('active');
        });
    });

    // Yükle kartı
    const uploadCard = document.getElementById('wmUploadCard');
    if (uploadCard) uploadCard.addEventListener('click', () => bgFileInput && bgFileInput.click());

    // Video yükleme kartı
    const uploadVideoCard = document.getElementById('wmUploadVideoCard');
    const bgVideoInput = document.getElementById('bgVideoInput');
    if (uploadVideoCard) uploadVideoCard.addEventListener('click', () => bgVideoInput && bgVideoInput.click());

    if (bgVideoInput) {
        bgVideoInput.addEventListener('change', () => {
            const file = bgVideoInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                localStorage.setItem('xenixa_welcome_video', dataUrl);
                localStorage.setItem('xenixa_bg_show', '1');
                // Resim arka planını temizle
                localStorage.removeItem('xenixa_welcome_bg');
                applyWelcomeBg();
                // Video ses satırını göster
                const videoSoundRow = document.getElementById('videoSoundRow');
                if (videoSoundRow) videoSoundRow.style.display = 'flex';
                updateBgCardSelection();
            };
            reader.readAsDataURL(file);
            bgVideoInput.value = '';
        });
    }

    // Video ses toggle
    const bgVideoSoundToggle = document.getElementById('bgVideoSoundToggle');
    if (bgVideoSoundToggle) {
        bgVideoSoundToggle.addEventListener('change', () => {
            localStorage.setItem('xenixa_bg_video_sound', bgVideoSoundToggle.checked ? '1' : '0');
            const videoEl = document.getElementById('welcomeBgVideo');
            if (videoEl) videoEl.muted = !bgVideoSoundToggle.checked;
        });
    }

    // Dosya seçici — çoklu resim desteği
    if (bgFileInput) {
        bgFileInput.addEventListener('change', () => {
            const file = bgFileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                // Kaydet
                const images = loadBgImages();
                const newImg = { id: Date.now().toString(), dataUrl };
                images.unshift(newImg);
                saveBgImages(images);
                // Seç ve uygula
                setBg(dataUrl);
                renderBgImageCards();
            };
            reader.readAsDataURL(file);
            bgFileInput.value = '';
        });
    }

    // Gradient kartları
    document.querySelectorAll('.wm-bg-gradient').forEach(card => {
        card.addEventListener('click', () => setBg(card.dataset.gradient));
    });

    // Düz renk swatchları
    document.querySelectorAll('.wm-color-swatch:not(.wm-custom-swatch)').forEach(swatch => {
        swatch.addEventListener('click', () => setBg(swatch.dataset.color));
    });

    // Özel renk — input[type=color] tıklanınca açılır, change'de uygula
    if (wmCustomColor) {
        wmCustomColor.addEventListener('change', () => {
            setBg(wmCustomColor.value);
            // Özel swatch'ın arka planını güncelle
            const customSwatch = document.getElementById('wmCustomSwatch');
            if (customSwatch) customSwatch.style.background = wmCustomColor.value;
        });
    }

    // Arka plan göster/gizle toggle
    if (bgShowToggle) {
        bgShowToggle.addEventListener('change', () => {
            localStorage.setItem('xenixa_bg_show', bgShowToggle.checked ? '1' : '0');
            applyWelcomeBg();
        });
    }

    // Top sites toggle
    if (topSitesToggle) {
        topSitesToggle.addEventListener('change', () => {
            localStorage.setItem('xenixa_topsites_hidden', topSitesToggle.checked ? '0' : '1');
            renderTopSites();
        });
    }

    // Logo göster/gizle toggle
    const logoShowToggle = document.getElementById('logoShowToggle');
    if (logoShowToggle) {
        logoShowToggle.addEventListener('change', () => {
            localStorage.setItem('xenixa_logo_hidden', logoShowToggle.checked ? '0' : '1');
            applyWelcomeLogoVisibility();
        });
    }

    // Arama kutusu göster/gizle toggle
    const searchBoxShowToggle = document.getElementById('searchBoxShowToggle');
    if (searchBoxShowToggle) {
        searchBoxShowToggle.addEventListener('change', () => {
            localStorage.setItem('xenixa_searchbox_hidden', searchBoxShowToggle.checked ? '0' : '1');
            applyWelcomeSearchBoxVisibility();
        });
    }

    // ── Marka sekmesi ─────────────────────────────────────────────────────────
    const brandLogoInput = document.getElementById('brandLogoInput');
    const brandLogoUploadBtn = document.getElementById('brandLogoUploadBtn');
    const brandLogoResetBtn = document.getElementById('brandLogoResetBtn');
    const brandNameInput = document.getElementById('brandNameInput');
    const brandNameSaveBtn = document.getElementById('brandNameSaveBtn');

    // Mevcut değerleri input'a yükle
    const savedName = localStorage.getItem('xenixa_app_name');
    if (brandNameInput && savedName) brandNameInput.value = savedName;

    if (brandLogoUploadBtn && brandLogoInput) {
        brandLogoUploadBtn.addEventListener('click', () => brandLogoInput.click());
        brandLogoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target.result;
                localStorage.setItem('xenixa_app_logo', dataUrl);
                applyBrandSettings();
            };
            reader.readAsDataURL(file);
            brandLogoInput.value = '';
        });
    }

    if (brandLogoResetBtn) {
        brandLogoResetBtn.addEventListener('click', () => {
            localStorage.removeItem('xenixa_app_logo');
            applyBrandSettings();
        });
    }

    if (brandNameSaveBtn && brandNameInput) {
        brandNameSaveBtn.addEventListener('click', () => {
            const name = brandNameInput.value.trim();
            if (name) {
                localStorage.setItem('xenixa_app_name', name);
            } else {
                localStorage.removeItem('xenixa_app_name');
            }
            applyBrandSettings();
        });
        brandNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') brandNameSaveBtn.click();
        });
    }
}
// ─────────────────────────────────────────────────────────────────────────────

function renderTopSites() {
    const container = document.getElementById('topSites');
    if (!container) return;

    // Gizleme ayarı
    if (localStorage.getItem('xenixa_topsites_hidden') === '1') {
        container.innerHTML = '';
        return;
    }

    // Domain bazında grupla — aynı domain'den en yüksek count'u al
    const domainMap = {}; // { "youtube.com": { url, count } }
    Object.entries(siteVisitCounts).forEach(([url, count]) => {
        let hostname = '';
        try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch(_e) { return; }
        if (!domainMap[hostname] || count > domainMap[hostname].count) {
            domainMap[hostname] = { url, count, hostname };
        }
    });

    // Top 5'i al
    const top5 = Object.values(domainMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    if (top5.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = top5.map(({ url, hostname }) => {
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
        return `
            <div class="top-site-item" data-url="${escapeHtml(url)}" title="${escapeHtml(url)}">
                <div class="top-site-icon-wrap">
                    <img src="${faviconUrl}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                    <i class="fa-solid fa-globe" style="display:none"></i>
                </div>
                <span class="top-site-label">${escapeHtml(hostname)}</span>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.top-site-item').forEach(el => {
        el.addEventListener('click', () => navigateToUrl(el.dataset.url));
    });
}

function hideWelcomeScreen() {
    welcomeScreen.style.display = 'none';
    if (activeWebview) {
        activeWebview.classList.add('visible');
        activeWebview.style.display = 'flex';
    }
}

function revealWelcomeSearch() {
    if (welcomeSearchRevealed) return;
    welcomeSearchRevealed = true;
    welcomeScreen.classList.add('search-revealed');
    requestAnimationFrame(() => {
        setTimeout(() => welcomeSearchInput.focus(), 380);
    });
}

function hideWelcomeSearch() {
    if (!welcomeSearchRevealed) return;
    welcomeSearchRevealed = false;
    welcomeScreen.classList.remove('search-revealed');
    welcomeSearchInput.value = '';
    autocompleteValue = '';
    autocompleteRealUrl = '';
    hideSuggestions();
}

function setupSingleWebviewEvents(tab) {
    const webview = tab.webview;
    if (!webview) return;

    webview.addEventListener('did-start-loading', () => {
        if (tab.url === 'about:blank') return;
        tab.loading = true;
        if (activeTabId === tab.id) {
            progressBar.classList.add('loading');
        }
        renderTabs();
    });

    webview.addEventListener('did-stop-loading', () => {
        tab.loading = false;
        if (activeTabId === tab.id) {
            progressBar.classList.remove('loading');
            updateNavButtons();
            updateSecurityIcon(tab.url);
            updateBookmarkButton();
        }
        renderTabs();
    });
    
    webview.addEventListener('did-navigate', (event) => {
        if (activeTabId === tab.id) {
            updateBookmarkButton();
        }
    });

    webview.addEventListener('page-title-updated', (event) => {
        if (tab.url === 'about:blank') return;
        tab.title = event.title || tab.url;
        addToVisitedTabs(tab.title, tab.url);
        saveOpenTabsState();
        if (activeTabId === tab.id) updateWindowTitle(tab);
        renderTabs();
        
        // Popup başlığını güncelle
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('popup') === 'true') {
            const popupTitle = document.getElementById('popupTitle');
            if (popupTitle) popupTitle.textContent = tab.title;
        }
    });

    webview.addEventListener('did-navigate', (event) => {
        if (event.url === 'about:blank') {
            resetTabToHome(tab);
            tab.loading = false;
            if (activeTabId === tab.id) {
                urlBar.value = '';
                showWelcomeScreen();
                updateNavButtons();
            }
            saveOpenTabsState();
            renderTabs();
            return;
        }

        tab.url = event.url;
        if (activeTabId === tab.id) {
            urlBar.value = event.url;
            hideWelcomeScreen();
            updateNavButtons();
            updateSecurityIcon(event.url);
        }
        addToVisitedTabs(tab.title, event.url);
        saveOpenTabsState();
        renderTabs();
    });

    // SPA içi navigasyon (hash değişimi, pushState vb.) — URL'yi anlık güncelle
    webview.addEventListener('did-navigate-in-page', (event) => {
        if (!event.isMainFrame) return;
        tab.url = event.url;
        if (activeTabId === tab.id) {
            urlBar.value = event.url;
            updateNavButtons();
        }
        saveOpenTabsState();
    });

    webview.addEventListener('page-favicon-updated', (event) => {
        if (tab.url === 'about:blank' || !event.favicons?.length) return;
        tab.favicon = event.favicons[0];
        saveOpenTabsState();
        renderTabs();
    });

    webview.addEventListener('media-started-playing', () => {
        tab.audible = true;
        renderTabs();
    });

    webview.addEventListener('media-paused', () => {
        tab.audible = false;
        renderTabs();
    });

    // Find in page sonuçları
    webview.addEventListener('found-in-page', (e) => {
        if (activeTabId !== tab.id || !findCount) return;
        const { activeMatchOrdinal, matches } = e.result;
        if (!matches || matches === 0) {
            findCount.textContent = 'Sonuç yok';
            findCount.classList.add('no-results');
        } else {
            findCount.textContent = `${activeMatchOrdinal} / ${matches}`;
            findCount.classList.remove('no-results');
        }
    });

    // Webview içi tam ekran (video vb.)
    webview.addEventListener('enter-html-full-screen', () => {
        document.querySelector('.tab-bar').style.display = 'none';
        document.querySelector('.nav-bar').style.display = 'none';
        document.querySelector('.quick-bookmarks').style.display = 'none';
        document.querySelector('.progress-bar').style.display = 'none';
        document.body.classList.add('webview-fullscreen');
    });

    webview.addEventListener('leave-html-full-screen', () => {
        document.querySelector('.tab-bar').style.display = '';
        document.querySelector('.nav-bar').style.display = '';
        document.querySelector('.progress-bar').style.display = '';
        document.body.classList.remove('webview-fullscreen');
        // quick-bookmarks sadece about:blank'te görünür
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab && activeTab.url === 'about:blank') {
            document.querySelector('.quick-bookmarks').style.display = '';
        }
    });
}

function setupEventListeners() {
    newTabBtn.addEventListener('click', () => createNewTab());
    goBtn.addEventListener('click', navigate);

    // Orta tuş autoscroll'u (tarayıcı varsayılanı) sekme çubuğunda engelle
    if (tabsContainer) {
        tabsContainer.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
        });
    }

    // Site Info butonu
    const siteInfoBtn = document.getElementById('siteInfoBtn');
    const siteInfoClose = document.getElementById('siteInfoClose');
    const siteInfoSettingsRow = document.getElementById('siteInfoSettingsRow');

    if (siteInfoBtn) {
        siteInfoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const panel = document.getElementById('siteInfoPanel');
            if (panel && panel.classList.contains('visible')) {
                hideSiteInfoPanel();
            } else {
                hideMenu(); hideDownloadsPanel(); hideWarpTooltip(); hideTorTooltip(); hideSearchEngineDropdown();
                showSiteInfoPanel();
            }
        });
    }
    if (siteInfoClose) siteInfoClose.addEventListener('click', hideSiteInfoPanel);
    if (siteInfoSettingsRow) {
        siteInfoSettingsRow.addEventListener('click', () => {
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab && tab.url) {
                try {
                    const origin = new URL(tab.url).origin;
                    createNewTab(`chrome://settings/content/siteDetails?site=${encodeURIComponent(origin)}`);
                } catch(_e) {}
            }
            hideSiteInfoPanel();
        });
    }

    // Site Info — alt sayfa navigasyonu
    const siteInfoSecurityRow = document.getElementById('siteInfoSecurityRow');
    const siteInfoCookiesRow  = document.getElementById('siteInfoCookiesRow');
    const siteInfoBackSec     = document.getElementById('siteInfoBackSec');
    const siteInfoBackCookies = document.getElementById('siteInfoBackCookies');
    const siteInfoClose2      = document.getElementById('siteInfoClose2');
    const siteInfoClose3      = document.getElementById('siteInfoClose3');
    const siteInfoCertBtn     = document.getElementById('siteInfoCertBtn');

    if (siteInfoSecurityRow) siteInfoSecurityRow.addEventListener('click', () => siteInfoGoTo('security'));
    if (siteInfoCookiesRow)  siteInfoCookiesRow.addEventListener('click',  () => siteInfoGoTo('cookies'));
    if (siteInfoBackSec)     siteInfoBackSec.addEventListener('click',     () => siteInfoGoTo('main'));
    if (siteInfoBackCookies) siteInfoBackCookies.addEventListener('click', () => siteInfoGoTo('main'));
    if (siteInfoClose2)      siteInfoClose2.addEventListener('click',      hideSiteInfoPanel);
    if (siteInfoClose3)      siteInfoClose3.addEventListener('click',      hideSiteInfoPanel);
    if (siteInfoCertBtn) {
        siteInfoCertBtn.addEventListener('click', () => {
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab && tab.webview) {
                try { tab.webview.showCertificateViewer(); } catch(_e) {}
            }
        });
    }
    const siteInfoSecMoreLink = document.getElementById('siteInfoSecMoreLink');
    if (siteInfoSecMoreLink) {
        siteInfoSecMoreLink.addEventListener('click', (e) => {
            e.preventDefault();
            createNewTab('https://support.google.com/chrome?p=ui_security_indicator');
            hideSiteInfoPanel();
        });
    }
    if (siteInfoSettingsRow) {
        siteInfoSettingsRow.addEventListener('click', () => {
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab && tab.url) {
                try {
                    const origin = new URL(tab.url).origin;
                    createNewTab(`chrome://settings/content/siteDetails?site=${encodeURIComponent(origin)}`);
                } catch(_e) {}
            }
            hideSiteInfoPanel();
        });
    }

    // CroxyProxy kısayolu
    const croxyProxyBtn = document.getElementById('croxyProxyBtn');
    if (croxyProxyBtn) {
        croxyProxyBtn.addEventListener('click', () => {
            createNewTab('https://www.croxyproxy.com');
        });
    }

    urlBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            // Öneri listesinde seçili öğe varsa onu kullan
            const highlighted = suggestionsBox.querySelector('.suggestions-item.highlighted');
            if (highlighted) {
                const text = highlighted.dataset.value;
                urlBar.value = text;
                autocompleteValue = '';
                autocompleteRealUrl = '';
                typedBeforeAutocomplete = '';
                hideSuggestions();
                navigateToUrl(text);
                return;
            }
            // Autocomplete ghost text varsa gerçek URL'ye git
            if (autocompleteValue && urlBar.selectionStart < urlBar.value.length) {
                urlBar.value = autocompleteRealUrl || autocompleteValue;
            }
            navigate();
            hideSuggestions();
            autocompleteValue = '';
            autocompleteRealUrl = '';
            typedBeforeAutocomplete = '';
        }
    });

    urlBar.addEventListener('keydown', (e) => {
        // Delete veya Backspace — ghost text varsa sadece onu sil, typed kısmı koru
        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (autocompleteValue && urlBar.selectionStart < urlBar.value.length) {
                e.preventDefault();
                urlBar.value = typedBeforeAutocomplete;
                urlBar.setSelectionRange(typedBeforeAutocomplete.length, typedBeforeAutocomplete.length);
                autocompleteValue = '';
                autocompleteRealUrl = '';
                // suppressAutocomplete YAPMA — kullanıcı yazmaya devam edebilsin
                showSuggestions();
                return;
            }
            // Ghost text yoksa normal sil, bir sonraki input'ta autocomplete bastır
            suppressAutocomplete = true;
        }

        const items = suggestionsBox.querySelectorAll('.suggestions-item');
        const highlighted = suggestionsBox.querySelector('.suggestions-item.highlighted');
        const highlightedIndex = highlighted
            ? Array.from(items).indexOf(highlighted)
            : -1;

        // Öneri listesinde aşağı git
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (items.length === 0) return;
            if (highlighted) highlighted.classList.remove('highlighted');
            const nextIndex = (highlightedIndex + 1) % items.length;
            items[nextIndex].classList.add('highlighted');
            items[nextIndex].scrollIntoView({ block: 'nearest' });
            urlBar.value = items[nextIndex].dataset.value || urlBar.value;
            autocompleteValue = '';
            autocompleteRealUrl = '';
            return;
        }

        // Öneri listesinde yukarı git
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length === 0) return;
            if (highlighted) highlighted.classList.remove('highlighted');
            const prevIndex = highlightedIndex <= 0 ? items.length - 1 : highlightedIndex - 1;
            items[prevIndex].classList.add('highlighted');
            items[prevIndex].scrollIntoView({ block: 'nearest' });
            urlBar.value = items[prevIndex].dataset.value || urlBar.value;
            autocompleteValue = '';
            autocompleteRealUrl = '';
            return;
        }

        // Tab ile inline autocomplete'i onayla (gitme, sadece doldur)
        if (e.key === 'Tab') {
            e.preventDefault();
            if (autocompleteValue && urlBar.selectionStart < urlBar.value.length) {
                // Ghost text'i onayla, cursor sona git
                urlBar.value = autocompleteRealUrl || autocompleteValue;
                urlBar.setSelectionRange(urlBar.value.length, urlBar.value.length);
                autocompleteValue = '';
                autocompleteRealUrl = '';
                typedBeforeAutocomplete = '';
                showSuggestions();
            } else if (items.length > 0) {
                if (highlighted) highlighted.classList.remove('highlighted');
                const nextIndex = (highlightedIndex + 1) % items.length;
                items[nextIndex].classList.add('highlighted');
                items[nextIndex].scrollIntoView({ block: 'nearest' });
                urlBar.value = items[nextIndex].dataset.value || urlBar.value;
                autocompleteValue = '';
                autocompleteRealUrl = '';
            }
            return;
        }

        // Escape ile her şeyi kapat
        if (e.key === 'Escape') {
            if (autocompleteValue) {
                urlBar.value = typedBeforeAutocomplete;
                autocompleteValue = '';
                autocompleteRealUrl = '';
                typedBeforeAutocomplete = '';
            }
            hideSuggestions();
            hideContextMenu();
        }
    });

    urlBar.addEventListener('input', () => {
        applyAutocomplete();
        showSuggestions();
    });

    urlBar.addEventListener('focus', () => {
        // Tüm metni seç
        urlBar.select();
        // Sadece yazı varsa öneri göster, boşken gösterme
        if (urlBar.value.trim().length > 0) {
            showSuggestions();
        }
    });

    urlBar.addEventListener('blur', () => {
        // Kısa gecikme — suggestions'a mousedown tıklaması önce işlensin
        setTimeout(() => {
            hideSuggestions();
            // Ghost text varsa temizle, typed kısmı bırak
            if (autocompleteValue) {
                urlBar.value = typedBeforeAutocomplete;
                autocompleteValue = '';
                autocompleteRealUrl = '';
            }
        }, 150);
    });

    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideDownloadsPanel();
            hideSearchEngineDropdown();
            hideWarpTooltip();
            hideSuggestions();
            toggleMenu();
        });
    }

    if (downloadsBtn) {
        downloadsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Diğer açık panelleri kapat
            hideMenu();
            hideSearchEngineDropdown();
            hideWarpTooltip();
            hideSuggestions();
            toggleDownloadsPanel();
        });
    }

    if (downloadsBackdrop) {
        downloadsBackdrop.addEventListener('click', () => {
            hideDownloadsPanel();
        });
    }

    // Menu backdrop — tıklanınca menüyü kapat
    if (menuBackdrop) {
        menuBackdrop.addEventListener('click', () => {
            hideMenu();
        });
    }

    // Permission bubble backdrop — tıklanınca bubble'ı kapat
    const permBubbleBackdrop = document.getElementById('permissionBubbleBackdrop');
    if (permBubbleBackdrop) {
        permBubbleBackdrop.addEventListener('click', () => {
            dismissPermissionBubble();
        });
    }

    // Arama motoru seçici
    const searchEngineBtn = document.getElementById('searchEngineBtn');
    const searchEngineDropdown = document.getElementById('searchEngineDropdown');

    if (searchEngineBtn) {
        searchEngineBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideMenu();
            hideDownloadsPanel();
            hideWarpTooltip();
            toggleSearchEngineDropdown();
        });
    }

    document.querySelectorAll('.search-engine-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            setSearchEngine(item.dataset.engine);
            hideSearchEngineDropdown();
        });
    });

    // Context menu backdrop — herhangi bir yere tıklanınca kapat
    if (contextMenuBackdrop) {
        contextMenuBackdrop.addEventListener('click', () => {
            hideContextMenu();
        });
        contextMenuBackdrop.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            hideContextMenu();
        });
    }

    // Tıklama dışı alanlara basınca önerileri ve diğer panelleri gizle
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.url-bar-container')) {
            hideSuggestions();
        }
        if (!e.target.closest('.downloads-container')) {
            hideDownloadsPanel();
        }
        if (!e.target.closest('.search-engine-picker')) {
            hideSearchEngineDropdown();
        }
        if (!e.target.closest('.context-menu')) {
            hideContextMenu();
        }
        if (!e.target.closest('.warp-btn-wrap')) {
            hideWarpTooltip();
        }
        if (!e.target.closest('.tor-btn-wrap')) {
            hideTorTooltip();
        }
        if (!e.target.closest('.site-info-panel') && !e.target.closest('#siteInfoBtn')) {
            hideSiteInfoPanel();
        }
        
        // İzin isteği balonu dışına tıklandığında kapat (reddetme — sadece gizle)
        const permissionBubble = document.getElementById('permissionBubble');
        if (permissionBubble && permissionBubble.classList.contains('visible') && !e.target.closest('#permissionBubble')) {
            dismissPermissionBubble();
        }
        hideTabContextMenu();
    });

    // Sağ tıklama ile context menüyü kapat (webview dışında)
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        hideContextMenu();
    });

    backBtn.addEventListener('click', () => {
        try { if (activeWebview && typeof activeWebview.canGoBack === 'function' && activeWebview.canGoBack()) activeWebview.goBack(); } catch(_e) {}
    });
    forwardBtn.addEventListener('click', () => {
        try { if (activeWebview && typeof activeWebview.canGoForward === 'function' && activeWebview.canGoForward()) activeWebview.goForward(); } catch(_e) {}
    });
    refreshBtn.addEventListener('click', () => {
        if (activeWebview) activeWebview.reload();
    });
    homeBtn.addEventListener('click', () => navigateToUrl('about:blank'));

    // Bookmark toggle
    bookmarkToggleBtn.addEventListener('click', () => {
        const tab = tabs.find(t => t.id === activeTabId);
        if (!tab || tab.url === 'about:blank') return;
        
        loadBookmarks();
        const existingBookmark = bookmarks.find(b => b.url === tab.url);
        
        if (existingBookmark) {
            bookmarks = bookmarks.filter(b => b.id !== existingBookmark.id);
            bookmarkToggleBtn.classList.remove('bookmarked');
            bookmarkIcon.className = 'fa-regular fa-bookmark';
        } else {
            const newBookmark = {
                id: Date.now().toString(),
                url: tab.url,
                title: tab.title || tab.url,
                date: new Date().toISOString()
            };
            bookmarks.push(newBookmark);
            bookmarkToggleBtn.classList.add('bookmarked');
            bookmarkIcon.className = 'fa-solid fa-bookmark';
        }
        
        saveBookmarks();
        updateQuickBookmarks();
    });

    welcomeScreen.addEventListener('click', (e) => {
        // Ayarlar butonuna veya modal'a tıklandıysa search'i tetikleme
        if (e.target.closest('.welcome-settings-btn')) return;
        // Search wrap içine tıklandıysa kapat/aç toggle yok — sadece aç
        if (e.target.closest('.welcome-search-wrap')) return;
        // Search açıksa ve dışarıya tıklandıysa kapat
        if (welcomeSearchRevealed) {
            hideWelcomeSearch();
        } else {
            revealWelcomeSearch();
        }
    });

    welcomeSearchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    welcomeSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = welcomeSearchInput.value.trim();
            if (query) navigateToUrl(query);
        }
    });

    const minimizeBtn = document.querySelector('.minimize-btn');
    const maximizeBtn = document.querySelector('.maximize-btn');
    const closeBtn = document.querySelector('.close-btn');

    if (minimizeBtn) minimizeBtn.addEventListener('click', () => ipcRenderer.send('window-minimize'));
    if (maximizeBtn) maximizeBtn.addEventListener('click', () => ipcRenderer.send('window-maximize'));
    if (closeBtn) closeBtn.addEventListener('click', () => ipcRenderer.send('window-close'));

    // ── Ctrl + Scroll ile Zoom (nav-bar üzerindeyken) ────────────────────────
    window.addEventListener('wheel', (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        applyZoom(e.deltaY < 0 ? 'in' : 'out');
    }, { passive: false });

    // ── Klavye kısayolları ────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => handleShortcut(e));

    // webview focus'undayken kısayolları yakala (main.js'den iletilir)
    ipcRenderer.on('webview-keydown', (_event, e) => handleShortcut(e));
    // ─────────────────────────────────────────────────────────────────────────
}

// ── Klavye kısayolları (hem document hem webview'dan çağrılır) ────────────────
function handleShortcut(e) {
        // F12 — DevTools aç
        if (e.key === 'F12') {
            if (e.preventDefault) e.preventDefault();
            ipcRenderer.send('toggle-devtools');
        }
        // F11 — Tam ekran
        if (e.key === 'F11') {
            if (e.preventDefault) e.preventDefault();
            ipcRenderer.send('toggle-fullscreen');
        }
        // Ctrl+T — yeni sekme
        if (e.ctrlKey && e.key === 't') {
            if (e.preventDefault) e.preventDefault();
            createNewTab();
        }
        // Ctrl+W — aktif sekmeyi kapat
        if (e.ctrlKey && e.key === 'w') {
            if (e.preventDefault) e.preventDefault();
            if (activeTabId) closeTab(activeTabId);
        }
        // Ctrl+R / F5 — yenile
        if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
            if (e.preventDefault) e.preventDefault();
            try { if (activeWebview) activeWebview.reload(); } catch(_e) {}
        }
        // Ctrl+Shift+R — önbelleği temizleyerek yenile
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            if (e.preventDefault) e.preventDefault();
            try { if (activeWebview) activeWebview.reloadIgnoringCache(); } catch(_e) {}
        }
        // Ctrl+F — sayfada ara
        if (e.ctrlKey && e.key === 'f') {
            if (e.preventDefault) e.preventDefault();
            if (findActive) {
                if (findInput) { findInput.focus(); findInput.select(); }
            } else {
                openFindBar();
            }
        }
        // Ctrl+0 — Zoom sıfırla
        if (e.ctrlKey && e.key === '0') {
            if (e.preventDefault) e.preventDefault();
            try { if (activeWebview) activeWebview.setZoomLevel(0); } catch(_e) {}
        }
        // Ctrl+= veya Ctrl++ — yakınlaştır
        if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
            if (e.preventDefault) e.preventDefault();
            applyZoom('in');
        }
        // Ctrl+- — uzaklaştır
        if (e.ctrlKey && e.key === '-') {
            if (e.preventDefault) e.preventDefault();
            applyZoom('out');
        }
        // Ctrl+L / Alt+D / F6 — adres çubuğuna odaklan
        if ((e.ctrlKey && e.key === 'l') || (e.altKey && e.key === 'd') || e.key === 'F6') {
            if (e.preventDefault) e.preventDefault();
            urlBar.focus();
            urlBar.select();
        }
        // Ctrl+Tab — sonraki sekmeye geç
        if (e.ctrlKey && !e.shiftKey && e.key === 'Tab') {
            if (e.preventDefault) e.preventDefault();
            if (tabs.length > 1) {
                const idx = tabs.findIndex(t => t.id === activeTabId);
                const next = tabs[(idx + 1) % tabs.length];
                switchTab(next.id);
            }
        }
        // Ctrl+Shift+Tab — önceki sekmeye geç
        if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
            if (e.preventDefault) e.preventDefault();
            if (tabs.length > 1) {
                const idx = tabs.findIndex(t => t.id === activeTabId);
                const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
                switchTab(prev.id);
            }
        }
        // Ctrl+1..8 — belirli sekmeye git
        if (e.ctrlKey && !e.shiftKey && e.key >= '1' && e.key <= '8') {
            if (e.preventDefault) e.preventDefault();
            const idx = parseInt(e.key) - 1;
            if (tabs[idx]) switchTab(tabs[idx].id);
        }
        // Ctrl+9 — son sekmeye git
        if (e.ctrlKey && e.key === '9') {
            if (e.preventDefault) e.preventDefault();
            if (tabs.length > 0) switchTab(tabs[tabs.length - 1].id);
        }
        // Ctrl+Shift+T — kapatılan sekmeyi yeniden aç
        if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
            if (e.preventDefault) e.preventDefault();
            reopenLastClosedTab();
        }
        // Ctrl+D — yer işareti ekle/kaldır
        if (e.ctrlKey && e.key === 'd') {
            if (e.preventDefault) e.preventDefault();
            toggleBookmark();
        }
        // Ctrl+H — geçmiş
        if (e.ctrlKey && e.key === 'h') {
            if (e.preventDefault) e.preventDefault();
            openSpecialPage('xenixa://history');
        }
        // Ctrl+J — indirilenler
        if (e.ctrlKey && e.key === 'j') {
            if (e.preventDefault) e.preventDefault();
            openSpecialPage('xenixa://downloads');
        }
        // Ctrl+N — yeni pencere
        if (e.ctrlKey && !e.shiftKey && e.key === 'n') {
            if (e.preventDefault) e.preventDefault();
            ipcRenderer.send('open-new-window', { url: 'about:blank' });
        }
        // Alt+Left — geri
        if (e.altKey && e.key === 'ArrowLeft') {
            if (e.preventDefault) e.preventDefault();
            try { if (activeWebview && activeWebview.canGoBack()) activeWebview.goBack(); } catch(_e) {}
        }
        // Alt+Right — ileri
        if (e.altKey && e.key === 'ArrowRight') {
            if (e.preventDefault) e.preventDefault();
            try { if (activeWebview && activeWebview.canGoForward()) activeWebview.goForward(); } catch(_e) {}
        }
        // Escape — yüklemeyi durdur
        if (e.key === 'Escape' && !findActive) {
            try { if (activeWebview) activeWebview.stop(); } catch(_e) {}
        }
}

function createNewTab(initialUrl = 'about:blank') {
    if (typeof initialUrl !== 'string') {
        initialUrl = 'about:blank';
    }

    // xenixa:// özel sayfaları için mevcut sekmeyi kontrol et
    if (isSpecialPage(initialUrl)) {
        const existing = tabs.find(t => t.url === initialUrl);
        if (existing) {
            switchTab(existing.id);
            return;
        }
    }

    const newTab = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        url: initialUrl,
        title: isSpecialPage(initialUrl) ? (SPECIAL_PAGE_TITLES[initialUrl] || getAppName()) : getAppName(),
        webview: null,
        isSpecial: isSpecialPage(initialUrl),
        permissionRequests: [],
        activeDialog: null
    };

    const webview = document.createElement('webview');
    const preloadPath = 'file:///' + path.join(__dirname, 'webview-preload.js').replace(/\\/g, '/');
    if (newTab.isSpecial) {
        webview.setAttribute('nodeintegration', 'true');
        webview.setAttribute('webpreferences', 'contextIsolation=no, webSecurity=no');
    } else {
        webview.setAttribute('webpreferences', 'contextIsolation=yes, nodeIntegration=no, webSecurity=no');
        webview.setAttribute('allowpopups', '');
    }
    webview.setAttribute('preload', preloadPath);
    webview.className = 'tab-webview';
    webview.style.display = 'none';

    document.getElementById('webviewContainer').appendChild(webview);
    newTab.webview = webview;

    setupSingleWebviewEvents(newTab);

    tabs.push(newTab);
    activeTabId = newTab.id;

    switchTab(newTab.id);

    if (isSpecialPage(initialUrl)) {
        const filePath = getSpecialPagePath(initialUrl);
        if (filePath) {
            webview.src = filePath;
            hideWelcomeScreen();
            webview.style.display = 'flex';
            webview.classList.add('visible');
        }
    } else if (initialUrl !== 'about:blank') {
        navigateToUrl(initialUrl);
    } else {
        showWelcomeScreen();
        requestAnimationFrame(() => {
            urlBar.focus();
            urlBar.select();
        });
    }

    saveOpenTabsState();
    scrollTabsToEnd();
}

function navigate() {
    // Eğer autocomplete ghost text seçiliyse, gerçek URL'yi kullan
    const url = autocompleteValue && urlBar.selectionStart < urlBar.value.length
        ? (autocompleteRealUrl || autocompleteValue)
        : urlBar.value.trim();
    autocompleteValue = '';
    autocompleteRealUrl = '';
    typedBeforeAutocomplete = '';
    if (url) navigateToUrl(url);
}

function navigateToUrl(url) {
    if (!url) return;

    // xenixa:// özel sayfaları
    if (isSpecialPage(url)) {
        openSpecialPage(url);
        return;
    }

    let finalUrl = url.trim();
    const isWindowsPath = /^[a-zA-Z]:[/\\]/.test(finalUrl);
    if (isWindowsPath) {
        finalUrl = 'file:///' + finalUrl.replace(/\\/g, '/');
    }

    // Normalize other file URL formats case-insensitively and replace backslashes
    if (finalUrl.toLowerCase().startsWith('file:///')) {
        finalUrl = 'file:///' + finalUrl.slice(8).replace(/\\/g, '/');
    } else if (finalUrl.toLowerCase().startsWith('file://')) {
        finalUrl = 'file:///' + finalUrl.slice(7).replace(/\\/g, '/');
    } else if (finalUrl.toLowerCase().startsWith('file:/')) {
        finalUrl = 'file:///' + finalUrl.slice(6).replace(/\\/g, '/');
    }

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('about:') && !finalUrl.startsWith('file://')) {
        // localhost veya IP adresi → http:// ekle
        if (finalUrl === 'localhost' || finalUrl.startsWith('localhost:') ||
            finalUrl.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/) ||
            finalUrl.match(/^localhost\//) ||
            finalUrl.match(/^127\./) ||
            finalUrl.match(/^\[::1\]/) ) {
            finalUrl = 'http://' + finalUrl;
        } else if (finalUrl.endsWith('.onion') || finalUrl.includes('.onion/') || finalUrl.includes('.onion:')) {
            // .onion adresleri — http:// ile aç (Tor proxy üzerinden)
            finalUrl = 'http://' + finalUrl;
        } else if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
            finalUrl = 'https://' + finalUrl;
        } else {
            finalUrl = getSearchUrl(finalUrl);
        }
    }

    urlBar.value = finalUrl === 'about:blank' ? '' : finalUrl;

    if (activeTabId) {
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab) {
            if (finalUrl === 'about:blank') {
                resetTabToHome(tab);
            } else {
                tab.url = finalUrl;
            }
        }
    }

    if (finalUrl !== 'about:blank') {
        addToSearchHistory(url);
    }

    if (finalUrl === 'about:blank') {
        showWelcomeScreen();
        quickBookmarks.classList.add('visible');
        updateQuickBookmarks();
        if (activeWebview) {
            activeWebview.style.display = 'none';
            activeWebview.classList.remove('visible');
        }
        saveOpenTabsState();
        renderTabs();
    } else {
        hideWelcomeScreen();
        quickBookmarks.classList.remove('visible');
        if (activeWebview) {
            activeWebview.style.display = 'flex';
            activeWebview.classList.add('visible');
            activeWebview.src = finalUrl;
        }
        saveOpenTabsState();
    }
}

function tabFaviconMarkup(tab) {
    if (tab.loading) {
        return '<span class="tab-spinner"></span>';
    }
    if (isSpecialPage(tab.url)) {
        const iconMap = {
            'xenixa://history':         'fa-solid fa-clock-rotate-left',
            'xenixa://downloads':       'fa-solid fa-download',
            'xenixa://settings':        'fa-solid fa-gear',
            'xenixa://bookmarks':       'fa-solid fa-bookmark',
            'xenixa://permission-test': 'fa-solid fa-shield-halved',
        };
        const icon = iconMap[tab.url] || 'fa-solid fa-file';
        return `<i class="${icon} tab-favicon tab-favicon-icon" style="color:#a78bfa"></i>`;
    }
    if (!tab.url || tab.url === 'about:blank') {
        const customLogo = localStorage.getItem('xenixa_app_logo');
        const logoSrc = customLogo || 'assets/logo.png';
        return `<img class="tab-favicon" src="${logoSrc}" alt="" draggable="false">`;
    }
    if (tab.favicon) {
        return `<img class="tab-favicon" src="${escapeHtml(tab.favicon)}" alt="" draggable="false">`;
    }
    return '<i class="fa-solid fa-globe tab-favicon tab-favicon-icon"></i>';
}

function scrollTabsToEnd() {
    // Sekme genişliklerini güncelle
    calculateTabWidths();
}

function renderTabs() {
    tabsContainer.innerHTML = '';

    tabs.forEach(tab => {
        const tabEl = document.createElement('button');
        tabEl.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
        tabEl.dataset.tabId = tab.id;

        const audioBtn = (tab.audible || tab.muted)
            ? `<span class="tab-audio" data-tab-id="${tab.id}" title="${tab.muted ? 'Sesi aç' : 'Sesi kapat'}">
                   <i class="${tab.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high'}"></i>
               </span>`
            : '';

        tabEl.innerHTML = `
            ${tabFaviconMarkup(tab)}
            <span class="tab-title" title="${escapeHtml(tab.url === 'about:blank' ? getAppName() : (tab.title || getAppName()))}">${escapeHtml(tab.url === 'about:blank' ? getAppName() : (tab.title || getAppName()))}</span>
            ${audioBtn}
            <span class="tab-close" data-tab-id="${tab.id}" title="Kapat">
                <i class="fa-solid fa-xmark"></i>
            </span>
        `;

        tabEl.draggable = true;

        tabEl.addEventListener('click', (e) => {
            if (!e.target.closest('.tab-close') && !e.target.closest('.tab-audio')) {
                switchTab(tab.id);
            }
        });

        tabEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideTabContextMenu();
            showTabContextMenu(e.clientX, e.clientY, tab.id);
        });

        // ── Orta tuş: tek tıkla kapat, basılı tutunca hepsini sırayla kapat ──
        tabEl.addEventListener('mousedown', (e) => {
            if (e.button !== 1) return; // sadece orta tuş
            e.preventDefault();
            e.stopPropagation();

            let holdTimer = null;
            let closeInterval = null;
            let didHold = false;

            // 500ms basılı tutulursa "hold" moduna geç
            holdTimer = setTimeout(() => {
                didHold = true;
                // Tüm sekmeleri soldan sağa 350ms aralıklarla kapat
                const tabIds = tabs.map(t => t.id);
                let idx = 0;
                closeInterval = setInterval(() => {
                    if (idx >= tabIds.length) {
                        clearInterval(closeInterval);
                        return;
                    }
                    const idToClose = tabIds[idx];
                    if (tabs.find(t => t.id === idToClose)) {
                        closeTab(idToClose);
                    }
                    idx++;
                }, 350);
            }, 500);

            const onMouseUp = () => {
                clearTimeout(holdTimer);
                if (!didHold) {
                    // Kısa tıklama — sadece bu sekmeyi kapat
                    closeTab(tab.id);
                } else {
                    clearInterval(closeInterval);
                }
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mouseup', onMouseUp);
        });

        tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tab.id);
        });

        const audioBtnEl = tabEl.querySelector('.tab-audio');
        if (audioBtnEl) {
            audioBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const t = tabs.find(t => t.id === tab.id);
                if (!t || !t.webview) return;
                t.muted = !t.muted;
                t.webview.setAudioMuted(t.muted);
                renderTabs();
            });
        }

        // Tab Sürükle & Bırak Dinleyicileri
        tabEl.addEventListener('dragstart', (e) => {
            tabEl.classList.add('dragging');
            e.dataTransfer.setData('text/plain', String(tab.id));
            e.dataTransfer.effectAllowed = 'move';
        });

        tabEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const rect = tabEl.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            if (e.clientX < midpoint) {
                tabEl.classList.add('drag-over-left');
                tabEl.classList.remove('drag-over-right');
            } else {
                tabEl.classList.add('drag-over-right');
                tabEl.classList.remove('drag-over-left');
            }
        });

        tabEl.addEventListener('dragleave', () => {
            tabEl.classList.remove('drag-over-left', 'drag-over-right');
        });

        tabEl.addEventListener('drop', (e) => {
            e.preventDefault();
            tabEl.classList.remove('drag-over-left', 'drag-over-right');

            const draggedIdStr = e.dataTransfer.getData('text/plain');
            if (!draggedIdStr) return;
            const draggedId = isNaN(draggedIdStr) ? draggedIdStr : Number(draggedIdStr);
            if (draggedId === tab.id) return;

            const draggedIndex = tabs.findIndex(t => t.id === draggedId);
            const targetIndex = tabs.findIndex(t => t.id === tab.id);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                const rect = tabEl.getBoundingClientRect();
                const midpoint = rect.left + rect.width / 2;
                let insertIndex = targetIndex;

                if (e.clientX > midpoint && draggedIndex > targetIndex) {
                    insertIndex = targetIndex + 1;
                } else if (e.clientX < midpoint && draggedIndex < targetIndex) {
                    insertIndex = targetIndex;
                }

                const [draggedTab] = tabs.splice(draggedIndex, 1);
                tabs.splice(insertIndex, 0, draggedTab);

                saveOpenTabsState();
                renderTabs();
            }
        });

        tabEl.addEventListener('dragend', (e) => {
            tabEl.classList.remove('dragging');
            document.querySelectorAll('.tab').forEach(el => {
                el.classList.remove('drag-over-left', 'drag-over-right');
            });

            // Ekran dışı pencere tespiti
            const isOutside = e.clientX < 0 || e.clientY < 0 || e.clientX > window.innerWidth || e.clientY > window.innerHeight;
            if (isOutside) {
                if (tabs.length > 1) {
                    popOutTab(tab.id, e.screenX, e.screenY);
                }
            }
        });

        tabsContainer.appendChild(tabEl);
    });

    calculateTabWidths();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ── Sekme genişliği hesaplama ─────────────────────────────────────────────────
const TAB_MAX_W = 220;
const TAB_MIN_W = 28;

function calculateTabWidths() {
    requestAnimationFrame(() => {
        const container = document.getElementById('tabsContainer');
        const tabsScrollEl = document.getElementById('tabsScroll');
        if (!container || !tabsScrollEl) return;

        const tabEls = Array.from(container.querySelectorAll('.tab:not(.tab-closing)'));
        if (tabEls.length === 0) return;

        // tabs-scroll'un genişliği = sekmeler için kullanılabilir alan
        // + butonu artık tabs-scroll dışında (tab-strip içinde), bu yüzden direkt kullanabiliriz
        const available = tabsScrollEl.offsetWidth;
        if (available <= 0) return;

        // Her sekme için genişlik: eşit bölüştür, min/max sınırla
        // margin: her sekme 2px sol + 2px sağ = 4px toplam
        const marginPerTab = 4;
        const tabW = Math.max(TAB_MIN_W, Math.min(TAB_MAX_W,
            Math.floor((available - marginPerTab * tabEls.length) / tabEls.length)
        ));

        // tabs-container genişliğini tam olarak sabitle
        container.style.width = ((tabW + marginPerTab) * tabEls.length) + 'px';

        // 10+ sekmede aktif sekme icon-only moduna geçer
        const iconOnly = tabEls.length >= 10;

        tabEls.forEach(tabEl => {
            tabEl.style.width = tabW + 'px';
            tabEl.classList.toggle('tab-narrow', tabW < 80);
            tabEl.classList.toggle('tab-very-narrow', tabW < 40);
            tabEl.classList.toggle('tab-icon-only', iconOnly && tabEl.classList.contains('active'));
        });
    });
}

// Pencere/container boyutu değişince yeniden hesapla
const tabResizeObserver = new ResizeObserver(() => calculateTabWidths());
tabResizeObserver.observe(document.getElementById('tabsScroll') || document.body);

// ── Özel Sayfalar (xenixa://) ─────────────────────────────────────────────────

function openSpecialPage(xenixaUrl) {
    // Mevcut sekmede zaten bu sayfa açıksa güncel veriyle yenile
    const existing = tabs.find(t => t.url === xenixaUrl);
    if (existing) {
        // Önce switch yap, switchTab içinde src güncellenecek
        switchTab(existing.id);
        return;
    }
    // Yeni sekme aç
    createNewTab(xenixaUrl);
}

function updateNavButtons() {
    if (!backBtn || !forwardBtn) return;
    try {
        const canBack = activeWebview && typeof activeWebview.canGoBack === 'function'
            ? activeWebview.canGoBack() : false;
        const canForward = activeWebview && typeof activeWebview.canGoForward === 'function'
            ? activeWebview.canGoForward() : false;
        backBtn.disabled = !canBack;
        forwardBtn.disabled = !canForward;
    } catch (_e) {
        backBtn.disabled = true;
        forwardBtn.disabled = true;
    }
}

function updateWindowTitle(tab) {
    const appName = getAppName();
    if (!tab || tab.url === 'about:blank') {
        document.title = appName;
    } else if (isSpecialPage(tab.url)) {
        document.title = `${appName} — ${SPECIAL_PAGE_TITLES[tab.url] || 'Sayfa'}`;
    } else {
        try {
            const pageTitle = tab.title && tab.title !== tab.url ? tab.title : new URL(tab.url).hostname;
            document.title = `${appName} — ${pageTitle}`;
        } catch (_e) {
            document.title = appName;
        }
    }
}

function switchTab(tabId) {
    activeTabId = tabId;
    const tab = tabs.find(t => t.id === tabId);

    // Tüm webview'ları gizle
    tabs.forEach(t => {
        if (t.webview) {
            t.webview.style.display = 'none';
            t.webview.classList.remove('visible');
        }
    });

    if (tab) {
        activeWebview = tab.webview;
        urlBar.value = (tab.url === 'about:blank' || isSpecialPage(tab.url)) ? '' : tab.url;

        if (tab.url === 'about:blank') {
            showWelcomeScreen();
            quickBookmarks.classList.add('visible');
            updateQuickBookmarks();
            requestAnimationFrame(() => { urlBar.focus(); });
        } else if (isSpecialPage(tab.url)) {
            // Özel sayfa — welcome screen'i gizle, webview'ı göster
            welcomeScreen.style.display = 'none';
            if (activeWebview) {
                activeWebview.style.display = 'flex';
                activeWebview.classList.add('visible');
                // Sadece webview henüz yüklenmemişse src'yi set et
                const currentSrc = activeWebview.src || '';
                if (!currentSrc || currentSrc === 'about:blank') {
                    const filePath = getSpecialPagePath(tab.url);
                    if (filePath) activeWebview.src = filePath;
                }
            }
            document.title = `Xenixa — ${SPECIAL_PAGE_TITLES[tab.url] || 'Sayfa'}`;
        } else {
            hideWelcomeScreen();
            quickBookmarks.classList.remove('visible');
            if (activeWebview) {
                activeWebview.style.display = 'flex';
                activeWebview.classList.add('visible');
                // Sadece webview henüz yüklenmemişse src'yi set et
                // (src boşsa veya about:blank ise) — aksi halde sayfa yeniden yüklenir
                const currentSrc = activeWebview.src || '';
                if (!currentSrc || currentSrc === 'about:blank') {
                    activeWebview.src = tab.url;
                }
                // Sekme zoom faktörünü geri yükle
                if (tab.zoomFactor !== undefined) {
                    activeWebview.setZoomFactor(tab.zoomFactor);
                }
            }
        }
    } else {
        activeWebview = null;
    }

    updateWindowTitle(tab);
    updateNavButtons();
    updateSecurityIcon(tab ? tab.url : '');
    updateBookmarkButton();
    // Sekme değişince find bar'ı kapat
    if (findActive) closeFindBar();
    updateDialogUI();
    updatePermissionUI();
    saveOpenTabsState();
    renderTabs();
}

function closeTab(tabId) {
    const tabEl = tabsContainer.querySelector(`.tab[data-tab-id="${tabId}"]`);

    if (tabEl && !tabEl.classList.contains('tab-closing')) {
        // Mevcut genişliği sabitle, sonra 0'a animate et
        const currentWidth = tabEl.getBoundingClientRect().width;
        tabEl.style.width = currentWidth + 'px';
        tabEl.style.minWidth = '0';
        tabEl.style.maxWidth = currentWidth + 'px';
        tabEl.style.flex = 'none';

        // Reflow tetikle
        tabEl.getBoundingClientRect();

        requestAnimationFrame(() => {
            tabEl.classList.add('tab-closing');
            setTimeout(() => _closeTabImmediate(tabId), 300);
        });
    } else {
        _closeTabImmediate(tabId);
    }
}

function _closeTabImmediate(tabId) {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = tabs[tabIndex];
    cleanupTabState(tab);
    // Kapatılan sekmeyi kaydet (yeniden aç için) — özel sayfaları kaydetme
    if (tab.url && tab.url !== 'about:blank' && !isSpecialPage(tab.url)) {
        lastClosedTab = { url: tab.url, title: tab.title };
    }

    if (tab.webview) {
        tab.webview.remove();
    }

    tabs.splice(tabIndex, 1);

    if (activeTabId === tabId) {
        if (tabs.length > 0) {
            activeTabId = tabs[tabs.length - 1].id;
            switchTab(activeTabId);
        } else {
            activeTabId = null;
            createNewTab();
        }
    } else {
        renderTabs();
    }
    saveOpenTabsState();
}

function popOutTab(tabId, screenX, screenY) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    ipcRenderer.send('open-new-window', {
        url: tab.url,
        x: screenX,
        y: screenY
    });

    closeTab(tabId);
}

// Arama Önerileri Mantığı
function showSuggestions() {
    if (!suggestionsBox) return;
    const query = urlBar.value.trim().toLowerCase();
    suggestionsBox.innerHTML = '';

    // Boş input'ta öneri gösterme
    if (query.length === 0) {
        suggestionsBox.classList.remove('visible');
        return;
    }

    const rawQuery = urlBar.value.trim();

    // ── Ziyaret sayacından eşleşen URL'leri bul, count'a göre sırala ──
    const visitMatches = Object.entries(siteVisitCounts)
        .filter(([url]) => {
            if (isSpecialPage(url)) return false; // xenixa:// sayfalarını gizle
            const bare = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '');
            return url.toLowerCase().includes(query) || bare.includes(query);
        })
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // ── searchHistory'den ek eşleşmeler (URL'lerde olmayan) ──
    const visitUrls = new Set(visitMatches.map(([url]) => url));
    const historyMatches = searchHistory
        .filter(q => q.toLowerCase().includes(query) && !visitUrls.has(q) && !q.startsWith('xenixa://'))
        .slice(0, Math.max(0, 5 - visitMatches.length));

    // ── Arama motoru seçeneği (her zaman ilk) ──
    const engineName = (SEARCH_ENGINES[currentEngine] || SEARCH_ENGINES.google).name;
    const searchEl = document.createElement('div');
    searchEl.className = 'suggestions-item';
    searchEl.dataset.value = rawQuery;
    searchEl.innerHTML = `
        <i class="fa-solid fa-magnifying-glass"></i>
        <span class="suggestion-text">${escapeHtml(rawQuery)}</span>
        <span class="suggestion-type">${escapeHtml(engineName)}</span>
    `;
    searchEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        navigateToUrl(rawQuery);
        hideSuggestions();
    });
    suggestionsBox.appendChild(searchEl);

    // ── Ziyaret edilen siteler (count ile) ──
    visitMatches.forEach(([url, count]) => {
        // visitedTabs'tan başlık bul
        const tabEntry = visitedTabs.find(t => t.url === url);
        const displayTitle = tabEntry ? tabEntry.title : url;
        const favicon = tabEntry && tabEntry.favicon
            ? `<img src="${escapeHtml(tabEntry.favicon)}" class="suggestion-favicon" alt="">`
            : '<i class="fa-solid fa-globe"></i>';

        const itemEl = document.createElement('div');
        itemEl.className = 'suggestions-item';
        itemEl.dataset.value = url;
        itemEl.innerHTML = `
            ${favicon}
            <span class="suggestion-text">${escapeHtml(displayTitle !== url ? displayTitle : url)}</span>
            <span class="suggestion-count">${count}</span>
        `;
        itemEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            urlBar.value = url;
            navigateToUrl(url);
            hideSuggestions();
        });
        suggestionsBox.appendChild(itemEl);
    });

    // ── searchHistory eşleşmeleri ──
    historyMatches.forEach(match => {
        const isUrl = match.startsWith('http://') || match.startsWith('https://') || match.includes('.');
        const iconClass = isUrl ? 'fa-solid fa-globe' : 'fa-solid fa-clock-rotate-left';
        const typeText = isUrl ? 'Bağlantı' : 'Geçmiş';

        const itemEl = document.createElement('div');
        itemEl.className = 'suggestions-item';
        itemEl.dataset.value = match;
        itemEl.innerHTML = `
            <i class="${iconClass}"></i>
            <span class="suggestion-text">${escapeHtml(match)}</span>
            <span class="suggestion-type">${typeText}</span>
        `;
        itemEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            urlBar.value = match;
            navigateToUrl(match);
            hideSuggestions();
        });
        suggestionsBox.appendChild(itemEl);
    });

    if (suggestionsBox.children.length > 0) {
        suggestionsBox.classList.add('visible');
    } else {
        suggestionsBox.classList.remove('visible');
    }
}

function hideSuggestions() {
    if (suggestionsBox) suggestionsBox.classList.remove('visible');
}

// 3 Nokta Menü Kontrolleri
function toggleMenu() {
    if (!menuDropdown) return;
    if (menuDropdown.classList.contains('visible')) {
        hideMenu();
    } else {
        showMenu();
    }
}

function showMenu() {
    renderMenuDropdown();
    if (menuDropdown) menuDropdown.classList.add('visible');
    if (menuBackdrop) menuBackdrop.classList.add('visible');
}

function hideMenu() {
    if (menuDropdown) menuDropdown.classList.remove('visible');
    if (menuBackdrop) menuBackdrop.classList.remove('visible');
}

function renderMenuDropdown() {
    if (!menuDropdown) return;
    menuDropdown.innerHTML = '';

    // ── Grup 1: Yeni sekme / pencere ──────────────────────────────────────────
    const group1 = [
        {
            icon: 'fa-solid fa-plus',
            label: 'Yeni sekme',
            shortcut: 'Ctrl+T',
            action: () => createNewTab()
        },
        {
            icon: 'fa-solid fa-window-maximize',
            label: 'Yeni pencere',
            shortcut: 'Ctrl+N',
            action: () => ipcRenderer.send('open-new-window', { url: 'about:blank' })
        },
    ];

    // ── Grup 2: Geçmiş, yer işaretleri, indirilenler ──────────────────────────
    const group2 = [
        {
            icon: 'fa-solid fa-clock-rotate-left',
            label: 'Geçmiş',
            action: () => openSpecialPage('xenixa://history')
        },
        {
            icon: 'fa-solid fa-bookmark',
            label: 'Yer işaretleri ve listeler',
            action: () => openSpecialPage('xenixa://bookmarks')
        },
        {
            icon: 'fa-solid fa-circle-down',
            label: 'İndirilenler',
            shortcut: 'Ctrl+J',
            action: () => openSpecialPage('xenixa://downloads')
        },
        {
            icon: 'fa-solid fa-puzzle-piece',
            label: 'Uzantılar',
            action: null
        },
        {
            icon: 'fa-solid fa-trash-can',
            label: 'Tarama verilerini sil',
            shortcut: 'Ctrl+Shift+Del',
            action: () => {
                if (confirm('Tüm tarama geçmişi, ziyaret sayıları ve arama geçmişi silinecek. Devam edilsin mi?')) {
                    visitedTabs = [];
                    siteVisitCounts = {};
                    searchHistory = [];
                    localStorage.removeItem('xenixa_visited_tabs');
                    localStorage.removeItem('xenixa_visit_counts');
                    localStorage.removeItem('xenixa_history');
                }
            }
        },
    ];

    // ── Grup 3: Yakınlaştır ────────────────────────────────────────────────────
    const tab = tabs.find(t => t.id === activeTabId);
    const zoomPct = tab && tab.zoomFactor ? Math.round(tab.zoomFactor * 100) : 100;

    // ── Grup 4: Yazdır, bul, kaydet, araçlar ──────────────────────────────────
    const group4 = [
        {
            icon: 'fa-solid fa-print',
            label: 'Yazdır...',
            shortcut: 'Ctrl+P',
            action: () => activeWebview && activeWebview.print()
        },
        {
            icon: 'fa-solid fa-magnifying-glass',
            label: 'Bul ve düzenle',
            action: null
        },
        {
            icon: 'fa-solid fa-floppy-disk',
            label: 'Kaydet ve paylaş',
            action: null
        },
        {
            icon: 'fa-solid fa-wrench',
            label: 'Diğer araçlar',
            action: null
        },
    ];

    // ── Grup 5: Yardım, ayarlar, çıkış ───────────────────────────────────────
    const group5 = [
        {
            icon: 'fa-solid fa-circle-question',
            label: 'Yardım',
            action: null
        },
        {
            icon: 'fa-solid fa-gear',
            label: 'Ayarlar',
            action: () => openSpecialPage('xenixa://settings')
        },
        {
            icon: 'fa-solid fa-shield-halved',
            label: 'İzin Testi',
            action: () => openSpecialPage('xenixa://permission-test')
        },
        {
            icon: 'fa-solid fa-xmark',
            label: 'Çıkış',
            action: () => ipcRenderer.send('window-close')
        },
    ];

    function addItems(items) {
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'menu-item' + (item.action === null ? ' menu-item-disabled' : '');
            el.innerHTML = `
                <i class="${item.icon}"></i>
                <div class="menu-item-content">
                    <span class="menu-item-text">${item.label}</span>
                </div>
                ${item.shortcut ? `<span class="menu-item-shortcut">${item.shortcut}</span>` : ''}
            `;
            if (item.action) {
                el.addEventListener('click', () => {
                    hideMenu();
                    item.action();
                });
            }
            menuDropdown.appendChild(el);
        });
    }

    function addDivider() {
        const div = document.createElement('div');
        div.className = 'menu-divider';
        menuDropdown.appendChild(div);
    }

    addItems(group1);
    addDivider();
    addItems(group2);
    addDivider();

    // Yakınlaştır satırı (özel)
    const zoomRow = document.createElement('div');
    zoomRow.className = 'menu-item menu-zoom-row';
    zoomRow.innerHTML = `
        <i class="fa-solid fa-magnifying-glass-plus"></i>
        <div class="menu-item-content">
            <span class="menu-item-text">Yakınlaştır</span>
        </div>
        <div class="menu-zoom-controls">
            <button class="menu-zoom-btn" id="menuZoomOut" title="Uzaklaştır">−</button>
            <span class="menu-zoom-level" id="menuZoomLevel">${zoomPct}%</span>
            <button class="menu-zoom-btn" id="menuZoomIn" title="Yakınlaştır">+</button>
            <button class="menu-zoom-btn menu-zoom-fullscreen" id="menuFullscreen" title="Tam ekran">
                <i class="fa-solid fa-expand"></i>
            </button>
        </div>
    `;
    menuDropdown.appendChild(zoomRow);

    // Zoom butonları
    zoomRow.querySelector('#menuZoomOut').addEventListener('click', (e) => {
        e.stopPropagation();
        applyZoom('out');
        const t = tabs.find(t => t.id === activeTabId);
        const pct = t && t.zoomFactor ? Math.round(t.zoomFactor * 100) : 100;
        const lvl = menuDropdown.querySelector('#menuZoomLevel');
        if (lvl) lvl.textContent = pct + '%';
    });
    zoomRow.querySelector('#menuZoomIn').addEventListener('click', (e) => {
        e.stopPropagation();
        applyZoom('in');
        const t = tabs.find(t => t.id === activeTabId);
        const pct = t && t.zoomFactor ? Math.round(t.zoomFactor * 100) : 100;
        const lvl = menuDropdown.querySelector('#menuZoomLevel');
        if (lvl) lvl.textContent = pct + '%';
    });
    zoomRow.querySelector('#menuFullscreen').addEventListener('click', (e) => {
        e.stopPropagation();
        hideMenu();
        ipcRenderer.send('window-maximize');
    });

    addDivider();
    addItems(group4);
    addDivider();
    addItems(group5);
}

// IPC: main process'ten gelen webview context-menu eventi (fallback)
ipcRenderer.on('webview-context-menu', (event, params) => {
    showContextMenu(params.x, params.y, params);
});

// IPC: webview'a tıklandığında tüm açık panelleri kapat
ipcRenderer.on('webview-clicked', () => {
    hideContextMenu();
    hideSuggestions();
    hideMenu();
    hideDownloadsPanel();
    hideSearchEngineDropdown();
    hideTabContextMenu();
    hideWarpTooltip();
    dismissPermissionBubble();
});

// IPC: webview içinden Ctrl+Scroll zoom
ipcRenderer.on('webview-zoom', (event, direction) => {
    applyZoom(direction);
});

// IPC: Özel sayfa — geçmiş öğesi sil
ipcRenderer.on('history-delete-item', (event, { url }) => {
    visitedTabs = visitedTabs.filter(t => t.url !== url);
    delete siteVisitCounts[url];
    localStorage.setItem('xenixa_visited_tabs', JSON.stringify(visitedTabs));
    localStorage.setItem('xenixa_visit_counts', JSON.stringify(siteVisitCounts));
});

// IPC: Özel sayfa — geçmişi temizle
ipcRenderer.on('history-clear-all', () => {
    visitedTabs = [];
    siteVisitCounts = {};
    searchHistory = [];
    localStorage.removeItem('xenixa_visited_tabs');
    localStorage.removeItem('xenixa_visit_counts');
    localStorage.removeItem('xenixa_history');
});

// IPC: Özel sayfa — indirme öğesi sil
ipcRenderer.on('downloads-delete-item', (event, id) => {
    try {
        let history = JSON.parse(localStorage.getItem('xenixa_downloads_history') || '[]');
        history = history.filter(d => d.id !== id);
        localStorage.setItem('xenixa_downloads_history', JSON.stringify(history));
    } catch (_e) {}
});

// IPC: Özel sayfa — indirme geçmişini temizle
ipcRenderer.on('downloads-clear-all', () => {
    localStorage.removeItem('xenixa_downloads_history');
});

// IPC: Özel sayfa — URL'yi aktif sekmede aç
ipcRenderer.on('open-url-in-active-tab', (event, url) => {
    navigateToUrl(url);
});

// IPC: İndirme event'leri
ipcRenderer.on('download-started', (event, dl) => {
    // Aynı ID'li indirme zaten varsa ekleme (çift kayıt önleme)
    if (downloads.find(d => d.id === dl.id)) return;
    downloads.unshift({ ...dl, receivedBytes: 0, speed: 0, state: 'progressing', isPaused: false });
    updateDownloadsBadge();
    // Panel otomatik aç
    if (downloadsPanel) {
        renderDownloadsPanel();
        downloadsPanel.classList.add('visible');
        if (downloadsBackdrop) downloadsBackdrop.classList.add('visible');
    }
});

ipcRenderer.on('download-progress', (event, { id, receivedBytes, totalBytes, speed, isPaused }) => {
    const dl = downloads.find(d => d.id === id);
    if (dl) {
        dl.receivedBytes = receivedBytes;
        dl.totalBytes = totalBytes || dl.totalBytes;
        dl.speed = speed;
        dl.isPaused = isPaused;
        if (downloadsPanel && downloadsPanel.classList.contains('visible')) renderDownloadsPanel();
    }
});

ipcRenderer.on('download-done', (event, { id, state, savePath, fileIcon }) => {
    const dl = downloads.find(d => d.id === id);
    if (dl) {
        dl.state = state;
        dl.savePath = savePath;
        dl.speed = 0;
        if (fileIcon) dl.fileIcon = fileIcon;
        if (state === 'completed') dl.receivedBytes = dl.totalBytes;

        // Kalıcı indirme geçmişine kaydet
        if (state === 'completed') {
            try {
                const history = JSON.parse(localStorage.getItem('xenixa_downloads_history') || '[]');
                // Aynı ID varsa güncelle, yoksa ekle
                const existingIdx = history.findIndex(h => h.id === id);
                const entry = {
                    id: dl.id,
                    filename: dl.filename,
                    totalBytes: dl.totalBytes,
                    savePath: dl.savePath,
                    fileIcon: dl.fileIcon || null,
                    state: 'completed',
                    date: Date.now(),
                };
                if (existingIdx >= 0) {
                    history[existingIdx] = entry;
                } else {
                    history.unshift(entry);
                }
                // Max 200 kayıt tut
                if (history.length > 200) history.splice(200);
                localStorage.setItem('xenixa_downloads_history', JSON.stringify(history));
            } catch (_e) {}
        }
    }
    updateDownloadsBadge();
    if (downloadsPanel && downloadsPanel.classList.contains('visible')) renderDownloadsPanel();
});

ipcRenderer.on('tab-created', (event, { id, tabs: newTabs }) => {
    tabs = newTabs;
    activeTabId = id;
    renderTabs();
});

ipcRenderer.on('tab-closed', (event, { tabs: newTabs }) => {
    tabs = newTabs;
    if (activeTabId && !tabs.find(t => t.id === activeTabId)) {
        activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
    }
    renderTabs();
});

ipcRenderer.on('tab-switched', (event, tab) => {
    const tabIndex = tabs.findIndex(t => t.id === tab.id);
    if (tabIndex !== -1) tabs[tabIndex] = tab;
    switchTab(tab.id);
});

ipcRenderer.on('navigated', (event, { tabId, url }) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.url = url;
        tab.title = url;
        renderTabs();
        hideWelcomeScreen();
    }
});

ipcRenderer.on('tabs-list', (event, tabsList) => {
    tabs = tabsList;
    if (tabs.length > 0) {
        if (!activeTabId) switchTab(tabs[0].id);
    } else if (!activeTabId) {
        createNewTab();
    } else {
        renderTabs();
    }
});

init();

// --- Pinned Sites ---
const pinToggleBtn = document.getElementById('pinToggleBtn');
const pinIcon = document.getElementById('pinIcon');
const pinnedSitesContainer = document.getElementById('pinnedSites');
let pinnedSites = [];

function loadPinnedSites() {
    try { pinnedSites = JSON.parse(localStorage.getItem('xenixa_pinned_sites') || '[]'); }
    catch(e) { pinnedSites = []; }
}

function savePinnedSites() {
    localStorage.setItem('xenixa_pinned_sites', JSON.stringify(pinnedSites));
}

function renderPinnedSites() {
    if (!pinnedSitesContainer) return;
    loadPinnedSites();
    pinnedSitesContainer.innerHTML = '';
    pinnedSites.forEach(site => {
        const el = document.createElement('div');
        el.className = 'pinned-site';
        el.innerHTML = `<div class="pinned-icon-container"><div class="pinned-icon-wrap"><img src="https://www.google.com/s2/favicons?domain=" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'"><i class="fa-solid fa-globe" style="display:none;"></i></div><button class="pinned-site-del" title="Kald�r"><i class="fa-solid fa-xmark"></i></button></div><div class="pinned-title"></div>`;
        el.addEventListener('click', (e) => {
            if(e.target.closest('.pinned-site-del')) return;
            navigateToUrl(site.url);
        });
        el.querySelector('.pinned-site-del').addEventListener('click', (e) => {
            e.stopPropagation();
            pinnedSites = pinnedSites.filter(s => s.url !== site.url);
            savePinnedSites();
            renderPinnedSites();
            updatePinIcon();
        });
        pinnedSitesContainer.appendChild(el);
    });
}

function updatePinIcon() {
    if (!pinToggleBtn || !pinIcon) return;
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.url === 'about:blank' || isSpecialPage(tab.url)) {
        pinToggleBtn.classList.remove('bookmarked');
        pinIcon.className = 'fa-regular fa-star';
        pinToggleBtn.disabled = true;
        return;
    }
    pinToggleBtn.disabled = false;
    loadPinnedSites();
    const isPinned = pinnedSites.some(s => s.url === tab.url);
    if (isPinned) {
        pinToggleBtn.classList.add('bookmarked');
        pinIcon.className = 'fa-solid fa-star';
    } else {
        pinToggleBtn.classList.remove('bookmarked');
        pinIcon.className = 'fa-regular fa-star';
    }
}

pinToggleBtn.addEventListener('click', () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.url === 'about:blank' || isSpecialPage(tab.url)) return;
    loadPinnedSites();
    const existing = pinnedSites.find(s => s.url === tab.url);
    if (existing) {
        pinnedSites = pinnedSites.filter(s => s.url !== tab.url);
    } else {
        if (pinnedSites.length >= 4) {
            alert('En fazla 4 site sabitleyebilirsiniz!');
            return;
        }
        pinnedSites.push({ url: tab.url, title: tab.title || tab.url });
    }
    savePinnedSites();
    updatePinIcon();
    renderPinnedSites();
});

// ── Tab-specific Dialog & Permission Helpers ─────────────────────────────

function findTabByWebContentsId(webContentsId) {
    return tabs.find(t => {
        if (!t.webview) return false;
        try {
            return t.webview.getWebContentsId() === webContentsId;
        } catch (err) {
            return false;
        }
    });
}

function cleanupTabState(tab) {
    if (tab.activeDialog && tab.activeDialog.controller) {
        try {
            tab.activeDialog.controller.cancel();
        } catch (err) {
            console.error("Failed to cancel dialog on close:", err);
        }
        tab.activeDialog = null;
    }
    if (tab.permissionRequests && tab.permissionRequests.length > 0) {
        tab.permissionRequests.forEach(req => {
            try {
                ipcRenderer.send('permission-response', { id: req.id, allowed: false });
            } catch (err) {
                console.error("Failed to deny permission on close:", err);
            }
        });
        tab.permissionRequests = [];
    }
}

const originalAlert = window.alert;

function showSystemDialog(type, message, defaultValue = '') {
    return new Promise((resolve) => {
        activeSystemDialog = {
            type,
            url: 'xenixa://browser',
            message,
            defaultValue,
            controller: {
                accept: (value) => {
                    resolve(value !== undefined ? value : true);
                },
                cancel: () => {
                    resolve(type === 'confirm' ? false : null);
                }
            }
        };
        updateDialogUI();
    });
}

window.alert = function(message) {
    showSystemDialog('alert', message);
};
window.confirm = function(message) {
    return showSystemDialog('confirm', message);
};
window.prompt = function(message, defaultValue) {
    return showSystemDialog('prompt', message, defaultValue);
};

function updateDialogUI() {
    try {
        const backdrop = document.getElementById('customDialogBackdrop');
        const dialog = document.getElementById('customDialog');
        if (!dialog || !backdrop) return;

        let currentDialog = null;
        let currentTab = null;

        if (activeSystemDialog) {
            currentDialog = activeSystemDialog;
        } else {
            currentTab = tabs.find(t => t.id === activeTabId);
            if (currentTab && currentTab.activeDialog) {
                currentDialog = currentTab.activeDialog;
            }
        }

        if (!currentDialog) {
            backdrop.classList.remove('visible');
            dialog.classList.remove('visible');
            return;
        }

        const { type, url, message, defaultValue, controller } = currentDialog;
        const iconWrap = document.getElementById('customDialogIconWrap');
        const icon = document.getElementById('customDialogIcon');
        const siteEl = document.getElementById('customDialogSite');
        const msgEl = document.getElementById('customDialogMessage');
        const inputEl = document.getElementById('customDialogInput');
        const cancelBtn = document.getElementById('customDialogCancel');
        const okBtn = document.getElementById('customDialogOk');
        const closeBtn = document.getElementById('customDialogClose');

        let siteName = 'SİTE';
        try {
            siteName = new URL(url).hostname.toUpperCase();
        } catch(_e) {
            siteName = url ? url.toUpperCase() : 'BİLİNMEYEN SİTE';
        }
        siteEl.textContent = siteName;
        msgEl.textContent = message;

        iconWrap.className = 'custom-dialog-icon-wrap';
        icon.className = 'fa-solid';
        inputEl.style.display = 'none';
        cancelBtn.style.display = 'none';

        if (type === 'alert') {
            iconWrap.classList.add('type-alert');
            icon.classList.add('fa-circle-exclamation');
            okBtn.textContent = 'Tamam';
        } else if (type === 'confirm') {
            iconWrap.classList.add('type-confirm');
            icon.classList.add('fa-circle-question');
            cancelBtn.style.display = 'block';
            cancelBtn.textContent = 'İptal';
            okBtn.textContent = 'Onayla';
        } else if (type === 'prompt') {
            iconWrap.classList.add('type-prompt');
            icon.classList.add('fa-pen-to-square');
            inputEl.style.display = 'block';
            inputEl.value = defaultValue || '';
            cancelBtn.style.display = 'block';
            cancelBtn.textContent = 'İptal';
            okBtn.textContent = 'Gönder';
        }

        // Clone buttons and backdrop to clear previous event listeners
        const newOkBtn = okBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newInputEl = inputEl.cloneNode(true);
        const newCloseBtn = closeBtn ? closeBtn.cloneNode(true) : null;
        const newBackdrop = backdrop.cloneNode(true);

        okBtn.replaceWith(newOkBtn);
        cancelBtn.replaceWith(newCancelBtn);
        inputEl.replaceWith(newInputEl);
        if (closeBtn && newCloseBtn) {
            closeBtn.replaceWith(newCloseBtn);
        }
        backdrop.replaceWith(newBackdrop);

        newBackdrop.classList.add('visible');
        dialog.classList.add('visible');

        if (type === 'prompt') {
            setTimeout(() => newInputEl.focus(), 50);
        } else {
            setTimeout(() => newOkBtn.focus(), 50);
        }

        const handleOk = () => {
            const val = newInputEl.value;
            try {
                if (controller) {
                    if (typeof controller.accept === 'function') {
                        controller.accept(val);
                    } else if (typeof controller.ok === 'function') {
                        controller.ok(val);
                    }
                }
            } catch (err) {
                console.error("Dialog accept failed:", err);
            }
            if (activeSystemDialog === currentDialog) {
                activeSystemDialog = null;
            } else if (currentTab) {
                currentTab.activeDialog = null;
            }
            updateDialogUI();
        };

        const handleCancel = () => {
            try {
                if (controller && typeof controller.cancel === 'function') {
                    controller.cancel();
                }
            } catch (err) {
                console.error("Dialog cancel failed:", err);
            }
            if (activeSystemDialog === currentDialog) {
                activeSystemDialog = null;
            } else if (currentTab) {
                currentTab.activeDialog = null;
            }
            updateDialogUI();
        };

        newOkBtn.addEventListener('click', handleOk);
        newCancelBtn.addEventListener('click', handleCancel);
        if (newCloseBtn) {
            newCloseBtn.addEventListener('click', handleCancel);
        }
        newBackdrop.addEventListener('click', handleCancel);
        newInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleOk();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        });
    } catch (err) {
        console.error("updateDialogUI crashed:", err);
        if (originalAlert) {
            originalAlert("updateDialogUI crashed:\n" + err.message + "\n" + err.stack);
        }
    }
}

// Bubble'ı sadece gizle — izni reddetme, kullanıcı daha sonra karar verebilsin
function dismissPermissionBubble() {
    const bubble = document.getElementById('permissionBubble');
    const backdrop = document.getElementById('permissionBubbleBackdrop');
    if (!bubble || !bubble.classList.contains('visible')) return;
    bubble.classList.remove('visible');
    if (backdrop) backdrop.classList.remove('visible');
}

function updatePermissionUI() {
    const bubble = document.getElementById('permissionBubble');
    const backdrop = document.getElementById('permissionBubbleBackdrop');
    if (!bubble) return;

    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab || !activeTab.permissionRequests || activeTab.permissionRequests.length === 0) {
        bubble.classList.remove('visible');
        if (backdrop) backdrop.classList.remove('visible');
        return;
    }

    const req = activeTab.permissionRequests[0];
    const iconWrap = document.getElementById('permissionBubbleIcon');
    const icon = document.getElementById('permissionBubbleIco');
    const siteEl = document.getElementById('permissionBubbleSite');
    const msgEl = document.getElementById('permissionBubbleMsg');
    const allowBtn = document.getElementById('permissionAllowBtn');
    const denyBtn = document.getElementById('permissionDenyBtn');

    let siteName = 'site.com';
    try {
        siteName = new URL(req.url).hostname;
    } catch(_e) {
        siteName = req.url;
    }
    siteEl.textContent = siteName;

    iconWrap.className = 'permission-bubble-icon';
    icon.className = 'fa-solid';

    let permissionMsg = 'izin istiyor';
    const mediaTypes = req.mediaTypes || [];
    const hasVideo = mediaTypes.includes('video');
    const hasAudio = mediaTypes.includes('audio');

    if (req.permission === 'media') {
        if (hasVideo && hasAudio) {
            iconWrap.classList.add('icon-camera');
            icon.classList.add('fa-video');
            permissionMsg = 'kamera ve mikrofon erişimi istiyor';
        } else if (hasVideo) {
            iconWrap.classList.add('icon-camera');
            icon.classList.add('fa-camera');
            permissionMsg = 'kamera erişimi istiyor';
        } else if (hasAudio) {
            iconWrap.classList.add('icon-mic');
            icon.classList.add('fa-microphone');
            permissionMsg = 'mikrofon erişimi istiyor';
        } else {
            iconWrap.classList.add('icon-camera');
            icon.classList.add('fa-video');
            permissionMsg = 'medya erişimi istiyor';
        }
    } else if (req.permission === 'camera') {
        iconWrap.className = 'permission-bubble-icon icon-camera';
        icon.className = 'fa-solid fa-camera';
        permissionMsg = 'kamera erişimi istiyor';
    } else if (req.permission === 'microphone') {
        iconWrap.className = 'permission-bubble-icon icon-mic';
        icon.className = 'fa-solid fa-microphone';
        permissionMsg = 'mikrofon erişimi istiyor';
    } else if (req.permission === 'media-video-audio') {
        iconWrap.className = 'permission-bubble-icon icon-camera';
        icon.className = 'fa-solid fa-video';
        permissionMsg = 'kamera ve mikrofon erişimi istiyor';
    } else if (req.permission === 'geolocation') {
        iconWrap.className = 'permission-bubble-icon icon-location';
        icon.className = 'fa-solid fa-location-dot';
        permissionMsg = 'konumunuza erişmek istiyor';
    } else if (req.permission === 'notifications') {
        iconWrap.className = 'permission-bubble-icon icon-bell';
        icon.className = 'fa-solid fa-bell';
        permissionMsg = 'bildirim göndermek istiyor';
    } else if (req.permission === 'midiSysex' || req.permission === 'midi') {
        iconWrap.className = 'permission-bubble-icon icon-midi';
        icon.className = 'fa-solid fa-sliders';
        permissionMsg = 'MIDI cihazlarına erişmek istiyor';
    } else if (req.permission === 'pointerLock') {
        iconWrap.className = 'permission-bubble-icon icon-display';
        icon.className = 'fa-solid fa-computer-mouse';
        permissionMsg = 'imlecinizi kilitlemek istiyor';
    } else if (req.permission === 'openExternal') {
        iconWrap.className = 'permission-bubble-icon icon-display';
        icon.className = 'fa-solid fa-up-right-from-square';
        permissionMsg = 'harici bir uygulama açmak istiyor';
    } else if (req.permission === 'clipboard-read') {
        iconWrap.className = 'permission-bubble-icon icon-clipboard';
        icon.className = 'fa-solid fa-clipboard';
        permissionMsg = 'panonuzu okumak istiyor';
    } else if (req.permission === 'clipboard-sanitized-write' || req.permission === 'clipboard-write') {
        iconWrap.className = 'permission-bubble-icon icon-clipboard';
        icon.className = 'fa-solid fa-clipboard';
        permissionMsg = 'panoya yazmak istiyor';
    } else if (req.permission === 'fullscreen') {
        iconWrap.className = 'permission-bubble-icon icon-display';
        icon.className = 'fa-solid fa-expand';
        permissionMsg = 'tam ekran moduna geçmek istiyor';
    } else if (req.permission === 'display-capture') {
        iconWrap.className = 'permission-bubble-icon icon-display';
        icon.className = 'fa-solid fa-desktop';
        permissionMsg = 'ekranınızı paylaşmak istiyor';
    } else if (req.permission === 'bluetooth') {
        iconWrap.className = 'permission-bubble-icon icon-display';
        icon.className = 'fa-solid fa-bluetooth';
        permissionMsg = 'Bluetooth cihazlarınıza erişmek istiyor';
    } else if (req.permission === 'usb') {
        iconWrap.className = 'permission-bubble-icon icon-display';
        icon.className = 'fa-solid fa-usb';
        permissionMsg = 'USB cihazlarınıza erişmek istiyor';
    } else if (req.permission === 'serial') {
        iconWrap.className = 'permission-bubble-icon icon-display';
        icon.className = 'fa-solid fa-bolt';
        permissionMsg = 'Seri port cihazlarınıza erişmek istiyor';
    } else if (req.permission === 'hid') {
        iconWrap.className = 'permission-bubble-icon icon-display';
        icon.className = 'fa-solid fa-keyboard';
        permissionMsg = 'HID cihazlarınıza erişmek istiyor';
    } else if (req.permission === 'idle-detection') {
        iconWrap.className = 'permission-bubble-icon icon-bell';
        icon.className = 'fa-solid fa-user-slash';
        permissionMsg = 'aktif olmadığınız zamanları tespit etmek istiyor';
    } else if (req.permission === 'durable-storage') {
        iconWrap.className = 'permission-bubble-icon icon-clipboard';
        icon.className = 'fa-solid fa-hard-drive';
        permissionMsg = 'verileri kalıcı olarak depolamak istiyor';
    } else if (req.permission === 'encrypted-media') {
        iconWrap.className = 'permission-bubble-icon icon-camera';
        icon.className = 'fa-solid fa-key';
        permissionMsg = 'korumalı içerik oynatmak istiyor';
    } else if (req.permission === 'webauthn') {
        iconWrap.className = 'permission-bubble-icon icon-display';
        icon.className = 'fa-solid fa-fingerprint';
        permissionMsg = 'kimlik doğrulamak istiyor';
    } else if (req.permission === 'nfc') {
        iconWrap.className = 'permission-bubble-icon icon-midi';
        icon.className = 'fa-solid fa-wifi';
        permissionMsg = 'NFC cihazlarına erişmek istiyor';
    } else if (req.permission === 'vr') {
        iconWrap.className = 'permission-bubble-icon icon-display';
        icon.className = 'fa-solid fa-vr-cardboard';
        permissionMsg = 'sanal gerçeklik (VR) cihazlarına erişmek istiyor';
    } else if (req.permission === 'ar') {
        iconWrap.className = 'permission-bubble-icon icon-display';
        icon.className = 'fa-solid fa-vr-cardboard';
        permissionMsg = 'artırılmış gerçeklik (AR) cihazlarına erişmek istiyor';
    } else if (req.permission === 'sensors') {
        iconWrap.className = 'permission-bubble-icon icon-sensor';
        icon.className = 'fa-solid fa-compass';
        permissionMsg = 'cihaz sensörlerine erişmek istiyor';
    } else {
        iconWrap.className = 'permission-bubble-icon icon-bell';
        icon.className = 'fa-solid fa-shield-halved';
        permissionMsg = `${req.permission} yetkisi istiyor`;
    }
    msgEl.textContent = permissionMsg;

    bubble.classList.add('visible');
    if (backdrop) backdrop.classList.add('visible');

    const newAllowBtn = allowBtn.cloneNode(true);
    const newDenyBtn = denyBtn.cloneNode(true);
    allowBtn.replaceWith(newAllowBtn);
    denyBtn.replaceWith(newDenyBtn);

    newAllowBtn.addEventListener('click', () => {
        try {
            ipcRenderer.send('permission-response', { id: req.id, allowed: true });
        } catch (err) {
            console.error("Permission response send failed:", err);
        }
        activeTab.permissionRequests.shift();
        updatePermissionUI();
    });

    newDenyBtn.addEventListener('click', () => {
        try {
            ipcRenderer.send('permission-response', { id: req.id, allowed: false });
        } catch (err) {
            console.error("Permission response send failed:", err);
        }
        activeTab.permissionRequests.shift();
        updatePermissionUI();
    });
}

ipcRenderer.on('permission-request', (event, data) => {
    const tab = findTabByWebContentsId(data.webContentsId);
    if (tab) {
        if (!tab.permissionRequests) tab.permissionRequests = [];
        tab.permissionRequests.push(data);
        if (tab.id === activeTabId) {
            updatePermissionUI();
        }
    } else {
        try {
            ipcRenderer.send('permission-response', { id: data.id, allowed: false });
        } catch (err) {
            console.error("Failed to deny untracked permission request:", err);
        }
    }
});

// ── Webview Yeni Pencere Yakalayıcı (window.open intercept) ───────────────
ipcRenderer.on('webview-new-window', (event, { url, disposition, features }) => {
    const urlParams = new URLSearchParams(window.location.search);
    const currentIsPopup = urlParams.get('popup') === 'true';
    
    if (currentIsPopup) {
        ipcRenderer.send('open-new-window', { url, isPopup: true });
    } else {
        createNewTab(url);
    }
});

// ── Webview Synchronous Dialog Request Handler ──────────────────────────────
ipcRenderer.on('webview-dialog-request', (event, { id, type, message, defaultValue }) => {
    activeSystemDialog = {
        type,
        url: activeWebview ? activeWebview.src : 'xenixa://browser',
        message,
        defaultValue,
        controller: {
            accept: (value) => {
                ipcRenderer.send('webview-dialog-response', { id, result: value !== undefined ? value : true });
            },
            cancel: () => {
                ipcRenderer.send('webview-dialog-response', { id, result: type === 'confirm' ? false : null });
            }
        }
    };
    updateDialogUI();
});

