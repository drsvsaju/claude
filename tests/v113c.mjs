// v1.13 time-of-day sky: phases follow the local clock (fake clocks), blend slowly, Rain mood, settings default
// (on; off in True Minimalist), Animations respected, hidden on Starfield, readable in every theme, light/dark and Glossed.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
async function guest(time, { dark = false, extra = {}, w = 1200 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 }, timezoneId: 'Asia/Kolkata', colorScheme: dark ? 'dark' : 'light' });
  await ctx.clock.install({ time: new Date(time) });
  await ctx.addInitScript(extra => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-guest', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-seen-version', '1.13'); localStorage.setItem('pomodorolist-login-later', new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')); for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v); }, extra);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html?emulator=1'); await p.waitForSelector('#appView:not(.hidden)'); await wait(1200);
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const sky = G => G.ev(() => { const el = $('#todSky'); return { on: !el.classList.contains('hidden'), phase: el.dataset.phase, w: Object.fromEntries(['sunrise', 'day', 'sunset', 'night'].map(p => [p, +el.querySelector('.sky-' + p).style.opacity])), stars: +el.querySelector('.sky-stars').style.opacity, rain: el.classList.contains('rain') }; });
// 1. phases across the day (sky follows local time)
const G = await guest('2026-10-22T06:00:00+05:30');
const want = [['06:00', 'sunrise'], ['07:15', 'sunrise'], ['11:00', 'day'], ['15:30', 'day'], ['18:15', 'sunset'], ['19:30', 'night'], ['23:00', 'night'], ['03:00', 'night']];
const got = [];
for (const [hm, ph] of want) {
  await G.ev(t => { /* jump the fake clock */ }, 0);
  await G.ctx.clock.setSystemTime(new Date(`2026-10-${hm === '03:00' ? '23' : '22'}T${hm}:00+05:30`));
  await G.ev(() => renderSky());
  const s = await sky(G);
  got.push(`${hm}→${s.phase}`);
  if (s.phase !== ph) check(`At ${hm} the sky is ${ph}`, false, JSON.stringify(s));
}
check('Sky phase follows the local clock: sunrise, day, sunset, night (8 times checked)', got.every((g, i) => g.endsWith(want[i][1])), got.join(' '));
await G.ctx.clock.setSystemTime(new Date('2026-10-22T17:10:00+05:30')); await G.ev(() => renderSky());
const blend = await sky(G);
check('Between phases the skies blend (day → sunset at 17:10)', blend.w.day > 0.2 && blend.w.sunset > 0.2 && Math.abs(blend.w.day + blend.w.sunset - 1) < 0.01, JSON.stringify(blend.w));
await G.ctx.clock.setSystemTime(new Date('2026-10-22T21:30:00+05:30')); await G.ev(() => renderSky());
const night = await sky(G);
check('Night: a few twinkling stars', night.stars === 1 && (await G.ev(() => $$('#todSky .sky-stars i').length)) >= 20 && (await G.ev(() => getComputedStyle($('#todSky .sky-stars i')).animationName)) === 'twinkle', JSON.stringify(night));
const tr = await G.ev(() => getComputedStyle($('#todSky .sky-night')).transitionDuration);
check('Transitions are slow and smooth (60 s crossfade, refreshed every minute)', tr === '60s', tr);
// it updates on its own as time passes
await G.ctx.clock.setSystemTime(new Date('2026-10-22T05:59:00+05:30')); await G.ev(() => renderSky());
await G.ctx.clock.runFor(61000 * 30);
check('Left open, it moves on by itself (05:59 → about 06:30 is sunrise)', (await sky(G)).phase === 'sunrise');
// rain mood + settings
await G.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('settings'); });
await wait(300);
const st = await G.ev(() => ({ tod: $('#setTod').checked, rainRow: !$('#todRainRow').classList.contains('hidden') }));
check('Settings → Appearance: "Time-of-day background" is on by default, with the Rain mood switch under it', st.tod && st.rainRow, JSON.stringify(st));
await G.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await G.p.click('#setTodRain'); await wait(200);
const rain = await G.ev(() => ({ cls: $('#todSky').classList.contains('rain'), anim: getComputedStyle($('#todSky .sky-rain')).animationName, disp: getComputedStyle($('#todSky .sky-rain')).display, saved: S.settings.todRain }));
check('Rain mood adds gentle falling rain (saved)', rain.cls && rain.disp === 'block' && rain.anim === 'rainFall' && rain.saved, JSON.stringify(rain));
await G.ev(() => { localStorage.setItem('pomodorolist-motion', 'off'); applyMotion(); });
const still = await G.ev(() => ({ rain: getComputedStyle($('#todSky .sky-rain')).animationName, star: getComputedStyle($('#todSky .sky-stars i')).animationName, tr: getComputedStyle($('#todSky .sky-day')).transitionDuration }));
check('Animations off: rain and stars hold still, no crossfade', still.rain === 'none' && still.star === 'none' && still.tr === '0s', JSON.stringify(still));
await G.ev(() => { localStorage.setItem('pomodorolist-motion', 'reduced'); applyMotion(); });
check('Reduced animations: rain falls slowly, stars don’t twinkle', await G.ev(() => getComputedStyle($('#todSky .sky-rain')).animationDuration === '4s' && getComputedStyle($('#todSky .sky-stars i')).animationName === 'none'));
await G.ev(() => { localStorage.setItem('pomodorolist-motion', 'full'); applyMotion(); });
await G.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await G.p.click('#setTod'); await wait(200);
check('Switching it off hides the sky (and the Rain row)', await G.ev(() => $('#todSky').classList.contains('hidden') && S.settings.tod === false && $('#todRainRow').classList.contains('hidden')));
await G.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await G.p.click('#setTod'); await wait(200);
// minimal: default off
await G.ev(() => { delete S.settings.tod; setMinimal(true); renderSettings(); });
check('True Minimalist: off by default', await G.ev(() => $('#todSky').classList.contains('hidden') && !$('#setTod').checked));
await G.ev(() => { S.settings.tod = true; save(); renderSky(); });
check('… but can be switched on', await G.ev(() => !$('#todSky').classList.contains('hidden')));
await G.ev(() => { delete S.settings.tod; setMinimal(false); });
// starfield hides it
await G.ev(() => { S.game.equipped.theme = 'th_starfield'; S.game.grants.th_starfield = { src: 'test', at: 1 }; G = null; applyCosmetics(); });
check('Starfield theme (its own sky): the time-of-day sky steps aside', await G.ev(() => $('#todSky').classList.contains('hidden')));
await G.ev(() => { S.game.equipped.theme = 'th_default'; G = null; applyCosmetics(); });
await G.ctx.close();
// 2. readability: text vs. what's behind it, at the strongest sky moments, every theme, light/dark, Glossed
const lum = c => { const [r, g, bb] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bb; };
const contrast = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
let worst = 99, worstAt = '', worstDrop = 0, dropAt = '';
const THEMES = ['th_default', 'th_paper', 'th_mono', 'th_forest', 'th_ocean', 'th_nord', 'th_sakura', 'th_sunset', 'th_midnight'];
for (const [time, dark, glass] of [['2026-10-22T06:15:00+05:30', false, 'off'], ['2026-10-22T18:15:00+05:30', true, 'full'], ['2026-10-22T22:00:00+05:30', true, 'lite'], ['2026-10-22T12:00:00+05:30', false, 'lite'], ['2026-10-22T22:00:00+05:30', false, 'full']]) {
  const R = await guest(time, { dark, extra: { 'pomodorolist-glass': glass } });
  await R.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
  for (const th of THEMES) {
    await R.ev(th => { S.settings.todRain = true; S.game.equipped.theme = th; S.game.grants[th] = { src: 'test', at: 1 }; G = null; applyCosmetics(); showTab('timer'); }, th);
    await wait(250);
    await R.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await wait(250);
    // The background right behind the page text: sample the rendered page in an empty spot near the top and at a card
    const sample = async () => { const shot = await R.p.screenshot({ clip: { x: 4, y: 140, width: 6, height: 6 } });
      return R.ev(async b64 => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()); const c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext('2d'); x.drawImage(bm, 0, 0); const d = x.getImageData(2, 2, 1, 1).data; return [d[0], d[1], d[2]]; }, shot.toString('base64')); };
    const px = await sample();
    await R.ev(() => { $('#todSky').style.display = 'none'; }); const px0 = await sample(); await R.ev(() => { $('#todSky').style.display = ''; });
    const text = await R.ev(() => getComputedStyle(document.body).color.match(/\d+/g).slice(0, 3).map(Number));
    const cr = contrast(px, text), cr0 = contrast(px0, text);
    if (cr < worst) { worst = cr; worstAt = `${th} ${time.slice(11, 16)} ${dark ? 'dark' : 'light'} glass=${glass} (without the sky ${cr0.toFixed(2)})`; }
    if (1 - cr / cr0 > worstDrop) { worstDrop = 1 - cr / cr0; dropAt = `${th} ${time.slice(11, 16)} ${dark ? 'dark' : 'light'} glass=${glass}`; }
  }
  if (time.includes('18:15')) await R.p.screenshot({ path: 's113/v113c-sunset-dark.png' });
  if (time.includes('06:15')) await R.p.screenshot({ path: 's113/v113c-sunrise.png' });
  if (time.includes('22:00') && !dark) await R.p.screenshot({ path: 's113/v113c-night-light.png' });
  await R.ctx.close();
}
check('Readable in every theme, light/dark and Glossed: text vs. the sky behind it stays ≥ 4.5:1 (WCAG AA) at sunrise, noon, sunset and night with rain, and the sky costs ≤ 15% contrast', worst >= 4.5 && worstDrop <= 0.15, `worst ${worst.toFixed(2)} (${worstAt}) · biggest drop ${(worstDrop * 100).toFixed(1)}% (${dropAt})`);
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
process.exit(fails ? 1 : 0);   // v2.0: a failing check fails the suite (it used to exit 0)
