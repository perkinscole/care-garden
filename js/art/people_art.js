// ================================================================
// File: people_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 22, 2026
// Description: Pixel-art sprite definitions for the gardener, students, teachers and staff.
//   Every person is built from the same small kit of layers: a body
//   (torso + legs, with walk frames), an arm, a head, a hairstyle and
//   optional extras (cap, sun hat, beard, backpack). Each layer is
//   recoloured from short fixed lists of skin tones, hair colours and
//   clothes, so a crowd of students all look different without needing
//   a sprite set each. PEOPLE.look() describes one person and
//   PEOPLE.draw() stacks the layers.
//
//   No p5.js functions are used in this file, so tools/sprites.html
//   can show every sprite on its own.
// ================================================================

// ── Building frames from parts ────────────────────────
// Every body is 14 art pixels wide with the person's centre line between
// columns 6 and 7. A body frame is a torso stacked on a set of legs. The
// two "contact" walk frames (feet wide apart) are one row shorter than the
// others, so the whole upper body dips by a pixel on every step.
const PPL_BLANK = '..............';

// Swaps two palette letters in a set of rows (near leg <-> far leg).
function pplSwap(rows, a, b) {
  return rows.map(r => r.replace(new RegExp('[' + a + b + ']', 'g'), ch => (ch === a ? b : a)));
}

// torso: rows of the upper body. legs: { stand, contact, pass } rows.
// extraSwap: more letter pairs to swap for the second half of the walk.
function pplBody(torso, legs, extraSwap) {
  let contact2 = pplSwap(legs.contact, 'p', 'P');
  let pass2 = pplSwap(legs.pass, 'p', 'P');
  for (const pair of (extraSwap || [])) {
    contact2 = pplSwap(contact2, pair[0], pair[1]);
    pass2 = pplSwap(pass2, pair[0], pair[1]);
  }
  return {
    stand: [...torso, ...legs.stand],
    w0: [PPL_BLANK, ...torso, ...legs.contact],   // near leg forward
    w1: [...torso, ...legs.pass],                 // near leg planted, far leg passing
    w2: [PPL_BLANK, ...torso, ...contact2],       // far leg forward
    w3: [...torso, ...pass2],                     // far leg planted
  };
}

// Default colours, so the sprite viewer shows something sensible.
// k/K skin, s/S/l shirt (mid, shadow, light), c collar, t tie, b belt,
// p/P near and far trouser leg, g/G lower leg (trousers, tights or skin),
// d shirt stripe, x shoes.
const PPL_PAL = {
  o: PAL.ink, k: PAL.sn2, K: PAL.sn3, e: PAL.black, w: PAL.white, m: PAL.re3, M: PAL.re4,
  s: PAL.bl2, S: PAL.bl3, l: PAL.bl1, c: PAL.white, t: PAL.re2, b: PAL.wo4, d: PAL.white,
  p: PAL.sl2, P: PAL.sl3, g: PAL.sl2, G: PAL.sl3, f: PAL.bl2, x: PAL.wo3,
  h: PAL.hrBrown, H: PAL.hrDark, i: PAL.hrLight,
};

// ── Adult in shirt and trousers ───────────────────────
// 21 rows: 10 of torso, 9 of leg, 2 of shoe. The shoulders are a pixel
// wider than the hips. The tie (t) and collar (c)
// sit toward the front of the chest; recolour t to the shirt colour for
// someone without a tie.
PX.define('adultBody', {
  pal: PPL_PAL,
  frames: pplBody([
    '.....oooooo...',
    '....olssccco..',
    '....olssttSo..',
    '....olssttSo..',
    '....osssttSo..',
    '....osssttSo..',
    '....osssStSo..',
    '....osssSSo...',
    '....osssSSo...',
    '....obbbbbo...',
  ], {
    stand: [
      '....opppPPo...',
      '....opppPPo...',
      '....oppoPPo...',
      '....oppoPPo...',
      '....oppoPPo...',
      '....oppoPPo...',
      '....oppoPPo...',
      '....oppoPPo...',
      '....oppoPPo...',
      '....oxxxoxxo..',
      '....oooooooo..',
    ],
    contact: [
      '....opppPPo...',
      '....oPPpppo...',
      '...oPPooppo...',
      '...oPPo.oppo..',
      '..oPPo..oppo..',
      '..oPPo...oppo.',
      '..oPPo...oppo.',
      '.oPPo....oppo.',
      '.oxxxo...oxxxo',
      '.ooooo...ooooo',
    ],
    pass: [
      '....opppPPo...',
      '....oppppPo...',
      '....oPPpppo...',
      '....oPPoppo...',
      '....oPPoppo...',
      '....oPPoppo...',
      '....oPPoppo...',
      '...oxxxoppo...',
      '...oooooppo...',
      '.......oxxxo..',
      '.......ooooo..',
    ],
  }),
});

// ── Adult in a jacket and skirt ───────────────────────
// p/P is the skirt, g/G the legs below it, c the blouse, t a necklace.
PX.define('adultSkirtBody', {
  pal: Object.assign({}, PPL_PAL, { s: PAL.pi4, S: PAL.re4, l: PAL.pi3, t: PAL.ye2, p: PAL.pu3, P: PAL.pu4, g: PAL.wo3, G: PAL.wo4, x: PAL.black }),
  frames: pplBody([
    '.....ooooo....',
    '....olsccco...',
    '....olsScto...',
    '....olssSco...',
    '....ossssSo...',
    '....osssSSo...',
    '....osssSSo...',
    '....osssSSo...',
    '....osssSSo...',
    '....osssSSo...',
  ], {
    stand: [
      '....opppPPo...',
      '...oppppPPo...',
      '...opppppPPo..',
      '...opppppPPo..',
      '...ooooooooo..',
      '.....ogoGo....',
      '.....ogoGo....',
      '.....ogoGo....',
      '.....ogoGo....',
      '.....oxoxxo...',
      '.....oooooo...',
    ],
    contact: [
      '....opppPPo...',
      '...oppppPPo...',
      '...opppppPPo..',
      '..oppppppPPo..',
      '..oooooooooo..',
      '....oGo.ogo...',
      '...oGo...ogo..',
      '...oGo...ogo..',
      '..oxxo...oxxo.',
      '..oooo...oooo.',
    ],
    pass: [
      '....opppPPo...',
      '...oppppPPo...',
      '...opppppPPo..',
      '...opppppPPo..',
      '...ooooooooo..',
      '....oGoogo....',
      '....oGoogo....',
      '...oxxoogo....',
      '...ooooogo....',
      '.......oxxo...',
      '.......oooo...',
    ],
  }, ['gG']),
});

// ── Student ───────────────────────────────────────────
// 14 rows: 6 of T-shirt, 6 of leg, 2 of shoe. d is a chest stripe.
// Recolour g/G to skin for shorts. `crouch` is the flower-picking squat.
PX.define('kidBody', {
  pal: PPL_PAL,
  frames: Object.assign(pplBody([
    '.....ooooo....',
    '....olsssSo...',
    '....olsssSo...',
    '....odddddo...',
    '....osssSSo...',
    '....osssSSo...',
  ], {
    stand: [
      '....opppPPo...',
      '....oppoPPo...',
      '....oggoGGo...',
      '....oggoGGo...',
      '....oggoGGo...',
      '....oggoGGo...',
      '....oxxxoxxo..',
      '....oooooooo..',
    ],
    contact: [
      '....opppPPo...',
      '....oPPpppo...',
      '...oGGooggo...',
      '...oGGo.oggo..',
      '..oGGo..oggo..',
      '..oxxxo.oxxxo.',
      '..ooooo.ooooo.',
    ],
    pass: [
      '....opppPPo...',
      '....oPPpppo...',
      '....oGGoggo...',
      '....oGGoggo...',
      '...oxxxoggo...',
      '...oooooggo...',
      '.......oxxxo..',
      '.......ooooo..',
    ],
  }, ['gG']), {
    crouch: [
      PPL_BLANK,
      PPL_BLANK,
      PPL_BLANK,
      PPL_BLANK,
      '.....ooooo....',
      '....olsssSo...',
      '....olsssSo...',
      '....odddddo...',
      '....osssSSoo..',
      '....opppppPPo.',
      '....oppppPPPo.',
      '....ooooogGGo.',
      '....oxxxoxxxo.',
      '....ooooooooo.',
    ],
  }),
});

// ── The Gardener's floral dress ───────────────────────
// d/D bodice, a/A skirt, and r, y, v are the little flowers printed on it.
PX.define('gardenerBody', {
  pal: Object.assign({}, PPL_PAL, {
    d: PAL.pi2, D: PAL.pi3, a: PAL.pi1, A: PAL.pi2,
    r: PAL.re2, y: PAL.ye2, v: PAL.pu2, x: PAL.wo4,
  }),
  frames: pplBody([
    '.....ooooo....',
    '....odddDDo...',
    '....odddyDo...',
    '....odddDDo...',
    '....oddvDDo...',
    '....odddDDo...',
    '...oaaaaaAo...',
    '...oaaraaAo...',
    '..oaaaaayaAo..',
    '..oavaaaaaAo..',
    '..oaaaaraaAo..',
    '.oaayaaaaaaAo.',
    '.oaaaaavaaaAo.',
    '.oaraaaaayaAo.',
    '.oooooooooooo.',
  ], {
    stand: [
      '.....okoKo....',
      '.....okoKo....',
      '.....okoKo....',
      '.....okoKo....',
      '.....oxoxxo...',
      '.....oooooo...',
    ],
    contact: [
      '....oKo.oko...',
      '...oKo...oko..',
      '...oKo...oko..',
      '..oxxo...oxxo.',
      '..oooo...oooo.',
    ],
    pass: [
      '....oKooko....',
      '....oKooko....',
      '...oxxooko....',
      '...oooooko....',
      '.......oxxo...',
      '.......oooo...',
    ],
  }, ['kK']),
});

// ── Arms ──────────────────────────────────────────────
// One arm, drawn over the body. Row 7 (adults) or row 6 (students) is the
// shoulder and lines up with the top row of the body sprite. s/l is the
// sleeve, f the forearm (sleeve colour for long sleeves, skin for short),
// k the hand, S a shadow that separates the arm from the chest.
//   down / fwd / back : the walking swing
//   hold              : elbow bent, hand out in front (carrying something)
//   wave1 / wave2     : arm up, waving
PX.define('adultArm', {
  pal: PPL_PAL,
  anchor: [7, 7],
  frames: {
    down: [
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
      '....oo........',
      '...olsS.......',
      '...olsS.......',
      '...ossS.......',
      '...ossS.......',
      '...offS.......',
      '...offS.......',
      '...offS.......',
      '...offo.......',
      '...okko.......',
      '....oo........',
    ],
    fwd: [
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
      '....oo........',
      '...olsS.......',
      '...olsS.......',
      '...ossS.......',
      '....ossS......',
      '....offS......',
      '.....offo.....',
      '.....offo.....',
      '......okko....',
      '.......oo.....',
      PPL_BLANK,
    ],
    back: [
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
      '....oo........',
      '...olsS.......',
      '...olsS.......',
      '...ossS.......',
      '..ossS........',
      '..offo........',
      '.offo.........',
      '.offo.........',
      'okko..........',
      '.oo...........',
      PPL_BLANK,
    ],
    hold: [
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
      '....oo........',
      '...olsS.......',
      '...olsS.......',
      '...ossoooooo..',
      '...ossffffkko.',
      '....ooooooooo.',
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
    ],
    wave1: [
      PPL_BLANK,
      '.oo...........',
      'okko..........',
      'offo..........',
      '.offo.........',
      '.offo.........',
      '..osso........',
      '..ossoo.......',
      '...osso.......',
      '....oo........',
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
    ],
    wave2: [
      '...oo.........',
      '..okko........',
      '..offo........',
      '..offo........',
      '..offo........',
      '..offo........',
      '..osso........',
      '..ossoo.......',
      '...osso.......',
      '....oo........',
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
    ],
  },
});

// Student arm: shorter. `carry` holds a picked flower out in front,
// `reach` stretches straight out to pet the ram and `pick` reaches down
// to the ground from a crouch.
PX.define('kidArm', {
  pal: Object.assign({}, PPL_PAL, { f: PAL.sn2 }),
  anchor: [7, 6],
  frames: {
    down: [
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
      '....oo........',
      '...olsS.......',
      '...ossS.......',
      '...offS.......',
      '...offS.......',
      '...offo.......',
      '...okko.......',
      '....oo........',
    ],
    fwd: [
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
      '....oo........',
      '...olsS.......',
      '...ossS.......',
      '....offS......',
      '....offo......',
      '.....okko.....',
      '......oo......',
      PPL_BLANK,
    ],
    back: [
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
      '....oo........',
      '...olsS.......',
      '...ossS.......',
      '..offS........',
      '..offo........',
      '.okko.........',
      '..oo..........',
      PPL_BLANK,
    ],
    hold: [
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
      '....oo........',
      '...olsS.......',
      '...ossoooooo..',
      '...osfffffkko.',
      '....ooooooooo.',
      PPL_BLANK, PPL_BLANK, PPL_BLANK,
    ],
    carry: [
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
      '....oo........',
      '...olso.......',
      '...osso.......',
      '....offoo.....',
      '.....ooffoo...',
      '.......ooffo..',
      '.........okko.',
      '..........oo..',
    ],
    reach: [
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
      '....ooooooooo.',
      '...olssfffkko.',
      '...osoooooooo.',
      '....o.........',
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
    ],
    pick: [
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
      '....oo........',
      '...olso.......',
      '...osso.......',
      '....offo......',
      '.....offo.....',
      '......offo....',
      '.......okko...',
      '........oo....',
    ],
    wave1: [
      '.oo...........',
      'okko..........',
      'offo..........',
      '.offo.........',
      '..osso........',
      '..ossoo.......',
      '...osso.......',
      '....oo........',
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
    ],
    wave2: [
      '...oo.........',
      '..okko........',
      '..offo........',
      '..offo........',
      '..osso........',
      '..ossoo.......',
      '...osso.......',
      '....oo........',
      PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK, PPL_BLANK,
    ],
  },
});

// ── Head ──────────────────────────────────────────────
// 10 wide, 9 tall, facing right: each eye is a white pixel with the pupil
// on its front side, so everyone looks where they are going.
// The same head is used for everyone; hair, hats and beards go on top.
//   smile : normal        blink : eyes shut
//   open  : mouth open (shouting, surprised)
//   flat  : sleepy half-closed eyes (waiting out the rain)
PX.define('peopleHead', {
  pal: PPL_PAL,
  anchor: [4, 9],
  frames: {
    smile: [
      '..oooooo..',
      '.okkkkkko.',
      'okkkkkkkko',
      'okkwekweko',
      'okkwekweko',
      'okkkkkkkko',
      'oKkkkmmkko',
      '.oKkkkkko.',
      '..oooooo..',
    ],
    blink: [
      '..oooooo..',
      '.okkkkkko.',
      'okkkkkkkko',
      'okkkkkkkko',
      'okkKKkKKko',
      'okkkkkkkko',
      'oKkkkmmkko',
      '.oKkkkkko.',
      '..oooooo..',
    ],
    open: [
      '..oooooo..',
      '.okkkkkko.',
      'okkkkkkkko',
      'okkwekweko',
      'okkwekweko',
      'okkkkMMkko',
      'oKkkkMMkko',
      '.oKkkkkko.',
      '..oooooo..',
    ],
    flat: [
      '..oooooo..',
      '.okkkkkko.',
      'okkkkkkkko',
      'okkKKkKKko',
      'okkwekweko',
      'okkkkkkkko',
      'oKkkkmmkko',
      '.oKkkkkko.',
      '..oooooo..',
    ],
  },
});

// ── Hair ──────────────────────────────────────────────
// Drawn over the head. The head occupies columns 3–12 and rows 2–10 of
// this 16x13 grid, so hair can stand up above it, hang below it, or stick
// out behind in a ponytail. h hair, H shadow, i shine.
PX.define('peopleHair', {
  pal: PPL_PAL,
  anchor: [7, 11],
  frames: {
    // short back and sides with a fringe
    short: [
      '................',
      '.....oooooo.....',
      '....oihhhhho....',
      '...oihhhhhhho...',
      '...ohhhhhhhh....',
      '...ohh..........',
      '...ohh..........',
      '...oH...........',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // cropped close to the head
    buzz: [
      '................',
      '................',
      '.....oooooo.....',
      '....ohhhhhho....',
      '...ohhhh........',
      '...ohh..........',
      '...oH...........',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // neat side parting that leaves the forehead clear
    neat: [
      '................',
      '.....oooooo.....',
      '....ohhihhho....',
      '...ohhhihhhho...',
      '...ohhhh....o...',
      '...ohh..........',
      '...ohh..........',
      '...oH...........',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // long fringe swept forward
    swoop: [
      '................',
      '.....ooooooo....',
      '....ohihhhhho...',
      '...ohihhhhhhho..',
      '...ohhhhhhhhho..',
      '...ohhh......o..',
      '...ohh..........',
      '...oH...........',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // big round curls
    curly: [
      '.....oooooo.....',
      '...oohhhhhhoo...',
      '..ohhihhhhhhho..',
      '..ohihhhhhhhho..',
      '..ohhhhhhhhhho..',
      '..ohhh.......o..',
      '..ohhh..........',
      '..oHh...........',
      '...o............',
      '................',
      '................',
      '................',
      '................',
    ],
    // chin-length bob that frames the face on both sides
    bob: [
      '................',
      '.....oooooo.....',
      '....oihhhhho....',
      '...oihhhhhhho...',
      '..ohihhhhhhhho..',
      '..ohhh......ho..',
      '..ohhh......ho..',
      '..ohhh......ho..',
      '..ohhh......Ho..',
      '..ohhH.......o..',
      '...ooo..........',
      '................',
      '................',
    ],
    // shoulder-length hair down the back
    long: [
      '................',
      '.....oooooo.....',
      '....oihhhhho....',
      '...oihhhhhhho...',
      '..ohihhhhhhh....',
      '..ohhh..........',
      '..ohhh..........',
      '..ohhh..........',
      '..ohhh..........',
      '..ohhhh.........',
      '..ohhhho........',
      '..oHhhHo........',
      '...oooo.........',
    ],
    // ponytail swinging out behind
    pony: [
      '................',
      '.....oooooo.....',
      '....oihhhhho....',
      '.oooihhhhhhho...',
      'ohhhhhhhhhhh....',
      'ohhohh..........',
      'ohhohh..........',
      'oHho............',
      '.oHo............',
      '..o.............',
      '................',
      '................',
      '................',
    ],
    // hair pinned up in a bun
    bun: [
      '..ooo...........',
      '.ohhhoooooo.....',
      '.ohhhhihhhho....',
      '..ooohhhhhhho...',
      '...ohhhhhhhh....',
      '...ohh..........',
      '...oh...........',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // bald on top with hair round the back and sides
    fringe: [
      '................',
      '................',
      '................',
      '................',
      '...ohh..........',
      '...ohh..........',
      '...ohh..........',
      '...oH...........',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
});

// ── Things worn on the head and face ──────────────────
// Same grid as the hair. a/A cap colour; b beard, m a white smile showing
// through it; i a shine on a bald head.
PX.define('peopleHeadwear', {
  pal: Object.assign({}, PPL_PAL, { a: PAL.re2, A: PAL.re3, b: PAL.hrBlack, m: PAL.white, i: PAL.sn1 }),
  anchor: [7, 11],
  frames: {
    // baseball cap, peak to the front
    cap: [
      '................',
      '.....oooooo.....',
      '....oaaaaaao....',
      '...oaaaaaaaao...',
      '...oAAAAAAAAAAAo',
      '............ooo.',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // full beard with a grin in it
    beard: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '....b......bb...',
      '....bbbbmmbbb...',
      '.....bbbbbbb....',
      '................',
      '................',
      '................',
    ],
    // shine on a bald head
    shine: [
      '................',
      '................',
      '................',
      '.....ii.........',
      '....i...........',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
});

// The Gardener's wide straw sun hat with its pink band and a flower.
// 20 wide so the brim shades her whole face; the brim's lower edge sits
// just above her eyes.
PX.define('gardenerHat', {
  pal: { o: PAL.ink, y: PAL.ta1, Y: PAL.ta2, z: PAL.ta3, p: PAL.pi3, P: PAL.pi4, f: PAL.ye2, w: PAL.white },
  anchor: [9, 13],
  frames: [[
    '......oooooooo......',
    '.....oyyyyyyYYo.....',
    '.....oyyyyyyYYo.....',
    '.....opppppwfPo.....',
    '.ooooyyyyyyyYYYoooo.',
    'oyyyyyyyyyyyyYYYYYzo',
    '.oooooooooooooooooo.',
  ]],
});

// ── Things carried ────────────────────────────────────
// Student backpack. `pack` is drawn behind the body, `strap` over the chest.
PX.define('kidBackpack', {
  pal: { o: PAL.ink, a: PAL.re2, A: PAL.re3, z: PAL.ye2 },
  anchor: [9, 0],
  frames: {
    pack: [
      '..oooo...',
      '.oaaaAo..',
      'oaaaaAo..',
      'oaaaaAo..',
      'oazzaAo..',
      'oaaaaAo..',
      'oAAAAAo..',
      '.ooooo...',
    ],
    strap: [
      '.........',
      '......A..',
      '......A..',
      '.....AA..',
      '.........',
      '.........',
      '.........',
      '.........',
    ],
  },
});

// The Gardener's watering can. The anchor is the top of the handle, where
// her hand holds it. `carry` hangs level; `pour` tips the spout down.
PX.define('gardenerCan', {
  pal: { o: PAL.ink, w: PAL.wa3, W: PAL.wa2, B: PAL.sl3, h: PAL.wa1 },
  anchor: [4, 1],
  frames: {
    carry: [
      '...ooo......',
      '..o...o...oo',
      '..o...o..oWo',
      '.ooooooooWo.',
      'oWhwwwwwwo..',
      'oWwwwwwBo...',
      'owwwwwBBo...',
      '.ooooooo....',
    ],
    pour: [
      '...ooo......',
      '..o...oo....',
      '..o.oohwo...',
      '..ooWhwwwo..',
      '.oWwwwwwwwo.',
      '.owwwwwBowwo',
      '..owwBBo.oWo',
      '...oooo..ooo',
    ],
  },
});

// A teacher's tote bag (anchor: top of the handles) and a cup of coffee
// (anchor: where the hand grips it).
PX.define('teacherBag', {
  pal: { o: PAL.ink, b: PAL.wo1, B: PAL.wo2, z: PAL.ta1 },
  anchor: [3, 1],
  frames: [[
    '..ooo..',
    '.o...o.',
    'ooooooo',
    'obbbbBo',
    'obzzbBo',
    'obbbBBo',
    'ooooooo',
  ]],
});
PX.define('teacherCup', {
  pal: { o: PAL.ink, w: PAL.white, c: PAL.wo2, l: PAL.g3 },
  anchor: [2, 3],
  frames: [[
    'oooo',
    'ollo',
    'owwo',
    'occo',
    '.oo.',
  ]],
});

// The Gardener's rainbow umbrella canopy, built row by row: seven colour
// bands under a dome, with a scalloped lower edge. The anchor is the
// middle of the lower edge, where the shaft meets it.
(function () {
  const bands = '.RRROOOYYYGGGGGBBBUUUPPP.';
  // filled columns [from, to] for each row of the dome, top to bottom
  const dome = [[9, 15], [6, 18], [4, 20], [2, 22], [1, 23], [1, 23]];
  // on the lowest row only the rib tips are filled, which makes scallops
  const tips = [1, 3, 4, 6, 7, 9, 10, 14, 15, 17, 18, 20, 21, 23];
  const W = 25, H = 9;
  const fill = [];
  for (let y = 0; y < H; y++) fill.push(new Array(W).fill(false));
  dome.forEach(([a, b], i) => { for (let x = a; x <= b; x++) fill[i + 1][x] = true; });
  for (const x of tips) fill[7][x] = true;
  const rows = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      if (fill[y][x]) { row += bands[x]; continue; }
      const near = (y > 0 && fill[y - 1][x]) || (y < H - 1 && fill[y + 1][x]) ||
                   (x > 0 && fill[y][x - 1]) || (x < W - 1 && fill[y][x + 1]);
      row += near ? 'o' : '.';
    }
    rows.push(row);
  }
  PX.define('gardenerUmbrella', {
    pal: { o: PAL.ink, R: PAL.re2, O: PAL.or2, Y: PAL.ye2, G: PAL.gr2, B: PAL.bl2, U: PAL.pu2, P: PAL.pi2 },
    anchor: [12, 8],
    frames: [rows],
  });
})();

// ── PEOPLE: looks and the layered drawing ─────────────
const PEOPLE = {
  // Skin tones, lightest first. k skin, K its shadow, m the mouth, w/e the eyes.
  SKIN: [PAL.sn1, PAL.sn2, PAL.sn3, PAL.sn4, PAL.sn5, PAL.sn6].map((k, i, all) => ({
    k,
    K: all[i + 1] || PX.mix(k, PAL.ink, 0.3),
    m: i >= 4 ? PX.mix(k, PAL.pi2, 0.5) : PX.mix(k, PAL.re4, 0.6),   // lighter lips on the darkest skin
    w: PAL.white,
    M: PAL.re4,
    e: PAL.black,
  })),

  // Hair colours. h hair, H shadow, i shine.
  HAIR: [PAL.hrBlonde, PAL.hrGinger, PAL.hrLight, PAL.hrBrown, PAL.hrDark, PAL.hrBlack, PAL.hrGray].map(h => ({
    h, H: PX.mix(h, PAL.ink, 0.35), i: PX.mix(h, PAL.white, 0.35),
  })),
  BLONDE: 0, GINGER: 1, LIGHT: 2, BROWN: 3, DARK: 4, BLACK: 5, GRAY: 6,

  // Cloth: { m: base, d: shadow, l: light }. PX.ramp gives the same shape.
  WHITE: { m: PAL.white, d: PAL.g2, l: PAL.white },
  KHAKI: { m: PAL.ta2, d: PAL.ta3, l: PAL.ta1 },
  JEANS: { m: PAL.bl3, d: PAL.bl4, l: PAL.bl2 },
  NAVY: { m: PAL.sk7, d: PAL.sk8, l: PAL.sk6 },
  CHARCOAL: { m: PAL.g5, d: PAL.ink, l: PAL.g4 },
  GREY: { m: PAL.g4, d: PAL.g5, l: PAL.g3 },
  COCOA: { m: PAL.wo2, d: PAL.wo3, l: PAL.wo1 },

  // Bright T-shirt colours for students and backpacks.
  BRIGHTS: [
    PX.ramp(2, 72, 58),     // red
    PX.ramp(28, 85, 58),    // orange
    PX.ramp(48, 88, 58),    // yellow
    PX.ramp(130, 48, 46),   // green
    PX.ramp(178, 55, 46),   // teal
    PX.ramp(215, 68, 58),   // blue
    PX.ramp(272, 50, 60),   // purple
    PX.ramp(335, 70, 66),   // pink
  ],
  // Calmer shirt and blouse colours for the grown-ups.
  SOFTS: [
    PX.ramp(205, 45, 62),   // light blue
    PX.ramp(150, 32, 52),   // sage
    PX.ramp(350, 48, 58),   // rose
    PX.ramp(275, 32, 56),   // lavender
    PX.ramp(28, 62, 60),    // apricot
    PX.ramp(185, 42, 44),   // teal
    PX.ramp(48, 60, 62),    // mustard
    PX.ramp(0, 50, 46),     // brick red
  ],

  // Where the hand is in each arm frame, as [column offset, row offset]
  // from the person's x and the top of their shoulders (facing right).
  HANDS: {
    adultArm: { down: [-3, 9], fwd: [0, 8], back: [-6, 8], hold: [4, 4], wave1: [-6, -5], wave2: [-4, -6] },
    kidArm: { down: [-3, 6], fwd: [-1, 5], back: [-5, 5], hold: [4, 3], carry: [4, 6], reach: [4, 1], pick: [1, 6], wave1: [-6, -5], wave2: [-4, -5] },
  },

  _o: { frame: 0, flip: false, pal: null },   // reused options object for PX.spr

  // Describes one person. Every field is optional:
  //   kind     'adult' (shirt and trousers) | 'skirt' | 'kid' | 'gardener'
  //   skin     0..5 index into SKIN         hair     hairstyle frame name, or null for bald
  //   hairCol  index into HAIR              top      cloth for the shirt or jacket
  //   bottom   cloth for trousers or skirt  legs     cloth for the lower leg, or 'skin'
  //   sleeves  'long' | 'short'             collar, tie, belt, stripe, shoes: colours
  //   beard    index into HAIR              cap      cloth for a baseball cap
  //   pack     cloth for a backpack         sunHat   true for the straw hat
  // The result holds ready-made palettes, so nothing is allocated per frame.
  look(spec) {
    const kind = spec.kind || 'adult';
    const skin = this.SKIN[spec.skin === undefined ? 1 : spec.skin];
    const top = spec.top || this.WHITE;
    const bottom = spec.bottom || this.JEANS;
    const legs = spec.legs === 'skin' ? { m: skin.k, d: skin.K } : (spec.legs || bottom);
    const L = {
      kind,
      body: { adult: 'adultBody', skirt: 'adultSkirtBody', kid: 'kidBody', gardener: 'gardenerBody' }[kind],
      arm: kind === 'kid' ? 'kidArm' : 'adultArm',
      h: kind === 'kid' ? 14 : 21,          // rows from the shoulders to the ground
      farDx: kind === 'adult' ? 5 : 4,      // how far along the far arm's shoulder is
      skinPal: skin,
      hair: spec.hair || null,
      hairPal: this.HAIR[spec.hairCol === undefined ? this.BROWN : spec.hairCol],
      bald: !spec.hair || spec.hair === 'fringe',
      beardPal: spec.beard === undefined ? null : { b: this.HAIR[spec.beard].h, m: PAL.white },
      shinePal: { i: PX.mix(skin.k, PAL.white, 0.45) },
      capPal: spec.cap ? { a: spec.cap.m, A: spec.cap.d } : null,
      packPal: spec.pack ? { a: spec.pack.m, A: spec.pack.d, z: spec.pack.l } : null,
      sunHat: !!spec.sunHat,
      bodyPal: null,
      armPal: null,
    };
    if (kind === 'gardener') {
      L.bodyPal = { k: skin.k, K: skin.K };
      L.armPal = { s: PAL.pi2, S: PAL.pi3, l: PAL.pi1, f: skin.k, k: skin.k };
    } else {
      L.bodyPal = {
        s: top.m, S: top.d, l: top.l,
        c: spec.collar || top.l, t: spec.tie || top.m, d: spec.stripe || top.m,
        b: spec.belt || bottom.d, p: bottom.m, P: bottom.d, g: legs.m, G: legs.d,
        x: spec.shoes || PAL.wo3,
      };
      L.armPal = { s: top.m, S: top.d, l: top.l, f: spec.sleeves === 'short' ? skin.k : top.m, k: skin.k };
    }
    return L;
  },

  // Art y of the top of the shoulders for a body frame (it dips on the
  // contact frames of the walk and drops for a crouch).
  top(y, L, leg) {
    return y - L.h + (leg === 'w0' || leg === 'w2' ? 1 : 0) + (leg === 'crouch' ? 4 : 0);
  },

  // Walk frame name from a walk phase in radians (one cycle = two steps).
  walkFrame(phase) {
    const TWO_PI = Math.PI * 2;
    const p = ((phase % TWO_PI) + TWO_PI) % TWO_PI;
    return 'w' + (Math.floor(p / (Math.PI / 2)) % 4);
  },

  // Art pixel of the hand for an arm frame; props are drawn from here.
  // Returns the pixel column (already mirrored when facing left).
  handX(x, dir, L, arm) {
    const h = this.HANDS[L.arm][arm] || this.HANDS[L.arm].down;
    return dir < 0 ? x - 1 - h[0] : x + h[0];
  },
  handY(top, L, arm) {
    const h = this.HANDS[L.arm][arm] || this.HANDS[L.arm].down;
    return top + h[1];
  },

  _spr(name, x, y, frame, flip, pal) {
    const o = this._o;
    o.frame = frame; o.flip = flip; o.pal = pal;
    PX.spr(name, x, y, o);
  },

  // Draws a person standing on art pixel (x, y).
  //   dir   1 facing right, -1 facing left
  //   leg   body frame: 'stand', 'w0'..'w3', or 'crouch' (students only)
  //   arm   'walk' to swing with the legs, or an arm frame name
  //   face  'smile' | 'blink' | 'open' | 'flat'
  //   alpha 0..1 for fading in and out at the school door
  draw(x, y, L, dir, leg, arm, face, alpha) {
    const c = PX.c, prevAlpha = c.globalAlpha;
    if (alpha !== undefined && alpha < 1) {
      if (alpha <= 0.02) return;
      c.globalAlpha = prevAlpha * alpha;
    }
    x = Math.round(x); y = Math.round(y);
    const flip = dir < 0;
    const top = this.top(y, L, leg);

    // Arms swing opposite to the legs. The far arm is drawn first so it
    // only shows where it swings out past the body.
    let near = arm, far = null;
    if (arm === 'walk') {
      near = leg === 'w0' ? 'back' : leg === 'w2' ? 'fwd' : 'down';
      far = leg === 'w0' ? 'fwd' : leg === 'w2' ? 'back' : null;
    }
    if (far) this._spr(L.arm, x + dir * L.farDx, top, far, flip, L.armPal);
    if (L.packPal) this._spr('kidBackpack', x, top, 'pack', flip, L.packPal);

    this._spr(L.body, x, y, leg, flip, L.bodyPal);
    if (L.packPal) this._spr('kidBackpack', x, top, 'strap', flip, L.packPal);

    // The head overlaps the shoulder line by one row; it leans forward in a crouch
    const hx = x + (leg === 'crouch' ? dir : 0), hy = top + 1;
    this._spr('peopleHead', hx, hy, face || 'smile', flip, L.skinPal);
    if (L.bald) this._spr('peopleHeadwear', hx, hy, 'shine', flip, L.shinePal);
    if (L.hair) this._spr('peopleHair', hx, hy, L.hair, flip, L.hairPal);
    if (L.beardPal) this._spr('peopleHeadwear', hx, hy, 'beard', flip, L.beardPal);
    if (L.capPal) this._spr('peopleHeadwear', hx, hy, 'cap', flip, L.capPal);
    if (L.sunHat) this._spr('gardenerHat', hx, hy, 0, flip, null);

    this._spr(L.arm, x, top, near, flip, L.armPal);
    c.globalAlpha = prevAlpha;
  },

  // Everyone blinks now and then. Returns 'blink' for a few frames out of
  // every few seconds (seed staggers people), otherwise the face given.
  face(tick, seed, base) {
    return (tick + seed * 37) % 190 < 6 ? 'blink' : (base || 'smile');
  },

  // Opacity for someone walking through the school doors: solid until
  // they are close to the door, gone as they reach it.
  doorFade(dist) {
    return Math.max(0, Math.min(1, (dist - 0.02) / 0.05));
  },

  // A stand-in hand-held flower, used until flowers.js provides
  // drawTinyFlower(). (x, y) is the bottom of the stem.
  tinyFlower(x, y, hsl) {
    if (typeof drawTinyFlower === 'function') { drawTinyFlower(x, y, hsl); return; }
    const col = hsl ? PX.hsl(hsl[0], hsl[1], hsl[2]) : PAL.pi2;
    PX.rect(x, y - 3, 1, 3, PAL.gr4);
    PX.rect(x - 2, y - 7, 5, 5, PAL.ink);
    PX.rect(x - 1, y - 7, 3, 5, col);
    PX.rect(x - 2, y - 6, 5, 3, col);
    PX.px(x, y - 5, PAL.ye2);
  },
};
