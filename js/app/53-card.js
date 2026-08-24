/* ---------- card contents ---------- */
function renderCard(){
  const D=derive();
  cardBody.innerHTML='';
  const box=document.createElement('div');
  box.className='q';

  /* THE FINISH CARD IS GONE. It was a floating popup — Download PNG, SVG for
     print, and the collection tools — opened by the "Create Poster" button, and
     the two are gone together. The ending is drawn on the lattice now, where the
     questions were (see renderFinish). copyPayload and downloadResponses are
     still defined and still callable; they simply have no button on the board.

     What is left in this function is the old floating question card, which the
     board also no longer opens — every question is answered in the panel (see
     renderSnake). It is kept only because openQuestion still calls it. */

  const q=BANK[openQ];
  if(!q) return;
  const idx=ASKED.findIndex(x=>x.id===openQ);
  box.innerHTML=
    '<div class="eyebrow"><span>'+esc(q.label)+'</span>'
    + '<span class="eyebrow-right">'+pad2(idx+1)+' / '+pad2(ASKED.length)+'</span></div>'
    + '<h2>'+val(q.title,D)+'</h2><p class="hint">'+val(q.hint,D)+'</p>';
  box.appendChild(CONTROLS[q.type](q));
  cardBody.appendChild(box);

  /* Two exits, and they do different things — which is exactly what the old
     Done / Close pair failed to say. Save banks the answer and moves on; Skip
     passes the question by and moves on WITHOUT recording one. Cancelling is a
     third thing again and needs no button: Escape, or clicking the dot a second
     time, shuts the card and leaves the question exactly as it was. */
  const foot=document.createElement('div');
  foot.className='nav';
  /* Always just "Save". The last question's press is called Create and does
     make the poster, but that lives on the panel's own button (see saveLabel);
     this card is not reached from the board at all. */
  const save=document.createElement('button');
  save.className='btn'; save.type='button'; save.textContent='Save';
  save.addEventListener('click',saveAnswer);
  foot.appendChild(save);

  /* Skip is GONE from the interface, by decision. Cancelling still needs no
     button — Escape, or clicking the marker a second time, shuts the card and
     leaves the question as it was. step(true)/skipQuestion and the whole
     skipped path stay in the code and in the record's shape: they are what let
     a response say "no answer given" rather than reporting a default, and that
     distinction should not be thrown away to remove a button. */
  cardBody.appendChild(foot);
}

/* Both exits do the same three things — mark the question behind us, save, and
   hand off to the next dot — and differ only in whether an answer was given.
   step() is that shared shape, so the two can never drift apart. */
/* This always submits 'partial'. 'complete' is submitted by showFinish(), which
   the tenth question's Create calls right after this (see the .qsave branch in
   the qsys click handler) — so the last press banks the answer and then ends the
   asking, in that order. */
function step(passed){
  /* openQ is the old floating card's question. The board no longer opens it, so
     the question being answered is simply the one the snake is on — and that is
     what Save in the panel means. Falling back here rather than faking openQ
     keeps the card's own state out of a flow that no longer uses it. */
  const from=openQ || ((snakeQ()||{}).id);
  if(!from) return;
  /* the stretch since the last press belongs to the question being banked now —
     it is what this one cost to answer (see the clock in js/app/63-record.js) */
  markClock(from);
  snakeAt=null;                    // banked — the panel goes back to the flow
  S.done[from]=true;
  if(passed){
    S.skipped[from]=true;
    /* Drop the standing value that openQuestion registered, so nothing claims
       an answer that was not given: the record reports null, and the bead
       count does not include it.
       The ARTWORK is the one place a default still applies — the poster has to
       draw some shape and some ground — so a skipped question falls back to a
       neutral default there rather than leaving a hole. */
    delete S.answers[from];
    delete S.reached[from];
    delete S.touched[from];
  } else {
    delete S.skipped[from];                   // in case it was skipped earlier
  }
  submit('partial');                          // captured even if they stop here
  aimGuide(from);                             // reach toward whatever just opened
  closeCard(false);                           // ...which renders it
}
const saveAnswer=()=>step(false);
/* No caller while the interface has no Skip: kept as the named entry point
   to the skipped path, which the record still models. See renderCard. */
const skipQuestion=()=>step(true);

/* ---------- status strip, bottom left ---------- */
function renderStatus(){
  const done=ASKED.filter(q=>isDone(q.id)).length;
  const answered=ASKED.filter(q=>isAnswered(q.id)).length;
  const passed=done-answered;
  const bits=[];
  bits.push('<span class="build">'+BUILD+'</span>');
  if(done===0) bits.push('<span class="cue">'
    + (!S.baseDone ? 'Say hello first' : 'Click the pulsing point to begin')
    + '</span>');
  /* counts what was ANSWERED, not what is behind us — and states the skips
     separately rather than quietly folding them into progress */
  else bits.push('<span>'+pad2(answered)+' of '+pad2(ASKED.length)+' answered'
               + (passed?' · '+pad2(passed)+' skipped':'')+'</span>');
  /* Only worth saying once there is actually a choice. During the linear lead a
     single question is open and "1 open" is noise; at the fork the board starts
     behaving differently and that IS worth stating. */
  if(!allDone() && forked()) bits.push('<span>'+availableQs().length+' open, pick either</span>');
  statusBar.innerHTML='<span class="statline">'+bits.join('<i class="sep"></i>')+'</span>';
  /* never dead once the poster is made: Reset is one of the two ways back out
     of the ending, and the ground has to be able to come back */
  resetBtn.disabled = done===0 && Object.keys(S.answers).length===0 && !posterDone;
}

