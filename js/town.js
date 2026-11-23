// ================================================================
// File: town.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 23, 2026
// Description: The block-built town behind and beside the school: the
//   terraced, wooded hills, Lake Winthrop and its brook, the rail trail
//   with its stone bridge and tunnel, the Superette, Fiske's, CVS, the
//   Town Hall and the white church, houses and cottages, and the cars,
//   buses, walkers and cyclists moving through it. The models and
//   textures of the small things live in js/art/town_art.js.
// ================================================================

// ── Town Backdrop ─────────────────────────────────────
// Single entry point: drawTown(), called first in the frame.
//
// The town never changes, so it is built once: every still box is baked
// into one mesh per block texture (about forty meshes for the whole
// town) and only the moving things and the night lights are touched
// every frame.
//
// Layout, in blocks (see docs/GARDEN_3D.md; the school fills x -15..15,
// z -7..0, so the town shows to its left and right and over its roof):
//
//   z  -8.5 .. -11    front street, on the flat (y = 0)
//   z -12.5 .. -16.5  front row: Fiske's and CVS (left), church and a cottage (right)
//   z -17, -18        the bank up to the Main Street terrace (y = 2)
//   z -22.5 .. -25    Main Street
//   z -26 .. -30      Main Street row: Superette (left), Town Hall (right), houses
//   z -31             the bank up to the upper terrace (y = 3)
//   z -34 .. -35.5    the rail trail: stone bridge over the brook (left),
//                     tunnel under a hillock (right)
//   z -39 .. -46      far houses, fields, Lake Winthrop (far left)
//   z -42 .. -48      the wooded ridge out to the sides (y = 4)
// The land stops at z = -48: anything further back or higher would fill
// the strip of sky the camera sees above the town.

// ── Animation state ──────────────────────────────────
let _bgCars         = null;
let _bgCars2        = null;
let _bgWalkers      = null;
let _bgWalkers2     = null;
let _bgBikers       = null;
let _bgTrailWalkers = null;

// The built town: { group, lights, clock hand, smoke, ... }
let _town = null;

// Rows of the old painted town, in art pixels relative to the horizon.
// Only weather.js still reads `upper` (for where its rainbow comes down).
const TOWN_ROWS = { hill: -67, forest: -60, upper: -55, trail: -49, main: -41, back: -29, road: -28, front: -9, road2: -8 };

// Where things are, in blocks.
const TOWN = {
  FRONT_Y: 0, FRONT_Z0: -11, FRONT_Z1: -8.5,      // front street
  MAIN_Y: 2,  MAIN_Z0: -25,  MAIN_Z1: -22.5,      // Main Street
  TRAIL_Y: 3, TRAIL_Z0: -35.5, TRAIL_Z1: -34,     // rail trail
  TUNNEL_X: 46,                                   // the trail turns into the hill here
  // How far a road reaches for a trip across the old screen (the moving
  // things still keep their position in screen pixels, 0..width).
  FRONT_SPAN: 84, MAIN_SPAN: 100, TRAIL_SPAN: 112,
};

// Initialize car, walker, and biker arrays for background animation.
// Positions (x) and speeds stay in screen pixels, as they always were;
// they are turned into blocks along their road only when posed.
function _initBgElements() {
  const shirts = [0, 200, 120, 48, 270, 350, 30, 180, 90];
  const carPal = (i) => {
    const c = TOWN_CAR_COLORS[i % TOWN_CAR_COLORS.length];
    const r = PX.ramp(c[0], c[1], c[2]);
    return { l: r.l, m: r.m, d: r.d };
  };
  const yellowBus = { l: PAL.ye1, m: PAL.ye2, d: PAL.ye3, s: PAL.g5 };
  const whiteBus = { l: PAL.white, m: PAL.g1, d: PAL.g2, s: PAL.bl3 };
  const person = (i, hue) => ({
    c: PX.ramp(hue, 58, 55).m,
    s: TOWN_SKINS[i % TOWN_SKINS.length],
    h: TOWN_HAIR[(i * 3 + 1) % TOWN_HAIR.length],
  });

  // Front street cars
  _bgCars = [];
  for (let i = 0; i < 3; i++) {
    _bgCars.push({ x: random(0, width), speed: random(0.35, 0.9),
      dir: random() < 0.5 ? 1 : -1, bus: false, pal: carPal(i) });
  }
  _bgCars.push({ x: random(0, width), speed: random(0.25, 0.6),
    dir: random() < 0.5 ? 1 : -1, bus: true, pal: yellowBus });

  // Main Street cars
  _bgCars2 = [];
  for (let i = 0; i < 4; i++) {
    _bgCars2.push({ x: random(0, width), speed: random(0.55, 1.3),
      dir: random() < 0.5 ? 1 : -1, bus: false, pal: carPal(i + 3) });
  }
  _bgCars2.push({ x: random(0, width), speed: random(0.3, 0.7),
    dir: random() < 0.5 ? 1 : -1, bus: true, pal: yellowBus });
  _bgCars2.push({ x: random(0, width), speed: random(0.3, 0.7),
    dir: random() < 0.5 ? 1 : -1, bus: true, pal: whiteBus });

  // Front street sidewalk walkers
  _bgWalkers = [];
  for (let i = 0; i < 6; i++) {
    _bgWalkers.push({ x: random(width*0.03, width*0.97), speed: random(0.04, 0.10),
      dir: random()<0.5?1:-1, phase: random(TWO_PI), pal: person(i, shirts[i % shirts.length]) });
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

// Collects the faces of many textured boxes and bakes them into one mesh
// per block texture. The texture repeats once per block and is lined up
// with the world, so neighbouring boxes tile without a seam. Faces nobody
// can see from the garden (undersides, backs, the far sides of things off
// to the left and right) are never made.
function _townBatcher() {
  const batches = new Map();
  const get = (name) => {
    let b = batches.get(name);
    if (!b) { b = { pos: [], nor: [], uv: [], idx: [], n: 0 }; batches.set(name, b); }
    return b;
  };
  const quad = (name, p, nx, ny, nz, uv) => {
    const b = get(name), i = b.n;
    for (let k = 0; k < 4; k++) {
      b.pos.push(p[k][0], p[k][1], p[k][2]);
      b.nor.push(nx, ny, nz);
      b.uv.push(uv[k][0], uv[k][1]);
    }
    b.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    b.n += 4;
  };
  const B = {
    top(name, x0, x1, z0, z1, y) {
      quad(name, [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], 0, 1, 0, [[x0, -z1], [x1, -z1], [x1, -z0], [x0, -z0]]);
    },
    front(name, x0, x1, y0, y1, z) {
      quad(name, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], 0, 0, 1, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    },
    right(name, z0, z1, y0, y1, x) {
      quad(name, [[x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1]], 1, 0, 0, [[-z1, y0], [-z0, y0], [-z0, y1], [-z1, y1]]);
    },
    left(name, z0, z1, y0, y1, x) {
      quad(name, [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]], -1, 0, 0, [[z0, y0], [z1, y0], [z1, y1], [z0, y1]]);
    },
    // A box from (x0, y0, z0) to (x1, y1, z1); z1 is its front.
    // tex = block name, or { top, side } (side also does the front).
    box(tex, x0, x1, y0, y1, z0, z1) {
      const side = typeof tex === 'string' ? tex : tex.side;
      const top = typeof tex === 'string' ? tex : (tex.top || tex.side);
      B.top(top, x0, x1, z0, z1, y1);
      B.front(side, x0, x1, y0, y1, z1);
      if (x0 > -3) B.left(side, z0, z1, y0, y1, x0);
      if (x1 < 3) B.right(side, z0, z1, y0, y1, x1);
    },
    // Bakes everything collected so far into meshes inside `group`.
    bake(group) {
      for (const [name, b] of batches) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b.pos), 3));
        g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(b.nor), 3));
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(b.uv), 2));
        g.setIndex(new THREE.BufferAttribute(new (b.n > 65535 ? Uint32Array : Uint16Array)(b.idx), 1));
        const m = new THREE.Mesh(g, G3.blockMat(name));
        m.castShadow = false; m.receiveShadow = true;
        group.add(m);
      }
    },
  };
  return B;
}

// ── The lie of the land ──────────────────────────────

// Lake Winthrop: one [left, right] pair per row of blocks, back row first
const TOWN_LAKE = { z0: -46, y: 2.8, rows: [[-56, -47], [-58, -44], [-58, -43], [-58, -43], [-57, -43], [-54, -43]] };

// The height of the ground (whole blocks) at a point, and the level of
// any water standing on it (0 = dry). Flat at the front; a bank up to
// Main Street; another up to the rail trail; then the wooded ridge.
function _townGround(x, z, out) {
  let h = 0, water = 0;
  const ax = Math.abs(x);
  if (z < -17) h = 1;
  if (z < -18) h = 2;
  // The brook's valley cuts down through the upper terrace (the bridge spans it)
  const valley = x > -51 && x < -40 && z > -38;
  if (!valley) {
    if (z < -31) h = 3;
    // The ridge: only out to the sides, so that there is sky over the school
    const side = Math.max(0, Math.min(1, (ax - 16) / 22));
    const wob = (Math.sin(x * 0.21 + 1) * 2 + Math.sin(x * 0.083 + 0.4) * 3) * side;
    let ridge = -42 - wob * 0.6 - (1 - side) * 10;
    if (x > -60 && x < -41) ridge = Math.min(ridge, -46.5);     // behind the lake
    if (z < ridge) h = 4;
    // The lake, and the channel where the brook leaves it
    const row = Math.floor(z) - TOWN_LAKE.z0;
    if (row >= 0 && row < TOWN_LAKE.rows.length && x > TOWN_LAKE.rows[row][0] && x < TOWN_LAKE.rows[row][1]) { h = 2; water = TOWN_LAKE.y; }
    if (x > -45 && x < -44 && z > -40 && z < -38) { h = 2; water = TOWN_LAKE.y; }
    // The hillock the rail trail tunnels into
    if (z < -37) {
      const dx = Math.abs(x - TOWN.TUNNEL_X);
      if (dx < 4 && z > -43) h = Math.max(h, 4);
      if (dx < 3 && z > -42) h = Math.max(h, 5);
      if (dx < 2 && z > -41) h = Math.max(h, 6);
    }
  } else if (z < -27) {
    // The brook runs down the valley into a pool below the bridge
    h = 1;
    if (x > -45 && x < -44 && z < -32) water = 1.07;
    if (x > -47 && x < -42 && z > -33 && z < -29) water = 1.07;
  }
  if (out) { out.h = h; out.water = water; }
  return h;
}

// Turns the height map into terraces: flat grass tops and one-block banks.
function _townTerrain(B) {
  const X0 = -72, X1 = 72, Z0 = -48, Z1 = -17, nx = X1 - X0, nz = Z1 - Z0;
  const H = new Int8Array(nx * nz), W = new Float32Array(nx * nz), o = {};
  for (let iz = Z0; iz < Z1; iz++) for (let ix = X0; ix < X1; ix++) {
    _townGround(ix + 0.5, iz + 0.5, o);
    H[(iz - Z0) * nx + ix - X0] = o.h;
    W[(iz - Z0) * nx + ix - X0] = o.water;
  }
  const at = (ix, iz) => (iz >= Z1 ? 0 : H[(iz - Z0) * nx + ix - X0]);
  const wat = (ix, iz) => W[(iz - Z0) * nx + ix - X0];
  // A bank: grass over earth for the top block, bare earth below it
  const bank = (face, a0, a1, lo, hi, c) => {
    B[face]('grass_side', a0, a1, hi - 1, hi, c);
    if (hi - 1 > lo) B[face]('dirt', a0, a1, lo, hi - 1, c);
  };
  for (let iz = Z0; iz < Z1; iz++) {
    // Tops, in runs of the same height (alternate terraces are a lighter green)
    for (let ix = X0; ix < X1;) {
      const h = at(ix, iz), w = wat(ix, iz);
      let e = ix + 1;
      while (e < X1 && at(e, iz) === h && wat(e, iz) === w) e++;
      if (w) B.top('water', ix, e, iz, iz + 1, w);
      else if (h > 0) B.top(h % 2 ? 'grass_light' : 'grass', ix, e, iz, iz + 1, h);
      ix = e;
    }
    // Banks that face the garden
    for (let ix = X0; ix < X1;) {
      const h = at(ix, iz), lo = at(ix, iz + 1);
      let e = ix + 1;
      while (e < X1 && at(e, iz) === h && at(e, iz + 1) === lo) e++;
      if (h > lo) bank('front', ix, e, lo, h, iz + 1);
      ix = e;
    }
  }
  // Banks that face left or right (only the ones that can be seen)
  for (let ix = X0; ix < X1; ix++) {
    for (let iz = Z0; iz < Z1;) {
      const h = at(ix, iz), r = ix + 1 < X1 ? at(ix + 1, iz) : h, l = ix > X0 ? at(ix - 1, iz) : h;
      let e = iz + 1;
      while (e < Z1 && at(ix, e) === h && (ix + 1 < X1 ? at(ix + 1, e) : h) === r && (ix > X0 ? at(ix - 1, e) : h) === l) e++;
      if (h > r && ix + 1 < 3) bank('right', iz, e, r, h, ix + 1);
      if (h > l && ix > -3) bank('left', iz, e, l, h, ix);
      iz = e;
    }
  }
  // The brook tumbles from the lake's channel down into the valley
  B.front('water', -45, -44, 1.07, TOWN_LAKE.y, -37.98);
}

// ── Building the town ────────────────────────────────

// Builds every still thing in the town, once. Returns the record that
// drawTown() keeps: the group, and the few parts that move or glow.
function _buildTown() {
  const T = {
    group: new THREE.Group(), font: PX.fonts.bold,
    signs: [], chimneys: [], lamps: [],
    clockHand: null, flag: null, balloons: [], sparkles: [], smoke: null,
    glow: -1,
  };
  const B = _townBatcher();
  const col = [];                    // plain coloured boxes -> one merged mesh
  const lit = [], shop = [], lampHeads = [], pools = [];
  const rnd = _townRand(42), litRnd = _townRand(7);
  const Y1 = TOWN.MAIN_Y, Y2 = TOWN.TRAIL_Y;

  // A plain coloured box from corner to corner
  const C = (x0, x1, y0, y1, z0, z1, c, list) => (list || col).push({
    x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, w: x1 - x0, h: y1 - y0, d: z1 - z0, c,
  });
  // A window on a wall whose face is at z: a white frame and a pane that
  // lights up at night. kind: 'home' (a few stay dark) or 'shop'.
  const win = (x0, x1, y0, y1, z, kind, frame) => {
    if (frame !== null) C(x0 - 0.07, x1 + 0.07, y0 - 0.07, y1 + 0.07, z, z + 0.04, frame || PAL.white);
    const list = kind === 'shop' ? shop : (litRnd() < 0.25 ? col : lit);
    C(x0, x1, y0, y1, z, z + 0.08, kind === 'shop' ? PAL.sk3 : PAL.sl2, list);
  };
  const ground = (x, z) => _townGround(Math.floor(x) + 0.5, Math.floor(z) + 0.5);

  // ── Trees ──
  // A round tree: a log post under a cube of leaves with a smaller cube on top
  const tree = (x, z, s, light, y) => {
    if (y === undefined) y = ground(x, z);
    const leaf = light ? 'leaves_light' : 'leaves';
    B.box('log', x - 0.2 * s, x + 0.2 * s, y, y + 1.0 * s, z - 0.2 * s, z + 0.2 * s);
    B.box(leaf, x - s, x + s, y + 1.0 * s, y + 2.2 * s, z - s, z + s);
    B.box(leaf, x - 0.5 * s, x + 0.5 * s, y + 2.2 * s, y + 2.7 * s, z - 0.5 * s, z + 0.5 * s);
  };
  // A pine: slabs of needles, each smaller than the one below
  const pine = (x, z, s, y) => {
    if (y === undefined) y = ground(x, z);
    B.box('log', x - 0.15 * s, x + 0.15 * s, y, y + 0.4 * s, z - 0.15 * s, z + 0.15 * s);
    const tiers = [0.9, 0.65, 0.4, 0.15];
    for (let i = 0; i < tiers.length; i++) {
      const r = tiers[i] * s, y0 = y + (0.4 + i * 0.55) * s;
      B.box('leaves_pine', x - r, x + r, y0, y0 + 0.55 * s, z - r, z + r);
    }
  };
  const bush = (x, z, y) => {
    if (y === undefined) y = ground(x, z);
    B.box('leaves_light', x - 0.5, x + 0.5, y, y + 0.6, z - 0.4, z + 0.4);
    B.box('leaves_light', x - 0.25, x + 0.25, y + 0.6, y + 0.85, z - 0.25, z + 0.25);
  };

  // ── Street furniture ──
  const lamp = (x, z, y) => {
    C(x - 0.07, x + 0.07, y, y + 1.9, z - 0.07, z + 0.07, PAL.g5);
    C(x - 0.2, x + 0.2, y + 2.2, y + 2.28, z - 0.2, z + 0.2, PAL.g5);
    C(x - 0.15, x + 0.15, y + 1.9, y + 2.2, z - 0.15, z + 0.15, PAL.ye1, lampHeads);
    // the pool of light it throws on the ground
    C(x - 1.4, x + 1.4, y + 0.09, y + 0.1, z - 0.3, z + 1.3, PAL.ye2, pools);
    C(x - 0.8, x + 0.8, y + 0.1, y + 0.11, z - 0.7, z + 1.7, PAL.ye2, pools);
  };
  // A road along x: asphalt between two sidewalks, with a dashed centre line
  const road = (y, z0, z1) => {
    B.box('asphalt', -72, 72, y, y + 0.06, z0, z1);
    B.box('pavement', -72, 72, y, y + 0.12, z1, z1 + 0.75);
    B.box('pavement', -72, 72, y, y + 0.12, z0 - 0.75, z0);
    const zc = (z0 + z1) / 2;
    for (let x = -71; x < 71; x += 2) C(x, x + 0.9, y + 0.06, y + 0.075, zc - 0.06, zc + 0.06, PAL.ye2);
  };
  const crosswalk = (x, y, z0, z1) => {
    for (let z = z0 + 0.2; z < z1 - 0.3; z += 0.6) C(x, x + 1.2, y + 0.06, y + 0.075, z, z + 0.3, PAL.g1);
  };
  const chimney = (x, z, y0, y1) => {
    B.box('brick', x - 0.25, x + 0.25, y0, y1, z - 0.25, z + 0.25);
    T.chimneys.push({ x, y: y1, z });
  };

  // ── Houses ──
  // A house seen gable-end on: square walls under a stepped triangle of
  // roof. (cx, zf) is the middle of its doorstep, y the ground.
  const house = (cx, zf, y, n) => {
    const st = TOWN_HOUSES[n], wall = 'town_wall' + n, roof = 'town_roof' + n;
    const w = 3.5, wh = 2, d = 3.5;
    B.box(wall, cx - w / 2, cx + w / 2, y, y + wh, zf - d, zf);
    for (let i = 0; i < 4; i++) {
      const hw = w / 2 + 0.25 - i * 0.5, y0 = y + wh + i * 0.4;
      B.box(roof, cx - hw, cx + hw, y0, y0 + 0.4, zf - d - 0.2, zf + 0.25);
      // the gable wall shows inside the roof's edge
      if (hw > 0.5) B.front(wall, cx - hw + 0.5, cx + hw - 0.5, y0, y0 + 0.4, zf + 0.26);
    }
    chimney(cx + 1.0, zf - 2.2, y + wh + 0.4, y + wh + 2.1);
    C(cx - 0.2, cx + 0.2, y + wh + 0.3, y + wh + 0.7, zf + 0.26, zf + 0.3, PAL.sl2);   // attic window
    win(cx - 1.4, cx - 0.8, y + 0.9, y + 1.5, zf);
    win(cx + 0.8, cx + 1.4, y + 0.9, y + 1.5, zf);
    C(cx - 0.3, cx + 0.3, y, y + 1.25, zf, zf + 0.06, st.door);
    C(cx - 0.5, cx + 0.5, y, y + 0.1, zf, zf + 0.35, PAL.g2);                           // doorstep
  };
  // A longer house seen from the side: a low roof running left to right
  const cottage = (cx, zf, y, n) => {
    const st = TOWN_HOUSES[n], wall = 'town_wall' + n, roof = 'town_roof' + n;
    const w = 5, wh = 1.75, d = 3.5;
    B.box(wall, cx - w / 2, cx + w / 2, y, y + wh, zf - d, zf);
    for (let i = 0; i < 3; i++) {
      const y0 = y + wh + i * 0.4;
      B.box(roof, cx - w / 2 - 0.25, cx + w / 2 + 0.25, y0, y0 + 0.4, zf - d - 0.25 + i * 0.65, zf + 0.25 - i * 0.65);
    }
    chimney(cx + 1.4, zf - 1.75, y + wh + 0.8, y + wh + 2.0);
    win(cx - 2.1, cx - 1.5, y + 0.75, y + 1.35, zf);
    win(cx + 0.5, cx + 1.1, y + 0.75, y + 1.35, zf);
    win(cx + 1.5, cx + 2.1, y + 0.75, y + 1.35, zf);
    C(cx - 0.9, cx - 0.3, y, y + 1.25, zf, zf + 0.06, st.door);
    C(cx - 1.1, cx - 0.1, y, y + 0.1, zf, zf + 0.35, PAL.g2);
  };
  // A far-away house on the upper terrace: walls, roof, one window
  const farHouse = (cx, zf, y, n) => {
    const st = TOWN_HOUSES[n], wall = 'town_wall' + n, roof = 'town_roof' + n;
    B.box(wall, cx - 1.25, cx + 1.25, y, y + 1.25, zf - 2.5, zf);
    for (let i = 0; i < 3; i++) {
      const hw = 1.5 - i * 0.5, y0 = y + 1.25 + i * 0.35;
      B.box(roof, cx - hw, cx + hw, y0, y0 + 0.35, zf - 2.7, zf + 0.2);
      if (hw > 0.5) B.front(wall, cx - hw + 0.4, cx + hw - 0.4, y0, y0 + 0.35, zf + 0.21);
    }
    win(cx - 0.9, cx - 0.4, y + 0.5, y + 1.0, zf, 'home', null);
    C(cx + 0.3, cx + 0.75, y, y + 0.9, zf, zf + 0.05, st.door);
  };

  // ── Shops ──
  // The painted board over a shop front: `bw` blocks wide, its bottom at y
  const sign = (id, x0, y, z, bw) => {
    const sp = TOWN_ART.SIGNS[id], bh = bw * sp.h / sp.w;
    const tex = G3.pixelTex(null, sp.w, sp.h, g => TOWN_ART.paintSign(g, sp));
    // It is lit from the front after dark, like a real shop sign
    const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), mat);
    m.position.set(x0 + bw / 2, y + bh / 2, z);
    T.group.add(m);
    T.signs.push({ sp, tex, mat });
    return bh;
  };

  // The Superette: cream shop, orange sign, red-and-white striped awning.
  const superette = (x0, zf, y) => {
    const w = 10;
    B.box('town_cream', x0, x0 + w, y, y + 3, zf - 4, zf);
    C(x0 - 0.1, x0 + w + 0.1, y + 3, y + 3.12, zf - 4, zf + 0.1, PAL.g4);                 // flat roof
    C(x0 - 0.05, x0 + w + 0.05, y + 1.5, y + 3.05, zf, zf + 0.14, PAL.or3);              // sign board
    sign('superette', x0, y + 1.52, zf + 0.15, w);
    win(x0 + 0.5, x0 + 2.4, y + 0.3, y + 1.2, zf, 'shop', PAL.cream);
    win(x0 + 2.6, x0 + 4.5, y + 0.3, y + 1.2, zf, 'shop', PAL.cream);
    win(x0 + 5.5, x0 + 7.4, y + 0.3, y + 1.2, zf, 'shop', PAL.cream);
    win(x0 + 7.6, x0 + 9.5, y + 0.3, y + 1.2, zf, 'shop', PAL.cream);
    C(x0 + 4.65, x0 + 5.35, y, y + 1.25, zf, zf + 0.06, PAL.wo3);                          // door
    C(x0, x0 + w, y, y + 0.22, zf, zf + 0.05, PAL.ta2);                                    // kick board
    // Awning: stripes half a block wide, with a lip hanging down in front
    for (let i = 0; i < w * 2; i++) {
      const c = i % 2 ? PAL.white : PAL.re2, xa = x0 + i * 0.5;
      C(xa, xa + 0.5, y + 1.36, y + 1.5, zf, zf + 0.7, c);
      C(xa, xa + 0.5, y + 1.2, y + 1.36, zf + 0.6, zf + 0.7, i % 2 ? PAL.g1 : PAL.re3);
    }
    // Utility pole beside the shop
    C(x0 + w + 0.6, x0 + w + 0.78, y, y + 3.6, zf - 0.4, zf - 0.22, PAL.wo3);
    C(x0 + w + 0.1, x0 + w + 1.3, y + 3.2, y + 3.32, zf - 0.4, zf - 0.22, PAL.wo4);
  };

  // Fiske's General Store: white shop, black sign with gold letters,
  // black awnings, a red door, and balloons tied up outside.
  const fiskes = (x0, zf, y) => {
    const w = 7.5;
    B.box('planks_white', x0, x0 + w, y, y + 3, zf - 4, zf);
    C(x0 - 0.1, x0 + w + 0.1, y + 3, y + 3.12, zf - 4, zf + 0.1, PAL.g4);
    C(x0 - 0.05, x0 + w + 0.05, y + 1.5, y + 3.05, zf, zf + 0.14, PAL.black);
    sign('fiskes', x0, y + 1.52, zf + 0.15, w);
    win(x0 + 0.5, x0 + 1.6, y + 0.3, y + 1.2, zf, 'shop');
    win(x0 + 1.8, x0 + 2.9, y + 0.3, y + 1.2, zf, 'shop');
    win(x0 + 4.6, x0 + 5.7, y + 0.3, y + 1.2, zf, 'shop');
    win(x0 + 5.9, x0 + 7.0, y + 0.3, y + 1.2, zf, 'shop');
    for (const xa of [x0 + 0.3, x0 + 4.4]) {                                               // black awnings
      C(xa, xa + 2.8, y + 1.34, y + 1.48, zf, zf + 0.6, PAL.black);
      C(xa, xa + 2.8, y + 1.22, y + 1.34, zf + 0.5, zf + 0.6, PAL.g5);
    }
    C(x0 + 3.35, x0 + 4.15, y, y + 1.4, zf, zf + 0.06, PAL.re2);                           // red door
    C(x0 + 3.5, x0 + 4.0, y + 0.85, y + 1.2, zf + 0.06, zf + 0.08, PAL.sl1);
    C(x0, x0 + w, y, y + 0.2, zf, zf + 0.05, PAL.g2);
    // Balloons bob on their strings just past the right-hand corner
    const bx = x0 + w + 0.5, bz = zf + 0.5;
    const cols = [PAL.re2, PAL.ye2, PAL.bl2];
    for (let i = 0; i < 3; i++) {
      const dx = (i - 1) * 0.42, top = y + 1.7 + (i === 1 ? 0.5 : 0);
      C(bx + dx * 0.5 - 0.02, bx + dx * 0.5 + 0.02, y, y + top - y, bz - 0.02, bz + 0.02, PAL.g1);
      const m = G3.box(0.4, 0.45, 0.4, G3.mat(cols[i]), bx + dx, top + 0.2, bz);
      m.castShadow = false;
      m.userData.y = top + 0.2;
      T.group.add(m);
      T.balloons.push(m);
    }
  };

  // CVS: white shop, red sign, glass front.
  const cvs = (x0, zf, y) => {
    const w = 4;
    B.box('white', x0, x0 + w, y, y + 3, zf - 4, zf);
    C(x0 - 0.1, x0 + w + 0.1, y + 3, y + 3.12, zf - 4, zf + 0.1, PAL.g4);
    C(x0 - 0.05, x0 + w + 0.05, y + 1.5, y + 3.05, zf, zf + 0.14, PAL.re2);
    sign('cvs', x0, y + 1.52, zf + 0.15, w);
    win(x0 + 0.35, x0 + 1.6, y + 0.25, y + 1.3, zf, 'shop');
    win(x0 + 2.4, x0 + 3.65, y + 0.25, y + 1.3, zf, 'shop');
    C(x0 + 1.7, x0 + 2.3, y, y + 1.3, zf, zf + 0.06, PAL.g4);                              // sliding door
    C(x0 + 1.98, x0 + 2.02, y, y + 1.3, zf + 0.06, zf + 0.07, PAL.g2);
    C(x0, x0 + w, y, y + 0.16, zf, zf + 0.05, PAL.g2);
  };

  // ── Landmarks ──
  // Town Hall: slate-blue colonial hall with a white pediment, tall
  // windows, two chimneys, a clock tower and a flagpole on its lawn.
  const townHall = (cx, zf, y) => {
    const w = 7.5, h = 2.75, x0 = cx - w / 2;
    B.box('town_slate', x0, x0 + w, y, y + h, zf - 4, zf);
    C(x0 - 0.04, x0 + 0.22, y, y + h, zf - 0.1, zf + 0.05, PAL.white);                     // corner boards
    C(x0 + w - 0.22, x0 + w + 0.04, y, y + h, zf - 0.1, zf + 0.05, PAL.white);
    C(x0 + 0.22, x0 + w - 0.22, y + 1.32, y + 1.42, zf, zf + 0.04, PAL.sl2);               // floor line
    for (const dx of [-2.4, 0, 2.4]) {                                                     // tall upper windows
      win(cx + dx - 0.3, cx + dx + 0.3, y + 1.65, y + 2.3, zf);
      C(cx + dx - 0.15, cx + dx + 0.15, y + 2.3, y + 2.45, zf, zf + 0.08, PAL.sl2, lit);
    }
    win(cx - 2.75, cx - 2.05, y + 0.45, y + 1.1, zf);
    win(cx + 2.05, cx + 2.75, y + 0.45, y + 1.1, zf);
    C(cx - 0.4, cx + 0.4, y, y + 1.1, zf, zf + 0.06, PAL.wo4);                              // door with a round top
    C(cx - 0.2, cx + 0.2, y + 1.1, y + 1.25, zf, zf + 0.06, PAL.wo4);
    C(cx + 0.2, cx + 0.3, y + 0.5, y + 0.6, zf + 0.06, zf + 0.09, PAL.ye2);
    C(x0 - 0.3, x0 + w + 0.3, y, y + 0.14, zf, zf + 0.6, PAL.g2);                           // steps
    C(cx - 0.9, cx + 0.9, y + 0.14, y + 0.26, zf, zf + 0.4, PAL.g1);
    // Cornice and stepped pediment, white with a slate-blue middle
    C(x0 - 0.25, x0 + w + 0.25, y + h, y + h + 0.2, zf - 4.1, zf + 0.25, PAL.white);
    for (let i = 0; i < 3; i++) {
      const hw = w / 2 - i * 1.2, y0 = y + h + 0.2 + i * 0.3;
      C(cx - hw, cx + hw, y0, y0 + 0.3, zf - 4, zf + 0.2, PAL.white);
      if (i < 2) B.front('town_slate', cx - hw + 0.6, cx + hw - 0.6, y0, y0 + 0.3, zf + 0.21);
    }
    C(cx - 0.2, cx + 0.2, y + h + 0.3, y + h + 0.7, zf + 0.21, zf + 0.25, PAL.sl3);         // round gable window
    chimney(x0 + 0.8, zf - 2.5, y + h + 0.2, y + h + 1.5);
    chimney(x0 + w - 0.8, zf - 2.5, y + h + 0.2, y + h + 1.5);
    // Clock tower on the ridge
    const ty = y + h + 0.8, tz = zf - 1.1;
    B.box('town_slate', cx - 0.85, cx + 0.85, ty, ty + 1.6, tz - 0.85, tz + 0.85);
    C(cx - 0.9, cx - 0.7, ty, ty + 1.6, tz + 0.7, tz + 0.9, PAL.white);
    C(cx + 0.7, cx + 0.9, ty, ty + 1.6, tz + 0.7, tz + 0.9, PAL.white);
    const tiers = [1.1, 0.8, 0.5, 0.22];
    for (let i = 0; i < tiers.length; i++) {
      B.box('town_slate_roof', cx - tiers[i], cx + tiers[i], ty + 1.6 + i * 0.25, ty + 1.85 + i * 0.25, tz - tiers[i], tz + tiers[i]);
    }
    C(cx - 0.06, cx + 0.06, ty + 2.6, ty + 2.95, tz - 0.06, tz + 0.06, PAL.ye3);
    // The clock: a pale face that glows after dark, and one hand
    const face = G3.box(1.1, 1.1, 0.06, T.clockMat = new THREE.MeshLambertMaterial({ color: PAL.white, emissive: PAL.ye1, emissiveIntensity: 0 }), cx, ty + 0.8, tz + 0.88);
    face.castShadow = false;
    T.group.add(face);
    for (const [dx, dy] of [[0, 0.45], [0.45, 0], [0, -0.45], [-0.45, 0]]) {
      C(cx + dx - 0.05, cx + dx + 0.05, ty + 0.8 + dy - 0.05, ty + 0.8 + dy + 0.05, tz + 0.91, tz + 0.93, PAL.sl3);
    }
    T.clockHand = new THREE.Group();
    T.clockHand.position.set(cx, ty + 0.8, tz + 0.94);
    const hand = G3.box(0.14, 0.46, 0.04, G3.mat(PAL.ink), 0, 0.19, 0);
    const hub = G3.box(0.2, 0.2, 0.05, G3.mat(PAL.ink), 0, 0, 0);
    hand.castShadow = hub.castShadow = false;
    T.clockHand.add(hand, hub);
    T.group.add(T.clockHand);
    // Flagpole on the lawn to the left
    const px = x0 - 1.2, pz = zf + 0.9;
    C(px - 0.06, px + 0.06, y, y + 5.2, pz - 0.06, pz + 0.06, PAL.g3);
    C(px - 0.1, px + 0.1, y + 5.2, y + 5.4, pz - 0.1, pz + 0.1, PAL.ye3);
    const ftex = G3.pixelTex('town_flag', 11, 7, g => TOWN_ART.paintFlag(g));
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), G3.texMat(ftex, { side: THREE.DoubleSide }));
    flag.position.set(0.7, 0, 0);
    T.flag = new THREE.Group();
    T.flag.position.set(px + 0.06, y + 4.7, pz);
    T.flag.add(flag);
    T.group.add(T.flag);
  };

  // The white church: columns, pediment, bell tower, stepped steeple, gold cross
  const church = (cx, zf, y) => {
    const w = 4.5, h = 2.75, x0 = cx - w / 2;
    B.box('white', x0, x0 + w, y, y + h, zf - 4.5, zf - 0.4);                               // the wall behind the columns
    for (const dx of [0, 1.35, 2.7, 4.05]) C(x0 + dx, x0 + dx + 0.45, y + 0.14, y + h - 0.35, zf - 0.4, zf, PAL.white);
    win(x0 + 0.7, x0 + 1.1, y + 0.8, y + 1.7, zf - 0.4, 'home', null);                      // tall windows
    C(x0 + 0.8, x0 + 1.0, y + 1.7, y + 1.85, zf - 0.4, zf - 0.32, PAL.sl2, lit);
    win(x0 + 3.4, x0 + 3.8, y + 0.8, y + 1.7, zf - 0.4, 'home', null);
    C(x0 + 3.5, x0 + 3.7, y + 1.7, y + 1.85, zf - 0.4, zf - 0.32, PAL.sl2, lit);
    C(cx - 0.4, cx + 0.4, y + 0.14, y + 1.3, zf - 0.4, zf - 0.33, PAL.wo3);                 // door
    C(cx - 0.2, cx + 0.2, y + 1.3, y + 1.45, zf - 0.4, zf - 0.33, PAL.wo3);
    C(x0 - 0.3, x0 + w + 0.3, y, y + 0.14, zf - 0.5, zf + 0.5, PAL.g2);                     // steps
    // Entablature and stepped pediment
    C(x0 - 0.2, x0 + w + 0.2, y + h - 0.35, y + h, zf - 4.6, zf + 0.15, PAL.white);
    C(x0 - 0.2, x0 + w + 0.2, y + h - 0.42, y + h - 0.35, zf, zf + 0.15, PAL.g2);
    for (let i = 0; i < 3; i++) {
      const hw = w / 2 + 0.2 - i * 0.8;
      C(cx - hw, cx + hw, y + h + i * 0.3, y + h + (i + 1) * 0.3, zf - 4.6, zf + 0.15, i ? PAL.white : PAL.g1);
    }
    C(cx - 0.15, cx + 0.15, y + h + 0.3, y + h + 0.6, zf + 0.15, zf + 0.18, PAL.sl2);
    // Tower, belfry and steeple
    const tz = zf - 1.5;
    let ty = y + h + 0.3;
    B.box('white', cx - 0.9, cx + 0.9, ty, ty + 1.7, tz - 0.9, tz + 0.9);
    C(cx - 0.15, cx + 0.15, ty + 0.9, ty + 1.3, tz + 0.9, tz + 0.94, PAL.sl2);
    ty += 1.7;
    C(cx - 1.05, cx + 1.05, ty, ty + 0.14, tz - 1.05, tz + 1.05, PAL.g1);
    B.box('white', cx - 0.65, cx + 0.65, ty + 0.14, ty + 1.2, tz - 0.65, tz + 0.65);
    C(cx - 0.3, cx + 0.3, ty + 0.3, ty + 0.95, tz + 0.65, tz + 0.69, PAL.g4);               // louvres over the bell
    C(cx - 0.15, cx + 0.15, ty + 0.95, ty + 1.08, tz + 0.65, tz + 0.69, PAL.g4);
    ty += 1.2;
    C(cx - 0.8, cx + 0.8, ty, ty + 0.12, tz - 0.8, tz + 0.8, PAL.g1);
    const spire = [0.55, 0.42, 0.3, 0.18];
    for (let i = 0; i < spire.length; i++) {
      C(cx - spire[i], cx + spire[i], ty + 0.12 + i * 0.45, ty + 0.57 + i * 0.45, tz - spire[i], tz + spire[i], i % 2 ? PAL.white : PAL.g1);
    }
    ty += 0.12 + spire.length * 0.45;
    C(cx - 0.05, cx + 0.05, ty, ty + 0.65, tz - 0.05, tz + 0.05, PAL.ye3);                  // cross
    C(cx - 0.22, cx + 0.22, ty + 0.36, ty + 0.46, tz - 0.05, tz + 0.05, PAL.ye3);
  };

  // ════════════════════════════════════════════════════
  //  The land
  // ════════════════════════════════════════════════════
  _townTerrain(B);

  // Roads: the front street on the flat, Main Street on its terrace, and
  // a side street that climbs the bank between them, right of the school.
  road(TOWN.FRONT_Y, TOWN.FRONT_Z0, TOWN.FRONT_Z1);
  road(Y1, TOWN.MAIN_Z0, TOWN.MAIN_Z1);
  B.box('asphalt', 26.5, 28.5, 0, 0.06, -17, TOWN.FRONT_Z0);
  B.box('asphalt', 26.5, 28.5, 1, 1.06, -18, -17);
  B.box('asphalt', 26.5, 28.5, 2, 2.06, TOWN.MAIN_Z1, -18);
  crosswalk(-20.6, TOWN.FRONT_Y, TOWN.FRONT_Z0, TOWN.FRONT_Z1);
  crosswalk(24.8, TOWN.FRONT_Y, TOWN.FRONT_Z0, TOWN.FRONT_Z1);
  crosswalk(-36.6, Y1, TOWN.MAIN_Z0, TOWN.MAIN_Z1);
  crosswalk(28.8, Y1, TOWN.MAIN_Z0, TOWN.MAIN_Z1);

  // The rail trail: stone dust along the upper terrace, turning into the
  // tunnel at its right-hand end.
  const tz0 = TOWN.TRAIL_Z0, tz1 = TOWN.TRAIL_Z1, tx = TOWN.TUNNEL_X;
  B.box('town_trail', -72, -51, Y2, Y2 + 0.05, tz0, tz1);
  B.box('town_trail', -40, tx + 0.75, Y2, Y2 + 0.05, tz0, tz1);
  B.box('town_trail', tx - 0.75, tx + 0.75, Y2, Y2 + 0.05, -37, tz0);

  // The stone bridge that carries the trail over the brook: four openings
  // with stepped corners, and a low wall either side of the deck.
  {
    const xa = -51.375, pier = 0.75, gap = 2, n = 4, xb = xa + n * gap + (n + 1) * pier;
    B.box({ top: 'town_trail', side: 'cobble' }, xa, xb, Y2 - 0.5, Y2 + 0.05, tz0 - 0.25, tz1 + 0.25);
    B.box('stone', xa, xb, Y2 + 0.05, Y2 + 0.45, tz1, tz1 + 0.25);
    B.box('stone', xa, xb, Y2 + 0.05, Y2 + 0.45, tz0 - 0.25, tz0);
    for (let i = 0; i <= n; i++) {
      const px = xa + i * (gap + pier);
      B.box('cobble', px, px + pier, 1, Y2 - 0.5, tz0 - 0.15, tz1 + 0.15);
      if (i < n) {
        B.box('cobble', px + pier, px + pier + 0.4, Y2 - 0.9, Y2 - 0.5, tz0 - 0.15, tz1 + 0.15);
        B.box('cobble', px + pier + gap - 0.4, px + pier + gap, Y2 - 0.9, Y2 - 0.5, tz0 - 0.15, tz1 + 0.15);
        C(px + pier, px + pier + gap, 1.1, Y2 - 0.5, tz0, tz0 + 0.1, PAL.fo5);           // the shade under the arch
      }
    }
    bush(xa - 0.8, tz1 + 0.6, Y2);
    bush(xb + 0.8, tz1 + 0.6, Y2);
  }

  // The tunnel mouth in the hillock, and the green RAIL TRAIL sign over it
  {
    const zf = -37;
    B.box('cobble', tx - 1.3, tx - 0.75, Y2, Y2 + 2, zf, zf + 0.25);
    B.box('cobble', tx + 0.75, tx + 1.3, Y2, Y2 + 2, zf, zf + 0.25);
    B.box('cobble', tx - 1.3, tx + 1.3, Y2 + 2, Y2 + 2.5, zf, zf + 0.25);
    B.box('cobble', tx - 0.75, tx - 0.45, Y2 + 1.7, Y2 + 2, zf, zf + 0.25);
    B.box('cobble', tx + 0.45, tx + 0.75, Y2 + 1.7, Y2 + 2, zf, zf + 0.25);
    C(tx - 0.15, tx + 0.15, Y2 + 2.1, Y2 + 2.5, zf + 0.25, zf + 0.29, PAL.g1);           // keystone
    C(tx - 0.75, tx + 0.75, Y2, Y2 + 2, zf + 0.02, zf + 0.05, PAL.black);                // the dark inside
    B.box('leaves_light', tx - 1.4, tx - 0.5, Y2 + 2.5, Y2 + 2.75, zf - 0.2, zf + 0.35); // vines
    B.box('leaves_light', tx + 0.7, tx + 1.5, Y2 + 2.5, Y2 + 2.75, zf - 0.2, zf + 0.35);
    B.box('leaves_light', tx - 1.4, tx - 1.15, Y2 + 2.0, Y2 + 2.5, zf + 0.25, zf + 0.35);
    const sp = TOWN_ART.SIGNS.trail, bw = 6.6, bh = bw * sp.h / sp.w, sy = Y2 + 2.75;
    C(tx - bw / 2 + 0.4, tx - bw / 2 + 0.6, Y2, sy + bh, zf + 0.5, zf + 0.7, PAL.wo3);   // posts
    C(tx + bw / 2 - 0.6, tx + bw / 2 - 0.4, Y2, sy + bh, zf + 0.5, zf + 0.7, PAL.wo3);
    C(tx - bw / 2, tx + bw / 2, sy, sy + bh, zf + 0.7, zf + 0.8, PAL.gr5);
    sign('trail', tx - bw / 2, sy, zf + 0.81, bw);
  }

  // Lake Winthrop's beach and reeds
  B.box('sand', -53, -49, Y2, Y2 + 0.04, -40, -39.3);
  for (const [rx, rz, rh] of [[-43.6, -42.5, 0.7], [-43.3, -43.2, 0.5], [-43.9, -43.6, 0.6], [-44.4, -44.6, 0.5]]) {
    C(rx, rx + 0.12, TOWN_LAKE.y, TOWN_LAKE.y + rh, rz, rz + 0.12, PAL.gr4);
  }

  // Fields on the upper terrace: hay, and a green crop, in rows
  const field = (x0, x1, z0, z1, a, b) => {
    let i = 0;
    for (let z = z0; z < z1 - 0.01; z += 0.75, i++) C(x0 + (i === 0 ? 0.5 : 0), x1 - (i === 0 ? 0.5 : 0), Y2 + 0.02, Y2 + 0.1, z, z + 0.75, i % 2 ? a : b);
  };
  field(3, 12, -46.5, -42, PAL.ye1, PAL.ta2);
  field(-21, -13, -46.25, -42.5, PAL.gr2, PAL.gr3);

  // ════════════════════════════════════════════════════
  //  The buildings
  // ════════════════════════════════════════════════════
  // Front row, left: Fiske's and CVS
  fiskes(-34, -12.5, 0);
  cvs(-25, -12.5, 0);
  tree(-20.2, -14.5, 1, true, 0);
  lamp(-34.6, -11.5, 0);
  lamp(-19.6, -11.5, 0);

  // Front row, right: the church and a cottage either side of the side street
  church(22.75, -12.5, 0);
  cottage(32, -12.5, 0, 0);
  pine(35.8, -13.5, 1.2, 0);
  tree(37.5, -15, 1, false, 0);
  bush(29, -12.2, 0);
  lamp(25.9, -11.5, 0);
  lamp(34.6, -11.5, 0);

  // Main Street, left: the Superette
  superette(-34.5, -26, Y1);
  tree(-37, -28, 1, false, Y1);
  pine(-36.2, -26.8, 1, Y1);
  bush(-39, -27, Y1);
  lamp(-36, -25.5, Y1);
  lamp(-23, -25.5, Y1);

  // Main Street, behind the school: houses whose roofs peep over it
  cottage(-17, -26, Y1, 0);
  tree(-12.5, -28, 1, true, Y1);
  house(-8, -26, Y1, 4);
  pine(-4, -27.5, 1.2, Y1);
  cottage(2.5, -26, Y1, 3);
  tree(7.5, -28, 1, false, Y1);
  house(12, -26, Y1, 6);
  pine(16, -27.5, 1.2, Y1);
  house(20, -26, Y1, 1);
  tree(24, -28.5, 1, true, Y1);

  // Main Street, right: Town Hall (nothing tall beyond it, so that the
  // tunnel mouth shows)
  townHall(34.25, -26, Y1);
  tree(27.5, -29, 1, false, Y1);
  bush(40.5, -27, Y1);
  bush(43.5, -28.5, Y1);
  lamp(29.6, -25.5, Y1);
  lamp(39.4, -25.5, Y1);

  // The upper terrace: far houses among the trees
  const far = [[-36, 6], [-27, 1], [-12, 2], [1, 5], [14, 0], [25, 4], [38, 3]];
  for (const [fx, n] of far) farHouse(fx, -39, Y2, n);

  // ════════════════════════════════════════════════════
  //  The woods
  // ════════════════════════════════════════════════════
  // Trees scattered over the upper terrace and the ridge: smaller and
  // closer together the further back they stand.
  const o = {};
  for (let i = 0; i < 200; i++) {
    const x = Math.round((rnd() * 140 - 70) * 2) / 2, z = Math.round((-37.5 - rnd() * 9.5) * 2) / 2;
    const kind = rnd(), s0 = rnd();
    _townGround(Math.floor(x) + 0.5, Math.floor(z) + 0.5, o);
    if (o.water) continue;
    if (x > -60 && x < -41 && z > -47) continue;                          // keep the lake shore open
    if (x > -52 && x < -39 && z > -39) continue;                          // and the valley
    if (Math.abs(x - TOWN.TUNNEL_X) < 5.5 && z > -43.5) continue;               // the tunnel hillock
    if (x > 2 && x < 13 && z > -47.5 && z < -41) continue;                  // the fields
    if (x > -22 && x < -12 && z > -47.5 && z < -41.5) continue;
    if (z > -42.5 && far.some(f => Math.abs(f[0] - x) < 2.6)) continue;     // the far houses
    // the ground must be level under the tree
    if (ground(x - 0.6, z) !== o.h || ground(x + 0.6, z) !== o.h || ground(x, z + 0.6) !== o.h) continue;
    const back = z < -43, s = (back ? 0.7 : 0.8) + s0 * 0.2;
    if (kind < 0.42) pine(x, z, s * 1.15, o.h);
    else tree(x, z, s, kind > 0.72, o.h);
  }
  // A few on top of the tunnel's hillock
  pine(tx - 0.8, -39.5, 0.9, 6);
  tree(tx + 2.6, -40.5, 0.8, true, 5);
  bush(tx - 2.4, -38.4, 5);

  // ════════════════════════════════════════════════════
  //  Baking: one mesh per texture, and a few special ones
  // ════════════════════════════════════════════════════
  B.bake(T.group);
  const special = (boxes, mat) => {
    const m = TOWN_ART.merged(boxes);
    if (mat) m.material = mat;
    m.castShadow = false;
    T.group.add(m);
    return m;
  };
  special(col);
  // Windows and lamps glow after dark; drawTown() turns them up and down
  T.litMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: PAL.ye2, emissiveIntensity: 0 });
  T.shopMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: PAL.ye1, emissiveIntensity: 0 });
  T.lampMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: PAL.ye1, emissiveIntensity: 0 });
  T.poolMat = new THREE.MeshBasicMaterial({ color: PAL.ye2, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  special(lit, T.litMat);
  special(shop, T.shopMat);
  special(lampHeads, T.lampMat);
  T.pools = special(pools, T.poolMat);
  T.pools.receiveShadow = false;
  T.pools.visible = false;

  // Chimney smoke: three puffs per chimney, all in one instanced mesh
  T.smokeMat = new THREE.MeshLambertMaterial({ color: PAL.g1, transparent: true, opacity: 0.75 });
  T.smoke = new THREE.InstancedMesh(G3.geo(0.3, 0.3, 0.3), T.smokeMat, T.chimneys.length * 3);
  T.smoke.castShadow = false; T.smoke.receiveShadow = false;
  T.smoke.frustumCulled = false;
  T.group.add(T.smoke);

  // Sparkles that hop about on the lake
  T.sparkMat = G3.mat(PAL.wa1);
  for (let i = 0; i < 4; i++) {
    const m = G3.box(0.9, 0.03, 0.18, T.sparkMat, 0, TOWN_LAKE.y + 0.03, 0);
    m.castShadow = false; m.receiveShadow = false;
    T.group.add(m);
    T.sparkles.push(m);
  }

  // Headlights: one lamp bar and one beam shape shared by every car
  T.headMat = G3.mat(PAL.ye1, { basic: true });
  T.beamMat = new THREE.MeshBasicMaterial({ color: PAL.ye1, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending });

  // Nothing in the still town ever moves again
  T.group.traverse(m => { if (m !== T.clockHand && m !== T.flag && m.parent !== T.clockHand && !T.balloons.includes(m) && !T.sparkles.includes(m)) { m.updateMatrix(); m.matrixAutoUpdate = false; } });
  T.group.matrixAutoUpdate = true;
  G3.scene.add(T.group);
  T.movers = new THREE.Group();
  G3.scene.add(T.movers);
  _townBuildMovers(T);
  return T;
}

// Gives every car, bus, walker and cyclist its little box model.
function _townBuildMovers(T) {
  const noShadow = (m) => { m.castShadow = false; return m; };
  for (const car of _bgCars.concat(_bgCars2)) {
    const g = new THREE.Group(), len = car.bus ? 4.2 : 2.4;
    g.add(noShadow(car.bus ? TOWN_ART.bus(car.pal) : TOWN_ART.car(car.pal)));
    // At night: bright lamps, and a short beam on the road ahead
    const lamps = noShadow(G3.box(0.08, 0.2, car.bus ? 1.0 : 0.86, T.headMat, len / 2 + 0.03, 0.53, 0));
    const beam = noShadow(G3.box(2.2, 0.02, 1.1, T.beamMat, len / 2 + 1.2, 0.03, 0));
    lamps.receiveShadow = beam.receiveShadow = false;
    g.add(lamps, beam);
    car.m = g; car.lamps = lamps; car.beam = beam;
    T.movers.add(g);
  }
  for (const w of _bgWalkers.concat(_bgWalkers2, _bgTrailWalkers)) {
    const g = new THREE.Group();
    w.stand = noShadow(TOWN_ART.walker(w.pal, false));
    w.stride = noShadow(TOWN_ART.walker(w.pal, true));
    g.add(w.stand, w.stride);
    w.m = g;
    T.movers.add(g);
  }
  for (const b of _bgBikers) {
    const g = new THREE.Group();
    b.f0 = noShadow(TOWN_ART.biker(b.pal, 0));
    b.f1 = noShadow(TOWN_ART.biker(b.pal, 1));
    g.add(b.f0, b.f1);
    b.m = g;
    T.movers.add(g);
  }
}

// ══════════════════════════════════════════════════════
//  drawTown()  — the single entry point
// ══════════════════════════════════════════════════════

// Builds the town the first time, then only moves the traffic, walkers,
// cyclists, smoke and other small things and sets the night lights.
function drawTown() {
  try {
    if (!_bgCars) _initBgElements();
    if (!_town) _town = _buildTown();
    const T = _town;

    // The signs are painted with the pixel font: repaint them once it has loaded
    if (T.font !== PX.fonts.bold) {
      T.font = PX.fonts.bold;
      for (const s of T.signs) {
        TOWN_ART.paintSign(s.tex.image.getContext('2d'), s.sp);
        s.tex.needsUpdate = true;
      }
    }

    // Rail trail: walkers on the far side, bikes on the near side
    _updateDrawBgWalkers(_bgTrailWalkers, TOWN.TRAIL_Y + 0.05, TOWN.TRAIL_Z0 + 0.4, TOWN.TRAIL_SPAN, TOWN.TUNNEL_X);
    _updateDrawBgBikers(_bgBikers, TOWN.TRAIL_Y + 0.05, TOWN.TRAIL_Z1 - 0.45, TOWN.TRAIL_SPAN, TOWN.TUNNEL_X);

    // Main Street: traffic, and people on the near sidewalk
    _updateDrawBgCars(_bgCars2, TOWN.MAIN_Y + 0.06, TOWN.MAIN_Z0 + 0.62, TOWN.MAIN_Z1 - 0.62, TOWN.MAIN_SPAN);
    _updateDrawBgWalkers(_bgWalkers2, TOWN.MAIN_Y + 0.12, TOWN.MAIN_Z1 + 0.4, TOWN.MAIN_SPAN);

    // Front street: people on the far sidewalk, in front of the shops
    _updateDrawBgWalkers(_bgWalkers, TOWN.FRONT_Y + 0.12, TOWN.FRONT_Z0 - 0.4, TOWN.FRONT_SPAN);
    _updateDrawBgCars(_bgCars, TOWN.FRONT_Y + 0.06, TOWN.FRONT_Z0 + 0.62, TOWN.FRONT_Z1 - 0.62, TOWN.FRONT_SPAN);

    _drawTownExtras(T);
    _drawTownLights(T);
  } catch (e) {
    console.error('Town drawing error:', e);
  }
}
drawTown.g3 = true;

// ── Small moving details ─────────────────────────────

// Chimney smoke, lake sparkles, Fiske's balloons, the Town Hall flag and clock
const _townM4 = (typeof THREE !== 'undefined') ? new THREE.Matrix4() : null;
function _drawTownExtras(T) {
  const tick = G3.frame;
  // Smoke: three puffs per chimney climbing, growing and leaning with the wind
  for (let n = 0; n < T.chimneys.length; n++) {
    const ch = T.chimneys[n];
    for (let i = 0; i < 3; i++) {
      const p = ((tick + n * 37) / 150 + i / 3) % 1;
      const s = (0.6 + p * 1.1) * (p > 0.85 ? (1 - p) / 0.15 : 1);
      _townM4.makeScale(s, s, s).setPosition(
        ch.x + Math.sin(p * 5 + n) * 0.15 + windX * p * 1.2, ch.y + 0.15 + p * 2.2, ch.z);
      T.smoke.setMatrixAt(n * 3 + i, _townM4);
    }
  }
  T.smoke.instanceMatrix.needsUpdate = true;

  // Sparkles drifting across Lake Winthrop: each shows for a while, then
  // jumps to a new spot
  for (let i = 0; i < T.sparkles.length; i++) {
    const step = Math.floor((tick + i * 23) / 46), m = T.sparkles[i];
    m.visible = (step + i) % 3 !== 0;
    if (!m.visible) continue;
    m.position.x = -56 + ((step * 17 + i * 29) % 11);
    m.position.z = -44.5 + ((step + i * 2) % 4);
    m.scale.x = Math.floor(tick / 23 + i) % 2 ? 1 : 0.6;
  }

  // Balloons bobbing on their strings outside Fiske's
  for (let i = 0; i < T.balloons.length; i++) {
    const b = T.balloons[i];
    b.position.y = b.userData.y + (Math.floor((tick + i * 19) / 34) % 2 ? 0.06 : 0);
  }

  // The flag flaps in two frames, like a flip-book
  if (T.flag) {
    const f = Math.floor(tick / 26) % 2;
    T.flag.scale.x = f ? 0.86 : 1;
    T.flag.rotation.y = (f ? 0.5 : 0.15) * (windX < 0 ? -1 : 1);
  }

  // The Town Hall clock's single hand follows the garden's day (dawn is about 6 o'clock)
  if (T.clockHand) T.clockHand.rotation.z = -((5 + timeOfDay * 23) % 12) / 12 * TWO_PI;
}

// Night lights: windows, shop signs, street lamps and headlights all
// brighten together as it gets dark. They are real parts of the block
// world, so the school and the trees hide them as they should.
function _drawTownLights(T) {
  const glow = Math.max(0, Math.min(1, (G3.night - 0.2) / 0.4));
  if (glow === T.glow) return;
  T.glow = glow;
  T.litMat.emissiveIntensity = glow * 0.85;
  T.shopMat.emissiveIntensity = glow * 0.95;
  T.lampMat.emissiveIntensity = glow;
  T.clockMat.emissiveIntensity = glow * 0.7;
  T.poolMat.opacity = glow * 0.22;
  T.pools.visible = glow > 0;
  for (const s of T.signs) s.mat.emissiveIntensity = glow * (s.sp === TOWN_ART.SIGNS.trail ? 0.25 : 0.6);
  T.beamMat.opacity = glow * 0.3;
  for (const car of _bgCars) { car.lamps.visible = car.beam.visible = glow > 0; }
  for (const car of _bgCars2) { car.lamps.visible = car.beam.visible = glow > 0; }
}

// ── Vehicle & pedestrian animation ───────────────────

// Update positions and pose cars/buses on a road, wrapping at the ends.
// Traffic keeps right: cars heading left use the far lane (zFar), cars
// heading right use the near lane (zNear).
function _updateDrawBgCars(carArr, y, zFar, zNear, span) {
  for (let car of carArr) {
    car.x += car.speed * car.dir;
    if (car.dir > 0 && car.x > width + 50) car.x = -50;
    if (car.dir < 0 && car.x < -50)        car.x = width + 50;
    // The square wheels make for a slightly bumpy ride
    const bump = (Math.floor(car.x / 6) & 1) ? 0.03 : 0;
    car.m.position.set((car.x / width - 0.5) * span, y + bump, car.dir > 0 ? zNear : zFar);
    car.m.rotation.y = car.dir > 0 ? 0 : Math.PI;
  }
}

// Where something that has come `x` blocks along the rail trail is: on the
// trail, or (past the bend) heading into the tunnel. Returns false once it
// is out of sight inside the hill.
function _townTrailPose(m, x, y, z, dir, tunnelX) {
  if (tunnelX === undefined || x <= tunnelX) {
    m.position.set(x, y, z);
    m.rotation.y = dir > 0 ? 0 : Math.PI;
    return true;
  }
  const into = x - tunnelX;
  m.position.set(tunnelX + (z - (TOWN.TRAIL_Z0 + TOWN.TRAIL_Z1) / 2) * 0.6, y, TOWN.TRAIL_Z0 + 0.5 - into);
  m.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  return into < 3.2;
}

// Update positions and pose walking pedestrians with a two-frame stride.
// tunnelX (optional) is where the trail turns into the tunnel.
function _updateDrawBgWalkers(walkerArr, y, z, span, tunnelX) {
  for (let w of walkerArr) {
    w.x += w.speed * w.dir;
    w.phase += 0.12;
    if (w.dir > 0 && w.x > width + 20) w.x = -20;
    if (w.dir < 0 && w.x < -20)        w.x = width + 20;

    w.m.visible = _townTrailPose(w.m, (w.x / width - 0.5) * span, y, z, w.dir, tunnelX);
    const stride = Math.sin(w.phase) <= 0;
    w.stand.visible = !stride;
    w.stride.visible = stride;
  }
}

// Update positions and pose cyclists pedalling along the rail trail
function _updateDrawBgBikers(bikerArr, y, z, span, tunnelX) {
  for (let b of bikerArr) {
    b.x += b.speed * b.dir;
    b.phase += 0.16;
    if (b.dir > 0 && b.x > width + 30) b.x = -30;
    if (b.dir < 0 && b.x < -30)        b.x = width + 30;

    b.m.visible = _townTrailPose(b.m, (b.x / width - 0.5) * span, y, z, b.dir, tunnelX);
    const f = Math.sin(b.phase * 2) > 0;
    b.f0.visible = f;
    b.f1.visible = !f;
  }
}
