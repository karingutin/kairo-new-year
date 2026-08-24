/* =====================================================================
   THE WHEEL — the number question's control.

   A circle LARGER than the panel, centred below it, so what shows is the top
   cap of it: measured off the mock at radius 2.31 cells with its centre 0.79
   cells below the panel's lower edge, which is what puts the ±70° of arc on
   screen and no more. At 28° per step that is exactly five values — the one you
   have chosen and two either side, which is what the mock draws.

   It WRAPS. The mock shows 12 to the left of 01 with 02 selected, so the values
   run as a ring rather than a bar with two ends: turning past the first value
   arrives at the last. On a clock of alarms that is the truth of the thing.

   The chosen value is always at the top. You do not move a marker along a
   scale — you turn the scale until what you mean is at the top, which is why
   the number is set above the arc rather than beside a handle.
   ===================================================================== */
/* The wheel is a FIXED SIZE now. It used to be a fraction of the panel's
   height, which was fine while every panel was the same height and wrong the
   moment they were not: a short question would have got a small wheel and a
   long one a big one, for no reason a reader could see.

   So the radius is the constant, and the panel only decides where the centre
   goes. cy = panelHeight + 0.342 * r is not a taste number: 0.342 is cos(70
   degrees), so the panel's lower edge cuts the circle at exactly +-70 degrees
   whatever its height — which is what keeps five values on screen and no more.
   Every other measure is the mock's, divided by the mock's own radius. */
/* DERIVED, not chosen. The arc's widest point is where the panel's lower edge
   cuts it, at +-70 degrees, so its visible half-width is r*sin(70). Setting that
   equal to half the panel minus the hug makes the arc's ends land on exactly the
   same line as the title's first and last letters — the panel's one inset, obeyed
   by the wheel as well.

   Change Q_INSET or the panel's width and the wheel follows on its own. */
/* THE DIAL — reproduced from Figma node 2753:4337, NOT fitted to the panel.
   A FULL circle of a FIXED radius, hung so the active value sits at 12 o'clock
   just under the hint and the circle's lower part is CLIPPED by the panel edge.
   Every measure is the mock's own, over its 300px content:
     radius 122.3/300 = 0.4077 of the content; label ring 135.99/122.3 = 1.112 of
     the radius; active dot 11.139px and tick 6.188px as fractions of the radius;
     labels 14px; three numbers each side of the active one (seven on screen). */
const DIAL_R=0.4077*(PANEL_W.number-2*Q_INSET);   // 3.334 cells at width 9
const DIAL_LR=1.112;                               // label ring, as a multiple of r
const DIAL_SIDES=5;                                // numbers each side (±3 show; the
                                                  // extra ±2 are the clipped margin
                                                  // the spin turns through)
/* Gap from the words down to the wheel, in cells. Q_GAP, not the Figma 5px it
   was (Karin, 16 Aug: "the circle should go a few pixels down, so a bit more
   afar than the question itself and it's a bit more cropped") — 5px is a third
   of what every other control leaves, so the wheel sat almost on the hint.
   It buys BOTH halves of that note with one number, which is why it is the one
   that moved. The wheel's svg carries overflow:visible, so what actually crops
   the circle is the PANEL's foot, and the foot does not move: the panel's own
   height is unchanged (its content runs 7.18 cells of an 8-cell box, and this
   gap has ~0.8 of a cell of slack to spend before the box would round up to 9
   and hand the crop back). So every pixel the wheel steps down is a pixel more
   of it cut off at the bottom.
   Then Q_GAP + a third of a cell, on a second look ("the clock dial should go a
   bit more down"). Written as a step OFF Q_GAP rather than as a flat 0.74 so it
   still reads as the shared gap plus a deliberate push, and so it moves if the
   shared gap ever does. This is 0.74 of the ~1.2 cells of slack; the panel is
   still 8 cells. */
const DIAL_GAP=Q_GAP+1/3;
const DIAL={
  step:27,                              // degrees per value (mock ~0, 32, 55, 80)
  dragPerStep:0.62,                     // cells of pointer travel per value
  r:DIAL_R,
  labelR:DIAL_R*DIAL_LR,
  dotR:DIAL_R*0.0455,                   // active dot: 11.139/2 over 122.3
  tickR:DIAL_R*0.0253,                  // inactive tick: 6.188/2 over 122.3
  innerRatio:0.62,                      // a second concentric ring inside the arc
  labelCells:0.382,                     // labels 14px = 14/36.68 cells
  cx:PANEL_W.number/2                   // the panel's horizontal centre
};
/* The dial is clipped, not fitted, so this only needs to be large enough that the
   number question's own arithmetic never shrinks its pinned panel. */
const DIAL_CELLS=DIAL_R;
const dialSteps=()=>DIAL_SIDES;

/* the ring of values for a number question, wrapping at both ends */
function dialRing(q){
  const D=derive();
  const min=val(q.min,D), max=val(q.max,D);
  const n=max-min+1, cur=Math.max(min,Math.min(max,Math.round(ans(q.id))));
  return {min, max, n, cur, at:k=>min+(((cur-min+k)%n)+n)%n};
}

function dialMarkup(q,c,PH,W){
  const R=dialRing(q);
  const rC=DIAL_R;                                  // FIXED radius, from Figma
  const ts=DIAL.labelCells*c;                       // labels 14px
  /* how far the words reach, so the circle hangs just under the hint. The circle
     then runs well past the panel foot and the panel (overflow:hidden) clips it. */
  const ps=panelSize(q);
  const textB=Q_INSET + ps.titleLines*Q_LH + (ps.hintLines?Q_HGAP+ps.hintLines*Q_HLH:0);
  const labelR=rC*DIAL_LR;
  const cx=(W/2)*c, cy=(textB + DIAL_GAP + DIAL.labelCells/2 + labelR)*c;
  const r=rC*c, lr=labelR*c;
  const pt=(rad,deg)=>{const a=(deg-90)*Math.PI/180;
    return [cx+rad*Math.cos(a), cy+rad*Math.sin(a)];};
  /* a flow child, cropped to the wheel's TOP HALF: the viewBox runs from the
     twelve-o'clock value down to the horizontal diameter (cy), so the lower
     half is clipped by the svg's own viewport — no panel foot needed for it */
  const vbY=(textB+DIAL_GAP)*c, vbH=cy-vbY;
  let s='<svg class="dial" viewBox="0 '+vbY.toFixed(1)+' '+(W*c).toFixed(1)+' '+vbH.toFixed(1)+'"'
      + ' style="margin-top:'+(DIAL_GAP*c).toFixed(1)+'px"'
      + ' tabindex="0" role="slider" aria-label="'+esc(q.title)+'"'
      + ' aria-valuemin="'+R.min+'" aria-valuemax="'+R.max+'" aria-valuenow="'+R.cur+'"><g class="cbody">';
  /* the FULL circle outline — the panel clips its lower part, exactly as the mock */
  s+='<circle class="dial-arc" cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'"'
    + ' r="'+r.toFixed(1)+'" fill="none" stroke-width="'+Math.max(1,c*0.02).toFixed(2)+'"/>';
  /* a second concentric ring inside the arc (see reference) */
  s+='<circle class="dial-arc" cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'"'
    + ' r="'+(r*DIAL.innerRatio).toFixed(1)+'" fill="none" stroke-width="'+Math.max(1,c*0.02).toFixed(2)+'"/>';
  /* The selection sits at twelve o'clock, but the dot is no longer a separate
     fixed mark: every number carries its OWN circle inside the spinning ring.
     As the ring turns the circle nearing the top grows to the strong colour and
     the one leaving shrinks + fades back to the idle grey (see spinDial). At rest
     the k=0 circle is the big one, so a static first paint already reads right. */
  const K=DIAL_SIDES;
  s+='<g class="dial-ring" data-cx="'+cx.toFixed(1)+'" data-cy="'+cy.toFixed(1)+'"'
    + ' data-step="'+DIAL.step+'" data-rmin="'+(DIAL.tickR*c).toFixed(2)+'"'
    + ' data-rmax="'+(DIAL.dotR*c).toFixed(2)+'">';
  for(let k=-K;k<=K;k++){
    const deg=k*DIAL.step, [lx,ly]=pt(lr,deg), lab=pad2(R.at(k)), [tx,ty]=pt(r,deg);
    const on=(k===0);
    /* the circle beneath the number; spinDial tweens its r + fill as it turns */
    s+='<circle class="'+(on?'dial-dot':'dial-tick')+'" data-deg="'+deg.toFixed(2)+'"'
      + ' cx="'+tx.toFixed(1)+'" cy="'+ty.toFixed(1)+'"'
      + ' r="'+((on?DIAL.dotR:DIAL.tickR)*c).toFixed(1)+'"/>';
    if(on){
      s+='<text class="dial-val" x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'"'
        + ' dominant-baseline="central" font-size="'+ts.toFixed(1)+'">'+lab+'</text>';
      continue;
    }
    /* rotated to the tangent, so the ring of numbers reads as a dial face */
    s+='<text class="dial-lab" x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'"'
      + ' text-anchor="middle" dominant-baseline="central"'
      + ' font-size="'+ts.toFixed(1)+'"'
      + ' transform="rotate('+deg.toFixed(1)+' '+lx.toFixed(1)+' '+ly.toFixed(1)+')">'+lab+'</text>';
    /* generous invisible tap target so a click anywhere on the number selects it,
       not just a dead-centre hit (neighbours are ~1.75 cells apart, so 0.6 is safe) */
    s+='<circle class="dial-hit" data-step="'+k+'" cx="'+lx.toFixed(1)+'" cy="'+ly.toFixed(1)+'"'
      + ' r="'+(c*0.6).toFixed(1)+'"/>';
  }
  s+='</g>';
  return s+'</g></svg>';
}

/* Turn the wheel by `k` values, wrapping, and repaint. `noSpin` is for dragging,
   where the numbers already follow the finger and a per-step spin would fight it. */
function dialTurn(qid,k,noSpin){
  const q=BANK[qid]; if(!q) return;
  const R=dialRing(q);
  S.answers[qid]=R.at(k); S.touched[qid]=true;
  if(q.onPick) q.onPick(); else draw();
  renderSnake();
  if(!noSpin) spinDial(k);
}
/* THE CLOCK TURNS, it does not cut. After the wheel repaints with the new value
   at the top, the ring of numbers is spun into place from k steps away — the
   answer rotates up to twelve o'clock like a camera-mode dial. On a timer
   (requestAnimationFrame), never a CSS animation, so a backgrounded tab cannot
   freeze it mid-turn; reduced-motion skips straight to rest. From now on every
   "clock" control turns this way. */
let dialSpinRAF=0;
/* a colour string ('#abc', '#aabbcc' or 'rgb(...)') to an [r,g,b] triple, so the
   circle's fill can be mixed between the idle grey and the strong colour */
function dialRGB(v){ v=(v||'').trim(); let m;
  if(m=v.match(/^#([0-9a-f]{3})$/i)) return [0,1,2].map(i=>parseInt(m[1][i]+m[1][i],16));
  if(m=v.match(/^#([0-9a-f]{6})$/i)) return [0,2,4].map(i=>parseInt(m[1].substr(i,2),16));
  if(m=v.match(/rgba?\(([^)]+)\)/i)) return m[1].split(',').slice(0,3).map(x=>parseFloat(x));
  return null;
}
const dialMix=(a,b,t)=>'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')+')';
function spinDial(k){
  cancelAnimationFrame(dialSpinRAF);
  const ring=qsys.querySelector('.dial-ring'); if(!ring) return;
  const cx=+ring.dataset.cx, cy=+ring.dataset.cy;
  const step=+ring.dataset.step, rmin=+ring.dataset.rmin, rmax=+ring.dataset.rmax;
  const dots=ring.querySelectorAll('.dial-dot,.dial-tick');
  const cs=getComputedStyle(ring);
  const cIdle=dialRGB(cs.getPropertyValue('--q-past')),
        cOn=dialRGB(cs.getPropertyValue('--q-text'));
  /* At any ring rotation, size + fill each circle by how near its number is to the
     top: 1 at twelve o'clock, 0 a full step away. The circle arriving grows to the
     strong colour, the one leaving shrinks + brightens back to grey — this is the
     whole of the "both move" behaviour, and at deg=0 it lands exactly at rest. */
  const paint=deg=>{
    dots.forEach(el=>{
      const d=((+el.dataset.deg+deg)%360+540)%360-180;   // signed angle to top
      const a=Math.max(0,1-Math.abs(d)/step);
      el.setAttribute('r',(rmin+(rmax-rmin)*a).toFixed(2));
      if(cIdle&&cOn) el.setAttribute('fill',dialMix(cIdle,cOn,a));
    });
  };
  if(!k){ paint(0); return; }
  if(reduceMotion && reduceMotion()){ ring.setAttribute('transform','rotate(0 '+cx+' '+cy+')'); paint(0); return; }
  const from=k*step;                            // start k steps away, settle at 0
  /* easeOutBack: overshoots the top by a few degrees then settles, so the arriving
     circle grows past, dips, and springs back to full — the requested springy pop. */
  const c1=2.2, back=t=>1+(c1+1)*Math.pow(t-1,3)+c1*Math.pow(t-1,2);
  const dur=440, t0=performance.now();
  ring.setAttribute('transform','rotate('+from.toFixed(2)+' '+cx+' '+cy+')');
  paint(from);
  dialSpinRAF=requestAnimationFrame(function frame(now){
    let t=(now-t0)/dur; if(t>1) t=1;
    const deg=from*(1-back(t));
    ring.setAttribute('transform','rotate('+deg.toFixed(2)+' '+cx+' '+cy+')');
    paint(deg);
    if(t<1) dialSpinRAF=requestAnimationFrame(frame);
    else { ring.setAttribute('transform','rotate(0 '+cx+' '+cy+')'); paint(0); }
  });
}

