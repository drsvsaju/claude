// v1.17 Phase 6 — edge cases: midnight (tasks, rewards, goal history), week rollover (challenge rewards, the festival),
// month boundary, a device clock ahead, double-clicks (sell, task, harvest, Finish early, reward claim), rapid tab
// switching, a brand-new account, a very large history, and a full v1.16 export imported into 1.17.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, focus, until } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const R = Date.now().toString(36).slice(-5);
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); localStorage.setItem('pomodorolist-tips-seen', JSON.stringify(['stats', 'reminders', 'quests', 'shop', 'friends', 'board', 'profile', 'settings', 'garden', 'room'])); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const G = await guest(1280, { tag: 'edge' });
await G.ev(() => { S.settings.gardenTour = 1; save(); });
// ---------- 1. midnight ----------
const mid = await G.ev(() => {
  const today = new Date(), tom = addDays(startOfDay(today), 1), yest = addDays(startOfDay(today), -1);
  const t1 = gardenTasks(today), t1b = gardenTasks(today), t2 = gardenTasks(tom), t0 = gardenTasks(yest);
  const ids = l => l.map(t => t.id).join();
  // a task claimed today is not "claimed" tomorrow (its ledger id carries the date); a claim is one ledger entry however often it is clicked
  const done = t1.find(t => t.k === 'focus' || t.k === 'minutes') || t1[0];
  S.gbuys.push({ id: done.id, v: 1, item: 'task', price: 0, bonus: done.r, at: Date.now(), slot: '', src: 'task', day: dayKey(today) }); GD = null;
  const claimedToday = gardenTasks(today).find(t => t.id === done.id).claimed, claimedTom = gardenTasks(tom).some(t => t.claimed);
  S.gbuys = S.gbuys.filter(x => x.id !== done.id); GD = null;
  // the daily reward: yesterday claimed → today is Day 2; today claimed → claimed; a claim dated tomorrow (a device a day ahead) never counts as today
  S.game.claims.login = { [dayKey(yest)]: Date.now() - 864e5 }; G = null; const d2 = loginToday();
  S.game.claims.login[dayKey(tom)] = Date.now() + 864e5; G = null; const d2b = loginToday();
  S.game.claims.login = {}; G = null;
  // a session ending just after midnight belongs to the new day; a session straddling midnight counts on the day it ended
  const end = startOfDay(today).getTime() + 30000, s = { id: 'mid1', name: 'Physics', start: end - 25 * 60000, end, duration: 25 * 60000, planned: 25 * 60000 };
  S.sessions.push(s); const idx = buildIndex(); const onToday = (idx[dayKey(today)] || {}).total || 0, onYest = (idx[dayKey(yest)] || {}).total || 0; S.sessions = S.sessions.filter(x => x.id !== 'mid1');
  return { same: ids(t1) === ids(t1b), diff: ids(t1) !== ids(t2) && ids(t1) !== ids(t0), three: t1.length === 3 && t2.length === 3, kinds: new Set(t1.map(t => t.k)).size === 3, claimedToday, claimedTom, d2: d2.day, d2c: d2.claimed, d2b: d2b.day, d2bc: d2b.claimed, onToday, onYest };
});
check('Midnight: today’s three garden tasks are fixed by the date (same on every call, different tomorrow and yesterday, three different kinds); a claim belongs to its day', mid.same && mid.diff && mid.three && mid.kinds && mid.claimedToday && !mid.claimedTom, JSON.stringify(mid));
check('Midnight: yesterday claimed → today is Day 2 unclaimed; a claim dated tomorrow (device a day ahead) does not mark today claimed', mid.d2 === 2 && !mid.d2c && mid.d2b === 2 && !mid.d2bc, JSON.stringify(mid));
check('Midnight: a block that straddles midnight is split by the minutes on each side (24.5 yesterday, 0.5 today) — the day totals never double count', Math.abs(mid.onToday - .5) < 1e-6 && Math.abs(mid.onYest - 24.5) < 1e-6, JSON.stringify(mid));
// goal history across midnight: yesterday met its 60, the goal rises to 120 today → yesterday still counts, today is judged by 120
const goal = await G.ev(() => {
  const today = new Date(), yest = addDays(startOfDay(today), -1), y = dayKey(yest);
  S.goalLog = []; S.settings.goalMin = 60; S.game.claims.goalDays = {};
  const mk = (id, end, min) => ({ id, name: 'Maths', start: end - min * 60000, end, duration: min * 60000, planned: min * 60000 });
  S.sessions.push(mk('gy1', yest.getTime() + 10 * 3600e3, 60), mk('gt1', Date.now() - 1000, 60));
  const idx0 = buildIndex(), before = { y: goalMetDay(idx0, y), t: goalMetDay(idx0, dayKey(today)), cur: computeStreaks(idx0).cur };
  setDailyGoal(120); const idx1 = buildIndex();
  const after = { y: goalMetDay(idx1, y), t: goalMetDay(idx1, dayKey(today)), cur: computeStreaks(idx1).cur, gy: goalFor(y), gt: goalFor(dayKey(today)), log: S.goalLog.length };
  setDailyGoal(60); const back = { t: goalMetDay(buildIndex(), dayKey(today)), log: S.goalLog.length, gt: goalFor(dayKey(today)) };
  S.sessions = S.sessions.filter(x => !/^g[yt]1$/.test(x.id)); S.goalLog = []; save();
  return { before, after, back };
});
check('Goal history at midnight: with 60 min on both days the goal 60 → 120 change keeps yesterday met (streak stays ≥ 1) and judges today by 120; changing back the same day rewrites today’s entry (one log entry)', goal.before.y && goal.before.t && goal.before.cur >= 1 && goal.after.y && !goal.after.t && goal.after.cur >= 1 && goal.after.gy === 60 && goal.after.gt === 120 && goal.after.log === 1 && goal.back.t && goal.back.log === 1 && goal.back.gt === 60, JSON.stringify(goal));
// ---------- 2. week rollover: challenge rewards per preset per week, the weekend festival ----------
const wk = await G.ev(() => {
  const mon = weekStartOf(parseDay('2026-11-09'), 1), prevSun = addDays(mon, -1), nextMon = addDays(mon, 7);
  // claim ids are <challenge week>_<preset>_<creator>: from the cut-off week one reward per preset per week (the earliest claim); older weeks pay every challenge
  const cl = { challenges: { '2026-11-02_h5_u1': prevSun.getTime() + 23 * 3600e3 + 59 * 60000, '2026-11-09_h5_u1': mon.getTime() + 60000, '2026-11-09_h5_u2': mon.getTime() + 3 * 864e5, '2026-11-09_h10_u3': mon.getTime() + 4 * 864e5, '2026-11-16_h5_u1': nextMon.getTime() + 60000, '2026-10-26_h5_u1': mon.getTime() - 10 * 864e5, '2026-10-26_h5_u2': mon.getTime() - 9 * 864e5 } };
  const r = challengeRewards(cl), paid = Object.keys(r).sort().join(), first = r['2026-11-09_h5'] === mon.getTime() + 60000;
  const sat = new Date(2026, 10, 14, 12), sun = new Date(2026, 10, 15, 23, 59), monD = new Date(2026, 10, 16, 0, 1), fri = new Date(2026, 10, 13, 23, 59);
  const crop = { id: 'cv1', sp: 'tomato', y: 10, m: '', wt: 70, fd: 25 };
  return { paid, first, fest: [festivalOn(fri), festivalOn(sat), festivalOn(sun), festivalOn(monD)].join(), vFri: cropValue(crop, fri.getTime()), vSat: cropValue(crop, sat.getTime()), vMon: cropValue(crop, monD.getTime()) };
});
check('Week rollover: challenge rewards — last week’s h5, this week’s h5 (the earliest claim only, the second h5 this week pays nothing), this week’s h10 and next week’s h5 each pay once; two h5 challenges from a week before the cut-off both pay', wk.paid === '2026-10-26_h5_u1,2026-10-26_h5_u2,2026-11-02_h5,2026-11-09_h10,2026-11-09_h5,2026-11-16_h5' && wk.first, JSON.stringify(wk));
check('The harvest festival runs Saturday and Sunday only: Friday 23:59 no, Monday 00:01 no; a 10-produce crop sells for 13 on the weekend (×1.25) and 10 on Friday / Monday', wk.fest === 'false,true,true,false' && wk.vFri === 10 && wk.vSat === 13 && wk.vMon === 10, JSON.stringify(wk));
// ---------- 3. month boundary: tasks and rewards use calendar days, not month-relative numbers ----------
const mo = await G.ev(() => {
  const last = parseDay('2026-11-30'), first = parseDay('2026-12-01');
  const a = gardenTasks(last).map(t => t.id).join(), b2 = gardenTasks(first).map(t => t.id).join();
  S.game.claims.login = { '2026-11-29': parseDay('2026-11-29').getTime() + 1, '2026-11-30': last.getTime() + 1, '2026-12-01': first.getTime() + 1, '2026-12-31': parseDay('2026-12-31').getTime() + 1, '2027-01-01': parseDay('2027-01-01').getTime() + 1 }; G = null;
  const cyc = loginCycle(); S.game.claims.login = {}; G = null;
  return { a, b2, runs: Object.values(cyc).join(), coins: [loginCoinsFor(1, '2026-11-30'), loginCoinsFor(2, '2026-12-01')].join() };
});
check('Month boundary: tasks for 30 Nov and 1 Dec differ; reward claims on 29–30 Nov, 1 Dec read as one run (1 2 3), and 31 Dec → 1 Jan as 1 2', mo.a !== mo.b2 && mo.runs === '1,2,3,1,2' && mo.coins === '2,3', JSON.stringify(mo));
// ---------- 4. a device clock a few minutes ahead ----------
const clock = await G.ev(() => {
  gardenBuy('seed_tomato'); gardenPlant(0, 'tomato'); GD = null;
  const p = garden().growing.find(x => x.plot === 0);
  const s = { id: 'ahead1', name: 'Physics', start: Date.now() + 10 * 60000 - 25 * 60000, end: Date.now() + 10 * 60000, duration: 25 * 60000, planned: 25 * 60000 };   // logged by a device 10 minutes ahead
  S.sessions.push(s);
  const r1 = gardenReplay(), w1 = waterOf(garden().growing.find(x => x.plot === 0));
  s.end = Date.now() + 3 * 60000;   // within the 5-minute tolerance: counts now
  const r2 = gardenReplay(), w2 = waterOf(garden().growing.find(x => x.plot === 0)), marked = !!garden().growing.find(x => x.plot === 0).w.ahead1;
  const r3 = gardenReplay();
  S.sessions = S.sessions.filter(x => x.id !== 'ahead1'); S.plants = S.plants.filter(x => x.id !== p.id); GD = null; save();
  return { r1, w1, r2, w2, marked, r3 };
});
check('A block stamped 10 minutes in the future (another device’s clock) is left alone by the replay until it is within 5 minutes; then it waters once and a third replay changes nothing', clock.r1 === false && clock.w1 === 0 && clock.r2 === true && clock.w2 === 25 && clock.marked && clock.r3 === false, JSON.stringify(clock));
// ---------- 5. double-clicks ----------
const dbl = await G.ev(async () => {
  const now = Date.now();
  gardenBuy('seed_tomato'); gardenPlant(1, 'tomato'); GD = null;
  const p = garden().growing.find(x => x.plot === 1); p.w = { fill: 70 }; p.fin = 'fill'; p.fd = 25; p.m = ''; GD = null;
  const h1 = gardenHarvest(p.id), h2 = gardenHarvest(p.id), crops = garden().crops.filter(c => c.id === p.id).length;
  const c = garden().crops.find(x => x.id === p.id), pr0 = garden().produce, v = cropValue(c);
  const s1 = gardenSell(c.id), s2 = gardenSell(c.id), gain = garden().produce - pr0;
  const t = gardenTasks().find(x => x.done && !x.claimed);
  let task = 'none';
  if (t) { const a1 = gardenClaimTask(t.i), a2 = gardenClaimTask(t.i); task = [a1 > 0, a2 === 0, S.gbuys.filter(x => x.id === t.id).length].join(); }
  // Finish early twice
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  const n0 = S.sessions.length; const tm = S.timer; tm.phase = 'focus'; tm.status = 'idle'; startTimer(); tm.planned = 25 * 60000; tm.focusStartedAt = now - 10 * 60000; tm.endAt = now + 15 * 60000;
  finishPhase('early'); finishPhase('early'); const logged = S.sessions.length - n0, early = S.sessions[S.sessions.length - 1].early === 1, mins = Math.round(S.sessions[S.sessions.length - 1].duration / 60000);
  // the daily reward claimed twice at once
  S.game.claims.login = {}; G = null; const e0 = earnedAt(Date.now() + 1); openLoginDlg(); await Promise.all([claimLogin(), claimLogin()]); const e1 = earnedAt(Date.now() + 1); const claims = Object.keys(S.game.claims.login).length;
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  return { h1: !!h1, h2, crops, s1: s1 === v, s2, gain: gain === v, task, logged, early, mins, claims, coins: e1 - e0 };
});
check('Double-clicks: a harvest, a sale, a task claim, Finish early and the reward claim each happen once (second call refused, one record, paid once)', dbl.h1 && dbl.h2 === null && dbl.crops === 1 && dbl.s1 && dbl.s2 === 0 && dbl.gain && (dbl.task === 'none' || dbl.task === 'true,true,1') && dbl.logged === 1 && dbl.early && dbl.mins === 10 && dbl.claims === 1 && dbl.coins === 2, JSON.stringify(dbl));
await wait(1500); await closeDlg(G);
// ---------- 6. rapid tab switching ----------
const rapid = await G.ev(async () => {
  const tabs = ['timer', 'garden', 'stats', 'shop', 'garden', 'profile', 'bag', 'garden', 'quests', 'reminders', 'board', 'garden', 'timer'], views = ['garden', 'harvests', 'seeds', 'decor', 'almanac'];
  for (let i = 0; i < 4; i++) for (const t of tabs) { if (t === 'garden') S.ui.gardenView = views[i % views.length]; showTab(t); }
  for (const v of views) { S.ui.gardenView = v; showTab('garden'); renderGarden(); }
  S.ui.gardenView = 'garden'; showTab('garden');
  await new Promise(r => setTimeout(r, 400));
  return { active: $$('.tab.active').length, tab: S.ui.tab, scene: !!$('#gdScene'), seg: $$('#gardenSeg button').length, dialogs: document.querySelectorAll('dialog[open]').length };
});
check('Rapid tab switching (52 switches through every garden view): one active tab, the garden scene drawn, no stray dialogs, no errors', rapid.active === 1 && rapid.tab === 'garden' && rapid.scene && rapid.seg === 5 && rapid.dialogs === 0 && errs.length === 0, JSON.stringify(rapid) + ' ' + JSON.stringify(errs));
// ---------- 7. a very large history ----------
const big = await G.ev(() => {
  const now = Date.now(), ss = [], hv = [], cl = {};
  for (let d = 1; d <= 730; d++) for (let k = 0; k < 4; k++) { const end = now - d * 864e5 + k * 3 * 3600e3; ss.push({ id: 'bg' + d + '_' + k, name: 'Physics', start: end - 25 * 60000, end, duration: 25 * 60000, planned: 25 * 60000 }); }
  for (let i = 0; i < 1000; i++) hv.push({ id: 'bh' + i, v: 1, sp: ['tomato', 'sunflower', 'basil', 'pumpkin'][i % 4], plot: -1, seed: '', at: now - (1000 - i) * 3600e3 * 3, sk: 2, wt: 70, fin: 'x', fd: 25, h: now - (1000 - i) * 3600e3 * 2, y: 4 + (i % 5), m: i % 9 ? '' : 'golden', ...(i % 3 ? { sold: now - (1000 - i) * 3600e3, sv: 5 } : {}), u: now });
  for (let n = 400; n >= 1; n--) cl[dayKey(addDays(startOfDay(new Date()), -n))] = now - n * 864e5;
  S.sessions.push(...ss); S.plants.push(...hv); S.game.claims.login = cl; gardenMig().hv = now - 8e9; G = null; GD = null;
  const tm = (f, times = 3) => { let best = Infinity; for (let i = 0; i < times; i++) { const a = performance.now(); f(); best = Math.min(best, performance.now() - a); } return Math.round(best * 10) / 10; };
  const r = {};
  r.garden = tm(() => { GD = null; garden(); }); r.replay = tm(() => gardenReplay()); r.cycle = tm(() => loginCycle()); r.earned = tm(() => { G = null; earnedAt(Infinity); }); r.tasks = tm(() => gardenTasks());
  r.harvests = tm(() => { S.ui.gardenView = 'harvests'; renderGarden(); }, 2); r.almanac = tm(() => { S.ui.gardenView = 'almanac'; renderGarden(); }, 2); r.peek = tm(() => renderGardenPeek && renderGardenPeek(), 2);
  r.day = loginToday().day; r.crops = garden().crops.length; r.sessions = S.sessions.length;
  S.sessions = S.sessions.filter(x => !x.id.startsWith('bg')); S.plants = S.plants.filter(x => !x.id.startsWith('bh')); S.game.claims.login = {}; G = null; GD = null; S.ui.gardenView = 'garden'; save();
  return r;
});
check('Large history (2,900 blocks, 1,000 harvests, a 400-day reward run): garden fold < 150 ms, replay < 150 ms, reward run < 30 ms, coin ledger < 150 ms, tasks < 50 ms, Harvests tab render < 600 ms, almanac < 600 ms; Day 401 and 334 crops in the basket', big.garden < 150 && big.replay < 150 && big.cycle < 30 && big.earned < 150 && big.tasks < 50 && big.harvests < 600 && big.almanac < 600 && big.day === 401 && big.crops >= 334, JSON.stringify(big));
await G.ctx.close();
// ---------- 8. a brand-new account ----------
const N = await device('N', 1280); await signup(N, 'nw_' + R); await closeDlg(N);
const fresh = await N.ev(async () => {
  const r = { level: garden().level, plots: garden().plots, crops: garden().crops.length, day: loginToday().day, claimed: loginToday().claimed, tasks: gardenTasks().length, replay: gardenReplay(), goal: goalFor(dayKey(new Date())), log: (S.goalLog || []).length, slots: petSlots(), eggs: eggList().length, boost: xpBoostAt(Date.now()).mult };
  for (const [t, v] of [['garden', 'garden'], ['garden', 'harvests'], ['garden', 'seeds'], ['garden', 'almanac'], ['shop', null], ['profile', null], ['timer', null]]) { if (v) S.ui.gardenView = v; if (t === 'shop') S.ui.shopCat = 'boost'; showTab(t); if (v) renderGarden(); await new Promise(x => setTimeout(x, 150)); }
  r.peek = !!$('#gardenPeek') && !$('#gardenPeek').classList.contains('hidden'); r.tour = !!$('#gdDlg') && $('#gdDlg').open; r.logo = !!$('#brandBtn');
  return r;
});
check('A brand-new account: garden level 1, an empty basket, Day 1 unclaimed, three tasks, nothing to replay, goal 60 with no history, one pet slot, the first egg, no boost; every new screen renders, the peek card shows on the Timer', fresh.level === 1 && fresh.crops === 0 && fresh.day === 1 && !fresh.claimed && fresh.tasks === 3 && fresh.replay === false && fresh.goal > 0 && fresh.log === 0 && fresh.slots === 1 && fresh.eggs >= 1 && fresh.boost === 1 && fresh.peek && fresh.logo && errs.length === 0, JSON.stringify(fresh) + ' ' + JSON.stringify(errs));
await N.ctx.close();
// ---------- 9. a full v1.16 export imported into 1.17 ----------
const I = await guest(1280, { tag: 'import' });
const imp = await I.ev(() => {
  const now = Date.now(), d = n => now - n * 864e5, key = n => dayKey(addDays(startOfDay(new Date()), -n));
  const sessions = []; for (let n = 27; n >= 8; n--) sessions.push({ id: 'ex' + n, name: 'Chemistry', start: d(n) - 50 * 60000, end: d(n), duration: 50 * 60000, planned: 50 * 60000, preset: 'Classic 25/5' });   // all older than the 7-day replay window, like a backup made a week ago
  const v116 = {   // what a 1.16 backup holds: no early marks, no goalLog, plants without b/sold/fav/cp, a cyclic login run, a hatched egg, a pet out, no hv marker
    sessions, presets: [], reminders: [], todos: [], abandoned: [], revisions: [], names: ['Chemistry'],
    settings: { goalMin: 90, gamification: true },
    game: { purchases: { old1: { item: 'av_fox', price: 10, at: d(15) } }, equipped: { avatar: 'av_fox' }, claims: { login: Object.fromEntries([8, 7, 6, 5, 4, 3, 2, 1].map(n => [key(n), d(n)])), goalDays: { [key(3)]: d(3) }, achievements: {}, milestones: {}, bosses: {}, brew: {}, quests: {} }, trophies: {}, grants: {}, freezesUsed: {} },
    plants: [
      { id: 'mig1', v: 1, sum: 1, at: d(60), grown: 10, golden: 1, ripe: 4, wilted: 0, y: 60, xp: 200, u: d(60) },
      { id: 'xp1', v: 1, sp: 'tomato', plot: 0, seed: 'xs1', at: d(12), sk: 4, w: { ex12: 40, ex11: 20 }, u: d(11) },
      { id: 'xp2', v: 1, sp: 'lavender', plot: 1, seed: 'xs2', at: d(13), sk: 4, w: { ex13: 40, ex12: 40, ex11: 40 }, u: d(11) },
      { id: 'xh1', v: 1, sp: 'sunflower', plot: -1, seed: 'xs3', at: d(14), sk: 4, wt: 90, fin: 'ex12', fd: 50, h: d(10), y: 6, m: 'golden', kg: .4, u: d(10) },
      { id: 'xh2', v: 1, sp: 'basil', plot: -1, seed: 'xs4', at: d(12), sk: 4, wt: 60, fin: 'ex11', fd: 50, h: d(9), y: 4, m: '', u: d(9) },
    ],
    gbuys: [{ id: 'xs1', v: 1, item: 'seed_tomato', price: 0, at: d(5), slot: '', u: d(5) }, { id: 'xs2', v: 1, item: 'seed_lavender', price: 25, at: d(8), slot: '', u: d(8) }, { id: 'xs3', v: 1, item: 'seed_sunflower', price: 0, at: d(14), slot: '', u: d(14) }, { id: 'xs4', v: 1, item: 'seed_basil', price: 3, at: d(12), slot: '', u: d(12) }],
    eggs: [{ id: 'egg1', v: 1, kind: 'common', src: 'focus', at: d(20), need: 300, w: { ex20: 50, ex19: 50, ex18: 50, ex17: 50, ex16: 50, ex15: 50 }, h: d(15), pet: 'bunny', hs: 'ex15' }, { id: 'egg2', v: 1, kind: 'common', src: 'focus', at: d(15), need: 300, w: { ex14: 50 } }],
    // (the guest's own fresh egg1 merges with the hatched one: the hatched record wins)
    petPrefs: { p1: { v: 'bunny', u: d(14) } }, decks: [], cards: [], plan: [], roomSets: [], loadouts: [], cardPrefs: {}, exportedAt: new Date(now - 3600e3).toISOString(), version: '1.16',
  };
  const n0 = S.sessions.length, p0 = garden().produce;
  const added = mergeData(v116); G = null; GD = null; reconcileRewards('quiet'); G = null; GD = null;
  const g = garden();
  const r = { added, sessions: S.sessions.length - n0, growing: g.growing.map(p => [p.sp, waterOf(p), plantStage(p)]), crops: g.crops.map(c => c.id), produceUp: g.produce - p0, hv: !!g.hv, level: g.level,
    pets: petsOwned().map(x => x.id), out: petsOut().map(x => x.id), eggs: eggList().length, day: loginToday().day, runs: Object.values(loginCycle()).join(), goal: goalFor(dayKey(new Date())), goalOld: goalFor(key(5)), fox: isOwned('av_fox') };
  S.ui.gardenView = 'harvests'; showTab('garden'); renderGarden(); r.tab = !!$('.gd-harvests, [data-sellall]') || $('#gardenSlot').textContent.includes('Harvests');
  return r;
});
check('A v1.16 backup imports cleanly: 20 blocks, both growing plants with their XP (60 / 120, nothing replayed from a week-old backup), the two old harvests count as already sold (produce up, nothing in the basket), the bunny is owned and out, egg2 still waiting, an 8-day run → Day 9, goal 90 (no history), the old avatar kept', imp.added === 20 && imp.growing.length === 2 && imp.growing.find(x => x[0] === 'tomato')[1] === 60 && imp.growing.find(x => x[0] === 'lavender')[1] === 120 && imp.crops.length === 0 && imp.produceUp >= 10 && imp.hv && imp.pets.join() === 'bunny' && imp.out.join() === 'bunny' && imp.eggs >= 2 && imp.day === 9 && imp.runs === '1,2,3,4,5,6,7,8' && imp.goal === 90 && imp.goalOld === 90 && imp.fox && errs.length === 0, JSON.stringify(imp) + ' ' + JSON.stringify(errs));
await I.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
