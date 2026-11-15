// v1.19.1: the leaderboard switchers. Every board tab (Focus time / Garden / Ranks / Streaks) × every scope (Friends /
// Global / Clans), in every order, each kind returning to its own last period; after a reload on each board; the saved
// state 1.19 corrupted (Ranks remembered as the Focus period) and a saved Monthly period repaired; no Monthly board;
// the same at 360 px with no sideways overflow. Then every other segmented control in the app: each button, forwards
// and backwards, ends up the only active one, and the saved views survive a reload.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const A = await device('A', 1280);
await signup(A, 'lbt_' + R); await closeDlg(A);
await A.ev(() => { S.settings.globalBoard = true; S.settings.gardenTour = Date.now(); save(); showTab('board'); });   // (the garden tour would cover the Garden switcher)

const KINDS = { focus: ['day', 'week', 'life'], garden: ['produce', 'harvests'], rank: ['season'], streak: ['streak', 'best'] };
const state = () => A.ev(() => {
  const card = $('#boardBody [data-board]'), act = sel => { const x = $(sel + ' .active'); return x ? x.dataset : {}; };
  return { board: card ? card.dataset.board : null, kind: act('#lbKind').kind || null, period: act('#lbPeriod').period || null, scope: act('#lbScope').scope || null,
    periods: $$('#lbPeriod [data-period]').map(x => x.dataset.period).join(','), month: !!$('#boardBody [data-period="month"]'),
    kindPeriods: Object.fromEntries($$('#lbKind [data-kind]').map(x => [x.dataset.kind, x.dataset.period])) };
});
/** Wait for the board to show scope|period (the loaded card, not the skeleton). */
async function shows(scope, period, ms = 9000) {
  const t0 = Date.now(); let s;
  while (Date.now() - t0 < ms) { s = await state(); if (s.board === `${scope}|${period}`) return s; await wait(120); }
  return s;
}
const click = sel => A.p.click(sel);
let bad = [];
const expectBoard = async (what, scope, kind, period) => {
  const s = await shows(scope, period);
  const ok = s.board === `${scope}|${period}` && (scope === 'clans' || (s.kind === kind && s.period === period && s.scope === scope && s.periods === KINDS[kind].join(',')));
  if (!ok) bad.push({ what, want: `${scope}|${kind}|${period}`, got: s });
  return ok;
};

// 1. each kind remembers its own period: pick a non-default period on Focus, Garden and Streaks
for (const [scope] of [['friends'], ['global']]) {
  bad = [];
  await click(`#lbScope [data-scope="${scope}"]`);
  const memo = { focus: 'life', garden: 'harvests', rank: 'season', streak: 'best' };
  for (const k of Object.keys(KINDS)) { await click(`#lbKind [data-kind="${k}"]`); await shows(scope, (await state()).kindPeriods[k]); await click(`#lbPeriod [data-period="${memo[k]}"]`); await expectBoard(`set ${k}`, scope, k, memo[k]); }
  // every ordered pair of kinds (16), each landing on its remembered period
  for (const a of Object.keys(KINDS)) for (const c of Object.keys(KINDS)) {
    await click(`#lbKind [data-kind="${a}"]`); await expectBoard(`${a}`, scope, a, memo[a]);
    await click(`#lbKind [data-kind="${c}"]`); await expectBoard(`${a}→${c}`, scope, c, memo[c]);
  }
  check(`${scope}: every kind → kind switch (16 pairs) lands on the right board and that kind's own last period (Ranks → Focus time opens Focus time)`, !bad.length, JSON.stringify(bad.slice(0, 3)));
  // every period button of every kind
  bad = [];
  for (const [k, ps] of Object.entries(KINDS)) { await click(`#lbKind [data-kind="${k}"]`); for (const p of [...ps, ...ps.slice().reverse()]) { await click(`#lbPeriod [data-period="${p}"]`); await expectBoard(`${k}/${p}`, scope, k, p); } }
  check(`${scope}: every period button of every kind, forwards and back`, !bad.length, JSON.stringify(bad.slice(0, 3)));
}
// 2. scopes in every order (6 orders of Friends / Global / Clans) on every kind: the kind and period stay
{
  bad = [];
  const orders = [['friends', 'global', 'clans'], ['friends', 'clans', 'global'], ['global', 'friends', 'clans'], ['global', 'clans', 'friends'], ['clans', 'friends', 'global'], ['clans', 'global', 'friends']];
  for (const k of Object.keys(KINDS)) {
    await click('#lbScope [data-scope="friends"]'); await shows('friends', (await state()).kindPeriods.focus);
    await click(`#lbKind [data-kind="${k}"]`); const p = (await shows('friends', (await A.ev(kk => boardPeriodFor(kk), k)))).period;
    for (const o of orders) for (const sc of o) { await click(`#lbScope [data-scope="${sc}"]`); await expectBoard(`${k} ${o.join('>')} @${sc}`, sc, k, sc === 'clans' ? 'week' : p); }
  }
  check('Scopes in all 6 orders on every kind: Clans shows the clan board, and Friends / Global come back on the same kind and period', !bad.length, JSON.stringify(bad.slice(0, 3)));
}
// 3. a reload on each board keeps it
{
  bad = [];
  const reloadOn = async (scope, kind, period) => {
    await A.ev(([sc, p]) => { S.ui.lbScope = sc; if (sc !== 'clans') setBoardPeriod(p); saveLocal(); }, [scope, period]);
    await A.p.reload(); await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(800);
    await closeDlg(A); await A.ev(() => showTab('board'));
    await expectBoard(`reload ${scope}/${period}`, scope, kind, scope === 'clans' ? 'week' : period);
  };
  for (const sc of ['friends', 'global']) for (const [k, ps] of Object.entries(KINDS)) for (const p of ps) await reloadOn(sc, k, p);
  await reloadOn('clans', 'focus', 'week');
  // after a reload, the kind buttons still go to their own boards
  await click('#lbScope [data-scope="friends"]');
  for (const k of ['rank', 'focus', 'streak', 'focus', 'garden', 'rank']) { await click(`#lbKind [data-kind="${k}"]`); await expectBoard(`after reload ${k}`, 'friends', k, await A.ev(kk => boardPeriodFor(kk), k)); }
  check('A reload on each of the 17 boards (8 periods × Friends / Global, and Clans) comes back on the same board; the kind buttons still work after it', !bad.length, JSON.stringify(bad.slice(0, 3)));
}
// 4. saved state from 1.19 (the bug's leftovers) and a saved Monthly view are repaired
{
  await A.ev(() => { S.ui.lbScope = 'friends'; S.ui.lbPeriod = 'season'; S.ui.lbFocusPeriod = 'season'; S.ui.lbStreakPeriod = 'season'; S.ui.lbGardenPeriod = 'streak'; saveLocal(); });
  await A.p.reload(); await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(800); await closeDlg(A);
  await A.ev(() => showTab('board'));
  const s1 = await shows('friends', 'season');
  bad = [];
  await click('#lbKind [data-kind="focus"]'); const f = await expectBoard('1.19 state → Focus', 'friends', 'focus', 'week');
  await click('#lbKind [data-kind="streak"]'); const st = await expectBoard('1.19 state → Streaks', 'friends', 'streak', 'streak');
  await click('#lbKind [data-kind="garden"]'); const g = await expectBoard('1.19 state → Garden', 'friends', 'garden', 'produce');
  check('Saved state from 1.19 (Ranks filed as the Focus, Streaks and Garden periods) is repaired: each button opens its own board', s1.board === 'friends|season' && f && st && g, JSON.stringify({ s1: s1.kindPeriods, bad }));
  await A.ev(() => { S.ui.lbPeriod = 'month'; S.ui.lbFocusPeriod = 'month'; saveLocal(); });
  await A.p.reload(); await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(800); await closeDlg(A);
  await A.ev(() => showTab('board'));
  const m = await shows('friends', 'week');
  check('A saved Monthly view opens Weekly; no Monthly button; Focus time has Daily · Weekly · Lifetime', m.board === 'friends|week' && m.kind === 'focus' && !m.month && m.periods === 'day,week,life' && m.kindPeriods.focus === 'week', JSON.stringify(m));
}
// 5. 360 px: the same switching, and the three rows fit
{
  await A.p.setViewportSize({ width: 360, height: 760 }); await wait(500);
  bad = [];
  await click('#lbScope [data-scope="global"]');
  for (const a of Object.keys(KINDS)) for (const c of Object.keys(KINDS)) { await click(`#lbKind [data-kind="${a}"]`); await click(`#lbKind [data-kind="${c}"]`); await expectBoard(`360 ${a}→${c}`, 'global', c, await A.ev(k => boardPeriodFor(k), c)); }
  for (const sc of ['clans', 'friends', 'global', 'clans', 'global']) { await click(`#lbScope [data-scope="${sc}"]`); await expectBoard(`360 @${sc}`, sc, 'streak', sc === 'clans' ? 'week' : await A.ev(() => boardPeriodFor('streak'))); }
  const fit = await A.ev(() => ({ hs: document.documentElement.scrollWidth > innerWidth, rows: ['#lbScope', '#lbKind', '#lbPeriod'].map(s => { const e = $(s); if (!e) return 'none'; const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 0.5 ? 'ok' : `${s}:${Math.round(r.left)}-${Math.round(r.right)}`; }) }));
  check('360 px: all 16 kind switches and the scopes work; the scope, board and period rows fit with no sideways scroll', !bad.length && !fit.hs && fit.rows.every(x => x === 'ok' || x === 'none'), JSON.stringify({ bad: bad.slice(0, 2), fit }));
  await A.p.setViewportSize({ width: 1280, height: 900 }); await wait(300);
}
// 6. every other segmented control: each button becomes the only active one (forwards, backwards); saved views survive a reload
{
  const SEGS = [
    ['statsSeg', () => showTab('stats')], ['friendsSeg', () => showTab('friends')], ['remSeg', () => showTab('reminders')],
    ['questSeg', () => showTab('quests')], ['gardenSeg', () => showTab('garden')], ['achCats', () => showTab('profile')],
    ['ibSeg', () => openInbox()], ['collF', () => openCollection()]];
  const res = {}, last = {};
  for (const [id, open] of SEGS) {
    await closeDlg(A); await A.ev(`(${open.toString()})()`); await wait(700);
    const btns = await A.ev(id => $$(`#${id} button`).filter(x => !x.disabled && !x.classList.contains('hidden') && x.offsetParent !== null).map(x => { const n = x.getAttributeNames().find(a => a.startsWith('data-')); return [n, x.getAttribute(n)]; }), id);
    if (!btns.length) { res[id] = 'not shown'; continue; }
    const seq = [...btns, ...btns.slice(0, -1).reverse()], wrong = [];
    for (const [n, v] of seq) {
      await A.p.click(`#${id} button[${n}="${v}"]`); await wait(350);
      const act = await A.ev(([id, n]) => $$(`#${id} button.active`).map(x => x.getAttribute(n)), [id, n]);
      if (act.length !== 1 || act[0] !== v) wrong.push(`${v}→${act.join('/') || 'none'}`);
    }
    last[id] = seq[seq.length - 1];
    res[id] = wrong.length ? wrong.slice(0, 3).join(' ') : `ok (${btns.length})`;
  }
  check('Every other segmented control: each button, forwards and back, ends up the only active one', Object.values(res).every(v => /^ok|not shown/.test(v)), JSON.stringify(res));
  // the views the app saves (Stats, Friends, Quests, Garden, achievement category) come back after a reload
  await A.p.reload(); await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(800);
  const back = {};
  for (const [id, open] of SEGS.filter(([id]) => ['statsSeg', 'friendsSeg', 'questSeg', 'gardenSeg', 'achCats'].includes(id))) {
    await closeDlg(A); await A.ev(`(${open.toString()})()`); await wait(700);
    const [n, v] = last[id] || [];
    back[id] = n ? (await A.ev(([id, n]) => $$(`#${id} button.active`).map(x => x.getAttribute(n)).join('/'), [id, n])) === v ? 'ok' : 'lost' : 'n/a';
  }
  check('Saved views come back after a reload (Stats, Friends, Quests, Garden, achievement category)', Object.values(back).every(v => v === 'ok' || v === 'n/a'), JSON.stringify(back));
}
await A.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
