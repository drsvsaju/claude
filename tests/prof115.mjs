// Where the first load goes with a big history (guest, 2,772 sessions + 1,200 cards + 16 plants), on a ×4 slower CPU.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const mig of [false, true]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(mig => {
    localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9');
    const now = Date.now(), sessions = [], subjects = ['Physics', 'Maths', 'Chemistry', 'English', 'Biology'];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let d = 1; d <= 730; d++) for (let k = 0; k < 4; k++) { if (rnd() < 0.05) continue; const st = now - d * 864e5 + (9 + k * 3) * 3600e3, mins = [25, 50, 90][Math.floor(rnd() * 3)]; sessions.push({ id: 's' + d + '_' + k, name: subjects[(d + k) % 5], start: st, end: st + mins * 60000, duration: mins * 60000, planned: mins * 60000, preset: 'Classic 25/5' }); }
    const cards = []; for (let k = 0; k < 1200; k++) cards.push({ id: 'c' + k, v: 1, deck: 'd1', f: 'Q' + k, b: 'A' + k, at: now, u: now, due: '', ivl: 0, ease: 2.5, reps: 0 });
    const plants = mig ? [{ id: 'mig1', v: 1, sum: 1, at: now - 864e5, grown: 50, golden: 3, ripe: 20, wilted: 2, y: 40, xp: 345, u: now - 864e5 }] : [];
    localStorage.setItem('focus-app-v1', JSON.stringify({ sessions, cards, decks: [{ id: 'd1', v: 1, name: 'D', at: now, u: now }], plants, gbuys: mig ? [{ id: 'st1', v: 1, item: 'seed_tomato', price: 0, at: now, slot: '', u: now }] : [] }));
    window.__t = {}; const mark = (k, f) => { const a = performance.now(); const r = f(); window.__t[k] = (window.__t[k] || 0) + Math.round(performance.now() - a); return r; };
    window.__mark = mark;
  }, mig);
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)'); const tAuth = Date.now() - t0;
  await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await p.waitForFunction(() => document.querySelector('#todayText') && S.sessions.length > 100); const tApp = Date.now() - t0;
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const t = {}; let a = performance.now(); gardenStats(gardenItems(0, Date.now())); t.oldGardenStats = Math.round(performance.now() - a); a = performance.now(); GD = null; computeGarden(); t.computeGarden = Math.round(performance.now() - a); a = performance.now(); G = null; game(); t.game = Math.round(performance.now() - a); a = performance.now(); renderCards(); t.renderCards = Math.round(performance.now() - a); a = performance.now(); planWeek(new Date()); t.planWeek = Math.round(performance.now() - a); a = performance.now(); dueCards(); t.dueCards = Math.round(performance.now() - a); a = performance.now(); JSON.stringify(profileFromState()); t.profileJSON = Math.round(performance.now() - a); a = performance.now(); saveLocal(); t.saveLocal = Math.round(performance.now() - a); return { ...t, migDone: !!gardenMig(), nav: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd) }; });
  console.log(`migration ${mig ? 'already done' : 'runs at load'}: welcome page ${tAuth} ms · app with data ${tApp} ms · DOMContentLoaded ${r.nav} ms ·`, JSON.stringify(r));
  await ctx.close();
}
await b.close();
