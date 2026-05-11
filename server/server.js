// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const parkingsRouter = require('./routes/parkings');
const ownerRouter = require('./routes/owner');
const aiRouter = require('./routes/ai');
const authRouter = require('./routes/auth');
const geocodeRouter = require('./routes/geocode');

const app = express();
const PORT = process.env.PORT || 3002;

// ── Allowed origins ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://parking.dnw-ai.com',
  'https://www.parking.dnw-ai.com',
  'https://safe2go.dnw-ai.com',
  'https://www.safe2go.dnw-ai.com',
  'https://toc.dnw-ai.com',
  'https://www.toc.dnw-ai.com',
  'http://localhost:3002',
  'http://localhost:8081',
  'http://localhost:19006',
];

// ── Security headers (Helmet) ────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org'],
      connectSrc: ["'self'", 'https://overpass-api.de', 'https://photon.komoot.io', 'https://nominatim.openstreetmap.org', 'https://router.project-osrm.org'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
}));

// ── CORS — only allow known origins ─────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow mobile app requests (no origin) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-owner-id', 'ownerid'],
  credentials: true,
}));

// ── Body size limit (prevent payload attacks) ────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ── General rate limit: 100 req / 15 min per IP ──────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// ── Strict AI rate limit: 20 req / 15 min per IP ────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'AI rate limit reached. Please wait before sending more messages.' },
});

app.use(generalLimiter);

// ── Request logging ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path} — ${req.ip}`);
  next();
});

// ── Static files — no-cache so browser always gets latest JS/HTML ─────────────
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  },
}));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/parkings', parkingsRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/ai', aiLimiter, aiRouter);
app.use('/api/geocode', geocodeRouter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler (don't leak route paths) ────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// ── Global error handler (don't leak internals) ──────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.message && err.message.startsWith('CORS')) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\nPark As You Desire API — running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
