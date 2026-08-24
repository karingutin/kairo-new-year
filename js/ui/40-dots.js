/* =====================================================================
   Interface — the dots are the questions.

   Each drawn question owns a dot on the grid. Nothing is open until a
   dot is clicked; the card then pins a corner to that dot and grows out
   of it. The dots themselves carry the progress: a ring is unanswered,
   a filled disc is answered, and the next one to do pulses.
   ===================================================================== */
const root=document.documentElement;
const frame=document.getElementById('frame');
const plys=[document.getElementById('plyA'),document.getElementById('plyB')];
const card=document.querySelector('.popup');
const cardBody=document.getElementById('cardBody');
const dotsDeco=document.getElementById('dots');
const dotsInt=document.getElementById('dotsInt');
const qsys=document.getElementById('qsys');
const statusBar=document.getElementById('status');
const fmtBtn=document.getElementById('fmtBtn');
const fmtMenu=document.getElementById('fmtMenu');
const resetBtn=document.getElementById('reset');
const logoEl=document.getElementById('kairo');
const landing=document.getElementById('landing');
const landingBody=document.getElementById('landingBody');

/* The sheet measured from layout, NOT from getBoundingClientRect. The world
   layer carries a 3D transform, and a measured rect would come back tilted and
   panned, dragging every dot and card position with it. offsetLeft/Top/Width/
   Height are layout values and ignore transforms. */
function sheetRect(){
  const l=frame.offsetLeft, t=frame.offsetTop, w=frame.offsetWidth, h=frame.offsetHeight;
  return {left:l, top:t, width:w, height:h, right:l+w, bottom:t+h};
}

/* ONE GRID CELL, in screen pixels — and the single source of truth for it.
   A function of the VIEWPORT alone: it does not know which format is showing,
   which is the whole reason the grid holds still through a format change.

   The divisors are the widest and the tallest format, so the cell is small
   enough that no format can overflow. 78dvh rather than a tighter fit is
   deliberate: the union of every footprint is two cells larger again than the
   tallest one, and every point given back here widens the bands top and bottom
   that the dot field has to live in.

   JS owns this and writes it to CSS, rather than CSS owning it and JS reading
   it back — so the grid the dots are placed on and the grid the background
   paints are computed from the same expression and cannot drift apart. */
/* No pixel floor here on purpose: a floor would make the poster comfortably
   large on a narrow phone at the cost of letting the tallest format overflow
   the screen, and every format displaying in full is worth more than a bigger
   poster on mobile. */
/* 0.78 of the viewport's height. This was briefly 0.62 — the poster displayed
   smaller so the band beside it could hold a wider panel — and the grid it made
   was wrong: a finer lattice over a smaller poster. The poster's display size is
   not the place to buy panel width. */
/* Bumped ~7% (0.88->0.94, 0.78->0.835) so the poster grows toward the size Karin
   marked — about one cell larger each way. It is a UNIFORM scale of the whole
   grid, so the poster and the interface grow together and every cell relationship
   (and so `touchesPoster`) is unchanged. */
/* MAXR_FULL, not MAXR: what has to fit is the tallest SHEET, and once the
   poster is made that is the artwork plus the record's two rows. Reserving the
   room here means the Create press can lengthen the sheet without the cell, the
   grid, the mark or the questions moving at all — the space was always there.
   It costs the asking about a tenth of the poster's height. */
const cellSize=()=>Math.min(0.94*window.innerWidth/MAXC,
                            0.835*window.innerHeight/MAXR_FULL);
const syncCell=()=>root.style.setProperty('--cell', cellSize()+'px');
/* The grid's origin: the centre of the viewport, where a line falls by
   construction. Everything on the grid is counted from here — never from the
   sheet, which moves. */
const gridOrigin=()=>({x:window.innerWidth/2, y:window.innerHeight/2});
/* Where a dot sits. Dots are stored as integer grid coordinates (i, j) counted
   from the origin, so this is the only place they become pixels — which is why
   a format change never has to touch them. */
function dotXY(d){
  const o=gridOrigin(), c=cellSize();
  return {x:o.x+d.i*c, y:o.y+d.j*c};
}
/* WHERE THE SHEET SITS, in whole cells from the origin — the single source of
   truth, read by syncSheet, unionBox and the snake alike.

   CENTRED. It is centred on the grid's origin and stays that way: the poster is
   the subject of the piece and it belongs in the middle of the interface. This
   was briefly anchored right to buy the question panel more width; that was the
   wrong trade and it is not to be made again without asking. */
/* The sheet no longer sits on the origin: it is slid POSTER_SHIFT_CELLS to the
   right, into the open space, which widens the clear band on the left for the
   questions. QUESTION_LEFT_CELLS then insets that band from the screen's edge. */
/* THE BOARD'S WIDTH BUDGET, and it is exactly spent — every number below was
   solved against the others rather than chosen, so moving one alone breaks a
   neighbour. Across the 40 cells a 1512px window gives:

     3   left margin          SIDE_CELLS
     11  question figure      SNAKE.spanW (marker + 2 to the panel + a 9 panel)
     1   the snake's swing    the second column its zigzag needs
     16  the poster union     the widest format's 14, plus a cell of air a side
     6   the hover note       NOTE_CELLS
     3   right margin         SIDE_CELLS
     --
     40

   Karin's rule of 16 Aug is the two 3s: the questions sit three cells in from
   the left edge and the note's outer edge three cells in from the right, so the
   board reads even about the poster. Everything else fell out of making that
   true — the poster came left two cells, the figure's reserve dropped to what
   it actually uses (every panel is 9 wide, see PANEL_W; it had been reserving
   10 plus a spare cell), and the note gave up two cells of width, which is the
   one place the budget could still find them.

   THE EVEN 3s ARE GONE, and deliberately (Karin, 16 Aug): "questions should
   move 2 columns to the right, poster should move 2 columns to the right". The
   two move TOGETHER, so the composition keeps its own spacing and the whole of
   it slides two cells across the board. What that spends is the right margin —
   the poster's far edge lands two cells nearer the screen edge and the hover
   note, which is pinned to that edge, has the room it moves in taken out from
   under it. The board no longer reads even about the poster; it reads as
   weighted right, which is the arrangement asked for. */
const SIDE_CELLS=3;           // the margin, both sides — to the PANEL, not the marker
const NOTE_CELLS=6;           // the hover note's width
/* and its HEIGHT, fixed rather than hugged (Karin, 16 Aug: one row shorter, and
   "the hover container should be limited to 6 width and 3 height"). It used to
   grow to its text and snap up, which came out at four rows for every read in
   the bank. Three is a real constraint on the copy, not just on the box: title
   plus three body lines is what fits, and NOTE_TGAP below is tightened from the
   shared Q_HGAP to buy the third of those lines. */
const NOTE_ROWS=3;
/* Title to body inside the note. 0.15 of a cell, against Q_HGAP's 0.218 — the
   sum has to clear three cells: hug .411 + title .483 + THIS + 3 body lines
   1.524 + hug .411 = 2.979. At Q_HGAP it comes to 3.047 and the third line is
   cut off. The gap between a heading and its own body is the right place to
   find 4px when a card gets shorter; the hug is not, because it is shared. */
const NOTE_TGAP=0.15;
const POSTER_SHIFT_CELLS=5;   // right of centre: questions on the left, notes on the right
/* QUESTION_LEFT_CELLS is the PANEL's inset ON THE HOME LANE — see the comment
   on `home` in snakeBand for how the marker's column is derived from it, and
   the note on SNAKE.lanes for why there is a second lane one column further in.
   FIVE, not SIDE_CELLS (Karin, 16 Aug: "questions should move 2 columns to the
   right"). It no longer tracks the note's inset on the opposite edge, so it is
   written as its own number rather than as SIDE_CELLS: the two were equal
   because the board was meant to read even about the poster, and that is the
   thing that was just given up on purpose. Moving in step with
   POSTER_SHIFT_CELLS is what keeps the gap between the questions and the poster
   the same while both slide across. */
const QUESTION_LEFT_CELLS=5;
function sheetCols(F){
  F=F||FMT();
  return {left:-Math.round(F.cols/2)+POSTER_SHIFT_CELLS,
          right:-Math.round(F.cols/2)+F.cols+POSTER_SHIFT_CELLS,
          top:-Math.round(F.rows/2)};
}
/* The largest footprint any format can take, plus a cell of air, carried with the
   same rightward shift. Nothing of the interface may enter this, so no format
   change can ever bring the poster onto a question. */
/* AND IT IS NOT SYMMETRICAL ANY MORE. Every format is centred on the origin
   while it is being answered, so the top, the left and the right are the
   artwork's own half-heights as they always were — which is what keeps the
   KAIRO mark on the sheet's top line. The record hangs BELOW the artwork, so
   only the bottom is let out, by exactly the rows it takes. Folding those rows
   into MAXR instead moved all four edges and lifted the whole interface a cell
   off the poster (Karin, 17 Aug). */
function unionBox(){
  const o=gridOrigin(), c=cellSize(), s=POSTER_SHIFT_CELLS;
  const hw=(MAXC/2+1)*c, hh=(MAXR/2+1)*c;
  return {l:o.x-hw+s*c, r:o.x+hw+s*c, t:o.y-hh, b:o.y+hh+RECORD_ROWS*c,
          /* in cells, for the snake */
          cl:-Math.ceil(MAXC/2+1)+s, cr:Math.ceil(MAXC/2+1)+s};
}

const QDOT_R=9;            // a question dot
const CARD_MAX_H=520;      // worst-case card height, used when siting question dots
const EDGE=14;
const CORNERS=[['top left',1,1],['top right',-1,1],['bottom left',1,-1],['bottom right',-1,-1]];

const cardWidth=()=>Math.round(Math.min(400, 0.88*window.innerWidth));
/* How narrow the card may get in order to stay anchored to its dot and off the
   poster. The month grid reflows to two columns on the way down (see .choice),
   so this is set by the question TEXT staying readable rather than by the
   controls — below it the card is doing nobody any favours. */
const CARD_MIN_W=248;

let DOTS=[], openQ=null, pinnedQ=null, introOpen=false, rafId=null;
/* THE POSTER IS MADE. Set by the tenth question's Create and cleared by Back or
   Reset. It is the one piece of state the whole ending hangs off: the question
   system draws the way out instead of a question (see renderSnake), and the
   board's ground inverts (body.made — see the rule at the foot of 00-ground).
   The poster itself does not read it at all, which is the point: nothing about
   the sheet changes when it is made, only what is around it. */
let posterDone=false;
/* The card's laid-out box, recorded by placeCard. Do NOT measure the card with
   getBoundingClientRect for this: the open animation scales it from 0.38, so a
   measurement taken mid-animation reports a box far smaller than the real one,
   and dots that end up under the card are missed. */
let cardBox=null;
/* openQ   = the question being answered (null on the finish card)
   pinnedQ = the dot the card physically hangs from — tracked separately so
             the anchor dot stays visible even when no question is open */

/* ---------- which questions are done ---------- */
const isDone=id=>!!S.done[id];
const allDone=()=>ASKED.every(q=>isDone(q.id));
/* WHICH QUESTIONS ARE OPEN RIGHT NOW.

   The sequence has two phases. For the first CONFIG.LINEAR_LEAD questions only
   ONE is open at a time — those are the base of the poster and are meant to be
   walked through in order. After them the path forks and any of the next
   CONFIG.OPEN_AHEAD is open, so there is always a choice of where to go next.

   Anything further along stays locked; anything already answered can always be
   revisited.

   Nothing is open at all until the opening screen is done. This is the ONE
   guard that gates the whole board, and everything downstream (canOpen, the
   pulse, the "Start here" cue) reads through it rather than each re-checking
   S.baseDone on its own. */
function availableQs(){
  if(!S.baseDone) return [];
  const remaining=ASKED.filter(q=>!isDone(q.id));
  const answered=ASKED.length-remaining.length;
  const width = answered < CONFIG.LINEAR_LEAD ? 1 : Math.max(1,CONFIG.OPEN_AHEAD);
  return remaining.slice(0,width).map(q=>q.id);
}
const canOpen=id=>isDone(id)||availableQs().includes(id);
/* true once the fork is reached — used by the status strip so the change in
   how the board behaves is stated rather than left to be discovered */
const forked=()=>ASKED.filter(q=>isDone(q.id)).length>=CONFIG.LINEAR_LEAD
             && availableQs().length>1;

/* Can the card hang off this point and land on screen? Clearing the sheet is
   preferred but not always possible on a small window, so it is optional. */
/* the fixed corner squares paint above the board, so on the strict pass the
   card must stay out from under them too */
function chromeBoxes(){
  return [fmtBtn,fmtMenu,statusBar,resetBtn,logoEl].filter(Boolean)
         .map(el=>el.getBoundingClientRect()).filter(b=>b.width>0);
}
function fitAt(d,cw,ch,vw,vh,f,mayOverlapSheet,boxes){
  const avoid = mayOverlapSheet ? [] : (boxes || chromeBoxes());
  for(const [origin,sx,sy] of CORNERS){
    const left = sx>0 ? d.x : d.x-cw;
    const top  = sy>0 ? d.y : d.y-ch;
    if(left<EDGE || top<EDGE || left+cw>vw-EDGE || top+ch>vh-EDGE) continue;
    if(!mayOverlapSheet &&
       left<f.right+8 && left+cw>f.left-8 && top<f.bottom+8 && top+ch>f.top-8) continue;
    if(avoid.some(b=>left<b.right+6 && left+cw>b.left-6 && top<b.bottom+6 && top+ch>b.top-6)) continue;
    return {origin,left,top};
  }
  return null;
}

/* ---------------------------------------------------------------------
   The corner chrome. The grid is anchored to the sheet's centre, so the
   screen edge does not land on a line — we find the grid's phase and snap
   each box to the nearest lines. The logo keeps its 3 x 3 cells; the format
   control takes 2 x 2, so it reads as a control rather than as a second
   placeholder, and its menu hangs off the same vertical line.
   --------------------------------------------------------------------- */
const FMT_CELLS=2;
function placeChrome(){
  const vw=window.innerWidth;
  const cell=cellSize(), o=gridOrigin();
  /* the grid's phase comes from the ORIGIN, not from the sheet, so the corner
     chrome does not shift when the poster changes shape */
  const phaseX=((o.x%cell)+cell)%cell;          // first vertical line at or after x=0
  const phaseY=((o.y%cell)+cell)%cell;          // first horizontal line at or after y=0
  const lastLineX=phaseX+Math.floor((vw-phaseX)/cell)*cell;   // last line at or before the right edge

  /* assigned unrounded: rounding to whole or even 2dp pushes them off the line */

  const fs=FMT_CELLS*cell;
  fmtBtn.style.left=(lastLineX-fs)+'px';
  fmtBtn.style.top=phaseY+'px';
  fmtBtn.style.width=fs+'px';
  fmtBtn.style.height=fs+'px';

  /* the menu hangs from the button's bottom edge and is right-aligned to the
     same grid line, so opening it does not break the column */
  fmtMenu.style.top=(phaseY+fs+1)+'px';
  fmtMenu.style.left='auto';
  fmtMenu.style.right=(vw-lastLineX)+'px';
}

/* ---------------------------------------------------------------------
   THE KAIRO MARK — three cells in one row, standing over the head of the
   question walk.

   IT USED TO BE FIVE CELLS, one letter each, in one of eight small
   compositions picked at random every load, hung off the sheet's top-right
   corner — and it was never once seen, because #kairo has been display:none
   since it was written and nothing ever turned it on. So none of that is
   being preserved here: the shape table, the random draw and the per-letter
   tiles are gone with it, and what replaces them is what was asked for
   (Karin, 17 Aug) — three cells wide, one row tall, above the questions.

   THE WORD RUNS ACROSS ALL THREE CELLS rather than being cut into them. At
   five letters over three cells there is no letter-per-cell reading to be
   had, so the cells are the GROUND and the name is set across them in one
   piece — which is still the mark's own idea (the name living in the
   lattice), just at a coarser grain.

   ONE COLOUR ACROSS ALL THREE CELLS (Karin, 17 Aug). The mark used to have a
   single accent cell carrying the poster's chosen colour — the old R cell —
   and that idea does not survive the move to a word set across the block: the
   name would run off an ink ground onto a coloured one halfway through, which
   reads as a mistake rather than as an accent, and half the colourway pairs
   are pastels that white letters simply disappear into. So the three cells are
   one flat ground, and the tie to the poster's colour is carried by the poster.
   --------------------------------------------------------------------- */
/* THE NAME, ONCE. The board's mark sets it as a word (LOGO_WORD below) and the
   opening screen sets it as five separate 3x3 letter cells (buildHeroLogo), so
   the letters have to stay a list — joining them here rather than writing the
   string twice is what stops the two marks from ever disagreeing about the
   name. Removing this list is what broke the opening screen the first time the
   board's mark was rewritten. */
const LOGO_LETTERS=['K','A','I','R','O'];
const LOGO_WORD=LOGO_LETTERS.join('');
const LOGO_CELLS=3;                       // 3 x 1, per the mark on Karin's screenshot
/* Two rows above the first question marker, and one column left of it, so the
   three cells straddle the walk's own column rather than hanging beside it —
   that is where the mark was drawn. Both are clamped in placeLogo against the
   top and left edges of the screen. */
const LOGO_ROWS_ABOVE=2, LOGO_COL_LEFT=1;
let logoTiles=[], logoWord=null;

function buildLogo(){
  logoEl.innerHTML='';
  logoTiles=[];
  for(let n=0;n<LOGO_CELLS;n++){
    const t=document.createElement('div');
    t.className='kt';
    logoEl.appendChild(t);
    logoTiles.push(t);
  }
  /* the name sits ON the cells, in its own element spanning the whole box, so
     the letters are never broken by a cell edge and the tiles stay pure ground */
  logoWord=document.createElement('div');
  logoWord.className='kw';
  logoWord.textContent=LOGO_WORD;
  logoEl.appendChild(logoWord);
}

function placeLogo(){
  if(!logoTiles.length) return;
  /* NOTHING BEFORE THE BOARD. The mark belongs to the board, not to the opening
     screen — which has a KAIRO of its own, at its own scale (see .hero-kairo).
     Two of them on one screen would be one too many. This also covers the way
     BACK (see backToStart): its wipe puts S.baseDone down again, so the board's
     mark leaves the tab order with the board itself. */
  if(!S.baseDone){ logoEl.style.display='none'; return; }
  logoEl.style.display='block';
  const cell=cellSize(), o=gridOrigin(), B=snakeBand();
  /* THE SAME CELLS THE SNAKE IS ON, so the mark is snapped by construction: the
     band's own columns and rows are grid coordinates from the origin, which is
     what every other part of the question system is placed with. No second
     phase calculation to drift out of step with the first.
     Clamped at both edges: -B.halfW and -B.halfH are the first full column and
     row on the screen, so a short or narrow window slides the mark back inside
     rather than cutting it off. */
  const col=Math.max(-B.halfW, B.iMin-LOGO_COL_LEFT);
  const row=Math.max(-B.halfH, B.jMin-LOGO_ROWS_ABOVE);
  logoEl.style.left=(o.x+col*cell)+'px';
  logoEl.style.top=(o.y+row*cell)+'px';
  logoEl.style.width=(LOGO_CELLS*cell)+'px';
  logoEl.style.height=cell+'px';
  logoTiles.forEach((t,n)=>{
    t.style.left=(n*cell)+'px';
    t.style.top='0px';
    t.style.width=cell+'px';
    t.style.height=cell+'px';
  });
  if(logoWord){
    /* sized to fill the three cells with a cell's worth of air across the pair
       of ends: five letters at .52 of a cell plus four gaps of .10 comes to
       about 2.2 cells inside a box of 3 */
    logoWord.style.fontSize=(cell*0.52).toFixed(1)+'px';
    logoWord.style.letterSpacing=(cell*0.10).toFixed(2)+'px';
  }
}

/* ---------------------------------------------------------------------
   THE DOT FIELD

   Two rules govern it.

   1. Every dot sits ON a grid intersection — never between lines. Dots are
      stored as integer grid coordinates (i, j) counted from the grid's origin,
      which is the centre of the viewport and is itself an intersection. Pixels
      are worked out only at draw time, by dotXY.

   2. They are placed clear of the UNION of every format's footprint, not of
      the format currently showing. So no format can ever reach a dot, and a
      format change does not move a single one of them. That is what makes the
      change seamless — the poster's four edges travel across a field that is
      completely still.

   3. The questions run LEFT TO RIGHT. The dots are otherwise freely scattered
      — no ring, no column, no fixed arrangement — but question order always
      increases with x, so the sequence follows the direction the eye already
      travels. Candidates are sorted by x and cut into one sector per question.

      The sectors hold an equal NUMBER of candidates, not an equal slice of the
      width. That matters because the free area is not a plain rectangle:
      reserving the union leaves two generous side columns and two thin bands
      top and bottom, so the middle of the screen only offers candidates in
      those bands. Equal population adapts to whatever shape the free area
      actually is, at any window size, while equal slices would hand the middle
      questions a handful of cramped options and the outer ones hundreds.

      An earlier version swept clockwise around the poster instead. It was
      ordered, but a ring of four points can be read starting from any corner
      and in either direction, so it did not communicate a sequence.
   --------------------------------------------------------------------- */
const EDGEPAD=18;                 // never place a dot nearer than this to the screen edge

function computeDots(){
  const vw=window.innerWidth, vh=window.innerHeight;
  const cell=cellSize(), o=gridOrigin(), U=unionBox();
  const f=sheetRect();
  const cw=cardWidth();
  const ch=Math.min(CARD_MAX_H, Math.round(0.84*vh));   // CSS caps the card at 84dvh
  const avoid=chromeBoxes();       // hoisted: fitAt is about to be called thousands of times
  /* clearance around the fixed chrome, in CELLS rather than a flat 10px: a dot
     sitting a few pixels off the logo box reads as a collision, not as a mark */
  const air=0.9*cell;
  const pad=el=>{const b=el.getBoundingClientRect();
                 return {l:b.left-air, r:b.right+air, t:b.top-air, b:b.bottom+air};};
  const keepOut=[
    U,                                                              // every format's footprint
    /* fmtBtn/fmtMenu only reserved while the switcher is actually shown.
       Hidden (display:none), their rect collapses to 0,0,0,0 and padding it
       would reserve a stray box at the origin for nothing. */
    ...(CONFIG.FORMAT_SWITCHER ? [pad(fmtBtn), pad(fmtMenu)] : []),
    pad(logoEl),                                                    // the KAIRO mark, top right
    {l:0, r:13*cell, t:vh-3.2*cell, b:vh},                          // status strip
    {l:vw-7*cell, r:vw, t:vh-3.2*cell, b:vh}                        // reset
  ];
  const clear=(x,y,r)=>x>=EDGEPAD+r && y>=EDGEPAD+r && x<=vw-EDGEPAD-r && y<=vh-EDGEPAD-r
                    && !keepOut.some(z=>x>z.l-r && x<z.r+r && y>z.t-r && y<z.b+r);

  /* every usable intersection on screen, as grid coordinates from the origin */
  const i0=Math.ceil((EDGEPAD-o.x)/cell), i1=Math.floor((vw-EDGEPAD-o.x)/cell);
  const j0=Math.ceil((EDGEPAD-o.y)/cell), j1=Math.floor((vh-EDGEPAD-o.y)/cell);
  const cand=[];
  for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){
    const x=o.x+i*cell, y=o.y+j*cell;
    if(!clear(x,y,QDOT_R)) continue;
    /* how far out from the union footprint, which is what sets the stand-off,
       and how much air there is to the nearest screen edge */
    const ex=Math.max(U.l-x,0,x-U.r), ey=Math.max(U.t-y,0,y-U.b);
    cand.push({i,j,x,y, edge:Math.hypot(ex,ey),
               rim:Math.min(x, y, vw-x, vh-y)});
  }
  /* left to right, with y only as a tie-break so the result is deterministic */
  cand.sort((p,q)=>p.x-q.x || p.y-q.y);

  DOTS=[];
  const taken=new Set(), key=c=>c.i+','+c.j;
  const N=Math.max(1,ASKED.length);
  /* A BAND of acceptable stand-off from the footprint, not a single target
     distance. Aiming at one distance pins every dot to the same ring of
     intersections just outside the reserved area, and then they pile up in
     whichever column holds most of the sweep. A band leaves the spread term
     free to do the actual choosing. */
  const near=1.0*cell, far=9*cell;
  const spread=c=>{                // distance to the dots already down, in px
    let m=Infinity;
    for(const d of DOTS) m=Math.min(m, Math.hypot(d.i-c.i, d.j-c.j)*cell);
    return m===Infinity ? 1e4 : m;
  };
  /* prefer a spot where the card lands clear of the sheet, then one at a
     comfortable stand-off, then one with air around it — both from its
     neighbours and from the screen edge, so a dot never ends up pinned into
     the thin band along the top or the bottom when a roomier option exists */
  const score=c=>(fitAt(c,cw,ch,vw,vh,f,false,avoid) ? 0
                 :fitAt(c,cw,ch,vw,vh,f,true ,avoid) ? 1200 : 4000)
               + (c.edge<near ? (near-c.edge)*3 : c.edge>far ? (c.edge-far)*1.2 : 0)
               + Math.max(0, 3.6*cell-c.rim)*5
               /* Distance from the dots already down, and NOT capped at some
                  "far enough" threshold — a cap made 200px and 570px score the
                  same, so the term could not separate a balanced layout from a
                  stacked one. It can never disturb the ORDER: the sector
                  slicing has already fixed that, and this only chooses which
                  candidate wins inside a sector. */
               - Math.min(spread(c), 22*cell)*1.2;
  const pickFrom=pool=>{
    let best=null, bestS=Infinity;
    for(const c of pool){ const s=score(c); if(s<bestS){bestS=s;best=c;} }
    return best;
  };

  ASKED.forEach((q,n)=>{
    const untaken=c=>!taken.has(key(c));
    /* one sector per question, holding an equal SHARE of the candidates
       rather than an equal slice of the screen's width */
    const lo=Math.floor(n*cand.length/N), hi=Math.floor((n+1)*cand.length/N);
    let pick=pickFrom(cand.slice(lo,hi).filter(untaken));
    if(!pick) pick=pickFrom(cand.filter(untaken));      // sector was full or empty
    /* GUARANTEE: a question with no dot is unopenable, and the session could
       then never reach "all answered". Rather than skip it, take any free
       intersection and accept the overlap. */
    if(!pick){
      for(let i=i0;i<=i1 && !pick;i++) for(let j=j0;j<=j1 && !pick;j++){
        const c={i,j,x:o.x+i*cell,y:o.y+j*cell};
        if(untaken(c)) pick=c;
      }
    }
    if(!pick) pick={i:n+1,j:1};                         // nothing on screen at all
    taken.add(key(pick));
    DOTS.push({i:pick.i, j:pick.j, qid:q.id});
  });

  /* The scattered marks that used to sit here — quiet dots of two sizes on
     free intersections, "the grid's own texture" — are gone. They read as a
     starfield rather than as texture, and on a ground whose whole job is to be
     a lattice a field of stars is a second, competing pattern. Nothing else
     placed them and nothing else read them, so removing them is the whole
     change: DOTS now holds question marks only. */
}

/* ---------------------------------------------------------------------
   THE ORDER, MADE VISIBLE

   cursor  the question we are on: the first one still unanswered
   d       how far AHEAD of the cursor a given question sits

   Answered questions are solid white discs at full size — they are behind
   you, and they are the only dots that are filled. Ahead of the cursor the
   ring both shrinks and dims with d, so the next question is unmistakable
   and the far ones recede toward the weight of the decorative marks. Read
   left to right through the sweep, the field states the sequence.
   --------------------------------------------------------------------- */
const R_STEP=0.17, R_FLOOR=0.52;      // radius falloff per step, and its floor
const O_STEP=0.26, O_FLOOR=0.32;      // brightness falloff per step, and its floor
                                      // — the floor is what keeps the furthest
                                      // question findable rather than merely dim
/* FILL MEANS "STILL TO DO". A filled disc is work waiting; an empty ring is
   work spent. So the loudest marks on the board are always the ones asking for
   something, and answering a question quiets it down.

   This is the reverse of the first version, which filled the ANSWERED dots.
   That read as a progress meter and it fought the eye: completed work was the
   boldest thing on screen while the question you actually had to do next was a
   thin ring. If anyone is tempted to flip it back, that is the reason not to. */
function hierarchy(qid,cell){
  const base=Math.max(7, Math.min(12, cell*0.40));
  /* Behind us: settled. Small, and in the yellow rather than the white — it
     still reads quieter than anything pending, but the hue is now doing that
     work, so it does not have to be faded to the point where the colour stops
     being legible as a colour. Skipped is the same size and hue, hollow and
     broken, and dimmer again. */
  if(isDone(qid)) return isSkipped(qid)
    ? {r:base*0.60, op:0.45, fill:false, done:true, passed:true,  d:-1}
    : {r:base*0.60, op:0.72, fill:false, done:true, passed:false, d:-1};
  const cursor=ASKED.findIndex(q=>!isDone(q.id));
  const rank=ASKED.findIndex(q=>q.id===qid);
  const d=cursor<0 ? 0 : Math.max(0, rank-cursor);
  return {r:base*Math.max(R_FLOOR, 1-R_STEP*d),
          op:Math.max(O_FLOOR, 1-O_STEP*d), fill:true, done:false, passed:false, d};
}

