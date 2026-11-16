# Deploy OncoRegistry 1.3

Firebase project: **oncoregistry-mmhrc**. The Firebase config in `index.html` (search for `FIREBASE CONFIG`) holds the live values, unchanged.

**What changed for Firebase: nothing.** `firestore.rules` is the same file as in 1.0–1.2, and there are still no composite indexes. You don't need to re-publish anything in the console. Older versions keep working, and existing data carries over as it is.

## 1. Upload
1. Open the repository and folder that serve OncoRegistry, then **Add file → Upload files**.
2. Drag in `index.html` from this folder. Optionally also add `firestore.rules`, so the repository matches the console.
3. Use commit message `OncoRegistry 1.3`, choose **Commit directly to the main branch**, then **Commit changes**.
4. GitHub Pages republishes in 1–2 minutes.

If the address changes, for example a new repository or domain, add the new domain in Firebase → **Authentication → Settings → Authorized domains**, or log-in will be refused.

## 2. Smoke test (about 3 minutes)
Open the app and hard-refresh (Ctrl/Cmd + Shift + R).

1. **Version.** Go to Settings → About. It should say **Version 1.3**, and **What's new** should list 1.3.
2. **Look.** On a computer the header and sidebar are a shade darker than the page, and the page has a rounded top-left corner. Cards have no outlines. The header has a search pill with `Ctrl K`.
3. **Today.** A large card shows the goal ring with **Register patient**. On the right: your streak, a goal bar and rows for due, drafts, registered, complete and verified. Tap **Due for follow-up**: the patient list opens filtered.
4. **Form.** Open a record. A chosen answer shows a check mark; switches in Settings show I when on.
5. **Toast.** Save a record. A card appears bottom right with a check, a ✕ and a thin line that runs out. Hovering pauses it.
6. **Phone.** The bottom bar shows the active tab's icon in a soft pill. There's no sideways scrolling on any page.
7. **Dark mode.** Settings → Theme → Dark. Everything stays readable; then set it back.
8. **Console.** The browser console (F12) shows no red errors.

**If something fails:** re-upload the previous `index.html`; no Firebase settings need undoing. Then tell me the step and what you saw.
