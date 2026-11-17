// v2.0 phase 4 — contrast, computed from what is actually drawn.
//   node a11y4.mjs <page> <outdir> [--skins default|all|th_a,th_b] [--from 20] [--few] [--phone] [--only timer,stats]
// For every state (theme × light/dark × tab or dialog) the page is photographed with its text made transparent, so
// each text's real background is known whatever is behind it (washes, glass, gradients); the text colour comes from
// the computed style, with every ancestor's opacity. a11y4.py turns the two into contrast ratios.
// Read-only: the demo account.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = [new URL('../node_modules/firebase/', import.meta.url).pathname, new URL('./node_modules/firebase/', import.meta.url).pathname].find(f => fs.existsSync(f));
const args = process.argv.slice(2), [page, out] = args, val = f => (args.includes(f) ? args[args.indexOf(f) + 1] : null), phone = args.includes('--phone');
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext(phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://localhost:8000/' + page); await p.waitForSelector('#authView:not(.hidden)');
await p.evaluate(() => startPreview()); await p.waitForSelector('#appView:not(.hidden)'); await wait(3500);
await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); const s = document.createElement('style'); s.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; } .toasts, #pomeoBubble, #tipPop { display: none !important; } * { content-visibility: visible !important; }'; document.head.append(s); });   // (off-screen tiles are skipped by the browser and would be blank in a full-page picture)
let skins = val('--skins') === 'all' ? await p.evaluate(() => Object.keys(SKINS)) : val('--skins') && val('--skins') !== 'default' ? val('--skins').split(',') : ['th_default'];
if (val('--from')) skins = skins.slice(+val('--from'));   // --from 20: carry on with the 21st theme (a full run takes hours)
// the states: every tab, the sub-views with their own content, and the dialogs with the most text
const VIEWS = [
  ['timer', "showTab('timer')"], ['reminders', "S.ui.remView = 'reminders'; showTab('reminders')"], ['todo', "S.ui.remView = 'todo'; showTab('reminders')"], ['cards', "S.ui.remView = 'cards'; showTab('reminders')"],
  ['stats-week', "S.ui.statsView = 'week'; showTab('stats')"], ['stats-year', "S.ui.statsView = 'year'; showTab('stats')"], ['stats-day', "S.ui.statsView = 'day'; showTab('stats')"],
  ['garden', "S.ui.gardenView = 'garden'; showTab('garden')"], ['garden-harvests', "S.ui.gardenView = 'harvests'; showTab('garden')"], ['garden-almanac', "S.ui.gardenView = 'almanac'; showTab('garden')"], ['garden-shop', "S.ui.gardenView = 'shop'; showTab('garden')"], ['garden-pets', "S.ui.gardenView = 'pets'; showTab('garden')"],
  ['quests-boss', "S.ui.questView = 'boss'; showTab('quests')"], ['quests-quest', "S.ui.questView = 'quest'; showTab('quests')"], ['quests-pass', "S.ui.questView = 'pass'; showTab('quests')"], ['quests-board', "S.ui.questView = 'board'; showTab('quests')"],
  ['profile', "showTab('profile')"], ['friends', "S.ui.friendsView = 'friends'; showTab('friends')"], ['friends-challenges', "S.ui.friendsView = 'challenges'; showTab('friends')"], ['posts', "showTab('posts')"], ['sessions', "showTab('sessions')"],
  ['clan', "showTab('clan')"], ['board', "showTab('board')"], ['shop', "showTab('shop')"], ['bag', "showTab('bag')"], ['room', "showTab('room')"], ['settings', "showTab('settings')"], ['about', "showTab('about')"],
  ['cal-month', "S.ui.calView = 'month'; CAL.anchor = null; showTab('calendar')"], ['cal-week', "S.ui.calView = 'week'; CAL.anchor = null; CAL.scroll = null; showTab('calendar')"], ['cal-agenda', "S.ui.calView = 'agenda'; CAL.anchor = null; showTab('calendar')"],
  ['dlg-day', "S.ui.calView = 'month'; showTab('calendar'); calOpenDay(todayKey())"], ['dlg-block', "showTab('calendar'); openBlockForm({})"], ['dlg-reminder-allday', "showTab('reminders'); openRemForm(); document.querySelector('#remAllDay').click()"],
  ['pop-reminder', "showTab('timer'); showPomeoPop(S.reminders[0], todayKey(), 'For today: Hand in the chemistry record')"],
  // v2.0 phase 6: streak care (the default row, a paused streak, the mending offer), break ideas, the fuller insights card
  ['dlg-streak', "showTab('timer'); openStreakCare()"],
  ['dlg-streak-paused', "showTab('timer'); S.game.pauses[todayKey()] = 3; G = null; renderToday(); openStreakCare()"],
  ['timer-mend', "S.game.pauses = {}; const y = dayKey(addDays(startOfDay(new Date()), -1)); S.sessions = S.sessions.filter(s => dayKey(new Date(s.start)) !== y); delete S.game.claims.goalDays[y]; G = null; showTab('timer'); renderToday()"],
  ['dlg-streak-mend', "showTab('timer'); openStreakCare()"],
  ['timer-break', "const t = S.timer; t.phase = 'short'; t.status = 'idle'; renderTimer(); showTab('timer')"],
  ['dlg-break-menu', "showTab('timer'); openBreak('')"], ['dlg-break-breathe', "showTab('timer'); openBreak('breathe'); BRK.t0 = Date.now() - 2600; brkTick()"], ['dlg-break-stretch', "showTab('timer'); openBreak('stretch')"], ['dlg-break-water', "showTab('timer'); openBreak('water')"],
  // v2.0 phase 7: the invite page, a gift, the profile with its invite card
  ['friends-invite', "S.ui.friendsView = 'invite'; SOC.friend = null; showTab('friends')"], ['dlg-invite-gift', "showTab('timer'); showRewardReveal({ kicker: 'Invite milestone', title: '3 friends joined and stayed', items: ['frame_i_link'], coins: 150, pal: ['#2f8f83', '#f0a35f'], note: 'Next: 5 friends', key: 'a11y' + Date.now() })"],
  ['stats-insights', "const t = S.timer; t.phase = 'focus'; t.status = 'idle'; renderTimer(); showTab('stats'); renderEnergyCard(); document.querySelector('#energySlot').scrollIntoView({ block: 'center' })"],
  ['dlg-presets', "showTab('timer'); document.querySelector('#managePresets').click()"], ['dlg-reminder', "showTab('reminders'); document.querySelector('#remAdd').click()"], ['dlg-inbox', "showTab('timer'); document.querySelector('#inboxBtn').click()"],
  ['dlg-ranks', "showTab('timer'); openRankLadder()"], ['dlg-collection', "showTab('timer'); openCollection()"], ['dlg-palette', "showTab('timer'); document.querySelector('#cmdBtn').click()"], ['dlg-demo', "showTab('timer'); previewPrompt(document.body)"],
];
const SUB = ['timer', 'stats-week', 'quests-boss', 'quests-pass', 'profile', 'friends', 'garden', 'shop', 'bag', 'settings', 'reminders', 'todo', 'clan', 'board', 'cal-month', 'cal-week', 'dlg-presets', 'dlg-inbox', 'dlg-streak-paused', 'dlg-streak-mend', 'timer-break', 'dlg-break-menu', 'dlg-break-breathe', 'stats-insights', 'friends-invite', 'dlg-invite-gift'];   // for the other themes: the screens that use every token
if (args.includes('--few')) SUB.splice(0, SUB.length, 'timer', 'stats-week', 'quests-pass', 'profile', 'friends', 'bag', 'clan', 'todo', 'cal-month', 'cal-week');   // --few: ten screens for the other themes
const only = val('--only') ? val('--only').split(',') : null;
// Only the glyphs are hidden. The colour property itself stays, because backgrounds, borders and icons are often drawn
// in "currentColor" and must still be in the picture.
const HIDE = ':root:root:root:root *, :root:root:root:root *::before, :root:root:root:root *::after { -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; } svg text, svg tspan { fill: transparent !important; stroke: transparent !important; } ::placeholder { -webkit-text-fill-color: transparent !important; } :root:root:root:root .ncg, :root:root:root:root .m-rainbow { background-image: none !important; }';   // (a gradient name is a background clipped to its glyphs: it has to go too)
const collect = () => p.evaluate(() => {
  const out = [], seen = new Set();
  const dlg = [...document.querySelectorAll('dialog[open]')].pop();
  const root = dlg || document.querySelector('#appView');
  const opac = el => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const sig = el => { const part = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 3).map(c => '.' + c).join(''); const p1 = el.parentElement, p2 = p1 && p1.parentElement; return (p2 ? part(p2) + ' > ' : '') + (p1 ? part(p1) + ' > ' : '') + part(el); };
  const letters = /[\p{L}\p{N}]/u;
  /** Fully inside every scroller it is in? (A chip half under a row's faded edge is drawn half transparent.) */
  const inView = (el, rect) => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue; const r = e.getBoundingClientRect(), pad = /fade-|catrow|seg/.test(e.className) ? 30 : 1; if (rect.left < r.left + (cs.overflowX !== 'visible' ? pad : -1e6) - 1 || rect.left + rect.width > r.right - (cs.overflowX !== 'visible' ? pad : -1e6) + 1 || (cs.overflowY !== 'visible' && (rect.top < r.top - 1 || rect.top + rect.height > r.bottom + 1))) return false; } return true; };
  const add = (el, rect, color, text, kind) => {
    if (rect.width < 2 || rect.height < 4) return;
    if (!inView(el, rect)) return;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || cs.display === 'none') return;
    const dis = !!el.closest(':disabled, [aria-disabled="true"], [disabled], .disabled, [inert]');
    const grad = cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text' ? cs.backgroundImage : '';
    out.push({ x: rect.left + scrollX, y: rect.top + scrollY, w: rect.width, h: rect.height, color, op: +opac(el).toFixed(3), size: parseFloat(cs.fontSize), weight: +cs.fontWeight || 400, sig: sig(el), text: text.trim().slice(0, 40), kind, dis, grad });
  };
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n.nodeValue; if (!t || !letters.test(t)) continue;
    const el = n.parentElement; if (!el || el.closest('script, style, noscript, template, [hidden], .hidden, .sr-only, .vh, title, desc')) continue;
    if (dlg ? !dlg.contains(el) : el.closest('dialog')) continue;
    if (el instanceof SVGElement && (!el.closest('text') || !el.closest('svg.chart, svg[role="img"].chart'))) continue;
    const r = document.createRange(); r.selectNodeContents(n); const rects = [...r.getClientRects()].filter(q => q.width > 1 && q.height > 3); if (!rects.length) continue;
    const cs = getComputedStyle(el), color = el instanceof SVGElement ? cs.fill : (cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color);
    add(el, rects[0], color, t, el instanceof SVGElement ? 'svg' : 'text');
  }
  for (const el of root.querySelectorAll('input[placeholder], textarea[placeholder]')) { if (el.value || !el.getClientRects().length) continue; const r = el.getBoundingClientRect(), cs = getComputedStyle(el, '::placeholder'), pl = parseFloat(getComputedStyle(el).paddingLeft) || 0; add(el, { left: r.left + pl, top: r.top + r.height / 2 - 7, width: Math.min(120, r.width - pl * 2), height: 14 }, cs.color, el.placeholder, 'placeholder'); }
  return { items: out, h: document.documentElement.scrollHeight, dlg: !!dlg };
});
let n = 0;
for (const skin of skins) for (const mode of ['light', 'dark']) {
  const forced = await p.evaluate(([skin, mode]) => { themePreviewId = skin === 'th_default' ? '' : skin; applyTheme(mode); return (SKINS[skin] && SKINS[skin].force) || ''; }, [skin, mode]);
  if (forced && forced !== mode) continue;   // a theme that is dark only (or light only) has one state
  for (const [name, code] of VIEWS) {
    if (only ? !only.includes(name) : skin !== 'th_default' && !SUB.includes(name)) continue;
    try {
      await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
      // the theme is applied again after every switch: leaving the Bag ends a theme preview and goes back to the account's own look
      await p.evaluate(([c, skin, mode]) => { if (typeof closePop === 'function') closePop(); (0, eval)(c); themePreviewId = skin === 'th_default' ? '' : skin; applyTheme(mode); scrollTo(0, 0); }, [code, skin, mode]); await wait(name.startsWith('dlg') ? 500 : 350);
      const applied = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
      if (applied && applied !== mode) { console.log('mode not applied', skin, mode, name); continue; }
      await p.evaluate(() => typeof rowsFill === 'function' && rowsFill(true));
      const data = await collect();
      await p.evaluate(css => { const s = document.createElement('style'); s.id = 'a11yHide'; s.textContent = css; document.head.append(s); }, HIDE);
      const key = `${skin}.${mode}.${name}`;
      await p.screenshot({ path: `${out}/${key}.png`, fullPage: !data.dlg });
      await p.evaluate(() => document.getElementById('a11yHide').remove());
      fs.writeFileSync(`${out}/${key}.json`, JSON.stringify({ skin, mode, view: name, ...data }));
      n++;
    } catch (e) { console.log('skip', skin, mode, name, String(e).slice(0, 100)); }
  }
}
console.log('states', n);
await b.close();
