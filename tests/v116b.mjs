// v1.16 garden pets: the first egg, eggs filled only by finished focus blocks (raw minutes), deterministic hatching with
// the leftover flowing into the next egg, the reveal (held during focus), boosts applied and capped, slots by garden
// level, duplicates raising a pet's level, milestone eggs created once, bag and almanac, demo, export/import (incl. a
// 1.15 export without eggs), two devices joining egg water and agreeing on the pet.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, focus, ownerGet } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, hasTouch: w < 500, isMobile: w < 500, acceptDownloads: true });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); });
  if (opts.init) await ctx.addInitScript(opts.init, opts.arg);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); S.settings.gardenTour = true; }); }   // v2.0: no garden tour in this suite (its retry timer could land inside an instant test block, and every later pop-up then waits behind it)
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
const fsess = async (d, min) => { await focus(d, min); await wait(1800); await closeAll(d); };
// ---------- 1. the first egg, filled by focus ----------
const G = await guest(1280, { tag: 'pets' });
const first = await G.ev(() => { S.ui.gardenView = 'garden'; showTab('garden'); const e = eggActive(); return { eggs: eggList().length, id: e && e.id, kind: e && e.kind, need: e && eggNeed(e), fill: e && eggFill(e), card: !!$('.gd-egg'), txt: $('.gd-egg') && $('.gd-egg').textContent, slots: petSlots(), pets: petsOwned().length }; });
check('A new garden starts with one common egg in the slot (0 / 300 min), one pet slot and no pets', first.eggs === 1 && first.id === 'egg1' && first.kind === 'common' && first.need === 300 && first.fill === 0 && first.card && /0 \/ 300 min/.test(first.txt) && first.slots === 1 && first.pets === 0, JSON.stringify(first));
await G.ev(() => gardenPlant(0, 'tomato'));
await fsess(G, 25); await fsess(G, 50);
const fill = await G.ev(() => { const e = eggActive(); return { fill: eggFill(e), keys: Object.keys(e.w).length, plantWater: waterOf(garden().growing[0]), txt: (showTab('garden'), $('.gd-egg').textContent) }; });
check('Two finished blocks (25 + 50 min) fill the egg by 75 raw minutes and water the plant to its 70 XP cap (1.17); the card says 75 / 300', fill.fill === 75 && fill.keys === 2 && fill.plantWater === 70 && /75 \/ 300/.test(fill.txt), JSON.stringify(fill));
const twice = await G.ev(() => { const e = eggActive(), s = S.sessions[S.sessions.length - 1]; const before = eggFill(e); gardenAfterSession(s); return before === eggFill(e); });
check('Replaying the same block (another device) adds nothing to the egg', twice);
// ---------- 2. deterministic hatching, the leftover, the reveal ----------
const det = await G.ev(() => { const ids = Array.from({ length: 400 }, (_, i) => 'egg' + (i + 1)); const tally = { common: 0, rare: 0, legendary: 0 }; for (const id of ids) tally[PET_BY_ID[petFor({ id, kind: 'common' })].rarity]++; const same = petFor({ id: 'egg1', kind: 'common' }) === petFor({ id: 'egg1', kind: 'common' }); const leg = Array.from({ length: 200 }, (_, i) => PET_BY_ID[petFor({ id: 'x' + i, kind: 'legendary' })].rarity); return { same, tally, legNoCommon: leg.every(r => r !== 'common'), legMostly: leg.filter(r => r === 'legendary').length / 200 }; });
check('The pet is decided from the egg id alone: the same answer every time; common eggs give ~70 / 25 / 5%, legendary eggs never a common pet', det.same && det.tally.common > 240 && det.tally.common < 320 && det.tally.rare > 60 && det.tally.legendary > 8 && det.legNoCommon && det.legMostly > .45, JSON.stringify(det));
const expectedPet = await G.ev(() => petFor(eggActive()));
await fsess(G, 240);   // 75 + 240 = 315: hatches with 15 left over for egg2
await wait(5500);
const hatch = await G.ev(() => { const e1 = eggList().find(e => e.id === 'egg1'), e2 = eggList().find(e => e.id === 'egg2'); return { h: !!e1.h, pet: e1.pet, hs: e1.hs, e2: !!e2, e2fill: e2 && eggFill(e2), active: eggActive().id, dlg: $('#eggDlg').open, title: $('#egTitle').textContent, owned: petsOwned().map(x => x.id + ':' + x.level), cracked: $('#eggDlg').classList.contains('cracked') }; });
check('At 300 minutes the egg hatches into the predicted pet, the next egg (egg2) exists and holds the 15 leftover minutes, and the reveal dialog opens after the block', hatch.h && hatch.pet === expectedPet && hatch.hs && hatch.e2 && hatch.e2fill === 15 && hatch.active === 'egg2' && hatch.dlg && /hatched/.test(hatch.title) && hatch.owned.length === 1, JSON.stringify(hatch));
await G.ev(() => $('#egOut').click()); await wait(400);
const outNow = await G.ev(() => ({ out: petsOut().map(x => x.id), dlg: $('#eggDlg').open, scene: $$('.gd-pet').length, prefs: S.petPrefs.p1 && S.petPrefs.p1.v }));
check('"Let it out" puts the pet in the garden (slot p1), draws it in the scene and closes the dialog', outNow.out.length === 1 && outNow.out[0] === expectedPet && !outNow.dlg && outNow.scene === 1 && outNow.prefs === expectedPet, JSON.stringify(outNow));
// reveal held during focus
const held = await G.ev(() => { const e = eggList().find(x => x.id === 'egg1'); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); showHatch(e); const during = $('#eggDlg').open, queued = FG.q.some(x => x.kind === 'reveal'); $('#resetBtn').click(); return { during, queued }; });
await wait(2500);
const after = await G.ev(() => { releaseHeld(); return $('#eggDlg').open; });
check('A hatch reveal requested during a focus block waits in the queue and shows once the block is over', !held.during && held.queued && after, JSON.stringify({ held, after }));
await closeAll(G);
// ---------- 3. boosts, caps, slots by level, duplicates ----------
const boosts = await G.ev(() => {
  // make the eggs deterministic for the test: give the garden three hatched eggs of chosen pets
  S.eggs = S.eggs.filter(e => e.id === 'egg2');
  const mk = (id, pet, kind = 'common') => ({ id, v: 1, kind, src: 'focus', at: Date.now() - 10, need: EGG_NEED[kind], w: { x: EGG_NEED[kind] }, h: Date.now() - 5, pet });
  S.eggs.push(mk('t1', 'hummingbird', 'legendary'), mk('t2', 'deer', 'rare'), mk('t3', 'bunny'), mk('t4', 'bunny'), mk('t5', 'bunny'), mk('t6', 'bunny'));
  S.petPrefs = {}; GD = null; save();
  const r = {};
  r.lvl1 = petSlots(); r.eq1 = petEquip('hummingbird'); r.eq2 = petEquip('deer'); r.out1 = petsOut().map(x => x.id);
  const mig = gardenMig(); mig.xp = 500; GD = null; r.lvl5 = petSlots(); r.eq2b = petEquip('deer'); r.eq3 = petEquip('bunny');
  mig.xp = 7000; GD = null; r.lvl8 = petSlots(); r.eq3b = petEquip('bunny'); r.eq4 = petEquip('turtle');
  r.out = petsOut().map(x => x.id + ':' + x.level);
  r.bunnyLevel = petsOwned().find(x => x.id === 'bunny').level;
  r.boost = petBoost();   // 1.17: hummingbird .18 + deer .06 + bunny .10 × 1.5 = .39 → capped at .35; weight deer .12; mut hummingbird .03
  r.dup = petEquip('hummingbird'); r.outAgain = petsOut().length;
  r.un = petUnequip('deer'); r.outAfter = petsOut().map(x => x.id); r.boostAfter = petBoost();
  return r;
});
check('Slots (1.17): 1 at level 1, 2 at level 3, 3 at level 6+; a fourth pet is refused; the same pet cannot be out twice; Bring in frees the slot', boosts.lvl1 === 1 && boosts.eq1 && boosts.eq2 === false && boosts.out1.join() === 'hummingbird' && boosts.lvl5 === 2 && boosts.eq2b && boosts.eq3 === false && boosts.lvl8 === 3 && boosts.eq3b && boosts.eq4 === false && boosts.out.join() === 'hummingbird:1,deer:1,bunny:3' && boosts.dup && boosts.outAgain === 3 && boosts.un && boosts.outAfter.join() === 'hummingbird,bunny', JSON.stringify(boosts));
check('Boosts add up and cap (1.17): water +35% (cap), weight +12%, mutation +3%; a four-times bunny is level 3 (+50% stronger); bringing the deer in drops the weight boost', boosts.bunnyLevel === 3 && boosts.boost.water === .35 && boosts.boost.weight === .12 && boosts.boost.mut === .03 && boosts.boostAfter.weight === 0 && Math.abs(boosts.boostAfter.water - .33) < 1e-9, JSON.stringify(boosts.boost) + ' ' + JSON.stringify(boosts.boostAfter));
const applied = await G.ev(() => { S.plants.push({ id: 'prod1', v: 1, sp: 'marigold', plot: -1, seed: '', at: Date.now() - 5e6, sk: 0, w: { x: 70 }, fin: 'x', fd: 70, h: Date.now() - 1e6, y: 60, m: '', u: Date.now() }); GD = null; const bought = gardenBuy('seed_pumpkin'); const planted = gardenPlant(1, 'pumpkin'); GD = null; const p = garden().growing.find(x => x.plot === 1); if (!p) return { bought, planted, level: garden().level, produce: garden().produce }; const before = waterOf(p); const s = { id: 'bs1', name: 'Physics', start: Date.now() - 100 * 60000, end: Date.now(), duration: 100 * 60000 }; S.sessions.push(s); const gw = gardenAfterSession(s); return { gain: waterOf(p) - before, egg: eggActive() && eggActive().w.bs1, mut: mutationChance({ id: 'x', sp: 'tomato', sk: 0, fd: 0 }), wilt: (3 + petBoost().wilt) }; });
check('A 100-minute block waters the plant 133 XP with +33% water out (the egg gets the raw 100); mutation chance carries the +3%', applied.gain === 133 && applied.egg === 100 && Math.abs(applied.mut - (.06 + .03)) < 1e-9, JSON.stringify(applied));
const bonus = await G.ev(() => { S.petPrefs = { p1: { v: 'fox', u: Date.now() } }; S.eggs.push({ id: 't7', v: 1, kind: 'rare', src: 'focus', at: Date.now(), need: 420, w: { x: 420 }, h: Date.now(), pet: 'fox' }); GD = null; const bb = petBoost().bonus; const ids = Array.from({ length: 300 }, (_, i) => 'pl' + i); const hits = ids.filter(id => hash01(id + ':bonus') < bb).length; return { bb, rate: hits / 300 }; });
check('A fox out gives a 15% chance of bonus produce (1.17; decided from the plant id)', bonus.bb === .15 && bonus.rate > .09 && bonus.rate < .22, JSON.stringify(bonus));
// ---------- 4. milestone eggs created once; the settle of a full egg ----------
const mile = await G.ev(() => { S.eggs = S.eggs.filter(e => !/^egg_lv/.test(e.id)); const a = eggGifts(); const b2 = eggGifts(); const ids = eggList().filter(e => /^egg_lv/.test(e.id)).map(e => e.id + ':' + e.kind); const full = { id: 'egg9', v: 1, kind: 'common', src: 'focus', at: Date.now(), need: 300, w: { a: 200, b: 100 } }; S.eggs.push(full); const st = eggSettle(); return { a, b2, ids, settled: st.map(e => e.id + ':' + e.pet), pet: full.pet === petFor(full) }; });
check('Garden level 8: the level-4 rare and level-8 legendary eggs exist exactly once; an egg filled to 300 by two devices hatches on the next check with the same pet', mile.a.length === 2 && mile.b2.length === 0 && mile.ids.join() === 'egg_lv4:rare,egg_lv8:legendary' && mile.settled.join() === 'egg9:' + mile.settled[0].split(':')[1] && mile.pet, JSON.stringify(mile));
check('Questline finals add a rare egg only from the November 2026 questline on (the rule), with a fixed id per event', await G.ev(() => evStart(EVENT_BY_ID.mon26) >= EGG_EVENT_FROM && evStart(EVENT_BY_ID.hw26) < EGG_EVENT_FROM));
// ---------- 5. bag, almanac, achievements ----------
const bag = await G.ev(() => { S.ui.bagCat = 'pets'; S.ui.bagFilter = 'all'; showTab('bag'); return { cat: !!$('#bagCats [data-bcat="pets"]'), cards: $$('#bagList .pet-card').length, egg: $$('#bagList .gd-item.k-common').length, outBtn: $$('#bagList [data-petunequip]').length, inBtn: $$('#bagList [data-petequip]').length }; });
await G.ev(() => $('#bagList [data-petunequip]').click()); await wait(300);
const bag2 = await G.ev(() => ({ out: petsOut().length, inBtn: $$('#bagList [data-petequip]').length }));
check('The bag has a Pets category with a card per pet (hearts, boost, Let out / Bring in) and the egg in the slot; Bring in works from the bag', bag.cat && bag.cards === 5 && bag.egg >= 1 && bag.outBtn === 1 && bag.inBtn === 4 && bag2.out === 0 && bag2.inBtn === 5, JSON.stringify({ bag, bag2 }));
const alm = await G.ev(() => { S.ui.gardenView = 'almanac'; showTab('garden'); return { cards: $$('.gd-petgrid .pet-card').length, named: $$('.gd-petgrid .pet-card:not(.silhouette)').length, sil: $$('.gd-petgrid .pet-card.silhouette').length, ach: $$('.achlist .ach.done').map(e => e.querySelector('.an').textContent).filter(t => /Company|Menagerie|Best friends/.test(t)).length }; });
check('The almanac lists all 10 pets (5 known, 5 silhouettes) and the pet achievements (Company, Menagerie, Best friends) are earned', alm.cards === 10 && alm.named === 5 && alm.sil === 5 && alm.ach === 3, JSON.stringify(alm));
// ---------- 6. export / import ----------
const srcPets = await G.ev(() => petsOwned().map(x => x.id + ':' + x.level).sort().join());
const [dl] = await Promise.all([G.p.waitForEvent('download'), G.ev(() => $('#exportBtn').click())]);
const path = new URL('./backup-116b.json', import.meta.url).pathname; await dl.saveAs(path);
const json = JSON.parse(fs.readFileSync(path, 'utf8'));
const F = await guest(1280, { tag: 'import' });
await F.p.setInputFiles('#importFile', path); await wait(2500); await closeAll(F);
const imp = await F.ev(() => ({ eggs: eggList().length, pets: petsOwned().map(x => x.id + ':' + x.level).sort().join(), prefs: Object.keys(S.petPrefs).length, egg1: !!eggList().find(e => e.id === 'egg1') }));
await F.p.setInputFiles('#importFile', path); await wait(2500); await closeAll(F);
const imp2 = await F.ev(() => ({ eggs: eggList().length, pets: petsOwned().map(x => x.id + ':' + x.level).sort().join() }));
check('Export carries eggs and petPrefs; a fresh install imports them (its own first egg stays), and a second import changes nothing', json.eggs.length >= 9 && json.petPrefs && imp.pets === srcPets && /bunny:3,deer:1,fox:1,hummingbird:1/.test(imp.pets) && imp.egg1 && imp2.eggs === imp.eggs && imp2.pets === imp.pets, JSON.stringify({ imp, imp2 }));
const old = JSON.parse(JSON.stringify(json)); delete old.eggs; delete old.petPrefs;
const oldPath = new URL('./backup-116b-old.json', import.meta.url).pathname; fs.writeFileSync(oldPath, JSON.stringify(old));
const O = await guest(1280, { tag: 'old' });
await O.p.setInputFiles('#importFile', oldPath); await wait(2500); await closeAll(O);
const oldImp = await O.ev(() => ({ focus: eggList().filter(e => e.src === 'focus').map(e => e.id).join(), active: eggActive() && eggActive().id, pets: petsOwned().length, mile: eggList().filter(e => /^egg_lv/.test(e.id)).map(e => e.id).sort().join(), lvl: garden().level }));
check('A 1.15 export (no eggs, no petPrefs) imports cleanly: one focus egg (egg1) in the slot, the level-8 garden\'s milestone eggs created, no pets', oldImp.focus === 'egg1' && oldImp.active === 'egg1' && oldImp.pets === 0 && oldImp.mile === 'egg_lv4,egg_lv8', JSON.stringify(oldImp));
await F.ctx.close(); await O.ctx.close(); await G.ctx.close();
// ---------- 7. demo ----------
const D = await guest(1280, { noLogin: true, tag: 'demo' });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeAll(D);
const demo = await D.ev(() => { S.ui.gardenView = 'garden'; showTab('garden'); return { pv: isPreview(), out: petsOut().map(x => x.id), owned: petsOwned().map(x => x.id).sort().join(), scene: $$('.gd-pet').length, egg: eggActive() && eggActive().id, fill: eggActive() && eggFill(eggActive()), ls: Object.keys(localStorage).length }; });
await D.ev(() => { openPetsDlg(); }); await wait(300);
await D.ev(() => { const b = $('#gdDlg [data-petunequip]') || $('#gdDlg [data-petequip]:not([disabled])'); b && b.click(); }); await wait(400);   // the demo's one slot is taken, so 'Let out' is disabled: Bring in is the blocked click
const demo2 = await D.ev(() => ({ prompt: !!document.querySelector('dialog[open] #pvWhy'), out: petsOut().length, ls: Object.keys(localStorage).length }));
check('Demo: a bunny out, a fox in the bag, egg2 filling (125 / 300); letting a pet out shows the demo prompt and writes nothing', demo.pv && demo.out.join() === 'bunny' && demo.owned === 'bunny,fox' && demo.scene === 1 && demo.egg === 'egg2' && demo.fill === 125 && demo2.prompt && demo2.out === 1 && demo2.ls === demo.ls, JSON.stringify({ demo, demo2 }));
await D.ctx.close();
// ---------- 8. two devices ----------
const U = 'pt_' + Date.now().toString(36).slice(-4);
const A = await device('A', 1200); await signup(A, U);
const uid = await A.ev(() => USER.uid);
const B = await device('B', 1200);
await B.p.goto('http://localhost:8000/index.html?emulator=1'); await B.p.waitForSelector('#authView:not(.hidden)'); await B.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', U); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit'); await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(B);
const eggsAB = await Promise.all([A, B].map(d => d.ev(() => eggList().map(e => e.id).join())));
check('Both devices hold the same single first egg', eggsAB[0] === 'egg1' && eggsAB[1] === 'egg1', eggsAB.join(' | '));
await fsess(A, 120);
const seenB = await until(B, () => eggActive() && eggFill(eggActive()) === 120, null, 20000);
let cutB = false; await B.ctx.route(/127\.0\.0\.1:(8080|9099)/, r => cutB ? r.abort() : r.continue());
cutB = true; await wait(1000);
await fsess(B, 100);
const bLocal = await B.ev(() => eggFill(eggActive()));
cutB = false;
const joinA = await until(A, () => eggFill(eggActive()) === 220, null, 40000);
const joinB = await until(B, () => eggFill(eggActive()) === 220, null, 40000);
check('A focuses 120 min → B sees 120; B focuses 100 min offline → once online both hold 220 (water maps joined, nothing lost)', seenB >= 0 && bLocal === 220 && joinA >= 0 && joinB >= 0, JSON.stringify({ seenB, bLocal, joinA, joinB }));
await fsess(A, 90);   // 310: hatches on A
await wait(5500); await closeAll(A);
const petA = await A.ev(() => ({ pet: eggList().find(e => e.id === 'egg1').pet, e2: !!eggList().find(e => e.id === 'egg2'), e2fill: eggFill(eggList().find(e => e.id === 'egg2')) }));
const petB = await until(B, () => (eggList().find(e => e.id === 'egg1') || {}).pet, null, 20000);
const bState = await B.ev(() => ({ pet: eggList().find(e => e.id === 'egg1').pet, eggs: eggList().length, e2fill: eggFill(eggList().find(e => e.id === 'egg2') || {}) }));
check('The hatch on A reaches B with the same pet; one egg2 with the 10 leftover minutes on both', petB >= 0 && bState.pet === petA.pet && bState.eggs === 2 && petA.e2 && petA.e2fill === 10 && bState.e2fill === 10, JSON.stringify({ petA, bState }));
const eqA = await A.ev(() => ({ ok: petEquip(eggList().find(e => e.id === 'egg1').pet), out: petsOut().length, pp: Object.keys(S.petPrefs || {}) }));
const outB = await until(B, () => petsOut().length === 1, null, 40000);   // a loaded emulator has taken ~10 s per round trip in the full run
const cloud = await ownerGet('users/' + uid);
check('Letting the pet out on A shows it out on B; eggs and petPrefs live in the profile document', outB >= 0 && cloud && cloud.eggs.length === 2 && cloud.eggs[0].v === 1 && cloud.petPrefs && cloud.petPrefs.p1, JSON.stringify({ eqA, outB, eggs: cloud && cloud.eggs && cloud.eggs.map(e => [e.id, e.v, !!e.h, e.pet, e.w && Object.keys(e.w).length]), pp: cloud && cloud.petPrefs }));
// no sync loop: once the hatch and the pet are on both devices, ten idle seconds write nothing on either (merged copies compare equal, 1.16)
await Promise.all([A, B].map(d => d.ev(() => { window.__w = 0; const sd = FB.setDoc; FB.setDoc = (ref, ...r) => { if (ref.path && ref.path.startsWith('users/')) __w++; return sd(ref, ...r); }; })));
await wait(10000);
const idleWrites = await Promise.all([A, B].map(d => d.ev(() => __w)));
check('No sync loop after a hatch on two devices: ten idle seconds write no profile on either device', idleWrites[0] === 0 && idleWrites[1] === 0, JSON.stringify(idleWrites));
await A.ctx.close(); await B.ctx.close();
log('errors', errs);
log(`${failCount()} failed`);
await b.close();
process.exit(failCount() || errs.length ? 1 : 0);
