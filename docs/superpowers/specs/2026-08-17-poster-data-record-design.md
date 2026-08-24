# The data record — design

**Date:** 2026-08-17
**Status:** built. This document was rewritten after the build to say what was
actually made; the sections on geometry and arrival went through three rounds on
the real board and the first two versions of them are not what shipped.

The finished poster gains a band along its foot carrying the session's answers as
one run of uppercase text, the items separated by `\\`. The band sits on plain
paper: no grid, no layer, nothing else reaches into it.

Reference: Karin's mock, 16 Aug. The mock is a real session — its nine answer
items are exactly the ten questions a default session asks, less the colourway.

---

## 1. What the band says

One item per question that was **answered**, in the asking order, then three items
of session metadata. A question that was **skipped** contributes nothing. The
colourway contributes nothing either: the poster is already the colourway, and
naming it is the one item that says nothing the sheet does not already say.

Items are joined by ` \\ `. Every item is uppercase. British spelling.

### Answer copy

| id | answer | item |
|---|---|---|
| `shape` | `square` | `TIME MOVES ON WITHOUT YOU` |
| | `circle` | `TIME CARRIES YOU WITH IT` |
| `density` | `little` | `TOO LITTLE TIME` |
| | `enough` | `ENOUGH TIME` |
| | `plenty` | `PLENTY OF TIME` |
| `month` | `May` | `FAVOURITE WEATHER 22C OR 72F IN MAY` *(template)* |
| `febdays` | `31` | `31 DAYS IN BIRTH MONTH` *(template)* |
| `alarms` | `0` | `NO SNOOZE IN THE MORNING` |
| | `1` | `1 SNOOZE EVERY MORNING` |
| | `2`..`12` | `10 SNOOZES EVERY MORNING` *(template)* |
| `decades` | `10` | `1 DECADE AHEAD` |
| | `20`..`100` | `5 DECADES AHEAD` *(template)* |
| `vacations` | `1` | `1 CORE MEMORY` |
| | `2` | `2 CORE MEMORIES` |
| | `3` | `3 CORE MEMORIES` |
| | `4+` | `4+ CORE MEMORIES` |
| `sixweek` | `<45` | `WEEK SUPERIORITY` |
| | `45..55` | `WEEK AND WEEKEND EVEN` |
| | `>55` | `WEEKEND SUPERIORITY` |
| `saying` | `Trust` | `TIME IS TRUST` |
| | `Worry` | `TIME IS WORRY` |
| | `Regret` | `TIME IS REGRET` |
| | `Presence` | `TIME IS PRESENCE` |
| `colorway` | — | *(no item)* |

The tail binaries are written too, so raising `QUESTIONS_PER_SESSION` needs no
copy work:

| id | a | b |
|---|---|---|
| `gaze` | `LOOKING BACKWARD` | `LOOKING FORWARD` |
| `reserve` | `MORE TIME BEHIND` | `MORE TIME AHEAD` |
| `trust` | `CLOSER TO TRUST` | `CLOSER TO WORRY` |
| `today` | `A DAY TO REMEMBER` | `A DAY THAT BLURS` |
| `novelty` | `MORE REPEATS THAN NEW` | `MORE NEW THAN REPEATS` |
| `supply` | `RUNNING OUT OF TIME` | `MORE TIME THAN NEEDED` |

The month item reads its two temperatures from `MONTH_TEMPS`, the table the month
layer already indexes, so the celsius and the fahrenheit on the poster are the
same pair the silhouette was set from. The decades item is the bar's answer in
years divided by ten; the bar's stops are decades and the item names them as
such. Singulars are written out per value rather than pluralised by rule
(`1 CORE MEMORY`, `1 SNOOZE`, `1 DECADE AHEAD`).

### Metadata copy

Three items, always, in this order:

```
10 SECONDS AVERAGE TO ANSWER A QUESTION
01:45 MIN TO COMPLETE THE EXPERIENCE
SUN 16 AUG 13:55 2026 THE YEAR OF THE HORSE
```

- **Average.** Seconds, rounded, over the questions that were answered. A
  question's time is the stretch between the press that banked the question
  before it and the press that banks this one — in the panel flow the next
  question becomes current the instant the last is banked, so there is no dead
  time to attribute to nobody. Stepping back and re-banking adds that second
  stretch to the same question's total.
- **Total.** `MM:SS` from the Begin press to the Create press. Begin, not page
  load: the wait before someone starts is not part of the experience. Reset
  starts a fresh clock, since it starts a fresh session.
- **Stamp.** Day, date, month, 24h clock, year, and the Chinese zodiac animal of
  that year, from a table of twelve keyed by `year % 12`. Approximate by up to a
  month, knowingly: the Chinese year turns in late January or February. Taken at
  the Create press, not at page load.

The three are written even when nothing else is: a session where every question
was skipped still carries its own duration.

---

## 2. Where the band sits

**The artwork does not move.** Not by a pixel, not by a per cent. This is the
whole of the geometry and it took three attempts to arrive at.

- The **sheet lengthens downward by one cell** at the Create press: 14 x 20
  becomes 14 x 21 at Sheet format, and the same +1 at every other. The added row
  is the record.
- The **artwork keeps its box** — `B` is still `cols x rows` cells and every
  layer measures itself against it, unchanged. The band is added to the poster's
  **viewBox** only.
- The artwork is **clipped at its own foot**. Several layers deliberately run
  past the sheet (the polar grid's rings reach the corners and beyond, the spokes
  with them), and until the band existed the viewBox itself was the knife. It is
  not any more, so there is an explicit clip. The band is paper and text and
  nothing else.
- The record's **text is inset a quarter cell** left and right — under two per
  cent of the sheet. It is the sheet's footer, not a paragraph set inside it.

### What this costs, and where it is paid

The cell is sized so that no format can overflow the viewport, which now means
the tallest **sheet**, band included: `MAXR_FULL = MAXR + RECORD_ROWS`. The room
is reserved at load rather than found at the Create press, and that is exactly
what lets the sheet grow without the grid, the mark, the dots or the questions
shifting. It costs the asking about a twentieth of the poster's height.

Two things had to follow from the smaller cell:

- **`unionBox` is no longer symmetrical.** Top, left and right stay the
  artwork's own half-heights; only the bottom is let out, by `RECORD_ROWS`.
  Folding the band's rows into `MAXR` moved all four edges and lifted the whole
  interface a cell clear of the sheet.
- **The question system is anchored to the sheet, not to the top of the
  screen.** `snakeBand()`'s first row used to be the screen's first full row,
  which read the same only while the sheet happened to start near it. It is
  stated now: the KAIRO mark's foot sits on the sheet's top line, which fixes
  the first step marker one row under that line and the run follows. Both old
  clamps stay — the screen's first row as a floor, the run's own reach as a
  ceiling.

### Type

Helvetica, the poster's one face, the same the word layer sets. Uppercase, in
the **blue ink role**, on paper, **justified** (`textLength` +
`lengthAdjust="spacing"` on every line but the last).

**At most three lines**, and the size is solved rather than set. Two things cap
it: how many characters fit across the column, which wants fewer lines, and how
tall the stack is, which wants more. Every line count from one to three is
costed and the largest type wins; a candidate whose last line comes out under a
third of the column is set aside as a widow unless nothing fuller fitted. Word
advances are measured once at one em on a canvas and scaled, so the search costs
one measuring pass rather than thousands inside `draw()`.

At a full session's length that lands near a fifth of a cell, three lines, very
nearly filling the one-cell band.

---

## 3. How it arrives

- The sheet's lengthening runs on `--flip` (460ms) with `--eo`, the same clock
  and curve as the ground going to its negative. One movement.
- Nothing resizes. The poster layer is **permanently one cell longer than the
  frame** and top-anchored; `#frame`'s `overflow:hidden` is what hides the band.
  Growing the frame does not scale anything, it **uncovers**. A layer that grew
  with the frame would stretch the artwork for the length of the transition
  (`preserveAspectRatio="none"`) and snap back at the end.
- The transition is armed by a class, `.world.growing`, for the length of the
  movement and no longer — the same pattern `.morphing` uses, and for the same
  reason: `#frame`'s height also changes on a window resize, where it must be
  instant.
- The text is **swept** left to right, each letter fading over .32s on `--eo`,
  the sweep spanning 700ms and starting at half the flip so it overlaps the
  growth. Per-letter hard cuts (the word layer's `steps(1,end)`) read as
  stuttering at three hundred letters three milliseconds apart.
- Reduced motion cuts both.
- **Back** (`hideFinish`) reverses it on the same clock.

`showFinish` does ask for one redraw now — the two durations and the timestamp
are only knowable at that press, so the band is re-set with them before the
sheet reaches it. The artwork is not touched.

---

## 4. Where the code lives

| file | what |
|---|---|
| `js/app/63-record.js` *(new)* | the clock, the copy tables, `recordLine()`, the fit, `recordLayer()`, the zodiac table |
| `js/00-core.js` | `RECORD_ROWS`, and `MAXR_FULL` beside `MAXR` |
| `js/ui/40-dots.js` | `cellSize` against `MAXR_FULL`; `unionBox` let out downward |
| `js/ui/41-snake.js` | the run anchored to the sheet's top row; the below-clearance |
| `js/poster/30-svg.js` | the taller viewBox, the artwork's clip, the record appended |
| `js/app/60-format.js` | `--sheet-hm` and `--ply-h` |
| `js/app/51-flow.js` | the stamp, the redraw, `growSheet()` |
| `js/app/50-landing.js`, `js/app/55-reset.js` | the clock's start and its reset |
| `js/app/53-card.js` | the per-question span, on the press that banks |
| `js/app/70-collect.js` | the timings in `payload()`; the raster canvas sized to the whole sheet |
| `css/10-chrome.css` | `--sheet-hc`, `#frame` overflow, `.world.growing`, `.ply`'s fixed height, the sweep |
| `index.html` | one `<script>` tag |

`63-record.js` sits in `js/app/` beside `62-hover-notes.js`, the other file
holding per-answer copy. It loads before the first draw (boot is 72).

Nothing is baked for the export. The record is in the markup and in the viewBox
from the first paint; what the ending changes is the **frame** it is seen
through. So `buildSVG()` needs no export mode, and the PNG/JPEG canvas is simply
sized to the whole sheet rather than to the artwork's box.

---

## 5. What this changes that was true before

Comments in the code that this design contradicts, corrected rather than left to
rot:

- `buildSVG`'s header: *"The poster carries no identifying text ... everything
  identifying is kept in the data record, not on the artwork itself."* Still true
  of the artwork; the foot is not the artwork.
- `showFinish`'s header: *"NOTHING ABOUT THE POSTER CHANGES HERE ... no redraw is
  even asked for."* One redraw is asked for now, and it is the record's text.

---

## 6. Out of scope

- The interface chrome does not move. The mark, the dots, the reset and the
  status stay where the grid puts them.
- No new question, no change to the bank, no change to any layer's own geometry.
- The band does not appear during the asking. It exists only past Create.
