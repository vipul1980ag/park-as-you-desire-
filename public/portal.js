/* ============================================================
   Park As You Desire — Driver Portal (portal.js)
   ============================================================ */

'use strict';

const API = '/api';

/* ---------- State ---------- */
let allParkings      = [];
let filteredParkings = [];
let userLat          = null;
let userLng          = null;
let destLat          = null;
let destLng          = null;
let activeTab        = 'planner';
let activeFilter     = 'all';
let selectedParking  = null;

/* Map state */
let map            = null;
let userMarker     = null;
let parkingMarkers = [];
let modalMiniMap   = null;

/* Live tracking state */
let watchId             = null;
let isLiveTracking      = false;
let lastPos             = null;
let lastPosTime         = null;
let lastSpeedKmh        = null;
let suggestionVisible   = false;
let suggestionCooldown  = false;
let suggestedParkings   = [];
let nearestParking      = null;
let routeLayer          = null;
let routeDestMarker     = null;

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
  if (t === 1) return '';
  if (t === 2) return 'type-street';
  if (t === 3) return 'type-private-open';
  if (t <= 6)  return 'type-unlocked';
  return 'type-locked';
}

function getTypeName(p) {
  return p.typeName || TYPE_NAMES[p.type] || `Type ${p.type}`;
}

function getTypeColor(type) {
  const t = parseInt(type, 10);
  if (t === 1) return '#3498db';
  if (t === 2) return '#27ae60';
  if (t === 3) return '#9b59b6';
  if (t <= 6)  return '#e67e22';
  return '#e74c3c';
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const dateInput = document.getElementById('plannerDate');
  const timeInput = document.getElementById('plannerTime');
  if (dateInput) dateInput.value = now.toISOString().slice(0, 10);
  if (timeInput) timeInput.value = now.toTimeString().slice(0, 5);

  wirePriorityOptions();
  initMap();
  setupAllAutocompletes();
  autoDetectGPS();
  loadAllParkings();
});

/* ============================================================
   MAP — LEAFLET
   ============================================================ */
function initMap() {
  if (typeof L === 'undefined') return;
  map = L.map('map', { zoomControl: true }).setView([51.5074, -0.1278], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);
}

function showUserOnMap(lat, lng) {
  if (!map) return;
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([lat, lng], {
    radius: 9,
    fillColor: '#1a3c5e',
    color: '#fff',
    weight: 3,
    opacity: 1,
    fillOpacity: 1
  }).addTo(map).bindPopup('<strong>📍 You are here</strong>');
  map.setView([lat, lng], 14);
}

function renderMapMarkers(list) {
  if (!map) return;
  parkingMarkers.forEach(m => map.removeLayer(m));
  parkingMarkers = [];

  list.forEach(p => {
    if (!p.lat || !p.lng) return;
    const color    = getTypeColor(p.type);
    const spotsNum = parseInt(p.availableSpots, 10);
    const available = isNaN(spotsNum) || spotsNum > 0;
    const costStr  = p.costPerHour != null ? `£${parseFloat(p.costPerHour).toFixed(2)}/hr` : 'Free';
    const spots    = p.availableSpots != null ? p.availableSpots : '?';
    const spotsLabel = spotsNum === 0
      ? '<span style="color:#e74c3c">Full</span>'
      : `<span style="color:#27ae60">${spots} spots free</span>`;

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        background:${color};color:#fff;
        width:30px;height:30px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
        opacity:${available ? 1 : 0.5};
      "><span style="transform:rotate(45deg);font-size:13px;font-weight:900;">P</span></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -34]
    });

    const pid = p._id || p.id || '';
    const marker = L.marker([p.lat, p.lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="min-width:170px;">
          <strong style="font-size:13px;">${escHtml(p.name || 'Parking')}</strong><br>
          <small style="color:#7f8c8d;">${escHtml(p.address || '')}</small>
          <div style="margin-top:6px;font-size:12px;">
            <strong>${costStr}</strong> · ${spotsLabel}
          </div>
          <button onclick="openModal('${pid}')" style="
            margin-top:8px;background:#1a3c5e;color:#fff;
            border:none;padding:5px 10px;border-radius:4px;
            font-size:11px;cursor:pointer;width:100%;
          ">View Details →</button>
        </div>
      `);

    parkingMarkers.push(marker);
  });

  if (parkingMarkers.length > 0) {
    const group = L.featureGroup(parkingMarkers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

/* ============================================================
   MODAL MINI-MAP
   ============================================================ */
function initModalMap(lat, lng, name) {
  if (typeof L === 'undefined') return;
  if (modalMiniMap) { modalMiniMap.remove(); modalMiniMap = null; }
  const container = document.getElementById('modalMapContainer');
  if (!container) return;

  modalMiniMap = L.map(container, { zoomControl: true, scrollWheelZoom: false })
    .setView([lat, lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(modalMiniMap);
  L.marker([lat, lng]).addTo(modalMiniMap)
    .bindPopup(`<strong>${escHtml(name || 'Parking')}</strong>`).openPopup();
  setTimeout(() => modalMiniMap && modalMiniMap.invalidateSize(), 150);
}

/* ============================================================
   AUTOCOMPLETE — Nominatim (OpenStreetMap, free, no API key)
   ============================================================ */
function setupAllAutocompletes() {
  // Planner From — updates userLat/userLng + centers map on user
  setupAutocomplete('plannerFrom', 'plannerFromDropdown', (name, lat, lng) => {
    document.getElementById('plannerFrom').value = name;
    userLat = lat; userLng = lng;
    if (map) showUserOnMap(lat, lng);
  });

  // Planner To — updates destLat/destLng + pans map
  setupAutocomplete('plannerTo', 'plannerToDropdown', (name, lat, lng) => {
    document.getElementById('plannerTo').value = name;
    destLat = lat; destLng = lng;
    if (map) map.setView([lat, lng], 13);
  });

  // Track To — updates destLat/destLng + pans map
  setupAutocomplete('trackTo', 'trackToDropdown', (name, lat, lng) => {
    document.getElementById('trackTo').value = name;
    destLat = lat; destLng = lng;
    if (map) map.setView([lat, lng], 13);
  });
}

function setupAutocomplete(inputId, dropdownId, onSelect) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  // Move dropdown to body so sidebar overflow:auto doesn't clip it
  document.body.appendChild(dropdown);

  let timer = null;

  function reposition() {
    const wrap = input.closest('.autocomplete-wrap') || input;
    const rect = wrap.getBoundingClientRect();
    dropdown.style.top   = `${rect.bottom}px`;
    dropdown.style.left  = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) { closeDropdown(dropdown); return; }
    reposition();
    timer = setTimeout(() => nominatimSearch(q, dropdown, onSelect, input), 500);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDropdown(dropdown);
    if (e.key === 'ArrowDown') {
      const first = dropdown.querySelector('.autocomplete-item');
      if (first) first.focus();
    }
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown(dropdown);
    }
  });

  window.addEventListener('resize', () => { if (dropdown.classList.contains('open')) reposition(); });
}

function closeDropdown(dropdown) {
  dropdown.innerHTML = '';
  dropdown.classList.remove('open');
}

async function nominatimSearch(query, dropdown, onSelect, input) {
  try {
    // Photon (komoot) — fast, autocomplete-optimised, OSM-backed, no API key
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const features = data.features || [];

    if (!features.length) { closeDropdown(dropdown); return; }

    dropdown.innerHTML = features.map(f => {
      const p    = f.properties || {};
      const lat  = f.geometry.coordinates[1];
      const lng  = f.geometry.coordinates[0];
      const parts = [p.name, p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street, p.city || p.town || p.village, p.country].filter(Boolean);
      const label = parts.join(', ');
      return `<div class="autocomplete-item" tabindex="0"
        data-lat="${lat}" data-lng="${lng}" data-name="${escHtml(label)}">
        📍 ${escHtml(label)}
      </div>`;
    }).join('');
    dropdown.classList.add('open');

    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => selectItem(item, dropdown, onSelect));
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter') selectItem(item, dropdown, onSelect);
        if (e.key === 'ArrowDown' && item.nextElementSibling) item.nextElementSibling.focus();
        if (e.key === 'ArrowUp') {
          if (item.previousElementSibling) item.previousElementSibling.focus();
          else input.focus();
        }
        if (e.key === 'Escape') { closeDropdown(dropdown); input.focus(); }
      });
    });
  } catch (err) {
    console.warn('Autocomplete error:', err.message);
  }
}

function selectItem(item, dropdown, onSelect) {
  const lat  = parseFloat(item.dataset.lat);
  const lng  = parseFloat(item.dataset.lng);
  const name = item.dataset.name;
  onSelect(name, lat, lng);
  closeDropdown(dropdown);
}

/* ============================================================
   AUTO-DETECT GPS ON PAGE LOAD
   ============================================================ */
function autoDetectGPS() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      const locStr = `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`;

      const fromInput = document.getElementById('plannerFrom');
      if (fromInput && !fromInput.value) fromInput.value = locStr;

      const locEl  = document.getElementById('detectedLoc');
      const textEl = document.getElementById('detectedLocText');
      if (textEl) textEl.textContent = locStr;
      if (locEl)  locEl.classList.add('show');

      if (map) showUserOnMap(userLat, userLng);
      showToast('📍 Location detected automatically!', 'success');
    },
    () => {}, // silent fail — user can click 📍 button manually
    { timeout: 8000, maximumAge: 300000 }
  );
}

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
   GPS LOCATION (manual button)
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
        if (btn) { btn.disabled = false; btn.innerHTML = '📍'; }
      } else {
        const locEl  = document.getElementById('detectedLoc');
        const textEl = document.getElementById('detectedLocText');
        if (textEl) textEl.textContent = locStr;
        if (locEl)  locEl.classList.add('show');
        if (btn) { btn.disabled = false; btn.innerHTML = '📍 Detect My Location'; }
      }

      if (map) showUserOnMap(userLat, userLng);
      showToast('📍 Location detected!', 'success');
    },
    err => {
      let msg = 'Could not detect location.';
      if (err.code === 1) msg = 'Location access denied. Please allow location in your browser settings.';
      if (err.code === 2) msg = 'Location unavailable. Please try again.';
      if (err.code === 3) msg = 'Location request timed out.';
      showToast(msg, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = context === 'planner' ? '📍' : '📍 Detect My Location';
      }
    },
    { timeout: 10000, maximumAge: 60000 }
  );
}

/* ============================================================
   OPENSTREETMAP OVERPASS API — real worldwide parking data
   ============================================================ */
async function fetchOSMParkings(lat, lng, radiusMeters, typeFilter) {
  // Build Overpass QL — fetch all amenity=parking nodes + ways in radius
  let filter = '';
  if (typeFilter === 'street_side') {
    filter = '["amenity"="parking"]["parking"~"street_side|on_street"]';
  } else if (typeFilter === 'multi-storey') {
    filter = '["amenity"="parking"]["parking"="multi-storey"]';
  } else if (typeFilter === 'underground') {
    filter = '["amenity"="parking"]["parking"="underground"]';
  } else if (typeFilter === 'private') {
    filter = '["amenity"="parking"]["access"~"private|customers"]';
  } else if (typeFilter === 'surface') {
    filter = '["amenity"="parking"]["parking"~"surface|rooftop"]';
  } else {
    filter = '["amenity"="parking"]';
  }

  const query = `[out:json][timeout:30];(node${filter}(around:${radiusMeters},${lat},${lng});way${filter}(around:${radiusMeters},${lat},${lng}););out center;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  });
  if (!res.ok) throw new Error(`Overpass API ${res.status}`);
  const data = await res.json();

  return data.elements
    .map(el => convertOSMToParking(el, lat, lng))
    .filter(p => p.lat && p.lng);
}

function convertOSMToParking(el, refLat, refLng) {
  const tags   = el.tags || {};
  const elLat  = el.lat  ?? el.center?.lat;
  const elLng  = el.lon  ?? el.center?.lon;
  const parking = (tags.parking || '').toLowerCase();
  const access  = (tags.access  || '').toLowerCase();
  const fee     = (tags.fee     || '').toLowerCase();

  // Map OSM tags → internal type
  let typeId = 1, typeName = 'Parking';
  if (parking === 'multi-storey') {
    typeId = 7; typeName = 'Multi-Storey Car Park';
  } else if (parking === 'underground' || parking === 'basement') {
    typeId = 7; typeName = 'Underground Car Park';
  } else if (parking === 'street_side' || parking === 'on_street') {
    typeId = 2; typeName = 'Street Parking';
  } else if (access === 'private' || access === 'customers' || access === 'permit') {
    typeId = 3; typeName = 'Private Parking';
  } else if (parking === 'surface' || parking === 'rooftop') {
    typeId = 5; typeName = 'Surface Car Park';
  } else {
    typeId = 1; typeName = 'Public Parking';
  }

  const capacity = parseInt(tags.capacity) || null;
  const costPerHour = fee === 'no' ? 0 : fee === 'yes' ? null : null;

  // Address
  const addrParts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'] || tags['addr:city']
  ].filter(Boolean);
  const address = addrParts.length ? addrParts.join(', ') : (tags['addr:full'] || 'See map for location');

  // Description from OSM tags
  const descParts = [
    tags.operator      ? `Operator: ${tags.operator}` : null,
    tags.opening_hours ? `Hours: ${tags.opening_hours}` : null,
    tags.maxstay       ? `Max stay: ${tags.maxstay}` : null,
    fee === 'no'       ? 'Free parking' : fee === 'yes' ? 'Paid parking' : null,
    tags.surface       ? `Surface: ${tags.surface}` : null,
  ].filter(Boolean);

  return {
    _id: `osm_${el.id}`,
    name: tags.name || typeName,
    address,
    lat: elLat,
    lng: elLng,
    type: typeId,
    typeName,
    costPerHour,
    costPerDay: null,
    totalSpots: capacity,
    availableSpots: capacity,
    availableDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    openTime: null,
    closeTime: null,
    description: descParts.join(' · ') || '',
    isActive: true,
    distance: elLat && elLng ? calcDist(refLat, refLng, elLat, elLng) : null
  };
}

/* ============================================================
   LOAD ALL PARKINGS (on page load — show mock until user searches)
   ============================================================ */
async function loadAllParkings() {
  allParkings      = MOCK_PARKINGS;
  filteredParkings = [...allParkings];
  renderResults(filteredParkings);
}

/* ============================================================
   SEARCH PARKING (Planner tab)
   ============================================================ */
async function searchParking() {
  const type     = document.getElementById('plannerType').value;
  const radius   = parseInt(document.getElementById('plannerRadius').value) || 2000;
  const priority = document.querySelector('input[name="priority"]:checked')?.value || 'distance';

  const btn = document.getElementById('searchBtn');
  setButtonLoading(btn, true, '🔍 Search Parking');

  // Prefer destination coords; fall back to user GPS
  const refLat = destLat !== null ? destLat : userLat;
  const refLng = destLng !== null ? destLng : userLng;

  if (refLat === null) {
    showToast('Please enter a destination or detect your location first.', 'warning');
    setButtonLoading(btn, false, '🔍 Search Parking');
    return;
  }

  showLoading(true);

  try {
    allParkings = await fetchOSMParkings(refLat, refLng, radius, type);
    if (allParkings.length === 0) {
      showToast('No parking found in this area on OpenStreetMap. Try a larger radius.', 'warning');
    }
  } catch (err) {
    console.warn('OSM fetch failed, using mock data:', err.message);
    showToast('Could not reach OpenStreetMap — showing sample data.', 'warning');
    allParkings = MOCK_PARKINGS.map(p => ({
      ...p,
      distance: calcDist(refLat, refLng, p.lat, p.lng)
    }));
  }

  applyPrioritySort(priority);
  activeFilter = 'all';
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
  filteredParkings = [...allParkings];
  renderResults(filteredParkings);
  if (allParkings.length > 0) showToast(`Found ${allParkings.length} parking spots.`, 'success');

  if (map) {
    const center = destLat !== null ? [destLat, destLng] : [userLat, userLng];
    map.setView(center, 14);
  }

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

  const type     = document.getElementById('trackType').value;
  const radius   = parseInt(document.getElementById('trackRadius').value) || 1000;
  const priority = document.querySelector('input[name="trackPriority"]:checked')?.value || 'distance';

  const btn = document.getElementById('trackSearchBtn');
  setButtonLoading(btn, true, '📍 Find Parking Near Me');
  showLoading(true);

  try {
    allParkings = await fetchOSMParkings(userLat, userLng, radius, type);
    if (allParkings.length === 0) {
      showToast('No parking found nearby on OpenStreetMap. Try a larger radius.', 'warning');
    }
  } catch (err) {
    console.warn('OSM fetch failed, using mock data:', err.message);
    showToast('Could not reach OpenStreetMap — showing sample data.', 'warning');
    allParkings = MOCK_PARKINGS.map(p => ({
      ...p,
      distance: calcDist(userLat, userLng, p.lat, p.lng)
    }));
  }

  applyPrioritySort(priority);
  activeFilter = 'all';
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
  filteredParkings = [...allParkings];
  renderResults(filteredParkings);
  if (allParkings.length > 0) showToast(`Found ${allParkings.length} nearby spots.`, 'success');

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
        results = [...allParkings];
        showToast('No distance data available. Showing all results.', 'warning');
      }
      break;
    case 'private':
      results = results.filter(p => parseInt(p.type, 10) === 3 ||
        (p.typeName && p.typeName.toLowerCase().includes('private')));
      break;
    case 'public':
      results = results.filter(p => parseInt(p.type, 10) === 2 ||
        (p.typeName && (p.typeName.toLowerCase().includes('street') ||
                        p.typeName.toLowerCase().includes('public'))));
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
    renderMapMarkers([]);
    return;
  }

  body.innerHTML = `<div class="parking-grid">${list.map(renderCard).join('')}</div>`;
  renderMapMarkers(list);
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
      <div class="card-price">${costStr}</div>
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

  if (p.lat && p.lng) {
    setTimeout(() => initModalMap(p.lat, p.lng, p.name), 120);
  }
}

function buildModalBody(p) {
  const lat      = p.lat  || p.latitude  || null;
  const lng      = p.lng  || p.longitude || null;
  const typeName = getTypeName(p);
  const typeNum  = parseInt(p.type, 10);
  const badgeCls = getTypeBadgeClass(typeNum);
  const days     = Array.isArray(p.availableDays) ? p.availableDays.join(', ') : '—';
  const costHr   = p.costPerHour != null ? `£${parseFloat(p.costPerHour).toFixed(2)}` : 'N/A';
  const costDay  = p.costPerDay  != null ? `£${parseFloat(p.costPerDay).toFixed(2)}`  : 'N/A';
  const spots    = p.availableSpots != null ? p.availableSpots : (p.available != null ? p.available : '?');
  const hours    = `${p.openTime || p.availableFrom || '—'} – ${p.closeTime || p.availableTo || '—'}`;
  const distStr  = p.distance != null ? formatDist(p.distance) : null;
  const desc     = p.description || p.desc || '';

  return `
    ${lat && lng ? '<div id="modalMapContainer" class="modal-map"></div>' : ''}
    <div style="margin-bottom:12px;">
      <span class="badge ${badgeCls}" style="font-size:13px;padding:4px 12px;">${escHtml(typeName)}</span>
      ${distStr ? `<span class="badge badge-dist" style="margin-left:6px;">${distStr} away</span>` : ''}
    </div>
    <div class="detail-grid">
      <div class="detail-item">
        <label>Address</label>
        <span>${escHtml(p.address || '—')}</span>
      </div>
      <div class="detail-item">
        <label>Coordinates</label>
        <span style="font-size:12px;font-family:monospace;">${lat != null ? `${lat}, ${lng}` : '—'}</span>
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
  if (modalMiniMap) { modalMiniMap.remove(); modalMiniMap = null; }
}

document.getElementById('detailModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

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
   LIVE TRACKING — Real-time parking suggestions as you drive
   ============================================================ */
function toggleLiveTracking() {
  isLiveTracking ? stopLiveTracking() : startLiveTracking();
}

function startLiveTracking() {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported by your browser.', 'error');
    return;
  }
  isLiveTracking = true;
  const btn = document.getElementById('livePBtn');
  btn.classList.add('active');
  btn.title = 'Live parking tracking ON — tap to stop';
  showToast('🅿️ Live tracking ON — we\'ll suggest parking automatically as you drive!', 'success');

  watchId = navigator.geolocation.watchPosition(
    onPositionUpdate,
    err => console.warn('watchPosition error:', err),
    { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
  );
}

function stopLiveTracking() {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  isLiveTracking = false;
  lastPos = null; lastPosTime = null; lastSpeedKmh = null;
  const btn = document.getElementById('livePBtn');
  btn.classList.remove('active');
  btn.title = 'Enable real-time parking suggestions as you drive';
  hideSuggestion();
  clearRoute();
  showToast('Live tracking stopped.', 'info');
}

function onPositionUpdate(position) {
  const { latitude: lat, longitude: lng, speed } = position.coords;
  const now = Date.now();

  userLat = lat; userLng = lng;
  if (map) showUserOnMap(lat, lng);

  // Speed: prefer GPS value (m/s → km/h), else compute from position delta
  let speedKmh = speed != null ? speed * 3.6 : null;
  if (speedKmh === null && lastPos && lastPosTime) {
    const distKm  = calcDist(lastPos.lat, lastPos.lng, lat, lng);
    const timeSec = (now - lastPosTime) / 1000;
    speedKmh = timeSec > 1 ? (distKm / timeSec) * 3600 : 0;
  }

  const prevSpeed  = lastSpeedKmh;
  lastPos          = { lat, lng };
  lastPosTime      = now;
  lastSpeedKmh     = speedKmh;

  checkParkingSuggestion(lat, lng, speedKmh, prevSpeed);
}

function checkParkingSuggestion(lat, lng, speedKmh, prevSpeed) {
  if (suggestionCooldown || suggestionVisible) return;

  let reason = null;

  // Trigger A: within 800 m of chosen destination
  if (destLat !== null) {
    const distM = calcDist(lat, lng, destLat, destLng) * 1000;
    if (distM < 800)
      reason = `${Math.round(distM)} m from your destination — find parking now`;
  }

  // Trigger B: vehicle braking hard (was fast, now slow)
  if (!reason && prevSpeed !== null && speedKmh !== null)
    if (prevSpeed > 25 && speedKmh < 10)
      reason = 'Vehicle slowing down — parking nearby?';

  // Trigger C: crawling (circling for a spot)
  if (!reason && speedKmh !== null && speedKmh > 1 && speedKmh < 8)
    reason = 'Moving slowly — looking for parking?';

  if (reason) triggerParkingSuggestion(lat, lng, reason);
}

async function triggerParkingSuggestion(lat, lng, reason) {
  suggestionVisible  = true;
  suggestionCooldown = true;
  nearestParking     = null;

  // Show banner with trigger reason immediately
  setText('suggestionDesc', reason);
  setText('suggestionParkingName', '…');
  setText('suggestionRate', '…');
  setText('suggestionDistance', '…');
  setText('suggestionETA', '…');
  document.getElementById('parkingSuggestion')?.classList.add('show');

  try {
    suggestedParkings = await fetchOSMParkings(lat, lng, 800, '');

    if (!suggestedParkings.length) {
      setText('suggestionDesc', reason + ' · No spots found nearby');
    } else {
      // Pick the nearest with valid coords
      nearestParking = suggestedParkings
        .filter(p => p.lat && p.lng)
        .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))[0] || null;

      setText('suggestionDesc', `${suggestedParkings.length} spots found · nearest below`);

      if (nearestParking) {
        setText('suggestionParkingName', nearestParking.name || 'Parking');
        setText('suggestionRate', formatRate(nearestParking));

        // Fetch driving route to nearest parking
        try {
          const route = await fetchRoute(lat, lng, nearestParking.lat, nearestParking.lng);
          drawRoute(route.geometry);
          setText('suggestionDistance', formatRouteDistance(route.distance));
          setText('suggestionETA', formatETA(route.duration));
        } catch (routeErr) {
          console.warn('Route fetch failed:', routeErr.message);
          setText('suggestionDistance', formatDist(nearestParking.distance));
          setText('suggestionETA', '—');
        }
      }
    }
  } catch (e) {
    console.warn('OSM fetch failed:', e.message);
    setText('suggestionDesc', reason + ' · Could not load parking data');
  }

  // Allow re-trigger after 60 s
  setTimeout(() => { suggestionCooldown = false; }, 60000);
}

/* ---- OSRM driving route ---- */
async function fetchRoute(fromLat, fromLng, toLat, toLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes.length) throw new Error('No route');
  return {
    geometry: data.routes[0].geometry,   // GeoJSON LineString
    distance: data.routes[0].distance,   // metres
    duration: data.routes[0].duration    // seconds
  };
}

function drawRoute(geojsonGeometry) {
  clearRoute();
  if (!map) return;

  routeLayer = L.geoJSON(geojsonGeometry, {
    style: { color: '#1a3c5e', weight: 5, opacity: 0.85, dashArray: '10, 6' }
  }).addTo(map);

  // Destination pin on nearest parking
  if (nearestParking?.lat && nearestParking?.lng) {
    const destIcon = L.divIcon({
      className: '',
      html: `<div style="background:#f0a500;color:#1a3c5e;width:34px;height:34px;
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:14px;font-weight:900;">P</span></div>`,
      iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -36]
    });
    routeDestMarker = L.marker([nearestParking.lat, nearestParking.lng], { icon: destIcon })
      .addTo(map)
      .bindPopup(`<strong>${escHtml(nearestParking.name || 'Nearest Parking')}</strong><br>
        <span>${formatRate(nearestParking)}</span>`)
      .openPopup();
  }

  // Fit map to show full route
  const bounds = routeLayer.getBounds();
  if (userMarker) bounds.extend(userMarker.getLatLng());
  map.fitBounds(bounds.pad(0.15));
}

function clearRoute() {
  if (routeLayer)      { map?.removeLayer(routeLayer);      routeLayer      = null; }
  if (routeDestMarker) { map?.removeLayer(routeDestMarker); routeDestMarker = null; }
}

/* ---- Rate formatting ---- */
function formatRate(p) {
  if (!p) return '—';
  if (p.costPerHour === 0) return 'Free';
  if (p.costPerHour > 0) {
    const perMin = p.costPerHour / 60;
    // Show per-minute if it gives a nicer number (< £0.10/min show as p/min)
    return perMin < 0.10
      ? `${Math.round(perMin * 100)}p/min  (£${p.costPerHour.toFixed(2)}/hr)`
      : `£${p.costPerHour.toFixed(2)}/hr`;
  }
  if (p.costPerDay > 0) {
    const perHr = p.costPerDay / 24;
    return `£${perHr.toFixed(2)}/hr  (£${p.costPerDay.toFixed(2)}/day)`;
  }
  return 'Rate unknown (check on arrival)';
}

function formatRouteDistance(metres) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

function formatETA(seconds) {
  if (seconds < 60)  return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} hr`;
}

/* ---- Navigate to nearest ---- */
function navigateToNearest() {
  if (!nearestParking) { showToast('No nearest parking selected.', 'warning'); return; }
  openGoogleMaps(nearestParking);
}

function loadSuggestedParking() {
  hideSuggestion();
  if (suggestedParkings.length > 0) {
    allParkings = suggestedParkings; filteredParkings = [...allParkings];
    renderResults(filteredParkings);
    showToast(`Showing ${allParkings.length} nearby parking spots.`, 'success');
  } else if (userLat !== null) {
    showLoading(true);
    fetchOSMParkings(userLat, userLng, 500, '').then(r => {
      allParkings = r; filteredParkings = [...r]; renderResults(r);
    }).catch(() => showToast('Could not load parking data.', 'error'));
  }
}

function hideSuggestion() {
  suggestionVisible = false;
  document.getElementById('parkingSuggestion')?.classList.remove('show');
}

/* small helper */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ============================================================
   UTILITIES
   ============================================================ */
function escHtml(str) {
  if (typeof str !== 'string') return str != null ? String(str) : '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function calcDist(lat1, lon1, lat2, lon2) {
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
