// ================================================================
// File: town.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Pixel-art town backdrop: the folk-art town of Holliston
//   along the horizon behind the school. Hills and tree line, Lake
//   Winthrop, the rail-trail bridge and tunnel, the Superette, Fiske's,
//   CVS, the Town Hall and the church, with cars, walkers and cyclists
//   moving through it. The sprites live in js/art/town_art.js.
// ================================================================

// ── Town Backdrop ─────────────────────────────────────
// Single entry point: drawTown(), called first in the frame.
//
// The town never changes, so it is painted once into two offscreen
// canvases (a back layer and a front layer) and only the moving things
// are drawn every frame, in between and on top of those two layers.
//
// Everything is laid out in art pixels measured up from the horizon
// (PX.HOR). The school hides the middle of the town, so the landmarks
// are pinned to the left and right edges of the screen where they show.
// The low picket fence along the back of the lawn (js/scene.js) covers
// the bottom few rows, up to about PX.HOR - 5.

// ── Animation state ──────────────────────────────────
let _bgCars         = null;
let _bgCars2        = null;
let _bgWalkers      = null;
let _bgWalkers2     = null;
let _bgBikers       = null;
let _bgTrailWalkers = null;

// The painted town: { key, back, front, lights, chimneys, ... }
let _town = null;

// Rows of the town, in art pixels relative to the horizon (negative = up).
const TOWN_ROWS = {
  hill:   -67,   // average top of the far blue hill
  forest: -60,   // average top of the tree line
  upper:  -55,   // top of the upper terrace (lake, fields)
  trail:  -49,   // top row of the rail trail (it is 2 rows deep)
  main:   -41,   // top of the main town terrace
  back:   -29,   // ground line of the Main Street buildings
  road:   -28,   // top row of Main Street (5 rows deep)
  front:  -9,    // ground line of the front row of buildings
  road2:  -8,    // top row of the front street (5 rows deep, just clear of the fence)
};

// House colour schemes: wall, wall in shade, roof, roof highlight, door.
const TOWN_HOUSES = [
  { wall: PAL.ye1,   shade: PAL.ye2, roof: PAL.br3, hi: PAL.br2, door: PAL.wo3 },
  { wall: PAL.bl1,   shade: PAL.sl1, roof: PAL.sl3, hi: PAL.sl2, door: PAL.white },
  { wall: PAL.cream, shade: PAL.ta1, roof: PAL.re3, hi: PAL.re2, door: PAL.wo3 },
  { wall: PAL.te1,   shade: PAL.te2, roof: PAL.g4,  hi: PAL.g3,  door: PAL.wo4 },
  { wall: PAL.pi1,   shade: PAL.pi2, roof: PAL.wo3, hi: PAL.wo2, door: PAL.white },
  { wall: PAL.white, shade: PAL.g1,  roof: PAL.g5,  hi: PAL.g4,  door: PAL.re3 },
  { wall: PAL.or1,   shade: PAL.or2, roof: PAL.br4, hi: PAL.br3, door: PAL.wo4 },
];

// Car paint jobs [hue, saturation, lightness], shaded with PX.ramp
const TOWN_CAR_COLORS = [
  [5, 65, 52], [210, 55, 52], [120, 45, 40], [48, 70, 55], [0, 0, 82],
  [350, 60, 55], [180, 50, 48], [25, 58, 50], [0, 60, 48],
];
const TOWN_SKINS = [PAL.sn2, PAL.sn4, PAL.sn1, PAL.sn5];
const TOWN_HAIR  = [PAL.hrBrown, PAL.hrBlack, PAL.hrBlonde, PAL.hrDark, PAL.hrGinger];

// Initialize car, walker, and biker arrays for background animation.
// Positions (x) and speeds stay in screen pixels, as they always were;
// they are turned into art pixels only when drawn.
function _initBgElements() {
  const shirts = [0, 200, 120, 48, 270, 350, 30, 180, 90];
  const carPal = (i) => {
    const c = TOWN_CAR_COLORS[i % TOWN_CAR_COLORS.length];
    const r = PX.ramp(c[0], c[1], c[2]);
    return { l: r.l, m: r.m, d: r.d, t: r.o };
  };
  const whiteBus = { l: PAL.white, m: PAL.g1, d: PAL.g2, s: PAL.bl3 };
  const person = (i, hue) => ({
    c: PX.ramp(hue, 58, 55).m,
    s: TOWN_SKINS[i % TOWN_SKINS.length],
    h: TOWN_HAIR[(i * 3 + 1) % TOWN_HAIR.length],
  });
  // The same person as they look under the night tint (see _drawTownLights)
  const night = typeof sceneNightTint === 'function' ? sceneNightTint() : { col: '#161c54', a: 0.56 };
  const atNight = (pal) => ({
    c: PX.mix(pal.c, night.col, night.a), s: PX.mix(pal.s, night.col, night.a),
    h: PX.mix(pal.h, night.col, night.a), p: PX.mix(PAL.g5, night.col, night.a),
  });

  // Front street cars
  _bgCars = [];
  for (let i = 0; i < 3; i++) {
    _bgCars.push({ x: random(0, width), speed: random(0.35, 0.9),
      dir: random() < 0.5 ? 1 : -1, bus: false, pal: carPal(i) });
  }
  _bgCars.push({ x: random(0, width), speed: random(0.25, 0.6),
    dir: random() < 0.5 ? 1 : -1, bus: true, pal: null });

  // Main Street cars
  _bgCars2 = [];
  for (let i = 0; i < 4; i++) {
    _bgCars2.push({ x: random(0, width), speed: random(0.55, 1.3),
      dir: random() < 0.5 ? 1 : -1, bus: false, pal: carPal(i + 3) });
  }
  _bgCars2.push({ x: random(0, width), speed: random(0.3, 0.7),
    dir: random() < 0.5 ? 1 : -1, bus: true, pal: null });
  _bgCars2.push({ x: random(0, width), speed: random(0.3, 0.7),
    dir: random() < 0.5 ? 1 : -1, bus: true, pal: whiteBus });

  // Front street sidewalk walkers
  _bgWalkers = [];
  for (let i = 0; i < 6; i++) {
    _bgWalkers.push({ x: random(width*0.03, width*0.97), speed: random(0.04, 0.10),
      dir: random()<0.5?1:-1, phase: random(TWO_PI), pal: person(i, shirts[i % shirts.length]) });
    _bgWalkers[i].nightPal = atNight(_bgWalkers[i].pal);
  }
  // Main Street sidewalk walkers
  _bgWalkers2 = [];
  for (let i = 0; i < 9; i++) {
    _bgWalkers2.push({ x: random(width*0.03, width*0.97), speed: random(0.05, 0.13),
      dir: random()<0.5?1:-1, phase: random(TWO_PI), pal: person(i + 2, shirts[(i + 4) % shirts.length]) });
  }

  // Rail trail bikers
  _bgBikers = [];
  for (let i = 0; i < 5; i++) {
    const r = PX.ramp([0, 200, 120, 48, 270][i % 5], 55, 52);
    _bgBikers.push({ x: random(0, width), speed: random(0.20, 0.50),
      dir: random() < 0.5 ? 1 : -1, phase: random(TWO_PI),
      pal: { c: r.m, e: r.d, s: TOWN_SKINS[i % TOWN_SKINS.length] } });
  }

  // Rail trail walkers
  _bgTrailWalkers = [];
  for (let i = 0; i < 6; i++) {
    _bgTrailWalkers.push({ x: random(width*0.03, width*0.97), speed: random(0.03, 0.09),
      dir: random()<0.5?1:-1, phase: random(TWO_PI),
      pal: person(i + 1, [350, 30, 180, 90, 210, 55][i % 6]) });
  }
}

// ── Small helpers ────────────────────────────────────

// Repeatable pseudo-random numbers, so the town is the same every time it is built
function _townRand(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// The art columns where the school's walls begin and end. The town shows
// to the left of `l` and to the right of `r` (and over the roofs between).
function _townSchoolEdges() {
  if (typeof schoolLayout === 'function') {
    const L = schoolLayout();
    return { l: L.wingL, r: L.wingR };
  }
  return { l: Math.floor(PX.W * 0.097), r: Math.ceil(PX.W * 0.815) };
}

// True if art columns x0..x1 are out past the ends of the school, where
// the town can actually be seen. Only used to skip animating things nobody
// can see; the night lights are cut to shape exactly (see _drawTownLights).
function _townSeen(x0, x1) {
  const e = _townSchoolEdges();
  return x1 < e.l || x0 >= e.r;
}

// A window: blue-grey glass with a lighter top row. Remembered so it can
// glow at night. kind: 'home' (some stay dark) or 'shop' (always lit).
function _townWindow(T, x, y, w, h, kind) {
  PX.rect(x, y, w, h, PAL.sl2);
  PX.rect(x, y, w, 1, PAL.sl1);
  T.windows.push({ x, y, w, h, kind: kind || 'home' });
}

// A window with a rounded top (the middle pixel pokes up one row)
function _townArchWindow(T, cx, y, h) {
  PX.px(cx, y - 1, PAL.sl1);
  PX.rect(cx - 1, y, 3, h, PAL.sl2);
  T.windows.push({ x: cx - 1, y, w: 3, h, kind: 'home', arch: true });
}

// A pointed evergreen in one flat colour with a few lit pixels on its left side
function _townConifer(cx, base, h, hw, col, hi) {
  for (let r = 0; r < h; r++) {
    const k = Math.round(r * hw / Math.max(1, h - 1));
    PX.rect(cx - k, base - h + r, k * 2 + 1, 1, col);
    if (hi && k > 0 && r % 2 === 1) PX.px(cx - k + 1, base - h + r, hi);
  }
}

// A round treetop with a lit patch on its upper left
function _townCrown(cx, cy, rx, ry, col, hi) {
  PX.ellipse(cx, cy, rx, ry, col);
  if (hi) PX.ellipse(cx - 1, cy - 1, Math.max(1, rx - 2), Math.max(1, ry - 2), hi);
}

// A patch of farmland: alternating crop rows with the corners rounded off
function _townField(x, y, w, h, a, b) {
  for (let r = 0; r < h; r++) {
    const inset = (r === 0 || r === h - 1) ? 1 : 0;
    PX.rect(x + inset, y + r, w - inset * 2, 1, r % 2 === 0 ? a : b);
  }
}

// ── Houses ───────────────────────────────────────────

// A house seen gable-end on: square walls under a triangle of roof.
// (cx, base) is the middle of its doorstep. Returns nothing; registers
// its chimney for smoke and its windows for night lights.
function _townHouse(T, cx, base, st) {
  const x0 = cx - 5, top = base - 6;
  // Chimney first, so the roof overlaps its foot
  PX.rect(cx + 2, top - 6, 2, 5, PAL.br2);
  PX.rect(cx + 3, top - 6, 1, 5, PAL.br4);
  T.chimneys.push({ x: cx + 2, y: top - 7 });
  // Walls
  PX.rect(x0, top, 11, 6, st.wall);
  PX.rect(x0 + 9, top, 2, 6, st.shade);
  // Roof: a stepped triangle, lit along its left slope
  for (let r = 0; r < 6; r++) {
    const hw = 6 - r;
    PX.rect(cx - hw, top - 1 - r, hw * 2 + 1, 1, st.roof);
    PX.px(cx - hw, top - 1 - r, st.hi);
    if (r < 5) PX.px(cx - hw + 1, top - 1 - r, st.hi);
  }
  PX.px(cx, top - 3, PAL.sl2);               // attic window
  _townWindow(T, x0 + 1, top + 1, 2, 2);
  _townWindow(T, x0 + 8, top + 1, 2, 2);
  PX.rect(cx - 1, top + 3, 2, 3, st.door);
}

// A longer house seen from the side: low roof running left to right
function _townCottage(T, cx, base, st) {
  const x0 = cx - 7, top = base - 6;
  PX.rect(cx + 3, top - 6, 2, 4, PAL.br2);
  PX.rect(cx + 4, top - 6, 1, 4, PAL.br4);
  T.chimneys.push({ x: cx + 3, y: top - 7 });
  PX.rect(x0, top, 15, 6, st.wall);
  PX.rect(x0 + 13, top, 2, 6, st.shade);
  PX.rect(x0, top, 15, 1, st.shade);          // shadow under the eaves
  // Roof: a trapezoid, lighter along the ridge
  for (let r = 0; r < 4; r++) {
    PX.rect(x0 - 1 + r, top - 1 - r, 17 - r * 2, 1, r === 3 ? st.hi : st.roof);
    PX.px(x0 - 1 + r, top - 1 - r, st.hi);
  }
  _townWindow(T, x0 + 1, top + 2, 2, 2);
  _townWindow(T, x0 + 9, top + 2, 2, 2);
  _townWindow(T, x0 + 12, top + 2, 2, 2);
  PX.rect(x0 + 5, top + 2, 2, 4, st.door);
}

// A far-away house on the upper terrace: just walls, roof and one window
function _townFarHouse(T, cx, base, st) {
  PX.rect(cx - 3, base - 4, 7, 4, st.wall);
  PX.rect(cx + 2, base - 4, 2, 4, st.shade);
  PX.rect(cx - 4, base - 5, 9, 1, st.roof);
  PX.rect(cx - 3, base - 6, 7, 1, st.roof);
  PX.rect(cx - 1, base - 7, 3, 1, st.hi);
  PX.px(cx - 4, base - 5, st.hi);
  PX.px(cx - 3, base - 6, st.hi);
  _townWindow(T, cx - 2, base - 3, 1, 2);
  PX.rect(cx, base - 2, 1, 2, st.door);
}

// ── Main Street shops ────────────────────────────────

// The Superette: cream shop, orange sign, red-and-white striped awning.
// x is its left edge; it is 45 wide and 13 tall.
function _townSuperette(T, x, base) {
  const w = 45, top = base - 13;
  PX.rect(x, top, w, 13, PAL.cream);
  PX.rect(x + w - 1, top + 7, 1, 6, PAL.ta1);
  // Sign board
  PX.rect(x, top, w, 7, PAL.or3);
  PX.rect(x, top, w, 1, PAL.or2);
  PX.text('SUPERETTE', x + 23, top - 1, { color: PAL.white, align: 'center' });
  // Shop window either side of the door
  _townWindow(T, x + 2, top + 9, 19, 3, 'shop');
  _townWindow(T, x + 24, top + 9, 19, 3, 'shop');
  PX.rect(x + 11, top + 9, 1, 3, PAL.cream);
  PX.rect(x + 33, top + 9, 1, 3, PAL.cream);
  PX.rect(x + 21, top + 9, 3, 4, PAL.wo3);
  PX.rect(x, top + 12, 21, 1, PAL.ta2);
  PX.rect(x + 24, top + 12, 21, 1, PAL.ta2);
  // Awning: stripes two pixels wide that step sideways on each row,
  // which is how a pixel artist draws a diagonal stripe
  for (let r = 0; r < 2; r++) {
    for (let i = -1; i <= w; i++) {
      PX.px(x + i, top + 7 + r, ((i + r + 8) >> 1) & 1 ? PAL.re2 : PAL.white);
    }
  }
  // Scalloped edge hanging below it
  for (let i = -1; i <= w; i++) if (((i + 8) >> 1) & 1) PX.px(x + i, top + 9, PAL.re3);
  // Utility pole beside the shop
  PX.rect(x + w + 2, base - 13, 1, 13, PAL.wo3);
  PX.rect(x + w, base - 12, 5, 1, PAL.wo4);
}

// Fiske's General Store: white shop, black sign with gold letters,
// black awnings and a red door. 31 wide, 14 tall.
function _townFiskes(T, x, base) {
  const w = 31, top = base - 14;
  PX.rect(x, top, w, 14, PAL.white);
  PX.rect(x + w - 1, top + 7, 1, 7, PAL.g1);
  PX.rect(x, top, w, 7, PAL.black);
  PX.rect(x, top, w, 1, PAL.g5);
  PX.text("FISKE'S", x + 16, top - 1, { color: PAL.ye2, align: 'center' });
  // Two display windows
  _townWindow(T, x + 2, top + 9, 10, 4, 'shop');
  _townWindow(T, x + 19, top + 9, 10, 4, 'shop');
  PX.rect(x + 6, top + 9, 1, 4, PAL.white);
  PX.rect(x + 24, top + 9, 1, 4, PAL.white);
  // Black awnings over them
  PX.rect(x + 1, top + 7, 12, 1, PAL.black);
  PX.rect(x + 18, top + 7, 12, 1, PAL.black);
  PX.rect(x + 1, top + 8, 12, 1, PAL.g5);
  PX.rect(x + 18, top + 8, 12, 1, PAL.g5);
  // Red door with a little window
  PX.rect(x + 14, top + 8, 3, 6, PAL.re2);
  PX.rect(x + 16, top + 8, 1, 6, PAL.re3);
  PX.px(x + 14, top + 9, PAL.sl1);
  PX.px(x + 15, top + 9, PAL.sl1);
  PX.rect(x, top + 13, 14, 1, PAL.g2);
  PX.rect(x + 17, top + 13, 14, 1, PAL.g2);
  // Balloons are tied up just past the right-hand corner
  T.balloons = { x: x + w + 1, y: base - 1 };
}

// CVS: white shop, red sign, glass front. 18 wide, 14 tall.
function _townCVS(T, x, base) {
  const w = 18, top = base - 14;
  PX.rect(x, top, w, 14, PAL.white);
  PX.rect(x + w - 1, top + 7, 1, 7, PAL.g1);
  PX.rect(x, top, w, 7, PAL.re2);
  PX.rect(x, top, w, 1, PAL.re1);
  PX.rect(x, top + 6, w, 1, PAL.re3);
  PX.text('CVS', x + 9, top - 1, { color: PAL.white, align: 'center' });
  _townWindow(T, x + 2, top + 8, 14, 5, 'shop');
  PX.rect(x + 5, top + 8, 1, 5, PAL.white);
  PX.rect(x + 12, top + 8, 1, 5, PAL.white);
  // Sliding door in the middle
  PX.rect(x + 8, top + 9, 2, 5, PAL.g4);
  PX.rect(x, top + 13, 8, 1, PAL.g2);
  PX.rect(x + 10, top + 13, 8, 1, PAL.g2);
}

// ── Landmarks ────────────────────────────────────────

// Town Hall: slate-blue colonial hall with a white pediment, arched
// windows, two chimneys, a clock tower and a flagpole. cx is its middle.
function _townHall(T, cx, base) {
  const x0 = cx - 15, top = base - 14;
  // Chimneys behind the pediment
  for (const chx of [x0 + 3, x0 + 26]) {
    PX.rect(chx, top - 6, 2, 6, PAL.br2);
    PX.rect(chx + 1, top - 6, 1, 6, PAL.br4);
    T.chimneys.push({ x: chx, y: top - 7 });
  }
  // Body
  PX.rect(x0, top, 31, 14, PAL.sl1);
  PX.rect(x0 + 28, top, 3, 14, PAL.sl2);
  PX.rect(x0, top, 1, 14, PAL.white);
  PX.rect(x0 + 30, top, 1, 14, PAL.g1);
  PX.rect(x0, top + 7, 31, 1, PAL.sl2);          // floor line between storeys
  // Upper arched windows
  for (const dx of [-9, 0, 9]) _townArchWindow(T, cx + dx, top + 3, 3);
  // Lower windows and the arched door
  _townWindow(T, cx - 10, top + 9, 3, 3);
  _townWindow(T, cx + 8, top + 9, 3, 3);
  PX.rect(cx - 1, top + 9, 3, 4, PAL.wo4);
  PX.px(cx, top + 8, PAL.wo4);
  PX.px(cx + 1, top + 11, PAL.ye2);              // door knob
  // Steps
  PX.rect(x0 - 1, base - 1, 33, 1, PAL.g2);
  PX.rect(cx - 3, base - 1, 7, 1, PAL.g1);
  // Cornice and pediment
  PX.rect(x0 - 1, top, 33, 1, PAL.white);
  for (let r = 0; r < 6; r++) {
    const hw = 16 - r * 3;
    PX.rect(cx - hw, top - 1 - r, hw * 2 + 1, 1, PAL.sl1);
    PX.rect(cx - hw, top - 1 - r, Math.min(3, hw * 2 + 1), 1, PAL.white);
    PX.rect(cx + hw - 2, top - 1 - r, Math.min(3, hw + 1), 1, PAL.g1);
  }
  PX.rect(cx - 1, top - 3, 3, 2, PAL.sl3);       // round window in the gable
  // Clock tower on the ridge
  PX.rect(cx - 3, top - 13, 7, 7, PAL.sl1);
  PX.rect(cx - 3, top - 13, 1, 7, PAL.white);
  PX.rect(cx + 3, top - 13, 1, 7, PAL.sl2);
  PX.circle(cx, top - 10, 2, PAL.white);
  T.clock = { x: cx, y: top - 10 };
  PX.rect(cx - 4, top - 14, 9, 1, PAL.sl3);
  PX.rect(cx - 3, top - 15, 7, 1, PAL.sl3);
  PX.rect(cx - 2, top - 16, 5, 1, PAL.sl3);
  PX.rect(cx - 1, top - 17, 3, 1, PAL.sl3);
  PX.rect(cx - 4, top - 14, 3, 1, PAL.sl2);
  PX.px(cx - 3, top - 15, PAL.sl2);
  PX.px(cx - 2, top - 16, PAL.sl2);
  PX.px(cx, top - 18, PAL.sl3);
  PX.px(cx, top - 19, PAL.ye3);
  // Flagpole on the lawn to the left
  const px0 = x0 - 5;
  PX.rect(px0, base - 25, 1, 25, PAL.g3);
  PX.px(px0, base - 26, PAL.ye3);
  T.flag = { x: px0 + 1, y: base - 25 };
}

// The white church: columns, pediment, bell tower, tall spire, gold cross
function _townChurch(T, cx, base) {
  const x0 = cx - 8, top = base - 13;
  // Tower and belfry go in first so the pediment covers the tower's foot
  PX.rect(cx - 3, top - 10, 7, 9, PAL.white);
  PX.rect(cx + 2, top - 10, 2, 9, PAL.g1);
  PX.px(cx, top - 7, PAL.sl2);
  PX.rect(cx - 4, top - 11, 9, 1, PAL.g1);
  PX.rect(cx - 2, top - 17, 5, 6, PAL.white);
  PX.rect(cx + 2, top - 17, 1, 6, PAL.g1);
  PX.rect(cx - 1, top - 15, 3, 4, PAL.g4);       // louvres over the bell
  PX.px(cx, top - 16, PAL.g4);
  PX.rect(cx - 3, top - 18, 7, 1, PAL.g1);
  // Spire, lit on the left
  const spire = [2, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0];
  for (let r = 0; r < spire.length; r++) {
    const hw = spire[r], y = top - 19 - r;
    PX.rect(cx - hw, y, hw * 2 + 1, 1, PAL.g1);
    PX.px(cx - hw, y, PAL.white);
    if (hw > 0) PX.px(cx + hw, y, PAL.g2);
  }
  // Cross
  PX.rect(cx, top - 33, 1, 4, PAL.ye3);
  PX.rect(cx - 1, top - 32, 3, 1, PAL.ye3);
  // Body: recessed wall with four white columns standing in front
  PX.rect(x0, top, 17, 13, PAL.g1);
  for (const dx of [0, 5, 10, 15]) PX.rect(x0 + dx, top + 2, 2, 11, PAL.white);
  PX.rect(x0 + 16, top + 2, 1, 11, PAL.g2);
  _townArchWindow(T, x0 + 3, top + 5, 4);
  _townArchWindow(T, x0 + 13, top + 5, 4);
  PX.rect(x0 + 7, top + 8, 3, 4, PAL.wo3);
  PX.px(x0 + 8, top + 7, PAL.wo3);
  // Steps, entablature and pediment
  PX.rect(x0 - 1, base - 1, 19, 1, PAL.g2);
  PX.rect(x0 - 1, top, 19, 1, PAL.white);
  PX.rect(x0, top + 1, 17, 1, PAL.g2);
  for (let r = 0; r < 5; r++) {
    const hw = 9 - r * 2;
    PX.rect(cx - hw, top - 1 - r, hw * 2 + 1, 1, PAL.white);
    PX.rect(cx + hw - 1, top - 1 - r, 2, 1, PAL.g1);
  }
  PX.px(cx, top - 2, PAL.sl2);
}

// The stone arch bridge that carries the rail trail over the brook.
// x0 is its left end, y the top row of the trail. In the back layer it
// draws the arches; in the front layer only the railing, so that walkers
// and bikes pass behind it.
function _townBridge(x0, y, arches, front) {
  const pitch = 9, w = arches * pitch + 3;
  if (front) {
    PX.rect(x0, y - 2, w, 1, PAL.g5);
    for (let x = x0; x < x0 + w; x += 3) PX.px(x, y - 1, PAL.g5);
    return;
  }
  // Stone body under the deck
  PX.rect(x0, y + 2, w, 7, PAL.g2);
  PX.rect(x0, y + 2, w, 1, PAL.g1);
  for (let i = 0; i < arches; i++) {
    const ax = x0 + 3 + i * pitch;                // left edge of the opening
    PX.rect(ax + 2, y + 3, 2, 1, PAL.fo5);       // round top of the arch, in shadow
    PX.rect(ax + 1, y + 4, 4, 1, PAL.fo5);
    PX.rect(ax, y + 5, 6, 4, PAL.fo4);
    PX.rect(ax - 1, y + 5, 1, 4, PAL.g3);        // shaded side of each pier
    // The brook runs under the two middle arches
    if (i === 3 || i === 4) {
      PX.rect(ax, y + 7, 6, 2, PAL.wa3);
      PX.rect(ax + 1, y + 7, 3, 1, PAL.wa2);
    }
  }
  // Bushes at each end
  PX.spr('townBush', x0 - 1, y + 10);
  PX.spr('townBush', x0 + w + 1, y + 10);
}

// The rail trail tunnel: a stone arch in a grassy bank with its sign.
// front = true draws only the right-hand half, so that walkers and bikes
// coming along the trail slide in behind it and vanish into the dark.
function _townTunnel(cx, y, front) {
  const c = PX.c;
  c.save();
  c.beginPath();
  // The bank stops at the trail; the front half starts at the portal's middle
  if (front) c.rect(cx, 0, PX.W - cx + 2, y + 2);
  else c.rect(0, 0, PX.W + 2, y + 2);
  c.clip();
  // Grassy bank
  PX.ellipse(cx + 8, y + 1, 31, 14, PAL.gr4);
  PX.ellipse(cx + 6, y + 1, 26, 12, PAL.gr3);
  PX.ellipse(cx - 12, y - 4, 4, 3, PAL.fo3);
  PX.ellipse(cx + 16, y - 7, 6, 3, PAL.fo3);
  PX.ellipse(cx + 15, y - 8, 4, 2, PAL.fo2);
  // Stone arch
  PX.rect(cx - 5, y - 10, 11, 1, PAL.g1);
  PX.rect(cx - 6, y - 9, 13, 1, PAL.g2);
  PX.rect(cx - 7, y - 8, 15, 10, PAL.g2);
  PX.rect(cx - 7, y - 8, 1, 10, PAL.g1);
  PX.rect(cx + 7, y - 8, 1, 10, PAL.g3);
  PX.rect(cx - 6, y - 4, 2, 1, PAL.g3);
  PX.rect(cx + 5, y - 2, 2, 1, PAL.g3);
  PX.px(cx, y - 10, PAL.white);                   // keystone
  // Dark inside
  PX.rect(cx - 2, y - 7, 5, 1, PAL.black);
  PX.rect(cx - 3, y - 6, 7, 1, PAL.black);
  PX.rect(cx - 4, y - 5, 9, 7, PAL.black);
  PX.rect(cx - 4, y, 9, 2, PAL.g5);               // trail fading into the dark
  // Vines hanging over the top
  PX.rect(cx - 6, y - 11, 4, 1, PAL.fo2);
  PX.rect(cx + 3, y - 11, 4, 1, PAL.fo2);
  PX.px(cx - 5, y - 10, PAL.fo2);
  PX.px(cx - 5, y - 9, PAL.fo3);
  PX.px(cx + 5, y - 10, PAL.fo2);
  c.restore();
}

// The green RAIL TRAIL sign on two posts above the tunnel
function _townTrailSign(cx, y) {
  const w = PX.measure('RAIL TRAIL') + 5;
  const x = Math.min(PX.W - w - 1, cx - Math.floor(w / 2));
  PX.rect(x + 3, y, 1, 8, PAL.wo3);
  PX.rect(x + w - 4, y, 1, 8, PAL.wo3);
  PX.panel(x, y - 8, w, 9, PAL.gr5, PAL.cream);
  PX.text('RAIL TRAIL', x + Math.ceil(w / 2), y - 8, { color: PAL.white, align: 'center' });
}

// Lake Winthrop: a long oval of water tucked under the tree line
function _townLake(T, cx, cy, rx) {
  // Each row is [left, right] measured from the middle, top row first
  const rows = [[-rx + 6, rx - 9], [-rx, rx - 3], [-rx, rx], [-rx, rx - 2], [-rx + 3, rx - 8]];
  for (let r = 0; r < rows.length; r++) {
    const xa = cx + rows[r][0], xb = cx + rows[r][1];
    PX.rect(xa - 1, cy - 2 + r, xb - xa + 3, 2, PAL.gr5);                 // shadowed bank
    PX.rect(xa, cy - 2 + r, xb - xa + 1, 1, r === 0 ? PAL.wa3 : PAL.wa2);   // far shore reflects the trees
  }
  PX.rect(cx + rows[1][0] + 2, cy - 1, rx, 1, PAL.wa3);
  PX.rect(cx - 6, cy + 3, 11, 1, PAL.ta1);          // a strip of sandy beach
  PX.spr('townReeds', cx + rx - 2, cy + 2);
  T.lake = { x0: cx - rx + 5, x1: cx + rx - 9, y: cy };
}

// ── Painting the still parts of the town ─────────────

// Makes an art-pixel canvas the size of the sky above the horizon
function _townCanvas() {
  const cv = document.createElement('canvas');
  cv.width = PX.W;
  cv.height = PX.HOR + 3;
  return cv;
}

// Paints the whole town once. Called again only if the art grid changes
// (a different screen size) or the pixel font finishes loading.
function _buildTown(key) {
  const W = PX.W, H0 = PX.HOR, Y = TOWN_ROWS;
  const T = {
    key, font: PX.fonts.small,
    back: _townCanvas(), front: _townCanvas(), lights: _townCanvas(), glow: _townCanvas(),
    chimneys: [], windows: [], lamps: [],
    balloons: null, flag: null, clock: null, lake: null,
    tunnelX: W - 26,
  };
  const rnd = _townRand(42);
  const edges = _townSchoolEdges();
  const seenL = edges.l;                    // the school starts here...
  const seenR = edges.r;                    // ...and ends here
  const backY = H0 + Y.back, frontY = H0 + Y.front, trailY = H0 + Y.trail;

  // ════════════════════════════════════════════════════
  //  BACK LAYER: everything behind the rail trail's travellers
  // ════════════════════════════════════════════════════
  PX.withTarget(T.back.getContext('2d'), () => {

    // 1. Far hill, hazy blue-green, with a paler rim where the sun catches it
    const hillCol = PX.mix(PAL.fo3, PAL.sk3, 0.5);
    const hillRim = PX.mix(PAL.fo2, PAL.sk2, 0.55);
    // (behind the school it sinks out of sight, so that only sky and a few
    // treetops show over the roofs instead of a band of hill)
    for (let x = 0; x < W; x++) {
      const t = x / W;
      const behind = constrain((x - seenL) / 24, 0, 1) * constrain((seenR - x) / 24, 0, 1);
      const y = H0 + Y.hill + Math.round(4 * Math.sin(t * 6.1 + 0.8) + 2 * Math.sin(t * 14.3 + 2.1) + 8 * behind);
      if (y >= H0 + Y.upper) continue;
      PX.rect(x, y, 1, H0 + Y.upper - y, hillCol);
      PX.px(x, y, hillRim);
    }

    // 2. Tree line: a dark back row, then a slightly lighter front row
    const fy = H0 + Y.forest;
    PX.rect(0, fy + 1, W, Y.upper - Y.forest, PAL.fo5);
    for (let x = -3; x < W + 6; x += 3 + Math.floor(rnd() * 4)) {
      if (rnd() < 0.55) _townConifer(x, fy + 3, 7 + Math.floor(rnd() * 5), 2 + Math.floor(rnd() * 2), PAL.fo5, null);
      else _townCrown(x, fy - Math.floor(rnd() * 2), 3 + Math.floor(rnd() * 2), 3, PAL.fo5, null);
    }
    for (let x = -2; x < W + 6; x += 4 + Math.floor(rnd() * 4)) {
      if (rnd() < 0.4) _townConifer(x, fy + 5, 6 + Math.floor(rnd() * 4), 2, PAL.fo4, PAL.fo3);
      else _townCrown(x, fy + 2 + Math.floor(rnd() * 2), 3 + Math.floor(rnd() * 2), 2 + Math.floor(rnd() * 2), PAL.fo4, PAL.fo3);
    }
    PX.rect(0, fy + 4, W, Y.upper - Y.forest - 4, PAL.fo4);

    // 3. Upper terrace: meadow between the woods and the town
    PX.rect(0, H0 + Y.upper, W, Y.main - Y.upper + 3, PAL.gr4);
    for (let x = 0; x < W; x++) {
      // a ragged top edge, so the meadow does not meet the woods in a ruled line
      if (Math.sin(x * 0.9) + Math.sin(x * 0.37 + 1) > 0.6) PX.px(x, H0 + Y.upper, PAL.fo4);
    }

    // Lake Winthrop, far left where the school does not cover it
    _townLake(T, 20, H0 + Y.upper + 1, 27);

    // Fields: hay and green crops
    const fieldCols = [[PAL.ye1, PAL.ta2], [PAL.gr2, PAL.gr3], [PAL.ta1, PAL.gr2]];
    _townField(W - 142, H0 + Y.upper + 1, 20, 5, PAL.ye1, PAL.ta2);
    for (let x = seenL + 30, i = 0; x < seenR - 60; x += 46 + Math.floor(rnd() * 30), i++) {
      const fc = fieldCols[i % fieldCols.length];
      _townField(x, H0 + Y.upper + 1 + (i % 2), 16 + Math.floor(rnd() * 10), 4 + (i % 2), fc[0], fc[1]);
    }

    // A few far-off houses and trees in front of the woods
    const farX = [W * 0.58, W * 0.68, W * 0.78, W - 72];
    for (let i = 0; i < farX.length; i++) {
      _townFarHouse(T, Math.round(farX[i]), trailY, TOWN_HOUSES[(i * 2 + 3) % TOWN_HOUSES.length]);
    }
    for (const tx of [W * 0.20, W * 0.24, W * 0.28, W * 0.63, W * 0.75, W - 84, W - 62]) {
      PX.spr(Math.round(tx) % 2 ? 'townPine' : 'townTree', Math.round(tx), trailY);
    }

    // The tunnel's bank and arch (the right half is repeated in the front layer)
    _townTunnel(T.tunnelX, trailY, false);

    // 4. Rail trail: stone dust, lighter along its top edge
    PX.rect(0, trailY, T.tunnelX + 4, 1, PAL.ta1);
    PX.rect(0, trailY + 1, T.tunnelX + 4, 1, PAL.ta2);
    PX.rect(T.tunnelX - 3, trailY, 8, 2, PAL.g5);

    // 5. Main town terrace, with a sunlit lip that rises and falls a little
    for (let x = 0; x < W; x++) {
      const y = H0 + Y.main + Math.round(Math.sin(x / W * 9 + 1.3) + 0.6 * Math.sin(x / W * 23));
      PX.rect(x, y, 1, H0 + 3 - y, PAL.gr3);
      PX.px(x, y, PAL.gr2);
    }
    // Tufts of darker grass so the slope is not one flat colour
    for (let i = 0; i < W / 3; i++) {
      const gx = Math.floor(rnd() * W), gy = H0 + Y.main + 3 + Math.floor(rnd() * 9);
      PX.rect(gx, gy, 2, 1, PAL.gr4);
    }

    // The brook runs out of the lake, under the bridge and down the slope
    const brookX = 36;
    for (let r = 0; r < 14; r++) {
      const bx = brookX + Math.round(Math.sin(r * 0.8) * 1.5);
      PX.rect(bx, trailY + 9 + r, 2, 1, PAL.wa2);
      PX.px(bx + 2, trailY + 9 + r, PAL.gr4);
    }

    // The bridge itself
    _townBridge(1, trailY, 8, false);

    // Fields on the slope behind the school
    for (let x = seenL + 50, i = 1; x < seenR - 40; x += 60 + Math.floor(rnd() * 30), i++) {
      const fc = fieldCols[i % fieldCols.length];
      _townField(x, H0 + Y.main + 3, 18 + Math.floor(rnd() * 8), 5, fc[0], fc[1]);
    }

    // 6. Roads. Main Street runs the full width; a side street drops from
    //    it to the front street on the right of the school.
    const road = (y) => {
      PX.rect(0, y - 1, W, 1, PAL.g2);            // far sidewalk
      PX.rect(0, y, W, 5, PAL.g4);
      PX.rect(0, y, W, 1, PAL.g5);                // shadow of the kerb
      PX.rect(0, y + 5, W, 1, PAL.g2);            // near sidewalk
      for (let x = 2; x < W; x += 8) PX.rect(x, y + 2, 4, 1, PAL.ye2);
      for (let x = 5; x < W; x += 7) { PX.px(x, y - 1, PAL.g3); PX.px(x + 3, y + 5, PAL.g3); }
    };
    const sideX = W - 68;
    PX.rect(sideX - 1, H0 + Y.road + 6, 8, Y.road2 - Y.road - 6, PAL.g2);
    PX.rect(sideX, H0 + Y.road + 5, 6, Y.road2 - Y.road - 5, PAL.g4);
    road(H0 + Y.road);
    road(H0 + Y.road2);
    PX.rect(sideX, H0 + Y.road + 5, 6, 1, PAL.g4);
    PX.rect(sideX, H0 + Y.road2 - 1, 6, 1, PAL.g4);
    // Crosswalks where people cross to the shops and the Town Hall
    for (const cxw of [33, sideX - 6]) {
      for (let r = 0; r < 5; r += 2) PX.rect(cxw, H0 + Y.road + r, 3, 1, PAL.g1);
    }
    PX.rect(0, H0 - 1, W, 4, PAL.gr3);
  });

  // ════════════════════════════════════════════════════
  //  FRONT LAYER: buildings, and whatever hides the trail's travellers
  // ════════════════════════════════════════════════════
  PX.withTarget(T.front.getContext('2d'), () => {
    _townBridge(1, trailY, 8, true);
    _townTunnel(T.tunnelX, trailY, true);
    _townTrailSign(T.tunnelX, trailY - 11);

    const lamp = (x, y) => {
      PX.spr('townLamp', x, y);
      T.lamps.push({ x, y: y - 6 });
    };

    // ── Main Street, behind the school: houses and trees ──
    // (mostly hidden, but they peep out wherever the school is low)
    let n = 0;
    for (let x = seenL + 14; x < seenR - 16; x += 21 + Math.floor(rnd() * 8), n++) {
      const st = TOWN_HOUSES[n % TOWN_HOUSES.length];
      if (n % 4 === 3) PX.spr(n % 8 === 3 ? 'townPine' : 'townTree', x, backY);
      else if (n % 2) _townCottage(T, x, backY, st);
      else _townHouse(T, x, backY, st);
      if (n % 3 === 1) lamp(x + 11, backY + 1);
    }

    // ── Main Street, left: the Superette ──
    _townSuperette(T, 1, backY);
    PX.spr('townTree', seenL - 4, backY);

    // ── Main Street, right: Town Hall, church, two houses ──
    PX.spr('townTree', seenR + 2, backY);
    _townHall(T, W - 98, backY);
    PX.spr('townPine', W - 77, backY);
    _townChurch(T, W - 59, backY);
    PX.spr('townTree', W - 44, backY);
    _townHouse(T, W - 33, backY, TOWN_HOUSES[2]);
    _townCottage(T, W - 14, backY, TOWN_HOUSES[1]);
    PX.spr('townBush', W - 23, backY);
    lamp(W - 120, backY + 1);
    lamp(W - 72, backY + 1);
    lamp(W - 46, backY + 1);
    lamp(52, backY + 1);

    // ── Front street, behind the school ──
    n = 0;
    for (let x = seenL + 6; x < seenR - 10; x += 20 + Math.floor(rnd() * 9), n++) {
      const st = TOWN_HOUSES[(n + 3) % TOWN_HOUSES.length];
      if (n % 3 === 2) PX.spr(n % 2 ? 'townPine' : 'townTree', x, frontY);
      else if (n % 2) _townHouse(T, x, frontY, st);
      else _townCottage(T, x, frontY, st);
    }

    // ── Front street, left: Fiske's and CVS ──
    _townFiskes(T, 0, frontY);
    _townCVS(T, 35, frontY);

    // ── Front street, right: houses and garden trees ──
    _townCottage(T, W - 107, frontY, TOWN_HOUSES[0]);
    PX.spr('townPine', W - 94, frontY);
    _townHouse(T, W - 83, frontY, TOWN_HOUSES[4]);
    PX.spr('townTree', W - 73, frontY);
    PX.spr('townBush', W - 57, frontY);
    _townCottage(T, W - 46, frontY, TOWN_HOUSES[3]);
    PX.spr('townPine', W - 33, frontY);
    _townHouse(T, W - 22, frontY, TOWN_HOUSES[6]);
    PX.spr('townTree', W - 9, frontY);
    lamp(W - 62, frontY + 1);
    lamp(W - 28, frontY + 1);
    lamp(33, frontY + 1);
  });

  // ════════════════════════════════════════════════════
  //  NIGHT LIGHTS: lit windows and lamps, faded in after dark
  // ════════════════════════════════════════════════════
  const lg = T.lights.getContext('2d');
  PX.withTarget(lg, () => {
    const lit = _townRand(7);
    for (const w of T.windows) {
      if (w.kind !== 'shop' && lit() < 0.25) continue;      // somebody is out, or asleep
      PX.rect(w.x, w.y, w.w, w.h, w.kind === 'shop' ? PAL.ye1 : PAL.ye2);
      if (w.kind === 'shop' && w.h > 2) PX.rect(w.x, w.y + w.h - 1, w.w, 1, PAL.ye2);
      if (w.arch) PX.px(w.x + 1, w.y - 1, PAL.ye2);
    }
    if (T.clock) PX.circle(T.clock.x, T.clock.y, 2, PAL.ye1);
    for (const l of T.lamps) {
      // a soft pool of light around each lamp
      lg.globalAlpha = 0.22;
      PX.rect(l.x - 2, l.y - 1, 5, 3, PAL.ye2);
      PX.rect(l.x - 1, l.y - 2, 3, 5, PAL.ye2);
      lg.globalAlpha = 1;
      PX.px(l.x, l.y, PAL.ye1);
    }
  });

  // Only smoke from chimneys that can be seen is worth animating
  T.chimneys = T.chimneys.filter(ch => _townSeen(ch.x - 6, ch.x + 6));
  return T;
}

// ══════════════════════════════════════════════════════
//  drawTown()  — the single entry point
// ══════════════════════════════════════════════════════

// Draws the town backdrop: the two painted layers with the traffic,
// walkers, cyclists, smoke and other small moving things between them.
function drawTown() {
  try {
    if (!_bgCars) _initBgElements();

    // Repaint the still parts only when the art grid or the font changes
    const key = PX.W + '|' + PX.H + '|' + PX.S + '|' + PX.HOR;
    if (!_town || _town.key !== key || _town.font !== PX.fonts.small) _town = _buildTown(key);
    const T = _town, H0 = PX.HOR, Y = TOWN_ROWS;

    PX.c.drawImage(T.back, 0, 0);
    _drawTownLake(T);
    // When the weather clears, the rainbow comes down in front of the far hills
    if (typeof queueRainbowFoot === 'function') queueRainbowFoot(T.back, _townSchoolEdges().l);

    // Rail trail: walkers behind, bikes in front, then the bridge railing
    // and the tunnel mouth over both
    _updateDrawBgWalkers(_bgTrailWalkers, H0 + Y.trail + 1, T.tunnelX + 3);
    _updateDrawBgBikers(_bgBikers, H0 + Y.trail + 2, T.tunnelX + 3);

    PX.c.drawImage(T.front, 0, 0);

    // Main Street: the far lane first, then the near lane, then the sidewalk
    _updateDrawBgCars(_bgCars2, H0 + Y.road + 3, H0 + Y.road + 5);
    _updateDrawBgWalkers(_bgWalkers2, H0 + Y.road + 6);

    // Front street
    _updateDrawBgWalkers(_bgWalkers, H0 + Y.road2);
    _updateDrawBgCars(_bgCars, H0 + Y.road2 + 3, H0 + Y.road2 + 5);

    _drawTownExtras(T);
    _drawTownLights(T);
  } catch (e) {
    console.error('Town drawing error:', e);
  }
}
drawTown.pixel = true;

// ── Small moving details ─────────────────────────────

// Sparkles drifting across Lake Winthrop
function _drawTownLake(T) {
  const lk = T.lake;
  if (!lk) return;
  const span = lk.x1 - lk.x0;
  for (let i = 0; i < 5; i++) {
    // each sparkle shows for a while, then jumps to a new spot
    const step = Math.floor((PX.tick + i * 23) / 46);
    if ((step + i) % 3 === 0) continue;
    const x = lk.x0 + ((step * 17 + i * 29) % span);
    const y = lk.y - 1 + ((step + i) % 3);
    if (x < 0) continue;
    PX.rect(x, y, 2 + (i % 2), 1, PAL.wa1);
    if (PX.anim(2, 23, i * 11)) PX.px(x + 1, y, PAL.white);
  }
}

// Chimney smoke, Fiske's balloons, the Town Hall flag and its clock
function _drawTownExtras(T) {
  // Smoke: three puffs per chimney climbing, wobbling and leaning with the wind
  for (let n = 0; n < T.chimneys.length; n++) {
    const ch = T.chimneys[n];
    for (let i = 0; i < 3; i++) {
      const p = ((PX.tick + n * 37) / 120 + i / 3) % 1;
      const x = ch.x + Math.round(Math.sin(p * 5 + n) * 0.7 + windX * p * 4);
      const y = ch.y - Math.floor(p * 8);
      if (p < 0.35) PX.px(x, y, PAL.g1);
      else if (p < 0.7) { PX.rect(x, y, 2, 1, PAL.g1); PX.px(x, y - 1, PAL.g1); }
      else PX.alpha(0.5, () => PX.rect(x, y - 1, 2, 2, PAL.g1));
    }
  }

  // Balloons bobbing on their strings outside Fiske's
  if (T.balloons) {
    const b = T.balloons;
    const cols = [[PAL.re2, PAL.re1], [PAL.ye2, PAL.ye1], [PAL.bl2, PAL.bl1]];
    for (let i = 0; i < 3; i++) {
      const bx = b.x + i - 1 + (i === 2 ? 1 : 0);
      const by = b.y - 9 - (i === 1 ? 3 : 0) + (PX.anim(2, 34, i * 19) ? 1 : 0);
      PX.line(b.x + 1, b.y, bx + 1, by + 2, PAL.g1);
      PX.rect(bx, by, 2, 2, cols[i][0]);
      PX.px(bx, by, cols[i][1]);
    }
  }

  if (T.flag) PX.spr('townFlag', T.flag.x, T.flag.y, { frame: PX.anim(2, 26) });

  _drawTownClockHand(T);
}

// The Town Hall clock's single hand follows the garden's day (dawn is about 6 o'clock)
function _drawTownClockHand(T) {
  if (!T.clock) return;
  const a = ((5 + timeOfDay * 23) % 12) / 12 * TWO_PI;
  const hx = Math.round(Math.sin(a)), hy = -Math.round(Math.cos(a));
  PX.px(T.clock.x, T.clock.y, PAL.ink);
  PX.px(T.clock.x + hx, T.clock.y + hy, PAL.ink);
  if (!(hx && hy)) PX.px(T.clock.x + hx * 2, T.clock.y + hy * 2, PAL.ink);
}

// Night lights: windows, street lamps and headlights. They have to be
// drawn after the night tint, which means on top of the whole garden, so
// they are first gathered in a scratch layer and everything that stands in
// front of the town (the school, the fence, the swaying trees) is cut out
// of it. No window shines through a wall or a tree, and the ones right
// beside the school are lit like all the others.
function _drawTownLights(T) {
  const na = nightAmount();
  if (na <= 0.2) return;
  const glow = constrain((na - 0.2) / 0.4, 0, 1);
  const H0 = PX.HOR, Y = TOWN_ROWS;
  PX.light(() => {
    const g = T.glow.getContext('2d');
    g.clearRect(0, 0, T.glow.width, T.glow.height);
    PX.withTarget(g, () => {
      PX.c.drawImage(T.lights, 0, 0);

      // People walking past the lit shop windows, in their night colours
      for (const w of _bgWalkers) {
        const x = Math.round(w.x / PX.S);
        PX.spr('townWalker', x, H0 + Y.road2, { frame: sin(w.phase) > 0 ? 'stand' : 'stride', flip: w.dir < 0, pal: w.nightPal });
      }
      _drawTownClockHand(T);

      // Headlights: a bright lamp and a short beam on the road ahead
      const beams = (cars, farY, nearY) => {
        for (const car of cars) {
          const x = Math.round(car.x / PX.S);
          const front = x + car.dir * (car.bus ? 9 : 6);
          const y = (car.dir > 0 ? nearY : farY) - 3;
          PX.px(front - (car.dir > 0 ? 1 : 0), y, PAL.ye1);
          PX.alpha(0.4, () => {
            PX.rect(car.dir > 0 ? front : front - 3, y, 3, 1, PAL.ye1);
            PX.rect(car.dir > 0 ? front + 1 : front - 6, y + 1, 5, 1, PAL.ye2);
          });
        }
      };
      beams(_bgCars2, H0 + Y.road + 3, H0 + Y.road + 5);
      beams(_bgCars, H0 + Y.road2 + 3, H0 + Y.road2 + 5);

      // Cut away whatever stands in front of the town
      if (typeof drawTownOccluders === 'function') {
        g.globalCompositeOperation = 'destination-out';
        drawTownOccluders();
        g.globalCompositeOperation = 'source-over';
      }
    });
    PX.alpha(glow, () => PX.c.drawImage(T.glow, 0, 0));
  });
}

// ── Vehicle & pedestrian animation ───────────────────

// Update positions and draw cars/buses on a road, wrapping at screen edges.
// Traffic keeps right: cars heading left use the far lane (farY) and are
// drawn first, cars heading right use the near lane (nearY).
function _updateDrawBgCars(carArr, farY, nearY) {
  for (let car of carArr) {
    car.x += car.speed * car.dir;
    if (car.dir > 0 && car.x > width + 50) car.x = -50;
    if (car.dir < 0 && car.x < -50)        car.x = width + 50;
  }
  for (let pass = -1; pass <= 1; pass += 2) {
    for (let car of carArr) {
      if (car.dir !== pass) continue;
      const x = Math.round(car.x / PX.S);
      // The hubcaps turn as the car covers ground
      const opts = { frame: Math.floor(car.x / (PX.S * 2)) & 1, flip: car.dir < 0 };
      if (car.pal) opts.pal = car.pal;
      PX.spr(car.bus ? 'townBus' : 'townCar', x, pass < 0 ? farY : nearY, opts);
    }
  }
}

// Update positions and draw walking pedestrians with a two-frame stride.
// hideAfter (optional) is an art x past which they are out of sight.
function _updateDrawBgWalkers(walkerArr, walkY, hideAfter) {
  for (let w of walkerArr) {
    w.x += w.speed * w.dir;
    w.phase += 0.12;
    if (w.dir > 0 && w.x > width + 20) w.x = -20;
    if (w.dir < 0 && w.x < -20)        w.x = width + 20;

    const x = Math.round(w.x / PX.S);
    if (hideAfter !== undefined && x > hideAfter) continue;
    PX.spr('townWalker', x, walkY, { frame: sin(w.phase) > 0 ? 'stand' : 'stride', flip: w.dir < 0, pal: w.pal });
  }
}

// Update positions and draw cyclists pedalling along the rail trail
function _updateDrawBgBikers(bikerArr, trailY, hideAfter) {
  for (let b of bikerArr) {
    b.x += b.speed * b.dir;
    b.phase += 0.16;
    if (b.dir > 0 && b.x > width + 30) b.x = -30;
    if (b.dir < 0 && b.x < -30)        b.x = width + 30;

    const x = Math.round(b.x / PX.S);
    if (hideAfter !== undefined && x > hideAfter) continue;
    PX.spr('townBiker', x, trailY, { frame: sin(b.phase * 2) > 0 ? 0 : 1, flip: b.dir < 0, pal: b.pal });
  }
}
