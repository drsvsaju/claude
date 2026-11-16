#!/bin/sh
# Rebuild the main test site from the repo, load the repo rules, clear the emulator, run the given suites one by one.
cd "$(dirname "$0")"
sh ../v1143/site.sh || exit 1
cp /home/user/claude/firestore.rules firestore.rules
sleep 3
curl -s -X DELETE localhost:9099/emulator/v1/projects/demo-pomo/accounts > /dev/null; curl -s -X DELETE "localhost:8080/emulator/v1/projects/demo-pomo/databases/(default)/documents" > /dev/null
# The app has achievements for focusing before 7 AM and after 10 PM; they change coins, celebrations and post counts.
# Each suite therefore runs in a timezone where it is around midday on the same calendar date (Node and the browser both
# follow TZ), so the result does not depend on the hour the tests happen to run.
daytz() { H=$(date -u +%H); H=${H#0}; if [ "$H" -lt 8 ]; then echo "Etc/GMT-$((12 - H))"; elif [ "$H" -gt 19 ]; then echo "Etc/GMT+$((H - 12))"; else echo UTC; fi; }
for t in "$@"; do
  case $t in v120*|v2*) TZ=$(daytz) timeout 1500 node $t.mjs > out-$t.txt 2>&1 ;; *) TZ=$(daytz) timeout 1500 node --import ./ot-classic.mjs $t.mjs > out-$t.txt 2>&1 ;; esac   # v1.20: classic suites keep Overtime off (ot-classic.mjs)
  echo "$t exit=$? $(grep -o "errors \[.*" out-$t.txt | tail -1 | cut -c1-120) $(grep -c '^✗' out-$t.txt) failed"
done
