const { ipcRenderer } = require('electron');

const apiKeyInput = document.getElementById('apiKey');
const moduleNameInput = document.getElementById('moduleName'); // YENİ EKLENDİ
const titleInput = document.getElementById('title');
const aiModelSelect = document.getElementById('aiModel');
const captureBtn = document.getElementById('captureBtn');
const finishBtn = document.getElementById('finishBtn');
const logArea = document.getElementById('logArea');

const galleryContainer = document.getElementById('gallery-container');
const screenList = document.getElementById('screen-list');
let draggedItem = null;

if (localStorage.getItem('geminiApiKey')) {
  apiKeyInput.value = localStorage.getItem('geminiApiKey');
}

captureBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    logArea.innerHTML = "❌ Hata: API Key girmelisiniz!";
    return;
  }
  
  localStorage.setItem('geminiApiKey', key);
  
  // Veriyi arka plana yolluyoruz
  ipcRenderer.send('capture-screen', {
    apiKey: key,
    moduleName: moduleNameInput.value.trim(), // ANA MODÜL ADI GİDİYOR
    title: titleInput.value.trim(),
    modelName: aiModelSelect.value 
  });
  
  titleInput.value = ''; // Çektikten sonra ekran başlığını temizle (Ana modül adı sabit kalsın ki sürekli yazma)
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
});

ipcRenderer.on('screen-added', (event, screen) => {
  galleryContainer.style.display = 'block';

  const li = document.createElement('li');
  li.dataset.id = screen.id;
  li.draggable = true;

  // Ekranda modül adını da ufakça gösterelim ki neye ait olduğunu bilelim
  li.innerHTML = `
    <span><strong style="cursor: grab; margin-right: 8px; color: #888;">☰</strong> [${screen.moduleName}] ${screen.title}</span>
    <button class="delete-btn">Sil</button>
  `;

  li.querySelector('.delete-btn').addEventListener('click', () => {
    li.remove();
    ipcRenderer.send('delete-screen', screen.id);
    
    if (screenList.children.length === 0) {
      galleryContainer.style.display = 'none';
    }
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

  li.addEventListener('dragover', function(e) {
    e.preventDefault();
  });

  li.addEventListener('drop', function(e) {
    e.preventDefault();
    if (this !== draggedItem) {
      let allItems = [...screenList.querySelectorAll('li')];
      let draggedIndex = allItems.indexOf(draggedItem);
      let targetIndex = allItems.indexOf(this);
      
      if (draggedIndex < targetIndex) {
        this.after(draggedItem);
      } else {
        this.before(draggedItem);
      }
    }
  });

  screenList.appendChild(li);
});

function sendNewOrder() {
  const currentList = document.querySelectorAll('#screen-list li');
  const newOrderIds = Array.from(currentList).map(item => item.dataset.id);
  ipcRenderer.send('reorder-screens', newOrderIds);
}