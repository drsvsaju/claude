// v1.18 Phase 5 — the minimal Pomeo everywhere: one drawing (soft body, small leaf, dot eyes, tiny smile) that keeps every
// expression class the animations use, every hat / accessory / skin / scene still draws, the header logo (both),
// the favicon, the splash and the loading tomato, the intro, the room, the tomato pictures; all themes, True
// Minimalist, phone width; nothing still uses the old body colour or the old star leaf.
import { b, wait, log, check, errs, failCount, SITE } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: opts.dark ? 'dark' : 'light' });
  if (!opts.intro) await ctx.addInitScript(o => { localStorage.setItem('pomodorolist-tour-done', '1'); if (!o.intro) localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded', '1'); }, opts);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto(SITE + '/index.html');
  if (opts.intro) return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
  await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2000); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const OLD_BODY = /#e5654f/i, OLD_LEAF = /M20 12\.6 16\.2 10\.4/;
// ---------- 1. the source: one look in every hand-drawn copy ----------
const src = fs.readFileSync(new URL('./site2/index.html', import.meta.url).pathname.replace('site2', process.env.SITE && /8001/.test(process.env.SITE) ? 'site2' : 'site'), 'utf8');
const sp = src.slice(src.indexOf('<svg class="sp-svg"'), src.indexOf('</svg></div>', src.indexOf('<svg class="sp-svg"')));
const logos = src.match(/<i class="logo" aria-hidden="true">([\s\S]*?)<\/i>/g) || [];
check('Splash Pomeo: the new body (#f0735f), single leaf, dot eyes; keeps its classes (closed, open, happy eyes, smile, yawn)', /#f0735f/.test(sp) && !OLD_BODY.test(sp) && !OLD_LEAF.test(sp) && ['sp-ec', 'sp-eo', 'sp-eh', 'sp-smile', 'sp-yawn'].every(c => sp.includes(c)), sp.slice(0, 200));
check('Both header logos are the new Pomeo (soft body, leaf, dot eyes, smile)', logos.length === 2 && logos.every(l => /#f0735f/.test(l) && /#7cc07a/.test(l) && !OLD_BODY.test(l)), String(logos.length));
check('The favicon is Pomeo, not the old teal dot', /%23f0735f/i.test(src.slice(src.indexOf('id="favicon"'), src.indexOf('id="favicon"') + 900)) && !/r%3D%229%22%20fill%3D%22%232f8f83/.test(src));
check('The splash title and the loading-vine tomato use the same look', /sp-logo-svg/.test(src) && /<span class="sp-tom"><svg[^>]*><ellipse cx="7" cy="8.3" rx="5.3" ry="4.9" fill="#f0735f"/.test(src));
// ---------- 2. the drawing in the app ----------
const G = await guest(1280, { tag: 'p5' });
const d = await G.ev(async () => {
  const states = ['idle', 'focus', 'sleep', 'sleepy', 'celebrate', 'happy', 'excited'];
  const need = ['m-body', 'm-cheek', 'e-open', 'e-focus', 'e-sleep', 'e-happy', 'e-wink', 'm-mouth', 'zz', 'spark'];
  const bad = [];
  for (const st of states) { const h = pomeoSVG({ state: st }); if (!need.every(c => h.includes(c))) bad.push(st + ':classes'); if (/#e5654f/i.test(h)) bad.push(st + ':oldcolour'); if (!/viewBox="-4 -8 48 48"/.test(h)) bad.push(st + ':viewBox'); }
  const outfits = [...Object.keys(POMEO_HATS).map(h => ({ hat: h })), ...Object.keys(POMEO_ACCS).map(a => ({ acc: a })), ...Object.keys(POMEO_SKINS).map(k => ({ skin: k }))];
  for (const o of outfits) { try { const h = pomeoSVG({ state: 'happy', ...o }); if (!/m-hat|m-acc|data-skin/.test(h)) bad.push(JSON.stringify(o)); } catch (e) { bad.push(JSON.stringify(o) + ':' + e.message); } }
  const scenes = ['water', 'read', 'wave'].map(k => pomeoScene(k)).join('');
  const room = roomSVG(roomLayout());
  const avs = ['av_tomato', 'av_tomato_green', 'av_tomato_purple', 'av_tomato_gold', 'av_g_star', 'av_g_duo', 'av_s_flame'].map(k => avatarArt(k)).join('');
  // the mascot on the Timer is the live element with the expression classes switching
  const live = $('#mascot');
  const shown = [];
  for (const st of ['focus', 'sleep', 'happy']) { live.dataset.state = st; await new Promise(r => setTimeout(r, 900)); const v = [...live.querySelectorAll('.e')].filter(e => +getComputedStyle(e).opacity > .5).map(e => [...e.classList].find(c => c.startsWith('e-'))); shown.push(st + '=' + v.join('+')); }
  return { bad, outfits: outfits.length, scenes: scenes.length > 1000 && !/#d4553f|#e5654f/i.test(scenes), room: /rm-pomeo/.test(room) && !/#e5654f/i.test(room.slice(room.indexOf('rm-pomeo'), room.indexOf('rm-pomeo') + 3000)), avs: !/#e5654f/i.test(avs) && /#f0735f/.test(avs), shown, liveNew: /#f0735f/.test(live.outerHTML) };
});
check('Every state (idle, focus, sleep, sleepy, celebrate, happy, excited) keeps all the expression classes, the same viewBox, and none uses the old colour', d.bad.filter(x => !x.startsWith('{')).length === 0, JSON.stringify(d.bad));
check('Every hat, accessory and skin still draws on the new Pomeo', d.outfits >= 18 && d.bad.filter(x => x.startsWith('{')).length === 0, JSON.stringify(d));
check('The three empty-state scenes, the room and the tomato pictures use the new look', d.scenes && d.room && d.avs, JSON.stringify(d));
check('The Timer mascot is the new drawing and its expressions switch (focus / sleep / happy eyes)', d.liveNew && /focus=e-focus/.test(d.shown[0]) && /sleep=e-sleep/.test(d.shown[1]) && /happy=e-happy/.test(d.shown[2]), JSON.stringify(d.shown));
// ---------- 3. every theme: the header logo and the mascot stay visible (no theme recolours them) ----------
const th = await G.ev(async () => {
  const out = [];
  for (const it of ITEMS.filter(i => i.cat === 'theme').slice(0, 40)) {
    S.game.grants[it.id] ||= { src: 'test', at: Date.now() }; S.game.equipped.theme = it.id; G = null; applyTheme();
    await new Promise(r => setTimeout(r, 20));
    const body = $('#brandBtn .logo svg ellipse'), fill = body && getComputedStyle(body).fill, r = $('#brandBtn .logo').getBoundingClientRect();
    if (!/240, 115, 95/.test(fill || '') || r.width < 20) out.push(it.id + ':' + fill + ':' + r.width);
  }
  S.game.equipped.theme = 'th_default'; G = null; applyTheme();
  return out;
});
check('Every theme (incl. Scholar-era, boss, event and garden themes): the logo keeps its colour and size', th.length === 0, JSON.stringify(th));
// ---------- 4. True Minimalist: Pomeo still there when shown, and calm ----------
const mini = await G.ev(() => { S.settings.gamification = false; S.settings.minPomeo = true; renderAll(); const m = $('#mascot'); return { on: pomeoOn(), vis: !!m && getComputedStyle(m).display !== 'none', isNew: !!m && /#f0735f/.test(m.outerHTML), logo: /#f0735f/.test($('#brandBtn .logo').innerHTML) }; });
check('True Minimalist with Pomeo kept: the new Pomeo shows; the logo is unchanged', mini.on && mini.vis && mini.isNew && mini.logo, JSON.stringify(mini));
await G.ev(() => { S.settings.gamification = true; renderAll(); });
await G.ctx.close();
// ---------- 5. dark mode + phone width ----------
const M = await guest(390, { tag: 'mobile', dark: true });
const mob = await M.ev(() => { const r = $('#brandBtn .logo').getBoundingClientRect(), m = $('#mascot') && $('#mascot').getBoundingClientRect(); return { logo: [Math.round(r.width), Math.round(r.height)], mascot: m ? Math.round(m.width) : 0, over: document.documentElement.scrollWidth - innerWidth }; });
check('Phone (390 px, dark): the logo is 26 px, the mascot shows, no sideways scroll', mob.logo.join() === '26,26' && mob.mascot > 20 && mob.over <= 0, JSON.stringify(mob));
await M.ctx.close();
// ---------- 6. the intro uses the new Pomeo ----------
const I = await guest(1280, { tag: 'intro', intro: true, noLogin: true });
await wait(2600);
const intro = await I.ev(() => { const el = $('#inPomeo'); return { html: el ? el.innerHTML : '', shown: !$('#intro').classList.contains('hidden') }; });
check('The intro\'s Pomeo is the new drawing', /#f0735f/.test(intro.html) && !/#e5654f/i.test(intro.html), JSON.stringify({ shown: intro.shown, len: intro.html.length }));
await I.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
