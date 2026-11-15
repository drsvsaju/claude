// v1.18 demo: the landing page and the read-only preview show the v1.18 features with sample data — the Friends tab
// (Friends · Challenges, and Study sessions as its own section since v1.19.1) with an active study session, the new Pomeo, streak milestone rewards, the
// new achievements, the clan-session milestones — and the preview never writes to Firestore or browser storage.
import { b, wait, log, check, errs, failCount, SITE } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const OUT = new URL('../v118/', import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-intro-seen', '1'); });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
// any request to a real Firebase backend from the demo counts as a write attempt
const net = []; await ctx.route(/googleapis\.com|firebaseio\.com/, r => { net.push(r.request().method() + ' ' + r.request().url().slice(0, 90)); r.abort(); });
const p = await ctx.newPage(); p.on('pageerror', e => errs.push('demo: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel/i.test(m.text())) errs.push('demo console: ' + m.text().slice(0, 160)); });
const ev = (f, a) => p.evaluate(f, a);
await p.goto(SITE + '/index.html'); await p.waitForSelector('#authView:not(.hidden)');
// ---------- the landing page ----------
const lp = await ev(() => ({ feats: $$('#lpFeats .lp-feat h3').map(h => h.textContent), chips: $('.pk-chips').textContent, pomeo: /#f0735f/.test($('#lpPomeo').innerHTML), sess: !!$('#lpFeats .fx-sess'), miles: $$('#lpFeats .fx-miles span').length }));
check('Landing page: feature cards for study sessions and streak milestones (with a mini lobby and milestone tiles), the chips mention them, and the new Pomeo greets', lp.feats.includes('Study sessions with friends') && lp.feats.includes('Streak milestones') && lp.sess && lp.miles === 4 && /Study sessions/.test(lp.chips) && /Streak rewards/.test(lp.chips) && lp.pomeo, JSON.stringify(lp));
await p.evaluate(() => document.getElementById('lpFeatures').scrollIntoView()); await wait(600);
await p.screenshot({ path: OUT + 'demo-landing-cards.png' });
// ---------- the preview ----------
const ls0 = await ev(() => Object.keys(localStorage).sort().join());
await p.click('#previewBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(3000);
await ev(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.__w = [];
  for (const k of ['setDoc', 'updateDoc', 'deleteDoc', 'addDoc', 'runTransaction']) { const f = FB[k]; FB[k] = (...a) => { window.__w.push(k + ' ' + ((a[0] && a[0].path) || '')); return f(...a); }; }
  const wb = FB.writeBatch; FB.writeBatch = (...a) => { const x = wb(...a), c = x.commit.bind(x); x.commit = () => { window.__w.push('batch'); return c(); }; return x; }; });
// Friends tab: Friends · Challenges; Study sessions: its own section (v1.19.1)
const fr = await ev(async () => {
  showTab('friends'); await new Promise(r => setTimeout(r, 1200));
  const views = $$('#friendsSeg [data-view]').filter(x => !x.classList.contains('hidden')).map(x => x.textContent.trim());
  const now = $$('#friendsBody .person').map(x => x.textContent.replace(/\s+/g, ' ')).find(t => /Studying now/.test(t)) || '';
  showTab('sessions'); await new Promise(r => setTimeout(r, 1200));
  return { views, now, sess: $('#sessBody').textContent.replace(/\s+/g, ' ').slice(0, 1400), nav: !!$('#tabs [data-tab=sessions]:not(.hidden)'), planned: /Physics problem set/.test($('#sessUpcoming') ? $('#sessUpcoming').textContent : '') };
});
check('Friends tab: Friends · Challenges (Study sessions moved to the sidebar); James shows "Studying now"', fr.views.length === 2 && /Friends/.test(fr.views.join()) && !/Study sessions/.test(fr.views.join()) && /Challenges/.test(fr.views.join()) && /Studying now/.test(fr.now) && fr.nav, JSON.stringify({ views: fr.views, now: fr.now.slice(0, 120) }));
check('Study sessions section: James\'s live "Organic chemistry sprint" (public) and the friends-only "Mock test marathon" are live; Justin\'s planned "Physics problem set" is under Upcoming', /Organic chemistry sprint/.test(fr.sess) && /Mock test marathon/.test(fr.sess) && fr.planned, fr.sess.slice(0, 400));
await p.screenshot({ path: OUT + 'demo-sessions.png' });
// a click on Join shows the preview prompt and writes nothing
const join = await ev(async () => { const btn = [...document.querySelectorAll('#sessBody button')].find(x => /^(Join|Ask to join)/.test(x.textContent.trim())); if (!btn) return 'no button'; btn.click(); await new Promise(r => setTimeout(r, 500)); const pv = !!document.querySelector('dialog[open] #pvWhy') || !!document.querySelector('#pvDlg[open]'); document.querySelectorAll('dialog[open]').forEach(d => d.close()); return { pv, inLive: inLive() }; });
check('Joining in the demo shows the "this is a preview" prompt and joins nothing', join.pv && !join.inLive, JSON.stringify(join));
// profile: streak milestones, achievements, studying together, Pomeo
const pr = await ev(async () => {
  showTab('profile'); renderProfile(); await new Promise(r => setTimeout(r, 600));
  const sm = $('#streakMiles'), gc = $('#progressView .group-card'), cl = S.game.claims.achievements;
  return { sm: sm ? sm.textContent.replace(/\s+/g, ' ').slice(0, 260) : '', done: $$('#streakMiles .sm-row.done').length, next: ($('#streakMiles .sm-row.next') || {}).dataset?.mile,
    gc: gc ? gc.textContent.replace(/\s+/g, ' ').slice(0, 300) : '', newAch: Object.keys(cl).filter(id => /^(g_|c_m|gd_)/.test(id)), title: (TITLE_TEXT[equippedId('title')] || ''),
    owned: ['ti_s_roll', 'ti_s_unbreak'].every(isOwned), evo: pomeoEvo(), pomeo: /#f0735f/.test(($('.pomeo-card') || {}).innerHTML || ''), stage: (($('.pomeo-card .evo-line') || {}).textContent || '') };
});
check('Profile: streak milestones 3 · 7 · 14 claimed with the On a Roll and Unbreakable titles (Unbreakable worn), 30 days next', pr.done === 3 && pr.next === '30' && pr.owned && pr.title === 'Unbreakable' && /23 \/ 30|7 to go/.test(pr.sm), JSON.stringify(pr).slice(0, 500));
check('Profile: "Studying together" with partners and clan-session hours, several of the new achievements claimed, and the new Pomeo with his stage', /Studying together/.test(pr.gc) && /study partners?/.test(pr.gc) && pr.newAch.length >= 4 && pr.newAch.some(x => /^c_m/.test(x)) && pr.pomeo && /Stage \d/.test(pr.stage), JSON.stringify({ gc: pr.gc.slice(0, 200), newAch: pr.newAch, stage: pr.stage }));
await p.screenshot({ path: OUT + 'demo-profile.png', fullPage: false });
const tm = await ev(async () => { showTab('timer'); renderToday(); await new Promise(r => setTimeout(r, 300)); return { next: $('#streakNext').textContent.replace(/\s+/g, ' '), mascot: /#f0735f/.test(($('#mascot') || {}).outerHTML || '') }; });
check('Timer: the next milestone (30 days · Ember) under the streak, and the new Pomeo', /Next milestone: 30 days/.test(tm.next) && /Ember/.test(tm.next) && tm.mascot, JSON.stringify(tm));
await p.screenshot({ path: OUT + 'demo-timer.png' });
// clan page: clan-session milestones
const cp = await ev(async () => { showTab('clan'); renderClan(); await new Promise(r => setTimeout(r, 700)); const c = $('#clanBody .group-card'); return c ? c.textContent.replace(/\s+/g, ' ') : ''; });
check('Clan page: the clan-session milestones with progress toward the next one (40 h) and its reward', /Clan session milestones/.test(cp) && /\/ 40 h/.test(cp), cp.slice(0, 300));
await p.screenshot({ path: OUT + 'demo-clan.png' });
// achievements page: the Together category
const ach = await ev(async () => { showTab('profile'); S.ui.achCat = 'group'; renderProgress(); await new Promise(r => setTimeout(r, 300)); const n = $$('#progressView .ach').length, done = $$('#progressView .ach.done').length; S.ui.achCat = 'all'; renderProgress(); return { n, done }; });
check('Achievements page, Together: 21 new achievements, several already earned in the demo', ach.n === 21 && ach.done >= 3, JSON.stringify(ach));
// nothing written
await wait(3000);   // reminders, held pop-ups and timers get their chance to write
const after = await ev(() => ({ ls: Object.keys(localStorage).sort().join(), pv: isPreview(), w: window.__w }));
check('The demo never wrote: no request to Firebase, no write call at all (not even to its stand-in), browser storage unchanged', net.length === 0 && after.ls === ls0 && after.pv && after.w.length === 0, JSON.stringify({ net: net.slice(0, 3), ls0, ls: after.ls, w: after.w }));
await ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
