/* ============================================================
   Park As You Desire — Owner Portal (owner.js)
   API: http://localhost:3002/api
   ============================================================ */

'use strict';

const API      = '/api';
const OWNER_ID = 'owner1'; // demo owner

/* ---------- State ---------- */
let listings     = [];
let editingId    = null;

/* ============================================================
   MOCK DATA
   ============================================================ */
const MOCK_LISTINGS = [
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
    description: 'Multi-storey car park with 24/7 CCTV.',
    isActive: true, ownerId: 'owner1'
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
    isActive: false, ownerId: 'owner1'
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

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadListings();
});

/* ============================================================
   LOAD STATS
   ============================================================ */
async function loadStats() {
  try {
    const res  = await fetch(`${API}/owner/${OWNER_ID}/stats`);
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    renderStats(data);
  } catch (err) {
    console.warn('Stats API failed, computing from mock:', err.message);
    // Compute from listings
    const total   = listings.length || MOCK_LISTINGS.length;
    const active  = (listings.length ? listings : MOCK_LISTINGS).filter(l => l.isActive).length;
    const booked  = Math.floor(Math.random() * active * 3); // demo
    renderStats({ total, active, bookedToday: booked });
  }
}

function renderStats({ total, active, bookedToday }) {
  safeSet('statTotal',  total       ?? '—');
  safeSet('statActive', active      ?? '—');
  safeSet('statBooked', bookedToday ?? '—');
}

/* ============================================================
   LOAD LISTINGS
   ============================================================ */
async function loadListings() {
  const panel = document.getElementById('listingsPanel');
  panel.innerHTML = `
    <div class="loading-state">
      <div class="spinner spinner-lg"></div>
      <p>Loading listings…</p>
    </div>`;

  try {
    const res  = await fetch(`${API}/owner/${OWNER_ID}/parkings`);
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    listings = Array.isArray(data) ? data : (data.parkings || data.data || []);
    if (listings.length === 0) throw new Error('Empty');
  } catch (err) {
    console.warn('Listings API failed, using mock:', err.message);
    listings = MOCK_LISTINGS.map(l => ({ ...l }));
  }

  renderListings();
  // Recompute stats with real listing count
  renderStats({
    total: listings.length,
    active: listings.filter(l => l.isActive).length,
    bookedToday: listings.reduce((acc, l) => acc + (l.bookedToday || 0), 0)
  });
}

/* ============================================================
   RENDER LISTINGS
   ============================================================ */
function renderListings() {
  const panel = document.getElementById('listingsPanel');

  if (listings.length === 0) {
    panel.innerHTML = `
      <div class="empty-state" style="padding:40px 16px;">
        <span class="empty-icon" style="font-size:36px;">🅿️</span>
        <h3>No Listings Yet</h3>
        <p>Use the form on the right to add your first parking spot.</p>
      </div>`;
    return;
  }

  panel.innerHTML = listings.map(listing => renderListingCard(listing)).join('');
}

function renderListingCard(p) {
  const id       = p._id || p.id || '';
  const typeName = p.typeName || TYPE_NAMES[p.type] || `Type ${p.type}`;
  const costHr   = p.costPerHour != null ? `£${parseFloat(p.costPerHour).toFixed(2)}/hr` : '';
  const costDay  = p.costPerDay  != null && p.costPerDay > 0 ? `£${parseFloat(p.costPerDay).toFixed(2)}/day` : '';
  const costStr  = [costHr, costDay].filter(Boolean).join(' · ') || 'Free';
  const isActive = !!p.isActive;

  return `
  <div class="listing-card" id="listing-${id}">
    <div class="listing-row">
      <div style="flex:1; min-width:0;">
        <div class="listing-name">${escHtml(p.name || 'Unnamed')}</div>
        <div class="listing-meta">
          ${escHtml(typeName)} &nbsp;·&nbsp; ${escHtml(costStr)} &nbsp;·&nbsp;
          <strong>${p.totalSpots || 0}</strong> spots
        </div>
        <div class="listing-meta" style="margin-top:3px; font-size:11px;">
          📌 ${escHtml(p.address || '—')}
        </div>
      </div>
      <div class="listing-actions">
        <label class="toggle" title="${isActive ? 'Active' : 'Inactive'}">
          <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleActive('${id}', this.checked)" />
          <span class="toggle-slider"></span>
        </label>
        <button class="btn btn-xs btn-blue" onclick="editListing('${id}')">✏️ Edit</button>
        <button class="btn btn-xs btn-danger" onclick="deleteListing('${id}')">🗑</button>
      </div>
    </div>
    <div class="toggle-wrap" style="margin-top:6px;">
      <span class="toggle-label" id="statusLabel-${id}" style="color:${isActive ? 'var(--success)' : 'var(--text-muted)'};">
        ${isActive ? '● Active' : '○ Inactive'}
      </span>
    </div>
  </div>`;
}

/* ============================================================
   EDIT LISTING — populate form
   ============================================================ */
function editListing(id) {
  const p = listings.find(x => (x._id || x.id) === id);
  if (!p) { showToast('Listing not found.', 'error'); return; }

  editingId = id;
  document.getElementById('editingId').value = id;
  document.getElementById('formTitle').textContent = 'Edit Parking Spot';

  safeVal('fName',    p.name    || '');
  safeVal('fAddress', p.address || '');
  safeVal('fLat',     p.lat     != null ? p.lat : (p.latitude  || ''));
  safeVal('fLng',     p.lng     != null ? p.lng : (p.longitude || ''));
  safeVal('fType',    p.type    || '');
  safeVal('fCostHr',  p.costPerHour != null ? p.costPerHour : '');
  safeVal('fCostDay', p.costPerDay  != null ? p.costPerDay  : '');
  safeVal('fSpots',   p.totalSpots  || '');
  safeVal('fFrom',    p.openTime    || p.availableFrom || '');
  safeVal('fTo',      p.closeTime   || p.availableTo   || '');
  safeVal('fDesc',    p.description || p.desc || '');

  // Days checkboxes
  const days = Array.isArray(p.availableDays) ? p.availableDays : [];
  document.querySelectorAll('#daysGroup .checkbox-item').forEach(item => {
    const day = item.dataset.day;
    const cb  = item.querySelector('input');
    cb.checked = days.includes(day);
    item.classList.toggle('checked', cb.checked);
  });

  clearFormMessage();
  // Scroll form into view on mobile
  document.getElementById('parkingForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================
   DELETE LISTING
   ============================================================ */
async function deleteListing(id) {
  const p = listings.find(x => (x._id || x.id) === id);
  if (!p) return;

  if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${API}/parkings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`${res.status}`);
  } catch (err) {
    console.warn('Delete API failed, removing locally:', err.message);
  }

  listings = listings.filter(x => (x._id || x.id) !== id);
  renderListings();
  updateStats();
  showToast(`"${p.name}" deleted.`, 'success');

  // Reset form if we were editing this listing
  if (editingId === id) resetForm();
}

/* ============================================================
   TOGGLE ACTIVE / INACTIVE
   ============================================================ */
async function toggleActive(id, isActive) {
  const p = listings.find(x => (x._id || x.id) === id);
  if (!p) return;

  const prev = p.isActive;
  p.isActive = isActive;

  // Update label immediately
  const label = document.getElementById(`statusLabel-${id}`);
  if (label) {
    label.textContent = isActive ? '● Active' : '○ Inactive';
    label.style.color = isActive ? 'var(--success)' : 'var(--text-muted)';
  }

  try {
    const res = await fetch(`${API}/parkings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive })
    });
    if (!res.ok) throw new Error(`${res.status}`);
    showToast(`Listing ${isActive ? 'activated' : 'deactivated'}.`, 'success');
  } catch (err) {
    console.warn('Toggle API failed:', err.message);
    // Keep local state change as it is (offline-friendly)
    showToast(`Listing ${isActive ? 'activated' : 'deactivated'} (offline).`, 'warning');
  }

  updateStats();
}

/* ============================================================
   SAVE LISTING (POST or PUT)
   ============================================================ */
async function saveListing(event) {
  event.preventDefault();

  clearFormMessage();

  // Collect values
  const name    = document.getElementById('fName').value.trim();
  const address = document.getElementById('fAddress').value.trim();
  const lat     = parseFloat(document.getElementById('fLat').value) || null;
  const lng     = parseFloat(document.getElementById('fLng').value) || null;
  const type    = parseInt(document.getElementById('fType').value, 10) || null;
  const costHr  = parseFloat(document.getElementById('fCostHr').value)  || 0;
  const costDay = parseFloat(document.getElementById('fCostDay').value) || 0;
  const spots   = parseInt(document.getElementById('fSpots').value, 10) || null;
  const from    = document.getElementById('fFrom').value;
  const to      = document.getElementById('fTo').value;
  const desc    = document.getElementById('fDesc').value.trim();

  // Days
  const days = [];
  document.querySelectorAll('#daysGroup input[type="checkbox"]:checked').forEach(cb => {
    days.push(cb.value);
  });

  // Validation
  if (!name)    { showFormMessage('Parking name is required.', 'error'); return; }
  if (!address) { showFormMessage('Address is required.', 'error'); return; }
  if (!type)    { showFormMessage('Please select a parking type.', 'error'); return; }
  if (!spots)   { showFormMessage('Total spots must be at least 1.', 'error'); return; }

  const payload = {
    name, address, lat, lng, type,
    typeName: TYPE_NAMES[type] || `Type ${type}`,
    costPerHour: costHr, costPerDay: costDay,
    totalSpots: spots, availableSpots: spots,
    availableDays: days,
    openTime: from, closeTime: to,
    description: desc,
    ownerId: OWNER_ID,
    isActive: true
  };

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner spinner-white" style="width:14px;height:14px;border-width:2px;margin-right:6px;"></span> Saving…';

  const isEdit = !!(editingId);
  const url    = isEdit ? `${API}/parkings/${editingId}` : `${API}/parkings`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const saved = await res.json();
    const savedListing = saved.parking || saved.data || saved;

    if (isEdit) {
      const idx = listings.findIndex(x => (x._id || x.id) === editingId);
      if (idx !== -1) listings[idx] = { ...listings[idx], ...savedListing, _id: editingId };
    } else {
      listings.push(savedListing);
    }

    showFormMessage(`Listing ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
    showToast(`"${name}" ${isEdit ? 'updated' : 'created'}!`, 'success');

  } catch (err) {
    console.warn('Save API failed, saving locally:', err.message);
    // Save locally for offline demo
    if (isEdit) {
      const idx = listings.findIndex(x => (x._id || x.id) === editingId);
      if (idx !== -1) listings[idx] = { ...listings[idx], ...payload };
    } else {
      const fakeId = 'local_' + Date.now();
      listings.push({ ...payload, _id: fakeId });
    }

    showFormMessage(`Listing ${isEdit ? 'updated' : 'added'} (saved offline).`, 'success');
    showToast(`"${name}" ${isEdit ? 'updated' : 'created'} (offline).`, 'warning');
  }

  saveBtn.disabled = false;
  saveBtn.innerHTML = '💾&nbsp; Save Listing';
  renderListings();
  updateStats();

  if (!isEdit) resetForm();
}

/* ============================================================
   RESET / CLEAR FORM
   ============================================================ */
function resetForm() {
  editingId = null;
  document.getElementById('editingId').value = '';
  document.getElementById('formTitle').textContent = 'Add New Parking Spot';
  document.getElementById('parkingForm').reset();

  // Clear day checkboxes
  document.querySelectorAll('#daysGroup .checkbox-item').forEach(item => {
    item.classList.remove('checked');
    item.querySelector('input').checked = false;
  });

  // Reset defaults
  safeVal('fFrom', '06:00');
  safeVal('fTo',   '22:00');

  clearFormMessage();
}

/* ============================================================
   HELPERS
   ============================================================ */
function updateStats() {
  renderStats({
    total:      listings.length,
    active:     listings.filter(l => l.isActive).length,
    bookedToday: listings.reduce((acc, l) => acc + (l.bookedToday || 0), 0)
  });
}

function showFormMessage(msg, type) {
  const el = document.getElementById('formMessage');
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type === 'success' ? 'success' : 'error'}">${type === 'success' ? '✅' : '❌'} ${escHtml(msg)}</div>`;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearFormMessage() {
  const el = document.getElementById('formMessage');
  if (el) el.innerHTML = '';
}

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

function safeSet(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function safeVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function escHtml(str) {
  if (typeof str !== 'string') return str != null ? String(str) : '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
