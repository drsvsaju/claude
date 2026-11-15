# Browser tests (Playwright + the Firebase emulators)

A copy of the test harness that normally runs from a scratch folder outside the repository. It is kept here so the
suites survive a reset of that folder. Nothing in this folder is uploaded to the live site.

## Restore and run
1. Copy this folder to a working folder (the scripts expect `<scratch>/fb`), then `npm ci` there.
2. `sh ensure.sh` starts the test site on :8000 and the Auth + Firestore emulators (project `demo-pomo`).
3. `sh tools/site.sh` (it lives one level up as `v1143/site.sh` in the working copy) builds the test page from the
   repo's `index.html`: it swaps the Firebase config for the emulator project and points the SDK at local files.
4. One or more suites: `sh rerun118.sh <suite> [<suite> …]` (rebuilds the page, loads the repo's rules, **clears the
   emulator**, runs the suites one after another). Suites must never run at the same time.
5. Everything: `sh runall.sh` (about 4 hours).

## What is here
- `*.mjs`: one suite per feature or release (`v120d.mjs` = Posts, `v120e.mjs` = the 7-day two-device simulation…).
  `cl-common.mjs` has the shared helpers; `ot-classic.mjs` keeps Overtime off for suites written before v1.20.
- `shots.mjs` + `shots-screens.mjs`: the screenshot tool used for the v2.0 before/after pictures
  (`node shots.mjs <outDir> --page index.html --variants d-dark,d-light,phone`).
- `tools/`: `site.sh`, `contact.py` (contact sheets), `mkindex.py` (the JS function index in `notes/v2.0-codemap`).

The paths inside the shell scripts are absolute paths of the working folder; adjust them after restoring.
