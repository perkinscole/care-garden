// ── Cat ─────────────────────────────────────────────
class Cat {
  constructor() {
    this.wx = random(0.1, 0.9);
    this.wy = random(0.2, 0.8);
    this.twx = random(0.1, 0.9);
    this.twy = random(0.2, 0.8);
    this.speed = 0.0012;
    this.walkPhase = 0;
    this.dir = 1;
    this.state = 'wander'; // wander | sit | stalk | pounce | miss | idle
    this.idleTimer = 0;
    this.target = null;    // creature being stalked
    this.pounceVX = 0;
    this.pounceVY = 0;
    this.tailPhase = random(TWO_PI);
    this.blinkTimer = floor(random(100, 250));
    this.blinking = false;
    this.speechTimer = floor(random(400, 800));
    this.furHue = random() < 0.33 ? 30 : random() < 0.5 ? 0 : 200;
    this.furL   = random(45, 78);
    this.sheltering = false;
    this.sleepTimer = 0;
this.zzPhase = 0;
  }

  findNearbyCreature() {
    for (let c of creatures) {
      if (!c.x || !c.y) continue;
      // convert creature screen pos to approximate world pos
      const { sx, sy } = worldToScreen(this.wx, this.wy);
      const dx = c.x - sx;
      const dy = c.y - sy;
      if (sqrt(dx*dx + dy*dy) < 180) return c;
    }
    return null;
  }

  update() {
    // blink
    this.blinkTimer--;
    if (this.blinkTimer <= 0) {
      this.blinking = !this.blinking;
      this.blinkTimer = this.blinking ? 5 : floor(random(100, 280));
    }

    // speech — suppress during stalk/pounce so hunting phrases stay contextual
    if (this.state !== 'stalk' && this.state !== 'pounce') {
      this.speechTimer--;
      if (this.speechTimer <= 0) {
        const catRef = this;
        const phrase = CAT_PHRASES[floor(random(CAT_PHRASES.length))];
        speechBubbles.push(new SpeechBubble(phrase, () => {
          const { sx, sy } = worldToScreen(catRef.wx, catRef.wy);
          const ds = depthScale(catRef.wy);
          return { x: sx, y: sy - 35 * ds };
        }));
        this.speechTimer = floor(random(400, 900));
      }
    }
    
    // check for rain — override everything and run for shelter
const isRaining = weatherState === 'rainy' || weatherState === 'stormy';

if (isRaining && !this.sheltering) {
  this.state = 'shelter';
  this.sheltering = true;
  // run to shelter near the school but below the sidewalk
  this.twx = 0.48 + random(-0.05, 0.05);
  this.twy = 0.18;
  // speech bubble
  const catRef = this;
  speechBubbles.push(new SpeechBubble('NOT THE RAIN!!', () => {
    const { sx, sy } = worldToScreen(catRef.wx, catRef.wy);
    const ds = depthScale(catRef.wy);
    return { x: sx, y: sy - 35 * ds };
  }));
}

if (!isRaining && this.sheltering) {
  this.sheltering = false;
  this.state = 'wander';
  this.twx = random(0.1, 0.9);
  this.twy = random(0.2, 0.8);
  const catRef = this;
  speechBubbles.push(new SpeechBubble('Finally...', () => {
    const { sx, sy } = worldToScreen(catRef.wx, catRef.wy);
    const ds = depthScale(catRef.wy);
    return { x: sx, y: sy - 35 * ds };
  }));
}

    if (this.state === 'wander') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);

      if (d < 0.025) {
        // chance to sit instead of keep wandering
        if (random() < 0.7) {          // 70% chance to sit instead of 40%
  this.state = 'sit';
  this.idleTimer = floor(random(300, 700));  // sit much longer
} else {
  this.state = 'idle';
  this.idleTimer = floor(random(60, 180));   // idle longer too
}
        this.twx = constrain(this.wx + random(-0.2, 0.2), 0.05, 0.95);
this.twy = constrain(this.wy + random(-0.15, 0.15), 0.1, 0.9);
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        this.dir = dx > 0 ? 1 : -1;
        this.walkPhase += 0.16;

        const sep = getSeparation(this.wx, this.wy, 'cat');
        this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
        this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);

        // spot a creature to stalk
        if (frameCount % 120 === 0 && random() < 0.2) {
          const prey = this.findNearbyCreature();
          if (prey) {
            this.target = prey;
            this.state = 'stalk';
          }
        }
      }

    } else if (this.state === 'stalk') {
      if (!this.target) { this.state = 'wander'; return; }

      // convert target screen pos to approx world movement
      const { sx, sy } = worldToScreen(this.wx, this.wy);
      const dx = this.target.x - sx;
      const dy = this.target.y - sy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;

      if (d < 55) {
        // close enough — POUNCE
        this.state = 'pounce';
        this.pounceVX = (dx / d) * 0.025;
        this.pounceVY = (dy / d) * 0.012;
        this.idleTimer = 25;
      } else {
        // creep slowly toward target
        this.wx += (dx / d) * this.speed * 2.0;
        this.wy += (dy / d) * this.speed * 1.2;
        this.walkPhase += 0.08; // slow creep
      }

      // give up if target flies too far away
      if (d > 350) {
        this.target = null;
        this.state = 'wander';
      }

    } else if (this.state === 'pounce') {
      this.wx += this.pounceVX;
      this.wy += this.pounceVY;
      this.walkPhase += 0.35;
      this.idleTimer--;
      if (this.idleTimer <= 0) {
        // missed! butterfly always escapes
        this.target = null;
        this.state = 'miss';
        this.idleTimer = 90;
        const catRef = this;
        speechBubbles.push(new SpeechBubble('Almost got it...', () => {
          const { sx, sy } = worldToScreen(catRef.wx, catRef.wy);
          const ds = depthScale(catRef.wy);
          return { x: sx, y: sy - 35 * ds };
        }));
      }

    } else if (this.state === 'miss') {
      // sit and lick paw
      this.idleTimer--;
      this.walkPhase = 0;
      if (this.idleTimer <= 0) {
        this.state = 'wander';
        this.twx = random(0.05, 0.95);
        this.twy = random(0.1, 0.9);
      }

    } else if (this.state === 'sit') {
      this.idleTimer--;
      this.walkPhase = 0;
       if (this.idleTimer < 200 && random() < 0.004) {
    this.state = 'sleep';
    this.sleepTimer = floor(random(400, 900));
  }
      if (this.idleTimer <= 0) this.state = 'wander';

    }  else if (this.state === 'shelter') {
  const dx = this.twx - this.wx;
  const dy = this.twy - this.wy;
  const d  = sqrt(dx*dx + dy*dy);
  this.dir = dx > 0 ? 1 : -1;
  if (d < 0.04) {
    // arrived — lie down and wait
    this.state = 'sheltering';
    this.walkPhase = 0;
  } else {
    // run fast toward school
    this.wx += (dx / d) * this.speed * 2.8;
    this.wy += (dy / d) * this.speed * 2.8;
    this.walkPhase += 0.35;
  }

}  else if (this.state === 'sleep') {
    this.sleepTimer--;
    this.walkPhase = 0;
    this.zzPhase += 0.03;
  if (this.sleepTimer <= 0) {
    this.state = 'sit';
    this.idleTimer = floor(random(60, 120));
  }else if (this.state === 'sheltering') {
  this.walkPhase = 0;
  // just wait — weather check at top will exit this when rain stops
}else if (this.state === 'idle') {
      this.idleTimer--;
      this.walkPhase = 0;
      if (this.idleTimer <= 0) {
        this.state = 'wander';
        this.twx = random(0.05, 0.95);
        this.twy = random(0.1, 0.9);
      }
    }

    this.tailPhase += 0.04;
    this.wx = constrain(this.wx, 0.02, 0.98);
    this.wy = constrain(this.wy, 0.04, 0.98);
  }
  }

  draw() {
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    const ds = depthScale(this.wy);
    push();
    translate(sx, sy);
    scale(ds * 1.8);
    drawCatShape(
      this.walkPhase, this.state, this.dir,
      this.furHue, 
      this.furL,
      this.blinking || this.state === 'sleep',
      this.tailPhase
    );
    pop();
    
    if (this.state === 'sleep') {
    push();
    translate(sx, sy);
    const ds2 = depthScale(this.wy);
    for (let i = 0; i < 3; i++) {
      const zAge   = (this.zzPhase + i * 1.2) % 3.6;
      const zAlpha = map(zAge, 0, 3.6, 220, 0);
      const zSize  = map(zAge, 0, 3.6, 8, 18);
      const zX     = lerp(15, 30, zAge / 3.6) * ds2;
      const zY     = lerp(-10, -40, zAge / 3.6) * ds2;
      noStroke();
      fill(210, 60, 85, zAlpha);
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(zSize * ds2);
      text('z', zX, zY);
    }
    pop();
  }
  }
}

function drawCatShape(phase, state, dir, furHue, furL, blinking, tailPhase) {
  const lying    = (state === 'sheltering'|| state === 'sleep');
  const sitting  = (state === 'sit' || state === 'miss' || state === 'idle');
  const stalking = state === 'stalk';
  const walking  = (state === 'wander' || state === 'pounce' || state === 'shelter');
 

  push();
  scale(dir, 1);

  let hx, hy; // head center — set per state, used by shared face drawing at bottom

  if (lying) {
    // ── tail tucked along back ──
    push();
    noFill();
    stroke(0, 0, 12, 240);
    strokeWeight(3);
    beginShape();
    curveVertex(-13, -4); curveVertex(-13, -4);
    curveVertex(-16,  0); curveVertex(-12,  4);
    curveVertex( -6,  2); curveVertex( -6,  2);
    endShape();
    pop();

    // body
    noStroke(); fill(0, 0, 12);
    ellipse(0, -4, 26, 10);

    // head flush with front of body
    ellipse(14, -5, 14, 12);

    // paws poking out front
    fill(0, 0, 15);
    ellipse(20, 0, 8, 4);
    ellipse(26, 0, 8, 4);

    hx = 14; hy = -5;

  } else if (sitting) {
    // ── tail wraps around side ──
    push();
    noFill();
    stroke(0, 0, 12, 240);
    strokeWeight(3);
    beginShape();
    curveVertex(-8, -6); curveVertex(-8, -6);
    curveVertex(-14, -1); curveVertex(-12,  5);
    curveVertex( -4,  3); curveVertex( -4,  3);
    endShape();
    pop();

    // upright body
    noStroke(); fill(0, 0, 12);
    ellipse(0, -12, 16, 20);

    // front legs
    stroke(0, 0, 12); strokeWeight(3); noFill();
    line(-4, -4, -4, 2);
    line( 4, -4,  4, 2);

    // paws
    noStroke(); fill(0, 0, 15);
    ellipse(-4, 3, 8, 5);
    ellipse( 4, 3, 8, 5);

    // head
    noStroke(); fill(0, 0, 12);
    ellipse(0, -26, 16, 15);

    hx = 0; hy = -26;

    // lick paw after miss
    if (state === 'miss') {
      noStroke(); fill(0, 0, 14);
      push(); translate(8, -20); rotate(-0.9);
      ellipse(0, 0, 6, 5); pop();
    }

  } else {
    // ── walking / stalking / pouncing ──
    const bodyY = stalking ? -5  : -10;
    const bodyW = stalking ? 28  : 22;
    const bodyH = stalking ? 8   : 12;
    const lSwing = walking ? sin(phase) * 5 : 0;
    const bx = 2 - bodyW / 2; // back edge of body for tail attach

    // tail
    push();
    noFill();
    stroke(0, 0, 12, 240);
    strokeWeight(3);
    if (stalking) {
      beginShape();
      curveVertex(bx, bodyY); curveVertex(bx, bodyY);
      curveVertex(-18, bodyY - 2); curveVertex(-20, bodyY - 10);
      curveVertex(-16, bodyY - 18); curveVertex(-16, bodyY - 18);
      endShape();
    } else {
      const curl = sin(tailPhase) * 0.6;
      beginShape();
      curveVertex(bx, bodyY); curveVertex(bx, bodyY);
      curveVertex(bx - 5, bodyY - 4);
      curveVertex(bx - 7 + curl * 6,  bodyY - 12);
      curveVertex(bx - 3 + curl * 10, bodyY - 20);
      curveVertex(bx - 3 + curl * 10, bodyY - 20);
      endShape();
    }
    pop();

    // back legs
    strokeWeight(3.5); stroke(0, 0, 12); noFill();
    line(-8, bodyY + 4, -10 - lSwing, 2);
    line(-2, bodyY + 4,  -2 + lSwing, 2);
    // front legs
    line( 8, bodyY + 4,   8 + lSwing, 2);
    line(14, bodyY + 4,  14 - lSwing, 2);

    // paws
    noStroke(); fill(0, 0, 15);
    ellipse(-10 - lSwing, 3, 6, 3);
    ellipse( -2 + lSwing, 3, 6, 3);
    ellipse(  8 + lSwing, 3, 6, 3);
    ellipse( 14 - lSwing, 3, 6, 3);

    // body
    noStroke(); fill(0, 0, 12);
    ellipse(2, bodyY, bodyW, bodyH);

    // head
    ellipse(16, bodyY - 6, 15, 14);

    hx = 16; hy = bodyY - 6;
  }

  // ── Ears ─── shared, uses hx/hy ──
  noStroke(); fill(0, 0, 12);
  triangle(hx - 5, hy - 5, hx - 8, hy - 14, hx - 1, hy - 9);
  triangle(hx + 5, hy - 5, hx + 8, hy - 14, hx + 1, hy - 9);
  fill(340, 45, 55);
  triangle(hx - 4, hy - 6, hx - 6, hy - 12, hx - 1, hy - 9);
  triangle(hx + 4, hy - 6, hx + 6, hy - 12, hx + 1, hy - 9);

  // ── Eyes ──
  if (blinking) {
    stroke(0, 0, 55); strokeWeight(1); noFill();
    line(hx - 4, hy - 1, hx - 1, hy - 1);
    line(hx + 1, hy - 1, hx + 4, hy - 1);
    noStroke();
  } else {
    noStroke(); fill(120, 80, 55);
    ellipse(hx - 3, hy - 1, 5, stalking ? 3 : 5);
    ellipse(hx + 3, hy - 1, 5, stalking ? 3 : 5);
    fill(0, 0, 5);
    if (stalking) {
      rect(hx - 3.5, hy - 3, 1, 4, 1);
      rect(hx + 2.5, hy - 3, 1, 4, 1);
    } else {
      ellipse(hx - 3, hy - 1, 2, 3);
      ellipse(hx + 3, hy - 1, 2, 3);
    }
    fill(0, 0, 92);
    ellipse(hx - 2, hy - 2, 1.2, 1.2);
    ellipse(hx + 4, hy - 2, 1.2, 1.2);
  }

  // ── Nose & mouth ──
  noStroke(); fill(340, 55, 65);
  triangle(hx - 1, hy + 2, hx + 1, hy + 2, hx, hy + 3);
  stroke(0, 0, 30); strokeWeight(0.7); noFill();
  arc(hx - 2, hy + 4, 3, 2, 0.1, PI - 0.1);
  arc(hx + 2, hy + 4, 3, 2, 0.1, PI - 0.1);

  // ── Whiskers ──
  stroke(0, 0, 88, 200); strokeWeight(0.5);
  line(hx, hy + 2, hx - 10, hy + 1);
  line(hx, hy + 2, hx - 10, hy + 3);
  line(hx, hy + 2, hx + 10, hy + 1);
  line(hx, hy + 2, hx + 10, hy + 3);

  pop();
}


