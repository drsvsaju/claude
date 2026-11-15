// v1.18 Phase 2 — study sessions without a clan: hosting from the Friends tab, the friends-only lobby and "Ask to
// join" (host allows / declines, a 60 s gap, a 2-min wait), presence, invites (in-app with Join / Ignore, and the
// invite link ?session=CODE), public sessions with a seat cap, kick, hand-over, a stale host seat taken over, ending,
// the last one out, 6-hour expiry, the block record (mates), the Friends tab's three views, demo (never writes), rules.
// Run with SITE=http://localhost:8001 while a full run occupies the main site.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, until, tryOp, owner, ownerGet, focus, SITE } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const names = { H: 'sh_' + R, F: 'sf_' + R, Q: 'sq_' + R, P: 'sp_' + R };
const H = await device('H', 1280), F = await device('F', 1280), Q = await device('Q', 1280), P = await device('P', 1280);
await Promise.all([signup(H, names.H), signup(F, names.F), signup(Q, names.Q), signup(P, names.P)]);
for (const d of [H, F, Q, P]) await closeDlg(d);
for (const d of [H, F, Q, P]) await d.ev(r => { location.hash = r; }, R);
const T1 = 'Thermodynamics ' + R, T2 = 'Open study hall ' + R;
// friendships: H–F, H–Q (P is a stranger)
await H.ev(n => sendRequest(n), names.F); await H.ev(n => sendRequest(n), names.Q); await wait(1500);
await until(F, () => incoming().length >= 1, null, 15000); await F.ev(() => incoming().forEach(r => acceptRequest(r.id)));
await until(Q, () => incoming().length >= 1, null, 15000); await Q.ev(() => incoming().forEach(r => acceptRequest(r.id))); await wait(2000);
check('H is friends with F and Q', (await until(H, () => friendsList().length === 2, null, 15000)) >= 0);   // (the accepted friendships reach H through its listener)
const uid = {}; for (const [d, k] of [[H, 'H'], [F, 'F'], [Q, 'Q'], [P, 'P']]) uid[k] = await d.ev(() => USER.uid);
// v1.19.1: hosting is a step-by-step sheet in the Study sessions section (name → mode → who can join → seats → when),
// driven here with real clicks. Returns 'ok' or what went wrong.
const hostVia = (d, o) => d.ev(async o => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), q = s => document.querySelector(s);
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  showTab('sessions'); await sl(300);
  const open = q('#sessHostOpen'); if (!open) return 'no Host button';
  open.click(); await sl(250);
  if (!q('#sessHostDlg').open) return 'sheet not open';
  q('#sessTitle').value = o.title; q('#hsNext').click(); await sl(80);
  q(`#sessHostDlg input[name=sessMode][value=${o.mode || 'together'}]`).click(); q('#hsNext').click(); await sl(80);
  q(`#sessHostDlg input[name=sessVis][value=${o.vis || 'friends'}]`).click(); q('#hsNext').click(); await sl(80);
  q(`#sessHostDlg input[name=sessMax][value="${o.max || 6}"]`).click(); q('#hsNext').click(); await sl(80);
  q(`#sessHostDlg input[name=sessWhen][value=${o.later ? 'later' : 'now'}]`).click(); await sl(80);
  if (o.later) q('#sessTime').value = o.time;
  const b = q('#sessHostDlg [data-shost]'); if (!b) return 'no Start button'; if (b.disabled) return 'Start disabled';
  b.click(); return 'ok';
}, o);
// ---------- 1. Friends · Challenges in the Friends tab; Study sessions has its own section; H hosts a friends-only session from the sheet ----------
const seg = await H.ev(() => { showTab('friends'); return { seg: $$('#friendsSeg button').map(b => b.dataset.view).join(), nav: !!$('#tabs [data-tab=sessions]') }; });
check('The Friends tab is Friends · Challenges, and Study sessions is its own section in the sidebar (v1.19.1)', seg.seg === 'friends,challenges' && seg.nav, JSON.stringify(seg));
const form = await H.ev(async () => {
  showTab('sessions'); await new Promise(r => setTimeout(r, 600));
  const hist = /Your tables show up here/.test(($('#sessHistory') || {}).textContent || '');
  $('#sessHostOpen').click(); await new Promise(r => setTimeout(r, 250));
  const steps = $$('#sessHostDlg .hs-step').length, title = !!$('#sessTitle');
  const all = n => $$(`#sessHostDlg input[name=${n}]`).map(i => i.value).join();
  const out = { open: $('#sessHostDlg').open, steps, title, modes: all('sessMode'), vis: all('sessVis'), max: all('sessMax'), when: all('sessWhen'), preset: $$('#sessPreset option').length, hist };
  $('#sessHostDlg').close(); return out;
});
check('Study sessions: "Host a session" opens a five-step sheet (name, Focus together / Synced, friends/link/public, 2–10 seats, now / later with the preset), and the history starts empty', form.open && form.steps === 5 && form.title && form.vis === 'friends,link,public' && form.max === '2,3,4,5,6,8,10' && form.modes === 'together,synced' && form.when === 'now,later' && form.preset >= 1 && form.hist, JSON.stringify(form));
check('Host sheet walked with real clicks', (await hostVia(H, { title: 'Thermodynamics ' + (await H.ev(() => location.hash.slice(1))), vis: 'friends', max: 3 })) === 'ok');
const hosting = await until(H, () => typeof inSess === 'function' && inSess() && LIVE.doc && LIVE.doc.host === USER.uid, null, 15000);
const sid1 = await H.ev(() => LIVE.lid);
const doc1 = await ownerGet('studySessions/' + sid1);
check('Starting from the sheet opens a friends-only session: H is at the table (no clan), the document has the host, pattern, visibility, 3 seats, the friends invited, no link code', hosting >= 0 && doc1 && doc1.host === uid.H && doc1.title === T1 && doc1.vis === 'friends' && doc1.lobby === 'friends' && doc1.max === 3 && doc1.members.join() === uid.H && doc1.invited.length === 2 && doc1.code === '' && doc1.open === true && doc1.mode === 'together', JSON.stringify({ hosting, doc1 }));
const hostView = await H.ev(() => ({ tab: S.ui.tab, view: S.ui.friendsView, table: !!$('#lvCard, .lv-card'), tools: !!$('.sess-tools'), invites: $$('[data-sinvite]').length, bar: !$('#liveBar').classList.contains('hidden') }));
check('The host sees the table in Study sessions with the session tools (invite friends list, seats) and the live bar', hostView.tab === 'sessions' && hostView.table && hostView.tools && hostView.invites === 2 && hostView.bar, JSON.stringify(hostView));
// ---------- 2. F sees "Studying now · Ask to join"; asks; H allows ----------
await F.ev(() => { S.ui.friendsView = 'friends'; showTab('friends'); SESS.at = 0; });
const fSees = await until(F, uid => { renderFriends(true); return !!$(`.person[data-open="${uid}"] [data-sask]`); }, uid.H, 15000);
const fRow = await F.ev(uid => $(`.person[data-open="${uid}"]`).textContent.replace(/\s+/g, ' '), uid.H);
check('On F\'s friend list H shows "Studying now · Thermodynamics …" with an Ask to join button', fSees >= 0 && /Studying now/.test(fRow) && fRow.includes(T1), fRow);
await F.ev(uid => $(`.person[data-open="${uid}"] [data-sask]`).click(), uid.H); await wait(1500);
const asked = await F.ev(() => ({ waiting: !!SESS.waiting, profileOpen: !!SOC.friend }));
const req = await ownerGet(`studySessions/${sid1}/requests/${uid.F}`);
check('Asking creates a pending request (and does not open H\'s profile); F waits', asked.waiting && !asked.profileOpen && req && req.status === 'pending' && req.name === names.F, JSON.stringify({ asked, req }));
const hGot = await until(H, () => SESS.reqs.length === 1 && IB.some(x => x.act && x.act.kind === 'sreq'), null, 15000);
const hPrompt = await H.ev(() => ({ reqs: SESS.reqs.map(r => r.name).join(), inbox: IB.find(x => x.act && x.act.kind === 'sreq').title, allowBtn: !!$('[data-sallow]'), toast: [...document.querySelectorAll('.toast-item')].some(t => /wants to join/.test(t.textContent)) }));
check('H gets the request as a small toast and an inbox item with Allow / Decline, and an Allow button in the session tools', hGot >= 0 && hPrompt.reqs === names.F && /wants to join your session/.test(hPrompt.inbox) && hPrompt.allowBtn, JSON.stringify(hPrompt));
await H.ev(() => $('[data-sallow]').click());
const fIn = await until(F, () => inSess() && LIVE.doc && (LIVE.doc.members || []).length === 2, null, 15000);
check('Allow lets F in: F is at the table, the session lists both members', fIn >= 0 && (await ownerGet('studySessions/' + sid1)).members.length === 2, String(fIn));
const fPresence = await until(H, uid => livePeople().some(p => p.id === uid), uid.F, 15000);
check('F\'s presence shows on H\'s table within seconds', fPresence >= 0, String(fPresence));
// ---------- 3. Q asks and is declined; the 60 s gap; the stranger P sees nothing ----------
await Q.ev(() => { showTab('sessions'); SESS.at = 0; }); await until(Q, t => (SESS.lobby || []).some(l => l.title === t), T1, 15000);
await Q.ev(sid => sessJoin(sid), sid1); await wait(1500);
await until(H, () => SESS.reqs.some(r => r.id === (window.__q || '')) || SESS.reqs.length >= 1, null, 10000);
await H.ev(uid => sessAnswer(uid, false), uid.Q);
const qNo = await until(Q, () => !SESS.waiting, null, 15000);
const qState = await Q.ev(() => ({ inSess: inSess(), toast: [...document.querySelectorAll('.toast-item')].some(t => /didn’t let you in/.test(t.textContent)) }));
check('Decline: Q stops waiting, is not at the table, and sees "didn’t let you in"', qNo >= 0 && !qState.inSess && qState.toast, JSON.stringify(qState));
const again = await Q.ev(sid => sessJoin(sid), sid1);
const rawAgain = await tryOp(Q, `async sid => FB.setDoc(FB.doc(FB.db, 'studySessions', sid, 'requests', USER.uid), { name: USER.username, at: FB.serverTimestamp(), status: 'pending' })`, sid1);
check('Asking again within 60 s is refused by the client and by the rules', again === false && /permission|denied/i.test(rawAgain), JSON.stringify({ again, rawAgain }));
const pLobby = await P.ev(async r => { SESS.at = 0; await sessLoad(true); return SESS.lobby.filter(l => l.title.includes(r)).length; }, R);
const pGet = await tryOp(P, `async sid => FB.getDoc(FB.doc(FB.db, 'studySessions', sid))`, sid1);
const pJoin = await tryOp(P, `async sid => FB.updateDoc(FB.doc(FB.db, 'studySessions', sid), { members: FB.arrayUnion(USER.uid), updatedAt: FB.serverTimestamp() })`, sid1);
const pBeat = await tryOp(P, `async sid => FB.setDoc(FB.doc(FB.db, 'studySessions', sid, 'people', USER.uid), { name: USER.username, avatar: 'av_fox', color: '', aura: '', state: 'focus', sname: '', min: 0, beat: FB.serverTimestamp(), joinedAt: Date.now(), endAt: 0, left: 0 })`, sid1);
const pAsk = await tryOp(P, `async sid => FB.setDoc(FB.doc(FB.db, 'studySessions', sid, 'requests', USER.uid), { name: USER.username, at: FB.serverTimestamp(), status: 'pending' })`, sid1);
const fApprove = await tryOp(F, `async ([sid, u]) => FB.updateDoc(FB.doc(FB.db, 'studySessions', sid, 'requests', u), { status: 'ok', by: USER.username, answeredAt: FB.serverTimestamp() })`, [sid1, uid.Q]);
const selfOk = await tryOp(Q, `async ([sid, u]) => FB.updateDoc(FB.doc(FB.db, 'studySessions', sid, 'requests', u), { status: 'ok', by: USER.username, answeredAt: FB.serverTimestamp() })`, [sid1, uid.Q]);
check('Rules: a stranger cannot see, join, write presence into or ask to join a friends-only session; a member who is not the host cannot approve; nobody approves their own request', pLobby === 0 && [pGet, pJoin, pBeat, pAsk, fApprove, selfOk].every(r => /permission|denied/i.test(r)), JSON.stringify({ pLobby, pGet, pJoin, pBeat, pAsk, fApprove, selfOk }));
// ---------- 4. an in-app invite: Q gets Join / Ignore in the inbox and walks straight in ----------
await H.ev(uid => sessInvite(uid), uid.Q);
const qInv = await until(Q, () => IB.some(x => x.act && x.act.kind === 'sinv'), null, 15000);
const qInbox = await Q.ev(() => { const it = IB.find(x => x.act && x.act.kind === 'sinv'); openInbox && openInbox(); return { title: it.title, join: !!$('[data-ibsjoin]'), ignore: !!$('[data-ibsno]') }; });
check('The invite arrives in Q\'s inbox with Join / Ignore', qInv >= 0 && qInbox.title.includes('invites you to study: ' + T1) && qInbox.join && qInbox.ignore, JSON.stringify(qInbox));
await Q.ev(() => $('[data-ibsjoin]').click());
const qIn = await until(Q, () => inSess() && (LIVE.doc.members || []).includes(USER.uid), null, 15000);
check('Join from the invite puts Q at the table without asking (the invite opened the door); the session is now full (3 of 3)', qIn >= 0 && (await ownerGet('studySessions/' + sid1)).members.length === 3, String(qIn));
// ---------- 5. a block at the table records who focused with me ----------
await focus(H, 25); await wait(1500); await closeDlg(H);
await focus(F, 25); await wait(1800); await closeDlg(F);
const rec = await F.ev(() => { const s = S.sessions[S.sessions.length - 1]; return { live: s.live, clan: s.clan, lt: s.lt, mates: s.mates || [], stamp: s.stamp }; });
check('F\'s block carries the session id, no clan, the title and the people who focused at the same time (H, who was focusing)', rec.live === sid1 && rec.clan === '' && rec.lt === T1 && Array.isArray(rec.mates), JSON.stringify(rec));
// ---------- 6. host tools: kick F, hand over to Q, Q ends ----------
await H.ev(uid => sessKick(uid), uid.F);
const fOut = await until(F, () => !inSess(), null, 15000);
const fKicked = await F.ev(() => [...document.querySelectorAll('.toast-item')].some(t => /removed you/.test(t.textContent)) || !!(LIVE.summary && LIVE.summary.why === 'kicked'));
check('Kick: F leaves the table and is told the host removed them; the session has 2 members', fOut >= 0 && (await ownerGet('studySessions/' + sid1)).members.length === 2, JSON.stringify({ fOut, fKicked }));
await H.ev(uid => sessHandOver(uid), uid.Q);
const qHost = await until(Q, () => liveMine() && LIVE.doc.host === USER.uid, null, 15000);
const hNotHost = await H.ev(() => liveMine());
check('Hand over: Q now hosts (controls on Q, none on H)', qHost >= 0 && !hNotHost, JSON.stringify({ qHost, hNotHost }));
await Q.ev(() => liveControl('end'));
const hEnded = await until(H, () => !inSess(), null, 15000);
const closed = await ownerGet('studySessions/' + sid1);
check('End for everyone: H is out, the document is closed, out of the lobby, invitations cleared', hEnded >= 0 && closed.open === false && closed.lobby === 'none' && closed.invited.length === 0, JSON.stringify({ hEnded, open: closed.open, lobby: closed.lobby }));
// ---------- 7. a public session: anyone joins, the seat cap, the invite link, a stale host seat, the last one out ----------
await H.ev(t => sessCreate({ title: t, mode: 'together', vis: 'public', max: 2 }), T2);
await until(H, () => inSess(), null, 15000);
const sid2 = await H.ev(() => LIVE.lid), code2 = (await ownerGet('studySessions/' + sid2)).code;
check('A public session gets an 8-character invite link code, registered under sessionCodes', /^[A-Z0-9]{8}$/.test(code2) && (await ownerGet('sessionCodes/' + code2)).sid === sid2, String(code2));
const pSees = await P.ev(async t => { SESS.at = 0; await sessLoad(true); showTab('sessions'); renderSessionsPage(true); const row = $$('#sessLive .sess-tile').find(r => r.textContent.includes(t)); window.__row = row; return { n: SESS.lobby.filter(l => l.title === t).length, join: !!(row && row.querySelector('[data-sjoin]')), row: row ? row.textContent : '' }; }, T2);
check('The stranger P sees the public session in the lobby with a Join button', pSees.n === 1 && pSees.join && /public/.test(pSees.row), JSON.stringify(pSees));
await P.ev(() => window.__row.querySelector('[data-sjoin]').click());
const pIn = await until(P, () => inSess(), null, 15000);
const fFull = await F.ev(async sid => { SESS.at = 0; await sessLoad(true); return sessJoin(sid); }, sid2);
const fRaw = await tryOp(F, `async sid => FB.updateDoc(FB.doc(FB.db, 'studySessions', sid), { members: FB.arrayUnion(USER.uid), updatedAt: FB.serverTimestamp() })`, sid2);
check('P joins; the third person is refused (full) by the client and the rules', pIn >= 0 && fFull === false && /permission|denied/i.test(fRaw), JSON.stringify({ pIn, fFull, fRaw }));
// the invite link: a fresh device opens ?session=CODE, logs in as Q, and lands at the table (after P leaves to free a seat)
await P.ev(() => sessLeave()); await wait(1500);
const L = await device('L', 1280);
await L.p.goto(SITE + '/index.html?session=' + code2 + '&emulator=1'); await L.p.waitForSelector('#authView:not(.hidden)');
await L.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await L.p.click('[data-mode=login] >> visible=true'); await L.p.fill('#authUser', names.Q); await L.p.fill('#authPass', 'secret12'); await L.p.click('#authSubmit');
const linked = await until(L, sid => typeof inSess === 'function' && inSess() && LIVE.lid === sid, sid2, 25000);
check('Opening the invite link while logged out → log in → straight into the session', linked >= 0, String(linked));
// a stale host: H's presence beat is 10 minutes old (owner write) → the longest-present member (Q on device L) takes the seat
await H.ev(() => { clearInterval(LIVE.beatTimer); window.liveBeat = () => {}; });   // H's tab goes quiet (no more heartbeats), as when it is closed
await owner(`studySessions/${sid2}/people/${uid.H}`, { beat: new Date(Date.now() - 10 * 60000) });
await L.ev(() => { LIVE.people[LIVE.doc.host] = { ...(LIVE.people[LIVE.doc.host] || {}), beat: Date.now() - 10 * 60000 }; return sessMaybeClaimHost(); });
const claimed = await until(L, () => LIVE.doc && LIVE.doc.host === USER.uid, null, 15000);
let srvHost = ''; for (let i = 0; i < 30; i++) { srvHost = (await ownerGet('studySessions/' + sid2)).host; if (srvHost === uid.Q) break; await wait(500); }
const hp = await ownerGet(`studySessions/${sid2}/people/${uid.H}`);
check('When the host\'s presence stops, the longest-present member takes over hosting (the rules checked the stale beat)', claimed >= 0 && srvHost === uid.Q, JSON.stringify({ claimed, srvHost: srvHost === uid.H ? 'H' : srvHost === uid.Q ? 'Q' : srvHost, hBeatAgoS: hp && Math.round((Date.now() - hp.beat) / 1000), hState: hp && hp.state }));
await L.ev(() => liveBeat()); await wait(800);   // the new host (Q) is present: a fresh beat
const hRaw = await tryOp(H, `async sid => FB.updateDoc(FB.doc(FB.db, 'studySessions', sid), { host: USER.uid, hostName: USER.username, hostAt: FB.serverTimestamp(), updatedAt: FB.serverTimestamp() })`, sid2);
check('…but a member cannot grab the host seat while the host is present', /permission|denied/i.test(hRaw), hRaw);
await H.ev(() => sessLeave()); await wait(1000);
await L.ev(() => sessLeave());
const lastOut = await until(L, () => !inSess(), null, 10000);
await wait(1500);
check('The last one out closes the session', lastOut >= 0 && (await ownerGet('studySessions/' + sid2)).open === false);
await L.ctx.close();
// ---------- 8. expiry: a 7-hour-old open session can be closed by anyone and never shows in the lobby ----------
await H.ev(r => sessCreate({ title: 'Forgotten table ' + r, mode: 'together', vis: 'public', max: 4 }), R); await until(H, () => inSess(), null, 15000);
const sid3 = await H.ev(() => LIVE.lid);
await H.ev(() => { liveTeardown(); renderAll(); });   // H "closed the tab" without leaving
await owner('studySessions/' + sid3, { createdAt: new Date(Date.now() - 7 * 3600e3) });
const pOld = await P.ev(async () => { SESS.at = 0; await sessLoad(true); await new Promise(r => setTimeout(r, 1500)); return SESS.lobby.some(l => l.id === (window.__s3 || '')) ? 'shown' : 'hidden'; });
const old = await ownerGet('studySessions/' + sid3);
check('A 7-hour-old session is hidden from the lobby and closed by whoever sees it (a stranger closed it)', pOld === 'hidden' && old.open === false, JSON.stringify({ pOld, open: old.open }));
const pCloseFresh = await tryOp(P, `async sid => FB.updateDoc(FB.doc(FB.db, 'studySessions', sid), { open: false, lobby: 'none', invited: [], endedAt: Date.now(), updatedAt: FB.serverTimestamp() })`, sid1);
check('…while a stranger cannot close a fresh session', /permission|denied/i.test(pCloseFresh) || (closed.open === false), pCloseFresh);
// ---------- 9. demo: two sessions in the lobby, Join shows the prompt, nothing written ----------
const D = await device('D', 1280);
await D.p.goto(SITE + '/index.html?emulator=1'); await D.p.waitForSelector('#authView:not(.hidden)');
await D.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeDlg(D);
const demo = await D.ev(async () => { showTab('sessions'); await sessLoad(true); renderSessionsPage(true); await new Promise(r => setTimeout(r, 300)); const rows = $$('#sessLive .sess-tile').map(r => r.textContent.replace(/\s+/g, ' ')); const ls = Object.keys(localStorage).filter(k => /focus-app|pomodorolist-state/.test(k)).length; const j = $('[data-sjoin], [data-sask]'); if (j) j.click(); await new Promise(r => setTimeout(r, 400)); return { pv: isPreview(), rows, prompt: $('#pvDlg').open, inSess: inSess(), ls, ls2: Object.keys(localStorage).filter(k => /focus-app|pomodorolist-state/.test(k)).length }; });
check('Demo: the lobby lists James\'s public table and a friends-only session, Join shows the preview prompt, nothing is stored', demo.pv && demo.rows.length >= 2 && demo.rows.some(r => /Organic chemistry/.test(r)) && demo.rows.some(r => /Mock test/.test(r)) && demo.prompt && !demo.inSess && demo.ls === 0 && demo.ls2 === 0, JSON.stringify(demo));
await D.ctx.close();
// ---------- 10. (v1.19.1) every preset length, both modes, every visibility — from the form, against these rules ----------
// The 1.19 rules took the clan range for a session's rhythm (focus 5–120 min, break ≤ 30, ≤ 8 rounds): a 240-minute
// preset ("Brutal locked") was refused with "…refreshing your clan". Sessions now take whatever the preset editor allows.
const fsm = await import('fs');
await H.ev(async () => { if (inSess()) await liveLeave(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
const watchToasts = d => d.ev(() => { window.__toasts = []; if (!window.__toastWrapped) { window.__toastWrapped = true; const t0 = toast; toast = (m, ...a) => { window.__toasts.push(String(m)); return t0(m, ...a); }; } window.__clanRefreshes = 0; if (!window.__crWrapped) { window.__crWrapped = true; const c0 = clanRefresh; clanRefresh = (...a) => { window.__clanRefreshes++; return c0(...a); }; } });
await watchToasts(H);
/** Host from the Study sessions sheet with a preset; returns what was written. */
async function hostWith(pr, mode, vis) {
  await H.ev(([pr, mode, vis]) => {
    let p = S.presets.find(x => x.name === pr.name); if (!p) { p = { id: 'tp_' + pr.name.replace(/\W/g, ''), long: 15, ...pr }; S.presets.push(p); }
    S.activePresetId = p.id; S.timer.status = 'idle';
    window.__toasts = [];
  }, [pr, mode, vis]);
  const via = await hostVia(H, { title: `${pr.name} ${mode} ${vis}`, mode, vis, max: 6 });
  if (via !== 'ok') { const toasts = await H.ev(() => window.__toasts.slice()); return { ok: false, doc: null, toasts, via }; }
  const ok = await until(H, () => inSess() && LIVE.doc && LIVE.doc.host === USER.uid, null, 12000);
  const sid = ok >= 0 ? await H.ev(() => LIVE.lid) : null, doc = sid ? await ownerGet('studySessions/' + sid) : null;
  const toasts = await H.ev(() => window.__toasts.slice());
  if (sid) { await H.ev(() => liveControl('end')); await until(H, () => !inSess(), null, 10000); await H.ev(async () => { if (inSess()) await liveLeave(); }); await wait(400); }
  return { ok: !!doc, doc, toasts };
}
const PRESETS = [{ name: 'Classic 25', focus: 25, short: 5, rounds: 4 }, { name: 'Deep 50', focus: 50, short: 10, rounds: 2 }, { name: 'Long 90', focus: 90, short: 15, rounds: 2 },
  { name: 'Two hours', focus: 120, short: 10, rounds: 2 }, { name: 'Three hours', focus: 180, short: 15, rounds: 2 }, { name: 'Brutal locked', focus: 240, short: 5, rounds: 4 }];
const matrix = [];
for (const pr of PRESETS) for (const mode of ['together', 'synced']) for (const vis of ['friends', 'link', 'public']) {
  const r = await hostWith(pr, mode, vis);
  const d = r.doc || {};
  const good = r.ok && d.pattern && d.pattern.focus === pr.focus && d.pattern.short === pr.short && d.pattern.rounds === pr.rounds && d.mode === mode && d.vis === vis && d.max === 6
    && (vis === 'friends' ? d.code === '' : d.code.length === 8) && !r.toasts.some(t => /clan|isn’t allowed|Couldn’t/i.test(t));
  if (!good) matrix.push({ pr: pr.name, mode, vis, ok: r.ok, pattern: d.pattern, toasts: r.toasts });
}
check(`Sessions start from the form with 25/5, 50/10, 90/15, 120, 180 and 240-minute presets, Focus together and Synced, friends-only / link / public (${PRESETS.length * 6} sessions): each is written with its preset's rhythm, no error`, !matrix.length, JSON.stringify(matrix.slice(0, 4)));
// a preset outside what sessions take (e.g. from an old backup): a clear message before anything is written
const writesBefore = await H.ev(() => { window.__w = 0; if (!window.__wbWrapped) { window.__wbWrapped = true; const wb = FB.writeBatch; FB.writeBatch = (...a) => { window.__w++; return wb(...a); }; } return 0; });
void writesBefore;
const tooLong = await hostWith({ name: 'Imported 300', focus: 300, short: 10, rounds: 2 }, 'together', 'friends');
const tooLongW = await H.ev(() => window.__w);
const warnShown = await H.ev(async () => { S.activePresetId = 'tp_Imported300'; showTab('sessions'); openHostSheet(); for (let i = 0; i < 4; i++) { $('#hsNext').click(); await new Promise(r => setTimeout(r, 60)); } const w = ($('#sessPresetWarn') || {}).textContent || '', dis = !!($('#sessHostDlg [data-shost]') || {}).disabled; $('#sessHostDlg').close(); return w + (dis ? ' [start disabled]' : ''); });
const direct = await H.ev(async () => { S.activePresetId = 'tp_Imported300'; try { await sessCreate({ title: 'Direct', mode: 'together', vis: 'friends', max: 4 }); return 'written'; } catch (e) { return e.message; } });
const tooLongW2 = await H.ev(() => window.__w);
check('A preset outside the range (300-minute focus): the host sheet says "Study sessions support focus blocks of 1–240 min — pick a preset in that range" and its Start button is off; starting any other way says the same; nothing is written', !tooLong.ok && tooLong.via === 'Start disabled' && tooLongW === 0 && tooLongW2 === 0 && /Study sessions support focus blocks of 1–240 min/.test(direct) && /1–240 min/.test(warnShown) && /start disabled/.test(warnShown), JSON.stringify({ via: tooLong.via, w: [tooLongW, tooLongW2], direct, warnShown }));
// rules: still bounded — 241 minutes, 121-minute breaks, 13 rounds and 0-minute focus are refused, 240/120/12 accepted
const rawPat = pat => tryOp(H, `async pat => { const ref = FB.doc(FB.collection(FB.db, 'studySessions')); await FB.setDoc(ref, { title: 'Raw', host: USER.uid, hostName: USER.username, pattern: pat, mode: 'together', startAt: FB.serverTimestamp(), pausedAt: 0, pauseTotal: 0, shift: 0, open: true, counted: false, vis: 'friends', lobby: 'friends', max: 4, members: [USER.uid], invited: [], plan: 0, code: '', welcome: [], hostAt: FB.serverTimestamp(), createdAt: FB.serverTimestamp(), endedAt: 0, updatedAt: FB.serverTimestamp() }); }`, pat);
const rr = { f241: await rawPat({ focus: 241, short: 5, rounds: 2 }), s121: await rawPat({ focus: 60, short: 121, rounds: 2 }), r13: await rawPat({ focus: 60, short: 5, rounds: 13 }), f0: await rawPat({ focus: 0, short: 5, rounds: 2 }), frac: await rawPat({ focus: 60.5, short: 5, rounds: 2 }), max: await rawPat({ focus: 240, short: 120, rounds: 12 }) };
check('Rules: a session\'s rhythm is bounded like the preset editor — 241 min focus, 121 min break, 13 rounds, 0 or fractional minutes refused; 240 / 120 / 12 accepted', ['f241', 's121', 'r13', 'f0', 'frac'].every(k => /permission|denied/i.test(rr[k])) && rr.max === 'ALLOWED', JSON.stringify(rr));
// a refused session action talks about the session, never the clan, and doesn't reload the clan
await P.ev(() => { window.__toasts = []; }); await watchToasts(P);
await H.ev(async () => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); S.activePresetId = 'tp_Classic25'; await sessCreate({ title: 'Friends only table', mode: 'together', vis: 'friends', max: 4 }); });
const sidF = await H.ev(() => LIVE.lid);
await P.ev(sid => sessAct(null, () => sessJoin(sid), { denied: 'Couldn’t ask to join — the session may have closed' }), sidF); await wait(800);
// and a write the rules refuse outright (a stranger trying to take a seat at someone else's friends-only table)
await P.ev(sid => sessAct(null, () => FB.updateDoc(sessRef(sid), { members: FB.arrayUnion(USER.uid), updatedAt: FB.serverTimestamp() }), { denied: 'Couldn’t join — the session may be full or closed' }), sidF); await wait(800);
const pMsg = await P.ev(() => ({ toasts: window.__toasts.slice(), clan: window.__clanRefreshes }));
check('Refused session actions (a stranger asking to join, then writing a seat at a friends-only table) say so in session words — "Couldn’t join — the session may be full or closed", no "clan", no clan reload', pMsg.toasts.includes('Couldn’t join — the session may be full or closed') && !pMsg.toasts.some(t => /clan/i.test(t)) && pMsg.clan === 0, JSON.stringify(pMsg));
await H.ev(async () => { liveControl('end'); await new Promise(r => setTimeout(r, 1500)); if (inSess()) await liveLeave(); });
// with the exact rules published for 1.19 (before this fix): the 240-minute preset is refused — and the message says why, not "clan"
fsm.copyFileSync('rules-v119.rules', 'firestore.rules'); await wait(4000);
const oldRules = await hostWith(PRESETS[5], 'together', 'friends');
const oldShort = await hostWith(PRESETS[0], 'together', 'friends');
fsm.copyFileSync('/home/user/claude/firestore.rules', 'firestore.rules'); await wait(4000);
const oldClan = await H.ev(() => window.__clanRefreshes);
check('With the 1.19 rules still published: a 240-minute session is refused with "Couldn’t start a session with this preset — try one with focus blocks of 5–120 min…" (never "clan"), and a 25-minute one still starts', !oldRules.ok && oldRules.toasts.some(t => /focus blocks of 5–120 min/.test(t)) && !oldRules.toasts.some(t => /clan/i.test(t)) && oldClan === 0 && oldShort.ok, JSON.stringify({ old: oldRules.toasts, short: oldShort.ok, oldClan }));
const back = await hostWith(PRESETS[5], 'synced', 'public');
check('…and with the 1.19.1 rules back, the same 240-minute session starts', back.ok, JSON.stringify(back.toasts));
for (const d of [H, F, Q, P]) await d.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
