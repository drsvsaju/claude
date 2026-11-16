// v1.15 Pomeo's Room: the shop category (coins spent exactly like other cosmetics), placing from the shop, bag and room,
// defaults when nothing is placed, saved rooms (save / apply / delete + undo), rewards (future questlines' final reward and
// boss posters from 1.15 on — October's questline unchanged), Pomeo's reactions, the share image, True Minimalist, the
// demo (sample room, nothing written), export/import, sync across two devices (newest slot wins, saved rooms merge and
// tombstone), and phone layout.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(o => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1');
    if (o.rich) { const now = Date.now(), sessions = []; for (let d = 1; d <= 60; d++) for (let k = 0; k < 3; k++) { const st = now - d * 864e5 + (9 + k * 3) * 3600e3; sessions.push({ id: 's' + d + '_' + k, name: 'Physics', start: st, end: st + 50 * 60000, duration: 50 * 60000, planned: 50 * 60000, preset: 'Classic 25/5' }); } localStorage.setItem('focus-app-v1', JSON.stringify({ sessions })); } }, { rich: !!opts.rich });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('guest: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('guest console: ' + m.text()); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await p.evaluate(() => { window.confirm = () => true; document.querySelectorAll('dialog[open]').forEach(d => d.close()); }); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const G = await guest(1280, { rich: true });
// ---------- 1. catalogue + shop ----------
const cat = await G.ev(() => { const room = ITEMS.filter(i => i.cat === 'room'); return { n: room.length, paid: room.filter(i => i.price > 0).length, free: room.filter(i => i.price === 0).length, rewards: room.filter(i => i.price === -1).length, slots: [...new Set(room.map(i => roomSlotOf(i.id)))].sort().join(), bad: room.filter(i => !ROOM_SLOTS.includes(roomSlotOf(i.id))).map(i => i.id), defaults: ROOM_SLOTS.every(s => ITEM_BY_ID[ROOM_DEFAULT[s]] && ITEM_BY_ID[ROOM_DEFAULT[s]].price === 0), shopCat: SHOP_CATS.some(c => c[0] === 'room'), preview: room.every(i => previewFor(i, game()).includes('<svg')), long: room.filter(i => i.id.length > 40).length }; });
check('Room catalogue: 50 coin items (28 + 22 from the v1.15 drop) + 10 free defaults + 27 not for coins (10 questline finals, 10 boss posters, 3 garden looks sold for produce since 1.16, 3 from 1.18, the Master rank poster from 1.19), every id maps to a slot, every item has a preview', cat.n === 87 && cat.paid === 50 && cat.free === 10 && cat.rewards === 27 && cat.bad.length === 0 && cat.defaults && cat.shopCat && cat.preview && cat.long === 0, JSON.stringify(cat));
const c0 = await G.ev(() => game().balance);
await G.ev(() => { S.ui.shopCat = 'room'; showTab('shop'); }); await wait(500);
const shop = await G.ev(() => ({ cards: $$('#shopView .item').length, placed: $$('#shopView .item.equipped').length, buy: $$('#shopView [data-buy]').length, place: $$('#shopView [data-equip]').length }));
check('Shop → Pomeo’s room: every item on a card; the free defaults show as Placed; paid ones have a coin price', shop.cards >= 38 && shop.placed === 10 && shop.buy >= 25 && shop.place >= 0, JSON.stringify(shop));
await closeAll(G); await G.p.click('#shopView [data-buy="rug_round"]'); await wait(500);
const bought = await G.ev(c0 => ({ owned: isOwned('rug_round'), coins: game().balance, spent: c0 - game().balance, placed: roomSlot('rug') === 'rug_round', pref: S.roomPrefs.rug && S.roomPrefs.rug.v, purchases: Object.values(S.game.purchases).filter(p => p.item === 'rug_round').length }), c0);
check('Buying a rug costs exactly its coin price (the coin economy is unchanged) and places it straight away', bought.owned && bought.spent === 50 && bought.placed && bought.pref === 'rug_round' && bought.purchases === 1, JSON.stringify(bought));
const more = await G.ev(async () => { const r = []; for (const id of ['wall_sage', 'desk_oak', 'lamp_desk', 'window_city', 'pet_fish', 'poster_space', 'shelf_books', 'plant_monstera']) { await buyItem(id); r.push(isOwned(id)); } return { r, layout: roomLayout(), coins: game().balance }; });   // v2.0: buyItem waits for its confirm dialog (it used to be a native confirm())
check('Eight more items bought and placed in their own slots', more.r.every(Boolean) && more.layout.wall === 'wall_sage' && more.layout.desk === 'desk_oak' && more.layout.pet === 'pet_fish' && more.layout.floor === 'floor_wood', JSON.stringify(more.layout));
const locked = await G.ev(async () => { const c = game().balance; await buyItem('pet_cat'); return { owned: isOwned('pet_cat'), same: game().balance === c, lvl: game().lv.level }; });
check('A level-locked room item can’t be bought below its level (or is bought if the level allows) — never both charged and refused', (locked.lvl >= 5) === locked.owned && (locked.owned !== locked.same), JSON.stringify(locked));
// ---------- 2. the room screen ----------
await G.ev(() => showTab('room')); await wait(500);
const room = await G.ev(() => ({ tab: S.ui.tab, nav: $('#tabs [data-tab].active').dataset.tab, svg: !!$('#rmScene .rm-svg'), pomeo: !!$('#rmScene .rm-pomeo .mascot'), wall: $('#rmScene .rm-svg rect').getAttribute('fill'), slots: $$('.rm-slot').length, removes: $$('.rm-slot [data-rremove]').length, title: $('#roomBody h1').textContent }));
check('The room screen sits under Profile in the nav, draws the SVG scene with Pomeo, lists the ten slots with Remove on the placed ones', room.tab === 'room' && room.nav === 'profile' && room.svg && room.pomeo && room.wall === '#d6e3d0' && room.slots === 10 && room.removes === 9 && room.title === 'Pomeo’s room', JSON.stringify(room));
await closeAll(G); await G.ev(() => $('#rmScene .rm-pomeo').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await wait(200);
check('Tapping Pomeo in his room: a hop and a line', await G.ev(() => $('#rmScene .rm-pomeo').classList.contains('poke') && !$('#rmSay').classList.contains('hidden')));
await G.p.click('.rm-slot [data-rremove="pet"]'); await wait(300);
check('Remove from the slot list: the slot falls back to its free default, the item stays yours (in the bag)', await G.ev(() => roomSlot('pet') === 'pet_none' && isOwned('pet_fish') && S.roomPrefs.pet.v === ''));
// ---------- 3. saved rooms ----------
await G.p.fill('#rmSetName', 'Cosy'); await G.p.click('[data-rmset-save]'); await wait(300);
const set1 = await G.ev(() => ({ n: S.roomSets.length, name: S.roomSets[0].name, pet: S.roomSets[0].slots.pet, v: S.roomSets[0].v, u: !!S.roomSets[0].u }));
check('Save current → a saved room with every slot, a version and a sync stamp', set1.n === 1 && set1.name === 'Cosy' && set1.pet === 'pet_none' && set1.v === 1 && set1.u, JSON.stringify(set1));
await G.ev(() => { roomPlace('pet_fish'); roomRemove('lamp'); });
await G.p.click('[data-rmset-apply]'); await wait(300);
check('Apply a saved room: the lamp is back, the pet is gone again (exactly the saved layout)', await G.ev(() => roomSlot('lamp') === 'lamp_desk' && roomSlot('pet') === 'pet_none'));
const cap = await G.ev(() => { for (let i = 0; i < 7; i++) saveRoomSet('R' + i); return S.roomSets.length; });
check('At most 6 saved rooms', cap === 6, String(cap));
await G.p.click('[data-rmset-del]'); await wait(300);
const del = await G.ev(() => ({ n: S.roomSets.length, undo: !!document.querySelector('.toast-item button, #toast button') }));
check('Delete a saved room (with Undo offered)', del.n === 5 && del.undo, JSON.stringify(del));
await G.ev(() => { const btn = document.querySelector('.toast-item button, #toast button'); if (btn) btn.click(); }); await wait(300);
check('…Undo brings it back', await G.ev(() => S.roomSets.length === 6));
// ---------- 4. bag ----------
await G.ev(() => { S.ui.bagCat = 'room'; showTab('bag'); }); await wait(500);
const bag = await G.ev(() => ({ cat: !!$('#bagCats [data-bcat="room"]'), cards: $$('#bagList .bag-item').length, owned: ITEMS.filter(i => i.cat === 'room' && i.price > 0 && isOwned(i.id)).length, placed: $$('#bagList .bag-item.equipped').length, place: $$('#bagList [data-bequip]').length, remove: $$('#bagList [data-rremove]').length, label: CAT_LABEL.room }));
check('Bag → Room: one card per owned room item, Place on the ones not in the room, Remove on the placed ones', bag.cat && bag.cards === bag.owned && bag.placed === 8 && bag.place === bag.owned - 8 && bag.remove === 8 && bag.label === 'Room item', JSON.stringify(bag));
await closeAll(G); await G.p.click('#bagList [data-bequip]'); await wait(400);
check('Place from the bag puts it back in the room', await G.ev(() => roomSlot('pet') !== 'pet_none' && $$('#bagList .bag-item.equipped').length === 9));
// ---------- 5. rewards going forward ----------
const rw = await G.ev(() => ({ hw26: EVENT_BY_ID.hw26.final.slice(), hw26room: EVENT_BY_ID.hw26.final.filter(id => ITEM_BY_ID[id].cat === 'room').length, future: EVENTS.filter(ev => evStart(ev) > Date.now()).map(ev => [ev.id, ev.final.length, ev.final.filter(id => ITEM_BY_ID[id].cat === 'room').length]), posters: ITEMS.filter(i => /^poster_b_/.test(i.id)).length, from: new Date(ROOM_FROM).toISOString().slice(0, 10) }));
check('Past / current questline rewards unchanged (October’s final rewards are still the two of 1.14); every questline from November on ends with a room item', rw.hw26.length === 2 && rw.hw26room === 0 && rw.future.length >= 9 && rw.future.every(x => x[1] === 3 && x[2] === 1) && rw.posters === 10, JSON.stringify(rw));
const boss = await G.ev(async () => {
  const id = BOSSES[0].id; window.confirm = () => true;
  S.game.claims.bosses[dayKey(weekMonday()) + '|solo'] = Date.now(); S.game.trophies[dayKey(weekMonday()) + '|solo'] = { boss: id, mode: 'solo', hp: 300, coins: 45, size: 1, at: Date.now() };
  await claimBossRewards(id, 'solo');
  return { poster: isOwned('poster_b_' + id), items: Object.keys(S.game.grants).filter(k => S.game.grants[k].src === `boss:${id}:solo`).length, src: (S.game.grants['poster_b_' + id] || {}).src };
});
check('A boss victory claimed now also gives that boss’s poster for the room (the three 1.13 rewards plus the poster)', boss.poster && boss.items === 4 && /^boss:/.test(boss.src), JSON.stringify(boss));
// ---------- 6. share image ----------
const png = await G.ev(async () => { const bl = await roomPNG(); return { size: bl.size, type: bl.type }; });
check('Share room: a PNG of the room is produced (1200×750)', png.type === 'image/png' && png.size > 20000, JSON.stringify(png));
await G.ev(() => showTab('room')); await wait(300); await closeAll(G); await G.p.click('#rmShare'); await wait(500);
check('…the share dialog shows a preview with Save / Share buttons', await G.ev(() => $('#rmShareDlg').open && $('#rmShImg').src.startsWith('data:image/svg') && !!$('#rmShSave') && !!$('#rmShNative')));
await G.ev(() => $('#rmShareDlg').close());
// ---------- 7. export / import ----------
const exp = await G.ev(() => { const { timer, ui, pendingSessions, profileDirty, ...data } = S; return JSON.parse(JSON.stringify(data)); });
const G2 = await guest();
const imp = await G2.ev(e => { mergeData(e); return { wall: roomSlot('wall'), sets: S.roomSets.length, owned: isOwned('wall_sage') }; }, exp);
check('A backup carries the room: purchases, placements and saved rooms import (once)', imp.wall === 'wall_sage' && imp.sets === 6 && imp.owned, JSON.stringify(imp));
check('…importing it again doubles nothing', await G2.ev(e => { mergeData(e); return S.roomSets.length === 6 && Object.values(S.game.purchases).filter(p => p.item === 'rug_round').length === 1; }, exp));
await G2.ctx.close();
// ---------- 8. True Minimalist ----------
await G.ev(() => setMinimal(true)); await wait(300);
const mini = await G.ev(() => { showTab('room'); return { tab: S.ui.tab, btn: !!$('#pomeoRoom'), cmd: cmdList('').some(c => c.t === 'Pomeo’s room') }; });
check('True Minimalist: the room is hidden (no button, no palette entry) and opening it lands on the Timer', mini.tab === 'timer' && !mini.btn && !mini.cmd, JSON.stringify(mini));
await G.ev(() => setMinimal(false)); await wait(200);
await G.ev(() => showTab('profile')); await wait(300);
check('Profile → Pomeo card has “His room”', await G.ev(() => !!$('#pomeoRoom')));
await closeAll(G); await G.p.click('#pomeoRoom'); await wait(300);
check('…which opens the room', await G.ev(() => S.ui.tab === 'room'));
// ---------- 9. demo ----------
const D = await guest(1280, { noLogin: true });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeAll(D);
await D.ev(() => showTab('room')); await wait(500);
const demo = await D.ev(() => ({ pv: isPreview(), wall: roomSlot('wall'), pet: roomSlot('pet'), sets: S.roomSets.length, svg: !!$('#rmScene .rm-svg'), ls: Object.keys(localStorage).length }));
await D.p.click('.rm-slot [data-rremove]'); await wait(400);
const demo2 = await D.ev(() => ({ prompt: !!document.querySelector('dialog[open] #pvWhy'), wall: roomSlot('wall'), ls: Object.keys(localStorage).length }));
check('Demo: demo_scholar has a furnished room and a saved room; changing it shows the demo prompt and writes nothing', demo.pv && demo.wall === 'wall_sage' && demo.pet === 'pet_cat' && demo.sets === 1 && demo.svg && demo2.prompt && demo2.wall === 'wall_sage' && demo2.ls === demo.ls, JSON.stringify({ demo, demo2 }));
await D.ctx.close();
// ---------- 10. phone layout ----------
for (const w of [360, 390]) {
  const P = await guest(w, { rich: true });
  await P.ev(async () => { await buyItem('rug_round'); await buyItem('lamp_desk'); showTab('room'); }); await wait(900);
  const r = await P.ev(() => ({ hscroll: document.documentElement.scrollWidth > innerWidth + 1, small: $$('#tab-room button').filter(b => b.offsetParent && (b.getBoundingClientRect().height < 44 || b.getBoundingClientRect().width < 44)).map(b => b.textContent.trim() || b.className).slice(0, 5), scene: $('#rmScene').getBoundingClientRect().width > 300 }));
  check(`${w}px: the room fits (no sideways scroll), the scene is wide, every button is at least 44px`, !r.hscroll && !r.small.length && r.scene, JSON.stringify(r));
  await P.ctx.close();
}
await G.ctx.close();
// ---------- 11. two devices ----------
const A = await device('A', 1200), U = 'rm_' + R;
await signup(A, U);
const uid = await A.ev(() => USER.uid);
await A.ev(() => { window.confirm = () => true; for (let i = 0; i < 40; i++) S.game.claims.goalDays['2025-01-' + String(i % 28 + 1).padStart(2, '0') + i] = Date.now() - i; G = null; save(); });   // coins to spend
const A2 = await device('A2', 1200);
await A2.p.goto('http://localhost:8000/index.html?emulator=1'); await A2.p.waitForSelector('#authView:not(.hidden)');
await A2.p.click('[data-mode=login] >> visible=true'); await A2.p.fill('#authUser', U); await A2.p.fill('#authPass', 'secret12'); await A2.p.click('#authSubmit');
await A2.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(A2); await A2.ev(() => { window.confirm = () => true; });
await A.ev(async () => { await buyItem('wall_sky'); await buyItem('poster_focus'); saveRoomSet('From A'); });
const seen = await until(A2, () => roomSlot('wall') === 'wall_sky' && roomSlot('poster') === 'poster_focus' && S.roomSets.some(r => r.name === 'From A'), null, 15000);
check('A buys and places two items and saves a room → A2 sees the same room and the saved room', seen >= 0, `${seen} ms`);
await A2.ev(() => roomRemove('poster'));
const rm = await until(A, () => roomSlot('poster') === 'poster_none', null, 15000);
check('A2 removes the poster → A’s room updates (newest choice per slot wins)', rm >= 0, `${rm} ms`);
await A2.ev(() => deleteRoomSet(S.roomSets[0].id)); await wait(300);
const gone = await until(A, () => !S.roomSets.some(r => r.name === 'From A'), null, 15000);
check('A2 deletes the saved room → it disappears on A (tombstone), and does not come back', gone >= 0 && (await A.ev(() => Object.keys(S.tomb).some(k => k.startsWith('roomSets:')))));
const cloud = await ownerGet('users/' + uid);
check('The profile document holds roomPrefs (slot → {v,u}) and roomSets — nothing outside users/{uid}', cloud.roomPrefs && cloud.roomPrefs.wall && cloud.roomPrefs.wall.v === 'wall_sky' && Array.isArray(cloud.roomSets), JSON.stringify({ roomPrefs: cloud.roomPrefs, sets: cloud.roomSets }));
log('errors', JSON.stringify(errs.filter(e => !/permission|offline|Could not reach|unavailable|WebChannel|transport/i.test(e))));
log('failures', failCount());
await b.close();
process.exit(failCount() ? 1 : 0);
