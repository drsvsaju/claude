// v1.14.3 security audit: the same attacks, as a malicious signed-in user, against the rules before the audit and after.
// Prints the table (attack → before → after) and fails if any "after" result isn't what the fixed rules must give.
// Runs twice (fresh accounts each time) because some attacks change state when they succeed.
import fs from 'fs';
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, focus, owner, ownerGet, ownerCreate, tryOp } from './cl-common.mjs';
const S = '/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/';
const RULES = { before: S + 'v1143/firestore.rules.pre-audit', after: '/home/user/claude/firestore.rules' };   // 'after' = the repository's current rules (1.16+), restored when the suite ends
const den = r => /permission-denied|PERMISSION_DENIED/.test(String(r)) ? 'denied' : r === 'ALLOWED' ? 'ALLOWED' : String(r).slice(0, 40);
const table = {};   // attack -> { before, after }
const EXPECT = {};  // attack -> what the fixed rules must give ('denied' | 'ALLOWED' | a function on the result string)

async function runAttacks(tag) {
  const R = tag[0] + Date.now().toString(36).slice(-4), res = {};
  const att = (name, val, expect) => { res[name] = val; (table[name] ||= {})[tag] = val; if (expect !== undefined) EXPECT[name] = expect; log(`  [${tag}] ${name} → ${val}`); };
  const raw = (d, src, ...args) => tryOp(d, src, ...args).then(den);
  const V = await device('V' + tag, 1000), F = await device('F' + tag, 1000), A = await device('A' + tag, 1000), L = await device('L' + tag, 1000), M = await device('M' + tag, 1000), O = await device('O' + tag, 1000), X = await device('X' + tag, 1000);
  const names = { V: 'v' + R, F: 'f' + R, A: 'a' + R, L: 'l' + R, M: 'm' + R, O: 'o' + R, X: 'x' + R };
  await Promise.all([[V, 'V'], [F, 'F'], [A, 'A'], [L, 'L'], [M, 'M'], [O, 'O'], [X, 'X']].map(([d, k]) => signup(d, names[k])));
  const uid = {}; for (const [d, k] of [[V, 'V'], [F, 'F'], [A, 'A'], [L, 'L'], [M, 'M'], [O, 'O'], [X, 'X']]) uid[k] = await d.ev(() => USER.uid);
  // A and F are friends; V has blocked A; everyone is on the global leaderboard
  await A.ev(n => sendRequest(n), names.F); await wait(1200); await F.ev(() => acceptRequest(incoming()[0].id)); await wait(1200);
  await ownerCreate(`users/${uid.V}/blocked/${uid.A}`, { at: 1 });
  await Promise.all([V, F, A, L, M, O].map(d => d.ev(() => { S.settings.globalBoard = true; S.settings.shareActivity = true; save(); publishPublic(); })));
  // Let those writes be answered before the clan is created. The pre-audit rules refuse today's publicStats; the emulator
  // then drops the write stream, and a clan batch already sent on it is applied and sent again — the second copy is
  // judged as an update of the clan it has just made and reported as refused (about one run in four without this pause).
  await wait(1500);
  // L leads clan T (approval mode); M is a member and O an officer (set up directly, so the run is quick)
  await L.ev(n => clanCreate({ name: n, tag: 'TGT', desc: 'jee' }), 'Target ' + R);
  const T = await L.ev(() => CLAN.id);
  const wk = await L.ev(() => dayKey(weekMonday()));
  for (const [d, k, role] of [[M, 'M', 'member'], [O, 'O', 'officer']]) {
    await ownerCreate(`clans/${T}/members/${uid[k]}`, { name: names[k], role, joinedAt: new Date(), contrib: 0, weekKey: wk, weekMin: 0, lastAt: 0, lastIds: [], avatar: '', color: '', aura: '', level: 1, tier: 'novice', shareNames: false, focusUntil: 0, updatedAt: new Date() });
    await ownerCreate(`clanOf/${uid[k]}`, { clan: T, at: Date.now() });
  }
  await owner(`clans/${T}`, { members: 3 });
  await Promise.all([M, O].map(d => d.ev(() => clanRefresh(true))));
  await wait(1500);

  // ---------- private data of other people ----------
  att('Read another user’s private document (users/{uid})', await raw(A, `() => FB.getDoc(FB.doc(FB.db, 'users', '${uid.V}'))`), 'denied');
  att('Read another user’s inbox', await raw(A, `() => FB.getDocs(FB.collection(FB.db, 'inbox', '${uid.V}', 'items'))`), 'denied');
  att('Read another user’s clanOf', await raw(A, `() => FB.getDoc(FB.doc(FB.db, 'clanOf', '${uid.V}'))`), 'denied');
  att('Read a stranger’s activity (friends only)', await raw(V, `() => FB.getDoc(FB.doc(FB.db, 'activity', '${uid.A}'))`), 'denied');
  att('Read a friend’s activity (allowed by design)', await raw(F, `() => FB.getDoc(FB.doc(FB.db, 'activity', '${uid.A}'))`), 'ALLOWED');
  att('Look up a username (allowed by design: exact name only)', await raw(A, `() => FB.getDoc(FB.doc(FB.db, 'usernames', '${names.V}'))`), 'ALLOWED');
  // ---------- writing other people’s documents, fake identity ----------
  att('Write someone else’s public profile', await raw(A, `async () => { const d = (await FB.getDoc(FB.doc(FB.db, 'publicProfiles', USER.uid))).data(); await FB.setDoc(FB.doc(FB.db, 'publicProfiles', '${uid.V}'), { ...d, username: '${names.V}', updatedAt: FB.serverTimestamp() }); }`), 'denied');
  att('Publish a profile under another username', await raw(A, `async () => { const d = (await FB.getDoc(FB.doc(FB.db, 'publicProfiles', USER.uid))).data(); await FB.setDoc(FB.doc(FB.db, 'publicProfiles', USER.uid), { ...d, username: 'admin', updatedAt: FB.serverTimestamp() }); }`), 'denied');
  att('Wear a clan tag of a clan I’m not in', await raw(A, `async () => { const d = (await FB.getDoc(FB.doc(FB.db, 'publicProfiles', USER.uid))).data(); await FB.setDoc(FB.doc(FB.db, 'publicProfiles', USER.uid), { ...d, clanTag: 'TGT', updatedAt: FB.serverTimestamp() }); }`), 'denied');
  // ---------- leaderboard stats ----------
  att('Inflate my leaderboard minutes by 5,000 in one write', await raw(A, `async () => { const r = FB.doc(FB.db, 'publicStats', USER.uid), d = (await FB.getDoc(r)).data(); await FB.setDoc(r, { ...d, weekMin: d.weekMin + 5000, weekMinSun: d.weekMinSun + 5000, monthMin: d.monthMin + 5000, lifeMin: d.lifeMin + 5000, updatedAt: FB.serverTimestamp() }); }`), 'denied');
  att('Delete my stats and re-create them with 1,000,000 lifetime minutes (self-reported history; see note)', await raw(A, `async () => { const r = FB.doc(FB.db, 'publicStats', USER.uid), d = (await FB.getDoc(r)).data(); await FB.deleteDoc(r); await FB.setDoc(r, { ...d, dayMin: 1440, weekMin: 10080, weekMinSun: 10080, monthMin: 44640, lifeMin: 1000000, updatedAt: FB.serverTimestamp() }); }`), 'ALLOWED');
  // ---------- friends, blocks, inbox ----------
  const pid = [uid.A, uid.V].sort().join('_');
  att('Send a friend request to someone who blocked me', await raw(A, `() => FB.setDoc(FB.doc(FB.db, 'friendships', '${pid}'), { users: ${JSON.stringify([uid.A, uid.V].sort())}, from: USER.uid, to: '${uid.V}', status: 'pending', fromName: USER.username, toName: '${names.V}', createdAt: FB.serverTimestamp() })`), 'denied');
  const fv = [uid.F, uid.V].sort().join('_');
  await ownerCreate(`friendships/${fv}`, { users: [uid.F, uid.V].sort(), from: uid.F, to: uid.V, status: 'pending', fromName: names.F, toName: names.V, createdAt: Date.now() });
  att('Accept a friend request that was sent to someone else', await raw(A, `() => FB.updateDoc(FB.doc(FB.db, 'friendships', '${fv}'), { status: 'accepted', acceptedAt: FB.serverTimestamp() })`), 'denied');
  att('Accept my own request on the recipient’s behalf', await raw(F, `() => FB.updateDoc(FB.doc(FB.db, 'friendships', '${fv}'), { status: 'accepted', acceptedAt: FB.serverTimestamp() })`), 'denied');
  att('Read a blocked person’s profile', await raw(A, `() => FB.getDoc(FB.doc(FB.db, 'publicProfiles', '${uid.V}'))`), 'denied');
  att('Read a blocked person’s stats directly', await raw(A, `() => FB.getDoc(FB.doc(FB.db, 'publicStats', '${uid.V}'))`), 'denied');
  att('See a blocked person on the global leaderboard query (public by their choice; see note)', await A.ev(async u => { try { const qs = await FB.getDocs(FB.query(FB.collection(FB.db, 'publicStats'), FB.where('global', '==', true), FB.limit(100))); return qs.docs.some(d => d.id === u) ? 'ALLOWED' : 'not listed'; } catch (e) { return e.code; } }, uid.V).then(den), 'ALLOWED');
  att('Send kudos to someone who isn’t my friend', await raw(A, `() => FB.setDoc(FB.doc(FB.db, 'inbox', '${uid.V}', 'items', 'k_' + USER.uid + '_x'), { from: USER.uid, fromName: USER.username, type: 'kudos', emoji: '🔥', target: 'x', createdAt: FB.serverTimestamp() })`), 'denied');
  att('Send kudos with a made-up target (not a session id)', await raw(A, `() => FB.setDoc(FB.doc(FB.db, 'inbox', '${uid.F}', 'items', 'k_' + USER.uid + '_hi there!'), { from: USER.uid, fromName: USER.username, type: 'kudos', emoji: '🔥', target: 'hi there!', createdAt: FB.serverTimestamp() })`), 'denied');
  att('Send 20 kudos to a friend in a row (friends only, one per session id; see note)', await A.ev(async u => { let n = 0; for (let i = 0; i < 20; i++) { try { await FB.setDoc(FB.doc(FB.db, 'inbox', u, 'items', 'k_' + USER.uid + '_s' + i), { from: USER.uid, fromName: USER.username, type: 'kudos', emoji: '🔥', target: 's' + i, createdAt: FB.serverTimestamp() }); n++; } catch (e) {} } return n + ' allowed'; }, uid.F), r => /20 allowed/.test(r));
  att('Put a 5,000-character string in my presence (friends read it)', await raw(A, `() => FB.setDoc(FB.doc(FB.db, 'presence', USER.uid), { visible: true, now: { name: 'x', phase: 'x'.repeat(5000) }, updatedAt: FB.serverTimestamp() })`), 'denied');
  // ---------- challenges ----------
  att('Create a challenge with 99,999 minutes of progress', await raw(A, `() => FB.setDoc(FB.doc(FB.db, 'challenges', monWeekKey() + '_h5_' + USER.uid), { preset: 'h5', weekKey: monWeekKey(), creator: USER.uid, members: [USER.uid], invited: [], names: { [USER.uid]: USER.username }, progress: { [USER.uid]: 99999 }, createdAt: FB.serverTimestamp() })`), 'denied');
  await raw(V, `() => FB.setDoc(FB.doc(FB.db, 'challenges', monWeekKey() + '_h5_' + USER.uid), { preset: 'h5', weekKey: monWeekKey(), creator: USER.uid, members: [USER.uid], invited: [], names: { [USER.uid]: USER.username }, progress: { [USER.uid]: 0 }, createdAt: FB.serverTimestamp() })`);
  const vch = await V.ev(() => monWeekKey() + '_h5_' + USER.uid);
  att('Join a challenge I wasn’t invited to', await raw(A, `() => FB.updateDoc(FB.doc(FB.db, 'challenges', '${vch}'), { members: FB.arrayUnion(USER.uid), ['names.' + USER.uid]: USER.username, ['progress.' + USER.uid]: 0 })`), 'denied');
  att('Edit someone else’s progress in a challenge', await raw(A, `() => FB.updateDoc(FB.doc(FB.db, 'challenges', '${vch}'), { ['progress.${uid.V}']: 9999 })`), 'denied');
  await raw(V, `() => FB.setDoc(FB.doc(FB.db, 'challenges', monWeekKey() + '_g5_' + USER.uid), { preset: 'g5', weekKey: monWeekKey(), creator: USER.uid, members: [USER.uid], invited: ['${uid.A}'], names: { [USER.uid]: USER.username }, progress: { [USER.uid]: 0 }, createdAt: FB.serverTimestamp() })`);
  att('A stranger “invites” me to a challenge: does it show up for me? (app filter)', await A.ev(async () => { SOC.challenges = null; await loadChallenges(true); return SOC.challenges.some(c => c.preset === 'g5') ? 'shown' : 'hidden'; }), 'hidden');
  // ---------- clans: as a non-member ----------
  for (const [what, src] of [['private info', `FB.getDoc(cDoc('${T}', 'private', 'info'))`], ['member list', `FB.getDocs(cCol('${T}', 'members'))`], ['planned sessions', `FB.getDocs(cCol('${T}', 'sessions'))`], ['activity feed', `FB.getDocs(cCol('${T}', 'feed'))`]])
    att(`Read a clan’s ${what} as a non-member`, await raw(A, `() => ${src}`), 'denied');
  att('Join an approval-only clan by writing my own member row', await raw(A, `() => { const b = FB.writeBatch(FB.db); b.set(cDoc('${T}', 'members', USER.uid), newMemberDoc('member', USER.username)); b.set(FB.doc(FB.db, 'clanOf', USER.uid), { clan: '${T}', at: FB.serverTimestamp() }); b.update(cDoc('${T}'), { members: FB.increment(1), lastMember: USER.uid, updatedAt: FB.serverTimestamp() }); return b.commit(); }`), 'denied');
  att('File a join request in someone else’s name', await raw(A, `() => FB.setDoc(cDoc('${T}', 'requests', '${uid.V}'), { name: '${names.V}', at: FB.serverTimestamp() })`), 'denied');
  att('Point an invite code at a clan I don’t lead', await raw(A, `() => FB.setDoc(FB.doc(FB.db, 'clanCodes', 'ZZZZZZZZ'), { clan: '${T}' })`), 'denied');
  att('Squat a clan name', await raw(A, `() => FB.setDoc(FB.doc(FB.db, 'clanNames', 'night owls'), { clan: '${T}' })`), 'denied');
  // ---------- clans: as a plain member ----------
  att('Promote myself to officer', await raw(M, `() => FB.updateDoc(cDoc('${T}', 'members', USER.uid), { role: 'officer' })`), 'denied');
  await V.ev(c => clanByCode(c).then(clanRequest), await L.ev(() => CLAN.info.code));
  att('Accept a join request as a plain member', await raw(M, `() => { const b = FB.writeBatch(FB.db), ts = FB.serverTimestamp(); b.set(cDoc('${T}', 'members', '${uid.V}'), { name: '${names.V}', role: 'member', joinedAt: ts, contrib: 0, weekKey: '${wk}', weekMin: 0, lastAt: 0, lastIds: [], avatar: '', color: '', aura: '', level: 1, tier: 'novice', shareNames: false, focusUntil: 0, updatedAt: ts }); b.set(FB.doc(FB.db, 'clanOf', '${uid.V}'), { clan: '${T}', at: ts }); b.delete(cDoc('${T}', 'requests', '${uid.V}')); b.update(cDoc('${T}'), { members: FB.increment(1), lastMember: '${uid.V}', updatedAt: ts }); return b.commit(); }`), 'denied');
  att('Add clan XP without any focus of my own', await raw(M, `async () => { const c = (await FB.getDoc(cDoc('${T}'))).data(); return FB.updateDoc(cDoc('${T}'), { xp: c.xp + 100, level: clanLevelFor(c.xp + 100), weekMin: c.weekMin + 100, monthMin: c.monthMin + 100, updatedAt: FB.serverTimestamp() }); }`), 'denied');
  const CONTRIB = (d, mins, extra = '{}') => raw(d, `async () => { const id = CLAN.id, mref = cDoc(id, 'members', USER.uid), cref = cDoc(id), m = (await FB.getDoc(mref)).data(), c = (await FB.getDoc(cref)).data(), x = ${extra}, d = ${mins};
    const b = FB.writeBatch(FB.db); b.update(mref, { contrib: m.contrib + d, weekKey: x.weekKey || c.weekKey, weekMin: (x.weekKey && x.weekKey !== c.weekKey) ? d : m.weekMin + d, lastAt: Date.now(), lastIds: ['t' + Math.random()], updatedAt: FB.serverTimestamp() });
    b.update(cref, { xp: FB.increment(d), level: clanLevelFor(c.xp + d), updatedAt: FB.serverTimestamp(), ...(x.weekKey && x.weekKey !== c.weekKey ? { weekKey: x.weekKey, weekMin: d, weekGroups: 0 } : { weekMin: FB.increment(d) }),
      ...(x.monthKey && x.monthKey !== c.monthKey ? { monthKey: x.monthKey, monthMin: d, raidHP: raidHPFor(x.monthKey, c.members) } : { monthMin: FB.increment(d) }) }); return b.commit(); }`);
  att('Contribute 2,000 minutes in one write', await CONTRIB(M, 2000), 'denied');
  att('Contribute 5 minutes (legit; positive control)', await CONTRIB(M, 5), 'ALLOWED');
  att('Post a feed event in the leader’s name', await raw(M, `() => FB.addDoc(cCol('${T}', 'feed'), { type: 'raid', who: '${names.L}', n: 0, at: FB.serverTimestamp() })`), 'denied');
  att('Post a “raid defeated” feed line in my own name (presets only; see note)', await raw(M, `() => FB.addDoc(cCol('${T}', 'feed'), { type: 'raid', who: USER.username, n: 0, at: FB.serverTimestamp() })`), 'ALLOWED');
  att('Give myself a 5,000-character level in the member list', await raw(M, `() => FB.updateDoc(cDoc('${T}', 'members', USER.uid), { level: 'x'.repeat(5000) })`), 'denied');
  await owner(`clans/${T}/members/${uid.M}`, { level: 1 });
  // ---------- clans: quest and raid claims ----------
  att('Claim the weekly quest before it’s done', await raw(L, `() => FB.updateDoc(cDoc(CLAN.id), { ['quests.' + CLAN.doc.weekKey]: 'min', tq: FB.increment(1), updatedAt: FB.serverTimestamp() })`), 'denied');
  await owner(`clans/${T}`, { weekMin: 3000, xp: 3000, level: 3 });
  att('Claim the weekly quest when it’s done (positive control)', await raw(L, `() => FB.updateDoc(cDoc(CLAN.id), { ['quests.' + CLAN.doc.weekKey]: 'min', tq: FB.increment(1), updatedAt: FB.serverTimestamp() })`), 'ALLOWED');
  att('Claim the same weekly quest twice', await raw(L, `() => FB.updateDoc(cDoc(CLAN.id), { ['quests.' + CLAN.doc.weekKey]: 'min', tq: FB.increment(1), updatedAt: FB.serverTimestamp() })`), 'denied');
  att('Claim the raid before the boss is down', await raw(L, `() => FB.updateDoc(cDoc(CLAN.id), { ['raids.' + CLAN.doc.monthKey]: raidOf(CLAN.doc.monthKey).id, tr: FB.increment(1), updatedAt: FB.serverTimestamp() })`), 'denied');
  await owner(`clans/${T}`, { monthMin: Math.max(3000, (await ownerGet(`clans/${T}`)).raidHP || 0) });   // the month's boss is down (November bosses have 5,000+ HP)
  att('Claim the raid once it’s down (positive control)', await raw(L, `() => FB.updateDoc(cDoc(CLAN.id), { ['raids.' + CLAN.doc.monthKey]: raidOf(CLAN.doc.monthKey).id, tr: FB.increment(1), updatedAt: FB.serverTimestamp() })`), 'ALLOWED');
  att('Claim the same raid twice', await raw(L, `() => FB.updateDoc(cDoc(CLAN.id), { ['raids.' + CLAN.doc.monthKey]: raidOf(CLAN.doc.monthKey).id, tr: FB.increment(1), updatedAt: FB.serverTimestamp() })`), 'denied');
  // ---------- clans: an officer and the member count ----------
  att('Officer: add a member to the count without anyone joining', await raw(O, `() => FB.updateDoc(cDoc('${T}'), { members: FB.increment(1), updatedAt: FB.serverTimestamp() })`), 'denied');
  att('Officer: add to the count naming an existing member', await raw(O, `() => FB.updateDoc(cDoc('${T}'), { members: FB.increment(1), lastMember: '${uid.M}', updatedAt: FB.serverTimestamp() })`), 'denied');
  att('Officer: shrink the count (cheaper raids and quests) without anyone leaving', await raw(O, `() => FB.updateDoc(cDoc('${T}'), { members: FB.increment(-1), lastMember: '${uid.M}', updatedAt: FB.serverTimestamp() })`), 'denied');
  await owner(`clans/${T}`, { members: 3 });
  const L_live = await L.ev(() => liveStart({ title: 'Synced one', pattern: { focus: 25, short: 5, rounds: 2 }, mode: 'synced' }).then(() => LIVE.lid));
  att('Member: pause the host’s synced timer', await raw(M, `() => FB.updateDoc(cDoc('${T}', 'live', '${L_live}'), { pausedAt: 1, updatedAt: FB.serverTimestamp() })`), 'denied');
  att('Officer: pause the host’s synced timer (allowed by design)', await raw(O, `() => FB.updateDoc(cDoc('${T}', 'live', '${L_live}'), { pausedAt: 1, updatedAt: FB.serverTimestamp() })`), 'ALLOWED');
  // ---------- clans: a member sabotages the clan’s calendar ----------
  att('Member: roll the clan to the week of 2099-12-27 (freezes everyone’s XP)', await CONTRIB(M, 5, `{ weekKey: '2099-12-27' }`), 'denied');
  att('Member: roll the clan to the month 2099-12', await CONTRIB(M, 5, `{ monthKey: '2099-12' }`), 'denied');
  // ---------- clans: a leader of their own clan ----------
  await A.ev(n => clanCreate({ name: n, tag: 'MINE', desc: 'jee' }), 'Mine ' + R);
  const C = await A.ev(() => CLAN.id);
  att('Schedule a session under a made-up creator name', await raw(A, `() => FB.addDoc(cCol(CLAN.id, 'sessions'), { title: 'Fake host', start: Date.now() + 3600e3, pattern: { focus: 25, short: 5, rounds: 2 }, repeat: 'none', days: [], tag: '', max: 30, creator: USER.uid, creatorName: 'siverieg', cancelled: false, rsvp: {}, createdAt: FB.serverTimestamp(), updatedAt: FB.serverTimestamp() })`), 'denied');
  const A_live = await A.ev(() => liveStart({ title: 'Just me', pattern: { focus: 25, short: 5, rounds: 2 } }).then(() => LIVE.lid));
  await wait(1200);
  const SOLO = (second) => raw(A, `() => FB.runTransaction(FB.db, async tx => { const lref = cDoc(CLAN.id, 'live', '${A_live}'), cref = cDoc(CLAN.id), c = (await tx.get(cref)).data();
    tx.update(lref, { counted: true, ${second === null ? '' : `second: '${second}', `}updatedAt: FB.serverTimestamp() });
    tx.update(cref, { lastLive: '${A_live}', weekGroups: (c.weekGroups || 0) + 1, gday: dayKey(new Date()), gstreak: 1, updatedAt: FB.serverTimestamp() }); })`);
  att('Count a live session as a group session while alone', await SOLO(null), 'denied');
  att('…naming myself as the second person', await SOLO(uid.A), 'denied');
  att('…naming a made-up second person', await SOLO('nobody_here'), 'denied');
  att('Send 10 reactions in one second (random ids)', await A.ev(async l => { let n = 0; for (let i = 0; i < 10; i++) { try { await FB.addDoc(FB.collection(FB.db, 'clans', CLAN.id, 'live', l, 'reactions'), { from: USER.uid, emoji: '🔥', at: FB.serverTimestamp() }); n++; } catch (e) {} } return n + ' allowed'; }, A_live), r => /^0 allowed/.test(r));
  att('Send 3 reactions in one second (my own reaction document)', await A.ev(async l => { let n = 0; for (let i = 0; i < 3; i++) { try { await FB.setDoc(FB.doc(FB.db, 'clans', CLAN.id, 'live', l, 'reactions', USER.uid), { from: USER.uid, emoji: '👏', at: FB.serverTimestamp() }); n++; } catch (e) {} } return n + ' allowed'; }, A_live), r => /^1 allowed/.test(r));
  await wait(2200);
  att('…and one more after 2 seconds (positive control)', await raw(A, `() => FB.setDoc(FB.doc(FB.db, 'clans', CLAN.id, 'live', '${A_live}', 'reactions', USER.uid), { from: USER.uid, emoji: '💪', at: FB.serverTimestamp() })`), 'ALLOWED');
  att('Leader: step down to member without handing over (leaves the clan leaderless)', await raw(A, `() => FB.updateDoc(cDoc(CLAN.id, 'members', USER.uid), { role: 'member' })`), 'denied');
  await owner(`clans/${C}/members/${uid.A}`, { role: 'leader' });
  att('Drop my clanOf pointer while staying in the clan', await raw(A, `() => FB.deleteDoc(FB.doc(FB.db, 'clanOf', USER.uid))`), 'denied');
  att('…then found a second clan (focus would count twice)', await raw(A, `async () => { const cid = FB.doc(cCol()).id, code = newClanCode(), wk = dayKey(weekMonday()), mk = monthKeyNow(), ts = FB.serverTimestamp(), b = FB.writeBatch(FB.db);
    b.set(FB.doc(FB.db, 'clanNames', 'second ${R}'), { clan: cid });
    b.set(cDoc(cid), { name: 'Second ${R}', nameLower: 'second ${R}', tag: 'TWO', desc: 'jee', emblem: 'ce_tomato', banner: 'cb_default', theme: 'ct_default', frame: 'cf_none', joinMode: 'approval', members: 1, xp: 0, level: 1, weekKey: wk, weekMin: 0, monthKey: mk, monthMin: 0, raidHP: raidHPFor(mk, 1), weekGroups: 0, lastLive: 'none', spent: 0, owned: {}, lastBuy: '', tq: 0, tr: 0, quests: {}, raids: {}, gday: '', gstreak: 0, createdAt: ts, updatedAt: ts });
    b.set(cDoc(cid, 'private', 'info'), { leader: USER.uid, code, officerShop: false, memberSchedule: false }); b.set(cDoc(cid, 'members', USER.uid), newMemberDoc('leader', USER.username)); b.set(FB.doc(FB.db, 'clanOf', USER.uid), { clan: cid, at: ts }); b.set(FB.doc(FB.db, 'clanCodes', code), { clan: cid }); return b.commit(); }`), 'denied');
  await ownerCreate(`clanOf/${uid.A}`, { clan: C, at: Date.now() });
  // ---------- founding a clan with trophies already in it ----------
  att('Found a clan that already has 3 raids won, a quest claimed and a 50-day streak', await raw(X, `async () => { const cid = FB.doc(cCol()).id, code = newClanCode(), wk = dayKey(weekMonday()), mk = monthKeyNow(), ts = FB.serverTimestamp(), b = FB.writeBatch(FB.db);
    b.set(FB.doc(FB.db, 'clanNames', 'loaded ${R}'), { clan: cid });
    b.set(cDoc(cid), { name: 'Loaded ${R}', nameLower: 'loaded ${R}', tag: 'LOAD', desc: 'jee', emblem: 'ce_tomato', banner: 'cb_default', theme: 'ct_default', frame: 'cf_none', joinMode: 'approval', members: 1, xp: 0, level: 1, weekKey: wk, weekMin: 0, monthKey: mk, monthMin: 0, raidHP: raidHPFor(mk, 1), weekGroups: 3, lastLive: 'none', spent: 0, owned: {}, lastBuy: '', tq: 0, tr: 0, quests: { '2026-10-05': 'min' }, raids: { '2026-01': 'wyrm', '2026-02': 'swarm', '2026-03': 'tyrant+' }, gday: '', gstreak: 50, createdAt: ts, updatedAt: ts });
    b.set(cDoc(cid, 'private', 'info'), { leader: USER.uid, code, officerShop: false, memberSchedule: false }); b.set(cDoc(cid, 'members', USER.uid), newMemberDoc('leader', USER.username)); b.set(FB.doc(FB.db, 'clanOf', USER.uid), { clan: cid, at: ts }); b.set(FB.doc(FB.db, 'clanCodes', code), { clan: cid }); return b.commit(); }`), 'denied');
  // ---------- positive controls that only the fixed rules + the 1.14.3 app can pass ----------
  if (tag === 'after') {
    await O.ev(() => clanLoadDetails(true)); await raw(O, `() => clanAccept('${uid.V}')`);
    att('Officer accepts a real join request (positive control)', (await ownerGet(`clans/${T}`)).members === 4 && (await ownerGet(`clans/${T}/members/${uid.V}`)) ? 'ALLOWED' : 'denied', 'ALLOWED');
    await A.ev(() => clanSetDoc({ joinMode: 'open' }));
    await F.ev(c => clanByCode(c).then(clanJoinOpen), await A.ev(() => CLAN.info.code));
    await F.ev(() => clanRefresh(true)); await F.ev(l => liveJoin(l), A_live); await wait(4000);
    const c = await ownerGet(`clans/${C}`), lv = await ownerGet(`clans/${C}/live/${A_live}`);
    att('A real two-person table is counted as a group session (positive control)', c.weekGroups === 1 && lv.counted && [uid.A, uid.F].includes(lv.second) ? 'ALLOWED' : `not counted (${c.weekGroups}, ${lv.counted}, ${lv.second})`, 'ALLOWED');
    await F.ev(() => clanLeave());
    att('A member leaves (count −1, positive control)', (await ownerGet(`clans/${C}`)).members === 1 ? 'ALLOWED' : 'denied', 'ALLOWED');
  }
  for (const d of [V, F, A, L, M, O, X]) await d.ctx.close();
  return res;
}

const swap = async (file) => { fs.copyFileSync(file, 'firestore.rules'); await wait(5000); };
try {
  await swap(RULES.before); log('--- rules BEFORE the audit ---'); await runAttacks('before');
  await swap(RULES.after); log('--- rules AFTER the audit ---'); await runAttacks('after');
} finally { fs.copyFileSync(RULES.after, 'firestore.rules'); }
// the table + the checks
const rows = Object.entries(table).map(([k, v]) => `| ${k} | ${v.before || '—'} | ${v.after || '—'} |`);
fs.writeFileSync('sec143-table.md', '| Attack tried | Before | After |\n|---|---|---|\n' + rows.join('\n') + '\n');
log(rows.join('\n'));
for (const [k, exp] of Object.entries(EXPECT)) {
  const got = (table[k] || {}).after;
  check(k, typeof exp === 'function' ? exp(got) : got === exp, `after: ${got}`);
}
log('errors', JSON.stringify(errs.filter(e => !/permission|PERMISSION|clan contribution|live count|Sync error/.test(e))));
log('failures', failCount());
await b.close();
process.exit(failCount() ? 1 : 0);
