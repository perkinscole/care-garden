// ================================================================
// File: town.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: Town backdrop rendering with shops, buildings,
//   vehicles, and pedestrians in a Holliston naive/folk-art style.
// ================================================================

// ── Town Backdrop ─────────────────────────────────────
// Holliston naive/folk-art town drawn in the sky zone.
// Single entry point: drawTown()  — wrapped in push/pop
// so it can never corrupt drawing state for the rest of
// the sketch (video panels, characters, etc.).

// ── Animation state ──────────────────────────────────
let _bgCars         = null;
let _bgCars2        = null;
let _bgWalkers      = null;
let _bgWalkers2     = null;
let _bgBikers       = null;
let _bgTrailWalkers = null;

// Initialize car, walker, and biker arrays for background animation
function _initBgElements() {
  const palette = [
    [5,65,52],[210,55,52],[120,45,40],[48,70,55],[0,0,82],
    [350,60,55],[180,50,48],[25,58,50],[0,60,48]
  ];
  const shirts = [0, 200, 120, 48, 270, 350, 30, 180, 90];

  // Road 2 cars (upper road — smaller)
  _bgCars = [];
  for (let i = 0; i < 3; i++) {
    const c = palette[i % palette.length];
    _bgCars.push({ x: random(0, width), speed: random(0.35, 0.9),
      dir: random() < 0.5 ? 1 : -1, hue: c[0], sat: c[1], lig: c[2], bus: false });
  }
  _bgCars.push({ x: random(0, width), speed: random(0.25, 0.6),
    dir: random() < 0.5 ? 1 : -1, hue: 48, sat: 80, lig: 60, bus: true });

  // Road 1 cars (main street — bigger)
  _bgCars2 = [];
  for (let i = 0; i < 4; i++) {
    const c = palette[(i + 3) % palette.length];
    _bgCars2.push({ x: random(0, width), speed: random(0.55, 1.3),
      dir: random() < 0.5 ? 1 : -1, hue: c[0], sat: c[1], lig: c[2], bus: false });
  }
  _bgCars2.push({ x: random(0, width), speed: random(0.3, 0.7),
    dir: random() < 0.5 ? 1 : -1, hue: 48, sat: 80, lig: 60, bus: true });
  _bgCars2.push({ x: random(0, width), speed: random(0.3, 0.7),
    dir: random() < 0.5 ? 1 : -1, hue: 0, sat: 0, lig: 82, bus: true });

  // Road 2 sidewalk walkers
  _bgWalkers = [];
  for (let i = 0; i < 6; i++) {
    _bgWalkers.push({ x: random(width*0.03, width*0.97), speed: random(0.04, 0.10),
      dir: random()<0.5?1:-1, phase: random(TWO_PI), hue: shirts[i % shirts.length] });
  }
  // Road 1 sidewalk walkers
  _bgWalkers2 = [];
  for (let i = 0; i < 9; i++) {
    _bgWalkers2.push({ x: random(width*0.03, width*0.97), speed: random(0.05, 0.13),
      dir: random()<0.5?1:-1, phase: random(TWO_PI), hue: shirts[(i + 4) % shirts.length] });
  }

  // Rail trail bikers
  _bgBikers = [];
  for (let i = 0; i < 5; i++) {
    _bgBikers.push({ x: random(0, width), speed: random(0.20, 0.50),
      dir: random() < 0.5 ? 1 : -1, phase: random(TWO_PI),
      hue: [0, 200, 120, 48, 270][i % 5] });
  }

  // Rail trail walkers
  _bgTrailWalkers = [];
  for (let i = 0; i < 6; i++) {
    _bgTrailWalkers.push({ x: random(width*0.03, width*0.97), speed: random(0.03, 0.09),
      dir: random()<0.5?1:-1, phase: random(TWO_PI),
      hue: [350, 30, 180, 90, 210, 55][i % 6] });
  }
}

// ── Small helpers ────────────────────────────────────

// Draw a wispy smoke effect rising from chimneys
function _naiveSmoke(x, y) {
  noFill();
  stroke(0, 0, 72, 110);
 strokeWeight(1.2);
  beginShape();
  curveVertex(x,     y);
  curveVertex(x + 1, y - 6);
  curveVertex(x - 2, y - 11);
  curveVertex(x + 2, y - 16);
  curveVertex(x,     y - 21);
  endShape();
  noStroke();
  fill(0, 0, 90, 70);
  ellipse(x,     y - 23, 5, 4);
  ellipse(x + 2, y - 28, 4, 4);
  ellipse(x - 1, y - 32, 3, 3);
}

// Draw a four-pane window with mullions and optional night glow
function _naiveWindow(x, y, w, h) {
  noStroke();
  const na = nightAmount();
  if (na > 0.2) {
    const glow = constrain((na - 0.2) / 0.4, 0, 1);
    fill(lerp(210, 42, glow), lerp(48, 85, glow), lerp(68, 72, glow), lerp(200, 240, glow));
  } else {
    fill(210, 48, 68, 200);
  }
  rect(x, y, w, h, 1);
  stroke(0, 0, 15); strokeWeight(1.2); noFill();
  rect(x, y, w, h, 1);
  stroke(0, 0, 15); strokeWeight(0.7);
  line(x + w/2, y, x + w/2, y + h);
  line(x, y + h/2, x + w, y + h/2);
  noStroke();
}

// ── Small town trees (deciduous + conifer mix) ──────

// Draw a single deciduous (type 0) or conifer (type 1) tree
function _townTree(x, y, h, type) {
  push(); translate(x, y); noStroke();
  fill(22, 30, 24);
  rect(-1.5, -h*0.4, 3, h*0.4);
  if (type === 1) {
    fill(108, 30, 28); triangle(-h*0.3, 0, h*0.3, 0, 0, -h);
    fill(110, 32, 32, 160); triangle(-h*0.2, -h*0.2, h*0.2, -h*0.2, 0, -h);
  } else {
    fill(108, 32, 30); ellipse(0, -h*0.55, h*0.7, h*0.65);
    fill(110, 35, 35, 160); ellipse(-h*0.08, -h*0.6, h*0.4, h*0.4);
  }
  pop();
}

// Draw a row of alternating deciduous and conifer trees
function _treeRow(x, y, count, spacing, h, sc) {
  for (let i = 0; i < count; i++) {
    const tx = x + i * spacing + (i % 2) * spacing * 0.3;
    _townTree(tx, y + (i % 3) * 1.5, h * sc * (0.85 + (i%3)*0.15), i % 3 === 1 ? 1 : 0);
  }
}

// ══════════════════════════════════════════════════════
//  drawTown()  — the single entry point
// ══════════════════════════════════════════════════════

// Main orchestrator that draws the entire town backdrop (forest, trails, roads, buildings)
function drawTown() {
  push();
  drawingContext.save();

  try {
    if (!_bgCars) _initBgElements();

    const hy = gndHorizon();

    // LOWER, flatter composition
    const forestY = hy * 0.44;
    const hillY   = hy * 0.54;
    const trailY  = hy * 0.65;
    const townY   = hy * 0.70;
    const roadY   = hy * 0.77;
    const frontY  = hy * 0.86;
    const road2Y  = hy * 0.91;

    // ==================================================
    // 1. BACK FOREST + DISTANT HILL
    // ==================================================
    noStroke();

    // forest backdrop, lower and more landscape-like
    fill(108, 24, 18);
    rect(-10, forestY - 28, width + 20, hy * 0.22);

    // distant hill for depth
    fill(112, 20, 20, 205);
    beginShape();
    vertex(-12, hillY - 26);
    bezierVertex(width * 0.18, hillY - 58, width * 0.36, hillY - 18, width * 0.52, hillY - 42);
    bezierVertex(width * 0.70, hillY - 70, width * 0.86, hillY - 24, width + 12, hillY - 48);
    vertex(width + 12, hillY + 10);
    bezierVertex(width * 0.82, hillY + 6, width * 0.62, hillY + 10, width * 0.42, hillY + 12);
    bezierVertex(width * 0.22, hillY + 14, width * 0.08, hillY + 16, -12, hillY + 10);
    endShape(CLOSE);

    // dense forest — varied heights, spacing, and types
    // Use a seeded pseudo-random for consistency across frames
    const _fr = (seed) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
    const fRand = _fr(42);

    for (let row = 0; row < 6; row++) {
      const rowY = forestY - 32 + row * 11;
      const rowScale = 0.7 + row * 0.12;
      const count = 28 + row * 3;
      for (let i = 0; i < count; i++) {
        const jitter = (fRand() - 0.5) * 18;
        const x = map(i, 0, count - 1, -20, width + 20) + jitter;
        const hVar = fRand();
        const h = (12 + row * 4 + hVar * 14) * rowScale;
        // Mix of conifers (1) and deciduous (0), more conifers in back
        const type = fRand() < (0.55 - row * 0.06) ? 1 : 0;
        // Slight color variation per tree
        const shade = 106 + fRand() * 12;
        const sat = 26 + fRand() * 14;
        const lig = 22 + row * 3 + fRand() * 8;

        push(); translate(x, rowY + fRand() * 6); noStroke();
        // Trunk
        fill(22, 30, 24);
        rect(-1.5, -h * 0.35, 3, h * 0.35);
        if (type === 1) {
          // Conifer — pointed triangle, varied width
          const cw = h * (0.25 + fRand() * 0.15);
          fill(shade, sat, lig);
          triangle(-cw, 0, cw, 0, 0, -h);
          fill(shade + 2, sat + 3, lig + 4, 160);
          triangle(-cw * 0.6, -h * 0.25, cw * 0.6, -h * 0.25, 0, -h);
        } else {
          // Deciduous — round canopy, varied shape
          const cw = h * (0.3 + fRand() * 0.15);
          const ch = h * (0.55 + fRand() * 0.15);
          fill(shade, sat, lig);
          ellipse(0, -h * 0.5, cw * 2, ch);
          fill(shade + 2, sat + 4, lig + 5, 160);
          ellipse(-cw * 0.15, -h * 0.55, cw, ch * 0.6);
        }
        pop();
      }
    }

    // ==================================================
    // 2. UPPER LAND TERRACE
    // ==================================================
    // Safety fill — solid green behind all terraces so no sky peeks through bezier dips
    fill(109, 30, 40);
    rect(-10, hillY - 24, width + 20, townY - hillY + 30);

    fill(109, 30, 40);
    beginShape();
    vertex(-10, hillY);
    bezierVertex(width * 0.18, hillY - 14, width * 0.36, hillY + 10, width * 0.56, hillY - 4);
    bezierVertex(width * 0.74, hillY - 18, width * 0.90, hillY + 6, width + 10, hillY - 6);
    vertex(width + 10, townY - 12);
    vertex(-10, townY - 10);
    endShape(CLOSE);

    // lake pushed further left so school doesn't cover it
    _naiveLake(width * 0.10, hillY + 18, 178, 34);

    // tunnel drawn here (behind trail), bridge moved to after trail
    _naiveTunnel(width * 0.98, trailY - 4, 1.3);

    _townTree(width * 0.20, hillY + 10, 18, 0);
    _townTree(width * 0.24, hillY + 14, 16, 1);
    _townTree(width * 0.28, hillY + 16, 15, 0);
let offset = 25;
    // only a few upper buildings, well behind town
    _naiveHouse(width * 0.58, hillY + offset, 0.54, 120, 42, 70, 0.42);
    _naiveHouse(width * 0.68, hillY +offset, 0.50, 55, 44, 68, 0.40);
    _naiveHouse(width * 0.78, hillY +offset, 0.48, 210, 40, 72, 0.40);
    _townTree(width * 0.63, hillY + 20, 13, 1);
    _townTree(width * 0.75, hillY + 20, 13, 0);

    // ==================================================
    // 3. RAIL TRAIL
    // ==================================================
    const trailH = hy * 0.032;

    fill(28, 10, 58);
    beginShape();
    vertex(-10, trailY - trailH / 2);
    vertex(width * 0.14, trailY - trailH / 2 - 1);
    vertex(width * 0.34, trailY - trailH / 2 + 2);
    vertex(width * 0.56, trailY - trailH / 2);
    vertex(width * 0.78, trailY - trailH / 2 + 1);
    vertex(width + 10, trailY - trailH / 2 - 1);
    vertex(width + 10, trailY + trailH / 2 + 1);
    vertex(width * 0.78, trailY + trailH / 2 + 1);
    vertex(width * 0.56, trailY + trailH / 2);
    vertex(width * 0.34, trailY + trailH / 2 + 2);
    vertex(width * 0.14, trailY + trailH / 2 - 1);
    vertex(-10, trailY + trailH / 2 + 1);
    endShape(CLOSE);

    stroke(48, 50, 68, 120);
    strokeWeight(0.5);
    for (let lx = 0; lx < width; lx += 12) {
      line(lx, trailY, lx + 7, trailY);
    }
    noStroke();

    // bridge moved to section 6 so town terrace doesn't cover it

    _updateDrawBgBikers(_bgBikers, trailY, 0.46);
    _updateDrawBgWalkers(_bgTrailWalkers, trailY + trailH / 2 + 2, 0.42);

    // ==================================================
    // 4. MAIN TOWN TERRACE
    // ==================================================
    fill(112, 33, 36);
    beginShape();
    vertex(-10, townY - 12);
    bezierVertex(width * 0.18, townY - 24, width * 0.40, townY + 6, width * 0.62, townY - 10);
    bezierVertex(width * 0.80, townY - 24, width * 0.94, townY + 4, width + 10, townY - 4);
    vertex(width + 10, frontY +15);
    vertex(-10, frontY + 4);
    endShape(CLOSE);

    const roadH = hy * 0.05;
    const swH = roadH * 0.3;

    // Sidewalks along main road
    noStroke();
    fill(0, 0, 72);
    rect(-8, roadY - roadH / 2 - swH, width + 16, swH);
    rect(-8, roadY + roadH / 2, width + 16, swH);
    // Sidewalk joint lines
    stroke(0, 0, 62, 120); strokeWeight(0.4);
    for (let lx = 0; lx < width; lx += 14) {
      line(lx, roadY - roadH / 2 - swH, lx, roadY - roadH / 2);
      line(lx, roadY + roadH / 2, lx, roadY + roadH / 2 + swH);
    }
    noStroke();

    fill(30, 8, 34);
    beginShape();
    vertex(-8, roadY - roadH / 2 + 1);
    bezierVertex(width * 0.14, roadY - roadH / 2 - 1, width * 0.30, roadY - roadH / 2 + 3, width * 0.48, roadY - roadH / 2);
    bezierVertex(width * 0.66, roadY - roadH / 2 - 2, width * 0.82, roadY - roadH / 2 + 2, width + 8, roadY - roadH / 2 + 1);
    vertex(width + 8, roadY + roadH / 2 + 1);
    bezierVertex(width * 0.82, roadY + roadH / 2, width * 0.66, roadY + roadH / 2 + 1, width * 0.48, roadY + roadH / 2 - 1);
    bezierVertex(width * 0.30, roadY + roadH / 2 + 2, width * 0.14, roadY + roadH / 2 - 1, -8, roadY + roadH / 2 + 1);
    endShape(CLOSE);

    stroke(48, 58, 75, 160);
    strokeWeight(0.8);
    for (let lx = 0; lx < width; lx += 20) {
      line(lx, roadY, lx + 11, roadY);
    }
    noStroke();

    const crossRoads = [width * 0.18, width * 0.42, width * 0.68, width * 0.88];
    for (let cx of crossRoads) {
      fill(30, 8, 34);
      beginShape();
      vertex(cx - 5, roadY - roadH / 2);
      vertex(cx + 5, roadY - roadH / 2);
      vertex(cx + 12, hy + 20);
      vertex(cx - 12, hy + 20);
      endShape(CLOSE);
    }

    _updateDrawBgCars(_bgCars2, roadY - 1, 0.50);
    _updateDrawBgWalkers(_bgWalkers2, roadY + roadH / 2 + 2, 0.62);

    // BACK ROW — houses above the main road (right side only)
    _naiveHouse(width * 0.70, townY - 4, 0.56, 120, 42, 70, 0.50);
    _naiveHouse(width * 0.78, townY - 4, 0.54, 55, 44, 68, 0.50);
    _townTree(width * 0.84, townY - 4, 15, 0);
    _naiveHouse(width * 0.90, townY - 4, 0.58, 180, 40, 72, 0.52);
    _naiveHouse(width * 0.96, townY - 4, 0.54, 28, 52, 64, 0.50);

    // FRONT ROW — houses between town row and main road (right side only)
    const midRowY = (townY + roadY) / 2 - 4;
    _townTree(width * 0.55, midRowY - 2, 15, 1);
    _townTree(width * 0.64, midRowY - 4, 14, 0);
    _naiveHouse(width * 0.72, midRowY, 0.66, 120, 42, 68, 0.60);
    _naiveHouse(width * 0.80, midRowY, 0.64, 55, 45, 70, 0.58);
    _townTree(width * 0.87, midRowY - 2, 16, 1);
    _naiveHouse(width * 0.94, midRowY, 0.68, 28, 50, 66, 0.62);

    // ==================================================
    // 5. FRONT FLANKS
    // ==================================================
    // Safety fill — covers any gaps between town terrace and front flanks
    fill(112, 33, 36);
    rect(-10, frontY - 8, width + 20, 12);
    fill(112, 34, 36);
    rect(-10, frontY, width + 20, hy - frontY + 20);

    const road2H = hy * 0.042;
    const sw2H = road2H * 0.3;

    // Sidewalks along front flank roads
    noStroke();
    fill(0, 0, 72);
    // Left road sidewalks
    rect(-4, road2Y - road2H / 2 - sw2H, width * 0.25 + 4, sw2H);
    rect(-4, road2Y + road2H / 2, width * 0.25 + 4, sw2H);
    // Right road sidewalks
    rect(width * 0.73, road2Y - road2H / 2 - sw2H, width * 0.27 + 8, sw2H);
    rect(width * 0.73, road2Y + road2H / 2, width * 0.27 + 8, sw2H);
    // Joint lines
    stroke(0, 0, 62, 120); strokeWeight(0.4);
    for (let lx = 0; lx < width * 0.25; lx += 12) {
      line(lx, road2Y - road2H / 2 - sw2H, lx, road2Y - road2H / 2);
      line(lx, road2Y + road2H / 2, lx, road2Y + road2H / 2 + sw2H);
    }
    for (let lx = width * 0.73; lx < width; lx += 12) {
      line(lx, road2Y - road2H / 2 - sw2H, lx, road2Y - road2H / 2);
      line(lx, road2Y + road2H / 2, lx, road2Y + road2H / 2 + sw2H);
    }
    noStroke();

    fill(30, 8, 33);
    rect(-4, road2Y - road2H / 2, width * 0.25 + 4, road2H);
    rect(width * 0.73, road2Y - road2H / 2, width * 0.27 + 8, road2H);

    stroke(48, 58, 75, 150);
    strokeWeight(0.7);
    for (let lx = 0; lx < width * 0.25; lx += 16) {
      line(lx, road2Y, lx + 9, road2Y);
    }
    for (let lx = width * 0.73; lx < width; lx += 16) {
      line(lx, road2Y, lx + 9, road2Y);
    }
    noStroke();

    // Front-flank houses — sitting just above road2
    const road2Top = road2Y - road2H / 2 - 6;
    _naiveHouse(width * 0.77, road2Top, 0.70, 55, 45, 70, 0.66);
    _townTree(width * 0.84, road2Top - 2, 18, 1);
    _naiveHouse(width * 0.89, road2Top, 0.68, 180, 40, 68, 0.64);
    _naiveHouse(width * 0.95, road2Top, 0.72, 28, 52, 64, 0.68);

    // ==================================================
    // 6. DOWNTOWN LANDMARKS + BRIDGE — drawn last so they sit on top
    // ==================================================

    // Bridge — starts on left, extends wide behind the school
    _naiveBridge(width * 0.04, trailY + 4, 1.1);

    // ── Main Street strip — three stores flush against each other on far left ──
    // Superette bw=62, Fiskes bw=70, CVS bw=58, all at sc=0.60
    // Half-widths: 18.6, 21, 17.4 — pack edge to edge from x=0
    const stSc = 0.60;
    const st1w = 62 * stSc / 2;  // Superette half-width
    const st2w = 70 * stSc / 2;  // Fiskes half-width
    const st3w = 58 * stSc / 2;  // CVS half-width
    const stNudge = 10;                          // nudge right a smidge
    const st1x = st1w + stNudge;               // Superette center
    const st2x = st1x + st1w + st2w;           // Fiskes center (flush)
    const st3x = st2x + st2w + st3w;           // CVS center (flush)
    _naiveSuperette(st1x, roadY - 10, stSc);
    _naiveFiskes(st2x, roadY - 10, stSc);
    _naiveCVS(st3x, roadY - 10, stSc);

    // Town Hall — right side, above road
    _naiveTownHall(width * 0.84, roadY - 10, 0.72);

    // Church — right side, above road
    _naiveChurch(width * 0.90, roadY - 12, 0.68);

    // Night overlay — darken the entire town backdrop
    const na = nightAmount();
    if (na > 0.05) {
      noStroke();
      fill(0, 0, 0, na * 150);
      rect(-10, 0, width + 20, gndHorizon());
    }

  } catch (e) {
    console.error('Town drawing error:', e);
  }

  drawingContext.restore();
  pop();
}

// ── Rail Trail Tunnel ────────────────────────────────

// Draw the rail trail stone tunnel with arch, vines, and sign
function _naiveTunnel(x, y, sc=1) {
  push();
  translate(x, y);
  scale(sc, sc);

  // Hillside / embankment around tunnel
  noStroke();
  fill(108, 32, 38, 200);
  ellipse(0, -20, 90, 50);
  fill(110, 35, 35, 180);
  ellipse(-15, -15, 70, 40);
  ellipse(18, -18, 65, 38);

  // Stone retaining walls
  fill(0, 0, 48);
  rect(-35, -35, 14, 35);
  rect(21, -35, 14, 35);
  // Wall texture
  stroke(0, 0, 38, 140);
  strokeWeight(0.5);
  for (let r = 0; r < 5; r++) {
    const ry = -32 + r * 7;
    line(-35, ry, -21, ry);
    line(21, ry, 35, ry);
  }

  // Stone arch surround
  noStroke();
  fill(0, 0, 52);
  arc(0, 0, 46, 48, PI, TWO_PI);
  rect(-23, -24, 46, 24);

  // Keystone blocks
  fill(0, 0, 56);
  for (let a = PI; a < TWO_PI; a += 0.35) {
    const r1 = 20, r2 = 23;
    stroke(0, 0, 40, 100); strokeWeight(0.4);
    line(cos(a)*r1, sin(a)*r1*1.04, cos(a)*r2, sin(a)*r2*1.04);
  }

  // Dark tunnel interior
  noStroke();
  fill(0, 0, 10);
  arc(0, 0, 36, 38, PI, TWO_PI);
  rect(-18, -19, 36, 19);

  // Light at end of tunnel (perspective glow)
  fill(108, 28, 52, 100);
  ellipse(0, -6, 14, 18);
  fill(0, 0, 80, 70);
  ellipse(0, -6, 9, 13);

  // Keystone at crown
  noStroke();
  fill(0, 0, 58);
  beginShape();
  vertex(-4, -25); vertex(4, -25);
  vertex(3, -22); vertex(-3, -22);
  endShape(CLOSE);

  // Path coming out of tunnel
  fill(35, 18, 55, 160);
  beginShape();
  vertex(-13, 0); vertex(13, 0);
  vertex(18, 6); vertex(-18, 6);
  endShape(CLOSE);

  // Greenery/vines on top and sides
  noStroke();
  fill(110, 42, 34, 190);
  ellipse(-22, -38, 20, 10);
  ellipse(0, -30, 24, 8);
  ellipse(20, -36, 18, 10);
  ellipse(-32, -30, 14, 8);
  ellipse(30, -28, 12, 8);
  // Hanging vines
  fill(108, 38, 30, 150);
  ellipse(-20, -28, 4, 8);
  ellipse(22, -26, 3, 7);

  // Sign above
  fill(115, 50, 32);
  rect(-16, -50, 32, 9, 2);
  stroke(0,0,15); strokeWeight(1); noFill();
  rect(-16, -50, 32, 9, 2);
  stroke(25, 20, 28); strokeWeight(1.8);
  line(0, -41, 0, -36);
  noStroke();
  fill(0, 0, 95);
  textSize(4.5); textAlign(CENTER, CENTER);
  text('RAIL TRAIL', 0, -45.5);
  textAlign(LEFT, BASELINE); textSize(12);

  pop();
}

// ── Lake Winthrop ────────────────────────────────────

// Draw Lake Winthrop with shore, reeds, ripples, and label
function _naiveLake(x, y, w, h) {
  push();
  translate(x, y);

  // Lake body — soft blue oval
  noStroke();
  fill(205, 55, 58, 210);
  ellipse(0, 0, w, h);
  // Lighter center for depth
  fill(205, 48, 68, 160);
  ellipse(0, -h*0.05, w*0.7, h*0.6);
  // Subtle highlight / reflection
  fill(205, 35, 78, 100);
  ellipse(-w*0.1, -h*0.12, w*0.3, h*0.25);

  // Shore edge
  noFill();
  stroke(108, 30, 38, 140);
  strokeWeight(1.5);
  ellipse(0, 0, w + 3, h + 3);
  noStroke();

  // Sandy shore patches
  fill(38, 28, 62, 120);
  ellipse(-w*0.35, h*0.25, w*0.15, h*0.12);
  ellipse(w*0.38, h*0.18, w*0.12, h*0.10);

  // Reeds on left shore
  stroke(95, 40, 32, 200);
  strokeWeight(1.0);
  for (let i = 0; i < 4; i++) {
    const rx = -w*0.48 + i*3;
    const rh = 6 + i*1.5;
    line(rx, -h*0.1 + i*2, rx + 1, -h*0.1 + i*2 - rh);
    // Cattail tops
    noStroke();
    fill(30, 35, 28, 200);
    ellipse(rx + 1, -h*0.1 + i*2 - rh, 2, 4);
    stroke(95, 40, 32, 200);
    strokeWeight(1.0);
  }

  // Reeds on right shore
  for (let i = 0; i < 3; i++) {
    const rx = w*0.40 + i*3;
    const rh = 5 + i*1.2;
    line(rx, h*0.05 + i*1.5, rx - 0.5, h*0.05 + i*1.5 - rh);
    noStroke();
    fill(30, 35, 28, 200);
    ellipse(rx - 0.5, h*0.05 + i*1.5 - rh, 2, 3.5);
    stroke(95, 40, 32, 200);
    strokeWeight(1.0);
  }

  // Tiny ripple lines
  noFill();
  stroke(205, 30, 80, 80);
  strokeWeight(0.5);
  line(-w*0.15, h*0.08, -w*0.05, h*0.08);
  line(w*0.08, -h*0.05, w*0.18, -h*0.05);
  line(-w*0.08, h*0.2, w*0.02, h*0.2);

  // Label
  noStroke();
  fill(0, 0, 55, 180);
  textAlign(CENTER, CENTER);
  textSize(5);
  textStyle(ITALIC);
  text('Lake Winthrop', 0, h*0.42);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE);
  textSize(12);

  pop();
}

// ── Green field patches ─────────────────────────────

// Draw a green crop field patch with textured rows
function _naiveField(x, y, w, h, hue) {
  push();
  translate(x, y);
  noStroke();
  // Field base
  fill(hue, 35, 45, 140);
  rect(-w/2, -h/2, w, h, 3);
  // Crop rows / texture
  stroke(hue + 5, 30, 38, 100);
  strokeWeight(0.6);
  for (let row = 0; row < 4; row++) {
    const ry = -h/2 + 2 + row * (h - 4) / 4;
    line(-w/2 + 2, ry, w/2 - 2, ry);
  }
  noStroke();
  pop();
}

// ── Small shop storefront ────────────────────────────

// Draw a generic small shop storefront with awning, window, and sign
function _naiveShop(x, y, sc, hue, name) {
  push();
  translate(x, y);
  scale(sc, sc);
  const bw = 32, bh = 22;

  // Body
  noStroke(); fill(hue, 22, 80);
  rect(-bw/2, -bh, bw, bh);
  stroke(0,0,15); strokeWeight(1.2); noFill();
  rect(-bw/2, -bh, bw, bh);

  // Awning — striped
  const aw = 5;
  for (let i = 0; i < 6; i++) {
    noStroke();
    fill(i % 2 === 0 ? color(hue, 50, 42) : color(0, 0, 90));
    rect(-bw/2 + i*(bw/6), -bh + 3, bw/6, aw);
  }
  stroke(0,0,15); strokeWeight(0.8); noFill();
  rect(-bw/2, -bh + 3, bw, aw);

  // Storefront window
  noStroke(); fill(210, 35, 55, 180);
  rect(-bw/2 + 3, -bh + aw + 4, bw - 6, bh - aw - 6);
  stroke(0,0,15); strokeWeight(0.8); noFill();
  rect(-bw/2 + 3, -bh + aw + 4, bw - 6, bh - aw - 6);
  stroke(0,0,15); strokeWeight(0.6);
  line(0, -bh + aw + 4, 0, -2);

  // Door
  noStroke(); fill(hue, 30, 35);
  rect(-3, -10, 6, 10, 1, 1, 0, 0);

  // Sign
  if (name) {
    noStroke(); fill(0, 0, 92);
    textSize(4); textAlign(CENTER, CENTER);
    text(name, 0, -bh - 5);
    textAlign(LEFT, BASELINE); textSize(12);
  }

  pop();
}

// ── Building functions ───────────────────────────────

// Draw a white clapboard church with steeple, cross, and arched door
function _naiveChurch(x, y, sc=1) {
  push();
  translate(x, y);
  scale(sc, sc);

  // Main body — white clapboard
  noStroke();
  fill(0, 0, 92);
  rect(-28, -52, 56, 52);
  stroke(0,0,15); strokeWeight(1.6); noFill();
  rect(-28, -52, 56, 52);

  // Portico columns (4)
  noStroke();
  fill(0, 0, 95);
  for (let i = 0; i < 4; i++) {
    rect(-18 + i*12, -48, 6, 48);
    stroke(0,0,15); strokeWeight(1); noFill();
    rect(-18 + i*12, -48, 6, 48);
  }

  // Bell tower base — drawn first so pediment covers its bottom
  noStroke();
  fill(0, 0, 88);
  rect(-11, -80, 22, 22);
  stroke(0,0,15); strokeWeight(1.5); noFill();
  rect(-11, -80, 22, 22);

  // Belfry — sits on tower base
  noStroke();
  fill(0, 0, 86);
  rect(-8, -106, 16, 26);
  stroke(0,0,15); strokeWeight(1.5); noFill();
  rect(-8, -106, 16, 26);
  // Louver openings
  noStroke();
  fill(0, 0, 38);
  rect(-6, -102, 4, 10);
  rect(2,  -102, 4, 10);

  // Spire — sits on belfry
  noStroke();
  fill(0, 0, 84);
  triangle(-8, -106, 8, -106, 0, -166);
  stroke(0,0,15); strokeWeight(1.5); noFill();
  triangle(-8, -106, 8, -106, 0, -166);

  // Cross
  stroke(0,0,20); strokeWeight(2.5);
  line(0, -166, 0, -152);
  line(-5, -160, 5, -160);

  // Pediment — drawn on top to cover tower base
  noStroke();
  fill(0, 0, 90);
  triangle(-28, -52, 28, -52, 0, -68);
  stroke(0,0,15); strokeWeight(1.5); noFill();
  triangle(-28, -52, 28, -52, 0, -68);

  // Windows on body
  _naiveWindow(-20, -40, 9, 14);
  _naiveWindow(11,  -40, 9, 14);

  // Arched door
  noStroke();
  fill(30, 35, 28);
  rect(-6, -22, 12, 22, 1, 1, 0, 0);
  arc(0, -22, 12, 12, PI, TWO_PI);
  stroke(0,0,15); strokeWeight(1.2); noFill();
  rect(-6, -22, 12, 22, 1, 1, 0, 0);
  arc(0, -22, 12, 12, PI, TWO_PI);

  // Steps
  noStroke();
  fill(0, 0, 62);
  rect(-20, -3, 40, 3);
  rect(-15, 0,  30, 3);

  // Chimney smoke
  _naiveSmoke(-16, -54);
  _naiveSmoke(14,  -54);

  pop();
}

// Draw the colonial Town Hall with pediment, flagpole, and chimneys
function _naiveTownHall(x, y, sc=1) {
  push();
  translate(x, y);
  scale(sc, sc);

  const bw = 90, bh = 55;

  // Body — colonial blue-gray
  noStroke();
  fill(210, 30, 72);
  rect(-bw/2, -bh, bw, bh);
  stroke(0,0,15); strokeWeight(1.6); noFill();
  rect(-bw/2, -bh, bw, bh);

  // Pediment
  noStroke();
  fill(210, 28, 76);
  triangle(-bw/2 - 4, -bh, bw/2 + 4, -bh, 0, -bh - 38);
  stroke(0,0,15); strokeWeight(1.6); noFill();
  triangle(-bw/2 - 4, -bh, bw/2 + 4, -bh, 0, -bh - 38);

  // Oculus window in gable
  noStroke();
  fill(210, 45, 62, 210);
  ellipse(0, -bh - 18, 13, 13);
  stroke(0,0,15); strokeWeight(1.2); noFill();
  ellipse(0, -bh - 18, 13, 13);

  // Chimneys
  noStroke();
  fill(10, 52, 38);
  rect(-bw/2 + 14, -bh - 28, 8, 22);
  rect(bw/2 - 22,  -bh - 28, 8, 22);
  stroke(0,0,15); strokeWeight(1.2); noFill();
  rect(-bw/2 + 14, -bh - 28, 8, 22);
  rect(bw/2 - 22,  -bh - 28, 8, 22);
  // Chimney caps
  noStroke();
  fill(10, 45, 30);
  rect(-bw/2 + 12, -bh - 30, 12, 4);
  rect(bw/2 - 24,  -bh - 30, 12, 4);

  // Chimney smoke
  _naiveSmoke(-bw/2 + 18, -bh - 28);
  _naiveSmoke(bw/2 - 18,  -bh - 28);

  // Upper windows — 3 arched, evenly spaced
  for (let i = 0; i < 3; i++) {
    const wx = -28 + i * 28;
    noStroke();
    fill(210, 40, 62, 210);
    rect(wx - 7, -bh + 8, 14, 20);
    arc(wx, -bh + 8, 14, 14, PI, TWO_PI);
    stroke(0,0,15); strokeWeight(1.2); noFill();
    rect(wx - 7, -bh + 8, 14, 20);
    arc(wx, -bh + 8, 14, 14, PI, TWO_PI);
  }

  // Lower side windows — symmetric
  _naiveWindow(-bw/2 + 8, -26, 13, 18);
  _naiveWindow(bw/2 - 21, -26, 13, 18);

  // Center arched door
  noStroke();
  fill(30, 30, 25);
  rect(-8, -22, 16, 22, 1, 1, 0, 0);
  arc(0, -22, 16, 12, PI, TWO_PI);
  stroke(0,0,15); strokeWeight(1.2); noFill();
  rect(-8, -22, 16, 22, 1, 1, 0, 0);
  arc(0, -22, 16, 12, PI, TWO_PI);
  // Door knob
  noStroke(); fill(42, 60, 50);
  ellipse(4, -10, 3, 3);

  // Steps
  noStroke();
  fill(0, 0, 58);
  rect(-bw/2, -4, bw, 4);
  fill(0, 0, 54);
  rect(-bw/2 + 6, 0, bw - 12, 4);

  // Flagpole
  stroke(0,0,25); strokeWeight(1.5);
  line(-bw/2 - 14, 0, -bw/2 - 14, -bh - 38);
  // Flag — red and white stripes, blue canton
  noStroke();
  const fx = -bw/2 - 13, fy = -bh - 38, fw = 16, fh = 9;
  const stripeH = fh / 7;
  for (let i = 0; i < 7; i++) {
    fill(i % 2 === 0 ? color(0, 78, 45) : color(0, 0, 95));
    rect(fx, fy + i * stripeH, fw, stripeH);
  }
  // Blue canton
  fill(222, 68, 38);
  rect(fx, fy, fw * 0.45, fh * 0.57);

  pop();
}

// Draw the Superette storefront with striped awning and utility pole
function _naiveSuperette(x, y, sc=1) {
  push();
  translate(x, y);
  scale(sc, sc);
  const bw = 62, bh = 24;
  const awY = -bh + 7, awH = 9;

  // Building body — cream
  noStroke();
  fill(35, 25, 84);
  rect(-bw/2, -bh, bw, bh);
  stroke(0,0,15); strokeWeight(1.5); noFill();
  rect(-bw/2, -bh, bw, bh);

  // Sign panel
  noStroke();
  fill(8, 62, 55);
  rect(-bw/2, -bh - 12, bw, 12);
  stroke(0,0,15); strokeWeight(1.5); noFill();
  rect(-bw/2, -bh - 12, bw, 12);
  noStroke();
  fill(0, 0, 92);
  textSize(7); textAlign(CENTER, CENTER);
  text('SUPERETTE', 0, -bh - 6);
  textAlign(LEFT, BASELINE); textSize(12);

  // Storefront window
  noStroke();
  fill(210, 35, 55, 180);
  rect(-bw/2 + 3, awY + awH, bw - 6, bh - awH - 3);
  stroke(0,0,15); strokeWeight(1.2); noFill();
  rect(-bw/2 + 3, awY + awH, bw - 6, bh - awH - 3);
  stroke(0,0,15); strokeWeight(0.8);
  line(0, awY + awH, 0, 0);

  // Diagonal striped awning
  const scCount = 8;
  const sw2 = bw / scCount;
  for (let s = 0; s < scCount; s++) {
    noStroke();
    fill(s % 2 === 0 ? color(350, 58, 35) : color(0, 0, 92));
    const ax = -bw/2 + s * sw2;
    beginShape();
    vertex(ax,           awY);
    vertex(ax + sw2,     awY);
    vertex(ax + sw2 - awH * 0.5, awY + awH);
    vertex(ax - awH * 0.5,       awY + awH);
    endShape(CLOSE);
  }
  // Awning outline
  stroke(0,0,15); strokeWeight(1.5); noFill();
  beginShape();
  vertex(-bw/2,            awY);
  vertex(bw/2,             awY);
  vertex(bw/2 - awH*0.5,  awY + awH);
  vertex(-bw/2 - awH*0.5, awY + awH);
  endShape(CLOSE);
  // Scallop drape
  noStroke();
  fill(350, 55, 32);
  const scW = (bw + awH*0.5) / 6;
  for (let i = 0; i < 6; i++) {
    arc(-bw/2 - awH*0.5 + (i + 0.5)*scW, awY + awH, scW, 7, 0, PI);
  }

  // Utility pole
  stroke(25, 22, 32); strokeWeight(1.8);
  line(bw/2 + 7, 0, bw/2 + 7, -bh - 20);
  strokeWeight(1);
  line(bw/2 + 2, -bh - 14, bw/2 + 12, -bh - 14);
  noStroke();

  pop();
}

// Draw Fiske's General Store with display windows, awnings, and balloons
function _naiveFiskes(x, y, sc=1) {
  push();
  translate(x, y);
  scale(sc, sc);
  const bw = 70, bh = 28;

  // Building body — white/cream storefront
  noStroke();
  fill(0, 0, 92);
  rect(-bw/2, -bh, bw, bh);
  stroke(0, 0, 15); strokeWeight(1.5); noFill();
  rect(-bw/2, -bh, bw, bh);

  // Black sign panel with gold text
  noStroke();
  fill(0, 0, 10);
  rect(-bw/2, -bh - 14, bw, 14);
  stroke(0, 0, 15); strokeWeight(1.5); noFill();
  rect(-bw/2, -bh - 14, bw, 14);
  noStroke();
  fill(42, 70, 72);
  textSize(6); textAlign(CENTER, CENTER); textStyle(BOLD);
  text("FISKE'S  GENERAL  STORE", 0, -bh - 7);
  textStyle(NORMAL);
  // "MOST EVERYTHING" left, "SINCE 1982" right
  textSize(3.5); textAlign(LEFT, CENTER);
  fill(42, 60, 68);
  text('MOST', -bw/2 + 3, -bh - 11);
  text('EVERYTHING', -bw/2 + 3, -bh - 7);
  textAlign(RIGHT, CENTER);
  text('SINCE 1982', bw/2 - 3, -bh - 7);
  textAlign(LEFT, BASELINE); textSize(12);

  // Display windows — two large panes
  noStroke();
  fill(210, 35, 55, 180);
  rect(-bw/2 + 4, -bh + 8, bw/2 - 8, bh - 12);
  rect(4, -bh + 8, bw/2 - 8, bh - 12);
  // Window frames
  stroke(0, 0, 15); strokeWeight(1); noFill();
  rect(-bw/2 + 4, -bh + 8, bw/2 - 8, bh - 12);
  rect(4, -bh + 8, bw/2 - 8, bh - 12);
  // Window mullions
  strokeWeight(0.7);
  line((-bw/2 + 4 + 4) / 2 + (-bw/2 + 4) / 2, -bh + 8,
       (-bw/2 + 4 + 4) / 2 + (-bw/2 + 4) / 2, -4);

  // Red center door
  noStroke();
  fill(0, 65, 42);
  rect(-4, -bh + 6, 8, bh - 6);
  // Door frame
  stroke(0, 0, 15); strokeWeight(1); noFill();
  rect(-4, -bh + 6, 8, bh - 6);
  // Door window
  noStroke();
  fill(210, 30, 55, 160);
  rect(-2.5, -bh + 8, 5, 6);

  // Black awnings over windows
  noStroke();
  fill(0, 0, 15);
  // Left awning
  beginShape();
  vertex(-bw/2 + 3, -bh + 7);
  vertex(0, -bh + 7);
  vertex(-2, -bh + 13);
  vertex(-bw/2 + 1, -bh + 13);
  endShape(CLOSE);
  // Right awning
  beginShape();
  vertex(0, -bh + 7);
  vertex(bw/2 - 3, -bh + 7);
  vertex(bw/2 - 1, -bh + 13);
  vertex(2, -bh + 13);
  endShape(CLOSE);

  // Balloons near entrance
  noStroke();
  const balloonHues = [0, 200, 55, 310];
  for (let i = 0; i < balloonHues.length; i++) {
    const bx = -12 + i * 4;
    const by = -bh + 2 - i * 3;
    fill(balloonHues[i], 75, 65);
    ellipse(bx, by, 4, 5);
    stroke(0, 0, 30); strokeWeight(0.4);
    line(bx, by + 2.5, bx, -bh + 6);
    noStroke();
  }

  pop();
}

// Draw the CVS pharmacy storefront with red sign and automatic door
function _naiveCVS(x, y, sc=1) {
  push();
  translate(x, y);
  scale(sc, sc);
  const bw = 58, bh = 24;

  // Building body — white
  noStroke();
  fill(0, 0, 95);
  rect(-bw/2, -bh, bw, bh);
  stroke(0, 0, 15); strokeWeight(1.5); noFill();
  rect(-bw/2, -bh, bw, bh);

  // Red sign panel
  noStroke();
  fill(0, 70, 48);
  rect(-bw/2, -bh - 12, bw, 12);
  stroke(0, 0, 15); strokeWeight(1.5); noFill();
  rect(-bw/2, -bh - 12, bw, 12);

  // CVS text — bold red on white bg
  noStroke();
  fill(0, 0, 98);
  textSize(10); textAlign(CENTER, CENTER); textStyle(BOLD);
  text('CVS', 0, -bh - 6);
  textStyle(NORMAL);
  textAlign(LEFT, BASELINE); textSize(12);

  // Large storefront window
  noStroke();
  fill(210, 35, 55, 180);
  rect(-bw/2 + 4, -bh + 6, bw - 8, bh - 10);
  stroke(0, 0, 15); strokeWeight(1); noFill();
  rect(-bw/2 + 4, -bh + 6, bw - 8, bh - 10);
  // Vertical dividers
  strokeWeight(0.8);
  line(-bw/6, -bh + 6, -bw/6, -4);
  line(bw/6, -bh + 6, bw/6, -4);

  // Automatic door — center
  noStroke();
  fill(200, 15, 42);
  rect(-5, -bh + 6, 10, bh - 6);
  stroke(0, 0, 15); strokeWeight(0.8); noFill();
  rect(-5, -bh + 6, 10, bh - 6);

  // Little red CVS heart/cross logo
  noStroke();
  fill(0, 80, 50);
  rect(-2, -bh - 2, 4, 1.5);
  rect(-0.75, -bh - 3.5, 1.5, 4);

  pop();
}

// Draw the stone arch bridge with X-brace railing and foliage
function _naiveBridge(x, y, sc=1) {
  push();
  translate(x, y);
  scale(sc, sc);
  const bw = 280, bh = 18;
  const numArches = 9;
  const archSpacing = bw / numArches;

  // Draw stone piers between arches (not a solid rect)
  noStroke();
  const pierW = 5;
  for (let i = 0; i <= numArches; i++) {
    const px = -bw/2 + i * archSpacing;
    fill(210, 8, 55);
    rect(px - pierW/2, -bh, pierW, bh);
    stroke(0,0,15); strokeWeight(1); noFill();
    rect(px - pierW/2, -bh, pierW, bh);
    noStroke();
  }

  // Arches — truly see-through (just the stone outline, no fill)
  for (let i = 0; i < numArches; i++) {
    const ax = -bw/2 + (i + 0.5) * archSpacing;
    const archW = archSpacing - pierW;
    // Stone arch outline only — opening is transparent
    stroke(210, 8, 48); strokeWeight(2); noFill();
    arc(ax, 0, archW, bh * 1.6, PI, TWO_PI);
    // Thinner inner highlight
    stroke(210, 6, 62, 140); strokeWeight(0.8);
    arc(ax, 0, archW - 3, bh * 1.4, PI, TWO_PI);
  }

  // Bridge deck on top
  noStroke();
  fill(210, 7, 62);
  rect(-bw/2, -bh - 4, bw, 5);
  stroke(0,0,15); strokeWeight(1.4); noFill();
  rect(-bw/2, -bh - 4, bw, 5);

  // X-brace metal railing
  stroke(0,0,20); strokeWeight(1);
  line(-bw/2, -bh - 4,  bw/2, -bh - 4);
  line(-bw/2, -bh - 12, bw/2, -bh - 12);
  const posts = 12;
  for (let i = 0; i <= posts; i++) {
    const px = -bw/2 + i * bw/posts;
    line(px, -bh - 4, px, -bh - 12);
  }
  for (let i = 0; i < posts; i++) {
    const x1 = -bw/2 + i * bw/posts;
    const x2 = x1 + bw/posts;
    line(x1, -bh - 4,  x2, -bh - 12);
    line(x1, -bh - 12, x2, -bh - 4);
  }

  // Foliage at base
  noStroke();
  fill(115, 40, 35, 180);
  ellipse(-bw/2 - 8, -3, 26, 12);
  ellipse(bw/2 + 8,  -3, 22, 10);

  pop();
}

// Draw a residential house with gabled roof, chimney, and windows
function _naiveHouse(x, y, s, hue, sat, lig, sc=1) {
  push();
  translate(x, y);
  scale(sc, sc);
  const w = 34 * s, h = 28 * s;

  // Body
  noStroke();
  fill(hue, sat, lig);
  rect(-w/2, -h, w, h);
  stroke(0,0,15); strokeWeight(1.4); noFill();
  rect(-w/2, -h, w, h);

  // Gabled roof
  noStroke();
  fill(hue, sat + 8, lig - 20);
  triangle(-w/2 - 2, -h, w/2 + 2, -h, 0, -h - 18*s);
  stroke(0,0,15); strokeWeight(1.4); noFill();
  triangle(-w/2 - 2, -h, w/2 + 2, -h, 0, -h - 18*s);

  // Chimney
  noStroke();
  fill(10, 50, 38);
  rect(5*s, -h - 14*s, 5*s, 14*s);
  stroke(0,0,15); strokeWeight(1.2); noFill();
  rect(5*s, -h - 14*s, 5*s, 14*s);

  // Chimney smoke
  _naiveSmoke(7*s, -h - 14*s);

  // Windows
  _naiveWindow(-w/2 + 3*s, -h + 5*s, 8*s, 8*s);
  _naiveWindow(w/2 - 11*s, -h + 5*s, 8*s, 8*s);

  // Door
  noStroke();
  fill(hue, sat + 15, lig - 30);
  rect(-3*s, -h + 12*s, 6*s, h - 12*s, 1, 1, 0, 0);
  stroke(0,0,15); strokeWeight(1.2); noFill();
  rect(-3*s, -h + 12*s, 6*s, h - 12*s, 1, 1, 0, 0);

  pop();
}

// ── Vehicle & pedestrian animation ───────────────────

// Update positions and draw cars/buses on a road, wrapping at screen edges
function _updateDrawBgCars(carArr, roadY, sc=1) {
  for (let car of carArr) {
    car.x += car.speed * car.dir;
    if (car.dir > 0 && car.x > width + 50) car.x = -50;
    if (car.dir < 0 && car.x < -50)        car.x = width + 50;

    push();
    translate(car.x, roadY);
    scale(sc * car.dir, sc);

    if (car.bus) {
      // Bus body
      noStroke();
      fill(car.hue, car.sat, car.lig);
      rect(-18, -10, 36, 10, 1);
      rect(-16, -17, 32, 8, 1, 1, 0, 0);
      stroke(0,0,15); strokeWeight(1.2); noFill();
      rect(-18, -10, 36, 10, 1);
      rect(-16, -17, 32, 8, 1, 1, 0, 0);
      // Row of windows
      noStroke();
      fill(200, 40, 68, 185);
      for (let i = 0; i < 5; i++) rect(-14 + i*6, -16, 4, 5, 1);
      // Wheels
      noStroke(); fill(0, 0, 18);
      ellipse(-12, 2, 7, 7); ellipse(12, 2, 7, 7);
      stroke(0,0,15); strokeWeight(0.8); noFill();
      ellipse(-12, 2, 7, 7); ellipse(12, 2, 7, 7);
    } else {
      // Car body
      noStroke();
      fill(car.hue, car.sat, car.lig);
      rect(-12, -8, 24, 8, 1);
      rect(-7, -14, 16, 7, 2, 2, 0, 0);
      stroke(0,0,15); strokeWeight(1.2); noFill();
      rect(-12, -8, 24, 8, 1);
      rect(-7, -14, 16, 7, 2, 2, 0, 0);
      // Windows
      noStroke(); fill(200, 40, 68, 185);
      rect(-5, -13, 5, 5, 1); rect(2, -13, 5, 5, 1);
      stroke(0,0,15); strokeWeight(0.8); noFill();
      rect(-5, -13, 5, 5, 1); rect(2, -13, 5, 5, 1);
      // Wheels
      noStroke(); fill(0, 0, 18);
      ellipse(-7, 2, 7, 7); ellipse(7, 2, 7, 7);
      stroke(0,0,15); strokeWeight(0.8); noFill();
      ellipse(-7, 2, 7, 7); ellipse(7, 2, 7, 7);
      // Headlight
      noStroke(); fill(55, 85, 92, 220);
      ellipse(11, -4, 4, 3);
    }
    pop();
  }
}

// Update positions and draw walking pedestrians with leg-swing animation
function _updateDrawBgWalkers(walkerArr, walkY, sc=1) {
  for (let w of walkerArr) {
    w.x += w.speed * w.dir;
    w.phase += 0.12;
    if (w.dir > 0 && w.x > width + 20) w.x = -20;
    if (w.dir < 0 && w.x < -20)        w.x = width + 20;

    push();
    translate(w.x, walkY);
    scale(sc * w.dir, sc);
    const sw = sin(w.phase) * 3;
    // Legs
    stroke(0,0,18); strokeWeight(2); noFill();
    line(-1, -6, -1 + sw, 2);
    line( 1, -6,  1 - sw, 2);
    // Body
    noStroke();
    fill(w.hue, 58, 55);
    ellipse(0, -11, 7, 10);
    stroke(0,0,15); strokeWeight(1.0); noFill();
    ellipse(0, -11, 7, 10);
    // Head
    noStroke();
    fill(25, 42, 70);
    ellipse(0, -17, 6, 6);
    stroke(0,0,15); strokeWeight(1.0); noFill();
    ellipse(0, -17, 6, 6);
    pop();
  }
}

// Update positions and draw cyclists with pedalling animation on the rail trail
function _updateDrawBgBikers(bikerArr, trailY, sc=1) {
  for (let b of bikerArr) {
    b.x += b.speed * b.dir;
    b.phase += 0.16;
    if (b.dir > 0 && b.x > width + 30) b.x = -30;
    if (b.dir < 0 && b.x < -30)        b.x = width + 30;

    push();
    translate(b.x, trailY);
    scale(sc * b.dir, sc);

    // Wheels
    stroke(0, 0, 25); strokeWeight(1); noFill();
    ellipse(-6, 3, 7, 7);
    ellipse(6,  3, 7, 7);
    // Frame
    strokeWeight(0.8);
    line(-6, 3, 0, -3);
    line(0, -3, 6, 3);
    line(0, -3, -3, 3);
    // Handlebars
    line(5, 1, 7, -2);
    // Seat
    noStroke(); fill(0, 0, 22);
    ellipse(-2, -4, 4, 2);

    // Rider body
    noStroke();
    fill(b.hue, 55, 52);
    ellipse(-1, -10, 6, 8);
    stroke(0,0,15); strokeWeight(0.8); noFill();
    ellipse(-1, -10, 6, 8);
    // Head + helmet
    noStroke();
    fill(25, 38, 68);
    ellipse(-1, -15, 5, 5);
    fill(b.hue, 40, 40);
    arc(-1, -15.5, 5, 4, PI, TWO_PI);

    // Pedalling legs
    const lsw = sin(b.phase) * 2.5;
    stroke(0, 0, 18); strokeWeight(1.2); noFill();
    line(-2, -6, -2 + lsw, 2);
    line( 0, -6,  0 - lsw, 2);

    pop();
  }
}
