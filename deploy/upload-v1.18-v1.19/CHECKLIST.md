# Deploy v1.18 + v1.19 together (GitHub website upload)

The live site is on v1.17. These steps take it straight to v1.19, which includes everything from v1.18.
Firebase project: **pomodorolist-bbaa6**.

**Upload only `index.html`, `firestore.rules` and `firestore.indexes.json`.** Don't upload this checklist.

## 1. Rules: publish once
`firestore.rules` in this folder covers both releases.
- Every line v1.18 added to the rules is in it word for word (checked line by line against the v1.18 build).
- What v1.19 changed:
  - adds the `rankStats` collection;
  - makes the `publicStats` rule cheaper, with the same meaning (it now checks only the changed fields on update);
  - fixes the day-key date check on the last day of a month.
- The full v1.18 and older test suites pass against this file.

Steps:
1. Firebase console → Firestore Database → **Rules**.
2. Select all, paste the whole `firestore.rules`, then **Publish**.

Between publishing and uploading the page, the live v1.17 page keeps working, with one exception: it can't join a
challenge, because it doesn't write the new weekly join counter. So upload the page soon after.

## 2. Indexes: four new ones
Firestore Database → **Indexes** → **Composite** → **Create index**. Use query scope **Collection** for all four.

| # | From | Collection ID | Field 1 | Field 2 | Field 3 |
|---|---|---|---|---|---|
| A | v1.18 | `studySessions` | `lobby` Ascending | `createdAt` Descending | — |
| B | v1.19 | `rankStats` | `global` Ascending | `seasonKey` Ascending | `seasonMin` Descending |
| C | v1.19 | `rankStats` | `global` Ascending | `streakDay` Ascending | `streak` Descending |
| D | v1.19 | `rankStats` | `global` Ascending | `bestStreak` Descending | — |

Wait until all four say **Enabled**, not *Building…*. That takes a few minutes; refresh the page to check.

These 11 older indexes should already be in the list. Create any that are missing the same way:

| Collection ID | Fields |
|---|---|
| `publicStats` | `global` Asc · `dayKey` Asc · `dayMin` Desc |
| `publicStats` | `global` Asc · `weekKey` Asc · `weekMin` Desc |
| `publicStats` | `global` Asc · `weekKeySun` Asc · `weekMinSun` Desc |
| `publicStats` | `global` Asc · `monthKey` Asc · `monthMin` Desc |
| `publicStats` | `global` Asc · `lifeMin` Desc |
| `publicStats` | `global` Asc · `produce` Desc |
| `publicStats` | `global` Asc · `harvests` Desc |
| `challenges` | `members` Arrays · `weekKey` Asc |
| `challenges` | `invited` Arrays · `weekKey` Asc |
| `clans` | `weekKey` Asc · `weekMin` Desc |
| `clans` | `weekKey` Asc · `weekMin` Asc |

## 3. Upload the three files
1. Open `https://github.com/siverieg/Pomodorolist-V1.0`.
2. **Add file → Upload files**.
3. Drag in `index.html`, `firestore.rules` and `firestore.indexes.json`. GitHub replaces `index.html`; the other two
   are new there.
4. Commit message `v1.18 + v1.19`, choose **Commit directly to the main branch**, then **Commit changes**.
5. GitHub Pages republishes in 1–2 minutes. Under **Actions**, "pages build and deployment" turns green.

The Firebase config block in `index.html` (search `EDIT HERE`) is byte-for-byte the live one, with authDomain
`pomodorolist-bbaa6.firebaseapp.com`.

## 4. Smoke test (about 3 minutes)
Open https://siverieg.github.io/Pomodorolist-V1.0/ and hard refresh (Ctrl/Cmd + Shift + R).
- **Window A:** your account.
- **Window B:** a private (incognito) window with a second account that is A's friend.

1. **Version (A).** What's new shows **1.19** and **1.18**. Your coins, streak and history are as before.
2. **Streak milestones (A, Timer).** "Next milestone: N days" is under the streak.
3. **Ranks (A).**
   - Timer: a rank line such as "Bronze III · … this season", with a bar.
   - Profile: the **Rank** card.
4. **Presets (A, Timer → Recently used).**
   - Tap a chip's star (Favourite). It moves to the front.
   - Reload: it is still first.
   - **Clear** asks before clearing. Cancel it.
5. **Study session and join request.**
   - **A:** Friends → **Study sessions** → **Host a study session** → Who can join **Friends only** → **Start the
     session**.
   - **B:** Friends → Study sessions (or A's "Studying now" row) → **Ask to join**.
   - **A:** a toast "… wants to join your session", and B under **Asking to join** → **Allow**.
   - B is in. A's panel shows "2 of N seats".
   - **A:** **End for everyone**.
6. **Invite link.**
   - **A:** host again with Who can join **Invite link** → **Start the session**. "Invite link: …" shows → **Copy**.
   - **B:** paste the link into the address bar. B joins straight in, with no asking.
   - **A:** **End for everyone**.
7. **Challenge cap.** A is allowed their own challenge plus one joined challenge a week. Doing this check uses A's
   join for this week.
   - **A:** Friends → **Challenges** shows "Joined this week: 0/1 — your own challenge plus one joined challenge a
     week".
   - **B:** start two different challenges.
   - **A:** join one. The other one's button turns grey: "You're already in a challenge this week".
8. **Leaderboards (A).** Leaderboard → **Ranks** → Friends, then Global. **Streaks** → Current, then Best → Global.
   They load, with no "needs a Firestore index" message.
9. **Console checks.**
   - Browser console (F12): no red errors.
   - Firebase console → Firestore → Data: `rankStats/<A's uid>` exists, and a `studySessions` document exists from
     steps 5–6.

**If something fails:** re-upload the v1.17 `index.html`, from commit `75dd671` of `siverieg/Pomodorolist-V1.0`.
The new rules work with v1.17 apart from challenge joins. Then tell me the step and what you saw.
