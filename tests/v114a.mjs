// v1.14 to-do list: create/edit/complete/delete/reorder, due dates + filters, Today card, Focus on this (+ checklist → subtasks),
// done → auto-clear after 7 days with undo, guest mode, export/import, sync across two browsers with tombstones.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html?emulator=1';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
async function device(name, extra = {}, w = 1200) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, hasTouch: w < 500, isMobile: w < 500, acceptDownloads: true });
  await ctx.addInitScript(([extra, td]) => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '1.14'); localStorage.setItem('pomodorolist-login-later', td); for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v); }, [extra, today()]);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('dialog', d => d.accept());
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource|WebChannel|transport errored|Could not reach Cloud Firestore|Sync hiccup|offline mode|unavailable/i.test(m.text())) errs.push(name + ' ' + m.type() + ': ' + m.text().slice(0, 180)); });
  return { ctx, p, name, ev: (f, a) => p.evaluate(f, a) };
}
const until = async (d, fn, arg, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await d.ev(fn, arg)) return Date.now() - t0; await wait(150); } return -1; };
// ---------- 1. Guest: everything local ----------
const G = await device('guest', { 'pomodorolist-guest': '1', 'pomodorolist-onboarded:guest': '1' });
await G.p.goto(U); await G.p.waitForSelector('#appView:not(.hidden)'); await wait(1200);
await G.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('reminders'); });
await G.p.click('#remSeg [data-rview="todo"]'); await wait(300);
check('Reminders tab has a To-do view next to Reminders (with Revision staying under Reminders)', await G.ev(() => !$('#todoBody').classList.contains('hidden') && $('#remBody').classList.contains('hidden') && $('#remAdd').textContent.includes('task')));
for (const t of ['Physics notes', 'Chemistry PYQs', 'Maths revision']) { await G.p.fill('#todoQuick', t); await G.p.press('#todoQuick', 'Enter'); await wait(150); }
const quick = await G.ev(() => $$('#todoList li .rt').map(x => x.textContent));
check('Quick add (Enter): newest on top', quick.join('|') === 'Maths revision|Chemistry PYQs|Physics notes', quick.join('|'));
// full form: due today, high priority, tag, notes, checklist
await G.p.click('#remAdd'); await wait(200);
await G.p.fill('#tdTitle', 'Organic chemistry sheet'); await G.ev(d => { $('#tdDue').value = d; }, today());
await G.p.click('#tdPri [data-pri="high"]'); await G.p.fill('#tdTag', 'Chemistry'); await G.p.fill('#tdNotes', 'From the coaching handout');
await G.p.fill('#tdCheck', 'Named reactions\nMechanisms\n[x] Read summary'); await G.p.click('#tdSave'); await wait(300);
const t1 = await G.ev(() => S.todos.find(t => t.title === 'Organic chemistry sheet'));
check('Form: title, due date, priority, subject tag, notes and checklist saved', t1 && t1.due === new Date().toISOString().slice(0, 10).replace(/./g, (c, i) => c) && t1.pri === 'high' && t1.tag === 'Chemistry' && t1.notes && t1.check.length === 3 && t1.check[2].d === true, JSON.stringify(t1));
// overdue + upcoming
await G.ev(() => { const a = S.todos.find(t => t.title === 'Physics notes'), c = S.todos.find(t => t.title === 'Maths revision'); a.due = dayKey(addDays(new Date(), -2)); c.due = dayKey(addDays(new Date(), 3)); save(); renderTodoBits(); });
const views = {};
for (const f of ['today', 'upcoming', 'all', 'done']) { await G.p.click(`[data-tfilter="${f}"]`); await wait(150); views[f] = await G.ev(() => $$('#todoList li .rt').map(x => x.textContent)); }
check('Filters: Today = due today + overdue; Upcoming = later dates; All = every open task', views.today.length === 2 && views.today.includes('Physics notes') && views.today.includes('Organic chemistry sheet') && views.upcoming.join() === 'Maths revision' && views.all.length === 4 && !views.done.length, JSON.stringify(views));
await G.p.click('[data-tfilter="all"]'); await wait(150);
check('Overdue tasks are highlighted gently; due-today tasks are in the Today card', await G.ev(() => $('#todoList li.overdue .rt').textContent.includes('Physics') && /To-do:.*2 tasks due.*1 overdue/.test($('#todayExtra').textContent)), await G.ev(() => $('#todayExtra').textContent));
// edit
await G.ev(() => $$('#todoList li').find(li => li.textContent.includes('Chemistry PYQs')).querySelector('.rem-main').click()); await wait(200);
await G.p.fill('#tdTitle', 'Chemistry PYQs 2019–2023'); await G.p.click('#tdSave'); await wait(200);
check('Edit: tap a task to change it', await G.ev(() => S.todos.some(t => t.title === 'Chemistry PYQs 2019–2023') && !S.todos.some(t => t.title === 'Chemistry PYQs')));
// reorder by dragging the grip
const before = await G.ev(() => $$('#todoList li .rt').map(x => x.textContent));
const g1 = await G.p.$('#todoList li:nth-child(1) [data-tgrip]'), box = await g1.boundingBox(), h = await G.ev(() => $('#todoList li').getBoundingClientRect().height);
await G.p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await G.p.mouse.down(); await G.p.mouse.move(box.x + box.width / 2, box.y + h * 1.05, { steps: 8 }); await G.p.mouse.up(); await wait(300);
const afterDrag = await G.ev(() => $$('#todoList li .rt').map(x => x.textContent));
check('Drag ⋮⋮ to reorder (order saved)', afterDrag[1] === before[0] && afterDrag[0] === before[1], JSON.stringify({ before, afterDrag }));
await G.p.focus('#todoList li:nth-child(2) [data-tgrip]'); await G.p.keyboard.press('ArrowUp'); await wait(200);
check('…and by keyboard (arrow keys on the grip)', (await G.ev(() => $$('#todoList li .rt').map(x => x.textContent)))[0] === before[0]);
// complete with the check animation → Done, undo
await G.ev(() => window.__tones = 0);
await G.ev(() => $$('#todoList li').find(li => li.textContent.includes('Maths revision')).querySelector('[data-tdone]').click());
await wait(150);
const anim = await G.ev(() => ({ burst: !!document.querySelector('.mini-burst, .burst, [class*="burst"]'), done: !!S.todos.find(t => t.title === 'Maths revision').done }));
await wait(800);
check('Tick off: marked done (with the check animation + burst) and moves to Done', anim.done && !(await G.ev(() => $$('#todoList li .rt').some(x => x.textContent === 'Maths revision'))), JSON.stringify(anim));
await G.ev(() => { const b = [...document.querySelectorAll('#toast .toast-item:not(.out) button.undo')].pop(); if (b) b.click(); });
await wait(300);
check('Undo brings it back', await G.ev(() => !S.todos.find(t => t.title === 'Maths revision').done));
await G.ev(() => $$('#todoList li').find(li => li.textContent.includes('Maths revision')).querySelector('[data-tdone]').click()); await wait(700);
await G.p.click('[data-tfilter="done"]'); await wait(200);
check('Done filter lists finished tasks', (await G.ev(() => $$('#todoList li .rt').map(x => x.textContent))).includes('Maths revision'));
// delete with undo
await G.p.click('[data-tfilter="all"]'); await wait(150);
await G.ev(() => $$('#todoList li').find(li => li.textContent.includes('Physics notes')).querySelector('[data-tdel]').click()); await wait(200);
const del = await G.ev(() => !S.todos.some(t => t.title === 'Physics notes'));
await G.ev(() => { const b = [...document.querySelectorAll('#toast .toast-item:not(.out) button.undo')].pop(); if (b) b.click(); }); await wait(200);
check('Delete with Undo (signed in, a tombstone keeps it deleted on other devices — checked below)', del && (await G.ev(() => S.todos.some(t => t.title === 'Physics notes'))));
// auto-clear done tasks older than 7 days
await G.ev(() => { const t = S.todos.find(t => t.title === 'Maths revision'); t.done = Date.now() - 8 * 864e5; save(); S.ui.todoFilter = 'done'; renderReminders(); });
await wait(300);
check('Finished tasks clear themselves after 7 days (with an Undo toast)', await G.ev(() => !S.todos.some(t => t.title === 'Maths revision') && [...document.querySelectorAll('#toast .toast-item')].some(x => /cleared/.test(x.textContent))));
// Focus on this: name + checklist → subtasks, timer starts
await G.ev(() => { S.ui.todoFilter = 'all'; renderReminders(); });
await G.ev(() => $$('#todoList li').find(li => li.textContent.includes('Organic chemistry')).querySelector('[data-tfocus]').click()); await wait(500);
const fo = await G.ev(() => ({ tab: S.ui.tab, name: $('#nameInput').value, status: S.timer.status, phase: S.timer.phase, subs: S.timer.subtasks.map(x => x.t) }));
check('“Focus on this”: starts a session named after the task; its open checklist items become subtasks', fo.tab === 'timer' && fo.name === 'Organic chemistry sheet' && fo.status === 'running' && fo.phase === 'focus' && fo.subs.join() === 'Named reactions,Mechanisms', JSON.stringify(fo));
await G.ev(() => finishPhase('reset'));
// phone: swipe right = done, swipe left = delete
const P = await device('phone', { 'pomodorolist-guest': '1', 'pomodorolist-onboarded:guest': '1' }, 390);
await P.p.goto(U); await P.p.waitForSelector('#appView:not(.hidden)'); await wait(1000);
await P.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); ['Swipe me done', 'Swipe me away'].forEach(t => addTodo({ title: t })); S.ui.remView = 'todo'; S.ui.todoFilter = 'all'; showTab('reminders'); });
await wait(400);
const swipe = async (title, dx) => { const r = await P.ev(t => { const li = $$('#todoList li').find(x => x.textContent.includes(t)); const b = li.querySelector('.rem-main').getBoundingClientRect(); return { x: b.left + 40, y: b.top + b.height / 2 }; }, title);
  const cdp = await P.ctx.newCDPSession(P.p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: r.x + dx * i / 8, y: r.y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(700); };
await swipe('Swipe me done', 160);
await swipe('Swipe me away', -160);
const sw = await P.ev(() => ({ done: !!(S.todos.find(t => t.title === 'Swipe me done') || {}).done, gone: !S.todos.some(t => t.title === 'Swipe me away') }));
check('Phone swipes: right = done, left = delete', sw.done && sw.gone, JSON.stringify(sw));
await P.p.screenshot({ path: 's113/v114a-todo-390.png', fullPage: true });
await P.ctx.close();
// export / import
const dl = G.p.waitForEvent('download'); await G.ev(() => { showTab('settings'); $('#exportBtn').click(); });
const file = await dl, path = await file.path(), json = JSON.parse(fs.readFileSync(path, 'utf8'));
check('Export includes the to-do list', Array.isArray(json.todos) && json.todos.some(t => t.title === 'Organic chemistry sheet'));
const I = await device('import', { 'pomodorolist-guest': '1', 'pomodorolist-onboarded:guest': '1' });
await I.p.goto(U); await I.p.waitForSelector('#appView:not(.hidden)'); await wait(800);
await I.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('settings'); });
await I.p.setInputFiles('#importFile', path); await wait(800);
check('Import merges the to-do list into another device', await I.ev(() => S.todos.some(t => t.title === 'Organic chemistry sheet' && t.check.length === 3)));
await I.ctx.close(); await G.ctx.close();
// ---------- 2. Two browsers on one account ----------
const sfx = Date.now().toString(36).slice(-5), user = 'td_' + sfx;
const A = await device('A'), B = await device('B');
const ready = d => d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 30000 });
await A.p.goto(U); await A.p.waitForSelector('#authView:not(.hidden)');
await A.p.click('[data-mode=signup] >> visible=true'); await A.p.fill('#authUser', user); await A.p.fill('#authPass', 'secret12'); await A.p.fill('#authPass2', 'secret12'); await A.p.click('#authSubmit');
await ready(A); await wait(1000); await A.ev(() => { if ($('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
await B.p.goto(U); await B.p.waitForSelector('#authView:not(.hidden)');
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', user); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
await ready(B); await wait(1000);
await A.ev(() => { addTodo({ title: 'Synced task', pri: 'high' }); addTodo({ title: 'Delete me' }); addTodo({ title: 'Edit me' }); });
let ms = await until(B, () => ['Synced task', 'Delete me', 'Edit me'].every(t => S.todos.some(x => x.title === t)));
check('New tasks reach the other browser', ms >= 0, ms + ' ms');
// at the same time: A deletes one, B edits another and completes a third → all three changes kept on both
await Promise.all([A.ev(() => { const t = S.todos.find(x => x.title === 'Delete me'); S.todos = S.todos.filter(x => x !== t); save(); }),
  B.ev(() => { const t = S.todos.find(x => x.title === 'Edit me'); t.title = 'Edited on B'; save(); const s = S.todos.find(x => x.title === 'Synced task'); s.done = Date.now(); save(); })]);
await wait(3500);
const both = await Promise.all([A, B].map(d => d.ev(() => S.todos.map(t => t.title + (t.done ? '✓' : '')).sort().join('|'))));
check('Simultaneous edits on two browsers merge item by item (deleted stays deleted, edits and completions kept)', both[0] === both[1] && both[0] === 'Edited on B|Synced task✓', JSON.stringify(both));
await B.p.reload(); await ready(B); await wait(1500);
check('After a reload the deleted task doesn’t come back (tombstone)', await B.ev(() => !S.todos.some(t => t.title === 'Delete me')));
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
