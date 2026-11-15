// v1.17 Phase 4 — pets round 2: three slots (garden levels 1 / 3 / 6), the buffs and caps, every egg filled in full
// by every block, deterministic pet mutations with their look and ×1.25 boosts; bag, almanac, hatch reveal; sync; demo.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, focus, until } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const A = await device('A', 1280);
await signup(A, 'pt_' + R);
await closeDlg(A);
// ---------- slots and buffs ----------
const base = await A.ev(() => { const mig = S.plants.find(p => p.id === 'mig1'); const at = lv => { mig.xp = GXP_LEVELS[lv - 1]; GD = null; return petSlots(); }; const r = { l1: at(1), l2: at(2), l3: at(3), l5: at(5), l6: at(6), l9: at(9) }; mig.xp = 40; GD = null; return { ...r, slotsAt: PET_SLOTS_AT, caps: BOOST_CAP, pets: Object.fromEntries(PETS.map(p => [p.id, p.boost])) }; });
check('Pet slots: one at level 1, two at level 3, three at level 6', base.l1 === 1 && base.l2 === 1 && base.l3 === 2 && base.l5 === 2 && base.l6 === 3 && base.l9 === 3 && base.slotsAt.join() === '1,3,6', JSON.stringify(base));
check('Buffs raised (bunny +10% water, fox +15% produce, hummingbird +18% water, snail +18% weight) and caps raised (water 35%, mutation 10%, wilt 3 days, bonus 30%, weight 35%)', base.pets.bunny.water === .10 && base.pets.fox.bonus === .15 && base.pets.hummingbird.water === .18 && base.pets.snail.weight === .18 && base.pets.hedgehog.wilt === 1.5 && base.caps.water === .35 && base.caps.mut === .10 && base.caps.wilt === 3 && base.caps.bonus === .30 && base.caps.weight === .35, JSON.stringify({ caps: base.caps }));
// ---------- eggs filled in full ----------
const eggs = await A.ev(() => { const mig = S.plants.find(p => p.id === 'mig1'); mig.xp = GXP_LEVELS[5]; GD = null; reconcileRewards('quiet'); return { list: eggList().filter(e => !e.h).map(e => [e.id, e.kind, e.src]) }; });
check('At garden level 6 the milestone egg (level 4) is in the queue beside the focus egg', eggs.list.some(e => e[0] === 'egg_lv4') && eggs.list.some(e => e[2] === 'focus'), JSON.stringify(eggs));
await focus(A, 40); await wait(1200); await closeDlg(A);
const fill = await A.ev(() => ({ fills: eggList().filter(e => !e.h).map(e => [e.id, eggFill(e)]), marks: eggList().filter(e => !e.h).every(e => Object.keys(e.w || {}).length === 1) }));
check('A 40-min block gives every egg in the queue its full 40 minutes (no sharing), each egg marked once', fill.fills.length >= 2 && fill.fills.every(x => x[1] === 40) && fill.marks, JSON.stringify(fill));
const chain = await A.ev(() => { const e = eggList().find(x => x.src === 'focus' && !x.h); e.w = { pre: 290 }; const lv4 = eggList().find(x => x.id === 'egg_lv4'); lv4.w = { pre: 410 }; GD = null; save(); return { ok: true }; });
await focus(A, 30); await wait(1500); await closeDlg(A);
const after = await A.ev(() => { const hatched = eggList().filter(e => e.h).map(e => [e.id, e.pet, petMutOf(e)]); const next = eggList().find(x => x.src === 'focus' && !x.h); return { hatched, next: next && [next.id, eggFill(next)] }; });
check('Both eggs hatch on the block that fills them; the focus egg\'s 20 leftover minutes flow into the next focus egg', after.hatched.length === 2 && after.next && after.next[0] === 'egg2' && after.next[1] === 20, JSON.stringify(after));
await A.ev(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); }); await wait(600); await A.ev(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); hatchQueue.length = 0; });
// ---------- mutations: deterministic, the odds, the look, ×1.25 ----------
const mut = await A.ev(() => {
  const n = { '': 0 }; for (const k of Object.keys(PET_MUTS)) n[k] = 0;
  for (let i = 0; i < 20000; i++) n[petMutOf({ id: 'e' + i, kind: 'common' })]++;
  const legend = Array.from({ length: 20000 }, (_, i) => petMutOf({ id: 'l' + i, kind: 'legendary' })).filter(Boolean).length / 20000;
  const same = petMutOf({ id: 'fixed-egg-1', kind: 'rare' }) === petMutOf({ id: 'fixed-egg-1', kind: 'rare' });
  const commonRate = (20000 - n['']) / 20000;
  return { commonRate, legend, same, kinds: Object.keys(PET_MUTS).filter(k => n[k] > 0).length };
});
check('Mutation odds ≈ 8% (common) and ≈ 15% (legendary), six kinds, the same answer every time for the same egg', Math.abs(mut.commonRate - .08) < .01 && Math.abs(mut.legend - .15) < .012 && mut.same && mut.kinds === 6, JSON.stringify(mut));
const look = await A.ev(() => {
  // a hatched egg whose id rolls a mutation: find one, give it the bunny
  let id = ''; for (let i = 0; i < 5000 && !id; i++) if (petMutOf({ id: 'mut' + i, kind: 'common' }) === 'golden') id = 'mut' + i;
  S.eggs.push({ id, v: 1, kind: 'common', src: 'focus', at: Date.now() - 5000, u: Date.now(), need: 300, h: Date.now() - 4000, pet: 'bunny', hs: 'x' });
  GD = null; save();
  const own = petsOwned().find(x => x.id === 'bunny');
  petEquip('bunny'); GD = null;
  const boost = petBoost();
  showTab('garden'); S.ui.gardenView = 'garden'; renderGarden();
  const scene = document.querySelector('.gd-pet.pet-bunny'), line = ($('.gd-petsline') || {}).textContent;
  openPetsDlg(); const dlgTxt = $('#gdDlgBody').textContent, dlgTag = !!$('#gdDlgBody .tag.pm'); $('#gdDlg').close();
  showTab('bag'); S.ui.bagCat = 'all'; renderBag(); const bag = [...document.querySelectorAll('.bag-item.pet-card')].find(x => /bunny/i.test(x.textContent));
  S.ui.gardenView = 'almanac'; showTab('garden'); renderGarden(); const alm = $('#gardenBody').textContent;
  const e = eggList().find(x => x.id === id); FG.q.length = 0; document.querySelectorAll('dialog[open]').forEach(d => d.close()); showHatch(e); const title = $('#egTitle').textContent, svg = $('#egPet svg').className.baseVal; $('#eggDlg').close();
  return { pm: own && own.pm, n: own && own.n, water: boost.water, sceneCls: scene && scene.className, line, dlgGolden: /Golden Bunny/.test(dlgTxt), dlgTag, bag: bag && /Golden Bunny/.test(bag.textContent) && !!bag.querySelector('.pm-golden'), alm: /Golden Bunny/.test(alm) && /mutations: ✨ Golden/.test(alm), title, svg };
});
check('A Golden bunny: ×1.25 water (12.5%), the golden look in the scene, the egg line, the pets dialog, the bag and the almanac, and a reveal titled "✨ A Golden Bunny!" (the pets dialog shows the Out tag while it is out)', look.pm === 'golden' && Math.abs(look.water - .125) < 1e-6 && /pm-golden/.test(look.sceneCls || '') && /Golden Bunny/.test(look.line || '') && look.dlgGolden && look.bag && look.alm && look.title === '✨ A Golden Bunny!' && /pm-golden/.test(look.svg), JSON.stringify(look));
// caps with three pets out
const cap = await A.ev(() => { for (const [id, lvl] of [['hummingbird', 1], ['deer', 1]]) S.eggs.push({ id: 'cap_' + id, v: 1, kind: 'legendary', src: 'lv8', at: Date.now() - 3000, u: Date.now(), need: 600, h: Date.now() - 2000, pet: id, hs: 'y' }); GD = null; save(); petEquip('hummingbird'); petEquip('deer'); GD = null; return { out: petsOut().map(x => x.id), b: petBoost() }; });
check('Three pets out at level 6; their boosts add up and stay under the caps (water capped at 35%)', cap.out.length === 3 && cap.b.water === .35 && cap.b.weight <= .35 && cap.b.mut <= .10, JSON.stringify(cap));
// sync + export: the mutation is derived from the egg id, so another device shows the same pet; petPrefs carry three slots
const B = await device('B', 1280);
await B.p.goto('http://localhost:8000/index.html?emulator=1'); await B.p.waitForSelector('#authView:not(.hidden)');
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', 'pt_' + R); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
const seen = await until(B, () => !!(USER && typeof petsOut === 'function' && petsOut().length === 3), null, 40000);
log('seen', seen, JSON.stringify(await B.ev(() => ({ out: petsOut().length, fld: firstLoadDone, hasS: typeof window.S }))));
const onB = await B.ev(() => ({ out: petsOut().map(x => [x.id, x.pm]), water: petBoost().water, slots: petSlots() }));
check('A second device shows the same three pets out, the same Golden bunny and the same boosts', seen >= 0 && onB.out.length === 3 && onB.out.find(x => x[0] === 'bunny')[1] === 'golden' && onB.water === .35 && onB.slots === 3, JSON.stringify(onB));
const ex = await A.ev(() => { const data = (({ timer, ui, pendingSessions, profileDirty, ...d }) => d)(S); const j = JSON.parse(JSON.stringify(data)); return { eggs: j.eggs.length >= 4, prefs: Object.keys(j.petPrefs).length === 3 }; });
check('The export carries the eggs and the three pet slots', ex.eggs && ex.prefs, JSON.stringify(ex));
// demo: pets with mutations show, letting one out shows the prompt
const D = await device('D', 1280, { noLogin: true, tag: 'demo' });
await D.p.goto('http://localhost:8000/index.html?emulator=1'); await D.p.waitForSelector('#authView:not(.hidden)');
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeDlg(D);
const demo = await D.ev(() => { showTab('garden'); S.ui.gardenView = 'garden'; renderGarden(); openPetsDlg(); const ls = Object.keys(localStorage).length; const btn = $('#gdDlgBody [data-petequip]'); if (btn) btn.click(); return { pv: isPreview(), pets: petsOwned().length, slots: petSlots(), prompt: !!document.querySelector('dialog[open] #pvWhy'), ls: Object.keys(localStorage).length === ls }; });
check('Demo: pets and slots show; letting one out shows the demo prompt and writes nothing', demo.pv && demo.pets >= 1 && demo.slots >= 1 && demo.prompt && demo.ls, JSON.stringify(demo));
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
