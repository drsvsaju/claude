// v1.16 garden looks: the catalogue (20 items, every renderer present, never in the coin shop), the section in the
// Decor view, buying with produce (level gates, refusals, equip at once), every category applied, the bag ("Garden
// shop"), the coin shop once owned, the ledger (one copy, never negative), export/import (incl. a 1.15 export), two
// devices, demo, Minimalist.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, hasTouch: w < 500, isMobile: w < 500, acceptDownloads: true });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); });
  if (opts.init) await ctx.addInitScript(opts.init, opts.arg);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
const G = await guest(1280, { tag: 'looks' });
// ---------- 1. the catalogue ----------
const cat = await G.ev(() => {
  const L = GARDEN_LOOKS, cats = {};
  for (const it of L) cats[it.cat] = (cats[it.cat] || 0) + 1;
  const art = L.every(it => it.cat === 'avatar' ? !!AVATAR_ART[it.id] : it.cat === 'theme' ? !!SKINS[it.id] && SKINS[it.id].light && SKINS[it.id].dark : it.cat === 'title' ? !!TITLE_TEXT[it.id] : it.cat === 'frame' ? !!FRAMES[it.id] : it.cat === 'color' ? !!NAME_COLORS[it.id] : it.cat === 'stamp' ? !!STAMP_ART[it.id] : it.cat === 'trail' ? !!TRAIL_COLORS[it.id] : it.cat === 'room' ? !!RM_ART[it.id] : false);
  const dup = new Set(ITEMS.map(i => i.id)).size === ITEMS.length;
  S.ui.shopCat = 'avatar'; renderShop(); const inShop = !!document.querySelector('#shopView .item[data-id="av_pumpkin"]');
  const before = Object.keys(S.game.purchases).length; buyItem('av_pumpkin'); const coinBuy = Object.keys(S.game.purchases).length - before;
  return { n: L.length, cats, art, dup, inShop, coinBuy, prices: L.every(it => it.price === -1 && it.gprice > 0 && it.glvl >= 1 && ['common', 'rare', 'legendary'].includes(it.rarity)), previews: L.every(it => (rewardPreview(it, game()) || '').length > 20) };
});
check('20 garden looks across 8 categories, every one with its art, rarity common/rare/legendary, a produce price and a garden level; none is in the coin shop or buyable with coins',
  cat.n === 20 && cat.cats.avatar === 4 && cat.cats.theme === 2 && cat.cats.title === 3 && cat.cats.frame === 2 && cat.cats.color === 2 && cat.cats.stamp === 2 && cat.cats.trail === 2 && cat.cats.room === 3 && cat.art && cat.dup && !cat.inShop && cat.coinBuy === 0 && cat.prices && cat.previews, JSON.stringify(cat));
// ---------- 2. the section in the Decor view; gates ----------
const sec = await G.ev(() => { S.ui.gardenView = 'decor'; showTab('garden'); const cards = $$('.gd-lookgrid .gd-look'); return { cards: cards.length, head: !!$('.gd-looks-h'), locked: $$('.gd-lookgrid .gd-look.locked').length, buyBtns: $$('.gd-lookgrid [data-gbuy]').length, disabled: $$('.gd-lookgrid [data-gbuy][disabled]').length, price: ($('.gd-look[data-id="av_pumpkin"] .bi-src') || {}).textContent, level: garden().level, produce: garden().produce }; });
check('The Decor view lists the 20 looks under "Garden looks": at garden level 1 with no produce the 7 common ones are buyable-but-disabled and the 13 rare/legendary ones are locked', sec.cards === 20 && sec.head && sec.locked === 13 && sec.buyBtns === 7 && sec.disabled === 7 && /35/.test(sec.price) && /Common/.test(sec.price), JSON.stringify(sec));
const gate = await G.ev(() => { const r = {}; r.locked = gardenBuy('av_strawberry'); r.poor = gardenBuy('av_pumpkin'); r.n = S.gbuys.filter(x => ITEM_BY_ID[x.item] && ITEM_BY_ID[x.item].gprice).length; return r; });
check('A locked look and an unaffordable look are refused (nothing recorded)', gate.locked === false && gate.poor === false && gate.n === 0, JSON.stringify(gate));
// ---------- 3. buying: produce, record, ownership, equipped at once ----------
const buy = await G.ev(() => {
  const now = Date.now();
  for (let i = 0; i < 12; i++) S.plants.push({ id: 'ph' + i, v: 1, sp: 'tomato', plot: -1, seed: '', at: now - 9e6 - i * 1000, sk: 0, w: { x: 90 }, fin: 'x', fd: 90, h: now - 8e6 + i * 1000, y: 30, m: '', u: now });   // 360 produce
  GD = null; G = null;
  const p0 = garden().produce, ok = gardenBuy('av_pumpkin'), p1 = garden().produce;
  const rec = S.gbuys.find(x => x.item === 'av_pumpkin');
  S.ui.gardenView = 'decor'; showTab('garden');
  return { p0, ok, p1, rec: rec && rec.price, owned: isOwned('av_pumpkin'), avatar: myAvatar(), inOwned: game().owned.has('av_pumpkin'), coins: game().spent, card: ($('.gd-look[data-id="av_pumpkin"] .act') || {}).textContent, tag: ($('.gd-look[data-id="av_pumpkin"] .tag') || {}).textContent || '', btn: !!$('.gd-look[data-id="av_pumpkin"] .act button'), again: gardenBuy('av_pumpkin'), n: S.gbuys.filter(x => x.item === 'av_pumpkin').length };
});
check('With 360 produce the pumpkin avatar costs 35: a gbuys record, produce 360 → 325, owned, equipped at once (no coins spent), the card says Equipped (v2.0: once, as a state line in its action slot — not a tag plus a disabled button), buying it again is refused', buy.p0 === 360 && buy.ok && buy.p1 === 325 && buy.rec === 35 && buy.owned && buy.avatar === 'av_pumpkin' && buy.inOwned && buy.coins === 0 && /Equipped/.test(buy.card) && !/Equipped/.test(buy.tag) && !buy.btn && buy.again === false && buy.n === 1, JSON.stringify(buy));
// ---------- 4. every category applies ----------
const all = await G.ev(() => {
  const mig = gardenMig(); mig.xp = 4000; GD = null; G = null;   // garden level 6: everything unlocked
  for (let i = 0; i < 60; i++) S.plants.push({ id: 'pq' + i, v: 1, sp: 'tomato', plot: -1, seed: '', at: Date.now() - 9e6 - i, sk: 0, w: { x: 90 }, fin: 'x', fd: 90, h: Date.now() - 7e6 + i, y: 30, m: '', u: Date.now() });   // +1800 produce
  GD = null; G = null;
  const r = { level: garden().level, produce0: garden().produce };
  r.bought = ['th_orchard', 'ti_gardener', 'frame_vine', 'col_moss', 'stamp_sprout', 'trail_leaves', 'plant_sunflower', 'poster_seeds', 'rug_grass', 'av_lotus'].map(id => gardenBuy(id));
  r.produce1 = garden().produce;
  r.theme = equippedId('theme'); r.accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase();
  r.title = equippedId('title'); r.chip = $('#lvChip').title; r.frame = equippedId('frame'); r.badge = /frame_vine|rotate\(20 12 12\)/.test(badgeSVG(game().tier, { size: 24, frame: equippedId('frame') }));
  r.color = equippedId('color'); r.name = nameAttrs('col_moss'); r.stamp = equippedId('stamp'); r.trail = equippedId('trail'); r.trailCols = !!TRAIL_COLORS[equippedId('trail')];
  r.plant = roomSlot('plant'); r.poster = roomSlot('poster'); r.rug = roomSlot('rug'); r.room = roomSVG().includes('#f4c430') && roomSVG().includes('#7fb069');
  r.avatar = myAvatar(); r.ownedN = GARDEN_LOOKS.filter(it => isOwned(it.id)).length;
  return r;
});
const spent = 35 + 120 + 40 + 90 + 30 + 85 + 110 + 45 + 45 + 95 + 200;
check('At garden level 6 one of every kind is bought and applied: Orchard theme (accent #5a8f3c), the Gardener title, vine frame, moss name colour, sprout stamp, falling-leaves trail, the three room pieces placed, the lotus avatar; produce adds up',
  all.level >= 6 && all.bought.every(Boolean) && all.produce0 - all.produce1 === spent - 35 && all.theme === 'th_orchard' && all.accent === '#5a8f3c' && all.title === 'ti_gardener' && /Gardener/.test(all.chip) && all.frame === 'frame_vine' && all.badge && all.color === 'col_moss' && /5a8f3c/i.test(all.name) && all.stamp === 'stamp_sprout' && all.trail === 'trail_leaves' && all.trailCols && all.plant === 'plant_sunflower' && all.poster === 'poster_seeds' && all.rug === 'rug_grass' && all.room && all.avatar === 'av_lotus' && all.ownedN === 11, JSON.stringify(all));
// ---------- 5. the bag and the coin shop ----------
const bag = await G.ev(() => { S.ui.bagCat = 'all'; S.ui.bagFilter = 'all'; showTab('bag'); const items = bagItems().filter(x => x.it.gprice); return { n: items.length, src: [...new Set(items.map(x => x.src.label))].join(), kinds: [...new Set(items.map(x => x.src.kind))].join(), cards: $$('#bagList .bag-item').filter(e => /Garden shop/.test(e.textContent)).length, rar: ($('#bagList [data-bid="av_lotus"] .rar') || {}).textContent, equipBtn: !!$('#bagList [data-bid="av_pumpkin"] [data-bequip]') }; });
await G.ev(() => $('#bagList [data-bid="av_pumpkin"] [data-bequip]').click()); await wait(300);
const bag2 = await G.ev(() => ({ avatar: myAvatar(), shopFilter: (S.ui.bagFilter = 'shop', renderBagList(), $$('#bagList .bag-item').filter(e => /Garden shop/.test(e.textContent)).length) }));
const shop = await G.ev(() => { S.ui.shopCat = 'avatar'; showTab('shop'); renderShop(); const c = $('#shopView .item[data-id="av_lotus"]'); return { there: !!c, tag: c && c.querySelector('.tag') && c.querySelector('.tag').textContent, unownedHidden: !$('#shopView .item[data-id="av_strawberry"]') }; });
check('The bag lists the 11 looks with the source "Garden shop" (under the Shop filter too), rarity shown, Equip works from the bag; the coin shop shows an owned look as Owned and hides the unowned ones', bag.n === 11 && bag.src === 'Garden shop' && bag.kinds === 'shop' && bag.cards === 11 && bag.rar === 'Legendary' && bag.equipBtn && bag2.avatar === 'av_pumpkin' && bag2.shopFilter === 11 && shop.there && /Owned|Equipped/.test(shop.tag) && shop.unownedHidden, JSON.stringify({ bag, bag2, shop }));
// ---------- 6. the ledger: one copy, never negative, coins untouched ----------
const ledger = await G.ev(() => {
  const p0 = garden().produce, c0 = game().spent;
  S.gbuys.push({ id: 'dupA', v: 1, item: 'av_pumpkin', price: 35, at: Date.now(), slot: '' });   // another device bought it offline too
  S.gbuys.push({ id: 'poor1', v: 1, item: 'th_moonlit', price: 220, at: Date.now() - 1e10, slot: '' });   // dated before any produce existed
  GD = null; G = null;
  const g = garden();
  return { p1: g.produce, same: g.produce === p0, invalid: g.invalid.includes('dupA') && g.invalid.includes('poor1'), owned: isOwned('av_pumpkin'), moon: isOwned('th_moonlit'), coins: game().spent === c0, neg: g.produce >= 0 };
});
check('A second record for the same look is refunded (invalid), a record dated before the produce existed is invalid, produce never goes negative and coins are untouched', ledger.same && ledger.invalid && ledger.owned && !ledger.moon && ledger.coins && ledger.neg, JSON.stringify(ledger));
await G.ev(() => { S.gbuys = S.gbuys.filter(x => x.id !== 'dupA' && x.id !== 'poor1'); GD = null; G = null; save(); });
// ---------- 7. export / import ----------
const [dl] = await Promise.all([G.p.waitForEvent('download'), G.ev(() => $('#exportBtn').click())]);
const path = new URL('./backup-116e.json', import.meta.url).pathname; await dl.saveAs(path);
const json = JSON.parse(fs.readFileSync(path, 'utf8'));
const F = await guest(1280, { tag: 'import' });
await F.p.setInputFiles('#importFile', path); await wait(2500); await closeAll(F);
const imp = await F.ev(() => ({ owned: GARDEN_LOOKS.filter(it => isOwned(it.id)).length, theme: equippedId('theme'), avatar: myAvatar(), n: S.gbuys.filter(x => ITEM_BY_ID[x.item] && ITEM_BY_ID[x.item].gprice).length }));
await F.p.setInputFiles('#importFile', path); await wait(2500); await closeAll(F);
const imp2 = await F.ev(() => ({ owned: GARDEN_LOOKS.filter(it => isOwned(it.id)).length, n: S.gbuys.filter(x => ITEM_BY_ID[x.item] && ITEM_BY_ID[x.item].gprice).length }));
check('Export carries the look purchases; a fresh install owns and wears them after import; importing twice doubles nothing', json.gbuys.filter(x => x.item === 'av_lotus').length === 1 && imp.owned === 11 && imp.theme === 'th_orchard' && imp.avatar === 'av_pumpkin' && imp.n === 11 && imp2.owned === 11 && imp2.n === 11, JSON.stringify({ imp, imp2 }));
const LOOK_IDS = ['av_pumpkin', 'av_sunflower', 'av_strawberry', 'av_lotus', 'th_orchard', 'th_moonlit', 'ti_gardener', 'ti_greenthumb', 'ti_harvestmoon', 'frame_vine', 'frame_wreath', 'col_moss', 'col_marigold', 'stamp_sprout', 'stamp_basket', 'trail_leaves', 'trail_fireflies', 'plant_sunflower', 'poster_seeds', 'rug_grass'];
const old = JSON.parse(JSON.stringify(json)); old.gbuys = old.gbuys.filter(x => !LOOK_IDS.includes(x.item));
if (old.game && old.game.equipped) { old.game.equipped.theme = 'th_default'; old.game.equipped.avatar = 'av_default'; }
const oldPath = new URL('./backup-116e-old.json', import.meta.url).pathname; fs.writeFileSync(oldPath, JSON.stringify(old));
const O = await guest(1280, { tag: 'old' });
await O.p.setInputFiles('#importFile', oldPath); await wait(2500); await closeAll(O);
const oldImp = await O.ev(() => ({ owned: GARDEN_LOOKS.filter(it => isOwned(it.id)).length, produce: garden().produce, theme: equippedId('theme'), decor: !!$('#gardenBody') }));
check('A 1.15 export (no look purchases) imports cleanly: nothing owned, produce intact, default theme', oldImp.owned === 0 && oldImp.produce > 0 && oldImp.theme === 'th_default', JSON.stringify(oldImp));
await F.ctx.close(); await O.ctx.close(); await G.ctx.close();
// ---------- 8. two devices ----------
const UN = 'lk_' + Date.now().toString(36).slice(-5);
const A = await device('A', 1280); await signup(A, UN); await closeDlg(A);
const B = await device('B', 1280);
await B.p.goto('http://localhost:8000/index.html?emulator=1'); await B.p.waitForSelector('#authView:not(.hidden)'); await B.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', UN); await B.p.fill('#authPass', 'secret12'); await B.p.click('#authSubmit'); await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(B);
const aBuy = await A.ev(() => { const now = Date.now(); for (let i = 0; i < 4; i++) S.plants.push({ id: 'pa' + i, v: 1, sp: 'tomato', plot: -1, seed: '', at: now - 9e6 - i, sk: 0, w: { x: 90 }, fin: 'x', fd: 90, h: now - 8e6 + i, y: 30, m: '', u: now }); GD = null; G = null; save(); return { ok: gardenBuy('col_marigold'), color: equippedId('color') }; });
const bSees = await until(B, () => isOwned('col_marigold') && equippedId('color') === 'col_marigold', null, 20000);
const bOwn = await B.ev(() => ({ owned: isOwned('col_marigold'), color: equippedId('color'), n: S.gbuys.filter(x => x.item === 'col_marigold').length, produce: garden().produce }));
check('A buys the marigold name colour: B owns and wears it after sync, one record, the same produce left', aBuy.ok && aBuy.color === 'col_marigold' && bSees >= 0 && bOwn.owned && bOwn.color === 'col_marigold' && bOwn.n === 1 && bOwn.produce === 90, JSON.stringify({ aBuy, bOwn, bSees }));
await A.ctx.close(); await B.ctx.close();
// ---------- 9. demo; Minimalist ----------
const D = await guest(1280, { noLogin: true, tag: 'demo' });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeAll(D);
const demo = await D.ev(() => { S.ui.gardenView = 'decor'; showTab('garden'); return { pv: isPreview(), owned: isOwned('av_sunflower'), section: $$('.gd-lookgrid .gd-look').length, src: (bagItems().find(x => x.it.id === 'av_sunflower') || { src: {} }).src.label, ls: Object.keys(localStorage).length, buys: S.gbuys.length }; });
await D.ev(() => { const b = $('.gd-lookgrid [data-gbuy]:not([disabled])') || $('.gd-lookgrid [data-gbuy]'); b && b.click(); }); await wait(400);
const demo2 = await D.ev(() => ({ prompt: !!document.querySelector('dialog[open] #pvWhy'), buys: S.gbuys.length, ls: Object.keys(localStorage).length }));
check('Demo: the sunflower avatar is owned from the garden shop (bag source "Garden shop"), the section renders, a Buy tap shows the demo prompt and writes nothing', demo.pv && demo.owned && demo.section === 20 && demo.src === 'Garden shop' && demo2.prompt && demo2.buys === demo.buys && demo2.ls === demo.ls, JSON.stringify({ demo, demo2 }));
await D.ctx.close();
const M = await guest(390, { tag: 'minimal' });
const mini = await M.ev(() => { S.settings.gamification = false; applyMinimal(); showTab('garden'); return { minimal: document.documentElement.hasAttribute('data-minimal'), body: ($('#gardenBody') || { innerHTML: '' }).innerHTML.length, w: document.documentElement.scrollWidth <= 390 }; });
check('True Minimalist: the garden (and its shop) stays hidden, no overflow on a 390 px phone', mini.minimal && mini.body === 0 && mini.w, JSON.stringify(mini));
await M.ctx.close();
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
