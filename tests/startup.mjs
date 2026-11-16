// Start-up cost of two builds, alternated: time to the welcome page and the main script's own run time.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pages = process.argv.slice(2), N = +(process.env.N || 6), res = Object.fromEntries(pages.map(p => [p, []]));
for (let i = 0; i < N; i++) for (const page of (i % 2 ? [...pages].reverse() : pages)) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  await p.goto('http://localhost:8000/' + page); await p.waitForSelector('#authView:not(.hidden)');
  const r = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), shown: Math.round(performance.now()) }; });
  await p.evaluate(() => startPreview()); const t0 = Date.now(); await p.waitForSelector('#appView:not(.hidden)'); r.demo = Date.now() - t0;
  res[page].push(r); await ctx.close();
}
const med = a => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const [k, v] of Object.entries(res)) console.log(k, 'median DOMContentLoaded', med(v.map(x => x.dcl)), 'ms · welcome shown', med(v.map(x => x.shown)), 'ms · demo app', med(v.map(x => x.demo)), 'ms');
await b.close();
