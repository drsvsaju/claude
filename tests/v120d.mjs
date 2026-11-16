// v1.20 phase 4: Posts — automatic posts, no text. Real accounts against the emulator with these rules.
//  A, B and D are friends; C is a stranger. A posts what it reaches; B sees it in the Posts section (avatar, name, time);
//  C can't read it. No duplicates: a reload, a second device, offline then online, a direct second write. No history:
//  nothing from before postsFrom. At most 3 at once and 10 a day; a burst of achievements is one card. Reactions: one per
//  person, change and remove, strangers and the author refused. Privacy: posting off, a type off; a study-session post
//  names a mate only for people who know them and only if that mate posted it too ("with you" for the mate). Blocking
//  and unfriending take people out of the audience. Posts older than 30 days aren't shown and get cleaned up.
//  Attack suite on the rules. The demo: a sample feed with reactions, nothing written.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, until, tryOp, owner, ownerGet, SITE, U } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const names = { A: 'pa_' + R, B: 'pb_' + R, C: 'pc_' + R, D: 'pd_' + R };
const A = await device('A', 1280, {}, { overtime: true }), B = await device('B', 1280, {}, { overtime: true }), C = await device('C', 1280, {}, { overtime: true }), D = await device('D', 1280, {}, { overtime: true });
await Promise.all([signup(A, names.A), signup(B, names.B), signup(C, names.C), signup(D, names.D)]);
for (const d of [A, B, C, D]) await closeDlg(d);
await A.ev(n => sendRequest(n), names.B); await A.ev(n => sendRequest(n), names.D); await wait(1500);
for (const d of [B, D]) { await until(d, () => incoming().length >= 1, null, 15000); await d.ev(() => incoming().forEach(r => acceptRequest(r.id))); }
await wait(2500);
for (const d of [A, B, D]) await d.ev(async () => { await loadFriendsPublic(true).catch(() => {}); });
const uid = {}; for (const k of ['A', 'B', 'C', 'D']) uid[k] = await ({ A, B, C, D })[k].ev(() => USER.uid);
check('Friends: A–B and A–D; C is a stranger', (await A.ev(() => friendsList().length)) === 2);
const pf = await A.ev(() => +S.settings.postsFrom || 0);
check('postsFrom is set at sign-in (nothing from before it is ever posted)', pf > 0 && Date.now() - pf < 5 * 60000, String(pf));
const postsOf = async (au, ref) => { const n = []; for (const t of ['ach', 'streak', 'session', 'hours', 'level', 'boss', 'rank', 'evo']) { const r = await ownerGet(`posts/${t}_${au}_${ref}`); if (r) n.push(t); } return n; };
// 1. a block unlocks an achievement → one post
await A.ev(() => { const st = Date.now() - 30 * 6e4; const s = { id: 'b1', name: 'Maths', start: st, end: st + 25 * 6e4, duration: 25 * 6e4, planned: 25 * 6e4 }; S.timer.phase = 'focus'; S.timer.status = 'running'; S.timer.planned = 25 * 6e4; S.timer.focusStartedAt = st; S.timer.endAt = Date.now() - 1000; S.settings.overtime = false; });
await wait(2500);
const achs = await A.ev(() => Object.entries(S.game.claims.achievements).filter(([, t]) => Date.now() - t < 60000).map(([k]) => k));
const p1 = achs.length ? await ownerGet(`posts/ach_${uid.A}_${achs[0]}`) : null;
check(`Finishing a block that unlocks an achievement (${achs.join(', ') || 'none'}) writes one post: id ach_<uid>_<achievement>, typed fields, the audience is A and A's friends`, !!p1 && p1.author === uid.A && p1.type === 'ach' && p1.aud.length === 3 && p1.aud.includes(uid.A) && p1.aud.includes(uid.B) && p1.aud.includes(uid.D) && !p1.aud.includes(uid.C), JSON.stringify({ achs, p1 }));
// 2. B sees it; C can't
const bFeed = await B.ev(async () => { showTab('posts'); await loadPosts(true); renderPosts(true); await new Promise(r => setTimeout(r, 400)); const li = $('#postsBody .post'); return { n: (POST.list || []).length, card: li ? li.textContent.replace(/\s+/g, ' ') : '', pic: !!(li && li.querySelector('svg, img')), seg: $$('#friendsSeg [data-view]').map(x => x.dataset.view).join(), nav: [...$$('#tabs .nv-grp')[2].querySelectorAll('[data-tab]')].map(x => x.dataset.tab).join() }; });
check('B (a friend) sees it in the Posts section: A’s picture and name, "unlocked …", how long ago; the sidebar reads Friends · Posts · Study sessions · Clan · Leaderboard and Friends stays Friends · Challenges', bFeed.n >= 1 && new RegExp(names.A).test(bFeed.card) && /unlocked/.test(bFeed.card) && bFeed.pic && bFeed.seg === 'friends,challenges' && bFeed.nav === 'friends,posts,sessions,clan,board', JSON.stringify(bFeed));
// 2b. the Posts section: the dot (new posts since the last visit), the O shortcut, the phone More menu, the palette, the
//     tour, the shortcut sheet, the filters, the settings shortcut, True Minimalist
const nv1 = await B.ev(async () => {
  showTab('timer'); S.ui.postsSeen = 0; POST.newest = 0; updatePostsBadge(); await postsPeek();
  return { dot: !$('#postsBadge').classList.contains('hidden'), label: $('#postsBadge').getAttribute('aria-label') };
});
await B.p.mouse.click(5, 300); await B.p.keyboard.press('o'); await wait(500);
const nv2 = await B.ev(async () => {
  const out = { keyO: S.ui.tab === 'posts', cleared: $('#postsBadge').classList.contains('hidden') };
  showTab('timer'); await postsPeek(); out.stillClear = $('#postsBadge').classList.contains('hidden');   // nothing newer than the visit
  out.palette = cmdList('').some(c => c.t === 'Posts'); out.tour = tourSteps().some(st => st.tab === 'posts');
  out.keys = [...$$('#keysDlg kbd')].some(k => k.textContent === 'O' && /Posts/.test(k.nextElementSibling ? k.nextElementSibling.textContent : ''));
  out.title = $('#postsTabBtn').title;
  return out;
});
check('Posts dot: shows when a friend posted since the last visit ("New posts from friends"); O opens Posts and clears it; it stays clear until something newer comes', nv1.dot && /New posts/.test(nv1.label) && nv2.keyO && nv2.cleared && nv2.stillClear, JSON.stringify({ nv1, nv2 }));
check('Posts is in the command palette, the guided tour and the shortcut sheet (O), and its sidebar button says "Posts (O)"', nv2.palette && nv2.tour && nv2.keys && nv2.title === 'Posts (O)', JSON.stringify(nv2));
// a new post from A while B is elsewhere: the dot comes back; on a phone, More › Posts opens it and clears it
await owner(`posts/hours_${uid.A}_h77`, { author: uid.A, authorName: names.A, type: 'hours', ref: 'h77', n: 77, aud: [uid.A, uid.B, uid.D], day: new Date().toISOString().slice(0, 10), at: new Date() });   // written as A's app would (A's own day counters stay as they are)
await wait(1500);
await B.p.setViewportSize({ width: 390, height: 800 }); await wait(400);
const nv3 = await B.ev(async () => {
  showTab('timer'); await postsPeek(); const dot = !$('#postsBadge').classList.contains('hidden');
  $('#navMore').click(); await new Promise(r => setTimeout(r, 450));
  const item = $('#tabs [data-tab="posts"]'), r = item.getBoundingClientRect(), shown = r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight;
  item.click(); await new Promise(r => setTimeout(r, 500));
  return { dot, shown, tab: S.ui.tab, cleared: $('#postsBadge').classList.contains('hidden'), menuClosed: $('#navMore').getAttribute('aria-expanded') !== 'true' };
});
await B.p.setViewportSize({ width: 1280, height: 900 }); await wait(400);
check('A new post brings the dot back; on a phone, More lists Posts, and tapping it opens the section, clears the dot and closes the menu', nv3.dot && nv3.shown && nv3.tab === 'posts' && nv3.cleared && nv3.menuClosed, JSON.stringify(nv3));
const nv4 = await B.ev(async () => {
  showTab('posts'); await loadPosts(true); const out = { mine: (POST.list || []).filter(x => x.author === USER.uid).length };
  for (const f of ['all', 'friends', 'clan', 'you']) { $(`[data-pfilter="${f}"]`).click(); await new Promise(r => setTimeout(r, 150)); out[f] = { n: $$('#postsBody .post').length, active: ($('#postSeg .active') || {}).dataset?.pfilter, txt: ($('#postsBody .card:not(.posts-hero)') || {}).textContent?.replace(/\s+/g, ' ').slice(0, 80) }; }
  $('[data-pfilter="all"]').click();
  $('[data-psettings]').click(); await new Promise(r => setTimeout(r, 600));
  out.settings = S.ui.tab === 'settings' && $('#postTypesBox').open && document.activeElement === $('#setPosts');
  return out;
});
check('Filters All · Friends · Clan · You: All and Friends show A’s posts; You (nothing from B yet) and Clan (no clan) show their own empty states; the ⚙ button opens Settings at the posting switches', nv4.all.n >= 2 && nv4.friends.n === nv4.all.n && nv4.you.n === nv4.mine && (nv4.mine > 0 || /Nothing from you yet/.test(nv4.you.txt)) && nv4.clan.n === 0 && /No clan yet/.test(nv4.clan.txt) && nv4.friends.active === 'friends' && nv4.settings, JSON.stringify(nv4));
const nv5 = await B.ev(async () => {
  setMinimal(true); await new Promise(r => setTimeout(r, 300));
  const out = { hidden: $('#postsTabBtn').classList.contains('hidden'), palette: !cmdList('').some(c => c.t === 'Posts'), tour: !tourSteps().some(st => st.tab === 'posts'), posting: postsOn() === false };
  showTab('posts'); out.blocked = S.ui.tab !== 'posts';
  S.ui.postsSeen = 0; POST.newest = Date.now(); updatePostsBadge(); out.noDot = $('#postsBadge').classList.contains('hidden');
  setMinimal(false); await new Promise(r => setTimeout(r, 300)); out.back = !$('#postsTabBtn').classList.contains('hidden');
  postsMarkSeen(); return out;
});
check('True Minimalist: Posts is hidden (sidebar, palette, tour, no dot), the section can’t be opened, and nothing is posted; it all comes back when Minimalist is off', nv5.hidden && nv5.palette && nv5.tour && nv5.posting && nv5.blocked && nv5.noDot && nv5.back, JSON.stringify(nv5));
const cRead = await tryOp(C, `async () => FB.getDoc(FB.doc(FB.db, 'posts', 'ach_${uid.A}_${achs[0]}'))`);
const cQuery = await C.ev(async () => { await loadPosts(true); return (POST.list || []).length; });
check('C (a stranger) can’t read it, and C’s feed is empty', /permission|denied/i.test(cRead) && cQuery === 0, JSON.stringify({ cRead, cQuery }));
// 3. no duplicates: a reload, a second device, a direct second write
const id1 = `ach_${uid.A}_${achs[0]}`;
await A.p.reload(); await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2000); await closeDlg(A);
await A.ev(() => { S.settings.overtime = false; reconcileRewards('loud'); });
const again = await tryOp(A, `async () => FB.setDoc(FB.doc(FB.db, 'posts', '${id1}'), { author: USER.uid, authorName: USER.username, type: 'ach', ref: '${achs[0]}', n: 0, aud: [USER.uid], day: dayKey(new Date()), at: FB.serverTimestamp() })`);
const A2 = await device('A2', 1280, {}, { overtime: true });
await A2.p.goto(U); await A2.p.waitForSelector('#authView:not(.hidden)'); await A2.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await A2.p.click('[data-mode=login] >> visible=true'); await A2.p.fill('#authUser', names.A); await A2.p.fill('#authPass', 'secret12'); await A2.p.click('#authSubmit');
await A2.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(A2);
const a2 = await A2.ev(async (a) => { POST.mine = {}; S.ui.postDay = null; return makePost('ach', a, 0); }, achs[0]);
const dupCount = await B.ev(async id => { await loadPosts(true); return (POST.list || []).filter(p => p.id === id).length; }, id1);
check('No duplicates: after a reload, from a second device (makePost → refused) and with a direct second write (refused by the rules) there is still one post', /permission|denied/i.test(again) && a2 === false && dupCount === 1, JSON.stringify({ again, a2, dupCount }));
// offline, then online: the queued post lands once
await A2.ctx.setOffline(true);
const off = await A2.ev(async () => { POST.mine = {}; S.ui.postDay = null; POST.burst = 0; const p = makePost('hours', 'h50', 50); await new Promise(r => setTimeout(r, 300)); return 'queued'; });
await A2.ctx.setOffline(false); await wait(4000);
const onl = await A.ev(async () => { POST.mine = {}; S.ui.postDay = null; POST.burst = 0; return makePost('hours', 'h50', 50); });
await wait(1500);
const h50 = await ownerGet(`posts/hours_${uid.A}_h50`);
check('Offline: the post waits and lands once when back online; the same post from the other device is refused', !!h50 && h50.type === 'hours' && h50.n === 50 && onl === false, JSON.stringify({ off, onl, h50: !!h50 }));
await A2.ctx.close();
// 4. no history: things from before postsFrom never post
const hist = await A.ev(async () => { POST.mine = {}; S.ui.postDay = null; POST.burst = 0; return [await makePost('streak', 'm7', 7, { at: S.settings.postsFrom - 3600e3 }), await makePost('streak', 'm14', 14, { at: Date.now() - 3 * 864e5 })]; });
check('No history: an event from before postsFrom, or more than two days old, writes nothing', hist.every(x => x === false), JSON.stringify(hist));
// 5. caps: 3 at once, 10 a day
const caps = await A.ev(async () => {
  POST.mine = {}; S.ui.postDay = null; POST.burst = 0; POST.burstAt = Date.now();
  const burst = await Promise.all(Array.from({ length: 6 }, (_, i) => makePost('level', 'L' + (100 + i), 100 + i)));
  let day = burst.filter(Boolean).length;
  for (let i = 0; i < 12; i++) { POST.burst = 0; POST.burstAt = Date.now(); if (await makePost('level', 'L' + (200 + i), 200 + i)) day++; }
  return { burst: burst.filter(Boolean).length, day, counter: S.ui.postDay };
});
check('At most 3 posts at once and 10 a day (counting the 2 earlier today): a burst of 6 writes 3, then 5 more fit the day', caps.burst === 3 && caps.counter.n === 10, JSON.stringify(caps));
await A.ev(() => { S.ui.postDay = null; POST.mine = {}; });
// 6. a burst of achievements is one card
await owner(`posts/ach_${uid.A}_g_h1`, { author: uid.A, authorName: names.A, type: 'ach', ref: 'g_h1', n: 0, aud: [uid.A, uid.B, uid.D], day: '2026-11-10', at: new Date(Date.now() - 60000) });
await owner(`posts/ach_${uid.A}_g_h10`, { author: uid.A, authorName: names.A, type: 'ach', ref: 'g_h10', n: 0, aud: [uid.A, uid.B, uid.D], day: '2026-11-10', at: new Date(Date.now() - 120000) });
const grp = await B.ev(async () => { await loadPosts(true); renderPosts(true); const cards = $$('#postsBody .post').map(x => x.textContent.replace(/\s+/g, ' ')); return cards.find(t => /unlocked \d+ achievements/.test(t)) || cards.join(' | ').slice(0, 300); });
check('Achievements unlocked together show as one card: "unlocked 3 achievements: …" (4 between 10 PM and 7 AM, when Night owl or Early bird joins them)', /unlocked [34] achievements/.test(grp), grp);
// 7. reactions
const pid = id1;
const rx = await B.ev(async id => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  await loadPosts(true); renderPosts(true);
  const click = e => $(`[data-post="${id}"] [data-preact="${e}"]`).click();
  click('🔥'); await sl(900); const a = (POST.list.find(p => p.id === id).r || {})[USER.uid];
  click('👏'); await sl(900); const b2 = (POST.list.find(p => p.id === id).r || {})[USER.uid];
  click('👏'); await sl(900); const c2 = (POST.list.find(p => p.id === id).r || {})[USER.uid];
  click('⭐'); await sl(900);
  return { a, b2, c2 };
}, pid);
const doc7 = await ownerGet('posts/' + pid);
check('Reactions: B taps 🔥, changes to 👏, taps 👏 again to remove it, then ⭐ — one entry per person, stored on the post', rx.a === '🔥' && rx.b2 === '👏' && rx.c2 === undefined && doc7.r && doc7.r[uid.B] === '⭐' && Object.keys(doc7.r).length === 1, JSON.stringify({ rx, r: doc7.r }));
const aOwn = await A.ev(async id => { await loadPosts(true); showTab('posts'); renderPosts(true); const b = $(`[data-post="${id}"] [data-preact="⭐"]`); return { disabled: b && b.disabled, count: b && b.textContent }; }, pid);
check('The author sees the count (⭐ 1) and can’t react to their own post', aOwn.disabled && /⭐1/.test(aOwn.count), JSON.stringify(aOwn));
// 8. privacy
const priv = await A.ev(async () => { POST.mine = {}; S.ui.postDay = null; POST.burst = 0;
  S.settings.postOff = { hours: true }; const t1 = await makePost('hours', 'h100', 100); const t2 = await makePost('evo', 'e1', 1);
  S.settings.postOff = {}; S.settings.posts = false; const t3 = await makePost('evo', 'e2', 2); S.settings.posts = true; save(); return [t1, t2, t3]; });
check('Privacy: a type switched off isn’t posted (hours), others still are (Pomeo’s stage); posting off posts nothing', priv[0] === false && priv[1] === true && priv[2] === false, JSON.stringify(priv));
const priv2 = await A.ev(async () => {
  POST.burst = 0; POST.burstAt = 0; S.ui.postDay = null; const keep = S.settings.shareActivity;
  delete S.settings.posts; S.settings.shareActivity = false; const off = await makePost('evo', 'e4', 4); renderPrivacy(); const box = $('#setPosts').checked;
  S.settings.posts = true; POST.burst = 0; const on = await makePost('evo', 'e5', 5); S.settings.shareActivity = keep; save(); return { off, box, on };
});
check('Someone who had switched off "Share activity" isn’t opted in: nothing is posted and the Posts switch shows off, until they turn Posts on themselves', priv2.off === false && priv2.box === false && priv2.on === true, JSON.stringify(priv2));
// 8b. every one of the 12 types, with the references the hooks really pass (a boss key has '|', a pass egg id has ':')
const KINDS = await A.ev(bu => [
  ['ach', Object.keys(ACH_BY_ID)[6], 0, /unlocked <b>/], ['streak', 'm7', 7, /7-day<\/b> streak/], ['rank', seasonKeyNow() + '-5', 5, /ranked up to/],
  ['level', 'L10', 10, /level 10/], ['session', 'live_kinds', 1, /studied together with you/, [bu]], ['boss', bkey('2026-11-09', 'squad'), 2, /defeated <b>.+<\/b> with their squad/],
  ['quest', 'mon26', 7, /finished the <b>🌧️ Monsoon Study<\/b> questline/], ['quest', 'mon26-pass', 30, /completed the <b>Monsoon Study Pass<\/b>/],
  ['harvest', GSPECIES[0].id + '.p_k1', 100, /Giant /], ['pet', 'x.' + PETS[0].id + '.egg_ps_mon26:p:12', 0, /hatched a <b>/], ['clan', 'cl1-L5', 5, /clan reached <b>level 5/],
  ['hours', 'h25', 25, /25 hours/], ['evo', 'e3', 3, /Pomeo grew into <b>/]].map(([t, r, n, re, m]) => [t, r, n, re.source, m || []]), uid.B);
const wrote = await A.ev(async K => { const out = []; for (const [t, r, n, , m] of K) { POST.burst = 0; POST.burstAt = 0; S.ui.postDay = null; out.push([t, await makePost(t, r, n, { mates: m })]); await new Promise(z => setTimeout(z, 250)); } return { out, types: Object.keys(POST_TYPES).length }; }, KINDS);
await wait(1500);
const seen = await B.ev(async ([K, ua]) => { await loadPosts(true); return K.map(([t, r, n, re]) => { const id = `${t}_${ua}_${postRef(r)}`, d = (POST.list || []).find(p => p.id === id), txt = d ? postText(d) : ''; return { t, found: !!d, ok: !!d && new RegExp(re).test(txt) && !/undefined|NaN/.test(txt), txt: txt.replace(/<[^>]+>/g, '').slice(0, 70) }; }); }, [KINDS, uid.A]);
check(`All ${wrote.types} post types: the hooks' references are accepted by the rules and every card reads right for a friend (boss, questline, Study Pass, Giant harvest, pet, clan, …)`, wrote.types === 12 && wrote.out.every(([, w]) => w === true) && seen.every(x => x.ok), JSON.stringify({ wrote: wrote.out, seen }));
// study session mentions: B sees A's table post "with you"; D (a friend of A only) sees "with 1 other" until B also posts it
await A.ev(async (b) => { POST.mine = {}; POST.burst = 0; return makePost('session', 'lidX', 1, { mates: [b] }); }, uid.B);
const dView1 = await D.ev(async () => { await loadPosts(true); showTab('posts'); renderPosts(true); return ($$('#postsBody .post').map(x => x.textContent.replace(/\s+/g, ' ')).find(t => /studied together/.test(t)) || ''); });
const bView = await B.ev(async () => { await loadPosts(true); renderPosts(true); return ($$('#postsBody .post').map(x => x.textContent.replace(/\s+/g, ' ')).find(t => /studied together/.test(t)) || ''); });
check('A study-session post: B (the mate) reads "studied together with you"; D (who doesn’t know B) reads "with 1 other"', /studied together with you/.test(bView) && /studied together with 1 other/.test(dView1), JSON.stringify({ bView, dView1 }));
// 9. blocking and unfriending take people out of the audience
await A.ev(async (d) => { window.confirm = () => true; await blockUser(d, 'pd'); }, uid.D); await wait(3000);
const dAfter = await D.ev(async () => { await loadPosts(true); return (POST.list || []).filter(p => p.author !== USER.uid).length; });
const audA = (await ownerGet('posts/' + pid)).aud;
check('A blocks D: D is taken out of the audience of A’s posts, and D’s feed has none of them', dAfter === 0 && !audA.includes(uid.D), JSON.stringify({ dAfter, audA }));
await B.ev(async () => { const f = friendsList()[0]; await removeFriendship(f.id, ''); }); await wait(4000);
const bAfter = await B.ev(async () => { await loadPosts(true); return (POST.list || []).filter(p => p.author !== USER.uid).length; });
const audB = (await ownerGet('posts/' + pid)).aud;
check('B removes the friendship: A’s app takes B out of the audience, B’s feed shows nothing of A’s', bAfter === 0 && !audB.includes(uid.B), JSON.stringify({ bAfter, audB }));
// 10. expiry and cleanup
await owner(`posts/hours_${uid.A}_h50`, { at: new Date(Date.now() - 31 * 864e5) });
const exp = await A.ev(async () => { await loadPosts(true); const shown = (POST.list || []).some(p => p.id.startsWith('hours_') && p.ref === 'h50'); POST.cleanAt = 0; S.ui.postClean = 0; await postsCleanup(); const once = POST.cleanAt > 0 && +S.ui.postClean === POST.cleanAt; await new Promise(r => setTimeout(r, 1500)); return shown || !once; });   // false = not shown, and the daily cleanup ran and stamped its day
const gone = await ownerGet(`posts/hours_${uid.A}_h50`);
check('A post older than 30 days isn’t shown, and the author’s app deletes it', exp === false && gone === null, JSON.stringify({ exp, gone }));
// 11. attack suite on the rules
const at = {};
const mk = (d, id, fields) => tryOp(d, `async () => FB.setDoc(FB.doc(FB.db, 'posts', '${id}'), Object.assign({ author: USER.uid, authorName: USER.username, type: 'ach', ref: 'x1', n: 0, aud: [USER.uid], day: dayKey(new Date()), at: FB.serverTimestamp() }, ${JSON.stringify(fields)}))`);
at.asSomeoneElse = await mk(C, `ach_${uid.A}_x1`, { author: uid.A, authorName: names.A });
at.wrongId = await mk(C, `ach_${uid.C}_other`, {});
at.freeText = await mk(C, `ach_${uid.C}_x1`, { text: 'hello' });
at.badType = await mk(C, `poem_${uid.C}_x1`, { type: 'poem' });
at.bigN = await mk(C, `ach_${uid.C}_x1`, { n: 9999999 });
at.noSelf = await mk(C, `ach_${uid.C}_x1`, { aud: [uid.A] });
at.badRef = await mk(C, `ach_${uid.C}_a b`, { ref: 'a b' });
at.ok = await mk(C, `ach_${uid.C}_x1`, {});
at.addAud = await tryOp(C, `async () => FB.updateDoc(FB.doc(FB.db, 'posts', 'ach_${uid.C}_x1'), { aud: [USER.uid, '${uid.A}'] })`);
at.reactOthers = await tryOp(B, `async () => FB.updateDoc(FB.doc(FB.db, 'posts', 'ach_${uid.C}_x1'), { 'r.${uid.B}': '🔥' })`);
await owner(`posts/evo_${uid.A}_e1`, { aud: [uid.A, uid.B, uid.D, uid.C] });   // let C read and try things on one of A's posts
at.reactBadEmoji = await tryOp(C, `async () => FB.updateDoc(FB.doc(FB.db, 'posts', 'evo_${uid.A}_e1'), { 'r.${uid.C}': '💩' })`);
at.reactForSomeoneElse = await tryOp(C, `async () => FB.updateDoc(FB.doc(FB.db, 'posts', 'evo_${uid.A}_e1'), { 'r.${uid.B}': '🔥' })`);
at.editOther = await tryOp(C, `async () => FB.updateDoc(FB.doc(FB.db, 'posts', 'evo_${uid.A}_e1'), { n: 5 })`);
at.deleteOther = await tryOp(C, `async () => FB.deleteDoc(FB.doc(FB.db, 'posts', 'evo_${uid.A}_e1'))`);
at.reactOk = await tryOp(C, `async () => FB.updateDoc(FB.doc(FB.db, 'posts', 'evo_${uid.A}_e1'), { 'r.${uid.C}': '👏' })`);
at.listAll = await tryOp(C, `async () => FB.getDocs(FB.query(FB.collection(FB.db, 'posts'), FB.limit(5)))`);
at.reactOwn = await tryOp(A, `async () => FB.updateDoc(FB.doc(FB.db, 'posts', 'evo_${uid.A}_e1'), { 'r.${uid.A}': '🔥' })`);
const denied = ['asSomeoneElse', 'wrongId', 'freeText', 'badType', 'bigN', 'noSelf', 'badRef', 'addAud', 'reactOthers', 'reactBadEmoji', 'reactForSomeoneElse', 'editOther', 'deleteOther', 'listAll', 'reactOwn'];
check(`Rules attack suite: ${denied.length} attempts refused (posting as someone else, a wrong id, free text, an unknown type, a huge number, no self in the audience, a bad ref, adding to the audience, reacting where not in the audience, a bad emoji, reacting for someone else, editing or deleting another’s post, listing everything, reacting to your own post); a valid post and a valid reaction allowed`,
  denied.every(k => /permission|denied/i.test(at[k])) && at.ok === 'ALLOWED' && at.reactOk === 'ALLOWED', JSON.stringify(at));
// 12. the demo
const DM = await device('DM', 1280, {}, { overtime: true });
await DM.p.goto(SITE + '/index.html'); await DM.p.waitForSelector('#authView:not(.hidden)'); await DM.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await DM.ev(() => startPreview()); await DM.p.waitForSelector('#appView:not(.hidden)'); await wait(3000); await closeDlg(DM);
const demo = await DM.ev(async () => {
  window.__w = []; for (const k of ['setDoc', 'updateDoc', 'deleteDoc', 'addDoc', 'runTransaction']) { const f = FB[k]; FB[k] = (...a) => { window.__w.push(k); return f(...a); }; }
  const ls0 = JSON.stringify(Object.keys(localStorage).sort());
  showTab('posts'); await loadPosts(true); renderPosts(true); await new Promise(r => setTimeout(r, 500));
  const cards = $$('#postsBody .post').map(x => x.textContent.replace(/\s+/g, ' ')), counts = $$('#postsBody .po-react b').length;
  const btn = $$('#postsBody [data-preact]').find(x => !x.disabled); if (btn) btn.click(); await new Promise(r => setTimeout(r, 400));
  return { n: cards.length, sample: cards.slice(0, 3), counts, prompt: !!document.querySelector('#pvDlg[open]'), w: window.__w, ls: JSON.stringify(Object.keys(localStorage).sort()) === ls0 };
});
check('Demo: a sample feed (rank-up, streak, studied together with you, achievements, boss, pass, giant harvest…) with reaction counts; reacting shows the preview prompt; nothing written', demo.n >= 7 && demo.counts >= 4 && demo.prompt && !demo.w.length && demo.ls, JSON.stringify(demo));
log('errors', JSON.stringify(errs));
check('No page errors', !errs.filter(e => !/permission|denied/i.test(e)).length, JSON.stringify(errs.slice(0, 4)));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
