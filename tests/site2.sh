#!/bin/sh
# Refresh the test server copy from the repo's index.html (emulator project + local Firebase SDK)
S=/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad
sed -E -e 's/apiKey: "[^"]*"/apiKey: "fake-api-key"/' -e 's/authDomain: "[^"]*"/authDomain: "demo-pomo.firebaseapp.com"/' -e 's/projectId: "[^"]*"/projectId: "demo-pomo"/' -e 's/storageBucket: "[^"]*"/storageBucket: "demo-pomo.appspot.com"/' -e 's/messagingSenderId: "[^"]*"/messagingSenderId: "0"/' -e 's/appId: "[^"]*"/appId: "1:0:web:0"/' -e 's#https://www.gstatic.com/firebasejs/#/firebasejs/#' /home/user/claude/index.html > $S/fb/site2/index.html
python3 - <<'PY'
import re
s=open('/home/user/claude/index.html').read()
big=max(re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', s, re.S),key=len)
open('/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/main.js','w').write(big)
PY
node --check $S/main.js && echo site-ok
