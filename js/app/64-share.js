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

/* Task 5 replaces this with the real thing. Declared here so Task 4 stands on
   its own and startShare() has something to call. */
function renderQR(){}
