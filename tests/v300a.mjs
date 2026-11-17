// v2.0 Phase 3 — the shared shell and vocabulary, the timer hero, and the faults the screen audit found.
//   node --import ./ui-compat.mjs v300a.mjs
// A signed-up account (emulator) runs the timer; the demo account is used for every screen with data, on a desktop
// window and on a phone.
import { b, device, signup, wait, log, check, errs, failCount, U } from './cl-common.mjs';

const A = await device('A', 1280, {}, { overtime: true });
await signup(A, 'p3a' + Date.now().toString(36).slice(-5));
const demo = async (w) => {
  const d = await device('demo' + w, w, {}, { overtime: true });
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await d.ev(() => startPreview()); await d.p.waitForSelector('#appView:not(.hidden)'); await wait(3500);
  await d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await wait(400);
  return d;
};
const D = await demo(1280), M = await demo(390);

/* ---------- the dialog shell ---------- */
const shell = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  showTab('quests'); await sl(300);
  const d = $('#squadDlg'); d.showModal(); await sl(350);
  const x = d.querySelector(':scope > .dlg-xw .dlg-x'), t = d.querySelector('.dlg-title'), xr = x && x.getBoundingClientRect(), tr = t && t.getBoundingClientRect(), cs = t && getComputedStyle(t);
  const line = cs ? parseFloat(cs.lineHeight) : 0;
  out.squad = { x: !!x, first: d.firstElementChild.className, title: !!t, size: cs && cs.fontSize, weight: cs && cs.fontWeight, upper: cs && cs.textTransform, focusOnX: document.activeElement === x,
    dy: xr && tr ? Math.round(Math.abs((xr.top + xr.height / 2) - (tr.top + line / 2))) : -1, label: x && x.getAttribute('aria-label') };
  x.click(); await sl(350); out.squad.closed = !d.open;
  openCollection(); await sl(350); out.coll = { open: $('#collDlg').open, x: !!$('#collDlg .dlg-x'), own: !!$('#collDlg [data-coll-close]') }; $('#collDlg').close();
  const cf = $('#confirmDlg'); cf.showModal(); await sl(300); out.confirm = { open: cf.open && cf.matches('.cf-dlg'), x: !!cf.querySelector('.dlg-x') }; cf.close(); await sl(200);
  openRankLadder(); await sl(350); const rk = $('#rankLadderDlg'); out.rank = { x: !!rk.querySelector('.dlg-x'), top: rk.scrollTop, title: !!rk.querySelector('.dlg-title') }; rk.close();
  showTab('timer'); await sl(300);
  out.h2 = [...document.querySelectorAll('#tab-timer .card h2')].filter(h => h.offsetWidth).slice(0, 3).map(h => { const c = getComputedStyle(h); return c.textTransform + '/' + c.fontSize + '/' + c.fontWeight; });
  return out;
});
check('Dialog shell: a dialog opens with a close button as its first child and its heading as a 17 / 600 sentence-case title; the first focus is not the close button; the button sits level with the title and closes the dialog',
  shell.squad.x && shell.squad.first === 'dlg-xw' && shell.squad.title && shell.squad.size === '17px' && shell.squad.weight === '600' && shell.squad.upper === 'none' && !shell.squad.focusOnX && shell.squad.dy <= 5 && shell.squad.label === 'Close' && shell.squad.closed, JSON.stringify(shell.squad));
check('A dialog with its own close button gets no second one; a question that must be answered gets none; the rank ladder opens at its top with a title',
  shell.coll.open && !shell.coll.x && shell.coll.own && shell.confirm.open && !shell.confirm.x && shell.rank.x && shell.rank.top === 0 && shell.rank.title, JSON.stringify({ coll: shell.coll, confirm: shell.confirm, rank: shell.rank }));
check('Card titles are sentence case, 14 / 600 (no letter-spaced capitals)', shell.h2.length >= 2 && shell.h2.every(v => v === 'none/14px/600'), JSON.stringify(shell.h2));

const sheet = await M.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  showTab('quests'); await sl(300);
  const d = $('#squadDlg'); d.showModal(); await sl(1200);
  const r = d.getBoundingClientRect(), x = d.querySelector('.dlg-x').getBoundingClientRect(), t = d.querySelector('.dlg-title').getBoundingClientRect();
  out.squad = { left: Math.round(r.left), w: Math.round(r.width), vw: innerWidth, bottom: Math.round(r.bottom), vh: innerHeight, xw: Math.round(x.width), xh: Math.round(x.height), dy: Math.round(Math.abs((x.top + x.height / 2) - (t.top + 11))), radius: getComputedStyle(d).borderTopLeftRadius };
  d.close(); await sl(300);
  openRankLadder(); await sl(700); const rk = $('#rankLadderDlg'), rr = rk.getBoundingClientRect(), tt = rk.querySelector('.dlg-title').getBoundingClientRect();
  out.rank = { top: rk.scrollTop, titleIn: tt.top >= rr.top && tt.bottom <= rr.bottom, h: Math.round(rr.height), vh: innerHeight }; rk.close();
  return out;
});
check('On a phone a dialog is a bottom sheet: full width, on the bottom edge, rounded only at the top, with a 44 px close button level with the title; a long one (the rank ladder) opens at its top with the title in view, at most 88% tall',
  sheet.squad.left === 0 && sheet.squad.w === sheet.squad.vw && Math.abs(sheet.squad.bottom - sheet.squad.vh) <= 1 && sheet.squad.xw === 44 && sheet.squad.xh === 44 && sheet.squad.dy <= 6 && sheet.squad.radius === '22px'
  && sheet.rank.top === 0 && sheet.rank.titleIn && sheet.rank.h <= sheet.rank.vh * .88 + 1, JSON.stringify(sheet));

/* ---------- one filled accent per view; counts, not dots; label chips; no dashed edge on anything that works ---------- */
const vocab = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = { filled: {}, dashed: [], dots: [] };
  showTab('timer'); await sl(250);
  const fill = getComputedStyle($('#mainBtn')).backgroundColor;
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const views = [['timer'], ['reminders', () => { S.ui.remView = 'rem'; }], ['reminders:todo', () => { S.ui.remView = 'todo'; }], ['reminders:cards', () => { S.ui.remView = 'cards'; }],
    ['quests', () => { S.ui.questView = 'boss'; }], ['quests:quest', () => { S.ui.questView = 'quest'; }], ['quests:pass', () => { S.ui.questView = 'pass'; }], ['quests:board', () => { S.ui.questView = 'board'; }],
    ['garden'], ['bag'], ['shop'], ['friends'], ['posts'], ['sessions'], ['clan'], ['board'], ['profile'], ['stats']];
  for (const [id, pre] of views) {
    const tab = id.split(':')[0]; if (pre) pre(); showTab('timer'); showTab(tab); await sl(450);
    const sec = $('#tab-' + tab);
    out.filled[id] = [...sec.querySelectorAll('button, a.btn')].filter(e => vis(e) && !e.disabled && getComputedStyle(e).backgroundColor === fill).map(e => (e.textContent || '').trim().slice(0, 18));
    for (const e of sec.querySelectorAll('*')) {
      if (!vis(e)) continue; const c = getComputedStyle(e);
      const dashed = ['borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle'].some(k => c[k] === 'dashed' && parseFloat(c[k.replace('Style', 'Width')]) > 0) || (c.outlineStyle === 'dashed' && parseFloat(c.outlineWidth) > 0);
      if (dashed && !e.matches(':disabled, [disabled], [aria-disabled="true"], .gd-spot i') && !e.closest('[disabled], :disabled, .seg:has(> button:disabled)')) out.dashed.push(id + ' ' + e.tagName + '.' + String(e.className).slice(0, 30));
    }
  }
  S.ui.questView = 'boss'; showTab('quests'); await sl(400);
  out.qtabs = { sdot: $$('#questSeg .sdot').length, cnt: $$('#questSeg .cnt').map(c => c.textContent), bg: $$('#questSeg .cnt').map(c => getComputedStyle(c).backgroundColor) };
  out.pill = $$('#tab-quests .pill').slice(0, 3).map(e => { const c = getComputedStyle(e); return c.borderTopLeftRadius + '/' + c.fontWeight; });
  const danger = (() => { const i = document.createElement('i'); i.style.background = 'var(--danger)'; document.body.append(i); const v = getComputedStyle(i).backgroundColor; i.remove(); return v; })();
  out.badges = $$('.tbadge').filter(vis).map(e => ({ id: e.id || e.dataset.dot || '', t: e.textContent, red: getComputedStyle(e).backgroundColor === danger, w: Math.round(e.getBoundingClientRect().width) }));
  showTab('friends'); await sl(400);
  out.req = { n: incoming().length, badge: $('#friendsBadge').textContent, hidden: $('#friendsBadge').classList.contains('hidden'), h2: ($('#friendsBody h2 .cnt') || {}).textContent || '' };
  setBadge($('#friendsBadge'), true, 0); const dot = { t: $('#friendsBadge').textContent, w: Math.round($('#friendsBadge').getBoundingClientRect().width) }; setBadge($('#friendsBadge'), true, 120); out.set = { dot, big: $('#friendsBadge').textContent }; updateFriendsDot();
  showTab('shop'); await sl(400);
  out.shop = { disabledEq: $$('#shopView .item.equipped .act button:disabled').length, chip: $$('#shopView .item.equipped .act .lchip').length, eqTag: $$('#shopView .item.equipped .pv .tag').filter(t => /Equipped|Placed/.test(t.textContent)).length };
  showTab('settings'); await sl(300); const bk = $('#settingsBack'), bc = getComputedStyle(bk);
  out.back = { h: Math.round(bk.getBoundingClientRect().height), accent: bc.color === getComputedStyle($('#mainBtn')).backgroundColor, border: bc.borderTopWidth };
  return out;
});
const tooMany = Object.entries(vocab.filled).filter(([, v]) => v.length > 1);
check('One filled accent button per view at most (row and tile actions are neutral pads): every tab and sub-view of the demo', !tooMany.length, JSON.stringify(tooMany.length ? tooMany : Object.fromEntries(Object.entries(vocab.filled).map(([k, v]) => [k, v.length]))));
check('No dashed edge on anything that can be used (a dashed edge means: this control is off)', !vocab.dashed.length, JSON.stringify(vocab.dashed.slice(0, 8)));
check('Quests tabs show how many rewards wait as a number (no bare dot), in ink — not red; a fact pill is a label chip (6 px corners)',
  vocab.qtabs.sdot === 0 && vocab.qtabs.cnt.length >= 1 && vocab.qtabs.cnt.every(t => /^\d+$/.test(t)) && vocab.pill.length >= 1 && vocab.pill.every(v => v === '6px/600'), JSON.stringify({ q: vocab.qtabs, pill: vocab.pill }));
check('Navigation badges: none is red; the Friends badge shows the number of requests and the Requests heading the same count; a badge with nothing to count is a dot, 99+ at most',
  vocab.badges.every(x => !x.red) && (vocab.req.n ? vocab.req.badge === String(vocab.req.n) && vocab.req.h2 === String(vocab.req.n) : true) && vocab.set.dot.t === '' && vocab.set.dot.w <= 9 && vocab.set.big === '99+', JSON.stringify({ badges: vocab.badges, req: vocab.req, set: vocab.set }));
check('An equipped item says so once, as a state line in its action slot — not as a disabled button, and not twice', vocab.shop.disabledEq === 0 && vocab.shop.chip >= 1 && vocab.shop.eqTag === 0, JSON.stringify(vocab.shop));
check('The back control is a quiet pad (32 px, an edge, not accent ink)', vocab.back.h === 32 && !vocab.back.accent && vocab.back.border === '1px', JSON.stringify(vocab.back));

/* ---------- the timer hero ---------- */
const rest = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)); showTab('timer'); await sl(400);
  const pr = $('#ringProg'), cap = $('#ringCap'), c = $('.ring-center');
  return { off: parseFloat(getComputedStyle(pr).strokeDashoffset), cap: cap.getAttribute('transform'), ticks: $$('#ringTicks line').length, t5: $$('#ringTicks line.t5').length, w: Math.round($('#ring').getBoundingClientRect().width),
    labelIn: c.contains($('#phaseLabel')), dotsIn: c.contains($('#roundDots')), round: $('#roundDots').dataset.l, sw: getComputedStyle(pr).strokeWidth === getComputedStyle($('#ring .track')).strokeWidth, glow: getComputedStyle(pr).filter };
});
check('The ring at rest is full (the arc is the time left), with the cap at 12 o’clock, 60 minute ticks (12 long), a track of the same width and no glow; the phase and “Round 1 of 4” sit inside it; 320 px on a desktop',
  rest.off === 0 && /translate\(250(\.00)? 130(\.00)?\)/.test(rest.cap) && rest.ticks === 60 && rest.t5 === 12 && rest.w === 320 && rest.labelIn && rest.dotsIn && /^Round 1 of \d+$/.test(rest.round) && rest.sw && rest.glow === 'none', JSON.stringify(rest));
await A.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); $('#mainBtn').click(); });
await wait(2600);
const run = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), pr = $('#ringProg'), out = { roll: 0 };
  out.status = S.timer.status; out.off = parseFloat(pr.style.strokeDashoffset); out.cap = $('#ringCap').getAttribute('transform');
  const t0 = performance.now(); while (performance.now() - t0 < 2300) { out.roll = Math.max(out.roll, $$('#timeText .dc').length); await sl(40); }
  out.text = $('#timeText').textContent; out.label = $('#timeText').getAttribute('aria-label');
  const nt = document.createElement('style'); nt.textContent = '* { transition: none !important; }'; document.head.append(nt); await sl(60);
  out.dim = document.body.classList.contains('focus-dim'); out.top = getComputedStyle($('.top')).opacity; out.topKid = getComputedStyle($('.top').firstElementChild).opacity; nt.remove();
  return out;
});
check('While a block runs the arc empties clockwise (a negative offset, the cap moves off 12 o’clock) and the digits change in place — nothing rolls every second; the top bar stays opaque while its contents dim',
  run.status === 'running' && run.off < 0 && !/translate\(250(\.00)? 130(\.00)?\)/.test(run.cap) && run.roll === 0 && /^\d\d:\d\d$/.test(run.text) && run.text === run.label && run.dim && run.top === '1' && +run.topKid < .5, JSON.stringify(run));
await wait(3000);
const calm = await A.ev(() => {
  const ring = $('#ring'), inf = document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.getComputedTiming().iterations === Infinity && !ring.contains(a.effect.target));
  return { dim: document.body.classList.contains('focus-dim'), loops: inf.length, running: inf.filter(a => a.playState === 'running').map(a => (a.animationName || '?') + '@' + (a.effect.target.id || a.effect.target.className)).slice(0, 6) };
});
check('Nothing loops while a focus block runs except the ring: every endless animation outside it is paused', calm.dim && calm.running.length === 0, JSON.stringify(calm));
const paused = await A.ev(async () => { const sl = ms => new Promise(r => setTimeout(r, ms)); pauseTimer(); await sl(300); const off = parseFloat($('#ringProg').style.strokeDashoffset); $('#resetBtn').click(); await sl(900); const again = document.getAnimations().filter(x => x.__calm).length; return { off, rest: parseFloat(getComputedStyle($('#ringProg')).strokeDashoffset), status: S.timer.status, stillHeld: again }; });
check('Paused, the arc keeps its place; after Reset it is full again; the paused loops run again once the block is no longer running', paused.off < 0 && Math.abs(paused.rest) < 1 && paused.status === 'idle' && paused.stillHeld === 0, JSON.stringify(paused));

const phone = await M.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)); showTab('timer'); await sl(400); scrollTo(0, 0);
  const rg = $('#ring').getBoundingClientRect(), mb = $('#mainBtn').getBoundingClientRect(), bar = $('.btmbar').getBoundingClientRect();
  const nt = document.createElement('style'); nt.textContent = '* { transition: none !important; }'; document.head.append(nt);   // (a page in the background draws no frames, so a transition would not advance)
  document.body.classList.add('focus-dim'); await sl(100); const o = { bar: getComputedStyle($('.btmbar')).opacity, kid: getComputedStyle($('.btmbar button')).opacity }; document.body.classList.remove('focus-dim'); nt.remove();
  openInbox(); await sl(500); const rd = $('#ibBody .ib-rd'); const ib = { has: !!rd, shown: rd ? rd.getBoundingClientRect().width > 0 : false }; $('#inboxDlg').close();
  return { ring: Math.round(rg.width), minuteTicks: $$('#ringTicks line:not(.t5)').filter(l => getComputedStyle(l).display !== 'none').length, o, ib };
});
check('Phone: the ring is 240 px with only the twelve five-minute ticks; during focus the tab bar stays opaque (its contents dim), so nothing shows through it; the inbox has no separate mark-read target on touch',
  phone.ring === 240 && phone.minuteTicks === 0 && phone.o.bar === '1' && +phone.o.kid < .5 && (!phone.ib.has || !phone.ib.shown), JSON.stringify(phone));

const today = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)); showTab('timer'); await sl(400);
  const card = $('.today-card'), kids = [...card.children].map(e => e.className.split(' ')[0]), sn = $('#streakNext'), rl = $('#rankLine'), box = e => { const c = getComputedStyle(e); return c.borderTopWidth + '/' + c.backgroundColor + '/' + c.paddingLeft; };
  return { order: kids.indexOf('td-goal') < kids.indexOf('streak-nums'), b: !!$('#todayText b'), text: $('#todayText').textContent, sn: sn.classList.contains('hidden') ? 'hidden' : box(sn), rl: rl.classList.contains('hidden') ? 'hidden' : box(rl) };
});
check('Today card: the day’s goal leads (minutes done in bold, the same words as before), and the milestone and rank lines are flat rows — no boxes inside the card',
  today.order && today.b && / of /.test(today.text) && [today.sn, today.rl].every(v => v === 'hidden' || v === '0px/rgba(0, 0, 0, 0)/0px'), JSON.stringify(today));

/* ---------- faults found by the screen audit ---------- */
const bugs = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  showTab('profile'); await sl(300); openCollection(); await sl(1300);
  const bar = $('#collDlg .xpbar'), fi = bar.querySelector('i'), br = bar.getBoundingClientRect(), fr = fi.getBoundingClientRect(), cc = collCounts();
  out.coll = { have: cc.have, total: cc.total, shown: Math.round((Math.min(fr.right, br.right) - br.left) / br.width * 100), want: Math.round(cc.have / cc.total * 100) }; $('#collDlg').close();
  S.ui.statsView = 'week'; showTab('stats'); await sl(700);
  out.axis = $$('#tab-stats svg.chart text.axis[text-anchor="end"]').map(t => { const r = t.getBoundingClientRect(), s = t.closest('svg').getBoundingClientRect(); return Math.round(r.left - s.left); });
  showTab('timer'); await sl(300); const n0 = S.presets.length, name0 = S.presets[0].name;
  $('#managePresets').click(); await sl(400); out.preset = { open: $('#presetDlg').open, rows: $$('#presetList li').length, ownClose: getComputedStyle($('#closeDlg')).display };
  $('#pfName').value = 'Changed in the demo'; $('#presetForm').requestSubmit(); await sl(400); out.preset.prompt = $('#pvDlg').open; $('#pvDlg').close(); await sl(200);
  const del = $('#presetList [data-delp]:not(:disabled)'); if (del) { del.click(); await sl(300); out.preset.prompt2 = $('#pvDlg').open; if ($('#pvDlg').open) $('#pvDlg').close(); }
  out.preset.same = S.presets.length === n0 && S.presets[0].name === name0; $('#presetDlg').close();
  openTemplates(); await sl(300); const em = $('#tplList .empty'); out.tpl = em ? { display: getComputedStyle(em).display, text: em.textContent.length, centred: getComputedStyle(em).textAlign } : null; $('#tplDlg').close();
  return out;
});
check('The Collection log’s bar is filled to the share collected (it stayed empty: it set a width, and bars move by transform)', bugs.coll.have > 0 && Math.abs(bugs.coll.shown - bugs.coll.want) <= 2, JSON.stringify(bugs.coll));
check('Chart y-axis labels are inside the chart (“1h 30m” was cut at the card’s edge)', bugs.axis.length >= 3 && bugs.axis.every(x => x >= 0), JSON.stringify(bugs.axis));
check('Demo: the preset manager opens and lists the presets; saving or deleting shows the sign-up prompt and changes nothing; the dialog has one close button',
  bugs.preset.open && bugs.preset.rows >= 1 && bugs.preset.prompt && bugs.preset.prompt2 !== false && bugs.preset.same && bugs.preset.ownClose === 'none', JSON.stringify(bugs.preset));
check('An empty list reads as one centred sentence (the subtask templates dialog put the icon left and the text far right) and says what a template is', !bugs.tpl || (bugs.tpl.display === 'block' && bugs.tpl.centred === 'center' && bugs.tpl.text > 40), JSON.stringify(bugs.tpl));

const ex = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)); const d = new Date(); d.setDate(d.getDate() + 40);
  S.exams.push({ id: 'xp3', name: 'Mock exam', date: dayKey(d), added: Date.now() }); save(); showTab('timer'); await sl(200);
  openExams(); await sl(400); const dlg = document.querySelector('dialog[open]'), f = document.activeElement;
  const out = { open: !!dlg, onDelete: !!(f && f.matches('[data-exdel], .danger, [aria-label^="Delete"], [aria-label^="Remove"]')), inDialog: !!(dlg && (f === dlg || dlg.contains(f))), n: S.exams.length };
  if (dlg) dlg.close(); S.exams = S.exams.filter(x => x.id !== 'xp3'); save(); return out;
});
check('A dialog never opens with the focus on a delete control (Enter straight after opening the exams list removed an exam)', ex.open && !ex.onDelete && ex.inDialog && ex.n === 1, JSON.stringify(ex));

const more = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  // the top bar's coin count follows the balance when a recompute changes it
  renderHeaderChip(); await sl(200); const orig = computeGame, cnt = $('#coinPill [data-count]');
  computeGame = () => { const g = orig(); g.balance += 11; return g; }; G = null; const b1 = game().balance; await sl(1600); out.coins = { bal: b1, val: +cnt.dataset.val, text: cnt.textContent };
  computeGame = orig; G = null; const b2 = game().balance; await sl(1600); out.coins.back = { bal: b2, val: +cnt.dataset.val, text: cnt.textContent };
  // a reminder can be deleted from its form; a new one has no Delete
  const d = new Date(); d.setDate(d.getDate() + 1);
  showTab('reminders'); await sl(300); openRemForm(); await sl(300); out.newDel = $('#remDelete').classList.contains('hidden'); $('#remDlg').close();
  S.reminders.push({ id: 'rp3', title: 'Phase 3 reminder', date: dayKey(d), time: '10:00', repeat: 'none', days: [], before: 10, presetId: '', session: '' }); saveReminders(); await sl(200);
  openRemForm(remById('rp3')); await sl(300); out.editDel = !$('#remDelete').classList.contains('hidden'); $('#remDelete').click(); await sl(400);
  out.gone = !remById('rp3'); out.closed = !$('#remDlg').open; showTab('timer');
  return out;
});
check('The coin count in the top bar follows the balance when it is recomputed (it stayed at the old number until something else redrew the header)',
  more.coins.val === more.coins.bal && more.coins.text === String(more.coins.bal) && more.coins.back.val === more.coins.back.bal && more.coins.back.bal === more.coins.bal - 11, JSON.stringify(more.coins));
check('A reminder can be deleted from its form (the only way on a phone besides a swipe); a new reminder has no Delete', more.newDel && more.editDel && more.gone && more.closed, JSON.stringify(more));
const ph2 = await M.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  S.ui.remView = 'rem'; showTab('reminders'); await sl(500);
  const row = $('.crem'); if (row) { const m = row.querySelector('.rem-main').getBoundingClientRect(), a = row.querySelector('.rem-acts').getBoundingClientRect(), t = row.querySelector('.rt'); out.crem = { under: a.top >= m.bottom - 1, cut: t.scrollWidth > t.clientWidth + 1, mainW: Math.round(m.width) }; }
  out.tip = getComputedStyle($('.rem-tip')).display;
  S.ui.gardenView = 'harvests'; showTab('garden'); await sl(600); scrollTo(0, 0);
  const egg = $('.gd-egg'), first = $('#gardenBody .gd-crop, #gardenBody .item');
  out.garden = { egg: egg ? getComputedStyle(egg).display : 'none', firstTop: first ? Math.round(first.getBoundingClientRect().top) : -1, vh: innerHeight };
  S.ui.gardenView = 'garden'; showTab('timer');
  return out;
});
check('Phone: a clan session in Reminders shows its whole name with the controls on the line under it; a line says how to change or delete an item; the garden’s Harvests list starts on the first screen (no egg card above it)',
  (!ph2.crem || (ph2.crem.under && !ph2.crem.cut)) && ph2.tip === 'block' && ph2.garden.egg === 'none' && ph2.garden.firstTop > 0 && ph2.garden.firstTop < ph2.garden.vh, JSON.stringify(ph2));
const tiles = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)); S.ui.questView = 'pass'; showTab('quests'); await sl(600);
  const t = $$('.pt .pt-ic .titlepv, .pt .pt-ic .namepv'); S.ui.questView = 'boss';
  return t.map(e => getComputedStyle(e).fontSize + '/' + getComputedStyle(e, '::before').content);
});
check('A title or name colour in a small reward tile is a glyph, not text cut mid-word', tiles.every(v => /^0px\/"(Aa|@)"$/.test(v)), JSON.stringify(tiles));

const ex2 = await A.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {}, d = new Date(); d.setDate(d.getDate() + 30);
  showTab('timer'); S.exams = []; save(); openExams(); await sl(300);
  $('#examName').value = 'Typed, not added'; $('#examDate').value = dayKey(d); $('#examClose').click(); await sl(400);
  out.done = { n: S.exams.length, name: (S.exams[0] || {}).name, closed: !$('#examDlg').open };
  openExams(); await sl(300); $('#examList [data-exdel]').click(); await sl(400); out.del = { n: S.exams.length, undo: !!document.querySelector('.toast-item.has-undo .undo') };
  const u = [...document.querySelectorAll('.toast-item.has-undo .undo')].pop(); if (u) u.click();   // (the newest one: an older Undo may still be on screen) await sl(400);
  out.undone = S.exams.length; $('#examDlg').close(); S.exams = []; save();
  return out;
});
check('Exams: “Done” with a name and a date typed adds the exam (it used to drop it); deleting one offers Undo, and Undo brings it back',
  ex2.done.n === 1 && ex2.done.name === 'Typed, not added' && ex2.done.closed && ex2.del.n === 0 && ex2.del.undo && ex2.undone === 1, JSON.stringify(ex2));
const look = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  S.ui.remView = 'todo'; S.ui.todoFilter = 'all'; showTab('reminders'); await sl(500);
  const shape = sel => { const e = $(sel + ' .td-pri'); if (!e) return null; const c = getComputedStyle(e); return { fill: c.backgroundColor !== 'rgba(0, 0, 0, 0)', ring: c.boxShadow !== 'none', edge: parseFloat(c.borderTopWidth) > 0 }; };
  out.pri = { high: shape('.todo.pri-high'), med: shape('.todo.pri-med'), low: shape('.todo.pri-low') };
  S.ui.remView = 'rem'; S.ui.friendsView = 'challenges'; showTab('friends'); await sl(600);
  out.chal = $$('.chal .cp .nm .cp-n').map(e => { const r = e.getBoundingClientRect(), p = e.parentElement.getBoundingClientRect(); return { inside: r.right <= p.right + 1, ell: getComputedStyle(e).textOverflow, bar: Math.round(e.closest('.cp').querySelector('.bar').getBoundingClientRect().width) }; });
  S.ui.friendsView = 'friends'; showTab('timer'); await sl(200);
  openCmd(); await sl(400); const sel = $('.cmd-list li.sel'); out.cmd = sel ? { bar: getComputedStyle(sel).boxShadow !== 'none', bold: getComputedStyle(sel).fontWeight } : null; document.querySelectorAll('dialog[open]').forEach(x => x.close());
  return out;
});
check('To-do priority is told by shape as well as colour (high: ringed dot, medium: dot, low: hollow ring)',
  look.pri.high && look.pri.high.fill && look.pri.high.ring && look.pri.med && look.pri.med.fill && !look.pri.med.ring && (!look.pri.low || (!look.pri.low.fill && look.pri.low.edge)), JSON.stringify(look.pri));
check('A challenge row shows the name inside its column with an ellipsis when it is long (it was cut mid-letter), and the bar is not wider than 700 px', look.chal.length >= 2 && look.chal.every(c => c.inside && c.ell === 'ellipsis' && c.bar <= 700), JSON.stringify(look.chal.slice(0, 4)));
check('The command palette marks its current row with a bar and bold text, not a faint fill alone', look.cmd && look.cmd.bar && +look.cmd.bold >= 600, JSON.stringify(look.cmd));
const year = await M.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)); S.ui.statsView = 'year'; showTab('stats'); await sl(800);
  const sx = $('#statsBody .scroll-x'), out = { scrolls: sx.scrollWidth > sx.clientWidth + 4, left: Math.round(sx.scrollLeft), max: sx.scrollWidth - sx.clientWidth };
  S.ui.statsView = 'week'; showTab('timer'); return out;
});
check('Phone: the year’s heatmap opens on the current weeks, not on January', !year.scrolls || year.left > year.max * .5, JSON.stringify(year));

const fc = await M.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)); S.ui.remView = 'cards'; showTab('reminders'); await sl(300); startReview(S.decks[0] && S.decks[0].id); await sl(900);
  const c = $('#fcDlg .cd-card'), k = $('#fcDlg .cd-front .cd-k'), out = { h: c ? Math.round(c.getBoundingClientRect().height) : 0, label: k ? k.textContent.trim() : '', labelSeen: k ? k.getBoundingClientRect().height > 0 && k.getBoundingClientRect().top >= c.getBoundingClientRect().top : false };
  closeReview(); S.ui.remView = 'rem'; showTab('timer'); return out;
});
check('Phone: a flashcard is a card (200 px or taller, with its “Question” label), not a 44 px strip — the touch-target rule had replaced its height', fc.h >= 200 && fc.labelSeen, JSON.stringify(fc));

const rv = await M.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  S.ui.questView = 'boss'; showTab('quests'); await sl(600); const q = $('#questSeg'); out.quests = { fits: q.scrollWidth <= q.clientWidth + 2, n: q.querySelectorAll('button').length };
  S.ui.gardenView = 'garden'; showTab('garden'); await sl(600); scrollTo(0, 0); const g = $('#gardenSeg'); out.gTop = Math.round(g.getBoundingClientRect().top); out.gFits = g.scrollWidth <= g.clientWidth + 2; out.egg1 = !!$('.gd-egg') && $('.gd-egg').getBoundingClientRect().top > g.getBoundingClientRect().bottom - 1;
  S.ui.gardenView = 'harvests'; renderGarden(); await sl(600); scrollTo(0, 0); out.hTop = Math.round($('#gardenSeg').getBoundingClientRect().top);
  S.ui.gardenView = 'garden'; showTab('timer'); await sl(300);
  out.top = $$('.top .iconbtn').filter(e => e.offsetWidth).map(e => { const a = getComputedStyle(e, '::after'); return Math.round(e.getBoundingClientRect().width + 2 * Math.abs(parseFloat(a.top) || 0)); });
  out.rank = getComputedStyle($('#lvChip .lv-rk') || document.body).display;
  return out;
});
check('Phone (from the design review): the four Quests tabs and the five Garden tabs fit their strip; the Garden tabs are at the same height on every view, with the egg card under them; top-bar buttons are 44 px targets and the rank badge is not squeezed into the bar',
  rv.quests.fits && rv.quests.n === 4 && rv.gFits && Math.abs(rv.gTop - rv.hTop) <= 1 && rv.egg1 && rv.top.length >= 2 && rv.top.every(w => w >= 44) && rv.rank === 'none', JSON.stringify(rv));
const chip = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)); showTab('timer'); await sl(300); setBadge($('#lvChip .tbadge'), true, 1); await sl(100);
  const b = $('#lvChip .tbadge').getBoundingClientRect(), l = $('#lvChip .lvn').getBoundingClientRect(), out = { overlap: !(b.right <= l.left + 1 || b.left >= l.right - 1 || b.bottom <= l.top + 1 || b.top >= l.bottom - 1), close: getComputedStyle($('#rklClose')).backgroundColor === getComputedStyle($('#mainBtn')).backgroundColor };
  updateLoginDot(); return out;
});
check('Desktop (from the design review): the profile chip’s count does not cover the level; the rank ladder’s Close is not a filled accent button', !chip.overlap && !chip.close, JSON.stringify(chip));

log('errors', JSON.stringify(errs.slice(0, 6)));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 4)));
log(failCount() ? `${failCount()} FAILED` : 'ALL PASSED');
await b.close();
process.exit(failCount() ? 1 : 0);
