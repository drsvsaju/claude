// v1.15 Garden across devices (emulator): two devices of one account migrating at the same moment (one summary, one set of
// starter seeds), plantings syncing both ways, offline watering joined with the other device's watering (no minutes lost),
// a harvest + purchase visible on the other device, the profile document's shape, an older-version device's upload leaving
// the garden alone, and tombstones untouched.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, focus, ownerGet, owner } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const U = 'gd_' + R;
async function login(d) {
  await d.p.goto('http://localhost:8000/index.html?emulator=1'); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await d.p.click('[data-mode=login] >> visible=true'); await d.p.fill('#authUser', U); await d.p.fill('#authPass', 'secret12'); await d.p.click('#authSubmit');
  await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(d);
}
// ---------- 1. sign up on A, then A2 logs in at (nearly) the same time: still one migration record ----------
const A = await device('A', 1200);
await signup(A, U);
const uid = await A.ev(() => USER.uid);
const A2 = await device('A2', 1200);
await login(A2);
await wait(2000);
const migs = await Promise.all([A, A2].map(d => d.ev(() => ({ migs: S.plants.filter(p => p.id === 'mig1').length, starters: S.gbuys.filter(x => /^st[123]$/.test(x.id)).length, plants: S.plants.length, buys: S.gbuys.length }))));
check('Both devices hold exactly one migration summary and one set of three starter seeds', migs.every(m => m.migs === 1 && m.starters === 3 && m.plants === 1 && m.buys === 3), JSON.stringify(migs));
const cloud = await ownerGet('users/' + uid);
check('The profile document carries plants and gbuys arrays with version stamps (nothing outside users/{uid})', Array.isArray(cloud.plants) && cloud.plants.length === 1 && cloud.plants[0].v === 1 && cloud.plants[0].sum === 1 && Array.isArray(cloud.gbuys) && cloud.gbuys.length === 3 && cloud.gbuys.every(x => x.v === 1), JSON.stringify({ plants: cloud.plants, gbuys: cloud.gbuys }));
// ---------- 2. plantings sync both ways ----------
await A.ev(() => gardenPlant(0, 'tomato'));
const seenA2 = await until(A2, () => garden().growing.length === 1 && garden().byPlot[0] && garden().byPlot[0].sp === 'tomato', null, 15000);
check('A plants a tomato → A2 sees it in the same plot within seconds', seenA2 >= 0, `${seenA2} ms`);
await A2.ev(() => gardenPlant(1, 'sunflower'));
const seenA = await until(A, () => garden().growing.length === 2 && garden().byPlot[1] && garden().byPlot[1].sp === 'sunflower', null, 15000);
check('A2 plants a sunflower → A sees both plants; the seed inventory agrees (one tomato seed left, no sunflower)', seenA >= 0 && (await A.ev(() => (garden().seeds.tomato || []).length === 1 && !(garden().seeds.sunflower || []).length)), `${seenA} ms`);
// ---------- 3. offline watering on A2 while A waters too: the water maps join ----------
await A2.ctx.setOffline(true); await wait(300);
await focus(A2, 30); await wait(800); await closeDlg(A2);
await focus(A, 40); await wait(2500); await closeDlg(A);
const offA2 = await A2.ev(() => garden().growing.map(p => [p.sp, waterOf(p), Object.keys(p.w).length]));
const onA = await A.ev(() => garden().growing.map(p => [p.sp, waterOf(p), Object.keys(p.w).length]));
check('Before reconnecting: A2 (offline) gave each of its two plants 25 XP of its 30 min (85% share), A gave 34 of its 40', offA2.every(x => x[1] === 25 && x[2] >= 1) && onA.every(x => x[1] === 34 && x[2] >= 1), JSON.stringify({ offA2, onA }));
await A2.ctx.setOffline(false);
const joinedA2 = await until(A2, () => garden().growing.every(p => waterOf(p) === 59 && Object.keys(p.w).length === 2), null, 20000);
const joinedA = await until(A, () => garden().growing.every(p => waterOf(p) === 59 && Object.keys(p.w).length === 2), null, 20000);
check('After reconnecting both devices have both waterings on every plant (59 XP each, two entries) — nothing lost, nothing doubled', joinedA2 >= 0 && joinedA >= 0, JSON.stringify({ joinedA2, joinedA }));
let cloud2 = null; for (let i = 0; i < 20; i++) { cloud2 = await ownerGet('users/' + uid); if (cloud2 && cloud2.plants.filter(p => !p.sum).every(p => Object.keys(p.w || {}).length === 2)) break; await wait(500); }   // the joined copy lands a moment after the devices agree
check('…and the cloud copy has the joined water maps too', cloud2.plants.filter(p => !p.sum).every(p => Object.keys(p.w || {}).length === 2), JSON.stringify(cloud2.plants.map(p => p.w)));
// ---------- 4. harvest on A → produce and the record on A2; A2 buys decor → A sees it ----------
await A.ev(() => { const p = garden().growing[0]; p.w.fill = needOf(p); save(); });   // top it up so it is ready
await until(A, () => garden().ready.length > 0, null, 15000);   // (twice in a full run nothing became ready: a cloud copy that changed nothing had replaced the plant objects while the garden still held the old ones, so the line above filled a plant that was no longer in the account — fixed in v2.0, mergeSyncFrom)
const hv = await A.ev(() => { const p = garden().ready[0]; const h = gardenHarvest(p.id); return { id: h.id, y: h.y, produce: garden().produce }; });
const hvA2 = await until(A2, id => garden().harvested.some(p => p.id === id) && garden().growing.length === 1, hv.id, 15000);
check('A harvests → A2 shows the harvest, the empty plot and the same produce balance', hvA2 >= 0 && (await A2.ev(p => garden().produce === p, hv.produce)), JSON.stringify(hv));
// a richer past: the cloud summary gets 100 produce (as if many old plants had been migrated); both devices pick it up
const prof = await ownerGet('users/' + uid);
await owner('users/' + uid, { plants: prof.plants.map(p => (p.sum ? { ...p, y: 100, grown: 50 } : p)) });
const richA = await until(A, () => garden().produce >= 100, null, 15000), richA2 = await until(A2, () => garden().produce >= 100, null, 15000);
check('A bigger migration summary from the cloud replaces the emptier local one on both devices (more history always wins)', richA >= 0 && richA2 >= 0, JSON.stringify({ richA, richA2 }));
const p0 = await A.ev(() => garden().produce);
await A2.ev(() => { gardenBuy('dc_lantern'); const d = garden().decor[0]; gardenPlace(d.buy.id, 's2'); });
const buyA = await until(A, p0 => garden().decor.length === 1 && garden().placed.s2 && garden().placed.s2.it.id === 'dc_lantern' && garden().produce === p0 - 15, p0, 15000);
check('A2 buys and places a lantern → A sees it placed and the produce spent (never below zero)', buyA >= 0 && (await A.ev(() => garden().produce >= 0)), `${buyA} ms`);
// ---------- 5. the same focus block cannot water twice; a 1.14-style upload from an old device leaves the garden alone ----------
const dup = await A.ev(() => { const s = S.sessions[S.sessions.length - 1]; const before = garden().growing.map(p => waterOf(p)); gardenAfterSession(s); return { before, after: garden().growing.map(p => waterOf(p)) }; });
check('Running the watering again for a session already counted changes nothing (keyed by session id)', JSON.stringify(dup.before) === JSON.stringify(dup.after), JSON.stringify(dup));
await owner('users/' + uid, { todos: [], recent: [] });   // an older version writes its fields with merge: plants / gbuys are not among them
await wait(2500);
const stillThere = await ownerGet('users/' + uid);
check('An older version’s profile upload (no garden fields) keeps the garden in the cloud', Array.isArray(stillThere.plants) && stillThere.plants.length === 3 && stillThere.gbuys.length === 4, JSON.stringify({ plants: stillThere.plants.length, gbuys: stillThere.gbuys.length }));
check('Nothing in the garden is ever deleted, so no garden tombstones exist', await A.ev(() => !Object.keys(S.tomb).some(k => /^(plants|gbuys):/.test(k))));
// ---------- 6. a third device with no cache sees the whole garden on first load ----------
const A3 = await device('A3', 1200);
await login(A3);
const fresh = await A3.ev(() => ({ growing: garden().growing.length, harvested: garden().harvested.length, produce: garden().produce, placed: Object.keys(garden().placed), level: garden().level, migs: S.plants.filter(p => p.id === 'mig1').length }));
check('A device with no cache loads the garden complete: plants, harvest, produce, placed decor, one summary', fresh.growing === 1 && fresh.harvested === 1 && fresh.produce === p0 - 15 && fresh.placed.join() === 's2' && fresh.migs === 1, JSON.stringify(fresh));
log('errors', JSON.stringify(errs.filter(e => !/permission|offline|Could not reach|unavailable|WebChannel|transport/i.test(e))));
log('failures', failCount());
await b.close();
process.exit(failCount() ? 1 : 0);
