// v1.17 Phase 1.3 — animation audit: frame gaps, long tasks, re-render rate and animations that restart on their own.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg } from './cl-common.mjs';
const A = await device('A', 1280);
await signup(A, 'an_' + Date.now().toString(36).slice(-5));
await closeDlg(A);
await A.ev(() => { window.__ra = 0; const ra = renderAll; renderAll = (...a) => { __ra++; return ra(...a); }; window.__rt = 0; const rt = renderTimer; renderTimer = (...a) => { __rt++; return rt(...a); }; });
const sample = () => A.ev(() => { window.__ak = window.__ak || 0; return document.getAnimations().filter(a => a.playState === 'running').map(a => { const el = a.effect && a.effect.target; if (el && !el.dataset.ak) el.dataset.ak = String(++__ak); return { k: (el ? el.dataset.ak : '?') + ':' + (a.animationName || a.transitionProperty || 'anim'), st: a.startTime, inf: a.effect && a.effect.getTiming().iterations === Infinity }; }); });
const restarted = (s1, s2) => { const m = new Map(s1.filter(x => x.inf).map(x => [x.k, x.st])); return s2.filter(x => x.inf && m.has(x.k) && Math.abs(m.get(x.k) - x.st) > 1).map(x => x.k); };
const frames = () => A.ev(() => new Promise(res => { const gaps = []; let last = performance.now(), n = 0; const step = t => { gaps.push(t - last); last = t; if (++n < 150) requestAnimationFrame(step); else { gaps.sort((a, b) => a - b); res({ p50: gaps[Math.floor(gaps.length * .5)], p95: gaps[Math.floor(gaps.length * .95)], max: gaps[gaps.length - 1], over50: gaps.filter(g => g > 50).length }); } }; requestAnimationFrame(step); }));
const results = {};
for (const [tab, run] of [['timer', false], ['timer', true], ['stats', false], ['garden', false], ['profile', false]]) {
  await A.ev(([tab, run]) => { showTab(tab); if (run && S.timer.status !== 'running') { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); } }, [tab, run]);
  await wait(1200);
  const ra0 = await A.ev(() => ({ ra: __ra, rt: __rt }));
  const s1 = await sample(); await wait(1500); const s2 = await sample();
  const ra1 = await A.ev(() => ({ ra: __ra, rt: __rt }));
  const f = await frames();
  results[tab + (run ? '+running' : '')] = { restarted: restarted(s1, s2), renderAllPerSec: (ra1.ra - ra0.ra) / 1.5, renderTimerPerSec: (ra1.rt - ra0.rt) / 1.5, ...f, anims: s2.length };
}
log(JSON.stringify(results, null, 1));
for (const [k, v] of Object.entries(results)) {
  check(`${k}: no running animation restarts by itself`, v.restarted.length === 0, JSON.stringify(v.restarted));
  check(`${k}: no full re-render while idle (renderAll ≤ 0.5/s)`, v.renderAllPerSec <= 0.5, v.renderAllPerSec);
}
// frame gaps are judged on a phone-sized context (headless desktop Chromium throttles requestAnimationFrame to ~20 fps)
const P = await device('P', 390);
await P.p.goto('http://localhost:8000/index.html?emulator=1'); await P.p.waitForSelector('#authView:not(.hidden)');
await P.p.click('[data-mode=login] >> visible=true'); await P.p.fill('#authUser', await A.ev(() => USER.username)); await P.p.fill('#authPass', 'secret12'); await P.p.click('#authSubmit');
await P.p.waitForSelector('#appView:not(.hidden)'); await wait(2500); await closeDlg(P);
const pframes = () => P.ev(() => new Promise(res => { const gaps = []; let last = performance.now(), n = 0; const step = t => { gaps.push(t - last); last = t; if (++n < 150) requestAnimationFrame(step); else { gaps.sort((a, b) => a - b); res({ p50: gaps[Math.floor(gaps.length * .5)], p95: gaps[Math.floor(gaps.length * .95)], max: gaps[gaps.length - 1] }); } }; requestAnimationFrame(step); }));
for (const [tab, run] of [['timer', true], ['stats', false], ['garden', false], ['profile', false]]) {
  await P.ev(([tab, run]) => { showTab(tab); if (run && S.timer.status !== 'running') { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); } }, [tab, run]); await wait(1000);
  const f = await pframes();
  log(`phone ${tab}${run ? ' (timer running)' : ''}: frame gaps (informational — headless Chromium throttles requestAnimationFrame; the real frame rate is measured by perf117.mjs on one page with CPU throttling)`, JSON.stringify(f));
}
// a save of our own must not come back as a full redraw (the echo of the upload is recognised)
const echo = await A.ev(async () => { showTab('timer'); const n0 = __ra; S.settings.waterNudge = !S.settings.waterNudge; save(); await new Promise(r => setTimeout(r, 3000)); return { redraws: __ra - n0, synced: $('#syncStatus b').textContent }; });
check('A save of our own does not come back as a full redraw (no renderAll within 3 s of the upload)', echo.redraws === 0 && /Synced/.test(echo.synced), JSON.stringify(echo));
// the streak flame's flare survives the renders that follow a completed block
const flare = await A.ev(async () => { const d = startOfDay(new Date()); S.sessions = []; S.settings.goalMin = 20; for (let n = 2; n >= 1; n--) { const st = d.getTime() - n * 864e5 + 9 * 3600e3; S.sessions.push({ id: 'fl' + n, name: 'x', start: st, end: st + 25 * 60000, duration: 25 * 60000, planned: 25 * 60000 }); } G = null; renderToday(); const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 25 * 60000; t.focusStartedAt = Date.now() - 25 * 60000; t.endAt = Date.now(); finishPhase('complete'); renderToday(); renderAll(); await new Promise(r => setTimeout(r, 300)); return { flare: !!document.querySelector('#curStreak .flame.flare'), roll: !!document.querySelector('#curStreak .sn.roll'), n: $('#curStreak .sn').textContent }; });
check('The streak flare and number roll are still on 300 ms after the block (later renders do not rebuild the flame)', flare.flare && flare.roll && flare.n === '3', JSON.stringify(flare));
// digits: a slot never holds more than one leaving digit, and the ring has no CSS transition fighting the per-frame draw
await A.ev(() => { showTab('timer'); if (S.timer.status !== 'running') { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); } }); await wait(800);
const dg = await A.ev(() => { const out = []; const t0 = performance.now(); return new Promise(res => { const iv = setInterval(() => { out.push(Math.max(0, ...[...document.querySelectorAll('#timeText .dg')].map(s => s.querySelectorAll('.dc.out').length))); if (performance.now() - t0 > 2200) { clearInterval(iv); res({ maxOut: Math.max(...out), ringTr: getComputedStyle($('#ringProg')).transitionProperty, ringDur: getComputedStyle($('#ringProg')).transitionDuration, live: $('#ring').classList.contains('ring-live') }); } }, 50); }); });
check('Ticking digits: at most one leaving digit per slot; the ring is drawn per frame without a CSS transition on the same property', dg.maxOut <= 1 && !/stroke-dashoffset|all/.test(dg.ringTr) && dg.live, JSON.stringify(dg));
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
