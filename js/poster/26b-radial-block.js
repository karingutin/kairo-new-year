/* =====================================================================
   THE RADIAL BLOCK — a 3D spiral of beams standing where the snake used to
   (Karin, 26 Aug), same slot as SNAKEL: data-q="febdays".

   Ported from the Brik canvas tool (tool-uuid 2aecaac0, Radial Block 3D),
   reproduced as SVG rather than canvas for the same reason the snake was —
   print export needs vectors, not pixels. The projector, the beam builder
   and the wobbly-edge jitter are the tool's own math, carried over as-is;
   only the OUTPUT changed from ctx calls to path/polygon strings.

   SECOND PASS (Karin, 30 Aug): febdays stopped being a day-count and became
   a wish — "What do you want the new year to bring you?" — so beamCount is
   FROZEN now (was the answer; see beadCountFromAnswers, still read by the
   dead snake layer and the hover-note text, untouched here) and the answer
   instead picks the beams' CAP SHAPE. Karin built and exported one Brik
   variant per shape (star / plus / circle / diamond) to settle each one's
   own dial values; where the four exports agreed, that value is what is
   frozen below — where they didn't (an odd beamCount, a different beam
   thickness), that read as a slip on whichever dial was being fiddled with
   for that export, not an intended per-shape difference, so the majority
   value won.

   Colour is NOT frozen, unlike the tool's export: faceColor is the paper
   (cut-out-of-the-sheet convention every other layer uses), sideColor is the
   red ink role, strokeColor the blue one — inkedMarkup's frozen-hex map
   handles the swap the same way it does for every other layer, because the
   two colours below ARE #F5242B/#0C55FF, not the tool's own pink/green. */
const RADIAL={
  beamCount:27,
  /* beamLength 0.9->0.72 (Karin, 30 Aug: the tips were reaching past the
     sheet's own edge, especially the star's points and the plus/cross's
     corners) — pulled in ~20% so the longest beam, at the top of its
     lengthVariance range, still lands inside the fitted box.
     lengthVariance/depthJitter/edgeJitter all pulled down the same day
     ("less clutter... more like this reference — evenly arranged, more
     vector") — less per-beam scatter in length and depth, and a much
     lighter hand-drawn wobble on every edge, so the beams read as one even
     radiating fan rather than an overlapping, hand-scrawled cluster. */
  /* edgeJitter 0.04 -> 0.02 (Karin, 31 Aug: "reduce the hand-drawn quality of
     this element"). This is the one knob for it — it is the sideways push on
     every subdivided edge, so it is what makes a straight beam read as drawn
     by hand rather than plotted. Halved, not zeroed: at 0 the beams go
     mechanically clean and stop belonging to the rest of the sheet, which is
     hand-cut everywhere. lengthVariance is left where it is; that one is the
     fan's ARRANGEMENT, not its hand, and pulling it would flatten the spiral
     into a wheel. */
  spiralTurns:1.4, innerRadius:0.32, beamThickness:0.08, beamLength:0.72,
  lengthVariance:0.12, depthJitter:0.02, handCut:0, edgeJitter:0.02,
  towardBias:0.72, fov:73, elevation:1.1, zoom:1.45,
  strokeWidth:1.5, misregistration:0,
  faceColor:'#FAF8F8', sideColor:'#F5242B', strokeColor:'#0C55FF',
  /* the box the figure is fitted into, as fractions of the sheet — unchanged
     by the shape-cap switch (see js/app/79-dev-poster.js for the live-tuned
     size/position on top of this). */
  rx:-0.006, ry:0.083, rw:1.012, rh:0.575
};
/* Which cap shape each answer draws. The wording lives in js/10-bank.js;
   this is the one place that maps its words to Brik's `capShape` values. */
const RADIAL_SHAPE_BY_ANSWER={
  'Good news':'star', 'Promotion':'plus', 'Closure':'circle', 'Reunion':'diamond'
};
const radialShapeFromAnswers=()=> RADIAL_SHAPE_BY_ANSWER[ans('febdays')] || 'star';
/* One `beamThickness` fed every shape's cross-section the same `half`, but
   the shapes don't cover equal area at radius 1 — a circle's disc is over
   twice a star's, a diamond's half again — so at a shared half the round
   shapes read visibly heavier (Karin, 30 Aug: "closure and reunion's body
   is too thick vs the others"). Scaled each shape's own half by
   sqrt(star's shoelace area / this shape's), so every cap carries roughly
   star's perceived bulk regardless of how much of its bounding radius its
   outline actually fills. */
const RADIAL_THICKNESS_BY_SHAPE={star:1, plus:1, circle:0.66, diamond:0.81, triangle:1, hexagon:0.75, teardrop:0.9, square:0.57};
const radialThicknessScale=shape=> RADIAL_THICKNESS_BY_SHAPE[shape] ?? 1;
/* ONE shared seed for every shape (Karin, 30 Aug, reversing the per-shape
   seeds from earlier the same day): "let the rays stay in exactly the same
   place and only the shape change." Karin's own star export's seed — the
   one shape everyone had already approved the arrangement of. With one
   layout for all four answers, the morph between them is a pure CAP change:
   no beam ever has to travel anywhere, which is also lighter to animate. */
const RADIAL_SEED=897;
const radialSeedFromShape=()=>RADIAL_SEED;

const radialRng=seed=>{ let s=seed>>>0; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; };
const radialHash2=(a,b)=>{
  let h=(a*374761393+b*668265263)>>>0;
  h=(h^(h>>>13))>>>0; h=Math.imul(h,1274126177)>>>0;
  return ((h^(h>>>16))>>>0)/4294967296;
};
/* the tool's wobbly polygon: every edge subdivided and pushed sideways by a
   hashed, deterministic amount, so the shapes read hand-drawn rather than
   laser-cut. Builds an SVG path 'd' instead of walking a canvas context. */
function radialWobblyPath(pts,amt,key){
  const n=pts.length;
  if(amt<=0.0001){
    let d='M'+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1);
    for(let k=1;k<n;k++) d+='L'+pts[k][0].toFixed(1)+' '+pts[k][1].toFixed(1);
    return d+'Z';
  }
  let d='', started=false;
  for(let e=0;e<n;e++){
    const p1=pts[e], p2=pts[(e+1)%n];
    const dx=p2[0]-p1[0], dy=p2[1]-p1[1], len=Math.hypot(dx,dy)||1e-6;
    const nx=-dy/len, ny=dx/len;
    const segs=Math.max(3,Math.min(10,Math.round(len/26)));
    const amp=amt*Math.min(14,3+len*0.05);
    for(let s=0;s<segs;s++){
      const t=s/segs;
      let px=p1[0]+dx*t, py=p1[1]+dy*t;
      if(s>0){
        const env=Math.sin(Math.PI*t);
        const r=(radialHash2(key+e*131,s*977)-0.5)*2;
        const off=r*amp*env;
        px+=nx*off; py+=ny*off;
      }
      d += (started?'L':'M')+px.toFixed(1)+' '+py.toFixed(1);
      started=true;
    }
  }
  return d+'Z';
}
/* the open-line counterpart, for the cylinder's silhouette contours and
   centre seam — same hand-drawn bend, but not closed into a loop. */
function radialWobblyLine(a,b,amt,key){
  const dx=b[0]-a[0], dy=b[1]-a[1], len=Math.hypot(dx,dy)||1e-6;
  if(amt<=0.0001) return 'M'+a[0].toFixed(1)+' '+a[1].toFixed(1)+'L'+b[0].toFixed(1)+' '+b[1].toFixed(1);
  const nx=-dy/len, ny=dx/len;
  const segs=Math.max(3,Math.min(10,Math.round(len/26)));
  const amp=amt*Math.min(14,3+len*0.05);
  let d='';
  for(let s=0;s<=segs;s++){
    const t=s/segs;
    let px=a[0]+dx*t, py=a[1]+dy*t;
    if(s>0 && s<segs){
      const env=Math.sin(Math.PI*t);
      const r=(radialHash2(key,s*977)-0.5)*2;
      px+=nx*r*amp*env; py+=ny*r*amp*env;
    }
    d+=(s===0?'M':'L')+px.toFixed(1)+' '+py.toFixed(1);
  }
  return d;
}

const rvsub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const rvadd=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const rvscale=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const rvdot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const rvcross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const rvlen=a=>Math.sqrt(rvdot(a,a));
const rvnorm=a=>{ const l=rvlen(a)||1e-9; return [a[0]/l,a[1]/l,a[2]/l]; };

function radialCamera(elevation,dist,fovDeg,w,h){
  const eye=[0,elevation,dist], target=[0,0,0], up=[0,1,0];
  const forward=rvnorm(rvsub(target,eye));
  const right=rvnorm(rvcross(forward,up));
  const camUp=rvcross(right,forward);
  const f=1/Math.tan((fovDeg*Math.PI/180)/2);
  return {eye,forward,right,camUp,f,w,h};
}
const radialToView=(cam,p)=>{ const d=rvsub(p,cam.eye); return [rvdot(d,cam.right),rvdot(d,cam.camUp),rvdot(d,cam.forward)]; };
function radialProject(cam,v,zoom){
  if(v[2]<=0.02) return null;
  const sx=(v[0]/v[2])*cam.f, sy=(v[1]/v[2])*cam.f;
  const scale=Math.min(cam.w,cam.h)*0.5*zoom;
  return [cam.w/2+sx*scale, cam.h/2-sy*scale, v[2]];
}

/* Perimeter offsets [au,av] (units of `half`) for a beam's cross-section.
   The SAME section drives both end caps and the side-face count, so the
   shape answer changes what a beam's TIP looks like without touching
   anything else about how beams are laid out or projected. */
function radialCrossSection(shape){
  const pts=[];
  if(shape==='circle'){
    const seg=14;
    for(let k=0;k<seg;k++){ const a=(k/seg)*Math.PI*2; pts.push([Math.cos(a),Math.sin(a)]); }
  } else if(shape==='triangle'){
    for(let k=0;k<3;k++){ const a=-Math.PI/2+(k/3)*Math.PI*2; pts.push([Math.cos(a),Math.sin(a)]); }
  } else if(shape==='star'){
    const n5=5, inner=0.45;
    for(let k=0;k<n5*2;k++){
      const a=-Math.PI/2+(k/(n5*2))*Math.PI*2;
      const rr=(k%2===0)?1:inner;
      pts.push([Math.cos(a)*rr,Math.sin(a)*rr]);
    }
  } else if(shape==='hexagon'){
    for(let k=0;k<6;k++){ const a=-Math.PI/2+(k/6)*Math.PI*2; pts.push([Math.cos(a),Math.sin(a)]); }
  } else if(shape==='diamond'){
    pts.push([0,-1],[1,0],[0,1],[-1,0]);
  } else if(shape==='plus'){
    const a=0.4;
    pts.push([-a,-1],[a,-1],[a,-a],[1,-a],[1,a],[a,a],[a,1],[-a,1],[-a,a],[-1,a],[-1,-a],[-a,-a]);
  } else if(shape==='teardrop'){
    const seg=18;
    for(let k=0;k<seg;k++){
      const t=(k/seg)*Math.PI*2;
      const px=Math.cos(t), py=Math.sin(t)*Math.pow(Math.sin(t/2),2);
      pts.push([py*1.8,-px]);
    }
  } else { // square
    pts.push([-1,-1],[1,-1],[1,1],[-1,1]);
  }
  return pts;
}

/* Every shape resampled to the SAME N points, spaced evenly by ANGLE around
   the origin rather than by the shape's own vertex list — a straight edge
   just picks up extra points sitting exactly ON it (an edge split into
   collinear points still looks like that edge), so this changes nothing
   about how any single shape reads. What it buys: every shape is now the
   same M-gon topology, so the MORPH between two shapes (see startRadialMorph
   below) is a plain per-vertex lerp, not a re-triangulation. All eight
   shapes in radialCrossSection are star-shaped from the origin (any ray out
   from the centre crosses the outline exactly once), which is what makes
   ray-casting at N even angles well-defined.

   THE CLAIM ABOVE — "this changes nothing about how any single shape reads" —
   WAS WRONG, and the plus is where it showed (Karin, 31 Aug: "the plusses of
   the promotion element look slightly rounded"). It holds for points landing
   on a straight EDGE. It does not hold for CORNERS. The plus's twelve
   vertices sit at 21.8°, 45°, 68.2°, 111.8°, 135°, 158.2° and their
   reflections; sampling every 360/24 = 15° hits 45, 135, 225 and 315 and
   misses the other eight completely, so each arm tip was quietly chamfered
   off. atan(0.4) is not a neat fraction of a turn, so no sane N lands on it
   by luck.

   So the ray-cast still runs at N even angles — the morph needs every shape
   to come out the same length — and then every true vertex is SNAPPED onto
   the sample nearest its own angle. The corner comes back exactly, the
   vertex count does not move, and the lerp in startRadialMorph keeps working.
   Collisions are stepped past rather than allowed to overwrite, so two
   corners can never claim one slot and leave a third unrepresented. */
function radialResampleSection(pts,N){
  const n=pts.length, out=[];
  for(let k=0;k<N;k++){
    const th=(k/N)*Math.PI*2, cosT=Math.cos(th), sinT=Math.sin(th);
    let found=null;
    for(let e=0;e<n;e++){
      const p1=pts[e], p2=pts[(e+1)%n];
      const dx=p2[0]-p1[0], dy=p2[1]-p1[1];
      const denom=dx*sinT-dy*cosT;
      if(Math.abs(denom)<1e-9) continue;
      const u=(p1[1]*cosT-p1[0]*sinT)/denom;
      if(u<-1e-6||u>1+1e-6) continue;
      const px=p1[0]+u*dx, py=p1[1]+u*dy;
      const t=Math.abs(cosT)>Math.abs(sinT) ? px/cosT : py/sinT;
      if(t<=1e-6) continue;
      found=[px,py]; break;
    }
    out.push(found||[0,0]);
  }
  /* put a point exactly on every corner, in the slot whose angle is closest */
  const taken=new Set();
  for(let e=0;e<n;e++){
    const p=pts[e];
    let a=Math.atan2(p[1],p[0]); if(a<0) a+=Math.PI*2;
    let k=Math.round((a/(Math.PI*2))*N)%N;
    /* nearest free slot, walking outward, so a crowded corner still lands */
    for(let d=0; d<N; d++){
      const c=(k+(d%2?-((d+1)>>1):((d+1)>>1))+N)%N;
      if(!taken.has(c)){ taken.add(c); out[c]=[p[0],p[1]]; break; }
    }
  }
  return out;
}
/* 48, not 24: the corner snap above needs more slots than the shape has
   vertices or the arms start stealing each other's, and the plus has twelve.
   Doubling the ring is cheap next to a chamfered cap. */
const RADIAL_SECTION_N=48;
const radialSection=shape=>radialResampleSection(radialCrossSection(shape),RADIAL_SECTION_N);

/* A generalized prism: M-gon cross-section extruded from origin to
   origin+dir*len. verts[0..M-1] is the base ring, verts[M..2M-1] the tip
   ring, in matching perimeter order — replaces the old fixed 8-vertex
   rectangular beam now that the cap can be any of the section shapes. */
function radialBuildBeam(origin,dir,half,len,rough,section,rng){
  const ref=Math.abs(dir[1])<0.9 ? [0,1,0] : [1,0,0];
  const u=rvnorm(rvcross(dir,ref)), v=rvnorm(rvcross(dir,u));
  const tip=rvadd(origin,rvscale(dir,len));
  const M=section.length;
  const jit=(rough||0)*half*1.2;
  const jitter=p=> jit<=0 ? p : [p[0]+(rng()-0.5)*2*jit, p[1]+(rng()-0.5)*2*jit, p[2]+(rng()-0.5)*2*jit];
  const ring=center=>section.map(([cu,cv])=>
    jitter(rvadd(center,rvadd(rvscale(u,cu*half),rvscale(v,cv*half)))));
  const baseRing=ring(origin), tipRing=ring(tip);
  const verts=baseRing.concat(tipRing);
  const faces=[];
  const capIdx=[]; for(let k=0;k<M;k++) capIdx.push(M+k);
  faces.push({idx:capIdx,tag:'cap'});
  const backIdx=[]; for(let k=M-1;k>=0;k--) backIdx.push(k);
  faces.push({idx:backIdx,tag:'capBack'});
  for(let k=0;k<M;k++){ const nk=(k+1)%M; faces.push({idx:[k,nk,M+nk,M+k],tag:'side'}); }
  return {verts,faces,tip};
}

/* The per-beam 3D layout — origin, aim direction, length — as a function of
   the shape ONLY (via its own seed, see radialSeedFromShape). Deliberately
   independent of the sheet's pixel size: the camera's EYE position doesn't
   depend on cam.w/cam.h (only the later PROJECTION step does), so this can
   be computed once per shape and reused however the box is sized or
   positioned — which is exactly what the morph needs, since it has to
   compare two shapes' layouts frame by frame without re-measuring the box
   each time. */
function radialBeamSpecs(shape){
  const P=RADIAL;
  const rng=radialRng((radialSeedFromShape(shape)|0)*2654435761>>>0);
  const cam=radialCamera(P.elevation,5.2,P.fov,1,1);   // w/h unused by eye/dir maths
  const S=2.4, N=P.beamCount, innerR=P.innerRadius*S;
  const specs=[];
  for(let i=0;i<N;i++){
    const ang=(i/N)*Math.PI*2 + rng()*0.12;
    const r=innerR*(1+(rng()-0.5)*0.12);
    const ecc=P.spiralTurns;
    const ox=Math.cos(ang)*r*ecc, oy=Math.sin(ang)*r/ecc;
    const dz=(rng()-0.5)*2*P.depthJitter*0.5*S;
    const origin=[ox,oy,dz];
    const radial=rvnorm([ox,oy,0.0001]);
    const towardCam=rvnorm(rvsub(cam.eye,origin));
    const outwardBias=1-P.towardBias;
    const dir=rvnorm(rvadd(rvscale(radial,outwardBias),rvscale(towardCam,P.towardBias)));
    const lvar=1+(rng()-0.5)*2*P.lengthVariance;
    const len=P.beamLength*S*lvar;
    specs.push({origin,dir,len});
  }
  return specs;
}
const radialHalfFor=shape=>RADIAL.beamThickness*2.4*0.5*radialThicknessScale(shape);
/* Build, project, depth-sort and fit-to-box a set of beam specs — the part
   buildRadialBeams and the morph's per-frame step both need, factored out so
   a morph frame is exactly one call of this with interpolated inputs rather
   than a second copy of the projector. */
function radialAssemble(specs,section,half,tw,th){
  const P=RADIAL;
  const cam=radialCamera(P.elevation,5.2,P.fov,tw,th);
  const beams=[];
  specs.forEach((spec,i)=>{
    const beam=radialBuildBeam(spec.origin,spec.dir,half,spec.len,0,section,null);
    const proj=beam.verts.map(p=>radialProject(cam,radialToView(cam,p),P.zoom));
    const tipView=radialToView(cam,beam.tip);
    beams.push({beam,proj,depth:tipView[2],bi:i});
  });
  beams.sort((a,b)=>b.depth-a.depth);   // painter's algorithm: far first
  /* RE-CENTRE (Karin, 30 Aug: "should always be centred in the poster
     itself"). Each shape rolls its OWN seed, so the random per-beam
     angle/radius jitter lands the cluster's actual visual mass off-centre by
     a different amount for each one — the maths places every beam's ORIGIN
     symmetrically about (tw/2,th/2), but jitter and perspective don't
     project back to a symmetric silhouette. Measure the true bounding box of
     everything actually drawn and shift the whole figure so ITS centre, not
     the origin's, lands on the box's centre. */
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const b of beams) for(const p of b.proj){
    if(!p) continue;
    if(p[0]<minX) minX=p[0]; if(p[0]>maxX) maxX=p[0];
    if(p[1]<minY) minY=p[1]; if(p[1]>maxY) maxY=p[1];
  }
  /* FILL THE BOX (Karin, 30 Aug, marked up with red bounds: "every shape
     should reach these edges"). Same root cause as the centring above —
     each shape's own seed rolls a different actual reach, so a shared
     beamLength left some shapes short of the box width. Scaled — not just
     shifted — so whichever shape is showing fills the same span. 0.90, not
     1.0: the wobbly edge jitter must never tip a beam past the line on its
     own, and Karin took a further 7% off the top of that on top (30 Aug:
     "shrink the element a bit") once she saw it actually reaching the box. */
  const ccx=(minX<maxX) ? (minX+maxX)/2 : tw/2;
  const ccy=(minY<maxY) ? (minY+maxY)/2 : th/2;
  const spanW=(maxX>minX) ? (maxX-minX) : tw;
  const scale=spanW>0 ? Math.min(2.2, (tw*0.90)/spanW) : 1;
  const dx=tw/2-scale*ccx, dy=th/2-scale*ccy;
  return {beams,cam,dx,dy,scale};
}
/* the box position/size in sheet pixels, read the same way by the static
   build and every morph frame — Karin-only override, see
   posterDevOverrides() in 00-core.js: radialScale grows/shrinks the fitted
   box AROUND its own centre, radialY then shifts the result up or down. */
function radialBox(B){
  const P=RADIAL, dev=posterDevOverrides();
  const baseCx=P.rx+P.rw/2, baseCy=P.ry+P.rh/2;
  const rw=P.rw*dev.radialScale, rh=P.rh*dev.radialScale;
  const rx=baseCx-rw/2, ry=baseCy-rh/2+dev.radialY;
  return {tx:rx*B.w, ty:ry*B.h, tw:rw*B.w, th:rh*B.h};
}
/* COMPUTE + EMIT split the same way snakeBeads/snakeEmit are: buildRadialBeams
   does the 3D work and returns plain data, radialEmit turns that data into
   markup. The answer changing is glided now (see startRadialMorph below),
   same as the node and the rings — this just builds the SETTLED, static
   frame either end of that glide sits on. */
function buildRadialBeams(B){
  const shape=radialShapeFromAnswers();
  const {tx,ty,tw,th}=radialBox(B);
  const SC=tw/800;   // strokeWidth/misregistration were tuned at ~800px wide
  const specs=radialBeamSpecs(shape);
  const section=radialSection(shape);
  const half=radialHalfFor(shape);
  const asm=radialAssemble(specs,section,half,tw,th);
  return {beams:asm.beams,cam:asm.cam,tx,ty,dx:asm.dx,dy:asm.dy,scale:asm.scale,SC,shape};
}
function radialEmit(built){
  if(!built || !built.beams.length) return '';
  const {beams,cam,tx,ty,dx,dy,scale,SC,shape}=built;
  const P=RADIAL, sw=P.strokeWidth*SC, mis=P.misregistration*SC;
  const f=n=>n.toFixed(1);
  /* SILHOUETTE-ONLY STROKING IS UNIVERSAL NOW (Karin, 30 Aug bug: "A reunion"
     came out hatched, alternating fill/stroke stripes down every beam).
     Every shape resamples to the SAME 24-point section for the morph (see
     radialSection) — including star, diamond, triangle and square, whose
     "real" corners are now just a few of those 24 points, the rest sitting
     collinear along what used to be a single straight edge. Stroking each
     of the 24 tiny side quads on its own drew that edge's outline 24 times
     over in slightly different jittered positions — the stripes. Only the
     TRUE outer silhouette was ever meant to show, at any point count, which
     is exactly what the circle/plus/teardrop path below already computes —
     so every shape takes it now; there is no longer a separate per-facet
     stroke pass to disagree with it. */
  /* translate to the box's sheet position, THEN re-centre/scale-to-fill in
     the box's own local space — see the fill/centre maths in
     buildRadialBeams for dx,dy,scale. */
  let out='<g transform="translate('+f(tx)+' '+f(ty)+') translate('+f(dx)+' '+f(dy)+') scale('+scale.toFixed(4)+')">';
  for(const b of beams){
    const Pj=b.proj;
    const drawFaces=[];
    const faces=b.beam.faces;
    for(let fi=0;fi<faces.length;fi++){
      const face=faces[fi];
      const pts=face.idx.map(k=>Pj[k]);
      if(pts.some(p=>p===null)) continue;
      let area=0;
      for(let k=0;k<pts.length;k++){
        const p1=pts[k], p2=pts[(k+1)%pts.length];
        area+=p1[0]*p2[1]-p2[0]*p1[1];
      }
      if(area>=0) continue;   // backface
      let zsum=0;
      for(const k of face.idx) zsum+=radialToView(cam,b.beam.verts[k])[2];
      drawFaces.push({face,pts,z:zsum/face.idx.length,wkey:(b.bi*17+fi*101)>>>0});
    }
    drawFaces.sort((a,c)=>c.z-a.z);
    for(const df of drawFaces){
      const pts2=df.pts.map(p=>[p[0],p[1]]);
      const isCap=df.face.tag==='cap';
      const inkDx=isCap?mis:0, inkDy=isCap?-mis*0.6:0;
      const fillPts=pts2.map(p=>[p[0]+inkDx,p[1]+inkDy]);
      out+='<path d="'+radialWobblyPath(fillPts,P.edgeJitter,df.wkey)+'" fill="'+(isCap?P.faceColor:P.sideColor)+'"/>';
      /* side faces skip their own stroke here — only the silhouette contours
         + one centre seam, drawn once below, for every shape (see the note
         above radialEmit's opening) */
      const suppressStroke=df.face.tag==='side';
      if(sw>0 && !suppressStroke){
        const strokePts=pts2.map(p=>[p[0]-mis*0.5,p[1]+mis*0.35]);
        out+='<path d="'+radialWobblyPath(strokePts,P.edgeJitter,df.wkey)+'" fill="none" stroke="'+P.strokeColor+'" stroke-width="'+sw.toFixed(2)+'" stroke-linejoin="round"/>';
      }
    }
    /* ---- beam body: silhouette contours + single centre seam ---- */
    if(sw>0){
      const M=b.beam.faces.length-2;      // side faces / longitudinal edges
      const front=new Array(M).fill(false);
      for(let k=0;k<M;k++){
        const face=b.beam.faces[2+k];
        const fp=face.idx.map(idx=>Pj[idx]);
        if(fp.some(p=>p===null)) continue;
        let area=0;
        for(let j=0;j<fp.length;j++){
          const p1=fp[j], p2=fp[(j+1)%fp.length];
          area+=p1[0]*p2[1]-p2[0]*p1[1];
        }
        front[k]=area<0;
      }
      const edgeZ=new Array(M).fill(Infinity);
      for(let j=0;j<M;j++){
        const va=radialToView(cam,b.beam.verts[j]), vb=radialToView(cam,b.beam.verts[M+j]);
        edgeZ[j]=(va[2]+vb[2])*0.5;
      }
      let seamCandidate=-1, seamZ=Infinity;
      const silEdges=[];
      for(let j=0;j<M;j++){
        const a=Pj[j], bb=Pj[M+j];
        const prevF=front[(j-1+M)%M], curF=front[j];
        if(a && bb && prevF!==curF) silEdges.push({j,a,bb});
        if(prevF && curF && edgeZ[j]<seamZ){ seamZ=edgeZ[j]; seamCandidate=j; }
      }
      /* the concave Plus/Cross section keeps only its two outermost
         lengthwise rails, or the inner-notch silhouette edges would read as
         internal lines; circle and teardrop keep their full set */
      let edgesToDraw=silEdges;
      if(shape==='plus' && silEdges.length>2){
        let bcx=0,bcy=0,tcx=0,tcy=0,cnt=0;
        for(let k=0;k<M;k++){
          if(Pj[k] && Pj[M+k]){ bcx+=Pj[k][0]; bcy+=Pj[k][1]; tcx+=Pj[M+k][0]; tcy+=Pj[M+k][1]; cnt++; }
        }
        if(cnt>0){ bcx/=cnt; bcy/=cnt; tcx/=cnt; tcy/=cnt; }
        const ax=tcx-bcx, ay=tcy-bcy, al=Math.hypot(ax,ay)||1;
        const px=-ay/al, py=ax/al;
        let mn=Infinity, mx=-Infinity, mnE=null, mxE=null;
        for(const e of silEdges){
          const midx=(e.a[0]+e.bb[0])*0.5, midy=(e.a[1]+e.bb[1])*0.5;
          const co=midx*px+midy*py;
          if(co<mn){ mn=co; mnE=e; }
          if(co>mx){ mx=co; mxE=e; }
        }
        edgesToDraw=[mnE,mxE].filter(Boolean);
      }
      out+='<g fill="none" stroke="'+P.strokeColor+'" stroke-width="'+sw.toFixed(2)+'" stroke-linejoin="round" stroke-linecap="round" transform="translate('+(-mis*0.5).toFixed(1)+' '+(mis*0.35).toFixed(1)+')">';
      for(const e of edgesToDraw){
        out+='<path d="'+radialWobblyLine(e.a,e.bb,P.edgeJitter,(b.bi*131+e.j*977)>>>0)+'"/>';
      }
      if(seamCandidate>=0){
        const a=Pj[seamCandidate], bb=Pj[M+seamCandidate];
        if(a && bb) out+='<path d="'+radialWobblyLine(a,bb,P.edgeJitter,(b.bi*131+seamCandidate*977+7)>>>0)+'"/>';
      }
      out+='</g>';
    }
  }
  return out+'</g>';
}
function radialBlockMarkup(B,C){
  return radialEmit(buildRadialBeams(B));
}

/* =====================================================================
   THE MORPH — a wish changing shape glides, the way the node's rays and the
   memory rings already do (see js/app/54-draw.js), rather than cutting or
   fading straight to the new cap. Each of the 27 beams keeps its own index
   across the change, so beam #6 in the old shape eases into beam #6's new
   origin/aim/length while its CAP outline eases, point for point, from the
   old shape's resampled section to the new one's (see radialSection — every
   shape shares the same N points, spaced by angle, precisely so this lerp
   never has to reconcile two different vertex counts).

   A SNAPSHOT is {specs, section, half, styleShape}: everything radialAssemble
   needs, either settled on one shape or a live in-between blend. `styleShape`
   is only for radialEmit's isCyl/plus-rail branching, which doesn't have a
   sensible "halfway" rendering of its own — it just switches once, at the
   midpoint, rather than trying to blend two different stroke strategies. */
function radialSnapshotFor(shape){
  return {specs:radialBeamSpecs(shape), section:radialSection(shape), half:radialHalfFor(shape), styleShape:shape};
}
let radialState=null, radialLive=null, radialRAF=0;
function cancelRadialMorph(){ if(radialRAF){ cancelAnimationFrame(radialRAF); radialRAF=0; } }
function startRadialMorph(g, fromSnap, toShape){
  cancelRadialMorph();
  g.classList.remove('enter');
  const toSnap=radialSnapshotFor(toShape);
  const n=Math.min(fromSnap.specs.length, toSnap.specs.length);   // both are RADIAL.beamCount; equal unless that config changed mid-session
  const lerp3=(a,b,e)=>[a[0]+(b[0]-a[0])*e, a[1]+(b[1]-a[1])*e, a[2]+(b[2]-a[2])*e];
  const dur=760, ease=t=>1-Math.pow(1-t,3), t0=performance.now();   // easeOutCubic (matches the CSS --eo), a shade slower than the node's 520 — more is moving at once
  const step=(now)=>{
    if(!g.isConnected){ radialRAF=0; return; }
    let p=(now-t0)/dur; if(p>1)p=1; const e=ease(p);
    const specs=[];
    for(let i=0;i<n;i++){
      const a=fromSnap.specs[i], b=toSnap.specs[i];
      specs.push({origin:lerp3(a.origin,b.origin,e), dir:rvnorm(lerp3(a.dir,b.dir,e)), len:a.len+(b.len-a.len)*e});
    }
    const section=fromSnap.section.map((pt,i)=>{
      const q=toSnap.section[i];
      return [pt[0]+(q[0]-pt[0])*e, pt[1]+(q[1]-pt[1])*e];
    });
    const half=fromSnap.half+(toSnap.half-fromSnap.half)*e;
    const B=box(), {tx,ty,tw,th}=radialBox(B), SC=tw/800;
    const asm=radialAssemble(specs,section,half,tw,th);
    const live={specs,section,half,styleShape:e<0.5?fromSnap.styleShape:toSnap.styleShape};
    radialLive=live;
    g.innerHTML=inkedMarkup(radialEmit({beams:asm.beams,cam:asm.cam,tx,ty,dx:asm.dx,dy:asm.dy,scale:asm.scale,SC,shape:live.styleShape}));
    if(p<1){ radialRAF=requestAnimationFrame(step); }
    else { radialRAF=0; radialLive=toSnap; addHitRects(plys[livePly]); }
  };
  step(t0);   // render frame 0 (the old shape) synchronously, so the new static shape never flashes first
}
function syncRadial(){
  const g=plys[livePly].querySelector('.hl[data-q="febdays"]');
  if(!g){ cancelRadialMorph(); radialState=radialLive=null; return; }
  const shape=radialShapeFromAnswers();
  const prev=radialState;
  radialState=shape;
  if(!prev || g.classList.contains('enter')){ radialLive=radialSnapshotFor(shape); return; }   // first appearance / entrance owns it
  if(prev===shape){ if(!radialRAF) radialLive=radialSnapshotFor(shape); return; }   // unchanged (a re-roll, a format morph) -> no glide, and don't interrupt one already running toward it
  const fromSnap=radialRAF ? radialLive : radialSnapshotFor(prev);   // interrupt a running morph from its current on-screen blend
  if(reduceMotion()){ cancelRadialMorph(); radialLive=radialSnapshotFor(shape); return; }
  startRadialMorph(g, fromSnap, shape);
}
