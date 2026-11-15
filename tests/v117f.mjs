// v1.17 Phase 3.3 — plant XP boosts: bought with coins, ×1.5 / ×2 for 8 blocks, consumed block by block, the stronger
// one first (never stacked past ×2), capped at 24 blocks held, shown in the Shop and the garden head; demo.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, focus } from './cl-common.mjs';
const A = await device('A', 1280);
await signup(A, 'bx_' + Date.now().toString(36).slice(-5));
await closeDlg(A);
const setup = await A.ev(() => {
  window.confirm = () => true;
  // coins: a month of history so the balance covers the boosts
  const d = startOfDay(new Date());
  const add = [];
  for (let n = 80; n >= 1; n--) { const st = d.getTime() - n * 864e5 + 10 * 3600e3; add.push({ id: 'bx' + n, name: 'Maths', start: st, end: st + 50 * 60000, duration: 50 * 60000, planned: 50 * 60000 }); }
  S.sessions.push(...add); cloudAddSessions(add);   // through the cloud, like the app does — the months listener replaces the local list
  G = null; reconcileRewards('quiet'); G = null;
  S.gbuys.push({ id: 'gb' + uid(), v: 1, item: 'seed_marigold', price: 0, at: Date.now(), slot: '' }); GD = null; gardenPlant(0, 'marigold'); save();
  return { coins: game().balance, boost: xpBoostAt() };
});
check('Setup: coins in hand, no boost yet', setup.coins >= 400 && setup.boost.mult === 1 && setup.boost.left === 0, JSON.stringify(setup));
const buy = await A.ev(() => { const c0 = game().balance; buyItem('gx_boost15'); G = null; const b1 = xpBoostAt(); buyItem('gx_boost2'); G = null; const b2 = xpBoostAt(); return { spent: c0 - game().balance, b1: [b1.id, b1.mult, b1.blocks, b1.left], b2: [b2.id, b2.mult, b2.blocks, b2.left] }; });
check('Buying ×1.5 (60 coins) then ×2 (110): the ×2 is in force (8 blocks), 16 blocks held in all', buy.spent === 170 && buy.b1.join() === 'gx_boost15,1.5,8,8' && buy.b2.join() === 'gx_boost2,2,8,16', JSON.stringify(buy));
await focus(A, 25); await wait(1200); await closeDlg(A);
const w1 = await A.ev(() => { const p = garden().growing[0]; const b = xpBoostAt(); return { xp: waterOf(p), b: [b.id, b.blocks, b.left] }; });
check('A 25-min block under ×2 gives the lone marigold 50 XP and consumes one block of the ×2 (7 left, 15 held)', w1.xp === 50 && w1.b.join() === 'gx_boost2,7,15', JSON.stringify(w1));
const walk = await A.ev(() => { const now = Date.now(), add = []; for (let i = 0; i < 7; i++) add.push({ id: 'cb' + i, name: 'x', start: now - 60000 - 800 + i * 100, end: now - 800 + i * 100, duration: 60000, planned: 60000 }); S.sessions.push(...add); cloudAddSessions(add); G = null; const b = xpBoostAt(); const next = xpBoostAt(now + 60000); return { b: [b.id, b.mult, b.blocks, b.left], left: b.left }; });
check('Seven more blocks use up the ×2; the ×1.5 then takes over with its 8 blocks', walk.b.join() === 'gx_boost15,1.5,8,8', JSON.stringify(walk));
const cap = await A.ev(() => { for (let i = 0; i < 4; i++) buyItem('gx_boost2'); G = null; const b = xpBoostAt(); showTab('shop'); S.ui.shopCat = 'boost'; renderShop(); const card = document.querySelector('#shopView .item[data-id="gx_boost2"]'); return { left: b.left, maxed: !!card && /Holding the maximum/.test(card.textContent), active: !!card && /Active: 8 blocks left/.test(card.textContent), waits: !!document.querySelector('#shopView .item[data-id="gx_boost15"]') && /waits for your Plant XP ×2/.test(document.querySelector('#shopView .item[data-id="gx_boost15"]').textContent) }; });
check('Blocks held are capped at 24 (a boost that would go past it cannot be bought); the Shop says which boost is active, which waits, and when the maximum is held', cap.left === 24 && cap.maxed && cap.active && cap.waits, JSON.stringify(cap));
const head = await A.ev(() => { S.gbuys.push({ id: 'gb' + uid(), v: 1, item: 'seed_tomato', price: 0, at: Date.now(), slot: '' }); GD = null; gardenPlant(1, 'tomato'); showTab('garden'); S.ui.gardenView = 'garden'; renderGarden(); const el = document.querySelector('.gd-boost'), b = xpBoostAt(); openPlantDlg(garden().growing.find(p => p.sp === 'tomato').id); const desc = $('#gdDlgBody .desc').textContent; $('#gdDlg').close(); return { line: el && el.textContent, on: el && el.classList.contains('on'), desc, want: `⚡ ${ITEM_BY_ID[b.id].name} · ${b.blocks} blocks left (+${b.left - b.blocks} waiting)` }; });
check('The garden head shows the boost in force, its blocks and the blocks waiting; the plant estimate uses the boost', head.line === head.want && /×2/.test(head.line) && head.on && /≈ 35m of focus to go/.test(head.desc), JSON.stringify(head));
// a block of under 5 minutes does not consume a boost block; export keeps purchases (they are ordinary coin purchases)
const short = await A.ev(() => { const l0 = xpBoostAt().left; const now = Date.now(); const s = { id: 'sh1', name: 'x', start: now - 60000, end: now - 1000, duration: 30000, planned: 60000 }; S.sessions.push(s); cloudAddSessions([s]); G = null; return { same: xpBoostAt().left === l0 }; });
check('A block under a minute consumes no boost block', short.same, JSON.stringify(short));
// demo
const D = await device('D', 1280, { noLogin: true, tag: 'demo' });
await D.p.goto('http://localhost:8000/index.html?emulator=1'); await D.p.waitForSelector('#authView:not(.hidden)');
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeDlg(D);
const demo = await D.ev(() => { showTab('garden'); S.ui.gardenView = 'garden'; renderGarden(); const el = document.querySelector('.gd-boost'); const ls = Object.keys(localStorage).length; showTab('shop'); S.ui.shopCat = 'boost'; renderShop(); const btn = document.querySelector('#shopView .item[data-id="gx_boost15"] [data-buy]'); if (btn) btn.click(); return { pv: isPreview(), line: el && el.textContent, prompt: !!document.querySelector('dialog[open] #pvWhy'), ls: Object.keys(localStorage).length === ls }; });
check('Demo: a ×2 boost shows in the garden head; buying one shows the demo prompt and writes nothing', demo.pv && /Plant XP ×2/.test(demo.line || '') && demo.prompt && demo.ls, JSON.stringify(demo));
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
