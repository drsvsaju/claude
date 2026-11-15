// Layout audit: every tab and dialog at phone/tablet/desktop widths with long names.
// Reports horizontal scroll, elements sticking out of the viewport, clipped text without
// ellipsis, and touch targets under 44px. Usage: node audit.mjs [shots] [dark] [glass]
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const args = process.argv.slice(2), SHOTS = args.includes('shots');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [], found = new Map();
const LONG = 'Organic Chemistry – Aldehydes, Ketones and Carboxylic Acids (revision part 2)';
const seed = (LONG) => {
  const ss = [], day = 864e5, now = Date.now();
  for (let d = 0; d < 70; d++) for (let k = 0; k < 2 + (d % 3); k++) {
    const st = new Date(now - d * day); st.setHours(7 + k * 3, 10, 0, 0);
    if (st > now) continue;
    const len = [25, 50, 30][k % 3];
    ss.push({ id: `a${d}_${k}`, name: [LONG, 'Physics', 'Maths – Integration by parts', 'Biology'][(d + k) % 4], start: +st, end: +st + len * 6e4, duration: len * 6e4, planned: len * 6e4, preset: 'Classic 25/5',
      ...(k === 0 && d < 5 ? { subtasks: [{ t: 'Read chapter 7 summary and annotate every worked example carefully', d: true }, { t: 'Problems 1–10', d: false }] } : {}) });
  }
  const t = new Date(Date.now() + 2 * 3600e3), dk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  localStorage.setItem('focus-app-v1', JSON.stringify({
    sessions: ss.sort((a, b) => a.start - b.start),
    presets: [{ id: 'p-classic', name: 'Classic 25/5', focus: 25, short: 5, long: 15, rounds: 4 }, { id: 'p-deep', name: 'Deep Work 50/10', focus: 50, short: 10, long: 20, rounds: 3 }, { id: 'p-long', name: 'Very long preset name for weekend mock exams', focus: 90, short: 15, long: 30, rounds: 2 }],
    reminders: [{ id: 'r1', title: LONG, date: dk(t), time: `${String(t.getHours()).padStart(2, '0')}:00`, repeat: 'none', dur: 50, created: Date.now() }, { id: 'r2', title: 'Physics', date: dk(new Date(Date.now() + day)), time: '09:30', repeat: 'daily', dur: 25, created: Date.now() }],
    exams: [{ id: 'x1', name: 'JEE Main (January session) – Paper 1 with a long name', date: dk(new Date(Date.now() + 40 * day)), added: Date.now() }],
    parked: [{ id: 'p1', text: 'Remember to email the teacher about the extra worksheet for next week’s practical', at: Date.now() - 4e5, done: false }],
    revisions: [{ id: 'v1', topic: LONG, created: Date.now() - 3 * day, step: 1, next: dk(new Date()), time: '18:00', presetId: '', log: [], done: {}, snooze: {} }],
    energy: Object.fromEntries(ss.slice(-30).map((s, i) => [s.id, 1 + (i % 4)])),
    settings: { goalMin: 120 },
  }));
  localStorage.setItem('pomodorolist-guest', '1');
  localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1');
  localStorage.setItem('pomodorolist-seen-version', '9.9');
  localStorage.setItem('pomodorolist-tips-seen', JSON.stringify(['stats', 'reminders', 'quests', 'shop', 'friends', 'board', 'profile', 'settings']));
  const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()));
};
const check = touch => {
  const out = [], vw = innerWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push(['page', `page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`]);
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
    if (own && el.scrollWidth > el.clientWidth + 1 && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis') out.push([sig(el), `text clipped without ellipsis: "${el.textContent.trim().slice(0, 30)}"`]);
    // text running out of its box (overflow visible) into neighbours
    if (own && cs.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 2 && cs.display !== 'inline' && el.clientWidth > 0) out.push([sig(el), `text overflows its box: "${el.textContent.trim().slice(0, 30)}"`]);
    if (touch && el.matches('button, a[href], select, summary, [role=button], input:not([type=hidden]):not([type=range])') && !el.disabled) {
      let h = r.height, w = r.width;
      const pa = getComputedStyle(el, '::after'); if (pa.content !== 'none' && pa.position === 'absolute') { w = Math.max(w, parseFloat(pa.width) || 0); h = Math.max(h, parseFloat(pa.height) || 0); }
      const lab = el.closest('label, .setting, .tut-switch'); // a whole row that toggles counts as the target
      if (lab && el.matches('input[type=checkbox]') && (lab.matches('label') || lab.dataset.rowToggle !== undefined)) { const lr = lab.getBoundingClientRect(); h = lr.height; w = lr.width; }
      if (el.matches('input[type=text], input[type=number], input[type=date], input[type=time], input:not([type]), select, textarea')) { if (h < 40) out.push([sig(el), `field only ${Math.round(h)}px tall`]); }
      else if (h < 43.5 || w < 43.5) out.push([sig(el), `tap target ${Math.round(w)}×${Math.round(h)} (“${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 18)}”)`]);
    }
  }
  return out;
};
const viewports = [[360, 740, true], [390, 844, true], [768, 1024, true], [1280, 860, false]].filter(([w]) => !process.env.W || process.env.W.split(',').includes(String(w)));
for (const [w, h, touch] of viewports) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 700, colorScheme: args.includes('dark') ? 'dark' : 'light' });
  await ctx.addInitScript(g => { if (g) localStorage.setItem('pomodorolist-glass', g); }, args.includes('glass') ? 'full' : null);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`${w}: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|firestore|WebChannel/i.test(m.text())) errs.push(`${w} console: ${m.text().slice(0, 140)}`); });
  await p.goto('http://localhost:8000/index.html');
  await p.evaluate(seed, LONG);
  await p.goto('http://localhost:8000/index.html');
  await p.waitForSelector('#appView:not(.hidden)'); await wait(2200);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); $$('.pomeo-bubble').forEach(x => x.classList.add('hidden')); });
  const record = (where, list) => { for (const [s, m] of list) { const k = `${s} — ${m.replace(/\d+(\.\.\d+)?( \/ \d+)?\)/, '…)')}`; if (!found.has(k)) found.set(k, new Set()); found.get(k).add(`${w}:${where}`); } };
  const views = [
    ['timer', () => showTab('timer')], ['timer-running', () => { showTab('timer'); S.timer.phase = 'focus'; startTimer(); }], ['timer-after', () => { S.timer.endAt = Date.now() - 5; }],
    ['reminders', () => showTab('reminders')], ['quests', () => showTab('quests')],
    ['stats-week', () => { S.ui.statsView = 'week'; showTab('stats'); }], ['stats-day', () => { S.ui.statsView = 'day'; renderStats(); }], ['stats-month', () => { S.ui.statsView = 'month'; renderStats(); }], ['stats-year', () => { S.ui.statsView = 'year'; renderStats(); }],
    ['board', () => showTab('board')], ['shop', () => showTab('shop')], ['friends', () => showTab('friends')], ['profile', () => showTab('profile')], ['settings', () => showTab('settings')], ['about', () => showTab('about')],
    ['dlg-rem', () => { showTab('reminders'); openRemForm(); }], ['dlg-cal', () => openCal(S.reminders[0])], ['dlg-squad', () => openSquad()], ['dlg-login', () => openLoginDlg()],
    ['dlg-exam', () => openExams()], ['dlg-tpl', () => openTemplates()], ['dlg-inbox', () => openInbox()], ['dlg-cmd', () => openCmd()], ['dlg-keys', () => $('#keysDlg').showModal()],
    ['dlg-preset', () => $('#managePresets').click()], ['dlg-card', () => { showTab('profile'); openCardDlg(); }], ['dlg-share', () => { showTab('profile'); openShareDlg(); }], ['bag-stamps', () => { S.ui.bagCat = 'stamp'; showTab('bag'); }], ['bag-cards', () => { S.ui.bagCat = 'card'; showTab('bag'); }], ['shop-stamps', () => { S.ui.shopCat = 'stamp'; showTab('shop'); }], ['dlg-level', () => showLevelUp(3, 4)], ['dlg-tut', () => startTutorial()], ['wrapped', () => openWrapped(0)],
  ];
  for (const [name, fn] of views.filter(([n]) => !process.env.VIEWS || process.env.VIEWS.split(',').includes(n))) {
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); if (typeof closeWrapped === 'function') closeWrapped(); });
    const res = await p.evaluate(`(() => { try { (${fn.toString()})(); return ''; } catch (e) { return e.stack.split('\\n').slice(0, 4).join(' | '); } })()`);
    if (res) { errs.push(`${w} ${name}: ${res}`); continue; }
    await wait(name.startsWith('timer') ? 2600 : 700);
    if (process.env.DBG) console.log(name, await p.evaluate(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).minHeight + ' ' + e.getBoundingClientRect().height + ' coarse=' + matchMedia('(pointer: coarse)').matches : 'none'; }, process.env.DBG));
    record(name, await p.evaluate(check, touch));
    if (SHOTS) await p.screenshot({ path: `au-${w}-${name}.png`, fullPage: !name.startsWith('dlg') && name !== 'wrapped' });
    if (name === 'timer-after') await p.evaluate(() => { hideNote(); finishPhase('reset'); });
  }
  await ctx.close();
}
const rows = [...found.entries()].map(([k, v]) => `${k}  [${[...v].slice(0, 6).join(' ')}${v.size > 6 ? ' +' + (v.size - 6) : ''}]`).sort();
console.log(rows.join('\n'));
console.log(`\n${rows.length} distinct findings`);
console.log('errors', errs);
await b.close();
