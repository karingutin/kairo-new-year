# Architecture of Time — Base Questions Flow (working summary)

Handoff summary for the session working on the interface. This covers the design decisions made for the **13-question flow** (3 base + 10 extra), specifically the **3 base questions** stage.

## Overall flow structure

The 13-question session is split into two parts:

1. **Part 1 — Intro + 3 base questions**
   - Name + birthdate collection. Birthdate itself feeds a visual (e.g. age-based density/scale), not just used for personalization/age-gating.
   - 3 base questions: **1 light + 2 heavy**.
   - These 3 questions lock permanent visual foundations of the poster — once the user moves to Part 2, these visual layers **cannot change**.
2. **Part 2 — 10 extra questions**
   - Mix of heavy/light, drawn from the existing 7-category question bank method (see prior memory: `architecture_of_time_question_bank_method`).
   - These affect the poster in real time and **can be revisited/changed** — the "extra"/experimental layer on top of the locked base.

## The 3 base questions (each locks one permanent visual layer)

### Question 1 (light) — locks grid shape/structure
- **Stem:** "How do you experience time?"
- **Option A:** "It moves on without me" → **square/linear grid**
- **Option B:** "It carries me along with it" → **circle/concentric rings grid**
- **Interaction type:** duo (binary choice)
- **Status:** ✅ Locked

### Question 2 (heavy) — locks grid density
- **Stem:** "How much time do you feel like you have?"
- **Point 1 — "Too little"** → sparser grid (fewer circles/squares)
- **Point 2 — "Enough"** → default density
- **Point 3 — "Plenty"** → denser grid (more circles/squares)
- **Interaction type:** bar/slider with 3 marked points (not a free continuous slider, not binary duo)
- **Status:** ✅ Locked

### Question 3 (heavy) — locks grid line continuity
- **Stem (draft):** "We said 19:00. When will you actually be there?"
- **Interaction type:** a **semicircle clock dial** — user drags a handle along an arc bounded 18:00–20:00, with 19:00 marked as the reference/"on time" point at the dial's apex. This was chosen specifically because it's a genuinely new interaction type (not duo, not a bar with fixed labels, not a numeric scrubber, not card choice, not a gauge/dial reused from elsewhere) — a concrete, real clock-time picker.
- **Visual mapping (prototyped, not yet fully final):**
  - Exactly on time (19:00) → grid line stays **whole/solid**, normal thickness
  - **Earlier** than 19:00 → line grows **thicker** the earlier they are
  - **Later** than 19:00 → line becomes **increasingly dashed/broken** the later they are
- **Status:** ⚠️ Interaction mechanic and visual mapping prototyped and confirmed as a direction; stem wording not fully finalized. Open question: this was meant to be a "heavy" question (originally aimed at a heavier content category like memory/finitude), but the current lateness/arrival framing reads as fairly light/concrete/funny — worth deciding whether that's fine or whether the emotional weight needs to be reinforced.

## Design process notes (style constraints that applied throughout)

- Answer options must **stand on their own** as complete statements — not grammatically dependent on the stem, and not phrased as an "A or B?" question that gives away both poles inside the stem itself.
- Preferred plain/mid-register English — not overly poetic/literary (rejected: "abundant", "excess", "scarce" as too high-register) and not too casual/blunt (rejected: "a lot", "lots" as too low-register).
- Rejected pure metaphor families that felt "too open to interpretation" (liquid/flow metaphors like "overflowing/steady/thin", and resource/reserve metaphors like "stocked/in store/well").
- Concrete, relatable, slightly playful phrasing (in the vein of "reply to texts right away, or leave everyone on read?") tested well as a tone target for lighter/mid-weight questions, before landing on the lateness/clock framing for Q3.
- A working interactive HTML/SVG prototype of the semicircle clock-drag widget exists (built via the visualize tool during this session) and has also been implemented as a static graphic inside the **"widjet" frame** on the **METHOD** page of the Figma file `Karin - WPA 2026` (fileKey `bCNIdfPML5bi7LnrhBLDmC`).

## Still open / next steps

- Finalize exact stem wording for Question 3.
- Decide whether Question 3's emotional "weight" (heavy vs. light) is acceptable as-is or needs adjustment.
- Confirm exact dash-pattern/line-thickness formulas for implementation (current prototype: dash length shrinks and gap grows linearly with lateness past 19:00; stroke width grows linearly with earliness before 19:00).
- Move on to the 10 extra questions (Part 2) once Question 3 is finalized.
