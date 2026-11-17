// v2.0 phase 6c/6d — break ideas (breathing, stretch cards, the 20-20-20 eye rest, water) and what Focus insights
// says from the session log alone (the last 7 days, overtime, the weekly plan, friends).
// Break ideas are offered on breaks only and store nothing but today's glasses of water on this device; the insights
// publish nothing and read friends' weekly minutes through the cache the Friends tab already uses.
// The activities are drawn from the clock, so the checks move their start time instead of waiting.
import { b, wait, log, check, errs, failCount } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function page(w, h = 900, tag = 'p', fixed = null) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); } catch (e) {} });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(), net = [];
  if (fixed) await p.clock.setFixedTime(fixed);
  p.on('pageerror', e => errs.push(tag + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|transport errored|Could not reach Cloud Firestore|offline mode|unavailable/i.test(m.text())) errs.push(tag + ' error: ' + m.text().slice(0, 160)); });
  p.on('request', r => { if (/:8080|:9099|googleapis\.com\/(google\.firestore|identitytoolkit)|firestore\.googleapis/.test(r.url()) && r.method() !== 'GET') net.push(r.method() + ' ' + r.url().slice(0, 80)); });
  await p.goto('http://localhost:8000/index.html?emulator=1'); await p.waitForSelector('#authView:not(.hidden)'); await wait(700);
  return { ctx, p, net, ev: (f, a) => p.evaluate(f, a) };
}
const storage = d => d.ev(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))));
const guest = async d => { await d.p.click('#guestBtn'); await d.p.waitForSelector('#appView:not(.hidden)'); await wait(1500); for (let i = 0; i < 3; i++) { await d.ev(() => { if ($('#tutDlg') && $('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); }); await wait(400); } };
const preview = async d => { await d.p.click('#previewBtn'); await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 15000 }); await wait(2500); await d.ev(() => { document.querySelectorAll('dialog[open]:not(#pvDlg)').forEach(x => x.close()); closePop(); }); };
const HELP = () => {
  window.T = {
    vis: el => !!el && el.getClientRects().length > 0,
    onBreak() { const t = S.timer; t.phase = 'short'; t.status = 'idle'; renderTimer(); },
    onFocus(run) { const t = S.timer; t.phase = 'focus'; t.status = run ? 'running' : 'idle'; if (run) { t.endAt = Date.now() + 20 * 60000; t.planned = 25 * 60000; t.focusStartedAt = Date.now() - 5 * 60000; } renderTimer(); },
    at(sec) { BRK.t0 = Date.now() - sec * 1000; brkTick(); return { cue: ($('#brkCue') || {}).textContent, n: ($('#brkN') || {}).textContent, round: ($('#brkRound') || {}).textContent, orb: ($('#brkOrb') || {}).className, hint: ($('#brkHint') || {}).textContent }; },
    ideas: () => cmdList('').filter(x => x.g === 'Break ideas').map(x => x.t),
    toasts: () => [...document.querySelectorAll('.toast-item')].map(x => x.textContent.trim()),
    sl: ms => new Promise(r => setTimeout(r, ms)),
    add(list) { const t0 = startOfDay(new Date()); for (const [off, min, o] of list) { const st = +addDays(t0, off) + 9 * 3600e3 + S.sessions.length * 60000; S.sessions.push({ id: 'sd' + S.sessions.length, name: (o && o.name) || 'Physics', start: st, end: st + min * 6e4, duration: min * 6e4, planned: min * 6e4, ...(o || {}) }); } S.sessions.sort((a, b) => a.start - b.start); G = null; },
    ins() { renderEnergyCard(); const el = $('#energySlot'); return { html: el.innerHTML, text: el.textContent.replace(/\s+/g, ' ').trim(), boxes: [...el.querySelectorAll('.ins')].map(x => [x.querySelector('.k').textContent, x.querySelector('.v').textContent, (x.querySelector('.s') || {}).textContent || '']), week: el.querySelector('.ins-week') ? [el.querySelector('.ins-week .v').textContent, el.querySelector('.ins-week .s').textContent, (el.querySelector('.ins-take') || {}).textContent || ''] : null, hint: !!el.querySelector('.ins-progress'), chart: !!el.querySelector('.ins-chart'), img: !!el.querySelector('img') }; },
  };
};

// ====================== a guest ======================
// the clock is pinned to the latest Thursday at noon: the weekly plan's "behind" does not depend on the weekday the test runs
const thu = new Date(); thu.setDate(thu.getDate() - ((thu.getDay() - 4 + 7) % 7)); thu.setHours(12, 0, 0, 0);
const G1 = await page(1280, 900, 'guest', thu);
await guest(G1); await G1.ev(HELP);

// ---------- 1. offered on breaks only ----------
const offer = await G1.ev(() => {
  const out = {}; showTab('timer');
  T.onFocus(false); out.idle = T.vis($('#brkRow'));
  T.onFocus(true); out.focus = T.vis($('#brkRow')); out.ideasFocus = T.ideas().length; out.refused = openBreak('breathe') === false && !$('#brkDlg').open;
  T.onFocus(false); out.ideasIdle = T.ideas();
  T.onBreak(); out.brk = T.vis($('#brkRow')); out.chips = [...$('#brkRow').querySelectorAll('.brk-chip')].map(x => x.textContent.trim()); out.label = $('#brkRow').getAttribute('aria-label');
  return out;
});
check('The row of break ideas is under the timer on a break only (not while a focus block waits or runs); during focus the ideas are not in the palette and cannot be opened; between blocks the palette has all four',
  !offer.idle && !offer.focus && offer.ideasFocus === 0 && offer.refused && offer.ideasIdle.length === 4 && offer.brk && offer.chips.join() === 'Breathe,Stretch,Rest your eyes,Water' && offer.label === 'Break ideas', JSON.stringify(offer));

// ---------- 2. the breathing minute ----------
await G1.p.click('#brkRow [data-brk="breathe"]'); await wait(400);
const br = await G1.ev(async () => {
  const out = { open: $('#brkDlg').open, title: $('#brkTitle').textContent, focus: document.activeElement === $('#brkTitle'), live: $('#brkCue').getAttribute('aria-live'), nHidden: $('#brkN').getAttribute('aria-hidden'), back: T.vis($('#brkBack')) };
  out.t1 = T.at(1); out.t5 = T.at(5); out.t9 = T.at(9); out.t15 = T.at(15); out.t55 = T.at(55); out.end = T.at(57); out.iv = BRK.iv; out.more = !!$('#brkRound [data-brk="breathe"]');
  $('#brkRound [data-brk="breathe"]').click(); await T.sl(100); out.again = { cue: $('#brkCue').textContent, iv: !!BRK.iv };
  const root = document.documentElement, m0 = root.getAttribute('data-motion'); root.setAttribute('data-motion', 'reduced'); await T.sl(50);
  const cs = getComputedStyle($('#brkOrb')); out.calm = [cs.transform, cs.transitionDuration, cs.transitionProperty]; if (m0 === null) root.removeAttribute('data-motion'); else root.setAttribute('data-motion', m0);
  return out;
});
check('“Breathe” opens a guided minute: in for 4, hold for 4, out for 6, four rounds, then “Done. Notice how you feel.” with “Once more”; the words are announced (the countdown is not), and with reduced motion the circle does not grow or shrink',
  br.open && br.title === 'Breathe' && br.focus && br.live === 'polite' && br.nHidden === 'true' && br.back
  && br.t1.cue === 'Breathe in' && br.t1.n === '3' && /\bin\b/.test(br.t1.orb) && br.t1.round === 'Round 1 of 4' && br.t5.cue === 'Hold' && br.t5.n === '3' && br.t9.cue === 'Breathe out' && br.t9.n === '5' && /out/.test(br.t9.orb)
  && br.t15.cue === 'Breathe in' && br.t15.round === 'Round 2 of 4' && br.t55.round === 'Round 4 of 4' && br.end.cue === 'Done. Notice how you feel.' && br.end.n === '✓' && br.iv === 0 && br.more && br.again.cue === 'Breathe in' && br.again.iv
  && (br.calm[0] === 'none' || br.calm[0] === 'matrix(1, 0, 0, 1, 0, 0)') && !/transform/.test(br.calm[2]), JSON.stringify(br));

// ---------- 3. stretch cards, the eye rest, water ----------
const acts = await G1.ev(async () => {
  const out = {};
  $('#brkBack').click(); await T.sl(100); out.menu = [...$('#brkBody').querySelectorAll('.brk-tile b')].map(x => x.textContent).join() + '|' + T.vis($('#brkBack')) + '|' + $('#brkTitle').textContent;
  $('#brkBody [data-brk="stretch"]').click(); await T.sl(100);
  out.s1 = T.at(0); out.s1b = T.at(21); out.text = $('#brkText').textContent.length > 20; out.note = /nothing should hurt/.test($('#brkBody').textContent);
  $('#brkNext').click(); await T.sl(50); out.s2 = { cue: $('#brkCue').textContent, round: $('#brkRound').textContent, hint: $('#brkHint').textContent };
  for (let i = 0; i < 8; i++) $('#brkNext').click(); out.wrap = $('#brkCue').textContent; $('#brkNext').click();
  $('#brkBack').click(); await T.sl(50); $('#brkBody [data-brk="stretch"]').click(); await T.sl(50); out.resume = $('#brkCue').textContent;   // it carries on where it was
  $('#brkBack').click(); await T.sl(50); $('#brkBody [data-brk="eyes"]').click(); await T.sl(50);
  out.e1 = T.at(1); out.e2 = T.at(21); out.eIv = BRK.iv; out.eText = /6 metres \(20 feet\)/.test($('#brkBody').textContent);
  $('#brkBack').click(); await T.sl(50); $('#brkBody [data-brk="water"]').click(); await T.sl(50);
  out.w0 = $('#brkCue').textContent; $('#brkDrank').click(); await T.sl(50); out.w1 = $('#brkCue').textContent; $('#brkDrank').click(); await T.sl(50); out.w2 = $('#brkCue').textContent;
  out.stored = S.ui.water && S.ui.water.d === todayKey() && S.ui.water.n;
  $('#brkBack').click(); await T.sl(50); out.tile = $('#brkBody [data-brk="water"] .lbl').textContent;
  S.ui.water = { d: '2020-01-01', n: 5 }; out.otherDay = waterToday(); S.ui.water = { d: todayKey(), n: 2 }; saveLocal();
  $('#brkClose').click(); await T.sl(400); out.closed = !$('#brkDlg').open && BRK.iv === 0;   // (a dialog takes 170 ms to close)
  return out;
});
await G1.p.reload(); await G1.p.waitForSelector('#appView:not(.hidden)'); await wait(1500); await G1.ev(HELP);
const after = await G1.ev(async () => {
  const out = { water: waterToday() };
  T.onBreak(); openBreak('eyes'); await T.sl(100); out.open = $('#brkDlg').open;
  T.onFocus(true); await T.sl(400); out.closedByFocus = !$('#brkDlg').open && BRK.iv === 0; T.onFocus(false);
  return out;
});
check('“All ideas” goes back to the four tiles; the stretch cards hold about 20 seconds each, go round all eight and carry on where they were; the eye rest counts 20 seconds and says when it is done',
  acts.menu === 'Breathe,Stretch,Rest your eyes,Water|false|Break ideas' && acts.s1.cue === 'Neck' && acts.s1.round === 'Stretch 1 of 8' && acts.s1.hint === 'Hold for about 20 s' && /Swap sides/.test(acts.s1b.hint) && acts.text && acts.note
  && acts.s2.cue === 'Shoulders' && acts.s2.round === 'Stretch 2 of 8' && /Hold for about 20 s/.test(acts.s2.hint) && acts.wrap === 'Shoulders' && acts.resume === 'Chest'
  && acts.e1.cue === 'Look at something far away' && acts.e1.n === '19' && acts.e2.cue === 'Done. Blink a few times.' && acts.e2.n === '✓' && acts.eIv === 0 && acts.eText, JSON.stringify(acts));
check('Water counts glasses for today on this device only (kept across a reload, a new day starts at none); Done closes and stops the clock, and a focus block that starts closes the dialog',
  acts.w0 === 'None counted yet today' && acts.w1 === '1 glass today' && acts.w2 === '2 glasses today' && acts.stored === 2 && acts.tile === '2 today' && acts.otherDay === 0 && acts.closed && after.water === 2 && after.open && after.closedByFocus, JSON.stringify({ acts: { w0: acts.w0, w1: acts.w1, w2: acts.w2, stored: acts.stored, tile: acts.tile, otherDay: acts.otherDay, closed: acts.closed }, after }));

// ---------- 4. the setting ----------
const set = await G1.ev(async () => {
  const out = {}; showTab('settings'); await T.sl(200);
  const box = $('#setBreakActs'); out.row = T.vis(box.closest('.setting')) && box.checked;
  box.click(); await T.sl(100); out.off = S.settings.breakActs === false; showTab('timer'); T.onBreak(); out.rowOff = T.vis($('#brkRow')); out.ideasOff = T.ideas().length;
  showTab('settings'); box.click(); await T.sl(100); out.on = S.settings.breakActs === true; showTab('timer'); T.onBreak(); out.rowOn = T.vis($('#brkRow')); T.onFocus(false);
  return out;
});
check('Settings › “Break ideas” switches it off (no row on a break, nothing in the palette) and on again', set.row && set.off && !set.rowOff && set.ideasOff === 0 && set.on && set.rowOn, JSON.stringify(set));

// ---------- 5. Focus insights from the log alone ----------
const ins = await G1.ev(async () => {
  const out = {};
  S.sessions = []; S.energy = {}; S.plan = []; S.settings.energy = 'always'; G = null; showTab('stats'); await T.sl(200);
  out.empty = T.ins();                                             // nothing yet: the invitation to check in, as before
  S.settings.energy = 'off'; out.emptyOff = T.ins().html; S.settings.energy = 'always';
  T.add([[-1, 60], [-2, 50], [-3, 45, { ot: 5, planned: 40 * 6e4 }], [-4, 60, { ot: 10, planned: 50 * 6e4 }], [-5, 30, { early: 1, planned: 50 * 6e4 }], [-6, 55, { ot: 6, planned: 49 * 6e4 }], [-9, 60], [-10, 60], [-12, 30]]);
  out.week = T.ins();
  S.plan = [{ id: 'pn1', v: 1, name: 'Physics', hrs: 1, at: Date.now() - 30 * 864e5 }, { id: 'pn2', v: 1, name: '<img src=x onerror=alert(1)>', hrs: 40, at: Date.now() - 30 * 864e5 }];
  out.plan = T.ins(); out.L = logInsights();
  S.settings.energy = 'off'; out.off = T.ins(); S.settings.energy = 'always';
  S.sessions = S.sessions.filter(s => s.start >= +addDays(startOfDay(new Date()), -7)); G = null; out.first = T.ins().week;   // nothing in the 7 days before
  return out;
});
const wk = ins.week;
check('With no blocks and no check-ins the card is the invitation to check in, as before (nothing at all when check-ins are off); with blocks it opens with “Last 7 days” against the 7 before and an Overtime box (blocks past the timer, their average, finished early)',
  /Keep checking in after sessions to unlock insights — 0\/10 so far\./.test(ins.empty.text) && ins.empty.hint && !ins.empty.week && ins.emptyOff === ''
  && wk.week && wk.week[0] === '5h' && wk.week[1] === '2h 30m more than the 7 days before' && wk.boxes.some(x => x[0] === 'Overtime' && x[1] === '3 of 9 blocks' && x[2] === 'about 7 min past the timer · 1 finished early') && wk.hint && !wk.chart, JSON.stringify({ empty: ins.empty.text, emptyOff: ins.emptyOff, week: wk.week, boxes: wk.boxes, hint: wk.hint }));
const pb = ins.plan.boxes.find(x => x[0] === 'Weekly plan') || [];
check('A weekly plan adds “Weekly plan · N of M on track” naming the subject furthest behind, and the week’s one-line suggestion points at it (a subject’s name is shown as text, never as markup); with check-ins off the boxes stay and the invitation goes; a first week says “of focus”',
  /^\d of 2 on track$/.test(pb[1] || '') && /<img src=x onerror=alert\(1\)> is .* behind/.test(pb[2] || '') && /behind this week’s plan: a block of it next\?/.test(ins.plan.week[2]) && !ins.plan.img && ins.L.plan.behind.name === '<img src=x onerror=alert(1)>'
  && ins.off.boxes.length >= 2 && !ins.off.hint && ins.off.week && ins.first && ins.first[1] === 'of focus', JSON.stringify({ pb, take: ins.plan.week, off: ins.off.boxes, hint: ins.off.hint, first: ins.first }));
await G1.ctx.close();

// ====================== the demo ======================
const DM = await page(1280, 900, 'demo');
await preview(DM); await DM.ev(HELP);
const s0 = await storage(DM), n0 = DM.net.length;
const demo = await DM.ev(async () => {
  const out = {}, ui0 = JSON.stringify(S.ui.water || null);
  showTab('timer'); T.onBreak(); out.row = T.vis($('#brkRow'));
  $('#brkRow [data-brk="water"]').click(); await T.sl(300); out.sample = $('#brkCue').textContent;
  $('#brkDrank').click(); await T.sl(300); out.prompt = $('#pvDlg').open && $('#pvWhy').textContent; if ($('#pvDlg').open) $('#pvDlg').close(); await T.sl(200);
  out.direct = brkDrank(); if ($('#pvDlg').open) $('#pvDlg').close(); out.same = ui0 === JSON.stringify(S.ui.water || null) && $('#brkCue').textContent === out.sample;
  $('#brkClose').click(); T.onFocus(false);
  showTab('stats'); await T.sl(1500);                              // friends' weekly minutes arrive through the shared cache
  const I = T.ins(); out.week = I.week; out.boxes = I.boxes.map(x => x[0]); out.ot = I.boxes.find(x => x[0] === 'Overtime'); out.fr = I.boxes.find(x => x[0] === 'Among friends') || null; out.L = logInsights().friends; out.chart = I.chart;
  return out;
});
await wait(1200);
const s1 = await storage(DM);
check('The demo shows the break ideas (a sample water count; “I had a glass” explains instead of counting) and the fuller insights card (the week, overtime, the plan, friends when ahead of any), and writes nothing',
  demo.row && demo.sample === '3 glasses today' && /keep your own water count/.test(demo.prompt || '') && demo.direct === false && demo.same
  && demo.week && /^\d+h/.test(demo.week[0]) && demo.boxes.includes('Best time of day') && demo.boxes.includes('Intentions') && demo.boxes.includes('Overtime') && demo.boxes.includes('Weekly plan') && /finished early/.test(demo.ot[2]) && demo.chart
  && demo.L && demo.L.n >= 2 && (demo.L.ahead > 0) === !!demo.fr && (!demo.fr || /^Ahead of (all )?\d/.test(demo.fr[1]))
  && s0 === s1 && DM.net.length === n0, JSON.stringify({ demo, net: DM.net.slice(n0), storageSame: s0 === s1 }));
await DM.ctx.close();

// ====================== a phone ======================
const PH = await page(390, 844, 'phone');
await guest(PH); await PH.ev(HELP);
await PH.ev(() => { showTab('timer'); T.onBreak(); $('#brkRow').scrollIntoView({ block: 'center' }); });
await wait(300);
const ph1 = await PH.ev(() => { const r = el => el.getBoundingClientRect(); return { chips: [...$('#brkRow').querySelectorAll('.brk-chip')].map(el => [Math.round(r(el).width), Math.round(r(el).height), r(el).left >= 0 && r(el).right <= innerWidth]), over: document.documentElement.scrollWidth > innerWidth }; });
await PH.p.tap('#brkRow [data-brk="stretch"]'); await wait(500);
const ph2 = await PH.ev(async () => {
  const r = el => el.getBoundingClientRect(), dlg = $('#brkDlg'), out = { open: dlg.open, over: document.documentElement.scrollWidth > innerWidth };
  const small = () => [...dlg.querySelectorAll('button')].filter(el => el.getClientRects().length && (r(el).height < 43.5 || r(el).width < 43.5)).map(el => (el.id || el.className) + ' ' + Math.round(r(el).width) + 'x' + Math.round(r(el).height));
  out.small = small(); out.inside = r($('#brkBody')).left >= r(dlg).left && r($('#brkBody')).right <= r(dlg).right + 0.5 && r(dlg).right <= innerWidth && r(dlg).bottom <= innerHeight + 0.5;
  $('#brkBack').click(); await T.sl(100); out.smallMenu = small(); out.tiles = [...dlg.querySelectorAll('.brk-tile')].map(el => Math.round(r(el).height));
  dlg.close();
  return out;
});
check('On a phone (390 px) the four chips fit the row and are 44 px tall, the dialog fits the screen, and every button in it is at least 44 px',
  ph1.chips.length === 4 && ph1.chips.every(c => c[1] >= 44 && c[2]) && !ph1.over && ph2.open && !ph2.over && ph2.small.length === 0 && ph2.inside && ph2.smallMenu.length === 0 && ph2.tiles.every(h => h >= 44), JSON.stringify({ ph1, ph2 }));
await PH.ctx.close();

check('No page errors', errs.length === 0, errs.join(' | '));
log(`\n${failCount() ? '✗ ' + failCount() + ' FAILED' : '✓ all passed'}`);
await b.close();
process.exit(failCount() ? 1 : 0);
