// v2.0 phase 8: the layout audit — every tab and view, and the dialogs 2.0 added or changed, at 360 / 390 / 768 /
// 1024 / 1280 / 1440 / 1920 / 2560 px, in light, dark, Glossed (lite and full) and True Minimalist, on the demo account
// (full sample data, and it writes nothing). For each state: no sideways page scroll, nothing wider than the screen
// outside a scroller, dialogs inside the screen, no button whose text is cut off without an ellipsis, and on phones no
// control in a 2.0 dialog under 44 px. A list of what failed, at most a few lines per state.
import { b, wait, log, check, errs, failCount } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); } catch (e) {} });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
const p = await ctx.newPage();
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8000/index.html?emulator=1'); await p.waitForSelector('#authView:not(.hidden)'); await wait(700);
await p.click('#previewBtn'); await p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 15000 }); await wait(2500);
await p.addStyleTag({ content: '.toasts, #toast, #pomeoBubble, #pomeoPop, .pv-banner { display: none !important; }' });
const AUDIT = `(() => {
  const vw = innerWidth, vh = innerHeight, out = [], phone = vw < 500;
  if (document.documentElement.scrollWidth - vw > 1) out.push('page scrolls sideways by ' + (document.documentElement.scrollWidth - vw));
  const vis = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const inScroller = e => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true; } return false; };
  const dlg = document.querySelector('dialog[open]'), root = dlg ? [dlg] : [...document.querySelectorAll('main, .sidenav, .topbar, header')];
  for (const r0 of root) for (const e of r0.querySelectorAll('*')) {
    if (!vis(e) || inScroller(e)) continue;
    const r = e.getBoundingClientRect(); if (r.width < 1) continue;
    if (r.right > vw + 1 || r.left < -1) { out.push('off screen: ' + e.tagName + '.' + String(e.className).slice(0, 30) + ' ' + Math.round(r.left) + '–' + Math.round(r.right)); if (out.length > 5) break; }
  }
  if (dlg) { const r = dlg.getBoundingClientRect(); if (r.width > vw + 1 || r.height > vh + 1 || r.left < -1 || r.top < -1) out.push('dialog outside the screen: #' + dlg.id + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
  for (const btn of (dlg || document).querySelectorAll('button')) { if (!vis(btn) || inScroller(btn) || (!dlg && !btn.closest('main'))) continue; if (btn.scrollWidth > btn.clientWidth + 2 && getComputedStyle(btn).whiteSpace === 'nowrap' && getComputedStyle(btn).textOverflow !== 'ellipsis') out.push('button text cut: ' + btn.textContent.trim().slice(0, 30)); }
  if (phone && dlg && /^(streakDlg|brkDlg|wnDlg|blockDlg|calDayDlg)$/.test(dlg.id)) for (const c of dlg.querySelectorAll('button, ui-select, a.btn')) { if (!vis(c)) continue; const r = c.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) out.push('small target in #' + dlg.id + ': ' + (c.id || c.textContent.trim().slice(0, 20)) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
  return out.slice(0, 4);
})()`;
const sl = 'await new Promise(r => setTimeout(r, 350));';
const SCREENS = [
  ['timer', "showTab('timer')"], ['timer on a break', "const t = S.timer; t.phase = 'short'; t.status = 'idle'; renderTimer(); showTab('timer')"],
  ['reminders', "S.ui.remView = 'rem'; showTab('reminders')"], ['to-do', "S.ui.remView = 'todo'; showTab('reminders')"], ['flashcards', "S.ui.remView = 'cards'; showTab('reminders')"],
  ['calendar month', "S.ui.calView = 'month'; CAL.anchor = null; showTab('calendar')"], ['calendar week', "S.ui.calView = 'week'; CAL.anchor = null; CAL.scroll = null; showTab('calendar')"], ['calendar agenda', "S.ui.calView = 'agenda'; CAL.anchor = null; showTab('calendar')"],
  ['stats', "showTab('stats')"], ['garden', "showTab('garden')"], ['quests', "showTab('quests')"], ['profile', "showTab('profile')"],
  ['friends', "S.ui.friendsView = 'friends'; SOC.friend = null; showTab('friends')"], ['challenges', "S.ui.friendsView = 'challenges'; SOC.friend = null; showTab('friends')"], ['invite', "S.ui.friendsView = 'invite'; SOC.friend = null; showTab('friends')"],
  ['posts', "showTab('posts')"], ['study sessions', "showTab('sessions')"], ['clan', "showTab('clan')"], ['leaderboard', "showTab('board')"], ['shop', "showTab('shop')"], ['bag', "showTab('bag')"], ['room', "showTab('room')"], ['settings', "showTab('settings')"], ['about', "showTab('about')"],
  ['streak care', "showTab('timer'); openStreakCare()"], ['break ideas', "showTab('timer'); openBreak('')"], ['breathing', "showTab('timer'); openBreak('breathe')"], ['stretch', "showTab('timer'); openBreak('stretch')"],
  ['plan a block', "showTab('calendar'); openBlockForm({ date: todayKey(), time: '16:00', dur: 50 })"], ['a calendar day', "showTab('calendar'); calOpenDay(todayKey())"],
  ['what’s new tour', "showTab('timer'); if (typeof startNewsTour === 'function') startNewsTour()"],
  ['a gift', "showTab('timer'); showRewardReveal({ kicker: 'A thank-you', title: '3 friends joined and stayed', items: ['frame_i_link'], coins: 200, key: 'lay' + Math.random() })"],
];
const VAR = [{ mode: 'light', glass: 'off', mini: false }, { mode: 'dark', glass: 'off', mini: false }, { mode: 'dark', glass: 'full', mini: false }, { mode: 'light', glass: 'lite', mini: false }, { mode: 'light', glass: 'off', mini: true }];
const WIDTHS = [360, 390, 768, 1024, 1280, 1440, 1920, 2560];
const bad = []; let n = 0;
for (const v of VAR) {
  await p.evaluate(v => { S.settings.theme = v.mode; applyTheme(); const root = document.documentElement; if (v.glass === 'off') delete root.dataset.glass; else root.dataset.glass = v.glass; if (minimal() !== v.mini) setMinimal(v.mini); }, v); await wait(400);   // (the demo stores nothing, so the Glossed level is set on the page itself)
  for (const w of WIDTHS) {
    await p.setViewportSize({ width: w, height: w < 500 ? 780 : w < 1100 ? 1000 : 900 }); await wait(250);
    for (const [name, code] of SCREENS) {
      await p.evaluate(async c => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); await new Promise(r => setTimeout(r, 200)); scrollTo(0, 0); await (0, eval)(`(async () => { ${c} })()`); }, code);
      await wait(380);
      const issues = await p.evaluate(AUDIT); n++;
      if (issues.length) bad.push({ v: `${v.mode}/${v.glass}${v.mini ? '/minimal' : ''}`, w, screen: name, issues });
    }
  }
}
const byScreen = {}; for (const x of bad) (byScreen[x.screen] ||= []).push(`${x.v}@${x.w}: ${x.issues.join(' | ')}`);
for (const [s, l] of Object.entries(byScreen)) log(`  ${s}: ${l.length} states — ${l.slice(0, 3).join(' ;; ')}`);
check(`Every tab and view and the 2.0 dialogs (${SCREENS.length} screens) at 360–2560 px in light, dark, Glossed lite / full and True Minimalist (${n} states): no sideways scroll, nothing off screen, dialogs fit, no button text cut, 44 px targets in the 2.0 dialogs on phones`, !bad.length, `${bad.length} states with problems`);
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 5)));
log(failCount() ? `✗ ${failCount()} FAILED` : '✓ all passed');
await b.close();
process.exit(failCount() ? 1 : 0);
