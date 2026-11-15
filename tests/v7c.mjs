import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html?emulator=1';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [], denied = [];
async function device(name, { w = 1100, login = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addInitScript(login => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); if (!login) { const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); } }, login);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (/permission|denied|Sync error|Missing or insufficient/i.test(m.text())) denied.push(name + ': ' + m.text().slice(0, 200)); });
  p.on('dialog', d => d.accept());
  return { ctx, p, name };
}
const close = d => d.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
const loaded = d => d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 20000 });
async function signup(d, user) {
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.click('[data-mode=signup] >> visible=true'); await d.p.fill('#authUser', user); await d.p.fill('#authPass', 'secret1'); await d.p.fill('#authPass2', 'secret1'); await d.p.click('#authSubmit');
  await loaded(d);
}
async function sessions(d, n, min) {
  for (let i = 0; i < n; i++) {
    await d.p.evaluate(m => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); S.timer.planned = m * 60000; S.timer.focusStartedAt = Date.now() - m * 60000; S.timer.endAt = Date.now() - 1; }, min);
    await wait(700);
  }
}
const sfx = Date.now().toString(36).slice(-4);
const A = await device('A', { login: true }), B = await device('B');
await signup(A, 'sq_a' + sfx); await signup(B, 'sq_b' + sfx);
await wait(2500);
// a brand-new account sees the tutorial first; the daily reward follows when it closes
log('A tutorial first:', await A.p.evaluate(() => $('#tutDlg').open));
if (await A.p.evaluate(() => $('#tutDlg').open)) { await A.p.click('#tutSkip'); await wait(1200); }
if (await B.p.evaluate(() => $('#tutDlg').open)) { await B.p.click('#tutSkip'); await wait(300); }
// ---- daily login with the server clock ----
log('A login popup:', await A.p.evaluate(() => $('#loginDlg').open));
await A.p.click('#loginClaim'); await wait(2000);
log('A claimed:', await A.p.evaluate(() => JSON.stringify(S.game.claims.login)), '| clock doc:', await A.p.evaluate(async () => { const s = await FB.getDoc(FB.doc(FB.db, 'users', USER.uid, 'meta', 'clock')); return s.exists() && typeof s.data().t.toMillis(); }));
log('wrong device clock refused:', await A.p.evaluate(async () => {
  const k = dayKey(new Date()); delete S.game.claims.login[k]; G = null;
  const R = Date, fake = R.now() + 2 * 864e5; globalThis.Date = class extends R { constructor(...a) { super(...(a.length ? a : [fake])); } static now() { return fake; } };
  try { await claimLogin(); } finally { globalThis.Date = R; }
  const refused = !Object.keys(S.game.claims.login).length;
  S.game.claims.login[k] = R.now(); G = null; save(); return refused;
}));
// second device of A sees today claimed
const A2 = await device('A2', { login: true });
await A2.p.goto(U); await A2.p.waitForSelector('#authView:not(.hidden)');
await A2.p.click('[data-mode=login] >> visible=true'); await A2.p.fill('#authUser', 'sq_a' + sfx); await A2.p.fill('#authPass', 'secret1'); await A2.p.click('#authSubmit'); await loaded(A2); await wait(3500);
log('A2 (same account) popup:', await A2.p.evaluate(() => $('#loginDlg').open), '| claimed:', await A2.p.evaluate(() => loginToday().claimed));
await A2.ctx.close();
// ---- friends + squad ----
await close(A); await close(B);
await A.p.evaluate(n => sendRequest(n), 'sq_b' + sfx); await wait(1500);
await B.p.evaluate(() => acceptRequest(incoming()[0].id)); await wait(2000);
log('friends:', await A.p.evaluate(() => friendsList().length), await B.p.evaluate(() => friendsList().length));
await A.p.evaluate(() => showTab('quests')); await wait(500);
await A.p.click('#squadEdit'); await wait(200);
await A.p.click('#squadPick input'); await A.p.click('#squadSave'); await wait(1500);
log('A squad:', await A.p.evaluate(() => JSON.stringify(S.squad.map(m => m.name)) + ' mode ' + bossMode()));
await sessions(B, 3, 60); await wait(1500);
await B.p.evaluate(() => { publishPublic(); }); await wait(2500);
await sessions(A, 2, 45); await wait(1000);
await A.p.evaluate(() => loadSquadStats(true)); await wait(1500);
const st = await A.p.evaluate(() => { const s = bossBattle(bossView()); return { hp: s.hp, dmg: s.rawDmg, members: s.members.map(m => `${m.me ? 'me' : m.name}:${m.min}`), coins: s.coins, solo: soloHP() }; });
log('squad battle:', JSON.stringify(st));
await A.p.evaluate(() => showTab('quests')); await wait(1200);
await A.p.screenshot({ path: 'v7c-squad.png' });
log('contribution rows:', await A.p.evaluate(() => $$('.squad-list li').map(li => li.innerText.replace(/\s+/g, ' ').trim()).join(' | ')));
// finish the boss together
const need = st.hp - st.dmg;
await sessions(B, Math.ceil(need / 90) + 1, 90); await B.p.evaluate(() => publishPublic()); await wait(2500);
await A.p.evaluate(() => loadSquadStats(true)); await wait(2000);
log('squad defeat (A):', await A.p.evaluate(() => JSON.stringify(S.game.trophies[dayKey(weekMonday())])));
log('B solo view unaffected:', await B.p.evaluate(() => { const s = bossBattle(bossView()); return s.mode + ' ' + s.hp; }));
// ---- aura seen by a friend; sync of new data ----
await A.p.evaluate(() => { S.exams.push({ id: 'xs', name: 'NEET', date: dayKey(addDays(new Date(), 30)), added: Date.now() }); S.parked.push({ id: 'ps', text: 'buy pens', at: Date.now(), done: false }); addRevision('Optics'); save(); });
await wait(2500);
log('stored in users/{uid}:', await A.p.evaluate(async () => { const d = (await FB.getDoc(userRef())).data(); return ['exams', 'parked', 'revisions', 'abandoned', 'squad'].map(k => k + '=' + (d[k] || []).length).join(' ') + ' trophies=' + Object.keys(d.game.trophies).length + ' login=' + Object.keys(d.game.claims.login).length; }));
log('B reads A profile streak (aura source):', await B.p.evaluate(async () => { const u = otherUid(friendsList()[0]); const p = await getPublic('publicProfiles', u, 0); return `streak ${p.streak} → aura ${(auraFor(profStreak(p)) || { id: 'none' }).id}`; }));
log('errors', errs, '| denied', denied);
await b.close();
