# Deploy v2.0 (GitHub website upload)

Firebase project: **pomodorolist-bbaa6**. Do the steps **in this order: rules → (indexes: nothing) → upload**. The new
app writes to two new collections (`referrals`, `inviteStats`), so the rules must be live before people get the new
`index.html`.

**What changed for Firebase:**
- `firestore.rules`: one new block at the end, "v2.0: invites" (`referrals/{uid}`, `inviteStats/{inviter}` and three
  helper functions). Nothing existing changed (57 lines added, none removed), so apps 1.18–1.20 keep working with
  these rules.
- `firestore.indexes.json`: **unchanged** since 1.20. No new index is needed (the one new query, "who joined through
  my link", is a single equality filter).
- Everything else new in 2.0 is stored in each user's own private document (`users/{uid}`), which the rules already
  allow; old versions ignore the new fields and keep them.

## 1. Publish the rules
1. Firebase console → Firestore Database → **Rules**.
2. Select all, paste the whole `firestore.rules` from this folder, then **Publish**. Check that no warnings or errors
   show.
   *(Or, with the Firebase CLI: `firebase deploy --only firestore:rules` from a folder with this file.)*

## 2. Indexes
Nothing to do. *(If you prefer to keep the console and the repository identical, the `firestore.indexes.json` here is
the same file as 1.20's.)*

## 3. Upload
This release adds a folder. In the repository it must look like this:

```
index.html
README.md                 (optional)
firestore.rules
firestore.indexes.json
assets/
  og-image.png            (1200×630, the picture a pasted link shows)
  apple-touch-icon.png    (180×180)
  favicon-48.png
  favicon-32.png
  favicon.svg
```

1. Open `https://github.com/siverieg/Pomodorolist-V1.0` → **Add file → Upload files**.
2. Drag in `index.html`, `firestore.rules`, `firestore.indexes.json` **and the whole `assets` folder** (drag the
   folder itself, so GitHub keeps the `assets/` path). `README.md` is optional: it is the repository's front page,
   updated for 2.0 from the current one.
3. Commit message `v2.0`, choose **Commit directly to the main branch**, then **Commit changes**.
4. Check that `https://github.com/siverieg/Pomodorolist-V1.0/tree/main/assets` lists the five files.
5. GitHub Pages republishes in 1–2 minutes. Under **Actions**, "pages build and deployment" turns green.

The Firebase config block in `index.html` (search `EDIT HERE`) has the live values, unchanged, with authDomain
`pomodorolist-bbaa6.firebaseapp.com`. There is **no** web app manifest and **no** service worker in this release
(that is planned for the next one); nothing caches `index.html`.

## 4. Smoke test (about 5 minutes)
Open https://siverieg.github.io/Pomodorolist-V1.0/ and hard refresh (Ctrl/Cmd + Shift + R).

1. **Version and What's new**
   - Signed in: a "What's new in v2.0" card on the Timer. **See what's new** opens six short cards, each with a
     button that goes to the feature. Settings › About says **2.0**.
2. **Calendar** (press **C**, or the sidebar)
   - Month shows your reminders and to-dos. Switch to **Week**, drag across an empty hour: a focus block form opens.
     Save it, then drag the block an hour later: it moves, with **Undo** at the bottom.
3. **A block with an intention**
   - Timer → **+ Add an intention**, type a line, start a 1-minute custom preset (or let any block finish).
   - During it, press **D** once: the "I got distracted" counter shows 1, with no pop-up.
   - At the end the card asks **How far did you get?** — answer **Part of it**; then the usual "How focused…?" follows.
4. **Streak care and a break**
   - Today card → **Streak care** → the dialog opens. Choose a rest day: it says it starts tomorrow. Close it.
   - On the break after a block, the timer shows **Ideas for your break**; open **Breathe**: the circle counts in 4,
     hold 4, out 6.
5. **Invite (needs a second, new account, e.g. a private window on your phone)**
   - Friends › **Invite** shows your link ending in `?ref=<your name>`. Copy it.
   - Open it in a private window: the sign-up form says "@you invited you to study together" with the switch
     **Add @you as a friend**. Create a throwaway account: you (the first account) get a friend request.
   - The gifts need three days of focus by the new account, so they cannot be checked in five minutes; the invite page
     of the first account should list the new account as **Joined**.
6. **Link preview**
   - Paste `https://siverieg.github.io/Pomodorolist-V1.0/` into a WhatsApp or Discord chat (to yourself): the preview
     shows the picture with "Focus that feels like progress." (Chat apps cache previews; a link pasted before the
     upload may keep its old preview for a while.)
7. **Console**: the browser console (F12) shows no red errors.

**If something fails:** re-upload the previous `index.html` from the last commit on `siverieg/Pomodorolist-V1.0`
(the 1.20 file). The new rules and the `assets` folder can stay: 1.20 ignores both. Then tell me the step and what
you saw.
