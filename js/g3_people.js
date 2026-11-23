// ================================================================
// File: g3_people.js
// Author: Cole Perkins
// Description: PEOPLE3 — the kit that builds and poses 3D box people
//   (gardener, students, teachers, staff) for the CARE Garden 2 block
//   world. See docs/GARDEN_3D.md.
//
//   A person is described by PEOPLE.look(spec) (js/art/people_art.js) and
//   built from a handful of boxes: a head with the face painted on the
//   front, a torso, two arms and two legs that swing from the shoulder and
//   hip, a block haircut, and whatever they wear or carry. Grown-ups are 2
//   blocks tall; students are the same build scaled to about 1.5 blocks
//   with a slightly bigger head.
//
//     const m = PEOPLE3.model(this, yaw);          // built once per person
//     const moving = PEOPLE3.move(m, wx, wy, { yaw: this.dir * 0.6 });
//     PEOPLE3.pose(m, { walk: moving ? this.walkPhase : null, arm: 'wave', face: 'smile' });
//
//   Models face +z (toward the viewer). The person's right arm is 'R'
//   (model -x), their left is 'L'.
// ================================================================

const PEOPLE3 = {
  _geos: {},
  _v: null,

  // ── Sizes ───────────────────────────────────────────
  // How much a look is scaled: 1 for grown-ups, about 0.72 for students
  // (three heights).
  scale(L) {
    if (L.kind !== 'kid') return 1;
    return L.height > 0 ? 0.78 : L.height < 0 ? 0.66 : 0.72;
  },
  // Students' heads are a little bigger for their bodies.
  headScale(L) { return L.kind === 'kid' ? 1.2 : 1; },
  // Height of the top of someone's head, hair or hat, in blocks.
  headTop(L) {
    let top = 1.5 + 0.5 * this.headScale(L);
    const hs = this.headScale(L);
    if (L.sunHat) top += 0.22 * hs;
    else if (L.cap) top += 0.1 * hs;
    else if (L.hair === 'curly' || L.hair === 'bun') top += 0.2 * hs;
    else if (L.hair && L.hair !== 'fringe') top += 0.07 * hs;
    return top * this.scale(L);
  },
  // Height of the shoulder joint, and how far the hand is from it.
  shoulderY(L) { return 1.375 * this.scale(L); },
  armReach(L) { return 0.6 * this.scale(L); },

  // ── Small pixel textures ────────────────────────────
  // The face, 8x8, painted on the front of the head. Row 0 is the top.
  _faceMat(L, expr) {
    const key = 'face:' + L.skinIdx + ':' + expr + ':' + (L.glasses || '');
    return G3.texMat(G3.pixelTex(key, 8, 8, g => {
      const s = L.skinPal, p = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w || 1, h || 1); };
      p(s.k, 0, 0, 8, 8);
      p(s.K, 0, 7, 8, 1);                                   // shade under the chin
      p(PX.mix(s.k, PAL.pi3, 0.28), 0, 4); p(PX.mix(s.k, PAL.pi3, 0.28), 7, 4);   // cheeks
      if (expr === 'blink') {
        p(s.K, 1, 3, 2, 1); p(s.K, 5, 3, 2, 1);
      } else {
        const top = expr === 'flat' ? 3 : 2, h = expr === 'flat' ? 1 : 2;
        if (expr === 'flat') { p(s.K, 1, 2, 2, 1); p(s.K, 5, 2, 2, 1); }   // heavy eyelids
        p(s.w, 1, top, 1, h); p(s.e, 2, top, 1, h);
        p(s.e, 5, top, 1, h); p(s.w, 6, top, 1, h);
      }
      if (expr === 'open') p(s.M, 3, 5, 2, 2);
      else if (expr === 'flat') p(s.m, 3, 6, 2, 1);
      else { p(s.m, 2, 5); p(s.m, 5, 5); p(s.m, 3, 6, 2, 1); }
      if (L.glasses) {
        const c = L.glasses;
        p(c, 1, 1, 2, 1); p(c, 5, 1, 2, 1); p(c, 1, 4, 2, 1); p(c, 5, 4, 2, 1);
        p(c, 0, 2, 1, 2); p(c, 3, 2, 1, 2); p(c, 4, 2, 1, 2); p(c, 7, 2, 1, 2);
      }
    }));
  },
  // The top of a bald head: skin with a shine on it.
  _baldMat(L) {
    return G3.texMat(G3.pixelTex('bald:' + L.skinIdx, 8, 8, g => {
      g.fillStyle = L.skinPal.k; g.fillRect(0, 0, 8, 8);
      g.fillStyle = L.shinePal.i; g.fillRect(2, 4, 2, 1); g.fillRect(1, 5, 1, 2);
    }));
  },
  // The four sides of an arm, 4x12: sleeve from the shoulder down, then skin.
  _armMats(L) {
    const top = L.top, skin = L.skinPal.k, long = L.sleeves !== 'short';
    const side = G3.texMat(G3.pixelTex('arm:' + top.m + skin + long, 4, 12, g => {
      const n = long ? 10 : 5;
      g.fillStyle = skin; g.fillRect(0, 0, 4, 12);
      g.fillStyle = top.m; g.fillRect(0, 0, 4, n);
      g.fillStyle = top.d; g.fillRect(0, n - 1, 4, 1);          // the cuff
    }));
    return [side, side, G3.mat(top.m), G3.mat(skin), side, side];
  },
  // The four sides of a leg, 4x12: trousers (or shorts and skin, or tights),
  // with a shoe at the bottom.
  _legMats(L) {
    const b = L.bottom, skin = L.skinPal, shoes = L.shoes;
    let upper = b, lower = b, split = 10;
    if (L.legs === 'skin') { lower = { m: skin.k, d: skin.K }; split = 5; }
    else if (L.legs) { lower = L.legs; split = 5; }
    if (L.kind === 'skirt' || L.kind === 'gardener') { upper = lower; }
    const side = G3.texMat(G3.pixelTex('leg:' + upper.m + lower.m + split + shoes, 4, 12, g => {
      g.fillStyle = lower.m; g.fillRect(0, 0, 4, 10);
      g.fillStyle = lower.d || lower.m; g.fillRect(3, 0, 1, 10);
      g.fillStyle = upper.m; g.fillRect(0, 0, 4, split);
      g.fillStyle = upper.d || upper.m; g.fillRect(3, 0, 1, split);
      if (upper !== lower) g.fillRect(0, split - 1, 4, 1);      // the hem of the shorts
      g.fillStyle = shoes; g.fillRect(0, 10, 4, 2);
    }));
    return [side, side, G3.mat(upper.m), G3.mat(shoes), side, side];
  },
  // The torso: 8x12 front and back, 4x12 sides.
  _torsoMats(L) {
    const t = L.top, kind = L.kind, skin = L.skinPal.k;
    const belt = kind === 'adult' ? L.belt : null;
    const key = 'torso:' + [kind, t.m, L.collar, L.tie, belt, L.stripe, skin, L.pack ? L.pack.d : ''].join(':');
    const paint = (face) => (g, w) => {
      const p = (c, x, y, pw, ph) => { g.fillStyle = c; g.fillRect(x, y, pw || 1, ph || 1); };
      p(t.m, 0, 0, w, 12);
      p(t.d, 0, 11, w, 1);
      if (L.stripe) p(L.stripe, 0, 4, w, 2);
      if (belt) p(belt, 0, 11, w, 1);
      if (kind === 'gardener') {
        // little flowers printed on her dress
        const dots = face === 'side' ? [[1, 3, PAL.ye2], [2, 8, PAL.pu2]]
          : [[5, 2, PAL.ye2], [2, 5, PAL.pu2], [6, 8, PAL.re2], [1, 9, PAL.white]];
        for (const [x, y, c] of dots) p(c, x, y);
      }
      if (face !== 'front') return;
      if (kind === 'adult') {
        p(L.collar || t.l, 2, 0, 4, 1);
        if (L.tie) { p(L.tie, 3, 0, 2, 8); p(PX.mix(L.tie, PAL.ink, 0.3), 3, 1, 2, 1); }
        else { p(skin, 3, 0, 2, 1); p(t.d, 4, 2, 1, 1); p(t.d, 4, 5, 1, 1); p(t.d, 4, 8, 1, 1); }   // open neck, buttons
        if (belt) p(PAL.ye2, 3, 11, 2, 1);                      // buckle
      } else if (kind === 'skirt') {
        // a blouse showing in the V of the jacket, and maybe a necklace
        const c = L.collar || PAL.white;
        p(c, 2, 0, 4, 2); p(c, 3, 2, 2, 2);
        p(skin, 3, 0, 2, 1);
        p(t.d, 1, 0, 1, 2); p(t.d, 6, 0, 1, 2); p(t.d, 2, 2, 1, 2); p(t.d, 5, 2, 1, 2);
        if (L.tie) p(L.tie, 3, 1, 2, 1);
        p(t.d, 4, 6); p(t.d, 4, 8);
      } else {
        p(skin, 3, 0, 2, 1);                                     // neckline
      }
      if (L.pack) { p(L.pack.d, 1, 0, 1, 8); p(L.pack.d, 6, 0, 1, 8); }   // backpack straps
    };
    const front = G3.texMat(G3.pixelTex(key + ':f', 8, 12, paint('front')));
    const back = G3.texMat(G3.pixelTex(key + ':b', 8, 12, paint('back')));
    const side = G3.texMat(G3.pixelTex(key + ':s', 4, 12, paint('side')));
    return [side, side, G3.mat(t.m), G3.mat(L.bottom.m), front, back];
  },
  // The Gardener's skirt: pale pink with flowers printed on it.
  _dressMat() {
    return G3.texMat(G3.pixelTex('dress', 12, 6, g => {
      g.fillStyle = PAL.pi1; g.fillRect(0, 0, 12, 6);
      g.fillStyle = PAL.pi2; g.fillRect(0, 5, 12, 1);
      const dots = [[1, 1, PAL.re2], [4, 3, PAL.ye2], [7, 1, PAL.pu2], [10, 3, PAL.re2], [2, 4, PAL.pu2], [8, 4, PAL.ye2], [5, 0, PAL.pi3]];
      for (const [x, y, c] of dots) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
    }));
  },
  // The front of a beard: a grin showing through it.
  _beardMats(col) {
    const front = G3.texMat(G3.pixelTex('beard:' + col, 8, 3, g => {
      g.fillStyle = col; g.fillRect(0, 0, 8, 3);
      g.fillStyle = PAL.white; g.fillRect(3, 0, 2, 1);
    }));
    const m = G3.mat(col);
    return [m, m, m, m, front, m];
  },

  // ── Shapes made of several boxes, baked into one mesh ──
  // boxes: [{ x0, x1, y0, y1, z0, z1, c }]. Returns a BufferGeometry with a
  // colour on every corner.
  _FACES: [
    [[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
    [[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]],
    [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
    [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
  ],
  _bake(boxes) {
    const n = boxes.length;
    const pos = new Float32Array(n * 72), nor = new Float32Array(n * 72), col = new Float32Array(n * 72);
    const idx = new Uint16Array(n * 36);
    const c = new THREE.Color();
    let p = 0, ii = 0, vi = 0;
    for (const b of boxes) {
      c.set(b.c || '#ffffff');
      for (const [nm, corners] of this._FACES) {
        for (const [sx, sy, sz] of corners) {
          pos[p] = sx > 0 ? b.x1 : b.x0; pos[p + 1] = sy > 0 ? b.y1 : b.y0; pos[p + 2] = sz > 0 ? b.z1 : b.z0;
          nor[p] = nm[0]; nor[p + 1] = nm[1]; nor[p + 2] = nm[2];
          col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
          p += 3;
        }
        idx[ii++] = vi; idx[ii++] = vi + 1; idx[ii++] = vi + 2; idx[ii++] = vi; idx[ii++] = vi + 2; idx[ii++] = vi + 3;
        vi += 4;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
  },
  // A mesh of a baked shape. With a key the geometry is made once (by
  // boxes()) and shared by everyone; without one it belongs to the mesh.
  // With a material the box colours are shades of grey that tint it (hair,
  // caps); without one they are the real colours.
  _shape(key, boxes, mat) {
    let geo = key && this._geos[key];
    if (!geo) {
      geo = this._bake(boxes());
      if (key) this._geos[key] = geo; else geo.userData.own = true;
    }
    const m = new THREE.Mesh(geo, mat || G3.mat('#ffffff', { vertexColors: true }));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  },
  _tint(color) { return G3.mat(color, { vertexColors: true }); },

  // The block haircuts. Coordinates are in the head's own space: x and z
  // from -0.25 to 0.25, y from 0 (chin) to 0.5 (crown). `under` is set when
  // a cap or hat covers the top: only the hair below it is kept.
  _hairBoxes(style, under) {
    const E = 1 / 32, H = 0.25 + E, lite = '#ffffff', dark = '#d4d4d4';
    const out = [];
    const B = (x0, x1, y0, y1, z0, z1, c) => out.push({ x0, x1, y0, y1, z0, z1, c: c || lite });
    const both = (x0, x1, y0, y1, z0, z1, c) => { B(x0, x1, y0, y1, z0, z1, c); B(-x1, -x0, y0, y1, z0, z1, c); };
    const cropped = (topY, backY, sideY) => {            // the usual short back and sides
      B(-H, H, topY, 0.5625, -H, H);
      B(-H, H, backY, topY, -H, -0.19, dark);
      both(-H, -0.22, sideY, topY, -0.19, 0.06, dark);
    };
    switch (style) {
      case 'buzz':
        B(-H, H, 0.4375, 0.5 + E, -H, H);
        B(-H, H, 0.19, 0.4375, -H, -0.2, dark);
        both(-H, -0.23, 0.31, 0.4375, -0.2, 0, dark);
        break;
      case 'neat':                                         // side parting, forehead clear
        cropped(0.4375, 0.125, 0.25);
        B(-H, -0.03, 0.5625, 0.61, -H + 0.03, H);
        break;
      case 'swoop':                                        // a quiff standing up at the front
        cropped(0.375, 0.125, 0.25);
        B(-H, 0.12, 0.375, 0.65, 0.1, H + 0.08);
        break;
      case 'curly': {
        const G = 0.34;
        B(-G, G, 0.375, 0.66, -G, G - 0.03);
        B(-G, G, 0.06, 0.375, -G, -0.16, dark);
        both(-G, -0.22, 0.19, 0.375, -0.16, 0.16, dark);
        B(-0.22, -0.03, 0.66, 0.73, -0.2, 0.02);
        B(0.03, 0.24, 0.66, 0.73, -0.08, 0.18);
        both(-G - 0.05, -G, 0.3, 0.52, -0.14, 0.1);
        break;
      }
      case 'bob':                                          // chin length, framing the face
        B(-H, H, 0.375, 0.5625, -H, H);
        B(-H, H, 0, 0.375, -H - 0.02, -0.19, dark);
        both(-H - 0.03, -0.22, 0, 0.375, -0.19, 0.17, dark);
        break;
      case 'long':                                         // down the back to the shoulders
        B(-H, H, 0.375, 0.5625, -H, H);
        B(-H, H, -0.32, 0.375, -H - 0.03, -0.17, dark);
        both(-H - 0.02, -0.22, 0.03, 0.375, -0.19, 0.1, dark);
        break;
      case 'pony':
        cropped(0.375, 0.125, 0.25);
        B(-0.07, 0.07, 0.33, 0.47, -H - 0.09, -H);
        B(-0.08, 0.08, -0.02, 0.42, -H - 0.24, -H - 0.09, dark);
        break;
      case 'bun':
        cropped(0.375, 0.125, 0.25);
        B(-0.15, 0.15, 0.5625, 0.76, -0.27, 0.03);
        break;
      case 'fringe':                                       // bald on top, hair round the back and sides
        B(-H, H, 0.09, 0.31, -H, -0.19);
        both(-H, -0.22, 0.12, 0.31, -0.19, 0.06);
        break;
      default:                                             // 'short'
        cropped(0.375, 0.125, 0.25);
    }
    if (!under) return out;
    return out.filter(b => b.y0 < under - 0.01).map(b => Object.assign(b, { y1: Math.min(b.y1, under) }));
  },
  _capBoxes() {
    const C = 0.25 + 0.045, lite = '#ffffff', dark = '#cfcfcf';
    return [
      { x0: -C, x1: C, y0: 0.36, y1: 0.6, z0: -C, z1: C, c: lite },
      { x0: -0.22, x1: 0.22, y0: 0.36, y1: 0.42, z0: C, z1: C + 0.2, c: dark },        // the brim
      { x0: -0.04, x1: 0.04, y0: 0.6, y1: 0.63, z0: -0.04, z1: 0.04, c: dark },        // button on top
    ];
  },
  // The Gardener's straw sun hat: a wide brim, a crown, a pink band and a flower.
  _sunHatBoxes() {
    return [
      { x0: -0.5, x1: 0.5, y0: 0.4, y1: 0.46, z0: -0.5, z1: 0.5, c: PAL.ta1 },
      { x0: -0.44, x1: 0.44, y0: 0.385, y1: 0.4, z0: -0.44, z1: 0.44, c: PAL.ta3 },    // shade under the brim
      { x0: -0.3, x1: 0.3, y0: 0.46, y1: 0.7, z0: -0.3, z1: 0.3, c: PAL.ta1 },
      { x0: -0.25, x1: 0.25, y0: 0.7, y1: 0.73, z0: -0.25, z1: 0.25, c: PAL.ta2 },
      { x0: -0.315, x1: 0.315, y0: 0.46, y1: 0.55, z0: -0.315, z1: 0.315, c: PAL.pi3 },
      { x0: 0.06, x1: 0.22, y0: 0.44, y1: 0.6, z0: 0.315, z1: 0.36, c: PAL.ye2 },
      { x0: 0.11, x1: 0.17, y0: 0.49, y1: 0.55, z0: 0.36, z1: 0.38, c: PAL.white },
    ];
  },

  // ── Building a person ───────────────────────────────
  // Returns a THREE.Group standing on y = 0 and facing +z, for a look made
  // by PEOPLE.look(). The parts that move are kept in group.userData.
  build(L) {
    const s = this.scale(L), hs = this.headScale(L);
    const root = new THREE.Group();
    const fig = new THREE.Group();           // the whole figure, scaled for students
    fig.scale.setScalar(s);
    const rig = new THREE.Group();           // dips with each step
    const upper = new THREE.Group();         // everything above the hips: bends forward
    upper.position.y = 0.75;
    root.add(fig); fig.add(rig); rig.add(upper);

    // legs, swinging from the hips
    const legMats = this._legMats(L);
    const legL = G3.limb(0.25, 0.75, 0.25, legMats), legR = G3.limb(0.25, 0.75, 0.25, legMats);
    legL.position.set(0.125, 0.75, 0);
    legR.position.set(-0.125, 0.75, 0);
    rig.add(legL, legR);

    // a skirt round the hips: two stepped boxes
    if (L.kind === 'skirt') {
      const m = G3.mat(L.bottom.m), hem = G3.mat(L.bottom.d);
      rig.add(G3.box(0.54, 0.24, 0.3, m, 0, 0.64, 0));
      rig.add(G3.box(0.62, 0.2, 0.38, [m, m, m, hem, m, m], 0, 0.44, 0));
    } else if (L.kind === 'gardener') {
      const d = this._dressMat(), m = G3.mat(PAL.pi1), hem = G3.mat(PAL.pi2);
      rig.add(G3.box(0.56, 0.2, 0.32, [d, d, m, hem, d, d], 0, 0.66, 0));
      rig.add(G3.box(0.7, 0.3, 0.48, [d, d, m, hem, d, d], 0, 0.42, 0));
    }

    // torso
    upper.add(G3.box(0.5, 0.75, 0.25, this._torsoMats(L), 0, 0.375, 0));

    // arms, swinging from the shoulders (the pivot is a little below the top)
    const armMats = this._armMats(L);
    const mkArm = (x) => {
      const g = new THREE.Group();
      g.position.set(x, 0.625, 0);
      g.add(G3.box(0.25, 0.75, 0.25, armMats, 0, -0.25, 0));
      const hand = new THREE.Group();        // the end of the arm: turns with it
      hand.position.y = -0.56;
      const grip = new THREE.Group();        // the same point, kept upright
      hand.add(grip);
      g.add(hand);
      g.userData.hand = hand; g.userData.grip = grip;
      upper.add(g);
      return g;
    };
    const armL = mkArm(0.375), armR = mkArm(-0.375);

    // head, with the face on the front
    const head = new THREE.Group();
    head.position.y = 0.75;
    head.scale.setScalar(hs);
    const skin = G3.mat(L.skinPal.k);
    const bald = !L.hair || L.hair === 'fringe';
    const headMats = [skin, skin, bald && !L.cap && !L.sunHat ? this._baldMat(L) : skin, skin, this._faceMat(L, 'smile'), skin];
    const skull = G3.box(0.5, 0.5, 0.5, headMats, 0, 0.25, 0);
    head.add(skull);
    const under = L.sunHat ? 0.4 : L.cap ? 0.36 : 0;
    if (L.hair) {
      const boxes = () => this._hairBoxes(L.hair, under);
      if (boxes().length) head.add(this._shape('hair:' + L.hair + ':' + under, boxes, this._tint(L.hairPal.h)));
    }
    if (L.beardCol) head.add(G3.box(0.5625, 0.1875, 0.36, this._beardMats(L.beardCol), 0, 0.085, 0.105));
    if (L.cap) head.add(this._shape('cap', () => this._capBoxes(), this._tint(L.cap.m)));
    if (L.sunHat) head.add(this._shape('sunhat', () => this._sunHatBoxes()));
    upper.add(head);

    // backpack: a box on the back with a pocket (the straps are painted on the shirt)
    if (L.pack) {
      upper.add(G3.box(0.44, 0.5, 0.2, G3.mat(L.pack.m), 0, 0.44, -0.225));
      upper.add(G3.box(0.3, 0.2, 0.06, G3.mat(L.pack.d), 0, 0.33, -0.355));
    }

    const narrow = L.kind === 'skirt' || L.kind === 'gardener';
    root.userData = {
      look: L, s, fig, rig, upper, head, skull, legL, legR, armL, armR,
      legAmp: narrow ? 0.42 : 0.75, armAmp: 0.6,
      face: 'smile', side: 'R', px: undefined, pz: undefined,
      cur: { legL: 0, legR: 0, aLx: 0, aLz: 0, aRx: 0, aRz: 0, lean: 0, look: 0, nod: 0 },
    };
    return root;
  },

  // The retained model for a character (anything with a `look`), built the
  // first time facing `yaw`.
  model(owner, yaw) {
    return G3.model(owner, () => {
      const m = this.build(owner.look);
      m.rotation.y = yaw || 0;
      return m;
    });
  },

  // ── Moving and turning ──────────────────────────────
  // Puts the model on the lawn at (wx, wy). If it has moved since the last
  // frame it turns to face the way it is going and this returns true (use
  // it to decide whether the legs walk). Otherwise it turns toward o.yaw,
  // if given. o.force = true always turns toward o.yaw; o.y lifts it.
  move(m, wx, wy, o) {
    o = o || {};
    const u = m.userData;
    const x = (wx - 0.5) * G3.GW, z = wy * G3.GD;
    let moving = false;
    if (u.px !== undefined) {
      const dx = x - u.px, dz = z - u.pz, d = Math.hypot(dx, dz);
      if (d > 0.004 && d < 3) {
        moving = true;
        if (!o.force) G3.face(m, dx, dz, 0.25);
      }
    }
    if (o.yaw !== undefined && (o.force || !moving)) this.turn(m, o.yaw, o.rate || 0.14);
    u.px = x; u.pz = z;
    m.position.set(x, o.y || 0, z);
    return moving;
  },
  // Eases the model round to a yaw, the short way.
  turn(m, yaw, rate) {
    let d = yaw - m.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    m.rotation.y += d * (rate === undefined ? 0.14 : rate);
  },
  // The yaw that points the given arm ('R' or 'L') of someone standing at
  // (px, pz) straight at (tx, tz): a little off facing it squarely, since
  // the arm is out at the shoulder. All in blocks.
  aimYaw(px, pz, tx, tz, side, L) {
    const dx = tx - px, dz = tz - pz, d = Math.max(0.01, Math.hypot(dx, dz));
    const armX = (side === 'L' ? 0.375 : -0.375) * this.scale(L);
    return Math.atan2(dx, dz) + Math.asin(Math.max(-0.9, Math.min(0.9, -armX / d)));
  },
  // The yaw that faces a point.
  yawTo(px, pz, tx, tz) { return Math.atan2(tx - px, tz - pz); },
  // Which arm is on the viewer's side, from the way the model is turned
  // (it keeps its last answer while the model faces straight at us or away).
  nearSide(m) {
    const u = m.userData, sn = Math.sin(m.rotation.y);
    if (sn > 0.3) u.side = 'R'; else if (sn < -0.3) u.side = 'L';
    return u.side;
  },

  // ── Posing ──────────────────────────────────────────
  // Arm poses: the angle the arm is raised forward from hanging down, and
  // how far it is lifted out to the side.
  //   walk   swings with the legs          down   hangs
  //   hang   carrying something low        hold   hand out in front at chest height
  //   carry  hand low and out in front     pour   tipping the watering can
  //   lift   lifted to shoulder height     reach  straight out (petting, taking a bloom)
  //   up     reaching above the shoulder   pick   down to the ground, bent over
  //   wave   up and waving                 talk   gesturing while speaking
  //   umbrella  holding a post upright
  // or a number: radians forward from hanging down (0 .. about 2.6).
  _armPose(name, side, swing, t) {
    const out = side === 'R' ? -1 : 1;
    if (typeof name === 'number') return [-name, 0];
    switch (name) {
      case 'walk': return [swing, 0];
      case 'hang': return [-0.28 + swing * 0.3, 0];
      case 'hold': return [-1.15, 0];
      case 'carry': return [-0.85 + swing * 0.12, 0];
      case 'pour': return [-0.95, 0];
      case 'lift': return [-1.6, 0];
      case 'reach': return [-1.5, 0];
      case 'up': return [-2.35, 0];
      case 'pick': return [-1.5, 0];
      case 'umbrella': return [-0.6, 0];
      case 'wave': return [0, out * (2.55 + 0.32 * Math.sin(t * 0.32))];
      case 'talk': return [-1.0 + 0.3 * Math.sin(t * 0.13), out * 0.2];
      default: return [0, 0];
    }
  },

  // Poses a model. Every field is optional:
  //   walk    walk phase in radians (one cycle = two steps), or null to stand
  //   arm     pose of the acting arm (see above); default 'walk'
  //   side    which arm acts: 'R' (default) or 'L'
  //   arm2    pose of the other arm; default 'walk'
  //   face    'smile' | 'blink' | 'open' | 'flat'
  //   crouch  true to bend right over with a hand to the ground (picking)
  //   lean    radians the body leans forward (running)
  //   look    radians the head turns (positive = to the person's left)
  //   nod     radians the head tips forward
  //   t       time for waving and gesturing (default: the frame count)
  //   snap    true to jump straight to the pose (card pictures)
  pose(m, o) {
    o = o || {};
    const u = m.userData, c = u.cur;
    const t = o.t === undefined ? G3.frame : o.t;
    const walking = o.walk !== null && o.walk !== undefined;
    const sw = walking ? Math.sin(o.walk) : 0;
    const k = o.snap ? 1 : 0.28, kLeg = o.snap ? 1 : (walking ? 0.6 : 0.25);
    const side = o.side === 'L' ? 'L' : 'R', other = side === 'L' ? 'R' : 'L';

    // legs: opposite each other; for a crouch one foot is set back a little
    let tR = -sw * u.legAmp, tL = sw * u.legAmp;
    if (o.crouch) { tR = side === 'R' ? 0.3 : -0.3; tL = -tR; }
    c.legR += (tR - c.legR) * kLeg;
    c.legL += (tL - c.legL) * kLeg;
    u.legR.rotation.x = c.legR;
    u.legL.rotation.x = c.legL;
    // the body drops as the legs spread, so the feet stay on the ground
    const a = Math.min(Math.abs(c.legR), Math.abs(c.legL));
    u.rig.position.y = -Math.max(0, 0.75 - 0.75 * Math.cos(a) - 0.125 * Math.sin(a));

    // body lean and head
    const lean = o.lean !== undefined ? o.lean : (o.crouch ? 1.3 : 0);
    c.lean += (lean - c.lean) * k;
    u.upper.rotation.x = c.lean;
    c.look += ((o.look || 0) - c.look) * k;
    c.nod += ((o.nod || 0) - c.nod) * k;
    u.head.rotation.y = c.look;
    u.head.rotation.x = c.nod - c.lean * 0.6;

    // arms: each swings opposite to the leg on its own side
    const pA = this._armPose(o.arm === undefined ? 'walk' : o.arm, side, (side === 'R' ? 1 : -1) * sw * u.armAmp, t);
    const pB = this._armPose(o.arm2 === undefined ? 'walk' : o.arm2, other, (other === 'R' ? 1 : -1) * sw * u.armAmp, t);
    const pR = side === 'R' ? pA : pB, pL = side === 'R' ? pB : pA;
    c.aRx += (pR[0] - c.aRx) * k; c.aRz += (pR[1] - c.aRz) * k;
    c.aLx += (pL[0] - c.aLx) * k; c.aLz += (pL[1] - c.aLz) * k;
    u.armR.rotation.set(c.aRx, 0, c.aRz);
    u.armL.rotation.set(c.aLx, 0, c.aLz);
    // whatever is held in a grip stays upright
    u.armR.userData.grip.rotation.x = -(c.aRx + c.lean);
    u.armL.userData.grip.rotation.x = -(c.aLx + c.lean);

    const face = o.face || 'smile';
    if (face !== u.face) {
      u.face = face;
      u.skull.material[4] = this._faceMat(u.look, face);
    }
    return m;
  },

  // The attach point at the end of an arm ('R' or 'L'). Things added to it
  // stay upright however the arm swings; pass upright = false for the
  // point that turns with the arm instead. Sizes are in the figure's own
  // scale: divide by model.userData.s for real blocks on a student.
  hand(m, side, upright) {
    const arm = side === 'L' ? m.userData.armL : m.userData.armR;
    return upright === false ? arm.userData.hand : arm.userData.grip;
  },
  // Puts a prop in a hand (moving it from the other hand if need be).
  hold(m, prop, side, upright) {
    const h = this.hand(m, side, upright);
    if (prop.parent !== h) h.add(prop);
    return prop;
  },
  // World position of a point on a posed model (a hand, a spout).
  worldPos(m, obj, out) {
    m.updateMatrixWorld(true);
    return obj.getWorldPosition(out || new THREE.Vector3());
  },

  // ── Flowers people reach for ────────────────────────
  // Scene positions of a flower's bloom and foot, whether or not the
  // flower module provides head3() / foot3() yet.
  head3(f, i, out) {
    if (typeof f.head3 === 'function') return f.head3(i || 0, out);
    return G3.pos(f.wx, f.wy, 2.5, out);
  },
  foot3(f, out) {
    if (typeof f.foot3 === 'function') return f.foot3(out);
    return G3.pos(f.wx, f.wy, 0, out);
  },
  // Roughly how far a bloom reaches from its middle, in blocks.
  bloomR(f, i) {
    if (typeof f.head3 !== 'function') return 0.8;
    const hp = f.headPos(i || 0);
    if (!hp || !hp.r) return 0.3;
    this._v = this._v || new THREE.Vector3();
    return Math.max(0.15, Math.min(1.4, hp.r / G3.artScaleAt(f.head3(i || 0, this._v))));
  },

  // ── Things people carry ─────────────────────────────
  // Each has its origin where the hand holds it and faces +z like its owner.

  // A picked flower about 0.6 blocks tall, origin at the bottom of the stem.
  tinyFlower(hsl) {
    if (typeof makeTinyFlower3 === 'function') return makeTinyFlower3(hsl);
    const col = hsl ? PX.hsl(hsl[0], hsl[1], hsl[2]) : PAL.pi2;
    const b = (x, y, z, w, h, d, c) => ({ x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2, z0: z - d / 2, z1: z + d / 2, c });
    return this._shape(null, () => [
      b(0, 0.2, 0, 0.06, 0.4, 0.06, PAL.gr4),
      b(0.08, 0.2, 0, 0.12, 0.06, 0.04, PAL.gr3),
      b(0, 0.48, 0, 0.38, 0.14, 0.06, col),
      b(0, 0.48, 0, 0.14, 0.38, 0.06, col),
      b(0, 0.48, 0, 0.25, 0.25, 0.07, PX.mix(col, PAL.white, 0.25)),
      b(0, 0.48, 0.01, 0.12, 0.12, 0.09, PAL.ye2),
    ]);
  },

  // The Gardener's watering can, held by the handle over its top. The end
  // of the spout is can.userData.spout. Tip it with can.rotation.x.
  wateringCan() {
    const X = (x0, x1, y0, y1, z0, z1, c) => ({ x0, x1, y0, y1, z0, z1, c });
    const can = this._shape('can', () => [
      X(-0.16, 0.16, -0.5, -0.16, -0.2, 0.2, PAL.wa3),          // body
      X(-0.17, 0.17, -0.2, -0.14, -0.21, 0.21, PAL.wa2),        // rim
      X(-0.17, 0.17, -0.5, -0.45, -0.21, 0.21, PAL.sl3),        // base
      X(-0.04, 0.04, -0.14, 0.03, -0.17, -0.11, PAL.sl3),       // handle posts
      X(-0.04, 0.04, -0.14, 0.03, 0.11, 0.17, PAL.sl3),
      X(-0.04, 0.04, -0.03, 0.03, -0.17, 0.17, PAL.sl3),        // handle bar
      X(-0.05, 0.05, -0.44, -0.34, 0.2, 0.34, PAL.wa3),         // spout, stepping up
      X(-0.05, 0.05, -0.38, -0.28, 0.34, 0.46, PAL.wa3),
      X(-0.05, 0.05, -0.32, -0.22, 0.46, 0.56, PAL.wa3),
      X(-0.1, 0.1, -0.36, -0.18, 0.56, 0.62, PAL.wa1),          // the rose
    ]);
    const spout = new THREE.Group();
    spout.position.set(0, -0.27, 0.64);
    can.add(spout);
    can.userData.spout = spout;
    return can;
  },

  // The Gardener's rainbow umbrella: a stepped canopy of flat slabs in
  // seven colour bands on a post. The origin is the handle.
  umbrella() {
    const g = new THREE.Group();
    const bands = [PAL.re2, PAL.or2, PAL.ye2, PAL.gr2, PAL.bl2, PAL.pu2, PAL.pi2];
    const base = 1.42;
    g.add(this._shape('umbrella', () => {
      const out = [], c = 2.1 / 7;
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
        const ax = Math.abs(i - 3), az = Math.abs(j - 3);
        if (ax + az >= 5) continue;                              // knock the corners off
        const ring = Math.max(ax, az), y = base + (3 - ring) * 0.11;
        out.push({ x0: (i - 3.5) * c, x1: (i - 2.5) * c, y0: y, y1: y + 0.12, z0: (j - 3.5) * c, z1: (j - 2.5) * c, c: bands[i] });
      }
      out.push({ x0: -0.05, x1: 0.05, y0: base + 0.45, y1: base + 0.55, z0: -0.05, z1: 0.05, c: PAL.g5 });   // the tip
      return out;
    }));
    g.add(G3.box(0.06, base + 0.5, 0.06, PAL.g5, 0, (base + 0.3) / 2 - 0.1, 0));
    g.add(G3.box(0.06, 0.06, 0.14, PAL.g5, 0, -0.32, 0.04));     // the crook of the handle
    return g;
  },

  // A teacher's tote bag, hanging from its handles.
  toteBag() {
    const X = (x0, x1, y0, y1, z0, z1, c) => ({ x0, x1, y0, y1, z0, z1, c });
    return this._shape('tote', () => [
      X(-0.07, 0.07, -0.56, -0.2, -0.21, 0.21, PAL.wo1),
      X(-0.075, 0.075, -0.56, -0.5, -0.215, 0.215, PAL.wo2),
      X(-0.08, 0.08, -0.42, -0.3, -0.1, 0.1, PAL.ta1),          // a pocket on each side
      X(-0.05, 0.05, -0.2, 0.02, -0.14, -0.1, PAL.wo2),         // handles
      X(-0.05, 0.05, -0.2, 0.02, 0.1, 0.14, PAL.wo2),
      X(-0.05, 0.05, -0.02, 0.02, -0.14, 0.14, PAL.wo2),
    ]);
  },
  // A cup of coffee with a lid, held round its middle.
  coffeeCup() {
    const X = (x0, x1, y0, y1, z0, z1, c) => ({ x0, x1, y0, y1, z0, z1, c });
    return this._shape('cup', () => [
      X(-0.08, 0.08, -0.04, 0.2, 0.0, 0.16, PAL.white),
      X(-0.085, 0.085, 0.02, 0.11, -0.005, 0.165, PAL.wo2),     // the sleeve
      X(-0.09, 0.09, 0.2, 0.25, -0.01, 0.17, PAL.g3),           // the lid
    ]);
  },

  // A pool of little cubes for droplets and other specks: call
  // PEOPLE3.specks(owner, color, size, n) every frame, then place and show
  // the ones in use (group.children[i]).
  specks(owner, color, size, n) {
    return G3.model(owner, () => {
      const g = new THREE.Group();
      for (let i = 0; i < n; i++) {
        const c = G3.box(size, size, size, color, 0, -5, 0);
        c.visible = false;
        g.add(c);
      }
      return g;
    });
  },
};
