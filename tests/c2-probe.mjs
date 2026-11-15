import { b, device, signup, wait, log, errs, until, closeDlg } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const A = await device('A'), B = await device('B');
await Promise.all([signup(A, 'aa_' + R), signup(B, 'bb_' + R)]);
const uA = await A.ev(() => USER.uid);
// friends
await A.ev(n => sendRequest(n), 'bb_' + R); await wait(1500);
await B.ev(() => { const f = incoming()[0]; return acceptRequest(f.id); }); await wait(1500);
// A gets and equips the sloth rewards (solo + squad) and the squad aura
await A.ev(() => {
  const t = Date.now();
  for (const [id, src] of [['au_b_sloth', 'boss:sloth:solo'], ['au_b_sloth_sq', 'boss:sloth:squad'], ['col_b_sloth', 'boss:sloth:squad'], ['av_b_sloth_sq', 'boss:sloth:squad'], ['av_b_sloth', 'boss:sloth:solo']]) S.game.grants[id] = { src, at: t };
  S.game.equipped.aura = 'au_b_sloth_sq'; S.game.equipped.color = 'col_b_sloth'; S.game.equipped.avatar = 'av_b_sloth_sq'; G = null; save(); applyCosmetics();
});
await wait(4000);
log('A equipped after save:', await A.ev(() => JSON.stringify({ aura: myAura(), color: equippedId('color'), av: myAvatar(), owned: isOwned('au_b_sloth_sq') })));
log('A lastPub profile:', await A.ev(() => lastPub.publicProfiles), '\nstats:', (await A.ev(() => lastPub.publicStats || '')).slice(0, 300));
// B looks
await B.ev(() => { SOC.cache = {}; showTab('friends'); }); await wait(2500);
log('B friends row:', await B.ev(u => { const li = document.querySelector(`[data-open="${u}"]`); return li && li.innerHTML.match(/class="aura[^"]*"|nm[^>]*>|av_\w+/g); }, uA));
await B.ev(() => { S.ui.lbScope = 'friends'; S.ui.lbPeriod = 'week'; SOC.lb = {}; showTab('board'); }); await wait(2500);
log('B leaderboard row:', await B.ev(u => { const li = document.querySelector(`#boardBody li[data-uid="${u}"]`); return li && li.innerHTML.match(/class="aura[^"]*"|class="[^"]*nc-[^"]*"/g); }, uA));
await b.close();
log('errs', errs);
