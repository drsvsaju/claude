import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
await ctx.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-guest', '1'); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); localStorage.setItem('pomodorolist-intro-seen', '1'); });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
const p = await ctx.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#appView:not(.hidden)'); await new Promise(r => setTimeout(r, 1200));
const res = await p.evaluate(() => {
  const out = { long: [], noRender: [], cats: {}, total: ITEMS.length, dupes: [] };
  const seen = new Set();
  const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch (e) { return []; } }).join('\n');
  for (const it of ITEMS) {
    if (seen.has(it.id)) out.dupes.push(it.id); seen.add(it.id);
    out.cats[it.cat] = (out.cats[it.cat] || 0) + 1;
    if (it.id.length > 30) out.long.push(it.id + ' (' + it.id.length + ')');
    let ok = true;
    if (it.cat === 'aura') ok = it.id === 'au_streak' || (!!SPECIAL_AURAS[it.id] && css.includes('.aura-x-' + it.id));
    else if (it.cat === 'color') ok = it.id === 'col_default' || !!NAME_GRADS[it.id] || !!NAME_COLORS[it.id];
    else if (it.cat === 'avatar') ok = !!AVATAR_ART[it.id];
    else if (it.cat === 'frame') ok = it.id === 'frame_none' || FRAMES[it.id] !== undefined;
    else if (it.cat === 'title') ok = it.id === 'ti_none' || !!TITLE_TEXT[it.id];
    else if (it.cat === 'stamp') ok = !!STAMP_ART[it.id] || /^stamp_b_/.test(it.id);
    else if (it.cat === 'card') ok = it.id === 'card_minimal' || !!CARD_STYLES[it.id] || !!(typeof CARD_DECO !== 'undefined' && CARD_DECO[it.id]);
    if (!ok) out.noRender.push(it.cat + ':' + it.id);
  }
  out.maxLen = Math.max(...ITEMS.map(i => i.id.length));
  out.longest = ITEMS.map(i => i.id).sort((a, b) => b.length - a.length).slice(0, 5);
  return out;
});
console.log(JSON.stringify(res, null, 1));
await b.close();
