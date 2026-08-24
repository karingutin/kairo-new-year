# Splitting `architecture-of-time.html`

A plan for cutting the single 8,375-line file into small, editable pieces without
changing a line of code.

## Source of truth

Every line number below was derived from this exact revision. **Check it before cutting** —
the file changed once already while this plan was being written:

```bash
git rev-parse --short HEAD && wc -lc < architecture-of-time.html && md5 -q architecture-of-time.html
```

Expected: `b5a63f9`, `8375  469161`, `2bf128084ae46d83dac09fedc11f95cb`.

If any of those differ, the line ranges are stale. Re-derive them by grepping for the
section banners (`grep -n "^/\* ={10,}"`) rather than trusting this table.

## Why

8,375 lines, 469 KB: 1,081 lines of CSS, 92 lines of body markup, and 7,184 lines of
JavaScript holding 181 top-level functions and 215 top-level bindings, all in one global
scope. Every edit means finding a needle in that, and every read costs the whole file.
Splitting by concern makes each tool a file you can open, understand and fix on its own.

## The approach: a mechanical cut, not a rewrite

Every section moves to its own file and is loaded with a plain `<script src>` tag, in the
same order it appears today. **No line of JavaScript changes.**

This works because classic (non-module) scripts share one global scope. Top-level
`function`, `var`, `let`, `const` and `class` declarations go into the global environment
and are visible to every script that runs after. Scripts without `defer` or `async`
execute in document order, synchronously. A file cut into N ordered `<script src>` tags
behaves identically to the same code inline.

Two alternatives, rejected:

- **ES modules with `import`/`export`.** Cleaner, and it would catch mistakes at load
  time, but it means touching ~400 symbols and untangling their dependency graph by hand.
  High risk for a file whose behaviour is hard to unit-test. Worth revisiting later, one
  file at a time, once the boundaries have proved themselves.
- **A bundler.** Adds a build step to a project that has none, and one you have to
  remember to run before every check.

The file is always opened through the local `python -m http.server` in
`.claude/launch.json`, so external files load fine. Classic scripts would also work over
`file://`, unlike modules — a free bonus, not a requirement.

## The one hazard, and why it does not bite here

`function` declarations hoist to the top of **their own script**, not across scripts.
Today a function declared at line 8000 is already callable by code that *executes* at line
1300. After the split it would not be.

This only matters for statements that **run immediately at the top level** — not for code
inside a function or an event handler. There are 30 such statements in the file. Every one
was checked against the file map:

| Line | Statement | Resolves to |
|---|---|---|
| 1628 | `QUESTION_BANK.slice(0,7).forEach(...)` | `QUESTION_BANK` at 1430, same file |
| 7449 | `resetBtn.addEventListener('click', resetAll)` | `resetBtn` 3787 (earlier file), `resetAll` 7431 (same file) |
| 7450 | `mkBtn.addEventListener('click', showFinish)` | `mkBtn` 3788 (earlier), `showFinish` 6839 (earlier) |
| 7494, 7499 | tilt setup reading `STATIC_VIEW` | `STATIC_VIEW` at 7493, same file, one line above |
| 7691 | `if(DEV_SKIP){ ... }` | `DEV_SKIP` at 7678, same file. The block's only forward name, `devSkipToLast`, sits inside a click handler and runs later |
| 7879 | `document.body.appendChild(hoverCard)` | `hoverCard` at 7859, same file |
| 7986 | `try{ RESPONSES = JSON.parse(...) }` | `STORE_KEY` 7984, `RESPONSES` 7985, same file |
| 7638–8327 | 21 `addEventListener` calls | handler bodies are arrow functions; they run at event time, not load time |
| 8336–8370 | the boot block | last file, everything is already defined |

**There are no forward references.** Nothing has to move. But this is the check to redo if
the file changes before the split runs.

## File map

Ranges are contiguous and verified: the 32 JS ranges cover exactly lines 1189–8372
(7,184 lines, no gaps, no overlaps), and the 4 CSS ranges cover exactly 13–1093
(1,081 lines).

### `architecture-of-time.html` (~200 lines)

Keeps the `<head>` (lines 1–11), the body markup with its direction-contract comments
(1096–1187), and the ordered list of `<link>` and `<script src>` tags.

### CSS — 4 files, from lines 13–1093

| File | Lines | Contents |
|---|---|---|
| `css/00-ground.css` | 13–289 | `:root` variables, `@font-face`, surface, world, grid layer, vignette, sheet lines, the two plies, the poster dots, keyframes |
| `css/10-chrome.css` | 290–554 | the KAIRO mark, the format control and its menu, status strip, reset, the popup card |
| `css/20-aperture.css` | 555–902 | the landing screen, APERTURE, the opening KAIRO tiles and START, the rescoped base-question controls |
| `css/30-questions.css` | 903–1093 | the question system: panels, options, dial, markers |

### JavaScript — 32 files, from lines 1189–8372

**Core**

| File | Lines | Size | Contents |
|---|---|---|---|
| `js/00-core.js` | 1189–1425 | 237 | the opening banner, `CONFIG`, `FORMATS`, `STATE`, `derive()`, the shared helpers |
| `js/10-bank.js` | 1426–1796 | 371 | the question schema and THE BANK: all 21 questions and their ask order |

**Poster layers** — one file per generated layer

| File | Lines | Size | Contents |
|---|---|---|---|
| `js/poster/20-month.js` | 1797–2095 | 299 | the month layer and THE GROWTH, its arrival animation |
| `js/poster/21-node.js` | 2096–2314 | 219 | the node at the sheet's centre and its rays |
| `js/poster/22-base-grid.js` | 2315–2393 | 79 | the base grid (bank Q1 and Q2) |
| `js/poster/23-beams.js` | 2394–2439 | 46 | the ring of cuboids in perspective |
| `js/poster/24-roll.js` | 2440–2672 | 233 | the per-tool randomisable control |
| `js/poster/25-rings.js` | 2673–3072 | 400 | the nested ring stack in the top-right corner |
| `js/poster/26-snake-layer.js` | 3073–3353 | 281 | the numbered metaball serpent |
| `js/poster/27-decades.js` | 3354–3379 | 26 | the decades bar at the foot of the sheet |
| `js/poster/28-lattice.js` | 3380–3627 | 248 | the ported Brik lattice engine (the sixweek question) |
| `js/poster/29-word.js` | 3628–3677 | 50 | the saying, the poster's only typography |
| `js/poster/30-svg.js` | 3678–3767 | 90 | `buildSVG` — assembles every layer into one document |

**Interface** — one file per control

| File | Lines | Size | Contents |
|---|---|---|---|
| `js/ui/40-dots.js` | 3768–4292 | 525 | DOM refs, corner chrome, the KAIRO mark, the dot field, the order made visible |
| `js/ui/41-snake.js` | 4293–4825 | 533 | the SNAKE question system: geometry, panel layout, `spanW`/`panel.dx` |
| `js/ui/42-wheel.js` | 4826–5040 | 215 | the wheel, the number question's control |
| `js/ui/43-horizon.js` | 5041–5285 | 245 | the horizon line, the decades question's control |
| `js/ui/44-snake-draw.js` | 5286–5522 | 237 | drawing the snake: past markers and the current figure |
| `js/ui/45-month-ring.js` | 5523–6271 | 749 | the twelve-circle month ring, "where to begin", the guide line, card open/close |

**Application flow**

| File | Lines | Size | Contents |
|---|---|---|---|
| `js/app/50-landing.js` | 6272–6809 | 538 | the landing screen, APERTURE, the hero field, `showIntro`, `finishBase` |
| `js/app/51-flow.js` | 6810–6852 | 43 | `openQuestion`, `closeCard`, `showFinish` |
| `js/app/52-controls.js` | 6853–6951 | 99 | `ICON`, `ctrlShapes` and the control builders |
| `js/app/53-card.js` | 6952–7093 | 142 | `renderCard`, `skipQuestion`, `renderStatus` |
| `js/app/54-draw.js` | 7094–7429 | 336 | painting the poster into the live ply, and the snake / node / ring morphs |
| `js/app/55-reset.js` | 7430–7451 | 22 | `resetAll` and the reset / create-poster listeners |
| `js/app/56-tilt.js` | 7452–7507 | 56 | the world's pointer pan and tilt, `STATIC_VIEW` |
| `js/app/60-format.js` | 7508–7662 | 155 | `changeFormat`, the format control and its menu wiring, `DEV_SKIP` |
| `js/app/61-relayout.js` | 7663–7730 | 68 | `relayout` — the one function that re-snaps everything to the grid |
| `js/app/62-hover-notes.js` | 7731–7971 | 241 | hover notes: the personal line beside the sheet, plus the global key and resize handlers |
| `js/app/70-collect.js` | 7972–8142 | 171 | data collection, `submit`, the CSV, and the SVG / PNG export |
| `js/app/71-qsys-input.js` | 8143–8334 | 192 | the question system's click, keyboard and pointer handlers, delegated on `#qsys` |
| `js/app/72-boot.js` | 8335–8372 | 38 | boot: `ensureMonthFont`, `newSeed`, `buildLogo`, `relayout`, `?skip` |

Most files land at 200–500 lines. The two largest are `45-month-ring.js` (749) and
`50-landing.js` (538). A few are deliberately tiny — `27-decades.js` at 26 lines,
`55-reset.js` at 22 — because load order **is** execution order, so a small section wedged
between two large ones cannot be merged into either without moving code.

The numeric prefixes are not decoration. They are the execution order.

## How to do it

### 1. Checkpoint

Commit the current state first, per `CLAUDE.md`. `SPLIT_PLAN.md`, `.DS_Store` and
`lattice/.DS_Store` are currently untracked; `architecture-of-time.html` is clean at HEAD.

### 2. Cut mechanically

No hand editing, no reformatting, no "while I'm here" fixes. Save as `do-split.sh`:

```bash
#!/bin/bash
set -euo pipefail
SRC=architecture-of-time.html
mkdir -p css js/poster js/ui js/app
cut(){ sed -n "$2,$3p" "$SRC" > "$1"; }

cut css/00-ground.css            13   289
cut css/10-chrome.css           290   554
cut css/20-aperture.css         555   902
cut css/30-questions.css        903  1093

cut js/00-core.js              1189  1425
cut js/10-bank.js              1426  1796
cut js/poster/20-month.js      1797  2095
cut js/poster/21-node.js       2096  2314
cut js/poster/22-base-grid.js  2315  2393
cut js/poster/23-beams.js      2394  2439
cut js/poster/24-roll.js       2440  2672
cut js/poster/25-rings.js      2673  3072
cut js/poster/26-snake-layer.js 3073 3353
cut js/poster/27-decades.js    3354  3379
cut js/poster/28-lattice.js    3380  3627
cut js/poster/29-word.js       3628  3677
cut js/poster/30-svg.js        3678  3767
cut js/ui/40-dots.js           3768  4292
cut js/ui/41-snake.js          4293  4825
cut js/ui/42-wheel.js          4826  5040
cut js/ui/43-horizon.js        5041  5285
cut js/ui/44-snake-draw.js     5286  5522
cut js/ui/45-month-ring.js     5523  6271
cut js/app/50-landing.js       6272  6809
cut js/app/51-flow.js          6810  6852
cut js/app/52-controls.js      6853  6951
cut js/app/53-card.js          6952  7093
cut js/app/54-draw.js          7094  7429
cut js/app/55-reset.js         7430  7451
cut js/app/56-tilt.js          7452  7507
cut js/app/60-format.js        7508  7662
cut js/app/61-relayout.js      7663  7730
cut js/app/62-hover-notes.js   7731  7971
cut js/app/70-collect.js       7972  8142
cut js/app/71-qsys-input.js    8143  8334
cut js/app/72-boot.js          8335  8372

# the shell: head, body markup, and the tag lists
sed -n '1,11p'      "$SRC" > /tmp/aot-head.txt
sed -n '1096,1187p' "$SRC" > /tmp/aot-body.txt
echo "cut done"
```

### 3. Rewrite the shell

Replace the `<style>` block with four `<link rel="stylesheet">` tags and the `<script>`
block with 32 `<script src>` tags, **in the order above**, no `defer` and no `async` on
any of them. Keep `<body>`'s existing markup and comments verbatim.

### 4. Prove nothing was lost

The point of the mechanical cut is that correctness is checkable, not arguable. Save as
`verify-split.sh`:

```bash
#!/bin/bash
set -euo pipefail
{
  cat /tmp/aot-head.txt
  echo '<style>'
  cat css/00-ground.css css/10-chrome.css css/20-aperture.css css/30-questions.css
  echo '</style>'
  echo '</head>'
  cat /tmp/aot-body.txt
  echo '<script>'
  cat js/00-core.js js/10-bank.js \
      js/poster/2[0-9]-*.js js/poster/30-svg.js \
      js/ui/4[0-5]-*.js \
      js/app/5[0-6]-*.js js/app/6[0-2]-*.js js/app/7[0-2]-*.js
  echo '</script>'
  echo '</body>'
  echo '</html>'
} > /tmp/aot-rebuilt.html
git show HEAD:architecture-of-time.html > /tmp/aot-original.html
diff /tmp/aot-original.html /tmp/aot-rebuilt.html && echo "IDENTICAL"
```

Note the glob order in that `cat` is alphabetical, which is why the prefixes are
zero-padded and monotonic. If `diff` reports anything, the cut is wrong — that is a bug,
not a judgement call. Do not proceed until it prints `IDENTICAL`.

### 5. Run it

Serve on the local server (`aot-verify`, port 8796) and confirm:

- the console is clean: no `ReferenceError`, and no 404 on any of the 36 new files;
- the opening screen animates and START opens question one;
- all nine board questions answer, and each poster layer appears and morphs;
- Create Poster works, and so do the SVG and PNG exports;
- both formats render, and a format change re-snaps the chrome. The `--cell` grid rule in
  `CLAUDE.md` is untouched by this split, but a broken load order would show up here
  first, since `relayout` in `61-relayout.js` calls into nine other files;
- `?skip` still bypasses the opening.

### 6. Checkpoint again

Commit the split as **one** commit, so a single `git revert` undoes it if anything
surfaces later.

## Out of scope

- The other prototypes — `architecture-of-time-dots.html`, `grid-transition-demo.html`,
  `nine-questions-prototype.html`, `dial-demo.html`, `archive.html`, and the `lattice/`
  and `shapes/` directories — are untouched.
- No refactoring, no renaming, no dead-code removal, no reformatting. Those are separate
  jobs, and doing any of them here would destroy the byte-identical check that is the only
  thing making this split safe.
