/* =====================================================================
   THE RING STACK — the corner block hung on the top-right of the sheet.

   Ported from the Brik canvas tool (tool-uuid 3708dbbd, the Nested Ring
   Generator), second export. The tool draws a corner-anchored background
   triangle, then up to five concentric wobbled rings on top of it, each shifted
   toward an offset vector so they all crowd to one side, in one of a few
   per-ring styles (solid, halftone dots, blocks, outline, dotted), each finished
   with a clipped Riso grain and each composited onto what is under it with the
   tool's blend mode. It is reproduced faithfully — same wobble maths, same
   halftone packing, same block geometry, same grain PRNG and sequence — but as
   SVG rather than canvas, which is what the print export needs.

   THE TANGENT POINT. The lean is a unit vector and offsetIntensity is 1, so
   every ring sits internally tangent to the outer one at exactly ONE point:
   centre = P - r*u, where P is the outer ring's extreme point along the lean.
   At the frozen lean of 0° that is the outer ring's MIDDLE-RIGHT point. This is
   what the whole block hangs off: the rings kiss there, a ring gained is born
   there at r=0, and a ring lost retracts into it (see startRingsMorph).

   Everything the tool ships with is frozen except one thing: ringCount, which is
   the ANSWER (one ring per memory, via ringCountFromAnswers). The lean is still
   the roll (see ROLLS — rolled('vacations') in degrees), but its range is now a
   narrow arc around 0 so the tangent point stays on the middle-right whatever is
   rolled. The per-ring table below is the tool's own exported preset, verbatim.

   WHERE it sits is not the tool's business: the tool centres on its canvas, but
   here the tool's whole canvas is mapped onto a SQUARE hung on the sheet's
   top-right corner, sized as a fraction of the WIDTH, so the block keeps its
   size and its crop at every format. The export runs at canvasMargin 0, i.e. the
   outer ring touching the canvas edges, so the square's side is the outer ring's
   full extent doubled and the ring kisses the top and right trim exactly as
   before. The triangle then takes that square's own top-right corner.
   ===================================================================== */
const RINGS={
  ringSpacing:1, offsetIntensity:1,
  c1:'#0C55FF', c2:'#F5242B', c3:'#F8F9FC',
  strokeWidth:1, dottedDensity:12,
  /* the two global block controls (blocks style only) */
  blockSize:2.4, blockWidth:2.2,
  /* the tool's blendMode. Every ring is composited onto what is under it with
     this; the triangle lands on a transparent canvas so it stays plain. In SVG
     that is a mix-blend-mode per ring group, contained by the block's own
     stacking context so a blend could never reach the poster underneath. The
     export runs at 'normal' — plain paint, each ring covering what it sits on. */
  blend:'normal',
  /* the background triangle: right-angle vertex in the block's own top-right
     corner, both legs running back along the adjacent edges by `size`. */
  tri:{show:true, corner:'tr', mirror:false, size:0.97, color:'c2', riso:0.48},
  /* the five rings, outer (0) to inner (4) — the tool's exported preset. color
     and strokeColor are 'auto' (the c1/c2/c3 palette by index) or a named slot. */
  rings:[
    {style:'solid',    color:'auto', strokeColor:'auto', dotSize:7.5,  density:1,   spacing:1,    wobble:0.03, riso:0.59},
    /* spacing is the one value here NOT taken from the tool's export (1.9): Karin
       wanted the second ring thinned out. It only ever reaches the halftone's
       step as spacing/density, and the dot SIZE is untouched, so this opens the
       air between the dots without changing anything else — 661 dots -> 284. */
    {style:'halftone', color:'c2',   strokeColor:'auto', dotSize:20,   density:1.7, spacing:2.9,  wobble:0,    riso:0.41},
    {style:'solid',    color:'c2',   strokeColor:'c2',   dotSize:12.5, density:0.7, spacing:0.75, wobble:0,    riso:0.63},
    {style:'solid',    color:'c1',   strokeColor:'c1',   dotSize:10.5, density:0.3, spacing:0.7,  wobble:0,    riso:0.5 },
    {style:'blocks',   color:'c2',   strokeColor:'c2',   dotSize:15,   density:1,   spacing:1.25, wobble:0,    riso:0.61}
  ],
  /* placement. spanW is the outer ring's diameter as a fraction of the sheet
     WIDTH, so the block keeps its size at every format. The block is then hung
     in the top-right corner so the outer ring's extreme point KISSES the top
     and right trim — touching the canvas, never cropped (see ext in ringsGeom). */
  spanW:0.42,
  /* THE ELEMENT SCALE, and the one number that has to be right for this to look
     like the tool at all. Every px constant in the preset above (dotSize,
     strokeWidth, blockSize, the grain) is in the tool's CANVAS pixels, so what
     they mean is only fixed once you know how big the tool's own maxR was on the
     canvas the preset was tuned on — that is refR, and everything scales by
     maxR/refR. Get it wrong and the shapes are right but the DENSITY is not:
     at 336 the halftone came out half as many dots twice the size, and the fifth
     ring's blocks were wide enough to merge into a gear instead of leaving the
     blue polygon showing between them.
     Calibrated against Karin's own reference renders. The sharpest test is the
     FIFTH ring: its blocks are wide enough tangentially to overlap each other,
     and how far the wedges between them open is a steep function of refR — at
     729 they open across only the outer 9% of the block and the ring reads as
     solid, at 850 across ~60% and you get the twelve separate rectangles round a
     blue polygon that her reference shows. The halftone's dot count is the same
     dial seen from the other side. */
  refR:850
};

/* THE TOOL'S 180 DEGREE FRAME. The export carries ellipseRotation -180 at aspect
   1, and at aspect 1 the ellipse transform degenerates into a plain rotation —
   so the tool builds the whole stack and then POINT-REFLECTS it about the canvas
   centre. Two things fall out of that, and both are handled rather than ignored:
   the stack's lean flips (which is why an offsetVector of x:-1 comes out packing
   RIGHT, and why ringsGeom leans +x), and every ring's angular phase shifts by pi
   — which moves the halftone's staggered dot rings and the wobble's crests. The
   centres are handled in ringsGeom; the phase is handed to every angle below, so
   a point drawn here at angle th is the tool's own point at th - PHASE.
   The triangle is outside the tool's rotation, so it takes none of this. */
const RING_PHASE=Math.PI;

/* getWobbleRadius — the tool's deterministic per-ring wobble, unchanged. */
function ringWR(r,th,idx,wob){
  if(wob<=0.001) return r;
  const seed=(idx+1)*2.71828;
  const f1=3+(idx%3), f2=5+((idx*2)%4), f3=8+idx;
  const n1=Math.sin(th*f1+seed*2.4), n2=Math.cos(th*f2-seed*1.7), n3=Math.sin(th*f3+seed*4.1);
  const raw=n1*0.5+n2*0.35+n3*0.15;
  return Math.max(2, r+raw*(r*0.12*wob));
}
/* a closed wobbled circle as <polygon> points */
function ringPts(cx,cy,r,idx,wob){
  let s=''; const N=120;
  for(let k=0;k<=N;k++){ const th=2*Math.PI*k/N, wr=ringWR(r,th-RING_PHASE,idx,wob);
    s+=(cx+Math.cos(th)*wr).toFixed(2)+','+(cy+Math.sin(th)*wr).toFixed(2)+' '; }
  return s.trim();
}
/* one wobbled loop as a path subpath */
function ringLoop(cx,cy,r,idx,wob){
  let d=''; const N=120;
  for(let k=0;k<=N;k++){ const th=2*Math.PI*k/N, wr=ringWR(r,th-RING_PHASE,idx,wob);
    d+=(k===0?'M':'L')+(cx+Math.cos(th)*wr).toFixed(2)+' '+(cy+Math.sin(th)*wr).toFixed(2); }
  return d+'Z';
}
const ringCircle=(x,y,r)=>'<circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="'+r.toFixed(2)+'"/>';

/* applyClippedRisoGrain — the tool's grain, same PRNG and same draw sequence
   (angle, radius, size, dark?, alpha per grain), clipped to the ring's shape.
   `clipEl` is the clip's own markup (a <polygon> for a ring, a <path> for the
   blocks) rather than bare points, so any style can hand it its true silhouette. */
function ringGrain(id,clipEl,rx,ry,r,idx,riso,K){
  if(riso<=0.01) return '';
  const bbox=r*1.25;
  const dens=Math.floor(bbox*bbox*0.08*riso);
  const n=Math.min(25000,Math.max(300,dens));
  let seed=(idx+1)*76543.21;
  const rand=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
  let g='';
  for(let k=0;k<n;k++){
    const a=rand()*Math.PI*2, rad=Math.sqrt(rand())*bbox;
    const gx=rx+Math.cos(a)*rad, gy=ry+Math.sin(a)*rad;
    const gs=(0.4+rand()*1.3)*Math.max(1,K*0.8);
    const dark=rand()>0.32;
    const al=(0.08+rand()*0.35)*riso;
    g+='<circle cx="'+gx.toFixed(1)+'" cy="'+gy.toFixed(1)+'" r="'+gs.toFixed(2)+'" fill="'
      +(dark?'rgba(12,18,36,'+al.toFixed(3):'rgba(255,255,246,'+(al*0.85).toFixed(3))+')"/>';
  }
  return '<clipPath id="'+id+'">'+clipEl+'</clipPath>'
       + '<g class="rgr" clip-path="url(#'+id+')">'+g+'</g>';
}
/* the polygon form, for every style whose silhouette is just the wobbled circle */
const ringClipPoly=(cx,cy,r,idx,wob)=>'<polygon points="'+ringPts(cx,cy,r,idx,wob)+'"/>';

/* applyBoxRisoGrain — the tool's OTHER grain: scattered across a rectangular
   bbox rather than a disc, and clipped to whatever shape called it. Only the
   background triangle uses it, at the tool's own seed index of 999. */
function ringBoxGrain(id,clipEl,x0,y0,bw,bh,seedIndex,riso,K){
  if(riso<=0.01) return '';
  const n=Math.min(45000,Math.max(400,Math.floor(bw*bh*0.02*riso)));
  let seed=(seedIndex+1)*91237.77;
  const rand=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
  let g='';
  for(let k=0;k<n;k++){
    const gx=x0+rand()*bw, gy=y0+rand()*bh;
    const gs=(0.4+rand()*1.3)*Math.max(1,K*0.8);
    const dark=rand()>0.32;
    const al=(0.08+rand()*0.35)*riso;
    g+='<circle cx="'+gx.toFixed(1)+'" cy="'+gy.toFixed(1)+'" r="'+gs.toFixed(2)+'" fill="'
      +(dark?'rgba(12,18,36,'+al.toFixed(3):'rgba(255,255,246,'+(al*0.85).toFixed(3))+')"/>';
  }
  return '<clipPath id="'+id+'">'+clipEl+'</clipPath>'
       + '<g class="rgr" clip-path="url(#'+id+')">'+g+'</g>';
}
/* halftone: the tool's concentric dot packing, guaranteeing every dot stays
   inside the ring boundary */
function ringHalftone(rg,baseStroke,K){
  const cfg=rg.cfg;
  const dotR=Math.max(0.5,cfg.dotSize*K);
  const step=Math.max(2*K,(dotR*2.15*cfg.spacing)/cfg.density);
  const ringGap=step;
  const maxWob=ringGap*0.35*cfg.wobble;
  const maxDotR=dotR*(1+0.15*cfg.wobble);
  const maxRadius=Math.max(0,rg.r-maxDotR-maxWob);
  let d='';
  { let dr=dotR; if(cfg.wobble>0) dr=Math.max(0.4,dotR*(1+0.1*cfg.wobble*Math.sin(rg.i*1.7)));
    d+=ringCircle(rg.x,rg.y,dr); }
  for(let rad=ringGap; rad<=maxRadius; rad+=ringGap){
    const dots=Math.max(1,Math.round((2*Math.PI*rad)/step));
    const angOff=(rad/ringGap)*0.6+rg.i*0.9;
    for(let j=0;j<dots;j++){
      const th=angOff+2*Math.PI*j/dots;      // the tool's own angle: seeds the noise
      let effRad=rad, dr=dotR;
      if(cfg.wobble>0){
        const wN=Math.sin(th*(3+rg.i)+rad*0.05)*Math.cos(th*2-rg.i*1.3);
        effRad=rad+wN*ringGap*0.35*cfg.wobble;
        dr=Math.max(0.4,dotR*(1+0.15*cfg.wobble*wN));
      }
      const pa=th+RING_PHASE;                // where it lands once the frame is turned
      const gx=rg.x+Math.cos(pa)*effRad, gy=rg.y+Math.sin(pa)*effRad;
      if(Math.hypot(gx-rg.x,gy-rg.y)+dr>rg.r) continue;
      d+=ringCircle(gx,gy,dr);
    }
  }
  let attrs='fill="'+rg.color+'"';
  if(!rg.strokeAuto) attrs+=' stroke="'+rg.strokeColor+'" stroke-width="'+Math.max(1,baseStroke*0.35).toFixed(2)+'"';
  return '<g '+attrs+'>'+d+'</g>';
}
/* dotted: a single ring of dots on the perimeter (not in the current preset,
   kept so the port covers every style the tool can emit) */
function ringDotted(rg,baseStroke,K){
  const cfg=rg.cfg, count=RINGS.dottedDensity, dotR=cfg.dotSize*K;
  let d='';
  for(let j=0;j<count;j++){
    const th=2*Math.PI*j/count, wr=ringWR(rg.r,th,rg.i,cfg.wobble), pa=th+RING_PHASE;
    const gx=rg.x+Math.cos(pa)*wr, gy=rg.y+Math.sin(pa)*wr;
    const dw=cfg.wobble>0?(1+0.22*Math.sin(j*4.1+rg.i*3.3)):1;
    d+=ringCircle(gx,gy,Math.max(0.5,dotR*dw));
  }
  let attrs='fill="'+rg.color+'"';
  if(!rg.strokeAuto) attrs+=' stroke="'+rg.strokeColor+'" stroke-width="'+Math.max(1,baseStroke*0.4).toFixed(2)+'"';
  return '<g '+attrs+'>'+d+'</g>';
}
/* blocks: chunky bars spaced round the perimeter, each rotated so its LENGTH
   points radially outward. dottedDensity is the count; blockSize and blockWidth
   are the two global multipliers. uniformElementSize is off in this preset, so
   each ring sizes its blocks off its own dotSize. Returns the path twice over —
   once as the drawn shape, once bare, so the grain can clip to the same run. */
function ringBlocksPath(rg,K){
  const cfg=rg.cfg, count=RINGS.dottedDensity;
  const blockR=cfg.dotSize*K*RINGS.blockSize;
  const blockLen=blockR*2.1, blockWid=blockR*1.6*RINGS.blockWidth;
  let d='';
  for(let j=0;j<count;j++){
    const th=2*Math.PI*j/count, wr=ringWR(rg.r,th,rg.i,cfg.wobble), pa=th+RING_PHASE;
    const px=rg.x+Math.cos(pa)*wr, py=rg.y+Math.sin(pa)*wr;
    const wv=cfg.wobble>0?(1+0.2*Math.sin(j*3.7+rg.i*2.1)):1;
    const bl=blockLen*wv/2, bw=blockWid*wv/2;
    const ct=Math.cos(pa), st=Math.sin(pa);   // the block turns with the frame too
    const corners=[[bl,bw],[bl,-bw],[-bl,-bw],[-bl,bw]];
    for(let ci=0;ci<4;ci++){
      const lr=corners[ci][0], lt=corners[ci][1];
      d+=(ci===0?'M':'L')+(px+lr*ct-lt*st).toFixed(2)+' '+(py+lr*st+lt*ct).toFixed(2);
    }
    d+='Z';
  }
  return {d, reach:blockLen};
}
function ringBlocksBody(rg,baseStroke,d){
  let attrs='fill="'+rg.color+'"';
  if(!rg.strokeAuto) attrs+=' stroke="'+rg.strokeColor+'" stroke-width="'+Math.max(1,baseStroke*0.4).toFixed(2)+'"';
  return '<path '+attrs+' d="'+d+'"/>';
}

/* The background triangle. Corner-anchored inside the block's own square box:
   the right-angle vertex sits in the box's chosen corner and the two legs run
   back along the adjacent edges by `size`. Drawn first and left unblended — on
   the tool it lands on a transparent canvas, so hard-light over nothing is just
   the colour. */
function ringTriangle(g){
  const T=RINGS.tri, grain=true;
  if(!T.show) return '';
  const bx=g.box.x, by=g.box.y, bw=g.box.s, bh=g.box.s;
  const legX=bw*T.size, legY=bh*T.size;
  let p0,p1,p2;
  if(!T.mirror){
    if(T.corner==='tl')      { p0=[bx,by];       p1=[bx+legX,by];    p2=[bx,by+legY]; }
    else if(T.corner==='tr') { p0=[bx+bw,by];    p1=[bx+bw-legX,by]; p2=[bx+bw,by+legY]; }
    else if(T.corner==='bl') { p0=[bx,by+bh];    p1=[bx+legX,by+bh]; p2=[bx,by+bh-legY]; }
    else                     { p0=[bx+bw,by+bh]; p1=[bx+bw-legX,by+bh]; p2=[bx+bw,by+bh-legY]; }
  } else {
    if(T.corner==='tl')      { p0=[bx+legX,by];    p1=[bx,by+legY];    p2=[bx+legX,by+legY]; }
    else if(T.corner==='tr') { p0=[bx+bw-legX,by]; p1=[bx+bw,by+legY]; p2=[bx+bw-legX,by+legY]; }
    else if(T.corner==='bl') { p0=[bx+legX,by+bh]; p1=[bx,by+bh-legY]; p2=[bx+legX,by+bh-legY]; }
    else                     { p0=[bx+bw-legX,by+bh]; p1=[bx+bw,by+bh-legY]; p2=[bx+bw-legX,by+bh-legY]; }
  }
  const pts=[p0,p1,p2].map(p=>p[0].toFixed(2)+','+p[1].toFixed(2)).join(' ');
  const poly='<polygon points="'+pts+'"/>';
  const col=RINGS[T.color]||RINGS.c2;
  let out='<polygon points="'+pts+'" fill="'+col+'"/>';
  if(grain){
    const minX=Math.min(p0[0],p1[0],p2[0]), minY=Math.min(p0[1],p1[1],p2[1]);
    const maxX=Math.max(p0[0],p1[0],p2[0]), maxY=Math.max(p0[1],p1[1],p2[1]);
    out+=ringBoxGrain('triclip-'+g.W+'x'+g.H, poly, minX, minY, maxX-minX, maxY-minY, 999, T.riso, g.K);
  }
  return '<g class="rtri">'+out+'</g>';
}

/* ---------- the block's geometry ----------
   Everything the stack needs that does NOT depend on how many rings there are,
   plus this render's radii. Cheap (pure arithmetic, no markup), so the morph can
   recompute it on every real repaint the way the snake and the node do. */
function ringsGeom(B){
  const W=B.w, H=B.h;
  const n=ringCountFromAnswers();
  const maxR=RINGS.spanW*0.5*W;                  // outer ring radius, in sheet units
  const K=maxR/RINGS.refR;                        // px constants -> sheet units
  const baseStroke=RINGS.strokeWidth*K;
  /* the outer ring's true extent: its stroke reaches maxR+baseStroke/2 and its
     wobble pushes that out by up to 12%*wobble (raw peak is 1.0). Hang the block
     so that extreme point kisses the top and right trim — touching, not cropped. */
  const ext=maxR+baseStroke/2+maxR*0.12*RINGS.rings[0].wobble;
  const cx0=W-ext, cy0=ext;
  /* the lean (the roll), as a unit vector — the direction the rings pack toward */
  const ang=rolled('vacations')*Math.PI/180;
  const ux=Math.cos(ang), uy=Math.sin(ang);
  /* THE TANGENT POINT. offsetIntensity is 1 and the lean is a unit vector, so the
     tool's running shift telescopes to exactly (maxR - r): every ring's centre is
     P - r*u and every ring passes through P. At the frozen lean that is the outer
     ring's middle-right point — where new rings bud from. */
  const bx=cx0+maxR*ux, by=cy0+maxR*uy;
  const radii=[];
  for(let i=0;i<n;i++) radii.push(n===1 ? maxR : maxR*(1-0.88*Math.pow(i/n, RINGS.ringSpacing)));
  return {W,H,K,baseStroke,maxR,bx,by,ux,uy,radii,
          box:{x:cx0-ext, y:cy0-ext, s:2*ext}};   // the tool's canvas, as a square on the sheet
}
/* radii -> drawable rings. Style, colour and the whole per-ring config are keyed
   on the ring's INDEX, so a ring keeps its identity as the count changes and the
   morph only ever has to glide one number. */
function ringObjs(g,radii){
  const c1=RINGS.c1,c2=RINGS.c2,c3=RINGS.c3, auto=[c1,c2,c3];
  const slot=s=> s==='c1'?c1 : s==='c2'?c2 : s==='c3'?c3 : null;
  const out=[];
  for(let i=0;i<radii.length;i++){
    const r=radii[i], cfg=RINGS.rings[i];
    if(!cfg || !(r>0.5)) continue;               // a ring mid-retraction is simply not drawn
    const color = cfg.color==='auto' ? auto[i%3] : slot(cfg.color);
    let strokeAuto=true, strokeColor=color;
    if(cfg.strokeColor!=='auto'){ strokeAuto=false; strokeColor=slot(cfg.strokeColor); }
    out.push({i, x:g.bx-r*g.ux, y:g.by-r*g.uy, r, color, strokeAuto, strokeColor, cfg});
  }
  return out;
}
/* The ring stack alone (no triangle) — one group per ring, in index order, each
   drawn at its SETTLED size. The morph never re-emits this: it scales these
   groups about the tangent point (see startRingsMorph), so a ring's dots, blocks
   and grain always keep their true proportions to the ring they belong to. */
function ringsStack(g,radii){
  const grain=true;
  const bs=g.baseStroke, K=g.K;
  const cid=n=>'ringclip-'+n+'-'+g.W+'x'+g.H;   // format-keyed: two plies hold a full SVG each
  let out='';
  for(const rg of ringObjs(g,radii)){
    const cfg=rg.cfg;
    if(cfg.style==='hidden') continue;
    let body='', gr='';
    if(cfg.style==='outline'){
      const innerR=Math.max(1,rg.r-bs/2), outerR=rg.r+bs/2;
      body ='<polygon points="'+ringPts(rg.x,rg.y,rg.r,rg.i,cfg.wobble)+'" fill="'+rg.color+'"/>';
      body+='<path d="'+ringLoop(rg.x,rg.y,outerR,rg.i,cfg.wobble)+ringLoop(rg.x,rg.y,innerR,rg.i,cfg.wobble)
           + '" fill="'+rg.strokeColor+'" fill-rule="evenodd"/>';
      if(grain) gr=ringGrain(cid(rg.i), ringClipPoly(rg.x,rg.y,outerR,rg.i,cfg.wobble), rg.x,rg.y,outerR,rg.i,cfg.riso,K);
    } else if(cfg.style==='solid'){
      body='<polygon points="'+ringPts(rg.x,rg.y,rg.r,rg.i,cfg.wobble)+'" fill="'+rg.color+'"'
         + (rg.strokeAuto ? ' stroke="rgba(0,0,0,0.12)" stroke-width="1.20"'
                          : ' stroke="'+rg.strokeColor+'" stroke-width="'+bs.toFixed(2)+'"')+'/>';
      if(grain) gr=ringGrain(cid(rg.i), ringClipPoly(rg.x,rg.y,rg.r,rg.i,cfg.wobble), rg.x,rg.y,rg.r,rg.i,cfg.riso,K);
    } else if(cfg.style==='halftone'){
      body=ringHalftone(rg,bs,K);
      if(grain) gr=ringGrain(cid(rg.i), ringClipPoly(rg.x,rg.y,rg.r,rg.i,cfg.wobble), rg.x,rg.y,rg.r,rg.i,cfg.riso,K);
    } else if(cfg.style==='blocks'){
      const bp=ringBlocksPath(rg,K);
      body=ringBlocksBody(rg,bs,bp.d);
      if(grain) gr=ringGrain(cid(rg.i), '<path d="'+bp.d+'"/>', rg.x,rg.y,rg.r+bp.reach,rg.i,cfg.riso,K);
    } else if(cfg.style==='dotted'){
      body=ringDotted(rg,bs,K);
      const dr=rg.r+cfg.dotSize*K;
      if(grain) gr=ringGrain(cid(rg.i), ringClipPoly(rg.x,rg.y,dr,rg.i,cfg.wobble), rg.x,rg.y,dr,rg.i,cfg.riso,K);
    }
    /* the blend rides on the ring group, exactly as the tool composites one ring
       layer at a time. At 'normal' it is left off entirely rather than written
       out, so nothing forces a needless compositing group. */
    out+='<g class="rring" style="--ri:'+rg.i
       + (RINGS.blend==='normal' ? '' : ';mix-blend-mode:'+RINGS.blend+';isolation:isolate')
       + '">' + body + gr + '</g>';
  }
  return out;
}
/* The whole block. The CSS custom properties ride on a wrapper INSIDE the layer
   group (buildSVG owns the .hl group itself): the entrance scales every ring
   about the tangent point, so it needs that point in user units, and the
   triangle scales about the block's own corner. */
function ringsEmit(g){
  const n=Math.max(1,g.radii.length);
  /* isolation:isolate is load-bearing, not decoration: it gives the block its own
     compositing group, so the rings' hard-light stays INSIDE it — blending against
     the triangle and each other exactly as on the tool's own transparent canvas,
     and never reaching down into the grid, the month silhouette or the sheet. */
  /* one triangle-length, so the triangle starts fully off the top-right corner and
     slides down-left onto the canvas (see the .rtri entrance) */
  const triTravel=g.box.s*(RINGS.tri.size||0.5)*1.25;
  return '<g class="rblock" style="isolation:isolate;'
       + '--rpx:'+g.bx.toFixed(2)+'px;--rpy:'+g.by.toFixed(2)+'px;'
       + '--rtx:'+(g.box.x+g.box.s).toFixed(2)+'px;--rty:'+g.box.y.toFixed(2)+'px;'
       + '--rtdx:'+triTravel.toFixed(2)+'px;--rtdy:'+(-triTravel).toFixed(2)+'px;'
       + '--rstep:'+Math.round(360/n)+'ms">'
       + ringTriangle(g)
       + '<g class="rstack">'+ringsStack(g,g.radii)+'</g>'
       + '</g>';
}

/* the static poster path: the full block, grain and all */
function ringsMarkup(B,C){ return ringsEmit(ringsGeom(B)); }

