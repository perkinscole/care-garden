// ================================================================
// File: town_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Description: Pixel-art sprite definitions for the Holliston town backdrop.
//   Only PX.define(...) calls live here: no p5.js functions at load
//   time, so tools/sprites.html can show every sprite on its own.
//
//   Everything in the town is tiny (a person is 6 art pixels tall), so
//   these sprites have no ink outline: like the rest of the scenery they
//   use darker shades of their own colour for their edges.
// ================================================================

// ── Car ───────────────────────────────────────────────
// Faces right. The two frames only move the hubcap, so the wheels
// seem to turn. Recoloured per car: l/m/d = body light/mid/dark.
PX.define('townCar', {
  pal: {
    l: PAL.re1, m: PAL.re2, d: PAL.re3,
    w: PAL.sk2, k: PAL.black, h: PAL.g2, y: PAL.ye1, t: PAL.re4,
  },
  frames: [
    [
      '...llllll...',
      '..lwwmwwwl..',
      '.llllllllllm',
      'tmmmmmmmmmmy',
      'dkhddddddkhd',
      '.kk......kk.',
    ],
    [
      '...llllll...',
      '..lwwmwwwl..',
      '.llllllllllm',
      'tmmmmmmmmmmy',
      'dkkddddddkkd',
      '.hk......hk.',
    ],
  ],
});

// ── Bus ───────────────────────────────────────────────
// Faces right. s = the stripe under the windows (black on the yellow
// school bus, blue on the white town bus).
PX.define('townBus', {
  pal: {
    l: PAL.ye1, m: PAL.ye2, d: PAL.ye3, s: PAL.g5,
    w: PAL.sk2, k: PAL.black, h: PAL.g2, y: PAL.white, t: PAL.re2,
  },
  frames: [
    [
      '.llllllllllllllll.',
      'lmmmmmmmmmmmmmmmmm',
      'lwwmwwmwwmwwmwwmww',
      'lwwmwwmwwmwwmwwmww',
      'ssssssssssssssssss',
      'tmmmmmmmmmmmmmmmmy',
      'ddkhddddddddddkhdd',
      '..kk..........kk..',
    ],
    [
      '.llllllllllllllll.',
      'lmmmmmmmmmmmmmmmmm',
      'lwwmwwmwwmwwmwwmww',
      'lwwmwwmwwmwwmwwmww',
      'ssssssssssssssssss',
      'tmmmmmmmmmmmmmmmmy',
      'ddkkddddddddddkkdd',
      '..hk..........hk..',
    ],
  ],
});

// ── Walker ────────────────────────────────────────────
// Faces right. h = hair, s = skin, c = shirt, p = trousers.
PX.define('townWalker', {
  pal: { h: PAL.hrBrown, s: PAL.sn2, c: PAL.re2, p: PAL.g5 },
  frames: {
    stand: [
      '.hh.',
      '.hs.',
      '.cc.',
      '.cc.',
      '.pp.',
      '.pp.',
    ],
    stride: [
      '.hh.',
      '.hs.',
      '.cc.',
      '.cc.',
      '.pp.',
      'p..p',
    ],
  },
});

// ── Cyclist ───────────────────────────────────────────
// Faces right. e = helmet, c = jersey, p = leg, f = bike frame, k = tyres,
// g = hubs.
// The two frames swap which way the leg is pushing.
PX.define('townBiker', {
  pal: { e: PAL.re3, s: PAL.sn2, c: PAL.re2, p: PAL.g5, f: PAL.g1, b: PAL.black, k: PAL.black, g: PAL.g3 },
  frames: [
    [
      '....ee..',
      '....es..',
      '...cc...',
      '..ccss..',
      '..bp..f.',
      '.k.p..k.',
      'kgkffkgk',
      '.k....k.',
    ],
    [
      '....ee..',
      '....es..',
      '...cc...',
      '..ccss..',
      '..bpp.f.',
      '.k..p.k.',
      'kgkffkgk',
      '.k....k.',
    ],
  ],
});

// ── Trees ─────────────────────────────────────────────
// Street trees. Lit from the top left like everything else.
PX.define('townTree', {
  pal: { l: PAL.fo1, m: PAL.fo2, d: PAL.fo3, t: PAL.wo3 },
  frames: [[
    '..lll..',
    '.llmmm.',
    'llmmmmd',
    'lmmmmmd',
    'lmmmmdd',
    '.mmddd.',
    '..ddd..',
    '...t...',
    '...t...',
  ]],
});

PX.define('townPine', {
  pal: { l: PAL.fo2, m: PAL.fo3, d: PAL.fo4, t: PAL.wo3 },
  frames: [[
    '..l..',
    '.lm..',
    '.lmd.',
    'lmmd.',
    '.lmd.',
    'lmmdd',
    '.lmd.',
    'lmmdd',
    '..t..',
    '..t..',
  ]],
});

PX.define('townBush', {
  pal: { l: PAL.fo1, m: PAL.fo2, d: PAL.fo3 },
  frames: [[
    '.llm.',
    'lmmmd',
    'mmddd',
  ]],
});

// ── Street lamp ───────────────────────────────────────
// y = the glass, which drawTown() lights up at night.
PX.define('townLamp', {
  pal: { g: PAL.g5, y: PAL.cream },
  frames: [[
    'ggg',
    '.y.',
    '.g.',
    '.g.',
    '.g.',
    '.g.',
    '.g.',
  ]],
});

// ── Flag on the Town Hall pole ────────────────────────
// Anchored at its top-left corner, where it meets the pole.
PX.define('townFlag', {
  pal: { b: PAL.bl3, r: PAL.re2, w: PAL.white },
  anchor: [0, 0],
  frames: [
    [
      'bbbrrrr',
      'bbbwwww',
      'rrrrrrr',
      'wwwwwww',
      'rrrrrrr',
      '.......',
    ],
    [
      'bbbrr..',
      'bbbwwrr',
      'rrrrrww',
      'wwwwwrr',
      'rrrrrww',
      '.....rr',
    ],
  ],
});

// ── Cattails at the edge of Lake Winthrop ─────────────
PX.define('townReeds', {
  pal: { g: PAL.gr5, b: PAL.wo3 },
  frames: [[
    'b...b',
    'b.b.g',
    'g.b.g',
    'g.g.g',
  ]],
});
