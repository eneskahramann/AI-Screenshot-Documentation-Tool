# AI-Screenshot-Documentation-Tool
Electron ve Puppeteer ile ekran görüntüsü alıp, Google Gemini AI kullanarak kurumsal teknik dokümantasyon (Word) üreten masaüstü otomasyon aracı.

# 📸 AI Destekli Otomatik Kılavuz Üreticisi (Electron & Puppeteer & Gemini AI)

Bu proje; web uygulamaları veya sistemler üzerinde dolaşırken anlık ekran görüntüleri alan, bu görüntüleri **Google Gemini Yapay Zeka** modelleriyle analiz eden ve elde edilen verileri profesyonel bir kurumsal formatta (Word/.docx) masaüstüne raporlayan masaüstü otomasyon aracıdır.

## 🚀 Sistem Nasıl Çalışır? (Mimari ve Akış)

1. **Arayüz Kontrolü (`index.html`):** 
   - Kullanıcı uygulama panelinden kendi **Gemini API Key**'ini girer, isteğe bağlı ekran başlığı belirler ve kullanmak istediği **Yapay Zeka Modelini** (Gemini Flash serisi) seçer.
   - Bilgiler Electron'un arka plan motoruna iletilir.

2. **Tarayıcı Otomasyonu ve Yakalama (`Puppeteer`):**
   - Arka planda çalışan Puppeteer motoru, hedef bilgisayardaki mevcut **Chrome veya Edge** tarayıcısını otomatik olarak tespit edip çalıştırır.
   - Kullanıcı uygulamanın "Ekranı Yakala" butonuna bastığında, aktif sekmenin ekran görüntüsü anlık olarak alınır.
   - Alınan görüntü, sistem çökmelerini (asar salt okunur hatası) engellemek için doğrudan bilgisayarın geçici veya uygulama dizinine (`temp_screenshots`) güvenli bir şekilde kaydedilir.

3. **Yapay Zeka Analizi (`Google GenAI`):**
   - Kaydedilen ekran görüntüsü ve kullanıcının belirttiği ekran başlığı, sisteme özel olarak tanımlanmış profesyonel kurumsal dokümantasyon promptu ile birlikte Gemini API'ye gönderilir.
   - API hız sınırlarına (kota koruması) takılmamak için sistem otomatik olarak akıllı bir bekleme ve yeniden deneme (Retry) mekanizması barındırır.

4. **Word Belgesi Üretimi (`docx`):**
   - Yapay zekadan gelen resmi ve yapılandırılmış metinler, otomatik olarak Word uyumlu başlık, resim ve madde işaretli listelere dönüştürülür.
   - Kullanıcı kılavuz oluşturma işlemini bitirdiğinde, tüm adımlar harmanlanır ve masaüstüne `Arayuzle_Uretilen_Kilavuz.docx` adıyla (çakışmaları önlemek için saat damgasıyla) kaydedilir.

## 🛠️ Kullanılan Teknolojiler
* **Electron.js:** Masaüstü uygulama çatısı.
* **Puppeteer:** Tarayıcı otomasyonu ve ekran yakalama.
* **Google GenAI (`@google/genai`):** Görsel analizi ve metin üretimi.
* **Docx:** Programatik Word belgesi tasarımı ve üretimi.

## ⚙️ Kurulum ve Çalıştırma

Projeyi yerel bilgisayarınızda çalıştırmak için terminalde sırasıyla şu adımları izleyin:

```bash
# Proje bağımlılıklarını yükleyin
npm install

# Geliştirme modunda (Test için) başlatın
npm start

# Uygulamayı taşınabilir .exe formatında paketleyin (Build)
npm run dist
