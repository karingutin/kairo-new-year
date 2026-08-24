/* ---------------------------------------------------------------------
   The snake's events, delegated once on #qsys — renderSnake replaces its
   innerHTML on every repaint, so per-element listeners would have to be
   re-bound each time and one missed rebind is a dead control.
   --------------------------------------------------------------------- */
let dialDrag=null, barDrag=null;
qsys.addEventListener('click',e=>{
  /* the way out, once the poster is made — three ways to keep it and one back */
  const out=e.target.closest('.qout,.qback');
  if(out){
    const act=out.dataset.act;
    if(act==='png') exportPNG(out);
    else if(act==='jpg') exportJPG(out);
    else if(act==='svg') exportSVG();
    else hideFinish();
    return;
  }
  const save=e.target.closest('.qsave');
  if(save){
    /* THE TENTH PRESS DOES TWO THINGS, in this order: it banks the colourway
       exactly as every other Next banks its answer, and then it ends the
       asking. Reading the question BEFORE saving matters — saveAnswer moves the
       flow on, so afterwards snakeQ() is no longer the question that was
       pressed. */
    const cur=snakeQ();
    saveAnswer();
    if(isCreateQ(cur)) showFinish(); else renderSnake();
    return;
  }
  const mo=e.target.closest('.mring .mo');
  if(mo){
    const cur=snakeQ();
    if(cur){
      S.answers[cur.id]=mo.dataset.val; S.touched[cur.id]=true;
      const q=BANK[cur.id];
      if(q && q.onPick) q.onPick(); else draw();
      renderSnake();
    }
    return;
  }
  /* .qduo/.qfill are the shape and density controls, carried over from the old
     landing screens — HTML buttons like .qopts, registering the same way */
  const opt=e.target.closest('.qopts button, .qduo button, .qfill button');
  if(opt){
    const cur=snakeQ();
    if(cur){
      S.answers[cur.id]=opt.dataset.val; S.touched[cur.id]=true;
      const q=BANK[cur.id];
      if(q && q.onPick) q.onPick(); else draw();
      renderSnake();
    }
    return;
  }
  /* the vacations circles and the february cards register the same way a card does */
  const disc=e.target.closest('.vcirc .vc, .fcard .fc, .cway .cw');
  if(disc){
    const cur=snakeQ();
    if(cur){
      /* colourway has a twist: clicking the ALREADY-chosen swatch flips its two
         inks (the ⇄ glyph on it advertises this); a different swatch just selects
         it, in its natural orientation. */
      if(cur.id==='colorway'){
        const val=disc.dataset.val, isRandom=(val==='random');
        if(String(S.answers.colorway)===String(val)){
          /* re-picking the chosen swatch: a fixed pair FLIPS its two inks; 'random'
             ROLLS a fresh pair. Either way the sheet dissolves to the new colours
             while the swatch spins, then the panel settles. */
          if(isRandom) rollRandomPair(); else S.colorSwap=!S.colorSwap;
          if(reduceMotion && reduceMotion()) draw(); else crossfadePoster();
          spinSwatch(disc, ()=>renderSnake());
        } else {
          S.colorSwap=false;
          if(isRandom) rollRandomPair();          // first pick rolls the opening pair
          S.answers.colorway=val; S.touched.colorway=true;
          draw(); renderSnake();
        }
        return;
      }
      S.answers[cur.id]=disc.dataset.val; S.touched[cur.id]=true;
      const q=BANK[cur.id];
      if(q && q.onPick) q.onPick(); else draw();
      renderSnake();
    }
    return;
  }
  /* dial taps are handled in pointerup (pointerdown preventDefault eats this click) */
  const past=e.target.closest('.qstep.past');
  if(past){
    const n=ASKED.findIndex(q=>q.id===past.dataset.qid);
    if(n>=0){ snakeAt=n; closeCard(false); renderSnake(); draw(); }
  }
});
qsys.addEventListener('keydown',e=>{
  const barSvg=e.target.closest('.qpanel svg.bar');
  if(barSvg){
    const k = e.key==='ArrowRight'||e.key==='ArrowUp' ? 1
            : e.key==='ArrowLeft' ||e.key==='ArrowDown' ? -1 : 0;
    if(k){ e.preventDefault();
      const cur=snakeQ();
      if(cur) barTurn(cur.id, barRing(BANK[cur.id]).idx + k); }
    return;
  }
  const svg=e.target.closest('.qpanel svg.dial');
  if(svg){
    const k = e.key==='ArrowRight'||e.key==='ArrowUp' ? 1
            : e.key==='ArrowLeft' ||e.key==='ArrowDown' ? -1 : 0;
    if(k){
      e.preventDefault();
      const cur=snakeQ();
      if(cur) dialTurn(cur.id,k);
    }
    return;
  }
  const cell=e.target.closest('.qstep.past');
  if(cell && (e.key==='Enter'||e.key===' ')){ e.preventDefault();
    const n=ASKED.findIndex(q=>q.id===cell.dataset.qid);
    if(n>=0){ snakeAt=n; closeCard(false); renderSnake(); draw(); } }
});
/* Dragging the wheel. Travel is measured in CELLS, not pixels, so the wheel
   turns at the same rate relative to the design at any window size. */
qsys.addEventListener('pointerdown',e=>{
  /* the horizon first. A CLICK springs to the stop under the point pressed; a DRAG
     moves the handle 1:1 with the finger along the track, RELATIVE to where the
     press landed — so the handle never jumps out from under you on touch-down the
     way an absolute slider does. Past either end the travel is damped rather than
     stopped (see barRubber), and the release settles onto the nearest stop. */
  const barSvg=e.target.closest('.qpanel svg.bar');
  if(barSvg){
    const cur=snakeQ(); if(!cur) return;
    cancelAnimationFrame(barRAF);
    const R=barRing(BANK[cur.id]);
    const p0=R.n>1 ? R.idx/(R.n-1) : 0;
    barDrag={qid:cur.id, moved:false, startX:e.clientX, startP:p0, pid:e.pointerId,
             tw:barTrackClient(barSvg), downIdx:barIdxFromEvent(barSvg,e.clientX)};
    barLive={qid:cur.id, p:p0};
    /* CAPTURE ON qsys, NOT ON THE SVG. Every stop the finger crosses banks the
       answer, and banking re-renders the panel — which destroys the svg the
       capture was on. The capture dies with it, and from then on the drag only
       survives while the pointer happens to still be over the new svg: slide a
       few pixels off the control, or off the panel, and the move events stop
       arriving and the handle sticks. qsys is the element the listeners are on
       and the one thing here that is never rebuilt. */
    qsys.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  /* .dial, not any svg in the panel: the month ring is an svg too, and capturing
     the pointer here killed the click that chose a month. */
  const svg=e.target.closest('.qpanel svg.dial');
  if(!svg) return;
  const cur=snakeQ();
  if(!cur) return;
  /* remember the number under the finger: if the press ends without turning into
     a drag, that is a TAP and we jump straight to it (preventDefault below eats
     the click event, so tap-to-select is handled here, not by the click handler). */
  dialDrag={x:e.clientX, qid:cur.id, taken:0, hit:e.target.closest('.dial-hit')};
  svg.setPointerCapture(e.pointerId);
  e.preventDefault();
});
qsys.addEventListener('pointermove',e=>{
  if(barDrag){
    const R=barRing(BANK[barDrag.qid]);
    const dx=e.clientX-barDrag.startX;
    if(Math.abs(dx)>3) barDrag.moved=true;
    const p=barRubber(barDrag.startP + dx/barDrag.tw);
    barLive={qid:barDrag.qid, p};
    /* the stop the handle is nearest, from the UNSTRETCHED position, so the
       rubber band at the ends cannot ask for an index that is not there */
    const want=Math.max(0,Math.min(R.n-1, Math.round(Math.max(0,Math.min(1,p))*(R.n-1))));
    /* crossing a stop banks the answer and repaints the poster's brick band; the
       rebuilt panel reads barLive, so the handle stays under the finger. Between
       crossings nothing is rebuilt and the handle is just moved. */
    if(want!==R.idx) barTurn(barDrag.qid, want, true);
    else paintBar(p);
    return;
  }
  if(!dialDrag) return;
  const per=DIAL.dragPerStep*cellSize();
  const want=Math.round((e.clientX-dialDrag.x)/per);
  /* animate every step the drag crosses — the swap must be seen turning, not cut,
     so dragging spins with the same grow/shrink settle as a click (no noSpin). */
  if(want!==dialDrag.taken){ dialTurn(dialDrag.qid, want-dialDrag.taken); dialDrag.taken=want; }
});
qsys.addEventListener('pointerup',()=>{
  /* a press that never became a drag is a tap on the track — spring to that stop */
  if(barDrag){
    const d=barDrag; barDrag=null;
    try{ qsys.releasePointerCapture(d.pid); }catch(_){}
    if(!d.moved){ barLive=null; barTurn(d.qid, d.downIdx); return; }
    /* THE RECOIL. Let go of something stretched and it does not glide to rest,
       it springs past and comes back — so the release uses the back curve, not
       the flat one. It is the same easing a tap uses, and deliberately: letting
       go IS the same event as arriving, and the bar should behave the one way. */
    const R=barRing(BANK[d.qid]);
    const to=R.n>1 ? R.idx/(R.n-1) : 0;
    runBar(barLive?barLive.p:to, to, true, ()=>{ barLive=null; renderSnake(); });
    return;
  }
  /* a press that never became a drag is a tap on a number — select it, animated */
  if(dialDrag && dialDrag.taken===0 && dialDrag.hit){
    dialTurn(dialDrag.qid, +dialDrag.hit.dataset.step);
  }
  dialDrag=null;
});
qsys.addEventListener('pointercancel',()=>{
  dialDrag=null;
  if(barDrag){
    try{ qsys.releasePointerCapture(barDrag.pid); }catch(_){}
    barDrag=null; barLive=null; cancelAnimationFrame(barRAF); renderSnake();
  }
});

