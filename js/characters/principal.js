// ================================================================
// File: principal.js
// Author: Cole Perkins
// Date Created: April 11, 2026
// Last Modified: April 12, 2026
// Description: Ms. Manning, the principal of Robert Adams Middle School.
//   Appears at the school door during dawn, dusk, and rain to greet
//   students and welcome them inside.
// ================================================================

// Principal character that stands at the school door during arrival/departure events
class Principal {
  constructor(reason) {
    this.wx = 0.5;
    this.wy = 0.05;
    this.dir = 1;
    this.state = 'appear';
    this.reason = reason; // 'dawn', 'dusk', 'rain'
    this.alpha = 0;
    this.timer = 0;
    this.spoken = false;
    this.done = false;
    this.walkPhase = 0;
  }

  // Updates state: fade in, speak, then walk back into school
  update() {
    if (this.state === 'appear') {
      this.alpha = min(this.alpha + 8, 255);
      if (this.alpha >= 255) {
        this.state = 'welcome';
        this.timer = 360;
      }
    }

    if (this.state === 'welcome') {
      if (!this.spoken) {
        this.spoken = true;
        let msg;
        if (this.reason === 'rain') {
          msg = "Come on in, kids!";
        } else if (this.reason === 'dusk') {
          msg = "Have a great evening!";
        } else {
          msg = PRINCIPAL_PHRASES[floor(random(PRINCIPAL_PHRASES.length))];
        }
        const self = this;
        speechBubbles.push(new SpeechBubble(msg, function() {
          const pos = worldToScreen(self.wx, self.wy);
          return { x: pos.sx, y: pos.sy };
        }));
      }
      this.walkPhase += 0.02;
      this.timer--;
      if (this.timer <= 0) {
        this.state = 'exit';
      }
    }

    if (this.state === 'exit') {
      // Walk backward toward school (decrease wy toward 0)
      this.wy -= 0.002;
      this.walkPhase += 0.18;
      // Shrink as she goes into the distance
      if (this.wy <= 0.01) this.done = true;
    }
  }

  // Draws the principal at the school door
  draw() {
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    const ds = depthScale(this.wy);
    push();
    translate(sx, sy);
    scale(ds * 2.2);
    drawPrincipalShape(this.walkPhase, this.state, this.dir);
    pop();
  }
}

// Draws Ms. Manning: professional female figure with blazer, skirt, and styled hair
function drawPrincipalShape(phase, state, dir) {
  push();
  scale(dir, 1);

  // Legs
  const legSwing = sin(phase) * 0.1;
  push();
  fill(25, 30, 25); noStroke();
  // Left leg
  push(); translate(-6, 0); rotate(legSwing);
  rect(-3, 0, 6, 22, 2); // leg
  fill(0, 0, 15); rect(-3, 20, 7, 5, 1); // shoe
  pop();
  // Right leg
  push(); translate(6, 0); rotate(-legSwing);
  rect(-3, 0, 6, 22, 2);
  fill(0, 0, 15); rect(-4, 20, 7, 5, 1);
  pop();
  pop();

  // Skirt
  fill(320, 35, 30); noStroke();
  beginShape();
  vertex(-12, -2);
  vertex(12, -2);
  vertex(14, 12);
  vertex(-14, 12);
  endShape(CLOSE);

  // Blazer / torso
  fill(320, 40, 35); noStroke();
  rect(-13, -28, 26, 28, 3);
  // Lapels
  fill(320, 30, 28);
  triangle(-4, -28, -4, -14, -12, -28);
  triangle(4, -28, 4, -14, 12, -28);
  // Blouse underneath
  fill(0, 0, 92);
  rect(-4, -26, 8, 16, 1);

  // Necklace
  fill(45, 70, 55);
  ellipse(0, -14, 4, 3);

  // Arms
  const armSwing = sin(phase) * 0.15;
  fill(320, 40, 35); noStroke();
  // Left arm
  push(); translate(-13, -26); rotate(-0.1 + armSwing);
  rect(-4, 0, 7, 22, 2);
  fill(50, 40, 65); ellipse(-1, 23, 6, 5); // hand
  pop();
  // Right arm — waving high overhead during welcome
  push(); translate(13, -26);
  if (state === 'welcome') {
    rotate(-2.2 + sin(t * 0.12) * 0.4); // arm raised high, waving side to side
  } else {
    rotate(0.1 - armSwing);
  }
  rect(-3, 0, 7, 22, 2);
  fill(50, 40, 65); ellipse(0, 23, 6, 5);
  pop();

  // Neck
  fill(30, 35, 65); noStroke();
  rect(-3, -32, 6, 6);

  // Head
  fill(30, 35, 65);
  ellipse(0, -40, 22, 24);

  // Hair — blonde styled bob
  fill(42, 65, 65); noStroke();
  arc(0, -42, 24, 22, PI, TWO_PI); // top
  // Side hair
  ellipse(-11, -38, 6, 14);
  ellipse(11, -38, 6, 14);

  // Eyes
  fill(0, 0, 20);
  ellipse(-4, -40, 3, 3.5);
  ellipse(4, -40, 3, 3.5);
  // Pupils
  fill(0, 0, 95);
  ellipse(-3.5, -40.5, 1.2, 1.2);
  ellipse(4.5, -40.5, 1.2, 1.2);

  // Smile
  noFill(); stroke(0, 0, 30); strokeWeight(1.2);
  arc(0, -36, 8, 5, 0.1, PI - 0.1);

  pop();
}
