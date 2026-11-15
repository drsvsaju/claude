import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
const combos = [
  { n: 'phone-dark-glass', w: 390, h: 844, scheme: 'dark', glass: 'full', theme: 'th_default' },
  { n: 'desk-light-paper', w: 1180, h: 860, scheme: 'light', glass: 'off', theme: 'th_paper' },
  { n: 'phone-light-sakura-glass', w: 390, h: 844, scheme: 'light', glass: 'lite', theme: 'th_sakura' },
  { n: 'desk-dark-midnight', w: 1180, h: 860, scheme: 'dark', glass: 'off', theme: 'th_midnight' },
];
for (const c of combos) {
  const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, colorScheme: c.scheme });
  await ctx.addInitScript(g => { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-glass', g); } const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); }, c.glass);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(c.n + ': ' + e.message));
  await p.goto(U);
  await p.evaluate(theme => { const ss = [], en = {}; for (let i = 1; i <= 30; i++) { const st = new Date(); st.setDate(st.getDate() - i); st.setHours(8 + (i % 12), 0, 0, 0); const len = i % 3 ? 25 : 70; ss.push({ id: 'c' + i, name: ['Maths', 'Physics', 'Chemistry'][i % 3], start: +st, end: +st + len * 6e4, duration: len * 6e4, planned: len * 6e4, preset: 'Classic 25/5' }); en['c' + i] = 1 + (i * 7) % 4; } localStorage.setItem('focus-app-v1', JSON.stringify({ sessions: ss.sort((a, b) => a.start - b.start), energy: en, settings: { theme: 'auto' } })); localStorage.setItem('pomodorolist-guest', '1'); }, c.theme);
  await p.goto(U); await p.waitForSelector('#appView:not(.hidden)');
  await wait(1500); await p.evaluate(th => { S.game.purchases['t_' + th] = { item: th, price: 0, at: 1 }; G = null; S.game.equipped.theme = th; applyCosmetics(); save(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); startTutorial(); }, c.theme);
  await wait(700);
  await p.screenshot({ path: `v12c-${c.n}-tut.png` });
  await p.evaluate(() => { TUT.i = 4; renderTut(); }); await wait(200);
  await p.screenshot({ path: `v12c-${c.n}-tut5.png` });
  await p.click('#tutSkip'); await wait(400);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
  await p.evaluate(() => { S.timer.phase = 'focus'; S.timer.oneOff = 60000; startTimer(); S.timer.endAt = Date.now() - 5; }); await wait(2600);
  await p.evaluate(() => { document.querySelector('#noteRow').scrollIntoView({ block: 'center' }); }); await wait(300);
  await p.screenshot({ path: `v12c-${c.n}-summary.png` });
  await p.evaluate(() => { localStorage.removeItem('pomodorolist-tips-seen'); hideNote(); setMinimal(true); showTab('stats'); }); await wait(1200);
  await p.screenshot({ path: `v12c-${c.n}-min-stats-tip.png` });
  await p.evaluate(() => { hideTip(); document.querySelector('#energySlot').scrollIntoView({ block: 'center' }); }); await wait(500);
  await p.screenshot({ path: `v12c-${c.n}-insights.png` });
  const contrast = await p.evaluate(() => { const cs = getComputedStyle(document.documentElement); return cs.getPropertyValue('--muted') + ' on ' + cs.getPropertyValue('--surface'); });
  console.log(c.n, 'theme', await p.evaluate(() => document.documentElement.dataset.theme + '/' + equippedId('theme')), '| overflow', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), '|', contrast);
  await ctx.close();
}
console.log('errors', errs);
await b.close();
