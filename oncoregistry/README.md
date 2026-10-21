# OncoRegistry

A one-file web app for collecting oncology research data. It runs like a lightweight REDCap built for Indian real-world-data studies. It is hosted the same way as the Focus app: one `index.html` on GitHub Pages, with Firebase for login and the database.

**Try it without any setup:** open the page and press **Try the demo**. That loads 120 synthetic patients, kept only in your browser.

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
| **Paper CRF** | A printable blank form for clinics without a computer at the bedside. |
| **Works offline** | Records open and can be edited without internet and sync later. Only *registering* a new patient needs a connection, because that is when the unique Study ID is assigned. |
| **Conflicting edits** | If two people edit the same record, the second save is refused (enforced by the server) instead of silently overwriting the first person's work. |

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
