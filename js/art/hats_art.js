// ================================================================
// File: hats_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 22, 2026
// Description: Pixel-art sprite definitions for hats and face decorations.
//   Only PX.define(...) calls live here: no p5.js functions at load
//   time, so tools/sprites.html can show every sprite on its own.
//
//   Every decoration comes in two sizes: a large one drawn for a face
//   about 20 art pixels wide and a small one (name ending in "_s") for
//   a face about 14 wide. js/facedetection.js picks whichever fits a
//   real face best and enlarges it by a whole number.
//
//   The anchor of each sprite is the point that sits on the middle of
//   the wearer's forehead (the "hat line"), not the bottom of the sprite.
// ================================================================

// ── Explorer hat: orange safari hat with a brown band ──
PX.define('hat_explorer', {
  pal: { o: PAL.ink, l: PAL.ye2, m: PAL.ye3, d: PAL.ye4, b: PAL.br3, c: PAL.br2 },
  anchor: [18, 13],
  frames: [
    [
      '..............ooo..ooo..............',
      '...........ooommmoommmooo...........',
      '.........oommmmmmddmmmmmdoo.........',
      '........ommllllllmdmmmmmdddo........',
      '.......ommlllllllldmmmmmddddo.......',
      '.......ommllllllllmmmmmmddddo.......',
      '.......ommmllllllmmmmmmmddddo.......',
      '.......ommmmmmmmmmmmmmmmddddo.......',
      '.......ommmmmmmmmmmmmmmmddddo.......',
      '....oooommmmmmmmmmmmmmmmddddoooo....',
      '..oollllbbbbbbbbbbbbbbbbbbbblllloo..',
      '.ommmmmmbbbbbbbbbbbbbbbbbbbbmmmmmmo.',
      'odmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmdo',
      '.oddmmmmmmmmmmmmmmmmmmmmmmmmmmmmddo.',
      '..oodddddmmmmmmmmmmmmmmmmmmdddddoo..',
      '....oooooddddddddddddddddddooooo....',
      '.........oooooooooooooooooo.........',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('hat_explorer_s', {
  pal: { o: PAL.ink, l: PAL.ye2, m: PAL.ye3, d: PAL.ye4, b: PAL.br3, c: PAL.br2 },
  anchor: [13, 9],
  frames: [
    [
      '.........ooo..ooo.........',
      '.......oommmoommmoo.......',
      '......omllllddmmmddo......',
      '.....omllllllmmmmdddo.....',
      '.....ommllllmmmmmdddo.....',
      '.....ommmmmmmmmmmdddo.....',
      '..oooommmmmmmmmmmdddoooo..',
      '.ommmmbbbbbbbbbbbbbbmmmmo.',
      'odmmmmmmmmmmmmmmmmmmmmmmdo',
      '.oddddmmmmmmmmmmmmmmddddo.',
      '..ooooddddddddddddddoooo..',
      '......oooooooooooooo......',
    ],
  ],
});

// ── Black wide-brim hat with a chin cord ──
PX.define('hat_black', {
  pal: { o: PAL.ink, l: PAL.g4, m: PAL.g5, d: PAL.black },
  anchor: [20, 11],
  frames: [
    [
      '..............oooooooooooo..............',
      '.............ollllllllllllo.............',
      '............ollmmmmmmmmmmmmo............',
      '............ollmmmmmmmmmmmmo............',
      '............ollmmmmmmmmmmmmo............',
      '...........ollmmmmmmmmmmmmmmo...........',
      '...........ollmmmmmmmmmmmmmmo...........',
      '......oooooollmmmmmmmmmmmmmmoooooo......',
      '..oooolllllllmmmmmmmmmmmmmmmmllllloooo..',
      '.olllllllllllddddddddddddddddlllllllllo.',
      'odmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmdo',
      '.oddddmmmmmmmmmmmmmmmmmmmmmmmmmmmmddddo.',
      '..ooooddddddddddddddddddddddddddddoooo..',
      '......oooooooooooooooooooooooooooo......',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........o......................o........',
      '........oo....................oo........',
      '.........o....................o.........',
      '.........oo..................oo.........',
      '..........o..................o..........',
      '...........o................o...........',
      '...........ooo............ooo...........',
      '.............oo....o.....oo.............',
      '...............oo.olo..oo...............',
      '...................oo...................',
      '...................oo...................',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('hat_black_s', {
  pal: { o: PAL.ink, l: PAL.g4, m: PAL.g5, d: PAL.black },
  anchor: [14, 8],
  frames: [
    [
      '..........oooooooo..........',
      '.........ollllllllo.........',
      '........olmmmmmmmmmo........',
      '........olmmmmmmmmmo........',
      '........olmmmmmmmmmo........',
      '..oooooolmmmmmmmmmmmoooooo..',
      '.ollllllldddddddddddllllllo.',
      'odmmmmmmmmmmmmmmmmmmmmmmmmdo',
      '.odddddddmmmmmmmmmmdddddddo.',
      '..oooooooddddddddddooooooo..',
      '.....o...oooooooooo...o.....',
      '.....o................o.....',
      '.....o................o.....',
      '.....o................o.....',
      '.....o................o.....',
      '.....o................o.....',
      '.....o................o.....',
      '.....o................o.....',
      '.....o................o.....',
      '.....o................o.....',
      '.....o................o.....',
      '.....oo..............oo.....',
      '......o..............o......',
      '......oo............oo......',
      '.......oo..........oo.......',
      '........oo........oo........',
      '..........oo.oo.oo..........',
      '.............oo.............',
    ],
  ],
});

// ── Big floppy straw sun hat ──
PX.define('hat_sun', {
  pal: { o: PAL.ink, l: PAL.ta1, m: PAL.ta2, d: PAL.ta3, w: PAL.ta4 },
  anchor: [22, 11],
  frames: [
    [
      '...................oooooo...................',
      '.................oomdddddoo.................',
      '................ommmmmmddddo................',
      '...............olllllmmmmdddo...............',
      '..............ollllllldmmddddo..............',
      '.............omlllllllmmmmddddo.............',
      '.............ommmlllldmmmdmdddo.............',
      '............ommmmmmmmmmmmmmddddo............',
      '..........ooowdwdwdwdwdwdwdwdwdooo..........',
      '........oolllwdwdwdwdwdwdwdwdwdllloo........',
      '......oolllllllllllllllllllllllllllloo......',
      '....oolllllmmmmmwwmwwmwwmwwmwmmmmllllloo....',
      '...ollllmmwwdddmmmmmdddmmmmmmddwwmmmllllo...',
      '..olllmwwmmdoooddmddoooddddddooddmwwmmlllo..',
      '.olldddddddo...oodoo...oooooo..oodddddddllo.',
      'olldooooooo......o...............ooooooodllo',
      'oloo....................................odlo',
      '.o.......................................oo.',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('hat_sun_s', {
  pal: { o: PAL.ink, l: PAL.ta1, m: PAL.ta2, d: PAL.ta3, w: PAL.ta4 },
  anchor: [16, 8],
  frames: [
    [
      '..............oooo..............',
      '............oomdddoo............',
      '...........omlmmmdddo...........',
      '..........olllllmmmddo..........',
      '.........odmllllmmddddo.........',
      '.........ommmmmmmmmmddo.........',
      '......oooldwdwdwdwdwdwlooo......',
      '....oolllllmmmmmmmmmmllllloo....',
      '..oolllmwddwmwwdddmwwmdwmllloo..',
      '.olldwmwdooddddoooddddoddwwmllo.',
      'olloodddo..oooo...oooo.oodddollo',
      'olo..ooo.................ooo.olo',
      '.o............................o.',
    ],
  ],
});

// ── Yellow cowboy hat with a black band ──
PX.define('hat_cowboy', {
  pal: { o: PAL.ink, l: PAL.ye1, m: PAL.ye2, d: PAL.ye3, b: PAL.g5, c: PAL.g3 },
  anchor: [20, 13],
  frames: [
    [
      '..............oooo....oooo..............',
      '.............ommmmo..ommmdo.............',
      '............ollllmmoommmmddo............',
      '...........olllllmmdmmmmmdddo...........',
      '...........olllllmmdmmmmmdddo...........',
      '.o.........olllllmmdmmmmmdddo.........o.',
      'oloo.......olllllmmdmmmmmdddo.......oolo',
      'omlloo.....olllllmmmmmmmmdddo.....oollmo',
      'odmllloo..ollllllmmmmmmmmddddo..oolllmdo',
      '.oddmlllooommmmmmmmmmmmmmddddooolllmddo.',
      '..oodmmllllbcbbcbbcbbcbbcbbcbllllmmdoo..',
      '....oddmmllbbbbbbbbbbbbbbbbbbllmmddo....',
      '.....oodmmmbbbbbbbbbbbbbbbbbbmmmdoo.....',
      '.......odddmmmmmmmmmmmmmmmmmmdddo.......',
      '........oooddddmmmmmmmmmmddddooo........',
      '...........ooooddddddddddoooo...........',
      '...............oooooooooo...............',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('hat_cowboy_s', {
  pal: { o: PAL.ink, l: PAL.ye1, m: PAL.ye2, d: PAL.ye3, b: PAL.g5, c: PAL.g3 },
  anchor: [14, 10],
  frames: [
    [
      '.........oooo..oooo.........',
      '........ommmmoommddo........',
      '........olllmmmmmddo........',
      '.......ollllmdmmmdddo.......',
      '.o.....ollllmdmmmdddo.....o.',
      'olo....ollllmmmmmdddo....olo',
      'odloo..ollllmmmmmdddo..ooldo',
      '.odllooommmmmmmmmdddooolldo.',
      '..odmlllbcbbcbbcbbcblllmdo..',
      '...oddmbbbbbbbbbbbbbbmddo...',
      '....oodddmmmmmmmmmmdddoo....',
      '......oooddddddddddooo......',
      '.........oooooooooo.........',
    ],
  ],
});

// ── Flat-crowned straw hat ──
PX.define('hat_straw', {
  pal: { o: PAL.ink, l: PAL.ta2, m: PAL.wo1, d: PAL.wo2 },
  anchor: [19, 11],
  frames: [
    [
      '.............oooooooooooo.............',
      '..........ooommmllllllmmmooo..........',
      '.........omllllllllllllllllmo.........',
      '.........omlllllllllllllllldo.........',
      '.........ommmmmmllllllmmmmddo.........',
      '.........ommmmmmmmmmmmmmmmddo.........',
      '.........olmlmlmlmlmlmlmlmddo.........',
      '....oooooommmmmmmmmmmmmmmmddoooooo....',
      '..oolllllllmlmlmlmlmlmlmlmddlllllloo..',
      '.ollllllllddddddddddddddddddllllllllo.',
      'odmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmdo',
      '.oddmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmddo.',
      '..ooddddddlmlmlmlmlmlmlmlmlmddddddoo..',
      '....ooooooddddddddddddddddddoooooo....',
      '..........oooooooooooooooooo..........',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('hat_straw_s', {
  pal: { o: PAL.ink, l: PAL.ta2, m: PAL.wo1, d: PAL.wo2 },
  anchor: [13, 8],
  frames: [
    [
      '........oooooooooo........',
      '......oommmllllmmmoo......',
      '.....omllllllllllllmo.....',
      '.....ommmmmllllmmmddo.....',
      '.....ommmmmmmmmmmmddo.....',
      '..oooolmlmlmlmlmlmddoooo..',
      '.ollllddddddddddddddllllo.',
      'odmmmmmmmmmmmmmmmmmmmmmmdo',
      '.oddddlmlmlmlmlmlmlmddddo.',
      '..ooooddddddddddddddoooo..',
      '......oooooooooooooo......',
    ],
  ],
});

// ── Yellow rain hat ──
PX.define('hat_rain', {
  pal: { o: PAL.ink, l: PAL.ye1, m: PAL.ye2, d: PAL.ye3 },
  anchor: [18, 11],
  frames: [
    [
      '...............oooooo...............',
      '.............ooddddddoo.............',
      '...........oommmmmdddddoo...........',
      '..........omllllmmmmmddddo..........',
      '.........omllllllldmmmddddo.........',
      '........ommlllllllmmmmdddddo........',
      '........ommmllllmmdmmmmddddo........',
      '........ommmmmmmmmmmmmmddddo........',
      '.......ommmmmmmmmmdmmmmdddddo.......',
      '........oooolllllllllllloooo........',
      '......oollllmmmmmmmmmmmmlllloo......',
      '...ooollmmmmmmddddddddmmmmmmllooo...',
      '.oolllmmmdddddoooooooodddddmmmllloo.',
      'ollmmddddooooo........oooooddddmmllo',
      'omdddoooo..................oooodddmo',
      'odooo..........................ooodo',
      '.o................................o.',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('hat_rain_s', {
  pal: { o: PAL.ink, l: PAL.ye1, m: PAL.ye2, d: PAL.ye3 },
  anchor: [13, 8],
  frames: [
    [
      '..........oooooo..........',
      '.........oddddddo.........',
      '.......oommmmddddoo.......',
      '......omlllllmmmdddo......',
      '......omllllmdmmdddo......',
      '.....ommmmmmmmmmmdddo.....',
      '....ooollllllllllllooo....',
      '..oolllmmddddddddmmllloo..',
      '.ollmddddooooooooddddmllo.',
      'oldddoooo........oooodddlo',
      '.oooo................oooo.',
    ],
  ],
});

// ── Blue bucket hat ──
PX.define('hat_bucket', {
  pal: { o: PAL.ink, l: PAL.bl1, m: PAL.bl2, d: PAL.bl3, w: PAL.white, y: PAL.ye2 },
  anchor: [15, 11],
  frames: [
    [
      '........oooooooooooooo........',
      '.......ommmmmmmmmmmmmdo.......',
      '......ommllllmmmmmmmmddo......',
      '......ommllllmmmmmmmmddo......',
      '.....ommmllllmmmmmwmmdddo.....',
      '.....ommmmmmmmmmmwywmdddo.....',
      '.....ommmmmmmmmmmmwmmdddo.....',
      '....ommmmmmmmmmmmmmmmddddo....',
      '....ommmmmmmmmmmmmmmmddddo....',
      '....oddddddddddddddddddddo....',
      '...ommmmmmmmmmmmmmmmmmmmddo...',
      '..ommmmmmmmmmmmmmmmmmmmmdddo..',
      '.olmlmlmlmlmlmlmlmlmlmlmldldo.',
      '..ooooommmmmmmmmmmmmmmmooooo..',
      '.......oooooooooooooooo.......',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('hat_bucket_s', {
  pal: { o: PAL.ink, l: PAL.bl1, m: PAL.bl2, d: PAL.bl3, w: PAL.white, y: PAL.ye2 },
  anchor: [11, 7],
  frames: [
    [
      '......oooooooooo......',
      '.....ommmmmmmmmdo.....',
      '....ommlllmmmmmddo....',
      '....ommmmmmmwmmddo....',
      '...ommmmmmmmywmdddo...',
      '...ommmmmmmmmmmdddo...',
      '...oddddddddddddddo...',
      '..ommmmmmmmmmmmmmddo..',
      '.olmlmlmlmlmlmlmldldo.',
      '..oooooooooooooooooo..',
    ],
  ],
});

// ── Flower crown: a vine wreath with five blossoms ──
PX.define('deco_flowers', {
  pal: { o: PAL.ink, v: PAL.gr3, V: PAL.gr4, g: PAL.gr2, y: PAL.ye2,
         p: PAL.pi2, P: PAL.pi3, w: PAL.white, W: PAL.g2, u: PAL.pu1, U: PAL.pu2,
         r: PAL.or1, R: PAL.or2, b: PAL.bl1, B: PAL.bl2 },
  anchor: [13.5, 7],
  frames: [
    [
      '...........................',
      '............ooo............',
      '......ooo..opppo..ooo......',
      '.....owwwoopppppoorrro.....',
      '.oooowwwwwoppypPorrrrroooo.',
      'oguuowwywWvpppPPvrryrRobbgo',
      'ouyyUwwwWWVVpPPVVrrrRRbyyBo',
      'ouyyUowWWoogooogoorRRobyyBo',
      '.oUUo.ooo..o...o..ooo.oBBo.',
      '..oo...................oo..',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('deco_flowers_s', {
  pal: { o: PAL.ink, v: PAL.gr3, V: PAL.gr4, g: PAL.gr2, y: PAL.ye2,
         p: PAL.pi2, P: PAL.pi3, w: PAL.white, W: PAL.g2, u: PAL.pu1, U: PAL.pu2,
         r: PAL.or1, R: PAL.or2, b: PAL.bl1, B: PAL.bl2 },
  anchor: [9.5, 4],
  frames: [
    [
      '.......opppo.......',
      '......opppppo......',
      '.o.ooooppypPoooo.o.',
      'ogowwgvpppPPvgrrogo',
      'ovwyyWogpPPgoryyRvo',
      '.owyyWoooooooryyRo.',
      '..oWWo.......oRRo..',
      '...oo.........oo...',
    ],
  ],
});

// ── Ram horns on a woolly cap (Go Rams!) ──
PX.define('deco_ram', {
  pal: { o: PAL.ink, w: PAL.white, s: PAL.g2, l: PAL.ta1, m: PAL.ta2, d: PAL.ta3 },
  anchor: [21, 11],
  frames: [
    [
      '....................oo....................',
      '...............ooooowwooooo...............',
      '..............owwwwwwwwwwwwo..............',
      '............oowwwwwwwwwwwwwwoo............',
      '...........owwwwwwwswwwwwwwwwwo...........',
      '..........oowwwwwwwwswwwwswwwwoo..........',
      '.........owwwwswwwwwwwwwswwwwwwwo.........',
      '.....oooowwwwwwswwwwwswwwwwssssssoooo.....',
      '...ooooooooowwwwwwwwwwwwwwwsssooooooooo...',
      '..ooollldllmowwwwswwwwswwwwssomlldlllooo..',
      '.oollmmmdmmmowwwwwwwwwwwwwwssommmdmmmlloo.',
      '.ooldmooooooowsswwsswwsswwsssooooooomdloo.',
      '.oolmooooooossoossoossoossoossooooooomloo.',
      '.ooddoooooo.oo..oo..oo..oo..oo.ooooooddoo.',
      '.oolmooldmoo..................oomdloomloo.',
      '.oolmmoommoo..................oommoommloo.',
      '.oodmmmdmdoo..................oodmdmmmdoo.',
      '..ooddmdooo....................ooodmddoo..',
      '...ooooooo......................ooooooo...',
      '....oooo..........................oooo....',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('deco_ram_s', {
  pal: { o: PAL.ink, w: PAL.white, s: PAL.g2, l: PAL.ta1, m: PAL.ta2, d: PAL.ta3 },
  anchor: [15, 8],
  frames: [
    [
      '..............................',
      '............oooooo............',
      '.........ooowwwwwwooo.........',
      '........owwwwwwwwwwwwo........',
      '.......owwswwwwswwwwwwo.......',
      '...oooowwwwswwwwswwssssoooo...',
      '..ooooooowwwwwwwwwwssooooooo..',
      '.oolldlmowwwwswwwwwssomldlloo.',
      'oolmmoooosswwsswwssssoooommloo',
      'ooldooooooossoossoossooooodloo',
      'oolooooo...oo..oo..oo.oooooloo',
      'oolmoomoo............oomoomloo',
      'oodmdmdoo............oodmdmdoo',
      '.ooooooo..............ooooooo.',
      '..ooooo................ooooo..',
    ],
  ],
});

// ── Party hat with a pom-pom ──
PX.define('deco_party', {
  pal: { o: PAL.ink, a: PAL.pi3, A: PAL.pi4, b: PAL.ye2, B: PAL.ye3, f: PAL.te1, F: PAL.te2, w: PAL.white, s: PAL.g2 },
  anchor: [9.5, 25],
  frames: [
    [
      '..........ooo......',
      '.........owwwo.....',
      '........owwwwso....',
      '........owwwwso....',
      '........owwwsso....',
      '.........ossso.....',
      '.........oaaBo.....',
      '........oaabBo.....',
      '........oabbBo.....',
      '.......oabbbAAo....',
      '.......obbbaAAo....',
      '......obbbaaABo....',
      '......obbaaaBBo....',
      '.....obbaaabBBAo...',
      '.....obaaabbBAAo...',
      '....obaaabbbAAAo...',
      '....oaaabbbaAABo...',
      '...oaaabbbaaABBBo..',
      '...oaabbbaaaBBBAo..',
      '..oaabbbaaabBBAAo..',
      '..oabbbaaabbBAAAoo.',
      '.offffffffffffffffo',
      '.oFFoFFoFFoFFoFFoFo',
      '..oo.oo.oo.oo.oo.o.',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('deco_party_s', {
  pal: { o: PAL.ink, a: PAL.pi3, A: PAL.pi4, b: PAL.ye2, B: PAL.ye3, f: PAL.te1, F: PAL.te2, w: PAL.white, s: PAL.g2 },
  anchor: [6.5, 19],
  frames: [
    [
      '......ooo....',
      '.....owwso...',
      '....owwwwso..',
      '....owwwsso..',
      '....oswssso..',
      '.....ossso...',
      '.....obbBo...',
      '.....obbAo...',
      '....obbaAo...',
      '....obaaABo..',
      '...obaaaBBo..',
      '...oaaabBBo..',
      '..oaaabbBAAo.',
      '.oaaabbbAAAo.',
      '.oaabbbaAABo.',
      'offfffffffffo',
      'oFFoFFoFFoFFo',
      '.oo.oo.oo.oo.',
    ],
  ],
});

// ── Star crown: gold band, three stars. Frames 0-2 twinkle. ──
PX.define('deco_stars', {
  pal: { o: PAL.ink, h: PAL.ye1, y: PAL.ye2, d: PAL.ye3, r: PAL.re2, R: PAL.re1, b: PAL.bl2, x: PAL.white },
  anchor: [14.5, 17],
  frames: [
    [
      '..............o..............',
      '.............oho.............',
      '.............oyo.............',
      '.....o....ooohyyooo....o...x.',
      '....oho..ohhhyyyyyyo..oho....',
      '..oohyyoo.ohyyyyydo.oohyyoo..',
      '.ohhyyyyyo.oyyyydo.ohhyyyyyo.',
      '..oyyyydo..oyyyydo..oyyyydo..',
      '...oyydo..oyydoyddo..oyydo...',
      '..oyyoydo.oydo.oddo.oyyoydo..',
      '..oyooodoooooooooooooyooodo..',
      '...ohhhhhhhhhhhhhhhhhhhhho...',
      '.x.oyyyyyyyyyRrryyyyyydddo...',
      '...oyyyybbyyyrrryyybbydddo...',
      '...oyyyybbyyyrrryyybbydddo...',
      '...odddddddddddddddddddddo...',
      '....ooooooooooooooooooooo....',
    ],
    [
      '..............o..............',
      '......x......oho.............',
      '.....xxx.....oho.............',
      '.....ox...ooohhhooo....o.....',
      '....oho..ohhhhhhhhho..oho....',
      '..oohyyoo.ohhhhhhdo.oohyyoo..',
      '.ohhyyyyyo.ohhhhdo.ohhyyyyyo.',
      '..oyyyydo..ohhhhdo..oyyyydo..',
      '...oyydo..ohhdohddo..oyydo...',
      '..oyyoydo.ohdo.oddo.oyyoydo..',
      '..oyooodoooooooooooooyooodo..',
      '...ohhhhhhhhhhhhhhhhhhhhho...',
      '...oyyyyyyyyyRrryyyyyydddo...',
      '...oyyyybbyyyrrryyybbydddo...',
      '...oyyyybbyyyrrryyybbydddo...',
      '...odddddddddddddddddddddo...',
      '....ooooooooooooooooooooo....',
    ],
    [
      '..............o..............',
      '.x...........oho......x......',
      '.............oyo.....xxx.....',
      '.....o....ooohyyooo...xo.....',
      '....oho..ohhhyyyyyyo..oho....',
      '..oohhhoo.ohyyyyydo.oohhhoo..',
      '.ohhhhhhho.oyyyydo.ohhhhhhho.',
      '..ohhhhdo..oyyyydo..ohhhhdo..',
      '...ohhdo..oyydoyddo..ohhdo...',
      '..ohhohdo.oydo.oddo.ohhohdo..',
      '..ohooodooooooooooooohooodo..',
      '...ohhhhhhhhhhhhhhhhhhhhho...',
      '...oyyyyyyyyyRrryyyyyydddo...',
      '...oyyyybbyyyrrryyybbydddo...',
      '...oyyyybbyyyrrryyybbydddo...',
      '...odddddddddddddddddddddo...',
      '....ooooooooooooooooooooo....',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('deco_stars_s', {
  pal: { o: PAL.ink, h: PAL.ye1, y: PAL.ye2, d: PAL.ye3, r: PAL.re2, R: PAL.re1, b: PAL.bl2, x: PAL.white },
  anchor: [10.5, 12],
  frames: [
    [
      '..........o..........',
      '.........oho.........',
      '.......oohyyoo.....x.',
      '....o.ohhyyyyyo.o....',
      '..oohoooyyyydooohoo..',
      '.ohhyyyooyydoohhyyyo.',
      '..oyydooyyoydooyydo..',
      '..oyodooyooodooyodo..',
      '..ohhhhhhhhhhhhhhho..',
      '..oyyybyyyryyybyddo..',
      '..odddddddddddddddo..',
      '...ooooooooooooooo...',
    ],
    [
      '....x.....o..........',
      '...xxx...oho.........',
      '....x..oohhhoo.......',
      '....o.ohhhhhhho.o....',
      '..oohooohhhhdooohoo..',
      '.ohhyyyoohhdoohhyyyo.',
      '..oyydoohhohdooyydo..',
      '..oyodoohooodooyodo..',
      '..ohhhhhhhhhhhhhhho..',
      '..oyyybyyyryyybyddo..',
      '..odddddddddddddddo..',
      '...ooooooooooooooo...',
    ],
    [
      '..........o.....x....',
      '.........oho...xxx...',
      '.......oohyyoo..x....',
      '....o.ohhyyyyyo.o....',
      '..oohoooyyyydooohoo..',
      '.ohhhhhooyydoohhhhho.',
      '..ohhdooyyoydoohhdo..',
      '..ohodooyooodoohodo..',
      '..ohhhhhhhhhhhhhhho..',
      '..oyyybyyyryyybyddo..',
      '..odddddddddddddddo..',
      '...ooooooooooooooo...',
    ],
  ],
});

// ── Butterfly resting on the head. Frames: wings open, half, closed. ──
PX.define('deco_butterfly', {
  pal: { o: PAL.ink, b: PAL.bl2, l: PAL.bl1, c: PAL.wa1, w: PAL.white },
  anchor: [3.5, 14],
  frames: [
    [
      '.....o.....o.....',
      '.oooo.o...o.oooo.',
      'olllbo.o.o.oblllo',
      'olwbbbo.o.obbbwlo',
      'obbbbbbooobbbbbbo',
      'obbcbbbooobbbcbbo',
      '.oobbbbooobbbboo.',
      '.obbbbbooobbbbbo.',
      '.obcbbo.o.obbcbo.',
      '..obbo.....obbo..',
      '...oo.......oo...',
    ],
    [
      '.....o.....o.....',
      '......o...o......',
      '....oo.o.o.oo....',
      '...ollo.o.ollo...',
      '...olwbooobwlo...',
      '...obbbooobbbo...',
      '...obcbooobcbo...',
      '....obbooobbo....',
      '....obcooocbo....',
      '.....obo.obo.....',
      '......o...o......',
    ],
    [
      '......o...o......',
      '.......o.o.......',
      '......o.o.o......',
      '.....olooolo.....',
      '.....olboblo.....',
      '.....obbobbo.....',
      '.....obbobbo.....',
      '......obobo......',
      '......obobo......',
      '.......ooo.......',
      '.................',
    ],
  ],
});

// Small version for faces further from the camera
PX.define('deco_butterfly_s', {
  pal: { o: PAL.ink, b: PAL.bl2, l: PAL.bl1, c: PAL.wa1, w: PAL.white },
  anchor: [2, 11],
  frames: [
    [
      '...o...o...',
      '.oo.o.o.oo.',
      'ollo.o.ollo',
      'olwbooobwlo',
      'obbbooobbbo',
      '.ooboooboo.',
      '.obbooobbo.',
      '.oco.o.oco.',
      '..o.....o..',
    ],
    [
      '...o...o...',
      '....o.o....',
      '...o.o.o...',
      '..olooolo..',
      '..owbobwo..',
      '..obbobbo..',
      '...obobo...',
      '...ococo...',
      '....o.o....',
    ],
    [
      '....o.o....',
      '.....o.....',
      '....ooo....',
      '...ololo...',
      '...obobo...',
      '...obobo...',
      '....ooo....',
      '....ooo....',
      '...........',
    ],
  ],
});

// ── Smile meter icons (7x7): waiting, smiling, photo taken ──
PX.define('smile_icon', {
  pal: { o: PAL.ink, w: PAL.g1, y: PAL.ye2, p: PAL.pi2, c: PAL.ye1 },
  anchor: [0, 0],
  frames: {
    wait: [
      '.ooooo.',
      'owwwwwo',
      'owowowo',
      'owwwwwo',
      'owooowo',
      'owwwwwo',
      '.ooooo.',
    ],
    smile: [
      '.ooooo.',
      'oyyyyyo',
      'oyoyoyo',
      'oyyyyyo',
      'ooyyyoo',
      'oyoooyo',
      '.ooooo.',
    ],
    done: [
      '..ooo..',
      '.opppo.',
      'oppcppo',
      'opcccpo',
      'oppcppo',
      '.opppo.',
      '..ooo..',
    ],
  },
});

// ── Tick shown in the countdown badge when the smile is held long enough ──
PX.define('smile_tick', {
  pal: { g: PAL.gr1 },
  anchor: [3, 3],
  frames: [[
    '......g',
    '.....gg',
    'g...gg.',
    'gg.gg..',
    '.ggg...',
    '..g....',
  ]],
});

