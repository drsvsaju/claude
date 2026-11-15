import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const src = fs.readFileSync('audit.mjs', 'utf8'); const seedSrc = src.slice(src.indexOf('const seed = '), src.indexOf('const check = '));
const LONG = 'Organic Chemistry – Aldehydes, Ketones and Carboxylic Acids (revision part 2)';
const seed = eval(seedSrc.replace('const seed = ', '(').replace(/;\s*$/, ')'));
for (const w of [390, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 }, hasTouch: w < 700, isMobile: w < 700 });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await ctx.addInitScript(() => {
    window.__ls = []; window.__cls = 0;
    new PerformanceObserver(l => l.getEntries().forEach(e => window.__ls.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
  });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8000/index.html'); await p.evaluate(seed, LONG);
  const t0 = Date.now();
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#appView:not(.hidden)');
  const tApp = Date.now() - t0;
  await new Promise(r => setTimeout(r, 2500));
  const r = await p.evaluate(() => ({ dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd), long: window.__ls, cls: +window.__cls.toFixed(3) }));
  const tabs = {};
  for (const t of ['stats', 'quests', 'shop', 'friends', 'board', 'reminders', 'profile', 'settings', 'timer']) {
    tabs[t] = await p.evaluate(t => { const a = performance.now(); showTab(t); return Math.round(performance.now() - a); }, t);
    await new Promise(r => setTimeout(r, 300));
  }
  const cls2 = await p.evaluate(() => +window.__cls.toFixed(3));
  console.log(`${w}px: app visible ${tApp}ms, DOMContentLoaded ${r.dcl}ms, long tasks ${JSON.stringify(r.long)}, layout shift at load ${r.cls} (after tab tour ${cls2})`);
  console.log('   tab switch ms:', JSON.stringify(tabs));
  await ctx.close();
}
await b.close();
