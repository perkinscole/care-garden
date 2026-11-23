// ================================================================
// File: flowers.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Flower class and pixel-art drawing for the CARE Garden.
//   A flower grows from a seed mound through sprout and bud to a bloom
//   with a student's photo in its centre; group photos grow one
//   branching plant with a bloom per face. A new flower opens at a big
//   "celebration" size and after a minute and a half settles to a
//   compact garden size, so a full day of smiles stays a meadow. Heads,
//   stems and plants are painted once into small cached canvases (see
//   js/art/flowers_art.js) so a garden of a thousand flowers stays fast.
// ================================================================

// ── Growth stages ─────────────────────────────────────
// `size` runs from 0.02 (just planted, or eaten by the ram) up past 1
// (boosted). These are the sizes at which a flower changes stage.
const FLOWER_SPROUT_AT = 0.05;   // below this: only a seed mound
const FLOWER_BUD_AT    = 0.11;   // sprout becomes a stem with a bud
const FLOWER_OPEN_AT   = 0.19;   // bud opens into a small bloom
const FLOWER_FULL_AT   = 0.30;   // full bloom: the face is at its proper size

// ── Celebration size and garden size ──────────────────
// A new flower opens big so the student who just smiled can find
// themselves from across the room. After a minute and a half it eases
// down, a pixel at a time, to a compact garden size and stays there, so
// a whole school day of smiles is a meadow with room for the ram and the
// students to be seen in it. When the garden is crowded, all but the
// newest flowers shrink one more step.
const FLOWER_SETTLE_START = 90;   // seconds a flower stays at celebration size
const FLOWER_SETTLE_TIME  = 26;   // seconds it then takes to ease down
const FLOWER_CROWD_AT     = 100;  // flowers older than the newest 100 are "crowded"

// Face radius in art pixels at each time of a flower's life. 4 is the
// smallest at which a photo still reads as a face on the TV.
const FLOWER_R_FRESH = 7, FLOWER_R_GARDEN = 5, FLOWER_R_CROWD = 4;
const FLOWER_GROUP_R_FRESH = 6, FLOWER_GROUP_R_GARDEN = 4;   // blooms of a group plant
const FLOWER_R_OPENING = 4;       // the small bloom between bud and full bloom

// Stem height in whole art pixels. It climbs quickly at first and levels
// off, so boosted flowers get bigger heads rather than endless stalks.
// `shrink` (1 = celebration size) shortens the stalk of a settled flower
// and `minH` keeps its head clear of the ground.
function flowerStemHeight(size, type, shrink = 1, minH = 2) {
  const k = type.stemStyle === 'thick' ? 1.12 : type.stemStyle === 'droop' ? 0.94 : 1;
  return Math.max(2, minH, Math.round(46 * (1 - Math.exp(-1.5 * size)) * k * shrink));
}

// A bloom with a face is drawn as one picture: the petals with the photo
// already set into them, at full screen resolution so the face stays
// sharp. It is kept on the photo itself and repainted only when the bloom
// changes size (`key`), so a settled flower costs one drawImage a frame.
function flowerBloomArt(img, head, r, key) {
  let b = img._flBloom;
  const S = PX.S;
  if (!b || b.key !== key || b.S !== S || b.head !== head) {
    const cv = (b && b.cv) || document.createElement('canvas');
    cv.width = head.cv.width * S; cv.height = head.cv.height * S;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.setTransform(S, 0, 0, S, 0, 0);
    g.drawImage(head.cv, 0, 0);
    PX.withTarget(g, () => PX.photo(img, head.ax, head.ay, r));
    PX.forgetPhoto(img);   // the cut-out photo is part of the bloom now
    b = img._flBloom = { cv, key, S, head };
  }
  return b.cv;
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

// `trim` = 1 gives the shorter petals of a group plant's blooms.
function flowerHeadArt(type, col, r, face, trim = 0) {
  const key = type.name + '|' + col.key + '|' + r + (face ? 'f' : 'n') + trim;
  return FlowerCache.get(FlowerCache.heads, key, 1600,
    () => FLOWER_ART.head(type.name, r, face, col.ramp,
      face ? FLOWER_ART.petalLen(type.name, r, trim) : 0));
}
function flowerBudArt(col, big) {
  return FlowerCache.get(FlowerCache.small, 'bud' + col.key + (big ? 'B' : 's'), 300,
    () => FLOWER_ART.bud(col.ramp, big));
}
function flowerStemArt(type, H) {
  return FlowerCache.get(FlowerCache.stems, type.name + '|' + H, 700,
    () => buildFlowerStem(type, H));
}
function flowerPlantArt(type, n, d, base) {
  const blade = type.name === 'lily' || type.name === 'tulip';
  return FlowerCache.get(FlowerCache.plants, n + (blade ? 'b' : 'r') + d + '|' + base, 400,
    () => buildFlowerPlant(n, blade, d, base));
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
// Where the blooms sit on a plant of 2–6 faces: [x right, y up], highest
// first, measured in bloom spacings (one spacing = the width of a bloom
// plus a small gap) from the lowest bloom. Every pair is at least one
// spacing apart, so no bloom touches another and the green branches show
// between them, and the heights are staggered so it reads as one
// branching plant rather than a bunch.
const FLOWER_GROUP_LAYOUTS = {
  2: [[-0.55, 0.4], [0.55, 0]],
  3: [[0.05, 0.95], [-0.62, 0.1], [0.62, 0]],
  4: [[0.8, 1.05], [-0.4, 0.95], [-0.85, 0], [0.3, 0.1]],
  5: [[0, 1.1], [-1.1, 0.95], [1.1, 0.85], [-0.55, 0.05], [0.55, 0]],
  6: [[0.25, 1.15], [-0.85, 1.0], [1.35, 0.95], [-1.4, 0.1], [0.8, 0.1], [-0.3, 0]],
};

// Paints the stem and branches of a group plant whose blooms are `d`
// pixels apart, the lowest of them `base` pixels above the ground.
// Returns { cv, ax, pts }: pts are the bloom centres { x, y } relative to
// the foot of the stem (y up).
function buildFlowerPlant(n, blade, d, base) {
  const layout = FLOWER_GROUP_LAYOUTS[Math.min(6, Math.max(2, n))];
  const pts = layout.map(p => ({ x: Math.round(p[0] * d), y: base + Math.round(p[1] * d) }));
  let top = 0, halfW = 0;
  for (const p of pts) { top = Math.max(top, p.y); halfW = Math.max(halfW, Math.abs(p.x)); }
  halfW += 10;
  const H = top + 1, ax = halfW;
  const cv = document.createElement('canvas');
  cv.width = halfW * 2 + 1; cv.height = H;
  const lit = PAL.gr1, mid = PAL.gr2, edge = PAL.gr5;
  PX.withTarget(cv.getContext('2d'), () => {
    // Leaves at the foot
    if (blade) {
      PX.spr('fl_blade', ax + 2, H, { frame: H < 30 ? 1 : 2 });
      PX.spr('fl_blade', ax - 1, H, { frame: H < 30 ? 0 : 1, flip: true });
    } else {
      PX.spr('fl_leaf', ax + 2, H - 2, { frame: 1 });
      PX.spr('fl_leaf', ax - 1, H - 5, { frame: H < 30 ? 0 : 1, flip: true });
    }
    // Each bloom gets a branch that leaves the main stem below it, sweeps
    // outward and then turns up into the bloom, like the arm of a
    // candlestick. Blooms right above the foot sit on the stem itself.
    let stemTop = 0;
    for (const p of pts) {
      if (Math.abs(p.x) < 3) { stemTop = Math.max(stemTop, p.y); continue; }
      const fork = Math.max(2, p.y - Math.round(Math.abs(p.x) * 0.75) - 3);
      stemTop = Math.max(stemTop, fork);
      // A curve from the fork (0, fork) to the bloom (p.x, p.y) that bends
      // through the point straight below the bloom
      const steps = Math.abs(p.x) + p.y - fork;
      let leafAt = null;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps, v = 1 - u;
        const bx = (2 * v * u + u * u) * p.x;
        const by = v * v * fork + 2 * v * u * (fork + 1) + u * u * p.y;
        const X = ax + Math.round(bx), Y = H - 1 - Math.round(by);
        PX.px(X, Y + 1, edge);
        PX.px(X, Y, lit);
        if (!leafAt && u >= 0.3) leafAt = [X, Y];
      }
      // a small leaf on the outward sweep of the longer branches
      if (leafAt && Math.abs(p.x) >= 9) {
        PX.spr('fl_leaf', leafAt[0] + (p.x > 0 ? -1 : 1), leafAt[1] + 1, { frame: 0, flip: p.x < 0 });
      }
    }
    for (let yg = 0; yg <= stemTop; yg++) {
      PX.px(ax - 1, H - 1 - yg, lit);
      PX.px(ax, H - 1 - yg, mid);
      PX.px(ax + 1, H - 1 - yg, edge);
    }
  });
  return flowerTrimArt({ cv, ax, pts });
}

// ── Flowers ───────────────────────────────────────────

// Represents a single flower instance with position, color, growth state, and face images
//
// SIZES, for the characters that tend the garden:
//   size        how grown the flower is right now. 0.02 is a seed mound,
//               about 0.4–0.9 a healthy bloom. It follows targetSize.
//   targetSize  where size is heading. Boosts push it above restSize (the
//               gardener's watering, boost() on each new smile, rain) and
//               it drifts back down again, so every boost wears off.
//   restSize    the size the flower rests at. The ram shrinks restSize and
//               targetSize together as he eats; a flower he leaves
//               unfinished slowly grows back.
//   maxAllowed  the most boost() will push targetSize to.
// None of these say how big the flower is DRAWN: that also depends on how
// long ago it was planted (see "Celebration size and garden size" above).
//
// AIMING AT A FLOWER (art pixels, as it was last drawn):
//   footPos()   { x, y }     where the stem meets the ground
//   headPos(i)  { x, y, r }  the middle of a bloom, swaying with the stem;
//               r is how far its petals reach from that point. i = 0 (the
//               default) is the top bloom; a group plant has `blooms` of
//               them, the last being the lowest. For a bud, sprout or seed
//               it is the tip of whatever is there.
//   height()    art pixels from the ground to the top of the flower
//   blooms      how many blooms it has (1, or one per face)
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
    this.baseSize   = this.targetSize;   // the size it was planted to reach
    this.maxAllowed = this.targetSize * 1.5;
    this.phase      = random(TWO_PI);
    this.dirtAlpha  = 255;
    this.popTimer   = 0;       // frames left of the "just bloomed" sparkle
    this.wasSmall   = false;   // has been seen below full bloom
    this.col        = flowerColour(hsl);
    this.art        = {};      // the cached canvases this flower is using
    // Settling from celebration size to garden size
    this.age      = 0;         // seconds since it was planted
    this.settleAt = FLOWER_SETTLE_START + this.phase / TWO_PI * 8;   // flowers don't all shrink at once
    this.settle   = 0;         // 0 = celebration size .. 1 = garden size
    this.rank     = 0;         // how many flowers are newer than this one
    this.crowd    = 0;         // 0..1, eases to 1 once it is one of the older flowers in a full garden
  }

  // Once a frame, tells every flower how many newer flowers there are.
  static census() {
    if (Flower.censusFrame === frameCount) return;
    Flower.censusFrame = frameCount;
    const n = flowers.length;
    for (let i = 0; i < n; i++) flowers[i].rank = n - 1 - i;
  }

  // Increases the flower's target size when boosted (each new smile
  // boosts every flower already in the garden), up to 1.5x its first size.
  boost() {
    if (this.targetSize < this.maxAllowed) {
      this.targetSize = min(this.targetSize + 0.05, this.maxAllowed);
    }
  }

  // True while a boost is still strong enough to show as a bigger head.
  // One new smile is enough for a fresh flower; a settled one needs the
  // gardener's watering can or a run of smiles.
  isPerky() {
    return this.targetSize >= this.restSize * (1.04 + 0.16 * this.settle);
  }

  // Interpolates the flower toward its target size each frame, and ages it
  update() {
    Flower.census();
    const dt = Math.min(0.5, deltaTime / 1000);   // seconds since the last frame
    this.age += dt;
    const s = constrain((this.age - this.settleAt) / FLOWER_SETTLE_TIME, 0, 1);
    this.settle = s * s * (3 - 2 * s);
    const crowded = this.rank >= FLOWER_CROWD_AT ? 1 : 0;
    this.crowd += (crowded - this.crowd) * 0.02;
    if (abs(crowded - this.crowd) < 0.01) this.crowd = crowded;

    // Rain freshens every flower a little for as long as it falls
    if (rainBoost > 0 && this.targetSize < this.restSize * 1.12) this.targetSize += 0.04 * dt;
    // Boosts wear off: the target drifts back to the resting size, losing
    // half of what is left of a boost about every twenty seconds
    if (this.targetSize > this.restSize) this.targetSize -= (this.targetSize - this.restSize) * 0.036 * dt;
    else this.targetSize += (this.restSize - this.targetSize) * 0.02;
    // A flower the ram nibbled but did not finish grows back
    if (this.restSize < this.baseSize) this.restSize += (this.baseSize - this.restSize) * 0.0004;

    this.size = lerp(this.size, this.targetSize, 0.05 + rainBoost);
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
      img._flBloom = null;
      img.remove();
    }
    this.imgs = [];
    this.art = {};
  }

  // ── For the characters (see the notes above the class) ──
  footPos() { return worldToPx(this.wx, this.wy); }
  headPos(i = 0) {
    if (this.headY === undefined) { const p = this.footPos(); return { x: p.x, y: p.y, r: 0 }; }
    const plant = this.art.plant;
    if (i > 0 && this.isGroup && plant && plant.pts[i]) {
      const p = plant.pts[i];
      return { x: this.footX + p.x + flowerSwayAt(p.y, plant.cv.height, this.lean), y: this.footY - p.y, r: this.headR };
    }
    return { x: this.headX, y: this.headY, r: this.headR };
  }
  height() { return this.headY === undefined ? 0 : this.footY - this.headY + this.headR; }
  get blooms() { return Math.max(1, this.imgs.length); }

  // Remembers where the flower was drawn, for headPos() and height().
  place(x, y, hx, hy, hr, lean, isGroup) {
    this.footX = x; this.footY = y;
    this.headX = hx; this.headY = hy; this.headR = hr;
    this.lean = lean; this.isGroup = isGroup;
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
      this.place(x, y, x, y - 1, 1, 0, false);
      return;
    }
    if (size < FLOWER_BUD_AT) {
      const f = size < 0.07 ? 0 : size < 0.09 ? 1 : 2;
      PX.spr('fl_sprout', x, y, { frame: f });
      this.drawMound(x, y);
      this.place(x, y, x, y - 2 - f * 2, 2, 0, false);
      return;
    }

    // The wind plus the flower's own slow rocking; each kind of drawing
    // below limits how far it lets this lean its top.
    const flex = type.stemStyle === 'thick' ? 0.6 : type.stemStyle === 'wispy' ? 1.3 : 1;
    let lean = Math.round((windX * 2.4 + Math.sin(t * 0.03 + this.phase) * 0.9) * flex);
    // The head nods a pixel now and then; raindrops knock it more often
    const raining = rainBoost > 0;
    let bob = Math.sin(t * (raining ? 0.21 : 0.045) + this.phase * 1.7) > (raining ? 0.2 : 0.55) ? 1 : 0;
    if (this.popTimer > 22) bob = -1;         // a little spring as it opens

    const n = this.imgs.length;
    // How far along it is from celebration size to garden size, and how
    // much further the crowding of a full garden has shrunk it
    const settle = this.settle, crowd = this.crowd * settle;
    if (n > 1 && size >= FLOWER_OPEN_AT) {
      this.drawGroup(x, y, lean, bob, settle, crowd);
    } else if (size < FLOWER_OPEN_AT) {
      // Stem with a bud on top
      const H0 = flowerStemHeight(size, type, 1 - 0.5 * settle);
      if (a.stemH !== H0) { a.stem = flowerStemArt(type, H0); a.stemH = H0; }
      const maxLean = Math.floor(H0 / 9);
      lean = Math.max(-maxLean, Math.min(maxLean, lean));
      const hx = x + lean + a.stem.headDx, hy = y - H0 + bob;
      drawFlowerSwayed(a.stem, x, y, lean, 0);
      const big = size >= 0.15;
      if (a.budBig !== big) { a.bud = flowerBudArt(this.col, big); a.budBig = big; }
      PX.c.drawImage(a.bud.cv, hx - a.bud.ax, hy - a.bud.ay + 1);
      this.place(x, y, hx, hy - 3, 4, lean, false);
    } else {
      // Bloom, with the face (if any) in the middle. Its radius steps
      // down a pixel at a time as the flower settles; a faceless flower
      // is drawn to the matching scale.
      const img = n > 0 ? this.imgs[0] : null;
      let r = FLOWER_R_OPENING;
      if (size >= FLOWER_FULL_AT) {
        r = Math.round(FLOWER_R_FRESH - (FLOWER_R_FRESH - FLOWER_R_GARDEN) * settle
          - (FLOWER_R_GARDEN - FLOWER_R_CROWD) * crowd) + (this.isPerky() ? 1 : 0);
      }
      // Crowded flowers also wear shorter petals, so they are mostly portrait
      const trim = crowd >= 0.5 ? 1 : 0;
      const key = r * 2 + trim;
      if (a.headKey !== key) {
        a.head = flowerHeadArt(type, this.col, img ? r : r + 1, !!img, trim);
        a.headKey = key;
      }
      const head = a.head, below = head.cv.height - head.ay;   // how far the head hangs below its middle
      // A settled stalk is half as tall, a crowded one shorter still, but
      // a few pixels of stem always show under the head
      const H0 = flowerStemHeight(size, type, 1 - 0.5 * settle - 0.2 * crowd, below + 3 - trim);
      if (a.stemH !== H0) { a.stem = flowerStemArt(type, H0); a.stemH = H0; }
      const maxLean = Math.floor(H0 / 9);
      lean = Math.max(-maxLean, Math.min(maxLean, lean));
      const hx = x + lean + a.stem.headDx, hy = y - H0 + bob;
      // The top of the stem is behind the head, so only the part that
      // shows below it is drawn
      drawFlowerSwayed(a.stem, x, y, lean, Math.max(0, below - 6));
      PX.c.drawImage(img ? flowerBloomArt(img, head, r, key) : head.cv,
        hx - head.ax, hy - head.ay, head.cv.width, head.cv.height);
      if (this.popTimer > 0) this.drawSparkles(hx, hy, head.ay);
      this.place(x, y, hx, hy, head.ay, lean, false);
    }
    this.drawMound(x, y);
  }

  // Branching plant with one bloom per face.
  drawGroup(x, y, lean, bob, settle, crowd) {
    const a = this.art, n = this.imgs.length, size = this.size, type = this.type;
    const open = size >= FLOWER_FULL_AT;
    // Blooms shrink as the plant settles; before they open the plant is
    // laid out for its smallest blooms and carries buds
    let r = FLOWER_GROUP_R_GARDEN;
    if (open) {
      r = Math.round(FLOWER_GROUP_R_FRESH - (FLOWER_GROUP_R_FRESH - FLOWER_GROUP_R_GARDEN) * settle)
        + (this.isPerky() ? 1 : 0);
    }
    const key = open ? r : -r;
    if (a.headKey !== key) {
      if (open) a.head = flowerHeadArt(type, this.col, r, true, 1);
      else a.bud = flowerBudArt(this.col, true);
      a.headKey = key;
      a.reach = FLOWER_ART.headReach(type.name, r, FLOWER_ART.petalLen(type.name, r, 1));
    }
    // Blooms are spaced by their own width plus a gap for the branches
    // to show through; the plant stands a little taller the more grown
    // (or boosted) it is, and tucks in when the garden is crowded
    const d = 2 * a.reach + 1 + Math.round(5 - 3 * settle - crowd);
    const base = a.reach + 3 + Math.round(Math.min(1.2, size) * (7 - 4 * settle - 2 * crowd));
    if (a.plantD !== d || a.plantBase !== base) {
      a.plant = flowerPlantArt(type, n, d, base);
      a.plantD = d; a.plantBase = base;
    }
    const plant = a.plant, H = plant.cv.height;
    const maxLean = Math.floor(H / 14);
    lean = Math.max(-maxLean, Math.min(maxLean, lean));
    drawFlowerSwayed(plant, x, y, lean, 0);
    const c = PX.c, pts = plant.pts;
    for (let i = 0; i < pts.length && i < n; i++) {
      const p = pts[i];
      const hx = x + p.x + flowerSwayAt(p.y, H, lean);
      // each bloom nods in its own time
      const nod = bob < 0 ? bob : (Math.sin(t * 0.045 + this.phase * 1.7 + i * 1.9) > 0.55 ? 1 : 0);
      const hy = y - p.y + nod;
      if (open) {
        c.drawImage(flowerBloomArt(this.imgs[i], a.head, r, key),
          hx - a.head.ax, hy - a.head.ay, a.head.cv.width, a.head.cv.height);
        if (this.popTimer > 0 && i % 2 === 0) this.drawSparkles(hx, hy, a.head.ay);
      } else {
        c.drawImage(a.bud.cv, hx - a.bud.ax, hy - a.bud.ay + 2);
      }
    }
    const p0 = pts[0];
    this.place(x, y, x + p0.x + flowerSwayAt(p0.y, H, lean), y - p0.y, open ? a.head.ay : 4, lean, true);
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

// Draws the tiny flower a student carries: four petals in the flower's
// own colour round a yellow middle, on a green stem with a leaf. It is
// about 8 art pixels tall and 7 wide, with the bottom of its stem at (x, y).
function drawTinyFlower(x, y, hsl) {
  const col = flowerColour(hsl || [0, 70, 60]);
  const art = FlowerCache.get(FlowerCache.small, 'tiny' + col.key, 300, () => FLOWER_ART.tiny(col.ramp));
  PX.c.drawImage(art.cv, Math.round(x) - art.ax, Math.round(y) - art.ay);
}
drawTinyFlower.pixel = true;
