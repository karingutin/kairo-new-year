# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Undecided. The primary visitor profile has not been fixed — strangers arriving from a link, exhibition visitors, and people the author sends it to directly are all plausible and none has been confirmed. Future work must not assume one and design copy or density around it.

Confirmed constraint regardless of profile: visitors under 16 must never be shown the heavy/personal questions. Birthdate is collected, so age is known.

## Product Purpose

Architecture of Time turns a person's subjective perception of time into a generated poster. The visitor answers a short session of questions about how time feels to them; each answer drives one visual element, and the result is a wordless composition of shapes and colors they can export as PNG or SVG.

Success is that a visitor completes a session and leaves with a poster that reads as a portrait of their own sense of time.

## Positioning

The mechanism is the questions themselves. They are amorphous — poetic and perceptual rather than literal descriptive opposites. "Does time feel like it's carrying you, or are you carrying it?" has no correct reading; two people answer differently for different reasons, not merely by degree. A neighboring product could copy a quiz-to-graphic pipeline but not this register of question.

The finished poster contains no words at all. Only shapes and colors.

## Operating Context

A session runs 13 questions in two parts:

1. **Part 1 — intro + 3 base questions.** Name and birthdate are collected. Three base questions (1 light, 2 heavy) lock permanent visual foundations — grid shape, grid density, grid line continuity. Once the visitor moves to Part 2, these layers cannot change.
2. **Part 2 — 10 extra questions.** Drawn from a 21-question bank across 7 internal content categories. These affect the poster in real time and can be revisited.

Sessions are freely repeatable — a visitor can return, answer differently, and get a different poster.

## Capabilities and Constraints

- Implementation: `index.html` plus `css/` and `js/` (see CLAUDE.md). Full-screen app, `html,body{overflow:hidden}` — there is no scrolling page.
- Interaction types in the bank: duo (binary), position-on-axis, numeric scrubber, card choice, intensity gauge, and a semicircle clock dial.
- Skip is available on every question and leaves a visible mark on the poster, distinct from an unasked question. Exception: neither question in a branch pair may be skipped.
- Branching is allowed — a question can appear or change based on an earlier answer in the same session. Branch pairs are always presented back-to-back and the linkage is never disclosed to the visitor.
- Each question controls exactly one visual element. No two answers jointly drive one element.
- Draw rules per session: 2–3 pinned anchor questions, the rest random, guaranteed mix of light and heavy, with a ceiling of roughly 2 heavy per session.
- The 7-category taxonomy is an internal organizing tool only and is never surfaced to the visitor — no progress indicator naming a category.
- Export to PNG and SVG is supported and considered sufficient.
- All question text and UI copy is English.

## Brand Commitments

- Name: **Architecture of Time**.
- Incumbent visual system in `index.html` is design authority: black ground `#000000`, a grid that never moves or changes scale, a "sheet" that snaps between poster formats along grid lines, and a pale morning yellow `#F3E09B` marking settled answers.
- Typefaces already committed: Frank Ruhl Libre (display), Miriam Libre (UI), IBM Plex Mono (mono).
- No content boundaries on question topics. Loss, addiction, and suicidal ideation are all in scope where they serve the piece.
- The opening screen deliberately carries **no** content warning. The skip affordance inside the interface does that work; a warning up front would pre-frame the piece as heavy.

## Evidence on Hand

- `index.html` — the working piece, incumbent visual authority.
- `nine-questions-prototype.html` — prototype for the extra-questions stage.
- `base-questions-flow-summary.md`, `base-questions-interaction-spec.md` — confirmed specs for the 3 base questions.
- `shapes/` — 9 SVGs: day-split-to-2 through 6, repetition-1 through 4.
- Local design source files: a PSD and a layered elements file.

No testimonials, press, usage data, or customer evidence exists. Future work must not fabricate any.

## Product Principles

1. The question register is the product. Amorphous and perceptual, never literal opposites.
2. The poster is wordless. Meaning arrives as shape and color, never as a label.
3. The grid never moves. It is the fixed frame the whole piece is read against.
4. Nothing is forced. Any question can be skipped, and skipping is visible rather than hidden.
5. The internal method stays internal. Categories, draw rules, and branch pairs are never shown.

## Accessibility & Inclusion

Age gate at 16 for heavy questions is a confirmed product requirement. No other accessibility standard has been established for this project yet.

## Open Decisions

- Primary visitor profile is unfixed.
- An end-of-flow hover legend explaining what each choice maps to is an idea, not a commitment, and is in tension with the wordless-poster rule.
- A gallery of other visitors' finished posters is an idea, not a commitment.
