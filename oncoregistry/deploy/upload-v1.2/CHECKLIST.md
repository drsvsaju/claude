# Deploy OncoRegistry 1.2

Firebase project: **oncoregistry-mmhrc**. The Firebase config in `index.html` (search for `FIREBASE CONFIG`) holds the live values, unchanged.

**What changed for Firebase: nothing.** `firestore.rules` is the same file as in 1.0/1.1, and there are still no composite indexes. You don't need to re-publish anything in the console. Apps 1.0 and 1.1 keep working, and existing data carries over as it is.

## 1. Upload
1. Open the repository and folder that serve OncoRegistry, then **Add file → Upload files**.
2. Drag in `index.html` from this folder. Optionally also add `firestore.rules`, so the repository matches the console.
3. Use commit message `OncoRegistry 1.2`, choose **Commit directly to the main branch**, then **Commit changes**.
4. GitHub Pages republishes in 1–2 minutes.

If the address changes, for example a new repository or domain, add the new domain in Firebase → **Authentication → Settings → Authorized domains**, or log-in will be refused.

## 2. Smoke test (about 3 minutes)
Open the app and hard-refresh (Ctrl/Cmd + Shift + R).

1. **Version.** Go to Settings → About. It should say **Version 1.2**, and **What's new** should list 1.2.
2. **Navigation.** On a computer, a sidebar shows Study · Analysis · Team and Settings; **Collapse** at the bottom shrinks it to icons. On a phone, a bottom bar shows Today · Patients · Dashboard · Team · More.
3. **Command palette.** Press `Ctrl K` and type a patient's number (e.g. `1`). The top row reads **Open MBC-0001** (your study's prefix); press Enter and the record opens.
4. **Inbox.** Tap the bell. It lists any invitations, and in a study, the patients due for follow-up. Tapping that row opens the filtered patient list.
5. **Undo.** In a record, press **Remove** on a follow-up visit. A toast says it was removed. Tap **Undo** and the visit is back. Nothing is saved until you press Save.
6. **Settings.** Type "follow" in the settings search: only the matching row shows. Set Glossed Interface to Off, then back to Lite.
7. **Console.** The browser console (F12) shows no red errors.

**If something fails:** re-upload the previous `index.html`; no Firebase settings need undoing. Then tell me the step and what you saw.
