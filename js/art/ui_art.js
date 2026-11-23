// ================================================================
// File: ui_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 23, 2026
// Description: Block-art sprite definitions for the dashboard, cards and speech bubbles.
//   Only PX.define(...) calls live here: no p5.js functions at load
//   time, so tools/sprites.html can show every sprite on its own.
//   CARE Garden 2: everything is built from squares, with no outlines
//   and no curves (see docs/PIXEL_ART.md, "Block style").
// ================================================================

// ── Little flowers ────────────────────────────────────
// A block flower head, 7x7: four petal blocks around a square centre.
// Recolour the petals at draw time with { pal: { p: ..., s: ... } }
// (p = petal, s = petal in shade).
PX.define('ui_flower', {
  pal: { p: PAL.pi2, s: PAL.pi3, y: PAL.ye2, c: PAL.ye3 },
  anchor: [3, 3],
  frames: [
    '..ppp..',
    '..ppp..',
    'ppyyyss',
    'ppyycss',
    'ppyccss',
    '..sss..',
    '..sss..',
  ],
});

// A smaller flower on a two-pixel post with two square leaves; the anchor
// is the stem bottom. Two frames: standing straight and with the head
// shifted one pixel (a gentle sway).
PX.define('ui_sprout', {
  pal: { p: PAL.pi2, s: PAL.pi3, y: PAL.ye2, c: PAL.ye3, g: PAL.gr3, l: PAL.gr2, d: PAL.gr4 },
  anchor: [4, 13],
  frames: [
    [
      '...pp...',
      '...pp...',
      '.ppyyss.',
      '.ppycss.',
      '...ss...',
      '...ss...',
      '...gg...',
      '.llgg...',
      '.ldgg...',
      '...ggll.',
      '...ggld.',
      '...gg...',
      '...gg...',
    ],
    [
      '....pp..',
      '....pp..',
      '..ppyyss',
      '..ppycss',
      '....ss..',
      '....ss..',
      '...gg...',
      '.llgg...',
      '.ldgg...',
      '...ggll.',
      '...ggld.',
      '...gg...',
      '...gg...',
    ],
  ],
});

// A tiny square bud for tight corners, 3x3.
PX.define('ui_bud', {
  pal: { p: PAL.pi2, y: PAL.ye2 },
  anchor: [1, 1],
  frames: [
    'ppp',
    'pyp',
    'ppp',
  ],
});

// ── Vine leaves ───────────────────────────────────────
// A square leaf block, 4x4, that grows from the vines on the panel frames.
PX.define('ui_leaf', {
  pal: { l: PAL.gr2, d: PAL.gr4, h: PAL.gr1 },
  anchor: [0, 0],
  frames: [
    'hhhl',
    'hlld',
    'hlld',
    'lddd',
  ],
});

// ── Icons ─────────────────────────────────────────────
// Magnifying glass for the I SPY header: a square lens on a block handle.
PX.define('ui_magnifier', {
  pal: { o: PAL.g5, b: PAL.wa1, h: PAL.white, s: PAL.wa2, w: PAL.wo2, d: PAL.wo4 },
  anchor: [0, 0],
  frames: [
    'ooooooo..',
    'obbbbbo..',
    'obhhbbo..',
    'obhbbbo..',
    'obbbbso..',
    'obbbsso..',
    'ooooooo..',
    '.......ww',
    '.......wd',
  ],
});

// Camera for the empty smile gallery, built of blocks with a square lens;
// frame 1 is the flash going off.
PX.define('ui_camera', {
  pal: { g: PAL.g1, h: PAL.white, d: PAL.g3, k: PAL.g5, q: PAL.g4, b: PAL.sk5, s: PAL.sk6,
         y: PAL.ye2, r: PAL.re2, w: PAL.white },
  frames: [
    [
      '.........................',
      '.........................',
      '......ddddddddd...yyyy...',
      '......dkkkkkkkd...yyyy...',
      'hhhhhhhhhhhhhhhhhhhhhhhhd',
      'hggggggggggggggggggggrrgd',
      'hggggggqqqqqqqqqqqggggggd',
      'hggggggqbbbbbbbbbqggggggd',
      'hggggggqbwwbbbbbbqggggggd',
      'hggggggqbwwbbbbbbqggggggd',
      'hggggggqbbbbbbbbbqggggggd',
      'hggggggqbbbbbbbbbqggggggd',
      'hggggggqbbbbbbbssqggggggd',
      'hggggggqbbbbbbbssqggggggd',
      'hggggggqbbbbbssssqggggggd',
      'hggggggqbbbbbssssqggggggd',
      'hggggggqqqqqqqqqqqggggggd',
      'hgggggggggggggggggggggggd',
      'ddddddddddddddddddddddddd',
    ],
    [
      '................wwwwwwww.',
      '................wwwwwwww.',
      '......ddddddddd.wwwwwwww.',
      '......dkkkkkkkd.wwwwwwww.',
      'hhhhhhhhhhhhhhhhhhhhhhhhd',
      'hggggggggggggggggggggrrgd',
      'hggggggqqqqqqqqqqqggggggd',
      'hggggggqbbbbbbbbbqggggggd',
      'hggggggqbwwbbbbbbqggggggd',
      'hggggggqbwwbbbbbbqggggggd',
      'hggggggqbbbbbbbbbqggggggd',
      'hggggggqbbbbbbbbbqggggggd',
      'hggggggqbbbbbbbssqggggggd',
      'hggggggqbbbbbbbssqggggggd',
      'hggggggqbbbbbssssqggggggd',
      'hggggggqbbbbbssssqggggggd',
      'hggggggqqqqqqqqqqqggggggd',
      'hgggggggggggggggggggggggd',
      'ddddddddddddddddddddddddd',
    ],
  ],
});

// Stepped block heart that sits beside the tagline.
PX.define('ui_heart', {
  pal: { r: PAL.re2, h: PAL.re1, d: PAL.re3 },
  anchor: [3, 0],
  frames: [
    'hrr.rrr',
    'rrr.rrd',
    'rrrrrrd',
    'rrrrrdd',
    '..rrd..',
    '..rdd..',
  ],
});

// A little peg block that holds a photo frame up.
PX.define('ui_tape', {
  pal: { t: PAL.ye1, s: PAL.ye2, d: PAL.ye3 },
  anchor: [2, 1],
  frames: [
    'tttts',
    'tsssd',
    'sdddd',
  ],
});
