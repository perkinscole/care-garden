// ================================================================
// File: flowers_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 23, 2026
// Description: Block art for the flowers of the 3D garden. Everything
//   here is a list of little coloured boxes ({ x, y, z, w, h, d, c },
//   centre and size) that js/flowers.js bakes into one mesh per flower
//   with G3.merged: the eight kinds of bloom, stems and leaves, the
//   branches of a group plant, the dirt mound, the sprout, the sparkles
//   and the tiny hand-held flower. The small 2D hand-held flower for the
//   dashboard is painted here too. No p5.js or three.js functions are
//   used at load time, so tools/sprites.html can load this file alone.
// ================================================================

// ── Block flowers ─────────────────────────────────────
// A BLOOM is designed in its own units: the photo is the square from -1
// to 1 in x and y, facing +z, with its face at z = 0. Round it go a thin
// dark frame (to FRAME), a backing slab (to BACK) and then the petals,
// which start at the edge of the backing. Nothing but the photo itself
// is ever in front of z = 0.06, and nothing reaches inside the frame, so
// no block can cover a face. js/flowers.js scales the design to blocks
// (one unit = half the width of the photo) and tips it back a little.
const FLOWER3 = (() => {
  const FRAME = 1.09, BACK = 1.22;

  // A box from its corners.
  function box(L, x0, x1, y0, y1, z0, z1, c) {
    L.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2,
      w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), d: Math.abs(z1 - z0), c });
  }
  // The same petal on all four sides of the bloom. `a` runs along the
  // side, `r` is the distance out from the middle. c is one colour or
  // four: [top, right, bottom, left].
  function sides(L, a0, a1, r0, r1, z0, z1, c) {
    const col = i => (Array.isArray(c) ? c[i] : c);
    box(L, a0, a1, r0, r1, z0, z1, col(0));
    box(L, r0, r1, -a1, -a0, z0, z1, col(1));
    box(L, -a1, -a0, -r1, -r0, z0, z1, col(2));
    box(L, -r1, -r0, a0, a1, z0, z1, col(3));
  }
  // The same block at all four corners. c is one colour or four:
  // [top right, bottom right, bottom left, top left].
  function corners(L, x0, x1, y0, y1, z0, z1, c) {
    const col = i => (Array.isArray(c) ? c[i] : c);
    box(L, x0, x1, y0, y1, z0, z1, col(0));
    box(L, x0, x1, -y1, -y0, z0, z1, col(1));
    box(L, -x1, -x0, -y1, -y0, z0, z1, col(2));
    box(L, -x1, -x0, y0, y1, z0, z1, col(3));
  }

  // ── The eight blooms ────────────────────────────────
  // Each painter adds its petals to L. R = PX.ramp colours (d shadow,
  // m base, l light, h highlight, o darkest). o(v) is a distance v
  // beyond the edge of the backing, shortened on group plants.
  // Returns the colour of the backing slab.
  const BLOOMS = {
    // Daisy: a ring of small pale cubes with gaps between them, round a
    // yellow middle.
    daisy(L, R, o) {
      for (const [a, col, z] of [[-0.9, R.l, -0.08], [-0.3, R.h, 0], [0.3, R.h, 0], [0.9, R.l, -0.08]]) {
        sides(L, a - 0.23, a + 0.23, BACK, o(0.5), z - 0.3, z + 0.02, col);
      }
      corners(L, BACK - 0.04, o(0.4), BACK - 0.04, o(0.4), -0.42, -0.1, R.m);
      return PAL.ye2;
    },

    // Tulip: a cup of tall slabs round the lower half of the face, the
    // sides rising to stepped points, the back petal showing over the top.
    tulip(L, R, o) {
      box(L, -o(0.38), o(0.38), -o(0.42), -BACK, -0.32, 0.04, R.m);        // bottom of the cup
      box(L, -0.85, 0.85, -o(0.72), -o(0.42), -0.32, 0, R.d);              // its rounded base
      for (const [s, col] of [[-1, R.l], [1, R.m]]) {                      // the two side petals
        box(L, s * BACK, s * o(0.38), -o(0.42), 0.55, -0.3, 0.04, col);
        box(L, s * (BACK - 0.1), s * o(0.3), 0.55, 1.1, -0.3, 0, col);
        box(L, s * (BACK - 0.3), s * o(0.16), 1.1, o(0.3), -0.3, -0.03, col);
        box(L, s * (BACK - 0.42), s * o(0.0), o(0.3), o(0.55), -0.3, -0.03, col);
      }
      box(L, -0.6, 0.6, BACK - 0.1, o(0.34), -0.46, -0.16, R.d);           // the petal behind
      box(L, -0.36, 0.36, o(0.34), o(0.62), -0.46, -0.16, R.d);
      box(L, -0.14, 0.14, o(0.62), o(0.84), -0.46, -0.16, R.d);
      return R.m;
    },

    // Poppy: four big floppy slabs, top and bottom behind, left and right
    // in front, each with a dark blotch at its base.
    poppy(L, R, o) {
      const cz = [[-0.46, -0.16], [-0.3, 0.02]];
      for (let i = 0; i < 4; i++) {
        const [z0, z1] = cz[i % 2], col = i % 2 ? R.m : R.l;
        const one = (a0, a1, r0, r1, c, za, zb) => {
          if (i === 0) box(L, a0, a1, r0, r1, za, zb, c);
          if (i === 1) box(L, r0, r1, -a1, -a0, za, zb, c);
          if (i === 2) box(L, -a1, -a0, -r1, -r0, za, zb, c);
          if (i === 3) box(L, -r1, -r0, a0, a1, za, zb, c);
        };
        one(-1.18, 1.18, BACK - 0.02, o(0.62), col, z0, z1);
        one(-0.72, 0.72, o(0.62), o(0.9), col, z0, z1);
        one(-0.3, 0.3, BACK, BACK + 0.2, R.o, z1, z1 + 0.04);
      }
      return R.d;
    },

    // Sunflower: a close ring of blocks, long and short by turns, round a
    // wide brown frame studded with seeds.
    sunflower(L, R, o) {
      const B2 = BACK + 0.1;
      for (let k = -2; k <= 2; k++) {
        const a = k * 0.52, long = k % 2 === 0;
        sides(L, a - 0.25, a + 0.25, B2, o(long ? 0.72 : 0.5), long ? -0.3 : -0.4, long ? 0.02 : -0.1, long ? R.l : R.m);
        if (long) sides(L, a - 0.12, a + 0.12, o(0.72), o(0.92), -0.3, -0.04, R.l);
      }
      corners(L, B2 - 0.02, o(0.52), B2 - 0.02, o(0.52), -0.4, -0.1, R.d);
      // the brown frame and its seeds
      box(L, -B2, B2, -B2, B2, -0.36, -0.04, PAL.wo3);
      for (let k = -3; k <= 3; k++) {
        sides(L, k * 0.36 - 0.08, k * 0.36 + 0.08, FRAME + 0.03, B2 - 0.04, -0.06, -0.01, k % 2 ? PAL.wo4 : PAL.wo1);
      }
      return null;
    },

    // Cosmos: eight broad petals that widen outward and end in teeth.
    cosmos(L, R, o) {
      sides(L, -0.5, 0.5, BACK, o(0.3), -0.32, -0.02, R.l);
      sides(L, -0.78, 0.78, o(0.3), o(0.62), -0.32, -0.02, R.l);
      for (const a of [-0.6, 0, 0.6]) sides(L, a - 0.16, a + 0.16, o(0.62), o(0.84), -0.32, -0.02, R.h);
      corners(L, 1.0, o(0.42), 1.0, o(0.42), -0.44, -0.14, R.m);
      corners(L, o(0.42), o(0.62), o(0.2), o(0.42), -0.44, -0.14, R.m);
      corners(L, o(0.2), o(0.42), o(0.42), o(0.62), -0.44, -0.14, R.m);
      return R.d;
    },

    // Rose: tiers of petals stepping forward toward the face, with a curl
    // of lighter petal at two corners and green sepals underneath.
    rose(L, R, o) {
      sides(L, -1.1, 1.1, 1.0, o(0.72), -0.52, -0.24, [R.d, R.m, R.d, R.m]);   // outer tier
      box(L, -o(0.44), o(0.44), -o(0.44), o(0.44), -0.4, -0.12, R.m);           // middle tier
      box(L, o(0.1), o(0.5), o(0.1), o(0.5), -0.3, 0, R.l);                     // curls
      box(L, -o(0.5), -o(0.1), -o(0.5), -o(0.1), -0.3, 0, R.l);
      box(L, -0.22, 0.22, -o(1.08), -o(0.7), -0.5, -0.3, PAL.gr3);              // sepals
      box(L, -0.95, -0.55, -o(0.92), -o(0.7), -0.5, -0.3, PAL.gr2);
      box(L, 0.55, 0.95, -o(0.92), -o(0.7), -0.5, -0.3, PAL.gr2);
      return R.l;
    },

    // Lily: a star of long stepped points with a pale rib down each, and
    // short points between them.
    lily(L, R, o) {
      sides(L, -0.6, 0.6, BACK, o(0.36), -0.32, -0.02, R.l);
      sides(L, -0.38, 0.38, o(0.36), o(0.7), -0.32, -0.02, R.l);
      sides(L, -0.17, 0.17, o(0.7), o(0.98), -0.32, -0.02, R.l);
      sides(L, -0.08, 0.08, BACK, o(0.74), -0.04, 0.03, R.h);
      corners(L, 0.95, o(0.26), 0.95, o(0.26), -0.44, -0.14, R.m);
      corners(L, o(0.26), o(0.5), o(0.26), o(0.5), -0.44, -0.14, R.d);
      return R.m;
    },

    // Anemone: four big cubes at the corners and a plump block on each
    // side, round a pale halo.
    anemone(L, R, o) {
      sides(L, -0.82, 0.82, BACK, o(0.42), -0.46, -0.12, R.m);
      corners(L, 0.9, o(0.6), 0.9, o(0.6), -0.42, -0.02, [R.l, R.m, R.l, R.m]);
      return R.h;
    },
  };

  // What stands where the photo would be on a flower with no face:
  // [block colour, raised middle colour, dot colour or null].
  const CENTRES = {
    daisy: R => [PAL.ye3, PAL.ye1, null],
    tulip: R => [R.m, R.l, null],
    poppy: R => [PAL.black, PAL.ink, PAL.ye2],
    sunflower: R => [PAL.wo3, PAL.wo4, PAL.wo1],
    cosmos: R => [PAL.ye3, PAL.ye2, null],
    rose: R => [R.m, R.h, R.d],
    lily: R => [PAL.gr3, PAL.gr1, PAL.ye3],
    anemone: R => [R.o, R.d, PAL.ye2],
  };

  // Stems are darker than the lawn so they show against it.
  const GREEN = [PAL.gr4, '#35704a'];

  // A post of green boxes from y0 up to y1.
  function post(L, x, z, y0, y1, th, cols) {
    let i = Math.round(y0 * 2);
    for (let y = y0; y < y1 - 0.001; i++) {
      const top = Math.min(y1, Math.floor(y * 2 + 1.001) / 2);
      box(L, x - th / 2, x + th / 2, y, top, z - th / 2, z + th / 2, cols[((i % 2) + 2) % 2]);
      y = top;
    }
  }
  // A leaf sticking out to one side: a short stalk, a square slab and a
  // smaller lighter slab stepping out to its tip.
  function leaf(L, x, y, dir, w, h) {
    box(L, x, x + dir * 0.14, y + 0.04, y + 0.13, -0.03, 0.03, GREEN[0]);
    box(L, x + dir * 0.12, x + dir * (0.12 + w * 0.7), y, y + h, -0.06, 0.06, PAL.gr2);
    box(L, x + dir * (0.12 + w * 0.7), x + dir * (0.12 + w), y + h * 0.3, y + h * 0.85, -0.06, 0.06, PAL.gr1);
  }

  return {
    FRAME, BACK, box,

    // The blocks of one bloom, in bloom units. ramp = PX.ramp colours,
    // face = true for a bloom that will carry a photo, trim = 0..1 how
    // much shorter the petals are (group plants). Returns { boxes, reach }:
    // reach is how far the petals go from the middle.
    bloom(typeName, ramp, face, trim) {
      const L = [], k = 0.9 - 0.2 * (trim || 0);
      const o = v => BACK + v * k;
      const paint = BLOOMS[typeName] || BLOOMS.daisy;
      const backing = paint(L, ramp, o);
      if (backing) box(L, -BACK, BACK, -BACK, BACK, -0.34, -0.05, backing);
      if (face) {
        box(L, -FRAME, FRAME, -FRAME, FRAME, -0.12, 0, ramp.o);            // the dark frame
      } else {
        const [c1, c2, c3] = (CENTRES[typeName] || CENTRES.daisy)(ramp);
        box(L, -FRAME, FRAME, -FRAME, FRAME, -0.12, 0.3, c1);
        box(L, -0.62, 0.62, -0.62, 0.62, 0.3, 0.46, c2);
        if (c3) corners(L, 0.62, 0.9, 0.62, 0.9, 0.3, 0.42, c3);
      }
      let reach = 0;
      for (const b of L) reach = Math.max(reach, Math.abs(b.x) + b.w / 2, Math.abs(b.y) + b.h / 2);
      return { boxes: L, reach };
    },

    // The stem of a single flower, H blocks tall, with its leaves below
    // `leafTop`. style = the type's stemStyle; jog = how far the top of a
    // nodding stem steps sideways.
    stem(L, typeName, style, H, leafTop, jog) {
      const th = style === 'thick' ? 0.1875 : 0.125;
      const cols = GREEN;
      if (jog) {
        const turn = Math.max(0.6, leafTop - 0.1);
        post(L, 0, 0, 0, turn, th, cols);
        box(L, -th / 2, jog + th / 2, turn - th, turn, -th / 2, th / 2, PAL.gr3);
        post(L, jog, 0, turn, H, th, cols);
      } else post(L, 0, 0, 0, H, th, cols);
      const top = Math.max(0.5, leafTop - 0.35);
      if (typeName === 'tulip' || typeName === 'lily') {
        // long blade leaves rising from the foot
        const h = Math.min(1.7, top + 0.2);
        box(L, 0.06, 0.26, 0, h * 0.7, -0.05, 0.05, PAL.gr2);
        box(L, 0.26, 0.46, h * 0.3, h, -0.05, 0.05, PAL.gr2);
        box(L, 0.3, 0.42, h * 0.8, h + 0.12, -0.05, 0.05, PAL.gr1);
        box(L, -0.26, -0.06, 0, h * 0.5, -0.05, 0.05, PAL.gr3);
        box(L, -0.44, -0.26, h * 0.2, h * 0.72, -0.05, 0.05, PAL.gr2);
      } else if (typeName === 'sunflower') {
        leaf(L, 0.08, top * 0.45, 1, 0.7, 0.5);
        leaf(L, -0.08, top * 0.75, -1, 0.6, 0.45);
        leaf(L, -0.08, top * 0.15, -1, 0.5, 0.36);
      } else if (style === 'wispy') {
        // feathery: little cubes on thin stalks, alternating
        for (let i = 0; i < 4; i++) {
          const y = top * (0.2 + i * 0.25), dir = i % 2 ? -1 : 1;
          box(L, dir * 0.05, dir * 0.34, y, y + 0.07, -0.03, 0.03, PAL.gr3);
          box(L, dir * 0.3, dir * 0.52, y, y + 0.22, -0.06, 0.06, i % 2 ? PAL.gr2 : PAL.gr1);
        }
      } else {
        leaf(L, 0.05, top * 0.4, 1, 0.5, 0.36);
        leaf(L, -0.05, top * 0.8, -1, 0.42, 0.3);
        if (style === 'thorny') {
          for (let y = 0.35, i = 0; y < leafTop; y += 0.45, i++) {
            const dir = i % 2 ? -1 : 1;
            box(L, dir * 0.06, dir * 0.17, y, y + 0.09, -0.04, 0.04, PAL.br3);
          }
        }
      }
    },

    // The stem and branches of a group plant. pts = the bloom centres
    // [{ x, y }] in blocks from the foot; drop = how far below its bloom
    // each branch runs. The main stem climbs to the highest fork; every
    // bloom off to one side gets a branch that leaves the stem level,
    // then turns straight up into the bloom (right angles only).
    branches(L, typeName, pts, drop) {
      const th = 0.125;
      let stemTop = 0.5;
      for (const p of pts) {
        if (Math.abs(p.x) < 0.2) { stemTop = Math.max(stemTop, p.y); continue; }
        const fork = Math.max(0.4, p.y - drop);
        stemTop = Math.max(stemTop, fork);
        const s = p.x < 0 ? -1 : 1;
        box(L, 0, p.x + s * th / 2, fork - th, fork, -th / 2, th / 2, PAL.gr3);
        post(L, p.x, 0, fork, p.y, th, GREEN);
        // a leaf under the longer arms
        if (Math.abs(p.x) > 1.3) box(L, p.x * 0.55 - 0.18, p.x * 0.55 + 0.18, fork - th - 0.26, fork - th, -0.05, 0.05, PAL.gr2);
      }
      post(L, 0, 0, 0, stemTop, th, GREEN);
      if (typeName === 'tulip' || typeName === 'lily') {
        box(L, 0.06, 0.26, 0, 0.8, -0.05, 0.05, PAL.gr2);
        box(L, 0.26, 0.46, 0.35, 1.15, -0.05, 0.05, PAL.gr2);
        box(L, -0.26, -0.06, 0, 0.6, -0.05, 0.05, PAL.gr3);
      } else {
        leaf(L, 0.05, 0.25, 1, 0.5, 0.36);
        leaf(L, -0.05, 0.55, -1, 0.42, 0.3);
      }
    },

    // Fresh dirt where a flower was just planted.
    mound() {
      const L = [];
      box(L, -0.5, 0.5, 0, 0.13, -0.38, 0.38, PAL.wo2);
      box(L, -0.3, 0.3, 0.13, 0.25, -0.24, 0.24, PAL.wo3);
      box(L, -0.42, -0.26, 0.13, 0.2, 0.1, 0.26, PAL.wo1);
      box(L, 0.22, 0.4, 0.13, 0.21, -0.2, -0.04, PAL.wo4);
      box(L, 0.52, 0.66, 0, 0.1, 0.2, 0.34, PAL.wo3);
      return L;
    },

    // The seedling: a shoot with two seed leaves, about half a block tall.
    sprout() {
      const L = [];
      box(L, -0.04, 0.04, 0, 0.42, -0.04, 0.04, PAL.gr2);
      box(L, 0.04, 0.26, 0.3, 0.44, -0.05, 0.05, PAL.gr1);
      box(L, -0.26, -0.04, 0.36, 0.5, -0.05, 0.05, PAL.gr2);
      box(L, -0.04, 0.04, 0.42, 0.52, -0.04, 0.04, PAL.gr1);
      return L;
    },

    // Twinkles: small bright cubes scattered round a bloom of reach 1.
    sparkles() {
      const L = [];
      const at = [[-1.0, 0.75, 0.2], [1.05, 0.3, 0.16], [0.25, 1.15, 0.18], [-0.75, -0.6, 0.12], [0.8, -0.85, 0.14], [-0.35, -1.1, 0.1]];
      at.forEach(([x, y, s], i) => box(L, x - s / 2, x + s / 2, y - s / 2, y + s / 2, 0.3 - s / 2, 0.3 + s / 2, i % 2 ? PAL.ye1 : PAL.white));
      return L;
    },

    // The little flower a student carries: a stem post, two leaves, four
    // petal cubes round a yellow middle. About 0.6 blocks tall, origin at
    // the bottom of the stem, facing +z.
    tiny(ramp) {
      const L = [], T = 1 / 16;
      box(L, -T / 2, T / 2, 0, 0.36, -T / 2, T / 2, PAL.gr2);
      box(L, T / 2, T * 2.5, 0.1, 0.2, -T / 2, T / 2, PAL.gr1);
      box(L, -T * 2.5, -T / 2, 0.18, 0.28, -T / 2, T / 2, PAL.gr3);
      const cy = 0.44, p = 0.11;
      box(L, -p / 2, p / 2, cy + p / 2, cy + p * 1.5, -0.05, 0.05, ramp.l);
      box(L, -p / 2, p / 2, cy - p * 1.5, cy - p / 2, -0.05, 0.05, ramp.m);
      box(L, -p * 1.5, -p / 2, cy - p / 2, cy + p / 2, -0.05, 0.05, ramp.l);
      box(L, p / 2, p * 1.5, cy - p / 2, cy + p / 2, -0.05, 0.05, ramp.m);
      box(L, -p / 2, p / 2, cy - p / 2, cy + p / 2, -0.04, 0.08, PAL.ye2);
      return L;
    },
  };
})();

// ── The 2D hand-held flower ───────────────────────────
// Still drawn on the dashboard and the cards: four round petals (sunlit
// at the top left, shaded at the bottom right) round a yellow middle, on
// a stem with one leaf. Returns { cv, ax, ay }: (ax, ay) is the point
// just under the bottom of its stem.
const FLOWER_ART = {
  tiny(ramp) {
    const rows = [
      '.oo.oo.',
      'ohlolmo',
      'ollymmo',
      '.oywYo.',
      'olmYmdo',
      'ommoddo',
      '.ooeoo.',
      '...eG..',
    ];
    const pal = { o: PAL.ink, d: ramp.d, m: ramp.m, l: ramp.l, h: ramp.h,
      e: PAL.gr2, G: PAL.gr5, y: PAL.ye2, w: PAL.ye1, Y: PAL.ye3 };
    const cv = document.createElement('canvas');
    cv.width = 7; cv.height = rows.length;
    const g = cv.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (!pal[row[x]]) continue;
        g.fillStyle = pal[row[x]];
        g.fillRect(x, y, 1, 1);
      }
    });
    return { cv, ax: 3, ay: rows.length };
  },
};
