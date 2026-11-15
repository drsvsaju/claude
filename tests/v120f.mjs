// v1.20 phase 5: layout audit of everything new in 1.20, at 360 / 390 / 768 / 1024 / 1280 / 1440 / 1920 / 2560 px, in light,
// dark, Glossed (lite / full) and True Minimalist: the Rank card hint + the rank ladder, the timer in Overtime (+ its
// line and buttons) and "Were you still focusing?", the Study Pass, Posts, Settings › posting. For each: no
// sideways page scroll, nothing wider than the screen, dialogs inside the screen, no button text cut off, and the rank
// UI hidden in True Minimalist. A new account with sample data.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg } from './cl-common.mjs';
const A = await device('A', 1280, {}, { overtime: true });
await signup(A, 'lay_' + Date.now().toString(36).slice(-5)); await closeDlg(A);
// some progress, a pass with claimable tiers, a few posts (owner of its own feed)
await A.ev(() => {
  const ev = currentEvent(), d0 = parseDay(ev.start); S.game.claims.pass._from = evStart(ev);
  const add = []; for (let i = 0; i < 3; i++) { const st = Math.min(Date.now() - 3 * 3600e3, +addDays(d0, i) + 9 * 3600e3); add.push({ id: 'ly' + i, name: 'Physics', start: st, end: st + 150 * 6e4, duration: 150 * 6e4, planned: 150 * 6e4 }); }
  S.sessions.push(...add); S.sessions.sort((x, y) => x.start - y.start); cloudAddSessions(add); G = null; PASSC = null; save();
});
await wait(1500);
await A.ev(async () => { POST.burst = 0; for (const [t, r, n] of [['streak', 'm7', 7], ['hours', 'h50', 50], ['evo', 'e2', 2]]) { POST.burst = 0; S.ui.postDay = null; await makePost(t, r, n); } });
await wait(1500);
const AUDIT = `(() => {
  const vw = innerWidth, vh = innerHeight, out = [];
  if (document.documentElement.scrollWidth - vw > 1) out.push('page scrolls sideways by ' + (document.documentElement.scrollWidth - vw));
  const vis = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const inScroller = e => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
  for (const e of document.querySelectorAll('main *, dialog[open] *')) {
    if (!vis(e) || inScroller(e)) continue;
    const r = e.getBoundingClientRect(); if (r.width < 1) continue;
    if (r.right > vw + 1 || r.left < -1) { out.push('off screen: ' + e.tagName + '.' + String(e.className).slice(0, 30) + ' ' + Math.round(r.left) + '–' + Math.round(r.right)); if (out.length > 6) break; }
  }
  for (const d of document.querySelectorAll('dialog[open]')) { const r = d.getBoundingClientRect(); if (r.width > vw + 1 || r.height > vh + 1 || r.left < -1 || r.top < -1) out.push('dialog outside the screen: #' + d.id + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
  for (const btn of document.querySelectorAll('main button, dialog[open] button')) { if (!vis(btn) || inScroller(btn)) continue; if (btn.scrollWidth > btn.clientWidth + 2 && getComputedStyle(btn).whiteSpace === 'nowrap' && getComputedStyle(btn).textOverflow !== 'ellipsis') out.push('button text cut: ' + btn.textContent.trim().slice(0, 30)); }
  return out;
})()`;
const SCREENS = [
  ['rank card + ladder', async () => { showTab('profile'); await new Promise(r => setTimeout(r, 400)); if (!minimal()) openRankLadder(); }],
  ['timer in overtime', async () => { const t = S.timer; if (!t.ot) { t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 60000; t.focusStartedAt = Date.now() - 3 * 60000; t.endAt = Date.now() - 2 * 60000; } showTab('timer'); }],
  ['"still focusing?"', async () => { showTab('timer'); if (S.timer.ot) otAsk(); }],
  ['Study Pass', async () => { S.ui.questView = 'pass'; showTab('quests'); renderQuests(); }],
  ['Posts', async () => { showTab('posts'); await loadPosts(true); renderPosts(true); }],
  ['Settings › posting', async () => { showTab('settings'); const d = $('#postTypesBox'); if (d) { d.open = true; d.scrollIntoView(); } }],
];
const VAR = [{ mode: 'light', glass: 'off', mini: false }, { mode: 'dark', glass: 'off', mini: false }, { mode: 'dark', glass: 'full', mini: false }, { mode: 'light', glass: 'lite', mini: false }, { mode: 'light', glass: 'off', mini: true }];
const bad = [], mini = [];
for (const v of VAR) {
  await A.ev(v => { S.settings.theme = v.mode; applyTheme(); setGlass(v.glass); if (minimal() !== v.mini) setMinimal(v.mini); }, v); await wait(400);
  for (const w of [360, 390, 768, 1024, 1280, 1440, 1920, 2560]) {
    await A.p.setViewportSize({ width: w, height: w < 500 ? 780 : 900 }); await wait(250);
    for (const [name, fn] of SCREENS) {
      await A.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
      await A.p.evaluate(`(${fn.toString()})()`); await wait(450);
      const issues = await A.p.evaluate(AUDIT);
      if (issues.length) bad.push({ v: `${v.mode}/${v.glass}${v.mini ? '/minimal' : ''}`, w, screen: name, issues: issues.slice(0, 4) });
      if (v.mini && name === 'rank card + ladder') mini.push(await A.ev(() => ({ ladder: !!$('#rankLadderDlg[open]'), hint: [...document.querySelectorAll('.rk-hint, [data-rkladder]')].some(e => e.getClientRects().length) })));
    }
  }
}
await A.ev(() => { const t = S.timer; if (t.ot) otStop('stop'); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
check(`Every new 1.20 screen (${SCREENS.map(s => s[0]).join(', ')}) at 360–2560 px in light, dark, Glossed lite/full and True Minimalist: no sideways scroll, nothing off screen, dialogs fit, no button text cut`, !bad.length, JSON.stringify(bad.slice(0, 8)));
check('True Minimalist: no rank hint and no rank ladder', mini.length && mini.every(m => !m.ladder && !m.hint), JSON.stringify(mini.slice(0, 3)));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 5)));
log(failCount() ? `${failCount()} FAILED` : 'ALL PASSED');
await b.close();
process.exit(failCount() ? 1 : 0);
