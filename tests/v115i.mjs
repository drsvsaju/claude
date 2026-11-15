// v1.15 garden history folding across two devices (emulator): a long history (505 harvests) seeded on A reaches B; A's
// next harvest folds the oldest into one record and B converges (same produce, level, counts, one fold record, no
// resurrected plants); then both devices harvest while offline (each folds on its own) and still converge once online.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4), U = 'fd_' + R;
async function login(d) {
  await d.p.goto('http://localhost:8000/index.html?emulator=1'); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await d.p.click('[data-mode=login] >> visible=true'); await d.p.fill('#authUser', U); await d.p.fill('#authPass', 'secret12'); await d.p.click('#authSubmit');
  await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(d);
}
const A = await device('A', 1200); await signup(A, U);
const uid = await A.ev(() => USER.uid);
// seed: 505 harvests over 580 days, their seed purchases, two decor pieces, three ready-to-harvest plants
await A.ev(() => {
  const now = Date.now(), sp = ['tomato', 'sunflower', 'basil', 'marigold', 'strawberry', 'chilli', 'lavender', 'rose'];
  for (let k = 0; k < 505; k++) { const at = now - (580 - k) * 864e5; S.gbuys.push({ id: 'h' + k, v: 1, item: 'seed_' + sp[k % 8], price: k % 4 ? 0 : 3, at: at - 36e5, slot: '' }); S.plants.push({ id: 'hp' + k, v: 1, sp: sp[k % 8], plot: -1, seed: 'h' + k, at: at - 36e5, sk: 4, wt: 90, fin: 'x', fd: 50, h: at, y: 6 + (k % 4), m: k % 13 ? '' : 'golden' }); }
  S.gbuys.push({ id: 'dec1', v: 1, item: 'dc_gnome', price: 8, at: now - 500 * 864e5, slot: 's1' }, { id: 'dec2', v: 1, item: 'dc_fence_wood', price: 10, at: now - 100 * 864e5, slot: 'border' });
  for (let k = 0; k < 3; k++) { S.gbuys.push({ id: 'r' + k, v: 1, item: 'seed_tomato', price: 0, at: now - 5 * 864e5, slot: '' }); S.plants.push({ id: 'rp' + k, v: 1, sp: 'tomato', plot: k, seed: 'r' + k, at: now - 5 * 864e5, sk: 2, w: { ['s' + k]: 90 } }); }
  GD = null; save();
});
const B = await device('B', 1200); await login(B);
const gotB = await until(B, () => garden().harvested.length === 505 && garden().ready.length === 3, null, 30000);
const base = await Promise.all([A, B].map(d => d.ev(() => { const g = garden(); return { n: g.harvested.length, produce: g.produce, level: g.level, xp: g.xp, hN: g.harvestsN, golden: g.muts.golden, placed: Object.keys(g.placed).sort().join(), fold: !!g.fold, invalid: g.invalid.length }; })));
check('B receives the long history (505 harvests, 3 ready plants, 2 placed decor) and both read the same garden', gotB >= 0 && JSON.stringify(base[0]) === JSON.stringify(base[1]) && base[0].n === 505 && base[0].placed === 'border,s1' && base[0].invalid === 0, JSON.stringify(base));
// ---------- 1. A harvests → folds; B converges ----------
const yA = await A.ev(() => { const p = garden().ready[0]; const y = yieldOf(p); gardenHarvest(p.id); return y; });
const foldA = await A.ev(() => { const g = garden(); return { n: g.harvested.length, fold: g.fold && { grown: g.fold.grown, y: g.fold.y, xp: g.fold.xp, spent: g.fold.spent }, produce: g.produce, level: g.level, hN: g.harvestsN, golden: g.muts.golden, placed: Object.keys(g.placed).sort().join(), buys: S.gbuys.length, invalid: g.invalid.length }; });
check('A: the harvest folds the oldest 206 into fold1; 300 stored; produce unchanged (the crop waits in the basket, 1.17); level and counts kept', foldA.n === 300 && foldA.fold && foldA.fold.grown === 206 && foldA.produce === base[0].produce && foldA.level === base[0].level && foldA.hN === base[0].hN + 1 && foldA.golden === base[0].golden && foldA.placed === 'border,s1' && foldA.invalid === 0, JSON.stringify({ foldA, yA }));
const convB = await until(B, () => garden().fold && garden().harvested.length === 300, null, 30000);
const foldB = await B.ev(() => { const g = garden(); return { n: g.harvested.length, fold: g.fold && { grown: g.fold.grown, y: g.fold.y, xp: g.fold.xp, spent: g.fold.spent }, produce: g.produce, level: g.level, hN: g.harvestsN, golden: g.muts.golden, placed: Object.keys(g.placed).sort().join(), buys: S.gbuys.length, invalid: g.invalid.length, folds: S.plants.filter(p => p.fold).length }; });
check('B converges on the same fold record, produce, level, counts and purchases (nothing resurrected, one fold record)', convB >= 0 && JSON.stringify({ ...foldB, folds: undefined }) === JSON.stringify(foldA) && foldB.folds === 1, JSON.stringify({ foldA, foldB }));
const cloud = await ownerGet('users/' + uid);
check('The profile document holds 300 harvests, the migration record and the fold record', cloud && cloud.plants.filter(p => !p.sum && p.h).length === 300 && cloud.plants.some(p => p.id === 'fold1' && p.fold) && cloud.plants.some(p => p.id === 'mig1'), cloud ? `${cloud.plants.length} plants in the document` : 'no doc');
// ---------- 2. both offline, both harvest (each may fold), then online ----------
await Promise.all([A, B].map(async d => { await d.ev(() => { for (let k = 0; k < 250; k++) { const at = Date.now() - (60 - k * 0.2) * 864e5; S.gbuys.push({ id: 'n' + k, v: 1, item: 'seed_basil', price: 0, at: at - 36e5, slot: '' }); S.plants.push({ id: 'np' + k, v: 1, sp: 'basil', plot: -1, seed: 'n' + k, at: at - 36e5, sk: 1, wt: 60, fin: 'x', fd: 25, h: at, y: 5 }); } GD = null; save(); }); }));
await wait(6000);   // the same 250 extra harvests on both (identical ids), synced
const pre = await Promise.all([A, B].map(d => d.ev(() => ({ n: garden().harvested.length, ready: garden().ready.length }))));
let cutA = false, cutB = false;
await A.ctx.route(/127\.0\.0\.1:(8080|9099)/, r => cutA ? r.abort() : r.continue());
await B.ctx.route(/127\.0\.0\.1:(8080|9099)/, r => cutB ? r.abort() : r.continue());
cutA = cutB = true; await wait(1000);
const offA = await A.ev(() => { const p = garden().ready[0]; gardenHarvest(p.id); const g = garden(); return { n: g.harvested.length, grown: g.fold.grown, produce: g.produce }; });
const offB = await B.ev(() => { const p = garden().ready[1]; gardenHarvest(p.id); const g = garden(); return { n: g.harvested.length, grown: g.fold.grown, produce: g.produce }; });
check('Offline, each device harvests a different plant and folds its own copy of the history', pre[0].n === 550 && pre[1].n === 550 && offA.n === 300 && offB.n === 300 && offA.grown === offB.grown, JSON.stringify({ pre, offA, offB }));
cutA = cutB = false;
const settle = await until(A, () => garden().harvested.length === 301 && garden().growing.length === 0, null, 40000);
await until(B, () => garden().harvested.length === 301 && garden().growing.length === 0, null, 40000);
await wait(3000);
const fin = await Promise.all([A, B].map(d => d.ev(() => { const g = garden(); return { n: g.harvested.length, growing: g.growing.length, fold: { grown: g.fold.grown, y: g.fold.y, xp: g.fold.xp, spent: g.fold.spent }, folds: S.plants.filter(p => p.fold).length, produce: g.produce, level: g.level, hN: g.harvestsN, invalid: g.invalid.length, buys: S.gbuys.length }; })));
check('Back online both devices converge: one fold record, 301 stored harvests, every harvest counted once, same produce and level', settle >= 0 && JSON.stringify(fin[0]) === JSON.stringify(fin[1]) && fin[0].folds === 1 && fin[0].n === 301 && fin[0].hN === 505 + 250 + 3 && fin[0].invalid === 0, JSON.stringify(fin));
await A.ctx.close(); await B.ctx.close();
log('errors', errs);
log(`${failCount()} failed`);
await b.close();
process.exit(failCount() || errs.length ? 1 : 0);
