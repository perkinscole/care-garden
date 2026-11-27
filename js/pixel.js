// ================================================================
// File: pixel.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Description: PX — the pixel-art rendering engine for the CARE Garden.
//   Everything in the garden is drawn on a coarse "art pixel" grid
//   (about 640x360 art pixels on a 1080p screen) so that every sprite,
//   building and letter shares one pixel size. Provides the master
//   palette, crisp drawing primitives, text sprites compiled from
//   string grids, bitmap text, and hi-res photo masking for the
//   faces inside flowers.
//
//   This file has NO dependency on p5.js so that tools/sprites.html
//   can load the art without the sketch.
// ================================================================

// ── Master palette ───────────────────────────────────
// Ramps run light (1) to dark (highest number). Shadows drift toward
// blue/purple and highlights toward yellow, which is what makes the
// garden feel warm instead of flat.
const PAL = {
  ink: '#221c2e',           // outlines on characters and flowers
  white: '#fbf7ee', cream: '#f3e6c8', black: '#15121c',
  g1: '#e4e2dc', g2: '#bfc0c4', g3: '#8f93a0', g4: '#5d6272', g5: '#3b3f52',
  // lawn
  gr1: '#b9d96a', gr2: '#86c253', gr3: '#5aa246', gr4: '#3d7f43', gr5: '#2b5c40', gr6: '#1d3f3a',
  // tree foliage (cooler than the lawn so trees separate from it)
  fo1: '#7fc77a', fo2: '#4fa65f', fo3: '#33835a', fo4: '#225e4e', fo5: '#183f42',
  // sky
  sk1: '#eaf6fb', sk2: '#bfe3f4', sk3: '#8fc9ee', sk4: '#5ea5e0', sk5: '#3f78c4',
  sk6: '#2d4f94', sk7: '#1f2f66', sk8: '#141a40',
  wa1: '#a8e4ee', wa2: '#5fbfdc', wa3: '#3690c0',
  // brick, sandstone, wood
  br1: '#d98a66', br2: '#b9654c', br3: '#96493f', br4: '#6e3438', br5: '#4a2530',
  ta1: '#f0d9a8', ta2: '#d9b67c', ta3: '#b88f5c', ta4: '#8f6845',
  wo1: '#c58f5a', wo2: '#9a6540', wo3: '#6f4430', wo4: '#4a2c26',
  sl1: '#8fa9bf', sl2: '#5f7d99', sl3: '#445c78',     // slate-blue trim
  ye1: '#fff3a0', ye2: '#ffd94a', ye3: '#f2a922', ye4: '#c97a1a',
  or1: '#ffb36b', or2: '#f5823a', or3: '#cf5527',
  re1: '#ff8a80', re2: '#e8473f', re3: '#b02a3a', re4: '#741d34',
  pi1: '#ffd1dc', pi2: '#ff9db5', pi3: '#e8608c', pi4: '#b03a72',
  pu1: '#d7b8f5', pu2: '#a57be0', pu3: '#7350b8', pu4: '#4a3484',
  bl1: '#a9c8ff', bl2: '#6a94f0', bl3: '#4063c8', bl4: '#2b3f8c',
  te1: '#9ae6d0', te2: '#4fc4ae', te3: '#2a8f8a',
  // skin (sn1 lightest) and hair
  sn1: '#ffe0c2', sn2: '#f6c39a', sn3: '#dd9c70', sn4: '#b5714c', sn5: '#8a4f36', sn6: '#5e3526',
  hrBlonde: '#f5d06a', hrGinger: '#c2652f', hrLight: '#c98a3a', hrBrown: '#8a4f2a',
  hrDark: '#4a2c22', hrBlack: '#2a1f26', hrGray: '#b4b2b8',
};

// Art for the "I SPY" cards. Each character module registers a function
// here: CARD_ART.ram = (x, y, tick) => { ...draw at 1x, feet at (x, y)... }
const CARD_ART = {};

const PX = {
  S: 3,          // screen pixels per art pixel (always an integer)
  W: 640,        // art pixels across the screen
  SH: 360,       // art pixels down the whole screen
  H: 240,        // art pixels down the garden (the top two thirds)
  HOR: 97,       // art y of the horizon line
  B: 16,         // one world block, in art pixels (a person is about two blocks tall)
  main: null,    // the main canvas 2D context
  c: null,       // the context PX is currently drawing into
  tick: 0,       // frame counter, for animation
  sprites: {},   // name -> compiled sprite
  _variants: new Map(),
  _lights: [],
  _skyCv: null,
  fonts: {},

  // ── Setup ───────────────────────────────────────────
  // Works out the art grid for a canvas of the given size.
  resize(ctx, pxW, pxH) {
    this.main = ctx;
    this.c = ctx;
    // A window dragged down to nothing must still give a usable grid
    this.S = Math.max(1, Math.floor(pxH / 360));
    this.W = Math.max(16, Math.ceil(pxW / this.S));
    this.SH = Math.max(12, Math.ceil(pxH / this.S));
    this.H = Math.round(this.SH * 2 / 3);
    this.HOR = Math.min(Math.round(this.SH * 0.27), this.H - 2);
    this._skyCv = document.createElement('canvas');
    this._skyCv.width = this.W;
    this._skyCv.height = this.H;
    this._skyGradKey = null;
    // Characters and flowers are painted on their own full-resolution layer
    // so they can be tinted separately and laid over the lit-up scenery.
    this._entCv = document.createElement('canvas');
    this._entCv.width = this.W * this.S;
    this._entCv.height = this.H * this.S;
  },

  // Everything between begin() and end() is drawn in art pixels.
  begin() {
    const c = this.main;
    c.save();
    c.setTransform(this.S, 0, 0, this.S, 0, 0);
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    this.c = c;
  },
  end() { this.main.restore(); this.c = this.main; },

  // Clears the character layer and aims PX at it; endLayer() aims PX back
  // at the main canvas and lays the layer over it.
  beginLayer() {
    const c = this._entCv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this._entCv.width, this._entCv.height);
    c.setTransform(this.S, 0, 0, this.S, 0, 0);
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 1;
    this.c = c;
    return c;
  },
  endLayer() {
    this.c = this.main;
    this.main.drawImage(this._entCv, 0, 0, this.W, this.H);
  },

  // Runs old screen-pixel drawing code from inside begin()/end().
  legacy(fn) {
    const c = this.main;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = true;
    try { fn(); } finally { c.restore(); }
  },

  // Calls a draw function, in art pixels if it is marked `fn.pixel = true`
  // (or its class is marked `static pixel = true`), otherwise as legacy code.
  call(fn, ...args) {
    if (typeof fn !== 'function') return;
    if (fn.pixel) fn(...args); else this.legacy(() => fn(...args));
  },
  drawEntity(obj) {
    if (!obj || typeof obj.draw !== 'function') return;
    if (obj.constructor && obj.constructor.pixel) obj.draw();
    else this.legacy(() => obj.draw());
  },

  // Temporarily draws into another art-resolution context (the sky layer).
  withTarget(ctx, fn) {
    const prev = this.c;
    this.c = ctx;
    ctx.imageSmoothingEnabled = false;
    try { fn(); } finally { this.c = prev; }
  },

  // Draws fn at k times size around the art point (x, y). Used for the
  // big character on the I SPY cards; k must be an integer.
  scaled(x, y, k, fn) {
    const c = this.c;
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(k, k);
    try { fn(); } finally { c.restore(); }
  },

  // ── World mapping ───────────────────────────────────
  // World (0..1, 0..1) to the art pixel where something touches the ground.
  toPx(wx, wy) {
    return {
      x: Math.round(wx * this.W),
      y: Math.round(this.HOR + wy * (this.H - this.HOR)),
    };
  },

  // ── Primitives (all coordinates are art pixels) ─────
  rect(x, y, w, h, col) {
    const c = this.c;
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  },
  px(x, y, col) {
    const c = this.c;
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y), 1, 1);
  },
  // Outlined box: 1px border, optional fill.
  box(x, y, w, h, border, fill) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (fill) this.rect(x, y, w, h, fill);
    this.rect(x, y, w, 1, border); this.rect(x, y + h - 1, w, 1, border);
    this.rect(x, y, 1, h, border); this.rect(x + w - 1, y, 1, h, border);
  },
  // Rounded panel with the corners knocked off by `r` art pixels (1 or 2).
  panel(x, y, w, h, fill, border, r = 1) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (border) {
      this.rect(x + r, y, w - 2 * r, h, border);
      this.rect(x, y + r, w, h - 2 * r, border);
      if (r > 1) this.rect(x + 1, y + 1, w - 2, h - 2, border);
      this.rect(x + r, y + 1, w - 2 * r, h - 2, fill);
      this.rect(x + 1, y + r, w - 2, h - 2 * r, fill);
    } else {
      this.rect(x + r, y, w - 2 * r, h, fill);
      this.rect(x, y + r, w, h - 2 * r, fill);
      if (r > 1) this.rect(x + 1, y + 1, w - 2, h - 2, fill);
    }
  },
  // Bresenham line, one art pixel wide (or `t` wide for thick lines).
  line(x0, y0, x1, y1, col, t = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const c = this.c;
    c.fillStyle = col;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const o = Math.floor((t - 1) / 2);
    for (let guard = 0; guard < 4000; guard++) {
      c.fillRect(x0 - o, y0 - o, t, t);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  },
  // Filled ellipse with crisp stair-stepped edges. rx/ry are radii.
  ellipse(cx, cy, rx, ry, col) {
    cx = Math.round(cx); cy = Math.round(cy);
    rx = Math.max(0, rx); ry = Math.max(0, ry);
    const c = this.c;
    c.fillStyle = col;
    if (ry < 0.5) { c.fillRect(Math.round(cx - rx), cy, Math.round(rx * 2) + 1, 1); return; }
    const r = Math.round(ry);
    for (let dy = -r; dy <= r; dy++) {
      const k = 1 - (dy * dy) / ((ry + 0.35) * (ry + 0.35));
      if (k < 0) continue;
      const hw = Math.round(rx * Math.sqrt(k));
      c.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
  },
  circle(cx, cy, r, col) { this.ellipse(cx, cy, r, r, col); },
  // One-pixel circle outline.
  ring(cx, cy, r, col) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    const c = this.c;
    c.fillStyle = col;
    let x = r, y = 0, err = 1 - r;
    while (x >= y) {
      c.fillRect(cx + x, cy + y, 1, 1); c.fillRect(cx - x, cy + y, 1, 1);
      c.fillRect(cx + x, cy - y, 1, 1); c.fillRect(cx - x, cy - y, 1, 1);
      c.fillRect(cx + y, cy + x, 1, 1); c.fillRect(cx - y, cy + x, 1, 1);
      c.fillRect(cx + y, cy - x, 1, 1); c.fillRect(cx - y, cy - x, 1, 1);
      y++;
      if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
    }
  },
  // Filled polygon by scanline. pts = [[x, y], ...]
  poly(pts, col) {
    const c = this.c;
    c.fillStyle = col;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    minY = Math.round(minY); maxY = Math.round(maxY);
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const y0 = a[1], y1 = b[1];
        if (y0 === y1) continue;
        const sy = y + 0.5;
        if ((sy >= y0 && sy < y1) || (sy >= y1 && sy < y0)) {
          xs.push(a[0] + (sy - y0) / (y1 - y0) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]);
        if (xb > xa) c.fillRect(xa, y, xb - xa, 1);
      }
    }
  },
  // Checkerboard dither of `col` over a rectangle. density: 0.25, 0.5 or 0.75.
  dither(x, y, w, h, col, density = 0.5) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const c = this.c;
    c.fillStyle = col;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const gx = x + i, gy = y + j;
        let on;
        if (density >= 0.75) on = !((gx & 1) === 0 && (gy & 1) === 0);
        else if (density >= 0.5) on = ((gx + gy) & 1) === 0;
        else on = (gx & 1) === 0 && (gy & 1) === 0;
        if (on) c.fillRect(gx, gy, 1, 1);
      }
    }
  },
  // Square contact shadow under a character whose feet are at (cx, y).
  shadow(cx, y, w) {
    const c = this.c;
    const a = c.globalAlpha;
    w = Math.max(2, Math.round(w));
    c.globalAlpha = a * 0.22;
    this.rect(Math.round(cx) - (w >> 1), Math.round(y) - 1, w, Math.max(2, Math.round(w / 5)), PAL.black);
    c.globalAlpha = a;
  },

  // ── Blocks ──────────────────────────────────────────
  // Repeatable noise 0..1 for an art pixel, so textures never shimmer.
  hash(x, y, seed = 0) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  },
  // Speckled block texture: `base` with chunky 2x2 flecks of the colours in
  // `flecks`. amount 0..1 is how much of the area is flecked. The pattern is
  // fixed to (x, y), so pass the same origin every frame.
  tex(x, y, w, h, base, flecks, amount = 0.3, seed = 0, cell = 2) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const c = this.c;
    c.fillStyle = base;
    c.fillRect(x, y, w, h);
    if (!flecks || !flecks.length) return;
    for (let j = 0; j < h; j += cell) {
      for (let i = 0; i < w; i += cell) {
        const r = this.hash(i, j, seed);
        if (r >= amount) continue;
        c.fillStyle = flecks[Math.floor(r / amount * flecks.length) % flecks.length];
        c.fillRect(x + i, y + j, Math.min(cell, w - i), Math.min(cell, h - j));
      }
    }
  },
  // One face of a block: a flat fill with a light top/left edge and a dark
  // bottom/right edge. shade = { l, m, d } (PX.ramp() fits). opts.flecks
  // adds PX.tex speckle; opts.seed varies it.
  block(x, y, w, h, shade, opts) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (w <= 0 || h <= 0) return;
    if (opts && opts.flecks) this.tex(x, y, w, h, shade.m, opts.flecks, opts.amount, opts.seed || 0);
    else this.rect(x, y, w, h, shade.m);
    if (w > 2 && h > 2) {
      this.rect(x, y, w, 1, shade.l); this.rect(x, y, 1, h, shade.l);
      this.rect(x, y + h - 1, w, 1, shade.d); this.rect(x + w - 1, y, 1, h, shade.d);
    }
  },
  // A wall of blocks: PX.block repeated on a grid of `size` art pixels,
  // clipped to the rectangle. Seams line up with (x, y).
  blocks(x, y, w, h, shade, size, opts) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    size = size || this.B;
    const o = { flecks: opts && opts.flecks, amount: opts && opts.amount, seed: 0 };
    for (let j = 0; j < h; j += size) {
      for (let i = 0; i < w; i += size) {
        o.seed = ((opts && opts.seed) || 0) + i * 7 + j * 13;
        this.block(x + i, y + j, Math.min(size, w - i), Math.min(size, h - j), shade, o);
      }
    }
  },
  // Draws fn once into an off-screen art-pixel canvas of w x h and stamps
  // it at (x, y) every time after that. For big static textures (the lawn,
  // walls). Change `key` to redraw.
  cached(key, x, y, w, h, fn) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    const store = this._cache || (this._cache = new Map());
    let cv = store.get(key);
    if (!cv || cv.width !== w || cv.height !== h) {
      cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      this.withTarget(g, fn);
      if (store.size > 60) store.clear();
      store.set(key, cv);
    }
    this.c.drawImage(cv, Math.round(x), Math.round(y));
  },
  // Runs fn with everything drawn at the given opacity (0..1).
  alpha(a, fn) {
    const c = this.c;
    const prev = c.globalAlpha;
    c.globalAlpha = prev * Math.max(0, Math.min(1, a));
    try { fn(); } finally { c.globalAlpha = prev; }
  },

  // ── Colour helpers ──────────────────────────────────
  hsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const v = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return Math.round(v * 255).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
  },
  // Five-step shading ramp for an arbitrary hue, already hue-shifted:
  // { o: outline, d: shadow, m: base, l: light, h: highlight }.
  // Use this for anything whose colour is chosen at runtime (shirts,
  // petals, cars) so it still shades like the rest of the palette.
  ramp(h, s = 62, l = 56) {
    const key = Math.round(h) + '|' + Math.round(s) + '|' + Math.round(l);
    let r = this._ramps.get(key);
    if (!r) {
      const toward = (from, to, amt) => {
        let d = ((to - from + 540) % 360) - 180;
        return from + Math.max(-amt, Math.min(amt, d));
      };
      r = {
        o: this.hsl(toward(h, 265, 22), Math.min(s + 6, 80), Math.max(l - 38, 10)),
        d: this.hsl(toward(h, 265, 12), Math.min(s + 4, 90), Math.max(l - 16, 8)),
        m: this.hsl(h, s, l),
        l: this.hsl(toward(h, 55, 8), s, Math.min(l + 13, 92)),
        h: this.hsl(toward(h, 55, 14), Math.max(s - 12, 0), Math.min(l + 26, 96)),
      };
      if (this._ramps.size > 800) this._ramps.clear();
      this._ramps.set(key, r);
    }
    return r;
  },
  _ramps: new Map(),
  // Blends two '#rrggbb' colours; t = 0 gives a, t = 1 gives b.
  mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = sh => {
      const x = (pa >> sh) & 255, y = (pb >> sh) & 255;
      return Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
    };
    return '#' + ch(16) + ch(8) + ch(0);
  },

  // ── Sprites ─────────────────────────────────────────
  // Compiles a sprite from rows of text. Each character is looked up in
  // `pal`; '.' and ' ' are transparent.
  //   PX.define('rabbit', {
  //     pal: { o: PAL.ink, w: PAL.g1 },
  //     frames: [ ['.oo.', 'owwo'], ['....', 'owwo'] ],   // or frames: { sit: [...], hop: [...] }
  //     anchor: [2, 2],     // optional; default is bottom-centre (the feet)
  //   });
  define(name, def) {
    let frames = def.frames, names = null;
    if (!Array.isArray(frames)) {
      names = Object.keys(frames);
      frames = names.map(k => frames[k]);
    }
    if (typeof frames[0] === 'string') frames = [frames];
    const w = Math.max(...frames.map(f => Math.max(...f.map(r => r.length))));
    const h = Math.max(...frames.map(f => f.length));
    for (let i = 0; i < frames.length; i++) {
      for (const row of frames[i]) {
        if (row.length !== frames[i][0].length) {
          console.warn(`PX.define('${name}'): frame ${i} has rows of different widths`);
          break;
        }
      }
      for (const row of frames[i]) for (const ch of row) {
        if (ch !== '.' && ch !== ' ' && !(ch in def.pal)) {
          console.warn(`PX.define('${name}'): '${ch}' is not in the palette (frame ${i})`);
        }
      }
    }
    const spr = {
      name, w, h, rows: frames, pal: def.pal, names,
      ax: def.anchor ? def.anchor[0] : w / 2,   // may be x.5 so odd widths mirror in place
      ay: def.anchor ? def.anchor[1] : h,
      frames: null,
    };
    spr.frames = frames.map(f => this._compile(f, def.pal, w, h));
    this.sprites[name] = spr;
    for (const k of [...this._variants.keys()]) if (k.startsWith(name + '|')) this._variants.delete(k);
    return spr;
  },
  _compile(rows, pal, w, h) {
    const mk = () => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
    const cv = mk(), g = cv.getContext('2d');
    const top = h - rows.length;   // short frames sit on the bottom edge
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = pal[row[x]];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, top + y, 1, 1);
      }
    }
    const fl = mk(), fg = fl.getContext('2d');
    fg.translate(w, 0); fg.scale(-1, 1); fg.drawImage(cv, 0, 0);
    return { cv, fl };
  },
  // Looks up a sprite, optionally recoloured: PX.get('kid', { s: '#ff0000' }).
  // Recolours are cached, so pick colours from a small fixed set.
  get(name, recolor) {
    const base = this.sprites[name];
    if (!base || !recolor) return base;
    let key = name + '|';
    for (const k in recolor) key += k + recolor[k];
    let v = this._variants.get(key);
    if (!v) {
      const pal = Object.assign({}, base.pal, recolor);
      v = Object.assign({}, base, { pal, frames: base.rows.map(f => this._compile(f, pal, base.w, base.h)) });
      if (this._variants.size > 900) this._variants.clear();
      this._variants.set(key, v);
    }
    return v;
  },
  // Draws a sprite with its anchor (feet by default) at art pixel (x, y).
  // opts: { frame: index or name, flip: true to face left, pal: recolour map,
  //         alpha: 0..1 }. Sprites are authored facing RIGHT.
  spr(name, x, y, opts) {
    opts = opts || {};
    const s = typeof name === 'string' ? this.get(name, opts.pal) : name;
    if (!s) return;
    let fi = opts.frame || 0;
    if (typeof fi === 'string') fi = s.names ? Math.max(0, s.names.indexOf(fi)) : 0;
    const f = s.frames[((fi | 0) % s.frames.length + s.frames.length) % s.frames.length];
    const c = this.c;
    const dx = Math.round(Math.round(x) - (opts.flip ? s.w - s.ax : s.ax));
    const dy = Math.round(y) - s.ay;
    if (opts.alpha !== undefined && opts.alpha < 1) {
      const prev = c.globalAlpha;
      c.globalAlpha = prev * Math.max(0, opts.alpha);
      c.drawImage(opts.flip ? f.fl : f.cv, dx, dy);
      c.globalAlpha = prev;
    } else {
      c.drawImage(opts.flip ? f.fl : f.cv, dx, dy);
    }
  },
  // Frame index for a looping animation: PX.anim(4, 8) = 4 frames, 8 game frames each.
  anim(count, hold = 8, offset = 0) {
    return Math.floor((this.tick + offset) / hold) % count;
  },

  // ── Photos (faces in flowers) ───────────────────────
  // Draws a photo at full screen resolution as a square 2r+1 art pixels
  // across, centred on (cx, cy). The photo itself is never pixelated or
  // repainted: faces stay real photos, just cropped square for the blocks.
  photo(img, cx, cy, r) {
    const src = img && (img.elt || img.canvas || img);
    if (!src || !src.width) return;
    r = Math.max(2, Math.round(r));
    const cache = img._pxPhoto || (img._pxPhoto = {});
    let m = cache[r];
    if (!m || m._S !== this.S) {
      const d = (r * 2 + 1) * this.S;
      m = document.createElement('canvas');
      m.width = d; m.height = d; m._S = this.S;
      const g = m.getContext('2d');
      const side = Math.min(src.width, src.height);
      g.imageSmoothingQuality = 'high';
      g.drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, d, d);
      cache[r] = m;
    }
    const c = this.c;
    c.drawImage(m, Math.round(cx) - r, Math.round(cy) - r, r * 2 + 1, r * 2 + 1);
  },
  // Free cached masks when a photo is thrown away.
  forgetPhoto(img) { if (img) img._pxPhoto = null; },

  // ── Lights ──────────────────────────────────────────
  // Anything that should glow at night (windows, lamps, fireflies) is
  // queued with PX.light(() => {...}) and drawn after the night tint.
  light(fn) { this._lights.push(fn); },
  flushLights() {
    const q = this._lights;
    this._lights = [];
    for (const fn of q) fn();
  },

  // ── Bitmap text ─────────────────────────────────────
  // Fonts: 'small' (Tiny5, 5px capitals, mixed case, for speech and body
  // text) and 'bold' (Press Start 2P, 7px capitals, for titles and numbers).
  loadFonts() {
    const specs = [
      { key: 'small', family: 'Tiny5', url: 'fonts/tiny5.woff2', size: 8, lineH: 8, asc: 7 },
      { key: 'bold', family: 'Press Start 2P', url: 'fonts/press-start-2p.woff2', size: 8, lineH: 10, asc: 8 },
    ];
    for (const sp of specs) this.fonts[sp.key] = this._buildFont(sp, 'monospace');
    if (typeof FontFace === 'undefined') return Promise.resolve();
    return Promise.all(specs.map(sp =>
      new FontFace(sp.family, `url(${sp.url})`).load().then(face => {
        document.fonts.add(face);
        this.fonts[sp.key] = this._buildFont(sp, `"${sp.family}"`);
      }).catch(() => { /* keep the monospace fallback */ })
    ));
  },
  _buildFont(sp, family) {
    const chars = [];
    for (let i = 32; i < 127; i++) chars.push(String.fromCharCode(i));
    const cellH = sp.size + 5, pad = 2;
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = `${sp.size}px ${family}`;
    const glyphs = {};
    let x = 0;
    for (const ch of chars) {
      const w = Math.max(1, Math.round(meas.measureText(ch).width));
      glyphs[ch] = { x, w };
      x += w + pad * 2;
    }
    const cv = document.createElement('canvas');
    cv.width = x; cv.height = cellH;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.font = `${sp.size}px ${family}`;
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#fff';
    for (const ch of chars) g.fillText(ch, glyphs[ch].x + pad, sp.asc);
    // Threshold to pure on/off so glyphs are crisp at any integer scale.
    const d = g.getImageData(0, 0, cv.width, cv.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const on = d.data[i + 3] > 110;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = 255;
      d.data[i + 3] = on ? 255 : 0;
    }
    g.putImageData(d, 0, 0);
    return { atlas: cv, glyphs, pad, cellH, lineH: sp.lineH, tinted: new Map() };
  },
  _tinted(font, col) {
    let t = font.tinted.get(col);
    if (!t) {
      t = document.createElement('canvas');
      t.width = font.atlas.width; t.height = font.atlas.height;
      const g = t.getContext('2d');
      g.drawImage(font.atlas, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = col;
      g.fillRect(0, 0, t.width, t.height);
      if (font.tinted.size > 80) font.tinted.clear();
      font.tinted.set(col, t);
    }
    return t;
  },
  _clean(str) {
    return String(str)
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-').replace(/…/g, '...')
      .replace(/[^\x20-\x7e\n]/g, '');
  },
  // Width in art pixels of one line of text.
  measure(str, font = 'small', scale = 1) {
    const f = this.fonts[font] || this.fonts.small;
    if (!f) return 0;
    let w = 0;
    for (const ch of this._clean(str)) w += (f.glyphs[ch] || f.glyphs['?']).w;
    return w * scale;
  },
  lineHeight(font = 'small', scale = 1) {
    const f = this.fonts[font] || this.fonts.small;
    return (f ? f.lineH : 8) * scale;
  },
  // Splits text into lines no wider than maxW art pixels.
  wrap(str, maxW, font = 'small', scale = 1) {
    const out = [];
    for (const para of this._clean(str).split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const tryLine = line ? line + ' ' + word : word;
        if (line && this.measure(tryLine, font, scale) > maxW) { out.push(line); line = word; }
        else line = tryLine;
      }
      out.push(line);
    }
    return out;
  },
  // Draws text with its top-left (or top-centre / top-right) at (x, y).
  // opts: { color, font: 'small'|'bold', align: 'left'|'center'|'right',
  //         scale: integer, maxW: wrap width, outline: colour, shadow: colour,
  //         lineH: override line height }.
  // Returns the height drawn in art pixels.
  text(str, x, y, opts) {
    opts = opts || {};
    const fontKey = opts.font || 'small';
    const f = this.fonts[fontKey] || this.fonts.small;
    if (!f) return 0;
    const scale = Math.max(1, Math.round(opts.scale || 1));
    const lines = opts.maxW ? this.wrap(str, opts.maxW, fontKey, scale) : this._clean(str).split('\n');
    const lh = opts.lineH || f.lineH * scale;
    x = Math.round(x); y = Math.round(y);
    const pass = (col, ox, oy) => {
      const atlas = this._tinted(f, col);
      for (let li = 0; li < lines.length; li++) {
        const w = this.measure(lines[li], fontKey, scale);
        let cx = x + ox;
        if (opts.align === 'center') cx -= Math.round(w / 2);
        else if (opts.align === 'right') cx -= w;
        const cy = y + oy + li * lh;
        for (const ch of lines[li]) {
          const gph = f.glyphs[ch] || f.glyphs['?'];
          this.c.drawImage(atlas, gph.x, 0, gph.w + f.pad * 2, f.cellH,
            cx - f.pad * scale, cy, (gph.w + f.pad * 2) * scale, f.cellH * scale);
          cx += gph.w * scale;
        }
      }
    };
    if (opts.outline) {
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        pass(opts.outline, ox * scale, oy * scale);
      }
    }
    if (opts.shadow) pass(opts.shadow, scale, scale);
    pass(opts.color || PAL.ink, 0, 0);
    return lines.length * lh;
  },

  // ── Sky ─────────────────────────────────────────────
  // Paints a vertical gradient into the sky layer as flat bands, each a
  // whole number of half-blocks tall (no dithering in the block world).
  // stops = ['#rrggbb', ...] from top to horizon. Cached until `key` changes.
  skyGradient(stops, key) {
    if (key === this._skyGradKey && this._skyGrad) return this._skyGrad;
    const w = this.W, h = this.H;
    const cv = this._skyGrad || (this._skyGrad = document.createElement('canvas'));
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    const img = g.createImageData(w, h);
    const rgb = stops.map(s => { const v = parseInt(s.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; });
    const span = Math.max(1, this.HOR + 6);
    const band = this.B / 2, steps = 3;       // bands between each pair of stops
    for (let y = 0; y < h; y++) {
      const yb = Math.floor(y / band) * band;
      const p = Math.min(0.9999, yb / span) * (rgb.length - 1);
      const i0 = Math.floor(p), fr = Math.round((p - i0) * steps) / steps;
      const a = rgb[i0], b2 = rgb[Math.min(rgb.length - 1, i0 + 1)];
      const c = [a[0] + (b2[0] - a[0]) * fr, a[1] + (b2[1] - a[1]) * fr, a[2] + (b2[2] - a[2]) * fr];
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    this._skyGradKey = key;
    return cv;
  },
};
