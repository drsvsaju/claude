// v1.15 data safety across versions and devices: a 1.14.3 backup imported into a fresh 1.15 install (garden credit,
// idempotent re-import), a 1.15 backup imported twice (no doubles), offline edits of every new type reaching the cloud
// and a second device, tombstones for decks / plan subjects / saved rooms, a device with a clock 2 h ahead (newer wins,
// both converge), and a brand-new account on two devices (one migration record).
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, focus, ownerGet } from './cl-common.mjs';
import fs from 'fs';
const R = Date.now().toString(36).slice(-4);
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
async function guest(page, w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 }, hasTouch: w < 500, isMobile: w < 500, acceptDownloads: true });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); });
  if (opts.init) await ctx.addInitScript(opts.init);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); p.on('dialog', d => d.accept()); p.on('pageerror', e => errs.push(page + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(page + ' console: ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/' + page); await p.waitForSelector('#authView:not(.hidden)');
  await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
// Sessions as 1.14.3 stored them: 60 days, 2–3 a day, long ones on some days (the old garden grew golden plants from those).
const seedOld = () => {
  const ss = [], now = Date.now();
  for (let d = 1; d <= 60; d++) for (let k = 0; k < 2 + (d % 2); k++) { const st = new Date(now - d * 864e5); st.setHours(8 + k * 4, 5, 0, 0); const len = d % 3 ? 25 : 55; ss.push({ id: `old${d}_${k}`, name: ['Physics', 'Maths', 'Chemistry'][(d + k) % 3], start: +st, end: +st + len * 6e4, duration: len * 6e4, planned: len * 6e4, preset: 'Classic 25/5' }); }
  localStorage.setItem('focus-app-v1', JSON.stringify({ sessions: ss.sort((a, b) => a.start - b.start), settings: { goalMin: 60 } }));
};
// ---------- 1. a 1.14.3 backup ----------
const O = await guest('before.html', 1280, { init: seedOld });
const [dl] = await Promise.all([O.p.waitForEvent('download'), O.ev(() => $('#exportBtn').click())]);
const oldPath = new URL('./backup-1143.json', import.meta.url).pathname; await dl.saveAs(oldPath); const oldJson = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
check('1.14.3 build exports a backup without any 1.15 field', oldJson.sessions.length === 150 && !('plants' in oldJson) && !('decks' in oldJson) && !('plan' in oldJson) && !('roomPrefs' in oldJson), `${oldJson.sessions.length} sessions, keys: ${Object.keys(oldJson).length}`);
const oldGarden = await O.ev(() => { const g = typeof gardenStats === 'function' ? gardenStats(gardenItems(0, Date.now())) : null; return g ? { grown: g.grown, golden: g.golden, ripe: g.ripe } : null; });
log('  old garden from those sessions:', JSON.stringify(oldGarden));
await O.ctx.close();
// ---------- 2. import it into a fresh 1.15 guest ----------
const N = await guest('index.html');
const fresh = await N.ev(() => ({ migs: S.plants.filter(p => p.id === 'mig1').length, grown: gardenMig().grown, starters: S.gbuys.filter(x => /^st[123]$/.test(x.id)).length }));
check('A fresh install starts with an empty migration record and three starter seeds', fresh.migs === 1 && fresh.grown === 0 && fresh.starters === 3, JSON.stringify(fresh));
await N.p.setInputFiles('#importFile', oldPath); await wait(2500); await closeAll(N);
const imp = await N.ev(() => ({ sessions: S.sessions.length, migs: S.plants.filter(p => p.id === 'mig1').length, mig: gardenMig(), starters: S.gbuys.filter(x => /^st[123]$/.test(x.id)).length, buys: S.gbuys.filter(x => x && !/^(wq|wqs|tr|trs)_/.test(x.id)).length, plants: S.plants.length, produce: garden().produce - ((S.gbuys || []).filter(x => x && x.src === 'quest').reduce((a, x) => a + Math.min(100, Math.round(+x.bonus || 0)), 0)), level: garden().level, decks: S.decks.length, plan: S.plan.length, tab: S.ui.tab }));
check('The old backup imports: every session, one migration record, no extra lists', imp.sessions === 150 && imp.migs === 1 && imp.starters === 3 && imp.buys === 3 && imp.plants === 1 && imp.decks === 0 && imp.plan === 0, JSON.stringify({ ...imp, mig: undefined }));
check('…and the plants those sessions grew in 1.14 are credited (produce and garden XP), as an in-place upgrade would', imp.mig.grown === oldGarden.grown && imp.mig.golden === oldGarden.golden && imp.mig.y > 0 && imp.mig.xp > 0 && imp.produce === imp.mig.y && imp.level >= 2, JSON.stringify(imp.mig));
await N.p.setInputFiles('#importFile', oldPath); await wait(2500); await closeAll(N);
const imp2 = await N.ev(() => ({ sessions: S.sessions.length, migs: S.plants.filter(p => p.id === 'mig1').length, grown: gardenMig().grown, y: gardenMig().y, starters: S.gbuys.filter(x => /^st[123]$/.test(x.id)).length, produce: garden().produce - ((S.gbuys || []).filter(x => x && x.src === 'quest').reduce((a, x) => a + Math.min(100, Math.round(+x.bonus || 0)), 0)) }));
check('Importing the same backup again changes nothing (idempotent)', imp2.sessions === 150 && imp2.migs === 1 && imp2.grown === imp.mig.grown && imp2.y === imp.mig.y && imp2.starters === 3 && imp2.produce === imp.produce, JSON.stringify(imp2));
// ---------- 3. a 1.15 backup with every new list, imported twice into another guest ----------
await N.ev(() => { gardenPlant(0, 'tomato'); gardenPlant(1, 'sunflower'); const d = addDeck('Organic', 'Chemistry'); addCard(d.id, 'Aldol', 'β-hydroxy carbonyl'); addCard(d.id, 'Cannizzaro', 'disproportionation'); savePlan([{ name: 'Physics', hrs: 5 }, { name: 'Chemistry', hrs: 4 }]); saveRoomSet('Cosy'); });
await wait(300);
const [dl2] = await Promise.all([N.p.waitForEvent('download'), N.ev(() => $('#exportBtn').click())]);
const newPath = new URL('./backup-115.json', import.meta.url).pathname; await dl2.saveAs(newPath); const newJson = JSON.parse(fs.readFileSync(newPath, 'utf8'));
check('A 1.15 backup carries plants, gbuys, decks, cards, plan, roomPrefs and roomSets', newJson.plants.length === 3 && newJson.gbuys.filter(x => !/^(wq|wqs|tr|trs)_/.test(x.id)).length === 3 && newJson.decks.length === 1 && newJson.cards.length === 2 && newJson.plan.length === 2 && newJson.roomSets.length === 1 && typeof newJson.roomPrefs === 'object', Object.keys(newJson).filter(k => /plant|gbuy|deck|card|plan|room/.test(k)).join(','));
const M = await guest('index.html');
await M.p.setInputFiles('#importFile', newPath); await wait(2500); await closeAll(M);
await M.p.setInputFiles('#importFile', newPath); await wait(2500); await closeAll(M);
const twice = await M.ev(() => ({ sessions: S.sessions.length, plants: S.plants.length, migs: S.plants.filter(p => p.id === 'mig1').length, growing: garden().growing.length, buys: S.gbuys.filter(x => x && !/^(wq|wqs|tr|trs)_/.test(x.id)).length, seeds: S.gbuys.filter(x => /^st[123]$/.test(x.id)).length, decks: S.decks.length, cards: S.cards.length, plan: S.plan.length, sets: S.roomSets.length, produce: (garden().produce - ((S.gbuys || []).filter(x => x && x.src === 'quest').reduce((a, x) => a + Math.min(100, Math.round(+x.bonus || 0)), 0))), neg: (garden().produce - ((S.gbuys || []).filter(x => x && x.src === 'quest').reduce((a, x) => a + Math.min(100, Math.round(+x.bonus || 0)), 0))) < 0 }));
check('Imported twice into another install: nothing doubled, produce not negative, one migration record', twice.sessions === 150 && twice.plants === 3 && twice.migs === 1 && twice.growing === 2 && twice.buys === 3 && twice.seeds === 3 && twice.decks === 1 && twice.cards === 2 && twice.plan === 2 && twice.sets === 1 && !twice.neg, JSON.stringify(twice));
await N.ctx.close(); await M.ctx.close();
// ---------- 4. offline edits of every new type, then back online ----------
const U = 'ds_' + R;
async function login(d, extraInit) {
  await d.p.goto('http://localhost:8000/index.html?emulator=1'); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await d.p.click('[data-mode=login] >> visible=true'); await d.p.fill('#authUser', U); await d.p.fill('#authPass', 'secret12'); await d.p.click('#authSubmit');
  await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(d);
}
const A = await device('A', 1200);
await signup(A, U);
const uid = await A.ev(() => USER.uid);
const B = await device('B', 1200);
await login(B);
let cut = false; await A.ctx.route(/127\.0\.0\.1:(8080|9099)/, r => cut ? r.abort() : r.continue());
cut = true; await wait(1500);
await A.ev(() => { gardenPlant(0, 'tomato'); const d = addDeck('Offline deck', 'Physics'); addCard(d.id, 'Made offline', 'yes'); savePlan([{ name: 'Physics', hrs: 7 }]); saveRoomSet('Offline room'); });
await focus(A, 25); await wait(2500); await closeAll(A);
const offl = await A.ev(() => ({ plant: garden().growing.length, water: waterOf(garden().growing[0]), deck: S.decks.length, card: S.cards.length, plan: S.plan.length, sets: S.roomSets.length, sessions: S.sessions.length }));
check('Offline: a planting, a focus block that watered it, a deck + card, a plan and a saved room all land locally', offl.plant === 1 && offl.water === 25 && offl.deck === 1 && offl.card === 1 && offl.plan === 1 && offl.sets === 1 && offl.sessions === 1, JSON.stringify(offl));
cut = false;
const seenB = await until(B, () => garden().growing.length === 1 && waterOf(garden().growing[0]) === 25 && S.decks.length === 1 && S.cards.length === 1 && S.plan.length === 1 && S.roomSets.length === 1, null, 40000);
check('Back online: everything reaches the other device (plant with its water, deck, card, plan, saved room)', seenB >= 0, `${seenB} ms`);
const cloud = await ownerGet('users/' + uid);
check('The profile document holds all of it under users/{uid} with version stamps', cloud && cloud.plants.some(p => p.v === 1 && !p.sum && p.w) && cloud.decks.length === 1 && cloud.decks[0].v === 1 && cloud.cards.length === 1 && cloud.cards[0].v === 1 && cloud.plan.length === 1 && cloud.plan[0].v === 1 && cloud.roomSets.length === 1 && cloud.roomSets[0].v === 1, cloud ? Object.keys(cloud).filter(k => /plant|gbuy|deck|card|plan|room/.test(k)).join(',') : 'no doc');
// ---------- 5. tombstones ----------
await A.ev(() => { deleteDeck(S.decks[0].id); savePlan([]); deleteRoomSet(S.roomSets[0].id); });
const goneB = await until(B, () => S.decks.length === 0 && S.cards.length === 0 && S.plan.length === 0 && S.roomSets.length === 0, null, 20000);
check('Deleting the deck (and its card), the plan subject and the saved room on A removes them on B', goneB >= 0, `${goneB} ms`);
await A.p.reload(); await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeAll(A);
const stay = await A.ev(() => ({ decks: S.decks.length, cards: S.cards.length, plan: S.plan.length, sets: S.roomSets.length, tomb: Object.keys(S.tomb).filter(k => /^(decks|cards|plan|roomSets):/.test(k)).length, plant: garden().growing.length }));
check('After a reload they stay deleted (tombstones), the plant stays', stay.decks === 0 && stay.cards === 0 && stay.plan === 0 && stay.sets === 0 && stay.tomb >= 4 && stay.plant === 1, JSON.stringify(stay));
// ---------- 6. a device whose clock is 2 h ahead ----------
const C = await device('C', 1200);
// (+8 min: the activity rules refuse a newest session more than 10 min in the future, so a clock hours ahead cannot publish activity — an accepted, pre-existing limit)
await C.ctx.addInitScript(() => { const R = Date, off = 8 * 60e3; const D = function (...a) { return a.length ? new R(...a) : new R(R.now() + off); }; D.prototype = R.prototype; D.now = () => R.now() + off; D.UTC = R.UTC; D.parse = R.parse; window.Date = D; });
await login(C);
await A.ev(() => addDeck('Shared deck', 'Maths'));
const cHas = await until(C, () => S.decks.length === 1, null, 15000);
check('C (clock 8 min ahead) receives A’s deck', cHas >= 0, `${cHas} ms`);
await C.ev(() => editDeck(S.decks[0].id, { name: 'From C' }));
await wait(1200);
await A.ev(() => editDeck(S.decks[0].id, { name: 'From A' }));
await wait(6000);
const names = await Promise.all([A, B, C].map(d => d.ev(() => S.decks[0] && S.decks[0].name)));
check('Both renamed the deck; every device ends on the same name (the later stamp wins — C’s, 8 min ahead)', names.every(n => n === names[0]) && names[0] === 'From C', names.join(' | '));
await C.ev(() => gardenPlant(3, 'tomato'));
await until(A, () => garden().growing.length === 2, null, 15000);
await focus(A, 25); await wait(2500); await closeAll(A);
await focus(C, 25); await wait(2500); await closeAll(C);
const conv = await until(C, () => S.sessions.length === 3 && garden().growing.every(p => waterOf(p) > 0), null, 20000);
const wA = await A.ev(() => garden().growing.map(p => [p.plot, waterOf(p)]).sort());
const wC = await C.ev(() => garden().growing.map(p => [p.plot, waterOf(p)]).sort());
check('Both devices watered the garden; water totals converge despite the clock skew', conv >= 0 && JSON.stringify(wA) === JSON.stringify(wC) && wA.every(([, w]) => w > 0), `${JSON.stringify(wA)} vs ${JSON.stringify(wC)}`);
// ---------- 7. a brand-new account on two devices ----------
const U2 = 'nw_' + R;
const D1 = await device('D1', 1200); await signup(D1, U2);
const D2 = await device('D2', 390); await D2.p.goto('http://localhost:8000/index.html?emulator=1'); await D2.p.waitForSelector('#authView:not(.hidden)'); await D2.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await D2.p.click('[data-mode=login] >> visible=true'); await D2.p.fill('#authUser', U2); await D2.p.fill('#authPass', 'secret12'); await D2.p.click('#authSubmit'); await D2.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(3000); await closeDlg(D2);
const nw = await Promise.all([D1, D2].map(d => d.ev(() => { const out = {}; for (const t of ['garden', 'room', 'reminders', 'stats', 'shop', 'bag']) { showTab(t); out[t] = !!document.querySelector('.tab.active'); } S.ui.remView = 'cards'; renderCards(); return { ...out, migs: S.plants.filter(p => p.id === 'mig1').length, grown: gardenMig().grown, starters: S.gbuys.filter(x => /^st[123]$/.test(x.id)).length, plots: garden().plots, seeds: Object.values(garden().seeds).flat().length, cardsEmpty: /no cards|first deck|Make a deck|deck/i.test($('#cardsBody').textContent), planEmpty: !!$('#planSlot') }; })));
check('A new account: one empty migration record and three starter seeds on both devices, 4 plots, every new tab renders', nw.every(x => x.migs === 1 && x.grown === 0 && x.starters === 3 && x.plots === 4 && x.seeds === 3 && x.garden && x.room && x.reminders && x.stats && x.cardsEmpty), JSON.stringify(nw));
for (const d of [A, B, C, D1, D2]) await d.ctx.close();
log('errors', errs);
log(`${failCount()} failed`);
await b.close();
process.exit(failCount() || errs.length ? 1 : 0);
