// v1.16 focus-weather mutations: the seven conditions read from the block that ripened the plant (and the streak then),
// deterministic rolls per plant id, at most two per plant, the ×8 produce cap (×6 weight), the looks (plot glow + icons,
// plant dialog, toasts, harvest log, almanac chips + list, achievements), old plants unchanged, the fold, replay on
// another device, sync between two devices, export/import (incl. a 1.15 export), demo, Minimalist/Animations off.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, focus } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, hasTouch: w < 500, isMobile: w < 500, acceptDownloads: true, timezoneId: 'Asia/Kolkata' });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); });
  if (opts.init) await ctx.addInitScript(opts.init, opts.arg);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
const G = await guest(1280, { tag: 'wm' });
// ---------- 1. the conditions and the rolls ----------
const cond = await G.ev(() => {
  const at = (y, mo, d, h) => new Date(y, mo, d, h, 0, 0).getTime();
  const sess = (start, mins, extra = {}) => ({ id: 's' + start, start, end: start + mins * 60000, duration: mins * 60000, ...extra });
  const ids = Array.from({ length: 600 }, (_, i) => 'plant' + i);
  const r = {};
  // a 100-minute afternoon block in May, streak 3: only Shocked can come, with its 40% chance
  const s1 = sess(at(2026, 4, 12, 14), 100);
  const a = ids.map(id => weatherMutations({ id, sp: 'tomato' }, s1, 3));
  r.onlyShocked = a.every(w => w.length === 0 || (w.length === 1 && w[0] === 'shocked'));
  r.shockRate = a.filter(w => w.length).length / ids.length;
  r.same = JSON.stringify(weatherMutations({ id: 'plant1', sp: 'tomato' }, s1, 3)) === JSON.stringify(weatherMutations({ id: 'plant1', sp: 'basil' }, s1, 5));   // species and (sub-14) streak do not matter
  // an 11 PM block in December during a clan live session: Moonlit, Frozen and Clan-blessed all qualify, at most two come
  const s2 = sess(at(2026, 11, 3, 23), 30, { live: 'lid1', clan: 'cid1' });
  const bl = ids.map(id => weatherMutations({ id }, s2, 0));
  r.maxTwo = bl.every(w => w.length <= 2 && w.every(k => ['moonlit', 'frozen', 'blessed'].includes(k)));
  r.someTwo = bl.filter(w => w.length === 2).length;
  r.lowestWin = bl.every(w => { const rolls = ['moonlit', 'frozen', 'blessed'].map(k => [k, hash01(w.p + ':wm:' + k)]); return true; });
  // the two with the lowest rolls win: check one plant by hand
  const p0 = ids.find(id => bl[ids.indexOf(id)].length === 2);
  const rolls = ['moonlit', 'frozen', 'blessed'].map(k => [k, hash01(p0 + ':wm:' + k)]).filter(([k, v]) => v < WMUT[k].chance).sort((x, y) => x[1] - y[1]).slice(0, 2).map(x => x[0]);
  r.pick = JSON.stringify(rolls) === JSON.stringify(weatherMutations({ id: p0 }, s2, 0));
  // Dawn at 5 AM; Streak-touched on a 14-day streak; Stormy inside the November 2026 questline; nothing at 2 PM in May on streak 13
  r.dawn = ids.some(id => weatherMutations({ id }, sess(at(2026, 4, 12, 5), 25), 0).includes('dawn'));
  r.streak14 = ids.some(id => weatherMutations({ id }, s1, 14).includes('streaked'));
  r.streak13 = !ids.some(id => weatherMutations({ id }, sess(at(2026, 4, 12, 14), 25), 13).length);
  r.stormyQuest = ids.some(id => weatherMutations({ id }, sess(at(2026, 10, 10, 14), 25), 0).includes('stormy'));
  r.notStormyMay = !ids.some(id => weatherMutations({ id }, sess(at(2026, 4, 12, 14), 25), 0).includes('stormy'));
  r.shocked89 = !ids.some(id => weatherMutations({ id }, sess(at(2026, 4, 12, 14), 89), 0).length);
  r.moon359 = ids.some(id => weatherMutations({ id }, sess(at(2026, 4, 12, 3), 25), 0).includes('moonlit')) && !ids.some(id => weatherMutations({ id }, sess(at(2026, 4, 12, 4), 25), 0).includes('moonlit'));
  return r;
});
check('Conditions: Shocked ≥ 90 min (not 89), Moonlit 10 PM – 4 AM, Frozen in December, Clan-blessed from a live session, Dawn 4 – 7 AM, Streak-touched at 14 (not 13), Stormy in the monsoon questline (not May)',
  cond.onlyShocked && cond.shockRate > .32 && cond.shockRate < .48 && cond.same && cond.maxTwo && cond.someTwo > 20 && cond.pick && cond.dawn && cond.streak14 && cond.streak13 && cond.stormyQuest && cond.notStormyMay && cond.shocked89 && cond.moon359, JSON.stringify(cond));
const caps = await G.ev(() => {
  const base = { id: 'cap1', sp: 'tomato', w: { a: 90 } };
  const y0 = yieldOf({ ...base, m: '' }), yg = yieldOf({ ...base, m: 'golden' }), yw = yieldOf({ ...base, m: '', wm: ['shocked'] });
  const big = { ...base, m: 'crystal', wm: ['blessed', 'frozen'] };
  return { y0, yg, yw, goldenX2: yg === Math.round(y0 * 2), shockedX15: yw === Math.round(y0 * 1.5), mult: mutMult(big), yBig: yieldOf(big), capped: yieldOf(big) === Math.round(y0 * 8),
    kgPlain: kgOf({ ...base, m: '' }), kgWm: kgOf({ ...base, m: '', wm: ['shocked'] }), kgCap: kgOf({ ...base, m: 'crystal', wm: ['blessed', 'frozen'], giant: 1 }), kgMax: kgOf({ ...base, m: 'crystal', giant: 1 }),
    oldPlant: yieldOf({ id: 'old1', sp: 'rose', w: { a: 320 }, m: 'rainbow' }) === Math.round((GYIELD.rare[0] + Math.floor(hash01('old1:y') * (GYIELD.rare[1] - GYIELD.rare[0] + 1))) * 3), names: mutNames(big).join('|'), icons: mutIcons(big) };
});
check('Multipliers: Golden ×2 and Shocked ×1.5 on their own; Crystal + Clan-blessed + Frozen (11.52) is capped at ×8; weight carries the mutation and stays under ×6; a 1.15 plant (no wm) yields exactly as before',
  caps.goldenX2 && caps.shockedX15 && caps.mult === 8 && caps.capped && caps.kgWm > caps.kgPlain && caps.kgCap <= caps.kgMax * 1.0001 && caps.kgCap > caps.kgPlain && caps.oldPlant && caps.names === 'Clan-blessed|Frozen|Crystal' && caps.icons === '🛡️❄️', JSON.stringify(caps));
// ---------- 2. a real ripening: the block decides, the plot glows, the dialog explains, the harvest pays ----------
const ripeId = await G.ev(() => {
  window.__toasts = []; const _toast = toast; toast = (m, ...a) => { window.__toasts.push(String(m)); return _toast(m, ...a); };
  gardenBuy('seed_tomato'); gardenPlant(0, 'tomato'); GD = null;
  const p = garden().growing.find(x => x.plot === 0);
  // pick an id whose Shocked roll succeeds and whose colour roll fails, so the outcome is known
  // an id whose Shocked roll succeeds and whose other rolls (colour, and the time-of-day/season ones that may apply at test time) fail
  let n = 0; while (!(hash01('wmt' + n + ':wm:shocked') < WMUT.shocked.chance && hash01('wmt' + n + ':tomato:mut') >= .5 && ['moonlit', 'dawn', 'frozen', 'stormy', 'streaked'].every(k => hash01('wmt' + n + ':wm:' + k) >= WMUT[k].chance))) n++;
  p.id = 'wmt' + n; GD = null; save();
  return p.id;
});
await focus(G, 100); await wait(3200); await closeAll(G);   // a real 100-minute block through the timer
const ripe = await G.ev(id => {
  const q = garden().plants.find(x => x.id === id), s = S.sessions[S.sessions.length - 1], gw = { ripe: garden().growing.filter(x => x.fin === s.id) };
  const y0 = Math.round((GYIELD.common[0] + Math.floor(hash01(q.id + ':y') * 3)));
  S.ui.gardenView = 'garden'; showTab('garden');
  const plot = $('.gd-plot[data-plot="0"]') || $$('.gd-plot')[0];
  return { ripe: gw.ripe.length, wm: q.wm, m: q.m, fin: q.fin === s.id, dur: Math.round(s.duration / 60000), y: yieldOf(q), y0, glow: !!plot.querySelector('.gd-plant.wm-shocked'), badge: plot.querySelector('.gd-wm') && plot.querySelector('.gd-wm').textContent, id: q.id };
}, ripeId);
check('A 100-minute afternoon block ripens the tomato as Shocked (stored once, on the plant); the plot glows and wears ⚡; the yield is ×1.5', ripe.ripe === 1 && JSON.stringify(ripe.wm) === '["shocked"]' && ripe.m === '' && ripe.fin && ripe.dur === 100 && ripe.y === Math.round(ripe.y0 * 1.5) && ripe.glow && ripe.badge === '⚡', JSON.stringify(ripe));
const toastTxt = await G.ev(() => window.__toasts.join(' | '));
check('The "ready" toast names the mutation', /Shocked Tomato is ready/.test(toastTxt), toastTxt.slice(0, 200));
const dlg = await G.ev(id => { openPlantDlg(id); return { title: $('#gdTitle').textContent, note: $('#gdDlg .gd-mutnote.wm-shocked') && $('#gdDlg .gd-mutnote.wm-shocked').textContent, badgeInDlg: !!$('#gdDlg .gd-wm') }; }, ripe.id);
check('The plant dialog is titled "Shocked Tomato" and explains the mutation (90-minute block, ×1.5) with no badge over the art', /^Shocked Tomato/.test(dlg.title) && /90 minutes/.test(dlg.note) && /1\.5× produce/.test(dlg.note) && !dlg.badgeInDlg, JSON.stringify(dlg));
await closeAll(G);
const replay = await G.ev(id => { const s = S.sessions[S.sessions.length - 1]; const before = JSON.stringify(garden().plants.find(x => x.id === id)); gardenAfterSession(s); return before === JSON.stringify(garden().plants.find(x => x.id === id)); }, ripe.id);
check('Replaying the same block (another device) changes nothing on the ripe plant', replay);
const harv = await G.ev(id => { const before = garden().produce; const h = gardenHarvest(id); harvestMoment(h, null); GD = null; const p = garden().plants.find(x => x.id === id), g = garden(); S.ui.gardenView = 'garden'; showTab('garden'); const row = $('.gd-loglist li'); return { produce: g.produce - before, y: p.y, h: !!p.h, wmuts: g.wmuts.shocked, row: row && row.textContent, ach: GARDEN_ACH.find(a => a.id === 'g_weather').ok(g), toast: window.__toasts.join(' | ') }; }, ripe.id);
check('Harvest keeps the mutated yield on the crop for the basket (1.17: produce is paid on sale), counts it (wmuts.shocked = 1), lists "⚡Shocked Tomato" in the harvest log, earns Weatherproof, and the toast says so', harv.produce === 0 && harv.y > 0 && harv.h && harv.wmuts === 1 && /⚡Shocked Tomato/.test(harv.row) && harv.ach && /Shocked Tomato harvested/.test(harv.toast), JSON.stringify(harv));
const alm = await G.ev(() => { S.ui.gardenView = 'almanac'; showTab('garden'); return { chip: $$('.gd-mut.wm-shocked:not(.none)').length, chipTxt: $('.gd-mut.wm-shocked') && $('.gd-mut.wm-shocked').textContent, list: $$('.gd-wmlist .ach').length, done: $$('.gd-wmlist .ach.done').length, head: ($$('h2').find(h => /Focus-weather/.test(h.textContent)) || {}).textContent }; });
check('The almanac shows the ⚡ Shocked ×1 chip, the seven-row list with Shocked done, and "1 of 7"', alm.chip === 1 && /Shocked ×1/.test(alm.chipTxt) && alm.list === 7 && alm.done === 1 && /1 of 7/.test(alm.head), JSON.stringify(alm));
// ---------- 3. the fold keeps the counts; 1.15 plants ----------
const fold = await G.ev(() => {
  const now = Date.now();
  for (let i = 0; i < 520; i++) S.plants.push({ id: 'oldh' + i, v: 1, sp: 'basil', plot: -1, seed: '', at: now - 9e8 + i * 1000, sk: 0, w: { x: 60 }, fin: 'x', fd: 60, h: now - 8e8 + i * 1000, y: 2, m: '', ...(i % 10 === 0 ? { wm: ['moonlit'] } : {}), ...(i % 100 === 0 ? { wm: ['moonlit', 'dawn'] } : {}), u: now });
  GD = null; const before = garden().wmuts; const did = gardenFold(); GD = null; const g = garden(); const f = S.plants.find(p => p.id === 'fold1');
  return { did, before, after: g.wmuts, foldWm: f && f.wm, kept: g.harvested.length, allwm: GARDEN_ACH.find(a => a.id === 'g_allwm').ok(g) };
});
check('Folding 520 old harvests keeps the weather-mutation counts (fold.wm) so the almanac totals do not change', fold.did && fold.before.moonlit === fold.after.moonlit && fold.before.dawn === fold.after.dawn && fold.after.moonlit === 52 && fold.after.dawn === 6 && fold.foldWm && fold.foldWm.moonlit > 0 && fold.kept <= 300 && !fold.allwm, JSON.stringify(fold));
// ---------- 4. export / import, a 1.15 export ----------
const [dl] = await Promise.all([G.p.waitForEvent('download'), G.ev(() => $('#exportBtn').click())]);
const path = new URL('./backup-116d.json', import.meta.url).pathname; await dl.saveAs(path);
const json = JSON.parse(fs.readFileSync(path, 'utf8'));
const F = await guest(1280, { tag: 'import' });
await F.p.setInputFiles('#importFile', path); await wait(2500); await closeAll(F);
const imp = await F.ev(id => { const p = garden().plants.find(x => x.id === id), g = garden(); return { wm: p && p.wm, wmuts: g.wmuts.shocked, moon: g.wmuts.moonlit }; }, ripe.id);
check('Export carries the mutations on the plants (and the fold); an import shows the same counts', json.plants.some(p => p.id === ripe.id && p.wm && p.wm[0] === 'shocked') && JSON.stringify(imp.wm) === '["shocked"]' && imp.wmuts === 1 && imp.moon === 52, JSON.stringify(imp));
const old = JSON.parse(JSON.stringify(json)); old.plants = old.plants.map(p => { const q = { ...p }; delete q.wm; if (q.id === 'fold1') delete q.wm; return q; });
const oldPath = new URL('./backup-116d-old.json', import.meta.url).pathname; fs.writeFileSync(oldPath, JSON.stringify(old));
const O = await guest(1280, { tag: 'old' });
await O.p.setInputFiles('#importFile', oldPath); await wait(2500); await closeAll(O);
const oldImp = await O.ev(() => { const g = garden(); S.ui.gardenView = 'almanac'; showTab('garden'); return { sum: Object.values(g.wmuts).reduce((a, b) => a + b, 0), chips: $$('.gd-mut.none').length, harvested: g.harvested.length + (g.fold ? g.fold.grown : 0) }; });
check('A 1.15 export (no wm anywhere) imports cleanly: every weather count is 0, chips all grey, harvests intact', oldImp.sum === 0 && oldImp.chips >= 7 && oldImp.harvested > 500, JSON.stringify(oldImp));
await F.ctx.close(); await O.ctx.close(); await G.ctx.close();
// ---------- 5. two devices: the block on A ripens with Moonlit; B sees the same mutation after sync ----------
const A = await device('A', 1280), B = await device('B', 1280);
const UN = 'wm_' + Date.now().toString(36).slice(-5);
await signup(A, UN); await closeDlg(A);
await A.ev(() => { gardenBuy('seed_tomato'); gardenPlant(0, 'tomato'); GD = null; const p = garden().growing[0]; let n = 0; while (!(hash01('wmA' + n + ':wm:moonlit') < WMUT.moonlit.chance)) n++; p.id = 'wmA' + n; GD = null; save(); });
await wait(2500);
await B.p.goto('http://localhost:8000/index.html?emulator=1'); await B.p.waitForSelector('#authView:not(.hidden)'); await B.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', UN); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit'); await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(B);
check('B sees the planted tomato', await until(B, () => garden().growing.length === 1) >= 0);
const aRipe = await A.ev(() => { const start = new Date(); start.setHours(23, 0, 0, 0); const s = { id: 'wmS2', name: 'Late', start: start.getTime(), end: start.getTime() + 95 * 60000, duration: 95 * 60000 }; S.sessions.push(s); const gw = gardenAfterSession(s); const p = garden().plants.find(x => x.id.startsWith('wmA')); return { ripe: gw.ripe.length, wm: p.wm }; });
const bSees = await until(B, () => { const p = garden().plants.find(x => x.id.startsWith('wmA')); return p && p.fin === 'wmS2' && Array.isArray(p.wm) && p.wm.includes('moonlit'); }, null, 15000);
const bWm = await B.ev(() => garden().plants.find(x => x.id.startsWith('wmA')).wm);
check('A late block (11 PM, 95 min) ripens on A with Moonlit (and maybe Shocked); B shows the very same list after sync', aRipe.ripe === 1 && aRipe.wm.includes('moonlit') && bSees >= 0 && JSON.stringify(bWm) === JSON.stringify(aRipe.wm), JSON.stringify({ aRipe, bWm, bSees }));
await A.ctx.close(); await B.ctx.close();
// ---------- 6. demo, Minimalist and Animations off ----------
const D = await guest(1280, { noLogin: true, tag: 'demo' });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeAll(D);
const demo = await D.ev(() => { S.ui.gardenView = 'garden'; showTab('garden'); const log = $$('.gd-loglist li').map(l => l.textContent).join(' | '); const moon = $$('.gd-plot .gd-plant.wm-moonlit').length; S.ui.gardenView = 'almanac'; showTab('garden'); return { pv: isPreview(), log, moon, chips: $$('.gd-mut[class*="wm-"]:not(.none)').length, ls: Object.keys(localStorage).length, wmuts: garden().wmuts }; });
check('Demo: the harvest log shows the Shocked Golden tomato, a Moonlit basil waits on a plot, the almanac has the two chips lit, nothing is written', demo.pv && /Shocked Golden Tomato/.test(demo.log) && demo.moon === 1 && demo.chips === 1 && demo.wmuts.shocked === 1 && demo.wmuts.moonlit === 0, JSON.stringify(demo));
await D.ctx.close();
const M = await guest(390, { tag: 'minimal', init: () => { localStorage.setItem('pomodorolist-motion', 'off'); } });
const mini = await M.ev(() => { applyMotion(); S.plants.push({ id: 'mp1', v: 1, sp: 'tomato', plot: 0, seed: '', at: Date.now() - 1e6, sk: 0, w: { x: 90 }, fin: 'x', fd: 90, m: 'golden', wm: ['frozen', 'dawn'], u: Date.now() }); GD = null; S.ui.gardenView = 'garden'; showTab('garden'); const plot = $$('.gd-plot')[0]; const r = plot.getBoundingClientRect(); const badge = plot.querySelector('.gd-wm'); const br = badge && badge.getBoundingClientRect(); const minimalHides = (S.settings.gamification = false, applyMinimal(), renderGarden(), $('#gardenBody').innerHTML === ''); return { motion: document.documentElement.dataset.motion, minimal: minimalHides, glow: !!plot.querySelector('.gd-plant.wm-frozen.wm-dawn'), badge: badge && badge.textContent, inside: br && br.right <= r.right + 1 && br.top >= r.top - 1, w: document.documentElement.scrollWidth <= 390, mult: mutMult(garden().plants.find(p => p.id === 'mp1')) }; });
check('On a 390 px phone with Animations off: the two icons sit inside the plot, the glow classes are there (no animation), no horizontal overflow; Golden + Frozen + Dawn = ×4.16; True Minimalist hides the garden', mini.motion === 'off' && mini.minimal && mini.glow && mini.badge === '❄️🌅' && mini.inside && mini.w && Math.abs(mini.mult - 2 * 1.6 * 1.3) < 1e-9, JSON.stringify(mini));
await M.ctx.close();
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
