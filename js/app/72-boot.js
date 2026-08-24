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
   Add ?skip to the URL and the opening screen is bypassed: the board opens on
   question one, exactly where START would have landed you. Nothing else
   behaves differently, so what you see past this point is what everyone sees.

   Driven by the URL rather than by CONFIG on purpose: a flag in the source is
   one someone forgets to turn back off before sharing the file, and this one
   would silently rob every visitor of the opening. A query string cannot
   travel by accident.

   https://karingutin.github.io/Archi-Time/?skip                             */
const SKIP_OPENING=/(^|[?&])skip(=|&|$)/.test(location.search);
if(SKIP_OPENING){
  skipOpening();
} else if(!S.baseDone) showIntro();
