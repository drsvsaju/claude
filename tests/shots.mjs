// Screenshot tool for the v2.0 redesign: the same named screens, shot the same way, so "before" and "after" line up.
//   node shots.mjs <outDir> [--page index.html] [--variants d-dark,d-light,phone] [--only id,id] [--png]
// Screens come from shots-screens.mjs. The demo account is used for everything inside the app (it has data on every
// screen and writes nothing); the welcome page and sign-up card are shot logged out.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { SCREENS } from './shots-screens.mjs';
const args = process.argv.slice(2), outDir = args[0] || 'shots-out';
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const PAGE = opt('page') || 'index.html', ONLY = opt('only') ? opt('only').split(',') : null, PNG = args.includes('--png');
const VARIANTS = (opt('variants') || 'd-dark,d-light,phone').split(',');
const V = { 'd-dark': { w: 1440, h: 900, theme: 'dark' }, 'd-light': { w: 1440, h: 900, theme: 'light' }, phone: { w: 390, h: 844, theme: 'dark', touch: true }, 'phone-light': { w: 390, h: 844, theme: 'light', touch: true }, tablet: { w: 820, h: 1180, theme: 'dark', touch: true } };
const SITE = process.env.SITE || 'http://localhost:8000';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const wait = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const report = [];
for (const vn of VARIANTS) {
  const v = V[vn]; if (!v) { console.log('unknown variant', vn); continue; }
  const mk = async () => {
    const ctx = await b.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 2, hasTouch: !!v.touch, isMobile: !!v.touch, colorScheme: v.theme });
    await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
    await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });   // the welcome page itself, not the first-visit title sequence
    const p = await ctx.newPage(); p.on('dialog', d => d.accept()); p.on('pageerror', e => report.push(`${vn} pageerror: ${e.message}`));
    return { ctx, p };
  };
  // a calm page: no toasts or speech bubbles drifting into the picture, the demo banner out of the way
  const CALM = `.toasts, #pomeoBubble, .pv-banner, #tipPop, .ach-toast, #cursorGlow { display: none !important; } html { scroll-behavior: auto !important; } body.previewing { --pv-h: 0px !important; } * { content-visibility: visible !important; }`;   // (tiles the browser skips off screen would be blank in a full-page picture, v2.0 phase 4)
  const enterDemo = async p => {
    await p.goto(`${SITE}/${PAGE}`); await p.waitForSelector('#authView:not(.hidden)');
    await p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
    await p.evaluate(() => startPreview()); await p.waitForSelector('#appView:not(.hidden)'); await wait(4500);
    await p.evaluate(th => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); S.settings.theme = th; applyTheme(); }, v.theme);
    await p.addStyleTag({ content: CALM }); await wait(700);
  };
  let demo = null, out = null;
  for (const s of SCREENS) {
    if (ONLY && !ONLY.includes(s.id)) continue;
    if (s.skip && s.skip.includes(vn)) continue;
    if (!!s.debugOnly !== /debug=1/.test(PAGE)) continue;   // the gallery exists only with ?debug=1; everything else is shot without it
    const file = path.join(outDir, `${s.id}--${vn}.${PNG ? 'png' : 'jpg'}`);
    try {
      let p;
      if (s.loggedOut) {
        if (!out) { out = await mk(); }
        p = out.p;
        await p.goto(`${SITE}/${PAGE}`); await p.waitForSelector('#authView:not(.hidden)');
        await p.evaluate(() => { const x = document.getElementById('introSkip'); if (x) x.click(); }); await wait(900);
        await p.evaluate(th => { try { localStorage.setItem('pomodorolist-lp-theme', th); } catch (e) {} if (typeof lpSetTheme === 'function') lpSetTheme(th); }, v.theme).catch(() => {});
      } else {
        if (!demo) { demo = await mk(); await enterDemo(demo.p); }
        p = demo.p;
        await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (typeof navOpen === 'function') navOpen(false); if (typeof scrollMem === 'object') for (const k in scrollMem) delete scrollMem[k]; window.scrollTo(0, 0); });
      }
      await p.evaluate(`(async () => { ${s.run} })()`);
      await wait(s.wait || 1100);
      const full = !s.viewport;
      if (full) { await p.evaluate(() => window.scrollTo(0, 0)); await wait(250); }   // a tab can restore an old scroll position: always shoot from the top
      if (full) {
        // a tall viewport instead of a full-page capture: fixed layers (the background, the sidebar) then fill the whole picture, as they do while scrolling
        const hgt = await p.evaluate(() => Math.max(document.documentElement.scrollHeight, innerHeight));
        const cap = Math.min(hgt, s.cap || (v.w > 500 ? 2700 : 3200));
        if (s.fullPage) {   // pages built on 100vh sections (the welcome page) keep the real viewport and are captured by scrolling
          await p.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width: v.w, height: cap }, ...(PNG ? {} : { type: 'jpeg', quality: 84 }) });
        } else {
          if (cap > v.h + 4) { await p.setViewportSize({ width: v.w, height: cap }); await wait(350); await p.evaluate(() => window.scrollTo(0, 0)); }
          await p.screenshot({ path: file, ...(PNG ? {} : { type: 'jpeg', quality: 84 }) });
          if (cap > v.h + 4) { await p.setViewportSize({ width: v.w, height: v.h }); await wait(150); }
        }
      } else {
        await p.screenshot({ path: file, ...(PNG ? {} : { type: 'jpeg', quality: 84 }) });
      }
      if (s.after) await p.evaluate(`(async () => { ${s.after} })()`).catch(() => {});
      if (s.fresh && demo) { await demo.ctx.close(); demo = null; }   // the screen left state behind (a running timer…): start clean next time
      console.log('ok', path.basename(file));
    } catch (e) { report.push(`${vn} ${s.id}: ${String(e.message).split('\n')[0]}`); console.log('FAIL', s.id, vn, String(e.message).split('\n')[0]); if (demo) { await demo.ctx.close().catch(() => {}); demo = null; } }
  }
  if (demo) await demo.ctx.close(); if (out) await out.ctx.close();
}
console.log('\nproblems:', report.length ? '\n' + report.join('\n') : 'none');
await b.close();
