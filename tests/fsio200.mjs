// Firestore reads/writes, v1.20 vs v2.0, on the same scenario (emulator, instrumented copies of each build).
// The scenario of v1.20's own comparison (fsio120.mjs), with what 2.0 adds where it can cost reads: the Calendar, the
// invite page, Streak care and Focus insights (which reads friends' weekly minutes):
//  1. one new user's first day — sign-up + first load, three focus blocks, a look at every tab, (1.20: the Study Pass
//     with Claim all, Posts), a reload, a minute idle;
//  2. a user with 50 friends who all posted this week: opening Friends, then (1.20) Posts, a second look within
//     3 minutes, and a pull-to-refresh.
// Usage: node fsio200.mjs count120.html "1.20"   |   node fsio200.mjs count200.html "2.0"
import { chromium } from 'playwright';
import fs from 'fs';
const page = process.argv[2] || 'count.html', label = process.argv[3] || page;
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const FS = 'http://127.0.0.1:8080/v1/projects/demo-pomo/databases/(default)/documents/';
const wait = ms => new Promise(r => setTimeout(r, ms));
const enc = v => typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'string' ? { stringValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'boolean' ? { booleanValue: v } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const owner = async (path, f) => { const r = await fetch(FS + path, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, enc(v)])) }) }); if (!r.ok) throw new Error('owner ' + r.status + ' ' + (await r.text()).slice(0, 200)); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
async function open(user) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); });
  // the same classic block end on both builds (1.20's Overtime would keep the block running)
  await ctx.addInitScript(() => { setInterval(() => { try { if (typeof S !== 'undefined' && S && S.settings && S.settings.overtime !== false) S.settings.overtime = false; } catch (e) {} }, 100); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8000/' + page + '?emulator=1'); await p.waitForSelector('#authView:not(.hidden)');
  await p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await p.click('[data-mode=signup] >> visible=true'); await p.fill('#authUser', user); await p.fill('#authPass', 'secret12'); await p.fill('#authPass2', 'secret12'); await p.click('#authSubmit');
  await p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && CLAN.started, null, { timeout: 20000 });
  await wait(8000);
  await p.evaluate(() => { if ($('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
  await wait(2000);
  return { ctx, p, errs };
}
const has120 = s => s.includes('function renderPosts');
const is120 = has120(fs.readFileSync(new URL('./site/' + page, import.meta.url), 'utf8')), is200 = /const APP_VERSION = '2\./.test(fs.readFileSync(new URL('./site/' + page, import.meta.url), 'utf8'));
// ---------- 1. a new user's first day ----------
const { p, errs } = await open('io_' + Date.now().toString(36).slice(-5));
const rows = []; let last = { reads: 0, writes: 0 };
const snap = async (pg, name) => { const c = await pg.evaluate(() => ({ reads: __fs.reads, writes: __fs.writes })); rows.push([name, c.reads - last.reads, c.writes - last.writes]); last = c; };
await snap(p, 'sign-up + first load + tutorial');
for (let i = 0; i < 3; i++) {
  await p.evaluate(m => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = m * 60000; t.focusStartedAt = Date.now(); t.endAt = Date.now() - 1; }, 25);
  await wait(3000); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
}
await wait(15000);
await snap(p, '3 focus blocks (+15 s for the pushes)');
for (const t of ['stats', 'quests', 'reminders', 'friends', 'clan', 'board', 'shop', 'profile', 'settings', 'garden', 'room', 'timer']) { await p.evaluate(t => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab(t); }, t); await wait(900); }
await wait(6000);
await snap(p, 'a look at every tab');
if (is120) {
  await p.evaluate(() => { S.ui.questView = 'pass'; showTab('quests'); renderQuests(); }); await wait(800);
  await p.evaluate(() => { const b = $('[data-pclaimall]'); if (b) b.click(); }); await wait(1200);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('posts'); }); await wait(3000);
  await p.evaluate(() => { showTab('timer'); }); await wait(15000);
  await snap(p, '1.20: the Study Pass + Claim all, Posts (+15 s)');
}
if (is200) {
  for (const c of ["showTab('calendar')", "S.ui.calView = 'week'; showTab('calendar')", "S.ui.friendsView = 'invite'; showTab('friends')", "showTab('timer'); openStreakCare()", "showTab('stats')"]) { await p.evaluate(async c => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); await (0, eval)(`(async () => { ${c} })()`); }, c); await wait(1200); }
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('timer'); }); await wait(15000);
  await snap(p, '2.0: Calendar (month, week), Invite, Streak care, Stats (+15 s)');
}
await p.reload(); await p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && CLAN.started, null, { timeout: 20000 }); await wait(8000);
await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
last = { reads: 0, writes: 0 };
await snap(p, 'reload (cache-first second load, +8 s)');
await wait(60000);
await snap(p, 'one minute idle on the Timer tab');
const by = await p.evaluate(() => Object.entries(__fs.by).sort((a, b) => (b[1].r + b[1].w) - (a[1].r + a[1].w)).slice(0, 12));
// ---------- 2. 50 friends, each with a post this week ----------
const q = await open('io50_' + Date.now().toString(36).slice(-5));
const me = await q.p.evaluate(() => ({ uid: USER.uid, name: USER.username }));
const now = new Date();
const rows2 = []; let l2 = await q.p.evaluate(() => ({ reads: __fs.reads, writes: __fs.writes }));
for (let i = 0; i < 50; i++) {
  const fu = 'fx' + String(i).padStart(2, '0') + Date.now().toString(36).slice(-4), fname = 'friend_' + i, users = [me.uid, fu].sort();
  await owner(`friendships/${users.join('_')}`, { users, from: fu, to: me.uid, status: 'accepted', fromName: fname, toName: me.name, createdAt: now, acceptedAt: now });
  await owner(`publicProfiles/${fu}`, { username: fname, level: 3, tier: 'novice', streak: 2, longest: 3, hours: 5, joined: 1700000000000, updatedAt: now });
  if (is120) await owner(`posts/streak_${fu}_m7`, { author: fu, authorName: fname, type: 'streak', ref: 'm7', n: 7, aud: [fu, me.uid], day: now.toISOString().slice(0, 10), at: new Date(Date.now() - i * 60000) });
}
await wait(4000);
const snap2 = async name => { const c = await q.p.evaluate(() => ({ reads: __fs.reads, writes: __fs.writes })); rows2.push([name, c.reads - l2.reads, c.writes - l2.writes]); l2 = c; };
await snap2('the 50 friendships arrive (listener)');
await q.p.evaluate(() => { S.ui.friendsView = 'friends'; showTab('friends'); }); await wait(6000);
await snap2('open Friends (50 friends)');
await q.p.evaluate(() => { showTab('stats'); }); await wait(5000);
await snap2('open Stats (2.0: Focus insights reads friends\' weekly minutes, at most 12, once in 30 min)');
await q.p.evaluate(() => { showTab('timer'); }); await wait(1000); await q.p.evaluate(() => { showTab('stats'); }); await wait(3000);
await snap2('open Stats again');
let feedN = null;
if (is120) {
  await q.p.evaluate(() => { showTab('posts'); }); await wait(5000);
  feedN = await q.p.evaluate(() => (POST.list || []).length);
  await snap2('open Posts (50 posts from 50 friends)');
  await q.p.evaluate(() => { showTab('timer'); }); await wait(1500);
  await q.p.evaluate(() => { showTab('posts'); }); await wait(3000);
  await snap2('Posts again within 3 minutes');
  await wait(21000);
  await q.p.evaluate(() => { const r = $('[data-prefresh]'); if (r) r.click(); }); await wait(3000);
  await snap2('Posts: tap Refresh (more than 20 s after the last load)');
  await q.p.evaluate(() => { const r = $('[data-prefresh]'); if (r) r.click(); }); await wait(2000);
  await snap2('Posts: tap Refresh again at once');
}
const tot = rows.reduce((a, r) => [a[0] + r[1], a[1] + r[2]], [0, 0]);
console.log(`${label} — Firestore operations (emulator, the same scenario on both builds)`);
console.log('| step | reads | writes |\n|---|---:|---:|');
for (const r of rows) console.log(`| ${r[0]} | ${r[1]} | ${r[2]} |`);
console.log(`| **total** | **${tot[0]}** | **${tot[1]}** |`);
console.log('\ntop call sites: ' + by.map(([k, v]) => `${k} r${v.r} w${v.w} n${v.n}`).join(' · '));
console.log(`\n50 friends${feedN !== null ? ` (feed shows ${feedN})` : ''}:`);
console.log('| step | reads | writes |\n|---|---:|---:|');
for (const r of rows2) console.log(`| ${r[0]} | ${r[1]} | ${r[2]} |`);
console.log('errors', errs, q.errs);
await b.close();
