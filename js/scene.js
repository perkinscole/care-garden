// ================================================================
// File: scene.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 23, 2026
// Description: Block-built scenery for the 3D CARE Garden: the lawn and
//              its swaying grass tufts, the trees, the picket fence,
//              Robert Adams Middle School with its waving flag and
//              night-lit windows, the fireflies, and the school's I SPY
//              card picture. Everything is made of boxes with G3 (see
//              docs/GARDEN_3D.md): each piece is built once, baked into
//              as few meshes as possible, and only posed after that.
//              Also holds skyStops(), the colours of the sky.
// ================================================================

// Repeatable "random" number 0..1 for a pair of whole numbers. Scenery uses
// this instead of random() so that it is identical every time it is painted.
function sceneHash(a, b) {
  let n = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// Splits '#rrggbb' into [r, g, b]
function sceneRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// The wash sketch.js lays over the garden at full night, read from
// TINT_KEYFRAMES: { col: '#rrggbb', a: strength }. Things drawn after the
// tint (town walkers under the lights, birds) are dimmed with this so they
// match everything around them, whatever the keyframes are set to.
function sceneNightTint() {
  const hex = v => Math.round(constrain(v, 0, 255)).toString(16).padStart(2, '0');
  return {
    col: '#' + hex(lerpKeyframes(TINT_KEYFRAMES, 0.9, 'r')) + hex(lerpKeyframes(TINT_KEYFRAMES, 0.9, 'g')) +
               hex(lerpKeyframes(TINT_KEYFRAMES, 0.9, 'b')),
    a: lerpKeyframes(TINT_KEYFRAMES, 0.9, 'a'),
  };
}

// ── Sky ───────────────────────────────────────────────

// 0 → 1, held at 1 from b to c, → 0 as x goes from a to d
function scenePlateau(x, a, b, c, d) {
  if (x <= a || x >= d) return 0;
  if (x < b) return (x - a) / (b - a);
  if (x > c) return (d - x) / (d - c);
  return 1;
}

// The colours of a sunrise or sunset, from high in the sky down to the horizon
const SUNSET_SKY = [PAL.pu4, PAL.pu3, PAL.pi3, PAL.or2, PAL.or1, PAL.ye2, PAL.ye1];

// Colour stops for the dithered sky gradient, top of the sky to the horizon.
// By day the sky is a deeper blue overhead and pale toward the horizon; at
// dawn and at sunset it runs from violet through pink and orange to gold.
// The whole fade happens in the top part of the sky, because the town and
// the school hide the rest. Storm weather greys everything out.
function skyStops() {
  const hue = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'hue');
  const sat = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'sat');
  const top = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'litTop');
  const bot = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'litBot');
  const lo = Math.min(top, bot), hi = Math.max(top, bot);
  // How much of a clear blue day it is: blue skies get a richer zenith
  const blue = constrain((lo - 50) / 25, 0, 1) * constrain((sat - 10) / 30, 0, 1) * (hue > 120 ? 1 : 0);
  const topLit = lo - 14 * blue - (lo < 50 ? lo * 0.3 : 0);
  const botLit = hi + 3;
  // The glow lasts a little longer than the keyframes' orange, so the grey
  // "wash" steps either side of it are warmed too and never look flat
  const warm = Math.max(scenePlateau(timeOfDay, 0.04, 0.075, 0.10, 0.16),
                        scenePlateau(timeOfDay, 0.52, 0.60, 0.655, 0.73));
  const stops = [];
  const N = 13;
  for (let i = 0; i < N; i++) {
    const k = Math.min(1, (i / (N - 1)) / 0.4);
    let col = PX.hsl(hue + 6 * blue * (1 - k), sat + 22 * blue * (1 - k) - 8 * k,
                     topLit + (botLit - topLit) * Math.pow(k, 0.8));
    if (warm > 0) {
      const p = k * (SUNSET_SKY.length - 1), i0 = Math.min(SUNSET_SKY.length - 2, Math.floor(p));
      col = PX.mix(col, PX.mix(SUNSET_SKY[i0], SUNSET_SKY[i0 + 1], p - i0), warm * 0.72);
    }
    if (weatherAlpha > 0.02) col = PX.mix(col, '#6f7a8c', Math.min(weatherAlpha, 1) * 0.6);
    stops.push(col);
  }
  return stops;
}

// The sun, moon, stars and clouds are drawn by drawSkyLayer() in
// js/weather.js, which loads after this file. Until it has been defined
// this stand-in keeps sketch.js running (a later `function drawSkyLayer`
// simply replaces it).
if (typeof drawSkyLayer === 'undefined') window.drawSkyLayer = function () {};

// ── Lawn ──────────────────────────────────────────────

// Builds the ground once: the lawn is a slab of grass blocks one block
// thick (its dirt side shows along the front edge), mown in a checkerboard
// of two greens so the block grid reads from across the room, with plain
// grass running out to the sides and back under the school and the town.
let _groundBuilt = false;
function drawGround() {
  if (_groundBuilt) return;
  _groundBuilt = true;
  const lawnTex = G3.pixelTex('lawn_checker', 32, 32, g => {
    const a = G3.blockTex('grass').image, b = G3.blockTex('grass_light').image;
    g.drawImage(a, 0, 0); g.drawImage(b, 16, 0); g.drawImage(b, 0, 16); g.drawImage(a, 16, 16);
  });
  const W = G3.GW, D = G3.GD;
  // The lawn top: one quad whose texture repeats every two blocks
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W + 2, D + 1), G3.texMat(lawnTex));
  top.geometry.attributes.uv.array.forEach((v, i, arr) => { arr[i] = v * (i % 2 === 0 ? (W + 2) / 2 : (D + 1) / 2); });
  top.rotation.x = -Math.PI / 2;
  top.position.set(0, 0, (D + 1) / 2);
  top.receiveShadow = true;
  G3.scene.add(top);
  // Its front face: grass over dirt, then dirt and stone going down
  G3.scene.add(G3.blockBox(W + 2, 1, 0.5, 'grass_side', 0, -0.5, D + 1.25));
  G3.scene.add(G3.blockBox(W + 2, 3, 0.5, 'dirt', 0, -2.5, D + 1.25));
  // Rougher grass off to both sides and far back behind the school
  const side = (x0, x1, z0, z1) => {
    const m = G3.blockBox(x1 - x0, 1, z1 - z0, { top: 'grass', side: 'grass_side' }, (x0 + x1) / 2, -0.5, (z0 + z1) / 2);
    m.castShadow = false;
    G3.scene.add(m);
  };
  side(-70, -(W + 2) / 2, -60, D + 1.5);
  side((W + 2) / 2, 70, -60, D + 1.5);
  side(-(W + 2) / 2, (W + 2) / 2, -60, 0);
}
drawGround.g3 = true;

// ── Box-baking helpers ────────────────────────────────
// Scenery is described as lists of boxes [x0, x1, y0, y1, z0, z1] (in
// blocks) and baked into one mesh per texture or material.

// The six faces of a box: normal axis, its sign, and the two in-plane axes
// (u x v points along the positive axis)
const SCENE_FACES = [[0, 1, 1, 2], [0, -1, 1, 2], [1, 1, 2, 0], [1, -1, 2, 0], [2, 1, 0, 1], [2, -1, 0, 1]];

// Bakes boxes into one geometry. With colours (one '#rrggbb' per box) it
// carries vertex colours; without, texture coordinates laid out in world
// space (one repeat per block), so walls built from several boxes show
// no seam where the boxes meet. A box may carry one more number after
// its six (or after its colour): a bit mask of faces to leave out (in SCENE_FACES order, bit 0 =
// +x), for faces buried inside a wall. (A buried face seen exactly
// edge-on can flicker through as a hairline.)
function sceneBoxGeo(boxes, colours) {
  let faces = 0;
  const M = colours ? 7 : 6;                 // where a box keeps its mask
  for (const b of boxes) for (let f = 0; f < 6; f++) if (!((b[M] || 0) >> f & 1)) faces++;
  const pos = new Float32Array(faces * 12), nor = new Float32Array(faces * 12);
  const col = colours ? new Float32Array(faces * 12) : null, uv = colours ? null : new Float32Array(faces * 8);
  const idx = new (faces * 4 > 65535 ? Uint32Array : Uint16Array)(faces * 6);
  const pt = [0, 0, 0], c = new THREE.Color();
  let p = 0, q = 0, ii = 0, vi = 0;
  for (let bi = 0; bi < boxes.length; bi++) {
    const b = boxes[bi];
    if (colours) c.set(colours[bi]);
    for (let f = 0; f < 6; f++) {
      if ((b[M] || 0) >> f & 1) continue;
      const ax = SCENE_FACES[f][0], sg = SCENE_FACES[f][1], u = SCENE_FACES[f][2], v = SCENE_FACES[f][3];
      for (let k = 0; k < 4; k++) {
        pt[ax] = b[ax * 2 + (sg > 0 ? 1 : 0)];
        pt[u] = b[u * 2 + ((k === 1 || k === 2) ? 1 : 0)];
        pt[v] = b[v * 2 + (k >= 2 ? 1 : 0)];
        pos[p] = pt[0]; pos[p + 1] = pt[1]; pos[p + 2] = pt[2];
        nor[p] = ax === 0 ? sg : 0; nor[p + 1] = ax === 1 ? sg : 0; nor[p + 2] = ax === 2 ? sg : 0;
        if (colours) { col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b; }
        else {
          uv[q++] = ax === 0 ? pt[2] : pt[0];
          uv[q++] = ax === 1 ? pt[2] : pt[1];
        }
        p += 3;
      }
      if (sg > 0) { idx[ii++] = vi; idx[ii++] = vi + 1; idx[ii++] = vi + 2; idx[ii++] = vi; idx[ii++] = vi + 2; idx[ii++] = vi + 3; }
      else        { idx[ii++] = vi; idx[ii++] = vi + 2; idx[ii++] = vi + 1; idx[ii++] = vi; idx[ii++] = vi + 3; idx[ii++] = vi + 2; }
      vi += 4;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (colours) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  else g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.userData.own = true;
  return g;
}

// Boxes baked into ONE mesh textured with a block texture.
function sceneTexMesh(boxes, blockName) {
  const m = new THREE.Mesh(sceneBoxGeo(boxes), G3.blockMat(blockName));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Adds a flat-coloured box to a list for sceneColourMesh
function sceneBox(list, x0, x1, y0, y1, z0, z1, c, skip) {
  list.push([x0, x1, y0, y1, z0, z1, c, skip || 0]);
}

// Bakes a list of flat-coloured boxes into one mesh (optionally with its
// own material, for things that glow).
let _sceneVertexMat = null;
function sceneColourMesh(list, material, shadow) {
  if (!_sceneVertexMat) _sceneVertexMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const m = new THREE.Mesh(sceneBoxGeo(list, list.map(b => b[6])), material || _sceneVertexMat);
  m.castShadow = shadow !== false; m.receiveShadow = true;
  return m;
}

// Materials that change through the day: created once, shared by the
// school in the garden and the one on the I SPY card.
let _sceneMats = null;
function sceneMats() {
  if (_sceneMats) return _sceneMats;
  const glow = (emissive, extra) => new THREE.MeshLambertMaterial(
    Object.assign({ vertexColors: true, emissive: new THREE.Color(emissive), emissiveIntensity: 0 }, extra || {}));
  _sceneMats = {
    glass: glow(PAL.ye2),                    // windows with the lights on
    hall: glow(PAL.ye3),                     // the back of the entrance hall
    sign: glow(PAL.cream),                   // the sign lettering, lit at night
    spill: new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.ye1), transparent: true, opacity: 0, depthWrite: false }),
  };
  return _sceneMats;
}

// ── Grass ─────────────────────────────────────────────

// The grass tufts scattered over the lawn: little blades one texel wide,
// with a tiny wildflower here and there. All 600 tufts are baked into
// three meshes; each mesh leans as a whole (a shear, so the roots stay
// put) with the wind and a slow sway of its own, in whole-texel steps.
const GRASS_GROUPS = 3;
const GRASS_HOLD = 6;          // game frames each pose of the swaying grass is held
let _grass = null;

function buildGrass() {
  const T = G3.T, lists = [];
  for (let i = 0; i < GRASS_GROUPS; i++) lists.push([]);
  const S = SCHOOL3;
  for (let i = 0; i < grassBlades.length; i++) {
    const b = grassBlades[i];
    const x = Math.round((b.wx - 0.5) * G3.GW / T) * T, z = Math.round(b.wy * G3.GD / T) * T;
    if (z < S.sidewalk.z1 + 0.25) continue;                             // keep the sidewalk clear
    if (Math.abs(x) < S.apron.x1 + 0.25 && z < S.apron.z1 + 0.25) continue;
    const list = lists[Math.floor(b.phase / (Math.PI * 2) * GRASS_GROUPS) % GRASS_GROUPS];
    const tall = 0.14 + (b.h - 5) / 7 * 0.2;                            // 0.14 .. 0.34 block
    const col = b.shade < 111 ? PAL.gr4 : PAL.gr2;
    const blade = (dx, dz, h, c) => sceneBox(list, x + dx - T / 2, x + dx + T / 2, 0, h, z + dz - T / 2, z + dz + T / 2, c);
    blade(0, 0, tall, col);
    blade(-2 * T, T, tall * 0.55, col);
    if (b.w > 1.2) blade(2 * T, -T, tall * 0.7, b.shade < 111 ? PAL.gr5 : PAL.gr4);
    if (sceneHash(i, 5) < 0.075) {                                      // a wildflower
      const head = WILDFLOWER_COLOURS[Math.floor(sceneHash(i, 9) * WILDFLOWER_COLOURS.length)];
      blade(T, 2 * T, 0.26, PAL.gr4);
      sceneBox(list, x, x + 2 * T, 0.26, 0.26 + 2 * T, z + T, z + 3 * T, head);
    }
  }
  const group = new THREE.Group();
  group.userData.parts = [];
  for (const list of lists) {
    if (!list.length) continue;
    const m = sceneColourMesh(list, null, false);
    m.matrixAutoUpdate = false;
    m.userData.lean = 0;
    group.add(m);
    group.userData.parts.push(m);
  }
  return group;
}

function drawGrass() {
  if (!_grass) { _grass = buildGrass(); G3.scene.add(_grass); }
  if (G3.frame % GRASS_HOLD !== 0) return;
  const parts = _grass.userData.parts;
  for (let i = 0; i < parts.length; i++) {
    const s = Math.sin(t * 0.06 + i * 2.1) * 0.7 + windX * 1.3;
    const lean = s > 0.5 ? 1 : s < -0.5 ? -1 : 0;
    const m = parts[i];
    if (m.userData.lean === lean) continue;
    m.userData.lean = lean;
    m.matrix.identity();
    m.matrix.elements[4] = lean * 0.2;       // x += lean * 0.2 * y: the tips lean a texel
    m.matrixWorldNeedsUpdate = true;
  }
}
drawGrass.g3 = true;

// ── Trees ─────────────────────────────────────────────

// Where the trees stand, in blocks (x, z): beside the two ends of the
// school, behind the fence, and along the two sides of the lawn, outside
// the part where flowers grow. s scales the whole tree.
const TREE_SPOTS = [
  { x: -17.4, z: -1.7, kind: 'pine',  s: 1.0 },
  { x: 14.7,  z: -1.5, kind: 'pine',  s: 1.05 },
  { x: 18.0,  z: -2.6, kind: 'maple', s: 1.0 },
  { x: -21.2, z: 4.4,  kind: 'maple', s: 1.05 },
  { x: -20.4, z: 10.2, kind: 'pine',  s: 0.95 },
  { x: 20.6,  z: 3.8,  kind: 'pine',  s: 1.0 },
  { x: 20.8,  z: 9.8,  kind: 'maple', s: 0.95 },
];

// A pine: a short log trunk under stacked leaf slabs that get smaller
// toward the top, each tier a wide slab with a narrower one on it.
function buildPine() {
  const tree = new THREE.Group(), canopy = new THREE.Group();
  tree.add(sceneTexMesh([[-0.22, 0.22, 0, 1.3, -0.22, 0.22]], 'log'));
  const dark = [], mid = [];
  const widths = [3.2, 2.3, 2.7, 1.8, 2.1, 1.3, 1.5, 0.8];
  let y = 1.0;
  for (let i = 0; i < widths.length; i++) {
    const hw = widths[i] / 2;
    (i % 2 === 0 ? dark : mid).push([-hw, hw, y, y + 0.5, -hw, hw]);
    y += 0.5;
  }
  mid.push([-0.2, 0.2, y, y + 0.55, -0.2, 0.2]);          // the tip
  canopy.add(sceneTexMesh(dark, 'leaves_pine'), sceneTexMesh(mid, 'leaves'));
  tree.add(canopy);
  tree.userData.canopy = canopy;
  return tree;
}

// A maple: a log-block trunk under a rounded canopy of leaf cubes in two
// greens. seed changes which cubes are light and which corners are missing.
function buildMaple(seed) {
  const tree = new THREE.Group(), canopy = new THREE.Group();
  tree.add(sceneTexMesh([[-0.25, 0.25, 0, 2.6, -0.25, 0.25]], 'log'));
  const C = 0.8;                                             // one leaf cube
  const a = [], b = [];
  const layers = [
    (x, z) => Math.abs(x) + Math.abs(z) <= 2 && Math.abs(z) <= 1,
    (x, z) => Math.abs(x) <= 2 && Math.abs(z) <= 2 && Math.abs(x) + Math.abs(z) < 4,
    (x, z) => Math.abs(x) <= 2 && Math.abs(z) <= 1 && Math.abs(x) + Math.abs(z) < 3,
    (x, z) => Math.abs(x) + Math.abs(z) <= 1,
  ];
  for (let l = 0; l < layers.length; l++) {
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
      if (!layers[l](x, z)) continue;
      const k = sceneHash(x * 7 + l * 31 + seed * 101, z * 13 + l);
      const edge = Math.abs(x) === 2 || Math.abs(z) === 2;
      if (edge && k > 0.82) continue;                        // a ragged outline
      const y0 = 2.0 + l * C;
      // lighter leaves toward the top and the sunny left side
      const light = k < 0.2 + l * 0.14 - x * 0.06;
      (light ? b : a).push([(x - 0.5) * C, (x + 0.5) * C, y0, y0 + C, (z - 0.5) * C, (z + 0.5) * C]);
    }
  }
  canopy.add(sceneTexMesh(a, 'leaves'));
  if (b.length) canopy.add(sceneTexMesh(b, 'leaves_light'));
  tree.add(canopy);
  tree.userData.canopy = canopy;
  return tree;
}

// Builds the trees once; after that only their canopies move, sliding a
// texel or two with the wind.
let _trees = null;
function drawTrees() {
  if (!_trees) {
    _trees = new THREE.Group();
    _trees.userData.canopies = [];
    for (let i = 0; i < TREE_SPOTS.length; i++) {
      const spot = TREE_SPOTS[i];
      const tree = spot.kind === 'pine' ? buildPine() : buildMaple(i);
      tree.position.set(spot.x, 0, spot.z);
      tree.scale.setScalar(spot.s);
      _trees.add(tree);
      _trees.userData.canopies.push(tree.userData.canopy);
    }
    G3.scene.add(_trees);
  }
  const canopies = _trees.userData.canopies;
  for (let i = 0; i < canopies.length; i++) {
    const sway = Math.sin(t * 0.012 + i * 2.3) * 1.1 + windX * 1.2;
    canopies[i].position.x = Math.max(-2, Math.min(2, Math.round(sway))) * G3.T;
  }
}
drawTrees.g3 = true;

// The town used to cut the trees and the school out of its night lights.
// In 3D the depth buffer does that; kept so old callers do no harm.
function drawTownOccluders() {}

// ── Robert Adams Middle School ────────────────────────

// The plan of the school, in blocks. The front wall is at z = 0 and the
// building goes back to z = back. Left to right: a dark brick wing with a
// side door, the taller brick block that carries the sign, the white
// entrance tower (centred on x = 0, wx = 0.5) with the two main doorways,
// a lower brick section, and the sandstone wing. `h` is the top of each
// wall; a parapet stands `parapet` higher.
const SCHOOL3 = {
  back: -7,
  parapet: 0.3,
  sections: {
    wingL: { x0: -15.5, x1: -10.5, h: 4.7, tex: 'brick_dark',  plinth: PAL.g3 },
    mass:  { x0: -10.5, x1: -3,    h: 6.0, tex: 'brick',       plinth: PAL.g3 },
    tower: { x0: -3,    x1: 3,     h: 7.7, tex: 'panel_white', plinth: PAL.g2 },
    mid:   { x0: 3,     x1: 7.5,   h: 4.7, tex: 'brick',       plinth: PAL.g3 },
    stone: { x0: 7.5,   x1: 12.5,  h: 5.2, tex: 'sandstone',   plinth: PAL.ta3 },
  },
  // The two main doorways (see the School contract in docs/GARDEN_3D.md):
  // open, dark inside, x from 0.1 to 1.3 and mirrored, 2.25 blocks tall.
  door: { x0: 0.1, x1: 1.3, h: 2.25, depth: 2.5 },
  sidewalk: { x0: -19, x1: 19, z0: 0, z1: 1.2, y: 0.03 },
  apron: { x0: -3.7, x1: 3.7, z1: 1.6 },            // paving under the portico
  portico: { x0: -3.25, x1: 3.25, y0: 2.7, y1: 3.4, z1: 1.45 },
  canopy: { x0: 3.25, x1: 13.0, y0: 2.75, y1: 3.1, z1: 1.3 },
  pole: { x: -3.48, z: 0.45, top: 8.95 },
  sign: { x: -6.95, top: 5.42, px: 0.07, gap: 0.24 },
};

// Width in sign pixels of a line of sign lettering
function signWidth(str) {
  let w = 0;
  for (const ch of str) w += SIGN_GLYPHS[ch] ? SIGN_GLYPHS[ch][0].length + 1 : 4;
  return w - 1;
}

// Where the ends of the school appear on screen, in art pixels. (The 2D
// town used this to know which of its columns can be seen; kept for it.)
function schoolLayout() {
  const S = SCHOOL3.sections;
  const ax = x => G3.ready ? G3.artAt(0.5 + x / G3.GW, 0, 0).x : Math.round((0.5 + x / G3.GW) * PX.W);
  const base = G3.ready ? G3.artAt(0.5, 0, 0) : { x: PX.W >> 1, y: PX.HOR + 3 };
  return {
    cx: base.x, B: base.y,
    wingL: ax(S.wingL.x0), massL: ax(S.mass.x0), towerL: ax(S.tower.x0), towerR: ax(S.tower.x1),
    midR: ax(S.mid.x1), wingR: ax(S.stone.x1), canopyR: ax(SCHOOL3.canopy.x1), poleX: ax(SCHOOL3.pole.x),
  };
}

// One window on the front wall (z = 0): a frame standing proud of the
// wall, glazing bars, panes of glass set back inside it and a sill.
// o: { cols, rows, frame, sill, lit }. Lit windows go in the list that
// glows at night.
function schoolWindow(L, cx, y0, w, h, o) {
  const f = 0.08, bar = 0.05, x0 = cx - w / 2, x1 = cx + w / 2, y1 = y0 + h;
  const frame = o.frame || PAL.white, cols = o.cols || 2, rows = o.rows || 2;
  sceneBox(L.trim, x0, x1, y0, y0 + f, 0, 0.12, frame);
  sceneBox(L.trim, x0, x1, y1 - f, y1, 0, 0.12, frame);
  sceneBox(L.trim, x0, x0 + f, y0 + f, y1 - f, 0, 0.12, frame);
  sceneBox(L.trim, x1 - f, x1, y0 + f, y1 - f, 0, 0.12, frame);
  const pw = (w - 2 * f - (cols - 1) * bar) / cols, ph = (h - 2 * f - (rows - 1) * bar) / rows;
  for (let c = 1; c < cols; c++) {
    const bx = x0 + f + c * pw + (c - 1) * bar;
    sceneBox(L.trim, bx, bx + bar, y0 + f, y1 - f, 0, 0.09, frame);
  }
  for (let r = 1; r < rows; r++) {
    const by = y0 + f + r * ph + (r - 1) * bar;
    sceneBox(L.trim, x0 + f, x1 - f, by, by + bar, 0, 0.085, frame);
  }
  const glass = o.lit ? L.lit : L.dark;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const gx = x0 + f + c * (pw + bar), gy = y0 + f + r * (ph + bar);
    // the sky catches the top-left of the glass
    const col = (r === rows - 1 && c === 0) ? PAL.sk2 : (r === 0 && c === cols - 1) ? PAL.sk4 : PAL.sk3;
    sceneBox(glass, gx, gx + pw, gy, gy + ph, 0, 0.04, col);
  }
  if (o.sill) sceneBox(L.trim, x0 - 0.06, x1 + 0.06, y0 - 0.09, y0, 0, 0.2, o.sill);
}

// A classroom window; about three in four have their lights on at night.
function classWindow(L, cx, y0, sill) {
  const lit = sceneHash(Math.round(cx * 8) + 3, Math.round(y0 * 8) * 13 + 1) < 0.72;
  schoolWindow(L, cx, y0, 0.8, 1.0, { sill, lit });
}

// One section of the building: a box of wall from the ground to sec.h and
// back to SCHOOL3.back, with a recess cut in the front for each opening
// { x0, x1, y1, depth } (doorways), a gravel roof, a slate parapet all
// round and a plinth along the foot of the wall.
function schoolSection(L, sec, openings) {
  const back = SCHOOL3.back, wall = L.walls[sec.tex], P = SCHOOL3.parapet;
  let x = sec.x0;
  // Faces where two pieces of the same wall meet are left out (1 = +x,
  // 2 = -x); the sides of a recess are added back as single faces.
  const solid = (a, b) => {
    if (b - a < 0.001) return;
    wall.push([a, b, 0, sec.h, back, 0, (b < sec.x1 - 0.001 ? 1 : 0) | (a > sec.x0 + 0.001 ? 2 : 0)]);
    sceneBox(L.trim, a, b, 0, 0.22, 0, 0.05, sec.plinth);
  };
  for (const o of (openings || [])) {
    solid(x, o.x0);
    wall.push([o.x0, o.x1, o.y1, sec.h, back, 0, 3]);            // over the opening
    wall.push([o.x0, o.x1, 0, o.y1, back, -o.depth, 3]);         // behind it
    wall.push([o.x0 - 0.05, o.x0, 0, o.y1, -o.depth, 0, 62]);    // its left side (+x face only)
    wall.push([o.x1, o.x1 + 0.05, 0, o.y1, -o.depth, 0, 61]);    // its right side (-x face only)
    x = o.x1;
  }
  solid(x, sec.x1);
  L.walls.roof_flat.push([sec.x0 + 0.25, sec.x1 - 0.25, sec.h, sec.h + 0.04, back + 0.25, -0.25]);
  // Parapet: slate blue with a lighter cap, a texel proud of the wall
  const T = G3.T, y0 = sec.h, y1 = sec.h + P - 0.07, y2 = sec.h + P;
  const rim = (a, b, z0, z1) => {
    sceneBox(L.trim, a, b, y0, y1, z0, z1, PAL.sl2);
    sceneBox(L.trim, a - 0.02, b + 0.02, y1, y2, z0 - 0.02, z1 + 0.02, PAL.sl1);
  };
  rim(sec.x0 - T, sec.x1 + T, -0.3, T);
  rim(sec.x0 - T, sec.x1 + T, back - T, back + 0.3);
  rim(sec.x0 - T, sec.x0 + 0.3, back + 0.3, -0.3);
  rim(sec.x1 - 0.3, sec.x1 + T, back + 0.3, -0.3);
}

// A pair of wooden doors with glass slits under a transom window, set
// back in a recess { x0, x1, y1, depth } in the wall.
function schoolSideDoor(L, o) {
  const zb = -o.depth, w = o.x1 - o.x0;
  sceneBox(L.trim, o.x0, o.x1, 0, o.y1, zb, zb + 0.04, PAL.g5);                    // frame
  sceneBox(L.trim, o.x0, o.x1, 0, 0.035, zb, 0, PAL.g2);                           // threshold
  sceneBox(L.lit, o.x0 + 0.1, o.x1 - 0.1, o.y1 - 0.45, o.y1 - 0.1, zb + 0.04, zb + 0.07, PAL.sk3);   // transom
  const lw = (w - 0.2) / 2, top = o.y1 - 0.55;
  for (let k = 0; k < 2; k++) {
    const lx = o.x0 + 0.1 + k * lw, mid = lx + lw / 2;
    sceneBox(L.trim, lx + 0.015, lx + lw - 0.015, 0.035, top, zb + 0.04, zb + 0.1, PAL.wo3);
    sceneBox(L.trim, lx + 0.015, lx + lw - 0.015, 0.035, 0.3, zb + 0.1, zb + 0.115, PAL.wo4);   // kick plate
    sceneBox(L.trim, mid - 0.11, mid + 0.11, 0.8, top - 0.15, zb + 0.1, zb + 0.12, PAL.g5);     // slit frame
    sceneBox(L.lit, mid - 0.06, mid + 0.06, 0.85, top - 0.2, zb + 0.12, zb + 0.13, PAL.sk3);
    const hx = k === 0 ? lx + lw - 0.12 : lx + 0.06;
    sceneBox(L.trim, hx, hx + 0.06, 0.95, 1.15, zb + 0.1, zb + 0.16, PAL.ye2);                  // handle
  }
}

// A square white column from the ground up to y1
function schoolColumn(L, x, z, y1, w) {
  const h = w / 2;
  sceneBox(L.trim, x - h, x + h, 0, y1, z - h, z + h, PAL.white);
  sceneBox(L.trim, x - h - 0.05, x + h + 0.05, 0, 0.16, z - h - 0.05, z + h + 0.05, PAL.g2);
  sceneBox(L.trim, x - h - 0.05, x + h + 0.05, y1 - 0.12, y1, z - h - 0.05, z + h + 0.05, PAL.g1);
}

// A line of sign lettering made of little boxes, centred on cx with its
// top at `top`, standing out from z0 to z1.
function schoolLettering(list, str, cx, top, s, z0, z1, col) {
  let x = cx - signWidth(str) * s / 2;
  for (const ch of str) {
    const glyph = SIGN_GLYPHS[ch];
    if (!glyph) { x += 4 * s; continue; }
    for (let r = 0; r < glyph.length; r++) {
      const row = glyph[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] !== '1') continue;
        let e = c;
        while (e + 1 < row.length && row[e + 1] === '1') e++;
        sceneBox(list, x + c * s, x + (e + 1) * s, top - (r + 1) * s, top - r * s, z0, z1, col);
        c = e;
      }
    }
    x += (glyph[0].length + 1) * s;
  }
}

// A rooftop air-handling unit
function schoolRoofUnit(L, x, y, z, w, d) {
  sceneBox(L.trim, x - w / 2, x + w / 2, y, y + 0.42, z - d / 2, z + d / 2, PAL.g2);
  sceneBox(L.trim, x - w / 2 - 0.03, x + w / 2 + 0.03, y + 0.42, y + 0.5, z - d / 2 - 0.03, z + d / 2 + 0.03, PAL.g3);
  sceneBox(L.trim, x - w / 2 + 0.1, x + w / 2 - 0.1, y + 0.12, y + 0.3, z + d / 2, z + d / 2 + 0.02, PAL.g4);
}

// The flag: one thin strip of boxes per column, so it can ripple by
// moving whole columns. Column 0 is at the pole; the flag flies out to
// the left, over the roof.
const FLAG_COL_W = 0.16, FLAG_ROW_H = 0.085;
function buildSchoolFlag() {
  const F = FLAG_ART, flag = new THREE.Group();
  flag.userData.cols = [];
  for (let i = 0; i < F.cols; i++) {
    const list = [];
    for (let r = 0; r < F.rows; r++) {
      const canton = i < F.cantonCols && r < F.cantonRows;
      const col = canton ? F.blue : (r % 2 === 0 ? F.red : F.white);
      sceneBox(list, -FLAG_COL_W / 2, FLAG_COL_W / 2, -(r + 1) * FLAG_ROW_H, -r * FLAG_ROW_H, -0.03, 0.03, col);
      if (canton && r % 2 === 1 && i % 2 === 1 - (r >> 1) % 2 && i > 0) {       // stars
        sceneBox(list, -FLAG_COL_W / 4, FLAG_COL_W / 4, -(r + 1) * FLAG_ROW_H, -r * FLAG_ROW_H, -0.038, 0.038, F.star);
      }
    }
    const m = sceneColourMesh(list);
    m.position.x = -(i + 0.5) * FLAG_COL_W;
    flag.add(m);
    flag.userData.cols.push(m);
  }
  return flag;
}

// Ripples the flag: a wave travels out from the pole, each column riding
// it up and down (and a little toward and away from us) in texel steps.
function poseSchoolFlag(flag, tick, gust) {
  const cols = flag.userData.cols, n = cols.length;
  const amp = 1.2 + Math.min(1, Math.abs(gust)) * 0.8;
  for (let i = 0; i < n; i++) {
    const ph = i * 0.9 - tick * 0.13, far = i / (n - 1);
    cols[i].position.y = Math.round(Math.sin(ph) * amp * far) * G3.T * 0.75;
    cols[i].position.z = Math.round(Math.cos(ph) * 1.6 * far) * G3.T * 0.75;
  }
}

// The white picket fence along the back of the lawn, either side of the
// school: square pickets with pointed tops on two rails, and a thicker
// post every few blocks. Kept low so the town shows over it.
function schoolFence(list, x0, x1) {
  const T = G3.T, z = -0.2;
  sceneBox(list, x0, x1, 0.18, 0.25, z - 0.07, z - 0.02, PAL.g1);
  sceneBox(list, x0, x1, 0.48, 0.55, z - 0.07, z - 0.02, PAL.g1);
  for (let x = x0 + T; x + 3 * T <= x1; x += 5 * T) {
    sceneBox(list, x, x + 3 * T, 0, 0.7, z - 0.02, z + 0.04, PAL.white);
    sceneBox(list, x + T, x + 2 * T, 0.7, 0.77, z - 0.02, z + 0.04, PAL.white);
  }
  for (let x = x0; x <= x1 + 0.001; x += (x1 - x0) / Math.max(1, Math.round((x1 - x0) / 2.5))) {
    sceneBox(list, x - 0.09, x + 0.09, 0, 0.85, z - 0.11, z + 0.07, PAL.white);
    sceneBox(list, x - 0.12, x + 0.12, 0.85, 0.92, z - 0.14, z + 0.1, PAL.g1);
  }
}

// Builds the whole school as a Group standing on y = 0 with its front wall
// at z = 0. forCard leaves out the long sidewalk and the fence (the I SPY
// card shows just the building).
function buildSchool(forCard) {
  const S = SCHOOL3, X = S.sections, M = sceneMats();
  const L = {
    walls: { brick: [], brick_dark: [], sandstone: [], panel_white: [], roof_flat: [], pavement: [], sign_board: [] },
    trim: [], lit: [], dark: [], letters: [], hall: [],
  };
  const school = new THREE.Group();

  // ── Sidewalk, a hair above the lawn, and the paving under the portico ──
  const sw = S.sidewalk, swx0 = forCard ? X.wingL.x0 - 1 : sw.x0, swx1 = forCard ? S.canopy.x1 + 0.5 : sw.x1;
  L.walls.pavement.push([swx0, swx1, -0.3, sw.y, sw.z0, sw.z1]);
  L.walls.pavement.push([S.apron.x0, S.apron.x1, -0.3, sw.y, sw.z1, S.apron.z1]);
  sceneBox(L.trim, swx0, S.apron.x0, -0.3, sw.y + 0.012, sw.z1 - 0.07, sw.z1, PAL.g2);       // kerb
  sceneBox(L.trim, S.apron.x1, swx1, -0.3, sw.y + 0.012, sw.z1 - 0.07, sw.z1, PAL.g2);
  sceneBox(L.trim, S.apron.x0, S.apron.x1, -0.3, sw.y + 0.012, S.apron.z1 - 0.07, S.apron.z1, PAL.g2);

  // ── Far-left wing: side door in a recess, two rows of windows ──
  const doorL = { x0: X.wingL.x0 + 0.6, x1: X.wingL.x0 + 2.1, y1: 2.5, depth: 0.5 };
  schoolSection(L, X.wingL, [doorL]);
  schoolSideDoor(L, doorL);
  sceneBox(L.trim, doorL.x0 + 0.6, doorL.x1 - 0.6, 2.72, 2.8, 0, 0.14, PAL.g4);      // lamp over the door
  sceneBox(L.lit, doorL.x0 + 0.66, doorL.x1 - 0.66, 2.62, 2.72, 0.02, 0.12, PAL.ye1);
  classWindow(L, (doorL.x0 + doorL.x1) / 2, 3.25, PAL.br1);
  for (const cx of [-12.55, -11.35]) {
    classWindow(L, cx, 1.15, PAL.br1);
    classWindow(L, cx, 3.25, PAL.br1);
  }

  // ── The brick block with the sign ──
  schoolSection(L, X.mass);
  for (let i = -2; i <= 2; i++) classWindow(L, -6.95 + i * 1.3, 1.15, PAL.br1);
  const sg = S.sign, lineH = 8 * sg.px;
  const bw = signWidth('MIDDLE SCHOOL') * sg.px / 2 + 0.24;
  const by0 = sg.top - 2 * lineH - sg.gap - 0.2, by1 = sg.top + 0.2;
  L.walls.sign_board.push([sg.x - bw, sg.x + bw, by0, by1, 0, 0.05]);
  sceneBox(L.trim, sg.x - bw - 0.07, sg.x + bw + 0.07, by1, by1 + 0.07, 0, 0.09, PAL.g1);     // its frame
  sceneBox(L.trim, sg.x - bw - 0.07, sg.x + bw + 0.07, by0 - 0.07, by0, 0, 0.09, PAL.g1);
  sceneBox(L.trim, sg.x - bw - 0.07, sg.x - bw, by0, by1, 0, 0.09, PAL.g1);
  sceneBox(L.trim, sg.x + bw, sg.x + bw + 0.07, by0, by1, 0, 0.09, PAL.g1);
  schoolLettering(L.letters, 'ROBERT ADAMS', sg.x, sg.top, sg.px, 0.05, 0.12, PAL.white);
  schoolLettering(L.letters, 'MIDDLE SCHOOL', sg.x, sg.top - lineH - sg.gap, sg.px, 0.05, 0.12, PAL.white);
  // A concrete band ties the two left-hand blocks together at canopy height
  sceneBox(L.trim, X.wingL.x0 - 0.04, X.wingL.x1, 2.86, 3.0, 0, 0.05, PAL.g1);
  sceneBox(L.trim, X.mass.x0, X.mass.x1, 2.86, 3.0, 0, 0.05, PAL.g1);

  // ── The entrance tower: two open doorways, three tall strips of glass ──
  const D = S.door;
  const doors = [{ x0: -D.x1, x1: -D.x0, y1: D.h, depth: D.depth }, { x0: D.x0, x1: D.x1, y1: D.h, depth: D.depth }];
  schoolSection(L, X.tower, doors);
  const dim = '#27222f';
  for (const o of doors) {
    // (single faces: the lining is seen edge-on from straight in front)
    sceneBox(L.trim, o.x0, o.x1, 0, 0.035, -o.depth, 0, PAL.g5, 59);                       // hall floor
    sceneBox(L.trim, o.x0, o.x0 + 0.03, 0.035, o.y1, -o.depth, -0.1, dim, 62);             // dark lining
    sceneBox(L.trim, o.x1 - 0.03, o.x1, 0.035, o.y1, -o.depth, -0.1, dim, 61);
    sceneBox(L.trim, o.x0, o.x1, o.y1 - 0.03, o.y1, -o.depth, -0.1, dim, 55);
    sceneBox(L.hall, o.x0, o.x1, 0.035, o.y1, -o.depth, -o.depth + 0.03, dim, 47);         // glows at night
  }
  for (const cx of [-1.75, 0, 1.75]) {
    schoolWindow(L, cx, 3.85, 1.2, 3.35, { cols: 2, rows: 4, frame: PAL.sl3, sill: PAL.g2, lit: true });
  }
  // A low roof-light on top of the tower
  const th = X.tower.h;
  sceneBox(L.trim, -1.4, 1.4, th, th + 0.8, -4.6, -2.2, PAL.sl2);
  sceneBox(L.trim, -1.5, 1.5, th + 0.8, th + 0.9, -4.7, -2.1, PAL.sl1);
  sceneBox(L.lit, -1.2, 1.2, th + 0.4, th + 0.7, -2.2, -2.17, PAL.sk3);

  // ── Centre brick section: a door between two windows, behind the canopy ──
  const doorM = { x0: 4.5, x1: 6.0, y1: 2.5, depth: 0.5 };
  schoolSection(L, X.mid, [doorM]);
  schoolSideDoor(L, doorM);
  classWindow(L, 3.75, 1.15, PAL.br1);
  classWindow(L, 6.75, 1.15, PAL.br1);
  for (const cx of [4.05, 5.25, 6.45]) classWindow(L, cx, 3.5, PAL.br1);

  // ── Sandstone wing: end door, two rows of windows ──
  const doorR = { x0: 10.6, x1: 12.1, y1: 2.5, depth: 0.5 };
  schoolSection(L, X.stone, [doorR]);
  schoolSideDoor(L, doorR);
  for (const cx of [8.3, 9.5]) classWindow(L, cx, 1.15, PAL.ta1);
  for (const cx of [8.2, 9.4, 10.6, 11.8]) classWindow(L, cx, 3.7, PAL.ta1);

  // ── Portico over the main doors, and the long canopy on columns ──
  const po = S.portico, ca = S.canopy;
  sceneBox(L.trim, po.x0, po.x1, po.y0 + 0.07, po.y1, 0, po.z1, PAL.white);
  sceneBox(L.trim, po.x0 - 0.04, po.x1 + 0.04, po.y0, po.y0 + 0.07, 0, po.z1 + 0.04, PAL.g2);
  sceneBox(L.trim, po.x0 - 0.06, po.x1 + 0.06, po.y1, po.y1 + 0.09, 0, po.z1 + 0.06, PAL.g1);
  for (const x of [-3.0, -1.62, 1.62, 3.0]) schoolColumn(L, x, po.z1 - 0.22, po.y0, 0.3);
  sceneBox(L.trim, ca.x0, ca.x1, ca.y0 + 0.06, ca.y1 - 0.06, 0, ca.z1, PAL.g1);
  sceneBox(L.trim, ca.x0, ca.x1 + 0.03, ca.y0, ca.y0 + 0.06, 0, ca.z1 + 0.03, PAL.g3);
  sceneBox(L.trim, ca.x0, ca.x1 + 0.04, ca.y1 - 0.06, ca.y1, 0, ca.z1 + 0.04, PAL.white);
  for (const x of [4.25, 6.25, 7.5, 8.9, 10.35, 12.82]) schoolColumn(L, x, ca.z1 - 0.2, ca.y0, 0.25);

  // ── Roof clutter ──
  schoolRoofUnit(L, -13.2, X.wingL.h + 0.04, -3.2, 1.2, 0.9);
  schoolRoofUnit(L, -8.4, X.mass.h + 0.04, -4.2, 1.4, 1.0);
  schoolRoofUnit(L, -5.4, X.mass.h + 0.04, -2.6, 0.9, 0.9);
  schoolRoofUnit(L, 5.3, X.mid.h + 0.04, -3.4, 1.2, 0.9);
  schoolRoofUnit(L, 9.4, X.stone.h + 0.04, -4.0, 1.4, 1.0);
  schoolRoofUnit(L, 11.3, X.stone.h + 0.04, -2.4, 0.8, 0.8);

  // ── Flagpole by the main entrance ──
  const pl = S.pole;
  sceneBox(L.trim, pl.x - 0.06, pl.x + 0.06, 0, pl.top, pl.z - 0.06, pl.z + 0.06, PAL.g1);
  sceneBox(L.trim, pl.x - 0.2, pl.x + 0.2, 0, 0.2, pl.z - 0.2, pl.z + 0.2, PAL.g3);          // footing
  sceneBox(L.trim, pl.x - 0.11, pl.x + 0.11, pl.top, pl.top + 0.2, pl.z - 0.11, pl.z + 0.11, PAL.ye2);   // gold cap

  if (!forCard) {
    schoolFence(L.trim, -34, X.wingL.x0);
    schoolFence(L.trim, X.stone.x1, 34);
  }

  // ── Bake: one mesh per texture, one for all the trim, one per glow ──
  for (const name in L.walls) {
    if (!L.walls[name].length) continue;
    const m = sceneTexMesh(L.walls[name], name);
    if (name === 'pavement' || name === 'roof_flat') m.castShadow = false;
    school.add(m);
  }
  school.add(sceneColourMesh(L.trim));
  school.add(sceneColourMesh(L.dark, null, false));
  school.add(sceneColourMesh(L.lit, M.glass, false));
  school.add(sceneColourMesh(L.hall, M.hall, false));
  school.add(sceneColourMesh(L.letters, M.sign, false));

  const flag = buildSchoolFlag();
  flag.position.set(pl.x - 0.06, pl.top - 0.08, pl.z);
  school.add(flag);
  school.userData.flag = flag;

  // Warm light lying on the paving in front of the open doors at night
  if (!forCard) {
    const spill = new THREE.Mesh(G3.geo(3.4, 0.01, 1.5), M.spill);
    spill.position.set(0, sw.y + 0.02, 0.75);
    spill.visible = false;
    school.add(spill);
    school.userData.spill = spill;
  }
  return school;
}

// Draws the school: built once, then each frame the flag ripples and, at
// night or under storm clouds, the windows and the entrance glow.
let _school = null;
function drawSchool() {
  if (!_school) { _school = buildSchool(false); G3.scene.add(_school); }
  poseSchoolFlag(_school.userData.flag, t, windX);

  const glow = Math.max(constrain((G3.night - 0.2) / 0.4, 0, 1), constrain((weatherAlpha - 0.55) * 2, 0, 0.75));
  const M = sceneMats();
  M.glass.emissiveIntensity = glow * 0.85;
  M.hall.emissiveIntensity = glow * 0.9;
  M.sign.emissiveIntensity = glow * 0.3;
  M.spill.opacity = glow * 0.22;
  _school.userData.spill.visible = glow > 0.02;
}
drawSchool.g3 = true;

// ── Fireflies ────────────────────────────────────────

// Spawns, moves and draws the pulsing fireflies that come out at night:
// small glowing cubes drifting over the lawn. Each one lives in world
// coordinates (wx, wy) with a height h in blocks. Their materials are
// unlit, so the night never dulls them.
let _fireflies = null;
function buildFireflies() {
  const group = new THREE.Group();
  const T = G3.T;
  group.userData.bugs = [];
  group.userData.mats = {
    gold:  [G3.mat(PAL.ye3, { basic: true }), G3.mat(PAL.ye2, { basic: true }), G3.mat(PAL.ye1, { basic: true })],
    green: [G3.mat(PAL.gr2, { basic: true }), G3.mat(PAL.gr1, { basic: true }), G3.mat(PAL.ye1, { basic: true })],
    haloGold:  G3.mat(PAL.ye2, { basic: true, transparent: true, opacity: 0.28, depthWrite: false }),
    haloGreen: G3.mat(PAL.gr1, { basic: true, transparent: true, opacity: 0.28, depthWrite: false }),
  };
  for (let i = 0; i < NUM_FIREFLIES; i++) {
    const core = G3.box(2 * T, 2 * T, 2 * T, group.userData.mats.gold[0]);
    const halo = G3.box(6 * T, 6 * T, 6 * T, group.userData.mats.haloGold);
    core.castShadow = core.receiveShadow = halo.castShadow = halo.receiveShadow = false;
    core.visible = halo.visible = false;
    group.add(core, halo);
    group.userData.bugs.push({ core, halo });
  }
  return group;
}

function updateAndDrawFireflies() {
  const na = G3.night;
  if (!_fireflies) { _fireflies = buildFireflies(); G3.scene.add(_fireflies); }
  const bugs = _fireflies.userData.bugs, mats = _fireflies.userData.mats;

  // Spawn/despawn fireflies based on night
  if (na > 0.3 && fireflies.length < NUM_FIREFLIES) {
    fireflies.push({
      wx: random(0, 1), wy: random(0.08, 1), h: random(0.4, 1.8),
      twx: random(0.03, 0.97), twy: random(0.12, 0.96), th: random(0.4, 1.8),
      speed: random(0.3, 0.8),
      phase: random(TWO_PI),
      pulseSpeed: random(0.03, 0.07),
      hue: random(55, 75),
      size: random(3, 5),
    });
  }
  if (na < 0.1) {
    if (fireflies.length) fireflies.length = 0;
    if (_fireflies.visible) _fireflies.visible = false;
    return;
  }
  _fireflies.visible = true;

  for (let i = 0; i < bugs.length; i++) {
    const f = fireflies[i], bug = bugs[i];
    if (!f) { bug.core.visible = bug.halo.visible = false; continue; }
    // Drift toward target
    f.wx = lerp(f.wx, f.twx, 0.005 * f.speed);
    f.wy = lerp(f.wy, f.twy, 0.005 * f.speed);
    f.h = lerp(f.h, f.th, 0.005 * f.speed);
    // Gentle sine wobble
    f.h += Math.sin(t * 0.04 + f.phase) * 0.006;
    f.wx += Math.cos(t * 0.03 + f.phase * 1.3) * 0.00016;
    // Pick new target when close
    if (Math.hypot((f.wx - f.twx) * G3.GW, (f.wy - f.twy) * G3.GD) < 0.4) {
      f.twx = random(0.03, 0.97);
      f.twy = random(0.12, 0.96);
      f.th = random(0.4, 1.8);
    }
    // Pulsing glow: dark → ember → glow → flash
    const pulse = (Math.sin(t * f.pulseSpeed + f.phase) * 0.5 + 0.5) * na;
    if (pulse < 0.18) { bug.core.visible = bug.halo.visible = false; continue; }
    const green = f.hue > 66;                   // some flash yellow-green, some gold
    const level = pulse > 0.75 ? 2 : pulse > 0.45 ? 1 : 0;
    bug.core.visible = true;
    bug.core.material = (green ? mats.green : mats.gold)[level];
    G3.place(bug.core, f.wx, f.wy, f.h);
    bug.core.scale.setScalar(level === 2 ? 1.5 : level === 1 ? 1 : 0.5);
    bug.halo.visible = level > 0;
    if (level > 0) {
      bug.halo.material = green ? mats.haloGreen : mats.haloGold;
      bug.halo.position.copy(bug.core.position);
      bug.halo.scale.setScalar((level === 2 ? 1.25 : 0.8) * f.size / 4);
    }
  }
}
updateAndDrawFireflies.g3 = true;

// ── I SPY card art ───────────────────────────────────

// The school's I SPY card shows the same block building as the garden.
G3.cardArt('school', () => buildSchool(true), { w: 110, h: 56, yaw: 0.22 });
