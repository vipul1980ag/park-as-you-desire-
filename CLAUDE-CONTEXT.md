# Park As You Desire — Claude Context Card
> Paste this at the start of any Claude conversation to restore full project context.

---

## Project
- **Name:** Park As You Desire (PARKING-IN)
- **Local path:** `C:/Users/vipul/park-as-you-desire/`
- **GitHub:** `vipul1980ag/park-as-you-desire-`
- **Live URL:** `parking.dnw-ai.com` (Railway hosting, CNAME from Wix DNS)
- **Standalone file:** `parking-app.html` (no server needed)
- **Owner:** Vipul Agrawal — vipul.orlando@gmail.com

---

## Tech Stack
| Layer | Tech |
|---|---|
| Backend | Node.js + Express, port 3002, `server/server.js` |
| Mobile | React Native + Expo (`mobile/`) |
| AI | Anthropic `claude-opus-4-6`, SSE streaming, prompt caching |
| Maps | OpenStreetMap / Overpass API + Leaflet (WebView) |
| Search | Photon API (Komoot) autocomplete |
| Routing | OSRM |
| Security | Helmet, CORS, express-rate-limit, OWNER_API_KEY auth |

---

## Project Structure
```
park-as-you-desire/
├── server/
│   ├── server.js                  — Express app + security middleware
│   ├── routes/parkings.js         — Public parking listings (GET/POST)
│   ├── routes/owner.js            — Owner CRUD (x-api-key required)
│   ├── routes/ai.js               — ParkBot SSE endpoint
│   └── data/parkings.json         — Local data store
├── mobile/src/
│   ├── screens/                   — Home, Planner, Track, Results, Detail, ParkBot
│   ├── components/                — ParkingCard, LocationInput, LeafletMapView
│   ├── services/api.js            — All API calls
│   └── navigation/AppNavigator.js
├── public/                        — Web frontend static files
├── parking-app.html               — Standalone offline SPA
├── QUICK-REFERENCE.html           — Visual reference card (open in browser)
└── LICENSE                        — Proprietary, all rights reserved
```

---

## API Routes
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | None | Health check |
| GET | `/api/parkings` | None | All listings |
| POST | `/api/parkings` | None | Search by lat/lng/radius |
| GET | `/api/owner/parkings` | x-api-key | My listings |
| POST | `/api/owner/parkings` | x-api-key | Add listing |
| PUT | `/api/owner/parkings/:id` | x-api-key | Update listing |
| DELETE | `/api/owner/parkings/:id` | x-api-key | Remove listing |
| GET | `/api/owner/stats` | x-api-key | Dashboard stats |
| POST | `/api/ai/chat` | None (rate limited) | ParkBot SSE stream |

---

## Environment Variables (Railway)
```
ANTHROPIC_API_KEY=   # Claude AI — required
OWNER_API_KEY=       # Protects /api/owner/* routes
NODE_ENV=production
PORT=                # Auto-set by Railway
```

---

## Run Locally
```bash
# Backend (port 3002)
cd C:/Users/vipul/park-as-you-desire
node server/server.js

# Mobile (Expo)
cd mobile
npm start        # Expo Go QR code
npm run web      # Browser at localhost:8081

# Standalone (no server)
# Open: parking-app.html in any browser
```

---

## UI Theme (Dark Premium)
```js
bg:        '#0d1b2a'   // main background
surface:   '#142033'   // cards
surface2:  '#1c2e44'   // elevated
border:    '#243350'
gold:      '#f0a500'   // primary CTA
teal:      '#0ab5a0'   // GPS / success
purple:    '#a78bfa'   // tertiary
text:      '#e2eaf4'
textMuted: '#6e92b5'
```

---

## Security (all implemented)
- Helmet (CSP, HSTS, X-Frame-Options)
- CORS locked to `parking.dnw-ai.com` + localhost only
- Rate limit: 100 req/15min general · 20 req/15min on `/api/ai`
- Body size: 50 kb max
- AI validation: max 40 messages, 2000 chars each
- Owner auth: `x-api-key` or `Authorization: Bearer` header
- No internal errors leaked in responses
- HTML app: right-click / F12 / Ctrl+U/S/P blocked

---

## Deploy to Railway → parking.dnw-ai.com
1. Railway → New Project → GitHub → `vipul1980ag/park-as-you-desire-`
2. Set env vars: `ANTHROPIC_API_KEY`, `OWNER_API_KEY`, `NODE_ENV=production`
3. Railway → Settings → Networking → Custom Domain → `parking.dnw-ai.com`
4. Wix DNS → Add CNAME: Host=`parking`, Value=Railway CNAME
5. Wait ~5 min for DNS propagation

---

## Key Commits
- `0b97e06` — Security hardening (helmet, rate limit, CORS, auth)
- `73a8915` — Proprietary license + copyright headers
- `6e5af0f` — Standalone HTML app (parking-app.html)
- `f331ae8` — Dark premium UI redesign (all screens)
- `5139b00` — Render/Railway deployment config
