import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const URL_ = 'http://localhost:8000/index.html?emulator=1';
async function device(name) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); { const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => {
    const f = FBDIR + r.request().url().split('/').pop();
    r.fulfill({ body: fs.readFileSync(f), contentType: 'application/javascript' });
  });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(name + ': ' + e.message));
  p.on('dialog', d => d.accept());
  return { ctx, p };
}
const log = (...a) => console.log(...a);
const closeDlg = p => p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'migrateDlg' && d.close()));
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------- Device A: has pre-account data ----------
const A = await device('A');
await A.p.goto('http://localhost:8000/index.html');
await A.p.evaluate(() => {
  const now = Date.now(), sessions = [];
  for (let i = 1; i <= 5; i++) { const st = now - i * 864e5; sessions.push({ id: 'old' + i, name: 'Physics', start: st, end: st + 70 * 60000, duration: 70 * 60000, planned: 70 * 60000, preset: 'Classic 25/5' }); }
  localStorage.setItem('focus-app-v1', JSON.stringify({ sessions, presets: [{ id: 'p-x', name: 'Exam 90/15', focus: 90, short: 15, long: 30, rounds: 2 }], recent: [{ name: 'Physics', presetId: 'p-classic', ts: now }], pinned: [], names: { Physics: { color: '#d08a3c', tag: 'JEE' } }, settings: { goalMin: 60 } }));
});
await A.p.goto(URL_);
await A.p.waitForSelector('#authView:not(.hidden)');
await A.p.screenshot({ path: 'a-login.png' });

// wrong login (no such user)
await A.p.click('[data-mode=login] >> visible=true'); await A.p.fill('#authUser', 'Saju_K'); await A.p.fill('#authPass', 'secret1');
await A.p.click('#authSubmit'); await wait(1500);
log('login unknown ->', await A.p.textContent('#authError'));
// signup validation
await A.p.click('[data-mode=signup] >> visible=true');
await A.p.fill('#authUser', 'ab'); await A.p.click('#authSubmit');
log('short username ->', await A.p.textContent('#authError'));
await A.p.fill('#authUser', 'Saju_K'); await A.p.fill('#authPass', 'secret1'); await A.p.fill('#authPass2', 'secret2');
await A.p.click('#authSubmit'); log('mismatch ->', await A.p.textContent('#authError'));
await A.p.click('[data-toggle=authPass]'); log('pw toggle type ->', await A.p.getAttribute('#authPass', 'type'));
await A.p.screenshot({ path: 'a-signup.png' });
await A.p.fill('#authPass2', 'secret1'); await A.p.click('#authSubmit');
await A.p.waitForSelector('#migrateDlg[open]', { timeout: 15000 });
log('migrate text ->', await A.p.textContent('#migrateText'));
await A.p.screenshot({ path: 'a-migrate.png' });
await A.p.click('#migrateYes'); await wait(2500);
log('A sessions', await A.p.evaluate(() => S.sessions.length), 'presets', await A.p.evaluate(() => S.presets.map(p => p.name).join(',')), 'sync', await A.p.textContent('#syncStatus'));
log('A streak', await A.p.textContent('#curStreak'), await A.p.textContent('#bestStreak'));

// ---------- Device B: fresh browser, same account ----------
const B = await device('B');
await B.p.goto(URL_);
await B.p.waitForSelector('#authView:not(.hidden)');
// taken username
await B.p.click('[data-mode=signup] >> visible=true');
await B.p.fill('#authUser', 'saju_k'); await B.p.fill('#authPass', 'whatever'); await B.p.fill('#authPass2', 'whatever');
await B.p.click('#authSubmit'); await wait(1500);
log('taken ->', await B.p.textContent('#authError'));
await B.p.click('[data-mode=login] >> visible=true');
await B.p.click('[data-mode=login] >> visible=true'); await B.p.fill('#authUser', 'SAJU_K'); await B.p.fill('#authPass', 'wrongpw');
await B.p.click('#authSubmit'); await wait(1500);
log('wrong pw ->', await B.p.textContent('#authError'));
await B.p.fill('#authPass', 'secret1'); await B.p.click('#authSubmit');
await B.p.waitForSelector('#appView:not(.hidden)'); await wait(2500);
log('B sessions', await B.p.evaluate(() => S.sessions.length), 'presets', await B.p.evaluate(() => S.presets.length), 'streak', await B.p.textContent('#curStreak'), 'migrate dialog?', await B.p.evaluate(() => $('#migrateDlg').open));

// ---------- live sync: A completes a focus session ----------
await A.p.evaluate(() => { $('#nameInput').value = 'Maths'; onNameChange(); startTimer(); S.timer.endAt = Date.now() - 1; S.timer.focusStartedAt = Date.now() - 25 * 60000; });
await wait(3000);
log('B after A session', await B.p.evaluate(() => S.sessions.map(s => s.name).slice(-1)[0] + ' / ' + S.sessions.length));
// settings change on B reaches A
await closeDlg(B.p); await B.p.evaluate(() => showTab('settings')); await B.p.fill('#setGoal', '90'); await B.p.press('#setGoal', 'Tab');
await wait(2500);
log('A goal after B change', await A.p.evaluate(() => S.settings.goalMin));
log('A account label', await B.p.textContent('#acctName'));

// ---------- offline on B ----------
await B.ctx.setOffline(true); await B.p.evaluate(() => window.dispatchEvent(new Event('offline')));
await B.p.evaluate(() => { startTimer(); S.timer.endAt = Date.now() - 1; S.timer.focusStartedAt = Date.now() - 25 * 60000; });
await wait(1000);
log('B offline status', await B.p.textContent('#syncStatus'), 'B sessions', await B.p.evaluate(() => S.sessions.length), 'A sees', await A.p.evaluate(() => S.sessions.length));
await closeDlg(B.p); await B.p.evaluate(() => showTab('timer')); await B.p.screenshot({ path: 'b-offline.png' });
await B.ctx.setOffline(false); await B.p.evaluate(() => window.dispatchEvent(new Event('online')));
await wait(5000);
log('after reconnect: B status', await B.p.textContent('#syncStatus'), 'A sees', await A.p.evaluate(() => S.sessions.length));

// ---------- delete on A propagates ----------
await A.p.evaluate(() => { const s = S.sessions.find(x => x.name === 'Maths'); S.sessions = S.sessions.filter(x => x !== s); cloudRemoveSession(s); });
await wait(2500);
log('B after delete', await B.p.evaluate(() => S.sessions.length));

// ---------- security rules: other user's data ----------
const C = await device('C');
await C.p.goto(URL_); await C.p.waitForSelector('#authView:not(.hidden)');
await C.p.click('[data-mode=signup] >> visible=true');
await C.p.fill('#authUser', 'other_kid'); await C.p.fill('#authPass', 'secret9'); await C.p.fill('#authPass2', 'secret9');
await C.p.click('#authSubmit'); await C.p.waitForSelector('#appView:not(.hidden)'); await wait(1500);
const aUid = await A.p.evaluate(() => USER.uid);
log('C reads A ->', await C.p.evaluate(async uid => { try { await FB.getDoc(FB.doc(FB.db, 'users', uid)); return 'ALLOWED (bad)'; } catch (e) { return e.code; } }, aUid));
log('C writes A ->', await C.p.evaluate(async uid => { try { await FB.setDoc(FB.doc(FB.db, 'users', uid, 'months', '2026-10'), { x: 1 }); return 'ALLOWED (bad)'; } catch (e) { return e.code; } }, aUid));
log('C sessions (should be 0)', await C.p.evaluate(() => S.sessions.length));

// ---------- reload keeps login; logout ----------
B.p.on('console', m => m.type()!=='log' && console.log('B console:', m.text().slice(0,300)));
await B.p.reload(); await B.p.waitForSelector('#appView:not(.hidden)'); await wait(1500);
log('B after reload still logged in as', await B.p.evaluate(() => USER.username), 'sessions', await B.p.evaluate(() => S.sessions.length));
await B.p.evaluate(() => showTab('stats')); await B.p.click('[data-view=week]'); await B.p.screenshot({ path: 'b-stats.png' });
await B.p.evaluate(() => showTab('settings')); await B.p.screenshot({ path: 'b-settings.png', fullPage: true });

B.p.on('framenavigated', () => console.log('B navigated'));
log('B pending before logout', await B.p.evaluate(() => pendingWrites + ' ' + localOnly + ' ' + JSON.stringify(USER)));
await B.p.click('#logoutBtn'); await wait(4000);
log('B views', await B.p.evaluate(() => ['bootView','authView','appView'].map(v => v + ':' + !$('#' + v).classList.contains('hidden')).join(' ')));
await B.p.waitForSelector('#authView:not(.hidden)', { timeout: 10000 });
log('B after logout: cache keys', await B.p.evaluate(() => Object.keys(localStorage).join(',')));
await B.p.emulateMedia({ colorScheme: 'dark' }); await B.p.screenshot({ path: 'b-login-dark.png' });
log('errors', [...A.p.errs, ...B.p.errs, ...C.p.errs]);
await b.close();
