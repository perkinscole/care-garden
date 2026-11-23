// ================================================================
// File: town_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 23, 2026
// Description: Block art for the 3D town backdrop (js/town.js): the
//   town's own block textures, the painted shop signs, and the little
//   box models of the things that move (cars, buses, walkers, cyclists).
//   No p5.js functions are called at load time.
//
//   Everything in the town is small and far away, so the models are a
//   handful of boxes each, baked into one mesh with G3.merged.
// ================================================================

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

// ── Block textures ────────────────────────────────────
// Clapboard walls and shingle roofs in each house colour, and a few
// plain blocks the town needs. (Skipped in tools/sprites.html, which has
// no 3D engine.)
if (typeof G3 !== 'undefined') (() => {
  const boards = shade => g => {
    g.globalAlpha = 0.55; g.fillStyle = shade;
    for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.globalAlpha = 1;
  };
  TOWN_HOUSES.forEach((st, i) => {
    G3.defineBlock('town_wall' + i, st.wall, [st.shade], { amount: 0.1, seed: i, paint: boards(st.shade) });
    G3.defineBlock('town_roof' + i, st.roof, [st.hi], { amount: 0.22, seed: i + 3, paint: boards(PX.mix(st.roof, PAL.black, 0.35)) });
  });
  G3.defineBlock('town_cream', PAL.cream, [PAL.ta1, PAL.white], { amount: 0.16, paint: boards(PAL.ta1) });
  G3.defineBlock('town_slate', PAL.sl1, [PAL.sl2, '#9db4c8'], { amount: 0.16, paint: boards(PAL.sl2) });
  G3.defineBlock('town_slate_roof', PAL.sl3, [PAL.sl2], { amount: 0.2, paint: boards(PAL.g5) });
  G3.defineBlock('town_trail', PAL.ta1, [PAL.ta2, PAL.cream], { amount: 0.3 });
  // The grassy bank of a terrace: all green, a shade darker than the tops,
  // so the far hills read as steps without stripes of bare earth.
  G3.defineBlock('town_bank', '#4c9344', ['#458a41', '#559c48', '#3f8040'], { amount: 0.5, seed: 4 });
  G3.defineBlock('town_meadow', '#62a94a', ['#6bb04c', '#58a046', '#6bb04c'], { amount: 0.4, seed: 2 });
})();

const TOWN_ART = {
  // G3.merged, with every face checked to be wound so that it points along
  // its normal (a face wound the other way is culled and the box looks
  // hollow). Flips the ones that are not; does nothing if all are right.
  merged(boxes) {
    const m = G3.merged(boxes);
    const p = m.geometry.attributes.position.array, n = m.geometry.attributes.normal.array, ix = m.geometry.index.array;
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const dot = (uy * vz - uz * vy) * n[a] + (uz * vx - ux * vz) * n[a + 1] + (ux * vy - uy * vx) * n[a + 2];
      if (dot < 0) { ix[t + 1] = c / 3; ix[t + 2] = b / 3; }
    }
    m.geometry.index.needsUpdate = true;
    return m;
  },
  // ── Signs ───────────────────────────────────────────
  // Each sign is painted on a small canvas with the pixel font and shown
  // on the front of its board. w x h in texels; the board is `bw` blocks
  // wide and bw * h / w tall.
  SIGNS: {
    superette: { text: 'SUPERETTE', w: 80, h: 12, bg: PAL.or3, top: PAL.or2, bottom: null, color: PAL.white },
    fiskes:    { text: "FISKE'S",   w: 60, h: 12, bg: PAL.black, top: PAL.g5, bottom: null, color: PAL.ye2 },
    cvs:       { text: 'CVS',       w: 32, h: 12, bg: PAL.re2, top: PAL.re1, bottom: PAL.re3, color: PAL.white },
    trail:     { text: 'RAIL TRAIL', w: 88, h: 14, bg: PAL.gr5, border: PAL.cream, color: PAL.white },
  },
  paintSign(g, sp) {
    g.clearRect(0, 0, sp.w, sp.h);
    g.fillStyle = sp.bg; g.fillRect(0, 0, sp.w, sp.h);
    if (sp.top) { g.fillStyle = sp.top; g.fillRect(0, 0, sp.w, 1); }
    if (sp.bottom) { g.fillStyle = sp.bottom; g.fillRect(0, sp.h - 1, sp.w, 1); }
    if (sp.border) {
      g.fillStyle = sp.border;
      g.fillRect(0, 0, sp.w, 1); g.fillRect(0, sp.h - 1, sp.w, 1);
      g.fillRect(0, 0, 1, sp.h); g.fillRect(sp.w - 1, 0, 1, sp.h);
    }
    PX.withTarget(g, () => {
      PX.text(sp.text, sp.w / 2, Math.floor((sp.h - 8) / 2), { color: sp.color, font: 'bold', align: 'center' });
    });
  },
  // The flag on the Town Hall lawn: stripes and a blue corner.
  paintFlag(g) {
    for (let y = 0; y < 7; y++) { g.fillStyle = y % 2 ? PAL.white : PAL.re2; g.fillRect(0, y, 11, 1); }
    g.fillStyle = PAL.bl4; g.fillRect(0, 0, 5, 4);
    g.fillStyle = PAL.white; g.fillRect(1, 1, 1, 1); g.fillRect(3, 1, 1, 1); g.fillRect(2, 2, 1, 1);
  },

  // ── Car ─────────────────────────────────────────────
  // Faces +x, wheels on y = 0, about 2.4 blocks long. pal = { l, m, d }
  // (body light / mid / dark). Square wheels, of course.
  car(pal) {
    const b = [];
    const add = (x, y, z, w, h, d, c) => b.push({ x, y, z, w, h, d, c });
    add(0, 0.5, 0, 2.4, 0.5, 1.0, pal.m);                 // body
    add(0, 0.28, 0, 2.5, 0.12, 1.02, pal.d);              // sill and bumpers
    add(-0.1, 0.95, 0, 1.3, 0.42, 0.92, pal.l);           // cabin
    add(-0.1, 0.95, 0, 1.0, 0.26, 0.96, PAL.sk2);         // side windows
    add(-0.1, 0.95, 0, 1.34, 0.26, 0.76, PAL.sk2);        // windscreen and back window
    add(-0.1, 0.95, 0, 0.12, 0.3, 0.97, pal.l);           // door pillar
    for (const sx of [-0.72, 0.72]) for (const sz of [-0.46, 0.46]) {
      add(sx, 0.2, sz, 0.4, 0.4, 0.2, PAL.black);
      add(sx, 0.2, sz + Math.sign(sz) * 0.06, 0.16, 0.16, 0.12, PAL.g2);
    }
    add(1.2, 0.52, 0.3, 0.06, 0.16, 0.22, PAL.ye1);       // headlights
    add(1.2, 0.52, -0.3, 0.06, 0.16, 0.22, PAL.ye1);
    add(-1.2, 0.52, 0.3, 0.06, 0.14, 0.2, PAL.re3);       // tail lights
    add(-1.2, 0.52, -0.3, 0.06, 0.14, 0.2, PAL.re3);
    return TOWN_ART.merged(b);
  },

  // ── Bus ─────────────────────────────────────────────
  // Faces +x, about 4.2 blocks long. pal = { l, m, d, s } where s is the
  // stripe under the windows (dark on the yellow school bus, blue on the
  // white town bus).
  bus(pal) {
    const b = [];
    const add = (x, y, z, w, h, d, c) => b.push({ x, y, z, w, h, d, c });
    add(0, 0.95, 0, 4.2, 1.3, 1.15, pal.m);               // body
    add(0, 1.63, 0, 4.0, 0.08, 1.05, pal.l);              // roof
    add(0, 0.32, 0, 4.26, 0.12, 1.17, pal.d);             // sill
    add(0, 0.8, 0, 4.22, 0.14, 1.17, pal.s);              // stripe
    for (let i = 0; i < 5; i++) add(-1.6 + i * 0.74, 1.2, 0, 0.5, 0.44, 1.19, PAL.sk2);   // windows
    add(2.1, 1.2, 0, 0.06, 0.48, 0.9, PAL.sk2);           // windscreen
    for (const sx of [-1.35, 1.35]) for (const sz of [-0.52, 0.52]) {
      add(sx, 0.24, sz, 0.48, 0.48, 0.22, PAL.black);
      add(sx, 0.24, sz + Math.sign(sz) * 0.07, 0.18, 0.18, 0.12, PAL.g2);
    }
    add(2.1, 0.55, 0.36, 0.06, 0.16, 0.22, PAL.white);    // headlights
    add(2.1, 0.55, -0.36, 0.06, 0.16, 0.22, PAL.white);
    add(-2.1, 0.55, 0.36, 0.06, 0.16, 0.2, PAL.re2);      // tail lights
    add(-2.1, 0.55, -0.36, 0.06, 0.16, 0.2, PAL.re2);
    return TOWN_ART.merged(b);
  },

  // ── Walker ──────────────────────────────────────────
  // Faces +x, 1.25 blocks tall. pal = { h: hair, s: skin, c: shirt }.
  // stride = true is the frame with the legs apart.
  walker(pal, stride) {
    const b = [];
    const add = (x, y, z, w, h, d, c) => b.push({ x, y, z, w, h, d, c });
    if (stride) {
      add(0.14, 0.2, -0.09, 0.18, 0.4, 0.16, PAL.g5);
      add(-0.14, 0.2, 0.09, 0.18, 0.4, 0.16, PAL.g5);
    } else {
      add(0, 0.22, -0.09, 0.18, 0.44, 0.16, PAL.g5);
      add(0, 0.22, 0.09, 0.18, 0.44, 0.16, PAL.g5);
    }
    add(0, 0.66, 0, 0.26, 0.44, 0.42, pal.c);             // torso
    add(0, 1.05, 0, 0.34, 0.34, 0.34, pal.s);             // head
    add(-0.03, 1.2, 0, 0.36, 0.12, 0.38, pal.h);          // hair
    add(-0.15, 1.05, 0, 0.1, 0.3, 0.38, pal.h);
    return TOWN_ART.merged(b);
  },

  // ── Cyclist ─────────────────────────────────────────
  // Faces +x. pal = { c: jersey, e: helmet, s: skin }. The two frames
  // swap which leg is pushing down.
  biker(pal, frame) {
    const b = [];
    const add = (x, y, z, w, h, d, c) => b.push({ x, y, z, w, h, d, c });
    for (const sx of [-0.5, 0.5]) {
      add(sx, 0.25, 0, 0.5, 0.5, 0.1, PAL.black);         // square wheels
      add(sx, 0.25, 0, 0.18, 0.18, 0.14, PAL.g3);
    }
    add(0, 0.42, 0, 1.0, 0.08, 0.08, PAL.g1);             // frame
    add(0.42, 0.62, 0, 0.08, 0.4, 0.08, PAL.g1);          // fork and bars
    add(0.42, 0.82, 0, 0.1, 0.06, 0.4, PAL.black);
    add(-0.2, 0.56, 0, 0.26, 0.08, 0.16, PAL.black);      // saddle
    add(frame ? 0.05 : -0.08, 0.42, 0.1, 0.14, 0.36, 0.12, PAL.g5);    // legs
    add(frame ? -0.08 : 0.05, 0.46, -0.1, 0.14, 0.3, 0.12, PAL.g5);
    add(-0.06, 0.82, 0, 0.3, 0.42, 0.36, pal.c);          // torso, leaning forward
    add(0.16, 0.88, 0, 0.3, 0.12, 0.42, pal.c);           // arms
    add(0.1, 1.17, 0, 0.3, 0.3, 0.3, pal.s);              // head
    add(0.08, 1.3, 0, 0.36, 0.14, 0.34, pal.e);           // helmet
    return TOWN_ART.merged(b);
  },
};
