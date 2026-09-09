const puppeteer = require('puppeteer');
const fs = require('fs');

let browser = null;

async function initBrowser() {
  const getBrowserPath = () => {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    return paths.find(p => fs.existsSync(p)) || null;
  };

  browser = await puppeteer.launch({
    headless: false,
    executablePath: getBrowserPath(),
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--ignore-certificate-errors']
  });
  
  const pages = await browser.pages();
  const initialPage = pages.length > 0 ? pages[0] : await browser.newPage();
  await initialPage.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  await initialPage.goto('about:blank');
}

async function captureActivePage(imgPath, customTitle, stepCount) {
  if (!browser) throw new Error('Tarayıcı henüz aktif değil.');

  const currentPages = await browser.pages();
  if (!currentPages || currentPages.length === 0) {
    throw new Error('Açık tarayıcı sekmesi bulunamadı.');
  }
  
  let activePage = currentPages[currentPages.length - 1];
  for (let p of currentPages) {
    const u = p.url();
    if (u && u !== 'about:blank') activePage = p;
  }
  
  await activePage.bringToFront();

  let pageTitle = '';
  try { pageTitle = await activePage.title(); } catch (e) { pageTitle = `Ekran ${stepCount}`; }

  const finalTitle = (customTitle && customTitle.trim() !== '') ? customTitle.trim() : (pageTitle || `Ekran ${stepCount}`);

  await activePage.screenshot({ path: imgPath, fullPage: false });
  
  return finalTitle;
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

module.exports = { initBrowser, captureActivePage, closeBrowser };