// v1.12 cloud tests: Solo↔Squad with a real squad, two browsers on one account (claims, equips, bag, loadouts,
// questline, offline merge), friends/leaderboards showing auras + name colours, and the fallback with old rules.
// Usage: node v112b.mjs [page.html]   (base build: shows the old Solo/Squad bug)
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const PAGE = process.argv[2] || 'index.html';
const BASE = PAGE !== 'index.html';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = `http://localhost:8000/${PAGE}?emulator=1`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
async function device(name) {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 860 } });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '1.12');
    localStorage.setItem('pomodorolist-login-later', new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource|WebChannel|transport errored|Could not reach Cloud Firestore|rules do not accept "aura"|rules do not accept "produce"|rules do not accept "big"|Sync hiccup|offline mode|unavailable/i.test(m.text())) errs.push(name + ' ' + m.type() + ': ' + m.text().slice(0, 180)); });
  return { ctx, p, name };
}
const ev = (d, f, a) => d.p.evaluate(f, a);
const ready = d => d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 30000 });
const until = async (d, fn, arg, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(d, fn, arg)) return Date.now() - t0; await wait(150); } return -1; };
const closeDlg = d => ev(d, () => { if ($('#tutDlg') && $('#tutDlg').open && typeof finishTutorial === 'function') finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
async function signup(d, user) {
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.click('[data-mode=signup] >> visible=true'); await d.p.fill('#authUser', user); await d.p.fill('#authPass', 'secret12'); await d.p.fill('#authPass2', 'secret12'); await d.p.click('#authSubmit');
  await ready(d); await wait(1200); await closeDlg(d);
}
async function login(d, user) {
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.click('[data-mode=login] >> visible=true'); await d.p.fill('#authUser', user); await d.p.fill('#authPass', 'secret12'); await d.p.click('#authSubmit');
  await ready(d); await wait(1500); await closeDlg(d);
}
/** Focus sessions this week (Monday onwards, before now), published to the leaderboards. */
const addWeek = (d, mins) => ev(d, async mins => {
  const mon = weekStartOf(new Date(), 1), now = Date.now(), add = [];
  mins.forEach((m, i) => { let st = +mon + i * 3 * 3600e3 + 3600e3; if (st + m * 6e4 > now) st = now - m * 6e4 - i * 60e3 - 60e3; add.push({ id: 'w' + uid(), name: 'Physics', start: st, end: st + m * 6e4, duration: m * 6e4, planned: m * 6e4 }); });
  S.sessions.push(...add); S.sessions.sort((a, b) => a.start - b.start); cloudAddSessions(add); G = null; save(); publishPublic();
  await FB.waitForPendingWrites(FB.db);
}, mins);
const sfx = Date.now().toString(36).slice(-5), uA = 'qa_' + sfx, uB = 'qb_' + sfx, uC = 'qc_' + sfx;
const A1 = await device('A1'), B = await device('B'), C = await device('C');
await signup(A1, uA); await signup(B, uB); await signup(C, uC);
await ev(A1, async ([b, c]) => { await sendRequest(b); await sendRequest(c); }, [uB, uC]); await wait(1500);
for (const d of [B, C]) { await until(d, () => incoming().length > 0); await ev(d, () => acceptRequest(incoming()[0].id)); }
await until(A1, () => friendsList().length === 2, null, 15000);
check('setup: A has two friends (B, C)', (await ev(A1, () => friendsList().length)) === 2);
// A: a small daily goal, so the boss is small; B and C focus a lot this week
await ev(A1, () => { S.settings.goalMin = 20; save(); });
await addWeek(A1, [25]);
await addWeek(B, [100, 60]); await addWeek(C, [90, 50]);
await wait(1500);

// ===================== Solo ↔ Squad =====================
log('— Solo ↔ Squad —');
await ev(A1, () => showTab('quests')); await wait(600);
const solo0 = await ev(A1, () => { const s = bossBattle(bossView()); return { mode: s.mode, hp: s.hp, dmg: s.dmg }; });
// pick the squad through the UI
await ev(A1, () => { const b = document.querySelector('[data-bmode="squad"]'); b.click(); });
await wait(400);
await ev(A1, () => { const e = document.querySelector('#squadEdit'); if (e) e.click(); });
await wait(300);
await A1.p.$$eval('#squadPick input', xs => xs.forEach(x => { x.checked = true; }));
await A1.p.click('#squadSave');
await until(A1, () => { const s = typeof bossBattle === 'function' ? bossBattle('squad') : bossBattle(bossView()); return !!s.done; }, null, 15000);
const sq = await ev(A1, () => { const s = typeof bossBattle === 'function' ? bossBattle('squad') : bossBattle(bossView()); return { mode: s.mode, hp: s.hp, dmg: s.rawDmg, done: !!s.done, size: s.members.length }; });
check('Squad of 3 defeats its boss with everyone’s minutes (HP scaled for 3)', sq.done && sq.size === 3 && sq.hp === Math.round(solo0.hp * 2.6 / 10) * 10, JSON.stringify(sq));
const flips = [];
for (let i = 0; i < 6; i++) {
  const want = i % 2 ? 'squad' : 'solo';
  await ev(A1, w => { const b = document.querySelector(`[data-bmode="${w}"]`); if (b) b.click(); }, want);
  await wait(250);
  flips.push(await ev(A1, () => { const s = bossBattle(bossView()); const act = document.querySelector('#bossModeSeg .active'); return `${s.mode}:${act ? act.dataset.bmode : '?'}:${s.mode === 'solo' ? s.dmg : s.rawDmg}:${s.done ? 'won' : 'on'}`; }));
}
const exp = Array.from({ length: 6 }, (_, i) => (i % 2 ? `squad:squad:${sq.dmg}:won` : `solo:solo:${solo0.dmg}:on`));
check('Switch Solo → Squad → Solo … six times: each view keeps its own progress (Solo still running, Squad won)', flips.join() === exp.join(), flips.join(' | '));
if (BASE) { log('errors', JSON.stringify(errs), '| failures', fails); await b.close(); process.exit(0); }
const soloWin = await ev(A1, async () => { const st = new Date(); st.setTime(Date.now() - 200 * 60e3); const s = { id: 'solo' + uid(), name: 'P', start: +st, end: +st + 110 * 6e4, duration: 110 * 6e4, planned: 110 * 6e4 }; S.sessions.push(s); S.sessions.sort((a, b) => a.start - b.start); cloudAddSessions([s]); G = null; save(); checkBoss(); return { solo: !!bossBattle('solo').done, squad: !!bossBattle('squad').done, mastered: bossRecord(bossOfWeek().id).mastered }; });
check('Then a Solo win in the same week: both battles won → boss Mastered', soloWin.solo && soloWin.squad && soloWin.mastered, JSON.stringify(soloWin));

// ===================== Two browsers, one account =====================
log('— Two browsers on one account —');
const A2 = await device('A2');
await login(A2, uA);
const bossId = await ev(A1, () => bossOfWeek().id);
check('A2 sees both victories and the pending rewards', (await until(A2, id => bossRecord(id).mastered && pendingBossRewards().length === 2, bossId)) >= 0);
// claim the Squad rewards on A1 and the Solo rewards on A2 at the same moment; then both try the same one
let t0 = Date.now();
await Promise.all([ev(A1, id => claimBossRewards(id, 'squad'), bossId), ev(A2, id => claimBossRewards(id, 'solo'), bossId)]);
let ms = await until(A2, id => ['col_b_' + id, 'au_b_' + id + '_sq', 'th_b_' + id, 'au_b_' + id].every(isOwned), bossId);
const ms1 = await until(A1, id => ['col_b_' + id, 'au_b_' + id + '_sq', 'th_b_' + id, 'au_b_' + id].every(isOwned), bossId);
check('Claims on both devices merge: each sees all 4 boss rewards', ms >= 0 && ms1 >= 0, `${ms} / ${ms1} ms`);
// a quest done on both devices, claimed on both at the same time → exactly one claim wins
await ev(A1, async () => {
  const add = [];
  for (let i = 0; i < 42; i++) { const st = new Date(2026, 9, 1 + (i % 14), 21, 10 + (i % 3)); if (+st > Date.now() - 864e5 * 7) continue; add.push({ id: 'oct' + i, name: 'S' + (i % 6), start: +st, end: +st + 65 * 6e4, duration: 65 * 6e4, planned: 65 * 6e4 }); }
  S.sessions.push(...add); S.sessions.sort((a, b) => a.start - b.start); cloudAddSessions(add); G = null; save();
  await FB.waitForPendingWrites(FB.db);
});
await until(A2, () => questState(EVENT_BY_ID.hw26).qs.find(q => q.id === 'q3').done, null, 12000);
const reveals = await Promise.all([A1, A2].map(d => ev(d, async () => { $('#rewardDlg').close(); const rt = FB.runTransaction; window.__tx = []; FB.runTransaction = async (...a) => { const t0 = performance.now(); try { const r = await rt(...a); window.__tx.push(['ok', r, Math.round(performance.now() - t0)]); return r; } catch (e) { window.__tx.push(['err', e.code, Math.round(performance.now() - t0)]); throw e; } }; const t0 = performance.now(); await claimQuest('hw26', 'q3'); FB.runTransaction = rt; return $('#rewardDlg').open; })));
log('  tx:', JSON.stringify(await Promise.all([A1, A2].map(d => ev(d, () => window.__tx)))));
await wait(1500);
const q3 = await Promise.all([A1, A2].map(d => ev(d, () => ({ claim: !!S.game.claims.quests['hw26:q3'], item: isOwned('ring_candle'), n: Object.keys(S.game.grants).filter(k => k === 'ring_candle').length }))));
check('Same quest claimed on two devices at the same moment: exactly one claim celebrates, both end up with one item', reveals.filter(Boolean).length === 1 && q3.every(x => x.claim && x.item && x.n === 1), JSON.stringify({ reveals, q3 }));
// equips and loadouts sync
await ev(A1, id => { bagEquip('au_b_' + id + '_sq'); bagEquip('col_b_' + id); bagEquip('th_b_' + id); saveLoadout('Boss look'); }, bossId);
t0 = Date.now();
ms = await until(A2, id => equippedId('aura') === 'au_b_' + id + '_sq' && equippedId('color') === 'col_b_' + id && equippedId('theme') === 'th_b_' + id && S.loadouts.some(l => l.name === 'Boss look') && !!$('#lvChip .aura-x-au_b_' + id + '_sq'), bossId);
check('Equipped aura, name colour and theme + a new loadout appear on the other browser', ms >= 0 && ms < 5000, `${ms} ms`);
const loId = await ev(A2, () => S.loadouts.find(l => l.name === 'Boss look').id);
await ev(A2, id => deleteLoadout(id), loId);
ms = await until(A1, id => !S.loadouts.some(l => l.id === id), loId);
check('Deleting a loadout on one browser removes it on the other', ms >= 0, `${ms} ms`);
// questline progress from another device: a parked thought
const pk0 = await ev(A2, () => eventMetrics(EVENT_BY_ID.hw26).parked);
await ev(A1, () => { S.timer.status = 'running'; S.timer.phase = 'focus'; $('#parkInput').value = 'Check the mock-test schedule'; parkThought(); S.timer.status = 'idle'; });
ms = await until(A2, n => eventMetrics(EVENT_BY_ID.hw26).parked === n + 1, pk0);
check('Questline progress follows on the other browser (a parked thought)', ms >= 0 && ms < 5000, `${ms} ms`);
// offline changes merge when back online
await A2.ctx.setOffline(true); await wait(400);
await ev(A2, async () => { await claimQuest('hw26', 'q2'); bagUnequip('theme'); saveLoadout('Offline look'); });
await ev(A1, () => claimQuest('hw26', 'q4'));
await wait(1200);
const offline = await ev(A2, () => ({ q2: !!S.game.claims.quests['hw26:q2'], q4: !!S.game.claims.quests['hw26:q4'] }));
await A2.ctx.setOffline(false);
ms = await until(A1, () => S.game.claims.quests['hw26:q2'] && isOwned('th_ev_hw26') && S.loadouts.some(l => l.name === 'Offline look') && equippedId('theme') === 'th_default', null, 15000);
const ms2 = await until(A2, () => S.game.claims.quests['hw26:q4'] && isOwned('ti_ghost'), null, 15000);
check('Offline on A2 (claim + unequip + loadout) while A1 claims another quest → all merged on both', offline.q2 && !offline.q4 && ms >= 0 && ms2 >= 0, `${ms} / ${ms2} ms`);
await wait(4500);   // v1.13: event stamps and card styles unlock 2.5 s after a claim, then sync
const cmp = await Promise.all([A1, A2].map(d => ev(d, async () => {
  const doc = (await FB.getDocFromServer(userRef())).data();
  return { bag: bagItems().map(x => x.it.id).sort().join(), lo: S.loadouts.map(l => l.id).sort().join(), q: Object.keys(S.game.claims.quests).sort().join(), cloud: Object.keys(doc.game.grants || {}).sort().join(), eq: JSON.stringify(Object.fromEntries(LOOK_CATS.map(c => [c, equippedId(c)]))) };
})));
check('No lost or duplicated items: both browsers and the cloud agree on bag, claims, loadouts and equipped items', cmp[0].bag === cmp[1].bag && cmp[0].bag === cmp[1].cloud && cmp[0].lo === cmp[1].lo && cmp[0].q === cmp[1].q && cmp[0].eq === cmp[1].eq && cmp[0].bag.split(',').length === new Set(cmp[0].bag.split(',')).size, JSON.stringify(cmp.map(c => c.bag.split(',').length + ' items, claims ' + c.q)));

// ===================== Friends and leaderboards see the aura + name colour =====================
log('— Friends and leaderboards —');
await ev(A1, () => publishPublic()); await wait(2500);
const seenByB = async () => ev(B, async a => {
  SOC.cache = {}; SOC.lb = {};
  await loadFriendsPublic(true);
  showTab('friends'); renderFriends(true);
  const row = [...document.querySelectorAll('#friendsBody .who')].find(x => x.textContent.includes('@' + a));
  const li = row && row.parentElement;
  S.ui.lbScope = 'friends'; showTab('board'); await new Promise(r => setTimeout(r, 2500));
  const lb = [...document.querySelectorAll('#boardBody [data-uid]')].find(x => x.textContent.includes('@' + a));
  return { friendAura: li ? (li.innerHTML.match(/aura-x-[a-z0-9_]+/) || [''])[0] : 'no row', friendName: row ? (row.innerHTML.match(/nc-col_[a-z0-9_]+/) || [''])[0] : '', lbAura: lb ? (lb.innerHTML.match(/aura-x-[a-z0-9_]+/) || [''])[0] : 'no row', lbName: lb ? (lb.innerHTML.match(/nc-col_[a-z0-9_]+/) || [''])[0] : '' };
}, uA);
const seen = await seenByB();
check('A friend sees the special aura and gradient name colour (friends list + leaderboard)', seen.friendAura === `aura-x-au_b_${bossId}_sq` && seen.lbAura === `aura-x-au_b_${bossId}_sq` && seen.friendName === `nc-col_b_${bossId}` && seen.lbName === `nc-col_b_${bossId}`, JSON.stringify(seen));
// someone without the field (C never chose one; an unknown aura id from a future version) → streak aura
await ev(C, async () => { await FB.setDoc(FB.doc(FB.db, 'publicProfiles', USER.uid), { username: USER.username, level: 1, tier: 'novice', frame: 'frame_none', color: 'col_default', avatar: 'av_default', aura: 'au_from_the_future', streak: 4, longest: 4, hours: 3, joined: Date.now() - 864e5, updatedAt: FB.serverTimestamp() }); });
await C.ctx.close();   // C's own app would publish its real profile again
const seenC = await ev(A1, async c => { SOC.cache = {}; await loadFriendsPublic(true); showTab('friends'); renderFriends(true); const row = [...document.querySelectorAll('#friendsBody .who')].find(x => x.textContent.includes('@' + c)); const html = row ? row.parentElement.innerHTML : ''; return { found: !!row, special: /aura-x-/.test(html), streak: /aura-soft/.test(html) }; }, uC);
check('Unknown or missing aura field → the friend’s normal streak aura (fallback)', seenC.found && !seenC.special && seenC.streak, JSON.stringify(seenC));
// old security rules (no "aura" field): publishing quietly falls back, no sync error, friends see the streak aura
fs.copyFileSync('rules-old.rules', 'firestore.rules'); await wait(3500);
await ev(A1, id => { bagEquip('au_b_' + id); }, bossId);
await wait(5000);
const old = await ev(A1, () => ({ rejected: !!SOC.auraRejected, syncError, status: $('#syncStatus b').textContent }));
const seenOld = await seenByB();
fs.copyFileSync('/home/user/claude/firestore.rules', 'firestore.rules'); await wait(3500);
check('With the old rules: aura dropped quietly (no sync error); friends see the streak aura, the name colour still shows', old.rejected && !old.syncError && old.status !== 'Sync error' && !/aura-x-au_b_/.test(seenOld.friendAura) && seenOld.friendName === `nc-col_b_${bossId}`, JSON.stringify({ old, seenOld }));
// "Erase all data" on one browser: the other one drops its copy instead of merging it back
log('— Erase —');
await ev(A2, () => { window.confirm = () => true; $('#wipeBtn').click(); });
ms = await until(A1, () => !bagItems().length && !S.loadouts.length && !Object.keys(S.game.claims.quests).length, null, 12000);
await wait(3000);
const after = await ev(A1, async () => { const d = (await FB.getDocFromServer(userRef())).data(); return { bag: bagItems().length, cloud: Object.keys((d.game || {}).grants || {}).length, lo: (d.loadouts || []).length }; });
check('Erase on one browser → the other one is cleared too, and nothing is merged back into the cloud', ms >= 0 && after.bag === 0 && after.cloud === 0 && after.lo === 0, JSON.stringify(after));
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
process.exit(fails ? 1 : 0);   // v2.0: a failing check fails the suite (it used to exit 0)
