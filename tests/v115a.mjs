// v1.15 Garden (guest / single device): migration from the old session-derived garden (fair, idempotent), planting,
// watering (shared vs. one plant first), every stage, harvest + produce, seed and decor shops, bag section, mutations
// (deterministic, never re-rolled, Crystal rarest), visitors, weather/season, wilting + revival, levels/plots, almanac,
// questline/card/Wrapped integration, True Minimalist, navigation + shortcut, export/import (incl. a 1.14 backup),
// the demo preview (sample garden, nothing written) and phone layout.
import { b, wait, log, check, errs, failCount } from './cl-common.mjs';
const legacy = () => { const now = Date.now(), sessions = []; for (let d = 1; d <= 30; d++) for (let k = 0; k < 2; k++) { const st = now - d * 864e5 + (9 + k * 3) * 3600e3, mins = [25, 50, 95][(d + k) % 3]; sessions.push({ id: 's' + d + '_' + k, name: ['Physics', 'Maths'][k], start: st, end: st + mins * 60000, duration: mins * 60000, planned: mins * 60000, preset: 'Classic 25/5' }); } return sessions; };
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(o => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1');
    if (o.state) localStorage.setItem('focus-app-v1', JSON.stringify(o.state)); }, { state: opts.state || null });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('guest: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('guest console: ' + m.text()); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2400); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
const focusMin = async (d, m) => { await d.ev(m => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = m * 60000; t.focusStartedAt = Date.now() - m * 60000; t.endAt = Date.now() - 1; tick(); }, m); await wait(1000); await closeAll(d); };

// ---------- 1. migration from the old garden ----------
const G = await guest(1280, { state: { sessions: legacy() } });
// (v1.18: the history also completes this month's track steps and weekly quests — set those grants aside so the migration is checked on its own; their claims stay, so nothing is given again)
await G.ev(() => { S.gbuys = S.gbuys.filter(b => !/^(wq|wqs|tr|trs)_/.test(b.id)); S.eggs = (S.eggs || []).filter(e => !/^egg_tr_/.test(e.id)); GD = null; save(); });
const m1 = await G.ev(() => ({ mig: gardenMig(), st: gardenStats(gardenItems(0, Infinity)), g: { level: garden().level, plots: garden().plots, produce: garden().produce, xp: garden().xp, seeds: Object.fromEntries(Object.entries(garden().seeds).map(([k, v]) => [k, v.length])) } }));
check('Old plants become history: one summary record with the grown / golden / ripe counts of every past session', m1.mig && m1.mig.sum === 1 && m1.mig.v === 1 && m1.mig.grown === m1.st.grown && m1.mig.golden === m1.st.golden && m1.mig.grown === 60, JSON.stringify(m1));
check('…a little starting produce (capped at 80) and a fair garden level (60 plants, 20 golden → 660 XP = level 3, 8 plots), no windfall', m1.mig.y === 80 && m1.mig.xp === 660 && m1.g.level === 3 && m1.g.plots === 8 && m1.g.produce === 80, JSON.stringify(m1.g));
check('…free starter seeds: 2 tomato + 1 sunflower', m1.g.seeds.tomato === 2 && m1.g.seeds.sunflower === 1, JSON.stringify(m1.g.seeds));
const again = await G.ev(() => { const n = S.plants.length, s = S.gbuys.length; const r = gardenMigrate(); reconcileRewards('quiet'); return { r, same: S.plants.length === n && S.gbuys.length === s, migs: S.plants.filter(p => p.id === 'mig1').length }; });
check('Migration is idempotent: running it again (and another reconcile) adds nothing', again.r === false && again.same && again.migs === 1, JSON.stringify(again));
await G.p.reload(); await G.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await G.ev(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
await G.ev(() => { S.gbuys = S.gbuys.filter(b => !/^(wq|wqs|tr|trs)_/.test(b.id)); S.eggs = (S.eggs || []).filter(e => !/^egg_tr_/.test(e.id)); GD = null; save(); });   // (the v1.18 grants set aside again: the reload merged them back)
check('…and after a reload there is still exactly one summary and one set of starter seeds', await G.ev(() => S.plants.filter(p => p.id === 'mig1').length === 1 && S.gbuys.filter(b => /^st[123]$/.test(b.id)).length === 3 && garden().produce === 80));
// ---------- 2. navigation ----------
const nav = await G.ev(() => ({ btn: !!$('#tabs [data-tab="garden"]:not(.hidden)'), group: $('#tabs [data-tab="garden"]').closest('.nv-grp').querySelector('.nv-h').textContent, label: NAV_LABEL.garden, tour: tourSteps().some(s => s.tab === 'garden'), tip: !!TIPS.garden, keys: $('#keysDlg').textContent.includes('Garden'), cmd: cmdList('').some(c => c.t === 'Garden') }));
check('Garden tab in the sidebar under Progress, in the tour, the tips, the ? sheet and the command palette', nav.btn && nav.group === 'Progress' && nav.label === 'Garden' && nav.tour && nav.tip && nav.keys && nav.cmd, JSON.stringify(nav));
await G.ev(() => { showTab('timer'); document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (document.activeElement) document.activeElement.blur(); }); await wait(300); await G.p.keyboard.press('Digit0'); await wait(400);
check('Keyboard shortcut 0 opens the Garden (1–9 are taken)', await G.ev(() => S.ui.tab === 'garden' && !!$('#gdScene')));
const scene = await G.ev(() => ({ plots: $$('.gd-plot').length, locked: $$('.gd-plot.locked').length, tod: $('#gdScene').dataset.tod, wx: $('#gdScene').dataset.wx, season: $('#gdScene').dataset.season, pomeo: !!$('#gdPomeo .mascot'), head: $('.gd-level').textContent.includes('Garden level 3'), seg: $$('#gardenSeg button').map(b => b.textContent).join() }));
check('Scene: 16 plots with 8 locked at level 3, sky with time of day / weather / season, Pomeo, level header, four views', scene.plots === 16 && scene.locked === 8 && ['sunrise', 'day', 'sunset', 'night'].includes(scene.tod) && ['clear', 'cloudy', 'rain'].includes(scene.wx) && scene.pomeo && scene.head && scene.seg === 'Garden,Harvests,Seeds,Decor,Almanac', JSON.stringify(scene));
// ---------- 3. planting ----------
await closeAll(G); await G.p.click('.gd-plot[data-plot="0"]'); await wait(300);
check('Tapping an empty plot opens the seed picker with the seeds you hold', await G.ev(() => $('#gdDlg').open && $$('#gdDlg [data-gplant]').length === 2 && $('#gdDlg').textContent.includes('Tomato')));
await G.p.click('#gdDlg [data-gplant="tomato"]'); await wait(400);
const pl = await G.ev(() => ({ n: garden().growing.length, plot0: garden().byPlot[0] && garden().byPlot[0].sp, seeds: garden().seeds.tomato.length, seedUsed: garden().growing[0].seed, has: $$('.gd-plot.has').length, sk: garden().growing[0].sk, v: garden().growing[0].v }));
check('Planted a tomato in plot 1: one seed consumed, the plant records the seed, the streak and a version', pl.n === 1 && pl.plot0 === 'tomato' && pl.seeds === 1 && /^st/.test(pl.seedUsed) && pl.has === 1 && typeof pl.sk === 'number' && pl.v === 1, JSON.stringify(pl));
const refused = await G.ev(() => [gardenPlant(0, 'tomato'), gardenPlant(9, 'tomato'), gardenPlant(1, 'lotus'), gardenPlant(1, 'tomato'), gardenPlant(2, 'sunflower'), gardenPlant(3, 'tomato')]);
check('Refused: an occupied plot, a locked plot, a seed you don’t hold, and a species with no seeds left; two more plantings fine', refused.join() === 'false,false,false,true,true,false', refused.join());
// ---------- 4. watering: shared, then one plant first ----------
await focusMin(G, 60);
const w1 = await G.ev(() => garden().growing.map(p => [p.sp, waterOf(p), plantStage(p)]));
check('A 60-minute block gives three plants 44 XP each (1.17: 74% share each, not a strict split) — tomatoes Leafy, sunflower Flowering', w1.length === 3 && w1.every(x => x[1] === 44) && w1.filter(x => x[0] === 'tomato').every(x => x[2] === 2) && w1.find(x => x[0] === 'sunflower')[2] === 3, JSON.stringify(w1));
check('…garden XP grew by the plant XP given (3 × 44)', await G.ev(() => garden().xp === 660 + 132));
await G.ev(() => gardenFocus(garden().growing.find(p => p.sp === 'sunflower').id));
await focusMin(G, 110);
const w2 = await G.ev(() => garden().growing.map(p => [p.sp, waterOf(p), plantStage(p), plantReady(p), !!p.fc]));
const sun = w2.find(x => x[0] === 'sunflower');
check('“Water this one first”: a 110-minute block fills the sunflower (60) and the tomatoes (70) alike — the focused plant gets ×1.5, nobody is starved', sun[1] === 60 && sun[2] === 4 && sun[3] && w2.filter(x => x[0] === 'tomato').every(x => x[1] === 70), JSON.stringify(w2));
check('…a plant that is full loses its focus flag; the bag badge shows something is ready', await G.ev(() => !garden().growing.find(p => p.sp === 'sunflower').fc && !$('#gardenDot').classList.contains('hidden')));
// ---------- 5. stages ----------
const stages = await G.ev(() => [0, 8, 9, 31, 32, 58, 59, 89, 90, 120].map(w => plantStage({ sp: 'tomato', w: { x: w } })));
check('Stages from water: Seed <10% · Sprout 10–35% · Leafy 35–65% · Flowering 65–100% · Fruiting at 100% (and beyond)', stages.join() === '0,1,1,2,2,3,3,4,4,4', stages.join());
check('Every stage draws: seed, sprout, leafy, flowering, fruiting — for every species and mutation', await G.ev(() => GSPECIES.every(sp => [0, 1, 2, 3, 4].every(st => ['', 'golden', 'rainbow', 'crystal'].every(m => { const h = plantArt(sp, st, m); const d = document.createElement('div'); d.innerHTML = h; return d.querySelector('svg') && (st < 4 || !m || h.includes('spk')); })))));
// ---------- 6. mutations: deterministic, never re-rolled, Crystal rarest ----------
const mut = await G.ev(() => {
  const p = { id: 'plfixed123', sp: 'tomato', sk: 10, fd: 50 };
  const a = mutationOf(p), b2 = mutationOf({ ...p });
  const n = { '': 0, golden: 0, rainbow: 0, crystal: 0 };
  for (let i = 0; i < 20000; i++) n[mutationOf({ id: 'pl' + i, sp: 'lavender', sk: 15, fd: 90 })]++;
  const c0 = mutationChance({ sp: 'tomato', sk: 0, fd: 25 }), c1 = mutationChance({ sp: 'tomato', sk: 30, fd: 90 }), cl = mutationChance({ sp: 'lotus', sk: 0, fd: 25 });
  return { same: a === b2, n, c0, c1, cl, ready: garden().ready.map(p => [p.m, p.fin, p.fd]) };
});
check('mutationOf() gives the same answer every time for the same stored plant; the roll is fixed by the plant id', mut.same && mut.ready.every(x => typeof x[0] === 'string' && x[1] && x[2] === 110), JSON.stringify(mut.ready));
check('Chance rises with the streak when planted and a long finishing session; rarer species mutate more', mut.c0 < mut.c1 && mut.c0 < mut.cl && Math.abs(mut.c0 - .06) < 1e-9 && Math.abs(mut.c1 - .18) < 1e-9, JSON.stringify([mut.c0, mut.c1, mut.cl]));
check('Over 20,000 rolls: Golden > Rainbow > Crystal, Crystal the rarest, most plants plain', mut.n[''] > mut.n.golden && mut.n.golden > mut.n.rainbow && mut.n.rainbow > mut.n.crystal && mut.n.crystal > 0, JSON.stringify(mut.n));
// ---------- 7. harvest ----------
const yieldChk = await G.ev(() => { const r = { ok: true }; for (let i = 0; i < 500; i++) { const y = yieldOf({ id: 'y' + i, sp: 'tomato', m: '' }); if (y < 3 || y > 5) r.ok = false; } r.gold = yieldOf({ id: 'g', sp: 'lotus', m: 'crystal' }); return r; });
check('Yield by rarity (common 3–5), ×4 for Crystal', yieldChk.ok && yieldChk.gold >= 96 && yieldChk.gold <= 128, JSON.stringify(yieldChk));
const before = await G.ev(() => ({ produce: garden().produce, xp: garden().xp, id: garden().ready[0].id, sp: garden().ready[0].sp, need: needOf(garden().ready[0]), plot: garden().ready[0].plot, y: yieldOf(garden().ready[0]), hxp: harvestXP(garden().ready[0]), notReady: (() => { S.plants.push({ id: 'nr1', v: 1, sp: 'tomato', plot: 3, seed: '', at: Date.now(), sk: 0, w: {}, u: Date.now() }); GD = null; const r = gardenHarvest('nr1'); S.plants = S.plants.filter(p => p.id !== 'nr1'); GD = null; return r; })() }));
await G.ev(() => showTab('garden')); await wait(300); await closeAll(G);
await G.p.click(`.gd-plot[data-pid="${before.id}"]`); await wait(1100);
const hv = await G.ev(pl => ({ produce: garden().produce, xp: garden().xp, h: garden().harvested.filter(p => !p.sum).map(p => ({ sp: p.sp, y: p.y, wt: p.wt, plot: p.plot, w: p.w })), plot1: !garden().byPlot[pl], growing: garden().growing.length, grownTotal: garden().grownTotal, again: gardenHarvest('nope') }), before.plot);
check('Harvest (1.17): the crop goes to the Harvests tab (produce unchanged until sold), the plot empties, the record keeps the XP total and drops the map, garden XP gets the harvest bonus', before.notReady === null && hv.produce === before.produce && hv.h.length === 1 && hv.h[0].sp === before.sp && hv.h[0].y === before.y && hv.h[0].wt === before.need && hv.h[0].plot === -1 && !hv.h[0].w && hv.plot1 && hv.growing === 2 && hv.grownTotal === 61 && hv.xp === before.xp + before.hxp && hv.again === null, JSON.stringify({ before, hv }));
// ---------- 8. shops, decor, bag ----------
const shop = await G.ev(() => { const r = {}; r.freeCap = [gardenBuy('seed_tomato'), gardenBuy('seed_tomato'), gardenBuy('seed_tomato'), gardenBuy('seed_tomato')]; r.tomatoSeeds = garden().seeds.tomato.length; r.locked = gardenBuy('seed_lotus'); r.basil = gardenBuy('seed_basil'); r.lantern = gardenBuy('dc_lantern'); r.twice = gardenBuy('dc_lantern'); r.fence = gardenBuy('dc_fence_wood'); r.path = gardenBuy('dc_path_stone'); r.produce = garden().produce; r.spent = garden().spent; return r; });
check('Seed shop: free Tomato restocks up to 3 held (none were left after planting), a level-locked legendary is refused, Basil costs 3; decor bought once each', shop.freeCap.join() === 'true,true,true,false' && shop.tomatoSeeds === 3 && shop.locked === false && shop.basil && shop.lantern && shop.twice === false && shop.fence && shop.path && shop.spent === 3 + 15 + 12 + 10, JSON.stringify(shop));
const poor = await G.ev(() => { const p0 = garden().produce; const r = gardenBuy('dc_fountain'); return { r, p0, same: garden().produce === p0 }; });
check('Not enough produce → refused, balance untouched (never negative)', poor.r === false && poor.same && poor.p0 >= 0, JSON.stringify(poor));
const place = await G.ev(() => { const g = garden(); const by = id => g.decor.find(d => d.it.id === id).buy.id; const r = [gardenPlace(by('dc_fence_wood'), 'border'), gardenPlace(by('dc_path_stone'), 'path'), gardenPlace(by('dc_lantern'), 's3'), gardenPlace(by('dc_lantern'), 'border')]; renderGarden(); return { r, placed: Object.keys(garden().placed).sort().join(), cls: $('.gd-ground').className, spot: !!$('.gd-spot.sp-3.has.dc_lantern') }; });
check('Placing: fence → border, path → path, lantern → spot 3 (a spot item can’t go on the border); the scene shows them', place.r.join() === 'true,true,true,false' && place.placed === 'border,path,s3' && /dc_fence_wood/.test(place.cls) && /dc_path_stone/.test(place.cls) && place.spot, JSON.stringify(place));
await G.ev(() => showTab('bag')); await wait(400);
const bag = await G.ev(() => ({ cat: !!$('#bagCats [data-bcat="garden"]'), cards: $$('#bagList .gd-item').length, placed: $$('#bagList .gd-item.equipped').length, remove: !!$('#bagList [data-gremove]'), seeds: $$('#bagList .gd-item').filter(x => x.textContent.includes('seed')).length }));
check('Bag → Garden: decor cards with Place / Remove, seeds you hold with counts', bag.cat && bag.cards >= 4 && bag.placed === 3 && bag.remove && bag.seeds >= 2, JSON.stringify(bag));
await closeAll(G); await G.p.click('#bagList [data-gremove]'); await wait(400);
check('Remove from the bag puts the decor back (its slot is empty again)', await G.ev(() => Object.keys(garden().placed).length === 2 && $$('#bagList .gd-item.equipped').length === 2));
// ---------- 9. levels, plots, next unlock ----------
const lv = await G.ev(() => { const out = []; for (const xp of [0, 150, 400, 800, 1400, 2200, 3300, 4700, 12000, 99999]) out.push([gardenLevelOf(xp), plotsForLevel(gardenLevelOf(xp))]); return { out, next: gardenNextUnlock(garden()) }; });
check('Levels from XP and plots per level: 4 → 6 → 8 → 10 → 12 → 14 → 16; the header names the next unlock', lv.out.map(x => x.join(':')).join() === '1:4,2:6,3:8,4:10,5:12,6:14,7:16,8:16,11:16,11:16' && /Level \d: \d+ plots/.test(lv.next), JSON.stringify(lv));
// ---------- 10. wilting + revival, visitors, weather ----------
const wilt = await G.ev(() => {
  const now = Date.now(), r = {};
  r.fresh = gardenWilted(now);
  r.after4days = gardenWilted(now + 4 * 864e5);
  S.abandoned.push({ id: 'ab1', name: 'x', start: now - 60000, end: now, duration: 60000, planned: 25 * 60000 }); GD = null;
  r.abandoned = gardenWilted(now + 1000);
  S.abandoned.pop(); GD = null;
  return r;
});
check('Wilting: fine after a block, thirsty after 3 days without one, thirsty right after a stopped-early attempt; never dead', !wilt.fresh && wilt.after4days && wilt.abandoned, JSON.stringify(wilt));
await G.ev(() => { S.abandoned.push({ id: 'ab2', name: 'x', start: Date.now() - 60000, end: Date.now(), duration: 60000, planned: 25 * 60000 }); save(); showTab('garden'); });
check('…the scene droops and says so', await G.ev(() => $('#gdScene').classList.contains('wilted') && $('.gd-tipline').textContent.includes('thirsty')));
await focusMin(G, 25); await G.ev(() => showTab('garden')); await wait(300);
check('…and perks up after the next finished block', await G.ev(() => !$('#gdScene').classList.contains('wilted') && !gardenWilted()));
const vis = await G.ev(() => ({ v: gardenVisitors().map(v => v.kind), els: $$('.gd-vis').length, bird: $$('.gd-vis.v-bird').length }));
check('Visitors come for this week’s sessions and the streak (butterflies at least; a bird for a 3-day streak)', vis.v.includes('butterfly') && vis.els === vis.v.length, JSON.stringify(vis));
await closeAll(G); await G.ev(() => $('.gd-vis').click()); await wait(200);
check('Tapping a visitor reacts (a little hop and a line)', await G.ev(() => $('.gd-vis').classList.contains('poke') && !$('#gdSay').classList.contains('hidden')));
const wx = await G.ev(() => { const d1 = new Date(2026, 6, 10), d2 = new Date(2026, 6, 10, 23), d3 = new Date(2026, 0, 3); return { same: gardenWeather(d1) === gardenWeather(d2), kinds: ['clear', 'cloudy', 'rain'].includes(gardenWeather(d3)), seasons: [0, 3, 6, 9].map(m => gardenSeason(new Date(2026, m, 1))).join(), tod: [6, 12, 18, 23].map(h => gardenTod(new Date(2026, 0, 1, h))).join() }; });
check('Weather is the same all day (hash of the date) and seasons / time of day follow the calendar and clock', wx.same && wx.kinds && wx.seasons === 'winter,spring,monsoon,autumn' && wx.tod === 'sunrise,day,sunset,night', JSON.stringify(wx));
// ---------- 11. almanac ----------
await G.ev(() => { S.ui.gardenView = 'almanac'; renderGarden(); }); await wait(300);
const alm = await G.ev(() => ({ head: $('.gd-alm-head').textContent.replace(/\s+/g, ' '), sil: $$('.gd-grid:not(.gd-petgrid):not(.gd-shelf) .gd-item.silhouette').length, disc: $$('.gd-grid:not(.gd-petgrid):not(.gd-shelf) .gd-item:not(.silhouette)').length, tomato: $$('.gd-grid:not(.gd-petgrid):not(.gd-shelf) .gd-item').find(x => x.textContent.includes('Tomato')).textContent.replace(/\s+/g, ' '), ach: $$('.achlist:not(.gd-wmlist) .ach').length, achN: GARDEN_ACH.length, done: $$('.achlist .ach.done').length, mut: $('.gd-muts').textContent.replace(/\s+/g, ' ') }));
check('Almanac: discovered species in colour with stats (incl. plants grown before 1.15), the rest as silhouettes with a hint, completion %, achievements', /2 of 23 species/.test(alm.head) && alm.sil === 21 && alm.disc === 2 && /before 1\.15/.test(alm.tomato) && alm.ach === alm.achN && alm.done >= 1 && /Golden ×2\d/.test(alm.mut), JSON.stringify(alm));
// ---------- 12. questline, card, Wrapped, Stats slot ----------
const integ = await G.ev(() => { const ev = EVENT_BY_ID.hw26; const m = eventMetrics(ev); const legacyRipe = S.sessions.filter(s => s.start >= evStart(ev) && s.start < evEnd(ev) && s.duration >= 45 * 60000).length; const q = questState(ev).qs.find(x => x.kind === 'plants'); return { plants: m.plants, legacyRipe, kind: q ? q.title : QUEST_KINDS.plants.t(15, true), newKind: QUEST_KINDS.plants.t(15, false), gp: cardData().gp, grownTotal: garden().grownTotal, wrapped: wrappedPeriods().length ? !!wrappedData(wrappedPeriods()[0]).garden : 'none', slot: $('#gardenSlot').textContent }; });
check('Questline “plants”: a questline that began before the migration keeps the old rule for its whole run (ripe plant per 45-min session, same title); later questlines count harvests', integ.plants === integ.legacyRipe && /Grow 15 ripe plants/.test(integ.kind) && /Harvest 15 plants/.test(integ.newKind), JSON.stringify(integ));
check('Player card “garden harvests” = past plants + harvests; Wrapped data still computes', integ.gp === integ.grownTotal && integ.gp === 61 && (integ.wrapped === true || integ.wrapped === 'none'), JSON.stringify(integ));
await G.ev(() => showTab('stats')); await wait(400);
check('Stats keeps a small Garden summary card that opens the Garden tab', await G.ev(() => /Level \d/.test($('#gardenSlot').textContent) && !!$('#gardenSlot [data-gotab="garden"]')));
// ---------- 13. True Minimalist ----------
await G.ev(() => setMinimal(true)); await wait(300);
const mini = await G.ev(() => { showTab('garden'); return { tab: S.ui.tab, hidden: $('#tabs [data-tab="garden"]').classList.contains('hidden'), slot: $('#gardenSlot').innerHTML, cmd: cmdList('').some(c => c.t === 'Garden'), tour: tourSteps().some(s => s.tab === 'garden'), dot: $('#gardenDot').classList.contains('hidden') }; });
check('True Minimalist hides the Garden tab completely (nav, palette, tour, badge); opening it lands on the Timer; the Stats card is gone', mini.tab === 'timer' && mini.hidden && mini.slot === '' && !mini.cmd && !mini.tour && mini.dot, JSON.stringify(mini));
const miniPlot = await G.ev(() => { gardenBuy('seed_tomato'); const free = [...Array(garden().plots).keys()].find(i => !garden().byPlot[i]); gardenPlant(free, 'tomato'); GD = null; return free; });
await focusMin(G, 30);
check('…sessions still water the garden quietly in minimal mode (nothing is lost)', await G.ev(pl => { const p = garden().byPlot[pl]; return !!p && Object.keys(p.w).length === 1 && waterOf(p) > 0; }, miniPlot));
await G.ev(() => setMinimal(false)); await wait(200);
// ---------- 14. export / import ----------
const exp = await G.ev(() => { const { timer, ui, pendingSessions, profileDirty, ...data } = S; return JSON.parse(JSON.stringify({ ...data, exportedAt: new Date().toISOString() })); });
check('Export includes the garden (plants with water maps, purchases with slots)', Array.isArray(exp.plants) && exp.plants.some(p => p.sum) && exp.plants.some(p => p.w) && Array.isArray(exp.gbuys) && exp.gbuys.some(b => b.slot === 'border'));
const G2 = await guest();
const imp = await G2.ev(e => { const p0 = S.plants.length, b0 = S.gbuys.length; mergeData(e); return { p0, b0, plants: S.plants.length, buys: S.gbuys.length, migs: S.plants.filter(p => p.id === 'mig1').length, produce: garden().produce, level: garden().level, placed: Object.keys(garden().placed).sort().join() }; }, exp);
check('A 1.15 backup imports into another guest: plants and purchases arrive once (ids), garden level and decor placement come with it', imp.migs === 1 && imp.plants === exp.plants.length && imp.buys === exp.gbuys.length && imp.level >= 3 && imp.produce > 0 && imp.placed === 'border,path', JSON.stringify(imp));
const imp2 = await G2.ev(e => { const w0 = JSON.stringify(S.plants); mergeData(e); return { same: JSON.stringify(S.plants) === w0 || S.plants.length === e.plants.length, n: S.plants.length, buys: S.gbuys.length }; }, exp);
check('Importing the same backup twice doubles nothing', imp2.n === exp.plants.length && imp2.buys === exp.gbuys.length, JSON.stringify(imp2));
const unionImp = await G2.ev(e => { const p = e.plants.find(x => x.w && !x.h); const e2 = JSON.parse(JSON.stringify(e)); const q = e2.plants.find(x => x.id === p.id); q.w = { ...q.w, extra: 5 }; q.u = Date.now() + 5000; const before = waterOf(S.plants.find(x => x.id === p.id)); mergeData(e2); const after = S.plants.find(x => x.id === p.id); return { before, after: waterOf(after), keys: Object.keys(after.w).length }; }, exp);
check('A newer copy of a plant from a backup joins its water map (no minutes lost, none doubled)', unionImp.after === unionImp.before + 5, JSON.stringify(unionImp));
const old = { sessions: legacy().slice(0, 10).map(s => ({ ...s, id: 'old' + s.id, start: s.start - 400 * 864e5, end: s.end - 400 * 864e5 })), presets: [], names: {}, recent: [], pinned: [], reminders: [], notes: {}, energy: {}, game: {}, exportedAt: '2026-09-01T00:00:00Z' };
const impOld = await G2.ev(o => { const n = S.sessions.length; const added = mergeData(o); return { added, n2: S.sessions.length - n, plants: S.plants.length, errs: 0 }; }, old);
check('A 1.14 backup (no garden fields) still imports', impOld.added === 10 && impOld.n2 === 10 && impOld.plants === exp.plants.length, JSON.stringify(impOld));
await G2.ctx.close();
// ---------- 15. demo preview ----------
const D = await guest(1280, { noLogin: true });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await D.ev(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
await D.ev(() => showTab('garden')); await wait(600);
const ls0 = await D.ev(() => Object.keys(localStorage).length);
const demo = await D.ev(() => ({ pv: isPreview(), level: garden().level, growing: garden().growing.length, ready: garden().ready.length, placed: Object.keys(garden().placed).length, harvested: garden().harvested.length, muts: garden().harvested.filter(p => p.m).length, scene: !!$('#gdScene'), plots: $$('.gd-plot.has').length, ls: Object.keys(localStorage).filter(k => /garden|focus-app|cache/.test(k)).length }));
check('Demo preview shows a sample garden: level 4, plants at several stages (one ready), decor placed, harvests with mutations', demo.pv && demo.level === 4 && demo.growing === 7 && demo.ready === 1 && demo.placed === 5 && demo.harvested === 5 && demo.muts === 2 && demo.scene && demo.plots === 7, JSON.stringify(demo));
await closeAll(D); await D.p.click('.gd-plot.ready'); await wait(500);
const demoW = await D.ev(() => ({ harvested: garden().harvested.length, prompt: !!document.querySelector('#pvDlg[open], #pvPrompt:not(.hidden), dialog[open] #pvWhy'), ls: Object.keys(localStorage).length }));
await closeAll(D); await D.ev(() => { S.ui.gardenView = 'seeds'; renderGarden(); }); await D.p.click('[data-gbuy="seed_basil"]'); await wait(400);
const demoB = await D.ev(() => ({ bought: S.gbuys.length, ls: Object.keys(localStorage).length, prompt: !!document.querySelector('dialog[open] #pvWhy') }));
check('…and never writes: harvesting and buying in the demo change nothing and show the demo prompt; nothing lands in localStorage', demoW.harvested === 5 && demoW.prompt && demoB.bought === 21 && demoB.prompt && demoB.ls === ls0 && demo.ls === 0, JSON.stringify({ ls0, demoW, demoB }));
await D.ctx.close();
// ---------- 16. phone layout ----------
for (const w of [360, 390]) {
  const P = await guest(w, { state: { sessions: legacy() } });
  const r = {};
  for (const v of ['garden', 'seeds', 'decor', 'almanac']) {
    await P.ev(v => { S.ui.gardenView = v; showTab('garden'); }, v); await wait(900);   // let the card stagger animation finish before measuring
    r[v] = await P.ev(() => ({ hscroll: document.documentElement.scrollWidth > innerWidth + 1, small: $$('#tab-garden button').filter(b => b.offsetParent && (b.getBoundingClientRect().width < 44 || b.getBoundingClientRect().height < 44) && !b.closest('.gd-visitors')).map(b => b.className || b.textContent.trim()).slice(0, 5) }));
  }
  check(`${w}px: no sideways scroll on any garden view; every control (plots, buttons) is at least 44px`, Object.values(r).every(x => !x.hscroll && !x.small.length), JSON.stringify(r));
  await P.ev(() => { S.ui.gardenView = 'garden'; renderGarden(); }); await wait(300); await closeAll(P); await P.p.click('.gd-plot:not(.locked)'); await wait(300);
  check(`${w}px: the seed picker dialog fits the screen`, await P.ev(() => { const d = $('#gdDlg').getBoundingClientRect(); return $('#gdDlg').open && d.right <= innerWidth + 1 && d.width >= 280; }));
  await P.ctx.close();
}
await G.ctx.close();
log('errors', JSON.stringify(errs));
log('failures', failCount());
await b.close();
process.exit(failCount() ? 1 : 0);
