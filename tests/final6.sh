#!/bin/sh
# Final-build measurements and the full run: wait for the related-suite chain, measure performance on an idle machine
# (both builds, desktop and a ×4 slower phone), then run every suite on a cleared emulator.
cd /tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/fb
until grep -q chain-done chain6.txt; do sleep 15; done
echo "perf start $(date +%T)" > final6.log
(node perf115.mjs before.html "1.14.3 desktop" 1; node perf115.mjs index.html "1.15 desktop" 1; W=390 node perf115.mjs before.html "1.14.3 phone ×4" 4; W=390 node perf115.mjs index.html "1.15 phone ×4" 4) > perf115-final.txt 2>&1
echo "perf done $(date +%T)" >> final6.log
sh runall.sh > runall-final.txt 2>&1
echo "runall done $(date +%T)" >> final6.log
