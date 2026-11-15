import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(() => localStorage.setItem('pomodorolist-tour-done', '1'));
const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8000/index.html'); await p.click('#guestBtn'); await p.waitForTimeout(2500);
console.log('login dlg open:', await p.evaluate(() => $('#loginDlg').open));
await p.screenshot({ path: 'v7-login.png' });
for (const t of ['quests', 'stats', 'reminders', 'profile']) { await p.evaluate(t => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); showTab(t); }, t); await p.waitForTimeout(600); await p.screenshot({ path: `v7-${t}.png`, fullPage: true }); }
await b.close();
