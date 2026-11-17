// v2.0 phase 5b — the Calendar on a signed-up account (emulator).
// Wiring (sidebar, key C, palette), the Month grid (items of every kind in their day, "+N more", focus tint), the day
// dialog and the keyboard, dragging to another day (with Undo), the Week (positions, overlap, drag over empty hours to
// plan a block, drag a block to move it), a planned block's alert starting the timer with its preset, the Agenda, the
// calendar file, the past (a repeat's old days only where it was done) and the cloud copy.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, focus, ownerGet } from './cl-common.mjs';
const A = await device('A', 1280, {}, { overtime: true });
const U = 'cal_' + Date.now().toString(36).slice(-5);
await signup(A, U);
const uid = await A.ev(() => USER.uid);
await A.ev(() => { S.settings.allDayAt = '23:58'; save(); });   // nothing rings on its own during the test

// ---------- data: everything on days 10–16 of next month, so the test does not depend on today's date ----------
const D = await A.ev(() => {
  const n = new Date(), base = new Date(n.getFullYear(), n.getMonth() + 1, 10), d = i => dayKey(addDays(base, i)), now = Date.now();
  const rem = (id, title, date, time, x = {}) => ({ id, title, date, time, repeat: 'none', days: [], before: 10, presetId: '', session: '', done: {}, snooze: {}, created: now, updated: now, ...x });
  S.reminders = [
    rem('rT', 'Timed physics', d(0), '16:30'),
    rem('rA', 'All-day form', d(1), '08:00', { allDay: true, before: 0 }),
    rem('rB', 'Block chem', d(1), '17:00', { kind: 'block', dur: 50, presetId: 'p-deep', session: 'Block chem', before: 5 }),
    rem('rB2', 'Block overlap', d(1), '17:15', { kind: 'block', dur: 30, presetId: 'p-classic', session: 'Block overlap', before: 5 }),
    rem('rW', 'Weekly mock', d(-7), '09:30', { repeat: 'weekly', days: [parseDay(d(2)).getDay()] }),
    rem('rM', 'Fifth thing', d(4), '07:00'),
  ];
  const todo = (id, title, due, done = 0) => ({ id, title, due, pri: 'med', tag: '', notes: '', check: [], done, order: 0, created: now });
  S.todos = [todo('t1', 'Todo due', d(3)), todo('t2', 'Todo finished', d(3), now), ...[1, 2, 3, 4].map(i => todo('tm' + i, 'Busy day ' + i, d(4)))];
  S.exams = [{ id: 'x1', name: 'Mock exam', date: d(5), added: now }];
  save();
  return { d: [-7, 0, 1, 2, 3, 4, 5, 6, 8].reduce((o, i) => ({ ...o, [i]: d(i) }), {}), base: dayKey(base), month: base.toLocaleDateString([], { month: 'long', year: 'numeric' }) };
});
const d = i => D.d[i];
const toNext = () => A.ev(k => { CAL.anchor = parseDay(k); CAL.focus = ''; CAL.scroll = null; renderCalendar(); window.scrollTo(0, 0); }, D.base);

// ---------- 1. wiring ----------
await A.ev(() => showTab('timer')); await A.p.locator('body').press('c'); await wait(500);
const wire = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), btn = document.querySelector('#tabs [data-tab="calendar"]'), grp = btn && btn.closest('.nv-grp'), out = {};
  out.tab = S.ui.tab; out.active = btn && btn.classList.contains('active'); out.group = grp && grp.querySelector('.nv-h').textContent; out.afterReminders = btn && btn.previousElementSibling && btn.previousElementSibling.dataset.tab;
  out.h1 = ($('#tab-calendar h1') || {}).textContent; out.label = NAV_LABEL.calendar; out.sheet = /<kbd>C<\/kbd><span>Calendar/.test($('#keysDlg').innerHTML);
  $('#cmdBtn').click(); await sl(500); const inp = document.querySelector('#cmdDlg input, #cmdInput'); if (inp) { inp.value = 'calen'; inp.dispatchEvent(new Event('input', { bubbles: true })); await sl(300); }
  out.palette = [...document.querySelectorAll('#cmdList li')].some(li => /Calendar/.test(li.textContent)); document.querySelectorAll('dialog[open]').forEach(x => x.close());
  return out;
});
check('Calendar is a section of its own: in the sidebar under Focus after Reminders, opened by the key C, in the command palette and on the shortcut sheet, with its heading',
  wire.tab === 'calendar' && wire.active && wire.group === 'Focus' && wire.afterReminders === 'reminders' && wire.h1 === 'Calendar' && wire.label === 'Calendar' && wire.sheet && wire.palette, JSON.stringify(wire));

// ---------- 2. Month ----------
await A.ev(() => { S.ui.calView = 'month'; }); await toNext(); await wait(400);
const month = await A.ev(dd => {
  const cell = k => document.querySelector(`#calBody .cal-day[data-day="${k}"]`), chips = k => [...cell(k).querySelectorAll('.cal-chip')].map(c => [[...c.classList].find(x => x.startsWith('k-')), c.textContent.trim(), c.classList.contains('done'), c.classList.contains('mv')]);
  const out = { title: $('#calTitle').textContent, cells: document.querySelectorAll('#calBody .cal-day').length, heads: [...document.querySelectorAll('#calBody .cal-wd span')].map(s => s.textContent), role: $('#calBody .cal-month').getAttribute('role') };
  out.d0 = chips(dd[0]); out.d1 = chips(dd[1]); out.d2 = chips(dd[2]); out.d3 = chips(dd[3]); out.d4 = chips(dd[4]); out.more = (cell(dd[4]).querySelector('.cd-more') || {}).textContent; out.d5 = chips(dd[5]);
  out.label = cell(dd[1]).getAttribute('aria-label'); out.tabstops = document.querySelectorAll('#calBody .cal-day[tabindex="0"]').length; out.chipTab = [...document.querySelectorAll('#calBody .cal-chip')].every(c => c.tabIndex === -1);
  // an everyday thing (a daily reminder) comes after what is particular to the day, drawn quietly, and never pushes a particular thing into "+N more"
  S.reminders.push({ id: 'rEvery', title: 'Everyday habit', date: dd[-7], time: '06:00', repeat: 'daily', days: [], before: 0, presetId: '', session: '', done: {}, snooze: {}, created: Date.now(), updated: Date.now() }); renderCalendar();
  out.rt0 = chips(dd[0]).map(c => c[1]); out.rtCls = [...cell(dd[0]).querySelectorAll('.cal-chip')].map(c => c.classList.contains('rt')); out.rt1 = chips(dd[1]).map(c => c[1]); out.rt1more = (cell(dd[1]).querySelector('.cd-more') || {}).textContent;
  S.reminders = S.reminders.filter(r => r.id !== 'rEvery'); renderCalendar();
  S.settings.weekStart = 0; renderCalendar(); out.sunFirst = document.querySelector('#calBody .cal-wd span').textContent; S.settings.weekStart = 1; renderCalendar();
  return out;
}, D.d);
check('Month: a grid of whole weeks that starts on the chosen first day of the week, with the month as its title',
  month.title === D.month && [35, 42].includes(month.cells) && month.heads[0] === 'Mon' && month.sunFirst === 'Sun' && month.role === 'grid', JSON.stringify({ title: month.title, cells: month.cells, heads: month.heads, sun: month.sunFirst }));
check('…every kind sits in its day: a timed reminder with its time, an all-day one before the day’s blocks, a weekly one on its weekday, to-dos (a finished one struck through), an exam; a full day shows two and “+N more”',
  month.d0.length === 1 && month.d0[0][0] === 'k-rem' && /^4:30pm\s*Timed physics$/.test(month.d0[0][1]) &&
  month.d1.length === 3 && month.d1[0][1] === 'All-day form' && month.d1[1][0] === 'k-block' && /^5pm\s*Block chem$/.test(month.d1[1][1]) &&
  month.d2.some(c => /Weekly mock/.test(c[1]) && c[3] === false) && month.d3.length === 2 && month.d3.every(c => c[0] === 'k-todo') && month.d3.some(c => c[2]) &&
  month.d4.length === 2 && month.more === '+3 more' && month.d5[0][0] === 'k-exam', JSON.stringify(month));
check('…an everyday thing (a daily reminder) comes after what is particular to the day and is marked quiet; on a full day it is the one that goes under “+N more”',
  month.rt0.length === 2 && /Timed physics/.test(month.rt0[0]) && /Everyday habit/.test(month.rt0[1]) && month.rtCls.join() === 'false,true' && month.rt1.length === 2 && !month.rt1.some(t => /Everyday/.test(t)) && month.rt1more === '+2 more', JSON.stringify({ d0: month.rt0, cls: month.rtCls, d1: month.rt1, more: month.rt1more }));
check('…a day says what it holds to a screen reader, the grid is one tab stop (arrow keys move inside it) and chips are not extra stops',
  /All-day form|3 items/.test(month.label) && /3 items/.test(month.label) && month.tabstops === 1 && month.chipTab, JSON.stringify({ label: month.label, stops: month.tabstops }));

// ---------- 3. the day dialog and the keyboard ----------
const key = async k => { await A.p.keyboard.press(k); await wait(180); };
await A.ev(k => calFocusDay(k), d(0)); await wait(200);
await key('ArrowRight'); const k1 = await A.ev(() => document.activeElement.dataset.day);
await key('ArrowDown'); const k2 = await A.ev(() => document.activeElement.dataset.day);
await key('ArrowUp'); await key('Enter'); await wait(500);
const dayDlg = await A.ev(() => ({ open: $('#calDayDlg').open, title: $('#calDayTitle').textContent, rows: [...document.querySelectorAll('#calDayList .cal-row')].map(r => r.querySelector('.cr-t').textContent + '|' + r.querySelector('.cr-n').textContent + '|' + r.querySelector('.cr-k').textContent), add: !$('#calDayAdd').classList.contains('hidden'), names: [...document.querySelectorAll('#calDayList .cal-row')].every(r => (r.getAttribute('aria-label') || '').length > 8) }));
await key('Escape'); await wait(700);
const back = await A.ev(() => ({ day: document.activeElement.dataset.day, cls: document.activeElement.className }));
await key('PageDown'); await wait(300);
const paged = await A.ev(() => ({ title: $('#calTitle').textContent, day: document.activeElement.dataset.day }));
check('Keyboard: arrows move day by day and week by week, Enter opens the day (everything in it, each row named, and what can be added), Escape returns to that day, Page Down turns to the next month',
  k1 === d(1) && k2 === d(8) && dayDlg.open && dayDlg.rows.length === 3 && dayDlg.rows[0].startsWith('All day|All-day form') && /Focus block · 50m/.test(dayDlg.rows[1]) && dayDlg.add && dayDlg.names && back.day === d(1) && paged.title !== D.month && !!paged.day, JSON.stringify({ k1, k2, dayDlg, back, paged }));
const past = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), y = dayKey(addDays(startOfDay(new Date()), -1));
  calOpenDay(y); await sl(300); const out = { add: !$('#calDayAdd').classList.contains('hidden'), text: $('#calDayList').textContent.trim() }; $('#calDayDlg').close(); await sl(400);
  // a day's add buttons open the right form on that day
  const k = dayKey(addDays(startOfDay(new Date()), 2));
  calOpenDay(k); await sl(300); document.querySelector('#calDayDlg [data-caladd="rem"]').click(); await sl(400); out.rem = $('#remDlg').open && $('#remDate').value === k; $('#remDlg').close(); await sl(400);
  calOpenDay(k); await sl(300); document.querySelector('#calDayDlg [data-caladd="todo"]').click(); await sl(400); out.todo = $('#todoDlg').open && $('#tdDue').value === k; $('#todoDlg').close(); await sl(400);
  calOpenDay(k); await sl(300); document.querySelector('#calDayDlg [data-caladd="exam"]').click(); await sl(400); out.exam = $('#examDlg').open && $('#examDate').value === k; $('#examDlg').close(); await sl(400);
  calOpenDay(k); await sl(300); document.querySelector('#calDayDlg [data-caladd="block"]').click(); await sl(400); out.block = $('#blockDlg').open && $('#blkDate').value === k; $('#blockDlg').close(); await sl(400);
  return out;
});
check('A day that is over opens without “add”; on a day ahead, Reminder / To-do / Exam / Focus block each open their form on that day', !past.add && past.rem && past.todo && past.exam && past.block, JSON.stringify(past));

// ---------- 4. dragging to another day (Month) ----------
const box = sel => A.ev(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, left: r.left, w: r.width, h: r.height }; }, sel);
const drag = async (from, to) => { await A.p.mouse.move(from.x, from.y); await A.p.mouse.down(); await A.p.mouse.move(from.x + 5, from.y + 9, { steps: 2 }); await A.p.mouse.move(to.x, to.y, { steps: 8 }); await wait(150); await A.p.mouse.up(); await wait(600); };
await toNext(); await A.ev(() => { const el = $('#calBody'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 150); }); await wait(300);
await drag(await box(`#calBody .cal-day[data-day="${d(3)}"] .cal-chip.k-todo:not(.done)`), await box(`#calBody .cal-day[data-day="${d(6)}"]`));
const mv1 = await A.ev(() => ({ due: S.todos.find(t => t.id === 't1').due, toast: (document.querySelector('.toast-item.has-undo') || {}).textContent, dlg: !!document.querySelector('dialog[open]') }));
await A.ev(() => document.querySelector('.toast-item.has-undo .undo').click()); await wait(500);
const undone = await A.ev(() => S.todos.find(t => t.id === 't1').due);
await drag(await box(`#calBody .cal-day[data-day="${d(0)}"] .cal-chip.k-rem`), await box(`#calBody .cal-day[data-day="${d(2)}"]`));
const mv2 = await A.ev(() => { const r = S.reminders.find(x => x.id === 'rT'); return { date: r.date, time: r.time, dlg: !!document.querySelector('dialog[open]') }; });
// a click that is not a drag opens the item
await A.p.mouse.click((await box(`#calBody .cal-day[data-day="${d(5)}"] .cal-chip`)).x, (await box(`#calBody .cal-day[data-day="${d(5)}"] .cal-chip`)).y); await wait(500);
const clickOpens = await A.ev(() => { const o = $('#examDlg').open; document.querySelectorAll('dialog[open]').forEach(x => x.close()); return o; }); await wait(400);
check('Dragging a to-do to another day changes its due date, says so with Undo, and Undo puts it back; a timed reminder keeps its time on its new day; nothing opens at the end of a drag, and a plain click still opens the item',
  mv1.due === d(6) && /is now due/.test(mv1.toast || '') && !mv1.dlg && undone === d(3) && mv2.date === d(2) && mv2.time === '16:30' && !mv2.dlg && clickOpens, JSON.stringify({ mv1, undone, mv2, clickOpens }));

// ---------- 5. Week: positions, overlap, drag to plan, drag to move ----------
await A.ev(k => { S.ui.calView = 'week'; CAL.anchor = parseDay(k); CAL.scroll = null; renderCalendar(); }, d(1)); await wait(400);
const W = await A.ev(() => [...document.querySelectorAll('#calBody .cw-col')].map(c => c.dataset.day));   // the seven days of that week
const free = W.filter(k => k !== d(1)), wa = free[1], wb = free[2];   // two neighbouring days whose afternoons are empty
const week = await A.ev(dd => {
  const ev = id => document.querySelector(`#calBody .cal-ev[data-cal^="${id}@"]`), g = e => ({ top: parseFloat(e.style.top), h: parseFloat(e.style.height), left: e.getBoundingClientRect().left, w: e.getBoundingClientRect().width });
  const colW = document.querySelector(`#calBody .cw-col[data-day="${dd[1]}"]`).getBoundingClientRect().width;
  return { view: calView(), cols: document.querySelectorAll('#calBody .cw-col').length, hour: CAL_HOUR, b: g(ev('block:rB')), b2: g(ev('block:rB2')), colW, allDay: [...document.querySelectorAll(`#calBody .cw-ad[data-day="${dd[1]}"] .cal-chip`)].map(c => c.textContent.trim()),
    weekly: !!ev('rem:rW'), todoLane: document.querySelectorAll('#calBody .cw-ad .k-todo').length, todoWant: S.todos.filter(t => t.due && !!document.querySelector(`#calBody .cw-ad[data-day="${t.due}"]`)).length, scrolled: $('#calScroll').scrollTop > 0, title: $('#calTitle').textContent };
}, D.d);
check('Week: seven columns of hours; a block sits at its time with its length, two that overlap share the column side by side, all-day things are in the all-day row, and the hours open near the first item',
  week.view === 'week' && week.cols === 7 && Math.abs(week.b.top - 17 * week.hour) < 1 && Math.abs(week.b.h - (50 / 60 * week.hour - 2)) < 1 && Math.abs(week.b2.top - 17.25 * week.hour) < 1 &&
  week.b.w < week.colW * 0.55 && week.b2.w < week.colW * 0.55 && Math.abs(week.b.left - week.b2.left) > 20 && week.allDay.join() === 'All-day form' && week.weekly && week.todoLane === week.todoWant && week.scrolled, JSON.stringify(week));
// drag over empty hours of a day of that week: 14:00 → 15:30
await A.ev(() => { $('#calScroll').scrollTop = 12.5 * CAL_HOUR; const el = $('#calScroll'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 200); }); await wait(300);
const col3 = await box(`#calBody .cw-col[data-day="${wa}"]`), H = week.hour;
await drag({ x: col3.x, y: col3.top + 14 * H + 3 }, { x: col3.x, y: col3.top + 15.5 * H - 3 });
const planned = await A.ev(() => ({ open: $('#blockDlg').open, date: $('#blkDate').value, time: $('#blkTime').value, dur: $('#blkDur').value, title: $('#blockDlgTitle').textContent }));
await A.ev(() => { $('#blkTitle').value = 'Dragged block'; $('#blockForm').requestSubmit(); }); await wait(700);
const made = await A.ev(() => { const r = S.reminders.find(x => x.title === 'Dragged block'); return r && { id: r.id, kind: r.kind, dur: r.dur, date: r.date, time: r.time, repeat: r.repeat, session: r.session, presetOk: S.presets.some(p => p.id === r.presetId), shown: !!document.querySelector(`#calBody .cal-ev[data-cal^="block:${r.id}@"]`) }; });
check('Dragging over empty hours plans a focus block there: the form opens with that day, start and length (in quarter hours); saved, it is a reminder with kind “block”, a length and a preset, and it is on the grid',
  planned.open && planned.date === wa && planned.time === '14:00' && planned.dur === '90' && !!made && made.kind === 'block' && made.dur === 90 && made.date === wa && made.time === '14:00' && made.repeat === 'none' && made.session === 'Dragged block' && made.presetOk && made.shown, JSON.stringify({ planned, made }));
// drag it one column right and one hour down (the grab point stays where it was taken)
const evb = await box(`#calBody .cal-ev[data-cal^="block:${made.id}@"]`), col4 = await box(`#calBody .cw-col[data-day="${wb}"]`);
await drag({ x: evb.x, y: evb.top + 6 }, { x: col4.x, y: evb.top + 6 + H });
const moved = await A.ev(id => { const r = S.reminders.find(x => x.id === id); return { date: r.date, time: r.time, toast: (document.querySelector('.toast-item.has-undo') || {}).textContent }; }, made.id);
// a click on an empty hour plans a block at that half hour
await A.p.mouse.click(col3.x, col3.top + 13 * H + 30); await wait(500);
const clicked = await A.ev(() => { const o = { open: $('#blockDlg').open, time: $('#blkTime').value, date: $('#blkDate').value }; $('#blockDlg').close(); return o; }); await wait(400);
check('Dragging the block to another column and an hour lower moves it to that day and time (Undo offered); a click on an empty hour opens the form at that half hour',
  moved.date === wb && moved.time === '15:00' && /Moved/.test(moved.toast || '') && clicked.open && clicked.date === wa && clicked.time === '13:30', JSON.stringify({ moved, clicked }));
// a block in the Reminders list says what it is, and its edit opens the block form
const inList = await A.ev(async id => {
  const sl = ms => new Promise(r => setTimeout(r, ms)); S.ui.remView = 'rem'; showTab('reminders'); await sl(400);
  const li = document.querySelector(`#remBody li.rem[data-rid="${id}"]`), out = { meta: li && li.querySelector('.rs').textContent.replace(/\s+/g, ' ').trim() };
  openRemForm(S.reminders.find(x => x.id === id)); await sl(400); out.form = $('#blockDlg').open && !$('#remDlg').open && $('#blkTitle').value === 'Dragged block' && $('#blkDur').value === '90' && !$('#blkDelete').classList.contains('hidden') && !$('#blkCal').classList.contains('hidden');
  $('#blkCal').click(); await sl(500); out.cal = $('#calDlg').open && !$('#blockDlg').open && $('#calName').textContent === 'Dragged block' && /calendar\.google\.com/.test($('#calGoogle').href) && /dates=\d{8}T\d{6}%2F\d{8}T\d{6}/.test($('#calGoogle').href); $('#calDlg').close(); await sl(300);
  showTab('calendar'); return out;
}, made.id);
check('In Reminders the block says “Focus block · 1h 30m” and editing it opens the block form (with Delete); its “Add to calendar” gives the single-event file and a Google Calendar link with the block’s start and end', /Focus block · 1h 30m/.test(inList.meta || '') && inList.form && inList.cal, JSON.stringify(inList));

// ---------- 6. Agenda ----------
await A.ev(k => { S.ui.calView = 'agenda'; CAL.anchor = parseDay(k); renderCalendar(); }, d(0)); await wait(300);
const ag = await A.ev(async dd => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), days = [...document.querySelectorAll('#calBody .ag-day')];
  const out = { days: days.length, first: days[0] && days[0].querySelector('.ag-d').textContent.replace(/\s+/g, ' ').trim(), rows: [...document.querySelectorAll('#calBody .cal-row')].slice(0, 5).map(r => r.querySelector('.cr-t').textContent + '|' + r.querySelector('.cr-n').textContent), sorted: true, buttons: [...document.querySelectorAll('#calBody .cal-row')].every(r => r.tagName === 'BUTTON' && r.tabIndex === 0) };
  const row = [...document.querySelectorAll('#calBody .cal-row.k-todo')].find(r => /Todo due/.test(r.textContent)); row.click(); await sl(400);
  out.todoOpens = $('#todoDlg').open && $('#tdTitle').value === 'Todo due'; $('#todoDlg').close(); await sl(300);
  return out;
}, D.d);
check('Agenda: the days that hold something, in order, as rows that are ordinary buttons; a to-do’s row opens the to-do', ag.days >= 5 && ag.buttons && ag.todoOpens && ag.rows.length === 5, JSON.stringify(ag));

// ---------- 7. the calendar file ----------
const ics = await A.ev(() => {
  S.reminders.push({ id: 'rLong', title: 'A very long title that will certainly not fit in the seventy-five bytes one line may have', date: dayKey(addDays(startOfDay(new Date()), 3)), time: '10:00', repeat: 'none', days: [], before: 0, presetId: '', session: '', done: {}, snooze: {}, created: Date.now(), updated: Date.now() });
  S.reminders.push({ id: 'rOld', title: 'Long ago', date: dayKey(addDays(startOfDay(new Date()), -9)), time: '10:00', repeat: 'none', days: [], before: 0, presetId: '', session: '', done: {}, snooze: {}, created: Date.now(), updated: Date.now() });
  const t = calIcsText(), lines = t.split('\r\n'), unfolded = t.replace(/\r\n /g, ''), n = s => unfolded.split(s).length - 1, want = calExportList();
  const blk = /BEGIN:VEVENT\r\nUID:([^\r]+)[^]*?END:VEVENT/g, ev = {}; let m; while ((m = blk.exec(unfolded))) ev[m[1].split('@')[0]] = m[0];
  const out = { events: n('BEGIN:VEVENT'), want: want.rems.length + want.todos.length + want.exams.length, max: Math.max(...lines.map(l => l.length)), wrapped: unfolded.includes('SUMMARY:A very long title that will certainly not fit in the seventy-five bytes one line may have'),
    old: /Long ago/.test(t), doneTodo: /Todo finished/.test(t), todo: /SUMMARY:To-do: Todo due/.test(unfolded), exam: /SUMMARY:Exam: Mock exam/.test(unfolded), allDay: /DTSTART;VALUE=DATE:\d{8}\r\nDTEND;VALUE=DATE:\d{8}\r\nSUMMARY:All-day form/.test(unfolded),
    block: (ev.rB || '').match(/DTSTART:\d{8}T(\d{6})\r\nDTEND:\d{8}T(\d{6})/), weekly: /RRULE:FREQ=WEEKLY;BYDAY=/.test(ev.rW || ''), head: lines[0] === 'BEGIN:VCALENDAR' && lines.includes('END:VCALENDAR') };
  S.reminders = S.reminders.filter(r => r.id !== 'rLong' && r.id !== 'rOld'); save();
  return out;
});
check('Export: one file with every reminder and block still ahead, open to-dos with a due date and exams (nothing old, nothing done); all-day things are dated events, a block ends after its length, a repeat keeps its rule, and no line is longer than 75 characters (a long title is folded and reads the same unfolded)',
  ics.events === ics.want && ics.events >= 10 && ics.max <= 75 && ics.wrapped && !ics.old && !ics.doneTodo && ics.todo && ics.exam && ics.allDay && !!ics.block && ics.block[1] === '170000' && ics.block[2] === '175000' && ics.weekly && ics.head, JSON.stringify({ ...ics, block: ics.block && ics.block.slice(1) }));

// ---------- 8. the past, the focus tint, the cloud copy ----------
await A.ev(() => { S.settings.overtime = false; });   // a block that ends at 0, so the 30 minutes are logged
await focus(A, 30); await wait(1500); await closeDlg(A);
await A.ev(() => { const t = S.timer; if (t.status !== 'idle') { t.status = 'idle'; t.endAt = 0; } t.phase = 'focus'; renderTimer(); });   // the timer free again for the last check
const hist = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), today = startOfDay(new Date()), k = i => dayKey(addDays(today, i));
  S.reminders.push({ id: 'rDaily', title: 'Daily habit', date: k(-5), time: '07:00', repeat: 'daily', days: [], before: 0, presetId: '', session: '', done: { [k(-2)]: Date.now() }, snooze: {}, created: Date.now(), updated: Date.now() });
  S.reminders.push({ id: 'rMissed', title: 'One-off, missed', date: k(-3), time: '07:00', repeat: 'none', days: [], before: 0, presetId: '', session: '', done: {}, snooze: {}, created: Date.now(), updated: Date.now() });
  save();
  const it = calItems(addDays(today, -5), addDays(today, 1)), out = { past: Object.entries(it).filter(([d]) => d < k(0)).map(([d, l]) => [d === k(-2) ? -2 : d === k(-3) ? -3 : d, l.map(x => x.title + (x.done ? ' ✓' : ''))]), today: (it[k(0)] || []).map(x => x.title), tomorrow: (it[k(1)] || []).map(x => x.title) };
  S.ui.calView = 'month'; CAL.anchor = today; CAL.focus = ''; showTab('calendar'); renderCalendar(); await sl(300);
  const cell = document.querySelector('#calBody .cal-day.today'); out.cell = cell && { heat: [...cell.classList].find(c => /^h\d$/.test(c)), focus: (cell.querySelector('.cd-f .f-l') || {}).textContent, short: (cell.querySelector('.cd-f .f-s') || {}).textContent, label: cell.getAttribute('aria-label'), isToday: cell.dataset.day === k(0) };
  out.tintDiffers = getComputedStyle(cell).backgroundColor !== getComputedStyle(document.querySelector('#calBody .cal-day.h0') || document.body).backgroundColor;
  return out;
});
check('The past keeps what happened: a daily reminder’s old days show only where it was done, a one-off that was missed stays on its day; today and tomorrow have the daily one',
  hist.past.length === 2 && hist.past.some(p => p[0] === -2 && p[1].join() === 'Daily habit ✓') && hist.past.some(p => p[0] === -3 && p[1].join() === 'One-off, missed') && hist.today.includes('Daily habit') && hist.tomorrow.includes('Daily habit'), JSON.stringify(hist.past));
check('A day’s focus tints it (deeper with the time, by the daily goal) and is written on it and said in its name', !!hist.cell && hist.cell.isToday && /^h[1-4]$/.test(hist.cell.heat) && hist.cell.focus === '30m' && hist.cell.short === '30m' && /30m of focus/.test(hist.cell.label) && hist.tintDiffers, JSON.stringify(hist.cell));
await until(A, () => !localEditPending, null, 8000); await wait(1500);
const cloud = await ownerGet('users/' + uid);
const cb = (cloud.reminders || []).find(r => r.title === 'Dragged block');
check('The cloud copy holds the block as a reminder with kind, dur and a valid time (an older version of the app shows an ordinary reminder); nothing new is stored for the calendar itself',
  !!cb && cb.kind === 'block' && cb.dur === 90 && /^\d\d:\d\d$/.test(cb.time) && cb.repeat === 'none' && !('calendar' in cloud) && !Object.keys(cloud).some(k => /^cal/i.test(k)), JSON.stringify(cb && { kind: cb.kind, dur: cb.dur, time: cb.time }));

// ---------- 9. a planned block's alert starts the timer with its preset and name ----------
const start = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), n = new Date(Date.now() - 60000);
  closePop();
  S.reminders = [{ id: 'rNow', title: 'Block now', session: 'Block now', date: dayKey(n), time: `${pad(n.getHours())}:${pad(n.getMinutes())}`, repeat: 'none', days: [], before: 0, presetId: 'p-deep', kind: 'block', dur: 50, done: {}, snooze: {}, created: Date.now(), updated: Date.now() }];
  S.activePresetId = 'p-classic'; save(); checkReminders();
  for (let i = 0; i < 40 && $('#pomeoPop').classList.contains('hidden'); i++) await sl(200);
  const out = { pop: !$('#pomeoPop').classList.contains('hidden') && $('#popText').textContent };
  $('#popStart').click(); await sl(600);
  Object.assign(out, { tab: S.ui.tab, status: S.timer.status, preset: S.activePresetId, name: $('#nameInput').value, done: !!S.reminders[0].done[dayKey(n)] });
  return out;
});
check('When a planned block is due its reminder comes up, and “Start now” opens the timer running, with the block’s preset and its name',
  /Block now/.test(start.pop || '') && start.tab === 'timer' && start.status === 'running' && start.preset === 'p-deep' && start.name === 'Block now' && start.done, JSON.stringify(start));

log('errors', JSON.stringify(errs.slice(0, 6)));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 4)));
log(failCount() ? `${failCount()} FAILED` : 'ALL PASSED');
await b.close();
process.exit(failCount() ? 1 : 0);
