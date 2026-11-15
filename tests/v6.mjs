import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
async function device(name, { w = 390, h = 844, scheme = 'light', touch = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: touch, acceptDownloads: true });
  await ctx.grantPermissions(['notifications'], { origin: 'http://localhost:8000' });
  await ctx.addInitScript(() => {
    localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1');
    { const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); }
    window.__notes = [];
    const N = window.Notification;
    window.Notification = function (t, o) { window.__notes.push(t + ' | ' + (o && o.body)); return { close() {} }; };
    window.Notification.permission = 'granted';
    window.Notification.requestPermission = () => Promise.resolve('granted');
  });
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
const close = d => d.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
async function sessions(d, n, min = 25) {
  for (let i = 0; i < n; i++) {
    await d.p.evaluate(m => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); S.timer.planned = m * 60000; S.timer.focusStartedAt = Date.now() - m * 60000; S.timer.endAt = Date.now() - 1; }, min);
    await wait(500);
  }
}

// ================= guest with history (coins) =================
const A = await device('A');
await A.p.goto(U);
await A.p.evaluate(() => {
  const now = Date.now(), sessions = [];
  for (let d = 1; d <= 30; d++) for (let k = 0; k < 3; k++) { const st = now - d * 864e5 - k * 3600e3; sessions.push({ id: `o${d}_${k}`, name: 'Physics', start: st, end: st + 25 * 60000, duration: 25 * 60000, planned: 25 * 60000, preset: 'Classic 25/5' }); }
  localStorage.setItem('focus-app-v1', JSON.stringify({ sessions }));
  localStorage.setItem('pomodorolist-guest', '1');
});
await A.p.goto(U); await A.p.waitForSelector('#appView:not(.hidden)'); await wait(1500); await close(A);
log('pomeo drawn:', await A.p.evaluate(() => !!$('#pomeoBtn #mascot')), '| mood:', await A.p.getAttribute('#mascot', 'data-state'), '| hello said:', await A.p.evaluate(() => $('#pomeoBubble').textContent));
// tap + hold
await A.p.evaluate(() => hideBubble());
await A.p.click('#pomeoBtn'); await wait(150);
log('tap ->', await A.p.evaluate(() => $('#mascot').className.baseVal), '|', await A.p.textContent('#pomeoBubble'));
const bb = await A.p.locator('#pomeoBtn').boundingBox();
await A.p.mouse.move(bb.x + 20, bb.y + 20); await A.p.mouse.down(); await wait(700);
log('hold ->', await A.p.evaluate(() => $('#mascot').className.baseVal), '| hearts:', await A.p.evaluate(() => $$('.p-heart').length), '|', await A.p.textContent('#pomeoBubble'));
await A.p.screenshot({ path: 'v6-pet.png' });
await A.p.mouse.up(); await wait(100);
log('no tap after hold:', await A.p.evaluate(() => !/r-(wiggle|jump|spin|blush|wink)/.test($('#mascot').className.baseVal)));

// shop: Pomeo outfits
await A.p.click('#coinPill'); await wait(300);
await A.p.click('[data-cat=pomeo]'); await wait(300);
log('pomeo shop items:', await A.p.evaluate(() => $$('#shopView .item').map(i => i.dataset.id).join(',')), '| balance', await A.p.evaluate(() => game().balance));
await A.p.screenshot({ path: 'v6-shop-pomeo.png' });
await A.p.click('[data-buy=hat_grad]'); await wait(400);
await A.p.click('[data-buy=acc_glasses]'); await wait(400);
log('equipped:', await A.p.evaluate(() => equippedId('pomhat') + ' ' + equippedId('pomacc')), '| crown locked:', await A.p.evaluate(() => $('#shopView .item[data-id=hat_crown]').classList.contains('locked')));
await A.p.evaluate(() => showTab('timer')); await wait(300);
log('timer pomeo outfit:', await A.p.evaluate(() => !!$('#mascot .m-hat') && !!$('#mascot .m-acc')));
// profile card
await A.p.evaluate(() => showTab('profile')); await wait(300);
log('profile card:', await A.p.evaluate(() => $('.pomeo-card').textContent.replace(/\s+/g, ' ').trim()));
await A.p.screenshot({ path: 'v6-profile.png' });
await A.p.click('#pomeoOutfit'); await wait(200);
log('change outfit ->', await A.p.evaluate(() => S.ui.tab + '/' + S.ui.shopCat));

// session flow: focus start line, after-session line, note, break line
await A.p.evaluate(() => { S.settings.pomeoTalk = 'often'; showTab('timer'); hideBubble(); });
await sessions(A, 1); await wait(600);
log('after session bubble:', await A.p.textContent('#pomeoBubble'), '| note row:', await A.p.isVisible('#noteRow'));
await A.p.fill('#noteInput', 'finished ch. 5 problems'); await A.p.press('#noteInput', 'Enter'); await wait(200);
const lastId = await A.p.evaluate(() => S.sessions[S.sessions.length - 1].id);
log('note saved:', await A.p.evaluate(id => S.notes[id], lastId), '| row hidden:', !(await A.p.isVisible('#noteRow')));
await wait(5600);
log('break bubble:', await A.p.textContent('#pomeoBubble'));
await A.p.evaluate(() => { S.ui.statsView = 'day'; showTab('stats'); }); await wait(300);
log('note in history:', await A.p.evaluate(() => ($('.sesslist .note') || {}).textContent));
// water nudge after long focus
await A.p.evaluate(() => { showTab('timer'); hideBubble(); PB.q = []; lastWaterNudge = 0; });
await sessions(A, 3, 30); await A.p.evaluate(() => { hideBubble(); PB.q = []; PB.cur = null; lastWaterNudge = 0; pomeoBreakStart(); });
log('water nudge:', await A.p.evaluate(() => $('#pomeoBubble').textContent));
// moods
log('mood after goal met:', await A.p.evaluate(() => { S.timer.phase = 'focus'; S.timer.status = 'idle'; setMascot(); return $('#mascot').dataset.state; }));
log('excited after milestone:', await A.p.evaluate(() => { pomeoExcitedUntil = Date.now() + 1e5; setMascot(); return $('#mascot').dataset.state; }));
await A.p.evaluate(() => { pomeoExcitedUntil = 0; });
// late night: once per night, dismissible
const night = await A.p.evaluate(() => {
  const gh = Date.prototype.getHours; Date.prototype.getHours = function () { return 23; };
  localStorage.removeItem(NIGHT_KEY); hideBubble(); PB.q = [];
  pomeoNightCheck(); const first = $('#pomeoBubble').textContent;
  hideBubble(); pomeoNightCheck(); const second = $('#pomeoBubble').classList.contains('hidden');
  const mood = (setMascot(), $('#mascot').dataset.state);
  Date.prototype.getHours = gh; return { first, secondHidden: second, mood };
});
log('late night:', JSON.stringify(night));
// motion off: only non-moving reactions
await A.p.evaluate(() => { localStorage.setItem(MOTION_KEY, 'off'); applyMotion(); });
const offReacts = await A.p.evaluate(async () => { const s = new Set(); for (let i = 0; i < 12; i++) { pomeoTap(); s.add([...$('#mascot').classList].find(c => c.startsWith('r-'))); } return [...s].join(','); });
log('motion off reactions:', offReacts, '| hearts on pet:', await A.p.evaluate(() => { pomeoPet(); return $$('.p-heart').length; }));
await A.p.evaluate(() => { localStorage.removeItem(MOTION_KEY); applyMotion(); });
// settings: hide pomeo, quiet
await A.p.evaluate(() => showTab('settings')); await wait(200);
await A.p.uncheck('#setPomeo'); await wait(100);
log('pomeo hidden:', await A.p.evaluate(() => $('#pomeoHost').classList.contains('hidden')));
await A.p.check('#setPomeo'); await A.p.selectOption('#setPomeoTalk', 'quiet');
log('quiet: event line suppressed:', await A.p.evaluate(() => { showTab('timer'); hideBubble(); pomeoSay('x', { kind: 'event' }); return $('#pomeoBubble').classList.contains('hidden'); }));
await A.p.evaluate(() => { S.settings.pomeoTalk = 'sometimes'; save(); });

// ================= reminders (guest) =================
await A.p.evaluate(() => showTab('reminders')); await wait(300);
await A.p.screenshot({ path: 'v6-rem-empty.png' });
await A.p.click('#remAdd'); await wait(200);
await A.p.fill('#remTitle', 'Physics revision');
const soon = await A.p.evaluate(() => { const d = new Date(Date.now() + 8 * 60000); return { date: dayKey(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; });
await A.p.fill('#remDate', soon.date); await A.p.fill('#remTime', soon.time);
await A.p.selectOption('#remPreset', 'p-deep'); await A.p.fill('#remSession', 'Physics – Rotation');
await A.p.click('#remForm button[type=submit]'); await wait(800);
log('popup:', await A.p.isVisible('#pomeoPop'), '|', await A.p.textContent('#popText'), '| notification:', await A.p.evaluate(() => window.__notes));
await A.p.screenshot({ path: 'v6-rem-pop.png' });
await A.p.click('#popSnooze'); await wait(200);
log('snoozed:', await A.p.evaluate(() => { const r = S.reminders[0]; return Math.round((Object.values(r.snooze)[0] - Date.now()) / 60000); }), 'min | popup hidden', !(await A.p.isVisible('#pomeoPop')));
// fast-forward snooze
await A.p.evaluate(() => { const r = S.reminders[0]; const k = Object.keys(r.snooze)[0]; r.snooze[k] = Date.now() - 1000; checkReminders(); });
await wait(300);
log('fires again after snooze:', await A.p.isVisible('#pomeoPop'));
await A.p.click('#popStart'); await wait(500);
log('start now:', await A.p.evaluate(() => [S.ui.tab, S.timer.status, activePreset().name, S.timer.name].join(' | ')), '| done:', await A.p.evaluate(() => Object.keys(S.reminders[0].done).length));
await A.p.evaluate(() => { S.timer.status = 'idle'; S.timer.endAt = 0; save(); renderAll(); });
// weekly + daily reminders, lists
await A.p.evaluate(() => {
  const t = new Date(), y = addDays(t, -2);
  S.reminders.push({ id: 'rw', title: 'Maths mock test', date: dayKey(t), time: '23:59', repeat: 'weekly', days: [1, 3, 5], before: 15, presetId: '', session: '', done: {}, snooze: {} });
  S.reminders.push({ id: 'rd', title: 'Chemistry flashcards', date: dayKey(y), time: '06:30', repeat: 'daily', days: [], before: 10, presetId: 'p-classic', session: '', done: {}, snooze: {} });
  S.reminders.push({ id: 'rm', title: 'Old task', date: dayKey(y), time: '10:00', repeat: 'none', days: [], before: 10, presetId: '', session: '', done: {}, snooze: {} });
  S.reminders.push({ id: 'rf', title: 'Biology diagrams', date: dayKey(addDays(t, 3)), time: '17:00', repeat: 'none', days: [], before: 30, presetId: '', session: '', done: {}, snooze: {} });
  save(); showTab('reminders');
});
await wait(300);
const lists = await A.p.evaluate(() => $$('.rem-sec').map(s => s.querySelector('h2').firstChild.textContent + ': ' + $$('.rt', s).map(x => x.textContent).join(', ')));
log('lists:', lists);
log('missed label:', await A.p.evaluate(() => ($('.rem .miss') || {}).textContent));
await A.p.screenshot({ path: 'v6-rem-list.png', fullPage: true });
// done toggle via button, edit via form
await A.p.click('.rem[data-rid=rf] [data-rdone]'); await wait(200);
log('marked done -> completed:', await A.p.evaluate(() => $$('.rem-sec').pop().textContent.includes('Biology')));
await A.p.click('.rem[data-rid=rw] .rem-main'); await wait(200);
log('edit form:', await A.p.evaluate(() => [$('#remDlgTitle').textContent, $('#remTitle').value, $('#remRepeat').value, $$('#remDays input').filter(i => i.checked).map(i => i.value).join('')].join(' | ')));
await A.p.fill('#remTitle', 'Maths mock test (full)'); await A.p.click('#remForm button[type=submit]'); await wait(200);
log('edited:', await A.p.evaluate(() => S.reminders.find(r => r.id === 'rw').title));
// validation
await A.p.click('#remAdd'); await A.p.fill('#remTitle', ''); await A.p.click('#remForm button[type=submit]'); await wait(100);
log('validation:', await A.p.textContent('#remErr')); await close(A);
// calendar
await A.p.click('.rem[data-rid=rw] [data-rcal]'); await wait(200);
const gurl = await A.p.getAttribute('#calGoogle', 'href');
log('google url:', decodeURIComponent(gurl).slice(0, 210));
const [dl] = await Promise.all([A.p.waitForEvent('download'), A.p.click('#calIcs')]);
const ics = fs.readFileSync(await dl.path(), 'utf8');
log('ics file:', dl.suggestedFilename(), '|', ics.split('\r\n').filter(l => /^(DTSTART|RRULE|TRIGGER|SUMMARY)/.test(l)).join(' ; '));
await close(A);
// delete
await A.p.click('.rem[data-rid=rm] [data-rcal]'); await close(A);
await A.p.evaluate(() => deleteReminder(S.reminders.find(r => r.id === 'rm')));
log('deleted:', await A.p.evaluate(() => !S.reminders.some(r => r.id === 'rm')));
// today card
await A.p.evaluate(() => showTab('timer')); await wait(200);
log('today extra:', await A.p.evaluate(() => $('#todayExtra').textContent.replace(/\s+/g, ' ').trim()), '| tip:', await A.p.evaluate(() => $('#tipText').textContent.slice(0, 40)));
log('guest reminders persisted:', await A.p.evaluate(() => JSON.parse(localStorage.getItem('focus-app-v1')).reminders.length));

// ================= phone swipe =================
const T = await device('T', { touch: true });
await T.p.goto(U); await T.p.waitForSelector('#authView:not(.hidden), #appView:not(.hidden)');
if (await T.p.isVisible('#guestBtn')) await T.p.click('#guestBtn');
await wait(800); await close(T);
await T.p.evaluate(() => { const t = dayKey(new Date()); S.reminders = [{ id: 's1', title: 'Swipe me done', date: t, time: '23:58', repeat: 'none', days: [], before: 0, done: {}, snooze: {} }, { id: 's2', title: 'Swipe me away', date: t, time: '23:59', repeat: 'none', days: [], before: 0, done: {}, snooze: {} }]; save(); showTab('reminders'); });
await wait(300);
const swipe = (sel, dx) => T.p.evaluate(([sel, dx]) => {
  const el = document.querySelector(sel + ' .rem-main'), r = el.getBoundingClientRect(), x = r.left + 30, y = r.top + 10;
  const ev = (type, cx) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', clientX: cx, clientY: y, pointerId: 7 }));
  ev('pointerdown', x); for (let i = 1; i <= 6; i++) ev('pointermove', x + dx * i / 6); ev('pointerup', x + dx);
}, [sel, dx]);
await swipe('.rem[data-rid=s1]', 130); await wait(200);
log('swipe right -> done:', await T.p.evaluate(() => Object.keys(S.reminders.find(r => r.id === 's1').done).length === 1));
await swipe('.rem[data-rid=s2]', -130); await wait(200);
log('swipe left -> deleted:', await T.p.evaluate(() => !S.reminders.some(r => r.id === 's2')));

// ================= Liquid Glass screenshots =================
const shots = [['light', 'th_default'], ['dark', 'th_default'], ['light', 'th_paper'], ['dark', 'th_midnight'], ['dark', 'th_starfield'], ['light', 'th_mono']];
await A.p.evaluate(() => showTab('settings'));
await A.p.selectOption('#setGlass', 'full'); await wait(200);
log('glass attr:', await A.p.evaluate(() => document.documentElement.dataset.glass), '| backdrop on card:', await A.p.evaluate(() => getComputedStyle($('.card')).backdropFilter), '| bg layer:', await A.p.evaluate(() => getComputedStyle($('#glassBg')).display));
for (const [scheme, th] of shots) {
  await A.p.emulateMedia({ colorScheme: scheme });
  await A.p.evaluate(th => { S.game.purchases['t_' + th] = { item: th, price: 0, at: 1 }; G = null; S.game.equipped.theme = th; applyCosmetics(); showTab('timer'); window.scrollTo(0, 0); }, th);
  await wait(700);
  await A.p.screenshot({ path: `v6-glass-${scheme}-${th}.png` });
}
// contrast check: text vs effective card colour (sampled from screenshot is complex; compare computed colours)
await A.p.selectOption('#setGlass', 'lite').catch(() => {});
await A.p.evaluate(() => { writeLS(GLASS_KEY, 'lite'); applyGlass(); });
log('lite blur:', await A.p.evaluate(() => getComputedStyle($('.card')).backdropFilter));
await A.p.evaluate(() => { writeLS(GLASS_KEY, 'off'); applyGlass(); });
log('off:', await A.p.evaluate(() => document.documentElement.dataset.glass || 'none'));
log('errors', errs);
await b.close();
