/* =====================================================================
   TEMPORARY — Karin's own size/position controls for two poster layers:
   the radial block (febdays, question 2) and the node/spider (alarms,
   question 3). NOT for visitors: sits plainly over the interface, same as
   the colour panel in 79-dev-colors.js.

   Two ways to change each layer's Vertical value, both writing to the same
   POSTER_DEV_KEY in localStorage (see posterDevOverrides() in js/00-core.js,
   which both layers read every time they draw) and both calling draw() so
   the change shows immediately:
     - the Vertical SLIDER in the panel;
     - grabbing the layer DIRECTLY ON THE POSTER and dragging it up or down
       (see startCanvasDrag below) — releasing the pointer is the save, the
       same way letting go of a colour swatch already commits it.
   Size stays slider-only — dragging a scale out of a 2D vertical drag is a
   separate gesture (pinch, or a corner handle) this pass doesn't add.

   To remove the whole feature: delete this file, its <script> tag in
   index.html, POSTER_DEV_KEY/POSTER_DEV_DEFAULTS/posterDevOverrides() in
   js/00-core.js, and the dev.* reads in js/poster/21-node.js and
   js/poster/26b-radial-block.js.
   ===================================================================== */
(function(){
  const panel=document.createElement('div');
  panel.id='devPosterPanel';
  panel.style.cssText='position:fixed;right:12px;bottom:12px;z-index:99999;'
    +'background:#fff;border:1px solid #ccc;border-radius:8px;padding:10px;'
    +'font:12px/1.3 system-ui,sans-serif;color:#111;box-shadow:0 2px 10px rgba(0,0,0,.15);'
    +'width:220px';

  function readDev(){
    try{ return {...POSTER_DEV_DEFAULTS, ...JSON.parse(localStorage.getItem(POSTER_DEV_KEY)||'{}')}; }
    catch(e){ return {...POSTER_DEV_DEFAULTS}; }
  }
  function writeDev(dev){ localStorage.setItem(POSTER_DEV_KEY, JSON.stringify(dev)); }

  const liveSliders=[];   // {key,input,val,fmt} — so Reset can refresh them in place
  function slider(label,key,min,max,step,fmt){
    const dev=readDev();
    const wrap=document.createElement('div');
    wrap.style.cssText='margin:6px 0';
    const row=document.createElement('div');
    row.style.cssText='display:flex;justify-content:space-between';
    const tag=document.createElement('span'); tag.textContent=label;
    const val=document.createElement('span'); val.textContent=fmt(dev[key]);
    row.appendChild(tag); row.appendChild(val); wrap.appendChild(row);
    const input=document.createElement('input');
    input.type='range'; input.min=min; input.max=max; input.step=step; input.value=dev[key];
    input.style.cssText='width:100%';
    input.addEventListener('input',()=>{
      const d=readDev(); d[key]=parseFloat(input.value); writeDev(d);
      val.textContent=fmt(d[key]);
      if(typeof draw==='function') draw();
    });
    wrap.appendChild(input);
    liveSliders.push({key,input,val,fmt});
    return wrap;
  }

  function groupLabel(text){
    const h=document.createElement('div');
    h.textContent=text;
    h.style.cssText='font-weight:600;margin-top:8px';
    return h;
  }

  panel.appendChild(groupLabel('Radial block (Q2)'));
  panel.appendChild(slider('Size','radialScale',0.5,2,0.05,v=>v.toFixed(2)+'×'));
  panel.appendChild(slider('Vertical','radialY',-0.2,0.2,0.01,v=>v.toFixed(2)));
  panel.appendChild(groupLabel('Node / spider (Q3)'));
  panel.appendChild(slider('Size','nodeScale',0.5,2,0.05,v=>v.toFixed(2)+'×'));
  panel.appendChild(slider('Vertical','nodeY',-0.2,0.2,0.01,v=>v.toFixed(2)));

  const reset=document.createElement('button');
  reset.type='button'; reset.textContent='Reset both';
  reset.style.cssText='margin-top:8px;width:100%;padding:6px 0;border:1px solid #ccc;'
    +'border-radius:6px;background:#fff;cursor:pointer;font:12px system-ui,sans-serif';
  reset.addEventListener('click',()=>{
    localStorage.removeItem(POSTER_DEV_KEY);
    liveSliders.forEach(s=>{
      const d=POSTER_DEV_DEFAULTS[s.key];
      s.input.value=d; s.val.textContent=s.fmt(d);
    });
    if(typeof draw==='function') draw();
  });
  panel.appendChild(reset);

  const hint=document.createElement('div');
  hint.textContent='Or drag either one directly on the poster.';
  hint.style.cssText='margin-top:8px;color:#777;font-size:11px';
  panel.appendChild(hint);

  document.body.appendChild(panel);

  /* ---- drag directly on the poster ----
     data-q="febdays" is the radial block, data-q="alarms" the node/spider —
     the same two groups the sliders above already move. A pointerdown on
     either starts the drag; every pointermove until release updates that
     layer's Vertical value (both the CSS var — no, the localStorage entry —
     and its slider, so the two controls never disagree) from how far the
     pointer has moved as a FRACTION of the sheet's own on-screen height,
     which is what makes a screen-pixel drag match posterDevOverrides'
     0..1-of-the-sheet unit. Releasing the pointer is the save: writeDev runs
     on every move, so by the time pointerup fires the position already is
     what's in localStorage. */
  const DRAG_KEY_BY_Q={febdays:'radialY', alarms:'nodeY'};
  let dragging=null;   // {key, startY, startVal}
  document.addEventListener('pointerdown',e=>{
    const g=e.target.closest('[data-q="febdays"],[data-q="alarms"]');
    if(!g) return;
    const key=DRAG_KEY_BY_Q[g.dataset.q];
    dragging={key, startY:e.clientY, startVal:readDev()[key]};
    e.preventDefault();
  });
  document.addEventListener('pointermove',e=>{
    if(!dragging) return;
    const sheet=document.getElementById('frame');
    const sheetH=sheet ? sheet.getBoundingClientRect().height : window.innerHeight;
    const frac=(e.clientY-dragging.startY)/sheetH;
    const s=liveSliders.find(x=>x.key===dragging.key);
    const min=parseFloat(s.input.min), max=parseFloat(s.input.max);
    const v=Math.max(min,Math.min(max, dragging.startVal+frac));
    const d=readDev(); d[dragging.key]=v; writeDev(d);
    s.input.value=v; s.val.textContent=s.fmt(v);
    if(typeof draw==='function') draw();
  });
  document.addEventListener('pointerup',()=>{ dragging=null; });
})();
