const { ipcRenderer } = require('electron');

const moduleNameInput = document.getElementById('moduleName');
const titleInput = document.getElementById('title');
const aiModelSelect = document.getElementById('aiModel');
const captureBtn = document.getElementById('captureBtn');
const finishBtn = document.getElementById('finishBtn');
const logArea = document.getElementById('logArea');

const reopenBtn = document.getElementById('reopenBtn');
const browserIndicator = document.getElementById('browserIndicator');

// AYARLAR BÖLÜMÜ TANIMLAMALARI (HTML'deki id'lerle birebir eşleşiyor)
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const key1Input = document.getElementById('apiKey1');
const key2Input = document.getElementById('apiKey2');
const key3Input = document.getElementById('apiKey3');

const galleryContainer = document.getElementById('gallery-container');
const screenList = document.getElementById('screen-list');
let draggedItem = null;

// Uygulama açıldığında localStorage'dan kayıtlı anahtarları doldur
window.addEventListener('DOMContentLoaded', () => {
  key1Input.value = localStorage.getItem('geminiKey1') || '';
  key2Input.value = localStorage.getItem('geminiKey2') || '';
  key3Input.value = localStorage.getItem('geminiKey3') || '';
});

// Modal Açma / Kapama İşlemleri
settingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'block';
});

closeSettings.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

window.addEventListener('click', (e) => { 
  if (e.target === settingsModal) {
    settingsModal.style.display = 'none'; 
  }
});

// Ayarları Kaydet Butonu
saveSettingsBtn.addEventListener('click', () => {
  localStorage.setItem('geminiKey1', key1Input.value.trim());
  localStorage.setItem('geminiKey2', key2Input.value.trim());
  localStorage.setItem('geminiKey3', key3Input.value.trim());
  settingsModal.style.display = 'none';
  logArea.innerHTML = "✅ API Ayarları başarıyla kaydedildi.";
});

// Ekranı Yakala Butonu
captureBtn.addEventListener('click', () => {
  // 3 inputtaki anahtarları al, boş olanları filtrele
  const keysArray = [
    key1Input.value.trim(),
    key2Input.value.trim(),
    key3Input.value.trim()
  ].filter(key => key.length > 0);

  if (keysArray.length === 0) {
    logArea.innerHTML = "❌ Hata: Ayarlar (⚙️) menüsünden en az 1 API Key girmelisiniz!";
    settingsModal.style.display = 'block'; // Kullanıcı kolayca bulsun diye modalı açıyoruz
    return;
  }
  
  captureBtn.disabled = true;
  captureBtn.innerHTML = "⏳ İşleniyor...";

  // Arka plana temiz dizi halinde gönderiyoruz
  ipcRenderer.send('capture-screen', {
    apiKeys: keysArray, 
    moduleName: moduleNameInput.value.trim(),
    title: titleInput.value.trim(),
    modelName: aiModelSelect.value 
  });
  
  titleInput.value = ''; 
});

finishBtn.addEventListener('click', () => {
  ipcRenderer.send('finish-manual');
  setTimeout(() => {
    screenList.innerHTML = '';
    galleryContainer.style.display = 'none';
  }, 2000);
});

ipcRenderer.on('log', (event, message) => {
  logArea.innerHTML = message;
  if (message.includes('❌')) {
    captureBtn.disabled = false;
    captureBtn.innerHTML = "📸 Ekranı Yakala";
  }
});

ipcRenderer.on('screen-added', (event, screen) => {
  captureBtn.disabled = false;
  captureBtn.innerHTML = "📸 Ekranı Yakala";
  galleryContainer.style.display = 'block';

  const li = document.createElement('li');
  li.dataset.id = screen.id;
  li.draggable = true;

  li.innerHTML = `
    <span><strong style="cursor: grab; margin-right: 8px; color: #888;">☰</strong> [${screen.moduleName}] ${screen.title}</span>
    <button class="delete-btn">Sil</button>
  `;

  li.querySelector('.delete-btn').addEventListener('click', () => {
    li.remove();
    ipcRenderer.send('delete-screen', screen.id);
    if (screenList.children.length === 0) galleryContainer.style.display = 'none';
  });

  li.addEventListener('dragstart', function(e) {
    draggedItem = li;
    setTimeout(() => li.style.opacity = '0.5', 0);
  });

  li.addEventListener('dragend', function() {
    setTimeout(() => {
      draggedItem.style.opacity = '1';
      draggedItem = null;
      sendNewOrder();
    }, 0);
  });

  li.addEventListener('dragover', (e) => e.preventDefault());

  li.addEventListener('drop', function(e) {
    e.preventDefault();
    if (this !== draggedItem) {
      let allItems = [...screenList.querySelectorAll('li')];
      let draggedIndex = allItems.indexOf(draggedItem);
      let targetIndex = allItems.indexOf(this);
      
      if (draggedIndex < targetIndex) this.after(draggedItem);
      else this.before(draggedItem);
    }
  });

  screenList.appendChild(li);
});

function sendNewOrder() {
  const currentList = document.querySelectorAll('#screen-list li');
  const newOrderIds = Array.from(currentList).map(item => item.dataset.id);
  ipcRenderer.send('reorder-screens', newOrderIds);
}

ipcRenderer.on('browser-status', (event, isConnected) => {
  if (isConnected) {
    browserIndicator.innerHTML = "🟢 Tarayıcı Bağlı";
    browserIndicator.style.color = "#2ecc71";
    reopenBtn.style.display = "none";
    captureBtn.disabled = false; 
  } else {
    browserIndicator.innerHTML = "🔴 Bağlantı Koptu";
    browserIndicator.style.color = "#e74c3c";
    reopenBtn.style.display = "block";
    captureBtn.disabled = true; 
  }
});

reopenBtn.addEventListener('click', () => {
  reopenBtn.disabled = true; 
  reopenBtn.innerHTML = "Açılıyor...";
  ipcRenderer.send('reopen-browser');
  setTimeout(() => {
    reopenBtn.disabled = false;
    reopenBtn.innerHTML = "🔄 Yeniden Aç";
  }, 2000);
});