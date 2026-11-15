import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const W of [1280, 390]) {
  const ctx = await b.newContext({ viewport: { width: W, height: W < 500 ? 844 : 900 }, hasTouch: W < 500, isMobile: W < 500 });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)'); await p.click('#previewBtn'); await p.waitForSelector('#appView:not(.hidden)'); await new Promise(r => setTimeout(r, 2600));
  for (const [name, sc, pe] of [['produce', 'friends', 'produce'], ['week', 'friends', 'week'], ['global-harvests', 'global', 'harvests']]) {
    const r = await p.evaluate(([s, pe]) => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); S.ui.lbScope = s; S.ui.lbPeriod = pe; SOC.lb = {}; showTab('board'); renderBoard(); return 1; }, [sc, pe]);
    await new Promise(r => setTimeout(r, 1800));
    const info = await p.evaluate(() => ({ pods: [...document.querySelectorAll('.lb-pod')].map(x => x.textContent.replace(/\s+/g, ' ').trim()), rows: document.querySelectorAll('#boardBody .lb li[data-uid]').length, you: (document.querySelector('.lb-you') || {}).textContent, w: document.documentElement.scrollWidth }));
    console.log(W, name, JSON.stringify(info));
    await p.screenshot({ path: `shot116-board-${W}-${name}.png`, fullPage: W < 500 });
  }
  console.log('errors', JSON.stringify(errs));
  await ctx.close();
}
await b.close();
