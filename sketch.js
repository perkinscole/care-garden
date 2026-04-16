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
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.id("canvas");
  colorMode(HSL, 360, 100, 100, 255);
  document.getElementById('canvas').style.fontFamily = 'Nunito, sans-serif';
  loadSmileStats();

  video = createCapture(VIDEO, function(stream) {
    const track    = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    videoW = settings.width  || 640;
    videoH = settings.height || 480;
  });
  video.id("video");
  video.hide();

  faceapi = ml5.faceApi(video, {
    withLandmarks:   true,
    withExpressions: true,
    withDescriptors: true,
    minConfidence:   0.5,
    MODEL_URL: 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models@face-api/models/faceapi'
  }, faceReady);

  for (let i = 1; i <= 5; i++) {
    hatImages.push(loadImage('images/hat' + i + '.png'));
  }

  nsfwjs.load().then(function(model) {
    nsfwModel = model;
    nsfwReady = true;
  });

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

  // Pre-process hat images one per frame (avoids freeze when hat time starts)
  if (!hatsProcessed) processHatImages();

  // Advance day/night cycle
  dayNightT += daySpeed;
  timeOfDay = (dayNightT % DAY_CYCLE_DURATION) / DAY_CYCLE_DURATION;

  sunGlow  += ((h ? 1.0 : 0.0) - sunGlow)  * 0.04;
  shineVol += ((h ? 0.1 : 0.0) - shineVol) * 0.02;
  if (shine) shine.setVolume(constrain(shineVol, 0.0, 0.3));

  // Sky gradient — driven by day/night keyframes
  noStroke();
  const skyHue    = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'hue');
  const skySat    = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'sat');
  const skyLitTop = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'litTop');
  const skyLitBot = lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'litBot');
  for (let i = 0; i < 10; i++) {
    const y0 = map(i,   0, 10, 0, splitY());
    const y1 = map(i+1, 0, 10, 0, splitY());
    fill(skyHue, lerp(skySat, skySat - 10, i/10), lerp(skyLitTop, skyLitBot, i/10), 255);
    rect(0, y0, width, y1 - y0);
  }

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

  // Scene
  drawStarsAndMoon();
  drawSky();
  drawTown();
  drawWeatherForecast();
  drawWeather();
  drawGround();
  //drawHorizonLandmarks();
  drawTrees();
  drawGrass();
  drawSchool();
  updatePuddles();
  drawPuddles();
  updateWeather();

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
  for (let f of flowers)  renderList.push({ wy: f.wy,          draw: () => f.draw() });
  renderList.push(         { wy: ram.wy,      draw: () => ram.draw() });
  renderList.push(         { wy: gardener.wy, draw: () => gardener.draw() });
  renderList.push(         { wy: goose.wy,    draw: () => goose.draw() });
  renderList.push(         { wy: cat.wy,      draw: () => cat.draw() });
  if (mrPerkins) renderList.push({ wy: mrPerkins.wy, draw: () => mrPerkins.draw() });
  if (mrConant) renderList.push({ wy: mrConant.wy, draw: () => mrConant.draw() });
  for (let k of kids)    renderList.push({ wy: k.wy, draw: () => k.draw() });
  for (let r of rabbits) renderList.push({ wy: r.wy, draw: () => r.draw() });
  if (groundhog) renderList.push({ wy: groundhog.wy, draw: () => groundhog.draw() });
  if (principal) renderList.push({ wy: principal.wy, draw: () => principal.draw() });
  for (let tc of teachers)     renderList.push({ wy: tc.wy, draw: () => tc.draw() });
  for (let ak of arrivalKids)  renderList.push({ wy: ak.wy, draw: () => ak.draw() });

  renderList.sort((a, b) => a.wy - b.wy);
  for (let item of renderList) item.draw();

  // Speech bubbles
  speechBubbles = speechBubbles.filter(b => b.update());
  for (let b of speechBubbles) b.draw();

  // Foreground rain — renders over characters for depth
  drawForegroundRain();

  // Flying creatures above ground (fade out at night)
  const creatureAlpha = 1.0 - nightAmount();
  if (creatureAlpha > 0.05) {
    push();
    drawingContext.globalAlpha = creatureAlpha;
    for (let c of creatures) c.draw();
    drawingContext.globalAlpha = 1.0;
    pop();
  }
  for (let b of birds_flock) b.draw();

  // Fireflies at night
  updateAndDrawFireflies();

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

  if (video && videoW && videoH) {
    const destH  = height - splitY();
    const minPanelWidth = min(150, width * 0.15);
    const availableVideoW = width - (minPanelWidth * 2);
    const videoAspect  = videoW / videoH;
    const screenAspect = availableVideoW / destH;

    let displayW, displayH;
    if (videoAspect > screenAspect) {
      displayW = availableVideoW;
      displayH = availableVideoW / videoAspect;
    } else {
      displayH = destH;
      displayW = destH * videoAspect;
    }

    const offsetX = (width - displayW) / 2;
    const offsetY = (destH - displayH) / 2;
    videoOffsetX  = offsetX;
    videoOffsetY  = offsetY;
    videoDisplayW = displayW;
    videoDisplayH = displayH;

    drawCareScore(offsetX);
    manageGallery();
    drawSmileGallery(offsetX);

    push();
    translate(width - offsetX, splitY() + offsetY);
    scale(-1, 1);
    image(video, 0, 0, displayW, displayH);
    pop();

    drawBoxes(detections, offsetX, displayW, displayH);
    drawFaceDecorations(detections);
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

  // Flower spawning — once per snap
  if (postSnapPause > 0) postSnapPause--;
  if (postSnapPause === 89) {
    addFlower(random(0.05, 0.95), random(0.28, 1.0),
              [random(360), random(55, 90), random(55, 72)]);
  }

  // Smile indicator dot
  push(); noStroke();
  fill(h ? color(55, 90, 60, 255) : color(0, 0, 70, 255));
  ellipse(width - 16, splitY() + 16, 12, 12);
  pop();

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

  // Group snap label
  if (groupSnapAlpha > 0) {
    push();
    noStroke(); fill(55, 90, 65, groupSnapAlpha);
    textAlign(CENTER, CENTER); textStyle(BOLD);
    textSize(28);
    text(groupSnapLabel, width / 2, splitY() - 40);
    pop();
    groupSnapAlpha -= 3;
  }

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

  if (hatTimeAlpha > 0) {
    push();
    noStroke(); fill(200, 70, 60, hatTimeAlpha);
    textAlign(CENTER, CENTER); textStyle(BOLD);
    textSize(34);
    text("It's raining, put on a hat!", width / 2, splitY() - 75);
    pop();
    hatTimeAlpha -= 2;
  }

  updateDrawConfetti();
  drawCountdown();
  t++;
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
  let img = createGraphics(box._width, box._height);
  img.push();
  img.translate(box._width, 0);
  img.scale(-1, 1);
  img.image(video, 0, 0, box._width, box._height,
            box._x, box._y, box._width, box._height);
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
}

// Toggles fullscreen mode on mouse click
function mousePressed() {
  userStartAudio(); // resume AudioContext on interaction
  if (!fullscreen()) fullscreen(true);
  else fullscreen(false);
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
