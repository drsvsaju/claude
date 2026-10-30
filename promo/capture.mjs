// Capture the real app screens from the demo account ("Preview the app") for the promo video.
// The demo never writes; everything here changes only the page's in-memory state.
// Usage: node capture.mjs [http://localhost:8000/index.html]   → promo/shots/*.png
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(HERE, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const URL = process.argv[2] || 'http://localhost:8000/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch();

async function demo(width, height, scale, mobile) {
  const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile, colorScheme: 'dark' });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); localStorage.setItem('pomodorolist-tips-seen', JSON.stringify(['stats', 'reminders', 'quests', 'shop', 'friends', 'board', 'profile', 'settings', 'garden', 'room', 'clan', 'bag'])); });
  const p = await ctx.newPage();
  await p.goto(URL); await p.waitForSelector('#authView:not(.hidden)'); await wait(400);
  await p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await p.evaluate(() => startPreview());
  await p.waitForSelector('#appView:not(.hidden)'); await wait(2500);
  await p.evaluate(() => {
    // the demo banner is hidden (it is not part of the product UI) and motion is settled so every shot is a clean still
    const bn = document.getElementById('pvBanner'); if (bn) { bn.classList.add('hidden'); document.body.style.setProperty('--pv-h', '0px'); }
    document.documentElement.dataset.motion = 'reduced';
    document.querySelectorAll('dialog[open]').forEach(x => x.close());
    document.querySelectorAll('.pomeo-bubble, .pomeo-pop, #tipPop').forEach(x => x.classList.add('hidden'));
    const st = document.createElement('style'); st.id = 'promoStyle';
    st.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; } #toastHost, .toast-host, .toast-item { display: none !important; } .pv-banner { display: none !important; }';
    document.head.appendChild(st);
  });
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
async function shotEl(d, sel, name, pad = 0) {
  const box = await d.ev(([sel, pad]) => {
    const el = document.querySelector(sel); if (!el) return null;
    el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70);
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.left - pad), y: Math.max(0, r.top - pad), width: Math.min(innerWidth, r.width + 2 * pad), height: Math.min(innerHeight - Math.max(0, r.top - pad), r.height + 2 * pad) };
  }, [sel, pad]);
  if (!box || box.width < 2 || box.height < 2) { console.log('missing', name, sel); return; }
  await wait(150);
  await d.p.screenshot({ path: path.join(OUT, name + '.png'), clip: box });
  console.log('shot', name);
}
async function shotPage(d, name) { await wait(150); await d.p.screenshot({ path: path.join(OUT, name + '.png') }); console.log('shot', name); }
const closeAll = d => d.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); document.querySelectorAll('.pomeo-bubble, .pomeo-pop, #tipPop').forEach(x => x.classList.add('hidden')); });

for (const [tag, w, h, scale, mobile] of [['d', 1440, 900, 2, false], ['m', 390, 844, 3, true]]) {
  const D = await demo(w, h, scale, mobile);
  const n = s => `${tag}-${s}`;
  // ---- timer: the ring at 31 points of a 25-minute block ----
  await D.ev(() => { showTab('timer'); });
  await wait(400);
  for (let i = 0; i <= 30; i++) {
    await D.ev(i => {
      const t = S.timer, planned = 25 * 60000, elapsed = Math.round(planned * i / 30);
      t.phase = 'focus'; t.status = 'running'; t.planned = planned; t.focusStartedAt = Date.now() - elapsed; t.endAt = Date.now() + (planned - elapsed); t.paused = false;
      if (typeof renderTimer === 'function') renderTimer();
      if (typeof tick === 'function' && i < 30) { try { tick(); } catch (e) {} }
      document.body.classList.remove('focus-dim');
    }, i);
    await wait(60);
    await shotEl(D, '#tab-timer .timer-card, #ring', n(`timer-ring-${String(i).padStart(2, '0')}`), 0);
  }
  await D.ev(() => { const t = S.timer; t.status = 'running'; t.focusStartedAt = Date.now() - 10 * 60000; t.endAt = Date.now() + 15 * 60000; renderTimer(); document.body.classList.remove('focus-dim'); });
  await wait(150);
  await shotPage(D, n('timer-page'));
  await D.ev(() => { const t = S.timer; t.status = 'idle'; t.phase = 'focus'; t.endAt = 0; renderTimer(); });
  // ---- garden: the scene while the tomato grows, then the full tab ----
  await D.ev(() => { S.ui.gardenView = 'garden'; showTab('garden'); }); await wait(500); await closeAll(D);
  const stages = [0, 8, 28, 50, 70];
  const sunny = () => D.ev(() => { const sc = document.getElementById('gdScene'); if (sc) { sc.dataset.wx = 'clear'; sc.dataset.tod = 'day'; } });
  for (let i = 0; i < stages.length; i++) {
    await D.ev(w => { const p = S.plants.find(x => x.id === 'demo_pl1'); if (p) { p.w = w ? { promo: w } : {}; } GD = null; renderGarden(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); }, stages[i]);
    await sunny();
    await wait(250);
    await shotEl(D, '#gdScene', n(`garden-stage-${i}`), 0);
  }
  await D.ev(() => { const p = S.plants.find(x => x.id === 'demo_pl1'); if (p) p.w = { promo: 45 }; GD = null; renderGarden(); });
  await sunny(); await wait(250);
  await shotEl(D, '#gdScene', n('garden-scene'), 0);
  await shotPage(D, n('garden-page'));
  await shotEl(D, '#tab-garden', n('garden-tab'), 0);
  // ---- harvests ----
  await D.ev(() => { S.ui.gardenView = 'harvests'; renderGarden(); }); await wait(300); await closeAll(D);
  await shotEl(D, '#tab-garden', n('harvests-tab'), 0);
  await D.ev(() => { const c = document.querySelector('.gd-crop'); if (c) { const grid = c.closest('.shopgrid, .gd-grid') || c.parentElement; grid.id = 'promoCrops'; const card = grid.closest('.card') || grid; card.id = card.id || 'promoCropsCard'; } });
  await shotEl(D, '#promoCrops', n('harvests-grid'), 10);
  await shotEl(D, '.gd-hv-head', n('harvests-head'), 0);
  await shotPage(D, n('harvests-page'));
  // ---- pets dialog ----
  await D.ev(() => { S.ui.gardenView = 'garden'; renderGarden(); openPetsDlg(); }); await wait(350);
  await shotEl(D, '#gdDlg', n('pets-dialog'), 0);
  await closeAll(D);
  // ---- boss arena: calm, a hit with a damage number, after the hit ----
  await D.ev(() => showTab('quests')); await wait(500); await closeAll(D);
  await shotEl(D, '#arena', n('boss-arena-0'), 0);
  const arenaCard = '#arena';
  await D.ev(() => { const a = document.getElementById('bossArt'); if (a) a.classList.add('hit'); const d = document.createElement('span'); d.className = 'dmg-float'; d.id = 'promoDmg'; d.textContent = '−25'; d.style.animation = 'none'; d.style.opacity = '1'; d.style.transform = 'translate(-50%, -40%) scale(1.15)'; document.getElementById('arena').appendChild(d); });
  await wait(100);
  await shotEl(D, arenaCard, n('boss-arena-1'), 0);
  await D.ev(() => { const a = document.getElementById('bossArt'); if (a) a.classList.remove('hit'); const d = document.getElementById('promoDmg'); if (d) d.remove(); });
  await shotEl(D, '#arena', n('boss-arena-2'), 0);
  await shotEl(D, '#arena', n('boss-card'), 0);
  await D.ev(() => { const c = document.getElementById('arena').closest('.card'); if (c) c.id = 'promoBossCard'; });
  await shotEl(D, '#promoBossCard', n('boss-fullcard'), 0);
  await shotPage(D, n('boss-page'));
  // ---- leaderboard podium ----
  await D.ev(() => { S.ui.lbScope = 'friends'; S.ui.lbPeriod = 'week'; showTab('board'); renderBoard(); }); await wait(1600); await closeAll(D);
  await D.ev(() => { const pod = document.querySelector('.lb-podium'); if (pod) pod.closest('.card').id = 'promoBoardCard'; });
  await shotEl(D, '#promoBoardCard', n('board-card'), 0);
  await shotEl(D, '.lb-podium', n('board-podium'), 8);
  await shotPage(D, n('board-page'));
  // ---- clan study table ----
  await D.ev(() => showTab('clan')); await wait(900); await closeAll(D);
  await D.ev(() => { const t = document.querySelector('.lv-table'); if (t) { const c = t.closest('.card') || t.parentElement; c.id = 'promoClanCard'; } });
  await shotEl(D, '#promoClanCard', n('clan-table-card'), 0);
  await shotEl(D, '.lv-table', n('clan-table'), 6);
  await shotPage(D, n('clan-page'));
  // ---- profile card ----
  await D.ev(() => { showTab('profile'); openCardDlg(); }); await wait(500);
  await shotEl(D, '#cardDlg .pcard', n('profile-card'), 0);
  await closeAll(D);
  await shotPage(D, n('profile-page'));
  // ---- stats (streaks), flashcards, reminders ----
  await D.ev(() => { S.ui.statsView = 'week'; showTab('stats'); }); await wait(500); await closeAll(D);
  await shotPage(D, n('stats-page'));
  await D.ev(() => { S.ui.remView = 'cards'; showTab('reminders'); renderRemSeg(); renderCards(); }); await wait(400); await closeAll(D);
  await shotPage(D, n('cards-page'));
  await D.ev(() => { S.ui.remView = 'rem'; showTab('reminders'); renderRemSeg(); }); await wait(400); await closeAll(D);
  await shotPage(D, n('reminders-page'));
  // ---- True Minimalist ----
  await D.ev(() => { setMinimal(true); showTab('timer'); const t = S.timer; t.phase = 'focus'; t.status = 'running'; t.planned = 25 * 60000; t.focusStartedAt = Date.now() - 9 * 60000; t.endAt = Date.now() + 16 * 60000; renderTimer(); document.body.classList.remove('focus-dim'); }); await wait(500); await closeAll(D);
  await shotPage(D, n('minimal-page'));
  await D.ev(() => { setMinimal(false); S.timer.status = 'idle'; });
  await D.ctx.close();
}

// ---- Pomeo and the logo as transparent PNGs ----
{
  const ctx = await b.newContext({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); });
  const p = await ctx.newPage();
  await p.goto(URL); await p.waitForSelector('#authView:not(.hidden)'); await wait(300);
  for (const st of ['idle', 'happy', 'excited', 'focus', 'celebrate', 'sleep']) {
    await p.evaluate(st => { document.body.innerHTML = `<div id="pomeoShot" style="width:560px;height:560px;display:flex;align-items:center;justify-content:center;background:transparent">${pomeoSVG({ state: st })}</div>`; const svg = document.querySelector('#pomeoShot svg'); if (svg) { svg.setAttribute('width', '520'); svg.setAttribute('height', '520'); svg.style.width = '520px'; svg.style.height = '520px'; svg.style.position = 'static'; } document.body.style.background = 'transparent'; document.documentElement.style.background = 'transparent'; }, st);
    await wait(100);
    const h = await p.$('#pomeoShot');
    await h.screenshot({ path: path.join(OUT, `pomeo-${st}.png`), omitBackground: true });
    console.log('shot pomeo', st);
  }
  // the logo: see extract-logo.py (the SVG is taken straight from index.html)

  await ctx.close();
}
await b.close();
console.log('done');
