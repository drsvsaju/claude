// v1.11 reminder/revision sync: two browsers, same account, at the same time.
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
async function device(name) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 800 } });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '9');
    const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|transport errored|Could not reach Cloud Firestore/i.test(m.text())) errs.push(name + ' console: ' + m.text().slice(0, 160)); });
  return { ctx, p, name };
}
const ev = (d, f, a) => d.p.evaluate(f, a);
const ready = d => d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 25000 });
const closeAll = d => ev(d, () => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
const until = async (d, fn, arg, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(d, fn, arg)) return Date.now() - t0; await wait(150); } return -1; };
const sfx = Date.now().toString(36).slice(-5), user = 'sync_' + sfx;
const A = await device('A'), B = await device('B');
await A.p.goto(U); await A.p.waitForSelector('#authView:not(.hidden)');
await A.p.click('[data-mode=signup] >> visible=true'); await A.p.fill('#authUser', user); await A.p.fill('#authPass', 'secret12'); await A.p.fill('#authPass2', 'secret12'); await A.p.click('#authSubmit');
await ready(A); await wait(1200); await ev(A, () => { if ($('#tutDlg').open) finishTutorial(); }); await closeAll(A);
await B.p.goto(U); await B.p.waitForSelector('#authView:not(.hidden)');
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', user); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
await ready(B); await wait(1500); await closeAll(B);

const tomorrow = await ev(A, () => dayKey(addDays(new Date(), 1)));
const has = (d, id) => ev(d, id => S.reminders.some(r => r.id === id), id);
const rem = (d, id) => ev(d, id => S.reminders.find(r => r.id === id) || null, id);
// 1. create (through the real form)
await ev(A, () => { showTab('reminders'); openRemForm(); });
await A.p.fill('#remTitle', 'Physics revision'); await A.p.fill('#remDate', tomorrow); await A.p.fill('#remTime', '18:00');
await ev(A, () => $('#remForm').requestSubmit()); await wait(300);
const r1 = await ev(A, () => (S.reminders.find(r => r.title === 'Physics revision') || {}).id);
let ms = await until(B, id => S.reminders.some(r => r.id === id), r1);
check('create on A → appears on B', ms >= 0, `${ms} ms`);
log('  shown in B\'s Reminders tab:', await ev(B, () => { showTab('reminders'); return $('#tab-reminders').textContent.includes('Physics revision'); }));
// 2. edit on B
await ev(B, id => { const r = S.reminders.find(x => x.id === id); r.title = 'Physics revision (ch. 7)'; save(); renderReminders(); }, r1);
ms = await until(A, id => (S.reminders.find(r => r.id === id) || {}).title === 'Physics revision (ch. 7)', r1);
check('edit on B → updated on A', ms >= 0, `${ms} ms`);
// 3. complete on A
await ev(A, ([id, day]) => { markRemDone(S.reminders.find(x => x.id === id), day); save(); }, [r1, tomorrow]);
ms = await until(B, ([id, day]) => !!((S.reminders.find(r => r.id === id) || {}).done || {})[day], [r1, tomorrow]);
check('complete on A → done on B', ms >= 0, `${ms} ms`);
// 4. snooze on B
await ev(B, ([id, day]) => { const r = S.reminders.find(x => x.id === id); r.snooze = { ...(r.snooze || {}), [day]: Date.now() + 6e5 }; save(); }, [r1, tomorrow]);
ms = await until(A, ([id, day]) => !!((S.reminders.find(r => r.id === id) || {}).snooze || {})[day], [r1, tomorrow]);
check('snooze on B → snoozed on A', ms >= 0, `${ms} ms`);
// 5. delete on A (the real delete) → gone on B
await ev(A, id => deleteReminder(S.reminders.find(x => x.id === id)), r1); await wait(200);
ms = await until(B, id => !S.reminders.some(r => r.id === id), r1);
check('delete on A → gone on B', ms >= 0, `${ms} ms`);
// 6. stale copy: B offline keeps an item that A deletes meanwhile; B edits something else and reconnects
await ev(A, () => { S.reminders.push({ id: 'keepme', title: 'Maths', date: dayKey(addDays(new Date(), 2)), time: '09:00', repeat: 'none', days: [], before: 10 }); save(); });
await until(B, () => S.reminders.some(r => r.id === 'keepme'));
await B.ctx.setOffline(true); await wait(500);
await ev(A, () => deleteReminder(S.reminders.find(x => x.id === 'keepme'))); await wait(1500);
await ev(B, () => { S.reminders.push({ id: 'fromB', title: 'Biology', date: dayKey(addDays(new Date(), 3)), time: '10:00', repeat: 'none', days: [], before: 10 }); save(); });
await wait(1200);
log('  B (offline) still shows the deleted item:', await has(B, 'keepme'));
await B.ctx.setOffline(false);
ms = await until(B, () => !S.reminders.some(r => r.id === 'keepme'), null, 15000);
check('deleted on A while B was offline → stays deleted after B reconnects (B)', ms >= 0, `${ms} ms`);
ms = await until(A, () => S.reminders.some(r => r.id === 'fromB') && !S.reminders.some(r => r.id === 'keepme'), null, 15000);
check('… and A gets B\'s offline addition without the deleted one coming back', ms >= 0, `${ms} ms`);
let cloud; const tc = Date.now(); for (;;) { cloud = await ev(A, async () => { const d = (await FB.getDocFromServer(userRef())).data(); return { ids: d.reminders.map(r => r.id), tomb: Object.keys(d.tomb || {}) }; }); if (!cloud.ids.includes('keepme') || Date.now() - tc > 8000) break; await wait(400); }
log('  cloud copy settled after', Date.now() - tc, 'ms');
check('cloud copy: no deleted items, tombstones present', !cloud.ids.includes('keepme') && !cloud.ids.includes(r1) && cloud.tomb.includes('reminders:keepme'), JSON.stringify(cloud));
// 7. simultaneous adds on both devices
await Promise.all([ev(A, () => { S.reminders.push({ id: 'simA', title: 'A', date: dayKey(addDays(new Date(), 4)), time: '08:00', repeat: 'none', days: [], before: 0 }); save(); }),
  ev(B, () => { S.reminders.push({ id: 'simB', title: 'B', date: dayKey(addDays(new Date(), 4)), time: '08:30', repeat: 'none', days: [], before: 0 }); save(); })]);
const both = () => S.reminders.some(r => r.id === 'simA') && S.reminders.some(r => r.id === 'simB');
check('both devices add at the same moment → both keep both', (await until(A, both, null, 12000)) >= 0 && (await until(B, both, null, 12000)) >= 0);
// 8. revision plans
await ev(A, () => addRevision('Organic chemistry')); await wait(300);
const vid = await ev(A, () => S.revisions.find(v => v.topic === 'Organic chemistry').id);
check('revision created on A → on B', (await until(B, id => S.revisions.some(v => v.id === id), vid)) >= 0);
await ev(B, id => { const v = S.revisions.find(x => x.id === id); v.step = 2; v.log.push({ at: Date.now(), r: 'easy' }); save(); }, vid);
check('revision marked on B → step on A', (await until(A, id => (S.revisions.find(v => v.id === id) || {}).step === 2, vid)) >= 0);
await ev(A, id => { S.revisions = S.revisions.filter(v => v.id !== id); save(); }, vid);
check('revision deleted on A → gone on B', (await until(B, id => !S.revisions.some(v => v.id === id), vid)) >= 0);
// 9. a due reminder rings on one device only
await ev(A, () => { window.__rang = 0; const f = fireReminder; fireReminder = (...a) => { window.__rang++; return f(...a); }; });
await ev(B, () => { window.__rang = 0; const f = fireReminder; fireReminder = (...a) => { window.__rang++; return f(...a); }; });
const due = await ev(A, () => { const now = new Date(Date.now() + 60000); const r = { id: 'due1', title: 'Due now', date: dayKey(now), time: `${pad(now.getHours())}:${pad(now.getMinutes())}`, repeat: 'none', days: [], before: 1 }; S.reminders.push(r); save(); return r.id; });
await until(B, id => S.reminders.some(r => r.id === id), due);
await Promise.all([ev(A, () => checkReminders()), ev(B, () => checkReminders())]);
await wait(9000);
const rangA = await ev(A, () => window.__rang), rangB = await ev(B, () => window.__rang);
check('reminder due on both devices → rang exactly once', rangA + rangB === 1, `A ${rangA}, B ${rangB}`);
await Promise.all([ev(A, () => checkReminders()), ev(B, () => checkReminders())]); await wait(3000);
check('… and not again on the next check', (await ev(A, () => window.__rang)) + (await ev(B, () => window.__rang)) === 1);
// 10. reload B: deleted stay deleted, cache and cloud agree
await B.p.reload(); await ready(B); await wait(2000);
check('after reloading B: deleted items still gone, others there', !(await has(B, 'keepme')) && !(await has(B, r1)) && (await has(B, 'fromB')) && (await has(B, 'simA')));
// 11. foreground re-check pulls from the server
await ev(A, () => { S.exams.push({ id: 'ex1', name: 'JEE Main', date: dayKey(addDays(new Date(), 60)), added: Date.now() }); save(); });
check('exam added on A → on B (exams sync the same way)', (await until(B, () => S.exams.some(x => x.id === 'ex1'))) >= 0);
log('errors', errs, '| failures', fails);
await b.close();
process.exit(fails ? 1 : 0);   // v2.0: a failing check fails the suite (it used to exit 0)
