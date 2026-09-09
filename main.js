const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Servisleri çağırıyoruz (Yolların doğru olduğundan emin ol)
const { explainScreenLikeIlksan } = require('./services/aiService');
const { initBrowser, captureActivePage, closeBrowser } = require('./services/browserService');
const { generateDocx } = require('./services/documentService');

const baseDir = app.isPackaged ? path.dirname(process.execPath) : __dirname;
const TEMP_IMG_DIR = path.join(baseDir, 'temp_screenshots');
if (!fs.existsSync(TEMP_IMG_DIR)) fs.mkdirSync(TEMP_IMG_DIR, { recursive: true });

let mainWindow = null;
let stepCount = 1;
let capturedScreens = []; 

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 640, // Yeni input alanı için yüksekliği biraz artırdık
    alwaysOnTop: true,
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  
  // WINDOWS İÇİN ZORUNLU ALWAYS ON TOP AYARLARI
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));
}

const sendLog = (msg) => mainWindow?.webContents.send('log', msg);

app.whenReady().then(async () => {
  createWindow();
  await initBrowser();
});

ipcMain.on('delete-screen', (event, id) => {
  capturedScreens = capturedScreens.filter(screen => screen.id !== id);
});

ipcMain.on('reorder-screens', (event, newOrderIds) => {
  const reordered = [];
  newOrderIds.forEach(id => {
    const item = capturedScreens.find(s => s.id === id);
    if(item) reordered.push(item);
  });
  capturedScreens = reordered;
});

ipcMain.on('capture-screen', async (event, data) => {
  try {
    const imgPath = path.join(TEMP_IMG_DIR, `step_${stepCount}.png`);
    
    // 1. EKRANI YAKALA
    const finalTitle = await captureActivePage(imgPath, data.title, stepCount);
    
    // 2. YAPAY ZEKAYA GÖNDER
    sendLog(`🤖 [${data.modelName}] "${finalTitle}" inceleniyor...`);
    const imgBuffer = fs.readFileSync(imgPath);
    const desc = await explainScreenLikeIlksan(imgBuffer, finalTitle, data.apiKey, data.modelName, sendLog);
    
    // 3. DİZİYE EKLE (Ana Modül adını da burada objeye ekliyoruz)
    const screenData = { 
      id: Date.now().toString(), 
      moduleName: data.moduleName || "Genel İşlemler", // Arayüzden gelen ana başlık
      title: finalTitle, 
      imagePath: imgPath, 
      description: desc 
    };
    capturedScreens.push(screenData);

    // 4. ARAYÜZÜ GÜNCELLE
    mainWindow.webContents.send('screen-added', screenData); 
    sendLog(`✅ "${finalTitle}" galeriye eklendi!`);
    stepCount++;
  } catch (err) {
    sendLog(`❌ Hata: ${err.message}`);
  }
});

ipcMain.on('finish-manual', async () => {
  try {
    await closeBrowser();
    const fileName = await generateDocx(capturedScreens); // documentService'e gönder
    sendLog(`🎉 Kılavuz "${fileName}" adıyla kaydedildi!`);
    
    capturedScreens = [];
    stepCount = 1;
  } catch (err) {
    sendLog(`❌ Hata: ${err.message}`);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});