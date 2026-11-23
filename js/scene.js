// ================================================================
// File: scene.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Pixel-art scenery for the CARE Garden: the sky layer (sun,
//              moon, stars, fair-weather clouds), the mown lawn and its
//              swaying grass tufts, the trees, the picket fence, Robert
//              Adams Middle School with its waving flag and night-lit
//              windows, the fireflies, and the school's I SPY card art.
//              Everything is drawn in art pixels with PX (see
//              docs/PIXEL_ART.md). The big static pieces are painted once
//              into offscreen canvases and copied to the screen each frame.
// ================================================================

// ── Offscreen layers ──────────────────────────────────
// The lawn, the school and the trees never change, so each is painted once
// into its own small canvas and blitted every frame. A layer is repainted
// only when the art grid changes (window resize) or its own key changes.
const SCENE_LAYERS = {};

function sceneLayer(name, w, h, extraKey, paint) {
  const key = w + 'x' + h + '|' + PX.W + '|' + PX.H + '|' + PX.HOR + '|' + PX.S + '|' + extraKey;
  let layer = SCENE_LAYERS[name];
  if (!layer) layer = SCENE_LAYERS[name] = { cv: document.createElement('canvas'), key: null };
  if (layer.key !== key) {
    w = Math.max(1, w); h = Math.max(1, h);
    const g = layer.cv.getContext('2d');
    if (layer.cv.width !== w || layer.cv.height !== h) {
      layer.cv.width = w;                // setting the size also wipes the canvas
      layer.cv.height = h;
    } else {
      g.clearRect(0, 0, w, h);
    }
    PX.withTarget(g, () => paint(g, w, h));
    layer.key = key;
  }
  return layer.cv;
}

// Repeatable "random" number 0..1 for a pair of whole numbers. Scenery uses
// this instead of random() so that it is identical every time it is painted.
function sceneHash(a, b) {
  let n = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// Splits '#rrggbb' into [r, g, b]
function sceneRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// A dithered disc (for the glow around the sun, the moon and fireflies).
// Discs are cached by size and colour; density is 0.25, 0.5 or 0.75.
const SCENE_DISCS = new Map();

function sceneDisc(r, col, density) {
  r = Math.max(1, Math.round(r));
  const key = r + col + density;
  let cv = SCENE_DISCS.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = cv.height = r * 2 + 1;
    const g = cv.getContext('2d');
    g.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > (r + 0.35) * (r + 0.35)) continue;
        let on;
        if (density >= 0.75) on = !((dx & 1) === 0 && (dy & 1) === 0);
        else if (density >= 0.5) on = ((dx + dy) & 1) === 0;
        else on = (dx & 1) === 0 && (dy & 1) === 0;
        if (on) g.fillRect(dx + r, dy + r, 1, 1);
      }
    }
    if (SCENE_DISCS.size > 300) SCENE_DISCS.clear();
    SCENE_DISCS.set(key, cv);
  }
  return cv;
}

function drawSceneDisc(cx, cy, r, col, density) {
  r = Math.max(1, Math.round(r));
  PX.c.drawImage(sceneDisc(r, col, density), Math.round(cx) - r, Math.round(cy) - r);
}

// ── Sky ───────────────────────────────────────────────

// 0 → 1 → 0 as x goes from a up to the peak and on to b
function sceneBump(x, a, peak, b) {
  if (x <= a || x >= b) return 0;
  return x < peak ? (x - a) / (peak - a) : (b - x) / (b - peak);
}

// The colours of a sunrise or sunset, from high in the sky down to the horizon
const SUNSET_SKY = [PAL.pu4, PAL.pu3, PAL.pi3, PAL.or2, PAL.or1, PAL.ye2, PAL.ye1];

// Colour stops for the dithered sky gradient, top of the sky to the horizon.
// By day the sky is a deeper blue overhead and pale toward the horizon; at
// dawn and at sunset it runs from violet through pink and orange to gold.
// The whole fade happens in the top part of the sky, because the town and
// the school hide the rest. Storm weather greys everything out.
function skyStops() {
  const hue = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'hue');
  const sat = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'sat');
  const top = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'litTop');
  const bot = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'litBot');
  const lo = Math.min(top, bot), hi = Math.max(top, bot);
  // How much of a clear blue day it is: blue skies get a richer zenith
  const blue = constrain((lo - 50) / 25, 0, 1) * constrain((sat - 10) / 30, 0, 1) * (hue > 120 ? 1 : 0);
  const topLit = lo - 14 * blue - (lo < 50 ? lo * 0.3 : 0);
  const botLit = hi + 3;
  const warm = Math.max(sceneBump(timeOfDay, 0.05, 0.09, 0.13), sceneBump(timeOfDay, 0.53, 0.63, 0.70));
  const stops = [];
  const N = 13;
  for (let i = 0; i < N; i++) {
    const k = Math.min(1, (i / (N - 1)) / 0.4);
    let col = PX.hsl(hue + 6 * blue * (1 - k), sat + 22 * blue * (1 - k) - 8 * k,
                     topLit + (botLit - topLit) * Math.pow(k, 0.8));
    if (warm > 0) {
      const p = k * (SUNSET_SKY.length - 1), i0 = Math.min(SUNSET_SKY.length - 2, Math.floor(p));
      col = PX.mix(col, PX.mix(SUNSET_SKY[i0], SUNSET_SKY[i0 + 1], p - i0), warm * 0.72);
    }
    if (weatherAlpha > 0.02) col = PX.mix(col, '#6f7a8c', Math.min(weatherAlpha, 1) * 0.6);
    stops.push(col);
  }
  return stops;
}

// Draws everything that lives in the sky: stars, moon, sun and fair-weather
// clouds. sketch.js calls this with PX aimed at the sky layer (PX.W x PX.H),
// which sits behind the world and is not tinted, so this function fades
// things in and out for night itself.
function drawSkyLayer() {
  const na = nightAmount();
  drawStars(na);
  drawMoon(na);
  drawSun(na);
  drawFairClouds(na);
}
drawSkyLayer.pixel = true;

// Twinkling stars. Each star steps between dim, bright and (for the big
// ones) a little cross flare instead of fading smoothly.
function drawStars(na) {
  if (na < 0.05) return;
  const clear = 1 - Math.min(weatherAlpha, 1) * 0.85;   // storm clouds hide the stars
  for (const s of stars) {
    const twinkle = sin(t * s.twinkleSpeed + s.twinklePhase) * 0.4 + 0.6;
    const a = na * twinkle * (s.brightness / 100) * clear;
    if (a < 0.12) continue;
    const x = Math.round(s.x * PX.W);
    const y = Math.round(s.y * PX.HOR);                  // all of them above the horizon
    if (s.size > 2.3 && a > 0.7) PX.spr('star', x, y, { frame: 'flare' });
    else if (s.size > 1.6 && a > 0.45) PX.spr('star', x, y, { frame: 'plus' });
    else PX.px(x, y, a > 0.5 ? PAL.white : a > 0.28 ? PAL.sk2 : PAL.sk3);
  }
}

// Crescent moon in the upper left, with a faint halo and earthshine on its
// dark side. Painted once; faded in as a whole with nightAmount.
function drawMoon(na) {
  if (na < 0.04) return;
  const r = 13;
  const size = (r + 8) * 2 + 1;
  const cv = sceneLayer('moon', size, size, '', () => {
    const c = r + 8;
    // Halo: two flat rings a little lighter than the night sky
    PX.circle(c, c, r + 6, PAL.sk8);
    PX.circle(c, c, r + 3, PAL.sk7);
    // The shadow that carves the crescent is a second circle up and to the right
    const sx = r * 0.5, sy = -r * 0.18, sr = r * 0.95;
    const earthshine = PX.mix(PAL.sk7, PAL.sk6, 0.5);         // the dark side is faintly lit
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > (r + 0.35) * (r + 0.35)) continue;
        const inShadow = (dx - sx) * (dx - sx) + (dy - sy) * (dy - sy) <= sr * sr;
        let col;
        if (inShadow) {
          col = earthshine;
        } else {
          const edge = (dx - 1) * (dx - 1) + (dy - 1) * (dy - 1) > (r - 0.6) * (r - 0.6);
          const nearShadow = (dx - sx + 1.5) * (dx - sx + 1.5) + (dy - sy) * (dy - sy) <= sr * sr;
          col = edge ? PAL.white : nearShadow ? PAL.ta1 : PAL.cream;
        }
        PX.px(c + dx, c + dy, col);
      }
    }
    // Craters on the lit limb
    PX.rect(c - 10, c - 3, 2, 2, PAL.ta1);
    PX.px(c - 8, c + 5, PAL.ta1);
    PX.rect(c - 6, c + 8, 2, 1, PAL.ta1);
    PX.px(c - 7, c - 8, PAL.ta1);
  });
  const mx = Math.round(PX.W * 0.15);
  const my = Math.max(r + 5, Math.round(PX.H * 0.075));
  PX.alpha(na, () => PX.c.drawImage(cv, mx - r - 8, my - r - 8));
}

// The sun on its east-to-west arc. While someone is smiling (sunGlow) it
// brightens, swells, throws longer rays and wears a smiling face.
function drawSun(na) {
  // The sun fades out at dusk and dims behind rain clouds
  const sunVis = constrain(1.0 - na * 2.5, 0, 1) * (1 - constrain(weatherAlpha * 1.1 - 0.15, 0, 0.9));
  if (sunVis <= 0.01) return;

  // Sun arcs across the sky: rises at dawn, peaks at midday, sets at sunset
  const sunRise = 0.07;   // time sun appears at horizon
  const sunSet  = 0.66;   // time sun reaches horizon again
  const sunProgress = constrain(map(timeOfDay, sunRise, sunSet, 0, 1), 0, 1);
  // Horizontal: arcs from east (left) to west (right)
  const cx = Math.round(lerp(PX.W * 0.15, PX.W * 0.85, sunProgress));
  // Vertical: parabolic arc, highest at the midpoint, on the horizon at the ends
  const arcHeight = PX.HOR * 0.85;
  const arcY = 1.0 - 4 * sunProgress * (1 - sunProgress);   // 0 at peak, 1 at horizon
  const cy = Math.round(PX.HOR - arcHeight * (1 - arcY));

  // Toward sunset the sun turns from yellow to deep orange (in five steps,
  // so the cached glow discs are reused)
  const lowSun = Math.max(
    (timeOfDay > 0.45 && timeOfDay < 0.7) ? constrain(map(timeOfDay, 0.45, 0.65, 0, 1), 0, 1) : 0,
    constrain(map(timeOfDay, 0.12, 0.07, 0, 0.75), 0, 0.75));
  const sf = Math.round(lowSun * 4) / 4;
  const core = PX.mix(PAL.ye1, PAL.ye2, sf);
  const body = PX.mix(PAL.ye2, PAL.or1, sf);
  const rim  = PX.mix(PAL.ye3, PAL.or2, sf);
  const dark = PX.mix(PAL.ye4, PAL.or3, sf);

  const g = constrain(sunGlow, 0, 1);
  const R = 16 + Math.round(g * 2);

  PX.alpha(sunVis, () => {
    // Soft halo: a faint ring normally, wide and bright while glowing
    const halo = PX.mix(PAL.white, core, 0.6);
    if (g > 0.05) drawSceneDisc(cx, cy, R + 5 + g * 11, halo, 0.25);
    drawSceneDisc(cx, cy, R + 3 + g * 5, halo, g > 0.4 ? 0.5 : 0.25);

    // Rays: eight long and eight short, turning slowly in small steps
    const step = Math.floor(t * 0.003 / (TWO_PI / 96));
    const inner = R + 3;
    const longRay = Math.round(lerp(6, 9, g)), shortRay = Math.round(lerp(3, 5, g));
    const thick = g > 0.5 ? 2 : 1;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TWO_PI + step * (TWO_PI / 96);
      const len = i % 2 === 0 ? longRay : shortRay;
      const ca = Math.cos(a), sa = Math.sin(a);
      PX.line(cx + ca * inner, cy + sa * inner, cx + ca * (inner + len), cy + sa * (inner + len),
              i % 2 === 0 ? body : core, thick);
    }

    // Disc: darker rim, bright body, a paler heart up and to the left
    PX.circle(cx, cy, R, rim);
    PX.circle(cx, cy, R - 1, body);
    PX.circle(cx - 2, cy - 2, R - 5, core);

    // Smiling face while someone is smiling at the camera
    if (g > 0.3 && sunVis > 0.5) {
      PX.alpha(constrain((g - 0.3) * 3, 0, 1), () => {
        PX.rect(cx - 5, cy - 4, 2, 3, dark);        // eyes
        PX.rect(cx + 4, cy - 4, 2, 3, dark);
        PX.rect(cx - 8, cy + 1, 2, 2, PAL.or1);     // rosy cheeks
        PX.rect(cx + 7, cy + 1, 2, 2, PAL.or1);
        PX.rect(cx - 5, cy + 2, 1, 2, dark);        // smile
        PX.rect(cx - 4, cy + 4, 2, 1, dark);
        PX.rect(cx - 2, cy + 5, 5, 1, dark);
        PX.rect(cx + 3, cy + 4, 2, 1, dark);
        PX.rect(cx + 5, cy + 2, 1, 2, dark);
      });
    }
  });
}

// Fair-weather cloud shapes: overlapping ellipses [cx, cy, rx, ry] cut off
// flat by the bottom of their canvas.
const CLOUD_SHAPES = [
  { w: 56, h: 17, blobs: [[9, 15, 8, 5], [20, 12, 10, 8], [32, 9, 12, 9], [44, 13, 9, 7], [51, 16, 5, 3]] },
  { w: 38, h: 13, blobs: [[7, 11, 6, 4], [17, 8, 9, 7], [28, 10, 8, 6], [34, 12, 4, 3]] },
  { w: 26, h: 9,  blobs: [[6, 8, 5, 3], [13, 6, 7, 5], [20, 7, 5, 4]] },
  { w: 66, h: 12, blobs: [[9, 11, 8, 3], [22, 9, 11, 6], [38, 8, 12, 7], [52, 10, 9, 5], [60, 11, 5, 3]] },
];

// Where each drifting cloud starts, how high it floats and how fast it goes
const FAIR_CLOUDS = [
  { shape: 0, x: 0.06, y: 0.10, speed: 0.80 },
  { shape: 1, x: 0.36, y: 0.05, speed: 0.60 },
  { shape: 3, x: 0.62, y: 0.26, speed: 0.70 },
  { shape: 2, x: 0.84, y: 0.14, speed: 0.50 },
  { shape: 1, x: 1.02, y: 0.34, speed: 0.65 },
];

// Paints one cloud: lit along its top-left edges, shaded underneath.
function paintCloud(shape, hi, body, shade) {
  const { w, h, blobs } = shape;
  const inside = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    for (const b of blobs) {
      const dx = (x - b[0]) / (b[2] + 0.4), dy = (y - b[1]) / (b[3] + 0.4);
      if (dx * dx + dy * dy <= 1) return true;
    }
    return false;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      let col = body;
      if (!inside(x, y - 1) || !inside(x - 1, y - 1)) col = hi;
      else if (!inside(x, y + 2) || !inside(x + 2, y + 1)) col = shade;
      else if (!inside(x, y + 3) && ((x + y) & 1) === 0) col = shade;
      PX.px(x, y, col);
    }
  }
}

// Drifting fair-weather clouds. They pick up the colour of the sky behind
// them (peach at sunset, slate at night) and fade out as bad weather rolls in.
function drawFairClouds(na) {
  const vis = constrain(1.0 - weatherAlpha * 1.2, 0, 1) * lerp(1.0, 0.6, na);
  if (vis <= 0.02) return;
  // Clouds are repainted only when the sky colour has moved on a step
  const step = Math.floor(timeOfDay * 240);
  const stops = skyStops();
  const skyMid = stops[Math.floor(stops.length / 2)], skyLow = stops[stops.length - 1];
  const hi    = PX.mix(PAL.white, skyLow, lerp(0.05, 0.62, na));
  const body  = PX.mix(PAL.white, skyLow, lerp(0.22, 0.72, na));
  const shade = PX.mix(PX.mix(PAL.white, skyMid, lerp(0.5, 0.85, na)), PAL.sl2, 0.18);
  const drift = (t * 0.25 + windX * 12) / 3;
  const span = PX.W + 90;
  PX.alpha(vis, () => {
    for (let i = 0; i < FAIR_CLOUDS.length; i++) {
      const fc = FAIR_CLOUDS[i], shape = CLOUD_SHAPES[fc.shape];
      const cv = sceneLayer('cloud' + fc.shape, shape.w, shape.h, step + '|' + Math.round(weatherAlpha * 10),
        () => paintCloud(shape, hi, body, shade));
      const x = (((fc.x * PX.W + drift * fc.speed) % span) + span) % span - 70;
      PX.c.drawImage(cv, Math.round(x), Math.round(4 + fc.y * PX.HOR));
    }
  });
}

// ── Lawn ──────────────────────────────────────────────

// Draws the lawn from the horizon to the front edge: mown in stripes that
// get taller toward the viewer, lighter in the distance, darker up close.
// Daylight colours only; sketch.js tints the garden for the time of day.
function drawGround() {
  const w = PX.W, h = PX.H - PX.HOR;
  const cv = sceneLayer('lawn', w, h, '', g => {
    // Shade of green for a tone value: below 0 is sunnier, above 0 is deeper
    const tone = v => sceneRgb(v < 0 ? PX.mix(PAL.gr3, PAL.gr2, Math.min(1, -v)) : PX.mix(PAL.gr3, PAL.gr4, Math.min(1, v)));
    const BANDS = 9;
    // Mowing stripes: band edges bunch up toward the horizon
    const bandOf = y => Math.min(BANDS - 1, Math.floor(BANDS * Math.pow(y / h, 0.62)));
    const bandTone = k => -0.34 + 0.62 * (k / (BANDS - 1)) + (k % 2 === 0 ? -0.1 : 0.1);
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const k = bandOf(y);
      const here = tone(bandTone(k));
      // The row where two stripes meet is a checkerboard of both
      const next = (y + 1 < h && bandOf(y + 1) !== k) ? tone(bandTone(k + 1)) : here;
      const fleckDark = tone(bandTone(k) + 0.42), fleckLight = tone(bandTone(k) - 0.4);
      for (let x = 0; x < w; x++) {
        let c = ((x + y) & 1) === 0 ? here : next;
        // Scattered flecks: short dark blades and the odd sunlit one
        const r = sceneHash(x, y), up = y > 0 ? sceneHash(x, y - 1) : 0.5;
        if (r < 0.007 || up < 0.007) c = fleckDark;
        else if (r > 0.995) c = fleckLight;
        const o = (y * w + x) * 4;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
  PX.c.drawImage(cv, 0, PX.HOR);
}
drawGround.pixel = true;

// Paints one grass tuft with its root at (x, y): three little blades whose
// tips lean left (-1), stand straight (0) or lean right (+1).
function paintTuft(x, y, dark, tall, wide, lean) {
  const blade = dark ? PAL.gr4 : PAL.gr2;
  const root  = dark ? PAL.gr5 : PAL.gr4;
  PX.rect(x - 1, y, 3, 1, root);                     // base
  PX.rect(x, y - tall + 1, 1, tall - 1, blade);      // middle blade
  PX.px(x + lean, y - tall, blade);                  // its tip
  PX.px(x - 2, y - 1, root);                         // left blade
  PX.px(x - 2 + lean, y - 2, blade);
  if (wide) {                                        // wider tufts get a right blade
    PX.px(x + 2, y - 1, root);
    PX.px(x + 2 + lean, y - 2, blade);
  }
}

// Every kind of tuft (2 colours x 3 heights x 2 widths x 3 leans) lives in
// one small sheet of 8x6 cells.
const TUFT_W = 8, TUFT_H = 6;
const TUFT_HOLD = 6;      // game frames each pose of the swaying grass is held

// Draws the grass tufts scattered over the lawn. Only their tips move,
// leaning with the wind and a slow sway of their own. All 600 tufts are
// stamped into one lawn-sized layer; the layer is redrawn every few frames
// (pixel-art animation holds its frames anyway) and copied to the screen
// in a single step, so the grass costs almost nothing.
function drawGrass() {
  const sheet = sceneLayer('tufts', TUFT_W * 3, TUFT_H * 12, '', () => {
    for (let kind = 0; kind < 12; kind++) {
      for (let lean = -1; lean <= 1; lean++) {
        paintTuft((lean + 1) * TUFT_W + 3, kind * TUFT_H + TUFT_H - 1,
                  kind >= 6, 2 + (kind % 6 >> 1), kind % 2 === 1, lean);
      }
    }
  });
  const layer = sceneLayer('grass', PX.W, PX.H - PX.HOR, Math.floor(t / TUFT_HOLD), g => {
    // Where each tuft stands only changes when the screen does
    const gridKey = PX.W + '|' + PX.H + '|' + PX.HOR;
    const cutoff = PX.HOR + 16;        // keep the sidewalk in front of the school clear
    const gust = windX * 1.3;
    for (const b of grassBlades) {
      if (b.gridKey !== gridKey) {
        const p = worldToPx(b.wx, b.wy);
        b.gridKey = gridKey;
        b.px = p.x - 3;
        b.py = p.y - PX.HOR - TUFT_H + 1;
        b.hidden = p.y < cutoff;
        const tall = b.h > 9.5 ? 2 : b.h > 7 ? 1 : 0;
        b.kind = (b.shade < 111 ? 6 : 0) + tall * 2 + (b.w > 1.2 ? 1 : 0);
      }
      if (b.hidden) continue;
      const s = Math.sin(t * 0.06 + b.phase) * 0.7 + gust + b.lean * 2;
      const lean = s > 0.5 ? 2 : s < -0.5 ? 0 : 1;
      g.drawImage(sheet, lean * TUFT_W, b.kind * TUFT_H, TUFT_W, TUFT_H, b.px, b.py, TUFT_W, TUFT_H);
    }
  });
  PX.c.drawImage(layer, 0, PX.HOR);
}
drawGrass.pixel = true;

// ── Trees ─────────────────────────────────────────────

// Trees along the back of the lawn, either side of the school.
// x is the world position, kind picks the painter below.
const TREE_SPOTS = [
  { x: 0.02, kind: 'pine' }, { x: 0.08, kind: 'maple' },
  { x: 0.92, kind: 'pine' }, { x: 0.98, kind: 'maple' },
];

// A pine: stacked tiers that get wider toward the ground. Lit on the left,
// shaded on the right and under each tier.
function paintPine(g, w, h) {
  const cx = Math.floor(w / 2);
  PX.rect(cx - 1, h - 7, 3, 7, PAL.wo3);
  PX.rect(cx + 1, h - 7, 1, 7, PAL.wo4);
  const tiers = [[23, 34, 10], [15, 27, 9], [7, 19, 7], [0, 11, 5]];   // [top, bottom, half-width]
  for (let ti = 0; ti < tiers.length; ti++) {
    const [y0, y1, hw] = tiers[ti];
    for (let y = y0; y <= y1; y++) {
      const f = (y - y0) / (y1 - y0);
      const half = Math.round(f * hw);
      for (let dx = -half; dx <= half; dx++) {
        let col = PAL.fo3;
        if (dx > half * 0.3) col = PAL.fo4;
        else if (dx < -half * 0.4) col = PAL.fo2;
        if (y === y1) col = dx > 0 ? PAL.fo5 : PAL.fo4;                 // underside
        else if (dx === -half && f > 0.35 && sceneHash(ti * 31 + y, 7) > 0.5) col = PAL.fo1;
        PX.px(cx + dx, y, col);
      }
      // Ragged fringe hanging below the tier
      if (y === y1) {
        for (let dx = -half + 1; dx <= half - 1; dx += 2) PX.px(cx + dx, y + 1, dx > 0 ? PAL.fo5 : PAL.fo4);
      }
    }
  }
  PX.px(cx, 0, PAL.fo2);
}

// A round maple: a trunk under a crown built from overlapping clumps.
function paintMaple(g, w, h) {
  const cx = Math.floor(w / 2);
  PX.rect(cx - 1, h - 14, 3, 14, PAL.wo3);
  PX.rect(cx + 1, h - 14, 1, 14, PAL.wo4);
  PX.rect(cx - 2, h - 2, 5, 2, PAL.wo3);
  PX.px(cx + 2, h - 1, PAL.wo4);
  PX.line(cx - 1, h - 13, cx - 4, h - 17, PAL.wo3);
  PX.line(cx + 1, h - 13, cx + 4, h - 17, PAL.wo4);
  const clumps = [[cx, 14, 10], [cx - 7, 16, 6], [cx + 7, 17, 6], [cx - 4, 8, 7], [cx + 4, 9, 7], [cx, 20, 7]];
  for (const [x, y, r] of clumps) PX.circle(x + 1, y + 1, r, PAL.fo5);     // deep shade, lower right
  for (const [x, y, r] of clumps) PX.circle(x, y, r, PAL.fo4);
  for (const [x, y, r] of clumps) PX.circle(x - 1, y - 1, r - 2, PAL.fo3);
  const lights = [[cx - 5, 6, 3], [cx + 3, 6, 3], [cx - 9, 13, 3], [cx - 2, 12, 3], [cx + 6, 13, 2], [cx - 4, 19, 2]];
  for (const [x, y, r] of lights) PX.circle(x, y, r, PAL.fo2);
  for (const [x, y, r] of lights) PX.rect(x - r + 1, y - r, Math.max(1, r - 1), 1, PAL.fo1);
}

const TREE_KINDS = {
  pine:  { w: 23, h: 42, paint: paintPine },
  maple: { w: 29, h: 40, paint: paintMaple },
};

// Draws the trees. Sway is done pixel-art style: the crown is cut into
// three slices and the upper slices slide sideways a pixel or two.
function drawTrees() {
  for (const spot of TREE_SPOTS) {
    const kind = TREE_KINDS[spot.kind];
    const cv = sceneLayer('tree_' + spot.kind, kind.w, kind.h, '', kind.paint);
    const x = Math.round(spot.x * PX.W) - Math.floor(kind.w / 2);
    const y = PX.HOR + 1 - kind.h;
    const sway = sin(t * 0.012 + spot.x * 15) * 1.1 + windX * 1.2;
    const topShift = constrain(Math.round(sway), -2, 2);
    const midShift = constrain(Math.round(sway * 0.5), -1, 1);
    const a = Math.round(kind.h * 0.3), b = Math.round(kind.h * 0.6);
    PX.shadow(x + Math.floor(kind.w / 2) + 2, PX.HOR + 1, kind.w - 4);
    PX.c.drawImage(cv, 0, b, kind.w, kind.h - b, x, y + b, kind.w, kind.h - b);
    PX.c.drawImage(cv, 0, a, kind.w, b - a, x + midShift, y + a, kind.w, b - a);
    PX.c.drawImage(cv, 0, 0, kind.w, a, x + topShift, y, kind.w, a);
  }
}
drawTrees.pixel = true;

// ── Robert Adams Middle School ────────────────────────

// Lettering for the sign on the school wall: bold capitals 8 pixels tall
// with two-pixel stems, so the name reads from across the room.
const SIGN_GLYPHS = {
  R: ['111110', '110011', '110011', '110011', '111110', '110110', '110011', '110011'],
  O: ['011110', '110011', '110011', '110011', '110011', '110011', '110011', '011110'],
  B: ['111110', '110011', '110011', '111110', '110011', '110011', '110011', '111110'],
  E: ['111111', '110000', '110000', '111110', '110000', '110000', '110000', '111111'],
  T: ['111111', '001100', '001100', '001100', '001100', '001100', '001100', '001100'],
  A: ['011110', '110011', '110011', '110011', '111111', '110011', '110011', '110011'],
  D: ['111110', '110011', '110011', '110011', '110011', '110011', '110011', '111110'],
  M: ['1100011', '1110111', '1111111', '1101011', '1100011', '1100011', '1100011', '1100011'],
  S: ['011111', '110000', '110000', '011110', '000011', '000011', '000011', '111110'],
  I: ['1111', '0110', '0110', '0110', '0110', '0110', '0110', '1111'],
  L: ['110000', '110000', '110000', '110000', '110000', '110000', '110000', '111111'],
  C: ['011110', '110011', '110000', '110000', '110000', '110000', '110011', '011110'],
  H: ['110011', '110011', '110011', '111111', '110011', '110011', '110011', '110011'],
};

// Width in art pixels of a line of sign lettering
function signWidth(str) {
  let w = 0;
  for (const ch of str) w += SIGN_GLYPHS[ch] ? SIGN_GLYPHS[ch][0].length + 1 : 4;
  return w - 1;
}

// Paints one line of sign lettering centred on cx, with a drop shadow.
function paintSign(str, cx, y, col, shadow) {
  for (const pass of [1, 0]) {
    let x = Math.round(cx - signWidth(str) / 2) + pass;
    for (const ch of str) {
      const glyph = SIGN_GLYPHS[ch];
      if (!glyph) { x += 4; continue; }
      for (let r = 0; r < glyph.length; r++) {
        for (let c = 0; c < glyph[r].length; c++) {
          if (glyph[r][c] === '1') PX.px(x + c, y + r + pass, pass ? shadow : col);
        }
      }
      x += glyph[0].length + 1;
    }
  }
}

// Works out where every part of the school goes. Widths stretch with the
// screen, heights are fixed so the doors always suit a 30px adult. The main
// entrance is centred on the middle of the screen (wx = 0.5) and every
// threshold sits at B = PX.HOR + 3 (see the School contract in the guide).
function schoolLayout() {
  const u = PX.W / 640;
  const v = Math.max(1, Math.min(1.5, PX.HOR / 97));   // taller screens get taller upper floors
  const cx = Math.round(PX.W / 2);
  const B = PX.HOR + 3;
  const X = n => cx + Math.round(n * u);
  // Height above the ground → art y. Everything up to the canopy is fixed.
  const Y = n => B - (n <= 45 ? n : 45 + Math.round((n - 45) * v));
  const towerHalf = Math.max(29, Math.round(29 * u));
  const midR = X(108);
  const midDoorX = Math.round((cx + towerHalf + midR) / 2) - 9;
  return {
    cx, B, X, Y,
    wingL: X(-258),          // far-left brick wing
    massL: X(-152),          // left brick mass with the sign
    towerL: cx - towerHalf,  // glass tower over the main entrance
    towerR: cx + towerHalf,
    midR,                    // centre brick section ends, sandstone wing begins
    midDoorX,                // left edge of the second entrance
    wingR: X(202),           // sandstone wing ends
    canopyR: X(216),         // the canopy runs a little past the building
    poleX: midDoorX - 10,    // flagpole, between the two entrances where it crosses no window
    poleTop: Y(82),
  };
}

// Evenly spaced x positions for a row of 11px windows between x0 and x1
function windowRow(x0, x1) {
  const n = Math.max(1, Math.floor((x1 - x0 - 11) / 13.5) + 1);
  const pitch = n > 1 ? (x1 - x0 - 11) / (n - 1) : 0;
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(Math.round(x0 + i * pitch));
  return xs;
}

// The lit-up version of every window and door, collected while the school
// is painted and replayed into the night-lights layer.
let SCHOOL_LIGHTS = [];

// A brick wall: flat colour flecked with darker and lighter bricks laid in
// running bond, a light left edge and a shaded right edge.
function paintBrick(x, y, w, h, base, dark, light) {
  PX.rect(x, y, w, h, base);
  for (let r = 0; r * 2 < h; r++) {
    const yy = y + r * 2;
    for (let bx = x - (r % 2) * 2; bx < x + w; bx += 4) {
      const k = sceneHash(bx * 3 + 11, yy);
      if (k > 0.14 && k < 0.90) continue;
      const x0 = Math.max(x, bx), x1 = Math.min(x + w, bx + 3);
      if (x1 > x0) PX.rect(x0, yy, x1 - x0, 1, k <= 0.14 ? dark : light);
    }
  }
  PX.rect(x, y, 1, h, light);
  PX.rect(x + w - 2, y, 2, h, dark);
}

// A sandstone wall: big blocks with shadowed joints.
function paintStone(x, y, w, h, base, dark, light) {
  PX.rect(x, y, w, h, base);
  for (let r = 0; r * 8 < h; r++) {
    const yy = y + r * 8;
    PX.rect(x, yy, w, 1, light);
    if (r > 0) PX.rect(x, yy - 1, w, 1, dark);
    for (let bx = x + (r % 2) * 7 + 6; bx < x + w - 1; bx += 14) {
      PX.rect(bx, yy + 1, 1, Math.min(6, y + h - yy - 1), dark);
    }
  }
  PX.rect(x, y, 1, h, light);
  PX.rect(x + w - 2, y, 2, h, dark);
}

// Slate-blue parapet capping a wall whose top is at y
function paintParapet(x, y, w) {
  PX.rect(x - 1, y - 4, w + 2, 4, PAL.sl2);
  PX.rect(x - 1, y - 4, w + 2, 1, PAL.sl1);
  PX.rect(x - 1, y - 1, w + 2, 1, PAL.sl3);
  PX.rect(x + w - 1, y - 3, 2, 2, PAL.sl3);
  PX.alpha(0.22, () => PX.rect(x, y, w, 1, PAL.ink));     // its shadow on the wall
}

// One classroom window. Most have their lights on at night.
function paintWindow(x, y, sill) {
  PX.spr('schoolWin', x, y, { pal: { s: sill } });
  if (sceneHash(x * 7 + 3, y * 13 + 1) < 0.72) {
    SCHOOL_LIGHTS.push(() => PX.spr('schoolWinLit', x, y));
  }
}

// A tall strip of tower glass: two panes wide, crossed by transoms.
function paintTallGlass(x, y, h) {
  const w = 11;
  const glass = (top, mid, low, bar, tr) => {
    for (let r = 0; r < h - 2; r++) {
      const f = r / (h - 2);
      const col = f < 0.3 ? top : f < 0.7 ? mid : low;
      PX.rect(x + 1, y + 1 + r, 4, 1, col);
      PX.rect(x + 6, y + 1 + r, 4, 1, col);
    }
    PX.rect(x + 5, y + 1, 1, h - 2, bar);
    for (let r = 8; r < h - 3; r += 8) PX.rect(x + 1, y + r, w - 2, 1, tr);
  };
  PX.rect(x, y, w, h, PAL.sl3);
  glass(PAL.sk2, PAL.sk3, PAL.sl1, PAL.g1, PAL.sl2);
  // Sky glints running down the glass
  for (let r = 2; r < h - 4; r += 8) {
    PX.px(x + 3, y + r, PAL.sk1); PX.px(x + 2, y + r + 1, PAL.sk1); PX.px(x + 1, y + r + 2, PAL.sk1);
    PX.px(x + 9, y + r + 2, PAL.sk1); PX.px(x + 8, y + r + 3, PAL.sk1); PX.px(x + 7, y + r + 4, PAL.sk1);
  }
  SCHOOL_LIGHTS.push(() => glass(PAL.ye1, PAL.ye1, PAL.ye2, PAL.ye4, PAL.ye3));
}

// A pair of wooden entrance doors with glass slits under a transom window.
// (x, B) is the bottom-left corner; w should be even. h includes the frame.
function paintDoor(x, B, w, h) {
  const y = B - h;
  const lw = (w - 2) / 2;                      // one door leaf
  PX.rect(x, y, w, h, PAL.g5);                 // frame
  PX.rect(x + 1, y + 1, w - 2, 4, PAL.sk3);    // transom glass
  PX.rect(x + 1, y + 1, w - 2, 1, PAL.sk2);
  PX.rect(x + w / 2 - 1, y + 1, 1, 4, PAL.g5);
  for (let k = 0; k < 2; k++) {
    const lx = x + 1 + k * lw;
    PX.rect(lx, y + 6, lw, h - 6, PAL.wo3);
    PX.rect(lx, y + 6, lw, 1, PAL.wo2);                           // light catches the top rail
    PX.rect(lx + (k === 0 ? 0 : lw - 1), y + 6, 1, h - 6, PAL.wo2);
    PX.rect(lx + Math.floor((lw - 3) / 2), y + 9, 3, 14, PAL.g5); // glass slit and its frame
    PX.rect(lx + Math.floor((lw - 3) / 2) + 1, y + 10, 1, 12, PAL.sk3);
    PX.rect(lx + Math.floor((lw - 3) / 2) + 1, y + 10, 1, 3, PAL.sk2);
    PX.rect(lx, B - 3, lw, 3, PAL.wo4);                           // kick plate
    PX.rect(lx + (k === 0 ? lw - 2 : 1), y + 25, 1, 3, PAL.ye2);  // handle
  }
  PX.rect(x + w / 2 - 1, y + 6, 1, h - 6, PAL.wo4);               // where the doors meet
  PX.rect(x + w / 2, y + 6, 1, h - 6, PAL.wo4);
  SCHOOL_LIGHTS.push(() => {
    PX.rect(x + 1, y + 1, w - 2, 4, PAL.ye1);
    PX.rect(x + w / 2 - 1, y + 1, 1, 4, PAL.ye4);
    for (let k = 0; k < 2; k++) {
      PX.rect(x + 1 + k * lw + Math.floor((lw - 3) / 2) + 1, y + 10, 1, 12, PAL.ye1);
    }
  });
}

// A white canopy column from yTop down to the sidewalk
function paintColumn(x, yTop, B) {
  PX.rect(x, yTop, 3, B - yTop, PAL.white);
  PX.rect(x + 2, yTop, 1, B - yTop, PAL.g2);
  PX.rect(x - 1, yTop, 5, 1, PAL.g2);
  PX.rect(x - 1, B - 2, 5, 2, PAL.g1);
  PX.rect(x + 2, B - 2, 2, 2, PAL.g3);
}

// The white picket fence along the back of the lawn. It is painted before
// the building, so the school stands in front of it.
function paintFence(B) {
  const w = PX.W;
  PX.rect(0, B - 7, w, 1, PAL.g1);         // rails behind the pickets
  PX.rect(0, B - 6, w, 1, PAL.g3);
  PX.rect(0, B - 3, w, 1, PAL.g1);
  PX.rect(0, B - 2, w, 1, PAL.g3);
  for (let x = 1; x < w; x += 5) {
    PX.rect(x, B - 9, 3, 9, PAL.white);
    PX.rect(x + 2, B - 9, 1, 9, PAL.g2);
    PX.px(x + 1, B - 10, PAL.white);       // pointed top
  }
}

// The sidewalk along the front of the building, PX.HOR + 3 .. PX.HOR + 12
function paintSidewalk(B) {
  const w = PX.W;
  PX.rect(0, B, w, 10, PAL.g1);
  PX.rect(0, B, w, 1, PAL.white);
  PX.rect(0, B + 8, w, 1, PAL.g2);
  PX.rect(0, B + 9, w, 1, PAL.g3);
  for (let x = (PX.W >> 1) % 22 - 11; x < w; x += 22) PX.rect(x, B + 1, 1, 8, PAL.g2);   // expansion joints
  for (let i = 0; i < w / 6; i++) {                                                     // grit
    PX.px(Math.floor(sceneHash(i, 91) * w), B + 2 + Math.floor(sceneHash(i, 17) * 6), PAL.g2);
  }
  PX.alpha(0.3, () => PX.rect(0, B + 10, w, 1, PAL.ink));   // the kerb's shadow on the grass
}

// Paints the whole school (and the fence and sidewalk) into its layer.
// Left to right: far-left brick wing with a side door, the taller brick mass
// carrying the sign, the pale glass tower with its penthouse over the main
// entrance, a lower brick section, and the sandstone wing; a long white
// canopy on columns runs from the tower to past the end of the building.
function paintSchool(L) {
  const { B, Y, cx } = L;
  SCHOOL_LIGHTS = [];
  paintFence(B);
  paintSidewalk(B);

  // ── Far-left wing ──
  const wingW = L.massL - L.wingL;
  paintBrick(L.wingL, Y(66), wingW, B - Y(66), PAL.br3, PAL.br4, PAL.br2);
  paintParapet(L.wingL, Y(66), wingW);
  // Recessed side-door bay
  PX.rect(L.wingL + 2, Y(46), 26, 46, PAL.br4);
  PX.rect(L.wingL + 2, Y(46), 26, 2, PAL.br5);
  PX.rect(L.wingL + 2, Y(46), 1, 46, PAL.br5);
  paintDoor(L.wingL + 7, B, 16, 35);
  PX.rect(L.wingL + 13, Y(42), 4, 1, PAL.g4);         // lamp over the door
  PX.rect(L.wingL + 14, Y(41), 2, 2, PAL.ye1);
  for (const wx of windowRow(L.wingL + 34, L.massL - 6)) {
    paintWindow(wx, Y(62), PAL.br1);
    paintWindow(wx, Y(30), PAL.br1);
  }

  // ── Centre brick section (behind the canopy) ──
  const midW = L.midR - L.towerR;
  paintBrick(L.towerR, Y(64), midW, B - Y(64), PAL.br2, PAL.br3, PAL.br1);
  paintParapet(L.towerR, Y(64), midW);
  const midDoorX = L.midDoorX;
  for (const wx of windowRow(L.towerR + 9, L.midR - 9)) paintWindow(wx, Y(61), PAL.br1);
  paintWindow(midDoorX - 25, Y(30), PAL.br1);
  paintWindow(midDoorX + 30, Y(30), PAL.br1);
  paintDoor(midDoorX, B, 18, 36);

  // ── Sandstone wing ──
  const stoneW = L.wingR - L.midR;
  paintStone(L.midR, Y(68), stoneW, B - Y(68), PAL.ta2, PAL.ta3, PAL.ta1);
  paintParapet(L.midR, Y(68), stoneW);
  // End-door bay in darker stone
  PX.rect(L.wingR - 30, Y(40), 28, 40, PAL.ta3);
  PX.rect(L.wingR - 30, Y(40), 1, 40, PAL.ta4);
  paintDoor(L.wingR - 24, B, 16, 35);
  const lowerXs = windowRow(L.midR + 8, L.wingR - 43);
  const pitch = lowerXs.length > 1 ? lowerXs[1] - lowerXs[0] : 14;
  for (const wx of lowerXs) paintWindow(wx, Y(30), PAL.ta1);
  for (let wx = lowerXs[0]; wx + 11 <= L.wingR - 4; wx += pitch) paintWindow(wx, Y(64), PAL.ta1);

  // ── Left brick mass with the sign ──
  const massW = L.towerL - L.massL;
  paintBrick(L.massL, Y(70), massW, B - Y(70), PAL.br2, PAL.br3, PAL.br1);
  paintParapet(L.massL, Y(70), massW);
  // Recessed bay in the middle of the ground floor
  const bayW = 38, bayX = L.massL + Math.round((massW - bayW) / 2);
  PX.rect(bayX, Y(36), bayW, 36, PAL.br3);
  PX.rect(bayX, Y(36), bayW, 2, PAL.br4);
  PX.rect(bayX, Y(36), 1, 36, PAL.br4);
  paintWindow(bayX + 6, Y(30), PAL.br2);
  paintWindow(bayX + 21, Y(30), PAL.br2);
  if (bayX - L.massL > 34) {
    for (const wx of windowRow(L.massL + 9, bayX - 9)) paintWindow(wx, Y(30), PAL.br1);
    for (const wx of windowRow(bayX + bayW + 8, L.towerL - 8)) paintWindow(wx, Y(30), PAL.br1);
  }
  const signX = L.massL + Math.round(massW / 2);
  paintSign('ROBERT ADAMS', signX, Y(66), PAL.white, PAL.br4);
  paintSign('MIDDLE SCHOOL', signX, Y(55), PAL.white, PAL.br4);

  // ── Glass tower ──
  const towerW = L.towerR - L.towerL;
  PX.rect(L.towerL, Y(80), towerW, B - Y(80), PAL.g1);
  for (let y = Y(80) + 11; y < Y(48); y += 12) PX.rect(L.towerL, y, towerW, 1, PAL.g2);   // cladding joints
  PX.rect(L.towerL, Y(80), 1, B - Y(80), PAL.white);
  PX.rect(L.towerR - 3, Y(80), 3, B - Y(80), PAL.g2);
  paintParapet(L.towerL, Y(80), towerW);
  // Penthouse on the roof
  PX.rect(L.towerL + 11, Y(84) - 7, towerW - 22, 7, PAL.sl2);
  PX.rect(L.towerL + 11, Y(84) - 7, towerW - 22, 1, PAL.sl1);
  PX.rect(L.towerL + 11, Y(84) - 7, 1, 7, PAL.sl1);
  PX.rect(L.towerR - 14, Y(84) - 6, 3, 6, PAL.sl3);
  // Three tall strips of glass
  const glassX = L.towerL + Math.round((towerW - 45) / 2);
  for (let i = 0; i < 3; i++) paintTallGlass(glassX + i * 17, Y(76), Y(50) - Y(76));
  // The tower throws a shadow onto the lower wall to its right
  PX.alpha(0.2, () => PX.rect(L.towerR, Y(64), 5, Y(45) - Y(64), PAL.ink));

  // ── Main entrance: a glass storefront at the foot of the tower ──
  PX.rect(L.towerL + 3, Y(37), towerW - 6, 37, PAL.g5);
  for (const sx of [L.towerL + 4, L.towerR - 8]) {       // side lights
    PX.rect(sx, Y(36), 4, 35, PAL.sk3);
    PX.rect(sx, Y(36), 1, 12, PAL.sk2);
    PX.rect(sx, Y(8), 4, 1, PAL.g5);
    SCHOOL_LIGHTS.push(() => PX.rect(sx, Y(36), 4, 28, PAL.ye1));
  }
  paintDoor(cx - 21, B, 20, 36);
  paintDoor(cx + 1, B, 20, 36);
  // At night the sign is lit and light spills out of the entrance onto the sidewalk
  SCHOOL_LIGHTS.push(() => {
    paintSign('ROBERT ADAMS', signX, Y(66), PAL.cream, PAL.br4);
    paintSign('MIDDLE SCHOOL', signX, Y(55), PAL.cream, PAL.br4);
    PX.alpha(0.3, () => { for (let r = 0; r < 8; r++) PX.rect(cx - 21 - r, B + r, 42 + r * 2, 1, PAL.ye1); });
  });

  // ── Canopy ──
  const canL = L.towerL - 3, canW = L.canopyR - canL;
  PX.alpha(0.24, () => PX.rect(L.towerL, Y(38), L.wingR - L.towerL, 3, PAL.ink));   // shade under it
  PX.rect(canL, Y(45), canW, 7, PAL.g1);
  PX.rect(canL, Y(45), canW, 2, PAL.white);
  PX.rect(canL, Y(40), canW, 1, PAL.g2);
  PX.rect(canL, Y(39), canW, 1, PAL.g3);
  PX.rect(canL + canW - 1, Y(44), 1, 6, PAL.g2);
  // Columns, placed in the gaps between doors and windows
  const cols = [L.towerL - 2, L.towerR - 1, midDoorX - 6, midDoorX + 21, L.midR - 2, L.canopyR - 5];
  for (let i = 1; i < lowerXs.length; i += 2) cols.push(lowerXs[i] + 11 + Math.max(0, Math.floor((pitch - 14) / 2)));
  for (const colX of cols) paintColumn(colX, Y(38), B);

  // ── Flagpole on the edge of the lawn (the flag itself is animated) ──
  const poleBase = B + 12;
  PX.rect(L.poleX, L.poleTop, 2, poleBase - L.poleTop, PAL.g2);
  PX.rect(L.poleX, L.poleTop, 1, poleBase - L.poleTop, PAL.g1);
  PX.rect(L.poleX - 1, L.poleTop - 2, 4, 2, PAL.ye2);         // gold ball on top
  PX.rect(L.poleX, L.poleTop - 3, 2, 1, PAL.ye1);
  PX.rect(L.poleX - 2, poleBase - 2, 6, 3, PAL.g3);           // concrete footing
  PX.rect(L.poleX - 2, poleBase - 2, 6, 1, PAL.g2);
}

// Paints only the glowing glass, to be laid over the night-tinted school.
function paintSchoolLights() {
  for (const paint of SCHOOL_LIGHTS) paint();
}

// The US flag, waving. The flag is painted flat once (in sunlight and in
// shade, side by side); each frame every column rides a travelling ripple,
// and the falling side of each ripple is drawn from the shaded copy.
const FLAG_W = 22, FLAG_H = 13;

function paintFlag() {
  for (let shade = 0; shade < 2; shade++) {
    for (let i = 0; i < FLAG_W; i++) {
      for (let r = 0; r < FLAG_H; r++) {
        let col;
        if (i < 9 && r < 7) {
          col = (i % 2 === 1 && r % 2 === 1) ? PAL.white : (shade ? PAL.bl4 : PAL.bl3);   // stars on blue
        } else {
          col = r % 2 === 0 ? (shade ? PAL.re3 : PAL.re2) : (shade ? PAL.g2 : PAL.white);
        }
        PX.px(shade * FLAG_W + i, r, col);
      }
    }
  }
}

function drawSchoolFlag(x, y, tick, gust) {
  const flat = sceneLayer('flag', FLAG_W * 2, FLAG_H, '', paintFlag);
  const amp = 1.2 + Math.min(1, Math.abs(gust)) * 0.8;
  for (let i = 0; i < FLAG_W; i++) {
    const ph = i * 0.5 - tick * 0.13;
    const dy = Math.round(Math.sin(ph) * amp * (i / (FLAG_W - 1)));
    const shade = Math.cos(ph) < -0.3 && i > 2;
    PX.c.drawImage(flat, (shade ? FLAG_W : 0) + i, 0, 1, FLAG_H, x + i, y + dy, 1, FLAG_H);
  }
}

// Draws the school: the pre-painted building, the waving flag, and at
// night (or under storm clouds) the warm light in its windows.
function drawSchool() {
  const L = schoolLayout();
  const h = L.B + 14;
  const cv = sceneLayer('school', PX.W, h, '', () => paintSchool(L));
  PX.c.drawImage(cv, 0, 0);
  drawSchoolFlag(L.poleX + 2, L.poleTop + 1, t, windX);

  // Windows glow warm at night; the lights also come on in a storm
  const na = nightAmount();
  const glow = Math.max(constrain((na - 0.2) / 0.4, 0, 1), constrain((weatherAlpha - 0.55) * 2, 0, 0.75));
  if (glow > 0.02) {
    PX.light(() => {
      const lit = sceneLayer('schoolLit', PX.W, h, '', paintSchoolLights);
      PX.alpha(glow, () => PX.c.drawImage(lit, 0, 0));
    });
  }
}
drawSchool.pixel = true;

// ── Fireflies ────────────────────────────────────────

// Spawns, moves and draws the pulsing fireflies that come out at night.
// Positions are in art pixels. The glow is queued with PX.light so it is
// never dulled by the night tint.
function updateAndDrawFireflies() {
  const na = nightAmount();
  const top = PX.HOR + 7, bottom = PX.H - 10;

  // Spawn/despawn fireflies based on night
  if (na > 0.3 && fireflies.length < NUM_FIREFLIES) {
    fireflies.push({
      x: random(0, PX.W),
      y: random(PX.HOR, PX.H - 7),
      tx: random(13, PX.W - 13),
      ty: random(top, bottom),
      speed: random(0.3, 0.8),
      phase: random(TWO_PI),
      pulseSpeed: random(0.03, 0.07),
      hue: random(55, 75),
      size: random(3, 5)
    });
  }
  if (na < 0.1) {
    fireflies = [];
    return;
  }

  for (const f of fireflies) {
    // Drift toward target
    f.x = lerp(f.x, f.tx, 0.005 * f.speed);
    f.y = lerp(f.y, f.ty, 0.005 * f.speed);
    // Gentle sine wobble
    f.y += sin(t * 0.04 + f.phase) * 0.17;
    f.x += cos(t * 0.03 + f.phase * 1.3) * 0.1;
    // Pick new target when close
    if (dist(f.x, f.y, f.tx, f.ty) < 7) {
      f.tx = random(13, PX.W - 13);
      f.ty = random(top, bottom);
    }
  }

  PX.light(() => {
    for (const f of fireflies) {
      // Pulsing glow: dark → ember → glow → flash
      const pulse = (sin(t * f.pulseSpeed + f.phase) * 0.5 + 0.5) * na;
      if (pulse < 0.18) continue;
      const green = f.hue > 66;                   // some flash yellow-green, some gold
      const pal = green ? { g: PAL.gr1, d: PAL.gr2 } : null;
      if (pulse > 0.45) {
        const r = pulse > 0.75 ? Math.round(f.size) + 1 : Math.round(f.size) - 1;
        PX.alpha(0.55, () => drawSceneDisc(f.x, f.y, r, green ? PAL.gr1 : PAL.ye2, 0.25));
      }
      PX.spr('firefly', f.x, f.y, { frame: pulse > 0.75 ? 'flash' : pulse > 0.45 ? 'glow' : 'dim', pal });
    }
  });
}
updateAndDrawFireflies.pixel = true;

// ── I SPY card art ───────────────────────────────────

// A small Robert Adams Middle School for its I SPY card: about 120 wide and
// 58 tall, standing on (x, y) at its bottom centre. The card enlarges it.
CARD_ART.school = (x, y, tick) => {
  x = Math.round(x); y = Math.round(y);
  const B = y - 3;                                   // building stands on a strip of sidewalk
  const wall = (x0, w, h, base, dark, light) => {
    PX.rect(x0, B - h, w, h, base);
    PX.rect(x0, B - h, 1, h, light);
    PX.rect(x0 + w - 1, B - h, 1, h, dark);
    PX.rect(x0 - 1, B - h - 2, w + 2, 2, PAL.sl2);   // parapet
    PX.rect(x0 - 1, B - h - 2, w + 2, 1, PAL.sl1);
  };
  const win = (wx, wy) => {
    PX.rect(wx, wy, 4, 5, PAL.sl3);
    PX.rect(wx + 1, wy + 1, 2, 3, PAL.sk3);
    PX.px(wx + 1, wy + 1, PAL.sk1);
  };
  const door = (dx, w) => {
    PX.rect(dx, B - 11, w, 11, PAL.g5);
    PX.rect(dx + 1, B - 10, w - 2, 2, PAL.sk3);
    PX.rect(dx + 1, B - 7, w - 2, 7, PAL.wo3);
    PX.rect(dx + (w >> 1), B - 7, 1, 7, PAL.wo4);
  };
  // Lawn and sidewalk
  PX.rect(x - 62, y - 3, 124, 3, PAL.g1);
  PX.rect(x - 62, y - 3, 124, 1, PAL.white);
  PX.rect(x - 62, y - 1, 124, 1, PAL.g3);
  // Far-left wing
  wall(x - 60, 24, 24, PAL.br3, PAL.br4, PAL.br2);
  PX.rect(x - 59, B - 14, 8, 14, PAL.br4);
  door(x - 58, 6);
  for (let i = 0; i < 3; i++) { win(x - 49 + i * 5, B - 21); win(x - 49 + i * 5, B - 10); }
  // Sandstone wing
  wall(x + 26, 28, 26, PAL.ta2, PAL.ta3, PAL.ta1);
  for (let i = 0; i < 5; i++) win(x + 28 + i * 5, B - 23);
  for (let i = 0; i < 3; i++) win(x + 28 + i * 5, B - 10);
  PX.rect(x + 44, B - 15, 9, 15, PAL.ta3);
  door(x + 46, 6);
  // Centre brick section
  wall(x + 7, 19, 23, PAL.br2, PAL.br3, PAL.br1);
  for (let i = 0; i < 3; i++) win(x + 10 + i * 5, B - 21);
  door(x + 14, 6);
  // Left mass with the sign
  wall(x - 36, 29, 30, PAL.br2, PAL.br3, PAL.br1);
  PX.rect(x - 32, B - 26, 21, 1, PAL.white);         // the sign, too small to read
  PX.rect(x - 32, B - 24, 9, 1, PAL.white);
  PX.rect(x - 22, B - 24, 11, 1, PAL.white);
  PX.rect(x - 30, B - 21, 7, 1, PAL.white);
  PX.rect(x - 22, B - 21, 9, 1, PAL.white);
  PX.rect(x - 28, B - 12, 12, 12, PAL.br3);
  win(x - 27, B - 9); win(x - 21, B - 9);
  // Glass tower and penthouse
  wall(x - 8, 16, 34, PAL.g1, PAL.g2, PAL.white);
  PX.rect(x - 4, B - 39, 8, 3, PAL.sl2);
  PX.rect(x - 4, B - 39, 8, 1, PAL.sl1);
  for (let i = 0; i < 3; i++) {
    PX.rect(x - 6 + i * 4, B - 32, 3, 14, PAL.sl3);
    PX.rect(x - 5 + i * 4, B - 31, 1, 12, PAL.sk3);
    PX.rect(x - 5 + i * 4, B - 31, 1, 4, PAL.sk1);
  }
  PX.rect(x - 7, B - 12, 14, 12, PAL.g5);
  door(x - 6, 6); door(x, 6);
  // Canopy on columns
  PX.rect(x - 9, B - 15, 66, 3, PAL.g1);
  PX.rect(x - 9, B - 15, 66, 1, PAL.white);
  PX.rect(x - 9, B - 13, 66, 1, PAL.g2);
  for (const cxo of [-9, 7, 13, 21, 27, 36, 44, 55]) {
    PX.rect(x + cxo, B - 12, 1, 12, PAL.white);
  }
  // Flagpole and a little waving flag
  PX.rect(x + 11, B - 36, 1, 39, PAL.g2);
  PX.px(x + 11, B - 37, PAL.ye2);
  for (let i = 0; i < 8; i++) {
    const dy = Math.round(Math.sin(i * 0.9 - tick * 0.13) * 0.8 * (i / 7));
    for (let r = 0; r < 5; r++) {
      const col = (i < 3 && r < 3) ? PAL.bl3 : (r % 2 === 0 ? PAL.re2 : PAL.white);
      PX.px(x + 12 + i, B - 36 + dy + r, col);
    }
  }
};
