/* =====================================================================
   THE MONTH LAYER — the shape between the grid and the node.

   Ported from the Brik canvas tool (tool-uuid 7d85714d). The tool sets the
   chosen month's temperature in type, rasterises it to an offscreen mask,
   packs circles inside the letterforms, adds a scatter of circles outside
   them, and draws the boolean UNION of all of it — outer contour only.

   Two halves, and only one of them can leave canvas:
     - WHERE the circles go is a pixel question. It needs a rasterised mask of
       the glyphs to test inside/outside and to find edges, so that part still
       runs on an OffscreenCanvas exactly as the tool does. Same seed, same
       order, same numbers — the placement is identical to the tool's.
     - HOW they are drawn is not. The tool fills every circle then erases each
       one at r-strokePx, so only the union's outer hairline survives. In SVG
       that is a mask: keep everything, punch out the inner discs. Same result,
       but as real vector, which is what the print export needs.

   Everything the tool ships with is frozen except two: monthPreset, which is
   the answer, and scatterFalloff, which is the roll (see ROLLS — the value
   below is its default, and the layer reads it through rolled('month')).
   `overlap` is in the tool's control set but its code never reads it, so it
   is not reproduced here.
   ===================================================================== */
const MONTHL={
  seed:80, lineHeight:0.74, maxChars:8,
  density:3100, rMin:40, rMax:48, edgeBias:0.60,
  scatterCount:250, scatterMinR:13, scatterMaxR:43, scatterFalloff:0.7,
  strokeWidth:1.7, ink:'#004CFF',
  rRef:2000,                    // the tool measures every radius against this
  /* How much of the sheet the type may take. Deliberately well inside the
     tool's own 0.94 measure: the circles bulge up to rMax BEYOND the
     letterforms, and the four lines set solid at 0.74 leading overrun the
     nominal stack height, so fitting the type to the full measure pushed the
     top and bottom rows past the sheet edge and cropped them. Backing off to
     ~0.7 leaves the whole silhouette inside the trim with the scatter free to
     drift into the margin, which is the composition the reference shows. */
  measure:0.72,
  fitHeight:0.70,
  family:'ThermoTrial-Zero', fallback:'Georgia,serif'
};

/* =====================================================================
   THE GROWTH — how the month layer arrives.

   Picking a month does not cut straight to the finished silhouette. The layer
   is built eight times over, with the circles' MINIMUM radius climbing the
   ladder below: small circles have to follow the letterforms to fit, so the
   first frame is the temperature actually legible as type, and each frame
   after it swells until the forms merge into the silhouette the poster keeps.
   The last rung IS MONTHL.rMin, so the animation ends exactly where a static
   build would have started — nothing about the finished poster changes.

   Stepped, not tweened, and that is not a shortcut: one frame costs a full
   rasterise-and-repack of ~3,350 circles plus a ~400KB innerHTML swap, so a
   per-frame interpolation would run at about 10fps whatever the intent. It
   also happens to be the language the opening screen already speaks — whole
   cells, hard cuts, one clock.

   BEAT. The build is not free, so the wait between frames is what is LEFT of
   the beat after the frame was built, not the beat on top of it. Otherwise the
   growth would drift out to nearly twice its intended length on a slow frame.
   ===================================================================== */
const MONTH_GROW={
  /* ends on MONTHL.rMin — see the assertion in startMonthGrow */
  steps:[8,12,17,21,26,31,35,40],
  beat:90                                    // ms per rung, build time included
};
let monthGrow={i:-1, t:0};                   // i<0: not growing, use the real rMin
/* The only reader of the ladder. Everything else in the tool goes on reading
   MONTHL.rMin, which is where the ladder ends. */
const monthRMin=()=>monthGrow.i>=0 ? MONTH_GROW.steps[monthGrow.i] : MONTHL.rMin;
const reduceMotion=()=>window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function stopMonthGrow(){
  clearTimeout(monthGrow.t); monthGrow.t=0; monthGrow.i=-1;
}
/* Called on every month press, including a re-press of the same month: the
   growth is the answer being given, not the answer being different. A press
   mid-growth abandons the run in progress and starts over from the first rung,
   so the layer can never be left parked on an intermediate radius. */
function startMonthGrow(){
  /* The ladder has to land on the static value, or the poster the person keeps
     would differ from the one every other path builds. Cheap to check, and it
     fails loudly rather than shipping a poster nobody can reproduce. */
  const last=MONTH_GROW.steps[MONTH_GROW.steps.length-1];
  if(last!==MONTHL.rMin){
    console.warn('MONTH_GROW ends at '+last+' but MONTHL.rMin is '+MONTHL.rMin
                +' — the growth would settle on the wrong silhouette.');
  }
  stopMonthGrow();
  if(reduceMotion()){ drawNow(); return; }   // one cut, straight to the end
  monthGrow.i=0;
  runMonthGrow();
}
function runMonthGrow(){
  const t0=performance.now();
  drawNow();                                 // builds and paints this rung
  const spent=performance.now()-t0;
  if(monthGrow.i>=MONTH_GROW.steps.length-1){ monthGrow.i=-1; return; }
  monthGrow.t=setTimeout(()=>{ monthGrow.i++; runMonthGrow(); },
                         Math.max(0, MONTH_GROW.beat-spent));
}

/* The font has to be RESOLVED before the mask can be rasterised, but buildSVG
   is synchronous and paint() may run before any font has arrived. So the layer
   reports "not ready" and asks for one redraw when the font lands, rather than
   blocking or silently baking in a fallback that would then never be corrected. */
let monthFontState='idle';                    // idle | loading | ready
function ensureMonthFont(){
  if(monthFontState!=='idle') return;
  monthFontState='loading';
  const done=()=>{ monthFontState='ready'; monthCache={key:'',markup:''}; drawNow(); };
  if(!document.fonts||!document.fonts.load){ done(); return; }
  /* Resolve either way: a failed fetch falls through to the serif fallback and
     still draws, rather than leaving the layer permanently blank. */
  document.fonts.load('400 100px "'+MONTHL.family+'"').then(done,done);
}

/* Split the temperature string the way the tool does: never break a word, pair
   two only when together they still fit maxChars. For every month in the table
   this yields the four repeats on four lines. */
function monthLines(text){
  const words=text.replace(/\n/g,' ').split(/\s+/).filter(Boolean);
  const lines=[]; let cur='', n=0;
  const flush=()=>{ if(cur){ lines.push(cur); cur=''; n=0; } };
  for(const w of words){
    if(cur===''){ cur=w; n=1; }
    else if(n<2 && (cur.length+1+w.length)<=MONTHL.maxChars){ cur=cur+' '+w; n++; }
    else { flush(); cur=w; n=1; }
  }
  flush();
  return lines.length?lines:[''];
}

/* Rasterise the month's type into an alpha mask. Returns the ImageData plus the
   canvas dimensions the circle packer samples against. */
function monthMask(B,text){
  const W=Math.round(B.w), H=Math.round(B.h);
  const oc = (typeof OffscreenCanvas!=='undefined')
    ? new OffscreenCanvas(W,H)
    : Object.assign(document.createElement('canvas'),{width:W,height:H});
  const m=oc.getContext('2d',{willReadFrequently:true});
  m.fillStyle='#000'; m.fillRect(0,0,W,H);

  const lines=monthLines(text.toUpperCase());
  const maxW=W*MONTHL.measure;

  /* SIZE IS FITTED, not the tool's literal 238px. That number was tuned against
     the tool's own canvas, where it very nearly fills the width — which is the
     whole point, since the circles are scaled to W/2000 and only read as bumps
     ALONG the letterforms when the type is big enough to carry them. Reproduce
     238 verbatim on a 1050-unit sheet and the type lands at half measure while
     the circles stay the same size, so they merge across the strokes and the
     whole block collapses into one shapeless mass.
     So: grow the type until the widest line meets the measure, then clamp so
     the stack still fits the height. Probe at 100px and scale — that reads the
     real font, so it holds for the fallback face too. */
  const probe=100;
  m.font='normal 400 '+probe+'px "'+MONTHL.family+'",'+MONTHL.fallback;
  let widest=1;
  for(const line of lines) widest=Math.max(widest, m.measureText(line).width||1);
  const byWidth  = probe*maxW/widest;
  const byHeight = H*MONTHL.fitHeight/(lines.length*MONTHL.lineHeight);
  const size=Math.min(byWidth, byHeight);

  const step=size*MONTHL.lineHeight;
  const cx=W/2;
  let y=H/2-(step*lines.length)/2+step/2;

  m.fillStyle='#fff'; m.textBaseline='middle'; m.textAlign='center';
  const font='normal 400 '+size+'px "'+MONTHL.family+'",'+MONTHL.fallback;
  m.font=font;
  for(const line of lines){
    /* the tool's own condense pass, kept as the backstop it is: after the fit
       above it only ever engages when the height clamp won */
    const w=m.measureText(line).width||1;
    const sx=w>maxW?maxW/w:1;
    m.save(); m.translate(cx,y); m.scale(sx,1); m.fillText(line,0,0); m.restore();
    y+=step;
  }
  return {data:m.getImageData(0,0,W,H).data, W, H};
}

function monthCircles(B,text){
  const {data,W,H}=monthMask(B,text);
  const inside=(x,y)=>{
    x=x|0; y=y|0;
    if(x<0||y<0||x>=W||y>=H) return false;
    return data[(y*W+x)*4]>=128;                 // red channel; white type = inside
  };
  const isEdge=(x,y,s)=>inside(x,y) &&
    (!inside(x+s,y)||!inside(x-s,y)||!inside(x,y+s)||!inside(x,y-s));

  const rng=mulberry32((MONTHL.seed*2654435761)>>>0);
  const rScale=W/MONTHL.rRef;
  const rmin=monthRMin()*rScale, rmax=MONTHL.rMax*rScale;
  const strokePx=MONTHL.strokeWidth*rScale*1.4;

  /* one pass over the mask: bounds, edge points, and whether there is any type
     at all — a font that resolved to nothing would otherwise pack the void */
  const edge=[];
  let minX=W,minY=H,maxX=0,maxY=0,count=0;
  for(let y=0;y<H;y+=3) for(let x=0;x<W;x+=3){
    if(!inside(x,y)) continue;
    count++;
    if(x<minX)minX=x; if(x>maxX)maxX=x;
    if(y<minY)minY=y; if(y>maxY)maxY=y;
    if(isEdge(x,y,3)) edge.push(x,y);
  }
  if(!count) return null;

  const circles=[];
  const nEdge=edge.length/2, meanR=(rmin+rmax)/2;
  let tries=0;
  while(circles.length<MONTHL.density && tries<MONTHL.density*6){
    tries++;
    let px,py;
    if(nEdge>0 && rng()<MONTHL.edgeBias){
      const i=(rng()*nEdge)|0;                    // hug the silhouette, jittered
      px=edge[i*2]+(rng()-0.5)*meanR*0.8;
      py=edge[i*2+1]+(rng()-0.5)*meanR*0.8;
    } else {
      px=minX+rng()*(maxX-minX);                  // interior, by rejection
      py=minY+rng()*(maxY-minY);
    }
    if(!inside(px,py)) continue;                  // centre must be in the type;
    circles.push({x:px,y:py,r:rmin+rng()*(rmax-rmin)});   // bulging out is wanted
  }

  /* the scatter: circles OUTSIDE the type, thinning with distance from it and
     drifting left. They join the same union, so they read as bubbles breaking
     off the letterforms rather than as a separate layer of dots. */
  const smin=MONTHL.scatterMinR*rScale;
  let smax=MONTHL.scatterMaxR*rScale;
  if(smax<smin+1) smax=smin+1;
  const bcx=(minX+maxX)/2, bcy=(minY+maxY)/2;
  const brad=Math.max(Math.max(1,maxX-minX),Math.max(1,maxY-minY))*0.5;
  let placed=0, sTries=0;
  while(placed<MONTHL.scatterCount && sTries<MONTHL.scatterCount*40){
    sTries++;
    const sx=rng()*W, sy=rng()*H;
    if(inside(sx,sy)) continue;
    const dx=(sx-bcx)/brad, dy=(sy-bcy)/brad;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const keep=Math.pow(1/(1+dist),rolled('month'))*(sx<bcx?1:0.3);
    if(rng()>keep) continue;
    circles.push({x:sx,y:sy,r:smin+rng()*(smax-smin)});
    placed++;
  }
  return {circles,strokePx};
}

/* Regenerating means rasterising type and packing ~3,350 circles, so the built
   markup is cached. The key is everything that can change it: the month, the
   format, the ground the fill has to match, the rolled scatter falloff, and
   the rung of the growth ladder — which is why one entry is enough even
   during the growth: it climbs and never comes back. */
let monthCache={key:'',markup:''};
function monthLayer(B,C){
  const month=ans('month');
  const temps=MONTH_TEMPS[month];
  if(!temps) return '';
  if(monthFontState!=='ready'){ ensureMonthFont(); return ''; }

  const key=month+'|'+B.w+'x'+B.h+'|'+C.bg+'|'+rolled('month')+'|'+monthRMin();
  if(monthCache.key===key) return monthCache.markup;

  /* the tool sets the temperature four times over, which is what puts it on
     four lines once monthLines() refuses to pair two six-character words */
  const built=monthCircles(B,(temps+' ').repeat(4).trim());
  if(!built){ monthCache={key,markup:''}; return ''; }
  const {circles,strokePx}=built;

  const discs=(r0)=>circles.map(c=>{
    const r=r0(c);
    return r>0 ? '<circle cx="'+c.x.toFixed(1)+'" cy="'+c.y.toFixed(1)+'" r="'+r.toFixed(1)+'"/>' : '';
  }).join('');

  const maskId='monthHollow-'+B.w+'x'+B.h;
  const markup=
      '<g>'
    +   '<mask id="'+maskId+'" maskUnits="userSpaceOnUse" x="0" y="0" width="'+B.w+'" height="'+B.h+'">'
    +     '<rect width="'+B.w+'" height="'+B.h+'" fill="#fff"/>'
          /* punching the inner discs out is the SVG form of the tool's
             destination-out pass: what survives is the union's outer hairline */
    +     '<g fill="#000">'+discs(c=>c.r-strokePx)+'</g>'
    +   '</mask>'
        /* the fill takes the PAPER's colour, not white: its job is to knock the
           grid out from behind the silhouette so the contour reads clean, and
           on black paper a literal white fill would turn the mark into a slab */
    +   '<g fill="'+C.bg+'">'+discs(c=>c.r)+'</g>'
    +   '<g fill="'+MONTHL.ink+'" mask="url(#'+maskId+')">'+discs(c=>c.r)+'</g>'
    + '</g>';
  monthCache={key,markup};
  return markup;
}

