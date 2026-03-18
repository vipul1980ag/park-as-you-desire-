const express = require('express');
const cors = require('cors');
const path = require('path');

const parkingsRouter = require('./routes/parkings');
const ownerRouter = require('./routes/owner');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url}`);
  next();
});

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/parkings', parkingsRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/ai', aiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Park As You Desire API is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\nPark As You Desire API Server`);
  console.log(`Running on: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Parkings: http://localhost:${PORT}/api/parkings\n`);
});

module.exports = app;
