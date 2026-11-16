// Screenshots of the v2.0 reference direction ("Soft depth", final).  Usage: node shoot.mjs [name-prefix]
// Writes into OUT:  <name>.jpg at 2x (quality 86)  and  review/<name>.jpg at 1x (the half-size copy for review).
// Prints a small layout report for each shot.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = HERE;                                   // notes/v2.0-design/reference
const REVIEW = path.join(OUT, 'review');
const PAGE = pathToFileURL(path.join(HERE, 'proto.html')).href;
fs.mkdirSync(REVIEW, { recursive: true });

//            file name                     view          mode     skin       width height fullPage extra
const SHOTS = [
  ['timer--dark',               'timer',      'dark',  'default', 1440, 900, false, ''],
  ['timer--light',              'timer',      'light', 'default', 1440, 900, false, ''],
  ['timer--sunset-dark',        'timer',      'dark',  'sunset',  1440, 900, false, ''],
  ['timer--sunset-light',       'timer',      'light', 'sunset',  1440, 900, false, ''],
  ['components--dark',          'components', 'dark',  'default', 1440, 900, true,  ''],
  ['components--light',         'components', 'light', 'default', 1440, 900, true,  ''],
  ['phone--dark',               'phone',      'dark',  'default', 390,  844, false, ''],
  ['phone--light',              'phone',      'light', 'default', 390,  844, false, ''],
  ['phone-timer--dark',         'phone',      'dark',  'default', 390,  844, false, '&sheet=0'],
  ['phone-timer--sunset-light', 'phone',      'light', 'sunset',  390,  844, false, '&sheet=0'],
];

// Runs in the page: sideways scroll, clipped containers, and (phone) tap targets under 44px.
function layoutReport(view) {
  const out = [];
  const vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw) out.push('page scrolls sideways: ' + document.documentElement.scrollWidth);
  // .phone stands in for the phone viewport: its page is meant to scroll, so only its width is checked.
  for (const sel of ['.stage', '.side', '.col', '.timer', '.today', '.garden', '.session', '.bsheet', '.top', '.spec-body', '.pop', '.dialog', '.found', '.phone']) {
    for (const el of document.querySelectorAll(sel)) {
      if (!el.offsetParent) continue;
      if (sel !== '.phone' && el.scrollHeight > el.clientHeight + 1) out.push(`${sel} content is ${el.scrollHeight - el.clientHeight}px taller than its box`);
      if (el.scrollWidth > el.clientWidth + 1) out.push(`${sel} content is ${el.scrollWidth - el.clientWidth}px wider than its box`);
    }
  }
  if (view === 'phone') {
    const sheet = document.documentElement.dataset.sheet !== '0';
    const scope = sheet ? '.bsheet' : '.ph-top, .ph-main, .tabbar';
    for (const root of document.querySelectorAll(scope)) {
      for (const el of root.querySelectorAll('button, a, [role=option], [role=combobox]')) {
        if (!el.offsetParent || el.closest('.tag')) continue;                 // tag × buttons are covered by Backspace and by the tag's own 44px row
        if (el.parentElement.closest('.tapbox, [role=option]')) continue;     // drawn inside a 44px hit box that is measured itself
        const r = el.getBoundingClientRect();
        if (r.height < 43.5 || r.width < 43.5) out.push(`tap target ${Math.round(r.width)}x${Math.round(r.height)}: ${(el.getAttribute('aria-label') || el.textContent).trim().slice(0, 28)}`);
      }
    }
  }
  return { height: document.documentElement.scrollHeight, issues: out };
}

const only = process.argv[2];
const browser = await chromium.launch();
for (const [name, view, mode, skin, width, height, fullPage, extra] of SHOTS) {
  if (only && !name.startsWith(only)) continue;
  const url = `${PAGE}?view=${view}&mode=${mode}&skin=${skin}${extra}`;
  let report;
  for (const [scale, file, quality] of [[2, path.join(OUT, name + '.jpg'), 86], [1, path.join(REVIEW, name + '.jpg'), 88]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
    const page = await ctx.newPage();
    await page.goto(url);
    await page.waitForTimeout(200);
    if (scale === 2) report = await page.evaluate(layoutReport, view);
    await page.screenshot({ path: file, type: 'jpeg', quality, fullPage });
    await ctx.close();
  }
  console.log(`${name}.jpg  ${width}x${fullPage ? report.height : height}  ${report.issues.length ? '⚠ ' + report.issues.join(' | ') : 'ok'}`);
}
await browser.close();
