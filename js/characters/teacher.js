// ================================================================
// File: teacher.js
// Author: Cole Perkins
// Date Created: April 11, 2026
// Last Modified: April 12, 2026
// Description: Teacher characters that walk to/from the school during
//   dawn and dusk arrival/departure events. Each teacher has a random
//   appearance and can display a greeting speech bubble.
// ================================================================

// A teacher that walks toward or away from the school during arrival/departure
class Teacher {
  constructor(departing) {
    this.departing = departing || false;
    this.fromLeft = random() < 0.5;
    this.dir = this.fromLeft ? 1 : -1;
    this.speed = random(0.0025, 0.004);
    this.walkPhase = random(TWO_PI);
    this.done = false;
    this.spoken = false;
    this.name = TEACHER_NAMES[floor(random(TEACHER_NAMES.length))];

    // Appearance
    this.topHue = random([200, 210, 220, 280, 320, 340, 0, 15]);
    this.pantsHue = random([220, 230, 0]);
    this.pantsLit = random(20, 35);
    this.skinL = random(52, 78);
    this.hairHue = random(20, 40);
    this.hairL = random(18, 50);
    this.height = random(1.1, 1.35);
    this.isMale = this.name.startsWith('Mr.');

    if (this.departing) {
      // Start at school door, walk outward
      this.wx = 0.5 + random(-0.05, 0.05);
      this.wy = random(0.05, 0.15);
      this.twx = this.fromLeft ? -0.08 : 1.08;
      this.twy = random(0.3, 0.7);
      this.dir = this.twx < 0.5 ? -1 : 1;
    } else {
      // Start off-screen, walk toward school
      this.wx = this.fromLeft ? -0.08 : 1.08;
      this.wy = random(0.3, 0.7);
      this.twx = 0.5 + random(-0.05, 0.05);
      this.twy = random(0.03, 0.08);
    }
  }

  // Walk toward target, speak once, mark done when arrived
  update() {
    const dx = this.twx - this.wx;
    const dy = this.twy - this.wy;
    const dist = sqrt(dx * dx + dy * dy);

    if (dist > 0.02) {
      this.wx += (dx / dist) * this.speed;
      this.wy += (dy / dist) * this.speed;
      this.walkPhase += 0.18;
      this.dir = dx > 0 ? 1 : -1;
    } else {
      this.done = true;
    }

    // Speak once midway through walk
    if (!this.spoken && dist < 0.3) {
      this.spoken = true;
      if (random() < 0.5) {
        const msg = TEACHER_GREETINGS[floor(random(TEACHER_GREETINGS.length))];
        const self = this;
        speechBubbles.push(new SpeechBubble(msg, function() {
          const pos = worldToScreen(self.wx, self.wy);
          return { x: pos.sx, y: pos.sy };
        }));
      }
    }
  }

  // Draws the teacher at their world position with perspective scaling
  draw() {
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    const ds = depthScale(this.wy);
    push();
    translate(sx, sy);
    scale(ds * this.height * 1.4);
    drawTeacherShape(this.walkPhase, this.dir, this.topHue, this.pantsHue,
                     this.pantsLit, this.skinL, this.hairHue, this.hairL, this.isMale);
    pop();
  }
}

// Draws an adult teacher figure: slacks, button-up top, and styled hair
function drawTeacherShape(phase, dir, topHue, pantsHue, pantsLit, skinL, hairHue, hairL, isMale) {
  push();
  scale(dir, 1);

  const legSwing = sin(phase) * 0.35;

  // Legs
  push();
  noStroke();
  // Left leg
  push(); translate(-5, 0); rotate(legSwing);
  fill(pantsHue, 25, pantsLit);
  rect(-3, 0, 6, 24, 2);
  fill(0, 0, 18); rect(-3, 22, 7, 5, 1); // shoe
  pop();
  // Right leg
  push(); translate(5, 0); rotate(-legSwing);
  fill(pantsHue, 25, pantsLit);
  rect(-3, 0, 6, 24, 2);
  fill(0, 0, 18); rect(-4, 22, 7, 5, 1);
  pop();
  pop();

  // Torso / shirt
  fill(topHue, 40, 55); noStroke();
  rect(-12, -30, 24, 32, 3);
  // Collar
  fill(topHue, 30, 60);
  triangle(-3, -30, 0, -24, 3, -30);

  // Arms — swing opposite to legs for natural walk
  const armSwing = sin(phase + PI) * 0.3;
  fill(topHue, 40, 55); noStroke();
  // Left arm (swings opposite to left leg)
  push(); translate(-12, -28); rotate(armSwing);
  rect(-3, 0, 6, 22, 2);
  fill(30, 35, skinL); ellipse(0, 23, 6, 5); // hand
  pop();
  // Right arm
  push(); translate(12, -28); rotate(-armSwing);
  rect(-3, 0, 6, 22, 2);
  fill(30, 35, skinL); ellipse(0, 23, 6, 5);
  pop();

  // Neck
  fill(30, 35, skinL); noStroke();
  rect(-3, -34, 6, 6);

  // Head
  fill(30, 35, skinL);
  ellipse(0, -42, 20, 22);

  // Hair
  fill(hairHue, 35, hairL); noStroke();
  if (isMale) {
    // Short hair
    arc(0, -44, 22, 18, PI, TWO_PI);
    rect(-11, -44, 22, 4, 2);
  } else {
    // Longer hair
    arc(0, -44, 22, 20, PI, TWO_PI);
    ellipse(-10, -40, 6, 16);
    ellipse(10, -40, 6, 16);
  }

  // Eyes
  fill(0, 0, 20);
  ellipse(-4, -42, 2.5, 3);
  ellipse(4, -42, 2.5, 3);

  // Smile
  noFill(); stroke(0, 0, 30); strokeWeight(1);
  arc(0, -38, 7, 4, 0.1, PI - 0.1);

  pop();
}
