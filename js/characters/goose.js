// ================================================================
// File: goose.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: Defines the Goose character that idles, wanders the garden,
//   and occasionally chases the gardener while quacking aggressively.
// ================================================================

// Goose class manages the goose's state machine (idle/wander/chase),
// storm panic behavior, quack sounds, and gardener pursuit logic.
class Goose {
  constructor() {
    this.wx = random(0.2, 0.8);
    this.wy = random(0.3, 0.7);
    this.state = 'idle'; // 'idle', 'wander', 'chase'
    this.timer = random(100, 300);
    this.dir = 1; // 1 for right, -1 for left
    this.tx = this.wx;
    this.ty = this.wy;
  }
  
  // Spawns a speech bubble that tracks the goose's screen position.
  speak(msg) {
    speechBubbles.push(new SpeechBubble(msg, () => {
      let pos = worldToScreen(this.wx, this.wy);
      let sc = depthScale(this.wy) * 0.6;
      return {
        x: pos.sx,
        y: pos.sy - (70 * sc) // Float right above its head, scaling with depth
      };
    }));
  }

  // Advances the goose's state each frame: picks new states on timer, chases gardener, wanders, or idles.
  update() {
    this.timer--;

    // Pick a new state when the timer runs out
    if (this.timer <= 0) {
      let r = random();
      
      const isStormy = weatherState === 'stormy';

if (isStormy) {
  if (frameCount % 20 === 0) {
    this.tx = random(0.1, 0.9);
    this.ty = random(0.1, 0.9);
    this.state = 'wander';
  }
  // faster wander speed during storm
  if (this.state === 'wander') {
    let dx = this.tx - this.wx;
    let dy = this.ty - this.wy;
    let d = sqrt(dx*dx + dy*dy);
    if (d > 0.001) {
      this.wx += (dx/d) * 0.014;
      this.wy += (dy/d) * 0.014;
      this.dir = dx > 0 ? 1 : -1;
    }
  }
  // panicked quacking
  if (frameCount % 25 === 0 && random() < 0.5) {
    if (quackSound && quackSound.isLoaded()) quackSound.play();
    this.speak('QUACK!!');
  }
}
      // TWEAKED PROBABILITIES
      if (r < 0.05 && gardener) {
        // 15% chance to CHASE
        this.state = 'chase';
        this.timer = random(150, 250); 
        
        // Let out a battle cry immediately when chase starts!
        if (quackSound && quackSound.isLoaded()) {
          quackSound.play();
        }
        
        
      } else if (r < 0.70) {
        // 70% chance to WANDER (Huge increase!)
        this.state = 'wander';
        this.timer = random(150, 300); // Give it more time to walk
        const sep = getSeparation(this.wx, this.wy, 'goose');
this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        // Pick a destination further away (increased from 0.2 to 0.45)
        this.tx = constrain(this.wx + random(-0.45, 0.45), 0.1, 0.9);
        this.ty = constrain(this.wy + random(-0.3, 0.3), 0.1, 0.9);
      } else {
        // Only 15% chance to IDLE
        this.state = 'idle';
        this.timer = random(60, 120); // Shorter idle times
      }
    }

    // Movement Logic
    if (this.state === 'chase' && gardener) {
      let dx = gardener.wx - this.wx;
      let dy = gardener.wy - this.wy;
      let distSq = dx * dx + dy * dy;
      
      if (distSq > 0.0001) {
        let dist = sqrt(distSq);
        this.wx += (dx / dist) * 0.005; // Chase speed
        this.wy += (dy / dist) * 0.005;
        
        const sep = getSeparation(this.wx, this.wy, 'goose');
this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        this.dir = dx > 0 ? 1 : -1;
        // --- THE AGGRESSIVE QUACKING ---
        // Plays a quack every 18 frames (~3 times a second) while running
        if (frameCount % 18 === 0 && quackSound && quackSound.isLoaded()) {
          quackSound.play();
        }
        
        if (frameCount % 36 === 0) {
          //this.speak("Quack! Quack! Quack!");
        }
      } else {
        this.state = 'idle';
        this.timer = 60;
      }
    } else if (this.state === 'wander') {
      let dx = this.tx - this.wx;
      let dy = this.ty - this.wy;
      let distSq = dx * dx + dy * dy;
      
      if (distSq > 0.0001) {
        let dist = sqrt(distSq);
        // INCREASED WANDER SPEED (from 0.0015 to 0.0025)
        this.wx += (dx / dist) * 0.0025; 
        this.wy += (dy / dist) * 0.0025;
        this.dir = dx > 0 ? 1 : -1;
      } else {
        // When it reaches its destination, force a very short idle before moving again
        this.state = 'idle';
        this.timer = random(30, 80); 
      }
      if (this.state !== 'chase') {
      if (random() < 0.001) {
        if (typeof quackSound !== 'undefined' && quackSound && quackSound.isLoaded() && !quackSound.isPlaying()) {
          quackSound.play();
        }
        this.speak("quack."); // Casual, lowercase quack
      }
    }
    }
    
  }

  // Renders the goose sprite at its depth-scaled screen position.
  draw() {
    // Convert 3D world coordinates to 2D screen coordinates
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    const sc = depthScale(this.wy) * 0.6; // Scale based on depth

    push();
    translate(sx, sy);
    scale(sc*2);
    drawGooseShape(t, this.state, this.dir);
    pop();
  }
}

// Draws the goose figure: white body, orange legs/beak, flapping wings, and angry eyebrow when chasing.
function drawGooseShape(time, state, dir) {
  push();
  scale(dir, 1); // Flip the drawing based on which way it's facing

  let walkBounce = 0;
  let legAngle = 0;
  let neckStretch = 0;
  let wingFlap = 0;

  // Animate based on state
  if (state === 'wander') {
    legAngle = sin(time * 0.15) * 0.5;
    walkBounce = abs(sin(time * 0.15)) * 3;
  } else if (state === 'chase') {
    legAngle = sin(time * 0.4) * 0.8;    // Legs move faster
    walkBounce = abs(sin(time * 0.4)) * 5; // Bounces higher
    neckStretch = 12;                      // Leans forward aggressively!
    wingFlap = sin(time * 0.6) * 0.8;      // Wings flap
  }

  translate(0, -walkBounce);

  // --- Legs (Orange) ---
  stroke(25, 85, 50, 255); // Orange HSL
  strokeWeight(4);
  // Back leg
  push(); translate(-6, -5); rotate(-legAngle); line(0, 0, 0, 18); pop();
  // Front leg
  push(); translate(4, -5); rotate(legAngle); line(0, 0, 0, 18); pop();

  noStroke();

  // --- Body (White) ---
  fill(0, 0, 100, 255); 
  ellipse(0, -15, 40, 24);

  // --- Wing ---
  push();
  translate(-5, -17);
  rotate(wingFlap);
  fill(0, 0, 90, 255); // Slightly darker white to stand out from body
  ellipse(5, 2, 22, 12);
  pop();

  // --- Neck & Head ---
  push();
  translate(14 + (neckStretch * 0.5), -20 + (neckStretch * 0.3));
  rotate(neckStretch * 0.04); 
  
  // Neck
  stroke(0, 0, 100, 255);
  strokeWeight(10);
  noFill();
  beginShape();
  vertex(-8, 8);
  quadraticVertex(4, -10, -2, -22);
  endShape();
  
  // Head
  noStroke();
  fill(0, 0, 100, 255);
  ellipse(0, -24, 16, 12);
  
  // Eye (Angry eyebrow if chasing!)
  fill(0, 0, 10, 255);
  ellipse(3, -26, 3, 3);
  if (state === 'chase') {
    stroke(0, 0, 10, 255);
    strokeWeight(1);
    line(1, -29, 5, -27); // Angry eyebrow
  }
  
  // Beak (Orange)
  noStroke();
  fill(25, 85, 50, 255);
  triangle(6, -26, 6, -21, 16, -23);
  
  pop(); // End Neck/Head

  pop(); // End Goose Shape
}

