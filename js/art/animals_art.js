// ================================================================
// File: animals_art.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Last Modified: November 23, 2026
// Description: ANIMALS3 — the box models for the animals of the 3D block
//   garden: the ram, goose, cat, rabbit, groundhog, butterfly, bee and
//   bird, plus their little extras (droppings, hearts, "z"s).
//
//   Each builder returns a THREE.Group standing on y = 0 and facing +z,
//   with the parts that move kept in group.userData. The classes in
//   js/characters/ and js/creatures.js pose them from their game state.
//   Every animal is our own design, made only of boxes with tiny painted
//   pixel faces (see docs/GARDEN_3D.md).
//
//   Nothing here runs at load time (no p5.js, THREE or G3 calls), so the
//   file can be loaded on its own.
// ================================================================

const ANIMALS3 = (() => {
  const A = {};
  let scratch = null;                       // one shared vector, made on first use
  const vec = () => scratch || (scratch = new THREE.Vector3());

  // ── Small helpers ───────────────────────────────────
  // A cached pixel texture typed out as rows of letters; pal maps a letter
  // to a colour. flip mirrors it left to right (for the far side of a head).
  const tex = (key, rows, pal, flip) =>
    G3.pixelTex('animal:' + key + (flip ? ':flip' : ''), rows[0].length, rows.length, g => {
      const w = rows[0].length;
      for (let y = 0; y < rows.length; y++) for (let x = 0; x < w; x++) {
        g.fillStyle = pal[rows[y][flip ? w - 1 - x : x]];
        g.fillRect(x, y, 1, 1);
      }
    });
  const tm = (key, rows, pal, flip) => G3.texMat(tex(key, rows, pal, flip));
  // A new empty group at (x, y, z) inside parent: a pivot to hang parts from.
  const grp = (parent, x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  // A box added to parent.
  const part = (parent, w, h, d, mat, x, y, z) => {
    const b = G3.box(w, h, d, mat, x, y, z);
    parent.add(b);
    return b;
  };
  // Many small coloured boxes as one mesh (G3.merged), making sure every
  // triangle is wound to face the way its normal points, so that no face
  // of a box is culled from the outside.
  const merged = boxes => {
    const m = G3.merged(boxes);
    const pos = m.geometry.attributes.position.array, nor = m.geometry.attributes.normal.array;
    const idx = m.geometry.index.array;
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const facing = (uy * vz - uz * vy) * nor[a] + (uz * vx - ux * vz) * nor[a + 1] + (ux * vy - uy * vx) * nor[a + 2];
      if (facing < 0) { idx[t + 1] = c / 3; idx[t + 2] = b / 3; }
    }
    return m;
  };
  // A flat picture made of little cubes, one mesh: rows of letters, each
  // cube `s` blocks across, centred on the origin and facing +z.
  const pixels = (rows, pal, s) => {
    const boxes = [], w = rows[0].length, h = rows.length;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.') continue;
        let run = 1;
        while (x + run < w && rows[y][x + run] === ch) run++;
        boxes.push({ x: (x + run / 2 - w / 2) * s, y: (h / 2 - y - 0.5) * s, z: 0, w: run * s, h: s, d: s, c: pal[ch] });
        x += run - 1;
      }
    }
    const m = merged(boxes);
    m.castShadow = false;
    return m;
  };

  // ── Shared behaviour ────────────────────────────────
  // Turns a model to face the way its owner really moved since the last
  // frame. Standing still, it settles to `rest` (an angle, see G3.YAW).
  A.turn = (m, wx, wy, rest, rate) => {
    const u = m.userData;
    if (u.lastWx === undefined) m.rotation.y = rest;
    else {
      const dx = (wx - u.lastWx) * G3.GW, dz = (wy - u.lastWy) * G3.GD;
      if (dx * dx + dz * dz > 2e-4) G3.face(m, dx, dz, rate);
      else G3.face(m, Math.sin(rest), Math.cos(rest), rate * 0.4);
    }
    u.lastWx = wx; u.lastWy = wy;
  };
  // The angle an animal stands at when it is facing left or right: side
  // on, turned a little toward the viewer so its face can be seen.
  A.sideYaw = dir => (dir < 0 ? -1 : 1) * 1.15;

  // Art pixels for the point `ahead` blocks in front of an animal (the way
  // its model is turned) and `y` blocks up: where its speech bubble goes.
  A.artAhead = (o, ahead, y) => {
    const yaw = o._yaw === undefined ? A.sideYaw(o.dir) : o._yaw;
    return G3.toArt(vec().set((o.wx - 0.5) * G3.GW + Math.sin(yaw) * ahead, y, o.wy * G3.GD + Math.cos(yaw) * ahead));
  };

  // The point on the camera's line of sight through an art pixel that is
  // at depth z (for the birds, which fly in screen pixels).
  A.rayAtZ = (ax, ay, z, out) => {
    G3.fromArt(ax, ay, 0, out);
    const c = G3.camera.position;
    const s = (z - c.z) / (out.z - c.z);
    return out.set(c.x + (out.x - c.x) * s, c.y + (out.y - c.y) * s, z);
  };

  // ── Ram ─────────────────────────────────────────────
  // A big woolly box on four dark posts, a tan head with a painted face on
  // a neck that swings from the shoulders, and two curled horns built as
  // stepped rings of little boxes.
  const RAM_PAL = { w: PAL.white, c: PAL.cream, f: PAL.ta3, m: PAL.ta4, k: PAL.wo4, e: PAL.black, x: PAL.white, r: PAL.re3 };
  const RAM_FACE = [
    'wwwwwwww',
    'fwwwwwwf',
    'ffffffff',
    'fxeffexf',
    'feeffeef',
    'ffffffff',
    'ffffffff',
    'ffffffff'];
  const RAM_FACE_SHUT = [
    'wwwwwwww',
    'fwwwwwwf',
    'ffffffff',
    'ffffffff',
    'feeffeef',
    'ffffffff',
    'ffffffff',
    'ffffffff'];
  A.RAM_NECK = 0.5;      // length of his neck, shoulder to the middle of his head
  A.RAM_SHOULDER = 0.8;  // height of the shoulder his neck swings from

  A.ram = () => {
    const m = new THREE.Group(), u = m.userData;
    const rig = grp(m, 0, 0, 0);
    u.rig = rig;

    // wool: one flecked box with square tufts standing out of it all over
    if (!G3._blockDefs.fleece) G3.defineBlock('fleece', PAL.white, [PAL.cream, PAL.cream, PAL.ta1, PAL.g1], { amount: 0.5, seed: 4 });
    rig.add(G3.blockBox(0.875, 0.75, 1.375, 'fleece', 0, 0.875, -0.05));
    const tufts = [];
    const tuft = (x, y, z, w, h, d, c) => tufts.push({ x, y, z, w, h, d, c: c ? PAL.cream : PAL.white });
    for (const s of [1, -1]) {
      tuft(s * 0.45, 1.0, 0.3, 0.125, 0.3, 0.375);              // down each side
      tuft(s * 0.45, 0.8, -0.15, 0.125, 0.375, 0.3, 1);
      tuft(s * 0.45, 1.02, -0.52, 0.125, 0.3, 0.3);
      tuft(s * 0.25, 1.27, -0.3 * s, 0.3, 0.125, 0.375, s > 0);  // along his back
    }
    tuft(0, 1.28, 0.1, 0.375, 0.125, 0.3);
    tuft(-0.1, 1.27, -0.55, 0.375, 0.125, 0.25, 1);
    tuft(0, 0.95, -0.76, 0.5, 0.375, 0.125);                    // rump
    tuft(0, 0.5, -0.05, 0.5, 0.125, 0.875, 1);                  // belly
    rig.add(merged(tufts));

    const legMat = tm('ram_leg', ['mm', 'mm', 'mm', 'mm', 'mm', 'mm', 'kk', 'kk'], RAM_PAL);
    u.legs = [[0.26, 0.42], [-0.26, 0.42], [0.26, -0.5], [-0.26, -0.5]].map(([x, z]) => {
      const leg = G3.limb(0.2, 0.5, 0.2, legMat);
      leg.position.set(x, 0.5, z);
      rig.add(leg);
      return leg;                                   // front right, front left, back right, back left
    });

    u.tail = G3.limb(0.2, 0.3, 0.15, PAL.white);
    u.tail.position.set(0, 1.1, -0.74);
    rig.add(u.tail);

    // neck and head
    u.neck = grp(rig, 0, A.RAM_SHOULDER, 0.5);
    part(u.neck, 0.36, 0.5, 0.36, G3.blockMat('wool'), 0, 0.2, 0);
    u.head = grp(u.neck, 0, A.RAM_NECK, 0);
    const f = RAM_PAL.f, wool = G3.blockMat('wool');
    u.faceOpen = tm('ram_face', RAM_FACE, RAM_PAL);
    u.faceShut = tm('ram_face_shut', RAM_FACE_SHUT, RAM_PAL);
    u.skull = part(u.head, 0.5, 0.45, 0.5, [f, f, wool, f, u.faceOpen, f], 0, 0.05, 0.1);
    part(u.head, 0.3, 0.22, 0.2, [RAM_PAL.m, RAM_PAL.m, RAM_PAL.m, RAM_PAL.m,
      tm('ram_nose', ['mkkkkm', 'mmkkmm', 'mmmmmm', 'mmmmmm'], RAM_PAL), RAM_PAL.m], 0, -0.06, 0.44);
    u.jaw = grp(u.head, 0, -0.17, 0.34);
    part(u.jaw, 0.26, 0.06, 0.2, [RAM_PAL.m, RAM_PAL.m, RAM_PAL.r, RAM_PAL.m, RAM_PAL.m, RAM_PAL.m], 0, -0.03, 0.1);

    // horns (and the pink ears inside their curl), one mesh: each horn is
    // a square spiral that goes back over his head, down behind the ear
    // and forward again under it
    const horn = [];
    for (const s of [1, -1]) {
      const x = s * 0.34, H = PAL.wo4, R = PAL.wo2, w = 0.1875;
      horn.push(
        { x: s * 0.2, y: 0.32, z: 0.14, w: 0.15, h: 0.15, d: 0.15, c: R },        // root, on the brow
        { x, y: 0.34, z: 0.02, w, h: 0.15, d: 0.34, c: H },                       // over the top
        { x, y: 0.28, z: -0.24, w, h: 0.2, d: 0.18, c: R },
        { x, y: 0.05, z: -0.33, w, h: 0.3, d: 0.15, c: H },                       // down the back
        { x, y: -0.16, z: -0.24, w, h: 0.15, d: 0.18, c: R },
        { x, y: -0.22, z: -0.02, w, h: 0.15, d: 0.3, c: H },                      // forward underneath
        { x: s * 0.36, y: -0.1, z: 0.16, w: 0.14, h: 0.2, d: 0.12, c: R },        // the tip curls up
        { x: s * 0.3, y: 0.06, z: -0.03, w: 0.1, h: 0.12, d: 0.16, c: PAL.pi2 },  // ear
      );
    }
    u.head.add(merged(horn));

    // a heart that floats up over his head while he is petted
    u.heart = A.heart();
    u.heart.visible = false;
    m.add(u.heart);
    return m;
  };

  // A blocky heart about half a block across.
  A.heart = () => pixels([
    '.rr.rr.',
    'rlrrrrr',
    'rrrrrrr',
    '.rrrrr.',
    '..rrr..',
    '...r...'], { r: PAL.re2, l: PAL.pi1 }, 0.075);

  // A dropping: a little pile of brown cubes, the sprout that comes up
  // through it, and three stink cubes that rise off it while it is fresh.
  A.poop = () => {
    const m = new THREE.Group(), u = m.userData;
    u.pile = merged([
      { x: 0, y: 0.07, z: 0, w: 0.25, h: 0.14, d: 0.25, c: PAL.wo3 },
      { x: 0.03, y: 0.19, z: -0.02, w: 0.15, h: 0.1, d: 0.15, c: PAL.wo2 },
      { x: -0.13, y: 0.05, z: 0.1, w: 0.14, h: 0.1, d: 0.14, c: PAL.wo4 },
    ]);
    m.add(u.pile);
    u.sprout = merged([
      { x: 0, y: 0.34, z: 0, w: 0.05, h: 0.2, d: 0.05, c: PAL.gr4 },
      { x: 0.07, y: 0.44, z: 0, w: 0.12, h: 0.05, d: 0.08, c: PAL.gr2 },
      { x: -0.07, y: 0.38, z: 0, w: 0.12, h: 0.05, d: 0.08, c: PAL.gr2 },
    ]);
    m.add(u.sprout);
    u.stink = [];
    for (let i = 0; i < 3; i++) {
      const s = part(m, 0.08, 0.08, 0.08, '#a3b072', 0, 0, 0);
      s.castShadow = false;
      u.stink.push(s);
    }
    return m;
  };

  // ── Goose ───────────────────────────────────────────
  // A white box on two orange posts with a long post neck, a small head,
  // an orange slab bill and a slab wing down each side.
  const GOOSE_PAL = { w: PAL.white, e: PAL.black, s: PAL.g1 };
  A.goose = () => {
    const m = new THREE.Group(), u = m.userData;
    const W = PAL.white;
    u.legs = [0.12, -0.12].map(x => {
      const leg = G3.limb(0.09, 0.3, 0.09, PAL.or2);
      leg.position.set(x, 0.3, -0.02);
      part(leg, 0.17, 0.05, 0.24, PAL.or3, 0, -0.275, 0.07);     // webbed foot
      m.add(leg);
      return leg;
    });
    // everything above the legs tips forward together when it charges
    u.rig = grp(m, 0, 0.3, 0);
    part(u.rig, 0.45, 0.4, 0.7, [W, W, W, PAL.g1, W, W], 0, 0.2, 0);
    part(u.rig, 0.3, 0.16, 0.2, W, 0, 0.36, -0.42);              // tail, cocked up
    part(u.rig, 0.2, 0.12, 0.12, PAL.g1, 0, 0.47, -0.5);
    u.wings = [1, -1].map(s => {
      const wing = grp(u.rig, s * 0.235, 0.4, 0);
      part(wing, 0.05, 0.32, 0.55, PAL.g1, s * 0.025, -0.16, -0.04);
      return wing;                                               // right, left
    });
    u.neck = grp(u.rig, 0, 0.32, 0.27);
    part(u.neck, 0.16, 0.48, 0.16, W, 0, 0.2, 0);
    u.head = grp(u.neck, 0, 0.42, 0);
    const eye = ['wwwwww', 'weewww', 'weewww', 'wwwwww'];
    part(u.head, 0.24, 0.22, 0.3,
      [tm('goose_eye', eye, GOOSE_PAL), tm('goose_eye', eye, GOOSE_PAL, true), W, W, W, W], 0, 0.05, 0.05);
    part(u.head, 0.16, 0.07, 0.2, PAL.or2, 0, 0.035, 0.3);       // upper bill
    u.bill = grp(u.head, 0, 0, 0.2);                             // lower bill, hinged at the face
    part(u.bill, 0.14, 0.04, 0.18, PAL.or3, 0, -0.025, 0.09);
    m.scale.setScalar(1.15);
    return m;
  };

  // ── Cat ─────────────────────────────────────────────
  // A long striped box, a wide head with two square ears and a painted
  // face, four short posts and a two-piece tail. `coat` is orange, black
  // or grey.
  A.CAT_COATS = {
    orange: { c: PAL.or2, d: PAL.or3, l: PAL.cream, e: PAL.black, n: PAL.pi3, p: PAL.pi2 },
    black:  { c: PAL.g5,  d: PAL.black, l: PAL.g4,  e: PAL.ye2,   n: PAL.pi3, p: PAL.g4 },
    grey:   { c: PAL.sl1, d: PAL.sl2,   l: PAL.g1,  e: PAL.black, n: PAL.pi3, p: PAL.pi2 },
  };
  const CAT_FACE = [
    'cdcddcdc',
    'cccddccc',
    'ceecceec',
    'ceecceec',
    'cllllllc',
    'cllnnllc',
    'cllllllc',
    'ccllllcc'];
  const CAT_FACE_SHUT = [
    'cdcddcdc',
    'cccddccc',
    'cccccccc',
    'cddccddc',
    'cllllllc',
    'cllnnllc',
    'cllllllc',
    'ccllllcc'];
  const CAT_SIDE = ['cdccdcdc', 'cdccdcdc', 'cccccccc', 'cccccccc'];   // front of the cat at the left
  const CAT_TOP = ['cccccccc', 'dddddddd', 'cccccccc', 'dddddddd', 'cccccccc', 'cccccccc', 'dddddddd', 'cccccccc'];

  A.CAT_SIZE = 1.25;     // drawn a little larger than life so it reads from across the room
  A.cat = (coat) => {
    const m = new THREE.Group(), u = m.userData;
    const name = A.CAT_COATS[coat] ? coat : 'orange', P = A.CAT_COATS[name], c = P.c;
    const rig = grp(m, 0, 0, 0);
    u.rig = rig;
    // the torso swings up from the hips to sit
    u.torso = grp(rig, 0, 0.27, -0.3);
    u.body = part(u.torso, 0.32, 0.3, 0.72,
      [tm('cat_side_' + name, CAT_SIDE, P), tm('cat_side_' + name, CAT_SIDE, P, true),
        tm('cat_top_' + name, CAT_TOP, P), P.l, c, c], 0, 0.13, 0.33);
    u.head = grp(u.torso, 0, 0.35, 0.78);
    u.faceOpen = tm('cat_face_' + name, CAT_FACE, P);
    u.faceShut = tm('cat_face_shut_' + name, CAT_FACE_SHUT, P);
    u.skull = part(u.head, 0.4, 0.34, 0.32, [c, c, tm('cat_top_' + name, CAT_TOP, P), c, u.faceOpen, c], 0, 0, 0);
    u.head.add(merged([
      { x: 0.14, y: 0.22, z: -0.04, w: 0.12, h: 0.12, d: 0.1, c },
      { x: -0.14, y: 0.22, z: -0.04, w: 0.12, h: 0.12, d: 0.1, c },
      { x: 0.14, y: 0.21, z: 0.015, w: 0.06, h: 0.08, d: 0.02, c: P.p },
      { x: -0.14, y: 0.21, z: 0.015, w: 0.06, h: 0.08, d: 0.02, c: P.p },
    ]));
    const legMat = tm('cat_leg_' + name, ['cc', 'cc', 'cc', 'cc', 'cc', 'cc', 'll', 'll'], P);
    const leg = (parent, x, y, z) => {
      const l = G3.limb(0.11, 0.27, 0.11, legMat);
      l.position.set(x, y, z);
      parent.add(l);
      return l;
    };
    u.front = [leg(u.torso, 0.1, 0, 0.6), leg(u.torso, -0.1, 0, 0.6)];   // right, left
    u.back = [leg(rig, 0.12, 0.27, -0.28), leg(rig, -0.12, 0.27, -0.28)];
    u.tail = grp(rig, 0, 0.5, -0.33);
    part(u.tail, 0.09, 0.3, 0.09, c, 0, 0.15, 0);
    u.tip = grp(u.tail, 0, 0.3, 0);
    part(u.tip, 0.09, 0.26, 0.09, [c, c, P.d, c, c, c], 0, 0.11, 0);
    // two "z"s that drift up while it sleeps
    u.zs = [0, 1].map(() => {
      const z = A.zed();
      z.visible = false;
      m.add(z);
      return z;
    });
    // start in the standing pose
    u.pose = Object.assign({}, A.CAT_POSES.stand);
    m.scale.setScalar(A.CAT_SIZE);
    return m;
  };

  // A little blocky "Z".
  A.zed = () => pixels(['zzzz', '..z.', '.z..', 'zzzz'], { z: PAL.white }, 0.07);

  // The cat's poses. lift = height off the ground; hy = hip height; tp =
  // torso pitch (negative lifts the chest); hx, hh, hz = where the head is
  // on the torso; hp, hw = the head's pitch and turn; fl, fr, bl = leg
  // angles (front right, front left, both back); sf, sb = front and back
  // leg length (0 = tucked away); ty = tail height above the hips;
  // t1x, t1z = tail angles; t2x = tail tip angle.
  const CAT_KEYS = ['hy', 'tp', 'hx', 'hh', 'hz', 'hp', 'hw', 'fl', 'fr', 'bl', 'sf', 'sb', 'ty', 't1x', 't1z', 't2x'];
  A.CAT_POSES = {
    stand:  { hy: 0.27, tp: 0,    hx: 0,    hh: 0.35, hz: 0.78, hp: 0,    hw: 0,   fl: 0,    fr: 0,    bl: 0,    sf: 1,    sb: 1,   ty: 0.23, t1x: -0.5,  t1z: 0,   t2x: 0.7 },
    sit:    { hy: 0.1,  tp: -0.65, hx: 0,   hh: 0.33, hz: 0.76, hp: 0,    hw: 0,   fl: 0,    fr: 0,    bl: -1.5, sf: 1.7,  sb: 1,   ty: 0,    t1x: 0,     t1z: 1.5, t2x: 1.4 },
    lick:   { hy: 0.1,  tp: -0.65, hx: 0,   hh: 0.33, hz: 0.76, hp: 0.3,  hw: 0,   fl: -1.3, fr: 0,    bl: -1.5, sf: 1.7,  sb: 1,   ty: 0,    t1x: 0,     t1z: 1.5, t2x: 1.4 },
    sleep:  { hy: 0.03, tp: 0,    hx: 0.12, hh: 0.14, hz: 0.62, hp: 0.1,  hw: 0.8, fl: 0,    fr: 0,    bl: 0,    sf: 0,    sb: 0,   ty: 0.1,  t1x: 0,     t1z: 1.5, t2x: 1.4 },
    loaf:   { hy: 0.03, tp: 0,    hx: 0,    hh: 0.33, hz: 0.72, hp: 0,    hw: 0,   fl: 0,    fr: 0,    bl: 0,    sf: 0,    sb: 0,   ty: 0.1,  t1x: 0,     t1z: 1.5, t2x: 1.4 },
    stalk:  { hy: 0.14, tp: 0,    hx: 0,    hh: 0.16, hz: 0.82, hp: 0,    hw: 0,   fl: -0.4, fr: -0.4, bl: 0.4,  sf: 0.5,  sb: 0.5, ty: 0.2,  t1x: -1.45, t1z: 0,   t2x: 0 },
    pounce: { hy: 0.27, tp: 0,    hx: 0,    hh: 0.3,  hz: 0.8,  hp: 0,    hw: 0,   fl: -1.2, fr: -1.2, bl: 1.2,  sf: 1,    sb: 1,   ty: 0.23, t1x: -1.4,  t1z: 0,   t2x: 0 },
  };
  // Eases the cat's model toward a pose (rate 1 = snap) and applies it.
  // Callers add their own movement (leg swing, tail flick) afterwards.
  A.poseCat = (m, name, rate) => {
    const u = m.userData, p = u.pose, want = A.CAT_POSES[name] || A.CAT_POSES.stand;
    for (let i = 0; i < CAT_KEYS.length; i++) {
      const k = CAT_KEYS[i];
      p[k] += (want[k] - p[k]) * rate;
    }
    u.torso.position.y = p.hy;
    u.torso.rotation.x = p.tp;
    u.head.position.set(p.hx, p.hh, p.hz);
    u.head.rotation.set(p.hp - p.tp, p.hw, 0);
    u.front[0].rotation.x = p.fl - p.tp;
    u.front[1].rotation.x = p.fr - p.tp;
    for (let i = 0; i < 2; i++) {
      u.front[i].visible = p.sf > 0.08;
      u.front[i].scale.y = Math.max(0.08, p.sf);
      u.back[i].visible = p.sb > 0.08;
      u.back[i].scale.y = Math.max(0.08, p.sb);
      u.back[i].position.y = p.hy;
      u.back[i].rotation.x = p.bl;
    }
    u.tail.position.y = p.hy + p.ty;
    u.tail.rotation.set(p.t1x, 0, p.t1z);
    u.tip.rotation.set(p.t2x, 0, 0);
  };

  // ── Rabbit ──────────────────────────────────────────
  // A pale grey box with a square head, two tall post ears, long hind
  // feet and a white cube of a tail.
  const RABBIT_PAL = { w: PAL.g1, h: PAL.white, e: PAL.black, n: PAL.pi3, p: PAL.pi2 };
  A.rabbit = () => {
    const m = new THREE.Group(), u = m.userData;
    const W = PAL.g1;
    u.rig = grp(m, 0, 0, 0);
    part(u.rig, 0.34, 0.32, 0.5, [W, W, W, PAL.white, W, W], 0, 0.3, 0);
    part(u.rig, 0.15, 0.15, 0.12, PAL.white, 0, 0.36, -0.3);            // tail
    u.hind = grp(u.rig, 0, 0.16, -0.12);                               // both hind feet
    u.hind.add(merged([
      { x: 0.15, y: -0.11, z: 0.08, w: 0.11, h: 0.1, d: 0.34, c: PAL.g2 },
      { x: -0.15, y: -0.11, z: 0.08, w: 0.11, h: 0.1, d: 0.34, c: PAL.g2 },
    ]));
    u.fore = grp(u.rig, 0, 0.2, 0.2);                                  // both front paws
    u.fore.add(merged([
      { x: 0.1, y: -0.1, z: 0, w: 0.09, h: 0.2, d: 0.09, c: PAL.g2 },
      { x: -0.1, y: -0.1, z: 0, w: 0.09, h: 0.2, d: 0.09, c: PAL.g2 },
    ]));
    u.head = grp(u.rig, 0, 0.5, 0.26);
    part(u.head, 0.3, 0.28, 0.28, [W, W, W, W, tm('rabbit_face', [
      'wwwwwwww',
      'wwwwwwww',
      'weewweew',
      'weewweew',
      'wwwhhwww',
      'wwhnnhww',
      'wwhhhhww',
      'wwwhhwww'], RABBIT_PAL), W], 0, 0.05, 0.04);
    const earMat = [W, W, W, W, tm('rabbit_ear', ['wpw', 'wpw', 'wpw', 'wpw', 'wpw', 'www'], RABBIT_PAL), W];
    u.ears = [0.08, -0.08].map(x => {
      const ear = grp(u.head, x, 0.18, -0.03);
      part(ear, 0.1, 0.38, 0.06, earMat, 0, 0.19, 0);
      return ear;
    });
    m.scale.setScalar(1.2);
    return m;
  };

  // ── Groundhog ───────────────────────────────────────
  // A square dark hole with a rim of dirt cubes, and a brown box animal
  // that rises out of it. The animal's origin is at lawn level when it is
  // fully up; the lawn hides whatever is still below ground.
  const HOG_PAL = { b: PAL.ta4, d: PAL.wo3, l: PAL.ta1, e: PAL.black, n: PAL.black, w: PAL.white };
  const HOG_FACE = [
    'bbbbbbbb',
    'bbbbbbbb',
    'beebbeeb',
    'beebbeeb',
    'bbbbbbbb',
    'bllbbllb',
    'bllbbllb',
    'bbbbbbbb'];
  const HOG_FACE_SHUT = [
    'bbbbbbbb',
    'bbbbbbbb',
    'bbbbbbbb',
    'bddbbddb',
    'bbbbbbbb',
    'bllbbllb',
    'bllbbllb',
    'bbbbbbbb'];
  A.HOG_TALL = 0.95;    // how much of him shows when he is fully up
  A.groundhog = () => {
    const m = new THREE.Group(), u = m.userData;
    u.hole = grp(m, 0, 0, 0);
    const pit = part(u.hole, 0.7, 0.03, 0.7, PAL.black, 0, 0.016, 0);
    pit.castShadow = false;
    // the rim: a ring of twelve dirt cubes of slightly different heights
    const rim = [], dirt = [PAL.wo2, PAL.wo3, '#8a5a3a'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if (i > 0 && i < 3 && j > 0 && j < 3) continue;
      const h = 0.08 + ((i * 3 + j * 5) % 3) * 0.035;
      rim.push({ x: (i - 1.5) * 0.3, y: h / 2, z: (j - 1.5) * 0.3, w: 0.3, h, d: 0.3, c: dirt[(i + j * 2) % 3] });
    }
    u.hole.add(merged(rim));

    u.hog = grp(m, 0, 0, 0);
    const B = HOG_PAL.b;
    part(u.hog, 0.44, 1.0, 0.36, [B, B, B, B, tm('hog_belly', ['bllb', 'bllb', 'bllb', 'bllb', 'bllb', 'bllb', 'bllb', 'bllb'], HOG_PAL), B], 0, 0, 0);
    u.hog.add(merged([
      { x: 0.2, y: 0.28, z: 0.2, w: 0.1, h: 0.26, d: 0.1, c: PAL.wo3 },     // little arms held in front
      { x: -0.2, y: 0.28, z: 0.2, w: 0.1, h: 0.26, d: 0.1, c: PAL.wo3 },
    ]));
    u.head = grp(u.hog, 0, 0.72, 0.02);
    u.faceOpen = tm('hog_face', HOG_FACE, HOG_PAL);
    u.faceShut = tm('hog_face_shut', HOG_FACE_SHUT, HOG_PAL);
    u.skull = part(u.head, 0.48, 0.44, 0.4, [B, B, PAL.wo3, B, u.faceOpen, B], 0, 0, 0);
    part(u.head, 0.24, 0.2, 0.1, [HOG_PAL.l, HOG_PAL.l, HOG_PAL.l, HOG_PAL.l,
      tm('hog_snout', ['lnnl', 'lnnl', 'lwwl', 'lwwl'], HOG_PAL), HOG_PAL.l], 0, -0.1, 0.24);
    u.head.add(merged([
      { x: 0.19, y: 0.25, z: -0.04, w: 0.12, h: 0.08, d: 0.08, c: PAL.wo3 },   // ears
      { x: -0.19, y: 0.25, z: -0.04, w: 0.12, h: 0.08, d: 0.08, c: PAL.wo3 },
    ]));
    return m;
  };

  // ── Butterfly ───────────────────────────────────────
  // A thin dark body with a pair of flat patterned wings each side, held
  // tilted toward the viewer so the open wings are what you see.
  A.BUTTERFLY_COLOURS = [
    { m: PAL.or2, l: PAL.ye2, d: PAL.or3 },     // orange
    { m: PAL.ye2, l: PAL.ye1, d: PAL.ye3 },     // yellow
    { m: PAL.white, l: PAL.cream, d: PAL.g2 },  // white
    { m: PAL.bl2, l: PAL.bl1, d: PAL.bl3 },     // blue
    { m: PAL.pi2, l: PAL.pi1, d: PAL.pi3 },     // pink
    { m: PAL.pu2, l: PAL.pu1, d: PAL.pu3 },     // purple
    { m: PAL.re2, l: PAL.or1, d: PAL.re3 },     // red
  ];
  const WING = [
    'dddddddd',
    'dmmmmmmd',
    'dmllmmmd',
    'dmllmmmd',
    'dmmmmlld',
    'dmmmmlld',
    'dmmmmmmd',
    'dddddddd'];
  // The six materials for a wing slab in colour number i.
  const wingMats = i => {
    const P = A.BUTTERFLY_COLOURS[i], t = tm('wing_' + i, WING, P);
    return [P.d, P.d, t, t, P.d, P.d].map(x => (typeof x === 'string' ? G3.mat(x) : x));
  };
  A.butterfly = () => {
    const m = new THREE.Group(), u = m.userData;
    // tipped right over toward the viewer: its back faces us and its head
    // (at -z here) is at the top
    u.tilt = grp(m, 0, 0, 0);
    u.tilt.rotation.x = 1.0;
    part(u.tilt, 0.08, 0.08, 0.4, PAL.ink, 0, 0, 0);
    u.slabs = [];
    u.wings = [1, -1].map(s => {
      const wing = grp(u.tilt, s * 0.04, 0, 0);
      u.slabs.push(part(wing, 0.3, 0.03, 0.26, PAL.white, s * 0.15, 0, -0.09));    // fore wing
      u.slabs.push(part(wing, 0.22, 0.03, 0.2, PAL.white, s * 0.11, 0, 0.13));     // hind wing
      return wing;                                                                // right, left
    });
    u.colour = -1;
    return m;
  };
  // Gives a butterfly model the wing colours number i (cheap: the
  // materials are shared and cached).
  A.paintButterfly = (m, i) => {
    const u = m.userData;
    if (u.colour === i) return;
    u.colour = i;
    const mats = wingMats(i);
    for (const slab of u.slabs) slab.material = mats;
  };

  // ── Bee ─────────────────────────────────────────────
  // A fat yellow and black striped box with a painted face, a sting and
  // two small white wing slabs.
  const BEE_PAL = { y: PAL.ye2, k: PAL.black, w: PAL.white };
  const BEE_STRIPES = 'yykkyykk';          // from the face back to the sting
  A.bee = () => {
    const m = new THREE.Group(), u = m.userData;
    const side = [BEE_STRIPES, BEE_STRIPES], top = [];
    for (let r = 0; r < 8; r++) top.push(BEE_STRIPES[7 - r].repeat(4));
    const topMat = tm('bee_top', top, BEE_PAL);
    part(m, 0.3, 0.28, 0.4, [tm('bee_side', side, BEE_PAL), tm('bee_side', side, BEE_PAL, true), topMat, topMat,
      tm('bee_face', ['yyyyyy', 'ywkkwy', 'ykkkky', 'yyyyyy', 'yykkyy', 'yyyyyy'], BEE_PAL), PAL.black], 0, 0, 0);
    part(m, 0.08, 0.08, 0.1, PAL.black, 0, -0.02, -0.24);
    u.wings = [1, -1].map(s => {
      const wing = grp(m, s * 0.06, 0.14, -0.02);
      const slab = part(wing, 0.26, 0.03, 0.18, PAL.white, s * 0.13, 0, 0);
      slab.castShadow = false;
      return wing;                          // right, left
    });
    return m;
  };

  // ── Bird ────────────────────────────────────────────
  // A box body with a paler breast, a cube head, a slab beak and tail, two
  // slab wings and two post legs. `kind` picks the colours.
  A.BIRD_KINDS = [
    { m: '#3d3a4e', w: '#55526a', l: '#55526a', y: PAL.ye3 },     // blackbird
    { m: PAL.wo3,   w: PAL.wo2,   l: PAL.or2,   y: PAL.ye3 },     // robin
    { m: PAL.bl3,   w: PAL.bl2,   l: PAL.white, y: PAL.g5  },     // bluebird
    { m: PAL.wo2,   w: PAL.wo3,   l: PAL.ta1,   y: PAL.ta3 },     // sparrow
    { m: '#3d3a4e', w: '#55526a', l: '#55526a', y: PAL.ye3 },     // blackbirds are the most common
  ];
  A.BIRD_LEG = 0.2;      // how high the body is carried on its legs
  A.bird = (kind) => {
    const m = new THREE.Group(), u = m.userData;
    const K = A.BIRD_KINDS[kind] || A.BIRD_KINDS[0];
    const P = { m: K.m, x: PAL.white, e: PAL.black };
    u.body = grp(m, 0, A.BIRD_LEG + 0.14, 0);
    part(u.body, 0.3, 0.28, 0.46, [K.m, K.m, K.m, K.l, K.l, K.m], 0, 0, 0);
    const eye = ['mmmm', 'mexm', 'mmmm', 'mmmm'];
    const key = 'bird_eye_' + (kind % 4);
    part(u.body, 0.24, 0.24, 0.24, [tm(key, eye, P), tm(key, eye, P, true), K.m, K.l, K.m, K.m], 0, 0.2, 0.24);
    part(u.body, 0.1, 0.08, 0.14, K.y, 0, 0.17, 0.42);                       // beak
    part(u.body, 0.2, 0.05, 0.24, K.w, 0, 0.05, -0.33);                      // tail
    u.wings = [1, -1].map(s => {
      const wing = grp(u.body, s * 0.15, 0.1, 0);
      part(wing, 0.4, 0.04, 0.3, K.w, s * 0.2, 0, -0.02);
      return wing;                                                           // right, left
    });
    u.legs = [0.07, -0.07].map(x => {
      const leg = G3.limb(0.04, A.BIRD_LEG, 0.04, K.y);
      leg.position.set(x, -0.14, 0);
      u.body.add(leg);
      return leg;
    });
    return m;
  };

  return A;
})();
