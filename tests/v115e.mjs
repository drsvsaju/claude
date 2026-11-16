// v1.15 Weekly subject plan: targets per subject, progress from session names and name tags (case-insensitive), the
// Stats card with bars + expected marker + On track / Behind / Done, carry-over from last week (capped), the week-start
// setting, the week rollover, the Today card line (most-behind subject + one-tap focus), the plan dialog (add, remove,
// validation, upsert by name, tombstone on removal), export/import, demo, two devices, phone layout.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); });
  if (opts.clock) await ctx.clock.install({ time: opts.clock });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('guest: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('guest console: ' + m.text()); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); if (opts.clock) await ctx.clock.runFor(2600); else await wait(2500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
// a fixed clock: Wednesday 28 Oct 2026, 14:00 local (week Mon 26 – Sun 1 Nov; 2.58 days elapsed of 7)
const WED = new Date(2026, 9, 28, 14, 0, 0);
const G = await guest(1280, { clock: WED });
// sessions: this week Physics 3 h (Mon/Tue), "Rotational motion" tagged Physics 1 h, Maths 30 min; last week Chemistry 2 h (target 6 → carry 4 → capped at 6? no: carry = min(target, 6-2=4) = 4)
await G.ev(() => {
  const add = (name, dayOffset, h, mins) => { const st = new Date(2026, 9, 26 + dayOffset, h, 0, 0).getTime(); S.sessions.push({ id: 'p' + name + dayOffset + h, name, start: st, end: st + mins * 60000, duration: mins * 60000, planned: mins * 60000, preset: 'Classic 25/5' }); };
  add('Physics', 0, 9, 90); add('physics', 1, 9, 90); add('Rotational motion', 1, 12, 60); add('Maths', 2, 9, 30); add('Chemistry', -5, 10, 120); add('Chemistry', -3, 10, 0);
  S.names['Rotational motion'] = { color: '#3f9fbf', tag: 'Physics' };
  S.sessions.sort((a, b) => a.start - b.start); save();
});
// ---------- 1. the Stats card and the dialog ----------
await G.ev(() => showTab('stats')); await G.ctx.clock.runFor(500);
check('Stats shows an empty Weekly plan card with "Set targets"', await G.ev(() => /Weekly plan/.test($('#planSlot').textContent) && !!$('#planSlot [data-planedit]')));
await closeAll(G); await G.p.click('#planSlot [data-planedit]'); await G.ctx.clock.runFor(300);
check('The plan dialog opens with one empty row, suggestions from session names and tags', await G.ev(() => $('#planDlg').open && $$('#plRows .pl-row').length === 1 && UI.cfg.suggest($('#plRows .pl-row input[name="name"]')).includes('Physics')));
await G.p.fill('#plRows .pl-row input[name="name"]', 'Physics'); await G.p.fill('#plRows .pl-row input[name="hrs"]', '8');
await G.p.click('#plAdd'); await G.p.fill('#plRows .pl-row:nth-child(2) input[name="name"]', 'Chemistry'); await G.p.fill('#plRows .pl-row:nth-child(2) input[name="hrs"]', '6');
await G.p.click('#plAdd'); await G.p.fill('#plRows .pl-row:nth-child(3) input[name="name"]', 'Maths');
await G.p.click('#plSave'); await G.ctx.clock.runFor(200);
check('Validation: a subject without a target is refused with a message', await G.ev(() => $('#planDlg').open && /Maths/.test($('#plErr').textContent)));
await G.p.fill('#plRows .pl-row:nth-child(3) input[name="hrs"]', '4');
await G.p.click('#plAdd'); await G.p.fill('#plRows .pl-row:nth-child(4) input[name="name"]', 'Biology'); await G.p.fill('#plRows .pl-row:nth-child(4) input[name="hrs"]', '2');
await G.p.click('#plSave'); await G.ctx.clock.runFor(400);
const saved = await G.ev(() => ({ open: $('#planDlg').open, n: S.plan.length, names: S.plan.map(p => p.name + ':' + p.hrs).join(), v: S.plan.every(p => p.v === 1 && p.u) }));
check('Saved: four subjects with targets, versioned and stamped for sync', !saved.open && saved.n === 4 && saved.names === 'Physics:8,Chemistry:6,Maths:4,Biology:2' && saved.v, JSON.stringify(saved));
// ---------- 2. progress, tags, status, carry-over ----------
await G.ev(() => { for (const p of S.plan) if (p.name === 'Chemistry') p.at = new Date(2026, 9, 10).getTime(); save(); renderPlanCard(); });   // a target that existed last week carries over; the others are brand new
const w = await G.ev(() => { const w = planWeek(); return { from: dayKey(w.from), to: dayKey(w.to), daysLeft: w.daysLeft, rows: w.list.map(r => ({ n: r.name, done: r.done, goal: r.goal, target: r.target, carry: r.carry, st: r.status, exp: Math.round(r.expected), perDay: r.perDay, behindBy: r.behindBy })) }; });
const row = n => w.rows.find(r => r.n === n);
check('Week Mon 26 Oct – Sun 1 Nov (week starts Monday), 5 days left on Wednesday afternoon', w.from === '2026-10-26' && w.to === '2026-11-02' && w.daysLeft === 5, JSON.stringify(w));
check('Physics: 3 h of "Physics"/"physics" + 1 h of a session tagged Physics = 4 h of 8 → ahead of the 2.95 h expected → On track', row('Physics').done === 240 && row('Physics').goal === 480 && row('Physics').st === 'ontrack' && row('Physics').exp === 177, JSON.stringify(row('Physics')));
check('Chemistry (target since last week): nothing this week, last week fell 4 h short of 6 → carried over: goal 10 h, Behind', row('Chemistry').done === 0 && row('Chemistry').target === 360 && row('Chemistry').carry === 240 && row('Chemistry').goal === 600 && row('Chemistry').st === 'behind' && row('Chemistry').behindBy === Math.round(600 * ((WED - new Date(2026, 9, 26)) / (7 * 864e5))), JSON.stringify(row('Chemistry')));
check('Maths: 30 min of 4 h, expected ~1.5 h → Behind; Biology: brand new target (no carry-over), nothing done → Behind', row('Maths').st === 'behind' && row('Biology').carry === 0 && row('Biology').st === 'behind', JSON.stringify([row('Maths'), row('Biology')]));
const card = await G.ev(() => ({ rows: $$('#planSlot .plan-row').length, behind: $$('#planSlot .plan-row.st-behind').length, ok: $$('#planSlot .plan-row.st-ontrack').length, marker: $$('#planSlot .plan-bar em').length, carry: /\+4h/.test($('#planSlot').textContent), head: $('#planSlot .desc').textContent }));
check('The card: four rows, bars with an expected-by-now marker, statuses, the carry-over shown, the week range and totals in the header', card.rows === 4 && card.behind === 3 && card.ok === 1 && card.marker === 4 && card.carry && /(26 Oct|Oct 26) – (1 Nov|Nov 1)/.test(card.head) && /4h 30m/.test(card.head) && /5 days left/.test(card.head), JSON.stringify(card));
// ---------- 3. Today card ----------
await G.ev(() => showTab('timer')); await G.ctx.clock.runFor(300);
const today = await G.ev(() => ({ line: ($('#todayExtra .today-plan') || {}).textContent, btn: $('#todayExtra [data-goplan]') && $('#todayExtra [data-goplan]').dataset.goplan }));
check('Today card names the most-behind subject (Chemistry, 3.7 h) with a one-tap "Focus on Chemistry"', /Chemistry/.test(today.line) && /behind/.test(today.line) && today.btn === 'Chemistry', JSON.stringify(today));
await closeAll(G); await G.p.click('#todayExtra [data-goplan]'); await G.ctx.clock.runFor(300);
check('…which loads the subject into the session name', await G.ev(() => S.ui.tab === 'timer' && $('#nameInput').value === 'Chemistry'));
// a done subject and an all-on-track line
await G.ev(() => { const st = new Date(2026, 9, 27, 15, 0, 0).getTime(); for (const [n, m] of [['Chemistry', 600], ['Maths', 200], ['Biology', 100]]) S.sessions.push({ id: 'q' + n, name: n, start: st, end: st + m * 60000, duration: m * 60000, planned: m * 60000, preset: 'x' }); save(); renderToday(); });
check('With every subject on track (Chemistry done), the Today line says so', await G.ev(() => /on track|done/.test(($('#todayExtra .today-plan') || {}).textContent || '') && planWeek().list.find(r => r.name === 'Chemistry').status === 'done'));
// ---------- 4. week start + rollover ----------
await G.ev(() => { S.settings.weekStart = 0; save(); });
const sun = await G.ev(() => { const w = planWeek(); return { from: dayKey(w.from), to: dayKey(w.to) }; });
check('"Week starts on Sunday" moves the plan week to Sun 25 Oct – Sat 31 Oct', sun.from === '2026-10-25' && sun.to === '2026-11-01', JSON.stringify(sun));
await G.ev(() => { S.settings.weekStart = 1; save(); showTab('stats'); });
await G.ctx.clock.setFixedTime(new Date(2026, 10, 2, 9, 0, 0));   // Monday 2 Nov: a new week
await G.ctx.clock.runFor(2000);
const next = await G.ev(() => { const w = planWeek(); return { from: dayKey(w.from), phys: w.list.find(r => r.name === 'Physics'), chem: w.list.find(r => r.name === 'Chemistry'), card: $('#planSlot .desc').textContent }; });
check('Next week: a fresh week; Physics fell 4 h short of 8 → carried over (goal 12 h); Chemistry was done → no carry-over; the card re-drew at midnight', next.from === '2026-11-02' && next.phys.carry === 240 && next.phys.goal === 720 && next.chem.carry === 0 && /(2 Nov|Nov 2) – (8 Nov|Nov 8)/.test(next.card), JSON.stringify(next));
check('Carry-over is capped at the target itself (a week with nothing done at most doubles the next target)', await G.ev(() => { const w = planWeek(); const m = w.list.find(r => r.name === 'Maths'); return m.carry <= m.target && w.list.every(r => r.carry <= r.target); }));
// ---------- 5. edit: upsert + remove (tombstone) ----------
await G.ev(() => openPlanDlg());
await G.ev(() => { const rows = $$('#plRows .pl-row'); rows[3].remove(); rows[0].querySelector('[name="hrs"]').value = '10'; rows[0].querySelector('[name="name"]').value = 'PHYSICS'; });
await G.p.click('#plSave'); await G.ctx.clock.runFor(300);
const ed = await G.ev(() => ({ n: S.plan.length, phys: S.plan.find(p => p.name === 'PHYSICS'), id0: S.plan[0].id, tomb: Object.keys(S.tomb).filter(k => k.startsWith('plan:')).length, bio: S.plan.some(p => p.name === 'Biology') }));
check('Editing keeps the subject’s id (renaming case / changing hours updates in place); a removed subject is gone and tombstoned', ed.n === 3 && ed.phys && ed.phys.hrs === 10 && ed.phys.id.startsWith('pn') && ed.tomb === 1 && !ed.bio, JSON.stringify(ed));
check('Hours are kept to 0.5–60 in half-hour steps', await G.ev(() => { savePlan([{ name: 'Art', hrs: '0.1' }, { name: 'Big', hrs: '99' }, { name: 'Half', hrs: '2.26' }]); const h = Object.fromEntries(S.plan.map(p => [p.name, p.hrs])); return h.Art === 0.5 && h.Big === 60 && h.Half === 2.5; }));
// ---------- 6. export / import ----------
const exp = await G.ev(() => { const { timer, ui, pendingSessions, profileDirty, ...data } = S; return JSON.parse(JSON.stringify(data)); });
const G2 = await guest();
check('A backup carries the plan; importing twice doubles nothing', await G2.ev(e => { mergeData(e); mergeData(e); return S.plan.length === 3 && S.plan.some(p => p.name === 'Half'); }, exp));
await G2.ctx.close();
// ---------- 7. demo ----------
const D = await guest(1280, { noLogin: true });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeAll(D);
await D.ev(() => showTab('stats')); await wait(500);
const demo = await D.ev(() => ({ n: planOf().length, rows: $$('#planSlot .plan-row').length, done: planWeek().doneTotal > 0, today: !!$('#todayExtra .today-plan') }));
await closeAll(D); await D.p.click('#planSlot [data-planedit]'); await wait(300); await D.p.click('#plSave'); await wait(300);
check('Demo: a four-subject plan with real progress from the sample sessions; saving shows the demo prompt', demo.n === 4 && demo.rows === 4 && demo.done && demo.today && (await D.ev(() => !!document.querySelector('dialog[open] #pvWhy') && planOf().length === 4)), JSON.stringify(demo));
await D.ctx.close();
// ---------- 8. phone ----------
const P = await guest(360);
await P.ev(() => { savePlan([{ name: 'Physics', hrs: 8 }, { name: 'A very long subject name that goes on', hrs: 3 }]); showTab('stats'); }); await wait(900);
const ph = await P.ev(() => ({ hscroll: document.documentElement.scrollWidth > innerWidth + 1, rows: $$('#planSlot .plan-row').length, overflow: $$('#planSlot .plan-row').some(r => r.scrollWidth > r.clientWidth + 1) }));
await closeAll(P); await P.p.click('#planSlot [data-planedit]'); await wait(300);
const ph2 = await P.ev(() => { const d = $('#planDlg').getBoundingClientRect(); return { fits: $('#planDlg').open && d.right <= innerWidth + 1, btn: $$('#planDlg button').every(b => b.getBoundingClientRect().height >= 40) }; });
check('360px: the plan card stacks (no sideways scroll, no overflowing rows) and the dialog fits', !ph.hscroll && ph.rows === 2 && !ph.overflow && ph2.fits && ph2.btn, JSON.stringify({ ph, ph2 }));
await P.ctx.close();
await G.ctx.close();
// ---------- 9. two devices ----------
const A = await device('A', 1200), U = 'pl_' + R;
await signup(A, U);
const uid = await A.ev(() => USER.uid);
const A2 = await device('A2', 1200);
await A2.p.goto('http://localhost:8000/index.html?emulator=1'); await A2.p.waitForSelector('#authView:not(.hidden)');
await A2.p.click('[data-mode=login] >> visible=true'); await A2.p.fill('#authUser', U); await A2.p.fill('#authPass', 'secret12'); await A2.p.click('#authSubmit');
await A2.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(A2);
await A.ev(() => savePlan([{ name: 'Physics', hrs: 6 }, { name: 'Maths', hrs: 5 }]));
const seen = await until(A2, () => S.plan.length === 2 && S.plan.some(p => p.name === 'Maths' && p.hrs === 5), null, 15000);
check('A sets a plan → A2 has it', seen >= 0, `${seen} ms`);
await A2.ev(() => savePlan([{ name: 'Physics', hrs: 9 }]));
const upd = await until(A, () => S.plan.length === 1 && S.plan[0].hrs === 9, null, 15000);
check('A2 changes Physics and drops Maths → A sees 9 h and Maths gone (tombstone)', upd >= 0 && (await A.ev(() => Object.keys(S.tomb).some(k => k.startsWith('plan:')))));
const cloud = await ownerGet('users/' + uid);
check('The profile document holds the plan (nothing outside users/{uid})', Array.isArray(cloud.plan) && cloud.plan.length === 1 && cloud.plan[0].v === 1, JSON.stringify(cloud.plan));
log('errors', JSON.stringify(errs.filter(e => !/permission|offline|Could not reach|unavailable|WebChannel|transport/i.test(e))));
log('failures', failCount());
await b.close();
process.exit(failCount() ? 1 : 0);
