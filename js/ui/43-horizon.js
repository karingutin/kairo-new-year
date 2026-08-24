/* =====================================================================
   THE HORIZON — one straight line, used for the decades question (10..100 years).

   It was a radial gauge, and the round shape was the wrong metaphor twice over:
   the question asks how much RUNWAY is left, and the answer draws a band of
   rectangles along the foot of the sheet that grows one column per decade (see
   barLayer). Nothing about either is circular. A line that runs left to right,
   inked behind the handle and a hairline ahead of it, says the same thing the
   poster layer says.

   The stops are laid across the FULL track — idx 0 on the left hug, idx n-1 on
   the right — rather than the gauge's (idx+1)/n fill fraction. That spends the
   whole width on the ten answers, so a stop is 0.9 of a cell wide instead of
   0.82, and the handle's travel reads as the whole horizon rather than as a
   quantity poured into a container.

   THERE IS NO LINE. The horizon is drawn as ten DOTS, one per decade, and a disc
   that glides along them: the dots behind the disc are inked, the ones ahead are
   hollow. Which is the same alphabet the board is already written in — the grid
   under everything is a dot field, and the answer circles of the other questions
   are the same mark at another size. A drawn track and a row of ticks was a
   slider borrowed from an operating system; this is the piece's own furniture.

   The disc is NOT one of the dots. It floats between them while the finger is
   down and lands on one when it is released, which is what lets the drag stay
   continuous — a control made only of ten states can only ever hop.

   Geometry, in cells, bottom-hugged by the same Q_INSET as every other control.
   The row is inset by one handle radius at each end, so what lands on the hug is
   the DISC's outer edge at the extremes — it is the biggest mark in the control
   and it is the silhouette the eye reads as the margin.
   ===================================================================== */
const BAR={
  fat:0.34,                 // the bar at ten years: short and thick
  thin:0.15,                // the bar at a hundred: long and drawn out
  valCells:0.66,            // the value, riding above the end of the bar
  /* The small type on the bar, and the ONE size behind both of its uses: the
     unit beside the readout ("years") and the named ends ("The week" /
     "Weekend"). 0.36, up from 0.30 (Karin, 16 Aug, on both bars: "a bit more
     readable, nothing drastic"). It is still the quietest thing on the card —
     under the hint at 0.382 and half the readout at 0.66 — so it reads without
     starting to compete with the answer, which is what the bar is for. */
  unitCells:0.36,
  valGap:0.26,              // bar top -> the value's baseline box
  rubber:0.05               // how far past either end the pull may stretch
};
/* HOW THICK THE BAR IS AT A GIVEN LENGTH.
   The whole answer to "it does not feel interactive" is in this one line. A
   control that only changes POSITION under the hand reads as dead, because
   nothing about it is being acted upon — the mark just relocates. A control
   that changes SHAPE reads as material: the hand is doing something to it.

   So the bar conserves its bulk. Pulled out it thins, let back it thickens, and
   at rest at ten years it is a short fat lozenge while at a hundred it is a long
   drawn wire. That also happens to say the right thing about the question: the
   further ahead you expect to see, the thinner the thing you are spreading over
   it. Past either end the pull thins it further still, on top of the rubber
   band, so the resistance is visible as well as felt. */
function barThick(p,fat,thin){
  const inside=Math.max(0,Math.min(1,p));
  let t=fat+(thin-fat)*inside;
  const over=p<0 ? -p : p>1 ? p-1 : 0;
  if(over) t*=Math.max(0.55, 1-over/BAR.rubber*0.45);
  return t;
}
/* WHERE THE HANDLE IS, as 0..1 across the track.
   Two sources: while a drag or a settle is running, barLive holds a CONTINUOUS
   position that does not sit on a stop — that is the whole point, the handle
   follows the finger rather than hopping. Otherwise it is derived from the
   answer. Keeping the live value on a module global rather than on the element
   is what lets the panel be rebuilt mid-drag (barTurn re-renders on every stop
   the finger crosses, so the poster's brick band grows as you pull) without the
   handle snapping back to the stop under it. */
let barLive=null;                                  // {qid, p} or null
let barRAF=0;
const barPosOf=(q,R)=> (barLive && barLive.qid===q.id)
  ? barLive.p : (R.n>1 ? R.idx/(R.n-1) : 0);
/* Past either end the drag keeps moving, but less and less — it asymptotes at
   BAR.rubber instead of stopping dead against the bound. A hard stop reads as
   the control being broken; a band reads as the end of the scale. */
function barRubber(p){
  const k=BAR.rubber;
  if(p<0) return -k*(1-1/(1+(-p)/k));
  if(p>1) return 1+k*(1-1/(1+(p-1)/k));
  return p;
}
/* the stops of a gauge question: {min,max,step,n,cur,idx,at,frac} */
function barRing(q){
  const D=derive();
  const min=val(q.min,D), max=val(q.max,D), step=q.step||1;
  const n=Math.round((max-min)/step)+1;
  const raw=ans(q.id);
  /* a saved answer that is not a number reads as UNANSWERED rather than being
     carried through the arithmetic — Math.round(NaN) is NaN and every clamp
     below it passes NaN along, so without this the corruption is permanent */
  const idx=(raw==null || !Number.isFinite(+raw)) ? 0
          : Math.max(0,Math.min(n-1,Math.round((raw-min)/step)));
  return {min,max,step,n,idx,cur:min+idx*step, frac:(idx+1)/n,
          at:i=>min+Math.max(0,Math.min(n-1,i))*step};
}
function barMarkup(q,c,PH,W){
  const R=barRing(q);
  const p=barPosOf(q,R);
  const fat=BAR.fat*c, thin=BAR.thin*c;
  /* the run, inset by half the FATTEST it can be, so the round cap's edge lands
     on the hug at the short end where the bar is thickest */
  const x0=Q_INSET*c+fat/2, x1=(W-Q_INSET)*c-fat/2;
  /* under the text at the question's Figma gap — value first, then the run;
     the 10-cell card's slack sits below the bar, not between it and the words */
  const valFs=BAR.valCells*c, unitFs=BAR.unitCells*c;
  const baseY=(textBottomCells(q)+ctrlGap(q.id)+BAR.valCells)*c;
  const y=baseY+BAR.valGap*c+fat/2;
  const x=x0+(x1-x0)*p;                            // NOT clamped: the rubber band shows
  const th=barThick(p,fat,thin);
  const unit=String(q.unit||'');
  /* the value rides the handle, so it has to be stopped from walking off the
     panel — an estimate of the run's width is enough, it only ever bites in the
     last stop at either end, and it is deliberately a touch GENEROUS so the
     clamp bites a hair early rather than a hair late */
  const vw=String(R.cur).length*0.60*valFs + 0.28*unitFs + unit.length*0.55*unitFs;
  const vlo=Q_INSET*c+vw/2, vhi=(W-Q_INSET)*c-vw/2;
  const vx=Math.max(vlo,Math.min(vhi,x));
  const px=v=>(+v).toFixed(1);
  /* a flow child: the viewBox crops from the value's box down to the bar's
     underside, and the gap to the words is a real flow margin */
  const vbY=(textBottomCells(q)+ctrlGap(q.id))*c, vbH=y+fat-vbY;
  let s='<svg class="bar" viewBox="0 '+vbY.toFixed(1)+' '+(W*c).toFixed(1)+' '+vbH.toFixed(1)+'"'
      + ' style="margin-top:'+(ctrlGap(q.id)*c).toFixed(1)+'px"'
      + ' tabindex="0" role="slider" aria-label="'+esc(String(val(q.title,derive())))+'"'
      + ' aria-valuemin="'+R.min+'" aria-valuemax="'+R.max+'" aria-valuenow="'+R.cur+'"'
      + ' aria-valuetext="'+R.cur+' '+esc(unit)+'"><g class="bbody">';
  s+='<g class="bar-line" data-qid="'+esc(q.id)+'" data-n="'+R.n+'"'
    + ' data-x0="'+px(x0)+'" data-x1="'+px(x1)+'"'
    + ' data-fat="'+px(fat)+'" data-thin="'+px(thin)+'"'
    + ' data-vlo="'+px(vlo)+'" data-vhi="'+px(vhi)+'">';
  /* the whole band is the target, not the bar — at a hundred years the bar is
     four pixels tall and a finger cannot land on that */
  s+='<rect class="bar-hit" x="'+px(Q_INSET*c)+'" y="'+px(baseY-valFs)+'"'
    + ' width="'+px((W-2*Q_INSET)*c)+'" height="'+px(y+fat-baseY+valFs)+'"/>';
  /* how far the material could still go */
  s+='<line class="bar-track" x1="'+px(x0)+'" y1="'+px(y)+'" x2="'+px(x1)+'" y2="'+px(y)+'"/>';
  /* THE MATERIAL. A round cap at each end, so at the shortest answer the bar is
     not a zero-length line but a fat dot on the left hug, and every intermediate
     state is a lozenge that has been drawn out of it. */
  s+='<line class="bar-run" x1="'+px(x0)+'" y1="'+px(y)+'" x2="'+px(x)+'" y2="'+px(y)+'"'
    + ' stroke-width="'+th.toFixed(2)+'" stroke-linecap="round"/>';
  /* Named ends instead of a number, when the question carries them (the
     week/weekend bar): one label hugging each end of the run, and no readout. */
  if(q.ends){
    s+='<text class="bar-end" x="'+px(Q_INSET*c)+'" y="'+px(baseY)+'" text-anchor="start" font-size="'+unitFs.toFixed(1)+'">'+esc(q.ends[0])+'</text>';
    s+='<text class="bar-end" x="'+px((W-Q_INSET)*c)+'" y="'+px(baseY)+'" text-anchor="end" font-size="'+unitFs.toFixed(1)+'">'+esc(q.ends[1])+'</text>';
  } else {
    s+='<text class="bar-val" x="'+px(vx)+'" y="'+px(baseY)+'" text-anchor="middle"'
      + ' font-size="'+valFs.toFixed(1)+'">'+esc(String(R.cur))
      + (unit ? '<tspan class="bar-unit" dx="0.28em" font-size="'+unitFs.toFixed(1)+'">'+esc(unit)+'</tspan>' : '')
      + '</text>';
  }
  s+='</g>';
  return s+'</g></svg>';
}
/* the stop the pointer is over, from its distance along the track */
function barIdxFromEvent(svg,clientX){
  const g=svg.querySelector('.bar-line'); if(!g) return 0;
  const rect=svg.getBoundingClientRect(), vb=svg.viewBox.baseVal;
  const vx=(clientX-rect.left)*(vb.width/rect.width);
  const x0=+g.dataset.x0, x1=+g.dataset.x1, n=+g.dataset.n;
  const p=(vx-x0)/(x1-x0);
  return Math.max(0,Math.min(n-1,Math.round(p*(n-1))));
}
/* the track's length in CLIENT pixels — the ruler a 1:1 drag is measured against */
function barTrackClient(svg){
  const g=svg.querySelector('.bar-line'); if(!g) return 1;
  const r=svg.getBoundingClientRect(), vb=svg.viewBox.baseVal;
  return Math.max(1,(+g.dataset.x1 - +g.dataset.x0)*(r.width/vb.width));
}
/* Move the handle, the run behind it and the value WITHOUT rebuilding the panel.
   This is the whole reason the drag feels continuous: renderSnake only runs when
   the answer actually changes stop, and every frame in between is three attribute
   writes on elements that are already there. */
function paintBar(p){
  const g=qsys.querySelector('.bar-line'); if(!g) return;
  const x0=+g.dataset.x0, x1=+g.dataset.x1;
  const x=x0+(x1-x0)*p;
  const run=g.querySelector('.bar-run'), val=g.querySelector('.bar-val');
  if(run){
    run.setAttribute('x2',x.toFixed(1));
    /* the length AND the thickness, every frame — the second one is the point */
    run.setAttribute('stroke-width', barThick(p,+g.dataset.fat,+g.dataset.thin).toFixed(2));
  }
  if(val) val.setAttribute('x',Math.max(+g.dataset.vlo,Math.min(+g.dataset.vhi,x)).toFixed(1));
}
/* Run the handle from one position to another. Used for the release settle and
   for taps and arrow keys, which differ only in their curve: a release is
   already at its destination and wants to LAND (easeOutCubic, short), a tap or a
   key jumped there and wants to arrive with a spring (easeOutBack, longer).
   The back curve is clamped to the track so its overshoot cannot carry the
   handle off the end at the top and bottom stops. */
function runBar(from,to,spring,then){
  cancelAnimationFrame(barRAF);
  if((reduceMotion && reduceMotion()) || Math.abs(to-from)<0.001){
    paintBar(to); if(then) then(); return;
  }
  const c1=1.7;
  const ease = spring ? t=>1+(c1+1)*Math.pow(t-1,3)+c1*Math.pow(t-1,2)
                      : t=>1-Math.pow(1-t,3);
  const dur = spring ? 380 : 260, t0=performance.now();
  paintBar(from);
  barRAF=requestAnimationFrame(function frame(now){
    let t=(now-t0)/dur; if(t>1) t=1;
    paintBar(Math.max(0,Math.min(1, from+(to-from)*ease(t))));
    if(t<1) barRAF=requestAnimationFrame(frame);
    else { paintBar(to); if(then) then(); }
  });
}
/* the stop-to-stop spring, called by barTurn after the panel has been rebuilt at
   the new value — so the digits already read the destination while the handle
   travels to it, exactly as the wheel behaves */
function spinBar(fromIdx,toIdx){
  const g=qsys.querySelector('.bar-line'); if(!g) return;
  const n=+g.dataset.n; if(n<2) return;
  runBar(fromIdx/(n-1), toIdx/(n-1), true);
}
/* set a bar question to an absolute stop index and repaint. noSpin is for dragging,
   where the selection already follows the finger stop by stop. */
function barTurn(qid,idx,noSpin){
  const q=BANK[qid]; if(!q) return;
  const R=barRing(q);
  const from=R.idx;
  /* The one door every value goes through, so it is the one place that has to
     hold. A NaN reaching this line writes NaN into S.answers, and from then on
     barRing derives its index from that NaN and hands the next NaN straight
     back — the question is corrupt for the rest of the session and the poster's
     brick band draws nothing. It gets here from a zero-sized layout: a panel
     rendered before the cell has a size makes the track zero pixels wide, and
     every position derived from it is 0/0. Clamping cannot catch that, since
     Math.min/max pass NaN through untouched. */
  if(!Number.isFinite(idx)) return;
  idx=Math.max(0,Math.min(R.n-1,idx));
  if(idx===from && S.touched[qid]) return;
  S.answers[qid]=R.at(idx); S.touched[qid]=true;
  if(q.onPick) q.onPick(); else draw();
  renderSnake();
  if(!noSpin) spinBar(from,idx);
}

