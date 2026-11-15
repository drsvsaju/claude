// v1.16 rotating seed shop: rotation per 4-hour UTC slot and per UTC day (deterministic, the same in every time zone),
// countdowns and the re-render at a slot boundary, featured prices and the one-level-early rule, exclusives only in the
// rotating slots, the daily limit (from stored purchases, so it holds on a second device), gift seeds at garden levels
// 6 / 8 / 9 (created once), the restock dot (off during focus, off by setting), export/import, demo, two devices.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, ownerGet } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, hasTouch: w < 500, isMobile: w < 500, ...(opts.tz ? { timezoneId: opts.tz } : {}), acceptDownloads: true });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); });
  if (opts.init) await ctx.addInitScript(opts.init, opts.arg);
  if (opts.clock) await ctx.clock.install({ time: opts.clock });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); if (opts.clock) await ctx.clock.runFor(2600); else await wait(2500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a), run: ms => opts.clock ? ctx.clock.runFor(ms) : wait(ms), jump: async ms => { if (opts.clock) { await ctx.clock.fastForward(ms); await ctx.clock.runFor(1500); } else await wait(ms); } };
}
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
// ---------- 1. determinism of the rotation (pure functions, fixed clock) ----------
const T0 = Date.UTC(2026, 10, 2, 10, 15);   // Mon 2 Nov 2026 10:15 UTC (slot boundary at 12:00 UTC; day boundary at 00:00 UTC)
const G = await guest(1280, { clock: new Date(T0), tag: 'rot' });
const rot = await G.ev(T0 => {
  const ids = t => featuredSeeds(t).map(s => s.id), H = 3600e3;
  const sameSlot = JSON.stringify(ids(T0)) === JSON.stringify(ids(T0 + 90 * 60e3));
  const slots = Array.from({ length: 12 }, (_, i) => ids(T0 + i * 4 * H));
  const distinctSlots = new Set(slots.map(x => x.join(','))).size;
  const four = slots.every(x => x.length === 4 && new Set(x).size === 4 && x.every(id => GSP_BY_ID[id].price > 0) && x.some(id => GSP_BY_ID[id].rarity !== 'common'));
  const days = Array.from({ length: 9 }, (_, i) => dailySeed(T0 + i * 864e5).id);
  const excl = seedExclusives().map(s => s.id), exclSeen = excl.filter(id => days.includes(id));
  const dayBoundary = dailySeed(Date.UTC(2026, 10, 2, 23, 59)).id !== dailySeed(Date.UTC(2026, 10, 3, 0, 1)).id || seedDayN(Date.UTC(2026, 10, 2, 23, 59)) + 1 === seedDayN(Date.UTC(2026, 10, 3, 0, 1));
  const everyThird = Array.from({ length: 9 }, (_, i) => seedDayN(T0 + i * 864e5) % 3 === 0 ? excl.includes(dailySeed(T0 + i * 864e5).id) : !excl.includes(dailySeed(T0 + i * 864e5).id));
  return { sameSlot, distinctSlots, four, days, exclSeen: exclSeen.length, excl: excl.length, dayBoundary, everyThird: everyThird.every(Boolean), nonCommonDaily: days.every(id => GSP_BY_ID[id].rarity !== 'common'), key: seedDayKey(T0), slot: seedSlot(T0) };
}, T0);
check('Featured seeds: 4 distinct paid seeds per 4-hour UTC slot (≥ 1 rare+), the same within a slot, changing between slots', rot.sameSlot && rot.four && rot.distinctSlots >= 10, JSON.stringify(rot));
check('Rare seed of the day: changes at 00:00 UTC, never common, every third day an exclusive — all 3 exclusives appear within 9 days', rot.dayBoundary && rot.nonCommonDaily && rot.everyThird && rot.exclSeen === rot.excl && rot.excl === 3 && rot.key === '2026-11-02', JSON.stringify(rot));
// ---------- 2. the shop view, countdowns, the slot boundary ----------
await G.ev(() => { S.ui.gardenView = 'seeds'; showTab('garden'); });
const view = await G.ev(() => ({ secs: $$('.gd-shop-sec').length, feat: $$('.gd-feat .gd-item').map(e => e.dataset.id.slice(5)), featIds: featuredSeeds().map(s => s.id), daily: $('.gd-daily .gd-item').dataset.id.slice(5), dailyId: dailySeed().id, always: $$('.gd-shop-sec:last-child .gd-item').length, species: GSPECIES.length, excl: $$('.gd-shop-sec:last-child .gd-item.excl').length, restock: $('[data-restock="slot"]').textContent, dailyIn: $('[data-restock="daily"]').textContent, off: $$('.gd-feat .tag.off').length, seen: localStorage.getItem('pomodorolist-seedslot'), slot: String(seedSlot()), unlock: GSPECIES.filter(s => s.shop).some(s => gardenNextUnlock({ next: 1, level: s.lvl - 1, plots: 4 }).includes(s.name)) }));
check('The Seeds view shows Featured (the slot’s 4, −20% tags), the Rare seed of the day and Always available (every non-exclusive species); countdowns point at 12:00 UTC and midnight UTC', view.secs === 3 && JSON.stringify(view.feat) === JSON.stringify(view.featIds) && view.daily === view.dailyId && view.always === view.species - 5 && view.excl === 0 && view.restock === '1h 45m' && view.dailyIn === '13h 45m' && view.off === 4 && view.seen === view.slot && !view.unlock, JSON.stringify(view));
await G.run(61e3);
const tick = await G.ev(() => $('[data-restock="slot"]').textContent);
check('The countdown ticks (a minute later it reads 1h 44m)', tick === '1h 44m', tick);
await G.jump(105 * 60e3);   // past 12:00 UTC
const next = await G.ev(() => ({ feat: $$('.gd-feat .gd-item').map(e => e.dataset.id.slice(5)), featIds: featuredSeeds().map(s => s.id), restock: $('[data-restock="slot"]').textContent, seen: localStorage.getItem('pomodorolist-seedslot'), slot: String(seedSlot()) }));
check('At the slot boundary the shop re-renders with the new Featured set and the seen slot moves on', JSON.stringify(next.feat) === JSON.stringify(next.featIds) && JSON.stringify(next.feat) !== JSON.stringify(view.feat) && next.seen === next.slot && /^3h 5[0-9]m$/.test(next.restock), JSON.stringify(next));
// ---------- 3. buying: featured price and one level early, exclusives, the daily limit ----------
const buy = await G.ev(() => {
  const g0 = garden(); const mig = gardenMig(); mig.y = (+mig.y || 0) + 1000 - g0.produce; GD = null;   // 1,000 produce, level 1
  const feat = featuredSeeds(), daily = dailySeed();
  const early = feat.find(s => s.lvl === 2) || null, tooHigh = feat.find(s => s.lvl >= 3) || null;
  const r = {};
  if (early) { r.early = gardenBuy('seed_' + early.id, 'feat'); r.earlyPrice = S.gbuys[S.gbuys.length - 1].price; r.earlyExp = featPrice(early); r.earlySrc = S.gbuys[S.gbuys.length - 1].src; }
  if (tooHigh) r.tooHigh = gardenBuy('seed_' + tooHigh.id, 'feat');
  r.exclPlain = gardenBuy('seed_bamboo');
  r.notFeat = gardenBuy('seed_' + GSPECIES.find(s => !feat.some(f => f.id === s.id) && !s.shop && s.price > 0).id, 'feat');
  mig.xp = 12000; GD = null;   // top garden level: the daily seed is never level-locked from here on
  r.d1 = gardenBuy('seed_' + daily.id, 'daily'); r.d2 = gardenBuy('seed_' + daily.id, 'daily'); r.d3 = gardenBuy('seed_' + daily.id, 'daily');
  const db = S.gbuys.filter(x => x.src === 'daily');
  r.dailyRecs = db.length; r.dailyDay = db.every(x => x.day === seedDayKey()); r.dailyPrice = db.every(x => x.price === daily.price);
  renderGarden(); r.soldOut = $('.gd-daily .btn').textContent; r.left = ($('.gd-daily .tag.off') || {}).textContent;
  r.produce = garden().produce; r.spent = 1000 - r.produce; r.expSpent = (early ? featPrice(early) : 0) + 2 * daily.price;
  r.seeds = Object.keys(garden().seeds);
  return r;
});
check('Featured: 20% off and one level early (a level-2 seed at level 1 buys; a level-3 one does not); an exclusive cannot be bought from the plain grid; a non-featured seed cannot use the featured price', (buy.early === undefined || (buy.early && buy.earlyPrice === buy.earlyExp && buy.earlySrc === 'feat')) && (buy.tooHigh === undefined || buy.tooHigh === false) && buy.exclPlain === false && buy.notFeat === false, JSON.stringify(buy));
check('Rare seed of the day: two buys, the third refused; purchases carry the UTC day; the card says Sold out; produce spent exactly', buy.d1 && buy.d2 && !buy.d3 && buy.dailyRecs === 2 && buy.dailyDay && buy.dailyPrice && /Sold out/.test(buy.soldOut) && buy.spent === buy.expSpent && buy.produce >= 0, JSON.stringify(buy));
await G.jump(12 * 3600e3);   // past 00:00 UTC
const nextDay = await G.ev(() => { renderGarden(); return { bought: dailyBought(), daily: dailySeed().id, left: ($('.gd-daily .tag.off') || {}).textContent, btn: $('.gd-daily .btn').textContent, key: seedDayKey() }; });
check('After midnight UTC the limit resets and the daily seed changes', nextDay.bought === 0 && nextDay.daily !== buy.dailyId && /2 left/.test(nextDay.left) && nextDay.btn === 'Buy' && nextDay.key === '2026-11-03', JSON.stringify(nextDay));
// ---------- 4. gift seeds at levels 6, 8, 9 — created once ----------
const gifts = await G.ev(() => { const mig = gardenMig(); S.gbuys = S.gbuys.filter(x => x.src !== 'gift'); mig.xp = 2300; GD = null; const a = gardenGifts(); const b = gardenGifts(); mig.xp = 9100; GD = null; const c = gardenGifts(); const d = gardenGifts(); return { lvl6: a, again: b, lvl9: c, again2: d, ids: S.gbuys.filter(x => x.src === 'gift').map(x => x.id + ':' + x.item).sort(), level: garden().level, seeds: ['bamboo', 'pineapple', 'sakura'].map(sp => (garden().seeds[sp] || []).length) }; });
check('Garden level 6 gifts a Bamboo seed, level 9 adds Pineapple and Sakura; running again creates nothing more', gifts.lvl6 === 1 && gifts.again === 0 && gifts.lvl9 === 2 && gifts.again2 === 0 && gifts.ids.join() === 'gift_lv6:seed_bamboo,gift_lv8:seed_pineapple,gift_lv9:seed_sakura' && gifts.level >= 9 && gifts.seeds.join() === '1,1,1', JSON.stringify(gifts));
// ---------- 5. the restock dot ----------
await G.ev(() => { S.ui.gardenView = 'seeds'; renderGarden(); });
const dot0 = await G.ev(() => { updateGardenDot(); return { hidden: $('#gardenDot').classList.contains('hidden'), restocked: seedRestocked() }; });
await G.ev(() => showTab('timer'));   // not looking at the shop when it restocks
await G.jump(4 * 3600e3 + 60e3);
const dot1 = await G.ev(() => { showTab('timer'); updateGardenDot(); return { hidden: $('#gardenDot').classList.contains('hidden'), restocked: seedRestocked() }; });
const dotFocus = await G.ev(() => { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); updateGardenDot(); const h = $('#gardenDot').classList.contains('hidden'); $('#resetBtn').click(); return h; });
const dotOff = await G.ev(() => { S.settings.shopDot = false; updateGardenDot(); const h = $('#gardenDot').classList.contains('hidden'); S.settings.shopDot = true; return h; });
const dotSeen = await G.ev(() => { S.ui.gardenView = 'seeds'; showTab('garden'); updateGardenDot(); return $('#gardenDot').classList.contains('hidden'); });
check('Restock dot: off after looking at the shop, on once a new slot has come, never during a focus block, off by setting, off again after looking', dot0.hidden && !dot0.restocked && !dot1.hidden && dot1.restocked && dotFocus && dotOff && dotSeen, JSON.stringify({ dot0, dot1, dotFocus, dotOff, dotSeen }));
check('A ready plant still shows the dot regardless of the setting', await G.ev(() => { S.settings.shopDot = false; gardenPlant(0, 'bamboo'); const p = garden().growing[0]; p.w = { x: 9999 }; GD = null; updateGardenDot(); const on = !$('#gardenDot').classList.contains('hidden'); S.settings.shopDot = true; return on; }));
// ---------- 6. export / import ----------
const [dl] = await Promise.all([G.p.waitForEvent('download'), G.ev(() => $('#exportBtn').click())]);
const path = new URL('./backup-116a.json', import.meta.url).pathname; await dl.saveAs(path);
const json = JSON.parse(fs.readFileSync(path, 'utf8'));
const F = await guest(1280, { tag: 'import' });
await F.p.setInputFiles('#importFile', path); await F.run(2500); await closeAll(F);
const imp = await F.ev(() => ({ daily: S.gbuys.filter(x => x.src === 'daily' && x.day).length, gifts: S.gbuys.filter(x => x.src === 'gift').length, feat: S.gbuys.filter(x => x.src === 'feat').length, bought: dailyBought(), produce: garden().produce, neg: garden().produce < 0 }));
check('Export carries the daily/featured/gift purchases with their day keys; a fresh install imports them (the day’s limit counts them)', json.gbuys.some(x => x.src === 'daily' && x.day) && imp.daily === 2 && imp.gifts === 3 && !imp.neg, JSON.stringify(imp));
await F.ctx.close();
// ---------- 7. time zones: the same instant, the same shop ----------
const tz = {};
for (const z of ['Asia/Kolkata', 'America/Los_Angeles']) { const Z = await guest(1280, { clock: new Date(T0), tz: z, tag: z }); tz[z] = await Z.ev(() => ({ feat: featuredSeeds().map(s => s.id).join(), daily: dailySeed().id, key: seedDayKey(), in: fmtCountdown(untilRestock()) })); await Z.ctx.close(); }
check('Kolkata and Los Angeles see the same Featured set, the same daily seed, the same UTC day key and the same countdown at the same instant', JSON.stringify(tz['Asia/Kolkata']) === JSON.stringify(tz['America/Los_Angeles']), JSON.stringify(tz));
await G.ctx.close();
// ---------- 8. demo ----------
const D = await guest(1280, { noLogin: true, tag: 'demo' });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeAll(D);
const demo = await D.ev(() => { S.ui.gardenView = 'seeds'; showTab('garden'); return { pv: isPreview(), bought: dailyBought(), left: ($('.gd-daily .tag.off') || {}).textContent, ls: Object.keys(localStorage).length, feat: $$('.gd-feat .gd-item').length }; });
await D.ev(() => $('.gd-feat .btn.buy:not([disabled])') && $('.gd-feat .btn.buy:not([disabled])').click()); await wait(400);
const demo2 = await D.ev(() => ({ prompt: !!document.querySelector('dialog[open] #pvWhy'), buys: S.gbuys.length, ls: Object.keys(localStorage).length }));
check('Demo: one rare seed already bought today (1 left), Featured shown; buying shows the demo prompt and writes nothing', demo.pv && demo.bought === 1 && /1 left/.test(demo.left) && demo.feat === 4 && demo2.prompt && demo2.ls === demo.ls, JSON.stringify({ demo, demo2 }));
await D.ctx.close();
// ---------- 9. two devices: the same shop, the daily limit counted on both ----------
const U = 'ss_' + Date.now().toString(36).slice(-4);
const A = await device('A', 1200); await signup(A, U);
const uid = await A.ev(() => USER.uid);
const B = await device('B', 1200);
await B.p.goto('http://localhost:8000/index.html?emulator=1'); await B.p.waitForSelector('#authView:not(.hidden)'); await B.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', U); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit'); await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(B);
const same = await Promise.all([A, B].map(d => d.ev(() => featuredSeeds().map(s => s.id).join() + '|' + dailySeed().id)));
check('Two devices show the same Featured seeds and the same rare seed of the day', same[0] === same[1], same.join(' vs '));
const aBuy = await A.ev(() => { const mig = gardenMig(); mig.y = 500; mig.xp = 12000; GD = null; save(); return [gardenBuy('seed_' + dailySeed().id, 'daily'), gardenBuy('seed_' + dailySeed().id, 'daily')]; });
const onB = await until(B, () => dailyBought() === 2, null, 20000);
const bBuy = await B.ev(() => ({ bought: dailyBought(), third: gardenBuy('seed_' + dailySeed().id, 'daily'), total: S.gbuys.filter(x => x.src === 'daily').length }));
const cloud = await ownerGet('users/' + uid);
check('A buys today’s two rare seeds → B counts them (a third is refused there too); the records with day keys are in the profile document', aBuy[0] && aBuy[1] && onB >= 0 && bBuy.bought === 2 && bBuy.third === false && bBuy.total === 2 && cloud && cloud.gbuys.filter(x => x.src === 'daily' && x.day).length === 2, JSON.stringify(bBuy));
await A.ctx.close(); await B.ctx.close();
log('errors', errs);
log(`${failCount()} failed`);
await b.close();
process.exit(failCount() || errs.length ? 1 : 0);
