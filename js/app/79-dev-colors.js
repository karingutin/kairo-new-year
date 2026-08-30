/* =====================================================================
   TEMPORARY — Karin's own colour pickers, while she designs the next pass
   of the landing screen. NOT for visitors: sits plainly over the interface
   once loaded (27 Aug), but now gated behind ?dev (30 Aug, see the guard
   just below) so a plain visit never loads it at all — no secrecy attempted
   beyond that, just meant to be deleted once the design settles.

   Three independent controls:
     Grid   --gridline-dev on :root, the background grid squares. Session-only
            (not persisted) — see css/00-ground.css's .gridlayer rule.
     Star   --star-dev on :root, the aperture's rays and hour-marks, read live
            every frame — see js/app/50-landing.js.
     K/A/I/R/O/START   --kmark-color on that tile's own element (or the START
            button, which carries data-letter="START" too), the four corner
            marks framing it. PERSISTED to localStorage (KMARK_DEV_KEY) so the
            choice survives a reload — see kmarkDevColors() in 50-landing.js,
            which reads the same key when the mark is (re)built.

   To remove the whole feature: delete this file, its <script> tag in
   index.html, the --gridline-dev / --star-dev fallbacks in
   css/00-ground.css and js/app/50-landing.js, and the --kmark-color fallback
   in css/20-aperture.css's .kmark rule plus the KMARK_DEV_KEY block in
   js/app/50-landing.js.
   ===================================================================== */
(function(){
  /* BEHIND A FLAG, for exactly the reason ?skip is (see js/app/72-boot.js): a
     switch in the source is one someone forgets to turn back off before
     sharing, and this one would put the working tools in front of every
     visitor. A query string cannot travel by accident.
       https://<the site>/?dev                                              */
  if(!/(^|[?&])dev(=|&|$)/.test(location.search)) return;

  const SWATCHES=(typeof BANK_COLORS!=='undefined' && BANK_COLORS.length)
    ? BANK_COLORS
    : ['#FF710B','#0C995A','#8ED316','#A90F3C','#FF4FFC','#F9C816'];
  const KMARK_KEY='kairoKmarkDev';
  const LETTERS=['K','A','I','R','O','START'];

  function readKmarkDev(){
    try{ return JSON.parse(localStorage.getItem(KMARK_KEY)||'{}'); }
    catch(e){ return {}; }
  }
  function writeKmarkDev(dev){
    localStorage.setItem(KMARK_KEY, JSON.stringify(dev));
  }

  const panel=document.createElement('div');
  panel.id='devColorPanel';
  panel.style.cssText='position:fixed;left:12px;bottom:12px;z-index:99999;'
    +'background:#fff;border:1px solid #ccc;border-radius:8px;padding:10px;'
    +'font:12px/1.3 system-ui,sans-serif;color:#111;box-shadow:0 2px 10px rgba(0,0,0,.15)';

  /* a swatch row bound to a plain :root CSS var (Grid / Star) */
  function cssVarRow(label,cssVarName){
    const wrap=document.createElement('div');
    wrap.style.cssText='display:flex;align-items:center;gap:6px;margin:4px 0';
    const tag=document.createElement('span');
    tag.textContent=label; tag.style.cssText='width:40px;flex:none';
    wrap.appendChild(tag);
    SWATCHES.forEach(hex=>{
      const b=document.createElement('button');
      b.type='button'; b.title=hex;
      b.style.cssText='width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.2);'
        +'padding:0;cursor:pointer;background:'+hex;
      b.addEventListener('click',()=>{
        document.documentElement.style.setProperty(cssVarName,hex);
      });
      wrap.appendChild(b);
    });
    const reset=document.createElement('button');
    reset.type='button'; reset.textContent='×'; reset.title='Reset to default';
    reset.style.cssText='width:18px;height:18px;border:1px solid #ccc;border-radius:50%;'
      +'background:#fff;cursor:pointer;line-height:1;padding:0';
    reset.addEventListener('click',()=>{
      document.documentElement.style.removeProperty(cssVarName);
    });
    wrap.appendChild(reset);
    return wrap;
  }

  /* a swatch row bound to one letter's corner-mark colour, persisted */
  function kmarkRow(letter){
    const wrap=document.createElement('div');
    wrap.style.cssText='display:flex;align-items:center;gap:6px;margin:4px 0';
    const tag=document.createElement('span');
    tag.textContent=letter; tag.style.cssText='width:40px;flex:none';
    wrap.appendChild(tag);
    function applyLive(hex){
      /* the START button carries data-letter="START" too, so this same
         selector reaches it as well as the five KAIRO tiles. */
      const tile=document.querySelector('.klogo [data-letter="'+letter+'"]');
      if(!tile) return;
      if(hex) tile.style.setProperty('--kmark-color',hex);
      else tile.style.removeProperty('--kmark-color');
    }
    SWATCHES.forEach(hex=>{
      const b=document.createElement('button');
      b.type='button'; b.title=hex;
      b.style.cssText='width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.2);'
        +'padding:0;cursor:pointer;background:'+hex;
      b.addEventListener('click',()=>{
        const dev=readKmarkDev(); dev[letter]=hex; writeKmarkDev(dev);
        applyLive(hex);
      });
      wrap.appendChild(b);
    });
    const reset=document.createElement('button');
    reset.type='button'; reset.textContent='×'; reset.title='Reset to default';
    reset.style.cssText='width:18px;height:18px;border:1px solid #ccc;border-radius:50%;'
      +'background:#fff;cursor:pointer;line-height:1;padding:0';
    reset.addEventListener('click',()=>{
      const dev=readKmarkDev(); delete dev[letter]; writeKmarkDev(dev);
      applyLive(null);
    });
    wrap.appendChild(reset);
    return wrap;
  }

  panel.appendChild(cssVarRow('Grid','--gridline-dev'));
  panel.appendChild(cssVarRow('Star','--star-dev'));
  const rule=document.createElement('div');
  rule.style.cssText='height:1px;background:#e5e5e5;margin:6px 0';
  panel.appendChild(rule);
  LETTERS.forEach(letter=>panel.appendChild(kmarkRow(letter)));

  /* Each swatch click already persists on its own (writeKmarkDev above) — this
     button is an explicit, visible confirmation of that on request (Karin,
     27 Aug), reading whatever is currently ON the six elements and saving all
     of it in one pass, so "Save" always matches what's on screen. */
  const saveBtn=document.createElement('button');
  saveBtn.type='button'; saveBtn.textContent='Save colours';
  saveBtn.style.cssText='margin-top:8px;width:100%;padding:6px 0;border:1px solid #ccc;'
    +'border-radius:6px;background:#111;color:#fff;cursor:pointer;font:12px system-ui,sans-serif';
  saveBtn.addEventListener('click',()=>{
    const dev={};
    LETTERS.forEach(letter=>{
      const tile=document.querySelector('.klogo [data-letter="'+letter+'"]');
      const v=tile && tile.style.getPropertyValue('--kmark-color');
      if(v && v.trim()) dev[letter]=v.trim();
    });
    writeKmarkDev(dev);
    const prev=saveBtn.textContent;
    saveBtn.textContent='Saved ✓';
    setTimeout(()=>{ saveBtn.textContent=prev; },1200);
  });
  panel.appendChild(saveBtn);

  document.body.appendChild(panel);
})();
