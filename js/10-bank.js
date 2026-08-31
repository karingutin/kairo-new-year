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

/* The colourway question's whole colour bank (Rosh Hashanah edition, Karin
   26 Aug) — six solid swatches, the only source of poster ink. Declared here,
   ahead of QUESTION_BANK, because the colorway entry's `options` reads it
   directly. */
const BANK_COLORS=['#FF710B','#0C995A','#8ED316','#A90F3C','#FF4FFC','#F9C816'];

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
  /* NO LONGER ASKED (Rosh Hashanah edition) — `hidden:true` pulls both out of
     pickQuestions entirely (see its `avail` filter), so the base grid is a
     fixed medium circle grid from the first draw rather than something earned
     over two questions. The entries stay in the bank, unpinned, because ans()
     and isChosen() (see js/poster/22-base-grid.js) still read their `default` —
     deleting them would leave those calls with nothing to fall back to.
     shape's default moved 'square' -> 'circle' to match the fixed grid; month
     (was THE THIRD) is now THE FIRST asked. */
  {id:'shape', type:'duo', label:'Shape', hidden:true,
   title:'How do you experience time?',
   hint:'Don’t overthink it, go with your gut.',
   options:[['square','It moves on without me',''],['circle','It carries me along with it','']],
   default:'circle',
   display:v=>v==='circle'?'It carries me along with it':'It moves on without me'},
  {id:'density', type:'duo', label:'Density', hidden:true,
   title:'How much time do you feel like you have?',
   hint:'Don’t overthink it, go with your gut.',
   options:[['little','Too little',''],['enough','Enough',''],['plenty','Plenty','']],
   default:'enough',
   display:v=>({little:'Too little',enough:'Enough',plenty:'Plenty'}[v]||v)},
  /* Was the twelve-month ring; now eight life areas (Karin, 30 Aug — the
     English month names read as foreign against a Rosh Hashanah edition).
     The answer word is no longer a KEY into a lookup table — it IS the type
     that gets rasterised and packed with circles for the layer above the
     grid (see monthLayer in js/poster/20-month.js). Still `id:'month'`
     (renaming it would mean re-touching every file that reads/writes that
     id) and still `type:'choice'` for the ring-of-circles control — see
     monthRingMarkup, which now wraps at any option count, not just twelve. */
  {id:'month', type:'choice', label:'Focus',
   title:'Where did most of your energy go this year?',
   hint:'Not where you meant to \u2014 where it actually went.',
   options:['CAREER','FAMILY','HEALING','ROMANCE','FRIENDS','TRAVEL','LEISURE','FAITH'], default:'FAMILY',
   /* FIRST appearance: a plain draw() at full radius, so the CSS scale
      entrance (.hl.enter[data-q="month"]) grows the silhouette in from the
      sheet centre. A LATER pick (word change) instead re-plays the radius
      ladder (startMonthGrow, restored from the original build — Karin,
      30 Aug). `entered` holds the id only AFTER the first appearance has
      been tagged, so it is the switch. */
   onPick:()=> entered.has('month') ? startMonthGrow() : draw(),
   display:v=>v},
  /* The SECOND question to reach the artwork: the radial block of beams.
     Was "how many days are in your birthmonth" (Karin, 30 Aug: replaced —
     read as foreign against this edition, and unrelated to the theme). Now
     a wish, and the answer is no longer a COUNT — the beam count is frozen
     (see RADIAL.beamCount in js/poster/26b-radial-block.js) and the answer
     instead picks the beams' CAP SHAPE (RADIAL_SHAPE_BY_ANSWER, same file):
     Good news -> star, Promotion -> plus/cross, Closure -> circle,
     Reunion -> diamond. Still `id:'febdays'` and still `type:'choice'`
     for the same reason `month` kept its id — renaming would mean
     re-touching every file wired to it. */
  {id:'febdays', type:'choice', label:'Wish',
   title:'What do you want the new year to bring you?',
   hint:'Not what you expect \u2014 what you want.',
   options:['Good news','Promotion','Closure','Reunion'], default:'Good news',
   /* FIRST appearance only re-arms .enter (the CSS fade in css/10-chrome.css)
      \u2014 a LATER pick (the shape actually changing) is caught by syncRadial
      in js/app/54-draw.js instead, which glides every beam and the cap
      outline itself from the old shape to the new one (see startRadialMorph
      in js/poster/26b-radial-block.js). Karin, 30 Aug: this used to delete
      itself from `entered` on every pick so the fade replayed each time \u2014
      right up until the morph existed to replay instead, at which point
      that kept re-arming .enter and syncRadial saw .enter TRUE on every
      pick, read it as "the entrance owns this", and never started the
      morph at all. Plain draw() \u2014 same as every other choice question \u2014 is
      what lets `entered` stay true after the first pick. */
   onPick:()=>draw(),
   display:v=>v},
  /* THE THIRD (Karin, 30 Aug: swapped with the memories card below, which
     used to lead here). A BAR with ten stops, 10..100, and its answer
     drives the geometric rectangle pattern along the foot of the sheet —
     one more column of rectangles per stop (10 -> 3 columns, 100 -> 12).
     Rosh Hashanah edition (Karin, 26 Aug): was "how many more decades", now
     a wish for next year, with the same density-as-metaphor move as
     `sixweek` — a calm year keeps the pattern sparse, an overflowing one
     fills it in. The `ends` pair switches barMarkup from a numeric readout
     to the two named labels (see js/ui/43-horizon.js), so `unit` and
     `display`'s old "N years" text no longer show; min/max/step and the
     layer they drive are untouched. */
  {id:'decades', type:'bar', label:'Wish',
   title:'What kind of year do you wish for yourself?',
   /* Kept under 42 characters on purpose: a hint that wraps to two lines pushes
      the bar (hung under the text) half a cell down the card for no reason. */
   hint:'No wrong answer here.',
   min:10, max:100, step:10, default:50, ends:['Calm','Overflowing'],
   /* the midpoint used to read 'Somewhere in between' — the exact same
      string 'sixweek' shows at ITS midpoint below, so the hover card at
      decades=50 and the hover card at sixweek's centre carried identical
      titles despite being two different questions (Karin, 31 Aug — she
      caught it on two side-by-side screenshots). Matched to the wording the
      record band already uses for this same value instead — recordItems()
      in js/app/63-record.js writes 'WISHING FOR A YEAR EVENLY BALANCED' for
      exactly this range, so the card now agrees with the sheet's own foot
      rather than inventing separate wording for the same fact. */
   display:v=> v>55?'Overflowing' : v<45?'Calm' : 'Evenly balanced'},
  /* THE FOURTH, and the two either side of it are in the order Karin asked
     for on 16 Aug, then 30 Aug (twice) — the bank's order is the asking
     order (see pickQuestions; all three sit inside the pinned lead), so
     moving an entry is the whole change. The layers these reorder don't
     overlap on the sheet, so nothing about the composition depends on
     which lands first.
     The nested rings in the top-right corner. Its answer is the ring COUNT
     and nothing else — every other control on the tool is frozen (see
     RINGS), and the lean is the roll (see ROLLS). A `choice`, so it is a
     CARD: a row of circles, one per option, and '4+' on the end for anyone
     who remembers more than a few. Four options, not five — the plain '4'
     card and the ring count it used to draw are both gone; '4+' draws what
     '5+' used to (see ringCountFromAnswers). */
  {id:'vacations', type:'choice', label:'Memories',
   title:'How many good memories from this year still surface?',
   hint:'The ones that come back on their own.',
   options:['1','2','3','4+'],
   display:v=>v},
  /* THE FIFTH (Karin, 30 Aug: swapped with the rings above, which used to
     lead). The one count in an otherwise all-binary bank, and the only
     question the node answers to: one ray per person. Written as a `number` so
     it uses the existing scrubber control — see ctrlNumber.
     Rosh Hashanah edition: was snooze count, reworded to new people met this
     year (Karin, 26 Aug). Zero is a real answer — the node then draws its
     centre square and no rays at all (see rayCountFromAnswers). The id stays
     `alarms` because it is wired into the layer's data-q, the roll table and
     the CSV columns. */
  {id:'alarms', type:'number', label:'People',
   title:'How many new people did this year bring you?',
   hint:'Think of the ones who stayed.',
   min:0, max:12, unit:'people', default:1,
   display:v=>String(v)},
  /* The colourway — the LAST question of every session (see `last` and
     pickQuestions), the one that recolours the whole poster. Rosh Hashanah
     edition, second pass (Karin, 27 Aug): back to the original mechanic —
     five FIXED pairs plus a sixth 'random' swatch that rolls one from the
     colour bank, a card of six split circles. (The 26 Aug pick-two-from-six
     version lasted one round; see COLORWAYS/POSTER_ROLES/rollRandomPair and
     colorwayMarkup for the restored machinery, and the click handler in
     js/app/71-qsys-input.js.) */
  {id:'colorway', type:'choice', label:'Colour', last:true,
   title:'What colour is your poster?',
   hint:'',
   options:['green-pink','bordeaux-yellow','bordeaux-lime','pink-orange','green-bordeaux','random'],
   /* The poster is never actually inkless — posterInk() falls back to this
      exact pair (DEFAULT_INK) before anyone has touched this question, so
      arriving here to find green-pink un-marked looked like a lie: the sheet
      already IS that colour. `default` here only feeds colorwayMarkup's own
      pre-pick display (see its `pk` line) — it does not touch S.answers or
      unlock Save, which still needs a real pick, same as before. */
   default:'green-pink',
   display:v=>v},

  /* ---- the tail that follows, where the path forks. vantage ("inside or
     outside of time") and owning ("yours or borrowed") were cut from here by
     decision, and the compass question moved up into their place. ---- */
  /* Rosh Hashanah edition: was the week/weekend bar (Karin, 26 Aug), now a
     look back at the year itself — still the first binary-slot question to
     reach the artwork, still driving the ported Geometric Lattice (see
     latticeLayer) the same way. A `bar`, so it opens on its middle default
     and never locks Save. Its ends are named, not numbered — the handle
     snaps to hidden stops. Low end (0) is predictable (few crosses); high end
     (100) is surprising (a field of black X) — density as a stand-in for how
     eventful the year felt. */
  {id:'sixweek', type:'bar', label:'Turnout',
   title:'Looking back, how did this year turn out?',
   hint:'Let the handle settle wherever it honestly sits.',
   min:0, max:100, step:5, default:50, ends:['Predictable','Surprising'],
   /* see the note on 'decades' above — this used to share its exact
      midpoint title with that question's. Echoes the record band's own
      words for this value, 'PREDICTABLE AND SURPRISING EVEN' (see
      js/app/63-record.js), without the 'and': at the card title's size
      the full phrase wraps to two lines and pushes the three-line body
      below it past the card's fixed height (measured, 31 Aug) — see
      CLAUDE.md and the note on the body copy's own 57-75 character band
      in js/app/62-hover-notes.js for why that box does not forgive
      overflow. */
   display:v=> v>55?'Surprising' : v<45?'Predictable' : 'Predictable, surprising'},
  /* The one question whose answer is WORDS. A `choice`, but it never touches the
     month ring: panelControl special-cases it (see compassMarkup) into four
     circles on the points of a compass. The picked word lands on the poster as
     its only typography — see sayingLayer in js/poster/29-word.js.
     FOUR options exactly. compassMarkup only draws a compass at four; any other
     count falls back to even angles, which is safe but says nothing.
     The id stays `saying` although the question is no longer about a saying:
     it is the key the answer is stored under, and renaming it orphans every
     response already collected.
     Rosh Hashanah edition (Karin, 26 Aug): a wish for next year, not a
     relationship with time — the four options and the title changed together;
     order is the order Karin gave, read left to right on the compass. */
  {id:'saying', type:'choice', label:'Word',
   title:'What do you wish for yourself next year?',
   hint:'Go with your gut.',
   options:['Courage','Renewal','Clarity','Growth'],
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
/* The first five NON-HIDDEN entries are the base of the poster and must always
   be asked — month, febdays, alarms, decades and vacations, each laying down a
   layer of the artwork. shape and density (see their `hidden` entries above)
   are skipped by the filter, so they never occupy a lead slot. This reads the
   ARRAY, so the order above is the order asked: move a question inside the
   first five and the lead reorders with it, nothing else to change. */
QUESTION_BANK.filter(q=>!q.hidden).slice(0,5).forEach(q=>{ q.pinned=true; });
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

/* The five colourways the question offers as FIXED pairs — each [colourA,
   colourB], drawn as the two halves of a split circle (see colorwayMarkup).
   Restored (Karin, 27 Aug) after one round with a pick-two-from-six version;
   the pairs and hexes are the new Rosh Hashanah bank, not the original
   KAIRO's. The sixth swatch, 'random', is not a fixed pair — it rolls one
   from BANK_COLORS on pick (see rollRandomPair / S.randomPair). */
const COLORWAYS={
  'green-pink':      ['#0C995A','#FF4FFC'],
  'bordeaux-yellow': ['#A90F3C','#F9C816'],
  'bordeaux-lime':   ['#A90F3C','#8ED316'],
  'pink-orange':     ['#FF4FFC','#FF710B'],
  'green-bordeaux':  ['#0C995A','#A90F3C']
};
/* Each colourway recolours the poster's TWO ink roles: `red` replaces every
   #F5242B, `blue` replaces every #0C55FF (and the month/grid #004CFF). Roles
   are a decision per pair, not a rule — flippable per-pick by re-clicking the
   chosen swatch (S.colorSwap; see the click handler and colorwayMarkup). */
const POSTER_ROLES={
  'green-pink':      {red:'#FF4FFC', blue:'#0C995A'},
  'bordeaux-yellow': {red:'#A90F3C', blue:'#F9C816'},
  'bordeaux-lime':   {red:'#A90F3C', blue:'#8ED316'},
  'pink-orange':     {red:'#FF710B', blue:'#FF4FFC'},
  'green-bordeaux':  {red:'#A90F3C', blue:'#0C995A'}
};
/* roll a fresh pair of two DISTINCT bank colours into the red/blue ink roles.
   FORBIDDEN keeps the one pairing Karin flagged as unreadable — yellow next
   to the light lime-green — off the table; every other pair among the six is
   fair game. Uses Math.random like newSeed does — a new pair each pick. */
const RANDOM_FORBIDDEN=new Set(['#F9C816|#8ED316','#8ED316|#F9C816']);
function rollRandomPair(){
  let a,b;
  do{
    const pool=BANK_COLORS.slice();
    a=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
    b=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
  } while(RANDOM_FORBIDDEN.has(a+'|'+b));
  S.randomPair={red:a, blue:b};
  return S.randomPair;
}
/* Before the colourway question is ever reached (or answered with an unknown
   key), the poster is not left in its literal red/blue source colours — it
   opens on this fixed pair instead, the bank's pink as the ink role and the
   bank's green as the grid role. */
const DEFAULT_INK={red:'#FF4FFC', blue:'#0C995A'};
const posterInk=()=>{
  const key=ans('colorway');
  const base = key==='random' ? S.randomPair : POSTER_ROLES[key];
  if(!base) return DEFAULT_INK;
  /* re-picking the chosen swatch flips its two inks — the warm/cool (or
     decided) role trades places, so the whole sheet swaps. */
  return S.colorSwap ? {red:base.blue, blue:base.red} : base;
};
/* Apply the poster's ink to a markup STRING — one simultaneous pass over the
   three frozen hexes, exactly what buildSVG does to the whole sheet. Factored
   out because the sheet is NOT the only writer: the snake, node and ring glides
   re-emit their own group per frame, straight into the DOM, and an unrecoloured
   frame there snaps the layer back to red/blue the moment it moves (the
   revisit-after-colourway bug). Every innerHTML write of layer markup must go
   through here. Always applied — see DEFAULT_INK above; there is no longer an
   unrecoloured state to fall back to. */
function inkedMarkup(s){
  const ink=posterInk();
  /* ONE pass, not three sequential ones — see the note in buildSVG: a sequential
     replace lets one swap's output be re-swapped by the next and the sheet
     collapses to a single colour. */
  /* the saying layer no longer carries a frozen ink of its own (Rosh Hashanah
     edition) — it reads posterInk() directly for whichever of the two is
     darker (see sayingInk in js/poster/29-word.js), so there is nothing of
     its to map here any more. */
  const map={'#F5242B':ink.red, '#0C55FF':ink.blue, '#004CFF':ink.blue};
  return s.replace(/#F5242B|#0C55FF|#004CFF/g, m=>map[m]);
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
  const avail=QUESTION_BANK.filter(q=> !q.hidden && (q.when ? q.when(D) : true));
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

