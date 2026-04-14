// ================================================================
// File: ram.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: Defines the Ram character that wanders the garden,
//   grazes on flowers, and produces droppings that grow into new flowers.
// ================================================================

// Ram class manages the sheep's state machine (wander/approach/eat/idle),
// blink cycle, speech bubbles, storm behavior, and poop-to-flower lifecycle.
class Ram {
  constructor() {
    this.wx = 0.5;
    this.wy = 0.6;
    this.twx = random(0.1, 0.9); // target world x
    this.twy = random(0.2, 0.9); // target world y
    this.speed = 0.0025;
    this.walkPhase = 0;
    this.dir = 1;           // 1 = facing right, -1 = facing left
    this.state = 'wander';  // wander | approach | eat | idle
    this.idleTimer = 0;
    this.eatTimer = 0;
    this.eatTarget = null;  // index into flowers[]
    this.mouthOpen = 0;
    this.blinkTimer = floor(random(80, 200));
    this.blinking = false;
    this.poopTimer = floor(random(7200, 10800));
this.poops = [];
  }

  // Searches flowers array for one within grazing range and returns its index, or -1.
  findNearbyFlower() {
    // Never eat below 50 flowers so the garden always looks full
    if (flowers.length <= 50) return -1;
    // Prefer faceless flowers (poop flowers) over ones with faces
    let faceless = -1;
    let withFace = -1;
    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];
      if (f.size < 0.05) continue; // already eaten/tiny
      const dx = f.wx - this.wx;
      const dy = f.wy - this.wy;
      if (sqrt(dx*dx + dy*dy) < 0.12) {
        if (f.imgs.length === 0 && faceless < 0) faceless = i;
        else if (f.imgs.length > 0 && withFace < 0) withFace = i;
      }
      if (faceless >= 0) break; // found a faceless one, no need to keep looking
    }
    return faceless >= 0 ? faceless : withFace;
  }

  // Advances the ram's state machine each frame: blinking, storm panic, wandering, eating, and pooping.
  update() {
    
    
    // blink
    this.blinkTimer--;
    if (this.blinkTimer <= 0) {
      this.blinking = !this.blinking;
      this.blinkTimer = this.blinking ? 6 : floor(random(80, 220));
    }
    if (kids.some(k => k.state === 'petting') && this.state === 'wander') {
  this.state = 'idle';
  this.idleTimer = 80;
  this.walkPhase = 0;
}
    
    
    const isStormy = weatherState === 'stormy';

if (isStormy) {
  // pick new random targets very frequently
  if (frameCount % 30 === 0) {
    this.twx = random(0.05, 0.95);
    this.twy = random(0.08, 0.95);
    this.state = 'wander';
  }
  this.speed = 0.012; // much faster
} else {
  this.speed = 0.0025; // normal speed
}

    if (this.state === 'wander') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      
      this.poopTimer--;
      if (this.poopTimer <= 0) {
        // Only actually poop if there are fewer than 5 faceless flowers + active poops
        const facelessCount = flowers.filter(f => f.imgs.length === 0).length + this.poops.length;
        if (facelessCount < 5) {
          // offset to butt: tail is at draw-space x=-27 (behind ram), scaled by ds*2.2
          const spawnDs = depthScale(this.wy);
          const buttWX = this.wx - this.dir * 27 * spawnDs * 2.2 / width;
          this.poops.push({ wx: buttWX, wy: this.wy, age: 0, dropY: -12 * spawnDs * 2.2 });
          if (fart && !fart.isPlaying()) fart.play();
        }
        this.poopTimer = floor(random(7200, 10800));
      }
      
      if (isStormy && frameCount % 40 === 0 && random() < 0.6) {
  if (sheep && !sheep.isPlaying()) sheep.play();
  const ramRef = this;
  speechBubbles.push(new SpeechBubble('BAAAA!!', () => {
    const { sx, sy } = worldToScreen(ramRef.wx, ramRef.wy);
    const ds = depthScale(ramRef.wy);
    return { x: sx, y: sy - 40 * ds };
  }));
}
      
      ramSpeechTimer--;
if (ramSpeechTimer <= 0) {
  const { sx, sy } = worldToScreen(this.wx, this.wy);
  const ds = depthScale(this.wy);
  const phrase = RAM_PHRASES[floor(random(RAM_PHRASES.length))];
const ramRef = this;  // capture reference
speechBubbles.push(new SpeechBubble(phrase, () => {
  const { sx, sy } = worldToScreen(ramRef.wx, ramRef.wy);
  const ds = depthScale(ramRef.wy);
  return { x: sx, y: sy - 40 * ds };
}));
  ramSpeechTimer = floor(random(300, 600));
}

      if (d < 0.025) {
        // reached target — maybe idle, then pick new destination
        this.state = 'idle';
        this.idleTimer = floor(random(40, 140));
        this.twx = random(0.05, 0.95);
        this.twy = random(0.08, 0.95);
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        const sep = getSeparation(this.wx, this.wy, 'ram');
this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        this.dir = dx > 0 ? 1 : -1;
        this.walkPhase += 0.18;
        
        //random baa
        if (frameCount % 180 === 0 && random() < 0.25) {   
              if (sheep && !sheep.isPlaying()) sheep.play();
}

        // randomly decide to hunt a flower (20% chance per check, throttled)
        if (frameCount % 40 === 0 && random() < 0.35) {
          const fi = this.findNearbyFlower();
          if (fi >= 0) {
            this.eatTarget = fi;
            this.state = 'approach';
          }
        }
      }

    } else if (this.state === 'approach') {
      if (this.eatTarget === null || this.eatTarget >= flowers.length) {
        this.state = 'wander'; return;
      }
      const f  = flowers[this.eatTarget];
      const dx = f.wx - this.wx;
      const dy = f.wy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      if (d < 0.03) {
        this.state = 'eat';
        this.eatTimer = 90;
        if (chewing && !chewing.isPlaying()) chewing.play();
      } else {
        this.wx += (dx / d) * this.speed * 1.4;
        this.wy += (dy / d) * this.speed * 1.4;
        const sep = getSeparation(this.wx, this.wy, 'ram');
      this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
    this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        this.walkPhase += 0.18;
      }

    } else if (this.state === 'eat') {
      this.eatTimer--;
      this.mouthOpen = abs(sin(this.eatTimer * 0.28)) * 0.9;
      if (this.eatTarget !== null && this.eatTarget < flowers.length) {
        // shrink the flower as it's eaten
        flowers[this.eatTarget].restSize   *= 0.96;
        flowers[this.eatTarget].targetSize *= 0.96;
      }
      if (this.eatTimer <= 0) {
        // remove it
        if (this.eatTarget !== null && this.eatTarget < flowers.length) {
          flowers[this.eatTarget].dispose();
          flowers.splice(this.eatTarget, 1);
        }
        this.eatTarget = null;
        this.mouthOpen = 0;
        this.state = 'idle';
        this.idleTimer = floor(random(30, 80));
        this.twx = random(0.05, 0.95);
        this.twy = random(0.08, 0.95);
      }

    } else if (this.state === 'idle') {
      this.idleTimer--;
      this.walkPhase = 0;
      this.mouthOpen = 0;
      if (this.idleTimer <= 0) this.state = 'wander';
    }
  }

  // Renders poop piles (which eventually become flowers) and the ram sprite at its world position.
  draw() {
  // draw poops first (behind ram) in world space
  for (let i = this.poops.length - 1; i >= 0; i--) {
    const p = this.poops[i];
    p.age++;
    const { sx, sy } = worldToScreen(p.wx, p.wy);
    const ds = depthScale(p.wy);

    if (p.age < 300) {
      p.dropY = lerp(p.dropY, 0, 0.1);
      push();
      translate(sx, sy + p.dropY);
      scale(ds * 1.6);
      noStroke();
      fill(25, 40, 18);
      ellipse(0, 0, 12, 7);
      ellipse(-2, -5, 9, 6);
      ellipse(1, -9, 7, 5);
      ellipse(0, -12, 5, 4);
      stroke(90, 30, 55, 80);
      strokeWeight(0.8);
      noFill();
      for (let s = 0; s < 3; s++) {
        const sx2 = (s - 1) * 6;
        beginShape();
        curveVertex(sx2,     -14);
        curveVertex(sx2 + 2, -18);
        curveVertex(sx2 - 1, -22);
        endShape();
      }
      pop();
    } else if (p.age >= 300) {
      addFlower(p.wx, p.wy, [random(360), random(60, 90), random(55, 72)]);
      this.poops.splice(i, 1);
    }
  }

  // draw ram
  const { sx, sy } = worldToScreen(this.wx, this.wy);
  const ds = depthScale(this.wy);
  push();
  translate(sx, sy);
  scale(ds * 2.2);
  drawRamShape(this.walkPhase, this.state, this.mouthOpen, this.dir, this.blinking);
  pop();
}

}
// Draws the detailed ram anatomy: wool body, curled horns, legs, hooves, muzzle, and chewing animation.
function drawRamShape(phase, state, mouthOpen, dir, blinking) {
  const walking = (state === 'wander' || state === 'approach');

  push();
  scale(dir, 1); // flip to face direction of travel

  // ── Legs ──────────────────────────────────────
  const lSwing = walking ? sin(phase) * 10 : 0;
  strokeWeight(4.5);
  stroke(30, 18, 44);
  noFill();
  // front pair
  line( 12, -4,  12 + lSwing,  18);
  line( 18, -4,  18 - lSwing,  18);
  // back pair
  line(-14, -4, -14 - lSwing,  18);
  line(-20, -4, -20 + lSwing,  18);

  // hooves
  noStroke();
  fill(25, 12, 20);
  ellipse( 12 + lSwing,  19, 7, 4);
  ellipse( 18 - lSwing,  19, 7, 4);
  ellipse(-14 - lSwing,  19, 7, 4);
  ellipse(-20 + lSwing,  19, 7, 4);

  // ── Body ──────────────────────────────────────
  noStroke();
  fill(30, 18, 72); // warm slate
  ellipse(0, -10, 52, 30);

  // wool texture — lighter overlapping puffs
  fill(32, 15, 80, 220);
  ellipse(-8,  -16, 22, 16);
  ellipse(  6, -18, 20, 14);
  ellipse( 18, -14, 18, 13);
  ellipse(-18, -12, 16, 12);

  // ── Tail ──────────────────────────────────────
  fill(32, 15, 80);
  ellipse(-27, -12, 11, 10);

  // ── Neck ──────────────────────────────────────
  fill(30, 18, 68);
  push();
  translate(26, -16);
  rotate(-0.32);
  ellipse(0, 0, 18, 24);
  pop();

  // ── Head ──────────────────────────────────────
  fill(30, 18, 65);
  ellipse(36, -30, 24, 20);

  // ── Horns ─────────────────────────────────────
  // main curled horn
  noFill();
  stroke(28, 22, 38);
  strokeWeight(3.5);
  beginShape();
  curveVertex(32, -38);
  curveVertex(34, -46);
  curveVertex(42, -50);
  curveVertex(50, -46);
  curveVertex(52, -38);
  curveVertex(48, -32);
  curveVertex(40, -30);
  curveVertex(36, -33);
  endShape();
  // inner horn ridge (lighter)
  stroke(28, 20, 48);
  strokeWeight(1.2);
  beginShape();
  curveVertex(34, -40);
  curveVertex(36, -46);
  curveVertex(43, -49);
  curveVertex(50, -44);
  curveVertex(50, -37);
  curveVertex(46, -32);
  endShape();

  // ── Ear ───────────────────────────────────────
  noStroke();
  fill(340, 35, 68);
  push();
  translate(30, -36);
  rotate(0.4);
  ellipse(0, 0, 7, 13);
  pop();
  fill(340, 28, 78);
  push();
  translate(30, -36);
  rotate(0.4);
  ellipse(0, 1, 4, 8);
  pop();

  // ── Muzzle ────────────────────────────────────
  noStroke();
  fill(25, 20, 55);
  ellipse(48, -26, 13, 10);
  // nostrils
  fill(20, 15, 30);
  ellipse(45, -26, 3, 2.5);
  ellipse(50, -26, 3, 2.5);

  // ── Mouth ─────────────────────────────────────
  if (mouthOpen > 0.05) {
    fill(5, 60, 35);
    arc(48, -21, 11, 7 * mouthOpen, 0, PI, CHORD);
    // grass/flower bits while chewing
    stroke(110, 58, 45);
    strokeWeight(1.2);
    noFill();
    if (mouthOpen > 0.4) {
      line(44, -21, 42, -19);
      line(48, -21, 47, -18);
      line(51, -21, 52, -18);
    }
  }

  // ── Eye ───────────────────────────────────────
  noStroke();
  fill(30, 15, 12);
  if (blinking) {
    // closed eye — just a line
    stroke(30, 15, 12);
    strokeWeight(1.5);
    line(41, -33, 45, -33);
    noStroke();
  } else {
    ellipse(43, -33, 5, 5);
    // pupil (rectangular — goat/ram eyes have horizontal pupils)
    fill(20, 10, 8);
    rect(41, -34.2, 4, 2.4, 1);
    // highlight
    fill(0, 0, 92);
    ellipse(44.5, -34, 1.5, 1.5);
  }

  pop(); // end dir scale
}
