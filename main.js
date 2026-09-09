const { app, BrowserWindow, ipcMain } = require('electron');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Document, Packer, Paragraph, TextRun, ImageRun,   TableOfContents, 
  HeadingLevel, 
  PageBreak, AlignmentType } = require('docx');
const { GoogleGenAI } = require('@google/genai');

// Program .exe haline gelmişse exe'nin yanını, VS Code'daysa proje klasörünü kullan
const baseDir = app.isPackaged ? path.dirname(process.execPath) : __dirname;
const TEMP_IMG_DIR = path.join(baseDir, 'temp_screenshots');
// Eğer temp ekran görüntüleri klasörü yoksa oluşturur
if (!fs.existsSync(TEMP_IMG_DIR)) fs.mkdirSync(TEMP_IMG_DIR, { recursive: true });

let browser = null;
let mainWindow = null;
let stepCount = 1;
const docParagraphs = [
  new Paragraph({
    children: [new TextRun({ text: 'SİSTEM KULLANIM KILAVUZU', bold: true, size: 32, font: 'Calibri', color: '8B0000' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 300 }
  })
];

// İLKSAN Formatı + 30 Saniyelik Hata/Kota Koruması + Dinamik Model Seçimi
// Ekran görüntüsünü Google GenAI ile analiz eder ve İLKSAN formatında açıklama üretir
async function explainScreenLikeIlksan(imageBuffer, screenName, apiKey, selectedModel, maxRetries = 3) {
  const ai = new GoogleGenAI({ apiKey: apiKey });
  const base64Image = imageBuffer.toString('base64');
  
  const prompt = `
Sen "İLKSAN" kurumunun yazılım ekibinde çalışan profesyonel bir teknik dokümantasyon yazarısın.
Ekteki ekran görüntüsü "${screenName}" sayfasına aittir.

ÖNEMLİ KURAL: Sol ve üst sabit menüleri ASLA açıklama. Sadece sayfanın ortasındaki aktif çalışma alanına (form, tablo, butonlar) odaklan.

Lütfen açıklamayı BİREBİR aşağıdaki İLKSAN kurumsal kılavuz formatında, edilgen çatılı (kullanılır, yapılabilir, listelenir) ve son derece resmi bir dille yaz:

[TANIM]
${screenName} Ekranı, [Sisteme veya kullanıcılara ne sağladığını açıklayan, "arayüzdür", "sağlar" veya "kullanılır" ile biten 2-3 cümlelik çok resmi bir tanım. Örn: "...aidat ödemelerinin listelendiği ve takip edildiği bir arayüzdür."]

[İŞLEMLER]
Yapılabilecek işlemler:
* **Arama ve Filtreleme:** [Eğer ekranda arama/filtre alanları varsa bunu yaz, yoksa bu maddeyi atla. Şöyle başla: "Ekranın üst kısmında yer alan filtre alanları kullanılarak amaca yönelik sorgulama yapılabilir:"]
  - **[Filtre Adı]:** [Ne için kullanıldığı]
  - **[Filtre Adı]:** [Ne için kullanıldığı]
* **Veri Listeleme ve Tablo:** [Eğer ekranda tablo varsa, tablodaki önemli sütun isimlerini sayarak kayıtların nasıl listelendiğini anlat. "Arama işlemi sonrasında eşleşen tüm kayıtlar alt kısımdaki listede görüntülenir." gibi bir cümle kullan.]
* **İşlem Butonları ve Yönetim:** [Ekranda Ara, Kaydet, Sil, Yeni Kayıt, Excel gibi butonlar varsa bunları listele]
  - **[Buton Adı]:** [İşlevi, Örn: İstenen filtreler girildikten sonra sonuçları listelemek için kullanılır.]
  - **[Buton Adı]:** [İşlevi, Örn: Listelenen verileri Excel formatında dışa aktarmaya yarar.]

KURAL: Tüm metni resmi dille yaz. Senli benli veya yönlendirici ("tıklayınız", "görebilirsiniz") ifadeler kullanma. Daima "tıklanır", "görüntülenebilir", "yapılır" şeklinde edilgen fiiller kullan. Sadece [TANIM] ve [İŞLEMLER] etiketleriyle yanıt ver.
`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  🤖 [${selectedModel}] "${screenName}" için inceliyor (Deneme: ${attempt}/${maxRetries})...`);

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: [prompt, { inlineData: { mimeType: 'image/png', data: base64Image } }]
      });

      return response.text;

      // Eğer API tarafından yanıt alınamazsa veya token limiti aşılırsa catch bloğuna düşer ve tekrar denemeye geçer.
    } catch (err) {
      console.warn(`  ⚠️ API Hatası (${attempt}. deneme): ${err.message}`);
      
      if (attempt < maxRetries) {
        const waitTime = attempt * 10000; 
        
        console.log(`  ⏳ Sunucu yoğun veya geçici hata oluştu. ${waitTime / 1000} saniye sonra tekrar deneniyor...`);
        mainWindow?.webContents.send('log', `⏳ Google hız sınırına takıldı, ${waitTime / 1000}sn bekleniyor (${attempt}/${maxRetries})...`);
        
        await new Promise(res => setTimeout(res, waitTime));
      } 
      // Eğer tüm denemeler başarısız olursa aşağıdaki sabit açıklama ile devam eder.
      else {
        console.error(`  ❌ "${screenName}" için AI yanıtı alınamadı, yer tutucu açıklama ile devam ediliyor.`);
        return `[TANIM]\n${screenName} Ekranı, sistemdeki ilgili verilerin yönetilmesi amacıyla kullanılan bir arayüzdür.\n[Not: API Hatası veya Kota limitleri nedeniyle otomatik analiz alınamadı. Lütfen daha sonra manuel düzenleyiniz.]\n\n[İŞLEMLER]\nYapılabilecek işlemler:\n* **Ekran İnceleme:** İlgili alanlar üzerinden standart işlemler gerçekleştirilebilir.`;
      }
    }
  }
}
// Metni İLKSAN formatına uygun şekilde docx paragraflarına dönüştürür
function formatIlksanTextToDocx(rawText) {
  const lines = rawText.split('\n');
  const paragraphs = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '[TANIM]' || trimmed === '[İŞLEMLER]') continue;

    if (trimmed.toLowerCase().includes('yapılabilecek işlemler:')) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: 'Yapılabilecek işlemler:', bold: true, font: 'Calibri', size: 22, color: '222222' })],
        spacing: { before: 180, after: 100 }
      }));
      continue;
    }
    // Madde işaretli veya alt madde işaretli satırları işler
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const content = trimmed.replace(/^[\*\-]\s*/, '');
      const parts = content.split(/(\*\*.*?\*\*)/g);
      
      const isSubItem = trimmed.startsWith('- ');
      
      const runs = parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return new TextRun({ text: part.slice(2, -2), bold: true, font: 'Calibri', size: 21, color: '222222' });
        }
        return new TextRun({ text: part, font: 'Calibri', size: 21, color: '333333' });
      });

      paragraphs.push(new Paragraph({ 
        children: runs, 
        bullet: { level: isSubItem ? 1 : 0 }, 
        spacing: { before: isSubItem ? 40 : 80, after: isSubItem ? 40 : 80 } 
      }));
      continue;
    }
// Normal metin satırlarını işler
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: trimmed, font: 'Calibri', size: 21, color: '333333' })],
      spacing: { before: 100, after: 140 },
      alignment: AlignmentType.JUSTIFIED
    }));
  }

  return paragraphs;
}
// Electron ana penceresini oluşturur
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 420, 
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}
// Electron uygulaması hazır olduğunda tarayıcıyı başlatır ve ilk sayfayı açar
app.whenReady().then(async () => {
  createWindow();
// Tarayıcıyı başlatmak için sistemdeki olası tarayıcı yollarını kontrol eder
  const getBrowserPath = () => {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    return paths.find(p => fs.existsSync(p)) || null;
  };

  const executablePath = getBrowserPath();

  browser = await puppeteer.launch({
    headless: false,
    executablePath: executablePath,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list'
    ]
  });
  
  const pages = await browser.pages();
  const initialPage = pages.length > 0 ? pages[0] : await browser.newPage();
  await initialPage.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  await initialPage.goto('about:blank');
});
// Ekran yakalama tetiklendiğinde çalışacak IPC dinleyicisi
ipcMain.on('capture-screen', async (event, data) => {
  console.log('📸 Ekran yakalama tetiklendi...');
  try {
    const customTitle = data.title;
    const apiKey = data.apiKey;
    const selectedModel = data.modelName || 'gemini-3.6-flash';

    if (!browser) throw new Error('Tarayıcı henüz aktif değil.');

    const currentPages = await browser.pages();
    if (!currentPages || currentPages.length === 0) {
      throw new Error('Açık tarayıcı sekmesi bulunamadı.');
    }
    // En son aktif sayfayı belirler, eğer URL "about:blank" değilse onu kullanır
    let activePage = currentPages[currentPages.length - 1];
    for (let p of currentPages) {
      const u = p.url();
      if (u && u !== 'about:blank') {
        activePage = p;
      }
    }
    // Aktif sayfayı öne getirir ve ekran görüntüsü alır.
    await activePage.bringToFront();

    let pageTitle = '';
    try {
      pageTitle = await activePage.title();
    } catch (e) {
      pageTitle = `Ekran ${stepCount}`;
    }

    const finalTitle = (customTitle && customTitle.trim() !== '') 
      ? customTitle.trim() 
      : (pageTitle || `Ekran ${stepCount}`);

    console.log(`📸 Görüntü alınıyor: "${finalTitle}" (${activePage.url()})`);

    const imgPath = path.join(TEMP_IMG_DIR, `step_${stepCount}.png`);
    await activePage.screenshot({ path: imgPath, fullPage: false });
    console.log('✅ Ekran görüntüsü kaydedildi.');

    const imgBuffer = fs.readFileSync(imgPath);

    mainWindow.webContents.send('log', `🤖 [${selectedModel}] "${finalTitle}" inceleniyor...`);
    
    const desc = await explainScreenLikeIlksan(imgBuffer, finalTitle, apiKey, selectedModel);
    // Kılavuz formatına uygun şekilde docx paragraflarına dönüştürülür ve eklenir
    docParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: `${stepCount}. ${finalTitle}`, bold: true, size: 24, font: 'Calibri', color: '2E75B6' })],
        spacing: { before: 400, after: 150 }
      }),
      new Paragraph({
        children: [new ImageRun({ data: imgBuffer, type: 'png', transformation: { width: 580, height: 330 } })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      ...formatIlksanTextToDocx(desc)
    );

    console.log(`🎉 [Adım ${stepCount}] Kılavuza eklendi.`);
    mainWindow.webContents.send('log', `✅ [Adım ${stepCount}] "${finalTitle}" eklendi!`);
    stepCount++;
  } catch (err) {
    console.error('❌ Yakalama Hatası:', err);
    mainWindow.webContents.send('log', `❌ Hata: ${err.message}`);
  }
});

ipcMain.on('finish-manual', async () => {
  try {
    if (browser) await browser.close();

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Calibri', size: 21, color: '333333' } } } },
      sections: [{
        properties: { page: { margin: { top: 1200, bottom: 1200, left: 1400, right: 1400 } } },
        children: docParagraphs
      }]
    });

    const fileBuffer = await Packer.toBuffer(doc);
    const desktopPath = path.join(os.homedir(), 'Desktop');
    
    // Varsayılan dosya adı
    let fileName = 'Arayuzle_Uretilen_Kilavuz.docx';
    let outputPath = path.join(desktopPath, fileName);

    // Eğer masaüstünde aynı isimli dosya varsa çakışmayı önlemek için saat ekler
    if (fs.existsSync(outputPath)) {
      const now = new Date();
      const timeTag = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
      fileName = `Arayuzle_Uretilen_Kilavuz_${timeTag}.docx`;
      outputPath = path.join(desktopPath, fileName);
    }
    
    fs.writeFileSync(outputPath, fileBuffer);

    mainWindow.webContents.send('log', `🎉 Kılavuz masaüstüne "${fileName}" adıyla kaydedildi!`);
  } catch (err) {
    console.error('❌ Bitirme Hatası:', err);
    mainWindow.webContents.send('log', `❌ Hata: ${err.message}`);
  }
});
// Tüm pencereler kapatıldığında uygulamayı sonlandırır.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});