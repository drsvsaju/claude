// Quick comparison of render cost between two builds on the demo account: node perfp1.mjs index.html v120.html
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const page of process.argv.slice(2)) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  await p.goto('http://localhost:8000/' + page); await p.waitForSelector('#authView:not(.hidden)');
  await p.evaluate(() => startPreview()); await p.waitForSelector('#appView:not(.hidden)'); await wait(3500);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await wait(400);
  const r = await p.evaluate(async () => {
    const med = a => a.sort((x, y) => x - y)[a.length >> 1];
    const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
    const out = { nodes: document.querySelectorAll('*').length };
    // renderAll + the frame after it (layout, observers)
    const ra = []; for (let i = 0; i < 25; i++) { const t = performance.now(); renderAll(); await frame(); ra.push(performance.now() - t); } out.renderAllFrame = +med(ra).toFixed(1);
    const rs = []; for (let i = 0; i < 25; i++) { const t = performance.now(); renderAll(); rs.push(performance.now() - t); } out.renderAllSync = +med(rs).toFixed(1);
    for (const tab of ['stats', 'quests', 'friends', 'garden', 'settings', 'timer']) { const ts = []; for (let i = 0; i < 6; i++) { showTab('timer' === tab ? 'stats' : 'timer'); await frame(); const t = performance.now(); showTab(tab); await frame(); ts.push(performance.now() - t); } out['tab_' + tab] = +med(ts).toFixed(1); }
    const th = []; for (let i = 0; i < 12; i++) { const t = performance.now(); applyTheme(i % 2 ? 'dark' : 'light'); th.push(performance.now() - t); } out.applyTheme = +med(th).toFixed(2); applyTheme();
    if (window.UI) { const sc = []; for (let i = 0; i < 30; i++) { const t = performance.now(); UI.scan(document); sc.push(performance.now() - t); } out.scan = +med(sc).toFixed(2); }
    return out;
  });
  console.log(page, JSON.stringify(r));
  await ctx.close();
}
await b.close();
