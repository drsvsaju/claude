// v1.18 Phase 3 (guest part) — rewards for studying together and the long-term achievements: group stats from the
// session log (only blocks with someone else focusing count), coins with daily caps (new partners, clan-session
// blocks), the new achievements and their real rewards (titles, auras, frames, avatars, room poster, ring, stamps,
// decor, seeds, produce, eggs) given once and repaired, clan-session milestones, the achievements page (categories,
// sorting, progress, rewards), reward-only seeds and decor never for sale, every new cosmetic renders, demo.
import { b, wait, log, check, errs, failCount, SITE } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); localStorage.setItem('pomodorolist-tips-seen', JSON.stringify(['stats', 'reminders', 'quests', 'shop', 'friends', 'board', 'profile', 'settings', 'garden', 'room', 'clan', 'bag'])); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto(SITE + '/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2200); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
// a block at a table: day offset, hour, minutes, mates, extra fields
const SEED = `window.blk = (n, dayOff, hour, min, mates, extra = {}) => { const d = new Date(); d.setDate(d.getDate() - dayOff); d.setHours(hour, 0, 0, 0); const start = +d; return { id: 'gb' + n, name: 'Physics', start, end: start + min * 60000, duration: min * 60000, planned: min * 60000, preset: 'Classic 25/5', live: 'L' + (extra.lv || n), clan: extra.clan || '', ...(mates.length ? { mates } : {}), ...extra }; };`;
const G = await guest(1280, { tag: 'p3' });
await G.ev(s => eval(s), SEED);
// ---------- 1. group stats: solo tables count nothing; partners, caps ----------
const st = await G.ev(() => {
  const coins0 = earnedAt(Infinity);
  S.sessions.push(blk(1, 3, 10, 25, []), blk(2, 3, 11, 25, [], { hs: 1 }));   // a solo "group" session (and hosted): nothing for minutes
  GS = null; G = null;
  const solo = { ...groupStats(), coins: groupCoinsAt(Infinity) };   // (the normal 5 coins per session are not group coins)
  // 5 new partners on the same day: only 3 pay; a clan block with someone pays 2 coins
  S.sessions.push(blk(3, 2, 9, 25, ['u1', 'u2'], { hs: 1 }), blk(4, 2, 10, 25, ['u3', 'u4', 'u5']), blk(5, 1, 23, 50, ['u1'], { clan: 'c1', lv: 'C1' }));
  GS = null; G = null;
  const g = groupStats();
  return { solo: [solo.blocks, solo.min, solo.hosted.size, solo.coins], blocks: g.blocks, hours: g.hours, people: g.people.size, hosted: g.hosted.size, clanH: g.clanHours, night: g.night, table: g.table, coins: groupCoinsAt(Infinity), run: g.run };
});
check('A table where nobody else focused earns nothing (0 blocks, 0 minutes, 0 coins) — hosting it alone does not count either', st.solo.join() === '0,0,0,0', JSON.stringify(st.solo));
check('Group stats: 3 blocks together, 100 min, 5 study partners, a table of 4, a night block, 50 min in a clan session, 2 days in a row', st.blocks === 3 && Math.abs(st.hours - 100 / 60) < 1e-9 && st.people === 5 && st.table === 4 && st.night === 1 && Math.abs(st.clanH - 50 / 60) < 1e-9 && st.run === 2, JSON.stringify(st));
check('Coins: 5 new partners on one day pay 3 × 10 (the daily cap), the clan block with someone pays 2 — 32 coins', st.coins === 32, String(st.coins));
const capClan = await G.ev(() => { const before = groupCoinsAt(Infinity); for (let i = 0; i < 8; i++) S.sessions.push(blk(100 + i, 0, 9, 25, ['u1'], { clan: 'c1', lv: 'C1' })); GS = null; G = null; return groupCoinsAt(Infinity) - before; });
check('Clan-session blocks with someone pay 2 coins each, at most 10 a day (8 blocks today → 10)', capClan === 10, String(capClan));
// ---------- 2. achievements: claimed with their rewards, once ----------
const ach = await G.ev(() => {
  reconcileRewards('quiet'); G = null; GD = null;
  const cl = S.game.claims.achievements, got = id => !!cl[id];
  const gr = S.game.grants, gb = S.gbuys;
  return { first: got('g_first'), host: got('g_host'), p5: got('g_p5'), table4: got('g_table4'), night: got('g_night'), run3: got('g_run3'), h1: got('g_h1'),
    title: !!gr.ti_study_buddy && gr.ti_study_buddy.src === 'ach:g_p5', hostTitle: !!gr.ti_host, stamp: !!gr.stamp_g_table && !!gr.stamp_g_owl, aura: !!gr.au_g_kindred,
    picnic: gb.filter(x => x.item === 'dc_g_picnic').length, owned: isOwned('ti_study_buddy') && isOwned('au_g_kindred') };
});
check('Claimed: Better together, Host, Study Buddy (5 partners), Full table (4), Night shift, An hour together, Three in a row (two days ago, yesterday, today)', ach.first && ach.host && ach.p5 && ach.table4 && ach.night && ach.h1 && ach.run3, JSON.stringify(ach));
check('Their rewards are given: the Study Buddy and Host titles, the Full-table and Night-shift stamps, the Kindred aura (owned now), one Picnic blanket in the garden', ach.title && ach.hostTitle && ach.stamp && ach.aura && ach.owned && ach.picnic === 1, JSON.stringify(ach));
const again = await G.ev(() => { const n = S.gbuys.length, g = Object.keys(S.game.grants).length; reconcileRewards('quiet'); reconcileRewards('quiet'); return { gbuys: S.gbuys.length - n, grants: Object.keys(S.game.grants).length - g }; });
check('Reconciling again gives nothing twice', again.gbuys === 0 && again.grants === 0, JSON.stringify(again));
const repair = await G.ev(() => { delete S.game.grants.ti_study_buddy; S.gbuys = S.gbuys.filter(x => x.item !== 'dc_g_picnic'); reconcileRewards('quiet'); return { title: !!S.game.grants.ti_study_buddy, picnic: S.gbuys.filter(x => x.item === 'dc_g_picnic').length }; });
check('A reward missing for a claimed achievement (a device that missed it) is given again — once', repair.title && repair.picnic === 1, JSON.stringify(repair));
// produce, seeds, an egg
const more = await G.ev(() => {
  if (typeof gardenMig === 'function' && !gardenMig()) { gardenMigrate(); }
  GD = null; const p0 = garden().produce, eggs0 = (S.eggs || []).length;
  for (let i = 0; i < 6; i++) S.sessions.push(blk(200 + i, 10 - i, 13, 25, ['u9'], { lv: 'W' + i, hs: 1 }));   // 6 hosted sessions on 6 days in a row … weekend ones among them
  for (let i = 0; i < 5; i++) { const s = blk(300 + i, 20 + i * 7, 10, 25, ['u8']); const d = new Date(s.start); const back = (d.getDay() + 1) % 7; s.start -= back * 864e5; s.end -= back * 864e5; S.sessions.push(s); }   // 5 Saturday blocks
  GS = null; G = null; GD = null;
  reconcileRewards('quiet'); G = null; GD = null;
  const cl = S.game.claims.achievements;
  return { host5: !!cl.g_host5, egg: (S.eggs || []).some(e => e.id === 'egg_ach_g_host5' && e.kind === 'rare'), eggs: (S.eggs || []).length - eggs0, wknd: !!cl.g_wknd5, days7: !!cl.g_days7, seeds: (garden().seeds.lavender || []).length, produce: garden().produce - p0 };
});
check('Hosting 5 sessions gives a rare egg; 5 weekend blocks give 40 produce; 7 days give 2 lavender seeds', more.host5 && more.egg && more.wknd && more.days7 && more.seeds >= 2 && more.produce >= 40, JSON.stringify(more));
// ---------- 3. garden achievements ----------
const gd = await G.ev(() => {
  GD = null; const p0 = garden().produce;
  S.plants.push({ id: 'gx1', v: 1, sp: 'tomato', plot: -1, seed: '', at: Date.now() - 9e6, sk: 0, wt: 70, fin: 'x', fd: 25, h: Date.now() - 1e6, y: 9, m: 'golden', wm: ['shocked', 'moonlit'], giant: 1, kg: 0.6, u: Date.now() });
  GD = null; reconcileRewards('quiet'); G = null; GD = null;
  const cl = S.game.claims.achievements;
  return { giant: !!cl.gd_giant, star5: !!cl.gd_star5, five: !!S.game.grants.ti_five_star, produce: garden().produce - p0, stars: cropStars(S.plants.find(p => p.id === 'gx1')) };
});
check('A Giant golden crop with two weather mutations: Giant! (+25 produce) and Five stars (Five-Star Farmer title)', gd.giant && gd.star5 && gd.five && gd.produce >= 25 && gd.stars === 5, JSON.stringify(gd));
// ---------- 4. clan-session milestones ----------
const cm = await G.ev(() => {
  for (let i = 0; i < 6; i++) S.sessions.push(blk(400 + i, 5, 8 + i, 55, ['u2'], { clan: 'c1', lv: 'C2' }));   // 5.5 h in clan sessions with someone
  GS = null; G = null; GD = null; reconcileRewards('quiet'); G = null; GD = null;
  return { m5: !!S.game.claims.achievements.c_m5, clover: (garden().seeds.clanclover || []).length, m15: !!S.game.claims.achievements.c_m15 };
});
check('5 hours in clan sessions with a clanmate: Clan regular, two Clan clover seeds (clan-exclusive)', cm.m5 && cm.clover === 2 && !cm.m15, JSON.stringify(cm));
const notForSale = await G.ev(() => ({ seed: gardenBuy('seed_clanclover'), decor: gardenBuy('dc_g_lights'), featured: (typeof featuredSeeds === 'function' ? featuredSeeds() : []).some(sp => sp.shop === 'reward'), daily: (typeof dailySeed === 'function' ? dailySeed() : {}).shop === 'reward', shopLists: (() => { S.ui.gardenView = 'decor'; showTab('garden'); renderGarden(); return $$('.gd-item[data-id]').map(x => x.dataset.id); })() }));
check('Reward-only seeds and decor are never for sale: buying them is refused, they are not in the featured or daily slots, unwon decor is hidden and won decor shows', notForSale.seed === false && notForSale.decor === false && !notForSale.featured && !notForSale.daily && !notForSale.shopLists.includes('dc_g_lights') && notForSale.shopLists.includes('dc_g_picnic'), JSON.stringify(notForSale));
// ---------- 5. the profile: group card, achievements page ----------
const page = await G.ev(() => {
  showTab('profile'); renderProfile && renderProfile(); renderProgress();
  const pv = $('#progressView'), card = pv.querySelector('.group-card');
  const cats = $$('#achCats [data-achcat]').map(b => b.dataset.achcat).join();
  const all = pv.querySelectorAll('.ach').length;
  $('#achCats [data-achcat="group"]').click();
  const group = $$('#progressView .ach').length, allGroup = $$('#progressView .ach').every(x => ACH_BY_ID[x.dataset.ach].cat === 'group');
  $('#achSort').value = 'close'; $('#achSort').dispatchEvent(new Event('change', { bubbles: true }));
  const flags = $$('#progressView .ach').map(x => x.classList.contains('done')), firstDone = flags.indexOf(true), lastOpen = flags.lastIndexOf(false);
  const bars = $$('#progressView .ach:not(.done) .ap').length === $$('#progressView .ach:not(.done)').length;
  const gift = ($('#progressView .ach[data-ach="g_h10"] .ach-gift') || {}).textContent || '';
  $('#achCats [data-achcat="all"]').click();
  return { card: !!card, cardText: card ? card.textContent.replace(/\s+/g, ' ') : '', cats, all, group, allGroup, order: firstDone > lastOpen, bars, gift };
});
check('The profile shows "Studying together" (hours, partners, hosted) and the clan milestones with the next reward', page.card && /Studying together/.test(page.cardText) && /study partners/.test(page.cardText) && /15 h/.test(page.cardText) && /Clan crest stamp/.test(page.cardText), page.cardText.slice(0, 300));
check('The achievements page has category filters (All · Focus · Streaks · Together · Clan · Garden · Shop), sorting (closest to done puts the unfinished first), a progress bar on every unfinished one and the reward named', page.cats === 'all,focus,streak,group,clan,garden,shop' && page.all >= 60 && page.group === 21 && page.allGroup && page.order && page.bars && /Linked frame/.test(page.gift), JSON.stringify(page));
// ---------- 6. every new cosmetic renders without errors ----------
const cos = await G.ev(() => {
  const ids = ['ti_host', 'ti_table_host', 'ti_study_buddy', 'ti_social_scholar', 'ti_campus_legend', 'ti_clan_scholar', 'ti_five_star', 'ti_market', 'au_g_kindred', 'au_clan', 'au_g_storm', 'au_g_bloom', 'frame_g_link', 'frame_g_banner', 'av_g_duo', 'av_g_star', 'poster_g_together', 'ring_g_orbit', 'stamp_g_table', 'stamp_g_owl', 'stamp_clan'];
  const now = Date.now(); for (const id of ids) S.game.grants[id] ||= { src: 'test', at: now }; G = null;
  const bad = [];
  for (const id of ids) { const it = ITEM_BY_ID[id]; if (!it) { bad.push(id + ':missing'); continue; } try { const h = previewFor(it, game()); if (!h || /undefined/.test(h)) bad.push(id + ':preview'); } catch (e) { bad.push(id + ':' + e.message); } }
  for (const [cat, id] of [['aura', 'au_clan'], ['frame', 'frame_g_banner'], ['avatar', 'av_g_duo'], ['ring', 'ring_g_orbit'], ['stamp', 'stamp_clan'], ['title', 'ti_clan_scholar']]) { S.game.equipped[cat] = id; }
  G = null; save(); applyCosmetics(); renderAll();
  const ring = $('#ring') && $('#ring').classList.contains('rs-orbit'), title = ($('#lvChip') || {}).title || '';
  showTab('bag'); const bag = $$('.bag-grid .item, #bagBody .item').length;
  const decor = Object.keys(DECOR_ART).filter(k => k.startsWith('dc_g_')).length, art = ['dc_g_picnic', 'dc_g_lights', 'dc_g_sundial', 'dc_g_trophy', 'dc_g_windmill'].every(k => /<svg/.test(DECOR_ART[k]));
  const plant = ['clanclover', 'clanrose'].every(sp => /<svg/.test(plantArt(GSP_BY_ID[sp], 4, '')));
  return { bad, ring, title: /Clan Scholar/.test(title), bag, decor, art, plant };
});
check('All 21 new cosmetics exist and preview; equipping the Clan guard aura, Clan banner frame, Study duo avatar, Orbit ring, Clan crest stamp and the Clan Scholar title works (ring class, header title)', cos.bad.length === 0 && cos.ring && cos.title, JSON.stringify(cos));
check('The five reward decor pieces and the two clan species draw', cos.decor === 5 && cos.art && cos.plant, JSON.stringify(cos));
await G.ctx.close();
// ---------- 7. demo: the page renders and nothing is stored ----------
const D = await guest(1280, { noLogin: true, tag: 'demo' });
await D.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600);
const demo = await D.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('profile'); renderProgress(); const ls = Object.keys(localStorage).filter(k => /focus-app|pomodorolist-state/.test(k)).length; return { pv: isPreview(), achs: $$('#progressView .ach').length, card: !!$('#progressView .group-card'), ls }; });
check('Demo: the achievements page and the Studying-together card render; nothing is stored', demo.pv && demo.achs >= 60 && demo.card && demo.ls === 0, JSON.stringify(demo));
await D.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
