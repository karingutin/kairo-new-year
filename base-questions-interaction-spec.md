# Architecture of Time — Base Questions Interaction Spec (for interface implementation)

Handoff spec for the session building the actual interface. This describes exactly how the **3 base questions** behave, based on working prototypes built and confirmed during design. Precise enough to implement directly.

## Critical UI constraint

**The poster is NOT visible while answering these 3 questions.** Only one question is on screen at a time:

- Each question (stem + its interaction control) appears alone, full-screen.
- No poster/grid preview, no live visual feedback, no indication of what the answer is "doing."
- Advancing to the next question replaces the current one — a strictly sequential, one-at-a-time flow.
- The poster (built from these 3 answers) is only revealed later, after all 3 (and eventually all questions) are answered.

(Note: the interactive prototypes built during design — where the poster updated live next to the question — were purely for our own internal validation of the visual mapping logic. That live-preview behavior should **not** ship in the real product for this stage.)

## Shared visual model

The poster is a portrait canvas, aspect ratio **7:10**. All three questions write into one shared visual state:

- `shape`: `"square"` or `"circle"`
- `density`: one of 3 fixed levels (`too-little` / `enough` / `plenty`)
- `lineStyle`: derived from a 0–1 fraction representing position between 18:00–20:00 (see Q3)

These three pieces of state are set once (by these 3 questions) and are **permanent** — they don't change during the later 10-question stage.

## Question 1 — locks `shape`

- **Stem:** "How do you experience time?"
- **Interaction:** duo (two buttons, binary choice)
- **Option A:** "It moves on without me" → `shape = "square"`
- **Option B:** "It carries me along with it" → `shape = "circle"`

**Square rendering:** a flat grid of *true squares* (not rectangles) filling the canvas edge-to-edge. Cell size is derived from canvas width only (`cellSize = canvasWidth / columnCount`) and the same cell size is reused for the vertical axis, so cells stay square regardless of the canvas's 7:10 aspect ratio. Lines are drawn full-bleed; the bottom row is allowed to clip/truncate rather than forcing a whole number of rows.

**Circle rendering:** concentric rings **plus 12 evenly-spaced radial spokes** (30° apart) — together they divide the poster into a full polar grid of individual cells (ring × sector), not just plain rings. Rings originate from the exact center of the canvas. `maxRadius` = distance from center to the farthest corner + a small margin (~10px at 546×745 reference scale), so the outermost ring passes just beyond the corners — rings must visibly fill the entire poster, not stop short in the middle.

## Question 2 — locks `density`

- **Stem:** "How much time do you feel like you have?"
- **Interaction:** a bar/track with exactly **3 fixed marked points** (not a free continuous slider, not binary duo)
- **Point 1 — "Too little"**
- **Point 2 — "Enough"** (default/starting position)
- **Point 3 — "Plenty"**

Reference counts used in the prototype (tune freely, but keep the *ratio* — sparse → default → dense, with "plenty" deliberately not overwhelming):

| density | circle: ring count | square: column count |
|---|---|---|
| Too little | 8 | 10 |
| Enough | 16 | 16 |
| Plenty | 22 | 20 |

Note: "Plenty" was deliberately tuned down from an earlier, much denser prototype (30 rings / 28 columns) — it read as visually overwhelming/cluttered. Keep it noticeably denser than "Enough" but not chaotic.

## Question 3 — locks `lineStyle`

- **Stem (draft, not fully finalized):** "We said 19:00. When will you actually be there?"
- **Interaction:** a **semicircle clock dial** — a half-circle arc spanning exactly 18:00 (left end) to 20:00 (right end), with 19:00 marked at the apex (top-center) as the "on time" reference point. User drags a handle along the arc. This is a bespoke interaction type, not any of the standard ones (not duo, not the Q2-style 3-point bar, not a numeric scrubber, not card choice, not a generic gauge).
- Internally represent the answer as `frac` ∈ [0, 1], where 0 = 18:00, 0.5 = 19:00 (exactly on time), 1 = 20:00.

**Visual mapping — `lineStyle` derived from `frac`:**

```
if |frac - 0.5| < 0.005:
    # exactly on time
    dasharray = none
    strokeWidth = 1   (baseline)

elif frac > 0.5:
    # late
    lateness = (frac - 0.5) / 0.5        # 0 → 1
    dash = max(0.5, 7 - lateness * 6)     # shrinks toward 0.5
    gap  = 1 + lateness * 7               # grows toward 8
    dasharray = `${dash} ${gap}`
    strokeWidth = 1                       # unchanged while late

else:
    # early
    earliness = (0.5 - frac) / 0.5        # 0 → 1
    dasharray = none
    strokeWidth = 1 + earliness * 1.2     # grows to ~2.2 at full earliness (kept subtle — an earlier version went up to ~4 and felt too heavy)
```

This `lineStyle` (strokeWidth + dasharray) is applied uniformly to **every line in the grid** — every ring and every spoke (circle shape), or every row and column line (square shape). It's a global property of the whole poster's linework, not a per-cell effect.

## Implementation reference

A fully working HTML/SVG prototype of all three questions wired together (with live poster preview, for internal validation only — not to ship as-is) was built via the visualize tool during this design session. It demonstrates:
- The duo shape toggle switching the entire grid between square and circle rendering
- The 3-point density bar swapping ring/column counts
- The draggable semicircle dial live-updating stroke width/dasharray across the whole grid

If useful, this prototype's logic (documented above in the pseudocode/table form) can be re-implemented directly in the production interface — the numbers and formulas above are taken directly from the working version.
