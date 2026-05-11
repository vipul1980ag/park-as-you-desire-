// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

const express = require('express');
const router = express.Router();

// Server-side geocoding proxy — avoids CSP/CORS issues in the browser
// GET /api/geocode?q=<place name>
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) {
    return res.status(400).json({ success: false, message: 'Query too short' });
  }

  // Try Photon first
  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1&lang=en`,
      { headers: { 'User-Agent': 'ParkAsYouDesire/1.0' } }
    );
    if (photonRes.ok) {
      const data = await photonRes.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        return res.json({ success: true, lat, lng, source: 'photon' });
      }
    }
  } catch (_) {}

  // Fall back to Nominatim
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'ParkAsYouDesire/1.0' } }
    );
    if (nomRes.ok) {
      const data = await nomRes.json();
      if (data && data.length > 0) {
        return res.json({
          success: true,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          source: 'nominatim'
        });
      }
    }
  } catch (_) {}

  return res.status(404).json({ success: false, message: 'Location not found' });
});

// GET /api/geocode/autocomplete?q=<partial text>  — returns up to 6 suggestions
router.get('/autocomplete', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) {
    return res.json({ success: true, features: [] });
  }

  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`,
      { headers: { 'User-Agent': 'ParkAsYouDesire/1.0' } }
    );
    if (photonRes.ok) {
      const data = await photonRes.json();
      return res.json({ success: true, features: data.features || [] });
    }
  } catch (_) {}

  return res.json({ success: true, features: [] });
});

module.exports = router;
