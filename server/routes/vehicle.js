// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const _anthropicMod = require('@anthropic-ai/sdk');
const AnthropicCtor = _anthropicMod.default || _anthropicMod;

// ── Local vehicle database ─────────────────────────────────────────────────
const VEHICLES_PATH = path.join(__dirname, '../data/vehicles.json');
let vehicleDB = [];
try { vehicleDB = JSON.parse(fs.readFileSync(VEHICLES_PATH, 'utf8')); } catch {}

function localLookup(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  // Score each vehicle by how many query terms match make/model/year_range
  const scored = vehicleDB.map(v => {
    const haystack = `${v.make} ${v.model} ${v.year_range}`.toLowerCase();
    const score = terms.filter(t => haystack.includes(t)).length;
    return { v, score };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.length > 0 ? scored[0].v : null;
}

// ── AI clients ─────────────────────────────────────────────────────────────
let anthropicClient = null;
function getAnthropicClient() {
  if (!anthropicClient) anthropicClient = new AnthropicCtor({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

const VEHICLE_PROMPT = (q) => `You are a vehicle database. Return ONLY valid JSON (no explanation, no markdown) for this vehicle: "${q}".

Use this exact format:
{"make":"Ford","model":"Transit Custom","year_range":"2013-present","type":"van","length_m":5.34,"width_m":2.03,"height_m":1.98,"weight_t":3.5,"notes":"Standard wheelbase, medium roof"}

Rules:
- type must be exactly one of: car, suv, van, truck, motorcycle, minibus, pickup, microcar
- Use null for genuinely unknown numeric values (but try to give approximate values)
- length_m, width_m, height_m are the vehicle's outer body dimensions in metres (excluding mirrors for width)
- weight_t is gross vehicle weight in tonnes
- If the query is vague (e.g. just "Ford"), return the most common/popular model
- If the vehicle does not exist, return {"error":"Vehicle not found"}`;

async function lookupViaAnthropic(q) {
  const msg = await getAnthropicClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: VEHICLE_PROMPT(q) }],
  });
  return msg.content[0].text.trim();
}

async function lookupViaOpenRouter(q) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://parking.dnw-ai.com',
      'X-Title': 'Park As You Desire',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4.5',
      max_tokens: 300,
      messages: [{ role: 'user', content: VEHICLE_PROMPT(q) }],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenRouter error ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function parseVehicleJSON(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// GET /api/vehicle/lookup?q=Ford+Transit+Custom+2022
// 1. Check local database first (instant, no API cost)
// 2. Fall back to AI (Anthropic → OpenRouter) for unknown vehicles
router.get('/lookup', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) {
    return res.status(400).json({ success: false, message: 'Vehicle query required' });
  }

  // ── 1. Local database lookup ──────────────────────────────────────────────
  const local = localLookup(q);
  if (local) {
    return res.json({ success: true, vehicle: local, source: 'local' });
  }

  // ── 2. AI fallback ────────────────────────────────────────────────────────
  const hasAnthropic  = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

  if (!hasAnthropic && !hasOpenRouter) {
    return res.status(404).json({ success: false, message: 'Vehicle not found in local database and no AI key configured' });
  }

  try {
    let raw = null;
    if (hasAnthropic) {
      raw = await lookupViaAnthropic(q);
    } else {
      raw = await lookupViaOpenRouter(q);
    }

    const vehicle = parseVehicleJSON(raw);
    if (!vehicle) return res.status(422).json({ success: false, message: 'Could not parse vehicle data' });
    if (vehicle.error) return res.status(404).json({ success: false, message: vehicle.error });

    return res.json({ success: true, vehicle, source: 'ai' });
  } catch (err) {
    console.error('Vehicle lookup error:', err.message);
    const msg = err.message.toLowerCase().includes('credit') || err.message.toLowerCase().includes('quota')
      ? 'Vehicle not found in local database. AI lookup is currently unavailable.'
      : 'Vehicle lookup failed. Please try a different search term.';
    return res.status(503).json({ success: false, message: msg });
  }
});

module.exports = router;
