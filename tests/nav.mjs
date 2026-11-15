import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html?emulator=1';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
const sfx = Date.now().toString(36).slice(-4);
async function device(name, w, h, scheme = 'light') {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
  await ctx.addInitScript(() => { const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('dialog', d => d.accept());
  return { ctx, p, name };
}
async function signup(d, user) {
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.click('[data-mode=signup] >> visible=true'); await d.p.fill('#authUser', user); await d.p.fill('#authPass', 'secret1'); await d.p.fill('#authPass2', 'secret1');
  await d.p.click('#authSubmit');
}
const ready = d => d.p.waitForFunction(() => typeof SOC !== 'undefined' && SOC.started && SOC.myStats !== undefined, null, { timeout: 15000 });
const close = d => d.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));

// ---------- phone: brand-new user gets the tour ----------
const P = await device('P', 390, 844);
await signup(P, 'nav_p' + sfx); await ready(P);
await P.p.waitForSelector('#tutDlg[open]', { timeout: 15000 });
log('tutorial shown:', await P.p.textContent('#tutStep'));
for (let i = 0; i < 4; i++) { await P.p.click('#tutNext'); await wait(150); }
await P.p.waitForSelector('#tour:not(.hidden)', { timeout: 5000 });
await wait(600);
const step = () => P.p.evaluate(() => ({ s: $('#tourStep').textContent, t: $('#tourText').textContent.slice(0, 40), spot: $('#tour .tour-spot').getBoundingClientRect().toJSON(), target: TOUR.steps[TOUR.i].el().getBoundingClientRect().toJSON() }));
let st = await step(); log('tour 1:', st.s, st.t, '| spot covers target:', Math.abs(st.spot.x + 6 - st.target.x) < 2 && Math.abs(st.spot.y + 6 - st.target.y) < 2);
await P.p.screenshot({ path: 'n-tour1-phone.png' });
await P.p.click('#tourNext'); await wait(200);
log('mid-glide spot transform:', await P.p.evaluate(() => getComputedStyle($('#tour .tour-spot')).transform));
await wait(500); st = await step(); log('tour 2:', st.s, st.t, '| on target:', Math.abs(st.spot.x + 6 - st.target.x) < 2);
await P.p.click('#tourNext'); await wait(600); await P.p.screenshot({ path: 'n-tour3-phone.png' });
for (let i = 0; i < 8; i++) { await P.p.click('#tourNext'); await wait(600); }   // 11 steps since 1.20 (Posts; 10 since 1.19.1, Study sessions; 9 since 1.15, Garden)
st = await step(); log('tour last:', st.s, st.t, '| button:', await P.p.textContent('#tourNext'));
await P.p.screenshot({ path: 'n-tour5-phone.png' });
await P.p.click('#tourNext'); await wait(300);
log('back in tutorial:', await P.p.textContent('#tutStep')); await P.p.click('#tutSkip'); await wait(200);
log('tour closed:', await P.p.evaluate(() => $('#tour').classList.contains('hidden')), '| stored:', await P.p.evaluate(() => localStorage.getItem('pomodorolist-tour-done')));
await P.p.reload(); await ready(P); await wait(2000);
log('tour after reload hidden:', await P.p.evaluate(() => $('#tour').classList.contains('hidden') && !$('#tutDlg').open));
await close(P);

// bottom bar geometry
log('bar:', JSON.stringify(await P.p.evaluate(() => { const r = $('#btmBar').getBoundingClientRect(); return { pos: getComputedStyle($('#btmBar')).position, bottom: Math.round(innerHeight - r.bottom), h: Math.round(r.height), visible: $$('#btmBar button').filter(b => b.offsetWidth).map(b => b.dataset.tab + (b.querySelector('span').offsetWidth ? '+label' : '')) }; })));
await P.p.screenshot({ path: 'n-phone-timer.png' });
// header shortcuts
log('coin pill text:', await P.p.textContent('#coinPill'));
await P.p.click('#coinPill'); await wait(400);
log('coin pill -> tab:', await P.p.evaluate(() => S.ui.tab), '| earn card:', await P.p.evaluate(() => ($('.earn-card') || {}).textContent), '| items shown:', await P.p.evaluate(() => $$('#shopView .item').length));
await P.p.screenshot({ path: 'n-phone-shop.png' });
log('active indicator under More (Shop is under More):', await P.p.evaluate(() => { const i = $('#btmBar > .seg-ind'), a = $('#navMore'); return Math.abs(i.getBoundingClientRect().left - a.getBoundingClientRect().left) < 2 && getComputedStyle(i).opacity; }));
await P.p.click('#lvChip'); await wait(400);
log('level chip -> tab:', await P.p.evaluate(() => S.ui.tab), '| profile head:', await P.p.evaluate(() => $('#profileHead').textContent.replace(/\s+/g, ' ').trim()));
await P.p.screenshot({ path: 'n-phone-profile.png', fullPage: true });
await P.p.click('#openSettings'); await wait(300);
log('settings open:', await P.p.evaluate(() => S.ui.tab), '| replay button:', await P.p.isVisible('#replayTour'));
await P.p.click('#settingsBack'); await wait(200); log('back ->', await P.p.evaluate(() => S.ui.tab));
// leaderboard empty state
await P.p.evaluate(() => showTab('board')); await wait(1500);
log('board empty state:', await P.p.evaluate(() => ($('#boardBody .cta-card') || {}).textContent));
await P.p.screenshot({ path: 'n-phone-board.png' });
await P.p.click('#boardAddFriend'); await wait(600);
log('add friend ->', await P.p.evaluate(() => S.ui.tab + ' focus:' + (document.activeElement && document.activeElement.id)));
// scroll memory
await P.p.setViewportSize({ width: 390, height: 420 }); await P.p.evaluate(() => showTab('stats')); await wait(400);
await P.p.evaluate(() => window.scrollTo(0, 500)); await wait(100);
const y1 = await P.p.evaluate(() => scrollY);
await P.p.evaluate(() => showTab('timer')); await wait(200); const yt = await P.p.evaluate(() => scrollY);
await P.p.evaluate(() => showTab('stats')); await wait(300);
log('scroll memory: stats', y1, '-> timer', yt, '-> stats', await P.p.evaluate(() => scrollY));
await P.p.setViewportSize({ width: 390, height: 844 });
// replay tour
await P.p.evaluate(() => showTab('settings')); await P.p.click('#replayTour'); await wait(700);
log('replay tutorial visible:', await P.p.evaluate(() => $('#tutDlg').open), await P.p.textContent('#tutStep'));
await P.p.keyboard.press('Escape'); await wait(300);
log('esc closes:', await P.p.evaluate(() => !$('#tutDlg').open));

// ---------- friends dot ----------
const Q = await device('Q', 1280, 800);
await signup(Q, 'nav_q' + sfx); await ready(Q); await wait(1500);
await Q.p.waitForSelector('#tutDlg[open]', { timeout: 15000 });
log('desktop tutorial shown:', await Q.p.evaluate(() => $('#tutDlg').open));
await Q.p.screenshot({ path: 'n-tour1-desktop.png' });
await Q.p.click('#tutSkip'); await close(Q);
await P.p.evaluate(() => showTab('timer'));
await Q.p.evaluate(n => { showTab('friends'); $('#addFriendName').value = n; $('#addFriendForm').requestSubmit(); }, '@nav_p' + sfx); await wait(2000);
log('P friends dot:', await P.p.evaluate(() => !$('#friendsBadge').classList.contains('hidden')));
await P.p.screenshot({ path: 'n-phone-dot.png' });
await Q.p.screenshot({ path: 'n-desktop-friends.png' });
await Q.p.evaluate(() => showTab('board')); await wait(1200); await Q.p.screenshot({ path: 'n-desktop-board.png' });
await Q.p.evaluate(() => showTab('shop')); await wait(500); await Q.p.screenshot({ path: 'n-desktop-shop.png' });
// tablet
await Q.p.setViewportSize({ width: 800, height: 900 }); await Q.p.evaluate(() => showTab('timer')); await wait(500);
await Q.p.screenshot({ path: 'n-tablet.png' });
log('tablet stacked labels:', await Q.p.evaluate(() => getComputedStyle($('#tabs [data-tab]')).flexDirection), '| header overflow:', await Q.p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
// dark + other themes on the phone bar
const D = await device('D', 360, 760, 'dark');
await D.p.goto(U); await D.p.waitForSelector('#authView:not(.hidden)'); await D.p.click('#guestBtn'); await wait(1200);
await D.p.screenshot({ path: 'n-phone-dark-guest.png' });
await D.p.waitForSelector('#tutDlg[open]', { timeout: 8000 });
log('guest tutorial shown:', await D.p.evaluate(() => $('#tutDlg').open), await D.p.textContent('#tutStep'));
await D.p.click('#tutSkip');
log('360px overflow:', await D.p.evaluate(() => document.documentElement.scrollWidth > innerWidth), '| labels clipped:', await D.p.evaluate(() => $$('#btmBar button span').filter(s => s.offsetWidth && s.scrollWidth > s.offsetWidth).map(s => s.textContent)));
await D.p.evaluate(() => showTab('board')); await wait(300); log('guest board:', await D.p.evaluate(() => $('#boardBody').textContent.replace(/\s+/g, ' ').trim().slice(0, 60)));
await D.p.screenshot({ path: 'n-phone-dark-board.png' });
await D.p.evaluate(() => { S.settings.gamification = false; save(); renderAll(); showTab('timer'); }); await wait(300);
log('game off bar:', await D.p.evaluate(() => $$('#btmBar button').filter(b => b.offsetWidth).map(b => b.dataset.tab).join(',')), '| avatar:', await D.p.isVisible('#avatarBtn'));
await D.p.click('#avatarBtn'); await wait(300); log('avatar ->', await D.p.evaluate(() => S.ui.tab), await D.p.evaluate(() => $('#progressView').textContent.trim().slice(0, 50)));
await D.p.screenshot({ path: 'n-phone-dark-gameoff.png' });
log('errors', errs);
await b.close();
