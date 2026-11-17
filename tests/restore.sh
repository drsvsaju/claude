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
sh ../v1143/site.sh && sh ensure.sh
