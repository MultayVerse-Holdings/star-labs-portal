const loginView = document.getElementById('loginView');
const portalView = document.getElementById('portalView');
const loginForm = document.getElementById('loginForm');
const logoutButton = document.getElementById('logoutButton');
const menuButton = document.getElementById('menuButton');
const sidebar = document.querySelector('.sidebar');
const navItems = [...document.querySelectorAll('.nav-item')];
const views = [...document.querySelectorAll('.view')];
const pageTitle = document.getElementById('pageTitle');
const toast = document.getElementById('toast');
const artworkUpload = document.getElementById('artworkUpload');
const uploadList = document.getElementById('uploadList');

const titles = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  adzilla: 'Adzilla',
  files: 'Files',
  billing: 'Billing',
  account: 'Account'
};

function normalizeAdzillaTerminology() {
  const replacements = new Map([
    ['East Orlando Adzilla — September Drop', 'East Orlando Adzilla — September Campaign'],
    ['Medium ad · September Drop', 'Medium ad · September Campaign'],
    ['East Orlando — September Drop', 'East Orlando — September Campaign'],
    ['Browse upcoming drops', 'Browse upcoming campaigns']
  ]);

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach(node => {
    const value = node.nodeValue.trim();
    if (replacements.has(value)) {
      node.nodeValue = node.nodeValue.replace(value, replacements.get(value));
    }
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function enterPortal() {
  localStorage.setItem('starLabsPortalDemoSession', '1');
  loginView.classList.add('hidden');
  portalView.classList.remove('hidden');
  switchView(localStorage.getItem('starLabsPortalView') || 'dashboard');
}

function leavePortal() {
  localStorage.removeItem('starLabsPortalDemoSession');
  portalView.classList.add('hidden');
  loginView.classList.remove('hidden');
  sidebar.classList.remove('open');
}

function switchView(viewName) {
  if (!titles[viewName]) viewName = 'dashboard';
  views.forEach(view => view.classList.toggle('active-view', view.id === viewName));
  navItems.forEach(item => item.classList.toggle('active', item.dataset.view === viewName));
  pageTitle.textContent = titles[viewName];
  localStorage.setItem('starLabsPortalView', viewName);
  sidebar.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

loginForm?.addEventListener('submit', event => {
  event.preventDefault();
  enterPortal();
});

logoutButton?.addEventListener('click', leavePortal);
menuButton?.addEventListener('click', () => sidebar.classList.toggle('open'));

navItems.forEach(item => {
  item.addEventListener('click', () => switchView(item.dataset.view));
});

document.querySelectorAll('[data-jump]').forEach(button => {
  button.addEventListener('click', () => switchView(button.dataset.jump));
});

document.getElementById('forgotPassword')?.addEventListener('click', () => {
  showToast('Password reset will be connected when production authentication is added.');
});

document.getElementById('supportButton')?.addEventListener('click', () => {
  showToast('Support messaging is next in the portal build.');
});

document.getElementById('requestDesign')?.addEventListener('click', () => {
  showToast('Design request selected. Star Labs design service: $75.');
});

document.getElementById('submitArtwork')?.addEventListener('click', () => {
  if (!artworkUpload.files.length) {
    showToast('Add at least one artwork or brand file first.');
    return;
  }
  showToast('Artwork staged successfully. Production upload storage will be connected next.');
});

document.getElementById('uploadFileButton')?.addEventListener('click', () => {
  showToast('General file uploads will use the same storage layer as Adzilla artwork.');
});

artworkUpload?.addEventListener('change', () => {
  uploadList.innerHTML = '';
  [...artworkUpload.files].forEach(file => {
    const item = document.createElement('div');
    item.className = 'uploaded-file';
    item.innerHTML = `<span>${file.name}</span><span>${formatBytes(file.size)}</span>`;
    uploadList.appendChild(item);
  });
});

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

document.getElementById('profileForm')?.addEventListener('submit', event => {
  event.preventDefault();
  showToast('Business profile changes saved in the MVP preview.');
});

document.getElementById('securityForm')?.addEventListener('submit', event => {
  event.preventDefault();
  showToast('Password changes will be enabled with production authentication.');
});

document.addEventListener('click', event => {
  if (window.innerWidth <= 800 && sidebar.classList.contains('open') && !sidebar.contains(event.target) && event.target !== menuButton) {
    sidebar.classList.remove('open');
  }
});

normalizeAdzillaTerminology();

if (localStorage.getItem('starLabsPortalDemoSession') === '1') {
  enterPortal();
}
