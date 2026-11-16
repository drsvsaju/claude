// v1.12 layout audit: boss arena (Solo + Squad), Trophy Hall, questline, bag (empty + full), reward reveal, event banner
// at 360 / 390 / 768 / 1280 px: no sideways scroll, nothing sticking out or clipped, tap targets ≥ 44 px on touch screens.
// v2.0: the touch-target and field-height audits include the library's controls (ui-select, ui-date, ui-time, ui-num, ui-color) and skip their inner parts.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const SHOTS = process.argv.includes('shots'), DARK = process.argv.includes('dark'), GLASS = process.argv.includes('glass');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
let total = 0;
const check = touch => {
  const out = [], vw = innerWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push(['page', `page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`]);
  if (innerWidth > screen.width + 1) out.push(['page', `page is wider than the phone screen, so it gets zoomed out (${innerWidth} > ${screen.width})`]);
  const root = [...document.querySelectorAll('dialog[open]')].pop() || (!$('#wrapped').classList.contains('hidden') ? $('#wrapped') : null) || document.querySelector('.tab.active') ;
  const scopes = [root, ...(root && root.matches('.tab') ? [$('header.top')] : [])].filter(Boolean);
  const sig = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const scrollAnc = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return a; } return null; };
  for (const scope of scopes) for (const el of scope.querySelectorAll('*')) {
    if (!el.getClientRects().length || el.closest('svg') && el.tagName !== 'svg') continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const anc = scrollAnc(el);
    if ((!anc || el.closest('header.top')) && (r.right > vw + 1 || r.left < -1) && cs.position !== 'fixed') out.push([sig(el), `sticks out of the screen (${Math.round(r.left)}..${Math.round(r.right)} / ${vw})`]);
    // clipped text: overflow hidden, single line, no ellipsis
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own && el.scrollWidth > el.clientWidth + 1 && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis' && !(el.clientWidth <= 1 && el.clientHeight <= 1)) out.push([sig(el), `text clipped without ellipsis: "${el.textContent.trim().slice(0, 30)}"`]);
    // text running out of its box (overflow visible) into neighbours
    if (own && cs.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 2 && cs.display !== 'inline' && el.clientWidth > 0) out.push([sig(el), `text overflows its box: "${el.textContent.trim().slice(0, 30)}"`]);
    if (touch && el.matches('button, a[href], select, summary, [role=button], input:not([type=hidden]):not([type=range]), ui-select, ui-date, ui-time, ui-num, ui-color') && !el.disabled && !(el.parentElement && el.parentElement.closest('ui-num, ui-tags, ui-select, ui-date, ui-time, ui-color'))) {
      let h = r.height, w = r.width;
      const pa = getComputedStyle(el, '::after'); if (pa.content !== 'none' && pa.position === 'absolute') { w = Math.max(w, parseFloat(pa.width) || 0); h = Math.max(h, parseFloat(pa.height) || 0); }
      const lab = el.closest('label, .setting, .tut-switch'); // a whole row that toggles counts as the target
      if (lab && el.matches('input[type=checkbox]') && (lab.matches('label') || lab.dataset.rowToggle !== undefined)) { const lr = lab.getBoundingClientRect(); h = lr.height; w = lr.width; }
      if (el.matches('input[type=text], input[type=number], input[type=date], input[type=time], input:not([type]), select, textarea, ui-select, ui-date, ui-time, ui-num:not([bare])') && !(el.parentElement && el.parentElement.closest('ui-num, ui-tags, ui-select, ui-date, ui-time, ui-color'))) { if (h < 40) out.push([sig(el), `field only ${Math.round(h)}px tall`]); }
      else if (h < 43.5 || w < 43.5) out.push([sig(el), `tap target ${Math.round(w)}×${Math.round(h)} (“${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 18)}”)`]);
    }
  }
  return out;
};

const viewports = [[360, 740, true], [390, 844, true], [768, 1024, true], [1280, 860, false]];
for (const [w, h, touch] of viewports) {
  for (const mode of ['preview', 'guest']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 700, colorScheme: DARK ? 'dark' : 'light' });
    await ctx.addInitScript(([mode, glass]) => { if (glass) localStorage.setItem('pomodorolist-glass', 'full'); if (mode === 'guest') { localStorage.setItem('pomodorolist-guest', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '1.12'); localStorage.setItem('pomodorolist-login-later', 'x'); localStorage.setItem('pomodorolist-tips-seen', JSON.stringify(['stats', 'reminders', 'quests', 'shop', 'friends', 'board', 'profile', 'settings', 'bag'])); } }, [mode, GLASS]);
    await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
    await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    const p = await ctx.newPage(), ev = (f, a) => p.evaluate(f, a);
    p.on('pageerror', e => errs.push(`${w} ${mode}: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${w} ${mode} ${m.type()}: ${m.text().slice(0, 140)}`); });
    await p.goto('http://localhost:8000/index.html?emulator=1');
    if (mode === 'preview') { await p.waitForSelector('#authView:not(.hidden)'); await wait(500); await p.click('#previewBtn'); await p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 15000 }); await wait(2200); }
    else { await p.waitForSelector('#appView:not(.hidden)'); await wait(1200); }
    await ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
    const screens = mode === 'preview'
      ? [['boss-squad', () => { S.settings.bossMode = 'squad'; S.ui.questView = 'boss'; showTab('quests'); }], ['boss-solo', () => { S.settings.bossMode = 'solo'; renderQuests(); }],
         ['questline', () => { S.ui.questView = 'quest'; renderQuests(); loadEventBoard(); }], ['bag', () => showTab('bag')], ['bag-aura', () => { S.ui.bagCat = 'aura'; renderBag(); }],
         ['profile', () => { S.ui.bagCat = 'all'; showTab('profile'); }], ['timer', () => showTab('timer')]]
      : [['bag-empty', () => showTab('bag')], ['boss-solo-guest', () => { S.ui.questView = 'boss'; showTab('quests'); }], ['questline-guest', () => { S.ui.questView = 'quest'; renderQuests(); }],
         ['reveal', () => { showTab('timer'); showRewardReveal({ kicker: 'Squad victory', title: 'The Procrastination Dragon', items: ['col_b_dragon', 'au_b_dragon_sq'], pal: ['#e2552f', '#f59e3b'] }); }],
         ['settings', () => { $('#rewardDlg').close(); showTab('settings'); }]];
    for (const [name, go] of screens) {
      await ev(go); await wait(name.startsWith('quest') ? 1400 : 900);
      const out = await ev(check, touch);
      const uniq = [...new Map(out.map(o => [o.join(' '), o])).values()];
      total += uniq.length;
      console.log(`${w}px ${name}: ${uniq.length ? uniq.slice(0, 8).map(o => o.join(': ')).join(' | ') : 'OK'}`);
      if (SHOTS) await p.screenshot({ path: `v112e-${w}-${name}${DARK ? '-dark' : ''}.png`, fullPage: name !== 'reveal' });
    }
    await ctx.close();
  }
}
console.log('errors', JSON.stringify(errs), '| problems', total);
await b.close();
process.exit(total ? 1 : 0);   // v2.0: layout problems fail the suite (it used to exit 0)
