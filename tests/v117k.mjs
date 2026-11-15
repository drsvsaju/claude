// v1.17 Phase 6 — regression tests for the independent review's findings: a sale survives a merge with a newer unsold
// copy, the produce flyer and the fireflies have their own classes, the gift day never hands out a boost, import keeps
// the goal history and the Finish-early mark, compost is plant XP only, a replayed block skips eggs laid after it,
// late plants get the share of their time, the boost card has an icon, a harvest is never "before the basket marker".
import { b, wait, log, check, errs, failCount } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 } });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); localStorage.setItem('pomodorolist-tips-seen', JSON.stringify(['stats', 'reminders', 'quests', 'shop', 'friends', 'board', 'profile', 'settings', 'garden', 'room'])); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const G = await guest(1280, { tag: 'review' });
await G.ev(() => { S.settings.gardenTour = 1; save(); });
// 1. a sale is final across devices
const m = await G.ev(() => {
  const base = { id: 'x1', v: 1, sp: 'tomato', plot: -1, seed: '', at: 1, sk: 0, wt: 70, fin: 'f', fd: 25, h: 100, y: 8, m: '' };
  const sold = { ...base, sold: 200, sv: 9, u: 300 }, fav = { ...base, fav: 1, u: 400 }, comp = { ...base, cp: 150, u: 500 }, sold2 = { ...base, sold: 250, sv: 11, u: 600 };
  const a = mergePlant(fav, sold), b2 = mergePlant(sold, fav), c = mergePlant(comp, sold), d = mergePlant(sold2, sold), e = mergePlant(fav, base), f = mergePlant(comp, fav);
  return { a: [a.sold, a.sv, a.fav], b: [b2.sold, b2.sv, b2.fav], c: [c.sold, c.sv, c.cp], d: [d.sold, d.sv], e: [e.fav, e.sold], f: [f.cp, f.fav, f.sold] };
});
check('mergePlant: a newer unsold / favourite copy keeps the older sale (sold 200, sv 9, no favourite) whichever side wins; the earliest of a sale and a compost wins; two sales keep the earliest; plain copies unchanged', JSON.stringify(m) === JSON.stringify({ a: [200, 9, undefined], b: [200, 9, undefined], c: [undefined, undefined, 150], d: [200, 9], e: [1, undefined], f: [150, undefined, undefined] }), JSON.stringify(m));
// 2. the flyer and the fireflies
const fly = await G.ev(() => {
  gardenBuy('seed_tomato'); gardenPlant(0, 'tomato'); GD = null; showTab('garden');
  S.settings.motion = 'full';
  const d = document.createElement('div'); d.className = 'gd-fly'; d.textContent = '+5'; document.body.appendChild(d); const cs = getComputedStyle(d); const r = { pos: cs.position, w: Math.round(d.getBoundingClientRect().width), op: cs.opacity, anim: cs.animationName }; d.remove();
  const f = document.createElement('i'); f.className = 'gd-firefly'; document.body.appendChild(f); const c2 = getComputedStyle(f); r.ff = { pos: c2.position, w: Math.round(f.getBoundingClientRect().width), anim: c2.animationName }; f.remove();
  return r;
});
check('The produce flyer is a fixed, visible pill (not a 5px invisible firefly) and the fireflies keep their own absolute 5px animated class', fly.pos === 'fixed' && fly.w > 20 && fly.op === '1' && fly.anim === 'none' && fly.ff.pos === 'absolute' && fly.ff.w === 5 && fly.ff.anim !== 'none', JSON.stringify(fly));
// 3. the gift pool
const gift = await G.ev(() => { const g = game(); const pool = ITEMS.filter(i => i.price > 0 && i.price <= 80 && !['freeze', 'extra', 'boost'].includes(i.cat) && !(i.lvl > g.lv.level) && !isOwned(i.id)); const ids = Array.from({ length: 60 }, (_, i) => pickLoginGift(Date.now(), '2027-01-' + String(i % 28 + 1).padStart(2, '0'))).filter(Boolean).map(x => x.id); for (const k of Object.keys(S.game.purchases)) if (S.game.purchases[k].gift) delete S.game.purchases[k]; G = null; return { n: pool.length, boosts: ids.filter(id => /^gx_boost/.test(id)).length, picks: new Set(ids).size, any: ids.length }; });
check('The gift day never picks a Plant XP boost (60 picks over 28 dates, none is a boost)', gift.any === 60 && gift.boosts === 0 && gift.picks >= 2, JSON.stringify(gift));
// 4. import keeps the goal history and the early mark
const imp = await G.ev(() => {
  const now = Date.now();
  const data = { sessions: [{ id: 'im1', name: 'Physics', start: now - 2e6, end: now - 1e6, duration: 18 * 60000, planned: 25 * 60000, preset: 'x', early: 1 }], goalLog: [{ id: 'g2026-10-01', d: '2026-10-01', g: 90, p: 60, u: 5 }, { id: 'g2026-10-20', d: '2026-10-20', g: 120, p: 90, u: 6 }] };
  S.goalLog = [{ id: 'g2026-10-20', d: '2026-10-20', g: 100, p: 90, u: 9 }];
  const n = mergeData(data);
  const s = S.sessions.find(x => x.id === 'im1');
  const r = { n, early: s && s.early, log: S.goalLog.map(x => x.id + ':' + x.g).sort().join(), g1: goalFor('2026-10-05'), g2: goalFor('2026-10-25'), g0: goalFor('2026-09-01') };
  S.sessions = S.sessions.filter(x => x.id !== 'im1'); S.goalLog = []; save(); return r;
});
check('Import: the Finish-early mark survives; the goal history merges by id (a newer local entry stays, an older one is added): Oct 5 → 90, Oct 25 → 100 (local), before → 60', imp.n === 1 && imp.early === 1 && imp.log === 'g2026-10-01:90,g2026-10-20:100' && imp.g1 === 90 && imp.g2 === 100 && imp.g0 === 60, JSON.stringify(imp));
// 5. compost is plant XP, never garden XP; a harvest is never before the marker
const cp = await G.ev(() => {
  S.plants.push({ id: 'cpx', v: 1, sp: 'basil', plot: -1, seed: '', at: Date.now() - 9e6, sk: 0, wt: 50, fin: 'f', fd: 25, h: Date.now() - 1000, y: 1, m: '', cp: Date.now() - 500, u: Date.now() });   // a composted crop → one heap
  GD = null; const xp0 = garden().xp;
  gardenBuy('seed_sunflower'); GD = null; const heap = garden().compost; gardenPlant(1, 'sunflower'); GD = null;
  const p = garden().growing.find(x => x.plot === 1); const head = p.w.compost, xp1 = garden().xp, pxp = waterOf(p);
  p.w.x = 60 - head; p.fin = 'x'; p.fd = 25; p.m = ''; GD = null; const xp2 = garden().xp;
  gardenMig().hv = Date.now() + 5 * 60000; GD = null;   // a fast clock set the marker five minutes ahead
  gardenHarvest(p.id); GD = null; const h = S.plants.find(x => x.id === p.id); const xp3 = garden().xp, inBasket = garden().crops.some(c => c.id === p.id);
  gardenMig().hv = Date.now() - 1e9; GD = null;
  return { heap, head, dxp1: xp1 - xp0, pxp, dxp2: xp2 - xp0, dxp3: xp3 - xp0, cx: h.cx, wt: h.wt, hAfterHv: h.h > Date.now() + 4 * 60000, inBasket, hxp: harvestXP(h) };
});
check('Compost: the seed starts at 12 of 60 plant XP but garden XP rises by 0; filling it to 60 adds 48; the harvest keeps cx=12 and wt=60, and its garden XP is the harvest bonus + 48; harvested while the marker sat 5 min ahead it still lands in the basket', cp.heap === 1 && cp.head === 12 && cp.dxp1 === 0 && cp.pxp === 12 && cp.dxp2 === 48 && cp.cx === 12 && cp.wt === 60 && cp.dxp3 === 48 + cp.hxp && cp.hAfterHv && cp.inBasket, JSON.stringify(cp));
// 6 + 7. replay: an egg laid after the block is skipped; a late plant gets the share of its time (with the boost of the time)
const rp = await G.ev(() => {
  const now = Date.now();
  const x = { id: 'rb1', name: 'Maths', start: now - 30 * 60000, end: now - 5 * 60000, duration: 25 * 60000, planned: 25 * 60000 }; S.sessions.push(x);
  const served = garden().growing.find(p => p.plot === 0); served.w = { rb1: 25 }; served.at = now - 9e6;
  S.eggs.push({ id: 'late_egg', v: 1, kind: 'rare', src: 'gift', at: now - 60000, need: 420, w: {} });   // laid after the block
  gardenBuy('seed_tomato'); gardenPlant(2, 'tomato'); GD = null; const late = garden().growing.find(p => p.plot === 2); late.at = now - 10 * 60000;   // planted before the block ended, never watered by it
  const focusEgg = eggList().find(e => !e.h && e.src === 'focus'); focusEgg.at = now - 10 * 60000; const f0 = eggFill(focusEgg);
  GD = null; const changed = gardenReplay();
  const l = garden().growing.find(p => p.plot === 2), le = eggList().find(e => e.id === 'late_egg'), fe = eggList().find(e => e.src === 'focus' && !e.h);
  const r = { changed, late: l.w.rb1, expect: Math.round(25 * shareOf(2)), lateEgg: eggFill(le), focusGain: fe ? eggFill(fe) - f0 : -1, again: gardenReplay() };
  S.sessions = S.sessions.filter(s => s.id !== 'rb1'); S.eggs = S.eggs.filter(e => e.id !== 'late_egg'); GD = null; save(); return r;
});
check('Replay: the late tomato gets 25 × share-of-2 = 21 XP (not 12), the egg laid after the block stays empty, the focus egg drinks the block; a second replay changes nothing', rp.changed && rp.late === rp.expect && rp.late === 21 && rp.lateEgg === 0 && rp.focusGain === 25 && rp.again === false, JSON.stringify(rp));
// 8 + 9. the boost card copy and icon
const card = await G.ev(() => { S.ui.shopCat = 'boost'; showTab('shop'); renderShop(); const c = $$('#shopGrid .item, .shopgrid .item').find(x => /×2|x2|2×/.test(x.textContent)); return { has: !!c, icon: !!(c && c.querySelector('.pv svg path')), undef: c ? c.innerHTML.includes('undefined') : true, copy: c ? /Every logged block counts/.test(c.textContent) : false, old: c ? /5 minutes or more/.test(c.textContent) : true }; });
check('The ×2 boost card draws an icon (no "undefined" in its markup) and says every logged block counts', card.has && card.icon && !card.undef && card.copy && !card.old, JSON.stringify(card));
await G.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
