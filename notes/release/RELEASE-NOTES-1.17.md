# Pomodorolist 1.17 — release notes

Branch `focus-app`, commits since 1.16 (`4576182`):

```
e4b726e 1.17 Phase 6: scene life on its own compositor layers; measurement notes
cf7a5dd 1.17 Phase 6: fixes from the independent review — a sale is final across devices, the produce flyer gets its own class, no boost as a gift, import keeps the goal history and early marks, compost is plant XP only, egg and late-plant replay shares, boost icon and copy, harvests never before the basket marker; two tap-target fixes
49f7094 1.17 Phase 6 (in progress): version 1.17 and What's new, the Timer garden card refreshes when the garden is created, edge-case suite fixes
cd0d124 1.17 Phase 5: daily rewards keep counting past Day 7 — gift every 7th day, capped growth for long runs, deterministic gift pick
0a89f7b 1.17 Phase 4: pets round 2 — three slots by garden level, stronger buffs with raised caps, every egg drinks the whole block, deterministic pet mutations
c01fae2 1.17 Phase 3 (part 3): garden tour, daily garden tasks, compost, trophy shelf, plant info, scene life and scenes by level
fa62010 1.17 Phase 3 (part 2): plant XP boosts bought with coins
f3c389f 1.17 Phase 3 (part 1): plant XP shares and needs, the Harvests inventory with stars, selling and the weekend festival
8279e23 1.17 Phase 1.3: animation jitter fixes
0ba19bb 1.17 Phase 2: logo button, Finish early, garden glance on the Timer tab
311c163 1.17 Phase 1: watering replay and fair shares, goal history keeps the streak, one challenge reward per type per week, style-aware starting banners
89b6ccd Notes: 1.17 plan
276cdbb Notes: the v1.17 brief, word for word
```

Everything is in `index.html` (real Firebase config kept, `authDomain` = `pomodorolist-bbaa6.firebaseapp.com`).
**`firestore.rules` and `firestore.indexes.json` are unchanged** — no rule change, no new index: every new piece of data lives under `users/{uid}` and rides the existing cache-first item-level merge.

## What 1.17 adds (short)
1. **Bug fixes from users** — blocks always water plants (replay on every device), the daily goal change keeps the streak (goal history), animation jitter fixes, one challenge reward per preset per week, starting banners that suit every theme.
2. **Header logo** (Pomeo tomato + name) that always goes home; **Finish early** logs the minutes done (5+); a **garden glance card** on the Timer.
3. **Garden round 2** — plant XP with fair shares and lower needs, coin-bought ×1.5 / ×2 boosts, the **Harvests** basket with 1–5★ rarity, single / bulk selling, favourites and the weekend festival, a Pomeo garden tour, daily garden tasks, compost, a trophy shelf, plant info cards, scene life and scenes by level, produce flying to the counter.
4. **Pets round 2** — three slots (levels 1 / 3 / 6), stronger capped buffs, every egg drinks every block in full, deterministic mutations (Golden, Shiny, Rainbow, Shadow, Frost, Ember) with ×1.25 buffs.
5. **Daily rewards past Day 7** — the run keeps counting, every 7th day is the gift day, capped growth for long runs, the gift picked from the date.

## Phase 1 — bug fixes
### 1. Focus not watering plants — root causes found (each reproduced on the 1.16 build, suite `v117a`)
1. **The "water first" plant swallowed the whole block.** `gardenAfterSession` poured the block into the focused plant
   first and only what was left went to the others — a plant with room for the whole block left the marigold with
   nothing, which is exactly "it once didn't contribute" (and again on the other account once a plant was marked
   there). Now every growing plant gets a share (`pourWater`: the focused plant counts double, nobody is starved).
2. **A block that ended before the garden was ready on this device was lost for good.** With no migration record in
   the local cache (a device that had not synced yet, offline) `gardenAfterSession` returned early and nothing ever
   replayed the block. A second migration record created on such a device also used to win ties by its newer stamp.
3. **A plant planted on another device drank nothing from a block logged here while it had not synced yet** (offline
   phone, plant made on the laptop) — the block only knew the plants present at the time.
4. Blocks with pauses and blocks across midnight were fine (duration is what counts) — covered by regression tests.
Fix: `gardenReplay()` — every block of the last 7 days reaches every growing plant planted before it ended and the
egg laid before it, unless that plant/egg already carries the block's mark. Plants now record a 0 for blocks that
gave them nothing, so a replay never waters twice (`v117a` T7 checks a replay changes nothing and triggers no
upload). The replay runs after every reconcile (first load, each block, the sessions listener, midnight) and after a
cloud merge that brings plants or sessions. A late plant gets the share it would have had (`raw × late / (served +
late)`), deterministic from stored data; two devices replaying converge through the plant merge. Summary records
(migration) that tie now keep the older one.
### 2. Changing the daily goal reset the streak
`computeStreaks` judged every past day against the *current* goal. New: `S.goalLog` (synced list, exported) records
each change (`d` = day, `g` = new goal, `p` = the goal before); `goalFor(day)` gives the goal in effect that day
(before the first recorded change: the goal that change replaced; no history: today's goal). A day whose goal bonus
was already claimed counts as met whatever the goal is now. Today is judged by the current goal. The same rule feeds
the goal bonus, Streak Freezes, the friends' comparison, weekly challenges ("goal days") and questline goal days.
### 3. Animation jitter — audit
Measured (`anim117`): no running animation restarts by itself on the Timer, Stats, Garden and Profile tabs (sampled
`document.getAnimations()` start times 1.5 s apart), no full re-render while idle (`renderAll` 0/s), at most one
leaving digit per slot, the ring's CSS transition is off while it is drawn per frame. Frame gaps in headless
Chromium are an artefact (rAF throttled to 15–20 fps on every page), so the real frame rate is measured by the
Phase 6 perf script. Code sweep findings and fixes: see below.
### 4. Challenge coins
`challengeRewards()`: from the week of 2 Nov 2026 (the 1.17 release week) a challenge type pays at most once per
week — the earliest completion; a second copy joined through another friend is marked done but pays nothing (the
toast says so). Earlier weeks keep every claim, so nothing already bought is invalidated. No rule change: the
challenge documents are untouched; only the coin derivation (replayed from claims) changed.
### 5. Scholar and the starting banners
"Scholar" is the card style `card_scholar` (parchment, ink, red and gold). The free banners are now tinted toward
the equipped card style's palette (`bannerTint`: the light colour half-way to the style's tile, the dark colour
toward its second accent; Minimal keeps them plain; light and dark modes separately), and three starting banners
were added: Parchment, Slate and Moss. The chooser previews the tinted versions.
### Also fixed on the way
- The demo's "rare seed already bought today" sample purchase was invalid on days when the rare seed of the day
  cost more than the demo's balance at that moment (e.g. Lotus, 90) — the demo's starting produce covers any seed now.

## Phase 2 — logo, Finish early, garden glance
- **Logo**: a Pomeo-style tomato (inline SVG) with the wordmark, as a button in the header (desktop and phones) and
  at the top of the tablet slide-in menu; it closes the menu, goes to the Timer and scrolls to the top. With the
  sidebar collapsed to icons the header shows the logo alone. The festive brand decoration still attaches to it.
- **Finish early**: during a focus block the Skip button reads "Finish early" (`finishPhase('early')`). From 5
  minutes focused the block is logged as a shortened session (`early: 1`, `planned` kept), the toast says
  "Finished early · 18m of 25m", and the block moves on to the break like a completed one. Under 5 minutes nothing
  is logged and the block is reset (one toast). Reset stays the abandon path. Every system reads the session's
  `duration`, so the minutes count proportionally for XP, coins, today's minutes and the streak, the garden and the
  egg, boss damage, clan XP and questlines (`v117d` checks the first six). The history shows a small "early" mark
  with "18m of 25m". Clan live sessions keep their own skip.
- **Garden glance**: a card under the Today card on the Timer tab (chosen over Stats: it is where people start a
  block and the brief's "I miss seeing my garden" is about the home screen). It shows up to eight growing plants
  with a progress bar each, sorted by progress, and one line: what is ready to harvest, else the plant closest to
  harvest and the minutes of focus to go, else a nudge to plant. Hidden in True Minimalist and before the garden
  exists; tapping or Enter opens the Garden tab; the demo shows its sample garden and writes nothing.

### 3 (continued). Animation jitter — findings from the code sweep (a separate reviewer agent) and fixes
1. **Every save came back as a full redraw.** The profile listener applied the echo of this device's own upload
   (`hasPendingWrites` false, local edit flag already cleared) and ran `renderAll`, which rewrote the level chip,
   the streak flame, the garden glance and the open tab about a second after each save — restarting their
   animations and resetting scrolled rows. Fix: `profileEcho()` recognises the upload coming back (same content,
   key order / empty maps / server time aside) and only refreshes the sync indicator (`anim117` checks no
   `renderAll` follows a save).
2. **The streak flare and number roll were cut off** by the renders that follow a completed block. The flame is now
   rebuilt only when the number changes, so the animation finishes.
3. **Tilt and magnetic buttons wobbled and thrashed layout**: reads and writes alternated per button and the box
   was measured with the element's own lean in it (feedback). Reads now come first, the hovered element is measured
   once, the lean is subtracted from the button's box, and the magnetic transition is short and linear.
4. **Boss hit / tremble never played below half health** (`.idle.angry` outranked `.hit` / `.almost`): fixed.
5. **Poking a garden visitor or pet snapped** (the poke replaced the flutter / idle bob with `!important`, and the
   pet's poke lost to the idle rule in Full and leaked a transform in Reduced): the poke now animates the art
   inside the button, Full only, so the flutter outside carries on.
6. **Clan live updates drew the clan screen twice** and restarted its pulse and bob: once now.
7. **The pond's ripple borrowed the timer's `.ripple` rule** (flew off in Reduced, invisible in Off): own class.
8. A leaving timer digit is removed on `animationend` (it used to go a few ms before its fade ended).
Left as is (noted): the leaderboard podium pops in again on a manual refresh; the ripening ring's glow is a
`drop-shadow` filter redrawn every frame on low-end phones (visible only with that cosmetic on); the digits change
on the 250 ms tick rather than the frame loop (≤ 250 ms late, not a jitter).

## Phase 3 — garden overhaul round 2
### 3.1 / 3.2 Plant XP and balance
- Growth is now **plant XP**: a focus minute gives up to one XP per plant. The plot shows an XP bar, the plot label,
  the plant dialog, the almanac and the Timer glance all say XP ("22 / 55 XP · ≈ 33m of focus to go").
- **Share formula** (`shareOf(n)`, `pourWater`): every growing plant gets `minutes × 1 / (1 + 0.18 × (n − 1))` where
  n is the number of plants still growing — 1 plant 100%, 2 → 85%, 3 → 74%, 4 → 65%, 6 → 53%, 8 → 44%, 16 → 27%;
  the "water first" plant ×1.5; XP a full plant cannot hold flows evenly to the others; a pet's water boost and a
  bought XP boost multiply the share. The egg still drinks the raw block.
- **Needs lowered** (about a quarter): tomato 90→70, sunflower 75→60, basil 60→50, marigold 70→55, strawberry 100→80,
  chilli 120→90, lavender 260→200, blueberry 300→230, rose 320→250, pumpkin 360→280, lotus 560→440, moonflower
  680→530, starfruit 800→620 (the 1.16 shop-only species scaled the same way). With 25-minute blocks: a common
  plant in 3 blocks alone, 4 with two growing, 5 with four, about 6 with eight; rare 8 blocks alone (13 with four);
  legendary 18 alone. Existing plants keep their XP (some may become ready at once).
### 3.4 / 3.5 Harvests inventory, stars, selling, the festival
- A harvested crop now waits in the **Harvests** tab (garden view `harvests`) with its art, mutation skins, weight,
  stars and value; **Sell** pays its value into produce (stored on the crop as `sv`, so every device agrees), ♥ keeps
  a favourite out of bulk sales, **Sell all common** sells 1–2★ unmutated crops, **Sell all except mutated &
  records** the rest but mutated / Giant / record-holding crops. The harvest toast, inbox line and plot float say
  "in your Harvests" instead of paying produce.
- **Stars** (`cropStars`, explained in the ⓘ popover): 1 star + points — weight against the species' usual weight
  (≥1.15× 1, ≥1.6× 2, ≥2.5× 3), mutation (Golden 1, Rainbow 2, Crystal 3), each focus-weather mutation 1 (at most 2),
  Giant 2; capped at 5. Sell value = produce value × [1, 1.15, 1.35, 1.6, 2] by stars.
- **Harvest festival**: every Saturday and Sunday (local date, the same rule everywhere) crops sell for 25% more;
  the tab shows the banner or the days to go.
- **Ledger / migration**: produce = earned − spent as before, but a crop earns when it is *sold* (or composted, 3.7).
  The migration record gets `hv` once per account (the moment the inventory arrived): harvests from before it are
  paid at harvest as they always were, so no balance changes on upgrade. Folded-away unsold crops pay their base
  value. The "Produce earned" board counts sold crops only (never decreasing). A 1.16 device on the same account
  still pays a crop at harvest; after the upgrade that crop shows unsold here (the user sells it) — if the other
  device had already spent that produce, that purchase is refunded by the ledger (rare, both devices in use across
  the upgrade; noted).
- Demo: the sample garden's inventory started nine days ago, so its newest harvests (a Giant Rainbow blueberry
  among them) sit in the basket; selling shows the demo prompt and writes nothing.
### 3.3 Plant XP boosts (coins only)
- Shop → "Plant XP boosts": **×1.5 for 8 focus blocks (60 coins)** and **×2 for 8 blocks (110 coins)**. Every logged
  block of a minute or more consumes one block of the strongest boost bought by then that still has blocks, so a
  ×1.5 bought during a ×2 waits its turn — nothing stacks past ×2 and nothing is lost. At most 24 blocks held (a
  purchase that would go past it is refused in the Shop and by the ledger). Derived from the coin ledger and the
  session log (`boostBlocksAt`), so every device agrees; ordinary coin purchases, so they sync and export like
  everything else. The garden head shows "⚡ Plant XP ×2 · 7 blocks left (+8 waiting)" (or a link to the Shop), the
  Shop card says which boost is active or waiting, and the plant estimate ("≈ 35m of focus to go") uses the boost.
  The demo has a ×2 running; buying shows the demo prompt.
### 3.6 Garden tour
Eight short Pomeo-guided steps in the Garden tab (your garden, planting, plant XP, harvesting, selling, the Seeds shop,
pets and eggs, mutations and boosts), each highlighting the matching part of the screen, as a bottom sheet with
Back / Next / Skip. It opens by itself the first time the Garden tab is opened (never during a focus block — it waits
in the focus queue — never over another dialog, never in the demo), is remembered in settings (`gardenTour`, so it
syncs and exports), and can be replayed from "Garden tour" in the garden. The old one-time garden tip is skipped
until the tour has run (it used to sit on screen and block the held tour).
### 3.7 More garden features (chosen: 8 of the list)
1. **Daily garden tasks** — three a day of different kinds, picked from the date (the same on every device): harvest
   1–2, plant 1–2, finish 2–3 focus blocks, focus for an hour, sell 1–2 crops; progress is read from today's
   garden and sessions; a claim is a ledger entry (`gt_<day>_<i>`, idempotent across devices) that pays 2–5 produce.
2. **Compost** — a crop in the basket can be composted instead of sold (pays nothing); the next seed planted starts at
   20% of its XP (`w.compost`). The heap is derived (composted crops − seeds grown on compost).
3. **Trophy shelf** (almanac) — the biggest harvest, the rarest crop (most stars) and the top species records.
4. **Plant info card** — the plant dialog shows the species' lore line, how many blocks fed it and the longest,
   the usual weight range, your record for the species, seeds in the bag and whether it grew on compost.
5. **Scene life** — fireflies at night, petals in spring, leaves in autumn (Full motion only); plants already sway.
6. **Scenes by garden level** — Meadow, Terrace (level 3), Lakeside (5), Hilltop (7), Moon garden (9), chosen in the
   garden (`settings.gardenBg`, synced); a locked choice falls back to Meadow.
7. **Produce flies to the counter** on every sale and task claim; the harvest float shows the basket and stars.
8. **Harvest festival** every weekend (3.5).
Skipped: garden tools (watering can / sprinkler / fertiliser) — the XP boosts and compost cover "small, capped
boosts" without a third currency sink; cross-pollination hybrids — would need new species art and odds, left for a
later release; zoom / pan — the scene already fits every width.

## Phase 4 — pets round 2
### 4.1 Three pet slots
`PET_SLOTS_AT = [1, 3, 6]`: one slot from the start, the second at garden level 3 (was 5), the third at level 6 (was 8).
Level 6 is 2,200 garden XP — a few weeks of ordinary gardening, not a grind. All pets out are drawn in the scene and
listed in the garden head ("2 of 3 out · now: …"); the pets dialog names the next slot's level.
### 4.2 Buffs (old → new) and caps
| Pet | old | new |
|---|---|---|
| Bunny (common) | plant XP +6% | +10% |
| Hedgehog (common) | wilts 1 day later | 1.5 days later |
| Frog (common) | bonus produce 6% | 10% |
| Turtle (common) | weight +5% | +8% |
| Bee (rare) | mutation +2% | +3% |
| Owl (rare) | mutation +2.5%, XP +3% | +3.5%, +5% |
| Deer (rare) | weight +8%, XP +4% | +12%, +6% |
| Fox (rare) | bonus produce 10% | 15% |
| Hummingbird (legendary) | XP +12%, mutation +2% | +18%, +3% |
| Golden snail (legendary) | weight +12%, bonus 8%, mutation +2% | +18%, +12%, +3% |

Pet levels still multiply (level 2 ×1.25, level 3 ×1.5 from duplicate hatches). Caps for everything out together,
old → new: plant XP +25% → +35%, mutation +8% → +10%, wilt +2 → +3 days, bonus produce 20% → 30%, weight +25% → +35%.
With three legendary / rare pets out the caps bind (e.g. hummingbird + deer + level-3 bunny = +39% → +35%), so the
third slot is a real but bounded gain; a plant XP ×2 boost on top still tops out at ×2.7 on a single plant.
### 4.3 Every egg drinks the whole block
`eggAfterSession` (v1.16) poured a block into the one active egg and the leftover into the next. Now every waiting
egg that is not the focus chain (the level-4 rare, level-8 legendary and any gift egg) takes the FULL block at the
same time, each marked with the block id (so a replay on another device adds nothing); the focus-egg chain keeps the
old behaviour (one egg, overflow into the next) so the "one egg per 300 minutes of focus" rhythm is unchanged. A
user with three eggs waiting therefore hatches them about three times sooner than in 1.16.
### 4.4 Pet mutations
Six looks: Golden ✨, Shiny 💎, Rainbow 🌈, Shadow 🌑, plus two of our own, Frost ❄️ and Ember 🔥. Decided from the egg
id alone (`petMutOf(egg)` hashes the id: chance 8% common / 12% rare / 15% legendary eggs, then the look is a second
hash), so every device and every reload agree and nothing is stored or re-rolled; a mutated pet's buffs are ×1.25
(before the cap). Because the roll comes from the egg id, a pet hatched before 1.17 can turn out mutated on
update — users only gain. Shown in the hatch reveal, the pets dialog, the scene (CSS filters per look, Full and
Reduced motion alike), the egg card, the bag and the almanac ("Golden Fox" with its stronger buff line).
### Tests
`v117h` (new): slots by level, buff table, caps, parallel eggs, mutation determinism and odds, mutated buffs, the
reveal, bag and almanac, demo. Adjusted to the new numbers: `v116b` (slots 1/3/6, caps, buff sums, fox 15%),
`v116g` (a 90-minute block fills a tomato to its 70 XP need), `v115a` (all three starter plants are now full after
170 minutes, so the harvest step and the minimal-mode watering step plant a fresh tomato; the harvest goes to the
Harvests tab; the almanac count ignores the trophy shelf). The demo sunflower is at 45 of 60 XP again (the lower
needs had made it ready, and the demo is meant to show one ready plant).

## Phase 5 — daily rewards past Day 7, polish
### 5.1 Daily rewards keep counting
- The day number is the length of the unbroken run of claimed dates (Day 8, Day 9, … — it used to wrap to 1 after 7).
  A missed day starts again at Day 1, as before; the focus streak is separate.
- Every 7th day (7, 14, 21, …) is the gift day: the bigger coin amount plus a cosmetic you don't own yet (recorded as a
  free purchase, as before). The pick is now fixed by the date and account (`hash01`) instead of `Math.random`, so it
  cannot be re-rolled and every device agrees.
- Coins: the week-1 table is unchanged (2 3 3 4 5 6 12 = 35). From the second week each ordinary day pays +1 per
  completed week, capped at +4 (so 6 7 7 8 9 10 from day 29), and the gift day +2 per week capped at +8 (20 from
  day 35). A run past a month pays 67 a week — still a bonus next to sessions. `loginCoinsFor(n, key)`.
- Growth applies only to claims dated from the release day (`LOGIN_GROW_FROM = '2026-11-02'`, like the challenge
  cut-off); older claims pay exactly the week-1 table, so no existing balance changes and nothing is paid twice. The
  coin ledger reads the claim dates, so every device computes the same total.
- Migration: nothing to migrate — the day was never stored; it is derived from the claim dates on every device, so a
  user on "Day 3" of their second week simply sees "Day 10" after the update (same coins today, since the date is
  before the growth cut-off). No version field needed; old exports import unchanged.
- The track shows the current week of the run (Day 8–14, Day 99–105 …) with each day's coins and the 🎁 on the gift
  day; label sizes tightened so "Day 105" fits a 360 px tile. Card, dialog, inbox and tip copy updated. The demo
  account shows a nine-day run (Day 10 ready; claiming shows the preview prompt).
### 5.2 Polish
Folded into Phase 6 (layout audit and reviewer findings), listed there.
### Tests
`v117i` (new): the formula per week and the caps, old-dated claims, run counting and the gap reset, the week window
of the track, claiming Day 10 as a guest (ledger +3), the Day 14 gift (deterministic pick), ledger totals for a run
before / across / after the cut-off (43 / 255), Day 105 at 360 px, export and a 1.16 import, two devices (A claims,
B sees it claimed and cannot claim again), demo. Related: `sc7 v112a v112c v1131a v7 v7c` pass.

## Phase 6 — testing, review and hardening
### Suites
- New for 1.17: `v117a` watering (T1–T7 scenarios), `v117b` goal history / challenge rewards / banners, `anim117`
  animation audit, `v117d` logo / Finish early / glance card, `v117e` plant XP / harvests / stars / selling / festival /
  ledger / export / sync / demo, `v117f` boosts, `v117g` tour / tasks / compost / shelf / info cards / scenes / sync /
  demo, `v117h` pets round 2, `v117i` daily rewards, `v117j` edge cases (midnight, week and month rollovers, a device
  clock ahead, double-clicks, rapid tab switching, a brand-new account, a very large history, a full v1.16 backup).
- Older suites adjusted to the 1.17 numbers (listed per phase); every suite is in `runall.sh` for the full run.
### Edge cases (v117j) — what was checked and what it found
- A block that straddles midnight is split by the minutes on each side (as before); tasks and reward days are keyed
  by the local date, a claim dated tomorrow (a device a day ahead) never counts as today.
- Challenge rewards across the week boundary use the challenge's own week key; the festival runs Saturday–Sunday local.
- A block stamped in the future by a fast clock is ignored by the replay until it is within five minutes, then waters once.
- Double-clicks: harvest, sale, task claim, Finish early and the reward claim each happen once.
- Found and fixed: a brand-new account's Timer garden card stayed hidden until the next re-render (it was drawn before
  the garden record existed). `gardenMigrate` and `showTab('timer')` now refresh it.
### Layout audit (`audit117`)
Two findings on the first pass, both fixed: the logo button was 38 px wide in True Minimalist at 360 px (now a 44 px
minimum), and the hatch dialog's "Keep it in the bag" button could be 42–43 px tall (now 44 px minimum). Re-run clean.
### Independent review
A separate reviewer agent read the full diff; its ten findings, the verdicts and the fixes are tabled in the release
notes ("Independent review"). The two that mattered most: a sale could be lost when two devices held the same harvested
crop (`mergePlant` now keeps the earliest sale / compost), and the produce flyer shared a CSS class with the fireflies
(invisible flyer, fireflies drawn as fixed pills). Also: no boost as a gift-day present, import keeps the goal history
and the Finish-early mark, compost is plant XP only, the replay never reaches an egg laid after the block and gives a
late plant the share of its time, a boost icon, a harvest never lands before the basket marker. Regression suite `v117k`.
### Measurements (before = 1.16 build `4576182`, after = 1.17; `perf116.mjs` on both pages, `fsio117.mjs`, `audit117.mjs`)
- **Performance** (guest with 2 years of sessions = 2,772 blocks, 16 growing plants, 1,200 cards, 400 weighted
  harvests, two eggs, a pet out, a look; medians of 4): desktop load 1,807 ms vs 1,661 ms (+9%: the Timer now also
  draws the garden glance card and the harvests fold into the basket ledger); phone (390 px, CPU ×4) load 3,633 ms
  vs 4,138 ms (−12%, run-to-run noise on the throttled profile is about ±15%); tab switches within 5–50 ms of each
  other on both builds (the Timer +10 ms on desktop for the glance card). Frame rates on the throttled phone with the
  timer running: 1.16 timer 55–57 fps / garden 47–50 fps; 1.17 timer 46–48 fps / garden 41–49 fps on the first pass,
  60 / 51 fps with the scene life hidden and 55 / 50 with everything on in a second pass — i.e. within the noise
  of the headless harness (one run of the very same build gave 31 fps on every tab). JS heap 10 MB on both builds
  when measured back to back (one 1.17 run read 16–19 MB: a GC-timing artefact, not reproduced). The fireflies and
  falling leaves now have their own compositor layers (`will-change`) so the scene never repaints for them. The
  desktop frame lines (~10 fps) are the known harness artefact: headless Chromium throttles rAF in an unfocused
  1280-px context, identical before and after.
- **Firestore usage** (one new user's first day on the emulator, identical steps on both builds): 44 reads / 41
  writes on 1.16, 50 reads / 45 writes on 1.17. The difference: +2 reads / +1 write on "a look at every tab" (the
  profile listener delivering the first garden-tour flag and the glance card's state), +2 / +2 for the 1.17-only step
  (Harvests tab, a sale, a task claim, the tour, the boost shop, the reward dialog — one profile upload each for the
  sale and the claim), and +2 / +1 on the reload (the replay check saves nothing when nothing changed; the extra
  listener delivery is the goal-history list). Load, a minute idle (0 / 0) and the tab tour read nothing new, and
  nothing re-uploads in a loop: `fsio117` shows the users/{uid} listener delivering 5–6 documents over the whole
  scenario.
- **Layout audit**: 360 / 390 / 768 / 1024 / 1280 / 1440 × light / dark / Glossed / True Minimalist, every tab and
  dialog including the 1.17 screens — two findings (the logo button 38 px wide in Minimalist at 360 px, the hatch
  dialog's "Keep it in the bag" 42–43 px tall), both fixed; the re-run on those screens is clean, no console errors.
### Full run (every suite, 77, on the final build)
71 green on the first pass; the six red ones were re-run individually after a look at each:
- `v115h`, `v115i` — the 1.15 fold checks expected produce to rise on a harvest; since 1.17 the crop waits in the
  Harvests basket (produce unchanged until sold). Test expectations updated.
- `v116f` — the demo's Friends · Produce board: the demo garden now holds 441 produce (the 1.17 demo data carries a
  running boost and a basket), which puts demo_scholar on the podium above lenvixty. Test expectations updated.
- `v117d` — the glance card's line gained the XP count in Phase 3 after the suite was written. Expectation updated.
- `v116c` — the Giant reveal opened by a harvest is held while the garden tour (auto-started on the first Garden
  visit of that fresh guest) has the screen; the suite now closes the tour and releases the queue, as a user would.
  This is the focus-queue rule working, not a bug.
- `v114e` — the demo "never writes" check failed once under the full run's load (a late `localStorage` key diff) and
  passed on its own twice; the demo neuters `Storage` and swaps `FB`, and `v116a` / `v117i` / `v117g` / `v117j` cover the
  same guarantee for the 1.17 screens.
Everything green after the re-runs. Firestore rules and indexes are unchanged.


## Bugs found and fixed
### Reported by users (Phase 1)
1. **Focus not watering plants** — root causes and fixes in the notes, Phase 1.1 (a block logged on one device never reached a plant that the other device planted / a plant planted after the block on the same day was marked by a later migration / a summary tie after a re-migration; the replay now covers the last 7 days on every device and every plant drinks each block once).
2. **Changing the daily goal reset the streak** — the goal history (`S.goalLog`) judges every past day by the goal in effect then.
3. **Animation jitter** — the profile-echo re-render loop, the streak digits rebuilt on every tick, read/write interleaving in the tilt/magnet frame, the boss idle/hit transform fight, pokes on reduced motion, digits never removed (Phase 1.3 + the reviewer sweep).
4. **Challenge coins through several friends** — one reward per preset per week from the cut-off week.
5. **Scholar theme vs the starting banners** — theme-aware banner tints plus three neutral starters.
### Found while building and testing (Phases 2–6)
- Finish early under 5 minutes showed two toasts (Phase 2).
- Harvests: an unsold crop counted as paid (`Infinity <= Infinity`), compost crops were paid, the demo sell prompt was missing (Phase 3).
- Boosts: a purchase could exceed the 24-block cap when blocks were already queued (Phase 3).
- The garden tour held during a block never appeared because the one-time garden tip kept the guard busy (Phase 3).
- A brand-new account's Timer garden card stayed hidden until the next re-render, because it was drawn before the garden record existed (Phase 6 edge cases; `gardenMigrate` and `showTab('timer')` now refresh it).
- The demo sunflower had become ready under the lower 1.17 needs, so the demo showed two ready plants (Phase 4).
### Found by the independent review (Phase 6) — all fixed, regression suite `v117k`
- A sale or compost lost when a newer unsold copy of the crop merged in from another device (`mergePlant`).
- The produce flyer and the night fireflies shared a CSS class: the flyer was invisible, the fireflies drew as fixed pills.
- The gift day could hand out a Plant XP boost (and lose it when 24 blocks were held).
- Import dropped the goal history and the Finish-early mark.
- Compost counted as garden XP; a replayed block could reach an egg laid after it; a late plant's replay share was too small.
- The boost card had no icon and the wrong copy; a fast clock could put a fresh harvest "before the basket marker".

## Independent review (separate reviewer agent on the full diff)
A separate reviewer agent read the whole 1.16 → 1.17 diff of `index.html` as a strict reviewer (no edits). It reported ten findings; every one was checked against the code, nine were fixed and one accepted with a change of design, and a regression suite (`v117k`) covers them.

| # | Finding (reviewer's verdict) | What was done |
|---|---|---|
| 1 | **A sale or compost could be lost when two devices held the same harvested crop** (CONFIRMED): `mergePlant` returned the newer copy wholesale, so a ♥ tapped offline on a phone after the laptop had sold the crop made it unsold again, dropped the produce and could invalidate a later seed purchase. | `mergePlant` now treats a sale or compost as final: the earliest `sold` / `cp` wins whichever copy is newer, its `sv` comes with it, and a sold crop is never a favourite. |
| 2 | **`.gd-fly` was defined twice** (CONFIRMED): the night fireflies and the "+N produce" flyer shared a class, so the flyer inherited a 5 px invisible firefly and the fireflies became fixed pills over the page. | The fireflies are `.gd-firefly`; the flyer keeps `.gd-fly`. |
| 3 | **The gift day could hand out a Plant XP boost** (CONFIRMED): boosts passed the "cheap cosmetic" filter and never count as owned, so once the cheap cosmetics were owned every gift day gave a free ×1.5 boost (or silently lost it when 24 blocks were held). | Boosts are excluded from the gift pool. |
| 4 | **Import dropped `goalLog` and the Finish-early mark** (CONFIRMED). | `mergeData` merges `goalLog` by id (newer `u` wins) and copies `early`. Goal changes now carry `u`. |
| 5 | **Compost counted as garden XP** (PLAUSIBLE): a 1-produce crop composted before a Lotus gave 88 garden XP for no focus. | The compost head start is plant XP only: garden XP and the fold subtract it (`compostOf`, stored as `cx` on the harvest). |
| 6 | **A replayed block could fill an egg laid after it** (PLAUSIBLE, low). | The replay runs per egg laid before the block; a replayed block never reaches a gift egg or a focus egg laid after it. |
| 7 | **A late plant's replay share was not the share it would have had** (PLAUSIBLE, low): a 25-min block with one plant served gave a late plant 12 XP instead of 21. | `pourWater` takes the number of plants the block was split among; the replay passes `served + late` and the XP boost of the time (no pet boost, which differs by device). |
| 8 | Boost card said "Blocks of 5 minutes or more count" but every logged block counts (CONFIRMED, low). | Copy fixed. |
| 9 | Boost shop cards had no icon (CONFIRMED, low). | A lightning icon added to `ICONS`. |
| 10 | **The basket marker `hv` comes from the device clock** (PLAUSIBLE, low): a clock a few minutes ahead could put fresh harvests "before the marker". | A harvest's time is never before the marker (`h = max(now, hv + 1)`), so a crop always lands in the basket. |

Nothing found by the reviewer in: sync loops (the echo short-circuit and the idempotent replay), randomness (every pick hashes stored data), demo writes, the focus queue, day / week boundaries (the cut-off strings are Mondays), legacy data without the new fields, Firestore (everything new lives under `users/{uid}`, no rule or index change), unescaped HTML.


## Performance — before (1.16 build `4576182`) and after (1.17)
Same scenario on both builds: a guest with 2 years of sessions, 16 growing plants, 1,200 cards, 400 weighted harvests, two eggs, a pet out and a look; medians of 4 runs; `perf116.mjs` on both pages (desktop 1280 px, and a phone at 390 px with the CPU 4× slower).

```
== desktop 1280
1.16 desktop sessions: 2772
1.16 desktop load (goto → app with data), median of 4: 1661 ms
1.16 desktop tab switch (ms, median): stats 75.8 · quests 68.4 · reminders 33 · friends 26.5 · clan 24.7 · profile 86.1 · board 29.9 · shop 38.9 · timer 62.2 · garden 61.1 · room 43.2
1.16 desktop timer frames (2 s, timer running): 9 fps · p95 frame 228.1 ms · frames > 50 ms: 18
1.16 desktop stats frames (2 s, timer running): 10 fps · p95 frame 134.4 ms · frames > 50 ms: 19
1.16 desktop garden frames (2 s, timer running): 10 fps · p95 frame 222.9 ms · frames > 50 ms: 19
1.16 desktop JS heap 10 MB
1.17 desktop sessions: 2772
1.17 desktop load (goto → app with data), median of 4: 1807 ms
1.17 desktop tab switch (ms, median): stats 90.1 · quests 67.1 · reminders 28.8 · friends 30.8 · clan 21.4 · profile 86.7 · board 31.2 · shop 38.6 · timer 71.7 · garden 71.4 · room 47.2
1.17 desktop timer frames (2 s, timer running): 9 fps · p95 frame 214 ms · frames > 50 ms: 18
1.17 desktop stats frames (2 s, timer running): 10 fps · p95 frame 189.9 ms · frames > 50 ms: 19
1.17 desktop garden frames (2 s, timer running): 11 fps · p95 frame 173.7 ms · frames > 50 ms: 20
1.17 desktop JS heap 16 MB
== phone 390, CPU x4
1.16 phone sessions: 2772 · CPU ×4 slower
1.16 phone load (goto → app with data), median of 4: 4138 ms
1.16 phone tab switch (ms, median): stats 335.9 · quests 314.3 · reminders 116.6 · friends 134.4 · clan 108.6 · profile 354.5 · board 122.3 · shop 116.5 · timer 241.79999999999998 · garden 262.8 · room 129.1
1.16 phone timer frames (2 s, timer running): 55 fps · p95 frame 25.2 ms · frames > 50 ms: 0
1.16 phone stats frames (2 s, timer running): 59 fps · p95 frame 22.9 ms · frames > 50 ms: 0
1.16 phone garden frames (2 s, timer running): 47 fps · p95 frame 33.8 ms · frames > 50 ms: 0
1.16 phone JS heap 10 MB
1.17 phone sessions: 2772 · CPU ×4 slower
1.17 phone load (goto → app with data), median of 4: 3633 ms
1.17 phone tab switch (ms, median): stats 342.7 · quests 278.6 · reminders 168.4 · friends 118 · clan 123.4 · profile 394.1 · board 121.3 · shop 138.1 · timer 275.6 · garden 265.5 · room 145.5
1.17 phone timer frames (2 s, timer running): 46 fps · p95 frame 60.8 ms · frames > 50 ms: 4
1.17 phone stats frames (2 s, timer running): 56 fps · p95 frame 49.1 ms · frames > 50 ms: 2
1.17 phone garden frames (2 s, timer running): 41 fps · p95 frame 65.7 ms · frames > 50 ms: 7
1.17 phone JS heap 19 MB
```

## Firestore usage — before (1.16) and after (1.17)
One new user's first day on the emulator, identical steps on both builds, plus the 1.17-only step on 1.17 (`fsio117.mjs`). Counts are documents read / written through the SDK.

```
1.16 — Firestore operations for one new user (emulator, same scenario on both builds)
| step | reads | writes |
|---|---:|---:|
| sign-up + first load + tutorial | 12 | 8 |
| 3 focus sessions (+15 s for the pushes) | 12 | 21 |
| a look at every tab | 0 | 0 |
| garden planting, a deck + 2 cards + 1 review grade, a 2-subject plan (+15 s) | 4 | 2 |
| 1.16: looks section, pets dialog, a look bought, the four garden boards (+15 s) | 8 | 6 |
| reload (cache-first second load, +8 s) | 8 | 4 |
| one minute idle on the Timer tab | 0 | 0 |
| **total** | **44** | **41** |

top call sites (reads r / writes w / calls n): listen users/B09L5pbmxpCXKZRNF3ildslNDUj1 r3 w0 n4 · getDocs challenges r2 w0 n2 · getDoc usernames/io_9n55p r1 w0 n1 · getDoc publicStats/B09L5pbmxpCXKZRNF3ildslNDUj1 r1 w0 n1 · setDoc publicProfiles/B09L5pbmxpCXKZRNF3ildslNDUj1 r0 w1 n1 · setDoc publicStats/B09L5pbmxpCXKZRNF3ildslNDUj1 r0 w1 n1 · setDoc activity/B09L5pbmxpCXKZRNF3ildslNDUj1 r0 w1 n1 · setDoc presence/B09L5pbmxpCXKZRNF3ildslNDUj1 r0 w1 n1 · getDoc clanOf/B09L5pbmxpCXKZRNF3ildslNDUj1 r1 w0 n1 · listen friendships r0 w0 n1 · listen inbox/B09L5pbmxpCXKZRNF3ildslNDUj1 r0 w0 n1
errors []

1.17 — Firestore operations for one new user (emulator, same scenario on both builds)
| step | reads | writes |
|---|---:|---:|
| sign-up + first load + tutorial | 12 | 8 |
| 3 focus sessions (+15 s for the pushes) | 12 | 21 |
| a look at every tab | 2 | 1 |
| garden planting, a deck + 2 cards + 1 review grade, a 2-subject plan (+15 s) | 4 | 2 |
| 1.16: looks section, pets dialog, a look bought, the four garden boards (+15 s) | 8 | 6 |
| 1.17: Harvests tab, a sale, a task claim, the tour, the boost shop, the reward dialog (+15 s) | 2 | 2 |
| reload (cache-first second load, +8 s) | 10 | 5 |
| one minute idle on the Timer tab | 0 | 0 |
| **total** | **50** | **45** |

top call sites (reads r / writes w / calls n): listen users/ysFc2jUsy6KBhVEHR6NzIsAN49Zu r5 w0 n6 · getDocs challenges r2 w0 n2 · getDoc usernames/io_9qntg r1 w0 n1 · getDoc publicStats/ysFc2jUsy6KBhVEHR6NzIsAN49Zu r1 w0 n1 · setDoc publicProfiles/ysFc2jUsy6KBhVEHR6NzIsAN49Zu r0 w1 n1 · setDoc publicStats/ysFc2jUsy6KBhVEHR6NzIsAN49Zu r0 w1 n1 · setDoc activity/ysFc2jUsy6KBhVEHR6NzIsAN49Zu r0 w1 n1 · setDoc presence/ysFc2jUsy6KBhVEHR6NzIsAN49Zu r0 w1 n1 · getDoc clanOf/ysFc2jUsy6KBhVEHR6NzIsAN49Zu r1 w0 n1 · setDoc users/ysFc2jUsy6KBhVEHR6NzIsAN49Zu r0 w1 n1 · listen friendships r0 w0 n1 · listen inbox/ysFc2jUsy6KBhVEHR6NzIsAN49Zu r0 w0 n1
errors []
```

## Layout audit (`audit117`)
360 / 390 / 768 / 1024 / 1280 / 1440 × light / dark / Glossed / True Minimalist, every tab and dialog including the 1.17 screens (Harvests tab, the stars popover, three tour steps, the growing-plant info dialog, the boost shop, the Day-105 reward dialog, a mutated pet in the hatch reveal / bag / pets dialog, the glance card, the logo at every width).

5 distinct findings (full list in `audit117.txt`):

- button#brandBtn.brand — tap target 38×44 (“Pomodorolist”)  [minimal/360:timer minimal/360:timer-running minimal/360:reminders minimal/360:cards minimal/360:dlg-review-back minimal/360:quests +26]
- button#egOk.btn — tap target 153×42 (“Keep it in the bag”)  [glass/768:dlg-giant]
- button#egOk.btn — tap target 157×43 (“Keep it in the bag”)  [light/768:dlg-giant]
- button#egOk.btn — tap target 158×43 (“Keep it in the bag”)  [glass/360:dlg-giant]
- button#egOk.btn — tap target 159×43 (“Keep it in the bag”)  [dark/360:dlg-review-back]

5 distinct findings
errors []

## Full run of every suite on the final build
| suite | result | ✓ | ✗ |
|---|---|---:|---:|
| e2e | green | — | — |
| prog | green | — | — |
| social | green | — | — |
| off | green | — | — |
| motion | green | — | — |
| nav | green | — | — |
| v6 | green | — | — |
| v6c | green | — | — |
| v7 | green | — | — |
| v7c | green | — | — |
| v8 | green | — | — |
| v9 | green | — | — |
| v10 | green | — | — |
| v11 | green | — | — |
| v11old | green | — | — |
| v12 | green | — | — |
| v12b | green | — | — |
| v13 | green | — | — |
| v19 | green | — | — |
| v110 | green | — | — |
| v111a | green | — | — |
| v111b | green | 16 | 0 |
| v111c | green | 9 | 0 |
| v112a | green | 52 | 0 |
| v112b | green | 15 | 1 |
| v112c | green | 6 | 0 |
| v112d | green | 12 | 0 |
| v112e | green | — | — |
| v112f | green | 9 | 0 |
| v113a | green | 17 | 0 |
| v113b | green | 28 | 0 |
| v113c | green | 14 | 0 |
| v1131a | green | 11 | 0 |
| v1131b | green | 21 | 0 |
| v1131c | green | 17 | 0 |
| v114a | green | 20 | 0 |
| v114b | green | 52 | 0 |
| v114c | green | 41 | 0 |
| v114d | green | 45 | 0 |
| v114e | green | 7 | 0 |
| v1141a | green | 23 | 0 |
| v1141b | green | 9 | 0 |
| v1142a | green | 37 | 0 |
| v1143a | green | 76 | 0 |
| v1143b | green | 48 | 0 |
| v1143c | green | 6 | 0 |
| v1143d | green | 2 | 0 |
| v1143e | green | 12 | 0 |
| sec143 | green | 68 | 0 |
| v115a | green | 51 | 0 |
| v115b | green | 14 | 0 |
| v115c | green | 31 | 0 |
| v115d | green | 30 | 0 |
| v115e | green | 23 | 0 |
| v115f | green | 18 | 0 |
| v115g | green | 16 | 0 |
| v115h | green | 18 | 0 |
| v115i | green | 6 | 0 |
| v116a | green | 16 | 0 |
| v116b | green | 23 | 0 |
| v116c | green | 13 | 0 |
| v116d | green | 15 | 0 |
| v116e | green | 12 | 0 |
| v116f | green | 15 | 0 |
| v116g | green | 8 | 0 |
| v116h | green | 5 | 0 |
| v117a | green | 8 | 0 |
| v117b | green | 7 | 0 |
| anim117 | green | 13 | 0 |
| v117d | green | 15 | 0 |
| v117e | green | 14 | 0 |
| v117f | green | 8 | 0 |
| v117g | green | 13 | 0 |
| v117h | green | 11 | 0 |
| v117i | green | 15 | 0 |
| v117j | green | 13 | 0 |
| sec116 | green | 28 | 0 |

Suites written for 1.17: `v117a` (watering), `v117b` (goal history, challenge rewards, banners), `anim117` (animation audit), `v117d` (logo, Finish early, glance card), `v117e` (plant XP, harvests, stars, selling, festival, ledger, export, sync, demo), `v117f` (boosts), `v117g` (tour, tasks, compost, shelf, info cards, scenes, sync, demo), `v117h` (pets round 2), `v117i` (daily rewards), `v117j` (edge cases: midnight, week / month rollovers, a clock ahead, double-clicks, rapid tab switching, a brand-new account, a very large history, a v1.16 backup import).
