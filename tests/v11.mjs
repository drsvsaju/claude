import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [], denied = [];
async function device(name, { w = 1180, h = 900 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '1.8'); const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()));
    window.__opened = []; window.open = (...a) => { window.__opened.push(a.join(' ')); return null; }; });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (/permission|denied|refused|Sync error/i.test(m.text())) denied.push(name + ': ' + m.text().slice(0, 150)); });
  p.on('dialog', d => d.accept());
  p.toasts = []; await p.exposeFunction('__toast', m => p.toasts.push(m));
  await p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('toast-item') && window.__toast(n.textContent)))).observe(document.getElementById('toast'), { childList: true })); });
  return { ctx, p, name };
}
const close = async d => { await d.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await wait(300); };

// ================= guest: shop, equip, where it shows =================
const G = await device('G');
await G.p.goto(U);
await G.p.evaluate(() => { const ss = []; for (let i = 1; i <= 60; i++) { const st = Date.now() - i * 864e5; ss.push({ id: 'g' + i, name: 'Maths', start: st, end: st + 50 * 60000, duration: 50 * 60000, planned: 50 * 60000, preset: '' }); } localStorage.setItem('focus-app-v1', JSON.stringify({ sessions: ss })); localStorage.setItem('pomodorolist-guest', '1'); });
await G.p.goto(U); await G.p.waitForSelector('#appView:not(.hidden)'); await wait(1500); await close(G);
log('feedback links:', await G.p.evaluate(() => $$('a[href*="github.com/siverieg/"]').filter(a => /issues/.test(a.href)).map(a => `${a.textContent.trim()} → ${a.href} ${a.target} ${a.rel}`).join(' | ')));
await G.p.keyboard.press('Control+k'); await wait(200); await G.p.keyboard.type('feedback'); await wait(100); await G.p.keyboard.press('Enter'); await wait(400);
log('palette feedback:', await G.p.evaluate(() => window.__opened.join(' / ')));
await G.p.evaluate(() => { S.ui.shopCat = 'avatar'; showTab('shop'); }); await wait(400);
log('Profile pictures:', await G.p.evaluate(() => $$('#shopView .item').length + ' items · free/owned: ' + $$('#shopView .item').filter(i => /Equip|Equipped/.test(i.querySelector('.act').textContent)).map(i => i.querySelector('.nm').textContent).join(', ') + ' · locked: ' + $$('#shopView .item.locked').length + ' · lv ' + game().lv.level));
await G.p.screenshot({ path: 'v11-shop.png', fullPage: true });
const bal = await G.p.evaluate(() => game().balance);
await G.p.click('[data-buy="av_fox"]'); await wait(300);
log('bought fox:', await G.p.evaluate(() => equippedId('avatar')), '| coins -', bal - await G.p.evaluate(() => game().balance), '| coin drop:', await G.p.evaluate(() => $$('.coin-fly').length > 0), '| check:', await G.p.evaluate(() => !!$('#shopView .item[data-id=av_fox] .ok-check')));
log('header chip avatar inside frame:', await G.p.evaluate(() => !!$('#lvChip svg g[clip-path] circle') && !!$('#lvChip .aura')));
await G.p.click('[data-equip="av_tomato"]'); await wait(200);
log('equip free tomato:', await G.p.evaluate(() => equippedId('avatar')));
await G.p.evaluate(() => { S.game.equipped.frame = 'frame_double'; S.game.purchases.fr = { item: 'frame_double', price: 0, at: 1 }; G = null; save(); applyCosmetics(); showTab('profile'); }); await wait(300);
await G.p.screenshot({ path: 'v11-profile.png', clip: { x: 0, y: 0, width: 1180, height: 420 } });
log('profile head:', await G.p.evaluate(() => !!$('#profileHead .prof-acct svg g[clip-path]')));
await G.p.evaluate(() => { S.settings.gamification = false; save(); renderAll(); });
log('progression off → header avatar:', await G.p.evaluate(() => !$('#avatarBtn').classList.contains('hidden') && !!$('#avatarBtn svg.av')));
await G.p.evaluate(() => { S.settings.gamification = true; save(); renderAll(); });
log('Default shows badge again:', await G.p.evaluate(() => { S.game.equipped.avatar = 'av_default'; applyCosmetics(); return !$('#lvChip svg g[clip-path]'); }));
log('animated avatars only with Full animations:', await G.p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', `<div id="tst">${avatarSVG('av_robot', 40)}</div>`); const a = getComputedStyle($('#tst .av-blink')).animationName; localStorage.setItem(MOTION_KEY, 'off'); applyMotion(); const b2 = getComputedStyle($('#tst .av-blink')).animationName; localStorage.removeItem(MOTION_KEY); applyMotion(); $('#tst').remove(); return a + ' / off: ' + b2; }));
await G.ctx.close();

// ================= cloud: friends see each other's pictures =================
const sfx = Date.now().toString(36).slice(-4);
async function signup(d, user) {
  await d.p.goto(U + '?emulator=1'); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.click('[data-mode=signup] >> visible=true'); await d.p.fill('#authUser', user); await d.p.fill('#authPass', 'secret1'); await d.p.fill('#authPass2', 'secret1'); await d.p.click('#authSubmit');
  await d.p.waitForFunction(() => typeof SOC !== 'undefined' && SOC.started && firstLoadDone, null, { timeout: 20000 }); await wait(1200); await close(d);
}
const A = await device('A'), B = await device('B'), C = await device('C');
await signup(A, 'av_a' + sfx); await signup(B, 'av_b' + sfx); await signup(C, 'av_c' + sfx);
// A wears the fox, C is like an older app version (no avatar field at all)
await A.p.evaluate(() => { S.game.equipped.avatar = 'av_tomato'; save(); applyCosmetics(); publishPublic(); });
await C.p.evaluate(() => { SOC.avatarRejected = true; delete lastPub.publicProfiles; delete lastPub.publicStats; publishPublic(); });
await wait(1500);
await A.p.evaluate(n => sendRequest(n), 'av_b' + sfx); await C.p.evaluate(n => sendRequest(n), 'av_b' + sfx); await wait(1500);
log('B inbox request shows sender avatar:', await B.p.evaluate(async () => { await loadFriendsPublic(true); for (const f of incoming()) await getPublic('publicProfiles', f.from, 0); ibRefresh(); renderInbox(); return $$('#ibBody .ib-item').filter(x => /friend request/.test(x.textContent)).map(x => (x.querySelector('.ib-ic svg.av') ? 'avatar' : 'emoji') + ':' + x.querySelector('.ib-t').textContent.split(' ')[0]).join(', '); }));
await B.p.evaluate(async () => { for (const f of incoming()) await acceptRequest(f.id); }); await wait(2000);
log('public docs:', await A.p.evaluate(async () => { const p = (await FB.getDoc(FB.doc(FB.db, 'publicProfiles', USER.uid))).data(), s = (await FB.getDoc(FB.doc(FB.db, 'publicStats', USER.uid))).data(); return `profile.avatar=${p.avatar} stats.avatar=${s.avatar}`; }), '| C (older version):', await C.p.evaluate(async () => { const p = (await FB.getDoc(FB.doc(FB.db, 'publicProfiles', USER.uid))).data(); return 'avatar' in p ? p.avatar : 'no field'; }));
await B.p.evaluate(async () => { await loadFriendsPublic(true); S.ui.friendsView = 'friends'; showTab('friends'); }); await wait(1500);
log('B friends list:', await B.p.evaluate(() => $$('#friendsBody .person').map(li => li.querySelector('.nm').textContent.trim().split(' ')[0] + '=' + (li.querySelector('svg g[clip-path]') ? 'avatar' : li.querySelector('.avatar') ? 'initial' : 'badge')).join(', ')));
await B.p.screenshot({ path: 'v11-friends.png' });
const ua = await A.p.evaluate(() => USER.uid);
await B.p.evaluate(u => openFriend(u), ua); await wait(1500);
log('B opens A profile:', await B.p.evaluate(() => !!$('#friendsBody svg g[clip-path]')));
await B.p.evaluate(() => { S.ui.lbScope = 'friends'; S.ui.lbPeriod = 'week'; SOC.lb = {}; showTab('board'); }); await wait(2000);
log('B leaderboard rows:', await B.p.evaluate(() => $$('#boardBody .lb li[data-uid]').map(li => li.querySelector('.nm').textContent.trim().split(' ')[0] + '=' + (li.querySelector('svg g[clip-path]') ? 'avatar' : 'badge')).join(', ')));
// kudos from A → B's inbox shows A's avatar
await A.p.evaluate(async u => { await loadFriendsPublic(true); }, null);
await A.p.evaluate(async () => { const f = friendsList()[0]; await sendReaction(otherUid(f), 'kudos', '🔥', 'st_' + dayKey(new Date())); }); await wait(2500);
log('B inbox kudos sender:', await B.p.evaluate(() => { renderInbox(); const it = $$('#ibBody .ib-item').find(x => /sent 🔥/.test(x.textContent)); return it ? (it.querySelector('.ib-ic svg.av') ? 'avatar' : 'emoji') : 'missing'; }));
// squad + challenge members
await B.p.evaluate(() => { S.squad = friendsList().map(f => ({ uid: otherUid(f), name: otherName(f) })); S.settings.bossMode = 'squad'; save(); showTab('quests'); }); await wait(500);
await B.p.evaluate(() => loadSquadStats(true)); await wait(1500);
log('B squad members:', await B.p.evaluate(() => $$('.squad-list li').map(li => li.textContent.trim().split(/\s/)[0] + '=' + (li.querySelector('svg.av') ? 'avatar' : 'initial')).join(', ')));
await B.p.screenshot({ path: 'v11-squad.png' });
await B.p.evaluate(() => startChallenge('h5')); await wait(1200);
await A.p.evaluate(async () => { SOC.challengesAt = 0; await loadChallenges(true); const c = SOC.challenges[0]; if (c) await joinChallenge(c.id); }); await wait(1500);
await B.p.evaluate(async () => { SOC.challengesAt = 0; await loadChallenges(true); S.ui.friendsView = 'challenges'; showTab('friends'); }); await wait(1200);
log('B challenge members:', await B.p.evaluate(() => $$('.chal .cp .nm').map(n => n.textContent.trim() + '=' + (n.querySelector('svg.av') ? 'avatar' : 'initial')).join(', ')));
// rules: avatar must be a short string
log('rules: 31-char avatar →', await A.p.evaluate(async () => { try { await FB.setDoc(FB.doc(FB.db, 'publicProfiles', USER.uid), { ...JSON.parse(lastPub.publicProfiles), avatar: 'x'.repeat(31), updatedAt: FB.serverTimestamp() }); return 'ALLOWED'; } catch (e) { return e.code; } }), '| number →', await A.p.evaluate(async () => { try { await FB.setDoc(FB.doc(FB.db, 'publicProfiles', USER.uid), { ...JSON.parse(lastPub.publicProfiles), avatar: 5, updatedAt: FB.serverTimestamp() }); return 'ALLOWED'; } catch (e) { return e.code; } }));
log('errors', errs, '| denied', denied.filter(d => !/rules: /.test(d)));
await b.close();
