/* =====================================================================
   THE GRID FORMS — the film between the opening screen and the board.

   Prototyped whole in grid-transition-demo.html (the `edges` variant, the one
   Karin approved on 16 Aug) and ported here unchanged in behaviour. What the
   demo could do in one canvas this has to do in two halves, because the real
   board is not a canvas: its lattice is a CSS background on .gridlayer, its
   four rules are four <i> elements, its paper is #frame, and question one is
   the panel #qsys draws.

   So the film is cut where the screen is:

     1-2  THE GRID RUNS, on a canvas inside #landing. Every horizontal line
          crosses the screen, staggered row by row and eased out; only when the
          last of them has finished do the verticals start. A small square dies
          the instant a line passes through its junction — the line collects it.
          The KAIRO letters and START are DOM, so they die by class rather than
          by not being painted: .cut, a cut and never a fade.

     3-5  THE BOARD ARRIVES, on the real DOM. The canvas's last frame is exactly
          what .gridlayer paints — same phase, same colour, same 1px — so the
          screen can simply be cut away underneath it. Then the sheet's four
          rules run the world's full height and width, and the paper colours in
          behind the last of them, slower than the rule itself so its edge can
          never catch up. The mark, the chrome and question one arrive on that
          same beat. See the .arrive rules in css/10-chrome.css.

   NOTHING HERE MEASURES IN PIXELS OF ITS OWN. The demo hard-coded CELL=20; the
   board's cell is cellSize() and its phase is the viewport centre, per
   CLAUDE.md, and every length below is written in cells against them.
   ===================================================================== */

/* The grid run. DUR_LINE is one line's own eased sweep; the two stairs are the
   gap between one line setting off and the next, and they are tight, so many
   lines are in motion at once and the group never coasts through a static tail
   before the next phase. These are fixed beats and NOT a total budget divided
   by however many lines a viewport happens to have — that was tried and it is
   what produced the coasting. The film's length therefore follows the viewport
   rather than targeting a number. */
const RUN_DUR_LINE=720;             /* ms one line takes to cross, eased out */
const RUN_STAIR_H=8;                /* ms between one horizontal starting and the next */
const RUN_STAIR_V=7;                /* and between one vertical and the next */
const RUN_HEAD=2.2;                 /* the darker running tip, in CELLS */
/* WHEN THE HORIZONTAL PASS IS OVER, and it is not when its ease arithmetically
   ends. The verticals must not begin until the horizontals are done — that was
   settled when interleaving them was rejected — but the last fifth of an
   ease-out covers well under a percent of the distance, so waiting for it put a
   dead beat between the two passes where nothing visible was happening. At .82
   the last line has travelled 99.4% of the width: it has LANDED, and the
   verticals set off against a horizontal pass that is visibly complete.
   The gap between the two is what Karin asked to be instant, and this is it. */
const RUN_LANDED=0.82;

/* The board's arrival. ONE FRONT sets it going: the last of the four rules
   sweeps left to right across the viewport and the board is uncovered behind it
   as it passes — the question column, the mark, the dots.

   THE PAPER IS THE ONE THING THAT LAGS, and deliberately (Karin, 17 Aug: the
   poster's own animation slower still). It is wiped in the same direction on
   the same beat, but on a longer clock, so its edge trails the rule that has
   already gone past — the sheet fills in rather than being switched on. Because
   PAPER is well over DUR, that edge can never catch the line up. The rest of
   the board is not given this: a question panel filling in slowly would read as
   a loading bar, where a sheet of paper taking colour reads as paper. */
const ARRIVE_STAIR=120;             /* ms between one rule starting and the next */
const ARRIVE_DUR=820;               /* ms for a rule, and the board behind it, to cross */
const ARRIVE_PAPER=1300;            /* ms for the poster's paper alone — slower, and trailing */
const ARRIVE_BEAT=3*ARRIVE_STAIR;   /* when the last rule — and so the board — sets off */

const easeOut3=p=>1-Math.pow(1-p,3);

/* The way out of the opening screen, and the only one: START calls this rather
   than finishBase() directly (see advanceLanding). Under reduced motion there
   is no film at all — the handover is immediate, exactly as it was. */
function playOpening(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){ finishBase(); return; }
  runGrid(arriveBoard);
}

/* ---- 1-2: the grid runs -------------------------------------------------- */
function runGrid(done){
  /* The opening screen's light stops dead on the press. It is the visitor's
     cursor made visible, and the visitor has just stopped pointing and acted —
     leaving it drifting under the lines would be the screen still idling while
     the film runs. A cut, like everything else here. */
  if(heroTourCtl){ heroTourCtl.stop(); heroTourCtl=null; }
  heroHoverCell=null;
  if(FIELD){ FIELD.stop(); FIELD=null; }
  const worn=landing.querySelector('#heroField');
  if(worn) worn.remove();

  const cv=document.createElement('canvas');
  cv.id='gridRun';
  cv.setAttribute('aria-hidden','true');     /* decorative: the board it builds carries the meaning */
  landing.insertBefore(cv,landingBody);
  const ctx=cv.getContext('2d');

  /* read from the palette, never hard-coded — the same rule heroField follows.
     SQ is the resting square, so the film's first frame is the screen's last
     one; GRID is what .gridlayer paints, so its last frame is the board's
     first; DARK is the running tip, and the only reason the lines read as
     RUNNING rather than as growing. */
  const css=k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const SQ=css('--line')||'rgba(0,0,0,.16)';
  const GRID=css('--gridline')||'#D7D4CC';
  const DARK=css('--sheetline')||'rgba(0,0,0,.34)';

  let W=0,H=0,cell=20,X=[],Y=[],squares=[],tiles=[];
  let hTotal=0,total=0,head=0,mark=2;
  let t0=0,raf=null,jump=false;

  function measure(){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    W=cv.clientWidth||window.innerWidth;
    H=cv.clientHeight||window.innerHeight;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    /* THE PHASE, and it is not the screen edge. A junction falls through the
       centre of the viewport — that is what .gridlayer's background-position
       says (50vw/50dvh) and what heroField's lattice used, so the film's lines
       land on the very pixels the board's own grid will. */
    cell=cellSize();
    const sox=((W/2)%cell+cell)%cell, soy=((H/2)%cell+cell)%cell;
    X=[]; Y=[];
    for(let x=sox-Math.ceil(sox/cell)*cell; x<=W+cell; x+=cell) X.push(x);
    for(let y=soy-Math.ceil(soy/cell)*cell; y<=H+cell; y+=cell) Y.push(y);

    /* when the horizontal pass's last line has LANDED — the moment the vertical
       pass is allowed to begin — and when the whole run is over */
    hTotal=(Y.length-1)*RUN_STAIR_H+RUN_DUR_LINE*RUN_LANDED;
    total=hTotal+(X.length-1)*RUN_STAIR_V+RUN_DUR_LINE;

    head=RUN_HEAD*cell;
    /* the same square heroField rests at, so nothing changes size on the cut
       from that canvas to this one */
    mark=Math.max(2,Math.round(cell*.055));

    squares=[];
    X.forEach((x,ci)=>Y.forEach((y,ri)=>squares.push({ci,ri,x,y,alive:true})));

    /* The mark's cells, measured once. They are DOM and they are opaque, so a
       line under one is hidden until the cell goes — which is the read we
       want: the line arrives, the letter is gone, and the line is there
       underneath it. */
    tiles=[...landing.querySelectorAll('.klogo .kt,.kstart')].map(el=>{
      const r=el.getBoundingClientRect();
      return {el,x:r.left,y:r.top,w:r.width,h:r.height,alive:true};
    });
  }

  /* how far each line has travelled, in px. Horizontals first, verticals only
     once the whole horizontal pass is done. */
  const hAt=(t,i)=>easeOut3(Math.max(0,Math.min(1,(t-i*RUN_STAIR_H)/RUN_DUR_LINE)))*W;
  const vAt=(t,i)=>easeOut3(Math.max(0,Math.min(1,(t-hTotal-i*RUN_STAIR_V)/RUN_DUR_LINE)))*H;

  function step(now){
    const t=jump?total:now-t0;
    const hd=Y.map((y,i)=>hAt(t,i));
    const vd=X.map((x,i)=>vAt(t,i));

    /* THE LINE COLLECTS THE SQUARE. A junction dies the moment the drawn part
       of either line through it has passed over it — not on a timer of its
       own, so the two can never disagree about where the front is. */
    for(const s of squares){
      if(!s.alive) continue;
      if((hd[s.ri]>0&&hd[s.ri]>=s.x-1)||(vd[s.ci]>0&&vd[s.ci]>=s.y-1)) s.alive=false;
    }
    for(const tl of tiles){
      if(!tl.alive) continue;
      const hit=Y.some((y,i)=>y>tl.y-1&&y<tl.y+tl.h+1&&hd[i]>tl.x)
             || X.some((x,i)=>x>tl.x-1&&x<tl.x+tl.w+1&&vd[i]>tl.y);
      if(hit){ tl.alive=false; tl.el.classList.add('cut'); }
    }

    /* nothing paints a ground: #landing is the ink under this, exactly as it
       was under #heroField */
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle=SQ;
    for(const s of squares) if(s.alive)
      ctx.fillRect(Math.round(s.x-mark/2),Math.round(s.y-mark/2),mark,mark);

    ctx.fillStyle=GRID;
    Y.forEach((y,i)=>{ if(hd[i]>0) ctx.fillRect(0,Math.round(y),hd[i],1); });
    X.forEach((x,i)=>{ if(vd[i]>0) ctx.fillRect(Math.round(x),0,1,vd[i]); });

    ctx.fillStyle=DARK;
    Y.forEach((y,i)=>{ const d=hd[i]; if(d>0&&d<W){ const a=Math.max(0,d-head);
      ctx.fillRect(a,Math.round(y),d-a,1); } });
    X.forEach((x,i)=>{ const d=vd[i]; if(d>0&&d<H){ const a=Math.max(0,d-head);
      ctx.fillRect(Math.round(x),a,1,d-a); } });

    /* The run is over and this frame is the finished grid. Hand over on the
       NEXT one, so the frame that is displayed at the moment the screen goes is
       the complete lattice and not one still carrying a running tip. */
    if(t>=total){ raf=requestAnimationFrame(()=>{ teardown(); done(); }); return; }
    raf=requestAnimationFrame(step);
  }

  /* A resize mid-film goes straight to the end rather than replaying. The
     lattice is a function of the viewport, so half a film measured against the
     old one is not something to carry on with, and starting again would make
     dragging a window corner replay the opening over and over.

     ONLY IF THE VIEWPORT ACTUALLY CHANGED SIZE. A bare `resize` listener here
     cut the film off at the second frame every time: browsers fire the event
     for things that are not a resize at all — a phone's URL bar sliding away is
     the one that matters, and it fires constantly — and the film would be over
     before it had drawn three lines. The event is the hint; the measurement is
     the fact. */
  const onResize=()=>{
    if(cv.clientWidth===W && cv.clientHeight===H) return;
    measure(); jump=true;
  };
  window.addEventListener('resize',onResize);

  function teardown(){
    if(raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize',onResize);
    cv.remove();
  }

  measure();
  raf=requestAnimationFrame(now=>{ t0=now; raf=requestAnimationFrame(step); });
}

/* ---- 3-5: the board arrives ---------------------------------------------- */
function arriveBoard(){
  /* THE SCREEN CUTS OUT, it does not fade. #landing's own .38s fade is right
     for every other way it closes, and wrong for this one: the film's last
     frame is pixel for pixel what .gridlayer paints underneath it, so a fade
     here would be the grid dissolving against itself for a third of a second
     while the poster tries to arrive through the veil. Cleared by showIntro,
     so Reset gets its ordinary fade back. */
  landing.classList.add('nofade');

  /* THE FILM'S CLOCK, WRITTEN ONCE. The rules and the wipe behind them are CSS
     transitions and the classes that release them are JS timers, so the two
     have to agree about the beat exactly — and the way this codebase settles
     that is the way --cell is settled: JS owns the number and writes it out.
     See the .arrive rules in css/10-chrome.css, which read nothing else. */
  root.style.setProperty('--arrive-stair',ARRIVE_STAIR+'ms');
  root.style.setProperty('--arrive-dur',ARRIVE_DUR+'ms');
  root.style.setProperty('--arrive-paper',ARRIVE_PAPER+'ms');
  root.style.setProperty('--arrive-beat',ARRIVE_BEAT+'ms');

  /* the from-state, set while the screen still covers it: the four rules
     collapsed, the whole board clipped away behind the last of them */
  document.body.classList.add('arrive');

  /* THE QUESTION SYSTEM DOES NOT ARRIVE TWICE. It owns a trickle of its own —
     four parts cutting in one HERO_BEAT apart — and it is right for every
     question after this one, where there is nothing else moving on the board.
     Here the wipe is already carrying it in, left to right, along with the
     poster and the mark, and a stagger on top of that would be two notations
     for one event. Telling renderSnake this question is not new is what turns
     the trickle off, and it turns itself back on for question two. */
  const q1=snakeQ();
  if(q1) renderSnake.last=q1.id;

  finishBase();

  /* finishBase's relayout has already forced layout with .arrive applied, so
     the from-state is computed and the transitions below have something to
     travel from; the frame's wait is what separates the two states. */
  requestAnimationFrame(()=>{
    document.body.classList.add('arrive-go');
    /* the fixed chrome is not on the board and the wipe cannot carry it, so it
       cuts in on the beat the front sets off */
    setTimeout(()=>document.body.classList.add('arrive-lit'),ARRIVE_BEAT);
    /* the film leaves nothing behind: every class it set is dropped once the
       LAST of it is over, which is the paper and not the rules — dropping them
       on the rules' clock would cut the sheet in whole with a third of its fill
       still to run */
    setTimeout(()=>document.body.classList.remove('arrive','arrive-go','arrive-lit'),
               ARRIVE_BEAT+Math.max(ARRIVE_DUR,ARRIVE_PAPER)+60);
  });
}
