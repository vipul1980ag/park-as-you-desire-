// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

const express = require('express');
const router  = express.Router();
const _anthropicMod = require('@anthropic-ai/sdk');
const AnthropicCtor = _anthropicMod.default || _anthropicMod;

let client = null;
function getClient() {
  if (!client) client = new AnthropicCtor({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// GET /api/vehicle/lookup?q=Ford+Transit+Custom+2022
// Returns standardised vehicle dimensions via Claude AI
router.get('/lookup', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) {
    return res.status(400).json({ success: false, message: 'Vehicle query required' });
  }

  try {
    const msg = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are a vehicle database. Return ONLY valid JSON (no explanation, no markdown) for this vehicle: "${q}".

Use this exact format:
{"make":"Ford","model":"Transit Custom","year_range":"2013-present","type":"van","length_m":5.34,"width_m":2.03,"height_m":1.98,"weight_t":3.5,"notes":"Standard wheelbase, medium roof"}

Rules:
- type must be exactly one of: car, suv, van, truck, motorcycle, minibus, pickup, microcar
- Use null for genuinely unknown numeric values (but try to give approximate values)
- length_m, width_m, height_m are the vehicle's outer body dimensions in metres (excluding mirrors for width)
- weight_t is gross vehicle weight in tonnes
- If the query is vague (e.g. just "Ford"), return the most common/popular model
- If the vehicle does not exist, return {"error":"Vehicle not found"}`
      }]
    });

    const raw  = msg.content[0].text.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ success: false, message: 'Could not parse vehicle data' });

    const vehicle = JSON.parse(match[0]);
    if (vehicle.error) return res.status(404).json({ success: false, message: vehicle.error });

    return res.json({ success: true, vehicle });
  } catch (err) {
    console.error('Vehicle lookup error:', err.message);
    return res.status(500).json({ success: false, message: 'Vehicle lookup failed' });
  }
});

module.exports = router;
