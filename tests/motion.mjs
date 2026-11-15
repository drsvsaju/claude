import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
async function page(w, h, scheme = 'light') {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme }); await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); { const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => d.accept());
  return p;
}
const p = await page(1100, 860);
await p.goto('http://localhost:8000/index.html?emulator=1');
await p.evaluate(() => {
  const sessions = [], now = new Date(); let n = 0;
  for (let day = 20; day >= 0; day--) for (const [h, min] of [[9, 25], [14, 50]]) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, h, 0);
    if (+d + min * 60000 > Date.now()) continue;
    sessions.push({ id: 'm' + n++, name: ['Physics', 'Maths', 'Chemistry'][n % 3], start: +d, end: +d + min * 60000, duration: min * 60000, planned: min * 60000, preset: 'Classic 25/5' });
  }
  localStorage.setItem('focus-app-v1', JSON.stringify({ sessions }));
});
await p.reload(); await p.waitForSelector('#authView:not(.hidden)');
// error shake on the login form
await p.fill('#authUser', 'ab'); await p.fill('#authPass', 'x'); await p.click('#authSubmit');
log('auth error shake:', await p.evaluate(() => $('#authForm').classList.contains('shake')));
await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(3000);
log('motion level:', await p.evaluate(() => document.documentElement.dataset.motion));
log('greeting:', await p.textContent('#greet'), '| mascot:', await p.getAttribute('#mascot', 'data-state'), '| goal ring:', await p.evaluate(() => !!$('#lvChip .gring .gp')));
log('flame lit:', await p.evaluate(() => !!$('#curStreak .flame.lit')), '| today bar transform:', await p.evaluate(() => $('#todayBar').style.transform));
await p.screenshot({ path: 'm-idle.png' });

// focus running: dim, live ring, digits, morphing button
await p.evaluate(() => { $('#nameInput').value = 'Physics – Rotation'; onNameChange(); });
await p.click('#mainBtn'); await wait(1300);
log('running:', JSON.stringify(await p.evaluate(() => ({ dim: document.body.classList.contains('focus-dim'), live: $('#ring').classList.contains('ring-live'), btnRunning: $('#mainBtn').classList.contains('running'), label: $('#mainBtn .mb-lbl').textContent, digitSlots: $$('#timeText .dg').length, mascot: $('#mascot').dataset.state, raf: ringRAF > 0 }))));
const off1 = await p.evaluate(() => $('#ringProg').style.strokeDashoffset); await wait(120); const off2 = await p.evaluate(() => $('#ringProg').style.strokeDashoffset);
log('ring changes between frames (smooth drain):', off1 !== off2, off1, off2);
await p.screenshot({ path: 'm-running.png' });
// last 10 seconds
await p.evaluate(() => { S.timer.endAt = Date.now() + 8000; S.timer.planned = 25 * 60000; S.timer.focusStartedAt = Date.now() - 25 * 60000 + 8000; });
await wait(400);
log('final pulse class:', await p.evaluate(() => $('#ring').classList.contains('final')));
// completion
await p.evaluate(() => { S.timer.endAt = Date.now() - 1; });
await wait(350);
log('complete:', JSON.stringify(await p.evaluate(() => ({ celebrate: $('#ring').classList.contains('celebrate'), mascot: $('#mascot').dataset.state, floaters: $$('#ring .floater').map(f => f.textContent) }))));
await wait(500); await p.screenshot({ path: 'm-complete.png' });
await wait(600);
log('digits bounce after burst:', await p.evaluate(() => $('#timeText').classList.contains('bounce')), '| dim off:', await p.evaluate(() => !document.body.classList.contains('focus-dim')));
await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await wait(300);
// break: breathing + sleepy mascot
await p.click('#mainBtn'); await wait(600);
log('break:', JSON.stringify(await p.evaluate(() => ({ phase: S.timer.phase, breathing: $('#ring').classList.contains('breathing'), mascot: $('#mascot').dataset.state }))));
await p.screenshot({ path: 'm-break.png' });
await p.click('#resetBtn'); await p.click('#resetBtn'); await wait(300);

// toast stack
await p.evaluate(() => { toast('Preset added', 4000, true); toast('Backup downloaded', 4000, true); toast('Friend request sent to @bob', 4000, true); toast('Fourth toast pushes out the first', 4000); });
await wait(700);
log('visible toasts:', await p.evaluate(() => $$('#toast .toast-item:not(.out)').map(t => t.textContent)));
await p.screenshot({ path: 'm-toasts.png' });

// achievement card + level-up
await p.evaluate(() => showAchCard(ACHIEVEMENTS[4])); await wait(900);
log('achievement card shown:', await p.evaluate(() => $('#achCard').classList.contains('show')), await p.textContent('#achCard'));
await p.screenshot({ path: 'm-ach.png' });
await p.evaluate(() => showLevelUp(9, 10)); await wait(700);
log('level-up particles:', await p.evaluate(() => $$('#lvBadge .lvp').length), '| tierup:', await p.evaluate(() => $('#levelDlg').classList.contains('tierup')));
await p.screenshot({ path: 'm-levelup.png' });
await p.click('#lvClose'); await wait(100);
log('dialog closing animation class:', await p.evaluate(() => $('#levelDlg').classList.contains('closing')), '| still open during fade:', await p.evaluate(() => $('#levelDlg').open));
await wait(300); log('closed after:', await p.evaluate(() => !$('#levelDlg').open));

// segmented pill slides
await p.evaluate(() => showTab('stats')); await wait(500);
const seg1 = await p.evaluate(() => $('#statsSeg .seg-ind').style.transform);
await p.click('#statsSeg [data-view=year]');
const segMid = await p.evaluate(() => new Promise(r => setTimeout(() => r(getComputedStyle($('#statsSeg .seg-ind')).transform + ' | transition: ' + getComputedStyle($('#statsSeg .seg-ind')).transitionProperty), 140)));
await wait(600);
const seg2 = await p.evaluate(() => [$('#statsSeg .seg-ind').style.transform, $('#statsSeg [data-view=year]').offsetLeft]);
log('seg pill:', seg1, '→', seg2[0], '(button at', seg2[1] + 'px)', '| mid-slide matrix:', segMid);
log('charts animating:', await p.evaluate(() => $$('#statsBody svg.chart.anim').length), '| staggered lists:', await p.evaluate(() => $$('.stagger').length));
await p.click('#statsSeg [data-view=week]'); await wait(150); await p.screenshot({ path: 'm-stats-anim.png' }); await wait(700); await p.screenshot({ path: 'm-stats.png' });

// shop: count + coin drop + equip check
await p.evaluate(() => showTab('profile')); await wait(200); await p.evaluate(() => showTab('shop')); await wait(400);
const bal0 = await p.evaluate(() => $('#shopView [data-count=coins]').textContent);
await p.click('[data-buy=snd_bell]'); await wait(150);
log('coin drop:', await p.evaluate(() => $$('.coin-fly').length), '| balance counting:', bal0, '→', await p.evaluate(() => $('#shopView [data-count=coins]').textContent));
await wait(300); await p.screenshot({ path: 'm-shop-buy.png' });
await wait(900);
log('balance settled:', await p.evaluate(() => $('#shopView [data-count=coins]').textContent), '| equipped check drawn:', await p.evaluate(() => !!$('#shopView .item[data-id=snd_bell] .tag .ok-check')));
await p.evaluate(() => showTab('profile')); await wait(1200);
log('xp bar transform:', await p.evaluate(() => $('.xpbar i').style.transform));
await p.screenshot({ path: 'm-progress.png' });

// settings: switches + Animations setting
await p.evaluate(() => showTab('settings')); await wait(400);
await p.screenshot({ path: 'm-settings.png' });
await p.selectOption('#setMotion', 'off'); await wait(200);
log('motion off:', await p.evaluate(() => document.documentElement.dataset.motion), '| stored:', await p.evaluate(() => localStorage.getItem('pomodorolist-motion')));
await p.evaluate(() => showTab('timer')); await p.click('#mainBtn'); await wait(500);
log('off mode: plain digits', await p.evaluate(() => !$('#timeText .dg')), '| no rAF loop', await p.evaluate(() => ringRAF === 0), '| timer still runs', await p.evaluate(() => S.timer.status));
await p.click('#mainBtn');
await p.evaluate(() => showTab('settings')); await p.selectOption('#setMotion', 'reduced'); await wait(200);
log('reduced: effects off', await p.evaluate(() => REDUCED()));
await p.selectOption('#setMotion', 'full');

// phone, dark, a shop theme
const m = await page(390, 844, 'dark');
await m.goto('http://localhost:8000/index.html?emulator=1');
await m.evaluate(() => localStorage.setItem('focus-app-v1', JSON.stringify({ sessions: [] })));
await m.reload(); await m.waitForSelector('#authView:not(.hidden)'); await m.click('#guestBtn'); await wait(1200);
await m.screenshot({ path: 'm-phone-dark.png' });
await m.click('#mainBtn'); await wait(1500); await m.screenshot({ path: 'm-phone-running.png' });
log('errors', errs);
await b.close();
