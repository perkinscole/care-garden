// ================================================================
// File: groundhog.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: Defines the Groundhog class for a critter that emerges from
//   a hole, looks around nervously, occasionally speaks, then hides again.
// ================================================================

// Groundhog class manages the rising/looking/hiding states, head bob animation,
// random look direction, and speech bubble spawning for a burrowing critter.
class Groundhog {
  constructor() {
    this.wx     = random(0.1, 0.9);
    this.wy     = random(0.2, 0.75);
    this.emerge = 0;      // 0 = underground, 1 = fully up
    this.state  = 'rising';
    this.lookDir = 1;
    this.lookTimer = floor(random(30, 60));
    this.stayTimer = floor(random(120, 300));
    this.done  = false;
    this.phase = 0;       // for head bob
  }

  // Advances the groundhog through rising, looking around, and hiding back underground.
  update() {
    this.phase += 0.08;

    if (this.state === 'rising') {
      this.emerge = min(this.emerge + 0.03, 1.0);
      if (this.emerge >= 1.0) this.state = 'looking';

    } else if (this.state === 'looking') {
      this.stayTimer--;
      this.lookTimer--;
      if (this.lookTimer <= 0) {
        this.lookDir  = random() < 0.5 ? 1 : -1;
        this.lookTimer = floor(random(20, 60));
        // occasionally say something
        if (random() < 0.3) {
          const phrases = ['!', '...', '*sniff*', 'oh.', '?'];
          const ref = this;
          speechBubbles.push(new SpeechBubble(
            phrases[floor(random(phrases.length))],
            () => {
              const { sx, sy } = worldToScreen(ref.wx, ref.wy);
              const ds = depthScale(ref.wy);
              return { x: sx, y: sy - 30 * ds };
            }
          ));
        }
      }
      if (this.stayTimer <= 0) this.state = 'hiding';

    } else if (this.state === 'hiding') {
      this.emerge = max(this.emerge - 0.04, 0.0);
      if (this.emerge <= 0) this.done = true;
    }
  }

 // Draws the groundhog using canvas clipping so it appears to emerge from a hole in the ground.
 draw() {
  const { sx, sy } = worldToScreen(this.wx, this.wy);
  const ds = depthScale(this.wy);
  const sc = ds * 1.4;

  push();
  translate(sx, sy);

  // hole
  noStroke();
  fill(22, 30, 12, 200);
  ellipse(0, 0, 22 * sc, 10 * sc);

  const bob = this.state === 'looking' ? sin(this.phase) * 1.5 * sc : 0;
  translate(0, bob);

  const maxRise  = 20 * sc;   // ← reduced from 32
  const currentY = -(maxRise * this.emerge);

  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(-20 * sc, -80 * sc, 40 * sc, 80 * sc);
  drawingContext.clip();

  // body
  noStroke(); fill(28, 38, 42);
  ellipse(0, currentY + 18 * sc, 18 * sc, 22 * sc);

  // belly
  fill(32, 28, 58);
  ellipse(0, currentY + 22 * sc, 10 * sc, 14 * sc);

  // head — centered, lookDir only shifts eyes/nose not whole head
  fill(28, 38, 42);
  ellipse(0, currentY + 4 * sc, 16 * sc, 14 * sc);

  // ears — centered on head
  fill(28, 35, 38);
  ellipse(-4 * sc, currentY - 3 * sc, 5 * sc, 6 * sc);
  ellipse( 4 * sc, currentY - 3 * sc, 5 * sc, 6 * sc);
  fill(340, 35, 65);
  ellipse(-4 * sc, currentY - 3 * sc, 3 * sc, 4 * sc);
  ellipse( 4 * sc, currentY - 3 * sc, 3 * sc, 4 * sc);

  // eyes — both visible, shift slightly with lookDir
  noStroke(); fill(0, 0, 10);
  ellipse(-3 * sc + this.lookDir * 1 * sc, currentY + 1 * sc, 3 * sc, 3 * sc);
  ellipse( 3 * sc + this.lookDir * 1 * sc, currentY + 1 * sc, 3 * sc, 3 * sc);
  fill(0, 0, 90);
  ellipse(-2.5 * sc + this.lookDir * 1 * sc, currentY + 0.5 * sc, 1 * sc, 1 * sc);
  ellipse( 3.5 * sc + this.lookDir * 1 * sc, currentY + 0.5 * sc, 1 * sc, 1 * sc);

  // nose
  fill(340, 45, 55);
  ellipse(this.lookDir * 2 * sc, currentY + 4 * sc, 4 * sc, 2.5 * sc);

  // buck teeth
  noStroke(); fill(0, 0, 94);
  rect(-3 * sc + this.lookDir * 1 * sc, currentY + 6 * sc, 2.5 * sc, 4 * sc, 1);
  rect( 0.5 * sc + this.lookDir * 1 * sc, currentY + 6 * sc, 2.5 * sc, 4 * sc, 1);
  // gap between teeth
  fill(28, 38, 42);
  rect(-0.5 * sc + this.lookDir * 1 * sc, currentY + 6 * sc, 1 * sc, 3 * sc);

  drawingContext.restore();
  pop();
}
}