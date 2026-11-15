import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, colorScheme: 'dark' }); await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-glass', 'full'); });
const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8000/index.html'); await p.click('#guestBtn'); await p.waitForTimeout(900);
await p.evaluate(() => { const t = dayKey(new Date()); S.reminders = [{ id: 'a', title: 'Physics revision', date: t, time: '21:00', repeat: 'daily', days: [], before: 10, presetId: 'p-deep', session: '', done: {}, snooze: {} }, { id: 'b', title: 'Maths mock test', date: dayKey(addDays(new Date(), 2)), time: '09:30', repeat: 'none', days: [], before: 30, done: {}, snooze: {} }]; save(); showTab('reminders'); });
await p.waitForTimeout(600); await p.screenshot({ path: 'v6-desk-rem-glass.png' });
await p.evaluate(() => showTab('settings')); await p.waitForTimeout(500); await p.screenshot({ path: 'v6-desk-settings.png' });
await b.close();
