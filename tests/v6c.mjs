import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html?emulator=1';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [], denied = [];
async function device(name, w = 1100) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); { const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (/permission|denied|Sync error/i.test(m.text())) denied.push(name + ': ' + m.text().slice(0, 160)); });
  p.on('dialog', d => d.accept());
  return { ctx, p, name };
}
const sfx = Date.now().toString(36).slice(-4), user = 'rem_' + sfx;
const A = await device('A'), B = await device('B', 390);
await A.p.goto(U); await A.p.waitForSelector('#authView:not(.hidden)');
await A.p.click('[data-mode=signup] >> visible=true'); await A.p.fill('#authUser', user); await A.p.fill('#authPass', 'secret1'); await A.p.fill('#authPass2', 'secret1'); await A.p.click('#authSubmit');
await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 15000 });
await B.p.goto(U); await B.p.waitForSelector('#authView:not(.hidden)');
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', user); await B.p.fill('#authPass', 'secret1'); await B.p.click('#authSubmit');
await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 15000 });
await wait(1500);
// A creates a reminder via the form, a note and an outfit/settings change
await A.p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); showTab('reminders'); });
await A.p.click('#remAdd'); await A.p.fill('#remTitle', 'Organic chemistry');
await A.p.fill('#remDate', await A.p.evaluate(() => dayKey(addDays(new Date(), 1)))); await A.p.fill('#remTime', '18:30');
await A.p.selectOption('#remRepeat', 'weekly'); await A.p.click('#remDays label:has(input[value="2"]) span'); await A.p.click('#remDays label:has(input[value="4"]) span');
await A.p.click('#remForm button[type=submit]'); await wait(300);
log('A perm card shown after first reminder:', await A.p.evaluate(() => !!$('#permAllow')));
await A.p.evaluate(() => { S.sessions.push({ id: 'sx1', name: 'Chem', start: Date.now() - 30 * 60000, end: Date.now() - 5 * 60000, duration: 25 * 60000, planned: 25 * 60000, preset: 'Classic 25/5' }); cloudAddSessions([S.sessions.at(-1)]); S.notes.sx1 = 'did 20 MCQs'; S.settings.pomeoTalk = 'often'; save(); });
await wait(3000);
log('B sees reminder:', await B.p.evaluate(() => S.reminders.map(r => `${r.title} ${r.repeat} ${r.days}`).join(';')), '| note:', await B.p.evaluate(() => S.notes.sx1), '| talk:', await B.p.evaluate(() => S.settings.pomeoTalk));
// B marks it done for a day, A sees it
await B.p.evaluate(() => { const r = S.reminders[0]; markRemDone(r, '2030-01-01'); saveReminders(); });
await wait(2500);
log('A sees done mark:', await A.p.evaluate(() => Object.keys(S.reminders[0].done).join(',')));
log('stored in users/{uid}:', await A.p.evaluate(async () => { const d = (await FB.getDoc(userRef())).data(); return `reminders=${d.reminders.length} notes=${Object.keys(d.notes).length}`; }));
// reload B: comes back from cache + cloud
await B.p.reload(); await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 15000 }); await wait(800);
log('B after reload:', await B.p.evaluate(() => S.reminders.length));
await B.p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); showTab('reminders'); }); await wait(400);
await B.p.screenshot({ path: 'v6-rem-cloud-phone.png', fullPage: true });
log('errors', errs, '| denied', denied);
await b.close();
