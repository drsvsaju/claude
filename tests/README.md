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
  on every layer, and that the demo writes nothing. Suites named `v2*` and `v3*` run without `ot-classic.mjs`.
- `v300a.mjs` (v2.0 phase 3): the shared shell and vocabulary — the dialog title, close button and phone bottom sheet,
  one filled accent button per view on every tab, counts instead of dots, no dashed edge on a working control — the
  timer ring (full at rest, empties clockwise, nothing loops during a block), and one check for each fault the screen
  audit and the design review found (collection bar, chart labels, the stale coin count, the collapsed flashcard on
  touch screens, exams, reminder delete, phone rows and tab strips). `tools/mk03.sh` builds the before / after pairs.
- `v400a.mjs` (v2.0 phase 4): performance and accessibility, held in place by structure and not by a stopwatch — no
  blurred card in the default look, the closed scrim not painted, the ring redrawn only when it has moved, a tab switch
  that does not rewrite the account, one render of the Profile, long lists that fill in idle moments (and still move by
  keyboard), the year heatmap in week columns, the page still behind a dialog, focus after a dialog closes, keyboard
  reach, one heading per section, names for charts and fields, every ink × theme pair at 4.5:1, 44 px phone targets, the two tinted fills the run over every theme found, and the
  garden's state after a cloud copy that changes nothing (the stale-cache bug behind v115b's failures in full runs).
  Suites named `v2*`, `v3*`, `v4*` and `v5*` run without `ot-classic.mjs`.
- `v500a.mjs` (v2.0 phase 5): all-day reminders on two devices and a phone — the form (the grid does not move when
  "All day" is switched), a valid `time` kept for older versions, one alert at the chosen time or on the first open
  after it, snooze, a changed alert time not ringing twice, the second device staying quiet, repeats, done, missed,
  the dated calendar event (.ics and Google), the setting, and back to a timed reminder.
- `v500b.mjs`: the Calendar on a signed-up account — wiring (sidebar, key C, palette), the Month grid, the day dialog
  and the keyboard, dragging to another day with Undo, the Week (positions, overlap, drag over empty hours to plan a
  block, drag to move), a block's alert starting the timer, the Agenda, the calendar file, the past, the cloud copy.
  Its test days are the 10th–16th of next month and the week's own columns, so it does not depend on today's date.
- `v500c.mjs`: the Calendar where nothing may be written (the demo: filled, prompts, no traffic, storage unchanged),
  on a phone (dots, 44 px targets, the Day view), for a guest (a finger's hold-and-drag through CDP touch events,
  kept after a reload) and in True Minimalist.
- `perf4.mjs` (phase 4): the numbers — `node perf4.mjs index.html [--big] [--phone] [--throttle 4] [--tag name]` prints
  one JSON line (start-up, every tab switch, the slowest interactions by Event Timing, frame rate, DOM size);
  `tools/perf4sum.py before.jsonl after.jsonl` makes the table. `--big` loads `tools/bigacct.js`, which turns the demo
  into a large account (2 years of sessions, 50 friends, 240 to-dos…) without writing anything.
  `tools/prof.mjs` wraps every top-level function and prints where the time of one action goes.
- `tools/a11y4.mjs` + `tools/a11y4.py` (phase 4): contrast computed from what is drawn — each state is photographed
  with the glyphs transparent, so the real background behind every text is known; `--skins all` covers every theme, `--skins th_a,th_b` the named ones.
  `tools/a11y4b.mjs [--phone]`: names, keyboard reach, focus, headings, 44 px targets, reduced motion on every screen.
- `perfp1.mjs`: a quick render / tab-switch / theme-application timing of two builds side by side.
- `ui-compat.mjs` (v2.0, preloaded for every suite by the runners): the older suites keep calling `page.selectOption()`,
  `page.fill()` on a date / time / number, `page.on('dialog')` or a `window.confirm` stub, and this layer makes those
  calls drive the app's own controls and its confirm dialog. A suite that clicks the confirm dialog's buttons itself
  is left alone. `v200c.mjs` tests the layer.
- **Time of day.** The runners start every suite in a timezone where it is about midday on the same calendar date
  (`TZ=…`, followed by Node and by the browser). The app unlocks "Night owl" after 10 PM and "Early bird" before 7 AM,
  which changes coins, celebrations and post counts, so without this a run at night fails suites that pass by day.
  v7 also lets those celebrations finish before its keyboard-shortcut steps, so it passes at any hour on its own.
- **What counts as a failure.** A runner line reads `pass` or `FAIL`, and the last line lists every failed suite. A
  suite fails when it exits non-zero, prints a `✗` line, or reports `failures N` / `problems N` / `N FAILED` with
  N > 0. Until v2.0, fourteen suites (v111b–v114a, plus v112e's layout problems) printed their failure count and still
  exited 0, so a failing check could pass unnoticed; they now exit 1 as well. Three were found failing that way:
  v112c (its "nothing changed" expectation predated the rewards v1.18–v1.19 add to an old account: streak milestones,
  rank frames, season coins; it now checks that only those are added), v113b (its sharpness check sampled one fixed
  row of the share image that no longer crossed any text; it now takes the best of rows every 2%), and v1131a (a
  rank-up shows one small toast during a block by design since v1.19; the test now allows exactly that toast).
  A fourth showed up once the verdicts were honest: v112b's questline checks use the October 2026 questline, which
  ended on 7 November; the suite now keeps that questline open for its own two browsers.
- `ui-compat.mjs` waits for its page binding before handing the page to the suite (two bindings set up at once made
  Playwright throw "reading 'addBinding'" inside the page).
- `startup.mjs`: start-up cost of two builds, alternated (`node startup.mjs v120.html p1.html`).
- v112c's start-up check takes the best of three loads: one cold load in this container varies by about ±60 ms
  (v1.20 measured 310–370 ms against the 300 ms budget).
- `tools/pair.py`: before/after screenshot pairs with captions.
- `tools/`: `site.sh` (`sh site.sh other.html` builds a second copy next to the main one), `contact.py` (contact
  sheets), `mkindex.py` (the JS function index in `notes/v2.0-codemap`), `tokens.mjs` (regenerates the stylesheet's
  first-paint colour roles from the script's own arithmetic: `node tokens.mjs --write`).

The paths inside the shell scripts are absolute paths of the working folder; adjust them after restoring.
