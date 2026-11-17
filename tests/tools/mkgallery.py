"""The picture gallery of the release: python3 mkgallery.py [screenshots/v2.0]
Writes <dir>/gallery.html: one section per phase folder, before/after pairs first, every picture with a one-line
caption made from its file name (or from the CAPTIONS table below). The page is one static file with relative links,
so it opens from the repository, from a download of the folder, or from GitHub Pages. Nothing is fetched from the web.
The baseline folder (every screen before the release, 180 pictures) is linked, not embedded."""
import os, sys, html
ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'screenshots', 'v2.0')
ROOT = os.path.abspath(ROOT)
PHASES = [
    ('01-controls', 'Phase 1 · the design tokens and the controls', 'One set of sizes, spacing, radii and type; the first shared components.'),
    ('02-native-controls', 'Phase 2 · no browser-native controls left', 'Every select, date, time, number, colour, checkbox and confirm is the app’s own.'),
    ('03-visual', 'Phase 3 · visual consistency', 'Cards, headings, lists, dialogs and empty states made to agree on every screen.'),
    ('04-perf-a11y', 'Phase 4 · speed and accessibility', 'Faster tab switches and long lists; contrast, focus and 44 px targets in every theme.'),
    ('05-calendar', 'Phase 5 · all-day reminders and the Calendar', 'Month, week, day and agenda; planned focus blocks; drag to move; export.'),
    ('06-focus', 'Phase 6 · focus features', 'Intention and debrief, kinder streaks, break ideas, fuller insights.'),
    ('07-invites', 'Phase 7 · invites and link previews', 'A personal invite link with a gift for both, and how a pasted link looks.'),
    ('08-final', 'Phase 8 · the finished release', 'A last look across screens, themes and sizes.'),
]
WORDS = {'d': 'desktop', 'ba': '', 'dlg': 'dialog', 'cal': 'Calendar', 'rem': 'reminder', 'dark': 'dark', 'light': 'light', 'phone': 'phone'}
CAPTIONS = {
    '06-focus/streak-rows.jpg': 'The “Streak care” row in its five states',
    '06-focus/streak-care.jpg': 'The Streak care dialog: light, dark with a pause running, and on a phone',
    '06-focus/break-ideas.jpg': 'Break ideas: the menu, a breathing minute, stretch cards, the eye rest, water',
    '06-focus/phone.jpg': 'Phase 6 on a phone: Today, the timer on a break, break ideas, breathing',
    '04-perf-a11y/numbers.jpg': 'Measured speed before and after',
}
def caption(folder, name):
    key = folder + '/' + name
    if key in CAPTIONS: return CAPTIONS[key]
    base = os.path.splitext(name)[0]
    pair = base.startswith('ba-')
    if pair: base = base[3:]
    what, _, variant = base.partition('--')
    text = what.replace('-', ' ').strip().capitalize()
    v = ' · '.join(WORDS.get(p, p) for p in variant.split('-') if WORDS.get(p, p))
    return ('Before and after: ' if pair else '') + text + (' (' + v + ')' if v else '')
out = ['<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
       '<title>Pomodorolist 2.0 · picture gallery</title><style>',
       ':root{color-scheme:light dark}body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Inter,sans-serif;background:#f6f6f3;color:#1f2322}',
       '@media (prefers-color-scheme:dark){body{background:#17191b;color:#e9ebe8}figure{background:#202326!important;border-color:#2c3033!important}nav a{background:#202326!important;border-color:#2c3033!important;color:inherit!important}p.sub,figcaption{color:#a3aaa6!important}}',
       'main{max-width:1500px;margin:0 auto;padding:28px 20px 80px}h1{font-size:30px;margin:0 0 6px;letter-spacing:-.02em}h2{font-size:21px;margin:44px 0 2px;letter-spacing:-.01em}',
       'p.sub{margin:0 0 16px;color:#626a67}nav{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 0}nav a{padding:7px 13px;border-radius:999px;background:#fff;border:1px solid #e5e5df;color:#1f2322;text-decoration:none;font-size:14px}',
       '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px}.grid.wide{grid-template-columns:1fr}',
       'figure{margin:0;padding:10px;border-radius:14px;background:#fff;border:1px solid #e5e5df}figure img{display:block;width:100%;height:auto;border-radius:8px}figcaption{padding:8px 4px 2px;font-size:14px;color:#4c5451}',
       '@media (max-width:520px){.grid{grid-template-columns:1fr}}',
       '</style></head><body><main>',
       '<h1>Pomodorolist 2.0 · picture gallery</h1>',
       '<p class="sub">Every phase of the release, before and after. Pictures are taken from the demo account at twice the screen’s size; tap one to open it full size.</p>']
found = [(f, t, d) for f, t, d in PHASES if os.path.isdir(os.path.join(ROOT, f)) and any(n.lower().endswith(('.jpg', '.png')) for n in os.listdir(os.path.join(ROOT, f)))]
out.append('<nav>' + ''.join(f'<a href="#{f}">{html.escape(t.split(" · ")[0])}</a>' for f, t, d in found) + ('<a href="00-baseline/">Baseline (all screens before)</a>' if os.path.isdir(os.path.join(ROOT, '00-baseline')) else '') + '</nav>')
total = 0
for folder, title, desc in found:
    names = sorted(n for n in os.listdir(os.path.join(ROOT, folder)) if n.lower().endswith(('.jpg', '.png')))
    pairs = [n for n in names if n.startswith('ba-')]; rest = [n for n in names if not n.startswith('ba-')]
    out.append(f'<h2 id="{folder}">{html.escape(title)}</h2><p class="sub">{html.escape(desc)} {len(names)} pictures.</p>')
    for group, cls in ((pairs, 'grid wide' if len(pairs) <= 12 else 'grid'), (rest, 'grid')):
        if not group: continue
        out.append(f'<div class="{cls}">')
        for n in group:
            cap = html.escape(caption(folder, n)); src = html.escape(folder + '/' + n)
            out.append(f'<figure><a href="{src}"><img loading="lazy" src="{src}" alt="{cap}"></a><figcaption>{cap}</figcaption></figure>')
        out.append('</div>')
    total += len(names)
out.append('</main></body></html>')
open(os.path.join(ROOT, 'gallery.html'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('gallery.html:', len(found), 'phases,', total, 'pictures')
