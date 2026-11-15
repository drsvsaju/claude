// Tutorial layout check: every step at several widths; reports overflow and alignment.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [], problems = [];
const shots = process.argv[2] === 'shots';
for (const w of [320, 360, 390, 430, 768, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 760 : 900 }, hasTouch: w < 700, isMobile: w < 700 });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
  await p.goto('http://localhost:8000/index.html');
  await p.evaluate(() => { localStorage.setItem('pomodorolist-guest', '1'); });
  await p.goto('http://localhost:8000/index.html');
  await p.waitForSelector('#tutDlg[open]', { timeout: 10000 });
  for (let i = 0; i < 6; i++) {
    await p.evaluate(i => { TUT.i = i; if (i === 2) TUT.goal = 0; renderTut(); }, i); await wait(150);
    const r = await p.evaluate(() => {
      const d = $('#tutDlg'), dr = d.getBoundingClientRect(), out = [];
      if (d.scrollWidth > d.clientWidth + 1) out.push(`dialog scrolls horizontally (${d.scrollWidth} > ${d.clientWidth})`);
      if (dr.right > innerWidth || dr.left < 0) out.push('dialog wider than screen');
      for (const el of d.querySelectorAll('*')) {
        if (!el.getClientRects().length) continue;
        const r = el.getBoundingClientRect();
        if (r.right > dr.right - 1 || r.left < dr.left + 1) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${el.className} sticks out (${Math.round(r.left - dr.left)}..${Math.round(r.right - dr.left)} of ${Math.round(dr.width)})`);
        const parent = el.closest('.tut-opt, .sp-card');
        if (parent && el !== parent) { const pr = parent.getBoundingClientRect(); if (r.right > pr.right + .5) out.push(`${el.tagName.toLowerCase()}#${el.id} overflows its card`); }
      }
      const pom = $('#tutPomeo').getBoundingClientRect(), bub = $('.tut-bubble').getBoundingClientRect();
      const dy = Math.abs((pom.top + pom.height / 2) - (bub.top + bub.height / 2));
      if (dy > 3) out.push(`Pomeo not centred with title (off by ${Math.round(dy)}px)`);
      return out;
    });
    r.forEach(x => problems.push(`${w}px step ${i + 1}: ${x}`));
    if (shots && (i === 2 || i === 4) && [320, 390, 1280].includes(w)) await p.screenshot({ path: `tut14-${w}-s${i + 1}.png` });
  }
  await ctx.close();
}
console.log(problems.length ? problems.join('\n') : 'no tutorial layout problems');
console.log('errors', errs);
await b.close();
