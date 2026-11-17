# Deploy OncoRegistry 2.0

Firebase project: **oncoregistry-mmhrc**. The Firebase config in `index.html` (search for `FIREBASE CONFIG`) holds the live values, unchanged.

**What changed for Firebase: nothing.** `firestore.rules` is the same file as in 1.0–1.3, and there are still no composite indexes. You don't need to re-publish anything in the console. Older versions keep working, and existing data carries over as it is.

## 1. Upload
1. Open the repository and folder that serve OncoRegistry, then **Add file → Upload files**.
2. Drag in `index.html` from this folder. Optionally also add `firestore.rules`, so the repository matches the console.
3. Use commit message `OncoRegistry 2.0`, choose **Commit directly to the main branch**, then **Commit changes**.
4. GitHub Pages republishes in 1–2 minutes.

If the address changes, for example a new repository or domain, add the new domain in Firebase → **Authentication → Settings → Authorized domains**, or log-in will be refused.

## 2. Smoke test (about 3 minutes)
Open the app and hard-refresh (Ctrl/Cmd + Shift + R).

1. **Version.** Go to Settings → About. It should say **Version 2.0**, and **What's new** should list 2.0.
2. **Dropdowns.** In a record, open *Stage group*. A list opens under the field. Type `iii` to jump, then press Enter. On a phone, the list rises from the bottom; drag it down to close it.
3. **Dates.** In a record, type `12032021` into any date: it shows **12/03/2021**. Type `31/02/2021` and press Tab: the field turns red and stays empty. The calendar button opens a month with year jumps (« »).
4. **Leave without saving.** Change a field, then click *Today* in the sidebar. The app's own dialog asks **Leave without saving?**: *Stay* keeps you on the record.
5. **Calendar.** Sidebar → Calendar. Patients due for follow-up appear on their due day; *Agenda* lists the overdue ones and the next 8 weeks. **Download .ics** saves a file that opens in Google Calendar or Outlook.
6. **Streak pause.** Settings → *Pause the streak*: pick a first and last day (up to 30). Today then says **Paused until …**. Clear it again if you don't need it.
7. **Suggestions.** In *Histology*, type `duct`: suggestions appear under the field.
8. **Console.** The browser console (F12) shows no red errors.

**If something fails:** re-upload the previous `index.html`; no Firebase settings need undoing. Then tell me the step and what you saw.
