// v1.18 Phase 1a — "Recently used" chips: click loads name + preset every time, the star persists and pins first, no
// duplicates (reuse moves to the front), caps (6 recents + favourites), Clear asks and keeps favourites (with Undo), a
// deleted preset drops its chip and a renamed one relabels it, the legacy recent/pinned lists migrate once, a v1.17
// backup imports, and the sync: two devices, a star made before the cloud copy loaded survives, offline edits merge.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, until } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const R = Date.now().toString(36).slice(-5);
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); localStorage.setItem('pomodorolist-tips-seen', JSON.stringify(['stats', 'reminders', 'quests', 'shop', 'friends', 'board', 'profile', 'settings', 'garden', 'room'])); });
  if (opts.init) await ctx.addInitScript(opts.init, opts.arg);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => opts.dismiss ? d.dismiss() : d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2000); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const startBlock = (d, name, pid) => d.ev(([name, pid]) => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); $('#nameInput').value = name; onNameChange(); S.activePresetId = pid; const t = S.timer; if (t.status !== 'idle') finishPhase('reset'); t.phase = 'focus'; t.status = 'idle'; startTimer(); finishPhase('reset'); }, [name, pid]);
const chips = d => d.ev(() => $$('#chips .chip').map(c => (c.classList.contains('pinned') ? '★' : '') + c.dataset.name + '@' + S.presets.find(p => p.id === c.dataset.pid).name));

// ---------- 1. guest: chips appear, click loads, star, dedupe, cap, clear ----------
const G = await guest(1280, { tag: 'chips' });
const pids = await G.ev(() => { S.presets.push({ id: 'p-x1', name: 'Deep 50/10', focus: 50, short: 10, long: 20, rounds: 3 }, { id: 'p-x2', name: 'Sprint 15/3', focus: 15, short: 3, long: 10, rounds: 4 }); save(); return S.presets.map(p => p.id); });
await startBlock(G, 'Physics', pids[0]); await startBlock(G, 'Maths', 'p-x1'); await startBlock(G, 'Physics', pids[0]);
const c1 = await chips(G);
check('Two blocks with Physics (Classic) and one with Maths (Deep): two chips, Physics first (reuse moved it, no copy)', c1.length === 2 && c1[0].startsWith('Physics@') && c1[1] === 'Maths@Deep 50/10', JSON.stringify(c1));
await G.ev(() => { $('#nameInput').value = 'Other'; onNameChange(); S.activePresetId = 'p-x2'; save(); renderAll(); });
await G.p.click('#chips .chip[data-name="Maths"]'); await wait(900);
const ld = await G.ev(() => ({ name: S.timer.name, input: $('#nameInput').value, preset: S.activePresetId, focus: activePreset().focus, time: $('#timeText').textContent, current: $$('#chips .chip.current').length }));
check('Clicking the Maths chip loads the name AND the Deep preset (50-minute focus); the loaded chip is marked', ld.name === 'Maths' && ld.input === 'Maths' && ld.preset === 'p-x1' && ld.focus === 50 && /50:00$/.test(ld.time) && ld.current === 1, JSON.stringify(ld));
await G.p.keyboard.press('Tab'); // move on; use the keyboard on the Physics chip
await G.ev(() => $('#chips .chip[data-name="Physics"]').focus()); await G.p.keyboard.press('Space'); await wait(200);
check('Space on a focused chip loads it too', await G.ev(() => S.timer.name === 'Physics' && S.activePresetId === S.presets[0].id));
await G.p.click('#chips .chip[data-name="Maths"] .pin'); await wait(200);
const st = await G.ev(() => ({ fav: S.chips.find(c => c.name === 'Maths').fav, first: $('#chips .chip').dataset.name, pressed: $('#chips .chip .pin').getAttribute('aria-pressed') }));
check('Starring Maths pins it first', st.fav === 1 && st.first === 'Maths' && st.pressed === 'true', JSON.stringify(st));
await G.p.reload(); await G.p.waitForSelector('#appView:not(.hidden)'); await wait(1500); await closeDlg(G);
check('…and it is still starred and first after a reload', (await chips(G))[0] === '★Maths@Deep 50/10', (await chips(G)).join());
for (const n of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) await startBlock(G, n, pids[0]);
const cap = await G.ev(() => ({ n: $$('#chips .chip:not(.pinned)').length, first: $$('#chips .chip:not(.pinned)')[0].dataset.name, stored: S.chips.filter(c => !c.fav).length, physics: $$('#chips .chip').some(c => c.dataset.name === 'Physics'), maths: $$('#chips .chip.pinned').length }));
check('After seven more subjects the recents are capped at 6 (newest first, Physics dropped), the stored list is pruned too, and the favourite stays', cap.n === 6 && cap.first === 'G' && cap.stored === 6 && !cap.physics && cap.maths === 1, JSON.stringify(cap));
// a dismissed confirm keeps everything
const D = await guest(1280, { tag: 'dismiss', dismiss: true });
await startBlock(D, 'Keep', 'p-classic'); await D.ev(() => $('#clearRecent').click()); await wait(200);
check('Clear asks first — cancelling keeps the list', (await D.ev(() => $$('#chips .chip').length)) === 1);
await D.ctx.close();
await G.ev(() => $('#clearRecent').click()); await wait(300);
const cl = await G.ev(() => ({ chips: $$('#chips .chip').map(c => c.dataset.name), stored: S.chips.length, undo: !!document.querySelector('.toast-item.has-undo button') }));
check('Clear (confirmed) removes the six recents and keeps the favourite; an Undo toast appears', cl.chips.join() === 'Maths' && cl.stored === 1 && cl.undo, JSON.stringify(cl));
await G.ev(() => document.querySelector('.toast-item.has-undo button').click()); await wait(200);
check('Undo brings the recents back', (await G.ev(() => $$('#chips .chip').length)) === 7);
// deleted and renamed presets
await G.ev(() => { S.presets.find(p => p.id === 'p-x1').name = 'Deep work'; S.presets = S.presets.filter(p => p.id !== 'p-x2'); S.chips.push({ id: chipId('Ghost', 'p-x2'), name: 'Ghost', presetId: 'p-x2', ts: Date.now(), fav: 1 }); save(); renderChips(); });
const dr = await G.ev(() => ({ label: $('#chips .chip[data-name="Maths"] .meta').textContent, ghost: $$('#chips .chip').some(c => c.dataset.name === 'Ghost'), chipsOk: typeof loadChip('Maths', 'p-x1') === 'boolean' }));
check('A renamed preset relabels its chip ("Deep work · 50/10"); a chip whose preset is gone is not shown and nothing breaks', dr.label === 'Deep work · 50/10' && !dr.ghost && dr.chipsOk, JSON.stringify(dr));
const gone = await G.ev(() => { const r = loadChip('Ghost', 'p-x2'); return { r, name: S.timer.name, dropped: !S.chips.some(c => c.name === 'Ghost') }; });
check('Loading a chip of a deleted preset (e.g. from an old link) loads the name only and drops the chip', gone.r === false && gone.name === 'Ghost' && gone.dropped, JSON.stringify(gone));
// legacy migration + a v1.17 backup
const mig = await G.ev(() => { const h = hydrate({ sessions: [], presets: S.presets, recent: [{ name: 'Old A', presetId: 'p-classic', ts: 5 }, { name: 'Old B', presetId: 'p-classic', ts: 9 }], pinned: [{ name: 'Old B', presetId: 'p-classic' }, { name: 'Pin C', presetId: 'p-classic' }] }); return { n: h.chips.length, favs: h.chips.filter(c => c.fav).map(c => c.name).sort().join(), tsB: h.chips.find(c => c.name === 'Old B').ts }; });
check('A state from before v1.18 migrates: three chips, Old B and Pin C favourites, Old B keeps its time', mig.n === 3 && mig.favs === 'Old B,Pin C' && mig.tsB === 9, JSON.stringify(mig));
const imp = await G.ev(() => { const before = S.chips.length; const n = mergeData({ sessions: [], recent: [{ name: 'Backup X', presetId: 'p-classic', ts: 3 }], pinned: [{ name: 'Backup Y', presetId: 'p-classic' }] }); return { n, added: S.chips.length - before, y: !!S.chips.find(c => c.name === 'Backup Y' && c.fav) }; });
check('A v1.17 backup (recent + pinned, no chips) imports as chips', imp.added === 2 && imp.y, JSON.stringify(imp));
await G.ctx.close();
// ---------- 2. two devices: stars and recents merge; a star before the cloud copy loaded survives ----------
const A = await device('A', 1280), B = await device('B', 1280);
await signup(A, 'ch_' + R); await closeDlg(A);
await A.ev(() => { S.presets.push({ id: 'p-x1', name: 'Deep 50/10', focus: 50, short: 10, long: 20, rounds: 3 }); save(); });
await startBlock(A, 'Physics', 'p-classic'); await startBlock(A, 'Maths', 'p-x1');
await wait(1500);
// B logs in and stars Physics as soon as the app is visible (before the cloud copy has arrived)
await B.p.goto('http://localhost:8000/index.html?emulator=1'); await B.p.waitForSelector('#authView:not(.hidden)');
await B.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', 'ch_' + R); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
await B.p.waitForSelector('#appView:not(.hidden)');
const early = await B.ev(() => { const loaded = typeof profileLoaded !== 'undefined' && profileLoaded; S.chips.push({ id: chipId('Early', 'p-classic'), name: 'Early', presetId: 'p-classic', ts: Date.now(), fav: 1 }); save(); return { loaded }; });
await until(B, () => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, 20000); await wait(2500); await closeDlg(B);
const bChips = await B.ev(() => ({ names: S.chips.map(c => c.name).sort().join(), early: !!S.chips.find(c => c.name === 'Early' && c.fav) }));
check('B\'s favourite made before the cloud copy arrived survives the first snapshot and sits beside A\'s two chips', bChips.early && bChips.names === 'Early,Maths,Physics', JSON.stringify({ early, bChips }));
const aSees = await until(A, () => S.chips.some(c => c.name === 'Early' && c.fav), null, 15000);
check('…and reaches A', aSees >= 0, String(aSees));
// B stars Maths while A (offline) renames the chip order by reusing Physics; both survive
let cutA = false; await A.ctx.route(/127\.0\.0\.1:(8080|9099)/, r => cutA ? r.abort() : r.continue()); cutA = true; await wait(500);
await B.ev(() => { toggleFav('Maths', 'p-x1'); }); await wait(1200);
await startBlock(A, 'Physics', 'p-classic'); await wait(500);
cutA = false; await wait(4000);
const both = await until(A, () => !!S.chips.find(c => c.name === 'Maths' && c.fav), null, 15000);
const fin = await A.ev(() => ({ maths: S.chips.find(c => c.name === 'Maths').fav, physicsFirst: $$('#chips .chip:not(.pinned)')[0].dataset.name, n: S.chips.length }));
check('An offline reuse on A and a star on B merge: Maths starred, Physics the newest recent, three chips', both >= 0 && fin.maths === 1 && fin.physicsFirst === 'Physics' && fin.n === 3, JSON.stringify(fin));
await B.ev(() => clearRecents()); await wait(1500);
const cleared = await until(A, () => S.chips.filter(c => !c.fav).length === 0 && S.chips.length === 2, null, 15000);
check('Clear on B (confirmed) reaches A: the recents are gone on both, the two favourites stay', cleared >= 0, String(cleared));
await A.ctx.close(); await B.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
