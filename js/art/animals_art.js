// ================================================================
// File: animals_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 22, 2026
// Description: Pixel-art sprite definitions for the ram, goose, cat, rabbit and groundhog.
//   Only PX.define(...) calls live here: no p5.js functions at load
//   time, so tools/sprites.html can show every sprite on its own.
//
//   The bigger animals are built from parts (a body, a head, legs, a tail)
//   that are stamped together into whole frames when the page loads. That
//   way the ram's wool is typed out once and every pose reuses it.
//   Every sprite faces RIGHT.
// ================================================================

{ // block scope, so these helper names cannot clash with other art files

  // ── Helpers for building frames out of parts ─────────
  // Stamps part grids onto an empty w x h grid and returns it as rows of
  // text. parts = [[rows, x, y, remap], ...] painted in order; `remap`
  // optionally swaps letters (e.g. { f: 'g' } to shade the far-side legs).
  const stamp = (w, h, parts) => {
    const g = [];
    for (let y = 0; y < h; y++) g.push(new Array(w).fill('.'));
    for (const [rows, px, py, remap] of parts) {
      for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < rows[y].length; x++) {
          let ch = rows[y][x];
          if (ch === '.') continue;
          if (ch === '_') ch = '.';            // '_' punches a hole
          else if (remap && remap[ch]) ch = remap[ch];
          const gx = px + x, gy = py + y;
          if (gx >= 0 && gx < w && gy >= 0 && gy < h) g[gy][gx] = ch;
        }
      }
    }
    return g.map(r => r.join(''));
  };
  // Mirrors a part left to right.
  const mirror = rows => rows.map(r => r.split('').reverse().join(''));
  // Returns a copy of a part with a few pixels changed: edits = [[x, y, 'chars'], ...]
  const patch = (rows, edits) => {
    const g = rows.map(r => r.split(''));
    for (const [x, y, s] of edits) for (let i = 0; i < s.length; i++) g[y][x + i] = s[i];
    return g.map(r => r.join(''));
  };

  // ── Ramy the Ram ──────────────────────────────────────
  // About 32 long and 24 tall. Fluffy cream wool, tan face and legs,
  // curled brown horn around a pink ear.
  const RAM_PAL = {
    o: PAL.ink,
    h: PAL.white, w: PAL.cream, s: PAL.ta1, d: PAL.ta2,      // wool, light to shadow
    f: PAL.ta3, g: PAL.ta4, m: PAL.ta4, k: PAL.wo4,          // face, far legs, muzzle, hooves
    b: PAL.wo3, n: PAL.wo1,                                  // horn and its ridges
    p: PAL.pi2, e: PAL.black, x: PAL.white,                  // ear, eye, eye white
    t: PAL.re3, v: PAL.gr3,                                  // tongue/mouth, chewed greens
  };

  // The fleece is a row of round tufts along the top and a scalloped hem.
  const RAM_BODY = [
    '....ooo.....oooo.......',
    '..oohhhoo.oohhhhoo.ooo.',
    '.ohhhhhhhohhhhhhhhohhho',
    'ohhhhwwwhhhhwwwwwhhhwwo',
    'ohhwwwwwwwwwwwwwwwwwwwo',
    'ohwwwwwwwwwwwwwwwwwwwwo',
    'ohwwwwswwwwwwwswwwwwwwo',
    'owwwssswwwwwssswwwwwwwo',
    'owwwwwwwwswwwwwwwwswwwo',
    'owwwwwwwssswwwwwwssswwo',
    'oswwwwwwwwwwwwwwwwwwwso',
    'osswwwwwwwwwwwwwwwwwsso',
    '.ossssswwwssssswwwssso.',
    '..odddooodddddooodddo..',
    '...ooo...ooooo...ooo...',
  ];
  const RAM_TAIL = [
    '.oo',
    'ohw',
    'osw',
    '.oo',
  ];
  // Head held up, looking ahead. The big horn spirals round the pink ear
  // and its tip curls forward under the cheek.
  const RAM_HEAD = [
    '...ooooo.........',
    '..obnbbnooooo....',
    '.obbnbbbbohhwo...',
    '.obnkkkbbowwwwo..',
    '.obbkppnbbffffo..',
    '.onbkpfbbffefffo.',
    '..obnbbnbffefffmo',
    '...ooobbnffffmmko',
    '......ooofffffmmo',
    '.........offfoooo',
    '..........ooo....',
    '.................',
  ];
  const RAM_HEAD_BLINK = patch(RAM_HEAD, [[11, 5, 'f'], [11, 6, 'oo']]);
  const RAM_HEAD_HAPPY = patch(RAM_HEAD, [[11, 5, 'o'], [10, 6, 'ofo']]);
  const RAM_HEAD_BAA   = patch(RAM_HEAD, [[9, 9, 'offtttoo'], [10, 10, 'offffo'], [11, 11, 'oooo']]);
  const RAM_HEAD_PANIC = patch(RAM_HEAD_BAA, [[10, 5, 'xe'], [10, 6, 'xe']]);
  // Chewing with his head up: the jaw works and a bit of green shows.
  const RAM_HEAD_MUNCH = patch(RAM_HEAD, [[13, 8, 'fmo'], [9, 9, 'offfmmko'], [10, 10, 'oooovvo'], [14, 11, 'oo']]);
  // Head lowered to the ground for grazing, nose pointing down and forward:
  // the same horn, ear and eye as the raised head, with the face tapering
  // to a dark muzzle. Two frames of chewing.
  const RAM_HEAD_DOWN = [
    '...ooooo........',
    '..obnbbnooo.....',
    '.obbnbbbbhhoo...',
    '.obnkkkbbwwwwo..',
    '.obbkppnbbffffo.',
    '.onbkpfbbffffffo',
    '..obnbbnbffeeffo',
    '...ooobbnffeeffo',
    '......ooofffffo.',
    '.........offffo.',
    '..........offmmo',
    '..........ofmmmo',
    '..........ommkmo',
    '...........oooo.',
  ];
  const RAM_HEAD_CHEW = patch(RAM_HEAD_DOWN, [[10, 12, 'offmmo'], [9, 13, 'vommkmov']]);
  // A woolly neck that slopes from his shoulders down to the lowered head,
  // so the grazing head is joined on instead of hanging off his chest.
  const RAM_NECK = [
    '..oooo....',
    '.ohhhhoo..',
    'hhhwwwwwo.',
    'wwwwwwwwwo',
    'wwwwwwwwwo',
    'wwwwwwwsso',
    'wwwwwwsso.',
    'wwwwssso..',
    'wwsssoo...',
    'ssooo.....',
  ];

  // Legs: straight, stepping forward, stepping back, and two bent ones for the gallop
  const RAM_LEG = [
    'offo', 'offo', 'offo', 'offo', 'offo', 'offo', 'offo', 'okko', 'oooo',
  ];
  const RAM_LEG_UP = RAM_LEG.slice(1);          // lifted one pixel off the grass
  const RAM_LEG_FWD = [
    'offo..', 'offo..', 'offo..', 'offo..', '.offo.', '.offo.', '..offo', '..okko', '..oooo',
  ];
  const RAM_LEG_BACK = mirror(RAM_LEG_FWD);
  const RAM_LEG_REACH = [
    'offo....', 'offo....', 'offo....', '.offo...', '..offo..', '...offoo', '....okko', '.....ooo',
  ];
  const RAM_LEG_KICK = mirror(RAM_LEG_REACH);

  const FAR = { f: 'g' };   // far-side legs are a shade darker
  const RAM_W = 40, RAM_H = 26;
  // Puts a whole ram together. legs = [backNear, backFar, frontNear, frontFar],
  // each [part, dx]; `drop` lowers the body a pixel for the bounce of a step.
  const ramFrame = (head, legs, drop = 0, headAt = [18, 1], neck = null) => stamp(RAM_W, RAM_H, [
    [legs[1][0], 9 + legs[1][1], RAM_H - legs[1][0].length - (legs[1][2] || 0), FAR],
    [legs[3][0], 21 + legs[3][1], RAM_H - legs[3][0].length - (legs[3][2] || 0), FAR],
    [legs[0][0], 5 + legs[0][1], RAM_H - legs[0][0].length - (legs[0][2] || 0)],
    [legs[2][0], 17 + legs[2][1], RAM_H - legs[2][0].length - (legs[2][2] || 0)],
    [RAM_TAIL, 0, 10 + drop],
    [RAM_BODY, 2, 5 + drop],
    ...(neck ? [[neck, 20, 7 + drop]] : []),
    [head, headAt[0], headAt[1] + drop],
  ]);
  const S = [RAM_LEG, 0], U = [RAM_LEG_UP, 0, 1];
  const F = [RAM_LEG_FWD, 0], B = [RAM_LEG_BACK, -2];
  const STAND = [S, S, S, S];

  const WALK_LEGS = [[B, F, F, B], [S, U, S, U], [F, B, B, F], [U, S, U, S]];
  PX.define('ram', {
    pal: RAM_PAL,
    anchor: [15, RAM_H],     // the point on the grass under the middle of his body
    frames: {
      stand: ramFrame(RAM_HEAD, STAND),
      blink: ramFrame(RAM_HEAD_BLINK, STAND),
      // four-step walk: near legs apart, passing, far legs apart, passing
      walk0: ramFrame(RAM_HEAD, WALK_LEGS[0], 1),
      walk1: ramFrame(RAM_HEAD, WALK_LEGS[1]),
      walk2: ramFrame(RAM_HEAD, WALK_LEGS[2], 1),
      walk3: ramFrame(RAM_HEAD, WALK_LEGS[3]),
      // the same walk with his mouth open, for talking on the move
      talk0: ramFrame(RAM_HEAD_BAA, WALK_LEGS[0], 1),
      talk1: ramFrame(RAM_HEAD_BAA, WALK_LEGS[1]),
      talk2: ramFrame(RAM_HEAD_BAA, WALK_LEGS[2], 1),
      talk3: ramFrame(RAM_HEAD_BAA, WALK_LEGS[3]),
      // grazing at three heights (ram.js picks the one that puts his mouth
      // on the flower). Head down in the grass, for buds and stubs:
      eat0: ramFrame(RAM_HEAD_DOWN, STAND, 0, [22, 11], RAM_NECK),
      eat1: ramFrame(RAM_HEAD_CHEW, STAND, 0, [22, 11], RAM_NECK),
      // head held low and level in front of his chest, for a settled bloom:
      nib0: ramFrame(RAM_HEAD, STAND, 0, [19, 7]),
      nib1: ramFrame(RAM_HEAD_MUNCH, STAND, 0, [19, 8]),
      // head up and stretched a little, for a tall fresh bloom:
      up0: ramFrame(RAM_HEAD, STAND, 0, [19, 0]),
      up1: ramFrame(RAM_HEAD_MUNCH, STAND, 0, [19, 1]),
      // storm gallop: stretched out, then gathered up
      run0: ramFrame(RAM_HEAD_PANIC, [[RAM_LEG_KICK, -4, 1], [RAM_LEG_KICK, -4, 1], [RAM_LEG_REACH, 0, 1], [RAM_LEG_REACH, 0, 1]], -1),
      run1: ramFrame(RAM_HEAD_PANIC, [F, F, B, B], 1),
      pet: ramFrame(RAM_HEAD_HAPPY, STAND),
      baa: ramFrame(RAM_HEAD_BAA, STAND),
    },
  });

  // His droppings: a little pile, the same pile with a sprout as it turns into a flower.
  PX.define('ram_poop', {
    pal: { o: PAL.ink, b: PAL.wo3, l: PAL.wo2, d: PAL.wo4, v: PAL.gr2, u: PAL.gr4 },
    frames: {
      pile: [
        '.........',
        '.........',
        '...oo....',
        '..oblo...',
        '.oblbbo..',
        '.obbbdo..',
        'oblbbbdo.',
        'obbbbddo.',
        '.oooooo..',
      ],
      sprout: [
        '..ov.vo..',
        '...ovo...',
        '...ouo...',
        '..oblo...',
        '.oblbbo..',
        '.obbbdo..',
        'oblbbbdo.',
        'obbbbddo.',
        '.oooooo..',
      ],
    },
  });
  // Wavy stink lines above a fresh pile (two frames).
  PX.define('ram_stink', {
    pal: { s: PAL.gr1 },
    frames: [
      ['s...s..', '.s...s.', 's...s..', '.s...s.'],
      ['.s...s.', 's...s..', '.s...s.', 's...s..'],
    ],
  });
  // A small heart that pops up when Ramy is petted.
  PX.define('heart', {
    pal: { o: PAL.ink, r: PAL.re2, l: PAL.re1 },
    frames: [[
      '.oo.oo.',
      'olrorro',
      'orrrrro',
      '.orrro.',
      '..oro..',
      '...o...',
    ]],
  });

  // ── The Goose ─────────────────────────────────────────
  // White with an orange bill and legs. stand/walk are upright; in the chase
  // frames the neck is stretched out flat and the wings are up.
  const GOOSE_PAL = {
    o: PAL.ink, w: PAL.white, s: PAL.g1, g: PAL.g2,
    b: PAL.or2, y: PAL.or2, d: PAL.or3, e: PAL.black, t: PAL.re3,
  };
  const GOOSE_TOP = [
    '...........ooo.....',
    '..........owwwo....',
    '..........owwewooo.',
    '..........owwwbbbbo',
    '..........oswwoooo.',
    '..........oswo.....',
    '..........oswo.....',
    '..........oswo.....',
    'oo.ooooo..oswo.....',
    'owowwwwwoooswo.....',
    'owwwwwwwwwwwwo.....',
    '.owwgggggwwwwo.....',
    '.oswwggggwwwwo.....',
    '..osswwwwwwwo......',
    '...osssssswo.......',
    '....ooooooo........',
  ];
  const GOOSE_TOP_HONK = patch(GOOSE_TOP, [[14, 2, 'oooo'], [14, 3, 'bbbbo'], [14, 4, 'toooo'], [13, 5, 'obbo'], [14, 6, 'oo']]);
  const GOOSE_LEG = ['oyo', 'oyo', 'oyyo', 'oooo'];
  const GOOSE_LEG_UP = ['oyo', 'oyyo', 'oooo'];
  const GOOSE_LEG_FWD = ['oyo.', '.oyo', '.oyyo', '.oooo'];
  const GOOSE_LEG_BACK = ['.oyo', 'oyo.', 'oyyo', 'oooo'];
  const gooseFrame = (top, legA, legB, drop = 0) => stamp(19, 20, [
    [legB[0], legB[1], 20 - legB[0].length - (legB[2] || 0), { y: 'd' }],
    [legA[0], legA[1], 20 - legA[0].length - (legA[2] || 0)],
    [top, 0, drop],
  ]);
  // Chase pose: body tipped forward, neck out flat, bill open in a honk.
  const GOOSE_CHARGE = [
    '.....................ooo....',
    'oo.ooooo............owwwooo.',
    'owowwwwwooo.......oowwewbbbo',
    'owwwwwwwwwwooooooowwwwwtooo.',
    '.owwwwwwwwwwwwwwwwwwwwobbo..',
    '.oswwwwwwwwwwsssssoooo.oo...',
    '..osswwwwwwwsooooo..........',
    '...osssssswo................',
    '....ooooooo.................',
  ];
  // The near wing, thrown up and back, then beaten down along the body:
  // two frames make the flap. The raised wing's trailing edge is cut into
  // steps, one for each long flight feather, with a grey line under each.
  const GOOSE_WING_UP = [
    '.ooo.........',
    'owwwo........',
    'owwwwo.......',
    '.oogwwo......',
    'owwwwwwo.....',
    'owwwwwwwo....',
    '.oogwwwwwo...',
    'owwwwgwwwwo..',
    'owwwwwgwwwwo.',
    '.ooggwwgwwwwo',
    '...ooooooooo.',
  ];
  const GOOSE_WING_DOWN = [
    '...oooooooo..',
    '.oowwwwwwwwo.',
    'owwwwwwwwwwwo',
    'ogwgwgwwwwwo.',
    '.ooogggggoo..',
    '....ooooo....',
  ];
  const gooseChase = (wing, wingAt, legA, legB, drop) => stamp(28, 19, [
    [legB[0], legB[1], 19 - legB[0].length - (legB[2] || 0), { y: 'd' }],
    [legA[0], legA[1], 19 - legA[0].length - (legA[2] || 0)],
    [GOOSE_CHARGE, 0, 7 + drop],
    [wing, wingAt[0], wingAt[1] + drop],
  ]);
  // leg parts paired with the x where they are stamped: [part, x, lift]
  const gl = (part, x, lift) => [part, x, lift];

  // A step: one foot forward and one back, then the legs pass each other.
  const G_STAND = [gl(GOOSE_LEG, 4), gl(GOOSE_LEG, 8)];
  const G_STEPS = [
    [gl(GOOSE_LEG_FWD, 7), gl(GOOSE_LEG_BACK, 3), 1],
    [gl(GOOSE_LEG, 5), gl(GOOSE_LEG_UP, 7, 1), 0],
    [gl(GOOSE_LEG_BACK, 3), gl(GOOSE_LEG_FWD, 7), 1],
    [gl(GOOSE_LEG_UP, 5, 1), gl(GOOSE_LEG, 7), 0],
  ];
  const gooseFrames = {
    stand: gooseFrame(GOOSE_TOP, G_STAND[0], G_STAND[1]),
    honk: gooseFrame(GOOSE_TOP_HONK, G_STAND[0], G_STAND[1]),
  };
  G_STEPS.forEach((st, i) => {
    gooseFrames['walk' + i] = gooseFrame(GOOSE_TOP, st[0], st[1], st[2]);
    gooseFrames['honkwalk' + i] = gooseFrame(GOOSE_TOP_HONK, st[0], st[1], st[2]);
  });
  PX.define('goose', {
    pal: GOOSE_PAL,
    anchor: [7, 20],         // under the middle of the body, not the bill
    frames: gooseFrames,
  });
  PX.define('goose_chase', {
    pal: GOOSE_PAL,
    anchor: [7, 19],
    frames: [
      gooseChase(GOOSE_WING_UP, [0, 0], G_STEPS[0][0], G_STEPS[0][1], 0),
      gooseChase(GOOSE_WING_DOWN, [0, 8], G_STEPS[2][0], G_STEPS[2][1], 1),
    ],
  });

  // ── The Cat ───────────────────────────────────────────
  // Drawn as an orange tabby; cat.js recolours c/d/l/g for the black and
  // the blue-grey cats. c = fur, d = stripes, l = pale muzzle and paws,
  // g = eyes, n = nose.
  const CAT_PAL = {
    o: PAL.ink, c: PAL.or2, d: PAL.or3, l: PAL.cream, g: PAL.black,
    n: PAL.pi3, p: PAL.pi2, z: PAL.bl1,
  };
  const CAT_HEAD = [
    '.o....o.',
    'oco..oco',
    'ocpoopco',
    'occddcco',
    'ocgccgco',
    'occlnlco',
    '.ocllco.',
    '..oooo..',
  ];
  const CAT_HEAD_BLINK = patch(CAT_HEAD, [[2, 4, 'occo']]);
  const CAT_HEAD_HUNT = patch(CAT_HEAD, [[1, 3, 'cccccc']]);
  const CAT_BODY = [
    '.ooooooooooo.',
    'occdccdccdcco',
    'occdccdccdcco',
    'occccccccccco',
    'occlllllllcco',
    '.ooooooooooo.',
  ];
  const CAT_LEG = ['oco', 'oco', 'olo', 'ooo'];
  const CAT_LEG_UP = ['oco', 'olo', 'ooo'];
  const CAT_LEG_FWD = ['oco.', 'oco.', '.olo', '.ooo'];
  const CAT_LEG_BACK = mirror(CAT_LEG_FWD);
  const CAT_TAIL_A = [
    '.oo..',
    'occo.',
    'oco..',
    'oco..',
    'occo.',
    '.occo',
    '..oco',
  ];
  const CAT_TAIL_B = [
    '..oo.',
    '.occo',
    '.oco.',
    '.oco.',
    '.occo',
    '..oco',
    '..oco',
  ];
  const CAT_TAIL_LOW = [
    'oo...',
    'occo.',
    '.occo',
    '..ooo',
  ];
  const CAT_W = 24, CAT_H = 15;
  const catWalk = (head, tail, legs, drop = 0) => stamp(CAT_W, CAT_H, [
    [legs[1][0], 6 + legs[1][1], CAT_H - legs[1][0].length - (legs[1][2] || 0), { c: 'd' }],
    [legs[3][0], 14 + legs[3][1], CAT_H - legs[3][0].length - (legs[3][2] || 0), { c: 'd' }],
    [legs[0][0], 4 + legs[0][1], CAT_H - legs[0][0].length - (legs[0][2] || 0)],
    [legs[2][0], 12 + legs[2][1], CAT_H - legs[2][0].length - (legs[2][2] || 0)],
    [tail, 0, (tail === CAT_TAIL_LOW ? 3 : 1) + drop],
    [CAT_BODY, 3, 6 + drop],
    [head, 14, 1 + drop],
  ]);
  const CS = [CAT_LEG, 0], CU = [CAT_LEG_UP, 0, 1];
  const CF = [CAT_LEG_FWD, 0], CB = [CAT_LEG_BACK, -1];

  // Low stalking crouch: belly on the grass, head down, tail flat.
  const CAT_STALK = [
    '...............o....o.',
    '..............oco..oco',
    '..............ocpoopco',
    'oo...oooooooooocccccco',
    'occooocdccdccdocgccgco',
    '.ooccoccccccccocclnlco',
    '...oooclllllllcocllco.',
    '.....ooloooolooooooo..',
    '......ooo..ooo........',
  ].map(r => r.replace(/[^\x00-\x7f]/g, 'c'));
  const CAT_STALK2 = patch(CAT_STALK, [[0, 3, '..'], [0, 4, 'oo.'], [0, 5, 'occ'], [0, 6, '.oo']]);
  // Pounce: stretched right out in the air, front paws reaching.
  const CAT_POUNCE = [
    '.................o....o.',
    '................oco..oco',
    '................ocpoopco',
    '.......oooooooooocccccco',
    'oo....occdccdccdoocgccgco',
    'occo.occcccccccccocclnlco',
    '.occooccllllllllcoocllcoo',
    '..oocccoooooooooocoooooclo',
    '....ooolo.........ocooloo.',
    '......ooo..........oloo...',
    '....................oo....',
  ].map(r => (r + '..').slice(0, 26));
  // Sitting upright, facing us, tail curled round the feet.
  const CAT_SIT = [
    '...o....o....',
    '..oco..oco...',
    '..ocpoopco...',
    '..occddcco...',
    '..ocgccgco...',
    '..occlnlco...',
    '...ocllco....',
    '..occllcco...',
    '.occcllccco..',
    '.ocdcllcdco..',
    '.occcllcccooo',
    '.occlcclccoco',
    '.oollooloooco',
    '..oooooooooo.',
  ].map(r => r.replace(/[^\x00-\x7f]/g, 'o'));
  const CAT_SIT2 = patch(CAT_SIT, [[10, 9, 'ooo'], [10, 10, 'oco']]);
  const CAT_SIT_BLINK = patch(CAT_SIT, [[4, 4, 'occo']]);
  const CAT_LICK2 = patch(CAT_SIT, [[4, 4, 'occo'], [8, 6, 'olo'], [8, 7, 'colo'], [10, 8, 'oo']]);
  // After a miss: sitting, one paw lifted for a wash.
  const CAT_LICK = patch(CAT_SIT, [[4, 4, 'occo'], [8, 5, 'olo'], [7, 6, 'oolo'], [9, 7, 'oo'], [10, 8, '.']]);
  // Asleep: chin on the grass, eyes shut, tail tucked under the chin.
  // Two frames of slow breathing (the back rises).
  const CAT_SLEEP = [
    '.........o....o.',
    '...ooooooco..oco',
    '.oocdcdcocpoopco',
    'occdcdccocccccco',
    'occcccccococcoco',
    'occcccccocclnlco',
    'occcoooooocllco.',
    'ocooccccclooo...',
    '.oooooooooo.....',
  ];
  const CAT_SLEEP2 = [
    '....oooo.o....o.',
    '..oocdcdoco..oco',
    '.occdcdcocpoopco',
    'occcdcdcocccccco',
    'occcccccococcoco',
    'occcccccocclnlco',
    'occcoooooocllco.',
    'ocooccccclooo...',
    '.oooooooooo.....',
  ];
  // Loaf: lying down but awake, waiting out the rain.
  const CAT_LOAF = [
    '.........o....o.',
    '........oco..oco',
    '........ocpoopco',
    '..ooooooocccccco',
    '.occdccdcocgccgco',
    'occcdccdcocclnlco',
    'occcccccccocllco.',
    'occllllllllooooo.',
    '.oooooooooooo....',
  ].map(r => (r + '.').slice(0, 17));

  PX.define('cat', {
    pal: CAT_PAL,
    anchor: [10, CAT_H],
    frames: {
      walk0: catWalk(CAT_HEAD, CAT_TAIL_A, [CB, CF, CF, CB], 1),
      walk1: catWalk(CAT_HEAD, CAT_TAIL_A, [CS, CU, CS, CU]),
      walk2: catWalk(CAT_HEAD, CAT_TAIL_B, [CF, CB, CB, CF], 1),
      walk3: catWalk(CAT_HEAD, CAT_TAIL_B, [CU, CS, CU, CS]),
      stand0: catWalk(CAT_HEAD, CAT_TAIL_A, [CS, CS, CS, CS]),
      stand1: catWalk(CAT_HEAD, CAT_TAIL_B, [CS, CS, CS, CS]),
      blink: catWalk(CAT_HEAD_BLINK, CAT_TAIL_A, [CS, CS, CS, CS]),
      run0: catWalk(CAT_HEAD, CAT_TAIL_LOW, [[CAT_LEG_BACK, -2, 1], [CAT_LEG_BACK, -2, 1], [CAT_LEG_FWD, 1, 1], [CAT_LEG_FWD, 1, 1]], 0),
      run1: catWalk(CAT_HEAD, CAT_TAIL_LOW, [CF, CF, CB, CB], 1),
    },
  });
  PX.define('cat_stalk', { pal: CAT_PAL, frames: [CAT_STALK, CAT_STALK2] });
  PX.define('cat_pounce', { pal: CAT_PAL, frames: [CAT_POUNCE] });
  PX.define('cat_sit', { pal: CAT_PAL, frames: { sit0: CAT_SIT, sit1: CAT_SIT2, blink: CAT_SIT_BLINK, lick0: CAT_LICK, lick1: CAT_LICK2 } });
  PX.define('cat_sleep', { pal: CAT_PAL, frames: [CAT_SLEEP, CAT_SLEEP2] });
  PX.define('cat_loaf', { pal: CAT_PAL, frames: { loaf: CAT_LOAF, blink: patch(CAT_LOAF, [[11, 4, 'occo']]) } });
  // The little "z" that floats up from a sleeping cat (small, then big).
  PX.define('zzz', {
    pal: { z: PAL.white },
    frames: [
      ['zzz', '.z.', 'zzz'],
      ['zzzz', '..z.', '.z..', 'zzzz'],
    ],
  });

  // ── The Groundhog ─────────────────────────────────────
  // Only his top half ever shows, so that is all there is. He faces us;
  // `side` glances right (flip it for left). groundhog.js draws the top N
  // rows to make him rise out of his hole, so each pose is also sliced
  // into frames named front1..front13, side1.., blink1.. (N rows tall).
  // A groundhog, not a teddy bear: a flat, wide head with small ears set
  // low at the sides, grizzled grey-brown fur, a pale muzzle with a dark
  // nose and two big front teeth, and dark paws held together on his chest.
  const HOG_PAL = {
    o: PAL.ink, b: PAL.ta4, d: PAL.wo3, l: PAL.ta1, h: PAL.ta3, g: PAL.g3,
    e: PAL.black, n: PAL.black, w: PAL.white, k: PAL.wo4,
  };
  const HOG_FRONT = [
    '...ooooooo...',
    '.oobhghgbboo.',
    'odobbbbbbbodo',
    '.obbbbbbbbbo.',
    'obebbbbbbbebo',
    'obbblllllbbbo',
    'obbllnnnllbbo',
    '.obllwowllbo.',
    '.obbbwowbbbo.',
    'obgbbbbbbbgbo',
    'obbkkbbbkkbbo',
    'obbbkklkkbbbo',
    'obgbblllbbgbo',
  ];
  // Glancing right: his head turns, so the far ear slips out of sight, the
  // muzzle swings over to that side and both eyes show their whites.
  const HOG_SIDE = [
    '...ooooooo...',
    '.oobhghgbbo..',
    'odobbbbbbbbo.',
    '.obbbbbbbbbbo',
    'obbbwebbbwebo',
    'obbbbbblllllo',
    'obbbbbllnnnlo',
    '.obbbbllwowlo',
    '.obbbbbbwowo.',
    'obgbbbbbbbgbo',
    'obbkkbbbkkbbo',
    'obbbkklkkbbbo',
    'obgbblllbbgbo',
  ];
  const HOG_BLINK = patch(HOG_FRONT, [[2, 4, 'd'], [10, 4, 'd']]);
  const hogFrames = {};
  for (const [name, rows] of [['front', HOG_FRONT], ['side', HOG_SIDE], ['blink', HOG_BLINK]]) {
    for (let n = 1; n <= rows.length; n++) hogFrames[name + n] = rows.slice(0, n);
  }
  PX.define('groundhog', { pal: HOG_PAL, frames: hogFrames });
  // His hole: the dark opening goes behind him, the dirt lip in front.
  PX.define('groundhog_hole', {
    pal: { o: PAL.wo4, k: PAL.black, d: PAL.br5, m: PAL.wo3, l: PAL.wo2 },
    frames: {
      back: [
        '.....ooooooooooo.....',
        '..ooodddddddddddooo..',
        '.oddkkkkkkkkkkkkkddo.',
        'odkkkkkkkkkkkkkkkkkdo',
        'odkkkkkkkkkkkkkkkkkdo',
        '.....................',
        '.....................',
        '.....................',
      ],
      front: [
        '.....................',
        '.....................',
        '.....................',
        '.....................',
        'ol.................do',
        'omll.............mddo',
        '.ommlmmmmmmmmmmmmddo.',
        '..ooommmmdmmmdmdooo..',
      ],
    },
  });

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
}
