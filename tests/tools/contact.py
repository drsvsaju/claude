"""Contact sheets: python3 contact.py <dir> <variant> <out-prefix> [cols] [thumb-width] [max-thumb-height]
Lays the screenshots of one variant out in a labelled grid so they can be checked at a glance."""
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont
d, variant, outp = sys.argv[1], sys.argv[2], sys.argv[3]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
tw = int(sys.argv[5]) if len(sys.argv) > 5 else 480
mh = int(sys.argv[6]) if len(sys.argv) > 6 else 420
per = cols * 3
files = sorted(glob.glob(os.path.join(d, f'*--{variant}.jpg')) + glob.glob(os.path.join(d, f'*--{variant}.png')))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except Exception: font = ImageFont.load_default()
for s in range(0, len(files), per):
    chunk = files[s:s + per]
    rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (tw + 10) + 10, rows * (mh + 34) + 10), (24, 24, 28))
    dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(chunk):
        im = Image.open(f).convert('RGB')
        r = tw / im.width
        im = im.resize((tw, max(1, int(im.height * r))))
        if im.height > mh: im = im.crop((0, 0, tw, mh))
        x, y = 10 + (i % cols) * (tw + 10), 10 + (i // cols) * (mh + 34)
        sheet.paste(im, (x, y + 24))
        dr.text((x, y + 3), os.path.basename(f).split('--')[0], fill=(240, 240, 240), font=font)
    out = f'{outp}-{s // per + 1}.jpg'
    sheet.save(out, quality=82)
    print(out, sheet.size)
