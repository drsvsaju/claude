// v1.15 time and input edge cases (guest, fixed clocks): midnight (cards due, plan days, garden), the Monday rollover
// with carry-over, the month rollover (Oct→Nov: questline changes, garden season/period), time zones, double taps on
// harvest / plant / buy / grade / plan / review, rapid tab switching, very long names, a huge history (profile size,
// render times, garden history folding, the card byte budget) and a ×4 slower phone.
import { b, wait, log, check, errs, failCount } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, hasTouch: w < 500, isMobile: w < 500, ...(opts.tz ? { timezoneId: opts.tz } : {}) });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); });
  if (opts.init) await ctx.addInitScript(opts.init, opts.arg);
  if (opts.clock) await ctx.clock.install({ time: opts.clock });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  if (opts.throttle) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.throttle }); }
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)');
  if (opts.clock) await ctx.clock.runFor(2600); else await wait(2500);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  const d = { ctx, p, ev: (f, a) => p.evaluate(f, a), run: ms => opts.clock ? ctx.clock.runFor(ms) : wait(ms) };
  return d;
}
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
// ---------- 1. midnight ----------
const T0 = new Date(2026, 9, 27, 23, 59, 30);   // Tue 27 Oct 2026, 23:59:30 local
const A = await guest(1280, { clock: T0, tag: 'midnight' });
await A.ev(() => { const d = addDeck('Night', 'Physics'); const c = addCard(d.id, 'Due tomorrow', 'x'); gradeCard(c, 'good'); save(); savePlan([{ name: 'Physics', hrs: 7 }]); gardenPlant(0, 'tomato'); showTab('garden'); });
const before = await A.ev(() => ({ day: todayKey(), due: dueCards().length, left: planWeek(new Date()).daysLeft, tod: $('#gdScene') && $('#gdScene').dataset.tod, wx: $('#gdScene') && $('#gdScene').dataset.wx }));
await A.run(45000);
const after = await A.ev(() => ({ day: todayKey(), due: dueCards().length, left: planWeek(new Date()).daysLeft, badge: $('#remSeg [data-rview="cards"] .cnt') && $('#remSeg [data-rview="cards"] .cnt').textContent, today: $('#todayText') && $('#todayText').textContent, wx: $('#gdScene') && $('#gdScene').dataset.wx }));
check('Midnight: the day key moves on, the card graded "good" becomes due, the plan has one day fewer, the garden day re-renders', before.day === '2026-10-27' && after.day === '2026-10-28' && before.due === 0 && after.due === 1 && after.left === before.left - 1 && typeof after.wx === 'string', JSON.stringify({ before, after }));
await A.ctx.close();
// ---------- 2. Monday rollover with carry-over (week starts Monday) ----------
const SUN = new Date(2026, 10, 1, 23, 59, 30);   // Sun 1 Nov 2026, 23:59:30
const seedWeek = () => { const s = [], base = new Date(2026, 9, 28, 10, 0, 0).getTime(); for (let k = 0; k < 4; k++) s.push({ id: 'wk' + k, name: 'Physics', start: base + k * 36e5, end: base + k * 36e5 + 30 * 6e4, duration: 30 * 6e4, planned: 30 * 6e4, preset: 'Classic 25/5' }); localStorage.setItem('focus-app-v1', JSON.stringify({ sessions: s, plan: [{ id: 'pl1', v: 1, name: 'Physics', hrs: 6, at: new Date(2026, 9, 26).getTime(), u: new Date(2026, 9, 26).getTime() }], settings: { goalMin: 60, weekStart: 1 } })); };
const W = await guest(1280, { clock: SUN, init: seedWeek, tag: 'week' });
const sun = await W.ev(() => { const w = planWeek(new Date()), r = w.list[0] || {}; return { done: r.done, goal: r.goal, status: r.status, left: w.daysLeft, plan: S.plan.length, ws: S.settings.weekStart, sessions: S.sessions.length }; });
await W.run(45000);
const mon = await W.ev(() => { showTab('stats'); const w = planWeek(new Date()), r = w.list[0] || {}; return { done: r.done, goal: r.goal, carry: r.carry, status: r.status, left: w.daysLeft, card: !!$('#planSlot .plan-row') }; });
check('Monday rollover: last week 2 h of 6 → this week starts at 0 with the 4 h shortfall carried (goal 10 h), 7 days left, the Stats card re-rendered', sun.done === 120 && sun.goal === 360 && mon.done === 0 && mon.carry === 240 && mon.goal === 600 && mon.left === 7 && mon.card, JSON.stringify({ sun, mon }));
await W.ctx.close();
// ---------- 3. month rollover: Oct 31 → Nov 1 ----------
const OCT = new Date(2026, 10, 7, 23, 59, 30);   // the October questline runs to 7 Nov; the next one starts on the 8th
const M = await guest(1280, { clock: OCT, tag: 'month' });
await M.ev(() => { gardenPlant(0, 'tomato'); showTab('quests'); });
const oct = await M.ev(() => ({ ev: (currentEvent() || {}).id, season: gardenSeason(), month: monthKeyOf(new Date()), day: todayKey() }));
await M.run(45000);
const nov = await M.ev(() => { showTab('garden'); const g = garden(); return { ev: (currentEvent() || {}).id, season: gardenSeason(), month: monthKeyOf(new Date()), day: todayKey(), scene: !!$('#gdScene'), growing: g.growing.length, quests: !!$('#tab-quests') }; });
check('Questline rollover at midnight (7 → 8 Nov): the next questline takes over, the garden re-renders with the same plants and no errors', oct.day === '2026-11-07' && nov.day === '2026-11-08' && oct.ev === 'hw26' && nov.ev !== 'hw26' && !!nov.ev && nov.scene && nov.growing === 1, JSON.stringify({ oct, nov }));
await M.ctx.close();
// ---------- 4. time zones: the same instant in Kolkata and Los Angeles ----------
const INSTANT = Date.UTC(2026, 9, 28, 20, 30);   // 02:00 IST Thu 29 Oct · 13:30 PDT Wed 28 Oct
const tzRes = {};
for (const tz of ['Asia/Kolkata', 'America/Los_Angeles']) {
  const Z = await guest(1280, { clock: new Date(INSTANT), tz, tag: tz });
  tzRes[tz] = await Z.ev(() => { savePlan([{ name: 'Maths', hrs: 5 }]); const w = planWeek(new Date()); return { day: todayKey(), left: w.daysLeft, tod: gardenTod(), wx: gardenWeather() }; });
  await Z.ctx.close();
}
check('Time zones: the day key, plan days left and garden time of day follow the local clock; the weather is per local date', tzRes['Asia/Kolkata'].day === '2026-10-29' && tzRes['America/Los_Angeles'].day === '2026-10-28' && tzRes['Asia/Kolkata'].left === 4 && tzRes['America/Los_Angeles'].left === 5 && tzRes['Asia/Kolkata'].tod === 'night' && tzRes['America/Los_Angeles'].tod === 'day', JSON.stringify(tzRes));
// ---------- 5. double taps ----------
const D = await guest(1280, { tag: 'double' });
await D.ev(() => { gardenPlant(0, 'tomato'); const p = garden().growing[0]; p.w = { fake: 90 }; p.fin = 'fake'; p.fd = 25; GD = null; S.ui.gardenView = 'garden'; showTab('timer'); showTab('garden'); }); await wait(1000);
const plotInfo = await D.ev(() => ({ ready: garden().ready.length, plots: $$('.gd-plot').length, has: $$('.gd-plot.has').length, pid: $('.gd-plot.has') && $('.gd-plot.has').dataset.pid }));
const dh = await D.ev(() => { const y0 = garden().produce; const plot = $('.gd-plot.ready'); plot.click(); plot.click(); const g = garden(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); return { harvested: g.harvested.length, produce: g.produce, y0, once: g.produce === y0 && g.crops.length === 1, growing: g.growing.length }; });   // 1.17: the crop waits in the Harvests basket, produce unchanged
check('Harvest tapped twice: one harvest, one crop in the basket (1.17), produce unchanged', dh.harvested === 1 && dh.once && dh.growing === 0, JSON.stringify({ dh, plotInfo }));
const dp = await D.ev(() => { const a = gardenPlant(1, 'tomato'), b = gardenPlant(1, 'tomato'); return { a: !!a, b: !!b, inPlot: garden().plants.filter(p => !p.h && p.plot === 1).length, seedsLeft: (garden().seeds.tomato || []).length }; });
check('Planting twice into the same plot: the second attempt is refused, one seed used', dp.a && !dp.b && dp.inPlot === 1, JSON.stringify(dp));
const db = await D.ev(() => { const g0 = garden(); const price = GSP_BY_ID.basil.price; const sum = gardenMig(); sum.y = (+sum.y || 0) + price + 1 - g0.produce; GD = null; const r1 = gardenBuy('seed_basil'), r2 = gardenBuy('seed_basil'); const g = garden(); return { price, r1, r2, bought: S.gbuys.filter(x => x.item === 'seed_basil').length, produce: g.produce, neg: g.produce < 0, lvlOk: g0.level >= GSP_BY_ID.basil.lvl }; });
check('Buying twice with produce for one: one purchase, the balance never negative', (!db.lvlOk || (db.r1 && !db.r2 && db.bought === 1)) && !db.neg, JSON.stringify(db));
await D.ev(() => { const d = addDeck('Dbl', 'Physics'); for (let i = 0; i < 3; i++) addCard(d.id, 'Q' + i, 'A' + i); save(); showTab('reminders'); S.ui.remView = 'cards'; renderCards(); startReview(d.id); startReview(d.id); });
await wait(400);
const dr = await D.ev(() => ({ open: $$('dialog[open]').length, q: RV.q.length, i: RV.i }));
await D.ev(() => { $('#fcDlg [data-cdflip]').click(); }); await wait(400);
const dg = await D.ev(() => { const btn = $('#fcDlg [data-cdgrade="good"]'); btn.click(); btn.click(); return { i: RV.i, reps: S.cards.map(c => c.reps).reduce((a, x) => a + x, 0), done: RV.done }; });
check('Review started twice: one dialog; grade tapped twice: one card advanced, one rep recorded', dr.open === 1 && dr.q === 3 && dr.i === 0 && dg.i === 1 && dg.reps === 1 && dg.done === 1, JSON.stringify({ dr, dg }));
await D.ev(() => closeReview());
const dpl = await D.ev(() => { savePlan([{ name: 'Physics', hrs: 4 }, { name: 'physics ', hrs: 9 }]); savePlan([{ name: 'Physics', hrs: 4 }]); return { n: S.plan.length, names: S.plan.map(p => p.name) }; });
check('Plan saved twice (and a duplicate subject differing only in case/space): one subject', dpl.n === 1 && dpl.names[0] === 'Physics', JSON.stringify(dpl));
const drs = await D.ev(() => { saveRoomSet('Twice'); saveRoomSet('Twice'); return { n: S.roomSets.length, ids: new Set(S.roomSets.map(r => r.id)).size }; });
check('Saving a room twice makes two separate saved rooms with distinct ids (allowed, up to 6)', drs.n === 2 && drs.ids === 2, JSON.stringify(drs));
// ---------- 6. rapid tab switching ----------
const rt = await D.ev(() => { const tabs = ['timer', 'reminders', 'stats', 'garden', 'quests', 'profile', 'friends', 'clan', 'board', 'shop', 'bag', 'room', 'settings', 'about']; const a = performance.now(); for (let i = 0; i < 80; i++) showTab(tabs[i % tabs.length]); showTab('garden'); return { ms: Math.round(performance.now() - a), tab: S.ui.tab, active: $$('.tab.active').length, trail: $$('#ringTrail .tp').length }; });
check('80 tab switches in a row: one active tab, no errors, under 4 s', rt.active === 1 && rt.tab === 'garden' && rt.ms < 4000 && rt.trail <= 36, JSON.stringify(rt));
await D.ctx.close();
// ---------- 7. very long names at 360px ----------
const L = await guest(360, { tag: 'long' });
const ln = await L.ev(() => { const d = addDeck('D'.repeat(200), 'S'.repeat(80)); const c = addCard(d.id, 'Q'.repeat(1000), 'A'.repeat(2000)); savePlan([{ name: 'P'.repeat(100), hrs: 3 }]); saveRoomSet('R'.repeat(100)); save(); return { deck: d.name.length, subj: d.subject.length, f: c.f.length, b: c.b.length, plan: S.plan[0].name.length, set: S.roomSets[0].name.length }; });
check('Long names are capped: deck 60, subject 30, card 300/600, plan subject 40, saved room 24', ln.deck === 60 && ln.subj === 30 && ln.f === 300 && ln.b === 600 && ln.plan === 40 && ln.set === 24, JSON.stringify(ln));
const wide = {};
for (const [name, fn] of [['cards', () => { showTab('reminders'); S.ui.remView = 'cards'; renderRemSeg(); renderCards(); }], ['review', () => { startReview(S.decks[0].id); }], ['stats', () => { closeReview(); showTab('stats'); }], ['room', () => showTab('room')], ['garden', () => { S.ui.gardenView = 'almanac'; showTab('garden'); }]]) {
  await L.ev(`(${fn.toString()})()`); await wait(500);
  wide[name] = await L.ev(() => { const root = [...document.querySelectorAll('dialog[open]')].pop() || document.querySelector('.tab.active'); let out = 0, first = ''; const clipped = el => { for (let a = el.parentElement; a && a !== root; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') return true; } return false; }; for (const el of root.querySelectorAll('*')) { const r = el.getBoundingClientRect(); if (r.width && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('#ringTrail') && !clipped(el)) { out++; if (!first) first = el.tagName + '.' + el.className + ' ' + Math.round(r.right) + 'px: ' + el.textContent.trim().slice(0, 30); } } return { page: document.documentElement.scrollWidth <= innerWidth + 1, out, first }; });
}
check('At 360px nothing sticks out and the page never scrolls sideways with those names', Object.values(wide).every(w => w.page && w.out === 0), JSON.stringify(wide));
await L.ctx.close();
// ---------- 8. a huge history: profile size, render times, history folding, card budget ----------
const seedBig = () => {
  const now = Date.now(), sessions = [], subjects = ['Physics', 'Maths', 'Chemistry', 'English', 'Biology'];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let d = 1; d <= 750; d++) for (let k = 0; k < 4; k++) { const st = now - d * 864e5 + (9 + k * 3) * 3600e3, mins = [25, 50, 90][Math.floor(rnd() * 3)]; sessions.push({ id: 's' + d + '_' + k, name: subjects[(d + k) % 5], start: st, end: st + mins * 60000, duration: mins * 60000, planned: mins * 60000, preset: 'Classic 25/5' }); }
  const sp = ['tomato', 'sunflower', 'carrot', 'pumpkin', 'rose', 'strawberry', 'chilli', 'lavender'];
  const plants = [{ id: 'mig1', v: 1, sum: 1, at: now - 600 * 864e5, grown: 50, golden: 3, ripe: 20, wilted: 2, y: 40, xp: 345, u: now - 600 * 864e5 }], gbuys = [];
  for (let k = 0; k < 16; k++) { const w = {}; for (let j = 0; j < 20; j++) w['s' + (j + 1) + '_' + (k % 4)] = 25; gbuys.push({ id: 'g' + k, v: 1, item: 'seed_' + sp[k % 8], price: 0, at: now - (40 - k) * 864e5, slot: '', u: now - 864e5 }); plants.push({ id: 'p' + k, v: 1, sp: sp[k % 8], plot: k, seed: 'g' + k, at: now - (40 - k) * 864e5, sk: 5, w, u: now - 864e5 }); }
  for (let k = 0; k < 560; k++) { const at = now - (580 - k) * 864e5; gbuys.push({ id: 'h' + k, v: 1, item: 'seed_' + sp[k % 8], price: k % 4 ? 0 : 6, at: at - 36e5, slot: '', u: at }); plants.push({ id: 'hp' + k, v: 1, sp: sp[k % 8], plot: -1, seed: 'h' + k, at: at - 36e5, sk: 4, wt: 120, fin: 's1_0', fd: 50, h: at, y: 8 + (k % 5), m: k % 11 ? '' : 'golden', u: at }); }
  gbuys.push({ id: 'dec1', v: 1, item: 'dc_gnome', price: 8, at: now - 500 * 864e5, slot: 's1', u: now - 500 * 864e5 }, { id: 'dec2', v: 1, item: 'dc_fence_wood', price: 10, at: now - 200 * 864e5, slot: 'border', u: now - 200 * 864e5 });
  const decks = [], cards = []; for (let d = 0; d < 60; d++) decks.push({ id: 'd' + d, v: 1, name: 'Deck ' + d, subject: subjects[d % 5], at: now - 30 * 864e5, u: now - 30 * 864e5 });
  for (let k = 0; k < 2000; k++) cards.push({ id: 'c' + k, v: 1, deck: 'd' + (k % 60), f: 'Question ' + k + ' on a topic', b: 'Answer ' + k + ' in a line', at: now - 20 * 864e5, u: now - 20 * 864e5, due: '', ivl: 1, ease: 2.5, reps: 2 });
  const plan = []; for (let k = 0; k < 20; k++) plan.push({ id: 'pl' + k, v: 1, name: 'Subject ' + k, hrs: 3, at: now - 10 * 864e5, u: now - 10 * 864e5 });
  localStorage.setItem('focus-app-v1', JSON.stringify({ sessions, plants, gbuys, decks, cards, plan, settings: { goalMin: 120 } }));
};
const H = await guest(1280, { init: seedBig, tag: 'big' });
const big = await H.ev(() => { const t = {}; let a = performance.now(); const g = garden(); t.garden = Math.round(performance.now() - a); a = performance.now(); showTab('garden'); t.renderGarden = Math.round(performance.now() - a); a = performance.now(); showTab('reminders'); S.ui.remView = 'cards'; renderCards(); t.renderCards = Math.round(performance.now() - a); a = performance.now(); showTab('stats'); t.renderStats = Math.round(performance.now() - a); a = performance.now(); const pj = JSON.stringify(profileFromState()); t.profileJSON = Math.round(performance.now() - a); return { ...t, bytes: pj.length, cardBytes: cardsBytes(), sessions: S.sessions.length, harvested: g.harvested.length, produce: g.produce, level: g.level, placed: Object.keys(g.placed).length, invalid: g.invalid.length }; });
check('Huge history (3,000 sessions, 2,000 cards, 60 decks, 576 harvests, 16 growing): profile document under 600 KB (Firestore allows 1 MiB), every render under 400 ms', big.bytes < 600000 && big.renderGarden < 400 && big.renderCards < 400 && big.renderStats < 400 && big.profileJSON < 200, JSON.stringify(big));
const beforeFold = await H.ev(() => { const g = garden(); return { produce: g.produce, level: g.level, xp: g.xp, harvestsN: g.harvestsN, muts: g.muts, placed: Object.keys(g.placed).sort(), discovered: g.discovered.size, species: [...g.harvSpecies].sort(), n: g.harvested.length, buys: S.gbuys.length, fold: !!g.fold }; });
await H.ev(() => { const p = garden().growing[0]; p.w = { fake: 9999 }; p.fin = 'fake'; p.fd = 25; GD = null; gardenHarvest(p.id); });
const afterFold = await H.ev(() => { const g = garden(); return { produce: g.produce, level: g.level, xp: g.xp, harvestsN: g.harvestsN, muts: g.muts, placed: Object.keys(g.placed).sort(), discovered: g.discovered.size, species: [...g.harvSpecies].sort(), n: g.harvested.length, buys: S.gbuys.length, fold: g.fold ? { grown: g.fold.grown, golden: g.fold.golden, y: g.fold.y, spent: g.fold.spent, sp: Object.keys(g.fold.sp).length } : null, settled: S.gbuys.filter(b => b.ok).length, invalid: g.invalid.length, tomb: Object.keys(S.tomb).filter(k => k.startsWith('plants:')).length }; });
const lastY = await H.ev(() => garden().harvested[garden().harvested.length - 1].y);
check('A harvest past 500 folds the oldest into one record: the newest 300 stay, counts / mutations / species / XP / placed decor unchanged, produce unchanged (the crop waits in the basket, 1.17)', !beforeFold.fold && afterFold.fold && afterFold.n === 300 && afterFold.fold.grown === beforeFold.n + 1 - 300 && afterFold.harvestsN === beforeFold.harvestsN + 1 && afterFold.produce === beforeFold.produce && afterFold.xp > beforeFold.xp && afterFold.level >= beforeFold.level && JSON.stringify(afterFold.muts.golden) === JSON.stringify(beforeFold.muts.golden) && JSON.stringify(afterFold.placed) === JSON.stringify(beforeFold.placed) && afterFold.discovered === beforeFold.discovered && JSON.stringify(afterFold.species) === JSON.stringify(beforeFold.species) && afterFold.buys < beforeFold.buys && afterFold.invalid === 0 && afterFold.tomb >= beforeFold.n + 1 - 300, JSON.stringify({ beforeFold, afterFold, lastY }));
const pj2 = await H.ev(() => { const p = profileFromState(); return { bytes: JSON.stringify(p).length, plants: p.plants.length, gbuys: p.gbuys.length, fold: p.plants.some(x => x.id === 'fold1' && x.sum && x.fold) }; });
check('After the fold the profile document is smaller and carries the fold record', pj2.bytes < big.bytes && pj2.fold && pj2.plants <= 320, JSON.stringify(pj2));
const budget = await H.ev(() => { const d = S.decks[0].id; S.cards = S.cards.slice(0, 1500); const n0 = S.cards.length, b0 = cardsBytes(); let added = 0; for (let i = 0; i < 400; i++) { if (addCard(d, 'F'.repeat(300), 'B'.repeat(600))) added++; else break; } const full = cardsBytes(); const r = editCard(S.cards[0].id, 'F'.repeat(300), 'B'.repeat(600)); const small = editCard(S.cards[0].id, 'short', 'short'); return { n0, b0, added, full, refusedAt: full <= 320000 && full > 300000, editRefused: r === false, smallOk: small === true, max: S.cards.length <= 2000 }; });
check('Card byte budget: adding 900-char cards stops once ~320 KB is reached (never over), a growing edit is then refused, a shrinking one allowed', budget.refusedAt && budget.added > 0 && budget.added < 400 && budget.editRefused && budget.smallOk && budget.max, JSON.stringify(budget));
await H.ctx.close();
// ---------- 9. a ×4 slower phone with that history ----------
const P = await guest(390, { init: seedBig, tag: 'phone', throttle: 4 });
const ph = await P.ev(async () => { const t = {}; let a = performance.now(); showTab('garden'); t.garden = Math.round(performance.now() - a); a = performance.now(); showTab('room'); t.room = Math.round(performance.now() - a); a = performance.now(); showTab('reminders'); S.ui.remView = 'cards'; renderCards(); t.cards = Math.round(performance.now() - a); a = performance.now(); showTab('stats'); t.stats = Math.round(performance.now() - a); showTab('garden'); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); const frames = []; let last = performance.now(); await new Promise(res => { const t0 = performance.now(); const step = () => { const now = performance.now(); frames.push(now - last); last = now; if (now - t0 < 1500) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); frames.shift(); frames.sort((x, y) => x - y); t.p95 = Math.round(frames[Math.floor(frames.length * .95)]); t.long = frames.filter(f => f > 100).length; $('#resetBtn').click(); return t; });
check('×4 slower phone: Garden, room, cards and Stats each open in under 1.2 s; 95% of frames under 250 ms while the timer runs on the Garden', ph.garden < 1200 && ph.room < 1200 && ph.cards < 1200 && ph.stats < 1200 && ph.p95 < 250, JSON.stringify(ph));
await P.ctx.close();
log('errors', errs);
log(`${failCount()} failed`);
await b.close();
process.exit(failCount() || errs.length ? 1 : 0);
