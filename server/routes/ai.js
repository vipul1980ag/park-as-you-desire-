// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

// Prompt caching: keep system stable (no volatile content) so the cache prefix is always valid.
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

When the user asks to find parking anywhere, call the search_parking tool. Extract the destination and any preferences from their message. Do NOT describe a search action in text — call the tool directly.

You can also:
- Recommend the cheapest, nearest, or safest option from results the user shares
- Estimate parking costs for a given duration
- Explain parking regulations or tips for a city
- Compare parking options
- Help with navigation questions

Be concise, friendly, and practical. Use British English.`;

// Tool: triggers a parking search in the mobile app
const TOOLS = [
  {
    name: 'search_parking',
    description: 'Search for parking spots near a destination. Call this whenever the user wants to find parking somewhere.',
    input_schema: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'The destination address or place name to find parking near, e.g. "Canary Wharf, London"',
        },
        parkingType: {
          type: 'string',
          enum: ['surface', 'multi-storey', 'underground', 'street_side', ''],
          description: 'Preferred parking type. Use empty string for any type.',
        },
        radius: {
          type: 'number',
          description: 'Search radius in metres (default 1000).',
        },
        priority: {
          type: 'string',
          enum: ['distance', 'cost', 'availability'],
          description: 'What to prioritise in results.',
        },
      },
      required: ['destination'],
    },
  },
];

// POST /api/ai/chat
// Body: { messages: [{role, content}], context?: {parkings, userLat, userLng, destLat, destLng} }
router.post('/chat', async (req, res) => {
  const { messages, context } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: 'messages array required' });
  }

  // Cap conversation length to prevent abuse
  if (messages.length > 40) {
    return res.status(400).json({ success: false, message: 'Conversation too long. Please start a new session.' });
  }

  // Validate each message
  for (const m of messages) {
    if (!m.role || !['user', 'assistant'].includes(m.role)) {
      return res.status(400).json({ success: false, message: 'Invalid message role' });
    }
    if (typeof m.content !== 'string' || m.content.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message content too long (max 2000 chars)' });
    }
  }

  // Inject context as a note on the last user message (after the cached prefix boundary)
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
        `• ${p.name} — ${p.type || ''}, £${p.costPerHour || 0}/hr, ${p.availableSpots ?? '?'} spots, ${p.distance ? (p.distance < 1 ? Math.round(p.distance * 1000) + 'm' : p.distance.toFixed(1) + 'km') : '?'} away`
      ).join('\n');
      contextNote += `\n[Current search results (top 5):\n${top5}]`;
    }
  }

  const apiMessages = messages.map((m, i) => {
    if (i === messages.length - 1 && m.role === 'user' && contextNote) {
      return { role: 'user', content: contextNote + '\n' + m.content };
    }
    return { role: m.role, content: m.content };
  });

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      // Prompt caching: stable system prompt with cache_control so repeated calls
      // read from cache instead of re-processing the full system text each time.
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: TOOLS,
      tool_choice: { type: 'auto' },
      messages: apiMessages,
    });

    // Stream text deltas as they arrive
    stream.on('text', (delta) => {
      res.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`);
    });

    stream.on('error', (err) => {
      console.error('Claude stream error:', err.message);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI service error. Please try again.' })}\n\n`);
      res.end();
    });

    // On completion, extract any tool calls and emit them before closing
    stream.on('finalMessage', (message) => {
      const toolCalls = message.content.filter(b => b.type === 'tool_use');
      if (toolCalls.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'tool_calls', calls: toolCalls })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI service unavailable. Please try again.' })}\n\n`);
    res.end();
  }
});

module.exports = router;
