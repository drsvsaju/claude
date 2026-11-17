// Phase 6 pictures: node p6shots.mjs <page> <outDir> [--new] [--only name,name]
//   <page> is a build in the test site: the phase's "before" build (p5done.html) or the current one. Both are shot
//   minutes apart so the demo's clock-driven data is the same. --new adds the screens that did not exist before
//   (streak care, break ideas). Pairs are then made with tools/pair.py, sheets with tools/sheet.py.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const [page, out] = process.argv.slice(2), isNew = process.argv.includes('--new'), only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const CALM = `.toasts, #toast, #pomeoBubble, .pv-banner, #tipPop, .ach-toast, #cursorGlow, #pomeoPop { display: none !important; } html { scroll-behavior: auto !important; } body.previewing { --pv-h: 0px !important; } * { content-visibility: visible !important; }`;
async function open(w, h, scheme) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: scheme, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('http://localhost:8000/' + page); await p.waitForSelector('#authView:not(.hidden)');
  await p.evaluate(() => startPreview()); await p.waitForSelector('#appView:not(.hidden)'); await wait(3000);
  await p.addStyleTag({ content: CALM });
  await p.evaluate(s => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); applyTheme(s); }, scheme);
  await wait(400);
  return p;
}
const shot = async (p, name, code, sel = null, ms = 700) => {
  if (only && !only.includes(name)) return;
  await p.evaluate(async c => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); await new Promise(r => setTimeout(r, 350)); await (0, eval)(`(async () => { ${c} })()`); }, code);
  await wait(ms);
  const path = `${out}/${name}.jpg`;
  if (sel) await p.locator(sel).first().screenshot({ path, type: 'jpeg', quality: 88 });
  else await p.screenshot({ path, type: 'jpeg', quality: 86 });
  console.log(name);
};
// states (the same code runs on the "before" build, where the new functions do not exist yet)
const IDLE = "const t = S.timer; t.phase = 'focus'; t.status = 'idle'; renderTimer();";
const TIMER = IDLE + " showTab('timer'); scrollTo(0, 0);";
const BREAK = "const t = S.timer; t.phase = 'short'; t.status = 'idle'; renderTimer(); showTab('timer'); scrollTo(0, 0);";
const SESSION = TIMER + " const c = document.querySelector('#nameInput').closest('.card'); c.setAttribute('data-shot', 'session'); if (typeof renderIntent === 'function') { S.timer.intent = 'Finish HC Verma Q1–15 and check the answers'; intOpen = true; renderIntent(); } c.scrollIntoView({ block: 'center' }); document.activeElement && document.activeElement.blur();";
const AFTER = TIMER + " const s = S.sessions[S.sessions.length - 1]; if (S.debrief) delete S.debrief[s.id]; offerNote(s.id); await new Promise(r => setTimeout(r, 300)); document.querySelector('#noteRow').scrollIntoView({ block: 'center' });";
const STATS = IDLE + " showTab('stats'); await new Promise(r => setTimeout(r, 1800)); renderEnergyCard(); const c = document.querySelector('#energySlot .card'); c.setAttribute('data-shot', 'ins'); c.scrollIntoView({ block: 'center' });";
const ROW = k => TIMER + ` const g = S.game, day = n => dayKey(addDays(startOfDay(new Date()), n)); g.pauses = {}; g.pauseEnds = {}; g.repairs = {}; g.rest = {}; delete g.claims.milestones[100];
  if ('${k}' === 'rest-set') g.rest[day(-30)] = (new Date().getDay() + 6) % 7;
  if ('${k}' === 'paused') g.pauses[day(0)] = 3;
  if ('${k}' === 'rest') { g.rest[day(-30)] = new Date().getDay(); }
  if ('${k}' === 'mend') { S.sessions = S.sessions.filter(s => dayKey(new Date(s.start)) !== day(-1)); delete g.claims.goalDays[day(-1)]; }
  if ('${k}' === 'grad') { g.claims.milestones[100] = Date.now() - 40 * 864e5; }
  G = null; renderToday();`;
// ---- desktop, light ----
let p = await open(1280, 860, 'light');
await shot(p, 'today-card--d-light', TIMER, '.today-card');
await shot(p, 'timer-break--d-light', BREAK, '.timer-card');
await shot(p, 'session-card--d-light', SESSION, '[data-shot=session]');
await shot(p, 'after-block--d-light', AFTER, '#noteRow');
await shot(p, 'insights--d-light', STATS, '[data-shot=ins]');
if (isNew) {
  for (const k of ['rest-set', 'paused', 'rest', 'grad', 'mend'])   // (mend last: it takes yesterday's blocks out of the sample)
    await shot(p, 'streak-row-' + k + '--d-light', ROW(k), '.today-card');
  await p.context().close(); p = await open(1280, 860, 'light');   // (the row states changed the sample in memory: a fresh demo)
  await shot(p, 'streak-dlg--d-light', TIMER + ' openStreakCare();', '#streakDlg');
  for (const a of ['', 'breathe', 'stretch', 'eyes', 'water']) await shot(p, 'break-' + (a || 'menu') + '--d-light', BREAK + ` openBreak('${a}');` + (a === 'breathe' ? ' BRK.t0 = Date.now() - 2600; brkTick();' : a === 'stretch' ? ' BRK.t0 = Date.now() - 8000; brkTick();' : a === 'eyes' ? ' BRK.t0 = Date.now() - 7000; brkTick();' : ''), '#brkDlg', 1200);
}
await p.context().close();
// ---- desktop, dark ----
if (isNew) {
  p = await open(1280, 860, 'dark');
  await shot(p, 'streak-dlg--d-dark', TIMER + " S.game.pauses[dayKey(new Date())] = 3; G = null; renderToday(); openStreakCare();", '#streakDlg');
  await shot(p, 'break-menu--d-dark', BREAK + " openBreak('');", '#brkDlg', 1200);
  await shot(p, 'insights--d-dark', STATS, '[data-shot=ins]');
  await p.context().close();
}
// ---- phone, light ----
p = await open(390, 844, 'light');
await shot(p, 'today--phone', TIMER + " document.querySelector('.today-card').scrollIntoView({ block: 'start' }); scrollBy(0, -70);");
await shot(p, 'timer-break--phone', BREAK);
if (isNew) {
  await shot(p, 'streak-dlg--phone', TIMER + ' openStreakCare();');
  await shot(p, 'break-breathe--phone', BREAK + " openBreak('breathe'); BRK.t0 = Date.now() - 2600; brkTick();", null, 1200);
  await shot(p, 'break-menu--phone', BREAK + " openBreak('');", null, 1200);
}
await b.close();
