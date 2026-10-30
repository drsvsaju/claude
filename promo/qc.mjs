// Quality check on the animation itself (no video needed): for both formats and every 0.1 s, every visible text block
// must sit inside the frame with a safe margin, must not be clipped, must not overlap another text block, and every
// headline must stay readable (opacity ≥ .9) for at least MIN_HOLD seconds. Prints the violations; exit 1 if any.
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIN_HOLD = 1.2, STEP = .1, MARGIN = 36;
const b = await chromium.launch();
let bad = 0;
for (const fmt of ['landscape', 'portrait']) {
  const W = fmt === 'portrait' ? 1080 : 1920, H = fmt === 'portrait' ? 1920 : 1080;
  const p = await b.newPage({ viewport: { width: W, height: H } });
  p.on('pageerror', e => { console.log(`${fmt}: page error ${e.message}`); bad++; });
  await p.goto('file://' + path.join(HERE, 'promo.html') + `?fmt=${fmt}`); await p.evaluate(() => window.ready);
  const hold = new Map(), seen = new Map();
  for (let t = 0; t <= 30.0001; t += STEP) {
    const r = await p.evaluate(([t, W, H, MARGIN]) => {
      seek(t);
      const out = [], boxes = [];
      const vis = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { if (e.classList.contains('hidden')) return 0; } let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
      for (const el of document.querySelectorAll('.h1, .h2, .sub, .badge, .link, .pill, .cap, #bossHpLabel, #harvestCard')) {
        const o = vis(el); if (o < .5) continue;
        const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); if (!r.width || !r.height) continue;   // the text itself, not a full-width box
        const id = el.id || el.className;
        if (r.left < MARGIN || r.top < MARGIN || r.right > W - MARGIN || r.bottom > H - MARGIN) out.push(`${id} outside the safe area (${Math.round(r.left)},${Math.round(r.top)}→${Math.round(r.right)},${Math.round(r.bottom)})`);
        if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') out.push(`${id} clipped text`);
        boxes.push({ id, r, o });
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { if (boxes[i].o < .85 || boxes[j].o < .85) continue; const a = boxes[i].r, c = boxes[j].r; if (a.left < c.right - 4 && c.left < a.right - 4 && a.top < c.bottom - 4 && c.top < a.bottom - 4 && !(boxes[i].id.includes('cap') || boxes[j].id.includes('cap'))) out.push(`${boxes[i].id} overlaps ${boxes[j].id}`); }
      const heads = [...document.querySelectorAll('.h1, .h2, .badge, .link, .pill, #promiseSub, #timerSub')].filter(el => vis(el) >= .9 && el.getBoundingClientRect().width > 0).map(el => el.id || el.className);
      return { out, heads };
    }, [t, W, H, MARGIN]);
    for (const m of r.out) { const k = `${fmt} ${m}`; if (!seen.has(k)) { seen.set(k, t); console.log(`✗ ${fmt} t=${t.toFixed(1)}: ${m}`); bad++; } }
    for (const h of r.heads) hold.set(h, (hold.get(h) || 0) + STEP);
  }
  for (const [h, s] of hold) { const ok = s >= MIN_HOLD - 1e-6; console.log(`${ok ? '✓' : '✗'} ${fmt} ${h} readable for ${s.toFixed(1)} s`); if (!ok) bad++; }
  await p.close();
}
await b.close();
console.log(bad ? `${bad} problems` : 'QC clean');
process.exit(bad ? 1 : 0);
