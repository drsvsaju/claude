// Screenshots for direction C "Warm garden".  Run:  node shoot.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const proto = pathToFileURL(path.join(dir, 'proto.html')).href;

const shots = [
  // [file, view, mode, skin, width, height, fullPage]
  ['timer--dark.jpg',        'timer',      'dark',  'default', 1440, 900, false],
  ['timer--light.jpg',       'timer',      'light', 'default', 1440, 900, false],
  ['timer--sunset-dark.jpg', 'timer',      'dark',  'sunset',  1440, 900, false],
  ['components--dark.jpg',   'components', 'dark',  'default', 1440, 900, true],
  ['components--light.jpg',  'components', 'light', 'default', 1440, 900, true],
  ['phone--dark.jpg',        'phone',      'dark',  'default', 390,  844, false],
  ['phone--light.jpg',       'phone',      'light', 'default', 390,  844, false],
];

const browser = await chromium.launch();
for (const [file, view, mode, skin, width, height, fullPage] of shots) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${proto}?view=${view}&mode=${mode}&skin=${skin}`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(dir, file), type: 'jpeg', quality: 86, fullPage });
  await ctx.close();
  console.log('saved', file);
}
await browser.close();
