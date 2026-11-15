// v1.16 egg history fold: once more than 400 eggs are stored the oldest hatched beyond the newest 300 fold into one
// record (pet copies kept), the upload stays within the cap with the record first, the richer record wins a merge,
// folding is idempotent, the next focus egg id follows the highest one (not the count), a copy of a folded egg that a
// long-closed device brings back is dropped (never counted twice), and a hatched copy merges equal to its uploaded form.
import { b, device, signup, log, check, errs, failCount, closeDlg } from './cl-common.mjs';
const A = await device('A');
await signup(A, 'fold_' + Date.now().toString(36).slice(-5));
await closeDlg(A);
const mk = (i, pets, hatched = true) => ({ id: 'egg' + i, v: 1, kind: 'common', src: 'focus', at: 1e12 + i * 1e6, u: 1e12 + i * 1e6, need: 300, ...(hatched ? { h: 1e12 + i * 1e6 + 5e5, pet: pets[i % pets.length], hs: 's' + i } : {}), w: { ['s' + i]: hatched ? 300 : 40 } });
const r = await A.ev(mkSrc => {
  const mk = eval(mkSrc), pets = PETS.map(p => p.id);
  // 400 stored (399 hatched + 1 waiting): nothing folds and the upload carries all 400 (the cap is on what is stored)
  S.eggs = []; for (let i = 1; i <= 399; i++) S.eggs.push(mk(i, pets)); S.eggs.push(mk(400, pets, false));
  const none = eggFold(), up400 = eggsForProfile().length;
  // 450 hatched + 1 waiting: the oldest 150 fold
  S.eggs = []; for (let i = 1; i <= 450; i++) S.eggs.push(mk(i, pets)); S.eggs.push(mk(451, pets, false));
  const before = Object.fromEntries(petsOwned().map(p => [p.id, p.n]));
  const folded = eggFold(), f = eggFoldRec();
  const after = Object.fromEntries(petsOwned().map(p => [p.id, p.n]));
  const again = eggFold(), up = eggsForProfile(), total = S.eggs.length, upLen = up.length, upFirst = up[0] && up[0].id, upHasW = up.some(e => e.h && e.w);
  const hatchedLeft = eggList().filter(e => e.h).length, unhatched = eggList().filter(e => !e.h).length;
  const oldestKept = Math.min(...eggList().filter(e => e.h).map(e => +e.id.slice(3)));
  // the next focus egg follows the highest id, not the count
  const act = eggActive(); act.h = Date.now(); act.pet = 'frog'; act.hs = 'sx';
  const made = ensureEgg(), nextId = eggActive() && eggActive().id;
  // a copy of a folded egg brought back by a long-closed device is dropped and never counted twice
  const base2 = JSON.stringify(Object.fromEntries(petsOwned().map(p => [p.id, p.n])));
  S.eggs.push(mk(50, pets));
  const dupSame = JSON.stringify(Object.fromEntries(petsOwned().map(p => [p.id, p.n]))) === base2;
  eggFold();
  const pruned = !eggList().some(e => e.id === 'egg50'), pruneSame = JSON.stringify(Object.fromEntries(petsOwned().map(p => [p.id, p.n]))) === base2;
  const m = mergeEgg({ id: 'eggfold', sum: 1, n: 150, pets: { frog: 1 }, u: 1 }, { id: 'eggfold', sum: 1, n: 200, pets: { frog: 2 }, u: 2 });
  const m2 = mergeEgg({ id: 'eggfold', sum: 1, n: 200, pets: {}, u: 3 }, { id: 'eggfold', sum: 1, n: 150, pets: {}, u: 1 });
  const loc = { id: 'eggZ', v: 1, kind: 'common', src: 'focus', at: 5, u: 5, need: 300, h: 9, pet: 'frog', hs: 'sZ', w: { sZ: 300 } };
  const remote = { id: 'eggZ', v: 1, kind: 'common', src: 'focus', at: 5, u: 5, need: 300, h: 9, pet: 'frog', hs: 'sZ' };
  const equal = canonJSON(mergeEgg(remote, loc)) === canonJSON(remote);
  const j1 = mergeEgg({ id: 'eggY', kind: 'common', w: { a: 10 } }, { id: 'eggY', kind: 'common', w: { b: 20 } }), j2 = mergeEgg({ id: 'eggY', kind: 'common', w: { b: 20 } }, { id: 'eggY', kind: 'common', w: { a: 10 } });
  return { none, up400, folded, n: f && f.n, top: f && f.top, topN: f && f.topN, petsN: f && Object.values(f.pets).reduce((a, x) => a + x, 0), sameCounts: JSON.stringify(before) === JSON.stringify(after), hatchedLeft, unhatched, oldestKept, total, upLen, upFirst, upHasW, made, nextId, dupSame, pruned, pruneSame, m: m.n, m2: m2.n, equal, joinEqual: JSON.stringify(j1.w) === JSON.stringify(j2.w) };
}, mk.toString());
check('400 stored eggs: nothing folds and the upload carries all 400; 451 stored: the oldest 150 hatched fold into one record (pet copies unchanged), the newest 300 and the waiting egg stay', !r.none && r.up400 === 400 && r.folded && r.n === 150 && r.petsN === 150 && r.top === 'egg150' && r.topN === 150 && r.sameCounts && r.hatchedLeft === 300 && r.unhatched === 1 && r.oldestKept === 151, JSON.stringify(r));
check('Folding again changes nothing; the upload carries the record first and at most 400 more, hatched ones without water maps', !r.again && r.total === 302 && r.upLen === 302 && r.upFirst === 'eggfold' && !r.upHasW, JSON.stringify({ again: r.again, total: r.total, upLen: r.upLen, upFirst: r.upFirst, upHasW: r.upHasW }));
check('The next focus egg follows the highest id (egg452), not the count', r.made && r.nextId === 'egg452', JSON.stringify({ made: r.made, nextId: r.nextId }));
check('A copy of a folded egg brought back by a long-closed device is never counted twice and is dropped on the next pass', r.dupSame && r.pruned && r.pruneSame, JSON.stringify({ dupSame: r.dupSame, pruned: r.pruned, pruneSame: r.pruneSame }));
check('Two fold records merge to the richer one whichever is newer; a hatched local copy merges equal to its uploaded form; joined water maps compare equal in either order', r.m === 200 && r.m2 === 200 && r.equal && r.joinEqual, JSON.stringify({ m: r.m, m2: r.m2, equal: r.equal, joinEqual: r.joinEqual }));
log('errors', JSON.stringify(errs), '| failures', failCount());
await b.close(); process.exit(failCount() ? 1 : 0);
