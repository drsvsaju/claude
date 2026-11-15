#!/bin/sh
# (Re)start the test site (:8000) and the Firebase emulators when a container restart killed them.
cd "$(dirname "$0")"
if [ "$(curl -s -o /dev/null -w '%{http_code}' localhost:8000/index.html)" != 200 ]; then (cd site && setsid nohup python3 -m http.server 8000 > /dev/null 2>&1 &); sleep 1; fi
if ! curl -s localhost:8080 > /dev/null; then
  pkill -f "[c]loud-firestore-emulator"; pkill -f "[f]irebase emulators"
  (setsid nohup npx firebase emulators:start --only auth,firestore --project demo-pomo > emu.log 2>&1 &)
  for i in $(seq 1 60); do grep -q "All emulators ready" emu.log 2>/dev/null && break; sleep 2; done
fi
echo "site $(curl -s -o /dev/null -w '%{http_code}' localhost:8000/index.html) emu $(grep -c 'All emulators ready' emu.log)"
