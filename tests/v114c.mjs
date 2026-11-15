// v1.14 clans: levels, Clan Points, clan shop (leader / officers if allowed), personal clan cosmetics in the bag (unequipped on leaving,
// back on rejoin), clan tag on profiles (rules check it), weekly quest + monthly raid claimed once (even at the same moment),
// clan leaderboard (order, public info only, own rank outside the top 50), blocking, disband.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, tryOp, owner, ownerGet, ownerCreate, focus } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const A = await device('A'), B = await device('B'), C = await device('C', 390), F = await device('F');
await Promise.all([signup(A, 'al_' + R), signup(B, 'bo_' + R), signup(C, 'ca_' + R), signup(F, 'fe_' + R)]);
const uid = d => d.ev(() => USER.uid);
const [uA, uB, uC, uF] = await Promise.all([A, B, C, F].map(uid));
await A.ev(([n, t]) => clanCreate({ name: n, tag: t, desc: 'neet' }), ['Level Up ' + R, 'L' + R.toUpperCase()]);
await A.ev(() => clanSetDoc({ joinMode: 'open' }));
const cid = await A.ev(() => CLAN.id), code = await A.ev(() => CLAN.info.code), TAG = await A.ev(() => CLAN.doc.tag);
await B.ev(c => clanByCode(c).then(clanJoinOpen), code); await C.ev(c => clanByCode(c).then(clanJoinOpen), code); await wait(500);
await A.ev(u => clanSetRole(u, 'officer'), uB);

// ---------- 1. Levels + points ----------
await focus(C, 25); await until(C, () => !readJSON(clanQKey(), []).length);
await owner('clans/' + cid, { xp: 9000, level: 9 });
await Promise.all([A, B, C].map(d => d.ev(() => clanRefresh(true)))); await wait(400);
await A.ev(() => showTab('clan')); await wait(300);
check('Levels 1–30 from clan XP, with a progress bar to the next level', await A.ev(() => /Lv 9/.test($('.clan-lv').textContent) && /0 \/ 1,800 min to level 10/.test($('.clan-xp').textContent)), await A.ev(() => $('.clan-xp').textContent));
check('Clan Points earned automatically: XP/30 + 25 per level (+ quests, raids)', await A.ev(() => clanPoints(CLAN.doc) === 300 + 200));
// ---------- 2. Shop ----------
await A.p.click('#clanShopBtn'); await wait(300);
check('Clan shop: emblems / banners / colours / frames, with points and level gates', await A.ev(() => /500 Clan Points · clan level 9/.test($('#csPts').textContent) && !!$('[data-cbuy="ce_owl"]') && /Level 10/.test($('#csGrid').textContent)));
await A.p.click('[data-cbuy="ce_owl"]'); await wait(1200);
check('Leader buys an emblem (points spent) and it’s put on straight away', await A.ev(() => CLAN.doc.owned.ce_owl && CLAN.doc.emblem === 'ce_owl' && clanPoints(CLAN.doc) === 380), JSON.stringify(await A.ev(() => ({ o: CLAN.doc.owned, e: CLAN.doc.emblem, p: clanPoints(CLAN.doc) }))));
const dragon = await tryOp(A, `async () => FB.updateDoc(cDoc(CLAN.id), { 'owned.ce_dragon': true, spent: CLAN.doc.spent + 600, lastBuy: 'ce_dragon', updatedAt: FB.serverTimestamp() })`);
check('Rules: items above the clan’s level can’t be bought', dragon === 'permission-denied', dragon);
const cheap = await tryOp(A, `async () => FB.updateDoc(cDoc(CLAN.id), { 'owned.cb_galaxy': true, spent: CLAN.doc.spent + 1, lastBuy: 'cb_galaxy', updatedAt: FB.serverTimestamp() })`);
check('Rules: items cost exactly their price', cheap === 'permission-denied', cheap);
const two = await tryOp(A, `async () => FB.updateDoc(cDoc(CLAN.id), { 'owned.ct_ember': true, 'owned.ct_mint': true, spent: CLAN.doc.spent + 100, lastBuy: 'ct_ember', updatedAt: FB.serverTimestamp() })`);
check('Rules: one item per purchase', two === 'permission-denied', two);
const bBuy = await tryOp(B, `async () => clanBuy('ct_ember')`);
const bBuyRaw = await tryOp(B, `async () => FB.updateDoc(cDoc(CLAN.id), { 'owned.ct_ember': true, spent: (await FB.getDoc(cDoc(CLAN.id))).data().spent + 100, lastBuy: 'ct_ember', updatedAt: FB.serverTimestamp() })`);
check('Officers can’t shop unless the leader allows it (app + rules)', bBuyRaw === 'permission-denied' && !(await B.ev(() => (CLAN.doc.owned || {}).ct_ember)), bBuy + ' ' + bBuyRaw);
await A.ev(() => clanSetInfo('officerShop', true)); await B.ev(() => clanRefresh(true)); await wait(300);
await B.ev(() => clanBuy('ct_ember')); await B.ev(() => clanSetDoc({ theme: 'ct_ember' }));
check('…then they can buy and change the look', (await ownerGet('clans/' + cid)).theme === 'ct_ember');
const cBuy = await tryOp(C, `async () => FB.updateDoc(cDoc(CLAN.id), { 'owned.ct_mint': true, spent: (await FB.getDoc(cDoc(CLAN.id))).data().spent + 100, lastBuy: 'ct_mint', updatedAt: FB.serverTimestamp() })`);
const overspend = await tryOp(A, `async () => { await owner_unused; }`.replace('await owner_unused;', ''));
void overspend;
check('Rules: members can’t buy', cBuy === 'permission-denied', cBuy);
await closeDlg(A);
await owner('clans/' + cid, { spent: 495 });
const broke = await tryOp(A, `async () => FB.updateDoc(cDoc(CLAN.id), { 'owned.ct_mint': true, spent: 595, lastBuy: 'ct_mint', updatedAt: FB.serverTimestamp() })`);
check('Rules: you can’t spend more points than the clan earned', broke === 'permission-denied', broke);
await owner('clans/' + cid, { spent: 220 });

// ---------- 3. Personal clan cosmetics ----------
await C.ev(() => { clanRefresh(true); G = null; S.ui.bagCat = 'clan'; showTab('bag'); }); await wait(700);
const bag = await C.ev(() => ({ owned: ['x_clantag', 'col_c_steel', 'au_c_bond', 'frame_clan', 'col_c_ember', 'au_c_pact'].every(isOwned), royal: isOwned('col_c_royal'), cards: $$('#bagList .bag-item').length, locked: $$('#bagList .bag-item.locked').length,
  first: $('#bagList .bag-item .rar') && $('#bagList .bag-item .rar').textContent, sec: $$('#bagList .bag-sec h2').map(h => h.textContent) }));
check('Bag → Clan: cosmetics unlocked by clan level (tag, name colours, auras, badge frame), rarest first; the next ones shown locked', bag.owned && !bag.royal && bag.locked > 0 && bag.first === 'Epic', JSON.stringify(bag));
await C.ev(() => { S.game.equipped.color = 'col_c_ember'; S.game.equipped.aura = 'au_c_pact'; S.game.equipped.x_clantag = true; save(); applyCosmetics(); });
check('Equipped clan cosmetics work like any other', await C.ev(() => equippedId('color') === 'col_c_ember' && myAura() === 'au_c_pact'));
await C.ev(() => publishPublic()); await wait(2500);
check('Clan tag next to your name for others (public profile + leaderboard), checked by the rules', (await ownerGet('publicProfiles/' + uC)).clanTag === TAG && (await ownerGet('publicStats/' + uC)).clanTag === TAG);
const fakeTag = await tryOp(F, `async () => FB.setDoc(FB.doc(FB.db, 'publicProfiles', USER.uid), { ...JSON.parse(lastPub.publicProfiles), clanTag: 'FAKE', updatedAt: FB.serverTimestamp() })`);
check('Rules: you can’t show a clan tag you don’t have', fakeTag === 'permission-denied', fakeTag);
await C.ev(() => clanLeave()); await wait(1200);
check('Leaving unequips clan cosmetics (and drops the tag)…', await C.ev(() => equippedId('color') === 'col_default' && myAura() !== 'au_c_pact' && !clanTagOn()));
await wait(2500);
check('…the public tag is removed too', !(await ownerGet('publicProfiles/' + uC)).clanTag);
await C.ev(c => clanByCode(c).then(clanJoinOpen), code); await wait(1200);
check('…and they come back on rejoin', await C.ev(() => equippedId('color') === 'col_c_ember' && myAura() === 'au_c_pact'));
check('True Minimalist hides clan cosmetics', await C.ev(() => { S.settings.gamification = false; G = null; const r = !isOwned('col_c_ember') && !clanTagOn(); S.settings.gamification = true; G = null; return r; }));

// ---------- 4. Weekly quest + raid: claimed once, even at the same moment ----------
const kind = await A.ev(() => clanQuestOf(CLAN.doc).kind);
await owner('clans/' + cid, kind === 'min' ? { weekMin: 3000, xp: 9100 } : { weekGroups: 3 });
await Promise.all([A, B, C].map(d => d.ev(() => clanRefresh(true)))); await wait(300);
await A.ev(() => showTab('clan')); await wait(300);
check('Quest done: a claim button shows', await A.ev(() => !!$('#clanQuestClaim')));
const qr = await Promise.all([A, B, C].map(d => tryOp(d, `async () => clanClaimQuest()`)));
const after = await ownerGet('clans/' + cid);
check('Weekly quest claimed exactly once (three members claiming together)', after.tq === 1 && Object.keys(after.quests).length === 1 && qr.filter(x => x === 'ALLOWED').length >= 1, JSON.stringify({ qr, tq: after.tq }));
const again = await tryOp(B, `async () => FB.updateDoc(cDoc(CLAN.id), { ['quests.' + CLAN.doc.weekKey]: '${kind}', tq: FB.increment(1), updatedAt: FB.serverTimestamp() })`);
check('Rules: the same week can’t be claimed twice', again === 'permission-denied', again);
const fakeQ = await tryOp(B, `async () => FB.updateDoc(cDoc(CLAN.id), { 'quests.2030-01-07': 'min', tq: FB.increment(1), updatedAt: FB.serverTimestamp() })`);
check('Rules: only the current week, only when its goal is met', fakeQ === 'permission-denied', fakeQ);
const mk = await A.ev(() => monthKeyNow());
const early = await tryOp(B, `async () => FB.updateDoc(cDoc(CLAN.id), { ['raids.${mk}']: raidOf().id, tr: FB.increment(1), updatedAt: FB.serverTimestamp() })`);
check('Rules: the raid boss can’t be claimed before its HP is gone', early === 'permission-denied', early);
const cur = await ownerGet('clans/' + cid);
await owner('clans/' + cid, { monthMin: cur.raidHP, xp: Math.max(cur.xp, cur.raidHP) });
await Promise.all([A, B, C].map(d => d.ev(() => clanRefresh(true)))); await wait(300);
const rr = await Promise.all([A, B, C].map(d => tryOp(d, `async () => clanClaimRaid()`)));
const after2 = await ownerGet('clans/' + cid);
check('Monthly raid boss defeated and claimed exactly once', after2.tr === 1 && Object.keys(after2.raids).length === 1, JSON.stringify({ rr, tr: after2.tr }));
await Promise.all([A, B, C].map(d => d.ev(() => { clanRefresh(true); G = null; }))); await wait(500);
const boss = await A.ev(() => raidOf().id);
check('Victory: an exclusive clan emblem + a raid aura for every member', await A.ev(b => { renderClanShop(); return !!$(`[data-cuse="ce_r_${b}"]`); }, boss) && await C.ev(b => isOwned('au_cr_' + b), boss));
await A.ev(b => clanSetDoc({ emblem: 'ce_r_' + b }), boss);
check('The raid emblem can be put on (rules check the clan beat it)', (await ownerGet('clans/' + cid)).emblem === 'ce_r_' + boss);
const fakeEmb = await tryOp(A, `async () => FB.updateDoc(cDoc(CLAN.id), { emblem: 'ce_r_${['titan', 'leviathan', 'colossus'].find(x => x !== boss)}', updatedAt: FB.serverTimestamp() })`);
check('…but not one from a raid it didn’t win', fakeEmb === 'permission-denied', fakeEmb);
check('Trophy case shows the raid and the quest', await A.ev(() => { renderClan(); return $$('.ctro').length >= 2; }));
await closeDlg(A);

// ---------- 5. Clan leaderboard ----------
const wk = await A.ev(() => dayKey(weekMonday()));
const base = { nameLower: '', tag: 'ZZ', desc: 'chill', emblem: 'ce_tomato', banner: 'cb_default', theme: 'ct_default', frame: 'cf_none', joinMode: 'open', members: 3, level: 1, weekKey: wk, monthKey: mk, monthMin: 0, raidHP: 1800, weekGroups: 0, lastLive: 'none', spent: 0, owned: {}, lastBuy: '', tq: 0, tr: 0, quests: {}, raids: {}, gday: '', gstreak: 0 };
await Promise.all(Array.from({ length: 52 }, (_, i) => ownerCreate(`clans/zz${R}${i}`, { ...base, name: `Top ${R} ${i}`, nameLower: `top ${R} ${i}`, xp: 20000 + i, weekMin: 5000 + i * 10, level: 17 })));
await A.ev(() => { S.ui.lbScope = 'clans'; S.ui.clbPeriod = 'week'; showTab('board'); }); await wait(2500);
const lb = await A.ev(() => ({ n: $$('#boardBody ol.clb:not(.pinned) li').length, first: $('#boardBody ol.clb li .nm') && $('#boardBody ol.clb li .nm').textContent, mine: $('#boardBody ol.pinned li.me') && $('#boardBody ol.pinned li.me').textContent,
  vals: $$('#boardBody ol.clb:not(.pinned) li .v').map(x => x.textContent).slice(0, 3), people: /@/.test($('#boardBody').textContent) }));
check('Clans leaderboard (Weekly): top 50 ordered by clan focus this week', lb.n === 50 && /Top .* 51/.test(lb.first), JSON.stringify(lb));
check('Own clan’s rank shows below the top 50 (count query), highlighted', !!lb.mine && parseInt(lb.mine.trim()) > 50, lb.mine.trim().replace(/\s+/g, ' '));
check('Rows show clan-level info only (emblem, name, tag, level, members, minutes — no member names)', !lb.people);
await A.p.click('#clbPeriod [data-cperiod="all"]'); await wait(1500);
check('All-time view (by total clan XP)', await A.ev(() => /Top .* 51/.test($('#boardBody ol.clb li .nm').textContent)));
await A.ev(() => $('#boardBody ol.clb li[data-cpub]').click()); await wait(300);
check('Tapping a clan opens its public card (Join / Request to join)', await A.ev(() => $('#clanCardDlg').open && /already in a clan/.test($('#clanCardGo').textContent)));
await closeDlg(A);
await F.ev(() => { S.ui.lbScope = 'clans'; showTab('board'); }); await wait(1800);
await F.ev(() => $('#boardBody ol.clb li[data-cpub]').click()); await wait(300);
check('Someone without a clan gets “Join” on an open clan’s card', await F.ev(() => /^Join$/.test($('#clanCardGo').textContent)));
await closeDlg(F);

// ---------- 6. Blocking ----------
await A.ev(([u, n]) => FB.setDoc(FB.doc(FB.db, 'users', USER.uid, 'blocked', u), { name: n, at: Date.now() }), [uF, 'fe_' + R]); await wait(300);
const fOpen = await tryOp(F, `async () => clanJoinOpen(await clanByCode('${code}'))`);
check('Blocked by the leader: joining an open clan is refused by the rules', fOpen === 'permission-denied', fOpen);
await A.ev(() => clanSetDoc({ joinMode: 'approval' }));
const fReq = await tryOp(F, `async () => clanRequest(await clanByCode('${code}'))`);
check('Blocked by the leader: their join request is refused automatically', fReq === 'permission-denied', fReq);
const fRead = await tryOp(F, `async () => FB.getDocs(cCol('${cid}', 'members'))`);
check('…and they can’t see the member list', fRead === 'permission-denied');

// ---------- 7. Disband ----------
await A.ev(() => { showTab('clan'); openClanSettings(); }); await wait(300);
await A.p.click('#cstDisband'); await wait(200);
check('Disband asks you to type the tag to confirm', await A.ev(() => $('#cfOk').disabled));
await A.p.fill('#cfType', TAG.toLowerCase()); await A.p.click('#cfOk'); await wait(2500);
const gone = { clan: await ownerGet('clans/' + cid), name: await ownerGet('clanNames/level up ' + R), code: await ownerGet('clanCodes/' + code), ofB: await ownerGet('clanOf/' + uB), ofC: await ownerGet('clanOf/' + uC) };
check('Disband: the clan, its name, code and everyone’s membership are deleted', Object.values(gone).every(x => !x), JSON.stringify(gone));
await B.ev(() => clanRefresh(true)); await wait(400);
check('Members see the no-clan screen with a notice', await B.ev(() => !inClan() && (ibLoad(), IB.some(x => /no longer in|disbanded/.test(x.title)))));

log('errors', JSON.stringify(errs.slice(0, 12)));
await b.close();
process.exit(failCount() ? 1 : 0);
