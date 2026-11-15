// v1.19.1: segmented controls never wrap; the sliding pill matches the selected button exactly (position and size);
// a bar that doesn't fit scrolls sideways (the selected tab in view, a fade on the side with more); the pill follows on
// clicks, scrolling, resizing, theme / Glossed Interface / True Minimalist changes and when a hidden view is shown.
// Every view with a switcher, at 1440 / 768 / 390 / 360 px; themes, glass and minimal at 1440 and 360.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, SITE } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const A = await device('A', 1440);
await signup(A, 'seg_' + R); await closeDlg(A);
await A.ev(() => { S.settings.gardenTour = Date.now(); save(); });

// what every visible switcher looks like now
const CHECK = `(() => { const dlg = [...document.querySelectorAll('dialog[open]')].pop(); return [...document.querySelectorAll('.seg, .tabs')].filter(s => s.getClientRects().length && getComputedStyle(s).visibility !== 'hidden' && !s.closest('dialog:not([open])') && (!dlg || dlg.contains(s))).map(s => {
  const btns = [...s.children].filter(x => x.tagName === 'BUTTON' && x.getClientRects().length);
  const act = s.querySelector(':scope > button.active:not(.hidden)'), ind = s.querySelector(':scope > .seg-ind');
  const r = { id: s.id || s.className.split(' ').slice(0, 2).join('.'), n: btns.length, wraps: new Set(btns.map(x => Math.round(x.getBoundingClientRect().top))).size > 1 };
  if (act && ind && +getComputedStyle(ind).opacity > 0) {
    const ir = ind.getBoundingClientRect(), ar = act.getBoundingClientRect(), bar = s.classList.contains('btmbar');
    r.dx = Math.round(ir.left - ar.left); r.dw = Math.round(ir.width - ar.width);
    if (!bar) { r.dy = Math.round(ir.top - ar.top); r.dh = Math.round(ir.height - ar.height); }
    r.h = Math.round(ar.height);
  } else if (act) r.noPill = true;
  const sr = s.getBoundingClientRect(); r.out = sr.right > innerWidth + 1 || sr.left < -1;
  r.scroll = s.scrollWidth > s.clientWidth + 1;
  if (r.scroll && act) { r.actIn = act.offsetLeft >= s.scrollLeft - 1 && act.offsetLeft + act.offsetWidth <= s.scrollLeft + s.clientWidth + 1; r.fade = s.classList.contains('seg-fl') || s.classList.contains('seg-fr'); r.ox = getComputedStyle(s).overflowX; }
  return r;
}); })()`;
const bad = r => r.wraps || r.out || Math.abs(r.dx || 0) > 1 || Math.abs(r.dw || 0) > 1 || Math.abs(r.dy || 0) > 1 || Math.abs(r.dh || 0) > 1 || (r.scroll && (!r.actIn || !r.fade || r.ox !== 'auto'));
const VIEWS = [
  ['stats', () => showTab('stats')], ['friends', () => { S.ui.friendsView = 'friends'; showTab('friends'); }], ['sessions', () => showTab('sessions')],
  ['reminders', () => showTab('reminders')], ['quests', () => showTab('quests')], ['garden', () => showTab('garden')], ['profile', () => showTab('profile')],
  ['board', () => { S.ui.lbScope = 'friends'; showTab('board'); }], ['clanboard', () => { S.ui.lbScope = 'clans'; showTab('board'); }],
  ['inbox', () => openInbox()], ['collection', () => openCollection()], ['todo', () => openTodoForm()], ['share', () => openShareDlg()]];
/** After a click: the pill slides with a spring and some views take a moment to redraw — wait until it has settled (≤ 2.5 s). */
async function settled(dev, id) { let x; for (let i = 0; i < 25; i++) { await wait(100); x = (await dev.ev(CHECK)).find(r => r.id === id); if (!x || !bad(x)) return x; } return x; }
const open = async (fn) => { await closeDlg(A); await wait(250); await A.ev(`(${fn.toString()})()`); await wait(900); };
const scan = () => A.ev(CHECK);
const problems = [];
async function sweep(tag, { click = true } = {}) {
  const seen = new Set();
  for (const [name, fn] of VIEWS) {
    await open(fn);
    const rs = await scan();
    for (const r of rs) { seen.add(r.id); if (bad(r)) problems.push({ tag, name, when: 'open', ...r }); }
    if (!click) continue;
    for (const r of rs) {
      if (r.id.includes('btmbar') || r.id === 'lbScope') continue;   // the bottom bar changes the page; the scope has its own pass below
      const vals = await A.ev(id => { const s = document.getElementById(id); if (!s) return []; return [...s.children].filter(x => x.tagName === 'BUTTON' && x.getClientRects().length && !x.disabled).map(x => { const n = x.getAttributeNames().find(a => a.startsWith('data-') && a !== 'data-kind'); return n ? [n, x.getAttribute(n)] : null; }).filter(Boolean); }, r.id);
      for (const [n, v] of [...vals, ...vals.slice(0, 1)]) {
        const sel = `#${r.id} > button[${n}="${v}"]`;
        if (!(await A.p.$(sel))) continue;
        await A.p.click(sel);
        const after = await settled(A, r.id);
        if (after && bad(after)) problems.push({ tag, name, when: `click ${v}`, ...after });
      }
    }
  }
  return seen;
}
for (const w of [1440, 768, 390, 360]) {
  await A.p.setViewportSize({ width: w, height: 860 }); await wait(400);
  const seen = await sweep(`${w}px`);
  log(`${w}px switchers seen:`, [...seen].join(' '));
}
const wrapBefore = problems.filter(p => p.wraps).length;
check('Every switcher at 1440 / 768 / 390 / 360 px, on opening and after clicking every button: one line, the pill exactly on the selected button (x, y, width, height ±1 px), inside the screen; a bar that doesn\'t fit scrolls with the selected tab in view and a fade', !problems.length, JSON.stringify(problems.slice(0, 6)));

// the Achievements categories in particular (the reported bug), at 360 px
await A.p.setViewportSize({ width: 360, height: 760 }); await open(() => showTab('profile'));
const ach = await A.ev(() => { const s = $('#achCats'); if (!s) return null; const act = s.querySelector('button.active'), ind = s.querySelector('.seg-ind'), btn = s.querySelector('button'); return { lines: new Set([...s.querySelectorAll('button')].map(x => Math.round(x.getBoundingClientRect().top))).size, barH: Math.round(s.getBoundingClientRect().height), btnH: Math.round(btn.getBoundingClientRect().height), pillH: Math.round(ind.getBoundingClientRect().height), actH: Math.round(act.getBoundingClientRect().height), scroll: s.scrollWidth > s.clientWidth, n: s.querySelectorAll('button').length }; });
check('Achievements categories at 360 px: one line, a normal-height bar, the pill as tall as the selected button (no blob)', ach && ach.lines === 1 && ach.pillH === ach.actH && ach.barH <= ach.btnH + 10, JSON.stringify(ach));
// the last category: scrolled into view, the pill on it; scrolling back by hand keeps the pill on the button
const last = await A.ev(async () => { const s = $('#achCats'), b = [...s.querySelectorAll('button')].pop(); b.click(); await new Promise(r => setTimeout(r, 900)); const s2 = $('#achCats'), act = s2.querySelector('button.active'); const inView = act.offsetLeft >= s2.scrollLeft - 1 && act.offsetLeft + act.offsetWidth <= s2.scrollLeft + s2.clientWidth + 1;
  const fadeL = s2.classList.contains('seg-fl'); s2.scrollLeft = 0; await new Promise(r => setTimeout(r, 400)); const ir = s2.querySelector('.seg-ind').getBoundingClientRect(), ar = act.getBoundingClientRect(); return { inView, fadeL, scrolled: Math.round(s2.scrollLeft), dx: Math.round(ir.left - ar.left), fadeR: s2.classList.contains('seg-fr') }; });
check('…choosing the last category scrolls it into view (a fade on the left); scrolling back by hand, the pill stays on its button and the fade moves to the right', last.inView && last.fadeL && last.dx === 0 && last.fadeR, JSON.stringify(last));

// themes × Glossed Interface × True Minimalist at 1440 and 360 (achievements, board, friends)
const VARIANTS = [];
for (const theme of ['th_default', 'th_paper', 'th_mono', 'th_forest']) for (const mode of ['light', 'dark']) VARIANTS.push({ theme, mode, glass: 'off', mini: false });
VARIANTS.push({ theme: 'th_default', mode: 'light', glass: 'full', mini: false }, { theme: 'th_default', mode: 'dark', glass: 'lite', mini: false }, { theme: 'th_ocean', mode: 'dark', glass: 'full', mini: false });
VARIANTS.push({ theme: 'th_default', mode: 'light', glass: 'off', mini: true }, { theme: 'th_default', mode: 'dark', glass: 'full', mini: true });
const vprob = [];
for (const w of [1440, 360]) {
  await A.p.setViewportSize({ width: w, height: 860 }); await wait(300);
  for (const v of VARIANTS) {
    await A.ev(v => { themePreviewId = v.theme; S.settings.theme = v.mode; applyTheme(); setGlass(v.glass); if (minimal() !== v.mini) setMinimal(v.mini); }, v); await wait(500);
    for (const [name, fn] of [['profile', () => showTab('profile')], ['board', () => { S.ui.lbScope = 'friends'; showTab('board'); }], ['friends', () => { S.ui.friendsView = 'friends'; showTab('friends'); }], ['stats', () => showTab('stats')]]) {
      await open(fn);
      for (const r of await scan()) if (bad(r)) vprob.push({ w, ...v, name, ...r });
      // the theme changes while the view is open: the pill follows (fonts and paddings can change)
    }
  }
}
await A.ev(() => { themePreviewId = null; S.settings.theme = 'auto'; applyTheme(); setGlass('off'); if (minimal()) setMinimal(false); });
check(`Themes, Glossed Interface (off / lite / full) and True Minimalist (${VARIANTS.length} variants) at 1440 and 360 px: no wrap, the pill on the selected button`, !vprob.length, JSON.stringify(vprob.slice(0, 5)));

// a theme switch / font change / resize while a view is open: the pill is recalculated without a click
await A.p.setViewportSize({ width: 1440, height: 860 }); await open(() => showTab('stats'));
const live = await A.ev(async () => {
  const s = $('#statsSeg'), sleep = ms => new Promise(r => setTimeout(r, ms)), off = () => { const ir = s.querySelector('.seg-ind').getBoundingClientRect(), ar = s.querySelector('button.active').getBoundingClientRect(); return [Math.round(ir.left - ar.left), Math.round(ir.width - ar.width), Math.round(ir.height - ar.height)]; };
  const out = {};
  document.documentElement.style.fontSize = '20px'; s.style.fontSize = '17px'; await sleep(700); out.font = off();
  s.style.fontSize = ''; document.documentElement.style.fontSize = ''; await sleep(700); out.fontBack = off();
  const b0 = s.querySelector('button.active'); b0.style.paddingLeft = '30px'; await sleep(700); out.btnGrow = off(); b0.style.paddingLeft = '';
  await sleep(600); out.back = off();
  return out;
});
await A.p.setViewportSize({ width: 700, height: 860 }); await wait(700);
const rs = await A.ev(() => { const s = $('#statsSeg'), ir = s.querySelector('.seg-ind').getBoundingClientRect(), ar = s.querySelector('button.active').getBoundingClientRect(); return [Math.round(ir.left - ar.left), Math.round(ir.width - ar.width), Math.round(ir.height - ar.height)]; });
const zero = a => a.every(x => Math.abs(x) <= 1);
check('The pill follows without a click: a bigger font, a button that changes size, a window resize', zero(live.font) && zero(live.fontBack) && zero(live.btnGrow) && zero(live.back) && zero(rs), JSON.stringify({ live, rs }));
// a view rendered while hidden (measured at 0 × 0): correct as soon as it is shown
await A.p.setViewportSize({ width: 1440, height: 860 });
const hid = await A.ev(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  showTab('timer'); await sleep(300); S.ui.statsView = 'month'; renderStats(); await sleep(300);   // stats re-rendered while its tab is hidden
  showTab('stats'); await sleep(700);
  const s = $('#statsSeg'), ir = s.querySelector('.seg-ind').getBoundingClientRect(), ar = s.querySelector('button.active').getBoundingClientRect();
  return { op: getComputedStyle(s.querySelector('.seg-ind')).opacity, d: [Math.round(ir.left - ar.left), Math.round(ir.width - ar.width), Math.round(ir.top - ar.top), Math.round(ir.height - ar.height)] };
});
check('A switcher rendered while its view was hidden gets the right pill as soon as it is shown', +hid.op === 1 && zero(hid.d), JSON.stringify(hid));
await A.ctx.close();

// the demo has a clan (its board, shop and settings switchers) and friends (a friend's page): 1440 and 360
const D = await device('D', 1440);
await D.p.goto(SITE + '/index.html'); await D.p.waitForSelector('#authView:not(.hidden)'); await D.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await D.ev(() => startPreview()); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(3000);
const dprob = [], dseen = new Set();
for (const w of [1440, 360]) {
  await D.p.setViewportSize({ width: w, height: 860 });
  for (const fn of [() => showTab('clan'), () => { showTab('clan'); openClanShop(); }, () => { S.ui.friendsView = 'friends'; showTab('friends'); openFriend(otherUid(friendsList()[0])); }]) {
    await D.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await wait(250); await D.ev(`(${fn.toString()})()`); await wait(1500);
    const rs = await D.ev(CHECK);
    for (const r of rs) { dseen.add(r.id); if (bad(r)) dprob.push({ w, when: 'open', ...r }); }
    for (const r of rs) {
      if (r.id.includes('btmbar')) continue;
      const vals = await D.ev(id => { const s = document.getElementById(id); if (!s) return []; return [...s.children].filter(x => x.tagName === 'BUTTON' && x.getClientRects().length && !x.disabled).map(x => { const n = x.getAttributeNames().find(a => a.startsWith('data-')); return n ? [n, x.getAttribute(n)] : null; }).filter(Boolean); }, r.id);
      for (const [n, v] of vals) {
        const sel = `#${r.id} > button[${n}="${v}"]`; if (!(await D.p.$(sel))) continue;
        await D.p.click(sel); await settled(D, r.id); await wait(200);
        for (const x of await D.ev(CHECK)) { dseen.add(x.id); if (bad(x)) dprob.push({ w, when: `${r.id} ${v}`, ...x }); }
      }
    }
  }
}
log('demo switchers seen:', [...dseen].join(' '));
check('Demo (a clan and friends) at 1440 and 360 px: the clan, clan shop and friend-page switchers stay on one line with the pill on the selected button', !dprob.length && ['clanCbSeg', 'csTabs', 'fpTab'].every(x => dseen.has(x)), JSON.stringify(dprob.slice(0, 5)));
await D.ctx.close();

// the sign-up / log-in tabs on the welcome page (logged out), 1440 and 360
const L = await device('L', 1440);
await L.p.goto(SITE + '/index.html'); await L.p.waitForSelector('#authView:not(.hidden)'); await L.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
const lp = [];
for (const w of [1440, 360]) { await L.p.setViewportSize({ width: w, height: 800 }); await L.ev(() => { const b = document.querySelector('[data-mode=signup]'); if (b) b.click(); }); await wait(700); for (const r of await L.ev(CHECK)) if (bad(r)) lp.push({ w, ...r }); }
check('Welcome page switchers (sign up / log in, glass preview) at 1440 and 360 px', !lp.length, JSON.stringify(lp));
await L.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
