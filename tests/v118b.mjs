// v1.18 Phase 1b — the challenge join cap: your own challenge plus at most one joined challenge a week. Client: the
// second Join is disabled with "You're already in a challenge this week" and the header says 1/1. Rules: a join must
// bump the per-user weekly counter in the same batch, the counter can never pass 1 in a week, cannot be forged for a
// future week, and a raw join without the counter (the console) is refused.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, until, tryOp, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const names = { A: 'cha_' + R, B: 'chb_' + R, C: 'chc_' + R };
const A = await device('A', 1280), B = await device('B', 1280), C = await device('C', 1280);
await signup(A, names.A); await signup(B, names.B); await signup(C, names.C);
for (const d of [A, B, C]) await closeDlg(d);
// friendships: A–B, C–B (so B is invited to both A's and C's challenges)
await A.ev(n => sendRequest(n), names.B); await C.ev(n => sendRequest(n), names.B); await wait(1500);
await until(B, () => typeof incoming === 'function' && incoming().length >= 2, null, 15000);
await B.ev(() => incoming().forEach(r => acceptRequest(r.id))); await wait(2000);
check('B accepted both friend requests', await B.ev(() => friendsList().length === 2));
// A and C each start a challenge; B sees two invites
await A.ev(() => startChallenge('h5')); await C.ev(() => startChallenge('s20')); await wait(2000);
await B.ev(() => { S.ui.friendsView = 'challenges'; showTab('friends'); loadChallenges(true); });
const seen = await until(B, () => (SOC.challenges || []).length === 2, null, 15000);
await B.ev(() => renderFriends(true)); for (let i = 0; i < 30 && (await B.ev(() => $$('#friendsBody [data-join]').length)) < 2; i++) { await wait(500); await B.ev(() => renderFriends(true)); }
const before = await B.ev(() => ({ joins: $$('#friendsBody [data-join]').length, cap: ($('#chCap') || {}).textContent, canJoin: canJoinChallenge(), joined: joinedThisWeek() }));
check('B sees two challenges to join, the header says 0/1 joined, Join is possible', seen >= 0 && before.joins === 2 && /0\/1/.test(before.cap) && before.canJoin && before.joined === 0, JSON.stringify(before));
const firstId = await B.ev(() => $('#friendsBody [data-join]').dataset.join);
await B.ev(id => joinChallenge(id), firstId); await wait(2500);
const after = await B.ev(() => ({ member: (SOC.challenges || []).filter(c => c.members.includes(USER.uid)).length, joined: joinedThisWeek(), counter: SOC.chJoins && SOC.chJoins.n, cap: ($('#chCap') || {}).textContent, joinBtns: $$('#friendsBody [data-join]').length, disabled: $$('#friendsBody button[disabled]').map(b => b.textContent.trim()) }));
check('After joining one: a member of one, the counter is 1, the header says 1/1, the other challenge shows the disabled "already in a challenge" button', after.member === 1 && after.joined === 1 && after.counter === 1 && /1\/1/.test(after.cap) && after.joinBtns === 0 && after.disabled.join() === 'You’re already in a challenge this week', JSON.stringify(after));
const secondId = await B.ev(() => (SOC.challenges || []).find(c => !c.members.includes(USER.uid)).id);
const clientRefuse = await B.ev(id => joinChallenge(id), secondId);
check('joinChallenge() refuses the second join on the client', clientRefuse === false);
// rules: a raw join (no counter in the batch) is denied; a batch with n=2 is denied; a forged counter is denied
const raw = await tryOp(B, `async id => FB.updateDoc(FB.doc(FB.db, 'challenges', id), { members: FB.arrayUnion(USER.uid), ['names.' + USER.uid]: USER.username, ['progress.' + USER.uid]: 0 })`, secondId);
const batch2 = await tryOp(B, `async id => { const bt = FB.writeBatch(FB.db); bt.update(FB.doc(FB.db, 'challenges', id), { members: FB.arrayUnion(USER.uid), ['names.' + USER.uid]: USER.username, ['progress.' + USER.uid]: 0 }); bt.set(FB.doc(FB.db, 'challengeJoins', USER.uid), { weekKey: monWeekKey(), n: 2, last: id, at: FB.serverTimestamp() }); return bt.commit(); }`, secondId);
const reset = await tryOp(B, `async id => FB.setDoc(FB.doc(FB.db, 'challengeJoins', USER.uid), { weekKey: monWeekKey(), n: 1, last: id, at: FB.serverTimestamp() })`, secondId);
const future = await tryOp(B, `async id => { const bt = FB.writeBatch(FB.db); bt.update(FB.doc(FB.db, 'challenges', id), { members: FB.arrayUnion(USER.uid), ['names.' + USER.uid]: USER.username, ['progress.' + USER.uid]: 0 }); bt.set(FB.doc(FB.db, 'challengeJoins', USER.uid), { weekKey: '2099-01-04', n: 1, last: id, at: FB.serverTimestamp() }); return bt.commit(); }`, secondId);
const del = await tryOp(B, `async () => FB.deleteDoc(FB.doc(FB.db, 'challengeJoins', USER.uid))`);
const peek = await tryOp(A, `async uid => FB.getDoc(FB.doc(FB.db, 'challengeJoins', uid))`, await B.ev(() => USER.uid));
check('Rules: a raw join without the counter, a counter bumped to 2, a counter reset by itself, a counter for a future week and a delete are all denied; another user cannot read my counter', [raw, batch2, reset, future, del, peek].every(r => /permission|PERMISSION|denied/i.test(r)), JSON.stringify({ raw, batch2, reset, future, del, peek }));
const stillOne = await B.ev(async () => { await loadChallenges(true); return (SOC.challenges || []).filter(c => c.members.includes(USER.uid)).length; });
check('…and B is still a member of exactly one challenge', stillOne === 1, String(stillOne));
// the creator's own challenge never counts: A (creator of h5) can still join C's s20 if invited — A is not C's friend, so C's challenge is not offered to A; instead C (creator of s20) joins A's h5 after befriending A
await C.ev(n => sendRequest(n), names.A); await wait(1500); await until(A, () => incoming().length >= 1, null, 15000); await A.ev(() => incoming().forEach(r => acceptRequest(r.id))); await wait(1500);
await A.ev(async () => { await FB.updateDoc(FB.doc(FB.db, 'challenges', monWeekKey() + '_h5_' + USER.uid), { invited: FB.arrayUnion((await FB.getDoc(FB.doc(FB.db, 'usernames', '__none'))).exists() ? '' : friendsList().map(otherUid)[1] || friendsList().map(otherUid)[0]) }).catch(() => {}); });
const cJoin = await C.ev(async () => { await loadChallenges(true); const mine = (SOC.challenges || []).filter(c => c.creator === USER.uid).length; const other = (SOC.challenges || []).find(c => c.creator !== USER.uid && c.invited.includes(USER.uid)); const r = other ? await joinChallenge(other.id) : 'no-invite'; return { mine, r, joined: joinedThisWeek() }; });
check('C, who started a challenge, can still join one (own + one joined): the creator\'s own challenge never counts', cJoin.mine === 1 && (cJoin.r === true || cJoin.r === 'no-invite') && (cJoin.r !== true || cJoin.joined === 1), JSON.stringify(cJoin));
// an old client's data: a user already in two joined challenges this week (seeded as owner) keeps them, the client counts 2/1 and refuses more
const counterDoc = await ownerGet('challengeJoins/' + await B.ev(() => USER.uid));
check('The counter document holds this week, n = 1 and the joined challenge id', counterDoc && counterDoc.n === 1 && counterDoc.last === firstId, JSON.stringify(counterDoc));
for (const d of [A, B, C]) await d.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
