# History and conventions (v1.14 → v1.20)

Sources read in full: `notes/v1.16-plan.md`, `v1.16-notes.md`, `v1.17-plan.md`, `v1.17-notes.md`, `release/RELEASE-NOTES-1.17.md`,
`v1.18-plan.md`, `v1.18-notes.md`, `v1.18-report.md`, `v1.19-plan.md`, `v1.19-notes.md`, `v1.19-report.md`, `v1.19.1-report.md`,
`v1.20-report.md`, `deploy/upload-v1.20/CHECKLIST.md` (+ `deploy/upload-v1.19.1/CHECKLIST.md` for format), `git log` (143 commits).
The two inline rules snapshots (v1.18-report L167–1048, v1.19-report L278–1227) were read for their comments only; the current
rules are mapped in `04-firestore-rules.md`.
Line numbers are `index.html` at commit `77f8456` (v1.20) and drift once editing starts — search by NAME.

State when this map was written (2026-11-15): `index.html` is unmodified at `77f8456` (byte-identical to
`deploy/upload-v1.20/index.html`, 1,894,419 bytes); there is **no v2.0 commit yet**; untracked: `notes/v2.0-brief.md`,
`notes/v2.0-codemap/`, `screenshots/v2.0/00-baseline/` (180 jpg = 60 screens × `--d-dark` / `--d-light` / `--phone`), `tests/`.
`notes/v2.0-plan.md` does not exist yet.

## Timeline
Work repo `drsvsaju/claude`, branch `focus-app` (origin). Live site `https://siverieg.github.io/Pomodorolist-V1.0/` = repo
`siverieg/Pomodorolist-V1.0`, branch `main`, uploaded by the owner by hand. Firebase project `pomodorolist-bbaa6` (Spark plan).

| Release | Date (2026) | Commits | What it added | Firestore | Suites |
|---|---|---|---|---|---|
| pre-1.7 | 10-18…20 | `d2e63fb`…`f884703` | single-file timer; accounts + cloud sync; XP/levels/coins/shop; friends, public profiles, leaderboards, weekly challenges; nav tabs + phone bottom bar; Pomeo, Reminders, Liquid Glass; Quests (weekly boss), Wrapped, spaced revision, exams, parking lot, tomato garden, shortcuts, aura, daily login rewards; subtasks; interface sounds | users, usernames, publicProfiles, publicStats, activity, presence, friendships, inbox, challenges | — |
| 1.7 | 10-20 | `36277b9` | inbox, command palette, searchable settings, undo toasts, About/changelog, offline banner, phone gestures, **first design tokens**, contrast pass | — | — |
| 1.8 | 10-20 | `63c1b83`, `09fcc10`, `c78ea70` | True Minimalist, Pomeo tutorial + tips, energy check-ins, session summary, quick-start chips, profile pictures; "Liquid Glass" renamed **Glossed Interface** (Lite default) | — | — |
| 1.9 | 10-21 | `10fda21` | welcome page + read-only **demo preview** | — | — |
| 1.10 | 10-21 | `47c8218` | Pomeo loading screen, focus atmosphere, ripening ring, Pomeo empty states | — | — |
| 1.11 | 10-21 | `18448bc` | reliable sounds, **item-by-item sync**, cache-first loading | — | — |
| 1.12 | 10-22 | `7c82106`, `183d530`, `db0b537` | boss arena, bag, questlines, festive touches; add-only game data merged, safer claims | — | — |
| 1.13 / 1.13.1 | 10-23 | `87731da`, `b7cb365` | player cards, time-of-day sky, completion stamps; **focus guard**, boss HP tiers, intro | — | — |
| 1.14 | 10-23 | `042612f`, `fb203c3`, `be420f0` | to-do list in Reminders; **clans** (roles, contributions, shop, quests, raids, planned + live sessions, clan board) | clans/… clanNames, clanCodes, clanOf + 2 indexes | — |
| 1.14.1 | 10-23 | `eaabb54` | one look for a person everywhere, distinct squad auras, clan tag on by default | — | — |
| 1.14.2 | 10-23 | `adcb18f` | **Focus together** (own timers at one table) default clan session mode; Synced timer optional | live `people` fields | — |
| 1.14.3 | 10-25 | `f0c9552`, `ca75a34` | `copyText` with fallback + Share, sidebar / More / bottom-bar navigation, collapsible profile card, value-first welcome page, monthly raid HP table, rules security audit (68 attacks, `sec143`), code health | rules hardening | — |
| 1.15 | 10-25 | `c60f808`…`8f09f86` | **Garden** tab (plots, seeds, growth, harvest, produce, shops, mutations, visitors, weather, wilting, levels, almanac, migration), Pomeo's room, break flashcards, weekly subject plan, cosmetics drop | none | 59 |
| 1.16 | 10-26 | `193e81c`…`4576182` | rotating seed shop, pets + eggs, crop weight / Giants / records, 7 focus-weather mutations, garden looks (produce-priced cosmetics), leaderboard v2 (podium, arrows, pinned own rank) + Produce / Harvests boards. Real Firebase config kept in the repo from `6bf58aa` | publicStats `produce`, `harvests`; publicProfiles `big`; +2 indexes | 66 |
| 1.17 | 10-30 | `276cdbb`…`4529225` | user bug fixes (watering replay, goal history, jitter, challenge reward cap, banner tints), header logo, **Finish early**, Timer garden glance, plant XP + fair shares, coin XP boosts, Harvests basket (stars, selling, festival), garden tour, tasks, compost, trophy shelf, scenes, pets round 2, daily rewards past Day 7 | none | 77 |
| 1.18 | 11-03 | `0507dfa`…`b3e1e74` (final build `2c281b8`) | preset chips rebuilt (`S.chips`), challenge join cap, **study sessions without a clan**, Friends tab in 3 views, together rewards, bonus Clan Points, 39 achievements + sortable page, streak milestones 3…365, **Pomeo redesign**, weekly quest board, monthly track, Pomeo stages, collection log. Rules fix: `raidHPFor` (clan creation broken in production since 1 Nov) | challengeJoins, studySessions (+people, reactions, requests), sessionCodes, inbox `sinvite`, clan `bonus`; +1 index | 86 |
| 1.19 | 11-03/04 | `c1a9853`…`102b46b` | seasonal **ranks** (UTC month, 14 h/day cap, divisions, placement floor, season + first-time rewards), rank badges next to names, Ranks + Streaks boards; dialog re-open fix | new `rankStats/{uid}`; +3 indexes | 89 |
| 1.19.1 | 11-04 | `b35faba`…`94e3a1e` | leaderboard tab bug, Monthly board removed, rank chip in header / card, switchers on one line with exact pill (`syncSegs`), **balanced card columns** (`.mason` / `fitMason`), sessions accept any preset (`PRESET_LIMITS`), `sessAct`; round 2: columns placed by the app, Clan page back to its own two columns + folding cards, "joined the clan" once, **Study sessions as its own section** (J) | rules `validPattern` widened only | 93 → 94 |
| 1.20 | 11-10 | `8afb6c5`, `7126a48`, `4733068`, `d4a5498`, `91141b2`, `77f8456` | rank ladder + division hint, **Overtime** (on by default), **Study Pass** (replaces the monthly track), **Posts** section (O) | new `posts`; +3 indexes (18 composite indexes in total: publicStats 7, challenges 2, clans 2, studySessions 1, rankStats 3, posts 3) | 100 |

Top-level rule blocks at 1.20 (`firestore.rules`, 72,382 bytes): users, usernames, publicProfiles, publicStats, rankStats, activity,
presence, friendships, inbox, posts, challenges, challengeJoins, studySessions (+people, reactions, requests), sessionCodes, clans
(+members, requests, sessions, live/people, live/reactions, feed), clanNames, clanCodes, clanOf.

## Standing rules the owner has given
Collected from the v1.16–v2.0 briefs and the reports. Where two briefs disagreed, the later resolution is given.

**Repository, config, delivery**
- **Firebase config stays real.** The `EDIT HERE` block (L≈4920) keeps the live values (`authDomain: "pomodorolist-bbaa6.firebaseapp.com"`,
  `projectId: "pomodorolist-bbaa6"`). History: 1.16 and 1.17 briefs said keep real; the 1.18 brief said `PASTE_…` placeholders → the
  block was left untouched and the report said so; the 1.20 report repeats "your standing instruction is to keep the real values";
  the 2.0 brief (rule 6) confirms. The test-site build rewrites the block with `sed` on the exact `key: "value"` shape
  (`tools/site.sh`), so do not reformat it.
- **Never push to the live repo.** Push only to `origin` (`drsvsaju/claude`, `focus-app`). The owner uploads through the GitHub
  website (Add file → Upload files → "Commit directly to the main branch"). 1.18 / 1.19 also shipped git bundles
  (`deploy/*.bundle`); from 1.19.1 the delivery is a folder `deploy/upload-vX/` plus `deploy/pomodorolist-vX-files.zip`.
- **No pull requests.** Every release was committed and pushed straight to `focus-app` (linear history). This is the observed
  practice and is named in this map's task; I did not find it written in the notes themselves.
- **Commit message pattern:** `v2.0: <phase summary>`, one commit per phase, pushed. Earlier forms: `v1.18: Phase N — …`,
  `… (in progress)` for a partial phase, `vX: report — …` for notes, and a closing
  `vX: sign-off — full regression N/N; deploy folder …`. Subjects are long and list what changed.
- **Every commit leaves the app deployable** (2.0). Never start a phase while tests fail. A queued release starts only after the
  previous one is fully signed off, in new commits, so each can ship alone (1.19 brief).
- **Deploy order: rules → indexes (wait for Enabled) → upload files.** Upload `firestore.rules` and `firestore.indexes.json`
  with `index.html` so the repo matches the console. State each time whether the new rules are safe for the live app version.
- **Everything stays in `index.html`.** 2.0 allows new static files only for the link-preview image and icons; each must be
  listed in the report and checklist with its folder path. **No PWA in 2.0**: no manifest, no service worker, nothing that caches `index.html`.
- **Deliverables:** complete `index.html`, complete rules with the exact changes listed, the exact list of new composite
  indexes, the report, the checklist, version bump (`APP_VERSION` L≈16079) and a What's new entry (`CHANGELOG` L≈16081), demo updated.

**Data and compatibility**
- **The demo never writes**: no Firestore write, no browser storage change, and (since `2c281b8`) no write *calls* at all.
  `startPreview()` (L≈17640) no-ops `Storage.prototype.setItem / removeItem / clear` and replaces `FB` with
  `previewFirestore(demoDocs())` (L≈17603 / 17464); `PV_BLOCK` / `PV_WHY` (L≈17657 / 17663) list the selectors that show the
  "preview prompt"; `isPreview()` (L≈17373). Every new feature appears in the demo with fake data.
- **Every new Firestore field is optional with a safe default; older apps keep working against the new rules** (2.0: versions
  1.18–1.20). Old clients must not crash on new data. Private data lives under `users/{uid}` with the cache-first item-level
  merge; Firestore changes only where other people must read the data.
- Existing users keep everything; migrations are idempotent, safe on two devices and offline, with version fields.
- Everything new works for guests (except public boards), syncs across devices and is in export / import (old exports still import).
- All randomness is deterministic from stored data or the time slot (no re-roll by reloading; every device agrees).
  Currencies and counts never go negative or duplicate.

**Behaviour**
- **Nothing pops up during focus** (the focus queue).
- Respect Animations (Full / Reduced / Off = `:root[data-motion]`), `prefers-reduced-motion`, sound settings, Glossed Interface
  (off / lite / full), True Minimalist (hide gamified parts), all 21 themes in light and dark, phones / tablets / desktop.
  44 px tap targets, no truncated text, no console errors.
- No real money, no paid or purchasable random loot (eggs only from focus), no theft mechanics, no free text other users can
  read (presets + word filter `cleanText`). 2.0 adds: no fake urgency, no shame copy, no dark patterns, no dates of birth,
  no contact scraping; rewards support studying.
- Anti-farming on anything tied to time or other people: daily / weekly caps, minimum durations, overlapping presence, nothing
  for a solo "group" session.
- Security: rules for every new collection or field in the same phase, with attack tests; nobody writes another user's data,
  fakes progress or claims twice. Keep the 1.14.3 audit fixes (listed in `v1.18-notes.md`: empty new clan, `lastMember` named,
  day / month keys not ahead, group session needs `second`, `clanOf` only with a member row, one reaction doc ≥ 2 s apart, typed
  presence / member fields, `creatorName` verified, leader steps down only by handover, 10-min clock leeway, one-read friendship
  check, tag verified only on change).
- Cost: stay inside Spark (50k reads / 20k writes a day for the whole user base); measure a normal day before and after.

**Process**
- Work unattended: decide, record the decision in the notes / report, continue. After a context compaction re-read the brief,
  the notes and `git log`.
- Bugs over features; cut or flag what cannot be made solid and say so in the report.
- After each phase: the phase's new suites plus the related old ones, fix, commit, push. Full regression at the end; rerun
  failures one by one; fix real issues.
- Tests for everything new, including: two browsers on one account, offline then online, guest, export / import of an older
  backup, demo writing nothing, double-clicks, reload mid-action, midnight / week / month / event rollovers, time zones, a
  clock a few minutes off, a brand-new account, a very large history, upgrading an existing account.
- An independent reviewer agent reads the full diff each release (2.0: plus a security reviewer on the rules); findings are
  tabled with a verdict and a fix, and get a regression suite.
- Layout audit matrix: 360 / 390 / 768 / 1024 / 1280 / 1440 (+ 1920 / 2560 since 1.19.1) × light / dark / Glossed / True Minimalist,
  every screen and dialog.
- 2.0 only: baseline screenshots first; 6–10 captioned screenshots after each phase with stitched before / after pairs
  (`deviceScaleFactor: 2`), committed under `screenshots/v2.0/<phase>/`; one gallery HTML at the end.
- From the owner's restart message: only one agent edits `index.html` at a time; parallel agents never write the same file;
  phase order, per-phase commit and screenshot updates stay; never leave a phase half-applied.

## Design decisions that still bind
Each: the rule, where it lives, why.

1. **Focus guard queue** (1.13.1). `FG`, `HOLD_ORDER` (L≈19786: level 1, ach 2, boss 3, reveal 4, unlock 5, login 6, migrate 7,
   tip 8, pomeo 9, toast 10), `HOLD_GAP` (L≈19787), `guardOn`, `holdForFocus(kind, key, run)` (L≈19797), `guardBusy()` (L≈19805),
   `releaseHeld()` (L≈19807). `toast(msg, ms, ok, {type, key, go, now})` (L≈5077) is held during a block unless `now` or the user
   acted in the last 1.5 s; `inboxAdd` (L≈16154) is never held. Held items come back one at a time, never over
   `dialog[open]`, `#tour`, `#wrapped`, an achievement card, a timed Pomeo bubble or `#tipPop`. Overtime and the gap before the
   tutorial's demo block count as focus. Why: the owner's hard rule since 1.13.1. A component that is not a `<dialog open>` is
   invisible to `guardBusy()`.
2. **Dialog plumbing.** `HTMLDialogElement.prototype.close / showModal` are patched (L≈5321–5335): close adds `.closing` for 170 ms
   (CSS L≈947–951; sheets 200 ms L≈2244), `showModal` on a closing dialog cancels the close and is a no-op on an open one
   (1.19 fix: a reveal reusing a closing dialog vanished). `toastHost()` (L≈5073) moves `#toast` into the top-most open dialog
   so toasts and Undo stay clickable above a modal. Existing promise-based yes/no: `confirmDlg({title, body, ok, danger, type})`
   (L≈22191, markup `#confirmDlg` L≈4627), used by clans only.
3. **Ledger-based claims and coins.** No stored balance: `earnedAt` (L≈8283) and `computeGame` (L≈8313) replay sessions,
   claims and purchases (an invalid purchase is refunded); claims are add-only maps in `S.game.claims.*` (goalDays, milestones,
   achievements, social, challenges, login, bosses, brew, quests, wq, track, evo, season, rkup, pass tiers), unioned on merge
   (`normalizeGame` L≈7347); `grantItems(ids, src, at)` (L≈11773) → `S.game.grants[id]`; `claimOnce(kind, key)` (L≈11780);
   garden ledger `gbuys`; `reconcileRewards` (L≈8395) repairs missing grants. Why: two devices, offline or not, can never pay
   twice or go negative. Formula changes use a cut-off date so no existing balance moves: `LOGIN_GROW_FROM = '2026-11-02'`
   (L≈12750), challenge rewards from the week of 2 Nov 2026 (`challengeRewards` L≈9383), `RANK_FROM = '2026-11'` (L≈12219),
   monthly track ends Nov 2026.
4. **Deterministic ids and rolls.** `hash01` (L≈13213). Ids: eggs `egg1`, `egg<n>`, `egg_lv4`, `egg_lv8`, `egg_ev_<event>`;
   garden tasks `gt_<day>_<i>`; challenge `<week>_<preset>_<uid>`; chips `c:<presetId>:<name lower>`; clan feed
   `join_<uid>_<joinedAt>`; inbox `k_<me>_<target>`, `n_<me>_<day>`, `si_<me>_<sid>`; posts `<type>_<author>_<ref>`; season claim
   `YYYY-MM:<peak>`. Why: two devices create the same record, and for shared collections the rules refuse the second write.
   A device-local "already done" flag is not enough (1.19.1 "joined the clan" bug).
5. **Item-level merge sync.** `SYNC_LISTS` (L≈18362) = reminders, revisions, exams, parked, presets, subTemplates, loadouts,
   todos, goalLog, chips, plants, gbuys, roomSets, decks, cards, plan, eggs; `LIST_MERGE` (L≈18364: `mergePlant` L≈13391,
   `mergeEgg`); `stampLists` (L≈18371: stamps `u`, tombstones `S.tomb['<list>:<id>']`), `mergeList` (L≈18389), `mergeSyncFrom`
   (L≈18405), `profileFromState` (L≈5785), `pushProfile` (L≈5846), `applyProfile` (L≈5931), `profileEcho` (L≈5973), import
   `mergeData` (L≈6262). Rules learned: never sync a whole array (chips bug); merges must be canonical (fixed key order, no
   empty maps in merge writes — the 1.16 upload loop); a final state wins over a newer stamp (ripened plant, earliest sale);
   the echo of this device's own upload must not run `renderAll` (L≈18578); `pushProfile` keeps the edit pending until the
   cloud copy has been read; lists that grow without bound are folded (plants past 500 harvests, eggs past 400) because the
   profile is one document.
6. **True Minimalist hides game extras** ("gamification off"). Hidden: garden, pets, quests, shop cosmetics, rank UI (badges,
   header chip, ladder, Timer line), streak-next line, garden glance, Posts (and posting pauses). Kept: Friends, Study
   sessions, Clan, Leaderboard (plain rows). Suites check "hidden, and nothing left behind".
7. **Posts and Study sessions are their own sections.** Sidebar Social = Friends · Posts · Study sessions · Clan · Leaderboard;
   Friends itself = Friends · Challenges. Each section is also in the phone More menu, the tablet slide-in, the command
   palette, the shortcut sheet (J sessions, O posts), the guided tour (11 steps) and has a nav dot. Old saved views are
   redirected on read. The menu has 12 sections. Why: the owner asked for it in 1.19.1 round 2; Posts followed.
8. **Balanced card layout (`.mason`).** CSS L≈203–208; `MASON_MQ` (min-width 860 px), `MASON_SLACK` 160, `MASON_ROW` 4
   (L≈5249), `fitMason` (L≈5280), `fitAllMasons` (L≈5308). One list in reading order; on wide screens a two-column grid with
   4 px rows where JS places every card (first card of each column on row 1); one centred column ≤ 760 px when the columns
   would end > 160 px apart; one full-width column under 860 px. Timer never falls back to one column; the Clan page keeps
   its own two fixed columns (owner's request); Bag keeps its sticky left panel; page content capped at 1,040 px. Why JS and
   not CSS columns: engines balance multi-column differently (the owner saw a gap Chromium did not show). Guarded by `v1191d`.
9. **Switchers.** `syncSegs` (L≈5172): a bar never wraps, it scrolls sideways with an edge fade; the pill takes the selected
   button's own box; re-measured by `ResizeObserver` and on theme / glass / minimal / motion / font changes; the phone bottom
   bar keeps its own pill. One writer per switcher state (`setBoardPeriod` L≈10095); saved state is validated on read.
10. **Rank cap 14 h a day.** `RANK_T` (L≈12226), `seasonKeyNow` (L≈12236), `seasonTotals` (L≈12242), `openRankLadder` (L≈12309).
    Season = UTC month because rules only see the server clock; 840 min per UTC day; rules bound `seasonMin ≤ 840 × UTC day`
    and growth ≤ elapsed minutes + 240. Stats still show the real hours. The Study Pass Focus track reuses the cap.
    The placement floor lifts the badge only; boards sort by hours.
11. **Study Pass pacing.** `passWindow` (L≈11906), `passReward` (L≈11918), `passState` (L≈11946), `passClaim` (L≈12003),
    `passCoinsAt` (L≈12016), `passName` (L≈8022). One pass per questline event (`EVENTS` L≈7818). Pass XP target
    146 × (days − 2.5), rounded to 30, clamped 900–2,700, 30 tiers; 180 XP a day (240 in the last 7 days while behind);
    catch-up bank = 75% of unused cap on days played, spent only when behind; Focus track last step 1.5 h × (days − 2.5), max
    26 h; the window starts on the later of the event start and the account's first day on 1.20; reached-but-unclaimed tiers are
    added at the end with one notice (the owner's reasoning: "missed" would be a penalty and a non-study reason to open the app).
12. **Overtime.** `otMs` (L≈6525), `otEnter` (L≈6532), `otStop` (L≈6543), `otAsk` (L≈6557), `otTick` (L≈6567),
    `otTipAfterBlock` (L≈6575), `finishPhase` (L≈6590), `logSession(focusedMs, end, early, otMin)` (L≈6647). On by default; one
    block logged = planned + overtime (`ot` kept), whole block capped at 240 min (the preset limit and the rules' 4-hour
    session, so no write is refused); "Were you still focusing?" after 10 idle minutes, only while the tab is visible; off in
    a Synced timer and in the tutorial's 1-minute block; on in Focus together; presence status `overtime`; buttons
    Pause/Resume · Stop · Break and a "Turn off overtime" link. Finish early (1.17): `finishPhase('early')`, minimum 5 min,
    `early: 1` + `planned`; every system reads `duration`.
13. **Posts audience model.** `postsStart` (L≈9722), `postsDropAudience` (L≈9745), `postsCleanup` (L≈9753), `loadPosts`
    (L≈9762), `postText` (L≈9779), `postsPeek` (L≈9821), `renderPosts` (L≈9881), `postReact` (L≈9882), `postsFromNews` (L≈9904).
    Automatic posts only, 12 fixed types, no text anyone writes (the card text is built on the reader's device). Audience
    `aud` = author + the author's friends at posting time (1–151) minus blocked; it only ever shrinks (block / unfriend).
    3 at once, 10 a day, no backfill (`S.settings.postsFrom`, at most 2 days old), 30-day expiry with a once-a-day cleanup,
    reactions 🔥 👏 💪 ⭐ one per person and not on your own post. Follows "Share activity" until the user sets it. The Clan
    filter shows clanmates who are also friends; widening the audience is a privacy change the owner must approve.
14. **Existing streak freezes.** `ITEMS` (L≈7634) entry `freeze` (L≈7730): "Streak Freeze", **250 coins**, "used automatically;
    hold up to 2". Used days are `S.game.freezesUsed['YYYY-MM-DD'] = ts` (union-merged L≈5918, normalised L≈7377), consumed in
    `computeStreaks` (L≈6826) and counted in `computeGame` (L≈8319–8328). Streak days are judged by `goalFor(day)` (L≈6805) from
    `S.goalLog`; a day whose goal bonus was claimed counts as met. Milestones (`STREAK_BONUS` L≈7339, `STREAK_REWARDS` L≈7341,
    `streakNext` L≈12435, `showStreakMilestones` L≈12439) use the longest streak and pay once. The published streak carries
    `streakDay` so readers drop a lapsed one; rules: `bestStreak ≤ days since joined + 2`, best grows ≤ elapsed days + 2 per write,
    the current streak may jump up to the best.
15. **One live engine, two homes** (1.18). `liveDoc` (L≈20932) resolves to `clans/{cid}/live/{lid}` or `studySessions/{lid}`;
    `liveBeat` (L≈21067, 60 s), `liveMaybeCount` (L≈21213), `sessLoad` (L≈21303: three small queries, 90 s cache, lobby
    re-checked every 5 min for the dot), `sessCreate` (L≈21332), `sessJoin` (L≈21357), `sessAct` (L≈22208) vs `clanAct`
    (L≈22221). "Together" = `s.mates` from overlapping presence (`groupStats` L≈7506). Sessions close after 6 h or when empty.
    Study sessions have no RSVP field (it would need a rules change), so planned tables get a device-local "Remind me".
16. **One table of preset limits.** `PRESET_LIMITS` (L≈18979): focus 1–240, short break 1–120, long break 1–180, rounds 1–12;
    it drives the preset editor inputs, the pre-write check and the rules' `validPattern`.
17. **Published numbers sit in small documents with bounded growth.** `publishPublic` (L≈9607), `myPeriodStats` (L≈9532),
    `clampStats` (L≈9575), `getPublic` (L≈10041), `loadLeaderboard` (L≈10151). `rankStats` is its own document because
    `publicStats` hit the rules engine's 1,000-expression budget. Rules bound growth by elapsed real time + 240 min; the
    client clamps to the same bound and falls back (drops fields older rules refuse) without looping.
18. **One look for a person everywhere** (1.14.1): `personLook` (L≈22559), `lookName` (L≈22585) draw name colour, clan tag,
    rank badge and flame. The 1.16 podium dropped the clan tag by using its own renderer.
19. **Pomeo** (1.18 redesign): `pomeoSVG({state, hat, acc, skin, id, size, evo})` (L≈10750), viewBox `-4 -8 48 48`, classes
    `m-body`, `e-open / e-focus / e-sleep / e-happy / e-wink`, `m-mouth`, `m-cheek`; hats and accessories sit on a 40-grid;
    stages `EVO` (L≈12136). The structure was kept so ~30 call sites, outfits and animations still work.
20. **Which clock.** UTC for anything rules or all users must agree on (seed-shop slots, rare seed day, season, group-coin day
    caps). Local date for personal things (streak, daily reward, garden tasks, weekend festival). Weeks are keyed by Monday.
21. **Garden invariants.** `computeGarden` (L≈13235), `gardenAfterSession` (L≈13415), `shareOf` (L≈13440), `pourWater`
    (L≈13442), `boostBlocksAt` (L≈13465), `gardenReplay` (L≈13482), `petMutOf` (L≈13543), `eggAfterSession` (L≈13619),
    `cropStars` (L≈13827), `gardenMigrate` (L≈13369). No recursion between `computeGame` and `computeGarden`; derived caches
    reset on every save; every block reaches every plant once (0-marks make the replay idempotent).
22. **Recently used chips**: `chipsFromLegacy` (L≈6716), `touchChip` (L≈6723), `loadChip` (L≈6747), `clearRecents` (L≈6759),
    `renderChips` (L≈6917). 6 recents + up to 12 favourites; legacy `recent` / `pinned` arrays are still written for pre-1.18 clients.
23. **Leaderboard**: top-50 query + one count for your rank, 5-minute cache, friends boards from cached friend documents,
    rank arrows from `localStorage` `pomodorolist-lbprev:<uid>` (device only). Kinds Focus (Daily · Weekly · Lifetime) · Garden ·
    Ranks · Streaks. `monthKey` / `monthMin` are still published for older apps.
24. **Copy / share**: every Copy button goes through `copyText(text, {btn, field, what})` (L≈22733).

## Known issues, flaky tests and their causes
**Where the tests live.** Until 2026-11-15 no suite was ever in git. The runnable harness is
`/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/fb/` (`site/`, `site2/`, `node_modules/`,
its own `firestore.rules` copy — currently identical to the repo's — and old snapshots `rules-v119.rules`, `rules-113.rules`).
`/home/user/claude/tests/` (untracked, created 2026-11-15 10:21) is a copy of its suites, helpers and shell scripts (178
entries; the `dbg*.mjs` scratch files were left out) without `site/`, `node_modules/` or the rules file. Scripts hard-code the scratchpad path. Pieces: `runall.sh` (100 suites, empties the emulator first, 1,500 s
timeout each, output `out-<suite>.txt`), `tools/site.sh` (builds the test page: config → project `demo-pomo`, Firebase SDK
from a local folder), `ensure.sh` (restarts the site on :8000 and the emulators auth :9099 / firestore :8080), `site2.sh`
(second site, :8001), `baseline.sh <commit> <suites…>` (run suites against an older build), `ot-classic.mjs` (preload that
keeps Overtime off for pre-1.20 suites), `harness.js` (read / write counter), `perf116.mjs`, `fsio120.mjs`, `audit117.mjs`.
119 scripts hard-code `localhost:8000`; 4 are `SITE`-aware. Chromium only (`/opt/pw-browsers/chromium`).

**Flaky or date-dependent suites**
| Suite | Symptom | Cause | Status |
|---|---|---|---|
| `prog`, `v8`, `social` | a click misses | a level-up or egg-hatch pop-up opens between "close dialogs" and the click | test closes it and retries; returns with any new pop-up |
| `v114e` | demo "never writes" fails once | a late `localStorage` key diff under full-run load | passes alone |
| `v115a`, `v115b` | two-device garden checks | sync timing | pass on rerun |
| `v115d` | flashcard offer missing | run crossed 23:00–04:00, Pomeo's night nudge took the bubble | suite marks the night as nudged |
| `v1131a` | 2 checks on a "Rank up" toast | the account crosses a rank division during the test block in November | **open**, same on 1.19.1 |
| `v1131b` | boss HP | follows this week's boss | date-dependent by design |
| `v119a` | rank-up celebration late | held achievement toasts go first, 3.2 s apart | waits 60 s |
| `v118c` | first setup line, takeover read | friend list read before the listener delivered | waits added |
| `v116c` | Giant reveal not shown | held while the garden tour has the screen; opens 0.9 s after harvest | suite closes the tour |
| `v1141a` | leaderboard copy | fixed 4 s wait | waits for the second publish |
| `sec143` | later suites trip fallbacks | it used to leave the 1.14.3 rules in the emulator | restores the repo rules |
| `v1143a`, `nav`, `v12`, `v116f`, `v113b`, `v115c` | counts differ | they count menu sections (12), tour steps (11), Focus periods (3), card facts, reward items | update on every nav / tour / item change |

**Harness limits**
- The emulator does not enforce composite indexes and does not type-check rules (the console refused a List / Set ternary in
  `validStats`, fixed in `102b46b`). A request over the 1,000-expression budget left the emulator refusing everything until restarted.
- Headless Chromium throttles `requestAnimationFrame` in an unfocused 1280 px context: desktop frame lines read ~10 fps on
  every build. Throttled-phone numbers vary ±15% run to run; heap readings depend on GC timing.

**Open product issues (accepted, documented in reports)**
- New-partner coins: a block synced late from an offline device can move a first meeting into an already-full day and remove
  10 coins after the fact (1.18).
- Apps before 1.18 cannot join a challenge (they do not write `challengeJoins`).
- Bonus Clan Points start on a member's second day.
- A 1.16 and a 1.17+ device on one account across the upgrade: a crop paid at harvest on the old device shows unsold on the
  new one; a purchase made with that produce can be refunded.
- Rules cannot verify minutes, `joined` or streaks without server code; a lapsed streak can show one extra day across time
  zones; `growsTotal` resets when a field is dropped and re-added.
- Podium pops in again on manual refresh; the ripening ring's glow is a per-frame `drop-shadow` on low-end phones; timer digits
  change on the 250 ms tick.
- The `publicStats` index `global · monthKey · monthMin` is used only by older apps; leave it.
- Light studiers finish about two-thirds of the Focus track in a shortened event (deliberate; the report offers 1 h / day sizing).
- Egg fold: one known limit for a device closed 120+ days (1.16 notes).

**Native prompts still in the code** (`index.html` at `77f8456`): `confirm(` × 8 — logout with pending writes L≈6195,
`clearRecents` L≈6762, `buyItem` L≈8532, block L≈9966, friend request L≈9996, remove friend L≈18829, import merge L≈18919,
erase L≈18929; `alert(` × 1 — import error L≈18923. Whole-file occurrence counts (markup + JS templates): `<select` 19,
`type="date"` 7, `type="time"` 5, `type="number"` 12, `type="color"` 4, `type="range"` 12, `type="checkbox"` 56.

## Firestore cost numbers measured so far
Counts are documents read / written through the SDK on the emulator, same scripted scenario on both builds of each pair.
There is **no measured table for 1.18 or 1.19** in the reports.

**A new user's first day (reads / writes)**
| step | 1.16 (`fsio117`) | 1.17 (`fsio117`) | 1.19.1 (`fsio120`) | 1.20 (`fsio120`) |
|---|---:|---:|---:|---:|
| sign-up + first load + tutorial | 12 / 8 | 12 / 8 | 14 / 9 | 15 / 9 |
| 3 focus blocks | 12 / 21 | 12 / 21 | 15 / 24 | 17 / 22 |
| a look at every tab | 0 / 0 | 2 / 1 | 2 / 1 | 2 / 1 |
| garden planting, a deck + 2 cards + 1 grade, a 2-subject plan | 4 / 2 | 4 / 2 | not in scenario | not in scenario |
| 1.16 step: looks, pets dialog, a look bought, four garden boards | 8 / 6 | 8 / 6 | — | — |
| 1.17 step: Harvests, a sale, a task claim, tour, boost shop, reward dialog | — | 2 / 2 | — | — |
| 1.20 step: Study Pass + Claim all, Posts | — | — | — | 4 / 1 |
| reload (cache-first) | 8 / 4 | 10 / 5 | 10 / 5 | 11 / 5 |
| one minute idle | 0 / 0 | 0 / 0 | 3 / 0 | 3 / 0 |
| **total** | **44 / 41** | **50 / 45** | **44 / 39** | **52 / 38** |

Earlier pair (`fsio116`): 1.15 = 36 / 35; 1.16 = 108 / 41, where the 1.16-only step cost 72 / 6 (each global board = a top-50
query + one count). The 3 idle reads that appear by 1.19.1 are not explained in the reports (my guess: the sessions-lobby dot
check; verify before quoting).

**A user with 50 friends who all posted this week (1.20)**
| action | reads | writes |
|---|---:|---:|
| the 50 friendships arrive (listener, same as 1.19.1) | 55 | 1 |
| open Friends (same as 1.19.1) | 100 | 0 |
| open Posts (50 posts) | 51 | 0 |
| Posts again within 3 minutes | 0 | 0 |
| Refresh more than 20 s after the last load | 50 | 0 |
| Refresh again at once | 0 | 0 |

**Per-feature costs stated in the reports**
- A focus block: about 4–6 reads and 7–8 writes (from the "3 focus blocks" rows). Top call sites in the 1.17 run: `listen users/{uid}`,
  `getDocs challenges`, `getDoc publicStats`, `setDoc publicProfiles`, `setDoc publicStats`, `setDoc activity`, `setDoc presence`,
  `getDoc clanOf`, `setDoc users/{uid}`, listeners on `friendships` and `inbox`.
- A leaderboard board: one query of up to 50 documents + one count, cached 5 minutes; friends boards use cached friend documents.
- Friends list looks: 100 reads for 50 friends (2 per friend; presumably profile + rankStats), 15-minute cache, shared with Posts.
- Posts: feed = one query ≤ 50, cached 3 min, manual refresh at most every 20 s; dot check = 5 reads at sign-in and every 15 min
  while open and visible; cleanup ≤ 20 reads once a day per device; a post = 1 write; a reaction = 1 write; no realtime listener.
- Study Pass claims: 0 extra writes (they ride the profile save).
- Study sessions: three small lobby queries, 90 s cache, re-checked every 5 min; a seated person writes presence once a minute.
- Nothing re-uploads in a loop: `fsio117` saw the `users/{uid}` listener deliver 5–6 documents over the whole scenario; `v116b`
  asserts ten idle seconds after a hatch write nothing on either device.

**Derived, not measured** (my arithmetic from the tables): at 38 writes for a first day, 20,000 writes ≈ 520 such user-days;
at ~7.5 writes per focus block ≈ 2,700 blocks a day across all users. Writes, not reads, are the tighter limit.

**Performance numbers on record** (guest with 2,772 blocks over 2 years, 16 plants, 1,200 cards; medians of 4; `perf116.mjs`):
desktop load 1.15 1,631 ms → 1.16 1,745; 1.16 1,661 → 1.17 1,807. Phone 390 px CPU ×4 load 1.15 4,211 → 1.16 4,628;
1.16 4,138 → 1.17 3,633. 1.17 tab switches desktop: stats 90, quests 67, reminders 29, friends 31, clan 21, profile 87,
board 31, shop 39, timer 72, garden 71, room 47 ms; phone ×4: stats 343, quests 279, reminders 168, friends 118, clan 123,
profile 394, board 121, shop 138, timer 276, garden 266, room 146 ms. Phone frame rate with the timer running 41–60 fps.
Heap 10–19 MB. **Nothing was measured for 1.18–1.20**, so the 2.0 "before" must be taken fresh on `77f8456`.

## Report and checklist format the owner is used to
**Report** — `notes/vX-report.md`, copied to `deploy/upload-vX/REPORT.md` (2.0: `notes/v2.0-report.md`).
- Title: `# Pomodorolist vX — report (feature, feature, …)`; one line on which commits it sits on.
- First block: **Firebase console steps, in this order** (rules → indexes → upload), with what changed and which app versions stay safe.
- A config paragraph: the block is unchanged, real values, the `authDomain`.
- One numbered section per feature or bug. Bugs use bold lead-ins **What you saw** / **The cause** / **The fix** / **Test**, quote
  the exact on-screen text, name the function fixed, and say what else was checked for the same pattern.
- Numbers go in tables (thresholds, pacing by light / normal / heavy user, costs). Decisions end with an offer ("say if you want it").
- Closing sections: full regression ("N suites, all passing. M passed on the first full run" + one bullet per first-run
  failure), the multi-day simulation (setup, today, results), layout audit (what, where, result, fixed on the way), Firestore
  usage tables, "Tests changed on purpose (the app changed, not a regression)", "Tests made sturdier, and why",
  "Known and not caused by X". 1.18 also had "What's new (for users)", "Cut, and why", "Known issues".
- 1.18 and 1.19 pasted the exact `firestore.rules` and `firestore.indexes.json` at the end; 1.19.1 and 1.20 describe the rules
  in prose and ship the files in the deploy folder. The 2.0 brief asks for the exact files again, plus "what was cut and why",
  a short friendly changelog, every file to upload, and a "Ready for PWA next" note.
- Older style (1.16 / 1.17 release notes): commit list, per-phase "What was added / Decisions / Tests", "Bugs found and fixed"
  grouped by who found them, an independent-review table (`# | finding (verdict) | what was done`), raw perf and Firestore
  output, a per-suite full-run table.
- Voice: British spelling, short plain sentences, bullets, no code except rules and ids.

**Checklist** — `deploy/upload-vX/CHECKLIST.md`.
1. Title `# Deploy vX (GitHub website upload)`; the Firebase project; the order and the reason for it.
2. **What changed for Firebase**: which rule block, which indexes, and that older apps keep working.
3. `## 1. Publish the rules` — console path, select all, paste the whole file, Publish, check for warnings.
4. `## 2. Create the indexes` — table (Collection ID, each field with Arrays / Ascending / Descending, scope Collection), wait
   for **Enabled**, what the app shows until then, the optional CLI line.
5. `## 3. Upload` — repo URL, Add file → Upload files, the files, commit message `vX`, "Commit directly to the main branch",
   Pages republishes in 1–2 minutes, Actions turns green; the config note (search `EDIT HERE`).
6. `## 4. Smoke test (about 3 minutes)` — hard refresh, Settings › About shows the version, then numbered checks per feature
   with exact expected text, and a last step "the console shows no red errors".
7. **If something fails**: re-upload the previous `index.html`; the new rules and indexes can stay; "tell me the step and what you saw".

**Deploy folder**: `index.html`, `firestore.rules`, `firestore.indexes.json`, `CHECKLIST.md`, `REPORT.md` and a zip of the same.
**Notes files**: `notes/vX-plan.md` = the brief word for word; `notes/vX-notes.md` = plan, code map, per-phase "built" notes, decisions.

## Lessons
**Bugs that were found late, and why**
| Bug | Found by | Why it slipped | What to carry forward |
|---|---|---|---|
| Profile re-uploaded every second after a hatch; a pet let out on the other device vanished (1.16) | full run | merge output was not canonical, so the cloud always looked "ahead"; empty maps in a merge write replaced server maps | every new synced type gets an "idle 10 s → 0 writes on both devices" check |
| Denied-write probe re-armed every 300 ms against older rules (1.16) | reviewer | retry reacted to the original denial | bound every retry after `permission-denied` |
| Every save redrew the whole app a second later (1.17) | reviewer sweep | the listener treated its own echo as news | no full render on an echo; rebuild DOM only when the value changes — `innerHTML` rewrites restart CSS animations |
| `.gd-fly` defined twice; `.ripple` borrowed; item id `frame_clan` reused; two dialogs with one id (1.15–1.18) | reviewer / tests | one global namespace for CSS classes, DOM ids and item ids in a 23,000-line file | grep before naming; prefix new component classes |
| Friends switcher vanished after a view change (1.17 → fixed 1.18) | the owner | `classList.toggle(c, undefined)` flips | always pass a boolean |
| "Focus time" opened Ranks and stayed so after reload (1.19) | the owner | two writers for one switcher value; the bad value was persisted | one writer; validate saved UI state on read — 2.0 renames views, so 1.20 `S.ui` values need mapping |
| Clan creation refused in production from 1 Nov 2026 | found while testing 1.18 | a date-dependent rules branch crossed the 1,000-expression budget | test rules at future dates; bind with `let`; check only changed keys; give new numbers their own small document |
| Console refused a rules publish (List vs Set ternary) (1.19) | the owner | the emulator does not type-check | no mixed-type ternaries; the emulator is not the console |
| Hosting with a 240-min preset refused, with a clan error message (1.19) | the owner | rules range copied from clans, editor allowed more; session buttons used `clanAct` | one limits table for UI, pre-write check and rules; per-domain error helpers |
| Right card column started lower (1.19.1) | the owner | CSS multi-column balancing differs by engine; tests run only in Chromium | no engine-dependent layout without a JS or feature-detected fallback |
| Switcher pill became a blob on wrapped bars | the owner | pill sized to the bar, measured only on class / resize | measure the selected element; `ResizeObserver`; test bigger fonts |
| Profile grid stretched past the screen; Study Pass page scrolled 3,500 px sideways | layout audit | grid columns grow to their widest content | `minmax(0, 1fr)` / `min-width: 0`; assert no sideways scroll at every width |
| A reveal reusing a closing dialog vanished (1.19) | full run | "open" was true during the 170 ms close animation | opening cancels a pending close; applies to any new dialog / sheet |
| Leaving right after joining closed the whole session (1.18) | suite | "presence not loaded yet" read as "nobody here" | not-loaded is not empty |
| Chips wiped by the first snapshot; a block ended before the garden was ready was lost; Timer garden card hidden on a new account | users / edge suite | the cache-first window before the cloud copy is read | anything that writes or renders at start must handle "cloud not loaded" |
| Demo attempted writes (a firing sample reminder, profile push, public profile) (1.18) | last runs | timers and auto-publish paths did not check the preview | every timer / auto-save path checks `isPreview()`; device-local memory in the demo lasts for the visit only |
| "joined the clan — just now" from every new device | the owner | the only guard was a device-local note | once-only events need a fixed server id |
| Posts on for people who had opted out; cleanup ran on every reload; no hook for questline completion (1.20) | testing | new defaults ignored an existing privacy setting; no stored day key | new sharing defaults inherit existing privacy choices; daily jobs store their day |
| Toasts broke over the first draft of the host sheet (1.19.1; the report gives no detail) | suite `v1191e` | `toastHost()` relies on moving `#toast` into the top-most `dialog[open]` | anything floating (menu, select list, date popover, tooltip) must render inside the open modal dialog, or it sits under it |
| Garden tour never appeared after a block (1.17) | testing | a persistent tip kept `guardBusy()` true | persistent UI must not count as "busy" |

**What a big redesign must watch for**
- **The suites drive the app by id and by globals.** 473 distinct `#id` selectors appear in the test scripts (`#authView` 180×,
  `#appView` 154×, `#authSubmit` 85×, `#authUser` 81×, `#authPass` 79×, `#guestBtn` 61×, `#tutDlg` 48×, `#previewBtn` 46×,
  `#boardBody` 46×, `#bagList` 43×, `#gdDlg` 42×); 136 scripts read the global `S`; 64 use `.fill()`; 16 set `.value` inside
  `evaluate`; 8 call `selectOption()` 17 times (`#setMotion`, `#csdName`, `#uisPack`, `#setGlass`, `#remRepeat`, `#setPomeoTalk`,
  `#remPreset`, `#csdPattern`, `#ccDesc`); 39 register a Playwright `dialog` handler and 8 stub `window.confirm`.
- Replacing a synchronous `confirm()` with a promise changes control flow at 8 call sites and in those 47 scripts.
- Suites count nav sections, tour steps and items; a Calendar section changes at least `v1143a`, `nav` and `v12`.
- Shortcut keys J and O are taken; every section must also be added to the More menu, the tablet slide-in, the palette, the
  shortcut sheet and the tour.
- Every theme × light / dark × Glossed off / lite / full × True Minimalist × Animations Full / Reduced / Off is a real matrix: the
  1.19.1 rank chip was contrast-checked in all 21 themes (≥ 4.5:1) and swept at 23 widths from 320 to 1280 px.
- Tap targets under 44 px were found in almost every release's audit (logo 38 px in Minimalist at 360 px, `#egOk` 42–43 px,
  deck Review button, raid Contributions toggle).
- Each feature release added 7–10% to desktop load time; 2.0 must not regress, and the file is already 1.9 MB.
- Tests and demo data must hold on any date: November rank crossing, the 23:00 nudge, this week's boss, the rare seed's price
  against the demo balance all broke something once.
- The emulator hides two classes of production failure: missing indexes and rules type errors. The checklist order and the
  "getting ready" message are the only protection.
