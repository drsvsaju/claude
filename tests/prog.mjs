import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html?emulator=1';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
async function device(name, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, ...opts }); await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); { const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('dialog', d => d.accept());
  p.toasts = [];
  await p.exposeFunction('__toast', m => p.toasts.push(m));
  await p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('toast-item') && window.__toast(n.textContent)))).observe(document.getElementById('toast'), { childList: true })); });
  return { ctx, p };
}
const finishFocus = (p, min) => p.evaluate(m => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); S.timer.planned = m * 60000; S.timer.focusStartedAt = Date.now() - m * 60000; S.timer.endAt = Date.now() - 1; }, min);
const g = p => p.evaluate(() => { const x = game(); return { lvl: x.lv.level, xp: x.xp, coins: x.balance, earned: x.earned, spent: x.spent, tier: x.tier.name, owned: [...x.owned].sort().join(','), freezes: x.freezesHeld, invalid: x.invalid.length, ach: Object.keys(S.game.claims.achievements).length }; });

// ---------- 1. Guest mode with a long history ----------
const D = await device('guest');
await D.p.goto(U);
await D.p.evaluate(() => {
  const sessions = [], now = new Date(); let n = 0;
  for (let day = 40; day >= 1; day--) {
    if (day === 1) continue;                                   // nothing yesterday
    for (const [h, min] of [[6, 25], [10, 50], [15, 25]]) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, h, 0);
      sessions.push({ id: 'g' + n++, name: ['Physics', 'Maths', 'Chemistry', 'Biology', 'English', 'Revision'][n % 6], start: +d, end: +d + min * 60000, duration: min * 60000, planned: min * 60000, preset: min === 50 ? 'Deep Work 50/10' : 'Classic 25/5' });
    }
  }
  localStorage.setItem('focus-app-v1', JSON.stringify({ sessions }));
});
await D.p.reload(); await D.p.waitForSelector('#authView:not(.hidden)');
await D.p.click('#guestBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(800);
let st = await g(D.p);
const expXP = await D.p.evaluate(() => S.sessions.reduce((a, s) => { const m = Math.floor(s.duration / 60000); return a + Math.round(m * (m >= 45 ? 1.1 : 1)); }, 0));
log('guest retro:', JSON.stringify(st), 'expected XP', expXP);
log('guest intro toast:', D.p.toasts[0]);
log('header chip:', await D.p.textContent('#lvChip'));
log('streak (yesterday missed, no freeze):', await D.p.textContent('#curStreak'), await D.p.textContent('#bestStreak'));
await D.p.click('#lvChip'); await wait(300); await D.p.screenshot({ path: 'p-progress.png', fullPage: true });
await D.p.evaluate(() => showTab('shop')); await D.p.click('[data-cat=theme]'); await wait(200); await D.p.screenshot({ path: 'p-shop-themes.png', fullPage: true });
// buy forest theme + dots ring + freeze via UI
await D.p.click('[data-buy=th_forest]'); await wait(200);
log('after forest: --bg', await D.p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg')), JSON.stringify(await g(D.p)));
await D.p.click('[data-cat=ring]'); await D.p.click('[data-buy=ring_dots]'); await D.p.click('[data-cat=freeze]');
log('freeze buttons:', await D.p.textContent('#shopView .shopgrid'));
await D.p.click('[data-buy=freeze]'); await wait(200);
log('after buying freeze:', JSON.stringify(await g(D.p)), 'locked starfield?', await D.p.evaluate(() => { S.ui.shopCat = 'theme'; renderShop(); return document.querySelector('[data-buy=th_starfield]') === null; }));
// Freeze bought today can't repair yesterday:
await D.p.reload(); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(500);
log('freeze bought today -> used?', await D.p.evaluate(() => Object.keys(S.game.freezesUsed).length), 'streak', await D.p.textContent('#curStreak'));
// Pretend it was bought 2 days ago:
await D.p.evaluate(() => { const p = Object.values(S.game.purchases).find(p => p.item === 'freeze'); p.at = Date.now() - 2 * 864e5; save(); });
await D.p.reload(); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(500);
log('freeze bought earlier -> used:', await D.p.evaluate(() => JSON.stringify(Object.keys(S.game.freezesUsed))), 'streak', await D.p.textContent('#curStreak'), await D.p.textContent('#bestStreak'), 'held', (await g(D.p)).freezes, 'toast:', D.p.toasts.filter(t => /Freeze/.test(t)));
await D.p.evaluate(() => showTab('timer')); await wait(300);
log('ring class:', await D.p.getAttribute('#ring', 'class'));
// Session -> toast + level up
const before = await g(D.p);
await D.p.evaluate(() => { const need = game().lv.need - game().lv.into; window.__need = need; });
const need = await D.p.evaluate(() => window.__need);
await wait(9000); D.p.toasts.length = 0; await finishFocus(D.p, Math.max(25, need + 1)); await wait(1200);
const after = await g(D.p);
log('session toast:', D.p.toasts.filter(t => /XP/.test(t)).slice(-1)[0], 'lvl', before.lvl, '->', after.lvl, 'dialog open:', await D.p.evaluate(() => $('#levelDlg').open), await D.p.textContent('#lvTitle'));
await D.p.screenshot({ path: 'p-levelup.png' });
// Tier-up rendering (simulate 9 -> 10)
await D.p.evaluate(() => { $('#levelDlg').close(); showLevelUp(9, 10); });
await wait(1200); log('tier-up class:', await D.p.evaluate(() => $('#levelDlg').className), await D.p.textContent('#lvKicker'), await D.p.textContent('#lvTitle'));
await D.p.screenshot({ path: 'p-tierup.png' });
await D.p.evaluate(() => $('#levelDlg').close());
// Gamification off
await D.p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); showTab('settings'); }); await wait(300); await D.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await D.p.check('#setMinimal'); /* the egg-hatch reveal can be open after 5 h of focus */ await wait(200);
log('gamification off: chip hidden', await D.p.evaluate(() => $('#lvChip').classList.contains('hidden')), 'shop+quests hidden, board shown', await D.p.evaluate(() => !$('#boardTabBtn').classList.contains('hidden') && $('#shopTabBtn').classList.contains('hidden') && $('#questTabBtn').classList.contains('hidden')), 'avatar shown', await D.p.evaluate(() => !$('#avatarBtn').classList.contains('hidden')));
await wait(8000); D.p.toasts.length = 0; await finishFocus(D.p, 25); await wait(1500);
log('toast when off:', D.p.toasts);
await D.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await D.p.uncheck('#setMinimal');
// export has game
const exp = await D.p.evaluate(() => { const { timer, ui, pendingSessions, profileDirty, ...data } = S; return Object.keys(data.game.purchases).length; });
log('export purchases:', exp);
// starfield + dark screenshot
await D.p.evaluate(() => { S.game.purchases.test = { item: 'th_starfield', price: 0, at: Date.now() - 1e9 }; S.game.equipped.theme = 'th_starfield'; S.game.equipped.x_zen = false; save(); applyCosmetics(); showTab('timer'); });
await wait(600); await D.p.screenshot({ path: 'p-starfield.png' });
log('starfield canvas visible:', await D.p.evaluate(() => !$('#starCanvas').classList.contains('hidden')));

// ---------- 2. Cloud: two devices, live shop sync, offline double-spend ----------
const A = await device('A'), B = await device('B');
await A.p.goto(U); await A.p.waitForSelector('#authView:not(.hidden)');
await A.p.click('[data-mode=signup] >> visible=true'); await A.p.fill('#authUser', 'gamer_1'); await A.p.fill('#authPass', 'secret1'); await A.p.fill('#authPass2', 'secret1');
await A.p.click('#authSubmit'); await A.p.waitForSelector('#appView:not(.hidden)'); await wait(1500);
for (let i = 0; i < 12; i++) { await finishFocus(A.p, 25); await wait(400); }
await wait(2500);
const a1 = await g(A.p);
await B.p.goto(U); await B.p.waitForSelector('#authView:not(.hidden)');
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', 'gamer_1'); await B.p.fill('#authPass', 'secret1'); await B.p.click('#authSubmit');
await B.p.waitForSelector('#appView:not(.hidden)'); await wait(2500);
const b1 = await g(B.p);
log('A', JSON.stringify(a1)); log('B', JSON.stringify(b1)); log('A and B match:', JSON.stringify(a1) === JSON.stringify(b1));
// A buys mono theme; B sees it
await A.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
await B.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
await A.p.evaluate(() => { S.ui.shopCat = 'theme'; showTab('shop'); });
// a level-up from the blocks above can pop up a moment later and cover the button: close pop-ups and retry
for (let i = 0; ; i++) { await A.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await wait(300); try { await A.p.click('[data-buy=th_mono]', { timeout: 3000 }); break; } catch (e) { if (i >= 4) throw e; } }
await wait(2500);
log('B after A bought mono:', JSON.stringify(await g(B.p)), 'B theme bg', await B.p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg')));
// earn some more, then both devices go offline and spend the same coins
await A.p.evaluate(() => showTab('timer'));
for (let i = 0; i < 20; i++) { await finishFocus(A.p, 25); await wait(400); }
await wait(3000);
await A.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
const bal = (await g(A.p)).coins;
const pick = await A.p.evaluate(bal => ITEMS.filter(i => ['sound', 'ring', 'font', 'color', 'frame', 'theme', 'effect', 'avatar', 'ambient', 'trail', 'stamp'].includes(i.cat) && i.price > bal / 2 && i.price <= bal && !i.lvl && !i.gprice).map(i => [i.id, i.cat, i.price]), bal);
const [ia, ib] = [pick[0], pick.find(x => x[0] !== pick[0][0])];
log('balance before double-spend', bal, 'A buys', ia, 'B buys', ib, '(sum', ia[2] + ib[2], '> balance)');
log('B sees same balance:', (await g(B.p)).coins);
await A.ctx.setOffline(true); await B.ctx.setOffline(true);
await A.p.evaluate(() => window.dispatchEvent(new Event('offline'))); await B.p.evaluate(() => window.dispatchEvent(new Event('offline')));
await A.p.evaluate(c => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.ui.shopCat = c; showTab('shop'); }, ia[1]); await A.p.evaluate(id => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); document.querySelector(`[data-buy=${id}]`).click(); }, ia[0]);   // the first egg's hatch reveal (1.16) may be open after 5 h of focus
await wait(30);
await B.p.evaluate(c => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.ui.shopCat = c; showTab('shop'); }, ib[1]); await B.p.evaluate(id => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); document.querySelector(`[data-buy=${id}]`).click(); }, ib[0]);
log('offline: A', JSON.stringify(await g(A.p))); log('offline: B', JSON.stringify(await g(B.p)));
await A.ctx.setOffline(false); await B.ctx.setOffline(false);
await A.p.evaluate(() => window.dispatchEvent(new Event('online'))); await B.p.evaluate(() => window.dispatchEvent(new Event('online')));
await wait(9000);
await A.p.evaluate(() => reconcileRewards('quiet')); await B.p.evaluate(() => reconcileRewards('quiet'));
const a2 = await g(A.p), b2 = await g(B.p);
log('after reconnect A', JSON.stringify(a2)); log('after reconnect B', JSON.stringify(b2));
log('converged:', JSON.stringify(a2) === JSON.stringify(b2), '| never negative:', a2.coins >= 0, '| refund toast A/B:', A.p.toasts.some(t => /refunded/.test(t)), B.p.toasts.some(t => /refunded/.test(t)));
log('B equipped falls back to default when refunded:', await B.p.evaluate(c => equippedId(c), ib[1]), await A.p.evaluate(c => equippedId(c), ia[1]));
await A.p.setViewportSize({ width: 390, height: 844 }); await A.p.evaluate(() => { S.ui.shopCat = 'theme'; showTab('shop'); }); await wait(200); await A.p.screenshot({ path: 'p-shop-mobile.png' });
await A.p.evaluate(() => showTab('timer')); await wait(200); await A.p.screenshot({ path: 'p-timer-mobile.png' });
log('errors', errs);
await b.close();
