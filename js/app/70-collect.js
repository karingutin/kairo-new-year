/* =====================================================================
   Data collection

   Three destinations, all optional and independent:
     1. A webhook. Set CONFIG.DATA_ENDPOINT, or append ?endpoint=https://...
        to the page URL to test one without editing the file. The query-string
        form is honoured on a local server only — see the note below.
     2. The browser itself. Every response is kept in localStorage so they
        accumulate while you test, and can be exported as JSON or CSV.
     3. postMessage to the parent frame, for when this is embedded.
   submit() runs after every answer, so a response that is abandoned
   half-way through is still captured.
   ===================================================================== */
const STORE_KEY='timeArch.responses';
let RESPONSES=[];
try{ RESPONSES=JSON.parse(localStorage.getItem(STORE_KEY)||'[]'); }catch(e){ RESPONSES=[]; }
function persist(){
  try{ localStorage.setItem(STORE_KEY,JSON.stringify(RESPONSES)); }catch(e){}
}
/* ?endpoint= is a testing convenience and it stays one: it is read on a local
   server and nowhere else. The site is public now, and on a public URL the
   parameter is a link anyone can craft that makes the page post a visitor's
   answers to a host of the sender's choosing. Only the visitor's own session
   is at stake, but there is no reason for the door to be there in production.
   To point the live site at a webhook, set CONFIG.DATA_ENDPOINT in the source. */
const LOCAL=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
         || location.protocol==='file:';
if(LOCAL) try{
  const ep=new URLSearchParams(location.search).get('endpoint');
  if(ep && /^https:\/\//.test(ep)) CONFIG.DATA_ENDPOINT=ep;
}catch(e){}

function payload(status){
  const D=derive();
  /* A skipped question reports null, not its default. Recording the default
     would put an answer in the data that nobody gave, and it would be
     indistinguishable from someone who genuinely accepted it. */
  const answers={}, touched={}, skipped={};
  ASKED.forEach(q=>{
    skipped[q.id]=isSkipped(q.id);
    answers[q.id]=isSkipped(q.id) ? null : ans(q.id);
    touched[q.id]=!!S.touched[q.id];
  });
  return {
    type:'timeArch',
    status,                                  // 'partial' | 'complete'
    id:'TA-'+S.seed.toString(16).toUpperCase().slice(0,6),
    at:new Date().toISOString(),
    seed:S.seed,
    /* Always null now — nothing collects a name or a birthdate since the
       opening screen dropped its fields. The block stays so responses already
       in storage keep the same shape, and so restoring the fields does not
       need a schema change; see CONFIG.SHOW_OPENING. */
    profile:{
      name:S.name.trim()||null,
      date_of_birth:S.dob||null,
      age:D.age||null,
      age_source:D.knownAge?(D.ageFromDob?'date_of_birth':'entered'):null
    },
    context:{
      today:D.today.toISOString().slice(0,10),
      days_lived:D.daysLived,
      days_to_birthday:D.daysToBirthday,
      viewport:window.innerWidth+'x'+window.innerHeight,
      /* the format is not an answer, but the poster cannot be reproduced from
         the seed without it, so it belongs in the record */
      format:S.format,
      format_ratio:FMT().ratio,
      /* the two figures the poster's own foot now prints, so the stored record
         and the printed one say the same thing (see js/app/63-record.js).
         Live while the asking is open, frozen at the Create press. */
      duration_ms: CLOCK.total!=null ? Math.round(CLOCK.total)
                 : (CLOCK.t0 ? Math.round(performance.now()-CLOCK.t0) : null),
      per_question_ms: Object.fromEntries(
        Object.entries(CLOCK.per).map(([k,v])=>[k,Math.round(v)]))
    },
    /* Not answers — nobody chose these and they say nothing about the person.
       Recorded anyway because the poster cannot be rebuilt without them: only
       the ids that were actually rolled, so an untouched session stays empty
       rather than reporting three defaults as if they were decisions. */
    rolls:{...S.rolls},
    asked:ASKED.map(q=>q.id),
    answered:ASKED.filter(q=>isAnswered(q.id)).map(q=>q.id),
    passed:ASKED.filter(q=>isSkipped(q.id)).map(q=>q.id),
    answers,
    touched,                                 // did the person actually choose, or is this the standing value
    skipped                                  // ...or did they decline to answer at all
  };
}

let lastPayload=null, lastSig='';
function submit(status){
  const data=payload(status||'partial');
  lastPayload=data;
  /* skip a resubmit that carries nothing new */
  const sig=data.status+'|'+JSON.stringify(data.answers)+'|'+JSON.stringify(data.answered)
          + '|'+JSON.stringify(data.rolls);   // a re-roll alone changes the poster
  if(sig===lastSig) return data;
  lastSig=sig;

  /* one record per session, updated in place as answers come in */
  const at=RESPONSES.findIndex(r=>r.seed===data.seed);
  if(at>=0) RESPONSES[at]=data; else RESPONSES.push(data);
  persist();

  if(CONFIG.POST_TO_PARENT && window.parent!==window){
    try{ window.parent.postMessage(data,'*'); }catch(e){}
  }
  if(CONFIG.DATA_ENDPOINT){
    fetch(CONFIG.DATA_ENDPOINT,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    }).catch(err=>console.warn('[timeArch] endpoint failed:',err));
  }
  console.log('[timeArch]',data.status,data.id,data.answers);
  renderStatus();
  return data;
}

/* ---- export what has been collected ---- */
function responsesCSV(){
  const ids=[...new Set(RESPONSES.flatMap(r=>r.asked))];
  const head=['id','status','at','seed','name','date_of_birth','age','age_source',
              'days_lived','days_to_birthday','viewport','format','format_ratio',
              ...ids, ...ids.map(i=>i+'_touched'), ...ids.map(i=>i+'_skipped')];
  const cell=v=>{
    if(v===null||v===undefined) return '';
    const t=String(v);
    return /[",\n]/.test(t) ? '"'+t.replace(/"/g,'""')+'"' : t;
  };
  const rows=RESPONSES.map(r=>[
    r.id,r.status,r.at,r.seed,r.profile.name,r.profile.date_of_birth,r.profile.age,r.profile.age_source,
    r.context.days_lived,r.context.days_to_birthday,r.context.viewport,
    r.context.format,r.context.format_ratio,
    ...ids.map(i=>r.answers?r.answers[i]:''),
    ...ids.map(i=>r.touched?r.touched[i]:''),
    ...ids.map(i=>r.skipped?r.skipped[i]:'')
  ].map(cell).join(','));
  return [head.join(','),...rows].join('\n');
}
function downloadResponses(kind){
  if(kind==='csv') download(new Blob([responsesCSV()],{type:'text/csv;charset=utf-8'}),'time-responses.csv');
  else download(new Blob([JSON.stringify(RESPONSES,null,2)],{type:'application/json'}),'time-responses.json');
}
async function copyPayload(){
  const text=JSON.stringify(lastPayload||payload('partial'),null,2);
  try{ await navigator.clipboard.writeText(text); return true; }
  catch(e){ console.log(text); return false; }
}

/* ---------- export ---------- */
/* the format goes in the filename, so exporting the same poster at three
   formats gives three files rather than three overwrites */
const fileBase=()=>'time-'+((S.name.trim()||'poster').replace(/\s+/g,'-').toLowerCase())
                 +'-'+S.format;
function download(blob,name){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1200);
}
/* NOTHING TO BAKE. The finished sheet is not a CSS state of the poster — the
   record is in the markup and in the viewBox from the first paint, and what the
   ending changes is the FRAME it is seen through (see #frame). So the file that
   is written here is the whole sheet, artwork and record together, which is what
   a poster is. */
function exportSVG(){ download(new Blob([buildSVG()],{type:'image/svg+xml'}), fileBase()+'.svg'); }

/* No font embedding step: the poster carries no text, so there is nothing to
   embed. This used to fetch Google Fonts and base64-inline two woff2 files on
   the first export — a real round-trip — and then splice them into a <style>
   tag that buildSVG no longer emits, so the splice silently did nothing. */
/* ONE RASTERISER FOR BOTH, and the button it was pressed from is PASSED IN
   rather than looked up. It used to read getElementById('dlPng'), which tied
   the export to one particular button in one particular card — and that card
   is gone. Anything that can be pressed can hand itself over; nothing has to,
   and a call with no button simply exports without saying so on screen.
   JPEG carries no alpha, but the sheet's first mark is an opaque ground rect
   the width and height of the poster (see buildSVG), so there is no
   transparency to lose and no white to paint in underneath. */
async function exportRaster(kind,btn){
  const old=btn?btn.textContent:'';
  if(btn){ btn.textContent='Saving…'; btn.disabled=true; }
  try{
    const svg=buildSVG();
    const img=new Image(), scale=2.6;
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    await new Promise((res,rej)=>{ img.onload=res; img.onerror=rej; img.src=url; });
    const c=document.createElement('canvas');
    const B=box();                       // the current format's own pixel box
    /* ...plus the record's two rows, which are part of the sheet and not part of
       the artwork's box. Sizing the canvas off B alone would crop the band off
       the bottom of every PNG and JPEG while the SVG kept it. */
    c.width=B.w*scale; c.height=(B.h+RECORD_ROWS*(B.w/B.cols))*scale;
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    URL.revokeObjectURL(url);
    const jpg=kind==='jpg';
    c.toBlob(b=>{ if(b) download(b, fileBase()+'.'+kind); },
             jpg?'image/jpeg':'image/png', jpg?0.92:undefined);
  }catch(e){ exportSVG(); }
  finally{ if(btn){ btn.textContent=old; btn.disabled=false; } }
}
const exportPNG=btn=>exportRaster('png',btn);
const exportJPG=btn=>exportRaster('jpg',btn);



