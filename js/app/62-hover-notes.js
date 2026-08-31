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
   width and size that lands roughly at 57 to 75 characters, but THE COUNT IS
   ONLY A SIGHTING SHOT and it lies in both directions: 62 narrow characters
   can wrap to two lines and 61 wide ones to three. Measure the wrap in the
   card itself — set width/padding/font from NOTE_CELLS, Q_INSET, Q_HFS and
   Q_HLH, then walk a Range over the text and count distinct line tops. Sweep
   several cell sizes while you are there: the card scales with --cell, and a
   line that breaks cleanly at one size can break differently at another.
   The third line must also not be a single stranded word — aim for a last
   line of two to four short words (measured this way, 31 Aug). */
/* Rosh Hashanah edition, hover-copy pass (Karin, 30 Aug): the month names
   MONTH_READ used to key on are gone — 'month' now asks where the year's
   energy went, eight life areas (see js/10-bank.js). Keys match the bank's
   own options exactly, which are stored ALL CAPS. */
const MONTH_READ={
  CAREER:"Work took the best hours. Everything else got whatever was left.",
  FAMILY:"Home is where most of it actually happened, whether you clocked it or not.",
  HEALING:"You spent the year mending something, and you told almost no one.",
  ROMANCE:"You’d sit through the whole year again to get back to that one week.",
  FRIENDS:"Somebody kept turning up uninvited, and you left the door open.",
  TRAVEL:"You kept leaving, like the answer was always somewhere else.",
  LEISURE:"You finally let yourself stop, and the world carried on without you.",
  FAITH:"You leaned on something you still can’t name, and it held the weight."
};
/* Rosh Hashanah edition, hover-copy pass (Karin, 30 Aug): 'alarms' stopped
   being a snooze count a while back — it asks how many new people this year
   brought. One line per possible answer, 0..12. */
const ALARM_READ={
  0:"Nobody new this year. You weren’t looking, and you weren’t short.",
  1:"One person walked in, and the year rearranged around them a little.",
  2:"Two people. Small number, but you’ll remember exactly how you met them.",
  3:"Three new people, three different doors, all opened the same year.",
  4:"Four strangers at the start. By the end, you’d dropped the word.",
  5:"Five new people. You didn’t plan on any of them, and here they are.",
  6:"Six. Half a dozen people who already know how you take your coffee.",
  7:"Seven new people — the year kept handing you someone new.",
  8:"Eight. You kept saying yes to rooms full of people you didn’t know.",
  9:"Nine new people, and you never once set out to meet any of them.",
  10:"Ten new people. You let the year in, and it turned up with nine friends.",
  11:"Eleven new people, and you had to start keeping track of them all.",
  12:"Twelve. A new face every month, and you can still name them all."
};
const VAC_READ={
  '1':"One memory that never leaves. Everything else fades; that one built you.",
  '2':"Two moments still surface, and you’ve told them both too often.",
  '3':"Three that shaped you. Enough to know who you are, few enough to hold.",
  '4+':"More than a handful. This year didn’t blur; you can name the days."
};
/* Rosh Hashanah edition (Karin, 30 Aug): 'febdays' stopped being a birth-day
   count — it asks what the new year should bring, four wishes, each drawn
   as its own beam-cap shape (see js/poster/26b-radial-block.js). Keys match
   the bank's own options exactly. */
const BORN_READ={
  'Good news':"You’re waiting on news, and you’ve rehearsed the face you’ll make.",
  'Promotion':"You want it in writing. A title, a number, something you can point to.",
  'Closure':"One conversation you keep having in your head instead of out loud.",
  'Reunion':"Somebody went missing from your year, and you kept their chair."
};
/* Rosh Hashanah edition, hover-copy pass (Karin, 30 Aug): 'decades' stopped
   counting years of life left a while back — it's a wish for the year
   ahead now, Calm at one end and Overflowing at the other. One line per
   stop on the bar. */
const DECADE_READ={
  10:"You want a quiet year. No news, no crowds, nothing you have to answer.",
  20:"Quiet, mostly, with one or two things worth getting dressed for.",
  30:"You want long gaps in the year, and a few things worth the wait.",
  40:"Steady does it. A full year suits you, as long as it stays your own.",
  50:"You want a year you can fill or leave empty, depending on the week.",
  60:"You’re ready for the year to ask more of you than it did last time.",
  70:"You want more happening than not. You’d rather be tired than bored.",
  80:"You want a crowded year, and you’ve already started filling it in.",
  90:"You want the year overbooked, double-booked, and still saying yes.",
  100:"You want a year so full that no single sentence could hold half of it."
};
/* The week/weekend bar has twenty-one stops, so the read works in BANDS rather
   than one line per stop — the two ends, the two leans, and the dead centre.
   Band edges agree with the question's own display() (below 45 reads as the
   week, above 55 as the weekend), so the card's title and its line never
   disagree about which side you are on. */
/* Rosh Hashanah edition, hover-copy pass (Karin, 30 Aug): 'sixweek' stopped
   being week-vs-weekend a while back — it looks back at how the year
   actually turned out, Predictable to Surprising. */
function sixweekRead(v){
  if(v<=15) return "You called this year almost to the week, and that bored you a little.";
  if(v<=40) return "Mostly what you expected, with a few lines that moved on their own.";
  if(v<=55) return "Half of this year you saw coming. The other half, you never did.";
  if(v<=80) return "More of this year surprised you than not, and you’re still catching up.";
  return "Nothing this year went anywhere near the way you thought it would.";
}
function personalNote(qid){
  const D=derive();
  if(qid==='month'){
    const m=val(ans('month'),D);
    return {t:m, b:MONTH_READ[m]||''};
  }
  if(qid==='alarms'){
    const n=rayCountFromAnswers();
    return {t:(n===0?'No one new':n===1?'1 new person':n+' new people'), b:ALARM_READ[n]||''};
  }
  if(qid==='vacations'){
    const v=String(ans('vacations'));
    return {t:(v==='4+'?'4+ memories':v+(v==='1'?' memory':' memories')), b:VAC_READ[v]||''};
  }
  if(qid==='febdays'){
    const v=String(ans('febdays'));
    return {t:v, b:BORN_READ[v]||''};
  }
  if(qid==='decades'){
    const R=barRing(BANK.decades);
    return {t:BANK.decades.display(R.cur), b:DECADE_READ[R.cur]||''};
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
  /* grid used to have its own hover card here, reading back shape and density.
     Both are fixed defaults now (see js/10-bank.js), not answers, so there is
     nothing personal left to state — the hit-rect at data-q="grid" (30-svg.js)
     still dims the marks on hover, it just shows no card. */
  return null;
}
/* one line per word — the read behind the pair the poster prints. Each opens with
   the poster's OWN two-word phrase, so the card and the print say the same thing
   before the read starts; keep that opening if the copy is revised.
   Rosh Hashanah edition (Karin, 30 Aug): rewritten in the full hover-copy pass,
   along with MONTH_READ, ALARM_READ, VAC_READ, BORN_READ, DECADE_READ and
   sixweekRead — no bank of reads is provisional any more. */
const SAYING_READ={
  Courage:"Bold steps. You’d sooner move before you’re ready than sit still.",
  Growth:"Reach higher. The ceiling you cleared last year is just the floor now.",
  Renewal:"Start fresh. You want the room empty before you decide what goes in.",
  Clarity:"Clear path. You’d take one straight answer over ten good guesses."
};
const hoverCard=document.createElement('div');
hoverCard.id='hoverCard';
hoverCard.innerHTML='<p class="hc-t"></p><p class="hc-b"></p>';

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

