// v1.17 Phase 1.2 / 1.4 / 1.5 — the streak survives goal changes (goal history), one challenge reward per type per
// week, free banners sit with every card style (+ three new starting banners).
import { b, device, signup, wait, log, check, errs, failCount, closeDlg } from './cl-common.mjs';
const A = await device('A');
await signup(A, 'gs_' + Date.now().toString(36).slice(-5));
await closeDlg(A);
const r = await A.ev(() => {
  const day = n => { const d = startOfDay(new Date()); d.setDate(d.getDate() - n); return d; };
  const add = (n, min) => { const st = day(n).getTime() + 9 * 3600e3; S.sessions.push({ id: 'gs' + n + '_' + min, name: 'Maths', start: st, end: st + min * 60000, duration: min * 60000, planned: min * 60000 }); };
  S.sessions = []; S.goalLog = []; S.game.claims.goalDays = {}; S.settings.goalMin = 60; G = null;
  for (let n = 5; n >= 1; n--) add(n, 60);   // five days at the 60-minute goal, nothing today yet
  add(7, 45);                                 // a day before the run that missed the 60 goal
  G = null; const s0 = computeStreaks(buildIndex()).cur;
  setDailyGoal(120); save(); G = null;        // raise the goal today
  const s1 = computeStreaks(buildIndex()).cur, g5 = goalFor(dayKey(day(5))), gToday = goalFor(dayKey(new Date()));
  add(0, 60); G = null; const s2 = computeStreaks(buildIndex()).cur;   // 60 today: not enough for the new goal
  add(0, 60); G = null; const s3 = computeStreaks(buildIndex()).cur;   // 120 today: met
  setDailyGoal(30); save(); G = null;         // lower it: the old missed day (45 < 60 then) stays missed
  const s4 = computeStreaks(buildIndex()).cur, miss = goalMetDay(buildIndex(), dayKey(day(7)));
  // a day whose goal bonus was claimed counts as met whatever the goal is now
  S.game.claims.goalDays[dayKey(day(7))] = Date.now(); G = null; const claimed = goalMetDay(buildIndex(), dayKey(day(7))), s5 = computeStreaks(buildIndex()).cur;
  const log = S.goalLog.map(x => [x.d, x.g, x.p]);
  const ex = JSON.parse(JSON.stringify((({ timer, ui, pendingSessions, profileDirty, ...data }) => data)(S)));
  return { s0, s1, s2, s3, s4, s5, g5, gToday, miss, claimed, log, exported: Array.isArray(ex.goalLog) && ex.goalLog.length === 1 };
});
check('Raising the goal (60 → 120) keeps the 5-day streak; past days are judged by the goal of their day, today by the new one', r.s0 === 5 && r.s1 === 5 && r.g5 === 60 && r.gToday === 120 && r.s2 === 5 && r.s3 === 6, JSON.stringify(r));
check('Lowering the goal (→ 30) does not revive a day that missed its own goal; a day whose bonus was claimed counts as met', r.s4 === 6 && !r.miss && r.claimed && r.s5 === 6, JSON.stringify({ s4: r.s4, miss: r.miss, claimed: r.claimed, s5: r.s5 }));
check('Two changes on one day fold into one log entry that keeps the goal before the first change; the log is exported', r.log.length === 1 && r.log[0][1] === 30 && r.log[0][2] === 60 && r.exported, JSON.stringify(r.log));
// ---------- 1.4 challenge rewards ----------
const c = await A.ev(() => {
  const bal = () => { G = null; return game().balance; };
  S.game.claims.challenges = {}; const b0 = bal();
  S.game.claims.challenges['2026-11-02_h5_friendA'] = Date.now() - 2000; const b1 = bal();
  S.game.claims.challenges['2026-11-02_h5_friendB'] = Date.now() - 1000; const b2 = bal();   // the same type through another friend
  S.game.claims.challenges['2026-11-02_s20_friendB'] = Date.now(); const b3 = bal();         // another type: paid
  S.game.claims.challenges['2026-10-26_h5_x'] = Date.now() - 5000; S.game.claims.challenges['2026-10-26_h5_y'] = Date.now() - 4000; const b4 = bal();   // before the release week: both still count
  const paid = challengePaid('2026-11-02', 'h5'), unpaid = challengePaid('2026-11-02', 'g5'), old = challengePaid('2026-10-26', 'h5');
  S.game.claims.challenges = {}; G = null;
  return { d1: b1 - b0, d2: b2 - b1, d3: b3 - b2, d4: b4 - b3, paid, unpaid, old };
});
check('From the release week on, a second challenge of the same type in a week pays nothing; another type pays; earlier weeks keep every claim', c.d1 === 30 && c.d2 === 0 && c.d3 === 40 && c.d4 === 60 && c.paid && !c.unpaid && !c.old, JSON.stringify(c));
// ---------- 1.5 banners ----------
const bn = await A.ev(() => {
  const plain = bannerLook('bn_mint', false, ''), sch = bannerLook('bn_mint', false, 'card_scholar'), schD = bannerLook('bn_mint', true, 'card_scholar'), min = bannerLook('bn_mint', false, 'card_minimal');
  const opts = bannerOptions();
  const ids = ['bn_parchment', 'bn_slate', 'bn_moss'];
  const draws = ids.every(id => !!bannerLook(id, false, 'card_scholar') && !!bannerLook(id, true, 'card_gamer'));
  const styles = Object.keys(CARD_STYLES).every(st => Object.keys(FREE_BANNERS).every(id => { const x = bannerLook(id, false, st); return /^#[0-9a-f]{6}$/.test(x.a) && /^#[0-9a-f]{6}$/.test(x.b); }));
  return { tinted: plain.a !== sch.a && plain.b !== sch.b, darkTinted: schD.a !== sch.a, minimalPlain: min.a === plain.a && min.b === plain.b, newOnes: ids.every(id => opts.includes(id)), draws, styles, mix: mixHex('#000000', '#ffffff', .5) };
});
check('Free banners are tinted toward the card style (Scholar, light and dark differently); Minimal keeps them plain; every style × banner is a valid colour pair', bn.tinted && bn.darkTinted && bn.minimalPlain && bn.draws && bn.styles && bn.mix === '#808080', JSON.stringify(bn));
check('Parchment, Slate and Moss are offered as starting banners', bn.newOnes, JSON.stringify(bn.newOnes));
// the profile card renders with Scholar + Parchment (no errors, the banner carries the tinted colours)
const card = await A.ev(() => { S.game.purchases['t_card'] = { item: 'card_scholar', price: 0, at: Date.now() }; G = null; markEquipped('card_scholar'); eqSet('card', 'card_scholar'); setCardPref('banner', 'bn_parchment'); save(); applyCosmetics(); showTab('profile'); renderProfile(); const el = document.querySelector('.pcard'), want = bannerLook('bn_parchment', pageDark(), 'card_scholar'); return { cls: el && el.className, hasTint: !!el && el.innerHTML.includes(want.a) && el.innerHTML.includes(want.b), plain: !!el && el.innerHTML.includes(bannerLook('bn_parchment', pageDark(), '').a) }; });
check('The profile card draws with the Scholar style and the Parchment banner in its Scholar tint', card.cls && /cs-scholar/.test(card.cls) && card.hasTint && !card.plain, JSON.stringify(card));
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
