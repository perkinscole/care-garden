// ================================================================
// File: flowers_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 22, 2026
// Description: Pixel art for the flowers. The small fixed pieces (leaves,
//   sprouts, the dirt mound, sparkles) are PX.define(...) sprites. The
//   flower heads come in eight types, any petal colour and several sizes,
//   so they are painted pixel by pixel by the FLOWER_ART painters below
//   and cached by js/flowers.js. No p5.js functions are used here, so
//   tools/sprites.html can still load this file on its own.
// ================================================================

// ── Small fixed sprites ───────────────────────────────
// Greens: l = sunlit, m = leaf green, e = dark edge.
const FLOWER_GREENS = { l: PAL.gr1, m: PAL.gr2, s: PAL.gr3, e: PAL.gr5 };

// Fresh dirt where a flower was just planted. The three frames crumble
// away as the mound settles (frame 0 = fresh).
PX.define('fl_mound', {
  pal: { b: PAL.wo2, h: PAL.wo1, n: PAL.wo4, d: PAL.wo3 },
  frames: [
    [
      '....bhbb.....',
      '..bhbbbbdb...',
      '.bbbbdbbbbhb.',
      'ndbbbbbbdbbdn',
      '.nnddnnnddnn.',
    ],
    [
      '.............',
      '....bhbb.....',
      '..bhbbdbbb...',
      '.ndbbbbbdbdn.',
      '..nnddnnnnn..',
    ],
    [
      '.............',
      '.............',
      '.....bb......',
      '...db.bbd.b..',
      '..n.dnn.nn...',
    ],
  ],
});

// The first days of a flower: a shoot, then two seed leaves, then a
// taller seedling. Feet (anchor) at the bottom centre.
PX.define('fl_sprout', {
  pal: FLOWER_GREENS,
  frames: [
    [
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '..l....',
      '..mle..',
      '...le..',
    ],
    [
      '.......',
      '.......',
      '.......',
      '.ll.ll.',
      'emlelme',
      '.eeleee',
      '...le..',
      '...le..',
    ],
    [
      '.ll.ll.',
      'lmlelme',
      'emmlmme',
      '.eeleee',
      '...le..',
      '.llle..',
      'emmle..',
      '.eele..',
    ],
  ],
});

// Ordinary leaf, growing up and to the right from the stem. Anchor is the
// bottom-left pixel, where it joins the stem. Frames: small, large.
PX.define('fl_leaf', {
  pal: FLOWER_GREENS,
  anchor: [0, 6],
  frames: [
    [
      '.........',
      '.........',
      '...ee....',
      '..elle...',
      '.elme....',
      'eme......',
    ],
    [
      '....eeee.',
      '..eelllle',
      '.ellmmmme',
      '.elmmmse.',
      'emmssee..',
      'eee......',
    ],
  ],
});

// Long blade leaf for tulips and lilies, rising from the base of the stem
// and leaning right. Frames: short, medium, tall.
PX.define('fl_blade', {
  pal: FLOWER_GREENS,
  anchor: [0, 14],
  frames: [
    [
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '.......',
      '...e...',
      '..ele..',
      '..lme..',
      '.lme...',
      '.lme...',
      'ee.....',
    ],
    [
      '.......',
      '.......',
      '.......',
      '.......',
      '....e..',
      '...ele.',
      '...lme.',
      '..lmse.',
      '..lme..',
      '.lmse..',
      '.lme...',
      '.lme...',
      'eme....',
      'ee.....',
    ],
    [
      '......e',
      '.....le',
      '....lme',
      '....lme',
      '...lmse',
      '...lme.',
      '..lmse.',
      '..lme..',
      '..lme..',
      '.lmse..',
      '.lme...',
      '.lme...',
      'eme....',
      'ee.....',
    ],
  ],
});

// Big heart-shaped sunflower leaf on a short stalk. Anchor at the stalk.
PX.define('fl_bigleaf', {
  pal: FLOWER_GREENS,
  anchor: [0, 6],
  frames: [
    [
      '..........',
      '..........',
      '...eee....',
      '..ellle...',
      '.elmmse...',
      'eemsee....',
      '..ee......',
    ],
    [
      '....eeee..',
      '..eellllee',
      '.ellmmmmse',
      '.elmlmmsse',
      'eemmmmsse.',
      '..emsssee.',
      '...eeee...',
    ],
  ],
});

// Feathery cosmos foliage: a few thin fronds. Anchor bottom-left.
PX.define('fl_frond', {
  pal: FLOWER_GREENS,
  anchor: [0, 6],
  frames: [
    [
      '.....l.',
      '..l.me.',
      '..me...',
      '.me.lll',
      '.mmme..',
      'ee.....',
    ],
  ],
});

// Twinkle shown for a moment when a flower first opens.
PX.define('fl_sparkle', {
  pal: { w: PAL.white, y: PAL.ye1 },
  anchor: [2, 3],
  frames: [
    [
      '.....',
      '.....',
      '..w..',
      '.....',
      '.....',
    ],
    [
      '.....',
      '..y..',
      '.ywy.',
      '..y..',
      '.....',
    ],
    [
      '..y..',
      '..w..',
      'ywwwy',
      '..w..',
      '..y..',
    ],
    [
      '..y..',
      '.....',
      'y...y',
      '.....',
      '..y..',
    ],
  ],
});

// ── Flower painters ───────────────────────────────────
// Heads are painted into a little grid of palette letters, which is then
// outlined and turned into a canvas:
//   o ink outline      k dark rim around the face (petal hue)
//   d m l h            petal ramp from PX.ramp: shadow, base, light, highlight
//   D M E              petal edges (see _resolveEdges)
//   g e G              greens      y w Y  yellows      b B n  browns
//   x                  near-black flower centres
const FLOWER_ART = (() => {
  const TAU = Math.PI * 2;

  // How much a petal pointing in direction `a` faces the sun (top-left).
  const lit = a => -(Math.cos(a) + Math.sin(a)) / Math.SQRT2;
  // The edge letter that goes with a petal body colour.
  const EDGE = { l: 'M', m: 'D', h: 'M', d: 'D' };

  class Grid {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill('.'); }
    get(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? '.' : this.d[y * this.w + x]; }
    set(x, y, ch) {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = ch;
    }
    // Filled circle with the same stair-stepping as PX.circle / PX.photo.
    // The centre may sit between pixels.
    disc(cx, cy, r, ch) {
      const rr = (r + 0.35) * (r + 0.35), R = Math.ceil(r) + 1;
      const x0 = Math.round(cx), y0 = Math.round(cy);
      for (let y = y0 - R; y <= y0 + R; y++) {
        for (let x = x0 - R; x <= x0 + R; x++) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= rr) this.set(x, y, ch);
        }
      }
    }
    // A round petal: body colour with an edge that _resolveEdges turns
    // into a dark seam wherever it lies over another petal.
    // With strong = true the seam is always the shadow colour.
    lobe(cx, cy, r, body, strong) {
      this.disc(cx, cy, r, strong && body === 'l' ? 'E' : EDGE[body]);
      this.disc(cx, cy, r - 1, body);
    }
    // The dark rim a photo of radius r sits inside: exactly the pixels
    // PX.photo will cover, plus the ring of pixels touching them.
    photoRim(cx, cy, r, ch) {
      const inside = (dx, dy) => Math.abs(dy) <= r &&
        Math.abs(dx) <= Math.round(Math.sqrt((r + 0.35) * (r + 0.35) - dy * dy));
      for (let dy = -r - 1; dy <= r + 1; dy++) {
        for (let dx = -r - 1; dx <= r + 1; dx++) {
          if (inside(dx, dy) || inside(dx - 1, dy) || inside(dx + 1, dy) ||
              inside(dx, dy - 1) || inside(dx, dy + 1)) this.set(cx + dx, cy + dy, ch);
        }
      }
    }
    // A petal growing from the centre (cx, cy) in direction `a`, from
    // radius r0 out to r1. half(s) is its half-width at s = 0 (base)..1
    // (tip); shade(s, u) picks the letter, u = -1..1 across the petal.
    petal(cx, cy, a, r0, r1, half, shade) {
      const ca = Math.cos(a), sa = Math.sin(a), len = r1 - r0;
      const R = Math.ceil(r1) + 2;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const al = dx * ca + dy * sa;
          if (al < r0 || al > r1) continue;
          const s = (al - r0) / len, hw = half(s);
          if (hw <= 0) continue;
          const ac = -dx * sa + dy * ca;
          if (Math.abs(ac) > hw) continue;
          const ch = shade(s, ac / hw);
          if (ch) this.set(cx + dx, cy + dy, ch);
        }
      }
    }
    // Petal edges touching the outside become the petal's own colour (the
    // ink outline is enough there); edges lying on another petal go dark.
    _resolveEdges() {
      const out = this.d.slice();
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          const ch = this.get(x, y);
          if (ch !== 'D' && ch !== 'M' && ch !== 'E') continue;
          let open = false;
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (this.get(x + i, y + j) === '.') open = true;
          out[y * this.w + x] = ch === 'D' ? (open ? 'm' : 'd') : ch === 'E' ? (open ? 'l' : 'd') : (open ? 'l' : 'm');
        }
      }
      this.d = out;
    }
    // One-pixel outline around everything painted so far.
    outline(ch) {
      const out = this.d.slice();
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (this.get(x, y) !== '.') continue;
          if (this.get(x - 1, y) !== '.' || this.get(x + 1, y) !== '.' ||
              this.get(x, y - 1) !== '.' || this.get(x, y + 1) !== '.') out[y * this.w + x] = ch;
        }
      }
      this.d = out;
    }
    // Copies rows of letters into the grid ('.' leaves what is there).
    stamp(rows, x, y) {
      for (let j = 0; j < rows.length; j++) {
        for (let i = 0; i < rows[j].length; i++) {
          if (rows[j][i] !== '.') this.set(x + i, y + j, rows[j][i]);
        }
      }
    }
    // Turns the grid into a canvas cropped to what was painted. (ax, ay)
    // is the grid pixel to remember as the anchor; returns { cv, ax, ay }
    // with the anchor moved into the cropped canvas.
    toArt(pal, ax, ay) {
      let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (this.d[y * this.w + x] === '.') continue;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; }
      const cv = document.createElement('canvas');
      cv.width = x1 - x0 + 1; cv.height = y1 - y0 + 1;
      const g = cv.getContext('2d');
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const col = pal[this.d[y * this.w + x]];
          if (!col) continue;
          g.fillStyle = col;
          g.fillRect(x - x0, y - y0, 1, 1);
        }
      }
      return { cv, ax: ax - x0, ay: ay - y0 };
    }
  }

  function palette(ramp) {
    return {
      o: PAL.ink, k: ramp.o, d: ramp.d, m: ramp.m, l: ramp.l, h: ramp.h,
      g: PAL.gr3, e: PAL.gr2, G: PAL.gr5,
      y: PAL.ye2, w: PAL.ye1, Y: PAL.ye3,
      b: PAL.wo2, B: PAL.wo3, n: PAL.wo4, x: PAL.black,
    };
  }

  // ── The eight heads ─────────────────────────────────
  // Each painter gets the grid, its centre c, the radius R of the middle
  // (the face with its rim, or the flower's own disc), the petal length L
  // and whether a face will be drawn on top.

  // Daisy: a full ring of slim, pale, round-tipped petals that touch at
  // the base and part at the tips, round a yellow button.
  function daisy(g, c, R, L, face) {
    const reach = R + L, n = 2 * Math.round(reach * 0.535);
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * TAU - Math.PI / 2;
      const body = lit(a) > -0.25 ? 'h' : 'l';
      g.petal(c, c, a, R - 1, reach, s => (s > 0.8 ? 1.1 : 1.9), (s, u) => {
        if (s < 0.2) return 'm';
        return Math.abs(u) > 0.55 && s <= 0.8 ? (body === 'h' ? 'M' : 'D') : body;
      });
    }
    if (!face) {
      g.disc(c, c, R, 'Y');
      g.disc(c - 0.5, c - 0.5, R - 1, 'y');
      g.set(c - 1, c - 1, 'w');
    }
  }

  // Sunflower: two rows of pointed petals round a wide seed disc.
  function sunflower(g, c, R, L, face) {
    const reach = R + L, n = 2 * Math.round(reach * 0.4);
    const half = s => 2.7 * (1 - s) + 0.45;
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * TAU - Math.PI / 2;
      g.petal(c, c, a, R - 1, reach - 0.8, half, () => 'd');
    }
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU - Math.PI / 2;
      const body = lit(a) > -0.2 ? 'l' : 'm';
      g.petal(c, c, a, R - 1, reach + 0.5, half, s => (s < 0.16 ? 'd' : body));
    }
    // Seeds: a brown disc with a checker of darker seeds
    g.disc(c, c, R, 'B');
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        if (g.get(c + dx, c + dy) !== 'B') continue;
        const d2 = dx * dx + dy * dy;
        if (d2 > (R - 0.8) * (R - 0.8)) g.set(c + dx, c + dy, 'n');
        else if (((dx + dy) & 1) === 0) g.set(c + dx, c + dy, d2 < R * R * 0.2 ? 'n' : 'b');
      }
    }
  }

  // Cosmos: eight broad wedge petals, each ending in a toothed tip.
  function cosmos(g, c, R, L, face) {
    const n = R >= 5 ? 8 : 6, reach = R + L, len = L + 1;
    const base = Math.max(1.2, R * 0.36), tip = Math.max(base + 1, reach * 0.3);
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * TAU - Math.PI / 2;
      const body = lit(a) > -0.2 ? 'l' : 'm';
      g.petal(c, c, a, R - 1, reach, s => base + (tip - base) * s, (s, u) => {
        const hw = base + (tip - base) * s, ac = Math.abs(u) * hw;
        const last = s > 1 - 1.3 / len;
        // Teeth: the corners and two notches are cut out of the last row
        if (last && (ac > hw - 0.9 || (ac >= 0.9 && ac < 1.9 && tip >= 3.4))) return null;
        if (ac > hw - 1) return body === 'l' ? 'E' : 'D';
        if (ac < 0.5 && s < 0.6 && tip >= 3.4) return body === 'l' ? 'm' : 'd';   // centre vein
        return body;
      });
    }
    if (!face) {
      g.disc(c, c, R, 'Y');
      g.disc(c - 0.5, c - 0.5, R - 1, 'y');
    }
  }

  // Anemone: a wheel of plump overlapping round petals with a pale halo
  // round a dark middle.
  function anemone(g, c, R, L, face) {
    const n = R >= 8 ? 7 : R >= 4 ? 6 : 5, reach = R + L;
    const rho = reach * 0.37, d = reach - rho;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU - Math.PI / 2;
      g.lobe(c + Math.cos(a) * d, c + Math.sin(a) * d, rho, lit(a) > -0.3 ? 'l' : 'm', true);
    }
    g._resolveEdges();
    // Pale ring just outside the middle
    const hi = (R + 1.6) * (R + 1.6);
    for (let dy = -R - 2; dy <= R + 2; dy++) {
      for (let dx = -R - 2; dx <= R + 2; dx++) {
        const ch = g.get(c + dx, c + dy);
        if (dx * dx + dy * dy <= hi && (ch === 'l' || ch === 'm' || ch === 'd')) g.set(c + dx, c + dy, 'h');
      }
    }
    if (!face) {
      g.disc(c, c, R, 'x');
      g.disc(c, c, R - 1, 'k');
      g.set(c - 1, c - 1, 'd');
    }
  }

  // Poppy: four big floppy petals, two behind and two in front, with dark
  // blotches at their bases.
  function poppy(g, c, R, L, face) {
    const reach = R + L, rho = reach * 0.5, d = reach - rho;
    // top and bottom sit behind; the sunny side is lighter
    const petals = [[-Math.PI / 2, 'l'], [Math.PI / 2, 'm'], [Math.PI, 'l'], [0, 'm']];
    for (const [a, body] of petals) {
      g.lobe(c + Math.cos(a) * d, c + Math.sin(a) * d, rho, body, true);
    }
    g._resolveEdges();
    for (const [a] of petals) {
      const br = Math.max(1.2, reach * 0.12);
      g.disc(c + Math.cos(a) * (R + 0.6), c + Math.sin(a) * (R + 0.6), br, 'k');
    }
    if (!face) {
      g.disc(c, c, R, 'x');
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        g.set(c + Math.cos(a) * (R - 0.5), c + Math.sin(a) * (R - 0.5), 'y');
      }
      g.set(c, c, 'e');
    }
  }

  // Rose: two tiers of overlapping petals with green sepals showing
  // underneath; without a face the middle is a tight swirl.
  function rose(g, c, R, L, face) {
    const reach = R + L;
    for (const off of [-0.75, 0, 0.75]) {       // sepals, behind the petals
      g.petal(c, c, Math.PI / 2 + off, R, reach + 2.2, s => 2.2 * (1 - s) + 0.4,
        (s, u) => (u > 0.2 ? 'G' : 'g'));
    }
    const rho = reach * 0.5, d = reach - rho;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU - Math.PI / 2;
      g.lobe(c + Math.cos(a) * d, c + Math.sin(a) * d, rho, 'm', true);
    }
    const reach2 = reach - Math.max(1.6, L * 0.42), rho2 = reach2 * 0.5, d2 = reach2 - rho2;
    for (let i = 0; i < 5; i++) {
      const a = (i + 0.5) / 5 * TAU - Math.PI / 2;
      g.lobe(c + Math.cos(a) * d2, c + Math.sin(a) * d2, rho2, 'l', true);
    }
    if (!face) {
      // The heart of the rose: tighter and tighter turns
      g.lobe(c + 0.5, c + 0.5, R + 0.5, 'm');
      g.lobe(c - 0.5, c - 0.5, R - 0.5, 'l');
      if (R >= 3) g.lobe(c + 0.5, c, R - 1.6, 'h');
      g.set(c, c, 'd'); g.set(c + 1, c, 'd'); g.set(c + 1, c - 1, 'd');
    }
  }

  // Lily: a six-pointed star of long petals, each with a pale midrib.
  function lily(g, c, R, L, face) {
    const reach = R + L, W = Math.max(1.6, reach * 0.175);
    const half = s => (s < 0.3 ? W * (0.6 + 0.4 * s / 0.3) : W * (1 - (s - 0.3) / 0.7) + 0.35);
    for (const start of [1, 0]) {               // three behind, then three in front
      for (let i = start; i < 6; i += 2) {
        const a = i / 6 * TAU - Math.PI / 2;
        const body = start === 1 ? 'm' : 'l';
        g.petal(c, c, a, R - 1, reach, half, (s, u) => {
          const au = Math.abs(u);
          if (au > 0.72 && s < 0.9) return EDGE[body];
          if (au < 0.2 && s > 0.12 && s < 0.82) return body === 'l' ? 'h' : 'l';
          return body;
        });
      }
    }
    if (!face) {
      g.disc(c, c, R, 'G');
      g.disc(c, c, R - 1, 'e');
      for (let i = 0; i < 6; i += 2) {          // anthers on the front petals
        const a = i / 6 * TAU - Math.PI / 2;
        g.set(c + Math.cos(a) * (R + 2), c + Math.sin(a) * (R + 2), 'n');
        g.set(c + Math.cos(a) * (R + 1), c + Math.sin(a) * (R + 1), 'Y');
      }
    }
  }

  // Tulip: not a ring at all but a cup, round underneath with three
  // pointed petal tips standing above the face.
  function tulip(g, c, R, L, face) {
    const hw = R + L - 1;            // half-width of the cup
    const tipY = -(R + L);           // top of the three points
    const crown = -R;                // where the points join the cup
    const bot = R + L;               // depth below the centre
    const tx = hw - 2;               // centre of the outer points
    const slope = (tx / 2 + 0.6) / (crown - tipY);
    for (let dy = tipY; dy <= bot; dy++) {
      for (let dx = -hw; dx <= hw; dx++) {
        let inside, tooth = 0;
        if (dy >= 0) inside = (dx * dx) / ((hw + 0.4) * (hw + 0.4)) + (dy * dy) / ((bot + 0.4) * (bot + 0.4)) <= 1;
        else if (dy >= crown) inside = true;
        else {
          const reachX = (dy - tipY) * slope + 0.5;
          inside = false;
          for (const k of [-1, 0, 1]) if (Math.abs(dx - k * tx) <= reachX) { inside = true; tooth = k; }
        }
        if (!inside) continue;
        // Left petal in the light, right petal in shade, back petal between
        let ch;
        if (dy < crown) ch = tooth < 0 ? 'l' : tooth > 0 ? 'm' : 'd';
        else if (dx < -tx / 2) ch = 'l';
        else if (dx > tx / 2) ch = 'm';
        else ch = dy < R * 0.4 ? 'd' : (dx <= 0 ? 'l' : 'm');
        if (ch === 'l' && dx === -hw + 2 && dy > crown && dy < R * 0.5) ch = 'h';
        if (ch === 'm' && (dx >= hw - 1 || dy >= bot - 1)) ch = 'd';
        g.set(c + dx, c + dy, ch);
      }
    }
    if (!face) {
      // Closed tulip: the two front petals meet along a seam
      for (let dy = Math.round(crown * 0.2); dy <= bot - 2; dy++) g.set(c + 1, c + dy, 'd');
    }
  }

  // name -> painter, petal length beside an 8-pixel face, and the disc
  // radius / petal length of the faceless flower.
  const HEADS = {
    daisy:     { paint: daisy,     L: 6, c: 3, Lf: 6 },
    tulip:     { paint: tulip,     L: 5, c: 3, Lf: 4 },
    poppy:     { paint: poppy,     L: 6, c: 2, Lf: 8 },
    sunflower: { paint: sunflower, L: 6, c: 6, Lf: 6, rim: 2 },
    cosmos:    { paint: cosmos,    L: 6, c: 2, Lf: 8 },
    rose:      { paint: rose,      L: 5, c: 3, Lf: 6 },
    lily:      { paint: lily,      L: 8, c: 2, Lf: 9 },
    anemone:   { paint: anemone,   L: 5, c: 3, Lf: 6 },
  };

  return {
    Grid, palette, HEADS,

    // A flower head for a face of radius r (art pixels) or, with
    // face = false, a faceless flower `r/8` times its normal size.
    // Returns { cv, ax, ay }: the canvas and the pixel at the middle of
    // the face.
    head(typeName, r, face, ramp) {
      const T = HEADS[typeName] || HEADS.daisy;
      const k = 0.5 + r / 16;
      const R = face ? r + (T.rim || 1) : Math.max(1, Math.round(T.c * r / 8));
      const L = Math.max(2, Math.round((face ? T.L : T.Lf) * (face ? k : r / 8)));
      const c = R + L + 4;
      const g = new Grid(c * 2 + 1, c * 2 + 1);
      T.paint(g, c, R, L, face);
      g._resolveEdges();
      // The dark rim the photo sits inside
      if (face) g.photoRim(c, c, r, 'k');
      g.outline('o');
      return g.toArt(palette(ramp), c, c);
    },

    // A closed bud for the top of a young stem: green sepals with the
    // petal colour just showing. big = the stage right before it opens.
    // Returns { cv, ax, ay }: (ax, ay) is the foot of the bud.
    bud(ramp, big) {
      const rows = big ? [
        '...o...',
        '..olo..',
        '.olmdo.',
        '.olmdo.',
        'oelmdGo',
        'oegmgGo',
        '.oggGo.',
        '..oGo..',
      ] : [
        '..o..',
        '.olo.',
        'olmdo',
        'oemGo',
        'oegGo',
        '.oGo.',
      ];
      const g = new Grid(rows[0].length, rows.length);
      g.stamp(rows, 0, 0);
      return g.toArt(palette(ramp), (rows[0].length - 1) / 2, rows.length - 1);
    },

    // The little flower a student carries: 7 pixels tall. (ax, ay) is the
    // point just under the bottom of its stem.
    tiny(ramp) {
      const rows = [
        '.ooo.',
        'olhlo',
        'ohymo',
        'olmdo',
        '.oeo.',
        '..eG.',
        '..e..',
      ];
      const g = new Grid(5, 7);
      g.stamp(rows, 0, 0);
      return g.toArt(palette(ramp), 2, 7);
    },
  };
})();
