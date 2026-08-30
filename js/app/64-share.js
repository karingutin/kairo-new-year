/* =====================================================================
   The share — the poster's permanent address, and the QR of it.

   At the Create press the finished sheet is rasterised, uploaded, and its
   permanent Wix Media URL drawn as a QR beside the poster, for whoever made
   it to take away with a phone.

   BEST-EFFORT, AND NOTHING WAITS ON IT. This is the one hard rule of the
   feature: showFinish() starts this and does not await it, no step here can
   throw into the ending, and a visitor whose upload fails still gets their
   poster, their download and their ending exactly as before. Every path out
   of here ends in a status, never in an exception.

   The QR's geometry lives in this file too, and it is chrome, so it sits on
   the --cell grid like everything else that is not the artwork.
   ===================================================================== */

const SHARE = { status:'idle', url:null, sig:null };

/* The shimmer's own clock, kept beside SHARE for the same reason SHARE_MEMO
   is: one module-level binding, so there is exactly one place that can be
   holding a live timer at any moment. renderQR() is responsible for both
   starting it (once, in the 'working' branch) and clearing it (on every
   other path out) — see the top of that function. */
let qrPulse=null;

/* The last upload that actually landed, kept BEYOND clearShare. Backing out of
   the ending puts the panel away; it does not make the poster un-made, and the
   address Wix already minted for it is still good. Without this the guard below
   compares against a sig clearShare has just nulled, always misses, and every
   Back-then-Create spends a second upload and leaves a second copy in the
   media library. */
let SHARE_MEMO = { sig:null, url:null };

/* The upload is keyed on the same things that make a poster a different
   poster — the answers, the rolls and the format. Backing out of the ending
   and pressing Create again on an unchanged session should not spend a second
   upload, and it does not. */
function shareSig(){
  try{
    return JSON.stringify([S.seed, S.format, S.rolls,
      ASKED.map(q=>isSkipped(q.id)?null:ans(q.id))]);
  }catch(e){ return String(S.seed)+'|'+S.format; }
}

async function startShare(){
  const sig=shareSig();
  /* already have this exact poster's address, or already fetching it */
  if(SHARE.sig===sig && (SHARE.status==='working'||SHARE.status==='ready')) return;

  /* made this exact poster earlier in the session — reuse the address */
  if(SHARE_MEMO.sig===sig && SHARE_MEMO.url){
    SHARE.sig=sig; SHARE.status='ready'; SHARE.url=SHARE_MEMO.url;
    renderQR(); return;
  }

  SHARE.sig=sig; SHARE.status='working'; SHARE.url=null;
  renderQR();

  try{
    /* MEASURED end to end on the live site before touching any of this
       (Karin, 30 Aug, a 3.3MB poster): rasterise 1214ms (15%), mint 942ms
       (12%), PUT 4588ms (57% — the real cost), settle-probe 1297ms (16%).
       The three changes below all attack the upload, not the code — the QR
       encode itself never registered, it is a 37x37 matrix.

       MINT WHILE RASTERISING, NOT AFTER (~0.9s). The two were only ever in
       series out of habit: mint() needs nothing from the rasterise but a
       byte count, and the worker's own guard band is 1KB..25MB — every real
       poster clears it by a wide margin, so the exact figure sent here does
       nothing but satisfy that check. A round number safely inside the band
       stands in for it, and the two calls run at once instead of one after
       the other. */
    const [blob, minted] = await Promise.all([
      rasterBlob('jpg'),
      fetch('/api/poster-upload',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({size:1048576})
      }).then(r=>r.ok?r.json():Promise.reject(new Error('mint '+r.status)))
    ]);
    const uploadUrl = minted && minted.uploadUrl;
    if(!uploadUrl) throw new Error('no uploadUrl');

    /* PUT, not POST — the signed URL takes a PUT with the bytes as the body.
       The poster goes straight to Wix from here; the worker never sees it.

       JPEG, NOT PNG (most of the remaining 4.6s). The sheet has no
       transparency to lose — buildSVG's first mark is an opaque ground rect
       the full size of the sheet — which is exactly why exportRaster was
       always happy to offer JPEG downstream. On an earlier poster this was
       750KB against the PNG's 1.2MB, and the PUT is by far the largest slice
       of the whole eight seconds, so a smaller file here is the single
       biggest lever in this function. */
    const up=await fetch(uploadUrl,{
      method:'PUT', headers:{'Content-Type':'image/jpeg'}, body:blob
    });
    if(!up.ok) throw new Error('put '+up.status);
    const out=await up.json();
    const url=out && out.file && out.file.url;
    if(!url) throw new Error('no file url');

    /* STOP WAITING WHEN WIX HAS ALREADY SAID SO (~1.3s). Wix is explicit
       that a successful upload response does not always mean the file is
       readable yet — but the PUT response also carries its own
       operationStatus, and on every upload checked today (Karin, 30 Aug) it
       already comes back READY. Anything other than READY is unproven, so
       that path keeps the old behaviour exactly: wait for settle() before
       trusting the address at all. READY skips the wait — the probe below
       still runs, but only as an unawaited background check, because a code
       that is already on screen, and possibly already scanned, must not go
       back to being no code over a probe that came back slow or failed
       after the fact. */
    const ready = out && out.file && out.file.operationStatus === 'READY';
    if(!ready) await settle(url);

    /* the session moved on while we were away — that poster is not this one */
    if(SHARE.sig!==sig) return;
    SHARE.status='ready'; SHARE.url=url;
    SHARE_MEMO={ sig:sig, url:url };
    console.log('[kairo] poster at', url);

    if(ready){
      /* not awaited, and its result decides nothing — see the comment above */
      settle(url).catch(e=>console.warn('[kairo] late settle check failed:', e && e.message));
    }
  }catch(e){
    if(SHARE.sig!==sig) return;
    SHARE.status='failed'; SHARE.url=null;
    console.warn('[kairo] share failed:', e && e.message);
  }
  renderQR();
}

/* Wait for the address to actually serve an image. Six tries over about
   twelve seconds, backing off — past that it is not coming and the panel
   says so rather than spinning forever. */
function settle(url){
  return new Promise((res,rej)=>{
    let n=0;
    (function tryOnce(){
      const img=new Image();
      img.onload=()=>res();
      img.onerror=()=>{
        if(++n>=6) return rej(new Error('never became readable'));
        setTimeout(tryOnce, 400*Math.pow(1.8,n));
      };
      img.src=url+(url.indexOf('?')<0?'?':'&')+'probe='+n;
    })();
  });
}

/* Backing out of the ending is backing out of a poster. The address of the
   one before it must not still be standing there when the next Create lands. */
function clearShare(){
  SHARE.status='idle'; SHARE.url=null; SHARE.sig=null;
  renderQR();
}

/* ---------------------------------------------------------------------
   THE QR, ON THE GRID.

   The encoder is vendored and gives us a module matrix; the drawing is ours,
   as SVG rects, because a QR the library styles is a QR that ignores the
   --cell grid — and CLAUDE.md is not ambiguous about that. This is interface
   chrome, so its position AND its size land on grid lines, snapped against
   the grid's own phase rather than against the screen edge.

   The box is a whole number of cells square. One module is that box divided
   by the matrix plus its quiet zone, so the code breathes with the grid the
   way every other component's padding does.
   --------------------------------------------------------------------- */
const QR_QUIET=4;          // modules of quiet zone each side — 4 is the spec's minimum

/* ---------------------------------------------------------------------
   THE WAIT, ASSEMBLING ITSELF.

   The wait behind 'working' is real — rasterise, mint, PUT a megabyte-plus
   PNG, then poll until Wix reports the file readable — commonly eight to
   fourteen seconds. A motionless '…' held for that long reads as broken, not
   as busy. What replaces it is the same box the finished code will fill,
   already showing something that looks like a code arriving.

   THE FINDER PATTERNS ARE REAL AND THE DATA IS NOT, and that has to be said
   plainly here so nobody later mistakes this for a partially-decoded code
   and tries to scan it. The three finder patterns — the QR's corner eyes,
   top-left, top-right, bottom-left — are drawn correctly and statically: a
   7x7 ring with a solid 3x3 centre, at the exact corners a real code always
   puts them, with QR_QUIET's own quiet zone already applied. They are the one
   part of a QR that never changes shape, so they belong on screen from the
   very first frame and are what makes the box read instantly as "a code is
   coming" rather than a blank square. Everything else in the box is a random
   scatter with no meaning at all, reshuffled on a timer so it shimmers like
   the code is still resolving.

   FIXED AT 37 MODULES — the same count the real encode actually lands on for
   a wixstatic URL of this length (see the comment in the ready branch below)
   — so the shimmer's modules are already the size the finished code's will
   be, and nothing changes scale the instant the real one replaces it.

   ONE PATH, not N^2 rects, exactly the technique the ready branch below
   uses — a version-5-sized grid drawn as individual elements is the same
   performance problem here as it is there. */
const QR_PULSE_N=37;
const QR_PULSE_MS=110;   // fast enough to read as resolving; any quicker and it flickers rather than shimmers

function qrPulseMarkup(side){
  const N=QR_PULSE_N, span=N+QR_QUIET*2, m=side/span;
  /* each finder's own top-left module, in the 0..N-1 grid, before the quiet
     zone offset below adds QR_QUIET to every coordinate */
  const FINDERS=[[0,0],[N-7,0],[0,N-7]];
  let d='';
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const f=FINDERS.find(b=>x>=b[0]&&x<b[0]+7&&y>=b[1]&&y<b[1]+7);
    let dark;
    if(f){
      /* the standard finder shape: dark on the outer ring and the solid
         3x3 centre, light in the ring between — geometrically exact no
         matter what the scatter around it is doing this tick */
      const lx=x-f[0], ly=y-f[1];
      dark=(lx===0||lx===6||ly===0||ly===6||(lx>=2&&lx<=4&&ly>=2&&ly<=4));
    } else {
      /* the data area: no meaning, a third-to-a-half scatter, different
         every call — this is the part that shimmers */
      dark=Math.random()<0.4;
    }
    if(dark) d+='M'+((x+QR_QUIET)*m)+' '+((y+QR_QUIET)*m)+'h'+m+'v'+m+'h'+(-m)+'z';
  }
  return '<svg viewBox="0 0 '+side+' '+side+'" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
    + '<rect width="'+side+'" height="'+side+'" fill="#ECECEC"/>'
    + '<path d="'+d+'" fill="#141414"/></svg>';
}

function renderQR(){
  const el=document.getElementById('qr');
  if(!el) return;
  const lab=document.getElementById('qrLabel');

  /* THE PULSE NEVER OUTLIVES ITS OWN CALL. renderQR() runs on every relayout
     — every resize, every format change — as well as on every SHARE
     transition, so a timer started once and left running would multiply:
     one extra interval per resize, all of them reshuffling the same box,
     none of them the one anyone is looking at. Cleared here, unconditionally,
     before any branch below runs, so the only way a timer exists afterwards
     is the 'working' branch choosing to start exactly one fresh one. Every
     other path out — idle, ready, failed, a failed encode, and clearShare()
     (which is just SHARE.status='idle' followed by this same call) — leaves
     it cleared.

     THE LABEL IS HIDDEN HERE TOO, for the same reason and beside the same
     clear: 'Generating…' belongs to the working state alone, so it is turned
     off unconditionally before any branch below runs, and only the working
     branch turns it back on. One place does the hiding, so it cannot be left
     standing over the finished code, the failed message, or nothing at all. */
  if(qrPulse){ clearInterval(qrPulse); qrPulse=null; }
  if(lab) lab.classList.remove('on');

  /* it belongs to the ending and to nothing else */
  if(!posterDone || SHARE.status==='idle'){ el.classList.remove('on'); el.innerHTML=''; return; }

  /* NOT A POP-UP ANY MORE (Karin, 30 Aug). It became one because the gutter
     beside the poster ran out of width at 1024, and that argument died with
     the Save-as buttons: the column they stood in is empty now, the code
     stands in it, and Back sits under the code. The box comes from
     qrFigure() rather than being worked out again here, so the code and the
     link below it can never disagree about where the column is. */
  const cell=cellSize();
  const b=cellBox(qrFigure());
  const side=b.w;
  el.style.left=b.left+'px';
  el.style.top=b.top+'px';
  el.style.width=side+'px';
  el.style.height=side+'px';

  if(SHARE.status==='working'){
    el.innerHTML=qrPulseMarkup(side);
    el.classList.add('on');
    /* reduced motion draws the one frame above and stops there — no interval,
       because there is nothing here to animate towards under that setting */
    if(!(reduceMotion && reduceMotion())){
      qrPulse=setInterval(()=>{ el.innerHTML=qrPulseMarkup(side); }, QR_PULSE_MS);
    }
    /* THE LABEL, one row above the code and as wide as it — the row above
       qrFigure()'s box is genuinely clear: renderFinish() (js/ui/44-snake-draw.js)
       replaces #qsys with nothing but Back's own box, placed a clear row
       BELOW the code (see finishFigure() in js/ui/41-snake.js), so there is
       nothing else drawn above it to collide with. b.top-cell is still a
       grid line because b.top is one and cell is a whole cell, so the
       assignment stays unrounded like everything else here — no snapping
       of a value that is already on the grid by construction. */
    if(lab){
      lab.textContent='Generating…';
      lab.style.left=b.left+'px';
      lab.style.top=(b.top-cell)+'px';
      lab.style.width=side+'px';
      lab.style.height=cell+'px';
      lab.classList.add('on');
    }
    return;
  }

  if(SHARE.status==='failed' || !SHARE.url){
    el.innerHTML='<div class="msg">no link</div>';
    el.classList.add('on');
    return;
  }

  try{
    /* typeNumber 0 lets the encoder pick the smallest version the text fits in;
       'M' is medium error correction, which for a wixstatic URL of ~82 chars
       lands on a 37x37 module code. isDark takes (row, col) — y first, not x. */
    const qr=qrcode(0,'M');
    qr.addData(SHARE.url);
    qr.make();
    const n=qr.getModuleCount(), span=n+QR_QUIET*2, m=side/span;
    let d='';
    for(let y=0;y<n;y++) for(let x=0;x<n;x++) if(qr.isDark(y,x))
      d+='M'+((x+QR_QUIET)*m)+' '+((y+QR_QUIET)*m)+'h'+m+'v'+m+'h'+(-m)+'z';
    /* one path rather than n^2 rects: a version-5 code is over a thousand
       dark modules and a thousand elements is a thousand elements */
    /* Literal tones, not var(--fg)/var(--surface): body.made has inverted both
       by the time this draws, and an inverted QR is one a fair share of phone
       cameras will not read. See the note in css/10-chrome.css. */
    el.innerHTML=
      '<svg viewBox="0 0 '+side+' '+side+'" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
      + '<rect width="'+side+'" height="'+side+'" fill="#ECECEC"/>'
      + '<path d="'+d+'" fill="#141414"/></svg>';
    el.classList.add('on');
  }catch(e){
    /* an encode that fails is a failed share like any other */
    el.innerHTML='<div class="msg">no link</div>';
    el.classList.add('on');
    console.warn('[kairo] qr encode failed:', e && e.message);
  }
}
