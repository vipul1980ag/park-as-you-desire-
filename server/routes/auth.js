// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const GOOGLE_CLIENT_ID = '162412530588-g8iv5oghooqdvh9te8agmvnjc3159686.apps.googleusercontent.com';
const ADMIN_EMAILS     = ['vipul.orlando@gmail.com', 'vipulaccenture2018@gmail.com'];

function parseDeviceInfo(req) {
  const ua  = req.headers['user-agent'] || '';
  const ip  = ((req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket?.remoteAddress || 'unknown';
  const device = /iPad/i.test(ua) ? 'iPad' : /iPhone/i.test(ua) ? 'iPhone' : /Android.*Mobile/i.test(ua) ? 'Android Phone' : /Android/i.test(ua) ? 'Android Tablet' : /Mobile/i.test(ua) ? 'Mobile' : 'Desktop';
  const os = /Windows/i.test(ua) ? 'Windows' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Mac OS X/i.test(ua) ? 'macOS' : /Android/i.test(ua) ? 'Android' : /Linux/i.test(ua) ? 'Linux' : 'Unknown';
  const browser = /Edg\//i.test(ua) ? 'Edge' : /OPR|Opera/i.test(ua) ? 'Opera' : /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Other';
  return { device, os, browser, ip, at: new Date().toISOString() };
}

const USERS_PATH = path.join(__dirname, '../data/users.json');

function readUsers() {
  if (!fs.existsSync(USERS_PATH)) return [];
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf8');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const users = readUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim())) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const token = uuidv4();
    const user = {
      userId: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      token,
      createdAt: new Date().toISOString(),
      loginCount: 1,
      lastLogin: new Date().toISOString(),
      lastDevice: parseDeviceInfo(req),
    };

    users.push(user);
    writeUsers(users);

    res.status(201).json({
      success: true,
      userId: user.userId,
      token: user.token,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const users = readUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Rotate token on each login
    user.token = uuidv4();
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLogin  = new Date().toISOString();
    user.lastDevice = parseDeviceInfo(req);
    writeUsers(users);

    res.json({
      success: true,
      userId: user.userId,
      token: user.token,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/sso — cross-app sign-in via Safe2Go JWT
router.post('/sso', async (req, res) => {
  try {
    const { safe2go_jwt } = req.body;
    if (!safe2go_jwt) {
      return res.status(400).json({ success: false, message: 'safe2go_jwt is required' });
    }

    // Verify the JWT with Safe2Go backend
    let s2gUser;
    try {
      const response = await fetch('https://safe2go.dnw-ai.com/api/auth/me', {
        headers: { Authorization: `Bearer ${safe2go_jwt}` },
      });
      if (!response.ok) throw new Error('rejected');
      s2gUser = await response.json();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired Safe2Go session' });
    }

    const { name, email } = s2gUser;
    if (!email) {
      return res.status(401).json({ success: false, message: 'Could not retrieve account from Safe2Go' });
    }

    // Upsert user in parking users.json
    const users = readUsers();
    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      user.token = uuidv4();
      if (name) user.name = name;
    } else {
      user = {
        userId: uuidv4(),
        name: name || email,
        email: email.toLowerCase(),
        passwordHash: null, // SSO — no password
        token: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      users.push(user);
    }
    writeUsers(users);

    res.json({
      success: true,
      userId: user.userId,
      token: user.token,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error('SSO error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ success: false, message: 'credential required' });
    const r    = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    if (!r.ok || data.error_description) return res.status(401).json({ success: false, message: 'Invalid Google token' });
    if (data.aud !== GOOGLE_CLIENT_ID) return res.status(401).json({ success: false, message: 'Token client mismatch' });
    const { sub: googleId, email, name, picture } = data;
    if (!email) return res.status(400).json({ success: false, message: 'No email in Google token' });
    const users = readUsers();
    let user = users.find(u => u.googleId === googleId) || users.find(u => u.email.toLowerCase() === email.toLowerCase());
    const now = new Date().toISOString();
    const deviceInfo = parseDeviceInfo(req);
    if (!user) {
      user = { userId: uuidv4(), name: name || email, email: email.toLowerCase(), passwordHash: null, token: uuidv4(), googleId, googleName: name, googlePicture: picture, createdAt: now, loginCount: 1, lastLogin: now, lastDevice: deviceInfo };
      users.push(user);
    } else {
      user.googleId = googleId; user.googleName = name; user.googlePicture = picture; user.token = uuidv4();
      user.loginCount = (user.loginCount || 0) + 1; user.lastLogin = now; user.lastDevice = deviceInfo;
    }
    writeUsers(users);
    res.json({ success: true, userId: user.userId, token: user.token, name: user.name, email: user.email, googleName: name, googlePicture: picture });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(500).json({ success: false, message: 'Google auth failed' });
  }
});

// GET /api/auth/admin-users (admin only)
router.get('/admin-users', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const users = readUsers();
  const caller = users.find(u => u.token === token);
  if (!caller || !ADMIN_EMAILS.includes(caller.email.toLowerCase())) return res.status(403).json({ success: false, message: 'Admin access required' });
  res.json(users.map(u => ({ userId: u.userId, name: u.name, email: u.email, createdAt: u.createdAt, lastLogin: u.lastLogin || null, loginCount: u.loginCount || 0, lastDevice: u.lastDevice || null, googleLinked: !!u.googleId, googleName: u.googleName || null, googlePicture: u.googlePicture || null })));
});

module.exports = router;
