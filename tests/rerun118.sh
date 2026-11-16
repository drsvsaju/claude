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
# A suite fails when it exits non-zero, prints a ✗ line, or reports "failures N" / "problems N" / "N FAILED" with N > 0.
# (Until v2.0 several suites printed "failures N" and still exited 0, so a failing check could pass unnoticed.)
verdict() {
  x=$(grep -c '^✗' "$2"); n=$(grep -oE '(failures|problems):? [0-9]+|[0-9]+ FAILED' "$2" | grep -oE '[0-9]+' | awk '{s+=$1} END {print s+0}')
  if [ "$1" != 0 ] || [ "$x" -gt 0 ] || [ "$n" -gt 0 ]; then echo FAIL; else echo pass; fi
}
FAILED=''
daytz() { H=$(date -u +%H); H=${H#0}; if [ "$H" -lt 8 ]; then echo "Etc/GMT-$((12 - H))"; elif [ "$H" -gt 19 ]; then echo "Etc/GMT+$((H - 12))"; else echo UTC; fi; }
for t in "$@"; do
  case $t in v120*|v2*) PRE='--import ./ui-compat.mjs' ;; *) PRE='--import ./ui-compat.mjs --import ./ot-classic.mjs' ;; esac   # ui-compat: selectOption / fill / dialog handlers also drive the app's own controls (v2.0)
  TZ=$(daytz) timeout 1500 node $PRE $t.mjs > out-$t.txt 2>&1   # v1.20: classic suites keep Overtime off (ot-classic.mjs)
  e=$?; v=$(verdict $e out-$t.txt); [ $v = FAIL ] && FAILED="$FAILED $t"
  echo "$t $v exit=$e $(grep -c '^✗' out-$t.txt)✗ $(grep -o "errors \[.*" out-$t.txt | tail -1 | cut -c1-120)"
done
echo "SUMMARY: $# suites, failed:${FAILED:- none}"
