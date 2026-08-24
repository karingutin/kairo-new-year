/* ---------- reset ----------
   ONE WIPE, TWO WAYS OUT OF IT. Reset and the KAIRO mark throw away exactly the
   same thing — every answer, the seed, the poster, the ending — and they differ
   only in where they put you afterwards: Reset leaves the board standing and
   lands you back on question one, and the mark takes you out to the opening
   screen. That is the whole difference, so the wipe itself is written once here
   and neither way out may grow a clause of its own. */
function resetState(){
  S.answers={}; S.reached={}; S.done={}; S.touched={}; S.skipped={}; S.rolls={}; lastSig='';
  entered.clear();                            // re-arm every tool's first-appearance entrance
  cancelSnakeMorph(); snakeState=snakeLive=null;   // drop any in-flight snake glide
  cancelNodeMorph(); nodeState=nodeLive=null;      // and any in-flight node glide
  cancelRingsMorph(); ringsState=ringsLive=null;   // and any in-flight ring glide
  stopMonthGrow(); snakeAt=null;            // no frame ticking, no revisit held open
  Object.assign(S,PROFILE_DEFAULTS);          // includes baseDone:false — starts over for real
  openQ=null; pinnedQ=null; introOpen=false; cardBox=null;
  /* out of the ending first, so the ground is back to normal before anything is
     redrawn on it — Reset is the second of the two ways out (see hideFinish) */
  posterDone=false; document.body.classList.remove('made');
  unstampRecord();                            // the record's numbers go live again
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

