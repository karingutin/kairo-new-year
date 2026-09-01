/* ---------- reset ----------
   ONE WIPE, SEVERAL DOORS TO IT. Reset and the KAIRO mark throw away exactly
   the same thing — every answer, the seed, the poster, the ending — and they
   differ only in where they put you afterwards: Reset leaves the board
   standing and lands you back on question one, and everything else takes you
   out to the opening screen. That is the whole difference, so the wipe itself
   is written once here and no door out may grow a clause of its own.

   PAST THE ENDING, Reset's own door closes (see placeReset, 60-format.js) and
   three more open onto the SAME opening-screen destination as the mark:
   #closeToStart, an explicit press (Karin, 31 Aug); the mark itself, still
   standing where it always does; and forty seconds of nobody touching
   anything at all (Karin, 31 Aug, same request) — see armIdleReturn below. */
function resetState(){
  S.answers={}; S.reached={}; S.done={}; S.touched={}; S.skipped={}; S.rolls={}; lastSig='';
  entered.clear();                            // re-arm every tool's first-appearance entrance
  cancelSnakeMorph(); snakeState=snakeLive=null;   // drop any in-flight snake glide
  cancelNodeMorph(); nodeState=nodeLive=null;      // and any in-flight node glide
  cancelRingsMorph(); ringsState=ringsLive=null;   // and any in-flight ring glide
  cancelRadialMorph(); radialState=radialLive=null;   // and any in-flight radial-block glide
  stopMonthGrow(); snakeAt=null;            // no frame ticking, no revisit held open
  Object.assign(S,PROFILE_DEFAULTS);          // includes baseDone:false — starts over for real
  openQ=null; pinnedQ=null; introOpen=false; cardBox=null;
  /* out of the ending first, so the ground is back to normal before anything is
     redrawn on it — Reset is the second of the two ways out (see hideFinish) */
  posterDone=false; document.body.classList.remove('made');
  unstampRecord();                            // the record's numbers go live again
  clearShare();                    // an abandoned poster's address must not outlive it
  disarmIdleReturn();     // whichever door this was, the 40s clock behind it is done ticking
  clearTimeout(aimGuide.t); guideFrom=null; guideTo=[];   // no line left pointing
  lastMarkup=['',''];                                     // force a repaint
  card.classList.remove('open');
  card.setAttribute('aria-hidden','true');
  newSeed();
  buildLogo();                // the coloured cell back to the interface red
}

/* THE BUTTON: start the asking over WITHOUT leaving the board. The opening
   screen is not shown again — S.baseDone is put back up after the wipe took it
   down — so what you get is the board you are already standing on with an empty
   sheet on it, pointing at question one. Nothing is answered now, so the flow
   has nowhere else to point. */
function resetAll(){
  resetState();
  S.baseDone=true;
  /* Reset does not go back through the opening screen, so it is the one place
     other than Begin where a session starts — and a session starting is what
     starts the clock. */
  startClock();
  relayout();
}
resetBtn.addEventListener('click',resetAll);

/* THE MARK: the same wipe, and out to the opening screen — S.baseDone is left
   where PROFILE_DEFAULTS put it, which is down, so the board stands empty
   behind the screen and START opens it on question one exactly as a first
   visit does. Pressing KAIRO is starting over, not stepping back: it is the
   name of the piece, and the piece begins at its title. */
function backToStart(){
  resetState();
  relayout();
  showIntro();
}
logoEl.addEventListener('click',backToStart);
/* THE CLOSE BUTTON: the same door, standing a second time where the finished
   poster's own corner makes it obvious (see placeChrome, js/ui/40-dots.js —
   it only exists once posterDone, so there is nothing to guard here). */
closeBtn.addEventListener('click',backToStart);

/* FORTY SECONDS OF NOBODY TOUCHING ANYTHING, on the finished poster, is the
   same door again (Karin, 31 Aug). One timer, armed only by showFinish() and
   disarmed by every way out of the ending — hideFinish() (back to the last
   question), and resetState() above (Reset, the mark, this button, or the
   timer's own firing) — so it can never fire onto a screen that has already
   moved on, and never keeps ticking behind one. The listener that FEEDS it is
   bound once, here, for the page's whole life, rather than per-visit — it
   costs nothing while there is nothing to reset, since armIdleReturn() itself
   is the only thing that ever sets a timeout, and it does nothing outside
   the ending. pointerdown over click: click waits for a full press-and-release
   before it fires, which is later than "someone is here" needs to be. */
let idleTimer=null;
function armIdleReturn(){ clearTimeout(idleTimer); idleTimer=setTimeout(backToStart,40000); }
function disarmIdleReturn(){ clearTimeout(idleTimer); idleTimer=null; }
document.addEventListener('pointerdown',()=>{ if(posterDone) armIdleReturn(); });
document.addEventListener('keydown',()=>{ if(posterDone) armIdleReturn(); });

