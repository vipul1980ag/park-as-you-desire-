// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/parkings.json');

function readParkings() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeParkings(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Haversine formula to calculate distance in km between two lat/lng points
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/parkings
// Query params: sortBy=cost|distance|type, lat, lng, type, search
router.get('/', (req, res) => {
  try {
    let parkings = readParkings();
    const { sortBy, lat, lng, type, search } = req.query;

    // Filter by type if provided
    if (type && type !== 'all') {
      parkings = parkings.filter(
        (p) => p.type.toLowerCase().includes(type.toLowerCase())
      );
    }

    // Filter by search term if provided
    if (search) {
      const term = search.toLowerCase();
      parkings = parkings.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.address.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term)
      );
    }

    // Attach distance if coordinates provided
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    if (!isNaN(userLat) && !isNaN(userLng)) {
      parkings = parkings.map((p) => ({
        ...p,
        distance: parseFloat(
          haversineDistance(userLat, userLng, p.lat, p.lng).toFixed(2)
        ),
      }));
    } else {
      parkings = parkings.map((p) => ({ ...p, distance: null }));
    }

    // Sort
    if (sortBy === 'cost') {
      parkings.sort((a, b) => a.costPerHour - b.costPerHour);
    } else if (sortBy === 'distance' && !isNaN(userLat)) {
      parkings.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else if (sortBy === 'type') {
      parkings.sort((a, b) => a.typeId - b.typeId);
    } else {
      // Default: sort by distance if available, else by cost
      if (!isNaN(userLat)) {
        parkings.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      } else {
        parkings.sort((a, b) => a.costPerHour - b.costPerHour);
      }
    }

    res.json({ success: true, count: parkings.length, data: parkings });
  } catch (err) {
    console.error('GET /api/parkings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/parkings/nearby?lat=&lng=&radius=
// Calls Overpass API server-side and returns OSM parking spots sorted by distance.
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius) || 800;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const query = `[out:json][timeout:12];(way["amenity"="parking"](around:${radius},${lat},${lng});node["amenity"="parking"](around:${radius},${lat},${lng}););out center;`;
    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(13000),
    });

    const json = await overpassRes.json();

    const spots = (json.elements || [])
      .map((el) => {
        const tags = el.tags || {};
        const elLat = el.lat || (el.center && el.center.lat);
        const elLng = el.lon || (el.center && el.center.lon);
        if (!elLat || !elLng) return null;

        const parkingType = tags.parking || 'surface';
        const isPrivate = tags.access === 'private' || tags.access === 'customers';
        const fee = tags.fee === 'yes' || !!tags.charge;
        const capacity = parseInt(tags.capacity) || (isPrivate ? 10 : 30);
        const rates = { 'multi-storey': 3.0, underground: 3.5, street_side: 1.0, surface: 1.5 };
        const costPerHour = fee ? (rates[parkingType] || 1.5) : 0;
        const name = tags.name || 'Car Park';
        const address =
          [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') ||
          `${elLat.toFixed(4)}, ${elLng.toFixed(4)}`;
        const distance = haversineDistance(lat, lng, elLat, elLng);

        return {
          id: `osm-${el.id}`,
          name,
          address,
          lat: elLat,
          lng: elLng,
          type: parkingType,
          costPerHour,
          costPerDay: costPerHour * 10,
          isPrivate,
          capacity,
          distance: parseFloat(distance.toFixed(3)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

    res.json({ success: true, count: spots.length, data: spots });
  } catch (err) {
    console.error('GET /api/parkings/nearby error:', err);
    res.status(500).json({ success: false, message: 'Overpass API error' });
  }
});

// GET /api/parkings/:id
router.get('/:id', (req, res) => {
  try {
    const parkings = readParkings();
    const parking = parkings.find((p) => p.id === req.params.id);
    if (!parking) {
      return res.status(404).json({ success: false, message: 'Parking not found' });
    }

    const { lat, lng } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    let result = { ...parking };
    if (!isNaN(userLat) && !isNaN(userLng)) {
      result.distance = parseFloat(
        haversineDistance(userLat, userLng, parking.lat, parking.lng).toFixed(2)
      );
    } else {
      result.distance = null;
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('GET /api/parkings/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
