// v2.0: the compatibility layer for the older suites (ui-compat.mjs) — run with: node --import ./ui-compat.mjs v200c.mjs
// On the Component gallery of the demo account: page.selectOption / fill / inputValue on the app's own controls, and the
// app's confirm / alert dialog answered by page.on('dialog') handlers and by a window.confirm stub, exactly as the suites
// written for native controls expect.
import { chromium } from 'playwright';
import fs from 'fs';
const SITE = process.env.SITE || 'http://localhost:8000';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const errs = [];
const check = (label, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(SITE + '/' + (process.env.PAGE || 'index.html') + '?debug=1'); await p.waitForSelector('#authView:not(.hidden)');
await p.evaluate(() => startPreview()); await p.waitForSelector('#appView:not(.hidden)'); await wait(3500);
await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); showTab('gallery'); }); await wait(700);
const log = () => p.evaluate(() => LOG.splice(0));
await log();

// selectOption on a <ui-select>
const r1 = await p.selectOption('#gxs1', '1'); const l1 = await log();
const r2 = await p.selectOption('#gxs1', { label: 'Saturday' }); const l2 = await log();
await p.selectOption('#gxs1', '6'); const l3 = await log();   // already chosen: no events, like a person picking the same row
const bad = await p.selectOption('#gxs1', 'nope').then(() => 'no error', e => String(e.message).split('\n')[0]);
check('selectOption on a <ui-select>: by value and by label, one input + one change each; choosing the current option fires nothing; an unknown option is an error',
  r1.join() === '1' && l1.join() === 'input:gxs1=1,change:gxs1=1' && r2.join() === '6' && l2.join() === 'input:gxs1=6,change:gxs1=6' && !l3.length && /no option/.test(bad), JSON.stringify({ r1, l1, r2, l2, l3, bad }));

// fill / inputValue on the other controls
await p.fill('#gxd1', '2026-12-01'); await p.fill('#gxt1', '07:45'); await p.fill('#gxn1', '150'); await p.fill('#gxg1', 'Maths, Revision');
const vals = { d: await p.inputValue('#gxd1'), t: await p.inputValue('#gxt1'), n: await p.inputValue('#gxn1'), g: await p.inputValue('#gxg1'), s: await p.inputValue('#gxs1') };
const l4 = await log();
check('fill and inputValue on <ui-date>, <ui-time>, <ui-num>, <ui-tags>: the value is set and each fires input + change once',
  vals.d === '2026-12-01' && vals.t === '07:45' && vals.n === '150' && vals.g === 'Maths, Revision' && vals.s === '6' && l4.filter(x => /^change:/.test(x)).length === 4 && l4.filter(x => /^input:/.test(x)).length === 4, JSON.stringify({ vals, l4 }));

// page.on('dialog') answers the app's own confirm
const seen = [];
const accept = async d => { seen.push(d.type() + ':' + d.message().split('\n')[0]); await d.accept(); };
p.on('dialog', accept);
await p.click('#gxcfBtn'); await wait(900); const c1 = await log();
p.off('dialog', accept);
const dismiss = async d => { seen.push('dismiss'); await d.dismiss(); };
p.on('dialog', dismiss);
await p.click('#gxcfBtn'); await wait(900); const c2 = await log();
await p.click('#gxalBtn'); await wait(900); const alertOpen = await p.evaluate(() => document.getElementById('confirmDlg').open);
p.off('dialog', dismiss);
check('page.on("dialog") is called for the app\'s own confirm and alert: accept() answers OK, dismiss() answers Cancel, an alert is closed either way',
  c1.join() === 'confirm:true' && c2.join() === 'confirm:false' && !alertOpen && seen[0] === 'confirm:Delete “Sprint”?' && seen.includes('dismiss'), JSON.stringify({ c1, c2, alertOpen, seen }));

// with nobody listening the dialog stays, for the suite to click
await p.click('#gxcfBtn'); await wait(700);
const stays = await p.evaluate(() => document.getElementById('confirmDlg').open);
await p.click('[id="cfNo"]'); await wait(500); const c3 = await log();
check('With no dialog handler the confirm stays open until it is clicked', stays && c3.join() === 'confirm:false', JSON.stringify({ stays, c3 }));

// a window.confirm stub inside the page
await p.evaluate(() => { window.__asked = []; window.confirm = t => { window.__asked.push(t); return true; }; });
await p.click('#gxcfBtn'); await wait(900); const c4 = await log();
await p.evaluate(() => { window.confirm = () => false; });
await p.click('#gxcfBtn'); await wait(900); const c5 = await log();
const asked = await p.evaluate(() => window.__asked);
check('A window.confirm stub set by a suite answers the app\'s confirm dialog (true → OK, false → Cancel) and receives the question', c4.join() === 'confirm:true' && c5.join() === 'confirm:false' && /Delete “Sprint”\?/.test(asked[0] || ''), JSON.stringify({ c4, c5, asked }));

check('No page errors', !errs.length, errs.join(' | '));
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
await b.close();
process.exit(fails ? 1 : 0);
