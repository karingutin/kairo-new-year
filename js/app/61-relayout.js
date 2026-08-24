/* ---------- wiring ---------- */
function relayout(){
  syncCell();                 // first: everything below is measured in cells
  syncSheet();
  placeChrome();
  placeLogo();                // before computeDots: the mark's box is reserved
  if(CONFIG.FORMAT_SWITCHER) syncFmtControl();
  computeDots();
  if(pinnedQ) placeCard();
  renderDots(); renderStatus(); draw();
}

/* DEV ONLY — jump straight to the last question (colour) so it can be tested
   without answering the whole flow. Not part of the real experience: set
   DEV_SKIP=false (or delete this block) before shipping. */
/* OFF (Karin, 17 Aug — recording). This is the one switch for BOTH bottom-left
   panels: the "last question" jump and the lattice blend/opacity tuner. The
   functions themselves are untouched — devSkipToLast() still exists and can be
   called from the console — it is only the on-screen controls that are gone.
   Flip back to true to get them. */
const DEV_SKIP=false;
function devSkipToLast(){
  if(!S.baseDone) finishBase();                 // dismiss the opening screen
  const last='colorway';
  ASKED.forEach(q=>{
    if(q.id===last) return;
    if(S.answers[q.id]===undefined) S.answers[q.id]=(q.default!==undefined)?q.default:(q.options?q.options[0]:1);
    S.touched[q.id]=true; S.done[q.id]=true; S.reached[q.id]=true;
  });
  S.done[last]=false; S.skipped[last]=false; S.reached[last]=true;
  snakeAt=null;                                  // flow points at the first unanswered = colour
  renderSnake(); draw();
}
if(DEV_SKIP){
  const b=document.createElement('button');
  b.textContent='→ last question (dev)';
  b.style.cssText='position:fixed;left:10px;bottom:10px;z-index:9999;font:11px/1 ui-monospace,monospace;'
    +'padding:6px 9px;background:#111;color:#fff;border:0;border-radius:4px;cursor:pointer;opacity:.55';
  b.addEventListener('mouseenter',()=>b.style.opacity='1');
  b.addEventListener('mouseleave',()=>b.style.opacity='.55');
  b.addEventListener('click',devSkipToLast);
  document.body.appendChild(b);

  /* DEV ONLY — Karin's tuning panel for the sixweek lattice: blend mode and
     opacity, live on the poster. Writes LATTICE_STYLE and repaints; whatever
     is dialled in here is what buildSVG emits, so the export carries it too.
     Once a pair is chosen, bake it into LATTICE_STYLE's defaults and this
     panel (with DEV_SKIP) never ships. */
  const panel=document.createElement('div');
  panel.style.cssText='position:fixed;left:10px;bottom:44px;z-index:9999;display:flex;gap:8px;'
    +'align-items:center;font:11px/1 ui-monospace,monospace;padding:6px 9px;background:#111;'
    +'color:#fff;border-radius:4px;opacity:.55';
  panel.addEventListener('mouseenter',()=>panel.style.opacity='1');
  panel.addEventListener('mouseleave',()=>panel.style.opacity='.55');
  const sel=document.createElement('select');
  ['normal','multiply','screen','overlay','darken','lighten','color-burn','color-dodge',
   'hard-light','soft-light','difference','exclusion','hue','saturation','color','luminosity']
    .forEach(m=>{ const o=document.createElement('option'); o.value=m; o.textContent=m; sel.appendChild(o); });
  sel.value=LATTICE_STYLE.blend;
  sel.style.cssText='font:inherit;background:#222;color:#fff;border:1px solid #444;border-radius:3px';
  const rng=document.createElement('input');
  rng.type='range'; rng.min='0'; rng.max='1'; rng.step='0.05'; rng.value=String(LATTICE_STYLE.opacity);
  rng.style.width='90px';
  const read=document.createElement('span');
  const label=document.createElement('span'); label.textContent='lattice';
  const show=()=>{ read.textContent=Math.round(LATTICE_STYLE.opacity*100)+'%'; };
  sel.addEventListener('input',()=>{ LATTICE_STYLE.blend=sel.value; draw(); });
  rng.addEventListener('input',()=>{ LATTICE_STYLE.opacity=+rng.value; show(); draw(); });
  show();
  panel.append(label,sel,rng,read);
  document.body.appendChild(panel);
}

