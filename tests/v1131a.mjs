// v1.13.1 focus guard: nothing pops up over a focus block; held items come back one at a time afterwards.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
async function guest(extra = {}, w = 1200) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 }, timezoneId: 'Asia/Kolkata' });
  await ctx.addInitScript(extra => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-guest', '1'); localStorage.setItem('pomodorolist-seen-version', '1.13.1'); localStorage.setItem('pomodorolist-intro-seen', '1'); for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v); }, extra);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 160)); });
  // watch everything that pops up: [time, what]
  await p.addInitScript(() => {
    window.__pops = [];
    const t0 = performance.now(), note = w => window.__pops.push([Math.round(performance.now() - t0), w, typeof S !== 'undefined' && S.timer ? S.timer.phase + '/' + S.timer.status : '']);
    new MutationObserver(ms => { for (const m of ms) { const el = m.target;
      if (m.type === 'attributes' && el.tagName === 'DIALOG' && el.open && m.oldValue === null) note('dialog#' + el.id);
      if (m.type === 'childList') for (const n of m.addedNodes) if (n.classList && n.classList.contains('toast-item')) note('toast:' + n.textContent.slice(0, 40));
      if (m.type === 'attributes' && el.id === 'pomeoBubble' && el.classList.contains('show') && !(m.oldValue || '').includes('show')) note('pomeo:' + el.textContent.slice(0, 40));
      if (m.type === 'attributes' && el.id === 'achCard' && el.classList.contains('show') && !(m.oldValue || '').includes('show')) note('ach');
      if (m.type === 'attributes' && el.id === 'tipPop' && !el.classList.contains('hidden') && (m.oldValue || '').includes('hidden')) note('tip');
      if (m.type === 'attributes' && el.id === 'pomeoPop' && !el.classList.contains('hidden') && (m.oldValue || '').includes('hidden')) note('reminder:' + el.className);
    } }).observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['open', 'class'] });
  });
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
// 1. Guest, first run: tutorial → 1-minute demo. The Day 1 reward must wait for the end of the demo.
const G = await guest();
await G.p.goto('http://localhost:8000/index.html?emulator=1');
await G.p.waitForSelector('#tutDlg[open]', { timeout: 15000 });
await G.ev(() => { TUT.i = TUT_STEPS - 1; renderTut(); });
await G.p.click('#tutDemo');
await wait(4000);
const during = await G.ev(() => ({ status: S.timer.status, demo: !!S.timer.demo, login: $('#loginDlg').open, held: FG.q.map(x => x.kind), attr: document.documentElement.hasAttribute('data-focusing') }));
check('Guest tutorial → 1-minute demo running: no Day 1 reward over it (held instead)', during.status === 'running' && during.demo && !during.login && during.held.includes('login') && during.attr, JSON.stringify(during));
// while the demo runs: background toasts, a level-up, achievements, Pomeo's news, an unlock and a tip all try to appear
await G.ev(() => { window.__pops.length = 0; toast('Background sync note'); showLevelUp(1, 2); showAchCard(ACHIEVEMENTS[1]); showAchCard(ACHIEVEMENTS[2]); pomeoSay('Welcome back! 🌱', { kind: 'care' }); pomeoSay('Random chatter', { kind: 'event' }); maybeTip('stats'); });
await wait(1500);
const blocked = await G.ev(() => ({ pops: window.__pops.map(x => x[1]), held: FG.q.map(x => x.kind) }));
check('While focusing: toasts, level-up, achievements, Pomeo, tips are held — nothing appears', !blocked.pops.length && ['toast', 'level', 'ach', 'pomeo'].every(k => blocked.held.includes(k)), JSON.stringify(blocked));
// the user's own actions still give feedback during focus
await G.p.click('#muteBtn'); await wait(300);
const own = await G.ev(() => window.__pops.map(x => x[1]));
await G.p.click('#muteBtn');
check('…but your own actions still answer (e.g. the mute toast)', own.some(x => x.startsWith('toast:')), JSON.stringify(own));
// a reminder that is actually due: a small banner, not a blocking pop-up
await G.ev(() => { window.__pops.length = 0; const d = new Date(Date.now() + 60000); S.reminders.push({ id: 'rdue', title: 'Chemistry revision', date: dayKey(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, repeat: 'none', before: 5, created: Date.now(), u: Date.now() }); checkReminders(); });
await G.p.waitForFunction(() => !$('#pomeoPop').classList.contains('hidden'), null, { timeout: 8000 }).catch(() => {});   // the reminder is claimed first, so one device rings
const rem = await G.ev(() => ({ cls: $('#pomeoPop').className, role: $('#pomeoPop').getAttribute('role'), focusStolen: document.activeElement && document.activeElement.id === 'popStart', box: (r => [Math.round(r.top), Math.round(r.height)])($('#pomeoPop').getBoundingClientRect()), dialogs: $$('dialog[open]').length }));
check('A due reminder during focus is a slim banner (no modal, keyboard focus not taken)', /compact/.test(rem.cls) && rem.role === 'status' && !rem.focusStolen && rem.box[1] < 80 && !rem.dialogs, JSON.stringify(rem));
await G.ev(() => $('#popDismiss').click());
// end of the demo: the clock jumps to the end
await G.ev(() => { window.__pops.length = 0; S.timer.endAt = Date.now() - 1; });
await G.p.waitForFunction(() => S.timer.phase !== 'focus', null, { timeout: 5000 });
await wait(16000);
const after = await G.ev(() => ({ pops: window.__pops.map(x => [x[0], x[1], x[2]]), held: FG.q.length, loginOpen: $('#loginDlg').open }));
const t0 = after.pops.length ? after.pops[0][0] : 0;
const seq = after.pops.map(x => x[1]);
log('  after the demo:', JSON.stringify(after.pops.map(x => `${x[0] - t0}ms ${x[1]}`)));
const firstHeld = seq.findIndex(x => x.startsWith('dialog#levelDlg'));
check('After the demo ends: the session’s own feedback comes first (stamp/summary), then the held items', firstHeld > 0 && seq.slice(0, firstHeld).some(x => /^toast:\+\d+ XP|Logged/.test(x) || x.startsWith('toast:')), JSON.stringify(seq.slice(0, firstHeld + 1)));
check('Held items come back in order, one at a time: level-up first, the Day 1 reward later', seq.indexOf('dialog#levelDlg') >= 0 && (seq.indexOf('dialog#loginDlg') > seq.indexOf('dialog#levelDlg') || after.held > 0), JSON.stringify(seq));
// one at a time: never two dialogs together, and while a dialog is open nothing else appears
const overlaps = await G.ev(() => window.__overlap || 0);
// close dialogs as they come, and check the rest follow
const order = [];
for (let i = 0; i < 20; i++) { const o = await G.ev(() => { const d = $('dialog[open]'); if (d) { const id = d.id; d.close(); return id; } return ''; }); if (o) order.push(o); await wait(1800); }
const rest = await G.ev(() => ({ pops: window.__pops.map(x => x[1]), held: FG.q.length }));
check('Closing each one brings the next (achievements, Pomeo, the Day 1 reward…), until nothing is left', order.includes('loginDlg') && rest.held === 0 && rest.pops.indexOf('dialog#loginDlg') > rest.pops.indexOf('ach') && rest.pops.includes('ach') && rest.pops.some(x => x.startsWith('pomeo:Welcome back')) && rest.pops.some(x => x === 'toast:Background sync note'), JSON.stringify({ order, held: rest.held, pops: [...new Set(rest.pops)] }));
check('Pomeo’s idle chatter during focus is simply skipped (not replayed later)', !rest.pops.some(x => /Random chatter/.test(x)));
const stack = await G.ev(() => { const ts = window.__pops; let worst = 0; for (let i = 1; i < ts.length; i++) if (ts[i][1].startsWith('dialog#') && ts[i - 1][1].startsWith('dialog#')) worst = Math.max(worst, 1); return { n: ts.length }; });
await G.ctx.close();
// 2. Signed-out guest who already did the tutorial: a level-up reached during a session waits for its end
const H = await guest({ 'pomodorolist-tour-done': '1', 'pomodorolist-onboarded:guest': '1', 'pomodorolist-login-later': (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })() });
await H.p.goto('http://localhost:8000/index.html?emulator=1'); await H.p.waitForSelector('#appView:not(.hidden)'); await wait(1500);
await H.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.timer.phase = 'focus'; startTimer(); window.__pops.length = 0; });
// enough XP banked from history to level up when this session is logged → level-up shows only after the block
await H.ev(() => { const add = []; for (let i = 0; i < 4; i++) { const st = Date.now() - (i + 2) * 864e5; add.push({ id: 'h' + i, name: 'Maths', start: st, end: st + 59 * 6e4, duration: 59 * 6e4, planned: 59 * 6e4 }); } S.sessions.unshift(...add); G = null; });
await wait(800);
await H.ev(() => { checkUnlocks(); reconcileRewards('loud'); showLevelUp(2, 3); });   // e.g. achievements and a level found mid-session
await wait(1500);
const mid = await H.ev(() => ({ pops: window.__pops.map(x => x[1]), held: FG.q.map(x => x.kind) }));
// v1.19 (by design, notes/v1.19-plan.md): a rank-up reached during a block shows one small toast at once and holds its
// celebration until the block ends, like a streak milestone. Whether the history above crosses a rank division
// depends on the date, so the toast may or may not appear; nothing else may.
const rankToast = x => /^toast:⬆️ Rank up: /.test(x);
check('A level-up and achievements reached mid-session are held (nothing shows during the block but the small rank-up toast, whose celebration is held)', mid.pops.every(rankToast) && mid.pops.length <= 1 && (!mid.pops.length || mid.held.includes('reveal')) && mid.held.includes('ach') && mid.held.includes('level'), JSON.stringify(mid));
await H.ev(() => { S.timer.planned = 25 * 60000; S.timer.focusStartedAt = Date.now() - 25 * 60000; S.timer.endAt = Date.now() - 1; });
await wait(12000);
const end = await H.ev(() => ({ pops: window.__pops.map(x => x[1]).filter(x => !/^toast:⬆️ Rank up: /.test(x)), stamp: !!$('#noteRow .stamp-land') }));   // (the rank-up toast was shown during the block)
const lv = end.pops.indexOf('dialog#levelDlg'), achI = end.pops.indexOf('ach');
check('After the block: session summary toast + stamp first, then the level-up; achievements wait while it is open', lv >= 1 && end.stamp && end.pops[0].startsWith('toast:+') && achI < 0, JSON.stringify(end.pops));
await H.ev(() => $('#levelDlg').close()); await wait(4000);
check('…and come once it is closed', (await H.ev(() => window.__pops.map(x => x[1]))).includes('ach'));
await H.ctx.close();
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
process.exit(fails ? 1 : 0);   // v2.0: a failing check fails the suite (it used to exit 0)
