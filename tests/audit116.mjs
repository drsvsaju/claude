// v1.15 layout audit: every tab and dialog (including the Garden, Pomeo's room, flashcards, the weekly plan and the new
// shop categories) at 360 / 390 / 768 / 1024 / 1280 / 1440 in light, dark, Glossed and True Minimalist, with long names.
// Reports sideways page scroll, elements sticking out of the viewport, clipped text without ellipsis, text overflowing
// its box, touch targets under 44px and console errors. Usage: node audit115.mjs [shots]   env W=360,1280 MODES=light,dark
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const args = process.argv.slice(2), SHOTS = args.includes('shots');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [], found = new Map();
const LONG = 'Organic Chemistry – Aldehydes, Ketones and Carboxylic Acids (revision part 2)';
const seed = ([LONG, minimal]) => {
  const ss = [], day = 864e5, now = Date.now();
  for (let d = 0; d < 70; d++) for (let k = 0; k < 2 + (d % 3); k++) {
    const st = new Date(now - d * day); st.setHours(7 + k * 3, 10, 0, 0);
    if (st > now) continue;
    const len = [25, 50, 30][k % 3];
    ss.push({ id: `a${d}_${k}`, name: [LONG, 'Physics', 'Maths – Integration by parts', 'Biology'][(d + k) % 4], start: +st, end: +st + len * 6e4, duration: len * 6e4, planned: len * 6e4, preset: 'Classic 25/5' });
  }
  const dk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const w = {}; for (let j = 0; j < 6; j++) w['a' + j + '_0'] = 25;
  const plants = [
    { id: 'mig1', v: 1, sum: 1, at: now - 30 * day, grown: 44, golden: 3, ripe: 20, wilted: 2, y: 40, xp: 309, u: now - 30 * day },
    { id: 'p1', v: 1, sp: 'tomato', plot: 0, seed: 'st1', at: now - 5 * day, sk: 3, w: { a1_0: 25, a2_0: 25 }, u: now - day },
    { id: 'p2', v: 1, sp: 'sunflower', plot: 1, seed: 'st3', at: now - 6 * day, sk: 3, w, u: now - day },
    { id: 'p3', v: 1, sp: 'carrot', plot: 2, seed: 'b1', at: now - 2 * day, sk: 3, w: {}, u: now - day },
    { id: 'h1', v: 1, sp: 'tomato', plot: -1, seed: 'st2', at: now - 20 * day, sk: 3, wt: 90, fin: 'a9_0', fd: 50, h: now - 10 * day, y: 9, m: 'golden', u: now - 10 * day },
    { id: 'h2', v: 1, sp: 'pumpkin', plot: -1, seed: 'b9', at: now - 15 * day, sk: 3, wt: 360, fin: 'a8_0', fd: 90, h: now - 4 * day, y: 60, m: 'rainbow', wm: ['shocked', 'moonlit'], giant: 1, kg: 24.5, u: now - 4 * day },   // 1.16: a Giant, two weather mutations
    { id: 'p4', v: 1, sp: 'basil', plot: 3, seed: 'b8', at: now - 3 * day, sk: 3, w: { a1_0: 30, a2_0: 30 }, fin: 'a2_0', fd: 30, m: '', wm: ['dawn'], u: now - day },   // 1.16: ripe, Dawn
  ];
  const eggs = [{ id: 'egg1', v: 1, kind: 'common', src: 'focus', at: now - 20 * day, need: 300, w: { a1_0: 300 }, h: now - 10 * day, pet: 'bunny', hs: 'a1_0' }, { id: 'egg2', v: 1, kind: 'common', src: 'focus', at: now - 10 * day, need: 300, w: { a2_0: 125 } }, { id: 'egg_lv4', v: 1, kind: 'rare', src: 'lv4', at: now - 5 * day, need: 420, w: {} }];
  const petPrefs = { p1: { v: 'bunny', u: now - 9 * day } };
  const gbuys = [
    { id: 'st1', v: 1, item: 'seed_tomato', price: 0, at: now - 30 * day, slot: '', u: now - 30 * day }, { id: 'st2', v: 1, item: 'seed_tomato', price: 0, at: now - 30 * day, slot: '', u: now - 30 * day }, { id: 'st3', v: 1, item: 'seed_sunflower', price: 0, at: now - 30 * day, slot: '', u: now - 30 * day },
    { id: 'b1', v: 1, item: 'seed_carrot', price: 6, at: now - 3 * day, slot: '', u: now - 3 * day }, { id: 'b8', v: 1, item: 'seed_basil', price: 3, at: now - 4 * day, slot: '', u: now - 4 * day }, { id: 'b9', v: 1, item: 'seed_pumpkin', price: 35, at: now - 16 * day, slot: '', u: now - 16 * day, ok: 1 }, { id: 'b10', v: 1, item: 'av_pumpkin', price: 35, at: now - 2 * day, slot: '', u: now - 2 * day, ok: 1 },   // 1.16: a garden look (settled) { id: 'b2', v: 1, item: 'dc_fence_wood', price: 10, at: now - 3 * day, slot: 'border', u: now - 3 * day }, { id: 'b3', v: 1, item: 'dc_gnome', price: 8, at: now - 2 * day, slot: 's1', u: now - 2 * day },
  ];
  const decks = [{ id: 'd1', v: 1, name: LONG, subject: 'Chemistry', at: now - 9 * day, u: now - 9 * day }, { id: 'd2', v: 1, name: 'Physics formulas', subject: 'Physics', at: now - 9 * day, u: now - 9 * day }];
  const cards = []; for (let k = 0; k < 14; k++) cards.push({ id: 'c' + k, v: 1, deck: k % 3 ? 'd1' : 'd2', f: k % 4 ? 'Question ' + k + ': ' + LONG : 'Short ' + k, b: 'Answer ' + k + ' — ' + LONG + ' ' + LONG, due: k % 2 ? dk(new Date(now - day)) : '', ivl: k % 2 ? 3 : 0, ease: 2.5, reps: k % 2 ? 2 : 0, at: now - 8 * day, u: now - 8 * day });
  const plan = [{ id: 'pl1', v: 1, name: 'Physics', hrs: 8, at: now - 20 * day, u: now - 20 * day }, { id: 'pl2', v: 1, name: LONG.slice(0, 40), hrs: 12, at: now - 20 * day, u: now - 20 * day }, { id: 'pl3', v: 1, name: 'Biology', hrs: 3, at: now - 2 * day, u: now - 2 * day }];
  const roomSets = [{ id: 'rs1', v: 1, name: 'Cosy evening corner xx', slots: { wall: 'wall_plain', floor: 'floor_wood', rug: 'rug_none', desk: 'desk_basic', lamp: 'lamp_basic', shelf: 'shelf_none', plant: 'plant_none', poster: 'poster_none', window: 'window_plain', pet: 'pet_none' }, u: now - day }];
  localStorage.setItem('focus-app-v1', JSON.stringify({
    sessions: ss.sort((a, b) => a.start - b.start), plants, gbuys, decks, cards, plan, roomSets, eggs, petPrefs,
    presets: [{ id: 'p-classic', name: 'Classic 25/5', focus: 25, short: 5, long: 15, rounds: 4 }],
    reminders: [{ id: 'r1', title: LONG, date: dk(new Date(now + day)), time: '09:30', repeat: 'none', dur: 50, created: now }],
    todos: [{ id: 't1', title: LONG, due: dk(new Date(now + day)), pri: 'h', done: false, at: now }],
    settings: { goalMin: 120, ...(minimal ? { gamification: false } : {}) },
    game: { purchases: { x1: { item: 'trail_petals', price: 0, at: now - day }, x2: { item: 'th_aurora', price: 0, at: now - day }, x3: { item: 'lamp_desk', price: 0, at: now - day }, x4: { item: 'stamp_leaf', price: 0, at: now - day } }, equipped: { trail: 'trail_petals', stamp: 'stamp_leaf' } },
  }));
  localStorage.setItem('pomodorolist-guest', '1');
  localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-intro-seen', '1');
  localStorage.setItem('pomodorolist-seen-version', '9.9');
  localStorage.setItem('pomodorolist-tips-seen', JSON.stringify(['stats', 'reminders', 'quests', 'shop', 'friends', 'board', 'profile', 'settings', 'garden', 'room']));
  const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()));
};
const check = touch => {
  const out = [], vw = innerWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push(['page', `page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`]);
  const root = [...document.querySelectorAll('dialog[open]')].pop() || document.querySelector('.tab.active');
  const scopes = [root, ...(root && root.matches('.tab') ? [$('header.top')] : [])].filter(Boolean);
  const sig = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const scrollAnc = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return a; } return null; };
  for (const scope of scopes) for (const el of scope.querySelectorAll('*')) {
    if (!el.getClientRects().length || el.closest('svg') && el.tagName !== 'svg') continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const anc = scrollAnc(el);
    if ((!anc || el.closest('header.top')) && (r.right > vw + 1 || r.left < -1) && cs.position !== 'fixed' && !el.closest('#ringTrail, .gd-sky, .gd-visitor, #themeFx')) out.push([sig(el), `sticks out of the screen (${Math.round(r.left)}..${Math.round(r.right)} / ${vw})`]);
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own && el.scrollWidth > el.clientWidth + 1 && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis') out.push([sig(el), `text clipped without ellipsis: "${el.textContent.trim().slice(0, 30)}"`]);
    if (own && cs.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 2 && cs.display !== 'inline' && el.clientWidth > 0) out.push([sig(el), `text overflows its box: "${el.textContent.trim().slice(0, 30)}"`]);
    if (touch && el.matches('button, a[href], select, summary, [role=button], input:not([type=hidden]):not([type=range])') && !el.disabled) {
      let h = r.height, w = r.width;
      const pa = getComputedStyle(el, '::after'); if (pa.content !== 'none' && pa.position === 'absolute') { w = Math.max(w, parseFloat(pa.width) || 0); h = Math.max(h, parseFloat(pa.height) || 0); }
      const lab = el.closest('label, .setting, .tut-switch');
      if (lab && el.matches('input[type=checkbox]') && (lab.matches('label') || lab.dataset.rowToggle !== undefined)) { const lr = lab.getBoundingClientRect(); h = lr.height; w = lr.width; }
      if (el.matches('input[type=text], input[type=number], input[type=date], input[type=time], input:not([type]), select, textarea')) { if (h < 40) out.push([sig(el), `field only ${Math.round(h)}px tall`]); }
      else if (h < 43.5 || w < 43.5) out.push([sig(el), `tap target ${Math.round(w)}×${Math.round(h)} (“${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 18)}”)`]);
    }
  }
  return out;
};
const viewports = [[360, 740, true], [390, 844, true], [768, 1024, true], [1024, 768, false], [1280, 860, false], [1440, 900, false]].filter(([w]) => !process.env.W || process.env.W.split(',').includes(String(w)));
const modes = ['light', 'dark', 'glass', 'minimal'].filter(m => !process.env.MODES || process.env.MODES.split(',').includes(m));
for (const mode of modes) for (const [w, h, touch] of viewports) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 700, colorScheme: mode === 'dark' ? 'dark' : 'light' });
  await ctx.addInitScript(g => { if (g) localStorage.setItem('pomodorolist-glass', g); }, mode === 'glass' ? 'full' : null);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  const tag = `${mode}/${w}`;
  p.on('pageerror', e => errs.push(`${tag}: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|firestore|WebChannel/i.test(m.text())) errs.push(`${tag} console: ${m.text().slice(0, 140)}`); });
  await p.goto('http://localhost:8000/index.html');
  await p.evaluate(seed, [LONG, mode === 'minimal']);
  await p.goto('http://localhost:8000/index.html');
  await p.waitForSelector('#appView:not(.hidden)'); await wait(2200);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); $$('.pomeo-bubble').forEach(x => x.classList.add('hidden')); });
  const record = (where, list) => { for (const [s, m] of list) { const k = `${s} — ${m.replace(/\d+(\.\.\d+)?( \/ \d+)?\)/, '…)')}`; if (!found.has(k)) found.set(k, new Set()); found.get(k).add(`${tag}:${where}`); } };
  const views = [
    ['timer', () => showTab('timer')], ['timer-running', () => { showTab('timer'); S.timer.phase = 'focus'; startTimer(); }], ['timer-after', () => { S.timer.endAt = Date.now() - 5; }],
    ['reminders', () => showTab('reminders')], ['todos', () => { showTab('reminders'); S.ui.remView = 'todos'; renderRemSeg && renderRemSeg(); renderTodos && renderTodos(); }], ['cards', () => { showTab('reminders'); S.ui.remView = 'cards'; renderRemSeg(); renderCards(); }],
    ['dlg-deck', () => { openDeckDlg ? openDeckDlg(S.decks[0].id) : $('[data-dopen]').click(); }], ['dlg-review', () => { closeReview(); startReview(S.decks[0].id); }], ['dlg-review-back', () => { if (!RV.flipped) $('#fcDlg [data-cdflip]').click(); }],
    ['quests', () => showTab('quests')],
    ['stats-week', () => { S.ui.statsView = 'week'; showTab('stats'); }], ['stats-month', () => { S.ui.statsView = 'month'; renderStats(); }], ['dlg-plan', () => { showTab('stats'); $('#planSlot [data-planedit]').click(); }],
    ['garden', () => { S.ui.gardenView = 'garden'; showTab('garden'); }], ['garden-seeds', () => { S.ui.gardenView = 'seeds'; renderGarden(); }], ['garden-decor', () => { S.ui.gardenView = 'decor'; renderGarden(); }], ['garden-almanac', () => { S.ui.gardenView = 'almanac'; renderGarden(); }],
    ['dlg-plant', () => { S.ui.gardenView = 'garden'; renderGarden(); const e = $('.gd-plot.empty, .gd-plot:not(.has)'); if (e) e.click(); else throw new Error('no empty plot'); }],
    ['dlg-plant-mut', () => { S.ui.gardenView = 'garden'; renderGarden(); openPlantDlg('p4'); }],
    ['dlg-pets', () => { showTab('garden'); openPetsDlg(); }], ['dlg-hatch', () => { showTab('garden'); showHatch(S.eggs.find(e => e.id === 'egg1')); }], ['dlg-giant', () => { showTab('garden'); showGiant(garden().harvested.find(p => p.id === 'h2')); }],
    ['bag-pets', () => { S.ui.bagCat = 'pets'; showTab('bag'); }], ['bag-avatars', () => { S.ui.bagCat = 'avatar'; showTab('bag'); }],
    ['room', () => showTab('room')], ['dlg-room-share', () => { showTab('room'); openRoomShare ? openRoomShare() : $('[data-rshare]').click(); }],
    ['board', () => showTab('board')], ['shop', () => { S.ui.shopCat = 'room'; showTab('shop'); }], ['shop-trails', () => { S.ui.shopCat = 'trail'; renderShop(); }], ['shop-themes', () => { S.ui.shopCat = 'theme'; renderShop(); }], ['shop-stamps', () => { S.ui.shopCat = 'stamp'; renderShop(); }],
    ['bag-timer', () => { S.ui.bagCat = 'timer'; showTab('bag'); }], ['bag-garden', () => { S.ui.bagCat = 'garden'; showTab('bag'); }], ['bag-room', () => { S.ui.bagCat = 'room'; showTab('bag'); }],
    ['friends', () => showTab('friends')], ['clan', () => showTab('clan')], ['profile', () => showTab('profile')], ['settings', () => showTab('settings')], ['about', () => showTab('about')],
    ['dlg-card', () => { showTab('profile'); openCardDlg(); }], ['dlg-cmd', () => openCmd()], ['dlg-keys', () => $('#keysDlg').showModal()],
  ];
  for (const [name, fn] of views.filter(([n]) => !process.env.VIEWS || process.env.VIEWS.split(',').includes(n))) {
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); if (typeof closeWrapped === 'function') closeWrapped(); if (typeof closeReview === 'function') closeReview(); });
    const res = await p.evaluate(`(() => { try { (${fn.toString()})(); return ''; } catch (e) { return e.stack.split('\\n').slice(0, 3).join(' | '); } })()`);
    if (res) { if (!(mode === 'minimal' && /garden|room|plant|pets|hatch|giant/.test(name)) && !/minimal|redirect/.test(res)) errs.push(`${tag} ${name}: ${res}`); continue; }
    await wait(name.startsWith('timer') ? 2600 : 700);
    record(name, await p.evaluate(check, touch));
    if (SHOTS) await p.screenshot({ path: `au116-${mode}-${w}-${name}.png`, fullPage: !name.startsWith('dlg') });
    if (name === 'timer-after') await p.evaluate(() => { hideNote(); finishPhase('reset'); });
  }
  await ctx.close();
}
// Leaderboard v2 (1.16): the demo account's boards (podium, rows, the pinned rank, Pomeo's empty state)
for (const mode of modes.filter(m => m !== 'minimal')) for (const [w, h, touch] of viewports) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 700, colorScheme: mode === 'dark' ? 'dark' : 'light' });
  await ctx.addInitScript(g => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); if (g) localStorage.setItem('pomodorolist-glass', g); }, mode === 'glass' ? 'full' : null);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(); const tag = `${mode}/${w}/demo`;
  p.on('pageerror', e => errs.push(`${tag}: ${e.message}`));
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)'); await p.click('#previewBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2600);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); $$('.pomeo-bubble').forEach(x => x.classList.add('hidden')); });
  const record = (where, list) => { for (const [s, m] of list) { const k = `${s} — ${m.replace(/\d+(\.\.\d+)?( \/ \d+)?\)/, '…)')}`; if (!found.has(k)) found.set(k, new Set()); found.get(k).add(`${tag}:${where}`); } };
  for (const [name, scope, period] of [['board-produce', 'friends', 'produce'], ['board-harvests-global', 'global', 'harvests'], ['board-week', 'friends', 'week'], ['board-life-global', 'global', 'life'], ['garden-looks', 'x', 'x']]) {
    await p.evaluate(([s, pe]) => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); if (s === 'x') { S.ui.gardenView = 'decor'; showTab('garden'); return; } S.ui.lbScope = s; S.ui.lbPeriod = pe; SOC.lb = {}; showTab('board'); renderBoard(); }, [scope, period]);
    await wait(1600);
    record(name, await p.evaluate(check, touch));
    if (SHOTS) await p.screenshot({ path: `au116-${mode}-${w}-${name}.png`, fullPage: true });
  }
  await ctx.close();
}
const rows = [...found.entries()].map(([k, v]) => `${k}  [${[...v].slice(0, 6).join(' ')}${v.size > 6 ? ' +' + (v.size - 6) : ''}]`).sort();
console.log(rows.join('\n'));
console.log(`\n${rows.length} distinct findings`);
console.log('errors', errs);
await b.close();
