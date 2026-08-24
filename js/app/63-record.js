/* =====================================================================
   THE DATA RECORD — the band along the poster's foot.

   Everything the session was, said back as one run of text: an item per
   question that was answered, in the order it was asked, then how long the
   asking took and when it happened. The items are separated by \\ and the
   whole run is set in the poster's one face, uppercase, in the blue ink role,
   on plain paper.

   IT IS NOT A LAYER LIKE THE OTHERS. Nothing about it is generated, rolled or
   earned: it is the answers written out. So it lives here, beside the hover
   notes, which is the other file where the per-answer COPY is kept, rather
   than in js/poster/ with the tools.

   THE BAND OWNS THE FOOT. Two rows of the sheet, full width, in the paper
   colour, and it is opaque — whatever the artwork has down there is covered
   rather than clipped, which is the same thing to look at and one fewer clip
   path to key by format (see the two-plies note in buildSVG).
   ===================================================================== */

/* ---------------------------------------------------------------------
   THE CLOCK.

   Two numbers reach the poster: how long a question took on average, and how
   long the whole thing took. Both are measured from the BEGIN press, not from
   the page load — the wait before someone starts is not part of the
   experience, and a tab left open overnight would otherwise report a session
   of nine hours.

   A question's time is the stretch between the press that banked the question
   before it and the press that banks this one. That is deliberately simpler
   than opening and closing a card: in the panel flow the next question becomes
   current the instant the last one is banked, so there is no dead time between
   them to attribute to nobody. Stepping BACK to a question and banking it
   again adds that second stretch to the same question's own total, which is
   what it costs someone to answer it.
   --------------------------------------------------------------------- */
const CLOCK={t0:0, last:0, per:{}, total:null, at:null};
/* Begin. Also the two ways back to question one — Reset and the mark — since
   both start the asking over and the old clock is not theirs. */
function startClock(){
  const now=performance.now();
  CLOCK.t0=CLOCK.last=now; CLOCK.per={}; CLOCK.total=null; CLOCK.at=null;
}
/* one question banked */
function markClock(qid){
  if(!CLOCK.t0 || !qid) return;
  const now=performance.now();
  CLOCK.per[qid]=(CLOCK.per[qid]||0)+(now-CLOCK.last);
  CLOCK.last=now;
}
/* Create. The two numbers are FROZEN here rather than read live, so the poster
   says what it said the moment it was made — a sheet left on screen for ten
   minutes must not go on counting. */
function stampRecord(){
  CLOCK.total = CLOCK.t0 ? performance.now()-CLOCK.t0 : 0;
  CLOCK.at    = new Date();
}
/* Back out of the ending: the numbers go live again, because the asking is
   open again and the next Create is a different poster. */
function unstampRecord(){ CLOCK.total=null; CLOCK.at=null; }

/* ---------------------------------------------------------------------
   THE COPY. One line per possible answer, written out rather than assembled
   from the question's own display(): the panel's wording is a sentence to a
   person mid-thought, and this is a record. They are allowed to differ.
   --------------------------------------------------------------------- */
const REC_SHAPE   ={square:'TIME MOVES ON WITHOUT YOU', circle:'TIME CARRIES YOU WITH IT'};
const REC_DENSITY ={little:'TOO LITTLE TIME', enough:'ENOUGH TIME', plenty:'PLENTY OF TIME'};
const REC_MEMORIES={'1':'1 CORE MEMORY', '2':'2 CORE MEMORIES', '3':'3 CORE MEMORIES',
                    '4+':'4+ CORE MEMORIES'};
const REC_SAYING  ={Trust:'TIME IS TRUST', Worry:'TIME IS WORRY',
                    Regret:'TIME IS REGRET', Presence:'TIME IS PRESENCE'};
/* the tail binaries, written now so raising QUESTIONS_PER_SESSION needs no
   copy work later — none of these is asked at ten questions a session */
const REC_BIN={
  gaze:   {back:'LOOKING BACKWARD',      forward:'LOOKING FORWARD'},
  reserve:{behind:'MORE TIME BEHIND',    ahead:'MORE TIME AHEAD'},
  trust:  {trust:'CLOSER TO TRUST',      worry:'CLOSER TO WORRY'},
  today:  {remember:'A DAY TO REMEMBER', blur:'A DAY THAT BLURS'},
  novelty:{repeats:'MORE REPEATS THAN NEW', new:'MORE NEW THAN REPEATS'},
  supply: {scarce:'RUNNING OUT OF TIME', plenty:'MORE TIME THAN NEEDED'}
};
/* The month's two temperatures come from MONTH_TEMPS, the same table the
   silhouette is set from — so the figures on the foot and the shape above them
   are the one reading, not two. */
function recMonthItem(){
  const m=ans('month'), t=MONTH_TEMPS[m]||'';
  const hit=/^(\d+)c(\d+)f$/.exec(t);
  if(!hit) return '';
  return 'FAVOURITE WEATHER '+hit[1]+'C OR '+hit[2]+'F IN '+String(m).toUpperCase();
}
/* Per question, and only the ones whose answer says something the sheet does
   not already say. THE COLOURWAY IS NOT HERE, deliberately: the poster IS the
   colourway, and naming it is the one item that reports what you can see. */
const REC_ITEM={
  shape:    ()=>REC_SHAPE[ans('shape')]||'',
  density:  ()=>REC_DENSITY[ans('density')]||'',
  month:    recMonthItem,
  febdays:  ()=>String(beadCountFromAnswers())+' DAYS IN BIRTH MONTH',
  alarms:   ()=>{ const n=rayCountFromAnswers();
                  return n===0 ? 'NO SNOOZE IN THE MORNING'
                       : n===1 ? '1 SNOOZE EVERY MORNING'
                               : n+' SNOOZES EVERY MORNING'; },
  decades:  ()=>{ const d=Math.max(1,Math.round(Math.round(ans('decades'))/10));
                  return d===1 ? '1 DECADE AHEAD' : d+' DECADES AHEAD'; },
  vacations:()=>REC_MEMORIES[String(ans('vacations'))]||'',
  sixweek:  ()=>{ const raw=ans('sixweek'), v=Number.isFinite(+raw)?+raw:50;
                  /* the same three bands the question's own display() reads, so
                     the panel and the foot can never disagree about which side
                     of the week someone came down on */
                  return v<45 ? 'WEEK SUPERIORITY'
                       : v<=55 ? 'WEEK AND WEEKEND EVEN'
                               : 'WEEKEND SUPERIORITY'; },
  saying:   ()=>REC_SAYING[ans('saying')]||''
};

/* ---- the stamp ---- */
const REC_DAYS  =['SUN','MON','TUE','WED','THU','FRI','SAT'];
const REC_MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
/* Keyed by year % 12, so 2016 (remainder 0) is the monkey and 2026 (remainder
   10) is the horse. APPROXIMATE BY ONE MONTH AND KNOWINGLY SO: the Chinese year
   turns in late January or February, not on the 1st, so a session in that gap
   is stamped with the year it is about to leave. The poster is not an almanac
   and the animal is a flourish on a timestamp. */
const REC_ZODIAC=['MONKEY','ROOSTER','DOG','PIG','RAT','OX',
                  'TIGER','RABBIT','DRAGON','SNAKE','HORSE','GOAT'];
function recStamp(d){
  return REC_DAYS[d.getDay()]+' '+d.getDate()+' '+REC_MONTHS[d.getMonth()]
       + ' '+pad2(d.getHours())+':'+pad2(d.getMinutes())+' '+d.getFullYear()
       + ' THE YEAR OF THE '+REC_ZODIAC[((d.getFullYear()%12)+12)%12];
}
/* The three that are written whatever else is: a session where every question
   was passed over still took some time and still happened on some day. */
function recordMeta(){
  const spans=ASKED.filter(q=>isAnswered(q.id)).map(q=>CLOCK.per[q.id]).filter(ms=>ms>0);
  const avg=spans.length ? Math.round(spans.reduce((a,b)=>a+b,0)/spans.length/1000) : 0;
  const totalMs = CLOCK.total!=null ? CLOCK.total : (CLOCK.t0 ? performance.now()-CLOCK.t0 : 0);
  const total=Math.max(0,Math.round(totalMs/1000));
  return [
    avg+(avg===1?' SECOND':' SECONDS')+' AVERAGE TO ANSWER A QUESTION',
    pad2(Math.floor(total/60))+':'+pad2(total%60)+' MIN TO COMPLETE THE EXPERIENCE',
    recStamp(CLOCK.at||new Date())
  ];
}
/* A SKIPPED QUESTION WRITES NOTHING. Same rule the artwork keeps: a question
   passed over leaves no mark, and it must not leave a line either. */
function recordItems(){
  const out=[];
  ASKED.forEach(q=>{
    if(!isAnswered(q.id)) return;
    const write=REC_ITEM[q.id];
    const t = write ? write() : (REC_BIN[q.id] ? REC_BIN[q.id][ans(q.id)] : '');
    if(t) out.push(t);
  });
  return out.concat(recordMeta());
}
const recordLine=()=>recordItems().join(' \\\\ ');

/* ---------------------------------------------------------------------
   SETTING IT.

   SVG text does not wrap, so the run is broken into lines here, against real
   Helvetica advances measured on a canvas rather than against a guess at an
   average character.

   THE TYPE IS SIZED TO FILL THE BAND, not set at a nominal size and centred in
   whatever room is left. Both are legible; only one looks like it belongs there.
   A fixed size left the run floating in the middle of the two rows with a wide
   margin of paper above and below it, which reads as a caption that has been
   dropped in (Karin, 17 Aug: "the data text feels very padded ... it should take
   a bit more space").

   So the line COUNT is not fixed either — it is solved for. Two things cap the
   size: how many characters fit across the column at that size, which wants
   FEWER lines, and how tall the stack of lines is, which wants MORE. Those pull
   opposite ways, so the largest type is at neither end of the range: every line
   count between linesMin and linesMax is costed and the best one wins. At the
   length a full session runs to that lands on five, filling the band top to
   bottom with only the padding left over.
   --------------------------------------------------------------------- */
const REC={
  /* Left and right, in cells. A quarter cell, under two per cent of the sheet:
     the record is the sheet's own footer, not a paragraph set inside it, so it
     runs almost the full width and the margin only keeps the first and last
     letters off the trim (Karin, 17 Aug). Widening the column also buys the type
     a little size, since three lines of a fixed run get bigger as the measure
     gets longer. */
  inset:0.2,
  pad:0.14,        /* top and bottom, in cells — the air the type is NOT allowed */
  lh:1.45,         /* line pitch, in em */
  track:0.02,      /* letter-spacing, in em */
  cap:0.717,       /* Helvetica cap height, em — the same figure the word layer uses */
  /* THREE LINES IS THE CEILING, not a preference (Karin, 17 Aug): the record is
     a footer and a fourth line starts to read as a paragraph. So the fit is
     solved over one to three, and at a full session's length the width is what
     binds — the type comes out as large as three lines of that run allow, and
     smaller for a longer one rather than spilling onto a fourth. */
  linesMin:1, linesMax:3,   /* the range of line counts the fit is solved over */
  min:0.10, max:0.34,       /* and the sizes it will not go past, in cells */
  widow:0.34,      /* how full the last line must come out, as a fraction of the column */
  /* how long the sweep takes, first letter to last. Read with the .32s fade each
     letter gets (see .rglyph): the two together are what make it a wipe rather
     than three hundred separate arrivals. */
  write:700
};
const REC_FACE='Helvetica, \'Helvetica Neue\', Arial, sans-serif';
let recCtx=null;
/* Every word's advance ONCE, at one em, and never measured again.
   The fit below tries a couple of hundred candidate sizes, and canvas
   measureText on each of them would be thousands of text measurements inside
   draw() — which runs on every input event while a slider is dragged. A run's
   width is linear in the type size, so measuring at 1em and multiplying is the
   same answer for the price of one pass. Cached on the run itself, so a session
   only re-measures when an answer actually changes the words. */
let recWordsCache={text:null, w:[], words:[], space:0};
function recEmWidths(text){
  if(recWordsCache.text===text) return recWordsCache;
  if(!recCtx) recCtx=document.createElement('canvas').getContext('2d');
  recCtx.font='400 100px '+REC_FACE;
  const words=text.split(' ');
  /* the tracking is added by hand: canvas knows nothing about letter-spacing,
     and the SVG will render one gap per letter */
  const em=t=>recCtx.measureText(t).width/100 + t.length*REC.track;
  recWordsCache={text, words, w:words.map(em), space:em(' ')};
  return recWordsCache;
}
/* Greedy wrap, in em. Returns null the moment it needs more than `max` lines,
   so a size that is plainly too big costs a few additions rather than a full
   pass over the run. */
function recWrapEm(M,widthEm,max){
  const lines=[]; let cur=-1, curW=0;
  for(let i=0;i<M.w.length;i++){
    const add=(cur<0?0:M.space)+M.w[i];
    if(cur>=0 && curW+add>widthEm){
      lines.push(M.words.slice(cur,i).join(' '));
      if(lines.length>max) return null;
      cur=i; curW=M.w[i];
    } else { if(cur<0) cur=i; curW+=add; }
  }
  if(cur>=0) lines.push(M.words.slice(cur).join(' '));
  if(lines.length>max) return null;
  /* how full the LAST line comes out, as a fraction of the column. The fit reads
     it to refuse a widow — see recFit. */
  lines.lastFill=curW/widthEm;
  return lines;
}
/* The largest size at which the run still fits BOTH the column and the band.
   For a given line count the height cap is arithmetic (a stack of n lines is
   ((n-1)*lh + cap) ems tall) and the width cap is found by bisection, which is
   exact enough at fourteen halvings to be under a hundredth of a cell. */
function recFit(text,W,c,bandH){
  const M=recEmWidths(text);
  const avail=bandH-2*REC.pad*c;
  let best=null, widow=null;
  for(let n=REC.linesMin;n<=REC.linesMax;n++){
    const byHeight=avail/((n-1)*REC.lh+REC.cap);
    let lo=REC.min*c, hi=Math.min(REC.max*c, byHeight);
    if(hi<lo) continue;
    if(!recWrapEm(M,W/lo,n)) continue;              // too long even at the floor
    if(recWrapEm(M,W/hi,n)) lo=hi;                  // the height cap binds first
    else for(let i=0;i<14;i++){
      const mid=(lo+hi)/2;
      if(recWrapEm(M,W/mid,n)) lo=mid; else hi=mid;
    }
    const lines=recWrapEm(M,W/lo,n);
    const cand={fs:lo, lines};
    /* A WIDOW IS WORSE THAN A POINT OF SIZE. The largest type is often the count
       that leaves two words alone on the last line, and a run of data ending in
       a stranded pair reads as a mistake rather than as a rag. So a candidate
       whose last line comes out under a third of the column is set aside, and
       only used if nothing fuller fitted at all. */
    const ok = lines.length<2 || lines.lastFill>=REC.widow;
    if(ok){ if(!best || cand.fs>best.fs) best=cand; }
    else  { if(!widow || cand.fs>widow.fs) widow=cand; }
  }
  best=best||widow;
  /* nothing fitted — set it at the floor and let it take the lines it takes */
  if(!best){ const fs=REC.min*c; best={fs, lines:recWrapEm(M,W/fs,99)||[text]}; }
  return best;
}
/* The band. The two rows PAST the artwork's foot — bandY is B.h, the sheet's
   old bottom edge — full width, on the same paper.

   EVERY LETTER ITS OWN TSPAN, carrying the moment it lands (--gd) — the word
   layer's mechanic, and here for the same reason: the record should read as
   being PRINTED, left to right, rather than switched on. In the export these
   are inert (no <style> is emitted), so a saved file simply shows the finished
   run, which is the only thing a still of it should show. */
function recordLayer(B,C,bandH){
  const text=recordLine(); if(!text) return '';
  const c=B.w/B.cols;
  const W=(B.cols-2*REC.inset)*c;
  const fit=recFit(text,W,c,bandH);
  const fs=fit.fs, lines=fit.lines, lh=fs*REC.lh, cap=fs*REC.cap;
  const bandY=B.h;
  /* the block is centred in the band: its ink runs from the first line's cap to
     the last line's baseline, and that is what is centred, not the line boxes */
  const blockH=(lines.length-1)*lh+cap;
  const base1=bandY+(bandH-blockH)/2+cap;
  const x=REC.inset*c;
  /* A TSPAN PER WORD, NOT PER LETTER, and the reason is the frame budget rather
     than the look. Per letter this band is three hundred and forty elements each
     running its own CSS animation, all of them starting inside the half-second
     the sheet is lengthening — three hundred and forty style recalculations
     against the poster's own SVG, which is what the growth was juddering behind
     (Karin, 17 Aug). Per word it is sixty. At a .32s fade each, neighbouring
     words overlap so heavily that the sweep reads exactly the same; what changes
     is that it can hold sixty frames a second while it does. */
  const n=lines.reduce((t,l)=>t+l.split(' ').length,0);
  let gi=0, body='';
  lines.forEach((line,i)=>{
    /* JUSTIFIED — every line but the last is pinned to the column's full width
       and the slack is let out between the glyphs (textLength with
       lengthAdjust="spacing", the same pair the word layer uses to hold its
       Figma width). The greedy wrap already fills each line to within a word, so
       what is being distributed is a few per cent and the tracking stays even.
       THE LAST LINE IS LEFT ALONE, as in any justified setting: stretching a
       short final line to the margin is not justification, it is a gap with
       letters in it. */
    const last=i===lines.length-1;
    body+='<text x="'+x.toFixed(1)+'" y="'+(base1+i*lh).toFixed(1)+'"'
       + (last ? '' : ' textLength="'+W.toFixed(1)+'" lengthAdjust="spacing"')+'>'
       /* the space rides INSIDE the preceding word's tspan: a bare space between
          two tspans is whitespace between elements and gets collapsed away */
       + line.split(' ').map((w,j,a)=>'<tspan class="rglyph" style="--gd:'
           + (n<2?0:(gi++/(n-1))*REC.write).toFixed(1)+'ms">'
           + esc(w)+(j===a.length-1?'':' ')+'</tspan>').join('')
       + '</text>';
  });
  /* NO MAT. The sheet's own paper rect already runs the full length of the
     poster, band included (see buildSVG), and the artwork stops dead at the
     band's top edge because that edge IS the artwork's box. There is nothing
     down here to cover.
     #0C55FF is the blue ink ROLE, not a blue: inkedMarkup swaps it for whatever
     the colourway put in that role, so the record recolours with the sheet. */
  return '<g class="record" fill="#0C55FF" font-family="'+REC_FACE.replace(/'/g,'&apos;')+'"'
    +   ' font-weight="400" font-size="'+fs.toFixed(1)+'"'
    +   ' letter-spacing="'+(fs*REC.track).toFixed(2)+'">'+body+'</g>';
}
