// v1.14.3 monthly raid: the HP table (Nov 7,000→9,300, Dec 7,500→10,000, later months 5,000–10,000), October unchanged,
// HP fixed at the month's start (members joining don't move it), everyone's hits adding up, the rally bonus, claimed once,
// rarer rewards in harder months — and the security rules accepting the right HP and refusing wrong ones. 6 accounts.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, focus, owner, ownerGet, tryOp } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
// ---------- 1. the table (same numbers as the rules) ----------
const L = await device('L', 1280);
await signup(L, 'rl_' + R);
const T = await L.ev(() => {
  const hp = (mk, n) => raidHPFor(mk, n), out = {};
  for (const mk of ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07', '2027-08', '2027-09', '2027-10', '2027-11'])
    out[mk] = { boss: raidOf(mk).name, tier: raidOf(mk).tier ? raidTier(raidOf(mk)).name : '', one: hp(mk, 1), six: hp(mk, 6), fifteen: hp(mk, 15), thirty: hp(mk, 30), forty: hp(mk, 40) };
  return out;
});
log(JSON.stringify(T));
check('November 2026: 7,000 HP for a small clan up to 9,300 for 30 members', T['2026-11'].one === 7000 && T['2026-11'].thirty === 9300 && T['2026-11'].six === 7400 && T['2026-11'].fifteen === 8100);
check('December 2026: 7,500 up to 10,000', T['2026-12'].one === 7500 && T['2026-12'].thirty === 10000);
const later = Object.entries(T).filter(([mk]) => mk >= '2027-01');
check('Later months: every one between 5,000 and 10,000, with easier (5,000–6,000) and harder (8,000+ for big clans) ones mixed in',
  later.every(([, v]) => v.one >= 5000 && v.thirty <= 10000) && later.some(([, v]) => v.thirty <= 6000) && later.some(([, v]) => v.thirty >= 10000 && v.one >= 8000));
check('Each month has its own boss and tier (12 different bosses a year)', new Set(Object.entries(T).filter(([mk]) => mk >= '2026-11' && mk <= '2027-10').map(([, v]) => v.boss)).size === 12 && later.every(([, v]) => v.tier));
check('More than 30 members counts as 30; HP is a multiple of 100', T['2026-11'].forty === 9300 && Object.values(T).every(v => [v.one, v.six, v.fifteen, v.thirty].every(x => x % 100 === 0)));
check('October 2026 keeps the old HP (600 × members, at least 1,800)', T['2026-10'].one === 1800 && T['2026-10'].six === 3600 && T['2026-10'].boss === 'Doomscroll Leviathan');
const rar = await L.ev(() => ['au_cr_hydra', 'au_cr_behemoth', 'au_cr_wyrm', 'au_cr_titan'].map(id => [ITEM_BY_ID[id].rarity, SPECIAL_AURAS[id].lv]));
check('Rewards scale with difficulty: Easier → Rare, Normal/Hard → Epic, Elite → Legendary (and stronger auras)', JSON.stringify(rar) === JSON.stringify([['rare', 3], ['epic', 4], ['legendary', 5], ['epic', 4]]), JSON.stringify(rar));
// ---------- 2. a clan of 6 in October ----------
await L.ev(n => clanCreate({ name: n, tag: 'RAID', desc: 'jee' }), 'Raid Crew ' + R);
const cid = await L.ev(() => CLAN.id);
const HP = (await ownerGet('clans/' + cid)).raidHP, mkNow = (await ownerGet('clans/' + cid)).monthKey, oct = mkNow < '2026-11';
check(oct ? 'A clan made in October starts with October’s HP (1,800), as before' : `A clan made in ${mkNow} starts with that month’s HP for one member (${T[mkNow] ? T[mkNow].one : '?'})`, oct ? HP === 1800 : HP === (T[mkNow] || {}).one, String(HP));
await L.ev(() => clanSetDoc({ joinMode: 'open' }));
const code = await L.ev(() => CLAN.info.code);
const M = [];
for (let i = 1; i <= 5; i++) { const d = await device('M' + i, 1000); await signup(d, `rm${i}_` + R); await d.ev(c => clanByCode(c).then(clanJoinOpen), code); M.push(d); }
await wait(1500);
check('6 members', (await ownerGet('clans/' + cid)).members === 6);
// everyone's hits this month (October): each member's focus counts for them and adds up for the clan
const mins = [30, 25, 20, 45, 15, 10];
const all = [L, ...M];
for (let i = 0; i < all.length; i++) { await focus(all[i], mins[i]); }
await wait(5000);
for (const d of all) await d.ev(() => flushContrib()); await wait(3000);
const c1 = await ownerGet('clans/' + cid);
const mems = await Promise.all(all.map(d => d.ev(() => USER.uid).then(u => ownerGet(`clans/${cid}/members/${u}`))));
check('Each member’s raid hits this month are tracked (moKey = this month, moMin = their minutes)', mems.every((m, i) => m.moKey === c1.monthKey && m.moMin === mins[i]), JSON.stringify(mems.map(m => [m.moKey, m.moMin])));
check('…and add up to the clan’s raid damage', c1.monthMin === mins.reduce((a, x) => a + x, 0), `${c1.monthMin}`);
check('The HP didn’t change mid-month (members joined after the clan was made)', c1.raidHP === HP, String(c1.raidHP));
await L.ev(() => { showTab('clan'); return clanRefresh(true); });
await until(L, () => (CLAN.doc.monthMin || 0) === 145 && (CLAN.members || []).filter(m => m.moMin).length === 6, null, 15000);
await L.ev(() => renderClan()); await wait(500);
const card = await L.ev(() => { const c = $('.clan-raid'); return { text: c.textContent.replace(/\s+/g, ' '), rows: c.querySelectorAll('.rc-row').length, line: c.querySelector('[data-raid-line]').textContent, dl: daysLeftInMonth() }; });
check('Raid card: the progress line (“% · N members contributed · N days left”)', card.line === `${Math.floor(145 / HP * 100)}% · 6 members contributed · ${card.dl} day${card.dl === 1 ? '' : 's'} left`, card.line);
check('Raid card: each member’s contribution is listed', card.rows === 6);
check(oct ? 'Raid card: October explains the old HP and that bosses get stronger from November, and shows what’s coming' : 'Raid card: the month’s boss, its tier and HP are shown', oct ? (/600 × members/.test(card.text) && /Coming up/.test(card.text) && /Burnout Behemoth/.test(card.text) && /Frostbite Wyrm/.test(card.text)) : (new RegExp(T[mkNow].boss).test(card.text) && card.text.includes(HP.toLocaleString('en-US')) && /HP/.test(card.text)), card.text.slice(0, 400));
// ---------- 3. the rules at the start of a month ----------
const RW = `window.rw = async o => {
  const id = CLAN.id, mref = cDoc(id, 'members', USER.uid), cref = cDoc(id);
  const m = (await FB.getDoc(mref)).data(), c = (await FB.getDoc(cref)).data(), d = o.d || 5;
  const b = FB.writeBatch(FB.db), sameWk = m.weekKey === c.weekKey;
  const mo = o.oldApp ? {} : { moKey: o.moKey ?? o.mk, moMin: o.moMin ?? ((m.moKey === (o.moKey ?? o.mk)) ? (m.moMin || 0) + d : d) };
  b.update(mref, { contrib: m.contrib + d, weekKey: c.weekKey, weekMin: sameWk ? m.weekMin + d : d, ...mo, lastAt: Date.now(), lastIds: ['t' + Math.random()], updatedAt: FB.serverTimestamp() });
  b.update(cref, { xp: FB.increment(d), level: clanLevelFor(c.xp + d), weekMin: FB.increment(d), updatedAt: FB.serverTimestamp(),
    ...(o.mk === c.monthKey ? { monthMin: FB.increment(d), ...(o.hp ? { raidHP: o.hp } : {}) } : { monthKey: o.mk, monthMin: d, raidHP: o.hp }) });
  try { await b.commit(); return 'ALLOWED'; } catch (e) { return e.code || e.message; }
};`;
for (const d of all) await d.ev(s => eval(s), RW);
const M1 = M[0];
// month keys relative to the clan's month (the suite was written in October 2026; it now follows the calendar)
const addM = (mk, n) => { const [y, m] = mk.split('-').map(Number); const t = y * 12 + m - 1 + n; return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, '0')}`; };
const mkNext = addM(mkNow, 1), mkNext2 = addM(mkNow, 2);
const HP6n = await L.ev(mk => raidHPFor(mk, 6), mkNext), HP7n = await L.ev(mk => raidHPFor(mk, 7), mkNext), HP7n2 = await L.ev(mk => raidHPFor(mk, 7), mkNext2);
check('Rules: an app before 1.14.3 (no raid fields) can still add focus mid-month', (await M1.ev(mk => rw({ mk, oldApp: true }), mkNow)) === 'ALLOWED');
check('Rules: a member’s raid hits can’t be inflated', (await M1.ev(mk => rw({ mk, moMin: 9999 }), mkNow)) === 'permission-denied');
check('Rules: raid hits must be for the clan’s month', (await M1.ev(([mk, prev]) => rw({ mk, moKey: prev, moMin: 5 }), [mkNow, addM(mkNow, -1)])) === 'permission-denied');
check('Rules: HP can’t change mid-month (e.g. raised after someone joins)', (await M1.ev(mk => rw({ mk, hp: 4200 }), mkNow)) === 'permission-denied');
for (const [hp, why] of [[HP6n === 3600 ? 3700 : 3600, 'the old formula'], [9300 === HP6n ? 9400 : 9300, 'the 30-member HP'], [HP6n - 100, 'an HP that’s 100 off'], [1, 'a tiny HP']])
  check(`Rules: a new month (${mkNext}, 6 members) with ${why} (${hp}) is refused`, (await M1.ev(([mk, h]) => rw({ mk, hp: h }), [mkNext, hp])) === 'permission-denied');
check(`Rules: ${mkNext} starts with ${HP6n} HP for 6 members — accepted`, (await M1.ev(([mk, h]) => rw({ mk, hp: h }), [mkNext, HP6n])) === 'ALLOWED');
let c2 = await ownerGet('clans/' + cid);
check(`…the clan is now on ${mkNext}: monthMin restarts, HP ${HP6n}`, c2.monthKey === mkNext && c2.monthMin === 5 && c2.raidHP === HP6n, JSON.stringify([c2.monthKey, c2.monthMin, c2.raidHP]));
// someone joins mid-month: HP stays
const J = await device('J', 1000); await signup(J, 'rj_' + R); await J.ev(c => clanByCode(c).then(clanJoinOpen), code); await wait(1500); await J.ev(s => eval(s), RW);
check('A 7th member joins mid-month…', (await ownerGet('clans/' + cid)).members === 7);
check(`…their focus keeps the HP at ${HP6n} (no jump to the 7-member value)`, (await J.ev(mk => rw({ mk }), mkNext)) === 'ALLOWED' && (await ownerGet('clans/' + cid)).raidHP === HP6n);
check(`…and they can’t reset it to ${HP7n} either`, (await J.ev(([mk, h]) => rw({ mk, hp: h }), [mkNext, HP7n])) === 'permission-denied');
check('Rules: a month two months ahead of the server’s calendar is refused even with the right HP — the 1.14.3 calendar guard', (await J.ev(([mk, h]) => rw({ mk, hp: h }), [mkNext2, HP7n2])) === 'permission-denied' && (await J.ev(([mk, h]) => rw({ mk, hp: h }), [mkNext2, HP7n2 + 500])) === 'permission-denied');
check('…while the next month with the right HP is fine (one month of leeway for time zones)', HP7n2 > 0 && (await L.ev(mk => raidHPFor(mk, 7), mkNext2)) === HP7n2);
check('Rules: a month string that isn’t a real month is refused', (await J.ev(h => rw({ mk: '2026-13', hp: h }), HP6n)) === 'permission-denied');
// a new clan: its HP must come from the table
const N = await device('N', 1000); await signup(N, 'rn_' + R);
const bad = await N.ev(async n => { const keep = raidHPFor; window.raidHPFor = () => 1; try { await clanCreate({ name: n, tag: 'BADH', desc: 'jee' }); return 'ALLOWED'; } catch (e) { return e.code || e.message; } finally { window.raidHPFor = keep; } }, 'Bad HP ' + R);
check('Rules: a new clan with a made-up raid HP is refused', bad === 'permission-denied', bad);
check('…with the table’s HP it’s fine', (await N.ev(n => clanCreate({ name: n, tag: 'GOOD', desc: 'jee' }).then(() => 'ALLOWED', e => e.code || e.message), 'Good HP ' + R)) === 'ALLOWED');
// ---------- 4. claiming, rally bonus, once ----------
await owner('clans/' + cid, { monthKey: '2026-12', monthMin: 8100, raidHP: 8000, xp: 9000, level: await L.ev(() => clanLevelFor(9000)) });
const claim = v => M1.ev(async v => { try { await FB.updateDoc(cDoc(CLAN.id), { ['raids.2026-12']: v, tr: FB.increment(1), updatedAt: FB.serverTimestamp() }); return 'ALLOWED'; } catch (e) { return e.code; } }, v);
check('Rules: claiming with a boss name that isn’t a raid boss is refused', (await claim('dragonzilla')) === 'permission-denied');
await owner('clans/' + cid, { members: 4 });
check('Rules: the rally bonus needs a clan of 5+ (4 members: refused)', (await claim('wyrm+')) === 'permission-denied');
await owner('clans/' + cid, { members: 7 });
check('Rules: December’s raid claimed with the rally bonus (7 members)', (await claim('wyrm+')) === 'ALLOWED');
check('Rules: and only once', (await claim('wyrm')) === 'permission-denied');
await L.ev(() => clanRefresh(true));
await until(L, () => raidsWon(CLAN.doc).includes('wyrm'), null, 15000);
const won = await L.ev(() => ({ aura: clanOwns(ITEM_BY_ID.au_cr_wyrm), emb: Object.keys(CLAN_EMBLEMS).includes('ce_r_wyrm'), banner: bannerOptions().includes('rd:wyrm'), look: !!bannerLook('rd:wyrm') }));
check('Every member gets the Legendary Wyrm raid aura; the rally banner is offered for player cards', won.aura && won.emb && won.banner && won.look, JSON.stringify(won));
const emb = await L.ev(() => clanSetDoc({ emblem: 'ce_r_wyrm' }).then(() => 'ALLOWED', e => e.code));
check('Rules: the clan can wear the raid emblem it won (with the rally mark)', emb === 'ALLOWED', emb);
check('Rules: but not one it didn’t win', (await L.ev(() => clanSetDoc({ emblem: 'ce_r_swarm' }).then(() => 'ALLOWED', e => e.code))) === 'permission-denied');
// ---------- 5. November in the app (a device whose clock is in November) ----------
await owner('clans/' + cid, { monthKey: '2026-10', monthMin: 145, raidHP: 1800, members: 7, raids: { '2026-12': 'wyrm+' }, emblem: 'ce_tomato' });
const NV = await device('NV', 1280);
await NV.ctx.clock.install({ time: new Date('2026-11-24T12:00:00') });
await NV.p.goto('http://localhost:8000/index.html?emulator=1'); await NV.p.waitForSelector('#authView:not(.hidden)');
const uid1 = await M[0].ev(() => USER.uid);
await NV.p.click('[data-mode=login] >> visible=true'); await NV.p.fill('#authUser', 'rm1_' + R); await NV.p.fill('#authPass', 'secret12'); await NV.p.click('#authSubmit');
await NV.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && CLAN.started, null, { timeout: 30000 }); await wait(2500); await closeDlg(NV);
check('November device: this month is Burnout Behemoth (Hard)', await NV.ev(() => monthKeyNow() === '2026-11' && raidOf().id === 'behemoth'));
// the server's calendar is still October, so a November device's writes are refused by the calendar guard (by design);
// the month start itself is set up as the November write would have made it (the rules test above accepted exactly this HP)
await owner('clans/' + cid, { monthKey: '2026-11', monthMin: 20, raidHP: 7500 });
await owner(`clans/${cid}/members/${uid1}`, { moKey: '2026-11', moMin: 20 });
const c3 = await ownerGet('clans/' + cid);
check('November starts the month with the table’s HP for 7 members (7,500)', c3.monthKey === '2026-11' && c3.raidHP === 7500 && c3.monthMin === 20 && (await NV.ev(() => raidHPFor('2026-11', 7))) === 7500, JSON.stringify([c3.monthKey, c3.raidHP, c3.monthMin]));
await NV.ev(() => { showTab('clan'); return clanRefresh(true); });
await until(NV, () => CLAN.doc.monthKey === '2026-11' && CLAN.members, null, 15000); await NV.ev(() => renderClan()); await wait(500);
const memsNov = (await Promise.all([L, ...M, J].map(d => d.ev(() => USER.uid).then(u => ownerGet(`clans/${cid}/members/${u}`))))).filter(m => m.moKey === '2026-11' && m.moMin > 0).length;
const nc = await NV.ev(() => { const c = $('.clan-raid'); return { t: c.textContent.replace(/\s+/g, ' '), line: c.querySelector('[data-raid-line]').textContent }; });
check('November raid card: name, tier, HP and how it scales', /Burnout Behemoth/.test(nc.t) && /Hard/.test(nc.t) && /7,480 \/ 7,500 HP/.test(nc.t) && /7,000 for 1 member up to 9,300 for 30/.test(nc.t), nc.t.slice(0, 500));
check(`November progress line: “0% · ${memsNov} members contributed · 7 days left”`, nc.line === `0% · ${memsNov} member${memsNov === 1 ? '' : 's'} contributed · 7 days left`, nc.line);
check('Reward line: Epic for a Hard month, and the rally bonus at 5+', /Epic/.test(nc.t) && nc.t.includes(`Rally bonus at 5+ contributors (${memsNov}/5)`));
await NV.p.screenshot({ path: 's143/v1143b-raid-nov.png', fullPage: false });
await NV.ev(() => $('.clan-raid').scrollIntoView({ block: 'start' })); await wait(300);
await NV.p.screenshot({ path: 's143/v1143b-raid-card.png' });
// beat it with 5 contributors in the app → claim with the rally bonus
await owner('clans/' + cid, { monthMin: 7600 });
for (const [i, d] of M.entries()) { const u = await d.ev(() => USER.uid); await owner(`clans/${cid}/members/${u}`, { moKey: '2026-11', moMin: 1000 + i * 100 }); }
await NV.ev(() => clanRefresh(true));
await until(NV, () => CLAN.doc.monthMin >= CLAN.doc.raidHP && raidContributors().length >= 5, null, 15000); await NV.ev(() => renderClan()); await wait(500);
check('5+ members contributed → the claim button shows', await NV.ev(() => !!$('#clanRaidClaim') && raidContributors().length >= 5));
await closeDlg(NV); await NV.p.click('#clanRaidClaim'); await wait(2500);
const c4 = await ownerGet('clans/' + cid);
check('Claimed in the app with the rally bonus (raids[2026-11] = behemoth+)', c4.raids && c4.raids['2026-11'] === 'behemoth+' && c4.tr >= 1, JSON.stringify(c4.raids));
check('…the button is gone (claimed once) and the card says so', await NV.ev(() => !$('#clanRaidClaim') && /Defeated/.test($('.clan-raid').textContent)));
await NV.ev(() => $('.clan-raid').scrollIntoView({ block: 'start' })); await wait(300);
await NV.p.screenshot({ path: 's143/v1143b-raid-won.png' });
// the November device's clock is a month ahead of the server: Firestore warns about "future" times and the server refuses
// its "not in the future" activity writes. Expected for that device only; anything else is a real error.
const skew = e => e.startsWith('NV') && /in the future|PERMISSION_DENIED|evaluation error/.test(e);
log('errors', JSON.stringify(errs.filter(e => !skew(e))));
log('expected clock-skew messages on the November device:', errs.filter(skew).length);
if (errs.some(e => !skew(e))) check('no console errors', false);
log('failures', failCount());
await b.close();
process.exit(failCount() ? 1 : 0);
