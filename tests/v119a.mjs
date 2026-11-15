// v1.19 ranks (guest): thresholds and divisions, the 14 h UTC-day cap, UTC seasons, the placement floor, the Timer
// line and the profile card, rank-ups (a toast during a block, the celebration after), first-time cosmetics, the
// season reward (once, earliest claim), the trophy-shelf badge, True Minimalist, phone width, the leaderboard kinds.
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
  await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2200);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  await p.evaluate(s => eval(s), SEED);
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
// a block ending at a UTC time: n, ISO end, minutes
const SEED = `window.blkU = (n, iso, min) => { const end = Date.parse(iso), start = end - min * 60000; return { id: 'rk' + n, name: 'Physics', start, end, duration: min * 60000, planned: min * 60000, preset: 'Deep Work 50/10' }; };
window.closeAll = () => document.querySelectorAll('dialog[open]').forEach(x => x.close());
window.reset = () => { S.sessions = []; S.game.claims.season = {}; S.game.claims.rkup = {}; for (const id of Object.values(RANK_ITEMS).flat()) delete S.game.grants[id]; SEAS = null; G = null; };`;
const A = await guest(1280, { tag: 'rank' });
// ---------- 1. the maths ----------
const m = await A.ev(() => {
  const names = [0, 2, 3, 6, 9, 12, 14, 15, 16].map(rankName);
  const at = [0, 199, 200, 599, 600, 1499, 1500, 2999, 3000, 4799, 4800, 6399, 6400, 7199, 7200, 10799, 10800, 99999].map(rankOfMin);
  const floors = [0, 5, 6, 8, 9, 11, 12, 14, 15, 16].map(rankFloor).map(rankName);
  return { names, at, floors, keyUtc: seasonKeyOf(Date.parse('2026-11-30T23:30:00Z')), keyUtc2: seasonKeyOf(Date.parse('2026-12-01T00:10:00Z')), prev: seasonPrev('2027-01'), label: seasonLabel('2026-11') };
});
check('Names: Bronze III … Diamond I (three divisions), Master and Grandmaster without divisions', m.names.join() === 'Bronze III,Bronze I,Silver III,Gold III,Platinum III,Diamond III,Diamond I,Master,Grandmaster', m.names.join());
check('Thresholds (minutes): 0 / 200 / 600 / 1500 / 3000 / 4800 / 6400 / 7200 / 10800 — every boundary', m.at.join() === '0,0,1,2,3,5,6,8,9,11,12,13,14,14,15,15,16,16', m.at.join());
check('Placement floor from last season\'s peak: Bronze/Silver none, Gold → Bronze I, Platinum → Silver III, Diamond → Silver I, Master → Gold III, Grandmaster → Gold II', m.floors.join() === 'Bronze III,Bronze III,Bronze I,Bronze I,Silver III,Silver III,Silver I,Silver I,Gold III,Gold II', m.floors.join());
check('Seasons are UTC months (23:30 UTC on 30 Nov is November, 00:10 UTC on 1 Dec is December); the season before January is December', m.keyUtc === '2026-11' && m.keyUtc2 === '2026-12' && m.prev === '2026-12' && /Nov/.test(m.label), JSON.stringify(m));
// ---------- 2. counted minutes: the 14 h UTC-day cap ----------
const cap = await A.ev(() => {
  reset(); const mk = seasonKeyNow(), d1 = mk + '-01';
  S.sessions.push(...Array.from({ length: 20 }, (_, i) => blkU(i, `${d1}T${String(1 + i).padStart(2, '0')}:00:00Z`, 50)));   // 20 × 50 min on day 1 = 1000 min → 840
  S.sessions.push(blkU(50, `${mk}-02T05:00:00Z`, 30));
  SEAS = null; G = null;
  return { min: seasonMinutes(mk), r: myRank() };
});
check('At most 14 h a UTC day count: 20 × 50 min on one day count 840, plus 30 min the next day = 870 min (Silver III)', cap.min === 870 && cap.r.raw === 3 && cap.r.idx === 3, JSON.stringify(cap));
// ---------- 3. the placement floor from last season ----------
const fl = await A.ev(() => {
  reset(); const mk = seasonKeyNow(), pk = seasonPrev(mk);
  for (let d = 1; d <= 9; d++) S.sessions.push(...Array.from({ length: 10 }, (_, i) => blkU(d * 100 + i, `${pk}-${String(d).padStart(2, '0')}T${String(2 + i).padStart(2, '0')}:00:00Z`, 60)));   // 9 days × 10 h = 90 h last season (Diamond III)
  S.sessions.push(blkU(999, `${mk}-01T06:00:00Z`, 60));
  SEAS = null; G = null;
  const r = myRank(); return { r, first: pk < RANK_FROM };
});
check('Last season\'s peak (90 h = Diamond III) sets this season\'s floor (Silver I) — from the second season on', fl.first ? (fl.r.floor === 0 && fl.r.idx === 0) : (fl.r.prevPeak === 12 && fl.r.floor === 5 && fl.r.idx === 5 && fl.r.raw === 0), JSON.stringify(fl));
// ---------- 4. rank-ups: claimed once, celebrated after the block; first-time cosmetics ----------
const up = await A.ev(async () => {
  reset(); const mk = seasonKeyNow();
  const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); await new Promise(r => setTimeout(r, 200));
  const toasts0 = $$('.toast-item').length;
  S.sessions.push(...Array.from({ length: 4 }, (_, i) => blkU(i, `${mk}-01T${String(1 + i * 2).padStart(2, '0')}:00:00Z`, 165)));   // 660 min → Silver III
  SEAS = null; G = null;
  const n = reconcileRewards('loud'), rk = n.filter(x => x.type === 'rankup');
  await new Promise(r => setTimeout(r, 1200));
  const during = { open: $('#rewardDlg').open, toast: [...document.querySelectorAll('.toast-item')].map(x => x.textContent).some(x => /Rank up: Silver III/.test(x)), held: FG.q.some(x => x.kind === 'reveal') };
  t.status = 'idle'; renderTimer();
  for (let i = 0; i < 120 && !$('#rewardDlg').open; i++) await new Promise(r => setTimeout(r, 500));   // held achievement toasts (3.2 s apart) go first by design: up to a minute
  const after = { open: $('#rewardDlg').open, title: $('#rwTitle').textContent, kicker: $('#rwKicker').textContent, items: $$('#rwItems .rw-n').map(x => x.textContent).join('|') };
  closeAll();
  const again = reconcileRewards('loud').filter(x => x.type === 'rankup').length;
  return { rk: rk.map(x => x.idx).join(), during, after, again, grant: (S.game.grants.frame_r_silver || {}).src, claims: Object.keys(S.game.claims.rkup).join() };
});
check('Reaching Silver III during a block: claimed once (a rank-up), a small toast right away, the celebration held', up.rk === '3' && up.during.toast && !up.during.open && up.during.held && up.claims.endsWith(':3'), JSON.stringify(up));
check('…shown after the block: "Rank up · Silver III" with the Silver rank frame (first time at Silver); nothing again on the next reconcile', up.after.open && up.after.title === 'Silver III' && /Rank up/.test(up.after.kicker) && up.after.items === 'Silver rank frame' && up.grant === 'rank:1' && up.again === 0, JSON.stringify(up.after));
// ---------- 5. a season reward: once, the highest peak claimed pays ----------
const se = await A.ev(() => {
  reset(); const c0 = seasonCoinsAt(Infinity);
  S.game.claims.season['2026-11:12'] = Date.parse('2026-12-01T08:00:00Z'); S.game.claims.season['2026-11:15'] = Date.parse('2026-12-02T08:00:00Z');   // a later, higher claim from another device
  const coins = seasonCoinsAt(Infinity) - c0, badges = seasonBadges().map(x => x.mk + ':' + x.p).join();
  showTab('profile'); renderProgress(); const shelf = ($('.season-shelf') || {}).textContent || '';
  return { coins, badges, shelf: shelf.replace(/\s+/g, ' ') };
});
const se1b = await A.ev(() => seasonCoinsAt(Date.parse('2026-12-01T12:00:00Z')) - seasonCoinsAt(0));
check('A season pays once — the highest peak claimed (two devices: Diamond III then Master → 400 coins, not 650; before the second claim 250) — and its badge sits on the trophy shelf ("Nov 2026 · Master")', se.coins === 400 && se1b === 250 && se.badges === '2026-11:15' && /Nov/.test(se.shelf) && /Master/.test(se.shelf), JSON.stringify({ ...se, se1b }));
const se2 = await A.ev(() => {
  reset(); const mk = seasonKeyNow(), pk = seasonPrev(mk);
  S.sessions.push(...Array.from({ length: 5 }, (_, i) => blkU(i, `${pk}-0${i + 1}T10:00:00Z`, 120)));   // 600 min last season
  SEAS = null; G = null;
  const n = reconcileRewards('quiet').filter(x => x.type === 'season'), n2 = reconcileRewards('quiet').filter(x => x.type === 'season');
  return { first: pk >= RANK_FROM, n: n.map(x => x.mk + ':' + x.peak).join(), n2: n2.length, claims: Object.keys(S.game.claims.season).join() };
});
check('A finished season is claimed by itself in the next one (from the first season on), once', se2.first ? (se2.n.endsWith(':3') && se2.n2 === 0) : (se2.n === '' && se2.claims === ''), JSON.stringify(se2));
// ---------- 6. the Timer line and the profile card ----------
const ui = await A.ev(() => {
  reset(); const mk = seasonKeyNow();
  S.sessions.push(...Array.from({ length: 3 }, (_, i) => blkU(i, `${mk}-01T${String(2 + i * 3).padStart(2, '0')}:00:00Z`, 120)));   // 360 min → Bronze II
  SEAS = null; G = null; closeAll();
  showTab('timer'); renderToday(); const line = $('#rankLine').textContent.replace(/\s+/g, ' '), shown = !$('#rankLine').classList.contains('hidden');
  showTab('profile'); renderProgress(); const card = ($('#rankCard') || {}).textContent || '';
  return { line, shown, card: card.replace(/\s+/g, ' ').slice(0, 300), badge: !!$('#rankCard .rk-b.big') };
});
check('Timer: "Bronze II · 6 h this season · Bronze I in 40 min" with a bar', ui.shown && /Bronze II/.test(ui.line) && /6 h this season/.test(ui.line) && /Bronze I in 0\.6 h|Bronze I in/.test(ui.line), ui.line);
check('Profile: the Rank card (season, days left, the badge, hours, the next step, the first-time rewards)', /Rank · /.test(ui.card) && /Bronze II/.test(ui.card) && /days? left/.test(ui.card) && /Silver rank frame/.test(ui.card) && ui.badge, ui.card);
// ---------- 7. badges next to names; True Minimalist hides them ----------
const bd = await A.ev(() => {
  const L = personLook('x1', 'Ann', { username: 'Ann', seasonKey: seasonKeyNow(), seasonMin: 3100, prevPeak: 0 }), old = personLook('x2', 'Bo', { username: 'Bo', seasonKey: '2020-01', seasonMin: 9999 });
  const html = lookName(L), oldHtml = lookName(old);
  S.settings.gamification = false; const off = lookName(L); showTab('timer'); renderToday(); const lineOff = $('#rankLine').classList.contains('hidden'); S.settings.gamification = true; renderToday();
  return { rank: L.rank, title: (html.match(/title="([^"]+)"/) || [])[1], old: old.rank, oldBadge: /rk-b/.test(oldHtml), off: /rk-b/.test(off), lineOff };
});
check('A name carries the rank badge from the published season (52 h = Platinum III); last season\'s numbers show none', bd.rank === 9 && /^Platinum III · divisions go III → II → I/.test(bd.title) && bd.old === null && !bd.oldBadge, JSON.stringify(bd));
check('True Minimalist: no badges, no Timer line', !bd.off && bd.lineOff, JSON.stringify(bd));
// ---------- 8. the leaderboard has Ranks and Streaks ----------
const lb = await A.ev(() => ({ kinds: Object.keys(BOARD_KINDS).join(), season: periodField('season'), key: periodKey('season'), live: [streakLive({ streakDay: dayKey(new Date()) }), streakLive({ streakDay: dayKey(addDays(new Date(), -2)) }), streakLive({ streakDay: dayKey(addDays(new Date(), -4)) }), streakLive({})].join(), stale: minutesFor({ streak: 9, streakDay: dayKey(addDays(new Date(), -5)) }, 'streak'), fresh: minutesFor({ streak: 9, streakDay: dayKey(new Date()) }, 'streak'), chip: streakChip(33), val: fmtBoardVal('season', 3100) + '|' + fmtBoardVal('streak', 12) }));
check('Leaderboard kinds: focus, garden, rank, streak; the Ranks board reads this season\'s minutes; a streak whose last goal day is older than 2 days counts 0', lb.kinds === 'focus,garden,rank,streak' && lb.season.min === 'seasonMin' && lb.key === await A.ev(() => seasonKeyNow()) && lb.live === 'true,true,false,false' && lb.stale === 0 && lb.fresh === 9 && /🔥30/.test(lb.chip) && /51\.6 h\|12 days/.test(lb.val), JSON.stringify(lb));
await A.ctx.close();
// ---------- 9. phone width ----------
const M = await guest(360, { tag: 'mobile' });
const mob = await M.ev(async () => {
  reset(); const mk = seasonKeyNow(); S.sessions.push(blkU(1, `${mk}-01T05:00:00Z`, 100)); SEAS = null; G = null; closeAll();
  showTab('timer'); renderToday(); await new Promise(r => setTimeout(r, 300)); const r1 = $('#rankLine').getBoundingClientRect(), o1 = document.documentElement.scrollWidth - innerWidth;
  showTab('profile'); renderProgress(); await new Promise(r => setTimeout(r, 300)); const o2 = document.documentElement.scrollWidth - innerWidth, c = $('#rankCard').getBoundingClientRect();
  return { right: Math.round(r1.right), o1, o2, card: Math.round(c.right) };
});
check('Phone (360 px): the Timer line and the Rank card fit, no sideways scroll', mob.right <= 360 && mob.card <= 360 && mob.o1 <= 0 && mob.o2 <= 0, JSON.stringify(mob));
await M.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
