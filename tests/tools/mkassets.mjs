// The link preview and the icons, drawn from tools/og.html: node mkassets.mjs <outDir>
//   og-image.png            1200×630  the picture a pasted link shows (Open Graph / Twitter)
//   apple-touch-icon.png    180×180   square, no transparency (iOS rounds it itself)
//   favicon-48.png, favicon-32.png    the tab icon for crawlers and browsers without SVG icons
//   favicon.svg                       the tomato alone
// Run from the harness root (it needs the pre-installed Playwright). No web app manifest and no service worker: not a PWA.
import { chromium } from 'playwright';
import fs from 'fs';
const out = process.argv[2] || 'assets';
fs.mkdirSync(out, { recursive: true });
const here = new URL('.', import.meta.url).pathname;
const src = [here + 'og.html', here + 'tools/og.html'].find(f => fs.existsSync(f));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const shot = async (query, w, h, file, scale = 1, clear = false) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  const p = await ctx.newPage();
  await p.goto('file://' + src + query); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/${file}`, omitBackground: clear, clip: { x: 0, y: 0, width: w, height: h } });
  await ctx.close(); console.log(file);
};
await shot('', 1200, 630, 'og-image.png');
await shot('?icon=square', 512, 512, 'apple-touch-icon.png', 180 / 512);
await shot('?icon=bare', 512, 512, 'favicon-48.png', 48 / 512, true);
await shot('?icon=bare', 512, 512, 'favicon-32.png', 32 / 512, true);
fs.writeFileSync(`${out}/favicon.svg`, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><ellipse cx="16" cy="18.6" rx="12.6" ry="11.8" fill="#f0735f"/><path d="M16 7.6V5" stroke="#5a9a5c" stroke-width="2.2" stroke-linecap="round"/><path d="M16.4 6C17.6 2.8 21.2 1.9 24 3.2 22.7 6.1 19.2 7.4 16.4 6Z" fill="#7cc07a"/><circle cx="12.4" cy="18.6" r="1.6" fill="#3b2420"/><circle cx="19.6" cy="18.6" r="1.6" fill="#3b2420"/></svg>\n');
console.log('favicon.svg');
await b.close();
