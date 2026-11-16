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
  The component gallery is shot with `--page 'index.html?debug=1'`.
- `v200a.mjs` (v2.0): the control library, on the Component gallery of the demo account — the native contract of
  `<ui-select>`, keyboard maps, ARIA, panels inside dialogs, phone sheets, the preset chooser, every palette's contrast
  on every layer, and that the demo writes nothing. Suites named `v2*` run without `ot-classic.mjs`.
- `perfp1.mjs`: a quick render / tab-switch / theme-application timing of two builds side by side.
- `tools/`: `site.sh` (`sh site.sh other.html` builds a second copy next to the main one), `contact.py` (contact
  sheets), `mkindex.py` (the JS function index in `notes/v2.0-codemap`), `tokens.mjs` (regenerates the stylesheet's
  first-paint colour roles from the script's own arithmetic: `node tokens.mjs --write`).

The paths inside the shell scripts are absolute paths of the working folder; adjust them after restoring.
