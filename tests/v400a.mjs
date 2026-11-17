// v2.0 Phase 4 — performance and accessibility: what was changed, held in place by structure rather than by a stopwatch
// (timings are in notes/v2.0-plan.md and come from tests/perf4.mjs; a timing check in a suite fails on a busy machine).
//   node --import ./ui-compat.mjs v400a.mjs
// A signed-up account (emulator) for what is stored; the demo account on a desktop window and on a phone for the rest.
import { b, device, signup, wait, log, check, errs, failCount, U } from './cl-common.mjs';

const A = await device('A', 1280, {}, { overtime: true });
await signup(A, 'p4a' + Date.now().toString(36).slice(-5));
const demo = async (w) => {
  const d = await device('demo' + w, w, {}, { overtime: true });
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await d.ev(() => startPreview()); await d.p.waitForSelector('#appView:not(.hidden)'); await wait(3500);
  await d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await wait(400);
  return d;
};
const D = await demo(1280), M = await demo(390);

/* ---------- paint: blur only where content is behind the surface ---------- */
const blur = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  const blurred = sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length && getComputedStyle(e).backdropFilter !== 'none').length;
  delete document.documentElement.dataset.glassSolid;
  for (const g of ['lite', 'full']) {
    document.documentElement.dataset.glass = g; out[g] = {};
    for (const tab of ['timer', 'stats', 'profile']) { showTab(tab); await sl(250); out[g][tab] = { cards: blurred('#tab-' + tab + ' .card'), tiles: blurred('#tab-' + tab + ' .tile'), n: document.querySelectorAll('#tab-' + tab + ' .card').length }; }
  }
  out.top = getComputedStyle(document.querySelector('.top'), '::before').backdropFilter !== 'none';
  document.documentElement.dataset.glass = 'lite'; await sl(100);
  out.side = getComputedStyle(document.querySelector('.sidenav')).backdropFilter;   // the side column is a fixed column at this width: only the wash is behind it
  applyGlass(); showTab('timer'); await sl(200);
  out.scrim = getComputedStyle($('#navScrim')).visibility;
  return out;
});
check('The default look: no card and no tile in the page is blurred (only the wash is behind them; nine blurred cards halved the frame rate), the top bar that floats over content still is; Extra glossy keeps its blurred cards, and tiles are never blurred (they sit on a card)',
  ['timer', 'stats', 'profile'].every(t => blur.lite[t].cards === 0 && blur.lite[t].tiles === 0 && blur.lite[t].n > 0) && blur.top && ['timer', 'stats', 'profile'].every(t => blur.full[t].cards > 0 && blur.full[t].tiles === 0) && blur.side === 'none', JSON.stringify(blur));
const T = await device('tab', 900, {}, { overtime: true });
await T.p.goto(U); await T.p.waitForSelector('#authView:not(.hidden)'); await T.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); startPreview(); }); await T.p.waitForSelector('#appView:not(.hidden)'); await wait(3000);
const scrim = await T.ev(async () => { const sl = ms => new Promise(r => setTimeout(r, ms)); document.querySelectorAll('dialog[open]').forEach(x => x.close()); const v = () => getComputedStyle($('#navScrim')).visibility; const a = v(); navOpen(true); await sl(400); const o = v(); navOpen(false); for (let i = 0; i < 30 && v() !== 'hidden'; i++) await sl(100); return { closed: a, open: o, again: v() }; });   // (waits for the 0.22 s transition to end: a fixed half second was not always enough on a busy machine)
check('The navigation scrim is not painted while the drawer is closed (it was a full-screen blurred layer at opacity 0), and is there when the drawer opens', blur.scrim === 'hidden' && scrim.closed === 'hidden' && scrim.open === 'visible' && scrim.again === 'hidden', JSON.stringify(scrim));
await T.ctx.close();

/* ---------- the ring is redrawn when it has moved ---------- */
const ring = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  showTab('timer'); await sl(300); $('#resetBtn').click(); await sl(300);
  const count = async ms => { let n = 0; const mo = new MutationObserver(l => { n += l.length; }); mo.observe($('#ringProg'), { attributes: true, attributeFilter: ['style'] }); await sl(ms); mo.disconnect(); return n; };
  out.rest = Math.abs(parseFloat($('#ringProg').style.strokeDashoffset) || 0) < 0.5;
  startTimer(); await sl(700); out.long = await count(2000); out.loop = !!ringRAF;
  S.timer.planned = 60000; S.timer.endAt = Date.now() + 40000; await sl(300); out.short = await count(2000);
  $('#resetBtn').click(); await sl(400); out.restAgain = Math.abs(parseFloat($('#ringProg').style.strokeDashoffset) || 0) < 0.5;
  return out;
});
check('The ring: a 25-minute block redraws the arc a few times in two seconds, not 120 (it moves 0.6 px a second); a one-minute block still moves smoothly; at rest the arc is full at once', ring.rest && ring.loop && ring.long <= 8 && ring.short >= 20 && ring.restAgain, JSON.stringify(ring));

/* ---------- a view choice is not a save of the whole account ---------- */
const save = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  showTab('timer'); await sl(900);
  let n = 0; const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (...a) { n++; return orig.apply(this, a); };
  showTab('stats'); out.sync = n; S.ui.statsView = 'month'; document.querySelector('#tab-stats .seg button[data-view="month"]').click(); out.sync2 = n;
  await sl(900); out.later = n;
  showTab('garden'); out.before = n; dispatchEvent(new Event('pagehide')); out.flushed = n > out.before;
  const key = USER.guest ? LEGACY_KEY : cacheKey(USER.uid); out.stored = JSON.parse(localStorage.getItem(key)).ui.tab;
  Storage.prototype.setItem = orig;
  // a change to the account still saves at once
  let m = 0; Storage.prototype.setItem = function (...a) { m++; return orig.apply(this, a); }; S.settings.dailyGoalMin = (S.settings.dailyGoalMin || 60) + 5; save(); out.accountSync = m > 0; Storage.prototype.setItem = orig;
  return out;
});
check('Switching tab or view does not rewrite the account on the spot (it took 10–14 ms on a large one): the choice is stored a moment later and at the latest when the page is left; a change to the account still saves at once',
  save.sync === 0 && save.sync2 === 0 && save.later > 0 && save.flushed && save.stored === 'garden' && save.accountSync, JSON.stringify(save));
await A.p.reload(); await A.p.waitForSelector('#appView:not(.hidden)'); await wait(2500);
await A.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await wait(600);   // (a dialog that opens after a reload would keep the page behind it from taking focus)
check('…and after a reload the app opens on the tab that was open', await A.ev(() => S.ui.tab) === 'garden', await A.ev(() => S.ui.tab));

/* ---------- one layout for all bars; one render of the Profile ---------- */
const prof = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  showTab('timer'); await sl(300);
  let n = 0; const o = renderProfile; window.renderProfile = function () { n++; return o.apply(this, arguments); };
  showTab('profile'); await sl(900); window.renderProfile = o; out.renders = n;
  const bars = [...document.querySelectorAll('#tab-profile [data-fill]')];
  out.bars = bars.length; out.off = bars.filter(el => { const to = Math.max(0, Math.min(100, +el.dataset.fill || 0)); const m = /translateX\(([-\d.]+)%\)/.exec(el.style.transform || ''); return !m || Math.abs(parseFloat(m[1]) - (to - 100)) > 0.6; }).length;
  out.clan = !!document.querySelector('#tab-profile .clan-prof');
  return out;
});
check('Opening the Profile draws it once (the clan’s rank arriving used to draw all of it again for one line), and every progress bar ends at its value', prof.renders === 1 && prof.bars >= 3 && prof.off === 0 && prof.clan, JSON.stringify(prof));

/* ---------- long lists fill in idle moments ---------- */
const lists = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  const now = Date.now();
  S.todos = Array.from({ length: 60 }, (x, i) => ({ id: 'tt' + i, title: 'Task number ' + (i + 1), due: '', pri: '', tag: '', notes: '', check: [], done: 0, order: i, created: now - i, u: now }));
  S.ui.remView = 'todo'; S.ui.todoFilter = 'all'; showTab('timer'); await sl(200); showTab('reminders');
  const rows = () => [...document.querySelectorAll('#todoList > li[data-tid]')].map(x => x.dataset.tid);
  await Promise.resolve();   // (the kept place is measured in a microtask: after the list is in the page, before it is painted)
  out.first = { rows: rows().length, mark: !!document.querySelector('#todoList > .rows-more'), h: document.documentElement.scrollHeight };
  await sl(1200);
  const ids = rows(); out.after = { rows: ids.length, mark: !!document.querySelector('#todoList > .rows-more'), h: document.documentElement.scrollHeight, order: ids.every((id, i) => id === 'tt' + i) };
  // the keyboard move of a row far down the list keeps its row
  renderTodos(); const g = document.querySelector('#todoList li[data-tid="tt4"] [data-tgrip]'); out.grip = !!g;
  S.todos.length = 6; renderTodos(); out.short = { rows: rows().length, mark: !!document.querySelector('#todoList > .rows-more') };
  return out;
});
check('A to-do list of 60: the first 40 rows are there at once with the place of the rest kept (the page already has its final height), the rest follows within a moment, in order, and the marker is gone; a list of 6 is written at once as before',
  lists.first.rows === 40 && lists.first.mark && Math.abs(lists.first.h - lists.after.h) / lists.after.h < 0.03 && lists.after.rows === 60 && !lists.after.mark && lists.after.order && lists.short.rows === 6 && !lists.short.mark, JSON.stringify(lists));
const move = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), now = Date.now();
  S.todos = Array.from({ length: 60 }, (x, i) => ({ id: 'tt' + i, title: 'Task number ' + (i + 1), due: '', pri: '', tag: '', notes: '', check: [], done: 0, order: i, created: now - i, u: now }));
  renderTodos(); await sl(900);
  const g = document.querySelector('#todoList li[data-tid="tt55"] [data-tgrip]'); if (!g) return { grip: false };
  g.focus(); g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  const a = document.activeElement, li = a && a.closest('li');
  const out = { grip: true, focusRow: li && li.dataset.tid, at: [...document.querySelectorAll('#todoList > li[data-tid]')].findIndex(x => x.dataset.tid === 'tt55'), all: document.querySelectorAll('#todoList > li[data-tid]').length };
  S.todos = []; renderTodos(); save();
  return out;
});
check('Moving row 56 up with the keyboard, straight after the list was drawn again: the whole list is there, the row is one place higher and the focus is still on its handle', move.grip && move.focusRow === 'tt55' && move.at === 54 && move.all === 60, JSON.stringify(move));

/* ---------- the year heatmap ---------- */
const heat = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  S.ui.statsView = 'week'; showTab('stats'); await sl(500);
  document.querySelector('#tab-stats .seg button[data-view="year"]').click(); await sl(120);
  const svg = document.querySelector('#tab-stats svg.chart.heat'), out = { groups: svg.querySelectorAll(':scope > g').length, rects: svg.querySelectorAll('rect[data-tip]').length, loose: svg.querySelectorAll(':scope > rect').length, label: svg.getAttribute('aria-label') || '',
    anims: document.getAnimations().filter(a => a.effect && svg.contains(a.effect.target)).length, tip: svg.querySelector('rect[data-tip]').dataset.tip };
  S.ui.statsView = 'week'; showTab('timer');
  return out;
});
check('The year heatmap comes in as week columns (53 or 54 groups animate, not 365 cells), every day still has its tip, and the chart has a name for screen readers', heat.groups >= 52 && heat.groups <= 54 && heat.rects >= 365 && heat.loose === 0 && heat.anims <= 60 && /\d{4}/.test(heat.tip) && heat.label.length > 10, JSON.stringify(heat));

/* ---------- tiles off screen; a dialog stills the page behind it ---------- */
const tiles = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  out.supported = CSS.supports('content-visibility', 'auto') && CSS.supports('overflow-clip-margin', '1px');
  showTab('bag'); await sl(500); const it = document.querySelector('#tab-bag .shopgrid > .item'); out.item = it ? getComputedStyle(it).contentVisibility : '';
  out.rows = getComputedStyle(document.querySelector('.todo, .rem, li') || document.body).contentVisibility;
  showTab('timer'); await sl(500);
  const loops = () => document.getAnimations().filter(a => { const t = a.effect && a.effect.getComputedTiming(); return a.playState === 'running' && a.playbackRate !== 0 && t && t.iterations === Infinity && !(a.effect.target.closest && a.effect.target.closest('dialog')); }).length;
  out.before = loops(); $('#squadDlg').showModal(); await sl(400); out.during = loops(); $('#squadDlg').close(); await sl(500); out.after = loops();
  // …and what was stilled still obeys the Animations setting afterwards
  const was = document.documentElement.dataset.motion; document.documentElement.dataset.motion = 'reduced'; await sl(400);
  out.reduced = document.getAnimations().filter(a => { const t = a.effect && a.effect.getComputedTiming(); return a.playState === 'running' && t && t.iterations === Infinity && t.duration > 50; }).length;
  document.documentElement.dataset.motion = was; await sl(300);
  return out;
});
check('Item tiles that are off screen are skipped by the browser until they come near it; while a dialog is open nothing loops in the page behind its blurred scrim, and it all moves again when the dialog closes; switching Animations to Reduced afterwards still stops every loop', (!tiles.supported || tiles.item === 'auto') && tiles.before > 0 && tiles.during === 0 && tiles.after > 0 && tiles.reduced === 0, JSON.stringify(tiles));

/* ---------- focus ---------- */
const focus = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  showTab('timer'); await sl(300);
  const d = $('#squadDlg'); d.showModal(); await sl(350); const x = d.querySelector('.dlg-x'); x.focus(); out.onX = document.activeElement === x;
  d.close(); await sl(600); out.inside = d.contains(document.activeElement); out.where = document.activeElement.tagName;   // (a dialog closes with a short animation)
  // opened from a button: the focus goes back to it
  $('#managePresets').focus(); $('#managePresets').click(); await sl(500); document.querySelector('dialog[open]').close(); await sl(600); out.back = document.activeElement && document.activeElement.id;
  return out;
});
check('Focus never stays inside a dialog that has closed (keys then went to a button nobody could see), and goes back to the button that opened it', focus.onX && !focus.inside && focus.back === 'managePresets', JSON.stringify(focus));

/* ---------- keyboard reach, names, headings ---------- */
const kb = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  showTab('timer'); await sl(400);
  const rl = $('#rankLine'); out.rankLine = rl && !rl.classList.contains('hidden') ? [rl.getAttribute('role'), rl.tabIndex] : null;
  if (out.rankLine) { rl.focus(); rl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await sl(400); out.ladder = $('#rankLadderDlg').open; $('#rankLadderDlg').close(); await sl(200); }
  S.ui.remView = 'todo'; showTab('reminders'); await sl(400); const tm = document.querySelector('#todoList .rem-main[data-tedit]'); out.todo = tm ? [tm.getAttribute('role'), tm.tabIndex] : null;
  S.ui.lbScope = 'friends'; showTab('board'); await sl(900); const row = document.querySelector('#tab-board ol.lb li[data-open]'); out.board = row ? [row.getAttribute('role'), row.tabIndex] : null;
  out.h1 = {}; for (const t of ['timer', 'reminders', 'stats', 'garden', 'quests', 'profile', 'friends', 'posts', 'sessions', 'clan', 'board', 'shop', 'settings']) { showTab(t); await sl(150); out.h1[t] = [...document.querySelectorAll('#tab-' + t + ' h1')].filter(h => h.getClientRects().length).length; }
  showTab('stats'); await sl(300); out.charts = [...document.querySelectorAll('#tab-stats svg.chart')].map(s => !!s.getAttribute('aria-label'));
  showTab('friends'); await sl(400); const f = $('#addFriendName'); out.friend = f ? f.getAttribute('aria-label') : '';
  showTab('timer');
  return out;
});
check('Keyboard: the rank line, a to-do row and a leaderboard row can be reached and act as buttons (Enter opens the rank ladder); every section has exactly one page heading; charts and the add-friend field have names',
  kb.rankLine && kb.rankLine[0] === 'button' && kb.rankLine[1] === 0 && kb.ladder && kb.todo && kb.todo[0] === 'button' && kb.todo[1] === 0 && (!kb.board || (kb.board[0] === 'button' && kb.board[1] === 0)) && Object.values(kb.h1).every(n => n === 1) && kb.charts.length > 0 && kb.charts.every(Boolean) && !!kb.friend, JSON.stringify(kb));

/* ---------- contrast: every fixed colour used as text, in every theme ---------- */
const inks = await D.ev(async () => {
  const out = { skins: 0, inks: 0, bad: [], accent: [], states: [] };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ratio = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const root = document.documentElement, v = n => colParse(getComputedStyle(root).getPropertyValue(n).trim());
  for (const skin of Object.keys(SKINS)) for (const mode of ['light', 'dark']) {
    themePreviewId = skin === 'th_default' ? '' : skin; applyTheme(mode);
    if (SKINS[skin].force && SKINS[skin].force !== mode) continue;
    out.skins++;
    const layers = ['--bg', '--surface', '--pop-bg', '--card-hi'].map(v).filter(Boolean);
    for (const p of [...root.style].filter(p => p.startsWith('--ink-'))) { const c = colParse(root.style.getPropertyValue(p).trim()); out.inks++; const worst = Math.min(...layers.map(l => ratio(c, l))); if (worst < 4.5) out.bad.push(skin + '.' + mode + ' ' + p + ' ' + worst.toFixed(2)); }
    for (const tok of ['--accent-text', '--danger-text', '--warn-text', '--ok-text', '--muted']) { const c = v(tok); if (!c) continue; const worst = Math.min(...layers.map(l => ratio(c, l))); if (worst < 4.5) out.accent.push(skin + '.' + mode + ' ' + tok + ' ' + worst.toFixed(2)); }
  }
  themePreviewId = ''; applyTheme();
  return out;
});
check(`Fixed colours used as text (rarity words, rank and tier names, name colours, mutation labels) are worked out for each theme: ${inks.inks} colour × theme pairs in ${inks.skins} themes all read at 4.5:1 or better on the page, a card, a dialog and a raised row; so do accent, status and secondary text`, inks.skins >= 20 && inks.inks > 1000 && !inks.bad.length && !inks.accent.length, JSON.stringify({ bad: inks.bad.slice(0, 6), tokens: inks.accent.slice(0, 6), n: inks.bad.length }));
const used = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  applyTheme('light'); await sl(100);
  const at = getComputedStyle(document.documentElement).getPropertyValue('--accent-text').trim(), same = (el, hex) => { const c = colParse(getComputedStyle(el).color), h = colParse(hex); return !!c && !!h && [0, 1, 2].every(i => Math.abs(c[i] - h[i]) <= 1); };
  showTab('bag'); await sl(500);
  const rar = document.querySelector('#tab-bag .r-legendary .bi-src .rar'); out.rar = rar ? same(rar, getComputedStyle(document.documentElement).getPropertyValue('--ink-c9a227').trim()) : null;
  const nw = [...document.querySelectorAll('#tab-bag .item.equipped .pv .tag.new')][0]; out.newOnEquipped = nw ? same(nw, getComputedStyle(document.documentElement).getPropertyValue('--on-danger').trim()) : 'none';
  S.ui.questView = 'pass'; showTab('quests'); await sl(400); const got = document.querySelector('.pt.got'); out.got = got ? getComputedStyle(got).opacity : 'none';
  S.ui.gardenView = 'almanac'; showTab('garden'); await sl(500); const none = document.querySelector('.gd-mut.none'); out.none = none ? getComputedStyle(none).opacity : 'none';
  showTab('timer'); await sl(300); const navOk = () => { const act = document.querySelector('.sidenav button.active .nv-l'); return act ? getComputedStyle(act).color === getComputedStyle(act.closest('button')).color && getComputedStyle(act).color !== getComputedStyle(document.querySelector('.sidenav button:not(.active) .nv-l')).color : null; };
  for (let i = 0; i < 30 && navOk() === false; i++) await sl(100);   // the label's colour is a transition: read it when it has arrived
  out.nav = navOk();
  // from the design review: a rarity word has its dot, a subject tag its tinted chip, "overdue" its warning sign
  showTab('bag'); await sl(400); const rr = document.querySelector('#tab-bag .bi-src .rar'); out.dot = rr ? getComputedStyle(rr, '::before').content !== 'none' && getComputedStyle(rr, '::before').backgroundColor !== 'rgba(0, 0, 0, 0)' : null;
  S.ui.remView = 'todo'; S.ui.todoFilter = 'all'; showTab('reminders'); await sl(500); const tg = document.querySelector('#todoList .td-tag'); out.tag = tg ? getComputedStyle(tg).backgroundColor !== 'rgba(0, 0, 0, 0)' : null;
  const ov = document.querySelector('#todoList .td-due.over'); out.over = ov ? getComputedStyle(ov, '::before').content !== 'none' : 'none';
  showTab('timer');
  applyTheme(); S.ui.gardenView = 'garden'; S.ui.questView = 'boss';
  return out;
});
check('…and they are used: a Legendary label is drawn in its ink, the red “New” tag keeps its own ink on an equipped item, “claimed” and “not found yet” dim the picture and not the words, the open section in the side column has its label and icon in one colour that differs from the others; a rarity word has a dot in the rarity’s colour, a subject tag is a tinted chip, “overdue” has a warning sign',
  used.rar === true && (used.newOnEquipped === true || used.newOnEquipped === 'none') && (used.got === '1' || used.got === 'none') && (used.none === '1' || used.none === 'none') && used.nav === true && used.dot === true && used.tag === true && (used.over === true || used.over === 'none'), JSON.stringify(used));

// ---------- from the run over every theme: two places a fixed-colour fill sat under the text ----------
const themed = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ratio = (x, y) => { const p = lum(x), q = lum(y); return +((Math.max(p, q) + .05) / (Math.min(p, q) + .05)).toFixed(2); };
  const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const px = c => colParse(c) || (m => (m ? [m[1] * 255, m[2] * 255, m[3] * 255] : null))(/color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)/.exec(c));   // a mixed colour is computed as color(srgb r g b)
  for (const [sk, mode] of [['th_peach', 'light'], ['th_default', 'light'], ['th_default', 'dark'], ['th_nord', 'light']]) {
    themePreviewId = sk === 'th_default' ? null : sk; applyTheme(mode); showTab('clan'); await sl(500);
    const go = document.querySelector('#pvBanner .pv-go'), lv = document.querySelector('#tab-clan .clan-lv'), k = sk + '.' + mode;
    if (go && go.getClientRects().length) out[k + '.banner'] = ratio(px(getComputedStyle(go).color), px(getComputedStyle(go).backgroundColor));
    if (lv) { const acc = getComputedStyle(lv).getPropertyValue('--clan-acc').trim(); out[k + '.level'] = ratio(px(getComputedStyle(lv).color), colMix(px(acc), px(tok('--surface')), .12)); }   // the chip: 12 % of the clan's colour on the card
  }
  themePreviewId = null; applyTheme(); showTab('timer');
  return out;
});
check('In a theme whose accent is light (Peach) the demo banner’s button is as readable as the banner itself, and a clan’s level is readable on the tint of its own colour (Nord): AA in each',
  Object.keys(themed).length >= 6 && Object.values(themed).every(v => v >= 4.5), JSON.stringify(themed));

// ---------- a cloud copy that changes nothing must not leave the garden pointing at plants that are gone ----------
// (found by the phase's regression: a harvest straight after such a copy edited an object that was no longer in the account)
const stale = await D.ev(() => {
  const d = {}; for (const f of SYNC_LISTS) d[f] = JSON.parse(JSON.stringify(S[f] || []));
  d.tomb = { ...S.tomb }; d.remFired = { ...S.remFired };
  mergeSyncFrom(d);                       // the first copy may reorder keys
  const before = garden();                // worked out and kept …
  mergeSyncFrom(JSON.parse(JSON.stringify(d)));   // … then the same copy again: nothing changes, but every list is a new one
  const g = garden();
  return { changed: SYNC.changed, growing: g.growing.length, live: g.growing.every(p => S.plants.includes(p)), fresh: g !== before };
});
check('After a cloud copy that changes nothing, the garden is worked out again from the lists that are now in the account (every growing plant it holds is the live one)',
  stale.changed === false && stale.growing > 0 && stale.live, JSON.stringify(stale));

/* ---------- phone: targets ---------- */
const tg = await M.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  showTab('posts'); await sl(700); const pr = document.querySelector('.po-react button'); out.react = pr ? Math.round(pr.getBoundingClientRect().width) : null;
  S.ui.remView = 'todo'; showTab('reminders'); await sl(500); const g = document.querySelector('.td-grip'); if (g) { const r = g.getBoundingClientRect(), a = getComputedStyle(g, '::after'); out.grip = Math.round(r.width + 2 * Math.abs(parseFloat(a.left) || 0)); }
  showTab('timer'); await sl(300); $('#cmdBtn') && $('#cmdBtn').click(); await sl(500); const li = document.querySelector('#cmdList li'); out.cmd = li ? Math.round(li.getBoundingClientRect().height) : null; document.querySelectorAll('dialog[open]').forEach(x => x.close());
  return out;
});
check('Phone: a reaction on a post, the handle of a to-do and a row of the command list are 44 px targets', (tg.react === null || tg.react >= 44) && (tg.grip === undefined || tg.grip >= 44) && (tg.cmd === null || tg.cmd >= 44), JSON.stringify(tg));

log('errors', JSON.stringify(errs.slice(0, 6)));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 4)));
log(failCount() ? `${failCount()} FAILED` : 'ALL PASSED');
await b.close();
process.exit(failCount() ? 1 : 0);
