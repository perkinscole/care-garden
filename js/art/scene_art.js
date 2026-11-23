// ================================================================
// File: scene_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 22, 2026
// Description: Pixel-art sprite definitions for the scenery: the school's
//   windows (day and lit-at-night versions), the stars and the fireflies.
//   The big pieces (the school walls, the lawn, the trees, the clouds)
//   are painted with PX.rect and friends in js/scene.js.
//   Only PX.define(...) calls live here: no p5.js functions at load
//   time, so tools/sprites.html can show every sprite on its own.
// ================================================================

// ── School window ─────────────────────────────────────
// Four panes in a dark slate frame with a sill underneath. The sill (s)
// is recoloured to suit the wall it sits in. The anchor is the top-left
// corner so rows of windows are easy to line up.
//   f frame   h sky glint   b glass   d glass in shade   m glazing bar   s sill
const SCHOOL_WIN_ROWS = [
  'fffffffffff',
  'fhhbbmhhbbf',
  'fhbbbmhbbbf',
  'fbbbbmbbbbf',
  'fbbbdmbbbdf',
  'fbbddmbbddf',
  'fmmmmmmmmmf',
  'fhhbbmhhbbf',
  'fhbbbmhbbbf',
  'fbbbbmbbbbf',
  'fbbbdmbbbdf',
  'fbbddmbbddf',
  'fffffffffff',
  'sssssssssss',
];
PX.define('schoolWin', {
  pal: { f: PAL.sl3, h: PAL.sk2, b: PAL.sk3, d: PAL.sl1, m: PAL.g1, s: PAL.br1 },
  frames: [SCHOOL_WIN_ROWS],
  anchor: [0, 0],
});

// The same window with the lights on: only the glass and glazing bars,
// so it can be laid over the night-tinted building by PX.light().
PX.define('schoolWinLit', {
  pal: { h: PAL.white, b: PAL.ye1, d: PAL.ye2, m: PAL.ye4 },
  frames: [SCHOOL_WIN_ROWS.map(row => row.replace(/[fs]/g, '.'))],
  anchor: [0, 0],
});

// ── Stars ─────────────────────────────────────────────
// Three sizes of twinkle. The anchor is the middle of the star.
PX.define('star', {
  pal: { w: PAL.white, y: PAL.ye1, b: PAL.sk3 },
  frames: {
    dot:   ['.....', '.....', '..w..', '.....', '.....'],
    plus:  ['.....', '..b..', '.bwb.', '..b..', '.....'],
    flare: ['..b..', '..y..', 'bywyb', '..y..', '..b..'],
  },
  anchor: [2, 2],
});

// ── Firefly ───────────────────────────────────────────
// dim → glow → flash as it pulses. The anchor is the middle of the bug.
PX.define('firefly', {
  pal: { w: PAL.white, y: PAL.ye1, g: PAL.ye2, d: PAL.ye3 },
  frames: {
    dim:   ['.....', '.....', '..d..', '.....', '.....'],
    glow:  ['.....', '..g..', '.gyg.', '..g..', '.....'],
    flash: ['..g..', '.gyg.', 'gywyg', '.gyg.', '..g..'],
  },
  anchor: [2, 2],
});
