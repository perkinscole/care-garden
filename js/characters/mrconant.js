// ================================================================
// File: mrconant.js
// Author: Cole Perkins
// Date Created: April 12, 2026
// Last Modified: April 12, 2026
// Description: Mr. Conant, head of the CARE team. A beloved teacher
//   who walks in occasionally, shares an encouraging phrase, then exits.
//   Shows up less frequently than Mr. Perkins.
// ================================================================

// Mr. Conant — walks in from off-screen, speaks, then walks back out
class MrConant {
  constructor() {
    this.fromLeft = random() < 0.5;
    this.wx    = this.fromLeft ? -0.05 : 1.05;
    this.wy    = random(0.55, 0.85);
    this.dir   = this.fromLeft ? 1 : -1;
    this.speed = 0.003;
    this.walkPhase = 0;
    this.state = 'enter';
    this.idleTimer = 0;
    this.spoken = false;
    this.done = false;
    this.targetX = random(0.25, 0.75);
  }

  // Advances through enter, speak, and exit states
  update() {
    if (this.state === 'enter') {
      const dx = this.targetX - this.wx;
      this.dir = dx > 0 ? 1 : -1;
      this.wx += (dx / abs(dx)) * this.speed;
      this.walkPhase += 0.18;

      if (abs(dx) < 0.03) {
        this.state = 'speak';
        this.idleTimer = 210; // 3.5 seconds
        this.walkPhase = 0;

        if (!this.spoken) {
          this.spoken = true;
          const self = this;
          const phrase = CONANT_PHRASES[floor(random(CONANT_PHRASES.length))];
          speechBubbles.push(new SpeechBubble(phrase, () => {
            const { sx, sy } = worldToScreen(self.wx, self.wy);
            const ds = depthScale(self.wy);
            return { x: sx, y: sy - 55 * ds };
          }));
        }
      }

    } else if (this.state === 'speak') {
      this.idleTimer--;
      if (this.idleTimer <= 0) {
        this.state = 'exit';
        this.dir = this.fromLeft ? -1 : 1;
      }

    } else if (this.state === 'exit') {
      this.wx += this.dir * this.speed * 1.2;
      this.walkPhase += 0.18;
      if (this.wx < -0.1 || this.wx > 1.1) this.done = true;
    }
  }

  // Renders Mr. Conant at his depth-scaled screen position
  draw() {
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    const ds = depthScale(this.wy);
    push();
    translate(sx, sy);
    scale(ds * 2.2);
    drawConantShape(this.walkPhase, this.state, this.dir);
    pop();
  }
}

// Draws Mr. Conant: white guy, dark hair, always wears a tie
function drawConantShape(phase, state, dir) {
  const walking = (state === 'enter' || state === 'exit');
  push();
  scale(dir, 1);

  const lSwing = walking ? sin(phase) * 8 : 0;

  // Legs — dark slacks
  strokeWeight(4);
  stroke(220, 20, 22);
  noFill();
  line( 3, -2,  3 + lSwing, 20);
  line(11, -2, 11 - lSwing, 20);

  // Shoes
  noStroke();
  fill(0, 0, 15);
  ellipse( 3 + lSwing, 22, 9, 5);
  ellipse(11 - lSwing, 22, 9, 5);

  // Body — button-up shirt
  noStroke();
  fill(210, 30, 75);
  rect(-6, -22, 25, 22, 3);

  // Tie — blue
  fill(220, 65, 42);
  triangle(6, -22, 9, -22, 8, -10);
  // Tie knot
  fill(220, 60, 35);
  ellipse(7.5, -22, 5, 4);

  // Collar
  fill(210, 25, 82);
  triangle(3, -22, 7, -22, 4, -17);
  triangle(9, -22, 13, -22, 11, -17);

  // Arms — shirt sleeves (opposite swing to legs)
  fill(210, 30, 75);
  push(); translate(-6, -18);
  rotate(walking ? sin(phase + PI) * 0.3 : 0.1);
  rect(-4, 0, 7, 14, 3); pop();
  push(); translate(18, -18);
  rotate(walking ? sin(phase) * 0.3 : -0.1);
  rect(-3, 0, 7, 14, 3); pop();

  // Hands — light skin
  noStroke();
  fill(25, 30, 78);
  ellipse(-3, -6, 7, 7);
  ellipse(22, -5, 7, 7);

  // Neck
  fill(25, 30, 78);
  rect(4, -26, 6, 5);

  // Head — light skin
  fill(25, 30, 78);
  ellipse(7, -36, 20, 20);

  // Hair — dark, full head
  fill(22, 40, 14); noStroke();
  arc(7, -38, 21, 16, PI, TWO_PI);

  // Eyes
  noStroke();
  fill(0, 0, 12);
  ellipse(4,  -37, 3, 3.5);
  ellipse(10, -37, 3, 3.5);
  fill(0, 0, 90);
  ellipse(4.8, -37.5, 1.2, 1.2);
  ellipse(10.8, -37.5, 1.2, 1.2);

  // Eyebrows
  stroke(22, 30, 18); strokeWeight(1.5);
  line(2, -39.5, 6, -40);
  line(9, -40, 13, -39.5);

  // Smile
  noFill();
  stroke(0, 0, 40);
  strokeWeight(1.2);
  arc(7, -33, 8, 5, 0.1, PI - 0.1);

  pop();
}
