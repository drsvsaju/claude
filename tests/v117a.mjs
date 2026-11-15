// v1.17 Phase 1.1 — focus always waters: regression scenarios for every cause found.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, focus, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const A = await device('A');
await signup(A, 'wa_' + R);
const uid = await A.ev(() => USER.uid);
const plantSp = (d, sp, daysAgo = 0, fc = 0) => d.ev(([sp, daysAgo, fc]) => { const g = garden(); const free = [...Array(g.plots).keys()].find(i => !g.byPlot[i]); if (!g.seeds[sp]) S.gbuys.push({ id: 'gb' + uid(), v: 1, item: 'seed_' + sp, price: 0, at: Date.now() - daysAgo * 864e5 - 1000, slot: '' }); GD = null; const ok = gardenPlant(free, sp); const p = garden().growing.find(x => x.sp === sp); if (p) { p.at = Date.now() - daysAgo * 864e5; if (fc) p.fc = 1; } GD = null; save(); return ok && p && p.id; }, [sp, daysAgo, fc]);
const waterOfPlant = (d, id) => d.ev(id => { const p = garden().growing.find(x => x.id === id) || S.plants.find(x => x.id === id); return p ? waterOf(p) : -1; }, id);

// ---------- T1: a plant from two days ago drinks a block (baseline) ----------
const m1 = await plantSp(A, 'marigold', 2);
await focus(A, 25); await wait(1500); await closeDlg(A);
check('T1 A marigold planted two days ago drinks a 25-min block', (await waterOfPlant(A, m1)) === 25, 'water ' + await waterOfPlant(A, m1));

// ---------- T2: the "water first" plant must not starve the others ----------
const t2 = await plantSp(A, 'tomato', 0, 1);   // tomato (need 90) watered first
await focus(A, 25); await wait(1500); await closeDlg(A);
const w2 = { tomato: await waterOfPlant(A, t2), marigold: await waterOfPlant(A, m1) };
check('T2 with a "water first" plant the marigold still gets a share of the block', w2.marigold > 25 && w2.tomato > 0, JSON.stringify(w2));

// ---------- T3: a block that ends before the garden is ready on this device is replayed later ----------
const eggBefore = await A.ev(() => eggFill(eggActive()));
await A.ev(() => { window.__mig = S.plants.find(p => p.id === 'mig1'); S.plants = S.plants.filter(p => p.id !== 'mig1'); GD = null; });   // a stale cache: no migration record yet
await focus(A, 20); await wait(1500); await closeDlg(A);
await A.ev(() => { const d = profileFromState(); d.plants = [...d.plants, window.__mig]; applyProfile(d); });   // the profile (with the migration record) arrives
await wait(1500);
const t3 = await A.ev(([m1, t2]) => ({ egg: eggFill(eggActive()), m: waterOf(garden().growing.find(x => x.id === m1) || {}), t: waterOf(garden().growing.find(x => x.id === t2) || {}), q: (S.gq || []).length }), [m1, t2]);
check('T3 a block logged while the garden was not ready is replayed once the garden is: egg and plants get it', t3.egg === eggBefore + 20 && t3.m > w2.marigold && t3.t > w2.tomato, JSON.stringify({ eggBefore, ...t3 }));

// ---------- T4: a plant planted on another device while this one is offline drinks the offline block once it syncs ----------
const B = await device('B');
await B.p.goto(B.U || 'http://localhost:8000/index.html?emulator=1'); await B.p.waitForSelector('#authView:not(.hidden)');
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', 'wa_' + R); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
await until(B, () => !!(window.S && S.plants && S.plants.some(p => p.sp === 'marigold')), null, 15000); await wait(1500); await closeDlg(B);
let cutB = false; await B.ctx.route(/127\.0\.0\.1:(8080|9099)/, r => cutB ? r.abort() : r.continue());
cutB = true; await wait(800);
const basil = await plantSp(A, 'basil', 0);   // A plants basil while B is offline
await wait(1500);
await focus(B, 25); await wait(1500); await closeDlg(B);   // B's block knows nothing of the basil
cutB = false;
const got = await until(B, id => { const p = garden().growing.find(x => x.id === id); return !!p && waterOf(p) > 0; }, basil, 20000);
const t4 = await B.ev(id => { const p = garden().growing.find(x => x.id === id); return { basil: p ? waterOf(p) : -1, keys: p ? Object.keys(p.w || {}).length : 0 }; }, basil);
check('T4 the basil planted on A while B was offline drinks B\'s offline block after the sync', got >= 0 && t4.basil > 0, JSON.stringify(t4));

// ---------- T5: a plant just planted is not dropped by a cloud snapshot that lands before the upload ----------
const t5 = await A.ev(() => { const g = garden(); const free = [...Array(g.plots).keys()].find(i => !g.byPlot[i]); S.gbuys.push({ id: 'gb' + uid(), v: 1, item: 'seed_sunflower', price: 0, at: Date.now(), slot: '' }); GD = null; gardenPlant(free, 'sunflower'); const id = garden().growing.find(x => x.sp === 'sunflower').id; const cloud = JSON.parse(lastProfileJSON || '{}'); mergeSyncFrom({ ...cloud, plants: (cloud.plants || []).filter(p => p.id !== id) }); GD = null; return { kept: !!garden().growing.find(x => x.id === id) }; });
check('T5 a plant planted a moment ago survives a cloud snapshot that does not carry it yet', t5.kept, JSON.stringify(t5));

// ---------- T6: a paused block and a block ending after midnight still water (duration is what counts) ----------
await A.ev(() => { for (const x of garden().growing) x.fc = 0; GD = null; save(); });   // no "water first" plant for these
const given = d => d.ev(() => { const s = S.sessions[S.sessions.length - 1]; return { id: s.id, dur: Math.round(s.duration / 60000), sum: garden().growing.reduce((a, p) => a + (+(p.w || {})[s.id] || 0), 0), n: garden().growing.filter(p => (p.w || {})[s.id] !== undefined).length, open: garden().growing.filter(p => !plantReady(p) || (p.w || {})[s.id] !== undefined).length, egg: eggList().some(e => e.w && e.w[s.id] !== undefined) }; });
await A.ev(() => { const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 25 * 60000; t.focusStartedAt = Date.now() - 40 * 60000; t.endAt = Date.now(); t.status = 'running'; finishPhase('complete'); });
const t6 = await given(A);
check('T6 a block with pauses (40 min wall clock, 25 focused) gives its 25 minutes to the plants (every plant with room marked, each ≤ 25) and the egg', t6.dur === 25 && t6.sum > 0 && t6.sum <= 25 * t6.n && t6.n === t6.open && t6.n >= 1 && t6.egg, JSON.stringify(t6));
await A.ev(() => { const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 25 * 60000; const mid = new Date(); mid.setHours(0, 10, 0, 0); t.focusStartedAt = mid.getTime() - 15 * 60000; t.endAt = mid.getTime() + 10 * 60000; t.status = 'running'; finishPhase('complete'); });
const t6b = await given(A);
check('T6b a block that crosses midnight gives its 25 minutes to the plants (every plant with room marked) and the egg', t6b.dur === 25 && t6b.sum > 0 && t6b.sum <= 25 * t6b.n && t6b.n === t6b.open && t6b.n >= 1 && t6b.egg, JSON.stringify(t6b));
// ---------- T7: replaying never waters twice ----------
const t7 = await A.ev(() => { const before = JSON.stringify(garden().growing.map(p => [p.id, waterOf(p)])), eb = eggFill(eggActive()); const a = gardenReplay(), b2 = reconcileRewards('quiet'); return { changed: a, same: before === JSON.stringify(garden().growing.map(p => [p.id, waterOf(p)])), egg: eggFill(eggActive()) === eb }; });
check('T7 a replay with nothing missing changes nothing (no double watering, no upload loop)', !t7.changed && t7.same && t7.egg, JSON.stringify(t7));

log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
