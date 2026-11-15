// v1.14.3 bug hunt — regression tests: a device clock a few minutes ahead (friend activity used to be refused), the
// Quests / greeting refreshing at midnight (a new week's boss appeared only after a tab change), a focus block across
// midnight, double-clicks and rapid tab switching, very long or HTML-looking names from another device, a 3,000-session
// history, going offline mid-session, two devices adding to-dos at once, and listeners cleared on logout.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, focus, ownerGet, tryOp } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const guest = async (w = 1280, opts = {}) => {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 } });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); });
  if (opts.clock) await ctx.clock.install({ time: opts.clock });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('guest: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('guest console: ' + m.text()); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)');
  if (opts.clock) await ctx.clock.runFor(1500); else await wait(1200);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
};
// ---------- 1. a device clock a few minutes ahead ----------
const A = await device('A', 1100);
await signup(A, 'bh_' + R);
await A.ev(() => { S.settings.shareActivity = true; save(); });
const ACT = ahead => `() => FB.setDoc(FB.doc(FB.db, 'activity', USER.uid), { ...activityDoc(), recent: [{ id: 'x', t: Date.now() + ${ahead}, min: 25, name: 'Physics' }], updatedAt: FB.serverTimestamp() })`;
check('Activity written from a clock 5 minutes ahead is accepted (it used to be refused, so friends never saw it)', (await tryOp(A, ACT(5 * 60000))) === 'ALLOWED');
check('…20 minutes ahead is still refused (nothing can be dated in the future)', (await tryOp(A, ACT(20 * 60000))) === 'permission-denied');
// ---------- 2. midnight on a Sunday: the new week's boss shows without a tab change; the greeting changes ----------
{
  const sun = new Date(2026, 10, 1, 23, 59, 50);   // Sunday 1 Nov 2026, 23:59:50 local
  const G = await guest(1280, { clock: sun });
  await G.ev(() => showTab('quests')); await G.ctx.clock.runFor(300);
  const before = await G.ev(() => ({ boss: bossOfWeek().name, shown: $('#tab-quests').textContent.includes(bossOfWeek().name), day: lastDay, greet: $('#greet').textContent }));
  await G.ctx.clock.runFor(15000);
  const after = await G.ev(() => ({ boss: bossOfWeek().name, shown: $('#tab-quests').textContent.includes(bossOfWeek().name), day: lastDay, greet: $('#greet').textContent, today: dayKey(new Date()) }));
  check('Midnight into a new week: the Quests tab now shows the new boss without a tab change', before.shown && after.shown && after.boss !== before.boss && after.day === '2026-11-02', JSON.stringify({ before, after }));
  await G.ctx.close();
}
// a focus block across midnight is split across both days
{
  const G = await guest(1280, { clock: new Date(2026, 10, 3, 23, 58, 30) });
  await G.ev(() => { S.timer.planned = 3 * 60000; S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); S.timer.planned = 3 * 60000; S.timer.endAt = Date.now() + 3 * 60000; });
  await G.ctx.clock.runFor(3 * 60000 + 2000);
  const r = await G.ev(() => { const idx = buildIndex(); return { n: S.sessions.length, d3: (idx['2026-11-03'] || {}).total || 0, d4: (idx['2026-11-04'] || {}).total || 0 }; });
  check('A focus block across midnight is logged once and counted on both days (1.5 min + 1.5 min)', r.n === 1 && r.d3 >= 1 && r.d4 >= 1 && r.d3 + r.d4 === 3, JSON.stringify(r));
  await G.ctx.close();
}
// ---------- 3. double-clicks and rapid tab switching ----------
{
  const G = await guest();
  await G.p.click('#mainBtn', { clickCount: 2 }); await wait(400);
  const t = await G.ev(() => ({ status: S.timer.status, sessions: S.sessions.length }));
  check('Double-clicking Start starts one timer (not start + pause, not two sessions)', t.status === 'running' && t.sessions === 0, JSON.stringify(t));
  await G.ev(() => $('#resetBtn').click()); await wait(200);
  const tabs = await G.ev(() => { for (let i = 0; i < 20; i++) showTab(['stats', 'quests', 'reminders', 'friends', 'clan', 'profile', 'board', 'shop', 'timer'][i % 9]); showTab('stats'); return { tab: S.ui.tab, active: [...document.querySelectorAll('.tab.active')].map(s => s.id), nav: [...document.querySelectorAll('#tabs [data-tab].active')].map(b => b.dataset.tab) }; });
  check('20 tab switches in a row: one active section, the nav agrees', tabs.tab === 'stats' && tabs.active.join() === 'tab-stats' && tabs.nav.join() === 'stats', JSON.stringify(tabs));
  await G.ctx.close();
}
// ---------- 4. very long and HTML-looking names arriving from another device ----------
{
  const G = await guest(390);
  await G.ev(() => { const now = Date.now(); const add = (name, i) => S.sessions.push({ id: 'ln' + i, name, start: now - (i + 1) * 3600e3, end: now - (i + 1) * 3600e3 + 25 * 60000, duration: 25 * 60000, planned: 25 * 60000, preset: 'Classic 25/5' });
    add('A'.repeat(400), 0); add('<img src=x onerror="window.__xss=1">', 1); add('Physics'.repeat(30), 2); save(); renderAll(); showTab('stats'); renderStats(); showTab('timer'); });
  await wait(600);
  const r = await G.ev(() => ({ xss: !!window.__xss, imgs: document.querySelectorAll('img[src="x"]').length, hscroll: document.documentElement.scrollWidth > innerWidth + 1, recent: !!$('#chips') }));
  check('Long / HTML-looking session names: escaped, no script runs, no sideways scroll on a phone', !r.xss && !r.imgs && !r.hscroll, JSON.stringify(r));
  await G.ev(() => showTab('stats')); await wait(500);
  check('…Stats renders them too', await G.ev(() => !(document.documentElement.scrollWidth > innerWidth + 1) && !!$('#tab-stats .card')));
  await G.ctx.close();
}
// ---------- 5. a 3,000-session history ----------
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1');
    const now = Date.now(), sessions = []; for (let d = 1; d <= 750; d++) for (let k = 0; k < 4; k++) { const st = now - d * 864e5 + (9 + k * 3) * 3600e3; sessions.push({ id: 's' + d + '_' + k, name: ['Physics', 'Maths', 'Chemistry'][(d + k) % 3], start: st, end: st + 25 * 60000, duration: 25 * 60000, planned: 25 * 60000, preset: 'Classic 25/5' }); }
    localStorage.setItem('focus-app-v1', JSON.stringify({ sessions })); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('big: ' + e.message));
  const t0 = Date.now(); await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)'); await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)');
  await p.waitForFunction(() => S.sessions.length > 2000); const load = Date.now() - t0; await wait(800); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  const r = await p.evaluate(() => { const a = performance.now(); showTab('stats'); const stats = performance.now() - a; const c = performance.now(); showTab('profile'); const prof = performance.now() - c; return { n: S.sessions.length, stats: Math.round(stats), prof: Math.round(prof), streak: game().streak.cur }; });
  check(`3,000 sessions: loads in ${load} ms, Stats draws in ${r.stats} ms, Profile in ${r.prof} ms, no errors`, r.n === 3000 && load < 15000 && r.stats < 3000 && r.prof < 3000, JSON.stringify(r));
  await ctx.close();
}
// ---------- 6. offline in the middle of a focus block ----------
await A.ev(() => { S.settings.globalBoard = true; save(); publishPublic(); }); await wait(1500);
const life0 = (await ownerGet('publicStats/' + (await A.ev(() => USER.uid)))).lifeMin;
await A.ctx.setOffline(true); await wait(300);
await focus(A, 25); await wait(1500);
const offline = await A.ev(() => ({ n: S.sessions.length, status: $('#syncStatus').className }));
await A.ctx.setOffline(false);
const ok = await until(A, async l0 => { try { const d = (await FB.getDocFromServer(FB.doc(FB.db, 'publicStats', USER.uid))).data(); return d.lifeMin >= l0 + 25; } catch (e) { return false; } }, life0, 20000);
check('A block finished offline is kept and reaches the leaderboard once back online', offline.n >= 1 && ok >= 0, JSON.stringify({ offline, life0, ok }));
// ---------- 7. two devices adding to-dos at the same moment ----------
const A2 = await device('A2', 1100);
await A2.p.goto('http://localhost:8000/index.html?emulator=1'); await A2.p.waitForSelector('#authView:not(.hidden)');
await A2.p.click('[data-mode=login] >> visible=true'); await A2.p.fill('#authUser', 'bh_' + R); await A2.p.fill('#authPass', 'secret12'); await A2.p.click('#authSubmit');
await A2.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(1500); await closeDlg(A2);
await Promise.all([A.ev(() => addTodo({ title: 'From device 1' })), A2.ev(() => addTodo({ title: 'From device 2' }))]);
const both = await until(A, () => S.todos.some(t => t.title === 'From device 2') && S.todos.some(t => t.title === 'From device 1'), null, 15000);
const both2 = await until(A2, () => S.todos.some(t => t.title === 'From device 1') && S.todos.some(t => t.title === 'From device 2'), null, 15000);
check('Two devices add a to-do at the same moment: both keep both (no overwrite)', both >= 0 && both2 >= 0, JSON.stringify({ both, both2 }));
// ---------- 8. logging out clears every listener and timer ----------
await A.ev(() => showTab('clan'));
const before = await A.ev(() => ({ unsubs: unsubs.length, user: !!USER }));
await A.p.evaluate(() => { logout(); }).catch(() => {});   // logout reloads the page
await A.p.waitForSelector('#authView:not(.hidden)', { timeout: 15000 }); await wait(800);
const after = await A.ev(() => ({ unsubs: unsubs.length, live: LIVE.unsubs.length, watch: !!liveWatch, user: !!USER, auth: !$('#authView').classList.contains('hidden') }));
check('Logout: listeners were live while signed in, none afterwards, back on the welcome page', before.user && before.unsubs > 0 && !after.user && after.unsubs === 0 && after.live === 0 && !after.watch && after.auth, JSON.stringify({ before, after }));
log('errors', JSON.stringify(errs.filter(e => !/permission|offline|Could not reach|unavailable|WebChannel|transport/i.test(e))));
log('failures', failCount());
await b.close();
process.exit(failCount() ? 1 : 0);
