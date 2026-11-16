# Direction C — "Warm garden"

Pomodorolist 2.0 visual direction. Prototype: `proto.html` (`?view=timer|components|phone&mode=dark|light&skin=default|sunset`), screenshots: `timer--*.jpg`, `components--*.jpg`, `phone--*.jpg`, re-shoot with `node shoot.mjs`.

## Rationale

1. A student opens this app for six hours a day; it should feel like a well-kept desk by a window, not a dashboard. Every plane carries a few percent of the accent, so no surface is ever a dead grey.
2. Softness is spent on shape (22 radius cards, pill controls, round progress ends), never on legibility: inputs keep a real 3:1 edge and all text passes AA in every palette tested.
3. One hero per screen. The gradient exists only on the ring, its leaf cap, the primary button and the selected day; everything else is flat tint, so the eye always knows where "Start" is.
4. The garden and Pomeo are a signature, not decoration: one leaf glyph (ring cap + card titles), Pomeo only where he has something to say (timer greeting, tip, empty states).
5. Tactile, springy feedback (press scale .96, 1 px hover lift, overshoot on switch thumb and favourite star) gives the "alive" feeling without confetti, coins raining or anything casino-like.

## Final token block

Copied from `proto.html`. A palette supplies only the nine inputs (`--bg --surface --text --muted --line --accent --accent-soft --heat0 --on-accent`); everything else below is derived with `color-mix()` or is palette-free.

```css
/* ════════════════════════════════════════════════════════════════════
   TOKENS — "Warm garden". Everything below is derived or palette-free.
   ════════════════════════════════════════════════════════════════════ */
:root{
  /* type — system stack only */
  --font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --fs-11:11px; --fs-12:12px; --fs-13:13px; --fs-14:14px; --fs-15:15px;
  --fs-17:17px; --fs-20:20px; --fs-24:24px; --fs-30:30px;
  --fs-timer:88px; --fs-timer-sm:60px;
  --fw-400:400; --fw-500:500; --fw-600:600; --fw-700:700;

  /* space */
  --sp-2:2px; --sp-4:4px; --sp-6:6px; --sp-8:8px; --sp-12:12px;
  --sp-16:16px; --sp-20:20px; --sp-24:24px; --sp-32:32px; --sp-40:40px;

  /* radii — 6 kbd · 8 tooltip · 12 rows/swatches · 16 popovers/tiles · 22 cards/dialogs/sheets · pill controls */
  --r-6:6px; --r-8:8px; --r-12:12px; --r-16:16px; --r-22:22px; --r-pill:999px;

  /* control heights */
  --h-sm:32px; --h-md:40px; --h-lg:44px; --h-xl:56px; --tap:44px;

  /* motion — springy, never bouncy on opacity */
  --d-fast:120ms; --d-base:200ms; --d-slow:320ms;
  --ease-out:cubic-bezier(.2,.8,.2,1);
  --ease-spring:cubic-bezier(.34,1.56,.64,1);

  /* surfaces — the accent is mixed a few percent into every plane */
  --canvas:color-mix(in oklab,var(--bg) 96%,var(--accent));
  --card:color-mix(in oklab,var(--surface) 96%,var(--accent));
  --card-warm:color-mix(in oklab,var(--surface) 87%,var(--accent));   /* hero wash only */
  --pop:color-mix(in oklab,var(--surface) 93%,var(--accent));         /* popovers, dialogs, sheets */
  --well:color-mix(in oklab,var(--bg) 62%,var(--surface));            /* input fill */
  --tile:color-mix(in oklab,var(--accent) 7%,var(--card));            /* nested zone inside a card */
  --chip:color-mix(in oklab,var(--accent) 12%,var(--card));           /* chips, tonal icon buttons */
  --sel:color-mix(in oklab,var(--accent) 20%,var(--card));            /* selected row / tonal button */
  --hover:color-mix(in oklab,var(--text) 7%,transparent);            /* hover = neutral veil, selected = accent wash */
  --track:color-mix(in oklab,var(--accent) 24%,var(--heat0));         /* ring + bar track */

  /* lines */
  --hairline:color-mix(in oklab,var(--accent) 12%,var(--line));       /* card edge, dividers (decorative) */
  --hairline-2:color-mix(in oklab,var(--accent) 30%,var(--line));     /* hero + popover edge */
  --edge:color-mix(in oklab,var(--muted) 80%,var(--accent));          /* control boundary ≥ 3:1 */

  /* ink */
  --ink-2:color-mix(in oklab,var(--muted) 80%,var(--text));           /* secondary text ≥ 4.5:1 on tinted planes */
  --accent-ink:color-mix(in oklab,var(--accent) 60%,var(--text));     /* accent as text/icon ≥ 4.5:1 */

  /* hero gradient — ring, primary button, selected day. --on-accent sits on it at ≥ 4.5:1 */
  --hero-a:color-mix(in oklab,var(--accent) 86%,var(--text));
  --hero-b:color-mix(in oklab,var(--accent) 70%,var(--text));
  --hero:linear-gradient(160deg,var(--hero-a),var(--hero-b));
  --glow:color-mix(in srgb,var(--accent) 36%,transparent);

  /* inverse (tooltip) */
  --inverse:color-mix(in oklab,var(--text) 92%,var(--accent));
  --on-inverse:var(--bg);

  /* semantic hues — palette-free constants, pulled toward --text so they pass in both modes */
  --danger:color-mix(in oklab,#d8452f 72%,var(--text));
  --danger-fill:color-mix(in oklab,#d8452f 80%,var(--text));
  --danger-soft:color-mix(in oklab,#d8452f 14%,var(--card));
  --warn:color-mix(in oklab,#d98a1f 56%,var(--text));
  --warn-soft:color-mix(in oklab,#d98a1f 16%,var(--card));
  /* mascot illustration — fixed, never themed */
  --pomeo:#e4573f; --pomeo-leaf:#4f9d5b; --pomeo-ink:#3b1d16;

  /* elevation — 4 levels, one tinted shadow ink */
  --shadow-ink:color-mix(in oklab,var(--accent) 14%,color-mix(in oklab,var(--bg) 28%,black)); /* soft on light, near-black on dark */
  --e-1:0 1px 2px color-mix(in srgb,var(--shadow-ink) 12%,transparent);
  --e-2:0 1px 2px color-mix(in srgb,var(--shadow-ink) 10%,transparent),0 8px 22px -8px color-mix(in srgb,var(--shadow-ink) 24%,transparent);
  --e-3:0 2px 6px color-mix(in srgb,var(--shadow-ink) 14%,transparent),0 16px 36px -10px color-mix(in srgb,var(--shadow-ink) 40%,transparent);
  --e-4:0 4px 12px color-mix(in srgb,var(--shadow-ink) 16%,transparent),0 32px 72px -16px color-mix(in srgb,var(--shadow-ink) 58%,transparent);
  --scrim:color-mix(in srgb,var(--shadow-ink) 58%,transparent);

  /* focus */
  --focus:var(--accent-ink);
}
```

Fixed, palette-free constants (the only literals): `black`/`transparent` inside mixes, the danger hue `#d8452f`, the warning hue `#d98a1f` (both always pulled toward `--text`, so they pass in light and dark), the three Pomeo illustration colours, and user-data colours (subject dots, colour-picker swatches).

Measured contrast (headless Chromium, resolved through a canvas, 4 palettes: default light/dark, sunset light/dark), worst case of the four:

| pair | worst | need |
|---|---|---|
| `--text` on card / chip / selected | 9.46 | 4.5 |
| `--ink-2` on card / tile / chip / selected | 4.61 (on selected, sunset dark) | 4.5 |
| `--accent-ink` on card / tile / chip / selected | 5.23 | 4.5 |
| `--on-accent` on hero gradient (lightest stop / hover stop) | 4.76 / 7.25 | 4.5 |
| `--on-accent` on danger fill | 5.61 | 4.5 |
| `--edge` (control boundary) on card / pop / tile / canvas | 4.10 | 3 |
| progress fill on card | 4.44 | 3 |
| danger / warn text on their soft backgrounds | 4.77 / 4.88 | 4.5 |
| ring + bar track on card (decorative, not a boundary) | 1.45 | — |

## Usage rules that keep it coherent

- **Radii**: 22 = cards, dialogs, sheets, multi-line tag field · 16 = popovers, toasts, nested tiles, textareas · 12 = option rows, date/time boxes, garden plots · 8 = tooltip, value bubble · 6 = kbd · pill = every single-line control (buttons, inputs, combobox, chips, switch, segmented, stepper, bars). Nothing else.
- **Elevation**: 1 = cards at rest · 2 = hero card, ring dial, slider thumb · 3 = popover, menu, toast · 4 = dialog, bottom sheet. In dark mode a shadow cannot be seen on a dark canvas, so levels 3–4 also get the lighter `--pop` plane and the `--hairline-2` edge.
- **Type**: 30 sheet title · 24 stat numbers · 20 page/dialog title · 17 primary button, sheet title · 15 large controls, phone rows · 14 body and controls · 13 chips, card labels, links · 12 meta, field labels · 11 group labels, kbd, badges. Timer 88 (60 on phone), weight 600, tabular numerals, tracking −0.035em.
- **Weights**: 400 body · 500 values in controls, nav · 600 labels, buttons · 700 numbers, selected states.
- **Colour roles**: hover is a neutral veil (`--hover`, text 7%); selected is the accent wash (`--sel`) plus weight 700 plus a check, so hover and selected never look alike and nothing depends on hue alone. Accent text is always `--accent-ink`, never raw `--accent`.
- **Boundaries**: anything you type into or toggle (input, combobox, select, switch-off, segmented, stepper, swatch, secondary button) has a 1.5 px `--edge` at ≥ 3:1. Chips and tonal buttons are identified by their text, so they use a tint, not an outline; that is what stops the sheet looking like a wireframe.
- **Leaf motif**: exactly three places: ring cap, card-title bullet, brand. Not in the sidebar, not on buttons.
- **Motion**: 120 ms colour and border · 200 ms press, hover lift, popover in (`--ease-spring`) · 320 ms switch thumb, sheet and dialog in. Opacity never overshoots; `prefers-reduced-motion` collapses all of it.

## Components — look and behaviour

- **Timer card (hero)**: the only card with a radial accent wash and elevation 2. A 324 px ring: 14 px tinted track that is visible in both modes, a raised dial inside it, gradient progress with round ends, and a leaf cap that sits at 12 o'clock when idle and rides the end of the arc while running. Inside the ring: phase with leaf + "round 1 of 4", 88 px numerals, preset name, round markers (current = wide pill, others hollow, so shape carries it). Start is a 56 px gradient pill with a soft accent glow; Reset / Skip are 48 px outlined pills; quick-start chips below. Pomeo sits top-left with a one-line speech chip.
- **Session card**: one grid, `1fr 1fr 48px`. Row 1: task field (cols 1–2) with "+ Add subtasks" as an inline action inside the pill, colour swatch (col 3). Row 2: tag chip field (col 1), preset combobox (cols 2–3). All four controls are 44 px high and share left and right edges.
- **Preset combobox**: closed = pill showing colour dot, name, rhythm chips (`25` focus chip in accent wash, `/ 5 × 4` neutral), up/down chevrons. Open = popover (16 radius, elevation 3) with a search field, uppercase 11 px section labels (Recent / Favourites / All presets), 40 px rows (dot, name, check when selected, rhythm chips, ★ toggle that fills when on and pops with the spring), footer with "New preset" and "Edit presets". Type to filter, ↑↓ to move, Enter to pick, ★ is its own tab stop. On the phone the same list is a bottom sheet with a drag handle, 52 px rows and 44 px stars.
- **Select**: same trigger and popover as the combobox without search; selected row has the accent wash, weight 700 and a trailing check.
- **Date picker**: trigger pill with calendar icon → popover with quick picks on the left (Today / Tomorrow / This weekend / Next week / In 2 weeks, each with its resolved date) and a Monday-first month grid on the right. Today = ring + accent-ink bold, selected = gradient disc, a dot under a day means it has tasks, out-of-month days are regular weight. Footer: Today, Clear, Done.
- **Time picker**: four chips first (Morning / Afternoon / Evening / Night, each with icon and resolved time; selected chip gets an inset ring), then exact time (two 48 px boxes + AM/PM segmented), then an "All day" switch that disables the rows above.
- **Number stepper**: 44 px pill, round − / + buttons inside, tabular value with unit; hold to repeat.
- **Switch**: 46×28. Off = well with edge and a grey thumb; on = accent fill, thumb slides with overshoot and a check mark appears in the track (state is not colour-only); disabled = 42 % opacity.
- **Slider**: thin 3:1 rail, thicker gradient fill, 24 px thumb with accent ring, inverse value bubble while dragging or focused.
- **Colour picker**: 6 × 2 swatches in 36 px hit areas (44 on phone); selected = outer ring + check; custom row with dashed "+" swatch and hex field.
- **Tag input**: 22-radius field that wraps; chips with optional subject dot and a 20 px remove button; suggestion popover highlights the typed prefix in bold, shows usage counts and ends with "Create “Ch”  Enter".
- **Buttons**: primary (gradient, glow), secondary (outlined), tonal (accent wash, used for in-card actions like Harvest / Undo / Done), ghost (accent-ink text), danger (red fill, always with icon + verb), icon-only (40 px tonal circle). Hover lifts 1 px and deepens; press scales to .96 with spring; disabled 42 % opacity and no shadow; loading swaps the icon for a spinner and changes the label ("Saving…").
- **Segmented control**: well + edge container, selected segment is an accent-wash pill with weight 700 and elevation 1; two sizes (36 / 30).
- **Dialog**: 22 radius, `--pop` plane, elevation 4 over a tinted scrim; title 20/700, close button, two-column form grid with 16/12 gaps, actions right-aligned (ghost Cancel, primary Save). The checklist is real rows, not a textarea.
- **Confirm (destructive)**: alert icon in a danger-soft circle, plain-language title, the safe action is the outlined "Keep my data", the destructive one names what happens ("Erase everything") and carries a bin icon.
- **Toasts**: 16 radius, elevation 3, round icon badge (check / info / alert), bold title + one muted line, one action (tonal Undo, outlined Retry) or a close button. Stack with 12 px gaps, newest on top.
- **Tooltip / menu**: tooltip is the inverse plane with 8 radius and optional kbd; menu rows are 40 px with leading icon, trailing kbd, a separator before the red Delete.
- **Empty state**: Pomeo (inline SVG, 76 px) on a tinted tile, one calm line, one primary and one secondary action.
- **Progress**: ring with leaf cap; bars 8 px (6 px thin) with pill ends on the tinted track. Skeletons use the same track tint with a slow shimmer.
- **Focus**: 2.5 px `--accent-ink` outline with 2 px offset on every interactive element; inputs additionally show the accent border + soft halo while active.
- **Phone**: 56 px top bar, hero timer card, six-tab bottom bar (active tab = accent-wash pill behind the icon + bold label), bottom sheet sits above the bar with the content dimmed.

## What changes most against v1.20

- Native `<select>`, date and time inputs are gone; one trigger pill + one popover pattern replaces them all.
- 26 radii → 6, 50 shadows → 4 (one tinted shadow ink), 27 font sizes → 9 + timer.
- Input borders and the ring track are now clearly visible (edge ≥ 4.1:1 on every plane; track ≥ 1.45:1 against the card and 14 px wide); text on the accent is 4.76:1 or better instead of 2.5:1.
- Cards stop having equal weight: the timer card is the only gradient-washed, elevation-2 surface and holds the only gradient button; Today, Garden and Tip are flat tinted cards.
- The session form goes from three misaligned rows (field + swatch, link, two fields + pencil button) to one grid; "Add subtasks" and "Edit presets" move inside the controls they belong to.
- Uppercase tracked card titles become sentence-case 13/600 labels with a leaf bullet; glass blur, the photographic background gradient and emoji icons are replaced by flat accent-tinted planes and 1.75-stroke SVG icons.
- The Today card turns five loose text lines into two stat tiles (streak, daily goal ring) plus three tappable rows with icons and a clear action.

## Problems found in the self-critique round and fixed

1. A broad `.ring-wrap svg` rule blew the nested leaf glyphs up to full size and covered the numerals → scoped to the ring element only.
2. Daily-goal tile wrapped as "1h 15m of / 2h" and showed a ring and a bar for the same number → one line value, "of 2h daily goal" as the sub line, bar removed; both tiles now share a footer line.
3. "Focus on Chemistry" inherited the muted row colour and did not read as an action → tonal button.
4. Hover and selected rows looked almost the same in light mode → hover is now a neutral veil, selected keeps the accent wash + check + weight 700.
5. Colour picker (8 swatches + hex field) overflowed its card → 6 × 2 grid, and inputs may now always shrink inside a flex row.
6. Date-picker quick picks wrapped ("This weekend / Sat 21") → wider column, no wrapping.
7. Shadows were invisible in dark and the foundations strip wrapped with a mis-sized 22-radius sample → shadow ink is now derived from `--bg` (soft on light, near-black on dark), one swatch size, no wrapping.
8. Component sheet had a half-empty column and an orphan card on the last row → menu/tooltip moved under the select, empty state moved beside the dialog.
9. On the phone the sheet covered the numerals → shorter sheet (two sections), the whole ring stays visible above it.

## Risks when this meets 60 screens and 24 palettes

- **Polarity assumption.** `--hero-a/b`, `--accent-ink`, danger and warn all gain contrast by mixing toward `--text`. That works when `--on-accent` has the opposite polarity to `--text` (true for the four palettes tested). A light palette with a pale accent and a dark `--on-accent` (yellow, mint, pastel pink) would lose contrast on primary buttons. Needs a per-palette automated check (the canvas script used here takes seconds) and possibly one optional flag per palette.
- **Accent near red.** In sunset, rose or tomato palettes the accent, the danger fill and Pomeo are neighbours. Danger is always icon + verb, but the destructive button will not "pop" by hue there.
- **Tint everywhere can turn muddy.** With very saturated accents (magenta, electric blue) 4–12 % tint on six planes may look coloured rather than warm, and low-chroma palettes (graphite, mono) lose the plane separation that the tint provides. Expect to cap the mix percentages or tune them once across all 24 palettes.
- **Dark elevation.** Shadows do almost nothing on dark canvases; separation depends on `--pop` being lighter than `--card` and on `--hairline-2`. Palettes whose `--surface` is very close to `--bg` will need testing with stacked popovers and dialogs.
- **Pills cost width.** Pill inputs and 22-radius cards need more horizontal padding than v1.20's 12-radius boxes. Dense screens (Settings with 60 rows, leaderboard rows, clan tables, calendar month cells) will need a compact variant (40 px rows, 16-radius groups) or they grow noticeably taller.
- **3:1 edges on every field** look right on a form, but a settings page with twenty switches and selects may feel heavy; grouping rows into tiles helps, and it should be reviewed on the real page.
- **Browser support.** Everything relies on `color-mix(in oklab)` (Chrome 111, Safari 16.2, Firefox 113, all 2023). Older Android WebViews would get no derived colours at all; a small `@supports not` fallback block mapping the derived tokens to the raw nine is needed.
- **Performance.** Nested `color-mix()` tokens resolve per element; fine in the prototype, but with 1.9 MB of markup it is worth resolving the heavy ones once on `:root` (already the case) and avoiding per-row gradients in long lists. No `backdrop-filter` is used, which is cheaper than v1.20's glass.
- **Mascot dosage.** The prototype shows Pomeo three times at most per screen. Applied carelessly across quests, clans and the shop, plus the leaf bullets, the look can slide toward childish; the three-places rule for the leaf and "Pomeo only when he speaks" need to be enforced in review.
- **Existing features not drawn here.** The "ripening ring" (green → tomato red), time-of-day sky, rain mood and festive decorations all add colours outside the nine variables; each needs a decision on how it coexists with a gradient ring and tinted planes.
- **Idle hero.** At 25:00 the ring is an empty track with a bud; the gradient only appears once a session runs. The running, paused, break and overtime states still have to be drawn.
