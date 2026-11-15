// v1.20 phase 1: the rank division hint and the rank ladder.
//  The Rank card shows "Silver III → II → I → Gold III" with the current step marked; every rank badge's tooltip says
//  divisions go III → II → I; a tap on the card, the Timer's rank line, the card pill or any badge outside a button
//  opens the ladder (every rank and division with hours, You, the next step); a badge in a friend row opens the ladder,
//  not the profile; positions at several rank levels; phones and themes; hidden in True Minimalist; the demo writes nothing.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, SITE } from './cl-common.mjs';
const demo = async (w = 1280) => {
  const D = await device('D' + w, w);
  await D.p.goto(SITE + '/index.html'); await D.p.waitForSelector('#authView:not(.hidden)'); await D.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await D.ev(() => startPreview()); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(3000); await closeDlg(D);
  await D.ev(() => { S.settings.gardenTour = Date.now(); window.__w = []; for (const k of ['setDoc', 'updateDoc', 'deleteDoc', 'addDoc', 'runTransaction']) { const f = FB[k]; FB[k] = (...a) => { window.__w.push(k); return f(...a); }; } });
  return D;
};
const D = await demo();
// 1. the Rank card hint
const card = await D.ev(async () => {
  showTab('profile'); await new Promise(r => setTimeout(r, 900));
  const r = myRank(), h = $('#rankCard .rk-hint'), on = h && h.querySelector('.rh-step.on');
  return { idx: r.idx, name: rankName(r.idx), hint: h ? h.textContent.replace(/\s+/g, '') : '', on: on ? on.textContent : '', btn: !!$('#rankCard button[data-rkladder]') };
});
const want = (() => { const maj = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'][Math.floor(card.idx / 3)]; const nx = ['Silver III', 'Gold III', 'Platinum III', 'Diamond III', 'Master'][Math.floor(card.idx / 3)]; return (maj + 'III→II→I→' + nx).replace(/\s+/g, ''); })();
check(`Rank card: "${want}" with the current division (${card.name}) marked, and "All ranks ›"`, card.hint === want && card.on === card.name.split(' ')[1] && card.btn, JSON.stringify({ card, want }));
// 2. tooltips on badges everywhere
const tips = await D.ev(async () => { showTab('board'); setBoardPeriod('season'); renderBoard(); await new Promise(r => setTimeout(r, 1500)); return $$('.rk-b[data-rk]').map(x => x.title).slice(0, 8); });
check('Rank badges on the Ranks board: the tooltip names the rank and says divisions go III → II → I, then the next rank', tips.length >= 3 && tips.every(t => /divisions go III → II → I, then|tap for every rank/.test(t)), JSON.stringify(tips.slice(0, 3)));
// 3. the ladder: from the card, its contents
const lad = await D.ev(async () => {
  showTab('profile'); await new Promise(r => setTimeout(r, 600));
  $('#rankCard .rk-hero').click(); await new Promise(r => setTimeout(r, 300));
  const d = $('#rankLadderDlg'), r = myRank();
  const divs = $$('#rankLadderDlg .rkl-div'), me = $$('#rankLadderDlg .rkl-div.me'), nx = $$('#rankLadderDlg .rkl-div.nx');
  const first = divs[0] ? divs[0].textContent.replace(/\s+/g, ' ') : '', gm = divs[16] ? divs[16].textContent : '';
  const out = { open: d.open, rows: $$('#rankLadderDlg .rkl-row').length, divs: divs.length, me: me.length, meIdx: divs.indexOf(me[0]), idx: r.idx, nx: divs.indexOf(nx[0]), next: r.next, first, gm, foot: $('#rankLadderDlg .rkl-foot').textContent, intro: /from III \(lowest\) to I \(highest\)/.test(d.textContent) };
  d.close(); return out;
});
check('Tapping the Rank card opens the ladder: 7 ranks, 17 steps with hour ranges (Bronze III 0–3.3 h … Grandmaster 180 h +), "You" on your step, the next one marked, III (lowest) → I (highest) explained', lad.open && lad.rows === 7 && lad.divs === 17 && lad.me === 1 && lad.meIdx === lad.idx && lad.nx === lad.next && /III\s*0–3\.3 h/.test(lad.first) && /180 h \+/.test(lad.gm) && lad.intro && /You:/.test(lad.foot), JSON.stringify(lad));
// 4. other ways in: the Timer rank line, the card pill, a badge in a row (not the row's own action)
const ways = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), d = $('#rankLadderDlg'), out = {};
  showTab('timer'); await sl(500); $('#rankLine').click(); await sl(200); out.timer = d.open; d.close();
  showTab('profile'); await sl(500); const pill = $('[data-myrank]'); if (pill) pill.click(); await sl(200); out.pill = d.open; d.close();
  showTab('board'); await sl(1200); const badge = $$('#tab-board .rk-b[data-rk]').find(x => x.closest('[data-open], li, .lb-row')); out.hasRowBadge = !!badge;
  SOC.friend = null; if (badge) badge.click(); await sl(300); out.row = d.open; out.profileOpened = !!SOC.friend; d.close();
  showTab('timer'); await sl(200); $('#rankChip').click(); await sl(600); out.chip = S.ui.tab;   // the header chip still opens the Ranks board (v1.19.1)
  return out;
});
check('The Timer rank line and the player-card pill open the ladder; a badge in a leaderboard row opens the ladder (not the row); the header chip still opens the Ranks board', ways.timer && ways.pill && ways.hasRowBadge && ways.row && !ways.profileOpened && ways.chip === 'board', JSON.stringify(ways));
check('Demo: nothing written', (await D.ev(() => window.__w.length)) === 0);
// 5. phones and themes: the ladder fits
const fit = [];
for (const w of [360, 390, 768]) {
  await D.p.setViewportSize({ width: w, height: 800 }); await wait(300);
  for (const v of [{ mode: 'light', glass: 'off' }, { mode: 'dark', glass: 'full' }]) {
    const r = await D.ev(async v => { S.settings.theme = v.mode; applyTheme(); setGlass(v.glass); showTab('profile'); await new Promise(r => setTimeout(r, 400)); openRankLadder(); await new Promise(r => setTimeout(r, 300)); const d = $('#rankLadderDlg'), rr = d.getBoundingClientRect(); const over = [...d.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > rr.right + 1).length; const res = { l: Math.round(rr.left), r: Math.round(rr.right), w: innerWidth, over, sx: d.scrollWidth - d.clientWidth }; d.close(); return res; }, v);
    if (r.l < 0 || r.r > r.w || r.over || r.sx > 1) fit.push({ w, ...v, ...r });
  }
}
await D.ev(() => { S.settings.theme = 'auto'; applyTheme(); setGlass('off'); });
check('The ladder fits at 360 / 390 / 768 px in light and dark Glossed: on screen, nothing past its edge, no sideways scroll', !fit.length, JSON.stringify(fit));
// 6. True Minimalist: no badges, no ladder
const mini = await D.ev(async () => { setMinimal(true); showTab('profile'); await new Promise(r => setTimeout(r, 500)); openRankLadder(); const out = { open: $('#rankLadderDlg').open, badges: $$('.rk-b').filter(x => x.getClientRects().length).length }; setMinimal(false); return out; });
check('True Minimalist: no rank badges and the ladder stays closed', !mini.open && mini.badges === 0, JSON.stringify(mini));
await D.ctx.close();
// 7. a real account at several rank levels: the hint and "You" follow the counted minutes
const A = await device('A', 1280);
await signup(A, 'rk_' + Date.now().toString(36).slice(-5)); await closeDlg(A);
const levels = [];
for (const min of [0, 250, 950, 2100, 3700, 6500, 7300]) {   // (a season so far has as many days as today's date: 14 h a day at most)
  levels.push(await A.ev(async min => {
    const t0 = Date.now(), keep = S.sessions; S.sessions = [];
    let left = min, k = 0; while (left > 0) { const m = Math.min(left, 400), end = t0 - k * 864e5 * 0 - k * 1000; S.sessions.push({ id: 'r' + k, name: 'x', start: end - m * 6e4, end, duration: m * 6e4, planned: m * 6e4 }); left -= m; k++; }
    // spread across days so the 14 h cap doesn't bite: put each block on its own UTC day of this month where possible
    const mk = seasonKeyNow(), today = new Date().getUTCDate(); S.sessions.forEach((s, i) => { const day = 1 + (i % Math.max(1, today - 1)); const d = new Date(Date.UTC(+mk.slice(0, 4), +mk.slice(5) - 1, day, 9 + Math.floor(i / Math.max(1, today - 1)) * 7)); s.end = Math.min(d.getTime(), Date.now() - 1000); s.start = s.end - s.duration; });
    SEAS = null;
    const r = myRank(); openRankLadder(); await new Promise(z => setTimeout(z, 100));
    const divs = $$('#rankLadderDlg .rkl-div'), me = divs.findIndex(x => x.classList.contains('me'));
    $('#rankLadderDlg').close(); S.sessions = keep; SEAS = null;
    return { min, counted: r.min, idx: r.idx, name: rankName(r.idx), me, hint: rankHintHTML(r.idx).replace(/<[^>]+>/g, '') };
  }, min));
}
const lvOk = levels.every(l => l.me === l.idx);
check(`The ladder's "You" follows the counted minutes: ${levels.map(l => `${Math.round(l.counted / 60)} h → ${l.name}`).join(', ')}`, lvOk && levels[0].name === 'Bronze III' && levels.some(l => /Gold/.test(l.name)) && levels[levels.length - 1].name === 'Master', JSON.stringify(levels));
const bnd = await A.ev(() => Object.fromEntries([2, 3, 12, 14, 15, 16].map(i => [i, rankHintHTML(i).replace(/<[^>]+>/g, '').replace(/\s+/g, '') + '|' + ((new DOMParser().parseFromString(rankHintHTML(i), 'text/html').querySelector('.rh-step.on') || {}).textContent || '')])));
check('At the boundaries: Bronze I → next "Silver III"; Silver III marked III; Diamond III … → "Master"; Diamond I marked I; Master and Grandmaster shown as the last two steps', /^BronzeIII→II→I→SilverIII\|I$/.test(bnd[2]) && /^SilverIII→II→I→GoldIII\|III$/.test(bnd[3]) && /^DiamondIII→II→I→Master\|III$/.test(bnd[12]) && /\|I$/.test(bnd[14]) && /^Master→Grandmaster\|Master$/.test(bnd[15]) && /^Master→Grandmaster\|Grandmaster$/.test(bnd[16]), JSON.stringify(bnd));
await A.ctx.close();
log('errors', JSON.stringify(errs));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 4)));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
