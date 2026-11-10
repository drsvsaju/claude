# Pomodorolist v1.20 — report (rank ladder, Overtime, Study Pass, Posts)

Built on top of v1.19.1 in `v1.20: …` commits on `focus-app`, one per phase.

## Firebase console steps, in this order
1. **Rules:** paste the whole `firestore.rules` → Publish. The only change is the new `posts` collection; nothing existing
   changes, so app versions 1.17–1.19.1 keep working. (If the v1.19.1 rules aren't published yet, these include them.)
2. **Indexes:** create the three new `posts` indexes (table in section 4), and wait until they show **Enabled**.
3. **Upload** `index.html` (and the two rules/index files, so the repository matches).

**Firebase config:** the brief asked for `PASTE_…` placeholders in the config block, but your standing instruction is to
keep the real values that are there. `index.html` keeps the real values (authDomain `pomodorolist-bbaa6.firebaseapp.com`)
so the file you upload works on the live site. Say if you want a placeholder copy as well.

---

## 1. Rank division hint and the rank ladder
- **The hint:** the Rank card shows the steps around you, e.g. `Gold III → II → I → Platinum III`, with your step marked.
- **Tooltips:** every rank badge's tooltip reads e.g. "Gold III · divisions go III → II → I, then Platinum III · tap for
  every rank".
- **The ladder opens from:**
  - the Rank card (and its "All ranks ›" button);
  - the Timer's rank line;
  - the rank pill on your player card;
  - any rank badge outside a button (leaderboards, friend rows, tables). A badge in a row opens the ladder, not the row.
- **The ladder itself:**
  - every rank and division with its hours (Bronze III 0–3.3 h … Grandmaster 180 h +);
  - explains III (lowest) → I (highest);
  - marks "You" with your progress bar, and dashes the next step;
  - the footer shows your hours, the next step, any placement and the 14 h/day rule.
- **Unchanged:** the header chip still opens the Ranks board, as agreed in v1.19.1, and the ladder has a "Ranks board"
  button.
- **Hidden in True Minimalist**, like the rest of the rank UI. It fits at 360 px.

## 2. Overtime (on by default)
**How it works**
- When a focus block reaches 0, the end sound plays once, as before. The timer then counts up, e.g. `+04:32`, labelled
  **Overtime**, with an amber ring.
- The buttons become **Pause/Resume · Stop · Break**.
  - **Stop** (also Space) logs the block and goes to the break; Break also starts the break straight away.
  - Reset and Finish early don't apply: the block is already done.
- A line under the ring explains it, with a **Turn off overtime** link. The link turns it off and logs the block so far.
- **One block is logged:** the planned minutes plus the overtime (`ot` minutes are kept on the record). It counts
  everywhere focus minutes count: XP, coins, streak, the daily goal, garden water, eggs, boss damage, rank minutes,
  clan XP, quests and the Study Pass. The history shows "+12m".

**Limits and edge cases**
- **Cap:** a whole block is at most 240 min, the preset limit and the rules' 4-hour session, so no write is ever refused.
  At the cap it logs exactly 240 with a notice.
- **"Were you still focusing?":**
  - Asked after 10 minutes of overtime with no tap or key.
  - Only asked while the tab is visible; a hidden tab waits, and nothing is logged until there's an answer.
  - **Yes, count it** keeps everything. **No — log up to <time>** logs only up to the last sign of you.
- **Pause** stops the count, and **Resume** continues it.
- **Reload mid-overtime:** it keeps counting from the same start and logs once.
- **Midnight:** the block splits by minutes on each side, as blocks always have.
- **Two devices:** the timer is per device as before, and the setting syncs.
- **Synced timer:** off, with a note "Overtime is off in a Synced timer — the host runs the shared timer".
- **Focus together:** on (it's your own timer), and your seat shows `+mm:ss`.
- **The tutorial's 1-minute demo block:** off.
- **Nothing pops up during overtime:** pop-ups wait in the focus queue and come after Stop.
- **Friends** see "Maths – overtime". The presence status is `overtime`; older apps show nothing for it, as before,
  with no rules change.
- **Existing users** get a one-time tip after their first block in 1.20, never during one. It's saved to the account, so
  it shows once across devices. New accounts don't get it, since the overtime display explains itself.

## 3. Study Pass
**Where:** Quests › Weekly boss · Questline · **Study Pass** · Quest board. The questline card has a line,
"Study Pass · tier 7 / 30 · Focus 5 / 20", that opens it. One pass per questline event, with the same dates and theme
(Monsoon Study 8–30 Nov, Christmas 1–31 Dec, and so on). It's free; there is nothing to buy.

**Two rows, each claimed on its own, once per tier**
- **Pass track (top, 30 tiers).**
  - Pass XP comes from 1 per focus minute, +30 for the daily goal, +15 for the daily reward, +40 per quest-board
    quest and +50 per questline quest.
  - A day counts at most 180 (the catch-up below can raise this).
  - Rewards are coins, produce and seeds; a common egg at tier 12 and a rare egg at 25. Event cosmetics: a seal (10), a
    title "Monsoon Study Pass Holder" (15), a name colour (20), and an aura + 100 coins (30).
- **Focus track (underneath, 20 steps).**
  - Only focus hours logged during the event count, at most 14 h a day (the same cap as ranks).
  - Rewards are smaller and steadier: coins and produce, seeds at 7 and 14, an egg at 10, and a focus seal + 40 coins
    at 20.
- **Claiming:**
  - each tier has a Claim button, and there's **Claim all**;
  - claims are ledger entries (event + track + tier), so a tier pays once even when claimed on two devices at once;
  - coins come from the ledger, and items, produce, seeds and eggs are keyed by the claim.
- **At the end — auto-claim, not "missed".** Anything reached but not claimed is added when the event ends, with one
  notice ("🌧️ Monsoon Study Pass ended · 6 rewards you reached were added for you"). Why: the rewards were earned by studying,
  and losing them for not tapping a button would feel like a penalty. "Missed" also adds a reason to open the app that
  isn't studying. Nothing beyond what you reached is given.

**The monthly track (v1.18) is merged into the pass**
- **No new monthly-track rewards from November 2026.** The quest board's track card now says "The monthly track is
  now the Study Pass" and links to it.
- **Everything already claimed stays:** coins in the ledger, items in the bag.
- **Nothing pays twice for November.** Whatever the November track already paid is counted against the first Focus
  steps, which show as "paid". Example: 20 coins + 30 produce = 50, which covers steps 1–4 (11 + 12 + 13 + 14).
- **Earlier months are untouched.**

**Pacing: sized to the days you actually have**
- **The pass starts on the later of** the event's first day and the account's first day on 1.20. For Monsoon Study
  with a 13 Nov launch, that's 18 days (13–30 Nov) instead of 23. Christmas and every later event run in full for
  everyone already on 1.20.
- **The size scales:**
  - Pass XP = 146 × (days − 2.5), rounded to 30, between 900 and 2,700. A full event is 2,700 (90 a tier).
  - The Focus track's last step = 1.5 h × (days − 2.5), at most 26 h, with every step scaled the same way.
  - Both aim at a normal studier finishing about 2–3 days before the end.
- **Catch-up, for someone who plays most days but not much:**
  - *Rollover:* each day you play, 75% of the daily cap you didn't use goes into a catch-up bank.
  - *Spending:* on a day you're behind the pace, the bank tops you up by at most as much again as you earned, never
    past the day's cap. It does nothing on a day you don't play.
  - *Last week:* in the last 7 days the cap rises to 240 while you're behind.
  - The pass shows the bank ("Catch-up 120 XP") and today's cap ("Today 95 / 180 XP").
- **What each user is:**
  - *light* = 60 min a day, 6 days a week, 1 quest-board quest a week;
  - *normal* = 90 min every day with the daily goal, 2 quests a week;
  - *heavy* = 4 h every day, 3 quests a week.
  - These are the app's own day-by-day results, the same in the browser test (v120c).

*Monsoon Study from the 13 Nov launch: 18 days, 2,250 Pass XP (75 a tier), Focus track to 23.5 h*

| user | Pass track done | Focus track done |
|---|---|---|
| light | day 17 (1 day to spare, with catch-up) | 68% by the end |
| normal | day 16 (2 days to spare) | day 16 |
| heavy | day 13 | day 6 |

If it goes live on 12 Nov (19 days, 2,400 XP), normal finishes on day 16 (3 to spare) and light on day 18. If it goes
live on 14 Nov (17 days, 2,130 XP), normal finishes on day 15 and light on day 16.

*A full-length event (31 days, e.g. Christmas): 2,700 Pass XP (90 a tier), Focus track to 26 h*

| user | Pass track done | Focus track done |
|---|---|---|
| light | day 29 (2 days to spare) | day 30 |
| normal | day 19 | day 18 |
| heavy | day 15 (the fastest possible at the cap) | day 7 |

- **Without catch-up,** light reaches only 80–84% of the Pass track in a short event; with it, light finishes.
- **The Focus track is still hours only.** In a shortened event a light studier (about 15 h in 18 days) gets about
  two-thirds of it. That's deliberate: it's the "steady hours" row. Topping it up with anything other than hours
  would make it a second Pass track. If you'd rather light studiers finish it too, the simplest change is to size it
  for 1 h a day instead of 1.5 h — say so.
- **Late joiners:** an account created during an event (or one first opened on 1.20 late in Monsoon) gets a pass
  sized to its days left, never below 900 XP. Opening late doesn't make it easier than the cap allows: 180 a day
  still applies, and 240 only in the last week while behind.

## 4. Posts
**Where: its own section**, the same way Study sessions got one in v1.19.1. Friends stays Friends · Challenges.
- **Navigation:**
  - Sidebar under Social: Friends · **Posts** · Study sessions · Clan · Leaderboard, with its own icon.
  - The phone **More** menu and the tablet slide-in list it too (they show the same list). The command palette has
    "Posts", the guided tour has a Posts step, and the shortcut is **O** (on the shortcut sheet; J was taken).
  - Pull-to-refresh works on phones.
- **The dot:**
  - Shows when a friend has posted since you last opened Posts, and clears when you open it.
  - The phone's More button lights up with it, like the other section dots.
  - It's kept up to date by a light check: the 5 newest posts (5 reads) at sign-in, then every 15 minutes while the
    app is open and visible.
- **The page:**
  - A header card: what Posts is, the filters **All · Friends · Clan · You**, a refresh button, and a **Posting on ⚙**
    button. That button opens Settings › Friends & privacy at the posting switches, and shows "Posting off" or
    "on · 11 of 12" when something is switched off.
  - Then the feed, newest first, in day cards: **Today · Yesterday · This week · Earlier**.
  - Each post shows the avatar with its frame and aura, the name colour, the rank badge, the post text, how long ago,
    and 🔥 👏 💪 ⭐ with counts.
  - Day cards use the shared balanced layout: two even columns when there are three or more cards, otherwise one
    centred column. There's no sideways scroll from 360 to 2560 px, in every theme and Glossed.
  - Empty states have Pomeo: "Nothing yet — your friends' wins will show up here". You and Clan have their own
    ("Nothing from you yet", "No clan yet").
- **The filters:**
  - **Friends** = your friends' posts.
  - **You** = yours.
  - **Clan** = posts by your clanmates, plus your own clan level-ups and raids.
  - Posts are still only shared with friends, so the Clan filter shows clanmates who are also your friends. Clan
    level-ups and raids also still appear in the clan's **Activity** card for every member. Opening posts to all
    clanmates would be a privacy change (a wider audience); say if you want it.
- **True Minimalist: Posts is hidden.**
  - What's hidden: the sidebar entry, the palette, the tour step and the dot; the section can't be opened.
  - Posting pauses.
  - Why: Posts celebrates game wins (ranks, bosses, harvests, pets, passes), like the Shop, Quests and Garden that
    Minimalist already hides. Friends, Study sessions, Clan and the Leaderboard stay.
- **Settings › Friends & privacy** has "Share posts with friends" and "Choose what gets posted" (one switch per type).

**What gets posted: automatic only, never any text anyone writes**
- **12 types:**
  - achievements (several at once show as one card: "unlocked 3 achievements: …");
  - streak milestones (7 days and up);
  - rank-ups; levels (every 10, and each new badge);
  - studying together; weekly boss wins (solo or squad);
  - finishing a questline, and finishing a Study Pass;
  - Giant and 5★ harvests; rare or mutated pets;
  - clan level-ups and monthly raids; focus-hour milestones (50 / 100 / 250 … h);
  - Pomeo's stages.
- **Each post** is a fixed set of fields: type, a reference (which achievement, which boss week…), a number, who may
  read it, the day and the server time. The card text is built on the reader's device from those fields, so there
  is nothing anyone can type into it.
- **Studying together:** a mate's name shows only to people who are friends with that mate, and only if the mate
  posted the same session themselves (so their own setting allowed it). You see "with you" when you were there;
  anyone else reads "with 1 other".

**Reactions:** 🔥 👏 💪 ⭐. Each person gets one at a time: tap another to change it, tap the same one to remove it. The
author sees the counts and can't react to their own post.

**Privacy**
- **Who can read a post:** the author and the author's friends at the moment it was posted, minus anyone blocked.
- **Block someone or stop being friends:** they are taken out of the audience of your recent posts. The feed also
  only shows posts from your current friends.
- **Defaults:** Posts are on by default. The exception is anyone who had already switched off "Share activity": they
  stay off until they turn Posts on themselves. Each type can be switched off on its own.

**Limits that keep it calm and cheap**
- **Fixed ids:** `type_author_reference`. The same thing can't be posted twice, from a second device, after a reload
  or by a retry: the rules refuse the second write.
- **No backfill:** only things that happen from the first 1.20 sign-in on, and never more than two days old.
- **Volume:** at most 3 posts at once and 10 a day.
- **Expiry:** after 30 days a post isn't shown, and the author's app deletes it (one check a day per device, at most
  20 reads).
- **Reading costs:**
  - opening Posts is one query of at most 50 posts, refreshed at most every 3 minutes while you're on it;
  - a reaction is one write; nothing listens in real time.
  - Measured costs are in section 5.

**Rules (`posts` collection, new; nothing else changed)**
- **read:** you must be in the post's audience.
- **create:**
  - the post's fields are fixed, and it must be posted as yourself under your own name;
  - one of the 12 types, with a short reference made of letters, digits, `_ . -`;
  - the id must equal type_you_reference;
  - a number from 0 to 1,000,000;
  - an audience of 1–151 that includes you, and at most 6 study mates;
  - the time must be the server's.
- **update:** only one of two things.
  - A reaction: only your own entry, one of the four emoji or removed, only if you're in the audience and not the
    author.
  - The author removing people from the audience: never adding, and the author stays in.
- **delete:** the author only.
- **Attack suite:** 15 attempts are refused — posting as someone else, a wrong id, free text, an unknown type, a huge
  number, an audience without you, a bad reference, adding someone to the audience, reacting from outside the
  audience, a bad emoji, reacting for someone else, editing or deleting another person's post, listing every post,
  and reacting to your own. A valid post and a valid reaction are allowed.

**Indexes (three new, all on `posts`)**

| fields | used by |
|---|---|
| aud (array-contains), at (descending) | the feed |
| aud (array-contains), author (ascending), at (ascending) | deleting your posts older than 30 days |
| aud (array-contains), author (ascending), at (descending) | removing someone from your recent posts' audience |

The last two include `aud`: the rules read posts by their audience, so a query for your own posts must say so too.

**Demo:** the demo account has the Posts section, with its dot lit, and shows a sample feed (a rank-up, a streak, "studied together with you", achievements, a boss
win, a Study Pass, a Giant harvest…) with reaction counts. Reacting shows the preview prompt, and nothing is written.

**Bugs found and fixed while testing**
- "Finishing a questline" posts had no hook; finishing the questline's final reward now posts.
- The pass name read "Monsoon Study Study Pass" in two places (the post card and the end notice). All pass names now
  come from one helper: "Monsoon Study Pass", "Christmas Study Pass".
- The daily cleanup ran on every reload instead of once a day.
- Posts were on for people who had opted out of sharing their activity.

## 5. Final checks

**Full regression:** **100 suites, all passing.** 96 passed on the first full run.
- v12 counted 10 tour steps; the tour now has 11 (Posts), so the test was updated.
- v119a waited 30 s for the rank-up celebration. Held achievement toasts go first by design (3.2 s apart, about 7
  of them here), so it now waits up to 60 s.
- v115a and v115b (two-device garden timing) passed on an unchanged rerun.
- v1131a passed this time (see the note below).

**7-day simulation, one account on two devices plus a friend (suite v120e)**
- *Setup:* A is online all week and logs a block every day, including a 16-hour day. B goes offline for the last
  four days and logs its evening blocks while offline. After each day's blocks, each device does what the app does
  after a block (rewards, then posts).
- *Today:*
  - B comes back online.
  - A runs a real Overtime block: 1 minute planned, about 3 more. It is logged once as 4 min with "+3m".
  - Both devices claim the same Study Pass tiers at the same moment, then Claim all.
- *Results (all passed):*
  - **Sessions:** both devices have all 14 blocks of the week, none lost and none twice.
  - **Study Pass:** identical on both (364 Pass XP, tier 4, 5.07 Focus hours, step 5). Each claimed tier is in the
    ledger once.
  - **Coins, produce and ledger:** the same on both (558 coins, 92 produce, the same claims ledger).
  - **Streak:** a 6-day streak on both, including the days B logged offline.
  - **Rank:** both have 1,474 rank minutes. The 17-hour day (A's 16 h + B's 1 h) counted as 14 h, while Stats still
    shows all 17 h.
  - **Posts:** the friend sees 5 posts (a rank-up and achievements), each once. Both devices had unlocked some of the
    same things, and B's offline writes flushed late, but the second write of an id is refused. Nothing is dated
    before 1.20.

**Layout audit (suites v120f and v1191d)**
- *What v120f covers:* every new 1.20 screen — the Rank card and rank ladder, the timer in Overtime and "Were you
  still focusing?", the Study Pass, the Posts section and Settings › posting.
- *Where:* at 360, 390, 768, 1024, 1280, 1440, 1920 and 2560 px, in light, dark, Glossed lite, Glossed full and True
  Minimalist.
- *Result:* no sideways scroll, nothing off screen, every dialog fits, and no button text is cut. True Minimalist shows
  no rank hint, rank ladder or Posts.
- *v1191d:* Posts is now part of the balanced-columns sweep. It passes with no column gap and the columns level, in
  every theme at 1280 and 1920.
- *Fixed on the way:* on wide screens the Study Pass page scrolled sideways about 3,500 px, because its 30-tier row
  set the page column's width.

**Firestore usage, v1.19.1 vs v1.20 (emulator, the same scenario on both builds)**

| a new user's first day | 1.19.1 reads | 1.19.1 writes | 1.20 reads | 1.20 writes |
|---|---:|---:|---:|---:|
| sign-up + first load + tutorial | 14 | 9 | 15 | 9 |
| 3 focus blocks | 15 | 24 | 17 | 22 |
| a look at every tab | 2 | 1 | 2 | 1 |
| 1.20: the Study Pass + Claim all, the Posts section | — | — | 4 | 1 |
| reload (cache-first) | 10 | 5 | 11 | 5 |
| one minute idle | 3 | 0 | 3 | 0 |
| **total** | **44** | **39** | **52** | **38** |

- The extra reads are the pass, Posts and the dot's check (5 reads at most, at sign-in and every 15 minutes).
- Claiming the pass costs no extra write: the claims ride on the profile save that already happens.
- Writes stay level (38 vs 39). A post is one write, and only when something is reached.

| a user with 50 friends who all posted this week | reads | writes |
|---|---:|---:|
| the 50 friendships arrive (listener, the same as 1.19.1) | 55 | 1 |
| open Friends (the same as 1.19.1) | 100 | 0 |
| **open Posts** (50 posts) | **51** | 0 |
| Posts again within 3 minutes | 0 | 0 |
| tap Refresh, more than 20 s after the last load | 50 | 0 |
| tap Refresh again at once | 0 | 0 |

- **Why opening Posts is cheap:** it's one query of at most 50 posts. The authors' looks (pictures, frames, ranks) are
  the same 15-minute cache the Friends list uses. Opening Posts first, before Friends, adds up to 100 reads for those
  looks once, which Friends would have read anyway.
- **What a post costs:** writing one is 1 write; reacting is 1 write. Nothing listens in real time.
- **Daily cost of the extras:** the dot's check (5 reads every 15 minutes while the app is open) and the cleanup (at
  most 20 reads once a day).

**Tests changed on purpose (the app changed, not a regression)**
- *Expectations that moved with the new behaviour:*
  - v118h — the monthly track merges into the Study Pass from November 2026.
  - v118c, v1191e — Friends is Friends · Challenges, and the sidebar is Friends · Posts · Study sessions · Clan ·
    Leaderboard.
  - v1143a — the menu has 12 sections.
  - nav — the tour has 11 steps.
  - v1191b, v119a — the rank ladder and the new badge tooltip.
- *Tests made sturdier, and why:*
  - v1191d — the "space between cards" limit allows the masonry's 4 px row step (spacing is 22 px ± 4 by design).
  - v1141a — it waits for the leaderboard copy's second publish instead of a fixed 4 s.
- *Overtime:* classic suites from before 1.20 run with Overtime off (a preload). The v1.20 suites test it on.

**Known and not caused by 1.20:** v1131a (two checks about a "Rank up" toast during a block) fails the same way on the
v1.19.1 build (94e3a1e). It depends on the date: the account crosses a rank division during the test block in November.
