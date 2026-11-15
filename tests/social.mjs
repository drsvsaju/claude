import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html?emulator=1';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
async function device(name, w = 1100) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); { const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('dialog', d => d.accept());
  p.toasts = [];
  await p.exposeFunction('__toast', m => p.toasts.push(m));
  await p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('toast-item') && window.__toast(n.textContent)))).observe(document.getElementById('toast'), { childList: true })); });
  return { ctx, p, name };
}
async function signup(d, user) {
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.click('[data-mode=signup] >> visible=true'); await d.p.fill('#authUser', user); await d.p.fill('#authPass', 'secret1'); await d.p.fill('#authPass2', 'secret1');
  await d.p.click('#authSubmit');
}
const ready = d => d.p.waitForFunction(() => typeof SOC !== 'undefined' && SOC.started && SOC.myStats !== undefined, null, { timeout: 15000 });
async function sessions(d, n, min = 25) {
  for (let i = 0; i < n; i++) {
    await d.p.evaluate(m => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); S.timer.planned = m * 60000; S.timer.focusStartedAt = Date.now() - m * 60000; S.timer.endAt = Date.now() - 1; }, min);
    await wait(450);
  }
}
const close = async d => { await d.p.evaluate(() => { if ($('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); }); await wait(400); };   // dialogs close with a short animation (the page is inert until then)
const tryOp = (d, fn, ...args) => d.p.evaluate(async ([src, args]) => { try { await (new Function('return ' + src)())(...args); return 'ALLOWED'; } catch (e) { return e.code || e.message; } }, [fn.toString(), args]);
const uidOf = d => d.p.evaluate(() => USER.uid);

// ---------- accounts ----------
const X = await device('X');
await signup(X, 'shit_head'); await wait(400);
log('offensive username ->', await X.p.textContent('#authError'));
await signup(X, 'Admin'); await wait(300);
log('reserved username ->', await X.p.textContent('#authError'));

const A = await device('A'), B = await device('B'), C = await device('C', 390);
await signup(A, 'alice_a'); await signup(B, 'bob_b'); await signup(C, 'cara_c');
await Promise.all([ready(A), ready(B), ready(C)]);
await sessions(A, 3); await sessions(B, 5); await sessions(C, 1);
await wait(2500);
const [ua, ub, uc] = [await uidOf(A), await uidOf(B), await uidOf(C)];
log('public docs written:', await A.p.evaluate(async () => { const r = {}; for (const c of ['usernames/alice_a', 'publicProfiles/' + USER.uid, 'publicStats/' + USER.uid, 'activity/' + USER.uid]) { const [col, id] = c.split('/'); r[col] = (await FB.getDoc(FB.doc(FB.db, col, id))).exists(); } return JSON.stringify(r); }));
log('A stats:', await A.p.evaluate(async () => { const d = (await FB.getDoc(FB.doc(FB.db, 'publicStats', USER.uid))).data(); return `day ${d.dayMin} week ${d.weekMin} life ${d.lifeMin} global ${d.global}`; }));

// ---------- requests ----------
await close(A); await A.p.evaluate(() => showTab('friends')); await A.p.fill('#addFriendName', '@Bob_B'); await close(A); await A.p.click('#addFriendForm button'); await wait(1200);
log('B incoming badge:', await B.p.evaluate(() => !$('#friendsBadge').classList.contains('hidden') + ' ' + $('#reqCount').textContent), '| A outgoing:', await A.p.evaluate(() => outgoing().length));
await close(B); await B.p.evaluate(() => showTab('friends')); await wait(300);
await close(B); await B.p.screenshot({ path: 's-request.png' });
await B.p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); $('[data-accept]').click(); }); await wait(1500);   // in-page: a held level-up can open between a close and a Playwright click (v1.18 full run)
log('friends A/B:', await A.p.evaluate(() => friendsList().length), await B.p.evaluate(() => friendsList().length), '| coin toasts:', A.p.toasts.filter(t => /New friend/.test(t)), B.p.toasts.filter(t => /New friend/.test(t)));
await A.p.evaluate(() => sendRequest('cara_c')); await wait(1000);
log('C incoming:', await C.p.evaluate(() => incoming().length));
await C.p.evaluate(() => removeFriendship(incoming()[0].id, 'Request declined')); await wait(1000);
log('after decline A outgoing:', await A.p.evaluate(() => outgoing().length));
await A.p.evaluate(() => sendRequest('cara_c')); await wait(800);
await A.p.evaluate(() => removeFriendship(outgoing()[0].id, 'cancelled')); await wait(1000);
log('after cancel C incoming:', await C.p.evaluate(() => incoming().length));
log('C tries to accept a request it SENT (rules):', await C.p.evaluate(async () => { await sendRequest('alice_a'); await new Promise(r => setTimeout(r, 800)); const f = outgoing()[0]; try { await FB.updateDoc(FB.doc(FB.db, 'friendships', f.id), { status: 'accepted', acceptedAt: FB.serverTimestamp() }); return 'ALLOWED'; } catch (e) { return e.code; } }));
await C.p.evaluate(() => removeFriendship(outgoing()[0].id)); await wait(800);

// ---------- blocking ----------
await C.p.evaluate(u => blockUser(u, 'alice_a'), ua); await wait(1000);
A.p.toasts.length = 0;
await A.p.evaluate(() => sendRequest('cara_c')); await wait(1000);
log('A requests blocked C (rules) ->', await tryOp(A, ([a, c]) => { const users = [a, c].sort(); return FB.setDoc(FB.doc(FB.db, 'friendships', users.join('_')), { users, from: a, to: c, status: 'pending', fromName: 'alice_a', toName: 'cara_c', createdAt: FB.serverTimestamp() }); }, [ua, uc]), '| C incoming:', await C.p.evaluate(() => incoming().length));
log('A reads blocked C profile ->', await tryOp(A, (u) => FB.getDoc(FB.doc(FB.db, 'publicProfiles', u)), uc));
log('B reads C profile (not blocked) ->', await tryOp(B, (u) => FB.getDoc(FB.doc(FB.db, 'publicProfiles', u)), uc));

// ---------- privacy + activity ----------
await A.p.evaluate(u => openFriend(u), ub); await wait(1500);
log('A sees B sessions:', await A.p.evaluate(() => [...document.querySelectorAll('.sesslist .nm')].map(e => e.textContent).slice(0, 2).join(', ')));
await close(A); await A.p.screenshot({ path: 's-friend-profile.png', fullPage: true });
await B.p.evaluate(() => { S.settings.shareNames = false; save(); }); await wait(2500);
await A.p.evaluate(u => { SOC.cache = {}; return openFriend(u); }, ub); await wait(1200);
log('names off ->', await A.p.evaluate(() => [...document.querySelectorAll('.sesslist .nm')].map(e => e.textContent).slice(0, 2).join(', ')));
await B.p.evaluate(() => { S.settings.shareActivity = false; save(); }); await wait(2500);
log('activity off: read ->', await tryOp(A, (u) => FB.getDoc(FB.doc(FB.db, 'activity', u)), ub));
await A.p.evaluate(u => { SOC.cache = {}; return openFriend(u); }, ub); await wait(1200);
log('activity off UI ->', await A.p.evaluate(() => (document.querySelector('#friendsBody .empty') || {}).textContent));
log('C (not friend) reads B activity ->', await tryOp(C, (u) => FB.getDoc(FB.doc(FB.db, 'activity', u)), ub));
await B.p.evaluate(() => { S.settings.shareActivity = true; S.settings.shareNames = true; save(); }); await wait(2000);

// ---------- focusing now ----------
await B.p.evaluate(() => { $('#nameInput').value = 'Physics'; onNameChange(); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); });
await wait(1500);
await A.p.evaluate(() => { SOC.friend = null; showTab('friends'); return loadFriendsPublic(true); }); await wait(800);
log('A friends list shows:', await A.p.evaluate(() => document.querySelector('.plist .sub').textContent.trim()), '| live dot:', await A.p.evaluate(() => !!document.querySelector('.plist .live')));
await close(A); await A.p.screenshot({ path: 's-friends.png', fullPage: true });

// ---------- kudos + nudge ----------
const sid = await B.p.evaluate(() => S.sessions[S.sessions.length - 1].id);
await A.p.evaluate(([u, sid]) => { SOC.friend = { uid: u }; return sendReaction(u, 'kudos', '🔥', 's_' + sid); }, [ub, sid]); await wait(1500);
log('B kudos toast:', B.p.toasts.filter(t => /sent 🔥/.test(t)));
log('second kudos same session (rules) ->', await tryOp(A, ([u, sid]) => FB.setDoc(FB.doc(FB.db, 'inbox', u, 'items', `k_${USER.uid}_s_${sid}`), { from: USER.uid, fromName: USER.username, type: 'kudos', emoji: '👏', target: 's_' + sid, createdAt: FB.serverTimestamp() }), [ub, sid]));
await A.p.evaluate(u => sendReaction(u, 'nudge', '👀'), ub); await wait(1200);
log('B nudge toast:', B.p.toasts.filter(t => /Time to focus/.test(t)));
log('second nudge today (rules) ->', await tryOp(A, (u) => FB.setDoc(FB.doc(FB.db, 'inbox', u, 'items', `n_${USER.uid}_${dayKey(new Date())}`), { from: USER.uid, fromName: USER.username, type: 'nudge', emoji: '👀', day: dayKey(new Date()), createdAt: FB.serverTimestamp() }), ub));
log('free-text message (rules) ->', await tryOp(A, (u) => FB.setDoc(FB.doc(FB.db, 'inbox', u, 'items', `k_${USER.uid}_x`), { from: USER.uid, fromName: USER.username, type: 'kudos', emoji: '🔥', target: 'x', text: 'hello', createdAt: FB.serverTimestamp() }), ub));
log('kudos to non-friend C (rules) ->', await tryOp(B, (u) => FB.setDoc(FB.doc(FB.db, 'inbox', u, 'items', `k_${USER.uid}_y`), { from: USER.uid, fromName: USER.username, type: 'kudos', emoji: '🔥', target: 'y', createdAt: FB.serverTimestamp() }), uc));

// ---------- security rules: private data + cheating ----------
log('A reads B private users doc ->', await tryOp(A, (u) => FB.getDoc(FB.doc(FB.db, 'users', u)), ub));
log('A reads B months ->', await tryOp(A, (u) => FB.getDocs(FB.collection(FB.db, 'users', u, 'months')), ub));
log('A writes B publicStats ->', await tryOp(A, (u) => FB.updateDoc(FB.doc(FB.db, 'publicStats', u), { lifeMin: 99999 }), ub));
log('A fakes username in profile ->', await tryOp(A, () => FB.updateDoc(FB.doc(FB.db, 'publicProfiles', USER.uid), { username: 'bob_b', updatedAt: FB.serverTimestamp() })));
const statUpd = (patch) => async (p) => { const ref = FB.doc(FB.db, 'publicStats', USER.uid); const d = (await FB.getDoc(ref)).data(); await FB.setDoc(ref, { ...d, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, typeof v === 'string' ? eval(v) : v])), updatedAt: FB.serverTimestamp() }); };
log('A decreases weekMin ->', await tryOp(A, async () => { const ref = FB.doc(FB.db, 'publicStats', USER.uid); const d = (await FB.getDoc(ref)).data(); await FB.setDoc(ref, { ...d, weekMin: d.weekMin - 10, dayMin: Math.min(d.dayMin, d.weekMin - 10), updatedAt: FB.serverTimestamp() }); }));
log('A adds 10h at once ->', await tryOp(A, async () => { const ref = FB.doc(FB.db, 'publicStats', USER.uid); const d = (await FB.getDoc(ref)).data(); const x = 600; await FB.setDoc(ref, { ...d, dayMin: d.dayMin + x, weekMin: d.weekMin + x, weekMinSun: d.weekMinSun + x, monthMin: d.monthMin + x, lifeMin: d.lifeMin + x, updatedAt: FB.serverTimestamp() }); }));
log('A sets dayMin 2000 ->', await tryOp(A, async () => { const ref = FB.doc(FB.db, 'publicStats', USER.uid); const d = (await FB.getDoc(ref)).data(); await FB.setDoc(ref, { ...d, dayMin: 2000, updatedAt: FB.serverTimestamp() }); }));
log('A future timestamp ->', await tryOp(A, async () => { const ref = FB.doc(FB.db, 'publicStats', USER.uid); const d = (await FB.getDoc(ref)).data(); await FB.setDoc(ref, { ...d, updatedAt: FB.Timestamp.fromMillis(Date.now() + 864e5) }); }));
log('A legit +25 min ->', await tryOp(A, async () => { const ref = FB.doc(FB.db, 'publicStats', USER.uid); const d = (await FB.getDoc(ref)).data(); const x = 25; await FB.setDoc(ref, { ...d, dayMin: d.dayMin + x, weekMin: d.weekMin + x, weekMinSun: d.weekMinSun + x, monthMin: d.monthMin + x, lifeMin: d.lifeMin + x, updatedAt: FB.serverTimestamp() }); }));
log('A forges request from B ->', await tryOp(A, ([a, b]) => { const users = [a, b].sort(); return FB.setDoc(FB.doc(FB.db, 'friendships', users.join('_') + 'x'), { users, from: b, to: a, status: 'pending', fromName: 'bob_b', toName: 'alice_a', createdAt: FB.serverTimestamp() }); }, [ua, ub]));
log('A lists all usernames ->', await tryOp(A, () => FB.getDocs(FB.collection(FB.db, 'usernames'))));
log('A lists non-global publicStats ->', await tryOp(A, () => FB.getDocs(FB.collection(FB.db, 'publicStats'))));

// ---------- leaderboards ----------
await A.p.evaluate(() => { S.settings.globalBoard = true; save(); }); await B.p.evaluate(() => { S.settings.globalBoard = true; save(); });
await wait(7000);
log('A server stats after retry:', await A.p.evaluate(async () => { const d = (await FB.getDoc(FB.doc(FB.db, 'publicStats', USER.uid))).data(); return `global ${d.global} week ${d.weekMin} life ${d.lifeMin}`; }));
const board = async (d, scope, period) => d.p.evaluate(async ([s, p]) => { SOC.lb = {}; const r = await loadLeaderboard(s, p, true); return r.error || r.rows.map(x => `${x.rank}.${x.username}:${x.minutes}`).join(' ') + (r.myRow ? ` | pinned ${r.myRow.rank}` : ''); }, [scope, period]);
log('A friends weekly:', await board(A, 'friends', 'week'));
log('A global weekly:', await board(A, 'global', 'week'));
log('C global daily (C not opted in):', await board(C, 'global', 'day'));
log('A global lifetime:', await board(A, 'global', 'life'));
log('count query (my rank) ->', await A.p.evaluate(async () => { const c = await FB.getCountFromServer(FB.query(FB.collection(FB.db, 'publicStats'), FB.where('global', '==', true), FB.where('weekKey', '==', periodKey('week')), FB.where('weekMin', '>', 0))); return c.data().count; }));
await A.p.evaluate(() => { S.ui.lbScope = 'global'; S.ui.lbPeriod = 'week'; showTab('board'); }); await wait(1200);
await close(A); await A.p.screenshot({ path: 's-board.png' });
await C.p.evaluate(() => { S.ui.lbScope = 'global'; S.ui.lbPeriod = 'week'; showTab('board'); }); await wait(1200);
await close(C); await C.p.screenshot({ path: 's-board-mobile.png' });

// ---------- challenges + friend streak ----------
await A.p.evaluate(() => startChallenge('h5')); await wait(1200);
await B.p.evaluate(() => { SOC.challengesAt = 0; return loadChallenges(true); }); await wait(600);
log('B invited to:', await B.p.evaluate(() => SOC.challenges.map(c => c.id.split('_')[1] + ' members ' + c.members.length)));
await B.p.evaluate(() => joinChallenge(SOC.challenges[0].id)); await wait(1200);
await sessions(A, 9); await wait(2500);
log('A challenge claim:', await A.p.evaluate(() => JSON.stringify(S.game.claims.challenges)), A.p.toasts.filter(t => /Challenge/.test(t)));
await A.p.evaluate(() => { S.ui.friendsView = 'challenges'; showTab('friends'); return loadChallenges(true); }); await wait(1200);
log('A sees B progress:', await A.p.evaluate(() => [...document.querySelectorAll('.chal .cp')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
await close(A); await A.p.screenshot({ path: 's-challenges.png' });
await A.p.evaluate(u => { SOC.cache = {}; return openFriend(u); }, ub); await wait(1500);
log('friend streak tile:', await A.p.evaluate(() => [...document.querySelectorAll('.tiles4 .tile')].map(t => t.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
await A.p.evaluate(() => { SOC.friend.tab = 'compare'; renderFriends(true); }); await wait(300);
await close(A); await A.p.screenshot({ path: 's-compare.png' });

// ---------- weekly recap (today is a Monday) ----------
await A.p.evaluate(() => { const mon = weekStartOf(new Date(), 1); const add = []; for (let i = 1; i <= 4; i++) { const st = addDays(mon, -i).getTime() + 9 * 3600e3; add.push({ id: 'lw' + i, name: 'Maths', start: st, end: st + 50 * 60000, duration: 50 * 60000, planned: 50 * 60000, preset: 'x' }); } S.sessions.push(...add); cloudAddSessions(add); save(); });
await wait(1500);
await A.p.evaluate(() => { localStorage.removeItem(lsKey('recap')); S.ui.friendsView = 'friends'; SOC.friend = null; showTab('friends'); }); await wait(1500);
log('recap card:', await A.p.evaluate(() => (document.querySelector('.recap') || {}).textContent?.replace(/\s+/g, ' ').trim()));
await close(A); await A.p.screenshot({ path: 's-recap.png' });

// ---------- the Friends tab switcher (v1.18 regression test for the v1.17 "can't get back from Challenges" bug) ----------
// Every order, desktop and phone width, light and dark, with real clicks; then a reload while on Challenges.
const segFails = [], SEG_ORDERS = [['challenges', 'friends'], ['challenges', 'friends', 'challenges'], ['friends', 'challenges', 'friends', 'challenges', 'friends'], ['friends', 'challenges', 'challenges', 'friends'], ['challenges', 'friends', 'friends', 'challenges', 'challenges', 'friends']];
const segState = d => d.p.evaluate(() => { const s = $('#friendsSeg'), a = $('#friendsSeg button.active'); return { shown: !s.classList.contains('hidden') && s.getClientRects().length > 0, active: a ? a.dataset.view : '' }; });
async function segCycle(d, tag) {
  for (const ord of SEG_ORDERS) for (const v of ord) {
    await close(d); await d.p.evaluate(() => window.scrollTo(0, 0));
    // a pop-up the app opens on its own (a pet egg hatching, a level-up) can land between close() and the click: close it and try once more
    try { await d.p.click(`#friendsSeg button[data-view=${v}]`, { timeout: 4000 }).catch(async e => { if (!(await d.p.evaluate(() => document.querySelectorAll('dialog[open]').length))) throw e; await close(d); await d.p.click(`#friendsSeg button[data-view=${v}]`, { timeout: 4000 }); }); } catch (e) { segFails.push(`${tag} [${ord.join('>')}] click ${v}: ${e.message.split('\n')[0]} :: ${e.message.split('\n').filter(l => /intercept|stable|visible|viewport|scroll/.test(l)).slice(-3).join(' / ')} :: ${JSON.stringify(await d.p.evaluate(v => { const b = document.querySelector(`#friendsSeg button[data-view=${v}]`); if (!b) return 'none'; const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { r: [r.left, r.top, r.width, r.height].map(Math.round), top: top ? (top.id || top.className || top.tagName).toString().slice(0, 40) : null, open: [...document.querySelectorAll('dialog[open]')].map(x => x.id) }; }, v).catch(() => 'eval failed'))}`); continue; }
    await wait(350);
    const st = await segState(d);
    if (!st.shown || st.active !== v) segFails.push(`${tag} [${ord.join('>')}] after ${v}: ${JSON.stringify(st)}`);
  }
}
for (const [d, tag] of [[A, 'desktop'], [C, '390px']]) for (const mode of ['light', 'dark']) {
  await d.p.evaluate(m => { S.settings.theme = m; applyTheme(); S.ui.friendsView = 'friends'; SOC.friend = null; showTab('friends'); }, mode); await wait(700);
  await segCycle(d, `${tag} ${mode}`);
}
await A.p.evaluate(() => { S.ui.friendsView = 'challenges'; SOC.friend = null; saveLocal(); showTab('friends'); }); await wait(500);
await A.p.reload(); await A.p.waitForSelector('#appView:not(.hidden)'); await ready(A); await wait(1500); await close(A);
await A.p.evaluate(() => showTab('friends')); await wait(900);
const afterReload = await segState(A);
if (!afterReload.shown || afterReload.active !== 'challenges') segFails.push('after a reload on Challenges: ' + JSON.stringify(afterReload));
await segCycle(A, 'after reload');
await A.p.evaluate(() => { S.settings.theme = 'auto'; applyTheme(); S.ui.friendsView = 'friends'; saveLocal(); });
log(segFails.length ? `FAIL friends switcher (${segFails.length}): ${segFails.slice(0, 6).join(' || ')}` : 'PASS friends switcher: every order works on desktop and at 390 px, light and dark, and after a reload on Challenges');
if (segFails.length) { errs.push('friends switcher: ' + segFails[0]); process.exitCode = 1; }

// ---------- guest + gamification off ----------
const G = await device('G', 390);
await G.p.goto(U); await G.p.waitForSelector('#authView:not(.hidden)'); await G.p.click('#guestBtn'); await G.p.evaluate(() => showTab('friends')); await wait(300);
log('guest friends tab:', await G.p.evaluate(() => document.querySelector('#friendsBody').textContent.replace(/\s+/g, ' ').trim()));
await G.p.screenshot({ path: 's-guest.png' });
await B.p.evaluate(() => { S.settings.gamification = false; save(); renderAll(); showTab('friends'); }); await wait(300);
log('gamification off: board/challenge toggles hidden:', await B.p.evaluate(() => [...document.querySelectorAll('#friendsSeg button')].map(b => b.dataset.view + ':' + b.classList.contains('hidden')).join(' ')));
await wait(9000);
log('toasts seen — A new friend:', A.p.toasts.filter(t => /New friend/.test(t)), '| B new friend:', B.p.toasts.filter(t => /New friend/.test(t)), '| B nudge:', B.p.toasts.filter(t => /Time to focus/.test(t)), '| A challenge:', A.p.toasts.filter(t => /Challenge complete/.test(t)));
log('ALL A toasts:', JSON.stringify(A.p.toasts.slice(0, 40)));
log('A social claims:', await A.p.evaluate(() => JSON.stringify(S.game.claims.social)), 'earned', await A.p.evaluate(() => game().earned));
log('errors', errs);
await b.close();
