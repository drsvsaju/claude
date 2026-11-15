import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' });
await ctx.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-guest', '1'); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); localStorage.setItem('pomodorolist-intro-seen', '1'); });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
const p = await ctx.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#appView:not(.hidden)'); await wait(1500);
const info = await p.evaluate(() => {
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  S.game.grants.au_b_sloth = { src: 'boss:sloth:solo', at: Date.now() - 5000 };
  S.game.grants.au_b_sloth_sq = { src: 'boss:sloth:squad', at: Date.now() };
  S.game.equipped.aura = 'au_b_sloth_sq'; G = null; save(); applyCosmetics();
  S.ui.bagCat = 'aura'; showTab('bag');
  const out = {};
  for (const id of ['au_b_sloth', 'au_b_sloth_sq']) {
    const card = document.querySelector(`[data-bid="${id}"]`);
    const au = card && card.querySelector('.aura');
    out[id] = { cls: au && au.className, before: au && getComputedStyle(au, '::before').boxShadow, anim: au && getComputedStyle(au, '::before').animationName, def: SPECIAL_AURAS[id] };
  }
  return out;
});
console.log(JSON.stringify(info, null, 1));
await p.screenshot({ path: 'c1-bag-aura.png' });
await b.close();
