// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_PATH = path.join(__dirname, '../data/parkings.json');

// ── Owner API key auth ────────────────────────────────────────────────────────
const OWNER_API_KEY = process.env.OWNER_API_KEY;

function requireOwnerAuth(req, res, next) {
  if (!OWNER_API_KEY) return next(); // skip in dev if key not set
  const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!key || key !== OWNER_API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorised' });
  }
  next();
}

function readParkings() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeParkings(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Middleware to extract ownerId from header or query
function getOwnerId(req) {
  return req.headers['ownerid'] || req.headers['x-owner-id'] || req.query.ownerId || 'demo-owner';
}

// All owner routes require auth
router.use(requireOwnerAuth);

// GET /api/owner/parkings — Get all listings by ownerId
router.get('/parkings', (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const all = readParkings();
    const ownerListings = all.filter((p) => p.ownerId === ownerId);
    res.json({ success: true, count: ownerListings.length, data: ownerListings });
  } catch (err) {
    console.error('GET /api/owner/parkings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/owner/parkings — Add a new parking listing
router.post('/parkings', (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const {
      name,
      address,
      lat,
      lng,
      type,
      typeId,
      costPerHour,
      costPerDay,
      totalSpots,
      availableSpots,
      availableDays,
      availableFrom,
      availableTo,
      isPrivate,
      description,
    } = req.body;

    // Basic validation
    if (!name || !address || !type || costPerHour === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: name, address, type, costPerHour',
      });
    }

    const parkings = readParkings();
    const newParking = {
      id: uuidv4(),
      ownerId,
      name: name.trim(),
      address: address.trim(),
      lat: parseFloat(lat) || 51.5074,
      lng: parseFloat(lng) || -0.1278,
      type,
      typeId: parseInt(typeId) || 1,
      costPerHour: parseFloat(costPerHour) || 0,
      costPerDay: parseFloat(costPerDay) || 0,
      totalSpots: parseInt(totalSpots) || 1,
      availableSpots: parseInt(availableSpots) || parseInt(totalSpots) || 1,
      availableDays: availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      availableFrom: availableFrom || '08:00',
      availableTo: availableTo || '20:00',
      isPrivate: isPrivate !== undefined ? isPrivate : true,
      description: description ? description.trim() : '',
    };

    parkings.push(newParking);
    writeParkings(parkings);

    res.status(201).json({ success: true, data: newParking });
  } catch (err) {
    console.error('POST /api/owner/parkings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/owner/parkings/:id — Update a listing
router.put('/parkings/:id', (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const parkings = readParkings();
    const idx = parkings.findIndex((p) => p.id === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Parking not found' });
    }

    if (parkings[idx].ownerId !== ownerId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this listing' });
    }

    const updatable = [
      'name', 'address', 'lat', 'lng', 'type', 'typeId',
      'costPerHour', 'costPerDay', 'totalSpots', 'availableSpots',
      'availableDays', 'availableFrom', 'availableTo', 'isPrivate', 'description',
    ];

    const updated = { ...parkings[idx] };
    updatable.forEach((field) => {
      if (req.body[field] !== undefined) {
        updated[field] = req.body[field];
      }
    });

    parkings[idx] = updated;
    writeParkings(parkings);

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('PUT /api/owner/parkings/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/owner/parkings/:id — Remove a listing
router.delete('/parkings/:id', (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    let parkings = readParkings();
    const idx = parkings.findIndex((p) => p.id === req.params.id);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Parking not found' });
    }

    if (parkings[idx].ownerId !== ownerId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this listing' });
    }

    const deleted = parkings.splice(idx, 1)[0];
    writeParkings(parkings);

    res.json({ success: true, data: deleted });
  } catch (err) {
    console.error('DELETE /api/owner/parkings/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/owner/stats — Dashboard stats for owner
router.get('/stats', (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const all = readParkings();
    const listings = all.filter((p) => p.ownerId === ownerId);

    const totalListings = listings.length;
    const activeNow = listings.filter((p) => p.availableSpots > 0).length;
    const bookingsToday = listings.reduce((sum, p) => sum + (p.totalSpots - p.availableSpots), 0);

    res.json({
      success: true,
      data: { totalListings, activeNow, bookingsToday },
    });
  } catch (err) {
    console.error('GET /api/owner/stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
