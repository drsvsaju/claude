# Deploy v1.19.1 (GitHub website upload)

The live site is on v1.19. This takes it to v1.19.1.
Firebase project: **pomodorolist-bbaa6**.

**What changed for Firebase:**
- `firestore.rules`: one function changed, `validPattern`, the study-session rhythm check.
  - Old limits: focus 5–120 min, break ≤ 30 min, ≤ 8 rounds.
  - New limits: focus 1–240 min, break 1–120 min, 1–12 rounds.
  - It only widens what is allowed. Every session an older app (1.17–1.19) writes still passes, and those versions display a longer session correctly.
- `firestore.indexes.json`: unchanged. No new indexes.

## 1. Publish the rules first
1. Firebase console → Firestore Database → **Rules**.
2. Select all, paste the whole `firestore.rules` from this folder, then **Publish**.
3. Check the editor shows no warnings. Line 114 already has the `d.keys().toSet()` fix you made.

If `index.html` goes live before the rules, a session with a preset longer than 120-minute focus blocks shows a clear message ("try one with focus blocks of 5–120 min …"). Nothing breaks, but publish the rules first anyway.

## 2. Upload
1. Open `https://github.com/siverieg/Pomodorolist-V1.0`.
2. **Add file → Upload files**.
3. Drag in `index.html` and `firestore.rules`. `firestore.indexes.json` is the same as the copy already there, so uploading it is optional.
4. Commit message `v1.19.1`, choose **Commit directly to the main branch**, then **Commit changes**.
5. GitHub Pages republishes in 1–2 minutes. Under **Actions**, "pages build and deployment" turns green.

The Firebase config block in `index.html` (search `EDIT HERE`) is unchanged: the live values, with authDomain `pomodorolist-bbaa6.firebaseapp.com`.

## 3. Smoke test (about 3 minutes)
Open https://siverieg.github.io/Pomodorolist-V1.0/ and hard refresh (Ctrl/Cmd + Shift + R).

1. **Version.** What's new shows **1.19.1** at the top.
2. **Leaderboard.**
   - Open **Ranks**, then **Streaks**, then **Focus time**. Focus time shows Daily · Weekly · Lifetime, with no Monthly.
   - Reload. Focus time still opens the focus board.
3. **Rank badge.**
   - Your rank shows next to your name in the header. On a phone it's the small gem on the level chip.
   - Tap it: the Ranks board opens.
   - Profile: the badge is on your player card. Tap it to see your progress.
4. **Switchers.**
   - Profile → Achievements: the category bar is on one line.
   - Narrow the window or use a phone: the bar scrolls sideways, and the highlight fits the selected button.
5. **Wide screen (≥ 1280 px).** Profile, Clan and Timer show two balanced columns, with no big empty area beside one column.
6. **The bug you reported.**
   - Friends → Study sessions → Host.
   - Preset **Brutal locked** (240/5 × 4), Focus together, Friends only, 6 seats, **Start now**.
   - The session starts. **End for everyone**.
7. **Console.** Browser console (F12): no red errors.

**If something fails:** re-upload the v1.19 `index.html` from the previous commit on `siverieg/Pomodorolist-V1.0`. The new rules work with v1.19 unchanged. Then tell me the step and what you saw.
