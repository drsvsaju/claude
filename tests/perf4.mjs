// v2.0 phase 4 — performance numbers for one build on the demo account, optionally as a large account.
//   node perf4.mjs <page> [--big] [--throttle 4] [--phone] [--tag name]
// Prints one JSON line: start-up, every tab switch (median of 5, to the next frame), DOM size per tab, the slowest
// interactions by the browser's own Event Timing (what INP is made of), long tasks, frame rate, memory.
// Nothing is written: it is the read-only demo, made bigger by tools/bigacct.js when --big is given.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const BIG = [new URL('./tools/bigacct.js', import.meta.url).pathname, new URL('./bigacct.js', import.meta.url).pathname].find(f => fs.existsSync(f));
const wait = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), page = args[0], has = f => args.includes(f), val = f => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const big = has('--big'), phone = has('--phone'), rate = +(val('--throttle') || 1);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext(phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => { try { localStorage.setItem('pomodorolist-intro-seen', '1'); } catch (e) {} });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
const cdp = await ctx.newCDPSession(p);
const t0 = Date.now();
await p.goto('http://localhost:8000/' + page); await p.waitForSelector('#authView:not(.hidden)');
const out = { page, big, phone, throttle: rate, welcomeMs: Date.now() - t0 };
if (big) { await p.addScriptTag({ path: BIG }); await p.evaluate(() => bigAccount()); }
// The demo builds its sample data when it opens, replaying the history once per session to date its claims (quadratic:
// 8 s for the large account). A real account reads stored documents instead, so the data is built before the clock starts.
await p.evaluate(() => { const d = demoDocs(); window.demoDocs = () => d; });
if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
// ---- start-up: from "open the account" to the first frame of the app, and the long tasks of the first 4 s ----
Object.assign(out, await p.evaluate(async () => {
  window.__long = []; window.__ev = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__ev.push([e.name, Math.round(e.startTime), Math.round(e.duration), Math.round(e.processingStart - e.startTime), Math.round(e.processingEnd - e.processingStart)]); }).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (e) {}
  const t = performance.now(); startPreview();
  await new Promise(r => { const tick = () => (!document.querySelector('#appView').classList.contains('hidden') ? requestAnimationFrame(() => setTimeout(r, 0)) : setTimeout(tick, 4)); tick(); });
  const start = performance.now() - t;
  await new Promise(r => setTimeout(r, 4000));
  const lt = window.__long.filter(x => x[0] >= t);
  return { startMs: Math.round(start), startLongTasks: lt.length, startLongMs: lt.reduce((a, x) => a + x[1], 0), startLongMax: Math.max(0, ...lt.map(x => x[1])), sessions: S.sessions.length, plants: (S.plants || []).length };
}));
await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await wait(500);
// ---- every tab: switch time (showTab + the frame after it), DOM size ----
const TABS = ['timer', 'reminders', 'stats', 'garden', 'quests', 'profile', 'friends', 'posts', 'sessions', 'clan', 'board', 'shop', 'bag', 'room', 'settings', 'about'];
out.tabs = await p.evaluate(async TABS => {
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1], frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const res = {};
  for (const tab of TABS) {
    if (!document.querySelector('#tab-' + tab)) continue;
    const ts = [], sy = [];
    for (let i = 0; i < 5; i++) { showTab(tab === 'timer' ? 'about' : 'timer'); await frame(); await frame(); const t = performance.now(); showTab(tab); sy.push(performance.now() - t); await frame(); ts.push(performance.now() - t); }
    await new Promise(r => setTimeout(r, 350));   // lists that fill in after the first frame
    res[tab] = { ms: +med(ts).toFixed(1), sync: +med(sy).toFixed(1), nodes: document.querySelector('#tab-' + tab).querySelectorAll('*').length };
  }
  showTab('timer'); await frame();
  return res;
}, TABS);
out.nodesAll = await p.evaluate(() => document.querySelectorAll('*').length);
// ---- interactions, measured by the browser (Event Timing): the tab buttons, then every sub-view switch on every tab ----
const inter = [];
const evMax = async (label, act) => {
  const from = await p.evaluate(() => performance.now());
  try { await act(); } catch (e) { return; }
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120)))));
  const ev = await p.evaluate(f => window.__ev.filter(e => e[1] >= f - 1 && /^(pointerup|click|keydown|keyup|pointerdown|mouseup|mousedown|input)$/.test(e[0])), from);
  if (ev.length) { const m = ev.reduce((a, e) => (e[2] > a[2] ? e : a)); inter.push({ label, ms: m[2], type: m[0], delay: m[3], handler: m[4] }); } else inter.push({ label, ms: 8, type: '-', delay: 0, handler: 0 });
};
for (const tab of TABS) {
  const navSel = phone ? null : `#tabs [data-tab="${tab}"]`;
  if (navSel && await p.locator(navSel).first().isVisible().catch(() => false)) await evMax('nav:' + tab, () => p.click(navSel, { timeout: 3000 }));
  else await p.evaluate(t => showTab(t), tab);
  await wait(250);
  const n = await p.evaluate(tab => { const bs = [...document.querySelectorAll(`#tab-${tab} .seg button, #tab-${tab} [role="tab"]`)].filter(e => e.offsetParent && !e.disabled); bs.forEach((e, i) => e.setAttribute('data-perf-i', i)); return Math.min(bs.length, 10); }, tab);
  for (let i = 0; i < n; i++) {
    const sel = `#tab-${tab} [data-perf-i="${i}"]`;
    if (!(await p.locator(sel).first().isVisible().catch(() => false))) continue;
    const name = await p.locator(sel).first().innerText().catch(() => '');
    await evMax(`${tab} › ${name.replace(/\s+/g, ' ').trim().slice(0, 24)}`, () => p.click(sel, { timeout: 2000 }));
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  }
}
// typing in the session name and the command palette
await p.evaluate(() => showTab('timer')); await wait(200);
if (await p.locator('#taskInput').isVisible().catch(() => false)) await evMax('type: session name', async () => { await p.click('#taskInput'); await p.keyboard.type('Organic chem', { delay: 30 }); });
if (!phone) await evMax('palette: open + type', async () => { await p.keyboard.press('Escape'); await p.keyboard.press('Control+k'); await wait(150); await p.keyboard.type('stat', { delay: 30 }); });
await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
inter.sort((a, c) => c.ms - a.ms);
out.interactions = inter.length; out.inpWorst = inter.slice(0, 8); out.inpP98 = inter.length ? inter[Math.min(inter.length - 1, Math.floor(inter.length * 0.02))].ms : 0; out.over200 = inter.filter(x => x.ms > 200).length; out.over100 = inter.filter(x => x.ms > 100).length;
// ---- frames: a running timer for 3 s, then scrolling the longest page for 2 s ----
out.frames = await p.evaluate(async () => {
  const count = ms => new Promise(r => { let n = 0, slow = 0, last = performance.now(); const t0 = last, f = t => { n++; if (t - last > 50) slow++; last = t; if (t - t0 < ms) requestAnimationFrame(f); else r({ fps: Math.round(n / ((t - t0) / 1000)), slow }); }; requestAnimationFrame(f); });
  const res = {};
  showTab('timer'); await new Promise(r => setTimeout(r, 300));
  try { if (S.timer.status !== 'running') startTimer(); } catch (e) {}
  res.timerRunning = await count(3000);
  try { document.querySelector('#resetBtn').click(); } catch (e) {}
  let best = 'stats', h = 0;
  for (const t of ['stats', 'sessions', 'garden', 'profile', 'friends', 'posts', 'reminders', 'settings']) { showTab(t); await new Promise(r => setTimeout(r, 250)); if (document.documentElement.scrollHeight > h) { h = document.documentElement.scrollHeight; best = t; } }
  showTab(best); await new Promise(r => setTimeout(r, 300)); scrollTo(0, 0);
  const sc = new Promise(r => { let n = 0, slow = 0, last = performance.now(); const t0 = last, f = t => { n++; if (t - last > 50) slow++; last = t; scrollBy(0, 60); if (t - t0 < 2000) requestAnimationFrame(f); else r({ fps: Math.round(n / ((t - t0) / 1000)), slow, tab: best, height: h }); }; requestAnimationFrame(f); });
  res.scroll = await sc; scrollTo(0, 0); showTab('timer');
  return res;
});
out.longTasksAll = await p.evaluate(() => ({ n: window.__long.length, max: Math.max(0, ...window.__long.map(x => x[1])) }));
out.heapMB = await p.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null));
out.errors = errs.slice(0, 4);
if (val('--tag')) out.tag = val('--tag');
console.log(JSON.stringify(out));
await b.close();
