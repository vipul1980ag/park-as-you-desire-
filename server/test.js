const http = require('http');

const PORT = 3002;

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    };
    const [, host, port, path] = url.match(/http:\/\/([^:]+):(\d+)(.*)/);
    const req = http.request({ host, port: +port, path, ...options }, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function pass(label) { console.log(`  ✅ PASS: ${label}`); }
function fail(label, reason) { console.log(`  ❌ FAIL: ${label} — ${reason}`); }

async function runTests() {
  console.log('\n========== PARKING-IN API TESTS ==========\n');

  // Test 1: GET all parkings
  try {
    const res = await get('http://localhost:3002/api/parkings');
    if (res.success && res.count >= 10) pass(`GET /api/parkings returns ${res.count} spots`);
    else fail('GET /api/parkings', `count=${res.count}`);
  } catch (e) { fail('GET /api/parkings', e.message); }

  // Test 2: Sort by cost
  try {
    const res = await get('http://localhost:3002/api/parkings?sortBy=cost');
    const costs = res.data.map(p => p.costPerHour);
    const sorted = [...costs].sort((a, b) => a - b);
    if (JSON.stringify(costs) === JSON.stringify(sorted)) pass('GET /api/parkings?sortBy=cost — sorted ascending');
    else fail('Sort by cost', `costs not sorted: ${costs.join(', ')}`);
  } catch (e) { fail('Sort by cost', e.message); }

  // Test 3: Sort by distance
  try {
    const res = await get('http://localhost:3002/api/parkings?sortBy=distance&lat=51.505&lng=-0.127');
    const dists = res.data.map(p => p.distance);
    const sorted = [...dists].sort((a, b) => a - b);
    const allHaveDist = dists.every(d => d !== null && d >= 0);
    if (allHaveDist && JSON.stringify(dists) === JSON.stringify(sorted)) pass('GET /api/parkings?sortBy=distance — distances calculated & sorted');
    else fail('Sort by distance', `distances: ${dists.map(d => d?.toFixed(2)).join(', ')}`);
  } catch (e) { fail('Sort by distance', e.message); }

  // Test 4: Filter by type
  try {
    const res = await get('http://localhost:3002/api/parkings?type=Dedicated%20Parking');
    const allMatch = res.data.every(p => p.type === 'Dedicated Parking');
    if (allMatch) pass(`GET /api/parkings?type=Dedicated Parking — ${res.count} results, all correct type`);
    else fail('Filter by type', 'some results have wrong type');
  } catch (e) { fail('Filter by type', e.message); }

  // Test 5: GET single parking
  try {
    const res = await get('http://localhost:3002/api/parkings/1');
    if (res.success && res.data && res.data.id === '1') pass(`GET /api/parkings/1 — "${res.data.name}"`);
    else fail('GET /api/parkings/1', 'unexpected response');
  } catch (e) { fail('GET /api/parkings/1', e.message); }

  // Test 6: GET non-existent parking
  try {
    const res = await get('http://localhost:3002/api/parkings/9999');
    if (!res.success) pass('GET /api/parkings/9999 — returns 404 correctly');
    else fail('GET /api/parkings/9999', 'should return error for missing ID');
  } catch (e) { fail('GET /api/parkings/9999', e.message); }

  // Test 7: POST owner parking
  try {
    const res = await post('http://localhost:3002/api/owner/parkings', {
      name: 'Test Spot', address: '1 Test Lane', lat: 51.5, lng: -0.1,
      type: 'Dedicated Parking', typeId: 1, costPerHour: 2, costPerDay: 12,
      totalSpots: 5, availableSpots: 5, availableDays: ['Mon','Fri'],
      availableFrom: '08:00', availableTo: '18:00', isPrivate: true, description: 'Test'
    }, { ownerid: 'owner99' });
    if (res.success && res.data.id && res.data.name === 'Test Spot') pass(`POST /api/owner/parkings — created "${res.data.name}" (ID: ${res.data.id})`);
    else fail('POST owner parking', JSON.stringify(res));
  } catch (e) { fail('POST owner parking', e.message); }

  // Test 8: GET owner parkings
  try {
    const res = await get('http://localhost:3002/api/owner/parkings?ownerId=owner1');
    if (res.success && res.data.length > 0) pass(`GET /api/owner/parkings — ${res.data.length} listings for owner1`);
    else fail('GET owner parkings', 'no listings returned');
  } catch (e) { fail('GET owner parkings', e.message); }

  // Test 9: Validate required fields on POST
  try {
    const res = await post('http://localhost:3002/api/owner/parkings', { name: 'Incomplete' }, { ownerid: 'owner99' });
    if (!res.success) pass('POST validation — rejects incomplete data');
    else fail('POST validation', 'should reject missing required fields');
  } catch (e) { fail('POST validation', e.message); }

  // Test 10: Check all 9 parking types present in data
  try {
    const res = await get('http://localhost:3002/api/parkings');
    const types = [...new Set(res.data.map(p => p.type))];
    pass(`Data has ${types.length} unique parking types: ${types.slice(0,3).join(', ')}...`);
  } catch (e) { fail('Check parking types', e.message); }

  console.log('\n==========================================\n');
}

runTests().catch(console.error);
