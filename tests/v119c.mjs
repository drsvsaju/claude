// v1.19 demo: the preview shows ranks and the streak boards with sample data (friends' seasons and streaks, Justin's
// broken streak off the Current board), badges next to names, the Timer line and the Rank card — and writes nothing.
import { b, wait, log, check, errs, failCount, SITE } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const OUT = new URL('../v119/', import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-intro-seen', '1'); });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
const net = []; await ctx.route(/googleapis\.com|firebaseio\.com/, r => { net.push(r.request().url().slice(0, 90)); r.abort(); });
const p = await ctx.newPage(); p.on('pageerror', e => errs.push('demo: ' + e.message));
const ev = (f, a) => p.evaluate(f, a);
await p.goto(SITE + '/index.html'); await p.waitForSelector('#authView:not(.hidden)');
await p.click('#previewBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(3000);
await ev(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.__w = [];
  for (const k of ['setDoc', 'updateDoc', 'deleteDoc', 'addDoc', 'runTransaction']) { const f = FB[k]; FB[k] = (...a) => { window.__w.push(k + ' ' + ((a[0] && a[0].path) || '')); return f(...a); }; }
  const wb = FB.writeBatch; FB.writeBatch = (...a) => { const x = wb(...a), c = x.commit.bind(x); x.commit = () => { window.__w.push('batch'); return c(); }; return x; }; });
const boards = await ev(async () => {
  const out = {};
  for (const [scope, period] of [['friends', 'season'], ['global', 'season'], ['friends', 'streak'], ['friends', 'best']]) {
    SOC.lb = {}; const r = await loadLeaderboard(scope, period, true); out[scope + ':' + period] = r.error || r.rows.map(x => x.username + ':' + x.minutes).join();
  }
  return out;
});
check('Demo Ranks board (friends and global): the sample friends by this season\'s hours', /Princess_cupcake/.test(boards['friends:season']) && /James/.test(boards['friends:season']) && /James/.test(boards['global:season']), JSON.stringify(boards));
check('Demo streak boards: Justin\'s broken streak is off Current but on Best', !/Justin/.test(boards['friends:streak']) && /Justin/.test(boards['friends:best']) && /Princess_cupcake:52/.test(boards['friends:streak']), JSON.stringify(boards));
const ui = await ev(async () => {
  S.ui.lbScope = 'friends'; S.ui.lbPeriod = 'season'; SOC.lb = {}; showTab('board'); await new Promise(r => setTimeout(r, 1500)); renderBoard(true); await new Promise(r => setTimeout(r, 500));
  const badges = $$('#boardBody .rk-b').length, kinds = $$('#lbKind button').map(x => x.textContent.trim()).join();
  return { badges, kinds };
});
check('The demo leaderboard has Ranks and Streaks, and rank badges next to the names', ui.badges >= 3 && /Ranks/.test(ui.kinds) && /Streaks/.test(ui.kinds), JSON.stringify(ui));
await p.screenshot({ path: OUT + 'demo-ranks.png' });
await ev(async () => { S.ui.lbPeriod = 'streak'; SOC.lb = {}; renderBoard(); await new Promise(r => setTimeout(r, 1500)); renderBoard(true); });
await wait(500); await p.screenshot({ path: OUT + 'demo-streaks.png' });
const me = await ev(async () => { showTab('timer'); renderToday(); const line = $('#rankLine').textContent.replace(/\s+/g, ' '); showTab('profile'); renderProgress(); await new Promise(r => setTimeout(r, 300)); return { line, card: !!$('#rankCard'), friendBadge: (showTab('friends'), renderFriends(), $$('#friendsBody .person .rk-b').length) }; });
check('Demo: the Timer rank line, the Rank card on the profile and badges on the friend rows', /this season/.test(me.line) && me.card && me.friendBadge >= 2, JSON.stringify(me));
await wait(3000);
const after = await ev(() => ({ w: window.__w, ls: Object.keys(localStorage).filter(k => /focus-app|pomodorolist-state/.test(k)).length }));
check('The demo wrote nothing (no write calls, no Firebase request, nothing stored)', after.w.length === 0 && net.length === 0 && after.ls === 0, JSON.stringify({ w: after.w, net }));
await ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
