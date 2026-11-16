// v2.0 phase 1: the UI library inside the app — the Component gallery (?debug=1) on the demo account. The same checks as
// the isolation suite (native contract of <ui-select>, keyboard maps, ARIA, panels inside dialogs, flipping, phone
// sheets, number / date / time / colour / tags, menu, confirm, slider, switch), then app-only checks: Animations
// Reduced and Off, Glossed, True Minimalist, every palette, and that the demo writes nothing while the controls are used.
import { chromium } from 'playwright';
import fs from 'fs';
const SITE = process.env.SITE || 'http://localhost:8000';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const errs = [];
const check = (label, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const open = async (w = 1280, h = 800, touch = false) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(SITE + '/' + (process.env.PAGE || 'index.html') + '?debug=1'); await p.waitForSelector('#authView:not(.hidden)');
  await p.evaluate(() => { const x = document.getElementById('introSkip'); if (x) x.click(); });
  await p.evaluate(() => startPreview()); await p.waitForSelector('#appView:not(.hidden)'); await wait(3500);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.__w = []; for (const k of ['setDoc', 'updateDoc', 'deleteDoc', 'addDoc', 'runTransaction', 'writeBatch']) { const f = FB[k]; FB[k] = (...a) => { window.__w.push(k); return f(...a); }; } window.__ls = JSON.stringify(Object.entries(localStorage).sort()); showTab('gallery'); });
  await p.addStyleTag({ content: '.toasts, #pomeoBubble, .pv-banner, #tipPop { display: none !important; } body.previewing { --pv-h: 0px !important; }' });
  await wait(700);
  return p;
};
const p = await open();
const ev = (f, a) => p.evaluate(f, a);
const log = () => ev(() => LOG.splice(0));

// ---------- <ui-select>: the native contract ----------
const c1 = await ev(() => {
  const s = document.getElementById('gxs1'), out = {};
  out.initial = s.value;                                   // the option with `selected`
  s.value = '6'; out.set = s.value; out.face = s.querySelector('.ui-face').textContent;
  s.value = 'nope'; out.bad = s.value; out.badIdx = s.selectedIndex;   // native: '' and -1
  s.innerHTML = '<option value="x">X</option><option value="y" selected>Y</option><option value="z">Z</option>';
  out.rebuilt = s.value; out.faceR = s.querySelector('.ui-face').textContent; out.opts = s.options.length; out.selOpt = s.selectedOptions[0].textContent;
  s.innerHTML = '<option value="p">P</option><option value="q">Q</option>'; out.first = s.value;   // nothing marked: the first one
  s.value = 'q'; s.querySelector('option[value="q"]').remove(); out.removed = s.value;             // the chosen option went away: back to the first
  s.innerHTML = '<option value="1">Monday</option><option value="0" selected>Sunday</option><option value="6">Saturday</option>';
  out.role = s.getAttribute('role'); out.exp = s.getAttribute('aria-expanded'); out.tab = s.tabIndex; out.lab = s.getAttribute('aria-labelledby');
  out.events = LOG.splice(0).length;                       // setting from code fires nothing
  const d = document.getElementById('gxs4'); out.dis = [d.disabled, d.tabIndex, d.getAttribute('aria-disabled')];
  return out;
});
check('ui-select keeps the native contract: initial value from `selected`, .value set, an unknown value gives "" / -1, innerHTML rebuild re-selects (marked option, else the first), a removed option falls back, selectedOptions, no events from code',
  c1.initial === '0' && c1.set === '6' && c1.face === 'Saturday' && c1.bad === '' && c1.badIdx === -1 && c1.rebuilt === 'y' && c1.faceR === 'Y' && c1.opts === 3 && c1.selOpt === 'Y' && c1.first === 'p' && c1.removed === 'p' && c1.events === 0, JSON.stringify(c1));
check('ARIA: role=combobox, aria-expanded=false, focusable, labelled by its <label> and its value; a disabled one is aria-disabled and out of the tab order', c1.role === 'combobox' && c1.exp === 'false' && c1.tab === 0 && /ui-lab-\d+ ui-face-\d+/.test(c1.lab) && c1.dis[0] === true && c1.dis[1] === -1 && c1.dis[2] === 'true', JSON.stringify(c1));
// mouse
await p.click('#gxs1'); await wait(400);
const o1 = await ev(() => { const s = document.getElementById('gxs1'), pop = document.querySelector('.ui-pop'), list = pop.querySelector('[role=listbox]'); const r = pop.getBoundingClientRect(), a = s.getBoundingClientRect(); return { exp: s.getAttribute('aria-expanded'), ctl: s.getAttribute('aria-controls') === list.id, opts: [...pop.querySelectorAll('[role=option]')].map(o => o.textContent.trim() + ':' + o.getAttribute('aria-selected')), act: s.getAttribute('aria-activedescendant'), below: r.top >= a.bottom, wide: r.width >= a.width - 1, top: pop.matches(':popover-open'), search: !!pop.querySelector('.ui-search') }; });
check('Click opens a listbox panel under the control (top layer, at least as wide): options with aria-selected, aria-expanded/controls/activedescendant set; no search box for 3 options', o1.exp === 'true' && o1.ctl && o1.opts.join() === 'Monday:false,Sunday:true,Saturday:false' && !!o1.act && o1.below && o1.wide && o1.top && !o1.search, JSON.stringify(o1));
await p.click('.ui-pop [role=option]:has-text("Monday")'); await wait(150);
const o2 = await ev(() => ({ v: document.getElementById('gxs1').value, pop: !!document.querySelector('.ui-pop'), log: LOG.splice(0), focus: document.activeElement.id }));
check('Choosing an option sets the value, closes the panel, fires input + change once each, and focus is back on the control', o2.v === '1' && !o2.pop && o2.log.join() === 'input:gxs1=1,change:gxs1=1' && o2.focus === 'gxs1', JSON.stringify(o2));
// keyboard
await p.focus('#gxs1'); await p.keyboard.press('Enter'); await wait(100); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await wait(120);
const k1 = await ev(() => ({ v: document.getElementById('gxs1').value, log: LOG.splice(0) }));
await p.keyboard.press('ArrowDown'); await wait(100); await p.keyboard.press('Home'); await p.keyboard.press('Escape'); await wait(120);
const k2 = await ev(() => ({ v: document.getElementById('gxs1').value, pop: !!document.querySelector('.ui-pop'), log: LOG.splice(0), focus: document.activeElement.id }));
await p.keyboard.press('m'); await wait(80);
const k3 = await ev(() => ({ v: document.getElementById('gxs1').value, log: LOG.splice(0), pop: !!document.querySelector('.ui-pop') }));
await p.keyboard.press(' '); await wait(100); await p.keyboard.press('End'); await p.keyboard.press('Tab'); await wait(120);
const k4 = await ev(() => ({ v: document.getElementById('gxs1').value, pop: !!document.querySelector('.ui-pop'), log: LOG.splice(0) }));
check('Keyboard: Enter opens, ↓↓ + Enter chooses (Saturday); ↓ opens, Home + Esc changes nothing and keeps focus; typing "m" on the closed control picks Monday; Space opens, End + Tab commits Saturday',
  k1.v === '6' && k1.log.length === 2 && k2.v === '6' && !k2.pop && !k2.log.length && k2.focus === 'gxs1' && k3.v === '1' && k3.log.length === 2 && !k3.pop && k4.v === '6' && !k4.pop && k4.log.length === 2, JSON.stringify({ k1, k2, k3, k4 }));
// long list: search, disabled option, type-to-filter
await p.click('#gxs2'); await wait(150);
await p.keyboard.type('che'); await wait(120);
const s2a = await ev(() => { const pop = document.querySelector('.ui-pop'); return { search: document.activeElement === pop.querySelector('.ui-search input'), rows: [...pop.querySelectorAll('[role=option]')].map(o => o.textContent.trim()), act: pop.querySelector('.ui-opt.act')?.textContent.trim(), ad: !!pop.querySelector('.ui-search input').getAttribute('aria-activedescendant') }; });
await p.keyboard.press('Enter'); await wait(120);
const s2b = await ev(() => ({ v: document.getElementById('gxs2').value, log: LOG.splice(0) }));
await p.click('#gxs2'); await wait(120); await p.keyboard.type('zzz'); await wait(100);
const s2c = await ev(() => document.querySelector('.ui-pop .ui-none')?.textContent || '');
await p.keyboard.press('Escape'); await wait(100);
await p.click('#gxs2'); await wait(120); await p.click('.ui-pop [role=option][aria-disabled=true]', { force: true }); await wait(100);
const s2d = await ev(() => ({ v: document.getElementById('gxs2').value, open: !!document.querySelector('.ui-pop') }));
await p.keyboard.press('Escape'); await wait(100);
check('A list of 10 options gets a search box that takes focus: typing "che" filters to Chemistry (the active row, announced through aria-activedescendant), Enter picks it; no match says so; a disabled option cannot be chosen', s2a.search && s2a.rows.join() === 'Chemistry' && s2a.act === 'Chemistry' && s2a.ad && s2b.v === 'Chemistry' && s2b.log.length === 2 && /Nothing matches/.test(s2c) && s2d.v === 'Chemistry' && s2d.open, JSON.stringify({ s2a, s2b, s2c, s2d }));
// groups and rich rows
await p.click('#gxs3'); await wait(120);
const g1 = await ev(() => { const pop = document.querySelector('.ui-pop'); return { groups: [...pop.querySelectorAll('[role=group]')].map(g => document.getElementById(g.getAttribute('aria-labelledby'))?.textContent), subs: [...pop.querySelectorAll('.ui-opt-s')].map(x => x.textContent), dot: !!pop.querySelector('.ui-dot'), face: document.querySelector('#gxs3 .ui-face').textContent.replace(/\s+/g, ' ') }; });
await p.keyboard.press('Escape'); await wait(100);
check('Option groups become labelled groups; rows show the colour dot and the secondary text; the closed control shows the same', g1.groups.join() === 'Focus,Short' && g1.subs.length === 3 && g1.dot && /Classic.*25 \/ 5 × 4/.test(g1.face), JSON.stringify(g1));
// label click, outside click
await p.click('label[for=gxs1]'); const lf = await ev(() => document.activeElement.id);
await p.click('#gxs1'); await wait(100); await p.click('.gx-head h1'); await wait(150);
const oc = await ev(() => ({ pop: !!document.querySelector('.ui-pop'), log: LOG.splice(0).length }));
check('Clicking the <label> focuses the control; clicking elsewhere closes the panel without a change', lf === 'gxs1' && !oc.pop && oc.log === 0, JSON.stringify({ lf, oc }));
// flip near the bottom
await ev(() => document.getElementById('gxs5').scrollIntoView({ block: 'end' })); await wait(150);
await p.click('#gxs5'); await wait(150);
const fl = await ev(() => { const s = document.getElementById('gxs5').getBoundingClientRect(), r = document.querySelector('.ui-pop').getBoundingClientRect(); return { side: document.querySelector('.ui-pop').dataset.side, above: r.bottom <= s.top + 1, inView: r.top >= 0 && r.bottom <= innerHeight }; });
await p.keyboard.press('Escape'); await ev(() => scrollTo(0, 0)); await wait(100);
check('Near the bottom edge the panel flips above the control and stays on screen', fl.side === 'top' && fl.above && fl.inView, JSON.stringify(fl));
// inside a dialog: usable, Esc closes the panel first
await p.click('#gxdlgBtn'); await wait(200); await p.click('#gxds1'); await wait(150);
const d1 = await ev(() => { const pop = document.querySelector('.ui-pop'), dlg = document.getElementById('gxformDlg'); const r = pop.getBoundingClientRect(), o = pop.querySelector('[role=option]:nth-of-type(2)').getBoundingClientRect(); return { inside: dlg.contains(pop), hit: document.elementFromPoint(o.left + 20, o.top + 10)?.closest('.ui-opt')?.textContent.trim(), visible: r.height > 60 }; });
await p.keyboard.press('Escape'); await wait(150);
const d2 = await ev(() => ({ pop: !!document.querySelector('.ui-pop'), dlg: document.getElementById('gxformDlg').open }));
await p.click('#gxds1'); await wait(120); await p.click('.ui-pop [role=option]:has-text("Every week")'); await wait(120);
const d3 = await ev(() => ({ v: document.getElementById('gxds1').value, dlg: document.getElementById('gxformDlg').open }));
await p.keyboard.press('Escape'); await wait(450);
const d4 = await ev(() => ({ dlg: document.getElementById('gxformDlg').open, focus: document.activeElement.id }));
check('Inside a modal dialog the panel is clickable and on top; Esc closes the panel and leaves the dialog open; a second Esc closes the dialog and focus returns to the button that opened it', d1.inside && d1.hit === 'Every day' && d1.visible && !d2.pop && d2.dlg && d3.v === 'week' && d3.dlg && !d4.dlg && d4.focus === 'gxdlgBtn', JSON.stringify({ d1, d2, d3, d4 }));
await log();

// ---------- <ui-num> ----------
const n0 = await ev(() => { const n = document.getElementById('gxn1'), i = n.querySelector('input'); return { v: n.value, num: n.valueAsNumber, role: i.getAttribute('role'), now: i.getAttribute('aria-valuenow'), min: i.getAttribute('aria-valuemin'), max: i.getAttribute('aria-valuemax'), lab: !!i.getAttribute('aria-labelledby'), sfx: n.querySelector('.ui-num-sfx').textContent }; });
await p.click('#gxn1 .ui-num-b[data-d="1"]'); await p.click('#gxn1 .ui-num-b[data-d="1"]'); await p.click('#gxn1 .ui-num-b[data-d="-1"]'); await wait(60);
const n1 = await ev(() => ({ v: document.getElementById('gxn1').value, log: LOG.splice(0) }));
await p.fill('#gxn1 input', '9999'); await p.keyboard.press('Tab'); await wait(60);
const n2 = await ev(() => ({ v: document.getElementById('gxn1').value, log: LOG.splice(0).filter(x => /^change/.test(x)) }));
await p.fill('#gxn1 input', 'abc'); await p.keyboard.press('Tab'); await wait(60);
const n3 = await ev(() => document.getElementById('gxn1').value);
await p.focus('#gxn1 input'); await p.keyboard.press('Home'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('PageUp'); await wait(60);
const n4 = await ev(() => { const n = document.getElementById('gxn1'); const r = { v: n.value, lessOff: n.querySelector('[data-d="-1"]').disabled }; n.value = 30; r.code = n.value; r.silent = LOG.splice(0).filter(x => x.endsWith('=30')).length; return r; });
const hold = await (async () => { const bb = await p.locator('#gxn1 .ui-num-b[data-d="1"]').boundingBox(); await p.mouse.move(bb.x + 10, bb.y + 10); await p.mouse.down(); await wait(900); await p.mouse.up(); return ev(() => +document.getElementById('gxn1').value); })();
check('ui-num: a labelled spinbutton with min / max / now and a suffix; + + – steps by 5 with input + change each; 9999 clamps to 720 on leaving; letters are dropped and the last good value stays; Home / ↑ / PageUp; set from code is silent; holding + repeats',
  n0.v === '120' && n0.num === 120 && n0.role === 'spinbutton' && n0.now === '120' && n0.min === '10' && n0.max === '720' && n0.lab && n0.sfx === 'min' && n1.v === '125' && n1.log.length === 6 && n2.v === '720' && n2.log.length === 1 && n3 === '720' && n4.v === '65' && n4.code === '30' && n4.silent === 0 && hold >= 45, JSON.stringify({ n0, n1, n2, n3, n4, hold }));
await log();

// ---------- <ui-date> ----------
const today = await ev(() => UI.dkey(new Date()));
await p.click('#gxd1'); await wait(150);
const dt1 = await ev(() => { const pop = document.querySelector('.ui-pop'), f = document.activeElement; return { role: pop.getAttribute('role'), title: pop.querySelector('.ui-cal-title').textContent, days: pop.querySelectorAll('.ui-day').length, focusToday: f.classList.contains('today') && f.getAttribute('aria-current') === 'date', dow: pop.querySelector('.ui-cal-dow').textContent.slice(0, 2), quick: [...pop.querySelectorAll('[data-quick]')].map(x => (x.querySelector('span') || x).textContent).join('|'), exp: document.getElementById('gxd1').getAttribute('aria-expanded') }; });
await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await wait(120);
const dt2 = await ev(() => ({ v: document.getElementById('gxd1').value, face: document.querySelector('#gxd1 .ui-face').textContent, log: LOG.splice(0), clear: !!document.querySelector('#gxd1 .ui-clear'), date: document.getElementById('gxd1').valueAsDate instanceof Date }));
const expect8 = await ev(() => { const d = new Date(); return UI.dkey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 8)); });
await p.click('#gxd1'); await wait(120); await p.click('.ui-pop [data-quick="1"]'); await wait(120);
const dt3 = await ev(() => ({ v: document.getElementById('gxd1').value, face: document.querySelector('#gxd1 .ui-face').textContent }));
const tomorrow = await ev(() => { const d = new Date(); return UI.dkey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)); });
await p.click('#gxd1 .ui-clear'); await wait(80);
const dt4 = await ev(() => ({ v: document.getElementById('gxd1').value, face: document.querySelector('#gxd1 .ui-face').textContent, log: LOG.splice(0).filter(x => /^change/.test(x)).length }));
check('ui-date: a dialog with a 6 × 7 grid, the month title, a Monday-first header, quick picks, focus on today; → ↓ Enter picks today + 8 (YYYY-MM-DD, input + change, valueAsDate); "Tomorrow" quick pick; the × clears it',
  dt1.role === 'dialog' && dt1.days === 42 && dt1.focusToday && dt1.dow === 'Mo' && dt1.quick === 'Today|Tomorrow|This weekend|Next week|In 2 weeks' && dt1.exp === 'true' && dt2.v === expect8 && dt2.log.length === 2 && dt2.clear && dt2.date && dt3.v === tomorrow && /^Tomorrow/.test(dt3.face) && dt4.v === '' && dt4.face === 'No date' && dt4.log === 2, JSON.stringify({ dt1, dt2, expect8, dt3, dt4 }));
const dm = await ev(async () => {
  const d = document.getElementById('gxd2'), out = { v0: d.value, noClear: !d.querySelector('.ui-clear') };
  d.min = UI.dkey(new Date()); d.value = 'garbage'; out.bad = d.value; d.value = '2027-01-28'; out.set = d.value; out.face = d.querySelector('.ui-face').textContent;
  d.open(); await new Promise(r => setTimeout(r, 120));
  const pop = document.querySelector('.ui-pop'); out.title = pop.querySelector('.ui-cal-title').textContent; out.sel = pop.querySelector('.ui-day.sel')?.textContent;
  pop.querySelector('[data-nav="-1"]').click(); pop.querySelector('[data-nav="-1"]').click(); pop.querySelector('[data-nav="-1"]').click(); await new Promise(r => setTimeout(r, 60));
  out.past = [...pop.querySelectorAll('.ui-day')].filter(x => x.dataset.d < UI.dkey(new Date())).every(x => x.disabled); out.anyPast = [...pop.querySelectorAll('.ui-day')].some(x => x.dataset.d < UI.dkey(new Date()));
  d.close(); LOG.splice(0); return out;
});
check('ui-date: a required one has no clear button; nonsense set from code becomes ""; a set date shows its year when it is another year; days before `min` are disabled', dm.v0 === '2026-12-20' && dm.noClear && dm.bad === '' && dm.set === '2027-01-28' && /2027/.test(dm.face) && /January 2027/.test(dm.title) && dm.sel === '28' && dm.past && dm.anyPast, JSON.stringify(dm));
await p.click('#gxd3'); await wait(120);
const rg = await ev(async () => { const pop = document.querySelector('.ui-pop'), days = [...pop.querySelectorAll('.ui-day:not(.out)')]; days[12].click(); await new Promise(r => setTimeout(r, 60)); const still = !!document.querySelector('.ui-pop'); [...document.querySelectorAll('.ui-pop .ui-day:not(.out)')][9].click(); await new Promise(r => setTimeout(r, 100)); const d = document.getElementById('gxd3'); return { still, v: d.value, ordered: d.value.split('/')[0] < d.value.split('/')[1], closed: !document.querySelector('.ui-pop'), face: d.querySelector('.ui-face').textContent, log: LOG.splice(0).length }; });
check('ui-date range: the first click keeps the panel open, the second closes it; the value is "start/end" in order whichever was clicked first', rg.still && /^\d{4}-\d\d-\d\d\/\d{4}-\d\d-\d\d$/.test(rg.v) && rg.ordered && rg.closed && / – /.test(rg.face) && rg.log === 2, JSON.stringify(rg));

// ---------- <ui-time> ----------
const tm0 = await ev(() => ({ v: document.getElementById('gxt1').value, face: document.querySelector('#gxt1 .ui-face').textContent }));
await ev(() => { UI.cfg.hour12 = () => false; document.getElementById('gxt1').value = '14:30'; });
await p.click('#gxt1'); await wait(150);
await p.click('.ui-pop [data-t="18:00"]'); await wait(120);
const tm1 = await ev(() => ({ v: document.getElementById('gxt1').value, face: document.querySelector('#gxt1 .ui-face').textContent, log: LOG.splice(0), closed: !document.querySelector('.ui-pop') }));
await p.click('#gxt1'); await wait(150);
await p.click('.ui-pop .ui-th .ui-num-b[data-d="1"]'); await p.click('.ui-pop .ui-tm .ui-num-b[data-d="-1"]'); await wait(80);
const tm2 = await ev(() => document.getElementById('gxt1').value);
await p.click('.ui-pop .ui-done'); await wait(120);
const tm3 = await ev(() => ({ v: document.getElementById('gxt1').value, log: LOG.splice(0).filter(x => /^change/.test(x)).length, closed: !document.querySelector('.ui-pop') }));
await ev(() => { UI.cfg.hour12 = () => true; document.getElementById('gxt1').value = '00:05'; });
const tm4 = await ev(() => document.querySelector('#gxt1 .ui-face').textContent);
await p.click('#gxt1'); await wait(150);
const tm5 = await ev(() => { const pop = document.querySelector('.ui-pop'); return { h: pop.querySelector('.ui-th').value, m: pop.querySelector('.ui-tm').value, am: pop.querySelector('[data-ap=am]').getAttribute('aria-checked') }; });
await p.click('.ui-pop [data-ap=pm]'); await wait(80); await p.keyboard.press('Escape'); await wait(120);
const tm6 = await ev(() => { const r = { v: document.getElementById('gxt1').value, face: document.querySelector('#gxt1 .ui-face').textContent }; UI.cfg.hour12 = () => false; LOG.splice(0); return r; });
check('ui-time: chips set the time and close (one change); the steppers wrap (18:00 → +1 h, –5 min = 19:55) and Done closes with one change; in 12-hour mode 00:05 reads 12:05 AM, the panel shows 12 : 05 AM, PM makes it 12:05',
  tm0.v === '14:30' && tm1.v === '18:00' && tm1.face === '18:00' && tm1.closed && tm1.log.filter(x => /^change/.test(x)).length === 1 && tm2 === '19:55' && tm3.v === '19:55' && tm3.log === 1 && tm3.closed && tm4 === '12:05 AM' && tm5.h === '12' && tm5.m === '05' && tm5.am === 'true' && tm6.v === '12:05' && tm6.face === '12:05 PM', JSON.stringify({ tm0, tm1, tm2, tm3, tm4, tm5, tm6 }));
await p.click('#gxt2'); await wait(150);
await p.click('.ui-pop .ui-allday'); await wait(100);
const ad1 = await ev(() => ({ all: document.getElementById('gxt2').allDay, v: document.getElementById('gxt2').value, face: document.querySelector('#gxt2 .ui-face').textContent, off: document.querySelector('.ui-pop .ui-time-body').inert }));
await p.click('.ui-pop .ui-allday'); await wait(100); await p.click('.ui-pop .ui-done'); await wait(120);
const ad2 = await ev(() => { const r = { all: document.getElementById('gxt2').allDay, v: document.getElementById('gxt2').value }; LOG.splice(0); return r; });
check('ui-time with `allday`: the switch makes it "All day" (value "", the exact time greyed out and inert); switching it off gives a time again', ad1.all && ad1.v === '' && ad1.face === 'All day' && ad1.off && !ad2.all && ad2.v === '09:00', JSON.stringify({ ad1, ad2 }));

// ---------- <ui-color>, <ui-tags> ----------
await p.click('#gxc1'); await wait(150);
const co1 = await ev(() => { const pop = document.querySelector('.ui-pop'); return { n: pop.querySelectorAll('.ui-sw').length, checked: pop.querySelector('.ui-sw[aria-checked=true]')?.dataset.c, role: pop.querySelector('.ui-swatches').getAttribute('role') }; });
await p.click('.ui-pop .ui-sw[data-c="#3a7ca5"]'); await wait(120);
const co2 = await ev(() => ({ v: document.getElementById('gxc1').value, log: LOG.splice(0), label: document.getElementById('gxc1').getAttribute('aria-label') }));
await p.click('#gxc1'); await wait(120); await p.fill('.ui-pop .ui-hex input', '#ABCDEF'); await wait(80); await p.keyboard.press('Enter'); await wait(120);
const co3 = await ev(() => { const r = { v: document.getElementById('gxc1').value, closed: !document.querySelector('.ui-pop') }; const c = document.getElementById('gxc1'); c.value = 'red'; r.bad = c.value; LOG.splice(0); return r; });
check('ui-color: a radio group of swatches with the current one checked; picking one sets #rrggbb (input + change) and the label names it; a typed hex is accepted; an invalid value from code is ignored', co1.n === 14 && co1.checked === '#c25480' && co1.role === 'radiogroup' && co2.v === '#3a7ca5' && co2.log.length === 2 && /#3a7ca5/.test(co2.label) && co3.v === '#abcdef' && co3.closed && co3.bad === '#abcdef', JSON.stringify({ co1, co2, co3 }));
const tg0 = await ev(() => ({ v: document.getElementById('gxg1').value, chips: [...document.querySelectorAll('#gxg1 .ui-tag')].map(x => x.textContent.trim()) }));
await p.click('#gxg1 input'); await wait(150);
const tg1 = await ev(() => ({ sug: [...document.querySelectorAll('.ui-pop [role=option]')].map(x => x.textContent.trim()), exp: document.querySelector('#gxg1 input').getAttribute('aria-expanded') }));
await p.keyboard.type('re'); await wait(120); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await wait(120);
await p.keyboard.type('Organic, '); await wait(120);
const tg2 = await ev(() => ({ v: document.getElementById('gxg1').value, log: LOG.splice(0).filter(x => /^change/.test(x)).length, inputHidden: document.querySelector('#gxg1 input').readOnly }));
await p.keyboard.press('Backspace'); await wait(80);
await p.click('#gxg1 .ui-tag button'); await wait(80);
const tg3 = await ev(() => { const g = document.getElementById('gxg1'); const r = { v: g.value }; g.value = 'A, a, B'; r.dedupe = g.value; g.querySelector('input').value = 'typing'; r.typing = g.value; g.value = 'Physics, JEE'; LOG.splice(0); return r; });
check('ui-tags: chips from "Physics, JEE"; focus offers past tags not already used; "re" + ↓ + Enter adds Revision; a comma adds what was typed; at the limit of 4 the field takes no more text; Backspace and × remove; duplicates are dropped; text still being typed counts in .value',
  tg0.v === 'Physics, JEE' && tg0.chips.join() === 'Physics,JEE' && tg1.sug.length === 6 && !tg1.sug.includes('Physics') && tg1.exp === 'true' && tg2.v === 'Physics, JEE, Revision, Organic' && tg2.log === 2 && tg2.inputHidden && tg3.v === 'JEE, Revision' && tg3.dedupe === 'A, B' && tg3.typing === 'A, B, typing', JSON.stringify({ tg0, tg1, tg2, tg3 }));

// ---------- menu, confirm / alert, slider, switch ----------
await p.click('#gxmenuBtn'); await wait(150);
const m1 = await ev(() => { const pop = document.querySelector('.ui-pop'); return { role: pop.getAttribute('role'), items: [...pop.querySelectorAll('[role=menuitem]')].length, focus: document.activeElement.textContent.trim().slice(0, 4), sep: !!pop.querySelector('[role=separator]') }; });
await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); const m2 = await ev(() => document.activeElement.textContent.trim().slice(0, 4));
await p.keyboard.press('d'); await p.keyboard.press('Enter'); await wait(120);
const m3 = await ev(() => ({ log: LOG.splice(0), closed: !document.querySelector('.ui-pop'), focus: document.activeElement.id }));
check('UI.menu: role=menu with menu items and a divider, focus on the first; ↓ skips the disabled item and wraps; a letter jumps to the item; Enter runs it, closes and returns focus', m1.role === 'menu' && m1.items === 4 && m1.focus === 'Edit' && m1.sep && m2 === 'Edit' && m3.log.join() === 'menu:dup' && m3.closed && m3.focus === 'gxmenuBtn', JSON.stringify({ m1, m2, m3 }));
await p.click('#gxcfBtn'); await wait(200);
const cf1 = await ev(() => ({ open: document.getElementById('confirmDlg').open, title: document.getElementById('cfTitle').textContent, ok: document.getElementById('cfOk').textContent + '|' + document.getElementById('cfOk').className, focus: document.activeElement.id }));
await p.click('#cfOk'); await wait(400);
const cf2 = await log();
const cf3 = await ev(async () => { const a = UI.confirm({ title: 'First?' }), b = UI.alert('Second'); await new Promise(r => setTimeout(r, 150)); const t1 = document.getElementById('cfTitle').textContent; document.getElementById('cfNo').click(); const ra = await a; await new Promise(r => setTimeout(r, 450)); const t2 = document.getElementById('cfTitle').textContent, noHidden = document.getElementById('cfNo').classList.contains('hidden'); document.getElementById('cfOk').click(); await b; await new Promise(r => setTimeout(r, 400)); return { t1, ra, t2, noHidden, open: document.getElementById('confirmDlg').open }; });
check('UI.confirm: the dialog shows the question, a filled danger button, and starts on Cancel; OK resolves true. Two questions asked at once are shown one after the other; UI.alert has no Cancel', cf1.open && cf1.title === 'Delete this preset?' && cf1.ok === 'Delete|btn danger solid' && cf1.focus === 'cfNo' && cf2.join() === 'confirm:true' && cf3.t1 === 'First?' && cf3.ra === false && cf3.t2 === 'Second' && cf3.noHidden && !cf3.open, JSON.stringify({ cf1, cf2, cf3 }));
const sl = await (async () => { const r0 = await ev(() => getComputedStyle(document.getElementById('gxr1')).getPropertyValue('--ui-fill').trim()); await p.focus('#gxr1'); await p.keyboard.press('ArrowRight'); await wait(80); return ev(r0 => { const r = document.getElementById('gxr1'), bub = document.querySelector('.ui-bubble'); const out = { r0, r1: getComputedStyle(r).getPropertyValue('--ui-fill').trim(), bub: bub && bub.classList.contains('on') ? bub.textContent : '', sw: document.getElementById('gxk1').getAttribute('role') }; r.value = 1; UI.range(r); out.r2 = getComputedStyle(r).getPropertyValue('--ui-fill').trim(); const n = document.createElement('input'); n.type = 'checkbox'; n.id = 'gxk2'; document.body.appendChild(n); return out; }, r0); })();
await wait(120);
const sw2 = await ev(() => document.getElementById('gxk2').getAttribute('role'));
check('Slider: the filled part follows the value (50% → 55% → 100% after a set from code + UI.range) and a bubble shows "55%"; checkboxes are announced as switches, including ones added later', sl.r0 === '50.0%' && sl.r1 === '55.0%' && sl.bub === '55%' && sl.r2 === '100.0%' && sl.sw === 'switch' && sw2 === 'switch', JSON.stringify({ sl, sw2 }));

// ---------- phone: the same panels as bottom sheets ----------
const ph = await open(390, 800, true);
const pe = (f, a) => ph.evaluate(f, a);
await ph.tap('#gxs2'); await wait(450);
const sh1 = await pe(() => { const d = document.querySelector('dialog.ui-sheet'); if (!d) return null; const r = d.getBoundingClientRect(), o = d.querySelector('.ui-opt').getBoundingClientRect(); return { modal: d.matches(':modal'), bottom: Math.abs(r.bottom - innerHeight) < 2, full: Math.abs(r.width - innerWidth) < 2, title: d.querySelector('.ui-sheet-title')?.textContent, grip: !!d.querySelector('.ui-sheet-grip'), rowH: o.height, kb: document.activeElement.tagName !== 'INPUT' }; });
await ph.tap('dialog.ui-sheet .ui-opt:has-text("Maths")'); await wait(400);
const sh2 = await pe(() => ({ v: document.getElementById('gxs2').value, gone: !document.querySelector('dialog.ui-sheet'), log: LOG.splice(0).length }));
check('Phone (390 px): the select opens as a modal bottom sheet across the full width, with a grip, a title and 48 px rows, and the search box does not grab the keyboard; choosing sets the value and removes the sheet', sh1 && sh1.modal && sh1.bottom && sh1.full && /Subject/.test(sh1.title) && sh1.grip && sh1.rowH >= 44 && sh1.kb && sh2.v === 'Maths' && sh2.gone && sh2.log === 2, JSON.stringify({ sh1, sh2 }));
await ph.tap('#gxd1'); await wait(450);
const sh3 = await pe(() => { const d = document.querySelector('dialog.ui-sheet'); return d ? { day: d.querySelector('.ui-day').getBoundingClientRect().height, w: d.getBoundingClientRect().width } : null; });
const grip = await ph.locator('dialog.ui-sheet .ui-sheet-grip').boundingBox();
await ph.mouse.move(grip.x + grip.width / 2, grip.y + 10); await ph.mouse.down(); await ph.mouse.move(grip.x + grip.width / 2, grip.y + 200, { steps: 6 }); await ph.mouse.up(); await wait(450);
const sh4 = await pe(() => ({ gone: !document.querySelector('dialog.ui-sheet'), v: document.getElementById('gxd1').value }));
await ph.tap('#gxt1'); await wait(450); await ph.touchscreen.tap(195, 60); await wait(450);
const sh5 = await pe(() => !document.querySelector('dialog.ui-sheet'));
check('Phone: the date picker is a sheet with 44 px days; dragging the grip down closes it without a change; tapping the dimmed area closes a sheet', sh3 && sh3.day >= 44 && sh3.w >= 388 && sh4.gone && sh4.v === '' && sh5, JSON.stringify({ sh3, sh4, sh5 }));
// ---------- app-only: the demo writes nothing; motion levels; Glossed; True Minimalist; every palette ----------
const wr = await ev(() => ({ w: window.__w, ls: JSON.stringify(Object.entries(localStorage).sort()) === window.__ls }));
const wrPh = await pe(() => ({ w: window.__w, ls: JSON.stringify(Object.entries(localStorage).sort()) === window.__ls }));
check('Demo account: after using every control (desktop and phone) nothing was written to Firestore and browser storage is unchanged', !wr.w.length && wr.ls && !wrPh.w.length && wrPh.ls, JSON.stringify({ wr: wr.w, ls: wr.ls, wrPh: wrPh.w, lsPh: wrPh.ls }));
const mo = [];
for (const m of ['reduced', 'off', 'full']) {
  await ev(m => { document.documentElement.dataset.motion = m; }, m); await p.click('#gxs1'); await wait(m === 'off' ? 60 : 360);
  mo.push(await ev(m => { const pop = document.querySelector('.ui-pop'), cs = pop && getComputedStyle(pop); return { m, op: cs ? +cs.opacity : -1, tr: cs ? cs.transform : '', h: pop ? pop.getBoundingClientRect().height : 0 }; }, m));
  await p.keyboard.press('Escape'); await wait(150);
}
check('Animations Reduced and Off: the panel still opens fully (opaque, in place) — nothing depends on a transition finishing', mo.every(x => x.op === 1 && (x.tr === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(x.tr)) && x.h > 80), JSON.stringify(mo));
const looks = [];
for (const [name, fn] of [['glass-full', () => setGlass('full')], ['glass-lite', () => setGlass('lite')], ['minimal', () => { setGlass('off'); setMinimal(true); showTab('gallery'); }], ['normal', () => { setMinimal(false); showTab('gallery'); }]]) {
  await p.evaluate(`(${fn.toString()})()`); await wait(500); await p.click('#gxd1'); await wait(300);
  looks.push(await ev(name => { const pop = document.querySelector('.ui-pop'), r = pop ? pop.getBoundingClientRect() : null, hit = r ? document.elementFromPoint(r.left + r.width / 2, r.top + 20) : null; return { name, shown: !!r && r.height > 200, onTop: !!hit && !!hit.closest('.ui-pop'), bg: pop ? getComputedStyle(pop).backgroundColor : '' }; }, name));
  await p.keyboard.press('Escape'); await wait(200);
}
check('Glossed (full and lite) and True Minimalist: the date panel opens on top with a solid background', looks.every(x => x.shown && x.onTop && !/rgba\(0, 0, 0, 0\)|transparent/.test(x.bg)), JSON.stringify(looks));
// ---------- the preset chooser (kind="preset") ----------
await p.evaluate(() => { document.querySelector('#galleryBody').scrollIntoView(); window.scrollTo(0, 0); }); await log();
await p.click('#gxp1'); await wait(400);
const pr1 = await ev(() => { const pop = document.querySelector('.ui-pop'); return { groups: [...pop.querySelectorAll('.ui-group')].map(g => (g.querySelector('.ui-grp') || {}).textContent + ':' + [...g.querySelectorAll('.ui-opt .ui-opt-l')].map(x => x.textContent).join(',')), search: !!pop.querySelector('.ui-search input'), foot: [...pop.querySelectorAll('.ui-foot-btn')].map(b => b.textContent.trim()), chips: pop.querySelector('.ui-opt .ui-rhy').textContent.replace(/\s+/g, ''), name: pop.querySelector('.ui-opt').textContent.replace(/\s+/g, ' ').trim(), stars: pop.querySelectorAll('.ui-star').length, starOn: pop.querySelectorAll('.ui-star.on').length }; });
check('Preset chooser: Favourites, Recent and All presets sections, a search box, each row with its rhythm (25 / 5 × 4) and a star, "New preset" and "Edit presets" at the bottom',
  pr1.groups.join(' | ') === 'Favourites:Classic | Recent:Deep work,Sprint | All presets:Mock test,Reading,Revision' && pr1.search && pr1.foot.join() === 'New preset,Edit presets' && pr1.chips === '25/5×4' && /25 minutes focus, 5 minutes break, 4 rounds/.test(pr1.name) && pr1.stars === 6 && pr1.starOn === 1, JSON.stringify(pr1));
await p.click('.ui-pop .ui-opt:has-text("Mock test") .ui-star'); await wait(200);
const pr2 = await ev(() => { const pop = document.querySelector('.ui-pop'); return { open: !!pop, fav: pop ? [...pop.querySelectorAll('.ui-group')][0].textContent.replace(/\s+/g, ' ') : '', value: document.getElementById('gxp1').value, log: LOG.splice(0), focus: !!(document.activeElement && document.activeElement.closest('.ui-pop .ui-search')), actRow: (document.querySelector('.ui-pop .ui-opt.act .ui-opt-l') || {}).textContent, pv: document.getElementById('pvDlg').open }; });
check('Preset chooser: the star makes a favourite without closing the list or choosing the preset (no input / change event); the keyboard stays in the panel, on the same row', pr2.open && /Classic/.test(pr2.fav) && /Mock test/.test(pr2.fav) && pr2.value === 'classic' && pr2.log.join() === 'fav:mock=1' && pr2.focus && pr2.actRow === 'Mock test' && !pr2.pv, JSON.stringify(pr2));
await p.keyboard.type('rev'); await wait(200);
const pr3 = await ev(() => [...document.querySelectorAll('.ui-pop .ui-opt .ui-opt-l')].map(x => x.textContent).join());
await p.keyboard.press('Enter'); await wait(400);
const pr4 = await ev(() => ({ value: document.getElementById('gxp1').value, face: document.querySelector('#gxp1 .ui-face').textContent.replace(/\s+/g, ' ').trim(), star: !!document.querySelector('#gxp1 .ui-face .ui-star'), open: !!document.querySelector('.ui-pop'), log: LOG.splice(0) }));
check('Preset chooser: typing filters, Enter chooses — one input and one change event, and the closed control shows the name with its rhythm', pr3 === 'Revision' && pr4.value === 'rev' && /^Revision\s*30\s*\/\s*5\s*×\s*4/.test(pr4.face) && !pr4.star && !pr4.open && pr4.log.join() === 'input:gxp1=rev,change:gxp1=rev', JSON.stringify({ pr3, pr4 }));
await p.click('#gxp1'); await wait(350); await p.click('.ui-pop .ui-foot-btn >> nth=0'); await wait(350);
const pr5 = await ev(() => ({ open: !!document.querySelector('.ui-pop'), log: LOG.splice(0), value: document.getElementById('gxp1').value }));
check('Preset chooser: "New preset" closes the list and hands over to the app without changing the choice', !pr5.open && pr5.log.join() === 'preset:new' && pr5.value === 'rev', JSON.stringify(pr5));
// ---------- the shared footer of value panels: a shortcut · Clear · Done ----------
await p.evaluate(() => { window.scrollTo(0, 0); document.getElementById('gxd1').value = '2026-03-10'; LOG.splice(0); });
await p.click('#gxd1'); await wait(350);
const f1 = await ev(() => { const pop = document.querySelector('.ui-pop'); return { title: pop.querySelector('.ui-cal-title').textContent, foot: [...pop.querySelectorAll('.ui-foot-v button')].map(b => b.textContent), quick: [...pop.querySelectorAll('.ui-qrow')].map(b => b.querySelector('span').textContent + '|' + b.querySelector('small').textContent).slice(0, 2) }; });
await p.click('.ui-pop [data-today]'); await wait(150);
const f2 = await ev(() => { const pop = document.querySelector('.ui-pop'), now = new Date(); return { open: !!pop, title: pop.querySelector('.ui-cal-title').textContent === now.toLocaleDateString([], { month: 'long', year: 'numeric' }), focusToday: document.activeElement.classList.contains('today'), value: document.getElementById('gxd1').value, log: LOG.slice() }; });
await p.click('.ui-pop [data-clear]'); await wait(350);
const f3 = await ev(() => ({ open: !!document.querySelector('.ui-pop'), value: document.getElementById('gxd1').value, log: LOG.splice(0) }));
check('Date panel: quick picks show the date they mean; Today goes back to this month and puts the cursor on today without choosing; Clear empties the field (one input, one change) and closes',
  /March 2026/.test(f1.title) && f1.foot.join() === 'Today,Clear,Done' && /^Today\|\S+ \d+$/.test(f1.quick[0]) && f2.open && f2.title && f2.focusToday && f2.value === '2026-03-10' && !f2.log.length && !f3.open && f3.value === '' && f3.log.join() === 'input:gxd1=,change:gxd1=', JSON.stringify({ f1, f2, f3 }));
await p.click('#gxd2'); await wait(300); const f4 = await ev(() => [...document.querySelectorAll('.ui-pop .ui-foot-v button')].map(b => b.textContent).join()); await p.click('.ui-pop .ui-done'); await wait(350);
const f5 = await ev(() => ({ open: !!document.querySelector('.ui-pop'), log: LOG.splice(0) }));
check('A required date has no Clear; Done closes without an event', f4 === 'Today,Done' && !f5.open && !f5.log.length, JSON.stringify({ f4, f5 }));
await p.evaluate(() => { document.getElementById('gxt1').value = '14:30'; LOG.splice(0); }); await p.click('#gxt1'); await wait(350);
await p.click('.ui-pop [data-now]'); await wait(150);
const tn1 = await ev(() => { const n = new Date(), v = document.getElementById('gxt1').value, [hh, mm] = v.split(':').map(Number), d = Math.abs((hh * 60 + mm) - (n.getHours() * 60 + n.getMinutes())); return { v, near: d <= 3 || d >= 1437, step: mm % 5 === 0, open: !!document.querySelector('.ui-pop'), tiles: document.querySelectorAll('.ui-pop .ui-ttile').length }; });
await p.click('.ui-pop [data-clear]'); await wait(350);
const tn2 = await ev(() => ({ open: !!document.querySelector('.ui-pop'), v: document.getElementById('gxt1').value, log: LOG.splice(0) }));
check('Time panel: four times of day, each with the time it means; Now sets the current time (to the step) and stays open; Clear empties it and closes — one change event in all',
  tn1.tiles === 4 && tn1.near && tn1.step && tn1.open && !tn2.open && tn2.v === '' && tn2.log.filter(x => /^change:/.test(x)).length === 1, JSON.stringify({ tn1, tn2 }));
await p.evaluate(() => { document.getElementById('gxc1').scrollIntoView({ block: 'center' }); LOG.splice(0); }); await wait(150); await p.click('#gxc1'); await wait(350); await p.click('.ui-pop [data-default]'); await wait(350);
const cd1 = await ev(() => ({ v: document.getElementById('gxc1').value, open: !!document.querySelector('.ui-pop'), log: LOG.splice(0) }));
check('Colour panel: Default puts the default colour back (one input, one change) and closes', cd1.v === '#2f8f83' && !cd1.open && cd1.log.join() === 'input:gxc1=#2f8f83,change:gxc1=#2f8f83', JSON.stringify(cd1));
// ---------- tooltips ----------
await p.evaluate(() => document.getElementById('gxtip1').scrollIntoView({ block: 'center' })); await wait(200);
const tipState = () => ev(() => { const t = document.querySelector('.ui-tip'); const r = t && t.getBoundingClientRect(), a = document.getElementById('gxtip1').getBoundingClientRect(); return { on: !!t && t.classList.contains('on') && getComputedStyle(t).display !== 'none', text: t ? t.textContent : '', hidden: t ? t.getAttribute('aria-hidden') : '', above: !!r && r.bottom <= a.top + 1, centred: !!r && Math.abs((r.left + r.width / 2) - (a.left + a.width / 2)) < 3 }; });
await p.hover('#gxtip1'); await wait(150); const tp0 = await tipState(); await wait(600); const tp1 = await tipState();
await p.mouse.move(5, 5); await wait(150); const tp2 = await tipState();
check('Tooltip: appears after a short hover (not at once), above the button and centred on it, with its key hint; it is hidden from assistive tech (the button has its own name) and goes when the pointer leaves',
  !tp0.on && tp1.on && tp1.text === 'Skip to breakS' && tp1.hidden === 'true' && tp1.above && tp1.centred && !tp2.on, JSON.stringify({ tp0, tp1, tp2 }));
await p.focus('.gx-wrap .linkbtn'); await p.keyboard.press('Tab'); await wait(200); const tp3 = await tipState();
await p.keyboard.press('Escape'); await wait(100); const tp4 = await tipState();
const tpTouch = await (async () => { await ph.evaluate(() => document.getElementById('gxtip1').scrollIntoView({ block: 'center' })); await wait(200); await ph.tap('#gxtip1'); await wait(700); return pe(() => !!document.querySelector('.ui-tip.on')); })();
check('Tooltip: keyboard focus shows it at once and a key press hides it; a tap on a phone never shows one', tp3.on && !tp4.on && !tpTouch, JSON.stringify({ tp3, tp4, tpTouch }));
const names = await ev(() => { const out = [], WAS_UNNAMED = ['remDlg', 'calDlg', 'squadDlg', 'loginDlg', 'examDlg', 'tplDlg', 'keysDlg', 'presetDlg', 'migrateDlg', 'levelDlg']; for (const d of document.querySelectorAll('dialog[id]')) { if (d.classList.contains('ui-pop')) continue; const P = HTMLDialogElement.prototype; try { d.showModal(); } catch (e) { out.push(d.id + ' (did not open)'); continue; } const lb = d.getAttribute('aria-label') || (d.getAttribute('aria-labelledby') || '').split(/\s+/).map(i => (document.getElementById(i) || {}).textContent || '').join(' ').trim(); if (!(d.hasAttribute('aria-label') || d.hasAttribute('aria-labelledby')) || (!lb && WAS_UNNAMED.includes(d.id))) out.push(d.id); P._uiClose.call(d); d.classList.remove('closing'); } return { n: document.querySelectorAll('dialog[id]').length, out }; });
check(`Every dialog has an accessible name once it is open (${names.n} dialogs; the ten that had none take their heading)`, names.n >= 36 && !names.out.length, JSON.stringify(names.out));
const pal = await ev(async () => {
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const probe = document.createElement('div'); probe.style.setProperty('transition', 'none', 'important'); document.body.appendChild(probe);   // (a theme change crossfades colours: the probe must not)
  const res = v => { probe.style.color = ''; probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
  const cvx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const toRgb = c => { probe.style.color = c; const o = getComputedStyle(probe).color; if (/^rgb/.test(o)) return o; const m = /color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)/.exec(o); if (m) return `rgb(${Math.round(m[1] * 255)}, ${Math.round(m[2] * 255)}, ${Math.round(m[3] * 255)})`; cvx.clearRect(0, 0, 1, 1); cvx.fillStyle = '#000'; cvx.fillStyle = o; cvx.fillRect(0, 0, 1, 1); const d = cvx.getImageData(0, 0, 1, 1).data; return `rgb(${d[0]}, ${d[1]}, ${d[2]})`; };
  const out = [], keep = S.settings.theme, keepSkin = typeof equippedId === 'function' ? equippedId('theme') : null;
  const ids = ['', ...Object.keys(SKINS)];
  for (const id of ids) for (const mode of ['light', 'dark']) {
    const sk = id ? SKINS[id] : null; if (sk && sk.force && sk.force !== mode) continue; if (sk && !sk[mode]) continue;
    themePreviewId = id || 'th_default'; applyTheme(mode); await new Promise(r => setTimeout(r, 0));   // (an unknown id = the default palette)
    const g = v => toRgb(res(v));
    const L = ['--frame', '--bg', '--card-quiet', '--surface', '--card-hi', '--pop-bg', '--ctl-bg'].map(g);
    const min = (c, on) => +Math.min(...on.map(x => ratio(c, x))).toFixed(2);
    out.push({ id: id || 'default', mode, bd: min(g('--ctl-bd'), L.slice(1)), text: min(g('--t-1'), L), muted: min(g('--t-2'), L), accText: min(g('--accent-text'), L), focus: min(g('--focus'), L),
      onAcc: min(g('--on-accent'), [g('--accent-fill')]), onDanger: min(g('--on-danger'), [g('--danger-fill')]), dangerText: min(g('--danger-text'), L), warnText: min(g('--warn-text'), L), okText: min(g('--ok-text'), L) });
  }
  themePreviewId = ''; S.settings.theme = keep; applyTheme(); probe.remove();
  return out;
});
const base = await ev(async () => {
  const out = { diff: [] }, norm = c => { const x = document.createElement('canvas').getContext('2d'); x.fillStyle = c; return x.fillStyle; };
  const sheet = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n'), region = sheet.slice(sheet.indexOf('THEME TOKENS'), sheet.indexOf('DESIGN TOKENS (v2.0)'));
  for (const mode of ['light', 'dark']) for (const k of Object.keys(BASE_PAL[mode])) { if (k === 'ok') continue; if (!region.includes('--' + k + ': ' + BASE_PAL[mode][k] + ';')) out.diff.push(mode + ' ' + k + ' ' + BASE_PAL[mode][k]); }
  const ts = []; for (let i = 0; i < 20; i++) { const t0 = performance.now(); themePreviewId = i % 2 ? 'th_forest' : 'th_default'; applyTheme(i % 4 < 2 ? 'dark' : 'light'); ts.push(performance.now() - t0); }
  out.ms = +ts.sort((a, b) => a - b)[10].toFixed(2); themePreviewId = ''; applyTheme();
  return out;
});
check('The default palette the token arithmetic uses is the stylesheet\'s own, and applying a theme stays cheap (no forced restyle: under 5 ms)', !base.diff.length && base.ms < 5, JSON.stringify(base));
const NEED = { bd: 3, text: 7, muted: 4.5, accText: 4.5, focus: 3, onAcc: 4.5, onDanger: 4.5, dangerText: 4.5, warnText: 4.5, okText: 4.5 };
const weak = pal.filter(x => Object.entries(NEED).some(([k, v]) => !(x[k] >= v)));
console.log('palette minimums', JSON.stringify(Object.fromEntries(Object.keys(NEED).map(k => [k, Math.min(...pal.map(x => x[k]))]))));
check(`Every palette (${pal.length} palette × mode pairs), on every layer (frame, page, quiet card, card, hero card, panel, field): a field's lip at least 3:1, the focus ring at least 3:1, text at least 7:1, secondary / accent / danger / warning / success text at least 4.5:1, text on a filled accent or danger button at least 4.5:1`, pal.length >= 40 && !weak.length, JSON.stringify(weak.slice(0, 6)));
const lit = await ev(() => { const css = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n'), miss = []; for (const [key, dark] of [['default:l', false], ['default:d', true]]) { const o = derivedFor(key + 'x', dark, null); for (const k in o) if (!css.includes(`--${k}: ${o[k]};`)) miss.push(key + ' --' + k + ': ' + o[k]); } return miss; });
check('The stylesheet\'s first-paint colour roles (the GENERATED block) are exactly what the script works out for the default palette', !lit.length, JSON.stringify(lit.slice(0, 6)));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 5)));
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await b.close();
process.exit(fails ? 1 : 0);
