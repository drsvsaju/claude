// v2.0 phase 5a — all-day reminders (emulator, two devices of one account, and a phone).
// An all-day reminder has no time of its own: it shows as "All day", leads its day, alerts once at the time chosen in
// Settings (or the first time the app is open after it that day), works with repeats, snooze, done and the
// one-device-rings guard, exports as a dated calendar event, and stays readable for an older version of the app
// (`time` remains a valid HH:MM).
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5), U = 'ad_' + R;
async function login(d) {
  await d.p.goto('http://localhost:8000/index.html?emulator=1'); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await d.p.click('[data-mode=login] >> visible=true'); await d.p.fill('#authUser', U); await d.p.fill('#authPass', 'secret12'); await d.p.click('#authSubmit');
  await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(d);
}
const A = await device('A', 1280, {}, { overtime: true });
await signup(A, U);
const uid = await A.ev(() => USER.uid);
// the alert time far ahead, so nothing rings before the test asks for it (the suites run around midday)
await A.ev(() => { S.settings.allDayAt = '23:58'; save(); });

// ---------- 1. the form ----------
const form = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), vis = el => !!el && el.getClientRects().length > 0, out = {};
  showTab('reminders'); openRemForm(); await sl(300);
  out.timeBefore = vis($('#remTime')); out.leadBefore = vis($('#remBefore')); out.noteBefore = vis($('#remAllNote')) || vis($('#remAllAt')); out.rows0 = $('#remForm .rform').getBoundingClientRect().height;
  $('#remTitle').value = 'Hand in the chemistry record';
  $('#remAllDay').click(); await sl(100);
  out.time = vis($('#remTime')); out.lead = vis($('#remBefore')); out.note = vis($('#remAllNote')) && vis($('#remAllAt')) && $('#remAllAt').textContent;
  out.sameHeight = Math.abs($('#remForm .rform').getBoundingClientRect().height - out.rows0) < 1; out.aligned = Math.abs($('#remDate').getBoundingClientRect().top - $('#remAllNote').getBoundingClientRect().top) < 1;
  $('#remRepeat').value = 'revision'; $('#remRepeat').dispatchEvent(new Event('change', { bubbles: true })); await sl(50);
  out.revision = { toggle: vis($('#remAllDayLbl')), checked: $('#remAllDay').checked, time: vis($('#remTime')) };
  $('#remRepeat').value = 'none'; $('#remRepeat').dispatchEvent(new Event('change', { bubbles: true })); $('#remAllDay').click(); await sl(50);
  $('#remForm').requestSubmit(); await sl(700);
  const r = S.reminders.find(x => x.title === 'Hand in the chemistry record');
  out.saved = r && { allDay: r.allDay, time: r.time, before: r.before, repeat: r.repeat, date: r.date === dayKey(new Date()) };
  // a timed one later today, to compare the order
  S.reminders.push({ id: 'rT' + Date.now(), title: 'Physics at four', date: dayKey(new Date()), time: '23:40', repeat: 'none', days: [], before: 0, presetId: '', session: '', done: {}, snooze: {}, created: Date.now(), updated: Date.now() });
  saveReminders(); await sl(300);
  const rows = [...document.querySelectorAll('#remBody .rem-sec')][0].querySelectorAll('li.rem');
  out.rows = [...rows].map(li => [li.querySelector('.rtime').textContent.trim(), li.querySelector('.rt').textContent.trim(), li.classList.contains('allday'), (li.querySelector('.rs') || {}).textContent.trim()]);
  showTab('timer'); await sl(300);
  out.todayCard = ($('#todayExtra .today-allday') || {}).textContent || '';
  return out;
});
check('The form: “All day” replaces the time and the lead time by what happens instead (when it will alert), in the same places and at the same height; a revision plan keeps its time (no all-day there)',
  form.timeBefore && form.leadBefore && !form.noteBefore && !form.time && !form.lead && /11:58\s*PM|23:58/.test(form.note || '') && form.sameHeight && form.aligned && !form.revision.toggle && !form.revision.checked && form.revision.time, JSON.stringify(form));
check('Saved with allDay and a valid HH:MM in `time` (an older version of the app reads it as an ordinary reminder at that time), no lead time',
  !!form.saved && form.saved.allDay === true && /^([01]\d|2[0-3]):[0-5]\d$/.test(form.saved.time) && form.saved.before === 0 && form.saved.date, JSON.stringify(form.saved));
check('In Today it leads the day, says “All day” where the time is and has no “At the time” in its details; the Today card has an “All day” line',
  form.rows.length === 2 && form.rows[0][0] === 'All day' && form.rows[0][2] === true && !/At the time|min before/.test(form.rows[0][3]) && /At the time/.test(form.rows[1][3]) && /All day:\s*Hand in the chemistry record/.test(form.todayCard), JSON.stringify({ rows: form.rows, card: form.todayCard }));

// ---------- 2. one alert, at the chosen time or on the first open after it ----------
const popOpen = d => d.ev(() => !$('#pomeoPop').classList.contains('hidden') && $('#popText').textContent);
await A.ev(() => checkReminders()); await wait(3500);
const early = await popOpen(A);
await A.ev(() => { S.settings.allDayAt = '00:01'; save(); checkReminders(); });   // "the app is opened hours after the alert time"
const rang = await until(A, () => !$('#pomeoPop').classList.contains('hidden'), null, 8000);
const text = await popOpen(A);
const key = await A.ev(() => Object.keys(S.remFired || {}).find(k => /@allday$/.test(k)) || '');
check('Before the alert time nothing rings; after it (also hours later, the first time the app is open) it rings once: “For today: …”',
  early === false && rang >= 0 && /^For today: Hand in the chemistry record/.test(text || '') && !!key, JSON.stringify({ early, rang, text, key }));
// snooze: rings again when the snooze is over, under its own key
await A.ev(() => $('#popSnooze').click()); await wait(400);
const snoozed = await A.ev(() => { const r = S.reminders.find(x => x.allDay); const v = r.snooze[dayKey(new Date())]; return v > Date.now() + 4 * 60000 && v < Date.now() + 6 * 60000; });
await A.ev(() => checkReminders()); await wait(3200);
const duringSnooze = await popOpen(A);
await A.ev(() => { const r = S.reminders.find(x => x.allDay); r.snooze[dayKey(new Date())] = Date.now() - 1000; save(); checkReminders(); });
const again = await until(A, () => !$('#pomeoPop').classList.contains('hidden'), null, 8000);
check('Snooze: quiet for the five minutes, then it rings again', snoozed && duringSnooze === false && again >= 0, JSON.stringify({ snoozed, duringSnooze, again }));
// changing the alert time after it rang must not ring again; "Dismiss" marks today done
await A.ev(() => { closePop(); const r = S.reminders.find(x => x.allDay); r.snooze = {}; S.settings.allDayAt = '00:02'; save(); checkReminders(); }); await wait(3500);
const reRing = await popOpen(A);
check('Changing the alert time in Settings after it rang does not ring it a second time', reRing === false, String(reRing));

// ---------- 3. the other device: it has the reminder as all-day and stays quiet ----------
await until(A, () => !localEditPending, null, 8000); await wait(1200);
const cloud = await ownerGet('users/' + uid);
const cr = (cloud.reminders || []).find(x => x.title === 'Hand in the chemistry record');
const A2 = await device('A2', 1280, {}, { overtime: true });
await login(A2);
await A2.ev(() => checkReminders()); await wait(4000);
const other = await A2.ev(() => { const r = S.reminders.find(x => x.title === 'Hand in the chemistry record'); showTab('reminders'); return { allDay: r && r.allDay, at: S.settings.allDayAt, pop: !$('#pomeoPop').classList.contains('hidden'), first: (document.querySelector('#remBody li.rem .rtime') || {}).textContent }; });
check('The cloud copy carries allDay and the fired key; the second device shows “All day”, has the alert time from Settings and does not ring it again',
  !!cr && cr.allDay === true && !!(cloud.remFired || {})[key] && other.allDay === true && other.at === '00:02' && other.pop === false && (other.first || '').trim() === 'All day', JSON.stringify({ cr: cr && [cr.allDay, cr.time], fired: !!(cloud.remFired || {})[key], other }));

// ---------- 4. repeats, done, missed ----------
const rep = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {}, today = startOfDay(new Date()), tk = dayKey(today);
  const mk = (id, title, date, repeat, days = []) => ({ id, title, date, time: '08:00', allDay: true, repeat, days, before: 0, presetId: '', session: '', done: {}, snooze: {}, created: Date.now(), updated: Date.now() });
  S.reminders = [mk('rD', 'Daily vocabulary', dayKey(addDays(today, -3)), 'daily'), mk('rY', 'Yesterday’s form', dayKey(addDays(today, -1)), 'none'), mk('rN', 'Today, alert long past', tk, 'none')];
  saveReminders(); showTab('reminders'); await sl(400);
  const sec = n => [...document.querySelectorAll('#remBody .rem-sec')].find(s => s.querySelector('h2').textContent.startsWith(n));
  const rows = s => (s ? [...s.querySelectorAll('li.rem')].map(li => [li.querySelector('.rt').textContent.trim(), li.querySelector('.rtime').textContent.trim(), (li.querySelector('.rs') || {}).textContent.replace(/\s+/g, ' ').trim()]) : []);
  out.today = rows(sec('Today')); out.upcoming = rows(sec('Upcoming'));
  ibRefresh(); out.inbox = IB.filter(x => x.type === 'missed').map(x => [x.title, x.body]); out.todayShort = fmtDayShort(tk);
  // done today: the daily one moves to Completed, tomorrow's stays in Upcoming, and it no longer rings
  markRemDone(S.reminders.find(r => r.id === 'rD'), tk); saveReminders(); await sl(300);
  out.completed = rows(sec('Completed')); out.todayAfter = rows(sec('Today')).map(r => r[0]);
  const before = Object.keys(S.remFired || {}).length; closePop(); checkReminders(); await sl(3200);
  out.rangNow = !$('#pomeoPop').classList.contains('hidden') && $('#popText').textContent;   // "Today, alert long past" is still open: it may ring; the done one must not
  out.next = remNext(S.reminders.find(r => r.id === 'rD'), addDays(today, 1)).day === dayKey(addDays(today, 1));
  closePop();
  return out;
});
check('A daily all-day reminder is in Today and (tomorrow’s) in Upcoming; one left from yesterday is “Missed” and in the inbox; one for today is not missed however long ago its alert time was',
  rep.today.some(r => r[0] === 'Daily vocabulary' && r[1] === 'All day' && /Every day/.test(r[2])) && rep.upcoming.some(r => r[0] === 'Daily vocabulary' && r[1] === 'All day') &&
  rep.today.some(r => r[0] === 'Yesterday’s form' && /^Missed ·/.test(r[2])) && rep.today.some(r => r[0] === 'Today, alert long past' && !/Missed/.test(r[2])) &&
  rep.inbox.some(x => /Yesterday’s form/.test(x[0]) && /All day/.test(x[1])) && !rep.inbox.some(x => /Today, alert long past/.test(x[0]) || x[1].startsWith(rep.todayShort)), JSON.stringify(rep));   // (the daily one's occurrence of yesterday was missed too, like a timed one's: that entry is right)
check('Done for today: it moves to Completed, comes back tomorrow, and the alert that follows is for the one still open, not for it',
  rep.completed.some(r => r[0] === 'Daily vocabulary') && !rep.todayAfter.includes('Daily vocabulary') && rep.next && (rep.rangNow === false || /Today, alert long past/.test(rep.rangNow)), JSON.stringify({ completed: rep.completed, todayAfter: rep.todayAfter, rang: rep.rangNow }));

// ---------- 5. to the calendar: a dated event, not a timed one ----------
const exp = await A.ev(async () => {
  const r = S.reminders.find(x => x.id === 'rD'), out = {}, real = URL.createObjectURL;
  let blob = null; URL.createObjectURL = x => { blob = x; return real.call(URL, x); };
  try { downloadIcs(r); } finally { URL.createObjectURL = real; }
  out.ics = blob ? await blob.text() : '';
  out.google = googleCalUrl(r);
  const t = { id: 'rX', title: 'Timed', date: r.date, time: '16:30', repeat: 'none', days: [], before: 10, presetId: '', session: '' };
  blob = null; URL.createObjectURL = x => { blob = x; return real.call(URL, x); };
  try { downloadIcs(t); } finally { URL.createObjectURL = real; }
  out.timed = blob ? await blob.text() : '';
  out.day = r.date.replace(/-/g, ''); const n = addDays(parseDay(r.date), 1); out.next = `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}`;
  return out;
});
check('.ics and the Google Calendar link: an all-day reminder is a dated event (DTSTART;VALUE=DATE, ending the next day) that keeps its repeat rule; a timed one is unchanged',
  exp.ics.includes(`DTSTART;VALUE=DATE:${exp.day}`) && exp.ics.includes(`DTEND;VALUE=DATE:${exp.next}`) && exp.ics.includes('RRULE:FREQ=DAILY') && !/DTSTART:\d{8}T/.test(exp.ics) &&
  new URL(exp.google).searchParams.get('dates') === `${exp.day}/${exp.next}` && /DTSTART:\d{8}T163000/.test(exp.timed) && exp.timed.includes('TRIGGER:-PT10M'), JSON.stringify({ ics: exp.ics.split('\r\n').filter(l => /^DT|RRULE|TRIGGER/.test(l)), google: exp.google.slice(0, 160) }));

// ---------- 6. the setting, and back to a timed reminder ----------
const set = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  showTab('settings'); await sl(400);
  const el = $('#setAllDayAt'); out.shown = el.value; out.named = !!el.getAttribute('aria-label');
  { const row = el.closest('.setting'), c = el.getBoundingClientRect(), l = row.firstElementChild.getBoundingClientRect(), o = $('#setPomeoTalk').getBoundingClientRect(); out.layout = { ctl: Math.round(c.width), label: Math.round(l.width), row: Math.round(row.getBoundingClientRect().height), aligned: Math.abs(c.right - o.right) < 1.5 }; }   // (the first version let the control take the row: the label wrapped a word a line)
  el.value = '07:30'; el.dispatchEvent(new Event('change', { bubbles: true })); await sl(200);
  out.stored = S.settings.allDayAt;
  el.value = ''; el.dispatchEvent(new Event('change', { bubbles: true })); await sl(100);
  out.afterClear = [S.settings.allDayAt, el.value];
  S.settings.allDayAt = 'nonsense'; out.fallback = allDayAt(); S.settings.allDayAt = '07:30';
  // editing an all-day reminder into a timed one drops the flag (the field is optional, never false)
  const r = S.reminders.find(x => x.id === 'rN'); showTab('reminders'); openRemForm(r); await sl(300);
  out.editChecked = $('#remAllDay').checked; out.note = $('#remAllAt').textContent;
  $('#remAllDay').click(); await sl(50); $('#remTime').value = '17:15'; $('#remForm').requestSubmit(); await sl(600);
  out.after = { has: 'allDay' in r, time: r.time, before: r.before };
  return out;
});
check('Settings has “All-day reminders” with its time (named for screen readers), laid out like its neighbours (the label has the row, the control its own width at the right edge); a new time is stored, an emptied field keeps the time there was, a broken value falls back to 8:00',
  set.shown === '00:02' && set.named && set.layout.ctl <= 200 && set.layout.label >= 200 && set.layout.row <= 90 && set.layout.aligned && set.stored === '07:30' && set.afterClear[0] === '07:30' && set.afterClear[1] === '07:30' && set.fallback === '08:00', JSON.stringify(set));
check('Editing: the form opens with “All day” on and the new alert time in its note; turned off, the reminder is an ordinary timed one again (no allDay field left)',
  set.editChecked === true && /7:30/.test(set.note) && set.after.has === false && set.after.time === '17:15', JSON.stringify({ note: set.note, after: set.after }));

// ---------- 7. a phone: the toggle is a 44 px target and the form does not scroll sideways ----------
const M = await device('M', 390, {}, { overtime: true });
await login(M);
const ph = await M.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  showTab('reminders'); openRemForm(); await sl(400);
  const box = $('#remAllDay'), a = getComputedStyle(box, '::after'), r = box.getBoundingClientRect(), grow = 2 * Math.abs(parseFloat(a.top) || 0);
  $('#remAllDay').click(); await sl(100);
  const dlg = $('#remDlg'), at = $('#remAllAt'), out = { target: Math.round(r.height + grow), sideways: dlg.scrollWidth > dlg.clientWidth + 1, note: at.getBoundingClientRect().width > 200 && at.scrollWidth <= at.clientWidth + 1 };
  dlg.close(); return out;
});
check('Phone: the “All day” box is a 44 px target, the note fits and the form does not scroll sideways', ph.target >= 44 && !ph.sideways && ph.note, JSON.stringify(ph));

log('errors', JSON.stringify(errs.slice(0, 6)));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 4)));
log(failCount() ? `${failCount()} FAILED` : 'ALL PASSED');
await b.close();
process.exit(failCount() ? 1 : 0);
