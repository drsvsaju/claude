// v1.18 Phase 4 — streak milestones (3 · 7 · 14 · 30 · 50 · 100 · 200 · 365): claimed on the longest streak, coins +
// items given once (and repaired), never paid twice (a broken and rebuilt streak, a goal change, a second reconcile),
// one skippable celebration for several at once, held while a focus block runs, the next milestone on the Timer and
// the profile, every new cosmetic renders, mobile width, gamification off, demo.
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
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
// days [from, to) ago, one block each that meets the goal of its day
const SEED = `window.days = (from, to, tag) => { for (let i = from; i < to; i++) { const d = new Date(); d.setDate(d.getDate() - i); d.setHours(10, 0, 0, 0); const min = Math.max(goalFor(dayKey(d)), 25) + 5; S.sessions.push({ id: 'sk' + tag + i, name: 'Maths', start: +d, end: +d + min * 60000, duration: min * 60000, planned: min * 60000, preset: 'Classic 25/5' }); } G = null; GS = null; };
window.closeAll = () => document.querySelectorAll('dialog[open]').forEach(x => x.close());`;
const G = await guest(1280, { tag: 'p4' });
await G.ev(s => eval(s), SEED);
// ---------- 1. a new account: the next milestone is 3 days ----------
const s0 = await G.ev(() => { showTab('timer'); renderToday(); showTab('profile'); renderProgress(); const c = $('#streakMiles'); return { next: $('#streakNext').textContent.replace(/\s+/g, ' '), hidden: $('#streakNext').classList.contains('hidden'), card: c ? c.textContent.replace(/\s+/g, ' ') : '', rows: $$('#streakMiles .sm-row').length }; });
check('New account: the Timer shows "Next milestone: 3 days" with the reward; the profile lists all 8 milestones (0 / 8)', !s0.hidden && /Next milestone: 3 days/.test(s0.next) && /15 coins/.test(s0.next) && s0.rows === 8 && /0 \/ 8/.test(s0.card), JSON.stringify(s0));
// ---------- 2. a 15-day streak: 3, 7 and 14 at once, one celebration ----------
const s1 = await G.ev(async () => {
  closeAll(); const c0 = game().balance; days(0, 15, 'a');
  const news = reconcileRewards('loud'); await new Promise(r => setTimeout(r, 900));
  const dlg = $('#rewardDlg'), g = game();
  return { news: news.filter(n => n.type === 'streak').map(n => n.m).join(), open: dlg.open, kicker: $('#rwKicker').textContent, title: $('#rwTitle').textContent, items: $$('#rwItems .rw-item').map(x => x.querySelector('.rw-n').textContent), note: $('#rwNote').textContent,
    bagBtn: !$('#rwBag').classList.contains('hidden'), coins: g.balance - c0, longest: g.streak.longest, grants: ['ti_s_roll', 'ti_s_unbreak'].map(id => (S.game.grants[id] || {}).src).join(), ib: (ibLoad(), IB.filter(x => x.type === 'streak').length) };
});
check('A 15-day streak claims 3, 7 and 14 together', s1.news === '3,7,14' && s1.longest === 15, JSON.stringify(s1));
check('One celebration lists them: "Streak milestones · 3 · 7 · 14 days", "14-day streak!", +115 coins, On a Roll and Unbreakable, the next milestone (30 days · Ember)', s1.open && /3 · 7 · 14 days/.test(s1.kicker) && s1.title === '14-day streak!' && s1.items.join('|') === '+115 coins|On a Roll|Unbreakable' && /Next: 30 days/.test(s1.note) && /Ember/.test(s1.note) && s1.bagBtn, JSON.stringify(s1));
check('Coins +115 (15 + 40 + 60, plus the goal-day bonuses), the titles granted from "streak:7" / "streak:14", one inbox entry', s1.coins >= 115 && s1.grants === 'streak:7,streak:14' && s1.ib === 1, JSON.stringify(s1));
// skippable: the button closes it; Escape too
const skip = await G.ev(async () => { $('#rwOk').click(); await new Promise(r => setTimeout(r, 200)); return !$('#rewardDlg').open; });
check('The celebration is skippable (Nice! closes it)', skip);
// ---------- 3. never paid twice ----------
const s2 = await G.ev(async () => {
  const before = { bal: game().balance, cl: JSON.stringify(S.game.claims.milestones), gr: Object.keys(S.game.grants).length };
  const again = reconcileRewards('loud').filter(n => n.type === 'streak').length;
  // the streak breaks (the blocks of the last 15 days disappear) and is rebuilt later: nothing new for 3 / 7 / 14
  const keep = S.sessions.slice(), gd = { ...S.game.claims.goalDays };
  S.sessions = S.sessions.filter(s => !/^ska/.test(s.id)); S.game.claims.goalDays = {}; G = null;   // (a claimed goal day keeps a day met, so drop them to break it)
  const broken = { cur: game().streak.cur, n: reconcileRewards('loud').filter(n => n.type === 'streak').length, cl: JSON.stringify(S.game.claims.milestones) };
  S.sessions = keep.filter(s => !/^ska/.test(s.id)); days(40, 52, 'b'); G = null;   // a 12-day run long ago
  const rebuilt = reconcileRewards('loud').filter(n => n.type === 'streak').length;
  S.sessions = keep; S.game.claims.goalDays = { ...S.game.claims.goalDays, ...gd }; G = null; reconcileRewards('quiet');
  const mileCoins = Object.keys(S.game.claims.milestones).reduce((t, m) => t + STREAK_BONUS[m], 0);
  closeAll();
  return { again, broken, rebuilt, same: JSON.stringify(S.game.claims.milestones) === before.cl, mileCoins, grants: Object.keys(S.game.grants).length - before.gr };
});
check('A second reconcile claims nothing again', s2.again === 0, JSON.stringify(s2));
check('A broken streak keeps its claims; a rebuilt 12-day run pays nothing again; milestone coins stay 115 and no item is granted twice', s2.broken.cur === 0 && s2.broken.n === 0 && s2.rebuilt === 0 && s2.same && s2.mileCoins === 115 && s2.grants === 0, JSON.stringify(s2));
// ---------- 4. a goal change neither breaks the streak nor re-awards ----------
const s3 = await G.ev(() => {
  const st0 = game().streak, cl0 = JSON.stringify(S.game.claims.milestones);
  setDailyGoal(600); G = null; save();
  const st1 = game().streak, n = reconcileRewards('loud').filter(n => n.type === 'streak').length;
  setDailyGoal(60); G = null; save(); closeAll();
  return { st0: [st0.cur, st0.longest], st1: [st1.cur, st1.longest], n, same: JSON.stringify(S.game.claims.milestones) === cl0 };
});
check('Raising the daily goal to 10 h keeps the past days (the streak still counts the earlier days) and awards nothing new', s3.st1[1] === s3.st0[1] && s3.st1[0] >= s3.st0[0] - 1 && s3.n === 0 && s3.same, JSON.stringify(s3));
// ---------- 5. reaching 30 during a focus block: held until the block ends ----------
const s4 = await G.ev(async () => {
  closeAll(); days(15, 31, 'c');
  const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer();
  await new Promise(r => setTimeout(r, 300));
  const during0 = focusActive();
  const n = reconcileRewards('loud').filter(n => n.type === 'streak').map(n => n.m).join();
  await new Promise(r => setTimeout(r, 1500));
  const during = { open: $('#rewardDlg').open, held: FG.q.filter(x => x.kind === 'reveal').length };
  t.status = 'idle'; t.phase = 'focus'; renderTimer && renderTimer();
  for (let i = 0; i < 120 && !$('#rewardDlg').open; i++) await new Promise(r => setTimeout(r, 500));   // achievement cards reached at the same time go first
  return { during0, n, during, after: $('#rewardDlg').open, title: $('#rwTitle').textContent, items: $$('#rwItems .rw-item .rw-n').map(x => x.textContent).join('|'), theme: (S.game.grants.th_s_ember || {}).src };
});
check('Reaching 30 days while a focus block runs: claimed, but the celebration waits (held, not shown)', s4.during0 && s4.n === '30' && !s4.during.open && s4.during.held === 1, JSON.stringify(s4));
check('…and shows once the block ends: "30-day streak!", +200 coins and the Ember theme (granted from streak:30)', s4.after && s4.title === '30-day streak!' && s4.items === '+200 coins|Ember' && s4.theme === 'streak:30', JSON.stringify(s4));
await G.ev(() => closeAll());
// ---------- 6. a missing reward is repaired (another device, an old client) ----------
const s5 = await G.ev(() => { delete S.game.grants.ti_s_roll; G = null; reconcileRewards('quiet'); return (S.game.grants.ti_s_roll || {}).src; });
check('A milestone item that went missing is given back on the next reconcile', s5 === 'streak:7', String(s5));
// ---------- 7. the Timer line and the profile card ----------
const s6 = await G.ev(() => {
  showTab('timer'); renderToday(); const nx = $('#streakNext').textContent.replace(/\s+/g, ' '), w = $('#streakNext .sn-bar i').style.transform;
  showTab('profile'); renderProgress(); const c = $('#streakMiles');
  return { nx, w, card: c.textContent.replace(/\s+/g, ' '), done: $$('#streakMiles .sm-row.done').length, next: ($('#streakMiles .sm-row.next') || {}).dataset?.mile, st: ($('#streakMiles .sm-row.next .sm-st') || {}).textContent };
});
check('Timer: "Next milestone: 50 days", 19 days to go, a progress bar at 31/50, the Flame Pomeo reward', /Next milestone: 50 days/.test(s6.nx) && /19 days to go/.test(s6.nx) && /Flame Pomeo/.test(s6.nx) && /-38(\.0)?%/.test(s6.w), JSON.stringify(s6));
check('Profile: 4 / 8 claimed, the 50-day row is next with 31/50, the rewards are named (Hundred-day trophy, Blaze frame, Eternal flame aura, Golden Pomeo statue)', s6.done === 4 && s6.next === '50' && s6.st === '31/50' && /4 \/ 8/.test(s6.card) && /Hundred-day trophy/.test(s6.card) && /Blaze frame/.test(s6.card) && /Eternal flame aura/.test(s6.card) && /Golden Pomeo statue/.test(s6.card), JSON.stringify(s6).slice(0, 400));
// ---------- 8. a 365-day history: everything at once; all done ----------
const s7 = await G.ev(async () => {
  closeAll(); const c0 = game().balance; days(31, 366, 'd');
  const n = reconcileRewards('loud').filter(n => n.type === 'streak').map(n => n.m).join();
  for (let i = 0; i < 120 && !($('#rewardDlg').open && /365/.test($('#rwTitle').textContent)); i++) { if ($('#rewardDlg').open) $('#rwOk').click(); await new Promise(r => setTimeout(r, 500)); }   // earlier cards and celebrations go first
  const items = $$('#rwItems .rw-item .rw-n').map(x => x.textContent).join('|'), kicker = $('#rwKicker').textContent, title = $('#rwTitle').textContent, note = $('#rwNote').textContent;
  closeAll(); showTab('timer'); renderToday(); const hidden = $('#streakNext').classList.contains('hidden');
  showTab('profile'); renderProgress();
  return { n, items, kicker, title, note, hidden, card: $('#streakMiles').textContent.replace(/\s+/g, ' '), coins: game().balance - c0, longest: game().streak.longest };
});
check('A 366-day history claims 50, 100, 200 and 365 in one celebration (+3,450 coins, Flame Pomeo, trophy, Flame ring, Blaze frame, Eternal flame aura, Golden Pomeo statue)', s7.n === '50,100,200,365' && s7.title === '365-day streak!' && s7.items === '+3,450 coins|Flame Pomeo|Hundred-day trophy|Flame ring|Blaze frame|Eternal flame aura|Golden Pomeo statue' && /Every streak milestone reached/.test(s7.note) && s7.coins >= 3450, JSON.stringify(s7));
check('All 8 claimed: the Timer line hides, the profile says every milestone is reached (8 / 8)', s7.hidden && /8 \/ 8/.test(s7.card) && /Every streak milestone reached/.test(s7.card), JSON.stringify(s7).slice(0, 300));
// ---------- 9. every new cosmetic renders and equips ----------
const cos = await G.ev(() => {
  const ids = ['ti_s_roll', 'ti_s_unbreak', 'th_s_ember', 'av_s_flame', 'shelf_s_trophy', 'ring_s_flame', 'frame_s_blaze', 'au_s_eternal', 'plant_s_golden'];
  const bad = [];
  for (const id of ids) { const it = ITEM_BY_ID[id]; if (!it || it.price !== -1 || !isOwned(id)) { bad.push(id + ':item'); continue; } try { const h = previewFor(it, game()); if (!h || /undefined/.test(h)) bad.push(id + ':preview'); } catch (e) { bad.push(id + ':' + e.message); } }
  for (const [cat, id] of [['aura', 'au_s_eternal'], ['frame', 'frame_s_blaze'], ['avatar', 'av_s_flame'], ['ring', 'ring_s_flame'], ['title', 'ti_s_unbreak'], ['theme', 'th_s_ember']]) S.game.equipped[cat] = id;
  G = null; save(); applyCosmetics(); applyTheme(); renderAll();
  const ring = $('#ring') && $('#ring').classList.contains('rs-flame'), title = ($('#lvChip') || {}).title || '';
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const badge = badgeSVG(game().tier, { frame: 'frame_s_blaze', avatar: 'av_s_flame' }), aura = withAura(badge, 1, 'au_s_eternal');
  const room = roomSVG({ ...roomLayout(), shelf: 'shelf_s_trophy', plant: 'plant_s_golden' });
  return { bad, ring, title: /Unbreakable/.test(title), accent, blaze: /fr-blaze/.test(badge), aura: aura.length > badge.length, room: /100<\/text>/.test(room) && /#e3b341/.test(room), shop: ITEMS.filter(i => ids.includes(i.id) && i.price >= 0).length };
});
check('All 9 streak cosmetics exist (reward-only), preview, and equip: Flame ring class, Unbreakable title, Ember accent, Blaze frame, Eternal aura, trophy + statue in the room', cos.bad.length === 0 && cos.ring && cos.title && /#d9602a|#ff8a3d/i.test(cos.accent) && cos.blaze && cos.aura && cos.room && cos.shop === 0, JSON.stringify(cos));
// ---------- 10. gamification off hides the line ----------
const off = await G.ev(() => { S.settings.gamification = false; showTab('timer'); renderToday(); const h = $('#streakNext').classList.contains('hidden'); S.settings.gamification = true; renderToday(); return h; });
check('With levels and rewards turned off (True Minimalist), the next-milestone line is hidden', off);
await G.ctx.close();
// ---------- 11. phone width: no overflow, the line fits ----------
const M = await guest(390, { tag: 'mobile' });
await M.ev(s => eval(s), SEED);
const mob = await M.ev(async () => {
  days(0, 9, 'm'); reconcileRewards('quiet'); closeAll();
  showTab('timer'); renderToday(); await new Promise(r => setTimeout(r, 300));
  const a = $('#streakNext').getBoundingClientRect(), over1 = document.documentElement.scrollWidth - innerWidth;
  showTab('profile'); renderProgress(); await new Promise(r => setTimeout(r, 300));
  const rows = $$('#streakMiles .sm-row').map(r => r.getBoundingClientRect()), over2 = document.documentElement.scrollWidth - innerWidth;
  return { w: a.width, right: a.right, over1, over2, rowsOk: rows.every(r => r.right <= innerWidth + 0.5 && r.height < 90), vis: !$('#streakNext').classList.contains('hidden') };
});
check('Phone (390 px): the Timer line and the milestone rows fit, no sideways scroll', mob.vis && mob.right <= 390 && mob.over1 <= 0 && mob.over2 <= 0 && mob.rowsOk, JSON.stringify(mob));
await M.ctx.close();
// ---------- 12. demo ----------
const D = await guest(1280, { noLogin: true, tag: 'demo' });
await D.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600);
const demo = await D.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('timer'); renderToday(); const nx = $('#streakNext').textContent; showTab('profile'); renderProgress(); const ls = Object.keys(localStorage).filter(k => /focus-app|pomodorolist-state/.test(k)).length; return { pv: isPreview(), nx: /Next milestone/.test(nx), card: !!$('#streakMiles'), reward: $('#rewardDlg').open, ls }; });
check('Demo: the next-milestone line and the milestone card render, no celebration pops, nothing is stored', demo.pv && demo.nx && demo.card && !demo.reward && demo.ls === 0, JSON.stringify(demo));
await D.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
