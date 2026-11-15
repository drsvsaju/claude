// v1.17 Phase 3A/C/D — plant XP shares and needs, the Harvests inventory (crops wait until sold), stars, selling
// single / bulk / favourites, the weekend festival, the produce ledger and the migration marker, export, sync, demo.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, focus, until, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const A = await device('A', 1280);
await signup(A, 'hv_' + R);
await closeDlg(A);
// ---------- A. shares and needs ----------
const f = await A.ev(() => ({ s: [1, 2, 3, 4, 6, 8, 16].map(n => Math.round(shareOf(n) * 100)), needs: Object.fromEntries(GSPECIES.map(x => [x.id, x.need])), k: GX_SHARE_K, fm: GX_FOCUS_MULT }));
check('Share per plant: 1 → 100%, 2 → 85%, 3 → 74%, 4 → 65%, 6 → 53%, 8 → 44%, 16 → 27%; needs lowered (tomato 70, marigold 55, lavender 200, starfruit 620)', f.s.join() === '100,85,74,65,53,44,27' && f.needs.tomato === 70 && f.needs.marigold === 55 && f.needs.lavender === 200 && f.needs.starfruit === 620, JSON.stringify(f));
const pour = await A.ev(() => {
  const mk = (id, sp, w = 0, fc = 0) => ({ id, sp, w: w ? { x: w } : {}, fc });
  const one = pourWater([mk('a', 'tomato')], 25), two = pourWater([mk('a', 'tomato'), mk('b', 'marigold')], 25), four = pourWater([mk('a', 'tomato'), mk('b', 'marigold'), mk('c', 'basil'), mk('d', 'chilli')], 25);
  const foc = pourWater([mk('a', 'tomato', 0, 1), mk('b', 'marigold')], 25);
  const flow = pourWater([mk('a', 'tomato', 68), mk('b', 'marigold')], 25);   // the tomato can only take 2 more: the rest flows to the marigold
  return { one: one.a, two: [two.a, two.b], four: [four.a, four.b, four.c, four.d], foc: [foc.a, foc.b], flow: [flow.a, flow.b] };
});
check('A 25-min block: alone 25 XP; two plants 21 each; four plants 16 each; the focused plant ×1.5 (32 / 21); XP a full plant cannot hold flows on (2 / 40)', pour.one === 25 && pour.two.join() === '21,21' && pour.four.join() === '16,16,16,16' && pour.foc.join() === '32,21' && pour.flow.join() === '2,40', JSON.stringify(pour));
// sessions to harvest: tomato alone ≈ 3 blocks, four commons ≈ 4–5 blocks each
const bal = await A.ev(() => { const blocks = (n, need) => Math.ceil(need / Math.round(25 * shareOf(n))); return { solo: blocks(1, 70), duo: blocks(2, 70), quad: blocks(4, 70), rare: blocks(1, 200), legend: blocks(1, 440), quadRare: blocks(4, 200) }; });
check('Balance: a common plant in 3 blocks alone, 4 with two growing, 5 with four; rare 8 alone; legendary 18 alone', bal.solo === 3 && bal.duo === 4 && bal.quad === 5 && bal.rare === 8 && bal.legend === 18, JSON.stringify(bal));
// XP labels and bars in the scene and the dialog
const ui = await A.ev(() => { S.gbuys.push({ id: 'gb' + uid(), v: 1, item: 'seed_marigold', price: 0, at: Date.now(), slot: '' }); GD = null; gardenPlant(0, 'marigold'); const p = garden().growing[0]; (p.w ||= {}).x = 22; GD = null; save(); showTab('garden'); S.ui.gardenView = 'garden'; renderGarden(); const plot = document.querySelector('.gd-plot.has'); openPlantDlg(p.id); const desc = $('#gdDlgBody .desc').textContent; $('#gdDlg').close(); return { label: plot.getAttribute('aria-label'), bar: plot.querySelector('.gd-xp i').style.width, desc, left: xpMinutesLeft(p) }; });
check('The plot shows an XP bar and says "22 of 55 XP"; the plant dialog says XP and the minutes of focus to go', /22 of 55 XP/.test(ui.label) && ui.bar === '40%' && /22 \/ 55 XP/.test(ui.desc) && /33m of focus to go/.test(ui.desc) && ui.left === 33, JSON.stringify(ui));
// ---------- C. harvest → inventory ----------
const hv = await A.ev(() => { const p = garden().growing[0]; p.w = { x: 55 }; GD = null; const before = garden().produce; const h = gardenHarvest(p.id); GD = null; const g = garden(); return { before, after: g.produce, crops: g.crops.map(c => c.id), sold: !!h.sold, hvMark: g.hv > 0, stars: cropStars(h), val: cropValue(h, new Date('2026-11-04T10:00:00').getTime()), y: h.y, kg: kgOf(h) }; });
check('A harvest goes to the Harvests basket: produce unchanged, the crop unsold, the 1.17 marker set, stars 1–5 and a value', hv.after === hv.before && hv.crops.length === 1 && !hv.sold && hv.hvMark && hv.stars >= 1 && hv.stars <= 5 && hv.val >= hv.y, JSON.stringify(hv));
const tab = await A.ev(() => { S.ui.gardenView = 'harvests'; renderGarden(); const el = $('#gardenBody'); return { seg: !!el.querySelector('[data-gview="harvests"].active'), cards: el.querySelectorAll('.gd-crop').length, sell: !!el.querySelector('[data-sell]'), bulk: el.querySelectorAll('[data-sellall]').length, badge: (el.querySelector('.gd-seg .gd-n') || {}).textContent, fest: !!el.querySelector('.gd-fest') === festivalOn() }; });
check('The Harvests tab lists the crop with Sell and ♥, two bulk buttons and a count badge; the festival banner matches the day', tab.seg && tab.cards === 1 && tab.sell && tab.bulk === 2 && tab.badge === '1' && tab.fest, JSON.stringify(tab));
// stars: weight, mutation, giant
const st = await A.ev(() => { const base = { sp: 'tomato', id: 'x', y: 4 }; const kg = r => ((GKG.tomato[0] + GKG.tomato[1]) / 2) * r; return { plain: cropStars({ ...base, kg: kg(1) }), heavy: cropStars({ ...base, kg: kg(1.7) }), golden: cropStars({ ...base, kg: kg(1), m: 'golden' }), crystal: cropStars({ ...base, kg: kg(1), m: 'crystal' }), giantRainbow: cropStars({ ...base, kg: kg(3), m: 'rainbow', giant: 1 }), wm2: cropStars({ ...base, kg: kg(1), wm: ['moonlit', 'frozen', 'dawn'] }), v: [1, 2, 3, 4, 5].map(n => cropValue({ ...base, kg: kg([1, 1.2, 1.7, 2.6, 2.6][n - 1]), m: n === 5 ? 'golden' : '' }, new Date('2026-11-04T10:00:00').getTime())), fest: cropValue({ ...base, kg: kg(1) }, new Date('2026-11-07T10:00:00').getTime()) }; });
check('Stars: plain 1★, 1.7× weight 3★, Golden 2★, Crystal 4★, Giant Rainbow 5★, three weather mutations count two; value ×1/1.15/1.35/1.6/2 and +25% at the weekend', st.plain === 1 && st.heavy === 3 && st.golden === 2 && st.crystal === 4 && st.giantRainbow === 5 && st.wm2 === 3 && st.v.join() === '4,5,5,6,8' && st.fest === 5, JSON.stringify(st));
// sell one; favourites; bulk
const sell = await A.ev(() => { const g = garden(), c = g.crops[0], before = g.produce; const v = gardenSell(c.id); GD = null; return { v, after: garden().produce - before, left: garden().crops.length, sv: c.sv, all: garden().produceAll }; });
check('Selling pays the crop\'s value into produce (and the all-time produce), the basket empties', sell.v > 0 && sell.after === sell.v && sell.left === 0 && sell.sv === sell.v, JSON.stringify(sell));
const bulk = await A.ev(() => {
  const now = Date.now(); const mk = (id, sp, extra = {}) => ({ id, v: 1, sp, plot: -1, seed: 'x' + id, at: now - 3e6, sk: 0, wt: 60, h: now - 1000, y: 4, m: '', kg: ((GKG[sp] || GKG_BY_RARITY.common)[0] + (GKG[sp] || GKG_BY_RARITY.common)[1]) / 2, ...extra });
  S.plants.push(mk('c1', 'basil'), mk('c2', 'basil'), mk('c3', 'tomato', { m: 'golden', y: 8 }), mk('c4', 'tomato', { giant: 1, kg: 1.2, y: 6 }), mk('c5', 'marigold', { fav: 1 }), mk('c6', 'sunflower', { kg: 1.6, y: 5 }));
  GD = null; save();
  const common = garden().crops.filter(p => !p.fav && cropStars(p) <= 2 && !p.m && !p.giant).length;
  const r1 = gardenSellAll('common'); GD = null; const left1 = garden().crops.map(c => c.id).sort();
  const r2 = gardenSellAll('keep'); GD = null; const left2 = garden().crops.map(c => c.id).sort();
  return { common, r1, left1, r2, left2 };
});
check('"Sell all common" sells the 1–2★ unmutated crops (not the favourite, the Golden, the Giant, the heavy 3★); "except mutated & records" then sells the rest but the record-holders and the favourite', bulk.common === 2 && bulk.r1.n === 2 && bulk.left1.join() === 'c3,c4,c5,c6' && bulk.left2.includes('c3') && bulk.left2.includes('c4') && bulk.left2.includes('c5'), JSON.stringify(bulk));
// the ledger: old harvests (before the marker) stay paid; the fold pays unsold crops at their base value
const led = await A.ev(() => { const g = garden(); const hv = g.hv; S.plants.push({ id: 'old1', v: 1, sp: 'basil', plot: -1, seed: 'xo', at: hv - 5e6, sk: 0, wt: 50, h: hv - 1000, y: 7, m: '' }); GD = null; const p1 = garden().produce; const old = garden().crops.some(c => c.id === 'old1'); return { paid: p1 - g.produce === 7, inBasket: old }; });
check('A harvest from before the 1.17 marker counts as sold at harvest (not in the basket)', led.paid && !led.inBasket, JSON.stringify(led));
// export carries sold / fav / sv; a 1.16 export (no marker, no sold fields) still imports: its harvests count as paid
const ex = await A.ev(() => { const data = (({ timer, ui, pendingSessions, profileDirty, ...d }) => d)(S); const j = JSON.parse(JSON.stringify(data)); const c3 = j.plants.find(p => p.id === 'c3'); return { hasFav: !!j.plants.find(p => p.id === 'c5').fav, hasSold: !!j.plants.find(p => p.id === 'c1').sold && j.plants.find(p => p.id === 'c1').sv > 0, c3: !!c3 }; });
check('The export carries favourites, sold times and sold values', ex.hasFav && ex.hasSold && ex.c3, JSON.stringify(ex));
// sync: a sale on A reaches B; a favourite set on B reaches A
const B = await device('B', 1280);
await B.p.goto('http://localhost:8000/index.html?emulator=1'); await B.p.waitForSelector('#authView:not(.hidden)');
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', 'hv_' + R); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
await until(B, () => !!(window.S && S.plants && S.plants.some(p => p.id === 'c3')), null, 15000); await wait(1500); await closeDlg(B);
await A.ev(() => { gardenSell('c3'); });
const seenB = await until(B, () => { const p = S.plants.find(x => x.id === 'c3'); return !!(p && p.sold && p.sv); }, null, 15000);
await B.ev(() => { gardenFav('c4'); });
const seenA = await until(A, () => !!(S.plants.find(x => x.id === 'c4') || {}).fav, null, 15000);
const both = await Promise.all([A, B].map(d => d.ev(() => ({ produce: garden().produce, crops: garden().crops.map(c => c.id).sort().join() }))));
check('A sale on one device shows on the other with the same produce; a favourite set on B reaches A', seenB >= 0 && seenA >= 0 && both[0].produce === both[1].produce && both[0].crops === both[1].crops, JSON.stringify(both));
// the cloud profile carries the crops with their fields
const cloud = await ownerGet('users/' + await A.ev(() => USER.uid));
check('The profile document carries sold crops with sold / sv and the favourite', !!cloud && cloud.plants.some(p => p.id === 'c3' && p.sold && p.sv) && cloud.plants.some(p => p.id === 'c4' && p.fav) && cloud.plants.some(p => p.id === 'mig1' && p.hv), JSON.stringify((cloud.plants || []).filter(p => ['c3', 'c4', 'mig1'].includes(p.id)).map(p => [p.id, !!p.sold, p.sv, !!p.fav, !!p.hv])));
// demo: crops in the basket, selling shows the demo prompt and writes nothing
const D = await device('D', 1280, { noLogin: true, tag: 'demo' });
await D.p.goto('http://localhost:8000/index.html?emulator=1'); await D.p.waitForSelector('#authView:not(.hidden)');
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeDlg(D);
const demo = await D.ev(() => { S.ui.gardenView = 'harvests'; showTab('garden'); renderGarden(); const ls = Object.keys(localStorage).length, n = garden().crops.length; const btn = document.querySelector('[data-sell]'); if (btn) btn.click(); return { pv: isPreview(), n, prompt: !!document.querySelector('dialog[open] #pvWhy'), stillThere: garden().crops.length === n, ls: Object.keys(localStorage).length === ls }; });
check('Demo: the basket shows sample crops; selling shows the demo prompt and writes nothing', demo.pv && demo.n >= 2 && demo.prompt && demo.stillThere && demo.ls, JSON.stringify(demo));
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
