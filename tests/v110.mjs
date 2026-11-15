// v1.10: loading screen, focus atmosphere, ripening ring, Pomeo empty states.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
const SHOTS = process.argv.includes('shots');
async function device(name, { w = 1280, h = 860, scheme = 'light', ls = {}, touch = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: touch, isMobile: touch && w < 700 });
  await ctx.addInitScript(ls => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); const d = new Date(), p = n => String(n).padStart(2, '0');
    localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); localStorage.setItem('pomodorolist-seen-version', '1.11');
    for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); }, ls);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  return { ctx, p };
}
const ev = (d, f, a) => d.p.evaluate(f, a);
const guestData = n => JSON.stringify({ sessions: Array.from({ length: n }, (_, i) => { const st = Date.now() - (i + 1) * 864e5; return { id: 's' + i, name: 'Physics', start: st, end: st + 25 * 6e4, duration: 25 * 6e4, planned: 25 * 6e4, preset: 'Classic 25/5' }; }) });
const OLD = { 'pomodorolist-guest': '1', 'pomodorolist-tour-done': '1', 'pomodorolist-onboarded:guest': '1' };

// ---------- 1. loading screen, Animations: Full ----------
let D = await device('splash', { ls: { ...OLD, 'focus-app-v1': guestData(12) } });
await D.p.addInitScript(() => {
  window.__trace = [];
  const t0 = performance.now();
  const iv = setInterval(() => {
    const sp = document.getElementById('splash'), app = document.getElementById('appView');
    window.__trace.push({ t: Math.round(performance.now() - t0), sp: !!sp, cls: sp ? sp.className : '', p: sp ? sp.style.getPropertyValue('--sp') : '', app: app ? !app.classList.contains('hidden') : false,
      pom: sp && document.getElementById('spPomeo') ? document.getElementById('spPomeo').style.transform : '', hand: document.body && document.body.classList.contains('sp-handoff') });
    if (!sp && window.__trace.length > 5) clearInterval(iv);
  }, 50);
});
await D.p.goto(U);
await D.p.waitForSelector('#splash.out', { timeout: 8000 }).catch(() => {});
log('splash text:', await ev(D, () => $('#splash') ? `${$('#spGreet').textContent} | “${$('#spQuote').textContent}”` : 'gone'));
if (SHOTS) await D.p.screenshot({ path: 'v110-splash-leaving.png' });
await D.p.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 8000 });
const tr = await ev(D, () => window.__trace);
const appAt = (tr.find(x => x.app) || {}).t, outAt = (tr.find(x => /out/.test(x.cls)) || {}).t, goneAt = (tr.find(x => !x.sp) || {}).t;
const flyAt = (tr.find(x => /translate/.test(x.pom)) || {});
log(`timing: app ready ${appAt}ms → splash starts leaving ${outAt}ms → gone ${goneAt}ms | progress values ${[...new Set(tr.map(x => x.p).filter(Boolean))].slice(0, 6).join(' → ')} … 1`);
log('hand-off: flew to', flyAt.pom || 'NO FLIGHT', '| real Pomeo hidden while flying:', tr.some(x => x.hand), '| real Pomeo visible after:', await ev(D, () => getComputedStyle($('#mascot')).opacity), '| hop:', tr.some(x => /hop/.test(x.cls)));
const target = await ev(D, () => { const r = $('#mascot').getBoundingClientRect(); return `${Math.round(r.left + r.width / 2)},${Math.round(r.top + r.height / 2)}`; });
log('Pomeo in the timer card is at', target);
// taps go through while it leaves
await D.ctx.close();
D = await device('tapthrough', { ls: { ...OLD, 'focus-app-v1': guestData(3) } });
await D.p.goto(U); await D.p.waitForSelector('#splash.out', { timeout: 8000 });
await D.p.click('#mainBtn', { timeout: 2000 }).then(() => {}, e => errs.push('click blocked by splash: ' + e.message.split('\n')[0]));
log('Start tapped while the splash leaves → timer', await ev(D, () => S.timer.status));
await D.ctx.close();

// ---------- 2. calm (True Minimalist), Reduced, Off ----------
for (const [name, ls] of [['calm', { 'pomodorolist-calm': '1' }], ['reduced', { 'pomodorolist-motion': 'reduced' }], ['off', { 'pomodorolist-motion': 'off' }]]) {
  D = await device(name, { ls: { ...OLD, 'focus-app-v1': guestData(3), ...ls } });
  await D.p.goto(U);
  const st = await ev(D, () => { const sp = $('#splash'); if (!sp) return 'already gone'; return `calm=${sp.classList.contains('calm')} pomeo shown=${!!$('#spPomeo').getClientRects().length} vine shown=${!!$('.sp-vine').getClientRects().length} quote="${$('#spQuote').textContent.slice(0, 40)}" body anim=${getComputedStyle($('.sp-body')).animationName}`; });
  const t0 = Date.now(); await D.p.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 8000 });
  log(`${name}: ${st} | gone after ~${Date.now() - t0}ms more`);
  if (SHOTS && name === 'calm') { await D.ctx.close(); D = await device(name, { ls: { ...OLD, ...ls } }); await D.p.route('**/index.html', async r => { const res = await r.fetch(); const body = (await res.text()).replace('if (window.__spSet) window.__spSet(.4);', 'throw 0;'); r.fulfill({ response: res, body }); }); await D.p.goto(U).catch(() => {}); await wait(900); await D.p.screenshot({ path: 'v110-splash-calm.png' }); }
  await D.ctx.close();
}
// a held splash (app script blocked) to see the full wake-up animation
if (SHOTS) for (const [w, h, scheme] of [[390, 844, 'light'], [1280, 860, 'dark']]) {
  D = await device('held', { w, h, scheme, touch: w < 700 });
  await D.p.route('**/index.html', async r => { const res = await r.fetch(); const body = (await res.text()).replace('if (window.__spSet) window.__spSet(.4);', 'throw 0;'); r.fulfill({ response: res, body }); });
  await D.p.goto(U).catch(() => {}); await wait(450); await D.p.screenshot({ path: `v110-splash-yawn-${w}.png` }); await wait(1800); await D.p.screenshot({ path: `v110-splash-${w}.png` });
  await D.ctx.close();
}

// ---------- 3. atmosphere + ripening ring ----------
D = await device('atmo', { ls: { ...OLD, 'focus-app-v1': guestData(5) } });
await D.p.goto(U); await D.p.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 8000 });
const atmo = () => ev(D, () => $$('#atmo i').map(i => i.style.opacity || '0').join('/') + ` ring=${$('#ring').classList.contains('ripen') ? getComputedStyle($('#ringProg')).stroke : 'accent ' + getComputedStyle($('#ringProg')).stroke}`);
log('idle:', await atmo());
await ev(D, () => { S.timer.phase = 'focus'; startTimer(); }); await wait(400); log('focus start:', await atmo());
await ev(D, () => { S.timer.endAt = Date.now() + S.timer.planned * .5; }); await wait(400); log('focus half-way:', await atmo());
await ev(D, () => { S.timer.endAt = Date.now() + S.timer.planned * .05; }); await wait(400); log('focus nearly done:', await atmo());
if (SHOTS) { await wait(3600); await D.p.screenshot({ path: 'v110-atmo-focus.png' }); }
await ev(D, () => pauseTimer()); await wait(400); log('paused:', await atmo());
await ev(D, () => { finishPhase('skip'); startTimer(); }); await wait(400); log('break:', await atmo());
if (SHOTS) { await wait(3600); await D.p.screenshot({ path: 'v110-atmo-break.png' }); }
await ev(D, () => showTab('stats')); await wait(300); log('break, on Stats tab:', await atmo());
await ev(D, () => { showTab('timer'); finishPhase('skip'); S.timer.phase = 'focus'; startTimer(); S.timer.endAt = Date.now() + S.timer.planned * .3; }); await wait(400);
await ev(D, () => { $('#setAtmo').click(); $('#setRipen').click(); }); await wait(400); log('both settings off:', await atmo(), '| saved:', await ev(D, () => `${S.settings.atmosphere} ${S.settings.ripen}`));
await ev(D, () => { $('#setAtmo').click(); $('#setRipen').click(); setMinimal(true); }); await wait(400); log('True Minimalist:', await atmo());
await D.ctx.close();

// readability: focus at its deepest and break, Glossed Lite, several themes
const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const ratio = (a, b2) => { const x = lum(a), y = lum(b2); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const worst = [];
for (const scheme of ['light', 'dark']) {
  D = await device('ct-' + scheme, { scheme, ls: { ...OLD, 'focus-app-v1': guestData(5) } });
  await D.p.goto(U); await D.p.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 8000 });
  for (const th of ['th_default', 'th_ocean', 'th_sunset', 'th_sakura', 'th_nord', 'th_midnight']) for (const phase of ['focus', 'break']) {
    await ev(D, ([th, phase]) => { S.game.purchases['t_' + th] = { item: th, price: 0, at: 1 }; G = null; S.game.equipped.theme = th; applyCosmetics(); document.querySelectorAll('dialog[open]').forEach(x => x.close());
      S.timer.status = 'idle'; S.timer.phase = phase === 'focus' ? 'focus' : 'short'; startTimer(); S.timer.endAt = Date.now() + 2000; $$('#atmo i').forEach(i => { i.style.transition = 'none'; }); atmoKey = ''; renderAtmo(); }, [th, phase]);
    await wait(500);
    await ev(D, () => { $$('.toast-item, .pomeo-bubble').forEach(x => x.style.visibility = 'hidden'); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
    const box = await ev(D, () => { const r = $('.timer-card').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: Math.min(r.height, 140) }; });   // the timer card (other cards are dimmed on purpose during focus)
    const shot = (await D.p.screenshot()).toString('base64');
    const px = await ev(D, async ([png, box]) => { const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      return [[box.x + box.w - 14, box.y + 12], [box.x + 14, box.y + box.h - 12], [box.x + box.w - 14, box.y + box.h / 2]].map(([a, b2]) => [...x.getImageData(Math.round(a), Math.round(b2), 1, 1).data].slice(0, 3)); }, [shot, box]);
    const muted = await ev(D, () => { const el = document.createElement('span'); document.body.appendChild(el); el.style.color = 'var(--muted)'; const c = getComputedStyle(el).color; el.remove(); return c.match(/[\d.]+/g).slice(0, 3).map(Number); });
    const r = px.map(p => ratio(muted, p)).sort((a, b2) => a - b2)[1];
    if (th === 'th_sunset' && phase === 'focus' && scheme === 'light') { console.log('DBG px', JSON.stringify(px), 'muted', muted, 'box', JSON.stringify(box)); await D.p.screenshot({ path: 'v110-dbg-contrast.png' }); }
    worst.push(`${scheme}/${th}/${phase} ${r.toFixed(2)}`);
  }
  await D.ctx.close();
}
worst.sort((a, b2) => parseFloat(a.split(' ')[1]) - parseFloat(b2.split(' ')[1]));
log('muted-text contrast with the atmosphere at its strongest (lowest 4):', worst.slice(0, 4).join(', '), '| all ≥ 4.5:', worst.every(x => parseFloat(x.split(' ')[1]) >= 4.5));

// ---------- 4. Pomeo empty states ----------
D = await device('empty', { w: 390, h: 844, touch: true, ls: { 'pomodorolist-guest': '1', 'pomodorolist-tour-done': '1', 'pomodorolist-onboarded:guest': '1' } });
await D.p.goto(U); await D.p.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 8000 });
await ev(D, () => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
const scenes = () => ev(D, () => $$('.tab.active .pscene, #recentCard .pscene, .tab.active .empty-card .pscene').map(p => (p.closest('.empty, .empty-card') || p).textContent.trim().slice(0, 45) + ' [' + (p.querySelector('.ps-drop') ? 'watering can' : p.querySelector('.ps-page') ? 'book' : p.querySelector('.ps-wave') ? 'waving' : '?') + ']'));
log('timer:', await scenes());
if (SHOTS) { await ev(D, () => $('.pscene').scrollIntoView({ block: 'center' })); await wait(300); await D.p.screenshot({ path: 'v110-empty-recent.png' }); }
await ev(D, () => showTab('stats')); await wait(600); log('stats:', await scenes());
if (SHOTS) { await ev(D, () => $('#gardenSlot').scrollIntoView({ block: 'center' })); await wait(300); await D.p.screenshot({ path: 'v110-empty-garden.png' }); }
await ev(D, () => showTab('friends')); await wait(400); log('friends (guest):', await scenes());
if (SHOTS) await D.p.screenshot({ path: 'v110-empty-friends.png' });
await ev(D, () => { S.settings.pomeo = false; showTab('stats'); }); await wait(400);
log('Pomeo hidden → plain icons:', await ev(D, () => `${$$('.tab.active .pscene').length} scenes, ${$$('.empty.e-list').length} icon empty states`));
await D.ctx.close();
log('errors', errs);
await b.close();
