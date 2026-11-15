import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
async function device(name, { w = 1280, h = 900, touch = false, scheme = 'light', motion = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, colorScheme: scheme });
  await ctx.addInitScript(m => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); if (m) localStorage.setItem('pomodorolist-motion', m); const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())); }, motion);
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('dialog', d => d.accept());
  return { ctx, p };
}
const A = await device('A');
const recent = () => A.p.evaluate(() => { const r = UIS.recent.slice(); UIS.recent.length = 0; return r.join(','); });
await A.p.goto('http://localhost:8000/index.html'); await A.p.click('#guestBtn'); await A.p.waitForSelector('#appView:not(.hidden)'); await wait(1200);
await A.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await wait(300);
log('context after first tap:', await A.p.evaluate(() => audioCtx && audioCtx.state), '| prefs:', await A.p.evaluate(() => JSON.stringify(UIS.prefs)));
await recent();
// hover: throttled, once per element
const btns = ['#resetBtn', '#mainBtn', '#skipBtn', '#muteBtn'];
for (const s of btns) { const bb = await A.p.locator(s).boundingBox(); await A.p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 2 }); }
log('fast sweep over 4 buttons → hovers:', (await recent()).split(',').filter(x => x === 'hover').length, '(throttled ≤ 4)');
const bb = await A.p.locator('#skipBtn').boundingBox();
for (let i = 0; i < 6; i++) { await A.p.mouse.move(bb.x + 10 + i * 3, bb.y + 10); await wait(80); }
log('wiggling on one button → hovers:', (await recent()).split(',').filter(x => x === 'hover').length);
for (const s of ['#resetBtn', '#skipBtn', '#resetBtn']) { const r = await A.p.locator(s).boundingBox(); await A.p.mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 3 }); await wait(120); }
log('leave and come back → hovers:', (await recent()).split(',').filter(x => x === 'hover').length);
// specific sounds
await A.p.mouse.move(5, 500);
await A.p.click('#mainBtn'); await wait(150); log('start:', await recent());
await A.p.click('#mainBtn'); await wait(150); log('pause:', await recent());
await A.p.evaluate(() => showTab('stats')); await wait(200); log('tab switch:', await recent());
await A.p.click('#statsSeg [data-view=day]'); await wait(150); log('button tap:', await recent());
await A.p.evaluate(() => showTab('settings')); await A.p.click('#setAuto'); await wait(120); const on1 = await recent();
await A.p.click('#setAuto'); await wait(120); log('toggle on/off:', on1, '/', await recent());
await A.p.click('#examsBtn'); await wait(250); const o = await recent(); await A.p.click('#examClose'); await wait(300); log('dialog open/close:', o, '/', await recent());
await A.p.evaluate(() => showTab('reminders')); await A.p.click('#remAdd'); await wait(200); await A.p.fill('#remTitle', ''); await A.p.click('#remForm button[type=submit]'); await wait(150);
log('form error bonk:', await recent()); await A.p.click('#remCancel'); await wait(300); await recent();
// subtasks tick + sparkle
await A.p.evaluate(() => { showTab('timer'); loadItems(['Read notes', 'Solve Q1–5']); }); await wait(200); await recent();
await A.p.click('#subCheckList li:first-child label'); await wait(60);
log('subtask tick:', await recent(), '| sparkles:', await A.p.evaluate(() => $$('.mini-spark').length));
// quiet during focus: hover muted, taps quieter, start/pause unaffected
await A.p.evaluate(() => { S.timer.phase = 'focus'; S.timer.status = 'idle'; startTimer(); });
const q = await A.p.evaluate(() => { UIS.last = {}; const h = uiSound('hover'); const c = uiSound('click'); return `hover ${h} · click ${c}`; });
log('quiet during focus:', q);
const vols = await A.p.evaluate(() => { UIS.voices = 0; const g = []; const orig = AudioContext.prototype.createGain; AudioContext.prototype.createGain = function () { const n = orig.call(this); g.push(n); return n; }; UIS.last = {}; uiSound('click'); const quiet = g[0].gain.value; S.timer.status = 'idle'; UIS.last = {}; UIS.voices = 0; g.length = 0; uiSound('click'); const normal = g[0].gain.value; AudioContext.prototype.createGain = orig; return `${quiet.toFixed(3)} vs ${normal.toFixed(3)}`; });
log('click gain during focus vs normal:', vols);
await A.p.evaluate(() => { S.timer.status = 'idle'; saveLocal(); renderAll(); });
// rewards: coin, arp, reward, grow
await A.p.evaluate(() => { UIS.last = {}; UIS.recent.length = 0; playCoin(); showAchCard(ACHIEVEMENTS[0]); });
log('coin + achievement:', await recent());
// level of UI vs timer sounds
log('peak level (pack soft, default volume):', await A.p.evaluate(() => (Math.max(...Object.values(UI_NOTES).flat().map(n => n[2])) * UIS.prefs.vol * 0.12).toFixed(3)), 'vs timer chime peak 0.16');
// every pack × every sound plays without errors; cap of 4 at once
const packs = await A.p.evaluate(async () => { const out = []; for (const pk of Object.keys(UI_PACKS)) { UIS.prefs.pack = pk; for (const n of [...Object.keys(UI_NOTES), 'swoosh']) { UIS.last = {}; UIS.voices = 0; if (!uiSound(n, { always: true })) out.push(pk + ':' + n + ' failed'); } } UIS.prefs.pack = 'soft'; UIS.voices = 0; return out.length ? out.join(' ') : 'all ok'; });
log('4 packs × 16 sounds:', packs);
await wait(2500);
log('voice cap:', await A.p.evaluate(() => { UIS.last = {}; let n = 0; for (const k of ['click', 'on', 'off', 'open', 'close', 'tick', 'coin', 'arp']) if (uiSound(k, { always: true })) n++; return n; }));
await wait(1200);
log('mute / hidden / off:', await A.p.evaluate(() => { UIS.last = {}; S.settings.sound = false; const a = uiSound('click'); S.settings.sound = true; Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); UIS.last = {}; const h = uiSound('click'); delete document.hidden; UIS.prefs.on = false; UIS.last = {}; const o = uiSound('click'); UIS.prefs.on = true; return [a, h, o].join(' '); }));
// settings card
await A.p.evaluate(() => showTab('settings')); await wait(300);
await A.p.selectOption('#uisPack', 'wood'); await wait(1300);
log('pack saved on device:', await A.p.evaluate(() => JSON.parse(localStorage.getItem('pomodorolist-uisound')).pack), '| preview:', await recent());
await A.p.evaluate(() => $('#uisVol').closest('.card').scrollIntoView({ block: 'center' })); await wait(200);
await A.p.screenshot({ path: 'v9-settings.png' });
await A.p.selectOption('#uisPack', 'soft');

// ===== visual polish =====
await A.p.evaluate(() => { S.ui.shopCat = 'theme'; showTab('shop'); window.scrollTo(0, 0); }); await wait(500);
const it = await A.p.locator('#shopView .item').nth(1).boundingBox();
await A.p.mouse.move(it.x + it.width * 0.8, it.y + it.height * 0.25, { steps: 4 }); await wait(250);
log('item glow + tilt:', await A.p.evaluate(() => { const el = $$('#shopView .item')[1]; return [el.classList.contains('fx-glow'), el.style.getPropertyValue('--mx'), el.style.transform].join(' | '); }));
await A.p.screenshot({ path: 'v9-shop-hover.png', clip: { x: 0, y: 0, width: 1280, height: 520 } });
log('catrow fades:', await A.p.evaluate(() => $('#shopCats').className));
await A.p.mouse.move(5, 800); await wait(300);
log('reset on leave:', await A.p.evaluate(() => $$('#shopView .item')[1].style.transform || 'none'));
await A.p.evaluate(() => showTab('timer')); await wait(300);
const mb = await A.p.locator('#mainBtn').boundingBox();
await A.p.mouse.move(mb.x + mb.width + 30, mb.y + mb.height / 2, { steps: 4 }); await wait(200);
log('magnetic Start near cursor:', await A.p.evaluate(() => $('#mainBtn').style.translate));
await A.p.mouse.move(mb.x + mb.width + 300, mb.y - 200, { steps: 3 }); await wait(400);
log('released when far:', JSON.stringify(await A.p.evaluate(() => $('#mainBtn').style.translate)));
log('tab breathing glow:', await A.p.evaluate(() => getComputedStyle(($('#btmBar button.active') || $('#tabs [data-tab].active')), '::before').animationName));
await A.p.keyboard.press('Tab'); await A.p.keyboard.press('Tab');
log('keyboard focus ring:', await A.p.evaluate(() => { const s = getComputedStyle(document.activeElement); return document.activeElement.tagName + ' outline ' + s.outlineStyle + ' ' + s.outlineWidth; }));
await A.p.evaluate(() => { localStorage.setItem(MOTION_KEY, 'reduced'); applyMotion(); });
await A.p.mouse.move(mb.x + mb.width + 20, mb.y + mb.height / 2, { steps: 3 }); await wait(200);
log('reduced motion: magnetic', JSON.stringify(await A.p.evaluate(() => $('#mainBtn').style.translate)), '| glow on card', await A.p.evaluate(() => !!$('.fx-glow')), '| breathing', await A.p.evaluate(() => getComputedStyle(($('#btmBar button.active') || $('#tabs [data-tab].active')), '::before').animationName));

// touch device: no hover sounds or pointer effects
const T = await device('T', { w: 390, h: 844, touch: true, scheme: 'dark' });
await T.p.goto('http://localhost:8000/index.html'); await T.p.tap('#guestBtn'); await T.p.waitForSelector('#appView:not(.hidden)'); await wait(1200);
await T.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await wait(300);
await T.p.tap('#mainBtn'); await wait(100); await T.p.evaluate(() => showTab('quests')); await wait(200);
await T.p.evaluate(() => showTab('settings')); await wait(200);
log('touch:', await T.p.evaluate(() => `fine pointer ${finePointer.matches} · sounds ${UIS.recent.join(',')} · hover row shown ${!$('#uisHoverRow').classList.contains('hidden')}`));
await T.p.screenshot({ path: 'v9-phone-dark.png' });
log('errors', errs);
await b.close();
