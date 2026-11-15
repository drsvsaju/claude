// v1.19.1 (second round): Study sessions as their own section, and the Clan page.
//  1. Navigation: Social = Friends · Study sessions · Clan · Leaderboard (sidebar, phone More, tablet menu), J, the
//     command palette, the tour; Friends = Friends · Challenges (an old saved "sessions" view opens Friends).
//  2. The section with real accounts: empty state; hosting from the step-by-step sheet with a 240-minute preset
//     ("Brutal locked" 240/5 × 4, Focus together, friends only, 6 seats); a friend's live dot, tile, Ask to join → the host's
//     red dot and Allow; a public table with a friend inside ("@x is in") for a friend of that friend; an invite link opening
//     the section and joining; planning for later → Upcoming with Remind me → a notice at the start time; old inbox links.
//  3. Layout of the section from 360 to 2560 px, light / dark / Glossed / True Minimalist: no sideways scroll, the sheet
//     fits, card columns start on one line.
//  4. The demo: live and planned tables, the sheet, Remind me and RSVP show the preview prompt; nothing is written.
//  5. The Clan page: its own two columns again; Activity and Clan session milestones fold (5 entries / the progress line),
//     open and close smoothly (not with Animations off), remembered per device (not in the demo); "joined the clan" is
//     written once per real join — not again from a new device, not for a membership that started days ago — and old
//     duplicates are left out of the list.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, until, owner, SITE, U } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const names = { H: 'eh_' + R, F: 'ef_' + R, G: 'eg_' + R, P: 'ep_' + R };
const H = await device('H', 1440), F = await device('F', 1440), G = await device('G', 1440), P = await device('P', 1440);
await Promise.all([signup(H, names.H), signup(F, names.F), signup(G, names.G), signup(P, names.P)]);
for (const d of [H, F, G, P]) await closeDlg(d);
// friends: H–F, F–G (G doesn't know H; P knows nobody)
await H.ev(n => sendRequest(n), names.F); await G.ev(n => sendRequest(n), names.F); await wait(1500);
await until(F, () => incoming().length >= 2, null, 15000); await F.ev(() => incoming().forEach(r => acceptRequest(r.id))); await wait(2500);
for (const d of [H, F, G]) await d.ev(async () => { await loadFriendsPublic(true).catch(() => {}); });
check('Friends: H–F and F–G', (await H.ev(() => friendsList().length)) === 1 && (await F.ev(() => friendsList().length)) === 2 && (await G.ev(() => friendsList().length)) === 1);

const hostVia = (d, o) => d.ev(async o => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), q = s => document.querySelector(s);
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  showTab('sessions'); await sl(300);
  q('#sessHostOpen').click(); await sl(250);
  if (!q('#sessHostDlg').open) return 'sheet not open';
  q('#sessTitle').value = o.title; q('#hsNext').click(); await sl(80);
  q(`#sessHostDlg input[name=sessMode][value=${o.mode || 'together'}]`).click(); q('#hsNext').click(); await sl(80);
  q(`#sessHostDlg input[name=sessVis][value=${o.vis || 'friends'}]`).click(); q('#hsNext').click(); await sl(80);
  q(`#sessHostDlg input[name=sessMax][value="${o.max || 6}"]`).click(); q('#hsNext').click(); await sl(80);
  q(`#sessHostDlg input[name=sessWhen][value=${o.later ? 'later' : 'now'}]`).click(); await sl(80);
  if (o.later) q('#sessTime').value = o.time;
  if (o.preset) { const s = q('#sessPreset'); s.value = o.preset; s.dispatchEvent(new Event('change', { bubbles: true })); await sl(120); }
  const btn = q('#sessHostDlg [data-shost]'); if (!btn) return 'no Start button'; if (btn.disabled) return 'Start disabled';
  btn.click(); return 'ok';
}, o);
const endTable = async d => { await d.ev(async () => { if (inSess() && liveMine()) await liveControl('end'); }); await until(d, () => !inSess(), null, 10000); await d.ev(async () => { if (inSess()) await liveLeave(); }); await wait(500); };

// ===================== 1. navigation =====================
const nav = await H.ev(() => {
  const grp = $('#nvhSocial').parentElement, order = [...grp.querySelectorAll('[data-tab]')].map(x => x.dataset.tab).join();
  const btn = $('#tabs [data-tab=sessions]');
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', code: 'KeyJ', bubbles: true }));
  const viaKey = S.ui.tab;
  const pal = cmdList('study').some(x => /Study sessions/.test(x.t));
  const tour = tourSteps().some(st => st.tab === 'sessions');
  const keys = /Study sessions/.test($('#keysDlg').textContent);
  return { order, label: btn.textContent.trim(), title: btn.title, icon: !!btn.querySelector('svg'), viaKey, pal, tour, keys, cur: btn.getAttribute('aria-current') };
});
check('Sidebar Social: Friends · Posts (v1.20) · Study sessions · Clan · Leaderboard, with an icon; J opens it (shown in the shortcuts sheet), the command palette and the tour know it', nav.order === 'friends,posts,sessions,clan,board' && nav.label === 'Study sessions' && nav.icon && /\(J\)/.test(nav.title) && nav.viaKey === 'sessions' && nav.cur === 'page' && nav.pal && nav.tour && nav.keys, JSON.stringify(nav));
// phone: More opens the menu with it; tablet: the ☰ slide-in has it
const menus = {};
for (const [w, opener] of [[390, '#navMore'], [768, '#navBurger']]) {
  await H.p.setViewportSize({ width: w, height: 860 }); await wait(500);
  await H.ev(() => showTab('timer')); await wait(300);
  await H.p.click(opener); await wait(500);
  const vis = await H.ev(async () => { let last = null; for (let i = 0; i < 20; i++) { const x = $('#tabs [data-tab=sessions]'), r = x.getBoundingClientRect(); last = [r.left, r.right, r.width].map(Math.round); if (r.width > 0 && r.right <= innerWidth + 1 && r.left >= -1 && getComputedStyle(x).visibility !== 'hidden') return true; await new Promise(z => setTimeout(z, 100)); } return last; });   // (the menu slides in)
  await H.p.click('#tabs [data-tab=sessions]'); await wait(500);
  menus[w] = { vis, tab: await H.ev(() => S.ui.tab), closed: await H.ev(() => !document.documentElement.classList.contains('nav-open') && $(`${'#navMore'}`).getAttribute('aria-expanded') !== 'true') };
}
await H.p.setViewportSize({ width: 1440, height: 900 }); await wait(400);
check('Phone (More) and tablet (☰ slide-in): Study sessions is in the menu and opens the section', menus[390].vis === true && menus[390].tab === 'sessions' && menus[768].vis === true && menus[768].tab === 'sessions', JSON.stringify(menus));
const fr = await H.ev(async () => { S.ui.friendsView = 'sessions'; showTab('friends'); await new Promise(r => setTimeout(r, 600)); return { seg: $$('#friendsSeg button').map(x => x.dataset.view).join(), active: ($('#friendsSeg button.active') || {}).dataset?.view, view: S.ui.friendsView, list: !!$('#addFriendName') }; });
check('Friends tab: Friends · Challenges; an old saved "Study sessions" view opens Friends (nothing blank)', fr.seg === 'friends,challenges' && fr.active === 'friends' && fr.view === 'friends' && fr.list, JSON.stringify(fr));

// ===================== 2. the section with real accounts =====================
const empty = await H.ev(async () => { SESS.at = 0; showTab('sessions'); await sessLoad(true); renderSessionsPage(true); return { txt: $('#sessLive').textContent.replace(/\s+/g, ' '), btn: !!$('#sessLive [data-shostopen]'), hero: !!$('#sessHostOpen') }; });
check('Nothing live: "No one’s studying right now — start one and your friends will see it", with a Host button', /No one’s studying right now/.test(empty.txt) && /friends will see it/.test(empty.txt) && empty.btn && empty.hero, JSON.stringify(empty));
await H.ev(() => { if (!S.presets.some(p => p.name === 'Brutal locked')) S.presets.push({ id: 'p_brutal', name: 'Brutal locked', focus: 240, short: 5, long: 30, rounds: 4 }); S.timer.status = 'idle'; save(); });
const brutalId = await H.ev(() => S.presets.find(p => p.name === 'Brutal locked').id);
const T1 = 'Brutal block ' + R;
const via1 = await hostVia(H, { title: T1, mode: 'together', vis: 'friends', max: 6, preset: brutalId });
await until(H, () => inSess() && LIVE.doc && LIVE.doc.host === USER.uid, null, 15000);
const s1 = await H.ev(() => ({ lid: LIVE.lid, tab: S.ui.tab, table: !!$('#sessBody .lv-card, #sessBody #lvCard'), tools: !!$('#sessBody .sess-tools'), pat: LIVE.doc.pattern, vis: LIVE.doc.vis, max: LIVE.doc.max, mode: LIVE.doc.mode }));
check('Hosting from the sheet with "Brutal locked" (240/5 × 4), Focus together, friends only, 6 seats: the table opens in Study sessions with the host tools', via1 === 'ok' && s1.tab === 'sessions' && s1.table && s1.tools && s1.pat.focus === 240 && s1.pat.short === 5 && s1.pat.rounds === 4 && s1.vis === 'friends' && s1.max === 6 && s1.mode === 'together', JSON.stringify({ via1, s1 }));
// F: the live dot, the tile, Ask to join
await F.ev(async () => { showTab('timer'); SESS.at = 0; await sessLoad(true); });
const fDot = await F.ev(() => { const x = $('#sessBadge'); return { on: !x.classList.contains('hidden'), live: x.classList.contains('tb-live'), label: x.getAttribute('aria-label') }; });
check('F (H’s friend): a live dot on Study sessions while H’s table is open', fDot.on && fDot.live && /studying live/.test(fDot.label), JSON.stringify(fDot));
const fTile = await F.ev(t => { showTab('sessions'); const tile = $$('#sessLive .sess-tile').find(x => x.textContent.includes(t)); return tile ? { pic: !!tile.querySelector('.st-pic svg, .st-pic img, .st-pic .pic, .st-pic *'), seats: tile.querySelector('.st-seats b').textContent, ask: !!tile.querySelector('[data-sask]'), mode: /Focus together/.test(tile.textContent), rhythm: /240\/5 × 4/.test(tile.textContent) } : null; }, T1);
check('F sees H’s table under Live now: host picture, title, Focus together, 240/5 × 4, seats 1/6, Ask to join', fTile && fTile.pic && fTile.seats === '1/6' && fTile.ask && fTile.mode && fTile.rhythm, JSON.stringify(fTile));
await F.ev(t => { const tile = $$('#sessLive .sess-tile').find(x => x.textContent.includes(t)); tile.querySelector('[data-sask]').click(); }, T1);
await until(H, () => SESS.reqs.length >= 1, null, 15000);
const hDot = await H.ev(() => { showTab('timer'); updateSessBadge(); const x = $('#sessBadge'); return { on: !x.classList.contains('hidden'), live: x.classList.contains('tb-live'), label: x.getAttribute('aria-label') }; });
check('H: a red dot on Study sessions while F is asking to join', hDot.on && !hDot.live && /1 asking to join/.test(hDot.label), JSON.stringify(hDot));
await H.ev(async () => { showTab('sessions'); await new Promise(r => setTimeout(r, 300)); const a = $('#sessBody [data-sallow]'); if (a) a.click(); });
const fIn = await until(F, () => inSess(), null, 15000);
const fView = await F.ev(() => ({ tab: S.ui.tab, table: !!$('#sessBody .lv-card, #sessBody #lvCard') }));
check('H allows F: F is at the table, in Study sessions', fIn >= 0 && fView.tab === 'sessions' && fView.table, JSON.stringify(fView));
await endTable(H); await endTable(F);
// a public table with F inside, seen by G (F's friend, a stranger to H): "@F is in", G's live dot
const T2 = 'Open hall ' + R;
const via2 = await hostVia(H, { title: T2, mode: 'together', vis: 'public', max: 4 });
await until(H, () => inSess() && LIVE.doc && LIVE.doc.host === USER.uid, null, 15000);
const sid2 = await H.ev(() => LIVE.lid), code2 = await H.ev(() => LIVE.doc.code);
await F.ev(sid => sessJoin(sid), sid2); await until(F, () => inSess(), null, 15000);
await G.ev(async () => { showTab('timer'); SESS.at = 0; await sessLoad(true); });
const gSees = await G.ev(t => { const dot = $('#sessBadge'); showTab('sessions'); const tile = $$('#sessLive .sess-tile').find(x => x.textContent.includes(t)); return { dot: !dot.classList.contains('hidden') && dot.classList.contains('tb-live'), tile: tile ? tile.textContent.replace(/\s+/g, ' ') : '', join: !!(tile && tile.querySelector('[data-sjoin]')), pics: tile ? tile.querySelectorAll('.st-fr .pics > *').length : 0 }; }, T2);
check('G (F’s friend, not H’s) sees H’s public table with "@F is in", F’s picture, seats 2/4 and Join; G gets the live dot too', via2 === 'ok' && gSees.dot && new RegExp('@' + names.F + ' is in').test(gSees.tile) && /2\/4/.test(gSees.tile) && gSees.join && gSees.pics === 1, JSON.stringify(gSees));
// an invite link opens the section and joins
await P.p.goto(`${U}&session=${code2}`); await P.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && CLAN.started, null, { timeout: 20000 }).catch(() => {});
const pIn = await until(P, () => inSess(), null, 20000);
const pView = await P.ev(() => ({ tab: S.ui.tab, lid: LIVE.lid }));
check('An invite link (?session=CODE) opens Study sessions and joins the table', /^[A-Z0-9]{8}$/.test(code2) && pIn >= 0 && pView.tab === 'sessions' && pView.lid === sid2, JSON.stringify({ code2, pIn, pView }));
await endTable(H); await endTable(F); await endTable(P);
// planned for later → Upcoming with Remind me → a notice when it starts
const T3 = 'Later table ' + R, at3 = await H.ev(() => { const d = new Date(Date.now() + 2 * 3600e3); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; });
const via3 = await hostVia(H, { title: T3, mode: 'together', vis: 'friends', max: 5, later: true, time: at3 });
await until(H, () => inSess() && LIVE.doc && LIVE.doc.plan > Date.now(), null, 15000);
const sid3 = await H.ev(() => LIVE.lid);
await F.ev(async () => { SESS.at = 0; showTab('sessions'); await sessLoad(true); renderSessionsPage(true); });
const fUp = await F.ev(t => { const row = $$('#sessUpcoming .up-row').find(x => x.textContent.includes(t)); const live = $$('#sessLive .sess-tile').some(x => x.textContent.includes(t)); return { row: !!row, rem: !!(row && row.querySelector('[data-sremind]')), live }; }, T3);
await F.ev(sid => { $(`[data-sremind="${sid}"]`).click(); }, sid3); await wait(300);
const fRem = await F.ev(sid => ({ on: !!(S.ui.sessRemind || {})[sid], btn: ($(`[data-sremind="${sid}"]`) || {}).textContent }), sid3);
await F.ev(sid => { window.__ts = []; const t0 = toast; toast = (m, ...a) => { window.__ts.push(String(m)); return t0(m, ...a); }; S.ui.sessRemind[sid].at = Date.now() - 5000; sessRemindTick(); }, sid3);
const fNote = await F.ev(([sid, t]) => ({ inbox: !!IB.find(x => x.key === 'srem:' + sid), toast: window.__ts.some(m => m.includes(t) && /starting/.test(m)), gone: !(S.ui.sessRemind || {})[sid] }), [sid3, T3]);
check('Plan for later: the table is under F’s Upcoming (not Live now) with Remind me; the reminder is kept, and at the start time F gets a notice in the inbox and a toast', via3 === 'ok' && fUp.row && fUp.rem && !fUp.live && fRem.on && /Reminder on/.test(fRem.btn) && fNote.inbox && fNote.toast && fNote.gone, JSON.stringify({ via3, fUp, fRem, fNote }));
await endTable(H);
// notices from before 1.19.1 ({ tab: 'friends', view: 'sessions' }) open the section
const legacy = await F.ev(() => { showTab('timer'); ibGo({ go: { tab: 'friends', view: 'sessions' } }); return S.ui.tab; });
check('An inbox notice saved before 1.19.1 (Friends › Study sessions) opens the Study sessions section', legacy === 'sessions', legacy);

// a toast while the sheet is open, then the sheet moves on a step: toasts keep working (the sheet once re-drew the whole
// dialog and took the shared toast element with it — every later toast failed)
const toastOk = await H.ev(async () => { const errs = []; try { showTab('sessions'); openHostSheet(); toast('one'); $('#hsNext').click(); $('#hsBack').click(); toast('two'); $('#sessHostDlg').close(); toast('three'); } catch (e) { errs.push(e.message); } return { errs, host: !!$('#toast') }; });
check('A toast over the host sheet, the sheet stepping on and back, toasts after: no error, the toast element is still there', !toastOk.errs.length && toastOk.host, JSON.stringify(toastOk));
// ===================== 3. layout =====================
await F.ev(async () => { SESS.at = 0; await sessLoad(true); });
const LAY = async (d, tag) => d.ev(async tag => {
  showTab('sessions'); renderSessionsPage(true); await new Promise(r => setTimeout(r, 450));
  const out = [], over = document.documentElement.scrollWidth - innerWidth;
  if (over > 1) out.push({ tag, why: 'sideways scroll', over });
  for (const el of $$('#sessBody *')) { const r = el.getBoundingClientRect(); if (r.width && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.seg')) { out.push({ tag, why: 'past the right edge', el: (el.className || el.tagName).toString().slice(0, 30), right: Math.round(r.right) }); break; } }
  const m = $('#sessBody .mason');
  if (m && m.classList.contains('mason-2')) { const kids = [...m.children].filter(k => k.offsetHeight), mid = m.getBoundingClientRect().left + m.getBoundingClientRect().width / 2, top = [1e9, 1e9]; for (const k of kids) { const r = k.getBoundingClientRect(); const i = r.left + r.width / 2 < mid ? 0 : 1; top[i] = Math.min(top[i], r.top); } if (top[0] < 1e8 && top[1] < 1e8 && Math.abs(top[0] - top[1]) > 24) out.push({ tag, why: 'columns start apart', d: Math.round(Math.abs(top[0] - top[1])) }); }
  if (m && m.classList.contains('mason-one')) { const hero = $('#sessBody .sess-hero').getBoundingClientRect(), mr = m.getBoundingClientRect(); if (Math.abs(hero.left - mr.left) > 2 || Math.abs(hero.width - mr.width) > 2) out.push({ tag, why: 'header not lined up with the one column', hero: Math.round(hero.width), col: Math.round(mr.width) }); }
  // the host sheet fits the screen
  openHostSheet(); await new Promise(r => setTimeout(r, 200));
  for (let i = 0; i < 5; i++) { const r = $('#sessHostDlg').getBoundingClientRect(); if (r.left < -1 || r.right > innerWidth + 1 || r.width < 200) { out.push({ tag, why: 'host sheet off screen', step: i, l: Math.round(r.left), r: Math.round(r.right) }); break; } const n = $('#hsNext'); if (n) { n.click(); await new Promise(r => setTimeout(r, 60)); } }
  $('#sessHostDlg').close();
  return out;
}, tag);
const lay = [];
for (const w of [360, 390, 768, 1024, 1440, 1920, 2560]) { await F.p.setViewportSize({ width: w, height: 900 }); await wait(400); lay.push(...await LAY(F, String(w))); }
for (const v of [{ mode: 'light', glass: 'off', mini: false }, { mode: 'dark', glass: 'off', mini: false }, { mode: 'dark', glass: 'full', mini: false }, { mode: 'light', glass: 'off', mini: true }]) {
  await F.ev(v => { S.settings.theme = v.mode; applyTheme(); setGlass(v.glass); if (minimal() !== v.mini) setMinimal(v.mini); }, v);
  for (const w of [390, 1440]) { await F.p.setViewportSize({ width: w, height: 900 }); await wait(400); lay.push(...await LAY(F, `${v.mode}/${v.glass}${v.mini ? '/minimal' : ''} ${w}`)); }
}
await F.ev(() => { S.settings.theme = 'auto'; applyTheme(); setGlass('off'); if (minimal()) setMinimal(false); });
await F.p.setViewportSize({ width: 1440, height: 900 });
check('Study sessions from 360 to 2560 px, light / dark / Glossed / True Minimalist: no sideways scroll, the host sheet fits on every step, columns start on one line (or one column under the header)', !lay.length, JSON.stringify(lay.slice(0, 5)));

// ===================== 5. the Clan page =====================
const cid = await H.ev(async n => { await clanCreate({ name: n, tag: 'FOLD', desc: 'jee' }); await clanRefresh(true); return CLAN.id; }, 'Fold Crew ' + R);
const joins = () => H.ev(async () => (await FB.getDocs(cCol(CLAN.id, 'feed'))).docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.type === 'join' && e.who === USER.username).length);
const j0 = await joins();
// a "new device": no clan saved locally, no notes of what was posted
const newDevice = () => H.ev(async () => { for (const k of Object.keys(localStorage)) if (/clanfeed|pomodorolist-clan/.test(k)) localStorage.removeItem(k); clanReset(); await clanRefresh(true); await new Promise(r => setTimeout(r, 800)); });
await newDevice(); const j1 = await joins();
await newDevice(); const j2 = await joins();
check('"joined the clan" is written once per real join: a new device (twice) adds no second one', j0 <= 1 && j1 === Math.max(1, j0) && j2 === j1, JSON.stringify({ j0, j1, j2 }));
// a membership that started 10 days ago: a new device writes nothing
const uidH = await H.ev(() => USER.uid);
await owner(`clans/${cid}/members/${uidH}`, { joinedAt: new Date(Date.now() - 10 * 864e5) });
await newDevice(); const j3 = await joins();
check('A leader in the clan for 10 days opens the app on a new device: no "joined the clan — just now"', j3 === j2, JSON.stringify({ j2, j3 }));
// the old app's duplicate (written long after the real join) is left out of the Activity list
await H.ev(() => clanFeed('join', 0, { once: 'legacy-' + Date.now() })); await wait(800);
const legacyDup = await H.ev(async () => { await clanLoadDetails(true); showTab('clan'); renderClan(); await new Promise(r => setTimeout(r, 400)); return { written: (CLAN.feed || []).filter(e => e.type === 'join' && e.who === USER.username).length, shown: $$('#tab-clan .clan-feed li').filter(li => /joined the clan/.test(li.textContent) && li.textContent.includes(USER.username)).length }; });
check('A duplicate written by an older app (just now, for a 10-day member) is left out of Activity', legacyDup.written >= 1 && legacyDup.shown === 0, JSON.stringify(legacyDup));
// folding: 8 activity entries; Activity shows 5 + "Show all (n)"; milestones fold to the progress line
await H.ev(async () => { for (let i = 0; i < 8; i++) { clanFeed('focus', 25 + i); await new Promise(r => setTimeout(r, 60)); } }); await wait(1500);
const fold0 = await H.ev(async () => {
  await clanLoadDetails(true); showTab('clan'); renderClan(); await new Promise(r => setTimeout(r, 500));
  const feed = $('#tab-clan .feed-card'), miles = $('#tab-clan .group-card');
  const vis = el => !!el && el.getClientRects().length > 0;
  return { grid: !!$('#tab-clan .clan-grid > .stack'), mason: !!$('#tab-clan .mason'), folded: feed.classList.contains('folded'), shownRows: $$('#tab-clan .clan-feed li').filter(vis).length, allRows: $$('#tab-clan .clan-feed li').length, more: vis(feed.querySelector('.fold-more')) ? feed.querySelector('.fold-more').textContent : '', icon: feed.querySelector('.fold-ic').textContent, aria: feed.querySelector('.fold-hd').getAttribute('aria-expanded'),
    mFolded: miles.classList.contains('folded'), mBar: vis(miles.querySelector('.xpbar')), mNext: /next:/.test(miles.textContent), mList: vis(miles.querySelector('.mile-list')), mMore: vis(miles.querySelector('.fold-more')) ? miles.querySelector('.fold-more').textContent : '' };
});
check('Clan page: its own two columns (not the balanced list); Activity folded to the latest 5 with "Show all (n)" and ▾; Clan session milestones folded to the progress line and the next reward with "Show all milestones"', fold0.grid && !fold0.mason && fold0.folded && fold0.shownRows === 5 && fold0.allRows > 5 && /^Show all \(\d+\)$/.test(fold0.more) && fold0.icon === '▾' && fold0.aria === 'false' && fold0.mFolded && fold0.mBar && fold0.mNext && !fold0.mList && fold0.mMore === 'Show all milestones', JSON.stringify(fold0));
const fold1 = await H.ev(async () => {
  document.documentElement.dataset.motion = 'full';
  const feed = $('#tab-clan .feed-card'); feed.querySelector('.fold-more').click();
  const anims = feed.querySelector('.fold-body').getAnimations().length;
  await new Promise(r => setTimeout(r, 400));
  const miles = $('#tab-clan .group-card'); miles.querySelector('.fold-hd').click(); await new Promise(r => setTimeout(r, 400));
  return { open: !feed.classList.contains('folded'), rows: $$('#tab-clan .clan-feed li').filter(li => li.getClientRects().length).length, icon: feed.querySelector('.fold-ic').textContent, anims, mOpen: !miles.classList.contains('folded'), mList: miles.querySelector('.mile-list').getClientRects().length > 0, saved: localStorage.getItem('pomodorolist-fold') };
});
check('"Show all" opens Activity (every entry, ▴) with a smooth animation; the milestones header opens the full list; both remembered on this device', fold1.open && fold1.rows === fold0.allRows && fold1.icon === '▴' && fold1.anims > 0 && fold1.mOpen && fold1.mList && /"clanFeed":1/.test(fold1.saved) && /"clanMiles":1/.test(fold1.saved), JSON.stringify(fold1));
await H.p.reload(); await H.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && CLAN.started, null, { timeout: 20000 }); await wait(1500); await closeDlg(H);
const fold2 = await H.ev(async () => { showTab('clan'); await clanLoadDetails(true); renderClan(); await new Promise(r => setTimeout(r, 500)); const feed = $('#tab-clan .feed-card'), miles = $('#tab-clan .group-card');
  const open = !feed.classList.contains('folded') && !miles.classList.contains('folded');
  document.documentElement.dataset.motion = 'off'; feed.querySelector('.fold-hd').click(); const anims = feed.querySelector('.fold-body').getAnimations().length;
  document.documentElement.dataset.motion = 'full';
  return { open, anims, folded: feed.classList.contains('folded'), rows: $$('#tab-clan .clan-feed li').filter(li => li.getClientRects().length).length }; });
check('After a reload both cards are still open; with Animations off, folding is instant (no animation) and back to 5 entries', fold2.open && fold2.anims === 0 && fold2.folded && fold2.rows === 5, JSON.stringify(fold2));

// ===================== 4. the demo =====================
const D = await device('D', 1440);
await D.p.goto(SITE + '/index.html'); await D.p.waitForSelector('#authView:not(.hidden)'); await D.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await D.ev(() => startPreview()); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(3000); await closeDlg(D);
const demo = await D.ev(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  window.__w = []; for (const k of ['setDoc', 'updateDoc', 'deleteDoc', 'addDoc', 'runTransaction']) { const f = FB[k]; FB[k] = (...a) => { window.__w.push(k); return f(...a); }; }
  const ls0 = JSON.stringify(Object.keys(localStorage).sort());
  showTab('sessions'); await sl(1500);
  const tiles = $$('#sessLive .sess-tile').map(x => x.textContent.replace(/\s+/g, ' '));
  const up = $$('#sessUpcoming .up-row').map(x => x.textContent.replace(/\s+/g, ' '));
  const prompts = [];
  const tryBtn = async sel => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); const btn = $(sel); if (!btn) { prompts.push(sel + ': none'); return; } btn.click(); await sl(350); prompts.push(sel + ': ' + !!document.querySelector('#pvDlg[open]')); };
  await tryBtn('#sessLive [data-sjoin]'); await tryBtn('#sessUpcoming [data-sremind]'); await tryBtn('#sessUpcoming [data-hrsvp="maybe"]');
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  openHostSheet(); for (let i = 0; i < 4; i++) { $('#hsNext').click(); await sl(60); } $('#sessHostDlg [data-shost]').click(); await sl(350);
  const sheetPrompt = !!document.querySelector('#pvDlg[open]');
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  showTab('clan'); await sl(800); const feed = $('#tab-clan .feed-card'); feed.querySelector('.fold-hd').click(); await sl(300);
  const foldOk = !feed.classList.contains('folded') && localStorage.getItem('pomodorolist-fold') === null;
  return { tiles: tiles.length, t: tiles.join(' | ').slice(0, 300), up, prompts, sheetPrompt, inSess: inSess(), writes: window.__w, lsSame: JSON.stringify(Object.keys(localStorage).sort()) === ls0, foldOk, badge: $('#sessBadge').className };
});
check('Demo: two live tables and the planned "Physics problem set" with Remind me (plus the clan’s planned sessions); Join, Remind me, RSVP and Start in the sheet show the preview prompt; folding works for the visit; nothing is written', demo.tiles >= 2 && demo.up.some(x => /Physics problem set/.test(x) && /Remind me/.test(x)) && demo.prompts.every(x => /true$/.test(x)) && demo.sheetPrompt && !demo.inSess && !demo.writes.length && demo.lsSame && demo.foldOk && /tb-live/.test(demo.badge), JSON.stringify(demo));

log('errors', JSON.stringify(errs));
check('No page errors', !errs.length, JSON.stringify(errs.slice(0, 5)));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
