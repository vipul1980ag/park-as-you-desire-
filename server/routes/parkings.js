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
