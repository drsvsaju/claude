// v1.12 demo preview: the new boss page, questline and bag with sample data — and still nothing is written anywhere.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
const SHOTS = process.argv.includes('shots');
for (const [w, h] of [[1280, 860], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  await ctx.addInitScript(() => { localStorage.setItem('focus-app-v1', JSON.stringify({ sessions: [{ id: 'mine', name: 'My own', start: 1, end: 2, duration: 1, planned: 1, preset: '' }] })); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(), ev = (f, a) => p.evaluate(f, a);
  p.on('pageerror', e => errs.push(w + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(w + ' ' + m.type() + ': ' + m.text().slice(0, 160)); });
  const net = []; p.on('request', r => { if (/:8080|:9099|googleapis\.com\/(google\.firestore|identitytoolkit)|firestore\.googleapis/.test(r.url())) net.push(r.method() + ' ' + r.url().slice(0, 80)); });
  await p.goto('http://localhost:8000/index.html?emulator=1'); await p.waitForSelector('#authView:not(.hidden)'); await wait(700);
  const before = await ev(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))));
  await p.click('#previewBtn');
  await p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 15000 }); await wait(2500);
  await ev(() => document.querySelectorAll('dialog[open]:not(#pvDlg)').forEach(x => x.close()));
  await ev(() => { S.ui.questView = 'boss'; showTab('quests'); }); await wait(1600);
  const boss = await ev(() => ({ view: bossView(), arena: !!$('#arena #bossArt svg'), squad: $$('.squad-list.portraits li').map(li => li.textContent.replace(/\s+/g, ' ').trim()).join(' | '), log: $$('.blog li').map(li => li.textContent.replace(/\s+/g, ' ').trim()).slice(0, 4).join(' | '),
    hall: $$('.hall-card.won').length, mastered: $$('.hall-card .mastered-badge.on').length, claim: $$('[data-bclaim]').length, next: ($('.nb-name') || {}).textContent }));
  check(`${w}px: boss page — squad arena with portraits, battle log with friends’ hits, Trophy Hall (won + mastered), rewards to claim`, boss.view === 'squad' && boss.arena && /James/.test(boss.squad) && /siverieg/.test(boss.squad) && /@James|@siverieg/.test(boss.log) && boss.hall >= 3 && boss.mastered >= 1 && boss.claim >= 1, JSON.stringify(boss));
  if (SHOTS) await p.screenshot({ path: `v112d-boss-${w}.png`, fullPage: true });
  await p.click('[data-bmode="solo"]'); await wait(500);
  const solo = await ev(() => ({ view: bossView(), active: $('#bossModeSeg .active').dataset.bmode }));
  check(`${w}px: Solo/Squad switch works in the preview (view only, nothing saved)`, solo.view === 'solo' && solo.active === 'solo');
  await ev(() => { S.ui.questView = 'quest'; renderQuests(); loadEventBoard(); }); await wait(1500);
  const q = await ev(() => ({ ev: (currentEvent() || {}).id, nodes: $$('.ql-path .qn').length, claimed: $$('.ql-path .qn.claimed').length, board: $$('.evb-list li').length, hero: !!$('.ql-hero .ql-pomeo svg') }));
  check(`${w}px: questline — Pomeo in costume, quest path, claimed quests, friends’ event board`, q.hero && q.nodes === (q.ev ? 9 : 0) && (!q.ev || (q.board >= 3 && (q.ev !== 'hw26' || q.claimed === 2))), JSON.stringify(q));
  if (SHOTS) await p.screenshot({ path: `v112d-quest-${w}.png`, fullPage: true });
  await ev(() => showTab('bag')); await wait(700);
  const bag = await ev(() => ({ items: $$('#bagList .bag-item[data-bid]').length, lo: $$('.lo').length, look: !!$('#bagLook .look-badge svg'), aura: !!$('#lvChip [class*="aura-x-"]'), grad: !!$('#lvChip .ncg') }));
  check(`${w}px: bag — sample items, 2 loadouts, live look; header shows the special aura and gradient name`, bag.items >= 8 && bag.lo === 2 && bag.look && bag.aura && bag.grad, JSON.stringify(bag));
  if (SHOTS) await p.screenshot({ path: `v112d-bag-${w}.png`, fullPage: true });
  // every write action asks to create an account instead
  const blocked = [];
  for (const sel of ['[data-bequip]', '[data-lo-apply]', '#loNew', '[data-lo-del]']) {
    const el = await p.$(sel); if (!el) { blocked.push(sel + ':missing'); continue; }
    await el.click(); await wait(150);
    blocked.push(sel + ':' + (await ev(() => $('#pvDlg').open)));
    await ev(() => $('#pvDlg').close());
  }
  await ev(() => { S.ui.questView = 'boss'; S.settings.bossMode = 'squad'; showTab('quests'); }); await wait(600);
  for (const sel of ['[data-bclaim]', '#squadEdit']) { const el = await p.$(sel); if (!el) { blocked.push(sel + ':missing'); continue; } await el.click(); await wait(150); blocked.push(sel + ':' + (await ev(() => $('#pvDlg').open))); await ev(() => $('#pvDlg').close()); }
  check(`${w}px: claiming, equipping and loadouts open the “create an account” prompt`, blocked.every(x => x.endsWith(':true')), blocked.join(' '));
  await ev(async () => { bagEquip(Object.keys(S.game.grants)[0]); save(); pushProfile(true); publishPublic(true); });
  await wait(1500);
  const after = await ev(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))));
  check(`${w}px: nothing written — no Firestore/Auth traffic, browser storage unchanged`, !net.length && before === after, `requests ${net.length} ${net.slice(0, 2).join(' ')}`);
  await ctx.close();
}
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
process.exit(fails ? 1 : 0);   // v2.0: a failing check fails the suite (it used to exit 0)
