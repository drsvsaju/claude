import { b, wait, SITE } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-intro-seen', '1'); window.__w = []; });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
const p = await ctx.newPage();
await p.goto(SITE + '/index.html'); await p.waitForSelector('#authView:not(.hidden)');
await p.evaluate(() => { const ps = pushProfile; window.pushProfile = undefined; });
await p.click('#previewBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(3000);
console.log(JSON.stringify(await p.evaluate(() => {
  const g = game(), stats = computeStats(g.idx, g.streak, g.ownedCount), cl = S.game.claims;
  const missing = ACHIEVEMENTS.filter(a => !cl.achievements[a.id] && a.val(stats) >= a.goal).map(a => a.id);
  const miles = STREAK_MILES.filter(m => g.streak.longest >= m && !cl.milestones[m]);
  const goals = Object.entries(g.idx).filter(([k, d]) => d.total >= Math.max(goalFor(k), GOAL_BONUS_MIN) && !cl.goalDays[k]).map(([k]) => k);
  return { missing, miles, goals, longest: g.streak.longest, dirty: S.profileDirty };
})));
await b.close();
