// ── Face Detection ───────────────────────────────────

function faceReady() {
  faceapi.detect(gotFaces);
}

function gotFaces(error, result) {
  if (error) { console.log(error); return; }
  detections = result;
  h = false;

  for (let key in faceSmileData) {
    faceSmileData[key].seen = false;
  }

  for (let i = 0; i < detections.length; i++) {
    const box = detections[i].alignedRect._box;
    const cx  = round((box._x + box._width  / 2) / 80) * 80;
    const cy  = round((box._y + box._height / 2) / 80) * 80;
    const key = cx + '_' + cy;

    if (!faceSmileData[key]) {
      // Inherit decoration from nearest existing face (same person shifted slightly)
      let inheritedDeco = -1;
      let bestDist = Infinity;
      for (let oldKey in faceSmileData) {
        const parts = oldKey.split('_');
        const ox = parseInt(parts[0]), oy = parseInt(parts[1]);
        const d = Math.abs(ox - cx) + Math.abs(oy - cy);
        if (d < 200 && d < bestDist) {
          bestDist = d;
          inheritedDeco = faceSmileData[oldKey].decoration;
        }
      }
      const deco = inheritedDeco >= 0 ? inheritedDeco : Math.floor(Math.random() * 5);
      faceSmileData[key] = { frames: 0, seen: true, snapped: false, decoration: deco };
    } else {
      faceSmileData[key].seen = true;
    }

    const happy = detections[i].expressions.happy * 100 > 75;
    if (happy) {
      faceSmileData[key].frames++;
    } else {
      faceSmileData[key].frames  = 0;
      faceSmileData[key].snapped = false;
    }

    detections[i]._smileKey = key;
    if (happy) h = true;
  }

  for (let key in faceSmileData) {
    if (!faceSmileData[key].seen) delete faceSmileData[key];
  }

  faceapi.detect(gotFaces);
}

function drawBoxes(detections) {
  if (detections.length === 0 || !videoW || !videoH) return;

  const destH       = height - splitY();
  const videoAspect = videoW / videoH;
  const screenAspect = width / destH;

  let displayW, displayH;
  if (videoAspect > screenAspect) {
    displayW = width;
    displayH = width / videoAspect;
  } else {
    displayH = destH;
    displayW = destH * videoAspect;
  }

  const offsetX     = (width - displayW) / 2;
  const offsetY     = (destH - displayH) / 2;
  const scaleFactor = displayW / videoW;

  for (let f = 0; f < detections.length; f++) {
    let { _x, _y, _width, _height } = detections[f].alignedRect._box;
    const x = (width - offsetX) - (_x + _width) * scaleFactor;
    const y = splitY() + offsetY + (_y * scaleFactor);
    const w = _width  * scaleFactor;
    const h = _height * scaleFactor;

    if (detections[f].expressions.happy > 0.75) {
      stroke(120, 100, 50);
    } else {
      stroke(220, 100, 50);
    }
    strokeWeight(3);
    noFill();
    rect(x, y, w, h);
  }
}

function drawCountdown() {
  if (!videoW || !videoH || videoDisplayW === 0) return;

  const scaleFactor = videoDisplayW / videoW;

  for (let i = 0; i < detections.length; i++) {
    const key = detections[i]._smileKey;
    if (!key || !faceSmileData[key]) continue;
    const frames = faceSmileData[key].frames;
    if (frames <= 0 || faceSmileData[key].snapped) continue;

    const progress    = min(frames / SMILE_HOLD_REQUIRED, 1.0);
    const secondsLeft = ceil((SMILE_HOLD_REQUIRED - frames));
    const box         = detections[i].alignedRect._box;

    const faceCX = (width - videoOffsetX) - (box._x + box._width / 2) * scaleFactor;
    const faceTY = splitY() + videoOffsetY + box._y * scaleFactor;
    const r = 14;

    push();
    noStroke(); fill(0, 0, 8, 180);
    ellipse(faceCX, faceTY, r * 2 + 8, r * 2 + 8);
    noFill(); stroke(55, 90, 65, 255); strokeWeight(3);
    arc(faceCX, faceTY, r * 2, r * 2, -HALF_PI, -HALF_PI + TWO_PI * progress);
    noStroke(); fill(0, 0, 96, 255);
    textAlign(CENTER, CENTER); textSize(13); textStyle(BOLD);
    text(frames >= SMILE_HOLD_REQUIRED ? '✓' : secondsLeft, faceCX, faceTY);
    pop();
  }
}

// ── Face Decorations ────────────────────────────────

function drawFaceDecorations(detections) {
  if (!decorationsEnabled) return;
  if (!hatTimeActive) return;
  if (!videoW || !videoH || videoDisplayW === 0) return;
  const scaleFactor = videoDisplayW / videoW;

  for (let i = 0; i < detections.length; i++) {
    const key = detections[i]._smileKey;
    if (!key || !faceSmileData[key]) continue;

    const box = detections[i].alignedRect._box;
    const rawCx = (width - videoOffsetX) - (box._x + box._width / 2) * scaleFactor;
    const rawTy = splitY() + videoOffsetY + box._y * scaleFactor;
    const rawFw = box._width * scaleFactor;

    // Smooth positions to reduce jitter
    const smooth = 0.25;
    if (!faceSmileData[key].smoothCx) {
      faceSmileData[key].smoothCx = rawCx;
      faceSmileData[key].smoothTy = rawTy;
      faceSmileData[key].smoothFw = rawFw;
    }
    faceSmileData[key].smoothCx += (rawCx - faceSmileData[key].smoothCx) * smooth;
    faceSmileData[key].smoothTy += (rawTy - faceSmileData[key].smoothTy) * smooth;
    faceSmileData[key].smoothFw += (rawFw - faceSmileData[key].smoothFw) * smooth;
    const cx = faceSmileData[key].smoothCx;
    const ty = faceSmileData[key].smoothTy;
    const fw = faceSmileData[key].smoothFw;

    // 50% chance to skip decoration this frame (performance)
    if (frameCount % 2 === 0 && i % 2 === 1) continue;

    let deco = faceSmileData[key].decoration;

    // Force hat images during hat time (rain or random)
    if (hatTimeActive && deco < 5 && hatImages.length > 0) {
      deco = 5 + (faceSmileData[key].decoration % hatImages.length);
    }

    const hatY = ty - fw * 0.25;  // shift all decorations up
    const bigFw = fw * 1.15;     // scale decorations wider
    if      (deco === 0) drawFlowerCrown(cx, hatY, bigFw);
    else if (deco === 1) drawRamHorns(cx, hatY, bigFw);
    else if (deco === 2) drawPartyHat(cx, hatY, bigFw);
    else if (deco === 3) drawStarCrown(cx, hatY, bigFw);
    else if (deco === 4) drawHeadButterfly(cx, hatY, bigFw);
    else if (deco >= 5 && hatImages.length > 0) {
      const hatIdx = (deco - 5) % hatImages.length;
      const hatScale = hatIdx === 3 ? 2.4 : 1.9;
      const isDark = hatIdx === 1;  // hat2 is dark, needs normal blend
      drawHatImage(cx, hatY, bigFw, hatImages[hatIdx], hatScale, isDark);
    }
  }
}

// Pre-processed hat images with backgrounds removed
let cleanHatImages = [];
let hatsProcessed = false;

function processHatImages() {
  if (hatsProcessed || hatImages.length === 0) return;
  // Check all images are loaded
  for (let img of hatImages) {
    if (!img || img.width === 0) return;
  }
  for (let idx = 0; idx < hatImages.length; idx++) {
    const src = hatImages[idx];
    const g = createGraphics(src.width, src.height);
    g.image(src, 0, 0);
    g.loadPixels();
    for (let i = 0; i < g.pixels.length; i += 4) {
      const r = g.pixels[i], gv = g.pixels[i+1], b = g.pixels[i+2];
      // Remove black backgrounds (hat1, hat2)
      if (r < 30 && gv < 30 && b < 30) {
        g.pixels[i+3] = 0;
      }
      // Remove green backgrounds (hat3, hat4, hat5)
      else if (gv > 80 && r < gv * 0.75 && b < gv * 0.75) {
        g.pixels[i+3] = 0;
      }
    }
    g.updatePixels();
    cleanHatImages[idx] = g;
  }
  hatsProcessed = true;
}

function drawHatImage(cx, ty, fw, img, sc, isDark) {
  if (!img) return;
  processHatImages();
  const idx = hatImages.indexOf(img);
  const cleanImg = (idx >= 0 && cleanHatImages[idx]) ? cleanHatImages[idx] : img;
  const hatW = fw * (sc || 1.6);
  const hatH = hatW * (img.height / img.width);
  push();
  imageMode(CENTER);
  image(cleanImg, cx, ty + hatH * 0.2, hatW, hatH);
  pop();
}

function drawFlowerCrown(cx, ty, fw) {
  const y = ty - fw * 0.05;
  const crownW = fw * 0.85;
  const crownH = fw * 0.45;
  const bandTop = y;
  const bandH = crownH * 0.35;
  push();
  noStroke();
  // Crown points — drawn first so band covers their base
  const points = 5;
  for (let i = 0; i < points; i++) {
    const px = cx - crownW / 2 + (i + 0.5) * (crownW / points);
    fill(42, 80, 55, 230);
    triangle(px - crownW / points * 0.4, bandTop,
             px + crownW / points * 0.4, bandTop,
             px, bandTop - crownH * 0.65);
    // Jewel on each point
    fill((i * 72) % 360, 80, 60, 240);
    ellipse(px, bandTop - crownH * 0.45, fw * 0.04, fw * 0.04);
  }
  // Gold crown band — covers triangle bases
  fill(42, 80, 55, 230);
  rect(cx - crownW / 2, bandTop, crownW, bandH, 2);
  // Bottom trim
  fill(42, 70, 45, 200);
  rect(cx - crownW / 2, bandTop + bandH, crownW, bandH * 0.2, 1);
  // Band detail line
  fill(42, 75, 48, 180);
  rect(cx - crownW / 2, bandTop + bandH * 0.4, crownW, bandH * 0.15);
  pop();
}

function drawRamHorns(cx, ty, fw) {
  const y = ty + fw * 0.1;
  const r = fw * 0.35;
  push();
  noFill();
  // Each horn spirals: starts at side of head, goes out and up, curls back around and down
  for (let side = -1; side <= 1; side += 2) {
    const hornCX = cx + side * fw * 0.55;
    const hornCY = y;
    for (let layer = 0; layer < 3; layer++) {
      const thick = fw * (0.075 - layer * 0.018);
      const shade = 48 + layer * 15;
      stroke(32, 38, shade, 230 - layer * 50);
      strokeWeight(thick);
      beginShape();
      // Spiral from bottom (~5 o'clock) up and around ~1.4 turns
      const steps = 30;
      const startA = side === -1 ? 0 : PI;
      const totalArc = PI * 2.6;
      for (let j = 0; j <= steps; j++) {
        const prog = j / steps;
        const a = startA + side * prog * totalArc;
        const spiral = r * (1 - prog * 0.55) - layer * 1.5;
        const px = hornCX + cos(a) * spiral;
        const py = hornCY + sin(a) * spiral;
        curveVertex(px, py);
        if (j === 0 || j === steps) curveVertex(px, py);
      }
      endShape();
    }
    // Ridges across the horn
    stroke(32, 25, 40, 100);
    strokeWeight(0.8);
    for (let rr = 1; rr <= 6; rr++) {
      const prog = rr / 7;
      const a = (side === -1 ? 0 : PI) + side * prog * PI * 2.6;
      const spiral = r * (1 - prog * 0.55);
      const px = hornCX + cos(a) * spiral;
      const py = hornCY + sin(a) * spiral;
      const perp = a + HALF_PI;
      line(px + cos(perp) * 3, py + sin(perp) * 3,
           px - cos(perp) * 3, py - sin(perp) * 3);
    }
  }
  pop();
}

function drawPartyHat(cx, ty, fw) {
  // Flower wreath hat — ring of flowers around the head
  const y = ty + fw * 0.05;
  const count = 9;
  const wrW = fw * 0.9;
  push();
  noStroke();
  // Vine band
  stroke(120, 55, 32, 200);
  strokeWeight(3.5);
  noFill();
  arc(cx, y, wrW, fw * 0.18, PI, TWO_PI);
  noStroke();
  // Leaves along the band
  fill(115, 50, 35, 200);
  for (let i = 0; i < count + 3; i++) {
    const a = PI + (i / (count + 2)) * PI;
    const lx = cx + cos(a) * wrW * 0.5;
    const ly = y + sin(a) * fw * 0.09;
    push();
    translate(lx, ly);
    rotate(a + HALF_PI);
    ellipse(0, 0, fw * 0.05, fw * 0.08);
    pop();
  }
  // Flowers
  for (let i = 0; i < count; i++) {
    const a = PI + ((i + 0.5) / count) * PI;
    const fx = cx + cos(a) * wrW * 0.5;
    const fy = y + sin(a) * fw * 0.09;
    const hue = [340, 45, 280, 20, 200, 120, 340, 45, 280][i];
    const sz = fw * 0.08;
    // Petals
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * TWO_PI;
      fill(hue, 70, 68, 220);
      ellipse(fx + cos(pa) * sz * 0.5, fy + sin(pa) * sz * 0.5, sz * 0.6, sz * 0.6);
    }
    // Center
    fill(45, 85, 65, 240);
    ellipse(fx, fy, sz * 0.45, sz * 0.45);
  }
  pop();
}

function drawStarCrown(cx, ty, fw) {
  const count = 7;
  const arcW = fw * 0.8;
  const arcH = fw * 0.35;
  const y = ty - fw * 0.02;
  push();
  noStroke();
  for (let i = 0; i < count; i++) {
    const a = PI + (i / (count - 1)) * PI;
    const sx = cx + cos(a) * arcW * 0.5;
    const sy = y + sin(a) * arcH;
    const sz = fw * (0.04 + (i % 2) * 0.02);
    const hue = (45 + i * 15) % 360;
    // Star glow
    fill(hue, 80, 75, 120);
    ellipse(sx, sy, sz * 3, sz * 3);
    // Star body
    fill(hue, 85, 80, 240);
    drawStar5(sx, sy, sz);
  }
  pop();
}

function drawStar5(x, y, r) {
  beginShape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TWO_PI - HALF_PI;
    const rad = i % 2 === 0 ? r : r * 0.4;
    vertex(x + cos(a) * rad, y + sin(a) * rad);
  }
  endShape(CLOSE);
}

function drawHeadButterfly(cx, ty, fw) {
  // Silver tiara/crown
  const y = ty + fw * 0.05;
  const crownW = fw * 0.75;
  const crownH = fw * 0.3;
  push();
  noStroke();
  // Silver band
  fill(220, 8, 78, 230);
  rect(cx - crownW / 2, y - crownH * 0.3, crownW, crownH * 0.4, 2);
  // Tiara arches
  const arches = 3;
  for (let i = 0; i < arches; i++) {
    const ax = cx - crownW * 0.3 + i * (crownW * 0.3);
    const ah = crownH * (i === 1 ? 1.0 : 0.7);
    fill(220, 10, 82, 220);
    beginShape();
    vertex(ax - crownW * 0.12, y - crownH * 0.3);
    bezierVertex(ax - crownW * 0.08, y - ah, ax + crownW * 0.08, y - ah,
                 ax + crownW * 0.12, y - crownH * 0.3);
    endShape(CLOSE);
    // Gem at top of each arch
    const gemHue = [0, 220, 120][i];
    fill(gemHue, 70, 60, 240);
    ellipse(ax, y - ah * 0.75, fw * 0.03, fw * 0.03);
  }
  // Sparkle accents
  fill(0, 0, 95, 200);
  for (let i = 0; i < 4; i++) {
    const sx = cx - crownW * 0.35 + i * (crownW * 0.25);
    ellipse(sx, y - crownH * 0.15, fw * 0.015, fw * 0.015);
  }
  pop();
}
