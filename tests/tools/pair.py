"""Before / after pictures side by side: python3 pair.py <beforeDir> <afterDir> <outDir> <id--variant> [<id--variant> …] [--maxh 1800] [--labels "Before|After"]
Each output is <outDir>/ba-<id--variant>.jpg: the two screenshots at the same scale with a label strip on top."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
args = sys.argv[1:]
maxh, labels = 2000, ['Before · v1.20', 'After · v2.0']
if '--maxh' in args: i = args.index('--maxh'); maxh = int(args[i + 1]); del args[i:i + 2]
if '--labels' in args: i = args.index('--labels'); labels = args[i + 1].split('|'); del args[i:i + 2]
bdir, adir, odir, names = args[0], args[1], args[2], args[3:]
os.makedirs(odir, exist_ok=True)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
except Exception: font = ImageFont.load_default()
for n in names:
    fb, fa = os.path.join(bdir, n + '.jpg'), os.path.join(adir, n + '.jpg')
    if not (os.path.exists(fb) and os.path.exists(fa)): print('missing', n); continue
    b, a = Image.open(fb).convert('RGB'), Image.open(fa).convert('RGB')
    w = min(b.width, a.width)
    if b.width != w: b = b.resize((w, int(b.height * w / b.width)))
    if a.width != w: a = a.resize((w, int(a.height * w / a.width)))
    h = min(max(b.height, a.height), maxh)
    gap, top = 24, 64
    sheet = Image.new('RGB', (w * 2 + gap, h + top), (18, 19, 22))
    d = ImageDraw.Draw(sheet)
    for i, (im, lab) in enumerate(((b, labels[0]), (a, labels[1]))):
        x = i * (w + gap)
        sheet.paste(im.crop((0, 0, w, min(im.height, h))), (x, top))
        d.text((x + 16, 14), lab, fill=(235, 236, 238) if i == 0 else (120, 220, 200), font=font)
    out = os.path.join(odir, 'ba-' + n + '.jpg')
    sheet.save(out, quality=86)
    print(out, sheet.size)
