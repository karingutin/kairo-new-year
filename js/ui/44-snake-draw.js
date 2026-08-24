/* =====================================================================
   Drawing the snake. Past markers, the current figure, and nothing else —
   a question not yet reached has no mark, exactly as the mock has no 3.
   ===================================================================== */
/* WHICH QUESTION THE PANEL IS SHOWING.
   null means "the one the flow is on" — the first still unanswered. Going back
   to a marker sets it to that question's index, and Save clears it, so the
   panel returns to the front of the flow once the revisit is banked.
   This exists because there was no notion of it: going back called
   openQuestion(), which draws the OLD floating card, so a revisited question
   appeared in the previous design's clothes. The board must never call that. */
let snakeAt=null;
/* A one-shot delay in front of the next arrival stagger, in ms. Zero almost
   always; set to the flip's length by hideFinish so the questions wait for the
   ground to come back before they cut in. See the note where it is consumed. */
let snakeLead=0;
function snakeIndex(){
  const first=ASKED.findIndex(q=>!isDone(q.id));
  if(snakeAt!=null && snakeAt>=0 && snakeAt<ASKED.length) return snakeAt;
  return first;
}
const snakeQ=()=>{ const i=snakeIndex(); return i<0 ? null : ASKED[i]; };

function renderSnake(){
  if(!S.baseDone){ qsys.innerHTML=''; return; }
  /* THE ASKING IS OVER. The whole run goes — trail, marker, counter, panel and
     Create — and the way out stands in its place. Everything the question
     system draws lives in this one element, so taking the questions away is
     one branch rather than ten things to hide. */
  if(posterDone){ renderFinish(); return; }
  const c=cellSize();
  const cur=snakeIndex();
  let html='';

  /* The trail: every question behind us EXCEPT the one being shown. Keyed on
     each question's own state rather than on "index below the cursor", so a
     revisit keeps the whole trail drawn instead of truncating it.

     BEHIND US MEANS REACHED, NOT BANKED. This tested isDone alone, and isDone
     is only true once Next has been pressed — so the question you were LOOKING
     at when you jumped back up the trail matched neither branch: no longer the
     current one, never banked. Its marker simply vanished and the run showed a
     hole where it had been (go to five, click two, and the 5 is gone). Reaching
     a question is what puts it behind you; banking it is a different fact.
     Both are tested because they are not nested: Save sets done and keeps
     reached, but SKIP sets done and DELETES reached (see step()), so neither
     one alone covers the trail. */
  for(let n=0;n<ASKED.length;n++){
    const q=ASKED[n];
    if(n===cur || !(isDone(q.id) || S.reached[q.id])) continue;
    const F=snakeFigure(n);
    /* only claim it was answered if it actually was — a question left open and
       stepped away from is on the trail, but nothing was banked for it */
    const state=isDone(q.id) ? ' (answered)' : '';
    html+='<div class="qstep past" data-qid="'+q.id+'" tabindex="0" role="button"'
        + ' aria-label="'+pad2(n+1)+' of '+pad2(ASKED.length)+'. '+esc(q.title)+state+'"'
        + ' style="'+cssBox(cellBox(F.step))+';font-size:'+(0.33*c).toFixed(1)+'px">'
        + (n+1)+'</div>';
  }
  if(cur<0){ qsys.innerHTML=html; return; }    // everything answered

  /* the current figure */
  const q=ASKED[cur], F=snakeFigure(cur);
  /* TRICKLE DOWN. The four parts cut in one after another, in the order the eye
     builds them: which question, of how many, what it asks, and then the way
     out. It is a stagger of the SAME 110ms beat the opening screen runs on, so
     the piece keeps one clock.

     Only on ARRIVAL. Tagging every repaint would replay the stagger on every
     keystroke of a drag, so the class goes on only when the question showing
     has actually changed. */
  const arriving = renderSnake.last!==q.id;
  renderSnake.last=q.id;
  /* The density circles' rise plays on ARRIVAL — every time the question comes
     up, first visit or a return to it — and never on a pick, whose re-render
     keeps the circles standing. `pending` holds the rise armed across a
     double render: a revisit repaints twice in one tick (closeCard and the
     marker handler both render), and the second pass is no longer "arriving" —
     without it the rise died before it ever reached the screen. It clears in
     the rAF that actually raises the fills. */
  densityFillMarkup.rise = arriving || !!densityFillMarkup.pending;
  const A='';
  html+='<div class="qstep now'+A+'" style="'+cssBox(cellBox(F.step))
      + ';font-size:'+(0.33*c).toFixed(1)+'px">'+(cur+1)+'</div>';
  html+='<div class="qtotal'+A+'" style="'+cssBox(cellBox(F.total))
      + ';font-size:'+(0.40*c).toFixed(1)+'px">/'+ASKED.length+'</div>';

  const PH=F.panel.h;
  const pb=cellBox(F.panel);
  /* 0.52 of a cell, not 0.372. The mock's 16px was measured on its own 43px
     cell and came out too small to read at this size — the first question was
     the tell. Every question is set at this one size; nothing is scaled per
     question except the panel that holds it. */
  /* EVERY PANEL FLOWS. Title, hint and control sit in ONE .qflow column that
     owns all the spacing — vertical padding is the hug, the children's margins
     are the gaps — and the panel's height is auto: it hugs the content instead
     of holding 10 cells. The padding is vertical ONLY, so an svg control can
     span the panel's full width and keep its viewBox at 1:1 with the screen;
     the words carry the side hug as their own horizontal margins. Each control
     crops its viewBox to just itself, so where it drew inside the old 10-cell
     card no longer matters — the flow places it under the REAL text. */
  html+='<div class="qpanel'+A+'" style="left:'+pb.left.toFixed(1)+'px;top:'+pb.top.toFixed(1)+'px;'
      + 'width:'+pb.w.toFixed(1)+'px;height:auto">'
      + panelInner(q,c,PH,F.panel.w)
      + '</div>';

  /* Shut until a card has been picked. With no standing default there is nothing
     to bank, and a live Save would either record an answer nobody gave or do
     nothing when pressed — both worse than a button that is visibly not ready. */
  const locked=needsPick(q) && !isChosen(q.id);
  html+='<button type="button" class="qsave'+A+(locked?' locked':'')+'"'
      + (locked?' disabled aria-disabled="true"':'')
      + ' style="'+cssBox(cellBox(F.save))
      + ';font-size:'+(saveFS(q)*c).toFixed(1)+'px;letter-spacing:'+(0.03*c).toFixed(2)+'px">'
      + saveLabel(q) + '</button>';

  qsys.innerHTML=html;

  /* PANELS hug their content, so the box they end up with is whatever the words
     and the control add up to — which lands its bottom edge in the middle of a
     cell. THE PANEL IS INTERFACE, so it has to sit on the lattice like every
     other part of it: measure the hug, round the height UP to whole cells, and
     ASSIGN it. The slack falls at the panel's foot (see settleControl for the
     questions whose control then takes half of it back; the composition inside is
     tuned separately), and Next then hangs off a corner that is really on a
     line rather than off an estimate. Karin's rule, 16 Aug.
     Only the downward-opening figure reseats Next: the mirrored ones seat it a
     row ABOVE the panel's top, which is already on a line whatever the height. */
  const panelEl=qsys.querySelector('.qpanel');
  if(panelEl){
    const hCells=Math.max(1, Math.ceil(panelEl.offsetHeight/c - 0.01));
    panelEl.style.height=(hCells*c).toFixed(1)+'px';
    if(F.sy>0){
      const saveEl=qsys.querySelector('.qsave');
      if(saveEl) saveEl.style.top=(pb.top + hCells*c).toFixed(1)+'px';
    }
    settleControl(panelEl, hCells*c, q);
  }

  /* THE DENSITY CIRCLES' rise, on arrival only: the markup came out with the
     fills at 0 (see densityFillMarkup.rise), so one frame later they climb to
     their levels. A pick's re-render bakes the levels in as inline heights and
     there is nothing here to do — baking them is what makes the no-animation
     case airtight: this function forces a layout right above (the Save fit
     reads offsetHeight), and a height set from 0 AFTER a forced layout is a
     transition the browser will happily play. */
  if(densityFillMarkup.rise){
    const fills=qsys.querySelectorAll('.qfill .circ i');
    if(fills.length){
      densityFillMarkup.pending=true;
      requestAnimationFrame(()=>{
        densityFillMarkup.pending=false;
        fills.forEach(i=>{ i.style.height=i.dataset.fill+'%'; });
      });
    }
  }

  /* THE TRICKLE-DOWN, on timers rather than on a CSS animation.
     It was an animation with a staggered delay, and that is how the /9 cell
     disappeared: a CSS animation is PAUSED in a backgrounded tab, and the
     fill-mode held its from-state — opacity 0 — for as long as it never ran.
     Whatever hides a thing must be the same thing that shows it again, and a
     timer fires eventually in every state a tab can be in.

     Order is the order the eye builds the question: which one, of how many, what
     it asks, then the way out. Beat is HERO_BEAT, the opening screen's clock, so
     the piece keeps one. Everything CUTS — visibility, never opacity. */
  if(arriving){
    const parts=[qsys.querySelector('.qstep.now'), qsys.querySelector('.qtotal'),
                 qsys.querySelector('.qpanel'),   qsys.querySelector('.qsave')];
    clearTimeout(renderSnake.t);
    parts.forEach(el=>{ if(el) el.style.visibility='hidden'; });
    const show=k=>{
      if(k>=parts.length) return;
      if(parts[k] && parts[k].isConnected) parts[k].style.visibility='';
      renderSnake.t=setTimeout(()=>show(k+1), HERO_BEAT);
    };
    /* normally none — a question follows the one before it straight away. The
       one exception is coming BACK from the ending (see hideFinish), where the
       ground is still dark for the length of the flip and a black marker and a
       black Create would arrive into it invisible. Consumed here, so it can
       never leak into the next question's arrival. */
    const lead=snakeLead; snakeLead=0;
    if(lead) renderSnake.t=setTimeout(()=>show(0), lead); else show(0);
  }

  /* EVERY question opens in the panel now — the old floating card is no longer
     reached from the board at all. What openQuestion used to do besides drawing
     the card still has to happen, though: mark the question reached so the
     sheet starts responding, and register the standing default so the record is
     explicit rather than implied by a fallback. */
  S.reached[q.id]=true;
  /* only the scale-shaped questions open on a value — see needsPick */
  if(!needsPick(q) && S.answers[q.id]===undefined) S.answers[q.id]=q.default;
}

/* =====================================================================
   THE WAY OUT. Three ways to keep the poster and one way back, standing on
   the cells the questions stood on (see finishFigure for the geometry).

   It is drawn by the same function that drew the questions, into the same
   element, on the same trickle-down beat — because it is the same figure
   walking one step further, not a different screen. Back is set in the
   Reset control's own clothes rather than as a fourth white cell: it is the
   one of the four that undoes something, and it should not look like a way
   to keep the poster.
   ===================================================================== */
function renderFinish(){
  const c=cellSize();
  const html=finishFigure().map(o=>{
    const box=cssBox(cellBox(o.box));
    if(o.act==='back')
      return '<button type="button" class="qback" data-act="back"'
           + ' style="'+box+'"><span>'+o.label+'</span></button>';
    return '<button type="button" class="qout" data-act="'+o.act+'"'
         + ' style="'+box+';font-size:'+(0.34*c).toFixed(1)+'px'
         + ';letter-spacing:'+(0.03*c).toFixed(2)+'px">'+o.label+'</button>';
  }).join('');
  qsys.innerHTML=html;

  /* the same stagger the questions arrive on, and only on ARRIVAL — a resize
     re-places these boxes and must not replay it.

     IT WAITS FOR THE BOARD TO TURN OVER. These cells are the panel's white on
     a ground that is still the panel's white for the length of the flip, so
     arriving on the beat meant arriving invisibly and then being revealed by
     the ground going dark underneath them — which reads as the buttons fading
     in badly rather than as the board turning. So: the questions leave, the
     ground goes to its negative, and only then does the way out cut in, one
     box at a time. Three separate events in the order they should be read. */
  if(!renderFinish.shown){
    renderFinish.shown=true;
    const parts=[...qsys.children];
    clearTimeout(renderSnake.t);
    parts.forEach(el=>{ el.style.visibility='hidden'; });
    const show=k=>{
      if(k>=parts.length) return;
      if(parts[k] && parts[k].isConnected) parts[k].style.visibility='';
      renderSnake.t=setTimeout(()=>show(k+1), HERO_BEAT);
    };
    /* reduced motion has no flip to wait for — the CSS forces every transition
       off, so the ground is already dark and the wait would be dead time */
    renderSnake.t=setTimeout(()=>show(0),
      (reduceMotion && reduceMotion()) ? 0 : FLIP_MS);
  }
  /* the questions have to arrive again if they ever come back */
  renderSnake.last=null;
}

/* WHICH CONTROLS SETTLE, by question id. Not a blanket rule and not by control
   type — a question earns its place here by being asked for. month (Q3) and
   saying (Q9) came first; febdays (Q4) and vacations (Q7) joined them when
   Karin asked for the two remaining circle rows to match Q9 (16 Aug). Each
   equalises the air in ITS OWN panel rather than copying a number from Q9, and
   because all three rows are the same size in the same box they land on the
   same 0.647 anyway. */
const SETTLE_CONTROL={month:'svg.mring', saying:'svg.vcirc',
                      febdays:'svg.vcirc', vacations:'svg.vcirc'};

/* THE CONTROL SETTLES INTO THE MIDDLE OF THE ROOM THE WORDS LEFT.
   Karin, 16 Aug: "the circles should go a bit down so the padding above and
   below are the same" (Q3), and "take the circles a bit down" (Q9). Both read
   the same way — the month at 0.16 of a cell of air above against 0.99 below,
   saying at 0.41 against 0.88. The panel is snapped UP to whole cells and all
   of that slack fell at the foot, so the control was stuck to the words with a
   field of white beneath it. Half the difference moves it down and the two
   match.

   WHY IT IS DONE HERE AND NOT IN THE MARKUP. The markup runs before there is
   any layout, so the only text height it can have is panelSize's ESTIMATE —
   and for the month the estimate is a line out (it reads the title as three
   lines where it sets in two). Deriving the gap from that put the grid 0.4 of a
   cell off, in the wrong direction. This point in renderSnake is the one place
   the REAL numbers exist: the panel's height has just been assigned and its
   children have really been laid out.

   It costs nothing. The snap directly above already read offsetHeight, so the
   layout is forced whether this runs or not — the standing rule against reading
   back geometry (see panelSize) is about not ADDING a pass, and this adds none.

   Only ever DOWN: a panel too tight to give the control its Figma gap keeps the
   Figma gap and stays as it was. */
function settleControl(panelEl, panelH, q){
  const sel=SETTLE_CONTROL[q&&q.id];
  const grid=sel && panelEl.querySelector(sel);
  const prev=grid && grid.previousElementSibling;
  if(!grid || !prev) return;
  /* getBoundingClientRect, not offsetTop: an SVG element is not an HTMLElement
     and carries none of the offset* properties — they come back undefined and
     the arithmetic silently becomes NaN, which is exactly what it did the first
     time this was written. Everything is taken against the panel's own top so
     the numbers are panel-relative, the way the eye reads them. */
  const pT=panelEl.getBoundingClientRect().top;
  const g=grid.getBoundingClientRect(), pv=prev.getBoundingClientRect();
  const above=g.top-pv.bottom;
  const below=(pT+panelH)-g.bottom;
  const shift=(below-above)/2;
  if(shift<=0.5) return;                       // already even, to within half a pixel
  grid.style.marginTop=(parseFloat(grid.style.marginTop||0)+shift).toFixed(1)+'px';
}

/* The control the panel holds. One per question TYPE, and the panel is what
   they have in common — see the .qopts rules for why the binary and the months
   are not wheels. Positioned in the panel's own cell module: the question takes
   the top two rows, the control the bottom one and a half. */
