// v1.11 fast start: opening from this device's copy, then the cloud; account isolation; edits while loading.
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
async function device(name, sdkDelay = 0) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 800 } });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '9');
    const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); });
  const D = { ctx, name, sdkDelay };
  // the site's own SDK copies (their imports point at /firebasejs/, so only one copy of firebase-app ever loads), optionally delayed
  await ctx.route('**/firebasejs/**', async r => { if (D.sdkDelay) await wait(D.sdkDelay); r.fulfill({ body: fs.readFileSync(new URL('./site/firebasejs/10.12.2/', import.meta.url).pathname + r.request().url().split('/').pop()), contentType: 'application/javascript' }); });
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  D.p = await ctx.newPage();
  D.nav = 0;
  D.p.on('framenavigated', f => { if (f === D.p.mainFrame()) D.nav++; });
  D.p.on('pageerror', e => errs.push(name + ': ' + e.message));
  D.p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource|WebChannel|transport errored|Could not reach Cloud Firestore|emulator/i.test(m.text())) errs.push(name + ' console: ' + m.text().slice(0, 160)); });
  return D;
}
const ev = (d, f, a) => d.p.evaluate(f, a);
const ready = d => d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 25000 });
const until = async (d, fn, arg, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(d, fn, arg)) return Date.now() - t0; await wait(100); } return -1; };
async function signup(d, user) {
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.click('[data-mode=signup] >> visible=true'); await d.p.fill('#authUser', user); await d.p.fill('#authPass', 'secret12'); await d.p.fill('#authPass2', 'secret12'); await d.p.click('#authSubmit');
  await ready(d); await wait(1200); await ev(d, () => { if ($('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
}
const sfx = Date.now().toString(36).slice(-5), userA = 'fa_' + sfx, userB = 'fb_' + sfx;

// 1. returning visit: the app is there before Firebase has even loaded, then connects
const A = await device('A');
await signup(A, userA);
await ev(A, () => { S.settings.gamification = true; S.sessions.push({ id: 'x1', name: 'Physics', start: Date.now() - 864e5, end: Date.now() - 864e5 + 3e6, duration: 3e6, planned: 3e6 }); cloudAddSessions([S.sessions.at(-1)]); save(); });
await wait(1500);
A.sdkDelay = 2500; A.nav = 0;   // slow network: Firebase takes 2.5 s to arrive
await A.p.reload();
await A.p.waitForSelector('#appView:not(.hidden)', { timeout: 2000 }).catch(() => {});
const early = await ev(A, () => ({ app: !$('#appView').classList.contains('hidden'), fb: !!FB.db, user: USER && USER.username, sessions: S.sessions.length, sync: $('#syncStatus b').textContent, skel: document.body.classList.contains('first-load') }));
check('reload on a slow network: the app shows from this device\'s copy before Firebase loads', early.app && !early.fb && early.user === userA && early.sessions >= 1 && !early.skel, JSON.stringify(early));
// an edit made while still loading
await ev(A, () => { S.reminders.push({ id: 'early1', title: 'Made while loading', date: dayKey(addDays(new Date(), 1)), time: '07:00', repeat: 'none', days: [], before: 0 }); save(); });
await ready(A);
check('… then Firebase connects in place (no reload, listeners live)', A.nav === 1 && await ev(A, () => profileLoaded && cloudReady()), `navigations ${A.nav}`);
const inCloud = await until(A, async () => { const d = (await FB.getDocFromServer(userRef())).data(); return (d.reminders || []).some(r => r.id === 'early1'); }, null, 8000);
check('… and an edit made while loading reaches the cloud', inCloud >= 0, `${inCloud} ms`);
// another device's item, added while A had an old copy, is not lost by A's early edit
const A2 = await device('A2');
await A2.p.goto(U); await A2.p.waitForSelector('#authView:not(.hidden)');
await A2.p.click('[data-mode=login] >> visible=true'); await A2.p.fill('#authUser', userA); await A2.p.fill('#authPass', 'secret12'); await A2.p.click('#authSubmit');
await ready(A2); await wait(800);
await A.ctx.setOffline(true);
await ev(A2, () => { S.reminders.push({ id: 'other1', title: 'From the other device', date: dayKey(addDays(new Date(), 2)), time: '08:00', repeat: 'none', days: [], before: 0 }); save(); });
await wait(1500); await A.ctx.setOffline(false);
A.sdkDelay = 2000; A.nav = 0;
await A.p.reload();
await A.p.waitForSelector('#appView:not(.hidden)');
await ev(A, () => { S.reminders.push({ id: 'early2', title: 'Second early edit', date: dayKey(addDays(new Date(), 3)), time: '09:00', repeat: 'none', days: [], before: 0 }); save(); });
await ready(A);
const both = await until(A, () => S.reminders.some(r => r.id === 'other1') && S.reminders.some(r => r.id === 'early2'), null, 8000);
check('edit while loading + another device\'s new item → both kept', both >= 0);
const both2 = await until(A2, () => S.reminders.some(r => r.id === 'early2') && S.reminders.some(r => r.id === 'other1'), null, 8000);
check('… on the other device too', both2 >= 0);
await A2.ctx.close();

// 2. log out → log in as someone else on the same browser: nothing of A is ever shown
A.sdkDelay = 0;
await ev(A, () => { logout(); }).catch(() => {});
await A.p.waitForSelector('#authView:not(.hidden)', { timeout: 10000 }).catch(() => {});
const afterLogout = await ev(A, () => ({ last: localStorage.getItem('pomodorolist-last-user'), caches: Object.keys(localStorage).filter(k => k.startsWith('pomodorolist-cache:')).length }));
check('logout: no last-user and no account copy left on the device', !afterLogout.last && afterLogout.caches === 0, JSON.stringify(afterLogout));
await A.p.click('[data-mode=signup] >> visible=true'); await A.p.fill('#authUser', userB); await A.p.fill('#authPass', 'secret12'); await A.p.fill('#authPass2', 'secret12');
await ev(A, () => { window.__leak = []; const iv = setInterval(() => { const t = document.getElementById('appView').textContent + ' ' + JSON.stringify(typeof S !== 'undefined' ? S.reminders : []); if (/early1|Made while loading|@fa_/.test(t)) window.__leak.push(t.slice(0, 80)); }, 20); setTimeout(() => clearInterval(iv), 8000); });
await A.p.click('#authSubmit'); await ready(A); await wait(1500);
check('signing in as another account on the same browser: the first account\'s data is never shown', (await ev(A, () => window.__leak.length)) === 0 && (await ev(A, () => USER.username)) === userB);

// 3. a stale last-user copy for a different account than the one signed in: the signed-in account wins
await ev(A, ([u]) => { localStorage.setItem('pomodorolist-last-user', JSON.stringify({ uid: 'someone-else', username: u })); localStorage.setItem('pomodorolist-cache:someone-else', JSON.stringify({ reminders: [{ id: 'z', title: 'NOT MINE', date: '2030-01-01', time: '09:00', repeat: 'none', days: [], before: 0 }] })); }, [userA]);
A.nav = 0;
await A.p.reload(); await ready(A); await wait(1500);
const st3 = await ev(A, () => ({ user: USER.username, uid: USER.uid === FB.auth.currentUser.uid, notMine: S.reminders.some(r => r.title === 'NOT MINE'), shown: $('#appView').textContent.includes('NOT MINE') }));
check('cache of another account under last-user: replaced by the signed-in account at once', st3.user === userB && st3.uid && !st3.notMine && !st3.shown && A.nav === 1, JSON.stringify(st3));

// 4. signed out elsewhere (no login on this browser any more, but a copy is cached): login screen, no reload loop
const C = await device('C', 800);
await C.p.goto(U); await C.p.waitForSelector('#authView:not(.hidden)');
await ev(C, ([u]) => { localStorage.setItem('pomodorolist-last-user', JSON.stringify({ uid: 'gone-uid', username: u })); localStorage.setItem('pomodorolist-cache:gone-uid', JSON.stringify({ reminders: [] })); }, [userA]);
C.nav = 0;
await C.p.reload();
await wait(4000);
const st4 = await ev(C, () => ({ auth: !$('#authView').classList.contains('hidden'), app: !$('#appView').classList.contains('hidden'), last: localStorage.getItem('pomodorolist-last-user') }));
check('login gone (signed out elsewhere): shows the login screen once, no reload loop', st4.auth && !st4.app && !st4.last && C.nav === 1, JSON.stringify(st4) + ` navigations ${C.nav}`);
log('errors', errs, '| failures', fails);
await b.close();
process.exit(fails ? 1 : 0);   // v2.0: a failing check fails the suite (it used to exit 0)
