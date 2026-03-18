const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are ParkBot, an expert AI assistant for the "Park As You Desire" parking app.
You help drivers find the best parking spots, answer questions about parking, explain costs, and give smart recommendations.

You know about these parking types:
- Dedicated Parking: purpose-built car parks, usually secure with CCTV
- Street Parking / Street Designated Parking: on-street spaces, often pay & display
- Private Open Lot: open-air private land, barrier or attendant access
- Unlocked Garage: covered garage, no barrier
- Locked Garage: covered garage with barrier/key access
- Driveway / Residential: private home driveways listed by owners
- Underground: below-ground car park, usually the most secure

When a user asks to find parking, extract the destination and any preferences (type, budget, time) and return a JSON action block like this so the app can auto-search:
<action>{"type":"search","destination":"Canary Wharf, London","parkingType":"","radius":2000,"priority":"distance"}</action>

You can also:
- Recommend the cheapest, nearest, or safest option from results the user pastes
- Estimate parking costs for a given duration
- Explain parking regulations or tips for a city
- Compare parking options
- Help with navigation questions

Be concise, friendly, and practical. Use British English. If you suggest a search action, include it at the end of your reply.`;

// POST /api/ai/chat
// Body: { messages: [{role, content}], context?: {parkings, userLat, userLng, destLat, destLng} }
router.post('/chat', async (req, res) => {
  const { messages, context } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: 'messages array required' });
  }

  // Build context string to prepend to the latest user message if context provided
  let contextNote = '';
  if (context) {
    if (context.userLat && context.userLng) {
      contextNote += `[User location: ${context.userLat.toFixed(4)}, ${context.userLng.toFixed(4)}] `;
    }
    if (context.destLat && context.destLng) {
      contextNote += `[Destination: ${context.destLat.toFixed(4)}, ${context.destLng.toFixed(4)}] `;
    }
    if (context.parkings && context.parkings.length > 0) {
      const top5 = context.parkings.slice(0, 5).map(p =>
        `• ${p.name} — ${p.type || p.typeName || ''}, £${p.costPerHour || 0}/hr, ${p.availableSpots ?? '?'} spots, ${p.distance ? (p.distance < 1 ? Math.round(p.distance * 1000) + 'm' : p.distance.toFixed(1) + 'km') : '?'} away`
      ).join('\n');
      contextNote += `\n[Current search results (top 5):\n${top5}]`;
    }
  }

  // Inject context into the last user message
  const apiMessages = messages.map((m, i) => {
    if (i === messages.length - 1 && m.role === 'user' && contextNote) {
      return { role: 'user', content: contextNote + '\n' + m.content };
    }
    return { role: m.role, content: m.content };
  });

  // Set up SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: apiMessages,
    });

    stream.on('text', (delta) => {
      res.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`);
    });

    stream.on('error', (err) => {
      console.error('Claude stream error:', err.message);
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    });

    stream.on('finalMessage', () => {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI service error: ' + err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
