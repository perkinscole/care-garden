// ================================================================
// File: ui_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 22, 2026
// Description: Pixel-art sprite definitions for the dashboard, cards and speech bubbles.
//   Only PX.define(...) calls live here: no p5.js functions at load
//   time, so tools/sprites.html can show every sprite on its own.
// ================================================================

// ── Little flowers ────────────────────────────────────
// A four-petal flower head, 7x7. Recolour the petals at draw time with
// { pal: { p: ..., s: ... } } (p = petal, s = petal shadow).
PX.define('ui_flower', {
  pal: { o: PAL.ink, p: PAL.pi2, s: PAL.pi3, y: PAL.ye2, c: PAL.ye3 },
  anchor: [3, 3],
  frames: [
    '.oo.oo.',
    'oppoppo',
    'oppyppo',
    '.oyyco.',
    'oppcpso',
    'opsosso',
    '.oo.oo.',
  ],
});

// The same flower on a stem with two leaves; the anchor is the stem bottom.
// Two frames: standing straight and leaning one pixel (a gentle sway).
PX.define('ui_sprout', {
  pal: { o: PAL.ink, p: PAL.pi2, s: PAL.pi3, y: PAL.ye2, c: PAL.ye3, g: PAL.gr3, l: PAL.gr2, d: PAL.gr4 },
  anchor: [4, 13],
  frames: [
    [
      '..oo.oo..',
      '.oppoppo.',
      '.oppyppo.',
      '..oyyco..',
      '.oppcpso.',
      '.opsosso.',
      '..oogoo..',
      '....g....',
      '.ll.g....',
      'olllg.ll.',
      '.oddgllld',
      '...ogddo.',
      '....g....',
    ],
    [
      '...oo.oo.',
      '..oppoppo',
      '..oppyppo',
      '...oyyco.',
      '..oppcpso',
      '..opsosso',
      '...oogoo.',
      '....g....',
      '.ll.g....',
      'olllg.ll.',
      '.oddgllld',
      '...ogddo.',
      '....g....',
    ],
  ],
});

// A tiny bud for tight corners, 3x3.
PX.define('ui_bud', {
  pal: { p: PAL.pi2, y: PAL.ye2 },
  anchor: [1, 1],
  frames: [
    '.p.',
    'pyp',
    '.p.',
  ],
});

// ── Vine leaves ───────────────────────────────────────
// Leaves that sprout from the vines on the panel frames. 'up' grows above a
// horizontal vine and 'down' below it; 'out' grows sideways from a vertical
// vine (authored pointing right; flip for the other side).
PX.define('ui_leaf', {
  pal: { l: PAL.gr2, d: PAL.gr4, h: PAL.gr1 },
  anchor: [0, 0],
  frames: {
    up:   ['.hl.', 'hlld', '.ld.'],
    down: ['.ll.', 'hlld', '.dd.'],
    out:  ['.hl.', 'hll.', 'lld.'],
  },
});

// ── Icons ─────────────────────────────────────────────
// Magnifying glass for the I SPY header.
PX.define('ui_magnifier', {
  pal: { o: PAL.ink, b: PAL.wa1, h: PAL.white, s: PAL.wa2, w: PAL.wo1, d: PAL.wo3 },
  anchor: [0, 0],
  frames: [
    '..ooo....',
    '.obbbo...',
    'obhbbso..',
    'obbbbso..',
    'obbbsso..',
    '.osssoo..',
    '..ooowdo.',
    '.....owdo',
    '......oo.',
  ],
});

// Camera for the empty smile gallery; frame 1 is the flash going off.
PX.define('ui_camera', {
  pal: { o: PAL.ink, g: PAL.g1, h: PAL.white, d: PAL.g3, k: PAL.g5, q: PAL.g4, b: PAL.sk5, s: PAL.sk6,
         y: PAL.ye2, r: PAL.re2, w: PAL.white },
  frames: [
    [
      '.........................',
      '.........................',
      '.......ooooooo...........',
      '......okkkkkkko...ooo....',
      '.oooooodddddddooooyyyooo.',
      'ohhhhhhhhhhhhhhhhhhhhhhho',
      'ogggggggggggggggggggggrgo',
      'oggggggggooooooggggggggdo',
      'oggggggooqqqqqqooggggggdo',
      'ogggggooqbbbbbbqoogggggdo',
      'ogggggoqbwwbbbbbqogggggdo',
      'ogggggoqbwbbbbbbqogggggdo',
      'ogggggoqbbbbbbbsqogggggdo',
      'ogggggoqbbbbbbssqogggggdo',
      'ogggggooqbbbsssqoogggggdo',
      'oggggggooqqqqqqooggggggdo',
      'oggggggggooooooggggggggdo',
      'oddddddddddddddddddddddko',
      '.ooooooooooooooooooooooo.',
    ],
    [
      '...................w.....',
      '................w..w..w..',
      '.......ooooooo...wwwww...',
      '......okkkkkkko.wwwwwww..',
      '.oooooodddddddooowwwwwoo.',
      'ohhhhhhhhhhhhhhhhhhhhhhho',
      'ogggggggggggggggggggggrgo',
      'oggggggggooooooggggggggdo',
      'oggggggooqqqqqqooggggggdo',
      'ogggggooqbbbbbbqoogggggdo',
      'ogggggoqbwwbbbbbqogggggdo',
      'ogggggoqbwbbbbbbqogggggdo',
      'ogggggoqbbbbbbbsqogggggdo',
      'ogggggoqbbbbbbssqogggggdo',
      'ogggggooqbbbsssqoogggggdo',
      'oggggggooqqqqqqooggggggdo',
      'oggggggggooooooggggggggdo',
      'oddddddddddddddddddddddko',
      '.ooooooooooooooooooooooo.',
    ],
  ],
});

// Heart that sits beside the tagline.
PX.define('ui_heart', {
  pal: { o: PAL.ink, r: PAL.re2, h: PAL.re1, d: PAL.re3 },
  anchor: [3, 0],
  frames: [
    '.oo.oo.',
    'ohrorro',
    'orrrrdo',
    '.orrdo.',
    '..odo..',
    '...o...',
  ],
});

// Strip of sticky tape that holds a polaroid up.
PX.define('ui_tape', {
  pal: { t: PAL.ye1, s: PAL.ye2 },
  anchor: [3, 1],
  frames: [
    'tttttts',
    '.ttttss',
  ],
});
