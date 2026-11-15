// Load time and tab-switch time with a big history (3,000 sessions over 2 years), as a guest (no network in the way).
// Run before and after the code-health changes: node perf143.mjs [label]
import { chromium } from 'playwright';
const label = process.argv[2] || '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const runs = [];
for (let i = 0; i < 4; i++) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now()));
    localStorage.setItem('pomodorolist-onboarded:guest', '1');
    const now = Date.now(), sessions = [], subjects = ['Physics', 'Maths', 'Chemistry', 'English', 'Biology'];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let d = 1; d <= 730; d++) for (let k = 0; k < 4; k++) { if (rnd() < 0.05) continue; const st = now - d * 864e5 + (9 + k * 3) * 3600e3, mins = [25, 50, 90][Math.floor(rnd() * 3)];
      sessions.push({ id: 's' + d + '_' + k, name: subjects[(d + k) % 5], start: st, end: st + mins * 60000, duration: mins * 60000, planned: mins * 60000, preset: 'Classic 25/5' }); }
    localStorage.setItem('focus-app-v1', JSON.stringify({ sessions }));
    window.__perf = {};
  });
  const p = await ctx.newPage();
  const t0 = Date.now();
  await p.goto('http://localhost:8001/index.html');
  await p.waitForSelector('#authView:not(.hidden)');
  await p.click('#guestBtn');
  await p.waitForSelector('#appView:not(.hidden)');
  await p.waitForFunction(() => document.querySelector('#todayText') && S.sessions.length > 100);
  const load = Date.now() - t0;
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  const n = await p.evaluate(() => S.sessions.length);
  const tabs = await p.evaluate(() => {
    const out = {};
    for (const t of ['stats', 'quests', 'reminders', 'friends', 'clan', 'profile', 'board', 'timer', 'stats', 'timer']) { const a = performance.now(); showTab(t); out[t] = (out[t] || 0) + Math.round((performance.now() - a) * 10) / 10; }
    return out;
  });
  runs.push({ load, n, tabs });
  await ctx.close();
}
const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const tabs = Object.keys(runs[0].tabs);
console.log(`${label} sessions: ${runs[0].n}`);
console.log(`${label} load (goto → app with data), median of ${runs.length}: ${med(runs.map(r => r.load))} ms`);
console.log(`${label} tab switch (ms, median): ` + tabs.map(t => `${t} ${med(runs.map(r => r.tabs[t]))}`).join(' · '));
await b.close();
