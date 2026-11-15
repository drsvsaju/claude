// v1.20 phase 5: a 7-day simulation with one account on two devices (A online all week, B offline for the last four
// days) and a friend F. Past days are logged as they would be (backdated blocks written by the device that ran them;
// B's while it is offline). Today: B comes back online, A runs a real Overtime block, both claim the same Study Pass
// tiers at once, and both unlock the same achievements. Afterwards both devices must agree on everything: sessions
// (no loss, no duplicates), pass state, coins, the claims ledger, streak, the rank's 14 h day cap — and F sees one post
// per thing, none of them from before 1.20 (no backfill).
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, U } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5), NAME = 'sim_' + R, FN = 'simf_' + R;
const A = await device('A', 1280, {}, { overtime: true }), F = await device('F', 1280, {}, { overtime: true });
await Promise.all([signup(A, NAME), signup(F, FN)]); await Promise.all([closeDlg(A), closeDlg(F)]);
await A.ev(n => sendRequest(n), FN); await wait(1500);
await F.ev(() => acceptRequest(incoming()[0].id)); await wait(2000);
const B = await device('B', 1280, {}, { overtime: true });
await B.p.goto(U); await B.p.waitForSelector('#authView:not(.hidden)'); await B.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', NAME); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(B);
// as if this account had 1.20 since the event began (so the event's days in the week count for the pass)
await A.ev(() => { S.game.claims.pass._from = evStart(currentEvent()); S.settings.goalMin = 60; save(); });
await wait(2500);
const logPast = (d, specs) => d.ev(specs => {
  const add = specs.map(([ago, h, min, id]) => { const day = addDays(startOfDay(new Date()), -ago), st = +day + h * 3600e3; return { id, name: 'Sim', start: st, end: st + min * 6e4, duration: min * 6e4, planned: min * 6e4 }; });
  S.sessions.push(...add); S.sessions.sort((x, y) => x.start - y.start); cloudAddSessions(add); G = null; PASSC = null; save();
  return add.length;
}, specs);
// days 6 … 1 ago. A: 90 min every day; 3 days ago a 16-hour day (four 240-minute blocks) — the rank and Focus track
// count 14 h of it. B: offline from 4 days ago, 60 minutes each evening.
const want = [];
for (let ago = 6; ago >= 1; ago--) {
  if (ago === 4) { await B.ctx.setOffline(true); await wait(500); }
  const a = ago === 3 ? [[ago, 6, 240, 'simA' + ago + 'a'], [ago, 10, 240, 'simA' + ago + 'b'], [ago, 14, 240, 'simA' + ago + 'c'], [ago, 18, 240, 'simA' + ago + 'd']] : [[ago, 9, 90, 'simA' + ago]];
  await logPast(A, a); want.push(...a.map(x => x[3]));
  // after each day's blocks, each device does what the app does after a block: rewards, then posts for what was unlocked
  await A.ev(() => { postsFromNews(reconcileRewards('collect')); });
  if (ago <= 4) { const bb = [[ago, 20, 60, 'simB' + ago]]; await logPast(B, bb); want.push(...bb.map(x => x[3])); await B.ev(() => { postsFromNews(reconcileRewards('collect')); }); }
  await wait(400);
}
const offlineSeen = await A.ev(() => S.sessions.filter(s => /^simB/.test(s.id)).length);
check('While B is offline, A doesn’t have B’s blocks (they are queued on B)', offlineSeen === 0, String(offlineSeen));
// today: B is back
await B.ctx.setOffline(false); await wait(6000);
// A: a real Overtime block (planned 1 minute, already over; it counts up; Stop logs planned + overtime)
const ot = await A.ev(async () => {
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 60000; t.focusStartedAt = Date.now() - 4 * 60000; t.endAt = Date.now() - 3 * 60000;
  await new Promise(r => setTimeout(r, 1500));
  const inOt = !!S.timer.ot;
  $('#mainBtn').click(); await new Promise(r => setTimeout(r, 1200));
  const s = S.sessions.slice().sort((x, y) => x.end - y.end).pop();
  return { inOt, ot: s && s.ot, min: s && Math.round(s.duration / 6e4), id: s && s.id };
});
check('Today on A: an Overtime block (1 minute planned, ~3 more) is logged once as planned + overtime', ot.inOt && ot.ot >= 2 && ot.min >= 3, JSON.stringify(ot));
if (ot.id) want.push(ot.id);
await wait(3000);
// both devices reload (the way the next visit sees it) and settle
await Promise.all([A, B].map(async d => { await d.p.reload(); await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(3000); await closeDlg(d); }));
// both claim the same pass tiers at the same moment, then Claim all on both
const claimable = await A.ev(() => { G = null; PASSC = null; return passClaimable(currentEvent()); });
await Promise.all([A, B].map(d => d.ev(w => { G = null; PASSC = null; passClaim(currentEvent(), w); save(); }, claimable)));
await wait(4000);
await Promise.all([A, B].map(d => d.ev(() => { G = null; PASSC = null; passClaim(currentEvent(), []); reconcileRewards('quiet'); save(); })));
await wait(5000);
await Promise.all([A, B].map(async d => { await d.p.reload(); await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(4000); await closeDlg(d); }));
const snap = d => d.ev(() => {
  G = null; PASSC = null; const ev = currentEvent(), st = passState(ev), g = game(), cl = S.game.claims, r = myRank();
  const ids = S.sessions.map(s => s.id).sort(), dup = ids.length - new Set(ids).size;
  const day3 = dayKey(addDays(startOfDay(new Date()), -3));
  return { ids, dup, xp: st.xp, tier: st.tier, hours: Math.round(st.hours * 100) / 100, step: st.step, coins: g.balance, pass: JSON.stringify(Object.keys(cl.pass).filter(k => k !== '_from').sort().map(k => [k, cl.pass[k]])),
    claims: Object.fromEntries(['login', 'wq', 'quests', 'ach', 'evo', 'season', 'goalDays'].map(k => [k, Object.keys(cl[k] || {}).length])), streak: g.streak.cur, rankMin: r.min, day3: (g.idx[day3] || {}).total || 0, produce: garden().produce };
});
const [sa, sb] = [await snap(A), await snap(B)];
check('Both devices have every block of the week: A’s, B’s offline ones and today’s Overtime block — none lost, none twice', want.every(id => sa.ids.includes(id) && sb.ids.includes(id)) && sa.dup === 0 && sb.dup === 0 && sa.ids.join() === sb.ids.join(), JSON.stringify({ missingA: want.filter(i => !sa.ids.includes(i)), missingB: want.filter(i => !sb.ids.includes(i)), dup: [sa.dup, sb.dup], n: [sa.ids.length, sb.ids.length] }));
check('The Study Pass is the same on both: Pass XP, tier, Focus hours and step; the same tiers claimed at the same times (each once)', sa.xp === sb.xp && sa.tier === sb.tier && sa.hours === sb.hours && sa.step === sb.step && sa.pass === sb.pass && sa.pass.length > 2, JSON.stringify({ a: [sa.xp, sa.tier, sa.hours, sa.step], b: [sb.xp, sb.tier, sb.hours, sb.step], claimed: JSON.parse(sa.pass).length }));
check('The same coins, garden produce and claims ledger on both devices', sa.coins === sb.coins && sa.produce === sb.produce && JSON.stringify(sa.claims) === JSON.stringify(sb.claims), JSON.stringify({ coins: [sa.coins, sb.coins], produce: [sa.produce, sb.produce], claims: [sa.claims, sb.claims] }));
check('A 6-day streak on both (the daily goal met on each of the six past days; today’s goal isn’t met yet)', sa.streak >= 6 && sb.streak === sa.streak, JSON.stringify([sa.streak, sb.streak]));
// rank minutes: the 16-hour day counts 14 h (840 min) — everything else in full
const expRank = await A.ev(() => { const g = game(), mk = myRank().mk; let m = 0; for (const [k, v] of Object.entries(g.idx)) if (k.startsWith(mk) && v && v.total) m += Math.min(840, v.total); return m; });
check('Rank minutes agree on both, and the 17-hour day (A’s 16 h + B’s 1 h) counted 14 h toward the rank (Stats still shows all 17 h)', sa.rankMin === sb.rankMin && sa.day3 === 1020 && Math.floor(expRank) === sa.rankMin, JSON.stringify({ rank: [sa.rankMin, sb.rankMin], expect: expRank, day3: sa.day3 }));
// F's feed: one post per thing, nothing twice although both devices unlocked the same achievements
const uA = await A.ev(() => USER.uid);
const feed = await F.ev(async ua => { await loadPosts(true); const L = (POST.list || []).filter(p => p.author === ua); const ids = L.map(p => p.id); return { n: L.length, dup: ids.length - new Set(ids).size, types: [...new Set(L.map(p => p.type))], old: L.filter(p => Date.now() - p.at > 864e5).length }; }, uA);
check('F’s Posts: posts from this week arrive once each (both devices unlocked the same achievements), and none is dated before 1.20', feed.n > 0 && feed.dup === 0 && feed.old === 0, JSON.stringify(feed));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 5)));
log(failCount() ? `${failCount()} FAILED` : 'ALL PASSED');
await b.close();
process.exit(failCount() ? 1 : 0);
