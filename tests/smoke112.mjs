// Quick smoke test for v1.12 (guest): no errors, quests/bag/questline render, screenshots.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
const W = +(process.argv[2] || 1280), H = W < 700 ? 820 : 900, theme = process.argv[3] || 'light';
const ctx = await b.newContext({ viewport: { width: W, height: H }, colorScheme: theme, hasTouch: W < 700, isMobile: W < 700 });
await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-guest', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '1.12'); localStorage.setItem('pomodorolist-login-later', new Date().toISOString().slice(0, 10)); });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
const p = await ctx.newPage();
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 200)); });
await p.goto('http://localhost:8000/index.html?emulator=1');
await p.waitForSelector('#appView:not(.hidden)');
await wait(1500);
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
console.log('boss of week:', await ev(() => bossOfWeek().name), '| event:', await ev(() => (currentEvent() || {}).name));
// some history: sessions this week
await ev(() => {
  const now = Date.now(), ss = [];
  for (let d = 0; d < 20; d++) for (let k = 0; k < 2; k++) { const st = new Date(); st.setDate(st.getDate() - d); st.setHours(d % 4 === 0 ? 21 : 9 + k * 3, 0, 0, 0); if (+st > now - 3600e3) continue; ss.push({ id: `s${d}_${k}`, name: ['Physics', 'Maths', 'Chem'][d % 3], start: +st, end: +st + 50 * 6e4, duration: 50 * 6e4, planned: 50 * 6e4 }); }
  S.sessions.push(...ss); S.sessions.sort((a, b) => a.start - b.start); save(); renderAll();
});
await wait(500);
await ev(() => showTab('quests')); await wait(1800);
await p.screenshot({ path: `s112-boss-${W}-${theme}.png`, fullPage: true });
console.log('battle:', JSON.stringify(await ev(() => { const s = bossState(); return { boss: s.boss.id, hp: s.hp, dmg: s.dmg, phase: s.phase, done: !!s.done }; })));
await ev(() => { $('[data-qview="quest"]').click(); }); await wait(800);
await p.screenshot({ path: `s112-quest-${W}-${theme}.png`, fullPage: true });
console.log('quests:', JSON.stringify(await ev(() => questState(currentEvent()).qs.map(q => `${q.kind}:${Math.round(q.raw * 10) / 10}/${q.goal}${q.done ? '✓' : ''}`))));
await ev(() => showTab('bag')); await wait(600);
await p.screenshot({ path: `s112-bag-empty-${W}-${theme}.png`, fullPage: true });
// grant some rewards and buy something, then the bag
await ev(() => { grantItems(['th_b_dragon', 'au_b_dragon', 'col_b_hydra', 'au_b_hydra_sq', 'av_bat', 'ti_ghost', 'skin_pumpkin', 'ring_candle', 'snd_boo', 'frame_cobweb', 'col_ev_hw26', 'skin_lantern'], 'boss:dragon:solo', Date.now()); S.game.purchases.x1 = { item: 'av_cat', price: 60, at: Date.now() - 1000 }; save(); renderBag(); });
await wait(400);
await ev(() => showTab('timer')); await ev(() => showTab('bag')); await wait(600);
await p.screenshot({ path: `s112-bag-${W}-${theme}.png`, fullPage: true });
console.log('bag items:', await ev(() => bagItems().map(x => x.it.id + '@' + x.src.label).join(', ')));
await ev(() => { bagEquip('au_b_hydra_sq'); bagEquip('col_b_hydra'); bagEquip('skin_lantern'); bagEquip('ti_ghost'); bagEquip('th_b_dragon'); bagEquip('ring_candle'); bagEquip('frame_cobweb'); });
await wait(600);
await p.screenshot({ path: `s112-bag-eq-${W}-${theme}.png`, fullPage: true });
await ev(() => showTab('timer')); await wait(800);
await p.screenshot({ path: `s112-timer-${W}-${theme}.png` });
await ev(() => showTab('profile')); await wait(800);
await p.screenshot({ path: `s112-profile-${W}-${theme}.png`, fullPage: true });
await ev(() => showRewardReveal({ kicker: 'Solo victory', title: 'Deadline Hydra', items: ['th_b_hydra', 'au_b_hydra'], pal: ['#1f9e8f', '#3dbb7a'] })); await wait(1400);
await p.screenshot({ path: `s112-reveal-${W}-${theme}.png` });
console.log('errors:', JSON.stringify(errs));
await b.close();
