// v1.13.1 bosses: fixed HP 300–600 with tiers, mixed rotation, Squad scaling, the current-week fairness rule,
// rewards by tier, boss profile pictures (claim, retroactive without duplicates, bag, friends + leaderboards).
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html?emulator=1';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
async function device(name, extra = {}) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(([extra, td]) => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '1.13.1'); localStorage.setItem('pomodorolist-login-later', td); for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v); }, [extra, today()]);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('dialog', d => d.accept());
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource|WebChannel|transport errored|Could not reach Cloud Firestore|Sync hiccup|offline mode|unavailable/i.test(m.text())) errs.push(name + ' ' + m.type() + ': ' + m.text().slice(0, 180)); });
  return { ctx, p, name, ev: (f, a) => p.evaluate(f, a) };
}
const until = async (d, fn, arg, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await d.ev(fn, arg)) return Date.now() - t0; await wait(150); } return -1; };
const ready = d => d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 30000 });
async function signup(d, user) {
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.click('[data-mode=signup] >> visible=true'); await d.p.fill('#authUser', user); await d.p.fill('#authPass', 'secret12'); await d.p.fill('#authPass2', 'secret12'); await d.p.click('#authSubmit');
  await ready(d); await wait(1200); await d.ev(() => { if ($('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
}
// ---------- 1. The numbers (guest) ----------
const G = await device('guest', { 'pomodorolist-guest': '1', 'pomodorolist-onboarded:guest': '1' });
await G.p.goto(U); await G.p.waitForSelector('#appView:not(.hidden)'); await wait(1500);
const nums = await G.ev(() => ({ hp: BOSSES.map(b => BOSS_HP[b.id]), tiers: BOSSES.map(b => bossTier(b.id).n), names: BOSS_TIERS.map(t => t.name),
  rot: Array.from({ length: 20 }, (_, i) => bossTier(bossOfWeek(addDays(weekMonday(), 7 * i)).id).n),
  squad: [1, 2, 3, 4, 5, 6].map(n => squadHPFor(470, n)) }));
check('10 bosses with fixed Solo HP from 300 to 600, all different', nums.hp.length === 10 && Math.min(...nums.hp) === 300 && Math.max(...nums.hp) === 600 && new Set(nums.hp).size === 10, nums.hp.join(','));
check('Five tiers (Easy, Medium, Hard, Elite, Legendary), two bosses each', nums.names.join() === 'Easy,Medium,Hard,Elite,Legendary' && [1, 2, 3, 4, 5].every(n => nums.tiers.filter(t => t === n).length === 2));
const sameRun = nums.rot.some((t, i) => i && t === nums.rot[i - 1]), mono = nums.rot.slice(0, 10).every((t, i, a) => !i || t >= a[i - 1]);
check('The weekly rotation mixes easy and hard bosses (never the same tier two weeks running, never strictly increasing)', !sameRun && !mono, nums.rot.join(' '));
check('Squad HP = Solo × (1 + 0.6 × (members − 1)), rounded: 470 → 470/750/1030/1320/1600/1880', nums.squad.join() === '470,750,1030,1320,1600,1880', nums.squad.join());
// fairness: this week (started before the update) may only get easier
const fair = await G.ev(() => {
  const out = {}, wk = dayKey(weekMonday()), boss = bossOfWeek();
  out.tierFrom = S.game.tierFrom; out.nextMon = dayKey(addDays(weekMonday(), 7));
  for (const goal of [30, 60, 120, 240]) { S.settings.goalMin = goal; out['g' + goal] = { old: soloHP(), now: bossBattle('solo').hp, tier: BOSS_HP[boss.id] }; }
  // next week: the fixed HP whatever the goal
  S.settings.goalMin = 30; out.next = bossSoloHP(bossOfWeek(addDays(weekMonday(), 7)), dayKey(addDays(weekMonday(), 7))) === BOSS_HP[bossOfWeek(addDays(weekMonday(), 7)).id];
  S.settings.goalMin = 60; return out; });
check('Current week: HP is never raised — it is the lower of the old HP (5 × daily goal) and the new tier HP', ['g30', 'g60', 'g120', 'g240'].every(k => fair[k].now === Math.min(fair[k].old, fair[k].tier)), JSON.stringify(fair));
check('…and from next Monday every boss has its fixed tier HP (saved with the account)', fair.tierFrom === fair.nextMon && fair.next, `${fair.tierFrom}`);
// progress kept: 300 minutes done with an old 600-HP boss (goal 120): the lower new HP finishes it, nothing lost
const won = await G.ev(() => {
  S.settings.goalMin = 120; const mon = weekMonday(), add = [];
  const need = Math.ceil(bossBattle('solo').hp / 60) + 1;   // this week's boss decides how many one-hour blocks it takes (HP tiers 300–600); early on a Monday the week is short, so the blocks are kept inside it
  for (let i = 0; i < need; i++) { const st = Math.max(+mon + i * 60e3, Math.min(+mon + i * 3600e3 * 5 + 3600e3, Date.now() - (i + 1) * 3700e3)); add.push({ id: 'wk' + i, name: 'Maths', start: st, end: st + 60 * 6e4, duration: 60 * 6e4, planned: 60 * 6e4 }); }
  S.sessions.push(...add); S.sessions.sort((a, c) => a.start - c.start); G = null;
  const before = bossBattle('solo'); checkBoss(); const after = bossBattle('solo');
  return { dmg: before.rawDmg, hp: before.hp, done: !!after.done, recorded: after.done && after.done.hp };
});
check('Progress is never lost: damage already done counts against the (lower) HP, and the win is recorded at that HP', won.dmg >= won.hp && won.done && won.recorded === won.hp, JSON.stringify(won));
const recHP = await G.ev(() => { BOSS_HP[bossOfWeek().id] = 9999; G = null; const hp = bossBattle('solo').hp; return hp; });
check('A recorded victory keeps its HP even if the numbers change later', recHP === won.recorded, String(recHP));
await G.ev(() => location.reload()); await G.p.waitForSelector('#appView:not(.hidden)'); await wait(1500);
// the arena, next-boss preview and Trophy Hall show the tier and HP
await G.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.ui.questView = 'boss'; S.settings.bossMode = 'solo'; showTab('quests'); });
await wait(1000);
const ui = await G.ev(() => ({ arena: ($('.arena-card .boss-tier') || {}).textContent, next: ($('.next-boss .btier') || {}).textContent, hall: $$('.hall-card .btier').length, hallTxt: $$('.hall-card .btier').map(x => x.textContent).slice(0, 3), squadTxt: $('.arena-card .boss-tier .lbl').textContent }));
check('Arena shows the tier (stars + name) and Solo/Squad HP; next-boss preview and all 10 Trophy Hall cards show tier + HP', /★/.test(ui.arena) && /(Easy|Medium|Hard|Elite|Legendary)/.test(ui.arena) && /Solo \d+ HP · Squad \d/.test(ui.squadTxt) && /★.*(Easy|Medium|Hard|Elite|Legendary) · \d{3} HP/.test(ui.next) && ui.hall === 10, JSON.stringify(ui));
// rewards by tier
const rw = await G.ev(() => BOSSES.map(b => ({ id: b.id, t: bossTier(b.id).n, solo: BOSS_REWARDS.solo(b.id).map(i => itemRarity(ITEM_BY_ID[i])), squad: BOSS_REWARDS.squad(b.id).map(i => itemRarity(ITEM_BY_ID[i])),
  au: SPECIAL_AURAS['au_b_' + b.id].lv, auq: SPECIAL_AURAS['au_b_' + b.id + '_sq'].lv, avAnim: !!AVATAR_ART['av_b_' + b.id].anim, avqAnim: !!AVATAR_ART['av_b_' + b.id + '_sq'].anim })));
const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };
const byT = n => rw.filter(r => r.t === n);
check('Rarity rises with HP: Easy → Common, Medium → Rare, Hard/Elite → Epic, Legendary → Legendary (Solo)', byT(1).every(r => r.solo.every(x => x === 'common')) && byT(2).every(r => r.solo.every(x => x === 'rare')) && [3, 4].every(n => byT(n).every(r => r.solo.every(x => x === 'epic'))) && byT(5).every(r => r.solo.every(x => x === 'legendary')), JSON.stringify(rw.map(r => r.id + ':' + r.solo[0] + '/' + r.squad[0])));
check('Squad rewards are always at least as rare and one step fancier than Solo (aura level +1, golden animated picture)', rw.every(r => RANK[r.squad[0]] >= RANK[r.solo[0]] && r.auq === r.au + 1 && r.avqAnim));
check('Legendary bosses: animated profile pictures; weaker bosses: still ones', rw.every(r => r.avAnim === (r.t === 5)));
const looks = await G.ev(() => {
  const out = {};
  for (const [k, id] of [['easy', 'swarm'], ['hard', 'golem'], ['legend', 'dragon']]) {
    out[k] = { aura: withAura('<svg></svg>', 0, 'au_b_' + id).match(/class="([^"]+)"/)[1], auraSq: withAura('<svg></svg>', 0, 'au_b_' + id + '_sq').match(/class="([^"]+)"/)[1], name: nameAttrs('col_b_' + id) };
    S.game.equipped.theme = 'th_b_' + id; S.game.grants['th_b_' + id] = { src: 'test', at: 1 }; G = null; applyCosmetics(); out[k].fx = $('#themeFx').className;
  }
  S.game.equipped.theme = 'th_default'; G = null; applyCosmetics();
  return out; });
check('Looks get richer with the tier: Easy = a soft glow and a plain theme; Hard = pulsing aura + arena glow; Legendary = spinning, shimmering, flaring aura, shimmer + glow name, animated theme',
  !/spin|shim|pulse/.test(looks.easy.aura) && looks.easy.fx === 'hidden' && /pulse/.test(looks.hard.aura) && looks.hard.fx === 'tfx tfx-3' && /spin/.test(looks.legend.aura) && /shim/.test(looks.legend.auraSq) && /flare/.test(looks.legend.auraSq) && /ncsh/.test(looks.legend.name) && /ncgl/.test(looks.legend.name) && looks.legend.fx === 'tfx tfx-5' && !/ncsh/.test(looks.easy.name), JSON.stringify(looks));
await G.p.screenshot({ path: 's113/v1131b-arena.png', fullPage: true });
await G.ctx.close();
// ---------- 2. Profile pictures: claim, bag, retroactive (no duplicates), friends + leaderboards ----------
const sfx = Date.now().toString(36).slice(-5), uA = 'bp_' + sfx, uB = 'bq_' + sfx;
const A = await device('A'), B = await device('B');
await signup(A, uA); await signup(B, uB);
await A.ev(async u => { await sendRequest(u); }, uB); await wait(1500);
await until(B, () => incoming().length > 0); await B.ev(() => acceptRequest(incoming()[0].id));
await until(A, () => friendsList().length === 1, null, 15000);
// A beat the Hydra (Squad) and the Swarm (Solo) earlier and claimed the Swarm rewards back in v1.13 (no picture then)
await A.ev(() => {
  const wk = k => dayKey(addDays(weekMonday(), -7 * k)), at = Date.now() - 20 * 864e5;
  S.game.claims.bosses[wk(3) + '|squad'] = at; S.game.trophies[wk(3) + '|squad'] = { boss: 'hydra', mode: 'squad', hp: 1190, coins: 80, size: 2, at };
  S.game.claims.bosses[wk(5) + '|solo'] = at; S.game.trophies[wk(5) + '|solo'] = { boss: 'swarm', mode: 'solo', hp: 300, coins: 38, size: 1, at };
  S.game.claims.brew['swarm|solo'] = at; for (const id of ['th_b_swarm', 'au_b_swarm']) S.game.grants[id] = { src: 'boss:swarm:solo', at };
  G = null; save(); reconcileRewards('quiet');
});
await wait(800);
const retro = await A.ev(() => ({ swarm: S.game.grants.av_b_swarm, hydraSq: !!S.game.grants.av_b_hydra_sq, pending: pendingBossRewards().map(p => p.boss.id + '|' + p.mode) }));
check('Retroactive: a past victory whose rewards were already claimed gets its profile picture', retro.swarm && retro.swarm.src === 'boss:swarm:solo', JSON.stringify(retro));
check('…and a past victory not claimed yet gets it with its rewards (claim waiting)', !retro.hydraSq && retro.pending.includes('hydra|squad'));
await A.ev(() => claimBossRewards('hydra', 'squad'));
await wait(2500);
const claimed = await A.ev(() => ({ own: isOwned('av_b_hydra_sq'), reveal: $$('#rwItems .rw-item').map(x => x.querySelector('.rw-n').textContent), src: srcOf(S.game.grants.av_b_hydra_sq.src).label }));
await A.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
check('Claiming a Squad win: the golden profile picture comes with the name colour, squad aura and (since 1.15) a room poster', claimed.own && claimed.reveal.includes('Golden Hydra') && claimed.reveal.includes('Hydra poster') && claimed.reveal.length === 4, JSON.stringify(claimed));
// no duplicates: run the unlock check again, reload, and count
await A.ev(() => { checkUnlocks(false); checkUnlocks(false); reconcileRewards('quiet'); });
await A.p.reload(); await ready(A); await wait(1500);
const dup = await A.ev(() => { const ids = bagItems().map(x => x.it.id); return { n: ids.filter(i => /^av_b_/.test(i)).sort(), uniq: new Set(ids).size === ids.length }; });
check('No duplicates after repeated checks and a reload', dup.uniq && dup.n.join() === 'av_b_hydra_sq,av_b_swarm', JSON.stringify(dup));
await A.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.ui.bagCat = 'avatar'; showTab('bag'); });
await wait(600);
const bag = await A.ev(() => $$('#bagList .bag-item').filter(x => /^av_b_/.test(x.dataset.bid)).map(x => ({ id: x.dataset.bid, src: x.querySelector('.bi-src').textContent, rar: x.querySelector('.rar').textContent })));
check('Bag → Profile pictures: listed with their source (“Boss: Deadline Hydra (Squad)”) and rarity', bag.some(x => x.id === 'av_b_hydra_sq' && /Boss: Deadline Hydra \(Squad\)/.test(x.src) && /Legendary/.test(x.rar)) && bag.some(x => x.id === 'av_b_swarm' && /Boss: Notification Swarm \(Solo\)/.test(x.src) && /Common/.test(x.rar)), JSON.stringify(bag));
await A.ev(() => $('#bagList [data-bequip="av_b_hydra_sq"]').click());
await wait(3000);
check('Equipped like any avatar (header and badge show it)', await A.ev(() => myAvatar() === 'av_b_hydra_sq' && !!$('#avatarBtn svg g[clip-path]')));
// B sees it: friends list, profile and leaderboard (through the existing avatar field)
await B.ev(() => { showTab('friends'); });
const seen = await until(B, async () => { await loadFriendsPublic(true); const p = cached('publicProfiles', otherUid(friendsList()[0])); return p && p.avatar === 'av_b_hydra_sq'; }, null, 20000);
await B.ev(() => { renderFriends(true); });
await wait(600);
const fv = await B.ev(() => ({ list: $('#friendsBody .person') && $('#friendsBody .person').innerHTML.includes('#'), pic: !!$('#friendsBody .person svg.av, #friendsBody .person svg g[clip-path]') }));
check('A friend sees the boss picture (published through the existing avatar field)', seen >= 0 && fv.pic, JSON.stringify({ seen, ...fv }));
await B.ev(() => { S.ui.lbScope = 'friends'; showTab('board'); });
await wait(2500);
check('…and on the leaderboard', await B.ev(() => $$('.lb li, .lb-pod').some(li => li.innerHTML.includes('clip-path'))));   // top three sit on the podium (v1.16)
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
