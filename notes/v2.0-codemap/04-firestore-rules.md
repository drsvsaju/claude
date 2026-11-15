# Firestore rules and indexes

Source: `firestore.rules` (995 lines, 72,382 bytes) and `firestore.indexes.json` (18 composite indexes) at commit 77f8456
(v1.20). Both are byte-identical to `deploy/upload-v1.20/`. Line numbers: `R:n` = `firestore.rules`, `A:n` = `index.html`;
`name@n` = the `index.html` line where function `name` starts.
Everything requires `signedIn()` — a logged-out visitor can read nothing (brief 7a: the ref landing must not read Firestore).
There are no Cloud Functions (Spark plan): every number is computed on the user's device; rules only bound it
("HONEST NOTE ON CHEATING", R:17–21). Last line of the ruleset: "Everything else is closed" (R:993).

## Collections

30 `match` blocks. "owner" = `me() == uid`. Writers are app functions.

### Private
| Path (R:line) | Read | Write | Validation | App |
|---|---|---|---|---|
| `users/{uid}` (41) and `users/{uid}/{document=**}` (43) | owner | owner, anything | none — free-form, no size/shape checks | root doc: `pushProfile@5846` (from `profileFromState@5785`), `claimOnce@11780` and `claimReminder@18446` (transactions, merge), listener `attachListeners@5979`. `months/{YYYY-MM}`: `cloudAddSessions@5863`, `cloudRemoveSession@5873`. `blocked/{otherUid}` `{name, at}`: `blockUser@9965`, `unblockUser@9977` (rules read it with `exists()` in `blockedBy` R:38, `validRequest` R:290, `blockedByLeader` R:572). `meta/clock` `{t}`: `serverNow@12818` (server-time probe). |

Any new **private** v2.0 data (calendar items, planned blocks, intentions/debriefs, mistake notebook, mock tests, all-day
reminder state) can live in the root doc or a new subcollection under `users/{uid}` with **no rules change**.

### Identity and published stats
| Path (R:line) | Read | Create / update | Delete | Validation helper → what it enforces | App |
|---|---|---|---|---|---|
| `usernames/{name}` (49) | `get`: any signed-in; `list`: never | create: `name == myName()`, keys only `uid`, `uid == me()`; update: never | owner of the entry | inline | written once by `initSocial@9435` (A:9454) if missing (not batched with sign-up); read by `sendRequest@9939` and rule `validRequest` (R:287). No build 1.19–1.20 ever deletes it. |
| `publicProfiles/{uid}` (61) | `get`: any signed-in user the owner has not blocked (NOT friends-only); `list`: never | owner + `validProfile` | owner | `validProfile` (67): keys ⊆ `username, level, tier, frame, color, avatar, aura, clanTag, streak, longest, hours, joined, big, updatedAt`; `username == myName()`; `level` int 1–1000; `tier` ≤ 20 chars, `frame`/`color` ≤ 30; `streak` ≥ 0, `streak ≤ longest ≤ 100000`; `hours` number 0–60000; `joined` int ≤ now; `updatedAt == request.time`. Optional: `validAvatar` (87, ≤ 30), `validAura` (91, ≤ 30), `validClanTag` (95, must equal the tag of the clan in `clanOf/{me}`; unchanged tag = no reads), `validBig` (83, regex `species:kg`). **No growth limits**; `joined` is mutable. | `publishPublic@9607` → `writePublic@9474` (whole-doc `setDoc`); read by `getPublic@10041` from `loadFriendsPublic@10052`, `openFriend@10566`, `prefetchLooks@22590`; deleted by the wipe handler (`#wipeBtn` click, A:18926–18934). |
| `publicStats/{uid}` (103) | `get`: owner, or (`global == true` or `isFriend`) and not blocked; `list`: only `global == true` docs | create: owner + `validStats` + `createLimits` (= `true`, R:148: first upload may hold any history); update: owner + `validStats` + `updateLimits` | owner | `validStats` (110): on create all keys, on update only `diff().affectedKeys()` ⊆ `username, level, tier, frame, color, avatar, aura, clanTag, global, dayKey, dayMin, weekKey, weekMin, weekKeySun, weekMinSun, monthKey, monthMin, lifeMin, lastWeekKey, lastWeekMin, produce, harvests, updatedAt`; key strings only length-checked (10 / 7 chars — **not** compared with the server date); caps `dayMin` ≤ 1440, week ≤ 10080, month ≤ 44640, `lifeMin` ≤ 3,600,000; `dayMin ≤ week ≤ life`, `month ≤ life`; `updatedAt == request.time`. `validGardenTotals` (137): optional `produce` ≤ 10M, `harvests` ≤ 1M. `updateLimits` (159): `room = elapsedMin() + 240`; `grows` (155) per period: same key → never down, `+≤ room`; new key → value ≤ `room`; `lifeMin` never down, `+≤ room`; `growsTotal` (145): `produce` ≤ 2/min, `harvests` ≤ 0.034/min + 2 (dropping and re-adding the field resets the bound). | `publishPublic@9607` (clamped by `clampStats@9575` from `myPeriodStats@9532`; refusal → `refreshMyStats@9656` and ≤ 2 retries); readers `loadLeaderboard@10151`, `openFriend@10566`, `loadSquadStats@11710`; deleted on wipe. |
| `rankStats/{uid}` (172, v1.19) | same as `publicStats` | create: owner + `validRankStats` + `prevPeak == 0` + `seasonMin ≤ 240`; update: owner + `validRankStats` + `rankGrows` | owner | `validRankStats` (179): keys ⊆ `username, level, tier, frame, color, avatar, aura, global, seasonKey, seasonMin, prevPeak, streak, bestStreak, streakDay, joined, updatedAt` (full key check on every write); season and streak groups both required. `validSeason` (209): `seasonKey == seasonKeyNow()` (202, **server UTC month**), `0 ≤ seasonMin ≤ day-of-month × 840`, `prevPeak` 0–16. `seasonGrows` (214): same season → never down, `+≤ room`, `prevPeak` fixed; new season → `seasonMin ≤ room`, `prevPeak ≤ rankOf(old seasonMin)` (`rankOf` R:204, 16 thresholds). `validStreak` (224): `bestStreak ≥ streak`, `bestStreak ≤ (now − joined)/day + 2`, `joined` int ≤ now (self-reported), `streakDay` `''` or `dayKeyOk`. `streakGrows` (231): `joined` immutable, `bestStreak` never down and `+≤ elapsed days + 2`. | `publishRank@9639` (clamp `clampRank@9549`, fields `seasonFields@9597`, `streakFields@9599`; refusal → `SOC.v19Rejected` for 10 min); readers `loadLeaderboard`, `loadFriendsPublic`, `prefetchLooks`. |
| `activity/{uid}` (238) | `get`: owner, or `visible == true` and friend and not blocked; `list`: never | owner + `validActivity` | owner | `validActivity` (244): keys ⊆ `visible, shareNames, days, goalDays, recent, streak, longest, updatedAt`; `days` map ≤ 90 entries (**values unchecked**), `goalDays` list ≤ 90, `recent` list ≤ 20 (only `recent[0].min ≤ 240` and `.t ≤ now + 10 min`), `updatedAt == request.time`. | `activityDoc@9661` via `publishPublic`; readers `openFriend`, `loadSquadStats`, `loadEventBoard@17918`. |
| `presence/{uid}` (256) | as `activity` | owner; keys ⊆ `visible, now, updatedAt`; `now` null or map with keys ⊆ `name` (≤ 80), `phase`/`status` (≤ 20), `endAt`, `left` (numbers) | owner | inline | `publishPresence@9678`, `logout@6186`. `status: 'overtime'` (v1.20) was added without a rules change. |

### Friends, inbox, posts, challenges
| Path (R:line) | Read | Create | Update | Delete | App |
|---|---|---|---|---|---|
| `friendships/{a_b}` (274) | `me() in resource.data.users` | `validRequest` (280): keys ⊆ `users, from, to, status, fromName, toName, createdAt`; `from == me()`, `to != me()`, `status == 'pending'`; `users` sorted pair; id `== users[0]_users[1]`; `fromName == myName()`; `get(usernames/toName).uid == to`; server time; neither side has blocked the other | `acceptByRecipient` (293): recipient only, `pending → accepted`, only `status` + `acceptedAt == request.time` | either party | listener in `initSocial@9435` (A:9441); `sendRequest@9933`, `acceptRequest@9957`, `removeFriendship@9962`, `blockUser@9965`. `MAX_FRIENDS = 100` (A:9376) is client-only. |
| `inbox/{uid}/items/{id}` (301) | owner (read, delete) | sender ≠ owner, `isFriend(uid)`, not blocked, `validInboxItem` (307): keys ⊆ `from, fromName, type, emoji, target, day, title, createdAt`; three types with **deterministic ids**: kudos `k_<me>_<target>` (emoji 🔥👏💪⭐, target `[A-Za-z0-9_-]{1,40}`), nudge `n_<me>_<day>` (👀), sinvite `si_<me>_<sid>` (title ≤ 40, `cleanText`, `get(studySessions/target).host == me()`) | none (so a second write of the same id is refused) | owner | listener in `initSocial@9435` (A:9449) → `onInbox@10000`; `sendReaction@10027`; `sessInvite@21461`. |
| `posts/{type_author_ref}` (326, v1.20) | `me() in resource.data.aud` | `validPost` (332): keys ⊆ `author, authorName, type, ref, n, aud, mates, day, at`; author/name are mine; `type` in 12 fixed types; `ref` `[A-Za-z0-9_.-]{1,60}`; id `== type_me_ref`; `n` int 0–1,000,000; `aud` list 1–151 containing me (members **not** verified as friends); `mates` ≤ 6; `day` regex; `at == request.time` | `postReact` (346): in audience, not the author, only my own key in `r`, preset emoji or removed, `r.size() ≤ 160`. `postAudShrink` (358): author only, only `aud`, new ⊆ old, I stay in | author | `makePost@9725`, `loadPosts@9762`, `postsPeek@9821`, `postReact@9882`, `postsDropAudience@9745`, `postsCleanup@9753`. |
| `challenges/{weekKey_preset_creator}` (365) | member or invited | `validNewChallenge` (371): keys ⊆ `preset, weekKey, creator, members, invited, names, progress, createdAt`; preset in `h5,h10,g5,s20`; id deterministic; `members == [me]`; `invited` ≤ 100 (unverified uids); own name/progress only; progress 0–10080 | `joinChallenge` (383): invited non-member appends self, own name + progress, **and** `getAfter(challengeJoins/me)` names this challenge and week. `updateMyProgress` (418): member, own entry, never down, ≤ 10080 | creator while sole member | `loadChallenges@10202`, `startChallenge@10240`, `joinChallenge@10261`, `syncChallengeProgress@10220`. Reward = local claim `S.game.claims.challenges`. |
| `challengeJoins/{uid}` (409, v1.18) | owner `get` | `validJoinCounter` (400) and `n == 1` | same week → `n == o.n + 1` (but `n ≤ 1`), new week → `n == 1`; `last` must change; `getAfter(challenges/last)` has me as member, same week, not my own | never | written only in the `joinChallenge@10261` batch. |

### Study sessions (v1.18)
| Path (R:line) | Read | Write | App |
|---|---|---|---|
| `studySessions/{sid}` (493) | `sessVisible` (441): `lobby == 'public'` or `vis == 'link'` or member or invited | create `validNewSession` (447): 23 fixed keys; host/name mine; `title` 1–40 + `cleanText`; `validPattern` (446: focus 1–240, short 1–120, rounds 1–12); `mode` together/synced; `vis` friends/link/public and `lobby` derived from it; `max` 2–10; `members == [me]`; `invited` ≤ 100 only when friends-only; `code` `''` or 8 chars with `getAfter(sessionCodes/code).sid == sid`; all times server. Update `sessUpdate` (464), five branches keyed by affected keys: join (self for public/link/`welcome`, or host with `getAfter(request).status == 'ok'`; `≤ max`), leave/kick, host controls (`pausedAt, pauseTotal, shift, code, lobby, invited, welcome`), hand-over or stale-seat claim (host's `people` doc missing, `left`, or beat > 2 min old), end (any member, or anyone after 6 h). Delete: never. | `sessLoad@21303`, `sessCreate@21332`, `sessJoin@21357`, `sessAnswer@21423`, `sessKick@21435`, `sessHandOver@21442`, `sessMaybeClaimHost@21449`, `sessInvite@21461`, `sessRegenCode@21471`, `sessLeave@21487`, `sessExpire@21321`, `liveClose@21181`, `liveControl@21197`. |
| `…/people/{uid}` (498) | members | own doc, member; keys ⊆ `name, avatar, color, aura, state, sname, min, beat, joinedAt, endAt, left`; `state` in `focus, break, paused, idle, away, left`; `min` 0–1440; `joinedAt`, `endAt`, `left` **all required numbers**; `beat == request.time`. Delete: self or host | `liveBeat@21067` (whole-doc `setDoc`), `liveTeardown@21146`, `sessKick`. |
| `…/reactions/{rid}` (511) | members | `rid == me()`, `validReaction` (936: 🔥👏💪☕👋), ≥ 2 s since my last; delete never | `liveReact@21236`. |
| `…/requests/{uid}` (517) | requester or host | create: own, not a member, `vis == 'friends'`, friend of host, not blocked, `status: 'pending'`; update: host answers once (`ok`/`no`, `by`, `answeredAt`) or requester re-asks ≥ 60 s later; delete: requester or host | `sessAsk@21374`, `sessCancelAsk@21396`, `sessAnswer@21423`, listeners `sessWatchAsk@21384`, `sessWatchRequests@21404`. |
| `sessionCodes/{code}` (533) | `get` any signed-in; `list` never | create: keys `sid`, `getAfter(session).code == code` and host is me; update never; delete: session host | `sessCreate`, `sessRegenCode`, `sessByCode@21504`. |

### Clans (v1.14 – v1.18)
| Path (R:line) | Read | Write (helper) | App |
|---|---|---|---|
| `clans/{cid}` (648) | any signed-in (`get`, `list`) | create: `validClanDoc` (618, 32 keys, name/tag regex + `cleanText`, `levelOk` 580, `earned` 585, `lookOk` 595) plus everything zero, `raidHP == raidHPFor(monthKey, 1)` (611), `dayKeyOk`/`monthKeyOk` (639/643), and the batch must also create `clanOf`, leader member row and `clanNames` (`getAfter`). Update `clanUpdate` (787): 8 branches by affected keys — `clanFocus` 811 (delta == my member row's `contrib` delta, ≤ 1440), `clanCount` 822 (±1 with the named member row really appearing/disappearing), `clanSettings` 832, `clanBuy` 838 (`shopItem` 587 price table), `clanQuest` 846, `clanRaid` 853, `clanGroup` 862 (two real seats), `clanBonus` 804 (== my member row's `bcp` delta). Delete: leader, or last member. | `clanCreate@20507`, `flushContrib@20703`, `clanJoinOpen@20542`, `clanAccept@20563`, `clanLeave@20589`, `clanRemove@20612`, `clanSetDoc@20678`, `clanBuy@20820`, `clanClaimQuest@20833`, `clanClaimRaid@20841`, `liveMaybeCount@21213`, `clanBonusFlush@20194`, `clanDisband@20641`; boards `loadClanBoard@22055`, `clanLoadRank@22489`. |
| `…/private/info` (668) | members | create with the clan; update leader (`leader, code, officerShop, memberSchedule`; a new leader must hold the leader role after the write); delete leader / last member | `clanCreate`, `clanTransfer@20628`, `clanRegenCode@20662`, `clanSetInfo@20672`. |
| `…/members/{uid}` (680) | members | create `validNewMember` (876) in 3 cases (founder, open join, officer accept with request removed in the same write). Update: `memberFocus` 888 (contrib `+≤ elapsed + 240`, clan xp moves by the same amount), `memberLook` 921, `memberRole` 929 (leader only), `memberBonus` 908 (≤ 6/day, today or yesterday by the server clock, not in the first day of membership). Delete: self, leader, officer (plain members) | `newMemberDoc@20528`, `flushContrib`, `syncMemberLook@20777`, `clanFocusStarted@20772`, `clanSetRole@20623`, `clanBonusFlush`. |
| `…/requests/{uid}` (700) | requester (`get`), officers (`get`/`list`) | create: own, no clan yet, approval mode, < 30 members, not blocked by leader; delete: requester or officer | `clanRequest@20551`, `clanCancelRequest@20557`, `clanDecline@20577`. |
| `…/sessions/{sid}` (711) | members | `validStudySession` (941): title 2–40, pattern **focus 5–120, short 1–30, rounds 1–8**, `max` 2–30, repeat preset, tag ≤ 30; RSVP own key only | `clanSchedule@20871`, `clanCancelSession@20887`, `clanRsvp@20891`. |
| `…/live/{lid}` (729) + `people` (744) + `reactions` (761) | members | `validLive` (955, same clan pattern range); host/officer controls; anyone closes; `counted` flips once. People: own doc, same keys as study sessions but `endAt`/`left` optional. Reactions: one doc per person, ≥ 2 s apart | `liveStart@20986`, `liveJoin@21007`, `liveListen@21031`, `liveBeat`, `liveClose`, `liveControl`, `liveReact`, `watchClanLive@20968`. |
| `…/feed/{eid}` (772) | members | create: keys `type, who, n, at`; 8 preset types; `who == myName()`; delete: leader | `clanFeed@20786`, `clanFeedJoin@20797`. |
| `clanNames/{lower}` (966), `clanCodes/{code}` (975), `clanOf/{uid}` (983) | `get` only (`clanOf`: owner) | created only inside the matching batch (`getAfter`); `clanOf` deleted only when the member row goes in the same write | `clanCreate`, `clanByCode@20533`, `clanRefresh@20421`, join/leave/disband. |

## Helper functions and patterns

- **Identity.** `signedIn` (R:26), `me` (27), `myName` (30) = local part of `request.auth.token.email`; `path(col, id)` (31).
  `myName()` does **not** check the domain (`USERNAME_DOMAIN = 'pomodorolist.app'`, A:4940) and nothing checks that
  `usernames/{myName()}.uid == me()`; the only uid↔name anchor is `usernames/{name}` (first writer wins, never updated).
- **Friendship.** `friendDoc`/`pairDoc`/`isFriend` (34–36): id = smaller uid + `_` + larger uid, one `exists` + `get` of the
  same doc. `blockedBy(owner)` (38): `exists(users/{owner}/blocked/{me})`. Rule `get()` ignores the target's read rules.
- **Published totals.** Shape: `updatedAt == request.time`; `room = minutes since the stored updatedAt + 240`; within a period
  key never down and `+≤ room`; a new key starts `≤ room` (`grows` 155, `seasonGrows` 214, `memberFocus` 888). `n`, `o`,
  `room` are bound once with `let` and passed in. The client mirrors every bound before writing (`clampStats@9575`,
  `clampRank@9549`), and on `permission-denied` re-reads the server copy and retries ≤ 2 times.
- **Server calendar.** `seasonKeyNow` (202) builds `YYYY-MM` from `request.time`; `dayKeyOk` (639) / `monthKeyOk` (643) refuse
  keys more than a day / a month ahead; `memberBonus` (915) turns a `YYYY-MM-DD` string into an int to require "today or
  yesterday". Integer division on `toMillis()` is already used (150, 192, 228). Only clan docs and `rankStats` are
  tied to the server calendar; `publicStats` and `challenges` keys are client strings.
- **Deterministic ids = idempotence.** The rule recomputes the id from the data: `friendships` (285), inbox items (312, 314,
  317), `posts` (338), `challenges` (376). With no update branch that fits, a second write of the same thing is refused.
  This only holds while the doc cannot be deleted and re-created by the writer: `posts` and `challenges` can be;
  `challengeJoins` cannot (`delete: false`). **A reward ledger needs `allow delete: if false`.**
- **Two docs in one batch (`getAfter` both ways).** `challenges` join ↔ `challengeJoins` (393, 405–407);
  `sessionCodes` ↔ session `code` (461, 537); clan create ↔ `clanOf`/member/`clanNames` (653–655, 970, 979, 987);
  `clanFocus` ↔ `memberFocus` (814, 900); `clanBonus` ↔ `memberBonus` (805–808, 917); session join ↔ request `ok` (475).
  This is the template for "counter + claimed record".
- **One update rule, many branches.** `sessUpdate` (464) and `clanUpdate` (787) compute `diff().affectedKeys()` once and each
  branch starts with `k.hasOnly([...])`, so untouched fields keep their old, already-valid values. `changed(keys)` (636)
  is the short form. Append-only lists are proven with `n.members == o.members.concat([me()])` (388) or a slice (469);
  shrink-only with `o.aud.hasAll(n.aud)` (361).
- **Lists provable from the query ("rules are not filters").** Each list rule depends on one field the query must repeat:
  `friendships` `users array-contains me` (A:9441); `posts` `aud array-contains me`, also for my own posts (A:9748, 9757,
  9766, 9824) — hence `aud` in all three post indexes; `challenges` `members`/`invited array-contains me` (A:10207);
  `publicStats`/`rankStats` `global == true` (A:10168); `studySessions` `lobby == 'public'`, `invited array-contains`,
  `members array-contains` (A:21307). No `collectionGroup` query exists; the only wildcard is `users/{uid}/{document=**}`.
- **No free text.** Emoji and type enums; `cleanText` (574) on the three typed strings (clan name/tag, session titles, inbox
  `title`); names always `== myName()`.
- **Rate limits.** Reactions 2 s (514, 767); re-ask 60 s (529); stale host 2 min (487); session expiry 6 h (490); kudos
  one per target, nudge one per day (ids); challenge joins 1/week (403); clan bonus 6/day (914); `rankStats` 840 min per
  UTC day (211). Posts' "3 at once, 10 a day" (`makePost@9725`, A:9729–9732) and the friends cap are **client-only**.
- **Optional fields for older apps.** `!('x' in d) || …` (`validAvatar`, `validAura`, `validBig`, `validGardenTotals`, `mode`,
  `second`, `moKey`, `bonus` via `.get('bonus', 0)`). The mirror on the client is a refusal flag per field
  (`SOC.avatarRejected`, `auraRejected`, `clanTagRejected`, `bigRejected`, `gardenStatsRejected`/`gardenProbe`,
  `v19Rejected`, `LIVE.legacy`, all in `writePublic@9474`, `publishRank@9639`, `liveBeat@21067`) so a new app keeps
  working against old rules.

## Budgets and limits

- **1,000 expressions per request** — hit twice. (1) v1.17 rules: `raidHPFor` evaluated the 12-month table three times and
  the six-document clan-creation batch failed in production from 1 Nov 2026; fixed with `let` (comment R:608–610).
  (2) v1.19: season/streak fields added to `publicStats` pushed its update over the limit; fixed by moving them to
  `rankStats` (comment R:169–171), checking only changed keys on update (R:112–114) and computing `room` once (R:153–154).
  There is no local counter: the emulator simply refuses with "maximum of 1000 expressions". Heaviest paths to re-run after
  any edit: `clanCreate` batch, `clanAccept` batch, `flushContrib` transaction, `publicStats` update, `rankStats` update.
  **Do not add fields or checks to `validStats`, `validClanDoc` or `clanUpdate`; add a new document instead.**
- **Console type check is stricter than the emulator.** Commit 102b46b: the Firebase console refused a List/Set ternary the
  emulator accepted (now `d.keys().toSet()` in both arms, R:114). Keep both arms of a ternary the same type.
- **Document lookups per write** (limit: 10 per single write or query, 20 per batch/transaction; counts are distinct
  `get/exists/getAfter/existsAfter` targets read from the rule text, not measured). The file has 94 such calls
  (34 `get`, 22 `exists`, 29 `getAfter`, 9 `existsAfter`).

| Operation | Lookups |
|---|---|
| read a friend's `publicStats`/`rankStats`/`activity`/`presence` | 2 (friendship, blocked); `publicProfiles` 1 |
| `publicProfiles`/`publicStats` write | 0, or 2 when `clanTag` is new or changed |
| `rankStats` write, any `posts` operation, `publicStats` list | 0 |
| `friendships` create | 3 |
| inbox create | 2 (+1 for `sinvite`) |
| challenge join batch | 2 |
| study-session request create | 3; other session writes 0–1 |
| clan create batch (6 docs) | about 15 of 20 |
| `clanAccept` batch (4 writes) | about 13 of 20 |
| `flushContrib` transaction (clan + member) | 5 |
| `liveMaybeCount` (`clanGroup`) | 5 |
| clan join request create | 4 |
| `clanDisband@20641` final batch (A:20649–20658) | 1 new target per other member (`existsAfter` of their member row) plus ~4 shared — **unverified**: a clan of roughly 10–17+ members may pass 20, depending on how repeated lookups are counted |

- **Other limits.** `let` bindings: at most 6 in one function (`sessUpdate`), limit 10. Source 72 KB of 256 KB. Lists capped in
  rules: `aud` 151, `invited` 100, `r` 160, `rsvp` 30, `lastIds` 12.
- **Storage that is never cleaned.** `studySessions` docs (`delete: false`), their `reactions`, `challengeJoins`, clan `feed`
  (leader only). Cleaned by clients: posts after 30 days (`postsCleanup@9753`), inbox after 3 days (`onInbox@10000`, A:10005).
- **Reads/writes (Spark: 50k/20k a day).** v1.20 measured: a new user's first day 52 reads / 38 writes; opening Posts ≤ 51
  reads; opening Friends with 50 friends ≈ 100 reads (`notes/v1.20-report.md` §5). Harness: `harness.js` + `fsio120.mjs`.

## Indexes

All `queryScope: COLLECTION`. The emulator does not enforce indexes (`notes/v1.18-report.md:83`), so index needs are only
ever proven in production.

| # | Collection: fields | Query (app function) |
|---|---|---|
| 1 | `publicStats`: global ↑, dayKey ↑, dayMin ↓ | global Daily board, `loadLeaderboard@10151` (A:10168–10171) |
| 2 | `publicStats`: global ↑, weekKey ↑, weekMin ↓ | global Weekly (Monday start) |
| 3 | `publicStats`: global ↑, weekKeySun ↑, weekMinSun ↓ | global Weekly when `settings.weekStart === 0` (`periodField@10108`) |
| 4 | `publicStats`: global ↑, monthKey ↑, monthMin ↓ | Monthly board — removed in 1.19.1, still used by 1.18/1.19 clients |
| 5 | `publicStats`: global ↑, lifeMin ↓ | global Lifetime |
| 6 | `publicStats`: global ↑, produce ↓ | Garden · Produce (v1.16) |
| 7 | `publicStats`: global ↑, harvests ↓ | Garden · Harvests (v1.16) |
| 8 | `challenges`: members contains, weekKey ↑ | `loadChallenges@10202` (A:10207) |
| 9 | `challenges`: invited contains, weekKey ↑ | `loadChallenges@10202` (A:10207) |
| 10 | `clans`: weekKey ↑, weekMin ↓ | weekly clan board, `loadClanBoard@22055` (A:22061) |
| 11 | `clans`: weekKey ↑, weekMin ↑ | "my clan's rank" counts (`weekMin > v`), `loadClanBoard@22055` (A:22067), `clanLoadRank@22489` (A:22494) |
| 12 | `studySessions`: lobby ↑, createdAt ↓ | public lobby, `sessLoad@21303` (A:21307) |
| 13 | `rankStats`: global ↑, seasonKey ↑, seasonMin ↓ | Ranks board |
| 14 | `rankStats`: global ↑, streakDay ↑, streak ↓ | Streaks · Current (`streakDay in` 4 days, A:10170) |
| 15 | `rankStats`: global ↑, bestStreak ↓ | Streaks · Best |
| 16 | `posts`: aud contains, at ↓ | feed `loadPosts@9762` (A:9766), dot `postsPeek@9821` (A:9824) |
| 17 | `posts`: aud contains, author ↑, at ↑ | `postsCleanup@9753` (A:9757) |
| 18 | `posts`: aud contains, author ↑, at ↓ | `postsDropAudience@9745` (A:9748) |

- Single-field (automatic) queries: `friendships` `users array-contains`; inbox `orderBy createdAt desc limit 20`;
  `studySessions` `invited`/`members array-contains`; clan `feed` `orderBy at desc`, `live` `open == true`; all-time clan board
  `orderBy xp desc`; session `reactions` `orderBy at desc limit 8`, `requests` `status == 'pending'`.
- **Unverified:** the "my place below the top 50" count on `publicStats`/`rankStats` (`getCountFromServer` with
  `where(f.min, '>', mine)`, A:10174) has only descending indexes, whereas `clans` got a separate ascending one (#11) for the
  same shape. A failure is caught and shown as "This leaderboard needs a Firestore index" (A:10180).

## How a new collection was added before

Test suites are **not in the repository**. They are in the session scratchpad (may be cleared):
`/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/fb/` — `cl-common.mjs` (exports `device`,
`signup`, `tryOp`, `owner`, `ownerGet`, `ownerCreate`, `check`), `firebase.json` (Auth 9099, Firestore 8080, rules file
`firestore.rules` next to it), `site2.sh` (copies `index.html` with emulator config), `runall.sh`, and the suites below.
`tryOp(device, src)` runs a raw `FB.*` call in the page as that user and returns `'ALLOWED'` or the error code;
`owner`/`ownerGet` write/read as admin to seed and inspect.

**`posts` (v1.20, commit d4a5498)**
1. Shape chosen so the rules need no lookups: id `type_author_ref` (a repeat becomes an update no branch allows), audience
   stored on the post (one query per feed, provable from the query), reactions as a map keyed by uid.
2. One new `match` block and three functions (R:320–362); nothing existing touched.
3. Three composite indexes (#16–18); `aud` had to be in the own-post indexes because the read rule depends on it.
4. Client: `makePost`, `loadPosts`, `postsPeek`, `postReact`, `postsDropAudience`, `postsCleanup`; a "feed is being set up"
   state when the index is missing (`POST.err = 'index'`, A:9772); demo data through `previewFirestore@17603`.
5. Attack suite `v120d.mjs` §11: 15 refused (`asSomeoneElse, wrongId, freeText, badType, bigN, noSelf, badRef, addAud,
   reactOthers, reactBadEmoji, reactForSomeoneElse, editOther, deleteOther, listAll, reactOwn`) + 2 positive controls;
   plus duplicate tests (reload, second device, raw second write, offline then online). 7-day two-device run `v120e.mjs`.
6. Report: rules summary, index table, usage before/after; deploy order rules → indexes (wait for Enabled) → upload.

**`studySessions` (v1.18)**
1. Reused the clan live engine: `liveDoc`/`liveCol`/`liveRefFor` (A:20932–20934) pick `clans/{cid}/live/{lid}` or
   `studySessions/{lid}`, so `people` and `reactions` rules were copied from the clan ones.
2. Rules R:427–540: field-by-field create, five update branches, three subcollections, `sessionCodes`, and an extension of
   an existing rule (`validInboxItem` got the `sinvite` type, R:315–317).
3. One index (#12), added when the lobby query gained `orderBy createdAt`.
4. Suite `v118c.mjs`: 8 stranger attacks (see, join, write presence, ask, approve as non-host, approve own request, close a
   fresh session…), seat cap, 60-s gap, stale host seat, 6-h expiry. Related: `v118b.mjs` (join counter, 6 attacks),
   `v118e.mjs` (bonus Clan Points, 9 attacks).
5. An independent review after the phase found two holes (a new clan could start with any `bonus`; `memberBonus` accepted
   any past day) — fixed with attack tests (`notes/v1.18-notes.md`, "Self-review fixes").
6. v1.19.1 follow-up: the pattern range copied from clans (5–120) refused long presets; widened to the preset editor's
   range, with a client pre-check `sessPatternProblem@20215` and message `sessCreateDenied@21326`.

Standing suites to re-run after any rules edit: `sec143.mjs` (68 attacks, table `sec143-table.md`), `sec116.mjs` (27),
`v119b.mjs` (11 rank/streak attacks), plus the three above.

## What v2.0 will need

### What published documents can and cannot prove today
| Document | Fields | Verified by rules | Not verified |
|---|---|---|---|
| `publicStats` | `dayKey/dayMin`, `weekKey/weekMin`, `weekKeySun/weekMinSun`, `monthKey/monthMin`, `lastWeekKey/lastWeekMin`, `lifeMin`, `produce`, `harvests`, `updatedAt` | owner; server `updatedAt`; **between two updates** growth ≤ real minutes elapsed + 240 | any value on create (`createLimits` is `true`); owner may delete and re-create (sec143 row: 1,000,000 lifetime minutes ALLOWED); day/week keys are client strings |
| `rankStats` | `seasonKey/seasonMin/prevPeak`, `streak/bestStreak/streakDay`, `joined`, `updatedAt` | server UTC month; `seasonMin ≤ 840 × UTC day`; a new doc starts ≤ 240; growth ≤ elapsed + 240; `streakDay` not in the future | `joined` and the first `bestStreak` are self-reported; delete + re-create resets `joined` |
| `publicProfiles` | `hours`, `streak`, `longest`, `joined`, `level` | owner, type and range | everything else; no growth bound; `joined` mutable |
| `activity` | `days` (84 days of minutes), `goalDays`, `recent` | owner; newest session ≤ 240 min | all values; no growth bound |

**"3 hours of focus across 3 different days within 14 days" cannot be proven from any existing field.** `lifeMin ≥ 180` is
true one second after sign-up (unbounded create); `rankStats.seasonMin` may be 240 on create; `activity.days` is unchecked.
The only things rules can prove are **server-clock facts**: when a document was created, how much real time lies between
two writes, and how many separately spaced writes happened. Minutes stay self-reported, as everywhere in this app.

### Referrals, activation, invite rewards (Phase 7a) — cheapest safe design
- `referrals/{inviteeUid}` — id = the invitee's uid (one per account, ever); `delete: false`.
  - **create** (invitee): `me() == uid`; `inviter != me()`; `get(usernames/inviterName).uid == inviter` (the
    `validRequest` pattern); `name == myName()`; `days == 0`, `min == 0`; `createdAt == request.time`.
  - **New account:** no auth-token claim carries the creation time. Options: (a) same batch as the first
    `usernames/{myName}` write (`!exists` + `getAfter`); (b) add an optional server-time `at` to `usernames` (`hasOnly(['uid',
    'at'])`) and require it to be younger than a few days. Either way set `usernames` `allow delete: if false`, otherwise an
    old account deletes and re-creates its entry (no 1.19–1.20 build deletes it, so this is compatible). `initSocial@9435`
    (A:9454) must then write `usernames` and the referral together.
  - **check-in update** (invitee): only `days, min, lastAt, doneAt` change; `days == o.days + 1`; `o.days == 0 ||
    request.time >= o.lastAt + duration.value(18, 'h')` (time-zone neutral "different day"; or an integer UTC day number
    `request.time.toMillis() / 86400000`); `min` never down and `+≤ 240` per check-in; `request.time < o.createdAt + 14 d`;
    `doneAt == request.time` allowed only when `days ≥ 3 && min ≥ 180`. Zero lookups.
  - **claim update** (inviter): `o.inviter == me()`, `'doneAt' in o`, `!('claimedAt' in o)`, only `claimedAt ==
    request.time`, and `getAfter(inviteStats/me).last == uid`.
  - **read:** invitee or inviter; `list` with `where('inviter', '==', me)` (single-field index; add `inviter ↑, createdAt ↓`
    only if the invite page sorts by date).
- `inviteStats/{inviterUid}` `{ n, last, at }` — the `challengeJoins` pattern: `n == o.n + 1` (create: 1), `last` changes,
  `getAfter(referrals/last)` has `inviter == me()` and `claimedAt == request.time`; cap `n`; `delete: false`; `get` for any
  signed-in user (profile line "Brought N friends" — do **not** add it to `publicProfiles`).
- Proven: one referral per account, never self, inviter exists, three check-ins spaced over real days inside 14 days, each
  invitee counted once, milestone count monotonic. **Not provable:** that the 180 minutes were real, and that coins or
  invite-only cosmetics granted in `users/{uid}` are legitimate (cosmetic ids in `publicProfiles` are unchecked strings
  today). Keep rewards cosmetic and capped; say so in the report.
- **Auto-connect:** do not let a referral create an accepted friendship — `?ref=<username>` is public, and a friend can read
  `activity` and `presence`. Have the new user send an ordinary pending request (existing rule, no change; an inviter still
  on 1.18–1.20 sees a normal request). `?invite=<username>` already exists: `inviteLink` (A:9980), `captureInvite@9985`,
  `handleInvite@9991` (uses `confirm()`).
- **Clan Points on activation:** would need a ninth `clanUpdate` branch (expression budget). Cheaper: route through the
  existing `memberBonus`/`clanBonus` pair (≤ 6 a day, not in the first day), or cut.
- **Buddy boost / Pass XP:** local data, no rules; read `referrals/{me}` once for inviter and date.

### Friend Streaks (Phase 6.5)
- `friendStreaks/{a_b}` (same id scheme as `friendships`): `users` (sorted pair), `status` pending/on, `n`, `last`, `d`
  (map uid → integer UTC day number), `updatedAt`. Read `me() in users` (query `users array-contains me`, automatic index).
- create: `isFriend(other)` (one lookup), id recomputed; accept by the other user (the `acceptByRecipient` pattern).
- mark: only my own key in `d` changes, value in `[today − 1, today + 1]` by the server clock and never back; `n` may become
  `o.last == D − 1 ? o.n + 1 : 1` only in the write after which both marks equal `D` and `o.last != D`; else `n`, `last`
  unchanged. Integer days make "consecutive" one comparison (string dates need the R:915 arithmetic). Zero lookups.
- Proven: only the two friends write, one step per day, no back- or far-forward-dating, nobody marks for the other.
  **Not provable:** the 25 minutes (a `get(publicStats/me).dayMin` cross-check is forgeable). The "up to 5" cap needs a
  counter doc to be server-side; a client cap is enough (over-cap harms nobody).
- Cost: ≤ 5 writes a day per user, ≤ 5 reads per load, no listener.

### Buddy Quest (Phase 6.6)
- Do **not** add a preset to `challenges`: 1.18–1.20 clients read every challenge they are invited to and index
  `CHALLENGES[c.preset]` without a guard (`challengeProgress@10192` A:10195, `syncChallengeProgress@10220` A:10230,
  `renderChallenges@10537` A:10543)
  — an unknown preset throws there.
- New `buddyQuests/{weekKey_a_b}`: copy `validNewChallenge`/`updateMyProgress`, exactly two members who are friends (one
  lookup), `weekKey` checked with `dayKeyOk`, progress own key only, never down, and (better than `challenges`)
  `+≤ elapsed + 240` using `updatedAt`. One a week per user = the `challengeJoins` counter pattern, or client-only.
- The combined goal is read from the doc; the reward is a local `claimOnce@11780` keyed by the quest id (as challenges).

### Strict mode and the table Pact (Phase 6.7)
- Strict mode alone is local. Presence already has `state: 'away'` after 2 hidden minutes (`liveMyState@21061`).
- Pact on `studySessions`: optional `pact` bool at create (extend `validNewSession` keys and the host-controls branch) and an
  append-only `broken` list — a sixth `sessUpdate` branch `k.hasOnly(['broken', 'updatedAt']) && n.broken ==
  o.get('broken', []).concat([me()]) && me() in o.members`. Keep it on the session doc: a `people` doc can be deleted and
  re-created by its owner. Optional `strict` bool in the `people` key list shows who takes part.
- Proven: nobody clears a break or reports one for someone else. **Not provable:** that a member reported their own break.
  Members on 1.18–1.20 never report; treat a seat without `strict == true` as "not in the pact".

### Compatibility with 1.18–1.20
- Rules changes must be additive: new `match` blocks, new optional keys, new branches. Never tighten a check an old client
  can fail. `monthKey`/`monthMin` stay required in `validStats`.
- Old clients write `publicProfiles`, `publicStats`, `rankStats`, `activity`, `presence` and `people` with whole-document
  `setDoc`, so any new field there disappears whenever an old device publishes. Never keep once-only or monotonic v2.0
  state in those documents.
- New inbox item types: 1.18–1.20 `onInbox@10000` (A:10016–10022) renders every type other than `nudge`/`sinvite` as kudos ("@x sent
  undefined for your session") and calls `floatEmoji(undefined)`. Either send `emoji` (and a `target` starting `st_`) so old
  clients show a sensible kudos, or carry invitations in the new collection itself (a `pending` status).
- New post types: add to the `type` list in `validPost`; 1.20 hides unknown types (`loadPosts@9762`, A:9768) but its dot
  (`postsNewest@9811`) still lights.
- A new app against old rules (file uploaded before rules are published) needs a refusal fallback per new write, like the
  existing `*Rejected` flags.

### Existing gaps noticed while reading (from the rule text; none reproduced on the emulator)
1. `myName()` accepts any email domain: an account `name@other.tld` created through the Auth API would pass every
   `== myName()` check as `name` (profile, friend requests, posts, sessions) though it cannot take `usernames/name`. Not in
   `sec143`/`sec116`. One-line hardening: require `request.auth.token.email.matches('^[a-z0-9_]{3,20}@pomodorolist[.]app$')`
   in `signedIn()`.
2. `posts.aud`, `challenges.invited` and `studySessions.invited` accept any uids. Posts and challenges are filtered by
   friendship on the client (A:9768, A:10210–10211); the session lobby is **not** (`sessLoad@21303` A:21307–21315,
   `renderSessionsPage@21604` A:21618), so a stranger's friends-only session naming my uid appears in my lobby. A stranger can also
   fill the 50-row feed query with posts the client then hides. The Calendar must filter invited sessions by friendship.
3. Study-session presence requires `endAt` and `left` (R:507), but `liveBeat@21067` (A:21073–21076) sends them only in Focus-together
   mode, so presence writes in a **Synced** study session look refused (the harness ignores `permission-denied` console
   lines; `v118c` checks only that the session doc is written).
4. `clanDisband` lookup count for large clans (see Budgets).
