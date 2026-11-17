// Where does the time go? Wraps every top-level function of the app and prints the costliest during one action.
//   node prof.mjs <page> [--big] [--do "js to run after start-up"] [--top 40] [--phone]
// Times are inclusive (a function's time contains the functions it calls), so read the list top-down as a call tree.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = [new URL('../node_modules/firebase/', import.meta.url).pathname, new URL('./node_modules/firebase/', import.meta.url).pathname].find(f => fs.existsSync(f));
const BIG = [new URL('./bigacct.js', import.meta.url).pathname, new URL('./tools/bigacct.js', import.meta.url).pathname].find(f => fs.existsSync(f));
const args = process.argv.slice(2), page = args[0], has = f => args.includes(f), val = f => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext(has('--phone') ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} window.__pristine = new Set(Object.getOwnPropertyNames(window)); });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://localhost:8000/' + page); await p.waitForSelector('#authView:not(.hidden)');
if (has('--big')) { await p.addScriptTag({ path: BIG }); await p.evaluate(() => bigAccount()); }
await p.evaluate(() => { const d = demoDocs(); window.demoDocs = () => d; });   // the demo's own data building is not what is measured (see perf4.mjs)
await p.evaluate(() => {
  const P = window.__prof = {};
  for (const name of Object.getOwnPropertyNames(window)) {
    if (window.__pristine.has(name) || name.startsWith('__')) continue;
    let f; try { f = window[name]; } catch (e) { continue; }
    if (typeof f !== 'function' || /^class\s/.test(Function.prototype.toString.call(f)) || Object.keys(f).length) continue;
    const rec = P[name] = { n: 0, ms: 0, depth: 0 };
    const w = function (...a) { rec.n++; if (rec.depth++) { try { return f.apply(this, a); } finally { rec.depth--; } } const t = performance.now(); try { return f.apply(this, a); } finally { rec.ms += performance.now() - t; rec.depth--; } };
    try { window[name] = w; } catch (e) {}
  }
  window.__profReset = () => { for (const k in P) { P[k].n = 0; P[k].ms = 0; } };
  window.__profTop = n => Object.entries(P).filter(([, r]) => r.ms >= 1).sort((a, c) => c[1].ms - a[1].ms).slice(0, n).map(([k, r]) => `${r.ms.toFixed(0).padStart(7)} ms ${String(r.n).padStart(7)}×  ${k}`);
});
const top = +(val('--top') || 40);
const t = Date.now();
await p.evaluate(() => startPreview()); await p.waitForSelector('#appView:not(.hidden)'); await new Promise(r => setTimeout(r, 3000));
if (!val('--do')) { console.log('start-up', Date.now() - t - 3000, 'ms (wall)'); console.log((await p.evaluate(n => window.__profTop(n), top)).join('\n')); }
else {
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await new Promise(r => setTimeout(r, 300));
  const ms = await p.evaluate(async code => { window.__profReset(); const t = performance.now(); await (0, eval)(`(async () => { ${code} })()`); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); return performance.now() - t; }, val('--do'));
  console.log(val('--do'), '→', ms.toFixed(0), 'ms'); console.log((await p.evaluate(n => window.__profTop(n), top)).join('\n'));
}
await b.close();
