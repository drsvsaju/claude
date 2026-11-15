// v1.17 Phase 5 — daily rewards past Day 7: the run keeps counting, every 7th day is the gift day, long runs pay a little
// more (capped, and only for claims from the release day), old claims pay what they always did, the track shows the
// current week, the gift is picked from the date; guest claim, two-device sync, export/import, demo (Day 10, never writes).
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, until } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const R = Date.now().toString(36).slice(-5);
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
// ---------- 1. the formula ----------
const G = await guest(1280, { tag: 'rewards' });
const f = await G.ev(() => {
  const k = '2027-01-01', old = '2026-10-01';
  const wk1 = [1, 2, 3, 4, 5, 6, 7].map(n => loginCoinsFor(n, k)), wk2 = [8, 9, 10, 11, 12, 13, 14].map(n => loginCoinsFor(n, k)), wk5 = [29, 30, 31, 32, 33, 34, 35].map(n => loginCoinsFor(n, k)), wk9 = [57, 58, 59, 60, 61, 62, 63].map(n => loginCoinsFor(n, k));
  const sum = a => a.reduce((x, y) => x + y, 0);
  return { wk1, wk2, wk5, wk9, s1: sum(wk1), s2: sum(wk2), s5: sum(wk5), s9: sum(wk9), oldWk2: [8, 9, 10, 11, 12, 13, 14].map(n => loginCoinsFor(n, old)), gift: [7, 14, 21, 8, 1].map(loginGiftDay), noKey: loginCoinsFor(14) };
});
check('Week 1 pays 2 3 3 4 5 6 12 (35); week 2 one more a day and +2 on the gift day (43); from week 5 the cap: +4 a day, +8 on the gift day (67); week 9 the same (67)', f.wk1.join() === '2,3,3,4,5,6,12' && f.wk2.join() === '3,4,4,5,6,7,14' && f.wk5.join() === '6,7,7,8,9,10,20' && f.s1 === 35 && f.s2 === 43 && f.s5 === 67 && f.s9 === 67, JSON.stringify(f));
check('Claims dated before 1.17 pay the week-1 table whatever the day number; days 7, 14, 21 are gift days, 8 and 1 are not', f.oldWk2.join() === '2,3,3,4,5,6,12' && f.gift.join() === 'true,true,true,false,false' && f.noKey === 14, JSON.stringify(f));
// ---------- 2. the run keeps counting; a gap starts again ----------
const run = await G.ev(() => {
  const today = startOfDay(new Date()), key = n => dayKey(addDays(today, -n));
  S.game.claims.login = {}; for (let n = 9; n >= 1; n--) S.game.claims.login[key(n)] = Date.now() - n * 864e5;
  G = null;
  const cyc = loginCycle(), info = loginToday();
  const card = loginCard(), d = document.createElement('div'); d.innerHTML = card;
  const days = [...d.querySelectorAll('.track7 .d')].map(x => x.querySelector('.n').textContent + (x.classList.contains('got') ? '✓' : '') + (x.classList.contains('today') ? '•' : '') + (x.querySelector('.c').textContent.includes('🎁') ? '🎁' : ''));
  const gap = {}; for (const n of [12, 11, 9, 8]) gap[key(n)] = Date.now() - n * 864e5; S.game.claims.login = gap; G = null;
  const cyc2 = loginCycle(), info2 = loginToday();
  S.game.claims.login = {}; for (let n = 9; n >= 1; n--) S.game.claims.login[key(n)] = Date.now() - n * 864e5; G = null;
  return { runs: Object.values(cyc).join(), day: info.day, claimed: info.claimed, days, btn: d.querySelector('[data-claimlogin]') && d.querySelector('[data-claimlogin]').textContent, gapRuns: Object.values(cyc2).join(), gapDay: info2.day };
});
check('Nine claimed days in a row count 1…9; today is Day 10 (not Day 3) and the card says so', run.runs === '1,2,3,4,5,6,7,8,9' && run.day === 10 && !run.claimed && run.btn === 'Claim day 10', JSON.stringify(run));
check('The track shows the current week of the run (Day 8–14): 8 and 9 ticked, 10 is today, 14 carries the gift', run.days.join('|') === 'Day 8✓|Day 9✓|Day 10•|Day 11|Day 12|Day 13|Day 14🎁', run.days.join('|'));
check('A missed day starts the run again (claims 12 days ago, 11, then 9 and 8 → runs 1 2 1 2) and today would be Day 1 again', run.gapRuns === '1,2,1,2' && run.gapDay === 1, JSON.stringify(run));
// ---------- 3. claiming Day 10 as a guest; the ledger ----------
const cl = await G.ev(async () => { const before = game().balance, e0 = earnedAt(Date.now() + 1); $('#profileTab') && showTab('profile'); openLoginDlg(); const title = $('#loginTitle').textContent, btn = $('#loginClaim').textContent, gift = $('#loginGift').textContent; const exp = loginCoinsFor(10, dayKey(new Date())); await claimLogin(); const info = loginToday(); return { exp, before, e0, title, btn, gift, after: game().balance, e1: earnedAt(Date.now() + 1), day: info.day, claimed: info.claimed, runs: Object.values(loginCycle()).join() }; });
check('Claiming Day 10 pays its coins (today\'s table: 3 before the 1.17 release day, 4 from it) — the dialog said "Day 10 reward" and the same amount, no gift line; the run now reads 1…10', cl.exp >= 3 && cl.title === 'Day 10 reward' && cl.btn === `Claim +${cl.exp} coins` && cl.gift === '' && cl.after === cl.before + cl.exp && cl.e1 === cl.e0 + cl.exp && cl.day === 10 && cl.claimed && cl.runs === '1,2,3,4,5,6,7,8,9,10', JSON.stringify(cl));
await wait(1200); await closeDlg(G);
// ---------- 4. the gift day (Day 14): coins + a cosmetic picked from the date ----------
const gd = await G.ev(async () => {
  const today = startOfDay(new Date()), key = n => dayKey(addDays(today, -n));
  S.game.claims.login = {}; for (let n = 13; n >= 1; n--) S.game.claims.login[key(n)] = Date.now() - n * 864e5; G = null;
  const info = loginToday(); openLoginDlg(); const gift = $('#loginGift').textContent, btn = $('#loginClaim').textContent;
  const nGifts = Object.values(S.game.purchases).filter(p => p.gift).length, before = game().balance;
  await claimLogin();
  const gifts = Object.entries(S.game.purchases).filter(([, p]) => p.gift);
  // the pick is fixed by the date: picking again for the same key (after removing the record) gives the same item
  const [gid, gp] = gifts[gifts.length - 1]; delete S.game.purchases[gid]; G = null; const again = pickLoginGift(Date.now(), info.key); delete S.game.purchases[Object.keys(S.game.purchases).filter(k => S.game.purchases[k].gift).pop()]; S.game.purchases[gid] = gp; G = null;
  return { exp: loginCoinsFor(14, info.key), day: info.day, gift, btn, nGifts, gained: game().balance - before, giftsAfter: gifts.length, item: gp.item, price: gp.price, same: again && again.id === gp.item };
});
check('Day 14 is a gift day: "coins plus a surprise cosmetic", today\'s coins (12 before the release day, more from it) and a free cosmetic recorded as a gift purchase; the pick is fixed by the date', gd.day === 14 && /Day 14: coins plus a surprise cosmetic/.test(gd.gift) && gd.exp >= 12 && gd.btn === `Claim +${gd.exp} coins` && gd.gained === gd.exp && gd.giftsAfter === gd.nGifts + 1 && gd.price === 0 && gd.same, JSON.stringify(gd));
await wait(1200); await closeDlg(G);
// ---------- 5. ledger: a run across the release day grows; an old user's past claims pay exactly what they did ----------
const led = await G.ev(() => {
  const sum = a => a.reduce((x, y) => x + y, 0);
  const keep = S.game.claims.login;
  // (a) an old user: 10 consecutive claims before the release day
  S.game.claims.login = {}; const t0 = parseDay('2026-10-10').getTime(); for (let i = 0; i < 10; i++) S.game.claims.login[dayKey(addDays(parseDay('2026-10-10'), i))] = t0 + i * 864e5 + 3600e3; G = null;
  const base = earnedAt(0), oldPaid = earnedAt(t0 + 20 * 864e5) - base, oldExpected = sum([...Array(10).keys()].map(i => LOGIN_COINS[i % 7]));
  // (b) a 35-day run starting on the release day
  S.game.claims.login = {}; const r0 = parseDay(LOGIN_GROW_FROM).getTime(); for (let i = 0; i < 35; i++) S.game.claims.login[dayKey(addDays(parseDay(LOGIN_GROW_FROM), i))] = r0 + i * 864e5 + 3600e3; G = null;
  const grown = earnedAt(r0 + 40 * 864e5) - base, grownExpected = sum([...Array(35).keys()].map(i => loginCoinsFor(i + 1, '2027-01-01')));
  // (c) a run that straddles the release day: the days before pay the old table, the days after grow
  S.game.claims.login = {}; const s0 = parseDay('2026-10-30').getTime(); for (let i = 0; i < 10; i++) S.game.claims.login[dayKey(addDays(parseDay('2026-10-30'), i))] = s0 + i * 864e5 + 3600e3; G = null;
  const straddle = earnedAt(s0 + 20 * 864e5) - base, straddleExpected = sum([...Array(10).keys()].map(i => loginCoinsFor(i + 1, dayKey(addDays(parseDay('2026-10-30'), i)))));
  const detail = [...Array(10).keys()].map(i => loginCoinsFor(i + 1, dayKey(addDays(parseDay('2026-10-30'), i))));
  S.game.claims.login = keep; G = null;
  return { oldPaid, oldExpected, grown, grownExpected, straddle, straddleExpected, detail: detail.join() };
});
check('An old user’s 10-day run from before 1.17 is worth exactly what it was (2+3+3+4+5+6+12+2+3+3 = 43): coin totals never drop', led.oldPaid === 43 && led.oldExpected === 43, JSON.stringify(led));
check('A 35-day run from the release day earns 35 + 43 + 51 + 59 + 67 = 255 coins through the ledger (every device replays the same claims)', led.grown === 255 && led.grownExpected === 255, JSON.stringify(led));
check('A run that straddles the release day: days 1–3 (before) pay the old table, days 4–10 (after) pay +0 (week 1) then +1 (week 2) — 2 3 3 4 5 6 12 3 4 4', led.detail === '2,3,3,4,5,6,12,3,4,4' && led.straddle === led.straddleExpected, JSON.stringify(led));
// ---------- 6. long runs stay readable: Day 100–105 at 360px ----------
const M = await guest(360, { tag: 'phone' });
const fit = await M.ev(() => {
  const today = startOfDay(new Date()), key = n => dayKey(addDays(today, -n));
  S.game.claims.login = {}; for (let n = 104; n >= 1; n--) S.game.claims.login[key(n)] = Date.now() - n * 864e5; G = null;
  showTab('profile'); renderProfile();
  const card = $('#loginCard'), days = [...card.querySelectorAll('.track7 .d')];
  const over = days.filter(d => d.scrollWidth > d.clientWidth + 1 || d.querySelector('.n').scrollWidth > d.clientWidth + 1).length;
  openLoginDlg(); const dlg = $('#loginDlg'), dover = [...dlg.querySelectorAll('.track7 .d')].filter(d => d.querySelector('.n').scrollWidth > d.clientWidth + 1).length, dfits = dlg.getBoundingClientRect().width <= innerWidth && dlg.getBoundingClientRect().height <= innerHeight;
  const r = { day: loginToday().day, labels: days.map(d => d.querySelector('.n').textContent).join(), over, dover, dfits, title: $('#loginTitle').textContent, cardScroll: card.scrollWidth <= card.clientWidth + 1 }; dlg.close(); return r;
});
check('Day 105 on a 360px phone: the track shows Day 99–105, nothing overflows its tile, the dialog fits the screen', fit.day === 105 && fit.labels === 'Day 99,Day 100,Day 101,Day 102,Day 103,Day 104,Day 105' && fit.over === 0 && fit.dover === 0 && fit.dfits && fit.cardScroll && fit.title === 'Day 105 reward', JSON.stringify(fit));
await M.ctx.close();
// ---------- 7. export / import keeps the claims (and a 1.16 export, with its 1–7 cycle claims, imports as a run) ----------
const ex = await G.ev(() => {
  const { timer, ui, pendingSessions, profileDirty, ...data } = S; const j = JSON.parse(JSON.stringify(data));
  const n = Object.keys(j.game.claims.login).length;
  const today = startOfDay(new Date()), key = n => dayKey(addDays(today, -n));
  const old = { sessions: [], game: { purchases: {}, claims: { login: Object.fromEntries([21, 20, 19, 18, 17, 16, 15, 14].map(n => [key(n), Date.now() - n * 864e5])) } } };   // a 1.16 export: eight days in a row (days 1–7 then "day 1" again)
  const before = Object.keys(S.game.claims.login).length; mergeData(old); G = null;
  const cyc = loginCycle(); const runs = [21, 20, 19, 18, 17, 16, 15, 14].map(n => cyc[key(n)]).join();
  return { n, before, after: Object.keys(S.game.claims.login).length, runs };
});
check('The export carries the login claims; importing a 1.16 backup merges its claims and they read as one run (1…8)', ex.n >= 14 && ex.after === ex.before + 8 && ex.runs === '1,2,3,4,5,6,7,8', JSON.stringify(ex));
await G.ctx.close();
// ---------- 8. two devices: a claim on A is claimed on B; B does not pay twice ----------
const A = await device('A', 1280), B = await device('B', 1280);
await signup(A, 'dr_' + R); await closeDlg(A);
await B.p.goto('http://localhost:8000/index.html?emulator=1'); await B.p.waitForSelector('#authView:not(.hidden)');
await B.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=login] >> visible=true').catch(() => {}); await B.p.fill('#authUser', 'dr_' + R); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(1500); await closeDlg(B);
const seed = await A.ev(() => { const today = startOfDay(new Date()), key = n => dayKey(addDays(today, -n)); for (let n = 8; n >= 1; n--) S.game.claims.login[key(n)] = Date.now() - n * 864e5; G = null; save(); return loginToday().day; });
const seen = await until(B, () => Object.keys(S.game.claims.login).length >= 8 && loginToday().day === 9, null, 15000);
check('Eight claimed days seeded on A reach B: both say today is Day 9', seed === 9 && seen >= 0, JSON.stringify({ seed, seen }));
const cA = await A.ev(async () => { const c0 = game().balance, exp = loginCoinsFor(9, dayKey(new Date())); openLoginDlg(); await claimLogin(); return { exp, gain: game().balance - c0, claimed: loginToday().claimed }; });
await wait(1200); await closeDlg(A);
const cB = await until(B, () => loginToday().claimed, null, 15000);
const bNow = await B.ev(async () => { const c0 = game().balance; const r = await claimLogin(); return { coins: game().balance - c0, dlg: $('#loginDlg').open, claimed: loginToday().claimed, day: loginToday().day, dot: $('#profileDot').classList.contains('hidden') }; });
check('A claims Day 9 (today\'s amount); B sees it claimed within seconds, a second claim on B pays nothing and the reward dot is gone', cA.gain === cA.exp && cA.exp >= 3 && cA.claimed && cB >= 0 && bNow.coins === 0 && bNow.claimed && bNow.day === 9 && bNow.dot, JSON.stringify({ cA, cB, bNow }));
await A.ctx.close(); await B.ctx.close();
// ---------- 9. demo: Day 10 on the profile card, claiming shows the prompt, nothing written ----------
const D = await device('D', 1280, { noLogin: true, tag: 'demo' });
await D.p.goto('http://localhost:8000/index.html?emulator=1'); await D.p.waitForSelector('#authView:not(.hidden)');
await D.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeDlg(D);
const demo = await D.ev(async () => { showTab('profile'); await new Promise(r => setTimeout(r, 300)); const ls = Object.keys(localStorage).filter(k => /focus-app|pomodorolist-state|cache/.test(k)).length; const info = loginToday(); const btn = $('[data-claimlogin]'); const txt = btn && btn.textContent; if (btn) btn.click(); await new Promise(r => setTimeout(r, 400)); const prompt = $('#pvDlg').open; const loginOpen = $('#loginDlg').open; const claimedAfter = loginToday().claimed; return { pv: isPreview(), day: info.day, claimed: info.claimed, txt, prompt, loginOpen, claimedAfter, ls, ls2: Object.keys(localStorage).filter(k => /focus-app|pomodorolist-state|cache/.test(k)).length }; });
check('Demo: the profile card says "Claim day 10", the dialog never opens over the demo, a click shows the preview prompt and claims nothing; nothing is stored', demo.pv && demo.day === 10 && !demo.claimed && demo.txt === 'Claim day 10' && !demo.loginOpen && !demo.claimedAfter && demo.ls === 0 && demo.ls2 === 0, JSON.stringify(demo));
await D.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
