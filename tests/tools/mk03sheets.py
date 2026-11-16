# Contact sheets per Phase 3 screen group from a shots folder: python3 mk03sheets.py <shotdir> <outdir>
import sys, os
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1].rstrip('/') + '/', sys.argv[2].rstrip('/') + '/'
os.makedirs(out, exist_ok=True)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
GROUPS = {
  '1-timer': ['timer', 'timer-running', 'timer-overtime', 'timer-break', 'preset-manager', 'rank-ladder'],
  '2-welcome': ['welcome', 'welcome-signup', 'welcome-login', 'tutorial'],
  '3-shell': ['nav-more', 'command-palette', 'inbox', 'shortcuts', 'login-reward', 'level-up', 'reward-reveal'],
  '4a-focus-tools': ['reminders', 'reminder-form', 'todo', 'todo-form', 'flashcards', 'flashcard-review', 'exams', 'templates', 'plan'],
  '4b-stats-quests': ['stats-day', 'stats-week', 'stats-month', 'stats-year', 'wrapped', 'quests-boss', 'quests-questline', 'quests-pass', 'quests-board', 'squad'],
  '4c-garden-shop': ['garden', 'garden-harvests', 'garden-seeds', 'garden-decor', 'garden-plant', 'garden-pets', 'room', 'shop', 'bag'],
  '5-social': ['friends', 'friends-challenges', 'friend-profile', 'posts', 'sessions', 'session-host', 'clan', 'clan-schedule', 'clan-shop', 'clan-settings', 'leaderboard', 'profile', 'profile-card', 'collection'],
  '6-settings': ['settings', 'about'],
}
MAXH = 2600   # a long page is cut here (the top is what a person sees first)
def tile(names, fname, cols, cellw):
    ims = []
    for n in names:
        p = src + n + '.jpg'
        if not os.path.exists(p): continue
        im = Image.open(p).convert('RGB')
        r = cellw / im.width; im = im.resize((cellw, int(im.height * r)))
        if im.height > MAXH * cellw / 1440: im = im.crop((0, 0, cellw, int(MAXH * cellw / 1440)))
        ims.append((n, im))
    if not ims: return 0
    rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
    H = sum(max(im.height for _, im in r) + 44 for r in rows)
    sheet = Image.new('RGB', (cols * (cellw + 12) + 12, H + 12), (18, 19, 22)); d = ImageDraw.Draw(sheet); y = 8
    for r in rows:
        for i, (n, im) in enumerate(r):
            x = 12 + i * (cellw + 12); d.text((x, y + 6), n, fill=(235, 236, 238), font=font); sheet.paste(im, (x, y + 40))
        y += max(im.height for _, im in r) + 44
    sheet.save(out + fname, quality=82); return len(ims)
for g, ids in GROUPS.items():
    a = tile([i + '--d-dark' for i in ids], g + '--desktop-dark.jpg', 3, 1000)
    b = tile([i + '--d-light' for i in ids], g + '--desktop-light.jpg', 3, 1000)
    c = tile([i + '--phone' for i in ids], g + '--phone.jpg', 5, 520)
    print(g, a, b, c)
