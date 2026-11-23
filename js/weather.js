// ================================================================
// File: weather.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Weather system with state machine (sunny/cloudy/rainy/
//   stormy/clearing), drawn as pixel art: chunky storm clouds that
//   build up over the sky, far and near rain with splashes, puddles,
//   a jagged lightning bolt, a banded rainbow, and the NOW / FORECAST
//   panel. Also keeps the ambient sound loops (birds, rain, night) in
//   step with the weather and the time of day.
// ================================================================

// ── Weather System ────────────────────────────────────

// How hard it is raining right now, 0..1. Eases toward 0.6 in rain and 1 in
// a storm, so showers thicken and thin out instead of switching on and off.
let rainAmount = 0;
// How visible the rainbow is, 0..1. Eases in while the weather is clearing.
let rainbowAmount = 0;
// The current lightning bolt: a list of [x0, y0, x1, y1, thickness] in art pixels.
let lightningBolt = [];
// What the ambient loops were last told to do, so the M (mute) key sticks
// until the weather or the time of day next changes.
const ambientSound = { birds: null, rain: null, night: null };

// Create a new far raindrop (falls through the sky, behind the garden).
// Positions and speeds are in art pixels.
function newRaindrop() {
  return {
    x:     random(-10, PX.W + 10),
    y:     random(-PX.HOR * 0.3, PX.HOR * 0.55),
    len:   floor(random(2, 5)),
    speed: random(2.4, 4.2)
  };
}

// Create a new foreground raindrop. Each one aims for its own spot on the
// lawn (gy), so splashes land all over the garden rather than in one line.
// Drops start parked (on = false) and are released as the rain builds.
function newFgRaindrop() {
  const drop = { x: 0, y: 0, len: 4, speed: 4, gy: 0, on: false,
                 splashT: 0, splashX: 0, splashY: 0 };
  aimFgRaindrop(drop);
  return drop;
}

// Sends a foreground drop back above the screen with a new landing spot.
// Drops that land near the horizon are farther away: shorter and slower.
function aimFgRaindrop(drop) {
  const depth = random();
  drop.gy    = PX.HOR + 5 + depth * (PX.H - PX.HOR + 8);
  drop.len   = round(lerp(3, 9, depth));
  drop.speed = lerp(3.2, 6.4, depth) * random(0.9, 1.1);
  drop.x     = random(-20, PX.W + 20);
  drop.y     = -random(4, PX.H * 0.7);
}

// Advance the weather state machine, transitioning between weather states on timer
function updateWeather() {
  weatherTimer--;

  if (weatherTimer <= 0) {
    weatherState    = nextWeatherState;
    weatherDuration = floor(random(1800, 4200));
    weatherTimer    = weatherDuration;

    const options = {
      sunny:    ['cloudy'],
      cloudy:   ['sunny', 'rainy', 'stormy'],
      rainy:    ['cloudy', 'clearing'],
      stormy:   ['rainy', 'clearing'],
      clearing: ['sunny']
    };
    const next = options[weatherState];
    nextWeatherState = next[floor(random(next.length))];
  }

  const targets = { sunny:0, cloudy:0.4, rainy:0.75, stormy:1.0, clearing:0.2 };
  weatherAlpha = lerp(weatherAlpha, targets[weatherState], 0.002);

  const isRaining = (weatherState === 'rainy' || weatherState === 'stormy');
  rainBoost = isRaining ? 0.001 : 0;

  // Rain thickens and thins over a second or two
  const rainTarget = weatherState === 'stormy' ? 1.0 : (weatherState === 'rainy' ? 0.6 : 0);
  rainAmount = lerp(rainAmount, rainTarget, 0.03);
  if (abs(rainAmount - rainTarget) < 0.005) rainAmount = rainTarget;

  // The rainbow comes out while the sky clears, in daylight only
  const rainbowTarget = (weatherState === 'clearing' && nightAmount() < 0.3) ? 1 : 0;
  rainbowAmount = lerp(rainbowAmount, rainbowTarget, 0.015);
  if (rainbowAmount < 0.004) rainbowAmount = 0;

  if (weatherState === 'stormy') {
    lightningTimer--;
    if (lightningTimer <= 0) {
      soundPlay(lightning);
      lightningAlpha = 220;
      lightningTimer = floor(random(90, 300));
      makeLightningBolt();
    }
  }
  lightningAlpha = max(0, lightningAlpha - 18);

  updateWeatherSounds(isRaining);
}

// Keeps the ambient loops matched to the weather and time of day:
// birds by day in dry weather, the rain loop when it rains, and the
// night sound after dark.
function updateWeatherSounds(isRaining) {
  const na = nightAmount();
  setAmbientSound('night', nightSound, na > 0.3);
  setAmbientSound('rain',  rain,       isRaining);
  setAmbientSound('birds', birds,      na < 0.3 && !isRaining);
}

// Starts or pauses one ambient loop, but only when what we want from it
// changes (or it has just finished loading). Leaving it alone in between
// lets the M key mute the birds without being overruled the next frame.
function setAmbientSound(slot, snd, want) {
  if (ambientSound[slot] === want) return;
  if (!soundReady(snd)) return;        // not loaded yet: try again next frame
  if (want) soundLoop(snd); else soundPause(snd);
  ambientSound[slot] = want;
}

// ── Storm clouds ──────────────────────────────────────
// Clouds are built once as small bitmaps of "shade numbers" (highlight,
// light, mid, dark) from lists of overlapping round lumps, lit from the
// top-left like everything else in the garden. Each frame they are only
// blitted; they are repainted when their colours change (as the storm
// darkens or night falls), never rebuilt.

const WEATHER_CLOUDS = {
  built: false,
  near: null,       // the heavy overcast ceiling along the top of the sky
  far: null,        // a second, paler ceiling behind it
  drifting: [],     // individual cumulus clouds
  palKey: ''
};

// Small repeatable random number generator, so the clouds have the same
// shapes every time and do not disturb p5's random sequence.
function weatherRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Builds one cloud bitmap from lumps [{ x, y, r }]. Later lumps are in
// front of earlier ones. opts.wrap makes it tile sideways (for the
// ceilings); opts.solid fills everything above that row (the cloud mass).
function makeCloudBitmap(w, h, lumps, opts) {
  opts = opts || {};
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const shade = new Uint8Array(w * h);   // 0 clear, 1 highlight, 2 light, 3 mid, 4 dark
  const base = h - 1;                    // flat bottom row of a cumulus
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      if (opts.solid !== undefined && y <= opts.solid) s = 3;
      for (const L of lumps) {
        let dx = x - L.x;
        if (opts.wrap) {
          if (dx > w / 2) dx -= w;
          if (dx < -w / 2) dx += w;
        }
        const dy = y - L.y;
        const rr = (L.r + 0.35) * (L.r + 0.35);
        if (dx * dx + dy * dy > rr) continue;
        // Each lump is shaded like a ball lit from the top-left: a bright
        // crescent on its upper left, a shadow crescent on its lower right.
        const r = L.r;
        const hx = dx - 0.18 * r, hy = dy - 0.26 * r;
        const sx = dx + 0.20 * r, sy = dy + 0.30 * r;
        if (hx * hx + hy * hy > 0.9 * r * 0.9 * r) s = 1;
        else if (sx * sx + sy * sy > 0.86 * r * 0.86 * r) s = 3;
        else s = 2;
      }
      if (s && !opts.wrap) {
        // Separate cumulus: flat, shaded underside
        if (y >= base - 1) s = 4;
        else if (y >= base - Math.round(h * 0.2) && s < 3) s = 3;
      } else if (s && opts.wrap) {
        // The ceilings are seen from underneath, so everything is a tone darker
        s = Math.min(4, s + 1);
        if (y < 3) s = 4;
      }
      shade[y * w + x] = s;
    }
  }
  const bmp = { w, h, ax: 0, ay: 0, shade, ctx, img: ctx.createImageData(w, h) };
  bmp.frames = [{ cv, fl: cv }];   // shaped like a PX sprite, so PX.spr can draw it
  return bmp;
}

// Fills a cloud bitmap with four colours [highlight, light, mid, dark].
function paintCloudBitmap(bmp, cols) {
  const rgb = cols.map(c => { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; });
  const d = bmp.img.data;
  for (let i = 0; i < bmp.shade.length; i++) {
    const s = bmp.shade[i];
    if (s) {
      const c = rgb[s - 1];
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
    } else {
      d[i * 4 + 3] = 0;
    }
  }
  bmp.ctx.putImageData(bmp.img, 0, 0);
}

// Lumps for one cumulus cloud w wide and h tall: big domes behind,
// smaller puffs along the flat base in front.
function cumulusLumps(w, h, rnd) {
  const lumps = [];
  const domes = max(2, round(w / 24));
  for (let i = 0; i < domes; i++) {
    const k = (i + 0.5) / domes;
    const r = h * (0.34 + 0.14 * sin(k * PI)) * (0.9 + rnd() * 0.25);
    lumps.push({ x: w * (0.2 + 0.6 * k) + (rnd() - 0.5) * 5, y: max(r, h - 1 - r * (0.9 + rnd() * 0.3)), r });
  }
  const puffs = max(3, round(w / 11));
  for (let i = 0; i < puffs; i++) {
    const k = (i + 0.5) / puffs;
    const r = h * (0.2 + rnd() * 0.1);
    lumps.push({ x: r + (w - 2 * r) * k + (rnd() - 0.5) * 3, y: h - 1 - r * (0.55 + rnd() * 0.35), r });
  }
  return lumps;
}

// Lumps for a tiling ceiling strip: a row of billows inside the mass and
// a row of hanging puffs along its bottom edge.
function ceilingLumps(w, h, rnd, rMin, rMax) {
  const lumps = [];
  for (let x = 0; x < w - rMin; x += rMin * 1.5 + rnd() * rMin) {
    const r = rMin + rnd() * (rMax - rMin);
    lumps.push({ x, y: h * 0.42 - r * 0.2 + rnd() * 4, r: r * 1.15 });
  }
  for (let x = 4; x < w - rMin; x += rMin * 1.25 + rnd() * rMin) {
    const r = rMin + rnd() * (rMax - rMin);
    lumps.push({ x, y: h - 1 - r - rnd() * (h * 0.22), r });
  }
  return lumps;
}

// Builds every cloud bitmap. Runs once, the first time clouds are needed.
function buildWeatherClouds() {
  const W = WEATHER_CLOUDS;
  const rnd = weatherRng(20261122);
  W.far  = makeCloudBitmap(192, 16, ceilingLumps(192, 16, rnd, 4, 7),  { wrap: true, solid: 5 });
  W.near = makeCloudBitmap(256, 21, ceilingLumps(256, 21, rnd, 6, 10), { wrap: true, solid: 6 });
  // Drifting cumulus. tier 0 = high, large and close; tier 2 = low, small
  // and far away. `y` is the top of the cloud as a fraction of the way
  // down to the horizon (the town skyline hides the lower sky, so the
  // clouds keep to the upper third). `at` is the weatherAlpha it appears at.
  const specs = [
    { w: 72, h: 19, tier: 0, y: 0.03, at: 0.08 },
    { w: 56, h: 16, tier: 0, y: 0.10, at: 0.16 },
    { w: 64, h: 17, tier: 0, y: 0.01, at: 0.25 },
    { w: 78, h: 20, tier: 0, y: 0.06, at: 0.34 },
    { w: 46, h: 13, tier: 1, y: 0.15, at: 0.04 },
    { w: 40, h: 12, tier: 1, y: 0.19, at: 0.12 },
    { w: 50, h: 14, tier: 1, y: 0.13, at: 0.21 },
    { w: 44, h: 13, tier: 1, y: 0.17, at: 0.30 },
    { w: 30, h: 9,  tier: 2, y: 0.24, at: 0.06 },
    { w: 34, h: 10, tier: 2, y: 0.22, at: 0.14 },
    { w: 26, h: 8,  tier: 2, y: 0.26, at: 0.23 },
    { w: 32, h: 9,  tier: 2, y: 0.23, at: 0.32 },
  ];
  W.drifting = specs.map(s => {
    const bmp = makeCloudBitmap(s.w, s.h, cumulusLumps(s.w, s.h, rnd));
    return { bmp, tier: s.tier, y: s.y, at: s.at, start: rnd(), speed: [0.16, 0.11, 0.07][s.tier] * (0.85 + rnd() * 0.3) };
  });
  W.built = true;
}

// Works out the cloud colours for the current weather and time of day and
// repaints the bitmaps if they have changed. Cloudy weather has pale grey
// cumulus; a storm turns them slate. The sky layer is not tinted for
// night, so the clouds are darkened here.
function refreshCloudColours() {
  const W = WEATHER_CLOUDS;
  const storm = round(constrain((weatherAlpha - 0.22) / 0.65, 0, 1) * 8) / 8;
  const night = round(nightAmount() * 6) / 6;
  const fair  = [PAL.white, PAL.g1, PAL.g2, PAL.g3];
  const heavy = [PAL.g3, PX.mix(PAL.g3, PAL.g4, 0.6), PX.mix(PAL.g4, PAL.g5, 0.45), PAL.g5];
  // Clouds take on some of the sky's own colour, the far ones most (haze)
  let haze = '#8f9bb0';
  if (typeof skyStops === 'function') {
    const stops = skyStops();
    haze = stops[stops.length - 2];
  }
  const tiers = [];
  let key = '';
  for (let tier = 0; tier < 3; tier++) {
    const cols = [];
    for (let i = 0; i < 4; i++) {
      let c = PX.mix(fair[i], heavy[i], storm);
      c = PX.mix(c, PAL.sk8, night * 0.62);
      c = PX.mix(c, haze, 0.1 + tier * 0.17);
      // Snap to a coarse colour step so slow sky changes do not repaint every frame
      const v = parseInt(c.slice(1), 16) & 0xf8f8f8;
      c = '#' + v.toString(16).padStart(6, '0');
      cols.push(c);
    }
    tiers.push(cols);
    key += cols.join('');
  }
  if (key === W.palKey) return;
  W.palKey = key;
  paintCloudBitmap(W.near, tiers[0]);
  paintCloudBitmap(W.far, tiers[1]);
  for (const cl of W.drifting) paintCloudBitmap(cl.bmp, tiers[cl.tier]);
}

// Draws one tiling ceiling strip with its top edge at y, scrolled by `scroll`.
function drawCloudCeiling(bmp, y, scroll) {
  const off = ((Math.round(scroll) % bmp.w) + bmp.w) % bmp.w;
  for (let x = -off; x < PX.W; x += bmp.w) PX.spr(bmp, x, y);
}

// ── Sky layer ─────────────────────────────────────────

// Draws the weather that lives in the sky, behind the garden: rainbow,
// overcast ceilings, far rain, drifting storm clouds and the lightning
// bolt. Called with PX aimed at the untinted sky layer.
function drawWeatherSky() {
  const na = nightAmount();

  if (rainbowAmount > 0) drawRainbow();

  // A strike lights the sky up behind the clouds
  if (lightningAlpha > 0) {
    PX.alpha(lightningAlpha / 255 * 0.55, () => PX.rect(0, 0, PX.W, PX.H, PAL.sk1));
  }

  const cloudy = weatherAlpha > 0.03;
  const W = WEATHER_CLOUDS;
  const drift = t + windX * 60;
  if (cloudy) {
    if (!W.built) buildWeatherClouds();
    refreshCloudColours();

    // Far ceiling: slides down from the top as the rain sets in
    const farDrop = constrain((weatherAlpha - 0.5) / 0.4, 0, 1);
    if (farDrop > 0) {
      drawCloudCeiling(W.far, Math.round(lerp(-W.far.h, PX.HOR * 0.1, farDrop)), -drift * 0.05 + 70);
    }
  }

  if (rainAmount > 0.01) drawFarRain(na);

  if (cloudy) {
    // Drifting cumulus, far ones first. Each fades in at its own point as
    // the weather builds, so the sky fills up cloud by cloud.
    for (let i = W.drifting.length - 1; i >= 0; i--) {
      const cl = W.drifting[i];
      const a = constrain((weatherAlpha - cl.at) / 0.1, 0, 1);
      if (a <= 0) continue;
      const span = PX.W + cl.bmp.w + 40;
      const x = ((cl.start * span + drift * cl.speed) % span + span) % span - cl.bmp.w - 20;
      PX.spr(cl.bmp, x, Math.round(PX.HOR * cl.y), { alpha: a });
    }
  }

  if (cloudy) {
    // Near ceiling: the heavy cloud deck overhead
    const nearDrop = constrain((weatherAlpha - 0.36) / 0.5, 0, 1);
    const ease = nearDrop * nearDrop * (3 - 2 * nearDrop);
    if (ease > 0) {
      drawCloudCeiling(W.near, Math.round(lerp(-W.near.h, -3, ease)), -drift * 0.2);
    }
  }

  if (lightningAlpha > 0) drawLightningBolt();
}
drawWeatherSky.pixel = true;

// Far rain: short streaks falling through the sky down to the horizon.
function drawFarRain(na) {
  const n = Math.round(raindrops.length * rainAmount);
  const fall = 0.7 + rainAmount * 0.3;
  const slant = constrain(Math.round(windX * 1.6), -1, 1);
  const col = PX.mix(PAL.sk1, PAL.sk5, na * 0.6);
  const bottom = Math.round(PX.HOR * 0.55);   // the town hides the sky below here
  PX.alpha(0.55, () => {
    for (let i = 0; i < n; i++) {
      const drop = raindrops[i];
      drop.y += drop.speed * fall;
      drop.x += windX * drop.speed * 0.22;
      if (drop.y > bottom) {
        drop.y = -random(1, 12);
        drop.x = random(-10, PX.W + 10);
      }
      const x = Math.round(drop.x), y = Math.round(drop.y);
      if (slant === 0 || drop.len < 3) {
        PX.rect(x, y - drop.len, 1, drop.len, col);
      } else {
        const half = drop.len >> 1;
        PX.rect(x, y - half, 1, half, col);
        PX.rect(x - slant, y - drop.len, 1, drop.len - half, col);
      }
    }
  });
}

// ── Front layer ───────────────────────────────────────

// Draws the weather in front of the garden: rain streaks that land on the
// lawn with little splashes, and the flash of a lightning strike.
function drawWeatherFront() {
  drawFrontRain();

  // Lightning flash over the whole garden. Kept gentle: it lights the
  // scene rather than whiting it out (kinder on the eyes on a big TV).
  if (lightningAlpha > 0) {
    PX.alpha(lightningAlpha / 255 * 0.38, () => PX.rect(0, 0, PX.W, PX.H, PAL.sk1));
  }
}
drawWeatherFront.pixel = true;

// Foreground rain. Drops beyond the current rain strength finish their
// fall and then park, so a shower tapers off instead of vanishing.
let fgRainLive = 0;   // drops in the air or splashing last frame
const FG_RAIN_DROPS = 200;   // a full storm; steady rain uses 60% of them
function drawFrontRain() {
  if (rainAmount <= 0.01 && fgRainLive === 0) return;
  while (fgRaindrops.length < FG_RAIN_DROPS) fgRaindrops.push(newFgRaindrop());
  const na = nightAmount();
  const active = rainAmount > 0.01 ? Math.round(fgRaindrops.length * rainAmount) : 0;
  const fall = 0.75 + rainAmount * 0.25;
  const slant = constrain(Math.round(windX * 2.2), -2, 2);
  const steps = Math.abs(slant) + 1, dir = Math.sign(slant);
  const streak = PX.mix(PAL.sk2, PAL.sk5, na * 0.55);
  const tip    = PX.mix(PAL.white, PAL.sk4, na * 0.55);
  let live = 0;

  PX.alpha(0.75 - na * 0.15, () => {
    for (let i = 0; i < fgRaindrops.length; i++) {
      const drop = fgRaindrops[i];

      // Splash where the last drop landed: a small crown, then it spreads
      if (drop.splashT > 0) {
        const sx = drop.splashX, sy = drop.splashY;
        if (drop.splashT > 4) {
          PX.px(sx, sy - 1, tip);
          PX.px(sx - 1, sy, tip);
          PX.px(sx + 1, sy, tip);
        } else {
          PX.px(sx - 2, sy - 1, streak);
          PX.px(sx + 2, sy - 1, streak);
          PX.rect(sx - 1, sy, 3, 1, streak);
        }
        drop.splashT--;
        live++;
      }

      if (!drop.on) {
        if (i >= active) continue;
        aimFgRaindrop(drop);
        drop.on = true;
      }
      live++;
      drop.y += drop.speed * fall;
      drop.x += windX * drop.speed * 0.3;

      if (drop.y >= drop.gy) {
        if (drop.gy < PX.H - 1) {
          drop.splashT = 8;
          drop.splashX = Math.round(drop.x);
          drop.splashY = Math.round(drop.gy);
        }
        if (i < active) aimFgRaindrop(drop); else drop.on = false;
        continue;
      }

      // The streak leans with the wind: it is drawn as short stacked
      // pieces, each one a pixel further upwind.
      const x = Math.round(drop.x), y = Math.round(drop.y);
      if (steps === 1) {
        PX.rect(x, y - drop.len, 1, drop.len, streak);
      } else {
        const piece = Math.ceil(drop.len / steps);
        for (let s = 0; s < steps; s++) PX.rect(x - dir * s, y - (s + 1) * piece, 1, piece, streak);
      }
      if (drop.len > 5) PX.px(x, y, tip);     // nearer drops get a bright head
    }
  });
  fgRainLive = live;
}

// ── Puddle System ──────────────────────────────────────

// Spawn a new puddle at a random world position, or grow an existing nearby one
function spawnPuddleInWorld() {
  const wx = random(0.05, 0.95);
  const wy = random(0.15, 0.95);

  for (let p of puddles) {
    if (abs(p.wx - wx) < 0.08 && abs(p.wy - wy) < 0.06) {
      p.size = min(p.size + 1.5, p.maxSize);
      p.life = p.maxLife;
      return;
    }
  }

  if (puddles.length < 20) {
    const maxSz = random(10, 28);
    puddles.push({
      wx,
      wy,
      size: random(2, 5),
      maxSize: maxSz,
      life: 600,
      maxLife: 600,
      phase: random(TWO_PI),
      evaporating: false
    });
  }
}

// Update puddle sizes: grow during rain, shrink and evaporate when dry
function updatePuddles() {
  const isRaining = (weatherState === 'rainy' || weatherState === 'stormy');

  if (isRaining) {
    const spawnChance = (weatherState === 'stormy') ? 0.04 : 0.02;
    if (random() < spawnChance) spawnPuddleInWorld();
  }

  for (let p of puddles) {
    if (isRaining) {
      p.size = min(p.size + 0.025, p.maxSize);
      p.life = p.maxLife;
      p.evaporating = false;
    } else {
      p.life--;
      if (p.life <= 0) {
        p.evaporating = true;
        const evapRate = (weatherState === 'sunny') ? 0.06 : 0.03;
        p.size -= evapRate;
      }
    }
  }
  puddles = puddles.filter(p => p.size > 0.5);
}

// Draw puddles: a dark wet rim, blue water with a band of reflected sky,
// a glint that slides back and forth, ripples while it rains, and wisps
// of vapour as they dry up. Puddles lie flat, so they are wide and thin.
function drawPuddles() {
  const isRaining = (weatherState === 'rainy' || weatherState === 'stormy');
  for (let p of puddles) {
    const { x, y } = worldToPx(p.wx, p.wy);
    const rx = Math.max(1, Math.round(p.size * 0.5));
    const ry = Math.max(1, Math.round(rx * 0.3));
    // A second, smaller pool to one side makes the outline less egg-like
    const side = (p.phase > PI ? 1 : -1);
    const bx = x + side * Math.round(rx * 0.55);
    const brx = Math.round(rx * 0.6), bry = Math.max(1, ry - 1);

    if (rx < 3) {
      // Just starting: a few wet pixels
      PX.rect(x - rx, y, rx * 2 + 1, 1, PAL.gr5);
      PX.rect(x - rx + 1, y, Math.max(1, rx * 2 - 1), 1, PAL.sk5);
      continue;
    }

    // Wet ground showing around the water
    PX.ellipse(x, y + 1, rx + 1, ry, PAL.gr5);
    PX.ellipse(bx, y + 2, brx + 1, bry, PAL.gr5);
    // Water
    PX.ellipse(x, y, rx, ry, PAL.sk5);
    PX.ellipse(bx, y + 1, brx, bry, PAL.sk5);
    // Reflected sky across the far (upper) half
    if (ry >= 2) PX.ellipse(x - 1, y - 1, rx - 2, ry - 1, PAL.sk4);
    else PX.rect(x - rx + 2, y, rx * 2 - 3, 1, PAL.sk4);
    // Glint
    const slide = Math.round(sin(t * 0.04 + p.phase) * rx * 0.25);
    const gw = Math.max(2, Math.round(rx * 0.45));
    PX.rect(x - Math.round(rx * 0.45) + slide, y - Math.max(1, ry - 1), gw, 1, PAL.sk2);
    if (rx >= 7) PX.px(x - Math.round(rx * 0.45) + slide + gw + 1, y - Math.max(1, ry - 1), PAL.sk1);

    if (isRaining) {
      // Raindrop rings. Each ring picks a new spot every time it restarts.
      const rings = rx >= 9 ? 2 : 1;
      for (let k = 0; k < rings; k++) {
        const clock = t + Math.floor(p.phase * 40) + k * 13;
        const turn = Math.floor(clock / 24);
        const frame = Math.floor((clock % 24) / 8);
        const reach = Math.max(0, rx - 4);
        const ox = reach ? ((turn * 37 + k * 11) % (reach * 2 + 1)) - reach : 0;
        if (rx < 6 || ry < 2) {
          if (frame < 2) PX.px(x + ox, y, PAL.sk1);     // too small for a ring
        } else {
          PX.spr('ripple', x + ox, y, { frame });
        }
      }
    }

    if (p.evaporating && p.size < p.maxSize * 0.5) {
      // Vapour: two short dashes that rise and fade as the puddle shrinks
      const fade = constrain(map(p.size, 0, p.maxSize * 0.5, 0, 0.6), 0, 0.6);
      const rise = Math.floor(((t + p.phase * 20) % 48) / 8);
      PX.alpha(fade, () => {
        PX.rect(x - 2, y - 3 - rise, 2, 1, PAL.white);
        PX.rect(x + 2, y - 5 - ((rise + 3) % 6), 2, 1, PAL.white);
      });
    }
  }
}
drawPuddles.pixel = true;

// ── Lightning ─────────────────────────────────────────

// Plans a new jagged bolt from the cloud deck down to the horizon, with
// one or two side forks. Called once per strike so the bolt holds its
// shape while it flickers.
function makeLightningBolt() {
  lightningBolt = [];
  let x = random(PX.W * 0.06, PX.W * 0.94);
  let y = Math.round(PX.HOR * 0.05);
  const bottom = PX.HOR + 6;
  let dir = random() < 0.5 ? -1 : 1;
  while (y < bottom) {
    const nx = x + dir * random(2, 7);
    const ny = y + random(4, 8);
    lightningBolt.push([x, y, nx, ny, y < PX.HOR * 0.25 ? 2 : 1]);
    // Side fork: a thinner branch heading off the other way
    if (random() < 0.3 && y > PX.HOR * 0.12) {
      let fx = x, fy = y;
      const fdir = -dir;
      const pieces = floor(random(2, 4));
      for (let i = 0; i < pieces; i++) {
        const gx = fx + fdir * random(3, 7), gy = fy + random(2, 6);
        lightningBolt.push([fx, fy, gx, gy, 0]);
        fx = gx; fy = gy;
      }
    }
    x = nx; y = ny;
    if (random() < 0.7) dir = -dir;
  }
}

// Draws the bolt: a pale glow with a white core. It shows bright at the
// strike, blinks off for a moment, then returns fainter before it fades.
function drawLightningBolt() {
  let a = 1;
  if (lightningAlpha < 105) a = 0;
  else if (lightningAlpha < 125) a = 0.55;
  else if (lightningAlpha < 150) a = 0;
  if (a <= 0 || !lightningBolt.length) return;
  PX.alpha(a, () => {
    for (const s of lightningBolt) if (s[4] > 0) PX.line(s[0], s[1], s[2], s[3], PAL.ye1, s[4] + 2);
    for (const s of lightningBolt) if (s[4] === 0) PX.line(s[0], s[1], s[2], s[3], PAL.ye1, 1);
    for (const s of lightningBolt) if (s[4] > 0) PX.line(s[0], s[1], s[2], s[3], PAL.white, s[4]);
  });
}

// ── Rainbow ───────────────────────────────────────────

// The rainbow is seven solid bands. It is painted once into a bitmap and
// then drawn each frame at whatever strength the clearing sky allows.
let rainbowBmp = null;
function drawRainbow() {
  const R = Math.round(PX.HOR * 0.56), band = 2;
  if (!rainbowBmp || rainbowBmp.R !== R) {
    const w = R * 2 + 1, h = R + 1;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    const cols = [PAL.re2, PAL.or2, PAL.ye2, PAL.gr2, PAL.wa2, PAL.bl2, PAL.pu2];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Math.sqrt((x - R) * (x - R) + (y - R) * (y - R));
        const i = Math.floor((R + 0.5 - d) / band);
        if (i < 0 || i >= cols.length || d > R + 0.5) continue;
        g.fillStyle = cols[i];
        g.fillRect(x, y, 1, 1);
      }
    }
    rainbowBmp = { R, w, h, ax: R, ay: R, frames: [{ cv, fl: cv }] };
  }
  // Its feet go down behind the town skyline; the arch stands in the
  // open sky on the left, clear of the school tower and the forecast panel.
  PX.spr(rainbowBmp, Math.round(PX.W * 0.17), Math.round(PX.HOR * 0.62),
    { alpha: rainbowAmount * 0.8 });
}

// ── Forecast panel ────────────────────────────────────

// Draw the HUD forecast panel showing current weather and upcoming transition
function drawWeatherForecast() {
  const panelW = 82, panelH = 49;
  const px = PX.W - panelW - 4, py = 4;

  const elapsed  = weatherDuration - weatherTimer;
  const progress = constrain(elapsed / weatherDuration, 0, 1);
  const chance   = floor(constrain(
    progress < 0.5
      ? map(progress, 0, 0.5, 8, 30)
      : map(progress, 0.5, 1.0, 30, 95),
    8, 95
  ));

  const night = nightAmount() > 0.5;
  const kinds = {
    sunny:    { icon: night ? 'wx_clear_night' : 'wx_sunny', label: night ? 'Clear' : 'Sunny', col: PAL.ye2 },
    cloudy:   { icon: 'wx_cloudy',   label: 'Cloudy',       col: PAL.g1  },
    rainy:    { icon: 'wx_rainy',    label: 'Rain',         col: PAL.wa2 },
    stormy:   { icon: 'wx_stormy',   label: 'Thunderstorm', col: PAL.pu1 },
    clearing: { icon: 'wx_clearing', label: 'Clearing',     col: PAL.or1 }
  };
  const curr = kinds[weatherState] || kinds.sunny;
  const next = kinds[nextWeatherState] || kinds.sunny;
  const frame = PX.anim(2, 24);

  PX.panel(px, py, panelW, panelH, PAL.ink, PAL.g5, 2);

  // NOW: icon, then the label in the colour of the weather
  PX.spr(curr.icon, px + 4, py + 4, { frame });
  PX.text('NOW', px + 24, py + 4, { color: PAL.g3 });
  PX.text(curr.label, px + 24, py + 12, { color: curr.col });

  // Blinking "live" dot in the corner
  PX.rect(px + panelW - 7, py + 5, 2, 2, PX.anim(2, 30) ? curr.col : PAL.g5);

  PX.rect(px + 4, py + 23, panelW - 8, 1, PAL.g5);

  // FORECAST: what is coming, how likely, and a bar that fills as it nears
  PX.spr(next.icon, px + 4, py + 27, { frame });
  PX.text('FORECAST', px + 24, py + 25, { color: PAL.g3 });
  PX.text(next.label, px + 24, py + 32, { color: next.col });

  const chanceCol = chance < 35 ? PAL.wa2 : (chance < 65 ? PAL.ye2 : PAL.or2);
  const barX = px + 24, barY = py + 42, barW = panelW - 24 - 23;
  PX.rect(barX, barY, barW, 3, PAL.g5);
  PX.rect(barX, barY, Math.round(barW * chance / 100), 3, chanceCol);
  for (let x = barX + 3; x < barX + barW; x += 4) PX.rect(x, barY, 1, 3, PAL.ink);   // segment gaps
  PX.text(chance + '%', px + panelW - 4, py + 40, { color: chanceCol, align: 'right' });
}
drawWeatherForecast.pixel = true;
