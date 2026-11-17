// v2.0 phase 4 — names, keyboard reach, focus, headings, targets, reduced motion: every screen of the demo account.
//   node a11y4b.mjs <page> [--phone] [--json out.json]
// Prints what it finds grouped by kind and by where it comes from (the same control on ten screens is one line).
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = [new URL('../node_modules/firebase/', import.meta.url).pathname, new URL('./node_modules/firebase/', import.meta.url).pathname].find(f => fs.existsSync(f));
const args = process.argv.slice(2), page = args[0], phone = args.includes('--phone'), val = f => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext(phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://localhost:8000/' + page); await p.waitForSelector('#authView:not(.hidden)');
await p.evaluate(() => startPreview()); await p.waitForSelector('#appView:not(.hidden)'); await wait(3500);
await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
const VIEWS = [
  ['timer', "showTab('timer')"], ['reminders', "S.ui.remView = 'reminders'; showTab('reminders')"], ['todo', "S.ui.remView = 'todo'; showTab('reminders')"], ['cards', "S.ui.remView = 'cards'; showTab('reminders')"],
  ['stats', "S.ui.statsView = 'week'; showTab('stats')"], ['stats-year', "S.ui.statsView = 'year'; showTab('stats')"],
  ['garden', "S.ui.gardenView = 'garden'; showTab('garden')"], ['garden-harvests', "S.ui.gardenView = 'harvests'; showTab('garden')"], ['garden-almanac', "S.ui.gardenView = 'almanac'; showTab('garden')"], ['garden-shop', "S.ui.gardenView = 'shop'; showTab('garden')"], ['garden-pets', "S.ui.gardenView = 'pets'; showTab('garden')"],
  ['quests-boss', "S.ui.questView = 'boss'; showTab('quests')"], ['quests-quest', "S.ui.questView = 'quest'; showTab('quests')"], ['quests-pass', "S.ui.questView = 'pass'; showTab('quests')"], ['quests-board', "S.ui.questView = 'board'; showTab('quests')"],
  ['profile', "showTab('profile')"], ['friends', "S.ui.friendsView = 'friends'; showTab('friends')"], ['friends-challenges', "S.ui.friendsView = 'challenges'; showTab('friends')"], ['posts', "showTab('posts')"], ['sessions', "showTab('sessions')"],
  ['clan', "showTab('clan')"], ['board', "showTab('board')"], ['shop', "showTab('shop')"], ['bag', "showTab('bag')"], ['room', "showTab('room')"], ['settings', "showTab('settings')"], ['about', "showTab('about')"],
  ['cal-month', "S.ui.calView = 'month'; CAL.anchor = null; showTab('calendar')"], ['cal-week', "S.ui.calView = 'week'; CAL.anchor = null; CAL.scroll = null; showTab('calendar')"], ['cal-agenda', "S.ui.calView = 'agenda'; CAL.anchor = null; showTab('calendar')"],
  ['dlg-day', "S.ui.calView = 'month'; showTab('calendar'); calOpenDay(todayKey())"], ['dlg-block', "showTab('calendar'); openBlockForm({})"], ['dlg-reminder-allday', "showTab('reminders'); openRemForm(); document.querySelector('#remAllDay').click()"],
  // v2.0 phase 6: streak care, break ideas, the after-block question
  ['dlg-streak', "showTab('timer'); openStreakCare()"], ['dlg-streak-paused', "showTab('timer'); S.game.pauses[todayKey()] = 3; G = null; renderToday(); openStreakCare()"],
  ['timer-break', "S.game.pauses = {}; G = null; const t = S.timer; t.phase = 'short'; t.status = 'idle'; renderTimer(); showTab('timer')"],
  ['dlg-break-menu', "showTab('timer'); openBreak('')"], ['dlg-break-breathe', "showTab('timer'); openBreak('breathe')"], ['dlg-break-stretch', "showTab('timer'); openBreak('stretch')"], ['dlg-break-water', "showTab('timer'); openBreak('water')"],
  // v2.0 phase 7: the invite page, a gift, the profile with its invite card
  ['friends-invite', "S.ui.friendsView = 'invite'; SOC.friend = null; showTab('friends')"], ['dlg-invite-gift', "showTab('timer'); showRewardReveal({ kicker: 'Invite milestone', title: '3 friends joined and stayed', items: ['frame_i_link'], coins: 150, pal: ['#2f8f83', '#f0a35f'], note: 'Next: 5 friends', key: 'a11y' + Date.now() })"],
  ['after-block', "const t = S.timer; t.phase = 'focus'; t.status = 'idle'; renderTimer(); showTab('timer'); const s = S.sessions[S.sessions.length - 1]; delete S.debrief[s.id]; offerNote(s.id)"],
  ['dlg-presets', "showTab('timer'); document.querySelector('#managePresets').click()"], ['dlg-reminder', "showTab('reminders'); document.querySelector('#remAdd').click()"], ['dlg-inbox', "showTab('timer'); document.querySelector('#inboxBtn').click()"],
  ['dlg-ranks', "showTab('timer'); openRankLadder()"], ['dlg-collection', "showTab('timer'); openCollection()"], ['dlg-palette', "showTab('timer'); document.querySelector('#cmdBtn').click()"], ['dlg-demo', "showTab('timer'); previewPrompt(document.body)"],
];
const found = {};   // kind -> signature -> { n, where:Set, ex }
const note = (kind, sig, where, ex) => { const g = (found[kind] ||= {}), r = (g[sig] ||= { n: 0, where: new Set(), ex }); r.n++; r.where.add(where); };
for (const [name, code] of VIEWS) {
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  try { await p.evaluate(c => { (0, eval)(c); scrollTo(0, 0); }, code); } catch (e) { console.log('skip', name); continue; }
  await wait(name.startsWith('dlg') ? 500 : 350);
  await p.evaluate(() => typeof rowsFill === 'function' && rowsFill(true));
  const res = await p.evaluate(phone => {
    const out = [];
    const dlg = [...document.querySelectorAll('dialog[open]')].pop(), root = dlg || document.querySelector('#appView');
    const sig = el => { const part = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 3).map(c => '.' + c).join(''); const p1 = el.parentElement; return (p1 && p1 !== root ? part(p1) + ' > ' : '') + part(el) + [...el.attributes].filter(a => /^data-/.test(a.name)).slice(0, 2).map(a => `[${a.name}]`).join(''); };
    const shown = el => { if (!el.getClientRects().length) return false; const cs = getComputedStyle(el); if (cs.visibility !== 'visible' || +cs.opacity === 0) return false; for (let e = el; e && e !== root; e = e.parentElement) if (e.hasAttribute('inert') || e.getAttribute('aria-hidden') === 'true') return false; return dlg ? dlg.contains(el) : !el.closest('dialog'); };
    const nameOf = el => {
      const lb = el.getAttribute('aria-labelledby'); if (lb) { const t = lb.split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ').trim(); if (t) return t; }
      const al = el.getAttribute('aria-label'); if (al && al.trim()) return al.trim();
      if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l && l.textContent.trim()) return l.textContent.trim(); }
      const wrap = el.closest('label'); if (wrap && wrap.textContent.trim()) return wrap.textContent.trim();
      const txt = [...el.querySelectorAll('*')].reduce((a, c) => a, (el.innerText || el.textContent || '').trim()); if (txt) return txt;
      const img = el.querySelector('img[alt], svg[aria-label], [aria-label], title'); if (img) return (img.getAttribute('alt') || img.getAttribute('aria-label') || img.textContent || '').trim();
      return (el.getAttribute('title') || el.getAttribute('placeholder') || el.getAttribute('value') || '').trim();
    };
    const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex], ui-select, ui-date, ui-time, ui-num, ui-color, ui-tags, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="option"], [role="menuitem"], [role="slider"], [role="combobox"], [contenteditable="true"]';
    const inter = [...root.querySelectorAll(FOCUSABLE)].filter(shown);
    for (const el of inter) {
      const dis = el.matches(':disabled, [aria-disabled="true"]') || el.closest('[inert]');
      if (!dis && !nameOf(el) && !/^ui-/.test(el.tagName.toLowerCase())) out.push(['no name', sig(el), el.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').slice(0, 110)]);
      const ti = el.getAttribute('tabindex');
      if (!dis && el.matches('[role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="slider"]') && !el.matches('a[href], button, input, select, textarea, summary') && ti === null) out.push(['role without tabindex', sig(el), '']);
      if (phone && !dis) {
        const r = el.getBoundingClientRect(), a = getComputedStyle(el, '::after'), on = a.content !== 'none' && a.position === 'absolute', neg = v => (on ? Math.max(0, -(parseFloat(v) || 0)) : 0);   // a target enlarged by an invisible ::after
        const w = r.width + neg(a.left) + neg(a.right), h = r.height + neg(a.top) + neg(a.bottom), inline = getComputedStyle(el).display === 'inline' && el.tagName === 'A';
        const inStepper = el.matches('input') && el.closest('ui-num');   // the number between a stepper's − and + (those are the targets; the field is as tall as they are)
        const landing = ti === '-1' && !el.matches('a[href], button, input, select, textarea, summary, [role]');   // a heading that only receives the focus when its dialog opens is not a target
        if (!inline && !inStepper && !landing && getComputedStyle(el).pointerEvents !== 'none' && (w < 43.5 || h < 43.5) && !(el.matches('input[type="checkbox"], input[type="radio"]') && el.closest('label')) && !el.closest('label.sw, .sw')) out.push(['target under 44 px', sig(el), `${Math.round(w)}×${Math.round(h)}`]);
      }
    }
    // things that act on a click but cannot be reached by keyboard: a pointer cursor on something that is not focusable, has no focusable ancestor and no focusable child
    for (const el of root.querySelectorAll('div, span, li, td, tr, img, svg, p, article, section')) {
      if (!shown(el)) continue; const cs = getComputedStyle(el); if (cs.cursor !== 'pointer' || cs.pointerEvents === 'none') continue;
      if (el.closest(FOCUSABLE) || el.querySelector(FOCUSABLE) || el.closest('label')) continue;
      const par = el.parentElement; if (par && getComputedStyle(par).cursor === 'pointer') continue;   // report the outermost
      out.push(['click only (no keyboard)', sig(el), (el.textContent || '').trim().slice(0, 50)]);
    }
    // headings
    const hs = [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(shown).map(h => +h.tagName[1]);
    if (!dlg) { const n1 = hs.filter(x => x === 1).length; if (n1 !== 1) out.push(['headings', `${n1} h1`, hs.join(' ')]); }
    for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) { out.push(['headings', `h${hs[i - 1]} then h${hs[i]}`, hs.slice(Math.max(0, i - 3), i + 2).join(' ')]); break; }
    // pictures
    for (const el of root.querySelectorAll('img, svg[role="img"], [role="img"]')) { if (shown(el) && !(el.getAttribute('alt') !== null || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.querySelector('title'))) out.push(['picture without text', sig(el), '']); }
    // fields
    for (const el of root.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select')) { if (!shown(el)) continue; const lab = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest('label'); if (!lab) out.push(['field without label', sig(el), el.getAttribute('placeholder') || '']); }
    // dialogs
    if (dlg && !(dlg.getAttribute('aria-label') || dlg.getAttribute('aria-labelledby'))) out.push(['dialog without name', sig(dlg), '']);
    return out;
  }, phone);
  for (const [kind, sig, ex] of res) note(kind, sig, name, ex);
}
// focus ring: one of each kind of control per screen gets keyboard focus; its outline or shadow must change
await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
for (const [name, code] of VIEWS.filter(v => !v[0].startsWith('dlg'))) {
  await p.evaluate(c => { (0, eval)(c); scrollTo(0, 0); }, code); await wait(300);
  const sigs = await p.evaluate(() => { const seen = new Set(), out = []; for (const el of document.querySelectorAll('#appView button, #appView a[href], #appView input, #appView [tabindex="0"], #appView summary, #appView ui-select, #appView ui-num')) { if (!el.getClientRects().length || el.matches(':disabled') || el.closest('dialog, [inert], [aria-hidden="true"]') || getComputedStyle(el).visibility !== 'visible' || (el.matches('ui-num, ui-select, ui-date, ui-time') && el.hasAttribute('disabled'))) continue; { const r = el.getBoundingClientRect(); if (r.right < 0 || r.left > innerWidth) continue; } const k = el.tagName + '.' + [...el.classList].slice(0, 2).join('.'); if (seen.has(k)) continue; seen.add(k); el.setAttribute('data-fx', out.length); out.push(k); if (out.length >= 40) break; } return out; });
  for (let i = 0; i < sigs.length; i++) {
    const r = await p.evaluate(i => { const el = document.querySelector(`[data-fx="${i}"]`); if (!el) return null; const snap = e => { const c = getComputedStyle(e); return [c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 ? c.outlineWidth + c.outlineColor : '', c.boxShadow, c.borderColor, c.backgroundColor].join('|'); }; const inner = el.matches('ui-select, ui-num, ui-date, ui-time') ? (el.querySelector('button, input') || el) : el; const a = snap(inner) + snap(inner.parentElement); try { inner.focus({ focusVisible: true }); } catch (e) { inner.focus(); } const f = document.activeElement === inner, b2 = snap(inner) + snap(inner.parentElement); inner.blur(); el.removeAttribute('data-fx'); return { focused: f, ring: a !== b2 }; }, i);
    if (r && !r.focused) note('cannot take focus', sigs[i], name, '');
    else if (r && !r.ring) note('no visible focus', sigs[i], name, '');
  }
}
// reduced motion: nothing may loop
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
for (const [name, code] of VIEWS.filter(v => !v[0].startsWith('dlg'))) {
  await p.evaluate(c => { (0, eval)(c); }, code); await wait(500);
  const loops = await p.evaluate(() => document.getAnimations().filter(a => { const t = a.effect && a.effect.getComputedTiming(); return a.playState === 'running' && t && t.iterations === Infinity && t.duration > 50; }).map(a => { const t = a.effect.target; return (t.id ? '#' + t.id : '.' + String(t.className && t.className.baseVal !== undefined ? t.className.baseVal : t.className).split(' ')[0]) + ':' + (a.animationName || ''); }));
  for (const l of new Set(loops)) note('loops under reduced motion', l, name, '');
}
let total = 0;
for (const kind of Object.keys(found)) {
  const rows = Object.entries(found[kind]).sort((a, c) => c[1].where.size - a[1].where.size);
  total += rows.length;
  console.log(`\n== ${kind}: ${rows.length} place${rows.length === 1 ? '' : 's'}`);
  for (const [sig, r] of rows.slice(0, 40)) console.log(`  ×${String(r.n).padEnd(3)} ${sig.slice(0, 96)}  ${r.ex ? '· ' + String(r.ex).slice(0, 70) : ''}  [${[...r.where].slice(0, 4).join(', ')}${r.where.size > 4 ? ' +' + (r.where.size - 4) : ''}]`);
}
console.log(`\nTOTAL places: ${total}`);
if (val('--json')) fs.writeFileSync(val('--json'), JSON.stringify(Object.fromEntries(Object.entries(found).map(([k, g]) => [k, Object.keys(g).length]))));
await b.close();
