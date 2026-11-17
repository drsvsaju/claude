// Phase 4: the before / after numbers as a picture (for the gallery): node numbers4.mjs <before.jsonl> <after.jsonl> <out.jpg>
import { chromium } from 'playwright';
import fs from 'fs';
const [bf, af, out] = process.argv.slice(2);
const load = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l)).map(d => [d.tag, d]));
const B = load(bf), A = load(af);
const cols = [['demo', 'Ordinary account, laptop'], ['big', 'Large account, laptop'], ['big-phone', 'Large account, phone'], ['big-4x', 'Large account, laptop, processor 4× slower']];
const cell = (b, a, lowerIsBetter = true) => { const better = lowerIsBetter ? a < b : a > b, same = a === b; return `<td><span class="b">${b}</span> → <b class="${same ? '' : better ? 'good' : 'bad'}">${a}</b></td>`; };
const rows = [
  ['Frames a second, a focus block running', d => d.frames.timerRunning.fps, false],
  ['Frames a second, scrolling', d => d.frames.scroll.fps, false],
  ['Interactions slower than 200 ms', d => d.over200, true],
  ['Interactions slower than 100 ms', d => d.over100, true],
  ['Slowest interaction, ms', d => d.inpWorst[0].ms, true],
  ['Profile tab, ms', d => Math.round(d.tabs.profile.ms), true],
  ['Bag tab, ms', d => Math.round(d.tabs.bag.ms), true],
  ['Posts tab, ms', d => Math.round(d.tabs.posts.ms), true],
  ['Leaderboard tab, ms', d => Math.round(d.tabs.board.ms), true],
  ['Start to first frame, ms', d => d.startMs, true],
];
const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; background: #121416; color: #e7e9e8; font: 17px/1.45 system-ui, 'DejaVu Sans', sans-serif; padding: 34px 40px 30px; width: 1500px; }
  h1 { font-size: 26px; margin: 0 0 4px; } p { color: #a9b0ae; margin: 0 0 22px; max-width: 1300px; }
  table { border-collapse: collapse; width: 100%; } th, td { text-align: left; padding: 11px 14px; border-top: 1px solid #2a2e30; white-space: nowrap; }
  th { color: #a9b0ae; font-weight: 600; font-size: 14.5px; border-top: 0; white-space: normal; vertical-align: bottom; } td:first-child { color: #cfd4d2; }
  .b { color: #9aa19f; } b { font-weight: 700; } .good { color: #6fd0bd; } .bad { color: #e6a15c; }
  .extra td { color: #cfd4d2; } small { color: #8e9693; }
</style>
<h1>Phase 4 — before → after</h1>
<p>Measured by tests/perf4.mjs on the read-only demo account, as it is and made large (2 years of sessions, 50 friends, 240 to-dos). The machine has no graphics chip, so painting costs show as they do on a weak phone. 39 interactions are measured on a laptop, 26 on a phone.</p>
<table><tr><th></th>${cols.map(c => `<th>${c[1]}</th>`).join('')}</tr>
${rows.map(([name, f, low]) => `<tr><td>${name}</td>${cols.map(([t]) => cell(f(B[t]), f(A[t]), low)).join('')}</tr>`).join('\n')}
<tr class="extra"><td>Frames a second, Timer at rest</td><td><span class="b">26</span> → <b class="good">58</b></td><td colspan="3"><small>desktop, measured separately</small></td></tr>
<tr class="extra"><td>Frames a second, a dialog open</td><td><span class="b">15</span> → <b class="good">60</b></td><td colspan="3"></td></tr>
<tr class="extra"><td>Texts below AA contrast, default theme, every screen</td><td colspan="4"><span class="b">600 in 168 places</span> → <b class="good">__AA__</b> <small>&nbsp; (7,700 texts measured in 70 states, light and dark)</small></td></tr>
</table>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await (await b.newContext({ viewport: { width: 1580, height: 900 }, deviceScaleFactor: 2 })).newPage();
await p.setContent(html.replace('__AA__', process.env.AA || '0'));
const el = await p.$('body'); await el.screenshot({ path: out, type: 'jpeg', quality: 90 });
await b.close(); console.log('written', out);
