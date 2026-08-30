/* ---------- boot ---------- */
if(CONFIG.FORMAT_SWITCHER){
  buildFmtControl();
} else {
  /* switcher off: the control is fully inert rather than merely unstyled —
     display:none takes it out of layout AND out of hit-testing, so there is no
     empty 2x2-cell dead zone sitting in the corner. computeDots already stops
     reserving space for it (see the FORMAT_SWITCHER check above), and its click
     listeners below never fire because nothing is there to click. */
  fmtBtn.style.display='none';
  fmtMenu.style.display='none';
}
/* Preload the month layer's font at boot, well before Q3 can be reached (it is
   the third LINEAR_LEAD question, so there are always at least two other picks
   first). ensureMonthFont's own redraw-on-load still fires as a safety net if
   the load is somehow still pending, but by Q3 it is normally already 'ready',
   so the grow-in entrance starts on the SAME frame as the pick — no visible
   delay waiting on a font fetch. */
ensureMonthFont();
newSeed();
buildLogo();
relayout();

/* SKIP THE OPENING — a development convenience, not a feature.
   Add ?skip to the URL and it goes all the way to the finished poster, not
   just past the opening screen (Karin, 30 Aug: "?skip just leads me to the
   first question" — testing the QR cost eight answers first). It bypasses
   the opening, answers every question but the last with its own bank
   default (devSkipToLast, js/app/61-relayout.js — already existed for this,
   only ever wired to a dev button), and then runs the Create press on its
   own (showFinish, js/app/51-flow.js) — the thing that actually stands the
   ending, and the QR inside it, up.

   THE POSTER THIS MAKES IS BUILT OF DEFAULTS, NOT OF ANSWERS, and is not the
   poster a real session produces: devSkipToLast() leaves colour itself
   reached but not touched, exactly as it always has, so it renders on its
   own default the same as the nine questions before it — nothing here fakes
   a choice for it either. Good for kicking the tyres on the QR, the format
   switcher, or the ending's own animation; wrong for judging what the piece
   asks or looks like actually answered.

   COMPOSES WITH NO FRAME NEEDED BETWEEN THE TWO CALLS: devSkipToLast()'s
   state changes (S.answers, S.done, S.touched) are all synchronous and
   finished before it returns, and showFinish() repaints with drawNow() —
   which cancels any draw() still pending and paints immediately — so the
   sheet showFinish grows already carries the skip's answers, not whatever
   was on screen a frame before.

   Driven by the URL rather than by CONFIG on purpose: a flag in the source is
   one someone forgets to turn back off before sharing the file, and this one
   would silently rob every visitor of the opening. A query string cannot
   travel by accident.

   https://karingutin.github.io/Archi-Time/?skip                             */
const SKIP_OPENING=/(^|[?&])skip(=|&|$)/.test(location.search);
if(SKIP_OPENING){
  skipOpening();
  devSkipToLast();
  showFinish();
} else if(!S.baseDone) showIntro();
