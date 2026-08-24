/* =====================================================================
   QUESTION BANK — part two draws from here
   ===================================================================== */
/* Every question in the bank has the same shape: a perceptual binary with two
   named sides. This builder keeps the bank readable as a LIST of questions
   rather than a wall of option objects — the thing most likely to be edited is
   the wording, so the wording is what should be visible.
     id     stable key. Goes into the saved record, so renaming one orphans
            every response already collected. Change the title freely; change
            the id only deliberately.
     label  the footer caption on the poster — short, one word where possible
     a / b  [key, name] for the two sides. `a` is the default. */
function bin(id,label,title,a,b,hint){
  return {id, type:'duo', label, title, hint:hint||'', default:a[0],
          options:[[a[0],a[1],''],[b[0],b[1],'']],
          display:v=>v===b[0]?b[1]:a[1]};
}

/* The month question's twelve sides, and what each one actually draws. The
   answer is never rendered as the month's NAME — it indexes this table, and
   the temperature string is what gets set in type, rasterised, and packed with
   circles to build the layer over the grid. Taken verbatim from the Brik
   tool's own monthPreset table so a given month yields the tool's exact
   silhouette. */
const MONTH_TEMPS={
  January:'14c58f', February:'15c58f', March:'16c62f',    April:'19c67f',
  May:'22c72f',     June:'25c77f',     July:'27c81f',     August:'28c82f',
  September:'27c80f', October:'24c75f', November:'20c67f', December:'16c61f'
};
const MONTHS=Object.keys(MONTH_TEMPS);

/* =====================================================================
   THE BANK — asked in this order.

   PLACEHOLDER WORDING. These are here so the interface can be built and felt
   against a real session length; every title is expected to change. What is NOT
   placeholder is the STRUCTURE: the first seven pinned as the base of the
   poster, the tail binaries behind them.

   The order is the author's and is preserved as written — see SHUFFLE_TAIL.
   ===================================================================== */
const QUESTION_BANK=[
  /* ---- the questions that open the session, answered in this order. Every one
     of them draws something, and the order is the order the LAYERS ARRIVE IN,
     not the order they stack in: shape and density lay the base grid itself
     (they used to be asked on the landing screens, before the board was ever
     shown — now the grid is earned like every other layer), month lays the big
     silhouette over it, the snake then runs across the middle, the node pins on
     top, the rings nest into the corner, and the decades band closes the foot.

     febdays sits right after month on purpose. It draws the snake, which is the
     layer that reads first after the silhouette, and putting it before the node
     means the sheet is legible as a composition early rather than late. ---- */
  /* The FIRST question, and the one that decides what the base grid IS: rings
     carried around a centre, or rays moving out from it. Its two sides keep the
     landing screen's ring-and-mark glyphs — see shapeDuoMarkup. */
  {id:'shape', type:'duo', label:'Shape',
   title:'How do you experience time?',
   hint:'Don’t overthink it, go with your gut',
   options:[['square','It moves on without me',''],['circle','It carries me along with it','']],
   default:'square',
   display:v=>v==='circle'?'It carries me along with it':'It moves on without me'},
  /* The SECOND: how dense that grid is — how many rings or rays it runs to.
     Three circles filling up to their level — see densityFillMarkup. */
  {id:'density', type:'duo', label:'Density',
   title:'How much time do you feel like you have?',
   hint:'Don’t overthink it, go with your gut',
   options:[['little','Too little',''],['enough','Enough',''],['plenty','Plenty','']],
   default:'enough',
   display:v=>({little:'Too little',enough:'Enough',plenty:'Plenty'}[v]||v)},
  /* The only question in the bank with twelve sides. Its answer is a month
     NAME, which indexes MONTH_TEMPS: the month's temperature string is what
     gets set, rasterised and packed with circles to make the layer above the
     grid. Written as `choice` so it gets the twelve-up button grid — see
     ctrlChoice. */
  {id:'month', type:'choice', label:'Month',
   title:'Which month\u2019s weather feels like it was made for you?',
   hint:'Think about how the air feels that month',
   options:MONTHS, default:'April',
   /* the layer grows in rather than cutting in — see MONTH_GROW */
   /* FIRST appearance: a plain draw() at full radius, so the CSS scale entrance
      (.hl.enter[data-q="month"]) grows the silhouette in from the sheet centre.
      A LATER pick (month change) keeps the raster re-grow. `entered` holds the
      id only AFTER the first appearance has been tagged, so it is the switch. */
   onPick:()=> entered.has('month') ? startMonthGrow() : draw(),
   display:v=>v},
  /* The SECOND question to reach the artwork: the numbered metaball snake across
     the middle. A `choice`, so it is a CARD with no default — nothing is drawn
     and Save stays shut until the person picks (see needsPick). Its answer is
     the bead COUNT and nothing else; every other control on the tool is frozen
     (see SNAKEL). */
  {id:'febdays', type:'choice', label:'Born',
   title:'How many days are in your birthmonth?',
   hint:'Each month has its own rhythm, what\u2019s yours?',
   options:['28','29','30','31'],
   display:v=>v},
  /* The THIRD. The one count in an otherwise all-binary bank, and the only
     question the node answers to: one ray per snooze. Written as a `number` so
     it uses the existing scrubber control — see ctrlNumber.
     It asks for SNOOZES, not alarms: alarm counts cluster at one or two, so ten
     of the twelve rays would never be drawn. Snooze spans the whole range.
     Zero is a real answer — the node then draws its centre square and no rays
     at all (see rayCountFromAnswers). The id stays `alarms` because it is wired
     into the layer's data-q, the roll table and the CSV columns. */
  {id:'alarms', type:'number', label:'Snooze',
   title:'How many times do you press snooze in the morning?',
   /* "not your best one" cut (Karin, 16 Aug): it was a joke at the answerer's
      expense, and the line reads straighter without it. */
   hint:'Think about a normal morning',
   min:0, max:12, unit:'snoozes', default:1,
   display:v=>String(v)},
  /* THE FOURTH, and the two below it are in the order Karin asked for on
     16 Aug — decades BEFORE memories, the two swapped from where they were
     written. The bank's order is the asking order (see pickQuestions; both sit
     inside the pinned lead), so moving the entries is the whole change. The
     layers it reorders are the foot band and the corner rings, which do not
     overlap on the sheet, so nothing about the composition depends on which
     lands first. */
  /* A BAR with ten stops, 10..100 years, and its answer drives the geometric
     rectangle pattern along the foot of the sheet — one more column of
     rectangles per decade (10y -> 3 columns, 100y -> 12). */
  {id:'decades', type:'bar', label:'Decades',
   title:'How many more decades do you honestly expect to have?',
   /* Kept under 42 characters on purpose: a hint that wraps to two lines pushes
      the bar (hung under the text) half a cell down the card for no reason. */
   hint:'Heavy one, we know',
   min:10, max:100, step:10, unit:'years', default:50,
   display:v=>v+' years'},
  /* THE FIFTH: the nested rings in the top-right corner. Its answer is the ring
     COUNT and nothing else — every other control on the tool is frozen (see
     RINGS), and the lean is the roll (see ROLLS).
     A `choice`, so it is a CARD: a row of circles, one per option, and '4+' on
     the end for anyone who remembers more than a few. Four options, not five —
     the plain '4' card and the ring count it used to draw are both gone; '4+'
     draws what '5+' used to (see ringCountFromAnswers). */
  {id:'vacations', type:'choice', label:'Memories',
   title:'How many core memories pop into your head right now?',
   hint:'How many of them surface?',
   options:['1','2','3','4+'],
   display:v=>v},
  /* The colourway — the LAST question of every session (see `last` and
     pickQuestions), the one that recolours the whole poster. A card: six split
     circles, each half one colour and half the other. Wiring to the poster comes
     later; for now it just records the choice. */
  {id:'colorway', type:'choice', label:'Colour', last:true,
   title:'What colour is your poster?',
   options:['green-red','red-blue','green-blue','random','magenta-cyan','magenta-yellow'],
   display:v=>v},

  /* ---- the tail that follows, where the path forks. vantage ("inside or
     outside of time") and owning ("yours or borrowed") were cut from here by
     decision, and the compass question moved up into their place. ---- */
  /* Question 8 (was 6 before shape and density joined the front), and the first
     binary-slot question to reach the artwork: the
     week/weekend bar drives the ported Geometric Lattice (see latticeLayer). A
     `bar`, so it opens on its middle default and never locks Save. Its ends are
     named, not numbered — the handle snaps to hidden stops. Low end (0) is the
     week (few crosses); high end (100) is the weekend (a field of black X). */
  {id:'sixweek', type:'bar', label:'Week',
   title:'What feels more important, the week or the weekend?',
   hint:'Let the handle settle wherever it honestly sits.',
   min:0, max:100, step:5, default:50, ends:['The week','Weekend'],
   display:v=> v>55?'The weekend' : v<45?'The week' : 'Evenly split'},
  /* The one question whose answer is WORDS. A `choice`, but it never touches the
     month ring: panelControl special-cases it (see compassMarkup) into four
     circles on the points of a compass. The picked word is meant to land on the
     poster as its only typography — that layer is not wired yet; for now the
     answer is only recorded (like every other binary was).
     FOUR options exactly. compassMarkup only draws a compass at four; any other
     count falls back to even angles, which is safe but says nothing.
     The id stays `saying` although the question is no longer about a saying:
     it is the key the answer is stored under, and renaming it orphans every
     response already collected. */
  {id:'saying', type:'choice', label:'Word',
   title:'Which word represents your relationship with time?',
   hint:'Go with your intuition',
   /* Now a ROW of four circles (see panelControl), read left to right in the
      order Karin set on 16 Aug: the two ways the unseen part feels (Trust,
      Worry), then the two places the attention sits (Regret: behind, Presence:
      here). Presence, not Present: the other three are nouns for a stance, and
      "Present" reads first as the span of time rather than the way of being in
      it. */
   options:['Trust','Worry','Regret','Presence'],
   /* EVERY PICK IS WRITTEN OUT, not just the first one. The entrance system is
      one-shot by design — a layer's id goes into `entered` and its .enter class
      never fires again — and for the marks that is right: a ring count changing
      should glide, not replay its birth. But this layer is WORDS, and a word
      that swaps for another word has not moved, it has been written again. So
      the id is taken back out of the set before the repaint, and markEntries
      tags it afresh. See the .sglyph rule for the write itself. */
   onPick:()=>{ entered.delete('saying'); draw(); },
   display:v=>v},
  bin('gaze','Gaze','Right now, are you looking backward more, or forward more?',
      ['back','Backward'], ['forward','Forward']),
  bin('reserve','Reserve','Do you have more time behind you, or ahead of you? Not as it counts, but as it feels.',
      ['behind','Behind me'], ['ahead','Ahead of me']),
  bin('trust','Trust','Is your relationship with time closer to trust, or to worry?',
      ['trust','Trust'], ['worry','Worry']),
  bin('today','Today','Will today be one you remember, or one that blurs into the others?',
      ['remember','Remembered'], ['blur','Blurred']),
  bin('novelty','Novelty','Is there more in your life that repeats, or more that’s new?',
      ['repeats','Repeats'], ['new','New']),
  bin('supply','Supply','Do you feel like you’re running out of time, or like there’s more of it than you’ll ever use?',
      ['scarce','Running out'], ['plenty','More than enough'])
];
/* the first seven are the base of the poster and must always be asked — shape,
   density, month, febdays, alarms, vacations and decades, each laying down a
   layer of the artwork. This reads the ARRAY, so the order above is the order
   asked: move a question inside the first seven and the lead reorders with it,
   nothing else to change. */
QUESTION_BANK.slice(0,7).forEach(q=>{ q.pinned=true; });
const BANK=Object.fromEntries(QUESTION_BANK.map(q=>[q.id,q]));

/* ---------------------------------------------------------------------
   HOW THE ANSWERS REACH THE ARTWORK — provisional.

   Three questions reach it and no others: month sets the letterforms of the
   layer over the grid, alarms sets the node's ray count, and happiness sets
   the beam count of the sculpture on top. The remaining ten are recorded in
   the response and draw nothing. Every line here is one line, and every line
   is expected to change.

   Each of those three tools also has ONE control the answer does not move and
   a person can re-roll by hand from the card — see ROLLS, further down, with
   the tools it reads from.
   --------------------------------------------------------------------- */
/* One ray per snooze. This is the whole of the node's wiring: every other
   control on it is frozen (see NODE), so the alarms answer is the only thing
   that moves. Clamped to the question's own range so a stale saved answer from
   an older bank can never ask for 400 rays. ZERO IS LEGAL and floors at zero,
   not one: someone who never snoozes gets the bare centre square. Written the
   long way rather than with `||`, because `0||1` would quietly promote a real
   zero to one ray. */
const rayCountFromAnswers=()=>{
  const n=Math.round(ans('alarms'));
  return Number.isFinite(n) ? Math.max(0,Math.min(12,n)) : 0;
};

/* Happiness sets the beam count, and that is the whole of the beams' wiring:
   every other control on them is frozen (see BEAMS). The question's 1..10 is
   mapped onto a beam range rather than used raw — one beam would not read as a
   ring and ten would barely be a change from it, so the scale is stretched to
   a span that is legible at both ends. Clamped to the question's own range so
   a stale saved answer can never ask for a thousand beams. */
const BEAM_MIN=8, BEAM_MAX=32;
const beamCountFromAnswers=()=>{
  const h=Math.max(1,Math.min(10,Math.round(ans('happiness'))||1));
  return Math.round(BEAM_MIN+((h-1)/9)*(BEAM_MAX-BEAM_MIN));
};
/* One ring per vacation. This is the whole of the ring stack's wiring: every
   other control on the tool is frozen (see RINGS), so the vacations answer is
   the only thing that moves. Clamped so a stale saved answer from an older
   bank can never ask for a hundred rings. */
/* '4+' takes over the FIFTH ring definition — the visual '5+' used to draw
   (the option was renamed, not the ring count it reaches); a plain '1'..'3'
   parses straight through. The bank's own fourth ring (a plain '4') is
   deleted along with the option — no answer can reach it any more. */
const ringCountFromAnswers=()=>{
  const v=String(ans('vacations'));
  if(v==='4+') return 5;
  return Math.max(1,Math.min(3,parseInt(v,10)||1));
};

/* One bead per February day. The febdays answer is a string ('28'..'31'); it is
   the snake's bead COUNT and nothing else — every other control on the tool is
   frozen (see SNAKEL). Clamped to the four real answers so a stale saved value
   can never ask for a thousand beads. Falls back to 31 only as a guard; the
   snake never draws until the card is actually picked (isChosen). */
const beadCountFromAnswers=()=>Math.max(28,Math.min(31, parseInt(ans('febdays'),10)||31));

/* The six colourways the last question offers — each a pair [colourA, colourB]
   drawn as the two halves of a split circle. Wiring to the poster comes later. */
const COLORWAYS={
  'green-red':     ['#0DD375','#FF48B0'],   /* green + pink */
  'red-blue':      ['#F5242B','#0C55FF'],
  'green-blue':    ['#0DD375','#0C55FF'],
  'magenta-cyan':  ['#FF48B0','#2CCDFF'],
  'magenta-yellow':['#EFD61B','#F5242B']   /* yellow + red */
  /* the sixth swatch, 'random', is not a fixed pair — it rolls a pair from the
     interface's colour bank on pick (see rollRandomPair / S.randomPair). */
};
/* the interface's whole colour bank — the pool 'random' draws its pair from */
const BANK_COLORS=['#0DD375','#F5242B','#0C55FF','#FF48B0','#2CCDFF','#EFD61B'];
/* roll a fresh pair of two DISTINCT bank colours into the red/blue ink roles.
   Uses Math.random like newSeed does — a new pair each time the swatch is picked. */
function rollRandomPair(){
  const pool=BANK_COLORS.slice();
  const a=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
  const b=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
  S.randomPair={red:a, blue:b};
  return S.randomPair;
}
/* the two colours the chosen swatch actually shows / prints — resolves 'random'
   through S.randomPair, every other key straight from COLORWAYS */
function currentColorwayPair(){
  if(ans('colorway')==='random'){ const p=S.randomPair; return p?[p.red,p.blue]:null; }
  return COLORWAYS[ans('colorway')]||null;
}
/* Each colourway recolours the poster's TWO ink roles: `red` replaces every
   #F5242B, `blue` replaces every #0C55FF (and the month/grid #004CFF). The warm
   colour of the pair takes the red role, the cool one the blue role; the two
   same-temperature pairs are assigned by decision (green->red role in green+blue,
   magenta->red role in magenta+yellow). Applied by buildSVG once a choice is made. */
const POSTER_ROLES={
  'red-blue':      {red:'#F5242B', blue:'#0C55FF'},
  'green-red':     {red:'#FF48B0', blue:'#0DD375'},   /* green + pink */
  'green-blue':    {red:'#0DD375', blue:'#0C55FF'},
  'magenta-cyan':  {red:'#FF48B0', blue:'#2CCDFF'},
  'magenta-yellow':{red:'#F5242B', blue:'#EFD61B'}   /* yellow + red */
};
const posterInk=()=>{
  /* 'random' takes its two inks from the rolled pair rather than a fixed table */
  const base = ans('colorway')==='random'
    ? (S.randomPair || {red:'#F5242B', blue:'#0C55FF'})
    : (POSTER_ROLES[ans('colorway')] || POSTER_ROLES['red-blue']);
  /* double-clicking the chosen colourway flips its two inks: the warm colour and
     the cool colour trade the red-role/blue-role, so the whole sheet swaps. */
  return S.colorSwap ? {red:base.blue, blue:base.red} : base;
};
/* Apply the chosen colourway to a markup STRING — one simultaneous pass over the
   three frozen hexes, exactly what buildSVG does to the whole sheet. Factored
   out because the sheet is NOT the only writer: the snake, node and ring glides
   re-emit their own group per frame, straight into the DOM, and an unrecoloured
   frame there snaps the layer back to red/blue the moment it moves (the
   revisit-after-colourway bug). Every innerHTML write of layer markup must go
   through here. Untouched until a colourway is actually chosen. */
function inkedMarkup(s){
  if(!isChosen('colorway')) return s;
  const ink=posterInk();
  /* ONE pass, not three sequential ones — see the note in buildSVG: a sequential
     replace lets one swap's output be re-swapped by the next and the sheet
     collapses to a single colour. */
  /* #0059FF is the saying layer's own frozen blue (see SAYING_TEXT); its red
     is the shared red role, so it needs no entry of its own */
  const map={'#F5242B':ink.red, '#0C55FF':ink.blue, '#004CFF':ink.blue,
             '#0059FF':ink.blue};
  return s.replace(/#F5242B|#0C55FF|#004CFF|#0059FF/g, m=>map[m]);
}

/* Smoke is inert: nothing in this bank is a duration, and the layer paints over
   the type at any strength worth seeing. Left wired but at zero rather than
   deleted, so the rendering path stays exercised. */
const smokeFromAnswers=()=>0;

/* answer for a question, falling back to its default when it wasn't drawn */
function ans(id){
  const q=BANK[id];
  return S.answers[id]!==undefined ? S.answers[id] : (q?q.default:undefined);
}

/* which questions this session asks.
   `when` gates a question against the profile; pinned ones come first,
   the rest are drawn with the session seed. Recomputed once part one is
   done, so the draw sees the real age and today's date. */
function pickQuestions(seed){
  const D=derive();
  const avail=QUESTION_BANK.filter(q=> q.when ? q.when(D) : true);
  const pinned=avail.filter(q=>q.pinned);
  /* `last` questions (the colourway) are pinned to the VERY END, after the pool —
     always the final thing a session asks, however many questions are added. */
  const last=avail.filter(q=>q.last);
  const pool=avail.filter(q=>!q.pinned && !q.last);
  /* Only shuffled when asked for. The bank is written as a sequence that builds
     on itself, so the authored order is the default and the shuffle is opt-in —
     it is still here because it is what makes a smaller
     QUESTIONS_PER_SESSION draw a varying subset rather than always the first N. */
  if(CONFIG.SHUFFLE_TAIL){
    const rnd=mulberry32(seed>>>0);
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(rnd()*(i+1));
      const t=pool[i]; pool[i]=pool[j]; pool[j]=t;
    }
  }
  const total=Math.min(Math.max(CONFIG.QUESTIONS_PER_SESSION,pinned.length+last.length), avail.length);
  const midCount=Math.max(0, total-pinned.length-last.length);
  return pinned.concat(pool.slice(0, midCount), last);
}
let ASKED=[];

