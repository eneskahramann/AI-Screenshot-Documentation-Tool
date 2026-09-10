const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Servisleri çağırıyoruz
const { explainScreenLikeIlksan } = require('./services/aiService');
const { initBrowser, captureActivePage, closeBrowser, setDisconnectCallback } = require('./services/browserService');
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
    height: 640, 
    alwaysOnTop: true,
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  
  // WINDOWS İÇİN ZORUNLU ALWAYS ON TOP AYARLARI
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));

  // Pencere kapatıldığında referansını tamamen sil
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Pencere yok edilmişse log göndermeye çalışma
const sendLog = (msg) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log', msg);
  }
};

app.whenReady().then(async () => {
  createWindow();
  
  // Pencere yok edilmişse arayüze sinyal gönderme
  setDisconnectCallback(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser-status', false);
      sendLog('🔴 Tarayıcı kapatıldı!');
    }
  });

  try {
    sendLog('⏳ Tarayıcı başlatılıyor...');
    await initBrowser();
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser-status', true); 
      sendLog('🟢 Tarayıcı başarıyla açıldı!');
    }
  } catch (err) {
    sendLog(`❌ Tarayıcı Başlatılamadı: ${err.message}`);
    console.error("Tarayıcı hatası:", err);
  }
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

ipcMain.on('reopen-browser', async () => {
  try {
    sendLog('⏳ Tarayıcı başlatılıyor...');
    await initBrowser();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser-status', true);
    }
    sendLog('🟢 Tarayıcı başarıyla açıldı!');
  } catch (err) {
    sendLog(`❌ Hata: ${err.message}`);
  }
});

ipcMain.on('capture-screen', async (event, data) => {
  try {
    const imgPath = path.join(TEMP_IMG_DIR, `step_${stepCount}.jpg`);
    
    const finalTitle = await captureActivePage(imgPath, data.title, stepCount);
    
    sendLog(`🤖 [${data.modelName}] "${finalTitle}" inceleniyor...`);
    const imgBuffer = fs.readFileSync(imgPath);
    
    // 🔥 DÜZELTİLEN KISIM: data.apiKey yerine data.apiKeys yazıldı
    const desc = await explainScreenLikeIlksan(imgBuffer, finalTitle, data.apiKeys, data.modelName, sendLog);
    
    const screenData = { 
      id: Date.now().toString(), 
      moduleName: data.moduleName || "Genel İşlemler", 
      title: finalTitle, 
      imagePath: imgPath, 
      description: desc 
    };
    capturedScreens.push(screenData);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('screen-added', screenData); 
    }
    sendLog(`✅ "${finalTitle}" galeriye eklendi!`);
    stepCount++;
  } catch (err) {
    sendLog(`❌ Hata: ${err.message}`);
  }
});

ipcMain.on('finish-manual', async () => {
  try {
    await closeBrowser();
    const fileName = await generateDocx(capturedScreens); 
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