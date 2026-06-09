# Xenixa Browser Güncelleme Notları

Bu güncellemede tarayıcının görsel bütünlüğü, sekme yönetimi, kullanıcı dostu onboarding deneyimi ve geliştirici/kullanıcı yenileme (caching) sorunları giderilmiştir. Yapılan değişiklikler aşağıda özetlenmiştir:

## 1. Sekme Üst Boşluğu ve Tıklanabilirlik
* Sekmelerin (`.tab`) üst kısmına görsel boşluklar eklendi.
* Bu boşluk alanına tıklandığında da sekmenin seçilebilmesi (tıklama alanının korunması) sağlandı.

## 2. Renk Standardizasyonu (Gray Geçişi)
* Tarayıcı arayüzündeki (`ui/styles.css` ve `ui/index.html`) ve tüm dahili özel HTML sayfalarındaki (`settings.html`, `bookmarks.html`, `history.html`, `downloads.html`, `permission-test.html`) eski ikincil/açıklama gri renk kodları (`#9aa0a6`, `#5f6368` vb.) standart CSS `gray` anahtar kelimesiyle değiştirildi.

## 3. Dahili Özel Sayfa Önbellekleme (Cache-Busting) Çözümü
* Özel sayfaların (`xenixa://settings` vb.) yenilendiğinde Chromium'un agresif disk/bellek önbelleğinden eski kodları getirmesi engellendi.
* Yenileme (Refresh) butonuna tıklandığında, sekmeye sağ tıklayıp "Yenile" dendiğinde veya klavye kısayolları (`Ctrl+R`, `F5`, `Ctrl+Shift+R`) kullanıldığında, her seferinde benzersiz zaman damgası üreten (`?v=Date.now()`) yeni `reloadTab` mekanizması geliştirildi.

## 4. Yeni Sekme Onboarding Tooltip'i
* Tarayıcı ilk kez açıldığında, yeni sekme oluşturma (`+`) butonunu gösteren premium bir bilgilendirme balonu (tooltip) eklendi.
* Tooltip üzerinde **"Kapat"** ve tercihi kalıcı olarak `localStorage`'a kaydedip bir daha göstermeyen **"Bir Daha Gösterme"** butonları konumlandırıldı.
* Kullanıcı sekme açtığında veya tooltip dışına tıkladığında otomatik olarak kaybolması sağlandı.
* Tasarım sadeleştirilerek tooltip'in `box-shadow` (kutu gölgesi) özelliği kaldırıldı.

## 5. Sağ Tık Menüsü (Context Menu) Tasarım Uyumu
* Sekme sağ tık menüsü (`.tab-context-menu`) ile ana sağ tık menüsü (`.context-menu`) görsel olarak eşitlendi (arka plan rengi `#2c2c2c` yapıldı, hover efektleri ve mor renk vurguları eşitlendi).
* Tasarımın düz ve temiz durması adına `.tab-context-menu`'nün `box-shadow` özelliği kaldırıldı.
