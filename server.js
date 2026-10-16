// Forsaken Fortune Teller - Messenger webhook bot (no deps, Node 18+)
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
// load .env
try { for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
const { VERIFY_TOKEN, PAGE_ACCESS_TOKEN, APP_SECRET, OPENAI_API_KEY, XAI_API_KEY } = process.env;
const PORT = process.env.PORT || 3000;
const GRAPH = 'https://graph.facebook.com/v21.0/me/messages';
const seen = new Set(); // first-time tracking (in memory)

const SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const SYSTEM = "You are the Forsaken Fortune Teller, a mystical, playful oracle. Reply with a short fortune of 2-4 sentences based ONLY on the user's message (their name, star sign, question). Be whimsical and kind; no medical, legal, or financial advice; never ask for personal data or payment. End with a light reminder it's for entertainment only.";
const GREETING = "🔮 Welcome, seeker, to the Forsaken Fortune Teller! For a reading, send me your name, your star sign, and a question — e.g. \"Maya, Leo, will I find adventure this year?\" (Fortunes are for entertainment only.)";

function pick(a, seed) { return a[seed % a.length]; }
function localFortune(text) {
  const t = text.toLowerCase();
  const sign = SIGNS.find(s => t.includes(s));
  const nm = text.match(/(?:i am|i'm|my name is|name:)\s*([A-Za-z]+)/i) || text.match(/^([A-Z][a-z]+)\s*[,.]/);
  const name = nm ? nm[1] : 'seeker';
  const q = (text.match(/[^.!?]*\?/) || [''])[0].trim();
  const seed = [...crypto.createHash('md5').update(text + new Date().toDateString()).digest()].reduce((a, b) => a + b, 0);
  const opens = [`The candles flicker for you, ${name}.`, `Ah, ${name}, the mists part at last.`, `The crystal hums your name, ${name}.`, `I see you through the smoke, ${name}.`];
  const signs = sign ? [`${sign[0].toUpperCase()+sign.slice(1)} energy swirls boldly around you this moon.`, `The stars of ${sign[0].toUpperCase()+sign.slice(1)} lean in to whisper secrets.`, `Your ${sign} spirit is restless — a good omen.`] : ['The stars are coy, for you kept your sign hidden.', 'Even unnamed stars shine on you tonight.'];
  const answers = q ? [`As for "${q}" — the answer arrives sideways, when you stop staring at the door.`, `Your question "${q}" stirs the cards: patience, then a pleasant surprise.`, `On "${q}", the bones say yes… but only if you take the first step.`] : ['A small kindness you give returns doubled before the next full moon.', 'Something lost will turn up in an unlikely pocket.', 'A curious stranger brings a useful idea.'];
  const closes = ['(For entertainment only ✨)', '(The spirits jest — entertainment only 🔮)'];
  return [pick(opens, seed), pick(signs, seed >> 1), pick(answers, seed >> 2), pick(closes, seed >> 3)].join(' ');
}

async function llmFortune(text) {
  const cfg = XAI_API_KEY ? { url: 'https://api.x.ai/v1/chat/completions', key: XAI_API_KEY, model: process.env.XAI_MODEL || 'grok-3-mini' }
    : OPENAI_API_KEY ? { url: 'https://api.openai.com/v1/chat/completions', key: OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' } : null;
  if (!cfg) return localFortune(text);
  try {
    const r = await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ model: cfg.model, max_tokens: 200, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text.slice(0, 1000) }] }),
      signal: AbortSignal.timeout(15000) });
    const j = await r.json(); const out = j.choices?.[0]?.message?.content?.trim();
    return out || localFortune(text);
  } catch (e) { console.error('LLM error', e.message); return localFortune(text); }
}

async function send(psid, text) {
  console.log('reply ->', psid, ':', text);
  if (!PAGE_ACCESS_TOKEN) { console.log('[no PAGE_ACCESS_TOKEN] would send to', psid, ':', text); return; }
  const r = await fetch(`${GRAPH}?access_token=${encodeURIComponent(PAGE_ACCESS_TOKEN)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: psid }, messaging_type: 'RESPONSE', message: { text: text.slice(0, 2000) } }) });
  if (!r.ok) console.error('Send API error', r.status, await r.text());
}

async function handle(ev) {
  const psid = ev.sender?.id; if (!psid) return;
  if (ev.message?.is_echo) return;
  const text = ev.message?.text?.trim() || '';
  const first = !seen.has(psid); seen.add(psid);
  const greetOnly = /^(hi|hello|hey|start|get started|help)\b[!. ]*$/i.test(text) || !text;
  if (first || greetOnly || ev.postback) await send(psid, GREETING);
  if (text && !greetOnly) await send(psid, await llmFortune(text));
}

function validSig(req, raw) {
  if (!APP_SECRET) return true;
  const sig = req.headers['x-hub-signature-256'] || '';
  const exp = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex');
  return sig.length === exp.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp));
}

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/webhook' && req.method === 'GET') {
    const ok = u.searchParams.get('hub.mode') === 'subscribe' && VERIFY_TOKEN && u.searchParams.get('hub.verify_token') === VERIFY_TOKEN;
    res.writeHead(ok ? 200 : 403, { 'Content-Type': 'text/plain' }); return res.end(ok ? u.searchParams.get('hub.challenge') || '' : 'Forbidden');
  }
  if (u.pathname === '/webhook' && req.method === 'POST') {
    const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
      const raw = Buffer.concat(chunks);
      if (!validSig(req, raw)) { res.writeHead(403); return res.end(); }
      let body; try { body = JSON.parse(raw); } catch { res.writeHead(400); return res.end(); }
      res.writeHead(200); res.end('EVENT_RECEIVED');
      if (body.object === 'page') for (const e of body.entry || []) for (const ev of e.messaging || []) handle(ev).catch(err => console.error(err));
    }); return;
  }
  if (u.pathname === '/privacy') { res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); return res.end('<h1>Forsaken Fortune Teller Privacy Policy</h1><p>Our Messenger bot only reads the messages you send to the Forsaken Fortune Teller Page, and uses them solely to write your fortune reply. We do not access your Facebook profile, sell data, or store message content beyond temporary processing. Readings are for entertainment only.</p><p>To request deletion of any data, message the Page with \"delete my data\" or email yghh54447@gmail.com.</p>'); }
  if (u.pathname === '/') { res.writeHead(200); return res.end('Forsaken Fortune Teller is listening 🔮'); }
  res.writeHead(404); res.end();
}).listen(PORT, () => console.log(`Listening on ${PORT}; LLM: ${XAI_API_KEY ? 'xAI' : OPENAI_API_KEY ? 'OpenAI' : 'none (local generator)'}`));
