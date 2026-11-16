// WCAG contrast of the reference direction, measured from the colours the browser actually resolves.
// Usage: node contrast.mjs            → prints a Markdown table and writes contrast.json
// Each colour is resolved in Chromium (color-mix, relative colour and alpha included), painted onto a
// canvas in the listed order (so translucent tints are composited over their real layer), read back as
// sRGB bytes, and the ratio is then computed here in Node with the WCAG 2.x formula.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = pathToFileURL(path.join(HERE, 'proto.html')).href;
const MODES = [['default', 'light'], ['default', 'dark'], ['sunset', 'light'], ['sunset', 'dark']];

const v = (n) => `var(--${n})`;
const pad = (layer) => `color-mix(in oklab, ${v(layer)}, var(--text) var(--k-raise))`;
const LAYERS = ['frame', 'stage', 'card-quiet', 'card', 'card-hi', 'pop', 'well'];

// [group, label, need, foreground stack, background stack]   (a stack is painted bottom → top)
const PAIRS = [];
const add = (group, label, need, fg, bg) => PAIRS.push({ group, label, need, fg: [].concat(fg), bg: [].concat(bg) });

// ── Text, needs 4.5 ──
for (const L of LAYERS) add('text', `ink on ${L}`, 4.5, v('ink'), v(L));
for (const L of LAYERS) add('text', `ink-2 on ${L}`, 4.5, v('ink-2'), v(L));
for (const L of ['frame', 'card', 'pop']) add('text', `ink-2 on hover row over ${L}`, 4.5, v('ink-2'), [v(L), v('hover')]);
for (const L of LAYERS) add('text', `accent-ink on ${L}`, 4.5, v('accent-ink'), v(L));
for (const L of ['card-quiet', 'card', 'pop', 'well']) add('text', `accent-ink on accent-soft over ${L}`, 4.5, v('accent-ink'), [v(L), v('accent-soft')]);
add('text', 'on-accent on accent-fill (Start, Save)', 4.5, v('on-accent'), v('accent-fill'));
add('text', 'on-accent on accent-fill-hover', 4.5, v('on-accent'), v('accent-fill-hover'));
add('text', 'on-accent on danger-fill (Delete)', 4.5, v('on-accent'), v('danger-fill'));
add('text', 'on-accent on danger-fill-hover', 4.5, v('on-accent'), v('danger-fill-hover'));
for (const L of ['card', 'pop']) add('text', `danger-ink on ${L} (error text, Delete… row)`, 4.5, v('danger-ink'), v(L));
add('text', 'warn-ink on card-quiet (1 overdue)', 4.5, v('warn-ink'), v('card-quiet'));
add('text', 'warn-ink on warn-soft over card', 4.5, v('warn-ink'), [v('card'), v('warn-soft')]);
add('text', 'ok-ink on ok-soft over pop', 4.5, v('ok-ink'), [v('pop'), v('ok-soft')]);
add('text', 'danger-ink on danger-soft over pop', 4.5, v('danger-ink'), [v('pop'), v('danger-soft')]);
for (const L of LAYERS) add('text', `ink on neutral pad over ${L}`, 4.5, v('ink'), pad(L));
add('text', 'ink-2 on neutral pad over frame (search hint)', 4.5, v('ink-2'), pad('frame'));
add('text', 'ink on label chip over pad on frame (Lv 19)', 4.5, v('ink'), [pad('frame'), v('hover')]);
add('text', 'ink-2 on rhythm chip, second cell, over pop', 4.5, v('ink-2'), [v('pop'), v('hover')]);
add('text', 'accent-ink on ready tag (accent-soft over card-quiet)', 4.5, v('accent-ink'), [v('card-quiet'), v('accent-soft')]);
add('text', 'card on ink (phone tab badge)', 4.5, v('card'), v('ink'));
add('text', 'ink-2 on kbd over pop', 4.5, v('ink-2'), [v('pop'), v('hover')]);
add('text', 'ink on count pill over frame (sidebar 2)', 4.5, v('ink'), [v('frame'), v('hover')]);
add('text', 'ink on tag inside a well', 4.5, v('ink'), 'color-mix(in oklab, var(--well), var(--text) 12%)');
add('text', 'inverse on ink (tooltip, badge)', 4.5, v('inverse'), v('ink'));
add('text', 'frame on ink (inbox badge)', 4.5, v('frame'), v('ink'));
add('text', 'placeholder (ink-2) in well', 4.5, v('ink-2'), v('well'));

// ── Boundaries and graphics, need 3 ──
for (const L of LAYERS) add('edge', `edge on ${L} (well lip, pad ring, switch off)`, 3, v('edge'), v(L));
for (const L of ['frame', 'card', 'card-hi', 'pop']) add('edge', `edge against its own pad fill over ${L}`, 0, v('edge'), pad(L));
for (const L of ['card-quiet', 'card', 'card-hi', 'pop']) add('edge', `accent-fill on ${L} (ring arc, bar, switch on, checked box)`, 3, v('accent-fill'), v(L));
add('edge', 'accent-fill on track (bar fill vs empty part)', 0, v('accent-fill'), v('track'));
for (const L of LAYERS) add('edge', `focus ring on ${L}`, 3, v('focus'), v(L));
add('edge', 'accent-ink ring of the chosen segment on well', 3, v('accent-ink'), v('well'));
add('edge', 'danger-ink edge of an error field on card', 3, v('danger-ink'), v('card'));
add('edge', 'switch knob (surface) on off track (edge)', 3, v('surface'), v('edge'));
add('edge', 'switch knob (on-accent) on accent-fill', 3, v('on-accent'), v('accent-fill'));
add('edge', 'today outline (ink) on pop', 3, v('ink'), v('pop'));
add('edge', 'warn-ink icon on card-quiet (flame)', 3, v('warn-ink'), v('card-quiet'));
add('edge', 'warn-ink star on pop', 3, v('warn-ink'), v('pop'));
add('edge', 'ok-ink on frame (sync icon)', 3, v('ok-ink'), v('frame'));
add('edge', 'ok-ink plant on card-quiet', 3, v('ok-ink'), v('card-quiet'));
add('edge', 'ok-ink plant on accent-soft over card-quiet (ready tile)', 3, v('ok-ink'), [v('card-quiet'), v('accent-soft')]);
// ── Glossed Interface, worst case: text on a translucent card that sits on the accent blob behind the glass ──
const blob = 'color-mix(in srgb, var(--accent) var(--k-blob), transparent)';
const glass = (layer, fill) => `color-mix(in srgb, ${v(layer)} ${fill}%, transparent)`;
for (const [mode, fill] of [['Lite', 80], ['Full', 64]]) {
  add('glass', `Glossed ${mode}: ink-2 on card-quiet at ${fill}% over the accent blob`, 4.5, v('ink-2'), [v('stage'), blob, glass('card-quiet', fill)]);
  add('glass', `Glossed ${mode}: accent-ink on card at ${fill}% over the accent blob`, 4.5, v('accent-ink'), [v('stage'), blob, glass('card', fill)]);
  add('glass', `Glossed ${mode}: edge on card at ${fill}% over the accent blob`, 3, v('edge'), [v('stage'), blob, glass('card', fill)]);
}
add('glass', 'for reference, v1.20 Full fill: ink-2 on card-quiet at 55% over the accent blob', 0, v('ink-2'), [v('stage'), blob, glass('card-quiet', 55)]);
add('glass', 'for reference, v1.20 Full fill: edge on card at 55% over the accent blob', 0, v('edge'), [v('stage'), blob, glass('card', 55)]);
add('glass', 'Glossed: ink-2 on pop at 94% over the accent blob', 4.5, v('ink-2'), [v('stage'), blob, glass('pop', 94)]);
add('deco', 'track on card-hi (empty ring)', 0, v('track'), v('card-hi'));
add('deco', '5-minute tick on card-hi', 0, [v('card-hi'), 'color-mix(in srgb, var(--text) 42%, transparent)'], v('card-hi'));
add('deco', 'divider on card', 0, [v('card'), v('divider')], v('card'));
add('deco', 'card on stage (surface step)', 0, v('card'), v('stage'));
add('deco', 'card-hi on stage (hero step)', 0, v('card-hi'), v('stage'));
add('deco', 'stage on frame', 0, v('stage'), v('frame'));

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hex = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('');

const browser = await chromium.launch();
const out = {};
for (const [skin, mode] of MODES) {
  const page = await browser.newPage();
  await page.goto(`${PAGE}?view=components&mode=${mode}&skin=${skin}`);
  out[`${skin} ${mode}`] = await page.evaluate((pairs) => {
    const probe = document.createElement('i'); document.body.appendChild(probe);
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const paint = (stack) => {
      ctx.clearRect(0, 0, 1, 1);
      for (const expr of stack) {
        probe.style.color = ''; probe.style.color = expr;
        if (!probe.style.color) throw new Error('unparsed colour: ' + expr);
        ctx.fillStyle = getComputedStyle(probe).color; ctx.fillRect(0, 0, 1, 1);
      }
      const d = ctx.getImageData(0, 0, 1, 1).data;
      if (d[3] !== 255) throw new Error('not opaque: ' + stack.join(' + '));
      return [d[0], d[1], d[2]];
    };
    return pairs.map((p) => ({ fg: paint(p.bg.concat(p.fg.length > 1 ? p.fg.slice(1) : p.fg)), bg: paint(p.bg) }));
  }, PAIRS);
  await page.close();
}
await browser.close();

const keys = Object.keys(out);
const rows = PAIRS.map((p, i) => {
  const r = keys.map((k) => ratio(out[k][i].fg, out[k][i].bg));
  return { ...p, r, min: Math.min(...r), colours: Object.fromEntries(keys.map((k) => [k, [hex(out[k][i].fg), hex(out[k][i].bg)]])) };
});
let fails = 0;
const f = (n) => n.toFixed(2);
console.log(`| Pair | ${keys.join(' | ')} | Lowest | Needs |`);
console.log(`|---|${keys.map(() => '---:').join('|')}|---:|---:|`);
for (const row of rows) {
  const bad = row.need && row.min < row.need; if (bad) fails++;
  console.log(`| ${row.label} | ${row.r.map(f).join(' | ')} | ${bad ? '**' + f(row.min) + ' FAIL**' : f(row.min)} | ${row.need || '–'} |`);
}
console.log(`\n${rows.length} pairs × ${keys.length} modes. ${fails ? fails + ' pair(s) below the bar.' : 'Every pair with a requirement passes.'}`);
fs.writeFileSync(path.join(HERE, 'contrast.json'), JSON.stringify(rows.map(({ group, label, need, r, min, colours }) => ({ group, label, need, ratios: Object.fromEntries(keys.map((k, i) => [k, +r[i].toFixed(2)])), lowest: +min.toFixed(2), colours })), null, 1));
process.exit(fails ? 1 : 0);
