/* =====================================================================
   ARCHITECTURE OF TIME

   PART ONE  — profile: full name, date of birth (optional), age.
               Today's date is available to every question via derive().
   PART TWO  — questions drawn at random from QUESTION_BANK.

   ADDING A QUESTION: append an entry to QUESTION_BANK below. Every entry
   needs an id, a type, and a default (used when the draw skips it).
   title / hint / min / max may each be a function receiving the derived
   context D — that is how a question becomes relative to age or to today.
   Set pinned:true on a question that must always be asked.
   ===================================================================== */
const BUILD='b291310';   // shown bottom-left, so you can confirm which build you are looking at
/* HOW LONG THE BOARD TAKES TO TURN OVER, in ms, and it is the JS twin of the
   CSS's --flip. It exists because ONE thing has to wait for a transition CSS
   owns: the way out cuts in only once the ground has finished going to its
   negative (see renderFinish). If --flip is retuned, this number moves with it
   — they are one duration written twice, exactly as MORPH_MS and --morph
   already are. The curve is --eo, so the colour is all but arrived well before
   this elapses; the wait is for the end of it, not for the look of it. */
const FLIP_MS=460;
const CONFIG = {
  DATA_ENDPOINT: "",            // e.g. "https://hook.eu2.make.com/xxxxx"
  POST_TO_PARENT: true,
  QUESTIONS_PER_SESSION: 10,    // how many bank questions to draw
  SHUFFLE_TAIL: false,          // true = shuffle everything after the pinned lead.
                                // false keeps the bank's authored order, which is
                                // deliberate: the questions build on each other.
  /* The opening screen — title, one line, Begin. It collects nothing: the name
     and birthdate fields it used to carry are gone, since the poster has no
     text on it and neither value ever drove a mark. Off drops the screen and
     opens straight onto the board and its first question. (Was ASK_PROFILE,
     which named a job this screen no longer has. S.name/S.dob remain in the
     state and in payload() so already-collected responses keep their shape —
     they are just never filled now; see the note in payload.) */
  SHOW_OPENING: true,
  FORMAT: 'sheet',              // the format the board opens on
  /* Off for now: the format control is hidden and the board is locked to
     CONFIG.FORMAT. The FORMATS list, the morph, and the whole switcher stay in
     the code — set this back to true to bring the control back rather than
     rebuilding it. */
  FORMAT_SWITCHER: false,

  /* ---- how the sequence opens up ----
     The first LINEAR_LEAD questions are answered strictly in order: they are
     the base of the poster, and each one changes the ground the next is asked
     against. Only after them does the path fork, and then any of the next
     OPEN_AHEAD is available — so there is always a choice of where to go
     without ever losing the thread.
     Five, not three: shape and density (the two questions that used to open
     the landing sequence, and now lay the base grid) joined the front of the
     bank, so the strict walk covers them plus the month/snake/node trio it
     always covered. */
  LINEAR_LEAD: 5,
  OPEN_AHEAD: 2,

  /* the wake that travels from the question just answered toward the next one.
     Runs after every answer. Set false to drop the gesture entirely. */
  GUIDE_LINE: true
};

/* =====================================================================
   FORMATS

   A format is measured in grid cells, never in pixels. That is deliberate:
   because every format is a whole number of cells, all four of the sheet's
   edges land on grid lines at EVERY format, not just at the default one —
   which is the same property the original 18-cell sheet was built around.

   It also lets the ratios be exact rather than approximate:
     20 x 25 = 4:5      18 x 32 = 9:16     32 x 18 = 16:9
     20 x 28 = 5:7      18 x 27 = 2:3      22 x 22 = 1:1
   The only compromise is A-series: 17 x 24 is 0.7083 against 1:√2's 0.7071,
   off by 0.17%, which is finer than the print tolerance anyway.

   ADDING A FORMAT: append an entry. Nothing else needs to change — the
   poster, the sheet, the grid and the dot field are all derived.
   ===================================================================== */
/* CELL COUNTS ARE THE INTERFACE LATTICE. That is the whole reason they are what
   they are: the sheet is snapped to whole cells from the grid's origin, so the
   number of cells across a format IS the coarseness of the lattice the whole
   board is drawn on. The question system's mock puts ~13 cells across the
   sheet, which is where these counts come from — the previous 21×30 drew a
   lattice about 1.6x finer than the design.

   Ratio accuracy is unharmed and in two places improved: 14:20 is 7:10 exactly,
   12:15 is 4:5 exactly, 9:16 is 9:16 exactly, and A-series is 12:17 = 0.7059
   against 1:√2's 0.7071 — out by 0.17%, the same as the 17:24 it replaces.

   CELL rises with the counts so the poster's own units do not move: 14 x 75 is
   the same 1050 as 21 x 50. */
const FORMATS=[
  /* print */
  {id:'sheet',    label:'Sheet',     ratio:'7:10', cols:14, rows:20, use:'70 × 100 cm print'},
  {id:'iso',      label:'A-series',  ratio:'1:√2', cols:12, rows:17, use:'A2 / A3 / A4'},
  /* social */
  {id:'feed',     label:'Portrait',  ratio:'4:5',  cols:12, rows:15, use:'Instagram feed'},
  {id:'story',    label:'Story',     ratio:'9:16', cols:9,  rows:16, use:'Instagram story · Reels'}
];
const FMTS=Object.fromEntries(FORMATS.map(f=>[f.id,f]));
/* Cell counts are chosen for RATIO ACCURACY first. Three of the four are exact
   — 21:30 is 7:10, 20:25 is 4:5, 18:32 is 9:16 — and A-series is 17:24, which
   is 0.7083 against 1:√2's 0.7071, out by 0.17%.
   Odd counts are fine: syncSheet snaps the sheet to whole cells rather than
   centring it exactly, so all four edges land on grid lines either way.

   Dropping the extremes matters more than it looks: the cell size is set by the
   widest and the tallest format in this list, so a 16:9 or a 4:10 was forcing
   every other format to be small enough to leave room for it. With the list
   down to four, nothing is wider than 21 cells or taller than 32, and the
   poster comes out LARGER than it ever has. */
/* THE SHEET IS ONE ROW TALLER ONCE THE POSTER IS MADE. Pressing Create
   lengthens it downward by exactly this many cells, and that row is the data
   record (see js/app/63-record.js). The artwork does not move, does not scale
   and does not lose a millimetre: the sheet simply gets longer underneath it.
   Declared here, with the formats, because it is part of every format's real
   footprint and three other things have to know it — the cell size, the union
   the dots keep clear of, and the poster's own viewBox.

   ONE ROW, DOWN FROM TWO (Karin, 17 Aug). The record is capped at three lines,
   and three lines set across the sheet's width come out about two thirds of a
   cell tall — so two rows left the run floating in the middle of the band with
   half a cell of paper above and below it, reading as a caption dropped into a
   space rather than as the end of the sheet. At one row the three lines very
   nearly fill it, which is the proportion the reference has. */
const RECORD_ROWS=1;
/* the widest and the tallest format, which is what the cell size has to
   accommodate so that no format ever overflows the viewport */
const MAXC=Math.max(...FORMATS.map(f=>f.cols));
const MAXR=Math.max(...FORMATS.map(f=>f.rows));
/* THE SAME, PLUS THE RECORD, and the two are kept apart on purpose.

   MAXR is the ARTWORK's tallest format and it is what the interface is laid out
   against: the mark, the question panel and the dot field are all placed clear
   of a box that MAXR sizes, and that box is symmetrical about the grid's origin.
   The record does not make the artwork taller — it hangs BELOW it — so folding
   its rows into MAXR pushed the whole reserved box up by a cell and took the
   KAIRO mark off the sheet's top line with it (Karin, 17 Aug).

   MAXR_FULL is the tallest a SHEET ever gets, artwork plus band, and it has
   exactly one job: sizing the cell, so the made poster cannot overflow the
   screen. The room is reserved at load rather than found at the Create press,
   which is what lets the sheet grow without one thing on the board shifting.
   Everything asymmetric about the growth is handled where it belongs — see
   unionBox, which extends downward only. */
const MAXR_FULL=MAXR+RECORD_ROWS;

/* One grid cell, in poster units. CONSTANT — and paired with the cell counts
   above: it went 50 -> 75 when they went 21 -> 14, so the default sheet is
   still exactly 1050 x 1500 units and every exported poster is unchanged. */
const CELL=75;
                                           // across formats — a bigger format holds
                                           // more cells, it does not hold bigger ones.
/* NOT crispEdges — antialiased on purpose, and the reason is the flicker.
   The poster is drawn in its own units and scaled to fit the sheet, so a
   sub-2px stroke lands on a fractional number of device pixels. crispEdges
   turns antialiasing OFF, which forces the rasterizer to snap every line to
   whole device pixels — so the same line comes out as 1px or 2px depending
   purely on where it currently falls between them. That would be harmless on
   a still image, but this board never is: the world drifts with the pointer
   and keeps easing for over a second after it stops, so each line would jump
   width frame by frame and the whole grid would blink. Antialiasing renders
   the same fractional coverage the same way wherever the line sits, so it
   holds still. */
const GRID_RENDERING='geometricPrecision';
const SMOKE='#6F6A62';

/* the current format, and the box it implies */
const FMT=()=>FMTS[S.format]||FMTS[CONFIG.FORMAT];
/* Every measurement the poster needs, derived from a format rather than fixed.
   Once the poster lost its text and its central shape there was very little
   left to measure: the head/foot hairlines, the band they bracketed, the type
   scale k and the type margin all went with them. What remains bleeds — the
   base grid divides the full w and h, and the node sizes itself off w
   directly (see NODE) — so the sheet's own dimensions are the whole of it. */
function box(F){
  F=F||FMT();
  return {w:F.cols*CELL, h:F.rows*CELL, cols:F.cols, rows:F.rows};
}

/* THE PAPER — the sheet's ground and the colour its grid is ruled in, and the
   only two colours the poster derives from anything other than a tool's own
   frozen inks. Everything else on the sheet now brings its own: the node its
   riso red and blue, the month layer its #004CFF contour.

   This was a two-entry table (night / morning) chosen by the `memory` question,
   which the month question replaced. Rather than keep two palettes where only
   one can ever be selected, it is now the one palette actually in use. To make
   the ground answer a question again, turn this back into a table and pick
   from it in buildSVG — every layer already reads C rather than a literal, so
   nothing else has to change. The dead fg/text/soft entries went with the
   poster's text and its central shape. */
const PAPER={bg:'#FAF8F8', grid:'#004CFF'};

/* ---------- helpers ---------- */
function hash(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const pad2=v=>String(v).padStart(2,'0');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const commas=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
const val=(x,D)=>typeof x==='function'?x(D):x;

/* =====================================================================
   STATE
   ===================================================================== */
/* Everything the landing sequence collects, reset together by resetAll().
   baseDone gates the entire board — see availableQs(). It used to also mark
   the three base questions as banked; those moved into the bank itself (shape
   and density are now questions 1 and 2, the arrival dial was removed), so
   all that is left to finish is the opening screen. */
const PROFILE_DEFAULTS={
  name:'', dob:'', age:'',
  baseDone:false
};
/* done    the question is behind us, whether answered or skipped
   touched the person actually moved a control rather than accepting the default
   skipped the person passed on it: done, but it must not reach the artwork and
           must not be reported as an answer */
/* rolls    the randomised look of each tool, keyed by question id. NOT an
            answer — see ROLLS. Kept in S because the poster cannot be
            reproduced from the answers alone once one has been rolled. */
const S={ ...PROFILE_DEFAULTS, answers:{}, reached:{}, done:{}, touched:{}, skipped:{},
          rolls:{}, seed:0, format:CONFIG.FORMAT, colorSwap:false };
const isSkipped=id=>!!S.skipped[id];
/* answered = behind us AND not passed over. This is the count that means
   something to a person; S.done is the one that means something to the flow. */
const isAnswered=id=>!!S.done[id] && !S.skipped[id];
/* Whether a question has an answer the person actually CHOSE, which is what
   every layer of the artwork gates on. Two ways to qualify and they matter at
   different moments: `touched` covers the card still being open — move the
   slider and the mark appears immediately, so the control is visibly wired to
   the sheet — and `isAnswered` covers it afterwards, including saving the
   standing default without moving anything. Reaching a question is NOT enough:
   opening a card registers a default so the record is never half-written, and
   drawing on that would put a mark on the poster nobody asked for. A skip
   clears both (see step), so passing a question leaves its layer off. */
const isChosen=id=>!!S.touched[id] || isAnswered(id);
/* A QUESTION ANSWERED BY PICKING A CARD HAS NO DEFAULT.
   The wheel is a scale and its pointer has to be somewhere, so a count opens on
   a value. A row of cards is not a scale: one of them sitting pre-chosen is an
   answer nobody gave, and Save would bank it. So for these, nothing is
   registered until the person picks, and Save stays shut until they do. */
const CARD_TYPES=new Set(['choice','duo']);
const needsPick=q=>!!q && CARD_TYPES.has(q.type);
/* What the controls should show as chosen: the registered answer, never the
   bank's fallback — otherwise a card would light up before it was picked. */
const picked=id=>isChosen(id) ? ans(id) : null;

/* ---------------------------------------------------------------------
   Derived context — everything relative to today's date lives here.
   Add more fields as the bank grows; every question can read them.
   --------------------------------------------------------------------- */
function derive(){
  const today=new Date(); today.setHours(0,0,0,0);
  let dob=null;
  if(S.dob){ const d=new Date(S.dob+'T00:00:00'); if(!isNaN(d.getTime()) && d<=today) dob=d; }

  let age=parseInt(S.age,10);
  if(!Number.isFinite(age)) age=0;

  let daysLived=null, daysToBirthday=null;
  if(dob){
    age=today.getFullYear()-dob.getFullYear();
    const m=today.getMonth()-dob.getMonth();
    if(m<0 || (m===0 && today.getDate()<dob.getDate())) age--;
    daysLived=Math.floor((today-dob)/86400000);
    const nb=new Date(today.getFullYear(),dob.getMonth(),dob.getDate());
    if(nb<today) nb.setFullYear(nb.getFullYear()+1);
    daysToBirthday=Math.round((nb-today)/86400000);
  }
  age=Math.max(0,Math.min(99,age));
  const knownAge=!!dob || String(S.age)!=='';
  return {today,dob,age,daysLived,daysToBirthday,ageFromDob:!!dob,knownAge};
}

