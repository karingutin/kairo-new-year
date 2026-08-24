function openQuestion(id){
  if(!BANK[id] || !canOpen(id)) return;
  openQ=id; pinnedQ=id;
  S.reached[id]=true;              // the sheet starts responding right away
  /* register the standing value so the record is explicit rather than implied
     by a fallback; S.touched tells us whether the person actually chose */
  if(S.answers[id]===undefined) S.answers[id]=BANK[id].default;
  renderCard();
  card.classList.add('open');
  card.setAttribute('aria-hidden','false');
  placeCard();
  card.style.animation='none'; void card.offsetWidth; card.style.animation='';
  holdWorld(true);
  renderDots();
  draw();
  const first=card.querySelector('button,input');
  if(first) setTimeout(()=>first.focus(),80);
}

function closeCard(markDone){
  if(markDone && openQ) S.done[openQ]=true;
  openQ=null; pinnedQ=null; cardBox=null;
  card.classList.remove('open');
  card.setAttribute('aria-hidden','true');
  holdWorld(false);
  renderDots(); renderStatus(); draw();
}

/* ---------------------------------------------------------------------
   THE END OF THE ASKING.

   Pressing Create on the tenth question banks that answer like any other
   Next — and then this. There is no finish CARD any more: the floating
   popup the old "Create Poster" button opened is gone with the button, and
   what happens instead is that the interface takes the questions away and
   inverts its own ground, so the only lit thing left on the board is the
   poster and the three ways to keep it.

   NOTHING ABOUT THE POSTER CHANGES HERE. Not the sheet, not the format, not
   a single layer — no redraw is even asked for. The making was finished the
   moment the last answer landed; this is the interface stepping back from it.
   --------------------------------------------------------------------- */
function showFinish(){
  if(posterDone) return;
  posterDone=true;
  snakeAt=null;                       // no revisit held open behind the ending
  renderFinish.shown=false;           // re-arm the arrival stagger
  /* THE ONE REDRAW, and it is the record's text rather than the poster's marks:
     the two durations and the timestamp are only knowable at this press, so the
     band has to be re-set with them before the sheet reaches it. Not the marks —
     the making WAS finished when the last answer landed, and the artwork is not
     touched here or anywhere else in the ending. */
  stampRecord();
  drawNow();
  growSheet();
  document.body.classList.add('made');
  placeReset();                       // out of the way of the line coming down
  renderSnake(); renderStatus(); submit('complete');
}

/* THE SHEET LENGTHENING, armed for the length of the movement and no longer.
   #frame's height also changes on a window resize, where it must be instant, so
   the transition lives on a class rather than on the rule — exactly the way
   .morphing arms the format change (see the CSS on .world.growing). */
let growTimer=null;
function growSheet(){
  if(reduceMotion && reduceMotion()) return;
  world.classList.add('growing');
  clearTimeout(growTimer);
  growTimer=setTimeout(()=>{ growTimer=null; world.classList.remove('growing'); }, FLIP_MS+40);
}

/* Back out of it. The ground comes back and the tenth question is standing
   where it was left — with its Create live again, since the answer is still
   banked. Reset takes the same route out (see resetAll) and then starts over. */
function hideFinish(){
  if(!posterDone) return;
  posterDone=false;
  growSheet();                        // the sheet shortens on the same clock
  document.body.classList.remove('made');
  placeReset();                       // ...and the label comes back down with it
  /* the record's numbers go live again: the asking is open, and the next Create
     is a different poster with a different duration on it. No repaint is asked
     for here on purpose — the band is being covered again as the sheet comes
     back up, and repainting mid-transition would cut the movement. */
  unstampRecord();
  /* land on the question the Create was pressed from rather than at the end of
     a flow with nothing left open, which would draw a trail and no panel */
  const back=ASKED.findIndex(q=>isCreateQ(q));
  snakeAt = back>=0 ? back : null;
  /* and let the ground come back before they arrive into it — the same wait
     the way out took on the way in, for the same reason. This IS an arrival:
     renderFinish cleared renderSnake.last on its way past. */
  snakeLead=(reduceMotion && reduceMotion()) ? 0 : FLIP_MS;
  renderSnake(); renderStatus();
}

