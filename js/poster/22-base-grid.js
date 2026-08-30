/* =====================================================================
   THE BASE GRID — the bottom layer, drawn straight onto the ground. shape and
   density are hidden bank entries in the Rosh Hashanah edition (see their
   `hidden:true` in js/10-bank.js) — never asked, so the grid is a fixed
   medium circle grid from the first draw rather than something earned over
   two questions. ans('shape')/ans('density') still resolve through their
   entries' `default` (circle / enough), which is what this file reads.
   The arrival dial (the old Q3, whose lateness broke every line into dashes)
   was removed with its question; the grid's lines are plain solid now.
   ===================================================================== */
const DENSITY_COLS  ={little:10, enough:16, plenty:20};   // (unused) square: column count
const DENSITY_RINGS ={little:8,  enough:16, plenty:22};   // circles: ring count
const DENSITY_SPOKES={little:12, enough:20, plenty:24};   // spokes: how many rays — the density question's three levels
/* True squares, not rectangles: cell size comes from the WIDTH only and the
   same size is reused for the vertical axis, so cells stay square regardless
   of the poster's 7:10 aspect. The bottom row is left to clip rather than
   stretching the last cell to fit — a whole number of SQUARES matters more
   here than a whole number of rows. */
function squareBaseGrid(cols,style,B,color){
  const cell=B.w/cols, rows=Math.ceil(B.h/cell);
  let s='<g fill="none" stroke="'+color+'" stroke-width="'+style.strokeWidth.toFixed(2)+'"'
      +(style.dasharray?' stroke-dasharray="'+style.dasharray+'"':'')
      +' shape-rendering="'+GRID_RENDERING+'">';
  for(let c=0;c<=cols;c++){ const x=(c*cell).toFixed(2); s+='<line x1="'+x+'" y1="0" x2="'+x+'" y2="'+B.h+'"/>'; }
  for(let r=0;r<=rows;r++){ const y=(r*cell).toFixed(2); s+='<line x1="0" y1="'+y+'" x2="'+B.w+'" y2="'+y+'"/>'; }
  return s+'</g>';
}
/* Concentric rings from dead centre plus 12 spokes 30° apart, together
   dividing the sheet into a full polar grid rather than plain rings. maxR
   reaches every corner (all four are equidistant from the centre of a
   rectangle) plus a small margin, scaled from the ~10px tuned at the
   546x745 reference canvas the prototype was built at, by overall diagonal
   so the same margin holds at any format. */
/* CIRCLES ONLY — concentric rings from the sheet's centre, no spokes. (The spokes
   moved to their own shape; see spokesBaseGrid.) */
function polarBaseGrid(rings,style,B,color){
  const cx=B.w/2, cy=B.h/2;
  const margin=10*(Math.hypot(B.w,B.h)/Math.hypot(546,745));
  const maxR=Math.hypot(cx,cy)+margin;
  let s='<g fill="none" stroke="'+color+'" stroke-width="'+style.strokeWidth.toFixed(2)+'"'
      +(style.dasharray?' stroke-dasharray="'+style.dasharray+'"':'')
      +' shape-rendering="'+GRID_RENDERING+'">';
  for(let i=1;i<=rings;i++){
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(maxR*i/rings).toFixed(2)+'"/>';
  }
  return s+'</g>';
}

/* SPOKES — the ray grid that replaces the square lattice. `nSpokes` rays fan out
   evenly from the sheet's centre; the density question sets how many (12 / 20 / 24). */
function spokesBaseGrid(nSpokes,style,B,color){
  const cx=B.w/2, cy=B.h/2;
  const margin=10*(Math.hypot(B.w,B.h)/Math.hypot(546,745));
  const maxR=Math.hypot(cx,cy)+margin;
  let s='<g fill="none" stroke="'+color+'" stroke-width="'+style.strokeWidth.toFixed(2)+'"'
      +(style.dasharray?' stroke-dasharray="'+style.dasharray+'"':'')
      +' shape-rendering="'+GRID_RENDERING+'">';
  for(let i=0;i<nSpokes;i++){
    const a=i*2*Math.PI/nSpokes;
    s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+maxR*Math.cos(a)).toFixed(2)+'" y2="'+(cy+maxR*Math.sin(a)).toFixed(2)+'"/>';
  }
  return s+'</g>';
}
function baseGridLayer(C,B){
  const style={strokeWidth:1, dasharray:null};   // solid — the arrival dial went with its question
  /* circle shape = concentric circles ONLY; the other shape = a ray/spokes grid.
     Both replace the old square lattice, which clashed with the interface grid.
     Fixed at the default level (medium/"enough") from the first draw — there
     is no longer a sparse standing state to jump from. */
  if(ans('shape')==='circle')
    return polarBaseGrid(DENSITY_RINGS[ans('density')]||DENSITY_RINGS.enough, style, B, C.grid);
  return spokesBaseGrid(DENSITY_SPOKES[ans('density')]||DENSITY_SPOKES.enough, style, B, C.grid);
}
