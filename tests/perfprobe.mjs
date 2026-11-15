// Load time, tab-switch time and Garden frame rate with a big history (3,000 sessions over 2 years + 16 plants + 1,200 cards),
// as a guest (no network in the way). Usage: node perf115.mjs <page.html> [label] [throttle]
import { chromium } from 'playwright';
const page = process.argv[2] || 'index.html', label = process.argv[3] || page, throttle = +(process.argv[4] || 1), W = +(process.env.W || 1280), process_probe = process.env.PROBE || '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const runs = [];
for (let i = 0; i < 2; i++) {
  const ctx = await b.newContext({ viewport: { width: W, height: W < 500 ? 844 : 860 }, hasTouch: W < 500, isMobile: W < 500 });
  await ctx.addInitScript(() => {
    localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now()));
    localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9');
    const now = Date.now(), sessions = [], subjects = ['Physics', 'Maths', 'Chemistry', 'English', 'Biology'];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let d = 1; d <= 730; d++) for (let k = 0; k < 4; k++) { if (rnd() < 0.05) continue; const st = now - d * 864e5 + (9 + k * 3) * 3600e3, mins = [25, 50, 90][Math.floor(rnd() * 3)];
      sessions.push({ id: 's' + d + '_' + k, name: subjects[(d + k) % 5], start: st, end: st + mins * 60000, duration: mins * 60000, planned: mins * 60000, preset: 'Classic 25/5' }); }
    // 1.15 data (ignored by older builds): a full garden and a big card collection
    const plants = [], gbuys = [], cards = [], decks = [{ id: 'd1', v: 1, name: 'Physics', subject: 'Physics', at: now - 30 * 864e5, u: now - 30 * 864e5 }, { id: 'd2', v: 1, name: 'Chemistry', subject: 'Chemistry', at: now - 30 * 864e5, u: now - 30 * 864e5 }];
    const sp = ['tomato', 'sunflower', 'carrot', 'pumpkin', 'rose', 'strawberry', 'chilli', 'lavender'];
    for (let k = 0; k < 16; k++) { const w = {}; for (let j = 0; j < 20; j++) w['s' + (j + 1) + '_' + (k % 4)] = 25; gbuys.push({ id: 'b' + k, v: 1, item: 'seed_' + sp[k % 8], price: 0, at: now - (40 - k) * 864e5, u: now - (40 - k) * 864e5 });
      plants.push({ id: 'p' + k, v: 1, sp: sp[k % 8], plot: k, seed: 'b' + k, at: now - (40 - k) * 864e5, sk: 5, w, wt: 500, u: now - 864e5 }); }
    for (let k = 0; k < 1200; k++) cards.push({ id: 'c' + k, v: 1, deck: k % 2 ? 'd1' : 'd2', f: 'Question number ' + k + ' about a topic with a reasonably long text so the card is realistic', b: 'Answer ' + k + ' — a line or two of explanation that a student would write', at: now - 20 * 864e5, u: now - 20 * 864e5, due: now - 864e5, iv: 1, n: 2, ease: 2.5 });
    // 1.16 data (ignored by older builds): 400 harvests with weights and weather mutations, eggs, a pet out, a look bought
    const harvested = []; for (let k = 0; k < 400; k++) harvested.push({ id: 'hv' + k, v: 1, sp: sp[k % 8], plot: -1, seed: '', at: now - (400 - k) * 3600e3 * 6, sk: 3, wt: 90, fin: 'x', fd: 50, h: now - (400 - k) * 3600e3 * 5, y: 4 + (k % 7), m: k % 9 === 0 ? 'golden' : '', ...(k % 5 === 0 ? { wm: ['shocked'] } : {}), ...(k % 40 === 0 ? { giant: 1 } : {}), kg: .1 + (k % 10) / 20, u: now - 864e5 });
    const eggs = [{ id: 'egg1', v: 1, kind: 'common', src: 'focus', at: now - 40 * 864e5, need: 300, w: { s1_0: 300 }, h: now - 30 * 864e5, pet: 'bunny', hs: 's1_0' }, { id: 'egg2', v: 1, kind: 'common', src: 'focus', at: now - 30 * 864e5, need: 300, w: Object.fromEntries(Array.from({ length: 10 }, (_, j) => ['s' + (j + 2) + '_1', 25])) }];
    gbuys.push({ id: 'lk1', v: 1, item: 'av_pumpkin', price: 35, at: now - 2 * 864e5, u: now - 2 * 864e5, ok: 1 });
    localStorage.setItem('focus-app-v1', JSON.stringify({ sessions, plants: [...plants, ...harvested], gbuys, cards, decks, eggs, petPrefs: { p1: { v: 'bunny', u: now - 20 * 864e5 } }, settings: { goalMin: 120 } }));
  });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const t0 = Date.now();
  await p.goto('http://localhost:8000/' + page);
  await p.waitForSelector('#authView:not(.hidden)');
  await p.click('#guestBtn');
  await p.waitForSelector('#appView:not(.hidden)');
  await p.waitForFunction(() => document.querySelector('#todayText') && S.sessions.length > 100);
  const load = Date.now() - t0;
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  await p.evaluate(probe => {
    if (probe.includes('nopeek')) { window.renderGardenPeek = () => { const el = document.getElementById('gardenPeek'); if (el) { el.classList.add('hidden'); el.innerHTML = ''; } }; renderGardenPeek(); }
    if (probe.includes('nolife')) { const st = document.createElement('style'); st.textContent = '.gd-life{display:none!important}'; document.head.appendChild(st); }
    if (probe.includes('nosway')) { const st = document.createElement('style'); st.textContent = '.gd-plant svg, .gd-plant, .gd-pet, .gd-visitor{animation:none!important}'; document.head.appendChild(st); }
    if (probe.includes('reduced')) { S.settings.motion = 'reduced'; if (typeof applyMotion === 'function') applyMotion(); document.documentElement.dataset.motion = 'reduced'; }
  }, process_probe);
  const n = await p.evaluate(() => S.sessions.length);
  const tabs = await p.evaluate(() => {
    const out = {}, list = ['stats', 'quests', 'reminders', 'friends', 'clan', 'profile', 'board', 'shop', 'timer', ...(typeof gardenPlant === 'function' ? ['garden', 'room'] : []), 'stats', 'timer'];
    for (const t of list) { const a = performance.now(); showTab(t); out[t] = (out[t] || 0) + Math.round((performance.now() - a) * 10) / 10; }
    return out;
  });
  // Frame rate for 2 s per screen with the timer running (and a trail equipped where the build supports it).
  const fps = {};
  for (const tab of ['timer', 'stats', ...(await p.evaluate(() => typeof gardenPlant === 'function')) ? ['garden'] : []]) {
    fps[tab] = await p.evaluate(async tab => {
      showTab(tab);
      if (typeof gardenPlant === 'function') { S.game.purchases.pf1 = { item: 'trail_sparks', price: 0, at: Date.now() }; S.game.equipped.trail = 'trail_sparks'; G = null; if (typeof applyRingStyle === 'function') applyRingStyle(); }
      if (S.timer.status !== 'running') { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); }
      await new Promise(r => setTimeout(r, 300));
      const frames = []; let last = performance.now();
      await new Promise(res => { const t0 = performance.now(); const step = () => { const t = performance.now(); frames.push(t - last); last = t; if (t - t0 < 2000) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
      frames.shift(); frames.sort((a, b) => a - b);
      const avg = frames.reduce((a, x) => a + x, 0) / frames.length;
      return { fps: Math.round(1000 / avg), p95: Math.round(frames[Math.floor(frames.length * .95)] * 10) / 10, long: frames.filter(f => f > 50).length };
    }, tab);
  }
  const mem = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1);
  runs.push({ load, n, tabs, fps, mem });
  await ctx.close();
}
const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const tabs = Object.keys(runs[0].tabs);
console.log(`${label} sessions: ${runs[0].n}${throttle > 1 ? ` · CPU ×${throttle} slower` : ''}`);
console.log(`${label} load (goto → app with data), median of ${runs.length}: ${med(runs.map(r => r.load))} ms`);
console.log(`${label} tab switch (ms, median): ` + tabs.map(t => `${t} ${med(runs.map(r => r.tabs[t]))}`).join(' · '));
for (const tab of Object.keys(runs[0].fps)) console.log(`${label} ${tab} frames (2 s, timer running): ${med(runs.map(r => r.fps[tab].fps))} fps · p95 frame ${med(runs.map(r => r.fps[tab].p95))} ms · frames > 50 ms: ${med(runs.map(r => r.fps[tab].long))}`);
console.log(`${label} JS heap ${med(runs.map(r => r.mem))} MB`);
await b.close();
