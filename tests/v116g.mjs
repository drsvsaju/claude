// v1.16 edge cases across the new data: a wipe (guest) re-migrates with a fresh first egg and no looks; guest data
// (eggs, a pet out, a look, weighted + mutated harvests) merges into a new account; a 1.14 export (no garden at all)
// imports into 1.16 cleanly; two devices buying the same look while one is offline → one copy, the other refunded.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, ownerGet } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 }, acceptDownloads: true });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
const inject = d => d.ev(src => { window.seed116 = new Function('return ' + src)(); }, seed116.toString());   // the seeding helper runs inside the page
const seed116 = () => {
  const now = Date.now();
  for (let i = 0; i < 3; i++) S.sessions.push({ id: 'gs' + i, name: 'Maths', start: now - (i + 1) * 864e5, end: now - (i + 1) * 864e5 + 25 * 60000, duration: 25 * 60000, planned: 25 * 60000, preset: 'Classic 25/5' });
  for (let i = 0; i < 8; i++) S.plants.push({ id: 'eh' + i, v: 1, sp: 'tomato', plot: -1, seed: '', at: now - 9e6 - i, sk: 0, w: { x: 90 }, fin: 'x', fd: 90, h: now - 8e6 + i, y: 30, m: i % 2 ? 'golden' : '', ...(i % 3 === 0 ? { wm: ['shocked'] } : {}), ...(i === 5 ? { giant: 1 } : {}), kg: .2 + i / 10, u: now });
  S.eggs = [{ id: 'egg1', v: 1, kind: 'common', src: 'focus', at: now - 2e7, need: 300, w: { a: 300 }, h: now - 1e7, pet: 'bunny', hs: 'a' }, { id: 'egg2', v: 1, kind: 'common', src: 'focus', at: now - 1e7, need: 300, w: { b: 120 } }];
  S.petPrefs = { p1: { v: 'bunny', u: now - 9e6 } };
  GD = null; G = null; save();
  return gardenBuy('av_pumpkin');
};
// ---------- 1. a wipe on a guest ----------
const W = await guest(1280, { tag: 'wipe' }); await inject(W);
const w0 = await W.ev(() => { const ok = seed116(); return { ok, produce: garden().produce, owned: isOwned('av_pumpkin'), pets: petsOwned().length, eggs: eggList().length }; });
await W.ev(() => $('#wipeBtn').click()); await wait(1500); await closeAll(W);
const w1 = await W.ev(() => { reconcileRewards('quiet'); const g = garden(); return { produce: g.produce, spent: g.spent, owned: isOwned('av_pumpkin'), avatar: myAvatar(), pets: petsOwned().length, eggs: eggList().map(e => e.id + ':' + eggFill(e)).join(), mig: !!gardenMig(), plants: S.plants.filter(p => !p.sum).length, looks: GARDEN_LOOKS.filter(it => isOwned(it.id)).length, neg: g.produce >= 0 && g.spent >= 0 }; });
check('Wipe (guest): the seeded garden (240 produce, a look, a pet, two eggs) goes; the garden re-migrates with a fresh first egg at 0, no pets, no looks, the default avatar, nothing negative', w0.ok && w0.owned && w0.pets === 1 && !w1.owned && w1.avatar === 'av_default' && w1.pets === 0 && w1.eggs === 'egg1:0' && w1.mig && w1.plants === 0 && w1.looks === 0 && w1.produce === 0 && w1.neg, JSON.stringify({ w0, w1 }));
await W.ctx.close();
// ---------- 1b. in-page checks on a guest: the plant merge, the egg upload, block lengths, the hatch queue ----------
const U2 = await guest(1280, { tag: 'unit' });
const unit = await U2.ev(() => {
  const r = {};
  const ripe = { id: 'm1', v: 1, sp: 'tomato', plot: 0, seed: 'x', at: 1, sk: 0, w: { a: 60, b: 30 }, fin: 'b', fd: 30, m: 'golden', wm: ['moonlit'], u: 100 };
  const stale = { id: 'm1', v: 1, sp: 'tomato', plot: 0, seed: 'x', at: 1, sk: 0, w: { a: 60, c: 20 }, u: 200 };   // watered later on a device that had not seen the ripening
  const m1 = mergePlant(stale, ripe), m2 = mergePlant(ripe, stale);
  r.merge = [m1, m2].every(m => m.fin === 'b' && m.fd === 30 && m.m === 'golden' && JSON.stringify(m.wm) === '["moonlit"]' && Object.keys(m.w).sort().join() === 'a,b,c');
  S.eggs = Array.from({ length: 120 }, (_, i) => ({ id: 'egg' + (i + 1), v: 1, kind: 'common', src: 'focus', at: i, need: 300, w: { ['s' + i]: 300 }, h: i + 1, pet: 'bunny', hs: 's' + i })).concat([{ id: 'egg121', v: 1, kind: 'common', src: 'focus', at: 121, need: 300, w: { x: 40 } }]);
  const pe = profileFromState().eggs;
  r.eggs = pe.length === 121 && pe.slice(0, 120).every(e => e.w === undefined && e.h && e.pet === 'bunny') && pe[120].w && pe[120].w.x === 40;
  S.eggs = []; GD = null;
  gardenBuy('seed_tomato'); gardenPlant(0, 'tomato'); GD = null;
  const s1 = { id: 'bl1', name: 'x', start: Date.now() - 90 * 60000, end: Date.now(), duration: 90 * 60000 }; S.sessions.push(s1); gardenAfterSession(s1);
  const p = garden().growing[0];
  r.block = p.b && p.b.bl1 === 90 && p.w.bl1 === 70 && Math.abs(plantAvgMin(p) - 90) < 1e-9;
  const e1 = { id: 'q1', v: 1, kind: 'common', src: 'focus', at: 1, need: 300, w: { a: 300 }, h: 2, pet: 'bunny' }, e2 = { id: 'q2', v: 1, kind: 'rare', src: 'lv4', at: 3, need: 420, w: { a: 420 }, h: 4, pet: 'fox' };
  S.eggs.push(e1, e2); GD = null;
  showHatch(e1); const open1 = $('#eggDlg').open && $('#eggDlg').dataset.pet === 'bunny'; showHatch(e2); const still1 = $('#eggDlg').dataset.pet === 'bunny', queued = hatchQueue.length === 1;
  $('#eggDlg').close();
  r.hatch = { open1, still1, queued };
  return r;
});
await wait(900);
const next = await U2.ev(() => ({ open: $('#eggDlg').open, pet: $('#eggDlg').dataset.pet, queue: hatchQueue.length }));
check('In-page: a merge keeps the ripened copy’s fin/fd/m/wm whichever copy is newer (water maps joined); hatched eggs upload without water maps (121 kept); a watering stores the block length (the tomato itself caps at its 70 XP need); a second hatch waits for the open reveal and follows it', unit.merge && unit.eggs && unit.block && unit.hatch.open1 && unit.hatch.still1 && unit.hatch.queued && next.open && next.pet === 'fox' && next.queue === 0, JSON.stringify({ unit, next }));
await U2.ctx.close();
// ---------- 2. guest data merges into a new account ----------
const G = await guest(1280, { tag: 'guest' }); await inject(G);
const g0 = await G.ev(() => { const ok = seed116(); return { ok, produce: garden().produce, legacy: !!localStorage.getItem('focus-app-v1'), harvests: garden().harvested.length }; });
await G.ctx.close();
const A = await device('A', 1280);
await A.ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); });
// carry the guest's local data into A's browser (the same device signing up) and sign up: the migration offer merges it
const G2 = await guest(1280, { tag: 'guest2' }); await inject(G2);
const dump = await G2.ev(() => { seed116(); return localStorage.getItem('focus-app-v1'); });
await G2.ctx.close();
await A.ctx.addInitScript(d => { localStorage.setItem('focus-app-v1', d); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); }, dump);
await signup(A, 'mg_' + Date.now().toString(36).slice(-5));
await wait(1500);
// the sign-up helper closes every dialog (the migration offer among them): merge the device data the way "Yes" does
const offered = await A.ev(() => { const l = legacyData(); if (!l) return false; mergeData(l); save(); return true; });
await wait(3000); await closeDlg(A);
const merged = await A.ev(() => { const g = garden(); return { offered: $('#migrateDlg').open === false, harvests: g.harvested.length, kg: g.harvested.every(p => typeof kgOf(p) === 'number'), wm: g.wmuts.shocked, giant: g.harvested.filter(p => p.giant).length, owned: isOwned('av_pumpkin'), pets: petsOwned().map(x => x.id).join(), out: petsOut().map(x => x.id).join(), eggs: eggList().map(e => e.id).sort().join(), produce: g.produce - ((S.gbuys || []).filter(x => x && (x.src === 'quest' || x.src === 'ach')).reduce((a, x) => a + Math.min(100, Math.round(+x.bonus || 0)), 0)), records: gardenRecords().best && Math.abs(gardenRecords().best.kg - .9) < 1e-9 }; });
check('Guest → account: the migration merges the 8 weighted harvests (3 Shocked, 1 Giant, the record), the look stays owned, the bunny is still out, both eggs arrive (no duplicate first egg), the 900 g record, produce 240 − 35', offered && merged.harvests === 8 && merged.kg && merged.wm === 3 && merged.giant === 1 && merged.owned && merged.pets === 'bunny' && merged.out === 'bunny' && merged.eggs === 'egg1,egg2' && merged.produce === 205 && merged.records, JSON.stringify({ offered, merged }));
const uidA = await A.ev(() => USER.uid);
await wait(2500);
const docA = await ownerGet('users/' + uidA);
check('…and the profile document carries eggs, petPrefs and the look purchase', Array.isArray(docA.eggs) && docA.eggs.length === 2 && docA.petPrefs && docA.petPrefs.p1 && docA.petPrefs.p1.v === 'bunny' && docA.gbuys.some(x => x.item === 'av_pumpkin'), JSON.stringify({ eggs: docA.eggs && docA.eggs.length, pp: docA.petPrefs, look: docA.gbuys && docA.gbuys.filter(x => x.item === 'av_pumpkin').length }));
await A.ctx.close();
// ---------- 3. a 1.14 export (no garden, no eggs) into 1.16 ----------
const old = { version: '1.14', sessions: Array.from({ length: 12 }, (_, i) => ({ id: 'o' + i, name: 'Maths', start: Date.now() - (i + 1) * 864e5, end: Date.now() - (i + 1) * 864e5 + 25 * 60000, duration: 25 * 60000, planned: 25 * 60000, preset: 'Classic 25/5' })), presets: [], reminders: [], settings: { goalMin: 120 }, game: { purchases: {}, equipped: {}, claims: { goalDays: {}, achievements: {}, milestones: {}, bosses: {}, brew: {}, quests: {}, challenges: {} }, grants: {}, trophies: {}, freezesUsed: {} } };
const oldPath = new URL('./backup-116g-old.json', import.meta.url).pathname; fs.writeFileSync(oldPath, JSON.stringify(old));
const O = await guest(1280, { tag: 'old' });
await O.p.setInputFiles('#importFile', oldPath); await wait(2500); await closeAll(O);
const oldImp = await O.ev(() => { reconcileRewards('quiet'); const g = garden(); S.ui.gardenView = 'garden'; showTab('garden'); return { sessions: S.sessions.length, mig: !!gardenMig(), egg: eggActive() && eggActive().id, pets: petsOwned().length, produce: g.produce, grown: g.grownTotal, log: !!$('.gd-log') || !$('.gd-loglist'), decor: (S.ui.gardenView = 'decor', showTab('garden'), $$('.gd-lookgrid .gd-look').length), board: (S.ui.lbPeriod = 'produce', true) }; });
check('A 1.14 export (sessions only) imports: the garden migrates from the sessions, the first egg is in the slot, no pets, produce ≥ 0, the looks section lists 20, no errors', oldImp.sessions === 12 && oldImp.mig && oldImp.egg === 'egg1' && oldImp.pets === 0 && oldImp.produce >= 0 && oldImp.decor === 20, JSON.stringify(oldImp));
await O.ctx.close();
// ---------- 3b. the demo's Seeds and Garden views write nothing ----------
const D = await guest(1280, { noLogin: true, tag: 'demo' });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeAll(D);
const demoLS = await D.ev(() => { const n0 = Object.keys(localStorage).length; S.ui.gardenView = 'seeds'; showTab('garden'); S.ui.gardenView = 'garden'; renderGarden(); S.ui.lbScope = 'friends'; S.ui.lbPeriod = 'produce'; showTab('board'); renderBoard(); return { n0, n1: Object.keys(localStorage).length, pv: isPreview() }; });
await wait(1500);
const demoLS2 = await D.ev(() => Object.keys(localStorage).length);
check('Demo: opening the Seeds view, the garden and a board writes nothing to localStorage', demoLS.pv && demoLS.n1 === demoLS.n0 && demoLS2 === demoLS.n0, JSON.stringify({ demoLS, demoLS2 }));
await D.ctx.close();
// ---------- 4. two devices buy the same look, one offline ----------
const UN = 'dl_' + Date.now().toString(36).slice(-5);
const X = await device('X', 1280), Y = await device('Y', 1280);
await signup(X, UN); await closeDlg(X);
await X.ev(() => { const now = Date.now(); for (let i = 0; i < 2; i++) S.plants.push({ id: 'dh' + i, v: 1, sp: 'tomato', plot: -1, seed: '', at: now - 9e6 - i, sk: 0, w: { x: 90 }, fin: 'x', fd: 90, h: now - 8e6 + i, y: 30, m: '', kg: .2, u: now }); GD = null; G = null; save(); });
await wait(2500);
await Y.p.goto('http://localhost:8000/index.html?emulator=1'); await Y.p.waitForSelector('#authView:not(.hidden)'); await Y.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await Y.p.click('[data-mode=login] >> visible=true'); await Y.p.fill('#authUser', UN); await Y.p.fill('#authPass', 'secret12'); await Y.p.click('#authSubmit'); await Y.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(Y);
check('Y sees the 60 produce', await until(Y, () => garden().produce === 60) >= 0);
let cutY = false; await Y.ctx.route(/127\.0\.0\.1:(8080|9099)/, r => cutY ? r.abort() : r.continue());
cutY = true; await wait(800);
const yBuy = await Y.ev(() => ({ ok: gardenBuy('av_pumpkin'), produce: garden().produce }));
const xBuy = await X.ev(() => ({ ok: gardenBuy('av_pumpkin'), produce: garden().produce }));
await wait(2500);
cutY = false;
const settled = await until(X, () => S.gbuys.filter(x => x.item === 'av_pumpkin').length === 2, null, 25000);
const settledY = await until(Y, () => S.gbuys.filter(x => x.item === 'av_pumpkin').length === 2, null, 25000);
const fin = await Promise.all([X, Y].map(d => d.ev(() => ({ records: S.gbuys.filter(x => x.item === 'av_pumpkin').length, valid: garden().valid.filter(x => x.item === 'av_pumpkin').length, invalid: garden().invalid.length, produce: garden().produce, owned: isOwned('av_pumpkin'), neg: garden().produce >= 0 }))));
check('Both buy the pumpkin avatar (Y offline): after sync each device holds two records, exactly one is valid, the other is refunded, produce is 25 on both, the look is owned once, nothing negative', yBuy.ok && xBuy.ok && settled >= 0 && settledY >= 0 && fin.every(f => f.records === 2 && f.valid === 1 && f.invalid === 1 && f.produce === 25 && f.owned && f.neg), JSON.stringify({ yBuy, xBuy, settled, settledY, fin }));
await X.ctx.close(); await Y.ctx.close();
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
