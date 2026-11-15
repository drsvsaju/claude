// v1.18 Phase 3 (accounts) — two clan members at a live clan table: each one's block records the other as a mate
// (from the presence beats), the block pays the group coins and counts toward the clan-session milestones, the clan
// gets bonus Clan Points (1 per 25 min, at most 6 a day per member) that it can spend, and the rules refuse forged
// bonus points: more than the day's cap, a clan bonus without the member row, someone else's row, a day in the future.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, until, tryOp, owner, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const A = await device('A', 1280), B = await device('B', 1280);
await signup(A, 'ca_' + R); await signup(B, 'cb_' + R); await closeDlg(A); await closeDlg(B);
await A.ev(n => clanCreate({ name: n, tag: 'TGR', desc: 'jee' }), 'Together ' + R);
await A.ev(() => clanSetDoc({ joinMode: 'open' }));
const code = await A.ev(() => CLAN.info.code), cid = await A.ev(() => CLAN.id);
await B.ev(c => clanByCode(c).then(clanJoinOpen), code); await wait(1500);
check('B joined A\'s clan', (await ownerGet('clans/' + cid)).members === 2);
const uidA = await A.ev(() => USER.uid), uidB = await B.ev(() => USER.uid);
// bonus Clan Points start after a member's first day: backdate both memberships (admin write) so today's blocks count
for (const u of [uidA, uidB]) await owner(`clans/${cid}/members/${u}`, { joinedAt: new Date(Date.now() - 2 * 864e5) });
for (const d of [A, B]) await d.ev(() => clanRefresh(true));   // both devices read the backdated membership
// ---------- 1. a live clan table (Focus together): both focus at the same time ----------
await A.ev(() => liveStart({ title: 'Evening table', pattern: { focus: 25, short: 5, rounds: 4 }, mode: 'together' }));
await until(A, () => inLive(), null, 15000);
const lid = await A.ev(() => LIVE.lid);
await B.ev(async id => { await clanRefresh(true); await liveJoin(id); }, lid);
await until(B, () => inLive() && livePeople().length === 2, null, 20000);
await until(A, () => livePeople().length === 2, null, 20000);
// both start a focus block; their beats say "focus"
for (const d of [A, B]) await d.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); });
await until(A, uid => livePeople().some(p => p.id === uid && p.st === 'focus'), uidB, 20000);
await until(B, uid => livePeople().some(p => p.id === uid && p.st === 'focus'), uidA, 20000);
await wait(1500);
// finish both blocks (25 minutes "ago")
for (const d of [A, B]) await d.ev(() => { const t = S.timer; t.planned = 25 * 60000; t.focusStartedAt = Date.now() - 25 * 60000; t.endAt = Date.now() - 1; });
await wait(2500); await closeDlg(A); await closeDlg(B);
const recA = await A.ev(uid => { const s = S.sessions[S.sessions.length - 1]; return { mates: s.mates || [], clan: s.clan, live: s.live, stamp: s.stamp, hs: s.hs }; }, uidB);
const recB = await B.ev(() => { const s = S.sessions[S.sessions.length - 1]; return { mates: s.mates || [], clan: s.clan, hs: s.hs }; });
check('A\'s block at the clan table records B as a mate (from B\'s presence), the clan, the Together stamp, and that A hosted', recA.mates.includes(uidB) && recA.clan === cid && recA.stamp === 'stamp_together' && recA.hs === 1, JSON.stringify(recA));
check('B\'s block records A as a mate; B did not host', recB.mates.includes(uidA) && recB.clan === cid && !recB.hs, JSON.stringify(recB));
const gs = await B.ev(() => { GS = null; G = null; const g = groupStats(); reconcileRewards('quiet'); return { clanMin: g.clanMin, people: g.people.size, coins: groupCoinsAt(Infinity), first: !!S.game.claims.achievements.g_first }; });
check('B: 25 clan-session minutes with someone, 1 study partner, 12 group coins (10 for the new partner + 2 for the clan block), Better together claimed', gs.clanMin === 25 && gs.people === 1 && gs.coins === 12 && gs.first, JSON.stringify(gs));
// ---------- 2. bonus Clan Points ----------
const bonus = await until(A, () => (CLAN.doc.bonus || 0) >= 1, null, 20000);
let mA = null; for (let i = 0; i < 40; i++) { mA = await ownerGet(`clans/${cid}/members/${uidA}`); if (mA && mA.bcp >= 1) break; await wait(500); }   // A's own flush may land after B's
const cdoc = await ownerGet('clans/' + cid);
check('After the contributions flush, the clan has bonus Clan Points from the two 25-minute blocks (1 each) and A\'s row counts today\'s', bonus >= 0 && cdoc.bonus >= 1 && cdoc.bonus <= 2 && mA.bcp === 1 && /^\d{4}-\d\d-\d\d$/.test(mA.bday), JSON.stringify({ bonus: cdoc.bonus, bcp: mA.bcp, bday: mA.bday }));
const pts = await A.ev(async () => { await clanRefresh(true); return { points: clanPoints(CLAN.doc), earned: clanEarned(CLAN.doc), base: clanEarned({ ...CLAN.doc, bonus: 0 }) }; });
check('The bonus counts toward the clan\'s spendable Clan Points', pts.earned === pts.base + (cdoc.bonus || 0), JSON.stringify(pts));
// the daily cap: a flush of 10 more group blocks gives at most 6 a day in total
const capped = await A.ev(async () => { const n = await clanBonusFlush(Array.from({ length: 10 }, (_, i) => ({ id: 'x' + i, min: 50, grp: 1 }))); const again = await clanBonusFlush([{ id: 'y', min: 50, grp: 1 }]); return { n, again }; });
const mA2 = await ownerGet(`clans/${cid}/members/${uidA}`);
check('The daily cap: 10 more blocks add 5 (to 6 for the day), the next adds nothing', capped.n === 5 && capped.again === 0 && mA2.bcp === 6, JSON.stringify({ capped, bcp: mA2.bcp }));
// ---------- 3. rule attacks ----------
const today = await A.ev(() => dayKey(new Date()));
const att = {};
att.overCap = await tryOp(A, `async () => { const b = FB.writeBatch(FB.db); b.update(cDoc(CLAN.id, 'members', USER.uid), { bday: '${today}', bcp: 9, updatedAt: FB.serverTimestamp() }); b.update(cDoc(CLAN.id), { bonus: (CLAN.doc.bonus || 0) + 3, updatedAt: FB.serverTimestamp() }); return b.commit(); }`);
att.clanOnly = await tryOp(B, `async () => FB.updateDoc(cDoc(CLAN.id), { bonus: (CLAN.doc.bonus || 0) + 1, updatedAt: FB.serverTimestamp() })`);
att.mismatch = await tryOp(B, `async () => { const b = FB.writeBatch(FB.db); b.update(cDoc(CLAN.id, 'members', USER.uid), { bday: '${today}', bcp: 1, updatedAt: FB.serverTimestamp() }); b.update(cDoc(CLAN.id), { bonus: (CLAN.doc.bonus || 0) + 5, updatedAt: FB.serverTimestamp() }); return b.commit(); }`);
att.future = await tryOp(B, `async () => { const b = FB.writeBatch(FB.db); b.update(cDoc(CLAN.id, 'members', USER.uid), { bday: '2099-01-01', bcp: 6, updatedAt: FB.serverTimestamp() }); b.update(cDoc(CLAN.id), { bonus: (CLAN.doc.bonus || 0) + 6, updatedAt: FB.serverTimestamp() }); return b.commit(); }`);
att.others = await tryOp(B, `async u => { const b = FB.writeBatch(FB.db); b.update(cDoc(CLAN.id, 'members', u), { bday: '${today}', bcp: 6, updatedAt: FB.serverTimestamp() }); b.update(cDoc(CLAN.id), { bonus: (CLAN.doc.bonus || 0) + 0, updatedAt: FB.serverTimestamp() }); return b.commit(); }`, uidA);
att.oldDay = await tryOp(B, `async () => { const b = FB.writeBatch(FB.db); b.update(cDoc(CLAN.id, 'members', USER.uid), { bday: '2026-01-01', bcp: 6, updatedAt: FB.serverTimestamp() }); b.update(cDoc(CLAN.id), { bonus: (CLAN.doc.bonus || 0) + 6, updatedAt: FB.serverTimestamp() }); return b.commit(); }`);
const outsider = await device('O', 1000); await signup(outsider, 'co_' + R); await closeDlg(outsider);
// a brand-new member (joined today) can't add bonus points, so leaving and rejoining can't refill a day
const C = await device('C', 1000); await signup(C, 'cc_' + R); await closeDlg(C);
await C.ev(c => clanByCode(c).then(clanJoinOpen), code); await wait(1500);
att.newMember = await tryOp(C, `async () => { const b = FB.writeBatch(FB.db); b.update(cDoc(CLAN.id, 'members', USER.uid), { bday: '${today}', bcp: 1, updatedAt: FB.serverTimestamp() }); b.update(cDoc(CLAN.id), { bonus: (CLAN.doc.bonus || 0) + 1, updatedAt: FB.serverTimestamp() }); return b.commit(); }`);
const cFlush = await C.ev(() => clanBonusFlush([{ id: 'c1', min: 25, grp: 1 }]));
// a new clan can't start with bonus points
const O2 = await device('O2', 1000); await signup(O2, 'cn_' + R); await closeDlg(O2);
att.createBonus = await tryOp(O2, `async () => { const wb = FB.writeBatch; FB.writeBatch = db => { const bt = wb(db), set = bt.set.bind(bt); bt.set = (ref, data, o) => set(ref, ref.path.split('/').length === 2 && ref.path.startsWith('clans/') ? { ...data, bonus: 1000000 } : data, o); return bt; }; try { await clanCreate({ name: 'Rich ${R}', tag: 'RCH', desc: 'jee' }); } finally { FB.writeBatch = wb; } }`);
att.outsider = await tryOp(outsider, `async c => FB.updateDoc(FB.doc(FB.db, 'clans', c), { bonus: 999, updatedAt: FB.serverTimestamp() })`, cid);
check('Rules: a day count over 6, a clan bonus without the member row, a bigger clan bonus, a future day, an old day, someone else\'s row, an outsider, a member on their first day and a new clan with bonus points are all refused', Object.values(att).every(r => /permission|denied/i.test(r)), JSON.stringify(att));
const ok1 = await tryOp(B, `async () => clanBonusFlush([{ id: 'z', min: 25, grp: 1 }])`);
check('…while B\'s own honest bonus is accepted', ok1 === 'ALLOWED' && (await ownerGet(`clans/${cid}/members/${uidB}`)).bcp >= 1, ok1);
// ---------- 4. the clan page shows the milestone card ----------
const page = await B.ev(() => { showTab('clan'); renderClan(); const c = $('#clanBody .group-card'); return c ? c.textContent.replace(/\s+/g, ' ') : ''; });
check('The clan page shows the clan-session milestones with progress (0.4 / 5 h) and the rewards', /Clan session milestones/.test(page) && /\/ 5 h/.test(page) && /Clan clover/.test(page) && /Clan Scholar/.test(page), page.slice(0, 260));
check('A member on their first day: the app adds no bonus (and asks nothing of the server)', cFlush === 0, String(cFlush));
for (const d of [A, B, outsider, C, O2]) await d.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
