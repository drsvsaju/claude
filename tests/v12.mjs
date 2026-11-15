import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [], denied = [];
async function device(name, { w = 1180, h = 900, fresh = false, seen = '1.8' } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(({ fresh, seen }) => { const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()));
    if (!fresh && !sessionStorage.getItem('init')) { sessionStorage.setItem('init', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); if (seen) localStorage.setItem('pomodorolist-seen-version', seen); } }, { fresh, seen });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (/permission|denied|refused|Sync error/i.test(m.text())) denied.push(name + ': ' + m.text().slice(0, 150)); });
  p.on('dialog', d => d.accept());
  return { ctx, p, name };
}
const ev = (d, f, a) => d.p.evaluate(f, a);

// ================= 1. brand-new guest: the tutorial =================
const N = await device('N', { w: 390, h: 844, fresh: true });
await N.p.goto(U);
await N.p.click('#guestBtn').catch(async () => { await N.p.evaluate(() => { localStorage.setItem('pomodorolist-guest', '1'); }); await N.p.goto(U); });
await N.p.waitForSelector('#appView:not(.hidden)');
await N.p.waitForSelector('#tutDlg[open]', { timeout: 8000 });
log('tutorial step 1:', await ev(N, () => $('#tutStep').textContent + ' | ' + $('#tutTitle').textContent + ' | pomeo svg=' + !!$('#tutPomeo svg') + ' | skip=' + $('#tutSkip').textContent));
await N.p.screenshot({ path: 'v12-tut1-phone.png' });
await N.p.click('#tutNext');
await N.p.click('[data-use=exam]');
await N.p.fill('#tutExamName', 'JEE Main'); 
await N.p.fill('#tutExamDate', await ev(N, () => dayKey(addDays(new Date(), 90))));
await N.p.screenshot({ path: 'v12-tut2-phone.png' });
await N.p.click('#tutNext');
log('after use-case:', await ev(N, () => `useCase=${S.settings.useCase} preset=${activePreset().name} exams=${S.exams.map(x => x.name + ' ' + daysUntil(x.date) + 'd').join(',')} goal-suggest=${$('#tutBody .tut-opt.on b').textContent}`));
await N.p.click('[data-goal="240"]');
await N.p.click('#tutNext');
log('goal:', await ev(N, () => S.settings.goalMin), '| step 4:', await ev(N, () => $('#tutTitle').textContent + ' / ' + $('#tutNext').textContent));
await N.p.click('#tutNext');
await wait(600);
const tour = [];
for (let i = 0; i < 16; i++) {   // (breaks when the tour closes; 11 steps since 1.20)
  if (await ev(N, () => $('#tour').classList.contains('hidden'))) break;
  tour.push(await ev(N, () => $('#tourText').textContent.split(':')[0] + (document.querySelector('#tourPomeo svg') ? '🍅' : '')));
  if (i === 1) await N.p.screenshot({ path: 'v12-tour-phone.png' });
  await N.p.click('#tourNext'); await wait(250);
}
log('spotlight steps:', tour.join(' → '));
log('back in tutorial:', await ev(N, () => $('#tutDlg').open + ' ' + $('#tutStep').textContent + ' ' + $('#tutTitle').textContent));
await N.p.click('#tutMinimal'); await wait(300);
log('minimal from tutorial:', await ev(N, () => `minimal=${minimal()} attr=${document.documentElement.hasAttribute('data-minimal')} motion=${document.documentElement.dataset.motion}`));
await N.p.click('#tutMinimal'); await wait(200);   // back off for the demo
await N.p.click('#tutNext');
await N.p.screenshot({ path: 'v12-tut6-phone.png' });
await N.p.click('#tutDemo'); await wait(900);
log('demo:', await ev(N, () => `status=${S.timer.status} planned=${S.timer.planned / 1000}s name=${S.timer.name} onboarded=${S.onboarded} tourDone=${localStorage.getItem('pomodorolist-tour-done')}`));
await ev(N, () => { S.timer.endAt = Date.now() - 10; }); await wait(2500);
log('summary card:', await ev(N, () => `${!$('#noteRow').classList.contains('hidden')} | ${$('#sumHead').textContent} | energy=${!$('#energyRow').classList.contains('hidden')} opts=${$$('#energyRow [data-energy]').length}`));
await N.p.screenshot({ path: 'v12-summary-phone.png' });
await N.p.click('#energyRow [data-energy="4"]'); await wait(400);
log('rated:', await ev(N, () => JSON.stringify(S.energy) + ' | ' + $('#sumHead span').textContent + ' | stored=' + JSON.stringify(JSON.parse(localStorage.getItem('focus-app-v1')).energy)));
log('next planned after demo:', await ev(N, () => { const t = S.timer; return t.phase + ' ' + (plannedMs() / 60000) + 'min'; }));
// tips: once per screen
await ev(N, () => showTab('stats')); await wait(900);
log('tip on stats:', await ev(N, () => !$('#tipPop').classList.contains('hidden') && $('#tipPop p').textContent.slice(0, 40)));
await N.p.screenshot({ path: 'v12-tip-phone.png' });
await N.p.click('#tipOk'); await ev(N, () => showTab('timer')); await wait(200); await ev(N, () => showTab('stats')); await wait(900);
log('tip again?', await ev(N, () => !$('#tipPop').classList.contains('hidden')));
await ev(N, () => { showTab('settings'); }); await wait(900); await N.p.click('#tipOk').catch(() => {});
await N.p.click('#resetTips'); await ev(N, () => showTab('stats')); await wait(900);
log('tip after reset:', await ev(N, () => !$('#tipPop').classList.contains('hidden')));
await N.p.click('#tipOk');
// reload: tutorial not again
await N.p.reload(); await N.p.waitForSelector('#appView:not(.hidden)'); await wait(2000);
log('tutorial on reload:', await ev(N, () => $('#tutDlg').open), '| news card:', await ev(N, () => !!$('#newsSlot .news-card')));
await N.ctx.close();

// ================= 2. True Minimalist =================
const M = await device('M');
await M.p.goto(U);
await M.p.evaluate(() => { const ss = [], en = {}; for (let i = 1; i <= 40; i++) { const st = new Date(); st.setDate(st.getDate() - Math.floor(i / 2)); st.setHours(i % 3 ? 9 : 20, 0, 0, 0); const len = i % 4 ? 25 : 75; ss.push({ id: 'm' + i, name: i % 2 ? 'Maths' : 'Physics', start: +st, end: +st + len * 60000, duration: len * 60000, planned: len * 60000, preset: i % 2 ? 'Classic 25/5' : 'Deep Work 50/10' }); if (i <= 14) en['m' + i] = i % 3 ? (len > 60 ? 2 : 4) : 1; } localStorage.setItem('focus-app-v1', JSON.stringify({ sessions: ss.sort((a, b) => a.start - b.start), energy: en })); localStorage.setItem('pomodorolist-guest', '1'); });
await M.p.goto(U); await M.p.waitForSelector('#appView:not(.hidden)'); await wait(1500);
await ev(M, () => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
const vis = () => ev(M, () => ['#lvChip', '#coinPill', '#avatarBtn', '#boardTabBtn', '#shopTabBtn', '#questTabBtn'].map(s => s.slice(1) + '=' + ($(s).classList.contains('hidden') ? 'off' : 'on')).join(' '));
const gameBefore = await ev(M, () => JSON.stringify(S.game) + '|' + game().earned + '|' + game().lv.level);
log('normal:', await vis());
log('quick start chips:', await ev(M, () => $$('#quickStart button').map(b => b.textContent).join(', ')));
await ev(M, () => showTab('settings')); await wait(400);
log('settings rows:', await ev(M, () => ['setMinimal', 'setMinPomeo', 'setEnergy', 'replayTour', 'resetTips'].map(id => id + ':' + !!$('#' + id)).join(' ') + ' | setGame gone=' + !$('#setGame') + ' | minimal in Appearance=' + !!$('#sec-appearance #setMinimal') + ' | minPomeo hidden=' + $('#minPomeoRow').classList.contains('hidden')));
await M.p.click('#setMinimal'); await wait(500);
log('minimal ON:', await vis(), '| attr', await ev(M, () => document.documentElement.hasAttribute('data-minimal')), '| motion', await ev(M, () => document.documentElement.dataset.motion), '| minPomeo row shown', await ev(M, () => !$('#minPomeoRow').classList.contains('hidden')));
await M.p.screenshot({ path: 'v12-min-settings.png' });
await ev(M, () => showTab('timer')); await wait(500);
log('timer: pomeo shown', await ev(M, () => !$('#pomeoHost').classList.contains('hidden')));
await M.p.screenshot({ path: 'v12-min-timer.png' });
await ev(M, () => showTab('stats')); await wait(900);
log('stats: garden', await ev(M, () => $('#gardenSlot').innerHTML.length), '| insights', await ev(M, () => $$('#energySlot .ins').map(x => x.querySelector('.k').textContent + '=' + x.querySelector('.v').textContent).join(' ; ')), '| chart bars', await ev(M, () => $$('#energySlot .ins-chart i').length), '| history emoji', await ev(M, () => { S.ui.statsView = 'day'; renderStats(); return $$('.sesslist .en').length; }));
await ev(M, () => { S.ui.statsView = 'week'; renderStats(); });
await M.p.screenshot({ path: 'v12-min-stats.png', fullPage: true });
await ev(M, () => showTab('shop')); log('shop → ', await ev(M, () => S.ui.tab));
await ev(M, () => showTab('board')); log('board →', await ev(M, () => S.ui.tab));
await ev(M, () => openCmd()); await M.p.fill('#cmdInput', 'True Minimalist'); await wait(200);
log('palette "True Minimalist":', await ev(M, () => CMD.items.slice(0, 3).map(c => c.t).join(' | ')), '| tabs:', await ev(M, () => cmdList('').filter(c => c.g === 'Go to').map(c => c.t).join(',')));
await M.p.fill('#cmdInput', 'contact'); await wait(150); log('palette "contact":', await ev(M, () => CMD.items.slice(0, 2).map(c => c.t).join(' | ')));
await ev(M, () => $('#cmdDlg').close());
log('wrapped slides (min):', await ev(M, () => { for (let d = 10; d < 16; d++) { const st = +new Date(2026, 8, d, d % 2 ? 7 : 20); S.sessions.unshift({ id: 'w' + d, name: 'Chem', start: st, end: st + 30 * 60000, duration: 30 * 60000, planned: 30 * 60000, preset: '' }); } const ps = wrappedPeriods(); if (!ps.length) return 'no period'; ps[0].sessions.forEach((s, i) => { S.energy[s.id] = new Date(s.start).getHours() === 20 ? 4 : 2; }); openWrapped(0); const sum = W.slides.at(-1).includes('active days'); const n = W.slides.length, g = W.slides.some(x => /Bosses/.test(x)), lk = W.slides.find(x => /locked-in hour/.test(x)); closeWrapped(); return `${n} slides, bosses=${g}, activeDaysTile=${sum}, lockedIn=${lk ? lk.match(/<b>(.*?)<\/b>/)[1] : 'none'}`; }));
await ev(M, () => { S.settings.minPomeo = false; save(); renderAll(); }); log('minPomeo off: pomeo hidden', await ev(M, () => $('#pomeoHost').classList.contains('hidden')));
await ev(M, () => { S.settings.minPomeo = true; save(); showTab('settings'); }); await wait(300);
await M.p.click('#setMinimal'); await wait(500);
log('minimal OFF:', await vis(), '| attr', await ev(M, () => document.documentElement.hasAttribute('data-minimal')), '| motion', await ev(M, () => document.documentElement.dataset.motion));
log('game data unchanged:', (await ev(M, () => JSON.stringify(S.game) + '|' + game().earned + '|' + game().lv.level)) === gameBefore);
log('wrapped slides (normal):', await ev(M, () => { const ps = wrappedPeriods(); if (!ps.length) return 'no period'; openWrapped(0); const n = W.slides.length; closeWrapped(); return n; }));
// energy settings
await ev(M, () => { S.settings.energy = 'off'; showTab('timer'); offerNote(S.sessions.at(-1).id); });
log('energy off → row hidden:', await ev(M, () => $('#energyRow').classList.contains('hidden')));
await ev(M, () => { hideNote(); S.settings.energy = 'sometimes'; const out = []; for (const n of [39, 40, 42]) { S.sessions.length = 0; for (let i = 0; i < n; i++) S.sessions.push({ id: 'z' + i, start: 0, end: 0, duration: 0, name: 'x' }); out.push(shouldCheckIn()); } return out; }).then(r => log('sometimes (39,40,42 sessions):', r));
// contact
await M.p.goto(U); await M.p.waitForSelector('#appView:not(.hidden)'); await wait(800);
log('mailto links:', await ev(M, () => $$('a[href^="mailto:siverieg.p@gmail.com"]').length), '| footers with contact:', await ev(M, () => $$('.app-foot').filter(f => /Contact: siverieg\.p@gmail\.com/.test(f.textContent)).length), '| bug label:', await ev(M, () => $$('a[href*="Pomodorolist-V1.0/issues"]').map(a => a.textContent.trim() || a.closest('.setting')?.querySelector('div div')?.textContent).join(' | ')));
await ev(M, () => showTab('about')); await wait(400); await M.p.screenshot({ path: 'v12-about.png', fullPage: true });
await M.ctx.close();

// ================= 3. existing user: no tutorial, a What's-new card =================
const E = await device('E', { seen: '1.7' });
await E.p.goto(U);
await E.p.evaluate(() => { const ss = []; for (let i = 1; i <= 5; i++) { const st = Date.now() - i * 864e5; ss.push({ id: 'e' + i, name: 'Maths', start: st, end: st + 25 * 60000, duration: 25 * 60000, planned: 25 * 60000, preset: '' }); } localStorage.setItem('focus-app-v1', JSON.stringify({ sessions: ss })); localStorage.setItem('pomodorolist-guest', '1'); });
await E.p.goto(U); await E.p.waitForSelector('#appView:not(.hidden)'); await wait(2000);
await ev(E, () => document.querySelectorAll('dialog[open]:not(#tutDlg)').forEach(x => x.close()));
log('existing: tutorial', await ev(E, () => $('#tutDlg').open), '| news:', await ev(E, () => $('#newsSlot h3') && $('#newsSlot h3').textContent + ' / ' + $$('#newsSlot button').map(b => b.textContent).join(', ')));
await E.p.screenshot({ path: 'v12-news.png' });
await E.p.click('[data-news-tut]'); await wait(400);
log('take tutorial from card:', await ev(E, () => $('#tutDlg').open + ' ' + $('#tutStep').textContent));
await E.p.click('#tutSkip'); await wait(300);
log('skipped: open', await ev(E, () => $('#tutDlg').open), 'onboarded', await ev(E, () => S.onboarded), 'news gone', await ev(E, () => !$('#newsSlot .news-card')));
await E.ctx.close();

// ================= 4. cloud: onboarded + energy saved under users/{uid} =================
const sfx = Date.now().toString(36).slice(-4);
const A = await device('A', { fresh: true });
await A.p.goto(U + '?emulator=1'); await A.p.waitForSelector('#authView:not(.hidden)');
await A.p.click('[data-mode=signup] >> visible=true'); await A.p.fill('#authUser', 'tut_' + sfx); await A.p.fill('#authPass', 'secret1'); await A.p.fill('#authPass2', 'secret1'); await A.p.click('#authSubmit');
await A.p.waitForSelector('#tutDlg[open]', { timeout: 20000 });
log('cloud new user → tutorial:', await ev(A, () => $('#tutStep').textContent));
await A.p.click('#tutNext'); await A.p.click('[data-use=work]'); await A.p.click('#tutNext');
log('work preset:', await ev(A, () => activePreset().name + ' goal-suggest ' + $('#tutBody .tut-opt.on b').textContent));
await A.p.click('#tutSkip'); await wait(400);
await ev(A, () => { S.timer.phase = 'focus'; S.timer.oneOff = 60000; startTimer(); }); await wait(300); await ev(A, () => { S.timer.endAt = Date.now() - 10; }); await wait(2500);
await A.p.click('#energyRow [data-energy="3"]'); await wait(3500);
log('cloud doc:', await ev(A, async () => { const d = (await FB.getDoc(FB.doc(FB.db, 'users', USER.uid))).data(); return `onboarded=${d.onboarded} energy=${JSON.stringify(d.energy)} minimal-setting=${d.settings.gamification} energySetting=${d.settings.energy} useCase=${d.settings.useCase}`; }));
const A2 = await device('A2', { fresh: true });
await A2.p.goto(U + '?emulator=1'); await A2.p.waitForSelector('#authView:not(.hidden)');
await A2.p.click('[data-mode=login] >> visible=true'); await A2.p.fill('#authUser', 'tut_' + sfx); await A2.p.fill('#authPass', 'secret1'); await A2.p.click('#authSubmit');
await A2.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(3000);
log('second device: tutorial', await ev(A2, () => $('#tutDlg').open), '| energy synced', await ev(A2, () => Object.values(S.energy).join(',')));
// minimal synced
await ev(A, () => setMinimal(true)); await wait(3000);
log('minimal synced to device 2:', await ev(A2, () => `${minimal()} attr=${document.documentElement.hasAttribute('data-minimal')} shop=${$('#shopTabBtn').classList.contains('hidden') ? 'hidden' : 'shown'}`));
await A2.p.evaluate(() => { logout(); }).catch(() => {}); await A2.p.waitForSelector('#authView:not(.hidden)', { timeout: 15000 }); await wait(500);
log('after logout attr:', await ev(A2, () => document.documentElement.hasAttribute('data-minimal')));
log('errors', errs, '| denied', denied);
await b.close();
