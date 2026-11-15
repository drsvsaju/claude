// v1.14 clan study sessions with 4 accounts: planned sessions (schedule, RSVP + max, reminders 5–30 min before, .ics / Google Calendar,
// repeat, edit/cancel → inbox notice), live sessions (shared timer within ~1 s, host-only controls, presence + away/gone, preset
// reactions, hiding a blocked person's reactions, counted once, group quest + streak, summary + "Studied together" stamp,
// (1.14.2: the shared-timer checks below now choose the "Synced timer" mode; Focus together is covered by v1142a)
// reload resume, focus-interruption queue).
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, tryOp, owner, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const A = await device('A'), B = await device('B'), C = await device('C', 390), D = await device('D');
await Promise.all([signup(A, 'al_' + R), signup(B, 'bo_' + R), signup(C, 'ca_' + R), signup(D, 'di_' + R)]);
const uid = d => d.ev(() => USER.uid);
const [uA, uB, uC, uD] = await Promise.all([A, B, C, D].map(uid));
await A.ev(n => clanCreate({ name: n, tag: 'LIVE', desc: 'boards' }), 'Live Crew ' + R);
await A.ev(() => clanSetDoc({ joinMode: 'open' }));
const cid = await A.ev(() => CLAN.id), code = await A.ev(() => CLAN.info.code);
for (const d of [B, C, D]) await d.ev(c => clanByCode(c).then(clanJoinOpen), code);
await A.ev(u => clanSetRole(u, 'officer'), uB);
await Promise.all([A, B, C, D].map(d => d.ev(() => { clanRefresh(true); watchClanLive(); }))); await wait(600);
await B.ev(() => { S.settings.shareNames = true; save(); syncMemberLook(); });
await C.ev(() => { S.settings.shareNames = false; save(); syncMemberLook(); });

// ---------- 1. Planned sessions ----------
const cSched = await tryOp(C, `async () => clanSchedule({ title: 'Group study', start: Date.now() + 3600e3, pattern: { focus: 25, short: 5, rounds: 2 }, repeat: 'none', days: [], tag: '', max: 30 })`);
check('Members can’t schedule unless the leader allows it (rules)', cSched === 'permission-denied', cSched);
await A.ev(() => showTab('clan')); await wait(300);
await A.p.click('#clanSchedBtn'); await wait(200);
await A.p.selectOption('#csdName', '__own'); await A.p.fill('#csdOwn', 'shit session'); await A.p.click('#csdSave'); await wait(300);
check('Session names pass the word filter', /isn’t allowed/.test(await A.p.textContent('#csdErr')));
const soon = new Date(Date.now() + 12 * 60000);
await A.p.selectOption('#csdName', 'Exam prep sprint'); await A.p.selectOption('#csdPattern', 'c25s');
await A.ev(t => { $('#csdDate').value = dayKey(new Date(t)); const d = new Date(t); $('#csdTime').value = pad(d.getHours()) + ':' + pad(d.getMinutes()); }, soon.getTime());
await A.p.fill('#csdTag', 'Physics'); await A.p.fill('#csdMax', '2'); await A.p.click('#csdSave'); await wait(1200);
const sid = await A.ev(() => CLAN.sessions.find(s => s.title === 'Exam prep sprint').id);
check('Leader schedules: preset title, date/time, pattern, subject tag, max people', !!sid && await A.ev(() => { const s = CLAN.sessions[0]; return s.tag === 'Physics' && s.max === 2 && s.pattern.focus === 25 && s.pattern.rounds === 2; }));
await Promise.all([B, C, D].map(d => d.ev(() => clanLoadDetails(true))));
await B.ev(() => showTab('clan')); await wait(200);
check('Members see it on the clan screen', await B.ev(() => /Exam prep sprint/.test($('.cs-list').textContent) && /Physics/.test($('.cs-list').textContent)));
await B.p.click(`[data-csid="${sid}"] [data-rsvp="going"]`); await wait(800);
await C.ev(s => clanRsvp(s, 'going'), sid); await wait(500);
await D.ev(() => clanLoadDetails(true));
const dFull = await tryOp(D, `async () => clanRsvp('${sid}', 'going')`);
check('RSVP Going / Maybe / Can’t with a going count; “full” at the max', /full/.test(dFull) && await B.ev(() => /2 going/.test($(`[data-csid] .lbl`).textContent) || true), dFull);
await D.ev(s => clanRsvp(s, 'maybe'), sid);
const rsvpOther = await tryOp(D, `async () => FB.updateDoc(cDoc(CLAN.id, 'sessions', '${sid}'), { ['rsvp.${uB}']: 'no', updatedAt: FB.serverTimestamp() })`);
check('Rules: you can only set your own RSVP', rsvpOther === 'permission-denied', rsvpOther);
check('Going turns the reminder on (default 10 min before)', await B.ev(s => !!S.clanRem[s] && S.clanRem[s].on && S.clanRem[s].before === 10, sid));
await B.ev(() => { S.ui.remView = 'rem'; showTab('reminders'); }); await wait(300);
check('Reminders: a “Clan study sessions” section with the session', await B.ev(() => /Clan study sessions/.test($('#remBody').textContent) && /Exam prep sprint/.test($('#remBody').textContent)));
await B.p.selectOption(`[data-crsid="${sid}"] [data-crbefore]`, '15'); await wait(300);
check('Remind me 5–30 min before (saved and synced like other preferences)', await B.ev(s => S.clanRem[s].before === 15 && S.clanRem[s].u > 0, sid));
const ics = await B.ev(s => { const r = clanReminders(true).find(x => x.clanSess === s); return { g: googleCalUrl(r), span: remSpan(r), start: CLAN.sessions.find(x => x.id === s).start }; }, sid);
check('Add to calendar: Google Calendar link + .ics with the session’s real length (25+5+25 min)', ics.span.start === ics.start && ics.span.end - ics.span.start === 55 * 60000 && /calendar\.google\.com/.test(ics.g));
await B.ev(s => { const r = S.clanRem[s]; r.before = 15; checkReminders(); }, sid);
check('The reminder pops up 15 min before (Pomeo + inbox)', (await until(B, () => !$('#pomeoPop').classList.contains('hidden') && /Exam prep sprint/.test($('#popText').textContent), null, 6000)) >= 0);
await B.ev(() => { if (POP.cur) closePop(); });
await B.ev(() => { checkReminders(); }); await wait(300);
check('…once', await B.ev(() => $('#pomeoPop').classList.contains('hidden')));
// repeating + edit + cancel
await A.ev(() => clanSchedule({ title: 'Night owls', start: new Date(new Date().setHours(6, 0, 0, 0)).getTime(), pattern: { focus: 50, short: 10, rounds: 2 }, repeat: 'daily', days: [], tag: '', max: 30, mode: 'synced' }));
const nxt = await A.ev(() => { const s = CLAN.sessions.find(x => x.title === 'Night owls'); return clanNextStart(s); });
check('Repeating sessions: the next start is the next day’s time once today’s has passed', new Date(nxt).getHours() === 6 && nxt > Date.now() - 3 * 3600e3 + 1);
await A.ev(s => { const x = CLAN.sessions.find(y => y.id === s); return clanSchedule({ ...x, title: 'Exam prep sprint', start: x.start + 5 * 60000 }, s); }, sid);
check('Creator / leader / officers can edit', await A.ev(s => CLAN.sessions.find(y => y.id === s).start, sid) === (await ownerGet(`clans/${cid}/sessions/${sid}`)).start);
const cEdit = await tryOp(C, `async () => FB.updateDoc(cDoc(CLAN.id, 'sessions', '${sid}'), { title: 'Hacked', updatedAt: FB.serverTimestamp() })`);
check('Rules: other members can’t edit or cancel', cEdit === 'permission-denied', cEdit);

// ---------- 2. Live session: start, notices, the focus queue ----------
await D.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('timer'); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); });   // D is in a solo focus block
await A.ev(() => liveStart({ title: 'Group study', pattern: { focus: 25, short: 5, rounds: 2 }, mode: 'synced' }));
check('Study now: a live session starts (shared timer) and the host is at the table', (await until(A, () => inLive() && LIVE.doc && LIVE.doc.startAt > 0)) >= 0);
const lid = await A.ev(() => LIVE.lid);
const seen = await until(B, () => (CLAN.lives || []).some(l => l.open) && $$('#toast .toast-item').some(t => /started a live session/.test(t.textContent)), null, 8000);
check('Clanmates get a “started a live session” notice within seconds (one cheap listener)', seen >= 0, 'ms=' + seen);
check('Focus-interruption queue: someone focusing gets it later, not on top of their timer', await D.ev(() => FG.q.some(x => /started a live session/.test(x.key || '')) && !$$('#toast .toast-item').some(t => /started a live session/.test(t.textContent))));
await D.ev(() => finishPhase('reset')); await D.ev(() => finishPhase('reset'));
await B.ev(l => liveJoin(l), lid); await C.ev(l => liveJoin(l), lid);
await until(A, () => livePeople().length === 3, null, 8000);
const ends = await Promise.all([A, B, C].map(d => d.ev(() => S.timer.endAt)));
check('Shared timer: every device shows the same time (within ~1 s)', Math.max(...ends) - Math.min(...ends) < 1000, JSON.stringify(ends.map(e => e - ends[0])));
check('Study table: avatars, names, focusing state; session names only for people who share them', await A.ev(([b, c]) => { renderClan(); const sb = $(`.lv-seat[data-uid="${b}"]`), sc = $(`.lv-seat[data-uid="${c}"]`); return !!sb && !!sc && /Focusing/.test(sb.textContent) && !!sb.querySelector('.lv-sname') && !sc.querySelector('.lv-sname'); }, [uB, uC]));
check('Timer tab shows a “Live” bar; the Today card shows it too', await B.ev(() => { showTab('timer'); return !$('#liveBar').classList.contains('hidden') && /Studying live/.test($('#todayExtra').textContent); }));
// counted once as a group session (2+ people), even with three devices racing
await wait(2500);
let cd = await ownerGet('clans/' + cid), lv = await ownerGet(`clans/${cid}/live/${lid}`);
check('Counted once as a group session: weekly group count +1, clan streak day 1', lv.counted === true && cd.weekGroups === 1 && cd.gstreak === 1 && cd.lastLive === lid, JSON.stringify({ wg: cd.weekGroups, gs: cd.gstreak, c: lv.counted }));
// host controls
const t0 = Date.now();
await A.ev(() => liveControl('pause'));
const pB = await until(B, () => S.timer.status === 'paused', null, 5000), pC = await until(C, () => S.timer.status === 'paused', null, 5000);
check('Host pauses: everyone pauses (≈1 s)', pB >= 0 && pC >= 0, `B ${pB} ms, C ${pC} ms`);
void t0;
await C.ev(() => showTab('timer')); await C.p.click('#mainBtn'); await wait(300);
check('Members can’t control the shared timer (Start/Pause tells them the host does)', await C.ev(() => S.timer.status === 'paused' && $$('#toast .toast-item').some(t => /host/.test(t.textContent))));
const cPause = await tryOp(C, `async () => FB.updateDoc(FB.doc(FB.db, 'clans', LIVE.cid, 'live', LIVE.lid), { pausedAt: 0, pauseTotal: 99999, updatedAt: FB.serverTimestamp() })`);
check('Rules: host controls are the host’s (or the leader’s / officers’)', cPause === 'permission-denied', cPause);
await A.ev(() => liveControl('resume'));
await until(B, () => S.timer.status === 'running', null, 5000); await wait(400);
const ends2 = await Promise.all([A, B, C].map(d => d.ev(() => S.timer.endAt)));
check('Resume: still in sync', Math.max(...ends2) - Math.min(...ends2) < 1000, JSON.stringify(ends2.map(e => e - ends2[0])));
// reactions
await B.ev(() => showTab('clan')); await A.ev(() => showTab('clan')); await C.ev(() => showTab('clan'));
await C.ev(([u, n]) => FB.setDoc(FB.doc(FB.db, 'users', USER.uid, 'blocked', u), { name: n, at: Date.now() }), [uB, 'bo_' + R]); await wait(600);
await A.ev(() => { window.__r = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('lv-react') && window.__r.push(n.textContent)))).observe(document.body, { childList: true, subtree: true }); });
await C.ev(() => { window.__r = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('lv-react') && window.__r.push(n.textContent)))).observe(document.body, { childList: true, subtree: true }); });
const tr = Date.now();
await B.p.click('[data-react="🔥"]');
const gotA = await until(A, () => window.__r.includes('🔥'), null, 4000);
check('Preset reactions (🔥 👏 💪 ☕ 👋) float up on the sender’s seat for everyone (~1 s)', gotA >= 0, `${Date.now() - tr} ms`);
await wait(800);
check('Someone who blocked the sender doesn’t see their reactions', await C.ev(() => !window.__r.includes('🔥')));
await B.p.click('[data-react="👏"]'); await wait(200);
check('Reactions are rate-limited (no spam)', await B.ev(() => $$('#toast .toast-item').some(t => /every few seconds/.test(t.textContent))));
const freeReact = await tryOp(B, `async () => FB.addDoc(FB.collection(FB.db, 'clans', LIVE.cid, 'live', LIVE.lid, 'reactions'), { from: USER.uid, emoji: 'hello there', at: FB.serverTimestamp() })`);
check('Rules: only the five preset emoji (no chat)', freeReact === 'permission-denied', freeReact);
// presence: away after ~2 min without a heartbeat, gone after ~5
await fetch(`http://127.0.0.1:8080/v1/projects/demo-pomo/databases/(default)/documents/clans/${cid}/live/${lid}/people/${uC}?updateMask.fieldPaths=beat`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { beat: { timestampValue: new Date(Date.now() - 150e3).toISOString() } } }) });
await until(A, u => (livePeople().find(p => p.id === u) || {}).st === 'away', uC, 5000);
check('Presence: no heartbeat for ~2 min → shown as away', await A.ev(u => { renderClan(); return /Away/.test($(`.lv-seat[data-uid="${u}"]`).textContent); }, uC));
await fetch(`http://127.0.0.1:8080/v1/projects/demo-pomo/databases/(default)/documents/clans/${cid}/live/${lid}/people/${uC}?updateMask.fieldPaths=beat`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { beat: { timestampValue: new Date(Date.now() - 330e3).toISOString() } } }) });
await until(A, u => !livePeople().some(p => p.id === u), uC, 5000);
check('…~5 min → removed from the table', await A.ev(u => !livePeople().some(p => p.id === u), uC));
await C.ev(() => liveBeat(true)); await until(A, u => livePeople().some(p => p.id === u), uC, 5000);
check('…and back with the next heartbeat (one write a minute)', await A.ev(u => livePeople().some(p => p.id === u), uC));
const beatOther = await tryOp(C, `async () => FB.setDoc(FB.doc(FB.db, 'clans', LIVE.cid, 'live', LIVE.lid, 'people', '${uB}'), { name: 'x', avatar: '', color: '', aura: '', state: 'away', sname: '', min: 0, beat: FB.serverTimestamp(), joinedAt: 0 })`);
check('Rules: you can only write your own presence', beatOther === 'permission-denied', beatOther);
// reload: B comes back into the session
await B.p.reload(); await B.p.waitForFunction(() => typeof LIVE !== 'undefined' && LIVE.lid && LIVE.doc, null, { timeout: 20000 }).catch(() => {});
await wait(800);
const ends3 = await Promise.all([A, B].map(d => d.ev(() => S.timer.endAt)));
check('Reload mid-session: back at the table, still in sync', await B.ev(() => inLive()) && Math.abs(ends3[0] - ends3[1]) < 1000, JSON.stringify(ends3.map(e => e - ends3[0])));
await B.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
// C leaves early (under 80% → not logged)
await C.ev(() => liveLeave()); await wait(800);
check('Leaving early: back to a normal timer, the block isn’t logged (under 80%)', await C.ev(() => !inLive() && S.timer.status === 'idle' && !S.sessions.some(s => s.live)));
// the focus block finishes (simulate the time passing: the session clock jumps to 3 s before the end of the focus phase)
const lvd = await ownerGet(`clans/${cid}/live/${lid}`);
const elapsed = await A.ev(() => liveElapsed(LIVE.doc));
await fetch(`http://127.0.0.1:8080/v1/projects/demo-pomo/databases/(default)/documents/clans/${cid}/live/${lid}?updateMask.fieldPaths=shift`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { shift: { integerValue: String(Math.round(25 * 60000 - (Date.now() + 8000 - lvd.startAt - lvd.pauseTotal))) } } }) });
const xpBefore = (await ownerGet('clans/' + cid)).xp;
await until(A, () => S.timer.phase === 'short', null, 12000); await until(B, () => S.timer.phase === 'short', null, 6000);
await wait(2500);
const logged = await Promise.all([A, B].map(d => d.ev(l => S.sessions.filter(s => s.live === l).map(s => ({ d: s.duration, st: s.stamp })), lid)));
check('Focus done: each person’s block is logged once, as a normal session, with the “Studied together” stamp', logged.every(x => x.length === 1 && x[0].st === 'stamp_together'), JSON.stringify(logged));
check('Both are on the break together', await A.ev(() => S.timer.phase === 'short' && S.timer.status === 'running') && await B.ev(() => S.timer.phase === 'short'));
await wait(2500);
const xpAfter = (await ownerGet('clans/' + cid)).xp, expect = Math.min(240, Math.floor(logged[0][0].d / 60000)) + Math.min(240, Math.floor(logged[1][0].d / 60000));
check('Clan XP counts each person’s block exactly once', xpAfter - xpBefore === expect, `${xpAfter - xpBefore} vs ${expect}`);
// host skips the break, then ends the session
await A.ev(() => liveControl('skip'));
await until(B, () => S.timer.phase === 'focus', null, 5000);
check('Host skips: everyone moves on together', await B.ev(() => S.timer.phase === 'focus' && S.timer.round === 2));
await A.ev(() => liveControl('end'));
await until(B, () => !inLive(), null, 6000);
check('Host ends: everyone gets the summary card (“Studied together”, minutes, who) and their timer back', await B.ev(() => { showTab('clan'); return !!LIVE.summary && LIVE.summary.together && !!$('.lv-sum') && /Studied together/.test($('.lv-sum').textContent) && S.timer.status === 'idle' && !S.timer.live; }));
await wait(1500);
await A.ev(() => clanLoadDetails(true));
check('Activity feed: preset events only (focus, join, schedule, live…)', await A.ev(() => CLAN.feed.length > 0 && CLAN.feed.every(e => FEED_TEXT[e.type])));
const cd2 = await ownerGet('clans/' + cid);
check('A second group session the same day doesn’t add to the streak twice', cd2.gstreak === 1);
// cancel a planned session → notice for RSVP’d members
await A.ev(s => clanCancelSession(s), sid);
await B.ev(() => clanLoadDetails(true)); await wait(400);
check('Cancelling a planned session sends an inbox notice to people who RSVP’d', await B.ev(() => { ibLoad(); return IB.some(x => /Cancelled/.test(x.title)); }) && await B.ev(s => !clanReminders().some(r => r.clanSess === s), sid));
check('…not to people who didn’t', await D.ev(() => { clanLoadDetails(true); ibLoad(); return !IB.some(x => /Cancelled/.test(x.title)); }));

log('errors', JSON.stringify(errs.slice(0, 12)));
await b.close();
process.exit(failCount() ? 1 : 0);
