# Contrast ratios from what a11y4.mjs captured:  python3 a11y4.py <dir> [--all] [--json out.json]
# For each text: its colour (computed style × every ancestor's opacity) over the background that was really drawn
# behind it (the median of the picture taken with the text transparent). WCAG 2.1 AA: 4.5, or 3.0 for large text
# (24 px, or 18.66 px bold). Text on disabled controls is listed apart (exempt). Prints the failures grouped by
# where they come from, the worst first.
import json, sys, glob, os, re
from PIL import Image

def lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
def lum(rgb): return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
def parse(c):
    m = re.match(r'rgba?\(([^)]+)\)', c or '')
    if m:
        p = [x.strip() for x in re.split(r'[,/ ]+', m.group(1)) if x.strip()]
        return [float(p[0]), float(p[1]), float(p[2])], (float(p[3].rstrip('%')) / (100 if p[3].endswith('%') else 1) if len(p) > 3 else 1.0)
    m = re.match(r'color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: / ([\d.]+))?\)', c or '')
    if m: return [float(m.group(i)) * 255 for i in (1, 2, 3)], float(m.group(4) or 1)
    return None, 0

d = sys.argv[1]; show_all = '--all' in sys.argv
groups, total, fails, states, exempt = {}, 0, 0, 0, 0
for jf in sorted(glob.glob(os.path.join(d, '*.json'))):
    data = json.load(open(jf)); png = jf[:-5] + '.png'
    if not os.path.exists(png): continue
    im = Image.open(png).convert('RGB'); W, H = im.size; px = im.load(); states += 1
    key = f"{data['skin']}.{data['mode']}"
    for it in data['items']:
        x0, y0, x1, y1 = int(it['x']), int(it['y']), int(it['x'] + it['w']), int(it['y'] + it['h'])
        if x0 < 0 or y0 < 0 or x1 > W or y1 > H or x1 - x0 < 2: continue
        pts = [(x0 + (x1 - x0) * i // 6, y0 + (y1 - y0) * j // 4) for i in range(1, 6) for j in range(1, 4)]
        cols = sorted((px[min(W - 1, x), min(H - 1, y)] for x, y in pts), key=lum)
        bg = cols[len(cols) // 2]
        fgs = []
        if it.get('grad'):
            for m in re.finditer(r'rgba?\([^)]+\)', it['grad']):
                c, a = parse(m.group(0))
                if c: fgs.append((c, a))
        else:
            c, a = parse(it['color'])
            if c: fgs.append((c, a))
        if not fgs: continue
        worst = 99
        for c, a in fgs:
            a *= it['op']
            if a < 0.03: continue   # not shown at all (a hidden state)
            eff = [c[i] * a + bg[i] * (1 - a) for i in range(3)]
            worst = min(worst, ratio(eff, bg))
        if worst == 99: continue
        large = it['size'] >= 24 or (it['size'] >= 18.66 and it['weight'] >= 700)
        need = 3.0 if large else 4.5
        total += 1
        if it['dis']:
            if worst < need: exempt += 1
            continue
        if worst < need:
            fails += 1
            g = groups.setdefault(it['sig'], {'n': 0, 'worst': 99, 'where': set(), 'ex': '', 'need': need, 'kind': it['kind'], 'size': it['size']})
            g['n'] += 1; g['where'].add(key + '.' + data['view'])
            if worst < g['worst']: g['worst'] = worst; g['ex'] = f"{it['text']!r} {it['color']} ×{it['op']} on rgb{bg} · {key}.{data['view']}"
print(f"{states} states · {total} texts measured · {fails} below AA in {len(groups)} places · {exempt} on disabled controls (exempt)")
rows = sorted(groups.items(), key=lambda kv: kv[1]['worst'])
for sig, g in rows[: (len(rows) if show_all else 60)]:
    skins = sorted({w.rsplit('.', 1)[0] for w in g['where']})
    print(f"  {g['worst']:4.2f} (needs {g['need']}) ×{g['n']:<4d} {sig[:110]}\n        {g['ex'][:150]}\n        in {len(g['where'])} states: {', '.join(skins[:8])}{' …' if len(skins) > 8 else ''}")
if '--json' in sys.argv:
    json.dump({'states': states, 'texts': total, 'fails': fails, 'places': len(groups), 'exempt': exempt}, open(sys.argv[sys.argv.index('--json') + 1], 'w'))
