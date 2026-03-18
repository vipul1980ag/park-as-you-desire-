// Base URL — change to your machine's LAN IP when testing on a physical device
// e.g., 'http://192.168.1.10:3002/api'
const BASE_URL = 'http://localhost:3002/api';

// Haversine formula for local distance calculation (fallback)
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// ---------- Mock Data (used as fallback when server is unreachable) ----------
export const MOCK_PARKINGS = [
  {
    id: '1',
    ownerId: 'owner1',
    name: 'Central Park Garage',
    address: '123 Main St, City Center',
    lat: 51.5074,
    lng: -0.1278,
    type: 'Dedicated Parking',
    typeId: 1,
    costPerHour: 2.5,
    costPerDay: 15,
    totalSpots: 50,
    availableSpots: 12,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    availableFrom: '06:00',
    availableTo: '22:00',
    isPrivate: false,
    description: 'Well-lit secure garage in city center with CCTV surveillance and 24/7 support.',
    distance: null,
  },
  {
    id: '2',
    ownerId: 'owner2',
    name: 'High Street Bay Parking',
    address: '45 High Street',
    lat: 51.509,
    lng: -0.13,
    type: 'Street Designated Parking',
    typeId: 2,
    costPerHour: 1.0,
    costPerDay: 8,
    totalSpots: 20,
    availableSpots: 7,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    availableFrom: '07:00',
    availableTo: '20:00',
    isPrivate: false,
    description: 'Conveniently located street parking bays close to shops and restaurants.',
    distance: null,
  },
  {
    id: '3',
    ownerId: 'owner3',
    name: 'Riverside Open Lot',
    address: '78 River Road',
    lat: 51.506,
    lng: -0.125,
    type: 'Private Parking in Open',
    typeId: 3,
    costPerHour: 1.5,
    costPerDay: 10,
    totalSpots: 30,
    availableSpots: 18,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    availableFrom: '05:00',
    availableTo: '23:00',
    isPrivate: true,
    description: 'Open air parking lot with easy access. Perfect for short stays near the riverside.',
    distance: null,
  },
  {
    id: '4',
    ownerId: 'owner4',
    name: 'Maple Apartments Parking',
    address: '12 Maple Avenue',
    lat: 51.508,
    lng: -0.131,
    type: 'Private Parking - 3-4 Storey Apt (Unlocked)',
    typeId: 4,
    costPerHour: 2.0,
    costPerDay: 12,
    totalSpots: 15,
    availableSpots: 4,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    availableFrom: '00:00',
    availableTo: '23:59',
    isPrivate: true,
    description: 'Residential apartment parking available to visitors. Covered and secure.',
    distance: null,
  },
  {
    id: '5',
    ownerId: 'owner5',
    name: 'Commerce Tower Parking',
    address: '200 Commerce Blvd',
    lat: 51.505,
    lng: -0.129,
    type: 'Private Parking - 3-4 Storey Building (Unlocked)',
    typeId: 5,
    costPerHour: 3.0,
    costPerDay: 20,
    totalSpots: 40,
    availableSpots: 9,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    availableFrom: '08:00',
    availableTo: '18:00',
    isPrivate: true,
    description: 'Office building parking available during business hours. Monitored entry.',
    distance: null,
  },
  {
    id: '6',
    ownerId: 'owner6',
    name: 'Skyline Multi-Storey Apt',
    address: '500 Skyline Drive',
    lat: 51.51,
    lng: -0.1265,
    type: 'Private Parking - Multi Storey Apt (Unlocked)',
    typeId: 6,
    costPerHour: 2.5,
    costPerDay: 18,
    totalSpots: 80,
    availableSpots: 25,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    availableFrom: '06:00',
    availableTo: '22:00',
    isPrivate: true,
    description: 'Large multi-storey apartment complex with visitor parking on all floors.',
    distance: null,
  },
  {
    id: '7',
    ownerId: 'owner7',
    name: 'Oak Court Secure Parking',
    address: '33 Oak Court',
    lat: 51.5065,
    lng: -0.1285,
    type: 'Private Parking - 3-4 Storey Apt (Locked)',
    typeId: 7,
    costPerHour: 2.8,
    costPerDay: 16,
    totalSpots: 10,
    availableSpots: 2,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    availableFrom: '00:00',
    availableTo: '23:59',
    isPrivate: true,
    description: 'Locked and gated apartment parking. Key fob access required — contact owner.',
    distance: null,
  },
  {
    id: '8',
    ownerId: 'owner8',
    name: 'Tech Hub Building Parking',
    address: '88 Innovation Lane',
    lat: 51.5085,
    lng: -0.132,
    type: 'Private Parking - 3-4 Storey Building (Locked)',
    typeId: 8,
    costPerHour: 3.5,
    costPerDay: 22,
    totalSpots: 25,
    availableSpots: 6,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    availableFrom: '07:30',
    availableTo: '19:00',
    isPrivate: true,
    description: 'Secure locked building parking in the tech district. Barrier-controlled entry.',
    distance: null,
  },
  {
    id: '9',
    ownerId: 'owner9',
    name: 'Pinnacle Tower Car Park',
    address: '1 Pinnacle Plaza',
    lat: 51.5095,
    lng: -0.1255,
    type: 'Private Parking - Multi Storey Apt (Locked)',
    typeId: 9,
    costPerHour: 4.0,
    costPerDay: 25,
    totalSpots: 100,
    availableSpots: 30,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    availableFrom: '00:00',
    availableTo: '23:59',
    isPrivate: true,
    description: 'Premium locked multi-storey parking at Pinnacle Tower. ANPR cameras and 24hr security.',
    distance: null,
  },
  {
    id: '10',
    ownerId: 'owner1',
    name: 'Budget Park & Ride',
    address: 'End of Station Road',
    lat: 51.504,
    lng: -0.124,
    type: 'Dedicated Parking',
    typeId: 1,
    costPerHour: 0.5,
    costPerDay: 4,
    totalSpots: 200,
    availableSpots: 85,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    availableFrom: '05:30',
    availableTo: '23:30',
    isPrivate: false,
    description: 'Affordable park and ride facility. Bus connections every 10 minutes to city center.',
    distance: null,
  },
];

// ---------- Helpers ----------
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function buildQuery(params) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
}

// ---------- OSM / Photon / OSRM ----------

/**
 * Search addresses using Photon (OSM-backed, no API key).
 * Returns [{label, lat, lng}]
 */
export async function searchPhoton(query) {
  if (!query || query.trim().length < 2) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetchWithTimeout(url, {}, 5000);
  const json = await res.json();
  return (json.features || []).map((f) => {
    const p = f.properties;
    const label = [p.name, p.street, p.city, p.country].filter(Boolean).join(', ');
    return { label, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
  });
}

/**
 * Convert an OSM element to the app's parking format.
 */
function convertOSMToParking(el, refLat, refLng) {
  const tags = el.tags || {};
  const elLat = el.lat || (el.center && el.center.lat);
  const elLng = el.lon || (el.center && el.center.lon);
  if (!elLat || !elLng) return null;

  const parkingType = tags.parking || 'surface';
  const isPrivate = tags.access === 'private' || tags.access === 'customers';
  const fee = tags.fee === 'yes' || !!tags.charge;
  const capacity = parseInt(tags.capacity) || (isPrivate ? 10 : 30);

  let costPerHour = 0;
  if (fee) {
    const typeRates = { 'multi-storey': 3.0, 'underground': 3.5, 'street_side': 1.0, 'surface': 1.5 };
    costPerHour = typeRates[parkingType] || 1.5;
  }

  const name = tags.name || `Car Park (OSM)`;
  const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
    .filter(Boolean).join(', ') || `${elLat.toFixed(4)}, ${elLng.toFixed(4)}`;

  const OSM_TYPE_MAP = { 'multi-storey': 'multi-storey', 'underground': 'underground', 'street_side': 'street_side', 'private': 'private' };
  return {
    id: `osm-${el.id}`,
    name,
    address,
    lat: elLat,
    lng: elLng,
    type: OSM_TYPE_MAP[parkingType] || 'surface',
    typeId: 1,
    costPerHour,
    costPerDay: costPerHour * 10,
    totalSpots: capacity,
    availableSpots: Math.floor(capacity * 0.4),
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    availableFrom: '00:00',
    availableTo: '23:59',
    isPrivate,
    description: `${isPrivate ? 'Private' : 'Public'} parking. Data: OpenStreetMap.`,
    distance: haversineDistance(refLat, refLng, elLat, elLng),
  };
}

/**
 * Fetch real-world parking from OpenStreetMap Overpass API.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusMeters
 * @param {string} typeFilter - 'surface' | 'multi-storey' | 'underground' | 'street_side' | 'private' | ''
 */
export async function fetchOSMParkings(lat, lng, radiusMeters = 1000, typeFilter = '') {
  const typeClause = typeFilter && typeFilter !== 'all'
    ? `["parking"="${typeFilter}"]`
    : '';
  const query = `[out:json][timeout:15];(way["amenity"="parking"]${typeClause}(around:${radiusMeters},${lat},${lng});node["amenity"="parking"]${typeClause}(around:${radiusMeters},${lat},${lng}););out center;`;

  const res = await fetchWithTimeout(
    'https://overpass-api.de/api/interpreter',
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}` },
    15000
  );
  const json = await res.json();
  return (json.elements || []).map((el) => convertOSMToParking(el, lat, lng)).filter(Boolean);
}

/**
 * Fetch driving route via OSRM (free, no API key).
 * Returns { coords: [[lat,lng],...], distance, duration } or null.
 */
export async function fetchOSMRoute(fromLat, fromLng, toLat, toLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  const res = await fetchWithTimeout(url, {}, 10000);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes || !json.routes[0]) return null;
  const route = json.routes[0];
  return {
    coords: route.geometry.coordinates.map((c) => [c[1], c[0]]), // [lng,lat] → [lat,lng]
    distance: route.distance,
    duration: route.duration,
  };
}

/**
 * Format the best rate for a parking spot.
 * Shows per-minute if < £0.10/min, otherwise per-hour.
 */
export function formatRate(parking) {
  if (!parking) return 'Free';
  const perHour = parking.costPerHour || 0;
  if (perHour === 0) return 'Free';
  const perMin = perHour / 60;
  if (perMin < 0.10) return `£${perMin.toFixed(2)}/min`;
  return `£${perHour.toFixed(2)}/hr`;
}

// ---------- Driver APIs ----------

/**
 * Get all parkings, with optional filtering/sorting.
 * Falls back to MOCK_PARKINGS if server is unavailable.
 * @param {object} params - { sortBy, lat, lng, type, search }
 */
export const getParkings = async (params = {}) => {
  try {
    const qs = buildQuery(params);
    const res = await fetchWithTimeout(`${BASE_URL}/parkings${qs}`);
    const json = await res.json();
    return json.data || [];
  } catch {
    // Server unavailable — use local mock data with distance calculation
    let data = MOCK_PARKINGS.map((p) => ({ ...p }));
    const lat = parseFloat(params.lat);
    const lng = parseFloat(params.lng);

    if (!isNaN(lat) && !isNaN(lng)) {
      data = data.map((p) => ({
        ...p,
        distance: haversineDistance(lat, lng, p.lat, p.lng),
      }));
    }

    if (params.type && params.type !== 'all') {
      data = data.filter((p) =>
        p.type.toLowerCase().includes(params.type.toLowerCase())
      );
    }

    if (params.search) {
      const term = params.search.toLowerCase();
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.address.toLowerCase().includes(term)
      );
    }

    if (params.sortBy === 'cost') {
      data.sort((a, b) => a.costPerHour - b.costPerHour);
    } else if (params.sortBy === 'distance' && !isNaN(lat)) {
      data.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else if (params.sortBy === 'type') {
      data.sort((a, b) => a.typeId - b.typeId);
    } else {
      if (!isNaN(lat)) {
        data.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      } else {
        data.sort((a, b) => a.costPerHour - b.costPerHour);
      }
    }

    return data;
  }
};

/**
 * Get a single parking by ID.
 * Falls back to MOCK_PARKINGS if server is unavailable.
 * @param {string} id
 * @param {object} params - { lat, lng }
 */
export const getParkingById = async (id, params = {}) => {
  try {
    const qs = buildQuery(params);
    const res = await fetchWithTimeout(`${BASE_URL}/parkings/${id}${qs}`);
    if (!res.ok) throw new Error('Not found');
    const json = await res.json();
    return json.data || null;
  } catch {
    const parking = MOCK_PARKINGS.find((p) => p.id === id);
    if (!parking) return null;
    const result = { ...parking };
    const lat = parseFloat(params.lat);
    const lng = parseFloat(params.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      result.distance = haversineDistance(lat, lng, parking.lat, parking.lng);
    }
    return result;
  }
};

// ---------- Owner APIs ----------

/**
 * Add a new parking listing.
 * Falls back to a local mock operation if server is unavailable.
 * @param {object} data - parking fields
 * @param {string} ownerId
 */
export const addParking = async (data, ownerId = 'demo-owner') => {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/owner/parkings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ownerId,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.data || null;
  } catch {
    // Offline fallback — return a locally-constructed object
    const newParking = {
      ...data,
      id: String(Date.now()),
      ownerId,
      availableSpots: data.totalSpots || 1,
      distance: null,
    };
    MOCK_PARKINGS.push(newParking);
    return newParking;
  }
};

/**
 * Get all parkings belonging to an owner.
 * @param {string} ownerId
 */
export const getOwnerParkings = async (ownerId = 'demo-owner') => {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/owner/parkings`, {
      headers: { ownerId },
    });
    const json = await res.json();
    return json.data || [];
  } catch {
    return MOCK_PARKINGS.filter((p) => p.ownerId === ownerId);
  }
};

/**
 * Update an existing parking listing.
 * @param {string} id
 * @param {object} updates
 * @param {string} ownerId
 */
export const updateParking = async (id, updates, ownerId = 'demo-owner') => {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/owner/parkings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ownerId,
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    return json.data || null;
  } catch {
    const idx = MOCK_PARKINGS.findIndex((p) => p.id === id);
    if (idx !== -1) {
      MOCK_PARKINGS[idx] = { ...MOCK_PARKINGS[idx], ...updates };
      return MOCK_PARKINGS[idx];
    }
    return null;
  }
};

/**
 * Get owner dashboard stats.
 * @param {string} ownerId
 */
export const getOwnerStats = async (ownerId = 'demo-owner') => {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/owner/stats`, {
      headers: { ownerId },
    });
    const json = await res.json();
    return json.data || { totalListings: 0, activeNow: 0, bookingsToday: 0 };
  } catch {
    const listings = MOCK_PARKINGS.filter((p) => p.ownerId === ownerId);
    return {
      totalListings: listings.length,
      activeNow: listings.filter((p) => p.availableSpots > 0).length,
      bookingsToday: listings.reduce(
        (sum, p) => sum + (p.totalSpots - p.availableSpots),
        0
      ),
    };
  }
};
