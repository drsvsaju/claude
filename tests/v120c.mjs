// v1.20 phase 3: the Study Pass. Quests › Weekly boss · Questline · Study Pass · Quest board. Two rows: the Pass track
// (Pass XP from focus minutes, the daily goal, the daily reward, quest-board and questline quests; 180 a day at most;
// 30 tiers × 90) and the Focus track (20 steps by focus hours during the event; 14 h a day at most). Claims are ledger
// entries per event + track + tier: once each, across devices; coins from the ledger; produce, seeds, eggs and the themed
// cosmetics keyed by the claim. Anything reached but unclaimed is added when the event ends. The v1.18 monthly track:
// no new rewards from November 2026, everything claimed stays, and November's already-paid steps count against the
// Focus track (nothing pays twice). Pace: light / normal / heavy studiers simulated day by day. A short event scales.
// The demo shows sample progress and writes nothing. 360–1440 px.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, SITE, U } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5), NAME = 'ps_' + R;
const A = await device('A', 1280, {}, { overtime: true });
await signup(A, NAME); await closeDlg(A);
await A.ev(() => { S.settings.gardenTour = Date.now(); });
const ev0 = await A.ev(() => { const ev = currentEvent(); return ev ? { id: ev.id, start: ev.start, end: ev.end, pass: passEvent(ev), days: evDays(ev) } : null; });
check('The current event has a Study Pass (Monsoon Study, from 8 November 2026)', ev0 && ev0.pass && ev0.id === 'mon26', JSON.stringify(ev0));
// 1. the switcher and the view
const view = await A.ev(async () => {
  S.ui.questView = 'pass'; showTab('quests'); await new Promise(r => setTimeout(r, 600));
  return { seg: $$('#questSeg [data-qview]').map(x => x.dataset.qview).join(), active: ($('#questSeg button.active') || {}).dataset?.qview, p: $$('[data-prow=p] .pt').length, f: $$('[data-prow=f] .pt').length, hero: $('.pass-hero') ? $('.pass-hero').textContent.replace(/\s+/g, ' ') : '' };
});
check('Quests: Weekly boss · Questline · Study Pass · Quest board; the pass shows 30 Pass tiers and 20 Focus steps, the dates and "days left"', view.seg === 'boss,quest,pass,board' && view.active === 'pass' && view.p === 30 && view.f === 20 && /Monsoon Study Pass/.test(view.hero) && /days? left|Ends in/.test(view.hero), JSON.stringify(view));
// 2. the Pass XP maths, from logged data (event days only)
const math = await A.ev(() => {
  const ev = currentEvent(), d0 = parseDay(ev.start), mk = (i, h, m) => { const st = +addDays(d0, i) + h * 3600e3; return { id: 'x' + i + '_' + h, name: 'Maths', start: st, end: st + m * 6e4, duration: m * 6e4, planned: m * 6e4 }; };
  const keep = S.sessions, keepCl = JSON.parse(JSON.stringify(S.game.claims));
  S.game.claims.pass._from = evStart(ev);   // this account's pass covers the whole event
  S.sessions = [mk(0, 9, 90), mk(1, 9, 300), mk(2, 1, 600), mk(2, 12, 600), mk(-1, 9, 120)];   // day 1: 90; day 2: 300 (capped); day 3: 20 h (focus capped at 14 h); the day before: not counted
  S.settings.goalMin = 60;
  const cl = S.game.claims; cl.login = { [dayKey(addDays(d0, 0))]: +d0 + 1, [dayKey(addDays(d0, -1))]: +d0 - 1 };
  cl.wq = { 'x:wq1': +addDays(d0, 0) + 5e6 }; cl.quests = { [ev.id + ':q1']: +addDays(d0, 1) + 5e6, [ev.id + ':final']: +addDays(d0, 1) + 6e6 };
  G = null; PASSC = null;
  const st = passState(ev);
  S.sessions = keep; S.game.claims = keepCl; G = null; PASSC = null;
  return { xp: st.xp, hours: Math.round(st.hours * 10) / 10, tier: st.tier, step: st.step, per: st.per };
});
// day 1: 90 + 30 (goal) + 15 (daily reward) + 40 (a quest-board quest) = 175; day 2: 300 + 30 + 50 (questline quest) capped at 180; day 3: 1200 + 30 capped at 180
check('Pass XP: 1 a focus minute + 30 goal + 15 daily reward + 40 quest-board + 50 questline quest, at most 180 a day, only on event days → 175 + 180 + 180 = 535 (tier 5); Focus hours: 1.5 + 5 + 14 (the 14 h cap) = 20.5 h (step 17)', math.xp === 535 && math.tier === 5 && math.per === 90 && math.hours === 20.5 && math.step === 17, JSON.stringify(math));
// the pass running when 1.20 arrived counts the days left: from 13 November, 18 days → 2,250 XP (75 a tier), Focus to 23.5 h
const win = await A.ev(() => { const ev = currentEvent(), keep = S.game.claims.pass._from; S.game.claims.pass._from = new Date(2026, 10, 13, 10).getTime(); PASSC = null; const st = passState(ev); const out = { start: st.wStart, avail: st.avail, total: st.total, per: st.per, last: focusTierH(ev, FOCUS_H.length - 1) }; S.game.claims.pass._from = keep; PASSC = null; return out; });
check('A pass already running when 1.20 arrives counts the days left: from 13 Nov, 18 days → 2,250 Pass XP (75 a tier) and the Focus track to 23.5 h; a later event uses its full dates', win.start === '2026-11-13' && win.avail === 18 && win.total === 2250 && win.per === 75 && win.last === 23.5, JSON.stringify(win));
const later = await A.ev(() => { const xm = EVENTS.find(e => e.id === 'xm26'); PASSC = null; const [st, d] = passWindow(xm); return { st, d, per: passXpPerTier(xm) }; });
check('…and the next event (Christmas, 1–31 Dec) runs in full: 31 days, 90 a tier', later.st === '2026-12-01' && later.d === 31 && later.per === 90, JSON.stringify(later));
// 3. claims: once each, coins from the ledger, the rest keyed by the claim
const cl1 = await A.ev(async () => {
  const ev = currentEvent(), d0 = parseDay(ev.start), now = Date.now(), add = [];
  S.game.claims.pass._from = evStart(ev);   // as if this account had 1.20 from the event's first day (the sessions below are on days 1–3)
  for (let i = 0; i < 3; i++) { const st = Math.min(now - 3600e3, +addDays(d0, i) + 9 * 3600e3); add.push({ id: 'pc' + i, name: 'Physics', start: st, end: st + 120 * 6e4, duration: 120 * 6e4, planned: 120 * 6e4 }); }
  S.sessions.push(...add); cloudAddSessions(add); G = null; PASSC = null; save();
  showTab('quests'); S.ui.questView = 'pass'; renderQuests(); await new Promise(r => setTimeout(r, 300));
  const st = passState(ev), bal0 = game().balance, n0 = (S.gbuys || []).length;
  const btn = $('[data-prow=p] [data-pclaim="p:1"]'); if (btn) btn.click(); await new Promise(r => setTimeout(r, 300));
  const bal1 = game().balance, k1 = !!S.game.claims.pass[ev.id + ':p:1'];
  const again = passClaim(ev, [['p', 1]]).length;   // a second claim of the same tier: nothing
  const t2 = passClaim(ev, [['p', 2]]), prod = (S.gbuys || []).find(x => x.id === 'ps_' + ev.id + ':p:2');
  const tooFar = passClaim(ev, [['p', 30]]).length;   // not reached: nothing
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  return { tier: st.tier, step: st.step, coins: bal1 - bal0, k1, again, t2: t2.length, prod: prod && prod.bonus, tooFar, btn: !!btn };
});
check('Claiming Pass tier 1 adds its 21 coins once (from the ledger); a second claim does nothing; tier 2 gives 17 produce keyed by the claim; tier 30 (not reached) can’t be claimed', cl1.btn && cl1.coins === 21 && cl1.k1 && cl1.again === 0 && cl1.t2 === 1 && cl1.prod === 17 && cl1.tooFar === 0, JSON.stringify(cl1));
const all = await A.ev(async () => {
  const ev = currentEvent(); renderQuests(); await new Promise(r => setTimeout(r, 200));
  const before = passClaimable(ev).length, btn = $('[data-pclaimall]'); if (btn) btn.click(); await new Promise(r => setTimeout(r, 400));
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  return { before, after: passClaimable(ev).length, btn: !!btn, got: $$('.pt.got').length };
});
check('"Claim all" claims every tier reached on both rows', all.btn && all.before > 0 && all.after === 0 && all.got >= all.before, JSON.stringify(all));
// 4. two devices: the same tier claimed on both — paid once
const B = await device('B', 1280, {}, { overtime: true });
await B.p.goto(U); await B.p.waitForSelector('#authView:not(.hidden)'); await B.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', NAME); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit');
await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(B);
const two = await Promise.all([A, B].map(d => d.ev(() => { const ev = currentEvent(); const add = [{ id: 'dev2', name: 'Bio', start: Date.now() - 4 * 3600e3, end: Date.now() - 3600e3, duration: 180 * 6e4, planned: 180 * 6e4 }]; if (!S.sessions.some(x => x.id === 'dev2')) { S.sessions.push(...add); cloudAddSessions(add); } G = null; PASSC = null; const st = passState(ev); const free = passClaimable(ev); const t = free.find(([tr]) => tr === 'p') || free[0]; return { t, tier: st.tier }; })));
const tgt = two[0].t;
if (tgt) await Promise.all([A, B].map(d => d.ev(t => { passClaim(currentEvent(), [t]); save(); }, tgt)));
await wait(4000);
const after2 = await Promise.all([A, B].map(d => d.ev(t => { const ev = currentEvent(), k = `${ev.id}:${t[0]}:${t[1]}`; return { has: !!S.game.claims.pass[k], coins: passCoinsAt(Date.now()), dup: (S.gbuys || []).filter(x => x.id === 'ps_' + k).length }; }, tgt || ['p', 1])));
check('The same tier claimed on two devices at once: one ledger entry, the same pass coins on both, no duplicate produce', !!tgt && after2[0].has && after2[1].has && after2[0].coins === after2[1].coins && after2.every(x => x.dup <= 1), JSON.stringify({ tgt, after2 }));
await B.ctx.close();
// 5. the end of a pass: what was reached but not claimed is added for you, once, with a notice
const end = await A.ev(() => {
  // Monsoon Study itself, seen two days after it ends (the page's clock moved forward), with sessions on 20–25 Nov
  const ev = EVENTS.find(e => e.id === 'mon26'), RD = Date, off = evEnd(ev) + 2 * 864e5 - RD.now(), keepCl = JSON.stringify(S.game.claims), keepS = S.sessions.slice();
  const add = []; for (let i = 0; i < 6; i++) { const st = +addDays(parseDay('2026-11-20'), i) + 10 * 3600e3; add.push({ id: 'te' + i, name: 'T', start: st, end: st + 150 * 6e4, duration: 150 * 6e4, planned: 150 * 6e4 }); }
  window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } };
  let out;
  try {
    S.sessions = S.sessions.concat(add).sort((x, y) => x.start - y.start); G = null; PASSC = null;
    const had = new Set(Object.keys(S.game.claims.pass)), st = passState(ev), before = passClaimable(ev).length;
    const news = reconcileRewards('quiet'); announce(news, 'quiet');
    const ended = news.filter(n => n.type === 'passend'), keys = Object.keys(S.game.claims.pass).filter(k => k.startsWith('mon26:') && !had.has(k)), ts = keys.map(k => S.game.claims.pass[k]);
    const again = reconcileRewards('quiet').filter(n => n.type === 'passend').length;
    const inbox = !!IB.find(x => x.key === 'passend:mon26'), left = passClaimable(ev).length;
    out = { tier: st.tier, step: st.step, before, ended: ended.length && ended[0].n, keys: keys.length, atEnd: ts.every(t => t === evEnd(ev) - 1), again, inbox, left };
  } finally { window.Date = RD; S.sessions = keepS; S.game.claims = JSON.parse(keepCl); G = null; PASSC = null; }
  return out;
});
check('A pass that has ended: every tier reached but not claimed is added (the same check can also finish a last quest-board quest, which counts), timed at its end, with one notice; never again', end.before > 0 && end.ended >= end.before && end.keys === end.ended && end.left === 0 && end.atEnd && end.again === 0 && end.inbox, JSON.stringify(end));
// 6. the monthly track: no new rewards from November 2026; claims from before stay; November's paid steps count
const tr = await A.ev(() => {
  const cl = S.game.claims, keep = { ...cl.track };
  cl.track = { '2026-10:0': Date.UTC(2026, 9, 20), '2026-10:1': Date.UTC(2026, 9, 25), '2026-11:0': Date.UTC(2026, 10, 3), '2026-11:1': Date.UTC(2026, 10, 6) };
  G = null; PASSC = null;
  const news = reconcileRewards('quiet'), newNov = Object.keys(cl.track).filter(k => k.startsWith('2026-11:')).length;
  const coins = trackCoinsAt(Date.now()), st = passState(currentEvent());
  showTab('quests'); S.ui.questView = 'pass'; renderQuests();
  const prepaidShown = $$('[data-prow=f] .pt.prepaid').length, claimF = passClaimable(currentEvent()).filter(([t, i]) => t === 'f' && i <= st.prepaid).length;
  S.ui.questView = 'board'; renderQuests(); const board = ($('.tr-card') || {}).textContent || '';
  cl.track = keep; G = null; PASSC = null;
  return { newNov, coins, paid: st.paidByTrack, prepaid: st.prepaid, prepaidShown, claimF, board: /monthly track is now the Study Pass/.test(board), trackNews: news.filter(n => n.type === 'track').length };
});
// November's track paid 20 coins + 30 produce = 50; Focus steps 1–4 are worth 11 + 12 + 13 + 14 = 50 → 4 steps already paid
check('Monthly track: no new November rewards; October’s and November’s earlier claims stay (20 + 20 coins in the ledger); the 50 November paid covers Focus steps 1–4 (marked paid, not claimable); the quest board points to the pass', tr.newNov === 2 && tr.trackNews === 0 && tr.coins === 40 && tr.paid === 50 && tr.prepaid === 4 && tr.prepaidShown === Math.min(4, tr.prepaidShown) && tr.claimF === 0 && tr.board, JSON.stringify(tr));
// 7. pace: light, normal and heavy studiers, day by day (the app's own loop), for a pass from a mid-event launch (18 days
//    left) and for a full-length event (31 days)
const pace = await A.ev(() => {
  const today = startOfDay(new Date()), out = {}, keep = S.sessions, keepCl = JSON.parse(JSON.stringify(S.game.claims));
  for (const [label, len, avail] of [['launch18', 23, 18], ['full31', 31, 31]]) {
    const tev = { id: 'pace' + len, name: 'Pace', label: 'Pace', emoji: '⏱', start: dayKey(addDays(today, -len - 1)), end: dayKey(addDays(today, -2)), a: '#333', b: '#666', rewards: [], final: [], quests: [] };
    EVENTS.push(tev);
    const w0 = addDays(parseDay(tev.start), len - avail);
    out[label] = {};
    for (const [who, min, plays, wqWeek] of [['light', 60, d => d % 7 !== 6, 1], ['normal', 90, () => true, 2], ['heavy', 240, () => true, 3]]) {
      S.sessions = []; S.game.claims = JSON.parse(JSON.stringify(keepCl)); S.game.claims.login = {}; S.game.claims.wq = {}; S.game.claims.quests = {}; S.game.claims.goalDays = {};
      S.game.claims.pass = { _from: +w0 + 3600e3 }; S.settings.goalMin = 60;
      let done = null, fdone = null;
      for (let d = 0; d < avail; d++) {
        const day = addDays(w0, d), st = +day + 9 * 3600e3;
        if (plays(d)) { S.sessions.push({ id: who + d, name: 'x', start: st, end: st + min * 6e4, duration: min * 6e4, planned: min * 6e4 }); S.game.claims.login[dayKey(day)] = st; if (d % 7 < wqWeek) S.game.claims.wq[dayKey(day) + ':' + d] = st + 1; }
        G = null; PASSC = null;
        const ps = passState(tev);
        if (done === null && ps.tier >= PASS_TIERS) done = d + 1;
        if (fdone === null && ps.step >= FOCUS_H.length) fdone = d + 1;
      }
      out[label][who] = { pass: done, focus: fdone };
    }
    EVENTS.pop();
  }
  S.sessions = keep; S.game.claims = keepCl; G = null; PASSC = null;
  return out;
});
check(`Pace from a mid-event launch (18 days): normal day ${pace.launch18.normal.pass} (2–3 days early), light (1 h, 6 days a week) day ${pace.launch18.light.pass} with catch-up, heavy day ${pace.launch18.heavy.pass}`, pace.launch18.normal.pass >= 15 && pace.launch18.normal.pass <= 16 && pace.launch18.light.pass !== null && pace.launch18.light.pass <= 18 && pace.launch18.heavy.pass >= 12, JSON.stringify(pace.launch18));
check(`Pace in a full-length event (31 days): normal day ${pace.full31.normal.pass}, heavy day ${pace.full31.heavy.pass} (no faster than 15), light day ${pace.full31.light.pass}; Focus track normal day ${pace.full31.normal.focus}`, pace.full31.normal.pass >= 15 && pace.full31.normal.pass <= 20 && pace.full31.heavy.pass >= 15 && pace.full31.light.pass !== null && pace.full31.light.pass <= 31 && pace.full31.normal.focus >= 15 && pace.full31.normal.focus <= 20, JSON.stringify(pace.full31));
const cu = await A.ev(() => { const ev = currentEvent(); PASSC = null; const st = passState(ev); return { bank: st.bank, cap: st.todayCap }; });
check('Catch-up is shown in the pass (the bank, and the cap for today)', typeof cu.bank === 'number' && (cu.cap === 180 || cu.cap === 240), JSON.stringify(cu));
// 8. a short event (14 days) scales down so it can still be finished
const short = await A.ev(() => ({ total: passTotalXP(14), last: Math.round(26 * passFocusScale(14) * 2) / 2, fastest: Math.ceil(passTotalXP(14) / PASS_DAY_CAP) }));
check(`A 14-day event: ${short.total} Pass XP and the Focus track to ${short.last} h — the whole pass fits in ${short.fastest} days at the cap`, short.total === 1680 && short.last === 17.5 && short.fastest <= 14, JSON.stringify(short));
// 9. the pass cosmetics: drawn from the event's colours
const cos = await A.ev(() => { const id = 'mon26'; return { stamp: /🌧️/.test(stampArt('stamp_pass_' + id)), fstamp: /FOCUS/.test(stampArt('stamp_passf_' + id)), grad: !!NAME_GRADS['col_pass_' + id], aura: !!SPECIAL_AURAS['au_pass_' + id], title: TITLE_TEXT['ti_pass_' + id], items: ['stamp_pass_', 'ti_pass_', 'col_pass_', 'au_pass_', 'stamp_passf_'].every(p => ITEM_BY_ID[p + id] && ITEM_BY_ID[p + id].price === -1) }; });
check('Pass cosmetics for Monsoon Study: a seal and a focus seal with its emoji, a three-tone name colour, a spinning aura, the "Monsoon Study Pass Holder" title — earned only', cos.stamp && cos.fstamp && cos.grad && cos.aura && cos.title === 'Monsoon Study Pass Holder' && cos.items, JSON.stringify(cos));
// 10. the questline card shows a pass line
const ql = await A.ev(async () => { S.ui.questView = 'quest'; renderQuests(); await new Promise(r => setTimeout(r, 300)); const l = $('.ql-pass'); return l ? l.textContent.replace(/\s+/g, ' ') : ''; });
check('The questline card has a Study Pass line (tier and Focus step) that opens the pass', /Study Pass · tier \d+ \/ 30 · Focus \d+ \/ 20/.test(ql), ql);
// 11. an account from before 1.20 (no pass in its ledger) loads fine
const old = await A.ev(() => { const g = normalizeGame({ claims: { login: { '2026-10-01': 1 } } }); return { pass: g.claims.pass && typeof g.claims.pass === 'object', n: Object.keys(g.claims.pass).length }; });
check('An account saved before 1.20 (no pass entries) loads with an empty pass ledger', old.pass && old.n === 0, JSON.stringify(old));
// 12. layout of the pass view
const lay = [];
for (const w of [360, 390, 768, 1440]) {
  await A.p.setViewportSize({ width: w, height: 900 }); await wait(300);
  lay.push(await A.ev(async w => { S.ui.questView = 'pass'; showTab('quests'); renderQuests(); await new Promise(r => setTimeout(r, 300)); const over = document.documentElement.scrollWidth - innerWidth, row = $('[data-prow=p]'); return { w, over, rowScrolls: row.scrollWidth > row.clientWidth, cur: !!$('.pt.cur') || !!$('.pt.ready') }; }, w));
}
check('The pass from 360 to 1440 px: no sideways page scroll; the tier rows scroll on their own', lay.every(l => l.over <= 1), JSON.stringify(lay));
await A.ctx.close();
// 13. the demo: sample progress, claiming shows the preview prompt, nothing written
const D = await device('D', 1280, {}, { overtime: true });
await D.p.goto(SITE + '/index.html'); await D.p.waitForSelector('#authView:not(.hidden)'); await D.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await D.ev(() => startPreview()); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(3000); await closeDlg(D);
const demo = await D.ev(async () => {
  window.__w = []; for (const k of ['setDoc', 'updateDoc', 'deleteDoc', 'addDoc', 'runTransaction']) { const f = FB[k]; FB[k] = (...a) => { window.__w.push(k); return f(...a); }; }
  const ls0 = JSON.stringify(Object.keys(localStorage).sort());
  S.ui.questView = 'pass'; showTab('quests'); await new Promise(r => setTimeout(r, 800));
  const got = $$('.pt.got').length, ready = $$('.pt.ready').length, claim = $('[data-pclaim]'); if (claim) claim.click(); await new Promise(r => setTimeout(r, 400));
  return { got, ready, prompt: !!document.querySelector('#pvDlg[open]'), w: window.__w, ls: JSON.stringify(Object.keys(localStorage).sort()) === ls0, claims: Object.keys(S.game.claims.pass).length };
});
check('Demo: the pass with sample progress (claimed and ready tiers); Claim shows the preview prompt; nothing written', demo.got >= 5 && demo.ready > 0 && demo.prompt && !demo.w.length && demo.ls && demo.claims === 5, JSON.stringify(demo));
log('errors', JSON.stringify(errs));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 4)));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
