// Phase 5 contact sheet: every Pomeo state, outfit, skin, scene, the avatars and the logo, in light and dark.
import { b, wait, SITE } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const OUT = process.argv[2] || '/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/v118';
fs.mkdirSync(OUT, { recursive: true });
for (const theme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1, colorScheme: theme });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded', '1'); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(SITE + '/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2000);
  const src = await p.evaluate(() => fetch('index.html').then(r => r.text()));
  await p.evaluate(src => {
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    const cell = (h, l) => `<div style="display:inline-flex;flex-direction:column;align-items:center;width:104px;margin:4px;font:11px system-ui;color:var(--muted)"><div style="width:84px;height:84px;display:grid;place-items:center">${h}</div>${l}</div>`;
    const m = o => pomeoSVG(o).replace('class="mascot"', 'class="mascot" style="position:static;width:80px;height:80px"');
    const states = ['idle', 'focus', 'sleep', 'sleepy', 'celebrate', 'happy', 'excited'].map(st => cell(m({ state: st }), st)).join('');
    const hats = Object.keys(POMEO_HATS).map(h => cell(m({ state: 'happy', hat: h }), h)).join('');
    const accs = Object.keys(POMEO_ACCS).map(a => cell(m({ state: 'idle', acc: a }), a)).join('') + Object.keys(POMEO_SKINS).map(k => cell(m({ state: 'idle', skin: k }), k)).join('');
    const scenes = ['water', 'read', 'wave'].map(k => cell(pomeoScene(k).replace('class="pscene"', 'class="pscene" style="display:block;width:96px"'), k)).join('');
    const avs = Object.keys(AVATAR_ART).filter(k => /tomato|g_star|s_flame|g_duo/.test(k)).map(k => cell(avatarSVG(k, 64), k)).join('');
    const logo = document.querySelector('#brandBtn .logo').innerHTML;
    const fav = `<img src="${document.getElementById('favicon').href}" width="32" height="32">`;
    const sp = src.slice(src.indexOf('<svg class="sp-svg"'), src.indexOf('</svg></div>', src.indexOf('<svg class="sp-svg"')) + 6);
    const d = document.createElement('div');
    d.id = 'sheet';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg);color:var(--text);padding:12px;overflow:auto';
    d.innerHTML = `<div>${states}</div><div>${hats}</div><div>${accs}</div><div>${scenes}${avs}</div><div>${cell(`<span style="width:52px;height:52px;display:block">${logo}</span>`, 'header logo')}${cell(fav, 'favicon')}${cell(`<span style="width:80px;height:80px;display:block">${sp.replace('<svg ', '<svg width="80" height="80" ')}</span>`, 'splash')}${cell(roomSVG(roomLayout()).replace('<svg ', '<svg width="100" '), 'room')}</div>`;
    document.body.appendChild(d);
  }, src);
  await wait(600);
  await p.screenshot({ path: `${OUT}/p5-sheet-${theme}.png` });
  // the real header + Timer + room screens
  await p.evaluate(() => document.getElementById('sheet').remove());
  await p.screenshot({ path: `${OUT}/p5-timer-${theme}.png`, clip: { x: 0, y: 0, width: 1200, height: 520 } });
  console.log(theme, 'errors', JSON.stringify(errs));
  await ctx.close();
}
await b.close();
