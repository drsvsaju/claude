// v2.0 phase 6b — healthier streaks: a weekly rest day, a pause, mending a missed day, graduation at 100 days.
// A kept day (freeze, rest, pause, mended) keeps the streak going and never adds to it. The allowances are dated,
// add-only maps in users/{uid}.game (rest, pauses, pauseEnds, repairs): private, optional, merged between devices,
// and left alone by an older app version. Nothing new is published and no rule changes.
// The logic runs for a guest with the clock pinned (the 10th of this month, then later days), so the checks do not
// depend on the date; the sync checks run on real accounts in real time.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, ownerGet } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const now0 = new Date(), at = day => new Date(now0.getFullYear(), now0.getMonth(), day, 12, 0, 0);
async function page(w, h = 900, tag = 'p', fixed = null) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); } catch (e) {} });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(), net = [];
  if (fixed) await p.clock.setFixedTime(fixed);
  p.on('pageerror', e => errs.push(tag + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|transport errored|Could not reach Cloud Firestore|offline mode|unavailable/i.test(m.text())) errs.push(tag + ' error: ' + m.text().slice(0, 160)); });
  p.on('request', r => { if (/:8080|:9099|googleapis\.com\/(google\.firestore|identitytoolkit)|firestore\.googleapis/.test(r.url()) && r.method() !== 'GET') net.push(r.method() + ' ' + r.url().slice(0, 80) + ' ' + (r.postData() || '').slice(0, 60)); });
  await p.goto('http://localhost:8000/index.html?emulator=1'); await p.waitForSelector('#authView:not(.hidden)'); await wait(700);
  return { ctx, p, net, ev: (f, a) => p.evaluate(f, a) };
}
const storage = d => d.ev(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))));
const guest = async d => { await d.p.click('#guestBtn'); await d.p.waitForSelector('#appView:not(.hidden)'); await wait(1500); for (let i = 0; i < 3; i++) { await d.ev(() => { if ($('#tutDlg') && $('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); }); await wait(400); } };
const preview = async d => { await d.p.click('#previewBtn'); await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 15000 }); await wait(2500); await d.ev(() => { document.querySelectorAll('dialog[open]:not(#pvDlg)').forEach(x => x.close()); closePop(); }); };
// page-side helpers: start over with focus on the given days (offsets from today, 60 minutes each unless said)
const HELP = () => {
  window.T = {
    key: off => dayKey(addDays(startOfDay(new Date()), off)),
    wd: off => addDays(startOfDay(new Date()), off).getDay(),
    add(offs, min = 60) { const t0 = startOfDay(new Date()); for (const off of offs) { const st = +addDays(t0, off) + 9 * 3600e3 + S.sessions.length * 1000; S.sessions.push({ id: 'sd' + off + '_' + S.sessions.length, name: 'Physics', start: st, end: st + min * 6e4, duration: min * 6e4, planned: min * 6e4 }); } S.sessions.sort((a, b) => a.start - b.start); G = null; },
    reset(offs, min = 60) { S.sessions = []; const g = S.game; g.rest = {}; g.pauses = {}; g.pauseEnds = {}; g.repairs = {}; g.freezesUsed = {}; g.purchases = {}; g.claims.goalDays = {}; g.claims.milestones = {}; S.goalLog = []; S.settings.goalMin = 60; T.add(offs, min); },
    range: (a, z) => Array.from({ length: z - a + 1 }, (_, i) => a + i),
    st() { const idx = buildIndex(), s = computeStreaks(idx); return { cur: s.cur, longest: s.longest }; },
    row() { renderToday(); const el = $('#streakCare'); return { k: el.dataset.k, t: el.querySelector('.sc-tx b').textContent, s: el.querySelector('.sc-tx .lbl').textContent, grad: !!el.querySelector('.sc-grad'), bar: !!el.querySelector('.sc-bar') }; },
    toasts: () => [...document.querySelectorAll('.toast-item')].map(x => x.textContent.trim()),
    sl: ms => new Promise(r => setTimeout(r, ms)),
  };
};
const setDay = async (d, day) => { await d.p.clock.setFixedTime(at(day)); await d.ev(() => { G = null; renderAll(); }); await wait(300); };

// ====================== a guest, the clock pinned to the 10th ======================
const G1 = await page(1280, 900, 'guest', at(10));
await guest(G1);
await G1.ev(HELP);

// ---------- 1. the rest day keeps the streak and adds nothing ----------
const rest = await G1.ev(() => {
  const out = {};
  T.reset([-8, -7, -6, -5, -4, -2, -1]);                       // day −3 has no focus
  out.before = T.st();
  S.game.rest[T.key(-9)] = T.wd(-3);                           // chosen nine days ago
  out.after = T.st();
  const keep = streakKeeper();
  out.why = keep(T.key(-3)); out.earlier = keep(T.key(-10));   // the same weekday before the choice applied: the past is not judged again
  out.kept = keptDays(buildIndex()).map(x => [x.k === T.key(-3), x.why]);
  T.add([-3]); out.met = T.st();                               // focus on the rest day counts like any day
  out.norm = Object.keys(normalizeGame({ rest: { '2026-01-05': 3, bad: 2, '2026-01-06': 9 }, pauses: { '2026-01-05': 8, '2026-01-07': 2 }, pauseEnds: { '2026-01-07': 'x' }, repairs: { '2026-01-08': 0, '2026-01-09': 5 } }).rest).join() +
    '|' + JSON.stringify(normalizeGame({ pauses: { '2026-01-05': 8, '2026-01-07': 2 }, pauseEnds: { '2026-01-07': 'x' }, repairs: { '2026-01-08': 0, '2026-01-09': 5 } })).match(/"pauses":\{[^}]*\},"pauseEnds":\{[^}]*\},"repairs":\{[^}]*\}/)[0];
  return out;
});
check('A weekly rest day keeps the streak going without adding to it (7 days, not 8, across the day off); it applies from its date only, and focus on a rest day counts like any day; bad entries in the stored maps are dropped',
  rest.before.cur === 2 && rest.after.cur === 7 && rest.after.longest === 7 && rest.why === 'rest' && rest.earlier === '' && rest.kept.length === 1 && rest.kept[0][0] && rest.kept[0][1] === 'rest' && rest.met.cur === 8
  && rest.norm === '2026-01-05|"pauses":{"2026-01-07":2},"pauseEnds":{},"repairs":{"2026-01-09":5}', JSON.stringify(rest));

// ---------- 2. choosing it: from tomorrow, once a week ----------
await G1.ev(() => { T.reset([-5, -4, -3, -2, -1]); save(); renderAll(); showTab('timer'); });
await G1.p.click('#streakCare'); await wait(400);
const pick = await G1.ev(async () => {
  const out = { open: $('#streakDlg').open, focus: document.activeElement === $('#scTitle'), val0: $('#scRest').value, row0: T.row() }, sel = $('#scRest'), wd = T.wd(0);
  const choose = async v => { sel.value = String(v); sel.dispatchEvent(new Event('change', { bubbles: true })); await T.sl(250); };
  await choose(wd);
  out.stored = S.game.rest[T.key(1)] === wd && Object.keys(S.game.rest).length === 1; out.note = $('#scRestNote').textContent; out.today = streakKeeper()(T.key(0)); out.toast = T.toasts().pop();
  await choose(-1); out.undone = S.game.rest[T.key(1)]; await choose((wd + 1) % 7); out.again = S.game.rest[T.key(1)] === (wd + 1) % 7 && Object.keys(S.game.rest).length === 1;
  out.row = T.row(); out.label = !!document.querySelector('label[for="scRest"]');
  $('#streakDlg').close();
  return out;
});
await setDay(G1, 11);
const locked = await G1.ev(async () => {
  const out = { info: restInfo(), today: streakKeeper()(T.key(0)) === 'rest', n: Object.keys(S.game.rest).length };
  openStreakCare(); await T.sl(200);
  out.disabled = $('#scRest').hasAttribute('disabled'); out.note = $('#scRestNote').textContent;
  out.refused = setRestDay((restInfo().next + 2) % 7) === false && Object.keys(S.game.rest).length === out.n; out.toast = T.toasts().pop();
  $('#streakDlg').close();
  return out;
});
await setDay(G1, 17);
const unlocked = await G1.ev(() => { const r = restInfo(), ok = setRestDay(-1); return { locked: r.locked, ok, off: S.game.rest[T.key(1)], n: Object.keys(S.game.rest).length }; });
check('“Streak care” on the Today card opens a dialog (title focused, labelled select); a rest day chosen today starts tomorrow (today is not rescued), can be corrected the same day, and then changes once a week',
  pick.open && pick.focus && pick.val0 === '-1' && pick.row0.k === 'care' && pick.stored && /Starts tomorrow/.test(pick.note) && pick.today === '' && /rest day from tomorrow/.test(pick.toast || '') && pick.undone === -1 && pick.again && /^Rest day: /.test(pick.row.s) && pick.label
  && locked.today && locked.info.locked && locked.disabled && /change it again on/.test(locked.note) && locked.refused && /once a week/.test(locked.toast || '')
  && !unlocked.locked && unlocked.ok && unlocked.off === -1 && unlocked.n === 2, JSON.stringify({ pick, locked, unlocked }));

// ---------- 3. a pause: up to 7 days a month, ended early, never adding to the count ----------
await G1.ev(() => { T.reset([-5, -4, -3, -2, -1]); save(); renderAll(); });
await G1.p.click('#streakCare'); await wait(400);
await G1.ev(() => { $('#scPauseN').value = 3; }); await G1.p.click('#scPauseGo'); await wait(400);
const p1 = await G1.ev(() => ({ n: S.game.pauses[T.key(0)], info: pauseInfo(), row: T.row(), st: T.st(), on: !$('#scPauseOn').classList.contains('hidden'), off: $('#scPauseOff').classList.contains('hidden'), state: $('#scPauseState').textContent, note: $('#scPauseNote').textContent, back: fmtDayShort(T.key(3)), toast: T.toasts().pop() }));
await G1.ev(() => $('#streakDlg').close());
await setDay(G1, 19);
const p2 = await G1.ev(() => ({ st: T.st(), kept: keptDays(buildIndex()).map(x => x.why).join(), row: T.row().k }));
await G1.ev(() => openStreakCare()); await wait(300); await G1.p.click('#scPauseEnd'); await wait(400);
const p3 = await G1.ev(() => {
  const out = { end: S.game.pauseEnds[T.key(-2)] === T.key(-1), info: pauseInfo(), st: T.st(), row: T.row().k };
  out.tooMany = startPause(6) === false; out.t1 = T.toasts().pop(); out.ok = startPause(5); out.info2 = pauseInfo(); out.to = out.info2.cur && out.info2.cur.to === T.key(4);
  return out;
});
await G1.ev(() => $('#streakDlg').close());
await setDay(G1, 24);
const p4 = await G1.ev(async () => {
  const out = { st: T.st(), info: pauseInfo() };
  openStreakCare(); await T.sl(200);
  out.goOff = $('#scPauseGo').disabled && $('#scPauseN').hasAttribute('disabled'); out.note = $('#scPauseNote').textContent; out.refused = startPause(1) === false;
  S.game.pauses['2026-03-28'] = 6; out.months = [pauseUsed('2026-03'), pauseUsed('2026-04')]; delete S.game.pauses['2026-03-28'];   // a pause across a month end counts in each month
  $('#streakDlg').close();
  return out;
});
check('A pause is started in the dialog (3 days: the row says “Streak paused · Back on …”), keeps the streak at 5 without adding to it, can be ended early (today counts again), and stops at 7 paused days in a calendar month',
  p1.n === 3 && p1.info.cur && p1.info.used === 3 && p1.info.left === 4 && p1.row.k === 'pause' && p1.row.t === 'Streak paused' && p1.row.s === 'Back on ' + p1.back && p1.st.cur === 5 && p1.on && p1.off && /Paused/.test(p1.state) && /3 days of 7 used/.test(p1.note) && /Streak paused/.test(p1.toast || '')
  && p2.st.cur === 5 && p2.kept === 'pause,pause' && p2.row === 'pause'
  && p3.end && !p3.info.cur && p3.info.used === 2 && p3.st.cur === 5 && p3.row !== 'pause' && p3.tooMany && /5 pause days left/.test(p3.t1 || '') && p3.ok && p3.info2.used === 7 && p3.info2.left === 0 && p3.to
  && p4.st.cur === 5 && !p4.info.cur && p4.info.room === 0 && p4.goOff && /All 7 pause days are used/.test(p4.note) && p4.refused && p4.months.join() === '4,2', JSON.stringify({ p1, p2, p3, p4 }));

// ---------- 4. a Streak Freeze is not spent on a day that is already kept ----------
const fz = await G1.ev(() => {
  const out = {};
  T.reset(T.range(-70, -2), 120);                                 // enough history for the coins; yesterday has no focus
  S.game.purchases.pz = { item: 'freeze', price: 250, at: Date.now() - 5 * 864e5 };
  S.game.rest[T.key(-30)] = T.wd(-1);                             // yesterday is the rest day
  G = null; out.held0 = game().freezesHeld;
  reconcileRewards('quiet');
  out.usedOnRest = Object.keys(S.game.freezesUsed).length; G = null; out.held1 = game().freezesHeld; out.st1 = T.st().cur;
  S.game.rest = {}; S.game.claims.goalDays = {}; G = null;        // without the rest day the freeze does its old job
  reconcileRewards('quiet');
  out.used = Object.keys(S.game.freezesUsed).join() === T.key(-1); G = null; out.held2 = game().freezesHeld; out.st2 = T.st().cur; out.offer = repairOffer();
  return out;
});
check('A held Streak Freeze stays held when the missed day is the rest day (the streak carries on either way); without the rest day it is used as before, and then there is nothing to mend',
  fz.held0 === 1 && fz.usedOnRest === 0 && fz.held1 === 1 && fz.st1 === 69 && fz.used && fz.held2 === 0 && fz.st2 === 69 && fz.offer === null, JSON.stringify(fz));

// ---------- 5. mending a missed day: twice the goal within two days, once a month ----------
const m1 = await G1.ev(async () => {
  const out = {};
  T.reset([-6, -5, -4, -3, -2]); save(); renderAll();              // yesterday missed, no freeze
  out.offer = repairOffer(); out.st = T.st(); out.row = T.row(); out.wd = WD_LONG[T.wd(-1)];
  openStreakCare(); await T.sl(200); out.dlg = $('#scMend').textContent.replace(/\s+/g, ' ').trim(); out.open = $('#scMend').dataset.open; $('#streakDlg').close();
  T.add([0]); reconcileRewards('collect'); out.half = { offer: repairOffer(), st: T.st(), n: Object.keys(S.game.repairs).length, row: T.row() };
  T.add([0]); announce(reconcileRewards('collect'), 'quiet'); await T.sl(200);
  out.done = { mended: Object.keys(S.game.repairs).join() === T.key(-1), st: T.st(), offer: repairOffer(), toast: T.toasts().join(' | '), kept: keptDays(buildIndex()).map(x => x.why).join(), row: T.row().k };
  save();
  return out;
});
await setDay(G1, 26);
const m2 = await G1.ev(() => {
  const out = { used: repairOffer() };                             // the 25th was missed, but this month's mending is used
  const k = Object.keys(S.game.repairs)[0]; S.game.repairs[k] = Date.now() - 40 * 864e5;   // …had it been last month
  const o = repairOffer(); out.next = o && { day: o.day === T.key(-1), need: o.need, lastDay: o.lastDay };
  setDailyGoal(5); out.lowGoal = repairOffer().need;               // lowering today's goal does not make mending cheaper
  setDailyGoal(300); out.highGoal = repairOffer().need;            // and it is never more than two hours on top of the goal
  return out;
});
const m3 = await G1.ev(() => {
  const out = {};
  T.reset([-6, -5, -4, -3]); out.two = repairOffer();              // two days missed in a row
  T.reset([-3, -2]); out.short = repairOffer();                    // the streak before was only two days
  T.reset([-7, -6, -5, -4, -3, -1]); const o = repairOffer(); out.last = o && { day: o.day === T.key(-2), lastDay: o.lastDay, st: T.st().cur };   // the day before yesterday: today is the last day
  openStreakCare(); out.words = /Reach 2h of focus today and/.test($('#scMend').textContent); $('#streakDlg').close();
  T.add([0], 95); reconcileRewards('collect'); out.notYet = Object.keys(S.game.repairs).length;
  S.settings.gamification = false; S.settings.overtime = false;   // the last 25 minutes as a real block, in True Minimalist
  const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 25 * 60000; t.focusStartedAt = Date.now() - t.planned; t.endAt = Date.now() - 1;
  return out;
});
await wait(3200);
Object.assign(m3, await G1.ev(() => { const o = { lastDone: { mended: Object.keys(S.game.repairs).join() === T.key(-2), st: T.st().cur }, said: T.toasts().some(x => /is mended · your streak carries on/.test(x)) }; S.settings.gamification = true; document.querySelectorAll('dialog[open]').forEach(d => d.close()); const t = S.timer; t.phase = 'focus'; t.status = 'idle'; renderAll(); return o; }));
check('After one missed day (streak of 3 or more, no freeze) the row offers “Mend <day>” as optional (2 h in a day for a 1 h goal, said as what is left, with progress); half-way nothing changes; at 2 h the day is mended, the streak carries on (6: the mended day adds nothing) and a kind toast says so',
  m1.offer && m1.offer.day && m1.offer.need === 120 && m1.offer.got === 0 && !m1.offer.lastDay && m1.st.cur === 0 && m1.row.k === 'mend' && m1.row.t === 'Mend ' + m1.wd && m1.row.s === 'Optional · 2h more today brings it back' && m1.row.bar && m1.open === '1' && /Reach 2h of focus today or tomorrow/.test(m1.dlg) && /A fresh start is fine too/.test(m1.dlg)
  && m1.half.offer && m1.half.offer.got === 60 && !m1.half.offer.done && m1.half.n === 0 && m1.half.st.cur === 1 && m1.half.row.s === 'Optional · 1h more today brings it back'
  && m1.done.mended && m1.done.st.cur === 6 && m1.done.st.longest === 6 && m1.done.offer === null && /is mended · your streak carries on/.test(m1.done.toast) && m1.done.kept === 'mend' && m1.done.row !== 'mend', JSON.stringify(m1));
check('Mending is once a calendar month; the target follows the higher of that day’s goal and today’s (a lowered goal does not make it cheaper) and is never more than 2 h on top; no offer after two missed days or a 2-day streak; on the second day the words say “today”, and a real block that reaches the target mends it (said in True Minimalist too)',
  m2.used === null && m2.next && m2.next.day && m2.next.need === 120 && !m2.next.lastDay && m2.lowGoal === 120 && m2.highGoal === 420
  && m3.two === null && m3.short === null && m3.last && m3.last.day && m3.last.lastDay && m3.last.st === 1 && m3.words && m3.notYet === 0 && m3.lastDone.mended && m3.lastDone.st === 7 && m3.said, JSON.stringify({ m2, m3 }));

// ---------- 6. graduation at 100 days: a permanent mark, quieter words ----------
const grad = await G1.ev(async () => {
  const out = {};
  T.reset(T.range(-99, -1)); out.at99 = { st: T.st(), grad: isGraduate(T.st().longest), mark: T.row().grad };
  T.add([-100]); G = null; reconcileRewards('quiet'); out.at100 = { st: T.st(), grad: isGraduate(T.st().longest), mark: T.row().grad, claimed: !!S.game.claims.milestones[100] };
  openStreakCare(); await T.sl(200); out.card = ($('#scNums .sc-gradcard') || {}).textContent || ''; out.markName = ($('#streakCare .sc-grad .vh') || {}).textContent; $('#streakDlg').close();
  S.sessions = S.sessions.filter(s => s.start < +addDays(startOfDay(new Date()), -2)); S.game.claims.goalDays = {}; G = null;   // two days off: the streak starts again (the days' goal claims go with the test's sessions)
  out.after = { st: T.st(), grad: isGraduate(T.st().longest), row: T.row() };
  save();
  return out;
});
await G1.p.reload(); await G1.p.waitForSelector('#appView:not(.hidden)'); await wait(1500); await G1.ev(HELP);
const kept = await G1.ev(() => ({ grad: T.row().grad, maps: ['rest', 'pauses', 'pauseEnds', 'repairs'].every(k => S.game[k] && typeof S.game[k] === 'object') }));
check('At 100 days the streak graduates: a mark on the Today row and a card in the dialog (“The habit is yours…”); it stays after the streak ends, and the row then says “A fresh start · The habit is already yours”; all of it survives a reload',
  !out99(grad) && grad.at100.st.longest === 100 && grad.at100.grad && grad.at100.mark && grad.at100.claimed && /100-day graduate/.test(grad.card) && /habit is yours/.test(grad.card) && grad.markName === '100-day graduate'
  && grad.after.st.cur === 0 && grad.after.st.longest === 98 && grad.after.grad && grad.after.row.k === 'fresh' && grad.after.row.t === 'A fresh start' && grad.after.row.s === 'The habit is already yours' && grad.after.row.grad && kept.grad && kept.maps, JSON.stringify({ grad, kept }));
function out99(g) { return g.at99.grad || g.at99.mark || g.at99.st.longest !== 99; }

// ---------- 7. a questline's "days in a row" carries over a kept day ----------
const run = await G1.ev(() => {
  T.reset([-6, -5, -3, -2, -1]);                                   // day −4 has no focus
  const ev = { id: 'tst', start: T.key(-6), end: T.key(0) };
  G = null; const a = eventMetrics(ev).streak; S.game.pauses[T.key(-4)] = 1; G = null; const b2 = eventMetrics(ev).streak;
  return { a, b: b2 };
});
check('A questline’s “days in a row” carries over a paused day without counting it (3 → 5)', run.a === 3 && run.b === 5, JSON.stringify(run));
await G1.ctx.close();

// ====================== two devices and an older app version, real time ======================
const R = Date.now().toString(36).slice(-5), U = 'care_' + R;
const login = async (d, pg = 'index.html') => {
  await d.p.goto(`http://localhost:8000/${pg}?emulator=1`); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await d.p.click('[data-mode=login] >> visible=true'); await d.p.fill('#authUser', U); await d.p.fill('#authPass', 'secret12'); await d.p.click('#authSubmit');
  await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(d);
};
const A = await device('A', 1280);
await signup(A, U);
const uid = await A.ev(() => USER.uid);
await A.ev(HELP);
await A.ev(() => showTab('timer'));
await A.p.click('#streakCare'); await wait(400);
const wdA = await A.ev(async () => { const sel = $('#scRest'), wd = (new Date().getDay() + 3) % 7; sel.value = String(wd); sel.dispatchEvent(new Event('change', { bubbles: true })); await T.sl(200); $('#scPauseN').value = 2; return wd; });
await A.p.click('#scPauseGo'); await wait(300); await A.p.click('#scPauseEnd'); await wait(300);
await A.ev(() => { S.game.repairs['2026-01-05'] = 1767600000000; save(); $('#streakDlg').close(); });
await until(A, () => !localEditPending, null, 8000); await wait(1500);
const cloud = (await ownerGet('users/' + uid)).game || {};
const keysA = await A.ev(() => ({ rest: S.game.rest, pauses: S.game.pauses, pauseEnds: S.game.pauseEnds, repairs: S.game.repairs, row: T.row() }));
const B = await device('B', 1280);
await login(B); await B.ev(HELP);
const onB = await B.ev(() => ({ rest: S.game.rest, pauses: S.game.pauses, pauseEnds: S.game.pauseEnds, repairs: S.game.repairs, row: T.row() }));
await B.ev(() => { S.game.pauses['2025-12-01'] = 2; save(); });
const back = await until(A, () => S.game.pauses['2025-12-01'] === 2, null, 12000);
check('Signed in, the rest day, a pause, its early end and a mended day are stored in users/{uid}.game and reach a second device (same row on both); a pause made on the second device comes back to the first',
  Object.values(cloud.rest || {})[0] === wdA && Object.values(cloud.pauses || {})[0] === 2 && Object.keys(cloud.pauseEnds || {}).length === 1 && cloud.repairs && cloud.repairs['2026-01-05'] === 1767600000000
  && JSON.stringify(onB.rest) === JSON.stringify(keysA.rest) && JSON.stringify(onB.pauses) === JSON.stringify(keysA.pauses) && JSON.stringify(onB.pauseEnds) === JSON.stringify(keysA.pauseEnds) && JSON.stringify(onB.repairs) === JSON.stringify(keysA.repairs)
  && onB.row.s === keysA.row.s && /^Rest day: /.test(onB.row.s) && back >= 0, JSON.stringify({ cloud: { rest: cloud.rest, pauses: cloud.pauses, pauseEnds: cloud.pauseEnds, repairs: cloud.repairs }, onB, keysA, back }));

// an older version (1.20) signs in, changes a setting and saves: the new maps stay in the cloud and on the new app
const O = await device('old', 1280);
await login(O, 'v120.html');
const oldSees = await O.ev(() => ({ ver: APP_VERSION, has: 'rest' in S.game || 'pauses' in S.game, streakOk: typeof computeStreaks(buildIndex()).cur === 'number' }));
await O.ev(() => { S.settings.sound = !S.settings.sound; S.game.seenAt = Date.now(); save(); });
await until(O, () => !localEditPending, null, 8000); await wait(2000);
const cloud2 = (await ownerGet('users/' + uid)).game || {};
await wait(1500);
const stillA = await A.ev(() => ({ rest: Object.keys(S.game.rest).length, pauses: Object.keys(S.game.pauses).length, ends: Object.keys(S.game.pauseEnds).length, repairs: Object.keys(S.game.repairs).length }));
check('Version 1.20 on the same account works as before (it does not know the new maps), and its save leaves them in the cloud and on the new app',
  oldSees.ver === '1.20' && !oldSees.has && oldSees.streakOk && Object.values(cloud2.rest || {})[0] === wdA && Object.keys(cloud2.pauses || {}).length === 2 && Object.keys(cloud2.pauseEnds || {}).length === 1 && cloud2.repairs && cloud2.repairs['2026-01-05'] === 1767600000000
  && stillA.rest === 1 && stillA.pauses === 2 && stillA.ends === 1 && stillA.repairs === 1, JSON.stringify({ oldSees, cloud2: { rest: cloud2.rest, pauses: cloud2.pauses, pauseEnds: cloud2.pauseEnds, repairs: cloud2.repairs }, stillA }));
await O.ctx.close(); await B.ctx.close();

// True Minimalist: the row and the dialog are still there (they are about wellbeing, not rewards); the freezes part is not
const mini = await A.ev(async () => {
  S.settings.gamification = false; renderAll(); showTab('timer'); await T.sl(200);
  const vis = el => !!el && el.getClientRects().length > 0, out = { row: vis($('#streakCare')) };
  openStreakCare(); await T.sl(200); out.rest = vis($('#scRest')); out.freeze = vis($('#scFreeze')); $('#streakDlg').close();
  showTab('settings'); await T.sl(200); out.setting = vis($('#setStreakCare')); $('#setStreakCare').click(); await T.sl(200); out.fromSettings = $('#streakDlg').open; $('#streakDlg').close();
  S.settings.gamification = true; renderAll();
  return out;
});
check('In True Minimalist the row and the dialog stay (without the Streak Freezes part), and Settings › “Streak care” opens the same dialog', mini.row && mini.rest && !mini.freeze && mini.setting && mini.fromSettings, JSON.stringify(mini));
await A.ctx.close();

// ====================== the demo: shown, and nothing written ======================
const DM = await page(1280, 900, 'demo');
await preview(DM); await DM.ev(HELP);
const s0 = await storage(DM), n0 = DM.net.length;
await DM.ev(() => showTab('timer')); await DM.p.click('#streakCare'); await wait(400);
const demo = await DM.ev(async () => {
  const out = { open: $('#streakDlg').open, st: T.st(), rest: $('#scRest').value, kept: document.querySelectorAll('#scKept li').length, row: T.row() }, g0 = JSON.stringify(S.game);
  const sel = $('#scRest'); sel.value = String((+sel.value + 1) % 7); sel.dispatchEvent(new Event('change', { bubbles: true })); await T.sl(300);
  out.p1 = $('#pvDlg').open && $('#pvWhy').textContent; if ($('#pvDlg').open) $('#pvDlg').close(); await T.sl(300); out.back = $('#scRest').value === out.rest;
  $('#scPauseGo').click(); await T.sl(300); out.p2 = $('#pvDlg').open; if ($('#pvDlg').open) $('#pvDlg').close(); await T.sl(300);
  out.direct = [setRestDay(2), startPause(2), endPause()].join(); if ($('#pvDlg').open) $('#pvDlg').close();
  out.same = g0 === JSON.stringify(S.game);
  $('#streakDlg').close();
  return out;
});
await wait(1500);
const s1 = await storage(DM);
check('The demo shows it all (a rest day, days that kept the streak, the 23-day streak unchanged) and changes nothing: each control explains why instead, with no write to the browser’s storage or to Firestore',
  demo.open && demo.st.cur === 23 && demo.st.longest === 23 && +demo.rest >= 0 && demo.kept >= 1 && /^Rest day: /.test(demo.row.s) && /set a rest day, pause your streak or mend a missed day/.test(demo.p1 || '') && demo.back && demo.p2 && demo.direct === 'false,false,false' && demo.same
  && s0 === s1 && DM.net.length === n0, JSON.stringify({ demo, net: DM.net.slice(n0), storageSame: s0 === s1 }));
await DM.ctx.close();

// ====================== a phone ======================
const PH = await page(390, 844, 'phone');
await guest(PH); await PH.ev(HELP);
await PH.ev(() => { T.reset([-6, -5, -4, -3, -2]); save(); renderAll(); showTab('timer'); $('#streakCare').scrollIntoView({ block: 'center' }); });
await wait(300); await PH.p.tap('#streakCare'); await wait(500);
const phone = await PH.ev(() => {
  const r = el => el.getBoundingClientRect(), dlg = $('#streakDlg'), out = { open: dlg.open, w: innerWidth, over: document.documentElement.scrollWidth > innerWidth };
  out.small = [...dlg.querySelectorAll('button, ui-select')].filter(el => el.getClientRects().length && (r(el).height < 43.5 || r(el).width < 43.5)).map(el => (el.id || el.className || el.tagName) + ' ' + Math.round(r(el).width) + 'x' + Math.round(r(el).height));
  out.inside = [...dlg.querySelectorAll('.sc-row > *, #scMend, #scNums')].every(el => !el.getClientRects().length || (r(el).left >= r(dlg).left - 0.5 && r(el).right <= r(dlg).right + 0.5));
  out.mend = $('#scMend').dataset.open === '1';
  dlg.close();
  const row = $('#streakCare'); out.row = [Math.round(r(row).height), r(row).left >= 0 && r(row).right <= innerWidth];
  return out;
});
check('On a phone (390 px) the row is a full-width target of 44 px or more, the dialog fits the screen with nothing cut off, and every control in it is at least 44 px',
  phone.open && !phone.over && phone.small.length === 0 && phone.inside && phone.mend && phone.row[0] >= 44 && phone.row[1], JSON.stringify(phone));
await PH.ctx.close();

check('No page errors', errs.length === 0, errs.join(' | '));
log(`\n${failCount() ? '✗ ' + failCount() + ' FAILED' : '✓ all passed'}`);
await b.close();
process.exit(failCount() ? 1 : 0);
