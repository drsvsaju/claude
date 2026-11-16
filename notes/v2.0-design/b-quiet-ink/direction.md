# Direction B — Quiet ink

Editorial calm for Pomodorolist v2.0. Files in this folder: `proto.html` (prototype, `?view=timer|components|phone&mode=dark|light&skin=default|sunset`), `shoot.mjs` (renders the seven JPEGs), and the JPEGs themselves.

## Rationale

1. A student looks at this screen for six to ten hours a day, so the interface should read like a well-set page: the time, then the one action, then everything else.
2. Hierarchy comes from type and line weight instead of glow and shadow: large tabular numerals, small uppercase section labels, three border weights.
3. The accent is ink, not decoration: it marks the primary action, progress, and whatever is currently selected. Everything else is neutral, so the accent always means something.
4. Every boundary is visible. Controls and the ring track sit at 3:1 or better against their background in all four test palettes; nothing relies on a faint line.
5. Personality stays, concentrated: Pomeo is the one spot of colour on the page, and the garden becomes botanical line drawings in the same ink as the rest.

## Token block (final, copied from `proto.html`)

A palette supplies only `--bg --surface --text --muted --line --accent --accent-soft --heat0 --on-accent`. Everything below is derived from them.

```css
/* ───────── TOKENS — Quiet ink ───────── */
:root{
  /* type */
  --font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --t-11:11px; --t-12:12px; --t-13:13px; --t-14:14px; --t-15:15px; --t-17:17px; --t-20:20px; --t-24:24px; --t-30:30px;
  --t-timer:84px; --t-timer-sm:56px;
  --w-4:400; --w-5:500; --w-6:600; --w-7:700;
  --lh-1:1.15; --lh-2:1.35; --lh-3:1.5;
  --caps:.08em;                       /* tracking of uppercase section labels */
  /* space */
  --s-2:2px; --s-4:4px; --s-6:6px; --s-8:8px; --s-12:12px; --s-16:16px; --s-20:20px; --s-24:24px; --s-32:32px; --s-40:40px;
  /* radii: 6 chips & rows · 8 controls · 12 cards & popovers · 16 dialogs · 22 sheets */
  --r-6:6px; --r-8:8px; --r-12:12px; --r-16:16px; --r-22:22px; --r-pill:999px;
  /* control sizes */
  --h-sm:32px; --h-md:40px; --h-lg:48px; --tap:44px; --bw:1px;
  /* motion */
  --m-1:120ms; --m-2:200ms; --m-3:320ms; --ease:cubic-bezier(.2,0,0,1);

  /* colour — every value derived from the nine palette variables */
  --ink:var(--text);                                               /* primary text */
  --ink-2:color-mix(in srgb,var(--muted) 88%,var(--text));          /* secondary text, >= 4.5:1 on bg, surface and hover wash */
  --ink-3:color-mix(in srgb,var(--muted) 62%,var(--surface));       /* disabled glyphs only */
  --rule:color-mix(in srgb,var(--muted) 82%,var(--surface));        /* control boundaries, ring track: >= 3:1 */
  --hairline:color-mix(in srgb,var(--muted) 40%,var(--surface));    /* card outlines, dividers: ~1.7:1 */
  --wash:color-mix(in srgb,var(--text) 5%,transparent);             /* hover */
  --wash-2:color-mix(in srgb,var(--text) 10%,transparent);          /* pressed, skeleton */
  --sunken:var(--heat0);                                            /* keycaps, wells */
  --accent-fill:color-mix(in srgb,var(--accent) 87%,var(--text));   /* primary button, progress, selected day: on-accent >= 4.6:1 */
  --accent-fill-2:color-mix(in srgb,var(--accent) 72%,var(--text)); /* hover of the above */
  --accent-ink:color-mix(in srgb,var(--accent) 68%,var(--text));    /* accent as text/outline: >= 4.5:1 incl. on tint */
  --accent-tint:var(--accent-soft);                                 /* selected background */
  --ink-fill:var(--text); --on-ink:var(--surface);                  /* inverse: badge, tooltip, toast, value bubble */
  --danger-seed:#d3453e;                                            /* fallback only, replaced below */
  --danger-fill:color-mix(in srgb,var(--danger-seed) 82%,var(--text));
  --danger-ink:color-mix(in srgb,var(--danger-seed) 72%,var(--text));
  --danger-tint:color-mix(in srgb,var(--danger-seed) 13%,transparent);
  --scrim:color-mix(in srgb,var(--bg) 70%,transparent);
  --focus:var(--accent-ink);

  /* elevation — four levels, flat by default */
  --e-0:none;                                   /* cards: outline only */
  --e-1:0 1px 2px rgb(0 0 0/.08);               /* thumbs */
  --e-2:0 8px 20px -8px rgb(0 0 0/.18);         /* popovers, menus, toasts */
  --e-3:0 24px 56px -20px rgb(0 0 0/.32);       /* dialogs, sheets */

  /* constants that are content, not theme: mascot + user-chosen data colours */
  --pomeo:#e2503c; --pomeo-leaf:#4f9a55; --pomeo-face:#3a1712;
}
@supports (color:oklch(from red l c h)){
  :root{--danger-seed:oklch(from var(--accent) l .18 27)}          /* accent's lightness, red hue */
}
```

Measured contrast of the derived colours (sRGB mixes, computed from the palette values):

| Palette | ink-2 on bg | rule on bg | rule on surface | hairline on surface | on-accent on accent-fill | accent-ink on tinted bg | accent-fill on surface |
|---|---|---|---|---|---|---|---|
| default light | 5.83 | 3.49 | 3.78 | 1.77 | 4.65 | 4.93 | 4.65 |
| default dark | 6.92 | 4.59 | 4.21 | 1.99 | 8.09 | 7.19 | 7.40 |
| sunset light | 5.23 | 3.23 | 3.41 | 1.70 | 4.67 | 4.74 | 4.51 |
| sunset dark | 6.60 | 4.37 | 4.11 | 1.95 | 8.12 | 7.39 | 7.63 |

How the derivation works:

- **Neutrals** are mixes of `--muted` into `--surface` (`--rule` 82 %, `--hairline` 40 %). Mixing from `--muted` rather than `--text` gives nearly the same contrast in light and dark.
- **Accent** is mixed toward `--text` (`--accent-fill` 87 %, `--accent-ink` 68 %). `--text` is always the opposite polarity of `--on-accent`, so the same rule raises contrast in both modes without knowing which mode it is in.
- **Danger** takes the accent's lightness and swaps the hue to red with `oklch(from var(--accent) l .18 27)`, behind `@supports`, with one fixed fallback red for older engines.
- **Not derived, on purpose:** black at low alpha for the three shadows; Pomeo's red, green and face colour; the colours users pick for presets and tags. These are content, not theme. `--line` is unused (too faint to be a boundary); `--heat0` is used for keycaps and wells.

## Components — look and behaviour

- **Cards.** Three weights, no shadow. Lead card (Timer): surface fill, 3:1 `--rule` outline. Paper card (Session, dialogs' inner cards): surface fill, hairline. Quiet card (Today, Garden, Tip): no fill, hairline. Radius 12, padding 24.
- **Timer.** A 320 px dial: 1.5 px track at 3:1, 3.5 px accent progress line with a knob at its end, minute ticks like a watch bezel. Inside it, in reading order: phase label (accent ink, uppercase), 84 px tabular numerals, preset name, round dots with "Round 1 of 4" in words. Start is the only filled button on the screen; Reset and Skip are outlined; quick-start chips are hairline. Pomeo sits top left with one line of speech.
- **Session form.** One 12-column grid, all controls 40 px high with labels above: task (12), subject/tag (4), preset (5), colour (3). "Add subtasks" is a link on the task label row.
- **Preset combobox.** Closed: colour dot, name, one rhythm chip with two cells (`25 / 5 | × 4`), up/down chevron. Open: popover (radius 12, 3:1 outline, the only shadow level used on popovers) with search, sections Recent / Favourites / All presets as uppercase labels, 40 px rows (44–48 px in the phone sheet). Hover is a 5 % ink wash; selected is accent tint plus a check mark plus bold name. The star is outline when off and solid ink when on. Footer: New preset, Edit presets. Arrow keys move, Enter selects, typing filters.
- **Select.** Same trigger and popover as the combobox, plain rows, check mark on the selected row.
- **Date picker.** Quick picks on the left (Today, Tomorrow, This weekend, Next week, In 2 weeks, each with its resolved date), month grid on the right with 36 px cells. Today is outlined and has a dot; the selected day is filled accent; other-month days are dimmed. Footer: Clear and Today.
- **Time picker.** "All day" switch first, then four chips (Morning, Afternoon, Evening, Night, each showing its time), then exact hour and minute fields with an AM/PM segmented control. Choosing a chip fills the exact fields.
- **Stepper.** One outlined box with three cells: minus, value, plus. Hold to repeat; the value is directly editable.
- **Switch.** Off: outlined track, grey thumb left, small ring mark on the right. On: accent track, thumb right, bar mark on the left. State never depends on colour alone. Disabled is 40 % opacity.
- **Slider.** 2 px rule track, 4 px accent fill, 20 px thumb with accent outline, inverse value bubble while dragging or focused.
- **Colour picker.** 32 px swatches with a 1 px inner edge; the selected one gets an ink ring, a check badge and its name in the label row. Last cell is a dashed "custom" tile; hex field below.
- **Tag input.** Chips live inside the field (radius 6, colour dot, remove button). Suggestions open below with the match in bold, usage count on the right, and "Create …" as the last row.
- **Buttons.** Primary (accent fill), secondary (outlined), ghost (no outline), danger (red text, outlined; solid red only inside a destructive confirm), icon-only (40 px square). Hover darkens the outline to full ink or washes the fill; disabled keeps the variant's shape in grey; loading swaps the icon for a spinner and changes the label.
- **Segmented control.** Outlined container; the selected segment is accent tint with an inset accent outline and bold label.
- **Dialogs.** Radius 16, 3:1 outline, the single large shadow, hairline above the footer, primary action bottom right. Destructive confirms put a safe default ("Keep my data") first and a solid red action with an icon and a verb.
- **Toasts, tooltip, badges, value bubble.** All inverse: `--text` as the fill, `--surface` as the text. Toast type is carried by icon and wording; error toasts stay until dismissed.
- **Menu.** Popover with 36 px rows, icons in secondary ink, keycaps right-aligned, destructive item last and separated.
- **Empty state.** Pomeo at 72 px, a 17 px heading, one sentence, one primary action.
- **Progress.** Ring and bar share the dial's language: thin neutral track, accent line. Skeletons are 10 % ink blocks that pulse in opacity.
- **Focus ring.** 2 px `--accent-ink`, 2 px offset, on every control.
- **Phone.** 52 px app bar, 60 px bottom bar with labels (selected tab: accent ink, bold, top marker). The preset picker is a bottom sheet (radius 22, drag handle, 48 px rows, 44 px star and close targets) docked above the bottom bar, which stays reachable.

## What changes most against v1.20

- Gradient backdrop, glass cards, glows and the 50 shadows go; flat `--bg` with three shadows left, used only on floating layers.
- 26 radii become five in use (6, 8, 12, 16, 22) plus pill for switches and badges. Pill buttons and chips become 8 px rectangles.
- Native `<select>`, date and time inputs are replaced by the combobox, select, date and time popovers above.
- Borders move from about 1.3:1 to 3:1 on controls and about 1.8:1 on cards; the ring track becomes a real line.
- Text on the accent passes AA in every palette because the fill is mixed, not taken raw.
- Red notification dots and the orange streak block become ink numerals and plain figures; the accent no longer competes with five other colours.
- The Timer leads by weight: the only strong outline, the largest numerals, the only filled button.
- Default preset names lose their numbers in the picker ("Classic", "Deep Work"); the rhythm chip carries them.

## Problems found in the self-critique and fixed

1. "1h 15m" was spaced as four separate tokens; units now hug their numbers.
2. The Colour field truncated to "P…"; the session grid is now 4 / 5 / 3.
3. The right rail ended about 100 px above the left column; rail padding and row height were raised and the columns now end on the same line.
4. The progress bar under the two stats did not say which one it measured; its caption now names the daily goal.
5. Sidebar counts were boxed and looked like buttons; they are plain numerals, and "Live" is a dot plus the word.
6. Reset, Skip and the quick-start chips had the same outline weight; quick-start chips are now hairline, giving three clear levels under the dial.
7. "This weekend" wrapped to two lines in the date picker; the quick-pick column is wider and does not wrap.
8. The error toast wrapped while the others did not; toasts are wider and single-line.
9. Disabled primary and disabled secondary were identical grey slabs; disabled now keeps each variant's shape.
10. Two separate rhythm chips looked fussy; they are one chip with two cells.
11. Colour swatches left a ragged right margin; the grid now spans the row.
12. The primary button in dark mode was paler than needed; the accent mix was reduced to the least that still passes AA in light palettes.
13. "Synced" floated between the logo and the content; it now starts on the content column's left edge.
14. The phone scrim stopped below the app bar; it now covers it.

## Risks across 60 screens and 24 palettes

- **Palettes with a pale or yellow accent.** The mixes were tuned on two palettes. An accent much lighter than these in light mode may need more than 13 % text to reach 4.5:1 with white, and will look muddy when it gets it. Every palette needs an automated contrast check on `--accent-fill`, `--accent-ink` and `--rule`; a few may need their `--on-accent` flipped.
- **Palettes where `--muted` is weak.** All neutrals hang off `--muted`. A palette whose muted is under about 4.5:1 on its surface drags `--rule` below 3:1.
- **Danger next to a red or orange accent.** In sunset the derived danger red sits close to the accent. Destructive actions are always marked by icon, wording and position as well, but the colour alone will not separate them there.
- **Flat means dense screens can turn into a grid of boxes.** Stats, shop, leaderboard and clan have many cards. They will need the three card weights applied with discipline, and probably ruled lists instead of nested cards.
- **Reward moments may feel underplayed.** Quests, harvests, rank-ups and streak milestones currently lean on colour and glow. This direction needs a deliberate, separate "celebration" treatment (motion and Pomeo, not more colour) or those screens will feel flat.
- **Cosmetics.** Auras, frames, banners and themed stamps are user-owned colour. They will stand out more against a neutral interface, which is good for the owner but needs testing on profile and leaderboard rows.
- **Inverse toasts in dark mode are bright.** They are legible and brief, but a persistent error toast is the lightest thing on a dark screen.
- **Relative colour syntax** for danger needs a recent browser; older ones get the fixed fallback red, which is not tuned to the palette's lightness.
- **Renamed default presets** and the rhythm chip assume preset names are short. Long user-made names will truncate before the chip does; the row needs a tested truncation order.
- **The docked bottom sheet** leaves the tab bar live while a picker is open. If that causes mis-taps in testing, the sheet should cover the bar like a normal modal.
- **System font.** The prototype was rendered with Inter as the system font. On Android (Roboto) and Windows (Segoe UI) the 84 px numerals are a different width; the dial needs checking on each.
- **Running `shoot.mjs`.** The folder has a `node_modules` link to the machine's Playwright install so the plain `import` resolves; it is ignored by git and will need recreating elsewhere.
