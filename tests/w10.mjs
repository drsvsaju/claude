import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const out = [];
for (const w of [360, 390, 641, 680, 720, 760, 800, 860, 900, 960, 1024, 1100, 1180, 1250, 1301, 1340, 1400]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 700 } }); await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '1.8'); });
  const p = await ctx.newPage(); await p.goto('http://localhost:8000/index.html'); await p.click('#guestBtn'); await p.waitForTimeout(700);
  const r = await p.evaluate(() => { const [a, n, c] = [...$('.top').children].map(c => c.getBoundingClientRect()); const fixed = getComputedStyle($('#tabs')).position === 'fixed'; return { over: document.documentElement.scrollWidth > innerWidth, overlap: fixed ? a.right > c.left + 1 : (a.right > n.left + 1 || n.right > c.left + 1), d: fixed ? `${Math.round(c.left - a.right)}` : `${Math.round(n.left - a.right)}/${Math.round(c.left - n.right)}`, sw: document.documentElement.scrollWidth }; });
  out.push(`${w}:${r.over || r.overlap ? 'BAD' : 'ok'}(${r.d}${r.over ? ' sw' + r.sw : ''})`);
  await ctx.close();
}
console.log(out.join(' '));
await b.close();
