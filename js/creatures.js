// ── Creatures ───────────────────────────────────────
// ── Creatures ─────────────────────────────────────────

class Butterfly {
  constructor() {
    this.reset();
    this.y  = random(20, splitY() - 30);

  }
  reset() {
    this.x = random(-40, width + 40);
this.y  = random(20, splitY() - 30);
    this.tx = random(20, width - 20);
this.ty = random(20, splitY() - 30);
    this.speed = random(0.004, 0.009);
    this.prog = 0;
    this.hue = random(360);
    this.size = random(0.7, 1.2);
    this.wingPhase = random(TWO_PI);
  }
  update() {
    this.prog += this.speed;
    this.tx += windX * 0.4;
    this.tx = constrain(this.tx, 20, width - 20);
    if (this.prog >= 1) this.reset();
    this.x = lerp(this.x, this.tx, this.speed * 4);
    this.y = lerp(this.y, this.ty, this.speed * 4) + sin(this.prog * PI) * -18;
  }
  draw() {
    push();
    translate(this.x, this.y);
    scale(this.size);
    const wFlap = sin(t * 0.22 + this.wingPhase) * 0.7 + 0.75;
    noStroke();
    push(); scale(-1, 1);
    fill(this.hue, 72, 65, 200);
    beginShape(); vertex(0,0); bezierVertex(wFlap*14,-10,wFlap*18,-2,wFlap*10,6); bezierVertex(wFlap*4,10,0,4,0,0); endShape(CLOSE);
    fill(this.hue+20, 68, 58, 180);
    beginShape(); vertex(0,2); bezierVertex(wFlap*10,4,wFlap*14,12,wFlap*6,16); bezierVertex(wFlap*2,18,0,10,0,2); endShape(CLOSE);
    pop();
    fill(this.hue, 72, 65, 200);
    beginShape(); vertex(0,0); bezierVertex(wFlap*14,-10,wFlap*18,-2,wFlap*10,6); bezierVertex(wFlap*4,10,0,4,0,0); endShape(CLOSE);
    fill(this.hue+20, 68, 58, 180);
    beginShape(); vertex(0,2); bezierVertex(wFlap*10,4,wFlap*14,12,wFlap*6,16); bezierVertex(wFlap*2,18,0,10,0,2); endShape(CLOSE);
    fill(30, 40, 18, 230); ellipse(0, 4, 3, 14);
    stroke(30, 35, 20, 200); strokeWeight(0.8);
    line(0,-2,-5,-10); line(0,-2,5,-10);
    noStroke(); fill(this.hue, 60, 60, 220);
    ellipse(-5,-10,3,3); ellipse(5,-10,3,3);
    pop();
  }
}

class Bee {
  constructor() {
    this.reset();
this.y  = random(20, splitY() - 20);
  }
  reset() {
    this.x = random(width);
this.y  = random(20, splitY() - 20);
    this.tx = random(20, width - 20);
this.ty = random(20, splitY() - 20);
    this.speed = random(0.012, 0.022);
    this.prog = 0;
    this.wingPhase = random(TWO_PI);
    this.wobble = random(TWO_PI);
  }
  update() {
    this.prog += this.speed;
    this.tx += windX * 0.25;
    this.tx = constrain(this.tx, 20, width - 20);
    if (this.prog >= 1) this.reset();
    this.x = lerp(this.x, this.tx, this.speed * 3);
    this.y = lerp(this.y, this.ty, this.speed * 3) + sin(t * 0.18 + this.wobble) * 2;
  }
  draw() {
    push();
    translate(this.x, this.y);
    const wFlap = abs(sin(t * 0.45 + this.wingPhase)) * 0.8 + 0.2;
    noStroke();
    fill(0, 0, 100, 160);
    ellipse(-5*wFlap, -4, 10*wFlap, 6); ellipse(5*wFlap, -4, 10*wFlap, 6);
    const stripes = [[42,90,62],[30,10,12],[42,90,62],[30,10,12]];
    for (let i = 0; i < 4; i++) { fill(stripes[i][0],stripes[i][1],stripes[i][2],230); ellipse(0,i*3-4,9-i*0.5,4); }
    fill(30, 15, 18, 200); ellipse(0, 8, 3, 4);
    fill(0, 0, 10, 240); ellipse(-2,-6,2,2); ellipse(2,-6,2,2);
    pop();
  }
}


class Bird {
  constructor() {
    this.done = false;
    this.fromLeft = random() < 0.5;
    this.x = this.fromLeft ? -30 : width + 30;
    this.y = random(gndHorizon() * 0.15, gndHorizon() * 0.85);
    this.speed = random(1.8, 3.5);
    this.dir = this.fromLeft ? 1 : -1;
    this.wingPhase = random(TWO_PI);
    this.state = 'fly';
    this.landTimer = 0;
    this.landX = 0;
    this.landY = 0;
    this.landWy = 0;
    this.willLand = random() < 0.4;
    this.landTriggered = false;
    this.flapSpeed = random(0.18, 0.28);
    this.size = random(0.7, 1.2);
    // flocking — slight vertical drift
    this.yDrift = random(-0.4, 0.4);
  }

  update() {
    if (this.state === 'fly') {
      this.x += this.speed * this.dir;
      this.y += this.yDrift;
      this.y = constrain(this.y, 10, gndHorizon() * 0.9);
      this.wingPhase += this.flapSpeed;

      // trigger landing when roughly halfway across
      if (this.willLand && !this.landTriggered && abs(this.x - width/2) < 80) {
        this.landTriggered = true;
        // pick a world position to land on
        this.landWy = random(0.1, 0.7);
        const { sx, sy } = worldToScreen(random(0.1, 0.9), this.landWy);
        this.landX = sx;
        this.landY = sy;
        this.state = 'descend';
      }

      // exit screen
      if (this.x < -60 || this.x > width + 60) this.done = true;

    } else if (this.state === 'descend') {
      this.x = lerp(this.x, this.landX, 0.04);
      this.y = lerp(this.y, this.landY - 8, 0.04);
      this.wingPhase += this.flapSpeed * 0.5;
      if (dist(this.x, this.y, this.landX, this.landY - 8) < 4) {
        this.state = 'landed';
        this.landTimer = floor(random(120, 360));
      }

    } else if (this.state === 'landed') {
      this.landTimer--;
      // occasional hop
      if (frameCount % 45 === 0 && random() < 0.3) {
        this.landX += random(-15, 15);
        this.landX = constrain(this.landX, 20, width - 20);
      }
      if (this.landTimer <= 0) {
        this.state = 'takeoff';
        this.wingPhase = 0;
      }

    } else if (this.state === 'takeoff') {
      this.y -= 2.5;
      this.x += this.speed * this.dir;
      this.wingPhase += this.flapSpeed * 1.4;  // fast flap on takeoff
      if (this.y < gndHorizon() * 0.3) {
        this.state = 'fly';
        this.willLand = false;  // don't land again
      }
      if (this.x < -60 || this.x > width + 60) this.done = true;
    }
  }

  draw() {
    const landed  = this.state === 'landed';
    const takeoff = this.state === 'takeoff';
    const descend = this.state === 'descend';

    push();
    if (landed) {
      translate(this.landX, this.landY);
    } else {
      translate(this.x, this.y);
    }
    scale(this.size * this.dir, this.size);

    if (landed) {
      // perched — compact body, wings folded, tail down
      noStroke();
      fill(30, 15, 18);           // dark body
      ellipse(0, 0, 10, 6);       // body
      ellipse(6, -1, 6, 5);       // head
      fill(28, 30, 25);
      triangle(-6, 0, -12, 3, -6, 3);  // tail
      // beak
      fill(38, 70, 55);
      triangle(9, -1, 13, -1, 9, 1);
      // eye
      noStroke();
      fill(0, 0, 92);
      ellipse(7, -2, 2, 2);
      // feet
      stroke(38, 70, 45);
      strokeWeight(0.8);
      line(0, 3, -2, 7);
      line(2, 3, 4, 7);
      line(-2, 7, -5, 7); line(-2, 7, -1, 9); line(-2, 7, 1, 7);
      line(4, 7, 1, 7);   line(4, 7, 5, 9);   line(4, 7, 7, 7);

    } else {
      // flying — wings up/down with sine
      const flap = sin(this.wingPhase);
      const wingUp = flap * (takeoff ? 18 : 12);

      noStroke();
      fill(30, 15, 18);

      // body
      ellipse(0, 0, 12, 5);
      // head
      ellipse(7, -1, 6, 5);
      // tail
      fill(28, 25, 22);
      triangle(-6, 0, -14, wingUp * 0.2 + 2, -6, 2);

      // wings — two bezier shapes
      fill(35, 18, 28, 220);
      // left wing (back)
      beginShape();
      vertex(-2, 0);
      bezierVertex(-6, wingUp - 4, -18, wingUp - 2, -16, wingUp + 3);
      bezierVertex(-10, wingUp + 6, -2, 2, -2, 0);
      endShape(CLOSE);
      // right wing (front, slightly lighter)
      fill(32, 15, 32, 220);
      beginShape();
      vertex(2, 0);
      bezierVertex(6, wingUp - 4, 18, wingUp - 2, 16, wingUp + 3);
      bezierVertex(10, wingUp + 6, 2, 2, 2, 0);
      endShape(CLOSE);

      // beak
      noStroke();
      fill(38, 70, 55);
      triangle(10, -2, 15, -1, 10, 0);
      // eye
      fill(0, 0, 88);
      ellipse(8, -2, 2, 2);
    }

    pop();
  }
}
