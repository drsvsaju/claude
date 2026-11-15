// v1.14.1 cosmetics: what A wears is what B sees — everywhere. Two real accounts (plus A's second device):
// friends list, friend profile + card, leaderboards, Inbox, squad portraits + battle log, challenges, event board,
// clan members / MVP board / live table / feed, share link + image; True Minimalist; unknown ids; equip sync.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, focus } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const A = await device('A'), B = await device('B');
await Promise.all([signup(A, 'aa_' + R), signup(B, 'bb_' + R)]);
const [uA, uB] = await Promise.all([A, B].map(d => d.ev(() => USER.uid)));
await A.ev(n => sendRequest(n), 'bb_' + R); await wait(1500);
await B.ev(() => acceptRequest(incoming()[0].id)); await wait(1500);
await Promise.all([A, B].map(d => d.ev(() => { S.settings.globalBoard = true; S.settings.shareActivity = true; S.settings.shareNames = true; save(); })));
// A: a clan, a full look (Sloth squad aura, squad name colour + avatar, a frame), a focus block this week
await A.ev(n => clanCreate({ name: n, tag: 'LOOK', desc: 'jee' }), 'Look Crew ' + R);
await A.ev(() => clanSetDoc({ joinMode: 'open' }));
const code = await A.ev(() => CLAN.info.code);
await B.ev(c => clanByCode(c).then(clanJoinOpen), code);
await A.ev(() => {
  const t = Date.now();
  for (const [id, src] of [['au_b_sloth', 'boss:sloth:solo'], ['au_b_sloth_sq', 'boss:sloth:squad'], ['col_b_sloth', 'boss:sloth:squad'], ['av_b_sloth_sq', 'boss:sloth:squad'], ['frame_orbit', 'ach:x']]) S.game.grants[id] = { src, at: t };
  G = null; bagEquip('au_b_sloth_sq'); bagEquip('col_b_sloth'); bagEquip('av_b_sloth_sq'); bagEquip('frame_orbit');
});
await focus(A, 30);
await wait(4000);
// the leaderboard copy gets the aura once the profile write has confirmed it (a second publish ~1.5 s later): wait for it, not a fixed time
await A.p.waitForFunction(() => { try { return JSON.parse(lastPub.publicStats || 'null')?.aura === 'au_b_sloth_sq'; } catch (e) { return false; } }, null, { timeout: 20000 }).catch(() => {});
const WANT = { aura: 'au_b_sloth_sq', color: 'col_b_sloth', avatar: 'av_b_sloth_sq', frame: 'frame_orbit', tag: 'LOOK' };
check('A: the clan tag is on by default for clan members', await A.ev(() => clanTagOn()));
check('A: the public profile and leaderboard copy carry the whole look', await A.ev(w => { const p = JSON.parse(lastPub.publicProfiles), s = JSON.parse(lastPub.publicStats); return [p, s].every(d => d.aura === w.aura && d.color === w.color && d.avatar === w.avatar && d.frame === w.frame && d.clanTag === w.tag); }, WANT));
// in-page inspector: what does a piece of the page show?
const INSPECT = `window.lookIn = (el, w) => {
  if (!el) return { missing: true };
  const h = el.innerHTML, au = el.querySelector('.aura');
  return { aura: !!el.querySelector('.aura-x-' + w.aura), squad: !!el.querySelector('.aura-sq.aura-shim'), color: !!el.querySelector('.nc-' + w.color),
    avatar: h.includes(avatarArt(w.avatar).slice(0, 60)), frame: h.includes(FRAMES[w.frame].slice(0, 40)), tag: el.textContent.includes('[' + w.tag + ']'), auraCls: au ? au.className : '' };
};`;
await B.ev(s => eval(s), INSPECT); await A.ev(s => eval(s), INSPECT);
const full = (r, { tag = true } = {}) => r && !r.missing && r.aura && r.squad && r.color && r.avatar && r.frame && (!tag || r.tag);
const results = {};
const see = async (label, fn, opt) => { const r = await B.ev(fn, [uA, WANT]); results[label] = r; check(`B sees A’s full look — ${label}`, full(r, opt), JSON.stringify(r)); };

// ---------- friends ----------
await B.ev(() => { SOC.cache = {}; showTab('friends'); }); await wait(2500);
await see('friends list', ([u, w]) => lookIn(document.querySelector(`#friendsBody [data-open="${u}"]`), w));
await B.ev(u => openFriend(u), uA); await wait(2500);
await see('friend profile', ([u, w]) => lookIn(document.querySelector('.fp-head'), w));
await B.ev(() => { SOC.friend.tab = 'card'; renderFriends(); }); await wait(800);
await see('friend’s profile card', ([u, w]) => lookIn(document.querySelector('.pc-friend'), w));
// ---------- leaderboards ----------
for (const [scope, period] of [['friends', 'week'], ['global', 'day']]) {
  await B.ev(([s, p]) => { SOC.friend = null; S.ui.lbScope = s; S.ui.lbPeriod = p; SOC.lb = {}; showTab('board'); }, [scope, period]); await wait(2500);
  await see(`${scope} leaderboard`, ([u, w]) => lookIn(document.querySelector(`#boardBody [data-uid="${u}"]`), w));
}
// ---------- inbox (kudos) ----------
await A.ev(u => sendReaction(u, 'kudos', '🔥', 'st_' + dayKey(new Date())), uB); await wait(2500);
await B.ev(() => openInbox()); await wait(600);
await see('Inbox (kudos)', ([u, w]) => lookIn([...document.querySelectorAll('#ibBody .ib-item')].find(li => li.querySelector('.ib-ic .look-pic')), w), { tag: false });
await closeDlg(B);
// ---------- squad portraits + battle log ----------
await B.ev(([u, n]) => { S.squad = [{ uid: u, name: n }]; S.settings.bossMode = 'squad'; S.ui.questView = 'boss'; save(); showTab('quests'); return loadSquadStats(true); }, [uA, 'aa_' + R]); await wait(3000);
await B.ev(() => renderQuests()); await wait(500);
await see('boss squad portraits', ([u, w]) => lookIn([...document.querySelectorAll('.squad-list.portraits li')].find(li => li.textContent.includes('@aa_')), w));
await see('boss battle log', ([u, w]) => lookIn([...document.querySelectorAll('.blog li')].find(li => li.textContent.includes('@aa_')), w), { tag: false });
// ---------- challenges ----------
await A.ev(() => startChallenge(Object.keys(CHALLENGES)[0])); await wait(1500);
await B.ev(() => { S.ui.friendsView = 'challenges'; SOC.challenges = null; showTab('friends'); }); await wait(2500);
await B.ev(() => { const j = document.querySelector('[data-join]'); if (j) j.click(); }); await wait(2000);
await B.ev(() => renderFriends()); await wait(800);
await see('challenges', ([u, w]) => lookIn([...document.querySelectorAll('.chal .cp')].find(x => x.textContent.includes('@aa_')), w));
// ---------- event board (if an event is on) ----------
if (await B.ev(() => !!currentEvent())) {
  await B.ev(() => { S.ui.questView = 'quest'; showTab('quests'); return loadEventBoard(); }); await wait(2500);
  await see('event board', ([u, w]) => lookIn([...document.querySelectorAll('.evb-list li')].find(li => li.textContent.includes('@aa_')), w));
}
// ---------- clan: members + MVP board, live table, feed ----------
await B.ev(() => { showTab('clan'); return clanLoadDetails(true); }); await wait(2500);
await see('clan members list (MVP board)', ([u, w]) => lookIn(document.querySelector(`[data-cmid="${u}"]`), w), { tag: false });
const feed = await B.ev(([u, w]) => lookIn([...document.querySelectorAll('.clan-feed li')].find(li => li.textContent.includes('@aa_')), w), [uA, WANT]);
check('B sees A’s name colour in the clan activity feed (feed lines are text: name colour only)', feed && feed.color, JSON.stringify(feed));
await A.ev(() => liveStart({ title: 'Group study', pattern: { focus: 25, short: 5, rounds: 2 } }));
const lid = await A.ev(() => LIVE.lid);
await B.ev(l => liveJoin(l), lid); await wait(3000);
await see('live study table', ([u, w]) => lookIn(document.querySelector(`.lv-seat[data-uid="${u}"]`), w), { tag: false });
// ---------- share link + image ----------
const link = await A.ev(() => cardLink(cardData()));
const shared = await B.ev(l => { const d = parseCardHash(l.slice(l.indexOf('#'))); const el = document.createElement('div'); el.innerHTML = cardHTML(d, 'shared'); document.body.appendChild(el); const r = lookIn(el, { aura: 'au_b_sloth_sq', color: 'col_b_sloth', avatar: 'av_b_sloth_sq', frame: 'frame_orbit', tag: 'LOOK' }); el.remove(); return r; }, link);
results['share link'] = shared;
check('Share link: the card opened from it shows the whole look (incl. clan tag)', full(shared), JSON.stringify(shared));
const img = await A.ev(() => cardImageSVG(cardData()));
check('Share image: the Squad aura is drawn with its double ring + shimmer, and the clan tag is in the picture', (img.match(/<circle[^>]*stroke="#7fa06a"/g) || []).length >= 2 && /stroke="#fff"[^>]*stroke-dasharray/.test(img) && img.includes('[LOOK]'));
// ---------- own screens (A) ----------
check('A’s header chip and profile card show the same look', await A.ev(w => { renderProfile(); const h = lookIn($('#lvChip'), w), c = lookIn($('#profileHead .pc-host'), w); return h.aura && h.squad && h.avatar && h.frame && c.aura && c.squad && c.color && c.avatar && c.frame && c.tag; }, WANT));
// ---------- True Minimalist on B: no aura, colour, frame or tag anywhere ----------
await B.ev(() => { S.settings.gamification = false; G = null; applyMinimal(); applyCosmetics(); });
const minView = async (label, fn) => { const r = await B.ev(fn, [uA, WANT]); return { label, leak: !!r && !r.missing && (r.aura || r.color || r.frame || r.tag || r.auraCls) }; };
const mins = [];
await B.ev(() => { S.ui.friendsView = 'friends'; SOC.friend = null; showTab('friends'); }); await wait(800);
mins.push(await minView('friends list', ([u, w]) => lookIn(document.querySelector(`#friendsBody [data-open="${u}"]`), w)));
await B.ev(() => { S.ui.lbScope = 'friends'; S.ui.lbPeriod = 'week'; showTab('board'); }); await wait(1500);
mins.push(await minView('leaderboard', ([u, w]) => lookIn(document.querySelector(`#boardBody [data-uid="${u}"]`), w)));
await B.ev(() => showTab('clan')); await wait(600);
mins.push(await minView('clan members', ([u, w]) => lookIn(document.querySelector(`[data-cmid="${u}"]`), w)));
mins.push(await minView('live table', ([u, w]) => lookIn(document.querySelector(`.lv-seat[data-uid="${u}"]`), w)));
await B.ev(() => openInbox()); await wait(400);
mins.push(await minView('inbox', ([u, w]) => lookIn(document.querySelector('#ibBody'), w)));
await closeDlg(B);
check('True Minimalist hides auras, name colours, frames and clan tags everywhere', mins.every(m => !m.leak), JSON.stringify(mins.filter(m => m.leak)));
await B.ev(() => { S.settings.gamification = true; G = null; applyMinimal(); applyCosmetics(); });
// ---------- unknown ids from another app version: graceful fallback ----------
await A.ev(() => FB.setDoc(FB.doc(FB.db, 'publicProfiles', USER.uid), { ...JSON.parse(lastPub.publicProfiles), aura: 'au_from_the_future', avatar: 'av_unknown', frame: 'frame_zzz', color: 'col_nope', updatedAt: FB.serverTimestamp() }));
await B.ev(() => { SOC.cache = {}; SOC.friend = null; S.ui.friendsView = 'friends'; showTab('friends'); }); await wait(2500);
const fb = await B.ev(u => { const li = document.querySelector(`#friendsBody [data-open="${u}"]`); return li && { aura: !!li.querySelector('[class*="aura-x-"]'), svg: !!li.querySelector('.look-pic svg'), w: li.querySelector('.look-pic').getBoundingClientRect().width }; }, uA);
check('Unknown ids (another app version) fall back to the defaults without a broken layout', fb && !fb.aura && fb.svg && fb.w >= 28, JSON.stringify(fb));
await A.ev(() => { delete lastPub.publicProfiles; publishPublic(); }); await wait(1500);
// ---------- equip sync: the newest choice wins on every device ----------
const A2 = await device('A2');
await A2.p.goto('http://localhost:8000/index.html?emulator=1'); await A2.p.waitForSelector('#authView:not(.hidden)');
await A2.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await A2.p.fill('#authUser', 'aa_' + R); await A2.p.fill('#authPass', 'secret12'); await A2.p.click('#authSubmit');
await A2.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(1500);
check('Second device: same look after sign-in', await A2.ev(() => myAura() === 'au_b_sloth_sq' && equippedId('color') === 'col_b_sloth' && myAvatar() === 'av_b_sloth_sq'));
await A2.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); bagEquip('au_b_sloth'); }); await wait(2500);
check('Changing the aura on one device updates the other within seconds', (await until(A, () => myAura() === 'au_b_sloth', null, 8000)) >= 0);
await A.ev(() => bagEquip('au_b_sloth_sq')); await A2.ev(() => bagUnequip('color'));
await wait(3500);
const both = await Promise.all([A, A2].map(d => d.ev(() => `${myAura()}|${equippedId('color')}`)));
check('Two devices changing different things at once: both changes are kept', both[0] === both[1] && both[0] === 'au_b_sloth_sq|col_default', both.join(' vs '));

console.log('SUMMARY', JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v && !v.missing]))));
log('errors', JSON.stringify(errs.slice(0, 12)));
await b.close();
process.exit(failCount() ? 1 : 0);
