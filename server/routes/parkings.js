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

// GET /api/parkings/nearby?lat=&lng=&radius=&vehicle=car|truck|van|motorcycle&minHeight=
// vehicle: type of vehicle — affects which OSM spots are fetched and filtered.
// minHeight: vehicle height in FEET (used for truck height-clearance filtering).
router.get('/nearby', async (req, res) => {
  try {
    const lat       = parseFloat(req.query.lat);
    const lng       = parseFloat(req.query.lng);
    const vehicle   = (req.query.vehicle || 'car').toLowerCase();
    const isTruck   = vehicle === 'truck' || vehicle === 'hgv' || vehicle === 'van';
    // minHeight in feet → convert to metres for OSM tag comparison
    const minHeightFt = parseFloat(req.query.minHeight) || (isTruck ? 13 : 0);
    const minHeightM  = minHeightFt * 0.3048;

    // Trucks need a larger search radius by default (harder to maneuver, fewer suitable spots)
    const radius = parseInt(req.query.radius) || (isTruck ? 2000 : 800);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    // For trucks: broader query — exclude underground/multi-storey, prefer HGV-tagged spots.
    // For cars: standard query.
    let query;
    if (isTruck) {
      query = `[out:json][timeout:15];(
        way["amenity"="parking"]["hgv"="yes"](around:${radius},${lat},${lng});
        node["amenity"="parking"]["hgv"="yes"](around:${radius},${lat},${lng});
        way["amenity"="parking"]["parking"="surface"]["access"!="private"](around:${radius},${lat},${lng});
        node["amenity"="parking"]["parking"="surface"]["access"!="private"](around:${radius},${lat},${lng});
        way["amenity"="parking"]["parking"="street_side"](around:${radius},${lat},${lng});
        node["amenity"="parking"]["parking"="street_side"](around:${radius},${lat},${lng});
      );out center;`;
    } else if (vehicle === 'motorcycle') {
      query = `[out:json][timeout:12];(
        way["amenity"="parking"]["motorcycle"!="no"](around:${radius},${lat},${lng});
        node["amenity"="parking"]["motorcycle"!="no"](around:${radius},${lat},${lng});
        way["amenity"="motorcycle_parking"](around:${radius},${lat},${lng});
        node["amenity"="motorcycle_parking"](around:${radius},${lat},${lng});
      );out center;`;
    } else {
      query = `[out:json][timeout:12];(way["amenity"="parking"](around:${radius},${lat},${lng});node["amenity"="parking"](around:${radius},${lat},${lng}););out center;`;
    }

    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(14000),
    });

    const json = await overpassRes.json();

    const spots = (json.elements || [])
      .map((el) => {
        const tags = el.tags || {};
        const elLat = el.lat || (el.center && el.center.lat);
        const elLng = el.lon || (el.center && el.center.lon);
        if (!elLat || !elLng) return null;

        const parkingType = tags.parking || tags.amenity || 'surface';
        const isPrivate   = tags.access === 'private' || tags.access === 'customers';
        const feeFree     = tags.fee === 'no';
        const feePaid     = tags.fee === 'yes' || !!tags.charge;
        const capacity    = parseInt(tags.capacity) || (isPrivate ? 10 : 30);
        const costPerHour = feeFree ? 0 : null;
        const feeInfo     = feeFree ? 'Free' : feePaid ? 'Paid — check on arrival' : 'Rate unknown';
        const name        = tags.name || (isTruck ? 'Truck Parking' : 'Car Park');
        const address     =
          [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') ||
          `${elLat.toFixed(4)}, ${elLng.toFixed(4)}`;
        const distance = haversineDistance(lat, lng, elLat, elLng);

        // Height clearance check — skip spots that explicitly restrict height below vehicle's need
        if (minHeightM > 0 && tags.maxheight) {
          const mh = parseFloat(tags.maxheight);
          if (!isNaN(mh) && mh < minHeightM) return null;
        }

        // Truck suitability scoring
        const hgvAllowed    = tags.hgv === 'yes' || tags.hgv === 'designated';
        const hgvForbidden  = tags.hgv === 'no';
        const isUnderground = parkingType === 'underground';
        const isMultiStorey = parkingType === 'multi-storey';
        const truckSuitable = isTruck
          ? (hgvAllowed || (!hgvForbidden && !isUnderground && !isMultiStorey))
          : true;

        if (isTruck && !truckSuitable) return null;

        return {
          id:           `osm-${el.id}`,
          name,
          address,
          lat:          elLat,
          lng:          elLng,
          type:         parkingType,
          typeName:     parkingType.charAt(0).toUpperCase() + parkingType.slice(1).replace(/_/g,' '),
          costPerHour,
          feeInfo,
          costPerDay:   null,
          isPrivate,
          capacity,
          distance:     parseFloat(distance.toFixed(3)),
          truckSuitable,
          hgvDesignated: hgvAllowed,
          access:        tags.access || 'yes',
          maxheight:     tags.maxheight ? parseFloat(tags.maxheight) : null,
          maxwidth:      tags.maxwidth  ? parseFloat(tags.maxwidth)  : null,
          maxweight:     tags.maxweight ? parseFloat(tags.maxweight) : null,
          opening_hours: tags.opening_hours || null,
          operator:      tags.operator      || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // HGV-designated spots float to top for trucks
        if (isTruck) {
          if (a.hgvDesignated && !b.hgvDesignated) return -1;
          if (!a.hgvDesignated && b.hgvDesignated) return 1;
        }
        return a.distance - b.distance;
      });

    res.json({ success: true, count: spots.length, data: spots, vehicle, minHeightFt });
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
