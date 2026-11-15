// v1.16 crop weight: deterministic weights from the plant's data (species range, long blocks, mutation, pets, Giant),
// the ×6 cap, Giant odds and reveal (held during focus), records per species and overall (incl. the folded history),
// the harvest log, the player card stat, old harvests weighed on the fly, export/import, demo, two devices.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, ownerGet } from './cl-common.mjs';
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
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
const G = await guest(1280, { tag: 'kg' });
// ---------- 1. the formula ----------
const f = await G.ev(() => {
  const mk = (id, sp, w, m = '', giant = 0) => ({ id, sp, w, m, ...(giant ? { giant: 1 } : {}) });
  const short = mk('a1', 'tomato', { s1: 25, s2: 25, s3: 25, s4: 15 }), long = mk('a1', 'tomato', { s1: 90 }), gold = mk('a1', 'tomato', { s1: 25, s2: 25, s3: 25, s4: 15 }, 'golden'), crys = mk('a1', 'tomato', { s1: 25, s2: 25, s3: 25, s4: 15 }, 'crystal');
  const giant = mk('a1', 'tomato', { s1: 25, s2: 25, s3: 25, s4: 15 }, '', 1), maxed = mk('a1', 'tomato', { s1: 90 }, 'crystal', 1);
  const [lo, hi] = GKG.tomato, base = cropKg(short), spread = Array.from({ length: 200 }, (_, i) => cropKg(mk('p' + i, 'tomato', { s1: 25 })));
  return { same: cropKg(short) === cropKg(short) && cropKg(short) === cropKg({ ...short }), inRange: spread.every(k => k >= lo - 1e-9 && k <= hi + 1e-9), varied: new Set(spread).size > 100,
    long: Math.round(cropKg(long) / base * 100) / 100, gold: Math.round(cropKg(gold) / base * 100) / 100, crys: Math.round(cropKg(crys) / base * 100) / 100, giant: Math.round(cropKg(giant) / base * 100) / 100,
    pet: Math.round(cropKg(short, .25) / base * 100) / 100, maxed: Math.round(cropKg(maxed, .25) / base * 100) / 100, pumpkin: cropKg(mk('q', 'pumpkin', { s1: 25 })) >= 3, fmt: [fmtKg(4.26), fmtKg(0.123), fmtKg(1), fmtKg(12.04)] };
});
check('Weight is deterministic from the plant data, inside the species range and spread by id; 90-min blocks ×1.5, Golden ×1.4, Crystal ×2, Giant ×3, pets +25%; everything together caps at ×6', f.same && f.inRange && f.varied && f.long === 1.5 && f.gold === 1.4 && f.crys === 2 && f.giant === 3 && f.pet === 1.25 && f.maxed >= 5.9 && f.maxed <= 6 && f.pumpkin && f.fmt.join() === '4.3 kg,123 g,1 kg,12 kg', JSON.stringify(f));
const odds = await G.ev(() => { const N = 20000, ids = Array.from({ length: N }, (_, i) => 'pl' + (i * 7919).toString(36)); const base = ids.filter(id => isGiantRoll({ id, w: { s: 25 } })).length / N, long = ids.filter(id => isGiantRoll({ id, w: { s: 60 } })).length / N; return { base, long }; });
check('Giants come to about 3% of harvests, 5% when grown with hour-long blocks (20 000 ids)', odds.base > .025 && odds.base < .035 && odds.long > .044 && odds.long < .056, JSON.stringify(odds));
// ---------- 2. harvests store the weight; records, log, new-record toast, Giant reveal ----------
await G.ev(() => { const mig = gardenMig(); mig.xp = 2300; GD = null; save(); });
const harv = await G.ev(() => {
  // plant three tomatoes: short blocks, long blocks, and one whose id rolls a Giant
  S.gbuys.push({ id: 'k1', v: 1, item: 'seed_tomato', price: 0, at: Date.now(), slot: '' }, { id: 'k2', v: 1, item: 'seed_tomato', price: 0, at: Date.now(), slot: '' }, { id: 'k3', v: 1, item: 'seed_tomato', price: 0, at: Date.now(), slot: '' });
  let gid = null; for (let i = 0; i < 5000 && !gid; i++) { const id = 'plg' + i; if (isGiantRoll({ id, w: { s: 25 } })) gid = id; }
  const plain = pre => { for (let i = 0; ; i++) if (!isGiantRoll({ id: pre + i, w: { s: 90 } })) return pre + i; };   // ids that do not roll a Giant
  const PS = plain('pls'), PL = plain('pll'); window.__ids = { PS, PL };
  S.plants.push({ id: PS, v: 1, sp: 'tomato', plot: 0, seed: 'k1', at: Date.now() - 864e5, sk: 1, w: { a: 25, b: 25, c: 25, d: 15 } }, { id: PL, v: 1, sp: 'tomato', plot: 1, seed: 'k2', at: Date.now() - 864e5, sk: 1, w: { a: 90 } }, { id: gid, v: 1, sp: 'tomato', plot: 2, seed: 'k3', at: Date.now() - 864e5, sk: 1, w: { a: 25, b: 25, c: 25, d: 15 } });
  GD = null; S.ui.gardenView = 'garden'; showTab('garden');
  const h1 = gardenHarvest(PS); harvestMoment(h1, null);
  const r1 = JSON.parse(JSON.stringify(gardenRecords()));
  const h2 = gardenHarvest(PL); harvestMoment(h2, null);
  const r2 = JSON.parse(JSON.stringify(gardenRecords()));
  return { kg1: h1.kg, kg2: h2.kg, stored: typeof h1.kg === 'number' && h1.kg === kgOf(h1), heavier: h2.kg > h1.kg, r1best: r1.best && r1.best.id === PS, r2best: r2.best && r2.best.id === PL, bySp: r2.bySp.tomato === h2.kg, gid, PS, PL };
});
check('Harvests store their weight; the long-block tomato is heavier and becomes the record (per species and overall)', harv.stored && harv.heavier && harv.r1best && harv.r2best && harv.bySp, JSON.stringify(harv));
await wait(1600);   // the record toast follows the harvest toast
const toasts = await G.ev(() => [...document.querySelectorAll('.toast-item')].map(t => t.dataset.msg).filter(m => /record|harvested/.test(m)));
check('The harvest toast carries the weight and a new record is announced', toasts.some(m => /harvested · \d/.test(m) && /kg|g ·/.test(m)) && toasts.some(m => /New record/.test(m)), JSON.stringify(toasts));
// regression (1.19): a dialog re-opened while its close animation runs stays open with the new content (the Giant reveal
// arriving just after the garden tour or a plant dialog was closed used to be closed with it)
const reopen = await G.ev(async () => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); await new Promise(r => setTimeout(r, 400)); gdDialog('<p>first</p>'); $('#gdDlg').close(); gdDialog('<h2>second</h2>'); await new Promise(r => setTimeout(r, 400)); const r = { open: $('#gdDlg').open, txt: $('#gdDlgBody').textContent.trim(), closing: $('#gdDlg').classList.contains('closing') }; $('#gdDlg').close(); await new Promise(r => setTimeout(r, 300)); return r; });
check('A dialog re-opened during its closing animation stays open with the new content', reopen.open && reopen.txt === 'second' && !reopen.closing, JSON.stringify(reopen));
await closeAll(G);
const giant = await G.ev(gid => { const h = gardenHarvest(gid); harvestMoment(h, null); return { giant: h.giant === 1, kg: h.kg, big: h.kg > 3 * .12, flag: S.plants.find(p => p.id === gid).giant === 1 }; }, harv.gid);
await G.ev(async () => { for (let k = 0; k < 30 && !$('#gdDlg').open; k++) await new Promise(r => setTimeout(r, 100)); });   // the reveal opens 0.2–0.9 s after the harvest (after the harvest animation)
const gdlg = await G.ev(() => { if (!$('#gdDlg').open && typeof releaseHeld === 'function') { document.querySelectorAll('dialog[open]').forEach(x => x.close()); releaseHeld(); } return { open: $('#gdDlg').open, txt: $('#gdDlg').textContent, q: (typeof FG !== 'undefined' && FG.q || []).map(x => x.kind + ':' + x.key).join(), timer: S.timer.status + '/' + S.timer.phase }; });
check('A Giant roll is stored on the harvest, weighs ×3 and opens the Giant reveal', giant.giant && giant.flag && gdlg.open && /Giant harvest/.test(gdlg.txt) && /kg|g/.test(gdlg.txt), JSON.stringify({ giant, gdlg }));
await closeAll(G); await wait(600);   // dialogs close with a short animation
const held = await G.ev(gid => { const p = S.plants.find(x => x.id === gid); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); const on = guardOn(), st = S.timer.status, fg = { r: FG.running, e: FG.ending, q: FG.q.length }; showGiant(p); const during = $('#gdDlg').open, queued = FG.q.some(x => x.kind === 'reveal'); $('#resetBtn').click(); return { during, queued, on, st, fg }; }, harv.gid);
await wait(1500);
const idle = await until(G, () => $('#gdDlg').open || !guardBusy(), null, 12000);   // Pomeo's bubble after the reset goes first; the 500 ms release may already have shown it
const after = await G.ev(async () => { for (let k = 0; k < 60 && !$('#gdDlg').open; k++) { releaseHeld(); await new Promise(r => setTimeout(r, 100)); } return $('#gdDlg').open && /Giant harvest/.test($('#gdDlgBody').textContent); });   // held pop-ups come one at a time, a short gap apart
check('A Giant reveal during a focus block waits in the queue and shows afterwards (after Pomeo\'s bubble)', !held.during && held.queued && idle >= 0 && after, JSON.stringify({ held, idle, after }));
await closeAll(G);
const logv = await G.ev(() => { renderGarden(); const rows = $$('.gd-loglist li'); return { n: rows.length, giantRow: $$('.gd-loglist li.giant').length, recRow: $$('.gd-loglist li.rec').length, kgs: rows.map(r => r.querySelector('.kg').textContent), rec: $('.gd-rec') && $('.gd-rec').textContent, alm: (S.ui.gardenView = 'almanac', renderGarden(), $('.gd-alm-head').textContent), body: $('#gardenBody').textContent }; });
check('The Garden view lists recent harvests with weights (the Giant and the record marked) and the almanac shows the biggest harvest and per-species heaviest', logv.n === 3 && logv.giantRow === 1 && logv.recRow === 1 && logv.kgs.every(k => /kg|g$/.test(k)) && /Biggest/.test(logv.rec) && /biggest harvest/.test(logv.alm) && /heaviest/.test(logv.body), JSON.stringify({ ...logv, body: undefined }));
// ---------- 3. player card ----------
const card = await G.ev(() => { const d = cardData(); const san = sanitizeCard(JSON.parse(JSON.stringify(d))); showTab('profile'); return { bh: d.bh, san: san.bh, fact: !!$('.pc-fact') && [...$$('.pc-fact')].some(e => /Biggest harvest/.test(e.textContent)), bad: sanitizeCard({ v: 1, n: 'x', bh: ['nope', 99] }).bh, big: bigField() }; });
check('The player card carries the biggest harvest (species + kg), the snapshot sanitiser keeps a valid one and drops an unknown species; the public "big" field reads species:kg', Array.isArray(card.bh) && card.bh[0] === 'tomato' && card.san && card.san[1] === card.bh[1] && card.fact && card.bad === undefined && /^tomato:\d/.test(card.big.big), JSON.stringify(card));
// ---------- 4. old harvests (no kg) are weighed on the fly; folding keeps the records ----------
const old = await G.ev(() => { const p = { id: 'old1', v: 1, sp: 'pumpkin', plot: -1, seed: 'x', at: Date.now() - 20 * 864e5, sk: 2, wt: 360, fin: 'f', fd: 90, h: Date.now() - 10 * 864e5, y: 12, m: 'golden' }; S.plants.push(p); GD = null; const kg = kgOf(p); const rec = gardenRecords(); return { kg, noStore: p.kg === undefined, range: kg >= 3 * 1.4 * 1.5 - 1e-6 && kg <= 9 * 1.4 * 1.5 + 1e-6, best: rec.best.sp, bySp: rec.bySp.pumpkin === kg, fmt: fmtKg(kg) }; });
check('A harvest from before 1.16 (no stored weight) gets the same formula on the fly (golden pumpkin grown with 90-min blocks: 6.3–18.9 kg) and leads the records', old.noStore && old.range && old.best === 'pumpkin' && old.bySp && /kg$/.test(old.fmt), JSON.stringify(old));
const fold = await G.ev(() => { const now = Date.now(); for (let k = 0; k < 520; k++) S.plants.push({ id: 'fh' + k, v: 1, sp: 'basil', plot: -1, seed: 'x' + k, at: now - (600 - k) * 864e5, sk: 1, wt: 60, fin: 'f', fd: 25, h: now - (600 - k) * 864e5 + 1, y: 4, m: '', kg: .1 }); GD = null; const before = gardenRecords(); gardenFold(); GD = null; const after = gardenRecords(); return { folded: !!garden().fold, best: after.best.kg === before.best.kg && after.best.sp === before.best.sp, basil: after.bySp.basil === before.bySp.basil, pumpkin: after.bySp.pumpkin === before.bySp.pumpkin, fkg: garden().fold.kg, giantKept: !!garden().fold.kgG || after.best.giant === before.best.giant }; });
check('Folding the history keeps the records (overall and per species) in the fold record', fold.folded && fold.best && fold.basil && fold.pumpkin && fold.fkg > 0, JSON.stringify(fold));
// ---------- 5. export / import; demo ----------
const [dl] = await Promise.all([G.p.waitForEvent('download'), G.ev(() => $('#exportBtn').click())]);
const path = new URL('./backup-116c.json', import.meta.url).pathname; await dl.saveAs(path);
const F = await guest(1280, { tag: 'import' });
await F.p.setInputFiles('#importFile', path); await wait(2500); await closeAll(F);
const imp = await F.ev(() => { const r = gardenRecords(); return { best: r.best && r.best.sp, kgKept: S.plants.filter(p => p.h && p.kg !== undefined).length, giant: S.plants.some(p => p.giant) || !!(garden().fold && garden().fold.kgG) }; });
check('Weights, Giant flags and records survive export/import', imp.best === 'pumpkin' && imp.kgKept >= 2 && imp.giant, JSON.stringify(imp));
await F.ctx.close(); await G.ctx.close();
const D = await guest(1280, { noLogin: true, tag: 'demo' });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeAll(D);
const demo = await D.ev(() => { S.ui.gardenView = 'garden'; showTab('garden'); const r = gardenRecords(); return { pv: isPreview(), rows: $$('.gd-loglist li').length, giant: $$('.gd-loglist li.giant').length, best: r.best && r.best.sp, card: (showTab('profile'), [...$$('.pc-fact')].some(e => /Biggest harvest/.test(e.textContent))), ls: Object.keys(localStorage).length }; });
check('Demo: the harvest log with a Giant rainbow blueberry, a record, and the card stat; nothing written', demo.pv && demo.rows === 5 && demo.giant === 1 && demo.best === 'blueberry' && demo.card && demo.ls <= 5, JSON.stringify(demo));
await D.ctx.close();
// ---------- 6. two devices: the same weight on both, the public field ----------
const U = 'kg_' + Date.now().toString(36).slice(-4);
const A = await device('A', 1200); await signup(A, U);
const uid = await A.ev(() => USER.uid);
const B = await device('B', 1200);
await B.p.goto('http://localhost:8000/index.html?emulator=1'); await B.p.waitForSelector('#authView:not(.hidden)'); await B.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', U); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit'); await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(B);
const aH = await A.ev(() => { gardenPlant(0, 'tomato'); const p = garden().growing[0]; p.w = { a: 45, b: 45 }; p.fin = 'b'; p.fd = 45; GD = null; const h = gardenHarvest(p.id); return { id: h.id, kg: h.kg, giant: !!h.giant }; });
const seenB = await until(B, id => { const p = S.plants.find(x => x.id === id); return !!(p && p.h); }, aH.id, 20000);
const bH = await B.ev(id => { const p = S.plants.find(x => x.id === id); return { kg: p.kg, kgOf: kgOf(p), best: gardenRecords().best.kg }; }, aH.id);
const cloud = await ownerGet('users/' + uid);
const prof = await ownerGet('publicProfiles/' + uid);
check('A harvest weighed on A shows the same weight on B (stored, not recomputed); the profile document has it; publicProfiles carries big only when the rules allow it (now: rejected and retried without, no error)', seenB >= 0 && bH.kg === aH.kg && bH.kgOf === aH.kg && bH.best === aH.kg && cloud && cloud.plants.some(p => p.id === aH.id && p.kg === aH.kg) && prof && (prof.big === undefined || /^tomato:/.test(prof.big)), JSON.stringify({ aH, bH, big: prof && prof.big }));
await A.ctx.close(); await B.ctx.close();
log('errors', errs);
log(`${failCount()} failed`);
await b.close();
process.exit(failCount() || errs.length ? 1 : 0);
