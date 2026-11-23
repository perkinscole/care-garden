// ================================================================
// File: g3.js
// Author: Cole Perkins
// Description: G3 — the 3D block-world engine for CARE Garden 2.
//   The garden (the top two thirds of the screen) is a real 3D scene
//   built out of boxes and drawn with three.js on its own canvas, which
//   sits behind the p5 canvas. The dashboard, speech bubbles, forecast
//   and banners are still drawn in 2D with PX on the p5 canvas, on top.
//
//   Units: 1 unit = 1 block. A grown-up is 2 blocks tall. One "texel"
//   (G3.T) is 1/16 of a block. +x is right, +y is up, +z comes toward
//   the viewer. The lawn runs from z = 0 (the school sidewalk, wy = 0)
//   to z = G3.GD (the front edge, wy = 1) and is G3.GW blocks wide.
//
//   See docs/GARDEN_3D.md for how modules use this.
// ================================================================

const G3 = {
  GW: 36,          // lawn width in blocks (wx 0..1)
  GD: 18,          // lawn depth in blocks (wy 0..1)
  T: 1 / 16,       // one texel
  ready: false,
  scene: null, camera: null, renderer: null, canvas: null,
  sun: null, hemi: null, fill: null,
  frame: 0,
  night: 0,        // nightAmount() this frame
  _models: new Map(),
  _mats: new Map(), _geos: new Map(), _texs: new Map(),
  _v: null, _ray: null,
  opts: { shadows: true, sway: true },

  // ── Setup ───────────────────────────────────────────
  init(wPx, hPx) {
    if (typeof THREE === 'undefined') { console.error('three.js did not load: the 3D garden cannot start'); return; }
    const q = new URLSearchParams(window.CARE_QUERY || window.location.search);
    if (q.get('shadows') === '0') this.opts.shadows = false;
    if (q.has('still')) this.opts.sway = false;

    const cv = document.createElement('canvas');
    cv.id = 'garden3d';
    document.body.insertBefore(cv, document.body.firstChild);
    this.canvas = cv;
    this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = this.opts.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(24, 2.667, 1, 600);
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._ray = new THREE.Ray();

    // Sunlight (or moonlight) with shadows, sky light from above, and a
    // soft fill from the viewer's side so faces toward us never go black.
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -34; sc.right = 34; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 160;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.sun.target.position.set(0, 0, this.GD * 0.4);
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a9a6a, 0.6);
    this.scene.add(this.hemi);
    this.fill = new THREE.DirectionalLight(0xffffff, 0.25);
    this.fill.position.set(0, 10, 40);
    this.scene.add(this.fill);

    // Sky: a banded gradient painted on a small canvas behind everything.
    this._skyCv = document.createElement('canvas');
    this._skyCv.width = 4; this._skyCv.height = 90;
    this._skyTex = new THREE.CanvasTexture(this._skyCv);
    this._skyTex.magFilter = THREE.NearestFilter;
    this._skyTex.minFilter = THREE.NearestFilter;
    this.scene.background = this._skyTex;

    this._vertexMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.resize(wPx, hPx);
    this.ready = true;
  },

  resize(wPx, hPx) {
    if (!this.renderer) return;
    this.renderer.setSize(wPx, hPx, false);
    this.canvas.style.width = wPx + 'px';
    this.canvas.style.height = hPx + 'px';
    this.camera.aspect = wPx / hPx;
    this._placeCamera(0);
  },

  // The camera stands in front of the garden, a little above the school
  // roof, looking down across the lawn at the front doors. It drifts very
  // slowly from side to side so the world reads as solid.
  CAM: { y: 14, z: 44, ty: 3.2, tz: 5, fov: 27, sway: 1.4 },
  _placeCamera(tick) {
    const C = this.CAM, cam = this.camera;
    const sx = this.opts.sway ? Math.sin(tick * 0.0016) * C.sway : 0;
    cam.fov = C.fov;
    cam.position.set(sx, C.y, C.z);
    cam.lookAt(sx * 0.15, C.ty, C.tz);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  },

  // ── Frame ───────────────────────────────────────────
  // beginFrame() before any module draws; render() after the last one.
  beginFrame(tick) {
    if (!this.ready) return;
    this.frame = tick;
    this.night = (typeof nightAmount === 'function') ? nightAmount() : 0;
    this._placeCamera(tick);
  },

  render() {
    if (!this.ready) return;
    // Models nobody asked for this frame have left the garden.
    for (const [owner, rec] of this._models) {
      if (rec.seen !== this.frame) {
        this.scene.remove(rec.group);
        this.dispose(rec.group);
        this._models.delete(owner);
      }
    }
    this.renderer.render(this.scene, this.camera);
  },

  // The model that stands for `owner` (a Ram, a Flower, ...). Built by
  // build() the first time, kept while it is asked for every frame, and
  // removed and disposed the first frame it is not.
  model(owner, build) {
    let rec = this._models.get(owner);
    if (!rec) {
      const group = build();
      this.scene.add(group);
      rec = { group, seen: 0 };
      this._models.set(owner, rec);
    }
    rec.seen = this.frame;
    return rec.group;
  },
  // Throws a model away now (to rebuild it differently next frame).
  forget(owner) {
    const rec = this._models.get(owner);
    if (!rec) return;
    this.scene.remove(rec.group);
    this.dispose(rec.group);
    this._models.delete(owner);
  },
  // Frees geometry and textures that belong to one model only
  // (anything flagged userData.own = true). Shared, cached ones stay.
  dispose(obj) {
    obj.traverse(o => {
      if (o.geometry && o.geometry.userData.own) o.geometry.dispose();
      const m = o.material;
      if (m && m.userData && m.userData.own) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  },

  // Calls a scenery function / an entity's draw() if it has been written
  // for the 3D garden (fn.g3 = true, or `static g3 = true` on the class).
  call(fn, ...args) { if (typeof fn === 'function' && fn.g3) fn(...args); },
  drawEntity(obj) { if (obj && obj.constructor && obj.constructor.g3 && obj.draw) obj.draw(); },

  // ── Coordinates ─────────────────────────────────────
  // World (wx, wy 0..1) to a point on the lawn, y blocks above the ground.
  // Pass `out` (a THREE.Vector3) to avoid allocating.
  pos(wx, wy, y, out) {
    out = out || new THREE.Vector3();
    return out.set((wx - 0.5) * this.GW, y || 0, wy * this.GD);
  },
  // Puts an object on the lawn at (wx, wy).
  place(obj, wx, wy, y) { obj.position.set((wx - 0.5) * this.GW, y || 0, wy * this.GD); return obj; },
  // A 3D point to ART pixels on the p5 canvas (for speech bubbles etc).
  toArt(v) {
    const p = this._v.copy(v).project(this.camera);
    return { x: Math.round((p.x * 0.5 + 0.5) * PX.W), y: Math.round((-p.y * 0.5 + 0.5) * PX.H) };
  },
  // World (wx, wy) and a height in blocks to art pixels.
  artAt(wx, wy, y) {
    return this.toArt(this._v2.set((wx - 0.5) * this.GW, y || 0, wy * this.GD));
  },
  // Art pixel -> a point in the air above the lawn, `lift` blocks up (or
  // against the front of the school if the pixel is above the lawn). Used
  // for things whose game logic lives in screen space (butterflies, bees,
  // birds), so they are drawn exactly where the logic thinks they are.
  fromArt(ax, ay, lift, out) {
    out = out || new THREE.Vector3();
    const cam = this.camera;
    const dir = this._v.set(ax / PX.W * 2 - 1, -(ay / PX.H * 2 - 1), 0.5).unproject(cam).sub(cam.position).normalize();
    const o = cam.position;
    let t = dir.y < -1e-4 ? (o.y - (lift || 0)) / -dir.y : 1e9;
    const zMin = 0.6;                                    // just in front of the school wall
    if (o.z + dir.z * t < zMin) t = (zMin - o.z) / dir.z;
    return out.copy(dir).multiplyScalar(t).add(o);
  },
  // A point in the sky for something that should appear at (u, v) on the
  // screen (0..1 across, 0..1 down the garden view), `dist` blocks away.
  // Sky things (sun, moon, stars, clouds) sit far behind the town.
  skyPoint(u, v, dist, out) {
    out = out || new THREE.Vector3();
    const cam = this.camera;
    const dir = this._v.set(u * 2 - 1, -(v * 2 - 1), 0.5).unproject(cam).sub(cam.position).normalize();
    return out.copy(dir).multiplyScalar(dist || 260).add(cam.position);
  },
  // Blocks per art pixel at a 3D point (how big one art pixel is there).
  // Handy for sizing a 2D overlay to match a 3D thing.
  artScaleAt(v) {
    const a = this.toArt(v);
    const b = this.toArt(this._v2.copy(v).setY(v.y + 1));
    return Math.max(1, a.y - b.y);                       // art pixels per block
  },

  // Turns a model to face the way it is moving. (dx, dz) is the movement in
  // blocks (use dwx * G3.GW and dwy * G3.GD); models are built facing +z,
  // toward the viewer. rate 0..1 is how quickly it turns (1 = snap).
  // With no movement it keeps facing the way it was.
  face(model, dx, dz, rate) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-6) return;
    const want = Math.atan2(dx, dz);
    let d = want - model.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    model.rotation.y += d * (rate === undefined ? 0.2 : rate);
  },
  // Angles for the usual directions (model.rotation.y).
  YAW: { front: 0, right: Math.PI / 2, back: Math.PI, left: -Math.PI / 2 },

  // ── Materials, textures, geometry (all cached) ──────
  // A flat-colour lit material. opts: { emissive, basic, transparent, opacity, side }
  mat(color, opts) {
    const key = color + (opts ? JSON.stringify(opts) : '');
    let m = this._mats.get(key);
    if (!m) {
      const o = Object.assign({ color: new THREE.Color(color) }, opts || {});
      const basic = o.basic; delete o.basic;
      if (o.emissive) o.emissive = new THREE.Color(o.emissive);
      m = basic ? new THREE.MeshBasicMaterial(o) : new THREE.MeshLambertMaterial(o);
      this._mats.set(key, m);
    }
    return m;
  },
  // A small pixel texture drawn once with a 2D canvas context:
  //   G3.pixelTex('face_perkins', 8, 8, g => { g.fillStyle = ...; g.fillRect(...) })
  // Crisp (nearest) when magnified. Pass key = null for an uncached texture.
  pixelTex(key, w, h, draw) {
    let t = key && this._texs.get(key);
    if (!t) {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      draw(g, w, h);
      t = new THREE.CanvasTexture(cv);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.encoding = THREE.LinearEncoding;
      if (key) this._texs.set(key, t);
    }
    return t;
  },
  // A lit material from a texture. opts as for mat().
  texMat(tex, opts) {
    const key = 'tex:' + tex.uuid + (opts ? JSON.stringify(opts) : '');
    let m = this._mats.get(key);
    if (!m) {
      const o = Object.assign({ map: tex }, opts || {});
      const basic = o.basic; delete o.basic;
      if (o.emissive) o.emissive = new THREE.Color(o.emissive);
      m = basic ? new THREE.MeshBasicMaterial(o) : new THREE.MeshLambertMaterial(o);
      this._mats.set(key, m);
    }
    return m;
  },
  geo(w, h, d) {
    const key = w + '|' + h + '|' + d;
    let g = this._geos.get(key);
    if (!g) { g = new THREE.BoxGeometry(w, h, d); this._geos.set(key, g); }
    return g;
  },

  // A box mesh centred on its own origin. `mat` is a material, a colour
  // string, or an array of six of either in the order
  // [+x right, -x left, +y top, -y bottom, +z front, -z back].
  box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(this.geo(w, h, d), this._m(mat));
    m.castShadow = true; m.receiveShadow = true;
    if (x !== undefined) m.position.set(x, y, z);
    return m;
  },
  _m(mat) {
    if (Array.isArray(mat)) return mat.map(x => this._m(x));
    return typeof mat === 'string' ? this.mat(mat) : mat;
  },
  // A box that hangs from a pivot at the middle of its top face, for arms,
  // legs, necks and tails: rotate the returned group to swing the limb.
  // The box mesh itself is group.userData.mesh.
  limb(w, h, d, mat) {
    const g = new THREE.Group();
    const m = this.box(w, h, d, mat, 0, -h / 2, 0);
    g.add(m);
    g.userData.mesh = m;
    return g;
  },
  // Many small coloured boxes baked into ONE mesh (one draw call):
  //   G3.merged([{ x, y, z, w, h, d, c: '#rrggbb' }, ...])   x, y, z = centre
  // Use for anything made of lots of little static pieces (petals, leaves,
  // a tree canopy, a hat). The geometry belongs to the mesh and is freed
  // with it.
  merged(boxes) {
    const n = boxes.length;
    const pos = new Float32Array(n * 72), nor = new Float32Array(n * 72), col = new Float32Array(n * 72);
    const idx = new (n * 24 > 65535 ? Uint32Array : Uint16Array)(n * 36);
    const c = new THREE.Color();
    // faces: normal axis/sign and the two in-plane axes
    const F = [[0, 1, 1, 2], [0, -1, 1, 2], [1, 1, 2, 0], [1, -1, 2, 0], [2, 1, 0, 1], [2, -1, 0, 1]];
    let p = 0, ii = 0, vi = 0;
    for (const b of boxes) {
      c.set(b.c);
      const half = [b.w / 2, b.h / 2, b.d / 2], cen = [b.x, b.y, b.z];
      for (const [ax, sg, u, v] of F) {
        for (let k = 0; k < 4; k++) {
          const su = (k === 1 || k === 2) ? 1 : -1, sv = (k >= 2) ? 1 : -1;
          const pt = [0, 0, 0];
          pt[ax] = cen[ax] + sg * half[ax];
          pt[u] = cen[u] + su * half[u];
          pt[v] = cen[v] + sv * half[v];
          pos[p] = pt[0]; pos[p + 1] = pt[1]; pos[p + 2] = pt[2];
          nor[p] = ax === 0 ? sg : 0; nor[p + 1] = ax === 1 ? sg : 0; nor[p + 2] = ax === 2 ? sg : 0;
          col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
          p += 3;
        }
        // winding so the face points along its normal
        if (sg > 0) { idx[ii++] = vi; idx[ii++] = vi + 1; idx[ii++] = vi + 2; idx[ii++] = vi; idx[ii++] = vi + 2; idx[ii++] = vi + 3; }
        else        { idx[ii++] = vi; idx[ii++] = vi + 2; idx[ii++] = vi + 1; idx[ii++] = vi; idx[ii++] = vi + 3; idx[ii++] = vi + 2; }
        vi += 4;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.userData.own = true;
    const m = new THREE.Mesh(g, this._vertexMat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  },

  // ── Block textures ──────────────────────────────────
  // 16x16 flecked textures, one per kind of block. Add your own with
  // G3.defineBlock(name, base, [flecks], { amount, seed, cell, paint }).
  // paint(g, hash) can draw extra detail (mortar lines, plank seams).
  _blockDefs: {},
  defineBlock(name, base, flecks, o) { this._blockDefs[name] = { base, flecks: flecks || [], o: o || {} }; },
  blockTex(name) {
    const def = this._blockDefs[name];
    if (!def) { console.warn('G3: no block texture called ' + name); return this.blockTex('stone'); }
    return this.pixelTex('block:' + name, 16, 16, g => {
      const o = def.o, cell = o.cell || 2, amount = o.amount === undefined ? 0.34 : o.amount, seed = o.seed || 0;
      g.fillStyle = def.base; g.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y += cell) for (let x = 0; x < 16; x += cell) {
        const r = PX.hash(x, y, seed + name.length * 31);
        if (r < amount && def.flecks.length) {
          g.fillStyle = def.flecks[Math.floor(r / amount * def.flecks.length) % def.flecks.length];
          g.fillRect(x, y, cell, cell);
        }
      }
      if (o.paint) o.paint(g, (x, y) => PX.hash(x, y, seed + 7));
    });
  },
  blockMat(name, opts) { return this.texMat(this.blockTex(name), opts); },

  // A box of any size textured as blocks: the texture repeats once per
  // block along every face, so a 10 x 4 wall shows 40 bricks' worth.
  // `tex` is a block name, or { top, side, bottom, front, back, left, right }
  // (anything missing falls back to side). opts.scale = blocks per repeat.
  blockBox(w, h, d, tex, x, y, z, opts) {
    const rep = (opts && opts.scale) || 1;
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];   // per face: u size, v size
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[f][0] / rep, uv.getY(i) * dims[f][1] / rep);
    }
    g.userData.own = true;
    let mat;
    if (typeof tex === 'string') mat = this.blockMat(tex, opts && opts.mat);
    else {
      const pick = k => this.blockMat(tex[k] || tex.side, opts && opts.mat);
      mat = [pick('right'), pick('left'), pick('top'), pick('bottom'), pick('front'), pick('back')];
    }
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    if (x !== undefined) m.position.set(x, y, z);
    return m;
  },

  // ── Photos ──────────────────────────────────────────
  // A flat square showing a real photo (a p5.Graphics, p5.Image, canvas or
  // video), `size` blocks across, facing +z. The photo is NOT pixelated,
  // recoloured or lit: it is shown as it was taken, only dimmed a little
  // at night by G3 along with everything else. Free with G3.dispose().
  _photoMats: new Set(),
  photo(img, size) {
    const src = img && (img.elt || img.canvas || img);
    const tex = new THREE.CanvasTexture(src);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    mat.userData.own = true;
    mat.userData.photo = true;
    this._photoMats.add(mat);
    mat.addEventListener('dispose', () => this._photoMats.delete(mat));
    const m = new THREE.Mesh(this._photoGeo || (this._photoGeo = new THREE.PlaneGeometry(1, 1)), mat);
    m.scale.set(size, size, 1);
    return m;
  },

  // ── I SPY card pictures ─────────────────────────────
  // Registers CARD_ART[id] as a little rendered picture of a 3D model, so
  // the dashboard cards show the same block characters as the garden.
  //   G3.cardArt('ram', () => buildRamModel());
  // build() returns a Group standing on y = 0, facing +z; it is rendered
  // once, slightly from the side, on a clear background. opts: { w, h }
  // in art pixels (default 56 x 40), { yaw } in radians (default 0.5).
  cardArt(id, build, opts) {
    const o = opts || {}, w = o.w || 56, h = o.h || 40;
    let cv = null;
    CARD_ART[id] = (x, y) => {
      if (!this.ready) return;
      if (!cv) cv = this.snapshot(build(), w * 6, h * 6, o.yaw === undefined ? 0.5 : o.yaw);
      PX.c.drawImage(cv, Math.round(x - w / 2), Math.round(y - h), w, h);
    };
  },
  // Renders a model to a 2D canvas of wPx x hPx with a clear background,
  // framed to fit, feet on the bottom edge.
  snapshot(group, wPx, hPx, yaw) {
    const scene = new THREE.Scene();
    const sun = new THREE.DirectionalLight(0xffffff, 0.72);
    sun.position.set(-4, 8, 7);
    scene.add(sun, new THREE.HemisphereLight(0xffffff, 0x8a9a6a, 0.5));
    const holder = new THREE.Group();
    holder.add(group);
    holder.rotation.y = yaw || 0;
    scene.add(holder);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const aspect = wPx / hPx;
    const halfH = Math.max(size.y / 2, size.x / 2 / aspect) * 1.12 + 0.05;
    const cam = new THREE.OrthographicCamera(-halfH * aspect, halfH * aspect, halfH, -halfH, 0.1, 200);
    cam.position.set(mid.x, box.min.y + halfH + 2.2, mid.z + 30);
    cam.lookAt(mid.x, box.min.y + halfH - 0.08 * halfH, mid.z);
    const rt = new THREE.WebGLRenderTarget(wPx, hPx);
    const r = this.renderer, prevTarget = r.getRenderTarget(), prevShadow = r.shadowMap.enabled;
    const prevColor = r.getClearColor(new THREE.Color()), prevAlpha = r.getClearAlpha();
    r.shadowMap.enabled = false;
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, cam);
    const buf = new Uint8Array(wPx * hPx * 4);
    r.readRenderTargetPixels(rt, 0, 0, wPx, hPx, buf);
    r.setRenderTarget(prevTarget);
    r.setClearColor(prevColor, prevAlpha);
    r.shadowMap.enabled = prevShadow;
    rt.dispose();
    this.dispose(group);
    const cv = document.createElement('canvas');
    cv.width = wPx; cv.height = hPx;
    const g = cv.getContext('2d'), img = g.createImageData(wPx, hPx);
    for (let y = 0; y < hPx; y++) img.data.set(buf.subarray((hPx - 1 - y) * wPx * 4, (hPx - y) * wPx * 4), y * wPx * 4);
    g.putImageData(img, 0, 0);
    return cv;
  },

  // ── Light and sky ───────────────────────────────────
  // Called once a frame by sketch.js. stops = sky colours top to horizon.
  // dayT = timeOfDay 0..1, storm = weatherAlpha 0..1, tint = {r,g,b,a}.
  _skyKey: '',
  setSky(stops, key) {
    if (key === this._skyKey) return;
    this._skyKey = key;
    const g = this._skyCv.getContext('2d'), H = this._skyCv.height;
    const rgb = stops.map(s => { const v = parseInt(s.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; });
    // The sky fills the top part of the view; below that it holds the
    // horizon colour (hidden behind the hills and the town anyway).
    const span = H * 0.42, band = 3;
    for (let y = 0; y < H; y += band) {
      const p = Math.min(0.9999, y / span) * (rgb.length - 1);
      const i0 = Math.floor(p), fr = Math.round((p - i0) * 3) / 3;
      const a = rgb[i0], b = rgb[Math.min(rgb.length - 1, i0 + 1)];
      g.fillStyle = `rgb(${Math.round(a[0] + (b[0] - a[0]) * fr)},${Math.round(a[1] + (b[1] - a[1]) * fr)},${Math.round(a[2] + (b[2] - a[2]) * fr)})`;
      g.fillRect(0, y, 4, band);
    }
    this._skyTex.needsUpdate = true;
  },
  // Where the sun is in its arc: 0 at sunrise, 1 at sunset (clamped).
  dayArc(dayT) { return Math.max(0, Math.min(1, (dayT - 0.05) / 0.66)); },
  setLight(dayT, storm, tint) {
    const na = this.night, arc = this.dayArc(dayT);
    const tc = this._tc || (this._tc = new THREE.Color());
    tc.setRGB(tint.r / 255, tint.g / 255, tint.b / 255);
    const ta = Math.min(1, tint.a * 2.2);
    // The sun crosses from the left (east) to the right; the moon stands
    // high on the left. Both shine a little from the viewer's side so the
    // faces we can see are the lit ones.
    if (na < 0.6) this.sun.position.set(-30 + 60 * arc, 12 + 26 * Math.sin(arc * Math.PI), this.GD * 0.4 + 22);
    else this.sun.position.set(-18, 34, this.GD * 0.4 + 20);
    this.sun.color.setRGB(1, 1, 1).lerp(tc, ta * 0.75);
    this.sun.intensity = (0.72 - 0.47 * na) * (1 - 0.45 * storm);
    this.hemi.color.setRGB(1, 1, 1).lerp(tc, ta);
    this.hemi.groundColor.setRGB(0.55, 0.62, 0.42).lerp(tc, ta);
    this.hemi.intensity = (0.5 - 0.1 * na) * (1 - 0.2 * storm);
    this.fill.color.copy(this.hemi.color);
    this.fill.intensity = 0.14 - 0.03 * na;
    // Photos keep their own colours; they only dim with the evening.
    const dim = 1 - 0.42 * na - 0.12 * storm * (1 - na);
    for (const m of this._photoMats) m.color.setRGB(dim * (1 - 0.1 * na), dim * (1 - 0.06 * na), dim);
  },
};

// ── The standard blocks ──────────────────────────────
// Our own flecked textures: each is a base colour, 2x2 flecks of lighter
// and darker shades, and sometimes a few painted lines.
(() => {
  const D = (n, b, f, o) => G3.defineBlock(n, b, f, o);
  const seam = (col, a) => (g) => { g.globalAlpha = a === undefined ? 0.5 : a; g.fillStyle = col; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); g.globalAlpha = 1; };
  D('grass', PAL.gr3, ['#63ab49', '#519843', '#63ab49', '#6bb04c'], { amount: 0.4 });
  D('grass_light', '#6ab14b', ['#74ba50', '#5fa747', '#74ba50'], { amount: 0.4, seed: 3 });
  D('grass_side', PAL.wo2, [PAL.wo3, PAL.wo1, '#8a5a3a'], {
    amount: 0.4, paint: (g, h) => {
      g.fillStyle = PAL.gr3; g.fillRect(0, 0, 16, 4);
      for (let x = 0; x < 16; x += 2) { g.fillStyle = h(x, 0) < 0.5 ? PAL.gr3 : PAL.gr4; g.fillRect(x, 4, 2, h(x, 1) < 0.5 ? 2 : 1); }
      g.fillStyle = PAL.gr2; for (let x = 0; x < 16; x += 2) if (h(x, 2) < 0.35) g.fillRect(x, 0, 2, 2);
    },
  });
  D('dirt', PAL.wo2, [PAL.wo3, PAL.wo1, '#8a5a3a'], { amount: 0.4 });
  D('stone', PAL.g3, [PAL.g2, PAL.g4, '#868a97'], { amount: 0.4 });
  D('cobble', PAL.g3, [PAL.g2, PAL.g4], {
    amount: 0.2, paint: g => { g.fillStyle = PAL.g4; for (const [x, y, w, h] of [[0, 5, 16, 1], [0, 11, 16, 1], [5, 0, 1, 5], [12, 0, 1, 5], [2, 6, 1, 5], [9, 6, 1, 5], [6, 12, 1, 4], [13, 12, 1, 4]]) g.fillRect(x, y, w, h); },
  });
  D('pavement', PAL.g1, [PAL.g2, PAL.white, '#d6d4cf'], { amount: 0.3, paint: seam(PAL.g3, 0.7) });
  D('asphalt', PAL.g5, [PAL.g4, '#343849'], { amount: 0.3 });
  D('brick', PAL.br2, [PAL.br1, PAL.br3, PAL.br3], {
    amount: 0.3, paint: g => {
      g.fillStyle = '#d8b9a0';
      for (let r = 0; r < 4; r++) { g.fillRect(0, r * 4 + 3, 16, 1); const off = r % 2 ? 4 : 0; g.fillRect(off, r * 4, 1, 3); g.fillRect(off + 8, r * 4, 1, 3); }
    },
  });
  D('brick_dark', PAL.br3, [PAL.br2, PAL.br4, PAL.br4], {
    amount: 0.3, paint: g => {
      g.fillStyle = '#b08c7c';
      for (let r = 0; r < 4; r++) { g.fillRect(0, r * 4 + 3, 16, 1); const off = r % 2 ? 4 : 0; g.fillRect(off, r * 4, 1, 3); g.fillRect(off + 8, r * 4, 1, 3); }
    },
  });
  D('sandstone', PAL.ta2, [PAL.ta1, PAL.ta3, PAL.ta1], { amount: 0.36, paint: g => { g.fillStyle = PAL.ta3; g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(7, 0, 1, 7); g.fillRect(15, 8, 1, 7); } });
  D('planks', PAL.wo1, [PAL.wo2, '#d19c66'], { amount: 0.24, paint: g => { g.fillStyle = PAL.wo3; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1); g.fillRect(5, 0, 1, 3); g.fillRect(12, 4, 1, 3); g.fillRect(3, 8, 1, 3); g.fillRect(10, 12, 1, 3); } });
  D('planks_white', PAL.white, [PAL.g1, PAL.cream], { amount: 0.24, paint: g => { g.fillStyle = PAL.g2; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1); } });
  D('log', PAL.wo3, [PAL.wo4, PAL.wo2], { amount: 0.3, cell: 2, paint: g => { g.fillStyle = PAL.wo4; for (const x of [2, 7, 11, 14]) g.fillRect(x, 0, 1, 16); } });
  D('leaves', PAL.fo3, [PAL.fo2, PAL.fo4, PAL.fo2, PAL.fo1], { amount: 0.55 });
  D('leaves_light', PAL.fo2, [PAL.fo1, PAL.fo3, PAL.fo1], { amount: 0.55, seed: 5 });
  D('leaves_pine', PAL.fo4, [PAL.fo3, PAL.fo5, PAL.fo3], { amount: 0.5, seed: 9 });
  D('roof', PAL.sl2, [PAL.sl1, PAL.sl3], { amount: 0.3, paint: g => { g.fillStyle = PAL.sl3; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1); } });
  D('roof_red', PAL.re3, [PAL.re2, PAL.re4], { amount: 0.3, paint: g => { g.fillStyle = PAL.re4; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1); } });
  D('concrete', PAL.g2, [PAL.g1, PAL.g3], { amount: 0.25 });
  D('white', PAL.white, [PAL.g1, PAL.cream], { amount: 0.25 });
  D('glass', PAL.sk3, [PAL.sk2, PAL.sk4], {
    amount: 0.15, paint: g => { g.fillStyle = PAL.white; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); g.fillRect(0, 15, 16, 1); g.fillRect(7, 0, 2, 16); g.fillRect(0, 7, 16, 2); g.fillStyle = PAL.sk1; g.fillRect(2, 2, 2, 1); g.fillRect(2, 3, 1, 2); g.fillRect(10, 10, 2, 1); },
  });
  D('water', PAL.wa2, [PAL.wa1, PAL.wa3, PAL.wa3], { amount: 0.3, cell: 4 });
  D('wool', PAL.white, [PAL.g1, PAL.cream, PAL.g1], { amount: 0.45 });
  D('sand', PAL.ta1, [PAL.ta2, PAL.cream], { amount: 0.3 });
  D('cloud', PAL.white, [PAL.sk1], { amount: 0.12, cell: 4 });
})();
