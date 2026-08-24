/* ---------- poster ----------
   Painted into whichever of the two layers is currently live. The other one
   holds the outgoing format for the length of a morph and is otherwise idle. */
let livePly=0, lastMarkup=['',''];
/* Writing innerHTML throws the whole SVG away and builds a new one — new
   element, new render tree, new raster. At up to 1,872 smoke rects that is
   heavy enough to drop a frame and show as a flash, and draw() is called on
   every single input event while a slider is dragged, most of which do not
   change the rounded answer at all. So build the markup, compare it, and only
   touch the DOM when it is genuinely different. Most drag events now cost a
   string compare instead of a reparse. */
/* Each hover layer is given a transparent rect at its own bounding box, so the
   whole element region is hoverable (not just the thin shapes) while z-order keeps
   a layer above its neighbours. Runs after the SVG is in the DOM (needs getBBox). */
function addHitRects(ply){
  if(!ply) return;
  ply.querySelectorAll('.hl').forEach(g=>{
    /* month and sixweek are hovered on their ACTUAL painted marks, not a
       bounding box: both scatter corner to corner, so a bbox rect would be the
       whole sheet and every element under it could never be reached. For the
       lattice the marks are its cell rects (red, and paper with a red frame);
       the negative space between cells is left to whatever lies below. */
    if(g.getAttribute('data-q')==='month' || g.getAttribute('data-q')==='sixweek') return;
    if(g.querySelector(':scope > rect.hit')) return;
    let bb; try{ bb=g.getBBox(); }catch(e){ return; }
    if(!bb || !bb.width) return;
    const r=document.createElementNS('http://www.w3.org/2000/svg','rect');
    r.setAttribute('class','hit');
    r.setAttribute('x',bb.x.toFixed(1)); r.setAttribute('y',bb.y.toFixed(1));
    r.setAttribute('width',bb.width.toFixed(1)); r.setAttribute('height',bb.height.toFixed(1));
    r.setAttribute('fill','transparent');
    g.insertBefore(r, g.firstChild);
  });
}
/* First-appearance entry: the first time a tool's layer is present in a freshly
   painted poster, tag it .enter so its CSS entrance runs once. Any later render of
   the same tool (a slider drag rebuilding the SVG, a format morph painting the
   other ply) finds its id already in `entered` and stays silent — the entrance
   never re-fires until resetAll() clears the set. Runs after innerHTML so the
   class lands on the live elements. */
const entered=new Set();
function markEntries(ply){
  if(!ply) return;
  ply.querySelectorAll('.hl[data-q]').forEach(g=>{
    const q=g.getAttribute('data-q');
    if(entered.has(q)) return;
    /* month draws NOTHING until its font resolves (monthLayer returns '' while
       loading), then asks for one redraw. Tagging the empty not-ready render
       would burn the one-shot on a blank group, so the real silhouette would
       land already-entered and never animate. Wait for the font-ready render. */
    if(q==='month' && monthFontState!=='ready') return;
    entered.add(q);
    g.classList.add('enter');
  });
}
/* ---------- the snake's morph ----------
   The snake is the one layer that keeps a life of its own between renders. On its
   FIRST appearance the CSS entrance (.enter) unspools it; after that, whenever the
   February-length answer changes the bead COUNT, we GLIDE the beads from the old
   layout to the new one instead of cutting. The body is a metaball chain, so the
   bridges have to be rebuilt every frame from the moving beads — which is why a morph
   frame re-emits only this one small group (snakeEmit), never the whole poster. New
   tail beads are born at the tail tip (r:0 -> full); dropped beads retract into it. */
let snakeState=null;   // the settled (target) layout the static paint drew
let snakeLive=null;    // what is actually on screen right now (lags the target mid-morph)
let snakeRAF=0;
function cancelSnakeMorph(){ if(snakeRAF){ cancelAnimationFrame(snakeRAF); snakeRAF=0; } }
function startSnakeMorph(g, from, to){
  cancelSnakeMorph();
  g.classList.remove('enter');                 // the one-shot entrance must not re-fire on morph frames
  const fromMap=new Map(from.beads.map(b=>[b.index,b]));
  const toMap  =new Map(to.beads.map(b=>[b.index,b]));
  const fTail=from.beads[from.beads.length-1], tTail=to.beads[to.beads.length-1];
  const idx=[...new Set([...fromMap.keys(),...toMap.keys()])].sort((a,b)=>a-b);
  const specs=idx.map(i=>{
    const a=fromMap.get(i), b=toMap.get(i);
    if(a&&b) return {index:i, sx:a.x,sy:a.y,sr:a.r, ex:b.x,ey:b.y,er:b.r};   // shared bead: glide across
    if(b)    return {index:i, sx:fTail.x,sy:fTail.y,sr:0, ex:b.x,ey:b.y,er:b.r};  // new: born at the tail tip
    return   {index:i, sx:a.x,sy:a.y,sr:a.r, ex:tTail.x,ey:tTail.y,er:0};         // dropped: retract into the tail
  });
  const dur=520, ease=t=> 1-Math.pow(1-t,3);   // easeOutCubic (matches the CSS --eo)
  const swF=from.sw, swT=to.sw, KF=from.K, KT=to.K, merge=to.merge, t0=performance.now();
  const step=(now)=>{
    if(!g.isConnected){ snakeRAF=0; return; }   // a full repaint replaced the group; let the static one stand
    let p=(now-t0)/dur; if(p>1)p=1; const e=ease(p);
    const full=specs.map(s=>({index:s.index, x:s.sx+(s.ex-s.sx)*e, y:s.sy+(s.ey-s.sy)*e, r:Math.max(0,s.sr+(s.er-s.sr)*e)}));
    const sw=swF+(swT-swF)*e, K=KF+(KT-KF)*e;
    snakeLive={beads:full, sw, merge, K};
    g.innerHTML=inkedMarkup(snakeEmit(full.filter(b=>b.r>0.01), sw, merge, K));   // a bead is invisible until it has grown a little
    if(p<1){ snakeRAF=requestAnimationFrame(step); }
    else { snakeRAF=0; snakeLive=to; g.innerHTML=inkedMarkup(snakeEmit(to.beads,to.sw,to.merge,to.K)); addHitRects(plys[livePly]); }
  };
  step(t0);   // render frame 0 (the old layout) synchronously, so the static new snake never flashes first
}
/* Decide, after each real repaint, whether the snake should morph. Runs off the
   layout the paint just drew (recomputed, cheap — only fires on genuine repaints). */
function syncSnake(){
  const g=plys[livePly].querySelector('.hl[data-q="febdays"]');
  if(!g){ cancelSnakeMorph(); snakeState=snakeLive=null; return; }
  const nl=snakeBeads(box(), PAPER);
  if(!nl){ cancelSnakeMorph(); snakeState=snakeLive=null; return; }
  const prev=snakeState;
  // first-ever appearance, or the CSS entrance is on this group: let that play, just record
  if(!prev || g.classList.contains('enter')){ snakeState=nl; snakeLive=nl; return; }
  const from=snakeRAF ? snakeLive : prev;      // interrupt a running morph from its current on-screen state
  snakeState=nl;
  if(!snakeRAF && from.beads.length===nl.beads.length){ snakeLive=nl; return; }   // idle & unchanged count -> nothing to glide
  if(reduceMotion()){ cancelSnakeMorph(); snakeLive=nl; return; }                 // static swap already painted
  startSnakeMorph(g, from, nl);
}

/* ---------- the node's morph ----------
   Unlike the snake, the node RE-SCATTERS every ray angle when the alarm count changes
   (the geometry is seeded on the count). So the morph glides ALL ray tips from the old
   scatter to the new one; a gained ray is born at the centre (its tip grows out of
   cx,cy) and a lost one retracts into it. A ray is always centre->tip, so moving the
   tip in a straight line reads as a smooth sweep. Only this one small group is
   re-emitted per frame — the poster is never touched. */
let nodeState=null, nodeLive=null, nodeRAF=0;
function cancelNodeMorph(){ if(nodeRAF){ cancelAnimationFrame(nodeRAF); nodeRAF=0; } }
function startNodeMorph(g, from, to){
  cancelNodeMorph();
  g.classList.remove('enter');
  const n=Math.max(from.ends.length, to.ends.length);
  const specs=[];
  for(let i=0;i<n;i++){
    const a=from.ends[i], b=to.ends[i];
    specs.push({sx:a?a[0]:to.cx, sy:a?a[1]:to.cy, ex:b?b[0]:to.cx, ey:b?b[1]:to.cy});
  }
  const dur=520, ease=t=> 1-Math.pow(1-t,3), t0=performance.now();   // easeOutCubic (matches the CSS --eo)
  const step=(now)=>{
    if(!g.isConnected){ nodeRAF=0; return; }
    let p=(now-t0)/dur; if(p>1)p=1; const e=ease(p);
    const ends=specs.map(s=>[s.sx+(s.ex-s.sx)*e, s.sy+(s.ey-s.sy)*e]);
    nodeLive={...to, ends};
    g.innerHTML=inkedMarkup(nodeEmit(nodeLive));
    if(p<1){ nodeRAF=requestAnimationFrame(step); }
    else { nodeRAF=0; nodeLive=to; g.innerHTML=inkedMarkup(nodeEmit(to)); addHitRects(plys[livePly]); }
  };
  step(t0);   // render frame 0 (old scatter) synchronously, so the new static node never flashes first
}
function syncNode(){
  const g=plys[livePly].querySelector('.hl[data-q="alarms"]');
  if(!g){ cancelNodeMorph(); nodeState=nodeLive=null; return; }
  const nl=nodeRays(box(), PAPER);
  const prev=nodeState;
  if(!prev || g.classList.contains('enter')){ nodeState=nl; nodeLive=nl; return; }   // first appearance / entrance owns it
  const from=nodeRAF ? nodeLive : prev;
  nodeState=nl;
  if(!nodeRAF && from.ends.length===nl.ends.length){ nodeLive=nl; return; }   // same ray count -> instant (re-roll etc.)
  if(reduceMotion()){ cancelNodeMorph(); nodeLive=nl; return; }
  startNodeMorph(g, from, nl);
}
/* ---------- the ring block's morph ----------
   The block is one ring per memory, and EVERY radius moves when the count does
   (a ring's radius is a function of its index over the count). But the geometry
   holds one invariant: every ring passes through the tangent point, and its
   centre is that point minus r along the lean. So a ring at radius r is exactly
   the settled ring SCALED by r/r_settled about the tangent point — which means
   the morph never has to redraw a thing. It emits the settled stack once and
   then animates one transform per ring group.

   That is not just cheaper, it is the only version that is right about SHAPE.
   Gliding radii and re-tessellating would leave every ring's elements at their
   settled size — the fifth ring's blocks are 2.4x their dot size and don't depend
   on r at all, so a ring being born would appear full-blown as a clot of blocks
   and only then spread into a ring. Scaling the whole group takes the blocks, the
   halftone dots and the Riso grain with it, so a ring gained grows out of the
   tangent point as ITSELF, and a ring lost shrinks back into it the same way. */
let ringsState=null, ringsLive=null, ringsRAF=0;
function cancelRingsMorph(){ if(ringsRAF){ cancelAnimationFrame(ringsRAF); ringsRAF=0; } }
/* the transform that puts a settled ring at scale s about the tangent point */
const ringScaleAt=(g,s)=>'translate('+g.bx.toFixed(2)+' '+g.by.toFixed(2)+') scale('
  + s.toFixed(5)+') translate('+(-g.bx).toFixed(2)+' '+(-g.by).toFixed(2)+')';
function startRingsMorph(gEl, from, to){
  cancelRingsMorph();
  gEl.classList.remove('enter');              // the one-shot entrance must not re-fire on morph frames
  const stack=gEl.querySelector('.rstack');
  if(!stack){ ringsLive=to; return; }
  /* What to DRAW: every ring the new count wants, at its new radius, plus any ring
     the old count had beyond that — kept at its old radius so it has something to
     shrink from. Dropped rings are the innermost ones, so they land last in the
     markup and stay on top, which is where inner rings belong. */
  const n=Math.max(from.radii.length, to.radii.length);
  const drawn=[], specs=[];
  for(let i=0;i<n;i++){
    const rf=from.radii[i]||0, rt=to.radii[i]||0;
    const rd=rt||rf;                          // dropped rings are drawn at the size they leave from
    drawn.push(rd);
    specs.push({from:rf/rd, to:rt?1:0});      // gained: 0 -> 1. dropped: 1 -> 0. kept: rf/rt -> 1.
  }
  stack.innerHTML=inkedMarkup(ringsStack(to, drawn));
  const els=[...stack.querySelectorAll('.rring')];
  const put=e=>{ els.forEach((el,k)=>{
    const sp=specs[k]; const s=sp.from+(sp.to-sp.from)*e;
    el.setAttribute('transform', ringScaleAt(to, Math.max(0,s)));
  }); };
  const dur=560, ease=t=> 1-Math.pow(1-t,3), t0=performance.now();   // easeOutCubic (matches the CSS --eo)
  const step=(now)=>{
    if(!stack.isConnected){ ringsRAF=0; return; }   // a full repaint replaced the group; let the static one stand
    let p=(now-t0)/dur; if(p>1)p=1; const e=ease(p);
    put(e);
    ringsLive={...to, radii:specs.map((sp,k)=>drawn[k]*(sp.from+(sp.to-sp.from)*e)).filter(r=>r>0.5)};
    if(p<1){ ringsRAF=requestAnimationFrame(step); }
    else {
      ringsRAF=0; ringsLive=to;
      stack.innerHTML=inkedMarkup(ringsStack(to, to.radii));   // drop the dropped rings and every leftover transform
      addHitRects(plys[livePly]);
    }
  };
  step(t0);   // render frame 0 (the old sizes) synchronously, so the new static stack never flashes first
}
function syncRings(){
  const gEl=plys[livePly].querySelector('.hl[data-q="vacations"]');
  if(!gEl){ cancelRingsMorph(); ringsState=ringsLive=null; return; }
  const nl=ringsGeom(box());
  const prev=ringsState;
  if(!prev || gEl.classList.contains('enter')){ ringsState=ringsLive=nl; return; }   // first appearance / entrance owns it
  const from=ringsRAF ? ringsLive : prev;     // interrupt a running morph from its current on-screen state
  ringsState=nl;
  if(!ringsRAF && from.radii.length===nl.radii.length){ ringsLive=nl; return; }   // idle & same count (a re-roll, a format morph) -> nothing to glide
  if(reduceMotion()){ cancelRingsMorph(); ringsLive=nl; return; }                 // static swap already painted
  startRingsMorph(gEl, from, nl);
}
/* The base grid's morph-on-change. The CSS entrance owns the very first
   appearance (spread from centre); after that, when the shape or the density
   count changes, the freshly painted (denser) grid is pushed out from the
   centre again, so it reads as multiplying out of the middle. */
let baseGridSig=null, baseGridCount=0;
function syncBaseGrid(){
  const gEl=plys[livePly].querySelector('.hl[data-q="basegrid"]');
  if(!gEl){ baseGridSig=null; baseGridCount=0; return; }
  const isRings=ans('shape')==='circle';
  const inner=gEl.querySelector('g')||gEl;                  // ghosts inherit stroke from the inner group
  const els=[...gEl.querySelectorAll(isRings?'circle':'line')].filter(e=>!e.dataset.gtmp);
  const sig=ans('shape')+':'+(isChosen('density')?ans('density'):'default');
  const prevSig=baseGridSig, oldN=baseGridCount;
  baseGridSig=sig; baseGridCount=els.length;
  if(gEl.classList.contains('enter')) return;              // first appearance owns it (CSS gridGrow)
  if(prevSig===null || prevSig===sig) return;              // nothing changed (a re-roll, a format morph)
  const prevShape=prevSig.split(':')[0];
  if(prevShape!==ans('shape')) return;                     // shape swap: different geometry, no line-diff
  if(reduceMotion() || !oldN || !els.length) return;
  const newN=els.length;
  const SVGNS='http://www.w3.org/2000/svg', EASE='cubic-bezier(.33,1,.68,1)';
  const cx=parseFloat(els[0].getAttribute(isRings?'cx':'x1'));
  const cy=parseFloat(els[0].getAttribute(isRings?'cy':'y1'));
  const maxR=isRings
    ? Math.max(...els.map(c=>parseFloat(c.getAttribute('r'))))
    : Math.hypot(parseFloat(els[0].getAttribute('x2'))-cx, parseFloat(els[0].getAttribute('y2'))-cy);
  const originPx=cx+'px '+cy+'px';
  if(newN>oldN){
    /* DENSER: a line at index k coincides with an old one when (k*oldN)%newN===0
       — those hold still; every other line is NEW and grows out from the centre,
       so density is ADDED from the middle rather than the grid regenerating. */
    els.forEach((el,k)=>{
      const idx=isRings?k+1:k;
      if((idx*oldN)%newN===0) return;
      el.style.transformBox='view-box'; el.style.transformOrigin=originPx;
      const delay=isRings?(parseFloat(el.getAttribute('r'))/maxR)*260:(k/newN)*180;
      el.animate([{transform:'scale(0)'},{transform:'scale(1)'}],
                 {duration:460, delay, easing:EASE, fill:'backwards'});
    });
  } else if(newN<oldN){
    /* SPARSER (the reverse): survivors hold still; the OLD lines that are gone are
       rebuilt as ghosts and retract INTO the centre, then removed. */
    for(let i=(isRings?1:0); i<(isRings?oldN+1:oldN); i++){
      if((i*newN)%oldN===0) continue;                      // this old line survives -> already static in the new grid
      let el;
      if(isRings){
        el=document.createElementNS(SVGNS,'circle');
        el.setAttribute('cx',cx); el.setAttribute('cy',cy); el.setAttribute('r',(maxR*i/oldN).toFixed(2));
      } else {
        const a=i*2*Math.PI/oldN;
        el=document.createElementNS(SVGNS,'line');
        el.setAttribute('x1',cx); el.setAttribute('y1',cy);
        el.setAttribute('x2',(cx+maxR*Math.cos(a)).toFixed(2)); el.setAttribute('y2',(cy+maxR*Math.sin(a)).toFixed(2));
      }
      el.dataset.gtmp='1'; el.setAttribute('fill','none');
      inner.appendChild(el);
      el.style.transformBox='view-box'; el.style.transformOrigin=originPx;
      const delay=isRings?(1-i/oldN)*220:0;                // outer rings collapse first, rippling inward
      const anim=el.animate([{transform:'scale(1)'},{transform:'scale(0)'}],
                            {duration:420, delay, easing:EASE, fill:'forwards'});
      const clean=()=>el.remove();
      anim.onfinish=clean; setTimeout(clean, delay+420+300);   // fallback if the tab paused the animation

    }
  }
}
function paint(){
  const svg=buildSVG();
  if(svg===lastMarkup[livePly]) return;
  lastMarkup[livePly]=svg;
  plys[livePly].innerHTML=svg;
  addHitRects(plys[livePly]);
  markEntries(plys[livePly]);
  syncSnake();
  syncNode();
  syncRings();
  syncBaseGrid();
}
function draw(){
  if(rafId) return;
  rafId=requestAnimationFrame(()=>{ rafId=null; paint(); });
}
function drawNow(){
  if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
  paint();
}

/* Dissolve the whole sheet from its current inks to whatever buildSVG paints now
   — used for the colourway swap so the poster's two colours trade places with a
   soft crossfade instead of a hard cut. Same two-ply move as a format change, but
   no geometry morph: the swapped render fades in ON TOP of the old, which stays
   opaque underneath, so the board never shows through. */
function crossfadePoster(){
  const from=livePly, to=1-livePly;
  lastMarkup[to]=buildSVG();
  plys[to].innerHTML=lastMarkup[to];
  plys[to].style.zIndex=2; plys[from].style.zIndex=1;
  plys[from].classList.add('live');           // old holds full opacity beneath
  plys[to].classList.remove('live');
  plys[to].style.transition='none'; void plys[to].offsetWidth; plys[to].style.transition='';
  plys[to].classList.add('live');             // new fades in over it
  livePly=to;
  addHitRects(plys[to]);

}

function newSeed(){
  S.seed=(Math.random()*0xFFFFFFFF)>>>0;
  smokeCache={key:'',cells:[]};
  ASKED=pickQuestions(S.seed);
}

