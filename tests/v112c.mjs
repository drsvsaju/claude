// v1.12 upgrade: an account made with v1.11 (coins, purchases, equipped items, streak, sessions, reminders, an old-style
// boss trophy) opens in v1.12 on the same device (cache-first) and on a new device — nothing lost, still fast.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
async function device(name) {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 860 } });
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '1.12');
    localStorage.setItem('pomodorolist-login-later', new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')); }
    window.__seen = []; const t0 = performance.now();
    const iv = setInterval(() => { const app = document.getElementById('appView'), c = document.querySelector('#coinPill [data-count]'); if (!app || app.classList.contains('hidden')) return; window.__seen.push({ t: Math.round(performance.now() - t0), coins: c ? c.textContent : '', skel: document.body.classList.contains('first-load') }); if (window.__seen.length > 300) clearInterval(iv); }, 20); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource|WebChannel|transport errored|Could not reach Cloud Firestore/i.test(m.text())) errs.push(name + ' ' + m.type() + ': ' + m.text().slice(0, 180)); });
  return { ctx, p };
}
const ev = (d, f, a) => d.p.evaluate(f, a);
const ready = d => d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 30000 });
const user = 'up_' + Date.now().toString(36).slice(-5);
const snapshot = d => ev(d, () => {
  const g = game();
  return { balance: g.balance, owned: [...g.owned].filter(id => !/^stamp_b_/.test(id)).sort().join(),   // v1.13: boss emblem stamps are added for past wins (checked below)
    emblems: [...g.owned].filter(id => /^stamp_b_/.test(id)).length, equipped: ['theme', 'avatar', 'frame', 'color', 'pomhat', 'sound', 'ring'].map(c => equippedId(c)).join(), streak: g.streak.cur, longest: g.streak.longest, level: g.lv.level,
    sessions: S.sessions.length, reminders: S.reminders.map(r => r.id).sort().join(), freezes: g.freezesHeld, trophies: Object.keys(S.game.trophies).length, login: Object.keys(S.game.claims.login).length };
});
// 1. make the account with v1.11
const OLD = await device('v1.11');
await OLD.p.goto(`http://localhost:8000/base111.html?emulator=1`); await OLD.p.waitForSelector('#authView:not(.hidden)');
await OLD.p.click('[data-mode=signup] >> visible=true'); await OLD.p.fill('#authUser', user); await OLD.p.fill('#authPass', 'secret12'); await OLD.p.fill('#authPass2', 'secret12'); await OLD.p.click('#authSubmit');
await ready(OLD); await wait(1500);
await ev(OLD, () => { if ($('#tutDlg') && $('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
await ev(OLD, async () => {
  const add = [], now = Date.now();
  for (let d = 1; d <= 40; d++) for (let k = 0; k < 2; k++) { const st = new Date(); st.setDate(st.getDate() - d); st.setHours(8 + k * 5, 0, 0, 0); add.push({ id: `o${d}_${k}`, name: ['Physics', 'Maths'][k], start: +st, end: +st + 50 * 6e4, duration: 50 * 6e4, planned: 50 * 6e4 }); }
  S.sessions.push(...add); S.sessions.sort((a, b) => a.start - b.start); cloudAddSessions(add);
  G = null; reconcileRewards('quiet');
  S.game.purchases.p1 = { item: 'th_forest', price: 250, at: now - 2 * 864e5 }; S.game.purchases.p2 = { item: 'av_fox', price: 90, at: now - 2 * 864e5 + 1 };
  S.game.purchases.p3 = { item: 'frame_double', price: 120, at: now - 2 * 864e5 + 2 }; S.game.purchases.p4 = { item: 'freeze', price: 250, at: now - 2 * 864e5 + 3 };
  S.game.purchases.p5 = { item: 'hat_party', price: 80, at: now - 864e5 };
  Object.assign(S.game.equipped, { theme: 'th_forest', avatar: 'av_fox', frame: 'frame_double', pomhat: 'hat_party' });
  const wk = dayKey(addDays(weekStartOf(new Date(), 1), -14)), b = bossOfWeek(parseDay(wk));
  S.game.claims.bosses[wk] = now - 10 * 864e5; S.game.trophies[wk] = { boss: b.id, mode: 'solo', hp: 300, coins: 38, size: 1, at: now - 10 * 864e5 };
  S.reminders.push({ id: 'oldrem', title: 'Revise optics', date: dayKey(addDays(new Date(), 2)), time: '18:00', repeat: 'none', days: [], before: 10 });
  G = null; save(); pushProfile(true);
  await FB.waitForPendingWrites(FB.db);
});
await wait(1500);
const before = await snapshot(OLD);
log('v1.11 account:', JSON.stringify(before));
// 2. same browser opens v1.12 (cache-first)
await OLD.p.goto(`http://localhost:8000/index.html?emulator=1`);
await ready(OLD); await wait(2500);
const same = await snapshot(OLD);
const seen = await ev(OLD, () => window.__seen);
const firstApp = seen[0] ? seen[0].t : -1, coinsShown = [...new Set(seen.map(x => x.skel ? '(placeholder)' : x.coins))];
check('Same device after updating: coins, items, equipped look, streaks, level, sessions, reminders, freezes, trophy — all unchanged', JSON.stringify({ ...same, emblems: 0 }) === JSON.stringify({ ...before, emblems: 0 }), JSON.stringify(same));
check('v1.13: past boss wins also unlock their emblem stamps (one per beaten boss)', same.emblems === same.trophies, `${same.emblems} emblems / ${same.trophies} trophies`);
check('Cache-first start stays fast: app on screen within 300 ms with the final coin number, no counting', firstApp >= 0 && firstApp < 300 && coinsShown.length === 1, `app at ${firstApp} ms · coins shown ${coinsShown.join(' → ')}`);
const up = await ev(OLD, () => ({ bag: bagItems().filter(x => x.it.cat !== 'stamp').map(x => x.it.id + ':' + x.src.label).sort().join(), newN: bagNewCount(), pending: pendingBossRewards().map(p => p.boss.id + '|' + p.mode).join(), shelf: (showTab('profile'), $$('.trophy').length) }));
check('Bought items appear in the bag (source: Shop); nothing marked “New” just because of the update', up.bag === before.owned.split(',').map(x => x + ':Shop').join() && up.newN === 0, JSON.stringify(up));
check('Old-style trophies (from v1.11) are on the shelf and its boss rewards become claimable', up.shelf === before.trophies && up.pending.split(',').length === before.trophies && up.pending.split(',').every(x => x.endsWith('|solo')), JSON.stringify(up));
await OLD.ctx.close();
// 3. a new device logs in with v1.12
const NEW = await device('new');
await NEW.p.goto(`http://localhost:8000/index.html?emulator=1`); await NEW.p.waitForSelector('#authView:not(.hidden)');
await NEW.p.click('[data-mode=login] >> visible=true'); await NEW.p.fill('#authUser', user); await NEW.p.fill('#authPass', 'secret12'); await NEW.p.click('#authSubmit');
await ready(NEW); await wait(2500);
const fresh = await snapshot(NEW);
check('New device with v1.12: exactly the same account', JSON.stringify({ ...fresh, emblems: 0 }) === JSON.stringify({ ...before, emblems: 0 }) && fresh.emblems === same.emblems, JSON.stringify(fresh));
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
