// Phase 5 pictures: node p5shots.mjs <page> <outDir> [--new] [--only name,name]
//   <page> is a build in the test site (the phase's "before" build or the current one); both are shot minutes apart so
//   the demo's clock-driven data is the same. --new adds the screens that did not exist before (the Calendar).
//   Pairs are then made with tools/pair.py.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const [page, out] = process.argv.slice(2), isNew = process.argv.includes('--new'), only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const CALM = `.toasts, #pomeoBubble, .pv-banner, #tipPop, .ach-toast, #cursorGlow, #pomeoPop { display: none !important; } html { scroll-behavior: auto !important; } body.previewing { --pv-h: 0px !important; } * { content-visibility: visible !important; }`;
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
const TODAY = "S.ui.remView = 'rem'; showTab('reminders'); await new Promise(r => setTimeout(r, 300)); const c = [...document.querySelectorAll('#remBody .card')].find(x => /^Today/.test((x.querySelector('h2') || {}).textContent || '')); c.setAttribute('data-shot', 'today'); c.scrollIntoView({ block: 'center' });";
// ---- desktop, light ----
let p = await open(1280, 860, 'light');
await shot(p, 'sidebar--d-light', "showTab('timer'); scrollTo(0, 0);", '.sidenav');
await shot(p, 'today-card--d-light', "showTab('timer'); scrollTo(0, 0);", '.today-card');
await shot(p, 'reminders--d-light', TODAY, '[data-shot=today]');
await shot(p, 'rem-form--d-light', "S.ui.remView = 'rem'; showTab('reminders'); openRemForm(); await new Promise(r => setTimeout(r, 300)); document.querySelector('#remTitle').value = 'Hand in the chemistry record'; const a = document.querySelector('#remAllDay'); if (a) a.click(); document.activeElement && document.activeElement.blur();", '#remDlg');
await shot(p, 'settings-notify--d-light', "showTab('settings'); document.querySelector('#sec-notify').scrollIntoView({ block: 'center' });", '#sec-notify');
if (isNew) {
  await shot(p, 'cal-month--d-light', "S.ui.calView = 'month'; CAL.anchor = null; CAL.focus = ''; showTab('calendar'); scrollTo(0, 0);");
  await shot(p, 'cal-week--d-light', "S.ui.calView = 'week'; CAL.anchor = null; CAL.scroll = null; showTab('calendar'); scrollTo(0, 0);");
  await shot(p, 'cal-agenda--d-light', "S.ui.calView = 'agenda'; CAL.anchor = null; showTab('calendar'); scrollTo(0, 0);");
  await shot(p, 'cal-day--d-light', "S.ui.calView = 'month'; showTab('calendar'); scrollTo(0, 0); calOpenDay(dayKey(addDays(startOfDay(new Date()), 1)));");
  await shot(p, 'cal-block--d-light', "S.ui.calView = 'week'; CAL.scroll = null; showTab('calendar'); scrollTo(0, 0); openBlockForm({ date: dayKey(addDays(startOfDay(new Date()), 1)), time: '14:00', dur: 90 }); await new Promise(r => setTimeout(r, 300)); document.querySelector('#blkTitle').value = 'Organic chemistry: named reactions'; document.activeElement && document.activeElement.blur();");
}
await p.context().close();
// ---- desktop, dark ----
if (isNew) {
  p = await open(1280, 860, 'dark');
  await shot(p, 'cal-month--d-dark', "S.ui.calView = 'month'; CAL.anchor = null; CAL.focus = ''; showTab('calendar'); scrollTo(0, 0);");
  await shot(p, 'cal-week--d-dark', "S.ui.calView = 'week'; CAL.anchor = null; CAL.scroll = null; showTab('calendar'); scrollTo(0, 0);");
  await p.context().close();
}
// ---- phone, light ----
p = await open(390, 844, 'light');
await shot(p, 'reminders--phone', TODAY, '[data-shot=today]');
if (isNew) {
  await shot(p, 'cal-month--phone', "S.ui.calView = 'month'; CAL.anchor = null; showTab('calendar'); scrollTo(0, 0);");
  await shot(p, 'cal-day--phone', "S.ui.calView = 'week'; CAL.anchor = addDays(startOfDay(new Date()), 1); CAL.scroll = null; showTab('calendar'); scrollTo(0, 0);");
  await shot(p, 'cal-agenda--phone', "S.ui.calView = 'agenda'; CAL.anchor = null; showTab('calendar'); scrollTo(0, 0);");
  await shot(p, 'cal-daydlg--phone', "S.ui.calView = 'month'; CAL.anchor = null; showTab('calendar'); scrollTo(0, 0); calOpenDay(dayKey(addDays(startOfDay(new Date()), 1)));");
}
await b.close();
