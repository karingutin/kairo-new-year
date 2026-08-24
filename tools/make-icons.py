#!/usr/bin/env python3
"""Raster icons for the browsers that cannot read favicon.svg.

RUN BY HAND, and only when favicon.svg changes:

    python3 tools/make-icons.py

There is no build step in this project and this does not add one — the site is
hand-written files served as they are. But a checked-in binary that nobody can
regenerate is worse than a script nobody has to run, so the geometry lives here
in one place beside the SVG's rather than only in the bytes of a PNG.

THE GEOMETRY IS favicon.svg's. A K cut out of a 3 x 3 patch of the interface
lattice — the whole left column as the stem, and two arms meeting the middle
cell at a corner. In the SVG the cell is 9.14 of 32, which is 2/7 of the frame.

THE THREE SIZES ARE SET BY HAND rather than scaled from that fraction, because
a blocky mark that lands off the pixel grid is a grey smudge and 2/7 of 16 is
4.57. Rounding it either way is wrong on its own: 5 leaves one pixel over,
which puts the whole margin on the right and lets the stem run into the edge of
the tab, and there is no cell at 16 or 32 that gives both the SVG's proportion
and an even margin (3c + 2m = 32 admits only c=10 at m=1, or c=8 at m=4). So
each size is chosen for what it can actually do:

    16   cell 4, margin 2   the mark comes in to 75% to keep a clean 2px of air
                            on every side. This is the size that matters and a
                            crisp, contained K beats a bigger cropped one.
    32   cell 9, margin 2/3 84%, near the SVG's own. One pixel of asymmetry,
                            which is not visible.
    48   cell 14, margin 3  87.5% and exactly even. The closest of the three.

The apple-touch icon is the exception and is drawn smaller on purpose: iOS puts
no padding of its own around it and rounds the corners, so a mark at the SVG's
proportion would sit right up against the rounding.
"""

from PIL import Image, ImageDraw
import os

GROUND = (236, 236, 236, 255)   # --ink
MARK   = (20, 20, 20, 255)      # --fg

# the six cells, as (column, row) of the 3 x 3 patch
CELLS = [(0, 0), (0, 1), (0, 2),   # the stem
         (1, 1),                    # the junction the arms turn on
         (2, 0), (2, 2)]            # the arms, corner to corner with it


def draw(size, cell, offset):
    im = Image.new('RGBA', (size, size), GROUND)
    d = ImageDraw.Draw(im)
    for c, r in CELLS:
        x, y = offset + c * cell, offset + r * cell
        d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=MARK)
    return im


# size: (cell, offset) — see the note above for why each one is what it is
SIZES = {16: (4, 2), 32: (9, 2), 48: (14, 3)}

here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# One .ico carrying three sizes: 16 for the tab, 32 for the bookmark bar and
# the Windows taskbar, 48 for a desktop shortcut.
icons = [draw(s, *SIZES[s]) for s in sorted(SIZES)]
icons[-1].save(os.path.join(here, 'favicon.ico'),
               format='ICO', sizes=[(s, s) for s in sorted(SIZES)],
               append_images=icons[:-1])

# The home-screen icon, at the smaller proportion — see the note above.
draw(180, 40, 30).save(os.path.join(here, 'apple-touch-icon.png'), format='PNG')

print('favicon.ico and apple-touch-icon.png written to', here)
for s in sorted(SIZES):
    c, o = SIZES[s]
    print('  %2d: cell %2d, offset %d, mark %d%%' % (s, c, o, round(300 * c / s)))
