# Poster layer animations — questions 3, 7, 8, 9

Design agreed with Karin, 2026-08-16. Adds entrance (and where noted, change)
animation to four poster tool-layers, on the same generic ground already used by
snake / node / rings.

## Session mapping

Session order: 1 shape · 2 density · **3 month** · 4 febdays · 5 alarms ·
6 vacations · **7 decades** · **8 sixweek** · **9 saying** · 10 colorway.

So the four are: `month`, `decades`, `sixweek`, `saying`.

## Shared ground (already in place)

- Each answered layer is `<g class="hl" data-q="...">`. Entrances fire **once per
  session, on first appearance**, tagged via the `entered` Set + `markEntries()`;
  `resetAll` clears it, so a refresh/reset replays the entrance. No per-rule
  reduced-motion guard needed — the global `*{animation:none}` rule covers it.
- **Feel/speed reference:** match the existing entrances — snake unspool ~0.8s
  with a per-bead stagger (`--sstep`=440/count ms), node `--nstep`=300/rays ms,
  rings staggered scale. **All new motion is ease-out.** Nothing snappy/fast;
  land soft, in the ~0.6–0.9s band with staggers of that cadence.
- **Verification:** rAF/CSS motion does NOT run in the embedded Browser-pane
  preview (files open as static, `visibilityState:hidden` freezes rAF). Every
  layer is verified by Karin in a **real, visible browser tab**; mechanics
  (computed styles / byte-equal static landing) are checked programmatically.
- Format-keyed ids stay format-keyed (two plies each hold a full SVG).

## 3 · month — the halftone silhouette

- **Entrance (first appearance only):** the silhouette grows from the inside —
  a smooth `scale(0 → 1)` of the whole layer group about the **sheet centre**
  (`transform-box:view-box; transform-origin:` sheet centre), ease-out, **not
  too fast** (~0.7s). Replaces the current stepped raster-ladder entrance
  (which just reads as a pop). No per-frame re-rasterise — one group transform,
  like the rings.
- **On month change (re-pick):** **keep the existing raster re-grow**
  (`startMonthGrow`) exactly as today. Only the FIRST appearance uses the new
  scale entrance; subsequent picks run the raster ladder. Gate on `entered`.

## 7 · decades — the brick band at the foot

- **Entrance:** the bricks build in, **staggered column-by-column** (from one
  side), ease-out cadence — the piece's "whole cell, hard cut" brick language.
- **On change (bar drag changes decade count):** columns that were **added
  "land"** in the same brick character; columns **removed exit**. Per newly
  added/removed column, not a full re-lay.

## 8 · sixweek — the lattice

- **Entrance ONLY:** the "pixels" (cells/marks) enter **one by one, hard cut
  (no fade)**, as a **diagonal wavefront from the top-left origin** outward. The
  wavefront progression is ease-out; each individual cell is an instant cut.
- **On return to the question / bar drag:** **no animation** — updates instantly
  (as today). The entrance replays only after refresh/reset.
- **Technical:** render the lattice **per-cell** only during the entrance, with a
  per-cell stagger keyed on distance from the top-left; on completion, land on
  the existing **batched static emit** (byte-identical result), then never
  re-emit per-cell again. Same COMPUTE/EMIT split the other morphs use, so the
  resting poster keeps its efficient two-path form.

## 9 · saying — the typography

- **Entrance:** each outline letter enters **one at a time, hard cut (no fade,
  no caret)**, line 1 then line 2. The beat spacing follows an ease-out cadence
  (~0.15s/letter, in the existing feel).
- **On change (re-pick a different phrase):** **instant** (hard cut to the new
  pair), consistent with the no-fade language.

## Out of scope

- No new morph for month change (raster kept), sixweek change (instant), or
  saying change (instant). Only decades gets a change animation (columns
  landing).
- Colourway, layer stacking, and the layers' static rendering are unchanged.

## Order of work

Implement and verify one at a time, each checked by Karin in a real tab before
the next: **month → decades → sixweek → saying.**
