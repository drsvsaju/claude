# HTML markup — index.html lines 3795–4916

Mapped at commit 77f8456 (v1.20). Line numbers drift: search by the id / class / function NAME beside each number.
Slice size: `<head>` 1–8 (CSS 9–3793 is in maps 01/02), `<body>` markup 3795–4915, main `<script>` opens at 4916.
Counts in the markup: 550 ids (no duplicates), 36 `<dialog>` (all static — JS never creates one), 16 `<section class="tab">`,
188 `<button>` (98 without a `type`, none of those inside a `<form>`), 97 form fields, 4 `<form>`, 108 inline `style=""`, 44 inline SVGs.
Render-function line numbers below are in the main script; they were found by grepping the host id.

## Structure

### Direct children of `<body>`, in file order

| Line | Element | Shown / filled by | Notes |
|---|---|---|---|
| 3796 | `<svg>` defs, `clipPath#avClip` | `avatarArt`, `cardImageSVG` | shared clip for 24×24 avatars |
| 3797–3799 | `div.intro.hidden#intro` `role="dialog" aria-modal="true" aria-label="Welcome to Pomodorolist"` | `playIntro` 19837 / `endIntro` 19872 | `#inLine` (aria-live), `.in-cur`, `#inPomeo`, `button#inSkip` |
| 3800–3821 | `div.splash#splash aria-hidden="true"` | inline script 3822; removed from the DOM by `hideSplash` 16622 | `#spGreet`, `#spPomeo` (own hard-coded Pomeo SVG: groups `.sp-ec .sp-eo .sp-eh .sp-smile .sp-yawn`), `b.sp-logo`, `.sp-vine role="progressbar"` (driven by CSS var `--sp`), `p#spQuote` |
| 3822–3876 | inline `<script>` (IIFE) | — | see below |
| 3879 | `div.boot#bootView` ("Loading…") | `showView` 6041 | not `.hidden` at load |
| 3882–4010 | `section.auth.lp.hidden#authView` | `showView`, `showAuth`, `lpSetup` 17288, `initLanding` 17208 | welcome page + auth card |
| 4013–4559 | `div#appView.hidden` | `showView`, `startSession` 6054 | preview banner, header, shell, bottom bar |
| 4562–4679 | 16 dialogs: `otIdleDlg rankLadderDlg sessHostDlg clanCreateDlg clanJoinDlg clanCardDlg clanInviteDlg clanShopDlg clanSchedDlg clanSettingsDlg confirmDlg planDlg deckDlg fcDlg todoDlg remDlg` | see dialog table | comment at 4561 says "Reminder editor" but the first dialog is `otIdleDlg` |
| 4682 | `dialog#calDlg` | `openCal` | |
| 4694–4705 | `div.pomeo-pop.hidden#pomeoPop role="alertdialog" aria-labelledby="popText"` | `showPomeoPop` 11059, `closePop` | buttons `#popStart #popSnooze #popDismiss` |
| 4708–4771 | `squadDlg eggDlg collDlg rewardDlg loginDlg examDlg tplDlg inboxDlg` | | |
| 4774–4778 | `dialog#cmdDlg.cmd` | `openCmd` 16416, `renderCmd` 16403 | |
| 4780 | `div.net-banner#netBanner role="status" aria-live="polite"` | `netBanner()` | offline banner |
| 4781 | `div.ptr#ptr aria-hidden` | `ptrRefresh` | pull-to-refresh spinner |
| 4784–4811 | `gdDlg rmShareDlg keysDlg` | | |
| 4814–4822 | `div.wrapped.hidden#wrapped role="dialog" aria-modal="true" aria-label="Wrapped"` | `openWrapped` 15340, `wrShow`, `closeWrapped` | `.wr-bars`, `button.wr-close`, `button.wr-nav.prev/.next`, `.wr-slide` (all class-only, no ids) |
| 4825–4880 | `presetDlg migrateDlg cardDlg shareDlg levelDlg` | | comment "Level-up moment" at 4856 sits above the player-card dialogs; `levelDlg` is at 4874 |
| 4882 | `div#themeFx.hidden` | `themeFx()` 19760 | theme effect layer |
| 4883 | `div#todSky.hidden` (`i.sky-sunrise .sky-day .sky-sunset .sky-night`, `.sky-stars`, `.sky-rain`) | `renderSky` 19173 | |
| 4884–4885 | `div#cardView.hidden` (`.cv-brand`, `#cvCard`, `a#cvMake`) | `showSharedCard` 19659 | the read-only shared player card page (`#card=…` hash); a 4th top-level view |
| 4886 | `div#glassBg` (`i.g1–g4`) | CSS only (`:root[data-glass]`) | no JS reference |
| 4887 | `div#atmo` (`i.a-focus .a-deep .a-break`) | `renderAtmo` | |
| 4888–4889 | `canvas#starCanvas.hidden`, `canvas#fxCanvas.hidden` | `sizeStars`/`setStarfield`, `startFx` | |
| 4890 | `div.toasts#toast role="status" aria-live="polite"` | `toastHost` 5072, `toast` 5077 | **re-parented into the top-most `dialog[open]`** while one is open |
| 4891–4902 | `dialog.pv-dlg#pvDlg`, `dialog.tut#tutDlg` | `previewPrompt` 17665; `startTutorial`/`renderTut` 16936 | |
| 4903 | `div.tip-pop.hidden#tipPop role="status"` | `maybeTip` 17052, `hideTip` | one-time per-tab tip (`TIPS` 17039); `button#tipOk` |
| 4904–4912 | `div.tour.hidden#tour role="dialog" aria-modal="true"` | `startTour` 18529, `placeTour` 18544, `endTour` | `.tour-spot`, `.tour-tip` (`#tourPomeo #tourStep #tourText #tourSkip #tourNext`) |
| 4913 | `div.achcard#achCard aria-live="polite"` | `nextAch`, `queueSegs` | achievement card |
| 4914 | `<noscript>` | — | one unstyled line |

Views: `showView(id)` 6041 toggles `.hidden` across exactly `['bootView','authView','appView','cardView']`. Everything from 4562 on is a body child
outside `#appView`, so dialogs/overlays exist on the welcome page too (`pvDlg`, `tutDlg`, `intro` rely on that).

### Inline loading-screen script, 3822–3876 (runs before the app script)
- Reads `localStorage`: `pomodorolist-motion`, `pomodorolist-theme`, `pomodorolist-calm`, `pomodorolist-festive`.
- Sets `<html data-motion>` (stored value, else `reduced` when `prefers-reduced-motion`, else `full`) and `<html data-theme>` (only for `dark`/`light`). These are the first paint's theme hooks — the 21 skins are NOT known here (they live in synced state), so the splash can only be light/dark.
- `#splash.calm` when True Minimalist (`pomodorolist-calm === '1'`).
- `#spGreet` text by hour (with emoji), `#spQuote` from a hard-coded array `Q` (40 quotes) plus `EVQ` — **a second, hard-coded copy of the event calendar** (11 date ranges, 2026-10-01 … 2027-09-30) that must stay in step with `EVENTS` in the main script.
- Exposes `window.__spT0` (start time) and `window.__spSet(v)` (progress 0–1 → `--sp` on `#splash`); the main script calls `__spSet(.4)` at 19054 and `hideSplash` calls `__spSet(1)`. A 260 ms interval creeps progress to 0.86 until `#splash` leaves the DOM.

### Welcome / auth view — `section#authView` 3882–4010
```
#authView.auth.lp
├ .lp-scrim#lpScrim (aria-hidden)                       click → lpCloseAuth
├ .lp-top > .lp-wrap
│  ├ .lp-auth#lpAuth > .card.auth-card#authCard [role=dialog aria-modal=false aria-labelledby=authLead]   3887–3930
│  │    #authClose ✕ · .seg.auth-tabs#authSeg [role=tablist] (Sign up / Log in, data-mode) · p#authLead
│  │    form#authForm novalidate: #authUser, #authPass (+Show), #pwMeter, #confirmWrap(#authPass2 +Show, #pwWarn), #authStay, #authError[role=alert], #authSubmit
│  │    .auth-or · .auth-foot (button[data-guest]) · #configWarn.hidden
│  ├ .lp-bar (.auth-brand, #lpLoginTop[data-mode=login])
│  ├ .lp-hero: .lp-greet(#lpPomeo, #lpHi) · h1.lp-h1 · p.lp-sub · ul.lp-badges · .lp-cta(#lpLoginHero, #previewBtn, .lp-create[data-mode=signup], #guestBtn[data-guest]) · #lpCtaNote · #lpAlert[role=alert]
│  ├ .lp-peek [role=img] — static fake app window (.pk-win: #pkTime "18:42", .pk-bars with inline --h, .pk-boss) + ul.pk-chips
│  └ .lp-look: #lpSwatches[role=radiogroup] (JS), .seg.lp-gl#lpGlass[role=radiogroup] (Plain / Glossed / Extra glossy, data-lpgl)
│  a.lp-more-link → #lpFeatures
└ .lp-below
   ├ section#lpFeatures: h2#lpFeatTitle, #lpFeats (JS)
   ├ section: h2#lpCmpTitle, .lp-cmp[role=table] (static head row + #lpCmpRows JS)
   ├ section: h2#lpFaqTitle, #lpFaq — 5 static <details> (one is #lpPrivacy)
   ├ section.lp-final: h2, buttons [data-lp-signup] [data-lp-preview]
   └ footer.app-foot.lp-foot (GitHub, mailto, issues, [data-lp-privacy])
```
Wiring: one delegated click on `#authView` (17302) handles `[data-lpth] [data-lpgl] [data-mode] #previewBtn [data-lp-preview] [data-lp-signup] [data-lp-privacy] .lp-more-link`;
`lpOpenAuth` 17265 / `lpCloseAuth` 17277 toggle `#authView.auth-open`, `#lpScrim.on`, `<html>.lp-modal` (card is beside the hero ≥ 900 px, a window/bottom sheet below);
`lpSetup` toggles `#authView.lp-back` for returning devices. `#pkTime` and `#lpCtaNote` have no JS reference (pure static).

### App shell — `div#appView` 4013–4559
```
#appView
├ .pv-banner.hidden#pvBanner [role=region]   (.pv-go, .pv-exit)                    4014
├ header.top                                                                      4015–4031
│  ├ .hdr-left: #navBurger[aria-controls=tabs aria-expanded] (+#navBurgerDot) · button.brand#brandBtn · span#navCur (aria-hidden) · span.sync#syncStatus
│  └ .hdr-right: #cmdBtn · #inboxBtn (+#inboxCount) · #bagBtn.hidden (+#bagDot) · #coinPill.hidden · #lvChip.hidden · #rankChip.hidden · #avatarBtn.hidden
├ .shell#shell                                                                    4032–4549
│  ├ nav.sidenav#tabs [aria-label=Main]                                           4033–4056
│  │    .nv-top (#navBrandBtn, #navClose) · 4 × .nv-grp[role=group] · .nv-foot (#navCollapse)
│  └ main  → 16 × section.tab                                                     4057–4548
├ nav.tabs.btmbar#btmBar [aria-label="Main sections"]                             4550–4557
└ .nav-scrim#navScrim                                                             4558
```
- **`#tabs` (id) is the sidebar; `.tabs` (class) is the phone bottom bar.** `syncSegs` 5172 treats `.seg, .tabs` alike (sliding pill).
- Sidebar items (`#tabs [data-tab]`, in order): Focus → `timer`, `reminders`(#remTabBtn) · Progress → `stats`, `garden`(#gardenTabBtn, #gardenDot), `quests`(#questTabBtn, #questDot), `profile`(#profileTabBtn, #profileDot) · Social → `friends`(#friendsBadge), `posts`(#postsTabBtn, #postsBadge), `sessions`(#sessTabBtn, #sessBadge), `clan`(#clanTabBtn, #clanDot), `board`(#boardTabBtn) · solo → `shop`(#shopTabBtn). Shortcut hint is only in each `title` ("Timer (1)", "Posts (O)" …).
- Bottom bar: `timer`, `reminders`, `quests`, `stats`, `clan`, then `#navMore` (`aria-controls="tabs"`, `#navMoreDot`). Two bar items carry `i.tbadge[data-dot]` — `data-dot` is read by nothing; `navMirror` 22925 copies state from the sidebar item's `.tbadge`.
- Nav code: `navMode/navEl/navOpen/navMark/navMirror/navMini/navOrder` 22883–22953; clicks: `#tabs` 18696 and `#btmBar` 22962 → `showTab(tab)` 10695. `navMark` sets `.active` + `aria-current`; `renderHeaderChip` 9094–9098 hides `shop/quests/garden/posts` buttons in True Minimalist; a MutationObserver on `#tabs` class changes re-runs `navMirror`.
- Tab switching: `showTab` toggles `.active` on `.tab` by `'tab-' + name`, restores scroll from `scrollMem`, then calls that tab's render. `settings`, `about`, `room` highlight `profile` in the nav. `bag`, `room`, `settings`, `about` have no nav button (reached from `#bagBtn`, Profile buttons, `[data-go-about]`).

### The 16 `<section class="tab">` (DOM order ≠ nav order)

| Line | id | Static markup inside | Empty hosts → render function |
|---|---|---|---|
| 4059 | `tab-timer` | `.mason.timer-cards[data-keep2]` with 7 cards: timer card 4065, Session 4116, `#examCard` 4149, Today 4150, `#gardenPeek` 4162, `#tipCard` 4164, Recently used 4169 | `#liveBar` `renderLiveBar` 22461 · `#greet` `renderGreeting` 5526 · `#newsSlot` `newsCheck` 16275 · `#eventSlot` `renderFestive` 17941 · plus the per-card hosts in "Static vs rendered" |
| 4180 | `tab-reminders` | `h1` Reminders, `#remAdd`, `p.rem-note` | `#remPerm`+`#remBody` `renderReminders` 11161 · `#remSeg` `renderRemSeg` 19979 · `#todoBody` `renderTodos` 19970 · `#cardsBody` `renderCards` 15064 |
| 4195 | `tab-quests` | — | `#questBody` `renderQuests` 12505 (boss / questline / Study Pass views) |
| 4200 | `tab-bag` | — | `#bagBody` `renderBag` 18132 |
| 4205 | `tab-stats` | `.stats-head`: `.seg#statsSeg` (Day/Week/Month/Year, `data-view`), `.range-nav` (`#prevBtn #rangeLabel #nextBtn`) | `#wrappedSlot` `renderWrappedBanner` 15292 · `#tiles`+`#statsBody` `renderStats` 7152 · `#planSlot` `renderPlanCard` 15225 · `#subStatSlot` `renderSubStat` 15812 · `#energySlot` `renderEnergyCard` 17155 · `#gardenSlot` `renderGardenSlot` 14495 |
| 4229 | `tab-garden` | — | `#gardenBody` `renderGarden` 14467 |
| 4234 | `tab-friends` | `.seg#friendsSeg` (Friends `#reqCount` / Challenges) | `#friendsBody` `renderFriends` 10293 → `renderFriendsList` 10323 / `renderChallenges` 10537 / `renderFriendProfile` 10581 |
| 4245 | `tab-posts` | — | `#postsBody` `renderPostsPage` 9845 |
| 4250 | `tab-sessions` | — | `#sessBody` `renderSessionsPage` 21604 |
| 4256 | `tab-clan` | — (comment above it says LEADERBOARD) | `#clanBody` `renderClan` 21821 |
| 4260 | `tab-board` | — | `#boardBody` `renderBoardTab` 10525 → `renderBoard` 10454 / `renderClanBoard` 22077 |
| 4265 | `tab-shop` | — | `#shopView` `renderShop` 9311 |
| 4270 | `tab-profile` | — | `#profileHead`+`#progressView` `renderProfile` 9125, `renderProgress` 9191 |
| 4276 | `tab-room` | — | `#roomBody` `renderRoom` 14803 |
| 4281 | `tab-settings` | fully static: `.set-wrap` > `#settingsBack`, `.set-search`(`#setSearch`), `#setNone`, 7 `.card.set-sec` (`#sec-timer #sec-sounds #sec-appearance #sec-notify #sec-friends #sec-account #sec-about`), footer | values only: `renderSettings` 7258, `renderUisSettings` 15947, `renderPrivacy` 10674 (`#postTypes`, `#inviteDesc`, `#blockedList`), `renderAccount` 6213 |
| 4524 | `tab-about` | static hero, Privacy, Credits cards, footer | `#aboutPomeo`, `#changelog` `renderAbout` 16270; `.appver` (2 places) set in `renderSettings` |

Timer card internals (4065–4114), in DOM order: `.pomeo-host#pomeoHost` (`#pomeoBtn`, `#pomeoBubble`) · `#parkBtn` · `.park-pop#parkPop` (`#parkInput`, `#parkSave`) · `#muteBtn.corner` · `#phaseLabel` · `#roundDots` ·
`.ring#ring` (`.ring-glow`, `.ring-burst`, `#ringTrail`, `<svg>` with `#ringGrad`/`#ringGradEv` gradients, `g#ringDots`, `circle.track`, `circle.prog#ringProg`; `.ring-center` > `#timeText`, `#ringSub`) ·
`#otLine` · `.controls` (`#resetBtn`, `#mainBtn > span.mb-lbl`, `#skipBtn`) · `#quickStart` · `#subCheck` (`#subN`, `#subBar`, `#subCheckAdd`, `ul#subCheckList`, `#subQuick > #subQuickInput`) ·
`#noteRow.after-row` (`#sumHead`, `#energyRow`, `#subSum`, `.note-row`: `#noteInput #noteSave #noteSkip`, `.after-acts`: `#revSchedule`) · `#parkPanel`.
`#ring` is referenced from ~36 places (ring styles, trail, stamps, floaters): its child structure is a contract.

Settings sections (50 `.setting[data-k]` rows in all): `sec-timer` 4290 (7) · `sec-sounds` 4322 (9) · `sec-appearance` 4363 (13) · `sec-notify` 4419 (7) · `sec-friends` 4451 (`#privacyGuest` row, `#privacyCard` wrapper with 5 rows + `details#postTypesBox` + `#blockedList`) · `sec-account` 4483 (3) · `sec-about` 4500 (4).

### Dialogs (all `<dialog>`, opened with `showModal()` — 38 call sites)

| Line | id · class | Name source | Purpose · opener | Static controls inside | JS-filled host |
|---|---|---|---|---|---|
| 4562 | `otIdleDlg` · ot-dlg | labelledby `otIdleTitle` | overtime "Were you still focusing?" · `otAsk` | `#otIdleNo` (text set by JS), `#otIdleYes` | `#otIdleBody` |
| 4567 | `rankLadderDlg` · rkl-dlg | labelledby `rklTitle` (JS-rendered, 12304) | rank ladder · `openRankLadder` 12309 | `#rklBoard`, `#rklClose` | `#rklBody` |
| 4568 | `sessHostDlg` · hs-dlg | labelledby `hsTitle` (JS, 21645) | host a study session · `openHostSheet`, `hostSheetDraw` 21678 | — | `#hsBody` (`hostSheetHTML`: radios, `input[type=time]#sessTime`, `select#sessPreset`) |
| 4569 | `clanCreateDlg` · clan-dlg | `ccTitle` | create clan · `openClanCreate` 22113 | `#ccName`, `#ccTag`, `select#ccDesc`, `#ccErr`, `#ccCancel`, `#ccSave` | `#ccDesc` options |
| 4578 | `clanJoinDlg` · clan-dlg | `cjTitle` | join by code · `openClanJoin` | `#cjCode`, `#cjErr`, `#cjCancel`, `#cjFind` | — |
| 4584 | `clanCardDlg` · clan-dlg | `aria-label="Clan"` | clan preview · `openClanCard` 22096 | `#clanCardClose`, `#clanCardGo` | `#clanCardBody` |
| 4588 | `clanInviteDlg` · clan-dlg | `ciTitle` | invite code/link · `openClanInvite` 22123 | `#ciCodeCopy`, `input#ciLink[readonly data-copyfield]`, `#ciCopy`, `#ciShare[data-native-share]`, `#ciRegen`, `#ciClose` | `#ciMode`, `#ciCode` |
| 4595 | `clanShopDlg` · clan-dlg cshop-dlg | `csTitle` | clan shop · `openClanShop`, `renderClanShop` 22135 | `.seg#csTabs` (4 buttons `data-cst`), `#csClose` | `#csPts`, `#csNote`, `#csGrid` |
| 4603 | `clanSchedDlg` · clan-dlg | `csdTitle` (text changed by JS) | schedule / study now · `openClanSched` 22153, `setSchedMode` | `select#csdName`, `#csdOwn`, `.mode-seg#csdMode` (2), `select#csdPattern`, `input[type=date]#csdDate`, `input[type=time]#csdTime`, `select#csdRepeat`, `#csdDays` (7 day buttons `data-d`), `#csdTag`, `input[type=number]#csdMax`, `#csdErr`, `#csdCancel`, `#csdSave` | options of `#csdName`, `#csdPattern` |
| 4622 | `clanSettingsDlg` · clan-dlg | `cstTitle` | clan settings · `openClanSettings` 22177 | `#cstClose` | `#cstBody` (2 checkboxes `#cstShop #cstSched`, `select#cstTo`) |
| 4627 | `confirmDlg` · clan-dlg | `cfTitle` (empty until opened) | **the existing promise-based confirm** · `confirmDlg({title, body, ok, danger, type})` 22191 (13 callers) | `#cfType` (type-to-confirm), `#cfNo`, `#cfOk` | `#cfTitle`, `#cfBody` |
| 4633 | `planDlg` · plan-dlg | `planDlgTitle` | weekly subject plan · `openPlanDlg` 15251 | `datalist#plNames`, `#plAdd`, `#plErr`, `#plCancel`, `#plSave` | `#plRows` (`planRowHTML`: text + `input[type=number]`) |
| 4642 | `deckDlg` · deck-dlg | labelledby `deckDlgTitle` (JS, 15084) | flashcard deck editor · `openDeckDlg`, `renderDeckDlg` | — | `#deckDlgBody` (incl. `textarea#dkBulk`) |
| 4643 | `fcDlg` · fc-dlg | `aria-label="Flashcard review"` | review · `startReview`, `renderReview` 14996 (`cancel` → `closeReview`) | — | `#fcDlgBody` |
| 4644 | `todoDlg` · todo-dlg | `todoDlgTitle` | new/edit task · `openTodoForm` 20043, `saveTodoForm` | `#tdTitle`, `input[type=date]#tdDue`, `#tdTag`+`datalist#tdTagList`, `.seg.pri-seg#tdPri` (3), `textarea#tdCheck`, `textarea#tdNotes`, `#tdErr`, `#tdDelete`, `#tdCancel`, `#tdSave` | `#tdTagList` options |
| 4657 | `remDlg` | **none** (has `h2#remDlgTitle`) | reminder editor · `openRemForm` 11201, `syncRemForm`, submit handler 11227 | `form#remForm`: `#remTitle`, `date#remDate`, `time#remTime`, `select#remRepeat`, `select#remBefore`, `#remDays` (7 checkbox chips), `select#remPreset`, `#remSession[list=nameList]`, `#remErr`, `#remCancel`, submit | `#remPreset` options |
| 4682 | `calDlg` | **none** | add reminder to phone calendar · `openCal` | `#calIcs`, `a#calGoogle`, `#calClose` | `#calName` |
| 4708 | `squadDlg` | **none** | boss squad picker · `openSquad` 12653 | `#squadErr`, `#squadCancel`, `#squadSave` | `ul#squadPick` (checkbox rows) |
| 4717 | `eggDlg` · egg-dlg | `egTitle` (empty h3) | pet hatch · `showHatch` | `#egOk`, `#egOut` | `#egStage #egEgg #egPet #egKicker #egTitle #egLine` |
| 4724 | `collDlg` · coll-dlg | labelledby `collTitle` (JS, 12192) | collection log · `openCollection`, `renderCollection` | — | `#collBody` |
| 4725 | `rewardDlg` · reward-dlg | `rwTitle` (empty h3) | reward reveal · `showRewardReveal` 12475 | `#rwBag`, `#rwOk` | `#rwPomeo #rwKicker #rwTitle #rwItems #rwNote` |
| 4736 | `loginDlg` · login-dlg | **none** (has `h3#loginTitle`) | daily reward · `openLoginDlg` 12807, `claimLogin` | `#loginLater`, `#loginClaim` | `#loginPomeo #loginTrack #loginGift` |
| 4746 | `examDlg` | **none** | exam countdown · `openExams` 12984 | `form#examForm`: `#examName`, `input[type=date]#examDate`, submit; `#examClose` | `ul#examList` |
| 4759 | `tplDlg` | **none** | subtask templates · `openTemplates` 15758 | `#tplClose` | `ul#tplList` |
| 4766 | `inboxDlg` · sheet | `ibTitle` | inbox (right-hand sheet; bottom sheet on phones, CSS `dialog.sheet` 2241/2248) · `openInbox` 16200, `renderInbox` 16185 | `#ibReadAll`, `#ibClose`, `.seg#ibSeg[role=tablist]` (All/Social/Reminders/Rewards, `data-f`) | `#ibBody` |
| 4774 | `cmdDlg` · cmd | `aria-label="Command palette"` | command palette · `openCmd`, `renderCmd`, `runCmd`, `cmdList` 16330 | `input#cmdInput[role=combobox aria-controls=cmdList]` | `ul#cmdList[role=listbox]` (`li[role=option]#cmd-N`, `aria-activedescendant`) |
| 4784 | `gdDlg` · gd-dlg | labelledby `gdTitle` (in 8 JS templates) | every garden dialog (seeds, shop, pets, almanac, tour…) · `gdDialog` 14506 | — | `#gdDlgBody` |
| 4785 | `rmShareDlg` · rm-share-dlg | `rmShTitle` | share room image · `openRoomShare` | `img#rmShImg`, `#rmShSave`, `#rmShNative`, `#rmShClose` | img src |
| 4792 | `keysDlg` | **none** | shortcut sheet (static `.keys` grid) · `?` key 15469, palette | `#keysClose` | — (text is hard-coded: must be edited when a Calendar key is added) |
| 4825 | `presetDlg` | **none** | preset manager · `#managePresets` click 18955 | `#closeDlg`, `form#presetForm.pform`: `hidden#pfId`, `#pfName`, 4 × `input[type=number]` `#pfFocus #pfShort #pfLong #pfRounds`, `#pfNew`, submit | `ul#presetList` `renderPresetList` 7312; `fillPresetForm` |
| 4846 | `migrateDlg` | **none** | upload pre-account data · `maybeOfferMigration` | `#migrateNo`, `#migrateYes` | `#migrateText` |
| 4858 | `cardDlg` · card-dlg | `cdTitle` | customise player card · `openCardDlg`, `renderCardDlg` 19677 | `#cdClose`, `#cdShare`, `#cdDone` | `#cdPrev`, `#cdOpts` (checkbox lists) |
| 4863 | `shareDlg` · share-dlg | `shTitle` | share player card · `openShareDlg`, `renderShareDlg` | `img#shImg`, `.seg#shSize` (Square / Story 9:16, `data-shsize`), `#shSave`, `#shNative`, `input#shUrl[readonly data-copyfield]`, `#shCopy`, `#shLink[data-native-share]`, `#shClose` | img src, url |
| 4874 | `levelDlg` · lvdlg | **none** (no heading element at all) | level-up moment · `showLevelUp` 9341 | `#lvClose` | `#lvBadge #lvKicker #lvTitle #lvSub` |
| 4891 | `pvDlg` · pv-dlg | `pvTitle` | demo "Make it yours" prompt · `previewPrompt` | `[data-pv-go]`, `[data-pv-stay]` | `#pvPomeo`, `#pvWhy` |
| 4897 | `tutDlg` · tut (has the `autofocus` attribute on the dialog) | `tutTitle` (empty h3) | onboarding tutorial · `startTutorial`, `renderTut` 16936, `finishTutorial` (`cancel` → finish) | `#tutSkip`, `#tutNext` | `#tutPomeo #tutStep #tutTitle #tutBody #tutDots` (`#tutBody` holds `date#tutExamDate`, `number#tutGoal`, `checkbox#tutMinimal`) |

Dialog mechanics (not in this slice, but every dialog depends on them):
- `HTMLDialogElement.prototype.close/showModal` are patched twice: 5321–5335 (adds `.closing` for 170 ms then really closes; `showModal` on an open dialog is a no-op) and 15943–15945 (open/close sounds).
- Base style `dialog {…}` CSS 395–399 (`width: min(520px, 100vw - 32px)`, `max-height: calc(100vh - 40px)`, padding 20px); open/close animation CSS 942–951.
- Backdrop click closes only `cardDlg`, `shareDlg` (18790/18796), `levelDlg` (18890), `rmShareDlg` (14872). The other 32 close by their buttons or native Esc. Explicit `cancel` handlers: `tutDlg` 17008, `fcDlg` 15147, `confirmDlg` (`oncancel`).
- "Is anything modal open?" is asked as `document.querySelector('dialog[open]')` in ≥ 10 places (shortcuts 15462, `guardBusy` 19805, tour, pull-to-refresh, hello bubble…) plus `#tour`/`#wrapped` `.hidden` checks.

## Every form control in the markup

97 fields: 24 text, 2 password, 1 search, 6 number, 4 date, 2 time, 1 color, 2 range, 1 file, 1 hidden, 33 checkbox (26 with ids + 7 day chips), 15 select, 2 textarea, 3 datalist.
"Label" says how the control is named today: `for` = `<label for>`, `aria` = `aria-label`, `wrap` = wrapping label, `title` = title only.

### Auth card and landing

| Line | Element | id | Label text | Where | Read / wired by |
|---|---|---|---|---|---|
| 3889 | button group `.seg` role=tablist (2 × role=tab, `data-mode`) | `authSeg` | "Sign up or log in" (aria) | `#authCard` | `setAuthMode` (sets `.active` + `aria-selected`), click 18610 |
| 3896 | input text (maxlength 20, required, `aria-describedby=userHint`) | `authUser` | Username (for) | `#authForm` | `onAuthSubmit`, `checkUser` |
| 3901 | input password (minlength 6) + `button[data-toggle=authPass]` Show | `authPass` | Password (for) | `#authForm` | `checkPass`, toggle 18612 flips `type` |
| 3910 | input password + `button[data-toggle=authPass2]` | `authPass2` | Confirm password (for) | `#confirmWrap` (sign-up only) | `checkPass2` |
| 3917 | checkbox, `checked` | `authStay` | Stay logged in on this device (wrap) | `#authForm` | `onAuthSubmit` — rendered as the 42×24 switch like every checkbox |
| 3968 | button group role=radiogroup (JS buttons `data-lpth`) | `lpSwatches` | Theme (aria) | `.lp-look` | `initLanding`, `lpMarkLook` (`aria-checked`) |
| 3969 | button group `.seg` role=radiogroup (3 buttons `data-lpgl`, no `role=radio`) | `lpGlass` | Glossed Interface (aria) | `.lp-look` | `lpMarkLook`, click 17302 |
| 3995–3999 | 5 × `<details>` | (`lpPrivacy` on one) | FAQ questions | `#lpFaq` | native |

### Timer tab

| Line | Element | id | Label text | Where | Read / wired by |
|---|---|---|---|---|---|
| 4071 | input text (140) | `parkInput` | "Distracting thought" (aria) | `.park-pop` in timer card | `openPark`, `parkThought` |
| 4100 | input text (80) | `subQuickInput` | "New subtask" (aria) | `#subCheck` in timer card | `editSub`, `focusSubAdd` |
| 4107 | input text (120) | `noteInput` | "Note for the session you just finished" (aria) | `#noteRow` | `offerNote`, `saveNote` |
| 4120 | input text (80, `list=nameList`) | `nameInput` | What are you working on? (for) | Session card | `input` → `onNameChange` 18633; `currentName`, `loadChip`, shortcuts `N` |
| 4121 | **input color** | `nameColor` | title "Colour for this name" only | Session card `.name-row` | `input` 18640 → `S.names[name].color`; value set by `syncNameInputs` |
| 4123 | datalist | `nameList` | — | Session card (also used by `#remSession`) | `renderSessionInputs` 6911 |
| 4124 | button `aria-expanded aria-controls=subEd` | `subToggle` | + Add subtasks | Session card | `renderSubtasks` |
| 4128 | input text (80) | `subInput` | "New subtask" (aria), no placeholder | `#subEd` | `loadItems` wiring |
| 4131 | input text (40) | `tplName` | "Template name" (aria) | `#tplSave` | `saveTemplate` |
| 4136 | input text (30) | `nameTag` | Tag (optional) (for) | Session card `.sub-row` | `change` 18647 → `S.names[name].tag` |
| 4141 | **select** (options from JS: preset name only) | `presetSelect` | Preset (for) | Session card `.preset-row` | `change` 18673 → `S.activePresetId`; options `renderSessionInputs` |
| 4142 | icon button | `managePresets` | "Manage presets" (aria) | Session card | opens `presetDlg` 18955 |
| 4092–4094 | buttons | `resetBtn` `mainBtn` `skipBtn` | Reset / Start / Skip (text and role change by state, incl. overtime) | `.controls` | 18656–18664; `setMainBtn` 5465 |

### Stats, Friends, Reminders tab bars

| Line | Element | id | Label | Where | Wired by |
|---|---|---|---|---|---|
| 4186 | button group `.seg` role=group (buttons from JS) | `remSeg` | "Show" (aria) | Reminders | `renderRemSeg`, click 20105 |
| 4207 | button group `.seg` (4 × `data-view`), no role/label | `statsSeg` | — | Stats head | click 18699; `.active` only |
| 4214/4216 | icon buttons ‹ › | `prevBtn` `nextBtn` | Previous / Next (aria) | Stats head | 18708 |
| 4236 | button group `.seg` (2 × `data-view`), no role/label | `friendsSeg` | — | Friends | delegated 18812; `.active` only |

### Settings tab (`#tab-settings`) — every row is `.setting[data-k]` with the label in the first child `div > div`

| Line | Element | id | Label text (all `aria-label`, no `<label>`) | Section | State key / handler |
|---|---|---|---|---|---|
| 4286 | input search | `setSearch` | Search settings | top | `filterSettings` 16300 |
| 4294 | **number** min 5 max 1440 step 5 | `setGoal` | Daily goal (in minutes) | Timer | `change` 18741 → `setDailyGoal` |
| 4298 | **select** 1 Monday / 0 Sunday | `setWeek` | Week starts on | Timer | `S.settings.weekStart` |
| 4302 | checkbox | `setAuto` | Auto-start next phase | Timer | `autoStart` |
| 4306 | checkbox | `setOvertime` | Overtime after focus ends | Timer | `overtime` |
| 4310 | checkbox | `setKeys` | Keyboard shortcuts | Timer | `shortcuts` |
| 4314 | checkbox | `setTip` | Tip of the day | Timer | `dailyTip` |
| 4318 | **select** always / sometimes / off | `setEnergy` | Energy check-in | Timer | `energy` |
| 4326 | checkbox | `setSound` | Sound | Sounds | `sound` |
| 4330 | **range** 0–1 step .05 | `setAmbVol` | Ambient volume | Sounds | `input` 18752 → `setAmbientVolume` |
| 4334 | checkbox | `uisOn` | Interface sounds | Sounds | `UIS.prefs.on` (device) 15957 |
| 4338 | **range** 0–1 step .05 | `uisVol` | Interface (sound) volume | Sounds | `input`+`change` 15958 |
| 4342 | checkbox | `uisHover` | Hover sounds | Sounds (`#uisHoverRow`) | 15960 |
| 4346 | **select** soft / crisp / wood / bubbles + `#uisTry` ▶ | `uisPack` | Sound pack | Sounds | 15962 |
| 4351 | checkbox | `uisQuiet` | Quiet during focus | Sounds | 15961 |
| 4355 | button | `sndTest` | Test sounds (result text in `#sndTestOut`) | Sounds | `testSounds` 15965 |
| 4359 | checkbox | `setHaptics` | Vibration | Sounds | `HAPTIC_KEY` 16320 |
| 4367 | checkbox | `setMinimal` | True Minimalist | Appearance | `setMinimal()` 18785 |
| 4371 | checkbox | `setMinPomeo` | Keep Pomeo in True Minimalist | Appearance (`#minPomeoRow.hidden`) | `minPomeo` |
| 4375 | **select** auto / light / dark | `setTheme` | Theme | Appearance | `S.settings.theme`, `applyTheme` |
| 4379 | **select** off / lite / full | `setGlass` | Glossed Interface | Appearance (`#glassDesc`) | `setGlass()` 18763; can be `disabled` |
| 4383 | checkbox | `setAtmo` | Focus atmosphere | Appearance | `atmosphere` |
| 4387 | checkbox | `setFestive` | Festive decorations | Appearance (`#festiveRow`) | `festive` |
| 4391 | checkbox | `setTod` | Time-of-day background | Appearance (`#todRow`) | `tod` |
| 4395 | checkbox | `setTodRain` | Rain mood | Appearance (`#todRainRow.sub-setting`) | `todRain` |
| 4399 | checkbox | `setRipen` | Ripening ring | Appearance | `ripen` |
| 4403 | **select** full / reduced / off | `setMotion` | Animations | Appearance | `MOTION_KEY` 18778 (reads `selectedOptions[0].textContent`) |
| 4407 | checkbox | `setPomeo` | Show Pomeo | Appearance | `pomeo` |
| 4411/4415 | buttons | `replayTour` `resetTips` | Replay tutorial / Reset tips | Appearance | |
| 4423 | checkbox | `setNotify` | Notifications (status in `#notifStatus`) | Notifications | 18891 + `askNotifyPermission` |
| 4427 | **select** often / sometimes / quiet | `setPomeoTalk` | Pomeo talks | Notifications | `pomeoTalk` |
| 4431 | checkbox | `setWater` | Water and stretch nudges | Notifications | `waterNudge` |
| 4435 | checkbox | `setBreakCards` | Flashcards on breaks | Notifications | `breakCards` |
| 4439 | checkbox | `setShopDot` | Dot when the seed shop restocks | Notifications | `shopDot` |
| 4443 | button | `examsBtn` | Manage exams | Notifications | `openExams` |
| 4447 | input text `inputmode=numeric` | `setRevInt` | Revision intervals in days | Notifications | `change` 18771 (validates, toasts) |
| 4460 | checkbox | `setShareAct` | Show my activity to friends | Friends & privacy (`#privacyCard`) | `shareActivity` 18840 |
| 4464 | checkbox | `setPosts` | Share posts with friends | Friends & privacy | posts wiring ~9897; `renderPrivacy` |
| 4466 | `<details>` + JS checkboxes `[data-posttype]` | `postTypesBox` / `postTypes` | Choose what gets posted | Friends & privacy | `renderPrivacy` 10681 |
| 4469 | checkbox | `setShareNames` | Share session names with friends | Friends & privacy | `shareNames` |
| 4473 | checkbox | `setGlobal` | Appear on global leaderboard | Friends & privacy | `globalBoard` |
| 4477 | buttons | `copyInvite`, `shareInvite2[data-native-share]` | Copy / Share (invite link, text in `#inviteDesc`) | Friends & privacy | `copyText(inviteLink())` 18843 |
| 4487 | button | `logoutBtn` | Log out | Account & data | `logout` (uses native `confirm` 6195) |
| 4491 | buttons + **file** input (hidden, `.json`) | `exportBtn` `importBtn` `importFile` | Export / Import | Account & data | 18899–18925 (native `confirm` + `alert`) |
| 4496 | button danger | `wipeBtn` | Erase… | Account & data | 18926 (native `confirm`) |

### Dialog fields

| Line | Element | id | Label text | Dialog | Read / wired by |
|---|---|---|---|---|---|
| 4571 | input text (24) | `ccName` | Clan name (3–24 characters) (for) | clanCreateDlg | `clanAct` wiring block ~22221+ |
| 4572 | input text (5, uppercase via inline style) | `ccTag` | Tag (2–5 letters or numbers) (for) | clanCreateDlg | |
| 4573 | **select** (options from `CLAN_DESC`) | `ccDesc` | What's your clan about? (for) | clanCreateDlg | `openClanCreate` |
| 4580 | input text (20) | `cjCode` | Invite code (for) | clanJoinDlg | |
| 4592 | input text readonly `data-copyfield` | `ciLink` | "Invite link" (aria) | clanInviteDlg | `selectField` on focus 22767 |
| 4598 | button group `.seg` (4 × `data-cst`), no role/label | `csTabs` | — | clanShopDlg | 22324 |
| 4605 | **select** (`CLAN_TITLES` + `__own`) | `csdName` | Session (for) | clanSchedDlg | `openClanSched` |
| 4606 | input text (40) | `csdOwn` | Session name (for) | clanSchedDlg (`#csdOwnWrap.hidden`) | |
| 4607 | button group `.mode-seg` role=group (2 × `data-cmode2`) | `csdMode` | "Session mode" (aria); visible `<label class="lbl">Mode</label>` has no `for` | clanSchedDlg | `setSchedMode` 22357 |
| 4608 | **select** (`CLAN_PATTERNS`) | `csdPattern` | Pattern (for, `#csdPatternLbl`) | clanSchedDlg | |
| 4610 | **date** | `csdDate` | Date (for) | clanSchedDlg `.sched-only` | |
| 4611 | **time** | `csdTime` | Time (for) | clanSchedDlg `.sched-only` | |
| 4613 | **select** none / daily / weekdays / weekly | `csdRepeat` | Repeat (for) | clanSchedDlg | |
| 4614 | button group role=group (7 × `.btn.small[data-d]`) | `csdDays` | "Days" (aria) | clanSchedDlg (hidden unless weekly) | state by class |
| 4616 | input text (30) | `csdTag` | Subject tag (optional) (for) | clanSchedDlg | |
| 4617 | **number** min 2 max 30 value 30 | `csdMax` | Max people (for) | clanSchedDlg | |
| 4630 | input text (hidden unless type-to-confirm) | `cfType` | "Type to confirm" (aria) | confirmDlg | `confirmDlg()` |
| 4636 | datalist | `plNames` | — | planDlg | `openPlanDlg` |
| 4646 | input text (120) | `tdTitle` | Task (for) | todoDlg | `openTodoForm`, `saveTodoForm` |
| 4648 | **date** | `tdDue` | Due date (optional) (for) | todoDlg | |
| 4649 | input text (30, `list=tdTagList`) + datalist | `tdTag` / `tdTagList` | Subject / tag (optional) (for) | todoDlg | options also reused by `openNewDeck` 15159 |
| 4651 | button group `.seg.pri-seg` role=group (3 × `data-pri`) | `tdPri` | "Priority" (aria); visible label has no `for` | todoDlg | 20161 (`.active` + `aria-pressed`) |
| 4652 | **textarea** rows 3 | `tdCheck` | Checklist (optional, one step per line…) (for) | todoDlg | |
| 4653 | **textarea** rows 2 (1000) | `tdNotes` | Notes (optional) (for) | todoDlg | |
| 4661 | input text (80) | `remTitle` | Title (for) | remDlg `#remForm .rform` | submit 11227 |
| 4662 | **date** | `remDate` | Date / "Starts on" / "First revision" (`#remDateLbl`, for) | remDlg | `syncRemForm` |
| 4663 | **time** | `remTime` | Time (for) | remDlg | |
| 4665 | **select** none / daily / weekdays / weekly / revision | `remRepeat` | Repeat (for) | remDlg | `change` → `syncRemForm` |
| 4667 | **select** 0 / 5 / 10 / 15 / 30 | `remBefore` | Remind me (for) | remDlg | `+value` |
| 4669 | 7 × **checkbox** in `label > input + span` (`.daychips`), values 1–6, 0 | (`remDays` on the wrapper) | Mon … Sun; group caption is a `<span class="field">` | remDlg `#remDaysWrap` | `$$('#remDays input')` |
| 4670 | **select** ("No timer link" + presets) | `remPreset` | Timer preset (optional) (for) | remDlg | `openRemForm` |
| 4671 | input text (80, `list=nameList`) | `remSession` | Session name (optional) (for) | remDlg | |
| 4750 | input text (60) | `examName` | "Exam name" (aria + placeholder) | examDlg `#examForm` | `openExams` |
| 4751 | **date** | `examDate` | "Exam date" (aria) | examDlg | |
| 4768 | button group `.seg` role=tablist (4 × `data-f`, no `role=tab`) | `ibSeg` | "Filter" (aria) | inboxDlg | 16226; `.active` only |
| 4775 | input text `role=combobox aria-controls=cmdList aria-expanded="true"` | `cmdInput` | "Search commands" (aria) | cmdDlg | `renderCmd` (sets `aria-activedescendant`) |
| 4832 | hidden | `pfId` | — | presetDlg `#presetForm` | `fillPresetForm` |
| 4833 | input text (40, required) | `pfName` | New preset / Edit… (`label#pfTitle`, for) | presetDlg | submit 18981 |
| 4834–4837 | 4 × **number** (required; min/max overwritten from `PRESET_LIMITS` 18979) | `pfFocus` `pfShort` `pfLong` `pfRounds` | Focus (min) / Short break / Long break / Rounds (for) | presetDlg | submit clamps |
| 4866 | button group `.seg` role=group (2 × `data-shsize`) | `shSize` | "Image size" (aria) | shareDlg | 19734 (`aria-pressed`) |
| 4869 | input text readonly `data-copyfield` | `shUrl` | Link to a read-only copy of your card (for) + aria | shareDlg | `copyCardLink` |

Native controls that are NOT in this slice (built in JS templates — the Phase 2 grep must cover them too): `select#achSort` (`achListHTML` 9161), `range#shopAmbVol` (`renderShop` 9323),
`checkbox[data-posttype]` (10681), squad checkboxes (12656), `textarea#dkBulk` (15086), `number[name=hrs]` (`openPlanDlg` 15259), `checkbox[data-tick]` subtasks (15580),
`date#tutExamDate`, `number#tutGoal`, `checkbox#tutMinimal` (`renderTut` 16950–16964), `search#bagSearch` (18139), `checkbox[data-cdfeat]` / `.switch[data-cdpriv]` (19689–19691),
host sheet radios + `time#sessTime` + `select#sessPreset` (`hostSheetHTML` 21643–21660), `checkbox#cstShop #cstSched`, `select#cstTo` (22183–22185), `select.crem-before[data-crbefore]` (22392).
Native `confirm()` × 8 at 6195, 6762, 8532, 9966, 9996, 18829, 18919, 18929; `alert()` × 1 at 18923. Zero `prompt()`.

## Static screens vs rendered hosts

**Fully static markup (content and controls in HTML; JS only sets values / toggles `.hidden`)**
- Loading screen `#splash`, `#bootView`, the intro shell `#intro`.
- Welcome page: hero copy, badges, CTA buttons, the fake preview window `.lp-peek`, the comparison table head, all 5 FAQ items, final CTA, footer. JS fills only `#lpPomeo`, `#lpHi`, `#lpSwatches`, `#lpFeats`, `#lpCmpRows` (`initLanding` 17208, `lpSetup`).
- Auth card (all fields); `setAuthMode` swaps texts, `#confirmWrap`, `autocomplete`.
- Header and both navs (icons are inline SVG repeated per button; the logo SVG is repeated 3× in the markup: `.sp-logo`, `#brandBtn`, `#navBrandBtn`).
- Timer tab card frames: Session card (all inputs), Today card numbers shell, Tip card, Recently-used frame, timer card skeleton.
- Reminders tab head; Stats head (`#statsSeg`, range nav); Friends head (`#friendsSeg`).
- **Settings tab: 100 % static** (the only static "screen" of real size, 4281–4521). About tab: static except changelog and Pomeo.
- 31 of the 36 dialogs have static buttons/forms (see dialog table); 5 are bare hosts (`sessHostDlg`, `deckDlg`, `fcDlg`, `collDlg`, `gdDlg`); `keysDlg` is entirely static text.

**Empty hosts filled by JS** (`innerHTML` templates — their controls are outside this slice)

| Host id (line) | Render function | Host id (line) | Render function |
|---|---|---|---|
| `pomeoBtn` 4067 | `renderPomeo` 10789 | `pomeoBubble` 4068 | `showBubble` 10831 |
| `roundDots` 4074, `ringSub`, `otLine`, `muteBtn` icon, `phaseLabel` | `renderTimer` 6869 | `ringDots` 4081 | `initInputs` 19042 (60 circles) |
| `timeText` 4086 | `setTimeDigits` 5422 (digit-roll spans) | `mainBtn` 4093 | `setMainBtn` 5465 |
| `quickStart` 4096 | `renderQuickStart` 17188 | `subCheckList`, `subN`, `subEdList`, `subTpls` | `renderSubtasks` 15549 |
| `sumHead` 4103 | `renderSumHead` 17125 | `energyRow` 4104 | `renderEnergyRow` 17082 |
| `subSum` 4105 | `renderSubSum` 15786 | `parkPanel` 4113 | `renderPark` 13043 |
| `nameList`, `presetSelect` options | `renderSessionInputs` 6911 | `subLast` 4125 | `renderSubLast` 15588 |
| `examCard` 4149 | `renderExamCard` 12961 | `todayDate curStreak bestStreak todayText todayPct todayBar` | `renderToday` 6932 |
| `streakNext` 4156 | `renderStreakNext` 12464 | `rankLine` 4157 | `renderRankLine` 12404 |
| `todayExtra` 4160 | `renderTodayExtra` 11493 | `gardenPeek` 4162 | `renderGardenPeek` 6958 |
| `tipText` 4166 | `renderTip` 11485 | `chips` 4174 | `renderChips` 6917 |
| `coinPill`, `lvChip`, `avatarBtn` | `renderHeaderChip` 9086 | `rankChip` | `renderRankChip` 12329 |
| `syncStatus` | `renderSync` 5894 | `inboxCount` | `renderInboxBadge` |
| `navCur` | `navMark` 22915 | `changelog`, `aboutPomeo` | `renderAbout` 16270 |

Whole-tab hosts and dialog hosts are in the two tables above. `renderAll` 18578 repaints the Timer tab pieces every time and only the *current* tab's host
(`quests bag stats garden room reminders profile shop`); `friends posts sessions clan board settings about` are painted by `showTab` and their own data callbacks.
Static controls are wired once at load in the top-level `EVENTS` block 18607–18998 (plus feature-local blocks), by id — a control replaced in the markup must keep its id, its `value`/`checked` semantics and fire the same `input`/`change` event.

## Accessibility as-is

**Present**
- Landmarks: `header.top`, `nav#tabs[aria-label=Main]`, `nav#btmBar[aria-label="Main sections"]`, `main`, landing `section[aria-labelledby]` × 3, `footer` × 3, `#pvBanner[role=region]`.
- `aria-current="page"` on the active nav item (`navMark`); `aria-expanded` on `#navBurger`, `#navMore`, `#navCollapse`, `#subToggle`; the slide-in menu traps Tab and closes on Esc (22963) and returns focus to its opener (`navOpen`).
- Live regions (12): `#inLine`, `#userHint`, `#pwHint`, `#pw2Hint`, `#authError`(role=alert), `#greet`, `#pomeoBubble`(role=status), `#otLine`, `#energyRow`, `#netBanner`, `#toast`(role=status), `#achCard`. `role="alert"` also on `#lpAlert`, `#ccErr`, `#cjErr`, `#csdErr`.
- Every icon-only button in the markup has an `aria-label`; decorative SVGs carry `aria-hidden` (69 uses). Badges (`.tbadge`) have text labels, some filled by JS (`#postsBadge`, `#sessBadge` start with `aria-label=""`).
- Every input/select in Settings has an `aria-label`. 26 of 36 dialogs have `aria-labelledby`/`aria-label`.
- One real combobox pattern already exists: `#cmdInput[role=combobox]` + `ul#cmdList[role=listbox]` + `li[role=option]` + `aria-activedescendant` (`renderCmd` 16403) — a model for the new Select.
- Focus rings exist but in three styles (CSS, see maps 01/02): `input:focus, select:focus` 240 (3 px `--accent-soft` halo, on mouse focus too), `input[type="checkbox"]:focus-visible` 894 (same soft halo), and the global block 2159–2161 (`:where(button, a[href], [role="button"], summary, .plant):focus-visible` 2 px `--accent`; text/number/date/time/select 2 px at 55 % accent). `textarea`, `input[type=search|color|range|password]` are not in the 2161 list. Contrast of the soft halo needs checking in all 21 themes.

**Missing / wrong**
- **Dialogs without an accessible name (10):** `remDlg`, `calDlg`, `squadDlg`, `loginDlg`, `examDlg`, `tplDlg`, `keysDlg`, `presetDlg`, `migrateDlg`, `levelDlg`. Five more point `aria-labelledby` at an id that only exists after JS renders (`rklTitle`, `hsTitle`, `deckDlgTitle`, `collTitle`, `gdTitle`); four headings are empty until opened (`cfTitle`, `egTitle`, `rwTitle`, `tutTitle`).
- Div-based modals (`#intro`, `#wrapped`, `#tour`, `#pomeoPop[role=alertdialog]`) declare `aria-modal` but are not `<dialog>`: no native focus trap, page behind is not inert. `#authCard` is `role=dialog aria-modal="false"` even when shown as a modal sheet (< 900 px).
- Checkboxes are styled as switches (CSS 882–894) but are announced as checkboxes: no `role="switch"` anywhere (0 uses). Settings rows get `data-row-toggle` (18753) so the whole row is clickable, but the visible label text is a plain `div`, not a `<label>` — the name comes only from `aria-label`, and the `.desc` help text is not linked with `aria-describedby`.
- Segmented controls: selection is a CSS class (`.active`) with no state attribute on `#statsSeg`, `#friendsSeg`, `#csTabs`, `#ibSeg`, `#csdDays`, `#csdMode`, `#lpGlass`. `role=tablist` is used on `#authSeg` and `#ibSeg` without `aria-controls`/`tabpanel`/arrow-key handling; `#ibSeg` buttons lack `role=tab`. `#statsSeg` and `#friendsSeg` have no group role or label. Only `#tdPri`, `#shSize` set `aria-pressed`; `#authSeg` sets `aria-selected`.
- Orphan labels: `<label class="lbl">Mode</label>` 4607 and `<label class="lbl">Priority</label>` 4651 have no `for`. `#nameColor` is named only by `title`. `#examName`/`#examDate`, `#subInput`, `#parkInput` rely on `aria-label` (no visible label). `#remDaysWrap` caption is a `span`, not a `fieldset/legend` or `role=group`.
- `#examCard` 4149 is `role="button" tabindex="0"` with a click handler only (13012) — **Enter/Space do nothing** (compare `#gardenPeek` 18313, which handles both).
- `#rankChip` 4028 has no `aria-label` (its name is the rank text JS inserts); `#coinPill`/`#lvChip` have a static `aria-label` that overrides the visible number (the level is only in `#lvChip.title`).
- Error paragraphs `#plErr`, `#tdErr`, `#remErr`, `#squadErr` have no `role=alert`/live region (the clan ones do). No `aria-invalid` / `aria-required` anywhere (0 uses); forms use `novalidate` + custom messages.
- `.sp-vine[role=progressbar]` sits inside `#splash[aria-hidden=true]` and has no `aria-valuenow`.
- `.lp-cmp` uses `role=table/row/columnheader` with an empty first column header; rows come from JS (`#lpCmpRows`) — check they emit `role=row/cell`.
- No skip link, no visually-hidden utility class (0 uses of `sr-only`/`visually-hidden`), `title` is the only shortcut hint on nav items (27 `title` attributes, invisible to touch and most AT).
- Keyboard shortcut sheet `keysDlg` is a `div.keys` grid of `kbd`/`span` pairs, not a list/table.

**Heading structure**
- `h1` exists only on: landing `.lp-h1` 3935, Reminders 4182, About 4529 (static) and, from JS, Garden, Pomeo's room, Posts, Study sessions, Bag. **No `h1` on Timer, Quests, Stats, Friends, Clan, Leaderboard, Shop, Profile, Settings.**
- Cards use `h2` (`h2` base style CSS 53); dialogs use `h2`, except `eggDlg`, `rewardDlg`, `loginDlg`, `pvDlg`, `tutDlg` which use `h3` with no `h2` above; `levelDlg` has no heading (`div.lv-title`).
- Landing: one `h1`, four `h2` — fine. The app view and the landing are the same document, so both `h1`s exist in the DOM (one view is `display:none`).

**Focus-order hazards**
- Timer card DOM order is Pomeo → park button → park input → mute → ring → controls: the first Tab stops on the Timer tab are Pomeo and Park, not Start. `#muteBtn.corner` and `#parkBtn` are positioned by CSS, so visual and DOM order differ.
- `nav#btmBar` and the dialogs come after `main` in the DOM; on phones the bottom bar is last in tab order. The sidebar `#tabs` precedes `main`; as a closed off-canvas drawer it is taken out of the tab order by CSS only (`visibility` on `.sidenav`, restored by `body.nav-open .sidenav`, CSS ~128–131) — a restyle that animates it with `transform`/`opacity` alone would expose 12 hidden tab stops.
- `#toast` is moved inside the open dialog (`toastHost`) so Undo stays reachable; anything else appended to `<body>` while a modal dialog is open is inert and below the top layer.
- `tutDlg` has `autofocus` on the `<dialog>` element itself; most other dialogs focus their first field with a `setTimeout(...focus(), 50)` after `showModal()` (e.g. `openRemForm` 11219).
- 32 dialogs cannot be dismissed by clicking the backdrop; behaviour is inconsistent with the 4 that can.

## Head

Lines 1–8 are the whole head before `<style>`:

| Line | Tag | Value | v2.0 note |
|---|---|---|---|
| 1–2 | `<!doctype html>`, `<html lang="en">` | no `dir`, no class; JS adds `data-motion`, `data-theme`, `data-glass`, `data-glass-solid`, `data-minimal`, classes `nav-mini`, `lp-modal` | |
| 4 | `<meta charset="utf-8">` | | |
| 5 | `<meta name="viewport">` | `width=device-width, initial-scale=1, viewport-fit=cover` | keep `viewport-fit=cover` (safe-area insets used by the bottom bar / sheets) |
| 6 | `<title>` | `Pomodorolist` | `renderClock` 6856 overwrites `document.title` every tick once signed in: `MM:SS · Focus…` while running, the literal `'Pomodorolist'` when idle. An SEO title therefore only survives on the logged-out landing page (which is what crawlers see); if the idle title should change too, edit the string at 6864. |
| 7 | `<link rel="icon" id="favicon">` | inline SVG data-URI tomato (715 chars) | `updateFavicon` 9049 rewrites `#favicon.href` to a canvas PNG ring while the timer runs (shop extra `x_favicon`), back to `FAV_DEFAULT` 9047 (a second copy of the same SVG). |
| 8 | `<meta name="description">` | "A minimal, distraction-free Pomodoro focus timer with named sessions, streaks, statistics and cloud sync across devices." | stale (no garden, friends, clans, free/no ads) |

**Absent:** Open Graph (`og:title og:description og:image og:url og:type og:site_name`), Twitter card tags, `<link rel="canonical">`, `<meta name="theme-color">`, `<meta name="color-scheme">`, `apple-touch-icon`, PNG/ICO favicon fallbacks, `robots`, structured data, any `preconnect`. No web-app manifest and no service worker (must stay that way in 2.0).
**Fonts:** none loaded in the head. Body font is the system stack (CSS 49). Google Fonts stylesheets are injected at runtime by `loadFont` 8908 only for shop fonts (`FONTS`), id `gf-<id>` / `gf-pv-<id>`.
**External requests at load:** none from the head; the Firebase SDK (`FIREBASE_VERSION` 10.12.2) is imported by the main script from `www.gstatic.com`.
**Repo root has no image/icon files** (`README.md`, `index.html`, `firestore.rules`, `firestore.indexes.json` are the only app files): the 1200×630 preview image and the icon set will be the first extra files to upload.

What link-preview / SEO work must change here:
1. Add static OG + Twitter tags in the head (crawlers do not run JS, so nothing can be per-user: a `?ref=<name>` link shows the same preview as the plain URL). `og:image`/`og:url` must be absolute (`https://siverieg.github.io/Pomodorolist-V1.0/…`) and the image a PNG/JPG — SVG and data-URIs are ignored by Discord/WhatsApp.
2. Icon set: keep `#favicon` as the element `updateFavicon` targets. Adding more `rel="icon"` links with `sizes` lets browsers pick one of those instead and silently breaks the live tab icon — either update `updateFavicon` to retarget all icon links or keep a single dynamic link plus `apple-touch-icon`.
3. Title + description rewrite; consider `theme-color` (two tags with `media` for light/dark; themes change `--bg` at runtime, so JS would need to update it for the 21 skins).
4. Landing headings for search: the `h1` 3935 and the four `h2`s (3979, 3984, 3993, 4004) are static and crawlable; `#lpFeats` and `#lpCmpRows` are JS-rendered (invisible to non-JS crawlers) — move the feature copy into static markup if it should be indexed.
5. `<noscript>` 4914 is one bare line; a no-JS visitor (and some preview bots) sees only the splash.

## Traps and v2.0 touch points

**Contracts that the markup carries for the script (break these and suites fail)**
1. **Ids are the API.** 550 ids, wired once at load by `$('#id').addEventListener(...)` in top-level code (`EVENTS` 18607–18998 and feature blocks); a missing id throws at startup and stops the whole script. Replacing a native control = keep the id on an element that still exposes `.value` / `.checked` / `.disabled` and dispatches `input`/`change` (bubbling), or rewrite every reader. Readers also set values programmatically (`renderSettings` 7258, `openRemForm` 11201, `openClanSched` 22153, `fillPresetForm`) and rebuild `<option>` lists via `innerHTML` (`#presetSelect`, `#remPreset`, `#ccDesc`, `#csdName`, `#csdPattern`).
2. `#setMotion` handler uses `e.target.selectedOptions[0].textContent` (18783) — the only native-select-only API in the file; `#importFile` uses `.files`.
3. **Settings DOM shape is parsed by code:** `filterSettings` 16300 walks `#tab-settings .set-sec` → `.setting`, reads `data-k` and the section's `h2`; `cmdList` 16330 builds one palette entry per `.setting` from `:scope > div > div:first-child` (or `.acct-name`); `goSetting` focuses the row's first `input, select, button`; the row-toggle code 18753 marks rows that hold exactly one `input[type=checkbox]` and no `select, button, a` — a switch built as a `<button>` would make the row non-toggling; `previewLockSettings` 17685 disables `#tab-settings input, select, .setting button`. The Phase 3 regrouping (Timer / Sounds / Appearance / Notifications / Privacy & social / Account / Data) must keep or update all five.
4. **Demo guard is selector-based:** `PV_BLOCK` 17657 lists the ids/attributes whose clicks are swallowed in the preview, and all `submit` events are blocked. New custom controls (listbox options, date cells, steppers, calendar drag) are not `<select>`/submit and will act in the demo unless they are added to `PV_BLOCK` or check `isPreview()`.
5. **Sounds/haptics key off native types:** the global `change` listener 15923 plays on/off only for `el.type === 'checkbox'`; clicks sound for `button, [role="button"], .chip, summary, a.btn` (`UI_CLICKABLE` 15915); hover uses a class list (`UI_HOVER` 15930). Keyboard shortcuts ignore keys only inside `input, select, textarea, [contenteditable]` (15461) — a focused custom listbox/date grid will otherwise trigger `1–9`, `R`, `S`, `P`, `J`, `O`, `T`, `N`, Space.
6. **"A dialog is open" = `dialog[open]`.** Shortcuts, the focus guard (`guardBusy` 19805), tours, tips and pull-to-refresh all test that selector; toasts re-parent into it. A sheet/confirm/popover that is not a `<dialog>` (or not `[open]`) is invisible to all of them. Keep new modal surfaces as native `<dialog>` (or teach those checks one shared helper).
7. **Popovers and the top layer.** `showModal()` puts dialogs in the top layer: a dropdown/date popover appended to `<body>` renders underneath and is inert. Under Glossed Interface, `.card`, `.tile` and `dialog` get `backdrop-filter` (CSS 1396–1397), which makes each a containing block for `position: fixed` children and its own stacking context — a popover rendered inside a card is positioned against the card and can be covered by the next card. Portal popovers to the top-most `dialog[open]` or `<body>` (as `toastHost` 5072 does), or use the native `popover` attribute (0 uses today).
8. **`.mason` layout engine:** `.mason.timer-cards[data-keep2]` 4064 is laid out by `fitMason` (5240–5317); a body-wide MutationObserver and a ResizeObserver re-place cards whenever a child is added or resized, and write inline `grid-row`/`grid-column` on each card. Cards must stay direct children of `.mason`; inline popovers that change a card's height re-flow both columns.
9. Timer structure is referenced by many features: `#ring` and its children (ring styles `rs-*`, `#ringTrail`, stamps, floaters, overtime `.ot`), `#timeText` (digit roll), `#mainBtn > .mb-lbl` (morph), `#noteRow`, `#subCheck`. `#mainBtn`, `#skipBtn`, `#resetBtn` are also clicked programmatically (palette 16336–16338, shortcuts 15484–15485, Space 15465).
10. `.hidden` is `display:none !important` (CSS 57) and is the universal show/hide switch (139 uses in the markup); `navMirror`, `navShown`, shortcuts and True Minimalist read it on nav buttons.
11. `.seg` buttons are managed by `syncSegs` 5172 (injects `span.seg-ind`, expects direct-child `button.active`); the same routine drives `.tabs` (bottom bar).
12. **The 242 test suites drive the native controls directly** (scratchpad `fb/*.mjs`, read-only grep): 17 Playwright `selectOption()` calls in 8 suites on `#setMotion`, `#csdName`, `#uisPack`, `#setGlass`, `#remRepeat`, `#setPomeoTalk`, `#remPreset`, `#csdPattern`, `#ccDesc`; `fill()` on `#remDate`, `#remTime`, `#examDate`, `#tutExamDate`; **47 suites answer native dialogs with `page.on('dialog')` and 11 stub `window.confirm`** — every `confirm()`/`alert()` moved to `confirmDlg` changes what those suites must click. Most-used ids: `#guestBtn` 71 suites, `#authUser` 66, `#previewBtn` 48, `#tabs` 17, `#mainBtn` 14, `#resetBtn` 13; 10 suites select nav items by `[data-tab=…]`. Plan a shared test helper (pick option / set date / accept confirm) before Phase 2, or keep a visually hidden native twin that stays the value source.

**Lists that must be edited together when a section (Calendar) is added** — a new `<section class="tab" id="tab-calendar">` plus: sidebar button in `#tabs` under `.nv-grp` Focus (4035) with `data-tab`, `title`, optional `.tbadge`; optionally the bottom bar (it holds 5 + More; `navMirror` hides bar items whose sidebar twin is hidden); `showTab` render branch 10708–10721 and the gamification guard 10696; `NAV_LABEL` 22884 (already missing `posts` and `bag`, so `#navCur` is blank there); `TAB_KEYS` 15458 and the letter keys 15479–15482 (free letters are few: `J O T N R S P` and `?` are taken); the static shortcut sheet `keysDlg` 4795–4807; `cmdList` tabs array 16332; `TIPS` 17039; `PTR_TABS` 16499; tour steps (`TOUR`, `tourTarget`); `renderAll` 18595–18602; the midnight branch of `tick` 19016–19024; the mq-change `navMark` at 22972 (maps `settings`/`about` to `profile` but forgets `room`).

**Things that exist already and should be reused, not rebuilt**
- `confirmDlg()` 22191 + `dialog#confirmDlg` 4627 (title, body, OK label, danger style, type-to-confirm) — the 8 `confirm()` + 1 `alert()` call sites can move onto it; it needs an alert (single-button) mode and it is not re-entrant (one shared dialog, handlers assigned to `onclick`).
- `dialog.sheet` (`inboxDlg`) is the only sheet pattern; the auth card has its own bottom-sheet CSS; `.pomeo-pop`, `.tip-pop`, `.tour-tip` are three separate popover-like surfaces.
- Existing calendar export UI: `calDlg` 4682 (`#calIcs`, `#calGoogle`) with `icsDate`/`icsEsc` 11260 and the Google `TEMPLATE` URL 11298 — the base for Phase 5 export.
- Existing invite plumbing: `inviteLink()` 9980 builds `?invite=<username>`; `captureInvite` 9985 stores it in `sessionStorage` and strips it from the URL; `handleInvite` 9991 asks with a native `confirm`. Other deep links: `?session=` 21498, `?clan=` 22437, `#card=` 19652, `#signup`/`#login` 17255, `?emulator=1`. A `?ref=` landing greeting ("@name invited you") belongs in `lpSetup`/`initLanding` next to `#lpHi`, with no Firestore read.

**Markup debt worth fixing during the redesign**
- 108 inline `style=""` attributes (margins, flex, colours such as `color:var(--danger);font-size:13px;min-height:18px` repeated on 7 error paragraphs) — all bypass a token system; `#ccTag`/`#cjCode` force uppercase with inline style.
- Three label systems for the same job: `label.field` (Session card, reminder form, preset form), `label.lbl` (clan, to-do, share dialogs) and `aria-label` only (settings, exam form).
- Two error styles: `p[role=alert]` with inline style vs `p.err` vs plain `p`.
- Misleading comments: 4561 "Reminder editor" (above `otIdleDlg`), 4254 "LEADERBOARD TAB" (above `tab-clan`), 4716 "Boss and questline rewards" (above `eggDlg`), 4856 "Level-up moment" (above `cardDlg`). Find dialogs by id, not by comment.
- Attributes/ids with no reference in the app script: `data-dot` on two bottom-bar badges, `#shell`, `#authCard`, `#guestBtn`, `#pwWarn`, `#lpCtaNote`, `#pkTime`, `#glassBg`, `#todRow`, `#remTabBtn`, `#profileTabBtn`, `#sessTabBtn`, `#clanTabBtn`. Do not treat them as dead: CSS uses some (`#glassBg`), and the test suites select by id (`#guestBtn` is clicked in 71 suites, `#authCard` in 1).
- Duplicated art: the tomato logo SVG appears 3× in markup + `FAV_DEFAULT` + the `<link rel=icon>`; the splash Pomeo is a hand-copied variant of `pomeoSVG` 10750; the splash event quotes duplicate `EVENTS`.
- `#pomeoPop` reminder pop-up, `#tipPop`, `#achCard`, `#tour`, `#wrapped` are sibling overlays with their own z-index rules; the focus guard decides which may show — a unified toast/popover layer must keep `holdForFocus` semantics ("nothing pops up during focus").
