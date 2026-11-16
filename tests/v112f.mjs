// v1.12 festive touches: event banner (dismissible), header decoration, Pomeo's costume greeting, event loading quotes, setting.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
async function guest(time, extra = {}) {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 860 }, timezoneId: 'Asia/Kolkata' });
  await ctx.clock.setFixedTime(new Date(time));
  await ctx.addInitScript(extra => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-guest', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '1.12'); localStorage.setItem('pomodorolist-login-later', 'x'); for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v); }, extra);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 160)); });
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
// 1. during Halloween: decoration, banner, costume greeting
const G = await guest('2026-10-22T10:00:00+05:30');
await G.p.goto('http://localhost:8000/index.html?emulator=1'); await G.p.waitForSelector('#appView:not(.hidden)');
let costume = null;
for (let i = 0; i < 40 && !costume; i++) { await wait(150); costume = await G.ev(() => { const m = $('#mascot'); return m && m.dataset.skin === 'pumpkin' && $('#pomeoBubble').textContent.includes('Halloween') ? { skin: m.dataset.skin, witch: m.innerHTML.includes('#3b2f55'), bubble: $('#pomeoBubble').textContent } : null; }); }
check('Pomeo greets you once a day in his Halloween costume (pumpkin + witch hat)', !!costume && costume.witch, JSON.stringify(costume));
await wait(9500);
check('… and changes back to his own outfit afterwards', await G.ev(() => !$('#mascot').dataset.skin));
const deco = await G.ev(() => ({ deco: ($('#brandDeco') || {}).textContent, banner: ($('#eventSlot .ev-banner') || {}).textContent }));
check('Header decoration 🎃 and a Timer banner with days left and quest progress', deco.deco === '🎃' && /Pomeo’s Halloween/.test(deco.banner) && /17 days left/.test(deco.banner) && /\/ 8 quests/.test(deco.banner), JSON.stringify(deco));
await G.ev(() => $('#eventSlot [data-evopen]').click()); await wait(500);
check('“Open” goes to the questline', await G.ev(() => S.ui.tab === 'quests' && S.ui.questView === 'quest' && !!$('.ql-hero')));
await G.ev(() => { showTab('timer'); $('#eventSlot [data-evx]').click(); });
await G.p.reload(); await G.p.waitForSelector('#appView:not(.hidden)'); await wait(3500);
const after = await G.ev(() => ({ banner: !!$('#eventSlot .ev-banner'), deco: !!$('#brandDeco'), greet: $('#mascot').dataset.skin === 'pumpkin' }));
check('Dismissed banner stays dismissed; the decoration stays; no second costume greeting the same day', !after.banner && after.deco && !after.greet, JSON.stringify(after));
await G.ev(() => { showTab('settings'); $('#setFestive').click(); }); await wait(300);
check('Settings → Festive decorations off: decoration removed', await G.ev(() => !$('#brandDeco') && S.settings.festive === false && localStorage.getItem('pomodorolist-festive') === '0'));
await G.ctx.close();
// 2. the loading screen picks event quotes during an event (sampled over many loads), and none when festive is off
async function quotes(time, extra, n) {
  const Q = await guest(time, extra), out = [];
  for (let i = 0; i < n; i++) { await Q.p.goto('http://localhost:8000/index.html?emulator=1'); out.push(await Q.ev(() => document.getElementById('spQuote') ? document.getElementById('spQuote').textContent : '')); }
  await Q.ctx.close();
  return out;
}
const EVQ = /ghosts|Carve out|potion/;
const on = await quotes('2026-10-22T10:00:00+05:30', {}, 30), off = await quotes('2026-10-22T10:00:00+05:30', { 'pomodorolist-festive': '0', 'focus-app-v1': JSON.stringify({ settings: { festive: false } }) }, 30), outside = await quotes('2026-09-20T10:00:00+05:30', {}, 30);
check('Loading screen: Halloween quotes show up during the event', on.some(q => EVQ.test(q)), `${on.filter(q => EVQ.test(q)).length}/30`);
check('… never when festive decorations are off, nor outside the event', !off.some(q => EVQ.test(q)) && !outside.some(q => EVQ.test(q)), JSON.stringify({ off: off.filter(q => EVQ.test(q)).length, outside: outside.filter(q => EVQ.test(q)).length }));
// 3. no event: nothing festive
const N = await guest('2027-10-05T10:00:00+05:30');
await N.p.goto('http://localhost:8000/index.html?emulator=1'); await N.p.waitForSelector('#appView:not(.hidden)'); await wait(3500);
check('Outside any event: no banner, no decoration, no costume', await N.ev(() => !$('#eventSlot .ev-banner') && !$('#brandDeco') && !$('#mascot').dataset.skin));
await N.ctx.close();
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
process.exit(fails ? 1 : 0);   // v2.0: a failing check fails the suite (it used to exit 0)
