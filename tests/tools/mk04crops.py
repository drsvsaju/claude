# Phase 4: zoomed before / after crops of the places whose text colours changed.
#   python3 mk04crops.py <beforeShots> <afterShots> <outDir>     (both shot at the same time, so the data is the same)
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
S = '/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/'
B, A, O = sys.argv[1].rstrip('/') + '/', sys.argv[2].rstrip('/') + '/', sys.argv[3]
os.makedirs(O, exist_ok=True)
boxes = json.load(open(S + 'fb/crops4.json'))
boxes['timer'] = [0, 69, 224, 420]
boxes['bag-legendary'] = [506, boxes['bag-legendary'][1], 758, 262]
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26); small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)
except Exception: font = small = ImageFont.load_default()
CAP = {'bag': 'Bag: the rarity word under each tile (a dot carries the colour, the word is readable)', 'bag-legendary': 'Bag: Legendary', 'bag-chips': 'Bag, dark theme: filter chips',
       'friends': 'Friends: name colours', 'aura': 'Profile: aura tiers not reached yet (words readable, a lock on the tier)', 'profile': 'Profile: streak milestones (the day chip) and aura tiers',
       'timer': 'Side column: labels', 'leaderboard': 'Leaderboard: podium and names', 'clan': 'Clan: members ("focusing" is the live accent, not red)', 'todo': 'To-do: subject tags as chips, "overdue" with a warning sign'}
def pair(ids, name, scale=1.0, variant='d-light', src=None):
    rows = []
    for i in ids:
        x, y, w, h = boxes[i]
        ims = []
        for d in (B, A):
            im = Image.open(d + (src or {}).get(i, i.split('-')[0] if i.startswith('bag') else i) + '--' + variant + '.jpg').convert('RGB')
            c = im.crop((max(0, x * 2), y * 2, min(im.width, (x + w) * 2), min(im.height, (y + h) * 2)))
            if scale != 1: c = c.resize((int(c.width * scale), int(c.height * scale)), Image.LANCZOS)
            ims.append(c)
        rows.append((i, ims))
    W = max(r[1][0].width + r[1][1].width for r in rows) + 60
    H = sum(max(r[1][0].height, r[1][1].height) + 110 for r in rows) + 20
    sheet = Image.new('RGB', (W, H), (18, 19, 22)); d = ImageDraw.Draw(sheet); yy = 14
    for i, (b, a) in rows:
        d.text((20, yy), CAP[i], fill=(235, 236, 238), font=font); yy += 44
        d.text((20, yy), 'Before · phase 3', fill=(190, 192, 196), font=small); d.text((40 + b.width, yy), 'After · phase 4', fill=(120, 220, 200), font=small); yy += 34
        sheet.paste(b, (20, yy)); sheet.paste(a, (40 + b.width, yy)); yy += max(b.height, a.height) + 32
    sheet.save(O + '/' + name, quality=88); print(name, sheet.size)
pair(['bag'], 'ba-contrast-bag.jpg')
pair(['friends', 'timer'], 'ba-contrast-names-nav.jpg')
pair(['aura', 'profile'], 'ba-contrast-profile.jpg', 0.8, src={'aura': 'profile'})
pair(['leaderboard'], 'ba-contrast-leaderboard.jpg', 0.75)
pair(['todo', 'clan'], 'ba-contrast-todo-clan.jpg', 0.75)
pair(['bag-chips'], 'ba-contrast-chips-dark.jpg', 1.0, 'd-dark')
