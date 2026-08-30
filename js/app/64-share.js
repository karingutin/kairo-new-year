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
    const blob=await rasterBlob('png');

    const r=await fetch('/api/poster-upload',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({size:blob.size})
    });
    if(!r.ok) throw new Error('mint '+r.status);
    const {uploadUrl}=await r.json();
    if(!uploadUrl) throw new Error('no uploadUrl');

    /* PUT, not POST — the signed URL takes a PUT with the bytes as the body.
       The poster goes straight to Wix from here; the worker never sees it. */
    const up=await fetch(uploadUrl,{
      method:'PUT', headers:{'Content-Type':'image/png'}, body:blob
    });
    if(!up.ok) throw new Error('put '+up.status);
    const out=await up.json();
    const url=out && out.file && out.file.url;
    if(!url) throw new Error('no file url');

    /* Wix is explicit that a successful upload response does not mean the file
       is readable yet, so the address is not trusted until it actually loads.
       A QR that resolves to nothing is worse than no QR. */
    await settle(url);

    /* the session moved on while we were away — that poster is not this one */
    if(SHARE.sig!==sig) return;
    SHARE.status='ready'; SHARE.url=url;
    SHARE_MEMO={ sig:sig, url:url };
    console.log('[kairo] poster at', url);
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

/* THE CODE AND ITS GROUND COME ON AND GO OFF TOGETHER — one helper rather than
   the pair of classList calls repeated at every branch below, because a
   pop-up whose scrim can fall out of step with its own panel is worse than no
   scrim at all. */
function showQR(on){
  const el=document.getElementById('qr');
  if(el) el.classList.toggle('on', on);
  const scrim=document.getElementById('qrScrim');
  if(scrim) scrim.classList.toggle('on', on);
}

function renderQR(){
  const el=document.getElementById('qr');
  if(!el) return;

  /* it belongs to the ending and to nothing else */
  if(!posterDone || SHARE.status==='idle'){ showQR(false); el.innerHTML=''; return; }

  const cell=cellSize(), o=gridOrigin();
  const vw=window.innerWidth, vh=window.innerHeight;
  const phaseX=((o.x%cell)+cell)%cell;      // first vertical line at or after x=0
  const phaseY=((o.y%cell)+cell)%cell;      // first horizontal line at or after y=0

  /* A POP-UP, not a panel in the gutter. It was in the strip beside the poster
     and that strip is not always there: at 1024 wide it comes down to under
     five cells against this box's seven, and the code ended up lying on the
     artwork it is a link to. Centred, it is the same thing at every window
     size, and it no longer has to dodge reset (Karin, 30 Aug).

     Sized in whole cells and snapped to the grid like every other piece of
     chrome, and it takes the largest square that leaves two clear cells of air
     on the shorter side — ten cells at a normal window, less on a small one,
     never under five, which is where the modules would stop being readable. */
  const room=Math.floor((Math.min(vw,vh)-4*cell)/cell);
  const cells=Math.max(5,Math.min(10,room));
  const side=cells*cell;
  const left=phaseX+Math.round(((vw-side)/2-phaseX)/cell)*cell;
  const top =phaseY+Math.round(((vh-side)/2-phaseY)/cell)*cell;
  el.style.left=left+'px';
  el.style.top =top+'px';
  el.style.width=side+'px';
  el.style.height=side+'px';

  if(SHARE.status!=='ready' || !SHARE.url){
    el.innerHTML='<div class="msg">'+(SHARE.status==='failed'?'no link':'…')+'</div>';
    showQR(true);
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
    showQR(true);
  }catch(e){
    /* an encode that fails is a failed share like any other */
    el.innerHTML='<div class="msg">no link</div>';
    showQR(true);
    console.warn('[kairo] qr encode failed:', e && e.message);
  }
}

/* TWO WAYS OUT, and both are the same way out: the code is a thing being shown,
   not a state the board is in. Pressing the ground behind it puts it away, and
   so does Escape. The address itself is not forgotten — SHARE_MEMO keeps it, so
   pressing Generate QR again brings the same code straight back with no second
   upload. */
document.getElementById('qrScrim').addEventListener('click',clearShare);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && SHARE.status!=='idle') clearShare();
});
