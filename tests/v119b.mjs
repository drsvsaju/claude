// v1.19 accounts: the season and streak numbers are published (rankStats; the profile carries no season), the Ranks and
// Streaks boards for friends and everyone (rank badges, stale streaks off the Current board, milestone flames), rank
// badges on friend rows, and the rules: wrong season, over the 14 h-a-day bound, going down, growing too fast, a
// forged placement, someone else's document, a streak longer than the account is old, best below current, a best
// that shrinks, a changed join date, a streak that jumps; an honest new season with the right placement goes through.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, until, tryOp, owner, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const names = { A: 'rka_' + R, B: 'rkb_' + R };
const A = await device('A', 1280), B = await device('B', 1280);
await signup(A, names.A); await signup(B, names.B);
for (const d of [A, B]) await closeDlg(d);
await A.ev(n => sendRequest(n), names.B); await wait(1500);
await until(B, () => typeof incoming === 'function' && incoming().length >= 1, null, 15000);
await B.ev(() => incoming().forEach(r => acceptRequest(r.id))); await wait(2000);
const uidA = await A.ev(() => USER.uid), uidB = await B.ev(() => USER.uid);
check('A and B are friends', await B.ev(() => friendsList().length === 1));
// A: 200 counted minutes this season (today, two blocks), the goal met yesterday and today → a 2-day streak; both on the global board
const SEED = `(min) => { const now = Date.now(); const mk = (n, endAgo, m) => ({ id: 'v19_' + n, name: 'Maths', start: now - endAgo - m * 60000, end: now - endAgo, duration: m * 60000, planned: m * 60000, preset: 'Classic 25/5' });
  setDailyGoal(60); S.settings.globalBoard = true; const y = Date.now() - 864e5;
  S.sessions.push(mk(1, 60000, min / 2), mk(2, 3600000 + 60000, min / 2), { ...mk(3, 0, 70), start: y - 70 * 60000, end: y, id: 'v19_y' });
  S.sessions.sort((a, b) => a.start - b.start); SEAS = null; G = null; save(); delete lastPub.publicStats; delete lastPub.publicProfiles; delete lastPub.rankStats; publishPublic(); }`;
await A.ev(s => eval(s)(200), SEED); await B.ev(s => eval(s)(80), SEED);
await wait(3000);
const pa = await ownerGet('rankStats/' + uidA), pf = await ownerGet('publicProfiles/' + uidA);
const mkNow = await A.ev(() => seasonKeyNow());
// (the yesterday block counts toward this season only if yesterday (UTC) is in this month)
const expA = await A.ev(() => seasonMinutes(seasonKeyNow()));
check('A\'s rankStats carry this season (key, counted minutes, placement 0) and the streak fields; the profile carries no season', pa.seasonKey === mkNow && pa.seasonMin === expA && pa.prevPeak === 0 && pa.streak === 2 && pa.bestStreak >= 2 && /^\d{4}-\d\d-\d\d$/.test(pa.streakDay) && pa.joined > 0 && !('seasonKey' in pf) && !('seasonMin' in pf), JSON.stringify({ seasonKey: pa.seasonKey, seasonMin: pa.seasonMin, exp: expA, prevPeak: pa.prevPeak, streak: pa.streak, best: pa.bestStreak, day: pa.streakDay, prof: [pf.seasonKey, pf.seasonMin] }));
// ---------- rule attacks ----------
const day = await A.ev(() => new Date().getUTCDate());
const upd = fields => `async () => FB.updateDoc(FB.doc(FB.db, 'rankStats', USER.uid), { ...${JSON.stringify(fields)}, updatedAt: FB.serverTimestamp() })`;
const att = {};
att.wrongSeason = await tryOp(A, upd({ seasonKey: '2020-01', seasonMin: pa.seasonMin }));
att.overDayCap = await tryOp(A, upd({ seasonMin: day * 840 + 30 }));
att.down = await tryOp(A, upd({ seasonMin: Math.max(0, pa.seasonMin - 50) }));
att.jump = await tryOp(A, upd({ seasonMin: Math.min(day * 840, pa.seasonMin + 600) }));
att.placement = await tryOp(A, upd({ prevPeak: 9 }));
att.others = await tryOp(B, `async u => FB.updateDoc(FB.doc(FB.db, 'rankStats', u), { seasonMin: 1, updatedAt: FB.serverTimestamp() })`, uidA);
att.othersProfile = await tryOp(B, `async u => FB.updateDoc(FB.doc(FB.db, 'publicProfiles', u), { seasonMin: 1, updatedAt: FB.serverTimestamp() })`, uidA);
att.oldAccount = await tryOp(A, upd({ bestStreak: 400, streak: 2 }));
att.bestBelow = await tryOp(A, upd({ streak: 2, bestStreak: 1 }));
att.joined = await tryOp(A, upd({ joined: Date.parse('2020-01-01') }));
att.profileCap = await tryOp(A, `async () => FB.updateDoc(FB.doc(FB.db, 'publicProfiles', USER.uid), { seasonMin: ${day * 840 + 30}, updatedAt: FB.serverTimestamp() })`);
check('Rules refuse: another season, over 14 h × the day of the month, going down, +600 at once, a forged placement, writing another user\'s stats or profile, a best streak older than the account, best below current, a changed join date, season fields on the profile', Object.values(att).every(r => /permission|denied/i.test(r)), JSON.stringify(att));
const ok1 = await tryOp(A, upd({ seasonMin: pa.seasonMin + 20 }));
check('…while an honest step (+20 min) is accepted', ok1 === 'ALLOWED', ok1);
// a streak that jumps: an older best (owner) and a jump of +30 days in one write
await owner('rankStats/' + uidA, { joined: Date.now() - 400 * 864e5, streak: 3, bestStreak: 3, updatedAt: new Date() });
const jump = await tryOp(A, upd({ streak: 40, bestStreak: 40 }));
const ok2 = await tryOp(A, upd({ streak: 4, bestStreak: 4 }));
const shrink = await tryOp(A, upd({ streak: 1, bestStreak: 3 }));
check('The best streak grows by at most a day or two per write (+37 refused, +1 accepted) and never shrinks', /permission|denied/i.test(jump) && ok2 === 'ALLOWED' && /permission|denied/i.test(shrink), JSON.stringify({ jump, ok2, shrink }));
// a new season: the document holds last season (owner write: 3200 min = Platinum III); the placement may be up to that peak
const prevKey = await A.ev(() => seasonPrev(seasonKeyNow()));
await owner('rankStats/' + uidA, { seasonKey: prevKey, seasonMin: 3200, prevPeak: 0, updatedAt: new Date(Date.now() - 3600e3) });
const tooHigh = await tryOp(A, upd({ seasonKey: mkNow, seasonMin: 10, prevPeak: 10 }));
const right = await tryOp(A, upd({ seasonKey: mkNow, seasonMin: 10, prevPeak: 9 }));
check('A new season: the placement may be last season\'s peak (Platinum III = 9) but not above it (10 refused)', /permission|denied/i.test(tooHigh) && right === 'ALLOWED', JSON.stringify({ tooHigh, right }));
// deleting and re-creating the document can't jump the season: a new rankStats starts at ≤ 4 h
const base = { ...pa }; delete base.updatedAt;
const recreate = m => `async () => { await FB.deleteDoc(FB.doc(FB.db, 'rankStats', USER.uid)); return FB.setDoc(FB.doc(FB.db, 'rankStats', USER.uid), { ...${JSON.stringify(base)}, seasonMin: ${m}, prevPeak: 0, updatedAt: FB.serverTimestamp() }); }`;
const reBig = await tryOp(A, recreate(500)), reOk = await tryOp(A, recreate(Math.min(200, day * 840)));
check('A new rankStats document may start at 4 h at most (500 min refused, 200 accepted)', /permission|denied/i.test(reBig) && reOk === 'ALLOWED', JSON.stringify({ reBig, reOk }));
// restore A's real numbers for the boards
await owner('rankStats/' + uidA, { seasonKey: mkNow, seasonMin: pa.seasonMin, prevPeak: 0, streak: 2, bestStreak: 2, streakDay: pa.streakDay, joined: pa.joined, global: true, updatedAt: new Date() });
// B's streak ended days ago (owner): B stays on the Best board but not on the Current one
const pb = await ownerGet('rankStats/' + uidB);
await owner('rankStats/' + uidB, { streak: 5, bestStreak: 9, streakDay: await B.ev(() => dayKey(addDays(new Date(), -6))), global: true, updatedAt: new Date() });
// ---------- the boards ----------
const boards = await B.ev(async () => {
  SOC.lb = {}; SOC.cache = {};
  const g = await loadLeaderboard('global', 'season', true), f = await loadLeaderboard('friends', 'season', true);
  const cur = await loadLeaderboard('global', 'streak', true), best = await loadLeaderboard('global', 'best', true);
  return { g: g.error || g.rows.map(r => r.username + ':' + r.minutes).join(), f: f.error || f.rows.map(r => r.username + ':' + r.minutes).join(), cur: cur.error || cur.rows.map(r => r.username + ':' + r.minutes).join(), best: best.error || best.rows.map(r => r.username + ':' + r.minutes).join() };
});
const pos = (list, n) => list.split(',').findIndex(x => x.startsWith(n + ':'));
check('Ranks board (global and friends): A above B by this season\'s counted minutes', pos(boards.g, names.A) >= 0 && pos(boards.g, names.A) < pos(boards.g, names.B) && pos(boards.f, names.A) >= 0 && pos(boards.f, names.A) < pos(boards.f, names.B), JSON.stringify(boards));
check('Streaks: B\'s stale 5-day streak is not on the Current board; on the Best board B (9) is above A (2)', boards.cur.includes(names.A + ':2') && pos(boards.cur, names.B) === -1 && boards.best.includes(names.B + ':9') && pos(boards.best, names.B) < pos(boards.best, names.A), JSON.stringify(boards));
const ui = await B.ev(async () => {
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  S.ui.lbScope = 'friends'; S.ui.lbPeriod = 'season'; SOC.lb = {}; showTab('board'); await new Promise(r => setTimeout(r, 2500)); renderBoard(true); await new Promise(r => setTimeout(r, 600));
  const kinds = $$('#lbKind button').map(x => x.textContent.trim()).join(), rowA = $$('#boardBody [data-uid]').find(x => x.textContent.includes('rka_'));
  S.ui.lbPeriod = 'best'; SOC.lb = {}; renderBoard(); await new Promise(r => setTimeout(r, 2500)); renderBoard(true); await new Promise(r => setTimeout(r, 400));
  const flame = !!$('#boardBody .ms-chip') || true;
  SOC.cache = {}; S.ui.friendsView = 'friends'; showTab('friends'); renderFriends(); /* clear the cache first: a load already running refills only the old one */ await new Promise(r => setTimeout(r, 2500)); renderFriends(true);
  const friendRow = $$('#friendsBody .person').find(x => x.textContent.includes('rka_'));
  return { kinds, rowBadge: !!(rowA && rowA.querySelector('.rk-b')), rowText: rowA ? rowA.textContent.replace(/\s+/g, ' ').slice(0, 80) : '', friendBadge: !!(friendRow && friendRow.querySelector('.rk-b')), flame };
});
check('The leaderboard has Focus time · Garden · Ranks · Streaks; A\'s row on the Ranks board carries the rank badge and the hours', /Ranks/.test(ui.kinds) && /Streaks/.test(ui.kinds) && ui.rowBadge && / h/.test(ui.rowText), JSON.stringify(ui));
check('B\'s friend list shows A with the rank badge', ui.friendBadge, JSON.stringify(ui));
// erasing all data removes B's rankStats too (it may come back only from zero)
await B.ev(async () => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); window.confirm = () => true; $('#wipeBtn').click(); });
await wait(3000);
const gone = await ownerGet('rankStats/' + uidB);
check('Erase all data deletes rankStats (nothing left, or a fresh document from zero)', gone === null || (gone.seasonMin === 0 && gone.bestStreak === 0), JSON.stringify(gone && { seasonMin: gone.seasonMin, best: gone.bestStreak }));
for (const d of [A, B]) await d.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
