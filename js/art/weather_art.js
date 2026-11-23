// ================================================================
// File: weather_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 22, 2026
// Description: Pixel-art sprite definitions for weather and flying creatures.
//   Only PX.define(...) calls live here: no p5.js functions at load
//   time, so tools/sprites.html can show every sprite on its own.
// ================================================================

// ── Forecast icons ────────────────────────────────────
// 16x16 icons for the NOW / FORECAST panel. They sit on a dark panel, so
// they have no ink outline; each has two frames that the panel alternates
// slowly (rays twinkle, drops fall, the bolt blinks).
(function () {
  // The cloud every icon shares, 16 wide and 8 tall.
  // c = top of the cloud, s = shaded underside.
  const CLOUD = [
    '.......cccc.....',
    '......cccccc....',
    '..ccc.cccccccc..',
    '.cccccccccccccc.',
    'cccccccccccccccc',
    'cccccccccccccccc',
    'sccccccccccccccs',
    '.ssssssssssssss.',
  ];
  const BLANK = '................';
  const pad = n => Array(n).fill(BLANK);

  const sunPal = { y: PAL.ye2, Y: PAL.ye1, o: PAL.ye3 };
  PX.define('wx_sunny', {
    anchor: [0, 0],
    pal: sunPal,
    frames: [
      [
        '.......yy.......',
        '.......yy.......',
        '..y..........y..',
        '...y.oooooo.y...',
        '....oyyyyyyo....',
        '...oyYYyyyyyo...',
        '...oyYyyyyyyo...',
        'yy.oyyyyyyyyo.yy',
        'yy.oyyyyyyyyo.yy',
        '...oyyyyyyyyo...',
        '...oyyyyyyyyo...',
        '....oyyyyyyo....',
        '...y.oooooo.y...',
        '..y..........y..',
        '.......yy.......',
        '.......yy.......',
      ],
      [
        '................',
        '.......yy.......',
        '.y............y.',
        '..y..oooooo..y..',
        '....oyyyyyyo....',
        '...oyYYyyyyyo...',
        '...oyYyyyyyyo...',
        '.y.oyyyyyyyyo.y.',
        '.y.oyyyyyyyyo.y.',
        '...oyyyyyyyyo...',
        '...oyyyyyyyyo...',
        '....oyyyyyyo....',
        '..y..oooooo..y..',
        '.y............y.',
        '.......yy.......',
        '................',
      ],
    ],
  });

  // A clear night: crescent moon with two stars that take turns twinkling.
  PX.define('wx_clear_night', {
    anchor: [0, 0],
    pal: { m: PAL.cream, M: PAL.white, d: PAL.ta2, s: PAL.ye1 },
    frames: [
      [
        '................',
        '............s...',
        '.....mmmm..sss..',
        '...mMMmd....s...',
        '..mMMmd.........',
        '..mMmd..........',
        '.mMMmd..........',
        '.mMmmd..........',
        '.mMmmd.......s..',
        '.mmmmmd.........',
        '..mmmmdd....d...',
        '..mmmmmmddddm...',
        '...mmmmmmmmm....',
        '.....mmmmm......',
        '................',
        '................',
      ],
      [
        '................',
        '................',
        '.....mmmm...s...',
        '...mMMmd........',
        '..mMMmd.........',
        '..mMmd..........',
        '.mMMmd..........',
        '.mMmmd.......s..',
        '.mMmmd......sss.',
        '.mmmmmd......s..',
        '..mmmmdd....d...',
        '..mmmmmmddddm...',
        '...mmmmmmmmm....',
        '.....mmmmm......',
        '................',
        '................',
      ],
    ],
  });

  PX.define('wx_cloudy', {
    anchor: [0, 0],
    pal: { c: PAL.white, s: PAL.g2, b: PAL.g2, B: PAL.g3 },
    frames: [
      [
        ...pad(1),
        '..........bbb...',
        '.........bbbbb..',
        '........bbbbbbb.',
        ...CLOUD,
        ...pad(4),
      ],
      [
        ...pad(1),
        '.........bbb....',
        '........bbbbb...',
        '.......bbbbbbb..',
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
        '...r....r....r..',
        '..R....R....R...',
        '......r....r....',
        '.....R....R.....',
        '...r....r....r..',
        BLANK,
      ],
      [
        ...pad(1),
        ...CLOUD,
        BLANK,
        '......r....r....',
        '.....R....R.....',
        '...r....r....r..',
        '..R....R....R...',
        '......r....r....',
        BLANK,
      ],
    ],
  });

  PX.define('wx_stormy', {
    anchor: [0, 0],
    pal: { c: PAL.g3, s: PAL.g4, r: PAL.wa2, y: PAL.ye2, Y: PAL.ye1 },
    frames: [
      [
        ...pad(1),
        ...CLOUD,
        '.......yyy......',
        '..r...yyy....r..',
        '.r...yyyyy..r...',
        '.......yy.......',
        '...r..yy...r....',
        '..r...y...r.....',
        BLANK,
      ],
      [
        ...pad(1),
        ...CLOUD,
        '.......YYY......',
        '...r..YYY...r...',
        '..r..YYYYY.r....',
        '.......YY.......',
        '.r....YY.....r..',
        'r.....Y.....r...',
        BLANK,
      ],
    ],
  });

  // Sun coming out from behind a cloud.
  PX.define('wx_clearing', {
    anchor: [0, 0],
    pal: { c: PAL.white, s: PAL.g2, y: PAL.ye2, Y: PAL.ye1, o: PAL.ye3 },
    frames: [
      [
        '..........y.....',
        '..........y.....',
        '.....y.........y',
        '......y.oooo..y.',
        '.......oyYyyo...',
        '......oyYyyyyo..',
        '......oyyyyyyo.y',
        '....cccoyyyyyo.y',
        '...cccccoyyyo...',
        '.cccccccccooo.y.',
        'cccccccccccc...y',
        'ccccccccccccc...',
        'ccccccccccccc...',
        'scccccccccccs...',
        '.sssssssssss....',
        BLANK,
      ],
      [
        BLANK,
        '..........y.....',
        '......y.......y.',
        '........oooo....',
        '.......oyYyyo...',
        '......oyYyyyyo..',
        '......oyyyyyyo..',
        '....cccoyyyyyo.y',
        '...cccccoyyyo...',
        '.cccccccccooo...',
        'cccccccccccc..y.',
        'ccccccccccccc...',
        'ccccccccccccc...',
        'scccccccccccs...',
        '.sssssssssss....',
        BLANK,
      ],
    ],
  });
})();

// ── Puddle ripples ────────────────────────────────────
// A raindrop landing in a puddle: a dot, then a small ring, then a wider
// broken ring. Rings are flattened because the puddle lies on the ground.
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
      '.x...x.',
      '..xxx..',
    ],
    [
      '.x.x.x.',
      'x.....x',
      '.x.x.x.',
    ],
  ],
});

// ── Butterfly ─────────────────────────────────────────
// Seen from above with the head at the top. open → half → closed is one
// wing beat. m = wing colour, l = light patch, d = dark wing edge; these
// three are recoloured per butterfly (see BUTTERFLY_COLOURS in creatures.js).
PX.define('butterfly', {
  pal: { o: PAL.ink, k: PAL.black, m: PAL.or2, l: PAL.ye2, d: PAL.or3, w: PAL.white },
  anchor: [5, 4],
  frames: {
    open: [
      '...o...o...',
      '.oo.o.o.oo.',
      'olmo.o.omlo',
      'ommmokommmo',
      'owmmokommwo',
      '.ommokommo.',
      '.odmokomdo.',
      '.oddo.oddo.',
      '..oo...oo..',
    ],
    half: [
      '....o.o....',
      '..oo.o.oo..',
      '.olmmkmmlo.',
      '.ommmkmmmo.',
      '.owmmkmmwo.',
      '..ommkmmo..',
      '..odmkmdo..',
      '..oddoddo..',
      '...oo.oo...',
    ],
    closed: [
      '....o.o....',
      '...o.o.o...',
      '..olmkmlo..',
      '..ommkmmo..',
      '..ommkmmo..',
      '..ommkmmo..',
      '..oddkddo..',
      '...oo.oo...',
      '...........',
    ],
  },
});

// ── Bee ───────────────────────────────────────────────
// Faces right. Two frames of wing buzz: wings up and wings swept back.
PX.define('bee', {
  pal: { o: PAL.ink, y: PAL.ye2, Y: PAL.ye1, k: PAL.black, w: PAL.white, g: PAL.sk2, e: PAL.white },
  anchor: [5, 5],
  frames: {
    up: [
      '...gw.gw..',
      '..gwwgww..',
      '...gwwgw..',
      '..oooooo..',
      '.oYkYkYkko',
      'ooykykykeo',
      '.oykykykko',
      '..oooooo..',
    ],
    back: [
      '..........',
      '.gww......',
      'gwwwwww...',
      '.goooooo..',
      '.oYkYkYkko',
      'ooykykykeo',
      '.oykykykko',
      '..oooooo..',
    ],
  },
});

// ── Bird ──────────────────────────────────────────────
// Faces right. up / mid / down are the wing beat in flight; stand, peck
// and hop are used on the ground. m = body, w = wing, l = breast and
// belly, y = beak and legs, e = eye. Recoloured per bird (BIRD_KINDS in
// creatures.js): blackbird, robin, bluebird, sparrow.
PX.define('bird_fly', {
  pal: { o: PAL.ink, m: PAL.g5, w: PAL.g4, l: PAL.g4, y: PAL.ye3, e: PAL.white },
  anchor: [6, 6],
  frames: {
    up: [
      '..ooo.......',
      '..owwo......',
      '...owwo.....',
      '...owwwooo..',
      'oo.owwwmemo.',
      'omoowwmmmmyy',
      '.ommmmllllo.',
      '..oooollloo.',
      '......ooo...',
      '............',
      '............',
      '............',
    ],
    mid: [
      '............',
      '............',
      '............',
      '.......ooo..',
      'oo..ooomemo.',
      'omowwwwmmmyy',
      '.owwwwwlllo.',
      '..oooollloo.',
      '......ooo...',
      '............',
      '............',
      '............',
    ],
    down: [
      '............',
      '............',
      '............',
      '.......ooo..',
      'oo..ooomemo.',
      'omoommmmmmyy',
      '.ommwwwlllo.',
      '..oowwwwooo.',
      '...owwwo....',
      '...owwo.....',
      '..owwo......',
      '..ooo.......',
    ],
  },
});

PX.define('bird_ground', {
  pal: { o: PAL.ink, m: PAL.g5, w: PAL.g4, l: PAL.g4, y: PAL.ye3, e: PAL.white },
  frames: {
    stand: [
      '.....ooo..',
      '....omemo.',
      '....ommmyy',
      '.ooommllo.',
      'omwwwmllo.',
      '.oowwlllo.',
      '...ooooo..',
      '....y.y...',
      '....yy.yy.',
    ],
    peck: [
      '..........',
      '.oo.......',
      'ommoooo...',
      '.owwmmmoo.',
      '..owwmmmmo',
      '...oollmeo',
      '....oooomo',
      '....y.y.y.',
      '....yy.yy.',
    ],
    hop: [
      '.....ooo..',
      'o...omemo.',
      'mo..ommmyy',
      'owoommllo.',
      '.owwwmllo.',
      '..owwlllo.',
      '...ooooo..',
      '....yy.y..',
      '..........',
    ],
  },
});
