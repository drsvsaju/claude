import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const w of [641, 660, 680, 760, 800]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 700 } }); await ctx.addInitScript(() => localStorage.setItem('pomodorolist-tour-done', '1'));
  const p = await ctx.newPage(); await p.goto('http://localhost:8000/index.html'); await p.click('#guestBtn'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const h = $('.top'); const kids = [...h.children].map(c => c.getBoundingClientRect()); return { over: document.documentElement.scrollWidth > innerWidth, overlap: kids[0].right > kids[1].left || kids[1].right > kids[2].left, tabsW: Math.round(kids[1].width), hH: Math.round(h.getBoundingClientRect().height) }; });
  console.log(w, JSON.stringify(r));
  if (w === 1024) await p.screenshot({ path: 'v6-1024.png', clip: { x: 0, y: 0, width: 1024, height: 120 } });
  await ctx.close();
}
await b.close();
