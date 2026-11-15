// v1.17 Phase 3.6 / 3.7 — the garden tour (once, held during focus, replayable, never in the demo), daily garden tasks,
// compost, the trophy shelf, the plant info card, scenes by level and scene life; sync and export of the new bits.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, focus, until } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const A = await device('A', 1280);
await signup(A, 'gt_' + R);
await closeDlg(A);
// ---------- the tour ----------
await A.ev(() => { showTab('garden'); });
const tour1 = await until(A, () => !!document.querySelector('#gdDlg[open] .gd-tour'), null, 6000);
const t1 = await A.ev(() => ({ open: !!document.querySelector('#gdDlg[open] .gd-tour'), title: ($('#gdTitle') || {}).textContent, hi: !!document.querySelector('.gt-hi'), step: gtourStep }));
check('The garden tour opens by itself the first time the Garden tab is opened, with Pomeo and a highlight', tour1 >= 0 && t1.open && t1.title === 'Your garden' && t1.hi && t1.step === 0, JSON.stringify(t1));
const steps = await A.ev(async () => { const titles = []; for (let i = 0; i < 7; i++) { document.querySelector('[data-gtour-next]').click(); await new Promise(r => setTimeout(r, 80)); titles.push($('#gdTitle').textContent); } const last = !!document.querySelector('[data-gtour-next]') && document.querySelector('[data-gtour-next]').textContent === 'Done'; document.querySelector('[data-gtour-next]').click(); await new Promise(r => setTimeout(r, 400)); return { titles, last, closed: !$('#gdDlg').open, done: !!S.settings.gardenTour, hi: !!document.querySelector('.gt-hi') }; });
check('Eight steps (planting, XP, harvesting, selling, seeds, pets, mutations & boosts), Done closes it and remembers', steps.titles.join('|') === 'Planting|Plant XP|Harvesting|Selling|The Seeds shop|Pets and eggs|Mutations and boosts' && steps.last && steps.closed && steps.done && !steps.hi, JSON.stringify(steps));
await A.ev(() => { showTab('timer'); showTab('garden'); }); await wait(1200);
const again = await A.ev(() => ({ open: !!document.querySelector('#gdDlg[open] .gd-tour') }));
check('It does not open again', !again.open, JSON.stringify(again));
const replay = await A.ev(async () => { document.querySelector('[data-gtour]').click(); const open = !!document.querySelector('#gdDlg[open] .gd-tour'); document.querySelector('[data-gtour-skip]').click(); await new Promise(r => setTimeout(r, 700)); return { open, closed: !$('#gdDlg').open }; });
check('"Garden tour" in the garden replays it; Skip closes it', replay.open && replay.closed, JSON.stringify(replay));
// held during a focus block: a fresh account focusing first sees the tour only after the block
const H = await device('H', 1280);
await signup(H, 'gh_' + R); await closeDlg(H);
await H.ev(() => { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); showTab('garden'); }); await wait(1500);
const held = await H.ev(() => ({ open: !!document.querySelector('#gdDlg[open] .gd-tour'), queued: FG.q.some(x => x.key === 'gtour') }));
await H.ev(() => { const t = S.timer; t.planned = 25 * 60000; t.focusStartedAt = Date.now() - 25 * 60000; t.endAt = Date.now(); finishPhase('complete'); });
const afterBlock = await until(H, () => { if (document.querySelector('#gdDlg[open] .gd-tour')) return true; document.querySelectorAll('dialog[open]').forEach(d => d.close()); return false; }, null, 20000);   // the user closes the other pop-ups (level-up, first achievement, daily reward) and the tour follows
check('During a focus block the tour is held (queued) and comes once the block has ended', !held.open && held.queued && afterBlock >= 0, JSON.stringify({ held, afterBlock }));
await H.ev(() => { gardenTourEnd(); });
// ---------- daily tasks ----------
const tasks = await A.ev(() => { const list = gardenTasks(); const kinds = new Set(list.map(t => t.k)); return { n: list.length, kinds: kinds.size, same: JSON.stringify(gardenTasks().map(t => t.id)) === JSON.stringify(list.map(t => t.id)), card: !!document.querySelector('.gd-tasks'), rows: document.querySelectorAll('.gd-tasklist li').length }; });
check('Three tasks a day of different kinds, the same every time, shown in the garden', tasks.n === 3 && tasks.kinds === 3 && tasks.same && tasks.card && tasks.rows === 3, JSON.stringify(tasks));
for (let i = 0; i < 3; i++) { await focus(A, 25); await wait(900); await closeDlg(A); }   // three blocks today (75 minutes)
const claim = await A.ev(() => {
  // every task kind happens: plant 2, harvest 2, sell 2, 3 blocks / 75 minutes — so whichever three tasks the day picked are done
  S.gbuys.push({ id: 'gb' + uid(), v: 1, item: 'seed_basil', price: 0, at: Date.now(), slot: '' }, { id: 'gb' + uid(), v: 1, item: 'seed_basil', price: 0, at: Date.now(), slot: '' }, { id: 'gb' + uid(), v: 1, item: 'seed_basil', price: 0, at: Date.now(), slot: '' }); GD = null;
  gardenPlant(0, 'basil'); gardenPlant(1, 'basil'); gardenPlant(2, 'basil'); for (const p of garden().growing.slice(0, 2)) { p.w = { x: 50 }; GD = null; const h = gardenHarvest(p.id); gardenSell(h.id); } GD = null;
  const list = gardenTasks(), before = garden().produce; let paid = 0; for (const t of list) if (t.done && !t.claimed) paid += gardenClaimTask(t.i); GD = null;
  const twice = list.filter(t => t.done).reduce((a, t) => a + gardenClaimTask(t.i), 0); GD = null;
  return { done: list.filter(t => t.done).map(t => t.k), paid, gained: garden().produce - before, twice, entries: S.gbuys.filter(b => b.src === 'task').length, claimedNow: gardenTasks().filter(t => t.claimed).length };
});
check('Done tasks pay their produce once (a second claim pays nothing); the claim is a ledger entry', claim.done.length === 3 && claim.paid > 0 && claim.gained === claim.paid && claim.twice === 0 && claim.entries === claim.claimedNow, JSON.stringify(claim));
// ---------- compost ----------
const comp = await A.ev(() => { const p = garden().growing[0]; p.w = { x: 50 }; GD = null; const h = gardenHarvest(p.id); const before = garden().produce; const ok = gardenCompost(h.id); GD = null; const heap = garden().compost; S.gbuys.push({ id: 'gb' + uid(), v: 1, item: 'seed_tomato', price: 0, at: Date.now(), slot: '' }); GD = null; gardenPlant(0, 'tomato'); const np = garden().growing.find(x => x.sp === 'tomato'); GD = null; return { ok, heap, produceSame: garden().produce === before, xp: waterOf(np), cpu: !!np.cpu, heapAfter: garden().compost, inBasket: garden().crops.some(c => c.id === h.id) }; });
check('Composting a crop pays nothing, adds to the heap, and the next seed starts at 20% (tomato 14 XP); the heap is used up', comp.ok && comp.heap === 1 && comp.produceSame && comp.xp === 14 && comp.cpu && comp.heapAfter === 0 && !comp.inBasket, JSON.stringify(comp));
// ---------- trophy shelf, info card, scenes ----------
const shelf = await A.ev(() => { S.ui.gardenView = 'almanac'; renderGarden(); const el = document.querySelector('.gd-shelf'); return { shelf: !!el, tiles: el ? el.querySelectorAll('.gd-trophy').length : 0, biggest: !!el && /Biggest harvest/.test(el.textContent) }; });
check('The almanac has a trophy shelf with the biggest harvest and species records', shelf.shelf && shelf.tiles >= 2 && shelf.biggest, JSON.stringify(shelf));
const info = await A.ev(() => { S.ui.gardenView = 'garden'; renderGarden(); const p = garden().growing[0]; openPlantDlg(p.id); const el = $('#gdDlgBody'); const r = { lore: !!el.querySelector('.gd-lore') && el.querySelector('.gd-lore').textContent.length > 5, facts: el.querySelectorAll('.gd-facts span').length, compost: /grown on compost/.test(el.textContent) }; $('#gdDlg').close(); return r; });
check('The plant dialog shows lore, facts (blocks that fed it, usual weight, record, seeds held) and the compost note', info.lore && info.facts >= 3 && info.compost, JSON.stringify(info));
const bg = await A.ev(() => { const g0 = gardenBg(garden()); const btns = [...document.querySelectorAll('[data-gbg]')]; const locked = btns.filter(b => b.disabled).map(b => b.dataset.gbg); S.settings.gardenBg = 'hilltop'; renderGarden(); const low = $('#gdScene').dataset.bg; const mig = S.plants.find(p => p.id === 'mig1'); mig.xp = 9000; GD = null; renderGarden(); const high = $('#gdScene').dataset.bg; const unlocked = [...document.querySelectorAll('[data-gbg]')].filter(b => !b.disabled).length; mig.xp = 40; GD = null; return { g0, locked, low, high, unlocked, life: !!document.querySelector('.gd-life') }; });
check('Scenes: Meadow by default, the others locked by level; a locked choice falls back; at level 9 all five are open', bg.g0 === 'meadow' && bg.locked.length === 4 && bg.low === 'meadow' && bg.high === 'hilltop' && bg.unlocked === 5 && bg.life, JSON.stringify(bg));
// sync: the tour flag and the scene choice travel in settings; tasks claims and compost in the ledger / plants
const B = await device('B', 1280);
await B.p.goto('http://localhost:8000/index.html?emulator=1'); await B.p.waitForSelector('#authView:not(.hidden)');
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', 'gt_' + R); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
await until(B, () => !!(window.S && S.settings.gardenTour && S.gbuys && S.gbuys.some(x => x.src === 'task')), null, 15000);
const sync = await B.ev(() => ({ tour: !!S.settings.gardenTour, tasks: S.gbuys.filter(x => x.src === 'task').length, claimed: gardenTasks().filter(t => t.claimed).length, compost: S.plants.some(p => p.cp), cpu: S.plants.some(p => p.cpu), produce: garden().produce }));
const prodA = await A.ev(() => garden().produce);
check('A second device sees the tour done, the claimed tasks, the composted crop and the same produce', sync.tour && sync.tasks >= 1 && sync.claimed === sync.tasks && sync.compost && sync.cpu && sync.produce === prodA, JSON.stringify({ sync, prodA }));
// demo: no auto tour, replay works, tasks shown, claiming shows the prompt
const D = await device('D', 1280, { noLogin: true, tag: 'demo' });
await D.p.goto('http://localhost:8000/index.html?emulator=1'); await D.p.waitForSelector('#authView:not(.hidden)');
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeDlg(D);
await D.ev(() => { showTab('garden'); S.ui.gardenView = 'garden'; renderGarden(); }); await wait(1500);
const demo = await D.ev(() => { const auto = !!document.querySelector('#gdDlg[open] .gd-tour'); const ls = Object.keys(localStorage).length; document.querySelector('[data-gtour]').click(); const replay = !!document.querySelector('#gdDlg[open] .gd-tour'); gardenTourEnd(); const tasks = document.querySelectorAll('.gd-tasklist li').length; return { pv: isPreview(), auto, replay, tasks, ls: Object.keys(localStorage).length === ls, done: !!S.settings.gardenTour }; });
check('Demo: no automatic tour, replay works, tasks are shown, nothing is written', demo.pv && !demo.auto && demo.replay && demo.tasks === 3 && demo.ls && !demo.done, JSON.stringify(demo));
// screenshots for a look
await A.ev(() => { S.ui.gardenView = 'garden'; renderGarden(); window.scrollTo(0, 0); });
await A.p.screenshot({ path: '/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/v117/garden-desktop.png', fullPage: true });
await A.ev(() => { S.ui.gardenView = 'harvests'; renderGarden(); window.scrollTo(0, 0); });
await A.p.screenshot({ path: '/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/v117/harvests-desktop.png', fullPage: true });
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
