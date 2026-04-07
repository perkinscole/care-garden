// ── Flowers ───────────────────────────────────────────

class Flower {
  constructor(wx, wy, hsl, imgs = []) {
    this.wx    = wx;
    this.wy    = wy;
    this.hsl   = hsl;
    this.imgs  = imgs;
    this.type  = FLOWER_TYPES[floor(random(FLOWER_TYPES.length))];
    const [lo, hi] = this.type.sizeRange;
    const depthFactor = lerp(1.6, 0.45, this.wy); // back tall, front short
    this.size       = 0.0;
    this.targetSize = (lo + random(hi - lo)) * depthFactor;
    this.restSize   = this.targetSize;
    this.maxAllowed = this.targetSize * 1.5;
    this.phase      = random(TWO_PI);
    this.dirtAlpha  = 255;
  }
 boost() {
  const maxSize = this.type.sizeRange[1] * 1.3;
  this.targetSize = min(this.targetSize + 0.05, maxSize);
   if (this.targetSize < this.maxAllowed) {
      this.targetSize += 0.05;
    }
}
  update() {
    this.size = lerp(this.size, this.targetSize, 0.05 + rainBoost);
  const maxSize = this.type.sizeRange[1] * 1.4;
  if (this.targetSize > this.restSize) {
    this.restSize = min(this.targetSize, maxSize);
  }
  this.size = max(this.size, 0.02);
  this.targetSize = max(this.targetSize, 0.02);
  this.restSize   = max(this.restSize,   0.02);
  if (this.dirtAlpha > 0) this.dirtAlpha -= 1.5;
  }
  dispose() {
    for (let img of this.imgs) img.remove();
    this.imgs = [];
  }
  draw(){
    this.update();
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    const ds = depthScale(this.wy);
    if (this.imgs.length > 1) {
      drawGroupFlower(sx, sy, this.hsl, this.size * ds, this.type, this.phase, this.imgs);
    } else {
      drawFlower(sx, sy, this.hsl, this.size * ds, this.type, this.phase,
                 this.imgs.length === 1 ? this.imgs[0] : null);
    }
    // Dirt mound in front of stem, fades out after planting
    if (this.dirtAlpha > 0) drawDirtMound(sx, sy, this.dirtAlpha);
  }
}

function drawStem(type, phase) {
  const sw   = type.stemStyle === 'thick' ? 5 : type.stemStyle === 'wispy' ? 1.8 : 3.2;
  const amp  = type.stemStyle === 'droop' ? 10 : type.stemStyle === 'wispy' ? 6 : type.stemStyle === 'straight' ? 2 : 3;
  const freq = type.stemStyle === 'wispy' ? 0.28 : 0.18;
  push();
  strokeWeight(sw);
  stroke(100, 55, 38);
  noFill();
  beginShape();
  for (let i = 0; i <= 40; i++) {
    const sy = map(i, 0, 40, 0, 110);
    let sx = sin(i * freq + t * 0.04 + phase) * (amp * 0.5) + windX * i * 0.15;
    if (type.stemStyle === 'droop') sx += map(i, 0, 40, 0, 8);
    curveVertex(sx, sy);
  }
  endShape();
  if (type.stemStyle === 'thorny') {
    for (let ti = 1; ti <= 2; ti++) {
      push();
      translate(0, 40 * ti);
      stroke(80, 40, 30);
      strokeWeight(1.2);
      line(0, 0,  6, -5);
      line(0, 0, -5, -4);
      pop();
    }
  }
  pop();
}

function drawLeaves(type, phase) {
  push();
  noStroke();
  push();
  translate(sin(t * 0.08 + phase) * 2 + 9, type.stemStyle === 'droop' ? 55 : 62);
  rotate(0.4 + sin(t * 0.06 + phase) * 0.05);
  fill(112, 52, 36, 210);
  if (type.name === 'lily' || type.name === 'tulip') {
    beginShape(); vertex(0,0); bezierVertex(6,-18,10,-40,4,-52); bezierVertex(-2,-40,-4,-18,0,0); endShape(CLOSE);
  } else {
    beginShape(); vertex(0,0); bezierVertex(18,-12,30,-5,24,8); bezierVertex(18,18,4,14,0,0); endShape(CLOSE);
  }
  pop();
  push();
  translate(-sin(t * 0.08 + phase) * 2 - 7, type.stemStyle === 'droop' ? 72 : 80);
  rotate(-0.45 - sin(t * 0.06 + phase) * 0.05);
  fill(118, 45, 30, 190);
  if (type.name === 'lily' || type.name === 'tulip') {
    beginShape(); vertex(0,0); bezierVertex(-6,-16,-9,-36,-3,-48); bezierVertex(2,-36,3,-16,0,0); endShape(CLOSE);
  } else {
    beginShape(); vertex(0,0); bezierVertex(-16,-10,-26,-3,-20,8); bezierVertex(-14,16,-3,12,0,0); endShape(CLOSE);
  }
  pop();
  pop();
}

function drawPetal(shape, len, w, h, s, l, alpha, dark) {
  const col = dark ? color(h, s-8, l-12, alpha) : color(h + sin(w)*15, s, l, alpha);
  fill(col);
  noStroke();
  beginShape();
  if      (shape === 'narrow')   { vertex(0,0); bezierVertex(-w*.4,-len*.3,-w*.3,-len*.75,0,-len);     bezierVertex(w*.3,-len*.75,w*.4,-len*.3,0,0); }
  else if (shape === 'round')    { vertex(0,0); bezierVertex(-w*.7,-len*.2,-w*.7,-len*.8,0,-len);      bezierVertex(w*.7,-len*.8,w*.7,-len*.2,0,0); }
  else if (shape === 'pointed')  { vertex(0,0); bezierVertex(-w*.5,-len*.25,-w*.4,-len*.7,0,-len);     bezierVertex(w*.4,-len*.7,w*.5,-len*.25,0,0); }
  else if (shape === 'cup')      { vertex(0,0); bezierVertex(-w*.9,-len*.1,-w*.9,-len*.6,-w*.3,-len);  bezierVertex(w*.3,-len*1.05,w*.9,-len*.6,0,0); }
  else if (shape === 'notched')  { vertex(0,0); bezierVertex(-w*.6,-len*.2,-w*.6,-len*.7,-w*.15,-len); bezierVertex(0,-len*1.06,w*.15,-len,w*.6,-len*.7); bezierVertex(w*.6,-len*.2,0,0,0,0); }
  else if (shape === 'spiral')   { vertex(0,0); bezierVertex(-w*.8,-len*.15,-w*.6,-len*.65,-w*.1,-len); bezierVertex(w*.4,-len*.85,w*.7,-len*.4,0,0); }
  else if (shape === 'reflexed') { vertex(0,0); bezierVertex(-w*.5,-len*.2,-w*.8,-len*.5,-w*.2,-len);  bezierVertex(w*.2,-len*1.1,w*.8,-len*.5,0,0); }
  else                           { vertex(0,0); bezierVertex(-w*.6,-len*.25,-w*.6,-len*.75,0,-len);    bezierVertex(w*.6,-len*.75,w*.6,-len*.25,0,0); }
  endShape(CLOSE);
}

function drawDisc(discSize, h, s, l) {
  if (discSize === 0) return;
  push();
  noStroke();
  fill(25, 45, 14, 220);
  ellipse(0, 0, discSize, discSize);
  const rings = discSize > 28 ? 3 : 2;
  for (let r = 1; r <= rings; r++) {
    const rr = r * (discSize * 0.13);
    for (let a = 0; a < TWO_PI; a += TWO_PI / (r * 6)) {
      fill(28, 38, 22, 200);
      ellipse(cos(a)*rr, sin(a)*rr, 3, 3);
    }
  }
  fill(42, 68, 30, 220); ellipse(0, 0, discSize*0.32, discSize*0.32);
  fill(50, 82, 44, 220); ellipse(0, 0, discSize*0.14, discSize*0.14);
  pop();
}

// ── Flower head (petals + disc + face) ──────────────

function drawFlowerHead(h, s, l, type, phase, img) {
  const { petalCount, petalShape, discSize } = type;
  // Shrink petals when a face is present so the photo stands out
  const ps = img ? 0.6 : 1.0;
  const petalLen   = type.petalLen * ps;
  const petalWidth = type.petalWidth * ps;

  // Back petal layer
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * TWO_PI + t * 0.0016 + PI / petalCount;
    const sway  = sin(t * 0.14 + i * 1.2 + phase) * 0.04;
    push(); rotate(angle + sway); translate(0, -(discSize*0.5+4));
    drawPetal(petalShape, petalLen*0.88, petalWidth, h, s, l, 195, true);
    pop();
  }
  // Front petal layer
  for (let i = 0; i < petalCount; i++) {
    const angle   = (i / petalCount) * TWO_PI + t * 0.0016;
    const sway    = sin(t * 0.18 + i * 0.8 + phase) * 0.05;
    const stretch = 1 + sin(t * 0.12 + i + phase) * 0.03;
    push(); rotate(angle + sway); translate(0, -(discSize*0.5+2)); scale(stretch, stretch);
    drawPetal(petalShape, petalLen, petalWidth, h, s, l, 228, false);
    pop();
  }
  // Vein lines
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * TWO_PI + t * 0.0016;
    const sway  = sin(t * 0.18 + i * 0.8 + phase) * 0.05;
    push(); rotate(angle + sway); translate(0, -(discSize*0.5+2));
    strokeWeight(0.6);
    stroke(h, max(s-10, 0), min(l+20, 100), 170);
    noFill();
    beginShape(); vertex(0,-1); bezierVertex(-1,-petalLen*.35,-1,-petalLen*.72,0,-petalLen*.92); endShape();
    pop();
  }

  drawDisc(discSize, h, s, l);

  // Pollen dots
  if (discSize > 0) {
    push(); noStroke();
    for (let i = 0; i < 6; i++) {
      const pa = (i/6) * TWO_PI + t * 0.004 + phase;
      const pr = discSize * 0.62 + sin(t*0.3 + i*1.7 + phase) * 2.5;
      fill(52, 88, 62, 200);
      ellipse(cos(pa)*pr, sin(pa)*pr, 2.8, 2.8);
    }
    pop();
  }

  // Face image clipped to disc
  if (img) {
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.arc(0, 0, discSize * 0.58, 0, Math.PI * 2);
    drawingContext.clip();
    imageMode(CENTER);
    image(img, 0, 0, discSize * 1.16, discSize * 1.16);
    drawingContext.restore();
    pop();
  }
}

// ── Single flower (stem + leaves + head) ────────────

function drawDirtMound(x, y, alpha) {
  push();
  translate(x, y);
  noStroke();
  fill(28, 35, 18, alpha);
  ellipse(0, 0, 18, 7);
  fill(32, 30, 24, alpha);
  ellipse(0, -1, 14, 5);
  fill(36, 25, 30, alpha * 0.6);
  ellipse(-2, -2, 6, 3);
  pop();
}

function drawFlower(x, y, hsl, size = 1.0, type, phase = 0, img = null) {
  if (!type) type = FLOWER_TYPES[0];
  const [h, s, l] = hsl;
  push();
  translate(x, y);
  scale(size);
  translate(0, -110);

  drawStem(type, phase);
  drawLeaves(type, phase);
  drawFlowerHead(h, s, l, type, phase, img);

  pop();
}

// ── Group flower (branching stem + multiple heads) ──

function drawGroupFlower(x, y, hsl, size, type, phase, imgs) {
  if (!type) type = FLOWER_TYPES[0];
  const [h, s, l] = hsl;
  const n = imgs.length; // 2 or 3

  push();
  translate(x, y);
  scale(size);
  translate(0, -110);

  const sw = type.stemStyle === 'thick' ? 5 : type.stemStyle === 'wispy' ? 1.8 : 3.2;
  const freq = type.stemStyle === 'wispy' ? 0.28 : 0.18;
  const amp  = type.stemStyle === 'droop' ? 10 : type.stemStyle === 'wispy' ? 6 : type.stemStyle === 'straight' ? 2 : 3;

  // Each branch splits off at a different height along the stem
  // Staggered fork points and angles so it looks like a natural stalk
  const branches = n === 2
    ? [
        { forkY: 55, angle: -0.7, len: 55, sc: 0.55 },  // lower left
        { forkY: 15, angle:  0.5, len: 45, sc: 0.6  },  // upper right
      ]
    : [
        { forkY: 70, angle: -0.75, len: 55, sc: 0.5  }, // lowest left
        { forkY: 40, angle:  0.65, len: 50, sc: 0.55 }, // middle right
        { forkY: 10, angle: -0.35, len: 40, sc: 0.6  }, // top left
      ];

  // Helper: get stem x at a given y
  function stemX(sy) {
    const i = (sy / 110) * 40;
    let sx = sin(i * freq + t * 0.04 + phase) * (amp * 0.5) + windX * i * 0.15;
    if (type.stemStyle === 'droop') sx += map(i, 0, 40, 0, 8);
    return sx;
  }

  // Draw main stem — full length
  push();
  strokeWeight(sw);
  stroke(100, 55, 38);
  noFill();
  beginShape();
  for (let i = 0; i <= 40; i++) {
    const sy = map(i, 0, 40, 0, 110);
    curveVertex(stemX(sy), sy);
  }
  endShape();
  pop();

  // Leaves on main stem
  drawLeaves(type, phase);

  // Draw each branch from its own fork point
  for (let b = 0; b < n; b++) {
    const br = branches[b];
    const branchPhase = phase + b * 2.1;
    const baseX = stemX(br.forkY);

    push();
    translate(baseX, br.forkY);

    // Sub-stem curving outward
    const sway = sin(t * 0.06 + branchPhase) * 0.03;
    rotate(br.angle + sway);
    push();
    strokeWeight(sw * 0.65);
    stroke(100, 55, 38);
    noFill();
    beginShape();
    for (let j = 0; j <= 20; j++) {
      const by = -j * (br.len / 20);
      const bx = sin(j * 0.25 + t * 0.04 + branchPhase) * 2.5;
      curveVertex(bx, by);
    }
    endShape();
    pop();

    // Flower head at end of branch
    translate(0, -br.len);
    scale(br.sc);
    drawFlowerHead(h, s, l, type, branchPhase, imgs[b]);
    pop();
  }

  pop();
}
