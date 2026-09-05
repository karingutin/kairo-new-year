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
const REC_SAYING  ={Courage:'WISHING FOR COURAGE', Growth:'WISHING FOR GROWTH',
                    Renewal:'WISHING FOR RENEWAL', Clarity:'WISHING FOR CLARITY'};
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
/* Rosh Hashanah edition (Karin, 30 Aug): 'month' stopped being a temperature
   reading a while back — its answer word IS the poster's own typography now
   (see monthLayer in js/poster/20-month.js), so the foot just names it. */
function recMonthItem(){
  const m=ans('month');
  return m ? 'MOST ENERGY WENT TO '+String(m).toUpperCase() : '';
}
/* Per question, and only the ones whose answer says something the sheet does
   not already say. THE COLOURWAY IS NOT HERE, deliberately: the poster IS the
   colourway, and naming it is the one item that reports what you can see. */
const REC_ITEM={
  shape:    ()=>REC_SHAPE[ans('shape')]||'',
  density:  ()=>REC_DENSITY[ans('density')]||'',
  month:    recMonthItem,
  /* Rosh Hashanah edition (Karin, 30 Aug): 'febdays' is a wish for the new
     year now, not a birth-month day-count (see js/10-bank.js). */
  febdays:  ()=>{ const v=ans('febdays'); return v ? 'WISHING FOR '+String(v).toUpperCase() : ''; },
  /* 'alarms' stopped being a snooze count a while back — it's new people
     the year brought. */
  alarms:   ()=>{ const n=rayCountFromAnswers();
                  return n===0 ? 'NO NEW PEOPLE THIS YEAR'
                       : n===1 ? '1 NEW PERSON THIS YEAR'
                               : n+' NEW PEOPLE THIS YEAR'; },
  /* 'decades' stopped counting years of life left — it's a wish for next
     year, Calm at one end and Overflowing at the other (same bands as the
     question's own display(), so the panel and the foot never disagree). */
  decades:  ()=>{ const v=ans('decades');
                  return v>55 ? 'WISHING FOR AN OVERFLOWING YEAR'
                       : v<45 ? 'WISHING FOR A CALM YEAR'
                              : 'WISHING FOR A YEAR EVENLY BALANCED'; },
  vacations:()=>REC_MEMORIES[String(ans('vacations'))]||'',
  /* 'sixweek' stopped being week-vs-weekend a while back — it looks back at
     how the year actually turned out, Predictable to Surprising (same
     bands as the question's own display()). */
  sixweek:  ()=>{ const raw=ans('sixweek'), v=Number.isFinite(+raw)?+raw:50;
                  return v<45 ? 'A PREDICTABLE YEAR'
                       : v<=55 ? 'PREDICTABLE AND SURPRISING EVEN'
                               : 'A SURPRISING YEAR'; },
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
/* THE GREETING COMES FIRST, before any of it (Karin, 31 Aug). The band is
   otherwise a record — what was answered, how long it took, when it happened —
   and a record opens with none of that. This one line is the only thing on the
   sheet addressed TO the person rather than about them, so it stands at the
   head of the run and everything else reads as what follows from it.
   Uppercase like every other item; the band is set in caps throughout. */
const REC_GREETING='SHANA TOVA';
function recordItems(){
  const out=[REC_GREETING];
  ASKED.forEach(q=>{
    if(!isAnswered(q.id)) return;
    const write=REC_ITEM[q.id];
    const t = write ? write() : (REC_BIN[q.id] ? REC_BIN[q.id][ans(q.id)] : '');
    if(t) out.push(t);
  });
  return out.concat(recordMeta());
}
/* A DOT, not the double backslash, between items (Karin, 31 Aug: "a small
   circle sitting at half-height between the data points" — see her reference).
   U+2022 BULLET is the character built for exactly this — a mid-height glyph
   with paper on every side of it, which is what makes it read as a separator
   rather than as a mark that belongs to either item beside it. It rides through
   the rest of the pipeline as an ordinary word: recEmWidths measures its own
   one-character advance, the greedy wrap can break a line on either side of it
   same as any other word, and the per-word tspan loop below gives it the
   letter-spacing and the arrival beat everything else gets. */
const REC_SEP='•';
const recordLine=()=>recordItems().join(' '+REC_SEP+' ');

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
     ALWAYS THE DARKER OF THE TWO (Karin, 31 Aug: "let's decide the data line
     is in the poster's dark colour"), not a fixed role. It used to be
     "#0C55FF", the blue ink ROLE — but the two roles are a decision per pair
     (see POSTER_ROLES), not a rule, and blue is the light one in three of the
     five colourways. Fixed to a role, the band would go light-on-paper exactly
     where legibility matters most: the last thing on the sheet, in the
     smallest type on it. So this reads posterInk() and picks by hexLuma
     instead, the same call sayingInk() already makes for the same reason (see
     js/poster/29-word.js) — which is why the literal hex is written straight
     into the markup rather than the frozen-role token inkedMarkup swaps
     everywhere else: there is no fixed token for "whichever is darker". */
  const ink=posterInk();
  const dark=hexLuma(ink.red)<=hexLuma(ink.blue) ? ink.red : ink.blue;
  return '<g class="record" fill="'+dark+'" font-family="'+REC_FACE.replace(/'/g,'&apos;')+'"'
    +   ' font-weight="400" font-size="'+fs.toFixed(1)+'"'
    +   ' letter-spacing="'+(fs*REC.track).toFixed(2)+'">'+body+'</g>';
}

/* ---------------------------------------------------------------------
   THE LOGO BAR — Wix and Base44, and only on the poster that leaves the
   building.

   The interactive sheet never shows this. It exists solely in the raster
   that startShare() uploads and the QR points at (js/app/64-share.js) —
   buildSVG only draws it when told to, and the live views (54-draw.js,
   60-format.js) never ask for it. One more sheet-row below the record
   band, same paper as the rest of the sheet, with the two marks centred
   in it.

   EMBEDDED, NOT REFERENCED. The sheet is rasterised off-DOM, through a
   blob URL (see rasterBlob) — a relative <image href="logos.png"> there
   is one more thing that can fail to resolve before the canvas draws it,
   or that a stricter host could refuse to load at all. A data URI can do
   neither: the bytes are already in the markup. logos.png (536 x 72) is
   small enough — under 6KB — that inlining it costs nothing worth
   avoiding it for. */
const LOGO_BAR_ROWS=1;
const LOGOS_ASPECT=536/72;
const LOGOS_PNG='data:image/png;base64,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';

/* h and w land wherever the sheet's own units put them — 42% of the bar's
   height, centred — which reads as generous quiet-zone padding at 75 units
   a row (see CELL, js/00-core.js) without measuring or bisecting for it the
   way recFit above has to for text of unknown length. The mark's own image
   is fixed, so its fit needs no solving. */
function logoBarLayer(B,bandY,barH){
  const h=barH*0.42, w=h*LOGOS_ASPECT;
  const x=(B.w-w)/2, y=bandY+(barH-h)/2;
  return '<image href="'+LOGOS_PNG+'" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)
       + '" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'"/>';
}
