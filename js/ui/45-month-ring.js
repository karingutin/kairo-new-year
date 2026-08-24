/* =====================================================================
   THE MONTH RING — twelve circles, four across and three down, touching.

   The name sits inside its circle until it is chosen; then it LEAVES the middle
   and runs around the circle's edge, repeated as many times as the circumference
   will take, turning for as long as the answer stands. Nothing else marks it —
   no stroke, no dot in the middle. The turning name IS the state.

   The repeat count is computed from the circumference rather than fixed, so the
   names never collide and never leave a gap: a three-letter month at this size
   takes a known arc, and however many fit is however many are set.

   Circles TOUCH. There is no gap between them and no cell around them — they
   are one field with a hole opened in it, which is the whole reason the chosen
   one reads as chosen.
   ===================================================================== */
function monthRingMarkup(q,c,PH,W){
  /* Four across, three down, tangent — so the white between them is the diamond
     four touching circles leave, not a gap. Inset by Q_INSET, the panel's one
     hug, so the grid's outer edge lines up exactly with the title's. */
  const cols=RING_COLS, rows=3, gap=CIRCLE_GAP;
  /* THE CIRCLES NO LONGER TOUCH. They were tangent, and the white between them
     was the diamond four touching circles leave; a few pixels of gap trades that
     figure for four separate marks, which is what a set of twelve alternatives
     should read as. The gap comes out of the DIAMETER, not out of the hug: the
     grid still spans exactly the hugged width, so its edge still meets the
     title's. */
  const d=ringCircleD(W);
  const gridW=cols*d+(cols-1)*gap;
  const Q_SHIFT=(W-gridW)/2;                   // = Q_INSET, so the grid's edge meets the title's
  /* a flow child: the viewBox crops to the grid itself, and the gap to the
     words is a real flow margin — the bottom hug is the .qflow padding now */
  const gridH=rows*d+(rows-1)*gap;
  const top=PH-Q_INSET-gridH;
  const R=d/2, cur=picked(q.id);
  const fs=Q_HFS*c;                            // the name, inside its circle — the hint's size (14px)
  const ringFs=d*0.185*c;                      // the name, running round
  /* The gap this leaves with is the question's Figma one; renderSnake then
     SETTLES the grid down into the middle of the room the words really left —
     see settleControl, and why it cannot be done from here. */
  let g='<svg viewBox="0 '+(top*c).toFixed(1)+' '+(W*c).toFixed(1)+' '+(gridH*c).toFixed(1)+'"'
      + ' class="mring" style="margin-top:'+(ctrlGap(q.id)*c).toFixed(1)+'px">';
  q.options.forEach((m,k)=>{
    const col=k%cols, row=Math.floor(k/cols);
    const cx=(Q_SHIFT+col*(d+gap)+d*0.5)*c, cy=(top+row*(d+gap)+d*0.5)*c, r=R*c;
    const on=cur===m;
    /* Three letters, in the grid AND on the ring. The full name was tried and
       dropped: it forced a single pass, which read as a label bent round a curve
       rather than as something running. */
    const lab=String(m).slice(0,3).toUpperCase();
    if(!on){
      g+='<g class="mo" data-val="'+esc(String(m))+'">'
       + '<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+r.toFixed(1)+'"/>'
       + '<text x="'+cx.toFixed(1)+'" y="'+cy.toFixed(1)+'" text-anchor="middle"'
       + ' dominant-baseline="central" font-size="'+fs.toFixed(1)+'">'+lab+'</text></g>';
      return;
    }
    /* The chosen one, per the sketch: THE CIRCLE IS GONE. Not hollowed, not
       stroked — absent. What marks the answer is the name alone, turning where
       the circle was, and the hole it leaves in the field is the whole signal.
       The ring sits well inside the circle's own footprint — 0.55, not 0.70 —
       so there is clear white between the type and the circles it touches. The
       gap belongs to the name, not to its neighbours. */
    const rr=r*0.55;                           // the path the name runs on
    const id='mring'+k;
    const circ=2*Math.PI*rr;
    /* THE RING IS FILLED, EXACTLY.
       The name repeats as many times as the circumference naturally takes, and
       then the whole run is stretched to the circumference with textLength — so
       the last separator meets the first letter and there is neither a gap nor a
       glyph pushed off the end of the path. A glyph that falls off a textPath is
       not clipped, it is simply not drawn, which is how letters were going
       missing: the run was centred on twelve o'clock and whatever hung past the
       path's ends vanished.

       At least three passes: two read as a label repeated, not as something
       running round. */
    /* Three passes, and the TYPE SIZE is what bends to fit them — not the
       spacing. lengthAdjust only stretches the gaps between glyphs, so asking a
       run 137 units long to sit on a 90-unit ring squeezed the letters into each
       other. So the size is derived: whatever makes three passes of this name
       fill this circumference naturally, floored so it never becomes a smear.
       textLength then only has to take up the rounding. */
    const reps=3;
    const run=Array.from({length:reps},()=>lab).join(' \u00b7 ')+' \u00b7';
    const ringFit=Math.max(6.5, circ/(run.length*0.58));
    g+='<g class="mo on" data-val="'+esc(String(m))+'">'
     /* the turn: its own group so only the type rotates, about the circle's
        centre, stated in px because an SVG group has no box of its own */
     + '<g class="mo-spin" style="transform-origin:'+cx.toFixed(1)+'px '+cy.toFixed(1)+'px">'
     + '<path id="'+id+'" fill="none" d="M'+(cx-rr).toFixed(1)+','+cy.toFixed(1)
     +   ' a'+rr.toFixed(1)+','+rr.toFixed(1)+' 0 1,1 '+(rr*2).toFixed(1)+',0'
     +   ' a'+rr.toFixed(1)+','+rr.toFixed(1)+' 0 1,1 -'+(rr*2).toFixed(1)+',0"/>'
     /* From the path's start and all the way round: startOffset 0, no anchoring,
        and textLength set to the circumference so the run closes on itself. The
        slack goes into the spacing between glyphs, never into dropping them. */
     + '<text font-size="'+ringFit.toFixed(1)+'">'
     +   '<textPath href="#'+id+'" startOffset="0"'
     +     ' textLength="'+circ.toFixed(1)+'" lengthAdjust="spacing">'+run+'</textPath></text>'
     + '</g></g>';
  });
  return g+'</svg>';
}

/* VACATIONS — a row of touching black circles, one per option (1..3 and a '4+'),
   white labels, the chosen one inverts. FIXED size and BOTTOM-hugged by the same
   Q_INSET as the sides, so the margin is equal on left, right and bottom. */
function circlesMarkup(q,c,PH,W){
  const opts=q.options;
  const cols=opts.length;
  const gap=CIRCLE_GAP;                           // breathing room between circles, in cells
  let d=(W-2*Q_INSET-(cols-1)*gap)/cols;          // diameter once the gaps are taken out
  /* cap the diameter so a few-option row doesn't crowd the subtitle; keep the tight
     gap and CENTRE the row (left0 == Q_INSET when the row fills the width uncapped) */
  if(d>circleCap(q)) d=circleCap(q);
  const left0=(W-(cols*d+(cols-1)*gap))/2;
  /* a flow child: the viewBox crops to the row itself, and the gap to the
     words is a real flow margin — no more estimated text height, no slack */
  const top=textBottomCells(q)+ctrlGap(q.id);
  const r=(d/2)*c, fs=DIAL.labelCells*c;          // labels 14px
  let s='<svg viewBox="0 '+(top*c).toFixed(1)+' '+(W*c).toFixed(1)+' '+(d*c).toFixed(1)+'"'
      + ' class="vcirc" style="margin-top:'+(ctrlGap(q.id)*c).toFixed(1)+'px">';
  opts.forEach((v,i)=>{
    const cx=(left0+i*(d+gap)+d*0.5)*c, cy=(top+d*0.5)*c;
    const on=String(picked(q.id))===String(v);
    s+='<g class="vc'+(on?' on':'')+'" data-val="'+esc(String(v))+'">'
     + '<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+r.toFixed(1)+'"/>'
     + '<text x="'+cx.toFixed(1)+'" y="'+cy.toFixed(1)+'" text-anchor="middle"'
     + ' dominant-baseline="central" font-size="'+fs.toFixed(1)+'">'+esc(String(v))+'</text></g>';
  });
  return s+'</svg>';
}
/* SHAPE — the question that used to open the landing sequence, its control
   carried over intact: two ring glyphs drawn to the Figma node (2879:6431)
   and its 45px cell, the mark sitting apart from the ring or riding on it.
   Both marks are drawn in the ring's own box and in the frame's own units, so
   the numbers below are the Figma node's (2875:6324 / 2875:6325) verbatim —
   the viewBox does the scaling. The apart mark sits outside the box to the
   right and spills; the riding mark sits ON the ring, up and to the right of
   centre. HTML rather than panel SVG so the .qduo cell-based CSS keeps ruling
   its geometry; the buttons register through the same #qsys delegation as
   every other control. */
const DUO_RING='cx="50.4669" cy="50.4669" r="49.7169" stroke-width="1.5"';
const DUO_DOT={apart:'cx="118.877" cy="50.4669"', onring:'cx="78.504" cy="10.0934"'};
const DUO_POS=['apart','onring'];            // one glyph per side, in the bank's order
const DUO_BREAK={                             // the landing screens' own line breaks
  'It moves on without me':'It moves on<br>without me',
  'It carries me along with it':'It carries me<br>along with it'
};
function shapeDuoMarkup(q,c,PH,W){
  /* THE SAME CIRCLE AS THE FEBDAYS ROW (Q4): width-fit four across under
     febdays' own cap, so Q1's rings and Q4's circles are one size of the same
     mark, by decision. The svg frame is a shade wider than the ring it holds
     (the Figma node's 100.934 against the ring's 99.434), so the frame is
     scaled up by that ratio and the RING itself comes out at exactly d. */
  const d=Math.min((W-2*Q_INSET-(RING_COLS-1)*CIRCLE_GAP)/RING_COLS, circleCap(BANK.febdays));
  const bx=(d*(100.934/99.4338)*c).toFixed(1);
  /* a FLOW child now — it sits in the .qflow column right after the words, so
     the only geometry it states is its own gap to them (the Figma ctrlGap) */
  let s='<div class="qduo" style="margin-top:'+(ctrlGap(q.id)*c).toFixed(1)+'px">';
  q.options.forEach(([k,label],i)=>{
    const pos=DUO_POS[i]||'apart';
    const on=String(picked(q.id))===String(k);
    s+='<button type="button" class="'+pos+'" data-val="'+esc(String(k))+'"'
     + ' aria-pressed="'+on+'" style="width:'+bx+'px">'
     + '<svg viewBox="0 0 100.934 100.934" aria-hidden="true" style="width:'+bx+'px;height:'+bx+'px">'
     + '<circle class="ring" '+DUO_RING+'/>'
     + '<circle class="dot" '+DUO_DOT[pos]+' r="10.0934"/></svg>'
     + '<b>'+(DUO_BREAK[label]||esc(label))+'</b></button>';
  });
  return s+'</div>';
}
/* DENSITY — the landing sequence's second question, carried over with it:
   three circles filling up to their level — a sliver, about half, brimming.
   The rise plays on ARRIVAL — every time the question comes up, first visit or
   a return (renderSnake decides and stashes the flag here, the way snakeParts
   carries its height). On any other render — a pick, a drag's repaint — the
   level is baked into the markup as an inline height, so there is no
   0-to-level change for the CSS transition to animate, whatever forced layout
   passes run in between. */
const DENSITY_FILL={little:14, enough:52, plenty:100};   // fill level per side, in %
/* Circle to circle, in cells — the landing drawing's 26/45. This is the number
   Karin asked to HOLD while the circles grew, so it is the fixed side of the
   arithmetic below and the diameter is what gives. It is stated here and
   nowhere else; .qfill carries no gap of its own. */
const DENSITY_GAP=0.578;
function densityFillMarkup(q,c,PH,W){
  const rise=!!densityFillMarkup.rise;
  /* SOLVED FOR THE HUG, not taken from ringCircleD (Karin, 16 Aug: "make the
     circles bigger but keep the spacing, reduce the horizontal padding").
     ringCircleD sizes four circles across, so borrowing it for a THREE-option
     row left ~0.97 of a cell of air at each end — more than twice Q_INSET — and
     the row floated inside a panel whose every other child starts at the hug.
     So: the row spans exactly the hugged width, the gap stays DENSITY_GAP, and
     the diameter takes the rest. The circles now line up with the question's
     own left and right edges, which is Q_INSET doing what it says it does.
     The month grid keeps ringCircleD; this row is a different count, and one
     count per width is what makes both of them land on the same hug. */
  const n=q.options.length;
  const d=(((W-2*Q_INSET)-(n-1)*DENSITY_GAP)/n*c).toFixed(1);
  /* a FLOW child, same as the shape control — gap only, no absolute box */
  let s='<div class="qfill" style="margin-top:'+(ctrlGap(q.id)*c).toFixed(1)+'px;'
      + 'gap:'+(DENSITY_GAP*c).toFixed(1)+'px">';
  q.options.forEach(([k,label])=>{
    const on=String(picked(q.id))===String(k);
    const fill=DENSITY_FILL[k]||0;
    s+='<button type="button" data-val="'+esc(String(k))+'" aria-pressed="'+on+'">'
     + '<span class="circ" style="width:'+d+'px;height:'+d+'px">'
     + '<i data-fill="'+fill+'"'+(rise?'':' style="height:'+fill+'%"')+'></i></span>'
     + '<b>'+esc(label)+'</b></button>';
  });
  return s+'</div>';
}

/* FEBRUARY — four bordered cards (Figma node 2780:4797): 66x106, 12px gap, the
   number (22px) over a small FEB (11px). Left-aligned by the hug. A card question
   (no default): the chosen card inverts, Save stays shut until one is picked. */
function cardsMarkup(q,c,PH,W){
  /* Figma node 2780:4797 (May): three SOLID black cards, 89.189 x 105, pitch
     105.41, the number 22px white and centred, no sub-label. */
  /* portrait cards — 89.189 x 105, the number centred. Hung under the text at
     the question's Figma gap; the 10-cell card's slack sits at the foot. */
  const cardW=89.189/36.68, cardH=105/36.68, pitch=105.41/36.68;
  const top=textBottomCells(q)+ctrlGap(q.id);
  const numFs=0.603*c;
  let s='<svg viewBox="0 0 '+(W*c).toFixed(1)+' '+(PH*c).toFixed(1)+'" class="fcard">';
  q.options.forEach((v,i)=>{
    const x=(Q_INSET+i*pitch)*c, y=top*c, w=cardW*c, h=cardH*c;
    const on=String(picked(q.id))===String(v);
    s+='<g class="fc'+(on?' on':'')+'" data-val="'+esc(String(v))+'">'
     + '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'"/>'
     + '<text class="fc-num" x="'+(x+w/2).toFixed(1)+'" y="'+(y+h*0.5).toFixed(1)+'" text-anchor="middle"'
     + ' dominant-baseline="central" font-size="'+numFs.toFixed(1)+'">'+esc(String(v))+'</text></g>';
  });
  return s+'</svg>';
}

/* COLORWAY — the last question. Six SPLIT circles (three across, two down), each
   half one colour and half the other from COLORWAYS. Touching and bottom-hugged
   like the other circle grids; once one is picked the rest dim so the choice reads. */
function colorwayMarkup(q,c,PH,W){
  const cols=3, rows=2;
  const gap=CIRCLE_GAP;                             // a small gap between swatches
  let d=(W-2*Q_INSET-(cols-1)*gap)/cols;            // width-fit diameter
  if(d>COLORWAY_D_MAX) d=COLORWAY_D_MAX;            // cap so both rows fit the shorter panel
  const gridW=cols*d+(cols-1)*gap, gridH=rows*d+(rows-1)*gap;
  const left0=(W-gridW)/2;                          // centred horizontally
  const top=textBottomCells(q)+ctrlGap(q.id);       // crop origin — a flow child now
  const r=(d/2)*c, pk=picked(q.id);
  let s='<svg viewBox="0 '+(top*c).toFixed(1)+' '+(W*c).toFixed(1)+' '+(gridH*c).toFixed(1)+'"'
      + ' class="cway" style="margin-top:'+(ctrlGap(q.id)*c).toFixed(1)+'px">';
  q.options.forEach((opt,i)=>{
    const col=i%cols, row=Math.floor(i/cols);
    const cx=(left0+col*(d+gap)+d*0.5)*c, cy=(top+row*(d+gap)+d*0.5)*c;
    const isRandom=(opt==='random');
    const on=String(pk)===String(opt);
    const R=r.toFixed(1);
    let inner;
    if(isRandom){
      /* 'random' is NOT a fixed pair — the swatch shows the whole colour bank as a
         six-wedge pie, so it reads as "any of these, rolled". The poster takes an
         actual rolled pair (see the handler); this icon stays the bank. */
      let w=''; const nB=BANK_COLORS.length;
      for(let s2=0;s2<nB;s2++){
        const a0=(-90+s2*360/nB)*Math.PI/180, a1=(-90+(s2+1)*360/nB)*Math.PI/180;
        const x0=(cx+r*Math.cos(a0)).toFixed(1), y0=(cy+r*Math.sin(a0)).toFixed(1);
        const x1=(cx+r*Math.cos(a1)).toFixed(1), y1=(cy+r*Math.sin(a1)).toFixed(1);
        w+='<path d="M'+cx.toFixed(1)+' '+cy.toFixed(1)+' L'+x0+' '+y0+' A'+R+' '+R+' 0 0 1 '+x1+' '+y1+' Z" fill="'+BANK_COLORS[s2]+'"/>';
      }
      inner=w;
    } else {
      const raw=COLORWAYS[opt]||['#000000','#000000'];
      /* the chosen swatch mirrors the swap so the preview matches the poster */
      const pair=(on && S.colorSwap) ? [raw[1],raw[0]] : raw;
      /* split on the \ diagonal: colour A fills the lower-left half, colour B the
         upper-right half — from the top-left point of the circle to the bottom-right. */
      const k=r*0.70710678;
      const p1x=(cx-k).toFixed(1), p1y=(cy-k).toFixed(1);   // top-left
      const p2x=(cx+k).toFixed(1), p2y=(cy+k).toFixed(1);   // bottom-right
      inner='<path d="M'+p1x+' '+p1y+' A'+R+' '+R+' 0 0 0 '+p2x+' '+p2y+' Z" fill="'+pair[0]+'"/>'
          + '<path d="M'+p1x+' '+p1y+' A'+R+' '+R+' 0 0 1 '+p2x+' '+p2y+' Z" fill="'+pair[1]+'"/>';
    }
    /* the chosen swatch carries a small glyph: '⇄' on a fixed pair (click to flip
       the two inks), '↻' on 'random' (click to roll a fresh pair) — see the handler. */
    let badge='';
    if(on){
      const gr=(r*0.30).toFixed(1);
      badge='<g class="cw-badge" data-cx="'+cx.toFixed(1)+'" data-cy="'+cy.toFixed(1)+'">'
          +'<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+gr+'" fill="#FFFFFF" pointer-events="none"/>'
          +'<text class="cw-swap" x="'+cx.toFixed(1)+'" y="'+cy.toFixed(1)+'" text-anchor="middle"'
          +' dominant-baseline="central" font-size="'+(r*(isRandom?0.34:0.40)).toFixed(1)+'" fill="#111"'
          +' pointer-events="none">'+(isRandom?'↻':'⇄')+'</text></g>';
    }
    /* the wedges/halves live in their own group so a pick can spin them about the
       swatch centre — see spinSwatch. The badge stays put, over the spin. */
    s+='<g class="cw'+(on?' on':'')+'" data-val="'+esc(opt)+'"'+(pk&&!on?' opacity="0.4"':'')+'>'
      +'<g class="cw-spin" data-cx="'+cx.toFixed(1)+'" data-cy="'+cy.toFixed(1)+'">'
      +inner
      +'</g>'+badge+'</g>';
  });
  return s+'</svg>';
}

/* Swap the chosen swatch's two colours by SPINNING it 180° about its centre: a
   diagonal split turned half a turn lands each colour in the other's half, so the
   rotation IS the swap. `done` fires at rest, where the panel repaints in the new
   swapped state (which matches the rotated frame exactly, so there is no jump). */
let swatchRAF=0;
function spinSwatch(cw, done){
  cancelAnimationFrame(swatchRAF);
  const g=cw && cw.querySelector('.cw-spin');
  if(!g){ if(done) done(); return; }
  const cx=+g.dataset.cx, cy=+g.dataset.cy;
  const badge=cw.querySelector('.cw-badge');       // the ⇄ whirls a FULL turn with it
  if(reduceMotion && reduceMotion()){ if(done) done(); return; }
  const dur=460, t0=performance.now(), ease=t=>1-Math.pow(1-t,4);   // easeOutQuart — clear ease-out
  swatchRAF=requestAnimationFrame(function frame(now){
    let t=(now-t0)/dur; if(t>1) t=1; const e=ease(t);
    g.setAttribute('transform','rotate('+(180*e).toFixed(2)+' '+cx+' '+cy+')');
    if(badge) badge.setAttribute('transform','rotate('+(360*e).toFixed(2)+' '+cx+' '+cy+')');
    if(t<1) swatchRAF=requestAnimationFrame(frame);
    else if(done) done();
  });
}

/* THE COMPASS — the word question's control (see `saying`).

   Four circles on the points of a compass around an EMPTY centre, and the empty
   centre is the whole idea: the words are not a list of four equal alternatives,
   they are four directions out of where the person is standing, and the thing
   they are standing on is not drawn. The arrangement carries the meaning that a
   grid of four buttons threw away — Regret behind, Trust ahead, Worry above,
   Presence below.

   WIDE, not square. The block spans the full hug, so the horizontal axis comes
   out longer than the vertical, and that is the right way round: left-to-right
   is the axis the whole piece already reads as time. Regret and Trust sit at its
   two ends and are the furthest apart of the four.

   It emits circlesMarkup's own class names on purpose. `.vcirc .vc[data-val]` is
   already wired for hit-testing, for the chosen state and for the CSS, so this
   function only has to place circles — every other question's circle row uses
   the same three lines of styling and the same click delegation. */
const COMPASS={
  ringR:0.62,               // the running word's path, as a fraction of the circle
  ringFsMax:0.30,           // the ceiling on that word's type size, in cells
  minReps:2, maxReps:5      // passes of the word around its ring
};
function compassMarkup(q,c,PH,W){
  const opts=q.options;
  const gap=CIRCLE_GAP;
  /* THE SAME CIRCLE AS THE MONTH GRID, taken from the same function rather than
     sized to this control's own block — the two questions are meant to read as
     one family of mark, and a compass whose circles are a different diameter
     from the month's reads as a different piece of furniture. */
  const d=ringCircleD(W), r=d/2;
  /* A SQUARE: four points ninety degrees apart at the same distance out. They no
     longer touch — adjacent centres are one diameter plus the gap apart, and
     since adjacent centres lie R*sqrt(2) from each other, R = (d+gap)/sqrt(2). */
  const R=(d+gap)/Math.SQRT2;
  const block=2*R+d;
  /* under the text like every other control now — the 10-cell card's spare air
     sits below the compass, per the updated Figma, not between it and the words */
  const cx=W/2, cy=textBottomCells(q)+ctrlGap(q.id)+block/2;
  /* WHERE EACH WORD GOES, read straight off the bank's own order: 0 ahead, 1
     above, 2 below, 3 behind. Only the four-word case is a compass; any other
     count falls back to even angles so a fifth word can never land silently on
     top of another. */
  const AT = opts.length===4
    ? [[1,0],[0,-1],[0,1],[-1,0]]
    : opts.map((_,i)=>{ const a=-Math.PI/2+i*2*Math.PI/opts.length;
                        return [Math.cos(a),Math.sin(a)]; });
  /* the word inside an unpicked circle is set at the hint's size, as the month's
     three letters are, and only fitted down if a longer word would spill */
  const maxLen=Math.max(1,...opts.map(o=>String(o).length));
  const fs=Math.min(Q_HFS,(d*0.82)/(maxLen*0.52));
  const rp=r*c, rr=rp*COMPASS.ringR, circ=2*Math.PI*rr;
  /* ONE TYPE SIZE FOR ALL FOUR RUNNING WORDS.
     The month can let each ring set its own size because every label there is
     three letters, so they all come out near enough the same anyway. Here the
     words run from five letters to eight, and sizing each ring to fill its
     circumference gave TRUST at 15px beside REGRET at 20px — four different
     sizes of the same voice, on one card.
     So the size is decided ONCE, by the LONGEST word, at the size that still
     lets it round the ring twice. Every shorter word is then set at that same
     size and simply fits more passes in, or the same number with more air
     between them. The difference between the words shows up as SPACING, which
     is what should absorb it, and never as type size. */
  const fit=Math.max(6.5, Math.min(COMPASS.ringFsMax*c,
                     circ/(COMPASS.minReps*(maxLen+3)*0.58)));
  /* a flow child: the viewBox crops to the compass block itself */
  const vbY=(cy-block/2)*c;
  let s='<svg viewBox="0 '+vbY.toFixed(1)+' '+(W*c).toFixed(1)+' '+(block*c).toFixed(1)+'"'
      + ' class="vcirc compass" style="margin-top:'+(ctrlGap(q.id)*c).toFixed(1)+'px">';
  opts.forEach((v,i)=>{
    const p=AT[i], ccx=(cx+p[0]*R)*c, ccy=(cy+p[1]*R)*c;
    const on=String(picked(q.id))===String(v);
    if(!on){
      s+='<g class="vc" data-val="'+esc(String(v))+'">'
       + '<circle cx="'+ccx.toFixed(1)+'" cy="'+ccy.toFixed(1)+'" r="'+rp.toFixed(1)+'"/>'
       + '<text x="'+ccx.toFixed(1)+'" y="'+ccy.toFixed(1)+'" text-anchor="middle"'
       + ' dominant-baseline="central" font-size="'+(fs*c).toFixed(1)+'">'+esc(String(v))+'</text></g>';
      return;
    }
    /* THE PICKED ONE, built the way the month's is (see monthRingMarkup): the
       disc is GONE, not hollowed and not stroked, and what marks the answer is
       the word alone turning in the hole it left. The ring it runs on sits well
       inside the circle's own footprint, so the type never reaches the edge.

       How many passes is what varies now, not the size: as many whole runs of
       this word as fit at `fit`, floored so the stretch below can only ever OPEN
       the gaps and never squeeze the letters into each other. textLength then
       takes the remainder into the spacing, which is why the ring still closes
       exactly on itself with no glyph pushed off the end of the path. */
    const lab=String(v).toUpperCase();
    const unit=(lab.length+3)*0.58*fit;        // one pass, plus its ' · ', at that size
    const reps=Math.max(COMPASS.minReps, Math.min(COMPASS.maxReps, Math.floor(circ/unit)));
    const run=Array.from({length:reps},()=>lab).join(' · ')+' ·';
    const id='cring'+i;
    s+='<g class="vc on" data-val="'+esc(String(v))+'">'
     + '<g class="mo-spin" style="transform-origin:'+ccx.toFixed(1)+'px '+ccy.toFixed(1)+'px">'
     + '<path id="'+id+'" fill="none" d="M'+(ccx-rr).toFixed(1)+','+ccy.toFixed(1)
     +   ' a'+rr.toFixed(1)+','+rr.toFixed(1)+' 0 1,1 '+(rr*2).toFixed(1)+',0'
     +   ' a'+rr.toFixed(1)+','+rr.toFixed(1)+' 0 1,1 -'+(rr*2).toFixed(1)+',0"/>'
     + '<text font-size="'+fit.toFixed(1)+'">'
     +   '<textPath href="#'+id+'" startOffset="0"'
     +     ' textLength="'+circ.toFixed(1)+'" lengthAdjust="spacing">'+esc(run)+'</textPath></text>'
     + '</g></g>';
  });
  return s+'</svg>';
}
function panelControl(q,c,PH,W){
  if(q.id==='shape')     return shapeDuoMarkup(q,c,PH,W);
  if(q.id==='density')   return densityFillMarkup(q,c,PH,W);
  if(q.id==='saying')    return circlesMarkup(q,c,PH,W);   /* a row of four circles, like febdays — was compassMarkup */
  if(q.id==='vacations') return circlesMarkup(q,c,PH,W);
  if(q.id==='febdays')   return circlesMarkup(q,c,PH,W);
  if(q.id==='colorway')  return colorwayMarkup(q,c,PH,W);
  if(q.type==='number') return dialMarkup(q,c,PH,W);
  if(q.type==='bar')    return barMarkup(q,c,PH,W);
  if(q.type==='choice') return monthRingMarkup(q,c,PH,W);
  const opts = q.type==='choice'
    ? q.options.map(v=>[v, q.display(v)])
    : q.options.map(o=>[o[0], o[1]]);
  const rows = q.type==='choice' ? 2 : 1;
  /* the block sits inset by the same 0.44 cell the question is, and fills the
     panel's lower band — 6 cells wide by the rows it needs */
  /* Anchored to the panel's FOOT, not to a fraction of its height: the answer
     belongs directly under the question however long the question ran, and a
     proportional position would have floated it away from short ones. */
  const inset=Q_INSET*c;
  const hgt=(rows===2 ? 1.9 : 1.1)*c;
  const fs=(q.type==='choice' ? 0.26 : 0.30)*c;
  return '<div class="qopts '+q.type+'" style="margin:'+(Q_GAP*c).toFixed(1)+'px '+inset.toFixed(1)+'px 0;'
       + 'height:'+hgt.toFixed(1)+'px;font-size:'+fs.toFixed(1)+'px">'
       + opts.map(([v,label])=>
           '<button type="button" data-val="'+esc(String(v))+'"'
         + ' aria-pressed="'+String(picked(q.id)===v)+'">'
         + esc(q.type==='choice' ? String(label).slice(0,3).toUpperCase() : label)
         + '</button>').join('')
       + '</div>';
}

/* ---- where to begin ----
   A word beside the first question, and only while nothing has been answered:
   once you have started, the board itself is the instruction and this is noise.
   Sits to the right of its dot by default and flips to the left if that would
   put it over the sheet. */
function startCue(at,cell){
  if(!ASKED.length) return '';
  if(!S.baseDone) return '';   // nothing to point at yet
  if(ASKED.some(q=>isDone(q.id))) return '';
  const d=DOTS.find(x=>x.qid===ASKED[0].id);
  if(!d) return '';
  const H=hierarchy(ASKED[0].id,cell), p=at(d), U=unionBox();
  const gap=H.r+10;
  const right = p.x+gap+74 < U.l || p.x > U.r;    // room before the sheet?
  return '<text class="startcue" x="'+(right?p.x+gap:p.x-gap).toFixed(1)+'"'
       + ' y="'+(p.y+3).toFixed(1)+'" text-anchor="'+(right?'start':'end')+'">'
       + 'Start here</text>';
}

/* ---- the guide line ----
   Reaches from the question just answered toward whatever opened up, then
   fades. Not a straight run and not along the grid: a gentle arc that takes the
   long way round, bowing AWAY from the centre of the sheet. That does two jobs
   at once — it gives the gesture some travel instead of geometry, and it leans
   the line around the artwork rather than straight over the middle of it.

   The bow is derived from the two positions, never random, so it is identical
   on every re-render. A random curve would twitch each time the board relaid.

   Where it does cross the sheet it is drawn at a quarter of the weight. That is
   done by drawing the same curve twice under opposite clips — one keeping what
   is outside the sheet, one keeping what is inside — so a single gesture
   changes weight halfway along without becoming two lines. */
let guideFrom=null, guideTo=[];
function guideMarkup(at,cell){
  if(!CONFIG.GUIDE_LINE || !guideFrom || !guideTo.length) return '';
  const a=DOTS.find(x=>x.qid===guideFrom);
  if(!a) return '';
  const A=at(a), f=sheetRect(), vw=window.innerWidth, vh=window.innerHeight;
  const mid={x:f.left+f.width/2, y:f.top+f.height/2};
  let out='';
  for(const id of guideTo){
    const b=DOTS.find(x=>x.qid===id);
    if(!b) continue;
    const B=at(b);
    /* spring from the edge of one mark and land on the edge of the other,
       rather than burying both ends under the dots */
    const hA=hierarchy(guideFrom,cell).r+3, hB=hierarchy(id,cell).r+3;
    const dx=B.x-A.x, dy=B.y-A.y, dist=Math.hypot(dx,dy);
    if(dist<=hA+hB+8) continue;                 // too close to be worth a line
    const ux=dx/dist, uy=dy/dist;
    const x1=A.x+ux*hA, y1=A.y+uy*hA;
    const x2=B.x-ux*hB, y2=B.y-uy*hB;

    /* bow perpendicular to the chord, on whichever side leads further from the
       middle of the sheet */
    let nx=-uy, ny=ux;
    const cxm=(x1+x2)/2, cym=(y1+y2)/2;
    if(Math.hypot(cxm+nx-mid.x, cym+ny-mid.y) < Math.hypot(cxm-nx-mid.x, cym-ny-mid.y)){
      nx=-nx; ny=-ny;
    }
    const k=Math.min(dist*0.17, 6*cell);
    /* two control points at a third and two thirds, bowed by slightly different
       amounts — a symmetrical arc reads as drafted, an uneven one as travelled */
    const c1={x:x1+ux*dist*0.33+nx*k*0.85, y:y1+uy*dist*0.33+ny*k*0.85};
    const c2={x:x1+ux*dist*0.67+nx*k*1.10, y:y1+uy*dist*0.67+ny*k*1.10};
    const d='M '+x1.toFixed(1)+' '+y1.toFixed(1)
          + ' C '+c1.x.toFixed(1)+' '+c1.y.toFixed(1)
          + ' '+c2.x.toFixed(1)+' '+c2.y.toFixed(1)
          + ' '+x2.toFixed(1)+' '+y2.toFixed(1);
    /* THE WAKE.
       len is an over-estimate of the arc length — a gentle bow is a little
       longer than its chord, and guessing long only means the segment leaves a
       fraction early, whereas guessing short would cut it off mid-curve. No
       getTotalLength call, so this stays a pure string with no measuring pass.

       seg is how much of the curve is lit at once — a streak, not a line: about
       a quarter, floored so a short hop still reads as something moving rather
       than a dot, capped so a long one does not turn back into a drawn path.

       The gap is three times the path, which guarantees only ONE segment can
       ever intersect the visible stroke — a shorter gap and a second copy of
       the dash walks in behind the first.

       The offset runs from +seg to seg-len. The dash sits on [-o, seg-o], so at
       o = seg it is entirely before the start (invisible), and at o = seg-len
       its LEADING EDGE is exactly at len — on the target dot — with the tail
       still strung out behind it. That is the arrival. Running it to -len
       instead would carry the whole segment off the far end, which reads as
       overshooting the question it is pointing at. */
    const len=Math.round(dist*1.2+12);
    const seg=Math.round(Math.max(52, Math.min(len*0.26, 165)));
    const sty='--o0:'+seg+';--o1:'+(seg-len)+';stroke-dasharray:'+seg+' '+(len*3);
    out+='<path class="guide" clip-path="url(#gOut)" style="'+sty+'" d="'+d+'"/>'
       + '<path class="guide under" clip-path="url(#gIn)" style="'+sty+'" d="'+d+'"/>';
  }
  if(!out) return '';
  /* gOut keeps everything except the sheet — a full-bleed rect with the sheet
     punched out of it by the even-odd rule. gIn keeps only the sheet. */
  const R=(x,y,w,h)=>'M '+x+' '+y+' H '+(x+w)+' V '+(y+h)+' H '+x+' Z ';
  return '<defs>'
    + '<clipPath id="gOut"><path clip-rule="evenodd" d="'
    +   R(0,0,vw,vh) + R(f.left.toFixed(1),f.top.toFixed(1),f.width.toFixed(1),f.height.toFixed(1))
    + '"/></clipPath>'
    + '<clipPath id="gIn"><rect x="'+f.left.toFixed(1)+'" y="'+f.top.toFixed(1)
    +   '" width="'+f.width.toFixed(1)+'" height="'+f.height.toFixed(1)+'"/></clipPath>'
    + '</defs>' + out;
}
/* Called when a question is banked. Points at everything that just opened up —
   one dot during the linear lead, two once the path forks, so at the fork the
   wake shows the choice rather than a single destination.

   It runs after EVERY question, all the way through the session. It can afford
   to: a travelling segment that clears the screen in a little over a second is
   a hand-off, not a permanent line, so repeating it never accumulates into
   furniture the way a persistent path would. */
function aimGuide(fromId){
  if(!CONFIG.GUIDE_LINE) return;
  guideFrom=fromId;
  guideTo=availableQs();
  clearTimeout(aimGuide.t);
  aimGuide.t=setTimeout(()=>{ guideFrom=null; guideTo=[]; renderDots(); }, 1300);
}

/* No per-frame dot work exists here on purpose. The dots are on the grid, the
   grid does not move when the format changes, and they are placed clear of
   every format's footprint — so there is nothing to keep in step. */

/* ---------- open / close ---------- */
function placeCard(){
  const vw=window.innerWidth, vh=window.innerHeight;
  const f=sheetRect();
  /* pinnedQ==null must NOT search DOTS at all: decorative dots also carry
     qid:null, so x.qid===pinnedQ would match the first one of THOSE and anchor
     the card to a random background mark instead of falling through to the
     centred fallback below. Only a real question id is a valid anchor. */
  const anchor=pinnedQ==null ? null : DOTS.find(x=>x.qid===pinnedQ);
  const d=anchor ? dotXY(anchor) : null;      // grid coordinates -> pixels
  let cw=0, ch=0;
  const setW=w=>{                             // '' restores the CSS width
    card.style.width = w ? Math.round(w)+'px' : '';
    cw=card.offsetWidth||cardWidth();
    ch=card.offsetHeight;                     // re-read: narrower reflows taller
  };
  const settle=(l,t,origin)=>{
    card.style.left=Math.round(l)+'px';
    card.style.top=Math.round(t)+'px';
    card.style.transformOrigin=origin;
    cardBox={left:Math.round(l),top:Math.round(t),right:Math.round(l)+cw,bottom:Math.round(t)+ch};
  };

  /* THE CARD COMES OUT OF ITS DOT, and it never covers the poster. Those two
     want opposite things once the window is tight: a dot sits in the strip of
     screen beside the sheet, and a card hung off that dot by one corner
     reaches either across the sheet or off the edge. At 1000px wide with a
     390px sheet the strips are only ~300px, so corner-anchoring is impossible
     at ANY width the card can survive at.

     So the gesture is kept, not the geometry. Best case the card still hangs
     off the dot by a corner. Otherwise it is placed as CLOSE to its dot as the
     clear space allows, and transform-origin is aimed at the dot — so it still
     grows out of that circle, just from a card whose corner is not exactly on
     it. Both cases are tried narrowest-need-first: widths descend so the card
     is never smaller than it has to be, and each step reflows to re-measure.  */
  const widths=[];
  for(let w=cardWidth(); w>=CARD_MIN_W; w-=18) widths.push(w);
  if(widths[widths.length-1]!==CARD_MIN_W) widths.push(CARD_MIN_W);

  if(d){
    for(const w of widths){
      setW(w===cardWidth()?0:w);              // full width uses the stylesheet's own
      const hit=fitAt(d,cw,ch,vw,vh,f,false);
      if(hit){ settle(hit.left, hit.top, hit.origin); return; }
    }
    /* Scan ALL widths and keep the one that lands NEAREST the dot, rather than
       the first that merely fits. The two differ sharply: a 292px card fits the
       right-hand strip while the dot is in the left one, so "first fit" parks
       the question 600px from the circle it belongs to. Eighteen pixels
       narrower and the left strip opens up and the card lands on its dot. Ties
       within 20px go to the wider card, so it only pays width for real
       proximity. */
    let best=null;
    for(const w of widths){
      setW(w===cardWidth()?0:w);
      const near=nearestClear(d,cw,ch,vw,vh,f);
      if(!near) continue;
      const gap=Math.hypot(Math.max(near.left,Math.min(d.x,near.left+cw))-d.x,
                           Math.max(near.top, Math.min(d.y,near.top+ch))-d.y);
      if(!best || gap<best.gap-20) best={...near, gap, w};
    }
    if(best){
      setW(best.w===cardWidth()?0:best.w);
      settle(best.left, best.top, originFromDot(best.left,best.top,cw,ch,d));
      return;
    }
  }
  /* no dot to speak from (the finish card): just stay off the poster */
  for(const w of widths){
    setW(w===cardWidth()?0:w);
    const clear=clearOfSheet(cw,ch,vw,vh,f);
    if(clear){ settle(clear.left, clear.top, 'center'); return; }
  }

  setW(0);
  const last = d && (fitAt(d,cw,ch,vw,vh,f,true)
                  || fitAt(d,cw,Math.min(ch,vh-2*EDGE),vw,vh,f,true));
  if(last) settle(last.left, last.top, last.origin);
  else     settle(Math.max(EDGE,(vw-cw)/2), Math.max(EDGE,(vh-ch)/2), 'center');
}

/* Where on the card the dot is, as a transform-origin. The pop keyframes scale
   the card from this point, so aiming it at the dot is what makes the card
   read as coming OUT of that circle even when its corner cannot sit on it.
   Clamped to the card's own edges: a dot further away than the card is wide
   would otherwise throw the origin far outside it and the card would appear to
   fly in rather than grow. */
function originFromDot(l,t,cw,ch,d){
  const clamp=(v)=>Math.max(0,Math.min(100,v));
  return clamp((d.x-l)/cw*100).toFixed(1)+'% '+clamp((d.y-t)/ch*100).toFixed(1)+'%';
}

/* The placement closest to the dot that is still clear of the sheet, the
   chrome and the screen edge. Same four bands as clearOfSheet, but instead of
   centring in the roomiest it centres ON THE DOT and clamps into each band,
   then keeps whichever lands nearest. */
function nearestClear(d,cw,ch,vw,vh,f){
  const G=8;
  const zones=[
    {l:EDGE, r:f.left-G, t:EDGE, b:vh-EDGE},
    {l:f.right+G, r:vw-EDGE, t:EDGE, b:vh-EDGE},
    {l:EDGE, r:vw-EDGE, t:EDGE, b:f.top-G},
    {l:EDGE, r:vw-EDGE, t:f.bottom+G, b:vh-EDGE}
  ].filter(z=>z.r-z.l>=cw && z.b-z.t>=ch);
  if(!zones.length) return null;
  const avoid=chromeBoxes();
  const hits=(l,t)=>avoid.some(x=>l<x.right+6 && l+cw>x.left-6 && t<x.bottom+6 && t+ch>x.top-6);
  let best=null;
  for(const z of zones){
    const l=Math.min(Math.max(d.x-cw/2, z.l), z.r-cw);
    let t=Math.min(Math.max(d.y-ch/2, z.t), z.b-ch);
    if(hits(l,t)){
      /* slide along the band, nearest offset first, to step over the chrome */
      let ok=false;
      for(let s=16; s<=z.b-z.t; s+=16){
        for(const cand of [t+s, t-s]){
          if(cand<z.t || cand>z.b-ch) continue;
          if(!hits(l,cand)){ t=cand; ok=true; break; }
        }
        if(ok) break;
      }
      if(!ok) continue;
    }
    const dist=Math.hypot(l+cw/2-d.x, t+ch/2-d.y);
    if(!best || dist<best.dist) best={left:l, top:t, dist};
  }
  return best;
}

/* The best position that does not touch the sheet: take the four bands the
   sheet leaves against the viewport, keep the ones the card actually fits in,
   and centre it in the roomiest. Returns null when the sheet leaves no band
   wide enough — the only case where the card is allowed to overlap it. */
function clearOfSheet(cw,ch,vw,vh,f){
  const G=8;                                   // the same breathing room fitAt uses
  const bands=[
    {l:EDGE,        r:f.left-G,   t:EDGE, b:vh-EDGE},   // left of the sheet
    {l:f.right+G,   r:vw-EDGE,    t:EDGE, b:vh-EDGE},   // right of it
    {l:EDGE,        r:vw-EDGE,    t:EDGE, b:f.top-G},   // above
    {l:EDGE,        r:vw-EDGE,    t:f.bottom+G, b:vh-EDGE}
  ].filter(z=>z.r-z.l>=cw && z.b-z.t>=ch);
  if(!bands.length) return null;
  /* widest first: on a normal viewport that is the side of the sheet with the
     most air, which is where the card is least in the way */
  bands.sort((a,b)=>(b.r-b.l)*(b.b-b.t)-(a.r-a.l)*(a.b-a.t));
  const avoid=chromeBoxes();
  const hits=(l,t)=>avoid.some(x=>l<x.right+6 && l+cw>x.left-6 && t<x.bottom+6 && t+ch>x.top-6);
  for(const z of bands){
    const cl=(z.l+z.r)/2-cw/2, ct=(z.t+z.b)/2-ch/2;
    if(!hits(cl,ct)) return {left:cl, top:ct};
    /* centred lands on the chrome — slide down the band before giving up on it */
    for(let t=z.t; t<=z.b-ch; t+=24) if(!hits(cl,t)) return {left:cl, top:t};
  }
  const z=bands[0];
  return {left:(z.l+z.r)/2-cw/2, top:(z.t+z.b)/2-ch/2};
}

