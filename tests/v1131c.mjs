// v1.13.1 intro: first visit only, typed lines + Pomeo, glides into the welcome page, skip (tap/key/link), reduced motion, never again.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
async function fresh(name, { w = 1280, reduced = false, init = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: w < 500, isMobile: w < 500 });
  if (init) await ctx.addInitScript(init);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(name + ' ' + m.type() + ': ' + m.text().slice(0, 160)); });
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const introOn = d => d.ev(() => !$('#intro').classList.contains('hidden'));
// 1. first visit: the whole sequence, sampled every 100 ms
let A = await fresh('first');
await A.p.goto('http://localhost:8000/index.html?emulator=1');
await A.p.waitForFunction(() => document.getElementById('intro') && !document.getElementById('intro').classList.contains('hidden'), null, { timeout: 15000 });
const tStart = Date.now();
const under = await A.ev(() => ({ auth: !$('#authView').classList.contains('hidden'), form: !!$('#authUser'), seen: localStorage.getItem('pomodorolist-intro-seen'), brandHidden: getComputedStyle($('#authView .auth-brand')).visibility }));
check('First visit: the intro plays over the welcome page, which is already loaded underneath', under.auth && under.form && under.brandHidden === 'hidden', JSON.stringify(under));
const samples = [];
while (Date.now() - tStart < 7000) { samples.push(await A.ev(() => ({ t: performance.now(), line: $('#inLine').textContent, cls: $('#intro').className, cur: getComputedStyle($('.in-cur')).display }))); if (samples.at(-1).cls.includes('hidden')) break; await wait(90); }
const texts = [...new Set(samples.map(s => s.line).filter(Boolean))];
const words = texts.filter(t => /^Grow your|^Grow$|^Beat|^Beat the$/.test(t));
const dur = Date.now() - tStart;
check('Lines type in word by word: Focus. → Grow your garden. → Beat the boss. → Pomodorolist.', ['Focus.', 'Grow your garden.', 'Beat the boss.', 'Pomodorolist.'].every(l => texts.includes(l)) && words.length >= 2 && texts.indexOf('Focus.') < texts.indexOf('Pomodorolist.'), JSON.stringify(texts));
check('A soft blinking cursor while typing; Pomeo pops in at the end', samples.some(s => s.cur !== 'none' && !s.cls.includes('pomeo-in')) && samples.some(s => s.cls.includes('pomeo-in')) && (await A.ev(() => !!$('#inPomeo .mascot'))));
check('Glides into the page (the title moves onto the header, Pomeo to his spot) instead of a hard cut', samples.some(s => s.cls.includes('leaving')));
check('About 3–5 seconds in all', dur >= 3000 && dur <= 6000, dur + ' ms');
await wait(300);
const after = await A.ev(() => ({ hidden: $('#intro').classList.contains('hidden'), brand: getComputedStyle($('#authView .auth-brand')).visibility, pomeo: getComputedStyle($('#lpPomeo')).visibility, w: document.documentElement.scrollWidth <= innerWidth }));
check('Afterwards the welcome page is fully there (header + Pomeo visible), no sideways scroll', after.hidden && after.brand === 'visible' && after.pomeo === 'visible' && after.w, JSON.stringify(after));
await A.p.reload(); await A.p.waitForSelector('#authView:not(.hidden)'); await wait(800);
check('Shown once per device: a reload goes straight to the welcome page', !(await introOn(A)));
await A.ctx.close();
// 2. skipping: tap, key, the Skip link
for (const [how, act] of [['a tap', d => d.p.mouse.click(400, 400)], ['any key', d => d.p.keyboard.press('a')], ['the Skip link', d => d.p.click('#inSkip')]]) {
  const S = await fresh('skip');
  await S.p.goto('http://localhost:8000/index.html?emulator=1');
  await S.p.waitForFunction(() => !document.getElementById('intro').classList.contains('hidden'), null, { timeout: 15000 });
  await wait(900);
  const t = Date.now(); await act(S);
  await S.p.waitForFunction(() => document.getElementById('intro').classList.contains('hidden'), null, { timeout: 3000 });
  const ms = Date.now() - t;
  const typed = await S.ev(() => document.activeElement && document.activeElement.value || '');
  check(`Skippable with ${how} (gone in ${ms} ms; the key/tap doesn’t leak into the page)`, ms < 700 && !typed, `${ms} ms`);
  await S.ctx.close();
}
// 3. reduced motion: a simple quick fade
for (const [name, opt] of [['system reduced motion', { reduced: true }], ['Animations: Reduced', { init: () => localStorage.setItem('pomodorolist-motion', 'reduced') }], ['Animations: Off', { init: () => localStorage.setItem('pomodorolist-motion', 'off') }]]) {
  const R = await fresh(name, opt);
  await R.p.goto('http://localhost:8000/index.html?emulator=1');
  await R.p.waitForFunction(() => !document.getElementById('intro').classList.contains('hidden'), null, { timeout: 15000 });
  const t = Date.now(), first = await R.ev(() => ({ calm: $('#intro').classList.contains('calm'), line: $('#inLine').textContent }));
  await R.p.waitForFunction(() => document.getElementById('intro').classList.contains('hidden'), null, { timeout: 4000 });
  check(`${name}: no typing sequence, just a quick fade`, first.calm && first.line === 'Pomodorolist.' && Date.now() - t < 1500, `${Date.now() - t} ms`);
  await R.ctx.close();
}
// 4. returning, guest and signed-in users go straight in
for (const [name, init] of [['returning (last account on this device)', () => localStorage.setItem('pomodorolist-last-user', JSON.stringify({ uid: 'x', username: 'old' }))],
  ['used before (tutorial done)', () => localStorage.setItem('pomodorolist-tour-done', '1')],
  ['device-only guest', () => { localStorage.setItem('pomodorolist-guest', '1'); localStorage.setItem('pomodorolist-tour-done', '1'); }]]) {
  const R = await fresh(name, { init });
  await R.p.goto('http://localhost:8000/index.html?emulator=1');
  await wait(2500);
  check(`No intro for ${name}`, !(await introOn(R)));
  await R.ctx.close();
}
// 5. phones: fits at 360 px, the glide lands on the header
const P = await fresh('phone', { w: 360 });
await P.p.goto('http://localhost:8000/index.html?emulator=1');
await P.p.waitForFunction(() => !document.getElementById('intro').classList.contains('hidden'), null, { timeout: 15000 });
let widest = 0;
for (let i = 0; i < 40; i++) { const r = await P.ev(() => { const s = $('.in-stage').getBoundingClientRect(); return { r: s.right, l: s.left, sw: document.documentElement.scrollWidth, hid: $('#intro').classList.contains('hidden') }; }); if (r.hid) break; widest = Math.max(widest, r.r, r.sw); await wait(120); }
check('360 px phone: the intro fits on screen', widest <= 361, `${widest}px`);
await P.ctx.close();
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
