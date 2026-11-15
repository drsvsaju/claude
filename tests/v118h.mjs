// v1.18 Phase 6 — long-term: the weekly quest board (3 quests, the same for everyone, claimed by themselves, never more
// than 3 paid a week), the monthly track (tiers by the month's hours: coins, produce, a seed, an egg), Pomeo's stages
// (10 / 50 / 150 / 400 / 1000 h), the collection log (every cosmetic, how to get it), the recap's "studied with",
// phone width, demo.
import { b, wait, log, check, errs, failCount, SITE } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded', '1'); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto(SITE + '/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2200); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  if (!opts.noLogin) await p.evaluate(s => eval(s), SEED);
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
// a block: a Date, minutes, subject, extra fields
const SEED = `window.blk = (n, d, min, name = 'Maths', extra = {}) => ({ id: 'lt' + n, name, start: +d, end: +d + min * 60000, duration: min * 60000, planned: min * 60000, preset: 'Classic 25/5', ...extra });
window.at = (mon, dayOff, h) => { const d = addDays(mon, dayOff); d.setHours(h, 0, 0, 0); return d; };
window.closeAll = () => document.querySelectorAll('dialog[open]').forEach(x => x.close());`;
// ---------- 1. the board: three quests, the same for everyone in a week, a new set next week ----------
const A = await guest(1280, { tag: 'board' });
const bd = await A.ev(() => {
  const m0 = weekMonday(), ids = w => wqBoard(w).map(q => q.id).join();
  const weeks = Array.from({ length: 8 }, (_, i) => ids(addDays(m0, -7 * i)));
  return { n: wqBoard(m0).length, same: ids(m0) === ids(weekMonday()), weeks, distinct: new Set(weeks).size, naTogether: wqNA(WQ_BY_ID.together) !== '' && !wqNA(WQ_BY_ID.blocks), uniq: weeks.every(w => new Set(w.split(',')).size === 3) };
});
check('The board has 3 different quests, stable within a week and rotating across weeks; the same board for everyone (a guest sees "with someone" as not available)', bd.n === 3 && bd.same && bd.distinct >= 5 && bd.naTogether && bd.uniq, JSON.stringify(bd));
// last week: a week that satisfies every quest (except a garden harvest) → the board's quests are claimed by themselves
const wq = await A.ev(() => {
  const mon = addDays(weekMonday(), -7), wk = dayKey(mon), c0 = game().balance;
  let n = 0; const subj = ['Maths', 'Physics', 'Chemistry'];
  for (let d = 0; d < 7; d++) for (let k = 0; k < 2; k++) S.sessions.push(blk(n++, at(mon, d, k ? 15 : 7), d === 2 && k ? 55 : 70, subj[n % 3]));
  S.sessions.sort((a, b) => a.start - b.start); G = null; GD = null;
  const board = wqBoard(mon), vals = board.map(q => [q.id, wqVal(q, mon), q.n]);
  reconcileRewards('quiet');
  const claimed = Object.keys(S.game.claims.wq).filter(k => k.startsWith(wk)).map(k => k.split(':')[1]).sort().join();
  const expect = board.filter(q => wqVal(q, mon) >= q.n).map(q => q.id).sort().join();
  const coins = board.filter(q => S.game.claims.wq[wk + ':' + q.id]).reduce((a, q) => a + (q.coins || 0), 0);
  const ts = Object.entries(S.game.claims.wq).filter(([k]) => k.startsWith(wk)).map(([, t]) => t);
  const again = reconcileRewards('quiet').filter(x => x.type === 'wq').length;
  return { vals, claimed, expect, coins, wqc: wqCoinsAt(Infinity), inWeek: ts.every(t => t < +addDays(mon, 7)), again };
});
check('Last week\'s quests that were done are claimed on the next reconcile (dated inside that week); a second reconcile adds nothing', wq.claimed && wq.claimed === wq.expect && wq.inWeek && wq.again === 0, JSON.stringify(wq));
check('Their coins count once in the ledger', wq.wqc === wq.coins, JSON.stringify(wq));
const cap = await A.ev(() => { const wk = '2026-01-05'; ['blocks', 'hours', 'goal', 'early', 'long'].forEach((id, i) => { S.game.claims.wq[wk + ':' + id] = Date.parse('2026-01-06') + i; }); const c = wqCoinsAt(Infinity); for (const id of ['blocks', 'hours', 'goal', 'early', 'long']) delete S.game.claims.wq[wk + ':' + id]; return c - wqCoinsAt(Infinity); });
check('At most 3 quests a week pay coins, even if a merge brought 5 claims for one week (the first three by time)', cap === 40 + 50 + 60, String(cap));
// the board view
const view = await A.ev(() => { closeAll(); S.ui.questView = 'board'; showTab('quests'); renderQuests(); return { rows: $$('#qView .wq-row').length, nodes: $$('#qView .tr-node').length, seg: $$('#questSeg [data-qview]').length, txt: $('#qView').textContent.replace(/\s+/g, ' ').slice(0, 600) }; });
// v1.20: from November 2026 the monthly track is merged into the Study Pass (a fourth view); the board points to it
check('Quests tab: a "Quest board" view with this week\'s 3 quests; from Nov 2026 the track card points to the Study Pass', view.seg === 4 && view.rows === 3 && view.nodes === 0 && /This week’s quests/.test(view.txt) && /monthly track is now the Study Pass/.test(view.txt), JSON.stringify(view));
await A.ctx.close();
// ---------- 2. the monthly track ----------
const T = await guest(1280, { tag: 'track' });
const tr = await T.ev(() => {
  const now = new Date(), pm = new Date(now.getFullYear(), now.getMonth() - 1, 1), pk = monthKey(+pm);
  let n = 0; for (let d = 1; d <= 20; d++) { const x = new Date(pm.getFullYear(), pm.getMonth(), d, 10); S.sessions.push(blk(500 + n++, x, 185)); }   // 61.7 h last month
  const cur = new Date(now.getFullYear(), now.getMonth(), 1, 9); S.sessions.push(blk(900, cur, 130));   // 2.2 h this month
  S.sessions.sort((a, b) => a.start - b.start); G = null; GD = null;
  const c0 = trackCoinsAt(Infinity); reconcileRewards('quiet');
  const cl = S.game.claims.track, prev = TRACK.map((_, i) => !!cl[pk + ':' + i]), this0 = TRACK.map((_, i) => !!cl[monthKey(Date.now()) + ':' + i]);
  const egg = (S.eggs || []).some(e => e.id === 'egg_tr_' + pk), seed = (S.gbuys || []).some(b => b.id === 'trs_' + pk + ':3' && /^seed_/.test(b.item)), prod = (S.gbuys || []).filter(b => /^tr_/.test(b.id)).map(b => b.bonus).join();
  const again = reconcileRewards('quiet').filter(x => x.type === 'track').length;
  return { prev, this0, coins: trackCoinsAt(Infinity) - c0, egg, seed, prod, again, hours: [trackHours(pk), trackHours(monthKey(Date.now()))].map(h => Math.round(h * 10) / 10) };
});
// v1.20: last month (October 2026) still pays in full; this month (November) has no track any more — the Study Pass's Focus track replaces it
check('Last month\'s 61.7 h claim all 7 steps (20 + 60 + 150 coins, 30 + 80 produce, the month\'s seed, a rare egg); this month (Nov 2026, merged into the Study Pass) claims none', tr.prev.every(Boolean) && tr.this0.every(x => !x) && tr.coins === 230 && tr.egg && tr.seed && tr.prod.split(',').length === 2 && tr.again === 0, JSON.stringify(tr));
const prodOk = await T.ev(() => { GD = null; const g = garden(); return { produce: g.produce, ok: g.produce >= 110 }; });
check('The track\'s produce reaches the garden balance', prodOk.ok, JSON.stringify(prodOk));
await T.ctx.close();
// ---------- 3. Pomeo's stages ----------
const E = await guest(1280, { tag: 'evo' });
const ev = await E.ev(async () => {
  const d0 = new Date(); d0.setDate(d0.getDate() - 40);
  for (let i = 0; i < 30; i++) { const d = new Date(+d0 + i * 864e5); d.setHours(9, 0, 0, 0); S.sessions.push(blk(700 + i, d, 120)); }   // 60 h
  S.sessions.sort((a, b) => a.start - b.start); G = null;
  const news = reconcileRewards('loud').filter(x => x.type === 'evo').map(x => x.s).join();
  const plain = pomeoSVG({ state: 'idle', evo: 0 }), two = pomeoSVG({ state: 'idle' }), hat = pomeoSVG({ state: 'idle', hat: 'hat_party' });
  const gold = pomeoSVG({ state: 'idle', evo: 5 }), skin = pomeoSVG({ state: 'idle', evo: 5, skin: 'skin_pumpkin' });
  ibLoad(); const ib = IB.some(x => x.key === 'evo:2');
  closeAll(); showTab('profile'); renderProfile(); const line = ($('.pomeo-card .evo-line') || {}).textContent || '';
  S.settings.gamification = false; const off = pomeoSVG({ state: 'idle' }); S.settings.gamification = true;
  return { news, stage: pomeoEvo(), plain: /m-leaf2|m-bloom|m-halo/.test(plain), two: /m-leaf2/.test(two) && /m-bloom/.test(two) && !/m-halo/.test(two) && /data-evo="2"/.test(two), hatNoLeaf: !/m-leaf2/.test(hat) && /m-bloom/.test(hat), gold: /#e3b341/.test(gold) && /m-glint/.test(gold) && /m-halo/.test(gold), skin: !/m-bloom|m-leaf2/.test(skin), ib, line: line.replace(/\s+/g, ' '), off: !/m-leaf2/.test(off) };
});
check('60 h of focus: Pomeo reaches stage 2 (Sprout, Bloom announced once), drawn with a second leaf and a blossom', ev.news === '1,2' && ev.stage === 2 && ev.two && !ev.plain && ev.ib, JSON.stringify(ev));
check('With a hat the extra leaf hides (the blossom stays); stage 5 has the golden leaf, glow and glint; a skin shows none; rewards off = plain', ev.hatNoLeaf && ev.gold && ev.skin && ev.off, JSON.stringify(ev));
check('The Pomeo card shows "Stage 2 · Bloom · 60 h · Ripe at 150 h"', /Stage 2 · Bloom · 60 h · Ripe at 150 h/.test(ev.line), ev.line);
// ---------- 4. the collection log ----------
const co = await E.ev(async () => {
  showTab('profile'); renderProgress(); const card = $('#progressView .coll-card'); card.querySelector('[data-open-coll]').click(); await new Promise(r => setTimeout(r, 300));
  const d = $('#collDlg'), open = d.open, tiles0 = $$('#collDlg .coll-it').length, cats = $$('#collDlg [data-collcat]').length;
  const hows = {}; for (const id of ['th_s_ember', 'th_paper', 'ring_candle', 'th_orchard', 'stamp_together', 'frame_g_link']) hows[id] = itemHow(ITEM_BY_ID[id]);
  const special = collItems().filter(it => itemHow(it) === 'A special reward').map(it => it.id);
  $('#collDlg [data-collf="missing"]').click(); const missing = $$('#collDlg .coll-it').every(x => x.classList.contains('locked'));
  $('#collDlg [data-collcat="title"]').click(); const titles = $$('#collDlg .coll-it').length;
  const { have, total } = collCounts();
  const before = [...document.querySelectorAll('dialog[open]')].map(x => x.id).join();
  d.querySelector('[data-coll-close]').click(); await new Promise(r => setTimeout(r, 200));
  return { open, tiles0, cats, hows, special, missing, titles, have, total, closed: !d.open, before, after: [...document.querySelectorAll('dialog[open]')].map(x => x.id).join() };
});
check('The collection log opens from the profile: categories, every cosmetic as a tile, "Missing" shows only locked ones, it closes', co.open && co.tiles0 > 5 && co.cats >= 12 && co.missing && co.titles > 5 && co.total > 300 && co.closed, JSON.stringify({ ...co, special: co.special.length }));
check('Every tile says how to get it (shop price, garden shop, questline, boss, achievement, streak, clan)', /30-day streak/.test(co.hows.th_s_ember) && /Shop · 150 coins/.test(co.hows.th_paper) && /Questline/.test(co.hows.ring_candle) && /Garden shop/.test(co.hows.th_orchard) && /Clan level|clan/i.test(co.hows.stamp_together) && /10 hours/.test(co.hows.frame_g_link) && co.special.length <= 3, JSON.stringify(co.hows) + ' special: ' + co.special.join());
// ---------- 5. the recap: studied with ----------
const wr = await E.ev(() => {
  const now = new Date(), pm = new Date(now.getFullYear(), now.getMonth() - 1, 5, 18);
  S.sessions.push(blk(800, pm, 50, 'Physics', { mates: ['u1', 'u2'], live: 'L1' }), blk(801, new Date(+pm + 864e5), 25, 'Physics', { mates: ['u2'], live: 'L2' }));
  S.sessions.sort((a, b) => a.start - b.start); G = null; GD = null;
  const i = wrappedPeriods().findIndex(p => p.kind === 'month'); const d = wrappedData(wrappedPeriods()[i]);
  openWrapped(i); const slides = W.slides.join(' '); closeWrapped();
  return { people: d.together.people, mins: Math.round(d.together.mins), slide: /Studied together/.test(slides) && /2<small>people/.test(slides), sum: /studied with/.test(W.slides[W.slides.length - 1]) };
});
check('Last month\'s recap counts the people studied with (2) and the minutes together (75), with a slide and a line on the summary card', wr.people === 2 && wr.mins === 75 && wr.slide && wr.sum, JSON.stringify(wr));
await E.ctx.close();
// ---------- 6. phone width ----------
const M = await guest(390, { tag: 'mobile' });
const mob = await M.ev(async () => {
  S.ui.questView = 'board'; showTab('quests'); renderQuests(); await new Promise(r => setTimeout(r, 300));
  const over1 = document.documentElement.scrollWidth - innerWidth, nodes = $$('#qView .tr-node').map(n => n.getBoundingClientRect()), card = $('#qView .tr-card').getBoundingClientRect();
  openCollection(); await new Promise(r => setTimeout(r, 300)); const dl = $('#collDlg').getBoundingClientRect(), over2 = document.documentElement.scrollWidth - innerWidth; $('#collDlg').close();
  return { over1, over2, nodesIn: nodes.every(r => r.left >= card.left - 1 && r.right <= card.right + 1), dlg: [Math.round(dl.left), Math.round(dl.right)] };
});
check('Phone (390 px): the board and the track fit (no sideways scroll, every step inside the card); the collection log fits the screen', mob.over1 <= 0 && mob.over2 <= 0 && mob.nodesIn && mob.dlg[0] >= 0 && mob.dlg[1] <= 390, JSON.stringify(mob));
await M.ctx.close();
// ---------- 7. demo ----------
const D = await guest(1280, { noLogin: true, tag: 'demo' });
await D.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600);
const demo = await D.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.ui.questView = 'board'; showTab('quests'); renderQuests(); const rows = $$('#qView .wq-row').length; openCollection(); const coll = $$('#collDlg .coll-it').length; $('#collDlg').close(); const ls = Object.keys(localStorage).filter(k => /focus-app|pomodorolist-state/.test(k)).length; return { pv: isPreview(), rows, coll, wq: Object.keys(S.game.claims.wq || {}).length, ls }; });
check('Demo: the quest board and the collection log render; nothing is claimed or stored', demo.pv && demo.rows === 3 && demo.coll > 5 && demo.wq === 0 && demo.ls === 0, JSON.stringify(demo));
await D.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
