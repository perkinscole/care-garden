// ================================================================
// File: goose.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the Goose character that idles, wanders the garden,
//   and occasionally chases the gardener while quacking aggressively.
//   Drawn as pixel art from the 'goose' and 'goose_chase' sprites in
//   js/art/animals_art.js.
// ================================================================

// Goose class manages the goose's state machine (idle/wander/chase),
// storm panic behavior, quack sounds, and gardener pursuit logic.
class Goose {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor() {
    this.wx = random(0.2, 0.8);
    this.wy = random(0.3, 0.7);
    this.state = 'idle'; // 'idle', 'wander', 'chase'
    this.timer = random(100, 300);
    this.dir = 1; // 1 for right, -1 for left
    this.tx = this.wx;
    this.ty = this.wy;
    this.walkPhase = 0;     // advances while the goose is moving
    this.honkTimer = 0;     // frames left with the bill open
    this.panicking = false; // true while running about in a storm
  }

  // Art-pixel point just above the goose's head, for speech bubbles.
  headPos() {
    const p = worldToPx(this.wx, this.wy);
    const charging = this.state === 'chase' || this.panicking;
    return charging ? { x: p.x + this.dir * 14, y: p.y - 13 }
                    : { x: p.x + this.dir * 5,  y: p.y - 21 };
  }

  // Spawns a speech bubble that tracks the goose's head.
  speak(msg) {
    speechBubbles.push(new SpeechBubble(msg, () => this.headPos()));
  }

  // Plays the quack and opens the bill for a moment.
  honk() {
    soundPlay(quackSound, true);
    this.honkTimer = 12;
  }

  // Runs the state machine for a frame, then moves the legs in time with
  // the ground actually covered (a flat-out scurry when charging).
  update() {
    const fromX = this.wx, fromY = this.wy;
    this.think();
    const moved = this.wx !== fromX || this.wy !== fromY;
    if (this.state === 'chase' || this.panicking) { if (moved) this.walkPhase += 0.45; }
    else this.walkPhase += walkStride(this.wx - fromX, this.wy - fromY, 20);
  }

  // Advances the goose's state each frame: picks new states on timer, chases gardener, wanders, or idles.
  think() {
    if (this.honkTimer > 0) this.honkTimer--;

    // Storm: forget everything and run around flapping and honking
    this.panicking = weatherState === 'stormy';
    if (this.panicking) {
      if (this.state === 'chase') this.state = 'wander';
      if (frameCount % 20 === 0) {
        this.tx = random(0.1, 0.9);
        this.ty = random(0.1, 0.9);
        this.state = 'wander';
        this.timer = 60;   // settle down soon after the storm passes
      }
      const dx = this.tx - this.wx;
      const dy = this.ty - this.wy;
      const d = sqrt(dx * dx + dy * dy);
      if (d > 0.015) {
        this.wx = constrain(this.wx + (dx / d) * 0.007, 0.02, 0.98);
        this.wy = constrain(this.wy + (dy / d) * 0.007, 0.04, 0.98);
        this.dir = dx > 0 ? 1 : -1;
      }
      // panicked quacking
      if (frameCount % 50 === 0 && random() < 0.5) {
        this.honk();
        this.speak('QUACK!!');
      }
      return;
    }

    this.timer--;

    // Pick a new state when the timer runs out
    if (this.timer <= 0) {
      let r = random();
      if (r < 0.05 && gardener) {
        // 5% chance to CHASE
        this.state = 'chase';
        this.timer = random(150, 250);
        // Let out a battle cry immediately when chase starts!
        this.honk();
      } else if (r < 0.70) {
        // mostly WANDER
        this.state = 'wander';
        this.timer = random(150, 300); // Give it time to walk
        const sep = getSeparation(this.wx, this.wy, 'goose');
        this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
        this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        // Pick a destination a good way off
        this.tx = constrain(this.wx + random(-0.45, 0.45), 0.1, 0.9);
        this.ty = constrain(this.wy + random(-0.3, 0.3), 0.1, 0.9);
      } else {
        // otherwise IDLE for a short while
        this.state = 'idle';
        this.timer = random(60, 120);
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
        if (abs(dx) > 0.01) this.dir = dx > 0 ? 1 : -1;
        // --- THE AGGRESSIVE QUACKING ---
        // A quack every 18 frames (~3 times a second) while running
        if (frameCount % 18 === 0) this.honk();
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
        this.wx += (dx / dist) * 0.0018;
        this.wy += (dy / dist) * 0.0018;
        this.dir = dx > 0 ? 1 : -1;
      } else {
        // When it reaches its destination, force a very short idle before moving again
        this.state = 'idle';
        this.timer = random(30, 80);
      }
      if (random() < 0.001) {
        this.honk();
        this.speak("quack."); // Casual, lowercase quack
      }
    }
  }

  // Draws the goose: upright when calm, neck out and wings flapping on the attack.
  draw() {
    const { x, y } = worldToPx(this.wx, this.wy);
    const flip = this.dir < 0;

    if (this.state === 'chase' || this.panicking) {
      PX.shadow(x + this.dir * 3, y, 18);
      PX.spr('goose_chase', x, y, { frame: floor(this.walkPhase / 1.6) % 2, flip });
      return;
    }

    let frame = 'stand';
    if (this.state === 'wander') frame = 'walk' + (floor(this.walkPhase / HALF_PI) % 4);
    if (this.honkTimer > 0) frame = this.state === 'wander' ? 'honk' + frame : 'honk';
    PX.shadow(x, y, 14);
    PX.spr('goose', x, y, { frame, flip });
  }
}

// I SPY card: the local menace strutting on the spot and letting out a honk.
CARD_ART.goose = (x, y, tick) => {
  const beat = tick % 200;
  let frame = 'walk' + (Math.floor(tick / 9) % 4);
  if (beat > 150) frame = beat % 24 < 14 ? 'honk' : 'stand';
  PX.shadow(x, y, 14);
  PX.spr('goose', x - 2, y, { frame });
};
