import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h, name] of [[1280, 860, 'desk'], [390, 844, 'phone']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8000/index.html'); await p.click('#guestBtn'); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await p.waitForTimeout(300);
  await p.screenshot({ path: `v10-${name}-timer.png` });
  await p.evaluate(() => showTab('settings')); await p.waitForTimeout(400); await p.screenshot({ path: `v10-${name}-settings.png` });
  await p.click('#inboxBtn'); await p.waitForTimeout(500); await p.screenshot({ path: `v10-${name}-inbox.png` });
  await p.evaluate(() => $('#inboxDlg').close()); await p.waitForTimeout(300);
  await p.click('#cmdBtn'); await p.waitForTimeout(300); await p.keyboard.type('dark'); await p.waitForTimeout(200); await p.screenshot({ path: `v10-${name}-cmd.png` });
  await ctx.close();
}
await b.close();
