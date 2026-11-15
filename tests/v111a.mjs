// v1.11 audio: every sound type plays, recovers from suspended / Safari "interrupted", settings stay independent.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=user-gesture-required'] });
const U = 'http://localhost:8000/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [], audioWarn = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.addInitScript(() => {
  if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', 1);
    for (const [k, v] of Object.entries({ 'pomodorolist-guest': '1', 'pomodorolist-tour-done': '1', 'pomodorolist-onboarded:guest': '1', 'pomodorolist-seen-version': '9', 'pomodorolist-calm': '0' })) localStorage.setItem(k, v);
    const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); }
  // count every sound source that starts (oscillators and buffer sources)
  window.__starts = 0;
  const orig = AudioScheduledSourceNode.prototype.start;
  AudioScheduledSourceNode.prototype.start = function (...a) { window.__starts++; return orig.apply(this, a); };
});
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
const p = await ctx.newPage();
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (/audio|AudioContext|sound/i.test(m.text()) && (m.type() === 'error' || m.type() === 'warning')) audioWarn.push(m.type() + ': ' + m.text().slice(0, 140)); });
await p.goto(U); await p.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 8000 });
const ev = (f, a) => p.evaluate(f, a);
log('before any tap: audio context', await ev(() => audioCtx ? audioCtx.state : 'not created'));
await p.mouse.click(640, 120); await wait(300);   // a harmless tap on the page
log('after the first tap:', await ev(() => audioCtx && audioCtx.state));
const plays = async (label, fn, ms = 400) => { const a = await ev(() => window.__starts); await ev(fn); await wait(ms); const n = await ev(() => window.__starts) - a; log(`  ${n ? '✓' : '✗'} ${label}: ${n} sound sources`); return n; };
log('every sound type:');
await plays('interface click', () => { UIS.last.click = 0; uiSound('click', { always: true }); }, 900);   // hover sounds wait until other interface sounds are done (by design)
await plays('interface hover', () => { UIS.last.hover = 0; UIS.prefs.hover = true; return uiSound('hover'); });
await ev(() => { S.game.purchases.t1 = { item: 'amb_rain', price: 0, at: 1 }; S.game.purchases.t2 = { item: 'x_startcue', price: 0, at: 1 }; G = null; S.game.equipped.ambient = 'amb_rain'; });
await plays('timer start (button)', () => $('#mainBtn').click());
log('  ambient while focusing:', await ev(() => amb ? `${amb.id} gain→${amb.master.gain.value.toFixed(3)}` : 'none'), '| end chime booked for the exact end:', await ev(() => ENDS.bus ? `${(ENDS.at - audioCtx.currentTime).toFixed(1)}s vs timer ${((S.timer.endAt - Date.now()) / 1000).toFixed(1)}s` : 'NOT booked'));
await plays('timer pause (button)', () => $('#mainBtn').click());
log('  after pause: ambient', await ev(() => amb ? 'still on' : 'stopped'), '| booked chime', await ev(() => ENDS.bus ? 'still booked' : 'cancelled'));
await ev(() => $('#mainBtn').click()); await wait(200);
await ev(() => { S.timer.endAt = Date.now() + 1500; syncTimerAudio(); });
const a0 = await ev(() => window.__starts); await wait(2600);
log(`  timer end: chime rang once on time (booked ${await ev(() => ENDS.endAt ? 'yes' : 'cleared')}), sources since: ${await ev(() => window.__starts) - a0}, ambient after the block: ${await ev(() => amb ? 'STILL PLAYING' : 'stopped')}`);
await plays('reward (coin)', () => { UIS.last.coin = 0; uiSound('coin', { always: true }); });
await plays('reminder chime', () => playReminderChime());
await plays('level/tier chord', () => playTierChord());
// shop previews: never stack
await ev(() => showTab('shop')); await wait(300);
const pv = await ev(async () => { const ids = ['snd_chime', 'snd_bell', 'snd_bowl', 'snd_piano', 'snd_rain']; const buses = []; for (const id of ids) { previewSound(id); await new Promise(r => setTimeout(r, 60)); buses.push(PREVIEW.bus); } await new Promise(r => setTimeout(r, 300)); return { live: PREVIEW.bus === buses.at(-1), stopped: buses.slice(0, -1).every(b => b && b.gain.value < 0.05) }; });
log('shop previews tapped 5× quickly: only the last one plays:', pv.live && pv.stopped, JSON.stringify(pv));
const ap = await ev(async () => { previewAmbient('amb_rain'); await new Promise(r => setTimeout(r, 200)); const first = amb; previewAmbient('amb_rain'); await new Promise(r => setTimeout(r, 400)); return { one: amb !== first, firstFaded: first.master.gain.value < 0.2 }; });
log('ambient preview twice: previous stopped:', ap.one && ap.firstFaded);
// seamless loop
log('ambient loop seam (brown noise): jump at the seam vs an average step:', await ev(() => { const d = noiseBuffer('brown').getChannelData(0); let s = 0; for (let i = 1000; i < 21000; i++) s += Math.abs(d[i] - d[i - 1]); return `${Math.abs(d[d.length - 1] - d[0]).toFixed(4)} vs ${(s / 20000).toFixed(4)}`; }));
// suspended (any browser after sleep) → resumes and plays
await ev(() => audioCtx.suspend()); await wait(200);
log('context suspended →', await ev(() => audioCtx.state));
await plays('reminder chime while suspended', () => playReminderChime(), 700);
log('  state now:', await ev(() => audioCtx.state));
// Safari's "interrupted": state reads "interrupted" until resume() is called
await ev(() => { const c = audioCtx; let fake = 'interrupted'; Object.defineProperty(c, 'state', { configurable: true, get: () => fake }); const r = c.resume.bind(c); c.resume = () => r().then(() => { fake = 'running'; c.onstatechange && c.onstatechange(); }); });
await plays('interface sound while "interrupted"', () => { UIS.last.tick = 0; uiSound('tick', { always: true }); }, 700);
log('  state now:', await ev(() => audioCtx.state));
await ev(() => { delete audioCtx.state; delete audioCtx.resume; });
// a context stuck after an interruption → a tap replaces it
const stuck = await ev(async () => { const c = audioCtx; Object.defineProperty(c, 'state', { configurable: true, get: () => 'interrupted' }); c.resume = () => new Promise(() => {}); return true; });
await p.mouse.click(640, 120); await wait(2200);
log('stuck context + a tap → fresh context:', await ev(() => `${audioCtx.state}, replaced=${!Object.getOwnPropertyDescriptor(audioCtx, 'state')}`));
await plays('end sound on the fresh context', () => playEndSound());
// independence of settings
await ev(() => { UIS.prefs.on = false; return audioCtx.suspend(); }); await wait(150);
await p.mouse.click(640, 120); await wait(400);
log('interface sounds OFF, context suspended, then a tap → context', await ev(() => audioCtx.state), '(timer sounds can still play)');
await plays('end sound with interface sounds off', () => playEndSound());
await ev(() => { UIS.prefs.on = true; });
await ev(() => { S.settings.sound = false; });
const muted = await ev(async () => { const a = window.__starts; playEndSound(); playReminderChime(); playTierChord(); uiSound('click', { always: true }); previewSound('snd_bell'); await new Promise(r => setTimeout(r, 400)); return window.__starts - a; });
log('master Sound off: sources played =', muted);
await ev(() => { S.settings.sound = true; });
// quiet during focus
const quiet = await ev(async () => { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); UIS.prefs.quietFocus = true; UIS.last.hover = 0; const h = uiSound('hover'); finishPhase('reset'); finishPhase('reset'); return h; });
log('quiet during focus: hover blip during focus →', quiet ? 'played (wrong)' : 'hushed');
// Test sounds button
await ev(() => showTab('settings')); await wait(300);
await p.click('#sndTest'); await wait(6000);
log('Test sounds →', await ev(() => $('#sndTestOut').textContent));
log('audio console warnings/errors:', audioWarn.length ? audioWarn : 'none', '| page errors:', errs);
await b.close();
