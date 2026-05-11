// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

const express = require('express');
const router = express.Router();

// POST /api/osm  — server-side Overpass API proxy (avoids browser CSP/CORS)
// Body: { query: "<overpass QL string>" }
router.post('/', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ success: false, message: 'query is required' });
  }

  try {
    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(30000),
    });

    if (!overpassRes.ok) {
      return res.status(502).json({ success: false, message: `Overpass API returned ${overpassRes.status}` });
    }

    const data = await overpassRes.json();
    res.json({ success: true, elements: data.elements || [] });
  } catch (err) {
    console.error('OSM proxy error:', err.message);
    res.status(504).json({ success: false, message: 'Overpass API timed out or unreachable' });
  }
});

module.exports = router;
