import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
// a browser that has used Pomodorolist before (old tour flag, older version seen, rewards seen)
async function usedBrowser(name, w = 1180, h = 860) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '1.7'); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
  return { ctx, p };
}
const sfx = Date.now().toString(36).slice(-5);
const A = await usedBrowser('A');
await A.p.goto(U + '?emulator=1'); await A.p.waitForSelector('#authView:not(.hidden)');
await A.p.click('[data-mode=signup] >> visible=true'); await A.p.fill('#authUser', 'nu_' + sfx); await A.p.fill('#authPass', 'secret1'); await A.p.fill('#authPass2', 'secret1'); await A.p.click('#authSubmit');
const shown = await A.p.waitForSelector('#tutDlg[open]', { timeout: 30000 }).then(() => true, () => false);
log('new account on a used browser → tutorial:', shown, '| news card:', await A.p.evaluate(() => !!$('#newsSlot .news-card')), '| other dialogs:', await A.p.evaluate(() => $$('dialog[open]').map(d => d.id).join(',')));
await A.p.screenshot({ path: 'v12b-newacct.png' });
await A.p.click('#tutSkip'); await wait(2500);
log('saved:', await A.p.evaluate(async () => (await FB.getDoc(FB.doc(FB.db, 'users', USER.uid))).data().onboarded));
// log out → second new account on the same browser also gets it
await A.p.evaluate(() => logout()).catch(() => {}); await A.p.waitForSelector('#authView:not(.hidden)', { timeout: 15000 });
await A.p.click('[data-mode=signup] >> visible=true'); await A.p.fill('#authUser', 'nu2_' + sfx); await A.p.fill('#authPass', 'secret1'); await A.p.fill('#authPass2', 'secret1'); await A.p.click('#authSubmit');
log('second new account, same browser → tutorial:', await A.p.waitForSelector('#tutDlg[open]', { timeout: 30000 }).then(() => true, () => false));
await A.p.click('#tutSkip'); await wait(1500);
await A.p.evaluate(() => logout()).catch(() => {}); await A.p.waitForSelector('#authView:not(.hidden)', { timeout: 15000 });
// log back into the first account: no tutorial again
await A.p.click('[data-mode=login] >> visible=true'); await A.p.fill('#authUser', 'nu_' + sfx); await A.p.fill('#authPass', 'secret1'); await A.p.click('#authSubmit');
await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(3500);
log('log back in → tutorial:', await A.p.evaluate(() => $('#tutDlg').open));
// an older account that never saw the tutorial (simulated creation date 30 days ago)
log('older account isNewUser:', await A.p.evaluate(() => { const real = FB.auth; FB.auth = { currentUser: { metadata: { creationTime: new Date(Date.now() - 30 * 864e5).toUTCString() } } }; const r = isNewUser(); FB.auth = real; return r; }), '| brand-new:', await A.p.evaluate(() => { const real = FB.auth; FB.auth = { currentUser: { metadata: { creationTime: new Date().toUTCString() } } }; const r = isNewUser(); FB.auth = real; return r; }));
// phone, used browser, guest with no data
const G = await usedBrowser('G', 390, 844);
await G.p.goto(U); await G.p.click('#guestBtn'); await G.p.waitForSelector('#appView:not(.hidden)');
log('new guest on a used browser → tutorial:', await G.p.waitForSelector('#tutDlg[open]', { timeout: 8000 }).then(() => true, () => false));
log('errors', errs);
await b.close();
