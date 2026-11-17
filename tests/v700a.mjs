// v2.0 phase 7 — invites and link previews (emulator: an inviter, two invited accounts, a second device; the demo; a phone).
// The link is ?ref=<username> (the older ?invite= still works); the landing greets by the name in the link without
// reading anything; a sign-up through a link writes referrals/{uid} and sends an ordinary friend request; three
// check-ins make it active and both sides get a gift once. The 18 hours between check-ins are moved with the
// emulator's owner token (the app cannot move time); everything else is done by the app itself.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, owner, ownerGet } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const R = Date.now().toString(36).slice(-5), nA = 'hosta_' + R, nB = 'gstb_' + R, nC = 'gstc_' + R;
const ago = h => new Date(Date.now() - h * 3600e3);
const ready = async d => { await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 20000 }); await wait(2500); for (let i = 0; i < 2; i++) { await d.ev(() => { if ($('#tutDlg') && $('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]:not(#rewardDlg)').forEach(x => x.close()); }); await wait(300); } };
const land = async (d, query) => { await d.p.goto('http://localhost:8000/index.html?emulator=1' + query); await d.p.waitForSelector('#authView:not(.hidden)'); await d.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); }); await wait(300); };
const hello = d => d.ev(() => { const vis = el => !!el && el.getClientRects().length > 0; return { text: vis($('#refHello')) ? $('#refHelloText').textContent : '', add: vis($('#refAddWrap')) ? $('#refAddText').textContent : '', hint: vis($('#refAddHint')) ? $('#refAddHint').textContent : '', checked: $('#refAdd').checked, search: location.search, stored: sessionStorage.getItem('pomodorolist-invite') }; });
const join = async (d, name, query, { friend = true } = {}) => {
  await land(d, query);
  await d.p.click('[data-mode=signup] >> visible=true'); await d.p.fill('#authUser', name); await d.p.fill('#authPass', 'secret12'); await d.p.fill('#authPass2', 'secret12');
  if (!friend) await d.p.click('#refAddWrap');
  await d.p.click('#authSubmit'); await ready(d);
};
// a check-in becomes due: 19 hours ago on the server and on this device, and `min` published focus minutes
const due = async (d, uid, min) => {
  await d.ev(() => { window.__pub = window.__pub || publishPublic; window.publishPublic = () => {}; });   // the test sets the published minutes itself
  await owner('referrals/' + uid, { checkAt: ago(19) }); await owner('publicStats/' + uid, { lifeMin: min });
  return d.ev(m => { S.invite.ref.checkAt = Date.now() - 19 * 3600e3; SOC.myStats = { ...(SOC.myStats || {}), lifeMin: m }; INV.retryAt = 0; return inviteCheckIn(); }, min);
};

// ---------- 1. the landing ----------
const L = await device('landing');
await land(L, '&ref=' + nA.toUpperCase());
const l1 = await hello(L);
await L.p.click('[data-mode=signup] >> visible=true'); await wait(200); const l2 = await hello(L);
await L.p.click('[data-mode=login] >> visible=true'); await wait(200); const l3 = await hello(L);
const net0 = await L.ev(() => performance.getEntriesByType('resource').filter(r => /:8080/.test(r.name)).length);
await land(L, '&invite=' + nA + '&session=ABC234'); const l4 = await hello(L);
await L.ev(() => sessionStorage.clear()); await land(L, '&ref=a<b>c'); const l5 = await hello(L);
await L.ev(() => sessionStorage.clear()); await land(L, '&ref=' + 'x'.repeat(21)); const l6 = await hello(L);
const head = await L.ev(async () => {
  const m = n => (document.querySelector(`meta[property="${n}"], meta[name="${n}"]`) || {}).content || '', out = { title: document.title, desc: m('description'), ogt: m('og:title'), ogd: m('og:description'), img: m('og:image'), w: m('og:image:width'), h: m('og:image:height'), alt: m('og:image:alt'), card: m('twitter:card'), timg: m('twitter:image'), url: m('og:url') };
  out.canon = (document.querySelector('link[rel="canonical"]') || {}).href; out.touch = (document.querySelector('link[rel="apple-touch-icon"]') || {}).getAttribute('href');
  out.icons = document.querySelectorAll('link[rel="icon"]').length; out.live = !!document.querySelector('link#favicon[rel="icon"]'); out.manifest = !!document.querySelector('link[rel="manifest"]');
  out.sw = 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0; out.h1 = document.querySelector('.lp-h1').textContent;
  const sizes = {}; for (const f of ['assets/og-image.png', 'assets/apple-touch-icon.png', 'assets/favicon-48.png', 'assets/favicon-32.png', 'assets/favicon.svg']) { const r = await fetch(f); sizes[f] = r.ok ? (await r.blob()).size : 0; }
  out.sizes = sizes;
  return out;
});
const raw = fs.readFileSync(new URL('./site/index.html', import.meta.url), 'utf8').slice(0, 6000);
check('A link with ?ref=<name> greets by that name on the sign-in page (“@name invited you to study together”) without a Firestore read, offers “Add @name as a friend” (ticked, with what that means and that the inviter will see you joined) only when signing up, and leaves the address bar clean; the older ?invite= works and other parts of a link stay; a name that is not a username shows nothing',
  l1.text === `@${nA} invited you to study together` && l1.search === '?emulator=1' && l1.stored === nA && l2.add === `Add @${nA} as a friend` && l2.checked && new RegExp(`@${nA} will see that you joined`).test(l2.hint) && /remove a friend at any time/.test(l2.hint) && l3.add === '' && l3.hint === '' && l3.text === l1.text && net0 === 0
  && l4.text === l1.text && /session=ABC234/.test(l4.search) && !/invite=/.test(l4.search) && l5.text === '' && l6.text === '', JSON.stringify({ l1, l2, l3, net0, l4, l5, l6 }));
check('The page as served has a descriptive title, a description, Open Graph and Twitter tags with an absolute 1200×630 image and its alt text, a canonical address, an apple-touch-icon and two static icons; when it runs, only the live tab icon is left; the picture and icon files are there; there is no web app manifest and no service worker',
  /study timer/.test(head.title) && head.desc.length > 80 && /Pomodorolist/.test(head.ogt) && head.ogd.length > 40 && /^https:\/\/.+\/assets\/og-image\.png$/.test(head.img) && head.w === '1200' && head.h === '630' && head.alt.length > 20 && head.card === 'summary_large_image' && head.timg === head.img && /^https:\/\//.test(head.url) && /^https:\/\//.test(head.canon || '')
  && head.touch === 'assets/apple-touch-icon.png' && (raw.match(/data-static-icon/g) || []).length === 2 && head.icons === 1 && head.live && !head.manifest && head.sw === 0 && !/rel="manifest"/.test(raw) && Object.values(head.sizes).every(n => n > 200) && head.sizes['assets/og-image.png'] > 20000, JSON.stringify(head));
await L.ctx.close();

// ---------- 2. signing up through a link ----------
const A = await device('A', 1280);
await signup(A, nA);
const ua = await A.ev(() => USER.uid);
const B = await device('B', 1280);
await join(B, nB, '&ref=' + nA);
const ub = await B.ev(() => USER.uid);
const C = await device('C', 1280);
await join(C, nC, '&ref=' + nA, { friend: false });
const uc = await C.ev(() => USER.uid);
await wait(1500);
const refB = await ownerGet('referrals/' + ub), refC = await ownerGet('referrals/' + uc);
const fr = async (x, y) => ownerGet('friendships/' + [x, y].sort().join('_'));
const frB = await fr(ua, ub), frC = await fr(ua, uc);
const localB = await B.ev(() => ({ ref: S.invite.ref, prompt: !!document.querySelector('dialog[open]'), stored: sessionStorage.getItem('pomodorolist-invite'), title: document.title, next: inviteNext() }));
// an existing account that follows a link is not an invitee: it gets the old question instead
const A2 = await device('A2', 1280);
await land(A2, '&ref=' + nB);
await A2.p.click('[data-mode=login] >> visible=true'); await A2.p.fill('#authUser', nA); await A2.p.fill('#authPass', 'secret12'); await A2.p.click('#authSubmit');
await A2.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 20000 });
await until(A2, () => [...document.querySelectorAll('dialog[open]')].some(d => /Send a friend request/.test(d.textContent)), null, 9000);
const oldAcc = { ref: await ownerGet('referrals/' + ua), asked: await A2.ev(() => [...document.querySelectorAll('dialog[open]')].map(d => d.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)).join('|')), local: await A2.ev(() => S.invite.ref) };
await A2.ctx.close();
check('A new account that signed up through the link has a referral (the inviter by uid and name, nothing checked in, a copy in its profile) and has sent an ordinary friend request, with no extra question; with the box unticked there is a referral and no request',
  refB && refB.inviter === ua && refB.inviterName === nA && refB.name === nB && refB.checks === 0 && refB.min === 0 && refB.state === 'joined' && frB && frB.status === 'pending' && frB.from === ub
  && localB.ref && localB.ref.by === ua && localB.ref.state === 'joined' && !localB.prompt && !localB.stored && localB.title === 'Pomodorolist' && localB.next.day === 0 && refC && refC.inviter === ua && frC === null, JSON.stringify({ refB, frB: frB && frB.status, localB, refC: refC && refC.state, frC }));
check('An existing account that logs in through a link gets no referral: it is asked whether to send a friend request, as before', oldAcc.ref === null && oldAcc.local === null && /Send a friend request/.test(oldAcc.asked), JSON.stringify(oldAcc));

// ---------- 3. three check-ins, then both sides get their gift ----------
const tooSoon = await B.ev(() => inviteCheckIn());
const c1 = await due(B, ub, 30);
const noMore = await B.ev(() => { S.invite.ref.checkAt = Date.now() - 19 * 3600e3; return [inviteCheckIn.length, inviteNext().needMin]; });
const noFocus = await B.ev(() => inviteCheckIn());   // 18 hours on this device, but no more focus than last time
const c2 = await due(B, ub, 70);
const coins0 = await B.ev(() => game().balance);
const short = await due(B, ub, 120);                 // the third needs 180 minutes in all
const c3 = await due(B, ub, 200);
await wait(800);
const gift = await B.ev(c0 => ({ state: S.invite.ref.state, claim: !!S.game.claims.invite.in, title: !!S.game.grants.ti_i_newleaf, owned: game().owned.has('ti_i_newleaf'), coins: game().balance - c0, reveal: $('#rewardDlg').open && $('#rewardDlg').textContent.replace(/\s+/g, ' ').slice(0, 160), inbox: (typeof IB !== 'undefined' ? IB : []).some(x => /Welcome gift/.test(x.title)) }), coins0);
await B.ev(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
const srv = { ref: await ownerGet('referrals/' + ub), stats: await ownerGet('inviteStats/' + ua) };
const again = await B.ev(() => inviteCheckIn());
check('Nothing is written before a check-in is due (18 hours and 20 more published minutes); three of them, with 180 minutes at the third, make the referral active and count once for the inviter',
  tooSoon === false && c1 === true && noMore[1] > 0 && noFocus === false && c2 === true && short === false && c3 === true && srv.ref.state === 'active' && srv.ref.checks === 3 && srv.ref.min === 200 && srv.stats && srv.stats.n === 1 && again === false, JSON.stringify({ tooSoon, c1, noMore, noFocus, c2, short, c3, srv, again }));
check('The invited friend gets the welcome gift once: 150 coins, the title “New Leaf” in the bag, a reveal and a line in the inbox',
  gift.state === 'active' && gift.claim && gift.title && gift.owned && gift.coins === 150 && /Welcome gift/.test(gift.reveal || '') && /New Leaf/.test(gift.reveal || '') && gift.inbox, JSON.stringify(gift));

// the inviter
await A.ev(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
const a0 = await A.ev(() => ({ coins: game().balance, n: S.invite.n, synced: null }));
const quietSync = await A.ev(() => inviteSync());    // never shared the link: no read
await A.ev(() => { S.ui.friendsView = 'invite'; showTab('friends'); }); await wait(2500);
const a1 = await A.ev(c0 => {
  const txt = $('#friendsBody').textContent.replace(/\s+/g, ' '), vis = el => !!el && el.getClientRects().length > 0;
  return { n: S.invite.n, claim: !!S.game.claims.invite.m1, title: game().owned.has('ti_i_buddy'), coins: game().balance - c0, reveal: $('#rewardDlg').open && $('#rewardDlg').textContent.replace(/\s+/g, ' ').slice(0, 140),
    link: $('#invLink').value, seg: [...$$('#friendsSeg button')].map(x => x.textContent.trim().replace(/\d+$/, '')).join(), head: (/(\d+) joined · (\d+) stayed/.exec(txt) || []).slice(1).join('/'), next: /Next gift when 3 friends have stayed/.test(txt) && /2 to go/.test(txt), promise: /you both get a gift: 150 coins and a title for them, 50 coins for you, and more at 1, 3, 5, 10 and 25 friends/.test(txt), msg: /We never message anyone for you/.test(txt), kinds: /title “Study Buddy”/.test(txt) && /badge frame “Linked”/.test(txt) && /aura “Together”/.test(txt),
    people: [...document.querySelectorAll('.inv-people li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()), miles: [...document.querySelectorAll('.inv-miles li')].map(li => (li.classList.contains('got') ? '✓' : '·') + li.querySelector('.inv-n').textContent).join(' '),
    wa: (document.querySelector('[data-inv="wa"]') || {}).href || '', copy: vis(document.querySelector('[data-inv="copy"]')), discord: vis(document.querySelector('[data-inv="discord"]')) };
}, a0.coins);
await A.ev(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
await A.ev(() => showTab('profile')); await wait(400);
const prof = await A.ev(() => ({ card: ($('.inv-pcard') || {}).textContent || '', shared: S.invite.shared }));
await A.p.click('[data-goinvite]'); await wait(400);
const went = await A.ev(() => S.ui.tab === 'friends' && S.ui.friendsView === 'invite' && !!$('#invLink'));
check('The inviter reads their count only once they open the invite page (or have shared the link): 1 friend stayed → 50 coins for that friend and 100 more with the title “Study Buddy” for the first, once, with a reveal that does not ask for more',
  a0.n === 0 && quietSync === false && a1.n === 1 && a1.claim && a1.title && a1.coins === 150 && /A thank-you/.test(a1.reveal || '') && /1 friend joined and stayed/.test(a1.reveal || '') && /Study Buddy/.test(a1.reveal || '') && !/Next/.test(a1.reveal || ''), JSON.stringify({ a0, quietSync, a1: { n: a1.n, claim: a1.claim, title: a1.title, coins: a1.coins, reveal: a1.reveal } }));
check('Friends › Invite says exactly what both sides get, shows the link (?ref=<me>), Copy, WhatsApp and “Copy for Discord” with the message that goes out, “2 joined · 1 stayed”, the next gift, both friends (only “Joined” or “Stayed”), and the five gifts by kind with the first marked; the profile says “Brought 1 friend” and leads back here',
  a1.link.endsWith('?ref=' + nA) && /Invite$/.test(a1.seg) && a1.head === '2/1' && a1.next && a1.promise && a1.msg && a1.kinds && a1.people.length === 2 && a1.people.some(x => x.includes('@' + nB) && /Stayed/.test(x)) && a1.people.some(x => x.includes('@' + nC) && /Joined$/.test(x))
  && a1.miles === '✓1 ·3 ·5 ·10 ·25' && /^https:\/\/wa\.me\/\?text=/.test(a1.wa) && decodeURIComponent(a1.wa).includes('?ref=' + nA) && a1.copy && a1.discord && /Brought 1 friend/.test(prof.card) && went, JSON.stringify({ a1, prof, went }));

// ---------- 4. a second device, a friend's profile, other share links ----------
await until(B, () => !localEditPending, null, 8000); await wait(1200);
const B2 = await device('B2', 1280);
await B2.p.goto('http://localhost:8000/index.html?emulator=1'); await B2.p.waitForSelector('#authView:not(.hidden)');
await B2.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B2.p.click('[data-mode=login] >> visible=true'); await B2.p.fill('#authUser', nB); await B2.p.fill('#authPass', 'secret12'); await B2.p.click('#authSubmit'); await ready(B2);
const second = await B2.ev(() => ({ state: S.invite.ref && S.invite.ref.state, claim: !!S.game.claims.invite.in, title: game().owned.has('ti_i_newleaf'), reveal: $('#rewardDlg').open, checkIn: null }));
second.checkIn = await B2.ev(() => inviteCheckIn());
// A accepts B's request; B opens A's profile
await A.ev(async () => { const f = SOC.friendships.find(x => x.status === 'pending' && x.to === USER.uid); if (f) await acceptRequest(f.id); }); await wait(1500);
await B2.ev(u => { S.ui.friendsView = 'friends'; showTab('friends'); return openFriend(u); }, ua); await wait(1200);
const seen = await B2.ev(() => ({ line: (document.querySelector('.fp-head .lbl') || {}).textContent || '', own: (() => { S.ui.friendsView = 'invite'; SOC.friend = null; renderFriends(); return ($('.inv-own') || {}).textContent || ''; })() }));
const links = await A.ev(() => ({ clan: clanLink('ABC234'), sess: sessLink('XYZ789'), again: withRef(withRef('https://x.test/?a=1')) }));
check('On a second device the invited account is already active and has its gift (no second reveal, nothing more to check in); a friend’s profile says “brought 1 friend”; the invited friend’s own page says who they came with; clan and session links carry ?ref once',
  second.state === 'active' && second.claim && second.title && !second.reveal && second.checkIn === false && /brought 1 friend/.test(seen.line) && new RegExp('You came with @' + nA).test(seen.own) && /You stayed/.test(seen.own)
  && links.clan.endsWith('?clan=ABC234&ref=' + nA) && links.sess.endsWith('?session=XYZ789&ref=' + nA) && links.again === 'https://x.test/?a=1&ref=' + nA, JSON.stringify({ second, seen, links }));
await B2.ctx.close(); await B.ctx.close(); await C.ctx.close(); await A.ctx.close();

// ---------- 5. the demo and a phone ----------
async function page(w, h, tag) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); } catch (e) {} });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(), net = [];
  p.on('pageerror', e => errs.push(tag + ': ' + e.message));
  p.on('request', r => { if (/:8080|:9099/.test(r.url()) && r.method() !== 'GET') net.push(r.method() + ' ' + r.url().slice(0, 80)); });
  await p.goto('http://localhost:8000/index.html?emulator=1'); await p.waitForSelector('#authView:not(.hidden)'); await wait(700);
  await p.click('#previewBtn'); await p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 15000 }); await wait(2500);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]:not(#pvDlg)').forEach(x => x.close()); closePop(); });
  return { ctx, p, net, ev: (f, a) => p.evaluate(f, a) };
}
const storage = d => d.ev(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))));
const DM = await page(1280, 900, 'demo');
const s0 = await storage(DM), n0 = DM.net.length;
const demo = await DM.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = {}, g0 = JSON.stringify(S.game) + JSON.stringify(S.invite);
  S.ui.friendsView = 'invite'; showTab('friends'); await sl(600);
  const txt = $('#friendsBody').textContent.replace(/\s+/g, ' ');
  out.head = (/(\d+) joined · (\d+) stayed/.exec(txt) || []).slice(1).join('/'); out.people = document.querySelectorAll('.inv-people li').length; out.miles = document.querySelectorAll('.inv-miles li').length; out.link = /\?ref=demo_scholar$/.test($('#invLink').value);
  document.querySelector('[data-inv="discord"]').click(); await sl(300); out.sync = await inviteSync(true); out.check = await inviteCheckIn();
  showTab('profile'); await sl(300); out.card = ($('.inv-pcard') || {}).textContent || '';
  S.ui.friendsView = 'friends'; showTab('friends'); await openFriend('demo_f4'); await sl(400); out.friend = (document.querySelector('.fp-head .lbl') || {}).textContent || '';
  out.same = g0 === JSON.stringify(S.game) + JSON.stringify(S.invite);
  return out;
});
await wait(1200);
const s1 = await storage(DM);
check('The demo has an invite page with sample friends (2 stayed, 3 joined), “Brought 2 friends” on the profile and “brought 3 friends” on a friend’s; copying a message changes nothing, and nothing is written',
  demo.head === '3/2' && demo.people === 3 && demo.miles === 5 && demo.link && demo.sync === false && demo.check === false && /Brought 2 friends/.test(demo.card) && /brought 3 friends/.test(demo.friend) && demo.same && s0 === s1 && DM.net.length === n0, JSON.stringify({ demo, net: DM.net.slice(n0), storageSame: s0 === s1 }));
await DM.ctx.close();

const PH = await page(390, 844, 'phone');
const phone = await PH.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), r = el => el.getBoundingClientRect();
  S.ui.friendsView = 'invite'; showTab('friends'); await sl(600);
  const small = [...$('#friendsBody').querySelectorAll('button, a.btn, input')].filter(el => el.getClientRects().length && (r(el).height < 43.5 || r(el).width < 43.5)).map(el => (el.dataset.inv || el.id || el.className) + ' ' + Math.round(r(el).width) + 'x' + Math.round(r(el).height));
  return { small, over: document.documentElement.scrollWidth > innerWidth, inside: [...$('#friendsBody').querySelectorAll('.card, .inv-link > *, .inv-share > *')].every(el => r(el).left >= 0 && r(el).right <= innerWidth + 0.5), seg: [...$$('#friendsSeg button')].every(el => r(el).height >= 43.5) };
});
check('On a phone (390 px) the invite page fits with nothing cut off, and the link field, every button and the tabs are at least 44 px', phone.small.length === 0 && !phone.over && phone.inside && phone.seg, JSON.stringify(phone));
await PH.ctx.close();

check('No page errors', errs.length === 0, errs.join(' | '));
log(`\n${failCount() ? '✗ ' + failCount() + ' FAILED' : '✓ all passed'}`);
await b.close();
process.exit(failCount() ? 1 : 0);
