// v1.14.3 cosmetics visibility re-check with two real accounts: A wears every aura (Solo and Squad for all 10 bosses,
// the streak aura, event, clan and raid auras), name colours, pictures (incl. boss and event ones), badge frames and the
// clan tag, one look after another; B checks each on the friends list, the global leaderboard, the clan member list and
// A's share link. (Every other place — friend profile/card, Friends leaderboard, Inbox, squad, battle log, challenges,
// event board, MVP, live table, feed, share image — is re-checked by v1141a with the same renderer.) Then unknown ids.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, focus, owner, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const A = await device('A'), B = await device('B');
await Promise.all([signup(A, 'va_' + R), signup(B, 'vb_' + R)]);
const [uA, uB] = await Promise.all([A, B].map(d => d.ev(() => USER.uid)));
await A.ev(n => sendRequest(n), 'vb_' + R); await wait(1500);
await B.ev(() => acceptRequest(incoming()[0].id)); await wait(1500);
await Promise.all([A, B].map(d => d.ev(() => { S.settings.globalBoard = true; S.settings.shareActivity = true; S.settings.shareNames = true; save(); })));
await A.ev(n => clanCreate({ name: n, tag: 'SEEN', desc: 'jee' }), 'Seen Crew ' + R);
await A.ev(() => clanSetDoc({ joinMode: 'open' }));
const cid = await A.ev(() => CLAN.id), code = await A.ev(() => CLAN.info.code);
await B.ev(c => clanByCode(c).then(clanJoinOpen), code);
// the clan at level 30 with every raid won, so A owns every clan and raid cosmetic
const raids = await A.ev(() => Object.fromEntries(RAID_BOSSES.map((r, i) => [`${2024 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`, r.id])));
await owner('clans/' + cid, { xp: 78300, level: 30, raids });
await A.ev(() => clanRefresh(true)); await wait(800);
await focus(A, 30); await wait(4000);
// what A will wear, look by look (auras, colours, pictures and frames cycle together)
const L = await A.ev(() => {
  const t = Date.now(), ids = c => ITEMS.filter(it => it.cat === c).map(it => it.id);
  const auras = ids('aura').filter(id => SPECIAL_AURAS[id]);
  const colors = ids('color').filter(id => /^col_(b_|c_|ev_)/.test(id) || EV_OF_ITEM[id]).concat(['col_teal', 'col_rose']);
  const avatars = ids('avatar').filter(id => /^av_b_/.test(id) || EV_OF_ITEM[id]).concat(['av_fox']);
  const frames = ids('frame').filter(id => id !== 'frame_none');
  for (const id of [...auras, ...colors, ...avatars, ...frames]) if (!ITEM_BY_ID[id].clanLv && !ITEM_BY_ID[id].clanRaid) S.game.grants[id] = { src: 'test', at: t };
  G = null; save();
  return { auras: ['streak', ...auras], colors, avatars, frames };
});
log(`looks to check: ${L.auras.length} auras, ${L.colors.length} colours, ${L.avatars.length} pictures, ${L.frames.length} frames`);
check('Every kind is covered: 20 boss auras (10 Solo + 10 Squad), the streak aura, event, clan and raid auras',
  L.auras.filter(a => /^au_b_/.test(a)).length === 20 && L.auras.includes('streak') && L.auras.some(a => /^au_c_/.test(a)) && L.auras.some(a => /^au_cr_/.test(a)) && L.auras.some(a => !/^au_(b|c|cr)_/.test(a) && a !== 'streak'));
const INSPECT = `window.lookIn = (el, w) => {
  if (!el) return { missing: true };
  const h = el.innerHTML, au = el.querySelector('.aura');
  return { aura: w.aura === 'streak' ? !!el.querySelector('.aura:not([class*="aura-x-"])') : !!el.querySelector('.aura-x-' + w.aura),
    squad: !!el.querySelector('.aura-sq'), color: !!el.querySelector('.nc-' + w.color) || (!NAME_GRADS[w.color] && [...el.querySelectorAll('[style*="color"]')].some(x => x.style.color && [NAME_COLORS[w.color], ink(NAME_COLORS[w.color])].some(c => { const t = document.createElement('i'); t.style.color = c; return t.style.color.replace(/\s/g, '') === x.style.color.replace(/\s/g, ''); })))   /* v2.0: the raw colour or its readable ink */, avatar: h.includes(avatarArt(w.avatar).slice(0, 60)),
    frame: h.includes(FRAMES[w.frame].slice(0, 40)), tag: el.textContent.includes('[' + w.tag + ']'), auraCls: au ? au.className : '' };
};`;
await B.ev(s => eval(s), INSPECT);
const n = Math.max(L.auras.length, L.colors.length, L.avatars.length, L.frames.length);
const bad = {};
// a streak for the streak aura: sessions on the last 8 days
await A.ev(() => { const now = Date.now(); for (let i = 1; i <= 8; i++) S.sessions.push({ id: 'stk' + i, name: 'Streak', start: now - i * 864e5, end: now - i * 864e5 + 80 * 60000, duration: 80 * 60000, planned: 80 * 60000, preset: 'Classic 25/5' }); G = null; save(); });
log('A’s streak for the streak aura:', await A.ev(() => game().streak.cur));
for (let i = 0; i < n; i++) {
  const w = { aura: L.auras[i % L.auras.length], color: L.colors[i % L.colors.length], avatar: L.avatars[i % L.avatars.length], frame: L.frames[i % L.frames.length], tag: 'SEEN' };
  await A.ev(w => { for (const [k, v] of [['aura', w.aura === 'streak' ? '' : w.aura], ['color', w.color], ['avatar', w.avatar], ['frame', w.frame]]) eqSet(k, v); G = null; applyCosmetics(); publishPublic(); syncMemberLook(); }, w);
  await wait(1600);
  const r = await B.ev(async ([u, w]) => {
    SOC.cache = {}; await loadFriendsPublic(true); S.ui.friendsView = 'friends'; SOC.friend = null; showTab('friends');
    const fr = lookIn(document.querySelector(`#friendsBody [data-open="${u}"]`), w);
    S.ui.lbScope = 'global'; S.ui.lbPeriod = 'week'; SOC.lb = {}; await loadLeaderboard('global', 'week', true); showTab('board');
    const lb = lookIn(document.querySelector(`#boardBody [data-uid="${u}"]`), w);
    await clanLoadDetails(true); showTab('clan');
    const cm = lookIn(document.querySelector(`[data-cmid="${u}"]`), w);
    return { fr, lb, cm };
  }, [uA, w]);
  const link = await A.ev(() => cardLink(cardData()));
  const sh = await B.ev(([l, w]) => { const d = parseCardHash(l.slice(l.indexOf('#'))), div = document.createElement('div'); div.innerHTML = cardHTML(d, 'shared'); return lookIn(div, w); }, [link, w]);
  const wantSq = /_sq$/.test(w.aura);
  const ok = (x, tag = true) => x && !x.missing && x.aura && x.squad === wantSq && x.color && x.avatar && x.frame && (!tag || x.tag);
  const res = { 'friends list': ok(r.fr), 'global leaderboard': ok(r.lb), 'clan members': ok(r.cm, false), 'share link': ok(sh) };
  for (const [k, v] of Object.entries(res)) if (!v) (bad[k] ||= []).push(`${w.aura}/${w.color}/${w.avatar}/${w.frame} ${JSON.stringify(k === 'share link' ? sh : r[{ 'friends list': 'fr', 'global leaderboard': 'lb', 'clan members': 'cm' }[k]])}`);
  if (i % 10 === 9) log(`…${i + 1}/${n} looks checked`);
}
for (const k of ['friends list', 'global leaderboard', 'clan members', 'share link'])
  check(`B sees every aura, name colour, picture and frame A wears (with the right Solo/Squad ring) — ${k}`, !bad[k], (bad[k] || []).slice(0, 4).join(' | '));
// a few looks side by side for the record
await A.ev(() => { eqSet('aura', 'au_b_sloth_sq'); eqSet('color', 'col_b_sloth'); eqSet('avatar', 'av_b_sloth_sq'); eqSet('frame', 'frame_orbit'); G = null; applyCosmetics(); publishPublic(); syncMemberLook(); }); await wait(1600);
await B.ev(async () => { SOC.cache = {}; await loadFriendsPublic(true); S.ui.friendsView = 'friends'; showTab('friends'); }); await wait(600);
await B.p.screenshot({ path: 's143/v1143c-friends.png' });
// unknown / missing ids fall back to the default look
await owner('publicProfiles/' + uA, { aura: 'au_from_the_future', color: 'col_nope', avatar: 'av_nope', frame: 'frame_nope' });
const fb = await B.ev(async u => { SOC.cache = {}; await loadFriendsPublic(true); showTab('friends'); const el = document.querySelector(`#friendsBody [data-open="${u}"]`); return el && { aura: !!el.querySelector('[class*="aura-x-"]'), pic: !!el.querySelector('.look-pic, svg'), text: el.textContent.includes('@va_') }; }, uA);
check('Unknown or missing ids (e.g. from a newer app) fall back to the default look, no errors', fb && !fb.aura && fb.pic && fb.text, JSON.stringify(fb));
log('errors', JSON.stringify(errs));
log('failures', failCount());
await b.close();
process.exit(failCount() || errs.length ? 1 : 0);
