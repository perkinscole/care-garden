// ================================================================
// File: flowers.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 23, 2026
// Description: Flower class for the CARE Garden, drawn as block flowers
//   in the 3D garden. A flower grows from a seed mound through a sprout
//   to a bloom with a student's real photo in its centre; group photos
//   grow one branching plant with a bloom per face. A new flower opens at
//   a big "celebration" size and after a minute and a half settles to a
//   compact garden size, so a full day of smiles stays a meadow. Each
//   flower is ONE baked mesh (stem, leaves, petals, frames; block art in
//   js/art/flowers_art.js) plus one unlit photo square per face; it grows
//   and settles by scaling, and is never rebuilt.
// ================================================================

// ── Growth stages ─────────────────────────────────────
// `size` runs from 0.02 (just planted, or eaten by the ram) up past 1
// (boosted). These are the sizes at which a flower changes stage.
const FLOWER_SPROUT_AT = 0.05;   // below this: only a seed mound
const FLOWER_BUD_AT    = 0.11;   // sprout becomes a small plant that grows up
const FLOWER_FULL_AT   = 0.30;   // full bloom (the sparkle goes off as it passes this)

// ── Celebration size and garden size ──────────────────
// A new flower opens big so the student who just smiled can find
// themselves from across the room. After a minute and a half it eases
// down to a compact garden size and stays there, so a whole school day
// of smiles is a meadow with room for the ram and the students to be
// seen in it. When the garden is crowded, all but the newest flowers
// shrink one more step.
const FLOWER_SETTLE_START = 90;   // seconds a flower stays at celebration size
const FLOWER_SETTLE_TIME  = 26;   // seconds it then takes to ease down
const FLOWER_CROWD_AT     = 100;  // flowers older than the newest 100 are "crowded"

// ── Sizes in blocks ───────────────────────────────────
// A flower is built once at its celebration size and scaled as a whole.
//   single flower   photo 2 blocks across (bloom about 3.6 with petals), its
//                   centre 3.2-4.4 blocks up (taller the bigger its baseSize);
//                   settled x0.66: photo 1.3, centre 2.1-2.9;
//                   crowded x0.60: photo 1.2
//   group plant     photos 1.24 across, the top one 3.5-6.5 blocks up;
//                   settled x0.74: photos 0.92
//   no photo        middle block 1 across on a stem 2-2.6 blocks tall
// A boost swells the whole plant by up to 18%.
// (A grown-up is 2 blocks tall with a head half a block across.)
const FLOWER_U_SINGLE = 1.0;      // half the width of a single flower's photo
const FLOWER_U_GROUP  = 0.62;     // ... of each photo on a group plant
const FLOWER_U_PLAIN  = 0.5;      // ... of the middle block of a flower with no photo
const FLOWER_SETTLE_SHRINK = 0.34, FLOWER_GROUP_SHRINK = 0.26, FLOWER_CROWD_SHRINK = 0.06;
const FLOWER_TILT = 0.2;          // radians a bloom leans back to face the camera (about 12 degrees)

// ── Colour ────────────────────────────────────────────
// Petal colours are snapped to 24 hues and two tones so that flowers
// look like one family. Returns { key, ramp } (ramp from PX.ramp).
function flowerColour(hsl) {
  const hq = (Math.round((((hsl[0] % 360) + 360) % 360) / 15) * 15) % 360;
  const light = hsl[2] >= 63;
  let s = light ? 72 : 80, l = light ? 66 : 57;
  // Greens are lifted toward mint and lime so they stand out from the lawn
  if (hq >= 90 && hq <= 150) { l += 9; s -= 6; }
  return { key: hq + (light ? 'L' : 'D'), ramp: PX.ramp(hq, s, l) };
}


// ── Plans ─────────────────────────────────────────────
// Where the blooms sit on a plant of 2–6 faces: [x right, y up], highest
// first, measured in bloom spacings (one spacing = the width of a bloom
// plus a small gap) from the lowest bloom. Every pair is at least one
// spacing apart, so no bloom touches another and no photo hides another,
// and the heights are staggered so it reads as one little flower tree.
const FLOWER_GROUP_LAYOUTS = {
  2: [[-0.55, 0.4], [0.55, 0]],
  3: [[0.05, 0.95], [-0.62, 0.1], [0.62, 0]],
  4: [[0.8, 1.05], [-0.4, 0.95], [-0.85, 0], [0.3, 0.1]],
  5: [[0, 1.1], [-1.1, 0.95], [1.1, 0.85], [-0.55, 0.05], [0.55, 0]],
  6: [[0.25, 1.15], [-0.85, 1.0], [1.35, 0.95], [-1.4, 0.1], [0.8, 0.1], [-0.3, 0]],
};

// How far the petals of each kind of bloom reach, in bloom units.
const FLOWER_REACH = {};
function flowerReach(name, face, trim) {
  const key = name + (face ? 'f' : 'n') + trim;
  if (!FLOWER_REACH[key]) FLOWER_REACH[key] = FLOWER3.bloom(name, PX.ramp(0), face, trim).reach;
  return FLOWER_REACH[key];
}

// Lays a flower out at its celebration size, in blocks from the foot of
// the stem: { blooms: [{ x, y, z, u }], H, reach, top, tilt, group,
// face, trim }. blooms are the centres of the photos (u = half a photo's
// width), highest first; reach is how far a bloom's petals go from its
// centre and top is the highest point of the plant.
function flowerPlan(f) {
  const n = f.imgs.length, type = f.type, name = type.name;
  const q = v => Math.round(v * 16) / 16;                       // whole texels
  const tall = Math.max(0, Math.min(1, (f.baseSize - 0.38) / 0.54));
  const tilt = FLOWER_TILT + 0.035 * Math.sin(f.phase * 3);
  const plan = { blooms: [], group: n > 1, face: n > 0, trim: n > 1 ? 1 : 0, tilt, jog: 0 };
  const u = n > 1 ? FLOWER_U_GROUP : n === 1 ? FLOWER_U_SINGLE : FLOWER_U_PLAIN;
  const reach = flowerReach(name, plan.face, plan.trim) * u;
  const z = 0.07 + 0.36 * u;                                     // blooms stand just in front of the stem
  if (n > 1) {
    const layout = FLOWER_GROUP_LAYOUTS[Math.min(6, n)];
    const d = 2 * reach + 0.45, base = reach + 0.9 + 0.8 * tall;
    for (let i = 0; i < n; i++) {
      const p = layout[i % layout.length];
      plan.blooms.push({ x: q(p[0] * d), y: q(base + p[1] * d), z: z + (i % 2) * 0.03, u });
    }
    plan.H = plan.blooms[0].y;
  } else {
    const k = type.stemStyle === 'thick' ? 1.06 : type.stemStyle === 'droop' ? 0.95 : 1;
    let H = n === 1 ? (3.2 + 1.2 * tall) * k : 2.0 + 0.6 * tall;
    H = Math.max(H, reach + 1.05);                               // long petals stay clear of the lawn
    if (type.stemStyle === 'droop') plan.jog = 0.25;             // the poppy nods to one side
    plan.H = q(H);
    plan.blooms.push({ x: plan.jog, y: plan.H, z, u });
  }
  plan.reach = reach;
  plan.top = 0;
  for (const b of plan.blooms) plan.top = Math.max(plan.top, b.y + reach);
  return plan;
}

// ── Models ────────────────────────────────────────────
// G3.merged with every face checked to be wound the way its normal
// points (a face wound backwards is culled and the box shows hollow).
function flowerMesh(boxes) {
  const mesh = G3.merged(boxes), g = mesh.geometry;
  const pos = g.attributes.position.array, nor = g.attributes.normal.array, idx = g.index.array;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const facing = (uy * vz - uz * vy) * nor[a] + (uz * vx - ux * vz) * nor[a + 1] + (ux * vy - uy * vx) * nor[a + 2];
    if (facing < 0) { idx[i + 1] = c / 3; idx[i + 2] = b / 3; }
  }
  return mesh;
}

// Small pieces every flower shares (one geometry each, never freed):
// the dirt mound, the sprout and the sparkles.
const FLOWER_PARTS = {};
function flowerPart(kind) {
  let proto = FLOWER_PARTS[kind];
  if (!proto) {
    proto = flowerMesh(FLOWER3[kind]());
    proto.geometry.userData.own = false;                         // shared: G3.dispose leaves it alone
    if (kind === 'sparkles') {
      proto.material = G3.mat('#ffffff', { basic: true, vertexColors: true });
      proto.castShadow = false; proto.receiveShadow = false;
    }
    FLOWER_PARTS[kind] = proto;
  }
  return proto.clone();
}

// Builds the model of a flower at its celebration size:
//   root (at the foot; rocks in the wind)
//     plant (scaled as the flower grows and settles)
//       ONE mesh: stem, leaves, branches, petals, backing slabs, frames
//       one G3.photo square per face (the real photo, unlit)
// The mound, sprout and sparkles are added to the root only while needed.
function buildFlowerModel(f) {
  const plan = f.plan, type = f.type, ramp = f.col.ramp;
  const root = new THREE.Group(), plant = new THREE.Group();
  const L = [];
  if (plan.group) FLOWER3.branches(L, type.name, plan.blooms, plan.reach + 0.25);
  else FLOWER3.stem(L, type.name, type.stemStyle, plan.H, plan.H - plan.reach, plan.jog);
  const stemBoxes = L.length;
  const art = FLOWER3.bloom(type.name, ramp, plan.face, plan.trim);
  for (const b of plan.blooms) {
    for (const p of art.boxes) {
      L.push({ x: b.x + p.x * b.u, y: b.y + p.y * b.u, z: b.z + p.z * b.u,
        w: p.w * b.u, h: p.h * b.u, d: p.d * b.u, c: p.c });
    }
  }
  const mesh = flowerMesh(L);
  // Tip each bloom back about its own centre so it faces the camera
  // (the boxes of a bloom turn together, as one block).
  const pos = mesh.geometry.attributes.position.array, nor = mesh.geometry.attributes.normal.array;
  const c = Math.cos(-plan.tilt), s = Math.sin(-plan.tilt), per = art.boxes.length * 72;
  plan.blooms.forEach((b, i) => {
    const from = stemBoxes * 72 + i * per;
    for (let k = from; k < from + per; k += 3) {
      const y = pos[k + 1] - b.y, z = pos[k + 2] - b.z;
      pos[k + 1] = b.y + y * c - z * s;
      pos[k + 2] = b.z + y * s + z * c;
      const ny = nor[k + 1], nz = nor[k + 2];
      nor[k + 1] = ny * c - nz * s;
      nor[k + 2] = ny * s + nz * c;
    }
  });
  mesh.matrixAutoUpdate = false;
  plant.add(mesh);
  // The photos: real, unlit, never redrawn; each just in front of its frame.
  plan.blooms.forEach((b, i) => {
    const img = f.imgs[i];
    if (!img) return;
    const ph = G3.photo(img, 2 * b.u);
    ph.position.set(b.x, b.y - s * 0.02 * b.u, b.z + c * 0.02 * b.u);
    ph.rotation.x = -plan.tilt;
    ph.castShadow = false;
    ph.updateMatrix();
    ph.matrixAutoUpdate = false;
    plant.add(ph);
  });
  root.add(plant);
  root.userData.plant = plant;
  G3.place(root, f.wx, f.wy, 0);
  return root;
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
// AIMING AT A FLOWER, in blocks (scene positions, THREE.Vector3; pass
// `out` to avoid allocating):
//   foot3(out)     where the stem meets the lawn
//   head3(i, out)  the middle of bloom i, swaying with the plant
//
// ... and the same in ART pixels, as the camera sees them:
//   footPos()   { x, y }     where the stem meets the ground
//   headPos(i)  { x, y, r }  the middle of a bloom, swaying with the stem;
//               r is how far its petals reach from that point. i = 0 (the
//               default) is the top bloom; a group plant has `blooms` of
//               them, the last being the lowest. For a bud, sprout or seed
//               it is the tip of whatever is there.
//   height()    art pixels from the ground to the top of the flower
//   blooms      how many blooms it has (1, or one per face)
class Flower {
  static g3 = true;      // drawn as a block model in the 3D garden (see js/g3.js)

  constructor(wx, wy, hsl, imgs = []) {
    this.wx    = wx;
    this.wy    = wy;
    this.hsl   = hsl;
    this.imgs  = imgs;
    this.type  = FLOWER_TYPES[floor(random(FLOWER_TYPES.length))];
    const [lo, hi] = this.type.sizeRange;
    // The back rows are a little taller, to peek over the rows in front.
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
    this.plan       = flowerPlan(this);   // its shape in blocks (see flowerPlan)
    this.lean       = 0;       // how far it is rocking right now (radians)
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

  // Frees the model (its mesh and the photo textures) and removes the
  // face images from the DOM to free memory
  dispose() {
    G3.forget(this);
    for (let img of this.imgs) {
      PX.forgetPhoto(img);
      img.remove();
    }
    this.imgs = [];
  }

  // How big the plant is drawn right now, as a multiple of the
  // celebration size it was built at: it grows with `size` (and shrinks
  // again as the ram eats it), swells a little with a boost, and eases
  // down as it settles. 0 while it is still a seed or a sprout.
  scale3() {
    const size = this.size;
    if (size < FLOWER_BUD_AT) return 0;
    const rel = size / this.baseSize;
    let k = rel >= 1 ? 1 + 0.3 * Math.min(0.6, rel - 1)
      : Math.pow(Math.max(0, (size - 0.06) / (this.baseSize - 0.06)), 0.75);
    k *= 1 - (this.plan.group ? FLOWER_GROUP_SHRINK : FLOWER_SETTLE_SHRINK) * this.settle
      - FLOWER_CROWD_SHRINK * this.crowd * this.settle;
    if (this.popTimer > 22) k *= 1.06;        // a little spring as it opens
    return k;
  }
  // Height in blocks of the seedling (0 for a seed).
  sproutHeight() {
    return this.size < FLOWER_SPROUT_AT ? 0.1 : 0.5 * (0.4 + 0.9 * (this.size - FLOWER_SPROUT_AT) / (FLOWER_BUD_AT - FLOWER_SPROUT_AT));
  }

  // ── For the characters (see the notes above the class) ──
  foot3(out) { return G3.pos(this.wx, this.wy, 0, out); }
  head3(i = 0, out) { return this.point3(i, 0, out); }
  // The point `up` blocks above the centre of bloom i (measured along the
  // rocking plant); i = -1 is the foot of the stem.
  point3(i, up, out) {
    out = G3.pos(this.wx, this.wy, 0, out);
    const k = this.scale3();
    let x = 0, y = up, z = 0;
    if (k <= 0) y += i < 0 ? 0 : this.sproutHeight();
    else if (i >= 0) {
      const bl = this.plan.blooms, b = bl[Math.min(i, bl.length - 1)];
      x = b.x * k; y += b.y * k; z = b.z * k;
    }
    const c = Math.cos(this.lean), s = Math.sin(this.lean);
    out.x += x * c - y * s;
    out.y += x * s + y * c;
    out.z += z;
    return out;
  }
  footPos() {
    if (!G3.ready) return worldToPx(this.wx, this.wy);
    return G3.artAt(this.wx, this.wy, 0);
  }
  headPos(i = 0) {
    if (!G3.ready) { const p = worldToPx(this.wx, this.wy); return { x: p.x, y: p.y, r: 0 }; }
    const v = Flower._v || (Flower._v = new THREE.Vector3());
    const k = this.scale3(), reach = k > 0 ? this.plan.reach * k : 0.12;
    const p = G3.toArt(this.point3(i, 0, v));
    p.r = Math.max(1, p.y - G3.toArt(this.point3(i, reach, v)).y);
    return p;
  }
  height() {
    if (!G3.ready) return 0;
    const v = Flower._v || (Flower._v = new THREE.Vector3());
    const k = this.scale3();
    const top = k > 0 ? this.plan.top * k : this.sproutHeight();
    return G3.toArt(this.point3(-1, 0, v)).y - G3.toArt(this.point3(-1, top, v)).y;
  }
  get blooms() { return Math.max(1, this.imgs.length); }

  // Updates state and poses the model: the stage its size has reached,
  // its scale, and its rocking in the wind.
  draw() {
    this.update();
    const m = G3.model(this, () => buildFlowerModel(this));
    const ud = m.userData, size = this.size;

    // Fresh dirt at the foot; it crumbles away after planting
    if (this.dirtAlpha > 0) {
      if (!ud.mound) { ud.mound = flowerPart('mound'); ud.mound.rotation.y = this.phase; m.add(ud.mound); }
      const a = Math.min(1, this.dirtAlpha / 150);
      ud.mound.scale.set(0.55 + 0.45 * a, a, 0.55 + 0.45 * a);
    } else if (ud.mound) { m.remove(ud.mound); ud.mound = null; }

    const k = this.scale3();
    if (k <= 0) {
      // Seed (nothing but the mound) or sprout
      ud.plant.visible = false;
      this.lean = 0; m.rotation.z = 0;
      if (size >= FLOWER_SPROUT_AT) {
        if (!ud.sprout) { ud.sprout = flowerPart('sprout'); m.add(ud.sprout); }
        ud.sprout.visible = true;
        ud.sprout.scale.setScalar(this.sproutHeight() / 0.5);
      } else if (ud.sprout) ud.sprout.visible = false;
      return;
    }
    if (ud.sprout) { m.remove(ud.sprout); ud.sprout = null; }
    ud.plant.visible = true;
    ud.plant.scale.setScalar(k);

    // The wind plus the flower's own slow rocking, about the foot of the stem
    const style = this.type.stemStyle;
    const flex = style === 'thick' ? 0.6 : style === 'wispy' ? 1.3 : this.plan.group ? 0.7 : 1;
    const raining = rainBoost > 0;
    let lean = (-windX * 0.03 + Math.sin(t * 0.03 + this.phase) * 0.017
      + (raining ? Math.sin(t * 0.21 + this.phase * 1.7) * 0.006 : 0)) * flex;
    this.lean = lean = Math.max(-0.055, Math.min(0.055, lean));
    m.rotation.z = lean;

    // Twinkles round a bloom that has just opened
    if (this.popTimer > 0) {
      if (!ud.spark) { ud.spark = flowerPart('sparkles'); m.add(ud.spark); }
      const age = 30 - this.popTimer, b = this.plan.blooms[0];
      ud.spark.position.set(b.x * k, b.y * k, b.z * k);
      ud.spark.scale.setScalar(this.plan.reach * k * (0.95 + 0.45 * age / 30) * (1 + 0.12 * Math.sin(age * 1.3)));
      ud.spark.rotation.z = age * 0.035;
      ud.spark.visible = (age % 8) < 6;
    } else if (ud.spark) { m.remove(ud.spark); ud.spark = null; }
  }
}

// ── Hand-held flowers ─────────────────────────────────

// The tiny block flower a student carries: about 0.6 blocks tall, origin
// at the bottom of its stem, facing +z. Flowers of one colour share their
// geometry, so the caller may add and drop these freely.
const TINY_FLOWERS = new Map();
function makeTinyFlower3(hsl) {
  const col = flowerColour(hsl || [0, 70, 60]);
  let proto = TINY_FLOWERS.get(col.key);
  if (!proto) {
    proto = flowerMesh(FLOWER3.tiny(col.ramp));
    proto.geometry.userData.own = false;      // shared: G3.dispose leaves it alone
    TINY_FLOWERS.set(col.key, proto);
  }
  const g = new THREE.Group();
  g.add(proto.clone());
  return g;
}

// The same in 2D for the dashboard and the cards: about 8 art pixels tall
// and 7 wide, with the bottom of its stem at (x, y).
const TINY_FLOWER_ART = new Map();
function drawTinyFlower(x, y, hsl) {
  const col = flowerColour(hsl || [0, 70, 60]);
  let art = TINY_FLOWER_ART.get(col.key);
  if (!art) { art = FLOWER_ART.tiny(col.ramp); TINY_FLOWER_ART.set(col.key, art); }
  PX.c.drawImage(art.cv, Math.round(x) - art.ax, Math.round(y) - art.ay);
}
drawTinyFlower.pixel = true;
