#!/bin/sh
# Rebuild the working copy of the test harness after the scratch folder was lost (a container restart):
#   sh tests/restore.sh [scratch folder]
# It copies this folder to <scratch>/fb, installs its packages, links the pre-installed Playwright, puts the Firebase
# SDK next to the test page (with its files importing each other locally: from the CDN address the page and the SDK
# would get two separate copies of firebase-app and sign-up never finishes), builds the page and starts the test site
# (:8000) and the Auth + Firestore emulators. Then: cd <scratch>/fb && sh rerun118.sh <suite> …
R=$(cd "$(dirname "$0")/.." && pwd)
S=${1:-/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad}
mkdir -p "$S/fb" "$S/v1143" || exit 1
cp -r "$R/tests/." "$S/fb/" && cp "$R/tests/tools/site.sh" "$S/v1143/site.sh"
cp "$R"/tests/tools/*.mjs "$R"/tests/tools/*.py "$R"/tests/tools/*.js "$S/fb/" 2>/dev/null   # the tools run from the harness root (they find node_modules beside them)
cd "$S/fb" || exit 1
[ -d node_modules/firebase ] || npm ci > npm-ci.log 2>&1 || { tail -5 npm-ci.log; exit 1; }
P=$(node -e "console.log(require('path').dirname(require.resolve('playwright/package.json')))") && ln -sfn "$P" node_modules/playwright
V=$(grep -o "FIREBASE_VERSION = '[0-9.]*'" "$R/index.html" | grep -o "[0-9.]*" | head -1)
mkdir -p "site/firebasejs/$V" && cp node_modules/firebase/firebase-app.js node_modules/firebase/firebase-auth.js node_modules/firebase/firebase-firestore.js "site/firebasejs/$V/"
sed -i "s#https://www.gstatic.com/firebasejs/$V/#/firebasejs/$V/#g" site/firebasejs/"$V"/*.js
cp "$R/firestore.rules" firestore.rules
if [ "$S" != /tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad ]; then sed -i "s#/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad#$S#g" ../v1143/site.sh; fi
# Fixtures some suites need, rebuilt from the repository's history (they are old versions of its own files):
#   the rules as they were before v1.12, at v1.14.2, before the v1.14.3 audit and as published for v1.19;
#   the app as it was at v1.11 (base111.html) and just before v1.15 (before.html), built like the test page.
(cd "$R" && git show 09fcc10:firestore.rules) > rules-old.rules
mkdir -p ../v1142 && (cd "$R" && git show adcb18f:firestore.rules) > ../v1142/firestore.rules
(cd "$R" && git show f0c9552:firestore.rules) > ../v1143/firestore.rules.pre-audit
(cd "$R" && git show 102b46b:firestore.rules) > rules-v119.rules
for pair in 18448bc:base111.html 0d7ce7d:before.html; do
  c=${pair%%:*}; f=${pair##*:}
  (cd "$R" && git show "$c:index.html") | sed -E -e 's/apiKey: "[^"]*"/apiKey: "fake-api-key"/' -e 's/authDomain: "[^"]*"/authDomain: "demo-pomo.firebaseapp.com"/' -e 's/projectId: "[^"]*"/projectId: "demo-pomo"/' -e 's/storageBucket: "[^"]*"/storageBucket: "demo-pomo.appspot.com"/' -e 's/messagingSenderId: "[^"]*"/messagingSenderId: "0"/' -e 's/appId: "[^"]*"/appId: "1:0:web:0"/' -e 's#https://www.gstatic.com/firebasejs/#/firebasejs/#g' > "site/$f"
  for ov in $(grep -oE "firebasejs/[0-9.]+/|FIREBASE_VERSION = '[0-9.]+'" "site/$f" | grep -oE "[0-9]+\.[0-9]+\.[0-9]+" | sort -u); do   # an older page may name another SDK version: its own copy, importing itself
    [ -d "site/firebasejs/$ov" ] || { mkdir -p "site/firebasejs/$ov"; cp node_modules/firebase/firebase-app.js node_modules/firebase/firebase-auth.js node_modules/firebase/firebase-firestore.js "site/firebasejs/$ov/"; sed -i "s#https://www.gstatic.com/firebasejs/[0-9.]*/#/firebasejs/$ov/#g" site/firebasejs/"$ov"/*.js; }
  done
done
sh ../v1143/site.sh && sh ensure.sh
