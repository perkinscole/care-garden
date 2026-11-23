// ================================================================
// File: scene_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 23, 2026
// Description: Art data for the 3D scenery in js/scene.js: the block
//   lettering of the school sign, the extra block textures the school
//   is built from, and the colours of the flag and the little lawn
//   wildflowers. No p5.js functions are called at load time.
// ================================================================

// ── Sign lettering ────────────────────────────────────
// Bold capitals 8 pixels tall with two-pixel stems. On the school each
// "pixel" becomes a small white box standing proud of the wall, so the
// name reads from across the room.
const SIGN_GLYPHS = {
  R: ['111110', '110011', '110011', '110011', '111110', '110110', '110011', '110011'],
  O: ['011110', '110011', '110011', '110011', '110011', '110011', '110011', '011110'],
  B: ['111110', '110011', '110011', '111110', '110011', '110011', '110011', '111110'],
  E: ['111111', '110000', '110000', '111110', '110000', '110000', '110000', '111111'],
  T: ['111111', '001100', '001100', '001100', '001100', '001100', '001100', '001100'],
  A: ['011110', '110011', '110011', '110011', '111111', '110011', '110011', '110011'],
  D: ['111110', '110011', '110011', '110011', '110011', '110011', '110011', '111110'],
  M: ['1100011', '1110111', '1111111', '1101011', '1100011', '1100011', '1100011', '1100011'],
  S: ['011111', '110000', '110000', '011110', '000011', '000011', '000011', '111110'],
  I: ['1111', '0110', '0110', '0110', '0110', '0110', '0110', '1111'],
  L: ['110000', '110000', '110000', '110000', '110000', '110000', '110000', '111111'],
  C: ['011110', '110011', '110000', '110000', '110000', '110000', '110011', '011110'],
  H: ['110011', '110011', '110011', '111111', '110011', '110011', '110011', '110011'],
};

// ── Flag ──────────────────────────────────────────────
// 13 stripes; the blue canton covers the first FLAG_ART.cantonCols columns
// (counted from the pole) and the top FLAG_ART.cantonRows stripes.
const FLAG_ART = {
  cols: 12, rows: 13, cantonCols: 5, cantonRows: 7,
  red: PAL.re2, white: PAL.white, blue: PAL.bl3, star: PAL.white,
};

// Heads of the tiny wildflowers dotted through the grass
const WILDFLOWER_COLOURS = [PAL.white, PAL.ye2, PAL.pi2, PAL.pu1, PAL.white, PAL.ye1];

// ── Block textures for the school ─────────────────────
// (tools/sprites.html loads this file without the 3D engine)
if (typeof G3 !== 'undefined') {
  // White cladding panels, one per block, with a grey joint between them
  G3.defineBlock('panel_white', PAL.white, [PAL.g1, PAL.cream], {
    amount: 0.22, seed: 4,
    paint: g => { g.fillStyle = PAL.g2; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); },
  });
  // Gravel on the flat roofs
  G3.defineBlock('roof_flat', PAL.g4, [PAL.g3, PAL.g5, PAL.g4], { amount: 0.4, seed: 11 });
  // The dark board behind the sign lettering
  G3.defineBlock('sign_board', PAL.br4, [PAL.br5, PAL.br4], { amount: 0.3, seed: 2 });
}
