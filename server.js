// Forsaken Fortune Teller - Messenger webhook bot (no deps, Node 18+)
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
// load .env
try { for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
const { VERIFY_TOKEN, PAGE_ACCESS_TOKEN, APP_SECRET, OPENAI_API_KEY, XAI_API_KEY } = process.env;
const PORT = process.env.PORT || 3000;
const GRAPH = 'https://graph.facebook.com/v21.0/me/messages';

const SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const NOT_NAMES = new Set(`
  a an the hi hey hello hola yo hiya howdy sup
  can could i im get my me you your we our us
  is am are was were be do does did would should shall
  what when how why where who which
  please free reading fortune tell this that it its just want need
  like give yes no ok okay thanks thank start help sign name
  question find year today now good morning afternoon evening night
  welcome seeker might let have has had not also about into over
  after before again here there and or of to for in on at by with from
  but if so then
`.trim().split(/\s+/));

const NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);
const SYNODIC_DAYS = 29.530588853;
const MOON_PHASES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];

const TIME_LINES = {
  morning: [
    'This morning the universe draws a quiet circle around your inner light.',
    'Morning rises, and the universe warms your inner light from within.',
    'In the morning hush, the universe leans close to your inner light.',
    'A bright morning opens, and the universe kindles your inner light anew.',
  ],
  afternoon: [
    'This afternoon the universe holds your inner light in a steady glow.',
    'Afternoon warmth gathers, and the universe steadies your inner light.',
    'In the long afternoon, the universe speaks softly to your inner light.',
    'The afternoon sky widens so the universe can see your inner light.',
  ],
  evening: [
    'This evening the universe folds your inner light into a kinder dark.',
    'Evening settles, and the universe listens for your inner light.',
    'As evening deepens, the universe draws your inner light nearer.',
    'The evening air thins, and the universe names your inner light.',
  ],
  night: [
    'This night the universe reads your inner light against the dark.',
    'Night opens its vault, and the universe guards your inner light.',
    'In the deep night, the universe answers through your inner light.',
    'Under the night sky, the universe keeps watch with your inner light.',
  ],
};

const WEEKDAY_LINES = [
  (day) => `The energy of ${day} moves in a clear, unhurried current.`,
  (day) => `${day} carries a bright thread of energy through the hours.`,
  (day) => `On this ${day}, fresh energy gathers and waits to be shaped.`,
  (day) => `A quiet pulse of energy marks this ${day} as a turning.`,
];

const SEASON_LINES = {
  spring: [
    'Southern spring is unfurling, and the universe blesses what is just beginning.',
    'In this southern spring, the universe plants a seed where you stand.',
    'Spring below the equator lifts a green whisper from the universe.',
    'The universe spends this southern spring teaching buds how to open.',
  ],
  summer: [
    'Southern summer burns clear, and the universe pours its heat without hurry.',
    'In this southern summer, the universe ripens whatever you have tended.',
    'Summer in the south is a wide door the universe leaves open.',
    'The universe lets this southern summer linger on the skin of the day.',
  ],
  autumn: [
    'Southern autumn lets go, and the universe gathers what has finished.',
    'In this southern autumn, the universe speaks through falling light.',
    'Autumn below the equator thins the veil so the universe can be heard.',
    'The universe uses this southern autumn to teach a gentler release.',
  ],
  winter: [
    'Southern winter draws inward, and the universe tends the hidden coal.',
    'In this southern winter, the universe speaks from a still, cold sky.',
    'Winter in the south keeps a long silence the universe knows how to use.',
    'The universe banks its fire through this southern winter and waits.',
  ],
};

const MOON_LINES = {
  'New Moon': [
    'The New Moon is a dark seed, and cosmic guidance asks you to begin in secret.',
    'Under the New Moon, cosmic guidance is all potential and no noise.',
    'This New Moon keeps cosmic guidance folded inside a quiet dark.',
    'The New Moon opens a blank page where cosmic guidance can write first.',
  ],
  'Waxing Crescent': [
    'The Waxing Crescent is a thin promise, and cosmic guidance grows with it.',
    'Under the Waxing Crescent, cosmic guidance favors a small brave start.',
    'This Waxing Crescent carries cosmic guidance like a sliver of silver.',
    'The Waxing Crescent teaches cosmic guidance how to increase.',
  ],
  'First Quarter': [
    'The First Quarter asks for a choice, and cosmic guidance stands at the crossroad.',
    'Under the First Quarter, cosmic guidance strengthens whatever you commit to.',
    'This First Quarter turns cosmic guidance into a clear decision.',
    'The First Quarter holds cosmic guidance in a half-lit balance.',
  ],
  'Waxing Gibbous': [
    'The Waxing Gibbous swells, and cosmic guidance asks you to refine, not rush.',
    'Under the Waxing Gibbous, cosmic guidance polishes what you have begun.',
    'This Waxing Gibbous fills with cosmic guidance that is almost complete.',
    'The Waxing Gibbous lets cosmic guidance ripen just out of reach.',
  ],
  'Full Moon': [
    'The Full Moon reveals, and cosmic guidance is too bright to ignore.',
    'Under the Full Moon, cosmic guidance shows the thing you already know.',
    'This Full Moon spills cosmic guidance across the whole night.',
    'The Full Moon holds cosmic guidance up where nothing can hide.',
  ],
  'Waning Gibbous': [
    'The Waning Gibbous softens, and cosmic guidance turns toward gratitude.',
    'Under the Waning Gibbous, cosmic guidance helps you share what you learned.',
    'This Waning Gibbous eases cosmic guidance into a generous release.',
    'The Waning Gibbous lets cosmic guidance loosen its grip with kindness.',
  ],
  'Last Quarter': [
    'The Last Quarter is a shedding, and cosmic guidance helps you set down the extra.',
    'Under the Last Quarter, cosmic guidance favors forgiveness and a cleaner path.',
    'This Last Quarter turns cosmic guidance toward what must be released.',
    'The Last Quarter offers cosmic guidance as a quiet ending.',
  ],
  'Waning Crescent': [
    'The Waning Crescent is a last thin light, and cosmic guidance rests before renewal.',
    'Under the Waning Crescent, cosmic guidance whispers surrender and trust.',
    'This Waning Crescent keeps cosmic guidance small, tender, and nearly new.',
    'The Waning Crescent lets cosmic guidance fade so a new cycle can breathe.',
  ],
};

const PERSONAL_LINES = {
  both: [
    (name, sign) => `${name}, the universe already knows the ${sign} current in your inner light.`,
    (name, sign) => `${name}, cosmic guidance gathers around your ${sign} energy.`,
    (name, sign) => `Beloved ${name}, your ${sign} spirit is a lantern the universe can see.`,
    (name, sign) => `${name}, the ${sign} flame of your inner light is already known to the cosmos.`,
  ],
  name: [
    (name) => `${name}, the universe has heard your name moving through the inner light.`,
    (name) => `${name}, cosmic guidance turns toward you and still waits to learn your star sign.`,
    (name) => `Beloved ${name}, your inner light is recognized, and your star sign is not yet spoken.`,
    (name) => `${name}, the cosmos keeps your name, and the energy of your star sign is still veiled.`,
  ],
  sign: [
    (sign) => `Seeker of ${sign}, that current of energy is already in the room, and your name has not been spoken.`,
    (sign) => `The ${sign} energy is clear, though the universe still waits for your name.`,
    (sign) => `Your ${sign} inner light has arrived ahead of your name.`,
    (sign) => `Cosmic guidance recognizes ${sign}, and still asks the universe for your name.`,
  ],
  none: [
    'Seeker, the universe has not yet heard your name, and no star sign has been offered.',
    'Your inner light is welcome, though your name and star sign are still unspoken.',
    'The universe waits without your name, and without a star sign to call the current.',
    'Cosmic guidance is here, ready for your name and your star sign.',
  ],
};

const ASK_LINES = {
  'name,sign,question': [
    'Offer your name, your star sign, and the question glowing in your inner light.',
    'The cosmos is listening for your name, your star sign, and a question.',
    'Speak your name, your star sign, and the question you carry.',
  ],
  'name,sign': [
    'Offer your name and your star sign, and the reading will open.',
    'Whisper your name and your star sign so guidance can find you.',
    'Your name and your star sign are the only keys still missing.',
  ],
  'name,question': [
    'Offer your name and the question your inner light is holding.',
    'The universe still needs your name and your question.',
    'Share your name and the question you want answered.',
  ],
  'sign,question': [
    'Offer your star sign and the question your inner light is holding.',
    'The universe still needs your star sign and your question.',
    'Share your star sign and the question you want answered.',
  ],
  name: [
    'By what name may the universe address your inner light?',
    'Offer your name, and the guidance can speak to you directly.',
    'Your name is the last missing note.',
  ],
  sign: [
    'Which star sign walks with your inner light?',
    'Offer your star sign so the current can be named.',
    'Your star sign is the last missing note.',
  ],
  question: [
    'What question shall cosmic guidance answer for you?',
    'Share the question your inner light is holding.',
    'Ask the question you want the universe to meet.',
  ],
};

const FORTUNE_OPENS = [
  (name, sign, moon, season) => `${name}, under the ${moon}, southern ${season} energy draws the universe around your ${sign} inner light.`,
  (name, sign, moon, season) => `${name}, the ${moon} and this southern ${season} stir the universe, and your ${sign} inner light answers.`,
  (name, sign, moon, season) => `The universe gathers your ${sign} energy, ${name}, beneath the ${moon} in southern ${season}, where your inner light is easy to see.`,
  (name, sign, moon, season) => `${name}, cosmic guidance finds your ${sign} inner light under the ${moon}, within southern ${season} and the wider universe.`,
];

const FORTUNE_ANSWERS = [
  (q) => `About "${q}", cosmic guidance says the way opens when your energy takes one honest step.`,
  (q) => `For "${q}", the universe offers a gentle yes, carried on patient energy.`,
  (q) => `On "${q}", cosmic guidance bends toward you: what you seek is already walking closer.`,
  (q) => `Asked of the universe, "${q}" meets this reply — trust your inner light and let your energy move first.`,
];

const SYSTEM = "You are the Forsaken Fortune Teller, a mystical oracle. Reply with a short fortune of 2-4 sentences using ONLY the name, star sign, and question provided, plus the given moon phase and southern-hemisphere season. Use a spiritual tone (energy, universe, inner light, cosmic guidance). Be kind. No medical, legal, or financial advice. Never ask for personal data, a profile, or payment. The reading is free. End with exactly: (For entertainment only.)";

const sessions = new Map();

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function titleName(word) {
  return String(word).split(/([-’'])/).map((part) => {
    if (part === '-' || part === "'" || part === '’' || !part) return part;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join('');
}
function isUsableName(word) {
  if (!word || word.length < 2) return false;
  if (!/^[A-Za-z][A-Za-z'’-]*$/.test(word)) return false;
  return !NOT_NAMES.has(word.toLowerCase());
}

function brisbaneContext(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'long',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  const hour = Number(get('hour')) % 24;
  const month = Number(get('month'));
  let timeOfDay = 'night';
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  let season = 'winter';
  if (month >= 9 && month <= 11) season = 'spring';
  else if (month === 12 || month <= 2) season = 'summer';
  else if (month >= 3 && month <= 5) season = 'autumn';
  return { timeOfDay, weekday: get('weekday'), season, hour, month, day: Number(get('day')) };
}

function moonPhase(date = new Date()) {
  const cycle = SYNODIC_DAYS * 24 * 60 * 60 * 1000;
  let age = (date.getTime() - NEW_MOON_UTC) % cycle;
  if (age < 0) age += cycle;
  return MOON_PHASES[Math.floor((age / cycle) * 8) % 8];
}

function extractExplicitName(text) {
  const re = /\b(?:my name is|this is|name is|name:|i\s*am|i['’]m|\bim\b)\s+([A-Za-z][A-Za-z'’-]*)/gi;
  let m;
  while ((m = re.exec(text))) {
    if (isUsableName(m[1])) return titleName(m[1]);
  }
  return null;
}

function extractLeadingName(text) {
  const m = String(text || '').match(/^([A-Z][A-Za-z'’-]*)\s*,/);
  if (!m || !isUsableName(m[1]) || SIGNS.includes(m[1].toLowerCase())) return null;
  return titleName(m[1]);
}

function extractSign(text) {
  const m = String(text || '').match(new RegExp(`\\b(${SIGNS.join('|')})\\b`, 'i'));
  return m ? m[1].toLowerCase() : null;
}

function stripLeadingGreeting(text) {
  return String(text || '').replace(/^(?:get started|hi|hey|hello|hiya|howdy|yo|hola|start|help)(?:\s+there)?\b[\s,!.:-]*/i, '').trim();
}

function stripName(text, name) {
  const n = escapeRe(name);
  return String(text || '')
    .replace(new RegExp(`\\b(?:my name is|this is|name is|name:)\\s+${n}\\b`, 'i'), ' ')
    .replace(new RegExp(`\\b(?:i\\s*am|i['’]m|\\bim\\b)\\s+${n}\\b`, 'i'), ' ')
    .replace(new RegExp(`^${n}\\s*,\\s*`, 'i'), ' ');
}

function cleanupRemainder(text) {
  return String(text || '')
    .replace(/\b(?:i\s*am|i['’]m|\bim\b|my name is|this is|name is)\s+(?:a|an|the)\b/gi, ' ')
    .replace(/(?:\s*[,;:]+\s*)+/g, ', ')
    .replace(/^[\s,.\-–—:;]+/, '')
    .replace(/[\s,.\-–—:;]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractQuestion(rest) {
  let s = cleanupRemainder(rest).replace(/^(?:and|but|so|then|please)\b[\s,:-]*/i, '').trim();
  if (!s) return null;
  const marked = s.match(/([^?.!]{0,400}\?)/);
  if (marked) {
    const q = cleanupRemainder(marked[1]);
    if (q && q !== '?') return q;
  }
  if (/^(will|should|what|when|how|does|is|am|can)\b/i.test(s)) {
    const clause = s.split(/[.!]/)[0].trim();
    return clause || null;
  }
  return null;
}

function parseMessage(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  const body = stripLeadingGreeting(raw);
  const name = extractExplicitName(raw) || extractLeadingName(body);
  const sign = extractSign(raw);
  let rest = body;
  if (name) rest = stripName(rest, name);
  if (sign) rest = rest.replace(new RegExp(`\\b${escapeRe(sign)}\\b`, 'i'), ' ');
  const question = extractQuestion(rest);
  return { name: name || null, sign, question };
}

function personalLine(state) {
  const sign = state.sign ? cap(state.sign) : null;
  if (state.name && sign) return pick(PERSONAL_LINES.both)(state.name, sign);
  if (state.name) return pick(PERSONAL_LINES.name)(state.name);
  if (sign) return pick(PERSONAL_LINES.sign)(sign);
  return pick(PERSONAL_LINES.none);
}

function askLine(state) {
  const missing = [];
  if (!state.name) missing.push('name');
  if (!state.sign) missing.push('sign');
  if (!state.question) missing.push('question');
  if (!missing.length) return '';
  return pick(ASK_LINES[missing.join(',')]);
}

function buildWelcome(state, date = new Date()) {
  const ctx = brisbaneContext(date);
  const phase = moonPhase(date);
  const bits = [
    pick(TIME_LINES[ctx.timeOfDay]),
    pick(WEEKDAY_LINES)(ctx.weekday),
    pick(SEASON_LINES[ctx.season]),
    pick(MOON_LINES[phase]),
    personalLine(state || {}),
    askLine(state || {}),
    'This reading is free.',
    '(For entertainment only.)',
  ].filter(Boolean);
  return bits.join(' ');
}

function buildFortune(state, date = new Date()) {
  const ctx = brisbaneContext(date);
  const phase = moonPhase(date);
  const sign = cap(state.sign);
  const open = pick(FORTUNE_OPENS)(state.name, sign, phase, ctx.season);
  const answer = pick(FORTUNE_ANSWERS)(state.question);
  return `${open} ${answer} This reading is free. (For entertainment only.)`;
}

function isGreetingOnly(text, postback) {
  if (postback) return true;
  const t = String(text || '').trim();
  if (!t) return true;
  return /^(hi|hello|hey|start|get started|help)\b[!. ]*$/i.test(t);
}

function replyFor(state, text, options = {}) {
  const date = options.date || new Date();
  const next = {
    name: (state && state.name) || null,
    sign: (state && state.sign) || null,
    question: (state && state.question) || null,
  };
  const parsed = parseMessage(text || '');
  if (parsed.name) next.name = parsed.name;
  if (parsed.sign) next.sign = parsed.sign;
  if (parsed.question) next.question = parsed.question;
  if (!isGreetingOnly(text, options.postback) && next.name && next.sign && next.question) {
    const reading = { name: next.name, sign: next.sign, question: next.question };
    const fortune = buildFortune(reading, date);
    next.question = null;
    return { state: next, messages: [fortune], kind: 'fortune', reading };
  }
  return { state: next, messages: [buildWelcome(next, date)], kind: 'welcome', reading: null };
}

async function maybeLlm(reading, fallback, date = new Date()) {
  const cfg = XAI_API_KEY ? { url: 'https://api.x.ai/v1/chat/completions', key: XAI_API_KEY, model: process.env.XAI_MODEL || 'grok-3-mini' }
    : OPENAI_API_KEY ? { url: 'https://api.openai.com/v1/chat/completions', key: OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' } : null;
  if (!cfg) return fallback;
  const ctx = brisbaneContext(date);
  const phase = moonPhase(date);
  const brief = `Name: ${reading.name}\nStar sign: ${reading.sign}\nQuestion: ${reading.question}\nMoon phase: ${phase}\nSouthern season: ${ctx.season}\nTime of day: ${ctx.timeOfDay}\nWeekday: ${ctx.weekday}`;
  try {
    const r = await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ model: cfg.model, max_tokens: 200, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: brief.slice(0, 1000) }] }),
      signal: AbortSignal.timeout(15000) });
    const j = await r.json();
    const out = j.choices?.[0]?.message?.content?.trim();
    if (!out) return fallback;
    return out.includes('(For entertainment only.)') ? out : `${out} (For entertainment only.)`;
  } catch (e) { console.error('LLM error', e.message); return fallback; }
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
  const prev = sessions.get(psid) || { name: null, sign: null, question: null };
  const date = new Date();
  const result = replyFor(prev, text, { date, postback: !!ev.postback });
  sessions.set(psid, result.state);
  let msg = result.messages[0];
  if (result.kind === 'fortune') msg = await maybeLlm(result.reading, msg, date);
  await send(psid, msg);
}

function validSig(req, raw) {
  if (!APP_SECRET) return true;
  const sig = req.headers['x-hub-signature-256'] || '';
  const exp = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex');
  return sig.length === exp.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp));
}

function onRequest(req, res) {
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
}

if (require.main === module) {
  http.createServer(onRequest).listen(PORT, () => console.log(`Listening on ${PORT}; LLM: ${XAI_API_KEY ? 'xAI' : OPENAI_API_KEY ? 'OpenAI' : 'none (local generator)'}`));
}

module.exports = {
  parseMessage, replyFor, buildWelcome, buildFortune, moonPhase, brisbaneContext,
  MOON_PHASES, SIGNS, NEW_MOON_UTC, SYNODIC_DAYS,
};
