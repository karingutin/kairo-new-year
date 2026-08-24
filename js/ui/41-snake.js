/* =====================================================================
   THE SNAKE — the question system, laid on the interface lattice.

   Measured off the mock (Figma node 2720:3101) and expressed in whole cells,
   because that is what the design is: not a card that floats near a grid, but
   boxes that ARE grid cells.

   THE ONE RULE OF THE COMPOSITION: every part hangs off the previous part's
   corner. The step marker, then the total beside it, then the panel off the
   total's corner, then Save off the panel's corner. Nothing is centred against
   anything, and nothing is spaced by a gap — the parts touch at corners, which
   is what makes the whole thing read as one figure walking down the screen.

   THE SNAKE. Each question's marker steps one cell diagonally from the last.
   When the walk reaches the edge of the free band it reverses its horizontal
   direction and keeps descending — so the trail of answered markers draws a
   serpentine down the board. The trail IS the progress bar; there is no other.

   NOTHING MAY TOUCH THE POSTER. The band is computed against unionBox(), the
   largest footprint ANY format can take — not against the sheet currently
   showing. So a format change can never bring the poster onto a question, in
   exactly the way the old dot field was protected.
   ===================================================================== */
const SNAKE={
  /* every offset below is in cells, from the step marker's own top-left, in the
     mock's own arrangement (the panel opening down and to the right) */
  total:{dx:1, dy:0, w:1, h:1},
  /* Six by SIX, not the mock's six by four. The figure was 5.6% of a 1920x1080
     screen and read as an afterthought beside a poster taking 24%. Width could
     not grow — the clear band beside the poster only just fits the figure once
     — so downward was free instead, and there are 24 rows against the figure's
     6. Everything inside the panel is expressed as a fraction of PANEL_H below,
     so the interior scaled with it instead of being retuned by hand.
     (The two-column zigzag this used to describe is gone — see snakeCell.) */
  /* panel.h is NOT here: every question sizes its own panel (see panelSize),
     because a fixed height left the short questions with a field of white
     between the words and the answer. Width stays 6 — that is what the clear
     band beside the poster affords. */
  /* dx:2, and this is the number Karin's "the whole question container should
     move one grid column to the right (so it's not right below /10)" changes.

     It was 1, which put the panel in the SAME COLUMN as total — the panel's
     left edge sat directly under the "/10" and read as hanging off it rather
     than as stepping past it. At 2 the panel's top-left lands on total's
     bottom-right corner instead: still corner-to-corner, still one diagonal
     step, but off the piece before it rather than under it, which is what the
     composition says every part should do.

     WHAT ACTUALLY MOVES IS THE MARKER, and that is not a compromise, it is
     arithmetic. The band is spent to the cell: with the colourway's 3-cell
     Create the figure already reaches the poster's keep-out edge exactly (see
     spanW), so there is no column to the right to move into. QUESTION_LEFT_CELLS
     pins the PANEL's inset at 3 from the screen edge — Karin's other standing
     rule, and the one the note's inset on the far side is matched to — so the
     marker's column is derived as inset minus dx (see `left` in snakeBand) and
     raising dx steps the marker and its counter one column LEFT. The panel and
     Create do not move a pixel; the relationship Karin asked to break is broken
     from the other end. Chosen by Karin, 16 Aug, over narrowing every panel to
     8 cells or shifting the poster off its even margins.

     w here is the WIDEST a panel may be — the band is sized for it, so spanW is
     computed from this one number whatever an individual question asks for;
     per-question widths live in PANEL_W. */
  panel:{dx:2, dy:1, w:10},
  /* dx follows the panel's width and dy its height, so Next keeps hanging off
     the panel's lower-right corner whatever size the panel is */
  save: {w:2, h:1},
  /* the figure's worst-case extent, for fitting. spanW is the FULL reach to
     Next's far edge, not just the panel's: dx 2 + the panel's real width (9)
     + Next (2) = 13, and the colourway reaches exactly the same 13 the other
     way round — 2 + an 8-cell panel (see PANEL_W_ID) + a 3-cell Create (see
     SAVE_W_ID). THIRTEEN IS THE BAND, and it is not a soft limit: at
     1728x1117 a fourteenth column puts the step marker half a cell off the
     left of the screen, and snakeFits cannot see it because iMin is derived
     from this very number. Anything that wants another column has to take it
     from a panel. Forgetting Next's
     reach here (an 11 tried on 16 Aug) is what broke every single question:
     snakeFits checks EACH part clears the poster, Next's box was the one that
     didn't, so every question fell to the anchored fallback and the corner
     rule broke everywhere at once — not a cosmetic miss, a functional one.
     The 3-cell Create was the same trap one question wide, and the reason its
     panel gives a cell back rather than this number growing.
     spanH is the figure's TRUE reach below its marker: the panel hangs one row
     down and is PANEL_H (10) tall, and Next takes one more row off its foot —
     1 + 10 + 1 = 12. */
  spanW:13, spanH:12,
  /* Zero. This was a cell of clearance I had added between the figure and the
     poster's keep-out box; spending it on the panel is what the extra width
     costs, and Save may sit flush against that edge. The keep-out box already
     carries a cell of air of its own (see unionBox), so the poster is still
     never touched. */
  air:0,
  /* Cells of drop from the top of the viewport before the first marker. The
     snake used to start hard against the top edge; three cells down gives it
     somewhere to begin from rather than arriving already cut off. Clamped in
     snakeBand so it can never push the last question's Next off the bottom.
     Karin's "two cells lower" (16 Aug) is NOT a change to this number: three
     cells is what it always asked for, and the clamp was quietly eating two of
     them by reserving a worst-case panel under every question. See snakeReach.
     Two, not three (Karin, 16 Aug): "the question numbers should start one row
     upwards" — the whole run steps up a cell, markers, panels and Next with it,
     since every part of the figure hangs off the first marker's row. */
  top:2,
  /* HOW MANY COLUMNS THE WALK USES. Two, and the second one is what makes this
     a snake rather than a list: every question steps one cell diagonally from
     the last, so the trail of answered markers zigzags down the board instead
     of stacking in a single file.

     THE WHOLE FIGURE MOVES, not just the marker (Karin, 17 Aug). Every part of
     the figure is an offset from the marker's own cell, so the counter, the
     panel and Next all step across with it and the corner rule holds on every
     single question — the panel always hangs off the counter's bottom-right
     corner, never merely under it. The price is stated plainly because it is
     the rule this reverses: the panel's left edge is NO LONGER a fixed inset
     from the screen edge, it alternates between QUESTION_LEFT_CELLS and one
     column further in. That was the 16 Aug rule, and this is the 17 Aug one;
     both were asked for, and the corner rule won.

     One is a straight column, which is what this was between the two dates.
     Three or more would need a triangle wave in snakeCell rather than the
     modulo it uses — with two lanes the two are the same walk. */
  lanes:2
};

/* The free band, in grid cells from the origin. Two numbers per axis: the
   viewport's own limit, and the poster union's near edge. */
function snakeBand(){
  const cell=cellSize(), vw=window.innerWidth, vh=window.innerHeight;
  const halfW=Math.floor((vw/2)/cell), halfH=Math.floor((vh/2)/cell);
  /* the union's LEFT edge in cells, since the sheet is no longer centred */
  const uL=unionBox().cl-SNAKE.air;
  /* The marker's column is bounded by where the WHOLE FIGURE still clears the
     poster, not by where the marker alone does. The figure is 11 cells across
     and the clear band beside the poster is about 16 at a desktop width, so the
     slack is only a few columns — which is exactly the amplitude the mock's own
     step from column 1 to column 2 implies. Bounding the marker instead of the
     figure was a bug: it let the walk wander to the union's edge and then had
     nowhere legal to open, and the fallback put the panel on the poster. */
  /* spanW is now the figure's TRUE reach (dx 2 + a 9-cell panel), so it is spent
     exactly — the spare cell this used to subtract was the snake's second
     column, and without it the run drops to a single file. */
  const iMax=uL-SNAKE.spanW;
  /* The drop, but never further than the last question can afford: the figure
     reaches spanH rows below its own marker, and the final marker is (N-1) rows
     below the first, so the whole run has to end above the viewport's edge. */
  /* The deepest question's foot, measured rather than assumed — see snakeReach. */
  const need=snakeReach();
  /* THE RUN HANGS OFF THE SHEET, NOT OFF THE TOP OF THE SCREEN, and this is the
     one number that decides where the whole question system sits.

     It used to start at the first full row on the screen (-halfH + SNAKE.top),
     which reads as the same thing only as long as the sheet happens to start
     around there too. It does not any more: the cell is sized so the MADE sheet
     fits (see MAXR_FULL), so the sheet begins lower down the screen while the
     screen's own first row is where it always was, and the mark drifted two rows
     clear of the sheet's top line with the questions behind it.

     So it is stated instead of coincidental. The mark's box is LOGO_ROWS_ABOVE
     over the first marker and one cell tall, so putting its FOOT on the sheet's
     top line — the bold line, the thing the eye actually lines the mark up with
     (Karin, 17 Aug) — fixes the first marker one row under that line, and the
     run follows from there. Any format, any window: the sheet's own top row is
     the anchor, so this holds when the format changes too.

     Both clamps stay. The screen's first row is a floor, so a very tall sheet
     cannot push the mark off the top; the run's own reach is a ceiling, so a
     long session still starts high enough to land its last panel on screen. */
  const anchor=sheetCols().top-1+LOGO_ROWS_ABOVE;
  const jMin=Math.min(Math.max(-halfH+SNAKE.top, anchor), halfH-need);
  /* THE WALK'S LANES. QUESTION_LEFT_CELLS sets the PANEL's inset on the HOME
     lane, so the home marker sits panel.dx cells further in, at
     QUESTION_LEFT_CELLS-SNAKE.panel.dx from the screen edge; the other lanes
     step in from there, one column each (see SNAKE.lanes).

     THE BOUND IS ON THE LAST LANE, NOT THE FIRST, and that is the one thing
     that can go wrong here. iMax is the rightmost column a whole figure still
     fits in — the poster is at uL and the figure reaches spanW past its own
     marker — so what has to clear is the DEEPEST lane, home + lanes - 1. Bound
     the home column instead and the far lane walks straight into the sheet.
     On a window too narrow even for that, the whole run slides left rather than
     dropping a lane: it keeps the shape and loses the margin, which is the way
     round that stays legible. */
  const wide=SNAKE.lanes-1;
  const home=Math.min(-halfW+QUESTION_LEFT_CELLS-SNAKE.panel.dx, iMax-wide);
  return {
    iMin:home, iMax:home+wide,
    jMin, jMax:halfH-1,
    uL, halfW, halfH, cell
  };
}

/* LENGTHWISE, AND ACROSS. The snake descends one row per question and steps one
   column sideways with it, so consecutive markers are diagonal neighbours and
   the trail of them zigzags — which is the entire reason this is called a
   snake and not a list. It ran straight down a single column between 16 and 17
   Aug, for the margin reason set out on SNAKE.lanes.

   The sequence still spends the screen's HEIGHT, not its width: the lanes are a
   fixed couple of columns and the run is as long as there are questions. That
   is the way round that fits, since the clear band beside the poster affords
   thirteen columns of figure and barely one to spare. */
function snakeCell(n){
  const B=snakeBand();
  /* Modulo, not a bounced triangle wave: at two lanes 0,1,0,1 IS the zigzag,
     and a wave would be code written for a third lane that does not exist.
     Guarded anyway — a band too narrow for two collapses iMax onto iMin, and
     the walk quietly goes back to a single file rather than dividing by zero. */
  const lanes=B.iMax-B.iMin+1;
  return {i:B.iMin + (lanes>1 ? n%lanes : 0), j:B.jMin+n};
}

/* The four rects of the figure, given a marker cell and which way it opens.
   sx/sy are ±1; the mock is (+1,+1). Mirroring reflects every offset about the
   marker, so the corners still touch and the figure keeps its shape. */
/* HOW BIG THE PANEL HAS TO BE for this question, in whole cells.

   A fixed 6x6 gave the short questions a field of white between the words and
   the answer and crowded the long ones. So the height is computed: how many
   lines the title wraps to at the panel's width, plus the room this question's
   own control needs, rounded up to whole cells — the grid still decides the
   edges, it just decides a different number of them per question.

   The line count is estimated from the string rather than measured in the DOM
   on purpose: renderSnake builds one markup string with no layout pass in the
   middle, and reading back an element's height would force one on every repaint
   and every keystroke of a drag. An estimate that is occasionally a line out
   costs a cell of white; a layout thrash costs the drag's smoothness. */
/* 0.62 of a cell, up from 0.52 and 0.372 before that: the question is the loudest
   thing in the piece and was reading as caption-sized. The panel is 7 cells wide
   now rather than 6 — the widest the band allows while still leaving the zigzag
   its second column. Only the panel grew; markers and Save are untouched. */
/* ONE HUG FOR THE WHOLE PANEL.
   Q_INSET is the only inset any child of the panel may use, and every one of
   them uses it: the title, the month circles, the binary's two cells, and the
   wheel's arc. They were drifting apart — the title sat 0.44 of a cell off the
   frame and the circles a whole one — and the eye reads that as two different
   panels stacked, because a shared edge is the only thing that says they belong
   to one. If this number changes, everything inside moves together. */
/* MEASURED OFF THE FIGMA NODE (2739:3508), not chosen: the panel there is
   365 x 263, and each number below is that drawing's pixel measure divided by
   its width and multiplied by the panel's ten cells. So they are proportions,
   and they hold at any cell size.
     inset   15/365   title  22/365   leading 32/365
     hint  13.5/365   hint leading 20/365   gap 15/365                        */
/* Title: 22px at the Figma cell (0.603), leading 1.33 -> 0.603*1.33 = 0.802.
   (The old 0.877 was 32/365, a looser 1.45 leading from an earlier node.) */
const Q_FS=0.603, Q_LH=0.802, Q_INSET=0.411;
const Q_GAP=0.411;                          // cells between the words and the control
const CIRCLE_GAP=0.1;                        // gap between answer circles, in cells (smaller gap = bigger circles)
/* THE ANSWER CIRCLE, in cells, and the ONE place its size is decided. The month
   grid sets it — four across the hugged width with CIRCLE_GAP between them — and
   the compass takes the same number rather than deriving its own, so the two
   questions cannot drift into two different sizes of the same mark. */
const RING_COLS=4;
const ringCircleD=W=>((W-2*Q_INSET)-(RING_COLS-1)*CIRCLE_GAP)/RING_COLS;
const CIRCLE_D_MAX=1.6;                      // cap the circle diameter so few-option rows keep a normal gap
/* A per-question cap, checked before the shared one, and ALL THREE CIRCLE ROWS
   ARE NOW UNCAPPED — Karin, 16 Aug: questions 4 and 7 "should look the same
   as 9".

   They were three four-option rows in three panels of the same width, and they
   still came out in two sizes: saying was uncapped and took the width-fit
   diameter (1.9695, the same 4-column arithmetic as ringCircleD), while febdays
   and vacations were clipped to 1.82 and then CENTRED, which left 0.71 of a
   cell at each end against saying's 0.41. So the difference read twice over —
   smaller marks, and a row that did not line up with the words above it.

   Uncapped, all three compute the same 1.9695 and end exactly on Q_INSET, so
   the row's edges meet the question's. With the vertical settle on top (see
   SETTLE_CONTROL) the three panels come out identical: 1.9695 across, 0.41 at
   the sides, 0.647 above and below.

   Q1's rings follow, and are meant to: shapeDuoMarkup sizes itself from
   circleCap(BANK.febdays) precisely so the ring and the answer circle can never
   be two sizes of one mark. They grow with it, to 1.9695.

   CIRCLE_D_MAX below is not dead — it is what a NEW row with fewer than four
   options would fall to, where the width-fit diameter would come out huge. */
const CIRCLE_D_MAX_ID={febdays:Infinity, vacations:Infinity, saying:Infinity};
const circleCap=q=> (q && CIRCLE_D_MAX_ID[q.id]!==undefined) ? CIRCLE_D_MAX_ID[q.id] : CIRCLE_D_MAX;
const COLORWAY_D_MAX=2.3;                     // cap the colourway swatch so its two rows fit the 7-cell panel
/* The small line under the question. Quieter than the question in size and in
   weight of red, because it is an aside — it opens the question up rather than
   restating it, and it must never compete with it for the first read. */
/* Hint: 14px at the Figma cell (14/36.68 = 0.382), leading 1.33 -> 0.508, and
   8px between the title and the hint (the Figma flex gap) -> 0.218. */
const Q_HFS=0.382, Q_HLH=0.508, Q_HGAP=0.218;
/* WIDTH PER QUESTION, in cells, capped by SNAKE.panel.w.
   Nine cells across, per the Figma redesign — which also restores the snake's
   second lane (lanes = 14 - spanW), so the run zig-zags again. The month grid's
   four tangent circles and three rows come out ~9x9, and the wheel's arc keeps
   its width from the derived radius (see DIAL_R_MAX). */
const PANEL_W={number:9, choice:9, duo:9, bar:9};
/* EIGHT FOR THE COLOURWAY, and this is what pays for its 3-cell Create.
   The run is spent to the cell: the band beside the poster affords THIRTEEN
   columns of figure and no more (see spanW, and the sizes it was checked at —
   at 1728x1117 a fourteenth column pushes the step marker clean off the left
   edge of the screen, and snakeFits cannot catch that because it bounds the
   marker against the very number that moved it). The colourway asks for one
   more cell of button than every other question, so it gives one back on its
   panel and the figure stays 13 wide: 2 + 8 + 3, against everyone else's
   2 + 9 + 2.
   It costs nothing visible. colorwayMarkup caps its swatch at COLORWAY_D_MAX
   and that cap already bound at nine cells (the width-fit diameter was 2.66
   against a 2.3 cap), so at eight it is still 2.3 — the same six swatches at
   the same size, centred in a box one cell narrower. */
const PANEL_W_ID={colorway:8};
const panelW=q=>Math.min(SNAKE.panel.w,
  (q && PANEL_W_ID[q.id]) || PANEL_W[q&&q.type] || SNAKE.panel.w);
/* ONE HEIGHT FOR EVERY QUESTION, in cells. The per-type and per-question height
   table (choice 10 / number 7 / bar 6 / colorway 7 / saying 9, circle rows to
   their content) is gone: per the Figma redesign every question card is the SAME
   10 x 9 block, and a control that comes up short hangs under the text at its
   Figma gap (ctrlGap) with the slack collecting at the FOOT — the way the
   updated Q1 node (2879:6431) breathes — never between the words and the
   control. */
const PANEL_H=10;
function panelSize(q){
  const w=panelW(q);
  const inner=w-2*Q_INSET;
  /* average glyph advance for this face at this size, as a fraction of the em */
  const cpl=Math.max(8, Math.floor(inner/(Q_FS*0.52)));
  const title=String(val(q.title,derive()));
  const lines=Math.max(1, Math.ceil(title.length/cpl));
  const hint=String(val(q.hint,derive())||'');
  const hcpl=Math.max(8, Math.floor(inner/(Q_HFS*0.50)));
  const hlines=hint ? Math.max(1, Math.ceil(hint.length/hcpl)) : 0;
  const hintH=hlines ? Q_HGAP + hlines*Q_HLH : 0;
  /* every card is the same block now — a control's own height no longer feeds
     the box; each markup function draws its control under the text instead */
  const H=PANEL_H;
  /* what is actually left for the control once the words have taken theirs —
     the pinned case can be tighter than `ctrl` asked for */
  const room=H - (Q_INSET + lines*Q_LH + hintH + Q_GAP + Q_INSET);
  return {w, h:H, titleLines:lines, hintLines:hlines, room:Math.max(0.5, room)};
}

/* How far the words reach from the panel top, in cells — so a control can hang
   at a FIXED Figma size just under the hint rather than being fitted to the room
   the panel leaves (which silently rescaled the wheel and the month grid). */
function textBottomCells(q){
  const ps=panelSize(q);
  return Q_INSET + ps.titleLines*Q_LH + (ps.hintLines ? Q_HGAP + ps.hintLines*Q_HLH : 0);
}
/* The gap between the words and the control, per question, from Figma (px/36.68).
   shape and density keep the landing screens' own measure — 26px on that
   drawing's 45px cell (node 2879:6431) — since their controls came over intact.
   month tightened from 18 to 6 (Karin, 16 Aug): the ring grid's raw content
   measured 10.25 cells (see panelHeightCells) — just past the whole-cell
   ceiling, rounding the panel up to 11 and hanging Next a whole cell lower
   than it needed to. Trimming this one gap brings the raw height to ~9.93,
   which ceils to 10 instead — the panel comes back to a square-ish 9x10, the
   grid sits a bit higher under the hint, and Next follows it up by exactly
   one cell (its top is panel.top + panel.height — see renderSnake). */
/* No `alarms` here on purpose. It had a 5/36.68 entry, and it was dead — the
   wheel is the one control that does not read this table, because its gap has
   to appear in three places at once (the flow margin, the viewBox crop and the
   circle's centre) and so lives in DIAL_GAP. Two numbers for one gap that no
   longer agreed with each other is a trap, not a spare. */
const CTRL_GAP={ month:6/36.68, vacations:23/36.68, febdays:15/36.68,
                 shape:26/45, density:26/45 };
const ctrlGap=id=>CTRL_GAP[id]!==undefined ? CTRL_GAP[id] : Q_GAP;

/* THE PANEL'S INSIDES, as markup. Extracted so the run's reach can be MEASURED
   from exactly what renderSnake will draw — two copies of this would drift and
   the drift would show up as a run that sits a row off. */
function panelInner(q,c,PH,PW){
  return '<div class="qflow" style="padding:'+(Q_INSET*c).toFixed(1)+'px 0">'
    + '<h2 style="margin:0 '+(Q_INSET*c).toFixed(1)+'px;'
    +          'font-size:'+(Q_FS*c).toFixed(1)+'px;line-height:'+(Q_LH*c).toFixed(1)+'px">'
    + esc(val(q.title,derive())) + '</h2>'
    + (val(q.hint,derive())
        ? '<p class="qhint" style="margin:'+(Q_HGAP*c).toFixed(1)+'px '+(Q_INSET*c).toFixed(1)+'px 0;'
          + 'font-size:'+(Q_HFS*c).toFixed(1)+'px;line-height:'+(Q_HLH*c).toFixed(1)+'px">'
          + esc(val(q.hint,derive())) + '</p>'
        : '')
    + panelControl(q,c,PH,PW)
    + '</div>';
}

/* HOW FAR THE RUN REALLY REACHES, in rows below the FIRST marker.

   Panels hug their content and are then snapped up to whole cells, so the old
   reserve — a worst-case SNAKE.spanH under the LAST question — was wrong twice
   over: too generous for the short questions and, since the tallest panel is
   eleven cells rather than the declared ten, not generous enough for the month.
   Being too generous is what showed: the band could not honour SNAKE.top's
   three-cell drop, so the whole run rode up against the top edge and started
   two cells higher than the composition asks for.

   Measured instead. Each question's foot is its own marker's row, plus the
   panel hanging one row below it, plus Next one row below that; the run's reach
   is the deepest of those. Heights come off a detached probe built from
   panelInner, cached per question per cell size — a resize re-measures, a
   repaint does not. */
let panelHCache={key:null, rows:0, h:{}};
function panelHeightCells(q,c){
  if(panelHCache.h[q.id]!=null) return panelHCache.h[q.id];
  const PS=panelSize(q);
  const probe=document.createElement('div');
  probe.style.cssText='position:absolute;visibility:hidden;left:-9999px;top:0';
  probe.innerHTML='<div class="qpanel" style="width:'+(PS.w*c).toFixed(1)+'px;height:auto">'
                + panelInner(q,c,PS.h,PS.w) + '</div>';
  document.body.appendChild(probe);
  const h=Math.max(1, Math.ceil(probe.firstChild.offsetHeight/c - 0.01));
  probe.remove();
  panelHCache.h[q.id]=h;
  return h;
}
function snakeReach(){
  const c=cellSize(), key=c.toFixed(2)+'|'+ASKED.map(q=>q.id).join(',');
  if(panelHCache.key===key) return panelHCache.rows;
  panelHCache={key, rows:0, h:{}};
  let deepest=SNAKE.spanH;
  ASKED.forEach((q,n)=>{ deepest=Math.max(deepest, n + 1 + panelHeightCells(q,c) + 1); });
  panelHCache.rows=deepest;
  return deepest;
}

/* THE WAY OUT IS THREE CELLS WIDE ON THE LAST QUESTION ONLY (Karin, 16 Aug):
   the colourway's button reads "Create" rather than "Next", because it is the
   one press that makes the poster instead of walking to the next question, and
   a two-cell box could not hold the word at the button's own size without it
   crowding both edges. Every other question keeps SNAKE.save.w. */
/* WHICH QUESTION ENDS THE ASKING. One predicate, because four separate things
   key off it — the button's width, its word, its size, and the fact that
   pressing it makes the poster rather than walking on (see the .qsave branch in
   the qsys click handler) — and they must not be able to disagree about which
   question that is. */
const isCreateQ=q=>!!q && q.id==='colorway';
const SAVE_W_ID={colorway:3};
const saveW=q=>(q && SAVE_W_ID[q.id]) || SNAKE.save.w;
/* and the word on it, for the same reason and by the same key */
const saveLabel=q=>isCreateQ(q) ? 'Create' : 'Next';
/* and the size it is set at. 0.26 of a cell is the walking size — it belongs to
   a button you press nine times without looking at it. The tenth press is the
   one that makes the poster, and it is now set a third larger (Karin, 16 Aug),
   which is also what the 3-cell box was widened to hold. */
const saveFS=q=>isCreateQ(q) ? 0.34 : 0.26;

/* ---------------------------------------------------------------------
   THE WAY OUT, once the poster is made.

   Four boxes standing on THE LAST QUESTION'S OWN CORNER — the column and the
   row where the tenth panel's top-left sat, taken from snakeFigure itself
   rather than worked out again here, so the two can never disagree. That is
   the corner the eye is already on when Create is pressed: the way out
   arrives where the question left off, not back at the top of the run
   (Karin, 16 Aug — it started on question one's row and read as a jump).

   Five cells by one, because "SAVE AS PNG" is eleven characters at the
   Create button's own size (saveFS's 0.34) and a four-cell box crowds both
   ends of it. One clear row between each, so four cells on the inverted
   ground read as four separate presses rather than one block with three
   words in it.
   --------------------------------------------------------------------- */
const OUT_W=5;
const OUT_ACTS=[{act:'png',  label:'Save as PNG'},
                {act:'jpg',  label:'Save as JPG'},
                {act:'svg',  label:'Save as SVG'},
                {act:'back', label:'Back'}];
/* rows from the first box's top to the last one's foot: three clear rows
   between four boxes, plus the boxes themselves */
const OUT_ROWS=(OUT_ACTS.length-1)*2+1;
function finishFigure(){
  const B=snakeBand();
  const F=snakeFigure(Math.max(0,ASKED.length-1));
  /* never off the bottom: on a short window the last question's panel can sit
     low enough that four boxes below it would not fit, and then the run starts
     as far down as it can while keeping Back on the screen */
  const r=Math.min(F.panel.r, B.halfH-OUT_ROWS);
  return OUT_ACTS.map((o,n)=>({...o, box:{c:F.panel.c, r:r+n*2, w:OUT_W, h:1}}));
}

function snakeParts(i,j,sx,sy){
  const PH=snakeParts.h||6, PW=snakeParts.w||SNAKE.panel.w;
  /* set by snakeFigure from the question in hand; SNAKE's own number when the
     figure is being sized without one (the landing's placeholder) */
  const SW=snakeParts.saveW||SNAKE.save.w;
  const put=(o)=>({
    c: sx>0 ? i+o.dx : i-o.dx-(o.w-1),
    r: sy>0 ? j+o.dy : j-o.dy-(o.h-1),
    w:o.w, h:o.h
  });
  return {
    step:{c:i, r:j, w:1, h:1},
    total:put(SNAKE.total),
    panel:put({...SNAKE.panel, w:PW, h:PH}),
    /* Save hangs off the panel's lower-right corner, so its row follows the
       panel's height rather than being a constant */
    save:put({...SNAKE.save, w:SW, dx:SNAKE.panel.dx+PW, dy:1+PH})
  };
}

/* Does every part sit inside the viewport and clear of the union? */
function snakeFits(P,B){
  const U=unionBox(), uH=Math.ceil(MAXR/2+1)+SNAKE.air;
  for(const k of ['step','total','panel','save']){
    const r=P[k];
    if(r.c<B.iMin || r.c+r.w>B.halfW) return false;
    if(r.r<B.jMin || r.r+r.h>B.halfH) return false;
    /* clear of the union: entirely left of it, right of it, above or below */
    /* BELOW is lower than ABOVE is high, by the record's rows: the made sheet
       grows downward and nothing may end up under it (see unionBox) */
    const clearX = (r.c+r.w<=U.cl) || (r.c>=U.cr);
    const clearY = (r.r+r.h<=-uH) || (r.r>=uH+RECORD_ROWS);
    if(!clearX && !clearY) return false;
  }
  return true;
}

/* The figure for question n: its marker, and the first opening direction that
   fits. Down-right is the mock and is always tried first. */
function snakeFigure(n){
  const B=snakeBand(), m=snakeCell(n);
  /* the panel's REAL height, not panelSize's nominal PANEL_H(10) — the same
     fix snakeReach needed. Using the nominal here starved the last questions:
     a 7-cell panel (saying, colorway) was checked as if it were 10, pushed
     Next three rows past B.jMax that were never actually needed, and both
     fell to the anchored fallback despite fitting for real. snakeParts still
     wants a WIDTH (panelSize's w is fine, unaffected by hugging). */
  const q=ASKED[n];
  const PS = q ? {w:panelSize(q).w, h:panelHeightCells(q,cellSize())} : {w:SNAKE.panel.w, h:6};
  snakeParts.h=PS.h; snakeParts.w=PS.w; snakeParts.saveW=saveW(q);
  for(const [sx,sy] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
    const P=snakeParts(m.i,m.j,sx,sy);
    if(snakeFits(P,B)) return {...P, sx, sy, i:m.i, j:m.j, fitted:true};
  }
  /* NO DIRECTION FITS, and with a horizontal snake that is the normal case
     rather than the edge one: the run is 9 columns, the figure is 11, and the
     clear band beside the poster is 13 — so the two cannot both hang off the
     same column once the markers have marched right.

     Rather than let the fallback drop the panel on the poster, the panel and
     Save anchor to the snake's OWN START, under the first marker, where 11
     columns always fit. The step and total stay on the live marker.

     This BREAKS the corner rule for the panel — it no longer touches the marker
     it belongs to — and that is a real loss which wants a decision, not a
     default. Flagged rather than hidden. */
  const anchored=snakeParts(B.iMin, B.jMin+2, 1, 1);
  return {step:{c:m.i, r:m.j, w:1, h:1},
          total:snakeParts(m.i,m.j,1,1).total,
          panel:anchored.panel, save:anchored.save,
          sx:1, sy:1, i:m.i, j:m.j, fitted:false, anchored:true};
}

/* cells -> pixels, against the same origin and cell every other layer uses */
function cellBox(r){
  const o=gridOrigin(), c=cellSize();
  return {left:o.x+r.c*c, top:o.y+r.r*c, w:r.w*c, h:r.h*c};
}
const cssBox=b=>'left:'+b.left.toFixed(1)+'px;top:'+b.top.toFixed(1)+'px;'
              + 'width:'+b.w.toFixed(1)+'px;height:'+b.h.toFixed(1)+'px';

/* ---------- draw the dots ---------- */
function renderDots(){
  const vw=window.innerWidth, vh=window.innerHeight, cell=cellSize();
  const o=gridOrigin();
  const at=d=>({x:o.x+d.i*cell, y:o.y+d.j*cell});
  const wrap=inner=>'<svg viewBox="0 0 '+vw+' '+vh+'" preserveAspectRatio="none">'+inner+'</svg>';
  const c=card.classList.contains('open') ? cardBox : null;
  const buried=(p,r,qid)=>c && qid!==pinnedQ &&
    p.x>c.left-r && p.x<c.right+r && p.y>c.top-r && p.y<c.bottom+r;

  /* the decorative layer is deliberately empty — the starfield is gone (see
     computeDots). The element stays because the question dots are z-indexed
     against it, and because emptying it is one assignment rather than a
     rework of the stack. */
  dotsDeco.innerHTML='';

  /* EVERY open question pulses, not just the first of them. During the linear
     lead that is one dot; at the fork it is both of the questions you may
     answer, which is what makes the choice visible — a single pulse there would
     read as an instruction rather than an option. */
  const avail=availableQs();
  const marks=DOTS.filter(d=>d.qid).map(d=>{
    const H=hierarchy(d.qid,cell), p=at(d);
    if(buried(p,H.r,d.qid)) return '';
    const q=BANK[d.qid];
    const open=d.qid===pinnedQ;
    const next=avail.includes(d.qid) && !open;
    const locked=!canOpen(d.qid);
    const cx=p.x.toFixed(1), cy=p.y.toFixed(1);
    const n=ASKED.findIndex(x=>x.id===d.qid)+1;
    let g='<g class="qdot'+(open?' is-open':'')+(locked?' locked':'')+'" data-qid="'+d.qid+'"'
        + (locked?'':' tabindex="0" role="button"')
        + ' aria-label="'+pad2(n)+' of '+pad2(ASKED.length)+'. '
        + (q?q.title.replace(/"/g,''):d.qid)
        + (H.passed?' (skipped)':H.done?' (answered)':
           locked?' (locked, answer earlier questions first)':'')+'">';
    if(next) g+='<circle class="pulse" cx="'+cx+'" cy="'+cy+'" r="'+(H.r+2).toFixed(1)+'"/>';
    if(open) g+='<circle class="halo" cx="'+cx+'" cy="'+cy+'" r="'+(H.r+7).toFixed(1)+'"/>';
    /* generous target when shut — and never smaller than half a cell, so a
       receded dot stays as easy to hit as a near one; shrunk while its card is
       open, so it cannot swallow clicks meant for the controls beside it */
    g+='<circle class="hit" cx="'+cx+'" cy="'+cy+'"'
      + ' r="'+(open?H.r+2:Math.max(H.r+13, cell*0.5)).toFixed(1)+'"/>';
    if(!locked) g+='<circle class="hover" cx="'+cx+'" cy="'+cy+'" r="'+(H.r+5).toFixed(1)+'"/>';
    /* a broken ring for skipped: same weight as answered, but visibly not the
       same thing. The dash is derived from the radius so it stays four even
       gaps at any size. */
    const dash=H.passed
      ? ' stroke-dasharray="'+(H.r*0.9).toFixed(1)+' '+(H.r*0.62).toFixed(1)+'"' : '';
    const state=H.fill?' filled':H.passed?' passed':' done';
    g+='<circle class="core'+state+'" cx="'+cx+'" cy="'+cy+'"'
      + ' r="'+H.r.toFixed(1)+'" opacity="'+H.op.toFixed(2)+'"'+dash+'/>';
    return g+'</g>';
  }).join('');

  /* The question dots are gone too, and with them the guide line and the start
     cue that pointed at them: the snake states the sequence and the position in
     it, so a second notation for the same thing was noise. `marks` is still
     built above because hierarchy() is what decides a question's state and that
     is worth keeping in one place — it is simply no longer drawn here. */
  void marks;
  dotsInt.innerHTML='';
  renderSnake();
}

