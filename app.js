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

const ADZILLA_SIZES = [
  { key: 'xsmall', label: 'X-Small', total: 2, price: 149 },
  { key: 'small', label: 'Small', total: 4, price: 199 },
  { key: 'medium', label: 'Medium', total: 5, price: 299 },
  { key: 'large', label: 'Large', total: 4, price: 449 },
  { key: 'xlarge', label: 'X-Large', total: 1, price: 749 }
];

const DEFAULT_CAMPAIGNS = [
  {
    id: 'winter-park-oct-2026',
    title: 'Winter Park — October Campaign',
    area: 'Winter Park',
    reach: '5,000 households',
    mailDate: 'October 26, 2026',
    availability: { xsmall: 2, small: 3, medium: 3, large: 2, xlarge: 1 }
  },
  {
    id: 'lake-nona-nov-2026',
    title: 'Lake Nona — November Campaign',
    area: 'Lake Nona',
    reach: '5,000 households',
    mailDate: 'November 23, 2026',
    availability: { xsmall: 2, small: 4, medium: 5, large: 4, xlarge: 1 }
  }
];

const DEFAULT_MY_CAMPAIGNS = [
  {
    id: 'east-orlando-sep-2026-medium',
    campaignId: 'east-orlando-sep-2026',
    title: 'East Orlando — September Campaign',
    area: 'East Orlando',
    reach: '5,000 households',
    mailDate: 'September 28, 2026',
    size: 'Medium',
    price: 299,
    status: 'Artwork needed'
  }
];

function ensureReservationStyles() {
  if (document.querySelector('link[data-reservation-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './reservation.css';
  link.dataset.reservationStyles = 'true';
  document.head.appendChild(link);
}

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

function getCampaigns() {
  try {
    const saved = JSON.parse(localStorage.getItem('starLabsAdzillaCampaigns'));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (error) {}
  return structuredClone(DEFAULT_CAMPAIGNS);
}

function saveCampaigns(campaigns) {
  localStorage.setItem('starLabsAdzillaCampaigns', JSON.stringify(campaigns));
}

function getMyCampaigns() {
  try {
    const saved = JSON.parse(localStorage.getItem('starLabsMyAdzillaCampaigns'));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (error) {}
  return structuredClone(DEFAULT_MY_CAMPAIGNS);
}

function saveMyCampaigns(campaigns) {
  localStorage.setItem('starLabsMyAdzillaCampaigns', JSON.stringify(campaigns));
}

function totalAvailable(campaign) {
  return ADZILLA_SIZES.reduce((sum, size) => sum + Math.max(0, Number(campaign.availability[size.key] || 0)), 0);
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildReservationHub() {
  const adzilla = document.getElementById('adzilla');
  if (!adzilla || document.getElementById('adzillaReservationHub')) return;

  const legacyInventory = adzilla.querySelector('.inventory-panel');
  if (legacyInventory) legacyInventory.style.display = 'none';

  const hub = document.createElement('div');
  hub.id = 'adzillaReservationHub';
  hub.className = 'reservation-hub';
  hub.innerHTML = `
    <div class="reservation-tabs" role="tablist" aria-label="Adzilla campaign views">
      <button class="reservation-tab active" type="button" data-reservation-tab="available">Reserve a Campaign</button>
      <button class="reservation-tab" type="button" data-reservation-tab="mine">My Campaigns</button>
    </div>
    <div id="reservationAvailable" class="campaign-market"></div>
    <div id="reservationMine" class="campaign-market" hidden></div>
  `;

  const hero = adzilla.querySelector('.adzilla-hero');
  adzilla.insertBefore(hub, hero || adzilla.firstChild);

  const modal = document.createElement('div');
  modal.id = 'reservationModal';
  modal.className = 'reservation-modal-backdrop hidden';
  modal.innerHTML = `
    <div class="reservation-modal" role="dialog" aria-modal="true" aria-labelledby="reservationModalTitle">
      <div class="reservation-modal-head">
        <div>
          <p class="eyebrow">Reserve your spot</p>
          <h3 id="reservationModalTitle">Adzilla campaign</h3>
          <p class="muted" id="reservationModalMeta"></p>
        </div>
        <button class="reservation-close" type="button" id="reservationClose" aria-label="Close reservation">×</button>
      </div>
      <form id="reservationForm" class="reservation-form">
        <input type="hidden" id="reservationCampaignId" />
        <input type="hidden" id="reservationSizeKey" />
        <div class="reservation-summary">
          <div><span>Ad size</span><strong id="reservationSize"></strong></div>
          <div><span>Campaign price</span><strong id="reservationPrice"></strong></div>
        </div>
        <div>
          <label for="reservationBusiness">Business name</label>
          <input id="reservationBusiness" value="Demo Business" required />
        </div>
        <div>
          <label for="reservationWebsite">Website</label>
          <input id="reservationWebsite" type="url" placeholder="https://yourbusiness.com" />
        </div>
        <div>
          <label for="reservationDesign">Artwork</label>
          <select id="reservationDesign">
            <option value="client">I'll provide my own artwork</option>
            <option value="starlabs">Have Star Labs design it — $75</option>
          </select>
        </div>
        <p class="reservation-note">Confirming reserves one spot in this campaign. Payment processing will be connected to this step when production billing is enabled.</p>
        <div class="reservation-actions">
          <button class="reservation-cancel" id="reservationCancel" type="button">Cancel</button>
          <button class="reservation-confirm" type="submit">Confirm reservation</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  hub.querySelectorAll('[data-reservation-tab]').forEach(button => {
    button.addEventListener('click', () => setReservationTab(button.dataset.reservationTab));
  });

  document.getElementById('reservationClose')?.addEventListener('click', closeReservationModal);
  document.getElementById('reservationCancel')?.addEventListener('click', closeReservationModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeReservationModal();
  });
  document.getElementById('reservationForm')?.addEventListener('submit', confirmReservation);

  renderReservationHub();
}

function setReservationTab(tab) {
  document.querySelectorAll('[data-reservation-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.reservationTab === tab);
  });
  const available = document.getElementById('reservationAvailable');
  const mine = document.getElementById('reservationMine');
  if (!available || !mine) return;
  available.hidden = tab !== 'available';
  mine.hidden = tab !== 'mine';
}

function renderReservationHub() {
  const campaigns = getCampaigns();
  const availableRoot = document.getElementById('reservationAvailable');
  const mineRoot = document.getElementById('reservationMine');
  if (!availableRoot || !mineRoot) return;

  availableRoot.innerHTML = campaigns.map(campaign => {
    const total = totalAvailable(campaign);
    const options = ADZILLA_SIZES.map(size => {
      const available = Math.max(0, Number(campaign.availability[size.key] || 0));
      const soldOut = available === 0;
      return `
        <div class="availability-option ${soldOut ? 'sold-out' : ''}">
          <span class="size-name">${size.label}</span>
          <span class="count">${available} of ${size.total} available</span>
          <span class="price">${money(size.price)}</span>
          <button type="button" data-reserve-campaign="${campaign.id}" data-reserve-size="${size.key}" ${soldOut ? 'disabled' : ''}>${soldOut ? 'Reserved' : 'Reserve'}</button>
        </div>
      `;
    }).join('');

    return `
      <article class="campaign-market-card">
        <div class="campaign-market-top">
          <div>
            <p class="eyebrow"><span class="live-dot"></span>Campaign availability</p>
            <h4>${escapeHtml(campaign.title)}</h4>
            <p class="muted">${escapeHtml(campaign.reach)} · Mail date ${escapeHtml(campaign.mailDate)}</p>
          </div>
          <div class="availability-total"><strong>${total} of 16</strong><span>available</span></div>
        </div>
        <div class="availability-list">${options}</div>
        <div class="campaign-market-footer">
          <small>Availability updates immediately after a reservation is confirmed.</small>
          <span class="status-pill ${total ? 'success' : 'warning'}">${total ? 'Reservations open' : 'Fully reserved'}</span>
        </div>
      </article>
    `;
  }).join('');

  availableRoot.querySelectorAll('[data-reserve-campaign]').forEach(button => {
    button.addEventListener('click', () => openReservationModal(button.dataset.reserveCampaign, button.dataset.reserveSize));
  });

  const myCampaigns = getMyCampaigns();
  mineRoot.innerHTML = myCampaigns.length ? `
    <div class="my-campaigns-list">
      ${myCampaigns.map(campaign => `
        <article class="my-campaign-row">
          <div><small>Campaign</small><strong>${escapeHtml(campaign.title)}</strong></div>
          <div><small>Ad size</small><strong>${escapeHtml(campaign.size)}</strong></div>
          <div><small>Mail date</small><strong>${escapeHtml(campaign.mailDate)}</strong></div>
          <div><small>Status</small><strong>${escapeHtml(campaign.status)}</strong></div>
        </article>
      `).join('')}
    </div>
  ` : '<div class="reservation-empty">You do not have any Adzilla campaigns yet.</div>';
}

function openReservationModal(campaignId, sizeKey) {
  const campaigns = getCampaigns();
  const campaign = campaigns.find(item => item.id === campaignId);
  const size = ADZILLA_SIZES.find(item => item.key === sizeKey);
  if (!campaign || !size) return;

  const available = Number(campaign.availability[sizeKey] || 0);
  if (available <= 0) {
    showToast(`${size.label} is no longer available in this campaign.`);
    renderReservationHub();
    return;
  }

  document.getElementById('reservationCampaignId').value = campaign.id;
  document.getElementById('reservationSizeKey').value = size.key;
  document.getElementById('reservationModalTitle').textContent = campaign.title;
  document.getElementById('reservationModalMeta').textContent = `${campaign.reach} · Mail date ${campaign.mailDate}`;
  document.getElementById('reservationSize').textContent = size.label;
  document.getElementById('reservationPrice').textContent = money(size.price);
  document.getElementById('reservationModal').classList.remove('hidden');
  document.getElementById('reservationBusiness')?.focus();
}

function closeReservationModal() {
  document.getElementById('reservationModal')?.classList.add('hidden');
}

function confirmReservation(event) {
  event.preventDefault();
  const campaignId = document.getElementById('reservationCampaignId').value;
  const sizeKey = document.getElementById('reservationSizeKey').value;
  const business = document.getElementById('reservationBusiness').value.trim();
  const design = document.getElementById('reservationDesign').value;

  const campaigns = getCampaigns();
  const campaign = campaigns.find(item => item.id === campaignId);
  const size = ADZILLA_SIZES.find(item => item.key === sizeKey);

  if (!campaign || !size || !business) {
    showToast('Complete the reservation details first.');
    return;
  }

  const available = Number(campaign.availability[sizeKey] || 0);
  if (available <= 0) {
    closeReservationModal();
    renderReservationHub();
    showToast(`${size.label} was just reserved. Choose another available size.`);
    return;
  }

  campaign.availability[sizeKey] = available - 1;
  saveCampaigns(campaigns);

  const myCampaigns = getMyCampaigns();
  myCampaigns.unshift({
    id: `${campaignId}-${sizeKey}-${Date.now()}`,
    campaignId,
    title: campaign.title,
    area: campaign.area,
    reach: campaign.reach,
    mailDate: campaign.mailDate,
    size: size.label,
    price: size.price + (design === 'starlabs' ? 75 : 0),
    status: design === 'starlabs' ? 'Design requested' : 'Artwork needed'
  });
  saveMyCampaigns(myCampaigns);

  closeReservationModal();
  renderReservationHub();
  setReservationTab('mine');
  showToast(`${size.label} reserved for ${business}.`);
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

ensureReservationStyles();
normalizeAdzillaTerminology();
buildReservationHub();

if (localStorage.getItem('starLabsPortalDemoSession') === '1') {
  enterPortal();
}
