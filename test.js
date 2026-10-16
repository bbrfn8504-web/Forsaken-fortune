// Tiny parser and welcome self-test. No dependencies.
const assert = require('assert');
const {
  parseMessage, replyFor, buildWelcome, buildFortune, moonPhase, brisbaneContext,
  MOON_PHASES, SIGNS, NEW_MOON_UTC, SYNODIC_DAYS,
  createVideoReading, listCalls, resetCalls, onRequest, handle,
  VIDEO_BUTTON_TITLE, JOIN_BUTTON_TITLE, VIDEO_PAYLOAD,
} = require('./server');

function textOf(msg) {
  if (typeof msg === 'string') return msg;
  return msg?.attachment?.payload?.text || '';
}

function invoke(method, url) {
  let status = 0;
  let body = '';
  const req = { method, url, headers: {} };
  const res = {
    writeHead(code) { status = code; },
    end(chunk) { body = chunk == null ? '' : String(chunk); },
  };
  onRequest(req, res);
  return { status, body };
}

function at(year, month, day, hour, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 10, minute, 0));
}

const hi = 'Hi, can I get a free reading?';
const hiParsed = parseMessage(hi);
assert.strictEqual(hiParsed.name, null, `name should be empty, got ${hiParsed.name}`);
assert.notStrictEqual(hiParsed.name, 'a');
assert.strictEqual(hiParsed.sign, null);
assert.notStrictEqual(hiParsed.question, hi);
assert.strictEqual(hiParsed.question, 'can I get a free reading?');

const maya = 'Maya, Leo, will I find adventure this year?';
const mayaParsed = parseMessage(maya);
assert.strictEqual(mayaParsed.name, 'Maya');
assert.strictEqual(mayaParsed.sign, 'leo');
assert.notStrictEqual(mayaParsed.question, maya);
assert.strictEqual(mayaParsed.question, 'will I find adventure this year?');
assert.ok(!/\bMaya\b/.test(mayaParsed.question));
assert.ok(!/\bLeo\b/i.test(mayaParsed.question));

assert.strictEqual(parseMessage("I'm Maya").name, 'Maya');
assert.strictEqual(parseMessage('I am Maya').name, 'Maya');
assert.strictEqual(parseMessage('my name is maya').name, 'Maya');
assert.strictEqual(parseMessage('this is Sam').name, 'Sam');
assert.strictEqual(parseMessage('name: Jordan').name, 'Jordan');
assert.strictEqual(parseMessage("I'm Mary-Jane").name, 'Mary-Jane');
assert.strictEqual(parseMessage("I'm a Leo").name, null);
assert.strictEqual(parseMessage("I'm a Leo").sign, 'leo');
assert.strictEqual(parseMessage('I am a virgo').name, null);
assert.strictEqual(parseMessage('I am a virgo').sign, 'virgo');
assert.strictEqual(parseMessage('Hi, Maya, Leo, will I find adventure this year?').name, 'Maya');
assert.strictEqual(parseMessage('Hi, Maya, Leo, will I find adventure this year?').question, 'will I find adventure this year?');

const will = parseMessage("I'm Will, Aries, will I find peace?");
assert.strictEqual(will.name, 'Will');
assert.strictEqual(will.sign, 'aries');
assert.strictEqual(will.question, 'will I find peace?');

assert.strictEqual(parseMessage('Leo, will I find love?').name, null);
assert.strictEqual(parseMessage('Leo, will I find love?').sign, 'leo');
assert.strictEqual(parseMessage('Leo, will I find love?').question, 'will I find love?');

for (const sign of SIGNS) {
  const label = sign.charAt(0).toUpperCase() + sign.slice(1);
  const formatted = parseMessage(`Maya, ${label}, will I find peace?`);
  assert.strictEqual(formatted.name, 'Maya');
  assert.strictEqual(formatted.sign, sign);
  assert.strictEqual(formatted.question, 'will I find peace?');
  const article = parseMessage(`I am a ${sign}`);
  assert.strictEqual(article.name, null);
  assert.strictEqual(article.sign, sign);
  assert.strictEqual(article.question, null);
  assert.strictEqual(parseMessage(`my sign is ${sign.toUpperCase()}`).sign, sign);
}

for (const word of ['will', 'should', 'what', 'when', 'how', 'does', 'is', 'am', 'can']) {
  const parsed = parseMessage(`Maya, Virgo, ${word} this path open`);
  assert.strictEqual(parsed.question, `${word} this path open`);
}

assert.strictEqual(parseMessage('hello').name, null);
assert.strictEqual(parseMessage('hello').question, null);

const cycle = SYNODIC_DAYS * 24 * 60 * 60 * 1000;
assert.strictEqual(moonPhase(new Date(NEW_MOON_UTC)), 'New Moon');
for (let i = 0; i < 8; i++) {
  const mid = new Date(NEW_MOON_UTC + ((i + 0.5) / 8) * cycle);
  assert.strictEqual(moonPhase(mid), MOON_PHASES[i]);
}
assert.strictEqual(moonPhase(new Date(NEW_MOON_UTC - 1000)), 'Waning Crescent');

assert.deepStrictEqual(
  ((d) => ({ season: brisbaneContext(d).season, timeOfDay: brisbaneContext(d).timeOfDay, weekday: brisbaneContext(d).weekday }))(at(2026, 10, 16, 9)),
  { season: 'spring', timeOfDay: 'morning', weekday: 'Friday' },
);
assert.strictEqual(brisbaneContext(at(2026, 10, 16, 4)).timeOfDay, 'night');
assert.strictEqual(brisbaneContext(at(2026, 10, 16, 5)).timeOfDay, 'morning');
assert.strictEqual(brisbaneContext(at(2026, 10, 16, 11)).timeOfDay, 'morning');
assert.strictEqual(brisbaneContext(at(2026, 10, 16, 12)).timeOfDay, 'afternoon');
assert.strictEqual(brisbaneContext(at(2026, 10, 16, 16)).timeOfDay, 'afternoon');
assert.strictEqual(brisbaneContext(at(2026, 10, 16, 17)).timeOfDay, 'evening');
assert.strictEqual(brisbaneContext(at(2026, 10, 16, 20)).timeOfDay, 'evening');
assert.strictEqual(brisbaneContext(at(2026, 10, 16, 21)).timeOfDay, 'night');
assert.strictEqual(brisbaneContext(at(2026, 10, 16, 0)).timeOfDay, 'night');
assert.strictEqual(brisbaneContext(at(2026, 9, 1, 8)).season, 'spring');
assert.strictEqual(brisbaneContext(at(2026, 11, 30, 8)).season, 'spring');
assert.strictEqual(brisbaneContext(at(2026, 12, 1, 14)).season, 'summer');
assert.strictEqual(brisbaneContext(at(2026, 1, 15, 18)).season, 'summer');
assert.strictEqual(brisbaneContext(at(2026, 2, 28, 22)).season, 'summer');
assert.strictEqual(brisbaneContext(at(2026, 3, 1, 12)).season, 'autumn');
assert.strictEqual(brisbaneContext(at(2026, 5, 31, 9)).season, 'autumn');
assert.strictEqual(brisbaneContext(at(2026, 6, 1, 23)).season, 'winter');
assert.strictEqual(brisbaneContext(at(2026, 8, 31, 6)).season, 'winter');

const springMorning = at(2026, 10, 16, 9);
for (let i = 0; i < 20; i++) {
  const msg = buildWelcome({ name: 'Maya', sign: 'leo', question: null }, springMorning);
  assert.ok(msg.includes('Friday'), msg);
  assert.ok(/\bmorning\b/i.test(msg), msg);
  assert.ok(/\bspring\b/i.test(msg), msg);
  assert.ok(msg.includes(moonPhase(springMorning)), msg);
  assert.ok(msg.includes('Maya'), msg);
  assert.ok(msg.includes('Leo'), msg);
  assert.ok(/\bquestion\b/i.test(msg), msg);
  assert.ok(!/star sign/i.test(msg), msg);
  assert.ok(!/your name/i.test(msg), msg);
  assert.ok(msg.includes('inner light'), msg);
  assert.ok(msg.includes('universe'), msg);
  assert.ok(msg.includes('energy'), msg);
  assert.ok(msg.includes('cosmic guidance'), msg);
  assert.ok(msg.includes('This reading is free.'), msg);
  assert.ok(msg.endsWith('(For entertainment only.)'), msg);
}

const asked = replyFor({ name: null, sign: null, question: null }, hi, { date: springMorning });
assert.strictEqual(asked.kind, 'welcome');
assert.strictEqual(asked.state.name, null);
assert.strictEqual(asked.state.sign, null);
assert.strictEqual(asked.state.question, 'can I get a free reading?');
assert.ok(/\bname\b/i.test(textOf(asked.messages[0])));
assert.ok(/star sign/i.test(textOf(asked.messages[0])));
assert.ok(!/\bquestion\b/i.test(textOf(asked.messages[0])), textOf(asked.messages[0]));
assert.strictEqual(asked.messages[0].attachment.payload.template_type, 'button');
assert.strictEqual(asked.messages[0].attachment.payload.buttons[0].type, 'postback');
assert.strictEqual(asked.messages[0].attachment.payload.buttons[0].title, VIDEO_BUTTON_TITLE);
assert.strictEqual(asked.messages[0].attachment.payload.buttons[0].title, 'Start a video reading 🔮');
assert.strictEqual(asked.messages[0].attachment.payload.buttons[0].payload, VIDEO_PAYLOAD);

const reading = replyFor({ name: null, sign: null, question: null }, maya, { date: springMorning });
assert.strictEqual(reading.kind, 'fortune');
assert.strictEqual(reading.state.name, 'Maya');
assert.strictEqual(reading.state.sign, 'leo');
assert.strictEqual(reading.state.question, null);
const fortune = reading.messages[0];
assert.ok(fortune.includes('Maya'));
assert.ok(fortune.includes('Leo'));
assert.ok(fortune.includes('will I find adventure this year?'));
assert.ok(!fortune.includes(maya));
assert.ok(fortune.includes(moonPhase(springMorning)));
assert.ok(fortune.toLowerCase().includes('spring'));
assert.ok(fortune.includes('This reading is free.'));
assert.ok(fortune.endsWith('(For entertainment only.)'));

const again = replyFor(reading.state, 'should I cross the sea', { date: springMorning });
assert.strictEqual(again.kind, 'fortune');
assert.strictEqual(again.state.question, null);
assert.ok(again.messages[0].includes('should I cross the sea'));
assert.strictEqual(again.state.name, 'Maya');

const blank = replyFor({ name: null, sign: null, question: null }, 'hello', { date: springMorning });
assert.strictEqual(blank.kind, 'welcome');
assert.ok(/\bname\b/i.test(textOf(blank.messages[0])));
assert.ok(/star sign/i.test(textOf(blank.messages[0])));
assert.ok(/\bquestion\b/i.test(textOf(blank.messages[0])));
assert.strictEqual(blank.messages[0].attachment.payload.buttons[0].title, 'Start a video reading 🔮');

const direct = buildFortune(
  { name: 'Maya', sign: 'leo', question: 'will I find adventure this year?' },
  springMorning,
);
assert.ok(direct.includes('(For entertainment only.)'));

resetCalls();
const savedToken = process.env.VERIFY_TOKEN;
process.env.VERIFY_TOKEN = 'test-verify-token';

assert.strictEqual(replyFor({ name: null, sign: null, question: null }, hi, { date: springMorning }).kind, 'welcome');
const stillFortune = replyFor({ name: 'Maya', sign: 'leo', question: null }, 'will I find adventure this year?', { date: springMorning });
assert.strictEqual(stillFortune.kind, 'fortune');

for (const phrase of ['video', 'call', 'video call', 'VIDEO', 'Can we video call?', 'please call']) {
  const started = replyFor({ name: 'Maya', sign: 'leo', question: null }, phrase, { date: springMorning });
  assert.strictEqual(started.kind, 'video', phrase);
  const join = started.messages[0].attachment.payload.buttons[0];
  assert.strictEqual(join.type, 'web_url');
  assert.strictEqual(join.title, JOIN_BUTTON_TITLE);
  assert.strictEqual(join.title, 'Join the video reading');
  assert.match(join.url, /^https:\/\/meet\.jit\.si\/ForsakenFortune-[A-Za-z0-9]{10}$/);
  const spoken = textOf(started.messages[0]);
  assert.match(spoken, /fortune teller will join you there shortly/i);
  assert.match(spoken, /free/i);
  assert.ok(spoken.includes('(For entertainment only.)'));
  assert.ok(spoken.includes('Maya'));
  assert.strictEqual(started.call.name, 'Maya');
  assert.strictEqual(started.call.roomUrl, join.url);
  assert.deepStrictEqual(Object.keys(started.call).sort(), ['name', 'roomUrl', 'timestamp']);
  assert.ok(!JSON.stringify(started.call).includes('psid'));
}

const named = replyFor({ name: null, sign: null, question: null }, "I'm Maya, video", { date: springMorning });
assert.strictEqual(named.kind, 'video');
assert.strictEqual(named.call.name, 'Maya');

const fromButton = replyFor({ name: 'Sam', sign: null, question: null }, '', {
  postback: true, postbackPayload: 'VIDEO_READING', date: springMorning,
});
assert.strictEqual(fromButton.kind, 'video');
assert.strictEqual(fromButton.call.name, 'Sam');
assert.strictEqual(listCalls()[0].name, 'Sam');
assert.ok(!JSON.stringify(listCalls()).includes('PSID'));

const getStarted = replyFor({ name: null, sign: null, question: null }, '', {
  postback: true, postbackPayload: 'GET_STARTED', date: springMorning,
});
assert.strictEqual(getStarted.kind, 'welcome');
assert.strictEqual(getStarted.messages[0].attachment.payload.buttons[0].title, 'Start a video reading 🔮');

resetCalls();
const urls = [];
for (let i = 0; i < 55; i++) {
  const made = createVideoReading(i === 54 ? 'Newest' : (i === 10 ? '<script>' : null), new Date(Date.UTC(2026, 0, 1, 0, 0, i)));
  urls.push(made.entry.roomUrl);
}
const listed = listCalls();
assert.strictEqual(listed.length, 50);
assert.strictEqual(listed[0].roomUrl, urls[54]);
assert.strictEqual(listed[0].name, 'Newest');
assert.strictEqual(listed[49].roomUrl, urls[5]);
assert.ok(!listed.some((c) => c.roomUrl === urls[0]));
assert.ok(listed[0].timestamp > listed[1].timestamp);
assert.strictEqual(new Set(urls).size, 55);

const page = invoke('GET', '/calls?key=test-verify-token');
assert.strictEqual(page.status, 200);
assert.ok(page.body.includes('Newest'));
assert.ok(page.body.indexOf(urls[54]) < page.body.indexOf(urls[53]));
assert.ok(!page.body.includes(urls[0]));
assert.ok(page.body.includes('&lt;script&gt;'));
assert.ok(!page.body.includes('<script>'));
assert.ok(!page.body.includes('PSID123456SECRET'));
assert.strictEqual(invoke('GET', '/calls').status, 403);
assert.strictEqual(invoke('GET', '/calls?key=nope').status, 403);
assert.strictEqual(invoke('GET', '/calls?key=test-verify-toke').status, 403);
assert.strictEqual(invoke('GET', '/calls?key=').status, 403);
delete process.env.VERIFY_TOKEN;
assert.strictEqual(invoke('GET', '/calls?key=test-verify-token').status, 403);
process.env.VERIFY_TOKEN = 'test-verify-token';

const privacy = invoke('GET', '/privacy');
assert.strictEqual(privacy.status, 200);
assert.ok(privacy.body.includes('Jitsi Meet'));
assert.ok(/third-party free service/i.test(privacy.body));
assert.ok(privacy.body.includes('yghh54447@gmail.com'));

if (!process.env.PAGE_ACCESS_TOKEN) {
  resetCalls();
  handle({ sender: { id: 'PSID123456SECRET' }, message: { text: "I'm Maya, video call" } });
  const hidden = invoke('GET', '/calls?key=test-verify-token');
  assert.strictEqual(hidden.status, 200);
  assert.ok(hidden.body.includes('Maya'));
  assert.ok(!hidden.body.includes('PSID123456SECRET'));
  assert.ok(!JSON.stringify(listCalls()).includes('PSID123456SECRET'));
  assert.deepStrictEqual(Object.keys(listCalls()[0]).sort(), ['name', 'roomUrl', 'timestamp']);
}

if (savedToken == null) delete process.env.VERIFY_TOKEN;
else process.env.VERIFY_TOKEN = savedToken;
resetCalls();

const samples = [
  { state: { name: 'Maya', sign: 'leo', question: null }, date: at(2026, 10, 16, 9) },
  { state: { name: 'Sam', sign: null, question: null }, date: at(2026, 1, 15, 18) },
  { state: { name: null, sign: null, question: null }, date: at(2026, 7, 20, 22) },
];
console.log('ok');
for (const sample of samples) {
  const ctx = brisbaneContext(sample.date);
  console.log(`SAMPLE ${ctx.weekday} ${ctx.timeOfDay} ${ctx.season} ${moonPhase(sample.date)}`);
  console.log(buildWelcome(sample.state, sample.date));
}
