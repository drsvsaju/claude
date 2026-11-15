// v1.12 logic tests (no cloud): boss rotation, HP/damage, rewards, inventory, loadouts, questline dates, Minimalist, motion/sound.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const PAGE = process.argv[2] || 'index.html';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let fails = 0;
const errs = [];
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
async function guest({ tz = 'Asia/Kolkata', time = null, w = 1280, seed = null, motion = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, timezoneId: tz });
  if (time) await ctx.clock.setFixedTime(new Date(time));
  await ctx.addInitScript(([seed, motion]) => {
    if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1);
    localStorage.setItem('pomodorolist-guest', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-tour-done', '1');
    localStorage.setItem('pomodorolist-seen-version', '1.12'); localStorage.setItem('pomodorolist-login-later', 'x');
    if (motion) localStorage.setItem('pomodorolist-motion', motion);
    if (seed) localStorage.setItem('focus-app-v1', JSON.stringify(seed));
  }, [seed, motion]);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(tz + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && !/Firebase failed|Could not reach|offline/i.test(m.text()))) errs.push(tz + ' ' + m.type() + ': ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/' + PAGE + '?emulator=1');
  await p.waitForSelector('#appView:not(.hidden)');
  await wait(900);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}

// ===================== 1. Boss rotation =====================
log('— Boss rotation —');
for (const tz of ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Pacific/Auckland']) {
  const G = await guest({ tz });
  const r = await G.ev(() => {
    const names = [], out = { sameWeek: true, cycle: true, distinct: true, shift: true, sundayMonday: true, dst: true, monthYear: true };
    const mon0 = new Date(2026, 0, 5);   // a Monday
    for (let w = 0; w < 130; w++) {
      const mon = addDays(mon0, 7 * w), id = bossOfWeek(mon).id;
      for (let d = 0; d < 7; d++) for (const h of [0, 12, 23]) { const t = addDays(mon, d); t.setHours(h, h === 23 ? 59 : 0, 59); if (bossOfWeek(t).id !== id) out.sameWeek = false; }
      const sunLate = addDays(mon, 6); sunLate.setHours(23, 59, 59, 999); const nextMon = addDays(mon, 7);
      if (bossOfWeek(sunLate).id !== id || bossOfWeek(nextMon).id === id) out.sundayMonday = false;
      if (bossIndexFor(nextMon) !== (bossIndexFor(mon) + 1) % 10) out.shift = false;
      if (w >= 10 && bossOfWeek(addDays(mon, -70)).id !== id) out.cycle = false;
      names.push(id);
    }
    for (let w = 0; w + 10 <= names.length; w++) if (new Set(names.slice(w, w + 10)).size !== 10) out.distinct = false;
    // month and year boundaries inside one week: Mon 28 Dec 2026 – Sun 3 Jan 2027, Mon 27 Sep – Sun 3 Oct 2027
    const y1 = new Date(2026, 11, 31, 23, 59), y2 = new Date(2027, 0, 1, 0, 1), y3 = new Date(2027, 0, 3, 23, 59), y4 = new Date(2027, 0, 4, 0, 0);
    const m1 = new Date(2027, 8, 30, 22), m2 = new Date(2027, 9, 1, 8);
    out.monthYear = bossOfWeek(y1).id === bossOfWeek(y2).id && bossOfWeek(y2).id === bossOfWeek(y3).id && bossOfWeek(y4).id !== bossOfWeek(y3).id && bossOfWeek(m1).id === bossOfWeek(m2).id;
    // daylight-saving weeks (March/November in the US, March/October in Europe, April/September in NZ)
    for (const [y, m, d] of [[2026, 2, 8], [2026, 10, 1], [2026, 2, 29], [2026, 9, 25], [2026, 3, 5], [2026, 8, 27]]) {
      const t = new Date(y, m, d, 12), mon = weekMonday(t);
      if (bossOfWeek(t).id !== bossOfWeek(mon).id || bossIndexFor(addDays(mon, 7)) !== (bossIndexFor(mon) + 1) % 10) out.dst = false;
    }
    out.thisWeek = bossOfWeek(new Date(2026, 9, 22)).name;
    out.count = BOSSES.length;
    return out;
  });
  check(`${tz}: every day Mon 00:00 – Sun 23:59 has the same boss; Monday 00:00 brings the next one`, r.sameWeek && r.sundayMonday && r.shift);
  check(`${tz}: fixed 10-week cycle, 10 different bosses in any 10 weeks`, r.cycle && r.distinct && r.count === 10);
  check(`${tz}: month/year boundaries and daylight-saving weeks`, r.monthYear && r.dst);
  if (tz === 'Asia/Kolkata') check('week of 19–25 Oct 2026 keeps the boss it had before the update (Sleepy Sloth)', r.thisWeek === 'Sleepy Sloth', r.thisWeek);
  await G.ctx.close();
}
// local time zone decides the week: the same instant is Sunday night in New York and Monday morning in Kolkata
{
  const instant = '2026-10-26T02:30:00Z';   // Sun 25 Oct 22:30 New York · Mon 26 Oct 08:00 Kolkata
  const A = await guest({ tz: 'America/New_York', time: instant }), B = await guest({ tz: 'Asia/Kolkata', time: instant });
  const a = await A.ev(() => [dayKey(weekMonday()), bossOfWeek().id]), c = await B.ev(() => [dayKey(weekMonday()), bossOfWeek().id]);
  check('the user’s local time zone decides the week (same moment: Sunday in New York, Monday in Kolkata)', a[0] === '2026-10-19' && c[0] === '2026-10-26' && a[1] !== c[1], JSON.stringify([a, c]));
  await A.ctx.close(); await B.ctx.close();
}

// ===================== 2. HP and damage (Solo) =====================
log('— HP and damage —');
{
  const G = await guest({ time: '2026-10-22T12:00:00+05:30' });
  const r = await G.ev(() => {
    const mk = (id, d, h, min) => { const st = new Date(d); st.setHours(h, 0, 0, 0); return { id, name: 'Physics', start: +st, end: +st + min * 6e4, duration: min * 6e4, planned: min * 6e4 }; };
    S.sessions = [mk('prevSun', new Date(2026, 9, 18), 22, 45), mk('mon', new Date(2026, 9, 19), 9, 50), mk('tue', new Date(2026, 9, 20), 9, 25), mk('wed', new Date(2026, 9, 21), 20, 60)];
    S.settings.goalMin = 60; G = null; save();
    const a = bossBattle('solo');
    S.settings.goalMin = 120; G = null;
    const b = bossBattle('solo');
    S.settings.goalMin = 15; G = null;
    const c = bossBattle('solo');
    S.settings.goalMin = 60; G = null; save();
    return { hp60: a.hp, dmg: a.dmg, hp120: b.hp, hp15: c.hp, coins: a.coins, phase: a.phase, squadFormed: bossBattle('squad').formed, tierHP: BOSS_HP[bossOfWeek().id] };
  });
  // v1.13.1: each boss has a fixed HP; the week the update arrives only ever gets easier (the lower of 5 × goal and the boss's HP)
  check('This week’s Solo HP is the lower of the old goal-based HP and the boss’s fixed HP (60 min → 300, 120 min → its tier HP, minimum 100)', r.hp60 === Math.min(300, r.tierHP) && r.hp120 === Math.min(600, r.tierHP) && r.hp15 === 100, JSON.stringify(r));
  check('Solo damage = this week’s focus minutes only (last Sunday’s session not counted)', r.dmg === 135, `dmg ${r.dmg}`);
  check('Squad needs at least one friend (no squad victory alone)', r.squadFormed === false);
  // phases
  const ph = await G.ev(() => { const out = [], keep = S.sessions; S.sessions = []; for (const m of [100, 160, 271]) { S.sessions.push({ id: 'x' + m, name: 'P', start: Date.now() - 4 * 3600e3, end: Date.now() - 3.5 * 3600e3, duration: m * 6e4, planned: m * 6e4 }); G = null; out.push(bossBattle('solo').phase); S.sessions.pop(); } S.sessions = keep; G = null; return out; });
  check('Boss phases: calm, angry at ≤50% HP, “almost defeated” at ≤10%', ph.join() === 'calm,angry,almost', ph.join());
  await G.ev(() => showTab('quests')); await wait(1300);
  const ui = await G.ev(() => ({ hp: $('.hp-row strong').textContent, art: $('#bossArt').className, log: $$('.blog li').length, hall: $$('.hall-card').length, next: $('.nb-name').textContent }));
  check('Arena shows HP, battle log (3 hits this week), next week’s boss and a 10-card Trophy Hall', ui.hp === '165' && ui.log === 3 && ui.hall === 10 && ui.next === 'Deadline Hydra', JSON.stringify(ui));
  await G.ctx.close();
}

// ===================== 3. Rewards: once, Solo vs Squad, re-defeat, Mastered =====================
log('— Rewards —');
{
  const G = await guest({ time: '2026-10-22T12:00:00+05:30' });
  const r = await G.ev(async () => {
    const st = new Date(2026, 9, 20, 9);
    S.sessions = [{ id: 'big', name: 'P', start: +st, end: +st + 320 * 6e4, duration: 320 * 6e4, planned: 320 * 6e4 }];
    G = null; save();
    const bal0 = game().balance;
    const won = checkBoss();
    const again = checkBoss();
    const v = victoryOf('2026-10-19', 'solo');
    const bal1 = game().balance;
    const pend = pendingBossRewards().map(p => p.boss.id + '|' + p.mode);
    await Promise.all([claimBossRewards('sloth', 'solo'), claimBossRewards('sloth', 'solo')]);
    await claimBossRewards('sloth', 'solo');
    const grants = Object.keys(S.game.grants), brew = Object.keys(S.game.claims.brew);
    return { won, again, coins: bal1 - bal0, vcoins: v && v.coins, pend, grants, brew, pendAfter: pendingBossRewards().length, owned: ['th_b_sloth', 'au_b_sloth'].every(isOwned), squadOwned: isOwned('col_b_sloth') };
  });
  check('Victory recorded once (second check does nothing) and pays its coins', r.won === true && r.again === false && r.coins === r.vcoins && r.coins > 0, JSON.stringify({ won: r.won, again: r.again, coins: r.coins }));
  check('Solo victory unlocks the Solo rewards (theme + aura), not the Squad ones', r.pend.join() === 'sloth|solo' && r.owned && !r.squadOwned);
  check('Rewards claimed exactly once even when “Claim” is tapped three times', r.grants.length === 3 && r.brew.length === 1 && r.pendAfter === 0, JSON.stringify({ grants: r.grants, brew: r.brew }));
  // returning boss 10 weeks later: coins + a star, no duplicate items; Mastered only for Solo+Squad in the same week
  const r2 = await G.ev(() => {
    const wkNow = '2026-10-19', wkOld = dayKey(addDays(parseDay(wkNow), -70));
    S.game.claims.bosses[wkOld + '|squad'] = Date.now() - 70 * 864e5; S.game.trophies[wkOld + '|squad'] = { boss: 'sloth', mode: 'squad', hp: 780, coins: 50, size: 3, at: Date.now() - 70 * 864e5 };
    S.game.claims.brew['sloth|squad'] = Date.now() - 69 * 864e5; for (const id of ['col_b_sloth', 'au_b_sloth_sq']) S.game.grants[id] = { src: 'boss:sloth:squad', at: Date.now() - 69 * 864e5 };
    G = null;
    const rec1 = bossRecord('sloth');
    const items1 = Object.keys(S.game.grants).length;
    // same-week Squad victory too → Mastered
    S.game.claims.bosses[wkNow + '|squad'] = Date.now(); S.game.trophies[wkNow + '|squad'] = { boss: 'sloth', mode: 'squad', hp: 780, coins: 60, size: 3, at: Date.now() };
    G = null;
    const rec2 = bossRecord('sloth');
    return { rec1, rec2, items1, items2: Object.keys(S.game.grants).length, pend: pendingBossRewards().length, starsHall: (renderQuests(), 0) };
  });
  check('Returning boss: a second victory adds a star (2 wins), no duplicate items, nothing new to claim', r2.rec1.wins === 2 && r2.items1 === 5 && r2.items2 === 5 && r2.pend === 0, JSON.stringify(r2.rec1));
  check('“Mastered” only when Solo and Squad are won in the same week', r2.rec1.mastered === false && r2.rec2.mastered === true && r2.rec2.wins === 3);
  await G.ev(() => showTab('quests')); await wait(800);
  const hall = await G.ev(() => { const c = [...$$('.hall-card')].find(x => x.title.startsWith('Sleepy Sloth')); return { won: c.classList.contains('won'), mastered: !!c.querySelector('.mastered-badge.on'), stars: (c.querySelector('.stars') || {}).textContent }; });
  check('Trophy Hall: Sloth in colour with ★★★ and the Mastered badge; others are silhouettes', hall.won && hall.mastered && hall.stars === '★★★', JSON.stringify(hall));
  // legacy victory (saved by v1.11 under the bare week key) still counts in its mode and unlocks its rewards
  const r3 = await G.ev(() => {
    const wk = '2026-10-05', b = bossOfWeek(parseDay(wk));
    S.game.claims.bosses[wk] = Date.now() - 15 * 864e5; S.game.trophies[wk] = { boss: b.id, mode: 'squad', hp: 900, coins: 70, size: 2, at: Date.now() - 15 * 864e5 };
    G = null;
    return { solo: !!victoryOf(wk, 'solo'), squad: !!victoryOf(wk, 'squad'), pend: pendingBossRewards().map(p => p.boss.id + '|' + p.mode), b: b.id };
  });
  check('A victory saved before this update counts as its own mode and its rewards become claimable', !r3.solo && r3.squad && r3.pend.includes(r3.b + '|squad'), JSON.stringify(r3));
  await G.ctx.close();
}

// ===================== 4. Inventory =====================
log('— Inventory —');
{
  const G = await guest();
  await G.ev(() => showTab('bag')); await wait(500);
  check('A new account’s bag lists its starter seeds and the first egg (1.16) rather than the empty state', await G.ev(() => !$('.bag-empty') && $$('#bagList .gd-item').length >= 1));
  await G.ev(() => { S.gbuys = []; S.eggs = []; GD = null; G = null; renderBag(); }); await wait(300);   // nothing at all: the empty state
  check('Empty bag (nothing at all): Pomeo with an empty bag and a rotating tip', await G.ev(() => !!$('.bag-empty .pscene') && /Shop|boss|questline|squad|daily/.test($('#bagTip').textContent)));
  const tip1 = await G.ev(() => $('#bagTip').textContent); await wait(4700);
  check('… the tip line rotates', (await G.ev(() => $('#bagTip').textContent)) !== tip1);
  // items bought before this update (every shop category), a daily-reward gift, and rewards of every kind
  const r = await G.ev(() => {
    S.sessions = Array.from({ length: 700 }, (_, i) => ({ id: 'h' + i, name: 'P', start: Date.now() - (i + 1) * 3 * 3600e3, end: Date.now() - (i + 1) * 3 * 3600e3 + 50 * 6e4, duration: 50 * 6e4, planned: 50 * 6e4 }));
    S.sessions.sort((a, b) => a.start - b.start);
    const buy = ['th_forest', 'av_fox', 'hat_party', 'acc_glasses', 'snd_bell', 'amb_rain', 'ring_glow', 'font_mono', 'fx_confetti', 'frame_hex', 'col_rose', 'x_zen', 'freeze'];
    buy.forEach((id, i) => { S.game.purchases['b' + i] = { item: id, price: ITEM_BY_ID[id].price, at: Date.now() - 5 * 864e5 + i }; });
    S.game.purchases.gift = { item: 'av_frog', price: 0, at: Date.now() - 4 * 864e5, gift: true };
    grantItems(['th_b_dragon', 'au_b_dragon', 'col_b_hydra', 'au_b_hydra_sq'], 'boss:dragon:solo', Date.now() - 3 * 864e5);
    grantItems(['av_bat', 'ti_ghost', 'skin_pumpkin', 'ring_candle', 'snd_boo', 'frame_cobweb', 'au_ev_hw26', 'th_ev_hw26', 'col_ev_hw26', 'skin_lantern', 'acc_umbrella', 'fx_ev_mon26', 'hat_santa'], 'ev:hw26', Date.now() - 2 * 864e5);
    S.game.seenAt = Date.now() - 2.5 * 864e5;
    G = null; save();
    const items = bagItems(), byCat = {};
    for (const c of BAG_CATS) byCat[c[0]] = items.filter(x => c[0] === 'event' ? x.src.kind === 'event' : c[2].includes(x.it.cat)).map(x => x.it.id);
    return { n: items.length, byCat, src: Object.fromEntries(items.map(x => [x.it.id, x.src.label])), freezes: game().freezesHeld };
  });
  const expect = { theme: ['th_forest', 'th_b_dragon', 'th_ev_hw26'], avatar: ['av_fox', 'av_frog', 'av_bat'], pomeo: ['hat_party', 'acc_glasses', 'skin_pumpkin', 'skin_lantern', 'acc_umbrella', 'hat_santa'], aura: ['au_b_dragon', 'au_b_hydra_sq', 'au_ev_hw26'],
    color: ['col_rose', 'col_b_hydra', 'col_ev_hw26'], title: ['ti_ghost'], sound: ['snd_bell', 'amb_rain', 'snd_boo'], timer: ['ring_glow', 'x_zen', 'ring_candle'], font: ['font_mono'], effect: ['fx_confetti', 'fx_ev_mon26'], frame: ['frame_hex', 'frame_cobweb'] };
  const bad = Object.entries(expect).filter(([c, ids]) => ids.some(id => !r.byCat[c].includes(id)) || r.byCat[c].length !== ids.length);
  check('Every owned item is in the right category (incl. items bought before this update)', !bad.length, bad.map(([c]) => c + ': ' + r.byCat[c].join(',')).join(' | '));
  check('Sources: Shop / Daily reward / Boss: … (Solo) / October Questline', r.src.th_forest === 'Shop' && r.src.av_frog === 'Daily reward' && r.src.th_b_dragon === 'Boss: Procrastination Dragon (Solo)' && r.src.av_bat === 'October Questline', JSON.stringify([r.src.th_forest, r.src.av_frog, r.src.th_b_dragon, r.src.av_bat]));
  check('Event items category lists every questline item; Streak Freeze shows as a consumable', r.byCat.event.length === 13 && r.freezes === 1);
  await G.ev(() => { showTab('timer'); showTab('bag'); }); await wait(500);
  const ui = await G.ev(() => ({ newTags: $$('.bag-item .tag.new').length, sections: $$('.bag-sec').length, dotAfter: !$('#bagDot').classList.contains('hidden'), trophies: $$('.bag-trophy').length, cons: $$('.bag-sec h2').map(h => h.textContent).some(t => t.startsWith('Consumables')) }));
  check('“New” tags on items got since the bag was last opened; the header dot clears once it’s opened', ui.newTags === 13 && !ui.dotAfter, JSON.stringify(ui));
  // search and filters
  const f = await G.ev(() => {
    const n = sel => { $(sel).click(); return $$('#bagList .bag-item[data-bid]').length; };
    const out = { boss: n('[data-bfilter="boss"]'), event: n('[data-bfilter="event"]'), shop: n('[data-bfilter="shop"]'), all: n('[data-bfilter="all"]') };
    const s = $('#bagSearch'); s.value = 'pumpkin'; s.dispatchEvent(new Event('input', { bubbles: true }));
    out.search = $$('#bagList .bag-item[data-bid]').map(x => x.dataset.bid).join(',');
    s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true }));
    $('[data-bcat="aura"]').click(); out.auraCat = $$('#bagList .bag-item[data-bid]').map(x => x.dataset.bid).join(',');
    $('[data-bcat="all"]').click();
    return out;
  });
  check('Filters (Bosses 4, Events 13, Shop 12) and search (“pumpkin”)', f.boss === 4 && f.event === 13 && f.shop === 12 && f.search === 'th_ev_hw26,skin_pumpkin', JSON.stringify(f));
  check('Aura choice: “Streak aura (automatic)” plus every special aura owned', f.auraCat === 'au_streak,au_b_dragon,au_b_hydra_sq,au_ev_hw26', f.auraCat);
  // equip / unequip every type and see it applied
  const eq = await G.ev(() => {
    const res = {}, root = document.documentElement;
    const run = (id, test) => { bagEquip(id); const on = test(); bagUnequip(ITEM_BY_ID[id].cat); const off = !test(); res[id] = on && off; };
    run('th_b_dragon', () => getComputedStyle(root).getPropertyValue('--accent').trim().toLowerCase() === (systemDark() ? '#f2803f' : '#c94a26'));
    run('au_b_hydra_sq', () => !!$('#lvChip .aura-x-au_b_hydra_sq.aura-spin.aura-shim'));
    run('col_b_hydra', () => !!$('#lvChip .uname.ncg.nc-col_b_hydra'));
    run('col_rose', () => $('#lvChip .uname').style.color !== '');
    run('av_bat', () => $('#lvChip').innerHTML.includes('#6b5a92'));
    run('frame_cobweb', () => $('#lvChip').innerHTML.includes('#9a92b0'));
    run('ti_ghost', () => $('#lvChip').title.startsWith('Ghost Scholar'));
    run('skin_lantern', () => $('#mascot').dataset.skin === 'lantern');
    run('hat_santa', () => $('#mascot').innerHTML.includes('#d64545'));
    run('acc_umbrella', () => $('#mascot').innerHTML.includes('#3a7ca5'));
    run('ring_candle', () => $('#ring').classList.contains('rs-ev') && $('#ring').classList.contains('rs-candle'));
    run('ring_glow', () => $('#ring').classList.contains('rs-glow'));
    run('font_mono', () => root.style.getPropertyValue('--timer-font').includes('JetBrains'));
    run('snd_boo', () => equippedId('sound') === 'snd_boo');
    run('amb_rain', () => equippedId('ambient') === 'amb_rain');
    run('fx_ev_mon26', () => equippedId('effect') === 'fx_ev_mon26');
    toggleExtra('x_zen'); const z1 = extraOn('x_zen'); toggleExtra('x_zen'); res.x_zen = z1 && !extraOn('x_zen');
    return res;
  });
  const badEq = Object.entries(eq).filter(([, v]) => !v).map(([k]) => k);
  check('Equip / unequip works for every type (theme, aura, name colours, picture, frame, title, Pomeo skin/hat/accessory, ring, font, sounds, effect, extras)', !badEq.length, badEq.join(', '));
  // live preview: selecting a theme previews it on the whole app without equipping; leaving the bag restores it
  const pv = await G.ev(async () => {
    showTab('bag');
    const before = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    $('.bag-item[data-bid="th_ev_hw26"]').click();
    const during = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(), look = $('#bagLook').textContent;
    showTab('timer');
    const after = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    return { changed: before !== during, restored: after === before, eq: equippedId('theme'), look: look.includes('Previewing') };
  });
  check('Live preview: selecting a theme previews it everywhere without equipping; leaving the bag restores your theme', pv.changed && pv.restored && pv.eq === 'th_default' && pv.look, JSON.stringify(pv));
  // loadouts
  const lo = await G.ev(() => {
    showTab('bag');
    for (const id of ['th_b_dragon', 'au_b_hydra_sq', 'col_b_hydra', 'av_bat', 'skin_pumpkin', 'hat_santa', 'ti_ghost']) bagEquip(id);
    $('#loNew').click(); $('#loName').value = 'Spooky dragon'; $('#loForm').requestSubmit();
    for (const c of ['theme', 'aura', 'color', 'avatar', 'pomskin', 'pomhat', 'title']) bagUnequip(c);
    const plain = LOOK_CATS.map(c => equippedId(c)).join();
    applyLoadout(S.loadouts[0].id);
    const look = LOOK_CATS.map(c => equippedId(c));
    return { n: S.loadouts.length, plain, look, cur: !!$('.lo.cur') };
  });
  check('Loadouts save and re-apply a full look in one tap (theme, aura, name colour, picture, Pomeo outfit, title)', lo.n === 1 && lo.look.join() === 'th_b_dragon,au_b_hydra_sq,col_b_hydra,av_bat,hat_santa,acc_none,skin_pumpkin,ti_ghost,frame_none' && lo.cur, JSON.stringify(lo.look));
  await G.ctx.close();
}

// ===================== 5. Questline dates =====================
log('— Questline —');
{
  const at = async (time, f, tz = 'Asia/Kolkata') => { const G = await guest({ time, tz }); const r = await G.ev(f); await G.ctx.close(); return r; };
  const cur = () => (currentEvent() || {}).id || null;
  check('Halloween starts 1 Oct 00:00 (nothing on 30 Sep 23:59)', (await at('2026-09-30T23:59:00+05:30', cur)) === null && (await at('2026-10-01T00:00:00+05:30', cur)) === 'hw26');
  check('Halloween runs until 7 Nov 23:59; Monsoon Study starts 8 Nov 00:00', (await at('2026-11-07T23:59:30+05:30', cur)) === 'hw26' && (await at('2026-11-08T00:00:00+05:30', cur)) === 'mon26');
  check('Later switches: 31 Dec → Christmas, 1 Jan → New Year; April–May one event; 30 Sep 2027 → Rainbow, then none',
    (await at('2026-12-31T23:59:00+05:30', cur)) === 'xm26' && (await at('2027-01-01T00:00:00+05:30', cur)) === 'ny27' && (await at('2027-04-15T12:00:00+05:30', cur)) === 'su27'
    && (await at('2027-05-31T12:00:00+05:30', cur)) === 'su27' && (await at('2027-09-30T23:00:00+05:30', cur)) === 'rn27d' && (await at('2027-10-01T00:00:00+05:30', cur)) === null);
  check('Event dates follow the local time zone (New York: still Halloween at 7 Nov 23:30 local)', (await at('2026-11-08T04:30:00Z', cur, 'America/New_York')) === 'hw26');
  // progress counts from 1 October only, and only until 7 November
  const G = await guest({ time: '2026-10-22T12:00:00+05:30' });
  const pr = await G.ev(() => {
    const mk = (id, y, m, d, h, min) => { const st = new Date(y, m, d, h); return { id, name: 'Physics', start: +st, end: +st + min * 6e4, duration: min * 6e4, planned: min * 6e4 }; };
    S.sessions = [mk('sep30', 2026, 8, 30, 22, 120), mk('oct1', 2026, 9, 1, 21, 60), mk('oct2', 2026, 9, 2, 9, 30), mk('nov8', 2026, 10, 8, 9, 60)];
    S.parked = [{ id: 'pk1', text: 'a', at: +new Date(2026, 8, 29), done: false }, { id: 'pk2', text: 'b', at: +new Date(2026, 9, 3), done: false }];
    S.game.plog = { pk3: +new Date(2026, 9, 5), pk1: +new Date(2026, 8, 29) };
    G = null; save();
    const m = eventMetrics(EVENT_BY_ID.hw26);
    return { hours: m.hours, sessions: m.sessions, night: m.nightDays, parked: m.parked, focus: m.bossDays };
  });
  check('Progress counts from 1 Oct (a 30 Sep session doesn’t count, nor one after 7 Nov)', pr.sessions === 2 && Math.abs(pr.hours - 1.5) < 1e-9 && pr.night === 1 && pr.focus === 2, JSON.stringify(pr));
  check('Parked thoughts count even after being cleared (kept in game.plog), only inside the event', pr.parked === 2, `parked ${pr.parked}`);
  // claims work once
  const cl = await G.ev(async () => {
    S.sessions = Array.from({ length: 45 }, (_, i) => { const st = new Date(2026, 9, 1 + (i % 21), 21, 15); return { id: 'q' + i, name: 'P' + (i % 5), start: +st, end: +st + 70 * 6e4, duration: 70 * 6e4, planned: 70 * 6e4 }; });
    S.settings.goalMin = 60; G = null; save();
    const st = questState(EVENT_BY_ID.hw26);
    const doneIds = st.qs.filter(q => q.done).map(q => q.id);
    await Promise.all([claimQuest('hw26', 'q3'), claimQuest('hw26', 'q3')]);
    await claimQuest('hw26', 'q3');
    const g1 = Object.keys(S.game.grants);
    await claimQuest('hw26', 'q1');   // not done (no friends): refused
    return { doneIds, claims: Object.keys(S.game.claims.quests), grants: g1, notDone: !S.game.claims.quests['hw26:q1'], dlg: $('#rewardDlg').open };
  });
  check('A completed quest is claimed exactly once (three taps), with a reward reveal; unfinished quests can’t be claimed', cl.claims.join() === 'hw26:q3' && cl.grants.join() === 'ring_candle' && cl.notDone && cl.dlg, JSON.stringify(cl));
  await G.ctx.close();
  // after the end: claims refused, Past events shows missed rewards greyed out
  const P = await guest({ time: '2026-11-10T10:00:00+05:30', seed: null });
  const past = await P.ev(async () => {
    S.sessions = Array.from({ length: 45 }, (_, i) => { const st = new Date(2026, 9, 1 + (i % 21), 21, 15); return { id: 'q' + i, name: 'P', start: +st, end: +st + 70 * 6e4, duration: 70 * 6e4, planned: 70 * 6e4 }; });
    S.game.claims.quests['hw26:q3'] = +new Date(2026, 9, 20); S.game.grants.ring_candle = { src: 'ev:hw26', at: +new Date(2026, 9, 20) };
    G = null; save();
    await claimQuest('hw26', 'q2');
    S.ui.questView = 'quest'; showTab('quests');
    return { late: !S.game.claims.quests['hw26:q2'], cur: currentEvent().id, missed: $$('.pe .mi.missed').length, got: $$('.pe .mi:not(.missed)').length, hdr: ($('.pe-h') || {}).textContent };
  });
  check('After 7 Nov: claims are refused; “Past events” shows Halloween with 1 collected and 9 missed (greyed out)', past.late && past.cur === 'mon26' && past.missed === 9 && past.got === 1, JSON.stringify(past));
  await P.ctx.close();
}

// ===================== 6. True Minimalist, animations, sound =====================
log('— Minimalist / motion / sound —');
{
  const G = await guest({ time: '2026-10-22T12:00:00+05:30' });
  await G.ev(() => { grantItems(['au_b_dragon', 'col_b_dragon'], 'boss:dragon:solo', Date.now()); S.game.equipped.aura = 'au_b_dragon'; S.game.equipped.color = 'col_b_dragon'; S.game.seenAt = 1; save(); renderAll(); });
  const on = await G.ev(() => ({ bag: !$('#bagBtn').classList.contains('hidden'), deco: !!$('#brandDeco'), banner: !!$('#eventSlot .ev-banner'), quests: !$('#questTabBtn').classList.contains('hidden') }));
  check('Gamified mode shows the bag button, event decoration, event banner and Quests', on.bag && on.deco && on.banner && on.quests, JSON.stringify(on));
  const mn = await G.ev(() => {
    setMinimal(true);
    showTab('bag'); const t1 = S.ui.tab; showTab('quests'); const t2 = S.ui.tab;
    showTab('profile');
    const vis = el => !!el && !!el.getClientRects().length && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
    return { tabs: [t1, t2], bag: vis($('#bagBtn')), deco: vis($('#brandDeco')), banner: vis($('#eventSlot .ev-banner')), qdot: vis($('#questDot')), aura: [...document.querySelectorAll('.aura')].some(vis), grad: [...document.querySelectorAll('.ncg')].some(vis), quests: vis($('#questTabBtn')), festiveRow: (showTab('settings'), vis($('#festiveRow'))) };
  });
  check('True Minimalist hides every new gamified element (bag, Quests, event banner + decoration, dots, special aura, gradient names, festive setting)', mn.tabs.join() === 'timer,timer' && !mn.bag && !mn.deco && !mn.banner && !mn.qdot && !mn.aura && !mn.grad && !mn.quests && !mn.festiveRow, JSON.stringify(mn));
  await G.ev(() => { setMinimal(false); S.settings.festive = false; save(); renderAll(); });
  check('Festive decorations off: no header decoration, no banner', await G.ev(() => !$('#brandDeco') && !$('#eventSlot .ev-banner')));
  await G.ctx.close();
  for (const mo of ['off', 'reduced']) {
    const M = await guest({ time: '2026-10-22T12:00:00+05:30', motion: mo });
    const r = await M.ev(async () => {
      grantItems(['au_b_hydra_sq', 'col_b_hydra', 'skin_lantern', 'ring_candle'], 'boss:hydra:squad', Date.now());
      Object.assign(S.game.equipped, { aura: 'au_b_hydra_sq', color: 'col_b_hydra', pomskin: 'skin_lantern', ring: 'ring_candle' });
      const st = new Date(2026, 9, 20, 9); S.sessions = [{ id: 'a', name: 'P', start: +st, end: +st + 200 * 6e4, duration: 200 * 6e4, planned: 200 * 6e4 }];
      G = null; save(); applyCosmetics(); renderAll();
      showTab('quests'); await new Promise(r => setTimeout(r, 900));
      const moving = document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#questBody, #lvChip, #pomeoHost, #ring, #brandDeco'));
      const kinds = moving.map(a => (a.animationName || a.transitionProperty || '?'));
      return { n: moving.length, kinds: [...new Set(kinds)], shots: $$('.shot').length };
    });
    if (mo === 'off') check('Animations Off: nothing moves on the boss arena, aura, name colour, Pomeo or ring', r.n === 0, JSON.stringify(r));
    else check('Animations Reduced: no movement (no idle bob, tomato throw, spinning aura or flicker) — fades only', !r.kinds.some(k => /bossIdle|pomeoAtk|shot|auraSpin|lanternFlicker|candleGlow|ncShift|bossTremble|decoBob/.test(k)) && r.shots === 0, JSON.stringify(r));
    await M.ctx.close();
  }
  // sound off: no reward or victory sound
  const Sd = await guest({ time: '2026-10-22T12:00:00+05:30' });
  const snd = await Sd.ev(() => {
    S.settings.sound = false; save();
    let made = 0; const orig = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { made++; return orig.call(this); };
    showRewardReveal({ kicker: 'x', title: 'y', items: ['th_b_dragon'] }); playTierChord(); uiSound('reward', { always: true });
    return made;
  });
  check('Sound off: claiming rewards plays no sound', snd === 0, `oscillators ${snd}`);
  await Sd.ctx.close();
}
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
