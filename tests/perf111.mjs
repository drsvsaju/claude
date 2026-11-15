// Login → fully rendered, measured for one build. Usage: node perf111.mjs <page.html> [user]
// "Fully rendered" = header coins + level show their final values, presets and today's numbers are in,
// and the whole session history has loaded (firstLoadDone).
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const page = process.argv[2] || 'index.html', user = process.argv[3], LAT = +(process.env.LAT || 0);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = `http://localhost:8000/${page}?emulator=1`;
const wait = ms => new Promise(r => setTimeout(r, ms));
async function device() {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '9');
      const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); }
    // sample what the header shows every 20 ms
    window.__seen = [];
    const t0 = performance.now();
    const iv = setInterval(() => {
      const coin = document.querySelector('#coinPill [data-count]'), lv = document.querySelector('#lvChip .lvn'), app = document.getElementById('appView');
      if (!app || app.classList.contains('hidden')) return;
      window.__seen.push({ t: Math.round(performance.now() - (window.__t0 || t0)), coins: coin ? coin.textContent : '', skel: document.body.classList.contains('first-load'), lv: lv ? lv.textContent : '', full: typeof firstLoadDone !== 'undefined' && firstLoadDone, sessions: typeof S !== 'undefined' ? S.sessions.length : 0, presets: typeof S !== 'undefined' ? S.presets.length : 0, today: (document.querySelector('#todayCard, .today-card') || document.body).textContent.length });
      if (window.__seen.length > 600) clearInterval(iv);
    }, 20);
  });
  // LAT=ms simulates a real network: each Firebase SDK file and each auth/database request waits that long
  await ctx.route('https://www.gstatic.com/firebasejs/**', async r => { if (LAT) await wait(LAT * 2); r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }); });
  if (LAT) await ctx.route(/:(8080|9099)\//, async r => { await wait(LAT); r.continue().catch(() => {}); });
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  return { ctx, p: await ctx.newPage() };
}
let name = user;
if (!name) {   // create a realistic account once: ~400 sessions over a year, reminders, purchases
  name = 'perf_' + Date.now().toString(36).slice(-5);
  const D = await device();
  await D.p.goto(U); await D.p.waitForSelector('#authView:not(.hidden)');
  await D.p.click('[data-mode=signup] >> visible=true'); await D.p.fill('#authUser', name); await D.p.fill('#authPass', 'secret12'); await D.p.fill('#authPass2', 'secret12'); await D.p.click('#authSubmit');
  await D.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 30000 });
  await D.p.evaluate(async () => {
    const ss = [];
    for (let d = 365; d >= 1; d--) for (let k = 0; k < (d % 3 ? 1 : 2); k++) { const st = new Date(); st.setDate(st.getDate() - d); st.setHours(8 + k * 4, 0, 0, 0); ss.push({ id: `p${d}_${k}`, name: ['Physics', 'Maths', 'Chemistry'][d % 3], start: +st, end: +st + 50 * 6e4, duration: 50 * 6e4, planned: 50 * 6e4, preset: 'Deep Work 50/10' }); }
    S.sessions.push(...ss); cloudAddSessions(ss);
    for (let i = 0; i < 12; i++) S.reminders.push({ id: 'r' + i, title: 'Study ' + i, date: dayKey(addDays(new Date(), i)), time: '18:00', repeat: 'daily', days: [], before: 10 });
    S.settings.gamification = true; save(); pushProfile(true);
    await FB.waitForPendingWrites(FB.db);
  });
  await wait(1500);
  await D.ctx.close();
  console.log('account', name);
}
async function measure(label, D, act) {
  await D.p.evaluate(() => { window.__t0 = performance.now(); window.__seen = []; }).catch(() => {});
  const t = Date.now();
  await act();
  await D.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && S.sessions.length > 300, null, { timeout: 30000 });
  await wait(2500);   // let animations finish so the final value is known
  const seen = await D.p.evaluate(() => window.__seen);
  const last = seen.at(-1);
  const firstApp = seen[0] ? seen[0].t : -1;
  // settled = from this moment on the header never shows anything else (placeholders count as not settled)
  let k = seen.length - 1; while (k > 0 && seen[k - 1].coins === last.coins && seen[k - 1].lv === last.lv && !seen[k - 1].skel) k--;
  const headerOk = seen[k].t;
  const fullAt = (seen.find(x => x.full && x.sessions > 300) || {}).t;
  const shownCoins = [...new Set(seen.map(x => x.skel ? '(placeholder)' : x.coins))];
  console.log(`${label}: app on screen ${firstApp} ms · header settled on final (${last.coins} coins, ${last.lv}) ${headerOk} ms · everything loaded ${fullAt} ms | coin values shown on the way: ${shownCoins.slice(0, 8).join(' → ')}${shownCoins.length > 8 ? ' …' : ''}`);
  return { firstApp, headerOk, fullAt, shownCoins };
}
// 1) fresh device: log in
const A = await device();
await A.p.goto(U); await A.p.waitForSelector('#authView:not(.hidden)');
await A.p.click('[data-mode=login] >> visible=true'); await A.p.fill('#authUser', name); await A.p.fill('#authPass', 'secret12');
await measure(`${page} · log in on a new device`, A, () => A.p.click('#authSubmit'));
// 2) same device: reload (cache available)
await measure(`${page} · reload (returning visit)`, A, () => A.p.reload());
await measure(`${page} · reload again`, A, () => A.p.reload());
await A.ctx.close();
console.log('USER', name);
await b.close();
