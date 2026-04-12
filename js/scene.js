// ================================================================
// File: scene.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: Renders all background scenery including sky, ground,
//              trees, buildings, landmarks, and weather effects.
// ================================================================

// ── Scene Drawing ─────────────────────────────────────

// Draws the perspective ground plane with a gradient that shifts by time of day
function drawGround() {
  noStroke();
  const y0 = gndHorizon(), y1 = gndFront();
  const gHue  = lerpKeyframes(GROUND_KEYFRAMES, timeOfDay, 'hue');
  const gSatH = lerpKeyframes(GROUND_KEYFRAMES, timeOfDay, 'satH');
  const gLitH = lerpKeyframes(GROUND_KEYFRAMES, timeOfDay, 'litH');
  const gSatF = lerpKeyframes(GROUND_KEYFRAMES, timeOfDay, 'satF');
  const gLitF = lerpKeyframes(GROUND_KEYFRAMES, timeOfDay, 'litF');
  const grad = drawingContext.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, `hsl(${gHue}, ${gSatH}%, ${gLitH}%)`);
  grad.addColorStop(1, `hsl(${gHue + 4}, ${gSatF}%, ${gLitF}%)`);
  drawingContext.fillStyle = grad;
  drawingContext.fillRect(0, y0, width, y1 - y0);
  noStroke(); fill(0, 0, 0, 0);
}

// Draws the sun (with arc, glow, and rays) and drifting clouds, dimmed at night
function drawSky() {
  const na = nightAmount();
  const sunVis = constrain(1.0 - na * 2.5, 0, 1); // sun fades out at dusk

  if (sunVis > 0.01) {
    const baseR = 70;

    // Sun arcs across the sky: rises at dawn (~0.14), peaks at midday (~0.35), sets at sunset (~0.58)
    const sunRise = 0.07;   // time sun appears at horizon
    const sunSet  = 0.66;   // time sun reaches horizon again
    const sunMid  = (sunRise + sunSet) / 2;
    const sunProgress = constrain(map(timeOfDay, sunRise, sunSet, 0, 1), 0, 1);

    // Horizontal: arcs from east (left) to west (right)
    const cx = lerp(width * 0.15, width * 0.85, sunProgress);
    // Vertical: parabolic arc — highest at midpoint, at horizon at edges
    const arcHeight = gndHorizon() * 0.85;  // how high the sun gets
    const arcY = 1.0 - 4 * sunProgress * (1 - sunProgress);  // 0 at peak, 1 at horizon
    const sunCy = gndHorizon() - arcHeight * (1 - arcY);

    // At sunset, shift sun hue warmer (52 → 25)
    const sunsetFactor = (timeOfDay > 0.45 && timeOfDay < 0.65) ? map(timeOfDay, 0.45, 0.65, 0, 1) : 0;
    const sunHue = lerp(52, 25, sunsetFactor);

    push();
    if (sunGlow > 0.02) {
      noStroke();
      for (let ring = 3; ring >= 1; ring--) {
        const rr = baseR + ring * 18 * sunGlow;
        fill(sunHue, 90, 75, sunGlow * (80 - ring * 22) * sunVis);
        ellipse(cx, sunCy, rr * 2, rr * 2);
      }
    }
    noStroke();
    fill(sunHue, lerp(95, 100, sunGlow), lerp(72, 90, sunGlow), 220 * sunVis);
    ellipse(cx, sunCy, (baseR + sunGlow * 6) * 2, (baseR + sunGlow * 6) * 2);

    const rayInner = baseR + sunGlow * 6 + 4;
    const rayOuter = rayInner + lerp(12, 22, sunGlow);
    stroke(sunHue, 88, lerp(78, 95, sunGlow), lerp(145, 220, sunGlow) * sunVis);
    strokeWeight(lerp(1.5, 2.5, sunGlow));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TWO_PI + t * 0.003;
      line(cx + cos(a) * rayInner, sunCy + sin(a) * rayInner,
           cx + cos(a) * rayOuter, sunCy + sin(a) * rayOuter);
    }
    if (sunGlow > 0.3 && sunVis > 0.5) {
      noStroke(); fill(sunHue, 90, 55, sunGlow * 200 * sunVis);
      ellipse(cx - 8, sunCy - 8, 4, 4);
      ellipse(cx + 8, sunCy - 8, 4, 4);
      noFill(); stroke(sunHue, 90, 55, sunGlow * 220 * sunVis); strokeWeight(2);
      arc(cx, sunCy + 2, 18, 12, 0.1, PI - 0.1);
    }
    pop();
  }

  // Clouds — dim at night
  const cloudVis = (1.0 - weatherAlpha * 1.2) * lerp(1.0, 0.3, na);
  if (cloudVis > 0) {
    const drift = t * 0.25 + windX * 12;
    drawCloud(((55  + drift * 0.8)  % (width + 150)) - 75, 28, 1.0,  cloudVis * 192);
    drawCloud(((215 + drift * 0.6)  % (width + 150)) - 75, 20, 0.72, cloudVis * 192);
    drawCloud(((365 + drift * 0.7)  % (width + 150)) - 75, 38, 0.88, cloudVis * 192);
  }
}

// Draws a single cloud as a cluster of overlapping ellipses
function drawCloud(x, y, s, alpha = 192) {
  push();
  translate(x, y);
  noStroke();
  fill(0, 0, 100, alpha);
  ellipse(0,      0,   52*s, 26*s);
  ellipse(-17*s,  5*s, 34*s, 20*s);
  ellipse( 19*s,  6*s, 36*s, 18*s);
  pop();
}

// ── Stars & Moon ─────────────────────────────────────

// Draws twinkling stars and a crescent moon that fade in with nightAmount
function drawStarsAndMoon() {
  const na = nightAmount();
  if (na < 0.05) return;

  const skyH = splitY();
  push();

  // Stars
  noStroke();
  for (let s of stars) {
    const twinkle = sin(t * s.twinkleSpeed + s.twinklePhase) * 0.4 + 0.6;
    const alpha = na * twinkle * 255 * (s.brightness / 100);
    if (alpha < 5) continue;
    fill(50, 10, 95, alpha);
    const sx = s.x * width;
    const sy = s.y * skyH;
    ellipse(sx, sy, s.size, s.size);
    // Subtle cross-glow on brighter stars
    if (s.size > 2) {
      fill(50, 10, 95, alpha * 0.3);
      ellipse(sx, sy, s.size * 3, s.size * 0.5);
      ellipse(sx, sy, s.size * 0.5, s.size * 3);
    }
  }

  // Moon — upper left, crescent
  const moonAlpha = na * 240;
  if (moonAlpha > 10) {
    const mx = width * 0.15;
    const my = skyH * 0.08;
    const moonR = 42;

    // Moon glow
    noStroke();
    for (let ring = 3; ring >= 1; ring--) {
      fill(48, 15, 90, moonAlpha * (0.08 - ring * 0.02));
      ellipse(mx, my, (moonR + ring * 15) * 2, (moonR + ring * 15) * 2);
    }

    // Moon disk
    fill(48, 12, 92, moonAlpha);
    ellipse(mx, my, moonR * 2, moonR * 2);

    // Crescent shadow — offset circle to make crescent
    fill(lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'hue'),
         lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'sat'),
         lerpKeyframes(SKY_KEYFRAMES, timeOfDay, 'litTop'), moonAlpha);
    ellipse(mx + moonR * 0.45, my - moonR * 0.15, moonR * 1.7, moonR * 1.8);

    // Subtle moon surface details
    fill(48, 8, 82, moonAlpha * 0.3);
    ellipse(mx - 10, my - 5, 8, 8);
    ellipse(mx - 3, my + 8, 6, 5);
    ellipse(mx + 5, my - 2, 5, 5);
  }

  pop();
}

// ── Fireflies ────────────────────────────────────────

// Spawns, moves, and draws pulsing fireflies that appear at night
function updateAndDrawFireflies() {
  const na = nightAmount();

  // Spawn/despawn fireflies based on night
  if (na > 0.3 && fireflies.length < NUM_FIREFLIES) {
    fireflies.push({
      x: random(0, width),
      y: random(gndHorizon(), splitY() - 20),
      tx: random(40, width - 40),
      ty: random(gndHorizon() + 20, splitY() - 30),
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

  push();
  noStroke();
  for (let f of fireflies) {
    // Drift toward target
    f.x = lerp(f.x, f.tx, 0.005 * f.speed);
    f.y = lerp(f.y, f.ty, 0.005 * f.speed);
    // Gentle sine wobble
    f.y += sin(t * 0.04 + f.phase) * 0.5;
    f.x += cos(t * 0.03 + f.phase * 1.3) * 0.3;

    // Pick new target when close
    if (dist(f.x, f.y, f.tx, f.ty) < 20) {
      f.tx = random(40, width - 40);
      f.ty = random(gndHorizon() + 20, splitY() - 30);
    }

    // Pulsing glow
    const pulse = sin(t * f.pulseSpeed + f.phase) * 0.5 + 0.5;
    const alpha = na * pulse * 230;

    // Outer glow
    fill(f.hue, 80, 70, alpha * 0.25);
    ellipse(f.x, f.y, f.size * 6, f.size * 6);
    // Inner glow
    fill(f.hue, 90, 80, alpha * 0.5);
    ellipse(f.x, f.y, f.size * 3, f.size * 3);
    // Core
    fill(f.hue, 60, 95, alpha);
    ellipse(f.x, f.y, f.size, f.size);
  }
  pop();
}

// Draws swaying foreground grass blades using curved strokes with wind and depth
function drawGrass() {
  push();
  const grassCutoff = gndHorizon() + 85;
  for (let g of grassBlades) {
    const { sx, sy } = worldToScreen(g.wx, g.wy);
    if (sy < grassCutoff) continue;
    const ds   = depthScale(g.wy);
    const gh   = g.h * ds * 1.4;
    const sway = sin(t * 0.06 + g.phase) * 0.18 + windX * 0.35;
    const grassLit = lerp(34, 12, nightAmount());
    const grassSat = lerp(52, 30, nightAmount());
    stroke(g.shade, grassSat, grassLit, 195);
    strokeWeight(g.w * ds * 1.6);
    noFill();
    beginShape();
    curveVertex(sx, sy); curveVertex(sx, sy);
    curveVertex(sx + sin(g.lean + sway*0.5)*gh*0.5, sy - gh*0.5);
    curveVertex(sx + sin(g.lean + sway)*gh, sy - gh);
    curveVertex(sx + sin(g.lean + sway)*gh, sy - gh);
    endShape();
  }
  pop();
}

// Draws a row of tree silhouettes along the horizon with wind sway
function drawTrees() {
  const treeData = [
    {x:0.02,spread:1.0},{x:0.08,spread:0.85},{x:0.15,spread:1.1},
    {x:0.30,spread:0.9},{x:0.68,spread:1.05},{x:0.82,spread:0.88},
    {x:0.92,spread:1.1},{x:0.98,spread:0.85},
  ];
  for (let td of treeData) {
    drawTree(lerp(0, width, td.x), gndHorizon(), td.spread,
             sin(t * 0.012 + td.x * 15) * 4 + windX * 3);
  }
}

// Draws a single layered triangular tree with trunk, foliage layers, and highlights
function drawTree(x, y, spread, sway) {
  const na = nightAmount();
  const trunkH = 28 * spread, trunkW = 5 * spread;
  noStroke(); fill(22, 35, lerp(24, 10, na), 255);
  rect(x - trunkW/2, y - trunkH, trunkW, trunkH, 2);
  const layers = [
    {w:38*spread, h:28*spread, yo:-trunkH},
    {w:30*spread, h:24*spread, yo:-trunkH-18*spread},
    {w:20*spread, h:18*spread, yo:-trunkH-34*spread},
  ];
  const treeLit = lerp(22, 8, na);
  const treeSat = lerp(1, 0.6, na);
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const ls = sway * (1 + li * 0.4);
    fill(110 + li * 2, lerp(28, 22, li/2) * treeSat, treeLit, 240); noStroke();
    triangle(x+ls, y+layer.yo-layer.h, x-layer.w/2+ls*0.5, y+layer.yo, x+layer.w/2+ls*0.5, y+layer.yo);
    fill(112, (lerp(28,22,li/2)+8) * treeSat, treeLit + 6, 80);
    triangle(x+ls, y+layer.yo-layer.h, x-layer.w/2+ls*0.5, y+layer.yo, x+ls*0.5, y+layer.yo);
  }
}

// Draws the school building scene including picket fence, building, and sidewalks
function drawSchool() {
  const s = width / 950;
  const hy = gndHorizon() + 110 * s;
  const x = width / 2 - 280 * s + 90;

  // White picket fence — drawn BEFORE school so building sits in front
  push();
  colorMode(RGB, 255);
  const fenceY = gndHorizon() + 4;
  const fenceH = 14;
  const pW = 5, pGap = 9;
  // Bottom rail
  stroke(240, 240, 235); strokeWeight(2.5);
  line(0, fenceY - 3, width, fenceY - 3);
  // Top rail
  line(0, fenceY - fenceH + 2, width, fenceY - fenceH + 2);
  // Pickets
  noStroke(); fill(248, 248, 244);
  for (let fx = 1; fx < width; fx += pW + pGap) {
    rect(fx, fenceY - fenceH + 2, pW, fenceH - 2);
    // Pointed top
    triangle(fx, fenceY - fenceH + 2, fx + pW, fenceY - fenceH + 2, fx + pW / 2, fenceY - fenceH - 4);
  }
  pop();

  // Draw the detailed school building in RGB color mode
  push();
  colorMode(RGB, 255);
  drawMiddleSchool(x, hy, s);
  pop();
}

// ── Detailed Middle School (RGB colors) ─────────────

// Draws the Robert Adams Middle School with wings, windows, doors, and flagpole
function drawMiddleSchool(x, y, s = 1) {
  push();
  translate(x, y);
  scale(s);

  noStroke();

  // ====================================================
  // FAR LEFT WING EXTENSION
  // ====================================================
  fill(128, 78, 58);
  rect(-150, -185, 150, 95);

  fill(74, 100, 122);
  rect(-150, -193, 150, 8);

  fill(110, 70, 55);
  rect(-150, -155, 42, 65);
  drawSchoolDoor(-140, -128, 22, 38);

  for (let wx = -95; wx <= -0; wx += 24) {
    drawSchoolWindow(wx, -165, 15, 22);
  } 
  for (let wx = -95; wx <= -0; wx += 24) {
    drawSchoolWindow(wx, -125, 15, 22);
  }


  // ====================================================
  // LEFT MASS
  // ====================================================
  fill(142, 88, 66);
  rect(0, -210, 140, 120);


  fill(132, 80, 60);
  rect(50, -140, 50, 50);
  // ====================================================
  // CENTER CORE
  // ====================================================
  fill(198, 208, 214);
  rect(140, -235, 85, 145);

  fill(154, 94, 70);
  rect(225, -180, 120, 90);

  // ====================================================
  // RIGHT WING
  // ====================================================
  fill(176, 136, 98);
  rect(345, -195, 155, 105);

  fill(74, 100, 122);
  rect(345, -203, 155, 8);

  // top row of right-wing windows
  drawSchoolWindow(365, -185, 15, 20);
  drawSchoolWindow(387, -185, 15, 20);
  drawSchoolWindow(409, -185, 15, 20);
  drawSchoolWindow(429, -185, 15, 20);
  drawSchoolWindow(449, -185, 15, 20);
  drawSchoolWindow(469, -185, 15, 20);


    drawSchoolWindow(365, -125, 15, 20);
  drawSchoolWindow(387, -125, 15, 20);
  drawSchoolWindow(409, -125, 15, 20);
  drawSchoolWindow(429, -125, 15, 20);
  

  // smaller far-right window
  //drawSchoolWindow(432, -186, 11, 17);

  // end door section
  fill(145, 108, 82);
  rect(458, -160, 42, 70);
  drawSchoolDoor(468, -128, 22, 38);

  // ====================================================
  // PARAPETS / TRIM
  // ====================================================
  fill(78, 104, 126);
  rect(0, -218, 140, 8);
  rect(140, -243, 85, 8);
  rect(225, -188, 120, 8);
  rect(345, -203, 155, 8);

  fill(90, 116, 138);
  rect(158, -260, 50, 17);

  // ====================================================
  // ENTRANCE CANOPY / PORTICO
  // ====================================================
 drawSchoolWindow(245, -175, 15, 20);
  drawSchoolWindow(275, -175, 15, 20);
  drawSchoolWindow(305, -175, 15, 20);


  fill(232, 229, 221);
  rect(140, -142, 392, 14);

  fill(225, 221, 212);
  for (let px of [140, 160, 200, 240, 280, 320, 360, 400, 440, 480]) {
    rect(px, -128, 5, 38);
  }

 

  // ====================================================
  // CENTER ENTRANCE DOORS
  // ====================================================
  drawMainEntrance(148, -124, 30, 34);
  drawMainEntrance(184, -124, 30, 34);
  drawMainEntrance(268, -124, 30, 34);

  // ====================================================
  // WINDOWS
  // ====================================================
  

  drawTallSchoolGlass(156, -223, 13, 42);
  drawTallSchoolGlass(175, -223, 13, 42);
  drawTallSchoolGlass(194, -223, 13, 42);

  // ====================================================
  // TEXT SIGN
  // ====================================================
  fill(255);
  textAlign(LEFT, TOP);
  textSize(13);
  textStyle(BOLD);
  text("ROBERT ADAMS", 14, -200);
  text("MIDDLE SCHOOL", 22, -184);

  // ====================================================
  // BRICK DETAIL
  // ====================================================
  stroke(168, 128, 92, 80);
  strokeWeight(0.8);

  for (let yy = -185; yy < -92; yy += 10) {
    line(-150, yy, 0, yy);
  }
  for (let yy = -195; yy < -92; yy += 10) {
    line(345, yy, 500, yy);
  }
  for (let xx = 345; xx < 500; xx += 13) {
    line(xx, -195, xx, -90);
  }

  noStroke();

  // ====================================================
  // SIDEWALKS — full width, run off both edges of screen
  // ====================================================
  const swLeft  = -x / s;          // left edge in local coords
  const swRight = (width - x) / s; // right edge in local coords

  // Sidewalk slab
  fill(195, 190, 180);
  rect(swLeft, -90, swRight - swLeft, 14);
  // Edge lines
  stroke(175, 170, 160);
  strokeWeight(0.8);
  line(swLeft, -90,  swRight, -90);
  line(swLeft, -76,  swRight, -76);
  // Expansion joints every ~60 local units
  stroke(165, 160, 150);
  strokeWeight(0.5);
  for (let cx = -300; cx < swRight; cx += 60) {
    line(cx, -90, cx, -76);
  }
  noStroke();


  // ====================================================
  // FOREGROUND SITE ELEMENTS
  // ====================================================
  drawSchoolFlagpole(280, -50, 105);

  pop();
}

// Draws a flagpole with an American flag at the given position
function drawSchoolFlagpole(x, y, h) {
  stroke(190, 194, 198);
  strokeWeight(3);
  line(x, y, x, y - h);

  stroke(225, 228, 232, 120);
  strokeWeight(1);
  line(x - 1, y, x - 1, y - h);

  noStroke();
  fill(150, 150, 155);
  ellipse(x, y - h - 4, 7, 7);

  drawSmallFlag(x, y - h + 10, 40, 20);
}

// Draws a small waving American flag with stripes and star field
function drawSmallFlag(x, y, w, h) {
  noStroke();

  fill(245);
  beginShape();
  vertex(x, y);
  bezierVertex(x + 6, y - 2, x + 18, y + 1, x + w, y);
  bezierVertex(x + w - 6, y + h * 0.30, x + w - 2, y + h * 0.65, x + w, y + h);
  bezierVertex(x + 18, y + h - 1, x + 6, y + h + 2, x, y + h);
  endShape(CLOSE);

  fill(188, 42, 48);
  for (let i = 0; i < 6; i++) {
    let sy = y + i * 3.4;
    beginShape();
    vertex(x, sy);
    bezierVertex(x + 6, sy - 1, x + 18, sy + 1, x + w, sy);
    vertex(x + w, sy + 2.2);
    bezierVertex(x + 18, sy + 3.2, x + 6, sy + 2.2, x, sy + 2.2);
    endShape(CLOSE);
  }

  fill(32, 58, 128);
  beginShape();
  vertex(x, y);
  bezierVertex(x + 3, y, x + 8, y + 1, x + 14, y);
  vertex(x + 14, y + 10);
  bezierVertex(x + 8, y + 10, x + 3, y + 10, x, y + 10);
  endShape(CLOSE);

  fill(255);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      ellipse(x + 3.5 + c * 3.2, y + 3 + r * 3.2, 1.2, 1.2);
    }
  }
}

// Draws a school main entrance door with transom window and panel details
function drawMainEntrance(x, y, w, h) {
  fill(58, 68, 78);
  rect(x, y, w, h);

  fill(140, 165, 182, 140);
  rect(x + 2, y + 2, w - 4, 8);

  fill(72, 52, 40);
  rect(x + 2, y + 12, w - 4, h - 14);

  stroke(220, 225, 230, 120);
  strokeWeight(1);
  line(x + w / 2, y + 12, x + w / 2, y + h - 2);
  line(x + 2, y + 10, x + w - 2, y + 10);

  stroke(170, 190, 205, 120);
  line(x + w * 0.32, y + 15, x + w * 0.32, y + h - 6);
  line(x + w * 0.68, y + 15, x + w * 0.68, y + h - 6);

  noStroke();
}

// Draws a school window pane that glows warm yellow at night
function drawSchoolWindow(x, y, w, h) {
  const na = nightAmount();
  fill(60, 78, 92);
  rect(x, y, w, h);

  if (na > 0.2) {
    // Warm lit window at night
    const glow = constrain((na - 0.2) / 0.4, 0, 1);
    const r = lerp(130, 255, glow), g2 = lerp(155, 200, glow), b = lerp(170, 80, glow);
    const a = lerp(130, 220, glow);
    fill(r, g2, b, a);
    rect(x + 1.5, y + 1.5, w - 3, h - 3);
    // Window glow halo
    if (glow > 0.3) {
      drawingContext.shadowColor = `rgba(255, 200, 80, ${glow * 0.4})`;
      drawingContext.shadowBlur = 8 * glow;
      fill(r, g2, b, a * 0.5);
      rect(x + 1.5, y + 1.5, w - 3, h - 3);
      drawingContext.shadowBlur = 0;
    }
  } else {
    fill(130, 155, 170, 130);
    rect(x + 1.5, y + 1.5, w - 3, h - 3);
  }

  stroke(215, 225, 232, 120);
  strokeWeight(1);
  line(x + w / 2, y + 1, x + w / 2, y + h - 1);
  line(x + 1, y + h / 2, x + w - 1, y + h / 2);
  noStroke();
}

// Draws a tall glass window panel that glows at night with a warm halo
function drawTallSchoolGlass(x, y, w, h) {
  const na = nightAmount();
  fill(72, 96, 110);
  rect(x, y, w, h);

  if (na > 0.2) {
    const glow = constrain((na - 0.2) / 0.4, 0, 1);
    fill(lerp(155, 255, glow), lerp(180, 210, glow), lerp(195, 90, glow), lerp(120, 220, glow));
    rect(x + 1.5, y + 1.5, w - 3, h - 3);
    if (glow > 0.3) {
      drawingContext.shadowColor = `rgba(255, 200, 80, ${glow * 0.35})`;
      drawingContext.shadowBlur = 10 * glow;
      fill(255, 210, 90, 100 * glow);
      rect(x + 1.5, y + 1.5, w - 3, h - 3);
      drawingContext.shadowBlur = 0;
    }
  } else {
    fill(155, 180, 195, 120);
    rect(x + 1.5, y + 1.5, w - 3, h - 3);
  }

  stroke(220, 230, 235, 120);
  strokeWeight(1);
  line(x + w / 2, y + 1, x + w / 2, y + h - 1);
  noStroke();
}

// Draws a school side door with glass panel and divider lines
function drawSchoolDoor(x, y, w, h) {
  fill(55, 68, 78);
  rect(x, y, w, h);

  fill(125, 150, 168, 120);
  rect(x + 1.5, y + 1.5, w - 3, h - 3);

  stroke(225, 230, 235, 120);
  strokeWeight(1);
  line(x + w / 2, y + 1, x + w / 2, y + h - 1);
  line(x + 1, y + 14, x + w - 1, y + 14);
  noStroke();
}
// Draws all horizon-line landmarks: church, town hall, rail trail, and balancing rock
function drawHorizonLandmarks() {
  const hy = gndHorizon();

  drawChurch(width * 0.18, hy);
  drawTownHall(width * 0.78, hy);
  drawRailTrail(hy);
  drawBalancingRock(width * 0.88, hy);
}

// Draws the First Congregational Church with steeple, columns, and night-lit windows
function drawChurch(x, y) {
  // First Congregational Church — white, tall steeple
  push();
  translate(x, y);

  // main building
  noStroke();
  fill(0, 0, 92);
  rect(-28, -45, 56, 45);

  // columns — classic New England portico
  fill(0, 0, 88);
  for (let i = 0; i < 4; i++) {
    rect(-20 + i * 13, -42, 4, 42);
  }

  // pediment (triangular top of portico)
  fill(0, 0, 92);
  triangle(-26, -42, 26, -42, 0, -58);

  // steeple base
  fill(0, 0, 90);
  rect(-12, -70, 24, 28);

  // steeple mid section
  rect(-8, -95, 16, 26);

  // steeple louvered windows
  fill(0, 0, 75);
  rect(-5, -88, 4, 8);
  rect(1,  -88, 4, 8);

  // steeple taper
  fill(0, 0, 88);
  triangle(-8, -95, 8, -95, 0, -130);

  // cross at top
  stroke(0, 0, 82);
  strokeWeight(1.5);
  line(0, -130, 0, -118);
  line(-4, -125, 4, -125);

  // door
  noStroke();
  fill(28, 25, 32);
  rect(-8, -18, 16, 18, 3, 3, 0, 0);
  // door arch
  fill(28, 25, 32);
  arc(0, -18, 16, 12, PI, TWO_PI);

  // windows — glow at night
  const churchNa = nightAmount();
  if (churchNa > 0.3) {
    const cg = constrain((churchNa - 0.3) / 0.3, 0, 1);
    fill(lerp(210, 42, cg), lerp(45, 85, cg), lerp(72, 75, cg), lerp(180, 240, cg));
  } else {
    fill(210, 45, 72, 180);
  }
  rect(-20, -38, 8, 12, 1);
  rect( 12, -38, 8, 12, 1);
  arc(-16, -38, 8, 8, PI, TWO_PI);
  arc( 16, -38, 8, 8, PI, TWO_PI);

  // label
  noStroke();
  fill(0, 0, 65);
  textAlign(CENTER, TOP);
  textSize(6);
  textStyle(NORMAL);
  text('First Congregational', x < width/2 ? 28 : -28, 5);

  pop();
}

// Draws Holliston Town Hall with brick texture, arched windows, and clock tower
function drawTownHall(x, y) {
  // Holliston Town Hall — brick with distinctive arched windows
  // and a small clock tower
  push();
  translate(x, y);

  // main building — warm brick
  noStroke();
  fill(8, 55, 38);
  rect(-38, -52, 76, 52);

  // brick texture
  const bH = 6, bW = 14;
  for (let row = 0; row < 8; row++) {
    const ry = -52 + row * bH;
    const off = (row % 2) * (bW / 2);
    for (let col = -3; col < 6; col++) {
      const v = sin(row * 5.1 + col * 3.7) * 0.5 + 0.5;
      fill(8 + v*4, 52 + v*8, 34 + v*6);
      noStroke();
      rect(-38 + col * bW + off, ry + 0.5, bW - 1, bH - 1);
    }
  }

  // roof line / parapet
  noStroke();
  fill(8, 45, 28);
  rect(-40, -56, 80, 6);

  // decorative parapet bumps
  fill(8, 45, 28);
  for (let i = 0; i < 6; i++) {
    rect(-36 + i * 14, -62, 8, 8);
  }

  // clock tower — centered, set back slightly
  fill(8, 50, 32);
  rect(-10, -80, 20, 28);
  // tower top
  fill(8, 45, 28);
  rect(-12, -84, 24, 6);
  // small spire
  fill(200, 35, 45);
  triangle(-6, -84, 6, -84, 0, -100);

  // clock face
  noStroke();
  fill(0, 0, 88);
  ellipse(0, -72, 12, 12);
  stroke(0, 0, 20);
  strokeWeight(0.8);
  // clock hands
  line(0, -72, 0, -68);    // 12
  line(0, -72, 3, -72);    // 3

  // arched windows — signature Holliston Town Hall feature
  noStroke();
  fill(8, 45, 25);
  for (let i = 0; i < 3; i++) {
    const wx = -24 + i * 22;
    // window frame
    fill(8, 45, 22);
    rect(wx, -46, 12, 18);
    arc(wx + 6, -46, 12, 12, PI, TWO_PI);
    // glass
    fill(210, 40, 62, 160);
    rect(wx + 1, -45, 10, 16);
    arc(wx + 6, -46, 10, 10, PI, TWO_PI);
  }

  // main entrance — double doors with arch
  noStroke();
  fill(22, 45, 18);
  rect(-10, -20, 20, 20);
  arc(0, -20, 20, 14, PI, TWO_PI);
  // door detail
  fill(22, 40, 14);
  rect(-9, -19, 8, 19);
  rect(1,  -19, 8, 19);

  // steps
  fill(0, 0, 55);
  rect(-18, -2, 36, 3);
  rect(-14,  1, 28, 3);

  // label
  noStroke();
  fill(0, 0, 65);
  textAlign(CENTER, TOP);
  textSize(6);
  textStyle(NORMAL);
  text('Town Hall', 0, 8);

  pop();
}

// Draws the rail trail path with gravel surface, old ties, and a small sign
function drawRailTrail(y) {
  // Rail trail runs across the back of the scene
  // shown as a path disappearing into the treeline
  push();

  // trail surface — packed gravel color
  noStroke();
  fill(35, 18, 52, 120);
  // perspective trapezoid — wider at front, narrows to horizon
  beginShape();
  vertex(width * 0.38, y + 2);
  vertex(width * 0.52, y + 2);
  vertex(width * 0.47, y - 2);
  vertex(width * 0.43, y - 2);
  endShape(CLOSE);

  // trail edges
  stroke(35, 15, 42, 140);
  strokeWeight(0.8);
  line(width * 0.38, y + 2, width * 0.43, y - 2);
  line(width * 0.52, y + 2, width * 0.47, y - 2);

  // old rail ties — a few visible ones
  stroke(22, 35, 22, 100);
  strokeWeight(1.2);
  for (let i = 0; i < 5; i++) {
    const prog = i / 5;
    const tx = lerp(width * 0.39, width * 0.44, prog);
    const tw = lerp(13, 4, prog);
    const ty = lerp(y + 1, y - 1, prog);
    line(tx - tw/2, ty, tx + tw/2, ty);
  }

  // small trail sign
  noStroke();
  fill(22, 35, 22);
  rect(width * 0.365, y - 14, 2, 14);
  fill(120, 65, 45);
  rect(width * 0.358, y - 18, 16, 6, 1);
  fill(0, 0, 92);
  textAlign(CENTER, CENTER);
  textSize(4);
  textStyle(BOLD);
  text('RAIL TRAIL', width * 0.366, y - 15);

  pop();
}

// Draws the Holliston balancing rock -- a glacial erratic perched on a small base
function drawBalancingRock(x, y) {
  // Famous Holliston balancing rock —
  // large glacial erratic perched on a smaller rock
  push();
  translate(x, y);

  noStroke();

  // base rock — small, flat
  fill(0, 0, 38);
  ellipse(0, -4, 18, 8);
  fill(0, 0, 32);
  ellipse(0, -4, 14, 5);

  // main boulder — large, irregular, dramatically balanced
  // slightly off-center to look precarious
  fill(0, 0, 40);
  beginShape();
  vertex(-14, -8);
  vertex(-18, -22);
  vertex(-14, -36);
  vertex(-4,  -42);
  vertex(10,  -40);
  vertex(18,  -28);
  vertex(16,  -14);
  vertex(6,   -8);
  endShape(CLOSE);

  // rock face highlights
  fill(0, 0, 48);
  beginShape();
  vertex(-14, -8);
  vertex(-18, -22);
  vertex(-10, -38);
  vertex(-4,  -42);
  vertex(-6,  -28);
  vertex(-8,  -14);
  endShape(CLOSE);

  // rock texture cracks
  stroke(0, 0, 30);
  strokeWeight(0.6);
  line(-8, -15, -4, -28);
  line(4, -12, 8, -25);
  line(-2, -32, 4, -38);

  // moss patches
  noStroke();
  fill(110, 35, 32, 160);
  ellipse(-10, -18, 6, 4);
  ellipse(5, -14, 5, 3);
  ellipse(-5, -38, 4, 3);

  // contact point — the tiny touching area that makes it dramatic
  fill(0, 0, 25);
  ellipse(2, -8, 5, 3);

  // label
  noStroke();
  fill(0, 0, 65);
  textAlign(CENTER, TOP);
  textSize(6);
  textStyle(NORMAL);
  text('Balancing Rock', 0, 5);

  pop();
}