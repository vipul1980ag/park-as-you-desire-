/* ============================================================
   Park As You Desire — Driver Portal (portal.js)
   API: http://localhost:3002/api
   ============================================================ */

'use strict';

const API = '/api';

/* ---------- State ---------- */
let allParkings      = [];
let filteredParkings = [];
let userLat          = null;
let userLng          = null;
let activeTab        = 'planner';
let activeFilter     = 'all';
let selectedParking  = null;

/* ============================================================
   MOCK DATA (used if API is unavailable)
   ============================================================ */
const MOCK_PARKINGS = [
  {
    _id: 'mock1',
    name: 'City Centre Car Park A',
    address: '12 Market Street, London, EC1A 1BB',
    lat: 51.5155, lng: -0.0922,
    type: 1, typeName: 'Dedicated Parking',
    costPerHour: 3.50, costPerDay: 18.00,
    totalSpots: 120, availableSpots: 45,
    availableDays: ['Mon','Tue','Wed','Thu','Fri','Sat'],
    openTime: '06:00', closeTime: '23:00',
    description: 'Multi-storey car park with 24/7 CCTV and EV charging points.',
    isActive: true, ownerId: 'owner1'
  },
  {
    _id: 'mock2',
    name: 'Riverside Street Parking',
    address: '88 Thames Embankment, London, SE1 2UP',
    lat: 51.5052, lng: -0.1152,
    type: 2, typeName: 'Street Parking',
    costPerHour: 1.50, costPerDay: 0,
    totalSpots: 30, availableSpots: 8,
    availableDays: ['Mon','Tue','Wed','Thu','Fri'],
    openTime: '08:00', closeTime: '20:00',
    description: 'On-street pay & display parking along the riverside.',
    isActive: true, ownerId: 'owner2'
  },
  {
    _id: 'mock3',
    name: 'Shoreditch Private Lot',
    address: '5 Brick Lane, London, E1 6RF',
    lat: 51.5224, lng: -0.0718,
    type: 3, typeName: 'Private Open Lot',
    costPerHour: 2.00, costPerDay: 12.00,
    totalSpots: 50, availableSpots: 22,
    availableDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    openTime: '00:00', closeTime: '23:59',
    description: 'Open-air private lot with barrier access.',
    isActive: true, ownerId: 'owner1'
  },
  {
    _id: 'mock4',
    name: 'Kings Cross Unlocked Garage',
    address: '200 York Way, London, N1C 4AU',
    lat: 51.5320, lng: -0.1233,
    type: 4, typeName: 'Unlocked Garage',
    costPerHour: 4.00, costPerDay: 25.00,
    totalSpots: 80, availableSpots: 3,
    availableDays: ['Mon','Tue','Wed','Thu','Fri'],
    openTime: '07:00', closeTime: '21:00',
    description: 'Covered garage near King\'s Cross station.',
    isActive: true, ownerId: 'owner3'
  },
  {
    _id: 'mock5',
    name: 'Canary Wharf Locked Car Park',
    address: '1 Canada Square, London, E14 5AB',
    lat: 51.5035, lng: -0.0197,
    type: 7, typeName: 'Locked Garage',
    costPerHour: 5.50, costPerDay: 32.00,
    totalSpots: 200, availableSpots: 0,
    availableDays: ['Mon','Tue','Wed','Thu','Fri'],
    openTime: '06:30', closeTime: '22:30',
    description: 'Premium secured parking in Canary Wharf financial district.',
    isActive: true, ownerId: 'owner2'
  },
  {
    _id: 'mock6',
    name: 'Soho Budget Parking',
    address: '42 Dean Street, London, W1D 4PY',
    lat: 51.5137, lng: -0.1318,
    type: 6, typeName: 'Unlocked Lot',
    costPerHour: 1.00, costPerDay: 8.00,
    totalSpots: 25, availableSpots: 12,
    availableDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    openTime: '09:00', closeTime: '21:00',
    description: 'Budget-friendly open lot in the heart of Soho.',
    isActive: true, ownerId: 'owner1'
  }
];

/* ============================================================
   PARKING TYPE HELPERS
   ============================================================ */
const TYPE_NAMES = {
  1: 'Dedicated Parking',
  2: 'Street Parking',
  3: 'Private Open Lot',
  4: 'Unlocked Garage',
  5: 'Unlocked Car Park',
  6: 'Unlocked Lot',
  7: 'Locked Garage',
  8: 'Locked Car Park',
  9: 'Locked Lot'
};

function getTypeBadgeClass(type) {
  const t = parseInt(type, 10);
  if (t <= 2) return `badge-type-${t}`;
  if (t === 3) return 'badge-type-3';
  if (t <= 6) return 'badge-type-4';
  return 'badge-type-7';
}

function getCardBorderClass(type) {
  const t = parseInt(type, 10);
  if (t === 1) return '';                    // default blue
  if (t === 2) return 'type-street';         // green
  if (t === 3) return 'type-private-open';   // purple
  if (t <= 6)  return 'type-unlocked';       // orange
  return 'type-locked';                      // red
}

function getTypeName(p) {
  return p.typeName || TYPE_NAMES[p.type] || `Type ${p.type}`;
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Set default date/time
  const now = new Date();
  const dateInput = document.getElementById('plannerDate');
  const timeInput = document.getElementById('plannerTime');
  if (dateInput) dateInput.value = now.toISOString().slice(0, 10);
  if (timeInput) timeInput.value = now.toTimeString().slice(0, 5);

  // Wire up priority radios
  wirePriorityOptions();

  // Fetch all parkings on load
  loadAllParkings();
});

/* ============================================================
   PRIORITY RADIO WIRING
   ============================================================ */
function wirePriorityOptions() {
  document.querySelectorAll('.priority-option').forEach(opt => {
    opt.addEventListener('click', function() {
      const name = this.querySelector('input[type="radio"]').name;
      document.querySelectorAll(`.priority-option input[name="${name}"]`).forEach(r => {
        r.closest('.priority-option').classList.remove('selected');
      });
      this.classList.add('selected');
      this.querySelector('input[type="radio"]').checked = true;
    });
  });
}

/* ============================================================
   TAB SWITCHING
   ============================================================ */
function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tabPlannerBtn').classList.toggle('active', tab === 'planner');
  document.getElementById('tabTrackBtn').classList.toggle('active', tab === 'track');
  document.getElementById('tabPlanner').classList.toggle('active', tab === 'planner');
  document.getElementById('tabTrack').classList.toggle('active', tab === 'track');
}

/* ============================================================
   GPS LOCATION
   ============================================================ */
function getGPSLocation(context) {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }

  const btn = context === 'planner'
    ? document.getElementById('plannerGpsBtn')
    : document.getElementById('detectBtn');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = context === 'planner'
      ? '<span class="spinner spinner-white" style="width:14px;height:14px;border-width:2px;"></span>'
      : '⏳ Detecting…';
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;

      const locStr = `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`;

      if (context === 'planner') {
        const fromInput = document.getElementById('plannerFrom');
        if (fromInput) fromInput.value = locStr;
        showToast('📍 Location detected!', 'success');
        if (btn) { btn.disabled = false; btn.innerHTML = '📍'; }
      } else {
        const locEl  = document.getElementById('detectedLoc');
        const textEl = document.getElementById('detectedLocText');
        if (textEl) textEl.textContent = locStr;
        if (locEl)  locEl.classList.add('show');
        showToast('📍 Location detected!', 'success');
        if (btn) { btn.disabled = false; btn.innerHTML = '📍 Detect My Location'; }
      }
    },
    err => {
      let msg = 'Could not detect location.';
      if (err.code === 1) msg = 'Location access denied. Please allow location permission.';
      if (err.code === 2) msg = 'Location unavailable. Please try again.';
      if (err.code === 3) msg = 'Location request timed out.';
      showToast(msg, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = context === 'planner' ? '📍' : '📍 Detect My Location';
      }
      // Use a default location for demo
      userLat = 51.5074;
      userLng = -0.1278;
    },
    { timeout: 10000, maximumAge: 60000 }
  );
}

/* ============================================================
   LOAD ALL PARKINGS (on page load)
   ============================================================ */
async function loadAllParkings() {
  showLoading(true);
  try {
    const res = await fetch(`${API}/parkings`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    allParkings = Array.isArray(data) ? data : (data.parkings || data.data || []);
    if (allParkings.length === 0) throw new Error('Empty response');
  } catch (err) {
    console.warn('API unavailable, using mock data:', err.message);
    allParkings = MOCK_PARKINGS;
  }

  filteredParkings = [...allParkings];
  showLoading(false);
  renderResults(filteredParkings);
}

/* ============================================================
   SEARCH PARKING (Planner tab)
   ============================================================ */
async function searchParking() {
  const to       = document.getElementById('plannerTo').value.trim();
  const date     = document.getElementById('plannerDate').value;
  const time     = document.getElementById('plannerTime').value;
  const type     = document.getElementById('plannerType').value;
  const priority = document.querySelector('input[name="priority"]:checked')?.value || 'distance';

  const btn = document.getElementById('searchBtn');
  setButtonLoading(btn, true, '🔍 Search Parking');

  try {
    const params = new URLSearchParams();
    if (to)   params.set('destination', to);
    if (date) params.set('date', date);
    if (time) params.set('time', time);
    if (type) params.set('type', type);
    if (userLat !== null) { params.set('lat', userLat); params.set('lng', userLng); }
    params.set('priority', priority);

    const res = await fetch(`${API}/parkings?${params.toString()}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    allParkings = Array.isArray(data) ? data : (data.parkings || data.data || []);
    if (allParkings.length === 0) throw new Error('Empty');
  } catch (err) {
    console.warn('Search API failed, filtering mock data:', err.message);
    allParkings = filterMockByType(type);
  }

  // Client-side sort based on priority
  applyPrioritySort(priority);
  activeFilter = 'all';
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
  filteredParkings = [...allParkings];
  renderResults(filteredParkings);
  showToast(`Found ${filteredParkings.length} parking spots.`, 'success');

  setButtonLoading(btn, false, '🔍 Search Parking');
}

/* ============================================================
   TRACK SEARCH (Track My Location tab)
   ============================================================ */
async function trackSearch() {
  if (userLat === null || userLng === null) {
    showToast('Please detect your location first.', 'warning');
    return;
  }

  const to       = document.getElementById('trackTo').value.trim();
  const type     = document.getElementById('trackType').value;
  const priority = document.querySelector('input[name="trackPriority"]:checked')?.value || 'distance';

  const btn = document.getElementById('trackSearchBtn');
  setButtonLoading(btn, true, '📍 Find Parking Near Me');

  try {
    const params = new URLSearchParams({ lat: userLat, lng: userLng });
    if (to)       params.set('destination', to);
    if (type)     params.set('type', type);
    if (priority) params.set('priority', priority);

    const res = await fetch(`${API}/parkings/nearby?${params.toString()}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    allParkings = Array.isArray(data) ? data : (data.parkings || data.data || []);
    if (allParkings.length === 0) throw new Error('Empty');
  } catch (err) {
    console.warn('Nearby API failed, using mock data:', err.message);
    allParkings = filterMockByType(type);
    // Calculate distance for mock data
    allParkings = allParkings.map(p => ({
      ...p,
      distance: p.lat && p.lng ? calcDist(userLat, userLng, p.lat, p.lng) : null
    }));
  }

  applyPrioritySort(priority);
  activeFilter = 'all';
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
  filteredParkings = [...allParkings];
  renderResults(filteredParkings);
  showToast(`Found ${filteredParkings.length} nearby spots.`, 'success');

  setButtonLoading(btn, false, '📍 Find Parking Near Me');
}

/* ============================================================
   FILTER CHIPS
   ============================================================ */
function applyFilter(filter, chipEl) {
  activeFilter = filter;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  if (chipEl) chipEl.classList.add('active');

  let results = [...allParkings];

  switch (filter) {
    case 'cheapest':
      results.sort((a, b) => (a.costPerHour || 0) - (b.costPerHour || 0));
      break;
    case 'nearest':
      results = results.filter(p => p.distance != null);
      results.sort((a, b) => a.distance - b.distance);
      if (results.length === 0) {
        // no distance data — keep all, show note
        results = [...allParkings];
        showToast('No distance data available. Showing all results.', 'warning');
      }
      break;
    case 'private':
      results = results.filter(p => [1, 3, 4, 5, 6, 7, 8, 9].includes(parseInt(p.type, 10)));
      break;
    case 'public':
      results = results.filter(p => parseInt(p.type, 10) === 2);
      break;
    default:
      break;
  }

  filteredParkings = results;
  renderResults(filteredParkings);
}

/* ============================================================
   PRIORITY SORT
   ============================================================ */
function applyPrioritySort(priority) {
  if (priority === 'cost') {
    allParkings.sort((a, b) => (a.costPerHour || 0) - (b.costPerHour || 0));
  } else if (priority === 'distance') {
    allParkings.sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
  } else if (priority === 'type') {
    allParkings.sort((a, b) => (a.type || 9) - (b.type || 9));
  }
}

/* ============================================================
   FILTER MOCK BY TYPE
   ============================================================ */
function filterMockByType(type) {
  if (!type) return MOCK_PARKINGS;
  return MOCK_PARKINGS.filter(p => String(p.type) === String(type));
}

/* ============================================================
   RENDER RESULTS
   ============================================================ */
function renderResults(list) {
  const body  = document.getElementById('resultsBody');
  const count = document.getElementById('resultsCount');

  count.textContent = `${list.length} result${list.length !== 1 ? 's' : ''}`;

  if (list.length === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <h3>No Parking Found</h3>
        <p>Try adjusting your search filters or widening your area.</p>
      </div>`;
    return;
  }

  body.innerHTML = `<div class="parking-grid">${list.map(renderCard).join('')}</div>`;
}

function renderCard(p) {
  const typeNum    = parseInt(p.type, 10);
  const typeName   = getTypeName(p);
  const borderCls  = getCardBorderClass(typeNum);
  const badgeCls   = getTypeBadgeClass(typeNum);
  const spots      = p.availableSpots != null ? p.availableSpots : (p.available != null ? p.available : '?');
  const spotsNum   = parseInt(spots, 10);
  let spotsCls     = 'spots-good';
  if (!isNaN(spotsNum)) {
    if (spotsNum === 0) spotsCls = 'spots-none';
    else if (spotsNum <= 5) spotsCls = 'spots-warn';
  }

  const costHr  = p.costPerHour != null ? `£${parseFloat(p.costPerHour).toFixed(2)}/hr` : '';
  const costDay = p.costPerDay  != null && p.costPerDay > 0 ? `£${parseFloat(p.costPerDay).toFixed(2)}/day` : '';
  const costStr = [costHr, costDay].filter(Boolean).join(' · ') || 'Free';

  const distBadge = p.distance != null
    ? `<span class="badge badge-dist">📍 ${formatDist(p.distance)}</span>` : '';

  const days = Array.isArray(p.availableDays) ? p.availableDays : [];
  const dayChips = days.map(d => `<span class="day-chip">${d}</span>`).join('');

  const hours = (p.openTime || p.availableFrom) && (p.closeTime || p.availableTo)
    ? `${p.openTime || p.availableFrom} – ${p.closeTime || p.availableTo}` : '';

  const id = p._id || p.id || '';

  return `
  <div class="parking-card ${borderCls}">
    <div class="card-body">
      <div class="card-header-row">
        <div class="card-name">${escHtml(p.name || 'Unnamed Spot')}</div>
        <div class="card-badges">
          <span class="badge ${badgeCls}">${escHtml(typeName)}</span>
          ${distBadge}
        </div>
      </div>
      <div class="card-address">📌 ${escHtml(p.address || 'Address not available')}</div>
      <div class="card-price">${costStr}${p.costPerHour || p.costPerDay ? '' : ''}</div>
      <div class="card-meta">
        <span class="spots-badge ${spotsCls}">
          ${spots === '?' ? '? spots' : (spotsNum === 0 ? 'Full' : `${spots} spots free`)}
        </span>
        ${hours ? `<span class="meta-item">🕐 ${escHtml(hours)}</span>` : ''}
      </div>
      ${dayChips ? `<div class="day-chips">${dayChips}</div>` : ''}
    </div>
    <div class="card-footer">
      <button class="btn btn-sm btn-blue" style="flex:1;" onclick="openModal('${id}')">Details →</button>
      <button class="btn btn-sm btn-grey" style="flex:1;" onclick="navigateTo('${id}')">Navigate 🗺</button>
    </div>
  </div>`;
}

/* ============================================================
   MODAL — DETAIL VIEW
   ============================================================ */
function openModal(id) {
  const p = allParkings.find(x => (x._id || x.id) === id);
  if (!p) { showToast('Parking details not found.', 'error'); return; }

  selectedParking = p;
  document.getElementById('modalTitle').textContent = p.name || 'Parking Details';
  document.getElementById('modalBody').innerHTML = buildModalBody(p);
  document.getElementById('detailModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function buildModalBody(p) {
  const lat      = p.lat  || p.latitude  || '—';
  const lng      = p.lng  || p.longitude || '—';
  const typeName = getTypeName(p);
  const typeNum  = parseInt(p.type, 10);
  const badgeCls = getTypeBadgeClass(typeNum);
  const days     = Array.isArray(p.availableDays) ? p.availableDays.join(', ') : '—';
  const costHr   = p.costPerHour != null ? `£${parseFloat(p.costPerHour).toFixed(2)}` : 'N/A';
  const costDay  = p.costPerDay  != null ? `£${parseFloat(p.costPerDay).toFixed(2)}`  : 'N/A';
  const spots    = p.availableSpots != null ? p.availableSpots : (p.available != null ? p.available : '?');
  const hours    = `${p.openTime || p.availableFrom || '—'} – ${p.closeTime || p.availableTo || '—'}`;

  const distStr  = p.distance != null ? formatDist(p.distance) : '—';
  const desc     = p.description || p.desc || '';

  return `
    <div class="map-placeholder">
      📍
      <small>${lat}, ${lng}</small>
    </div>
    <div style="margin-bottom:12px;">
      <span class="badge ${badgeCls}" style="font-size:13px; padding:4px 12px;">${escHtml(typeName)}</span>
      ${p.distance != null ? `<span class="badge badge-dist" style="margin-left:6px;">${distStr} away</span>` : ''}
    </div>
    <div class="detail-grid">
      <div class="detail-item">
        <label>Address</label>
        <span>${escHtml(p.address || '—')}</span>
      </div>
      <div class="detail-item">
        <label>Coordinates</label>
        <span style="font-size:12px; font-family:monospace;">${lat}, ${lng}</span>
      </div>
      <div class="detail-item">
        <label>Cost Per Hour</label>
        <span>${costHr}</span>
      </div>
      <div class="detail-item">
        <label>Cost Per Day</label>
        <span>${costDay}</span>
      </div>
      <div class="detail-item">
        <label>Total Spots</label>
        <span>${p.totalSpots || '—'}</span>
      </div>
      <div class="detail-item">
        <label>Available Spots</label>
        <span>${spots}</span>
      </div>
      <div class="detail-item">
        <label>Opening Hours</label>
        <span>${escHtml(hours)}</span>
      </div>
      <div class="detail-item">
        <label>Available Days</label>
        <span>${escHtml(days)}</span>
      </div>
    </div>
    ${desc ? `<div class="detail-item" style="margin-top:4px;"><label>Description</label><p style="font-size:14px;color:var(--text);margin-top:4px;line-height:1.6;">${escHtml(desc)}</p></div>` : ''}
  `;
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.getElementById('detailModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Close modal on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ============================================================
   NAVIGATION
   ============================================================ */
function navigateTo(id) {
  const p = allParkings.find(x => (x._id || x.id) === id);
  if (!p) return;
  openGoogleMaps(p);
}

function navigateToParking() {
  if (!selectedParking) return;
  openGoogleMaps(selectedParking);
}

function openGoogleMaps(p) {
  const lat = p.lat || p.latitude;
  const lng = p.lng || p.longitude;
  if (lat && lng) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  } else if (p.address) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`, '_blank');
  } else {
    showToast('No location data available for navigation.', 'error');
  }
}

/* ============================================================
   BOOK THIS SPOT
   ============================================================ */
function bookParking() {
  if (!selectedParking) return;
  showToast(`Booking for "${selectedParking.name}" coming soon!`, 'warning');
}

/* ============================================================
   LOADING STATE
   ============================================================ */
function showLoading(show) {
  const body = document.getElementById('resultsBody');
  if (show) {
    body.innerHTML = `
      <div class="loading-state">
        <div class="spinner spinner-lg"></div>
        <p>Loading parking spots…</p>
      </div>`;
  }
}

function setButtonLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner spinner-white" style="width:16px;height:16px;border-width:2.5px;margin-right:6px;"></span> Loading…`
    : label;
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span> ${escHtml(message)}`;
  container.appendChild(toast);

  setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3200);
}

/* ============================================================
   UTILITIES
   ============================================================ */
function escHtml(str) {
  if (typeof str !== 'string') return str != null ? String(str) : '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function calcDist(lat1, lon1, lat2, lon2) {
  // Haversine formula — returns km
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toRad(deg) { return deg * Math.PI / 180; }

function formatDist(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}
