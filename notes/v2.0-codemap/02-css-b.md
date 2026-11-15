# CSS part B (wrapped → clans / sessions / welcome v1.14.3 / monthly raid) — index.html lines 2001–3793

v1.20, commit 77f8456. 1,793 lines, about 1,820 rule blocks, 84 `@keyframes`, 163 KB. `</style>` is line 3793.
Line numbers drift: search by the selector / keyframe NAME given next to every number.
Not in this slice (they live in part A, lines 9–2000): navigation (`.sidenav` 92, `.btmbar` 114/152, `.nav-scrim` 112), ranks, Study Pass, posts, leaderboard, garden, room, flashcards, base components (`.card` 193, `.btn` 216/840, `.iconbtn` 228, `.chip` 302, `.seg` 345/866, `.setting` 388, `dialog` 396, `.pill` 739, `.toasts`/`.toast-item` 976–986, base inputs 237–242 and 882–901), the Glossed block (1372–1420) and the global motion switches (831–834).

## Sections (in file order)

| # | Banner / block | Lines | What it styles |
|---|---|---|---|
| 1 | WRAPPED — story slides | 2000–2046 | `.wrapped-banner` (card on Stats), full-screen `.wrapped` overlay (a div, z 130, not a `<dialog>`), `.wr-story` 420×760 story with progress `.wr-bars`, slides `.wr-slide` and typography `.wr-k/.wr-big/.wr-h/.wr-p`, charts `.wr-bars2/.wr-hours`, `.wr-sum`, `.wr-share`, tap zones `.wr-nav.prev/.next`. Always white-on-dark, colours from `--wr-a/--wr-b`. |
| 1b | Keyboard shortcuts sheet | 2048–2050 | `.keys` grid and global `kbd` element style. |
| 2 | SUBTASKS | 2052–2137 | Session-card editor (`.sub-toggle`, `.sub-last`, `.sub-ed-list` drag list with `.grip/.tx/.x`, `.sub-add`, `.sub-tpls .chip-t`, `.tpl-save`), compact checklist under the timer (`.sub-check`, custom checkbox `.sub-box`, `.sc-bar`, `.sc-quick`), after-session summary (`.sub-sum`, `.subdet` details, `.tpl-list`). |
| 3 | POLISH | 2139–2180 | Pointer effects: cursor glow `.fx-glow`, tilt `.fx-tilt`, magnetic `.btn.primary`; the GLOBAL focus rings (2159–2161); `.catrow` edge fades `.fade-l/.fade-r`; active-tab glow `.tabs button::before` (`tabBreath`); `.mini-spark`; `.uis-row`. |
| 4 | DESIGN TOKENS + CONSISTENCY (v1.7) | 2182–2353 | `:root` tokens (2186–2194), then overrides that retrofit them: `.card`, `.stack/.grid-2`, `.iconbtn svg`, `.desc/.lbl/.field`, `h1`, `.setting`, minimum font sizes (2195–2210). Sub-blocks: Empty states `.empty` + `.e-*` (2212–2224); Header bell/search `.hdr-right`, `.hdr-count`, header breakpoints (2226–2238); Side sheet `dialog.sheet`, `.sheet-head/.sheet-filters/.sheet-body`, inbox `.ib-*`, command palette `.cmd*` (2240–2283); Undo toast (2285–2288); `.net-banner`, `.ptr`, tab slide `.tab.active.from-r/.from-l` (2290–2307); Settings `.set-wrap`, `.set-search`, `.setting.hit`, `a.btn`, `.app-foot`, About `.about-*`, `.ver-pill`, `.changelog` (2309–2340); What's-new `.news-card` (2341–2352). |
| 5 | PROFILE PICTURES | 2355–2372 | `.av`, `.mini-av`, `.avatar.mini`, avatar sizes per context, animated avatar parts `.av-anim .av-blink/.av-shine/.av-twinkle`. |
| 6 | TRUE MINIMALIST | 2374–2386 | `:root[data-minimal]` spacing (`--card-pad`, gaps), neutral tab highlight, hides `.coin-hint` and the inbox rewards filter. |
| 7 | TUTORIAL WITH POMEO + one-time tips | 2388–2430 | `dialog.tut` and `.tut-*` (top, bubble, option cards `.tut-opt`, dots, footer), `.tour-tip .tour-pomeo`, floating `.tip-pop`. |
| 8 | SESSION SUMMARY + ENERGY CHECK-IN + INSIGHTS | 2432–2470 | `.after-row`, `.sum-head`, energy picker `.energy .opts button` + countdown `.energy .bar`, quick-start `.qs-row`, insights `.ins-grid/.ins/.ins-chart/.ins-progress`. |
| 8b | Tutorial: "Pick your style" | 2472–2495 | `.style-pick`, `.sp-card`, Glossed preview `.gl-prev` (`data-l` off/lite/full, `data-solid`), mini segmented `.gl-seg`. |
| 9 | TOUCH TARGETS | 2496–2523 | One `@media (pointer: coarse)` block: 44 px minimums for buttons, selects, inputs, chips, summary; invisible `::after` hit areas for header controls and `.rem-check`. Plus `[data-row-toggle]` cursor. |
| 10 | WELCOME PAGE | 2524–2674 | `.auth.lp`, hero `.lp-*`, sign-up card `.auth-card`, `.auth-tabs`, `.pw-meter`, `.pw-warn`, `.stay`, `.btn .spin`, below the fold `.lp-sec/.lp-feats/.lp-cmp/.lp-faq`, feature mini-animations `.fx-ring/.fx-list/.fx-bars/.fx-garden/.fx-boss/.fx-pomeo/.fx-min` and their keyframes. |
| 11 | PREVIEW MODE | 2676–2692 | Sticky `.pv-banner` (z 41), `body.previewing` offsets via `--pv-h`, `dialog.pv-dlg`. |
| 12 | LOADING SCREEN | 2694–2750 | `.splash` (z 200), Pomeo wake-up parts `.sp-*`, vine progress driven by `--sp`, exit states `.out/.hop/.fly/.fade-all`, `.calm`. |
| 13 | FOCUS ATMOSPHERE | 2752–2767 | Fixed `#atmo` layer (z 0) with `.a-focus/.a-deep/.a-break`, `atmoDrift`. |
| 13b | Ripening ring | 2769–2772 | `.ring.ripen` strokes with `--ripe`. |
| 13c | Pomeo empty states | 2774–2789 | `.pscene`, `.empty.has-scene`, `.ps-drop/.ps-wave/.ps-page`. |
| 14 | BOSS ARENA · TROPHY HALL · QUESTLINE · BAG (v1.12) | 2792–3089 | Arena `.q-switch`, `.sdot`, `.arena*`, `.boss-art` states, `.dmg-float`, `.shot`, `.phase-tag`, `.hpbar.big`, `.blog`, `.squad-list.portraits`, reward path `.rp/.mi/.mi-pv`, `.mastered-badge`, `.next-boss`, `.claim-list`, `.hall/.hall-card` (2797–2917); Reward reveal `.reward-dlg/.rw-*` (2919–2934); rarity `.r-*` (2937); Questline `.ql-*`, `.qn*`, `.evb-list`, `.pe*` (2939–2982); Festive `.brand-deco`, `.ev-banner` (2984–2995); Pomeo skins (2997–3001); auras `.aura-spin/.aura-shim` (3003–3009); gradient names `.ncg` (3011–3014); event rings `.ring.rs-*` (3016–3027); Bag `.bag-*`, `#bagSearch`, `.look-*`, loadouts `.lo*`, `.bi-src` (3029–3079); first-load skeletons `body.first-load` (3081–3087); `.tabs .lf/.ls` (3088–3089). |
| 15 | PLAYER CARD | 3091–3230 | `.pc-host`, `.pcard` (container queries), `.pc-*` parts, card styles `.cs-scholar/.cs-gamer/.cs-champion/.cs-haunted/.cs-frost` (3160–3172); Customise + Share dialogs `.card-dlg/.cd-*`, `.share-dlg/.sh-*` (3175–3219); shared-link page `#cardView`, `.cv-*` (3221–3230). |
| 16 | TIME-OF-DAY SKY | 3232–3272 | Fixed `#todSky` (z 0), `.sky-sunrise/.sky-day/.sky-sunset/.sky-night`, `.sky-stars`, `.sky-rain`; stray `.setting.sub-setting` (3272). |
| 17 | COMPLETION STAMPS | 3274–3295 | `.after-row.has-stamp`, `.stamp-land` (+`.go`), `.st-mini`, `.pvstamp`, `.cardpv`. |
| 18 | v1.13.1 boss tiers… / v1.14 banner | 3297–3335 | `.btier.bt-1…5`, `.boss-tier`, `.aura-pulse/.aura-flare`, `.ncg.ncsh`, `.av-bob`, fixed `#themeFx` (z 0) with `.tfx/.tfx-4/.tfx-5` and ember `i`. |
| 19 | INTRO (first visit) | 3337–3366 | `.intro` (z 1000), `.in-bg/.in-stage/.in-line/.in-w/.in-cur/.in-pomeo/.in-skip`, states `.fade/.leaving/.pomeo-in/.calm`, `.intro-on`. |
| 20 | TO-DO | 3368–3399 | `.rem-seg`, `.todo-add`, `.todo-filters`, `.todo` row states (`.lifting/.overdue/.leaving/.done/.pri-*`), `.td-*`, `.todo-dlg`, `.today-todo`, `.hide-touch`. |
| 20a | Clans (v1.14) | 3401–3437 | `.ctag`, `.clan-grid`, `.clan-none`, `.clan-head/.clan-pub`, `.clan-banner`, `.clan-id/.clan-emb/.clan-title/.clan-lv`, `.clan-xp`, `.bar`, `.clan-stats`, `.clan-now`, `.live-dot`. |
| 20b | Study sessions section (v1.19.1) | 3438–3473 | `.sess-page`, `.sess-hero`, `.sess-tile`, `.st-seats`, `.st-fr`, `.up-list/.up-row`, `.hist-list`, live nav badge `.tbadge.tb-live`. |
| 20c | Host sheet | 3474–3501 | `.hs-dlg`, step dots `.hs-dots`, `.hs-step`, radio cards `.hs-opt`, seat pills `.hs-seats`, `.hs-preset` (holds a native `<select>`), `.hs-nav`. |
| 20d | Clan lists | 3502–3536 | `.clan-live-row`, planned `.cs-list/.cs-row/.cs-when/.chip-tag/.cs-rsvp/.cs-acts`, members `.cm-row/.cm-rk/.cm-name/.cm-role`, `.mvp`, kebab menu `.cm-more/.cm-menu`, `.clan-feed`. |
| 20e | Folding cards (v1.19.1) | 3537–3547 | `.fold-hd`, `.fold-ic`, `.fold-body`, `.fold-card.folded .fold-x`, `.fold-more`. |
| 20f | Trophies, quest + raid, live table, clan leaderboard, dialogs | 3548–3619 | `.ctros/.ctro/.tro-ic`; `.clan-quest/.clan-raid .cp`, `.raid-*`; `.lv-card/.lv-clock/.lv-table/.lv-seat/.lv-react/.lv-r/.lv-sum`, `.live-bar`; `.clb`; `.clan-dlg`, `.cshop-dlg`, `#csGrid`, `.ci-code`, `.set-row`, `#csdDays`, `.ib-acts`, `.crem*`. |
| 20g | Phone overrides + appended fix-ups | 3620–3664 | `@media (max-width: 640px)` for clan/live sizes, then a run of later corrections that re-declare earlier selectors (see Traps), `.lv-mode/.cs-mode`, `.mode-seg`. |
| 20h | Player card fold (v1.14.3) | 3665–3677 | `.pc-toggle`, `.pc-fold .pc-body` (grid-rows collapse), `.pc-closed`. |
| 20i | Welcome page (v1.14.3) | 3678–3767 | Grid areas for `.lp-wrap`, `.lp-bar`, `.lp-login`, `.lp-peek` (`.pk-*` animated preview window), custom modal `.lp-auth` + `.lp-scrim`, responsive variants (desktop inline / tablet window / phone bottom sheet). |
| 20j | Monthly raid (v1.14.3) | 3768–3792 | `.rc-head/.rc-tier/.rc-line/.rc-reward/.rc-rally/.rc-more/.rc-list/.rc-row/.rc-bar/.rc-next`, `.ctro.rallied`. |

## Tokens

### Defined in this slice

| Name | Value | Where (selector · line) | Kind |
|---|---|---|---|
| `--sp-1 … --sp-6` | 4 / 8 / 12 / 16 / 20 / 24 px | `:root` · 2187 | spacing |
| `--r-sm`, `--r-md`, `--r-lg`, `--r-pill` | 10 / 14 / 16 / 999 px | `:root` · 2188 | radius |
| `--sh-1` | `0 1px 2px rgba(0,0,0,.04), 0 6px 16px -10px rgba(0,0,0,.22)` | `:root` · 2189 | shadow (resting) |
| `--sh-2` | `0 20px 44px -18px rgba(0,0,0,.45)` | `:root` · 2190 | shadow (floating) |
| `--fs-xs`, `--fs-sm`, `--fs-md`, `--fs-lg`, `--fs-xl` | 12 / 13 / 15 / 17 / 22 px | `:root` · 2191 | type |
| `--icon` | 18px | `:root` · 2192 | size |
| `--card-pad` | 18px; 16px at `(max-width: 640px)` (2194); 24px under `:root[data-minimal]` (2377); 18px for minimal at ≤640 (2378) | `:root` · 2192 | spacing |
| `--empty-ic` | data-URI SVG mask (5 variants) | `.empty` 2218, `.empty.e-inbox` 2219, `.e-list` 2220, `.e-trophy` 2221, `.e-people` 2222 | asset |
| `--accent-soft` (scoped) | `color-mix(in srgb, var(--text) 8%, transparent)` | `:root[data-minimal] .tabs` · 2382 | colour role override (minimal only) |
| `--rc` | #8c9a97 / #3f8fbf / #8a6fd1 / #c9a227 | `.r-common`, `.r-rare`, `.r-epic`, `.r-legendary` · 2937 | colour role (rarity); consumed by `.rw-item`, `.qn-rw .mi-pv`, `.bag-item`, `.bi-src .rar`, `.rc-rar` |
| `--star` | #7d86c4; #ffffff in dark | `#todSky .sky-stars` 3255; dark 3256 + media 3257 | colour |
| `--sky-a` | 1 | `#todSky` · 3235 | dead: never read anywhere |
| `--clan-acc` | `var(--accent)` | `.clan-prof` · 3629 | colour role default (JS overrides it elsewhere) |

How themes touch them: they do not. The spacing, radius, shadow, type and icon tokens exist only on `:root`; there is no theme, dark, Glossed or motion override. `--sh-1/--sh-2` use the same black alpha in light and dark (compare `--lift` at line 824, which has a dark variant). Only `--card-pad` reacts (viewport and True Minimalist).

Adoption is very low. Uses per token (part A CSS / this slice / HTML+JS): `--sp-1` 0/1/0, `--sp-2` 0/12/0, `--sp-3` 0/10/0, `--sp-4` 2/16/1, `--sp-5` 0/1/0, `--sp-6` 0/0/0 (never used), `--r-sm` 0/2/0, `--r-md` 0/6/0, `--r-lg` 0/1/0, `--r-pill` 0/1/0, `--sh-1` 0/2/0, `--sh-2` 0/2/0, `--fs-xs` 0/7/0, `--fs-sm` 0/4/0, `--fs-md` 0/1/0, `--fs-lg` 0/1/0, `--fs-xl` 0/1/0, `--icon` 0/2/0, `--card-pad` 0/1/0. The older `--radius` (16px, line 26, same value as `--r-lg`) is used 5 times in part A and twice here (`.pcard` 3098, `.lp-auth` 3751). In this slice: 12 of 171 `border-radius`, 14 of 270 `font-size`, 4 of 41 `box-shadow` declarations use a token.

### Consumed here, defined elsewhere

- Colour roles (lines 14–38, re-set per theme): `--accent` (125 uses in this slice), `--muted` (100), `--line` (92), `--surface` (48), `--text` (33), `--accent-soft` (28), `--bg` (26), `--heat0` (10), `--danger` (10), `--warn` (9). `--on-accent` (5) has no `:root` definition; it is only set by themes, so every use carries the fallback `#fff`. `--warn` is used twice with a different fallback `#d08a2c` (`.pw-meter[data-s="2"]` 2566, `.pw-warn` 2569) although `:root` defines `#c07a2c`.
- Themes are applied by JS, not by selectors: `applyTheme()` (about line 8863) sets `data-theme="dark|light"` and writes nine variables inline on `<html>` from `SKINS` (`SKIN_VARS` at about 8799: `bg, surface, text, muted, line, accent, accent-soft, heat0, on-accent`). With the default theme on "auto" it REMOVES `data-theme`, so dark then comes only from `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) … }`.
- Motion: `--ease` (43), `--spring` (10), `--spring-soft` (5), defined at 821–823. No duration tokens exist.
- Glossed: `--glass-fill`, `--glass-blur`, `--glass-sat`, `--glass-edge`, `--sheen-a`, `--sx` (defined 1372–1377; `--sx` written by `paintSheen()`/`sheenLoop()`).

### Runtime custom properties (written by JS or inline markup, read by CSS in this slice)

| Property | Read by (selector · line) | Written by |
|---|---|---|
| `--wr-a`, `--wr-b` | `.wr-story` 2010 | `openWrapped()` |
| `--dur` | `.wr-bars i.cur b` 2016 (default 7s) | no writer found: always 7s |
| `--i` | `.wr-in` 2042–2043, `.rw-item` 2931–2932 | `animateIn()`, chart renderers, reward reveal |
| `--mx`, `--my` | `.fx-glow` 2145, 2149 | `fxFrame()` |
| `--pv-h` | `body.previewing .top` 2685, `.set-search` 2687 | `startPreview()` |
| `--sp` | `.sp-grow` 2712, `.sp-vine-in` 2714 | inline splash script (about line 3872) |
| `--edur` | `.energy .bar i` 2448 | `renderEnergyRow()` |
| `--ripe` | `.ring.ripen` 2770–2772 | `paintRipe()` |
| `--ba`, `--bb`, `--al1`, `--al2`, `--ad1`, `--ad2` | `.arena` 2804–2806, `.arena-floor`, `.hpbar.big`, `.mastered-badge.on`, `.nb-art`, `.hall-card` | `renderBossView()`, `masteredBadge()`, `trophyHall()`, `trophyCards()` |
| `--sx` (shot distance; same name as the Glossed sheen position) | `shotX` keyframes 2844 | `bossHit()` |
| `--rw1` | `.reward-dlg::before` 2922, `.rw-kicker` 2924 | `showRewardReveal()` |
| `--ea`, `--eb` | `.ql-hero`, `.ql-meta .pill`, `.ql-bar i`, `.ql-next`, `.ev-banner` | `renderQuestline()`, `renderFestive()`, `renderPassView()` |
| `--rglow`, `--flare` | `.ring.rs-ev` 3017–3024, `.aura.aura-flare` 3313–3315 | the runtime stylesheet built by the `rewardCSS()` IIFE (about line 16854): `.ring.rs-<id>{--rg1;--rg2;--rg3;--rglow}`, `.aura-x-<id>{--flare}` |
| `--pc-bg`, `--pc-fg`, `--pc-mut`, `--pc-line`, `--pc-tile`, `--pc-acc`, `--pc-acc2`, `--pc-font` | every `.pcard`/`.pc-*` rule 3098–3172, `.pc-toggle` 3666 | `cardHTML()` |
| `--w` | `.pc-subj li i` 3136 | `cardHTML()` |
| `--tc` | `.pc-tier` 3115, `.td-tag` 3390, `.rc-tier` 3770 | `cardHTML()`, `todoRow()`, `raidCardHTML()` |
| `--sz`, `--tw`, `--dl` | `#todSky .sky-stars i` 3258–3259 | `renderSky()` |
| `--tf1`, `--tf2`, `--tf3`, `--s`, `--d`, `--x`, `--dl` | `#themeFx` 3326–3334 | `themeFx()` |
| `--dx`, `--dy` | `miniSpark` keyframes 2178 | `miniBurst()` |
| `--clan-acc` | `.ctag`, `.clan-lv`, `.bar i` | `clanHeaderHTML()`, `openClanCard()`, `clanProfileCard()` |
| `--ra`, `--rb` | `.clan-raid .bar.hp i` 3428, `.raid-art` 3555, `.rc-bar i` 3784 | `raidCardHTML()` |
| `--h` | `.pk-bars i` 3716 | inline `style="--h:…"` in the welcome markup (about line 3959) |

Name-collision warning for a new token system: `--sp` (splash progress) next to `--sp-1…6`; one-letter runtime names `--i`, `--w`, `--h`, `--s`, `--d`, `--x`; `--sx` used for two different things.

## Components

States column: H hover, F focus-visible, A active, D disabled. "none" means the state has no rule here (it may inherit a base rule from part A).

### Buttons and button-like

| Selector (line) | What | Variants / modifiers | States | Notes |
|---|---|---|---|---|
| `.btn.primary` (2157) | magnetic primary button | Full motion only | — | adds the separate `translate` property to the transition list; base at 222/840 |
| `a.btn` (2324) | link styled as button | — | — | sets colour, no underline, inline-flex centring |
| `.btn .spin` (2574) | inline spinner in a button | — | — | spins unless motion is Off |
| `.sub-toggle` (2055) | text toggle "Subtasks" | `.cnt` | none | accent text, no border |
| `.sub-tpls .chip-t` (2078) | template chip | — | H border accent | pill, 12.5px |
| `.qs-row button` (2453) | quick-start pill | — | H border + text accent | ellipsis, 50% width at ≤420 |
| `.tut-opt` (2403) | option card (tutorial) | `.on` | H border accent | radius `--r-md`, min-height 64 |
| `.energy .opts button` (2442) | energy choice | `.on` | H | radius 12 |
| `.cd-opt` (3185) | card-style option | `.sel` | D opacity .62 | radius 12 |
| `.cd-bn` (3194) | banner swatch | `.sel` | none | radius 10, 2px border |
| `.cd-feat` (3198) | featured-stat row with switch | `.on` | none | radius 12 |
| `.hs-opt` (3486) | radio card | `:has(input:checked)` | H | radius 12; native radio visible with `accent-color` |
| `.hs-seats span` (3494) | seat pill over a hidden radio | `input:checked + span` | F via `input:focus-visible + span` | 46×42, radius 12 |
| `.mode-seg button` (3661) | two-line option | `.active` | none | radius 12, min-height 44 |
| `.gl-seg` (3 buttons, 2492) | mini segmented control | `button.on` | none | radius 10, hairline dividers; unrelated to `.seg` |
| `.lv-r` (3584, resized 3635) | round reaction button | — | H lift, A scale .92 | 44×44 |
| `.lo` / `.lo-apply` (3049–3052) | loadout chip | `.lo.cur` | none | radius 12 |
| `.pc-toggle` (3666) | player-card "show stats" pill | `.pc-fold:not(.pc-closed)` rotates the caret | H, F (uses `--pc-acc`) | min-height 36 |
| `.fold-hd` (3538) | card fold header button | `.fold-card.folded` | H (icon chip), F outline offset 4 | |
| `.wr-share` (2038), `.wr-close` (2019), `.wr-nav` (2039) | Wrapped controls | `.prev/.next` | none | hard white/black |
| `.lp-preview` (2544), `.lp-login` (3683), `.lp-cta .btn` (3688), `.lp-cta .lp-guest` (3689) | welcome CTAs | `.btn.primary.lp-preview` | H on guest | guest is an underlined text button |
| `.lp-swatches button` (2549) | theme swatch (radio) | `.on` | none | 30 px circle with 44 px `::after` hit area |
| `.lp-more-link` (2553), `.in-skip` (3363) | text links | — | H | |
| `.cm-more summary` (3528, resized 3636) | kebab trigger (`<details>`) | `[open]` | H | 44×44 |
| `.cm-menu button` (3532) | menu item | `.danger` | H bg | radius 8 |
| Close buttons: `.sub-ed-list .x` (2071), `.ib-item .ib-x` (2265), `.news-card .nc-x` (2352), `.ev-banner .nc-x` (2994), `.auth-close` (3733), `.lv-sum .ib-x` (3589/3638) | dismiss | — | H on `.x` (danger colour), `.ib-x` opacity | six separate implementations, sizes 15–18 px glyphs |
| `.today-todo button` (3397), `.pv-banner .pv-go/.pv-exit` (2683–2684), `#csdDays button` (3614), `#csTabs button` (3648), `.cs-rsvp button` (3515), `.cs-acts .btn.on` (3517) | contextual tweaks | | | padding / size overrides of `.btn`/`.seg` |

### Pills, badges, dots

| Selector (line) | What | Notes |
|---|---|---|
| `.hdr-count` (2229) | unread count on header icons | danger bg, hard `#fff`, 17 px high, ring `0 0 0 2px var(--bg)` |
| `.sdot` (2800), `.live-dot`/`.clan-now i` (3434), `.td-pri` (3383), `.ib-dot` (2267), `.cv-brand i` (3226), `.pk-bar i` (3699) | status dots | 6–12 px; `.live-dot` is hard `#e5484d`; priority dots hard `#e0614a/#e2a33b/#6aa6c9` |
| `.ver-pill` (2333), `.clan-lv` (3423), `.lv-mode`/`.cs-mode` (+`.synced`) (3654–3656), `.rc-tier` (3770), `.rc-rally` (+`.on`) (3775–3777), `.hc-m span` (2914), `.chip-tag` (3513), `.rem-seg .cnt` (+`.due`) (3372–3373), `.lv-seat .lv-state` (3574), `.mvp` (3526), `.phase-tag` (2846), `.mastered-badge` (+`.on`) (2888–2891), `.ql-meta .pill` (2949), `.arena-card .boss-meta .pill` (2862), `.lp-badges li` (2541), `.pk-chips li` (3721), `.bag-item .pv .tag.new` (3063) | about 18 pill variants | paddings range 1px 6px … 6px 13px, font 10–13.5 px, each written out by hand; all radius 999px |
| `.btier` (+`.bt-1…5`, `.sm`) (3301–3310), `.ctag` (3402), `.bi-src .rar` (3066), `.rc-rar` (3774), `.pc-tier` (3115) | text labels with tier/rarity colour | tier colours hard-coded with separate dark values |
| `kbd` (2050) | key cap | global element rule |

### Cards, tiles, panels

| Selector (line) | What | Notes |
|---|---|---|
| `.card` (2195) | re-declares padding `--card-pad` and radius `--r-lg` over line 193 | `.card, .item` get `transition: border-color` at 2152 |
| `.card.fx-glow`, `.item.fx-glow` (2144–2151) | cursor spotlight | excludes `.wrapped-banner` and `.exam-card.near`; Glossed variant adds the sheen gradient |
| `.wrapped-banner` (2003), `.news-card` (2342), `.ql-hero` (2942), `.ql-next` (2970), `.ev-banner` (2988) | cards with a radial/linear accent wash | five copies of the same "tinted corner" background recipe |
| `.ins` (2459), `.sp-card` (2475), `.lp-fx` (2592), `.hall-card` (+`.won/.cur`) (2903–2905), `.rw-item` (2927), `.mi-pv` (2879), `.pc-tile` (3117), `.pc-fact` (3128), `.pc-chip` (3139), `.sess-tile` (+`.mine`) (3447), `.ctro` (+`.rallied`) (3549, 3790), `.clan-stats > div` (3430), `.clan-live-row` (3502), `.sh-prev` (3213), `.pk-win` (3697), `.fx-min > div` (2636) | inner tiles | radius 12 or 14, 1px `--line` border, bg `--bg` or `--surface` |
| `.sub-sum` (2113), `.after-row:not(.hidden)` (2435), `.arena-form` (2850), `.hs-preset` (3497), `.clan-req-note` (3410), `.lp-alert` (3694), `.pw-warn` (2569) | tinted note panels | accent / warn / danger tint through `color-mix` |
| `.bag-item` (3059) | bag grid item (extends `.item`) | `.sel`, `.locked` (3634), F outline, H lift (Full only), 3px rarity top border |
| `.pcard` (3098) | player card | `.cs-scholar/.cs-gamer/.cs-champion/.cs-haunted/.cs-frost`, `.pc-mini`, `.pc-fold.pc-closed`; own colour system `--pc-*`; `container-type: inline-size` with `@container` at 520 and 340 |
| `.arena` (2803) | boss stage | `.phase-angry/.phase-almost/.phase-down`, `.no-squad`; `isolation: isolate` with z −1 layers |
| `.lv-table` (3568) | live study table | radius 22 |

### Dialogs, sheets, overlays, popovers

| Selector (line) | What | Notes |
|---|---|---|
| `dialog.sheet` (2241–2251) | the only sheet component (inbox) | right-side drawer 420 px wide ≥641; bottom sheet 88dvh ≤640; enter `sheetIn` (Full), exit `.closing` + `sheetOut`; parts `.sheet-head`, `.sheet-filters`, `.sheet-body`. No drag-to-dismiss styling. |
| `.cmd` (2269) + `.cmd-in`, `.cmd-list li(.sel)`, `.cmd-foot` | command palette dialog | input is borderless with `outline: none`; `mark` highlights matches |
| `dialog.tut` (2392), `dialog.pv-dlg` (2688), `.reward-dlg` (2920), `.card-dlg` (3176), `.share-dlg` (3211), `.hs-dlg` (3475), `.clan-dlg` (3602), `.cshop-dlg` (3604), `.todo-dlg` (3394–3396) | per-dialog width and padding | widths: 380, 440, 460, 560, 560, 640, 980 px; gutters mix `100vw - 24px` and `100vw - 32px` |
| `.wrapped` (2008) | full-screen story overlay | plain fixed div, z 130, scrim `rgba(5,6,10,.82)` |
| `.splash` (2699), `.intro` (3340) | boot overlays | z 200 and z 1000 |
| `.lp-auth` + `.lp-scrim` (3731–3766) | hand-rolled modal for sign-up | desktop: inline column; 641–899: centred window; ≤640: bottom sheet (transform 104% → none); scrim z 69, panel z 70; scroll lock through `:root.lp-modal` |
| `.cm-menu` (3531) | dropdown inside `<details class="cm-more">` | absolute, z 5, own shadow `0 10px 30px rgba(0,0,0,.14)`; no flip, can be clipped by an `overflow` ancestor |
| `.tip-pop` (2422) | one-time tip bubble | fixed bottom-right, z 85, `--sh-2`; Glossed variant 2430; moves above the bottom bar at ≤640 |
| `.toast-item.has-undo` + `.undo` (2286–2288) | undo action inside a toast | base toast at 980 |
| `.net-banner` (2291–2297) | offline / back-online pill | `.show`, `.ok`; z 70 |
| `.ptr` (2298–2301) | pull-to-refresh indicator | `.ready`, `.spin`; z 60 |
| `.pv-banner` (2679) | demo banner | sticky, z 41 (above the header z 10 and bottom bar z 40) |

### Lists and rows

`.keys` (2049), `.sub-ed-list li` (+`.dragging/.done`) (2061–2065), `.sub-check li` (+`.done/.fresh`) (2093–2104), `.tpl-list li` (2134), `.ib-item` (+`.unread`) (2258–2268), `.cmd-list li` (+`.sel`) (2276–2281), `.changelog li` (2335), `.about-list` (2339), `.lp-cmp-row` (2594), `.lp-faq details` (2602–2607), `.blog li` (+`.me`) (2864), `.squad-list.portraits li` (2868), `.rp` (+`.got`) (2872), `.claim-list li` (2899), `.qn` (+`.done/.claimed/.final`) (2955–2968), `.evb-list li` (+`.me`) (2974), `.pe` (2978), `.pc-subj li` (3134), `.cd-tg` (3204), `.todo` (+ states) (3379–3393), `.sess-tile`, `.up-row` (3462), `.hist-list li` (3468), `.cs-row` (3506), `.cm-row` (+`.me`) (3519), `.clan-feed li` (3535), `.clb li` (3596), `.set-row` (3609), `.rc-row` (3781), `.rc-next li` (3788).
Row separators are always `border-top: 1px solid var(--line)` plus a `:first-child` / `:first-of-type { border-top: 0 }` reset, re-written 13 times. Row vertical padding varies: 5, 6, 7, 8, 9, 10, 12 px.

### Progress bars (13 separate implementations)

| Selector (line) | Height | Fill technique |
|---|---|---|
| `.wr-bars i b` (2013–2016) | 3 | `scaleX` keyframes |
| `.sub-check .sc-bar i` (2088–2089) | 4 | `scaleX` transition .5s |
| `.energy .bar i` (2446–2448) | 3 | `scaleX` keyframes (`shrinkBar`) |
| `.ins-progress i` (2467–2468) | 6 | inline width |
| `.pw-meter i` (2563–2568) | 4 | four segments, `data-s="1…4"` |
| `.fx-hp i` (2630–2631) | 8 | `scaleX` keyframes |
| `.hpbar.big` (2855–2861) | 22 | `scaleX` (base 1440) + tick overlay `s` |
| `.ql-bar i`, `.qn-bar i` (2950–2951, 2962) | 8 / 6 | `scaleX` transition .8s |
| `.pc-subj li i` (3136) | 8 | background gradient stop `--w` |
| `.clan-head .bar i` etc. (3426–3428) | 8 | `translateX(-100%)` + `width: 100% !important` |
| `.pk-hp i` (3718–3719) | 8 | `width` keyframes (`pkHp`) |
| `.rc-bar i` (3783–3784) | 7 | inline width |
| `.sp-vine` (2710–2717) | 26 | two counter-translated layers driven by `--sp` |

### Empty states

`.empty:not(.card)` + `::before` mask icon (2213–2217), icon variants `.e-inbox/.e-list/.e-trophy/.e-people` (2219–2222), `.empty .btn` (2223), suppressed inside `.empty-card`/`.rem-empty` (2224); Pomeo scenes `.pscene` + `.empty.has-scene` (2775–2789); one-offs `.bag-empty` (3069), `.clan-none` (3405), `.set-none` (2319), `.cmd-list .none` (2281), `.pc-empty` (3147).

### Avatars and decorative layers

`.av` (2358), `.avatar.mini` (2360), `.av-anim` parts (2366–2372, 3321); sizes fixed per context (22, 26, 34, 60 px). Fixed full-viewport decorative layers, all `z-index: 0; pointer-events: none`: `#atmo` (2756), `#todSky` (3235), `#themeFx` (3324).

## Form controls

Base styling is in part A; this slice only adds local tweaks. For reference: line 237 styles only `input[type="text"], input[type="number"], input[type="password"], select` (bg `--bg`, 1px `--line`, radius 10, padding 9px 12px); line 240 `input:focus, select:focus` (3px `--accent-soft` outline + accent border); 241 `input[type="color"]`; 882–890 turns EVERY `input[type="checkbox"]` into a 42×24 switch; 482 and 891–897 style `input[type="range"]`. `input[type="date"]`, `[type="time"]`, `[type="search"]` and `textarea` have no themed base rule (only the Glossed rule at 1413 mentions date/time). Markup totals for the whole file: 41 checkbox, 39 text, 8 number, 5 date, 3 time, 3 range, 3 radio, 2 search, 2 password, 1 file, 1 color, 19 `<select>`, 3 `<textarea>`.

| Control | Selectors in this slice (line) | What happens |
|---|---|---|
| `<select>` | `.hs-preset select` (3498) max-width 100%; `.set-row select` (3612) max-width 180px; `.crem-before` (3617, a select) 13px, padding 4px 6px, max-width 140px; touch `select { min-height: 44px }` (2501) | native arrow and native popup everywhere; no custom select exists |
| Text inputs | `.sub-ed-list input.tx` (2070), `.sub-add input` (2074), `.tpl-save input` (2082), `.sub-check .sc-quick input` (2107), `.tut-opt input` (2405), `.tut-row input` (2410), `.sh-link input` (3218), `.todo-add input` (3375) | flex sizing and padding only |
| Borderless inputs | `.cmd-in input` (2272–2273), `.set-search input` (2314–2315) | `border: 0; background: none; outline: none`; the wrapper `.set-search:focus-within` shows the accent border, `.cmd-in` shows no focus indicator at all |
| Search inputs | `#bagSearch` (3032, `type="search"`) is fully restyled by id (pill, `--surface`, min-height 44); `#setSearch` (`type="search"`) relies on `.set-search` | `type="search"` is not covered by the base rule at 237, hence the per-id styling |
| Self-styled input | `.lo-form input` (3047) radius 10, bg `--bg`, padding 8px 12px | duplicates the base look by hand |
| Checkbox (switch) | `.tut-switch input[type="checkbox"]` (2401), `.sp-card .sp-row input[type="checkbox"]` (2480), `.stay input` (2572), `.cd-feat input` (3202), `.cd-tg input` (3205) | layout only (`flex: none`, `order`); the visual is the global switch |
| Checkbox (custom box) | `.sub-check input[type="checkbox"]` (2102) hidden with `position: absolute; opacity: 0; pointer-events: none`; visual `.sub-box` (2099–2101) 18×18 radius 6; checked look comes from the parent class `li.done .sub-box` (2100), not `:checked`; focus via `input:focus-visible + .sub-box` (2103); pop animation `li.fresh` (2104) | the only custom checkbox in the app |
| Radio | `.hs-opt input` (3489) native radio with `accent-color`; card highlight `.hs-opt:has(input:checked)` (3488). `.hs-seats input` (3493) invisible, covering its label; pill `input:checked + span` (3495); focus `input:focus-visible + span` (3496) | two different radio patterns in one dialog |
| Range, number, date, time, color | none here except the touch block: `input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]) { min-height: 44px }` (2502) and `input[type="color"] { min-width: 44px; min-height: 44px }` (2503) | |
| Textarea | `.todo-dlg textarea` (3395): width 100%, min-height 70, `resize: vertical`, `font: inherit` | no border, background, radius or focus rule: browser default look (part A has the same for `.dk-bulk textarea` 1917) |
| Focus | `:where(input[type="text"], input[type="number"], input[type="date"], input[type="time"], input:not([type]), select):focus-visible` (2161) | never wins: `input:focus, select:focus` at 240 has higher specificity, so this rule is effectively dead |
| `<details>/<summary>` | `.subdet summary` (2125–2128, text ▾/▴), `.lp-faq summary` (2603–2606, rotating +), `.cm-more summary` (3528–3530, kebab), `.rc-more summary` (3779) | four hand-made disclosure styles |
| Labels | `.sub-check li label` (2096), `.stay` (2571), `.todo-dlg label.lbl` (3396), `.cd-tg` (3204), `.hs-seats label` (3492) | |

## Hard-coded values

Counts are for lines 2001–3793 only (`grep -o` on the property, data-URIs excluded for colours).

**border-radius (171 declarations, 12 use a token):** 999px ×29 · 50% ×29 · 12px ×20 · 14px ×11 · 6px ×9 · 8px ×8 · 10px ×8 · 4px ×7 · `var(--r-md)` ×6 · inherit ×4 · 18px ×4 · 3px ×3 · 22px ×3 · `var(--radius)` ×2 · `var(--r-sm)` ×2 · 9px ×2 · 99px ×2 · 7px ×2 · 2px ×2 · 20px ×2 · 16px ×2 · 0 ×2 · `var(--r-pill)` ×1 · `var(--r-lg)` ×1 · 24px ×1 · asymmetric ×9 (`6px 6px 2px 2px`, `5px 5px 2px 2px`, `4px 4px 2px 2px`, `2px 2px 0 0`, `50% 50% 0 0`, `22px 22px 0 0`, `20px 20px 0 0`, `20px 0 0 20px`, `12px 12px 12px 4px`).
Seventeen distinct pixel radii (2, 3, 4, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 99, 999). Pills are written three ways: 999px, 99px, `var(--r-pill)`.

**box-shadow (41 declarations, 4 use a token):** `none` ×4 · `var(--sh-1)` ×2 · `var(--sh-2)` ×2. Elevation shadows written by hand (8 different): `0 30px 80px -30px rgba(0,0,0,.8)` (`.wr-story`), `0 30px 60px -20px rgba(0,0,0,.45)` (`.lp-auth .auth-card`), `0 24px 50px -28px rgba(0,0,0,.35)` (`.pk-win`), `0 12px 24px -12px rgba(0,0,0,.35)` (`.todo.lifting`), `0 10px 22px -12px rgba(0,0,0,.45)` (`.sub-ed-list li.dragging`), `0 10px 30px rgba(0,0,0,.14)` (`.cm-menu`), `0 8px 24px -14px rgba(0,0,0,.5)` (`.sh-prev img`), `0 6px 14px -10px rgba(0,0,0,.3)` (`.fx-bub`). Ring shadows (selection or separation, 15): `0 0 0 2px var(--accent)` ×2, `0 0 0 2px var(--accent-soft)` ×2, `inset 0 0 0 1px var(--line)` ×2, and one each of `0 0 0 2px var(--text)`, `0 0 0 2px var(--surface)`, `0 0 0 2px var(--bg)`, `0 0 0 4px var(--accent-soft)`, `0 0 0 1px var(--line)`, `inset 0 0 0 1px var(--accent)`, `0 0 0 5px color-mix(accent 18%)` (focus halo), two double rings, `0 0 0 2px color-mix(--ba 55%)`, `0 0 0 2px #f2c14e inset`, `0 0 0 1.5px #c33a2a inset`. Glows (5): `--pc-acc`, `#f28c28`, `--tf1`, `--star`, inset white.

**font-size (270 declarations, 14 use a token):** 14px ×41 · 12px ×28 · 13px ×24 · 12.5px ×22 · 13.5px ×18 · 11px ×17 · 11.5px ×15 · 15px ×11 · 16px ×10 · 10px ×10 · 18px ×9 · `var(--fs-xs)` ×7 · 20px ×7 · 22px ×5 · 10.5px ×5 · `var(--fs-sm)` ×4 · 26px ×4 · 24px ×4 · 14.5px ×4 · 30px ×3 · 21px ×3 · 19px ×3 · 17px ×2 · 64, 56, 46, 40, 16.5 px ×1 each · `clamp()` ×5 · `.82em` ×1 · `var(--fs-md/lg/xl)` ×1 each. Between 10 and 15 px there are 11 sizes in half-pixel steps. Plus 3 `font:` shorthands with their own sizes (10.5, 12.5, 26 px) and 15 `font: inherit`.
**font-weight:** 600 ×45 · 700 ×33 · 650 ×8 · 800 ×4 · 500 ×3 · 750 ×2 · 400 ×2 · 850 ×1 · 300 ×1.
**letter-spacing:** 19 distinct values (.01em … .16em, negative −.01 … −.025em, px values). **line-height:** 14 distinct values (1, 1.06, 1.1, 1.15, 1.2, 1.25, 1.3, 1.4, 1.45, 1.5, 1.55, 1.6, 2.2, 48px).

**gap (241, 13 use a token):** 8px ×60 · 10px ×40 · 6px ×38 · 12px ×21 · 4px ×15 · 14px ×9 · 5px ×6 · 16px ×6 · `var(--sp-3)` ×5 · 2px ×5 · 3px ×4 · `var(--sp-4)` ×3 · `var(--sp-2)` ×3 · 18px ×2 · two-value gaps ×18 · others (0, 1, 7, 22, 28 px, `.3em`) ×1–2 each. Off-grid values 5, 6, 10, 14 px make up 93 of them.
**padding (197, 8 use a token):** `0` ×31 · `14px 18px 0` ×6 · `12px` ×6 · `6px 10px`, `12px 14px`, `10px 12px`, `0 4px` ×5 each · `8px 12px`, `4px 11px`, `12px 0` ×4 each, then about 95 further distinct combinations used once or twice (for example `4px 6px 4px 14px`, `6px 13px 6px 9px`, `9px 11px`, `2px 7px 2px 4px`).
**margin:** 130 shorthands (`0` ×28, `10px 0 0` ×6, `0 auto` ×6, `0 0 6px` ×5, `12px 0 4px` ×4, `0 0 12px` ×4 …) and 139 single-side margins (8px ×23, 10px ×17, 6px ×13, 2px ×13, 16px ×11, 4px ×10, 12px ×9, 14px ×7 …). Three use a token.
**min-height:** 44px ×10 · 0 ×4 · 46 ×2 · 40 ×2 · 36 ×2 · 32, 42, 48, 52, 56, 64, 70 ×1.

**Colours outside `var()`:** 108 hex literals (55 distinct) and 68 `rgb()/rgba()` (51 distinct); 83 `color-mix()` calls.
- Neutral: `#fff` ×19 (+`#ffffff` ×2), `#000` ×12 (masks), `#111`, `#10121a`.
- Gold / amber family, 13 shades for the same "legendary / star / rally" idea: `#f2c14e` ×5, `#d9a514` ×3, `#c9a227` ×3, `#f2cf63` ×2, `#fff3c4` ×2, `#d08a2c` ×2, `#e3933a`, `#c99a2e`, `#a87a1c`, `#a07a08`, `#f3d77a`, `#fff0b0`, `#fff4c2`.
- Reds for "boss / live / damage", 7 shades: `#e5453a` ×4, `#e5484d` ×2, `#e5654f`, `#e8574a`, `#e0614a`, `#c33a2a`, `#f28b82` (the theme already has `--danger`).
- Purples for "epic / synced": `#8a6fd1` ×3, `#7a5cc4`, `#b39cf0`.
- Tier colours with hand-written dark twins: `#4f9a5a/#7fca8a`, `#3f8fbf/#76b8e6`, `#c07a2c/#e3a35e`, `#b45f8c/#e08ab8`, `#c9a227/#f2cf63` (`.btier.bt-1…5`, 3303–3306).
- Sky and atmosphere: 34 rgba tints (3239–3253, 2761–2763), each with light and dark values.
- Black alphas for shadows: .04, .06, .14, .18, .22, .25, .3, .35, .45, .5, .55, .8. Scrims: `rgba(5,6,10,.82)` (`.wrapped`), `rgba(10,14,20,.45)` (`.lp-scrim`); the dialog backdrop at line 943 uses a third value `rgba(10,12,12,.32)`.

**Transitions (49 declarations):** durations .15s ×10 · .3s ×9 · .25s ×8 · .2s ×7 · .72s ×3 · .4s ×3 · .24s ×3 · .6s ×2 · .28s ×2 · .22s ×2 · 60s ×2 · single uses of .12, .14, .34, .35, .45, .5, .58, .7, .8, .9, 1.2, 3.5 s. 25 distinct durations.
**Animation durations:** 53 distinct values from .1s to 60s (most used: .45s, .6s, 1.5s, 1.8s, 6s ×5 each).
**Easings (transition + animation):** `var(--ease)` ×43 · `ease-in-out` ×39 · `linear` ×23 · `var(--spring)` ×8 (+2 with `, ease` fallback) · `var(--spring-soft)` ×5 · `ease` ×5 · `ease-out` ×2 · `ease-in` ×1 · `steps()` ×3 · six ad-hoc `cubic-bezier()` (`.5,0,.2,1` ×2, `.55,0,.2,1`, `.3,0,.7,1`, `.3,1.6,.5,1`, `.2,.9,.3,1.25`, `.2,.8,.2,1`, the last being a copy of `--ease`).

**z-index (33 declarations):**

| z | Selector (line) |
|---|---|
| 1000 | `.intro` (3340) |
| 200 | `.splash` (2699) |
| 130 | `.wrapped` (2008) |
| 95 | `.mini-spark` (2177) |
| 85 | `.tip-pop` (2422) |
| 70 | `.net-banner` (2291), `.lp-auth` (3743, ≤899 only) |
| 69 | `.lp-scrim` (3735) |
| 60 | `.ptr` (2298) |
| 41 | `.pv-banner` (2679) |
| 5 | `.set-search` (2312), `.todo.lifting` (3380), `.cm-menu` (3531) |
| 4 | `.wr-close` (2019) |
| 3 | `.wr-bars` (2012), `.wr-slide .wr-share, .wr-slide button` (2041), `.sub-ed-list li.dragging` (2064), `.dmg-float` (2831), `.arena-form` (2851) |
| 2 | `.wr-nav` (2039), `.arena-pomeo` (2835), `.shot` (2841), `.phase-tag` (2846), `.auth-close` (3733) |
| 1 | `.qn-dot` (2956), `#cardView` (3222), `.stamp-land` (3279) |
| 0 | `#atmo` (2756), `#todSky` (3235), `#themeFx` (3324) |
| −1 | `.tabs button::before` (2169), `.arena-sky` (2807), `.arena-floor` (2811) |

For context, part A holds: `.top` 10, `.btmbar` 40, `.nav-scrim` 58, `.sidenav` 59, `.gd-fly` 60, `#fxCanvas` 70, `.toasts` 80, `.float-emoji` 85, `.achcard` 90, `.pomeo-pop` 90, `.coin-fly` 95, `.tour` 120. Native `<dialog>` elements sit in the top layer above all of these.

## Themes, Glossed, Minimal, motion, breakpoints

**`[data-theme]` (33 occurrences) and `prefers-color-scheme` (7 blocks).** Every dark override is written twice: `:root[data-theme="dark"] X` and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) X }`.

| Rule | Explicit dark (line) | Media twin (line) |
|---|---|---|
| `#atmo .a-break` | 2762 | 2763 |
| `.arena` background (`--ad2/--ad1` instead of `--al1/--al2`) | 2805 | 2806 |
| `.nb-art svg` silhouette filter | 2895 | 2896 |
| `.hall-card:not(.won) .hc-art svg` | 2908 | 2909 |
| `#todSky .sky-sunrise/.sky-sunset/.sky-rain/.sky-day/.sky-night` | 3243–3247 | 3248–3254 |
| `#todSky .sky-stars { --star }` | 3256 | 3257 |
| `.btier.bt-1…5` | 3305 | 3306 |
| `.cs-mode.synced, .lv-mode.synced` | 3656 | MISSING |
| `.rc-rally.on` | 3777 | MISSING |

**`[data-glass]` (10 occurrences):** `.sub-ed-list li` transparent (2062); `.card.fx-glow`/`.item.fx-glow` glow + sheen (2148); `.tip-pop` frosted (2430); `.lp-faq details` (2611); `.lp-fx` (2612); `#todSky` opacity .85 (3270); `.lp-cta .btn.lp-guest` stays flat (3691); `.pk-win` (3765); `.lp-auth .auth-card` at ≤899 (3766). The preview widget `.gl-prev[data-l="off|lite|full"]` / `[data-solid]` (2488–2491) fakes the three Glossed levels with its own hard-coded blur values (6px/135%, 12px/175%) instead of the `--glass-*` tokens.

**`[data-minimal]` (22 occurrences):** `:root[data-minimal] { --card-pad }` (2377–2378); `main` padding-top 28 (2379); `.stack/.grid-2/.mason` gap 22 (2380–2381); `.tabs` neutral `--accent-soft`, active colour, no glow (2382–2384); `.card h2` letter-spacing (2385); hides `.coin-hint`, `#ibSeg [data-f="rewards"]` (2386); hides `.ev-banner, .brand-deco, #bagBtn, #questDot` with `!important` (2995); `#todSky` opacity .7 (3271); `#themeFx` hidden (3335); `.pk-boss` hidden (3767); `.rc-rally, .rc-next` hidden (3791). Inverse guard `:root:not([data-minimal]) #appView .brand span:not(.brand-deco)` (2234). Related class switches, not attributes: `.splash.calm` (2749–2750), `.intro.calm` (3364–3365).

**`[data-motion]` (129 occurrences):** `="full"` ×87, `="reduced"` ×13, `="off"` ×9, `:not([data-motion="off"])` ×13, `:not([data-motion="full"])` ×7.
- Global rules that govern everything here (part A, 831–834): Off sets `animation: none !important; transition: none !important` on `*`; Reduced forces `transition-property: opacity, color, background-color, border-color, stroke-dashoffset, fill !important`. So in Reduced no `transform`, `width`, `grid-template-rows`, `box-shadow` or `visibility` transition runs, but keyframe animations still run unless a rule gates them on `full`.
- Reduced-specific replacements: `.wr-in` → `fadeIn` (2043); `.tip-pop.show` → `fadeIn` (2428); `.lp-hero > *`, `.auth-card` → animation-name `fadeIn` (2652); `.boss-art.hit svg` → `bossFlash` (2826); `.dmg-float` → `fadeInOut` (2833); `.rw-item` → `fadeIn` (2932); `#todSky .sky-rain` → `rainFall` at 4s (3268); `.stamp-land.go` → `stampFade`, no ink (3286–3287); `.tbadge.tb-live` none (3473); `.lv-react` → `lvFade` (3580); `.pc-fold .pc-body` opacity only (3676).
- Off-specific rules (redundant with the global switch, kept as documentation): `.catrow` scroll-behavior (2164, this one is needed), `.sp-grow/.sp-vine-in` (2736), `#atmo i` (2758), `#todSky` (3238), `.tbadge.tb-live` (3473), `.pc-fold` (3675), `.lp-auth/.lp-scrim` with `!important` (3764).
- "Not Off": focus halo (2160), `dialog.sheet.closing` (2244), `.energy .bar i` (2448), `.btn .spin` (2575), `.lp-hero` entrance (2646–2651), first-load skeleton pulse (3086), `.lp.auth-open .lp-auth` (3739).
- "Not Full" static fallbacks: `.av-shine` hidden (2372); `.fx-min` shows the calm face (2672–2673); splash eyes open (2732–2733); first rain drop visible (2784); `#themeFx i` parked (3333).
- Keyframe animations with NO motion gate in CSS (they run in Reduced too; Off is caught by the global switch): `.wr-bars i.cur b` `wrBar` (2016), `.mini-spark` (2177), `.ptr.spin svg` (2301), `.setting.hit` (2321), `.splash.hop .sp-svg` `spHop` (2740), `.shot`/`.shot i` (2841–2842), `.in-w`, `.in-line.out`, `.in-cur`, `.intro.pomeo-in .in-pomeo` (3348–3360, the JS adds `.calm` to stop them), `.lv-react` (3579, Reduced replaced). Most rely on JS not adding the class.

**`prefers-reduced-motion`:** one use, `@media (prefers-reduced-motion: reduce) { :is(.pk-arc, .pk-bars i, .pk-hp i) { animation: none !important } }` (3729). Everything else follows the in-app Animations setting (comment at line 1209).

**`@media` breakpoints used here (56 blocks, 25 distinct queries):**
- `(max-width: 640px)` ×15: `--card-pad` 2194, `.tabs button` 2175/2209, header 2231, `dialog.sheet` 2247, `.cmd` 2283, `.net-banner` 2297, `.set-search` 2317, `.news-card` 2347, `:root[data-minimal]` 2378, `.tip-pop` 2429, `.pv-banner` 2686, `.arena/.hall` 2917, clans 3620, `.lp-auth` phone sheet 3755.
- `(max-width: 480px)` ×4: 2235 (header chips), 2952 (`.ql-hero`), 3460 (`.sess-tile`), 3792 (`.rc-row`).
- `(max-width: 899px)` ×3 (3679, 3742, 3766) and `(min-width: 900px)` ×2 (2531, 3736): welcome page two-column switch.
- `(min-width: 860px)` ×2: 2381 (minimal `.mason`), 3404 (`.clan-grid`).
- `(max-width: 800px)` ×2: 2941 (`.ql-grid`), 3076 (`.bag-grid`).
- `(max-width: 520px)` ×2: 2969 (`.qn`), 3677 (`.pc-toggle`). `(max-width: 400px)` ×2: 2210, 3089.
- Once each: `(min-width: 480px)` 2011; `(max-width: 1380px)` 2174; `(min-width: 641px) and (max-width: 1380px)` 2318; `(min-width: 641px) and (max-width: 1000px)` 2237; `(min-width: 641px) and (max-width: 760px)` 2238; `(min-width: 641px) and (max-width: 899px)` 3750; `(max-width: 760px)` 3207; `(max-width: 560px)` 3445; `(max-width: 440px)` 2234; `(max-width: 420px)` 2456; `(max-width: 380px)` 2232; `(max-width: 360px)` 2474.
- Input capability: `(pointer: coarse)` ×2 (2500, 2799); `(hover: hover) and (pointer: fine)` 2095; `(hover: none)` 3399.
- `@container (max-width: 520px)` 3148 and `(max-width: 340px)` 3154 on `.pcard`.
Width thresholds in use: 340c, 360, 380, 400, 420, 440, 480, 520, 560, 640/641, 760, 800, 860, 899/900, 1000, 1380.

## Animations

84 `@keyframes` blocks (80 distinct names: `spin` is defined twice identically at 2302 and 2576; `sheetIn`/`sheetOut` are defined at 2245–2246 and redefined inside `@media (max-width: 640px)` at 2249–2250).

| Keyframes (line) | Used by (selector · line) | Properties |
|---|---|---|
| `wrBar` 2018 | `.wr-bars i.cur b` 2016 | transform |
| `wrIn` 2044 | `.wr-slide .wr-in` 2042 | opacity, transform |
| `wrGrow` 2046 | `.wr-bars2 .r i`, `.wr-hours i` 2045; `.ins-chart i` 2466 | transform |
| `subPop` 2105, `subCheer` 2110 | `.sub-check li.fresh .sub-box` 2104, `.sub-check.cheer` 2109 | transform |
| `tabBreath` 2173 | `.tabs button.active::before` 2172 | opacity, transform (infinite) |
| `miniSpark` 2178 | `.mini-spark` 2177 | transform, opacity |
| `sheetIn`, `sheetOut` 2245–2250 | `dialog.sheet[open]` 2243, `dialog.sheet.closing` 2244 | transform, opacity |
| `spin` 2302, 2576 | `.ptr.spin svg` 2301, `.btn .spin` 2575, `.fx-ring .arc` 2654 (and part A) | transform |
| `fromR`, `fromL` 2306–2307 | `.tab.active.from-r/.from-l` 2304–2305 | opacity, transform |
| `hit` 2322 | `.setting.hit` 2321 | **background** (paint) |
| `avBlink`, `avShine`, `avTwinkle` 2369–2371; `avBob` 3322 | `.av-anim .av-*` 2366–2368, 3321 | transform, opacity (infinite) |
| `shrinkBar` 2449 | `.energy .bar i` 2448 | transform |
| `lpBob`, `lpWave`, `lpIn` 2644–2653 | `.lp-pomeo .mascot` 2642, `.fx-pomeo .mascot` 2667, `.lp-wave` 2643, `.lp-hero > *`/`.auth-card` 2646, `.lp.auth-open .lp-auth` 3739 | transform, opacity |
| `fxTick`, `fxGrow`, `fxSprout`, `fxHit`, `fxHp`, `fxBub`, `fxFade` 2658–2674 | `.fx-list i::after`, `.fx-bars i`, `.fx-garden svg`, `.fx-boss .bsv`, `.fx-hp i`, `.fx-bub`, `.fx-min .busy/.calm` | transform, opacity (all infinite) |
| `spWake`, `spYawn`, `spSmile`, `spShut`, `spOpen`, `spBob`, `spSway`, `spHop` 2726–2744 | splash parts 2721–2740 | transform, opacity |
| `atmoDrift` 2767 | `#atmo .a-focus/.a-deep/.a-break` 2764–2766 | transform on three full-viewport gradient layers (38–60 s, infinite) |
| `psDrop`, `psWave`, `psPage` 2783–2789; `mothFly` 3075 | `.pscene .ps-*` | transform, opacity |
| `bossIdle` 2823, `bossTremble` 2824, `bossHit` 2827, `bossFlash` 2828, `bossDown` 2830 | `.boss-art.idle/.almost/.hit/.defeating svg` 2820–2829 | transform, **filter** |
| `dmgUp` 2834 | `.dmg-float` 2832 | opacity, transform |
| `pomeoAtk`, `pomeoCheer` 2838–2840; `shotX`, `shotY` 2844–2845 | `.arena-pomeo.atk/.cheer`, `.shot`, `.shot i` | transform, opacity |
| `rwPop` 2933 | `.reward-dlg[open] .rw-item` 2931 | opacity, transform |
| `decoBob` 2987, `lanternFlicker` 3001 | `.brand-deco` 2986, `.m-carve` 3000 | transform, opacity |
| `ncShift` 3014, `ncShimmer` 3319 | `.ncg.ncs` 3013, `.ncg.ncsh` 3318 | **background-position** on clipped text (paint, infinite) |
| `candleGlow` 3019, `stormFlash` 3024 | `.ring.rs-candle .prog` 3018, `.ring.rs-storm .prog` 3023 | **filter: drop-shadow** on the timer ring (paint, infinite) |
| `skPulse` 3087 | `body.first-load` placeholders 3086 | opacity |
| `pcFoil` 3172 | `.pcard.cs-champion .pc-banner::after` 3171 | **background-position** (paint) |
| `twinkle` 3260 | `#todSky .sky-stars i` 3259, and three part A users (see Traps) | opacity |
| `rainFall` 3269 | `#todSky .sky-rain` 3267 (1.1s), 3268 (4s in Reduced) | **background-position** on a full-viewport layer (repaints every frame) |
| `stampPress`, `stampInk`, `stampFade` 3284–3288; `stampIn` 3592 | `.stamp-land.go .stamp-svg/.ink` 3282–3287; `.lv-stamp.anim svg` 3591 | opacity, transform |
| `auraFlare` 3315 | `.aura.aura-flare` 3314 | **filter** |
| `tfxDrift`, `tfxEmber` 3330–3334 | `#themeFx.tfx-4/.tfx-5::before` 3329, `#themeFx i` 3332 | transform, opacity |
| `inWord`, `inOut` 3349–3351; `inBlink` 3356; `inPop` 3362 | `.in-w`, `.in-line.out`, `.in-cur`, `.in-pomeo` | opacity, transform, **filter: blur** |
| `clanAur` 3416 | `.clan-banner.anim` 3415 | **background-position** |
| `tbPulse` 3472 | `.tbadge.tb-live` 3471 | **box-shadow** (paint, infinite) |
| `raidBob` 3560 | `.raid-art:not(.beaten) svg` 3559 | transform |
| `lvFloat`, `lvFade` 3581–3582 | `.lv-react` 3579–3580 | transform, opacity |
| `pkArc` 3726 | `.pk-arc` 3722 | **stroke-dashoffset** (paint) |
| `pkBar` 3727 | `.pk-bars i` 3723 | transform |
| `pkHp` 3728 | `.pk-hp i` 3725 | **width (layout)** |

Keyframes used here but defined in part A: `fadeIn` (835), `dotPop` (706), `popUp` (1289), `readyPulse` (1496, box-shadow), `fadeInOut` (1247), `auraSpin` (1522), `auraPulse` (1521), `pulse` (187).

Layout-affecting motion in this slice: `pkHp` animates `width`; `.pc-fold .pc-body` transitions `grid-template-rows` (3672); `.hs-dots i` transitions `width` (3479); `.tut-dots i.on` changes width without a transition (2416). Paint-only but costly: `rainFall`, `ncShift/ncShimmer`, `pcFoil`, `clanAur` (background-position); `candleGlow`, `stormFlash`, `auraFlare`, `bossHit` (filter); `tbPulse` and `readyPulse` (box-shadow); `hit` (background). `will-change: transform` is set only on `.fx-tilt` items (2155) and `.sp-pomeo` (2703).

## Traps

**Duplicate keyframe names: the later definition wins for the whole document.**
- `@keyframes twinkle` at 3260 (opacity only) overrides the one at 1242 (opacity + `scale(.6)`). The three part A users (`.mascot[data-state="excited"] .spark` 1233, `.gd-plant .spk path` 1673, `.rm-twinkle` 1866) therefore run the sky version and never scale.
- `bossIdle`, `bossHit`, `bossDown`, `dmgUp` at 2823–2834 override the versions at 1450–1457; the rules at 1448–1456 are dead duplicates of 2820–2832.
- Renaming or merging keyframes changes behaviour elsewhere. Test suites assert these names through `getComputedStyle(...).animationName`: `twinkle` (v113c, also `'none'` in Reduced), `rainFall` with `animationDuration === '4s'` in Reduced (v113c), `stampPress` (v113a), plus `auraSpin`, `bossIdle`, `bossTremble`, `candleGlow`, `ncShift`, `decoBob`, `lanternFlicker` appear in suites. v110 reads `--sp` from `#splash`.

**Touch-target rule beats later exceptions.** `button:not(.plant):not(.rem-check)` (2501) has specificity (0,2,1). On coarse pointers it overrides every lower-specificity `min-height` written for a button: `.lp-swatches button { min-height: 0 }` (2549, so the 30 px swatch is probably 30×44 on phones: verify in a screenshot), `.auth-close { min-height: 0 }` (3733), `.pc-toggle { min-height: 36px }` (3666), `.lo-apply { min-height: 40px }` (3051), `.ev-banner .nc-x { min-height: 32px }` (2994), `.lp-login { min-height: 40px }` (3683). The rule only knows `button`, `select`, `a.btn`, `.chip`, `summary`, `[role="button"]` and inputs: custom controls built from `div[role="option|combobox|switch|slider|menuitem"]` get no 44 px guarantee until they are added. The layout audit suites (`audit*.mjs`) fail on touch targets under 44 px.

**Focus rings.**
- 2159 uses `:where()` (zero specificity): any `outline` declared on a component wins, and `outline: none` appears at `dialog.tut:focus` (2391), `.cmd-in input` (2272–2273), `.set-search input:focus` (2315).
- 2160 adds a box-shadow halo at specificity (0,3,0) for `button`, `a[href]`, `[role="button"]`, `summary`. While such an element has keyboard focus the halo REPLACES its own `box-shadow`, including the selection rings of `.tut-opt.on` (2408), `.cd-opt.sel` (3186), `.cd-bn.sel` (3196), `.lp-swatches button.on` (2551) and the primary button's shadow.
- 2161 (inputs and selects) is dead, see Form controls.
- Focus indicators written separately: `.sub-ed-list .grip` (2067), `input:focus-visible + .sub-box` (2103), `.bag-item` (3061), `.hs-seats` (3496), `.fold-hd` (3540), each a local copy of `outline: 2px solid var(--accent)`, plus `.pc-toggle` (3669) with `--pc-acc`.
- `.bag-item` is a `div[tabindex="0"]` with an `aria-label` but no role (template near line 18097), so neither the global ring nor the 44 px rule matches it by type.

**A second stylesheet is generated at runtime.** The `rewardCSS()` IIFE (about line 16854) appends `<style id="rewardCSS">` to `<head>`, after the main sheet, so it wins equal-specificity ties. It emits `.aura-x-<id>` and `.aura-x-<id>::before` (hard-coded glow box-shadows, and an `outline` used as a decorative ring: 1.5px solid, or 4.5px double for squad auras, which v1141b asserts), `.nc-<id>` name gradients with both dark forms, and `.ring.rs-<id>` variables. The aura, name-colour and event-ring rules in this slice (3003–3027, 3311–3319) only add motion on top of it. A token or focus-ring change that touches `outline` or shadows on `.aura` must be made in that generator too.

**Dark mode has two code paths.** With the default theme on "auto" there is no `data-theme` attribute. `.cs-mode.synced, .lv-mode.synced` (3656) and `.rc-rally.on` (3777) only have the `[data-theme="dark"]` form, so they keep their light colours (`#7a5cc4`, `#a07a08`) on a system-dark device.

**`!important` (11 uses):** `#coinPill { display: none !important }` at 641–760 (2238); `.empty.has-scene::before` (2777); minimal hides `:is(.ev-banner, .brand-deco, #bagBtn, #questDot)` (2995); `.mascot[data-skin="lantern"]` face parts (2998); `.ncg { color: transparent !important }` (3012, gradient names; a redesign that sets name colours must not out-rank it); `body.first-load` placeholders `color: transparent !important` (3082); `.intro.calm` `animation: none !important` (3364); `.clan-banner.anim { background-size: 200% 200% !important }` (3415, fights an inline style); clan bars `width: 100% !important` (3427: JS still writes an inline `width`, CSS converts it to a transform-based bar); `prefers-reduced-motion` peek (3729); `.lp-auth/.lp-scrim` Off (3764).

**Rules re-declared later in the same slice (source order decides):**
- `.card` 193 → 2195; `.setting` 388 → 2202; `.desc` 390 → 2199–2200; `.iconbtn svg` 233 → 2197 (and `.hdr-right .iconbtn svg` 2228, `#bagBtn svg` 3077).
- Appended fix-ups 3628–3664: `.lv-r` 3584 (42 px) → 3635 (44 px); `.cm-more summary` 3528 (30 px) → 3636 (44 px); `.cm-menu` top 32 → 3637 (44); `.lv-sum .ib-x` 3589 → 3638; `.lv-pomeo` 3570 (absolute) → 3643 (static); `.clan-title` 3421 → 3644; `.clan-lv` 3423 → 3645; `#csGrid` 3605 → 3650; `.clan-title h2` 3422 → 3628; `.clan-none h2` 3408 → 3642.
- Welcome page v1.14.3 (3678–3693) re-declares `.lp-greet` 2533 → 3686, `.lp-cta` 2543 → 3687, `.lp-cta-note` 2546 → 3693, `.lp-look` 2547 → 3680, `.lp-hero` 2532 → 3684, `.auth-card` 2557 → 3732.
- Inside one block: `.in-line` `white-space: nowrap` (3346) is immediately replaced by `pre` (3347); `.qs-row` is declared at 2451 and again at 2455; `.qn-bar` height 8 (2950) → 6 (2962); `.aura.aura-spin::before` is written twice (3004–3005), the second only to out-rank an `.aura-rainbow` rule in part A.
- Moving a section, or merging part A and part B rules, silently flips these.

**Reduced motion inconsistency.** `:root:not([data-motion="off"]) dialog.sheet.closing` (2244, specificity (0,4,1)) out-ranks `:root[data-motion="reduced"] dialog.closing { fadeOut }` (951), so the inbox sheet slides out with a transform in Reduced, while it fades in.

**Progress that depends on animation.** With Animations Off, `.wr-bars i.cur b` never fills (the global switch removes `wrBar`), `.btn .spin` and `.ptr.spin` do not rotate, `.energy .bar` stays full. Any new "progress by keyframes" control needs a static fallback.

**Class and id contracts.**
- State classes toggled by JS: `closing` (dialogs and the sheet; `toastHost`, `liveClose` and others), `fx-glow`/`fx-tilt` (`fxFrame`, `fxReset`), `fade-l`/`fade-r` (`updateFades`), `from-r`/`from-l`, `has-undo` (`toastUndo`), `out`/`hop`/`fly`/`fade-all`/`calm` + `body.sp-handoff` (`hideSplash`), `ripen` (`paintRipe`), `has-scene` (`sceneEmpty`), `idle`/`angry`/`almost`/`hit`/`defeating`/`defeated`, `phase-${st.phase}`, `no-squad` (`renderBossView`, `bossHit`), `has-stamp`/`go` (`landStamp`), `tfx`/`tfx-4`/`tfx-5` (`themeFx`), `intro-on`/`pomeo-in`/`leaving`/`fade` (`playIntro`, `endIntro`), `lifting` (`onTodoClick`), `pc-closed` (`setCardOpen`, `cardHTML`), `auth-open` and `:root.lp-modal` (`lpOpenAuth`, `lpCloseAuth`), `body.previewing` (`startPreview`), `body.first-load` (`afterFirstLoad`, `startSession`), `rallied`, `folded`, `synced`, `st-focus`/`st-away`/`st-paused`/`st-idle`, `pri-high`/`pri-med`/`pri-low`, `bt-1…5`, `cs-<style>`, `r-<rarity>`, `rs-<ring style>`.
- Ids styled directly here: `#atmo`, `#todSky`, `#themeFx`, `#cardView`, `#bagSearch`, `#bagCats`, `#bagBtn`, `#bagDot`, `#questDot`, `#coinPill`, `#lvChip`, `#curStreak`, `#bestStreak`, `#todayText`, `#todayPct`, `#todayExtra`, `#todayBar`, `#chips`, `#examCard`, `#cmdBtn`, `#avatarBtn`, `#ibSeg`, `#tutNext`, `#csGrid`, `#csTabs`, `#csdDays`, `#lpPomeo`, `#authView`, `#appView`, `#mascot`.
- Selectors from this slice that test suites query (number of suite files): `#authView` 144, `.toast-item` 18, `#lvChip` 17, `#mascot` 8, `.bag-item` 12, `#todayText` 7, `#bagCats` 7, `.rw-n` 6, `#todayExtra` 6, `.lv-seat` 5, `#themeFx` 5, `#coinPill` 5, `#avatarBtn` 5, `.squad-list`/`.lv-card`/`.clan-feed` 4, `.stamp-land`/`.sess-tile`/`.pc-name`/`.news-card`/`.ib-item`/`.hdr-right`/`.hall-card`/`.cs-list`/`.clan-raid`/`.clan-lv` 3, and about 130 more used once or twice (all `.pc-*`, `.lv-*`, `.lp-*`, `.fold-*`, `.sky-*`, `.wr-slide`, `.wr-nav`, `.wr-close`, `.pv-banner`, `.pv-go`, `.pv-exit`, `.gl-seg`, `.gl-prev`, `.cm-more`, `.cm-menu`, `.hs-step`, `.in-stage`, `.in-cur`, `.mini-spark`, `.dmg-float`, `.fx-glow`). The suites live outside the repository (session scratchpad `fb/*.mjs`); keep class names and ids when restyling.

**Probably dead (no literal use found in the markup or script of v1.20; confirm before deleting):** `.tut-switch` (2401, 2417; still named in old audit suites), `.mini-av` (2359, 2871), `.avatar-pic` (2365), `.bed .bl` and `.garden-legend` (2206), `.grid-2` (2196, 2380), `--sky-a` (3235), `--sp-6`, the input focus rule at 2161, the boss rules at 1448–1457.

**Stacking.**
- Three fixed decorative layers sit at z 0 (`#atmo`, `#todSky`, `#themeFx`); content stays above them only because the page wrappers are positioned with `z-index: 1` (`#appView` at line 680, `#cardView` at 3222). Keep that when changing page wrappers; it also means every z-index inside `#appView` is local to that stacking context.
- `.cm-menu` (z 5) and `.todo.lifting` (z 5) share a level with the sticky `.set-search` (z 5); a popover/menu component must not inherit this.
- `.lp-auth` (70) equals `.net-banner` (70) and `#fxCanvas` (70); `.tip-pop` (85) equals `.float-emoji` (85); `.mini-spark` (95) equals `.coin-fly` (95). `.toasts` (80) is below `.tip-pop`, `.achcard`, `.pomeo-pop` (85–90) and far below `.wrapped` (130): a toast fired while Wrapped is open is hidden unless `toastHost()` moves it.
- `.arena` uses `isolation: isolate` so its z −1 layers stay inside; `.tabs button::before` uses z −1 and depends on the button creating a stacking context.

**Other.**
- `.wrapped`, `.wr-*`, `.cd-bn`, `.mastered-badge.on`, `.phase-tag`, `.hdr-count`, `.bag-item .pv .tag.new` hard-code white text: contrast is independent of the theme, which also means themes with a light `--danger` or `--accent` are not checked.
- `.sp-card .sp-row input[type="checkbox"]`, `.cd-tg input` and friends assume the global switch size (42×24); a new toggle component with other dimensions shifts these rows.
- `.pc-host > .pcard` and every `.pc-*` colour come from `--pc-*`, not the theme: the player card deliberately ignores theme tokens, including for the share image.
- `html, body { overscroll-behavior-y: contain }` (2303) is set in the middle of the pull-to-refresh block.
- `.set-search` sticky offsets are hand-tuned to the header height at three breakpoints (2312, 2317, 2318) and again for preview mode (2687); a new header height breaks all four.
- Header visibility rules are spread over five queries (2231–2238) and an id rule with `!important`; they encode what fits next to the brand at each width.

## v2.0 touch points

**Tokens (1b).**
- Treat the v1.7 block (2186–2193) as the seed. Its names are used almost only in lines 2195–2353, so they can be kept as aliases of the new scale or renamed with a small, checkable diff. Merge `--radius` into the radius scale (same 16 px). Remove `--sp-6` or start using it.
- Radius: 17 pixel values collapse naturally to about 4 / 8 / 12 / 16 / 22 + pill + circle (12 and 14 are used interchangeably for inner tiles; 6, 7, 8, 9, 10 for small controls).
- Type: 11 sizes between 10 and 15 px. A scale of 11 / 12 / 13 / 14 / 16 / 18 / 22 plus display sizes covers 95% of declarations; expect 1 px text shifts in dense rows (`.pc-*`, `.rc-*`, `.cm-*`), which the "text clipped without ellipsis" audit will catch.
- Shadows: 8 hand-written elevations map onto three levels (resting `--sh-1`, raised, floating `--sh-2`); ring shadows should become a `--ring` token shared with focus. Give shadows a dark variant like `--lift` has.
- Motion: add duration tokens beside `--ease/--spring/--spring-soft` (821–823). `.15/.2/.25/.3s` cover 34 of 49 transitions and map to 120/200/320 ms; replace the six ad-hoc beziers. Do not tokenise the long ambient loops (38–60 s) or `60s` sky fades.
- Colour roles: themes only provide nine variables through `applyTheme()`. New roles (surface levels, text levels, success, warning, focus ring, scrim, rarity, tier, live) must be derived in CSS (`color-mix` from the nine) so all 21 themes work without editing `SKINS`, or `SKIN_VARS` must be extended together with its remove loop. Collapse the 13 golds, 7 reds and 3 purples into role tokens; give each a dark value once at `:root` level in the two dark blocks (lines 30–38) instead of per-component twins. That removes the nine duplicated pairs in the table above and fixes the two missing ones.
- Keep clear of runtime property names (`--sp`, `--i`, `--w`, `--h`, `--s`, `--d`, `--x`, `--sx`, `--rc`, `--tc`, `--pc-*`, `--ba`, `--ea`, `--ra`, `--clan-acc`).

**Controls (1c, Phase 2).**
- Checkbox/switch: the switch is a restyled native input (882). `.sub-box` and `.hs-seats` show the two existing "native input kept, visual sibling" patterns; following them keeps `.checked`, `value`, labels and the tests working. Update the rows that assume 42×24.
- Select: only three selects are touched in this slice (`.hs-preset select`, `.set-row select`, `.crem-before`), each just a max-width. When they become comboboxes, carry those width limits over and delete the rules.
- Inputs: fold `#bagSearch`, `.lo-form input`, `.cmd-in input`, `.set-search input` and `textarea` into one input component (the first two re-implement the base look; textarea has none). Restore a visible focus state for `.cmd-in`.
- Extend the touch block (2500–2522) and the focus block (2159–2161) to the new roles in the same edit as the components; make the focus halo an `outline` or a dedicated ring token so it stops replacing selection rings.
- Disclosure: four `summary` styles (`.subdet`, `.lp-faq`, `.cm-more`, `.rc-more`) and the `.fold-hd` button can share one chevron pattern.

**Dialog, sheet, menu, toast, tooltip.**
- `dialog.sheet` (+ `.sheet-head/.sheet-filters/.sheet-body`, `sheetIn/sheetOut`, `.closing`) is the natural base for the bottom-sheet component: it already switches side-drawer/bottom-sheet at 640 px and honours the motion setting. Missing: drag handle, drag-to-dismiss, safe-area on the head, Reduced exit.
- Convert the hand-rolled `.lp-auth` + `.lp-scrim` modal and the `<details>`-based `.cm-menu` to the dialog/menu components; `.tip-pop` and `.net-banner` to the toast/popover layer. Define one z-index scale (base, sticky, nav, overlay, toast, celebration, boot) and re-map the 33 declarations.
- Unify dialog widths (380–980 px, two gutter conventions) into size tokens.

**Repeated patterns worth one component each:** progress bar (13 implementations, heights 3–22 px, five fill techniques; prefer the `scaleX` one), pill/badge (about 18), option card (`.tut-opt`, `.energy .opts button`, `.cd-opt`, `.hs-opt`, `.mode-seg button`, `.sp-card`), segmented (`.gl-seg`, `.mode-seg`, `.hs-seats` next to the real `.seg`), close button (6), tinted note panel (7), accent-wash card background (5), list row with top divider (13), empty state (7 one-offs beside `.empty`).

**Performance / motion pass (Phase 4).** Replace `pkHp` (width) with `scaleX`; change `.hs-dots i` and `.tut-dots i.on` width changes to transforms; keep or replace the `grid-template-rows` fold with care (it is the only layout transition and already has Reduced/Off variants). Review full-viewport paint loops: `rainFall` (background-position every frame), three `atmoDrift` layers plus `#todSky` and `#themeFx` stacked at z 0, and infinite `drop-shadow` filters on the timer ring (`candleGlow`, `stormFlash`). Check that every ungated keyframe animation listed above is really class-gated in JS.

**Safest way to change this slice.**
1. Add the new token block next to 2186 without removing anything, with old names as aliases; screenshot diff should be empty.
2. Convert one banner section at a time (they map to screens: Wrapped, subtasks, sheet/palette, settings, tutorial, welcome, boss/quest/bag, player card, to-do, clans, sessions), folding the appended fix-ups (3628–3664, 3678–3693) into their primary rules in the same step, then re-run the suites that query that section's classes.
3. Keep every class name, id and keyframe name listed under Traps; restyle through tokens and shared component classes added alongside, not by renaming.
4. Fix the duplicate keyframes deliberately (rename the sky one, for example `skyTwinkle`, and update v113c) rather than letting a reorder decide which version wins.
5. After each step run the layout audit at coarse pointer (44 px rule) and in Reduced and Off motion, because those three global mechanisms (2501, 831, 832) override local intent.
