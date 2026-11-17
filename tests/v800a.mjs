// v2.0 phase 8: a 10-day simulation. One account on two devices (A online throughout, B offline for three days), a
// friend F, and N, who signs up through the account's invite link and becomes active during the ten days.
// Past days are logged as they would have been (backdated blocks written by the device that ran them; B's while it is
// offline), with what 2.0 added: intentions and answers, a rest day, a pause, planned focus blocks moved on both
// devices (one of them on both, at different times), and the referral's three check-ins. Today B is back, A runs a
// real block and both devices read the invite count at the same moment.
// Afterwards both devices must agree on everything — blocks (none lost, none twice), the streak with its kept days,
// answers, the calendar (the later edit wins), coins and the claims ledger — the thank-you and the welcome gift exist
// once each, the friend sees each post once, and no inbox line is doubled.
// (The 18 hours between check-ins are moved with the emulator's owner token; the app cannot move time.)
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, U, owner, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5), NAME = 'ten_' + R, FN = 'tenf_' + R, NN = 'tenn_' + R;
const ago19 = () => new Date(Date.now() - 19 * 3600e3);
const settle = async d => { await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(3000); await d.ev(() => { if ($('#tutDlg') && $('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); }); };
const A = await device('A', 1280, {}, { overtime: true }), F = await device('F', 1280, {}, { overtime: true });
await Promise.all([signup(A, NAME), signup(F, FN)]); await Promise.all([closeDlg(A), closeDlg(F)]);
await A.ev(n => sendRequest(n), FN); await wait(1500);
await F.ev(() => acceptRequest(incoming()[0].id)); await wait(1500);
// N arrives through the account's link and signs up (the app writes the referral and sends a friend request)
const N = await device('N', 1280, {}, { overtime: true });
await N.p.goto(U + '&ref=' + NAME); await N.p.waitForSelector('#authView:not(.hidden)'); await N.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await N.p.click('[data-mode=signup] >> visible=true'); await N.p.fill('#authUser', NN); await N.p.fill('#authPass', 'secret12'); await N.p.fill('#authPass2', 'secret12'); await N.p.click('#authSubmit');
await settle(N); await wait(1500);
const [uA, uN] = [await A.ev(() => USER.uid), await N.ev(() => USER.uid)];
await A.ev(async () => { const f = incoming()[0]; if (f) await acceptRequest(f.id); }); await wait(1500);
// three planned focus blocks, made on A before B exists
await A.ev(() => {
  const now = Date.now(), key = n => dayKey(addDays(startOfDay(new Date()), n));
  const blk = (id, title, n, time) => ({ id, title, session: title, date: key(n), time, repeat: 'none', days: [], before: 5, presetId: 'p-deep', kind: 'block', dur: 50, done: {}, snooze: {}, created: now, updated: now });
  S.reminders.push(blk('x1', 'Maths block', 2, '16:00'), blk('x2', 'Physics block', 3, '10:00'), blk('x4', 'Shared block', 4, '09:00'));
  S.settings.goalMin = 60; S.settings.energy = 'off'; save();
});
await wait(2500);
const B = await device('B', 1280, {}, { overtime: true });
await B.p.goto(U); await B.p.waitForSelector('#authView:not(.hidden)'); await B.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', NAME); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
await settle(B);
const start = await B.ev(() => S.reminders.filter(r => /^x\d$/.test(r.id)).length);

const logPast = (d, specs) => d.ev(specs => {
  const add = specs.map(([ago, h, min, id, ans]) => { const day = addDays(startOfDay(new Date()), -ago), st = +day + h * 3600e3; return { id, name: 'Sim', start: st, end: st + min * 6e4, duration: min * 6e4, planned: min * 6e4, int: 'Chapter ' + ago, ...(ago % 3 ? { dx: ago % 3 } : {}), _ans: ans }; });
  for (const s of add) { if (s._ans) S.debrief[s.id] = s._ans; delete s._ans; }
  S.sessions.push(...add); S.sessions.sort((x, y) => x.start - y.start); cloudAddSessions(add); G = null; save();
  postsFromNews(reconcileRewards('collect'));   // what the app does after a block: rewards, then posts for what was unlocked
  return add.length;
}, specs);
const move = (d, id, n, min) => d.ev(([id, n, min]) => calMove({ kind: 'block', r: S.reminders.find(x => x.id === id) }, dayKey(addDays(startOfDay(new Date()), n)), min), [id, n, min]);
// N's check-in: 19 hours "later" on the server and on N's device, with `min` published minutes
const checkIn = async min => {
  await N.ev(() => { window.publishPublic = () => {}; });
  await owner('referrals/' + uN, { checkAt: ago19() }); await owner('publicStats/' + uN, { lifeMin: min });
  return N.ev(m => { S.invite.ref.checkAt = Date.now() - 19 * 3600e3; SOC.myStats = { ...(SOC.myStats || {}), lifeMin: m }; INV.retryAt = 0; return inviteCheckIn(); }, min);
};
// ---------- days 9 … 1 ago ----------
const want = [], ins = [], offline = {};
for (let ago = 9; ago >= 1; ago--) {
  if (ago === 8) await A.ev(() => { const k = n => dayKey(addDays(startOfDay(new Date()), n)); S.game.rest[k(-8)] = addDays(startOfDay(new Date()), -6).getDay(); save(); });   // a rest day, chosen then
  if (ago === 5) { await B.ctx.setOffline(true); await wait(500); }
  if (ago !== 6 && ago !== 2) { const a = [[ago, 9, 70, 'tA' + ago, 1 + ago % 3]]; await logPast(A, a); want.push('tA' + ago); }   // day 6 is the rest day; day 2 is paused
  if (ago <= 5 && ago >= 3) { await logPast(B, [[ago, 20, 60, 'tB' + ago, 2]]); want.push('tB' + ago); }                          // B, offline, in the evening
  if (ago === 5) { await move(B, 'x2', 5, 11 * 60); await B.ev(() => { const now = Date.now(); S.reminders.push({ id: 'x3', title: 'Chemistry block', session: 'Chemistry block', date: dayKey(addDays(startOfDay(new Date()), 6)), time: '18:00', repeat: 'none', days: [], before: 5, presetId: 'p-deep', kind: 'block', dur: 50, done: {}, snooze: {}, created: now, updated: now }); save(); }); }
  if (ago === 4) { await move(A, 'x1', 6, 15 * 60); await move(A, 'x4', 7, 8 * 60); }
  if (ago === 3) { await wait(1200); await move(B, 'x4', 8, 12 * 60); offline.during = await A.ev(() => S.sessions.filter(s => /^tB[345]$/.test(s.id)).length); }                                                            // the same block, later, on the offline device
  if (ago === 2) { await A.ev(() => { S.game.pauses[dayKey(addDays(startOfDay(new Date()), -2))] = 1; save(); }); await B.ctx.setOffline(false); await wait(6000); }   // a one-day pause on A; B is back
  if (ago === 1) { await logPast(B, [[1, 20, 30, 'tB1', 3]]); want.push('tB1'); }
  if (ago === 6) ins.push(await checkIn(40));
  if (ago === 3) ins.push(await checkIn(110));
  if (ago === 1) ins.push(await checkIn(200));
  await wait(400);
}
offline.after = await A.ev(() => S.sessions.filter(s => /^tB[345]$/.test(s.id)).length);
// ---------- today ----------
await wait(3000);
const today = await A.ev(async () => {
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  S.settings.overtime = false; S.timer.intent = 'Finish the mock paper';
  const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 25 * 60000; t.focusStartedAt = Date.now() - t.planned; t.dxFor = t.focusStartedAt; t.dx = 2; t.endAt = Date.now() - 1;
  await new Promise(r => setTimeout(r, 2200));
  const s = S.sessions.slice().sort((x, y) => x.end - y.end).pop(), row = document.querySelector('#debriefRow [data-debrief="2"]');
  if (row) row.click();
  await new Promise(r => setTimeout(r, 400));
  return { id: s && s.id, int: s && s.int, dx: s && s.dx, asked: !!row, ans: s && S.debrief[s.id] };
});
if (today.id) want.push(today.id);
await wait(3000);
await Promise.all([A, B].map(async d => { await d.p.reload(); await settle(d); }));
// both devices open the invite page at the same moment
await Promise.all([A, B].map(d => d.ev(() => inviteSync(true))));
await wait(4000);
await Promise.all([A, B, N].map(async d => { await d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await d.p.reload(); await settle(d); }));
await wait(2000);

const snap = d => d.ev(() => {
  G = null; const g = game(), cl = S.game.claims, ids = S.sessions.map(s => s.id).sort(), rem = S.reminders.filter(r => /^x\d$/.test(r.id)).sort((a, b) => (a.id < b.id ? -1 : 1));
  const off = k => Math.round((parseDay(k) - startOfDay(new Date())) / 864e5), keep = streakKeeper(), key = n => dayKey(addDays(startOfDay(new Date()), n));
  return { ids, dup: ids.length - new Set(ids).size, streak: [g.streak.cur, g.streak.longest], kept: [keep(key(-6)), keep(key(-2))], rest: Object.values(S.game.rest), pauses: Object.values(S.game.pauses),
    debrief: Object.keys(S.debrief).sort().map(k => k + '=' + S.debrief[k]).join(), cal: rem.map(r => `${r.id}@${off(r.date)}@${r.time}`).join(), remDup: S.reminders.length - new Set(S.reminders.map(r => r.id)).size,
    coins: g.balance, claims: Object.fromEntries(Object.entries(cl).map(([k, v]) => [k, Object.keys(v || {}).filter(x => x !== '_from').length])), invite: Object.keys(cl.invite).sort().join(), n: S.invite.n, buddy: g.owned.has('ti_i_buddy'),
    ints: S.sessions.filter(s => s.int).length, dx: S.sessions.reduce((a, s) => a + (+s.dx || 0), 0), inboxDup: (() => { ibLoad(); const k = IB.map(x => x.key).filter(Boolean); return k.length - new Set(k).size; })() };
});
const [sa, sb] = [await snap(A), await snap(B)];
check('The ten days ran as planned: both devices started with the same three planned blocks, B’s offline blocks were not on A until B came back, N’s three check-ins went through, and today’s block on A kept its intention, its two distractions and the answer “Part of it”',
  start === 3 && offline.during === 0 && offline.after === 3 && ins.join() === 'true,true,true' && today.asked && today.int === 'Finish the mock paper' && today.dx === 2 && today.ans === 2, JSON.stringify({ start, offline, ins, today }));
check('Both devices have every block of the ten days — A’s, B’s offline ones and today’s — none lost, none twice, with their intentions and distraction counts',
  want.every(id => sa.ids.includes(id) && sb.ids.includes(id)) && sa.dup === 0 && sb.dup === 0 && sa.ids.join() === sb.ids.join() && sa.ints === sb.ints && sa.ints === want.length && sa.dx === sb.dx, JSON.stringify({ want: want.length, a: sa.ids.length, b: sb.ids.length, missingA: want.filter(i => !sa.ids.includes(i)), missingB: want.filter(i => !sb.ids.includes(i)), ints: [sa.ints, sb.ints], dx: [sa.dx, sb.dx] }));
check('The streak is 7 on both: the rest day and the paused day carried it without adding to it (set on one device, known on both)',
  sa.streak.join() === '7,7' && sb.streak.join() === '7,7' && sa.kept.join() === 'rest,pause' && sb.kept.join() === 'rest,pause' && sa.rest.length === 1 && sb.rest.length === 1 && sa.pauses.join() === '1' && sb.pauses.join() === '1', JSON.stringify({ a: [sa.streak, sa.kept, sa.rest, sa.pauses], b: [sb.streak, sb.kept, sb.rest, sb.pauses] }));
check('Every answer to “How far did you get?” is on both devices, whichever device gave it', sa.debrief === sb.debrief && sa.debrief.split(',').length === want.length && /tB4=2/.test(sa.debrief) && /tA9=1/.test(sa.debrief), JSON.stringify({ a: sa.debrief, b: sb.debrief }));
check('The calendar agrees: A’s move of one block, B’s offline move of another and B’s new block are all there, and the block both devices moved is where the later move (B’s) put it — nothing doubled',
  sa.cal === sb.cal && sa.cal === 'x1@6@15:00,x2@5@11:00,x3@6@18:00,x4@8@12:00' && sa.remDup === 0 && sb.remDup === 0, JSON.stringify({ a: sa.cal, b: sb.cal }));
check('The same coins and claims ledger on both devices; the invite thank-you was claimed once although both devices read the count together (one friend stayed: the thank-you and the first gift)',
  sa.coins === sb.coins && JSON.stringify(sa.claims) === JSON.stringify(sb.claims) && sa.invite === 'f1,m1' && sb.invite === 'f1,m1' && sa.n === 1 && sb.n === 1 && sa.buddy && sb.buddy && sa.inboxDup === 0 && sb.inboxDup === 0, JSON.stringify({ coins: [sa.coins, sb.coins], claims: [sa.claims, sb.claims], invite: [sa.invite, sb.invite], n: [sa.n, sb.n], inboxDup: [sa.inboxDup, sb.inboxDup] }));
const nn = await N.ev(() => ({ state: S.invite.ref && S.invite.ref.state, claim: Object.keys(S.game.claims.invite).join(), title: game().owned.has('ti_i_newleaf') }));
const srv = { ref: await ownerGet('referrals/' + uN), stats: await ownerGet('inviteStats/' + uA), prof: await ownerGet('users/' + uA) };
check('N is active and has the welcome gift once; the server has one active referral and a count of 1; the account’s cloud profile holds the rest day, the pause and the invite count',
  nn.state === 'active' && nn.claim === 'in' && nn.title && srv.ref.state === 'active' && srv.ref.checks === 3 && srv.stats.n === 1 && Object.keys((srv.prof.game || {}).rest || {}).length === 1 && Object.keys((srv.prof.game || {}).pauses || {}).length === 1 && (srv.prof.invite || {}).n === 1, JSON.stringify({ nn, ref: srv.ref.state, stats: srv.stats, rest: (srv.prof.game || {}).rest, pauses: (srv.prof.game || {}).pauses, invite: srv.prof.invite }));
const feed = await F.ev(async ua => { await loadPosts(true); const L = (POST.list || []).filter(p => p.author === ua); const ids = L.map(p => p.id); return { n: L.length, dup: ids.length - new Set(ids).size, types: [...new Set(L.map(p => p.type))] }; }, uA);
check('The friend sees the account’s posts once each, although two devices unlocked the same things', feed.n > 0 && feed.dup === 0, JSON.stringify(feed));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 5)));
log(failCount() ? `✗ ${failCount()} FAILED` : '✓ all passed');
await b.close();
process.exit(failCount() ? 1 : 0);
