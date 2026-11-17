// v2.0 phase 6a — intention, debrief, distraction tally, "pick up where you left off" (emulator, two devices, the demo, a phone).
// All of it is private and optional: the intention and the tally ride on the session record (`int`, `dx`), the answer
// lives in users/{uid}.debrief like the focus check-in, nothing new is published, and the setting turns all of it off.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, ownerGet } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const R = Date.now().toString(36).slice(-5), U = 'int_' + R;
async function login(d) {
  await d.p.goto('http://localhost:8000/index.html?emulator=1'); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await d.p.click('[data-mode=login] >> visible=true'); await d.p.fill('#authUser', U); await d.p.fill('#authPass', 'secret12'); await d.p.click('#authSubmit');
  await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(d);
}
// a focus block that ends at 0 and is logged (Overtime off), with the timer left idle
const block = async (d, min = 25) => {
  await d.ev(m => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.settings.overtime = false; const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = m * 60000; }, min);
  await wait(300);
};
const finish = async d => { await d.ev(() => { const t = S.timer; t.focusStartedAt = Date.now() - t.planned; t.dxFor = t.focusStartedAt; t.endAt = Date.now() - 1; }); await wait(1600); };
const A = await device('A', 1280, {}, { overtime: true });
await signup(A, U);
const uid = await A.ev(() => USER.uid);
await A.ev(() => { S.settings.energy = 'off'; $('#nameInput').value = 'Organic chemistry'; onNameChange(); save(); showTab('timer'); });

// ---------- 1. the intention field ----------
const f1 = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), vis = el => !!el && el.getClientRects().length > 0, out = {};
  renderIntent(); out.toggle = vis($('#intToggle')) && $('#intToggle').textContent.trim(); out.edBefore = vis($('#intEd'));
  $('#intToggle').click(); await sl(100); out.ed = vis($('#intEd')) && !vis($('#intToggle')); out.focused = document.activeElement === $('#intInput'); out.label = !!document.querySelector('label[for="intInput"]');
  const inp = $('#intInput'); inp.value = 'Finish Q1–15 and check the answers'; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.blur(); await sl(600);
  out.stored = S.timer.intent; out.max = inp.maxLength;
  return out;
});
await A.p.reload(); await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(1500); await closeDlg(A);
const f2 = await A.ev(() => ({ kept: S.timer.intent, shown: $('#intInput').value, open: $('#intEd').getClientRects().length > 0 }));
check('The Session card offers “+ Add an intention”: one labelled line (“What will done look like…”), kept on this device across a reload',
  /Add an intention/.test(f1.toggle || '') && !f1.edBefore && f1.ed && f1.focused && f1.label && f1.stored === 'Finish Q1–15 and check the answers' && f1.max === 100 && f2.kept === f1.stored && f2.shown === f1.stored && f2.open, JSON.stringify({ f1, f2 }));

// ---------- 2. a block: the tally, the record, the debrief ----------
const idle = await A.ev(() => { showTab('timer'); renderPark(); const shown = $('#dxBtn').getClientRects().length > 0; addDistraction(); return { shown, n: dxNow() }; });
await block(A, 25);
const run = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), bt = $('#dxBtn'), out = { shown: bt.getClientRects().length > 0, label0: bt.getAttribute('aria-label') };
  bt.click(); await sl(100); out.afterTap = [$('#dxN').textContent, bt.getAttribute('aria-label'), !!document.querySelector('dialog[open]'), !!document.querySelector('.toast-item')];
  return out;
});
await A.p.locator('body').press('d'); await wait(200);
const tally = await A.ev(() => ({ n: $('#dxN').textContent, status: S.timer.status }));
await A.ev(() => { const t = S.timer, n = dxNow(); t.focusStartedAt = Date.now() - t.planned; t.dxFor = t.focusStartedAt; t.dx = n; t.endAt = Date.now() - 1; }); await wait(1600);
const logged = await A.ev(() => { const s = S.sessions[S.sessions.length - 1], vis = el => !!el && el.getClientRects().length > 0; return { id: s.id, int: s.int, dx: s.dx, row: vis($('#debriefRow')) && $('#debriefRow').textContent.replace(/\s+/g, ' ').trim(), opts: [...document.querySelectorAll('#debriefRow [data-debrief]')].map(x => x.textContent.trim()), sum: $('#sumHead').textContent, dxAfter: dxNow(), btn: vis($('#dxBtn')) }; });
check('“I got distracted” is there only during a focus block (button, or the key D); a tap counts and nothing else happens (no dialog, no toast), and the count is in the button’s name',
  !idle.shown && idle.n === 0 && run.shown && /Count it/.test(run.label0) && run.afterTap[0] === '1' && /Counted 1 time/.test(run.afterTap[1]) && !run.afterTap[2] && !run.afterTap[3] && tally.n === '2' && tally.status === 'running', JSON.stringify({ idle, run, tally }));
check('The logged block keeps the intention and the tally (int, dx); the after-row asks “How far did you get?” with All of it / Part of it / Not yet and Skip, and the summary names the distractions; the tally starts again at 0',
  logged.int === 'Finish Q1–15 and check the answers' && logged.dx === 2 && /Finish Q1–15 and check the answers/.test(logged.row || '') && /How far did you get\?/.test(logged.row || '') && logged.opts.length === 3 && /Part of it/.test(logged.opts[1]) && /2 distractions/.test(logged.sum) && logged.dxAfter === 0 && !logged.btn, JSON.stringify(logged));
await A.ev(() => document.querySelector('#debriefRow [data-debrief="2"]').click()); await wait(400);
const partly = await A.ev(id => ({ v: S.debrief[id], said: $('#debriefRow').textContent.trim(), intent: S.timer.intent }), logged.id);
await until(A, () => !localEditPending, null, 8000); await wait(1500);
const cloud = await ownerGet('users/' + uid);
const months = await A.ev(async () => { const snap = await FB.getDoc(monthRef(monthKey(Date.now()))); return snap.exists() ? snap.data().sessions.map(s => ({ int: s.int, dx: s.dx })) : []; });
check('“Part of it” is stored for that block, says so kindly, and leaves the intention in place for the next block; the cloud has the answer in users/{uid}.debrief and the block in the month’s log with int and dx',
  partly.v === 2 && /Part of it/.test(partly.said) && partly.intent === logged.int && (cloud.debrief || {})[logged.id] === 2 && months.some(s => s.int === logged.int && s.dx === 2), JSON.stringify({ partly, cloudDebrief: cloud.debrief, months }));
const pub = await ownerGet('publicProfiles/' + uid).catch(() => null), pst = await ownerGet('publicStats/' + uid).catch(() => null);
check('Neither the public profile nor the public stats carry an intention, an answer or a tally', !/Finish Q1|debrief|"int"|"dx"/.test(JSON.stringify(pub || {}) + JSON.stringify(pst || {})), '');

// ---------- 3. history ----------
const hist = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)); S.ui.statsView = 'day'; showTab('stats'); await sl(700);
  const li = [...document.querySelectorAll('#tab-stats li')].find(x => x.querySelector('.intent')), out = { intent: li && li.querySelector('.intent').textContent.replace(/\s+/g, ' ').trim(), title: li && li.querySelector('.intent').title, dx: li && (li.querySelector('.dx-tag') || {}).textContent };
  showTab('timer'); return out;
});
check('The day’s list shows the block’s intention with its answer and the counted distractions', /Finish Q1–15 and check the answers/.test(hist.intent || '') && /◐/.test(hist.intent || '') && /part of it/.test(hist.title || '') && hist.dx === '2×', JSON.stringify(hist));

// ---------- 4. "Yes" clears the intention; the resume card ----------
await block(A, 25); await finish(A);
await A.ev(() => document.querySelector('#debriefRow [data-debrief="1"]').click()); await wait(400);
const yes = await A.ev(() => ({ intent: S.timer.intent, ed: $('#intEd').getClientRects().length > 0, toggle: $('#intToggle').getClientRects().length > 0, last: S.debrief[S.sessions[S.sessions.length - 1].id] }));
const resume = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {}, last = () => S.sessions[S.sessions.length - 1], card = () => $('#resumeSlot .resume');
  hideNote(); renderResume(); out.afterYes = !!card();   // the last block was finished: nothing to pick up
  // a block that was left open, half an hour ago
  S.sessions.push({ id: 'sOpen', name: 'Physics numericals', start: Date.now() - 80 * 60000, end: Date.now() - 30 * 60000, duration: 50 * 60000, planned: 50 * 60000, preset: 'Deep Work 50/10', int: 'Redo the wrong questions', subtasks: [{ t: 'Q4', d: true }, { t: 'Q7', d: false }] });
  S.debrief.sOpen = 3; S.timer.intent = ''; $('#nameInput').value = ''; onNameChange(); renderResume(); await sl(100);
  out.text = card() && card().textContent.replace(/\s+/g, ' ').trim(); out.named = card() && card().getAttribute('aria-label');
  last().end = Date.now() - 5 * 60000; renderResume(); out.tooSoon = !!card();   // straight after the block: its name and intention are still in the card
  last().end = Date.now() - 4 * 864e5; renderResume(); out.tooOld = !!card();
  last().end = Date.now() - 30 * 60000; renderResume();
  document.querySelector('[data-resume-no]').click(); await sl(100); out.dismissed = !card(); out.remembered = S.ui.resumeNo === 'sOpen';
  S.ui.resumeNo = ''; renderResume(); document.querySelector('[data-resume]').click(); await sl(500);
  out.started = { status: S.timer.status, name: $('#nameInput').value, intent: S.timer.intent, subs: subs().map(x => x.t), preset: activePreset().name, card: !!card() };
  S.timer.status = 'idle'; S.timer.endAt = 0; renderTimer();
  return out;
});
check('“Yes” clears the intention (the next block starts clean) and leaves nothing to pick up', yes.intent === '' && !yes.ed && yes.toggle && yes.last === 1 && !resume.afterYes, JSON.stringify(yes));
check('Coming back to a block that was left open (not yet, or subtasks unticked) 20 minutes to 3 days later, the Timer offers “Pick up where you left off” with its name, intention and what is left; “Not now” is remembered; Start runs the timer with the name, intention, open subtasks and preset',
  /Pick up where you left off/.test(resume.text || '') && /Physics numericals/.test(resume.text) && /Redo the wrong questions/.test(resume.text) && /1 subtask left/.test(resume.text) && !!resume.named && !resume.tooSoon && !resume.tooOld && resume.dismissed && resume.remembered &&
  resume.started.status === 'running' && resume.started.name === 'Physics numericals' && resume.started.intent === 'Redo the wrong questions' && resume.started.subs.join() === 'Q7' && resume.started.preset === 'Deep Work 50/10' && !resume.started.card, JSON.stringify(resume));

// ---------- 5. the second device, and the setting ----------
await A.ev(() => { S.sessions = S.sessions.filter(s => s.id !== 'sOpen'); delete S.debrief.sOpen; S.timer.intent = ''; S.timer.subtasks = []; save(); }); await until(A, () => !localEditPending, null, 8000); await wait(1200);
const A2 = await device('A2', 1280, {}, { overtime: true });
await login(A2);
const two = await A2.ev(id => ({ v: S.debrief[id], int: (S.sessions.find(s => s.id === id) || {}).int, dx: (S.sessions.find(s => s.id === id) || {}).dx, intentHere: S.timer.intent || '' }), logged.id);
check('The second device has the block with its intention and tally and the answer; the draft intention is this device’s own', two.v === 2 && two.int === logged.int && two.dx === 2 && two.intentHere === '', JSON.stringify(two));
const off = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), vis = el => !!el && el.getClientRects().length > 0, out = {};
  showTab('settings'); await sl(400); const cb = $('#setIntent'); out.row = !!cb && cb.checked && !!cb.getAttribute('aria-label'); cb.click(); await sl(300); out.stored = S.settings.intent;
  showTab('timer'); S.timer.intent = 'left over'; renderIntent(); renderResume(); out.toggle = vis($('#intToggle')); out.ed = vis($('#intEd'));
  return out;
});
await block(A, 25);
const offRun = await A.ev(() => { addDistraction(); return { btn: $('#dxBtn').getClientRects().length > 0, n: dxNow() }; });
await finish(A);
const offLog = await A.ev(() => { const s = S.sessions[S.sessions.length - 1]; const o = { int: s.int, dx: s.dx, row: $('#debriefRow').getClientRects().length > 0 }; S.settings.intent = true; S.timer.intent = ''; save(); return o; });
check('Settings has “Intention & debrief”; off, there is no field, no counter, no question, and nothing is put on the block', off.row && off.stored === false && !off.toggle && !off.ed && !offRun.btn && offRun.n === 0 && offLog.int === undefined && offLog.dx === undefined && !offLog.row, JSON.stringify({ off, offRun, offLog }));

// ---------- 6. the demo shows it and writes nothing; a phone ----------
async function demo(w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(), net = []; p.on('pageerror', e => errs.push('demo' + w + ': ' + e.message));
  p.on('request', r => { if (/:8080|:9099|googleapis\.com\/(google\.firestore|identitytoolkit)|firestore\.googleapis/.test(r.url())) net.push(r.url().slice(0, 80)); });
  await p.goto('http://localhost:8000/index.html?emulator=1'); await p.waitForSelector('#authView:not(.hidden)'); await wait(700);
  const before = await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))));
  await p.click('#previewBtn'); await p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 15000 }); await wait(2500);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]:not(#pvDlg)').forEach(x => x.close()); closePop(); });
  return { p, net, before, ev: (f, a) => p.evaluate(f, a) };
}
const D = await demo(1280, 900);
const dm = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  { const last = S.sessions[S.sessions.length - 1]; if (Date.now() - last.end < 21 * 60000) last.end = Date.now() - 30 * 60000; }   // the demo's blocks follow the clock: at some minutes of the day its last one has only just ended (in memory only)
  showTab('timer'); renderResume(); await sl(200); out.resume = ($('#resumeSlot .resume') || {}).textContent || '';
  S.ui.statsView = 'day'; showTab('stats'); await sl(700); out.intents = document.querySelectorAll('#tab-stats .intent').length;
  S.ui.statsView = 'week'; showTab('stats'); await sl(700); out.boxes = [...document.querySelectorAll('#energySlot .ins .k')].map(x => x.textContent); out.vals = [...document.querySelectorAll('#energySlot .ins')].filter(x => /Intentions|Distractions/.test(x.textContent)).map(x => x.textContent.replace(/\s+/g, ' ').trim());
  out.n = S.sessions.filter(s => s.int).length; out.ans = Object.keys(S.debrief).length;
  return out;
});
const after = await D.ev(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))));
check('The demo has intentions with answers and a few counted distractions: “Pick up where you left off” on its Timer, and “Intentions” and “Distractions” among its focus insights; nothing is written',
  /Pick up where you left off/.test(dm.resume) && dm.n >= 10 && dm.ans >= 10 && dm.boxes.includes('Intentions') && dm.boxes.includes('Distractions') && /\d+ of \d+ done/.test(dm.vals.join(' ')) && /\d+ in 7 days/.test(dm.vals.join(' ')) && D.net.length === 0 && D.before === after, JSON.stringify({ dm, net: D.net.length }));
const M = await demo(390, 844);
const ph = await M.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  { const last = S.sessions[S.sessions.length - 1]; if (Date.now() - last.end < 21 * 60000) last.end = Date.now() - 30 * 60000; }
  showTab('timer'); renderResume(); await sl(300);
  const c = $('#resumeSlot .resume'); out.card = c && { w: Math.round(c.getBoundingClientRect().width), fits: c.scrollWidth <= c.clientWidth + 1, startH: Math.round(c.querySelector('[data-resume]').getBoundingClientRect().height), noH: Math.round(c.querySelector('[data-resume-no]').getBoundingClientRect().height) };
  out.tog = Math.round($('#intToggle').getBoundingClientRect().height); S.timer.intent = 'Finish the worksheet'; renderIntent(); await sl(100); out.inpH = Math.round($('#intInput').getBoundingClientRect().height); out.clearH = Math.round($('#intClear').getBoundingClientRect().height);
  S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); await sl(400); const bt = $('#dxBtn').getBoundingClientRect(), pk = $('#parkBtn').getBoundingClientRect(); out.dx = { w: Math.round(bt.width), h: Math.round(bt.height), apart: bt.right <= pk.left + 1 || pk.right <= bt.left + 1 };
  out.side = document.documentElement.scrollWidth > innerWidth + 1;
  return out;
});
check('Phone: the resume card fits with 44 px buttons, the intention’s toggle, field and × are 44 px, the distraction button is a 44 px target beside (not over) the parking button, and nothing scrolls sideways',
  !!ph.card && ph.card.fits && ph.card.startH >= 44 && ph.card.noH >= 44 && ph.tog >= 44 && ph.inpH >= 44 && ph.clearH >= 44 && ph.dx.w >= 44 && ph.dx.h >= 44 && ph.dx.apart && !ph.side, JSON.stringify(ph));

log('errors', JSON.stringify(errs.slice(0, 6)));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 4)));
log(failCount() ? `${failCount()} FAILED` : 'ALL PASSED');
await b.close();
process.exit(failCount() ? 1 : 0);
