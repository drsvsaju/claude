#!/bin/sh
# Run every browser test suite in order and print one status line each.
cd "$(dirname "$0")"
# start from an empty emulator (e2e signs up fixed usernames)
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
N=0
for t in e2e prog social off motion nav v6 v6c v7 v7c v8 v9 v10 v11 v11old v12 v12b v13 v19 v110 v111a v111b v111c v112a v112b v112c v112d v112e v112f v113a v113b v113c v1131a v1131b v1131c v114a v114b v114c v114d v114e v1141a v1141b v1142a v1143a v1143b v1143c v1143d v1143e sec143 v115a v115b v115c v115d v115e v115f v115g v115h v115i v116a v116b v116c v116d v116e v116f v116g v116h v117a v117b anim117 v117d v117e v117f v117g v117h v117i v117j v118a v118b v118c v118d v118e v118f v118g v118h v118i v119a v119b v119c v1191a v1191b v1191c v1191d v1191e v120a v120b v120c v120d v120e v120f v200a v200b v200c v300a v400a v500a v500b v500c v600a v600b sec116; do
  N=$((N + 1))
  case $t in v120*|v[2-9][0-9][0-9]*) PRE='--import ./ui-compat.mjs' ;; *) PRE='--import ./ui-compat.mjs --import ./ot-classic.mjs' ;; esac   # (v200a and later: three digits. v6, v6c, v7c … are old suites) ui-compat: selectOption / fill / dialog handlers also drive the app's own controls (v2.0)
  TZ=$(daytz) timeout 1500 node $PRE $t.mjs > out-$t.txt 2>&1   # v1.20: classic suites keep Overtime off (ot-classic.mjs)
  e=$?; v=$(verdict $e out-$t.txt); [ $v = FAIL ] && FAILED="$FAILED $t"
  echo "$t $v exit=$e $(grep -c '^✗' out-$t.txt)✗ $(grep -o "errors \[.*" out-$t.txt | tail -1 | cut -c1-120)"
done
echo "SUMMARY: $N suites, failed:${FAILED:- none}"
