// Colour roles of the default palette, as CSS — generated from the app's own derivedFor() so the stylesheet's
// first-paint literals cannot drift from what the script writes.
//   node tokens.mjs [path/to/index.html]            print the two blocks
//   node tokens.mjs [path/to/index.html] --write    replace the text between the GENERATED markers in the stylesheet
import fs from 'fs';
const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/home/user/claude/index.html';
let s = fs.readFileSync(file, 'utf8');
const a = s.indexOf('const colParse = '), b = s.indexOf('let derivedSet = [];');
if (a < 0 || b < 0) { console.error('engine not found'); process.exit(1); }
const derivedFor = new Function(s.slice(a, b) + '\nreturn derivedFor;')();
const decl = (dark) => { const o = derivedFor('default:' + dark, dark, null); return Object.entries(o).map(([k, v]) => `--${k}: ${v};`); };
const wrap = (lines, ind) => { const out = []; let cur = ind; for (const d of lines) { if (cur.length + d.length > 150 && cur.trim()) { out.push(cur.trimEnd()); cur = ind; } cur += d + ' '; } if (cur.trim()) out.push(cur.trimEnd()); return out.join('\n'); };
const css = `/* GENERATED: colour roles of the default palette (node tests/tools/tokens.mjs --write). Do not edit by hand. */
:root {
${wrap(decl(false), '  ')}
}
:root[data-theme="dark"] {
${wrap(decl(true), '  ')}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${wrap(decl(true), '    ')}
  }
}
/* END GENERATED */`;
if (process.argv.includes('--write')) {
  const i = s.indexOf('/* GENERATED: colour roles'), j = s.indexOf('/* END GENERATED */');
  if (i < 0 || j < 0) { console.error('markers not found'); process.exit(1); }
  s = s.slice(0, i) + css + s.slice(j + '/* END GENERATED */'.length);
  fs.writeFileSync(file, s); console.log('written');
} else console.log(css);
