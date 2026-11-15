// v1.17 Phase 2 — the logo goes home from everywhere, Finish early logs the minutes focused (5-min minimum) and counts
// everywhere, the garden glance on the Timer tab.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, until } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const A = await device('A', 1280);
await signup(A, 'fe_' + R);
await closeDlg(A);
// ---------- logo ----------
for (const [w, name] of [[1280, 'desktop'], [900, 'tablet'], [390, 'phone']]) {
  await A.p.setViewportSize({ width: w, height: 860 }); await wait(300);
  const r = await A.ev(() => { const out = []; for (const tab of ['stats', 'garden', 'profile', 'settings', 'friends', 'shop']) { showTab(tab); const vis = [...document.querySelectorAll('.brand')].filter(b => b.offsetParent !== null); (vis[0] || $('#brandBtn')).click(); out.push(S.ui.tab); } return { tabs: out, logos: document.querySelectorAll('.brand .logo svg').length, visible: [...document.querySelectorAll('.brand')].filter(b => b.offsetParent !== null).length }; });
  check(`${name}: the logo is a button that goes home from every tab`, r.tabs.every(t => t === 'timer') && r.logos === 2 && r.visible >= 1, JSON.stringify(r));
}
await A.p.setViewportSize({ width: 1280, height: 860 }); await wait(300);
const mini = await A.ev(() => { navMini(true); const hidden = getComputedStyle(document.querySelector('#brandBtn span:not(.brand-deco)')).display === 'none'; const logo = getComputedStyle(document.querySelector('#brandBtn .logo')).display !== 'none'; navMini(false); return { hidden, logo }; });
check('With the sidebar collapsed the header shows the logo alone', mini.hidden && mini.logo, JSON.stringify(mini));
// ---------- Finish early ----------
const before = await A.ev(() => { S.plants = S.plants.filter(p => p.sum); S.gbuys.push({ id: 'gb' + uid(), v: 1, item: 'seed_marigold', price: 0, at: Date.now(), slot: '' }); GD = null; gardenPlant(0, 'marigold'); save(); G = null; return { xp: game().xp, coins: game().balance, sessions: S.sessions.length, egg: eggFill(eggActive()), water: waterOf(garden().growing[0]), boss: bossBattle('solo').dmg, mins: (game().idx[dayKey(new Date())] || {}).total || 0 }; });
const btn = await A.ev(() => { showTab('timer'); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); return { label: $('#skipBtn').textContent, early: $('#skipBtn').classList.contains('early') }; });
check('During a focus block the Skip button reads "Finish early"', btn.label === 'Finish early' && btn.early, JSON.stringify(btn));
// 18 of 25 minutes focused, then Finish early
const toasts = await A.ev(() => { window.__toasts = []; const _t = toast; toast = (m, ...a) => { __toasts.push(String(m)); return _t(m, ...a); }; const t = S.timer; t.planned = 25 * 60000; t.focusStartedAt = Date.now() - 18 * 60000; t.endAt = Date.now() + 7 * 60000; t.remaining = 7 * 60000; $('#skipBtn').click(); return __toasts; });
await wait(1200);
const after = await A.ev(before => { G = null; const s = S.sessions[S.sessions.length - 1]; return { early: s.early, dur: Math.round(s.duration / 60000), planned: Math.round(s.planned / 60000), phase: S.timer.phase, status: S.timer.status, xp: game().xp - before.xp, coins: game().balance - before.coins, sessions: S.sessions.length - before.sessions, egg: eggFill(eggActive()) - before.egg, water: waterOf(garden().growing[0]) - before.water, boss: bossBattle('solo').dmg - before.boss, mins: ((game().idx[dayKey(new Date())] || {}).total || 0) - before.mins, label: $('#skipBtn').textContent }; }, before);
check('Finish early at 18 of 25 min logs an 18-minute session marked early and moves on to the break', after.early === 1 && after.dur === 18 && after.planned === 25 && after.phase !== 'focus' && after.status === 'idle' && after.sessions === 1 && after.label === 'Skip', JSON.stringify(after));
check('…the 18 minutes count for XP, coins, today\'s minutes, the garden, the egg and boss damage', after.xp > 0 && after.coins > 0 && Math.round(after.mins) === 18 && after.water === 18 && after.egg === 18 && after.boss === 18, JSON.stringify(after));
check('…the toast says "Finished early · 18m of 25m"', toasts.some(t => /Finished early · 18m of 25m/.test(t)), JSON.stringify(toasts));
// history mark
const hist = await A.ev(() => { showTab('stats'); S.ui.statsView = 'day'; renderStats(); const el = document.querySelector('.sesslist .early'); return { mark: !!el, title: el && el.title }; });
check('The history shows a small "early" mark with the minutes', hist.mark && /18m of 25m/.test(hist.title || ''), JSON.stringify(hist));
// under 5 minutes: nothing logged, the block is reset (not a break)
const under = await A.ev(() => { showTab('timer'); __toasts.length = 0; S.timer.phase = 'focus'; S.timer.status = 'idle'; S.timer.round = 1; startTimer(); const t = S.timer; t.planned = 25 * 60000; t.focusStartedAt = Date.now() - 3 * 60000; t.endAt = Date.now() + 22 * 60000; t.remaining = 22 * 60000; const n = S.sessions.length; $('#skipBtn').click(); return { logged: S.sessions.length - n, phase: S.timer.phase, status: S.timer.status, toasts: __toasts.slice() }; });
check('Finish early under 5 minutes logs nothing and resets the block (one toast)', under.logged === 0 && under.phase === 'focus' && under.status === 'idle' && under.toasts.length === 1 && /Under 5 minutes/.test(under.toasts[0]), JSON.stringify(under));
// a full block is not marked early; Reset still logs nothing
const full = await A.ev(() => { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); const t = S.timer; t.planned = 25 * 60000; t.focusStartedAt = Date.now() - 25 * 60000; t.endAt = Date.now(); finishPhase('complete'); const s = S.sessions[S.sessions.length - 1]; const n = S.sessions.length; S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); S.timer.planned = 25 * 60000; S.timer.focusStartedAt = Date.now() - 10 * 60000; S.timer.endAt = Date.now() + 15 * 60000; finishPhase('reset'); return { early: !!s.early, resetLogged: S.sessions.length - n }; });
check('A completed block carries no early mark; Reset after 10 minutes still logs nothing', !full.early && full.resetLogged === 0, JSON.stringify(full));
// ---------- garden glance ----------
const peek = await A.ev(() => { showTab('timer'); renderToday(); const el = $('#gardenPeek'), p = garden().growing[0]; return { shown: !el.classList.contains('hidden'), plants: el.querySelectorAll('.gp-plant').length, line: (el.querySelector('.gp-line') || {}).textContent, bar: el.querySelector('.gp-bar i').style.width, want: Math.round(waterOf(p) / needOf(p) * 100) + '%', togo: fmtMin(needOf(p) - waterOf(p)) }; });
check('The Timer tab shows the garden glance: the growing marigold with its bar and the minutes to go', peek.shown && peek.plants === 1 && /^Marigold is closest · \d+ XP \(≈ .+ of focus\) to go$/.test(peek.line) && peek.line.includes(peek.togo) && peek.bar === peek.want, JSON.stringify(peek));
const open = await A.ev(() => { $('#gardenPeek').click(); return S.ui.tab; });
check('Tapping the glance opens the Garden tab', open === 'garden', open);
const min = await A.ev(() => { showTab('timer'); S.settings.gamification = false; save(); renderAll(); const hidden = $('#gardenPeek').classList.contains('hidden'); S.settings.gamification = true; save(); renderAll(); return { hidden, back: !$('#gardenPeek').classList.contains('hidden') }; });
check('True Minimalist hides the glance; it returns with gamification', min.hidden && min.back, JSON.stringify(min));
// demo: the glance shows the sample garden and never writes
const D = await device('D', 1280, { noLogin: true, tag: 'demo' });
await D.p.goto('http://localhost:8000/index.html?emulator=1'); await D.p.waitForSelector('#authView:not(.hidden)');
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeDlg(D);
const demo = await D.ev(() => { showTab('timer'); renderToday(); const el = $('#gardenPeek'); const ls = Object.keys(localStorage).length; $('#brandBtn').click(); return { pv: isPreview(), shown: !el.classList.contains('hidden'), plants: el.querySelectorAll('.gp-plant').length, ls: Object.keys(localStorage).length === ls, tab: S.ui.tab }; });
check('Demo: the glance shows the sample plants, the logo works, nothing is written', demo.pv && demo.shown && demo.plants > 0 && demo.ls && demo.tab === 'timer', JSON.stringify(demo));
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
