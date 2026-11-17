// Phase 7 pictures: node p7shots.mjs <page> <outDir> [--new]
//   The landing with an invite link, the Friends tab, the profile, and (--new) the invite page, the gifts and the looks.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const [page, out] = process.argv.slice(2), isNew = process.argv.includes('--new');
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const CALM = `.toasts, #toast, #pomeoBubble, .pv-banner, #tipPop, .ach-toast, #cursorGlow, #pomeoPop { display: none !important; } html { scroll-behavior: auto !important; } body.previewing { --pv-h: 0px !important; } * { content-visibility: visible !important; }`;
async function ctxOf(w, h, scheme) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: scheme, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  return ctx;
}
async function landing(w, h, scheme, name) {
  const ctx = await ctxOf(w, h, scheme), p = await ctx.newPage();
  await p.goto('http://localhost:8000/' + page + '?ref=siverieg#signup'); await p.waitForSelector('#authView:not(.hidden)'); await wait(1500);
  await p.addStyleTag({ content: CALM });
  await p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); if (typeof setAuthMode === 'function') setAuthMode('signup'); document.activeElement && document.activeElement.blur(); });
  await wait(600);
  await p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 86 }); console.log(name);
  await ctx.close();
}
async function demo(w, h, scheme) {
  const ctx = await ctxOf(w, h, scheme), p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('http://localhost:8000/' + page); await p.waitForSelector('#authView:not(.hidden)');
  await p.evaluate(() => startPreview()); await p.waitForSelector('#appView:not(.hidden)'); await wait(3000);
  await p.addStyleTag({ content: CALM });
  await p.evaluate(s => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); applyTheme(s); }, scheme);
  await wait(400);
  return p;
}
const shot = async (p, name, code, sel = null, ms = 800) => {
  await p.evaluate(async c => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); await new Promise(r => setTimeout(r, 350)); await (0, eval)(`(async () => { ${c} })()`); }, code);
  await wait(ms);
  const path = `${out}/${name}.jpg`;
  if (sel) await p.locator(sel).first().screenshot({ path, type: 'jpeg', quality: 88 }); else await p.screenshot({ path, type: 'jpeg', quality: 86 });
  console.log(name);
};
await landing(1280, 860, 'light', 'landing-ref--d-light');
await landing(390, 844, 'light', 'landing-ref--phone');
let p = await demo(1280, 900, 'light');
await shot(p, 'friends--d-light', "S.ui.friendsView = 'friends'; SOC.friend = null; showTab('friends'); scrollTo(0, 0);");
await shot(p, 'profile-head--d-light', "showTab('profile'); scrollTo(0, 0);", '#profileHead');
if (isNew) {
  await shot(p, 'invite--d-light', "S.ui.friendsView = 'invite'; SOC.friend = null; showTab('friends'); scrollTo(0, 0);");
  await shot(p, 'invite-gift--d-light', "showTab('timer'); showRewardReveal({ kicker: 'Invite milestone', title: '3 friends joined and stayed', items: ['frame_i_link'], coins: 150, pal: ['#2f8f83', '#f0a35f'], note: 'Next: 5 friends', key: 'shot' + Date.now() });", '#rewardDlg', 1600);
  await shot(p, 'invite-welcome--d-light', "showTab('timer'); showRewardReveal({ kicker: 'Welcome gift', title: 'Three days in. Nice start.', items: ['ti_i_newleaf'], coins: 150, pal: ['#2f8f83', '#7cc07a'], note: '@siverieg gets a thank-you too.', key: 'shotw' + Date.now() });", '#rewardDlg', 1600);
  await shot(p, 'friend-profile--d-light', "S.ui.friendsView = 'friends'; showTab('friends'); await openFriend('demo_f4'); scrollTo(0, 0);", '.fp-head');
  await p.context().close(); p = await demo(1280, 900, 'dark');
  await shot(p, 'invite--d-dark', "S.ui.friendsView = 'invite'; SOC.friend = null; showTab('friends'); scrollTo(0, 0);");
  await p.context().close(); p = await demo(390, 844, 'light');
  await shot(p, 'invite--phone', "S.ui.friendsView = 'invite'; SOC.friend = null; showTab('friends'); scrollTo(0, 0);");
  await shot(p, 'invite-2--phone', "S.ui.friendsView = 'invite'; SOC.friend = null; showTab('friends'); scrollTo(0, 620);");
}
await b.close();
