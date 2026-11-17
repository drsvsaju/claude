"""Several screenshots on one sheet: python3 sheet.py <out.jpg> <img> [<img> …] [--labels "a|b|c"] [--cols 3] [--h 900] [--crop x,y,w,h]
Each picture is scaled to the same height (--h), with its label on a strip above it. --crop cuts every picture first
(in the pictures' own pixels)."""
import sys
from PIL import Image, ImageDraw, ImageFont
args = sys.argv[1:]
def opt(name, default):
    if name in args:
        i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
    return default
labels = opt('--labels', ''); cols = int(opt('--cols', '0')); H = int(opt('--h', '900')); crop = opt('--crop', '')
out, files = args[0], args[1:]
labels = labels.split('|') if labels else [''] * len(files)
cols = cols or len(files)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
except Exception: font = ImageFont.load_default()
ims = []
for f in files:
    im = Image.open(f).convert('RGB')
    if crop:
        x, y, w, h = [int(v) for v in crop.split(',')]; im = im.crop((x, y, min(im.width, x + w), min(im.height, y + h)))
    ims.append(im.resize((max(1, int(im.width * H / im.height)), H)))
gap, top = 24, 56
rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
W = max(sum(im.width for im in r) + gap * (len(r) - 1) for r in rows)
sheet = Image.new('RGB', (W, (H + top) * len(rows) + gap * (len(rows) - 1)), (18, 19, 22))
d = ImageDraw.Draw(sheet); n = 0
for ri, r in enumerate(rows):
    x, y = 0, ri * (H + top + gap)
    for im in r:
        d.text((x + 12, y + 12), labels[n] if n < len(labels) else '', fill=(120, 220, 200), font=font)
        sheet.paste(im, (x, y + top)); x += im.width + gap; n += 1
sheet.save(out, quality=86)
print(out, sheet.size)
