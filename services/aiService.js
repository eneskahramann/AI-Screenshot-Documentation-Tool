const { GoogleGenAI } = require('@google/genai');

async function explainScreenLikeIlksan(imageBuffer, screenName, apiKey, selectedModel, onLog, maxRetries = 3) {
  const ai = new GoogleGenAI({ apiKey: apiKey });
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

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  🤖 [${selectedModel}] "${screenName}" için inceliyor (Deneme: ${attempt}/${maxRetries})...`);

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: [prompt, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }]
      });

      return response.text;
    } catch (err) {
      console.warn(`  ⚠️ API Hatası (${attempt}. deneme): ${err.message}`);
      
      if (attempt < maxRetries) {
        const waitTime = attempt * 10000; 
        console.log(`  ⏳ Sunucu yoğun veya geçici hata oluştu. ${waitTime / 1000} saniye sonra tekrar deneniyor...`);
        
        if(onLog) onLog(`⏳ Google hız sınırına takıldı, ${waitTime / 1000}sn bekleniyor (${attempt}/${maxRetries})...`);
        
        await new Promise(res => setTimeout(res, waitTime));
      } 
      else {
        console.error(`  ❌ "${screenName}" için AI yanıtı alınamadı.`);
        return `[TANIM]\n${screenName} Ekranı, sistemdeki ilgili verilerin yönetilmesi amacıyla kullanılan bir arayüzdür.\n[Not: API Hatası veya Kota limitleri nedeniyle otomatik analiz alınamadı. Lütfen daha sonra manuel düzenleyiniz.]\n\n[İŞLEMLER]\nYapılabilecek işlemler:\n* **Ekran İnceleme:** İlgili alanlar üzerinden standart işlemler gerçekleştirilebilir.`;
      }
    }
  }
}

module.exports = { explainScreenLikeIlksan };