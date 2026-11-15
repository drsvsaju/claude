import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1');
  const now = Date.now(), sessions = []; for (let d = 1; d <= 30; d++) for (let k = 0; k < 2; k++) { const st = now - d * 864e5 + (9 + k * 3) * 3600e3, mins = [25, 50, 95][(d + k) % 3]; sessions.push({ id: 's' + d + '_' + k, name: ['Physics', 'Maths'][k], start: st, end: st + mins * 60000, duration: mins * 60000, planned: mins * 60000, preset: 'Classic 25/5' }); }
  localStorage.setItem('focus-app-v1', JSON.stringify({ sessions })); });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)'); await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)');
await p.waitForTimeout(1500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
const mig = await p.evaluate(() => ({ mig: gardenMig(), g: { level: garden().level, produce: garden().produce, plots: garden().plots, seeds: Object.keys(garden().seeds), xp: garden().xp } }));
console.log('migration', JSON.stringify(mig));
await p.evaluate(() => showTab('garden')); await p.waitForTimeout(600);
await p.screenshot({ path: 'shot-garden-1.png' });
console.log('tab shown', await p.evaluate(() => S.ui.tab + ' ' + !!$('#gdScene') + ' plots=' + document.querySelectorAll('.gd-plot').length + ' locked=' + document.querySelectorAll('.gd-plot.locked').length));
// plant two seeds via the API
console.log('plant', await p.evaluate(() => [gardenPlant(0, 'tomato'), gardenPlant(1, 'sunflower'), gardenPlant(2, 'tomato')]));
await p.evaluate(() => renderGarden()); await p.waitForTimeout(300);
// water with a 50 min focus block
await p.evaluate(() => { const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 50 * 60000; t.focusStartedAt = Date.now() - 50 * 60000; t.endAt = Date.now() - 1; tick(); });
await p.waitForTimeout(800);
console.log('after 50 min', await p.evaluate(() => garden().growing.map(p => [p.sp, waterOf(p), plantStage(p), !!p.fc])));
await p.evaluate(() => { gardenFocus(garden().growing[0].id); });
await p.evaluate(() => { const t = S.timer; document.querySelectorAll('dialog[open]').forEach(d => d.close()); t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 120 * 60000; t.focusStartedAt = Date.now() - 120 * 60000; t.endAt = Date.now() - 1; tick(); });
await p.waitForTimeout(800);
console.log('after focused 60 min', await p.evaluate(() => garden().growing.map(p => [p.sp, waterOf(p), plantStage(p), !!p.fc, plantReady(p), p.m])));
await p.evaluate(() => { showTab('garden'); }); await p.waitForTimeout(500);
await p.screenshot({ path: 'shot-garden-2.png' });
const ready = await p.evaluate(() => garden().ready.map(p => p.id));
console.log('ready', ready);
await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await p.waitForTimeout(400);
if (ready.length) { await p.click(`.gd-plot[data-pid="${ready[0]}"]`); await p.waitForTimeout(1000); }
console.log('after harvest', await p.evaluate(() => ({ produce: garden().produce, harvested: garden().harvested.map(p => [p.sp, p.y, p.m, p.wt]), xp: garden().xp, level: garden().level })));
await p.screenshot({ path: 'shot-garden-3.png' });
for (const v of ['seeds', 'decor', 'almanac']) { await p.evaluate(v => { S.ui.gardenView = v; renderGarden(); }, v); await p.waitForTimeout(300); await p.screenshot({ path: `shot-garden-${v}.png` }); }
console.log('buy decor', await p.evaluate(() => [gardenBuy('dc_lantern'), gardenBuy('dc_fence_wood'), gardenBuy('seed_basil')]));
console.log('place', await p.evaluate(() => { const g = garden(); return [gardenPlace(g.decor[0].buy.id, 's1'), gardenPlace(g.decor[1].buy.id, 'border'), garden().placed]; }));
await p.evaluate(() => { S.ui.gardenView = 'garden'; renderGarden(); }); await p.waitForTimeout(400);
await p.screenshot({ path: 'shot-garden-4.png' });
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400); await p.screenshot({ path: 'shot-garden-phone.png', fullPage: true });
console.log('hscroll', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));
console.log('errors', JSON.stringify(errs));
await b.close();
