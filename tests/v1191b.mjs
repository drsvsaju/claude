// v1.19.1: my rank next to my name — the header chip (opens the Ranks board), my player card on the Profile (collapsed
// and expanded; shows my progress), the Customise preview; every theme in light and dark (readable), True Minimalist
// (hidden, nothing left behind), 360 px (header and card fit), a guest (the chip shows the Rank card), the demo
// (sample rank, opens the demo Ranks board, no writes).
import { b, device, signup, wait, log, check, errs, failCount, closeDlg } from './cl-common.mjs';
const SHOTS = process.env.SHOTS || '';
const R = Date.now().toString(36).slice(-5);
const A = await device('A', 1280);
await signup(A, 'rkc_' + R); await closeDlg(A);
// about 35 counted hours this season (Gold) when the month is far enough along: 700 min on each of up to three UTC days
await A.ev(() => {
  const now = new Date(), y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  const days = [d, d - 1, d - 2].filter(x => x >= 1);
  days.forEach((dd, i) => { const end = Math.min(Date.now() - 60000, Date.UTC(y, m, dd, 20, 0)); for (let k = 0; k < 7; k++) { const e = end - k * 101 * 60000; S.sessions.push({ id: 'rk' + i + '_' + k, name: 'Physics', start: e - 100 * 60000, end: e, duration: 100 * 60000, planned: 100 * 60000, preset: 'Classic 25/5' }); } });
  S.sessions.sort((a, b) => a.start - b.start); S.settings.gardenTour = Date.now(); SEAS = null; G = null; save(); renderHeaderChip(); showTab('timer');
});
await wait(800); await closeDlg(A);
const want = await A.ev(() => rankName(myRank().idx));
const hdr = () => A.ev(() => { const c = $('#rankChip'), l = $('#lvChip'), r = c.getBoundingClientRect(); return { shown: !c.classList.contains('hidden') && r.width > 0, text: c.textContent.trim(), svg: !!c.querySelector('.rk-b svg'), afterLevel: l.nextElementSibling === c, label: c.getAttribute('aria-label'), right: Math.round(r.right), left: Math.round(r.left), w: innerWidth, hs: document.documentElement.scrollWidth > innerWidth }; });
const h1 = await hdr();
check('Header: my rank (icon + name) right after the level chip', h1.shown && h1.text === want && h1.svg && h1.afterLevel && /Your rank/.test(h1.label), JSON.stringify({ want, ...h1 }));
if (SHOTS) await A.p.locator('.hdr-right').screenshot({ path: SHOTS + '/hdr-1280.png' });
await A.p.click('#rankChip');
const onBoard = await A.ev(async () => { for (let i = 0; i < 60; i++) { const c = $('#boardBody [data-board]'); if (S.ui.tab === 'board' && c && /\|season$/.test(c.dataset.board)) return { tab: S.ui.tab, board: c.dataset.board, kind: ($('#lbKind .active') || {}).textContent }; await new Promise(r => setTimeout(r, 150)); } return { tab: S.ui.tab, board: ($('#boardBody [data-board]') || { dataset: {} }).dataset.board }; });
check('Tapping it opens the Ranks board ("This season")', onBoard.tab === 'board' && /\|season$/.test(onBoard.board || '') && onBoard.kind === 'Ranks', JSON.stringify(onBoard));
// the player card on the Profile
await A.ev(() => { setCardOpen(false); showTab('profile'); }); await wait(700);
const card = () => A.ev(() => { const p = $('#profileHead .pc-own .pc-rank'), n = $('#profileHead .pc-own .pc-name'); if (!p) return { has: false }; const r = p.getBoundingClientRect(), cr = $('#profileHead .pc-own').getBoundingClientRect(), nr = n.getBoundingClientRect();
  return { has: true, btn: p.tagName === 'BUTTON', text: p.textContent.trim(), svg: !!p.querySelector('.rk-b svg'), inside: r.left >= cr.left - 0.5 && r.right <= cr.right + 0.5, nextToName: Math.abs((r.top + r.bottom) / 2 - (nr.top + nr.bottom) / 2) < 14 || r.top >= nr.bottom - 2 }; });
const c1 = await card();
await A.ev(() => setCardOpen(true)); await wait(500);
const c2 = await card();
check('Profile card, collapsed and expanded: my rank next to my name (a button)', c1.has && c1.btn && c1.text === want && c1.svg && c1.inside && c2.has && c2.text === want && c2.inside, JSON.stringify({ c1, c2 }));
if (SHOTS) await A.p.locator('#profileHead .pc-own').screenshot({ path: SHOTS + '/card-1280.png' });
await A.p.click('#profileHead .pc-own .pc-rank'); await wait(900);
const prog = await A.ev(() => { const d = $('#rankLadderDlg'), me = $('#rankLadderDlg .rkl-div.me'); const out = { open: d.open, me: !!me, text: d.textContent.includes('You: ' + rankName(myRank().idx)) }; d.close(); return out; });
check('Tapping it on the card shows my progress: the rank ladder opens with my step marked (v1.20; it used to scroll to the Rank card)', prog && prog.open && prog.me && prog.text, JSON.stringify(prog));
await A.ev(() => openCardDlg()); await wait(500);
const prev = await A.ev(() => { const p = $('#cdPrev .pc-rank'); return p ? { tag: p.tagName, text: p.textContent.trim() } : null; });
check('Customise preview shows it too (a label there, not a button)', prev && prev.tag === 'SPAN' && prev.text === want, JSON.stringify(prev));
await closeDlg(A);
// every theme, light and dark: the chip and the card label stay readable
const themes = await A.ev(() => {
  const cx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = c => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, bot) => [0, 1, 2].map(i => top[i] * top[3] + bot[i] * (1 - top[3]));
  const bgOf = el => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 0.99) break; }
    let col = [255, 255, 255]; for (const l of layers.reverse()) col = over(l, col); return col; };
  const lum = m => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const ratio = el => { const bg = bgOf(el), fg = over(rgba(getComputedStyle(el).color), bg); const a = lum(fg), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  const out = [], ids = ITEMS.filter(it => it.cat === 'theme').map(it => it.id), mode0 = S.settings.theme;
  for (const id of ids) for (const mode of ['light', 'dark']) {
    themePreviewId = id; S.settings.theme = mode; applyTheme(); renderHeaderChip(); renderProfile();
    const chip = $('#rankChip .rkn'), pill = $('#profileHead .pc-own .pc-rank span:last-child');
    out.push({ id, mode, chip: +ratio(chip).toFixed(2), card: pill ? +ratio(pill).toFixed(2) : 0 });
  }
  themePreviewId = null; S.settings.theme = mode0; applyTheme(); renderHeaderChip(); renderProfile();
  return out;
});
const low = themes.filter(t => t.chip < 4.5 || t.card < 4.5);
check(`Every theme (${themes.length / 2}) in light and dark: the header chip text and the card label are readable (≥ 4.5:1)`, themes.length >= 2 && !low.length, JSON.stringify(low.slice(0, 5)));
// True Minimalist
await A.ev(() => { setMinimal(true); showTab('profile'); }); await wait(600);
const mini = await A.ev(() => ({ chip: !$('#rankChip').classList.contains('hidden'), chipHTML: $('#rankChip').innerHTML, card: !!$('#profileHead .pc-rank'), hs: document.documentElement.scrollWidth > innerWidth }));
await A.ev(() => setMinimal(false)); await wait(500);
const back = await hdr();
check('True Minimalist: no chip and no card label (nothing left behind); back on when it is turned off', !mini.chip && !mini.chipHTML && !mini.card && !mini.hs && back.shown && back.text === want, JSON.stringify({ mini, back: back.text }));
// 360 px: the header and the card fit
await A.p.setViewportSize({ width: 360, height: 760 }); await A.ev(() => showTab('profile')); await wait(700);
const ph = await A.ev(() => { const kids = [...$('.hdr-right').children].filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return [e.id || e.className, Math.round(r.left), Math.round(r.right)]; });
  const top = $('.top') || $('header'), tr = top ? top.getBoundingClientRect() : { height: 0 };
  const gem = $('#lvChip .lv-rk'), gr = gem ? gem.getBoundingClientRect() : { width: 0 };
  return { hs: document.documentElement.scrollWidth > innerWidth, out: kids.filter(([, l, r]) => l < 0 || r > innerWidth), chipHidden: $('#rankChip').getBoundingClientRect().width === 0, gem: gr.width > 0 && !!gem.querySelector('.rk-b svg'), gemLabel: gem && gem.getAttribute('aria-label'), topH: Math.round(tr.height) }; });
const c3 = await card();
check('360 px: the rank gem sits in the level chip (the name in its label), nothing off-screen; the card label (icon + name) fits inside the card', !ph.hs && !ph.out.length && ph.chipHidden && ph.gem && ph.gemLabel === 'Rank: ' + want && ph.topH < 80 && c3.has && c3.inside && c3.text === want, JSON.stringify({ ph, c3 }));
await A.ev(() => showTab('timer')); await wait(400);
await A.p.click('#lvChip .lv-rk'); await wait(900);
const gemTap = await A.ev(() => ({ tab: S.ui.tab, board: ($('#boardBody [data-board]') || { dataset: {} }).dataset.board }));
await A.ev(() => showTab('timer')); await wait(300);
await A.p.click('#lvChip .gring'); await wait(600);
const chipTap = await A.ev(() => S.ui.tab);
check('360 px: tapping the gem opens the Ranks board; the rest of the level chip still opens the profile', gemTap.tab === 'board' && /\|season$/.test(gemTap.board || '') && chipTap === 'profile', JSON.stringify({ gemTap, chipTap }));
// every width 320–1280: the rank doesn't squeeze the logo, nothing in the header overlaps or leaves the screen
const sweep = [];
for (const w of [320, 340, 360, 375, 390, 412, 430, 460, 480, 481, 500, 540, 600, 640, 641, 700, 768, 820, 900, 1000, 1024, 1100, 1280]) {
  await A.p.setViewportSize({ width: w, height: 760 }); await A.ev(() => showTab('timer')); await wait(250);
  const m = await A.ev(() => { const brand = $('#brandBtn'), kids = [...$('.hdr-right').children].filter(e => e.offsetParent !== null && getComputedStyle(e).display !== 'none'); const bw = brand.getBoundingClientRect().width;
    const rs = kids.map(e => e.getBoundingClientRect()), lap = rs.some((r, i) => i && r.left < rs[i - 1].right - 0.5), off = rs.some(r => r.left < 0 || r.right > innerWidth + 0.5);
    document.documentElement.classList.add('t-norank'); return { bw, lap, off, hs: document.documentElement.scrollWidth > innerWidth, chip: $('#rankChip').getBoundingClientRect().width > 0, gem: ($('#lvChip .lv-rk') || { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width > 0 }; });
  // the logo button must keep its full content (logo, and the name where the layout shows it): not clipped, not squeezed
  const fit = await A.ev(() => {
    const meas = () => { const br = $('#brandBtn'), logo = br.querySelector('.logo').getBoundingClientRect(); return { clip: br.scrollWidth - br.clientWidth, logoW: Math.round(logo.width), logoIn: logo.right <= br.getBoundingClientRect().right + 0.5 }; };
    const withRank = meas(); const st = document.createElement('style'); st.textContent = '#rankChip, .lv-rk { display: none !important; }'; document.head.append(st); const noRank = meas(); st.remove();
    return { clip: withRank.clip, clip0: noRank.clip, logoW: withRank.logoW, logoIn: withRank.logoIn };
  });
  // the rank must not clip the logo button more than the header already does without it
  if (m.lap || m.off || m.hs || fit.clip > Math.max(1, fit.clip0 + 1) || !fit.logoIn || fit.logoW < 20 || !(m.chip || m.gem)) sweep.push({ w, ...m, ...fit });
}
check('Every width from 320 to 1280 px: the rank shows (chip or gem), the logo is never squeezed or clipped (beyond what the header does without it), and nothing in the header overlaps or leaves the screen', !sweep.length, JSON.stringify(sweep));
if (SHOTS) { await A.p.screenshot({ path: SHOTS + '/profile-360.png', clip: { x: 0, y: 0, width: 360, height: 420 } }); }
await A.p.setViewportSize({ width: 1280, height: 900 });
await A.ctx.close();
// a guest: no boards — the chip shows the Rank card
const G = await device('G', 1280);
await G.p.goto(process.env.SITE ? process.env.SITE + '/index.html' : 'http://localhost:8000/index.html'); await G.p.waitForSelector('#authView:not(.hidden)');
await G.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); }); await G.p.click('#guestBtn'); await G.p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await closeDlg(G);
await G.ev(() => { S.settings.gardenTour = Date.now(); }); await G.p.click('#rankChip'); await wait(900);
const gst = await G.ev(() => ({ tab: S.ui.tab, card: !!$('#rankCard'), chip: $('#rankChip').textContent.trim(), flash: !!$('#rankCard.rk-flash') }));
check('A guest: the chip shows Bronze III and opens the Rank card on the profile (guests have no boards)', gst.tab === 'profile' && gst.card && gst.chip === 'Bronze III' && gst.flash, JSON.stringify(gst));
await G.ctx.close();
// the demo: a sample rank, the demo Ranks board, no writes
const D = await device('D', 1280);
await D.p.goto(process.env.SITE ? process.env.SITE + '/index.html' : 'http://localhost:8000/index.html'); await D.p.waitForSelector('#authView:not(.hidden)');
await D.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); }); await D.ev(() => startPreview()); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(3000); await closeDlg(D);
await D.ev(() => { window.__w = []; for (const k of ['setDoc', 'updateDoc', 'addDoc', 'deleteDoc']) { const f = FB[k]; if (typeof f === 'function') FB[k] = (...a) => { __w.push(k); return f(...a); }; } });
const dm = await D.ev(() => ({ chip: $('#rankChip').textContent.trim(), want: rankName(myRank().idx), shown: !$('#rankChip').classList.contains('hidden') }));
await D.p.click('#rankChip'); await wait(1500);
const db = await D.ev(() => ({ tab: S.ui.tab, board: ($('#boardBody [data-board]') || { dataset: {} }).dataset.board, rows: $$('#boardBody .lb li[data-uid], #boardBody .lb-pod').length, w: window.__w }));
await D.ev(() => showTab('profile')); await wait(600);
const dc = await D.ev(() => ({ pill: ($('#profileHead .pc-rank') || {}).textContent || '' }));
check('Demo: the chip and the card show the sample rank, the chip opens the demo Ranks board, no write calls', dm.shown && dm.chip === dm.want && db.tab === 'board' && /\|season$/.test(db.board || '') && db.rows > 0 && !db.w.length && dc.pill.trim() === dm.want, JSON.stringify({ dm, db, dc }));
await D.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
