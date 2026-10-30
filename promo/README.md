# Pomodorolist promo video (30 s)

Everything here is separate from the app: nothing in `index.html` or Firebase is touched.

## What is in this folder

| file | purpose |
|---|---|
| `promo.html` | The animation. Every element's position is a pure function of time: `seek(t)` lays out the whole frame for `t` seconds. `?fmt=landscape` (1920×1080) or `?fmt=portrait` (1080×1920); `?play=1&fit=1` plays it live in a browser for a quick look. |
| `timeline.js` | Scene times (shared by the page and the sound design). Retime the video here. |
| `capture.mjs` | Pulls the real app screens out of the demo account into `shots/` (desktop at 2×, phone at 3×, the timer ring at 31 points, the garden at five growth stages, the boss arena calm / hit / after, the podium, the clan table, the profile card, pets, flashcards, reminders, True Minimalist, Pomeo in six moods). The demo never writes; only the in-memory page state is changed (the demo banner is hidden, the weather set to a clear day). |
| `extract-logo.py` | Copies the logo SVG out of `index.html` into `shots/logo.svg`. |
| `render.mjs` | Renders `promo.html` frame by frame with Playwright (one `seek(t)` per frame, 60 fps, 1800 frames) and pipes the PNGs into ffmpeg (H.264, yuv420p, CRF 17, `faststart`). No real-time capture, so no stutter. |
| `sound.mjs` | Code-generated sound design (filtered-noise whooshes on transitions, a sine-bell chime on the harvest, pops on the badges and Pomeo, ticks under the timer, a thud on the boss hit). No samples, no music. Writes `out/sfx.wav` at −6 dBFS peak. |
| `post.sh` | Muxes the sound versions, cuts the poster frames, the 5.6 s loop (MP4 + GIF) and the contact sheets. |
| `qc.mjs` | The automated quality check: every 0.1 s, in both formats, every text block must be inside a 36 px safe area, unclipped, not overlapping another text block, and every headline must stay fully readable for at least 1.2 s. |
| `shots/` | The captured app screens (demo data only). |
| `out/` | Rendered files (not committed; see below). |

## Re-render (e.g. after changing a line of text or the link)

```sh
cd promo
npm i playwright            # once (the repo's test setup already has it; a symlinked node_modules works too)
# 1. (optional) refresh the app screens: serve the repo root on :8000, then
node capture.mjs http://localhost:8000/index.html && python3 extract-logo.py
# 2. edit promo.html (copy, layout) or timeline.js (timing)
node qc.mjs                 # text safe areas, overlaps, readability
# 3. render both formats (about 3–4 minutes each on a laptop), then the derived files
node render.mjs --fmt landscape --out out/promo-16x9-silent.mp4
node render.mjs --fmt portrait  --out out/promo-9x16-silent.mp4
sh post.sh
```

Outputs in `out/`: `promo-16x9-silent.mp4`, `promo-9x16-silent.mp4`, `promo-16x9-sound.mp4`, `promo-9x16-sound.mp4`, `poster-16x9.png`, `poster-9x16.png` (end card) and `poster-*-garden.png` (the harvest moment), `loop-16x9.mp4/.gif`, `loop-9x16.mp4/.gif` (the garden growing → harvest → sparkle, 5.6 s), `contact-16x9.png`, `contact-9x16.png` (one frame per second).

Quick stills for review without a full render: `node render.mjs --fmt portrait --stills 2.5,10.4,26 --dir out/stills`.

## Storyboard as rendered

| time | scene |
|---|---|
| 0.0–3.45 | "Studying feels like a grind?" types in, dissolves into "Make focus feel like progress."; Pomeo pops in. |
| 3.45–7.0 | A phone with the real timer; the ring fills from 25:00 to 0 (31 captured states). "A simple Pomodoro timer…" |
| 7.0–12.0 | The phone zooms into the garden; the tomato grows through its five stages; a harvest pops on the ripe sunflower (★★★★); the Moonlit basil sparkles; the pets card slides in. "…that grows a garden every time you focus." |
| 12.0–16.0 | The boss arena: a hit with the app's own −25 damage number, a flash, a shake; the HP bar drops. "Beat weekly bosses with your study time." |
| 16.0–20.0 | The clan study table; the leaderboard podium rises. "Study with friends. Climb the leaderboard." |
| 20.0–24.0 | Six quick cards (0.62 s each): Harvests ★★★★★ · Pets · Streaks & stats · Flashcards · Reminders · True Minimalist. |
| 24.0–27.5 | Three badges spring in: Free forever · No ads · No tracking. "No subscription. No paywall." |
| 27.5–30.0 | Logo, Pomodorolist, siverieg.github.io/Pomodorolist-V1.0, "Try the demo, no signup needed", Pomeo waves. Held 2.5 s. |

## Honesty notes

Every screen is a capture of the current app's demo account (sample data, no real users). The boss HP bar in the arena scene is drawn by the video in the app's style (the captured arena card does not include the bar); the numbers it shows are the demo's own kind (480 HP solo boss, a 25-minute block = 25 damage). No user counts, ratings, reviews or testimonials appear. "No ads" and "No tracking" match the app: it has no advertising and no analytics; it only uses Firebase Auth and Firestore to store the user's own data.
