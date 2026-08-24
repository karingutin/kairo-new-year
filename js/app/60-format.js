/* =====================================================================
   FORMAT — the shape of the poster

   changeFormat is the only way in, and it does one thing: it hands CSS two
   numbers. The sheet's box and its four bounding lines are both derived from
   those two numbers, so one transition carries them across together and they
   cannot fall out of step.

   Everything else on screen is deliberately NOT derived from them. The grid is
   a function of the viewport alone, the corner chrome is snapped to the grid,
   and the dots are placed clear of every format's footprint at once. So a
   format change moves exactly two things — the four edges of the sheet, and
   the artwork inside them — over an interface that stays completely still.
   That is the whole design, and it is why this function is short.
   ===================================================================== */
const MORPH_MS=620;
let morphTimer=null;

/* The sheet's box, in pixels, SNAPPED to the grid.
   Not centred arithmetically: the left edge is placed a whole number of cells
   from the origin, so all four edges land on grid lines whether the format has
   an even or an odd number of cells. An odd count therefore sits half a cell
   off centre — about ten pixels, invisible — and in exchange the grid keeps
   bounding the sheet exactly, which is the thing you can actually see. */
function syncSheet(){
  const F=FMT(), c=cellSize(), o=gridOrigin(), S2=sheetCols(F);
  root.style.setProperty('--sheet-w', F.cols*c+'px');
  root.style.setProperty('--sheet-h', F.rows*c+'px');
  root.style.setProperty('--sheet-x', (o.x+S2.left*c)+'px');
  root.style.setProperty('--sheet-y', (o.y+S2.top*c)+'px');
  /* THE SHEET HAS TWO HEIGHTS and both are written every time, because the one
     that is SHOWN is chosen by CSS (body.made), not here — that is what lets the
     ending be a transition on a class rather than a repaint. --sheet-hm is the
     made sheet, longer by the record's rows; --ply-h is the poster layer's own
     height, which is ALWAYS the long one.

     The layer being permanently longer than the frame is the whole mechanism.
     The poster is stretched to fill its layer (preserveAspectRatio="none"), so a
     layer that grew with the frame would stretch the artwork by 10% for the
     length of the transition and snap back at the end. Instead the layer is cut
     once, at its final proportions, hangs two cells past the foot of the sheet
     from the very first paint, and #frame's overflow hides the part that has not
     been earned yet. Growing the frame does not resize anything: it UNCOVERS. */
  root.style.setProperty('--sheet-hm', (F.rows+RECORD_ROWS)*c+'px');
  root.style.setProperty('--ply-h',    (F.rows+RECORD_ROWS)*c+'px');
  /* ...and how much of that is still to be earned. The frame stands at its made
     height at all times and the record is CLIPPED off the bottom of it until the
     poster is made; this is the depth of that cut. See #frame. */
  root.style.setProperty('--sheet-cut', RECORD_ROWS*c+'px');
  placeReset();
}

/* WHERE RESET STANDS ONCE THE SHEET HAS GROWN.

   It sits a little below the sheet's bottom bounding line while the asking is
   on. The made sheet brings that line down a cell and it came to rest straight
   through the word (Karin, 17 Aug), so past Create the label is placed against
   the LINE instead of against the screen: its foot half a cell clear above it,
   or where it already was, whichever is lower — on a wide window the line is far
   enough up that nothing needs to move at all.

   AN INLINE LENGTH, NOT A RULE. The resting position is CSS's and is left
   alone — it is read once, on the first call, and becomes the floor. Only the
   made position is written, and it is cleared again on the way out, so there is
   exactly one place either value can come from at any moment. The transition on
   #reset is what makes it travel rather than jump. */
let resetRest=null;
function placeReset(){
  if(!resetBtn) return;
  if(resetRest===null && !resetBtn.style.bottom)
    resetRest=parseFloat(getComputedStyle(resetBtn).bottom)||0;
  if(!posterDone){ resetBtn.style.bottom=''; return; }
  const c=cellSize(), o=gridOrigin(), F=FMT(), S2=sheetCols(F);
  const line=(o.y+S2.top*c)+(F.rows+RECORD_ROWS)*c;
  resetBtn.style.bottom=Math.max(resetRest, window.innerHeight-line+0.5*c)+'px';
}
/* the format's own outline, fitted inside a cap x cap box */
const glyph=(F,cap)=>{
  const s=cap/Math.max(F.cols,F.rows);
  return 'width:'+Math.round(F.cols*s)+'px;height:'+Math.round(F.rows*s)+'px';
};

function buildFmtControl(){
  fmtBtn.innerHTML='<i></i><b></b>';
  fmtMenu.innerHTML=FORMATS.map(F=>
    '<button type="button" role="menuitemradio" data-fmt="'+F.id+'" aria-checked="false">'
    + '<span class="gbox"><i style="'+glyph(F,18)+'"></i></span>'
    + '<span class="lbl">'+F.label+'<span class="use">'+F.use+'</span></span>'
    + '<span class="rat">'+F.ratio+'</span></button>').join('');
}
/* The glyph is resized rather than replaced, so its own 620ms transition runs
   and the control arrives at the new shape alongside the poster. */
function syncFmtControl(){
  const F=FMT(), i=fmtBtn.querySelector('i');
  i.style.cssText=glyph(F, Math.max(13, Math.min(21, FMT_CELLS*cellSize()*0.44)));
  fmtBtn.querySelector('b').textContent=F.ratio;
  fmtBtn.setAttribute('aria-label','Poster format: '+F.label+' '+F.ratio);
  for(const b of fmtMenu.querySelectorAll('button[data-fmt]'))
    b.setAttribute('aria-checked', String(b.dataset.fmt===S.format));
}

const fmtOpen=()=>fmtMenu.classList.contains('open');
function openFmtMenu(){
  /* the display:none takes care of a real pointer, which can never reach an
     element with no box — this guard is for anything that calls the function
     directly, so "disabled" holds even past the click handler that normally
     gates it */
  if(!CONFIG.FORMAT_SWITCHER) return;
  fmtMenu.classList.add('open');
  fmtBtn.setAttribute('aria-expanded','true');
  holdWorld(true);                       // the board holds still under the menu
  const first=fmtMenu.querySelector('button[aria-checked=true]')||fmtMenu.querySelector('button');
  if(first) setTimeout(()=>first.focus(),40);
}
function closeFmtMenu(back){
  if(!fmtOpen()) return;
  fmtMenu.classList.remove('open');
  fmtBtn.setAttribute('aria-expanded','false');
  if(!openQ) holdWorld(false);                // never unfreeze under an open card
  if(back) fmtBtn.focus();
}

function changeFormat(id){
  if(!FMTS[id] || id===S.format) return;
  S.format=id;

  /* The incoming poster goes into the idle layer at its own viewBox and fades
     in ON TOP of the outgoing one, which keeps full opacity underneath until
     it is completely covered. See the .ply comment: fading both at once would
     let the board show through the pair and dim the poster mid-change. */
  const from=livePly, to=1-livePly;
  lastMarkup[to]=buildSVG();              // keep paint()'s cache honest
  plys[to].innerHTML=lastMarkup[to];
  plys[to].style.zIndex=2;
  plys[from].style.zIndex=1;
  plys[from].classList.add('live');       // stays opaque underneath

  /* Reset the incoming layer to fully transparent with the transition
     suppressed for one frame, so a rapid second change — before the previous
     one has finished tidying up — still starts from zero and dissolves. Adding
     the class to a layer that already had it would be a no-op, and the swap
     would land as a hard cut. */
  plys[to].classList.remove('live');
  plys[to].style.transition='none';
  void plys[to].offsetWidth;
  plys[to].style.transition='';
  plys[to].classList.add('live');
  livePly=to;

  /* .morphing arms the transitions, then the new geometry goes in. The class
     has to be on before the lengths change, or there is nothing to interpolate
     from. Nothing else on the board is derived from the sheet's box, so
     nothing else moves. */
  world.classList.add('morphing');
  syncSheet();
  syncFmtControl();
  submit('partial');                      // the format is part of the record

  /* The one loose end: an open card prefers to sit clear of the sheet, and the
     sheet has just changed shape under it. Re-place it once the edges have
     arrived rather than chase them — the card is pinned to a dot that has not
     moved, so it stays put and correct throughout. */
  clearTimeout(morphTimer);
  morphTimer=setTimeout(()=>{
    morphTimer=null;
    world.classList.remove('morphing');   // resizes go back to being instant
    /* the incoming layer now covers it completely, so dropping the outgoing one
       is invisible — and it has to be dropped, or the next change would find
       both layers opaque and cut instead of dissolving */
    plys[1-livePly].classList.remove('live');
    if(pinnedQ) placeCard();
    renderDots();                         // only to re-check what the card buries
  }, MORPH_MS+40);
}

fmtBtn.addEventListener('click',e=>{
  e.stopPropagation();
  fmtOpen() ? closeFmtMenu() : openFmtMenu();
});
fmtMenu.addEventListener('click',e=>{
  const b=e.target.closest('button[data-fmt]');
  if(!b) return;
  closeFmtMenu(true);
  changeFormat(b.dataset.fmt);
});
/* a click anywhere else shuts the menu, but must not also count as a click on
   the board behind it */
document.addEventListener('click',e=>{
  if(fmtOpen() && !fmtMenu.contains(e.target) && e.target!==fmtBtn) closeFmtMenu();
});
fmtMenu.addEventListener('keydown',e=>{
  const items=[...fmtMenu.querySelectorAll('button[data-fmt]')];
  const at=items.indexOf(document.activeElement);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    const n=(at+(e.key==='ArrowDown'?1:items.length-1)+items.length)%items.length;
    items[n].focus();
  }
});

