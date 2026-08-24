/* ===== ported lattice engine (the sixweek question) — inserted from lattice/engine.js ===== */
/* ==== LATTICE (Brik Geometric Lattice Generator, sixweek: week vs weekend) ==
   Ported 1:1 from the tool at its native 700x1000 canvas (== poster). The
   generation half is verbatim. Preset settled 16 Aug from Karin's slider
   screenshots and her two 700x1000 PNG exports — the HTML exports could not be
   trusted, Brik drops the hand-drawn canvasState from them, so the painted and
   erased cells were decoded from the PNGs' pixels instead (see PAINTED_UV).
   invert_ratio holds at 206 (ir past 1 simply inverts every cross), and the
   painted/erased pairs are kept the way the tool itself keeps them: normalised
   u,v fractions of the grid, resolved against the CURRENT grid at draw time
   (Math.round(u*cols)), so the hand composition holds its place on the sheet at
   any square_size. Wrapped in an IIFE because the poster already defines
   mulberry32. ==== */
const latticeLayer = (function(){
  const FIXED = {"seed":753,"square_size":16,"density":27,"falloff":165,"origin":{"x":-0.99,"y":-0.96},"shape_scale":63,"show_frames":true,"frame_opacity":100,"show_stroke":true,"line_thickness":0};
  /* week -> weekend, off Karin's slider screenshots (16 Aug): ONE value moves,
     the cross weight. Everything else sits still at both ends — invert stays
     206, so every cross is always inverted, and the solid squares simply grow
     in number as the bar slides toward the weekend. */
  const CIRCLE = [6, 6];
  const PLUS   = [5, 5];
  const CROSS  = [0, 80];
  const DIAG   = [10, 10];
  const INVERT = [206, 206];
  /* the hand composition, decoded cell-by-cell from Karin's two 700x1000 PNG
     exports (16 Aug 15:39): every active cell in the image that the generative
     baseline does not produce is painted, every baseline cell missing from the
     image is erased. 257 active cells, identical at both ends, 208 painted +
     82 erased (+1 edge cell at [42,43] forced painted: its weekend glyph reads
     plus in the export but rolls cross here — one cell, right trim). */
  const PAINTED_UV = [[0.0,0.0],[0.0,0.016129],[0.0,0.032258],[0.0,0.048387],[0.0,0.064516],[0.0,0.080645],[0.0,0.096774],[0.0,0.129032],[0.0,0.145161],[0.0,0.290323],[0.0,0.306452],[0.0,0.322581],[0.0,0.403226],[0.0,0.419355],[0.0,0.5],[0.0,0.516129],[0.0,0.532258],[0.0,0.596774],[0.0,0.612903],[0.0,0.790323],[0.0,0.806452],[0.023256,0.0],[0.023256,0.016129],[0.023256,0.032258],[0.023256,0.048387],[0.023256,0.064516],[0.023256,0.080645],[0.023256,0.096774],[0.023256,0.112903],[0.023256,0.145161],[0.023256,0.33871],[0.023256,0.370968],[0.023256,0.387097],[0.023256,0.403226],[0.023256,0.516129],[0.023256,0.532258],[0.023256,0.596774],[0.023256,0.806452],[0.023256,0.822581],[0.046512,0.0],[0.046512,0.016129],[0.046512,0.032258],[0.046512,0.080645],[0.046512,0.096774],[0.046512,0.112903],[0.046512,0.129032],[0.046512,0.33871],[0.046512,0.354839],[0.046512,0.370968],[0.046512,0.516129],[0.046512,0.532258],[0.046512,0.580645],[0.046512,0.596774],[0.046512,0.822581],[0.046512,0.83871],[0.069767,0.0],[0.069767,0.032258],[0.069767,0.080645],[0.069767,0.096774],[0.069767,0.112903],[0.069767,0.129032],[0.069767,0.33871],[0.069767,0.354839],[0.069767,0.532258],[0.069767,0.580645],[0.069767,0.83871],[0.093023,0.0],[0.093023,0.016129],[0.093023,0.032258],[0.093023,0.048387],[0.093023,0.080645],[0.093023,0.096774],[0.093023,0.112903],[0.093023,0.532258],[0.093023,0.548387],[0.093023,0.580645],[0.093023,0.83871],[0.116279,0.0],[0.116279,0.016129],[0.116279,0.032258],[0.116279,0.048387],[0.116279,0.064516],[0.116279,0.096774],[0.116279,0.548387],[0.116279,0.564516],[0.116279,0.580645],[0.116279,0.83871],[0.139535,0.0],[0.139535,0.016129],[0.139535,0.032258],[0.139535,0.048387],[0.139535,0.064516],[0.139535,0.096774],[0.139535,0.548387],[0.139535,0.564516],[0.162791,0.0],[0.162791,0.016129],[0.162791,0.032258],[0.162791,0.048387],[0.162791,0.064516],[0.162791,0.080645],[0.162791,0.096774],[0.162791,0.548387],[0.162791,0.564516],[0.186047,0.0],[0.186047,0.016129],[0.186047,0.032258],[0.186047,0.048387],[0.186047,0.064516],[0.186047,0.096774],[0.186047,0.548387],[0.209302,0.0],[0.209302,0.016129],[0.209302,0.032258],[0.232558,0.0],[0.232558,0.016129],[0.232558,0.032258],[0.232558,0.112903],[0.255814,0.0],[0.255814,0.016129],[0.255814,0.032258],[0.255814,0.112903],[0.27907,0.0],[0.27907,0.016129],[0.302326,0.112903],[0.325581,0.112903],[0.348837,0.112903],[0.348837,0.129032],[0.348837,0.580645],[0.372093,0.129032],[0.372093,0.596774],[0.395349,0.596774],[0.55814,0.564516],[0.581395,0.580645],[0.604651,0.580645],[0.627907,0.451613],[0.627907,0.467742],[0.627907,0.774194],[0.627907,0.790323],[0.651163,0.467742],[0.651163,0.758065],[0.651163,0.774194],[0.651163,0.790323],[0.651163,0.806452],[0.674419,0.467742],[0.674419,0.483871],[0.674419,0.806452],[0.674419,0.887097],[0.697674,0.483871],[0.697674,0.806452],[0.697674,0.903226],[0.72093,0.677419],[0.72093,0.806452],[0.72093,0.887097],[0.744186,0.66129],[0.744186,0.677419],[0.744186,0.806452],[0.744186,0.887097],[0.767442,0.66129],[0.767442,0.790323],[0.767442,0.806452],[0.790698,0.66129],[0.790698,0.741935],[0.790698,0.790323],[0.813953,0.435484],[0.813953,0.66129],[0.813953,0.774194],[0.813953,0.790323],[0.837209,0.66129],[0.837209,0.758065],[0.837209,0.774194],[0.860465,0.66129],[0.860465,0.725806],[0.860465,0.741935],[0.860465,0.758065],[0.860465,0.870968],[0.883721,0.66129],[0.883721,0.677419],[0.883721,0.693548],[0.883721,0.709677],[0.883721,0.725806],[0.883721,0.854839],[0.883721,0.870968],[0.906977,0.677419],[0.906977,0.693548],[0.906977,0.83871],[0.906977,0.854839],[0.930233,0.290323],[0.930233,0.83871],[0.930233,0.854839],[0.953488,0.306452],[0.953488,0.322581],[0.953488,0.467742],[0.953488,0.483871],[0.953488,0.66129],[0.953488,0.677419],[0.953488,0.758065],[0.976744,0.322581],[0.976744,0.33871],[0.976744,0.483871],[0.976744,0.5],[0.976744,0.645161],[0.976744,0.66129],[0.976744,0.677419],[0.976744,0.774194],[0.976744,0.790323],[0.976744,0.854839],[0.976744,0.870968],[0.976744,0.693548]];
  const ERASED_UV  = [[0.0,0.33871],[0.0,0.451613],[0.0,0.645161],[0.0,0.709677],[0.023256,0.306452],[0.046512,0.241935],[0.046512,0.306452],[0.046512,0.403226],[0.046512,0.564516],[0.046512,0.629032],[0.046512,0.790323],[0.069767,0.645161],[0.093023,0.290323],[0.093023,0.370968],[0.093023,0.387097],[0.093023,0.435484],[0.093023,0.483871],[0.116279,0.241935],[0.116279,0.290323],[0.116279,0.370968],[0.116279,0.66129],[0.116279,0.790323],[0.139535,0.322581],[0.139535,0.33871],[0.139535,0.387097],[0.139535,0.451613],[0.139535,0.483871],[0.139535,0.790323],[0.162791,0.258065],[0.162791,0.33871],[0.162791,0.483871],[0.186047,0.241935],[0.186047,0.451613],[0.186047,0.467742],[0.209302,0.258065],[0.209302,0.274194],[0.209302,0.354839],[0.209302,0.387097],[0.209302,0.5],[0.209302,0.693548],[0.232558,0.290323],[0.232558,0.306452],[0.232558,0.370968],[0.232558,0.435484],[0.232558,0.483871],[0.255814,0.225806],[0.255814,0.241935],[0.255814,0.467742],[0.255814,0.516129],[0.27907,0.129032],[0.27907,0.387097],[0.27907,0.532258],[0.27907,0.629032],[0.302326,0.129032],[0.302326,0.258065],[0.325581,0.274194],[0.325581,0.370968],[0.372093,0.532258],[0.395349,0.322581],[0.395349,0.33871],[0.395349,0.435484],[0.44186,0.258065],[0.44186,0.403226],[0.44186,0.419355],[0.465116,0.209677],[0.488372,0.241935],[0.511628,0.177419],[0.511628,0.354839],[0.511628,0.596774],[0.534884,0.290323],[0.581395,0.016129],[0.581395,0.032258],[0.581395,0.5],[0.604651,0.016129],[0.604651,0.080645],[0.627907,0.129032],[0.627907,0.145161],[0.651163,0.290323],[0.674419,0.080645],[0.674419,0.193548],[0.697674,0.096774],[0.744186,0.145161]];

  function lm32(seed){ let a=seed>>>0; return function(){ a|=0; a=(a+0x6d2b79f5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
  function hashCell(col,row,seed){ let h=(col*374761393+row*668265263+seed*2246822519)>>>0; h=Math.imul(h^(h>>>13),1274126177)>>>0; h^=h>>>16; return (h>>>0)/4294967296; }
  function randShape(rng,wc,wp,wx,wd){ const tot=wc+wp+wx+wd; if(tot<=0){ const s=['circle','plus','cross','diagonal']; return s[Math.floor(rng()*4)]; } let r=rng()*tot; if(r<wc)return'circle'; r-=wc; if(r<wp)return'plus'; r-=wp; if(r<wx)return'cross'; return'diagonal'; }
  function makePainted(P,col,row){ const prng=lm32(((col+1)*73856093 ^ (row+1)*19349663 ^ (P.seed*83492791))>>>0); const shape=randShape(prng,P.weight_circle,P.weight_plus,P.weight_cross,P.weight_diagonal); const dir=prng()<0.5?1:-1; return {active:true,shape,invertHash:hashCell(col,row,P.seed),diagonalDirection:dir,__painted:true}; }
  function gen(P,cols,rows){
    const cells=[]; const rng=lm32(P.seed); const density=P.density/100, falloff=P.falloff/100;
    const o=P.origin||{x:-1,y:-1}; const onx=(o.x+1)/2, ony=(o.y+1)/2;
    const maxD=Math.max(Math.hypot(onx,ony),Math.hypot(1-onx,ony),Math.hypot(onx,1-ony),Math.hypot(1-onx,1-ony))||1;
    for(let r=0;r<rows;r++){ const row=[]; const ny=rows>1?r/(rows-1):0;
      for(let c=0;c<cols;c++){ const nx=cols>1?c/(cols-1):0; const nd=Math.hypot(nx-onx,ny-ony)/maxD;
        const active=rng()<density*(1-nd*falloff); const shape=randShape(rng,P.weight_circle,P.weight_plus,P.weight_cross,P.weight_diagonal);
        row.push({active,shape,invertHash:hashCell(c,r,P.seed),diagonalDirection:rng()<0.5?1:-1}); }
      cells.push(row); }
    return cells;
  }
  const isInv=(cell,ir)=> !!cell && cell.shape==='cross' && cell.invertHash<ir;

  /* The cell model alone — generate, then apply the hand overrides — shared by
     the batched static render (core) and the per-cell entrance render below,
     so the two can never disagree about which cells are active. */
  function buildModel(P,W,H){
    const cs=Math.max(4,P.square_size), cols=Math.max(1,Math.floor(W/cs)), rows=Math.max(1,Math.floor(H/cs));
    /* The tool centres the cell grid on the canvas, which split the leftover
       units (whatever W and H leave over whole cells) evenly around it — a
       hairline of bare paper along the sheet's TOP and LEFT edges. Anchored to
       the top-left corner instead, by decision: the first row and the first
       column sit flush with their edges, and all the slack collects at the
       right and the foot, where the composition absorbs it. */
    const ox=0, oy=0;
    const cells=gen(P,cols,rows);
    for(const [u,v] of ERASED_UV){ const c=Math.round(u*cols), r=Math.round(v*rows); if(c<0||r<0||c>=cols||r>=rows)continue; if(cells[r]&&cells[r][c])cells[r][c].active=false; }
    for(const [u,v] of PAINTED_UV){ const c=Math.round(u*cols), r=Math.round(v*rows); if(c<0||r<0||c>=cols||r>=rows)continue; if(!cells[r]||!cells[r][c])continue; if(!cells[r][c].active||!cells[r][c].__painted)cells[r][c]=makePainted(P,c,r); }
    return {cells,cols,rows,cs,ox,oy};
  }

  /* the tool's five draw() phases, emitted as SVG content (no wrapping <svg>) */
  function core(P,W,H,shapeColor,fillColor){
    const {cells,cols,rows,cs,ox,oy}=buildModel(P,W,H);
    const ir=(P.invert_ratio||0)/100, scale=P.shape_scale/100, radius=cs*scale*0.5;
    let rects='';
    if(P.show_frames && P.frame_opacity>0){
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){ const cell=cells[r][c]; if(!cell.active)continue;
        const inv=isInv(cell,ir); const x0=Math.floor(ox+c*cs),y0=Math.floor(oy+r*cs),x1=Math.ceil(ox+(c+1)*cs),y1=Math.ceil(oy+(r+1)*cs);
        rects+='<rect x="'+x0+'" y="'+y0+'" width="'+(x1-x0)+'" height="'+(y1-y0)+'" fill="'+(inv?shapeColor:fillColor)+'"/>'; }
    }
    const nSeg=[],iSeg=[],nArc=[],iArc=[]; let cur=nSeg; const add=(a,b,cc,d)=>cur.push([a,b,cc,d]);
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){ const cell=cells[r][c]; if(!cell.active)continue;
      const inv=isInv(cell,ir); const arcs=inv?iArc:nArc;
      const cx=ox+(c+0.5)*cs, cy=oy+(r+0.5)*cs, half=cs*0.5;
      if(P.show_stroke){ cur=nSeg; const l=cx-half,rr=cx+half,t=cy-half,b=cy+half; add(l,t,rr,t); add(rr,t,rr,b); add(rr,b,l,b); add(l,b,l,t); }
      cur=inv?iSeg:nSeg;
      switch(cell.shape){
        case 'circle': arcs.push([cx,cy,radius]); break;
        case 'plus': add(cx-radius,cy,cx+radius,cy); add(cx,cy-radius,cx,cy+radius); break;
        case 'cross': add(cx-radius,cy-radius,cx+radius,cy+radius); add(cx+radius,cy-radius,cx-radius,cy+radius); break;
        case 'diagonal': { const d=cell.diagonalDirection; add(cx-radius,cy-radius*d,cx+radius,cy+radius*d); break; }
      }
    }
    const qp=v=>Math.round(v*100)/100;
    function dedupe(segs){ const seen=new Set(),out=[]; for(const s of segs){ let a=[qp(s[0]),qp(s[1])],b=[qp(s[2]),qp(s[3])]; if(a[0]>b[0]||(a[0]===b[0]&&a[1]>b[1])){const t=a;a=b;b=t;} const k=a[0]+','+a[1]+'-'+b[0]+','+b[1]; if(seen.has(k))continue; seen.add(k); out.push(s);} return out; }
    const nU=dedupe(nSeg), iU=dedupe(iSeg);
    const lw=Math.max(1,Math.round(P.line_thickness)); const odd=(lw%2===1)?0.5:0; const snap=v=>Math.round(v)+odd;
    function pass(segs,arcs,color){ if(!segs.length&&!arcs.length)return''; let d=''; for(const s of segs)d+='M'+snap(s[0])+' '+snap(s[1])+'L'+snap(s[2])+' '+snap(s[3]); let ci=''; for(const a of arcs)ci+='<circle cx="'+snap(a[0])+'" cy="'+snap(a[1])+'" r="'+a[2]+'"/>'; let o=''; if(d)o+='<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+lw+'" stroke-linecap="round" stroke-linejoin="round"/>'; if(ci)o+='<g fill="none" stroke="'+color+'" stroke-width="'+lw+'">'+ci+'</g>'; return o; }
    return rects + pass(nU,nArc,shapeColor) + pass(iU,iArc,fillColor);
  }

  /* ENTRANCE ONLY: one <g class="lcell"> per active cell (fill + border + shape
     mark), each carrying its own bake-in reveal delay (--cd) so the CSS hard-cut
     rule below can pop every cell in on its own schedule — a diagonal wavefront
     sweeping out from the top-left origin. `ci` is Manhattan distance from the
     top-left corner (col+row): every cell on the same anti-diagonal shares one
     delay, which is what makes the sweep read as a straight advancing front
     rather than a scatter. The front's ADVANCE is what eases out (delays are
     spaced by an eased curve across the diagonals); each individual cell's own
     reveal stays a true instant cut — no fade, matching the rest of the bank's
     no-fade language for hard marks.
     Used ONLY on the very first paint (see latticeLayer): every later paint —
     a bar drag, a revisit — falls through to the efficient batched core() above
     and this per-cell markup is never re-emitted. */
  function entranceMarkup(P,W,H,shapeColor,fillColor){
    const {cells,cols,rows,cs,ox,oy}=buildModel(P,W,H);
    const ir=(P.invert_ratio||0)/100, scale=P.shape_scale/100, radius=cs*scale*0.5;
    const lw=Math.max(1,Math.round(P.line_thickness));
    const maxCi=Math.max(1,(cols-1)+(rows-1));
    const TOTAL_MS=900;                          // the whole sheet's sweep — ease-out band, upper end (full-bleed reveal)
    const STEP_MS=240;                            // must match the CSS animation-duration (see latticeCellIn) —
                                                   // backed out of the delay so a cell's step still lands at its
                                                   // eased moment in the sweep, not 240ms late
    const easeOutCubic=x=>1-Math.pow(1-x,3);
    const f=n=>n.toFixed(1);
    let out='';
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const cell=cells[r][c]; if(!cell.active) continue;
      const inv=isInv(cell,ir);
      const x0=Math.floor(ox+c*cs), y0=Math.floor(oy+r*cs), x1=Math.ceil(ox+(c+1)*cs), y1=Math.ceil(oy+(r+1)*cs);
      const cx=ox+(c+0.5)*cs, cy=oy+(r+0.5)*cs, half=cs*0.5;
      const bgFill=inv?shapeColor:fillColor;         // Phase 1's per-cell fill
      const markColor=inv?fillColor:shapeColor;      // Phase 2's mark colour (the border stays shapeColor either way)
      const delay=Math.max(0, Math.round(TOTAL_MS*easeOutCubic((c+r)/maxCi))-STEP_MS);
      let mark='';
      if(P.show_frames && P.frame_opacity>0){
        mark+='<rect x="'+x0+'" y="'+y0+'" width="'+(x1-x0)+'" height="'+(y1-y0)+'" fill="'+bgFill+'"/>';
      }
      if(P.show_stroke){
        mark+='<rect x="'+f(cx-half)+'" y="'+f(cy-half)+'" width="'+f(cs)+'" height="'+f(cs)+'" fill="none" stroke="'+shapeColor+'" stroke-width="'+lw+'" stroke-linejoin="round"/>';
      }
      switch(cell.shape){
        case 'circle':
          mark+='<circle cx="'+f(cx)+'" cy="'+f(cy)+'" r="'+f(radius)+'" fill="none" stroke="'+markColor+'" stroke-width="'+lw+'" stroke-linecap="round"/>'; break;
        case 'plus':
          mark+='<path d="M'+f(cx-radius)+' '+f(cy)+'L'+f(cx+radius)+' '+f(cy)+'M'+f(cx)+' '+f(cy-radius)+'L'+f(cx)+' '+f(cy+radius)+'"'
              + ' fill="none" stroke="'+markColor+'" stroke-width="'+lw+'" stroke-linecap="round"/>'; break;
        case 'cross':
          mark+='<path d="M'+f(cx-radius)+' '+f(cy-radius)+'L'+f(cx+radius)+' '+f(cy+radius)+'M'+f(cx+radius)+' '+f(cy-radius)+'L'+f(cx-radius)+' '+f(cy+radius)+'"'
              + ' fill="none" stroke="'+markColor+'" stroke-width="'+lw+'" stroke-linecap="round"/>'; break;
        case 'diagonal': { const d=cell.diagonalDirection;
          mark+='<path d="M'+f(cx-radius)+' '+f(cy-radius*d)+'L'+f(cx+radius)+' '+f(cy+radius*d)+'"'
              + ' fill="none" stroke="'+markColor+'" stroke-width="'+lw+'" stroke-linecap="round"/>'; break; }
      }
      out+='<g class="lcell" style="--cd:'+delay+'ms">'+mark+'</g>';
    }
    return out;
  }

  /* the poster layer: read the week/weekend bar, interpolate, fill the sheet. */
  return function latticeLayer(B,C){
    const raw=ans('sixweek');
    const t=Math.max(0,Math.min(1, (Number.isFinite(+raw)?+raw:50)/100));
    const lerp=(pair)=>pair[0]+(pair[1]-pair[0])*t;
    const P=Object.assign({},FIXED,{
      weight_circle:   lerp(CIRCLE),
      weight_plus:     lerp(PLUS),
      weight_cross:    lerp(CROSS),
      weight_diagonal: lerp(DIAG),
      invert_ratio:    lerp(INVERT)
    });
    /* red role hex so the colourway recolours the X like every other element;
       the near-paper square fill stays out of the colourway map. First paint
       (entered has not yet tagged 'sixweek') gets the per-cell entrance render;
       every later paint — a bar drag, a revisit — gets the efficient batched
       one, and the entrance markup is never re-emitted (see entranceMarkup). */
    const inner = entered.has('sixweek')
      ? core(P,700,1000,'#F5242B','#FAF8F8')
      : entranceMarkup(P,700,1000,'#F5242B','#FAF8F8');
    return '<svg x="0" y="0" width="'+B.w+'" height="'+B.h+'" viewBox="0 0 700 1000" preserveAspectRatio="none">'+inner+'</svg>';
  };
})();
/* How the lattice PRINTS against the layers above it, now that it sits under
   the rings, the snake and the node. Tuned live from the dev panel (see the
   DEV_SKIP block) and read by buildSVG on every paint — the values here are
   the shipping defaults; the panel exists to find better ones. */
const LATTICE_STYLE={blend:'normal', opacity:1};

function barLayer(B,C){
  const W=B.w, H=B.h;
  const cols=Math.max(1, barColsFromAnswers());
  const rows=BARL.rows;
  const cellH=BARL.rectH*H, bandH=cellH*rows, cellW=W/cols;
  const y0=H-bandH;                        // anchored to the sheet's foot
  const RED='#F5242B', BLUE='#0C55FF';     // the interface's EXACT inks, untouched
  const f=n=>n.toFixed(2);
  /* SHARP rectangles (plain rects — no edge wobble), full opacity, PURE hex. The
     texture is Brik's riso paper GRAIN laid over the fills, not a ruffled outline.
     Columns alternate which ink role a cell belongs to; one clip of every cell
     confines the grain to the ink (Brik's source-atop). */
  /* BLEED: the bottom row runs a few units past the sheet edge and lets the
     svg clip it. The row's own bottom already sat exactly on H, but the poster
     is scaled to the screen and tilts with the pointer, so a hairline of paper
     could still open along the foot at some sizes — the bleed makes the band
     meet the edge whatever the rasteriser does with the last fraction of a
     pixel. */
  const bleed=6;
  let blue='', red='', clip='';
  for(let r=0;r<rows;r++){
    const cellY=y0+bandH-(r+1)*cellH;      // r=0 is the bottom row, stacking up
    const h=cellH+(r===0?bleed:0);
    for(let c=0;c<cols;c++){
      if((c+r)%2!==0) continue;            // the brick-offset checkerboard
      const geom='x="'+f(c*cellW)+'" y="'+f(cellY)+'" width="'+f(cellW)+'" height="'+f(h)+'"';
      clip+='<rect '+geom+'/>';                 // clip copy stays plain (never animated)
      /* visible brick carries its COLUMN index so the entrance can lay the band
         in column by column (see .hl.enter[data-q="decades"] .brick) */
      const vrect='<rect class="brick" style="--ci:'+c+'" '+geom+'/>';
      if(c%2===0) blue+=vrect; else red+=vrect;
    }
  }
  /* Brik's grain: a fine speckle that is HALF black, HALF white at low alpha, so it
     darkens and lightens the ink in equal measure (paper tooth) rather than muddying
     it. Built with turbulence: one pass paints black specks where the noise is high,
     one paints white specks where it is low; the whole grain layer's opacity is the
     strength. Clipped to the cells so it never touches the paper. */
  /* FORMAT-KEYED IDS, and not for tidiness. The poster is two plies, and during a
     format change BOTH hold a full SVG at once — so a bare id="barClip" appears
     twice in the document and every url(#barClip) in the second ply resolves to
     the FIRST ply's clip instead. That clip is the checkerboard at the OTHER
     format's cell size and foot, so the grain came out clipped to cells that are
     not there: speckle sitting on bare paper, and inked cells left clean. Same
     reason nodeKnock, monthHollow and the ring clips carry the format. */
  const gid='barGrain-'+W+'x'+H, cid='barClip-'+W+'x'+H;
  return '<defs>'
    + '<filter id="'+gid+'" x="0" y="0" width="100%" height="100%">'
    +   '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="8" stitchTiles="stitch" result="n"/>'
    +   '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.8 0 0 0 -0.28" result="dark"/>'
    +   '<feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -0.8 0 0 0 0.52" result="lite"/>'
    +   '<feMerge><feMergeNode in="dark"/><feMergeNode in="lite"/></feMerge>'
    + '</filter>'
    + '<clipPath id="'+cid+'">'+clip+'</clipPath>'
    + '</defs>'
    + '<g fill="'+BLUE+'">'+blue+'</g>'
    + '<g fill="'+RED+'">'+red+'</g>'
    + '<g clip-path="url(#'+cid+')" opacity="'+BARL.grain.toFixed(2)+'">'
    +   '<rect x="0" y="'+f(y0)+'" width="'+f(W)+'" height="'+f(bandH+bleed)+'" filter="url(#'+gid+')"/>'
    + '</g>';
}

