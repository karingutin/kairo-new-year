/* ---------------------------------------------------------------------------
   Faithful SVG port of the Brik "Geometric Lattice Generator".

   The generation half (mulberry32, hashCell, getRandomShape, makePaintedCell,
   generateGrid + the painted/erased merge) is copied VERBATIM from the tool so
   the cell model is bit-identical. The render half re-expresses the tool's
   five draw() phases as SVG instead of canvas strokes.

   Canvas == poster == 700x1000, so there is no refR scaling: geometry maps 1:1.
   --------------------------------------------------------------------------- */

// --- generation (verbatim from the tool) -----------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashCell(col, row, seed) {
  let h = (col * 374761393 + row * 668265263 + seed * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/* A tiny controls shim so the verbatim functions can read params by key. */
function makeControls(p) {
  return { get: (k) => p[k] };
}

function getRandomShape(rng, wCircle, wPlus, wCross, wDiag) {
  const total = wCircle + wPlus + wCross + wDiag;
  if (total <= 0) {
    const shapes = ['circle', 'plus', 'cross', 'diagonal'];
    return shapes[Math.floor(rng() * shapes.length)];
  }
  let r = rng() * total;
  if (r < wCircle) return 'circle';
  r -= wCircle;
  if (r < wPlus) return 'plus';
  r -= wPlus;
  if (r < wCross) return 'cross';
  return 'diagonal';
}

function makePaintedCell(controls, col, row) {
  const prng = mulberry32(
    ((col + 1) * 73856093 ^ (row + 1) * 19349663 ^ ((controls.get('seed') || 1) * 83492791)) >>> 0
  );
  const wCircle = controls.get('weight_circle');
  const wPlus = controls.get('weight_plus');
  const wCross = controls.get('weight_cross');
  const wDiag = controls.get('weight_diagonal');
  const shape = getRandomShape(prng, wCircle, wPlus, wCross, wDiag);
  const diagonalDirection = prng() < 0.5 ? 1 : -1;
  return {
    active: true, shape,
    invertHash: hashCell(col, row, controls.get('seed') || 1),
    diagonalDirection, currentRotation: 0, currentScale: 1, __painted: true
  };
}

function generateGrid(controls, cols, rows) {
  const cells = [];
  const rng = mulberry32(controls.get('seed') || 1);
  const density = controls.get('density') / 100;
  const falloff = controls.get('falloff') / 100;
  const wCircle = controls.get('weight_circle');
  const wPlus = controls.get('weight_plus');
  const wCross = controls.get('weight_cross');
  const wDiag = controls.get('weight_diagonal');
  const origin = controls.get('origin') || { x: -1, y: -1 };
  const onx = (origin.x + 1) / 2;
  const ony = (origin.y + 1) / 2;
  const maxDist = Math.max(
    Math.hypot(onx, ony), Math.hypot(1 - onx, ony),
    Math.hypot(onx, 1 - ony), Math.hypot(1 - onx, 1 - ony)
  ) || 1;
  for (let r = 0; r < rows; r++) {
    const rowArr = [];
    const ny = rows > 1 ? r / (rows - 1) : 0;
    for (let c = 0; c < cols; c++) {
      const nx = cols > 1 ? c / (cols - 1) : 0;
      const nd = Math.hypot(nx - onx, ny - ony) / maxDist;
      const prob = density * (1 - nd * falloff);
      const active = rng() < prob;
      const shape = getRandomShape(rng, wCircle, wPlus, wCross, wDiag);
      rowArr.push({
        active, shape,
        invertHash: hashCell(c, r, controls.get('seed') || 1),
        diagonalDirection: rng() < 0.5 ? 1 : -1,
        currentRotation: 0, currentScale: 1
      });
    }
    cells.push(rowArr);
  }
  return cells;
}

function isInverted(cell, invertRatio) {
  if (!cell || cell.shape !== 'cross') return false;
  return cell.invertHash < invertRatio;
}

/* Build the merged cell model exactly as draw() does: generate, then apply the
   erased overrides (round u*cols), then the painted ones. */
function buildModel(preset, W, H) {
  const controls = makeControls(preset);
  const cellSize = Math.max(4, preset.square_size || 24);
  const cols = Math.max(1, Math.floor(W / cellSize));
  const rows = Math.max(1, Math.floor(H / cellSize));
  const offsetX = (W - cols * cellSize) / 2;
  const offsetY = (H - rows * cellSize) / 2;
  const cells = generateGrid(controls, cols, rows);

  for (const e of (preset.erased || [])) {
    const c = Math.round(e[0] * cols), r = Math.round(e[1] * rows);
    if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
    if (cells[r] && cells[r][c]) cells[r][c].active = false;
  }
  for (const e of (preset.painted || [])) {
    const c = Math.round(e[0] * cols), r = Math.round(e[1] * rows);
    if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
    if (!cells[r] || !cells[r][c]) continue;
    if (!cells[r][c].active || !cells[r][c].__painted) {
      cells[r][c] = makePaintedCell(controls, c, r);
    }
  }
  return { cells, cols, rows, cellSize, offsetX, offsetY };
}

// --- SVG render (mirrors the tool's draw() phases 1..5) ---------------------
/* opts.dpr controls the pixel-snap; for a 700x1000 SVG rasterised 1:1 use 1.
   opts.shapeColor / opts.fillColor override the tool colours (for colourway). */
function latticeSVG(preset, W, H, opts) {
  opts = opts || {};
  const dpr = opts.dpr || 1;
  const shapeColor = opts.shapeColor || preset.shape_color;   // marks / borders
  const shapeColorSolid = opts.shapeColor || preset.shape_color;
  const fillColor = opts.fillColor || preset.fill_color;      // square fill / inverted mark
  const invertRatio = (preset.invert_ratio || 0) / 100;
  const shapeScale = preset.shape_scale / 100;
  const showFrames = preset.show_frames;
  const frameOpacity = preset.frame_opacity / 100;
  const showStroke = preset.show_stroke;

  const M = buildModel(preset, W, H);
  const { cells, cols, rows, cellSize, offsetX, offsetY } = M;
  const radius = cellSize * shapeScale * 0.5;

  let rects = '';
  // PHASE 1 — fill pass
  if (showFrames && frameOpacity > 0) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      if (!cell.active) continue;
      const inverted = isInverted(cell, invertRatio);
      const x0 = Math.floor(offsetX + c * cellSize);
      const y0 = Math.floor(offsetY + r * cellSize);
      const x1 = Math.ceil(offsetX + (c + 1) * cellSize);
      const y1 = Math.ceil(offsetY + (r + 1) * cellSize);
      rects += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="' + (inverted ? shapeColorSolid : fillColor) + '"/>';
    }
  }

  // PHASE 2 — segment / arc collection
  const normalSegments = [], invertedSegments = [], normalArcs = [], invertedArcs = [];
  let curSegs = normalSegments;
  const addSeg = (x1, y1, x2, y2) => curSegs.push({ x1, y1, x2, y2 });
  function xform(px, py, cx, cy, rot, scl) {
    const dx = px * scl, dy = py * scl, cs = Math.cos(rot), sn = Math.sin(rot);
    return [cx + dx * cs - dy * sn, cy + dx * sn + dy * cs];
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cell = cells[r][c];
    if (!cell.active) continue;
    const inverted = isInverted(cell, invertRatio);
    const curArcs = inverted ? invertedArcs : normalArcs;
    const cx = offsetX + (c + 0.5) * cellSize;
    const cy = offsetY + (r + 0.5) * cellSize;
    const half = cellSize * 0.5;
    if (showStroke) {
      curSegs = normalSegments;
      const l = cx - half, rr = cx + half, t = cy - half, b = cy + half;
      addSeg(l, t, rr, t); addSeg(rr, t, rr, b); addSeg(rr, b, l, b); addSeg(l, b, l, t);
    }
    curSegs = inverted ? invertedSegments : normalSegments;
    const rot = 0, scl = 1;   // mouse_reaction off
    switch (cell.shape) {
      case 'circle': curArcs.push({ cx, cy, r: radius * scl }); break;
      case 'plus': {
        let a = xform(-radius, 0, cx, cy, rot, scl), bb = xform(radius, 0, cx, cy, rot, scl);
        addSeg(a[0], a[1], bb[0], bb[1]);
        a = xform(0, -radius, cx, cy, rot, scl); bb = xform(0, radius, cx, cy, rot, scl);
        addSeg(a[0], a[1], bb[0], bb[1]); break;
      }
      case 'cross': {
        let a = xform(-radius, -radius, cx, cy, rot, scl), bb = xform(radius, radius, cx, cy, rot, scl);
        addSeg(a[0], a[1], bb[0], bb[1]);
        a = xform(radius, -radius, cx, cy, rot, scl); bb = xform(-radius, radius, cx, cy, rot, scl);
        addSeg(a[0], a[1], bb[0], bb[1]); break;
      }
      case 'diagonal': {
        const dir = cell.diagonalDirection;
        const a = xform(-radius, -radius * dir, cx, cy, rot, scl), bb = xform(radius, radius * dir, cx, cy, rot, scl);
        addSeg(a[0], a[1], bb[0], bb[1]); break;
      }
    }
  }

  // PHASE 3 — dedupe
  const qp = (v) => Math.round(v * 100) / 100;
  function dedupe(segs) {
    const seen = new Set(), out = [];
    for (const s of segs) {
      let a = [qp(s.x1), qp(s.y1)], b = [qp(s.x2), qp(s.y2)];
      if (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) { const t = a; a = b; b = t; }
      const key = a[0] + ',' + a[1] + '-' + b[0] + ',' + b[1];
      if (seen.has(key)) continue;
      seen.add(key); out.push(s);
    }
    return out;
  }
  const normalUnique = dedupe(normalSegments);
  const invertedUnique = dedupe(invertedSegments);

  // PHASE 4/5 — snap + ordered stroke
  const lw = Math.max(1, Math.round(preset.line_thickness));
  const oddOffset = (lw % 2 === 1) ? (0.5 / dpr) : 0;
  const snap = (v) => Math.round(v * dpr) / dpr + oddOffset;
  function pass(segs, arcs, color) {
    if (!segs.length && !arcs.length) return '';
    let d = '';
    for (const s of segs) d += 'M' + snap(s.x1) + ' ' + snap(s.y1) + 'L' + snap(s.x2) + ' ' + snap(s.y2);
    let circs = '';
    for (const a of arcs) circs += '<circle cx="' + snap(a.cx) + '" cy="' + snap(a.cy) + '" r="' + a.r + '"/>';
    let out = '';
    if (d) out += '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + lw + '" stroke-linecap="round" stroke-linejoin="round"/>';
    if (circs) out += '<g fill="none" stroke="' + color + '" stroke-width="' + lw + '">' + circs + '</g>';
    return out;
  }
  const strokes = pass(normalUnique, normalArcs, shapeColor) + pass(invertedUnique, invertedArcs, fillColor);

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + rects + strokes + '</svg>';
}

if (typeof window !== 'undefined') { window.latticeSVG = latticeSVG; window.buildModel = buildModel; }
