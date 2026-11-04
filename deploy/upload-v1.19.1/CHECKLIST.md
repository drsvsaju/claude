# Deploy v1.19.1, second round (GitHub website upload)

The live site has the first v1.19.1 `index.html` but still the **old v1.19 rules**. This upload replaces `index.html`
and finally publishes the rules. Firebase project: **pomodorolist-bbaa6**.

**What changed for Firebase:**
- `firestore.rules` is **the same file I sent last time** (only `validPattern` differs from v1.19). Nothing new this
  round, but it still has to be published. Until it is, hosting a session with a preset longer than 120-minute focus
  blocks (Brutal locked 240/5 × 4) shows "Couldn't start a session with this preset — try one with focus blocks of
  5–120 min…".
- `firestore.indexes.json`: unchanged. No new indexes.

## 1. Publish the rules (if you haven't yet)
1. Firebase console → Firestore Database → **Rules**.
2. Select all, paste the whole `firestore.rules` from this folder, then **Publish**. Check that no warnings show.
   - It only widens what a study session may use.
   - Older app versions (1.17–1.19) keep working.

## 2. Upload
1. Open `https://github.com/siverieg/Pomodorolist-V1.0` → **Add file → Upload files**.
2. Drag in `index.html` (and `firestore.rules`, so the repo matches the console).
3. Commit message `v1.19.1 (second round)`, choose **Commit directly to the main branch**, then **Commit changes**.
4. GitHub Pages republishes in 1–2 minutes. Under **Actions**, "pages build and deployment" turns green.

The Firebase config block in `index.html` (search `EDIT HERE`) is unchanged: the live values, with authDomain
`pomodorolist-bbaa6.firebaseapp.com`.

## 3. Smoke test (about 3 minutes)
Open https://siverieg.github.io/Pomodorolist-V1.0/ on a computer, with the window at least 1280 px wide, and hard
refresh (Ctrl/Cmd + Shift + R).

1. **Gap fix**
   - Quests → Weekly boss: the top of the right column ("Battle log" or "Rewards for …") lines up with the top of the
     boss card. There is no empty space above it.
   - Profile: the top card of the right column lines up with the Level card.
2. **Clan page**
   - Clan shows the familiar two columns.
   - **Activity** shows 5 entries and "Show all (n)". Tap the header: ▴ and every entry, opening smoothly. Tap again to
     fold it.
   - **Clan session milestones** shows the progress line, the next reward and "Show all milestones".
   - Reload: each card stays the way you left it.
   - There is no new "@siverieg joined the clan — just now" (old duplicates are hidden too).
3. **Study sessions with a 240-minute preset**
   - The sidebar under SOCIAL reads Friends · **Study sessions** · Clan · Leaderboard. Press **J**: it opens.
   - Friends now shows only Friends · Challenges.
   - **Host a session** → name it → Focus together → Friends only → 6 seats → Start now. On the last step, pick
     **Brutal locked** (240/5 × 4) under Rhythm.
   - Expected: **Start the session** → "Session started", and your table opens in Study sessions.
   - On a phone or second account that is your friend: Study sessions has a dot, and your table shows under **Live now**
     with "1/6" and **Ask to join**. Ask, then **Allow** on your side.
   - **End for everyone**.
4. **Console**: the browser console (F12) shows no red errors.

**If something fails:** re-upload the previous `index.html` from the last commit on `siverieg/Pomodorolist-V1.0`. The
rules don't need to change back. Then tell me the step and what you saw.
