// v1.14 clans with 5 accounts: create (unique names, filter), invite links + codes, approval/open modes, inbox accept/decline,
// max members, one clan per user, roles (promote/demote/remove/transfer), leader leaving → succession, last member leaving,
// XP only after joining, rejoin resets, concurrent contributions, the security rules (inflation, other clans, member-only data).
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, tryOp, owner, ownerGet, focus } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const A = await device('A'), B = await device('B'), C = await device('C', 390), D = await device('D'), E = await device('E');
await Promise.all([signup(A, 'al_' + R), signup(B, 'bo_' + R), signup(C, 'ca_' + R), signup(D, 'di_' + R), signup(E, 'ed_' + R)]);
const uid = d => d.ev(() => USER.uid);
const [uA, uB, uC, uD, uE] = await Promise.all([A, B, C, D, E].map(uid));
const NAME = 'Study Owls ' + R;

// ---------- 1. Creating ----------
await A.ev(() => showTab('clan')); await wait(300);
check('No clan yet: Pomeo screen with Create / Join with a code / top clans', await A.ev(() => !!$('#clanCreateBtn') && !!$('#clanJoinBtn') && !!$('#clanSeeTop') && !!$('.clan-none .mascot')));
await A.p.click('#clanCreateBtn');
await A.p.fill('#ccName', 'Fuck Crew'); await A.p.fill('#ccTag', 'OWL'); await A.p.click('#ccSave'); await wait(300);
check('Offensive clan names are refused (word filter)', /isn’t allowed/.test(await A.p.textContent('#ccErr')), await A.p.textContent('#ccErr'));
await A.p.fill('#ccName', 'ab'); await A.p.click('#ccSave'); await wait(200);
check('Names need 3–24 characters', /3–24/.test(await A.p.textContent('#ccErr')));
await A.p.fill('#ccName', NAME); await A.p.fill('#ccTag', 'o'); await A.p.click('#ccSave'); await wait(200);
check('Tags need 2–5 letters/numbers', /2–5/.test(await A.p.textContent('#ccErr')));
await A.p.fill('#ccTag', 'owls'); await A.p.selectOption('#ccDesc', 'jee'); await A.p.click('#ccSave');
check('Leader creates the clan (tag upper-cased, preset description, default emblem)', (await until(A, () => inClan())) >= 0 && await A.ev(() => CLAN.doc.tag === 'OWLS' && CLAN.doc.desc === 'jee' && CLAN.doc.emblem === 'ce_tomato' && myClanRole() === 'leader' && CLAN.doc.joinMode === 'approval'));
const cid = await A.ev(() => CLAN.id), code1 = await A.ev(() => CLAN.info.code);
check('Invite code: 8 letters/numbers, default join mode is Approval', /^[A-Z0-9]{8}$/.test(code1));
await E.ev(() => showTab('clan')); await E.p.click('#clanCreateBtn'); await E.p.fill('#ccName', NAME.toUpperCase()); await E.p.fill('#ccTag', 'ED'); await E.p.click('#ccSave'); await wait(800);
check('Names are unique, ignoring case', /taken/.test(await E.p.textContent('#ccErr')), await E.p.textContent('#ccErr'));
const rawDup = await tryOp(E, `async (cid) => { const b = FB.writeBatch(FB.db), id = FB.doc(FB.collection(FB.db, 'clans')).id, ts = FB.serverTimestamp();
  b.set(FB.doc(FB.db, 'clans', id), { name: 'X ${R}', nameLower: '${NAME.toLowerCase()}', tag: 'XX', desc: 'jee', emblem: 'ce_tomato', banner: 'cb_default', theme: 'ct_default', frame: 'cf_none', joinMode: 'open', members: 1, xp: 0, level: 1, weekKey: '2026-10-19', weekMin: 0, monthKey: '2026-10', monthMin: 0, raidHP: 1800, weekGroups: 0, lastLive: 'none', spent: 0, owned: {}, lastBuy: '', tq: 0, tr: 0, quests: {}, raids: {}, gday: '', gstreak: 0, createdAt: ts, updatedAt: ts });
  b.set(FB.doc(FB.db, 'clanNames', '${NAME.toLowerCase()}'), { clan: id }); await b.commit(); }`);
check('Rules: a second clan can’t take an existing name (even writing directly)', rawDup !== 'ALLOWED', rawDup);
await E.p.fill('#ccName', 'Solo Crew ' + R); await E.p.fill('#ccTag', 'SOLO'); await E.p.click('#ccSave');
await until(E, () => inClan());
await closeDlg(E);

// ---------- 2. Invite link, approval, inbox accept ----------
await B.p.goto(`http://localhost:8000/index.html?emulator=1&clan=${code1}`);
await B.p.waitForFunction(() => typeof CLAN !== 'undefined' && CLAN.started, null, { timeout: 15000 });
const card = await until(B, () => $('#clanCardDlg').open);
check('Invite link (?clan=CODE) opens the clan’s public card after login', card >= 0);
check('Public card: clan-level info only (emblem, name, tag, level, members, minutes) and “Request to join”', await B.ev(() => $('#clanCardBody').textContent.includes('[OWLS]') && /Request to join/.test($('#clanCardGo').textContent) && !/@/.test($('#clanCardBody').textContent)));
check('The link is removed from the address bar', await B.ev(() => !location.search.includes('clan=')));
await B.p.click('#clanCardGo'); await wait(900);
check('Request sent (pending, can be cancelled)', await B.ev(() => !!CLAN.myReq && /Request sent/.test($('#clanCardGo').textContent)));
await closeDlg(B);
await A.ev(() => clanLoadDetails(true)); await wait(600);
check('Leader sees the request in the Inbox with Accept / Decline', await A.ev(() => { ibLoad(); const it = IB.find(x => x.key && x.key.startsWith('creq:')); return !!it && !!ibActionsHTML(it); }));
check('…and on the clan screen', await A.ev(() => !!document.querySelector('[data-creq] [data-creqok]')));
await A.ev(() => openInbox()); await wait(300);
await A.p.click('[data-ibcok]'); await wait(1500);
check('Accept from the Inbox: they’re a member', await A.ev(() => (CLAN.members || []).length === 2 && CLAN.doc.members === 2));
await B.ev(() => clanRefresh(true)); await wait(800);
check('The new member is in, with a “You’re in!” inbox notice', await B.ev(() => inClan() && myClanRole() === 'member') && await B.ev(() => { ibLoad(); return IB.some(x => /You’re in!/.test(x.title)); }));
await closeDlg(A);

// ---------- 3. Decline; open mode; codes; one clan per user; max members ----------
await C.ev(() => { showTab('clan'); openClanJoin(); }); await C.p.fill('#cjCode', code1.toLowerCase()); await C.p.click('#cjFind'); await wait(700);
check('Join with a code (any case): the card opens', await C.ev(() => $('#clanCardDlg').open));
await C.p.click('#clanCardGo'); await wait(700); await closeDlg(C);
await A.ev(() => clanLoadDetails(true)); await wait(500);
await A.ev(() => { showTab('clan'); }); await wait(200);
await A.p.click('[data-creq] [data-creqno]'); await wait(800);
await C.ev(() => { localStorage.setItem('pomodorolist-clanreq:' + USER.uid, JSON.stringify({ ...JSON.parse(localStorage.getItem('pomodorolist-clanreq:' + USER.uid)), at: Date.now() - 10000 })); return clanRefresh(); }); await wait(500);
check('Declined: the request is gone and they get a quiet notice', await C.ev(() => !inClan() && !CLAN.myReq) && await C.ev(() => { ibLoad(); return IB.some(x => /wasn’t accepted/.test(x.title)); }));
await A.ev(() => clanSetDoc({ joinMode: 'open' }));
await C.ev(() => openClanJoin()); await C.p.fill('#cjCode', code1); await C.p.click('#cjFind'); await wait(700);
check('Open mode: the card says Join', /^Join$/.test(await C.p.textContent('#clanCardGo')));
await C.p.click('#clanCardGo'); await until(C, () => inClan());
check('Open mode: joining is instant', await C.ev(() => inClan() && CLAN.doc.members === 3));
await A.ev(() => clanRegenCode()); const code2 = await A.ev(() => CLAN.info.code);
await D.ev(() => { showTab('clan'); openClanJoin(); }); await D.p.fill('#cjCode', code1); await D.p.click('#cjFind'); await wait(700);
check('Leader regenerates the code: the old code stops working', /doesn’t work/.test(await D.p.textContent('#cjErr')) && code2 !== code1, await D.p.textContent('#cjErr'));
// D logs focus BEFORE joining: it must never count for the clan
await closeDlg(D); await focus(D, 30);
await D.ev(() => openClanJoin()); await D.p.fill('#cjCode', code2); await D.p.click('#cjFind'); await wait(700); await D.p.click('#clanCardGo'); await until(D, () => inClan()); await closeDlg(D);
check('…and the new one works', await D.ev(() => inClan()));
await E.ev(() => openClanJoin()); await E.p.fill('#cjCode', code2); await E.p.click('#cjFind'); await wait(700);
check('One clan per user: someone in a clan sees “already in a clan”', /already in a clan/.test(await E.p.textContent('#clanCardGo')) && await E.ev(() => $('#clanCardGo').disabled));
const eJoin = await tryOp(E, `async () => { const b = FB.writeBatch(FB.db); b.set(cDoc('${cid}', 'members', USER.uid), newMemberDoc('member', USER.username)); b.set(FB.doc(FB.db, 'clanOf', USER.uid), { clan: '${cid}', at: FB.serverTimestamp() }); b.update(cDoc('${cid}'), { members: FB.increment(1), updatedAt: FB.serverTimestamp() }); await b.commit(); }`);
check('Rules: one clan per user (a direct join while in another clan is refused)', eJoin === 'permission-denied', eJoin);
await closeDlg(E);
await owner('clans/' + cid, { members: 30 });
const fullJoin = await tryOp(E, `async () => { await FB.deleteDoc(FB.doc(FB.db, 'clanOf', USER.uid)).catch(() => {}); }`);
void fullJoin;
const F = await device('F'); await signup(F, 'fi_' + R); const uF = await uid(F);
await F.ev(c => clanByCode(c).then(openClanCard), code2); await wait(500);
check('Max 30 members: a full clan shows “This clan is full”', /full/.test(await F.p.textContent('#clanCardGo')));
const fJoin = await tryOp(F, `async () => clanJoinOpen(await clanByCode('${code2}'))`);
check('Rules: joining a full clan is refused', fJoin === 'permission-denied', fJoin);
await owner('clans/' + cid, { members: 4 });
await closeDlg(F);

// ---------- 4. Roles ----------
await A.ev(() => clanLoadDetails(true)); await A.ev(() => showTab('clan')); await wait(300);
await A.ev(u => document.querySelector(`[data-cmid="${u}"] .cm-more`).open = true, uB);
await A.p.click(`[data-cmid="${uB}"] [data-crole="officer"]`); await wait(900);
check('Leader promotes a member to officer', await A.ev(u => CLAN.members.find(m => m.id === u).role === 'officer', uB));
await B.ev(() => clanRefresh(true)); await wait(500);
const bPromote = await tryOp(B, `async () => FB.updateDoc(cDoc(CLAN.id, 'members', '${uD}'), { role: 'officer' })`);
check('Rules: only the leader promotes/demotes', bPromote === 'permission-denied', bPromote);
const bKickA = await tryOp(B, `async () => { const b = FB.writeBatch(FB.db); b.delete(cDoc(CLAN.id, 'members', '${uA}')); await b.commit(); }`);
check('Rules: officers can’t remove the leader', bKickA === 'permission-denied', bKickA);
const cKick = await tryOp(C, `async () => FB.deleteDoc(cDoc(CLAN.id, 'members', '${uD}'))`);
check('Rules: members can’t remove anyone', cKick === 'permission-denied', cKick);
const cMode = await tryOp(C, `async () => FB.updateDoc(cDoc(CLAN.id), { joinMode: 'approval', updatedAt: FB.serverTimestamp() })`);
const cInfo = await tryOp(C, `async () => FB.updateDoc(cDoc(CLAN.id, 'private', 'info'), { code: 'HACKED12' })`);
check('Rules: members can’t change settings or the invite code', cMode === 'permission-denied' && cInfo === 'permission-denied', cMode + ' ' + cInfo);
await B.ev(() => { showTab('clan'); return clanLoadDetails(true); }); await wait(300);
await B.ev(u => document.querySelector(`[data-cmid="${u}"] .cm-more`).open = true, uD);
check('Officers see Remove for members only (no promote / make leader)', await B.ev(u => { const m = document.querySelector(`[data-cmid="${u}"] .cm-menu`); return !!m.querySelector('[data-cremove]') && !m.querySelector('[data-crole]') && !m.querySelector('[data-ctransfer]'); }, uD));
await B.p.click(`[data-cmid="${uD}"] [data-cremove]`); await wait(300); await B.p.click('#cfOk'); await wait(1200);
check('Officer removes a member', await B.ev(u => !CLAN.members.some(m => m.id === u) && CLAN.doc.members === 3, uD));
await D.ev(() => clanRefresh(true)); await wait(500);
check('The removed member is out (with a notice) and can see the no-clan screen', await D.ev(() => !inClan() && (ibLoad(), IB.some(x => /no longer in/.test(x.title)))));
// transfer, then the leader leaves → the most senior officer leads
await A.ev(() => clanLoadDetails(true));
await A.ev(u => clanTransfer(u), uB); await wait(800);
await B.ev(() => clanRefresh(true)); await A.ev(() => clanRefresh(true)); await wait(400);
check('Transfer leadership: new leader, old leader becomes officer (one write)', await B.ev(() => myClanRole() === 'leader' && CLAN.info.leader === USER.uid) && await A.ev(() => myClanRole() === 'officer'));
await B.ev(() => clanLeave()); await wait(1200);
await A.ev(() => clanRefresh(true)); await C.ev(() => clanRefresh(true)); await wait(500);
check('Leader leaves: leadership passes to the most senior officer', await A.ev(() => myClanRole() === 'leader' && CLAN.info.leader === USER.uid && CLAN.doc.members === 2) && await B.ev(() => !inClan()));
// leader leaves with no officer → the longest-standing member
await A.ev(() => clanSetDoc({ joinMode: 'open' })).catch(() => {});
await D.ev(c => clanByCode(c).then(clanJoinOpen), code2); await wait(800);
await A.ev(() => clanLeave()); await wait(1200);
await C.ev(() => clanRefresh(true)); await D.ev(() => clanRefresh(true)); await wait(400);
check('…no officer: the longest-standing member leads', await C.ev(() => myClanRole() === 'leader') && await D.ev(() => myClanRole() === 'member'));
// A rejoins (contribution starts from zero)
await A.ev(c => clanByCode(c).then(clanJoinOpen), code2).catch(e => log('rejoin err', e.message)); await wait(800);
check('Anyone can leave and rejoin; rejoining starts at zero', await A.ev(() => inClan() && CLAN.me.contrib === 0 && myClanRole() === 'member'));

// ---------- 5. Clan XP: only focus after joining, concurrency, inflation ----------
const xp0 = (await ownerGet('clans/' + cid)).xp;
check('Focus logged before joining never counts for the clan', xp0 === 0, 'xp=' + xp0);
await focus(C, 25); await focus(C, 25);
await until(C, () => !readJSON(clanQKey(), []).length, null, 8000); await wait(500);
let cd = await ownerGet('clans/' + cid), cm = await ownerGet(`clans/${cid}/members/${uC}`);
check('Focus after joining adds to my contribution and the clan’s XP, weekly minutes and monthly raid', cd.xp === 50 && cm.contrib === 50 && cm.weekMin === 50 && cd.weekMin === 50 && cd.monthMin === 50, JSON.stringify({ xp: cd.xp, contrib: cm.contrib }));
await Promise.all([focus(A, 30), focus(D, 40), focus(C, 20)]);
await Promise.all([A, D, C].map(d => until(d, () => !readJSON(clanQKey(), []).length, null, 10000))); await wait(800);
cd = await ownerGet('clans/' + cid);
const sum = (await ownerGet(`clans/${cid}/members/${uA}`)).contrib + (await ownerGet(`clans/${cid}/members/${uC}`)).contrib + (await ownerGet(`clans/${cid}/members/${uD}`)).contrib;
check('Three members finishing at the same moment: no minute lost or doubled (transactions)', cd.xp === 140 && sum === 140, `xp=${cd.xp} sum=${sum}`);
await C.ev(() => { const s = S.sessions[S.sessions.length - 1]; const q = readJSON(clanQKey(), []); q.push({ id: s.id, min: 20, clan: CLAN.id, at: Date.now() }); writeLS(clanQKey(), q); return flushContrib(); }); await wait(800);
check('The same session sent twice counts once', (await ownerGet('clans/' + cid)).xp === 140);
const inflate = await tryOp(C, `async () => FB.runTransaction(FB.db, async tx => { const c = (await tx.get(cDoc(CLAN.id))).data(), m = (await tx.get(cDoc(CLAN.id, 'members', USER.uid))).data();
  tx.update(cDoc(CLAN.id, 'members', USER.uid), { contrib: m.contrib + 5000, weekKey: m.weekKey, weekMin: m.weekMin + 5000, lastAt: Date.now(), lastIds: m.lastIds, updatedAt: FB.serverTimestamp() });
  tx.update(cDoc(CLAN.id), { xp: c.xp + 5000, level: clanLevelFor(c.xp + 5000), weekKey: c.weekKey, weekMin: c.weekMin + 5000, weekGroups: c.weekGroups, monthKey: c.monthKey, monthMin: c.monthMin + 5000, raidHP: c.raidHP, updatedAt: FB.serverTimestamp() }); })`);
check('Rules: more minutes than real time allows are refused (5000 min at once)', inflate === 'permission-denied', inflate);
const xpOnly = await tryOp(C, `async () => { const c = (await FB.getDoc(cDoc(CLAN.id))).data(); await FB.updateDoc(cDoc(CLAN.id), { xp: c.xp + 30, level: clanLevelFor(c.xp + 30), weekMin: c.weekMin + 30, monthMin: c.monthMin + 30, updatedAt: FB.serverTimestamp() }); }`);
check('Rules: clan XP can’t grow without the same minutes on your own contribution', xpOnly === 'permission-denied', xpOnly);
const down = await tryOp(C, `async () => FB.runTransaction(FB.db, async tx => { const c = (await tx.get(cDoc(CLAN.id))).data(), m = (await tx.get(cDoc(CLAN.id, 'members', USER.uid))).data();
  tx.update(cDoc(CLAN.id, 'members', USER.uid), { contrib: m.contrib - 10, weekKey: m.weekKey, weekMin: m.weekMin - 10, lastAt: Date.now(), lastIds: m.lastIds, updatedAt: FB.serverTimestamp() });
  tx.update(cDoc(CLAN.id), { xp: c.xp - 10, level: c.level, weekKey: c.weekKey, weekMin: c.weekMin - 10, weekGroups: c.weekGroups, monthKey: c.monthKey, monthMin: c.monthMin - 10, raidHP: c.raidHP, updatedAt: FB.serverTimestamp() }); })`);
check('Rules: contributions never decrease', down === 'permission-denied', down);
const other = await tryOp(D, `async () => FB.updateDoc(cDoc(CLAN.id, 'members', '${uC}'), { avatar: 'av_cat', color: 'col_default', aura: '', level: 1, tier: 'novice', shareNames: true, focusUntil: 0 })`);
check('Rules: you can only write your own member data', other === 'permission-denied', other);
const lvl = await tryOp(C, `async () => { const c = (await FB.getDoc(cDoc(CLAN.id))).data(); await FB.updateDoc(cDoc(CLAN.id), { level: 9, updatedAt: FB.serverTimestamp() }); }`);
check('Rules: the level always matches the XP', lvl === 'permission-denied', lvl);
const otherClan = await tryOp(C, `async () => { const id = (await FB.getDoc(FB.doc(FB.db, 'clanOf', '${uE}')).catch(() => null)); void id; }`);
void otherClan;
const eid = await E.ev(() => CLAN.id);
const editOther = await tryOp(C, `async () => FB.updateDoc(cDoc('${eid}'), { joinMode: 'open', updatedAt: FB.serverTimestamp() })`);
const readOther = await tryOp(C, `async () => FB.getDocs(cCol('${eid}', 'members'))`);
const readInfo = await tryOp(F, `async () => FB.getDoc(cDoc('${cid}', 'private', 'info'))`);
const readSess = await tryOp(F, `async () => FB.getDocs(cCol('${cid}', 'sessions'))`);
const readFeed = await tryOp(F, `async () => FB.getDocs(cCol('${cid}', 'feed'))`);
const readReq = await tryOp(F, `async () => FB.getDocs(cCol('${cid}', 'requests'))`);
const readPub = await tryOp(F, `async () => FB.getDoc(cDoc('${cid}'))`);
check('Rules: no editing another clan; members, invite code, sessions, feed and requests are members-only', [editOther, readOther, readInfo, readSess, readFeed, readReq].every(x => x === 'permission-denied'), [editOther, readOther, readInfo, readSess, readFeed, readReq].join(' '));
check('…while the public clan card is readable by anyone signed in', readPub === 'ALLOWED');
const listCodes = await tryOp(F, `async () => FB.getDocs(FB.collection(FB.db, 'clanCodes'))`);
check('Rules: invite codes can’t be listed (only looked up by code)', listCodes === 'permission-denied', listCodes);
const feedFree = await tryOp(C, `async () => FB.addDoc(cCol(CLAN.id, 'feed'), { type: 'chat', who: USER.username, n: 0, text: 'hi', at: FB.serverTimestamp() })`);
check('Rules: no free text (feed events are presets only)', feedFree === 'permission-denied', feedFree);

// ---------- 6. Last member leaving deletes the clan ----------
await E.ev(() => clanLeave()); await wait(1200);
const eName = await ownerGet('clanNames/' + ('solo crew ' + R));
check('The last member leaving deletes the clan (and frees its name)', !(await ownerGet('clans/' + eid)) && !eName && await E.ev(() => !inClan()));

log('errors', JSON.stringify(errs.slice(0, 12)));
await b.close();
process.exit(failCount() ? 1 : 0);
