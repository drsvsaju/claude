import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [], denied = [];
async function device(name, { w = 1280, h = 900, scheme = 'light', touch = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: touch });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (/permission|denied|Sync error|insufficient/i.test(m.text())) denied.push(name + ': ' + m.text().slice(0, 160)); });
  p.on('dialog', d => d.accept());
  p.toasts = [];
  await p.exposeFunction('__toast', m => p.toasts.push(m));
  await p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('toast-item') && window.__toast(n.textContent)))).observe(document.getElementById('toast'), { childList: true })); });
  return { ctx, p, name };
}
const close = async d => { await d.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await wait(350); };
const guest = async d => { await d.p.goto('http://localhost:8000/index.html'); await d.p.click('#guestBtn'); await d.p.waitForSelector('#appView:not(.hidden)'); await wait(1300); await close(d); };
const finish = (d, min = 25) => d.p.evaluate(m => { S.timer.planned = m * 60000; S.timer.focusStartedAt = Date.now() - m * 60000; S.timer.endAt = Date.now() - 1; }, min);
const sesslist = d => d.p.evaluate(() => $$('#subEdList .tx').map(x => x.textContent).join(' | '));

const A = await device('A');
await guest(A);
log('collapsed by default:', await A.p.evaluate(() => $('#subEd').classList.contains('hidden') && $('#subToggle').textContent), '| checklist hidden:', await A.p.evaluate(() => $('#subCheck').classList.contains('hidden')));
await A.p.screenshot({ path: 'v8-timer-clean.png' });
await A.p.fill('#nameInput', 'Physics – Rotation');
await A.p.click('#subToggle'); await wait(100);
for (const t of ['Read ch. 5 notes', 'Solve Q1–10', 'Revise formulas', 'Check answers']) { await A.p.fill('#subInput', t); await A.p.press('#subInput', 'Enter'); }
log('added:', await sesslist(A), '| input keeps focus:', await A.p.evaluate(() => document.activeElement.id));
// edit by tapping
await A.p.click('#subEdList li:nth-child(4) .tx'); await A.p.keyboard.press('Control+A'); await A.p.keyboard.type('Check answers & mark errors'); await A.p.keyboard.press('Enter'); await wait(100);
// delete with ✕
await A.p.click('#subEdList li:nth-child(4) [data-del]'); await wait(100);
log('edit + delete:', await sesslist(A));
// drag the first item below the second by its grip
const g = await A.p.locator('#subEdList li:nth-child(1) .grip').boundingBox();
await A.p.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await A.p.mouse.down();
for (let i = 1; i <= 8; i++) await A.p.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + i * 7);
await A.p.mouse.up(); await wait(100);
log('after drag:', await sesslist(A));
await A.p.focus('#subEdList li:nth-child(2) .grip'); await A.p.keyboard.press('ArrowUp'); await wait(100);
log('arrow key reorder:', await sesslist(A));
// limit 10
const lim = await A.p.evaluate(() => { for (let i = 0; i < 12; i++) addSub('extra ' + i); const n = subs().length; S.timer.subtasks = subs().slice(0, 3); renderSubtasks(); return n; });
log('max:', lim, '| toast:', A.p.toasts.filter(t => /Up to 10/.test(t)).length > 0);
await A.p.screenshot({ path: 'v8-editor.png' });
// session with checklist
await A.p.click('#mainBtn'); await wait(300);
log('checklist:', await A.p.evaluate(() => $('#subN').textContent + ' | ' + $$('#subCheckList .tx').map(x => x.textContent).join(', ')));
await A.p.click('#subCheckList li:first-child label'); await wait(300);
log('tick 1 → bottom:', await A.p.evaluate(() => $$('#subCheckList li').map(li => (li.classList.contains('done') ? '✓' : '○') + li.querySelector('.tx').textContent).join(', ')), '|', await A.p.textContent('#subN'), '| check drawn:', await A.p.evaluate(() => !!$('#subCheckList li.done .ok-check')));
await A.p.screenshot({ path: 'v8-ticking.png' });
await A.p.click('body', { position: { x: 5, y: 500 } });
await A.p.keyboard.press('t'); await wait(150);
log('T quick add:', await A.p.evaluate(() => document.activeElement.id));
await A.p.keyboard.type('Make summary card'); await A.p.keyboard.press('Enter'); await A.p.keyboard.press('Escape');
await A.p.evaluate(() => document.activeElement.blur());
await A.p.keyboard.press('1'); await wait(150);
log('key 1 ticks:', await A.p.textContent('#subN'), '| tab still', await A.p.evaluate(() => S.ui.tab));
await A.p.keyboard.press('Shift+Digit4'); await wait(200); log('Shift+4 →', await A.p.evaluate(() => S.ui.tab));
await A.p.keyboard.press('Shift+Digit1'); await wait(300);
await A.p.evaluate(() => hideBubble());
await A.p.keyboard.press('1'); await wait(100);
await A.p.keyboard.press('1'); await wait(400);
log('all done:', await A.p.textContent('#subN'), '| pomeo:', await A.p.evaluate(() => $('#pomeoBubble').textContent), '| timer still:', await A.p.evaluate(() => S.timer.status));
await A.p.screenshot({ path: 'v8-alldone.png' });
await A.p.keyboard.press('1'); await wait(100);   // untick one so the summary has a leftover
log('untick:', await A.p.textContent('#subN'));
const bal0 = await A.p.evaluate(() => game().balance);
await finish(A); await wait(1200); await close(A);
log('summary:', await A.p.evaluate(() => $('#subSum').innerText.replace(/\s+/g, ' ').trim()), '| toast:', A.p.toasts.filter(t => /XP/.test(t)).pop());
log('coins gained:', await A.p.evaluate(() => game().balance) - bal0, '(5 session + 3 subtasks + any goal/achievement bonus)');
log('record:', await A.p.evaluate(() => JSON.stringify(S.sessions.at(-1).subtasks)), '| draft cleared:', await A.p.evaluate(() => subs().length));
await A.p.screenshot({ path: 'v8-summary.png' });
await A.p.click('[data-sleft="carry"]'); await wait(200);
log('carried over:', await A.p.evaluate(() => subs().map(x => x.t).join(', ')), '| checklist shows:', await A.p.isVisible('#subCheck'));
// turn into a reminder (second session)
await A.p.evaluate(() => { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); }); await wait(100);
await finish(A); await wait(1200); await close(A);
await A.p.click('[data-sleft-rem="0"]'); await wait(200);
log('reminder form:', await A.p.evaluate(() => $('#remDlg').open + ' "' + $('#remTitle').value + '"'));
await close(A);
// history
await A.p.evaluate(() => { S.ui.statsView = 'day'; statsOffset = 0; showTab('stats'); }); await wait(400);
log('history:', await A.p.evaluate(() => $$('.subdet summary').map(x => x.closest('.nm').firstChild.textContent + ' · ' + x.textContent).join(' | ')));
log('stats tile:', await A.p.evaluate(() => $('#subStatSlot').innerText.replace(/\s+/g, ' ').trim()));
await close(A);   // the level-up celebration held during the block is released on the Stats tab
await A.p.click('.subdet summary'); await wait(100);
await A.p.screenshot({ path: 'v8-history.png' });
// daily cap
const cap = await A.p.evaluate(() => { const today = dayKey(new Date()); const before = Math.min(10, subtaskCoinsByDay()[today] || 0); const now = Date.now(); S.sessions.push({ id: 'cap1', name: 'Cap', start: now - 1800e3, end: now - 60e3, duration: 25 * 60000, planned: 25 * 60000, preset: '', subtasks: Array.from({ length: 10 }, (_, i) => ({ t: 'x' + i, d: true })) }); G = null; const raw = subtaskCoinsByDay()[today]; return `raw ${raw} subtasks today → ${Math.min(10, raw)} coins (was ${before})`; });
log('daily cap:', cap);
// templates
await A.p.evaluate(() => { showTab('timer'); S.timer.subtasks = []; loadItems(['Warm-up: 5 easy problems', 'Timed set of 10', 'Review mistakes']); });
await A.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await wait(250);   // the cap step can level up: its pop-up would cover the button
await A.p.click('#tplSaveOpen'); await A.p.fill('#tplName', 'Daily maths routine'); await A.p.press('#tplName', 'Enter'); await wait(150);
await A.p.evaluate(() => { S.timer.subtasks = []; renderSubtasks(); });
log('template chips:', await A.p.evaluate(() => $$('#subTpls .chip-t').map(c => c.textContent).join(', ')));
await A.p.click('#subTpls [data-tpl]'); await wait(150);
log('loaded template:', await sesslist(A));
await A.p.click('#tplManage'); await wait(150);
log('templates dialog:', await A.p.evaluate(() => $$('#tplList li').length));
await close(A);
// recurring: reuse a session name
await A.p.evaluate(() => { S.timer.subtasks = []; subOpen = false; $('#nameInput').value = ''; onNameChange(); });
await A.p.fill('#nameInput', 'Physics – Rotation'); await wait(150);
log('reuse offer:', await A.p.evaluate(() => !$('#subLast').classList.contains('hidden') && $('#subLast').innerText.replace(/\s+/g, ' ')));
await A.p.click('#subLoadLast'); await wait(150);
log('loaded last:', await A.p.evaluate(() => subs().map(x => x.t + (x.d ? '✓' : '')).join(', ')));
// sessions without subtasks are unchanged
await A.p.evaluate(() => { S.timer.subtasks = []; renderSubtasks(); $('#nameInput').value = 'Plain'; onNameChange(); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); });
await finish(A); await wait(1000); await close(A);
log('plain session:', await A.p.evaluate(() => { const s = S.sessions.at(-1); return s.name + ' has subtasks field: ' + ('subtasks' in s) + ' | summary hidden: ' + $('#subSum').classList.contains('hidden'); }));
log('guest persisted:', await A.p.evaluate(() => { const d = JSON.parse(localStorage.getItem('focus-app-v1')); return `templates ${d.subTemplates.length}, sessions with subtasks ${d.sessions.filter(s => s.subtasks).length}`; }));
// motion off
await A.p.evaluate(() => { localStorage.setItem(MOTION_KEY, 'off'); applyMotion(); loadItems(['a', 'b']); toggleSub(subs()[0].id); });
log('motion off check anim:', await A.p.evaluate(() => getComputedStyle($('#subCheckList li.done .ok-check path')).animationName));
await A.p.evaluate(() => { localStorage.removeItem(MOTION_KEY); applyMotion(); });

// ================= phone: swipe delete, dark + glass look =================
const P = await device('P', { w: 390, h: 844, scheme: 'dark', touch: true });
await P.ctx.addInitScript(() => localStorage.setItem('pomodorolist-glass', 'full'));
await guest(P);
await P.p.evaluate(() => { $('#nameInput').value = 'Chemistry'; onNameChange(); loadItems(['Read ch. 3 notes', 'Solve Q1–10', 'Revise formulas']); });
await wait(200);
await P.p.evaluate(() => { const el = $('#subEdList li:nth-child(2) .tx'), r = el.getBoundingClientRect(), x = r.left + 40, y = r.top + 8;
  const ev = (t, cx) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: 'touch', clientX: cx, clientY: y, pointerId: 3 }));
  ev('pointerdown', x); for (let i = 1; i <= 6; i++) ev('pointermove', x - i * 22); ev('pointerup', x - 132); });
await wait(150);
log('phone swipe delete:', await sesslist(P));
await P.p.evaluate(() => { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); toggleSub(subs()[0].id); });
await wait(500); await P.p.evaluate(() => window.scrollTo(0, 120)); await wait(200);
await P.p.screenshot({ path: 'v8-phone-dark-glass.png' });

// ================= cloud: stored with the session, synced =================
const sfx = Date.now().toString(36).slice(-4);
const C = await device('C', { w: 1100 }), C2 = await device('C2', { w: 1100 });
const U = 'http://localhost:8000/index.html?emulator=1';
await C.p.goto(U); await C.p.waitForSelector('#authView:not(.hidden)');
await C.p.click('[data-mode=signup] >> visible=true'); await C.p.fill('#authUser', 'subs_' + sfx); await C.p.fill('#authPass', 'secret1'); await C.p.fill('#authPass2', 'secret1'); await C.p.click('#authSubmit');
await C.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 15000 }); await wait(1500); await close(C);
await C.p.evaluate(() => { $('#nameInput').value = 'Biology'; onNameChange(); loadItems(['Diagram of heart', 'NCERT ch. 18']); toggleSub(subs()[0].id); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); });
await finish(C); await wait(1200); await close(C);
await C.p.evaluate(() => { S.timer.subtasks = []; loadItems(['x', 'y']); $('#tplName').value = 'Bio set'; saveTemplate(); });
await wait(2500);
log('cloud month doc:', await C.p.evaluate(async () => { const qs = await FB.getDocs(FB.collection(FB.db, 'users', USER.uid, 'months')); const ss = qs.docs.flatMap(d => d.data().sessions); return JSON.stringify(ss.map(s => s.subtasks)); }));
await C2.p.goto(U); await C2.p.waitForSelector('#authView:not(.hidden)');
await C2.p.click('[data-mode=login] >> visible=true'); await C2.p.fill('#authUser', 'subs_' + sfx); await C2.p.fill('#authPass', 'secret1'); await C2.p.click('#authSubmit');
await C2.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 15000 }); await wait(2000);
log('other device:', await C2.p.evaluate(() => `${S.sessions.at(-1).name} ${S.sessions.at(-1).subtasks.filter(x => x.d).length}/${S.sessions.at(-1).subtasks.length} · templates: ${S.subTemplates.map(t => t.name)}`));
log('friends see (activity doc keys):', await C.p.evaluate(() => Object.keys(activityDoc().recent[0] || {}).join(',')));
log('errors', errs, '| denied', denied);
await b.close();
