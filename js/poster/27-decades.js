/* =====================================================================
   THE DECADES BAR — poster layer (from the Brik "geometric rectangle" export).
   A checkerboard band of rectangles laid along the FOOT of the sheet, three rows
   tall and full-width. One more column of rectangles per decade the person
   expects: 10 years -> 3 columns, 20 -> 4, ... 100 -> 12. A cell is inked when
   (col+row) is even, so the rows offset like brickwork; columns alternate the two
   ink roles (blue #0C55FF / red #F5242B) so the colourway swap recolours it too.
   ===================================================================== */
/* rectH is ONE rectangle row's height as a fraction of the sheet HEIGHT — the one
   number that sets how tall the band reads. A fraction rather than a length so the
   band keeps its proportion at every format; the height it produces is what was
   tuned. 0.05 == exactly one grid cell on the Sheet format (H = 20 cells), so the
   original 0.025 was a clean half-cell per row. 0.022 is Karin's — the band comes
   down from 112.5 to 99 sheet units (37.5 -> 33 a row), which is off the half-cell
   grid; the number came off Brik in the first place (rectHeightPx/frameHeightPx),
   not off the grid, so it is height that decides it here.
   grain is 0..1: the paper-grain strength (Brik's riso speckle). */
const BARL={ rows:3, rectH:0.022, grain:0.55 };
function barColsFromAnswers(){
  const q=BANK.decades, D=derive();
  const min=val(q.min,D), step=q.step||1;
  const raw=ans('decades');
  const idx=raw==null ? 0 : Math.round((raw-min)/step);   // 0..9 -> 10y..100y
  return idx + 3;                                          // 10y -> 3 columns ... 100y -> 12
}

