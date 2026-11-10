# Deploy v1.20 (GitHub website upload)

Firebase project: **pomodorolist-bbaa6**. Do the steps **in this order: rules → indexes → upload**. The new app
writes to a new `posts` collection, so the rules and indexes must be live before people get the new `index.html`.

**What changed for Firebase:**
- `firestore.rules`: one new block, `match /posts/{pid}`, plus its three helper functions. Nothing existing changed,
  so apps 1.17–1.19.1 keep working with these rules.
- `firestore.indexes.json`: three new composite indexes, all on `posts`. Nothing existing changed.

## 1. Publish the rules
1. Firebase console → Firestore Database → **Rules**.
2. Select all, paste the whole `firestore.rules` from this folder, then **Publish**. Check that no warnings or errors
   show.

## 2. Create the three indexes
Firebase console → Firestore Database → **Indexes** → Composite → **Create index**. Create each one with
Collection ID `posts` and Query scope **Collection**:

| # | field 1 | field 2 | field 3 |
|---|---|---|---|
| 1 | `aud` — **Arrays** | `at` — Descending | — |
| 2 | `aud` — **Arrays** | `author` — Ascending | `at` — Ascending |
| 3 | `aud` — **Arrays** | `author` — Ascending | `at` — Descending |

- Wait until all three show **Enabled** (usually a few minutes; the collection is empty).
- Until #1 is enabled, the Posts section shows "Posts are getting ready — try again in a few minutes". Nothing breaks.
- *(Or, with the Firebase CLI: `firebase deploy --only firestore:rules,firestore:indexes` from a folder with these two
  files.)*

## 3. Upload
1. Open `https://github.com/siverieg/Pomodorolist-V1.0` → **Add file → Upload files**.
2. Drag in `index.html`, plus `firestore.rules` and `firestore.indexes.json` so the repo matches the console.
3. Commit message `v1.20`, choose **Commit directly to the main branch**, then **Commit changes**.
4. GitHub Pages republishes in 1–2 minutes. Under **Actions**, "pages build and deployment" turns green.

The Firebase config block in `index.html` (search `EDIT HERE`) has the live values, unchanged, with authDomain
`pomodorolist-bbaa6.firebaseapp.com`.

## 4. Smoke test (about 3 minutes)
Open https://siverieg.github.io/Pomodorolist-V1.0/ and hard refresh (Ctrl/Cmd + Shift + R). Settings › About should
say **1.20**, and What's new has the 1.20 entry.

1. **Rank ladder**
   - Profile → the Rank card shows e.g. `Bronze III → II → I → Silver III` with your step marked.
   - Tap **All ranks ›**: the ladder lists every rank with its hours, with "You" marked.
   - Close it, then tap any rank badge on the Leaderboard: the same ladder opens.
2. **Overtime**
   - Timer → choose a custom preset with a **1-minute** focus block → Start.
   - At 0 the end sound plays once, then the ring turns amber and counts `+00:01, +00:02…`. The buttons read Pause ·
     Stop · Break, and **Turn off overtime** shows under the ring.
   - When it shows about `+01:05`, tap **Stop**: the break starts. In Stats, today’s list shows the block as 2 min with
     "+1m".
3. **Study Pass**
   - Quests → **Study Pass**: "Monsoon Study Pass", the days left, Pass tier and Focus pills, the two rows.
   - Your hours from 1.20's first day count; the line says the pass is sized for the days left.
   - If a tier is ready, tap **Claim** → the reward shows. Tap it again: it's marked claimed, with nothing twice.
4. **Posts (needs a second account that is your friend, e.g. on your phone)**
   - A and B must already be friends (a post goes to the friends the author has when it's posted).
   - On account A, finish a block that reaches something new. A brand-new account's very first block unlocks
     "First focus"; on an older account, any new achievement, streak milestone or rank-up works.
   - On account B, reload the page (the dot is checked when the app opens, then every 15 minutes). The sidebar (or More
     on a phone) reads Friends · **Posts** · Study sessions…, and Posts has a red dot. Open it (or press **O**): A's post shows **once** under Today, with A's picture, and the dot clears.
     Friends itself is just Friends · Challenges.
   - Tap 🔥: the count shows 1; tap 🔥 again: it's gone.
   - On A → Posts: the same post shows B's reaction count.
5. **Console**: the browser console (F12) shows no red errors.

**If something fails:** re-upload the previous `index.html` from the last commit on `siverieg/Pomodorolist-V1.0`. The
new rules and indexes can stay (older apps ignore `posts`). Then tell me the step and what you saw.
