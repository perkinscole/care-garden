// ================================================================
// File: weather.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 23, 2026
// Description: The sky and the weather of the 3D block garden.
//   The weather state machine (sunny/cloudy/rainy/stormy/clearing) and
//   the ambient sound loops (birds, rain, night) are as they always
//   were. Everything in the sky is built out of boxes and drawn by G3:
//   a cube sun that smiles, a square moon, square stars, slab clouds,
//   a storm ceiling, a right-angled lightning bolt, a staircase
//   rainbow, rain streaks with splashes, and puddles on the lawn.
//   The NOW / FORECAST strip is still 2D pixel art drawn with PX.
// ================================================================

// ── Weather System ────────────────────────────────────

// How hard it is raining right now, 0..1. Eases toward 0.6 in rain and 1 in
// a storm, so showers thicken and thin out instead of switching on and off.
let rainAmount = 0;
// How visible the rainbow is, 0..1. Eases in while the weather is clearing.
let rainbowAmount = 0;
// The current lightning bolt: a list of boxes [x, y, z, w, h, core] in
// blocks (core = 1 for the main stroke, 0 for a thinner side fork).
let lightningBolt = [];
let lightningBoltNew = false;   // set when a new bolt needs building
// What the ambient loops were last told to do, so the M (mute) key sticks
// until the weather or the time of day next changes.
const ambientSound = { birds: null, rain: null, night: null };

// How many rain streaks a full storm has; steady rain uses 60% of them.
const RAIN_DROPS = 700;

// sketch.js fills the old far-rain list with these at start-up. The 3D
// rain is one layer (fgRaindrops), so this list is no longer drawn.
function newRaindrop() {
  return { x: 0, y: 0, len: 0, speed: 0 };
}

// Create a new raindrop for the 3D rain. Positions are in blocks. Drops
// start parked (on = false) and are released as the rain builds.
function newFgRaindrop() {
  const drop = { x: 0, y: 0, z: 0, len: 1, speed: 0.5, on: false };
  aimFgRaindrop(drop);
  return drop;
}

// Sends a drop back up above the view, somewhere over the garden: the
// lawn, the school behind it and the air in front of it.
function aimFgRaindrop(drop) {
  drop.x     = random(-34, 34);
  drop.z     = random(-16, 25);
  drop.y     = random(14, 27);
  drop.len   = random(0.7, 1.5);
  drop.speed = random(0.38, 0.6);
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
  want = want && !ambientMuted;        // the M key silences all three
  if (ambientSound[slot] === want) return;
  if (!soundReady(snd)) return;        // not loaded yet: try again next frame
  if (want) soundLoop(snd); else soundPause(snd);
  ambientSound[slot] = want;
}


// ── 3D helpers ────────────────────────────────────────
// Everything here is built once, the first time it is drawn, and then
// only moved, scaled and recoloured. Nothing is allocated per frame.

const WX = {
  sky: null,       // sun, moon, stars, fair clouds   (drawSkyLayer)
  storm: null,     // grey clouds, ceiling, lightning, rainbow (drawWeatherSky)
  rain: null,      // streaks and splashes            (drawWeatherFront)
  puddles: null,   // puddle slabs                    (drawPuddles)
  pal: null,       // cloud colours for this frame's weather and time of day
  palKey: '',
  o: null, c: null, c2: null,   // scratch Object3D and Colors
};

// Sky things are drawn back to front in this order (they are transparent,
// so three.js draws them after the solid world, which then hides whatever
// is behind a roof or a hill). Everything else in the garden is 0.
const WX_ORDER = { flash: -30, stars: -29,  moon: -26, sun: -25, ceilFar: -15, ceilNear: -14, cloud: -10, rainbow: -8, bolt: -5, rain: 20 };

function wxScratch() {
  if (WX.o) return;
  WX.o = new THREE.Object3D();
  WX.c = new THREE.Color();
  WX.c2 = new THREE.Color();
}

// Small repeatable random number generator, so the clouds have the same
// shapes every time and do not disturb p5's random sequence.
function weatherRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// An unlit material of our own (the cached G3.mat ones are shared, and
// these change colour and fade). Sky things ignore the scene lights and
// any fog, and by default do not write depth.
function wxMat(color, opts) {
  return new THREE.MeshBasicMaterial(Object.assign(
    { color: new THREE.Color(color), fog: false, transparent: true, depthWrite: false }, opts || {}));
}

// A unit cube to be scaled into a slab, with no shadows.
function wxSlab(mat, order) {
  const m = new THREE.Mesh(G3.geo(1, 1, 1), mat);
  m.castShadow = false; m.receiveShadow = false;
  m.renderOrder = order || 0;
  return m;
}

// Many boxes drawn as one: an instanced unit cube.
function wxInstanced(mat, count, order, colours) {
  const m = new THREE.InstancedMesh(G3.geo(1, 1, 1), mat, count);
  m.castShadow = false; m.receiveShadow = false;
  m.frustumCulled = false;
  m.renderOrder = order || 0;
  m.count = 0;
  if (colours) m.setColorAt(0, WX.c.set('#ffffff'));
  return m;
}

// Writes box i of an instanced mesh: centre and size.
function wxSetBox(mesh, i, x, y, z, w, h, d) {
  const a = mesh.instanceMatrix.array, k = i * 16;
  a[k] = w;      a[k + 1] = 0;  a[k + 2] = 0;   a[k + 3] = 0;
  a[k + 4] = 0;  a[k + 5] = h;  a[k + 6] = 0;   a[k + 7] = 0;
  a[k + 8] = 0;  a[k + 9] = 0;  a[k + 10] = d;  a[k + 11] = 0;
  a[k + 12] = x; a[k + 13] = y; a[k + 14] = z;  a[k + 15] = 1;
}

// Where something standing at depth z must be to show at (u, v) of the
// garden view (0..1 across, 0..1 down), for the camera at rest. The camera
// looks slightly down, so the whole strip of sky at the top of the view is
// below its own height: far things sit low to be seen.
function wxViewPoint(u, v, z, out) {
  const C = G3.CAM, tf = Math.tan(C.fov * Math.PI / 360), asp = G3.camera.aspect;
  const p = Math.atan2(C.y - C.ty, C.z - C.tz), cp = Math.cos(p), sp = Math.sin(p);
  const nx = (u * 2 - 1) * tf * asp, ny = (1 - 2 * v) * tf;
  const k = (z - C.z) / (-ny * sp - cp);
  return out.set(nx * k, C.y + (ny * cp - sp) * k, z);
}
function wxViewY(v, z) { wxScratch(); return wxViewPoint(0.5, v, z, WX.o.position).y; }
function wxViewHalfW(v, z) { wxScratch(); return wxViewPoint(1, v, z, WX.o.position).x; }

// ── Cloud colours ─────────────────────────────────────
// Clouds are unlit, so they are coloured here for the time of day and the
// weather: white by day, peach at sunset, slate at night; pale grey when
// it is cloudy and dark slate in a storm. Worked out again only when
// something has moved on a step.
function wxCloudColours(na) {
  const flash = lightningAlpha > 100 ? 1 : 0;
  const storm = Math.round(constrain((weatherAlpha - 0.22) / 0.65, 0, 1) * 8) / 8;
  const key = Math.floor(timeOfDay * 240) + '|' + Math.round(weatherAlpha * 12) + '|' + storm + '|' + Math.round(na * 8) + '|' + flash;
  if (key === WX.palKey) return WX.pal;
  WX.palKey = key;
  const pal = WX.pal || (WX.pal = { fair: {}, tiers: [[], [], []] });
  const stops = skyStops();
  const skyMid = stops[Math.floor(stops.length / 2)], skyLow = stops[stops.length - 1];

  // Fair-weather clouds pick up the colour of the sky behind them and
  // grey a little as the weather builds
  const grey = constrain(weatherAlpha * 1.4, 0, 0.7);
  const hi    = PX.mix(PX.mix(PAL.white, skyLow, lerp(0.04, 0.6, na)), PAL.g1, grey * 0.6);
  const body  = PX.mix(PX.mix(PAL.white, skyLow, lerp(0.2, 0.7, na)), PAL.g2, grey * 0.7);
  const shade = PX.mix(PX.mix(PX.mix(PAL.white, skyMid, lerp(0.5, 0.85, na)), PAL.sl2, 0.18), PAL.g3, grey * 0.7);
  pal.fair.hi = hi;
  pal.fair.side = PX.mix(hi, body, 0.5);
  pal.fair.base = PX.mix(body, shade, 0.55);
  pal.fair.under = shade;

  // Storm clouds: three depths, the far ones hazier
  const night = Math.round(na * 6) / 6;
  const light = [PAL.white, PAL.g1, PAL.g2, PAL.g3];
  const heavy = [PAL.g3, PX.mix(PAL.g3, PAL.g4, 0.6), PX.mix(PAL.g4, PAL.g5, 0.45), PAL.g5];
  const haze = stops[stops.length - 2];
  for (let tier = 0; tier < 3; tier++) {
    for (let i = 0; i < 4; i++) {
      let c = PX.mix(light[i], heavy[i], storm);
      c = PX.mix(c, PAL.sk8, night * 0.62);
      c = PX.mix(c, haze, 0.1 + tier * 0.17);
      if (flash) c = PX.mix(c, PAL.sk1, 0.45);          // lit from behind by a strike
      pal.tiers[tier][i] = c;
    }
  }
  pal.fresh = true;
  return pal;
}

// One cloud: a wide flat base slab with one to three smaller slabs stacked
// on it, all sized in chunks of c blocks. mats = { top: [...6], base: [...6] }.
// The slabs touch but never overlap, so a fading cloud shows no seams.
function wxBuildCloud(n, c, rnd, mats) {
  const g = new THREE.Group();
  const add = (x, y, z, w, h, d, m) => {
    const mesh = new THREE.Mesh(G3.geo(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = false; mesh.receiveShadow = false;
    mesh.renderOrder = WX_ORDER.cloud;
    g.add(mesh);
  };
  const D = 4 * c, left = -n / 2;
  add(0, c / 2, 0, n * c, c, D, mats.base);
  // A long slab on top, set back so the base shows as a lip in front
  const n1 = Math.max(2, Math.min(n - 2, Math.round(n * (0.45 + rnd() * 0.2))));
  const a = left + 1 + Math.floor(rnd() * Math.max(1, n - n1 - 1));
  add((a + n1 / 2) * c, c * 1.5, -c / 2, n1 * c, c, D - c, mats.top);
  // A smaller one on top of that
  if (n1 >= 3) {
    const n2 = Math.max(1, Math.round(n1 * 0.45));
    const b = a + Math.floor(rnd() * (n1 - n2 + 1));
    add((b + n2 / 2) * c, c * 2.5, -c, n2 * c, c, D - 2 * c, mats.top);
  }
  // And a little bump beside the long slab where there is room
  if (left + n - (a + n1) >= 3) add((a + n1 + 2) * c, c * 1.5, -c / 2, 2 * c, c, D - c, mats.top);
  else if (a - left >= 3) add((a - 2) * c, c * 1.5, -c / 2, 2 * c, c, D - c, mats.top);
  g.userData.w = n * c;
  return g;
}

// The four materials a set of clouds shares, and the two face lists made
// from them (face order +x, -x, top, bottom, front, back).
function wxCloudMats() {
  const o = { depthWrite: true };
  const m = { hi: wxMat('#ffffff', o), side: wxMat('#ffffff', o), bside: wxMat('#ffffff', o), under: wxMat('#ffffff', o) };
  m.top = [m.side, m.side, m.hi, m.under, m.side, m.side];
  m.base = [m.bside, m.bside, m.hi, m.under, m.bside, m.bside];
  return m;
}
function wxSetCloudMats(m, hi, side, bside, under, opacity) {
  if (hi) { m.hi.color.set(hi); m.side.color.set(side); m.bside.color.set(bside); m.under.color.set(under); }
  m.hi.opacity = m.side.opacity = m.bside.opacity = m.under.opacity = opacity;
}

// ── Sky layer: sun, moon, stars, fair-weather clouds ──

// Where the fair-weather clouds float: depth z, v = how far down the view
// their base shows, n = width in chunks, and how fast they drift. Only a
// thin strip of sky shows above the wooded ridge behind the town (which
// ends at z = -60), so some clouds float low over the town itself, in
// front of the ridge, and the rest peep over it from far behind.
const FAIR_CLOUDS = [
  { z: -30,  v: 0.088, n: 8,  start: 0.06, speed: 0.80 },
  { z: -100, v: 0.040, n: 6,  start: 0.22, speed: 0.55 },
  { z: -42,  v: 0.070, n: 10, start: 0.36, speed: 0.60 },
  { z: -72,  v: 0.062, n: 9,  start: 0.60, speed: 0.70 },
  { z: -24,  v: 0.060, n: 6,  start: 0.80, speed: 0.50 },
  { z: -84,  v: 0.050, n: 8,  start: 0.93, speed: 0.65 },
  { z: -37,  v: 0.092, n: 7,  start: 0.48, speed: 0.75 },
];

function buildSky3() {
  wxScratch();
  const S = WX.sky = {};
  const cam = G3.camera, v = new THREE.Vector3();

  // A rig that follows the camera exactly: the stars and the lightning
  // flash hang from it, so they never slide against the view.
  S.rig = new THREE.Group();
  G3.scene.add(S.rig);

  // Stars: square points in two sizes that twinkle in steps
  S.starSets = [];
  for (let big = 0; big < 2; big++) {
    const list = stars.filter(s => (s.size > 2.3) === (big === 1));
    if (!list.length) continue;
    const pos = new Float32Array(list.length * 3), col = new Float32Array(list.length * 3);
    list.forEach((s, i) => {
      G3.skyPoint(s.x, 0.004 + s.y * 0.125, 300, v);     // all of them in the strip of sky
      cam.worldToLocal(v);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: big ? 6 : 3, sizeAttenuation: false, vertexColors: true, fog: false,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    pts.frustumCulled = false;
    pts.renderOrder = WX_ORDER.stars;
    S.rig.add(pts);
    S.starSets.push({ list, pts, col });
  }

  // Lightning flash: a pale sheet across the sky, behind the clouds
  S.flashMat = wxMat(PAL.sk1, { opacity: 0 });
  S.flash = wxSlab(S.flashMat, WX_ORDER.flash);
  S.flash.scale.set(700, 400, 1);
  S.flash.position.set(0, 0, -292);
  S.flash.visible = false;
  S.rig.add(S.flash);

  // ── Moon: a pale square with square craters and a soft square halo
  const moonTex = G3.pixelTex('wx_moon', 12, 12, g => {
    g.fillStyle = PAL.cream; g.fillRect(0, 0, 12, 12);
    g.fillStyle = PAL.white; g.fillRect(0, 0, 12, 1); g.fillRect(0, 0, 1, 12); g.fillRect(1, 1, 3, 1); g.fillRect(1, 1, 1, 3);
    g.fillStyle = PAL.ta1; g.fillRect(0, 11, 12, 1); g.fillRect(11, 0, 1, 12);
    g.fillStyle = PAL.ta1; g.fillRect(2, 6, 3, 3); g.fillRect(7, 2, 2, 2); g.fillRect(8, 8, 2, 2); g.fillRect(5, 4, 1, 1);
    g.fillStyle = PAL.ta2; g.fillRect(2, 8, 3, 1); g.fillRect(4, 6, 1, 3); g.fillRect(8, 3, 1, 1); g.fillRect(9, 9, 1, 1);
  });
  S.moon = new THREE.Group();
  S.moonMats = [
    wxMat(PAL.sk4, { opacity: 0 }), wxMat(PAL.sk3, { opacity: 0 }),
    new THREE.MeshBasicMaterial({ map: moonTex, fog: false, transparent: true, depthWrite: false }),
  ];
  const halo2 = wxSlab(S.moonMats[0], WX_ORDER.moon);     halo2.scale.set(22, 22, 0.5); halo2.position.z = -1;
  const halo1 = wxSlab(S.moonMats[1], WX_ORDER.moon + 0.1); halo1.scale.set(16, 16, 0.5); halo1.position.z = -0.5;
  const moonBody = wxSlab(S.moonMats[2], WX_ORDER.moon + 0.2); moonBody.scale.set(12, 12, 1);
  S.moon.add(halo2, halo1, moonBody);
  S.moon.scale.setScalar(0.85);
  G3.scene.add(S.moon);

  // ── Sun: a cube of yellow blocks with a lighter core, a square halo of
  // translucent slabs, square ray blocks, and a face for when someone smiles
  const sunTex = G3.pixelTex('wx_sun', 16, 16, g => {
    g.fillStyle = PAL.ye3; g.fillRect(0, 0, 16, 16);                       // rim
    g.fillStyle = PAL.ye2; g.fillRect(1, 1, 14, 14);                       // body
    g.fillStyle = PX.mix(PAL.ye2, PAL.ye3, 0.45); g.fillRect(1, 13, 14, 2); g.fillRect(13, 1, 2, 14);
    g.fillStyle = PAL.ye1; g.fillRect(2, 2, 9, 9);                         // lighter core, up and to the left
    g.fillStyle = PX.mix(PAL.ye1, PAL.white, 0.6); g.fillRect(3, 3, 3, 3);
    g.fillStyle = PAL.ye1; g.fillRect(11, 4, 1, 3); g.fillRect(4, 11, 3, 1);
  });
  const faceTex = G3.pixelTex('wx_sun_face', 16, 16, g => {
    g.fillStyle = PAL.ye4;
    g.fillRect(4, 4, 2, 3); g.fillRect(10, 4, 2, 3);                        // eyes
    g.fillRect(4, 9, 1, 2); g.fillRect(11, 9, 1, 2);                        // smile
    g.fillRect(5, 11, 1, 1); g.fillRect(10, 11, 1, 1); g.fillRect(6, 12, 4, 1);
    g.fillStyle = PAL.or2; g.fillRect(1, 8, 2, 2); g.fillRect(13, 8, 2, 2); // rosy cheeks
  });
  S.sun = new THREE.Group();
  const M = S.sunMats = {
    halo2: wxMat(PAL.ye1), halo1: wxMat(PAL.ye1), ray: wxMat(PAL.ye2), ray2: wxMat(PAL.ye1),
    body: new THREE.MeshBasicMaterial({ map: sunTex, fog: false, transparent: true, depthWrite: false }),
    face: new THREE.MeshBasicMaterial({ map: faceTex, fog: false, transparent: true, depthWrite: false }),
  };
  S.sunHalo2 = wxSlab(M.halo2, WX_ORDER.sun);       S.sunHalo2.position.z = -1.5;
  S.sunHalo1 = wxSlab(M.halo1, WX_ORDER.sun + 0.1); S.sunHalo1.position.z = -1;
  S.sun.add(S.sunHalo2, S.sunHalo1);
  // Rays: 0-3 bars off the sides, 4-7 squares off the corners, 8-15 a
  // second ring of small blocks that only comes out for a smile
  S.rays = [];
  for (let i = 0; i < 16; i++) {
    const r = wxSlab(i < 8 ? M.ray : M.ray2, WX_ORDER.sun + 0.2);
    r.position.z = -0.5;
    S.rays.push(r);
    S.sun.add(r);
  }
  S.sunBody = wxSlab(M.body, WX_ORDER.sun + 0.3);
  S.sunBody.scale.set(13, 13, 2);
  S.sunFace = wxSlab(M.face, WX_ORDER.sun + 0.4);
  S.sunFace.scale.set(13, 13, 0.2);
  S.sunFace.position.z = 1.2;
  S.sun.add(S.sunBody, S.sunFace);
  G3.scene.add(S.sun);
  S.sunTint = new THREE.Color(1, 0.72, 0.5);    // what turns the yellow blocks sunset orange

  // ── Fair-weather clouds: real slabs high and far behind the town
  S.cloudMats = wxCloudMats();
  S.clouds = [];
  const rnd = weatherRng(20261123);
  for (const fc of FAIR_CLOUDS) {
    const c = Math.max(1, Math.round((G3.CAM.z - fc.z) * 0.0107 * 4) / 4);   // one chunk is about 16 screen pixels
    const g = wxBuildCloud(fc.n, c, rnd, S.cloudMats);
    const span = 2 * wxViewHalfW(fc.v, fc.z) + g.userData.w + 16;
    g.position.set(0, wxViewY(fc.v, fc.z), fc.z);
    G3.scene.add(g);
    // blocks per frame that look the same speed at any depth
    S.clouds.push({ g, span, start: fc.start, rate: fc.speed * 0.00016 * (G3.CAM.z - fc.z) });
  }
  return S;
}

// Draws everything that lives in the sky: stars, moon, sun and the
// fair-weather clouds. Storm weather is drawn by drawWeatherSky().
function drawSkyLayer() {
  if (!G3.ready) return;
  const S = WX.sky || buildSky3();
  const na = nightAmount(), cam = G3.camera;
  S.rig.position.copy(cam.position);
  S.rig.quaternion.copy(cam.quaternion);
  const pal = wxCloudColours(na);
  drawStars3(S, na);
  drawMoon3(S, na);
  drawSun3(S, na);
  drawFairClouds3(S, na, pal);
}
drawSkyLayer.g3 = true;

// Twinkling stars. Each star steps between dim, bright and brightest
// instead of fading smoothly; storm clouds hide them.
function drawStars3(S, na) {
  const clear = 1 - Math.min(weatherAlpha * 1.25, 1);
  const on = na >= 0.05 && clear > 0.05;
  for (const set of S.starSets) {
    set.pts.visible = on;
    if (!on) continue;
    const col = set.col;
    for (let i = 0; i < set.list.length; i++) {
      const s = set.list[i];
      const twinkle = Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.4 + 0.6;
      const a = na * twinkle * (s.brightness / 100) * clear;
      let r = 0, g = 0, b = 0;
      if (a > 0.5) { r = 1; g = 0.98; b = 0.93; }
      else if (a > 0.28) { r = 0.6; g = 0.74; b = 0.82; }
      else if (a >= 0.12) { r = 0.3; g = 0.42; b = 0.55; }
      col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
    }
    set.pts.geometry.attributes.color.needsUpdate = true;
  }
}

// The moon hangs in the upper left and drifts a little to the right as
// the night goes by. It only appears once the sky is properly dark.
function drawMoon3(S, na) {
  const a = constrain((na - 0.7) / 0.25, 0, 1) * (1 - Math.min(weatherAlpha, 1) * 0.8);
  S.moon.visible = a > 0.01;
  if (!S.moon.visible) return;
  const night = ((timeOfDay - 0.68 + 1) % 1) / 0.41;        // 0 at dusk, 1 at dawn
  G3.skyPoint(lerp(0.13, 0.23, constrain(night, 0, 1)), 0.056, 250, S.moon.position);
  S.moon.quaternion.copy(G3.camera.quaternion);
  S.moonMats[0].opacity = 0.16 * a;
  S.moonMats[1].opacity = 0.26 * a;
  S.moonMats[2].opacity = a;
}

// The sun on its east-to-west arc. While someone is smiling (sunGlow) it
// brightens, swells, throws out more ray blocks and wears a smiling face.
function drawSun3(S, na) {
  // The sun fades out at dusk and dims behind rain clouds
  const sunVis = constrain(1.0 - na * 2.5, 0, 1) * (1 - constrain(weatherAlpha * 1.3 - 0.15, 0, 1));
  S.sun.visible = sunVis > 0.01;
  if (!S.sun.visible) return;

  // East (left) to west (right). The town and the school fill the view up
  // to the roofline, so only a strip along the top is open sky: the sun
  // climbs out from behind the roofs quickly, rides along that strip for
  // most of the day and sinks again at the end (a flat-topped arc).
  const sunProgress = constrain(map(timeOfDay, 0.07, 0.66, 0, 1), 0, 1);
  const climb = 1 - Math.pow(Math.abs(2 * sunProgress - 1), 3);
  G3.skyPoint(lerp(0.08, 0.86, sunProgress), lerp(0.30, 0.054, climb), 250, S.sun.position);
  S.sun.quaternion.copy(G3.camera.quaternion);

  // Toward sunset (and just after sunrise) it turns from yellow to orange
  const lowSun = Math.max(
    (timeOfDay > 0.45 && timeOfDay < 0.7) ? constrain(map(timeOfDay, 0.45, 0.65, 0, 1), 0, 1) : 0,
    constrain(map(timeOfDay, 0.12, 0.07, 0, 0.75), 0, 0.75));
  const sf = Math.round(lowSun * 4) / 4;
  const g = constrain(sunGlow, 0, 1);
  const M = S.sunMats, tint = S.sunTint;
  M.body.color.setRGB(1, 1, 1).lerp(tint, sf * 0.85);
  if (g > 0) M.body.color.multiplyScalar(1 + g * 0.08);      // a touch brighter for a smile
  M.ray.color.set(PAL.ye2).lerp(WX.c.set(PAL.or1), sf);
  M.ray2.color.set(PAL.ye1).lerp(WX.c.set(PAL.ye2), sf);
  M.halo1.color.set(PAL.ye1).lerp(WX.c.set(PAL.or1), sf * 0.6);
  M.halo2.color.copy(M.halo1.color);
  M.body.opacity = sunVis;
  M.ray.opacity = sunVis * 0.95;
  M.ray2.opacity = sunVis * 0.9;
  M.halo1.opacity = sunVis * (0.26 + 0.2 * g);
  M.halo2.opacity = sunVis * (0.13 + 0.2 * g);
  S.sun.scale.setScalar(0.85 * (1 + 0.14 * g));

  const R = 6.5;                                             // half the cube
  const h1 = 2 * R + 6 + g * 6, h2 = 2 * R + 13 + g * 14;
  S.sunHalo1.scale.set(h1, h1, 0.5);
  S.sunHalo2.scale.set(h2, h2, 0.5);

  // Rays step in and out on a slow beat instead of sliding
  const beat = Math.floor(t / 24) % 2;
  const gap = 1.5 + beat * 0.75 + g * 0.5;
  const len = 2 + g * 2.5, sq = 2 + g;
  for (let i = 0; i < 4; i++) {
    const dx = [1, 0, -1, 0][i], dy = [0, 1, 0, -1][i];
    const bar = S.rays[i], d = R + gap + len / 2;
    bar.position.x = dx * d; bar.position.y = dy * d;
    bar.scale.set(dx ? len : 3, dx ? 3 : len, 0.5);
    const cor = S.rays[4 + i], cx = [1, -1, -1, 1][i], cy = [1, 1, -1, -1][i];
    const cd = R + (gap - 0.75) * 0.8 + sq / 2;
    cor.position.x = cx * cd; cor.position.y = cy * cd;
    cor.scale.set(sq, sq, 0.5);
  }
  for (let i = 0; i < 8; i++) {
    const r = S.rays[8 + i];
    r.visible = g > 0.08;
    if (!r.visible) continue;
    // either side of each bar, further out, blinking in turn
    const side = i >> 1, sgn = (i & 1) ? 1 : -1;
    const dx = [1, 0, -1, 0][side], dy = [0, 1, 0, -1][side];
    const out = R + 5.5 + g * 3 + ((beat + i) % 2) * 1.5, off = sgn * 5;
    r.position.x = dx * out + (dx ? 0 : off);
    r.position.y = dy * out + (dy ? 0 : off);
    const s2 = 1.5 * Math.min(1, g * 1.6);
    r.scale.set(s2, s2, 0.5);
  }

  // Smiling face while someone is smiling at the camera
  const face = (g > 0.3 && sunVis > 0.5) ? constrain((g - 0.3) * 3, 0, 1) : 0;
  S.sunFace.visible = face > 0.01;
  M.face.opacity = face * sunVis;
}

// Drifting fair-weather clouds. They thin out at night and fade into the
// overcast as bad weather rolls in.
function drawFairClouds3(S, na, pal) {
  const vis = constrain(1.25 - weatherAlpha * 1.7, 0, 1) * lerp(1.0, 0.9, na);
  const on = vis > 0.02;
  const drift = t * 0.25 + windX * 12;
  for (let i = 0; i < S.clouds.length; i++) {
    const cl = S.clouds[i];
    const thin = i % 3 === 2 ? 1 - na : 1;                   // every third one goes home at night
    cl.g.visible = on && thin > 0.05;
    if (!cl.g.visible) continue;
    cl.g.position.x = (((cl.start * cl.span + drift * cl.rate) % cl.span) + cl.span) % cl.span - cl.span / 2;
    cl.g.scale.setScalar(thin);
  }
  if (!on) return;
  const f = pal.fair;
  wxSetCloudMats(S.cloudMats, f.hi, f.side, f.base, f.under, vis);
}

// ── Storm sky: grey clouds, the ceiling, lightning, the rainbow ──

// Grey clouds that drift in one by one as the weather builds. tier 0 is
// the nearest and biggest; `at` is the weatherAlpha each appears at.
const STORM_CLOUDS = [
  { tier: 0, v: 0.050, n: 12, at: 0.08 },
  { tier: 0, v: 0.085, n: 9,  at: 0.16 },
  { tier: 0, v: 0.035, n: 11, at: 0.25 },
  { tier: 0, v: 0.070, n: 13, at: 0.34 },
  { tier: 1, v: 0.060, n: 10, at: 0.04 },
  { tier: 1, v: 0.095, n: 8,  at: 0.12 },
  { tier: 1, v: 0.045, n: 10, at: 0.21 },
  { tier: 1, v: 0.080, n: 9,  at: 0.30 },
  { tier: 2, v: 0.060, n: 8,  at: 0.06 },
  { tier: 2, v: 0.045, n: 9,  at: 0.14 },
  { tier: 2, v: 0.070, n: 7,  at: 0.23 },
  { tier: 2, v: 0.052, n: 8,  at: 0.32 },
];
// Tiers 0 and 1 hang over the town, in front of the ridge; tier 2 is behind it.
const STORM_TIER_Z = [-24, -38, -72];
const RAINBOW_COLOURS = [PAL.re2, PAL.or2, PAL.ye2, PAL.gr2, PAL.wa2, PAL.bl2, PAL.pu2];
const LIGHTNING_MAX = 64;

// One layer of the storm ceiling: a row of big dark slabs hanging from
// above the view, with darker blocks hanging under them and paler billows
// on their faces. The row repeats, so it can scroll sideways for ever.
function wxBuildCeiling(z, c, vBase, vVar, rnd, order) {
  const yTop = wxViewY(0, z) + 2 * c;
  const period = Math.ceil((2 * wxViewHalfW(0.1, z) + 40) / c) * c;
  const boxes = [];
  let lowest = yTop;
  for (let x = 0; x < period;) {
    const w = Math.min(period - x, c * (3 + Math.floor(rnd() * 4)));
    const yb = Math.round(wxViewY(vBase + rnd() * vVar, z) / c) * c;
    boxes.push([x + w / 2, (yTop + yb) / 2, 0, w, yTop - yb, 6 * c, 2]);
    lowest = Math.min(lowest, yb - c);
    const cells = Math.round(w / c);
    if (rnd() < 0.85) {                                   // a block hanging underneath
      const pw = Math.min(cells, 1 + Math.floor(rnd() * 2)), px = x + c * Math.floor(rnd() * (cells - pw + 1));
      boxes.push([px + pw * c / 2, yb - c / 2, c, pw * c, c, 4 * c, 3]);
    }
    if (rnd() < 0.75 && cells >= 3) {                     // a paler billow on its face
      const bw = Math.min(cells - 1, 2 + Math.floor(rnd() * 2)), bx = x + c * Math.floor(rnd() * (cells - bw + 1));
      boxes.push([bx + bw * c / 2, yb + c * (1.5 + Math.floor(rnd() * 2)), 3.5 * c, bw * c, c, c, 1]);
    }
    x += w;
  }
  const mat = wxMat('#ffffff', { depthWrite: true });
  const mesh = wxInstanced(mat, boxes.length * 2, order, true);
  const shade = new Uint8Array(boxes.length * 2);
  boxes.forEach((b, i) => {
    wxSetBox(mesh, i * 2, b[0], b[1], b[2], b[3], b[4], b[5]);
    wxSetBox(mesh, i * 2 + 1, b[0] - period, b[1], b[2], b[3], b[4], b[5]);
    shade[i * 2] = shade[i * 2 + 1] = b[6];
  });
  mesh.count = boxes.length * 2;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.position.z = z;
  G3.scene.add(mesh);
  return { mesh, mat, shade, period, hide: yTop - lowest + 4 };
}

function buildStorm3() {
  wxScratch();
  const T = WX.storm = {};
  const rnd = weatherRng(20261122);

  // Drifting grey clouds, three depths
  T.tierMats = [wxCloudMats(), wxCloudMats(), wxCloudMats()];
  T.clouds = STORM_CLOUDS.map(sc => {
    const z = STORM_TIER_Z[sc.tier] - rnd() * 10;
    const c = Math.max(1, Math.round((G3.CAM.z - z) * [0.016, 0.0125, 0.0105][sc.tier] * 4) / 4);
    const g = wxBuildCloud(sc.n, c, rnd, T.tierMats[sc.tier]);
    const y = wxViewY(sc.v, z);
    g.position.set(0, y, z);
    g.visible = false;
    G3.scene.add(g);
    return { g, y, at: sc.at, start: rnd(), span: 2 * wxViewHalfW(sc.v, z) + g.userData.w + 16,
             rate: [0.00032, 0.00028, 0.00024][sc.tier] * (0.85 + rnd() * 0.3) * (G3.CAM.z - z), rise: 4 * c };
  });

  // The overcast: a paler far ceiling and the heavy deck in front of it
  T.far  = wxBuildCeiling(-200, 2.5, 0.06, 0.03, rnd, WX_ORDER.ceilFar);
  T.near = wxBuildCeiling(-170, 3, 0.025, 0.03, rnd, WX_ORDER.ceilNear);

  // Lightning: a white core inside a wider yellow glow, both instanced
  T.boltCoreMat = wxMat(PAL.white);
  T.boltGlowMat = wxMat(PAL.ye1, { opacity: 0.5 });
  T.boltGlow = wxInstanced(T.boltGlowMat, LIGHTNING_MAX, WX_ORDER.bolt);
  T.boltCore = wxInstanced(T.boltCoreMat, LIGHTNING_MAX, WX_ORDER.bolt + 0.1);
  T.boltGlow.visible = T.boltCore.visible = false;
  G3.scene.add(T.boltGlow, T.boltCore);

  // Rainbow: seven bands of blocks on one big circle. It stands over the
  // town, in front of the wooded ridge: it rises from the brook at the far
  // left, arches over the school's left wing and comes down behind the
  // tower. Its feet stop at the town's upper terrace.
  const z = -36, half = 22, footY = 3.6, cx = -13;
  const rise = wxViewY(0.004, z) - footY;                  // how high the arch can stand in the view
  const R = (half * half + rise * rise) / (2 * rise), cell = 0.4;
  const cy = footY + rise - R, yCut = footY;
  const edge = G3.pixelTex('wx_block_edge', 8, 8, g => {      // a faint edge, so the bands read as blocks
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 8, 8);
    g.fillStyle = '#dcdcdc'; g.fillRect(0, 7, 8, 1); g.fillRect(7, 0, 1, 8);
  });
  const cells = [];
  const n = Math.ceil(R / cell) + 1;
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
    const x = (i + 0.5) * cell, y = (j + 0.5) * cell;
    if (cy + y < yCut) continue;
    const band = Math.floor((R - Math.sqrt(x * x + y * y)) / cell);
    if (band < 0 || band >= RAINBOW_COLOURS.length) continue;
    cells.push([cx + x, cy + y, band]);
  }
  T.rainbowMat = new THREE.MeshBasicMaterial({ map: edge, fog: false, transparent: true, depthWrite: false, opacity: 0 });
  T.rainbow = wxInstanced(T.rainbowMat, cells.length, WX_ORDER.rainbow, true);
  cells.forEach((cl, i) => {
    wxSetBox(T.rainbow, i, cl[0], cl[1], z, cell, cell, cell);
    T.rainbow.setColorAt(i, WX.c.set(RAINBOW_COLOURS[cl[2]]));
  });
  T.rainbow.count = cells.length;
  T.rainbow.instanceMatrix.needsUpdate = true;
  T.rainbow.instanceColor.needsUpdate = true;
  T.rainbow.visible = false;
  G3.scene.add(T.rainbow);
  return T;
}

// Draws the weather in the sky: grey clouds that arrive one by one, the
// ceiling that slides down over the sky as the rain sets in, the lightning
// bolt and its flash, and the rainbow while the sky clears.
function drawWeatherSky() {
  if (!G3.ready) return;
  const T = WX.storm || buildStorm3();
  const na = nightAmount();
  const cloudy = weatherAlpha > 0.03;
  const drift = t + windX * 60;

  // Drifting grey clouds. Each rises into place at its own point as the
  // weather builds, so the sky fills up cloud by cloud.
  for (const cl of T.clouds) {
    const a = cloudy ? constrain((weatherAlpha - cl.at) / 0.1, 0, 1) : 0;
    cl.g.visible = a > 0.01;
    if (!cl.g.visible) continue;
    const e = a * a * (3 - 2 * a);
    cl.g.position.x = (((cl.start * cl.span + drift * cl.rate) % cl.span) + cl.span) % cl.span - cl.span / 2;
    cl.g.position.y = cl.y - (1 - e) * cl.rise * 0.5;
    cl.g.scale.setScalar(0.25 + 0.75 * e);
  }

  // The ceilings slide down from above the top of the view
  const farDrop = cloudy ? constrain((weatherAlpha - 0.42) / 0.36, 0, 1) : 0;
  const nearDrop = cloudy ? constrain((weatherAlpha - 0.36) / 0.5, 0, 1) : 0;
  wxPlaceCeiling(T.far, farDrop, -drift * 0.02 + 70);
  wxPlaceCeiling(T.near, nearDrop * nearDrop * (3 - 2 * nearDrop), -drift * 0.05);

  // Colours, when they have changed
  const pal = WX.pal || wxCloudColours(na);
  if (cloudy && (pal.fresh || !T.coloured)) {
    pal.fresh = false;
    T.coloured = true;
    for (let tier = 0; tier < 3; tier++) {
      const c = pal.tiers[tier];
      wxSetCloudMats(T.tierMats[tier], c[0], c[1], c[2], c[3], 1);
    }
    wxColourCeiling(T.near, pal.tiers[0]);
    wxColourCeiling(T.far, pal.tiers[1]);
  }

  // Lightning: the bolt, a pale sheet across the sky behind the clouds,
  // and the garden lit up for a moment. G3.setLight() has already set the
  // lights for this frame, so raising them here lasts exactly one frame.
  // Kept gentle: it lights the scene rather than whiting it out.
  const S = WX.sky;
  const f = lightningAlpha / 255;
  if (S) {
    S.flash.visible = f > 0;
    S.flashMat.opacity = f * 0.5;
  }
  if (f > 0) {
    G3.hemi.intensity += f * 0.4;
    G3.fill.intensity += f * 0.25;
  }
  drawLightningBolt(T);

  // The rainbow
  T.rainbow.visible = rainbowAmount > 0;
  T.rainbowMat.opacity = rainbowAmount * 0.78;
}
drawWeatherSky.g3 = true;

function wxPlaceCeiling(L, drop, scroll) {
  L.mesh.visible = drop > 0.001;
  if (!L.mesh.visible) return;
  L.mesh.position.x = ((scroll % L.period) + L.period) % L.period;
  L.mesh.position.y = (1 - drop) * L.hide;
}

// Colours a ceiling's slabs from four tones [highlight, light, mid, dark].
// The ceiling is seen from underneath, so it uses the darker three.
function wxColourCeiling(L, cols) {
  for (let i = 0; i < L.shade.length; i++) L.mesh.setColorAt(i, WX.c.set(cols[L.shade[i]]));
  L.mesh.instanceColor.needsUpdate = true;
}

// ── Lightning ─────────────────────────────────────────

// Plans a new bolt: it drops out of the cloud deck behind or beside the
// school in right-angled steps (down, across, down...), now and then
// throwing a thinner fork off to one side. Called once per strike so the
// bolt holds its shape while it flickers.
function makeLightningBolt() {
  lightningBolt.length = 0;
  lightningBoltNew = true;
  if (typeof G3 === 'undefined' || !G3.ready) return;
  const z = -random(32, 50);
  const where = random();
  let x = where < 0.4 ? random(-13, 13) : (where < 0.7 ? -1 : 1) * random(20, 40);
  let y = Math.ceil(wxViewY(0, z)) + 1;
  let dir = random() < 0.5 ? -1 : 1;
  const half = v => Math.round(v * 2) / 2;
  for (let guard = 0; y > -1 && guard < 14 && lightningBolt.length < LIGHTNING_MAX - 3; guard++) {
    const drop = half(random(1.5, 3.5));
    lightningBolt.push([x, y - drop / 2, z, 0.5, drop + 0.5, 1]);
    y -= drop;
    if (y <= -1) break;
    const run = dir * half(random(1, 3));
    lightningBolt.push([x + run / 2, y, z, Math.abs(run) + 0.5, 0.5, 1]);
    // Side fork: a thinner branch going the other way, then down
    if (random() < 0.35 && y > 3) {
      const fr = -dir * half(random(1.5, 3)), fd = half(random(1, 2.5));
      lightningBolt.push([x + fr / 2, y, z, Math.abs(fr) + 0.25, 0.25, 0]);
      lightningBolt.push([x + fr, y - fd / 2, z, 0.25, fd + 0.25, 0]);
    }
    x += run;
    if (random() < 0.35) dir = -dir;
  }
}

// Shows the bolt: a pale yellow glow with a white core. It shows bright at
// the strike, blinks off for a moment, then returns fainter before it fades.
function drawLightningBolt(T) {
  let a = 1;
  if (lightningAlpha < 105) a = 0;
  else if (lightningAlpha < 125) a = 0.55;
  else if (lightningAlpha < 150) a = 0;
  const on = a > 0 && lightningBolt.length > 0;
  T.boltCore.visible = T.boltGlow.visible = on;
  if (!on) return;
  if (lightningBoltNew) {
    lightningBoltNew = false;
    const n = Math.min(LIGHTNING_MAX, lightningBolt.length);
    for (let i = 0; i < n; i++) {
      const s = lightningBolt[i], glow = s[5] ? 0.6 : 0.3;
      wxSetBox(T.boltCore, i, s[0], s[1], s[2], s[3], s[4], s[5] ? 0.5 : 0.25);
      wxSetBox(T.boltGlow, i, s[0], s[1], s[2] - 0.2, s[3] + glow, s[4] + glow, 0.25);
    }
    T.boltCore.count = T.boltGlow.count = n;
    T.boltCore.instanceMatrix.needsUpdate = true;
    T.boltGlow.instanceMatrix.needsUpdate = true;
  }
  T.boltCoreMat.opacity = a;
  T.boltGlowMat.opacity = a * 0.5;
}

// The old 2D town called this to draw the foot of the rainbow in front of
// its hills. The rainbow is a real arch of blocks now, and the hills hide
// its feet by themselves, so there is nothing to queue.
function queueRainbowFoot() {}

// ── Rain ──────────────────────────────────────────────

const SPLASH_MAX = 160;

function buildRain3() {
  wxScratch();
  const R = WX.rain = { live: 0, next: 0 };
  R.mat = wxMat(PAL.sk2, { opacity: 0.6 });
  R.mesh = wxInstanced(R.mat, RAIN_DROPS, WX_ORDER.rain);
  // Splashes: for each one a flat square ripple and a little hopping cube
  R.splashMat = wxMat(PAL.white, { opacity: 0.7 });
  R.splash = wxInstanced(R.splashMat, SPLASH_MAX * 2, WX_ORDER.rain - 1);
  R.sp = new Float32Array(SPLASH_MAX * 3);    // x, z, frames left
  R.day = new THREE.Color(PAL.sk2);
  R.night = new THREE.Color(PAL.sk5);
  R.tipDay = new THREE.Color(PAL.white);
  R.tipNight = new THREE.Color(PAL.sk4);
  G3.scene.add(R.mesh, R.splash);
  return R;
}

// The rain itself: thin streaks falling through the whole garden, leaning
// with the wind, with a little splash wherever one lands on the lawn.
// Drops beyond the current rain strength finish their fall and then park,
// so a shower tapers off instead of vanishing.
function drawWeatherFront() {
  if (!G3.ready) return;
  const R = WX.rain || buildRain3();
  if (rainAmount <= 0.01 && R.live === 0) {
    R.mesh.visible = R.splash.visible = false;
    return;
  }
  while (fgRaindrops.length < RAIN_DROPS) fgRaindrops.push(newFgRaindrop());
  const na = nightAmount();
  const active = rainAmount > 0.01 ? Math.round(RAIN_DROPS * rainAmount) : 0;
  const fall = 0.75 + rainAmount * 0.25;
  // The streaks lean the way the drops are blown
  const vx = windX * 0.3, inv = 1 / Math.sqrt(vx * vx + 1), sx = vx * inv, cy = inv;
  const arr = R.mesh.instanceMatrix.array, wide = 0.055;
  const halfW = G3.GW / 2 + 0.5, deep = G3.GD + 0.5;
  let live = 0, k = 0;

  for (let i = 0; i < RAIN_DROPS; i++) {
    const drop = fgRaindrops[i];
    if (!drop.on) {
      if (i >= active) continue;
      aimFgRaindrop(drop);
      drop.on = true;
    }
    live++;
    drop.y -= drop.speed * fall;
    drop.x += vx * drop.speed * fall;
    if (drop.y <= 0) {
      // Landed: splash if that was on the lawn
      if (drop.x > -halfW && drop.x < halfW && drop.z > 0.2 && drop.z < deep) {
        const s = R.next * 3;
        R.sp[s] = drop.x; R.sp[s + 1] = drop.z; R.sp[s + 2] = 9;
        R.next = (R.next + 1) % SPLASH_MAX;
      }
      if (i < active) aimFgRaindrop(drop); else drop.on = false;
      continue;
    }
    const len = drop.len, o = k * 16;
    arr[o] = wide * cy;       arr[o + 1] = wide * sx;    arr[o + 2] = 0;      arr[o + 3] = 0;
    arr[o + 4] = -len * sx;   arr[o + 5] = len * cy;     arr[o + 6] = 0;      arr[o + 7] = 0;
    arr[o + 8] = 0;           arr[o + 9] = 0;            arr[o + 10] = wide;  arr[o + 11] = 0;
    arr[o + 12] = drop.x - len * sx / 2; arr[o + 13] = drop.y + len * cy / 2; arr[o + 14] = drop.z; arr[o + 15] = 1;
    k++;
  }
  R.mesh.count = k;
  R.mesh.visible = k > 0;
  R.mesh.instanceMatrix.needsUpdate = true;
  R.mat.color.copy(R.day).lerp(R.night, na * 0.55);
  R.mat.opacity = 0.62 - na * 0.14;

  // Splashes: a small cube hops up, then a flat square spreads and is gone
  let n = 0;
  for (let i = 0; i < SPLASH_MAX; i++) {
    const life = R.sp[i * 3 + 2];
    if (life <= 0) continue;
    const x = R.sp[i * 3], z = R.sp[i * 3 + 1], age = 9 - life;
    const size = 0.1875 + 0.0625 * Math.floor(age * 0.6);
    wxSetBox(R.splash, n++, x, 0.03, z, size, 0.03, size);
    if (life > 4) wxSetBox(R.splash, n++, x, 0.12 + 0.07 * age - 0.012 * age * age, z, 0.09, 0.09, 0.09);
    R.sp[i * 3 + 2] = life - 1;
    live++;
  }
  R.splash.count = n;
  R.splash.visible = n > 0;
  R.splash.instanceMatrix.needsUpdate = true;
  R.splashMat.color.copy(R.tipDay).lerp(R.tipNight, na * 0.55);
  R.live = live;
}
drawWeatherFront.g3 = true;

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

const PUDDLE_MAX = 20;      // spawnPuddleInWorld() never makes more

function buildPuddles3() {
  wxScratch();
  const P = WX.puddles = {};
  const make = (col, opacity, count, order) => {
    const m = new THREE.InstancedMesh(G3.geo(1, 1, 1), G3.mat(col, { transparent: true, opacity }), count);
    m.castShadow = false; m.receiveShadow = true;
    m.frustumCulled = false;
    m.renderOrder = order;
    m.count = 0;
    G3.scene.add(m);
    return m;
  };
  P.rim   = make(PAL.sk2, 0.7, PUDDLE_MAX * 3, 1);     // the lighter wet edge
  P.water = make(PAL.sk4, 0.86, PUDDLE_MAX * 3, 2);
  P.shine = make(PAL.sk1, 0.8, PUDDLE_MAX * 5, 3);     // glints, ripples, vapour
  return P;
}

// Sizes snap to eighths of a block (two texels), a quarter block at least.
function wxPuddleSnap(v) { return Math.max(2, Math.round(v * 8)) / 8; }

// One rectangle of a puddle: the water and, under it, a slightly larger
// and lighter slab that shows as the rim.
function wxPuddleRect(x, z, w, d) {
  const P = WX.puddles, T = G3.T;
  wxSetBox(P.rim, P.n, x, T * 0.5, z, w + 4 * T, T, d + 4 * T);
  wxSetBox(P.water, P.n, x, T * 0.75, z, w, T * 1.5, d);
  P.n++;
}

// Draw puddles: flat slabs of water a texel above the lawn, each made of
// one to three overlapping rectangles with a lighter rim, a glint that
// slides back and forth, square ripples while it rains, and little cubes
// of vapour as they dry up. They grow and shrink in texel steps.
function drawPuddles() {
  if (!G3.ready) return;
  const P = WX.puddles || buildPuddles3();
  const isRaining = (weatherState === 'rainy' || weatherState === 'stormy');
  const T = G3.T, snap = wxPuddleSnap, rect = wxPuddleRect;
  let ns = 0;
  P.n = 0;
  const count = Math.min(puddles.length, PUDDLE_MAX);
  for (let i = 0; i < count; i++) {
    const p = puddles[i];
    const s = Math.max(0.125, Math.round(p.size * 0.06 * 8) / 8);    // half its width, in blocks
    const x = Math.round((p.wx - 0.5) * G3.GW * 8) / 8, z = Math.round(p.wy * G3.GD * 8) / 8;
    const side = p.phase > PI ? 1 : -1;
    rect(x, z, s * 2, snap(s * 1.1));
    // A second and third pool to the sides make the outline less boxy
    if (s >= 0.5) rect(x + side * snap(s * 0.7), z + snap(s * 0.45), snap(s * 1.3), snap(s * 0.8));
    if (s >= 1)   rect(x - side * snap(s * 0.6), z - snap(s * 0.4), snap(s), snap(s * 0.6));
    if (s < 0.5) continue;

    // Glint along the far side
    const slide = Math.round(Math.sin(t * 0.04 + p.phase) * s * 0.25 * 16) / 16;
    wxSetBox(P.shine, ns++, x - s * 0.4 + slide, T * 1.6, z - snap(s * 1.1) / 2 + 3 * T, snap(s * 0.6), T * 0.4, T);

    if (isRaining) {
      // Raindrop rings. Each ring picks a new spot every time it restarts.
      const rings = s >= 1.25 ? 2 : 1;
      for (let k = 0; k < rings; k++) {
        const clock = t + Math.floor(p.phase * 40) + k * 13;
        const turn = Math.floor(clock / 24), frame = Math.floor((clock % 24) / 8);
        const reach = Math.max(0, s - 0.5);
        const ox = reach * ((((turn * 37 + k * 11) % 9) - 4) / 4);
        const size = Math.min(s, 0.125 + 0.1875 * frame);
        wxSetBox(P.shine, ns++, x + ox, T * 1.6, z + (k ? 2 * T : -T), size, T * 0.4, size);
      }
    }

    if (p.evaporating && p.size < p.maxSize * 0.5) {
      // Vapour: two little cubes that rise and shrink as the puddle dries
      const rise = ((t + p.phase * 20) % 48) / 48;
      const sz = 0.125 * (1 - rise * 0.6);
      wxSetBox(P.shine, ns++, x - 0.2, 0.2 + rise * 1.2, z, sz, sz, sz);
      const rise2 = (rise + 0.5) % 1, sz2 = 0.125 * (1 - rise2 * 0.6);
      wxSetBox(P.shine, ns++, x + 0.25, 0.2 + rise2 * 1.2, z + 0.1, sz2, sz2, sz2);
    }
  }
  P.rim.count = P.water.count = P.n;
  P.shine.count = ns;
  P.rim.visible = P.water.visible = P.n > 0;
  P.shine.visible = ns > 0;
  P.rim.instanceMatrix.needsUpdate = true;
  P.water.instanceMatrix.needsUpdate = true;
  P.shine.instanceMatrix.needsUpdate = true;
}
drawPuddles.g3 = true;

// ── Forecast panel ────────────────────────────────────

// What each kind of weather is called and which icon and colour it gets
function forecastKinds() {
  const night = nightAmount() > 0.5;
  return {
    sunny:    { icon: night ? 'wx_clear_night' : 'wx_sunny', label: night ? 'Clear' : 'Sunny', col: PAL.ye2 },
    cloudy:   { icon: 'wx_cloudy',   label: 'Cloudy',   col: PAL.g1  },
    rainy:    { icon: 'wx_rainy',    label: 'Rain',     col: PAL.wa2 },
    stormy:   { icon: 'wx_stormy',   label: 'Storm',    col: PAL.pu1 },
    clearing: { icon: 'wx_clearing', label: 'Clearing', col: PAL.or1 }
  };
}

// Draw the HUD forecast strip showing the current weather and what is
// coming next. It is one slim row in the top right corner, low enough to
// leave the town's skyline (Town Hall clock, church spire, RAIL TRAIL sign)
// in view underneath it.
function drawWeatherForecast() {
  const elapsed  = weatherDuration - weatherTimer;
  const progress = constrain(elapsed / weatherDuration, 0, 1);
  const chance   = floor(constrain(
    progress < 0.5
      ? map(progress, 0, 0.5, 8, 30)
      : map(progress, 0.5, 1.0, 30, 95),
    8, 95
  ));

  const kinds = forecastKinds();
  const curr = kinds[weatherState] || kinds.sunny;
  const next = kinds[nextWeatherState] || kinds.sunny;
  const frame = PX.anim(2, 24);

  // The strip is as wide as its longest possible labels, so it never
  // changes size while it is on screen
  let labelW = 0;
  for (const k in kinds) labelW = Math.max(labelW, PX.measure(kinds[k].label));
  labelW = Math.max(labelW, PX.measure('Clear'));
  const barW = 16;
  const nextW = Math.max(labelW, barW + 3 + PX.measure('95%'));
  const panelH = 18;
  const panelW = 2 + 16 + 3 + labelW + 9 + 16 + 3 + nextW + 3;
  const px = PX.W - panelW - 3, py = 3;

  PX.panel(px, py, panelW, panelH, PAL.ink, PAL.g5, 2);

  // NOW: icon, then the label in the colour of the weather
  let x = px + 2;
  PX.spr(curr.icon, x, py + 1, { frame });
  x += 19;
  PX.text('NOW', x, py + 1, { color: PAL.g3 });
  // Blinking "live" dot beside it
  PX.rect(x + PX.measure('NOW') + 3, py + 5, 2, 2, PX.anim(2, 30) ? curr.col : PAL.g5);
  PX.text(curr.label, x, py + 8, { color: curr.col });
  x += labelW;

  // A small arrow points on to what is coming
  PX.rect(x + 3, py + 6, 1, 5, PAL.g4);
  PX.rect(x + 4, py + 7, 1, 3, PAL.g4);
  PX.px(x + 5, py + 8, PAL.g4);
  x += 9;

  // NEXT: icon, a bar that fills as the change gets nearer, the chance and the label
  PX.spr(next.icon, x, py + 1, { frame });
  x += 19;
  const chanceCol = chance < 35 ? PAL.wa2 : (chance < 65 ? PAL.ye2 : PAL.or2);
  const barY = py + 4;
  PX.rect(x, barY, barW, 3, PAL.g5);
  PX.rect(x, barY, Math.round(barW * chance / 100), 3, chanceCol);
  for (let bx = x + 3; bx < x + barW; bx += 4) PX.rect(bx, barY, 1, 3, PAL.ink);   // segment gaps
  PX.text(chance + '%', x + nextW, py + 1, { color: chanceCol, align: 'right' });
  PX.text(next.label, x, py + 8, { color: next.col });
}
drawWeatherForecast.pixel = true;
