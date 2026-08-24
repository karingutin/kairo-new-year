/* =====================================================================
   THE ROLL — one randomisable control per tool, alongside the answer.

   Each of the three tools has exactly one control the ANSWER moves (month's
   letterforms, the node's ray count, the beams' beam count). This is the
   second control on each: one the answer does NOT move, re-rolled on demand
   from the card so the same answer can wear a different arrangement.

   Deliberately not an answer, and deliberately not part of the response's
   `answers`: nobody chose it and it means nothing about the person. It is
   recorded separately, under `rolls`, because without it the poster cannot be
   rebuilt from the record.

   Every entry names the tool constant it stands in for, so the frozen default
   is never written twice. Ranges are chosen to stay inside what the tool
   still draws well — a falloff of 0 floods the sheet with scatter and a very
   high one strips it bare, so neither end is reachable.

   Lives here rather than beside the wiring at the top because it reads the
   three tools' own constants, and all three have to exist first. */
const ROLLS={
  month:{
    label:'Scatter falloff',
    base:MONTHL.scatterFalloff,
    /* How fast the loose circles thin out away from the type — low scatters
       them across the sheet, high pulls them tight against the letterforms.
       The range runs well past the tool's 0.7 default on purpose: measured on
       the sheet, everything from 0.1 to 1.0 lands within ~7% of the same
       spread (median distance 535 -> 496 units), so a range that stopped at
       1.6 would have made half the rolls indistinguishable. It bites from
       about 2 upward — 4.5 pulls the median in to ~340. */
    roll:r=>Math.round((0.3+r()*4.2)*100)/100,
    show:v=>v.toFixed(2)
  },
  alarms:{
    label:'Layout seed',
    base:NODE.seed,
    /* the ray angles and the hand-drawn wobble, not how many rays there are */
    roll:r=>1+Math.floor(r()*9999),
    show:v=>String(v)
  },
  happiness:{
    label:'Random seed',
    base:BEAMS.seed,
    /* the whole ring's arrangement — lean, length and depth of every beam —
       while the count stays the answer's */
    roll:r=>1+Math.floor(r()*9999),
    show:v=>String(v)
  },
  vacations:{
    label:'Lean',
    /* degrees. The preset's offsetVector is a unit vector on the x axis — a lean
       of 0°, straight right — and the ring stack reads it as the direction its
       rings pack toward, which is also where they all sit tangent and where a new
       ring is born. Rolling it swings that tangent point along the outer ring, so
       the range is a NARROW arc: past ~±20° the point walks off the middle-right
       and the block stops reading as a stack budding out of the corner. */
    base:0,
    roll:r=>Math.round(-20+r()*40),        // -20..20
    show:v=>String(v)+'°'
  }
};
/* The rolled value if one has been rolled, otherwise the tool's own default.
   Every tool reads its randomisable control through this and nowhere else. */
const rolled=id=>S.rolls[id]!==undefined ? S.rolls[id] : ROLLS[id].base;
/* Math.random, not the session seed: this is a deliberate act by the person
   in front of the poster, repeated until they like what they see. Seeding it
   would make the second press give the same thing as the first. */
function rollFor(id){
  S.rolls[id]=ROLLS[id].roll(Math.random);
  return S.rolls[id];
}

/* The tool's PRNG is a plain LCG, not the mulberry32 used elsewhere in this
   file. Kept exactly as written: the beam ring's whole arrangement comes out
   of this sequence, so a different generator would give a different sculpture. */
function beamRng(seed){
  let s=seed>>>0;
  return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
}
function beamHash(a,b){
  let h=(a*374761393+b*668265263)>>>0;
  h=(h^(h>>>13))>>>0; h=(h*1274126177)>>>0;
  return ((h^(h>>>16))>>>0)/4294967296;
}

/* Subdivide each edge and push interior points sideways, so the cut edges read
   as sawn rather than machine-straight. Endpoints never move, so faces that
   share a corner still meet there. Returns points; the caller offsets them for
   the misregistration rather than re-wobbling. */
function beamWobble(pts,amt,key,K){
  if(amt<=0.0001) return pts;
  const out=[], n=pts.length;
  for(let e=0;e<n;e++){
    const p1=pts[e], p2=pts[(e+1)%n];
    const dx=p2[0]-p1[0], dy=p2[1]-p1[1];
    const len=Math.hypot(dx,dy)||1e-6;
    const nx=-dy/len, ny=dx/len;
    const segs=Math.max(3,Math.min(10,Math.round(len/(26*K))));
    const amp=amt*Math.min(14*K, 3*K+len*0.05);
    for(let s=0;s<segs;s++){
      const t=s/segs;
      let px=p1[0]+dx*t, py=p1[1]+dy*t;
      if(s>0){
        const env=Math.sin(Math.PI*t);                 // 0 at corners, 1 mid-edge
        const r=(beamHash(key+e*131, s*977)-0.5)*2;
        px+=nx*r*amp*env; py+=ny*r*amp*env;
      }
      out.push([px,py]);
    }
  }
  return out;
}

const v3sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const v3add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const v3mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const v3dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const v3cross=(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const v3norm=a=>{const l=Math.sqrt(v3dot(a,a))||1e-9; return [a[0]/l,a[1]/l,a[2]/l];};

/* faces as vertex-index quads: 0-3 base ring, 4-7 tip ring */
const BEAM_FACES=[
  {idx:[4,5,6,7], cap:true},          // tip, the end facing the camera
  {idx:[0,3,2,1], cap:false},         // base
  {idx:[0,1,5,4], cap:false},
  {idx:[1,2,6,5], cap:false},
  {idx:[2,3,7,6], cap:false},
  {idx:[3,0,4,7], cap:false}
];

function beamsMarkup(B){
  const W=B.w, H=B.h, K=W/BEAMS.pxRef;
  const rng=beamRng(((rolled('happiness')|0)*2654435761)>>>0);
  const S3=BEAMS.worldScale, half=BEAMS.thickness*S3*0.5;
  const mis=BEAMS.misreg*K;

  /* camera on +Z, raised in Y, looking at the origin */
  const eye=[0,BEAMS.elevation,BEAMS.dist];
  const fwd=v3norm(v3sub([0,0,0],eye));
  const right=v3norm(v3cross(fwd,[0,1,0]));
  const camUp=v3cross(right,fwd);
  const fl=1/Math.tan((BEAMS.fov*Math.PI/180)/2);
  /* both axes scale by the SHORT side, as the tool does — that is what keeps
     the ring circular on a 7:10 sheet instead of stretching it to the format */
  const pscale=Math.min(W,H)*0.5*BEAMS.zoom;
  const toView=p=>{const d=v3sub(p,eye); return [v3dot(d,right),v3dot(d,camUp),v3dot(d,fwd)];};
  const project=v=>{
    if(v[2]<=0.02) return null;                        // behind the camera
    return [W/2+(v[0]/v[2])*fl*pscale, H/2-(v[1]/v[2])*fl*pscale, v[2]];
  };

  const built=[];
  const N=beamCountFromAnswers(), innerR=BEAMS.innerRadius*S3;
  for(let i=0;i<N;i++){
    const ang=(i/N)*Math.PI*2+rng()*0.12;              // closed ring, first meets last
    const r=innerR*(1+(rng()-0.5)*0.12);
    const ox=Math.cos(ang)*r*BEAMS.ellipse, oy=Math.sin(ang)*r/BEAMS.ellipse;
    const oz=(rng()-0.5)*2*BEAMS.depthJitter*0.5*S3;
    const origin=[ox,oy,oz];
    /* each beam leans between straight out from the ring and straight at the
       viewer; towardBias is what makes them crowd the camera */
    const radial=v3norm([ox,oy,0.0001]);
    const toward=v3norm(v3sub(eye,origin));
    const dir=v3norm(v3add(v3mul(radial,1-BEAMS.towardBias), v3mul(toward,BEAMS.towardBias)));
    const len=BEAMS.length*S3*(1+(rng()-0.5)*2*BEAMS.lengthVariance);

    /* box the beam: a square cross-section carried from base to tip */
    let ref=Math.abs(dir[1])<0.9?[0,1,0]:[1,0,0];
    const u=v3norm(v3cross(dir,ref)), v=v3norm(v3cross(dir,u));
    const tip=v3add(origin,v3mul(dir,len));
    const jit=BEAMS.handCut*half*1.2;
    const nudge=p=>jit<=0?p:[p[0]+(rng()-0.5)*2*jit, p[1]+(rng()-0.5)*2*jit, p[2]+(rng()-0.5)*2*jit];
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
    const verts=[];
    for(const [cu,cv] of corners) verts.push(nudge(v3add(origin, v3add(v3mul(u,cu*half), v3mul(v,cv*half)))));
    for(const [cu,cv] of corners) verts.push(nudge(v3add(tip,    v3add(v3mul(u,cu*half), v3mul(v,cv*half)))));

    built.push({verts, proj:verts.map(p=>project(toView(p))), depth:toView(tip)[2], bi:i});
  }
  built.sort((a,b)=>b.depth-a.depth);                  // painter's: far first

  let out='';
  let lo=[Infinity,Infinity], hi=[-Infinity,-Infinity];   // the ring's own bounds
  for(const b of built){
    const faces=[];
    for(let fi=0;fi<BEAM_FACES.length;fi++){
      const F2=BEAM_FACES[fi];
      const pts=F2.idx.map(k=>b.proj[k]);
      if(pts.some(p=>p===null)) continue;
      /* backface cull by screen winding — front faces wind negative because y
         is down. Same test the tool uses, so the same faces survive. */
      let area=0;
      for(let k=0;k<pts.length;k++){
        const p1=pts[k], p2=pts[(k+1)%pts.length];
        area+=p1[0]*p2[1]-p2[0]*p1[1];
      }
      if(area>=0) continue;
      let z=0; for(const k of F2.idx) z+=toView(b.verts[k])[2];
      faces.push({F2, pts, z:z/4, key:(b.bi*17+fi*101)>>>0});
    }
    faces.sort((a,c)=>c.z-a.z);                        // cap ends up over its sides

    for(const df of faces){
      const w=beamWobble(df.pts, BEAMS.edgeJitter, df.key, K);
      /* the ink plates sit off the base, the way a two-colour press drifts:
         caps push one way, every stroke the other */
      const fdx=df.F2.cap?mis:0, fdy=df.F2.cap?-mis*0.6:0;
      const at=(dx,dy)=>w.map(p=>{
        const x=p[0]+dx, y=p[1]+dy;
        if(x<lo[0])lo[0]=x; if(x>hi[0])hi[0]=x;
        if(y<lo[1])lo[1]=y; if(y>hi[1])hi[1]=y;
        return x.toFixed(1)+','+y.toFixed(1);
      }).join(' ');
      out+='<polygon points="'+at(fdx,fdy)+'" fill="'+(df.F2.cap?BEAMS.cap:BEAMS.side)+'"/>';
      out+='<polygon points="'+at(-mis*0.5,mis*0.35)+'" fill="none" stroke="'+BEAMS.stroke
         + '" stroke-width="'+(BEAMS.strokeWidth*K).toFixed(2)+'" stroke-linejoin="round"/>';
    }
  }
  if(!out) return '';

  /* Frame the finished ring: centre it on the sheet and shrink it if it is
     wider or taller than the sheet allows. Never enlarge — if the tool's own
     projection already fits, it is left exactly as it came out. Applied as one
     transform on the group, so the 3D result and the ink offsets inside it are
     untouched and the strokes scale with everything else. */
  const spanX=hi[0]-lo[0], spanY=hi[1]-lo[1];
  const s=Math.min(1, (BEAMS.fit*W)/spanX, (BEAMS.fit*H)/spanY);
  const tx=W/2-((lo[0]+hi[0])/2)*s, ty=H/2-((lo[1]+hi[1])/2)*s;
  return '<g transform="translate('+tx.toFixed(2)+','+ty.toFixed(2)+') scale('+s.toFixed(4)+')">'
       + out + '</g>';
}

