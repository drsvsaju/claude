// v1.14.2 clan session modes with 3 accounts: planned sessions show their mode; "Focus together" (default: own timers at one
// table, countdowns + states for everyone, nobody controls anyone, leaving/stepping away only affects you, stamp + summary
// for overlap, group count, XP, reactions, low-frequency presence); "Synced timer" (shared timer, host controls); someone
// leaving mid-session and coming back in both modes.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, tryOp, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const A = await device('A'), B = await device('B'), C = await device('C', 390);
await Promise.all([signup(A, 'aa_' + R), signup(B, 'bb_' + R), signup(C, 'cc_' + R)]);
const [uA, uB, uC] = await Promise.all([A, B, C].map(d => d.ev(() => USER.uid)));
await A.ev(n => clanCreate({ name: n, tag: 'MODE', desc: 'jee' }), 'Mode Crew ' + R);
await A.ev(() => clanSetDoc({ joinMode: 'open' }));
const cid = await A.ev(() => CLAN.id), code = await A.ev(() => CLAN.info.code);
for (const d of [B, C]) await d.ev(c => clanByCode(c).then(clanJoinOpen), code);
await Promise.all([A, B, C].map(d => d.ev(() => { clanRefresh(true); watchClanLive(); S.settings.shareNames = true; save(); })));
await wait(800);
const ready = d => d.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); });

// ---------- 1. Planned sessions show their mode ----------
await A.ev(() => showTab('clan')); await wait(300);
await A.p.click('#clanSchedBtn'); await wait(200);
check('Schedule dialog: mode choice with Focus together as the default', await A.ev(() => $('#csdMode [data-cmode2="together"]').classList.contains('active') && /Suggested pattern/.test($('#csdPatternLbl').textContent)));
const at = Date.now() + 3 * 3600e3;
await A.ev(t => { $('#csdDate').value = dayKey(new Date(t)); const d = new Date(t); $('#csdTime').value = pad(d.getHours()) + ':' + pad(d.getMinutes()); }, at);
await A.p.click('#csdSave'); await wait(1200);
await A.p.click('#clanSchedBtn'); await wait(200);
await A.p.selectOption('#csdName', 'Mock test'); await A.p.click('#csdMode [data-cmode2="synced"]');
check('Choosing Synced timer relabels the pattern as shared', /Shared pattern/.test(await A.p.textContent('#csdPatternLbl')));
await A.ev(t => { $('#csdDate').value = dayKey(new Date(t)); const d = new Date(t); $('#csdTime').value = pad(d.getHours()) + ':' + pad(d.getMinutes()); }, at + 3600e3);
await A.p.click('#csdSave'); await wait(1200);
await B.ev(() => { showTab('clan'); return clanLoadDetails(true); }); await wait(400);
const chips = await B.ev(() => $$('.cs-row').map(r => [r.querySelector('.rt').textContent.trim(), r.querySelector('.cs-mode').textContent]));
check('Planned sessions show which mode they use (for every member)', JSON.stringify(chips).includes('"Group study","Focus together"') && JSON.stringify(chips).includes('"Mock test","Synced timer"'), JSON.stringify(chips));
const docs = await B.ev(() => CLAN.sessions.map(s => [s.title, s.mode || '']));
check('Stored: Focus together sessions carry mode; Synced ones need none (also fine with older rules)', JSON.stringify(docs).includes('["Group study","together"]') && JSON.stringify(docs).includes('["Mock test",""]'), JSON.stringify(docs));

// ---------- 2. Focus together ----------
await A.ev(() => { showTab('timer'); S.activePresetId = 'p-classic'; S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); });   // A is already focusing
await A.ev(() => { showTab('clan'); openClanSched(null, true); }); await wait(200);
check('Study now: Focus together is the default too', await A.ev(() => $('#csdMode [data-cmode2="together"]').classList.contains('active')));
await A.p.click('#csdSave');
check('Starting a Focus-together table doesn’t touch my running timer', (await until(A, () => inTogether() && LIVE.doc)) >= 0 && await A.ev(() => S.timer.status === 'running' && S.timer.phase === 'focus'));
const lid = await A.ev(() => LIVE.lid);
check('The live session is stored as Focus together', (await ownerGet(`clans/${cid}/live/${lid}`)).mode === 'together');
await C.ev(() => { showTab('timer'); S.activePresetId = 'p-deep'; S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); });   // C started their own 50-min block first
await B.ev(l => liveJoin(l), lid); await C.ev(l => liveJoin(l), lid);
check('Joining with my own timer already running is fine (C)', await C.ev(() => inTogether() && S.timer.status === 'running' && S.timer.planned === 50 * 60000));
await until(A, () => livePeople().length === 3, null, 8000);
check('Everyone sits at the same table', await A.ev(() => livePeople().length === 3) && await B.ev(() => livePeople().length === 3));
check('B’s seat shows Ready (timer not started)', await A.ev(u => { renderClan(); return /Ready/.test($(`.lv-seat[data-uid="${u}"]`).textContent); }, uB));
await B.ev(() => { showTab('timer'); S.activePresetId = 'p-deep'; renderSessionInputs(); }); await B.p.click('#mainBtn');
await wait(2500);
const seen = await A.ev(u => { renderClan(); const p = livePeople().find(x => x.id === u), el = $(`.lv-seat[data-uid="${u}"]`); return { st: p.st, left: p.endAt - liveSrvNow(), txt: el.textContent }; }, uB);
const bLeft = await B.ev(() => S.timer.endAt - Date.now());
check('Each seat shows that person’s own countdown and state (B: Focusing, ~50:00 on A’s screen, within 2 s)', seen.st === 'focus' && /Focusing/.test(seen.txt) && Math.abs(seen.left - bLeft) < 2000 && bLeft > 49 * 60000, JSON.stringify({ seen, bLeft }));
check('Own presets: A 25 min, B and C 50 min', await A.ev(() => S.timer.planned) === 25 * 60000 && await B.ev(() => S.timer.planned) === 50 * 60000);
// nobody controls anyone
check('No host controls at a Focus-together table (nobody controls anyone else’s timer)', await A.ev(() => { showTab('clan'); return !document.querySelector('[data-lvctl]'); }));
await A.ev(() => showTab('timer')); await A.p.click('#mainBtn'); await wait(2000);
check('A pauses: only A’s timer pauses', await A.ev(() => S.timer.status === 'paused') && await B.ev(() => S.timer.status === 'running') && await C.ev(() => S.timer.status === 'running'));
check('Others see A as Paused with the time left', await C.ev(u => { renderClan(); const p = livePeople().find(x => x.id === u); return p.st === 'paused' && p.left > 20 * 60000 && /Paused/.test($(`.lv-seat[data-uid="${u}"]`).textContent); }, uA));
const forbid = await tryOp(C, `async () => FB.setDoc(FB.doc(FB.db, 'clans', LIVE.cid, 'live', LIVE.lid, 'people', '${uA}'), { name: 'x', avatar: '', color: '', aura: '', state: 'idle', sname: '', min: 0, beat: FB.serverTimestamp(), joinedAt: 0 })`);
check('Rules: you can’t change anyone else’s seat', forbid === 'permission-denied', forbid);
await A.p.click('#mainBtn'); await wait(1500);
// reactions + group count
await B.ev(() => showTab('clan')); await A.ev(() => showTab('clan'));
await A.ev(() => { window.__r = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('lv-react') && window.__r.push(n.textContent)))).observe(document.body, { childList: true, subtree: true }); });
await B.p.click('[data-react="💪"]');
check('Preset reactions work at a Focus-together table', (await until(A, () => window.__r.includes('💪'), null, 4000)) >= 0);
await wait(1500);
let cd = await ownerGet('clans/' + cid);
check('Counted once as a group session (weekly group quest + clan study streak)', cd.weekGroups === 1 && cd.gstreak === 1);
// presence stays low-frequency
await B.ev(() => { window.__beats = 0; const f = FB.setDoc; FB.setDoc = (...a) => { if (/\/people\//.test(a[0].path || '')) window.__beats++; return f(...a); }; });
await wait(65000);
const beats = await B.ev(() => window.__beats);
check('Presence stays low-frequency: about one write a minute while nothing changes', beats >= 1 && beats <= 2, `${beats} writes in 65 s`);
// stepping away (tab hidden > 2 min) only affects you
await B.ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); LIVE.hiddenAt = Date.now() - 130000; liveBeat(true); });
await wait(2000);
check('Stepping away: others see Away; B’s own timer keeps running', await A.ev(u => livePeople().find(x => x.id === u).st === 'away', uB) && await B.ev(() => S.timer.status === 'running'));
await B.ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
await wait(2000);
check('…and back to Focusing when they return', await A.ev(u => livePeople().find(x => x.id === u).st === 'focus', uB));
// C leaves mid-session and comes back
await C.ev(() => liveLeave()); await wait(2000);
check('C leaves the table mid-session: C’s own timer keeps going', await C.ev(() => !inLive() && S.timer.status === 'running' && S.timer.planned === 50 * 60000));
check('…and C is gone from everyone’s table', await A.ev(u => !livePeople().some(x => x.id === u), uC));
await C.ev(l => liveJoin(l), lid); await wait(2500);
check('C comes back: same seat, same running timer', await A.ev(u => livePeople().find(x => x.id === u)?.st === 'focus', uC) && await C.ev(() => inTogether() && S.timer.status === 'running'));
// A’s block finishes while B and C focus at the table → studied together, counted once
const xp0 = (await ownerGet('clans/' + cid)).xp;
await A.ev(() => { const t = S.timer; t.planned = 25 * 60000; t.endAt = Date.now() - 1; });
await wait(3500);
const aLog = await A.ev(l => S.sessions.filter(s => s.live === l).map(s => ({ st: s.stamp, d: Math.round(s.duration / 60000) })), lid);
check('A’s block (overlapping B and C): logged once as a normal session with the “Studied together” stamp', aLog.length === 1 && aLog[0].st === 'stamp_together', JSON.stringify(aLog));
check('A’s own timer moves on to A’s own break (nobody else’s timer changed)', await A.ev(() => S.timer.phase === 'short') && await B.ev(() => S.timer.phase === 'focus' && S.timer.status === 'running'));
await wait(2500);
check('Clan XP counts the block once', (await ownerGet('clans/' + cid)).xp - xp0 === 25);
// B and C leave; A alone does a block → not "together"
await B.ev(() => liveLeave()); await C.ev(() => liveLeave()); await wait(1500);
await A.ev(() => { const t = S.timer; finishPhase('skip'); t.phase = 'focus'; t.status = 'idle'; startTimer(); }); await wait(500);
await A.ev(() => { const t = S.timer; t.planned = 25 * 60000; t.endAt = Date.now() - 1; }); await wait(2500);
const aLog2 = await A.ev(l => S.sessions.filter(s => s.live === l).map(s => s.stamp), lid);
check('A’s next block alone at the table is a normal session (no “together” stamp)', aLog2.length === 2 && aLog2[1] !== 'stamp_together', JSON.stringify(aLog2));
await A.ev(() => liveLeave()); await wait(1500);
check('Leaving shows the group summary (“Studied together” with who overlapped)', await A.ev(() => { showTab('clan'); return !!LIVE.summary && LIVE.summary.together && LIVE.summary.people.length >= 2 && /Studied together/.test($('.lv-sum').textContent); }));
check('The last one out closes the table', (await ownerGet(`clans/${cid}/live/${lid}`)).open === false);

// ---------- 3. Synced timer ----------
for (const d of [A, B, C]) await d.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); LIVE.summary = null; const t = S.timer; if (t.status !== 'idle') finishPhase('reset'); t.status = 'idle'; t.phase = 'focus'; t.round = 1; saveLocal(); });
await A.ev(() => { showTab('clan'); openClanSched(null, true); }); await wait(200);
await A.p.click('#csdMode [data-cmode2="synced"]'); await A.p.click('#csdSave');
await until(A, () => inSynced() && LIVE.doc && LIVE.doc.startAt > 0);
const sl = await A.ev(() => LIVE.lid);
check('Synced timer: stored without a mode (as in 1.14) and shown as Synced', !('mode' in (await ownerGet(`clans/${cid}/live/${sl}`))) && await A.ev(() => /Synced timer/.test($('#lvCard').textContent)));
await B.ev(l => liveJoin(l), sl); await C.ev(l => liveJoin(l), sl);
await until(A, () => livePeople().length === 3, null, 8000);
const ends = await Promise.all([A, B, C].map(d => d.ev(() => S.timer.endAt)));
check('Synced: everyone on the same shared timer (within ~1 s)', Math.max(...ends) - Math.min(...ends) < 1000, JSON.stringify(ends.map(e => e - ends[0])));
await A.ev(() => liveControl('pause'));
check('Synced: the host pauses everyone', (await until(B, () => S.timer.status === 'paused', null, 5000)) >= 0 && (await until(C, () => S.timer.status === 'paused', null, 5000)) >= 0);
await A.ev(() => liveControl('resume')); await until(C, () => S.timer.status === 'running', null, 5000);
await C.ev(() => liveLeave()); await wait(1200);
check('Synced: C leaves mid-block — C’s timer is free again and the partial block isn’t logged', await C.ev(l => !inLive() && S.timer.status === 'idle' && !S.sessions.some(s => s.live === l), sl));
await C.ev(l => liveJoin(l), sl); await wait(2500);
const ends2 = await Promise.all([A, C].map(d => d.ev(() => S.timer.endAt)));
check('Synced: C comes back and is right back on the shared timer', await C.ev(() => inSynced() && S.timer.status === 'running') && Math.abs(ends2[0] - ends2[1]) < 1000, JSON.stringify(ends2.map(e => e - ends2[0])));
await A.ev(() => liveControl('end'));
check('Synced: the host ends it for everyone, with the summary', (await until(B, () => !inLive() && !!LIVE.summary, null, 6000)) >= 0);
cd = await ownerGet('clans/' + cid);
check('Both kinds count toward the weekly group sessions (2 so far)', cd.weekGroups === 2, 'weekGroups=' + cd.weekGroups);

log('errors', JSON.stringify(errs.slice(0, 12)));
await b.close();
process.exit(failCount() ? 1 : 0);
