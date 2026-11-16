// v1.15 Cosmetics drop: 8 themes (skins apply in light and dark, Aurora animated + always dark), 10 stamps (art, land on
// the session card), 6 ring trails (new category: shop, bag, equip, particles at the ring's head only with Animations = Full,
// none in Reduced/Off), 22+ room items, 5 seeds (every stage draws) and 6 decor pieces (art / CSS), rarities, id rules,
// every item previewable, the public profile still carries only the old fields, the demo owns a few.
import { b, wait, log, check, errs, failCount } from './cl-common.mjs';
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 } });
  await ctx.addInitScript(o => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); if (o.motion) localStorage.setItem('pomodorolist-motion', o.motion);
    const now = Date.now(), sessions = []; for (let d = 1; d <= 80; d++) for (let k = 0; k < 3; k++) { const st = now - d * 864e5 + (9 + k * 3) * 3600e3; sessions.push({ id: 's' + d + '_' + k, name: 'Physics', start: st, end: st + 50 * 60000, duration: 50 * 60000, planned: 50 * 60000, preset: 'Classic 25/5' }); } localStorage.setItem('focus-app-v1', JSON.stringify({ sessions })); }, { motion: opts.motion || '' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('guest: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('guest console: ' + m.text()); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await p.evaluate(() => { window.confirm = () => true; document.querySelectorAll('dialog[open]').forEach(d => d.close()); }); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const G = await guest();
// ---------- 1. catalogue counts, ids, previews, rarities ----------
const cat = await G.ev(() => {
  const by = c => ITEMS.filter(i => i.cat === c);
  const newThemes = ['th_lavender', 'th_mint', 'th_coffee', 'th_slate', 'th_peach', 'th_candy', 'th_monsoon', 'th_aurora'];
  const newStamps = ['stamp_leaf', 'stamp_heart', 'stamp_moon', 'stamp_bolt', 'stamp_books', 'stamp_coffee', 'stamp_wave', 'stamp_sun', 'stamp_rocket', 'stamp_diamond'];
  const bad = [...ITEMS.map(i => i.id), ...GSPECIES.map(s => s.id), ...GDECOR.map(d => d.id)].filter(id => !/^[a-z0-9_]{2,40}$/.test(id));
  const dup = ITEMS.map(i => i.id).filter((id, i, a) => a.indexOf(id) !== i);
  const g = game();
  const noPreview = ITEMS.filter(i => { try { const h = previewFor(i, g); return !h || !/<(svg|span|div)/.test(h); } catch (e) { return true; } }).map(i => i.id);
  const rar = new Set([...newThemes, ...newStamps, ...by('trail').map(i => i.id), ...by('room').filter(i => i.price > 0).map(i => i.id)].map(id => itemRarity(ITEM_BY_ID[id])));
  return { themes: newThemes.every(id => ITEM_BY_ID[id] && SKINS[id] && (SKINS[id].light || SKINS[id].dark)), stamps: newStamps.every(id => ITEM_BY_ID[id] && STAMP_ART[id] && STAMP_ART[id].length > 40), trails: by('trail').length, roomPaid: by('room').filter(i => i.price > 0).length,
    roomArt: by('room').filter(i => i.price !== -1).every(i => { const slot = roomSlotOf(i.id); return slot === 'wall' ? !!RM.wall[i.id] : slot === 'floor' ? !!RM.floor[i.id] : /_none$/.test(i.id) || !!RM_ART[i.id]; }),
    seeds: GSPECIES.length, seedArt: GSPECIES.every(sp => [0, 1, 2, 3, 4].every(st => plantArt(sp, st, 'golden').includes('<path') || plantArt(sp, st).includes('<ellipse'))), decor: GDECOR.length, decorArt: GDECOR.every(d => d.kind !== 'spot' || !!DECOR_ART[d.id]),
    bad, dup, noPreview, rar: [...rar].sort().join(), total: ITEMS.length };
});
check('8 new themes with light + dark skins, 10 new stamps with art, 6 ring trails (+ none, + 2 garden-look trails since 1.16), 22+ new room items with art, 21 seeds and 20 decor pieces in the garden, all drawable', cat.themes && cat.stamps && cat.trails === 9 && cat.roomPaid >= 50 && cat.roomArt && cat.seeds === 23 && cat.seedArt && cat.decor === 25 && cat.decorArt, JSON.stringify(cat));
check('Every id is short lowercase (≤ 40 chars — safe as a Firestore map key and a CSS class), no duplicates, every item has a preview; the drop covers all four rarities', cat.bad.length === 0 && cat.dup.length === 0 && cat.noPreview.length === 0 && cat.rar === 'common,epic,legendary,rare', JSON.stringify({ bad: cat.bad, dup: cat.dup, noPreview: cat.noPreview, rar: cat.rar }));
// ---------- 2. themes ----------
const th = await G.ev(() => {
  const out = {};
  for (const id of ['th_lavender', 'th_mint', 'th_coffee', 'th_slate', 'th_peach', 'th_candy', 'th_monsoon', 'th_aurora']) {
    S.game.purchases['t_' + id] = { item: id, price: 0, at: Date.now() }; G = null;
    for (const mode of ['light', 'dark']) { S.settings.theme = mode; eqSet('theme', id); applyCosmetics(); const cs = getComputedStyle(document.documentElement); (out[id] ||= {})[mode] = { bg: cs.getPropertyValue('--bg').trim(), accent: cs.getPropertyValue('--accent').trim(), dataTheme: document.documentElement.getAttribute('data-theme'), fx: $('#themeFx').className, sky: $('#todSky').classList.contains('hidden') }; }
  }
  eqSet('theme', 'th_default'); S.settings.theme = 'auto'; applyCosmetics();
  return out;
});
check('Each new theme sets its own colours in light and dark; Monsoon and Aurora are always dark', Object.entries(th).every(([id, m]) => m.light.bg && m.dark.bg && m.light.accent !== '' && (['th_monsoon', 'th_aurora'].includes(id) ? m.light.dataTheme === 'dark' && m.light.bg === m.dark.bg : m.light.bg !== m.dark.bg)), JSON.stringify(th));
check('Aurora draws its drifting lights on the page effect layer (and hides the time-of-day sky, like Starfield); the others don’t', th.th_aurora.dark.fx === 'tfx-aurora' && th.th_aurora.dark.sky && th.th_mint.dark.fx === 'hidden', JSON.stringify({ aurora: th.th_aurora.dark, mint: th.th_mint.dark }));
// ---------- 3. stamps ----------
await G.ev(() => { S.game.purchases.st1 = { item: 'stamp_rocket', price: 0, at: Date.now() }; G = null; eqSet('stamp', 'stamp_rocket'); save(); applyCosmetics(); showTab('timer'); });
await G.ev(() => { const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 25 * 60000; t.focusStartedAt = Date.now() - 25 * 60000; t.endAt = Date.now() - 1; tick(); }); await wait(900);
const st = await G.ev(() => ({ stamp: S.sessions[S.sessions.length - 1].stamp, landed: !!$('#noteRow .stamp-land'), art: ($('#noteRow .stamp-land svg') || {}).innerHTML || '' }));
check('A new stamp is recorded on the session and lands on the session-complete card with its art', st.stamp === 'stamp_rocket' && st.landed && /c8584e/.test(st.art), JSON.stringify({ stamp: st.stamp, landed: st.landed }));
await closeAll(G);
// ---------- 4. ring trails ----------
await G.ev(() => { S.ui.shopCat = 'trail'; showTab('shop'); }); await wait(400);
const shop = await G.ev(() => ({ cat: !!$('#shopCats [data-cat="trail"].active'), cards: $$('#shopView .item').length, equippedNone: $$('#shopView .item.equipped').length, buy: $$('#shopView [data-buy]').length }));
check('Shop → Ring trails: seven cards, "No trail" equipped by default, the rest for coins', shop.cat && shop.cards === 7 && shop.equippedNone === 1 && shop.buy >= 5, JSON.stringify(shop));
const c0 = await G.ev(() => game().balance);
await G.p.click('#shopView [data-buy="trail_sparks"]'); await wait(400);
const bought = await G.ev(c0 => ({ owned: isOwned('trail_sparks'), eq: equippedId('trail'), spent: c0 - game().balance }), c0);
check('Buying Sparks costs 120 coins and equips it', bought.owned && bought.eq === 'trail_sparks' && bought.spent === 120, JSON.stringify(bought));
await G.ev(() => { showTab('timer'); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); }); await wait(1500);
const tr = await G.ev(() => ({ n: $$('#ringTrail .tp').length, cls: ($('#ringTrail .tp') || {}).className, live: $('#ring').classList.contains('ring-live'), inside: $$('#ringTrail .tp').every(p => { const r = p.getBoundingClientRect(), R = $('#ring').getBoundingClientRect(); return r.left >= R.left - 40 && r.right <= R.right + 40; }) }));
check('While a block runs (Animations = Full) sparks appear at the ring’s head: a handful of particles, inside the ring’s box, that fade away', tr.live && tr.n >= 3 && tr.n <= 36 && /tp-sparks/.test(tr.cls) && tr.inside, JSON.stringify(tr));
await G.ev(() => { $('#resetBtn').click(); }); await wait(2800);
check('…and they are gone shortly after the timer stops (no leak)', await G.ev(() => $$('#ringTrail .tp').length === 0 && trailN === 0));
await G.ev(() => { for (const id of ['trail_petals', 'trail_snow', 'trail_bubbles', 'trail_stars', 'trail_embers']) S.game.purchases['t_' + id] = { item: id, price: 0, at: Date.now() }; G = null; save(); });
const kinds = {};
for (const id of ['trail_petals', 'trail_snow', 'trail_bubbles', 'trail_stars', 'trail_embers']) {
  await G.ev(id => { eqSet('trail', id); applyCosmetics(); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); }, id); await wait(900);
  kinds[id] = await G.ev(id => { const sel = '#ringTrail .tp.' + id.replace('trail_', 'tp-'); return { n: $$(sel).length, dy: Math.sign(parseFloat(($(sel) || { style: {} }).style.getPropertyValue('--dy') || 0)) }; }, id);
  await G.ev(() => $('#resetBtn').click()); await wait(300);
}
check('Every trail kind emits its own particles: petals and snow drift down, bubbles and embers rise, stars twinkle', Object.values(kinds).every(k => k.n >= 2) && kinds.trail_petals.dy === 1 && kinds.trail_snow.dy === 1 && kinds.trail_bubbles.dy === -1 && kinds.trail_embers.dy === -1, JSON.stringify(kinds));
await wait(2800);   // let the last kind's particles finish
await G.ev(() => { localStorage.setItem('pomodorolist-motion', 'reduced'); applyMotion(); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); }); await wait(1200);
const red = await G.ev(() => ({ n: $$('#ringTrail .tp').length, motion: motion(), hidden: getComputedStyle($('#ringTrail')).display === 'none' }));
await G.ev(() => { $('#resetBtn').click(); localStorage.setItem('pomodorolist-motion', 'full'); applyMotion(); });
check('Animations = Reduced: no particles at all (the layer is hidden too)', red.motion === 'reduced' && red.n === 0 && red.hidden, JSON.stringify(red));
await G.ev(() => { S.ui.bagCat = 'timer'; showTab('bag'); }); await wait(400);
const bag = await G.ev(() => ({ cards: $$('#bagList .bag-item').filter(x => /trail_/.test(x.dataset.bid)).length, eq: $$('#bagList .bag-item.equipped').filter(x => /trail_/.test(x.dataset.bid)).length, label: CAT_LABEL.trail }));
check('Bag → Timer styles lists the trails you own with the equipped one marked', bag.cards === 6 && bag.eq === 1 && bag.label === 'Ring trail', JSON.stringify(bag));
await G.ev(() => bagUnequip('trail'));
check('Unequip → back to No trail', await G.ev(() => equippedId('trail') === 'trail_none'));
// ---------- 5. room, seeds, decor in their screens ----------
const room = await G.ev(async () => { window.confirm = () => true; for (const id of ['wall_brick', 'floor_marble', 'rug_heart', 'desk_glass', 'lamp_candle', 'shelf_tall', 'plant_fern', 'poster_wave', 'window_forest', 'pet_hamster']) await buyItem(id); const lay = roomLayout(); showTab('room'); return { lay, svg: $('#rmScene .rm-svg').innerHTML.length, hamster: /rm-fish/.test($('#rmScene .rm-svg').innerHTML), brick: /#c97b63/.test($('#rmScene .rm-svg').innerHTML) }; });
check('Ten new room items bought and drawn together (brick wall, marble floor, heart rug, glass desk, candles, tall shelf, fern, wave poster, forest window, hamster)', room.lay.wall === 'wall_brick' && room.lay.pet === 'pet_hamster' && room.svg > 4000 && room.hamster && room.brick, JSON.stringify(room.lay));
const gd = await G.ev(() => { const g = garden(); const ids = ['mint', 'radish', 'dahlia', 'orchid', 'dragonfruit']; S.ui.gardenView = 'seeds'; showTab('garden'); const cards = ids.map(id => !!$(`#tab-garden .gd-item[data-id="seed_${id}"]`)); S.ui.gardenView = 'decor'; renderGarden(); const dcs = GDECOR.slice(-6).map(d => !!$(`#tab-garden .gd-item[data-id="${d.id}"] .pv svg, #tab-garden .gd-item[data-id="${d.id}"] .pv .dcpv`)); S.ui.gardenView = 'almanac'; renderGarden(); const alm = $$('#tab-garden .gd-grid:not(.gd-petgrid) .gd-item').length; return { cards, dcs, alm, lvl: g.level }; });
check('Seed shop shows the five new seeds, the decor shop the six new pieces (with a preview), the almanac lists all 21 species (18 + the 1.16 exclusives)', gd.cards.every(Boolean) && gd.dcs.every(Boolean) && gd.alm === 23, JSON.stringify(gd));
const placed = await G.ev(() => { S.gbuys.push({ id: 'gbt1', v: 1, item: 'dc_fence_stone', price: 0, at: Date.now(), slot: 'border' }, { id: 'gbt2', v: 1, item: 'dc_path_wood', price: 0, at: Date.now(), slot: 'path' }, { id: 'gbt3', v: 1, item: 'dc_statue', price: 0, at: Date.now(), slot: 's1' }); GD = null; save(); S.ui.gardenView = 'garden'; renderGarden(); const gr = $('.gd-ground'); return { cls: gr.className, fence: getComputedStyle($('.gd-fence')).display, path: $('.gd-path').getBoundingClientRect().height, statue: !!$('.gd-spot.sp-1.has.dc_statue svg') }; });
check('Stone wall, wooden path and the statue draw in the garden scene', /dc_fence_stone/.test(placed.cls) && placed.fence === 'block' && placed.path >= 20 && placed.statue, JSON.stringify(placed));
// ---------- 6. nothing new is published ----------
const pub = await G.ev(() => { const src = publishPublic.toString(); const keys = (src.match(/writePublic\('publicProfiles', \{([\s\S]*?)\}\);/) || ['', ''])[1]; return { keys: keys.replace(/\s+/g, ' ').trim(), mentions: /trail|stamp|room|garden|plant|deck|card_|th_/.test(keys) }; });
check('The public profile document still carries only the 1.14 fields (username, level, tier, frame, colour, avatar, clan tag, aura, streaks, hours, joined) — none of the new cosmetics', !pub.mentions && /username/.test(pub.keys) && /flair/.test(pub.keys), pub.keys);
// ---------- 7. demo ----------
await G.ctx.close();
const D = await guest(1280, { noLogin: true });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeAll(D);
const demo = await D.ev(() => ({ trail: equippedId('trail'), owns: ['trail_petals', 'stamp_leaf', 'th_mint'].every(isOwned) }));
check('demo_scholar owns a trail (equipped), a new stamp and a new theme', demo.trail === 'trail_petals' && demo.owns, JSON.stringify(demo));
await D.ctx.close();
log('errors', JSON.stringify(errs));
log('failures', failCount());
await b.close();
process.exit(failCount() ? 1 : 0);
