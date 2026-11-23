// ================================================================
// File: flowers.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Flower class and pixel-art drawing for the CARE Garden.
//   A flower grows from a seed mound through sprout and bud to a bloom
//   with a student's photo in its centre; group photos grow one
//   branching plant with a bloom per face. Heads, stems and plants are
//   painted once into small cached canvases (see js/art/flowers_art.js)
//   so a garden of a thousand flowers stays fast.
// ================================================================

// ── Growth stages ─────────────────────────────────────
// `size` runs from 0.02 (just planted, or eaten by the ram) up past 1
// (boosted). These are the sizes at which a flower changes stage.
const FLOWER_SPROUT_AT = 0.05;   // below this: only a seed mound
const FLOWER_BUD_AT    = 0.11;   // sprout becomes a stem with a bud
const FLOWER_OPEN_AT   = 0.19;   // bud opens into a small bloom
const FLOWER_FULL_AT   = 0.30;   // full bloom: the face is at its proper size

// Stem height in whole art pixels. It climbs quickly at first and levels
// off, so boosted flowers get bigger heads rather than endless stalks.
function flowerStemHeight(size, type) {
  const k = type.stemStyle === 'thick' ? 1.12 : type.stemStyle === 'droop' ? 0.94 : 1;
  return Math.max(2, Math.round(46 * (1 - Math.exp(-1.5 * size)) * k));
}

// Radius of the photo in a single flower, in art pixels. Faceless flowers
// use the same number as their scale (8 = normal size).
function flowerFaceRadius(size) {
  if (size < FLOWER_FULL_AT) return 5;
  if (size < 0.95) return 8;
  if (size < 1.30) return 9;
  return 10;
}

// ── Colour ────────────────────────────────────────────
// Petal colours are snapped to 24 hues and two tones so that flowers
// share cached art. Returns { key, ramp } (ramp from PX.ramp).
function flowerColour(hsl) {
  const hq = (Math.round((((hsl[0] % 360) + 360) % 360) / 15) * 15) % 360;
  const light = hsl[2] >= 63;
  let s = light ? 72 : 80, l = light ? 66 : 57;
  // Greens are lifted toward mint and lime so they stand out from the lawn
  if (hq >= 90 && hq <= 150) { l += 9; s -= 6; }
  return { key: hq + (light ? 'L' : 'D'), ramp: PX.ramp(hq, s, l) };
}

// ── Art caches ────────────────────────────────────────
// Everything a flower draws is a small canvas built once and shared.
// Each cache is bounded: when full, the oldest entry is dropped (flowers
// still using it keep their own reference until they change stage).
const FlowerCache = {
  heads: new Map(), stems: new Map(), plants: new Map(), small: new Map(),
  get(map, key, cap, build) {
    let v = map.get(key);
    if (!v) {
      v = build();
      if (map.size >= cap) map.delete(map.keys().next().value);
      map.set(key, v);
    }
    return v;
  },
};

function flowerHeadArt(type, col, r, face) {
  const key = type.name + '|' + col.key + '|' + r + (face ? 'f' : 'n');
  return FlowerCache.get(FlowerCache.heads, key, 1600,
    () => FLOWER_ART.head(type.name, r, face, col.ramp));
}
function flowerBudArt(col, big) {
  return FlowerCache.get(FlowerCache.small, 'bud' + col.key + (big ? 'B' : 's'), 300,
    () => FLOWER_ART.bud(col.ramp, big));
}
function flowerStemArt(type, H) {
  return FlowerCache.get(FlowerCache.stems, type.name + '|' + H, 700,
    () => buildFlowerStem(type, H));
}
function flowerPlantArt(type, n, q) {
  const blade = type.name === 'lily' || type.name === 'tulip';
  return FlowerCache.get(FlowerCache.plants, n + (blade ? 'b' : 'r') + q, 240,
    () => buildFlowerPlant(n, blade, q));
}

// ── Stems ─────────────────────────────────────────────
// Paints a straight stem H pixels tall with its leaves into a canvas.
// The sway is added when it is drawn, by sliding rows sideways.
// Returns { cv, ax, headDx }: ax is the canvas column of the stem and
// headDx how far the top leans over (the poppy nods).
function buildFlowerStem(type, H) {
  const W = 33, ax = 16;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const style = type.stemStyle, name = type.name;
  const lit = PAL.gr1, mid = PAL.gr2, edge = PAL.gr5;
  let headDx = 0;
  PX.withTarget(cv.getContext('2d'), () => {
    // Leaves first, so the stem runs over where they join
    if (H >= 7) {
      if (name === 'lily' || name === 'tulip') {
        const f = H < 11 ? 0 : H < 17 ? 1 : 2;
        PX.spr('fl_blade', ax + 2, H, { frame: f });
        PX.spr('fl_blade', ax - 1, H, { frame: Math.max(0, f - 1), flip: true });
      } else if (name === 'sunflower') {
        const f = H < 14 ? 0 : 1;
        PX.spr('fl_bigleaf', ax + 3, H - 2, { frame: f });
        if (H >= 13) PX.spr('fl_bigleaf', ax - 2, H - 6, { frame: f, flip: true });
      } else if (style === 'wispy') {
        PX.spr('fl_frond', ax + 1, H - 1);
        if (H >= 12) PX.spr('fl_frond', ax - 1, H - 5, { flip: true });
      } else {
        const f = H < 13 ? 0 : 1;
        PX.spr('fl_leaf', ax + 2, H - 2, { frame: f });
        if (H >= 12) PX.spr('fl_leaf', ax - 1, H - 6, { frame: f, flip: true });
      }
    }
    const nod = [0, 1, 1, 2, 3];
    for (let yg = 0; yg < H; yg++) {          // yg = height above the ground
      const y = H - 1 - yg;
      let xo = 0;
      if (style === 'wispy') xo = Math.round(Math.sin(yg * 0.45) * 0.8);
      if (style === 'droop' && H >= 12) {
        const up = yg - (H - 6);
        if (up >= 0) xo = nod[Math.min(up, 4)];
        headDx = 3;
      }
      if (style === 'thick') {
        PX.rect(ax - 2, y, 5, 1, edge);
        PX.px(ax - 1, y, lit);
        PX.px(ax, y, mid);
        PX.px(ax + 1, y, PAL.gr3);
      } else {
        if (style === 'wispy') {
          PX.px(ax - 1 + xo, y, mid);
          PX.px(ax + xo, y, edge);
        } else {
          PX.px(ax - 1 + xo, y, lit);
          PX.px(ax + xo, y, style === 'thorny' ? PAL.gr3 : mid);
          PX.px(ax + 1 + xo, y, edge);
        }
        if (style === 'thorny') {
          // Thorns alternate up the stem
          if (yg % 8 === 3) { PX.px(ax + 2, y, PAL.br3); PX.px(ax + 3, y - 1, PAL.br4); }
          if (yg % 8 === 7) { PX.px(ax - 2, y, PAL.br3); PX.px(ax - 3, y - 1, PAL.br4); }
        }
      }
    }
  });
  return flowerTrimArt({ cv, ax, headDx });
}

// Crops the empty columns off the sides of a stem or plant canvas (they
// cost time to draw) and moves its anchor column to match.
function flowerTrimArt(art) {
  const src = art.cv, w = src.width, h = src.height;
  if (!w || !h) return art;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, x1 = -1;
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (d[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; x1 = x; break; }
    }
  }
  if (x1 < 0 || (x0 === 0 && x1 === w - 1)) return art;
  const cv = document.createElement('canvas');
  cv.width = x1 - x0 + 1; cv.height = h;
  cv.getContext('2d').drawImage(src, -x0, 0);
  art.cv = cv;
  art.ax -= x0;
  return art;
}

// Draws a stem (or a whole plant) canvas with its foot at (x, y), leaning
// `lean` pixels at the top. The lean is made by cutting the picture into
// horizontal bands and sliding each one a pixel further. `hidden` is how
// many rows at the top are covered by the flower's own head and need not
// be drawn at all.
function drawFlowerSwayed(art, x, y, lean, hidden) {
  const c = PX.c, cv = art.cv, h = cv.height, w = cv.width;
  const dx = x - art.ax, dy = y - h;
  const top = hidden > 0 ? Math.min(h - 1, hidden) : 0;   // first row worth drawing
  const vis = h - top;                                    // rows to draw, counted up from the ground
  if (lean === 0 || h < 4) { c.drawImage(cv, 0, top, w, vis, dx, dy + top, w, vis); return; }
  const n = Math.abs(lean), sg = lean < 0 ? -1 : 1;
  let g0 = 0;
  for (let k = 0; k <= n && g0 < vis; k++) {
    const g1 = Math.min(vis, k === n ? h : Math.round(h * Math.sqrt((k + 0.5) / n)));
    if (g1 > g0) c.drawImage(cv, 0, h - g1, w, g1 - g0, dx + sg * k, dy + h - g1, w, g1 - g0);
    g0 = g1;
  }
}
// How far drawFlowerSwayed slides the band `yg` pixels above the ground.
function flowerSwayAt(yg, h, lean) {
  if (lean === 0 || h < 4) return 0;
  const n = Math.abs(lean), f = Math.min(1, Math.max(0, yg / h));
  return (lean < 0 ? -1 : 1) * Math.min(n, Math.floor(n * f * f + 0.5));
}

// ── Group plants ──────────────────────────────────────
// Where the blooms sit on a plant of 2–6 faces, in art pixels from the
// foot of the stem ([x right, y up]), highest first. Neighbouring blooms
// are at least 23 pixels apart so no face ever covers another.
const FLOWER_GROUP_LAYOUTS = {
  2: [[-11, 37], [11, 26]],
  3: [[1, 49], [-13, 30], [13, 25]],
  4: [[-12, 51], [12, 46], [-14, 27], [13, 21]],
  5: [[2, 59], [-22, 53], [25, 51], [-10, 32], [14, 29]],
  6: [[0, 67], [-24, 61], [24, 59], [-12, 41], [13, 38], [3, 17]],
};

// How big a group plant is drawn, in sixteenths of its full layout.
function flowerPlantScale(size) {
  let s = 0.6 + 0.4 * Math.min(1, Math.max(0, (size - FLOWER_OPEN_AT) / 0.13));
  s *= 1 + 0.14 * Math.min(1, Math.max(0, (size - 0.8) / 0.6));
  return Math.round(s * 16);
}

// Paints the stem and branches of a group plant.
// Returns { cv, ax, pts }: pts are the bloom centres { x, y } relative to
// the foot of the stem (y up).
function buildFlowerPlant(n, blade, q) {
  const layout = FLOWER_GROUP_LAYOUTS[Math.min(6, Math.max(2, n))];
  const pts = layout.map(p => ({ x: Math.round(p[0] * q / 16), y: Math.round(p[1] * q / 16) }));
  let top = 0, halfW = 0;
  for (const p of pts) { top = Math.max(top, p.y); halfW = Math.max(halfW, Math.abs(p.x)); }
  halfW += 10;
  const H = top + 1, ax = halfW;
  const cv = document.createElement('canvas');
  cv.width = halfW * 2 + 1; cv.height = H;
  const lit = PAL.gr1, edge = PAL.gr5;
  PX.withTarget(cv.getContext('2d'), () => {
    // Leaves at the foot
    if (blade) {
      PX.spr('fl_blade', ax + 2, H, { frame: H < 30 ? 1 : 2 });
      PX.spr('fl_blade', ax - 1, H, { frame: 1, flip: true });
    } else {
      PX.spr('fl_leaf', ax + 2, H - 2, { frame: 1 });
      PX.spr('fl_leaf', ax - 1, H - 6, { frame: 1, flip: true });
    }
    // Each bloom gets a branch that leaves the main stem below it and
    // climbs at a slant; blooms right above the foot sit on the stem.
    let stemTop = 0;
    for (const p of pts) {
      const onStem = Math.abs(p.x) < 4;
      const fork = onStem ? p.y : Math.max(3, p.y - Math.round(Math.abs(p.x) * 0.85) - 3);
      stemTop = Math.max(stemTop, fork);
      if (onStem) {
        PX.line(ax, H - 1 - fork + 4, ax + p.x, H - 1 - p.y, edge);
        PX.line(ax - 1, H - 1 - fork + 4, ax + p.x - 1, H - 1 - p.y, lit);
        continue;
      }
      const ex = ax + p.x, ey = H - 1 - p.y + 3;
      PX.line(ax, H - 1 - fork + 1, ex, ey + 1, edge);
      PX.line(ax, H - 1 - fork, ex, ey, lit);
      PX.line(ex, ey, ex, H - 1 - p.y, lit);
      // a small leaf half way along the branch
      const mx = Math.round(ax + p.x * 0.5), my = Math.round((H - 1 - fork + ey) / 2);
      PX.spr('fl_leaf', mx + (p.x > 0 ? 0 : 1), my + (p.x > 0 ? 6 : 1), { frame: 0, flip: p.x > 0 });
    }
    for (let yg = 0; yg <= stemTop; yg++) {
      PX.px(ax - 1, H - 1 - yg, lit);
      PX.px(ax, H - 1 - yg, PAL.gr2);
      PX.px(ax + 1, H - 1 - yg, edge);
    }
  });
  return flowerTrimArt({ cv, ax, pts });
}

// ── Flowers ───────────────────────────────────────────

// Represents a single flower instance with position, color, growth state, and face images
class Flower {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor(wx, wy, hsl, imgs = []) {
    this.wx    = wx;
    this.wy    = wy;
    this.hsl   = hsl;
    this.imgs  = imgs;
    this.type  = FLOWER_TYPES[floor(random(FLOWER_TYPES.length))];
    const [lo, hi] = this.type.sizeRange;
    // Every flower is drawn at one scale now, so the back rows only need
    // to be a little taller to peek over the rows in front.
    const depthFactor = lerp(1.15, 0.95, this.wy);
    this.size       = 0.0;
    this.targetSize = (lo + random(hi - lo)) * depthFactor;
    this.restSize   = this.targetSize;
    this.maxAllowed = this.targetSize * 1.5;
    this.phase      = random(TWO_PI);
    this.dirtAlpha  = 255;
    this.popTimer   = 0;       // frames left of the "just bloomed" sparkle
    this.wasSmall   = false;   // has been seen below full bloom
    this.col        = flowerColour(hsl);
    this.art        = {};      // the cached canvases this flower is using
  }
  // Increases the flower's target size when boosted (each new smile
  // boosts every flower already in the garden), up to 1.5x its first size.
  boost() {
    if (this.targetSize < this.maxAllowed) {
      this.targetSize = min(this.targetSize + 0.05, this.maxAllowed);
    }
  }
  // Interpolates the flower toward its target size each frame
  update() {
    this.size = lerp(this.size, this.targetSize, 0.05 + rainBoost);
    const maxSize = this.type.sizeRange[1] * 1.4;
    if (this.targetSize > this.restSize) {
      this.restSize = min(this.targetSize, maxSize);
    }
    this.size = max(this.size, 0.02);
    this.targetSize = max(this.targetSize, 0.02);
    this.restSize   = max(this.restSize,   0.02);
    if (this.dirtAlpha > 0) this.dirtAlpha -= 1.5;
    // Notice the moment the flower opens fully, for the sparkle
    if (this.size < FLOWER_FULL_AT) this.wasSmall = true;
    else if (this.wasSmall) { this.wasSmall = false; this.popTimer = 30; }
    if (this.popTimer > 0) this.popTimer--;
  }
  // Removes face images from the DOM to free memory
  dispose() {
    for (let img of this.imgs) {
      PX.forgetPhoto(img);
      img.remove();
    }
    this.imgs = [];
    this.art = {};
  }

  // Updates state and draws the flower at its world position, in the
  // stage its size has reached.
  draw() {
    this.update();
    const { x, y } = worldToPx(this.wx, this.wy);
    const size = this.size, type = this.type, a = this.art;

    if (size < FLOWER_SPROUT_AT) {
      // Seed: nothing but the mound
      PX.spr('fl_mound', x, y + 2, { frame: this.dirtAlpha > 170 ? 0 : 1 });
      return;
    }
    if (size < FLOWER_BUD_AT) {
      const f = size < 0.07 ? 0 : size < 0.09 ? 1 : 2;
      PX.spr('fl_sprout', x, y, { frame: f });
      this.drawMound(x, y);
      return;
    }

    // How far the top leans this frame: the wind plus the flower's own
    // slow rocking. Stiff stalks lean less, short ones hardly at all.
    const H0 = flowerStemHeight(size, type);
    const flex = type.stemStyle === 'thick' ? 0.6 : type.stemStyle === 'wispy' ? 1.3 : 1;
    let lean = Math.round((windX * 2.4 + Math.sin(t * 0.03 + this.phase) * 0.9) * flex);
    const maxLean = Math.floor(H0 / 9);
    lean = Math.max(-maxLean, Math.min(maxLean, lean));
    // The head nods a pixel now and then; raindrops knock it more often
    const raining = rainBoost > 0;
    let bob = Math.sin(t * (raining ? 0.21 : 0.045) + this.phase * 1.7) > (raining ? 0.2 : 0.55) ? 1 : 0;
    if (this.popTimer > 22) bob = -1;         // a little spring as it opens

    const n = this.imgs.length;
    if (n > 1 && size >= FLOWER_OPEN_AT) {
      this.drawGroup(x, y, lean, bob);
    } else {
      if (a.stemH !== H0) { a.stem = flowerStemArt(type, H0); a.stemH = H0; }
      const hx = x + lean + a.stem.headDx, hy = y - H0 + bob;
      if (size < FLOWER_OPEN_AT) {
        // Stem with a bud on top
        drawFlowerSwayed(a.stem, x, y, lean, 0);
        const big = size >= 0.15;
        if (a.budBig !== big) { a.bud = flowerBudArt(this.col, big); a.budBig = big; }
        PX.c.drawImage(a.bud.cv, hx - a.bud.ax, hy - a.bud.ay + 1);
      } else {
        // Bloom, with the face (if any) in the middle
        const r = flowerFaceRadius(size);
        const img = n > 0 ? this.imgs[0] : null;
        if (a.headR !== r) {
          a.head = flowerHeadArt(type, this.col, r, !!img);
          if (img && img._pxPhoto && a.headR) delete img._pxPhoto[a.headR];
          a.headR = r;
        }
        // The top of the stem is behind the head, so only the part that
        // shows below it is drawn
        drawFlowerSwayed(a.stem, x, y, lean, a.head.cv.height - a.head.ay - 6);
        PX.c.drawImage(a.head.cv, hx - a.head.ax, hy - a.head.ay);
        if (img) PX.photo(img, hx, hy, r);
        if (this.popTimer > 0) this.drawSparkles(hx, hy, a.head.ay);
      }
    }
    this.drawMound(x, y);
  }

  // Branching plant with one bloom per face.
  drawGroup(x, y, lean, bob) {
    const a = this.art, n = this.imgs.length, size = this.size;
    const q = flowerPlantScale(size);
    if (a.plantQ !== q) { a.plant = flowerPlantArt(this.type, n, q); a.plantQ = q; }
    const plant = a.plant, H = plant.cv.height;
    drawFlowerSwayed(plant, x, y, lean, 0);
    const open = size >= FLOWER_FULL_AT;
    const r = !open ? 0 : size < 0.8 ? 6 : 7;
    if (a.headR !== r) {
      if (open) a.head = flowerHeadArt(this.type, this.col, r, true);
      else a.bud = flowerBudArt(this.col, true);
      if (a.headR) for (const img of this.imgs) if (img._pxPhoto) delete img._pxPhoto[a.headR];
      a.headR = r;
    }
    const c = PX.c, pts = plant.pts;
    for (let i = 0; i < pts.length && i < n; i++) {
      const p = pts[i];
      const hx = x + p.x + flowerSwayAt(p.y, H, lean);
      // each bloom nods in its own time
      const nod = bob < 0 ? bob : (Math.sin(t * 0.045 + this.phase * 1.7 + i * 1.9) > 0.55 ? 1 : 0);
      const hy = y - p.y + nod;
      if (open) {
        c.drawImage(a.head.cv, hx - a.head.ax, hy - a.head.ay);
        PX.photo(this.imgs[i], hx, hy, r);
        if (this.popTimer > 0 && i % 2 === 0) this.drawSparkles(hx, hy, a.head.ay);
      } else {
        c.drawImage(a.bud.cv, hx - a.bud.ax, hy - a.bud.ay + 2);
      }
    }
  }

  // Twinkles round a head that has just opened.
  drawSparkles(hx, hy, R) {
    const age = 30 - this.popTimer;
    PX.spr('fl_sparkle', hx - R, hy - R + 3, { frame: Math.floor(age / 6) % 4 });
    PX.spr('fl_sparkle', hx + R, hy - 2, { frame: Math.floor((age + 8) / 6) % 4 });
    PX.spr('fl_sparkle', hx + 2, hy - R - 2, { frame: Math.floor((age + 16) / 6) % 4 });
  }

  // Dirt mound in front of the stem; it crumbles away after planting.
  drawMound(x, y) {
    if (this.dirtAlpha <= 0) return;
    PX.spr('fl_mound', x, y + 2, { frame: this.dirtAlpha > 170 ? 0 : this.dirtAlpha > 85 ? 1 : 2 });
  }
}

// ── Hand-held flower ──────────────────────────────────

// Draws the tiny flower a student carries: about 7 art pixels tall with
// the bottom of its stem at (x, y).
function drawTinyFlower(x, y, hsl) {
  const col = flowerColour(hsl || [0, 70, 60]);
  const art = FlowerCache.get(FlowerCache.small, 'tiny' + col.key, 300, () => FLOWER_ART.tiny(col.ramp));
  PX.c.drawImage(art.cv, Math.round(x) - art.ax, Math.round(y) - art.ay);
}
drawTinyFlower.pixel = true;

// Older character code asked for a full-size flower to shrink down and
// hold. It now gets the tiny flower too.
function drawFlower(x, y, hsl) {
  drawTinyFlower(x, y, hsl);
}
