# OncoRegistry

A one-file web app for collecting oncology research data. It runs like a lightweight REDCap built for Indian real-world-data studies. It is hosted the same way as the Focus app: one `index.html` on GitHub Pages, with Firebase for login and the database.

**Try it without any setup:** open the page and press **Try the demo**. That loads 120 synthetic patients, a small team and several weeks of activity. Nothing is written to the browser; reloading starts a fresh demo.

Current version: **2.0**. It is built on the architecture of the Focus app (Pomodorolist) 2.0: its "Soft depth" design and its own control library. See *Version 2.0* below.

## What it does

| Area | Features |
|---|---|
| **Studies & team** | Each study gets its own Study ID prefix (e.g. `GBC-0001`), centres and IEC reference. You invite colleagues by e-mail with one of three roles: **admin** (PI: settings, verify/lock, delete), **editor** (data entry) or **viewer** (read and export, e.g. a statistician). |
| **Case record form** | Core oncology dataset: registration and consent; demographics (state, district, urban/rural, Modified Kuppuswamy class, payer: PM-JAY / CMCHIS / ESI / self-pay…); risk factors (smoking, smokeless tobacco, betel quid, alcohol); comorbidities and Charlson index; BMI; diagnosis (ICD-10, ICD-O-3, histology, grade, ECOG); staging (TNM 8th / FIGO / Lugano / ISS, metastatic sites). Repeating tables for **biomarkers**, **treatments** (intent, line, regimen, cycles, RT dose, surgical margins, funding, best response, progression), **CTCAE toxicity** and **follow-up visits**. Outcome: recurrence, vital status, cause of death and **treatment abandonment** with its reasons. |
| **Study-specific fields** | The PI can add their own variables (text, number with range, date, single or multiple choice, yes/no) to any section. Optional sections can be switched off. |
| **Data quality** | Required fields, range checks, no future dates, date-order checks (e.g. death before diagnosis, treatment end before start), a completeness % per record, and a list of what's missing on the dashboard. Records go **Draft → Complete → Verified & locked** (admin only). |
| **Audit trail** | Every registration, edit, lock, unlock (with reason) and deletion is stored with who, when and the old → new value of each field. Nobody can change or delete it, not even admins. |
| **Survival** | OS and PFS from diagnosis are calculated for each patient. The dashboard shows Kaplan–Meier curves (overall or by stage, ECOG, sex, metastatic status, site, payer or centre) with median and 95% CI, 1/2/5-year survival, number at risk and the log-rank p-value. |
| **Export** | Analysis-ready CSV files: one row per patient with derived `os_months`, `os_event`, `pfs_months`, `pfs_event` and toxicity summaries. Separate long tables for treatments, biomarkers, toxicity and follow-up (linked by `study_id`), a data dictionary and a JSON backup. Coded answers can be exported as labels (for Excel/SPSS) or codes (for STATA/R). |
| **Today (home)** | Each study opens on a Focus-style home page. It shows a daily-goal ring (records you worked on today), your current and longest streak, and a quick **Register patient** button. Type a patient's number (e.g. `12` → `GBC-0012`) or hospital ID to open their record. It also shows chips for recently opened patients (you can pin them), a **Due for follow-up** list (no contact for 90+ days, adjustable), your unfinished drafts and the study's recruitment progress. |
| **Calendar** | When each patient falls due for follow-up (last contact + the follow-up interval), visits recorded and registrations, by month or as an agenda (overdue, then the next 8 weeks). **Download .ics** puts the next six months of due follow-ups into Google Calendar, Outlook or a phone calendar, with Study IDs only. |
| **Profile** | Levels, tier badges and achievements in the Focus app's style. For example: first patient, 100 registered, 25 records completed, 100 follow-up visits, a 30-day streak. There is also your own activity chart by day, week, month or year, with the daily-goal line. |
| **Team** | A leaderboard for this week, this month or all time, plus the members and invitations page. Points favour complete data: registering a patient 10, marking a record complete 15, a follow-up visit 5, a treatment 3, an edit 3 (counted once per record per day), verifying 5. Everything is worked out from the audit trail, so nothing extra is stored. |
| **Preferences** | Theme (system, light or dark), accent colour, daily goal, working days (days off never break a streak), the week's first day, the follow-up interval, and a switch to turn progression off for a plain registry. Preferences are saved on each device. |
| **Shortcuts** | `/` opens a patient or searches, `N` registers a patient, `Ctrl+S` saves the open record, `G` then `T`/`P`/`C`/`D`/`M` goes to Today, Patients, Calendar, Dashboard or Team. |
| **Paper CRF** | A printable blank form for clinics without a computer at the bedside. |
| **Works offline** | Records open and can be edited without internet and sync later. Only *registering* a new patient needs a connection, because that is when the unique Study ID is assigned. |
| **Conflicting edits** | If two people edit the same record, the second save is refused (enforced by the server) instead of silently overwriting the first person's work. |

| **Find anything** | **Command palette** (`Ctrl K`, or the search button): type a Study ID or number to open a patient, or search for pages, actions (register, export, print the CRF) and settings. **Inbox** (bell): invitations, follow-ups due, drafts, achievements and colleagues' changes. |

## Version 2.0: the Focus app's 2.0 architecture

- **The control library.** Every dropdown, date field and number setting is now the app's own control, ported from Focus 2.0. Each one keeps the contract of the browser control it replaces (same id, `.value`, `input`/`change` events), so the data model and saving are unchanged. Dropdowns open a list you can type into (with search in long lists). On a phone they open as a sheet from the bottom that you can drag away.
- **Typed dates for the case record form.** Dates are typed day first: `12032021`, `12/3/21` and `12-3-2021` all become **12/03/2021**. A calendar with month and year jumps is behind the small button. A date that doesn't exist (for example 31/02/2021) is marked in red and left empty, so it shows up as missing instead of being saved wrong. Clinical numbers (age, weight, labs) stay plain fields, so typed values are never silently clamped.
- **Calendar** (Study → Calendar, `G` then `C`): see *What it does*.
- **Streak pause** (Settings → Work & goals): up to 30 days of leave or a conference count as days off.
- **One dialog shell.** Every dialog has a close button. Questions such as *Leave without saving?* and *Log out with unsaved changes?* use the app's own confirm dialog instead of the browser's. Suggestions for regimens, CTCAE terms and histology appear under the field (they were browser datalists).
- **Smaller things.** Link previews (title and description) when the address is shared, the ribbon icon in the browser tab, tooltips on icon buttons, a *Skip to content* button for keyboard users, and nothing animates behind an open dialog.
- **Unchanged.** Data, `firestore.rules` (55 checks pass) and existing studies. Version 1.x pages keep working against the same database.

## Version 1.3: the Focus app's 2.0 "Soft depth" design

- **Depth instead of borders.** The header and sidebar sink back; the page is a raised sheet with a rounded corner. Cards have no outlines: a slightly lighter tone, a fine top highlight and a soft shadow tinted with the accent colour.
- **One shape language.** Pills and circles are things you press (buttons, chips, the header search, the tab bar). Squarer, slightly sunken wells are things you type in or choose in (fields, dropdowns, switchers). Every control has a visible edge (at least 3:1 contrast).
- **Colour from nine values.** Every colour is mixed from the theme's nine values and the chosen accent, so all five accents and both themes stay legible. The accent never glows; status colours (warning, error, success) are derived from it.
- **Today.** One lead card (the goal ring, **Register patient**, open-by-ID), then your streak as two numbers, a goal bar and a ledger: due for follow-up, your drafts, registered, complete, verified. Each row opens the matching patient list.
- **Clearer states.** A chosen answer in the form is shown three ways (soft fill, accent edge, check mark); switches show O / I; labels (Draft, Complete, Verified) are small square tags, never pills.
- **Toasts** are cards at the bottom right with an icon, a dismiss button and a thin line showing how long they stay. Errors stay until you dismiss them.
- **Unchanged.** Data, `firestore.rules`, features and shortcuts. Glossed Interface and Animations settings still apply.

## Version 1.2: the Focus app's look and structure

- **Navigation as in Focus v1.20.** A grouped, collapsible sidebar (Study · Analysis · Team, plus Settings), with the current study shown at the top. Tablets get a ☰ slide-in menu; phones get a bottom bar and a **More** sheet.
- **Header.** Logo, sync status, search, inbox and your level chip.
- **Glossed Interface** (Off · Lite · Full) and **Animations** (Full · Reduced · Off; Automatic follows the device). Both are saved on each device.
- **Components.** Switchers with a sliding pill, every checkbox drawn as a switch, native dialogs and sheets that animate open and closed with a blurred backdrop, stacked toasts with a check mark, and **Undo** when you remove a treatment, visit or other entry. Line-art empty states, loading skeletons and an offline banner.
- **Settings.** A search box and grouped cards: Appearance, Work & goals, Progression, Account & data, About. What's new, and a keyboard-shortcut list (`?`).
- **Keyboard.** `Ctrl K` palette, `/` search, `N` register, `G` then `T`/`P`/`D`/`M` to go to Today, Patients, Dashboard or Team, `I` inbox, `Ctrl S` save.
- **Demo.** Like the Focus preview, the demo writes nothing to the browser.
- **Unchanged.** The data model and `firestore.rules`. Existing studies, patients and audit trails carry over as they are.

## Privacy by design

- Patients are known only by their **Study ID**. The form has no fields for name, phone, address or Aadhaar.
- **Optional hospital ID lookup:** the MRN is stored only as a salted SHA-256 hash. The team can then find a record or catch a duplicate registration, but the number itself is never saved or exported. Keep your own identity-linking log offline, as your IEC protocol requires.
- Ages are collected, not dates of birth. Dates of diagnosis, treatment and death are collected because survival analysis needs them.
- Logging in requires a **verified e-mail address**. Logging out deletes the offline copy from that browser, which matters on shared hospital computers. On a shared computer, untick "Keep me signed in".
- `firestore.rules` enforces all of this on the server. It is tested against the Firestore emulator: 55 checks covering roles, invitations, stale saves, locking and outsiders.

> This tool is meant to support a study that has IEC approval, under the ICMR National Ethical Guidelines (2017) and the DPDP Act 2023. Its security does not replace the consent, approvals and data-management plan your protocol needs.

## Setup (about 15 minutes, free)

Use a **separate Firebase project** from the Focus app.

1. **Create the project.** Go to <https://console.firebase.google.com>, choose **Add project** (e.g. `oncoregistry-mmhrc`) and skip Google Analytics.
2. **Turn on login.** Go to **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. **Create the database.** Go to **Build → Firestore Database → Create database**. Choose **Production mode** and location **`asia-south1` (Mumbai)**, so the data stays in India. The location can't be changed later.
4. **Add the security rules.** Go to **Firestore → Rules**, delete what is there, paste the full contents of [`firestore.rules`](firestore.rules) and press **Publish**. No indexes are needed.
5. **Connect the app.** Go to **Project settings (⚙) → General → Your apps → Web (`</>`)** and register the app. Copy the `firebaseConfig` values into the **FIREBASE CONFIG** block near the top of the script in `index.html`. These values are safe to publish.
6. **Host it.** With GitHub Pages turned on for this repository (**Settings → Pages → Deploy from branch `main`, folder `/`**), the app is at `https://<your-username>.github.io/<repo>/oncoregistry/`.
7. **Allow the website to log in.** Go to **Authentication → Settings → Authorized domains → Add domain** and add `<your-username>.github.io`.
8. **Start using it.** Open the app, create your account, verify your e-mail, create your study and invite your team from **Study & team**. Each person creates an account with the invited e-mail address, and the invitation appears for them after they verify it.

**Free-tier capacity:** the Firebase Spark plan allows 50,000 reads and 20,000 writes per day and 1 GB of storage. That is enough for registries with a few thousand patients and a small team. Each time someone opens a study, every record in it is read once.

## Good to know

- The dashboard statistics are for monitoring and a quick look at the data. Run the final analysis on the exported CSV in R/STATA/SPSS.
- A study's Study ID prefix and a custom field's variable name can't be changed once created, because records are stored under them.
- Back up regularly: **Export → Full backup (JSON)**.
- For testing with local emulators, open `index.html?emulator=1`.
