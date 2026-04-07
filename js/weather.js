// ── Weather System ────────────────────────────────────

function newRaindrop() {
  return {
    x:     random(-50, width + 50),
    y:     random(-height, 0),
    len:   random(8, 18),
    speed: random(8, 16),
    alpha: random(120, 200),
    wx:    random(0, 1)
  };
}

function newFgRaindrop() {
  // Foreground raindrops fall through the ground area (horizon → splitY)
  return {
    x:     random(-50, width + 50),
    y:     random(-100, gndHorizon()),
    len:   random(10, 22),
    speed: random(10, 20),
    alpha: random(80, 160),
    wx:    random(0, 1)
  };
}

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

  rainBoost = (weatherState === 'rainy' || weatherState === 'stormy') ? 0.001 : 0;

  if (weatherState === 'stormy') {
    lightningTimer--;
    if (lightningTimer <= 0) {
       if (lightning && !lightning.isPlaying()) {
         lightning.play();
       }
      lightningAlpha = 220;
      lightningTimer = floor(random(90, 300));
    }
  }
  lightningAlpha = max(0, lightningAlpha - 18);
}

function drawWeather() {
  const na = nightAmount();

  // Night: mute birds, play night sound — Day: mute night sound
  if (na > 0.3) {
    if (birds && birds.isPlaying()) birds.pause();
    if (nightSound && !nightSound.isPlaying()) nightSound.loop();
  } else {
    if (nightSound && nightSound.isPlaying()) nightSound.pause();
  }

  if (weatherAlpha < 0.01) return;

  noStroke();
  // Weather overlay — darker tint at night
  const wLit = lerp(55, 20, na);
  fill(220, 15, wLit, weatherAlpha * 160);
  rect(0, 0, width, splitY());

  if (weatherState === 'rainy' || weatherState === 'stormy' || weatherState === 'cloudy') {
    drawStormClouds();
  }
  if (weatherState === 'rainy' || weatherState === 'stormy') {
    if (birds && birds.isPlaying()) birds.pause();
    if (rain && !rain.isPlaying()) rain.loop();
    drawRain();
  }
  if (lightningAlpha > 0) {
    noStroke();
    fill(210, 20, 98, lightningAlpha);
    rect(0, 0, width, splitY());
    drawLightningBolt();
  }
  if (weatherState === 'clearing') {
    if (na < 0.3) drawRainbow();
    if (rain && rain.isPlaying()) rain.pause();
    if (na < 0.3 && birds && !birds.isPlaying()) birds.loop();
  }
  // Stop rain when jumping directly to sunny/cloudy (e.g. keyboard shortcut)
  if (weatherState === 'sunny' || weatherState === 'cloudy') {
    if (rain && rain.isPlaying()) rain.pause();
    if (na < 0.3 && birds && !birds.isPlaying()) birds.loop();
  }
}

function drawStormClouds() {
  const na = nightAmount();
  const cloudAlpha = weatherAlpha * 210;
  for (let i = 0; i < 5; i++) {
    const cx = (width * 0.15 * i + t * (0.3 + i * 0.08) + windX * 20) % (width + 200) - 100;
    const cy = 30 + i * 18;
    const s  = 0.8 + i * 0.2;
    push();
    translate(cx, cy);
    noStroke();
    const cloudLit = lerp(lerp(55, 28, weatherAlpha), lerp(20, 10, weatherAlpha), na);
    fill(220, 12, cloudLit, cloudAlpha);
    ellipse(0,      0,   80*s, 38*s);
    ellipse(-25*s,  8*s, 55*s, 32*s);
    ellipse( 28*s,  9*s, 58*s, 28*s);
    ellipse(-10*s, -12*s, 45*s, 30*s);
    pop();
  }
}

function drawRain() {
  // Background rain — sky area only (above horizon)
  const rainIntensity = weatherState === 'stormy' ? 1.0 : 0.6;
  for (let drop of raindrops) {
    drop.y += drop.speed * rainIntensity;
    drop.x += windX * 1.5;
    if (drop.y > gndHorizon()) {
      drop.y = random(-100, 0);
      drop.x = random(-50, width + 50);
    }
    push();
    stroke(200, 35, 80, drop.alpha * rainIntensity);
    strokeWeight(1.2);
    line(drop.x, drop.y, drop.x + windX * 3, drop.y + drop.len);
    pop();
  }
}

function drawForegroundRain() {
  // Foreground rain — falls through the ground area in front of characters
  if (weatherState !== 'rainy' && weatherState !== 'stormy') return;
  const rainIntensity = weatherState === 'stormy' ? 1.0 : 0.6;

  for (let drop of fgRaindrops) {
    drop.y += drop.speed * rainIntensity;
    drop.x += windX * 1.8;

    if (drop.y > splitY()) {
      // Splash effect at landing
      push();
      stroke(200, 40, 78, 60);
      strokeWeight(0.8);
      noFill();
      ellipse(drop.x, splitY() - 2, 7, 3);
      pop();

      drop.y = random(-120, gndHorizon() * 0.5);
      drop.x = random(-50, width + 50);
    }

    // Draw the drop
    push();
    stroke(200, 30, 85, drop.alpha * rainIntensity * 0.7);
    strokeWeight(1.0);
    line(drop.x, drop.y, drop.x + windX * 3, drop.y + drop.len);
    pop();
  }
}

// ── Puddle System ──────────────────────────────────────

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

function drawPuddles() {
  for (let p of puddles) {
    const { sx, sy } = worldToScreen(p.wx, p.wy);
    const ds = depthScale(p.wy);
    const w = p.size * ds * 2.2;
    const h = p.size * ds * 0.6;

    push();
    noStroke();

    fill(210, 35, 38, 60);
    ellipse(sx, sy + 1, w + 2, h + 1);

    fill(210, 40, 62, 100);
    ellipse(sx, sy, w, h);

    const shimmer = sin(t * 0.04 + p.phase) * 0.3 + 0.7;
    fill(210, 25, 82, 55 * shimmer);
    ellipse(sx - w * 0.15, sy - h * 0.1, w * 0.5, h * 0.4);

    const isRaining = (weatherState === 'rainy' || weatherState === 'stormy');
    if (isRaining) {
      noFill();
      const rippleAlpha = sin(t * 0.12 + p.phase) * 30 + 40;
      stroke(200, 30, 80, max(0, rippleAlpha));
      strokeWeight(0.6);
      const rippleSize = (sin(t * 0.1 + p.phase) * 0.3 + 0.7);
      ellipse(sx + sin(t * 0.07 + p.phase * 2) * w * 0.2,
              sy, w * 0.4 * rippleSize, h * 0.35 * rippleSize);

      const ripple2 = (sin(t * 0.1 + p.phase + 2) * 0.3 + 0.7);
      stroke(200, 30, 80, max(0, rippleAlpha * 0.6));
      ellipse(sx - sin(t * 0.05 + p.phase) * w * 0.15,
              sy + h * 0.05, w * 0.3 * ripple2, h * 0.25 * ripple2);
    }

    if (p.evaporating && p.size < p.maxSize * 0.5) {
      const evapAlpha = map(p.size, 0, p.maxSize * 0.5, 0, 40);
      noStroke();
      fill(200, 15, 88, evapAlpha);
      const wispY = sy - 3 - sin(t * 0.06 + p.phase) * 4;
      ellipse(sx, wispY, w * 0.3, 3);
      ellipse(sx + w * 0.2, wispY - 2, w * 0.2, 2);
    }

    pop();
  }
}

function drawLightningBolt() {
  const bx = random(width * 0.2, width * 0.8);
  push();
  stroke(55, 10, 98, lightningAlpha);
  strokeWeight(2.5);
  const points = [[bx, 20]];
  let cx = bx, cy = 20;
  while (cy < gndHorizon()) {
    cx += random(-18, 18);
    cy += random(20, 40);
    points.push([cx, cy]);
  }
  for (let i = 0; i < points.length - 1; i++) {
    line(points[i][0], points[i][1], points[i+1][0], points[i+1][1]);
  }
  strokeWeight(6);
  stroke(55, 30, 98, lightningAlpha * 0.3);
  for (let i = 0; i < points.length - 1; i++) {
    line(points[i][0], points[i][1], points[i+1][0], points[i+1][1]);
  }
  pop();
}

function drawRainbow() {
  const cx = width / 2;
  const cy = gndHorizon() + 20;
  const alpha = weatherAlpha * 180;
  push();
  noFill();
  strokeWeight(6);
  const colors = [0, 22, 42, 120, 200, 260, 290];
  for (let i = 0; i < colors.length; i++) {
    const r = 220 + i * 18;
    stroke(colors[i], 85, 65, alpha);
    arc(cx, cy, r * 2, r * 2, PI, TWO_PI);
  }
  pop();
}

function drawWeatherForecast() {
  const panelW = 120, panelH = 72;
  const px = width - panelW - 12, py = 12;

  const elapsed  = weatherDuration - weatherTimer;
  const progress = constrain(elapsed / weatherDuration, 0, 1);
  const chance   = floor(constrain(
    progress < 0.5
      ? map(progress, 0, 0.5, 8, 30)
      : map(progress, 0.5, 1.0, 30, 95),
    8, 95
  ));

  const icons = {
    sunny:    { icon:'☀️',  label:'Sunny',        hue:52  },
    cloudy:   { icon:'☁️',  label:'Cloudy',       hue:210 },
    rainy:    { icon:'🌧️',  label:'Rain',         hue:200 },
    stormy:   { icon:'⛈️',  label:'Thunderstorm', hue:240 },
    clearing: { icon:'🌤️',  label:'Clearing',     hue:45  }
  };

  const curr = icons[weatherState] || icons.sunny;
  const next = icons[nextWeatherState] || icons.sunny;

  push();
  translate(px, py);
  noStroke();
  fill(0, 0, 8, 180);
  rect(0, 0, panelW, panelH, 10);

  fill(0, 0, 72, 255); textAlign(LEFT, TOP); textStyle(BOLD); textSize(7.5);
  text('NOW', 10, 7);
  textSize(18); textStyle(NORMAL); textAlign(LEFT, CENTER);
  text(curr.icon, 8, 25);
  fill(curr.hue, 70, 82, 255); textStyle(BOLD); textSize(11); textAlign(LEFT, CENTER);
  text(curr.label, 34, 25);

  stroke(0, 0, 55, 100); strokeWeight(0.5);
  line(10, 40, panelW - 10, 40); noStroke();

  fill(0, 0, 65, 255); textAlign(LEFT, TOP); textStyle(BOLD); textSize(7.5);
  text('FORECAST', 10, 44);
  textSize(14); textStyle(NORMAL); textAlign(LEFT, CENTER);
  text(next.icon, 8, 61);

  const chanceHue = map(chance, 0, 95, 200, 15);
  fill(chanceHue, 75, 78, 255); textStyle(BOLD); textSize(10); textAlign(LEFT, CENTER);
  text(chance + '% ' + next.label, 28, 57);

  noStroke();
  fill(0, 0, 28, 180); rect(28, 64, panelW - 36, 4, 2);
  fill(chanceHue, 75, 65, 220); rect(28, 64, (panelW - 36) * (chance / 100), 4, 2);

  const pulse = sin(t * 0.08) * 0.5 + 0.5;
  fill(curr.hue, 70, 70, pulse * 180);
  ellipse(panelW - 10, 10, 6, 6);
  pop();
}
