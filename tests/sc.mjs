import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(() => localStorage.setItem('pomodorolist-tour-done', '1'));
const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
await p.goto('http://localhost:8000/index.html'); await p.click('#guestBtn'); await p.waitForTimeout(1500);
await p.screenshot({ path: 'v6-timer.png' });
await p.click('#pomeoBtn'); await p.waitForTimeout(400); await p.screenshot({ path: 'v6-tap.png' });
console.log('bubble:', await p.textContent('#pomeoBubble'), await p.evaluate(() => $('#mascot').className.baseVal));
await b.close();
