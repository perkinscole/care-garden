// ================================================================
// File: gardener.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: Defines the Gardener character who wanders the garden watering
//   flowers, opens an umbrella in rain, shelters at the school, and flees the goose.
// ================================================================

// Gardener class handles the gardener's state machine (wander/water/shelter/flee/night),
// watering can physics, droplet particles, umbrella display, and goose evasion.
class Gardener {
  constructor() {
    this.wx = 0.3;
    this.wy = 0.5;
    this.twx = random(0.1, 0.9);
    this.twy = random(0.1, 0.9);
    this.speed = 0.002;
    this.walkPhase = 0;
    this.dir = 1;
    this.state = 'wander';
    this.idleTimer = 0;
    this.waterTarget = null;
    this.waterTimer = 0;
    this.pourAngle = 0;
    this.droplets = [];
    this.spoke = false;
    this.sheltering = false;
this.umbrellaOut = false;
    this.goingInside = false;
  }
  
  // Spawns a speech bubble that tracks the gardener's screen position.
  speak(msg) {
    speechBubbles.push(new SpeechBubble(msg, () => {
      let pos = worldToScreen(this.wx, this.wy);
      let sc = depthScale(this.wy) * 0.6;
      return { 
        x: pos.sx, 
        y: pos.sy - (85 * sc) // Float right above his head
      };
    }));
  }

  // Searches flowers array for one within watering range and returns its index, or -1.
  findNearbyFlower() {
    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];
      const dx = f.wx - this.wx;
      const dy = f.wy - this.wy;
      if (sqrt(dx*dx + dy*dy) < 0.14) return i;
    }
    return -1;
  }

  // Advances the gardener's state each frame: rain/night checks, flee logic, watering, and movement.
  update() {

    const isRaining = weatherState === 'rainy' || weatherState === 'stormy';
    const isNightTime = nightAmount() > 0.4;

// Night — gardener goes inside
if (isNightTime && !this.goingInside && this.state !== 'inside') {
  this.goingInside = true;
  this.sheltering = false;
  this.umbrellaOut = false;
  this.waterTarget = null;
  this.droplets = [];
  this.state = 'goInside';
  this.twx = 0.50;
  this.twy = 0.01;  // walk off toward school
  this.speak("Time to head in. Goodnight, garden!");
}

// Dawn — gardener comes back out
if (!isNightTime && this.goingInside) {
  this.goingInside = false;
  this.state = 'wander';
  this.wx = 0.50;
  this.wy = 0.05;
  this.twx = random(0.1, 0.9);
  this.twy = random(0.2, 0.8);
  this.speak("Good morning! Let's tend the garden!");
}

// If inside, skip all other logic
if (this.state === 'inside') return;

if (isRaining && !this.sheltering && !this.goingInside) {
  this.sheltering = true;
  this.umbrellaOut = true;
  this.state = 'shelter';
  this.waterTarget = null;
  this.droplets = [];
  // head to school sidewalk
  this.twx = 0.48 + random(-0.04, 0.04);
  this.twy = 0.16;
  this.speak("Oh dear, rain! My flowers!");
}

if (!isRaining && this.sheltering && !this.goingInside) {
  this.sheltering = false;
  this.umbrellaOut = false;
  this.state = 'wander';
  this.twx = random(0.1, 0.9);
  this.twy = random(0.2, 0.8);
  this.speak("Back to work!");
}
    
let currentlyFleeing = false;

    // --- FLEE LOGIC ---
    if (typeof goose !== 'undefined' && goose.state === 'chase' && !this.sheltering) {
      let dx = this.wx - goose.wx;
      let dy = this.wy - goose.wy;
      let distSq = dx * dx + dy * dy;

      if (distSq < 0.1) { 
        currentlyFleeing = true;
        this.wasFleeing = true; // MEMORY: Remember that he is actively running
        
        let dist = sqrt(distSq);
        this.wx += (dx / dist) * 0.0045; 
        this.wy += (dy / dist) * 0.0045;

        this.wx = constrain(this.wx, 0.05, 0.95);
        this.wy = constrain(this.wy, 0.1, 0.95);
        this.dir = dx > 0 ? 1 : -1;
        this.state = 'flee'; 
        
        
        
        if (frameCount % 15 === 0 && !this.spoke) {
          this.spoke = true;
          let yells = ["Ah!", "Get away goose!", "Shoo!", "Leave me alone!", "Not again!"];
          this.speak(random(yells));
        }
      }
    }

    // --- EXISTING GARDENER LOGIC ---
   // --- RECOVERY & NORMAL LOGIC ---
    if (!currentlyFleeing) {
      
      // If he was just fleeing on the previous frame, but isn't anymore:
      if (this.wasFleeing) {
        this.spoke = false;
        this.wasFleeing = false;
        if (this.sheltering) {
          this.state = 'sheltering';
        } else {
          this.state = 'idle';
          this.timer = 0;
        }
      }
      
    // update droplets
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.vy += 0.18;
      d.x  += d.vx;
      d.y  += d.vy;
      d.life--;
      if (d.life <= 0) this.droplets.splice(i, 1);
    }

    if (this.state === 'wander') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      
      gardenerSpeechTimer--;
    if (gardenerSpeechTimer <= 0) {
      const { sx, sy } = worldToScreen(this.wx, this.wy);
      const ds = depthScale(this.wy);
      const phrase = GARDENER_PHRASES[floor(random(GARDENER_PHRASES.length))];
const gRef = this;
speechBubbles.push(new SpeechBubble(phrase, () => {
  const { sx, sy } = worldToScreen(gRef.wx, gRef.wy);
  const ds = depthScale(gRef.wy);
  return { x: sx, y: sy - 40 * ds };
}));
      gardenerSpeechTimer = floor(random(300, 600));
    }

      if (d < 0.025) {
        this.state = 'idle';
        this.idleTimer = floor(random(30, 100));
        this.twx = random(0.05, 0.95);
        this.twy = random(0.05, 0.95);
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        const sep = getSeparation(this.wx, this.wy, 'gardener');
this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        this.dir = dx > 0 ? 1 : -1;
        this.walkPhase += 0.15;

        if (frameCount % 60 === 0 && random() < 0.5) {
          const fi = this.findNearbyFlower();
          if (fi >= 0) {
            this.waterTarget = fi;
            this.state = 'approach';
          }
        }
      }

    } else if (this.state === 'approach') {
      if (this.waterTarget === null || this.waterTarget >= flowers.length) {
        this.state = 'wander'; return;
      }
      const f  = flowers[this.waterTarget];
      const dx = f.wx - this.wx;
      const dy = f.wy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      if (d < 0.035) {
        this.state = 'water';
        this.waterTimer = 90;
        this.pourAngle = 0;
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        const sep = getSeparation(this.wx, this.wy, 'gardener');
this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        this.walkPhase += 0.15;
      }

    } else if (this.state === 'water') {
      this.waterTimer--;
      // tilt can into pour position
      this.pourAngle = lerp(this.pourAngle, -1.1, 0.08);

      // boost the flower
      if (this.waterTarget !== null && this.waterTarget < flowers.length) {
        flowers[this.waterTarget].targetSize = min(
          flowers[this.waterTarget].targetSize + 0.002,
          flowers[this.waterTarget].restSize * 1.6
        );
      }

      // emit droplets from can spout
      if (frameCount % 4 === 0) {
        const { sx, sy } = worldToScreen(this.wx, this.wy);
        const ds = depthScale(this.wy);
        const sc = ds * 2.0;
        // spout position in screen space (mirrored for dir)
        const spoutX = sx + this.dir * 42 * sc;
        const spoutY = sy + 15 * sc;
        this.droplets.push({
          x: spoutX, y: spoutY,
          vx: this.dir * random(0.5, 1.8) * sc,
          vy: -random(0.5, 1.5) * sc,
          life: floor(random(12, 22)),
          size: random(2, 4) * sc
        });
      }
      
      

      if (this.waterTimer <= 0) {
        this.pourAngle = 0;
        this.waterTarget = null;
        this.state = 'idle';
        this.idleTimer = floor(random(40, 80));
        this.twx = random(0.05, 0.95);
        this.twy = random(0.05, 0.95);
      }

    }else if (this.state === 'shelter') {
  const dx = this.twx - this.wx;
  const dy = this.twy - this.wy;
  const d  = sqrt(dx*dx + dy*dy);
  this.dir = dx > 0 ? 1 : -1;
  if (d < 0.03) {
    this.state = 'sheltering';
    this.walkPhase = 0;
  } else {
    this.wx += (dx / d) * this.speed * 1.8;
    this.wy += (dy / d) * this.speed * 1.8;
    this.walkPhase += 0.2;
  }

} else if (this.state === 'sheltering') {
  this.walkPhase = 0;
  this.pourAngle = 0;
  // just stand and wait — rain check at top exits this

} else if (this.state === 'goInside') {
  const dx = this.twx - this.wx;
  const dy = this.twy - this.wy;
  const d  = sqrt(dx*dx + dy*dy);
  this.dir = dx > 0 ? 1 : -1;
  if (d < 0.03 || this.wy < 0.03) {
    this.state = 'inside';
    this.walkPhase = 0;
  } else {
    this.wx += (dx / d) * this.speed * 1.5;
    this.wy += (dy / d) * this.speed * 1.5;
    this.walkPhase += 0.15;
  }

} else if (this.state === 'inside') {
  // Off-screen, waiting for dawn
  this.wy = -0.1;
  return;

} else if (this.state === 'idle') {
      this.idleTimer--;
      this.walkPhase = 0;
      if (this.idleTimer <= 0) this.state = 'wander';
    }
      this.timer--;
    }
  }

  // Renders the gardener sprite, water droplets, and speech bubbles at the current world position.
  draw() {
    if (this.state === 'inside') return;
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    const ds = depthScale(this.wy);

    // draw droplets in screen space (outside scale)
    noStroke();
    for (let d of this.droplets) {
      fill(200, 72, 68, map(d.life, 0, 22, 0, 200));
      ellipse(d.x, d.y, d.size, d.size * 1.3);
    }
    
    speechBubbles = speechBubbles.filter(b => b.update());
for (let b of speechBubbles) b.draw();

    push();
    translate(sx, sy);
    scale(ds * 2.0);
    drawGardenerShape(this.walkPhase, this.state, this.pourAngle, this.dir, this.umbrellaOut);
    pop();
  }
}

// Draws the gardener figure: flowered dress, sun hat, watering can (with pour), and rainbow umbrella.
function drawGardenerShape(phase, state, pourAngle, dir, umbrella = false) {
  const walking = (state === 'wander' || state === 'approach' || state === 'flee' || state === 'shelter');
  const sheltering = state === 'sheltering';
  push();
  scale(dir, 1);

  // Small helper: draw a tiny 5-petal flower at (x, y) with given hue and radius
  function miniFlower(x, y, hue, r) {
    noStroke();
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * TWO_PI;
      fill(hue, 78, 72);
      ellipse(x + cos(pa) * r * 1.1, y + sin(pa) * r * 1.1, r * 1.4, r * 1.4);
    }
    fill(55, 90, 88);
    ellipse(x, y, r, r);
  }

  const activePhase = (state === 'flee') ? frameCount * 0.5 : phase;
  const lSwing = walking ? sin(activePhase) * 5 : 0;

  // ── Legs (peeking below dress hem) ────────────────────
  strokeWeight(3);
  stroke(22, 48, 76);
  noFill();
  line(2,  10, 2 + lSwing * 0.5,  22);
  line(9,  10, 9 - lSwing * 0.5,  22);

  noStroke();
  fill(20, 40, 22); // shoes — dark with slight sheen
  ellipse(2 + lSwing * 0.5, 23, 9, 5);
  ellipse(9 - lSwing * 0.5, 23, 9, 5);

  // ── Dress skirt (flared trapezoid) ────────────────────
  noStroke();
  fill(345, 62, 84); // soft warm pink
  beginShape();
  vertex(-6, -20);   // waist left
  vertex(18, -20);   // waist right
  vertex(25,  10);   // hem right
  vertex(-14, 10);   // hem left
  endShape(CLOSE);

  // Flowers scattered on skirt
  miniFlower(-3,  -5,  350, 3.2);
  miniFlower(14,  -8,  270, 2.6);
  miniFlower( 3,   3,  120, 2.3);
  miniFlower(17,   1,   45, 2.8);
  miniFlower( 8, -14,  200, 2.2);
  miniFlower(-5,   4,   15, 2.0);

  // ── Bodice ────────────────────────────────────────────
  noStroke();
  fill(345, 58, 72); // slightly deeper pink
  rect(-5, -33, 22, 14, 4);

  // Flowers on bodice
  miniFlower(3,  -28, 350, 2.2);
  miniFlower(13, -26, 270, 2.0);

  // ── Arms (short sleeves, skin-coloured) ───────────────
  noStroke();
  fill(22, 55, 76); // warm skin
  push();
  translate(-5, -28);
  rotate(umbrella ? -1.4 : walking ? sin(phase + PI) * 0.25 : 0.1);
  rect(-4, 0, 7, 13, 3);
  pop();
  push();
  translate(16, -28);
  rotate(umbrella ? -1.4 : walking ? sin(phase) * 0.25 : -0.1);
  rect(-3, 0, 7, 13, 3);
  pop();

  // ── Neck ──────────────────────────────────────────────
  noStroke();
  fill(22, 55, 76);
  rect(3, -40, 6, 9);

  // ── Head ──────────────────────────────────────────────
  noStroke();
  fill(22, 55, 76);
  ellipse(6, -48, 18, 20);

  // ── Hair ──────────────────────────────────────────────
  noStroke();
  fill(25, 58, 28); // rich dark brown
  ellipse(-2, -49, 6, 19); // left side
  ellipse(14, -49, 6, 19); // right side
  ellipse(6, -57, 14, 9);  // top (mostly under hat)

  // ── Face ──────────────────────────────────────────────
  // Eyes
  noStroke();
  fill(20, 10, 15);
  ellipse(3, -49, 3.2, 3.2);
  ellipse(9, -49, 3.2, 3.2);
  // Eyelashes (left eye)
  stroke(20, 10, 15);
  strokeWeight(0.9);
  line(1.5, -51, 0.5, -52.5);
  line(3,   -51.5, 3,   -53);
  line(4.5, -51, 5.5, -52.5);
  // Eyelashes (right eye)
  line(7.5,  -51, 6.5,  -52.5);
  line(9,    -51.5, 9,  -53);
  line(10.5, -51, 11.5, -52.5);
  // Mouth
  noFill();
  stroke(20, 10, 15);
  strokeWeight(1);
  if (state === 'flee') {
    arc(6, -44, 7, 5, PI, TWO_PI);
  } else if (sheltering) {
    line(3, -45, 9, -45); // bored flat line
  } else {
    arc(6, -45, 7, 5, 0.1, PI); // smile
  }

  // ── Umbrella (when raining) ────────────────────────────
  if (umbrella) {
    push();
    translate(6, -84); // above the hat

    const stripeHues = [0, 30, 55, 120, 200, 260, 300];
    const canopyR = 22;
    for (let i = 0; i < stripeHues.length; i++) {
      const a1 = PI + (i / stripeHues.length) * PI;
      const a2 = PI + ((i + 1) / stripeHues.length) * PI;
      noStroke();
      fill(stripeHues[i], 80, 65, 230);
      beginShape();
      vertex(0, 0);
      for (let a = a1; a <= a2; a += 0.05) {
        vertex(cos(a) * canopyR, sin(a) * canopyR);
      }
      endShape(CLOSE);
    }

    noFill();
    stroke(0, 0, 20, 180);
    strokeWeight(1.2);
    arc(0, 0, canopyR * 2, canopyR * 2, PI, TWO_PI);

    noFill();
    for (let i = 0; i < 7; i++) {
      const a = PI + (i + 0.5) / 7 * PI;
      const ex = cos(a) * canopyR;
      const ey = sin(a) * canopyR;
      stroke(0, 0, 20, 150);
      strokeWeight(0.8);
      ellipse(ex, ey, 5, 5);
    }

    stroke(0, 0, 25);
    strokeWeight(2);
    line(0, 0, 0, 50);

    noFill();
    stroke(0, 0, 25);
    strokeWeight(2);
    arc(4, 50, 8, 8, HALF_PI, PI + HALF_PI);

    pop();

  } else {
    // ── Watering can ──────────────────────────────────────
    push();
    translate(24 - (walking ? sin(phase) * 2 : -0.1), -12);
    rotate(-pourAngle);
    noStroke();
    fill(200, 62, 42);
    ellipse(0, 0, 18, 13);
    noFill();
    stroke(200, 55, 35);
    strokeWeight(2);
    arc(0, -4, 14, 12, PI, TWO_PI);
    noFill();
    stroke(200, 62, 42);
    strokeWeight(2.5);
    line(8, -2, 22, -8);
    noStroke();
    fill(200, 55, 35);
    ellipse(22, -8, 7, 5);
    if (pourAngle < -0.5) {
      fill(200, 72, 68, 180);
      for (let hi = 0; hi < 3; hi++) {
        ellipse(20 + hi * 1.5, 7 + hi * 0.5, 1.5, 1.5);
      }
    }
    pop();
  }

  // ── Wide-brim sun hat — drawn last, always on top ─────
  noStroke();
  fill(38, 58, 58); // warm straw
  ellipse(6, -57, 38, 8); // wide brim
  fill(35, 52, 52);
  rect(-1, -67, 16, 11, 3); // crown
  // Pink hat band
  noStroke();
  fill(345, 65, 72);
  rect(2, -58, 13, 3);
  // Small flower on hat band
  miniFlower(15, -57, 45, 3);

  pop();
}

