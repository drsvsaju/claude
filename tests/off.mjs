import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext(); await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); { const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); } });
let blockSdk = false;
await ctx.route('https://www.gstatic.com/firebasejs/**', r => blockSdk ? r.abort() : r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
const wait = ms => new Promise(r => setTimeout(r, ms));
const done = () => p.evaluate(() => { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); S.timer.endAt = Date.now() - 1; S.timer.focusStartedAt = Date.now() - 25 * 60000; });
const U = 'http://localhost:8000/index.html?emulator=1';
await p.goto(U); await p.waitForSelector('#authView:not(.hidden)');
await p.click('[data-mode=login] >> visible=true'); await p.fill('#authUser', 'saju_k'); await p.fill('#authPass', 'secret1'); await p.click('#authSubmit');
await p.waitForSelector('#appView:not(.hidden)'); await wait(2000);
const before = await p.evaluate(() => S.sessions.length);
// 1) Reopen while the SDK can't load at all
blockSdk = true; await p.reload(); await p.waitForSelector('#appView:not(.hidden)'); await wait(500);
console.log('SDK blocked -> localOnly', await p.evaluate(() => localOnly), 'status', await p.textContent('#syncStatus'), 'sessions', await p.evaluate(() => S.sessions.length));
await done(); await wait(300);
console.log('pending queued', await p.evaluate(() => S.pendingSessions.length));
blockSdk = false; await p.reload(); await p.waitForSelector('#appView:not(.hidden)'); await wait(3000);
console.log('back online -> pending', await p.evaluate(() => S.pendingSessions.length), 'sessions', await p.evaluate(() => S.sessions.length), 'expected', before + 1, 'status', await p.textContent('#syncStatus'));
// 2) Reopen with no network but SDK cached: Firestore offline persistence
let cut = true; await ctx.route(/127\.0\.0\.1:(8080|9099)/, r => cut ? r.abort() : r.continue()); await p.reload(); await p.waitForSelector('#appView:not(.hidden)'); await wait(1500);
console.log('offline reopen sessions', await p.evaluate(() => S.sessions.length), 'status', await p.textContent('#syncStatus'));
await done(); await wait(500);
console.log('after logging while cut: local', await p.evaluate(() => S.sessions.length), 'pendingWrites', await p.evaluate(() => pendingWrites), 'status', await p.textContent('#syncStatus'));
cut = false; await ctx.unroute(/127\.0\.0\.1:(8080|9099)/); for (let i=0;i<20;i++){ await wait(5000); const st = await p.textContent('#syncStatus'); if (st.includes('Synced')) { console.log('synced after', (i+1)*5, 's'); break; } }
const cnt = await p.evaluate(async () => (await FB.getDocsFromServer(FB.collection(FB.db, 'users', USER.uid, 'months'))).docs.reduce((a, d) => a + d.data().sessions.length, 0));
console.log('server has', cnt, 'expected', before + 2, 'status', await p.textContent('#syncStatus'));
console.log('errors', errs);
await b.close();
