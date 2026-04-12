// ================================================================
// File: mrperkins.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: Defines the MrPerkins class for a businessman character who
//   walks in from off-screen, delivers a speech bubble, then exits.
// ================================================================

// MrPerkins class manages the enter/speak/exit lifecycle for a cameo character
// who walks to a random position, says a phrase, then walks back off-screen.
class MrPerkins {
  constructor() {
    this.fromLeft = random() < 0.5;
    this.wx    = this.fromLeft ? -0.05 : 1.05;
    this.wy    = random(0.55, 0.85);
    this.dir   = this.fromLeft ? 1 : -1;
    this.speed = 0.003;
    this.walkPhase = 0;
    this.state = 'enter';  // enter | speak | exit
    this.idleTimer = 0;
    this.spoken = false;
    this.done = false;
    this.targetX = random(0.25, 0.75); // walk to middle area
  }

  // Advances MrPerkins through enter, speak, and exit states each frame.
  update() {
    if (this.state === 'enter') {
      const dx = this.targetX - this.wx;
      this.dir = dx > 0 ? 1 : -1;
      this.wx += (dx / abs(dx)) * this.speed;
      this.walkPhase += 0.18;

      if (abs(dx) < 0.03) {
        this.state = 'speak';
        this.idleTimer = 180; // 3 seconds
        this.walkPhase = 0;

        if (!this.spoken) {
          this.spoken = true;
          const pRef = this;
          const phrase = PERKINS_PHRASES[floor(random(PERKINS_PHRASES.length))];
          speechBubbles.push(new SpeechBubble(phrase, () => {
            const { sx, sy } = worldToScreen(pRef.wx, pRef.wy);
            const ds = depthScale(pRef.wy);
            return { x: sx, y: sy - 55 * ds };
          }));
        }
      }

    } else if (this.state === 'speak') {
      this.idleTimer--;
      if (this.idleTimer <= 0) {
        this.state = 'exit';
        // walk back off the same side he came from
        this.dir = this.fromLeft ? -1 : 1;
      }

    } else if (this.state === 'exit') {
      this.wx += this.dir * this.speed * 1.2;
      this.walkPhase += 0.18;
      if (this.wx < -0.1 || this.wx > 1.1) this.done = true;
    }
  }

  // Renders MrPerkins at his depth-scaled screen position.
  draw() {
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    const ds = depthScale(this.wy);
    push();
    translate(sx, sy);
    scale(ds * 2.2);
    drawMrPerkinsShape(this.walkPhase, this.state, this.dir);
    pop();
  }
}

// Draws the MrPerkins figure: white shirt, red tie, khaki pants, bald head, and beard.
function drawMrPerkinsShape(phase, state, dir) {
  const walking = (state === 'enter' || state === 'exit');
  push();
  scale(dir, 1);

  const lSwing = walking ? sin(phase) * 8 : 0;

  // ── Legs — khaki pants ────────────────────────
  strokeWeight(4);
  stroke(38, 40, 58);
  noFill();
  line( 3, -2,  3 + lSwing, 20);
  line(11, -2, 11 - lSwing, 20);

  // shoes
  noStroke();
  fill(25, 35, 18);
  ellipse( 3 + lSwing, 22, 9, 5);
  ellipse(11 - lSwing, 22, 9, 5);

  // ── Body — white shirt ────────────────────────
  noStroke();
  fill(0, 0, 93);
  rect(-6, -22, 25, 22, 3);

  // ── Red tie ───────────────────────────────────
  fill(0, 82, 48);
  triangle(6, -22, 9, -22, 8, -10);
  // tie knot
  fill(0, 78, 38);
  ellipse(7.5, -22, 5, 4);

  // shirt collar
  fill(0, 0, 96);
  triangle(3, -22, 7, -22, 4, -17);
  triangle(9, -22, 13, -22, 11, -17);

  // ── Arms — white shirt sleeves ────────────────
  fill(0, 0, 91);
  push(); translate(-6, -18);
  rotate(walking ? sin(phase + PI) * 0.3 : 0.1);
  rect(-4, 0, 7, 14, 3); pop();
  push(); translate(18, -18);
  rotate(walking ? sin(phase) * 0.3 : -0.1);
  rect(-3, 0, 7, 14, 3); pop();

  // hands
  noStroke();
  fill(28, 38, 52); // medium-dark skin
  ellipse(-3, -6, 7, 7);
  ellipse(22, -5, 7, 7);

  // ── Head ──────────────────────────────────────
  fill(28, 38, 52);
  ellipse(7, -36, 20, 20);

  // ── Bald head — clean shaved top ──────────────
  // slight highlight on the dome
  fill(28, 35, 58);
  ellipse(7, -41, 14, 8);

  // ── Beard ─────────────────────────────────────
  fill(22, 18, 18); // very dark beard
  arc(7, -32, 16, 12, 0, PI, CHORD);
  ellipse( 0, -34, 5, 7);
  ellipse(14, -34, 5, 7);
  // mustache
  fill(22, 15, 15);
  ellipse(5,  -35, 6, 3);
  ellipse(10, -35, 6, 3);

  // ── Eyes ──────────────────────────────────────
  noStroke();
  fill(0, 0, 12);
  ellipse(4,  -38, 3.5, 3.5);
  ellipse(10, -38, 3.5, 3.5);
  fill(0, 0, 90);
  ellipse(4.8, -38.5, 1.2, 1.2);
  ellipse(10.8,-38.5, 1.2, 1.2);

  // ── Smile ─────────────────────────────────────
  noFill();
  stroke(22, 15, 15);
  strokeWeight(1.2);
  arc(7, -33, 8, 5, 0.1, PI - 0.1);

  pop();
}
// ── Kids ─────────────────────────────────────────────

