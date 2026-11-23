// ================================================================
// File: sketch.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 12, 2026
// Description: Main entry point containing p5.js setup() and draw()
//              functions. Initializes all systems (video, face detection,
//              sounds, characters, weather) and runs the core render loop.
// ================================================================

// Initializes canvas, webcam, face detection, sounds, characters, and world state
function setup() {
  readDebugParams();
  if (DEBUG.seed !== null) randomSeed(DEBUG.seed);
  pixelDensity(1);   // one canvas pixel per screen pixel keeps the art grid crisp
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.id("canvas");
  colorMode(HSL, 360, 100, 100, 255);
  PX.resize(drawingContext, width, height);
  G3.init(width, splitY());
  PX.loadFonts();
  loadSmileStats();

  if (!DEBUG.demo) {
    // A refused camera or a missing ML library must not stop the garden
    try {
      video = createCapture(VIDEO, function(stream) {
        const track    = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        videoW = settings.width  || 640;
        videoH = settings.height || 480;
      });
      video.id("video");
      video.hide();

      if (typeof ml5 !== 'undefined') {
        faceapi = ml5.faceApi(video, {
          withLandmarks:   true,
          withExpressions: true,
          withDescriptors: true,
          minConfidence:   0.5,
          MODEL_URL: 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models@face-api/models/faceapi'
        }, faceReady);
      }
    } catch (e) { video = null; }
  }

  if (typeof nsfwjs !== 'undefined' && !DEBUG.demo) nsfwjs.load().then(function(model) {
    nsfwModel = model;
    nsfwReady = true;
  }).catch(function() { /* no moderation model (offline): snaps are allowed through */ });

  soundFormats('mp3', 'wav');
  birds = loadSound('sounds/birds.mp3',    () => { birds.setVolume(0.4); birds.loop(); });
  chewing = loadSound('sounds/chewing.mp3', () => { chewing.setVolume(0.6); });
  sheep   = loadSound('sounds/sheep.wav',   () => { sheep.setVolume(0.7); });
  shine   = loadSound('sounds/shine.mp3',   () => { shine.setVolume(0); shine.loop(); });
  dirt    = loadSound('sounds/dirt.mp3',    () => { dirt.setVolume(0.2); });
  fart    = loadSound('sounds/fart.mp3',    () => { fart.setVolume(0.3); });
  quackSound = loadSound('sounds/quack.mp3', () => { quackSound.setVolume(0.1); });
rain= loadSound('sounds/rain.mp3', () => { rain.setVolume(0.2); });
  lightning = loadSound('sounds/lightning.mp3', () => { lightning.setVolume(0.3); });
  nightSound = loadSound('sounds/night.mp3', () => { nightSound.setVolume(0.3); });

  milestone67Sound = loadSound('sounds/milestone67.mp3', () => { milestone67Sound.setVolume(0.15); });
  const msFiles = [
    'sounds/milestone_ten.mp3'
  ];
  for (let f of msFiles) {
    loadSound(f, function(s) { s.setVolume(0.15); milestoneSounds.push(s); });
  }


  ramSpeechTimer      = floor(random(200, 400));
  gardenerSpeechTimer = floor(random(200, 500));
  groundhogTimer = floor(random(600, 1800));
  hatTimeTimer = floor(random(1800, 3600));

  for (let i = 0; i < 600; i++) {
    grassBlades.push({
      wx: random(0.0, 1.0), wy: random(0.0, 1.0),
      h:  random(5, 12),    w:  random(0.8, 1.8),
      lean:  random(-0.25, 0.25),
      phase: random(TWO_PI),
      shade: random(95, 125),
    });
  }
  grassBlades.sort((a, b) => a.wy - b.wy);

  // Generate star positions (once)
  for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
      x: random(0, 1),
      y: random(0.02, 0.85),
      size: random(1, 3),
      twinklePhase: random(TWO_PI),
      twinkleSpeed: random(0.02, 0.06),
      brightness: random(60, 100)
    });
  }

  weatherTimer = floor(random(1800, 3600));
  for (let i = 0; i < 200; i++) raindrops.push(newRaindrop());
  for (let i = 0; i < 120; i++) fgRaindrops.push(newFgRaindrop());

  for (let i = 0; i < 3; i++) creatures.push(new Butterfly());
  for (let i = 0; i < 2; i++) creatures.push(new Bee());

  ram      = new Ram();
  gardener = new Gardener();
  goose    = new Goose();
  cat      = new Cat();

  const firstOptions = {
    sunny:['cloudy'], cloudy:['sunny','rainy','stormy'],
    rainy:['cloudy','clearing'], stormy:['rainy','clearing'], clearing:['sunny']
  };
  const fo = firstOptions[weatherState];
  nextWeatherState = fo[floor(random(fo.length))];
  weatherDuration  = 3600;

  mrPerkinsTimer = floor(random(1800, 3600));
  mrConantTimer = floor(random(5400, 10800));

  panelCycle = getPanelCycle();
  applyDebugParams();
}

// Builds the panel rotation order: gallery first, then each character card
function getPanelCycle() {
  const cycle = ['gallery'];
  for (let c of CHARACTER_CARDS) cycle.push(c.id);
  return cycle;
}

// Main render loop — runs every frame (60fps). Updates world state,
// draws scene layers, processes face detection, and handles smile snaps
function draw() {
  if (random() < 0.008) windTarget = random(-1, 1);
  windX += (windTarget - windX) * 0.004;

  // Keep AudioContext alive — Chrome suspends it after extended idle
  if (frameCount % 300 === 0) {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) { /* ignore */ }
  }

  // Face-detection stall watchdog — if ml5 hasn't ticked in 5s, clear stale
  // detections (so hats/boxes stop drawing on ghost positions) and re-kick the loop.
  if (lastFaceUpdate > 0 && millis() - lastFaceUpdate > 5000) {
    detections = [];
    try { if (faceapi) faceapi.detect(gotFaces); } catch (e) { /* ignore */ }
    lastFaceUpdate = millis(); // debounce: give it 5s before next kick
  }

  // Advance day/night cycle
  dayNightT += daySpeed;
  timeOfDay = (dayNightT % DAY_CYCLE_DURATION) / DAY_CYCLE_DURATION;

  sunGlow  += ((h ? 1.0 : 0.0) - sunGlow)  * 0.04;
  shineVol += ((h ? 0.1 : 0.0) - shineVol) * 0.02;
  if (shine) shine.setVolume(constrain(shineVol, 0.0, 0.3));

  // Rebuild separation positions before updates
  characterPositions = [
    { id: 'ram',      wx: ram.wx,      wy: ram.wy },
    { id: 'gardener', wx: gardener.wx, wy: gardener.wy },
    { id: 'goose',    wx: goose.wx,    wy: goose.wy },
    { id: 'cat',      wx: cat.wx,      wy: cat.wy },
  ];
  for (let i = 0; i < kids.length; i++) {
    characterPositions.push({ id: 'kid_' + i, wx: kids[i].wx, wy: kids[i].wy });
  }

  // ── Garden render ───────────────────────────────────
  // The garden is a 3D block world drawn by G3 on its own canvas behind
  // this one. Every module's draw function builds its boxes the first time
  // and then just poses them; G3.render() draws the lot. This canvas is
  // kept clear over the garden so the 3D view shows through, and the 2D
  // extras (speech bubbles, forecast, banners) are laid on top of it.
  const gctx = drawingContext;
  gctx.clearRect(0, 0, width, splitY());
  PX.tick = frameCount;
  G3.beginFrame(frameCount);
  G3.setSky(skyStops(), Math.floor(timeOfDay * 900) + '|' + Math.round(weatherAlpha * 20));
  G3.setLight(timeOfDay, Math.min(weatherAlpha, 1), {
    r: lerpKeyframes(TINT_KEYFRAMES, timeOfDay, 'r'), g: lerpKeyframes(TINT_KEYFRAMES, timeOfDay, 'g'),
    b: lerpKeyframes(TINT_KEYFRAMES, timeOfDay, 'b'), a: lerpKeyframes(TINT_KEYFRAMES, timeOfDay, 'a'),
  });

  G3.call(drawTown);
  G3.call(drawGround);
  G3.call(drawTrees);
  G3.call(drawGrass);
  G3.call(drawSchool);
  updatePuddles();
  G3.call(drawPuddles);
  updateWeather();
  G3.call(drawSkyLayer);      // sun, moon, stars, fair-weather clouds
  G3.call(drawWeatherSky);    // storm clouds, rainbow, lightning

  // Updates
  for (let c of creatures) c.update();
  ram.update();
  gardener.update();
  goose.update();
  cat.update();
  for (let k of kids) k.update();
  for (let b of birds_flock) b.update();
  for (let r of rabbits) r.update();
  groundhogTimer--;

  if (groundhogTimer <= 0 && groundhog === null) {
  groundhog = new Groundhog();
  groundhogTimer = floor(random(900, 2400));
}
if (groundhog) {
  groundhog.update();
  if (groundhog.done) groundhog = null;
}

  mrPerkinsTimer--;
  if (mrPerkinsTimer <= 0 && mrPerkins === null) {
    mrPerkins = new MrPerkins();
    mrPerkinsTimer = floor(random(3600, 7200));
  }
  if (mrPerkins) { mrPerkins.update(); if (mrPerkins.done) mrPerkins = null; }

  // Mr. Conant — less frequent than Mr. Perkins
  mrConantTimer--;
  if (mrConantTimer <= 0 && mrConant === null) {
    mrConant = new MrConant();
    mrConantTimer = floor(random(7200, 14400)); // ~2-4 min between appearances
  }
  if (mrConant) { mrConant.update(); if (mrConant.done) mrConant = null; }

  // Principal update
  if (principal) { principal.update(); if (principal.done) principal = null; }

  // Teachers and arrival kids update
  for (let tc of teachers) tc.update();
  teachers = teachers.filter(tc => !tc.done);
  for (let ak of arrivalKids) ak.update();
  arrivalKids = arrivalKids.filter(ak => !ak.done);

  // Dawn/dusk arrival events — staggered spawning via frame counter
  const isDawn = timeOfDay > 0.05 && timeOfDay < 0.12;
  const isDusk = timeOfDay > 0.62 && timeOfDay < 0.70;

  if (isDawn && !wasDawn) {
    if (!principal) principal = new Principal('dawn');
    arrivalSpawnTimer = 1; // start staggered spawning
  }
  wasDawn = isDawn;

  if (isDusk && !wasDusk) {
    if (!principal) principal = new Principal('dusk');
    arrivalSpawnTimer = -1; // negative = departing
  }
  wasDusk = isDusk;

  // Staggered spawning: one new character every 30 frames
  if (arrivalSpawnTimer !== 0) {
    const departing = arrivalSpawnTimer < 0;
    const count = abs(arrivalSpawnTimer);
    if (count % 30 === 1) {
      const wave = floor(count / 30);
      if (wave < 5) {
        arrivalKids.push(new ArrivalKid(departing));
      }
      if (wave < 3 && wave % 2 === 0) {
        teachers.push(new Teacher(departing));
      }
    }
    if (departing) arrivalSpawnTimer--;
    else arrivalSpawnTimer++;
    if (abs(arrivalSpawnTimer) > 180) arrivalSpawnTimer = 0; // done after 3 seconds
  }

  // Bird flock management
  if (frameCount % 300 === 0 && birds_flock.length < 8 && random() < 0.6) {
    birds_flock.push(new Bird());
  }
  birds_flock = birds_flock.filter(b => !b.done);

  // Depth-sorted render list
  let renderList = [];
  for (let f of flowers)  renderList.push({ wy: f.wy, obj: f });
  renderList.push({ wy: ram.wy,      obj: ram });
  renderList.push({ wy: gardener.wy, obj: gardener });
  renderList.push({ wy: goose.wy,    obj: goose });
  renderList.push({ wy: cat.wy,      obj: cat });
  if (mrPerkins) renderList.push({ wy: mrPerkins.wy, obj: mrPerkins });
  if (mrConant)  renderList.push({ wy: mrConant.wy,  obj: mrConant });
  for (let k of kids)    renderList.push({ wy: k.wy, obj: k });
  for (let r of rabbits) renderList.push({ wy: r.wy, obj: r });
  if (groundhog) renderList.push({ wy: groundhog.wy, obj: groundhog });
  if (principal) renderList.push({ wy: principal.wy, obj: principal });
  for (let tc of teachers)     renderList.push({ wy: tc.wy, obj: tc });
  for (let ak of arrivalKids)  renderList.push({ wy: ak.wy, obj: ak });

  // Everyone poses their model (no sorting needed: it is real depth now)
  for (let item of renderList) G3.drawEntity(item.obj);
  for (let c of creatures) G3.drawEntity(c);     // they hide themselves at night
  for (let b of birds_flock) G3.drawEntity(b);
  G3.call(updateAndDrawFireflies);
  G3.call(drawWeatherFront);                     // the rain
  G3.render();

  // 2D on top of the garden
  PX.begin();
  speechBubbles = speechBubbles.filter(b => b.update());
  for (let b of speechBubbles) PX.drawEntity(b);
  PX.call(drawWeatherForecast);
  drawGardenLabels();
  PX.end();

  // Rabbit spawning
  if (frameCount % 900 === 0 && rabbits.length < 2 && random() < 0.5) {
    rabbits.push(new Rabbit());
  }
  if (weatherState === 'stormy' && rabbits.length === 0 && frameCount % 60 === 0) {
    rabbits.push(new Rabbit());
  }
  rabbits = rabbits.filter(r => !r.done);

  // Video bottom section
  noStroke(); fill(0, 0, 8);
  rect(0, splitY(), width, height - splitY());

  {
    // The video rectangle is snapped to the art grid so the pixel panels
    // on either side butt up against it exactly.
    const destH  = PX.SH - PX.H;                       // art pixels
    const minPanel = Math.min(Math.round(150 / PX.S), Math.round(PX.W * 0.15));
    const availW = PX.W - minPanel * 2;
    const haveVideo = !!(video && videoW && videoH);
    const videoAspect = haveVideo ? videoW / videoH : 4 / 3;   // until the camera reports in

    let aw, ah;
    if (videoAspect > availW / destH) { aw = availW; ah = Math.round(availW / videoAspect); }
    else                              { ah = destH;  aw = Math.round(destH * videoAspect); }
    const ax = Math.floor((PX.W - aw) / 2);
    const ay = Math.floor((destH - ah) / 2);
    videoArt = { x: ax, y: PX.H + ay, w: aw, h: ah };

    const offsetX = ax * PX.S, offsetY = ay * PX.S;
    const displayW = aw * PX.S, displayH = ah * PX.S;
    videoOffsetX  = offsetX;
    videoOffsetY  = offsetY;
    videoDisplayW = displayW;
    videoDisplayH = displayH;

    PX.begin();
    PX.call(drawCareScore, offsetX);
    manageGallery();
    PX.call(drawSmileGallery, offsetX);
    PX.end();

    if (haveVideo) {
      push();
      translate(offsetX + displayW, splitY() + offsetY);
      scale(-1, 1);
      image(video, 0, 0, displayW, displayH);
      pop();
    }

    PX.begin();
    if (haveVideo) {
      PX.call(drawBoxes, detections, offsetX, displayW, displayH);
      PX.call(drawFaceDecorations, detections);
    } else {
      // No camera yet (or permission refused): say so instead of a blank hole
      PX.rect(videoArt.x, videoArt.y, videoArt.w, videoArt.h, PAL.g5);
      const big = videoArt.w >= 120 ? 2 : 1;
      const used = PX.text(DEBUG.demo ? 'Demo garden' : 'Waiting for the camera...', videoArt.x + videoArt.w / 2, videoArt.y + videoArt.h / 2 - 14 * big,
        { align: 'center', color: PAL.g1, maxW: videoArt.w - 12, scale: big });
      PX.text(DEBUG.demo ? 'On the school TV your smile grows a flower here' : 'Allow camera access to grow flowers', videoArt.x + videoArt.w / 2, videoArt.y + videoArt.h / 2 - 14 * big + used + 6,
        { align: 'center', color: PAL.g3, maxW: videoArt.w - 12 });
    }
    PX.end();
  }

  // Snap check — group snap: bundle co-smiling faces into one flower
  for (let i = 0; i < detections.length; i++) {
    const key = detections[i]._smileKey;
    if (!key || !faceSmileData[key]) continue;
    const faceData = faceSmileData[key];

    if (faceData.frames >= SMILE_HOLD_REQUIRED &&
        !faceData.snapped &&
        millis() - lastSnapTime > SNAP_COOLDOWN) {

      faceData.snapped = true;
      faceData.frames  = 0;
      lastSnapTime     = millis();
      postSnapPause    = 90;

      const triggerBox = detections[i].alignedRect._box;
      const triggerCX  = triggerBox._x + triggerBox._width / 2;
      const triggerCY  = triggerBox._y + triggerBox._height / 2;

      // Capture trigger face
      let triggerImg = captureFaceImg(triggerBox);

      // Collect co-smiling faces sorted by proximity to trigger
      let coSmilers = [];
      for (let j = 0; j < detections.length; j++) {
        if (j === i) continue;
        const jKey = detections[j]._smileKey;
        if (!jKey || !faceSmileData[jKey]) continue;
        if (faceSmileData[jKey].snapped) continue;
        if (detections[j].expressions.happy * 100 <= 75) continue;

        const jBox = detections[j].alignedRect._box;
        const jCX  = jBox._x + jBox._width / 2;
        const jCY  = jBox._y + jBox._height / 2;
        const d    = sqrt((jCX - triggerCX) ** 2 + (jCY - triggerCY) ** 2);
        coSmilers.push({ idx: j, dist: d });
      }
      coSmilers.sort((a, b) => a.dist - b.dist);
      const groupMembers = coSmilers.slice(0, MAX_GROUP_FACES - 1);

      // Capture group face images and mark snapped
      let groupImgs = [triggerImg];
      for (let gm of groupMembers) {
        const det   = detections[gm.idx];
        const gmKey = det._smileKey;
        faceSmileData[gmKey].snapped = true;
        faceSmileData[gmKey].frames  = 0;
        groupImgs.push(captureFaceImg(det.alignedRect._box));
      }

      // NSFW check — if model is ready, verify the video frame is safe
      if (nsfwReady && nsfwModel) {
        const vidEl = document.getElementById('video');
        nsfwModel.classify(vidEl).then(function(predictions) {
          const validImgs = isFrameSafe(predictions) ? groupImgs : [];
          if (validImgs.length > 0) {
            careScore += validImgs.length;
            saveSmileStats(validImgs.length);
            checkMilestone();
            nextFlowerImgs = validImgs;
            pendingPhoto   = triggerImg;
            if (validImgs.length > 1) {
              groupSnapLabel = validImgs.length + '-Person Group Photo!';
              groupSnapAlpha = 255;
            }
          } else {
            // Unsafe — discard images
            for (let img of groupImgs) img.remove();
            postSnapPause = 0;
          }
        });
      } else {
        // Model not loaded yet — allow through
        careScore += groupImgs.length;
        saveSmileStats(groupImgs.length);
        checkMilestone();
        nextFlowerImgs = groupImgs;
        pendingPhoto   = triggerImg;
        if (groupImgs.length > 1) {
          groupSnapLabel = groupImgs.length + '-Person Group Photo!';
          groupSnapAlpha = 255;
        }
      }
      break; // one snap event per frame
    }
  }

  if (DEBUG.demo) runDemoSmiles();

  // Flower spawning — once per snap
  if (postSnapPause > 0) postSnapPause--;
  if (postSnapPause === 89) {
    addFlower(random(0.05, 0.95), random(FLOWER_MIN_WY, 1.0),
              [random(360), random(55, 90), random(55, 72)]);
  }

  // Kids weather & night behaviour
  const noKidsWeather = weatherState === 'rainy' || weatherState === 'stormy';
  const noKidsNight = nightAmount() > 0.4;
  const noKids = noKidsWeather || noKidsNight;
  if (frameCount % 480 === 0 && kids.length < 6 && random() < 0.7 && !noKids) {
    kids.push(new Kid());
  }
  if (noKids) {
    for (let k of kids) {
      if (k.state !== 'return' && k.state !== 'done') {
        k.state = 'return';
        k.twx = 0.5 + random(-0.06, 0.06);
        k.twy = 0.01;
      }
    }
  }

  if (groupSnapAlpha > 0) groupSnapAlpha -= 3;

  // Hat Time — only when raining
  const isRaining = weatherState === 'rainy' || weatherState === 'stormy';
  if (isRaining && !wasRaining) {
    hatTimeActive = true;
    hatTimeAlpha = 255;
    // Principal comes to the door when it rains
    if (!principal) principal = new Principal('rain');
  }
  if (!isRaining && wasRaining) {
    hatTimeActive = false;
  }
  wasRaining = isRaining;

  if (hatTimeAlpha > 0) hatTimeAlpha -= 2;

  PX.begin();
  PX.call(updateDrawConfetti);
  PX.call(drawCountdown);
  PX.end();
  t++;
}

// ── Garden render helpers ─────────────────────────────

// Big announcements over the garden: group photos and rain hat time.
function drawGardenLabels() {
  const banner = (label, alpha, y, color) => {
    PX.alpha(alpha / 255, () => {
      const w = PX.measure(label, 'bold') + 16;
      PX.box(PX.W / 2 - w / 2, y, w, 16, PAL.ink, PAL.sk8);
      PX.text(label, PX.W / 2, y + 4, { font: 'bold', align: 'center', color });
    });
  };
  if (groupSnapAlpha > 0) banner(groupSnapLabel, Math.min(255, groupSnapAlpha * 2), PX.H - 40, PAL.ye2);
  if (hatTimeAlpha > 0) banner("It's raining, put on a hat!", Math.min(255, hatTimeAlpha * 2), PX.H - 20, PAL.wa1);
}

// ── Debug URL parameters ──────────────────────────────
// Handy for testing and screenshots, e.g.
//   ?t=0.75&weather=rainy&flowers=40&spawn=kids,perkins&seed=7&freeze=1
//   t        time of day 0..1 (0.25 morning, 0.5 midday, 0.6 golden hour, 0.9 night)
//   weather  sunny | cloudy | rainy | stormy | clearing
//   speed    day-cycle multiplier, freeze=1 stops the clock
//   flowers  plant this many demo flowers with stand-in faces
//   settled  with flowers: show them at their settled garden size
//   spawn    comma list: kids, rabbit, birds, groundhog, perkins, conant, principal,
//            teachers, arrivals, departures, confetti, hats
//   panel    show one side panel: gallery | ram | gardener | kids | school | ...
//   page     hold an I SPY card on page N of its text
//   score    set today's CARE score
//   seed     fixed random seed for repeatable layouts
//   demo     run without a camera: stand-in smiles keep planting flowers
const DEBUG = { seed: null, active: false, demo: false, demoTimer: 120 };

function readDebugParams() {
  // A host page can supply the parameters itself (window.CARE_QUERY) where
  // the address bar's query string is not available.
  const q = new URLSearchParams(window.CARE_QUERY || window.location.search);
  DEBUG.q = q;
  DEBUG.active = [...q.keys()].length > 0;
  if (q.has('seed')) DEBUG.seed = parseInt(q.get('seed')) || 1;
  // Demo mode: no camera or face detection; stand-in smiles plant the flowers.
  DEBUG.demo = q.has('demo');
}

function applyDebugParams() {
  const q = DEBUG.q;
  if (!q || !DEBUG.active) return;
  if (q.has('t')) dayNightT = Math.round(parseFloat(q.get('t')) * DAY_CYCLE_DURATION);
  if (q.has('speed')) daySpeed = parseFloat(q.get('speed')) || 1;
  if (q.has('freeze')) daySpeed = 0;
  if (q.has('weather')) {
    weatherState = q.get('weather');
    weatherTimer = 999999; weatherDuration = 999999;
    weatherAlpha = { sunny: 0, cloudy: 0.3, rainy: 0.6, stormy: 1, clearing: 0.3 }[weatherState] || 0;
  }
  if (q.has('score')) { careScore = parseInt(q.get('score')) || 0; smileStats.today = careScore; }
  if (q.has('panel')) {
    panelMode = q.get('panel');
    panelCycleIdx = Math.max(0, panelCycle.indexOf(panelMode));
    panelModeTimer = Infinity;   // millis() - Infinity never exceeds the cycle time
  }
  const n = parseInt(q.get('flowers')) || 0;
  for (let i = 0; i < n; i++) {
    const group = i % 4 === 3 ? 2 + (i % 5) : (i % 6 === 5 ? 0 : 1);
    nextFlowerImgs = [];
    for (let k = 0; k < group; k++) nextFlowerImgs.push(makeDemoFace(i * 7 + k));
    if (group > 0 && i < MAX_GALLERY) smileGallery.push({ img: makeDemoFace(i * 7), alpha: 255 });
    addFlower(random(0.05, 0.95), random(FLOWER_MIN_WY, 1.0), [random(360), random(55, 90), random(55, 72)]);
  }
  const settled = q.has('settled');
  for (let f of flowers) {
    f.targetSize = f.restSize;          // not boosted by the flowers planted after it
    f.size = f.targetSize;
    f.dirtAlpha = 0;
    if (settled) f.age = 999;           // skip the first couple of minutes
  }
  for (const what of (q.get('spawn') || '').split(',')) {
    if (what === 'kids')       for (let i = 0; i < 5; i++) kids.push(new Kid());
    if (what === 'rabbit')     { rabbits.push(new Rabbit()); rabbits.push(new Rabbit()); }
    if (what === 'birds')      for (let i = 0; i < 5; i++) birds_flock.push(new Bird());
    if (what === 'groundhog')  groundhog = new Groundhog();
    if (what === 'perkins')    mrPerkins = new MrPerkins();
    if (what === 'conant')     mrConant = new MrConant();
    if (what === 'principal')  principal = new Principal('dawn');
    if (what === 'teachers')   for (let i = 0; i < 3; i++) teachers.push(new Teacher(i % 2 === 0));
    if (what === 'arrivals')   for (let i = 0; i < 5; i++) arrivalKids.push(new ArrivalKid(false));
    if (what === 'departures') for (let i = 0; i < 5; i++) arrivalKids.push(new ArrivalKid(true));
    if (what === 'confetti')   { lastMilestoneCelebrated = 100; launchConfetti(); }
    if (what === 'hats')       { hatTimeActive = true; hatTimeAlpha = 255; }
  }
}

// Demo mode's stand-in visitors: every few seconds one to three of them
// "smile" and a flower is planted, exactly as a real snap would do it,
// except that nothing is saved to the smile stats.
function runDemoSmiles() {
  if (--DEBUG.demoTimer > 0) return;
  DEBUG.demoTimer = floor(random(240, 600));
  const r = random();
  const n = r < 0.7 ? 1 : r < 0.9 ? 2 : 3;
  const faces = [];
  for (let k = 0; k < n; k++) faces.push(makeDemoFace(floor(random(100000))));
  careScore += n;
  smileStats.today = careScore;
  checkMilestone();
  nextFlowerImgs = faces;
  pendingPhoto = faces[0];
  if (n > 1) { groupSnapLabel = n + '-Person Group Photo!'; groupSnapAlpha = 255; }
  postSnapPause = 90;
}

// A stand-in "photo" of a smiling face so flowers can be tested without a camera.
function makeDemoFace(i) {
  const g = createGraphics(96, 96);
  g.pixelDensity(1);
  g.colorMode(HSL, 360, 100, 100, 255);
  g.noStroke();
  g.background((i * 47) % 360, 35, 78);
  const skin = [[28, 60, 82], [26, 55, 70], [24, 50, 56], [22, 45, 40], [20, 40, 30]][i % 5];
  g.fill((i * 83) % 60 + 10, 45, 18 + (i * 13) % 45);
  g.ellipse(48, 38, 76, 70);                       // hair
  g.fill(skin[0], skin[1], skin[2]);
  g.ellipse(48, 52, 60, 68);                       // face
  g.fill(0, 0, 12);
  g.ellipse(36, 46, 7, 9); g.ellipse(60, 46, 7, 9);
  g.noFill(); g.stroke(0, 60, 30); g.strokeWeight(3);
  g.arc(48, 60, 30, 22, 0.15, PI - 0.15);          // smile
  return g;
}

// Checks NSFW model predictions to ensure the video frame is appropriate
function isFrameSafe(predictions) {
  for (let p of predictions) {
    if ((p.className === 'Porn' || p.className === 'Hentai') && p.probability > 0.3) {
      return false;
    }
  }
  return true;
}

// Captures a face region from the video feed as a mirrored image
function captureFaceImg(box) {
  // Square crop a little wider than the detected box so hair and chin make
  // it into the flower, kept inside the video frame.
  const vw = videoW || video.width, vh = videoH || video.height;
  let side = Math.min(Math.max(box._width, box._height) * 1.15, vw, vh);
  const cx = box._x + box._width / 2, cy = box._y + box._height / 2;
  const sx = constrain(cx - side / 2, 0, vw - side);
  const sy = constrain(cy - side / 2, 0, vh - side);
  // Faces are shown small, so 128px is plenty; a garden of 1,000 flowers
  // would otherwise hold hundreds of megabytes of full-size captures.
  const out = Math.max(16, Math.min(FACE_CAPTURE_SIZE, Math.round(side)));
  let img = createGraphics(out, out);
  img.pixelDensity(1);
  img.push();
  img.translate(out, 0);
  img.scale(-1, 1);
  img.image(video, 0, 0, out, out, sx, sy, side, side);
  img.pop();
  return img;
}

// Spawns a new flower at world coordinates with the captured face images
function addFlower(wx, wy, hsl) {
  const imgs = nextFlowerImgs;
  nextFlowerImgs = [];
  for (let f of flowers) f.boost();
  flowers.push(new Flower(wx, wy, hsl, imgs));
  if (flowers.length > MAX_FLOWERS) {
    flowers[0].dispose();
    flowers.shift();
  }
}

// Resizes the canvas when the browser window changes size
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  PX.resize(drawingContext, width, height);
  G3.resize(width, splitY());
}

// Toggles fullscreen mode on mouse click
function mousePressed() {
  userStartAudio(); // resume AudioContext on interaction
  if (DEBUG.demo) return;      // an embedded demo stays in its frame
  try {
    if (!fullscreen()) fullscreen(true);
    else fullscreen(false);
  } catch (e) { /* fullscreen is not available everywhere */ }
}

// Keyboard controls: M=mute, R=rain, S=sunny, T=storm,
// D=dawn, N=night, G=golden hour, H=toggle hats, arrows=day speed
function keyPressed() {
  userStartAudio(); // resume AudioContext on interaction
  if (key === 'm' || key === 'M') {
    if (birds && birds.isPlaying()) birds.pause();
    else if (birds) birds.loop();
    if (nightSound && nightSound.isPlaying()) nightSound.pause();
    else if (nightSound && nightAmount() > 0.3) nightSound.loop();
  }
  if (key === 'r' || key === 'R') {
    weatherState = 'rainy'; weatherTimer = 1800;
    weatherDuration = 1800; nextWeatherState = 'clearing';
  }
  if (key === 's' || key === 'S') {
    weatherState = 'sunny'; weatherTimer = 1800;
    weatherDuration = 1800; nextWeatherState = 'cloudy';
  }
  if (key === 't' || key === 'T') {
    weatherState = 'stormy'; weatherTimer = 1800;
    weatherDuration = 1800; nextWeatherState = 'clearing';
  }
  // Jump time of day: D = dawn, N = night, G = golden hour
  if (key === 'd' || key === 'D') { dayNightT = floor(0.15 * DAY_CYCLE_DURATION); }
  if (key === 'n' || key === 'N') { dayNightT = floor(0.75 * DAY_CYCLE_DURATION); }
  if (key === 'g' || key === 'G') { dayNightT = floor(0.50 * DAY_CYCLE_DURATION); }
  if (key === 'h' || key === 'H') { decorationsEnabled = !decorationsEnabled; }
  if (keyCode === UP_ARROW)   { daySpeed = min(daySpeed * 2, 64); }
  if (keyCode === DOWN_ARROW) { daySpeed = max(daySpeed / 2, 1); }
  if (keyCode === LEFT_ARROW) {
    panelCycleIdx = (panelCycleIdx - 1 + panelCycle.length) % panelCycle.length;
    panelMode = panelCycle[panelCycleIdx];
    panelModeTimer = millis();
  }
  if (keyCode === RIGHT_ARROW) {
    panelCycleIdx = (panelCycleIdx + 1) % panelCycle.length;
    panelMode = panelCycle[panelCycleIdx];
    panelModeTimer = millis();
  }
}
