#!/bin/sh
# Make an instrumented copy of a built page: <src> -> <dst> (counts Firestore reads/writes in window.__fs)
S=/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/fb
python3 - "$1" "$2" <<'PY'
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read(); h = open('/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/fb/harness.js').read()
anchor = "  Object.assign(FB, appM, authM, fsM);\n"
assert s.count(anchor) == 1, s.count(anchor)
open(dst, 'w').write(s.replace(anchor, anchor + h))
print('instrumented', dst)
PY
