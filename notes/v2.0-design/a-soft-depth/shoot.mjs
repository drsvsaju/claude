// Screenshots of Direction A “Soft depth”.  Usage: node shoot.mjs
// Saves seven JPEGs (quality 86, 2x) next to this file and prints a small layout report for each.
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = pathToFileURL(path.join(HERE, 'proto.html')).href;

//            file name              view          mode     skin       width height fullPage
const SHOTS = [
  ['timer--dark',        'timer',      'dark',  'default', 1440, 900, false],
  ['timer--light',       'timer',      'light', 'default', 1440, 900, false],
  ['timer--sunset-dark', 'timer',      'dark',  'sunset',  1440, 900, false],
  ['components--dark',   'components', 'dark',  'default', 1440, 900, true],
  ['components--light',  'components', 'light', 'default', 1440, 900, true],
  ['phone--dark',        'phone',      'dark',  'default', 390,  844, false],
  ['phone--light',       'phone',      'light', 'default', 390,  844, false],
];

const browser = await chromium.launch();
for (const [name, view, mode, skin, width, height, fullPage] of SHOTS) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${PAGE}?view=${view}&mode=${mode}&skin=${skin}`);
  await page.waitForTimeout(200);
  // Layout report: anything wider than the page, or content cut off inside a clipped container.
  const report = await page.evaluate(() => {
    const out = [];
    const root = document.querySelector('.view:not([style*="none"])');
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw) out.push('page scrolls sideways: ' + document.documentElement.scrollWidth);
    for (const sel of ['.stage', '.side', '.col', '.timer', '.today', '.phone', '.bsheet']) {
      for (const el of document.querySelectorAll(sel)) {
        if (!el.offsetParent && sel !== '.phone') continue;
        if (el.scrollHeight > el.clientHeight + 1) out.push(`${sel} content is ${el.scrollHeight - el.clientHeight}px taller than its box`);
        if (el.scrollWidth > el.clientWidth + 1) out.push(`${sel} content is ${el.scrollWidth - el.clientWidth}px wider than its box`);
      }
    }
    return { height: document.documentElement.scrollHeight, issues: out, root: !!root };
  });
  await page.screenshot({ path: path.join(HERE, name + '.jpg'), type: 'jpeg', quality: 86, fullPage });
  console.log(`${name}.jpg  ${width}x${fullPage ? report.height : height}  ${report.issues.length ? '⚠ ' + report.issues.join(' | ') : 'ok'}`);
  await ctx.close();
}
await browser.close();
