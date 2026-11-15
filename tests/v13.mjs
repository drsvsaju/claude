import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
async function device(name, { w = 1180, h = 860, scheme = 'light', glass = null, onboarded = true, init = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
  await ctx.addInitScript(([glass, onboarded]) => {
    if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1);
    if (glass) localStorage.setItem('pomodorolist-glass', glass);
    if (onboarded) { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '1.8.1'); }
    const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()));
  }, [glass, onboarded]);
  if (init) await ctx.addInitScript(init);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
  return { ctx, p };
}
const guest = async d => { await d.p.goto(U); await d.p.click('#guestBtn'); await d.p.waitForSelector('#appView:not(.hidden)'); await wait(1200); };
const state = d => d.p.evaluate(() => `glass=${document.documentElement.dataset.glass || 'off'} solid=${document.documentElement.dataset.glassSolid || '-'} stored=${localStorage.getItem('pomodorolist-glass')}`);

// 1. new user → Lite; stored choices kept
let D = await device('new'); await guest(D);
log('new user:', await state(D));
await D.p.evaluate(() => showTab('settings'));
log('settings:', await D.p.evaluate(() => $('#setGlass').closest('.setting').querySelector('div div').textContent + ' | ' + [...$('#setGlass').options].map(o => o.textContent).join(' / ') + ' | selected=' + $('#setGlass').value));
await D.ctx.close();
for (const v of ['off', 'full', 'lite']) { D = await device('kept-' + v, { glass: v }); await guest(D); log(`stored ${v} kept:`, await state(D)); await D.ctx.close(); }

// 2. safety fallbacks
D = await device('rt');
const cdp = await D.ctx.newCDPSession(D.p);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
await guest(D);
log('reduced transparency:', await state(D), '| card blur:', await D.p.evaluate(() => getComputedStyle($('.card')).backdropFilter), '| colour wash:', await D.p.evaluate(() => getComputedStyle($('#glassBg')).display));
await D.p.evaluate(() => showTab('settings')); log('  desc:', await D.p.evaluate(() => $('#glassDesc').textContent));
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] }); await wait(300);
log('  turned off again live:', await state(D), '| card blur:', await D.p.evaluate(() => getComputedStyle($('.card')).backdropFilter));
await D.ctx.close();
D = await device('noblur', { init: () => { const real = CSS.supports.bind(CSS); CSS.supports = (a, b) => /backdrop-filter/.test(a) ? false : b === undefined ? real(a) : real(a, b); } });
await guest(D);
log('no backdrop-filter:', await state(D), '| card bg:', await D.p.evaluate(() => getComputedStyle($('.card')).backgroundColor));
await D.ctx.close();

// 3. palette + tutorial "Pick your style"
D = await device('tut', { w: 390, h: 844, onboarded: false }); await guest(D);
await D.p.waitForSelector('#tutDlg[open]', { timeout: 8000 });
log('tutorial steps:', await D.p.evaluate(() => $('#tutStep').textContent));
await D.p.evaluate(() => { TUT.i = 4; renderTut(); }); await wait(200);
log('style step:', await D.p.evaluate(() => `${$('#tutTitle').textContent} | cards=${$$('.sp-card').length} | say="${$('.sp-say').textContent}" | seg=${$$('.gl-seg button').map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join(' · ')} | preview=${$('.gl-prev').dataset.l} | foot="${$('#tutBody > p').textContent}"`));
const side = await D.p.evaluate(() => { const [a, c] = $$('.sp-card').map(x => x.getBoundingClientRect()); return Math.abs(a.top - c.top) < 2 ? 'side by side' : 'stacked'; });
log('layout on phone:', side, '| overflow:', await D.p.evaluate(() => { const d = $('#tutDlg'); return d.scrollWidth > d.clientWidth; }));
await D.p.screenshot({ path: 'v13-tut-style-phone.png' });
await D.p.click('[data-gl=full]'); await wait(200);
log('pick Full:', await state(D), '| preview', await D.p.evaluate(() => $('.gl-prev').dataset.l));
await D.p.screenshot({ path: 'v13-tut-style-full.png' });
await D.p.click('[data-gl=off]'); await wait(200); log('pick Off:', await state(D));
await D.p.click('#tutMinimal'); await wait(200); log('minimal toggle still works:', await D.p.evaluate(() => minimal()));
await D.p.click('#tutMinimal'); await D.p.click('[data-gl=lite]'); await D.p.click('#tutSkip'); await wait(300);
await D.p.evaluate(() => openCmd()); await D.p.fill('#cmdInput', 'glossed'); await wait(200);
log('palette "glossed":', await D.p.evaluate(() => CMD.items.slice(0, 3).map(c => c.t).join(' | ')));
await D.p.evaluate(() => $('#cmdDlg').close());
await D.p.evaluate(() => { setMinimal(true); }); await wait(200);
log('True Minimalist + Lite:', await D.p.evaluate(() => { const cs = getComputedStyle(document.documentElement); return `fill=${cs.getPropertyValue('--glass-fill').trim()} wash=${cs.getPropertyValue('--gb-a').trim()} blur=${cs.getPropertyValue('--glass-blur').trim()}`; }));
await D.p.screenshot({ path: 'v13-min-lite-phone.png' });
await D.ctx.close();

// 4. readability: Lite in every theme, light + dark, normal + True Minimalist (pixel-sampled card background)
const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const themes = ['th_default', 'th_paper', 'th_sakura', 'th_forest', 'th_ocean', 'th_nord', 'th_sunset', 'th_midnight', 'th_mono', 'th_starfield'];
const worst = [];
for (const [scheme, gl] of [['light', 'lite'], ['dark', 'lite'], ['light', 'off'], ['dark', 'off']]) {
  D = await device('c-' + scheme + gl, { scheme, glass: gl }); await guest(D);
  await D.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
  for (const th of themes) for (const min of [false, true]) {
    await D.p.evaluate(([th, min]) => { S.game.purchases['t_' + th] = { item: th, price: 0, at: 1 }; G = null; S.game.equipped.theme = th; applyCosmetics(); if (minimal() !== min) setMinimal(min); showTab('timer'); window.scrollTo(0, 0); }, [th, min]);
    await wait(1300);
    await D.p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); $$('.toast-item, .pomeo-bubble, #tipPop, .achcard').forEach(x => x.style.visibility = 'hidden'); });
    await wait(150);
    const box = await D.p.evaluate(() => { const r = $('#todayExtra').closest('.card').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    const shot = (await D.p.screenshot()).toString('base64');
    const px = await D.p.evaluate(async ([png, box]) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const pts = [[box.x + box.w - 14, box.y + 12], [box.x + 14, box.y + box.h - 12], [box.x + box.w / 2, box.y + box.h - 10], [box.x + box.w - 14, box.y + box.h / 2], [box.x + 14, box.y + 12]];
      return pts.map(([a, b2]) => [...x.getImageData(Math.round(a), Math.round(b2), 1, 1).data].slice(0, 3));
    }, [shot, box]);
    const cols = await D.p.evaluate(() => { const el = document.createElement('span'); document.body.appendChild(el); const out = ['--text', '--muted'].map(v => { el.style.color = `var(${v})`; return getComputedStyle(el).color; }); el.remove(); return out; });
    const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
    const med = a => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const tr = med(px.map(p => ratio(rgb(cols[0]), p))), mr = med(px.map(p => ratio(rgb(cols[1]), p)));
    worst.push({ k: `${gl}/${scheme}/${th}${min ? '/min' : ''}`, gl, tr, mr });
    if ((th === 'th_sakura' || th === 'th_starfield') && !min && gl === 'lite') await D.p.screenshot({ path: `v13-lite-${scheme}-${th}.png` });
  }
  await D.ctx.close();
}
worst.sort((a, b) => a.mr - b.mr);
const base = Object.fromEntries(worst.filter(w => w.gl === 'off').map(w => [w.k.slice(4), w]));
log('Lite vs Off (muted text) worst 6:', worst.filter(w => w.gl === 'lite').slice(0, 6).map(w => `${w.k.slice(5)} ${w.mr.toFixed(2)} (off ${base[w.k.slice(5)].mr.toFixed(2)})`).join(', '));
log('readability (Lite) — lowest muted-text contrast:', worst.slice(0, 5).map(w => `${w.k} ${w.mr.toFixed(2)}`).join(', '));
log('lowest body-text contrast:', worst.slice().sort((a, b) => a.tr - b.tr).slice(0, 3).map(w => `${w.k} ${w.tr.toFixed(2)}`).join(', '));
const L = worst.filter(w => w.gl === 'lite');
log('Lite combos:', L.length, '| all muted ≥ 4.5:', L.every(w => w.mr >= 4.5), '| all text ≥ 7:', L.every(w => w.tr >= 7));
log('errors', errs);
await b.close();
