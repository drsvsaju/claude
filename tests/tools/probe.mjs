// Run page-side code on the demo account: node probe.mjs <page> <width> <height> '<js returning a value>' [--big]
//   SHOT=out.png to keep a picture of the page afterwards. --big loads the large account (tools/bigacct.js) first.
// The code is the body of an async function; its return value is printed as JSON.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const [page, w, h, code] = process.argv.slice(2), big = process.argv.includes('--big');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 });
await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
const BIG = [new URL('./bigacct.js', import.meta.url).pathname, new URL('./tools/bigacct.js', import.meta.url).pathname].find(f => fs.existsSync(f));
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://localhost:8000/' + page); await p.waitForSelector('#authView:not(.hidden)');
if (big) { await p.addScriptTag({ path: BIG }); await p.evaluate(() => bigAccount()); }
await p.evaluate(() => startPreview()); await p.waitForSelector('#appView:not(.hidden)'); await new Promise(r => setTimeout(r, 3000));
await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await new Promise(r => setTimeout(r, 400));
console.log(JSON.stringify(await p.evaluate(`(async () => { ${code} })()`)));
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
await b.close();
