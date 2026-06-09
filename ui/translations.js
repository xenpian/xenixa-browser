// Xenixa Browser Internationalization System

const TRANSLATIONS = {
  tr: {
    // Nav & Common
    back: "Geri",
    forward: "İleri",
    refresh: "Yenile",
    home: "Ana sayfa",
    search_placeholder: "Ara veya URL girin...",
    search_btn: "Git",
    downloads: "İndirilenler",
    menu: "Menü",
    
    // WARP & Tor
    warp_title: "Cloudflare WARP",
    warp_note: "warp-cli gerektirir",
    warp_connecting: "Bağlanıyor...",
    warp_connected: "Bağlı",
    warp_disconnected: "Bağlantı Kesildi",
    warp_connect: "Bağlan",
    warp_disconnect: "Bağlantıyı Kes",
    warp_status_checking: "Durum kontrol ediliyor...",
    
    tor_title: "Tor Ağı",
    tor_note: "tor.exe gerektirir",
    tor_connecting: "Bağlanıyor...",
    tor_connected: "Bağlı",
    tor_disconnected: "Bağlantı Kesildi",
    tor_connect: "Bağlan",
    tor_disconnect: "Bağlantıyı Kes",
    tor_status_checking: "Durum kontrol ediliyor...",
    
    // Welcome / Home settings
    customize_home: "Anasayfayı Özelleştir",
    tab_background: "Arka Plan",
    tab_shortcuts: "Kısayollar",
    tab_brand: "Marka",
    show_bg_image: "Arka plan resmini göster",
    images: "Resimler",
    upload_image: "Resim yükle",
    upload_video: "Video yükle",
    gradients: "Gradyanlar",
    solid_colors: "Düz Renkler",
    show_top_sites: "En çok ziyaret edilen siteler",
    show_top_sites_desc: "Sayfanın üstünde göster",
    show_logo: "Logo",
    show_logo_desc: "Xenixa logosunu göster",
    show_search_box: "Arama kutusu",
    show_search_box_desc: "Arama / URL girişini göster",
    video_sound: "Video sesi",
    video_sound_desc: "Arka plan videosunun sesini aç",
    show_adblock_stats: "Reklam Engelleme Sayacı",
    show_adblock_stats_desc: "Engellenen reklam sayısını göster",
    app_logo: "Uygulama Logosu",
    upload_img_btn: "Görsel Yükle",
    restore_default: "Varsayılana Dön",
    app_name: "Uygulama Adı",
    save: "Kaydet",
    app_name_hint: "Sekme başlıkları, pencere başlığı ve anasayfa adı değişir.",
    
    // Find in page
    find_placeholder: "Sayfada ara...",
    find_prev: "Önceki (Shift+Enter)",
    find_next: "Sonraki (Enter)",
    find_close: "Kapat (Esc)",
    
    // Site Info Panel
    conn_secure: "Bağlantı güvenli",
    conn_not_secure: "Bağlantı güvenli değil",
    cookies_data: "Çerezler ve site verileri",
    cookies_count: "{count} çerez",
    ads_blocked_count: "{count} reklam engellendi",
    site_settings: "Site ayarları",
    clear_cookies_data: "Çerezleri ve site verilerini temizle",
    cert_valid: "Sertifika geçerli",
    cert_invalid: "Sertifika geçersiz",
    security: "Güvenlik",
    conn_secure_desc: "Bilgileriniz (örneğin şifreler veya kredi kartı numaraları), bu siteye gönderilirken gizli olur.",
    conn_not_secure_desc: "Bu siteyle güvenli bir bağlantınız yok. Hassas bilgilerinizi girmemenizi öneririz.",
    more_info: "Daha fazla bilgi",
    
    // Permission Bubble
    wants_to_send_notifications: "bildirim göndermek istiyor",
    wants_to_use_camera: "kameranızı kullanmak istiyor",
    wants_to_use_mic: "mikrofonunuzu kullanmak istiyor",
    wants_to_use_geo: "konumunuza erişmek istiyor",
    permission_allow: "İzin Ver",
    permission_deny: "Reddet",
    
    // Custom Dialog
    dialog_cancel: "İptal",
    dialog_ok: "Tamam",
    
    // Special Pages
    history: "Geçmiş",
    settings: "Ayarlar",
    bookmarks: "Yer İşaretleri",
    permission_test: "İzin Testi",
    
    // Downloads Panel
    downloads_title: "İndirilenler",
    downloads_clear: "Temizle",
    no_downloads: "Henüz indirme yok",
    download_paused: "Duraklatıldı",
    download_completed: "Tamamlandı",
    download_cancelled: "İptal edildi",
    download_failed: "Kesintiye uğradı",
    show_in_folder: "Klasörde göster",
    remove_from_list: "Listeden kaldır",
    downloads_all: "Tümü",
    downloads_images: "Resimler",
    downloads_videos: "Videolar",
    downloads_docs: "Belgeler",
    downloads_other: "Diğer",
    downloads_search_placeholder: "İndirilenler içinde ara...",
    
    // Settings Page
    search_section: "Arama",
    default_search_engine: "Varsayılan Arama Motoru",
    default_search_desc: "URL çubuğundan yapılan aramalarda kullanılır",
    appearance_section: "Görünüm",
    tab_spinner: "Sekme Yükleme Animasyonu",
    tab_spinner_desc: "Sayfa yüklenirken dönen ikon göster",
    privacy_section: "Gizlilik & Veri",
    ad_blocker: "Reklam Engelleyici (Ad Blocker)",
    ad_blocker_desc: "Reklamları ve takipçileri otomatik engeller",
    clear_search_history: "Arama Geçmişini Temizle",
    clear_search_desc: "Tüm arama ve ziyaret geçmişini sil",
    clear_downloads_history: "İndirme Geçmişini Temizle",
    clear_downloads_desc: "İndirme listesini temizle (dosyalar silinmez)",
    clear_all_data: "Tüm Verileri Sıfırla",
    clear_all_desc: "Geçmiş, ayarlar ve tüm kayıtlı verileri sil",
    password_manager: "Şifre Yöneticisi",
    saved_passwords: "Kayıtlı Şifreler",
    saved_passwords_desc: "Tarayıcıya kaydedilmiş şifreleriniz",
    tools_section: "Araçlar & Gizlilik",
    warp_desc: "DNS şifreleme ve VPN tüneli sağlar. `warp-cli.exe` konumunu belirleyin.",
    tor_desc: ".onion siteleri açmak için `tor.exe` konumunu belirleyin.",
    verify_and_save: "Doğrula ve Kaydet",
    reset_to_default: "Varsayılana Dön",
    download_tool: "İndir",
    default_search_paths: "Varsayılan aranan konumlar",
    about_section: "Hakkında",
    about_desc: "Electron tabanlı özel tarayıcı",
    
    // Context Menu
    ctx_open_link_tab: "Bağlantıyı yeni sekmede aç",
    ctx_open_link_win: "Bağlantıyı yeni pencerede aç",
    ctx_save_link_as: "Bağlantıyı farklı kaydet...",
    ctx_copy_link_addr: "Bağlantı adresini kopyala",
    ctx_open_img_tab: "Resmi yeni sekmede aç",
    ctx_save_img_as: "Resmi farklı kaydet...",
    ctx_copy_img: "Resmi kopyala",
    ctx_copy_img_addr: "Resim adresini kopyala",
    ctx_search_img_google: "Resmi Google ile ara",
    ctx_copy: "Kopyala",
    ctx_search_google: "Google'da ara",
    ctx_paste: "Yapıştır",
    ctx_cut: "Kes",
    ctx_back: "Geri",
    ctx_forward: "İleri",
    ctx_reload: "Yenile",
    ctx_save_page_as: "Sayfayı farklı kaydet...",
    ctx_print: "Yazdır...",
    ctx_inspect: "İncele",
    
    // Tab Context Menu
    tab_new_tab_right: "Sağa yeni sekme",
    tab_move_win: "Sekmeyi yeni pencereye taşı",
    tab_reload: "Yeniden Yükle",
    tab_duplicate: "Sekmeyi Kopyala",
    tab_mute: "Sekmenin sesini kapat",
    tab_unmute: "Sekmenin sesini aç",
    tab_close: "Kapat",
    tab_close_others: "Diğer sekmeleri kapat",
    tab_close_right: "Sağdaki sekmeleri kapat",
    tab_reopen_closed: "Kapatılan sekmeyi yeniden aç",
    
    // Permission specific (dynamic keys mapping)
    perm_camera_mic: "kamera ve mikrofon erişimi istiyor",
    perm_camera: "kamera erişimi istiyor",
    perm_mic: "mikrofon erişimi istiyor",
    perm_media: "medya erişimi istiyor",
    perm_geo: "konumunuza erişmek istiyor",
    perm_notifications: "bildirim göndermek istiyor",
    perm_midi: "MIDI cihazlarına erişmek istiyor",
    perm_pointerLock: "imlecinizi kilitlemek istiyor",
    perm_openExternal: "harici bir uygulama açmak istiyor",
    perm_clipboard_read: "panonuzu okumak istiyor",
    perm_clipboard_write: "panoya yazmak istiyor",
    perm_fullscreen: "tam ekran moduna geçmek istiyor",
    perm_display_capture: "ekranınızı kaydetmek istiyor",
    perm_generic: "izin istiyor",
    
    // History page specific
    today: "Bugün",
    yesterday: "Dün",
    visits_count: "{count} ziyaret",
    history_search_placeholder: "Geçmişte ara...",
    clear_all_history: "Tümünü Temizle",
    no_history: "Geçmiş bulunamadı",
    delete: "Sil",
    
    // Bookmarks page specific
    bookmarks_title: "Yer İşaretleri",
    add_bookmark_placeholder: "URL girin...",
    add_bookmark_btn: "Ekle",
    no_bookmarks: "Henüz yer işareti yok",
    open: "Aç",
    
    // Language settings
    language: "Dil",
    language_desc: "Tarayıcı arayüz dilini değiştirin",
    lang_tr: "Türkçe",
    lang_en: "English",
    lang_ru: "Русский",

    // User Menu
    menu_new_tab: "Yeni sekme",
    menu_new_window: "Yeni pencere",
    menu_bookmarks: "Yer işaretleri ve listeler",
    menu_extensions: "Uzantılar",
    menu_clear_data: "Tarama verilerini sil",
    menu_zoom: "Yakınlaştır",
    menu_zoom_out: "Uzaklaştır",
    menu_zoom_in: "Yakınlaştır",
    menu_fullscreen: "Tam ekran",
    menu_find: "Bul ve düzenle",
    menu_save_share: "Kaydet ve paylaş",
    menu_more_tools: "Diğer araçlar",
    menu_help: "Yardım",
    menu_exit: "Çıkış",
    
    // Downloads Panel buttons
    downloads_resume: "Devam et",
    downloads_pause: "Duraklat",
    downloads_cancel: "İptal et",
    
    clear_data_confirm: "Tüm tarama geçmişi, ziyaret sayıları ve arama geçmişi silinecek. Devam edilsin mi?",
    clear_site_cookies_confirm: "{origin} sitesi için tüm çerezleri ve yerel verileri temizlemek istediğinize emin misiniz?\nSayfa otomatik olarak yeniden yüklenecektir.",
    clear_site_cookies_success: "Çerezler ve site verileri başarıyla temizlendi.",
    clear_site_cookies_error: "Temizleme hatası: {error}",
    total_ads_blocked: "Toplam {count} reklam engellendi"
  },
  en: {
    // Nav & Common
    back: "Back",
    forward: "Forward",
    refresh: "Reload",
    home: "Home",
    search_placeholder: "Search or enter URL...",
    search_btn: "Go",
    downloads: "Downloads",
    menu: "Menu",
    
    // WARP & Tor
    warp_title: "Cloudflare WARP",
    warp_note: "requires warp-cli",
    warp_connecting: "Connecting...",
    warp_connected: "Connected",
    warp_disconnected: "Disconnected",
    warp_connect: "Connect",
    warp_disconnect: "Disconnect",
    warp_status_checking: "Checking status...",
    
    tor_title: "Tor Network",
    tor_note: "requires tor.exe",
    tor_connecting: "Connecting...",
    tor_connected: "Connected",
    tor_disconnected: "Disconnected",
    tor_connect: "Connect",
    tor_disconnect: "Disconnect",
    tor_status_checking: "Checking status...",
    
    // Welcome / Home settings
    customize_home: "Customize Home Page",
    tab_background: "Background",
    tab_shortcuts: "Shortcuts",
    tab_brand: "Brand",
    show_bg_image: "Show background image",
    images: "Images",
    upload_image: "Upload image",
    upload_video: "Upload video",
    gradients: "Gradients",
    solid_colors: "Solid Colors",
    show_top_sites: "Most visited sites",
    show_top_sites_desc: "Show at the top of the page",
    show_logo: "Logo",
    show_logo_desc: "Show Xenixa logo",
    show_search_box: "Search box",
    show_search_box_desc: "Show search / URL input",
    video_sound: "Video sound",
    video_sound_desc: "Unmute background video",
    show_adblock_stats: "Ad Blocking Counter",
    show_adblock_stats_desc: "Show the number of blocked ads",
    app_logo: "App Logo",
    upload_img_btn: "Upload Image",
    restore_default: "Restore Default",
    app_name: "App Name",
    save: "Save",
    app_name_hint: "Changes tab titles, window title, and home page name.",
    
    // Find in page
    find_placeholder: "Find in page...",
    find_prev: "Previous (Shift+Enter)",
    find_next: "Next (Enter)",
    find_close: "Close (Esc)",
    
    // Site Info Panel
    conn_secure: "Connection is secure",
    conn_not_secure: "Connection is not secure",
    cookies_data: "Cookies and site data",
    cookies_count: "{count} cookies",
    ads_blocked_count: "{count} ads blocked",
    site_settings: "Site settings",
    clear_cookies_data: "Clear cookies and site data",
    cert_valid: "Certificate is valid",
    cert_invalid: "Certificate is invalid",
    security: "Security",
    conn_secure_desc: "Your information (for example, passwords or credit card numbers) is private when it is sent to this site.",
    conn_not_secure_desc: "Your connection to this site is not secure. We recommend against entering sensitive information.",
    more_info: "More info",
    
    // Permission Bubble
    wants_to_send_notifications: "wants to send you notifications",
    wants_to_use_camera: "wants to use your camera",
    wants_to_use_mic: "wants to use your microphone",
    wants_to_use_geo: "wants to access your location",
    permission_allow: "Allow",
    permission_deny: "Deny",
    
    // Custom Dialog
    dialog_cancel: "Cancel",
    dialog_ok: "OK",
    
    // Special Pages
    history: "History",
    settings: "Settings",
    bookmarks: "Bookmarks",
    permission_test: "Permission Test",
    
    // Downloads Panel
    downloads_title: "Downloads",
    downloads_clear: "Clear",
    no_downloads: "No downloads yet",
    download_paused: "Paused",
    download_completed: "Completed",
    download_cancelled: "Cancelled",
    download_failed: "Failed",
    show_in_folder: "Show in folder",
    remove_from_list: "Remove from list",
    downloads_all: "All",
    downloads_images: "Images",
    downloads_videos: "Videos",
    downloads_docs: "Documents",
    downloads_other: "Other",
    downloads_search_placeholder: "Search downloads...",
    
    // Settings Page
    search_section: "Search",
    default_search_engine: "Default Search Engine",
    default_search_desc: "Used for searches made from the URL bar",
    appearance_section: "Appearance",
    tab_spinner: "Tab Loading Animation",
    tab_spinner_desc: "Show a spinning icon while the page is loading",
    privacy_section: "Privacy & Data",
    ad_blocker: "Ad Blocker",
    ad_blocker_desc: "Automatically blocks ads and trackers",
    clear_search_history: "Clear Search History",
    clear_search_desc: "Delete all search and visit history",
    clear_downloads_history: "Clear Downloads History",
    clear_downloads_desc: "Clear downloads list (files are not deleted)",
    clear_all_data: "Reset All Data",
    clear_all_desc: "Delete history, settings, and all saved data",
    password_manager: "Password Manager",
    saved_passwords: "Saved Passwords",
    saved_passwords_desc: "Your saved passwords in the browser",
    tools_section: "Tools & Privacy",
    warp_desc: "Provides DNS encryption and a VPN tunnel. Set `warp-cli.exe` path.",
    tor_desc: "Set `tor.exe` path to open .onion sites.",
    verify_and_save: "Verify and Save",
    reset_to_default: "Reset to Default",
    download_tool: "Download",
    default_search_paths: "Default searched locations",
    about_section: "About",
    about_desc: "Electron-based custom browser",
    
    // Context Menu
    ctx_open_link_tab: "Open link in new tab",
    ctx_open_link_win: "Open link in new window",
    ctx_save_link_as: "Save link as...",
    ctx_copy_link_addr: "Copy link address",
    ctx_open_img_tab: "Open image in new tab",
    ctx_save_img_as: "Save image as...",
    ctx_copy_img: "Copy image",
    ctx_copy_img_addr: "Copy image address",
    ctx_search_img_google: "Search image with Google",
    ctx_copy: "Copy",
    ctx_search_google: "Search on Google",
    ctx_paste: "Paste",
    ctx_cut: "Cut",
    ctx_back: "Back",
    ctx_forward: "Forward",
    ctx_reload: "Reload",
    ctx_save_page_as: "Save page as...",
    ctx_print: "Print...",
    ctx_inspect: "Inspect",
    
    // Tab Context Menu
    tab_new_tab_right: "New tab to the right",
    tab_move_win: "Move tab to new window",
    tab_reload: "Reload",
    tab_duplicate: "Duplicate Tab",
    tab_mute: "Mute tab",
    tab_unmute: "Unmute tab",
    tab_close: "Close",
    tab_close_others: "Close other tabs",
    tab_close_right: "Close tabs to the right",
    tab_reopen_closed: "Reopen closed tab",
    
    // Permission specific (dynamic keys mapping)
    perm_camera_mic: "wants to access camera and microphone",
    perm_camera: "wants to access camera",
    perm_mic: "wants to access microphone",
    perm_media: "wants to access media",
    perm_geo: "wants to access your location",
    perm_notifications: "wants to send you notifications",
    perm_midi: "wants to access MIDI devices",
    perm_pointerLock: "wants to lock your mouse cursor",
    perm_openExternal: "wants to open an external application",
    perm_clipboard_read: "wants to read your clipboard",
    perm_clipboard_write: "wants to write to your clipboard",
    perm_fullscreen: "wants to go fullscreen",
    perm_display_capture: "wants to record your screen",
    perm_generic: "wants to request permission",
    
    // History page specific
    today: "Today",
    yesterday: "Yesterday",
    visits_count: "{count} visits",
    history_search_placeholder: "Search history...",
    clear_all_history: "Clear All",
    no_history: "No history found",
    delete: "Delete",
    
    // Bookmarks page specific
    bookmarks_title: "Bookmarks",
    add_bookmark_placeholder: "Enter URL...",
    add_bookmark_btn: "Add",
    no_bookmarks: "No bookmarks yet",
    open: "Open",
    
    // Language settings
    language: "Language",
    language_desc: "Change browser interface language",
    lang_tr: "Türkçe",
    lang_en: "English",
    lang_ru: "Русский",

    // User Menu
    menu_new_tab: "New tab",
    menu_new_window: "New window",
    menu_bookmarks: "Bookmarks and lists",
    menu_extensions: "Extensions",
    menu_clear_data: "Clear browsing data",
    menu_zoom: "Zoom",
    menu_zoom_out: "Zoom out",
    menu_zoom_in: "Zoom in",
    menu_fullscreen: "Full screen",
    menu_find: "Find and edit",
    menu_save_share: "Save and share",
    menu_more_tools: "More tools",
    menu_help: "Help",
    menu_exit: "Exit",
    
    // Downloads Panel buttons
    downloads_resume: "Resume",
    downloads_pause: "Pause",
    downloads_cancel: "Cancel",
    
    clear_data_confirm: "All browsing history, visit counts, and search history will be deleted. Do you want to continue?",
    clear_site_cookies_confirm: "Are you sure you want to clear all cookies and local data for {origin}?\nThe page will be reloaded automatically.",
    clear_site_cookies_success: "Cookies and site data successfully cleared.",
    clear_site_cookies_error: "Clear error: {error}",
    total_ads_blocked: "Total {count} ads blocked"
  },
  ru: {
    // Nav & Common
    back: "Назад",
    forward: "Вперед",
    refresh: "Обновить",
    home: "Главная",
    search_placeholder: "Поиск или ввод URL...",
    search_btn: "Перейти",
    downloads: "Загрузки",
    menu: "Меню",
    
    // WARP & Tor
    warp_title: "Cloudflare WARP",
    warp_note: "требуется warp-cli",
    warp_connecting: "Подключение...",
    warp_connected: "Подключено",
    warp_disconnected: "Отключено",
    warp_connect: "Подключить",
    warp_disconnect: "Отключить",
    warp_status_checking: "Проверка статуса...",
    
    tor_title: "Сеть Tor",
    tor_note: "требуется tor.exe",
    tor_connecting: "Подключение...",
    tor_connected: "Подключено",
    tor_disconnected: "Отключено",
    tor_connect: "Подключить",
    tor_disconnect: "Отключить",
    tor_status_checking: "Проверка статуса...",
    
    // Welcome / Home settings
    customize_home: "Настроить главную страницу",
    tab_background: "Фон",
    tab_shortcuts: "Ярлыки",
    tab_brand: "Бренд",
    show_bg_image: "Показывать фоновое изображение",
    images: "Изображения",
    upload_image: "Загрузить изображение",
    upload_video: "Загрузить видео",
    gradients: "Градиенты",
    solid_colors: "Сплошные цвета",
    show_top_sites: "Часто посещаемые сайты",
    show_top_sites_desc: "Показывать вверху страницы",
    show_logo: "Логотип",
    show_logo_desc: "Показывать логотип Xenixa",
    show_search_box: "Поисковая строка",
    show_search_box_desc: "Показывать строку поиска / ввода URL",
    video_sound: "Звук видео",
    video_sound_desc: "Включить звук фонового видео",
    show_adblock_stats: "Счетчик блокировки рекламы",
    show_adblock_stats_desc: "Показывать количество заблокированной рекламы",
    app_logo: "Логотип приложения",
    upload_img_btn: "Загрузить изображение",
    restore_default: "Сбросить по умолчанию",
    app_name: "Имя приложения",
    save: "Сохранить",
    app_name_hint: "Изменяет заголовки вкладок, заголовок окна и имя домашней страницы.",
    
    // Find in page
    find_placeholder: "Найти на странице...",
    find_prev: "Предыдущее (Shift+Enter)",
    find_next: "Следующее (Enter)",
    find_close: "Закрыть (Esc)",
    
    // Site Info Panel
    conn_secure: "Подключение защищено",
    conn_not_secure: "Подключение не защищено",
    cookies_data: "Файлы cookie и данные сайтов",
    cookies_count: "файлов cookie: {count}",
    ads_blocked_count: "Заблокировано рекламы: {count}",
    site_settings: "Настройки сайтов",
    clear_cookies_data: "Очистить файлы cookie и данные сайтов",
    cert_valid: "Сертификат действителен",
    cert_invalid: "Сертификат недействителен",
    security: "Безопасность",
    conn_secure_desc: "Ваша информация (например, пароли или номера банковских карт) остается конфиденциальной при отправке на этот сайт.",
    conn_not_secure_desc: "Подключение к этому сайту небезопасно. Мы не рекомендуем вводить конфиденциальную информацию.",
    more_info: "Подробнее",
    
    // Permission Bubble
    wants_to_send_notifications: "хочет отправлять вам уведомления",
    wants_to_use_camera: "хочет использовать вашу камеру",
    wants_to_use_mic: "хочет использовать ваш микрофон",
    wants_to_use_geo: "хочет получить доступ к вашему местоположению",
    permission_allow: "Разрешить",
    permission_deny: "Блокировать",
    
    // Custom Dialog
    dialog_cancel: "Отмена",
    dialog_ok: "ОК",
    
    // Special Pages
    history: "История",
    settings: "Настройки",
    bookmarks: "Закладки",
    permission_test: "Тест разрешений",
    
    // Downloads Panel
    downloads_title: "Загрузки",
    downloads_clear: "Очистить",
    no_downloads: "Нет загрузок",
    download_paused: "Приостановлено",
    download_completed: "Завершено",
    download_cancelled: "Отменено",
    download_failed: "Ошибка",
    show_in_folder: "Показать в папке",
    remove_from_list: "Удалить из списка",
    downloads_all: "Все",
    downloads_images: "Изображения",
    downloads_videos: "Видео",
    downloads_docs: "Документы",
    downloads_other: "Другие",
    downloads_search_placeholder: "Поиск в загрузках...",
    
    // Settings Page
    search_section: "Поиск",
    default_search_engine: "Поисковая система по умолчанию",
    default_search_desc: "Используется для поиска из адресной строки",
    appearance_section: "Внешний вид",
    tab_spinner: "Анимация загрузки вкладки",
    tab_spinner_desc: "Показывать вращающийся значок при загрузке страницы",
    privacy_section: "Конфиденциальность и данные",
    ad_blocker: "Блокировщик рекламы",
    ad_blocker_desc: "Автоматически блокирует рекламу и трекеры",
    clear_search_history: "Очистить историю поиска",
    clear_search_desc: "Удалить всю историю поиска и посещений",
    clear_downloads_history: "Очистить историю загрузок",
    clear_downloads_desc: "Очистить список загрузок (файлы не удаляются)",
    clear_all_data: "Сбросить все данные",
    clear_all_desc: "Удалить историю, настройки и все сохраненные данные",
    password_manager: "Диспетчер паролей",
    saved_passwords: "Сохраненные пароли",
    saved_passwords_desc: "Ваши сохраненные пароли в браузере",
    tools_section: "Инструменты и конфиденциальность",
    warp_desc: "Обеспечивает шифрование DNS и VPN-туннель. Укажите путь к `warp-cli.exe`.",
    tor_desc: "Укажите путь к `tor.exe` для открытия сайтов .onion.",
    verify_and_save: "Проверить и сохранить",
    reset_to_default: "Сбросить по умолчанию",
    download_tool: "Скачать",
    default_search_paths: "Пути поиска по умолчанию",
    about_section: "О программе",
    about_desc: "Пользовательский браузер на базе Electron",
    
    // Context Menu
    ctx_open_link_tab: "Открыть ссылку в новой вкладке",
    ctx_open_link_win: "Открыть ссылку в новом окне",
    ctx_save_link_as: "Сохранить ссылку как...",
    ctx_copy_link_addr: "Копировать адрес ссылки",
    ctx_open_img_tab: "Открыть изображение в новой вкладке",
    ctx_save_img_as: "Сохранить изображение как...",
    ctx_copy_img: "Копировать изображение",
    ctx_copy_img_addr: "Копировать адрес изображения",
    ctx_search_img_google: "Искать картинку в Google",
    ctx_copy: "Копировать",
    ctx_search_google: "Искать в Google",
    ctx_paste: "Вставить",
    ctx_cut: "Вырезать",
    ctx_back: "Назад",
    ctx_forward: "Вперед",
    ctx_reload: "Перезагрузить",
    ctx_save_page_as: "Сохранить страницу как...",
    ctx_print: "Печать...",
    ctx_inspect: "Просмотреть код",
    
    // Tab Context Menu
    tab_new_tab_right: "Новая вкладка справа",
    tab_move_win: "Переместить вкладку в новое окно",
    tab_reload: "Перезагрузить",
    tab_duplicate: "Дублировать вкладку",
    tab_mute: "Отключить звук вкладки",
    tab_unmute: "Включить звук вкладки",
    tab_close: "Закрыть",
    tab_close_others: "Закрыть другие вкладки",
    tab_close_right: "Закрыть вкладки справа",
    tab_reopen_closed: "Открыть закрытую вкладку",
    
    // Permission specific (dynamic keys mapping)
    perm_camera_mic: "хочет получить доступ к камере и микрофону",
    perm_camera: "хочет получить доступ к камере",
    perm_mic: "хочет получить доступ к микрофону",
    perm_media: "хочет получить доступ к медиафайлам",
    perm_geo: "хочет получить доступ к вашему местоположению",
    perm_notifications: "хочет отправлять вам уведомления",
    perm_midi: "хочет получить доступ к устройствам MIDI",
    perm_pointerLock: "хочет захватить указатель мыши",
    perm_openExternal: "хочет открыть внешнее приложение",
    perm_clipboard_read: "хочет читать буфер обмена",
    perm_clipboard_write: "хочет записывать в буфер обмена",
    perm_fullscreen: "хочет перейти в полноэкранный режим",
    perm_display_capture: "хочет записать ваш экран",
    perm_generic: "запрашивает разрешение",
    
    // History page specific
    today: "Сегодня",
    yesterday: "Вчера",
    visits_count: "Посещений: {count}",
    history_search_placeholder: "Поиск по истории...",
    clear_all_history: "Очистить всё",
    no_history: "История не найдена",
    delete: "Удалить",
    
    // Bookmarks page specific
    bookmarks_title: "Закладки",
    add_bookmark_placeholder: "Введите URL...",
    add_bookmark_btn: "Добавить",
    no_bookmarks: "Закладок пока нет",
    open: "Открыть",
    
    // Language settings
    language: "Язык",
    language_desc: "Изменить язык интерфейса браузера",
    lang_tr: "Türkçe",
    lang_en: "English",
    lang_ru: "Русский",

    // User Menu
    menu_new_tab: "Новая вкладка",
    menu_new_window: "Новое окно",
    menu_bookmarks: "Закладки и списки",
    menu_extensions: "Расширения",
    menu_clear_data: "Очистить данные просмотра",
    menu_zoom: "Масштаб",
    menu_zoom_out: "Уменьшить",
    menu_zoom_in: "Увеличить",
    menu_fullscreen: "Во весь экран",
    menu_find: "Найти и изменить",
    menu_save_share: "Сохранить и поделиться",
    menu_more_tools: "Другие инструменты",
    menu_help: "Справка",
    menu_exit: "Выход",
    
    // Downloads Panel buttons
    downloads_resume: "Продолжить",
    downloads_pause: "Пауза",
    downloads_cancel: "Отменить",
    
    clear_data_confirm: "Вся история просмотров, счетчики посещений и история поиска будут удалены. Продолжить?",
    clear_site_cookies_confirm: "Вы уверены, что хотите удалить все файлы cookie и локальные данные для {origin}?\nСтраница будет перезагружена автоматически.",
    clear_site_cookies_success: "Файлы cookie и данные сайта успешно очищены.",
    clear_site_cookies_error: "Ошибка очистки: {error}",
    total_ads_blocked: "Всего заблокировано рекламы: {count}"
  }
};

window.XenixaI18n = {
    TRANSLATIONS,
    currentLang: localStorage.getItem('xenixa_lang') || 'tr',
    setLanguage(lang) {
        if (TRANSLATIONS[lang]) {
            localStorage.setItem('xenixa_lang', lang);
            this.currentLang = lang;
            this.apply();
            return true;
        }
        return false;
    },
    t(key, replacements = {}) {
        let text = (TRANSLATIONS[this.currentLang] && TRANSLATIONS[this.currentLang][key]) || TRANSLATIONS['tr'][key] || key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(`{${k}}`, v);
        }
        return text;
    },
    apply(root = document) {
        // Set page HTML lang attribute
        root.documentElement.setAttribute('lang', this.currentLang);

        // Translate textContent
        root.querySelectorAll('[data-translate]').forEach(el => {
            const key = el.getAttribute('data-translate');
            el.textContent = this.t(key);
        });

        // Translate placeholders
        root.querySelectorAll('[data-translate-placeholder]').forEach(el => {
            const key = el.getAttribute('data-translate-placeholder');
            el.setAttribute('placeholder', this.t(key));
        });

        // Translate titles / tooltips
        root.querySelectorAll('[data-translate-title]').forEach(el => {
            const key = el.getAttribute('data-translate-title');
            el.setAttribute('title', this.t(key));
        });
    }
};

// Auto apply on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    window.XenixaI18n.apply();
});
