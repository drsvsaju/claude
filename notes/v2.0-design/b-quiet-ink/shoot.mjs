// Renders proto.html into the seven review JPEGs. Run: node shoot.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const base = pathToFileURL(path.join(dir, 'proto.html')).href;

const shots = [
  ['timer--dark.jpg',        'view=timer&mode=dark&skin=default',       1440, 900, false],
  ['timer--light.jpg',       'view=timer&mode=light&skin=default',      1440, 900, false],
  ['timer--sunset-dark.jpg', 'view=timer&mode=dark&skin=sunset',        1440, 900, false],
  ['components--dark.jpg',   'view=components&mode=dark&skin=default',  1440, 900, true],
  ['components--light.jpg',  'view=components&mode=light&skin=default', 1440, 900, true],
  ['phone--dark.jpg',        'view=phone&mode=dark&skin=default',       390, 844, false],
  ['phone--light.jpg',       'view=phone&mode=light&skin=default',      390, 844, false],
];

const browser = await chromium.launch();
for (const [file, query, width, height, fullPage] of shots) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${base}?${query}`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(dir, file), type: 'jpeg', quality: 86, fullPage });
  await ctx.close();
  console.log('saved', file);
}
await browser.close();
