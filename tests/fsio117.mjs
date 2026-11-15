// Firestore reads/writes for one user through a typical first day: sign-up + first load, three focus sessions, a look at
// every tab, the 1.15 features (where the build has them), a reload (cache-first) and a minute idle.
// Usage: node fsio116.mjs count116.html "1.16"   |   node fsio116.mjs count115.html "1.15"
import { chromium } from 'playwright';
import fs from 'fs';
const page = process.argv[2] || 'count.html', label = process.argv[3] || page;
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); localStorage.setItem('pomodorolist-intro-seen', '1'); });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
const user = 'io_' + Date.now().toString(36).slice(-5);
await p.goto('http://localhost:8000/' + page + '?emulator=1'); await p.waitForSelector('#authView:not(.hidden)');
await p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await p.click('[data-mode=signup] >> visible=true'); await p.fill('#authUser', user); await p.fill('#authPass', 'secret12'); await p.fill('#authPass2', 'secret12'); await p.click('#authSubmit');
await p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && CLAN.started, null, { timeout: 20000 });
await wait(8000);
await p.evaluate(() => { if ($('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
await wait(2000);
const rows = []; let last = { reads: 0, writes: 0 };
const snap = async name => { const c = await p.evaluate(() => ({ reads: __fs.reads, writes: __fs.writes })); rows.push([name, c.reads - last.reads, c.writes - last.writes]); last = c; };
await snap('sign-up + first load + tutorial');
for (let i = 0; i < 3; i++) {
  await p.evaluate(m => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = m * 60000; t.focusStartedAt = Date.now(); t.endAt = Date.now() - 1; }, 25);
  await wait(3000); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
}
await wait(15000);
await snap('3 focus sessions (+15 s for the pushes)');
const has115 = await p.evaluate(() => typeof gardenPlant === 'function');
for (const t of ['stats', 'quests', 'reminders', 'friends', 'clan', 'board', 'shop', 'profile', 'settings', ...(has115 ? ['garden', 'room'] : []), 'timer']) { await p.evaluate(t => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab(t); }, t); await wait(900); }
await wait(6000);
await snap('a look at every tab');
if (has115) {
  await p.evaluate(() => { gardenPlant(0, 'tomato'); const d = addDeck('Physics', 'Physics'); addCard(d.id, 'What is torque?', 'r × F'); addCard(d.id, 'SI unit of power', 'watt'); savePlan([{ name: 'Physics', hrs: 6 }, { name: 'Maths', hrs: 8 }]); showTab('reminders'); S.ui.remView = 'cards'; renderCards(); });
  await wait(1200);
  await p.evaluate(() => { startReview(S.decks[0].id); }); await wait(600);
  await p.evaluate(() => { $('#fcDlg [data-cdflip]').click(); }); await wait(500);
  await p.evaluate(() => { $('#fcDlg [data-cdgrade="good"]').click(); }); await wait(500);
  await p.evaluate(() => { closeReview(); showTab('garden'); });
  await wait(15000);
  await snap('garden planting, a deck + 2 cards + 1 review grade, a 2-subject plan (+15 s)');
}
const has116 = await p.evaluate(() => typeof gardenBuyLook === 'function');
if (has116) {
  // 1.16: the looks section, the pets dialog, a look bought (produce from harvests the user already made), the four boards
  await p.evaluate(() => { const now = Date.now(); for (let i = 0; i < 3; i++) S.plants.push({ id: 'fh' + i, v: 1, sp: 'tomato', plot: -1, seed: '', at: now - 9e6 - i, sk: 0, w: { x: 90 }, fin: 'x', fd: 90, h: now - 8e6 + i, y: 20, m: '', kg: .2, u: now }); GD = null; G = null; save(); S.ui.gardenView = 'decor'; showTab('garden'); });
  await wait(1200);
  await p.evaluate(() => { openPetsDlg(); }); await wait(600);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); gardenBuy('av_pumpkin'); });
  await wait(1200);
  for (const [sc, pe] of [['friends', 'produce'], ['friends', 'harvests'], ['global', 'produce'], ['global', 'harvests']]) { await p.evaluate(([s, pe]) => { S.ui.lbScope = s; S.ui.lbPeriod = pe; showTab('board'); renderBoard(); }, [sc, pe]); await wait(1500); }
  await p.evaluate(() => showTab('timer'));   // back where the 1.15 scenario reloads from, so the reload step compares like with like
  await wait(15000);
  await snap('1.16: looks section, pets dialog, a look bought, the four garden boards (+15 s)');
}
const has117 = await p.evaluate(() => typeof gardenSell === 'function');
if (has117) {
  // 1.17: the Harvests tab, a harvest sold, a task claimed, the garden tour replayed, an XP boost bought, the peek card, the reward dialog
  await p.evaluate(() => { const now = Date.now(); S.plants.push({ id: 'sv1', v: 1, sp: 'tomato', plot: -1, seed: '', at: now - 9e6, sk: 0, w: { x: 70 }, fin: 'x', fd: 25, h: now + 1000, y: 4, m: '', kg: .09, u: now }); GD = null; S.ui.gardenView = 'harvests'; showTab('garden'); renderGarden(); });
  await wait(800);
  await p.evaluate(() => { gardenSell('sv1'); const t = gardenTasks().find(x => x.done && !x.claimed); if (t) gardenClaimTask(t.i); });
  await wait(800);
  await p.evaluate(() => { gardenTour(0); }); await wait(500); await p.evaluate(() => { gardenTour(3); }); await wait(500); await p.evaluate(() => { gardenTourEnd(); });
  await p.evaluate(() => { S.game.purchases.pb1 = { item: 'gx_boost15', price: 0, at: Date.now() - 1000 }; G = null; S.ui.shopCat = 'boost'; showTab('shop'); renderShop(); });
  await wait(600);
  await p.evaluate(() => { showTab('timer'); openLoginDlg(); }); await wait(500); await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
  await wait(15000);
  await snap('1.17: Harvests tab, a sale, a task claim, the tour, the boost shop, the reward dialog (+15 s)');
}
await p.reload(); await p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && CLAN.started, null, { timeout: 20000 }); await wait(8000);
await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
last = { reads: 0, writes: 0 };   // the counters start again with the new page
await snap('reload (cache-first second load, +8 s)');
await wait(60000);
await snap('one minute idle on the Timer tab');
const by = await p.evaluate(() => Object.entries(__fs.by).sort((a, b) => (b[1].r + b[1].w) - (a[1].r + a[1].w)).slice(0, 14));
const tot = rows.reduce((a, r) => [a[0] + r[1], a[1] + r[2]], [0, 0]);
console.log(`${label} — Firestore operations for one new user (emulator, same scenario on both builds)`);
console.log('| step | reads | writes |\n|---|---:|---:|');
for (const r of rows) console.log(`| ${r[0]} | ${r[1]} | ${r[2]} |`);
console.log(`| **total** | **${tot[0]}** | **${tot[1]}** |`);
console.log('\ntop call sites (reads r / writes w / calls n): ' + by.map(([k, v]) => `${k} r${v.r} w${v.w} n${v.n}`).join(' · '));
console.log('errors', errs);
await b.close();
