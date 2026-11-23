// ================================================================
// File: animals_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Description: Pixel-art sprite definitions for the ram, goose, cat, rabbit and groundhog.
//   Only PX.define(...) calls live here: no p5.js functions at load
//   time, so tools/sprites.html can show every sprite on its own.
// ================================================================

// ── Rabbit ────────────────────────────────────────────
// Faces right. sit = resting, crouch = about to spring, leap = mid-hop.
PX.define('rabbit', {
  pal: { o: PAL.ink, w: PAL.g1, s: PAL.g2, h: PAL.white, p: PAL.pi2, e: PAL.black, n: PAL.pi3 },
  frames: {
    sit: [
      '.........oo.o.',
      '........owpopo',
      '........owpopo',
      '........owpowo',
      '........owwwo.',
      '....ooooowwwwo',
      '..oowwwwwwewwo',
      '.owwwwwwwwwwno',
      'ohowwwwwwwwwo.',
      'ohhswwwwwwso..',
      '.oosswwssoo...',
      '..oooooooo....',
    ],
    crouch: [
      '..............',
      '..............',
      '......ooooo...',
      '.....owpwpwo..',
      '......oooowwo.',
      '....ooooowwwwo',
      '..oowwwwwwewwo',
      '.owwwwwwwwwwno',
      'ohowwwwwwwwwo.',
      'ohhswwwwwwso..',
      '.oosswwssoo...',
      '..oooooooo....',
    ],
    leap: [
      '......ooooo...',
      '.....owpwpwo..',
      '......oooowwo.',
      '...oooooowwwwo',
      '.oowwwwwwwewwo',
      'ohwwwwwwwwwwno',
      'ohhwwwwwwwwwo.',
      '.oswwwwwwsso..',
      'oswoo...oswo..',
      'ooo.....oooo..',
      '..............',
      '..............',
    ],
  },
});
