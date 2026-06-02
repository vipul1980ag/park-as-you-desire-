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
    const radius = parseInt(req.query.radius) || (isTruck ? 3000 : 2000);

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
      query = `[out:json][timeout:20];(nwr["amenity"="parking"](around:${radius},${lat},${lng});nwr["landuse"="parking"](around:${radius},${lat},${lng});nwr["name"~"tiefgarage|parkhaus|parking garage|car park|park.ride",i](around:${radius},${lat},${lng}););out center;`;
    }

    const MIRRORS = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.openstreetmap.ru/api/interpreter',
    ];

    let json = null;
    let lastErr = '';
    for (const mirror of MIRRORS) {
      try {
        const r = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(18000),
        });
        if (r.ok) { json = await r.json(); break; }
        lastErr = `HTTP ${r.status} from ${mirror}`;
      } catch (e) {
        lastErr = `${mirror}: ${e.message}`;
        console.warn('Overpass mirror failed:', lastErr);
      }
    }
    if (!json) throw new Error(`All Overpass mirrors failed. Last: ${lastErr}`);

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
    console.error('GET /api/parkings/nearby error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/parkings/nominatim?lat=&lng=&radius=
// Server-side proxy to Nominatim amenity=parking search (Railway can reach Nominatim).
router.get('/nominatim', async (req, res) => {
  try {
    const lat    = parseFloat(req.query.lat);
    const lng    = parseFloat(req.query.lng);
    const radius = Math.min(parseInt(req.query.radius) || 2000, 25000);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    // Bounding box: use 1.5× radius so the full circle fits inside, then circle-filter after.
    // (A viewbox = exact radius only covers 78% of the circle due to corners being clipped.)
    const boxFactor = 1.5;
    const latDeg = (radius * boxFactor) / 111000;
    const lngDeg = (radius * boxFactor) / (111000 * Math.cos(lat * Math.PI / 180));
    // Nominatim viewbox: left,top,right,bottom = minLon,maxLat,maxLon,minLat
    const viewbox = `${(lng - lngDeg).toFixed(6)},${(lat + latDeg).toFixed(6)},${(lng + lngDeg).toFixed(6)},${(lat - latDeg).toFixed(6)}`;

    const NOM_HEADERS = { 'Accept-Language': 'en', 'User-Agent': 'ParkAsYouDesire/1.0 (parking.dnw-ai.com)' };

    function mapNomItem(item) {
      const elLat = parseFloat(item.lat);
      const elLon = parseFloat(item.lon);
      if (isNaN(elLat) || isNaN(elLon)) return null;
      const tags   = item.extratags || {};
      const parking = (tags.parking  || '').toLowerCase();
      const access  = (tags.access   || '').toLowerCase();
      const fee     = (tags.fee      || '').toLowerCase();
      const dispName = item.display_name || '';

      // Infer type from parking tag OR from the facility name itself
      let typeName = 'Parking';
      if (parking === 'multi-storey' || /parkhaus|multi.?stor/i.test(dispName))  typeName = 'Multi-Storey Car Park';
      else if (parking === 'underground' || parking === 'basement' || /tiefgarage|underground/i.test(dispName)) typeName = 'Underground Car Park';
      else if (parking === 'street_side' || parking === 'on_street') typeName = 'Street Parking';
      else if (access === 'private' || access === 'customers')        typeName = 'Private Parking';
      else if (parking === 'surface')                                  typeName = 'Surface Car Park';
      else if (parking === 'rooftop')                                  typeName = 'Rooftop Car Park';

      const feeInfo = fee === 'no' ? 'Free' : fee === 'yes' ? 'Paid — check on arrival' : 'Rate unknown';

      const nameParts = dispName.split(',').map(s => s.trim()).filter(Boolean);
      let name = nameParts[0] || typeName;
      // Append type when name looks like a street/square, not a facility
      if (name && typeName !== 'Parking' && !/tiefgarage|parkhaus|parking|garage|stellplatz|car.park/i.test(name)) {
        name = `${name} (${typeName})`;
      }

      const dist = parseFloat(haversineDistance(lat, lng, elLat, elLon).toFixed(3));

      return {
        id:           `nom-${item.osm_type}-${item.osm_id}`,
        name,
        address:      dispName,
        lat:          elLat,
        lng:          elLon,
        type:         parking || 'surface',
        typeName,
        costPerHour:  fee === 'no' ? 0 : null,
        feeInfo,
        costPerDay:   null,
        capacity:     tags.capacity ? parseInt(tags.capacity) : null,
        distance:     dist,
        maxheight:    tags.maxheight ? parseFloat(tags.maxheight) : null,
        maxwidth:     tags.maxwidth  ? parseFloat(tags.maxwidth)  : null,
        maxweight:    tags.maxweight ? parseFloat(tags.maxweight) : null,
        access:       access || 'yes',
        opening_hours: tags.opening_hours || null,
        operator:     tags.operator || null,
      };
    }

    async function nomFetch(url) {
      try {
        const r = await fetch(url, { headers: NOM_HEADERS, signal: AbortSignal.timeout(10000) });
        if (!r.ok) return [];
        return await r.json();
      } catch { return []; }
    }

    // Run three Nominatim queries in parallel:
    // 1. amenity=parking (general parking)
    // 2. q=tiefgarage (catches underground garages missed by importance ranking)
    // 3. q=parkhaus   (catches multi-storey garages missed by importance ranking)
    const [amenityData, tiefData, parkhausData] = await Promise.all([
      nomFetch(`https://nominatim.openstreetmap.org/search?amenity=parking&format=json&limit=50&bounded=1&viewbox=${viewbox}&extratags=1`),
      nomFetch(`https://nominatim.openstreetmap.org/search?q=tiefgarage&format=json&limit=20&bounded=1&viewbox=${viewbox}&extratags=1`),
      nomFetch(`https://nominatim.openstreetmap.org/search?q=parkhaus&format=json&limit=20&bounded=1&viewbox=${viewbox}&extratags=1`),
    ]);

    // Map all items then merge, deduplicate by OSM id, apply circle filter, sort
    const seen = new Set();
    const spots = [...amenityData, ...tiefData, ...parkhausData]
      .map(mapNomItem)
      .filter(s => {
        if (!s) return false;
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return s.distance <= radius / 1000;
      })
      .sort((a, b) => a.distance - b.distance);

    res.json({ success: true, count: spots.length, data: spots, source: 'nominatim' });
  } catch (err) {
    console.error('GET /api/parkings/nominatim error:', err.message);
    res.status(500).json({ success: false, message: err.message });
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
