import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [mob, touch] of [[true, true], [false, true], [false, false]]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, hasTouch: touch, isMobile: mob });
  const p = await ctx.newPage(); await p.goto('about:blank');
  console.log({ mob, touch }, await p.evaluate(() => ['(pointer: coarse)', '(any-pointer: coarse)', '(hover: none)', '(pointer: fine)'].map(q => q + '=' + matchMedia(q).matches).join(' ')));
  await ctx.close();
}
await b.close();
