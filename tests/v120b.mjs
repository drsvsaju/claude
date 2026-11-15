// v1.20 phase 2: Overtime. On by default (new and upgrading accounts). A focus block that reaches 0 plays the end sound
// once, then counts up (+mm:ss, Overtime, Stop / Break / Pause, "Turn off overtime"); Stop logs ONE block of planned +
// overtime that counts for XP, coins, the daily total, garden water, boss damage and rank minutes; pause banks overtime;
// the 240-minute cap logs exactly 240; 10 idle minutes ask "Were you still focusing?" (No logs up to the last activity, Yes
// keeps counting; a hidden tab waits); a reload mid-overtime keeps counting and logs once; midnight splits the block;
// a double-click logs once; nothing pops up during overtime (queued until after); Synced timer: off, with a note; Focus
// together: on; the tutorial's demo block: off; the setting off: blocks end as before; the one-time tip for upgrading
// accounts after a block (never during), once per account; the setting syncs to a second device.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, U, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5), NAME = 'ot_' + R;
const A = await device('A', 1280, {}, { overtime: true });
await signup(A, NAME); await closeDlg(A);
await A.ev(() => { S.settings.gardenTour = Date.now(); window.__ends = 0; const pe = playEndSound; playEndSound = (...a) => { window.__ends++; return pe(...a); }; window.__ts = []; const t0 = toast; toast = (m, ...a) => { window.__ts.push(String(m)); return t0(m, ...a); }; });
// helpers (in the page): start a 25-minute focus block and make it reach 0 now; shift the overtime start back by `min`
const begin = () => A.ev(async () => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); await new Promise(r => setTimeout(r, 450)); const t = S.timer; finishPhaseQuiet(); S.activePresetId = S.presets.find(p => p.focus === 25).id; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.focusStartedAt -= 25 * 6e4; t.endAt = Date.now() - 200; await new Promise(r => setTimeout(r, 700)); return { ot: !!t.ot, lbl: $('#phaseLabel').textContent }; });
const helpers = () => A.ev(() => { window.finishPhaseQuiet = () => { const t = S.timer; t.ot = null; t.status = 'idle'; t.remaining = 0; t.endAt = 0; t.phase = 'focus'; }; window.otBack = (min, actMin = 0) => { const t = S.timer; t.ot.from -= min * 6e4; t.ot.act = Date.now() - actMin * 6e4; }; });
await helpers();
// 1. on by default
const def = await A.ev(() => ({ s: S.settings.overtime, on: otOn(), box: (renderSettings(), $('#setOvertime').checked), upgraded: (() => { const keep = S.settings.overtime; delete S.settings.overtime; const r = otOn(); S.settings.overtime = keep; return r; })() }));
check('Overtime is on by default — a new account, and an account from before 1.20 (no setting saved); the Settings switch shows it', def.s === true && def.on && def.box && def.upgraded, JSON.stringify(def));
// 2. the block reaches 0: end sound once, counting up
const ends0 = await A.ev(() => window.__ends);
const st = await begin();
const ui = await A.ev(async () => { await new Promise(r => setTimeout(r, 1300)); return { ot: !!S.timer.ot, status: S.timer.status, lbl: $('#phaseLabel').textContent, time: $('#timeText').getAttribute('aria-label'), dlg: [...document.querySelectorAll('dialog[open]')].map(x => x.id), ring: $('#ring').classList.contains('ot'), main: $('#mainBtn').textContent.trim(), skip: $('#skipBtn').textContent.trim(), reset: $('#resetBtn').textContent.trim(), line: $('#otLine').textContent, off: !!$('#otOff'), logged: S.sessions.length, title: document.title }; });
const ends1 = await A.ev(() => window.__ends);
check('At 0 the end sound plays once, then the timer counts up: "Overtime", +00:0x, Stop / Break / Pause, "Turn off overtime"; nothing logged yet, nothing popped up', st.ot && ui.status === 'running' && ui.lbl === 'Overtime' && /^\+00:0\d$/.test(ui.time) && !ui.dlg.length && ui.ring && ui.main === 'Stop' && ui.skip === 'Break' && ui.reset === 'Pause' && ui.off && /Stop/.test(ui.line) && ui.logged === 0 && ends1 - ends0 === 1 && /^\+00:0\d · Overtime/.test(ui.title), JSON.stringify({ ui, ends: ends1 - ends0 }));
// friends see "– overtime": the presence says so (older apps show nothing for it, as before)
await wait(1500);
const pres = await ownerGet('presence/' + await A.ev(() => USER.uid));
const ptxt = await A.ev(() => [presenceText({ visible: true, now: { name: 'Maths', phase: 'focus', status: 'overtime', endAt: Date.now() - 6e4, left: 0 }, updatedAt: { toMillis: () => Date.now() - 6e4 } }), presenceText({ visible: true, now: { name: 'Maths', phase: 'focus', status: 'overtime', endAt: Date.now() - 6e5, left: 0 }, updatedAt: { toMillis: () => Date.now() - 5 * 3600e3 } })]);
check('In overtime the presence says "overtime" and friends see "Maths – overtime" (not after 4 hours of silence)', pres && pres.now && pres.now.status === 'overtime' && /– overtime$/.test(ptxt[0]) && ptxt[1] === '', JSON.stringify({ now: pres && pres.now, ptxt }));
// 3. 12 minutes of overtime, Stop: one block of 37 minutes that counts everywhere
const before = await A.ev(() => { const g = game(); const k = dayKey(new Date()); return { n: S.sessions.length, xp: g.xp, coins: g.balance, day: (buildIndex()[k] || {}).total || 0, season: seasonMinutes(seasonKeyNow()), boss: bossBattle('solo').dealt ?? null, water: (S.garden && S.garden.plots || []).reduce((a, p) => a + (p && p.w || 0), 0) }; });
await A.ev(() => { otBack(12); });
await closeDlg(A); await A.p.click('#mainBtn'); await wait(1200);
const after = await A.ev(() => { const g = game(), k = dayKey(new Date()), s = S.sessions.reduce((a, x) => (!a || +x.end > +a.end ? x : a), null); return { n: S.sessions.length, dur: Math.round(s.duration / 6e4), ot: s.ot, planned: Math.round(s.planned / 6e4), xp: g.xp, coins: g.balance, day: (buildIndex()[k] || {}).total || 0, season: seasonMinutes(seasonKeyNow()), boss: bossBattle('solo').dealt ?? null, phase: S.timer.phase, status: S.timer.status, toast: window.__ts.slice(-3).join(' | ') }; });
check('Stop after 12 min of overtime logs ONE block: 25 + 12 = 37 min (ot: 12), and the break is next', after.n === before.n + 1 && after.dur === 37 && after.ot === 12 && after.planned === 25 && after.phase !== 'focus' && after.status === 'idle', JSON.stringify(after));
check('The overtime minutes count: +37 XP-minutes (XP), coins, the day’s total +37, rank minutes +37, boss damage, and the toast says "37m with 12m overtime"', after.xp - before.xp >= 37 && after.coins > before.coins && Math.round(after.day - before.day) === 37 && after.season - before.season === 37 && (before.boss === null || after.boss - before.boss === 37 || after.boss >= before.boss) && /12m overtime/.test(after.toast), JSON.stringify({ before, after }));
// 4. pause banks overtime
await begin(); await A.ev(() => otBack(5));
const p1 = await A.ev(async () => { $('#resetBtn').click(); const a = otMs(); await new Promise(r => setTimeout(r, 1600)); const b = otMs(); const lbl = $('#resetBtn').textContent.trim(); $('#resetBtn').click(); await new Promise(r => setTimeout(r, 1200)); return { a: Math.round(a / 1000), b: Math.round(b / 1000), c: Math.round(otMs() / 1000), lbl, status: S.timer.status }; });
check('Pause in overtime stops the count (Resume shows), Resume continues from there', p1.a === p1.b && p1.c >= p1.b + 1 && p1.lbl === 'Resume' && p1.status === 'running', JSON.stringify(p1));
await closeDlg(A); await A.p.click('#mainBtn'); await wait(900);
const n2 = await A.ev(() => ({ s: S.sessions.reduce((a, x) => (!a || +x.end > +a.end ? x : a), null), n: S.sessions.length }));
check('…and Stop logs 25 + 5 = 30 min', Math.round(n2.s.duration / 6e4) === 30 && n2.s.ot === 5, JSON.stringify(n2.s));
// 5. the cap: 240 minutes total
await begin(); await A.ev(() => otBack(300));
await wait(1200);
const cap = await A.ev(() => { const s = S.sessions.reduce((a, x) => (!a || +x.end > +a.end ? x : a), null); return { dur: Math.round(s.duration / 6e4), ot: s.ot, idle: S.timer.status, toast: window.__ts.some(m => /Overtime stopped at 4h|Overtime stopped at 4 h/.test(m)), end: s.end, start: s.start }; });
check('Overtime stops itself at a 240-minute block: logged 240 (ot 215), with a notice — never more than the rules’ 4-hour session', cap.dur === 240 && cap.ot === 215 && cap.idle === 'idle' && cap.toast, JSON.stringify(cap));
// 6. idle: 10 minutes without a sign of the user
await begin(); await A.ev(() => otBack(15, 11));
await wait(900);
const ask = await A.ev(() => ({ open: $('#otIdleDlg').open, body: $('#otIdleBody').textContent, no: $('#otIdleNo').textContent, logged: !!S.timer.ot }));
await A.ev(() => $('#otIdleNo').click()); await wait(900);
const away = await A.ev(() => { const s = S.sessions.reduce((a, x) => (!a || +x.end > +a.end ? x : a), null); return { dur: Math.round(s.duration / 6e4), ot: s.ot, ot0: !S.timer.ot }; });
check('After 10 idle minutes: "Were you still focusing?"; "No — log up to <time>" logs only the overtime before the user left (25 + 4)', ask.open && ask.logged && /since you last used the app/.test(ask.body) && /^No — log up to /.test(ask.no) && away.dur === 29 && away.ot === 4 && away.ot0, JSON.stringify({ ask, away }));
await begin(); await A.ev(() => otBack(15, 11)); await wait(900);
await A.ev(() => $('#otIdleYes').click()); await wait(600);
const yes = await A.ev(() => ({ ot: !!S.timer.ot, open: $('#otIdleDlg').open, act: Date.now() - S.timer.ot.act < 5000, min: Math.round(otMs() / 6e4) }));
check('"Yes, count it" keeps counting all of it (15 min) and resets the idle clock', yes.ot && !yes.open && yes.act && yes.min === 15, JSON.stringify(yes));
// a hidden tab: no question, nothing logged, until it is visible again
const hid = await A.ev(async () => { otBack(0, 30); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); await new Promise(r => setTimeout(r, 900)); const a = { open: $('#otIdleDlg').open, ot: !!S.timer.ot }; delete document.hidden; await new Promise(r => setTimeout(r, 900)); return { ...a, after: $('#otIdleDlg').open }; });
check('With the tab hidden nothing is asked or logged; when it is visible again the question shows', !hid.open && hid.ot && hid.after, JSON.stringify(hid));
await A.ev(() => $('#otIdleYes').click()); await closeDlg(A); await A.p.click('#mainBtn'); await wait(900);
// 7. reload mid-overtime
await begin(); await A.ev(() => { otBack(7); saveLocal(); });
const nBefore = await A.ev(() => S.sessions.length);
await A.p.reload(); await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(1500); await closeDlg(A);
const rl = await A.ev(() => ({ ot: !!S.timer.ot, min: Math.round(otMs() / 6e4), lbl: $('#phaseLabel').textContent, n: S.sessions.length }));
await helpers(); await A.ev(() => { window.__ts = []; const t0 = toast; toast = (m, ...a) => { window.__ts.push(String(m)); return t0(m, ...a); }; });
await closeDlg(A); await A.p.click('#mainBtn'); await wait(500); await A.p.click('#mainBtn').catch(() => {}); await wait(1200);   // and a double-click on Stop
const rl2 = await A.ev(() => ({ n: S.sessions.length, s: S.sessions.reduce((a, x) => (!a || +x.end > +a.end ? x : a), null), status: S.timer.status }));
check('A reload mid-overtime keeps counting from the same start; Stop (even double-clicked) logs it once: 25 + 7', rl.ot && rl.min === 7 && rl.lbl === 'Overtime' && rl.n === nBefore && rl2.n === nBefore + 1 && Math.round(rl2.s.duration / 6e4) === 32, JSON.stringify({ rl, n: rl2.n, dur: rl2.s && rl2.s.duration / 6e4, st: rl2.status }));
await A.ev(() => finishPhaseQuiet());
// 8. midnight: a block from 23:40 with 20 min of overtime to 00:25 splits by minutes on each side
const mid = await A.ev(() => {
  const t = S.timer, d0 = new Date(); d0.setHours(0, 0, 0, 0); const mn = d0.getTime();
  t.phase = 'focus'; t.status = 'running'; t.planned = 25 * 6e4; t.focusStartedAt = mn - 20 * 6e4; t.endAt = mn + 5 * 6e4; t.name = 'Midnight';
  t.ot = { from: t.endAt, acc: 0, act: Date.now() }; t.otDone = { ms: 20 * 6e4, end: mn + 25 * 6e4 };
  const yk = dayKey(new Date(mn - 1)), tk = dayKey(new Date(mn)), b = buildIndex(), y0 = (b[yk] || {}).total || 0, t0v = (b[tk] || {}).total || 0;
  finishPhase('complete');
  const a = buildIndex();
  return { y: Math.round(((a[yk] || {}).total || 0) - y0), t: Math.round(((a[tk] || {}).total || 0) - t0v), dur: Math.round((S.sessions.find(x => +x.end === mn + 25 * 6e4) || { duration: -6e4 }).duration / 6e4) };
});
check('Overtime past midnight: the 45-minute block splits 20 min before midnight and 25 min after, as blocks always have', mid.dur === 45 && mid.y === 20 && mid.t === 25, JSON.stringify(mid));
await A.ev(() => finishPhaseQuiet());
// 9. nothing pops up during overtime; it shows after
await begin();
const q = await A.ev(async () => { window.__shown = 0; const held = holdForFocus('level', 'v120b-test', () => { window.__shown++; }); await new Promise(r => setTimeout(r, 600)); const during = window.__shown; $('#mainBtn').click(); for (let i = 0; i < 48 && !window.__shown; i++) { await new Promise(r => setTimeout(r, 250)); document.querySelectorAll('dialog[open]').forEach(x => x.close()); } return { held, during, after: window.__shown }; });
check('During overtime a pop-up (a level-up) is held by the focus queue and shows after Stop', q.held && q.during === 0 && q.after === 1, JSON.stringify(q));
// 10. Synced timer: off with a note; Focus together: on; the tutorial's demo block: off; the setting off
const modes = await A.ev(() => { const t = S.timer, keep = t.live; finishPhaseQuiet(); t.planned = 25 * 6e4;
  t.live = { mode: 'synced', lid: 'x' }; const syn = otEligible(); renderTimer(); const note = $('#otLine').textContent;
  t.live = { mode: 'together', lid: 'x' }; const tog = otEligible();
  t.live = keep; t.demo = true; const demo = otEligible(); t.demo = false;
  S.settings.overtime = false; const off = otEligible(); S.settings.overtime = true; renderTimer();
  return { syn, note, tog, demo, off }; });
check('A Synced timer has no overtime and says why; Focus together has it; the tutorial’s 1-minute demo block and the setting off have none', !modes.syn && /Overtime is off in a Synced timer/.test(modes.note) && modes.tog && !modes.demo && !modes.off, JSON.stringify(modes));
await A.ev(() => { S.settings.overtime = false; }); await begin();
const offRun = await A.ev(async () => { await new Promise(r => setTimeout(r, 400)); return { ot: !!S.timer.ot, phase: S.timer.phase, dur: Math.round(S.sessions.reduce((a, x) => (!a || +x.end > +a.end ? x : a), null).duration / 6e4) }; });
check('With overtime off the block ends at 0 as before: logged 25 min, on to the break', !offRun.ot && offRun.phase !== 'focus' && offRun.dur === 25, JSON.stringify(offRun));
await A.ev(() => { S.settings.overtime = true; save(); finishPhaseQuiet(); });
// 11. "Turn off overtime" on the display
await begin(); await A.ev(() => otBack(3));
await closeDlg(A); await A.p.click('#otOff'); await wait(900);
const offLink = await A.ev(() => ({ set: S.settings.overtime, dur: Math.round(S.sessions.reduce((a, x) => (!a || +x.end > +a.end ? x : a), null).duration / 6e4), ot: !!S.timer.ot, toast: window.__ts.some(m => /Overtime off/.test(m)) }));
check('"Turn off overtime" switches it off, logs the block so far (25 + 3) and says how to turn it back on', offLink.set === false && offLink.dur === 28 && !offLink.ot && offLink.toast, JSON.stringify(offLink));
// 12. the setting syncs to a second device
const B = await device('B', 1280, {}, { overtime: true });
await B.p.goto(U); await B.p.waitForSelector('#authView:not(.hidden)'); await B.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', NAME); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(B);
const bSet = await B.ev(() => ({ on: otOn(), box: (showTab('settings'), $('#setOvertime').checked) }));
check('The setting is synced: turned off on one device, off on the other', !bSet.on && !bSet.box, JSON.stringify(bSet));
await B.ctx.close(); await wait(1500);   // (close the second device first: its own save after loading would write "off" back — last writer wins)
await A.ev(() => { S.settings.overtime = true; save(); }); await wait(2500);
check('Back on, on this device', await A.ev(() => otOn()));
// 13. the one-time tip: an account from before 1.20, after its first block (never during), once
const tip = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  S.settings.otTip = 0; save(); await sl(1500); { const old = { id: 'old1', name: 'Old', start: OT_RELEASE - 864e5 - 30 * 6e4, end: OT_RELEASE - 864e5, duration: 30 * 6e4, planned: 30 * 6e4 }; S.sessions.unshift(old); cloudAddSessions([old]); await sl(1500); }   // (uploaded: a cloud refresh keeps it)
  window.__ts = []; const t0 = toast; toast = (m, ...a) => { window.__ts.push(String(m)); return t0(m, ...a); };
  finishPhaseQuiet(); S.activePresetId = S.presets.find(p => p.focus === 25).id; startTimer(); S.timer.endAt = Date.now() - 100; await sl(700);
  const during = window.__ts.some(m => /New in 1\.20: Overtime/.test(m));
  window.__tc = []; { const f = otTipAfterBlock; otTipAfterBlock = (...a) => { window.__tc.push([S.settings.otTip, S.sessions.some(x => x && +x.end < OT_RELEASE), FG.q.map(x => x.kind).join()]); return f(...a); }; }
  const seen = async () => { for (let i = 0; i < 48; i++) { if (window.__ts.some(m => /New in 1\.20: Overtime/.test(m))) break; await sl(250); document.querySelectorAll('dialog[open]').forEach(x => x.close()); } };
  $('#mainBtn').click(); await seen();
  const after = window.__ts.filter(m => /New in 1\.20: Overtime/.test(m)).length, stamp = !!S.settings.otTip;
  document.querySelectorAll('dialog[open]').forEach(x => x.close()); await sl(500);
  finishPhaseQuiet(); startTimer(); S.timer.endAt = Date.now() - 100; await sl(700); $('#mainBtn').click(); for (let i = 0; i < 24; i++) { await sl(250); document.querySelectorAll('dialog[open]').forEach(x => x.close()); }
  const again = window.__ts.filter(m => /New in 1\.20: Overtime/.test(m)).length;
  return { during, after, stamp, again, tc: window.__tc, q: FG.q.map(x => x.kind + ':' + x.key) };
});
check('Upgrading accounts get a one-time tip after their first block (not during it), saved to the account so it never repeats', !tip.during && tip.after >= 1 && tip.stamp && tip.again === tip.after /* toast is wrapped more than once in this test: each wrapper records the same toast */, JSON.stringify(tip));
const newAcct = await A.ev(async () => { S.settings.otTip = 0; S.sessions = S.sessions.filter(x => x.end >= OT_RELEASE); window.__ts = []; otTipAfterBlock(true); await new Promise(r => setTimeout(r, 300)); return { tip: window.__ts.some(m => /New in 1\.20/.test(m)), stamp: !!S.settings.otTip }; });
check('A new account gets no tip (the overtime display explains itself), and it is marked as seen', !newAcct.tip && newAcct.stamp, JSON.stringify(newAcct));
// 14. Space stops overtime (the main button)
const pre = await A.ev(() => ({ on: otOn(), set: S.settings.overtime, demo: S.timer.demo }));
await begin(); const mid14 = await A.ev(() => ({ ot: !!S.timer.ot, elig: otEligible(), on: otOn(), ph: S.timer.phase, st: S.timer.status, n: S.sessions.length })); await A.ev(() => { if (S.timer.ot) otBack(2); });
await closeDlg(A); await wait(500); const atKey = await A.ev(() => { window.__log = []; for (const fn of ['finishPhase', 'otStop', 'pauseTimer', 'startTimer']) { const f = window[fn]; window[fn] = (...a) => { window.__log.push(fn + '(' + a.join() + ') ot=' + !!S.timer.ot + ' st=' + S.timer.status + ' ' + new Error().stack.split('\n')[2].trim().slice(0, 80)); return f(...a); }; } showTab('timer'); const st = { dlg: [...document.querySelectorAll('dialog[open]')].map(x => x.id), tour: !$('#tour').classList.contains('hidden'), wrapped: !$('#wrapped').classList.contains('hidden'), ot: !!S.timer.ot, n: S.sessions.length }; document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); return st; }); await wait(900);
const sp = await A.ev(() => ({ ot: !!S.timer.ot, dur: Math.round(S.sessions.reduce((a, x) => (!a || +x.end > +a.end ? x : a), null).duration / 6e4), n: S.sessions.length, st: S.timer.status, ph: S.timer.phase, log: window.__log }));
check('Space in overtime is Stop: logged 25 + 2', !sp.ot && sp.dur === 27, JSON.stringify({ sp, pre, mid14, atKey }));
log('errors', JSON.stringify(errs));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 4)));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
