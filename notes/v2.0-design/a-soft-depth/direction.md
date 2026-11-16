# Direction A — Soft depth

Pomodorolist 2.0 visual direction, drafted as a working prototype.
Files in this folder: `proto.html` (the prototype), `shoot.mjs` (screenshots), seven JPEGs, this note.
Open `proto.html?view=timer|components|phone&mode=dark|light&skin=default|sunset`.

## Rationale

1. Depth replaces borders. Five stacked layers (frame, stage, card, hero card, popover) are told apart by tone, a 1px inner top highlight and a soft shadow, so nothing needs an outline to be seen.
2. One thing leads each view. The Timer card is the only hero surface (radius 22, raised, lit by an accent wash) and Start is the only filled accent control. Everything else is neutral.
3. Controls are tactile and of two kinds. You type or choose in a well (pressed in, with a crisp 3:1 lip). You press a pad (raised, with a highlight on top). The difference is shape and light, never colour.
4. The accent is light, not paint. It shows up as the ring's glow, thin progress lines, the focus ring and the selected day. That keeps long study sessions calm and makes every one of the 24 palettes feel deliberate.
5. It is an evolution, not a reskin from another planet. Rounded cards, the sidebar, Pomeo and the garden stay where students expect them; the gain is order, contrast and one coherent control set.

## Final token block

Copied from `proto.html`. A palette supplies only the nine variables in section 1. Section 2 holds numbers that differ between light and dark (never colours). Everything else is derived.

```css
:root{
  /* 1 ─ Palette contract: the ONLY values a theme supplies (overwritten on <html>) */
  --bg:#121414; --surface:#1a1d1d; --text:#e7e9e8; --muted:#8e9693; --line:#2a2f2e;
  --accent:#4fb3a5; --accent-soft:rgba(79,179,165,.16); --heat0:#232827; --on-accent:#0c1513;

  /* 2 ─ Mode dials: plain numbers, no colours. Light values here; dark overrides below. */
  --k-frame:5%;    /* how far the app frame sinks below --bg */
  --k-lift:0%;     /* how much each raised layer brightens (dark only) */
  --k-raise:6%;    /* neutral button fill = its layer + this much --text */
  --k-edge:50%;    /* field boundary = --surface + this much --text  (≥ 3:1) */
  --k-shadow:7%;   /* base shadow alpha; levels multiply it */
  --k-hi:85%;      /* 1px inner top highlight alpha */
  --k-hair:7%;     /* hairline that sharpens a surface edge */
  --k-glow:26%;    /* accent glow alpha (ring, hero button) */
  --k-lamp:6%;     /* accent wash behind the timer */
  --k-scrim:34%;   /* overlay behind dialogs and sheets */
  --k-knob:100%;   /* slider thumb brightness */

  /* 3 ─ Scales */
  --sp-2:2px; --sp-4:4px; --sp-6:6px; --sp-8:8px; --sp-12:12px; --sp-16:16px; --sp-20:20px; --sp-24:24px; --sp-32:32px; --sp-40:40px;
  --r-6:6px; --r-8:8px; --r-12:12px; --r-16:16px; --r-22:22px; --r-pill:999px;
  --fs-11:11px; --fs-12:12px; --fs-13:13px; --fs-14:14px; --fs-15:15px; --fs-17:17px; --fs-20:20px; --fs-24:24px; --fs-30:30px;
  --fs-timer:76px; --fs-timer-phone:60px;
  --fw-400:400; --fw-500:500; --fw-600:600; --fw-700:700;
  --t-120:120ms; --t-200:200ms; --t-320:320ms; --ease:cubic-bezier(.2,.8,.2,1);
  --h-sm:32px; --h-md:40px; --h-lg:52px; --h-tap:44px;
  --font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans",sans-serif;

  /* 4 ─ Layers (deepest → nearest). Every value is mixed from the palette. */
  --frame:color-mix(in oklab, var(--bg), black var(--k-frame));                      /* L0 header + sidebar */
  --stage:var(--bg);                                                                  /* L1 page */
  --card-quiet:color-mix(in oklab, var(--surface) 55%, var(--bg));                    /* L1½ supporting cards */
  --card:var(--surface);                                                              /* L2 cards */
  --card-hi:color-mix(in oklab, var(--surface), var(--text) var(--k-lift));           /* L3 hero card */
  --pop:color-mix(in oklab, var(--surface), var(--text) calc(var(--k-lift) * 2));     /* L4 popovers, dialogs, sheets */
  --well:color-mix(in oklab, var(--bg) 70%, var(--surface));                          /* fields: pressed into the card */
  --edge:color-mix(in oklab, var(--text) var(--k-edge), var(--surface));              /* field / switch boundary, ≥ 3:1 */
  --track:color-mix(in oklab, var(--text) 14%, var(--surface));                       /* empty progress track */
  --hair:color-mix(in srgb, var(--text) var(--k-hair), transparent);
  --hover:color-mix(in srgb, var(--text) 7%, transparent);
  --press:color-mix(in srgb, var(--text) 12%, transparent);
  --divider:var(--line);
  --scrim:color-mix(in srgb, black var(--k-scrim), transparent);

  /* 5 ─ Ink */
  --ink:var(--text);
  --ink-2:color-mix(in oklab, var(--muted) 80%, var(--text));                         /* secondary text, ≥ 4.5:1 on every layer */
  --inverse:var(--surface);

  /* 6 ─ Accent: fills move AWAY from --on-accent, text moves TOWARD --text → AA on any palette */
  --away:oklch(from var(--on-accent) clamp(0, (0.6 - l) * 999, 1) 0 0);               /* black or white, opposite of --on-accent */
  --accent-fill:color-mix(in oklab, var(--accent) 90%, var(--away));
  --accent-fill-hover:color-mix(in oklab, var(--accent) 78%, var(--away));
  --accent-ink:color-mix(in oklab, var(--accent) 72%, var(--text));
  --glow:color-mix(in srgb, var(--accent) var(--k-glow), transparent);
  --focus:var(--accent-ink);
  --heat1:color-mix(in oklab, var(--accent) 28%, var(--heat0));
  --heat2:color-mix(in oklab, var(--accent) 52%, var(--heat0));
  --heat3:color-mix(in oklab, var(--accent) 76%, var(--heat0));
  --heat4:var(--accent-fill);

  /* 7 ─ Status hues: the accent's own lightness and chroma, turned to a fixed hue */
  --danger:oklch(from var(--accent) l max(c, 0.19) 27);
  --warn:oklch(from var(--accent) l max(c, 0.12) 75);
  --ok:oklch(from var(--accent) l max(c, 0.12) 150);
  --danger-fill:color-mix(in oklab, var(--danger) 90%, var(--away));
  --danger-ink:color-mix(in oklab, var(--danger) 62%, var(--text));
  --danger-soft:color-mix(in srgb, var(--danger) 15%, transparent);
  --warn-ink:color-mix(in oklab, var(--warn) 62%, var(--text));
  --warn-soft:color-mix(in srgb, var(--warn) 16%, transparent);
  --ok-ink:color-mix(in oklab, var(--ok) 62%, var(--text));
  --ok-soft:color-mix(in srgb, var(--ok) 16%, transparent);

  /* 8 ─ Elevation: four levels. Each = inner highlight + hairline + two shadows. */
  --sh:color-mix(in oklab, var(--bg) 18%, black);
  --hi:inset 0 1px 0 color-mix(in srgb, white var(--k-hi), transparent);
  --rim:0 0 0 1px var(--hair);
  --e1:var(--hi), var(--rim), 0 1px 2px color-mix(in srgb, var(--sh) var(--k-shadow), transparent), 0 3px 10px -2px color-mix(in srgb, var(--sh) var(--k-shadow), transparent);
  --e2:var(--hi), var(--rim), 0 2px 4px color-mix(in srgb, var(--sh) var(--k-shadow), transparent), 0 14px 32px -8px color-mix(in srgb, var(--sh) calc(var(--k-shadow) * 1.8), transparent);
  --e3:var(--hi), var(--rim), 0 4px 8px color-mix(in srgb, var(--sh) var(--k-shadow), transparent), 0 20px 44px -10px color-mix(in srgb, var(--sh) calc(var(--k-shadow) * 2.4), transparent);
  --e4:var(--hi), var(--rim), 0 8px 16px color-mix(in srgb, var(--sh) var(--k-shadow), transparent), 0 36px 80px -16px color-mix(in srgb, var(--sh) calc(var(--k-shadow) * 3.2), transparent);
  --inset:inset 0 0 0 1px var(--edge), inset 0 2px 3px -1px color-mix(in srgb, var(--sh) calc(var(--k-shadow) * 1.6), transparent);
}
:root[data-mode="dark"]{
  --k-frame:30%; --k-lift:3.5%; --k-raise:8%; --k-edge:46%; --k-shadow:26%; --k-hi:6%; --k-hair:5%;
  --k-glow:52%; --k-lamp:9%; --k-scrim:60%; --k-knob:86%;
}
/* Older engines without relative colour: fixed fallbacks, still keyed to the mode only. */
@supports not (color: oklch(from red l c h)){
  :root{ --away:#000; --danger:#c9463f; --warn:#b07a14; --ok:#3d9a5b; }
  :root[data-mode="dark"]{ --away:#fff; --danger:#f0766e; --warn:#d6a046; --ok:#6cc48a; }
}
```

Measured in Chromium on all four test themes (default and sunset, light and dark):

| Pair | Lowest ratio | Needed |
|---|---|---|
| `--on-accent` on `--accent-fill` (Start, Save) | 4.99 | 4.5 |
| `--on-accent` on `--danger-fill` | 5.17 | 4.5 |
| `--accent-ink` on card / stage / frame / popover | 4.65 | 4.5 |
| `--accent-ink` on `--accent-soft` (selected rows, active chips) | 4.78 | 4.5 |
| `--ink-2` on frame / well / popover / hover row | 4.87 | 4.5 |
| status inks (danger, warn, ok) on their soft tiles and on every layer | 4.94 | 4.5 |
| `--edge` (field, switch, slider boundary) against card / hero / popover / well | 3.03 | 3 |
| `--accent-fill` progress line against its card | 4.84 | 3 |

For comparison, v1.20 has white on the accent at 2.5:1 in dark, and the palette's `--line` on `--surface` is only about 1.3:1, which is why borders drawn with it almost vanish.

## How each component looks and behaves

**Layers.** Frame (header and sidebar) is the deepest tone. The stage is a sheet with a 22px top-left corner that sits on the frame. Cards sit on the stage. The hero card and popovers are one and two steps brighter in dark; in light they stay white and grow a larger shadow instead. Supporting cards (Today, garden, tip) use a quieter half-step surface with no shadow, which is what makes the Timer lead.

**Buttons.** Pads. Neutral buttons are the layer they sit on plus 6–8% text, with a top highlight and a 1px drop. Hover brightens and lifts 1px, press sinks. Primary is `--accent-fill` with `--on-accent` text and a soft accent glow underneath; one per view. Ghost has no fill until hovered. Danger is the derived red, always with an icon and a verb. Disabled drops shadow and fill; loading swaps the icon for a spinner and changes the label ("Saving…"). Sizes 32 / 40 / 52 with radius 8 / 12 / 16, so radius always follows height.

**Text fields, selects, comboboxes.** Wells: a fill slightly darker than the card, a 1px inner lip at 3:1 and a soft inner top shadow. Hover darkens the lip. Open or focused swaps the lip for a 1.5px accent-ink ring. Keyboard focus adds the outer focus ring on top.

**Preset combobox.** Closed: colour dot, name, rhythm chips (`25 / 5 × 4`), up-down chevrons. Open: a popover with a search box, then Recent, Favourites, All presets. Each row has the dot, the name (and the preset name as a second line when the row is a subject), rhythm chips and a star toggle that is outlined when off and filled when on. The selected row shows a check and a soft accent background; hover is a neutral wash. The footer holds "New preset" and "Edit presets". On the phone the same list is a bottom sheet with a drag handle, 56px rows and 44px stars.

**Select.** The same trigger and popover with plain rows; the selected row carries a check on the right.

**Date picker.** Popover in two parts. Left: quick picks (Today, Tomorrow, This weekend, Next week, In 2 weeks, No date), each with the date it resolves to. Right: month title, a Today button, month arrows, a Monday-first grid of 36px days. Today is an outline plus a dot. The selected day is filled. Days that already have a task show a small dot. Out-of-month days are dimmed but readable.

**Time picker.** An "All day" switch first (it hides the rest when on). Four large chips with an icon, a word and the time they mean (Morning 8:00 AM, Afternoon 1:00 PM, Evening 6:00 PM, Night 9:00 PM); the active one gets an accent outline and accent text. Below: exact hour and minute wells and an AM/PM segmented control, then Clear and Done.

**Number stepper.** A well holding two small pads and a tabular value; the unit sits outside as a hint.

**Switch.** 44 × 26. Off: neutral track at 3:1 and a plain knob. On: accent track, the knob slides and shows a check, so state is never colour alone. Disabled fades to 42% and explains why in the row's hint.

**Slider.** A 4px line: neutral for the rest, accent for the filled part, a 22px raised thumb with a 3:1 rim. The value bubble reuses the tooltip.

**Segmented control.** A well with a raised pad on the chosen segment. The chosen segment is neutral and bold, not accent, so the accent stays reserved.

**Colour picker.** Sixteen round swatches (the chosen one gets a ring and a check), a hue line, a hex field and an eyedropper.

**Tag input.** A well that holds pill tags with their own remove buttons and the text being typed. Suggestions open below with the matched letters in bold, a usage count, and a "Create tag" row.

**Dialog.** Popover surface, radius 22, the largest shadow, over a scrim. Title and close on one line, a two-column form built from the controls above, a keyboard hint on the left of the footer and Cancel / Save on the right. The first field takes focus.

**Confirm (destructive).** A danger tile with a bin, a question that names the thing, one sentence on the consequence, then "Keep task" and "Delete task".

**Toasts.** Popover surface, radius 16. A tinted icon tile and a bold title carry the type (success, info, error); the body is one line; actions (Undo, Retry) are small pads. The Undo toast shows its remaining time as a 2px accent line.

**Tooltip and menu.** The tooltip is inverted (text colour as background) with an optional key hint. The menu is a popover with 40px rows, icons, key hints, a divider and a red last row for the destructive action.

**Empty state.** Pomeo (inline SVG), a short title, one friendly sentence, one neutral button.

**Progress.** The timer ring is a 6px accent line on a visible track with a three-step glow and a small knob at the head; it empties as time runs. Bars are 6px (primary) or 3px (secondary). Round dots are filled when done and outlined when to come.

**Skeleton.** Neutral blocks in the shapes of the content with a slow shimmer; no accent.

**Focus.** 2px accent-ink ring with a 2px gap on every control, on any layer.

**Navigation.** Sidebar items are 36px with radius 12. The active item becomes a raised card with an accent icon, bold label and a 3px accent bar at the screen edge. On the phone the active tab gets a soft pill behind its icon and a bold label.

**Motion.** Three durations and one easing curve: 120ms for hover and press and 200ms for switches (both live in the prototype), 200ms for popovers and 320ms for sheets and dialogs (intended; the prototype shows them already open). Reduced-motion turns all of it off.

## What changes most against v1.20

- Visible card borders and the glossy gradient background go. Surfaces are separated by tone, highlight and shadow on a quiet, deep frame.
- The three cards on the Timer screen no longer weigh the same. The Timer is a hero card; Today, the garden and the tip step back.
- Native `<select>`, date and time inputs are replaced by one family of wells and popovers, including the rich preset picker.
- Inputs and the ring track are clearly visible (3:1 lip, real track tone) where they almost vanished before.
- White on accent (2.5:1 in dark) is gone. Fills and text are corrected from the palette itself, so every palette passes without extra values.
- The accent is used far less: one filled button per view, progress lines, focus and selection. Coins, streak and rank chips become neutral with a small tinted icon.
- 26 radii become 6 with a rule (8 / 12 / 16 by control height, 16 cards, 22 hero and dialogs, pill for chips). 50 shadows become 4 levels. 27 font sizes become 9 plus the timer numerals.
- The Session card sits on one grid: task and colour on the first row, tags and preset on the second, subtasks and shortcuts on the third.
- The ring is meant to start full and empty as time runs (the prototype shows the idle state, 25:00), with the phase and preset inside it, so the hero reads at a glance from across a desk.

## Self-critique: problems found in the first render and fixed

1. **Washed-out accent in dark.** The fill was pushed 20% toward white although the palette already cleared AA, so Start looked pastel and Delete looked pink. Now 10%, and the danger hue has more chroma.
2. **Today card had no rhythm.** `space-between` left 60–90px holes between its blocks. Now a fixed 12px rhythm with hairlines; the spare height goes to the garden card.
3. **Weekly strip was misaligned.** The seven bars started mid-card and today's double outline was the heaviest mark there. Now full width under a label row, with a single inner outline and a bold letter.
4. **Header search out-shouted the header.** A ringed well on the darkest layer was the highest-contrast object on screen. It is a button that opens the palette, so it is now a raised pill like its neighbours.
5. **Open fields looked double-framed.** Open state drew an inner ring plus a translucent outline, and real keyboard focus stopped being special. Open is now one inner ring; the offset ring is for the keyboard only.
6. **Two-line option rows were cramped.** Subject plus preset in a 40px row ran into the next row. Two-line rows are now 48px.
7. **"23day streak".** Number and unit collided; fixed the gap. Same for the exam chip, where flex gaps had split the sentence.
8. **Sidebar "new" dots read as radio buttons.** Now 6px, secondary ink, no halo.
9. **Garden glance was vague.** Plants were tiny and "ready" was an unexplained dot. Plants are larger and each has a label (Ready, 76%, New).
10. **Ragged rows on the component sheet.** Cards in the same row ended at different heights. The last card in each column now stretches; the combobox gained a row and the progress card a rounds example.
11. **Ring glow was tight and the phone ring too heavy.** The arc is thinner (6px) with a wider three-step glow; the phone stroke matches the desktop weight.
12. **Green status ink failed on the sunset light frame (4.36:1).** Found by measuring in the browser; status inks now mix 38% text and pass everywhere.

Still open after the one round: the garden card has a slightly loose band above its footer at 1440 × 900, and in dark the field lip (needed for 3:1 inside popovers) is the brightest line on the Session card.

## Risks when this meets 60 screens and 24 palettes

- **Layer steps depend on the palette's own bg/surface gap.** A palette whose `--surface` is very close to `--bg` (or a light palette with a tinted, mid-tone bg) flattens the stack. The mode dials can be tuned once, but a few palettes may need their `--bg` nudged. Worth a contact sheet of all 48 combinations early.
- **Red-family accents.** Danger is the accent turned to red, so on sunset-like palettes Delete and the primary button are close in hue. The icon, the verb and the rule "one primary per view" carry the difference, but a destructive confirm next to a Save will look related.
- **Status hues inherit the accent's lightness and chroma.** A very pale or very dark accent gives pale or dark greens and ambers. The 38% text mix protects text contrast; the tinted tiles may look weak on some palettes.
- **Relative colour syntax** (`oklch(from …)`) drives `--away` and the status hues. It needs Chrome 119+, Safari 16.4+, Firefox 128+. The `@supports` fallback keys on the mode only, which is right for these palettes but wrong for a light palette that ships a dark `--on-accent` (a yellow accent, for example).
- **Dark shadows barely show.** In dark the stack is carried by tone and the 1px highlight. Dense screens (leaderboard rows, clan feed, shop grid) with many cards will feel flat unless lists become rows inside one card instead of a card per item.
- **The 3:1 field lip is the hardest line on the page.** Form-heavy screens (Settings with 50 rows, the task dialog) can look wiry. Settings should use switches and segmented controls where possible and keep wells for real text.
- **Restraint with the accent can cost wayfinding.** With neutral chips and tabs, screens without a hero action (Stats, Profile) need another anchor: a hero number or the main chart on a hero card.
- **Glow and multi-layer shadows cost paint time.** Three stacked drop-shadows on the ring while it animates every second, plus e3/e4 shadows, may drop frames on low-end Android. Keep the glow on a separate static layer and animate only the arc; drop to one shadow under reduced motion or the existing "Lite" glass setting.
- **Existing cosmetics.** Auras, frames, banners, event decorations and the time-of-day sky were drawn for the glossy v1.20 surfaces. On quiet matte layers some will look louder than intended and need a pass.
- **Mode dials are a second source of truth.** Eleven numbers per mode sit beside the palette. If a future "high contrast" or "true black" mode arrives it needs its own dial set, and anyone adding a colour must go through the derived tokens rather than reach for a literal.
- **Phone sheet keeps the tab bar visible.** The preset sheet docks above the bottom bar so navigation stays reachable. If the team prefers fully modal sheets, the sheet gains 64px and the bar is covered.
