/* =====================================================================
   THE LANDING — the opening screen, before anything else opens and before
   the poster is shown at all.

   Deliberately NOT part of the card/popup system that every question uses.
   A question card floats over the board on purpose — you can see the sheet
   and the grid through it, because by then you are already inside the piece.
   This screen is the opposite: it is what brings you in, and per spec the
   poster must not be visible behind it. Giving it its own element (#landing)
   rather than reusing `card` is what makes that possible.

   It used to run four steps — the aperture, then three base questions whose
   answers were permanent. Those questions moved into the bank (shape and
   density open the board now; the arrival dial was removed outright), so all
   that is left here is the aperture and its Start. */
const LANDING_STEPS=CONFIG.SHOW_OPENING?['hero']:[];
let landingStep=0;

/* ---- APERTURE: the opening screen -----------------------------------------
   Step one, and the only step that owns the whole viewport rather than the
   380px column. It asks for nothing: a title, a line about what is coming, and
   Begin.

   The mechanic: the interface grid is painted across the entire viewport and
   then a rectangle of it is cleared away. The title sits in that cleared
   rectangle, on bare ink — there is no panel behind it, no border, no shadow.
   The hole is the container.

   The hole used to be sized by the name you typed, which was the argument for
   collecting one here. With the fields gone that reading goes too, and what is
   left is the hole opening on the beat as the title arrives — the way in is
   still something that opens rather than a page that loads, but it is no
   longer something the visitor sizes.

   ONE CLOCK. The title's characters, the field's flicker and the aperture's
   growth all land on the same beat. Three animations on three timers would
   read as ambient shimmer; on a single beat it reads as a mechanism running.
   Everything cuts — visibility, not opacity; whole cells, not sub-pixels. */
const HERO_BEAT=110;                       /* ms; the whole screen's clock */
const HERO_TITLE='Architecture of Time';
const HERO_PAD=2;                          /* whole cells of clearance round the plate */
let FIELD=null;
let heroLayoutFn=null;                      /* the hero's resize handler, removed on teardown */
let heroTourCtl=null;                       /* the opening tour's {stop,suspend}, while one is running */
let heroHoverCell=null;                     /* the KAIRO cell the hand is resting on, if any */

/* Built once, on the first landing step, and kept alive until the sequence
   hands over to the board. Every step re-renders #landingBody from scratch;
   the canvas is deliberately not in there. */
function ensureField(){
  if(FIELD) return FIELD;
  const cv=document.createElement('canvas'); cv.id='heroField';
  cv.setAttribute('aria-hidden','true');   /* decorative; the steps carry the meaning */
  landing.insertBefore(cv,landingBody);
  FIELD=heroField(cv,()=>landingBody.querySelector('.hero-plate')||landingBody);
  return FIELD;
}
function teardownHero(){
  if(heroTourCtl){ heroTourCtl.stop(); heroTourCtl=null; }
  heroHoverCell=null;
  if(FIELD){ FIELD.stop(); FIELD=null; }
  if(heroLayoutFn){ window.removeEventListener('resize',heroLayoutFn); heroLayoutFn=null; }
  const cv=landing.querySelector('#heroField');
  if(cv) cv.remove();
  landing.classList.remove('hero');
}

/* Straight to the board, skipping the opening screen. Nothing is answered on
   the way past any more — shape and density are board questions now, so the
   board opens on question one either way; this just spares the aperture.

   Two ways in and one implementation: the link on the opening screen, and ?skip
   on the URL. Neither may drift from the other. */
function skipOpening(){
  teardownHero();
  landing.classList.remove('open');
  landing.setAttribute('aria-hidden','true');
  S.baseDone=true;
  finishBase();
}

/* Four small squares, one for each corner of a cell — the pointer feedback the
   opening tiles and START share. Absolutely positioned, so they sit on the
   grid junctions the cell touches. */
function addCornerMarks(el){
  ['tl','tr','bl','br'].forEach(p=>{
    const m=document.createElement('span'); m.className='kmark '+p; el.appendChild(m);
  });
}

/* Each KAIRO letter is exactly three interface cells square (3x3), snapped to
   the same lattice the dot field paints, so its corners land on grid junctions
   and the four corner marks read as squares of the grid itself. */
const HERO_TILE_CELLS=3;
/* K,A,I,R,O on a five-wide checkerboard: K I O along the top row, A and R
   dropped between them on the row below, so the five cells interlock at their
   corners and read as one mark cut from the lattice. The bottom-middle slot,
   between A and R, is left empty for START. */
const HERO_LOGO_CELLS=[[0,0],[1,1],[2,0],[3,1],[4,0]];
/* Hovering a cell collapses the drifting twelve-ray aperture to just the four
   corner marks of that cell — the field is told to suppress its star so nothing
   but those four squares is lit, and the pointer reads as focused on the
   letter. */
function heroCellHover(el){
  el.addEventListener('mouseenter',()=>{
    /* the hand has landed ON a cell — the opening walk breaks off at once
       rather than dragging the star off the letter being pointed at, and it
       will not come back while the cursor is parked here */
    heroHoverCell=el;
    if(heroTourCtl) heroTourCtl.suspend();
    if(FIELD) FIELD.focus(el.getBoundingClientRect());
  });
  el.addEventListener('mouseleave',()=>{
    if(heroHoverCell===el) heroHoverCell=null;
    if(FIELD) FIELD.focus(null);
  });
}
/* Builds the mark's DOM only — five letter cells and START — with no sizes yet.
   layoutHeroLogo() measures and places everything, so the same nodes can be
   re-laid-out on resize. */
function buildHeroLogo(){
  const box=document.createElement('div'); box.className='klogo';
  box.setAttribute('role','img'); box.setAttribute('aria-label','KAIRO');
  const tiles=LOGO_LETTERS.map(ch=>{
    const t=document.createElement('div'); t.className='kt';
    t.appendChild(document.createTextNode(ch));
    addCornerMarks(t); heroCellHover(t);
    box.appendChild(t); return t;
  });
  const start=document.createElement('button');
  start.className='kstart'; start.type='button';
  start.appendChild(document.createTextNode('Start'));
  addCornerMarks(start); heroCellHover(start);
  start.addEventListener('click',advanceLanding);
  box.appendChild(start);
  return {box,tiles,start};
}

/* Size and place the mark in whole cells, snapped to the grid. The cluster is
   fifteen cells wide and seven tall (five 3x3 letters plus the 1-cell START
   row); fifteen is odd, so centring alone would drop its edges on half-cells,
   off the lattice — the top-left is therefore SNAPPED to the nearest junction
   (the field phases a junction through the viewport centre, exactly as
   measure() does). Re-run on resize and once after first paint so a viewport
   that was not yet measured — or one that changes — never leaves the cluster
   mis-sized or off the lattice. */
function layoutHeroLogo(box,tiles,start){
  const cell=cellSize();
  if(!cell||!isFinite(cell)) return;
  const cells=Math.max(1,Math.min(HERO_TILE_CELLS,Math.floor(0.92*window.innerWidth/(5*cell))));
  const tile=cells*cell;
  const boxW=5*tile, boxH=2*tile+cell;
  const W=window.innerWidth, H=window.innerHeight;
  const sox=((W/2)%cell+cell)%cell, soy=((H/2)%cell+cell)%cell;
  const left=sox+Math.round(((W-boxW)/2-sox)/cell)*cell;
  const top =soy+Math.round(((H-boxH)/2-soy)/cell)*cell;
  box.style.left=left+'px'; box.style.top=top+'px';
  box.style.width=boxW+'px'; box.style.height=boxH+'px';
  tiles.forEach((t,n)=>{
    const [c,r]=HERO_LOGO_CELLS[n];
    t.style.left=(c*tile)+'px'; t.style.top=(r*tile)+'px';
    t.style.width=tile+'px'; t.style.height=tile+'px';
    t.style.fontSize=Math.round(tile*0.42)+'px';
  });
  /* START below A and R, centred between them: three cells wide, one tall */
  start.style.left=(2*tile)+'px'; start.style.top=(2*tile)+'px';
  start.style.width=(3*cell)+'px'; start.style.height=cell+'px';
  start.style.fontSize=(Math.round(cell*0.42)-2)+'px';
}

/* ---- THE OPENING TOUR ------------------------------------------------------
   The screen shows itself. On load the light walks the mark — K, A, I, R, O,
   and then Start — doing exactly what a visitor's cursor does when it runs
   through the tiles: the star gathers onto each cell's four corners, those four
   corner marks go dark, and then it opens back into its twelve rays for the
   straight run to the next cell. Start is the destination, so it is held twice
   as long as a letter.

   Nothing here is a second animation. It drives the SAME two mechanisms hover
   drives — FIELD.drive() moves the light the way a pointer would, and .hot is
   the class form of :hover — so the tour can never drift out of step with what
   the hand does. If the two ever disagree it is because someone changed one and
   not the other, and the fix is to keep them on one rule (see .kmark in
   css/20-aperture.css).

   IT IS NOT A LOOP. It walks once and then lets go: the star wanders off on the
   field's ordinary drift and stays there. What brings it back is the visitor —
   the moment the hand moves, the walk drops whatever it was doing and the light
   follows the cursor, and when that hand has been still for TOUR_IDLE the walk
   runs once more and hands the light back to the drift again.

   Written the other way round — a walk that repeats on a timer and gets out of
   the way when interrupted — it would be a screensaver playing at the visitor.
   This way round the visitor's own stillness is what asks for it, so it reads as
   the screen answering rather than performing. The one and only exception is
   the first run, which nobody asked for because nobody has arrived yet. */
const TOUR_DELAY=600;        /* ms before the first walk: let the mark land first */
const TOUR_TRAVEL=200;       /* ms of straight-line travel from one cell to the next */
const TOUR_RETURN=460;       /* ms for the long run back to K at the head of a walk */
const TOUR_DWELL=300;        /* ms the light rests on a letter */
const TOUR_START_DWELL=600;  /* Start is the destination, not one more stop */
const TOUR_IDLE=3000;        /* ms of a still hand before the walk runs again */

function heroTour(tiles,start){
  /* No autonomous motion under reduced motion — the field already honours that,
     and a self-running cursor is the most literal thing on the screen. */
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return null;
  const stops=[...tiles,start];
  const dwellOf=el=>el===start?TOUR_START_DWELL:TOUR_DWELL;
  const centreOf=el=>{ const r=el.getBoundingClientRect();
                       return {x:(r.left+r.right)/2,y:(r.top+r.bottom)/2,rect:r}; };
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;   /* in-out cubic: a hand sets off and arrives */

  let raf=null,dead=false,lastMove=-Infinity;
  /* armed: a hand has moved since the last walk, so its stillness now counts as
     a request for another one. Cleared the moment that walk sets off, which is
     what stops this being a loop — with nobody there, nothing re-arms it. */
  let armed=false;
  let phase='wait',idx=0,at=0,dur=TOUR_DELAY,from=null,to=null,first=true;

  const unlight=()=>stops.forEach(el=>el.classList.remove('hot'));

  /* begin a phase; `at` is stamped by the caller's clock so a dropped frame
     never accumulates into drift */
  function go(p,d,now){ phase=p; dur=d; at=now; }

  function beginTravel(now){
    to=centreOf(stops[idx]);
    if(first&&idx===0){ from=to; go('travel',0,now); return; }   /* the first pass opens ON K, already there */
    from=idx===0 ? FIELD.at() : from;                            /* a later pass sets off from wherever the drift left the light */
    go('travel',idx===0?TOUR_RETURN:TOUR_TRAVEL,now);
  }

  function tick(now){
    if(dead) return;
    raf=requestAnimationFrame(tick);
    if(!FIELD) return;
    const t=dur?Math.min(1,(now-at)/dur):1;

    if(phase==='wait'){
      /* the light is simply on K already, held there while the mark settles —
       every frame, so a late webfont re-layout cannot leave it behind */
      const k=centreOf(stops[0]);
      FIELD.warp(k.x,k.y);
      if(t>=1){ idx=0; beginTravel(now); }
      return;
    }
    if(phase==='travel'){
      const e=ease(t);
      FIELD.drive(from.x+(to.x-from.x)*e, from.y+(to.y-from.y)*e);
      if(t>=1){
        /* arrival: the star collapses onto this cell exactly as on mouseenter,
           and the cell's four corner marks go dark with it */
        const el=stops[idx];
        FIELD.focus(el.getBoundingClientRect());
        el.classList.add('hot');
        go('dwell',dwellOf(el),now);
      }
      return;
    }
    if(phase==='dwell'){
      to=centreOf(stops[idx]);            /* re-read: a resize mid-dwell must not strand the light */
      FIELD.drive(to.x,to.y);
      FIELD.focus(to.rect);
      if(t>=1){
        stops[idx].classList.remove('hot');
        FIELD.focus(null);                /* the star opens back out for the run to the next cell */
        from=to;
        if(++idx<stops.length){ beginTravel(now); }
        else{
          /* the walk is done. It ended on Start, nowhere near the cursor, so
             there is nothing to hand the light back to but the drift. */
          first=false; FIELD.focus(null); FIELD.release(true); go('idle',0,now);
        }
      }
      return;
    }
    if(phase==='idle'){
      /* The light is the visitor's, or the drift's. Nothing here repeats on a
         clock: the walk only runs again if a hand has moved since the last one
         (armed) and has then been still for TOUR_IDLE. Parked on a cell is not
         idle — the visitor is pointing at a letter, and walking off with the
         star would be the screen talking over them. */
      if(armed && now-lastMove>=TOUR_IDLE && !heroHoverCell){ armed=false; idx=0; beginTravel(now); }
      return;
    }
  }

  /* The hand moves: the walk lets go THAT INSTANT and the light is the
     cursor's. This is also what arms the next walk — see `armed`. */
  const onMove=()=>{ lastMove=performance.now(); armed=true; suspend(); };
  landing.addEventListener('pointermove',onMove);

  /* Break off the walk where it stands and give the light back to the hand.
     The star opens back out of whatever letter it had gathered onto — unless
     the cursor has just landed ON a cell, in which case heroCellHover owns the
     focus now and clearing it here would undo that. */
  function suspend(){
    if(dead||phase==='idle') return;
    first=false;                       /* no more warping onto K; the next walk travels there */
    unlight();
    if(FIELD){ if(!heroHoverCell) FIELD.focus(null); FIELD.release(); }
    go('idle',0,performance.now());
  }

  function stop(){
    if(dead) return;
    dead=true;
    if(raf) cancelAnimationFrame(raf);
    landing.removeEventListener('pointermove',onMove);
    unlight();
    if(FIELD) FIELD.release();
  }

  raf=requestAnimationFrame(now=>{ at=now; raf=requestAnimationFrame(tick); });
  return {stop,suspend};
}

function renderLandingHero(){
  const plate=document.createElement('div'); plate.className='hero-plate hero-kairo';
  const {box,tiles,start}=buildHeroLogo();
  plate.appendChild(box);

  /* The "Skip to the poster" link that used to hang below the cluster is gone,
     by decision: with the base questions on the board it skipped nothing but
     the mark itself, and START already does that job. ?skip on the URL stays
     as the development shortcut (see skipOpening). */
  landingBody.appendChild(plate);

  /* place it now, again after the first paint (the viewport may not be measured
     yet), and on every resize; teardownHero drops the listener */
  const layout=()=>layoutHeroLogo(box,tiles,start);
  layout();
  requestAnimationFrame(layout);
  window.addEventListener('resize',layout);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(layout);
  heroLayoutFn=layout;

  /* The field paints the lattice unbroken under the mark; there is no title to
     reveal on this screen, so it is handed no characters. */
  const field=ensureField();
  field.setChars([]);

  /* The screen shows itself: the light walks K A I R O and rests on Start,
     stepping aside for the hand and coming back when it goes quiet. Started
     after the first paint so the cells have been placed and their rects are
     real. */
  if(heroTourCtl){ heroTourCtl.stop(); heroTourCtl=null; }
  requestAnimationFrame(()=>{ if(FIELD) heroTourCtl=heroTour(tiles,start); });
  /* Focus is NOT taken here: openLanding() renders the step before it adds
     .open, so nothing inside can take focus yet. renderLandingStep's deferred
     focus handles it. */
}

/* The field itself. Paints the lattice over the whole viewport, then clears the
   aperture out of it — the clear is what makes the hole, so no step needs a
   background of its own and none can ever disagree with the field.

   It is built once and runs for the whole landing sequence. frameOf() is asked
   every time for the element the hole should clear, so when a step re-renders
   #landingBody the aperture just resizes around whatever is there now: wide for
   the opening plate, narrow for the 380px question column. That resize IS the
   transition between steps.

   Note what is NOT painted here: the sheet, the dot field, anything of the
   poster. All four steps are spec'd to show none of it, and this holds that
   line while still standing the visitor inside the lattice the finished poster
   will be read against. */
function heroField(cv,frameOf){
  const ctx=cv.getContext('2d');
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let chars=[];                             /* only the opening step has a title */
  /* READ FROM THE PALETTE, not hard-coded. These were white because the screen
     was black; now the screen is whatever --ink is, and these follow --sheetline
     and the interface ink with it. That is the rule: one place to change. */
  const cssVar=(k,fb)=>getComputedStyle(document.documentElement)
                        .getPropertyValue(k).trim()||fb;
  const RAY=cssVar('--sheetline','rgba(0,0,0,.34)');
  /* the field stays monochrome on purpose: --done yellow means "this question
     is settled" everywhere else in the piece, and spending it on decoration
     here would blunt it before it has been earned */
  const MARK_LO=cssVar('--line','rgba(0,0,0,.16)');

  /* A square sits on EVERY --cell junction of the interface grid, so the field and
     the poster's grid share the same lattice exactly (Karin's ask: each square on a
     grid junction). The light and the twelve-ray star, though, are still measured in
     the coarser UNIT of STEP_CELLS cells, so widening the square field does not shrink
     the bloom or pull the star's hour-points off where they were. The aperture stays
     in whole --cell units — the hole belongs to the piece's grid. */
  const STEP_CELLS=1;    /* the light/star unit, in --cell; the square lattice itself is one cell.
                            1 = the compact spider (rays reach ring-2 of the cell grid, 2 cells out);
                            2 was double that. This is the one knob for the tracking star's size. */
  const R_STEPS=4.4;      /* how far the light reaches, in UNITS */
  /* How fast the light falls off. Squared kept the bloom tight, which read
     fine when there was a mark in every cell — on the sparse lattice it left
     nothing lit but the twelve ray ends. Below 2 the neighbours come back. */
  const FALLOFF=1.35;
  const RAY_STEPS=2;      /* where the twelve rays end, in UNITS */
  /* Twelve, at 30°, snapped to the UNIT sublattice (every STEP_CELLS cells): ring-2 of
     that coarser lattice is exactly (±2,0) (0,±2) (±2,±1) (±1,±2) — twelve points, the
     reference's star with nothing forced. Snapping the ends to the unit rather than the
     dense cell lattice is what keeps this clean 12-point clock even now that a square
     sits on every junction. It is a clock, and the piece is about time. */
  const RAYS=12;

  /* The far field never changes, so it is painted once into an offscreen canvas
     and blitted each frame. Only the ~130 cells inside the light get computed
     per frame, which is what makes a 60fps cursor affordable on a full-viewport
     lattice — repainting every cell every frame would be ~5000 rects a frame to
     redraw a picture that is identical everywhere the cursor is not. */
  const bg=document.createElement('canvas');
  const bx=bg.getContext('2d');

  let W=0,H=0,cell=20,cols=0,rows=0,dpr=1,rect={left:0,top:0};
  let step=20,unit=40,sox=0,soy=0,scols=0,srows=0;   /* step: dense square lattice (one cell); unit: light/star scale */
  let apW=0,apH=0,tgtW=0,tgtH=0;            /* aperture, in whole cells */
  let lit=0,acc=0,last=0,raf=null;
  /* while a KAIRO cell is hovered the star concentrates onto it: focusAmt eases
     from 0 (the full twelve-ray star) to 1 (collapsed — rays retracted and
     faded, leaving only the cell's four corner marks). focusTarget is where it
     is heading. */
  let focusAmt=0, focusTarget=0, focusRect=null;   /* the hovered cell, so rays gather onto its corners */
  /* fx,fy is where the light actually is; px,py is where it is being pulled.
     The gap between them is the whole feel of the thing: the field follows the
     hand, it does not teleport with it. */
  let fx=0,fy=0,px=0,py=0,pointer=false;
  /* the opening tour (heroTour) drives the light itself for a few seconds.
     While it does, the autonomous drift stands aside — otherwise the two would
     pull at the same point and the tour would read as a wobble. */
  let scripted=false;

  function measure(){
    dpr=Math.min(2,window.devicePixelRatio||1);
    W=cv.clientWidth; H=cv.clientHeight;
    if(!W||!H) return;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    rect=cv.getBoundingClientRect();
    cell=parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--cell'))||20;
    /* put a cell boundary through the exact centre of the viewport. That is
       what lets an aperture of N whole cells, centred, land all four edges on
       the piece's grid — the same trick syncSheet() uses to snap the sheet. */
    cols=Math.ceil(W/cell)+2; rows=Math.ceil(H/cell)+2;
    /* the square lattice IS the cell grid, phased so a junction sits at the viewport
       centre; the light/star read the coarser unit */
    step=cell; unit=cell*STEP_CELLS;
    sox=(W/2)%step; soy=(H/2)%step;
    scols=Math.ceil(W/step)+2; srows=Math.ceil(H/step)+2;
    if(!pointer){ fx=px=W/2; fy=py=H/2; }
    paintBg();
    retarget();
  }

  /* lattice point for an index, and the nearest index to a point. No half-step offset:
     a square sits ON the junction (sox is the junction phase), not at the cell centre. */
  const cxOf=c=>sox+c*step, cyOf=r=>soy+r*step;
  const cAt=x=>Math.round((x-sox)/step), rAt=y=>Math.round((y-soy)/step);

  function paintBg(){
    bg.width=cv.width; bg.height=cv.height;
    bx.setTransform(dpr,0,0,dpr,0,0);
    bx.clearRect(0,0,W,H);

    /* No ruled lines. The lattice is stated by the squares alone — where they
       stop, the aperture begins, and that edge is legible without anything
       being drawn around it. Ruling it as well was belt and braces, and it
       made the field read as graph paper rather than as a field.
       (.gridlayer behind the board still rules its own lines; that is the
       board's language, and #landing covers it completely anyway.)

       At rest the squares are barely there; the light is what gives them
       size. */
    const m=Math.max(2,Math.round(unit*.055));   /* same square size as before, now one per junction */
    bx.fillStyle=MARK_LO;
    for(let c=-1;c<scols;c++) for(let r=-1;r<srows;r++){
      bx.fillRect(Math.round(cxOf(c)-m/2),Math.round(cyOf(r)-m/2),m,m);
    }
  }

  function retarget(){
    const el=frameOf();
    if(!el) return;
    const r=el.getBoundingClientRect();
    if(!r.width) return;
    /* the smallest hole that still clears the plate — the floor a clamp may
       never cut into, or the type would end up sitting back on the grid */
    const minW=Math.ceil(r.width/cell)+2, minH=Math.ceil(r.height/cell)+2;
    /* and the largest that still leaves two cells of field on every side, so
       the aperture always reads as cut OUT of something */
    const maxW=Math.max(minW,cols-4), maxH=Math.max(minH,rows-4);
    tgtW=Math.min(maxW,Math.ceil(r.width/cell)+HERO_PAD*2);
    tgtH=Math.min(maxH,Math.ceil(r.height/cell)+HERO_PAD*2);
    if(reduce){ apW=tgtW; apH=tgtH; paint(); }
  }

  function paint(){
    if(!W||!H) return;
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(bg,0,0,W,H);
    /* foc: 0 = full twelve-ray star; 1 = concentrated onto the hovered cell.
       The star never fades: four arms become the cell's four corner squares
       and the rest collapse into the centre — see the ray loop below. Only the
       BLOOM dims out, so the grid glow does not sit on the hovered letter. */
    const foc=focusAmt;

    const R=R_STEPS*unit;
    const base=Math.max(2,Math.round(unit*.055));
    const peak=Math.max(4,Math.round(unit*.22));
    const span=Math.ceil(R/step)+1;                 /* the bloom radius, counted in the dense cell lattice */
    const c0=cAt(fx), r0=rAt(fy);

    /* The squares inside the light, sized and brightened by how near they are —
       the whole bloom dims out as the star concentrates. */
    for(let c=c0-span;c<=c0+span;c++){
      for(let r=r0-span;r<=r0+span;r++){
        const x=cxOf(c), y=cyOf(r);
        const d=Math.hypot(x-fx,y-fy);
        if(d>R) continue;
        const t=1-d/R, f=Math.pow(t,FALLOFF);
        const s=Math.max(base,Math.round(base+(peak-base)*f));
        ctx.fillStyle='rgba(20,20,20,'+((0.16+0.72*f)*(1-foc)).toFixed(3)+')';
        ctx.fillRect(Math.round(x-s/2),Math.round(y-s/2),s,s);
      }
    }

    /* Twelve rays at 30°. THE STAR DOES NOT FADE when it concentrates — it is
       one unit throughout. Four of its arms, one per corner of the hovered
       cell (each corner claims its NEAREST arm, and an arm can serve only one
       corner), sweep out and BECOME the cell's four corner squares: the tip
       travels to the corner while the line's centre end chases it, so the arm
       shortens into its square instead of fading, and the square eases to the
       .kmark size so what lands IS the corner mark. The other eight arms
       collapse along themselves into the centre and end up under the centre
       square. */
    /* the four corners of the hovered cell, in canvas coords */
    let corners=null;
    if(focusRect){
      const fl=focusRect.left-rect.left, ft=focusRect.top-rect.top,
            fr=focusRect.right-rect.left, fb=focusRect.bottom-rect.top;
      corners=[[fl,ft],[fr,ft],[fl,fb],[fr,fb]];
    }
    /* every arm's nominal tip first — the corners need them all to choose from */
    const tips=[];
    for(let k=0;k<RAYS;k++){
      const a=k*(Math.PI*2/RAYS)-Math.PI/2;
      const cc=Math.round((fx+Math.cos(a)*RAY_STEPS*unit-sox)/unit);
      const rr=Math.round((fy+Math.sin(a)*RAY_STEPS*unit-soy)/unit);
      tips.push([sox+cc*unit, soy+rr*unit]);
    }
    const armCorner=new Array(RAYS).fill(null);
    if(corners){
      const taken=new Set();
      for(const [cx,cy] of corners){
        let best=Infinity, bk=-1;
        for(let k=0;k<RAYS;k++){
          if(taken.has(k)) continue;
          const d=(cx-tips[k][0])*(cx-tips[k][0])+(cy-tips[k][1])*(cy-tips[k][1]);
          if(d<best){ best=d; bk=k; }
        }
        if(bk>=0){ taken.add(bk); armCorner[bk]=[cx,cy]; }
      }
    }
    ctx.strokeStyle=RAY; ctx.lineWidth=1; ctx.beginPath();
    const ends=[];
    for(let k=0;k<RAYS;k++){
      const [nx,ny]=tips[k], tgt=armCorner[k];
      let ex,ey;
      if(tgt){
        /* a keeper: tip to the corner, centre end chasing it */
        ex=nx+(tgt[0]-nx)*foc; ey=ny+(tgt[1]-ny)*foc;
        ctx.moveTo(fx+(ex-fx)*foc, fy+(ey-fy)*foc); ctx.lineTo(ex,ey);
      }else{
        /* collapsed: the tip retracts along its own arm into the centre */
        ex=nx+(fx-nx)*foc; ey=ny+(fy-ny)*foc;
        ctx.moveTo(fx,fy); ctx.lineTo(ex,ey);
      }
      ends.push([ex,ey,!!tgt]);
    }
    ctx.stroke();

    /* the hour marks sit on top of their rays, so the line reads as arriving at
       the square rather than crossing it. A keeper's square eases from the
       star's own size to the DOM corner mark's (cell*.17 — see .kmark), so the
       landing is exact. */
    ctx.fillStyle=cssVar('--fg','#141414');
    const hm=Math.max(4,Math.round(unit*.17));
    const km=Math.max(3,Math.round(cell*.17));
    for(const [x,y,keep] of ends){
      const s=keep ? hm+(km-hm)*foc : hm;
      ctx.fillRect(Math.round(x-s/2),Math.round(y-s/2),Math.round(s),Math.round(s));
    }

    /* the centre: the only mark not on the lattice, because it is you */
    const fm=Math.max(6,Math.round(unit*.26));
    ctx.fillRect(Math.round(fx-fm/2),Math.round(fy-fm/2),fm,fm);

    /* No hole is cut any more. The grid runs unbroken under the KAIRO mark and
       the question panels — the letters sit ON the lattice, and hovering one
       lights the grid squares at its four corners, which only reads if the grid
       is there beneath it. The white cells and the opaque panels supply their
       own ground where they need one. */
  }

  function tick(now){
    raf=requestAnimationFrame(tick);
    if(!last) last=now;
    const dt=now-last; last=now;

    /* Before the hand arrives — and on any device that has no hand — the light
       drifts on its own, so the screen is never dead on first sight. */
    if(!pointer&&!scripted){
      px=W/2+W*0.34*Math.sin(now*0.00021);
      py=H/2+H*0.30*Math.sin(now*0.00029+1.1);
    }
    /* frame-rate independent ease-out: same feel at 60 and 120Hz */
    const k=1-Math.pow(0.0016,dt/1000);
    fx+=(px-fx)*k; fy+=(py-fy)*k;
    /* the concentrate-on-hover transition, on its own quick ease */
    focusAmt += (focusTarget-focusAmt)*Math.min(1,dt/140);
    if(focusTarget===0 && focusAmt<0.02){ focusAmt=0; focusRect=null; }

    acc+=dt;
    if(acc>=HERO_BEAT){
      acc=0;
      if(lit<chars.length) chars[lit++].classList.add('lit');
      /* two cells per beat in each axis — a hard step, never a tween */
      if(apW!==tgtW) apW += apW<tgtW ? Math.min(2,tgtW-apW) : -Math.min(2,apW-tgtW);
      if(apH!==tgtH) apH += apH<tgtH ? Math.min(2,tgtH-apH) : -Math.min(2,apH-tgtH);
    }
    paint();
  }

  const onMove=e=>{
    pointer=true;
    px=e.clientX-rect.left; py=e.clientY-rect.top;
    if(reduce){ fx=px; fy=py; paint(); }
  };
  const onLeave=()=>{ pointer=false; };
  const onResize=()=>{ measure(); paint(); };
  window.addEventListener('resize',onResize);
  landing.addEventListener('pointermove',onMove);
  landing.addEventListener('pointerleave',onLeave);
  /* a step's height depends on the display serif, so its box is wrong until the
     webfont lands; retarget once it has */
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ measure(); paint(); });

  measure();
  if(reduce){
    /* no autonomous motion: no drift, no ease, no beat. The light still answers
       the hand, because that is the visitor moving, not the page. */
    apW=tgtW; apH=tgtH; paint();
  } else raf=requestAnimationFrame(tick);

  return {
    retarget,
    /* Handed the current step's title characters, or an empty list when the
       step has none. The beat reveals them; nothing else knows about them. */
    setChars(list){
      chars=list||[]; lit=0;
      if(reduce) chars.forEach(i=>i.classList.add('lit'));
    },
    /* aims the concentrate-on-hover transition: pass the hovered cell's rect and
       the rays gather onto its four corners; pass null and the star springs back */
    focus(r){ if(r) focusRect=r; focusTarget=r?1:0; if(reduce){ focusAmt=focusTarget; if(!r) focusRect=null; paint(); } },
    /* ---- the tour's hold on the light ------------------------------------
       drive() pulls the light towards a point in CLIENT coordinates, exactly
       as a pointer would, and holds off the drift while it does. at() reports
       where the light actually is, also in client coordinates, so a tour can
       set off from wherever the drift left it rather than teleporting.
       release() hands the light back: bare, to the hand that interrupted, and
       release(true) to the drift, forgetting the hand entirely — which is what
       a walk that ran to its end wants, since it has already left the cursor
       far behind and there is nothing to hand back to. */
    drive(x,y){ scripted=true; px=x-rect.left; py=y-rect.top; },
    /* drive() pulls and the light eases in behind it; warp() puts it there
       outright. The opening tour uses this once, to be already on K rather
       than to be seen arriving at it. A cut, not a tween — the same rule the
       beat follows. */
    warp(x,y){ scripted=true; px=x-rect.left; py=y-rect.top; fx=px; fy=py; },
    at(){ return {x:fx+rect.left,y:fy+rect.top}; },
    release(toDrift){ scripted=false; if(toDrift) pointer=false; },
    stop(){
      if(raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize',onResize);
      landing.removeEventListener('pointermove',onMove);
      landing.removeEventListener('pointerleave',onLeave);
    }
  };
}

/* One step left — the aperture. The table stays so a landing step can be added
   back with one entry, the way the base questions once lived here. */
const LANDING_RENDER={hero:renderLandingHero};
function renderLandingStep(){
  const step=LANDING_STEPS[landingStep];
  landing.classList.toggle('hero',step==='hero');
  /* The step wipes to nothing and builds itself: the hero its KAIRO mark. */
  landingBody.innerHTML='';
  LANDING_RENDER[step]();
  /* The field is not in this DOM and survives the wipe — it only has to be
     told the shape it frames just changed. */
  const f=ensureField();
  f.retarget();
}
function advanceLanding(){
  if(landingStep+1<LANDING_STEPS.length){ landingStep++; renderLandingStep(); }
  /* THE LAST STEP DOES NOT DISMISS ITSELF. START hands over to the opening
     film, which builds the interface grid out of this screen's own squares and
     only then calls finishBase (see js/app/57-transition.js). Under reduced
     motion playOpening is finishBase, so the two ways past this line stay one
     way in the code. */
  else playOpening();
}
function showIntro(){
  /* nothing to show — straight to the board (SHOW_OPENING off) */
  if(!LANDING_STEPS.length){ finishBase(); return; }
  /* the film cut this screen away rather than fading it; Reset brings it back,
     and it gets its ordinary fade with it */
  landing.classList.remove('nofade');
  introOpen=true; landingStep=0;
  renderLandingStep();
  landing.classList.add('open');
  landing.setAttribute('aria-hidden','false');
  holdWorld(true);
}
function finishBase(){
  teardownHero();
  S.baseDone=true;
  /* THE CLOCK STARTS HERE, not at page load: what the record reports is how long
     the experience took, and the wait before someone presses Begin is not part
     of it (see js/app/63-record.js). */
  startClock();
  introOpen=false;
  landing.classList.remove('open');
  landing.setAttribute('aria-hidden','true');
  holdWorld(false);
  relayout();
}

