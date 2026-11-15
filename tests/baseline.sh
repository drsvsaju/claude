#!/bin/sh
# Run suites against an older commit's index.html (same emulator, same rules): sh baseline.sh <commit> <suites…>
cd "$(dirname "$0")"
S=/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad
C=$1; shift
(cd /home/user/claude && git show $C:index.html) > $S/old-index.html
sed -E -e 's/apiKey: "[^"]*"/apiKey: "fake-api-key"/' -e 's/authDomain: "[^"]*"/authDomain: "demo-pomo.firebaseapp.com"/' -e 's/projectId: "[^"]*"/projectId: "demo-pomo"/' -e 's/storageBucket: "[^"]*"/storageBucket: "demo-pomo.appspot.com"/' -e 's/messagingSenderId: "[^"]*"/messagingSenderId: "0"/' -e 's/appId: "[^"]*"/appId: "1:0:web:0"/' -e 's#https://www.gstatic.com/firebasejs/#/firebasejs/#' $S/old-index.html > site/index.html
curl -s -X DELETE localhost:9099/emulator/v1/projects/demo-pomo/accounts > /dev/null; curl -s -X DELETE "localhost:8080/emulator/v1/projects/demo-pomo/databases/(default)/documents" > /dev/null
for t in "$@"; do timeout 1500 node $t.mjs > base-$t.txt 2>&1; echo "base $t exit=$?"; done
