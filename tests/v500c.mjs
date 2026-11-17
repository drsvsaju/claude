// v2.0 phase 5c — the Calendar where nothing may be written (the demo), on a phone, for a guest, and in True Minimalist.
import { b, wait, log, check, errs, failCount } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function page(w, h = 900, tag = 'p') {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); } catch (e) {} });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(), net = [];
  p.on('pageerror', e => errs.push(tag + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|transport errored|Could not reach Cloud Firestore|offline mode|unavailable/i.test(m.text())) errs.push(tag + ' error: ' + m.text().slice(0, 160)); });
  p.on('request', r => { if (/:8080|:9099|googleapis\.com\/(google\.firestore|identitytoolkit)|firestore\.googleapis/.test(r.url())) net.push(r.method() + ' ' + r.url().slice(0, 80)); });
  await p.goto('http://localhost:8000/index.html?emulator=1'); await p.waitForSelector('#authView:not(.hidden)'); await wait(700);
  return { ctx, p, net, ev: (f, a) => p.evaluate(f, a) };
}
const storage = d => d.ev(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))));
const preview = async d => { await d.p.click('#previewBtn'); await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 15000 }); await wait(2500); await d.ev(() => { document.querySelectorAll('dialog[open]:not(#pvDlg)').forEach(x => x.close()); closePop(); }); };
const guest = async d => { await d.p.click('#guestBtn'); await d.p.waitForSelector('#appView:not(.hidden)'); await wait(2000); for (let i = 0; i < 3; i++) { await d.ev(() => { if ($('#tutDlg') && $('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); }); await wait(500); } };   // the first-run dialogs come one after another

// ---------- 1. the demo: a filled calendar, and nothing written ----------
const DM = await page(1280, 900, 'demo');
const before = await storage(DM);
await preview(DM);
const demo = await DM.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {}, today = startOfDay(new Date());
  S.ui.calView = 'month'; showTab('calendar'); await sl(500); closePop();
  const it = calItems(today, addDays(today, 30)), all = Object.values(it).flat();
  out.kinds = [...new Set(all.map(x => x.kind))].sort(); out.n = all.length; out.allDay = all.some(x => x.kind === 'rem' && x.r.allDay); out.blocks = all.filter(x => x.kind === 'block').length;
  out.chips = document.querySelectorAll('#calBody .cal-chip').length; out.tinted = document.querySelectorAll('#calBody .cal-day.h1, #calBody .cal-day.h2, #calBody .cal-day.h3, #calBody .cal-day.h4').length;
  // planning, moving and deleting ask for an account and change nothing
  const snap = JSON.stringify(S.reminders) + JSON.stringify(S.todos);
  openBlockForm({ date: dayKey(addDays(today, 1)) }); await sl(400); $('#blkTitle').value = 'Demo block'; $('#blockForm').requestSubmit(); await sl(500);
  out.planPrompt = $('#pvDlg').open && $('#pvWhy').textContent; $('#pvDlg').close(); $('#blockDlg').close(); await sl(400);
  const mv = all.find(x => x.move); out.moved = calMove(mv, dayKey(addDays(today, 12))); await sl(400);
  out.movePrompt = $('#pvDlg').open; if ($('#pvDlg').open) $('#pvDlg').close(); await sl(400);
  out.same = snap === JSON.stringify(S.reminders) + JSON.stringify(S.todos);
  // a planned study session you host, joined or asked to be reminded of is on the calendar (in memory only here); someone else's is not
  const at = addDays(today, 2).getTime() + 16 * 3600e3, keep = SESS.lobby;
  SESS.lobby = [...(keep || []), { id: 'L1', title: 'Group study', plan: at, host: USER.uid, members: [USER.uid], pattern: { focus: 25, short: 5, rounds: 2 } }, { id: 'L2', title: 'Not mine', plan: at, host: 'someone', members: ['someone'], pattern: { focus: 25, short: 5, rounds: 2 } }];
  const ss = Object.values(calItems(today, addDays(today, 5))).flat().filter(x => x.kind === 'sess'); out.sess = ss.map(x => [x.title, x.dur, x.move]); SESS.lobby = keep;
  // the other views and the file
  S.ui.calView = 'week'; renderCalendar(); await sl(300); out.week = document.querySelectorAll('#calBody .cal-ev').length;
  S.ui.calView = 'agenda'; renderCalendar(); await sl(300); out.agenda = document.querySelectorAll('#calBody .cal-row').length;
  out.ics = calIcsText().split('BEGIN:VEVENT').length - 1;
  $('#calExport').click(); await sl(400); out.expText = $('#calExpWhat').textContent; $('#calExpDlg').close(); await sl(300);
  S.ui.calView = 'month'; renderCalendar();
  return out;
});
check('The demo’s calendar is filled: reminders (one all day), planned focus blocks, a revision, clan sessions, to-dos and an exam within a month; days with focus are tinted; Week and Agenda have them too',
  ['block', 'clan', 'exam', 'rem', 'rev', 'todo'].every(k => demo.kinds.includes(k)) && demo.allDay && demo.blocks >= 3 && demo.chips >= 8 && demo.tinted >= 7 && demo.week >= 3 && demo.agenda >= 10, JSON.stringify(demo));
check('A planned study session of yours is on the calendar with its length (someone else’s is not). In the demo, planning a block and moving an item ask for an account (“… to plan your study on a calendar”) and change nothing; the export says what it would hold',
  /plan your study on a calendar/.test(demo.planPrompt || '') && demo.sess.length === 1 && demo.sess[0][0] === 'Group study' && demo.sess[0][1] === 55 && demo.sess[0][2] === false && demo.moved === false && demo.movePrompt && demo.same && demo.ics >= 5 && /reminder/.test(demo.expText), JSON.stringify({ plan: demo.planPrompt, sess: demo.sess, moved: demo.moved, same: demo.same, exp: demo.expText }));
// a real drag in the demo
const dbox = sel => DM.ev(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
await DM.ev(() => { const el = $('#calBody'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 150); }); await wait(300);
const src = await dbox('#calBody .cal-chip.mv'), dst = await dbox('#calBody .cal-week:last-child .cal-day:nth-child(4)');
const snap0 = await DM.ev(() => JSON.stringify(S.reminders) + JSON.stringify(S.todos));
await DM.p.mouse.move(src.x, src.y); await DM.p.mouse.down(); await DM.p.mouse.move(src.x + 6, src.y + 9, { steps: 2 }); await DM.p.mouse.move(dst.x, dst.y, { steps: 8 }); await wait(150); await DM.p.mouse.up(); await wait(600);
const dragDemo = await DM.ev(s0 => { const o = { prompt: $('#pvDlg').open, same: s0 === JSON.stringify(S.reminders) + JSON.stringify(S.todos), ghost: !!document.querySelector('.cal-ghost'), dragging: document.body.classList.contains('cal-dragging') }; if ($('#pvDlg').open) $('#pvDlg').close(); return o; }, snap0);
check('…a drag with the mouse too: the account prompt, nothing moved, nothing left on screen', dragDemo.prompt && dragDemo.same && !dragDemo.ghost && !dragDemo.dragging, JSON.stringify(dragDemo));
const after = await storage(DM);
check('Nothing written in the demo: no Firestore or Auth traffic, browser storage unchanged', DM.net.length === 0 && before === after, `requests ${DM.net.length} ${DM.net.slice(0, 3).join(' | ')}`);

// ---------- 2. a phone (the demo account, to look at; nothing is changed) ----------
const PH = await page(390, 844, 'phone');
await preview(PH);
const ph = await PH.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {}, side = () => document.documentElement.scrollWidth > innerWidth + 1;
  $('#navMore').click(); await sl(500); const nb = document.querySelector('#tabs [data-tab="calendar"]'); out.inMore = !!nb && nb.getClientRects().length > 0 && nb.getBoundingClientRect().height >= 44; nb.click(); await sl(600);
  out.tab = S.ui.tab; closePop();
  S.ui.calView = 'month'; renderCalendar(); await sl(300);
  out.seg = [...document.querySelectorAll('#calSeg button')].map(x => x.textContent.trim()); out.segH = Math.min(...[...document.querySelectorAll('#calSeg button')].map(x => x.getBoundingClientRect().height));
  const chip = document.querySelector('#calBody .cal-day .cal-chip'), cs = chip && getComputedStyle(chip); out.dot = chip && [Math.round(chip.getBoundingClientRect().width), Math.round(chip.getBoundingClientRect().height), cs.pointerEvents];
  out.cellW = Math.round(document.querySelector('#calBody .cal-day').getBoundingClientRect().width); out.cellH = Math.round(document.querySelector('#calBody .cal-day').getBoundingClientRect().height); out.sideMonth = side();
  out.bar = ['#calPrev', '#calToday', '#calNext', '#calExport', '#calAdd'].map(s => Math.round($(s).getBoundingClientRect().height));
  return out;
});
// a tap on a day that holds something opens it
const tapDay = await PH.ev(() => { const c = [...document.querySelectorAll('#calBody .cal-day')].find(x => x.querySelector('.cal-chip') && x.dataset.day >= todayKey()); c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, day: c.dataset.day }; });
await wait(300); await PH.p.touchscreen.tap(tapDay.x, tapDay.y); await wait(700);
const ph2 = await PH.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {}, side = () => document.documentElement.scrollWidth > innerWidth + 1;
  out.dayOpen = $('#calDayDlg').open; out.rowH = Math.min(...[...document.querySelectorAll('#calDayList .cal-row')].map(r => r.getBoundingClientRect().height)); out.addH = Math.min(...[...document.querySelectorAll('#calDayAdd button')].map(r => r.getBoundingClientRect().height));
  out.dlgSide = $('#calDayDlg').scrollWidth > $('#calDayDlg').clientWidth + 1; $('#calDayDlg').close(); await sl(400);
  S.ui.calView = 'week'; CAL.anchor = addDays(startOfDay(new Date()), 1); CAL.scroll = null; renderCalendar(); await sl(400);
  out.view = calView(); out.cols = document.querySelectorAll('#calBody .cw-col').length; out.hour = CAL_HOUR; out.evH = [...document.querySelectorAll('#calBody .cal-ev')].map(e => Math.round(e.getBoundingClientRect().height)); out.adH = [...document.querySelectorAll('#calBody .cw-ad .cal-chip')].map(e => Math.round(e.getBoundingClientRect().height)); out.sideDay = side();
  out.title = $('#calTitle').textContent;
  S.ui.calView = 'agenda'; CAL.anchor = startOfDay(new Date()); renderCalendar(); await sl(300);
  out.agH = Math.min(...[...document.querySelectorAll('#calBody .cal-row')].map(r => r.getBoundingClientRect().height)); out.sideAgenda = side(); out.cut = [...document.querySelectorAll('#calBody .cal-row .cr-n')].filter(n => n.getBoundingClientRect().width < 60).length;
  return out;
});
check('Phone: Calendar is in the More list; the views are Month, Day and Agenda; in the Month a day’s items are dots (the day itself is the target, wider than 44 px) and every control of the bar is 44 px',
  ph.inMore && ph.tab === 'calendar' && ph.seg.join() === 'Month,Day,Agenda' && ph.segH >= 44 && !!ph.dot && ph.dot[0] <= 8 && ph.dot[1] <= 8 && ph.dot[2] === 'none' && ph.cellW >= 44 && ph.cellH >= 44 && ph.bar.every(h => h >= 44) && !ph.sideMonth, JSON.stringify(ph));
check('…a tap on a day opens it with rows and add buttons of 44 px; the Day view is one column with taller hours so every timed item is 44 px; Agenda rows are 44 px; nothing scrolls sideways',
  ph2.dayOpen && ph2.rowH >= 44 && ph2.addH >= 44 && !ph2.dlgSide && ph2.view === 'day' && ph2.cols === 1 && ph2.hour === 60 && ph2.evH.length >= 1 && ph2.evH.every(h => h >= 44) && ph2.adH.every(h => h >= 44) && !ph2.sideDay && ph2.agH >= 44 && !ph2.sideAgenda && ph2.cut === 0, JSON.stringify(ph2));

// ---------- 3. a guest on a phone: plans a block, moves it with a finger, and it is still there after a reload ----------
const G = await page(390, 844, 'guest');
await guest(G);
const g1 = await G.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {}, tm = addDays(startOfDay(new Date()), 1);
  S.settings.allDayAt = '23:58';
  S.ui.calView = 'week'; CAL.anchor = tm; showTab('calendar'); await sl(400);
  openBlockForm({ date: dayKey(tm), time: '10:00' }); await sl(400); $('#blkTitle').value = 'Guest block'; $('#blockForm').requestSubmit(); await sl(700);
  const r = S.reminders.find(x => x.title === 'Guest block'); out.saved = r && [r.kind, r.dur > 0, r.time, r.date === dayKey(tm)];
  $('#calScroll').scrollTop = 8.5 * CAL_HOUR; await sl(200);
  const el = document.querySelector('#calBody .cal-ev.k-block'); el.scrollIntoView({ block: 'center' }); await sl(200);
  const b = el.getBoundingClientRect(); out.at = { x: b.left + b.width / 2, y: b.top + 12, hour: CAL_HOUR, id: r.id }; out.clear = !document.querySelector('dialog[open]') && !!document.elementFromPoint(out.at.x, out.at.y).closest('.cal-ev');
  return out;
});
// a finger: hold still for a third of a second, then move one hour down
const cdp = await G.ctx.newCDPSession(G.p), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
await tp('touchStart', g1.at.x, g1.at.y); await wait(480);
const held = await G.ev(() => ({ on: !!(CAL.drag && CAL.drag.on), ghost: !!document.querySelector('.cal-ghost') }));
for (let i = 1; i <= 6; i++) { await tp('touchMove', g1.at.x, g1.at.y + i * g1.at.hour / 6); await wait(40); }
await wait(150); await tp('touchEnd'); await wait(700);
const g2 = await G.ev(id => { const r = S.reminders.find(x => x.id === id); return { time: r.time, toast: (document.querySelector('.toast-item.has-undo') || {}).textContent, dlg: !!document.querySelector('dialog[open]'), stored: /Guest block/.test(localStorage.getItem('pomodorolist-state') || JSON.stringify(Object.values({ ...localStorage }))) }; }, g1.at.id);
await G.p.reload(); await G.p.waitForSelector('#appView:not(.hidden)'); await wait(1800);
const g3 = await G.ev(async () => { const sl = ms => new Promise(r => setTimeout(r, ms)); document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.ui.calView = 'agenda'; showTab('calendar'); await sl(500); const r = S.reminders.find(x => x.title === 'Guest block'); return { tab: S.ui.tab, there: !!r, time: r && r.time, shown: !!document.querySelector('#calBody .cal-row.k-block') }; });
check('A guest plans a block (saved on this device only); a finger held still on it for a moment picks it up, and moving an hour down moves it an hour later (with Undo, no dialog); after a reload it is still on the calendar',
  !!g1.saved && g1.saved[0] === 'block' && g1.saved[1] && g1.saved[2] === '10:00' && g1.saved[3] && g1.clear && held.on && held.ghost && g2.time === '11:00' && /Moved/.test(g2.toast || '') && !g2.dlg && g2.stored && g3.there && g3.time === '11:00' && g3.shown && G.net.length === 0, JSON.stringify({ g1: g1.saved, held, g2, g3, net: G.net.length }));

// ---------- 4. True Minimalist: the calendar stays, the game's dates go ----------
const min = await G.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), ev = EVENTS[EVENTS.length - 1], from = addDays(parseDay(ev.end), -3), to = addDays(parseDay(ev.end), 3), out = {};
  out.withGame = Object.values(calItems(from, to)).flat().some(x => x.kind === 'event');
  S.settings.gamification = false; save(); renderAll(); await sl(500);
  out.minimal = minimal(); out.tabShown = !document.querySelector('#tabs [data-tab="calendar"]').classList.contains('hidden');
  out.without = Object.values(calItems(from, to)).flat().some(x => x.kind === 'event');
  S.ui.calView = 'agenda'; showTab('calendar'); await sl(300); out.tab = S.ui.tab; out.block = !!document.querySelector('#calBody .k-block');
  S.settings.gamification = true; save(); renderAll();
  return out;
});
check('True Minimalist keeps the Calendar and what you planned on it; the day an event or a Study Pass ends is only there with the game on', min.withGame && min.minimal && min.tabShown && !min.without && min.tab === 'calendar' && min.block, JSON.stringify(min));

log('errors', JSON.stringify(errs.slice(0, 6)));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 4)));
log(failCount() ? `${failCount()} FAILED` : 'ALL PASSED');
await b.close();
process.exit(failCount() ? 1 : 0);
