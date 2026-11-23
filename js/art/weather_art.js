// ================================================================
// File: weather_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 23, 2026
// Description: Block-art sprite definitions for weather and flying creatures.
//   Only PX.define(...) calls live here: no p5.js functions at load
//   time, so tools/sprites.html can show every sprite on its own.
//   CARE Garden 2: everything is built from squares and slabs, with
//   no outlines and no curves (see docs/PIXEL_ART.md, "Block style").
// ================================================================

// ── Forecast icons ────────────────────────────────────
// 16x16 icons for the NOW / FORECAST strip. They sit on a dark slab, so
// they have no outline; each has two frames that the strip alternates
// slowly (rays take turns, drops fall, the bolt blinks).
(function () {
  // The cloud every icon shares, 16 wide and 8 tall: a short slab on a
  // long one. c = cloud, s = shaded underside.
  const CLOUD = [
    '.....cccccccc...',
    '.....cccccccc...',
    '.....cccccccc...',
    'cccccccccccccccc',
    'cccccccccccccccc',
    'cccccccccccccccc',
    'ssssssssssssssss',
    'ssssssssssssssss',
  ];
  const BLANK = '................';
  const pad = n => Array(n).fill(BLANK);

  // A square sun. The rays are little squares: the four sides and the
  // four corners take turns.
  PX.define('wx_sunny', {
    anchor: [0, 0],
    pal: { y: PAL.ye2, Y: PAL.ye1, o: PAL.ye3 },
    frames: [
      [
        '.......yy.......',
        '.......yy.......',
        '................',
        '................',
        '....YYYYYYYY....',
        '....YYYyyyyo....',
        '....YYYyyyyo....',
        'yy..Yyyyyyyo..yy',
        'yy..Yyyyyyyo..yy',
        '....Yyyyyyyo....',
        '....Yyyyyyyo....',
        '....oooooooo....',
        '................',
        '................',
        '.......yy.......',
        '.......yy.......',
      ],
      [
        '................',
        '.yy..........yy.',
        '.yy..........yy.',
        '................',
        '....YYYYYYYY....',
        '....YYYyyyyo....',
        '....YYYyyyyo....',
        '....Yyyyyyyo....',
        '....Yyyyyyyo....',
        '....Yyyyyyyo....',
        '....Yyyyyyyo....',
        '....oooooooo....',
        '................',
        '.yy..........yy.',
        '.yy..........yy.',
        '................',
      ],
    ],
  });

  // A clear night: a square moon with two square craters, and two stars
  // that take turns twinkling.
  PX.define('wx_clear_night', {
    anchor: [0, 0],
    pal: { m: PAL.cream, M: PAL.white, d: PAL.ta2, s: PAL.ye1 },
    frames: [
      [
        '................',
        '.............ss.',
        '.............ss.',
        '..MMMMMMMM......',
        '..Mmmmmmmd......',
        '..Mmddmmmd......',
        '..Mmddmmmd......',
        '..Mmmmmmmd......',
        '..Mmmmmddd......',
        '..Mmmmmddd......',
        '..dddddddd......',
        '................',
        '............s...',
        '................',
        '................',
        '................',
      ],
      [
        '................',
        '..............s.',
        '................',
        '..MMMMMMMM......',
        '..Mmmmmmmd......',
        '..Mmddmmmd......',
        '..Mmddmmmd......',
        '..Mmmmmmmd......',
        '..Mmmmmddd......',
        '..Mmmmmddd......',
        '..dddddddd......',
        '...........ss...',
        '...........ss...',
        '................',
        '................',
        '................',
      ],
    ],
  });

  PX.define('wx_cloudy', {
    anchor: [0, 0],
    pal: { c: PAL.white, s: PAL.g2, b: PAL.g2 },
    frames: [
      [
        ...pad(1),
        '..........bbbbbb',
        '..........bbbbbb',
        '..........bbbbbb',
        ...CLOUD,
        ...pad(4),
      ],
      [
        ...pad(1),
        '.........bbbbbb.',
        '.........bbbbbb.',
        '.........bbbbbb.',
        ...CLOUD,
        ...pad(4),
      ],
    ],
  });

  PX.define('wx_rainy', {
    anchor: [0, 0],
    pal: { c: PAL.g1, s: PAL.g3, r: PAL.wa2, R: PAL.wa1 },
    frames: [
      [
        ...pad(1),
        ...CLOUD,
        BLANK,
        '.RR...RR...RR...',
        '.rr...rr...rr...',
        BLANK,
        '....RR...RR.....',
        '....rr...rr.....',
        BLANK,
      ],
      [
        ...pad(1),
        ...CLOUD,
        BLANK,
        '....RR...RR.....',
        '....rr...rr.....',
        BLANK,
        '.RR...RR...RR...',
        '.rr...rr...rr...',
        BLANK,
      ],
    ],
  });

  // The bolt is two posts joined by a step.
  PX.define('wx_stormy', {
    anchor: [0, 0],
    pal: { c: PAL.g3, s: PAL.g4, r: PAL.wa2, y: PAL.ye2, Y: PAL.ye1 },
    frames: [
      [
        ...pad(1),
        ...CLOUD,
        '.r......yyy...r.',
        '.r......yyy...r.',
        '......yyyyy.....',
        '......yyy.......',
        '...r..yyy...r...',
        '...r........r...',
        BLANK,
      ],
      [
        ...pad(1),
        ...CLOUD,
        '...r....YYY.r...',
        '...r....YYY.r...',
        '......YYYYY.....',
        '......YYY.......',
        '.r....YYY.....r.',
        '.r............r.',
        BLANK,
      ],
    ],
  });

  // The square sun coming out from behind a slab cloud.
  PX.define('wx_clearing', {
    anchor: [0, 0],
    pal: { c: PAL.white, s: PAL.g2, y: PAL.ye2, Y: PAL.ye1, o: PAL.ye3 },
    frames: [
      [
        '.........yy.....',
        '................',
        '......YYYYYYYY..',
        '......YYYyyyyo..',
        '......YYYyyyyo.y',
        '......Yyyyyyyo.y',
        '......Yyyyyyyo..',
        '...ccccccyyyyo..',
        '...ccccccyyyyo..',
        '...ccccccooooo..',
        'ccccccccccccc...',
        'ccccccccccccc...',
        'ccccccccccccc...',
        'sssssssssssss...',
        'sssssssssssss...',
        BLANK,
      ],
      [
        BLANK,
        '....y..........y',
        '......YYYYYYYY..',
        '......YYYyyyyo..',
        '......YYYyyyyo..',
        '......Yyyyyyyo..',
        '......Yyyyyyyo..',
        '...ccccccyyyyo..',
        '...ccccccyyyyo..',
        '...ccccccooooo..',
        'ccccccccccccc...',
        'ccccccccccccc...',
        'ccccccccccccc...',
        'sssssssssssss...',
        'sssssssssssss...',
        BLANK,
      ],
    ],
  });
})();

// ── Puddle ripples ────────────────────────────────────
// A raindrop landing in a puddle: a dot, then a small square ring, then a
// wider broken one. Rings are flat because the puddle lies on the ground.
PX.define('ripple', {
  pal: { x: PAL.sk1 },
  anchor: [3, 1],
  frames: [
    [
      '.......',
      '...x...',
      '.......',
    ],
    [
      '..xxx..',
      '..x.x..',
      '..xxx..',
    ],
    [
      'xx.x.xx',
      'x.....x',
      'xx.x.xx',
    ],
  ],
});

// ── Butterfly ─────────────────────────────────────────
// Seen from above with the head at the top: a post for a body and four
// square wings. open → half → closed is one wing beat. m = wing colour,
// l = light patch, d = dark hind wing; these three are recoloured per
// butterfly (see BUTTERFLY_COLOURS in creatures.js).
PX.define('butterfly', {
  pal: { k: PAL.g5, m: PAL.or2, l: PAL.ye2, d: PAL.or3 },
  anchor: [5, 4],
  frames: {
    open: [
      '....k.k....',
      'mmmm.k.mmmm',
      'mllm.k.mllm',
      'mllmmkmmllm',
      'mmmmmkmmmmm',
      '.ddddkdddd.',
      '.dmmd.dmmd.',
      '.dddd.dddd.',
      '...........',
    ],
    half: [
      '....k.k....',
      '..mmmkmmm..',
      '..mlmkmlm..',
      '..mlmkmlm..',
      '..mmmkmmm..',
      '..dddkddd..',
      '..dmd.dmd..',
      '..ddd.ddd..',
      '...........',
    ],
    closed: [
      '....k.k....',
      '...mmkmm...',
      '...lmkml...',
      '...lmkml...',
      '...mmkmm...',
      '...ddkdd...',
      '...dd.dd...',
      '...........',
      '...........',
    ],
  },
});

// ── Bee ───────────────────────────────────────────────
// Faces right: a striped box with a dark head block and slab wings.
// Two frames of wing buzz: wings up and wings swept back.
PX.define('bee', {
  pal: { y: PAL.ye2, Y: PAL.ye1, k: PAL.g5, w: PAL.white, g: PAL.sk2, e: PAL.white },
  anchor: [5, 5],
  frames: {
    up: [
      '...ww.ww..',
      '...ww.ww..',
      '...gg.gg..',
      '.YYkkYYkk.',
      '.yykkyyke.',
      'kyykkyykk.',
      '.yykkyykk.',
      '..........',
    ],
    back: [
      '..........',
      '..........',
      'wwwwww....',
      '.YYkkYYkk.',
      '.yykkyyke.',
      'kyykkyykk.',
      '.yykkyykk.',
      '..........',
    ],
  },
});

// ── Bird ──────────────────────────────────────────────
// Faces right: a box body, a block head, a block tail and a slab wing.
// up / mid / down are the wing beat in flight; stand, peck and hop are
// used on the ground. m = body, w = wing, l = breast and belly, y = beak
// and legs, e = eye. Recoloured per bird (BIRD_KINDS in creatures.js):
// blackbird, robin, bluebird, sparrow.
PX.define('bird_fly', {
  pal: { m: PAL.g5, w: PAL.g4, l: PAL.g4, y: PAL.ye3, e: PAL.white },
  anchor: [6, 6],
  frames: {
    up: [
      '....www.....',
      '....www.....',
      '....www.....',
      '....www.mmm.',
      'mmmmwwwmmem.',
      'mmmmmmmmmmmy',
      '..mmllllll..',
      '..mmllllll..',
      '............',
      '............',
      '............',
      '............',
    ],
    mid: [
      '............',
      '............',
      '............',
      '........mmm.',
      'mmmmmmmmmem.',
      'mmwwwwwmmmmy',
      '..wwwwwlll..',
      '..mmllllll..',
      '............',
      '............',
      '............',
      '............',
    ],
    down: [
      '............',
      '............',
      '............',
      '........mmm.',
      'mmmmmmmmmem.',
      'mmmmmmmmmmmy',
      '..mmwwwlll..',
      '..mmwwwlll..',
      '....www.....',
      '....www.....',
      '....www.....',
      '............',
    ],
  },
});

PX.define('bird_ground', {
  pal: { m: PAL.g5, w: PAL.g4, l: PAL.g4, y: PAL.ye3, e: PAL.white },
  frames: {
    stand: [
      '.....mmmm.',
      '.....mmem.',
      '.....mmmmy',
      'mmwwwmlll.',
      'mmwwwmlll.',
      '..wwwllll.',
      '..mmmllll.',
      '....y..y..',
      '....y..y..',
    ],
    peck: [
      '..........',
      '..........',
      'mm........',
      'mmwwwmm...',
      '..wwwmmmmm',
      '..wwwlmmem',
      '..mmmlmmmm',
      '....y..y.y',
      '....y..y..',
    ],
    hop: [
      '.....mmmm.',
      '.....mmem.',
      'm....mmmmy',
      'mmwwwmlll.',
      '.mwwwmlll.',
      '..wwwllll.',
      '..mmmllll.',
      '....yy.y..',
      '..........',
    ],
  },
});
