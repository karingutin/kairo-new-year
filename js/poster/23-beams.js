/* =====================================================================
   THE BEAMS — a ring of cuboids in perspective, printed over everything else.

   Ported from the Brik canvas tool (tool-uuid 2aecaac0). Unlike the month
   layer this one is pure geometry — no rasterised mask, nothing pixel-tested —
   so the whole thing becomes real SVG polygons and needs no canvas at all.

   The tool builds each beam in 3D, projects it through its own little pinhole
   camera, culls backfaces by screen winding and paints far-to-near (painter's
   algorithm). All of that is reproduced exactly; only the final "fill this
   path, stroke this path" becomes <polygon> instead of ctx calls.

   Two controls move and the rest are frozen at the values the tool was
   exported with: the happiness question sets the beam count (see
   beamCountFromAnswers), and seed is the roll (see ROLLS), which rearranges
   every beam's lean, length and depth without changing how many there are.

   Two of the tool's features are deliberately not ported, because both are
   switched off in the export and neither could stay vector:
     grainIntensity is 0  — a tiled noise bitmap multiplied over the frame.
     translucentInk is false — would multiply the ink layers.
   ===================================================================== */
const BEAMS={
  /* beamCount is NOT here: it is the one value an answer moves, so it comes
     from beamCountFromAnswers rather than from this frozen table. */
  ellipse:1.4,                // the tool calls this spiralTurns; it is eccentricity
  innerRadius:0.36, thickness:0.065, length:0.8, lengthVariance:0.25,
  depthJitter:0.1, handCut:0, edgeJitter:0.14, towardBias:0.72,
  fov:73, elevation:1.1, dist:5.2, zoom:1.45, worldScale:2.4,
  strokeWidth:1.5, misreg:4.75,
  seed:347,                     /* the roll's default — read via rolled() */
  stroke:'#0C55FF', cap:'#FFFFFF', side:'#E60000',
  /* How much of the sheet the finished ring may occupy. The tool's projection
     is written for its own roughly-landscape canvas; on a 7:10 portrait sheet
     the ring comes out 1058 units wide on a 1050 sheet AND sits ~48 off centre,
     because the per-beam angle jitter is not symmetrical. Rather than retune
     the tool's numbers, the ring is measured once it is built and framed as a
     whole — see the transform at the end of beamsMarkup. The 3D geometry is
     untouched; only the frame around it changes. */
  fit:0.94,
  /* the tool's pixel-tuned constants were authored against a canvas about this
     wide; everything measured in px scales by B.w/this so the beams keep their
     proportions on a 1050-unit sheet and at every other format */
  pxRef:1000
};

