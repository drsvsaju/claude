// v1.16 security: attacks on the new public fields (publicStats.produce / .harvests, publicProfiles.big) as a
// malicious signed-in user against the 1.16 rules. Prints the table (attack → result) and fails if any result
// differs from what the rules must give.
import { b, device, signup, wait, log, check, errs, failCount, ownerGet, tryOp } from './cl-common.mjs';
const den = r => /permission-denied|PERMISSION_DENIED/.test(String(r)) ? 'denied' : r === 'ALLOWED' ? 'ALLOWED' : String(r).slice(0, 60);
const rows = [];
const att = (name, got, expect) => { rows.push([name, got, expect]); check(`${name} → ${got}`, got === expect, `expected ${expect}`); };
const R = 's' + Date.now().toString(36).slice(-4);
const X = await device('X', 1000), Y = await device('Y', 1000);
await Promise.all([signup(X, 'x' + R), signup(Y, 'y' + R)]);
const uid = { X: await X.ev(() => USER.uid), Y: await Y.ev(() => USER.uid) };
const raw = (d, src, ...args) => tryOp(d, src, ...args).then(den);
// X publishes once with garden totals (two harvests, 60 produce) so its documents exist under the 1.16 rules
await X.ev(() => { for (let i = 0; i < 2; i++) S.plants.push({ id: 'sh' + i, v: 1, sp: 'tomato', plot: -1, seed: '', at: Date.now() - 9e6 - i, sk: 0, w: { x: 90 }, fin: 'x', fd: 90, h: Date.now() - 8e6 + i, y: 30, m: '', kg: .2, u: Date.now() }); GD = null; G = null; S.settings.globalBoard = true; save(); publishPublic(); });
await wait(3000);
const d0 = await ownerGet('publicStats/' + uid.X);
check('Setup: X’s stats carry produce 60 and harvests 2', d0.produce === 60 && d0.harvests === 2, JSON.stringify([d0.produce, d0.harvests]));
const setStats = patch => `async () => { const r = FB.doc(FB.db, 'publicStats', USER.uid), d = (await FB.getDoc(r)).data(); const n = { ...d, ...(${patch}) }; for (const k of Object.keys(n)) if (n[k] === undefined) delete n[k]; await FB.setDoc(r, { ...n, updatedAt: FB.serverTimestamp() }); }`;
const setProf = patch => `async () => { const r = FB.doc(FB.db, 'publicProfiles', USER.uid), d = (await FB.getDoc(r)).data(); const n = { ...d, ...(${patch}) }; for (const k of Object.keys(n)) if (n[k] === undefined) delete n[k]; await FB.setDoc(r, { ...n, updatedAt: FB.serverTimestamp() }); }`;
// ---------- publicStats: produce / harvests ----------
att('Lower my produce by 1', await raw(X, setStats('{ produce: d.produce - 1 }')), 'denied');
att('Add 5,000 produce in one write (minutes ago: ~0, so at most 480 allowed)', await raw(X, setStats('{ produce: d.produce + 5000 }')), 'denied');
att('Add 481 produce in one write (just over the fresh-write allowance)', await raw(X, setStats('{ produce: d.produce + 481 }')), 'denied');
att('Add 300 produce in one write (within the allowance)', await raw(X, setStats('{ produce: d.produce + 300 }')), 'ALLOWED');
att('Add 40 harvests in one write (at most 10 allowed on a fresh write)', await raw(X, setStats('{ harvests: d.harvests + 40 }')), 'denied');
att('Add 3 harvests in one write', await raw(X, setStats('{ harvests: d.harvests + 3 }')), 'ALLOWED');
att('Lower my harvests by 1', await raw(X, setStats('{ harvests: d.harvests - 1 }')), 'denied');
att('Produce as a string', await raw(X, setStats('{ produce: "lots" }')), 'denied');
att('Produce as a fraction', await raw(X, setStats('{ produce: d.produce + 0.5 }')), 'denied');
att('Harvests negative', await raw(X, setStats('{ harvests: -5 }')), 'denied');
att('Produce above the ceiling (10,000,001) on a fresh document', await raw(Y, `async () => { const r = FB.doc(FB.db, 'publicStats', USER.uid); await FB.setDoc(r, { username: USER.username, level: 1, tier: 'novice', frame: 'frame_none', color: 'col_default', global: true, dayKey: dayKey(new Date()), dayMin: 0, weekKey: dayKey(weekStartOf(new Date(), 1)), weekMin: 0, weekKeySun: dayKey(weekStartOf(new Date(), 0)), weekMinSun: 0, monthKey: monthKeyOf(new Date()), monthMin: 0, lifeMin: 0, lastWeekKey: dayKey(addDays(weekStartOf(new Date(), 1), -7)), lastWeekMin: 0, produce: 10000001, harvests: 0, updatedAt: FB.serverTimestamp() }); }`), 'denied');
att('A document from an older app (no produce / harvests at all) is still accepted', await raw(X, setStats('{ produce: undefined, harvests: undefined }')), 'ALLOWED');
att('…and adding the totals to it afterwards takes the whole value once (self-reported, like lifeMin on a first upload)', await raw(X, setStats('{ produce: 999, harvests: 40 }')), 'ALLOWED');
att('…after which the growth rule applies again (+5,000 refused)', await raw(X, setStats('{ produce: d.produce + 5000 }')), 'denied');
att('Write another person’s stats', await raw(Y, `async () => { const r = FB.doc(FB.db, 'publicStats', '${uid.X}'), d = (await FB.getDoc(r)).data(); await FB.setDoc(r, { ...d, produce: 1, updatedAt: FB.serverTimestamp() }); }`), 'denied');
att('A signed-in user lists the global board by produce (limit 50)', await Y.ev(async () => { try { const qs = await FB.getDocs(FB.query(FB.collection(FB.db, 'publicStats'), FB.where('global', '==', true), FB.orderBy('produce', 'desc'), FB.limit(50))); return qs.size >= 1 ? 'ALLOWED' : 'empty'; } catch (e) { return e.code || e.message; } }).then(den), 'ALLOWED');
att('…and counts the people above a value (the rank query)', await Y.ev(async () => { try { const c = await FB.getCountFromServer(FB.query(FB.collection(FB.db, 'publicStats'), FB.where('global', '==', true), FB.where('produce', '>', 5))); return c.data().count >= 1 ? 'ALLOWED' : 'none'; } catch (e) { return e.code || e.message; } }).then(den), 'ALLOWED');
// ---------- publicProfiles: big ----------
att('big = "tomato:2.04"', await raw(X, setProf('{ big: "tomato:2.04" }')), 'ALLOWED');
att('big = "pumpkin:12"', await raw(X, setProf('{ big: "pumpkin:12" }')), 'ALLOWED');
att('big = "tomato:abc"', await raw(X, setProf('{ big: "tomato:abc" }')), 'denied');
att('big = "Tomato:1" (capital)', await raw(X, setProf('{ big: "Tomato:1" }')), 'denied');
att('big = "<script>:1"', await raw(X, setProf('{ big: "<script>:1" }')), 'denied');
att('big = "tomato:12345" (weight too long)', await raw(X, setProf('{ big: "tomato:12345" }')), 'denied');
att('big as a number', await raw(X, setProf('{ big: 12 }')), 'denied');
att('big 60 characters long', await raw(X, setProf('{ big: "a".repeat(30) + ":" + "1".repeat(29) }')), 'denied');
att('A profile without big (older app) is still accepted', await raw(X, setProf('{ big: undefined }')), 'ALLOWED');
att('Another user cannot set my big', await raw(Y, `async () => { const r = FB.doc(FB.db, 'publicProfiles', '${uid.X}'), d = (await FB.getDoc(r)).data(); await FB.setDoc(r, { ...d, big: 'tomato:1', updatedAt: FB.serverTimestamp() }); }`), 'denied');
log('\n| Attack | Result | Must be |\n|---|---|---|\n' + rows.map(([n, g, e]) => `| ${n} | ${g} | ${e} |`).join('\n'));
await X.ctx.close(); await Y.ctx.close();
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
