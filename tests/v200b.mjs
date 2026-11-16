// v2.0 phase 2 end check: no native select / date / time / number / colour control is left, in the source or on any
// screen or dialog of the demo account (desktop and phone), and no native confirm() / alert() call remains in the script.
// Deliberate exceptions: password fields, the backup file input (the system's own file chooser), hidden value holders,
// and the library's own window.confirm fallback (used only if its dialog is missing from the page).
import { chromium } from 'playwright';
import fs from 'fs';
const SITE = process.env.SITE || 'http://localhost:8000';
const PAGE = process.env.PAGE || 'index.html';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const errs = [];
const check = (label, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };

// ---------- the source ----------
const src = await (await fetch(`${SITE}/${PAGE}`)).text();
const NATIVE = /<select\b|<input\b[^>]*\btype\s*=\s*["']?(date|time|datetime-local|month|week|number|color)\b/gi;
const nativeHits = [...src.matchAll(NATIVE)].map(m => { const at = src.lastIndexOf('\n', m.index) + 1; return src.slice(at, at + 120).trim(); });
check('Source: no <select> and no date / time / number / colour <input> in the markup or in any template', !nativeHits.length, nativeHits.slice(0, 5).join(' | '));
const script = [...src.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).sort((a, b) => b.length - a.length)[0];
const code = script.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => { const i = l.search(/(^|[^:'"`\\])\/\/ /); return i >= 0 ? l.slice(0, i + 1) : l; }).join('\n');
const calls = [...code.matchAll(/(^|[^.\w$])(confirm|alert|prompt)\s*\(/g)].map(m => code.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' '));
check('Script: no native confirm() / alert() / prompt() call (the app asks through its own dialog)', !calls.length, calls.slice(0, 5).join(' | '));

// ---------- every screen and dialog, desktop and phone ----------
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h, touch] of [[1280, 860, false], [390, 844, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${SITE}/${PAGE}`); await p.waitForSelector('#authView:not(.hidden)');
  await p.evaluate(() => startPreview()); await p.waitForSelector('#appView:not(.hidden)'); await wait(3000);
  const seen = await p.evaluate(async () => {
    const NAT = 'select, input[type="date"], input[type="time"], input[type="datetime-local"], input[type="month"], input[type="week"], input[type="number"], input[type="color"]';
    const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0; };
    const found = new Set(), w = ms => new Promise(r => setTimeout(r, ms));
    const look = where => document.querySelectorAll(NAT).forEach(el => { if (vis(el)) found.add(`${where}: ${el.tagName.toLowerCase()}${el.type ? '[' + el.type + ']' : ''}#${el.id || el.name || el.className}`); });
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    const tabs = [...new Set([...document.querySelectorAll('[data-tab]')].map(x => x.dataset.tab))];
    for (const t of tabs) { try { showTab(t); } catch (e) { continue; } await w(350); look('tab ' + t); }
    let dialogs = 0;
    for (const d of document.querySelectorAll('dialog:not(.ui-pop)')) { try { d.showModal(); dialogs++; await w(60); look('dialog ' + (d.id || '?')); d.close(); await w(20); } catch (e) {} }
    return { found: [...found], tabs: tabs.length, dialogs };
  });
  check(`${touch ? 'Phone' : 'Desktop'}: no native select / date / time / number / colour control is visible on any of the ${seen.tabs} screens or in any of the ${seen.dialogs} dialogs`, !seen.found.length && seen.tabs > 8 && seen.dialogs > 30, seen.found.slice(0, 8).join(' | '));
  await ctx.close();
}
check('No page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await b.close();
process.exit(fails ? 1 : 0);
