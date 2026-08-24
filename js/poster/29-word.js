/* =====================================================================
   THE WORD — the saying answer landing on the sheet, the poster's only
   typography. Two stacked words in Helvetica Regular, PAPER-filled and
   ink-stroked, so the artwork shows through only at the stroke: the words
   read as cut out of the sheet rather than printed on it.

     Regret   -> LONG GONE   (blue)
     Trust    -> STILL HERE  (blue)
     Presence -> RIGHT NOW   (red)
     Worry    -> WHAT NOW    (red)

   MEASURED OFF THE FIGMA FRAMES (2894:6596/6616/6625/6635, 1981 x 2825),
   not eyeballed: text box left 106, cap top 1745, Helvetica Regular 500,
   line pitch 420 (0.84 leading), two lines flush left at natural tracking,
   stroke ~4.9. Red is #F5242B — the sheet's own red role, so the colourway
   swaps it for free; blue is #0059FF, this layer's one frozen ink, added to
   inkedMarkup's map. Every number is stored as a fraction of the frame, so
   the block scales with any sheet.
   Each line carries textLength = its Helvetica advance sum, so the run is
   pinned to the Figma width even if the browser substitutes the face.
   ===================================================================== */
const SAYING_X   =106/1981;    // left edge, fraction of the sheet width
const SAYING_TOP =1745/2825;   // line 1 cap top, fraction of the sheet height
const SAYING_FS  =500/2825;    // font-size, fraction of the sheet height
const SAYING_LH  =420/500;     // line pitch, em
const SAYING_CAP =0.717;       // Helvetica cap height, em (cap top -> baseline)
const SAYING_SW  =2.9/1981;    // stroke width, fraction of the sheet width (measured 4.9, taken 2pt lighter by decision)
/* per-word advance width in em, summed from Helvetica's own glyph metrics */
const SAYING_EM={LONG:2.834, GONE:2.945, STILL:2.668, HERE:2.778,
                 RIGHT:3.111, NOW:2.444, WHAT:2.944};
const SAYING_TEXT={
  Regret:  {ink:'#0059FF', lines:['LONG','GONE']},
  Trust:   {ink:'#0059FF', lines:['STILL','HERE']},
  Presence:{ink:'#F5242B', lines:['RIGHT','NOW']},
  Worry:   {ink:'#F5242B', lines:['WHAT','NOW']}
};
/* HOW LONG THE WORD TAKES TO BE WRITTEN, in ms, first letter to last. The
   per-letter beat is derived from this and the letter count, so a nine-letter
   pair and a seven-letter pair are written over the same stretch of time rather
   than at the same speed — what the eye is timing is the WORD arriving, not the
   typing. 480, down from 700 (Karin, 17 Aug). */
const SAYING_WRITE_MS=480;
/* AND THE LETTERS DECELERATE. They used to come on one flat beat — index times
   a fixed step — which is a machine typing, evenly, forever. Easing the
   SEQUENCE instead makes the word arrive the way a written one does: the first
   letters go down quickly and the last of them settle in, so the end of the
   word is the end of a movement rather than the point the timer ran out.

   NOT A PURE EASE, AND THIS IS THE WHOLE CRAFT OF IT. An easeOut applied to a
   set of delays does not behave like an easeOut applied to a moving thing: a
   moving thing simply slows, but a SEQUENCE collapses — the curve is flat at
   the end, so the last letters' delays converge and two or three of them land
   inside a single frame. At the --eo cubic the tail of a nine-letter pair is
   three letters 7ms apart, which is not a word being finished, it is a word
   being dropped. Even the square gives a last gap of 7ms.

   So the curve is a BLEND: mostly easeOutQuad, with enough straight line mixed
   back in to keep the tail open. At LINEAR_MIX the gaps run about 94ms down to
   26ms across nine letters — a deceleration of three and a half to one, plainly
   read, with every letter still getting a frame and a half of its own. Raising
   LINEAR_MIX flattens it toward a metronome; lowering it collapses the tail.

   Baked in JS, exactly as the lattice's sweep is (--cd), and for the same
   reason: CSS can ease a value over time, but it cannot ease the SPACING of a
   set of delays. */
const SAYING_LINEAR_MIX=0.35;
const sayingDelay=(i,n)=>{
  if(n<2) return 0;
  const p=i/(n-1), eased=1-(1-p)*(1-p);
  return SAYING_WRITE_MS*(SAYING_LINEAR_MIX*p + (1-SAYING_LINEAR_MIX)*eased);
};
function sayingLayer(B,C){
  const cfg=SAYING_TEXT[ans('saying')]; if(!cfg) return '';
  const fs=SAYING_FS*B.h, x=SAYING_X*B.w, sw=Math.max(1,SAYING_SW*B.w);
  const base1=SAYING_TOP*B.h + SAYING_CAP*fs;
  /* ONE COUNT ACROSS BOTH LINES, so the second word carries on from where the
     first finished instead of restarting — it is one thing being written, not
     two things appearing side by side. */
  const n=cfg.lines.join('').length;
  let s='<g fill="'+C.bg+'" stroke="'+cfg.ink+'" stroke-width="'+sw.toFixed(2)+'"'
      + ' font-family="Helvetica, \'Helvetica Neue\', Arial, sans-serif"'
      + ' font-weight="400" font-size="'+fs.toFixed(1)+'">';
  let gi=0;
  cfg.lines.forEach((t,i)=>{
    /* EVERY LETTER ITS OWN TSPAN, carrying the one thing the write animation
       needs: the moment it lands (--gd, see sayingDelay). The
       textLength stays on the <text>: it pins the whole run to the Figma width
       and is distributed across the run's glyphs, tspans or not — splitting the
       letters does not move a single one of them.
       In the EXPORT these are inert. buildSVG emits no <style>, so a saved SVG
       carries the tspans with nothing to animate them and shows the finished
       word, which is the only thing a still of it should ever show. */
    s+='<text x="'+x.toFixed(1)+'" y="'+(base1+i*SAYING_LH*fs).toFixed(1)+'"'
     + ' textLength="'+(SAYING_EM[t]*fs).toFixed(1)+'" lengthAdjust="spacing">'
     + [...t].map(ch=>'<tspan class="sglyph" style="--gd:'
         + sayingDelay(gi++,n).toFixed(1)+'ms">'+ch+'</tspan>').join('')
     + '</text>';
  });
  return s+'</g>';
}

