/* =====================================================================
   THE SNAKE LAYER — the numbered metaball serpent across the middle.
   (Not to be confused with SNAKE, the question-marker run on the interface.)

   Ported from the Brik canvas tool (tool-uuid 658046ba, Serpentine Node Flow).
   The tool lays a Catmull-Rom path through a set of hand-placed anchors, walks
   it at equal arc-length steps to drop N beads, fuses neighbouring beads with a
   metaball bridge, and numbers each bead — every sixth one inverted (red bead,
   white number). Reproduced faithfully as SVG rather than canvas, which is what
   the print export needs.

   Two things are not the tool's: the anchor path is FROZEN (the tool's own
   exported canvasState, so the serpentine's shape is fixed), and the whole
   figure is mapped into a band across the middle of the sheet rather than the
   tool's square canvas — placement is the rx/ry/rw/rh fractions below, matched
   to the reference. beadCount is the ANSWER (one bead per February day, via
   beadCountFromAnswers); everything else is frozen.

   The tool's live wiggle (simplex noise) is dropped: it runs at intensity 1px
   with the animation stopped, a sub-pixel displacement on a static path, so the
   curve is the clean Catmull-Rom the reference shows. */
const SNAKEL={
  /* the tool's exported canvasState.anchors, verbatim — the frozen path */
  anchors:[
    {x:0.0783235143442623,y:0.2365440724815725},{x:0.24934042008196722,y:0.17909244471744473},
    {x:0.13534836065573772,y:0.5906307585995086},{x:0.2695184426229508,y:0.6300003839066339},
    {x:0.3299180327868852,y:0.7740037622850123},{x:0.4694928278688525,y:0.6407113789926291},
    {x:0.5796298668032787,y:0.4332386363636364},{x:0.39386526639344266,y:0.23891469594594597},
    {x:0.5332223360655738,y:0.1282632063882064},{x:0.6051805840163934,y:0.0834325092137592},
    {x:0.7528240266393443,y:0.36556549447174447},{x:0.8969006147540983,y:0.3431837377149877},
    {x:0.9034900102459017,y:0.7212837837837839}
  ],
  beadSize:39, beadSpacing:80, metaballMerge:0.85, tailTaper:0.05,
  /* the tool's updated preset: the body is red and the numbers white, and every
     sixth bead inverts — a white bead with a red number. stroke is its own
     colour (red), NOT the highlight, so the two are kept apart. */
  body:'#F5242B', highlight:'#FFFFFF', stroke:'#F5242B',
  number:'#FFFFFF', highlightNumber:'#F5242B',
  highlightInterval:6, strokeWidth:4,
  numberSize:0.55, font:'ThermoTrial-Zero,Georgia,serif',
  /* the box the figure is FITTED into (uniformly, preserving aspect), as fractions
     of the sheet. Insets on every side keep the snake clear of the sheet edges.
     ry raised 0.31 -> 0.15 per Karin's composition reference: the run now sits in
     the sheet's upper half, clearing the lower half for what comes later. */
  rx:0.13, ry:0.15, rw:0.74, rh:0.40,
  /* THE TOP BORDER, by decision: whatever the length, the run hangs from this
     line — after the fit, the beads are shifted so the topmost bead's edge
     touches exactly this fraction of the sheet height. One rule for the shapes,
     so no length ever rides up into the corner rings — except 28, which hangs
     from its tail instead (tailTop on SNAKEL_SHAPES[28]). */
  topLine:0.268,
  /* the tool canvas is landscape ~3:2; the anchors are mapped onto that aspect so
     the shape is not squashed when it lands on the 7:10 sheet (see snakeMarkup). */
  aspect:1.5,
  /* (default count - 1) * default spacing — what the anchors were drawn to hold.
     The per-sheet scale K = pathLength / spanRef, so a full 31 beads span the
     mapped path and fewer beads end short of it, exactly as the tool behaves. */
  spanRef:2400
};

const snakeCatmull=(p0,p1,p2,p3,t)=>{
  const t2=t*t, t3=t2*t;
  return {
    x:0.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
    y:0.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)
  };
};
/* the tool's organic metaball bridge, as an SVG path 'd' — two arcs' worth of
   tangent points joined by quadratic waists. Returns '' when the beads are too
   far apart or one swallows the other, exactly as the tool skips it. */
function snakeBridge(x1,y1,r1,x2,y2,r2,merge){
  const dx=x2-x1, dy=y2-y1, dist=Math.hypot(dx,dy);
  if(dist<Math.abs(r1-r2)+0.1 || dist>(r1+r2)*3.5 || dist===0) return '';
  const angle=Math.atan2(dy,dx), nX=-dy/dist, nY=dx/dist;
  const m=Math.max(0.1,Math.min(1.5,merge));
  const baseSpread=Math.acos(Math.max(-0.99,Math.min(0.99,(r1-r2)/dist)));
  const spread=baseSpread*Math.min(0.95,0.4+0.35*m);
  const f=n=>n.toFixed(1);
  const p1a=[x1+r1*Math.cos(angle+spread), y1+r1*Math.sin(angle+spread)];
  const p1b=[x1+r1*Math.cos(angle-spread), y1+r1*Math.sin(angle-spread)];
  const p2a=[x2+r2*Math.cos(angle+Math.PI-spread), y2+r2*Math.sin(angle+Math.PI-spread)];
  const p2b=[x2+r2*Math.cos(angle+Math.PI+spread), y2+r2*Math.sin(angle+Math.PI+spread)];
  const midX=(x1+x2)*0.5, midY=(y1+y2)*0.5;
  const waistR=((r1+r2)*0.5)*Math.max(0.05,(1.1-0.45/m));
  const cpT=[midX+nX*waistR, midY+nY*waistR], cpB=[midX-nX*waistR, midY-nY*waistR];
  return 'M'+f(p1a[0])+' '+f(p1a[1])+'Q'+f(cpT[0])+' '+f(cpT[1])+' '+f(p2a[0])+' '+f(p2a[1])
       + 'L'+f(p2b[0])+' '+f(p2b[1])+'Q'+f(cpB[0])+' '+f(cpB[1])+' '+f(p1b[0])+' '+f(p1b[1])+'Z';
}

/* The SKELETON changes with the answer: February's three lengths each get their
   own hand-drawn path (Brik canvasState). 29 and 30 are their own shapes; 31 is
   SNAKEL.anchors, left as it was. Each also carries the merge it was drawn with.
   None of them decides its own height: every length hangs from SNAKEL.topLine. */
const SNAKEL_SHAPES={
  /* 31 keeps the frozen SNAKEL.anchors — the entry exists only to carry
     touchRings: after the topLine hang, the whole run is lifted until its
     nearest bead KISSES the corner ring stack (slightly into it — see the
     bite in snakeBeads), per Karin's 16 Aug direction. Computed against
     RINGS.spanW, not a tuned constant, so the touch holds on both plies. */
  /* nudge: a last, hand-set offset in sheet fractions, applied after every
     placement rule — Karin's 16 Aug tune: a bit up (deeper into the rings'
     reach) and a touch right. */
  31:{merge:0.85, touchRings:true, nudge:{x:0.012, y:-0.018}, anchors:null},
  /* tailTop: the 28 run hangs from its TAIL, not from topLine's topmost-bead
     rule. Its topmost bead is the head (bead 1, far left), so the topLine rule
     left bead 28 sitting low; Karin wants bead 28's edge kissing her reference
     line instead — measured off her marked-up render at 0.248 of sheet height. */
  28:{merge:0.65, tailTop:0.248, anchors:[
    {x:0.2312884221311475,y:0.11385710995085996},{x:0.276812243852459,y:0.28244011056511054},
    {x:0.12203509221311476,y:0.6937672757985258},{x:0.42883580942622945,y:0.4840870700245701},
    {x:0.504719518442623,y:0.8652679668304668},{x:0.7804879610655737,y:0.6387726504914005},
    {x:0.6015112704918032,y:0.44066722972972977},{x:0.8575051229508197,y:0.31751957923832924},
    {x:0.9136910860655737,y:0.44950667997543},{x:0.9226114241803278,y:0.24770615786240785},
    {x:0.9014472336065573,y:0.09791538697788699},{x:0.802875256147541,y:0.037786010442260445},
    {x:0.8034387807377049,y:0.03129798832923833},{x:0.7964523565573771,y:0.02526105651105651}]},
  29:{merge:0.65, anchors:[
    {x:0.10330430327868853,y:0.2470247235872236},{x:0.20021772540983607,y:0.6834017966830467},
    {x:0.38954918032786884,y:0.10837684275184274},{x:0.4538358094262295,y:0.5914657555282555},
    {x:0.7793545081967213,y:0.22429745085995087},{x:0.7281954405737704,y:0.6169667536855037},
    {x:0.816969774590164,y:0.8083058200245701},{x:0.9044761782786885,y:0.44202050061425063},
    {x:0.9216380635245902,y:0.46039043304668303},{x:0.9014472336065573,y:0.09791538697788699},
    {x:0.802875256147541,y:0.037786010442260445},{x:0.8034387807377049,y:0.03129798832923833},
    {x:0.7964523565573771,y:0.02526105651105651}]},
  /* 30's second skeleton (Serpentine export 8ba16642, 16 Aug) was tried and
     ROLLED BACK the same day: its path ran ~46% longer than the reference, so
     the run came out either giant-beaded, gappy, or printed small — no scale
     satisfied all three. The original hand-drawn 30 stays. */
  30:{merge:0.65, anchors:[
    {x:0.10470671106557376,y:0.7645596590909091},{x:0.18322233606557375,y:0.4256180896805897},
    {x:0.400749231557377,y:0.6779215294840294},{x:0.5155353483606557,y:0.18177019348894347},
    {x:0.6540279200819672,y:0.1153351504914005},{x:0.6970222848360655,y:0.7749731265356266},
    {x:0.9663358094262294,y:0.35331887285012287},{x:0.7517546106557377,y:0.2893120393120393},
    {x:0.9363217213114753,y:0.13007716523341523},{x:0.9014472336065573,y:0.09791538697788699},
    {x:0.802875256147541,y:0.037786010442260445},{x:0.8034387807377049,y:0.03129798832923833},
    {x:0.7964523565573771,y:0.02526105651105651}]}
};
/* snakeMarkup is split into COMPUTE (snakeBeads) and EMIT (snakeEmit). The static
   paint still calls snakeMarkup() and gets the identical string as before; the morph
   controller calls snakeEmit() directly with an INTERPOLATED bead layout, once per
   frame, so the snake can glide between two February lengths without the whole poster
   being repainted. */
/* Map a set of anchors into the sheet band and walk it: the tool's landscape
   aspect first (so the shape reads like the Brik preview, not squashed by a
   non-uniform x/y stretch), then a uniform FIT into the band, centred — the
   band's insets keep the run clear of the sheet edges. Returns the arc-length
   samples the beads walk on. Split out of snakeBeads so a custom skeleton can
   also measure the DEFAULT skeleton's scale (see sizeK below). */
function snakeTrace(anchors,W,H){
  const AR=SNAKEL.aspect;
  const V=anchors.map(a=>({x:a.x*AR, y:a.y}));
  let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
  V.forEach(p=>{ if(p.x<mnx)mnx=p.x; if(p.x>mxx)mxx=p.x; if(p.y<mny)mny=p.y; if(p.y>mxy)mxy=p.y; });
  const bw=(mxx-mnx)||1, bh=(mxy-mny)||1;
  const tx=SNAKEL.rx*W, ty=SNAKEL.ry*H, tw=SNAKEL.rw*W, th=SNAKEL.rh*H;
  const fit=Math.min(tw/bw, th/bh);
  const ox=tx+(tw-bw*fit)/2, oy=ty+(th-bh*fit)/2;
  const A=V.map(p=>({x:ox+(p.x-mnx)*fit, y:oy+(p.y-mny)*fit}));
  if(A.length<2) return null;
  /* pad the ends so the spline reaches the first and last anchor, as the tool does */
  const pF={x:2*A[0].x-A[1].x, y:2*A[0].y-A[1].y};
  const pL={x:2*A[A.length-1].x-A[A.length-2].x, y:2*A[A.length-1].y-A[A.length-2].y};
  const P=[pF,...A,pL];
  const STEPS=80, samp=[];
  for(let i=1;i<P.length-2;i++){
    const p0=P[i-1],p1=P[i],p2=P[i+1],p3=P[i+2];
    for(let s=0;s<STEPS;s++) samp.push(snakeCatmull(p0,p1,p2,p3,s/STEPS));
  }
  const arc=[0];
  for(let k=1;k<samp.length;k++) arc.push(arc[k-1]+Math.hypot(samp[k].x-samp[k-1].x, samp[k].y-samp[k-1].y));
  const L=arc[arc.length-1];
  if(!(L>0)) return null;
  return {samp,arc,L};
}
function snakeBeads(B,C){
  B=B||box();
  const W=B.w, H=B.h;
  const shape=SNAKEL_SHAPES[beadCountFromAnswers()];
  const anchors=(shape&&shape.anchors)?shape.anchors:SNAKEL.anchors;
  const tr=snakeTrace(anchors,W,H);
  if(!tr) return null;
  const samp=tr.samp, arc=tr.arc, L=tr.L;
  const K=L/SNAKEL.spanRef;
  const spacing=SNAKEL.beadSpacing*K, baseR=SNAKEL.beadSize*K, sw=SNAKEL.strokeWidth*K;
  const count=beadCountFromAnswers();

  const beads=[];
  for(let b=0;b<count;b++){
    const td=b*spacing; if(td>L) break;
    let idx=0; while(idx<arc.length-1 && arc[idx+1]<td) idx++;
    let pos=samp[idx];
    if(idx<arc.length-1){
      const d1=arc[idx], d2=arc[idx+1], fr=(td-d1)/((d2-d1)||1);
      pos={x:samp[idx].x+(samp[idx+1].x-samp[idx].x)*fr, y:samp[idx].y+(samp[idx+1].y-samp[idx].y)*fr};
    }
    const taper=1-SNAKEL.tailTaper*(b/Math.max(1,count-1));
    beads.push({index:b+1, x:pos.x, y:pos.y, r:Math.max(4*K, baseR*taper)});
  }
  if(!beads.length) return null;
  /* THE TOP BORDER. The four skeletons reach different heights, and the spline
     overshoots its anchors besides, so the fit alone cannot promise where the
     run's top lands. Measured and shifted instead: the topmost bead's EDGE is
     put exactly on SNAKEL.topLine, whatever the length. */
  let minTop=1e9;
  beads.forEach(b=>{ if(b.y-b.r<minTop) minTop=b.y-b.r; });
  let shift=SNAKEL.topLine*H-minTop;
  /* ...except a shape that carries tailTop: then the LAST bead is the anchor —
     its top edge lands on tailTop*H — because on that skeleton the topmost bead
     is the head and the topLine rule says nothing about where the tail ends up
     (see the note on SNAKEL_SHAPES[28]). */
  if(shape && shape.tailTop!=null){
    const tail=beads[beads.length-1];
    shift=shape.tailTop*H-(tail.y-tail.r);
  }
  beads.forEach(b=>{ b.y+=shift; });
  /* ...and a shape that carries touchRings (31) then CLIMBS: the run is lifted
     until its nearest bead reaches the corner ring stack, plus a small bite so
     the contact reads as a touch rather than a hairline miss. Solved against
     the rings' own placement (outer radius spanW*W/2, hung in the top-right
     corner), so the kiss holds at any format. */
  if(shape && shape.touchRings){
    const R=RINGS.spanW*W/2, rcx=W-R, rcy=R;
    let need=1e9;
    beads.forEach(b=>{
      const dx=Math.abs(b.x-rcx), reach=R+b.r;
      if(dx>=reach || b.y<=rcy) return;
      const d=(b.y-rcy)-Math.sqrt(reach*reach-dx*dx);
      if(d<need) need=d;
    });
    if(need<1e9 && need>0){
      const bite=W*0.01;
      beads.forEach(b=>{ b.y-=(need+bite); });
    }
  }
  /* the shape's hand-set nudge, if any — sheet fractions, applied LAST so it
     rides on top of whatever rule placed the run. */
  if(shape && shape.nudge){
    beads.forEach(b=>{ b.x+=shape.nudge.x*W; b.y+=shape.nudge.y*H; });
  }
  const merge=shape?shape.merge:SNAKEL.metaballMerge;
  return {beads, sw, merge, K};
}

/* Emit the snake's SVG from a bead layout. `beads` is either the settled set or an
   interpolated morph frame — same output shape, so one code path serves both. */
function snakeEmit(beads, sw, merge, K){
  if(!beads || !beads.length) return '';
  const isH=b=> b.index%SNAKEL.highlightInterval===0;
  const f=n=>n.toFixed(1);

  /* underlay: one red plate under everything (beads + bridges grown by the
     stroke width), so the whole snake reads with a single outer edge */
  let u='';
  for(let i=0;i<beads.length-1;i++){
    const d=snakeBridge(beads[i].x,beads[i].y,beads[i].r+sw*0.5, beads[i+1].x,beads[i+1].y,beads[i+1].r+sw*0.5, merge);
    if(d) u+='<path class="sbead" style="--bi:'+i+'" d="'+d+'"/>';
  }
  for(const b of beads) u+='<circle class="sbead" style="--bi:'+(b.index-1)+'" cx="'+f(b.x)+'" cy="'+f(b.y)+'" r="'+f(b.r+sw*0.5)+'"/>';
  let out = sw>0 ? '<g fill="'+SNAKEL.stroke+'">'+u+'</g>' : '';

  /* overlay bodies: bridges then circles, so later (tail-ward) beads sit on top.
     A bridge between two highlighted beads takes the highlight colour, like the tool. */
  for(let i=0;i<beads.length-1;i++){
    const b1=beads[i], b2=beads[i+1], col=(isH(b1)&&isH(b2))?SNAKEL.highlight:SNAKEL.body;
    const d=snakeBridge(b1.x,b1.y,b1.r, b2.x,b2.y,b2.r, merge);
    if(d) out+='<path class="sbead" style="--bi:'+i+'" d="'+d+'" fill="'+col+'"/>';
  }
  for(const b of beads) out+='<circle class="sbead" style="--bi:'+(b.index-1)+'" cx="'+f(b.x)+'" cy="'+f(b.y)+'" r="'+f(b.r)+'" fill="'+(isH(b)?SNAKEL.highlight:SNAKEL.body)+'"/>';

  /* numbers: white on a red bead, red on a highlighted white one */
  for(const b of beads){
    const fs=Math.max(8*K, b.r*2*SNAKEL.numberSize);
    out+='<text class="sbead" style="--bi:'+(b.index-1)+'" x="'+f(b.x)+'" y="'+f(b.y)+'" font-family="'+SNAKEL.font+'" font-weight="700" font-size="'+f(fs)
       + '" text-anchor="middle" dominant-baseline="central" fill="'+(isH(b)?SNAKEL.highlightNumber:SNAKEL.number)+'">'+b.index+'</text>';
  }
  return out;
}
function snakeMarkup(B,C){
  const d=snakeBeads(B,C);
  return d ? snakeEmit(d.beads, d.sw, d.merge, d.K) : '';
}

