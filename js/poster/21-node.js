/* =====================================================================
   THE NODE — the mark at the centre of the sheet: an opaque square with one
   ray per active alarm, each ray ending in a horizontal ellipse.

   Ported from the Brik canvas tool (tool-uuid d2544e92) into SVG rather than
   dropped in as a second <canvas>. That keeps the poster ONE artifact, so the
   SVG print export, the PNG export and the two-ply format crossfade all keep
   working unchanged — a canvas overlay would need its own rendering, its own
   export path and its own morph handling.

   Every control the tool ships with is FROZEN at the value it was exported
   with, except two: rayCount, which is the alarms answer, and seed, which is
   the roll (see ROLLS). The tool's sizes were
   authored in canvas pixels against roughly the default sheet's width, so
   each is re-expressed here as a fraction of B.w: that reproduces the tool's
   proportions exactly on the default format and scales the whole mark
   properly into a story or a landscape instead of pinning it to pixels.
   ===================================================================== */
const NODE={
  /* the roll's default, not a frozen value — the layout seed is re-rollable
     from the card (see ROLLS), and the mark reads it through rolled('alarms').
     It sets the ray angles and the hand-drawn wobble; the ray COUNT is the
     answer and this never touches it. */
  seed:64,
  /* ray endpoints land on a wide ellipse, never a circle — this is what keeps
     the mark horizontal on a tall sheet */
  yCompress:0.45,
  centerInk:'#F5242B', rayInk:'#0C55FF',
  /* Where the mark sits, as a fraction of the sheet — Karin: 0.627 was too low,
     0.34 was too high, coming back down partway. */
  cx:0.76, cy:0.55,
  /* One knob over all the fractions below, so the mark's proportions stay the
     tool's while its overall size is a single number to tune. Below 1 because
     at full size the node dominated a sheet it now shares with the month
     layer. 0.67 -> 0.55 on 16 Aug: Karin found the spider still too big. */
  scale:0.55,
  /* fractions of the poster width, taken from the tool's own defaults
     (elementScale 2.15, spread 700, roughness 9, misreg 6) measured at the
     default sheet's 1050 units — all multiplied through by `scale` */
  reach:0.46, baseR:0.1126, square:0.0614,
  ellRx:0.0348, ellRy:0.0184, amp:0.00083, misreg:0.00571,
  rayW:0.00328, ellW:0.00266
};

/* A hand-drawn line: subdivide start->end and push each interior vertex off
   the line by a seeded amount, so the stroke wobbles like a drawn one. */
function roughLinePts(x1,y1,x2,y2,amp,rnd){
  const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy)||1;
  const nx=-dy/len, ny=dx/len;
  const segs=Math.max(2,Math.round(len/18));
  const pts=[[x1,y1]];
  for(let i=1;i<segs;i++){
    const t=i/segs, off=(rnd()-0.5)*2*amp;
    pts.push([x1+dx*t+nx*off, y1+dy*t+ny*off]);
  }
  pts.push([x2,y2]);
  return pts;
}
/* A hand-drawn ellipse, always axis-aligned: walk the perimeter and jitter
   each point radially. */
function roughEllipsePts(cx,cy,rx,ry,amp,rnd){
  const steps=26, pts=[];
  for(let i=0;i<steps;i++){
    const a=(i/steps)*Math.PI*2;
    const j=1+(rnd()-0.5)*2*(amp/Math.max(rx,ry))*0.9;
    pts.push([cx+Math.cos(a)*rx*j, cy+Math.sin(a)*ry*j]);
  }
  return pts;
}
/* A hand-drawn square: jitter along all four edges. */
function roughRectPts(x,y,size,amp,rnd){
  const perEdge=5, pts=[];
  const corners=[[x,y],[x+size,y],[x+size,y+size],[x,y+size]];
  for(let c=0;c<4;c++){
    const [ax,ay]=corners[c], [bx,by]=corners[(c+1)%4];
    for(let i=0;i<perEdge;i++){
      const t=i/perEdge;
      pts.push([ax+(bx-ax)*t+(rnd()-0.5)*2*amp, ay+(by-ay)*t+(rnd()-0.5)*2*amp]);
    }
  }
  return pts;
}
const ptsAttr=pts=>pts.map(p=>p[0].toFixed(2)+','+p[1].toFixed(2)).join(' ');

/* Split like the snake: COMPUTE (nodeRays) gives the ray endpoints and the mark's
   dimensions; EMIT (nodeEmit) draws them. The morph controller re-emits interpolated
   endpoints frame by frame. Each ray's hand-drawn wobble is seeded on its INDEX
   (roughSeed + i*prime), not on its live coordinates, so the jitter stays put while a
   ray glides — the price (agreed) is that the resting wobble differs a touch from the
   old coordinate-seeded version. */
function nodeRays(B,C){
  B=B||box(); C=C||PAPER;
  const rays=rayCountFromAnswers();
  const W=B.w, U=W*NODE.scale;              // every length below is a fraction of U
  const cx=W*NODE.cx, cy=B.h*NODE.cy;
  const amp=NODE.amp*U, misreg=NODE.misreg*U;
  const squareSize=NODE.square*U;
  const ellRx=NODE.ellRx*U, ellRy=NODE.ellRy*U;
  /* geometry stream: seeded on the ray count too, so the angles re-scatter for each
     answer — which is exactly why a count change is a full re-scatter, not an add */
  const nodeSeed=rolled('alarms');
  const geoRnd=mulberry32((nodeSeed*100003+rays*7919)>>>0);
  const baseR=NODE.baseR*U;
  /* Clamped PER RAY, against the border its own direction runs toward — one
     global nearest-edge clamp squeezed every ray to the tightest side, so on
     an off-centre seat the open side read as cramped for no reason. The margin
     also spends the ELLIPSE radius: the tip mark rides the ray's end, and
     clamping the ray alone let the ellipse touch the trim. */
  const margin=0.02*W+ellRx;
  const reach=NODE.reach*U;
  const ends=[];
  for(let i=0;i<rays;i++){
    const jitter=(geoRnd()-0.5)*(Math.PI*2/rays)*0.75;
    const angle=(i/rays)*Math.PI*2+jitter-Math.PI/2;
    /* how far THIS direction may run before its tip mark meets a border */
    const dx=Math.cos(angle), dy=Math.sin(angle)*NODE.yCompress;
    let lim=reach;
    if(dx>0) lim=Math.min(lim,(W-cx-margin)/dx);
    if(dx<0) lim=Math.min(lim,(cx-margin)/-dx);
    if(dy>0) lim=Math.min(lim,(B.h-cy-margin)/dy);
    if(dy<0) lim=Math.min(lim,(cy-margin)/-dy);
    const maxLen=Math.max(baseR+1, lim);
    const len=baseR+(0.35+geoRnd()*0.65)*(maxLen-baseR);
    ends.push([cx+Math.cos(angle)*len, cy+Math.sin(angle)*len*NODE.yCompress]);
  }
  const roughSeed=(nodeSeed*2654435+rays*40503+991)>>>0;
  /* Multiply is the riso move; live on light paper, off on dark (else both inks drive
     to black and the mark vanishes). Tested by luminance, not one literal colour. */
  const lum=(hex=>{const h=hex.replace('#','');
    return (0.2126*parseInt(h.slice(0,2),16)+0.7152*parseInt(h.slice(2,4),16)
          + 0.0722*parseInt(h.slice(4,6),16))/255;})(C.bg);
  return {cx,cy,W,Bw:B.w,Bh:B.h,amp,misreg,squareSize,ellRx,ellRy,
          maskId:'nodeKnock-'+B.w+'x'+B.h,           // keyed to format: two plies must not share one mask id
          blend: lum>0.5 ? ' style="mix-blend-mode:multiply"' : '',
          roughSeed, ends};
}

/* Emit the node from a ray layout. `ends` may be settled or an interpolated morph
   frame; identical output either way. */
function nodeEmit(L){
  const {cx,cy,W,Bw,Bh,amp,misreg,squareSize,ellRx,ellRy,maskId,blend,roughSeed,ends}=L;
  /* class/--ri/--rl are inert at rest; they only bite while the group carries .enter.
     Each ray owns a stable seed (index, not coordinates) so its wobble survives a
     glide; --rl is the ray's length + a hair so the entrance draw-on reaches the tip. */
  const raySeed=i=>(roughSeed + i*2246822519)>>>0;
  let rayPlate='';
  ends.forEach((e,i)=>{
    const lr=mulberry32(raySeed(i));
    const rl=(Math.hypot(e[0]-cx, e[1]-cy)+6).toFixed(1);
    rayPlate+='<polyline class="nray" style="--ri:'+i+';--rl:'+rl+'" points="'+ptsAttr(roughLinePts(cx,cy,e[0],e[1],amp,lr))+'"/>';
  });
  rayPlate='<g fill="none" stroke="'+NODE.rayInk+'" stroke-width="'+(NODE.rayW*W).toFixed(2)
         + '" stroke-linejoin="round" stroke-linecap="round">'+rayPlate+'</g>';
  let ellipses='';
  ends.forEach((e,i)=>{
    const er=mulberry32((raySeed(i)^0x9E3779B9)>>>0);
    ellipses+='<polygon class="nell" style="--ri:'+i+'" points="'+ptsAttr(roughEllipsePts(e[0],e[1],ellRx,ellRy,amp,er))+'"/>';
  });
  ellipses='<g fill="'+NODE.rayInk+'" fill-opacity="0.85" stroke="'+NODE.rayInk
         + '" stroke-width="'+(NODE.ellW*W).toFixed(2)+'" stroke-linejoin="round">'+ellipses+'</g>';

  const sr=mulberry32((roughSeed+12345)>>>0);
  const square='<polygon class="nsq" points="'
    + ptsAttr(roughRectPts(cx-squareSize/2, cy-squareSize/2, squareSize, amp, sr))
    + '" fill="'+NODE.centerInk+'"/>';

  return '<g>'
    + '<mask id="'+maskId+'" maskUnits="userSpaceOnUse" x="0" y="0" width="'+Bw+'" height="'+Bh+'">'
    +   '<rect width="'+Bw+'" height="'+Bh+'" fill="#fff"/>'
    +   '<rect x="'+(cx-squareSize/2+misreg*0.5).toFixed(2)+'" y="'+(cy-squareSize/2-misreg*0.4).toFixed(2)
    +     '" width="'+squareSize.toFixed(2)+'" height="'+squareSize.toFixed(2)+'" fill="#000"/>'
    + '</mask>'
    /* blend sits on the ray plate only, OUTSIDE the masked group (a mask isolates its
       group, so multiply would blend against transparency instead of paper+grid). The
       two plates are offset: the misregistration that makes it read as printed. */
    + '<g'+blend+'>'
    +   '<g mask="url(#'+maskId+')" transform="translate('+(-misreg*0.5).toFixed(2)+','+(misreg*0.4).toFixed(2)+')">'
    +     rayPlate + ellipses
    +   '</g>'
    + '</g>'
    /* the square is never multiplied — it is the knockout centre the rays are cut from */
    + '<g transform="translate('+(misreg*0.5).toFixed(2)+','+(-misreg*0.4).toFixed(2)+')">'+square+'</g>'
    + '</g>';
}
function risoNodeMarkup(B,C){ return nodeEmit(nodeRays(B,C)); }

/* smoke: fixed shuffled cell order, revealed progressively, on the base grid.
   The smoke pixel stays finer than a grid cell — half of one — so it remains
   aligned at 2 x 2 per cell without becoming coarse. Cached per format as well
   as per seed, since a different format holds a different number of cells. */
let smokeCache={key:'',cells:[]};
function smokeCells(seed,B){
  const key=seed+'|'+B.cols+'x'+B.rows;
  if(smokeCache.key===key) return smokeCache.cells;
  /* THREE per cell, not two. The smoke pixel is pinned to 25 poster units, and
     with CELL at 75 that is a third of a cell rather than a half — which keeps
     the texture exactly as fine as it printed when the format was 21 x 30 of
     50. It is the texture's own size that matters here, not its relationship
     to a lattice the print does not show. */
  const px=CELL/3, cols=B.cols*3, rows=B.rows*3, cells=[];
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++)
    cells.push('<rect x="'+(c*px)+'" y="'+(r*px)+'" width="'+px+'" height="'+px+'"/>');
  const rnd=mulberry32((seed^0x9E3779B9)>>>0);
  for(let i=cells.length-1;i>0;i--){
    const j=Math.floor(rnd()*(i+1));
    const t=cells[i]; cells[i]=cells[j]; cells[j]=t;
  }
  smokeCache={key,cells};
  return cells;
}
function smokeLayer(years,maxYears,seed,B){
  if(years<=0) return '';
  const f=Math.min(1, years/Math.max(1,maxYears));
  if(f>=1)   // full sheet — one rect instead of every cell
    return '<rect width="'+B.w+'" height="'+B.h+'" fill="'+SMOKE+'" opacity="0.5"/>';
  const cells=smokeCells(seed,B);
  return '<g fill="'+SMOKE+'" opacity="0.5">'+cells.slice(0,Math.round(cells.length*f)).join('')+'</g>';
}

