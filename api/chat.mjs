// Coach chat: a Vercel server function that passes your question to Claude
// and streams the answer back as plain text. It only answers; it can't change
// anything in the app.
//
// Needs ANTHROPIC_API_KEY set in Vercel → Project → Settings → Environment Variables.
// The key stays on the server and never reaches the phone.

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';
const MAX_MESSAGES = 20;    // only the most recent messages are sent
const MAX_CHARS = 2000;     // per message
const MAX_CONTEXT_CHARS = 1500;

const SYSTEM = `You are the coach inside Train & Eat, a workout and meal-planning app used on an iPhone.
You combine two kinds of expertise:
- an experienced sports therapist and strength coach (gym weights, home bodyweight training, cardio, calisthenics; technique, programming, progression, warm-ups, recovery, working around niggles)
- a sports-nutrition chef (gaining, losing and maintaining weight; calories and protein; simple, practical recipes)

How to answer:
- Be warm, direct and practical. Most people read this on a phone mid-workout or in a kitchen, so keep answers short: a few sentences or a short list. Go longer only when asked.
- Use plain text. You may use short "- " bullet lists and **bold** for a key phrase. No headings, tables or code blocks.
- Give concrete numbers where they help (sets, reps, rest, grams, calories), and say they are rough guides.
- When the person's profile or program is given below, use it rather than asking again.
- Stick to training, movement, recovery, sleep, food and this app. For anything else, say briefly that you're a training and nutrition coach.

Safety:
- You give general guidance, not medical advice. You cannot diagnose.
- Sharp, sudden or worsening pain, numbness, chest pain, dizziness or breathlessness out of proportion to effort: tell them to stop and get checked by a doctor or physio.
- For pregnancy, under-16s, eating disorders, diabetes, heart, kidney or other health conditions, give only cautious general information and suggest they plan with a professional.
- Never recommend crash diets, very low calorie intakes, unsafe supplements, or drugs.`;

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 100_000) reject(new Error('too large'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

function send(res, status, text) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(text);
}

// Keeps only well-formed, alternating user/assistant text, ending with the user.
function cleanMessages(input) {
  if (!Array.isArray(input)) return null;
  const messages = input
    .slice(-MAX_MESSAGES)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') return null;
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].role === messages[i - 1].role) return null;
  }
  return messages;
}

// Browsers send Origin on a POST; refuse calls made from other websites.
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, 'Use POST.');
  }
  if (!sameOrigin(req)) return send(res, 403, 'Not allowed.');
  if (!process.env.ANTHROPIC_API_KEY) {
    return send(res, 503, "The coach isn't set up yet. Add ANTHROPIC_API_KEY in Vercel, then redeploy.");
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, "That message couldn't be read.");
  }
  const messages = cleanMessages(body.messages);
  if (!messages) return send(res, 400, "That message couldn't be read.");

  const context = typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT_CHARS) : '';
  const system = [{ type: 'text', text: SYSTEM }];
  if (context) system.push({ type: 'text', text: `About this person (from the app):\n${context}` });

  const client = new Anthropic();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages,
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(event.delta.text);
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      res.write("\n\nSorry, I can't help with that one. Try asking another way, or about something else.");
    } else if (final.stop_reason === 'max_tokens') {
      res.write('\n\n(That answer was cut short. Ask me to carry on.)');
    }
    res.end();
  } catch (error) {
    let message = 'The coach is unavailable right now. Try again in a minute.';
    if (error instanceof Anthropic.AuthenticationError) {
      message = "The coach's API key isn't working. Check ANTHROPIC_API_KEY in Vercel.";
    } else if (error instanceof Anthropic.RateLimitError) {
      message = 'The coach is busy. Wait a moment and try again.';
    } else if (error instanceof Anthropic.APIError) {
      console.error(`Claude API error ${error.status}:`, error.message);
    } else {
      console.error(error);
    }
    if (!res.headersSent) return send(res, 502, message);
    res.end(`\n\n${message}`);
  }
}
