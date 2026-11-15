#!/bin/sh
# Rerun the suites adjusted after the full run against the final build and splice their lines into runall116.txt.
cd "$(dirname "$0")"
sh ../v1143/site.sh || exit 1
cmp -s /home/user/claude/firestore.rules firestore.rules || cp /home/user/claude/firestore.rules firestore.rules
curl -s -X DELETE localhost:9099/emulator/v1/projects/demo-pomo/accounts > /dev/null; curl -s -X DELETE "localhost:8080/emulator/v1/projects/demo-pomo/databases/(default)/documents" > /dev/null
for t in "$@"; do
  timeout 1500 node $t.mjs > out-$t.txt 2>&1
  line="$t exit=$? $(grep -o "errors \[.*" out-$t.txt | tail -1 | cut -c1-120)"
  echo "$line"
  python3 - "$t" "$line" <<'PY'
import sys,re
t,line=sys.argv[1],sys.argv[2]
p='runall116.txt'; s=open(p).read().split('\n')
if any(re.match(r'^%s exit='%re.escape(t), l) for l in s): s=[line if re.match(r'^%s exit='%re.escape(t), l) else l for l in s]
else:
    i=next((k for k,l in enumerate(s) if l.startswith('sec116 exit=')), len(s)); s.insert(i, line)   # a new suite goes before sec116, like runall.sh
open(p,'w').write('\n'.join(s))
PY
done
echo "RERUN DONE"
