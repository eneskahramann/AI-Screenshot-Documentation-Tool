📸 AI Destekli Otomatik Kılavuz Üreticisi (Electron & Puppeteer & Gemini AI)
Bu proje; web uygulamaları veya sistemler üzerinde dolaşırken anlık ekran görüntüleri alan, bu görüntüleri Google Gemini Yapay Zeka modelleriyle analiz eden ve elde edilen verileri profesyonel bir kurumsal formatta (Word/.docx) masaüstüne raporlayan gelişmiş bir masaüstü otomasyon aracıdır.

Son güncellemelerle birlikte proje, API limitlerini aşmak için Round-Robin (Çoklu API ve Model Rotasyonu) mimarisiyle güçlendirilmiştir.

🚀 Sistem Nasıl Çalışır? (Mimari ve Akış)
Gelişmiş Arayüz Kontrolü ve Adım Yönetimi:

Kullanıcı, ayarlar menüsünden kota sınırlarına takılmamak için 3 farklı Gemini API Key girebilir ve kullanmak istediği çoklu Yapay Zeka Modellerini (Gemini 3.6 Flash, 3.5 Flash, Lite vb.) seçebilir.

Çekilen ekran görüntüleri ve adımlar arayüzdeki canlı galeriye yansır. Kullanıcılar bu adımları sürükle-bırak (drag & drop) yöntemiyle yeniden sıralayabilir veya hatalı adımları silebilir.

Tarayıcı Otomasyonu ve Yakalama (Puppeteer):

Arka planda çalışan Puppeteer motoru, hedef bilgisayardaki mevcut Chrome veya Edge tarayıcısını otomatik olarak tespit edip yüksek stabilite ile çalıştırır.

Kullanıcı uygulamanın "Ekranı Yakala" butonuna bastığında, aktif sekmenin ekran görüntüsü anlık olarak alınır. Görüntüler, sistem çökmelerini (asar salt okunur hatası) engellemek için geçici bir dizine (temp_screenshots) güvenli bir şekilde kaydedilir.

Yapay Zeka Analizi ve Round-Robin Mimarisi (Google GenAI):

Dinamik Rotasyon: Kaydedilen ekran görüntüsü, sisteme girilen API anahtarları ve modeller arasında sırayla dönülerek (Round-Robin) Gemini API'ye gönderilir. Bu sayede dakikalık istek limitleri (RPM) dengelenir.

Hata Toleransı (Retry Mekanizması): Herhangi bir API kotası dolduğunda veya geçersiz anahtar hatası alındığında, sistem çökmek yerine 10 saniye bekler ve şansını anında sıradaki model ve anahtar ile tekrar dener (Maksimum 3 deneme).

Otomatik Word Belgesi Üretimi (docx):

Yapay zekadan gelen resmi, edilgen çatılı ve yapılandırılmış metinler; otomatik olarak Word uyumlu başlık, resim ve madde işaretli listelere dönüştürülür.

Kullanıcı işlemi bitirdiğinde tüm adımlar harmanlanır ve çakışmaları önlemek için saat damgasıyla birlikte .docx formatında dışa aktarılır.

🛠️ Kullanılan Teknolojiler
Electron.js: Çapraz platform masaüstü uygulama çatısı ve IPC haberleşmesi.

Puppeteer: Kesintisiz tarayıcı otomasyonu ve yüksek çözünürlüklü ekran yakalama.

Google GenAI (@google/genai): Çoklu model desteğiyle görsel analizi ve metin üretimi.

Docx: Programatik Word belgesi tasarımı ve derlemesi.

⚙️ Kurulum ve Çalıştırma
Projeyi yerel bilgisayarınızda çalıştırmak için terminalde sırasıyla şu adımları izleyin:

Bash
# Proje bağımlılıklarını yükleyin
npm install

# Geliştirme modunda (Test için) başlatın
npm start

# Uygulamayı paketleyin (Build)
npm run dist
