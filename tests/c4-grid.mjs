// Grid of every boss aura (Solo / Squad) at leaderboard-row size and card size. Usage: node c4-grid.mjs <out-prefix> [motion]
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const out = process.argv[2] || 'grid', motion = process.argv[3] || 'off';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1180, height: 900 }, colorScheme: scheme });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-guest', '1'); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); localStorage.setItem('pomodorolist-intro-seen', '1'); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#appView:not(.hidden)'); await new Promise(r => setTimeout(r, 1200));
  await p.evaluate(m => {
    document.querySelectorAll('dialog[open]').forEach(x => x.close());
    S.settings.motion = m; if (typeof applyMotion === 'function') applyMotion();
    const t = tierById('focused');
    const rows = BOSSES.map(b => {
      const cell = (id, mode) => { const a = SPECIAL_AURAS[id]; return `<div class="gcell"><div class="gl">${mode} · lv ${a.lv}</div>
        <div class="lbrow">${withAura(badgeSVG(t, { size: 26, frame: 'frame_none', avatar: 'av_owl' }), 0, id)}<span>@friend</span></div>
        <div class="big">${withAura(badgeSVG(t, { size: 72, frame: 'frame_orbit', avatar: 'av_b_' + b.id + (mode === 'Squad' ? '_sq' : '') }), 0, id)}</div></div>`; };
      return `<div class="grow"><div class="gname">${esc(b.short)}<br><small>${bossTier(b.id).name}</small></div>${cell('au_b_' + b.id, 'Solo')}${cell('au_b_' + b.id + '_sq', 'Squad')}</div>`;
    }).join('');
    document.body.innerHTML = `<style>.gwrap{padding:18px;display:grid;grid-template-columns:repeat(2,1fr);gap:14px 26px;background:var(--bg);color:var(--text);font:13px system-ui}
      .grow{display:grid;grid-template-columns:80px 1fr 1fr;gap:14px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
      .gcell{display:grid;grid-template-columns:auto auto;gap:6px 18px;align-items:center}.gl{grid-column:1/-1;color:var(--muted);font-size:11px}
      .lbrow{display:flex;gap:8px;align-items:center}.big{padding:10px}.gname b{font-weight:700}</style><div class="gwrap">${rows}</div>`;
  }, motion);
  await new Promise(r => setTimeout(r, 900));
  await p.screenshot({ path: `${out}-${scheme}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
