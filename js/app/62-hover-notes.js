/* ---------- HOVER NOTES (test: month) ----------
   Hovering an answered poster layer lights it and drops a personal, informal line
   in the free band to the RIGHT of the sheet. Copy is written here, per question,
   from the answer plus what the profile already knows. */
/* Short, human reads — a line about the PERSON their answer implies, not a recap of
   the answer. No hedging, no "based on your choice".
   THREE LINES IS THE BUDGET, not a style note: the card is a fixed six by three
   cells (Karin, 16 Aug) and three lines of body is exactly what fits under the
   title inside it. Anything longer is not clipped gracefully, it is CUT OFF, so
   a new read has to be checked against the card, not just written. At this
   width and size that lands at roughly 78 characters, but the wrap decides, not
   the count — measure it. */
const MONTH_READ={
  January:"You settle when it’s properly cold. Sharp air suits you better than warmth.",
  February:"Cold and quiet is your comfort. You’re not waiting for spring.",
  March:"You like it cool, with change on the way. Not warm yet, and that’s the point.",
  April:"Mild is your sweet spot. Warm enough to be out, cool enough to think straight.",
  May:"You want warmth without the weight. Soft air, long light, no bracing.",
  June:"You come alive as it warms up. Real heat, but before summer turns heavy.",
  July:"Heat wakes you up instead of wearing you down. The warmer it gets, the more you.",
  August:"You’re built for the peak. Full heat, long days, the warmth others hide from.",
  September:"You like heat on its way out: still warm, with the first cool edge you feel.",
  October:"Crisp and mild. Cool enough to think, warm enough to keep moving.",
  November:"You’re easy in the cooling grey. Bare and quiet is where you actually relax.",
  December:"You’re most yourself when it’s cool. A short grey day over a bright loud one."
};
/* one line per POSSIBLE answer — no two choices share a read */
const ALARM_READ={
  0:"None. It rings once and you’re up. The morning doesn’t get a vote.",
  1:"One. You take a single stretch, and then you go. That’s the whole of it.",
  2:"Two. Never one, never many. A small ritual you keep without thinking.",
  3:"Three. You’ve built the delay into the plan and set the alarm early to cover it.",
  4:"Four. Mornings are a negotiation you stopped pretending to win.",
  5:"Five. You don’t wake so much as get worn down until the day wins.",
  6:"Six. Half a dozen tries, and you’ve made peace with needing a running start.",
  7:"Seven. Not really waking any more; a ritual you sleep straight through on purpose.",
  8:"Eight. Less a wake-up, more a slow siege on your own sleep.",
  9:"Nine. You’ve handed your willpower to your phone, and you sleep fine about it.",
  10:"Ten. Not waking up. A system, layered, redundant, quietly overbuilt.",
  11:"Eleven. Somewhere in there is someone who really does not want to leave the bed.",
  12:"Twelve, a full clock of them. Sleep isn’t a phase you exit, it’s a place you’re pulled from."
};
const VAC_READ={
  '1':"One memory that never leaves. Everything else fades; that one built you.",
  '2':"Two that keep surfacing. Your whole sense of yourself hangs on those two.",
  '3':"Three that shaped you. Enough to know who you are, few enough to hold.",
  '4+':"More than a handful. Your past isn’t a blur, it’s moments you can still name."
};
const BORN_READ={
  '28':"Twenty-eight, February. You started in the short month, the odd one out.",
  '29':"Twenty-nine, a leap-year February. Your month fills out once in four.",
  '30':"Thirty days: April, June, September or November. Even and unhurried.",
  '31':"Thirty-one, a long month. You were born in one that takes its time."
};
/* one line per stop on the bar — how much runway you think you have left */
const DECADE_READ={
  10:"One decade. You count time short, and you’d rather spend it than save it.",
  20:"Two decades. Enough to plan, too little to waste, and you like it so.",
  30:"Three decades. A careful figure: room to move, and no let-off either.",
  40:"Four decades. A long middle stretch, steady, most of it still ahead.",
  50:"Five decades. You treat the future as somewhere you’ll actually live.",
  60:"Six decades. A generous horizon. You plan like there’s plenty.",
  70:"Seven decades. You bet high. The far end barely feels like a limit.",
  80:"Eight decades. The long game, outlasting most plans you’ll make.",
  90:"Nine decades. Near the top of the dial, among the ones who really stay.",
  100:"A full century, the marker as far as it goes. Time won’t run out."
};
/* The week/weekend bar has twenty-one stops, so the read works in BANDS rather
   than one line per stop — the two ends, the two leans, and the dead centre.
   Band edges agree with the question's own display() (below 45 reads as the
   week, above 55 as the weekend), so the card's title and its line never
   disagree about which side you are on. */
function sixweekRead(v){
  if(v<=15) return "The week is the real thing, the weekend a pause in it. You like structure.";
  if(v<=40) return "The week carries more weight. Free days are good, but the shape is work.";
  if(v<=55) return "Dead even. The plan and the pause weigh the same, and you won’t rank them.";
  if(v<=80) return "You tilt toward the weekend. The week exists to get you to the open days.";
  return "You live for the weekend. The week is the price, the free days the point.";
}
function personalNote(qid){
  const D=derive();
  if(qid==='month'){
    const m=val(ans('month'),D);
    return {t:m, b:MONTH_READ[m]||''};
  }
  if(qid==='alarms'){
    const n=rayCountFromAnswers();
    return {t:(n===0?'No snooze':n===1?'1 snooze':n+' snoozes'), b:ALARM_READ[n]||''};
  }
  if(qid==='vacations'){
    const v=String(ans('vacations'));
    return {t:(v==='4+'?'4+ memories':v+(v==='1'?' memory':' memories')), b:VAC_READ[v]||''};
  }
  if(qid==='febdays'){
    const v=String(ans('febdays'));
    return {t:v+' days', b:BORN_READ[v]||''};
  }
  if(qid==='decades'){
    const R=barRing(BANK.decades);
    return {t:R.cur+' years', b:DECADE_READ[R.cur]||''};
  }
  if(qid==='sixweek'){
    /* same guard as the lattice itself: a non-numeric answer falls to the
       bar's centre, so the card can never read a side nobody picked */
    const raw=ans('sixweek');
    const v=Number.isFinite(+raw)?+raw:50;
    return {t:BANK.sixweek.display(v), b:sixweekRead(v)};
  }
  if(qid==='saying'){
    const v=String(ans('saying'));
    return {t:v, b:SAYING_READ[v]||''};
  }
  if(qid==='grid'){
    /* the grid's OWN card: a plain statement of what its two questions (shape,
       density) told the system about you. Nothing to state until at least the
       shape is chosen — before that the ground is bare and says nothing. */
    if(!isChosen('shape')) return null;
    return {t:'Your time', b:gridNote()};
  }
  return null;
}
/* one line per word — the read behind the pair the poster prints */
const SAYING_READ={
  Trust:"Still here. You let time hold you, and it does. What matters doesn’t leave.",
  Worry:"What now. You live a step ahead of the moment, scanning for the next thing.",
  Presence:"Right now. You keep arriving in the moment you’re actually in.",
  Regret:"Long gone. Part of you stays turned toward what already happened."
};
const hoverCard=document.createElement('div');
hoverCard.id='hoverCard';
hoverCard.innerHTML='<p class="hc-t"></p><p class="hc-b"></p>';

/* The BACKGROUND GRID's reading, shown on its OWN hover card. It states plainly
   what its two questions established about you: how you experience time (shape)
   and how much of it you feel you have (density). Kept factual, not poetic.
   The density line only prints once its question has actually been chosen —
   the grid may be standing on density's default while question two is still
   ahead, and that default is nobody's answer. */
function gridNote(){
  const shape = ans('shape')==='circle'
    ? 'You feel time carries you along with it.'
    : 'You feel time moves on without you.';
  const DENS={little:'You feel you have too little of it.',
              enough:'You feel you have about enough of it.',
              plenty:'You feel you have plenty of it.'};
  const dens = isChosen('density') ? (DENS[ans('density')]||DENS.enough) : '';
  return dens ? shape+' '+dens : shape;
}
document.body.appendChild(hoverCard);
function showHoverNote(qid, hl){
  const note=personalNote(qid); if(!note) return;
  const t=hoverCard.querySelector('.hc-t'), b=hoverCard.querySelector('.hc-b');
  t.textContent=note.t; b.textContent=note.b;
  const fr=frame.getBoundingClientRect(), cell=cellSize(), o=gridOrigin();
  /* type + padding measured in cells, exactly like the question cards */
  hoverCard.style.width=(NOTE_CELLS*cell).toFixed(1)+'px';
  hoverCard.style.padding=(Q_INSET*cell).toFixed(1)+'px';
  t.style.fontSize=(Q_HFS*1.15*cell).toFixed(1)+'px';
  t.style.marginBottom=(NOTE_TGAP*cell).toFixed(1)+'px';
  b.style.fontSize=(Q_HFS*cell).toFixed(1)+'px';
  b.style.lineHeight=(Q_HLH*cell).toFixed(1)+'px';
  hoverCard.classList.add('on');
  /* SIX BY THREE, stated rather than measured. The box used to hug its text and
     round up, which put every read in the bank on four rows — so the card was
     sized by whichever line happened to be longest instead of by the grid. It
     is a fixed block now: the copy fits the card, not the other way round (see
     the three-line budget on MONTH_READ), and overflow:hidden is what enforces
     it. Still on the lattice, and now on it by construction. */
  const ch=NOTE_ROWS*cell;
  hoverCard.style.height=ch.toFixed(1)+'px';
  /* PINNED TO THE RIGHT MARGIN, not to the sheet: its right edge sits SIDE_CELLS
     in from the screen's right edge, the same inset the questions take on the
     left, so the two columns balance the poster between them (Karin, 16 Aug).
     Vertically CENTRED on the hovered element. Both edges snapped to the grid. */
  const phaseX=((o.x%cell)+cell)%cell, phaseY=((o.y%cell)+cell)%cell;
  const er=(hl&&hl.getBoundingClientRect)?hl.getBoundingClientRect():fr;
  const cw=NOTE_CELLS*cell;
  /* the last grid line at or before the right edge, then SIDE_CELLS back in and
     the card's own width — and never so far left that it lands on the sheet.
     No extra cell of air off the sheet: the union already carries one, which is
     the cell the width budget hands the note (see SIDE_CELLS).
     It used to be shifted one further cell OUT towards the edge, back when the
     note read as flush with it. That cell is given back (Karin, 16 Aug: "there
     are 3 columns gap between the poster and the hover info, it should be 2"),
     so the note's right edge lands on the SIDE_CELLS inset exactly, the same
     one the questions take on the far side.

     WHICH OF THE TWO TERMS BINDS DEPENDS ON THE WINDOW, and that is the thing
     to hold in mind before measuring this: on a wide, short window the poster's
     own edge decides (minLeft wins) and the gap is already the one cell of air
     the union carries, so this change does nothing there. On a window where the
     board is roomier the margin decides (wantLeft wins), and the gap is however
     many columns are left over — three before this, two now. The note is not at
     a fixed distance from the poster, and it never was. */
  const lastLineX=phaseX+Math.floor((window.innerWidth-phaseX)/cell)*cell;
  const wantLeft=lastLineX-(SIDE_CELLS+NOTE_CELLS)*cell;
  const minLeft =phaseX+Math.ceil((fr.right-phaseX)/cell)*cell+cell;
  const left=Math.max(wantLeft, minLeft);
  let top=phaseY+Math.round(((er.top+er.height/2)-ch/2-phaseY)/cell)*cell;
  /* keep the card's FOOT at least one cell above the sheet's bottom line — a mark
     at the very foot (the decades band) would otherwise centre the card off the
     bottom edge. Snap the ceiling down to a grid line so it stays on the lattice. */
  const maxTop=phaseY+Math.floor((fr.bottom-cell-ch-phaseY)/cell)*cell;
  top=Math.max(phaseY, Math.min(top, maxTop));
  hoverCard.style.left=left.toFixed(1)+'px';
  hoverCard.style.top=top.toFixed(1)+'px';
}
const hideHoverNote=()=>hoverCard.classList.remove('on');
world.addEventListener('mouseover',e=>{
  const hl=e.target.closest && e.target.closest('.hl');
  if(hl) showHoverNote(hl.dataset.q, hl);
});
world.addEventListener('mouseout',e=>{
  const hl=e.target.closest && e.target.closest('.hl'); if(!hl) return;
  const to=e.relatedTarget;
  if(!to || !(to.closest && to.closest('.hl'))) hideHoverNote();
});

/* clicking a dot toggles its card open and shut */
function toggleQuestion(id){
  if(!canOpen(id)) return;
  if(openQ===id) closeCard(false);
  else openQuestion(id);
}
dotsInt.addEventListener('click',e=>{
  const g=e.target.closest('.qdot');
  if(g) toggleQuestion(g.dataset.qid);
});
dotsInt.addEventListener('keydown',e=>{
  if(e.key!=='Enter' && e.key!==' ') return;
  const g=e.target.closest('.qdot');
  if(g){ e.preventDefault(); toggleQuestion(g.dataset.qid); }
});
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  if(fmtOpen()) closeFmtMenu(true);           // the menu is the innermost thing open
  else if(openQ) closeCard(false);
});
let resizeT=null;
window.addEventListener('resize',()=>{ clearTimeout(resizeT); resizeT=setTimeout(relayout,140); });

