/* ============================================================
   Park As You Desire — Driver Portal  v20260512-v18
   ============================================================ */

'use strict';
console.error('[PAYD] portal4.js v18 LOADED ✓ — if you see this in DevTools the new JS is running');
// Permanent on-screen load indicator — proves new JS file loaded
window.addEventListener('DOMContentLoaded', () => {
  const tag = document.createElement('div');
  tag.style.cssText = 'position:fixed;top:50px;right:8px;background:#0d5c1a;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:12px;z-index:99999;opacity:0.9;pointer-events:none;';
  tag.textContent = 'JS v18 ✓';
  document.body.appendChild(tag);
}, { once: true });

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
let destMarker     = null;
let parkingMarkers = [];
let modalMiniMap   = null;

/* Live tracking state */
let watchId             = null;
let isLiveTracking      = false;

/* Vehicle state */
let vehicleType   = 'car';   // car|suv|van|pickup|truck|motorcycle|minibus
let vehicleHeight = null;    // metres
let vehicleWidth  = null;    // metres
let vehicleLength = null;    // metres
let vehicleWeight = null;    // tonnes
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
  if (p.typeName) return p.typeName;
  if (p.type && isNaN(parseInt(p.type, 10))) {
    // String type from /api/parkings/nearby
    return p.type.charAt(0).toUpperCase() + p.type.slice(1).replace(/_/g, ' ');
  }
  return TYPE_NAMES[p.type] || 'Parking';
}

function getTypeColor(type) {
  if (type && isNaN(parseInt(type, 10))) {
    // String type from /api/parkings/nearby
    const t = (type || '').toLowerCase();
    if (t.includes('street') || t.includes('on_street')) return '#27ae60';
    if (t.includes('underground'))  return '#e74c3c';
    if (t.includes('multi'))        return '#e67e22';
    if (t.includes('private'))      return '#9b59b6';
    return '#3498db';
  }
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
    const costStr  = p.costPerHour === 0 ? 'Free'
      : p.costPerHour > 0 ? `£${parseFloat(p.costPerHour).toFixed(2)}/hr`
      : (p.feeInfo || 'Rate unknown');
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
function showDestMarker(lat, lng) {
  if (!map) return;
  if (destMarker) map.removeLayer(destMarker);
  destMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;background:#e74c3c;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(231,76,60,.8)"></div>',
      iconSize: [14, 14], iconAnchor: [7, 7]
    })
  }).addTo(map).bindPopup('<strong>📍 Destination</strong>');
  map.setView([lat, lng], 14);
}

function setupAllAutocompletes() {
  // Planner From — updates userLat/userLng + shows blue dot on map
  setupAutocomplete('plannerFrom', 'plannerFromDropdown', (name, lat, lng) => {
    document.getElementById('plannerFrom').value = name;
    userLat = lat; userLng = lng;
    if (map) showUserOnMap(lat, lng);
  });

  // Planner To — updates destLat/destLng + shows red dot on map
  setupAutocomplete('plannerTo', 'plannerToDropdown', (name, lat, lng) => {
    document.getElementById('plannerTo').value = name;
    destLat = lat; destLng = lng;
    showDestMarker(lat, lng);
  });

  // Also geocode the To field proactively as the user types
  // so destLat/destLng are set even without picking from the dropdown
  const plannerToInput = document.getElementById('plannerTo');
  if (plannerToInput) {
    let geoTimer = null;
    plannerToInput.addEventListener('input', () => {
      clearTimeout(geoTimer);
      destLat = null; destLng = null;
      hideDestCoordConfirm();
      if (destMarker) { map && map.removeLayer(destMarker); destMarker = null; }
      const q = plannerToInput.value.trim();
      if (q.length >= 3) {
        geoTimer = setTimeout(async () => {
          try {
            const coords = await geocodeAddress(q);
            if (coords && plannerToInput.value.trim() === q) {
              destLat = coords.lat; destLng = coords.lng;
              showDestMarker(coords.lat, coords.lng);
              showDestCoordConfirm(coords.lat, coords.lng);
            }
          } catch (_) {}
        }, 700);
      }
    });
  }

  // Track To — updates destLat/destLng + pans map
  setupAutocomplete('trackTo', 'trackToDropdown', (name, lat, lng) => {
    document.getElementById('trackTo').value = name;
    destLat = lat; destLng = lng;
    if (map) map.setView([lat, lng], 13);
  });
}

function setupAutocomplete(inputId, dropdownId, onSelect, onReset) {
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
    if (onReset) onReset(); // clear stale coords when user edits the field
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
    // Use our server proxy to avoid CSP/CORS issues
    const res = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(query)}`);
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
function showDestCoordConfirm(lat, lng) {
  const el   = document.getElementById('destCoordConfirm');
  const text = document.getElementById('destCoordText');
  if (el && text) {
    text.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)} captured`;
    el.style.display = 'block';
  }
}

function hideDestCoordConfirm() {
  const el = document.getElementById('destCoordConfirm');
  if (el) el.style.display = 'none';
}

function getGPSLocation(context) {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }

  const btn = context === 'planner'
    ? document.getElementById('plannerGpsBtn')
    : context === 'dest'
      ? document.getElementById('destGpsBtn')
      : document.getElementById('detectBtn');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = context === 'track'
      ? '⏳ Detecting…'
      : '<span class="spinner spinner-white" style="width:14px;height:14px;border-width:2px;"></span>';
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat    = pos.coords.latitude;
      const lng    = pos.coords.longitude;
      const locStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      if (context === 'planner') {
        userLat = lat; userLng = lng;
        const fromInput = document.getElementById('plannerFrom');
        if (fromInput) fromInput.value = locStr;
        if (btn) { btn.disabled = false; btn.innerHTML = '📍'; }
        if (map) showUserOnMap(lat, lng);

      } else if (context === 'dest') {
        destLat = lat; destLng = lng;
        const toInput = document.getElementById('plannerTo');
        if (toInput) toInput.value = locStr;
        if (btn) { btn.disabled = false; btn.innerHTML = '📍'; }
        showDestMarker(lat, lng);
        showDestCoordConfirm(lat, lng);

      } else {
        userLat = lat; userLng = lng;
        const locEl  = document.getElementById('detectedLoc');
        const textEl = document.getElementById('detectedLocText');
        if (textEl) textEl.textContent = locStr;
        if (locEl)  locEl.classList.add('show');
        if (btn) { btn.disabled = false; btn.innerHTML = '📍 Detect My Location'; }
        if (map) showUserOnMap(lat, lng);
      }

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
        btn.innerHTML = context === 'track' ? '📍 Detect My Location' : '📍';
      }
    },
    { timeout: 10000, maximumAge: 60000 }
  );
}

/* ============================================================
   VEHICLE SECTION
   ============================================================ */
const VEHICLE_ICONS = {
  car: '🚗', suv: '🚙', van: '🚐', pickup: '🛻',
  truck: '🚛', motorcycle: '🏍', minibus: '🚌', microcar: '🚗'
};

function toggleVehicleSection() {
  const body  = document.getElementById('vehicleBody');
  const arrow = document.getElementById('vehicleToggleArrow');
  const btn   = document.getElementById('vehicleToggle');
  const open  = body.style.display === 'none';
  body.style.display  = open ? 'block' : 'none';
  arrow.textContent   = open ? '▲' : '▼';
  btn.setAttribute('aria-expanded', String(open));
}

function selectVehicleType(el) {
  document.querySelectorAll('.vtype-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  vehicleType = el.dataset.vtype;
  // Reset precise dimensions when type changes manually
  vehicleHeight = null; vehicleWidth = null; vehicleLength = null; vehicleWeight = null;
  document.getElementById('vehicleInfoCard').style.display = 'none';
}

async function lookupVehicle() {
  const q   = (document.getElementById('vehicleMakeModel').value || '').trim();
  if (!q) { showToast('Enter a vehicle make and model first.', 'warning'); return; }

  const btn = document.getElementById('vehicleLookupBtn');
  btn.disabled = true;
  btn.textContent = '⏳';

  try {
    const res  = await fetch(`/api/vehicle/lookup?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Not found');

    const v = data.vehicle;
    vehicleType   = v.type   || 'car';
    vehicleHeight = v.height_m;
    vehicleWidth  = v.width_m;
    vehicleLength = v.length_m;
    vehicleWeight = v.weight_t;

    // Update type button selection
    document.querySelectorAll('.vtype-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.vtype === vehicleType);
    });

    // Show info card
    const icon = VEHICLE_ICONS[vehicleType] || '🚗';
    document.getElementById('viIcon').textContent  = icon;
    document.getElementById('viName').textContent  = `${v.make} ${v.model}${v.year_range ? ' ('+v.year_range+')' : ''}`;
    document.getElementById('viType').textContent  = vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1);
    document.getElementById('viLen').textContent   = v.length_m ? `${v.length_m} m` : '—';
    document.getElementById('viWid').textContent   = v.width_m  ? `${v.width_m} m`  : '—';
    document.getElementById('viHgt').textContent   = v.height_m ? `${v.height_m} m` : '—';
    document.getElementById('viWgt').textContent   = v.weight_t ? `${v.weight_t} t`  : '—';
    document.getElementById('viNote').textContent  = v.notes || '';
    document.getElementById('vehicleInfoCard').style.display = 'block';

    showToast(`${icon} ${v.make} ${v.model} — dimensions loaded`, 'success');
  } catch (err) {
    showToast(`Vehicle not found: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Find';
  }
}

// Returns true if a parking spot is compatible with the current vehicle
function isVehicleCompatible(p) {
  const tags = p._osmTags || {};

  // Height restriction check
  if (vehicleHeight && tags.maxheight) {
    const mh = parseFloat(tags.maxheight);
    if (!isNaN(mh) && mh < vehicleHeight) return false;
  }

  // Width restriction check
  if (vehicleWidth && tags.maxwidth) {
    const mw = parseFloat(tags.maxwidth);
    if (!isNaN(mw) && mw < vehicleWidth) return false;
  }

  // Weight restriction check
  if (vehicleWeight && tags.maxweight) {
    const mwt = parseFloat(tags.maxweight);
    if (!isNaN(mwt) && mwt < vehicleWeight) return false;
  }

  // Motorcycle-only spaces for non-motorcycles
  if (vehicleType !== 'motorcycle' && tags.amenity === 'motorcycle_parking') return false;

  // HGV restrictions for trucks
  if ((vehicleType === 'truck' || vehicleType === 'minibus') && tags.hgv === 'no') return false;

  // Underground / multi-storey height concern for tall vehicles
  if (vehicleHeight && vehicleHeight > 2.1) {
    if (p.typeName === 'Underground Car Park' || p.typeName === 'Multi-Storey Car Park') {
      if (!tags.maxheight) {
        // Flag as uncertain rather than exclude — add warning
        p._heightWarning = true;
      }
    }
  }

  return true;
}

/* ============================================================
   PARKING DATA — Overpass (browser) + Nominatim (server fallback)
   ============================================================ */

function buildOverpassQuery(radiusMeters, lat, lng) {
  const R = radiusMeters;
  return `[out:json][timeout:25];(node["amenity"="parking"](around:${R},${lat},${lng});way["amenity"="parking"](around:${R},${lat},${lng});node["landuse"="parking"](around:${R},${lat},${lng});way["landuse"="parking"](around:${R},${lat},${lng}););out center;`;
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

function applyVehicleFilter(parkings) {
  const before = parkings.length;
  const filtered = parkings.filter(p => {
    if (vehicleHeight && p.maxheight && p.maxheight < vehicleHeight) return false;
    if (vehicleWidth  && p.maxwidth  && p.maxwidth  < vehicleWidth)  return false;
    if (vehicleWeight && p.maxweight && p.maxweight < vehicleWeight)  return false;
    if (vehicleType !== 'motorcycle' && (p._osmTags || {}).amenity === 'motorcycle_parking') return false;
    return true;
  });
  const excluded = before - filtered.length;
  if (excluded > 0 && vehicleHeight) showToast(`${excluded} spot(s) excluded for your ${vehicleType} size.`, 'info');
  return filtered;
}

function convertNominatimSpots(spots) {
  return spots.map(p => ({
    _id:           p.id,
    name:          p.name || 'Parking',
    address:       p.address || '',
    lat:           p.lat,
    lng:           p.lng,
    type:          p.type || 'surface',
    typeName:      p.typeName || 'Parking',
    costPerHour:   p.costPerHour,
    feeInfo:       p.feeInfo || 'Rate unknown',
    costPerDay:    null,
    totalSpots:    p.capacity || null,
    availableSpots: p.capacity || null,
    availableDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    openTime:      null,
    closeTime:     null,
    description:   [
      p.operator      ? `Operator: ${p.operator}` : null,
      p.opening_hours ? `Hours: ${p.opening_hours}` : null,
      p.maxheight     ? `Max height: ${p.maxheight} m` : null,
      p.feeInfo,
    ].filter(Boolean).join(' · '),
    isActive:      true,
    distance:      p.distance,
    maxheight:     p.maxheight,
    maxwidth:      p.maxwidth,
    maxweight:     p.maxweight,
    _osmTags:      {},
  })).filter(p => {
    if (vehicleHeight && p.maxheight && p.maxheight < vehicleHeight) return false;
    if (vehicleWidth  && p.maxwidth  && p.maxwidth  < vehicleWidth)  return false;
    if (vehicleWeight && p.maxweight && p.maxweight < vehicleWeight)  return false;
    return true;
  });
}

async function fetchParkings(lat, lng, radiusMeters) {
  console.log('[PAYD] v17 fetchParkings lat=%s lng=%s r=%s', lat, lng, radiusMeters);

  // Show debug banner immediately so user can see live status
  const dbg = document.getElementById('_paydDbg') || (() => {
    const el = document.createElement('div');
    el.id = '_paydDbg';
    el.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#102a42;color:#fff;font-size:12px;padding:10px 16px;border-radius:8px;z-index:99999;text-align:center;max-width:94vw;box-shadow:0 4px 20px rgba(0,0,0,0.6);line-height:1.8;min-width:280px;';
    document.body.appendChild(el);
    return el;
  })();
  const updDbg = (ovTxt, nomTxt, total) => {
    dbg.innerHTML = `<strong>v18 SEARCH DIAGNOSTICS</strong><br>` +
      `📍 lat=${lat.toFixed(4)}, lng=${lng.toFixed(4)}<br>` +
      `🌐 Overpass: ${ovTxt}<br>` +
      `🗺️ Nominatim: ${nomTxt}<br>` +
      `✅ Total spots: <strong>${total}</strong>` +
      `<button onclick="this.parentElement.remove()" style="display:block;margin:6px auto 0;background:none;border:1px solid #aaa;color:#fff;border-radius:4px;padding:2px 10px;cursor:pointer">✕ Close</button>`;
  };
  updDbg('⏳ trying…', '⏳ trying…', '…');

  const ovQuery = `[out:json][timeout:20];(node["amenity"="parking"](around:${radiusMeters},${lat},${lng});way["amenity"="parking"](around:${radiusMeters},${lat},${lng});node["landuse"="parking"](around:${radiusMeters},${lat},${lng});way["landuse"="parking"](around:${radiusMeters},${lat},${lng}););out center;`;

  // ── Overpass: all mirrors in parallel ────────────────────────────────────────
  let ovStatus = 'no response';
  const tryOverpass = () => new Promise(resolve => {
    let done = false;
    let pending = OVERPASS_MIRRORS.length;
    const errors = [];
    OVERPASS_MIRRORS.forEach(mirror => {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 10000);
      fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(ovQuery)}`,
        signal: ctrl.signal,
      })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        clearTimeout(tid);
        const els = (data && data.elements) || [];
        if (els.length > 0 && !done) {
          const spots = els.map(el => convertOSMToParking(el, lat, lng)).filter(p => p && p.lat && p.lng);
          if (spots.length > 0) {
            done = true; ovStatus = `${spots.length} spots`;
            resolve(spots); return;
          }
        }
        ovStatus = `0 elements from ${mirror.split('/')[2]}`;
        if (--pending === 0 && !done) { done = true; resolve([]); }
      })
      .catch(e => {
        clearTimeout(tid);
        errors.push(`${mirror.split('/')[2]}: ${e.message}`);
        ovStatus = errors.join('; ');
        if (--pending === 0 && !done) { done = true; resolve([]); }
      });
    });
  });

  // ── Nominatim server proxy ───────────────────────────────────────────────────
  let nomStatus = 'not tried';
  const tryNominatim = async () => {
    try {
      const r = await fetch(`/api/parkings/nominatim?lat=${lat}&lng=${lng}&radius=10000`);
      const body = await r.json().catch(() => null);
      if (!r.ok) {
        nomStatus = `Server error ${r.status}: ${body && body.message ? body.message : 'unknown'}`;
        return [];
      }
      if (!body || !body.success) {
        nomStatus = `API error: ${body && body.message ? body.message : 'no data'}`;
        return [];
      }
      const raw = body.data || [];
      const converted = convertNominatimSpots(raw);
      nomStatus = `${raw.length} raw → ${converted.length} spots`;
      return converted;
    } catch (e) {
      nomStatus = `fetch failed: ${e.message}`;
      return [];
    }
  };

  // ── Race: show results as soon as first source responds with data ─────────────
  const [osmSpots, nomSpots] = await Promise.all([tryOverpass(), tryNominatim()]);
  const spots = osmSpots.length > 0 ? osmSpots : nomSpots;

  updDbg(ovStatus, nomStatus, spots.length);
  showToast(
    spots.length > 0 ? `Found ${spots.length} parking spots.` : 'No parking found — see diagnostic banner.',
    spots.length > 0 ? 'success' : 'warning'
  );
  return spots;
}

// Backward-compat alias used in live-tracking code
const fetchOSMParkings = fetchParkings;

function convertOSMToParking(el, refLat, refLng) {
  const tags   = el.tags || {};
  const elLat  = el.lat  ?? el.center?.lat;
  const elLng  = el.lon  ?? el.center?.lon;
  const parking = (tags.parking || '').toLowerCase();
  const landuse = (tags.landuse || '').toLowerCase();
  const access  = (tags.access  || '').toLowerCase();
  const fee     = (tags.fee     || '').toLowerCase();

  // Map OSM tags → internal type
  // landuse=parking is common in Mediterranean/Adriatic regions
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
  } else if (landuse === 'parking') {
    typeId = 5; typeName = 'Car Park';
  } else {
    typeId = 1; typeName = 'Public Parking';
  }

  const capacity = parseInt(tags.capacity) || null;
  // Only use actual OSM rate data — never invent £ rates for foreign countries.
  const costPerHour = fee === 'no' ? 0 : null;
  const feeInfo = fee === 'no' ? 'Free' : fee === 'yes' ? 'Paid — check on arrival' : 'Rate unknown';

  // Address
  const addrParts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'] || tags['addr:city']
  ].filter(Boolean);
  const address = addrParts.length ? addrParts.join(', ') : (tags['addr:full'] || 'See map for location');

  // Height/width/weight restrictions from OSM
  const maxheight = tags.maxheight ? parseFloat(tags.maxheight) : null;
  const maxwidth  = tags.maxwidth  ? parseFloat(tags.maxwidth)  : null;
  const maxweight = tags.maxweight ? parseFloat(tags.maxweight) : null;
  const maxlength = tags.maxlength ? parseFloat(tags.maxlength) : null;

  // Description from OSM tags
  const descParts = [
    tags.operator      ? `Operator: ${tags.operator}` : null,
    tags.opening_hours ? `Hours: ${tags.opening_hours}` : null,
    tags.maxstay       ? `Max stay: ${tags.maxstay}` : null,
    maxheight          ? `Max height: ${maxheight} m` : null,
    maxwidth           ? `Max width: ${maxwidth} m`   : null,
    maxweight          ? `Max weight: ${maxweight} t`  : null,
    maxlength          ? `Max length: ${maxlength} m`  : null,
    feeInfo,
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
    feeInfo,
    costPerDay: null,
    totalSpots: capacity,
    availableSpots: capacity,
    availableDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    openTime: null,
    closeTime: null,
    description: descParts.join(' · ') || '',
    isActive: true,
    distance: elLat && elLng ? calcDist(refLat, refLng, elLat, elLng) : null,
    maxheight, maxwidth, maxweight, maxlength,
    _osmTags: { maxheight: tags.maxheight, maxwidth: tags.maxwidth, maxweight: tags.maxweight,
                hgv: tags.hgv, amenity: tags.amenity }
  };
}

/* ============================================================
   LOAD ALL PARKINGS (on page load — show mock until user searches)
   ============================================================ */
async function loadAllParkings() {
  allParkings      = [];
  filteredParkings = [];
  renderResults([]);
}

/* ============================================================
   SEARCH PARKING (Planner tab)
   ============================================================ */
async function searchParking() {
  console.error('[PAYD v18] searchParking() CALLED'); // DEBUG
  showToast('v18 searchParking() called', 'info'); // DEBUG
  const type     = document.getElementById('plannerType').value;
  const radius   = parseInt(document.getElementById('plannerRadius').value) || 2000;
  const priority = document.querySelector('input[name="priority"]:checked')?.value || 'distance';

  const btn = document.getElementById('searchBtn');
  setButtonLoading(btn, true, '🔍 Search Parking');

  // Use autocomplete coords; if not set, geocode the typed text now as last resort
  let refLat = destLat;
  let refLng = destLng;

  if (refLat === null) {
    const toText = (document.getElementById('plannerTo')?.value || '').trim();
    if (toText) {
      showToast(`Locating "${toText}"…`, 'info');
      try {
        const coords = await geocodeAddress(toText);
        if (coords) {
          refLat = coords.lat; refLng = coords.lng;
          destLat = refLat; destLng = refLng;
          showDestMarker(refLat, refLng);
        } else {
          showToast(`Could not find "${toText}" — try a more specific place name.`, 'warning');
        }
      } catch (_) {
        showToast('Location lookup failed — check your internet connection.', 'error');
      }
    }
  }

  if (refLat === null) { refLat = userLat; refLng = userLng; }

  if (refLat === null) {
    showToast('Enter a destination or detect your location first.', 'warning');
    setButtonLoading(btn, false, '🔍 Search Parking');
    return;
  }

  showLoading(true);
  showToast(`Searching for parking near ${refLat.toFixed(4)}, ${refLng.toFixed(4)}…`, 'info');

  try {
    allParkings = await fetchOSMParkings(refLat, refLng, radius, type);
    if (allParkings.length === 0) {
      showToast('No parking found nearby — try a larger search radius.', 'warning');
    }
  } catch (err) {
    console.error('fetchOSMParkings failed:', err);
    showToast(`OSM error: ${err.message} — check console for details.`, 'error');
    allParkings = [];
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
  console.error('[PAYD v18] trackSearch() CALLED, userLat=', userLat); // DEBUG
  showToast(`v18 trackSearch() called, userLat=${userLat}`, 'info'); // DEBUG
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
    console.error('fetchOSMParkings (track) failed:', err);
    showToast(`OSM error: ${err.message}`, 'error');
    allParkings = [];
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
   FIND PARKING NEAR MY CURRENT LOCATION (Planner tab quick button)
   ============================================================ */
async function findParkingNearMe() {
  console.error('[PAYD v18] findParkingNearMe() CALLED'); // DEBUG
  showToast('v18 findParkingNearMe() called', 'info'); // DEBUG
  const btn = document.getElementById('nearMeBtn');
  setButtonLoading(btn, true, '📍 Find Parking Near My Location');

  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'error');
    setButtonLoading(btn, false, '📍 Find Parking Near My Location');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
      const lat    = pos.coords.latitude;
      const lng    = pos.coords.longitude;
      const locStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      showToast(`v17 GPS ok: ${locStr}`, 'info'); // DEBUG

      // Update FROM field and map marker
      userLat = lat; userLng = lng;
      const fromInput = document.getElementById('plannerFrom');
      if (fromInput) fromInput.value = locStr;
      if (map) showUserOnMap(lat, lng);
      showToast('📍 Location detected — searching nearby parking…', 'success');

      const radius = parseInt(document.getElementById('plannerRadius').value) || 2000;
      const type   = document.getElementById('plannerType').value;

      showLoading(true);
      try {
        allParkings = await fetchOSMParkings(lat, lng, radius, type);
        if (allParkings.length === 0) {
          showToast('No parking found nearby — try a larger search radius.', 'warning');
        } else {
          showToast(`Found ${allParkings.length} parking spots near you.`, 'success');
        }
      } catch (err) {
        console.error('findParkingNearMe OSM error:', err);
        showToast(`OSM error: ${err.message}`, 'error');
        allParkings = [];
      }

      applyPrioritySort('distance');
      activeFilter = 'all';
      document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
      filteredParkings = [...allParkings];
      renderResults(filteredParkings);
      renderMapMarkers(filteredParkings);
      if (map) map.setView([lat, lng], 14);
      showLoading(false);
      setButtonLoading(btn, false, '📍 Find Parking Near My Location');
      } catch (debugErr) {
        showToast(`v17 DEBUG ERROR: ${debugErr.message}`, 'error'); // DEBUG
        setButtonLoading(btn, false, '📍 Find Parking Near My Location');
      }
    },
    err => {
      let msg = 'Could not detect location.';
      if (err.code === 1) msg = 'Location access denied — please allow location in your browser settings.';
      if (err.code === 2) msg = 'Location unavailable. Please try again.';
      if (err.code === 3) msg = 'Location request timed out.';
      showToast(msg, 'error');
      setButtonLoading(btn, false, '📍 Find Parking Near My Location');
    },
    { timeout: 10000, maximumAge: 60000 }
  );
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

  const costHr  = p.costPerHour === 0 ? 'Free'
    : p.costPerHour > 0 ? `£${parseFloat(p.costPerHour).toFixed(2)}/hr`
    : (p.feeInfo || 'Rate unknown');
  const costDay = p.costPerDay > 0 ? ` · £${parseFloat(p.costPerDay).toFixed(2)}/day` : '';
  const costStr = costHr + costDay;

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

function navigateWithSafe2Go() {
  if (!selectedParking) return;
  const lat = selectedParking.lat || selectedParking.latitude;
  const lng = selectedParking.lng || selectedParking.longitude;
  if (!lat || !lng) { showToast('No location data for this parking spot.', 'error'); return; }

  const deepLink =
    `safe2go://navigate` +
    `?lat=${lat}` +
    `&lng=${lng}` +
    `&name=${encodeURIComponent(selectedParking.name || 'Parking')}` +
    `&address=${encodeURIComponent(selectedParking.address || '')}`;

  // Cancel fallback toast if browser loses focus (app opened successfully)
  let fallbackTimer;
  const onBlur = () => { clearTimeout(fallbackTimer); window.removeEventListener('blur', onBlur); };
  window.addEventListener('blur', onBlur);

  fallbackTimer = setTimeout(() => {
    window.removeEventListener('blur', onBlur);
    showToast('Safe2Go app not found — open this page on your phone with Safe2Go installed.', 'warning');
  }, 2000);

  window.location.href = deepLink;
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
  setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 6000);
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

/* ============================================================
   AI PARKING ASSISTANT (ParkBot)
   ============================================================ */

let aiOpen       = false;
let aiHistory    = [];   // [{role, content}]
let aiStreaming   = false;

function toggleAIPanel() {
  aiOpen = !aiOpen;
  document.getElementById('aiPanel').classList.toggle('open', aiOpen);
  if (aiOpen && aiHistory.length === 0) {
    aiAddBotMessage(
      "Hi! I'm **ParkBot**, your AI parking assistant. 🅿️\n" +
      "Ask me anything — find parking near a destination, compare costs, get recommendations, or estimate how much you'll pay."
    );
  }
  if (aiOpen) setTimeout(() => document.getElementById('aiInput')?.focus(), 300);
}

function aiAddBotMessage(text) {
  const div = document.createElement('div');
  div.className = 'ai-msg bot';
  div.innerHTML = aiMarkdown(text);
  document.getElementById('aiMessages').appendChild(div);
  aiScrollToBottom();
  return div;
}

function aiAddUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'ai-msg user';
  div.textContent = text;
  document.getElementById('aiMessages').appendChild(div);
  aiScrollToBottom();
}

function aiScrollToBottom() {
  const el = document.getElementById('aiMessages');
  if (el) el.scrollTop = el.scrollHeight;
}

// Very small markdown renderer (bold, newlines)
function aiMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function aiSendQuick(text) {
  document.getElementById('aiInput').value = text;
  aiSend();
}

async function aiSend() {
  if (aiStreaming) return;
  const input = document.getElementById('aiInput');
  const text  = input.value.trim();
  if (!text) return;

  input.value = '';
  aiAddUserMessage(text);
  aiHistory.push({ role: 'user', content: text });

  // Build context from current app state
  const context = {};
  if (userLat !== null) { context.userLat = userLat; context.userLng = userLng; }
  if (destLat !== null) { context.destLat = destLat; context.destLng = destLng; }
  if (filteredParkings.length > 0) context.parkings = filteredParkings;

  // Typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'ai-msg bot typing';
  typingEl.textContent = 'ParkBot is thinking…';
  document.getElementById('aiMessages').appendChild(typingEl);
  aiScrollToBottom();

  aiStreaming = true;
  document.getElementById('aiSendBtn').disabled = true;

  let fullText = '';
  let botDiv   = null;

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: aiHistory, context })
    });

    if (!res.ok) throw new Error(`Server ${res.status}`);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = JSON.parse(line.slice(6));

        if (payload.type === 'delta') {
          if (!botDiv) {
            typingEl.remove();
            botDiv = document.createElement('div');
            botDiv.className = 'ai-msg bot';
            document.getElementById('aiMessages').appendChild(botDiv);
          }
          fullText += payload.text;
          // Strip <action> tags from displayed text
          const display = fullText.replace(/<action>[\s\S]*?<\/action>/g, '').trim();
          botDiv.innerHTML = aiMarkdown(display);
          // Append action chip if action detected in streamed so far
          const actionMatch = fullText.match(/<action>([\s\S]*?)<\/action>/);
          aiUpdateActionChip(botDiv, actionMatch ? actionMatch[1] : null);
          aiScrollToBottom();
        } else if (payload.type === 'done') {
          break;
        } else if (payload.type === 'error') {
          typingEl.remove();
          aiAddBotMessage('Sorry, I had trouble connecting. Please try again.');
        }
      }
    }

    aiHistory.push({ role: 'assistant', content: fullText });
  } catch (err) {
    typingEl.remove();
    console.error('ParkBot error:', err);
    aiAddBotMessage('⚠️ Could not reach ParkBot. Make sure the server is running with an ANTHROPIC_API_KEY.');
  } finally {
    aiStreaming = false;
    document.getElementById('aiSendBtn').disabled = false;
  }
}

function aiUpdateActionChip(container, actionJson) {
  // Remove existing chip if present
  container.querySelectorAll('.ai-action-chip').forEach(c => c.remove());
  if (!actionJson) return;
  try {
    const action = JSON.parse(actionJson.trim());
    if (action.type === 'search' && action.destination) {
      const chip = document.createElement('button');
      chip.className = 'ai-action-chip';
      chip.innerHTML = `🔍 Search: ${escHtml(action.destination)}`;
      chip.onclick = () => aiExecuteSearch(action);
      container.appendChild(document.createElement('br'));
      container.appendChild(chip);
    }
  } catch (_) { /* malformed action — ignore */ }
}

function aiExecuteSearch(action) {
  // Populate planner fields and trigger search
  if (action.destination) {
    const fromEl = document.getElementById('plannerTo');
    if (fromEl) {
      fromEl.value = action.destination;
      // Trigger geocode so the app knows where to search
      geocodeAddress(action.destination).then(coords => {
        if (coords) {
          destLat = coords.lat;
          destLng = coords.lng;
          searchParking();
          switchTab('planner');
          if (map) map.setView([coords.lat, coords.lng], 14);
          showToast(`Searching parking near ${action.destination}`, 'success');
        }
      }).catch(() => showToast('Could not geocode destination', 'warning'));
    }
  }
}

/* Geocode a place name — calls our server proxy (avoids browser CSP/CORS) */
async function geocodeAddress(query) {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.success) return null;
  return { lat: data.lat, lng: data.lng };
}
