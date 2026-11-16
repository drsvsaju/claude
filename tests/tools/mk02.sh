#!/bin/sh
# Phase 2 screenshots: the app's screens with their own controls (open and closed) + before/after pairs.
# usage: sh mk02.sh <shotdir-name> <review-dir-name>
S=/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad
D=${1:-shots-p2a}; R=$S/${2:-review-p2}
IDS=timer,timer-preset-open,preset-manager,reminders,reminder-form,reminder-date-open,reminder-time-open,todo-form,exams,plan,plan-suggest,session-host,clan-schedule,clan-schedule-date-open,clan-settings,settings,profile
cd $S/fb && sh ../v1143/site.sh p1.html | tail -1 && rm -rf $D && timeout 900 node shots.mjs $D --page p1.html --only $IDS > $D.log 2>&1
echo "shots: $(grep -c '^ok' $D.log) ok"; grep -A3 "problems" $D.log | grep -v "^ok\|none\|^--" | head
cd /home/user/claude && O=screenshots/v2.0/02-native-controls; rm -rf $O; mkdir -p $O
for f in $S/fb/$D/*-open--*.jpg $S/fb/$D/plan-suggest--*.jpg; do [ -f "$f" ] && python3 -c "from PIL import Image; import sys; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2], quality=84)" "$f" "$O/$(basename $f)"; done
python3 tests/tools/pair.py screenshots/v2.0/00-baseline $S/fb/$D $O timer--d-dark timer--phone preset-manager--d-dark preset-manager--phone reminders--d-dark reminder-form--d-dark reminder-form--phone todo-form--d-dark todo-form--phone exams--d-dark plan--d-dark session-host--d-dark session-host--phone clan-schedule--d-dark clan-schedule--phone clan-settings--d-dark settings--d-dark settings--d-light settings--phone profile--d-dark --maxh 2400 | grep -c .
ls $O | wc -l; du -sh $O | cut -f1
rm -rf $R; mkdir -p $R; R=$R/ python3 - <<'EOF'
from PIL import Image, ImageDraw, ImageFont
import os, glob
O='/home/user/claude/screenshots/v2.0/02-native-controls/'; R=os.environ['R']
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
def tile(names, out, cols, cellw):
    ims=[]
    for n in names:
        im=Image.open(O+n).convert('RGB'); r=cellw/im.width; ims.append((n, im.resize((cellw, int(im.height*r)))))
    if not ims: return
    rows=[ims[i:i+cols] for i in range(0,len(ims),cols)]
    H=sum(max(im.height for _,im in r)+44 for r in rows)
    sheet=Image.new('RGB',(cols*(cellw+12)+12,H+12),(18,19,22)); d=ImageDraw.Draw(sheet); y=8
    for r in rows:
        for i,(n,im) in enumerate(r):
            x=12+i*(cellw+12); d.text((x,y+6),n.replace('.jpg',''),fill=(235,236,238),font=font); sheet.paste(im,(x,y+40))
        y+=max(im.height for _,im in r)+44
    sheet.save(R+out,quality=86); print(out, sheet.size)
names=sorted(os.path.basename(f) for f in glob.glob(O+'*.jpg'))
opens=[n for n in names if not n.startswith('ba-')]
tile([n for n in opens if 'phone' not in n], 'open-desktop.jpg', 3, 1100)
tile([n for n in opens if 'phone' in n], 'open-phone.jpg', 4, 780)
ba=[n for n in names if n.startswith('ba-')]
wide=[n for n in ba if 'phone' not in n]; ph=[n for n in ba if 'phone' in n]
for i in range(0,len(wide),4): tile(wide[i:i+4], f'before-after-{i//4+1}.jpg', 1, 2600)
tile(ph, 'before-after-phone.jpg', 3, 1100)
EOF
