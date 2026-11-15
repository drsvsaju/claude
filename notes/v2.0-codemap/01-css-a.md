# CSS part A (tokens → cosmetics drop) — index.html lines 9–1999

Mapped at commit 77f8456 (v1.20). Line numbers drift: search by the selector / keyframe / token NAME given beside each number.
Slice size: 1,991 lines, 171 KB, 828 distinct class names, 17 ids, 96 `@keyframes` names (98 definitions), 49 `@media` blocks, 3 `@supports` blocks.
Line 2000 opens the WRAPPED section (next slice). Test suites are not in the repo: 242 `.mjs` suites live in the session scratchpad
`/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/fb/`.

## Sections (in file order)

| # | Banner | Lines | What it styles |
|---|---|---|---|
| 1 | THEME TOKENS | 10–40 | The 10 colour roles + `--radius` on `:root` (15–28), explicit dark `:root[data-theme="dark"]` (29–33), system dark `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` (34–40). Nothing else. |
| 2 | BASE | 42–242 | Reset, `body` font (47–51), `h2` card heading (53), utilities `.muted .row .between .hidden` (54–57). Header `.top .brand .hdr-right .coinpill` (59–79). Navigation v1.14.3 (80–179): `.sidenav`, `[data-tab]` items, `.nv-*`, `.nav-scrim`, `.btmbar`, `#navBurger`, `.nav-cur`, its four breakpoints, glass + minimal variants. `.sync` dot (181–187). Page frame `main .tab .card .stack .grid-2` (189–196), balanced columns `.mason .mason-2 .mason-one` (197–213). Buttons `.btn .linkbtn .iconbtn` (215–233). Form fields (235–242). |
| 3 | LOGIN / SIGN-UP SCREEN | 244–267 | `.boot`, `.auth`, `.auth-card`, `.auth-brand`, `.hint`, password reveal `.pw`, `.auth-error`, `.auth-foot`, `.auth-warn`. |
| 4 | TIMER | 269–340 | `.timer-card`, `.phase-label`, `.dots`, `.ring` + `.track/.prog`, `.ring-center`, `.time`, `.ring-sub`, `.controls` (272–290). Session row `.name-row .sub-row .preset-row` (292–298). `.chips/.chip` (300–313). Strays that are not timer: achievements tools `.ach-tools .ach-sort .ach-cat .ach-gift` (315–319), `.mile-list` (320–324), session-hub bits `#sessForm`, `.sess-tools` (325–329), `.dot`, `.empty` (331–332). Streak `.streak-nums .big .lbl .progress` (334–340). |
| 5 | STATS | 342–383 | `.seg` base (345–347), `.stats-head`, `.range-nav`, `.tiles/.tile`, SVG `.chart` parts, `.scroll-x`, `.tip`, `.legend`, `.toplist`, `.sesslist`. |
| 6 | SETTINGS | 385–407 | `.setting` row, `.desc`, `.btn-row`, `.acct-name` (388–393). **`dialog` base (395–399)**. Preset editor `.preset-list`, `.pform` (400–407). |
| 7 | PROGRESSION + SHOP | 409–698 | A catch-all. `.lvchip`, `.coin(s)` (412–423); profile `.prog-hero .xpbar .tiles4 .tiergrid/.tier .achlist/.ach` (425–450); shop `.shop-head .catrow .shopgrid .item .btn.buy .thprev` + **`input[type="range"]` first rule (482)** (452–482); ring cosmetics `.ring.rs-*` (484–500, 668–672); streak milestones `.streak-next .sn-bar .sm-*` (501–515); ranks `.rk-b .rkchip .pc-rank .rk-card .rank-line .rk-hint .rkl-*` (516–563, 574–580); overtime `#ring.ot .ot-line .ot-dlg .ot-tag` (564–573); landing mini cards `.fx-*` (581–588); quest board `.wq-*` (589–598); Posts `.posts-hero .post-day .post .po-react .post-types` (599–624); Study Pass `.pass-hero .pass-bar .pass-row .pt .ql-pass` (625–651); old monthly track `.tr-*` (652–659); `.evo-*`, collection log `.coll-*` (660–667); `.ripple`, `#fxCanvas`, `#starCanvas`, `#appView` (673–680); Zen (682–686); level-up dialog `.lvdlg .lv-*` + keyframes (688–698). |
| 8 | FRIENDS + LEADERBOARDS | 700–813 | `.tbadge` (703–706), `.prof-acct`, `.btn.icon-l`, `.cta-card`, `.earn-card`; **first-time tour `.tour .tour-spot .tour-tip` (715–730)**; `.seg .cnt`, `.empty-card`, `.addrow`, `.pill`, `.plist`, `.person`, `.sub`, `.live`, `.avatar` (731–754); leaderboard `.lb*`, podium `.lb-pod`, `.lb-you`, `.lb-delta` (755–796); `.recap`, challenge `.chal` (797–803); friend profile `.fp-*`, `.kudo` (804–813). |
| 9 | MOTION | 815–1209 | Motion tokens (820–828); global Off/Reduced switches (830–837); button press/lift/ripple (839–850); `#mainBtn` play/pause morph (852–860); **`.seg` scrolling + `.seg-ind` pill (862–879)**; **switch + slider (881–901)**; page/list/chart entrances (903–918); medals (920–926); **`.skel` (928–940)**; **dialog open/close + `::backdrop` (942–951)**; `.shake .ok-check .floater .float-emoji` (953–973); **`.toasts/.toast-item` (975–987)**; `.achcard` (989–1004). Garden v1.17 block misplaced here (1006–1084): `.gd-xp`, `.gd-scene[data-bg]`, `.chip-btn`, `.gd-life/.gd-firefly/.gd-leaf`, `.gd-tasklist`, `.gt-hi`, `.gd-tour`, `dialog.gt-dlg`, `.pm-*` pet filters, `.gd-fly`, `.garden-peek/.gp-*`. Timer motion `.timer-card::before`, `.ring-glow`, `.ring-burst`, digit roll `.time .dg/.dc` (1085–1115); focus dim (1117–1120); old `.mascot` states (1122–1139); `.greet`; bar fill mechanism (1145–1150); level-up FX (1152–1166); `.flame`, `.sn.roll` (1168–1178); `.gring` (1180–1185); shop `.item` hover, `.coin-fly` (1187–1195); `.theme-fade` (1197–1200); header breakpoints (1202–1208). |
| 10 | POMEO | 1211–1310 | `.pomeo-host/.pomeo-btn`, mascot reaction classes `r-*`, `.p-heart` (1214–1247); `.pomeo-bubble` (1249–1261); focus-time hiding + `.pomeo-pop.compact` (1263–1271); `.pomeo-pop` (1272–1290); `.pomeo-card` (1292–1298); `.note-row`, `.tip-card`, `.today-extra` (1300–1310). |
| 11 | REMINDERS | 1312–1359 | `.rem-head`, `.rem-sec`, swipe row `.rem/.rem-fg/.rem-bg`, `.rem-check`, `.rem-acts`, `.rem-note`, `.perm-card`, `.rem-empty`, **`.daychips` (1348–1353)**, **`.rform` (1354–1356)**, `.cal-btns`. To-do styles are in the next slice. |
| 12 | GLOSSED INTERFACE | 1361–1427 | `#glassBg` blobs; everything else inside `@supports (color: color-mix(...))` (1371–1427): glass tokens, the surface list, buttons, inputs, `.top::before`, solid fallbacks. |
| 13 | QUESTS — weekly boss battle | 1429–1503 | `.boss-*`, `.hpbar`, `.dmg-float`, `.victory`, `.squad-list/.squad-pick`, `.past-bosses` (1432–1472); `.shelf/.trophy`, `.aura-tiers`, daily track `.track7` (1474–1496); `.login-dlg`, `.lvchip .tbadge` (1497–1503). |
| 14 | AURA | 1505–1531 | `.aura` + six `aura-*` glows, `.look-pic`, `.nm-row`, `.fp-name-row`. |
| 15 | EXAM COUNTDOWN · PARKING LOT · AFTER-SESSION ROW · REVISION | 1533–1581 | `.exam-card/.exam-list/.exam-form`, `.park-btn/.park-pop/.park-panel`, second `.plist` definition, `.after-row/.after-acts`, `.rev-list/.rev-acts`. |
| 16 | GARDEN (v1.15) | 1583–1847 | Legacy `.plant` (1588–1593); head/level; scene `.gd-scene` with art tokens, sky, weather (1604–1638); `.gd-ground` grid + decor (1639–1657); `.gd-plot` (1658–1679); path, Pomeo, visitors (1680–1704); shop cards `.gd-item`, decor previews `.dcpv` (1705–1718); `.gd-mut` chips; `.gd-dlg`, `.gd-seedlist/.gd-seed`; phone layout (1744–1753); pets + `.egg-dlg` (1755–1794); looks; weather mutations `.wm-*` (1801–1816); harvest log `.gd-loglist` (1818–1836); seed shop (1838–1847). |
| 17 | POMEO'S ROOM (v1.15) | 1849–1896 | `.rm-head`, `.rm-scene/.rm-svg`, 9 room animations, `.rm-say`, sets `.rm-set/.rm-setform`, `.rm-slots/.rm-slot`, `.rm-share-dlg`. |
| 18 | FLASHCARDS (v1.15) | 1898–1942 | `.deck-list`, deck forms `.dk-new/.dk-rename/.dk-edit/.dk-add/.dk-bulk` (incl. the only `textarea` rule here, 1917), `.deck-dlg/.fc-dlg`, 3D flip card `.cd-card/.cd-face`, grade buttons `.cd-grades/.cd-g`. |
| 19 | WEEKLY SUBJECT PLAN (v1.15) | 1944–1973 | `.plan-list/.plan-row`, `.plan-bar`, `.plan-st` status pill, `.plan-dlg`, `.pl-row`. |
| 20 | COSMETICS DROP (v1.15) | 1975–1998 | `#ringTrail` + `.tp.tp-*` particles, `#themeFx.tfx-aurora`, extra garden decor (`dc_fence_stone`, `dc_path_wood`). |

## Tokens

### Global, defined in this slice

| Token | Kind | Light `:root` (15–28) | Dark (29–33 and 34–40) | Uses here / rest of CSS |
|---|---|---|---|---|
| `--bg` | colour role: page, also input fill and inner wells | `#f6f6f3` | `#121414` | 18 / 26 |
| `--surface` | colour role: card | `#ffffff` | `#1a1d1d` | 53 / 48 |
| `--text` | colour role | `#1f2322` | `#e7e9e8` | 41 / 33 |
| `--muted` | colour role: secondary text, hover border | `#626a67` | `#8e9693` | 117 / 100 |
| `--line` | colour role: border, switch-off track, ring track | `#e5e5df` | `#2a2f2e` | 99 / 92 |
| `--accent` | colour role | `#2f8f83` | `#4fb3a5` | 150 / 125 |
| `--accent-soft` | colour role: tint, focus halo | `rgba(47,143,131,.12)` | `rgba(79,179,165,.16)` | 32 / 28 |
| `--heat0` | colour role: heatmap empty cell, every progress track, skeleton | `#ecedea` | `#232827` | 14 / 10 |
| `--danger` | colour role | `#b94a3f` | `#e07a6f` | 9 / 10 |
| `--warn` | colour role | `#c07a2c` | `#e0a15a` | 11 / 9 |
| `--radius` | radius | `16px` | same | 5 / 2 |
| `--navw` | sizing | `224px` (82); `72px` on `:root.nav-mini` (83) | same | 1 (`.sidenav` width, 118) |
| `--ease` | motion easing | `cubic-bezier(.2,.8,.2,1)` (821) | same | 48 / 43 |
| `--spring` | motion easing | `cubic-bezier(.34,1.5,.64,1)` (822) | same | 26 / 10 |
| `--spring-soft` | motion easing | `cubic-bezier(.3,1.25,.5,1)` (823) | same | 12 / 5 |
| `--lift` | shadow (hover) | `0 8px 18px -10px rgba(0,0,0,.3)` (824) | `0 10px 22px -10px rgba(0,0,0,.75)` (827, 828) | 2 / 0 |
| `--shine` | colour role: sheen sweep | `rgba(255,255,255,.5)` (825) | `rgba(255,255,255,.13)` (827, 828) | 4 / 0 |

`color-scheme` is set alongside (27, 32, 38). There are no duration tokens, no spacing/type/shadow scale here.

### Glass tokens (1372–1377, all inside `@supports (color: color-mix(in srgb, red 50%, blue))`)

| Token | Kind | `:root` 1372 | dark 1373 / 1374 | `[data-glass="lite"]` 1375 | `[data-minimal][data-glass]` 1377 |
|---|---|---|---|---|---|
| `--gb-a` | colour (blob strength) | 42% | 30% | – | 16% |
| `--glass-fill` | colour (surface opacity) | 58% | 55% | 80% | 82% |
| `--glass-blur` | blur level | 22px | – | 10px | 8px |
| `--glass-sat` | blur level (saturation) | 175% | – | 130% | 115% |
| `--glass-edge` | colour (border) | `rgba(255,255,255,.55)` | `.13` | – | – |
| `--glass-hi` | colour (top inset highlight) | `rgba(255,255,255,.7)` | `.16` | – | – |
| `--glass-glow` | colour (inner glow) | `rgba(255,255,255,.25)` | `.05` | – | `transparent` |
| `--glass-shadow` | shadow | `0 12px 32px -16px rgba(20,30,40,.28)` | `0 14px 34px -14px rgba(0,0,0,.7)` | – | – |
| `--sheen-a` | colour (sheen alpha) | .22 | .07 | 0 | 0 |
| `--sx` | position of the sheen band | 35% | – | – | – |

`--sx` is also written inline by JS (pointer sheen, script ~11438/11443). Lite (1375) has the same specificity as the dark block (1373) and wins only by source order.

### Scoped tokens defined here
- `.gd-scene` (1604): `--gd-sky: 150px` (118px ≤640, line 1745), art palette `--sky1 --sky2 --grass --grass2 --soil --soil2`, re-set by `[data-tod]` (1606–1608), `[data-wx]` (1609–1611), `[data-season]` (1612–1613), `[data-bg]` (1010–1016). Scene art, independent of the app theme.
- `.rw-coins { --rc: #c9a227 }` (668): rarity colour read by `.gd-item` / `.gd-seed` top border (`var(--rc, var(--line))`, 1708, 1737).
- `.zen #tab-timer .mason { --mason-cols: 1 }` (683): read by `fitMason()` (script ~5285) through `getComputedStyle`.

### Consumed here, defined elsewhere
- `--on-accent` (222, 347, 656, 739, 1328, 1352, 1961): **no CSS definition anywhere**. Only `applyTheme()` sets it from `SKINS` (13 of the 24 palettes in the first `SKINS` block, mostly the dark ones). Every use falls back to `#fff`.
- `--sp-4` (203, 206, with 16px fallback): defined in the later "DESIGN TOKENS + CONSISTENCY (v1.7)" block (~2187: `--sp-1..6`, `--r-sm/md/lg/pill`, `--sh-1/2`, `--fs-xs..xl`, `--icon`, `--card-pad`). That block also overrides `.card` padding/radius (2195) and `.desc/.lbl/.field` size (2199). Only 2 of the 658 spacing declarations in this slice use it.
- `--hdrh` (118, fallback 58px): ResizeObserver on `header.top` (script ~22955). `--timer-font` (287): `applyFont()` (~8919).
- JS inline per element: `--tier` (426, 691–692, 1159, 1164), `--rk/--rk2` (531–561, 574), `--ea/--eb` (626–651), `--pc-line/--pc-tile/--pc-fg/--pc-acc` (527–530), `--pbg/--psf/--pac/--ptx` (476–480), `--tc/--dx/--dy/--s/--rot/--d` (1164–1166, 1979–1989), `--i` (907–915, 1024–1028, 1692), `--x` (654), `--hx` (1246).

### How themes override
- CSS knows only default light/dark. Every other theme is a JS palette: `SKINS` (script ~8800, extended at ~8849, ~16768 bosses, ~16769 events, ~22770). `applyTheme()` (~8863) removes the nine `SKIN_VARS` (`bg surface text muted line accent accent-soft heat0 on-accent`, ~8799) from `<html>` inline style, then writes the palette inline and sets `data-theme="light|dark"`. Missing `accent-soft` is derived with `softOf()`.
- Inline style beats every `:root…` rule, so a new token that must follow a theme either derives from those nine in CSS (`color-mix()` on `var(--surface)` etc.) or is added to `SKIN_VARS` and to each palette.
- Never themed: `--danger --warn --radius --lift --shine` and all glass tokens (they follow `data-theme` only).
- With the default theme on "auto", `data-theme` is absent; dark comes from the media query. Each dark value is therefore written twice (29 + 35, 827 + 828, 1373 + 1374, 1517 + 1518).

### Measured contrast of the defaults (WCAG ratio)
- White on light `--accent` (`.btn.primary`, `.pill`, `.seg button.active`): 3.91. Light `--accent` as text on white (active nav item, links): 3.91.
- Default dark: `#fff` fallback on `#4fb3a5`: **2.52** (primary button, active segment, pills, `.plan-st.done`).
- Light `--warn` text on white: 3.46. `--muted`: 5.56 light, 5.60 dark. `--danger` light: 5.10.
- `--line` against `--surface`: 1.26 light, 1.25 dark (input borders, switch-off track, ring track).
- `.seg .cnt` white on dark `--danger`: 2.92.

## Components

States: H hover, F focus-visible, A active, D disabled. "global F" = the later rule `:where(button, a[href], [role="button"], summary, .plant):focus-visible` (~2159) with a 5px halo (~2160); nothing in this slice gives buttons a focus ring.

| Selector (lines) | What | Variants / modifiers | States | Notes |
|---|---|---|---|---|
| `.btn` (216–221; 840) | Pill button, 1px line, surface fill, padding 9×18 ≈ 42.5px tall | `.primary` (222: accent fill, 12×30, min-width 132) · `.small` (224: 5×12, 13px ≈ 31.5px) · `.danger` (225: text colour only) · `.buy` (470) · `.icon-l` (709) | H border muted (220), primary H `filter: brightness(1.06)` (223); full motion H lift `translateY(-1px)` + `--lift` (845); A `scale(.96)` (843, 846); D opacity .4 (221); global F | Ripple spans `.rip/.rip-dot` injected by the pointerdown listener (~5128) for `.btn, .chip, .kudo`. 448 uses in markup/JS. Padding overridden in 12 contexts (290, 469, 644, 730, 737, 1256, 1271, 1283, 1303, 1570, 1581, 1932). No ghost/secondary/destructive-filled variants. |
| `.linkbtn` (226–227) | Text button 13px muted | contexts recolour to accent (571, 796, 1763) | H text colour; global F | ≈27.5px tall. |
| `.iconbtn` (228–233) | 36px round icon button | `.sm` 32px (472); context sizes 30 (1564), 32 (1339), 36 (1882), 40 (1906, 1919), 44 (1967); header 34 (~2227) | H colour; lift/press as `.btn`; global F | No pressed/selected state. |
| `.chip` (302–313, 330) + `.chips` | Recent-session chip with pin button | `.pinned` (311), `.current` (313); children `.nm .meta .pin` | H border muted; A scale | `.chip .meta` is defined twice (309, 330). |
| `.chip-btn` (1019–1021) | Small pill toggle (garden backgrounds) | `.on` | D opacity .55 | min-height 32px. |
| `.catrow button` (454–457) | Scrolling category filter pills | `.active` | A scale | Scrollbar hidden. A second filter-pill system beside `.seg` and `.chip-btn`. |
| `.seg` (345–347; 866–879) | Segmented switcher | `.has-ind` + child `.seg-ind` (sliding pill), `.seg-fl/.seg-fr` edge fades (mask), `.cnt` badge (731), `.gd-seg .gd-n` (1065) | `button.active`; F inset (871); A scale | `syncSegs()` (~5172) positions `.seg-ind` and adds the classes; a MutationObserver re-syncs on theme/glass/minimal/motion attribute changes (~5235). With `.has-ind`, the active button is transparent (875): if the pill is not positioned the label is white on nothing. |
| `.btmbar` (114, 150–169) | Phone bottom bar | reuses `.seg-ind` (`.btmbar.has-ind`, 162–163) | `button.active` | z-index 40. |
| `.sidenav [data-tab]`, `.nv-collapse` (98–111) | Sidebar item | `.active` (105–106, bar via `::before`), `:root.nav-mini` icon-only (121–124), drawer ≤1179 (127–136), minimal (177–178) | H, F inset (108) | The nav element is `<nav class="sidenav" id="tabs">`. |
| `.card` (193) | Surface container | `.timer-card`, `.exam-card(.near/.empty)`, `.recap`, `.garden-peek`, `.boss-card`, `.pass-hero`, `.gd-scene`, `.rm-scene`, `.empty-card`… | none (garden-peek H/F 1074–1075) | Padding/radius replaced later (~2195). No header/footer/elevation variants. |
| `.tile` (352–355), `.tiles`, `.tiles4` | Stat tile | `.v` value, `.s` label | – | `var(--radius)`. |
| `.item` (460–469; 1188–1193) | Shop / bag card | `.equipped`, `.locked`, `.bought`; `.pv` preview, `.tag`, `.act`; garden `.gd-item` (1708–1712, 1845–1847) | H lift −3px (1189) | Radius 14 (card is 16). |
| `.pill` (739) | Accent count pill | `.boss-meta .pill` (1446), `.pass-hero .pill.warn` (629) | – | At least 12 more one-off pill tags: `.ach-cat` 318, `.early` 382, `.item .pv .tag` 464, `.rh-step` 541, `.rk-gift` 575, `.ms-chip` 578, `.gd-mut` 1720, `.plan-st` 1958, `.rm-set` 1880, `.seg .cnt` 731, `.gd-n` 1065, `.ot-tag` 573. |
| `dialog` (396–399; 943–951) | Modal | width classes: `.lvdlg` 340 (689), `.egg-dlg` 400 (1780), `.ot-dlg` 440 (572), `.gd-dlg` 440 (1727), `.rkl-dlg` 520 (545), `.plan-dlg` 520 (1963), `.deck-dlg/.fc-dlg` 560 (1911), `.rm-share-dlg` 560 (1890), `.coll-dlg` 880 (662); `.login-dlg` (1497); `dialog.gt-dlg` bottom-anchored, light backdrop (1050–1051) | open: `dlgIn` (944) / fade in Reduced (945); `.closing`: `dlgOut` (947) | Base 520px, padding 20, `max-height: calc(100vh - 40px)` (vh, not dvh). Gutter is 32px in some classes and 24px in others. `.closing` is added by the patched `HTMLDialogElement.prototype.close` (~5322) for 170 ms. No header/body/footer structure, no sheet here (`dialog.sheet` is later, ~2241). |
| `::backdrop` (943) | Scrim | – | fades (946, 948) | `rgba(10,12,12,.32)` + `blur(4px)`. Three other scrims: nav .38 (112), tour .55 (719), gt-dlg .18 (1051). |
| `.toasts` / `.toast-item` (976–987) | Toast stack | `.in`, `.out`; later `.has-undo` (~2286) | – | Inverted colours (`--text` fill, `--bg` text). z-index 80; phone offset 84px (166). `toastHost()` (~5072) re-parents `#toast` into the top-most open dialog. |
| `.achcard` (990–1004) | Achievement banner, top centre | `.show`; `.ac-ic .ac-k .ac-n .ac-c` | – | z-index 90, sheen sweep. |
| `.pomeo-bubble` (1249–1261) | Speech bubble on the timer card | `.show`, `.has-x`; `.pb-acts`, `.pb-x` | – | Absolute, inside `.timer-card` (which clips). |
| `.pomeo-pop` (1265–1290) | Reminder pop-up, bottom right | `.show`, `.compact` (top banner during focus), `.no-pomeo` | – | z-index 90; phone: full width above the bottom bar (1290). |
| `.tour`, `.tour-spot`, `.tour-tip` (716–730) | Onboarding spotlight | – | – | z-index 120; hole made with a 9999px box-shadow; transitions `width/height`. |
| `.park-pop` (1555–1557) | Small anchored popover (parking lot) | `.hidden` | – | The only popover pattern in the slice: absolute inside the card, z-index 6, no flip logic. |
| `.gd-say` (1704), `.rm-say` (1877) | Scene speech bubbles | – | – | Same declaration written twice. |
| `.floater` (959–964), `.float-emoji` (965–973), `.coin-fly` (1194), `.gd-fly` (1071), `.gd-float` (1678), `.dmg-float` (1447) | Reward fly-ups | `.floater.coin` | – | Six separate implementations. |
| `.skel` (929–937) | Skeleton | `.circ .line .short .block`; `.skel-row` | – | Shimmer unless motion off. |
| `.empty` (332), `.empty-card` (732–733), `.cta-card` (711), `.lb-empty` (790), `.rem-empty` (1345), `.cards-card .empty` (1910) | Empty states | – | – | Line-art `::before` variants are later (~2213). |
| `.tbadge` (703–706; 87, 107, 124, 164, 1503) | Red dot badge | `.hidden` | – | Seven position overrides. |
| `.avatar` (753–754), `.aura` (1508–1523), `.live` (750), `.dot` (331), `.look-pic` (1524) | Avatar, streak glow, presence dot | `.avatar.big`; `aura-soft/green/blue/purple/gold/rainbow` | – | `.aura::before` animates on every avatar at full motion. |
| Progress bars: `.progress` (339), `.xpbar` (427), `.chal .bar` (802) | Track + `<i>` fill | `.xpbar.mini` (1761) | – | These three fill by `translateX` (1146–1150): `i { width: 100% !important; transform: translateX(-100%) }`, moved by `animateFills()` (~5386) from `data-fill`. |
| Other bars: `.toplist .bar` 374, `.ach .ap` 448, `.sn-bar` 504, `.wq-bar` 595, `.pass-bar` 635, `.rkl-bar` 560, `.tr-fill` 653, `.hpbar` 1440, `.sbar` 1464, `.gp-bar` 1081, `.gt-p` 1039, `.gd-xp` 1006, `.plan-bar` 1951, `.evo-bar` 660 | 14 more bar implementations | – | – | Heights 3–16px; radii 2/3/9/99/999px/inherit; fill by width, `scaleX` or `translateX` depending on the bar. |
| `.ring` (281–285; 485–497; 669–672; 1093–1107), `.gring` (1181–1184) | Timer ring, header goal ring | `.break`, `rs-dots/thin/grad/orbit/flame/glow/none`, `.ring-live`, `.celebrate`, `.breathing`, `.final`, `#ring.ot` | – | `RING_CLASSES` (~8891) maps cosmetics to `rs-*`. |
| Rows: `.setting` 388, `.person` 741, `.lb li` 758, `.sesslist li` 379, `.preset-list li` 401, `.ach` 441, `.rem` 1320, `.exam-list li` 1547, `.rev-list li` 1572, `.plist li` 1561, `.post` 613, `.wq-row` 591, `.sm-row` 508, `.gd-loglist li` 1823, `.plan-row` 1948 | List rows | `.done .me .cur .claimed .rec .giant .dragging` | `[data-open]` rows H (744, 761) | Two dividers in use: `border-top: 1px solid var(--line)` with `:first-child` reset, or bordered boxes with radius 10–14. |
| `.rem-check` (1328–1332) | Round "done" button for reminders | `.rem.done` | global F | 24px. Not a checkbox input. |
| `.daychips` (1348–1353) | Weekday multi-select | hidden checkbox + `span` | `:checked + span`, `:focus-visible + span` | 38×34 cells. |
| `.kudo` (808–812), `.po-react button` (619–622) | Emoji reaction buttons | `.sent`, `.on` | H, D | Two implementations. |
| `.cd-card` / `.cd-face` (1920–1927), `.cd-grades .btn` (1931–1934) | Flashcard flip and grade buttons | `.flipped`; `.cd-g.g-again/.g-easy` | – | 3D transform; own reduced/off rules (1926–1927). |

No tooltip, menu, combobox, date/time picker, stepper or bottom-sheet component exists in this slice. `.tip` (367) is a text line under charts; `.rk-b[data-rk]` (544) only sets `cursor: help`.

## Form controls

- `button, input, select { font: inherit; color: inherit; }` (52). `textarea` is not in the list.
- **Text / number / password / select** — `input[type="text"], input[type="number"], input[type="password"], select` (237–239): width 100%, fill `--bg`, 1px `--line`, radius 10px, padding 9×12 (≈42.5px tall). No `appearance: none`: selects keep the native arrow and native popup; number inputs keep native spinners.
- **Focus** — `input:focus, select:focus` (240): 3px `--accent-soft` outline + accent border, on `:focus` (mouse too) and for every input type. A later `:where(...)` rule (~2161) adds a 2px ring on `:focus-visible`.
- **Date, time, search, untyped inputs, textarea** — no base rule anywhere in the stylesheet: browser-default border, fill, radius and padding. They only get the inherited font (52), the glass fill (1413: text, number, date, time, untyped, select) and the later focus ring (~2161). Local sizing only: `.rform input, .rform select` (1356), `.exam-form` 160px date column (1551), `.dk-bulk textarea` (1917), `min-height: 44px` on `.dk-*`, `.pl-row`, `.rm-setform` inputs.
- **Colour** — `input[type="color"]` (241): 42×40 native swatch, radius 10.
- **Checkbox** — first rule (242: 18×18, `accent-color`) is overridden by the switch (882–894): `appearance: none`, 42×24 track in `--line`, 18px knob `::before`, `:checked` accent + `translateX(18px)`, `:active` squash, `:focus-visible` 3px `--accent-soft` outline. Every checkbox in the app is a switch; no tick-box style exists. No `:disabled` style. Hidden-checkbox patterns: `.daychips` (1350), later `.sub-check`, `.hs-seats`.
- **Radio** — unstyled here.
- **Range** — `input[type="range"]` (482: `accent-color`, width 160px) then custom (895–901): 4px `--line` track, 18px accent thumb, WebKit + Firefox, `:active` thumb scale 1.3. No filled part of the track, no focus style, no value bubble, no disabled style.
- **Select contexts** — `.preset-row select` (298), `.ach-sort select` (317), `#sessForm select` (328), `.setting input[type="number"], .setting select` 140px (391), `.rform select` (1356).
- **Field scaffolding** — `.field` label (236), `.hint` (253), `.lbl` (338), `.desc` (390), `.pw` reveal button (254–260), `.auth-error` (261). No error/invalid/disabled field state, no prefix/suffix slots.
- **Touch** — 44px minimums come from a later `@media (pointer: coarse)` block (~2496–2517), not from the controls.
- Counts in markup + script (lines 3795–end): `<select` 19, `type="date"` 5, `type="time"` 3, `type="number"` 8, `type="color"` 1, `type="range"` 3, `type="checkbox"` 44, `type="radio"` 3, `type="file"` 1, `type="search"` 2, `<textarea` 3, `confirm(` 8, `alert(` 1, `<dialog` 36. A promise-based `confirmDlg()` already exists (~22191, 13 callers).

## Hard-coded values

All counts are for lines 9–1999.

**border-radius** — 185 declarations, 26 distinct; 5 use `var(--radius)`.
`999px` 43 · `50%` 36 · `12px` 19 · `14px` 15 · `10px` 13 · `inherit` 9 · `99px` 5 · `2px` 5 · `0` 5 · `var(--radius)` 5 · `16px` 4 · `8px` 4 · `4px` 4 · `9px` 3 · `18px` 2 · `6px` 2 · `3px` 2 · `22px` 1 · `11px` 1 · `1px` 1 · 6 shaped values.
Pill is written three ways (`999px`, `99px`, `9px`). Box radii run 8/10/11/12/14/16/18/22.

**box-shadow** — 57 declarations, 50 distinct; 2 use `var(--lift)`, 2 use `var(--glass-shadow)`.
Elevation shadows, all different: `0 8px 18px -10px .4` ×2 (1704, 1877) · `0 10px 24px -14px .4` ×2 (1252, 1267) · `0 10px 26px -12px .45` (982) · `0 10px 30px -18px .35` (1921) · `0 14px 30px -14px .45` (1555) · `0 16px 36px -16px .45` (993) · `0 18px 40px -16px .5` (724) · `0 18px 40px -16px .45` (1278) · `18px 0 40px -18px .35` (129).
Rings via shadow: `0 0 0 2px/3px/5px/6px …` ×9 (531, 557, 646, 703, 750, 776, 1044, 1496, 1665).
Glows: aura ×6 (1511–1517), `#mainBtn::after` (858), garden/particles ×9. Knobs: `0 1px 3px .3` (888), `0 1px 4px .3` (897).
`text-shadow` 3, `drop-shadow()` filters 26.

**font-size** — 232 declarations, 27 distinct, 0 tokens.
`13px` 48 · `12px` 33 · `14px` 29 · `11px` 28 · `13.5px` 15 · `15px` 13 · `12.5px` 13 · `16px` 5 · `11.5px` 5 · `10px` 5 · `10.5px` 5 · `22px` 4 · `20px` 4 · `18px` 4 · `30px` 3 · `9.5px` 2 · `26px` 2 · `24px` 2 · `19px` 2 · `17px` 2 · `14.5px` 2 · `46px` 1 · `40px` 1 · four `clamp()`.
Body is `15px/1.5 system-ui` (49). 42 declarations use half-pixel sizes; 45 are below 12px.
**font-weight** — `600` 63 · `700` 27 · `800` 7 · `300` 7 · `650` 5 · `400` 4 · `500` 2.
**line-height** — 12 distinct (1, 1.08em, 1.1, 1.2, 1.25, 1.3, 1.4, 1.45, 1.5, 16px, 0, normal). **letter-spacing** — 14 distinct; uppercase kickers use .06/.08/.1/.12/.14em.

**gap** — 206 declarations, 27 distinct, 1 token (`var(--sp-4, 16px)`, 203).
`6px` 45 · `10px` 40 · `8px` 38 · `4px` 19 · `12px` 17 · `16px` 7 · `5px` 5 · `2px` 5 · `14px` 4 · `3px` 3 · others ≤2.
**padding** — 170 shorthand declarations, **109 distinct**. `0` 30; next most common `6px 10px`, `10px 12px`, `0 6px` at 4 each.
**margin** — 117 shorthand declarations, 52 distinct; plus `margin-top` 12 distinct values, `margin-bottom` 6.
Pixel values across gap/padding/margin: `6px` 122 · `10px` 118 · `8px` 101 · `12px` 88 · `4px` 85 · `14px` 47 · `2px` 46 · `16px` 34 · `5px` 22 · `9px` 15 · `3px` 15 · `18px` 14 · `20px` 10 · `7px` 9 · `22px` 7 · `1px` 7 · `24px` 6 · `11px` 6 · `26px` 5. 658 spacing declarations hold 773 pixel values; 74 of them (10%) are odd (1, 3, 5, 7, 9, 11px).

**Colours outside `var()`** — 255 hex literals (136 distinct) and 113 `rgb()/rgba()` literals (82 distinct); 50 `color-mix()` calls.
By section, hex: GARDEN 109 · MOTION 42 (mostly the misplaced garden block) · PROG+SHOP 37 · TOKENS 27 · FRIENDS 11 · COSMETICS 10 · AURA 6 · QUESTS 4 · REMINDERS 3 · GLASS 3.
UI colours that act as roles but have no token:
- on-colour white `#fff` ×28 (e.g. 510, 588, 731, 1065, 1324, 1605, 1659)
- coin gold `#c9a227` (421, 668, 960, 1194)
- medals `#a8861d` / `#7d8790` / `#a2662f` with rgba tints (765–767, 773–775, 779, 1825, 1828)
- streak orange family `#f28c28 #f2a65a #e5654f #f07a2a #e8793a #c4621a` (494–514, 578, 588, 653, 1171)
- success greens `#3fb950` (750), `#2f9e5f` (785), `#5c9b57` (1041), `#9ad395/#5a9a5c` (661); down/negative `#d9480f` (785)
- boss HP `#e5654f → #f08a5d`, `#ffd9a8` (1441–1442, 1447); favourite/ready `#e5654f` (1067, 1083), `#f6d44a` (1665–1668); pet gold `#d9a52a` (1061–1066); hearts `#e2576b` (1773)
- mutation text colours `#b8860b #3f8fbf #b58a00 #4a63c9 #2f8fbf #7a4fd1 #d66a3c #4a6a8a` (1722, 1813–1814): 3.0–3.6 against white or the dark surface
- redundant fallbacks `var(--warn, #e0a030)` / `var(--warn, #c98a1a)` (565, 566, 569, 573, 629)
Black alphas in shadows/scrims: 12 distinct (.08–.75), 32 uses. White alphas: 15 distinct, 25 uses.

**Transitions** — 51 declarations. Durations: `.15s` 9 · `.45s` 9 · `.3s` 8 · `.25s` 6 · `.22s` 5 · `.2s` 5 · `.26s` 4 · `.5s` 4 · `.6s` 4 · `.35s` 3 · `.42s` 3 · `.8s` 3 · `1s` 3 · `.4s` 2 · `.38s` 2 · `.9s` 2 · `1.4s` 1 · `.08s` 1 · `.01s` 1 · `0s` 1 (20 distinct).
Easings: `var(--ease)` 26 · none given (browser `ease`) 24 · `var(--spring-soft)` 10 · `var(--spring)` 8 · `var(--ease, ease)` 2 · raw `cubic-bezier(.3,.7,.3,1)` (1071), `cubic-bezier(.2,1.4,.4,1)` (1788, 1834) · `linear` 1 · `ease` 1.
Properties: transform 27 · opacity 15 · background-color 5 · border-color 5 · color 4 · **width 4** · box-shadow 3 · stroke-dashoffset 3 · background 2 · fill 2 · **height 2** · visibility 1 · stroke 1.
**Animations** — 126 uses, 51 distinct durations (.17s to 95s). Entrances cluster at .25–.45s and .6s. Easings: `ease-in-out` 50 · `var(--ease)` 20 · `var(--spring)` 18 · default 16 · `ease-out` 10 · `linear` 7.

**z-index** — 36 declarations.
- −1: `.timer-card::before` (1088), glass `.top::before` (1405)
- 0: `#starCanvas` (679), `#glassBg` (1369), `.seg-ind` (878)
- 1: `#appView` (680), `.btmbar button` (157), `.seg > button` (870), `.rem-fg` (1322), `.gd-life` (1023)
- 2–6, local to a card/scene: `.gt-hi` 2, `.gd-plots` 2, `.rm-say` 2, `#ringTrail` 2, `.floater` 3, `.park-btn` 3, `.gd-rain` 3, `.pomeo-host` 4, `.gd-visitors` 4, `.gd-pets` 4, `.gd-float` 5, `.park-pop` 6, `.gd-say` 6
- 9 `.sidenav` desktop (119) · 10 `.top` (61) · 40 `.btmbar` (152) · 58 `.nav-scrim` (112) · 59 `.sidenav` drawer (128) · 60 `.gd-fly` (1071) · 70 `#fxCanvas` (678) · 80 `.toasts` (977) · 85 `.float-emoji` (965) · 90 `.achcard` (991), `.pomeo-pop` (1274) · 95 `.coin-fly` (1194) · 120 `.tour` (716)
- Next slice continues at 85 (`.tip-pop`) and 130 (`.wrapped`).

**!important** — 21 uses: `.hidden` (57); nav label visibility (72, 144); `.nv-solo` margin (97); nav motion (146, 147); minimal quest dot (179); `#rankChip` (525); `.rl-bar i` background ×2 (536, 537); motion Off/Reduced globals (831 ×2, 833); `.toast-item` reduced (987); `.ring.celebrate .prog` (1095); bar fill `width: 100%` (1147); `.theme-fade` (1199); mascot reactions ×4 (1222–1226).

## Themes, Glossed, Minimal, motion, breakpoints

**`[data-theme]`** — `:root[data-theme="dark"]`: 29 (colours), 827 (`--lift/--shine`), 1373 (glass), 1517 (`.aura-soft`), 1711 (`.gd-item.silhouette`). `:root:not([data-theme="light"])` inside `prefers-color-scheme: dark`: 35, 828, 1374, 1518. Line 1711 has no media-query twin.
**`prefers-color-scheme`** — 34, 828, 1374, 1518 only.

**`[data-glass]`** ("full" | "lite"; attribute removed = off) — sidebar 171–176; main block 1379–1426:
- blobs `#glassBg .g1–.g4` (1379–1383), drift only for `[data-glass="full"][data-motion="full"]` (1384–1387)
- surface list (1390–1395): `.card, .tile, .item, dialog, .seg, .coinpill, .lvchip, .pomeo-bubble, .pomeo-pop .pp-card, .tour-tip` + `.top::before` get translucent fill, sheen gradient, `--glass-edge` border, inset highlight + `--glass-shadow`
- blur list (1396–1398): `.card, .tile, dialog, .pomeo-pop .pp-card, .tour-tip`, `.top::before`
- lighter insides (1400–1401), header pseudo-element (1404–1405), legacy `.tabs` (1406, 1416), `.item .pv` (1407)
- controls (1408–1413): `.btn:not(.primary):not(.danger), .iconbtn, .chip, .catrow button`; `.btn.primary`; text/number/date/time/untyped inputs + select
- `.ring .track` (1414)
- no `backdrop-filter` support: `@supports not` (1419–1421), also 172–175 for the sidebar
**`[data-glass-solid]`** ("rt" reduced transparency | "nb" no blur, set by `applyGlass()` ~11424) — 176, 1423–1426.
**`[data-minimal]`** — 177–179 (sidebar active item, quest dot), 523–524 (`:root:not([data-minimal])` header rules), 1377 (glass softening). Most minimal rules are in the next slice.

**`[data-motion]`** ("full" | "reduced" | "off"; set before first paint ~3828 and by `applyMotion()` ~5119, which maps `prefers-reduced-motion` to "reduced" when no preference is saved):
- `="full"`: 111 lines gate decorative animation.
- `="reduced"`: 832–834 (global `transition-property` whitelist, `!important`), fades at 905, 908, 918, 945, 951, 962, 967, 1155, 1245, 1260, 1288; 987, 997, 1927.
- `="off"`: 831 (global `animation: none; transition: none`, `!important`), 146, 869, 1926.
- `:root:not([data-motion="off"])`: 843, 931, 940, 946, 947, 948, 958. `:root:not([data-motion="full"])`: 1449, 1990.
**`prefers-reduced-motion`** — only 147 (nav drawer). Comment at 1209 states the rest is handled by `data-motion`.

**Other root/body switches** — `:root.nav-mini` (72, 83, 111, 121–124) · `body.nav-open` (131) · `body.focus-dim` (1119–1120) · `.zen` on body (683–686) · `:root[data-focusing]` (1264) · `.theme-fade` on root (1198–1200).
**State attributes** — `.mascot[data-state]` idle/focus/sleep/celebrate (1126–1134), sleepy/happy/excited (1220–1233); `.gd-scene[data-tod|data-wx|data-season|data-bg]`; `[data-open]` rows (743, 760, 777); `.chart [data-tip]` (363); `.rk-b[data-rk]` (544); `[data-dot="questDot"]` (179); `.sidenav [data-tab]` (98).

**Breakpoints** (49 `@media`):
- width, max: 359 (1208) · 380 (169) · 400 (290, 523) · 420 (296, 563, 794, 1043, 1489) · 480 (355, 407, 525, 667, 1552, 1836, 1939) · 520 (813) · 560 (608, 630) · 600 (524) · **640** (150, 1203, 1290, 1359, 1415, 1744, 1794, 1893, 1969) · 1179 (127, 174) · 1380 (704)
- width, min: 640 (430) · 641 (143) · 860 (205, 213) · 1180 (117)
- ranges from 641: –760 (145), –780 (1202), –899 (141), –1179 (137)
- `(hover: hover)` 844, 1189 · `(pointer: coarse)` 1905
- Layout tiers: phone ≤640 (bottom bar), tablet 641–1179 (drawer + burger), desktop ≥1180 (sidebar), two-column content ≥860. `min-width: 640px` (430) and `max-width: 640px` both match at exactly 640.
- Safe-area insets: 63, 128, 153, 165–167, 977, 991, 1265, 1274, 1290.
- No `content-visibility`, no `contain`, no container queries. `will-change` at 1026, 1979. `isolation: isolate` at 1086, 1605.

## Animations

96 names. Usage is in this slice unless noted (next-slice lines marked →).

**Animate something other than transform/opacity**
- `readyPulse` (1496) box-shadow, infinite — `.track7 .d.today.ready` (1495; → 2848, 2958)
- `gd-pulse` (1667) box-shadow, infinite — `.gd-plot.ready` (1666)
- `gd-rain` (1637) background-position, infinite — `.gd-rain` (1636)
- `drawIn` (837) stroke-dashoffset — `.ok-check path` (958), `.lv-badge svg.draw *` (1154); `draw` (696) same, unused
- filter: `ringFlick` (497, infinite, 496), `pm-hue` (1057, infinite, 1056), `bossHit` (1452), `bossDown` (1457)
**Transitions on layout/paint properties** — `width` on `.sidenav` (119); `width`+`height` on `.tour-spot` (720) and `.seg-ind` (878); `width` on `.xpbar i` (428, dead: overridden at 1147); `box-shadow` on `.btn` (840), `.rk-card` (531), `.item` (1188); `background` on `.gd-sky` (1614); `stroke-dashoffset` on `.ring .prog` (1093, 1095), `.gring .gp` (1184); `fill` on `.ringdots circle` (486); `.theme-fade *` (1198–1200) transitions colour properties on every element for 450 ms.

**Transform/opacity only**
- Entrances: `fadeIn` 835 (905, 908, 917, 918, 945, 946, 1155, 1260, 1288; → 2043, 2428, 2652, 2932) · `fadeOut` 836 (948, 951) · `pageIn` 906 (904, 1304) · `itemIn` 909 (907) · `dlgIn` 698 **and** 949 (944) · `dlgOut` 950 (947) · `popIn` 1461 (792, 1460) · `popUp` 1289 (1287; → 2427) · `bubbleIn` 1261 (1259, 1557) · `bounceIn` 1115 (1114) · `rollUp` 1178 (1177) · `dotPop` 706 (705; → 2230)
- Charts: `barUp` 912, `barX` 914, `heatIn` 916
- Feedback: `rip` 850 (849) · `ripple` 677 (675) · `shake` 955 (954) · `floatUp` 963 · `floatFade` 964 (962, 967) · `emojiPop` 968 · `fadeInOut` 1247 (1245, 1449; → 2833) · `heartUp` 1246 · `dmgUp` 1450 · `sweep` 1000 · `bought` 1191 · `lvp` 1166 · `burst` 697 (1161, 1162) · `popSpin` 1156 · `flare` 1175 · `tpFly` 1980 · `gd-up` 1679 · `gd-pop` 1677 · `gd-poke` 1703 (1702, 1772) · `gd-giant-pop` 1835 · `eg-wobble` 1790 · `grow` 1593 (1664)
- Timer: `drift` 1092 **and** 1388 (1091, 1384) · `breathe` 1102 · `finalPulse` 1104 · `burstRing` 1107 · `digIn/digOut` 1112–1113 (1110–1111) · `glow` 860 (859, 940) · `otGlow` 568 · `frBlaze` 500 · `frGm` 580
- Ambient loops: `pulse` 187 (184; → 3435) · `shimmer` 1150 (1149, every `.xpbar`/`.progress` fill) · `medal` 926 · `skel` 932 · `flicker` 1174 · `auraPulse` 1521 (1519; → 3312) · `auraSpin` 1522 (1520; → 3004–3009) · `twinkle` 1242 (1233, 1673, 1866; → 3259) · `auroraDrift` 1994
- Mascot: `bob` 1135 · `blink` 1136 · `sleepy` 1137 · `zz` 1138 · `hop` 1139 (1134, 1232, 1861) · `pWiggle/pJump/pSpin/pSquish` 1238–1241
- Boss: `bossIdle` 1454 (1453; → 2820)
- Garden: `sway` 1592 · `gd-firefly` 1027 · `gd-fall` 1031 · `gd-drift` 1633 · `gd-ripple` 1655 · `gd-jet` 1657 · `gd-flap` 1694 (1693, 1771, 1872) · `gd-flutter` 1695 · `gd-hop` 1697 · `gd-tail` 1699 (1698, 1871) · `gd-peck` 1701 · `gd-idle` 1770 · `wm-jitter` 1810
- Room: `rm-wander` 1860 · `rm-glow` 1863 · `rm-neon` 1865 · `rm-rain` 1868 · `rm-fish` 1870 · `rm-blob` 1874 · `rm-bolt` 1876

**Not gated by `data-motion="full"`, so they still move in Reduced** — `.shake` (954), `.ripple` (675), `.rip-dot` (849), digit roll `.time .dc.in/.out` (1110–1111), `.gd-plot.harvesting .gd-plant` (1676), `.gd-float` (1678), `.gd-firefly/.gd-leaf` (1024, 1028), `.tp` (1979; its host is hidden unless full, 1990), `.skel::after` (931), `.boot-dot` (940), `.ok-check path` (958).

## Traps

1. **Duplicate keyframe names.** `dlgIn` at 698 (translateY) is replaced by 949 (scale). `drift` at 1092 (timer card background) is replaced by 1388 (glass blobs, `vmax` translations) wherever `color-mix()` is supported, so `.timer-card::before` (1091) runs the blob animation. `pop` (695) and `draw` (696) are referenced nowhere.
2. **Glass rules use `:is()` lists**, which give every member the specificity of the most specific entry: (0,4,0) for the surface list (1390), (0,5,0) for the control list (1408). No later rule restores these, so under Glossed the following lose their border and/or background by cascade: `.item.equipped` (461), `.exam-card.near` border + shadow (1543), `.recap` (797), `.garden-peek:hover` (1074), `.chip.pinned` / `.chip.current` (311, 313), `.catrow button.active` (457), `.btn.buy` border (470), `.cd-g.g-again/.g-easy` (1934), all `.btn/.chip` hover borders. The hover lift shadow (845) ties at (0,5,0) and loses on order. Not checked in a browser.
3. **Global motion rules carry `!important` on `*`** (831–834). Off kills every transition, including ones a component needs to finish (anything waiting on `transitionend`/`animationend`). Reduced keeps only `opacity, color, background-color, border-color, stroke-dashoffset, fill`: a new control animated by `transform` gets no transition, one animated by `box-shadow`/`outline` neither.
4. **Bar fills.** `.xpbar i, .progress i, .chal .bar i` are forced to `width: 100% !important` and moved by `translateX` (1147); `animateFills()` (~5386) drives them through `data-fill`. Setting `style.width` on these does nothing. The other 14 bars use `scaleX` inline styles or plain width.
5. **Things that become a containing block for `position: fixed` and a stacking context**: `dialog[open]` (944), `.tab.active` / `.view-in` (904), `.stagger > *`, `.row-new` (907) while their `both`-filled transform animation stays in effect; every glass surface with `backdrop-filter` (1396); the comment at 1402 records the header case. Clipping ancestors: `.timer-card` (`overflow: hidden; isolation: isolate`, 1086), `.boss-card` (1432), `.gd-scene` (1605), `.rm-scene` (1854), `.seg` (866), `dialog` (UA `overflow: auto`). `#appView` is `position: relative; z-index: 1` (680) and closes after `.nav-scrim`: the header (10), sidebar (9/59), scrim (58), bottom bar (40) and all card-local stacks live inside that one level. Body-level siblings (`#fxCanvas` 70, `.toasts` 80, `.float-emoji` 85, `.pomeo-pop`/`.achcard` 90, `.coin-fly` 95, `.tour` 120, next slice `.wrapped` 130) are compared with `#appView` as a whole, so a popover portaled to `<body>` clears all app chrome with any z-index above 1 and needs about 100 to sit above pop-ups but below the tour.
6. **Modal dialogs are in the top layer.** Body-level overlays (toasts, `.pomeo-pop`, `.achcard`, `#fxCanvas`) sit underneath an open dialog whatever their z-index; `toastHost()` works around it by moving `#toast` into the dialog.
7. **`--on-accent` has no default.** White on the default dark accent is 2.52:1. Two badges hard-code `#fff` instead of a token: `.seg .cnt` on `--danger` (731) and `.gd-seg .gd-n` on `--accent` (1065).
8. **Dark values written twice** (attribute + media query). Line 1711 (`.gd-item.silhouette`) exists only for the attribute, so default theme + "auto" + system dark gets the light filter.
9. **`.hidden { display: none !important }`** (57) is the app-wide visibility switch: 400 selector hits in 176 test suites and 180 `classList.contains('hidden')` checks. Any component whose base rule sets `display` relies on that `!important`.
10. **Checkbox = switch, globally** (882). A real tick box, or a native checkbox inside a new component, inherits the 42×24 switch unless reset. The 242 rule is dead.
11. **`input:focus` (240) applies to every input type** and to mouse focus; custom inputs built on a hidden `<input>` will show it unless reset.
12. **Legacy / dead rules**: `.tabs` (841, 843, 1406, 1416, 1420, 1423, 1502 and 15 more later; no element has the class, the nav uses `id="tabs"`); `.tbadge` 1380px rule (704); `.xpbar i { transition: width }` (428); `.plant` art (1588–1593) and `.garden-stats` (1594) — check the welcome page and Wrapped before deleting.
13. **Rules defined twice in the slice**: `.plist` (740, 1560), `.chip .meta` (309, 330), `.sesslist li` (378, 379), `.gd-loglist .nm` (1816, 1827), `.tr-line` margin (652, 659), `.lvchip` (412, 1185, 1206, 1502), `.timer-card` (272, 1086), `.btn` transition (218 then 840), `.item` (460, 1188), `.seg` (345, 866), `.rl-bar i` with two `!important` backgrounds (536, 537), `.gd-say` = `.rm-say`, fence/path gradients repeated for `.gd-fence` and `.dcpv` (1643–1645 vs 1714–1716; 1995–1998).
14. **Header name visibility is decided by eight rules** across 72, 143, 144, 524, 1202, 1208 here and ~2231–2236 later, three with `!important`.
15. **JS reads or toggles these names** (renaming breaks behaviour): `.mason/.mason-2/.mason-one` + `--mason-cols` (`fitMason`), `.seg/.seg-ind/.has-ind/.seg-fl/.seg-fr` (`syncSegs`), `.rip/.rip-dot`, `.toast-item.in/.out`, `dialog.closing`, `.tab.active`, `#ring` + `rs-*`, `ring-live`, `celebrate`, `breathing`, `final`, `ot`, `#mainBtn.running`, `.time .dg/.dc`, `.mascot[data-state]` + `r-*`, `body.focus-dim`, `body.zen`, `body.nav-open`, `:root.nav-mini`, `:root[data-focusing]`, `.theme-fade`, `.achcard.show`, `.pomeo-pop.show/.compact/.no-pomeo`, `.pomeo-bubble.show/.has-x`, `.rem.dragging/.done`, `.cd-card.flipped`, `.egg-dlg.cracked/.still`, `.shake`, `.row-new`, `.stagger`, `[data-fill]`, `--hdrh`, `--sx`, `--timer-font`.
16. **Tests depend on** (hits / suites): `#appView` 195/137, `.toast-item` 38/18 (toast text is asserted), `#mainBtn` 39/14, `.gd-plot` 35/12, `.item` 30/14, `.tab` 25/15, `.gd-item` 24/8, `#ring` 21/10, `.mason` 21/8, `.aura` 19/11, `.chip` 17, `.card` 17/10, `.ach` 17/7, `#rankChip` 15, `.pomeo-bubble` 14/12, `.seg-ind` 13/4, `#ringTrail` 12/5, `.setting` 11/10, `.rk-b` 11/5. 228 of the 828 classes appear in test selector strings. Tests also read `--bg`, `--accent`, `--muted`, `--surface`, `--glass-fill`, `--gb-a`, `--glass-blur`, `--timer-font` with exact values, computed `animationName` (`auraPulse`, `twinkle`, `.gd-fly`, `.gd-firefly`), `::before` `boxShadow` of `.aura`, `overflowX`, `minHeight` (44px targets), `gridTemplateColumns`, and class states `mason-one`, `mason-2`, `nav-open`, `nav-mini`, `ring-live`, `closing`, `focus-dim`, `seg-fl`, `seg-fr`, `flipped`, `cracked`.

## v2.0 touch points

**Tokens**
- Keep the ten role names and the nine `SKIN_VARS` exactly: `SKINS` palettes, `applyTheme()` and the tests write/read them by name. Add the new system as a layer beside them (surface levels, text levels, focus ring, success) derived in CSS with `color-mix()` from `--bg/--surface/--text/--accent`, so all themes follow without touching each palette.
- Give `--on-accent` a real default in the light and dark blocks, and add a `--success` role; both fix measured failures without changing any palette.
- Token blocks belong at the top (10–40) merged with the v1.7 block (~2187) and the motion block (820–828); today tokens are defined in four places. The v1.7 names (`--sp-*`, `--r-*`, `--sh-*`, `--fs-*`) already exist and are almost unused here, so adopting them is additive.
- Suggested scales from the distributions: radius 8 / 12 / 16 / pill (covers 10→8 or 12, 14→12 or 16, 18/22→16); spacing 2 / 4 / 6 / 8 / 12 / 16 / 20 / 24; type 11 / 12 / 13 / 14 / 15 / 17 / 20 / 22 / 30 (drop the half-pixel sizes); elevation 3 levels replacing the 9 one-off shadows; durations 120 / 200 / 320 ms replacing 20 transition durations; one scrim token for the 4 scrims; blur levels already exist as `--glass-blur`.
- Have the boot script (~3828) and `applyTheme()` always set a resolved `data-theme`, then delete the four media-query twins. Check first that no suite asserts the attribute is absent.

**Controls**
- New field base should replace 237–242 in one place and include date/time/search/untyped/textarea, which are unstyled today. Reset the global switch rule (882) and `input:focus` (240) inside custom controls.
- Listbox, date and time popovers cannot live inside the card or dialog that opens them (trap 5). Portal to `<body>`, or into the open dialog the way `toastHost()` does, and position from `getBoundingClientRect()`.
- The switch (882–894) and slider (895–901) can be upgraded in place: same elements, so saved values and JS handlers are untouched. Add `:disabled`, a visible off-state boundary (1.26:1 today), slider fill and focus.
- `.seg` is already a custom control with JS (`syncSegs`); restyle through its existing classes. `.catrow button`, `.chip-btn`, `.daychips span`, `.kudo`, `.po-react button` can all collapse onto one chip/toggle component.
- `dialog` base (396–399) plus the open/close animation (942–951) and the patched `close()` (~5322, 170 ms timer tied to `dlgOut .17s`) are the seam for the new dialog/sheet: keep the `.closing` class and change the duration in both places together.
- `confirmDlg()` exists; the 8 `confirm()` + 1 `alert()` calls only need routing to it.

**Visual pass**
- Rewrite section by section in file order, one section per edit; the misplaced garden block (1006–1084) and the non-timer strays in TIMER (315–332) can move to their sections in the same pass with no selector changes.
- Fix the glass specificity (trap 2) by wrapping the two `:is()` lists in `:where()` and re-checking every glass surface, rather than adding `!important` to state modifiers.
- Collapse the 17 progress bars onto the `data-fill` + `translateX` mechanism, and the 6 fly-up implementations onto `.floater`.
- Motion: gate the items listed under "still move in Reduced"; replace the two box-shadow keyframes (`readyPulse`, `gd-pulse`) with an opacity-animated pseudo-element; `gd-rain` with a translated layer; `.sidenav` width transition is the only layout transition on a large subtree.
- Accessibility items measured here: accent/on-accent pairs (3.91 light, 2.52 dark default), `--warn` text (3.46), `--line` control boundaries (1.26), fixed mutation/medal/delta colours (3.0–3.6), 45 font sizes below 12px, `.btn.small` 31.5px / `.linkbtn` 27.5px / `.rem-check` 24px targets on non-touch pointers.
