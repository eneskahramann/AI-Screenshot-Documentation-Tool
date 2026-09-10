const { GoogleGenAI } = require('@google/genai');

let currentKeyIndex = 0; // Round-Robin için global sayaç

async function explainScreenLikeIlksan(imageBuffer, screenName, apiKeys, selectedModel, onLog, maxRetries = 3) {
  // apiKeys parametresinin dizi (array) geldiğinden emin oluyoruz
  const keysArray = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  
  const base64Image = imageBuffer.toString('base64');
  const prompt = `
Sen "İLKSAN" kurumunun yazılım ekibinde çalışan profesyonel bir teknik dokümantasyon yazarısın.
Ekteki ekran görüntüsü "${screenName}" sayfasına aittir.

ÖNEMLİ KURAL: Sol ve üst sabit menüleri ASLA açıklama. Sadece sayfanın ortasındaki aktif çalışma alanına (form, tablo, butonlar) odaklan.

Lütfen açıklamayı BİREBİR aşağıdaki İLKSAN kurumsal kılavuz formatında, edilgen çatılı (kullanılır, yapılabilir, listelenir) ve son derece resmi bir dille yaz:

[TANIM]
${screenName} Ekranı, [Sisteme veya kullanıcılara ne sağladığını açıklayan, "arayüzdür", "sağlar" veya "kullanılır" ile biten 2-3 cümlelik çok resmi bir tanım.]

[İŞLEMLER]
Yapılabilecek işlemler:
* **Arama ve Filtreleme:** [Eğer ekranda arama/filtre alanları varsa bunu yaz, yoksa bu maddeyi atla. Şöyle başla: "Ekranın üst kısmında yer alan filtre alanları kullanılarak amaca yönelik sorgulama yapılabilir:"]
  - **[Filtre Adı]:** [Ne için kullanıldığı]
* **Veri Listeleme ve Tablo:** [Eğer ekranda tablo varsa, tablodaki önemli sütun isimlerini sayarak kayıtların nasıl listelendiğini anlat.]
* **İşlem Butonları ve Yönetim:** [Ekranda Ara, Kaydet, Sil, Yeni Kayıt, Excel gibi butonlar varsa bunları listele]
  - **[Buton Adı]:** [İşlevi, Örn: Listelenen verileri Excel formatında dışa aktarmaya yarar.]

KURAL: Tüm metni resmi dille yaz. Senli benli veya yönlendirici ("tıklayınız", "görebilirsiniz") ifadeler kullanma. Daima "tıklanır", "görüntülenebilir", "yapılır" şeklinde edilgen fiiller kullan. Sadece [TANIM] ve [İŞLEMLER] etiketleriyle yanıt ver.
`;

  // DÖNGÜ BAŞLANGICI: 3 aşamalı deneme
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Her denemede sıradaki API Key'i seçiyoruz
    const activeKey = keysArray[currentKeyIndex % keysArray.length];
    const activeKeyNumber = (currentKeyIndex % keysArray.length) + 1;
    
    currentKeyIndex++; // Sonraki istek/deneme için sayacı artır

    const ai = new GoogleGenAI({ apiKey: activeKey });
    
    if (keysArray.length > 1 && onLog) {
      onLog(`🔑 API Key ${activeKeyNumber} devrede (Deneme: ${attempt}/${maxRetries})...`);
    }

    try {
      console.log(`🤖 [${selectedModel}] "${screenName}" inceleniyor (Key: ${activeKeyNumber})...`);

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: [
          prompt, 
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
        ]
      });

      return response.text;
    } catch (err) {
      console.warn(`⚠️ API Hatası (${attempt}. deneme, Key ${activeKeyNumber}): ${err.message}`);
      
      if (attempt < maxRetries) {
        // Hata durumunda sabit 10 saniye bekliyoruz
        const waitTime = 10000; 
        console.log(`⏳ Hata oluştu. ${waitTime / 1000} saniye bekleniyor...`);
        
        if(onLog) {
          // Kullanıcı tek key girdiyse ona göre, çok key girdiyse ona göre mesaj veriyoruz
          const logMsg = keysArray.length === 1 
            ? `⏳ Limit aşıldı, ${waitTime / 1000}sn bekleniyor (${attempt}/${maxRetries})...`
            : `⏳ Hata alındı, ${waitTime / 1000}sn sonra sıradaki anahtara geçilecek...`;
          onLog(logMsg);
        }
        
        await new Promise(res => setTimeout(res, waitTime));
      } 
      else {
        console.error(`❌ "${screenName}" için AI yanıtı alınamadı.`);
        if (onLog) onLog(`❌ Tüm denemeler başarısız oldu! Lütfen bekleyin veya yeni anahtar girin.`);
        return `[TANIM]\n${screenName} Ekranı, sistemdeki ilgili verilerin yönetilmesi amacıyla kullanılan bir arayüzdür.\n[Not: API Hatası veya Kota limitleri nedeniyle otomatik analiz alınamadı. Lütfen daha sonra manuel düzenleyiniz.]\n\n[İŞLEMLER]\nYapılabilecek işlemler:\n* **Ekran İnceleme:** İlgili alanlar üzerinden standart işlemler gerçekleştirilebilir.`;
      }
    }
  }
}

module.exports = { explainScreenLikeIlksan };