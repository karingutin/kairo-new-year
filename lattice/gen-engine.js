/* Generates the embeddable lattice engine (browser IIFE) for the poster,
   reading the exact canvasState + fixed params from week.preset.json.
   Only weight_cross (23->100) and invert_ratio (41->100) vary with the bar;
   everything else is fixed and the painted/erased pattern is a constant. */
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(__dirname + '/week.preset.json', 'utf8'));

const FIXED = {
  seed: p.seed, square_size: p.square_size, density: p.density, falloff: p.falloff,
  origin: p.origin, weight_circle: p.weight_circle, weight_plus: p.weight_plus,
  weight_diagonal: p.weight_diagonal, shape_scale: p.shape_scale,
  show_frames: p.show_frames, frame_opacity: p.frame_opacity,
  show_stroke: p.show_stroke, line_thickness: p.line_thickness
};

// Pre-round the painted/erased cells to integer (col,row) at the fixed 50x71
// grid so no float precision travels into the poster. cols=floor(700/14)=50,
// rows=floor(1000/14)=71 — matches the tool's own Math.round(u*cols) merge.
const COLS = Math.floor(700 / p.square_size);   // 50
const ROWS = Math.floor(1000 / p.square_size);  // 71
const toCR = arr => arr.map(([u, v]) => [Math.round(u * COLS), Math.round(v * ROWS)]);
const painted = toCR(p.painted);
const erased = toCR(p.erased);

const engine = `/* ==== LATTICE (Brik Geometric Lattice Generator, question 6: week vs weekend) ==
   Ported 1:1 from the tool at its native 700x1000 canvas (== poster). The
   generation half is verbatim; only weight_cross (23->100) and invert_ratio
   (41->100) move with the bar. The painted/erased pattern is a constant, stored
   as integer (col,row) on the fixed 50x71 grid. Wrapped in an IIFE because the
   poster already defines mulberry32. Verified by pixel-diff (see lattice/). ==== */
const latticeLayer = (function(){
  const FIXED = ${JSON.stringify(FIXED)};
  const CROSS = [23, 100];        // week -> weekend
  const INVERT = [41, 100];
  const PAINTED = ${JSON.stringify(painted)};
  const ERASED  = ${JSON.stringify(erased)};

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

  /* the tool's five draw() phases, emitted as SVG content (no wrapping <svg>) */
  function core(P,W,H,shapeColor,fillColor){
    const cs=Math.max(4,P.square_size), cols=Math.max(1,Math.floor(W/cs)), rows=Math.max(1,Math.floor(H/cs));
    const ox=(W-cols*cs)/2, oy=(H-rows*cs)/2;
    const cells=gen(P,cols,rows);
    for(const [c,r] of ERASED){ if(c<0||r<0||c>=cols||r>=rows)continue; if(cells[r]&&cells[r][c])cells[r][c].active=false; }
    for(const [c,r] of PAINTED){ if(c<0||r<0||c>=cols||r>=rows)continue; if(!cells[r]||!cells[r][c])continue; if(!cells[r][c].active||!cells[r][c].__painted)cells[r][c]=makePainted(P,c,r); }
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

  /* the poster layer: read the week/weekend bar, interpolate, fill the sheet. */
  return function latticeLayer(B,C){
    const raw=ans('sixweek');
    const t=Math.max(0,Math.min(1, (Number.isFinite(+raw)?+raw:50)/100));
    const P=Object.assign({},FIXED,{
      weight_cross: CROSS[0]+(CROSS[1]-CROSS[0])*t,
      invert_ratio: INVERT[0]+(INVERT[1]-INVERT[0])*t
    });
    /* red role hex so the colourway recolours the X like every other element;
       the near-paper square fill stays out of the colourway map. */
    const inner=core(P,700,1000,'#F5242B','#FAF8F8');
    return '<svg x="0" y="0" width="'+B.w+'" height="'+B.h+'" viewBox="0 0 700 1000" preserveAspectRatio="none">'+inner+'</svg>';
  };
})();
`;

fs.writeFileSync(__dirname + '/engine.js', engine);
console.log('engine.js written. painted=' + painted.length + ' erased=' + erased.length + ' grid=' + COLS + 'x' + ROWS + ' bytes=' + engine.length);
