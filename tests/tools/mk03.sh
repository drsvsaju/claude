#!/bin/sh
# Phase 3 screenshots: before / after pairs (v1.20 baseline against the build after the visual pass) and the pictures
# of things that did not exist before, written to screenshots/v2.0/03-visual/.
# usage: sh mk03.sh <dir with the new shots>      (made by shots.mjs: every screen, d-dark / d-light / phone)
D=${1:?the folder with the new shots}
cd "$(dirname "$0")/../.." || exit 1
O=screenshots/v2.0/03-visual; rm -rf $O; mkdir -p $O
python3 tests/tools/pair.py screenshots/v2.0/00-baseline "$D" $O \
  timer--d-dark timer--d-light timer--phone timer-running--phone timer-overtime--phone \
  reminders--d-dark reminders--phone todo--phone flashcard-review--phone \
  quests-boss--phone quests-pass--d-dark stats-week--d-light stats-year--phone \
  garden-harvests--phone bag--d-dark friends--d-dark friends-challenges--phone sessions--phone \
  profile--d-dark about--d-dark \
  squad--phone rank-ladder--phone preset-manager--d-dark templates--d-dark login-reward--phone collection--d-dark nav-more--phone --maxh 1300
ls $O | wc -l; du -sh $O | cut -f1
