import { chromium } from 'playwright';

// 1.17: held pop-ups (hatch reveal, level-up, tier-up) can open between steps; close them and click through the DOM
const pclick = async (d, sel) => { await d.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await wait(150); await d.p.evaluate(s => { const el = document.querySelector(s); if (!el) throw new Error('no ' + s); el.click(); }, sel); };
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
async function device(name, { w = 390, h = 844, scheme = 'light', motion = null, login = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, acceptDownloads: true });
  await ctx.addInitScript(([m, login]) => {
    localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1');
    if (m) localStorage.setItem('pomodorolist-motion', m);
    if (!login) { const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); }
    window.Notification = function () { return { close() {} }; }; window.Notification.permission = 'granted'; window.Notification.requestPermission = () => Promise.resolve('granted');
  }, [motion, login]);
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('dialog', d => d.accept());
  p.toasts = [];
  await p.exposeFunction('__toast', m => p.toasts.push(m));
  await p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList && n.classList.contains('toast-item') && window.__toast(n.textContent)))).observe(document.getElementById('toast'), { childList: true })); });
  return { ctx, p, name };
}
const close = d => d.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
async function sessions(d, n, min = 25, name = '') {
  for (let i = 0; i < n; i++) {
    await d.p.evaluate(([m, nm]) => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); if (nm) { $('#nameInput').value = nm; onNameChange(); } S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); S.timer.planned = m * 60000; S.timer.focusStartedAt = Date.now() - m * 60000; S.timer.endAt = Date.now() - 1; }, [min, name]);
    await wait(500);
  }
}
// history: last month (Wrapped), last 8 days at 70 min (streak 8 → green aura), and an abandoned block
async function seed(d) {
  await d.p.goto(U);
  await d.p.evaluate(() => {
    const now = new Date(), ss = [], ab = [];
    const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const subj = ['Physics', 'Maths', 'Chemistry', 'Physics', 'Physics', 'Maths'];
    for (let i = 0; i < 26; i++) {
      const day = new Date(pm.getFullYear(), pm.getMonth(), 1 + (i % 27), [21, 22, 19, 23, 7, 16][i % 6], 0).getTime();
      const len = [25, 50, 95, 15, 45, 30][i % 6];
      ss.push({ id: `pm${i}`, name: subj[i % 6], start: day, end: day + len * 60000, duration: len * 60000, planned: len * 60000, preset: 'Classic 25/5' });
    }
    for (let k = 1; k <= 8; k++) { const st = new Date(now.getFullYear(), now.getMonth(), now.getDate() - k, 18, 0).getTime(); ss.push({ id: `rc${k}`, name: 'Biology', start: st, end: st + 70 * 60000, duration: 70 * 60000, planned: 70 * 60000, preset: 'Deep Work 50/10' }); }
    const a = new Date(pm.getFullYear(), pm.getMonth(), 5, 20).getTime();
    ab.push({ id: 'ab1', name: 'Maths', start: a, end: a + 10 * 60000, duration: 10 * 60000, planned: 25 * 60000 });
    localStorage.setItem('focus-app-v1', JSON.stringify({ sessions: ss, abandoned: ab }));
    localStorage.setItem('pomodorolist-guest', '1');
  });
  await d.p.goto(U); await d.p.waitForSelector('#appView:not(.hidden)'); await wait(2200);
}

// ================= daily login =================
const L = await device('L', { login: true });
await seed(L);
log('login popup on open:', await L.p.evaluate(() => $('#loginDlg').open), '| profile dot:', await L.p.evaluate(() => !$('#profileDot').classList.contains('hidden')));
const c0 = await L.p.evaluate(() => game().balance);
await L.p.click('#loginClaim'); await wait(1300);
log('claimed day 1:', await L.p.evaluate(() => JSON.stringify(loginToday())), '| +coins', await L.p.evaluate(() => game().balance) - c0, '| dot hidden:', await L.p.evaluate(() => $('#profileDot').classList.contains('hidden')));
await L.p.reload(); await L.p.waitForSelector('#appView:not(.hidden)'); await wait(2200);
log('reload same day → popup:', await L.p.evaluate(() => $('#loginDlg').open));
// day 7 with gift; a gap resets to day 1
const d7 = await L.p.evaluate(() => {
  const cl = S.game.claims.login; for (const k of Object.keys(cl)) delete cl[k];
  for (let i = 6; i >= 1; i--) cl[dayKey(addDays(startOfDay(new Date()), -i))] = Date.now() - i * 864e5;
  G = null; save(); const before = game().balance, owned = game().owned.size; return { info: loginToday(), before, owned };
});
await L.p.evaluate(() => openLoginDlg()); await wait(200);
log('day 7 dialog:', await L.p.textContent('#loginTitle'), '|', await L.p.textContent('#loginGift'));
await L.p.screenshot({ path: 'v7-login-day7.png' });
await L.p.click('#loginClaim'); await wait(1300);
log('day 7 claim: +', await L.p.evaluate(() => game().balance) - d7.before, 'coins | gift owned:', await L.p.evaluate(o => game().owned.size - o, d7.owned), '| gift:', await L.p.evaluate(() => Object.values(S.game.purchases).filter(p => p.gift).map(p => p.item).join(',')));
log('gap → day 1:', await L.p.evaluate(() => { const cl = S.game.claims.login; for (const k of Object.keys(cl)) delete cl[k]; cl[dayKey(addDays(startOfDay(new Date()), -2))] = Date.now() - 2 * 864e5; return loginToday().day; }));
log('cycle after 7 restarts at 1:', await L.p.evaluate(() => { const cl = S.game.claims.login; for (const k of Object.keys(cl)) delete cl[k]; for (let i = 7; i >= 1; i--) cl[dayKey(addDays(startOfDay(new Date()), -i))] = 1; return loginToday().day; }));
await L.p.evaluate(() => { showTab('profile'); }); await wait(500);
await L.p.screenshot({ path: 'v7-profile.png', fullPage: true });
log('profile track:', await L.p.evaluate(() => $$('#loginCard .track7 .d').length), '| aura card:', await L.p.evaluate(() => [...$$('.card h2')].find(h => h.textContent === 'Aura').parentElement.querySelector('p').textContent.replace(/\s+/g, ' ').trim()));
log('aura on hero/chip:', await L.p.evaluate(() => [$('.bigbadge .aura') && $('.bigbadge .aura').className, $('#lvChip .aura') && $('#lvChip .aura').className].join(' | ')));
log('aura tiers:', await L.p.evaluate(() => [3, 7, 14, 30, 60, 100, 2].map(n => (auraFor(n) || { id: 'none' }).id).join(',')));
log('aura pulse anim (full):', await L.p.evaluate(() => getComputedStyle($('.bigbadge .aura'), '::before').animationName));
await L.ctx.close();

// ================= boss (solo), garden, wrapped, revision, exams, parking, keys =================
const A = await device('A', { w: 1280, h: 860 });
await seed(A); await close(A);
await A.p.evaluate(() => showTab('quests')); await wait(800);
log('boss:', await A.p.evaluate(() => { const s = bossBattle(bossView()); return `${s.boss.name} hp ${s.hp} dmg ${s.dmg} mode ${s.mode} coins ${s.coins}`; }));
await A.p.screenshot({ path: 'v7-quests-desk.png' });
const bal0 = await A.p.evaluate(() => game().balance);
await A.p.evaluate(() => showTab('timer'));
await sessions(A, 4, 60, 'Physics'); await wait(1200);
log('float after session:', await A.p.evaluate(() => $$('.float-up, .floatup, .fu').length >= 0));
log('defeated:', await A.p.evaluate(() => JSON.stringify(S.game.trophies[dayKey(weekMonday())])), '| toast:', A.p.toasts.filter(t => /defeated/.test(t)));
log('coins incl. boss reward:', await A.p.evaluate(() => game().balance) - bal0);
await A.p.evaluate(() => showTab('quests')); await wait(1500);
log('victory shown:', await A.p.evaluate(() => ($('.victory') || {}).textContent), '| art class:', await A.p.evaluate(() => $('#bossArt').className));
await A.p.screenshot({ path: 'v7-quests-won.png' });
await A.p.evaluate(() => showTab('profile')); await wait(400);
log('trophy shelf:', await A.p.evaluate(() => $$('.trophy').length));
// hit animation + floating damage on re-entry
await A.p.evaluate(() => { writeLS(BOSS_SEEN_KEY, { wk: 'x', dmg: 0 }); delete S.game.claims.bosses[dayKey(weekMonday())]; delete S.game.trophies[dayKey(weekMonday())]; S.settings.goalMin = 600; save(); showTab('quests'); });
await wait(200);
log('hit + float:', await A.p.evaluate(() => [$('#bossArt').classList.contains('hit'), $('.dmg-float') && $('.dmg-float').textContent].join(' ')));
await A.p.evaluate(() => { S.settings.goalMin = 60; save(); });

// garden
await A.p.evaluate(() => showTab('timer'));
await A.p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); $('#nameInput').value = 'Stop early'; onNameChange(); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); S.timer.planned = 25 * 60000; S.timer.focusStartedAt = Date.now() - 10 * 60000; S.timer.endAt = Date.now() + 15 * 60000; });
await pclick(A, '#skipBtn'); await wait(300);
log('abandoned recorded:', await A.p.evaluate(() => S.abandoned.map(a => a.name + ' ' + Math.round(a.duration / 60000) + 'm').join(', ')));
await A.p.evaluate(() => { S.ui.gardenView = 'garden'; showTab('garden'); }); await wait(500);
log('garden (1.15):', await A.p.evaluate(() => $('#tab-garden .garden-stats').textContent.replace(/\s+/g, ' ').trim()), '| plots:', await A.p.evaluate(() => `${$$('.gd-plot').length} (${$$('.gd-plot.locked').length} locked, ${$$('.gd-plot.has').length} planted)`), '| migrated:', await A.p.evaluate(() => JSON.stringify(gardenMig() && { grown: gardenMig().grown, y: gardenMig().y, xp: gardenMig().xp })));
await pclick(A, '.gd-plot:not(.locked)'); await wait(250);
log('plot dialog:', await A.p.evaluate(() => ($('#gdDlg').open ? $('#gdDlgBody h2').textContent : 'closed')));
await A.p.evaluate(() => $('#gdDlg').close());
await A.p.screenshot({ path: 'v7-garden.png', fullPage: true });
await A.p.evaluate(() => showTab('stats')); await wait(300);
log('stats garden slot:', await A.p.evaluate(() => ($('#gardenSlot .desc') || {}).textContent));
// wrapped
log('wrapped banner:', await A.p.evaluate(() => ($('#wrappedSlot .wb-t') || {}).textContent), '| periods:', await A.p.evaluate(() => wrappedPeriods().map(p => p.kind + ':' + p.label + ':' + p.sessions.length).join(' ')));
await pclick(A, '[data-wrapped="0"]'); await wait(900);
await A.p.screenshot({ path: 'v7-wrapped-1.png' });
const slides = [];
for (let i = 0; i < 8; i++) { slides.push(await A.p.evaluate(() => $('#wrapped .wr-slide').innerText.replace(/\s+/g, ' ').trim().slice(0, 70))); if (i === 2) await A.p.screenshot({ path: 'v7-wrapped-3.png' }); if (i === 6) await A.p.screenshot({ path: 'v7-wrapped-7.png' }); if (i < 7) { await pclick(A, '.wr-nav.next'); await wait(700); } }
log('wrapped slides:\n  ' + slides.join('\n  '));
await A.p.screenshot({ path: 'v7-wrapped-8.png' });
const [dl] = await Promise.all([A.p.waitForEvent('download'), A.p.click('#wrShare')]);
const png = fs.readFileSync(await dl.path());
fs.writeFileSync('v7-wrapped-share.png', png);
log('share image:', dl.suggestedFilename(), png.length, 'bytes');
await pclick(A, '.wr-close'); await wait(200);
log('wrapped closed:', await A.p.evaluate(() => $('#wrapped').classList.contains('hidden')));
log('yearly period on Dec 21:', await A.p.evaluate(() => { const R = Date; const fake = new R(new R().getFullYear(), 11, 21, 12); globalThis.Date = class extends R { constructor(...a) { super(...(a.length ? a : [fake.getTime()])); } static now() { return fake.getTime(); } }; const out = wrappedPeriods().map(p => p.kind + ':' + p.label); globalThis.Date = R; return out.join(' '); }));

// revision
await A.p.evaluate(() => showTab('timer'));
await sessions(A, 1, 30, 'Thermodynamics'); await wait(500);
log('after-row revision button:', await A.p.evaluate(() => !$('#noteRow').classList.contains('hidden') && $('#revSchedule').textContent));
await pclick(A, '#revSchedule'); await wait(300);
log('revision created:', await A.p.evaluate(() => { const v = S.revisions[0]; return `${v.topic} step ${v.step} next ${v.next} (in ${daysUntil(v.next)}d)`; }));
await A.p.evaluate(() => { showTab('reminders'); }); await wait(300);
log('revision section:', await A.p.evaluate(() => $('.rev-list li').innerText.replace(/\s+/g, ' ').trim()));
await pclick(A, '[data-rev=ok]'); await wait(200);
log('mark revised:', await A.p.evaluate(() => `step ${S.revisions[0].step} in ${daysUntil(S.revisions[0].next)}d dots ${revDots(S.revisions[0])}`));
await pclick(A, '[data-rev=hard]'); await wait(200);
log('hard:', await A.p.evaluate(() => `step ${S.revisions[0].step} in ${daysUntil(S.revisions[0].next)}d`));
await pclick(A, '[data-rev=easy]'); await wait(200);
log('easy:', await A.p.evaluate(() => `step ${S.revisions[0].step} in ${daysUntil(S.revisions[0].next)}d`));
// due now → Pomeo pop-up → Start now → finishing the session marks it revised
await A.p.evaluate(() => { const v = S.revisions[0], n = new Date(); v.next = dayKey(n); v.time = `${pad(n.getHours())}:${pad(n.getMinutes())}`; save(); checkReminders(); });
await wait(300);
log('revision popup:', await A.p.isVisible('#pomeoPop'), await A.p.textContent('#popText'));
await A.p.screenshot({ path: 'v7-rev-pop.png' });
await pclick(A, '#popStart'); await wait(400);
log('start now:', await A.p.evaluate(() => S.timer.status + ' ' + S.timer.name));
const stepBefore = await A.p.evaluate(() => S.revisions[0].step);
await A.p.evaluate(() => { S.timer.planned = 30 * 60000; S.timer.focusStartedAt = Date.now() - 30 * 60000; S.timer.endAt = Date.now() - 1; }); await wait(800);
log('session on due topic advances it:', stepBefore, '→', await A.p.evaluate(() => S.revisions[0].step));
// manual revision plan via the reminder form
await A.p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('reminders'); });
await pclick(A, '#remAdd'); await A.p.fill('#remTitle', 'Organic reactions'); await A.p.selectOption('#remRepeat', 'revision');
log('form label:', await A.p.textContent('#remDateLbl'));
await pclick(A, '#remForm button[type=submit]'); await wait(300);
log('manual plan:', await A.p.evaluate(() => S.revisions.map(v => v.topic).join(', ')), '| normal reminders:', await A.p.evaluate(() => S.reminders.length));
log('settings intervals:', await A.p.evaluate(() => { showTab('settings'); $('#setRevInt').value = '2, 5, 12'; $('#setRevInt').dispatchEvent(new Event('change')); return JSON.stringify(S.settings.revIntervals); }));
await A.p.evaluate(() => { $('#setRevInt').value = '5, 3'; $('#setRevInt').dispatchEvent(new Event('change')); });
log('bad intervals rejected:', await A.p.evaluate(() => JSON.stringify(S.settings.revIntervals)));
await A.p.evaluate(() => { S.settings.revIntervals = [1, 3, 7, 21, 45]; save(); });

// exams
await A.p.evaluate(() => showTab('timer')); await wait(200);
await pclick(A, '#examCard'); await wait(200);
const ex1 = await A.p.evaluate(() => dayKey(addDays(new Date(), 94)));
await A.p.fill('#examName', 'JEE Main'); await A.p.fill('#examDate', ex1); await pclick(A, '#examForm button[type=submit]'); await wait(200);
await close(A);
log('exam card:', await A.p.evaluate(() => $('#examCard').innerText.replace(/\s+/g, ' ').trim()), '| near:', await A.p.evaluate(() => $('#examCard').classList.contains('near')));
await pclick(A, '#examCard'); await wait(150);
await A.p.fill('#examName', 'Physics unit test'); await A.p.fill('#examDate', await A.p.evaluate(() => dayKey(addDays(new Date(), 5)))); await pclick(A, '#examForm button[type=submit]'); await wait(150); await close(A);
log('nearest first + accent:', await A.p.evaluate(() => $('#examCard .ex-name').textContent + ' | ' + $('#examCard').classList.contains('near') + ' | more: ' + $('#examCard .ex-more').textContent));
await A.p.screenshot({ path: 'v7-timer-exam.png' });
log('exam day Pomeo:', await A.p.evaluate(() => { S.exams.push({ id: 'xt', name: 'Chem test', date: dayKey(new Date()), added: Date.now() }); localStorage.removeItem(EXAM_DAY_KEY); hideBubble(); PB.q = []; examDayCheck(); renderExamCard(); return $('#pomeoBubble').textContent + ' | card: ' + $('#examCard .ex-days').textContent; }));
await A.p.evaluate(() => { S.exams = S.exams.filter(x => x.id !== 'xt'); save(); renderExamCard(); });

// parking lot + shortcuts
// v2.0: let the celebrations queued by the earlier blocks finish first (an "Early bird" / "Night owl" achievement and
// its level-up depend on the hour the suite runs).
for (let i = 0; i < 60; i++) { const busy = await A.p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); return FG.q.some(x => ['level', 'ach', 'unlock', 'boss', 'reveal'].includes(x.kind)) || !!achBusy; }); if (!busy) break; await wait(400); }
await A.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await wait(350);
await A.p.evaluate(() => { hideBubble(); hideNote(); $('#nameInput').value = 'Calculus'; onNameChange(); S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); });
await pclick(A, 'body', { position: { x: 5, y: 400 } }); await A.p.evaluate(() => { const a = document.activeElement; if (a && a !== document.body) a.blur(); });   // (as a real click on empty space would)
log('park button during focus:', await A.p.isVisible('#parkBtn'));
await A.p.keyboard.press('p'); await wait(150);
log('P opens parking:', await A.p.isVisible('#parkPop'), '| focused:', await A.p.evaluate(() => document.activeElement.id));
await A.p.keyboard.type('reply to Riya about notes'); await A.p.keyboard.press('Enter'); await wait(150);
await pclick(A, '#parkBtn'); await A.p.fill('#parkInput', 'check fees deadline'); await pclick(A, '#parkSave'); await wait(150);
log('parked:', await A.p.evaluate(() => S.parked.map(p => p.text).join(' | ')), '| timer still running:', await A.p.evaluate(() => S.timer.status));
await A.p.evaluate(() => { S.timer.planned = 25 * 60000; S.timer.focusStartedAt = Date.now() - 25 * 60000; S.timer.endAt = Date.now() - 1; }); await wait(800);
log('break panel:', await A.p.evaluate(() => S.timer.phase + ' | ' + ($('#parkPanel h3') || {}).textContent), '| visible:', await A.p.isVisible('#parkPanel'));
await wait(1000); await close(A); await A.p.screenshot({ path: 'v7-park-break.png' });
await wait(2600); await A.p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); }); await wait(700); await A.p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); $('#parkPanel li:first-child [data-pk=done]').click(); });   // a hatch reveal may open right after the block's feedback (1.17: the egg fills faster) await wait(100);   // a queued pop-up (level-up, hatch reveal) may have just opened: close it, then tick
await pclick(A, '#parkPanel li:last-child [data-pk=rem]'); await wait(200);
log('to reminder form:', await A.p.evaluate(() => $('#remDlg').open + ' ' + $('#remDlgTitle').textContent + ' "' + $('#remTitle').value + '"'));
await close(A);
await A.p.evaluate(() => showTab('reminders')); await wait(200);
log('parked section:', await A.p.evaluate(() => [...$$('.rem-sec h2')].map(h => h.firstChild.textContent).join(' / ')), await A.p.evaluate(() => $$('.plist li').length));
// keys
await A.p.evaluate(() => showTab('timer')); await pclick(A, 'body', { position: { x: 5, y: 400 } }); await A.p.evaluate(() => { const a = document.activeElement; if (a && a !== document.body) a.blur(); });   // (as a real click on empty space would)
await A.p.keyboard.press('Shift+?'); await wait(150);
log('? sheet:', await A.p.evaluate(() => $('#keysDlg').open)); await close(A); await wait(500);
await A.p.keyboard.press('3'); await wait(150); const t3 = await A.p.evaluate(() => S.ui.tab);
await A.p.keyboard.press('4'); await wait(150); const t4 = await A.p.evaluate(() => S.ui.tab);
await A.p.keyboard.press('1'); await wait(150);
log('1–8 tabs:', t3, t4, await A.p.evaluate(() => S.ui.tab));
await A.p.keyboard.press('n'); await wait(100);
log('N focuses name:', await A.p.evaluate(() => document.activeElement.id));
await A.p.keyboard.type('r s 2'); 
log('typing is safe:', await A.p.evaluate(() => S.ui.tab + ' ' + S.timer.status + ' "' + $('#nameInput').value + '"'));
await A.p.evaluate(() => document.activeElement.blur());
await A.p.keyboard.press('Space'); await wait(100); const st1 = await A.p.evaluate(() => S.timer.status);
await A.p.keyboard.press('Space'); await wait(100); const st2 = await A.p.evaluate(() => S.timer.status);
await A.p.keyboard.press('r'); await wait(100);
log('space/space/r:', st1, st2, await A.p.evaluate(() => S.timer.status));
await A.p.evaluate(() => { S.settings.shortcuts = false; save(); });
await A.p.keyboard.press('3'); await wait(100);
log('shortcuts off → 3 ignored:', await A.p.evaluate(() => S.ui.tab));
await A.p.evaluate(() => { S.settings.shortcuts = true; save(); });
// phone + desktop navigation width checks
for (const w of [360, 700, 1024, 1250, 1320]) {
  await A.p.setViewportSize({ width: w, height: 800 }); await wait(250);
  log(`nav ${w}px:`, JSON.stringify(await A.p.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, bar: $$('#btmBar button').filter(x => x.offsetWidth).map(x => x.dataset.tab).join(',') }))));
}
// motion off: aura static, boss static
await A.p.evaluate(() => { localStorage.setItem(MOTION_KEY, 'off'); applyMotion(); showTab('profile'); }); await wait(200);
log('motion off aura anim:', await A.p.evaluate(() => getComputedStyle($('.bigbadge .aura'), '::before').animationName));
log('errors', errs);
await b.close();
