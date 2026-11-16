// v1.13 stamps + card prefs, signed in, two browsers on one account: the stamp lands (animation, sound), equips,
// shows in the Day list and timeline, syncs; card prefs merge key by key; boss emblem unlocks; floatUp HP fix.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html?emulator=1';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
async function device(name, motion = 'full') {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 860 } });
  await ctx.addInitScript(motion => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '1.13'); localStorage.setItem('pomodorolist-motion', motion);
    localStorage.setItem('pomodorolist-login-later', new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'));
    window.__tones = 0; const O = window.AudioContext; window.AudioContext = class extends O { createOscillator() { window.__tones++; return super.createOscillator(); } createBufferSource() { window.__tones++; return super.createBufferSource(); } }; }, motion);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('dialog', dl => dl.accept());
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource|WebChannel|transport errored|Could not reach Cloud Firestore|Sync hiccup|offline mode|unavailable/i.test(m.text())) errs.push(name + ' ' + m.type() + ': ' + m.text().slice(0, 180)); });
  return { ctx, p, name };
}
const ev = (d, f, a) => d.p.evaluate(f, a);
const ready = d => d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 30000 });
const until = async (d, fn, arg, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(d, fn, arg)) return Date.now() - t0; await wait(150); } return -1; };
const closeDlg = d => ev(d, () => { if ($('#tutDlg') && $('#tutDlg').open && typeof finishTutorial === 'function') finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
async function signup(d, user) {
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.click('[data-mode=signup] >> visible=true'); await d.p.fill('#authUser', user); await d.p.fill('#authPass', 'secret12'); await d.p.fill('#authPass2', 'secret12'); await d.p.click('#authSubmit');
  await ready(d); await wait(1200); await closeDlg(d);
}
async function login(d, user) {
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.click('[data-mode=login] >> visible=true'); await d.p.fill('#authUser', user); await d.p.fill('#authPass', 'secret12'); await d.p.click('#authSubmit');
  await ready(d); await wait(1500); await closeDlg(d);
}
const finishFocus = (d, m) => ev(d, m => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('timer'); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); S.timer.planned = m * 60000; S.timer.focusStartedAt = Date.now() - m * 60000; S.timer.endAt = Date.now() - 1; }, m);
const sfx = Date.now().toString(36).slice(-5), user = 'st_' + sfx;
const A = await device('A'), B = await device('B');
await signup(A, user); await login(B, user);
// give A coins to buy stamps
await ev(A, () => { const add = []; for (let i = 0; i < 30; i++) { const st = Date.now() - (i + 2) * 864e5; add.push({ id: 'h' + i, name: i % 2 ? 'Maths' : 'Physics', start: st, end: st + 50 * 6e4, duration: 50 * 6e4, planned: 50 * 6e4 }); } S.sessions.push(...add); S.sessions.sort((a, b) => a.start - b.start); cloudAddSessions(add); G = null; reconcileRewards('quiet'); save(); });
await wait(1500);
// 1. default stamp lands on the session-complete card, with animation and a soft thump
await ev(A, () => { S.settings.sound = true; UIS.prefs.on = true; window.__tones = 0; });
await finishFocus(A, 25); await until(A, () => !!$('#noteRow .stamp-land'), null, 5000);   // the timer notices the end on its next tick
const land = await ev(A, () => { const el = $('#noteRow .stamp-land'); return el && { go: el.classList.contains('go'), anim: getComputedStyle(el.querySelector('.stamp-svg')).animationName, label: el.getAttribute('aria-label'), has: $('#noteRow').classList.contains('has-stamp') }; });
check('A finished block: the Classic seal lands on the session-complete card (press/bounce animation + ink spread)', land && land.go && land.anim === 'stampPress' && /Classic seal/.test(land.label) && land.has, JSON.stringify(land));
await wait(800);
check('… with the soft stamp sound (Sound on)', await ev(A, () => window.__tones >= 3), String(await ev(A, () => window.__tones)));
check('Before the boss is beaten, a session still shows the "⚔️ −HP" float', await ev(A, () => $$('#ring .floater').some(x => /HP/.test(x.textContent))));
check('The session remembers its stamp (session.stamp)', await ev(A, () => S.sessions[S.sessions.length - 1].stamp === 'stamp_classic'));
// 2. buy + equip a shop stamp; the bag shows Stamps
const bought = await ev(A, () => { S.ui.shopCat = 'stamp'; showTab('shop'); const n = $$('#shopView .item').length; const btn = $('#shopView [data-buy="stamp_tomato"]'); btn.click(); return { n, bal: game().balance }; });
for (let i = 0; i < 20 && !(await ev(A, () => !!$('#shopView [data-equip="stamp_tomato"]'))); i++) await wait(150);   // v2.0: the purchase lands once its confirm dialog is answered
await ev(A, () => { const e = $('#shopView [data-equip="stamp_tomato"]'); if (e) e.click(); });
await wait(400);
check('Shop → Stamps lists the stamps; buying + equipping the Tomato stamp works', bought.n >= 5 && await ev(A, () => equippedId('stamp') === 'stamp_tomato'), JSON.stringify(bought));
await ev(A, () => { showTab('bag'); S.ui.bagCat = 'stamp'; renderBag(); });
await wait(400);
const bag = await ev(A, () => ({ chip: !!$('#bagCats [data-bcat="stamp"]'), cards: $$('#bagList .bag-item').map(x => x.dataset.bid), eq: ($('#bagList .bag-item.equipped') || {}).dataset?.bid }));
check('Bag has a "Stamps" category with the free Classic seal and the bought Tomato stamp (equipped)', bag.chip && bag.cards.includes('stamp_classic') && bag.cards.includes('stamp_tomato') && bag.eq === 'stamp_tomato', JSON.stringify(bag));
// 3. sync: B sees the equip
const syncT = await until(B, () => equippedId('stamp') === 'stamp_tomato', null, 12000);
check('Equipped stamp syncs to the second browser', syncT >= 0, syncT + ' ms');
// 4. B finishes a block → tomato stamp; A sees it in Day list + timeline
await finishFocus(B, 30); await wait(1200);
check('B: the Tomato stamp lands', await ev(B, () => /Tomato stamp/.test(($('#noteRow .stamp-land') || { getAttribute: () => '' }).getAttribute('aria-label'))));
const seen = await until(A, () => S.sessions.some(s => s.stamp === 'stamp_tomato'), null, 12000);
await ev(A, () => { S.ui.statsView = 'day'; showTab('stats'); });
await wait(600);
const day = await ev(A, () => ({ list: $$('#statsView .sesslist .st-mini, .sesslist .st-mini').length, tl: $$('svg.timeline svg.tl-stamp').length, titles: $$('.sesslist .st-mini').map(x => x.title) }));
check('A: the session from B (with its stamp) syncs, and stamps show in the Day list and on the timeline', seen >= 0 && day.list >= 2 && day.tl >= 2 && day.titles.some(t => /Tomato/.test(t)), JSON.stringify(day));
// 5. motion off: no animation, stamp still shows; minimal: no stamp
await ev(A, () => { localStorage.setItem('pomodorolist-motion', 'off'); applyMotion(); });
await finishFocus(A, 25); await wait(700);
const off = await ev(A, () => { const el = $('#noteRow .stamp-land'); return el && { go: el.classList.contains('go'), anim: getComputedStyle(el.querySelector('.stamp-svg')).animationName }; });
check('Animations off: the stamp appears without animating', off && !off.go && off.anim === 'none', JSON.stringify(off));
await ev(A, () => { S.settings.sound = false; window.__tones = 0; });
await finishFocus(A, 25); await wait(900);
check('Sound off: no stamp sound', await ev(A, () => window.__tones === 0));
await ev(A, () => { S.settings.sound = true; setMinimal(true); });
await finishFocus(A, 25); await wait(700);
check('True Minimalist: no stamp on the card, none in the Day list', await ev(A, () => { S.ui.statsView = 'day'; showTab('stats'); return !$('#noteRow .stamp-land') && !$('.sesslist .st-mini') && !$('svg.tl-stamp'); }));
await ev(A, () => setMinimal(false));
await ev(A, () => { localStorage.setItem('pomodorolist-motion', 'full'); applyMotion(); });
// 6. card prefs: A changes the banner, B changes a privacy switch at the same time → both kept
await ev(A, () => setCardPref('banner', 'bn_dusk'));
await ev(B, () => setCardPref('p_sessions', false));
await wait(3000);
const prefs = await Promise.all([A, B].map(d => ev(d, () => ({ bn: cardPref('banner'), ss: cardPref('p_sessions') }))));
check('Card prefs merge key by key across two browsers (banner from A, privacy switch from B)', prefs.every(p => p.bn === 'bn_dusk' && p.ss === false), JSON.stringify(prefs));
await ev(A, () => { showTab('profile'); });
await wait(400);
check('Profile card follows the prefs (Dusk banner, Sessions hidden) and keeps .prof-acct + #openSettings', await ev(A, () => !!$('#profileHead .prof-acct .pcard') && !!$('#openSettings') && !/Sessions/.test($('#profileHead .pc-tiles').textContent) && cardData().bn === 'bn_dusk'));
// 7. boss emblem: a boss victory unlocks its emblem stamp (and floatUp shows no HP line after the win)
await ev(A, () => { const wk = dayKey(weekMonday()), boss = bossOfWeek(weekMonday()); S.game.claims.bosses[wk + '|solo'] = Date.now(); S.game.trophies[wk + '|solo'] = { boss: boss.id, mode: 'solo', hp: 100, coins: 30, size: 1, at: Date.now() }; S.settings.bossMode = 'solo'; G = null; save(); checkUnlocks(); });
await wait(500);
const emb = await ev(A, () => { const id = 'stamp_b_' + bossOfWeek(weekMonday()).id; return { own: isOwned(id), src: S.game.grants[id] && S.game.grants[id].src, bag: bagItems().some(x => x.it.id === id), label: srcOf(S.game.grants[id].src).label }; });
check('Beating a boss unlocks its emblem stamp (in the bag, source "Boss: …")', emb.own && emb.bag && /^Boss: /.test(emb.label) && !/mastered|emblem/.test(emb.label), JSON.stringify(emb));
await finishFocus(A, 25); await wait(500);
const floats = await ev(A, () => $$('#ring .floater').map(x => x.textContent).join('|'));
check('Bug fix: after this week’s boss is beaten, no "⚔️ −HP" float after a session', !/HP/.test(floats) && /XP/.test(floats), floats);
const embSync = await until(B, () => isOwned('stamp_b_' + bossOfWeek(weekMonday()).id), null, 12000);
check('The unlocked emblem syncs to the other browser', embSync >= 0);
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
process.exit(fails ? 1 : 0);   // v2.0: a failing check fails the suite (it used to exit 0)
