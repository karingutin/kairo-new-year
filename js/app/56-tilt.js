/* ---------------------------------------------------------------------
   Making the board feel physical: the world pans and tilts a little with
   the pointer, so moving right reveals more space on the right. The status
   strip and reset sit outside the world and never move; the KAIRO mark is
   inside it, so it travels with the grid and stays flush to the cells.
   Motion is eased toward its target rather than snapped, and it freezes
   while a card is open so the controls stay still under the cursor.
   --------------------------------------------------------------------- */
const MOTION = {
  pan: 1.5,        // how many grid cells the world may slide each way
  tilt: 1.15,      // degrees of rotation each way
  ease: 0.075      // 0 = never arrives, 1 = snaps
};
const world=document.getElementById('world');
const still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let aimX=0, aimY=0, curX=0, curY=0, follow=true, motionRAF=null;

function pointerAim(e){
  if(!follow) return;
  aimX=(e.clientX/window.innerWidth)*2-1;      // -1 .. 1
  aimY=(e.clientY/window.innerHeight)*2-1;
  if(!motionRAF) motionRAF=requestAnimationFrame(driftWorld);
}
function driftWorld(){
  motionRAF=null;
  curX+=(aimX-curX)*MOTION.ease;
  curY+=(aimY-curY)*MOTION.ease;
  /* the real cell, not the sheet's width over a magic 18 — that number was an
     approximation of the old format's column count and would now be wrong */
  const cell=cellSize() || 24;
  const dx=-curX*MOTION.pan*cell;               // pointer right -> world slides left
  const dy=-curY*MOTION.pan*cell;
  world.style.transform=
    'translate3d('+dx.toFixed(2)+'px,'+dy.toFixed(2)+'px,0)'+
    ' rotateY('+(curX*MOTION.tilt).toFixed(3)+'deg)'+
    ' rotateX('+(-curY*MOTION.tilt).toFixed(3)+'deg)';
  if(Math.abs(aimX-curX)>0.0005||Math.abs(aimY-curY)>0.0005)
    motionRAF=requestAnimationFrame(driftWorld);
}
/* STATIC VIEW: the board no longer drifts with the pointer — it stays centred and
   perfectly still. Flip STATIC_VIEW to false to bring the parallax back. */
const STATIC_VIEW=true;
if(!still && !STATIC_VIEW){
  window.addEventListener('pointermove',pointerAim,{passive:true});
  window.addEventListener('pointerleave',()=>{ if(follow){ aimX=aimY=0;
    if(!motionRAF) motionRAF=requestAnimationFrame(driftWorld); } });
}
if(STATIC_VIEW){ follow=false; curX=curY=aimX=aimY=0; world.style.transform='none'; }
/* Hold the board still while a question is open. Clearing `follow` alone is not
   enough: the easing would keep travelling toward the last aim. Park the target
   on the current value so it stops exactly where it stands. */
const holdWorld=on=>{
  follow=!on;
  if(on){ aimX=curX; aimY=curY; }
};

