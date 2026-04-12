// ================================================================
// File: rabbit.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: Defines the Rabbit class for rabbits that hop across the
//   screen from one side to the other, moving faster during storms.
// ================================================================

// Rabbit class manages a transient rabbit that hops across the garden in bursts,
// with increased speed during storms, and removes itself after crossing the screen.
class Rabbit {
  constructor() {
    this.fromLeft = random() < 0.5;
    this.wx   = this.fromLeft ? -0.05 : 1.05;
    this.wy   = random(0.25, 0.45);  // below sidewalk area
    this.dir  = this.fromLeft ? 1 : -1;
    this.speed = random(0.0008, 0.0015);
    this.hopPhase = 0;
    this.hopTimer = 0;
    this.hopping  = false;
    this.done     = false;
  }

  // Advances the rabbit's hop cycle each frame, with faster continuous hopping in storms.
  update() {
    // hop rhythm — move in short bursts with pauses
    this.hopTimer--;
    if (this.hopTimer <= 0) {
      this.hopping = !this.hopping;
      this.hopTimer = this.hopping ? floor(random(18, 30)) : floor(random(30, 80));
    }
    
    const isStormy = weatherState === 'stormy';

  // storm — hop continuously and fast
  if (isStormy) {
    this.hopping = true;
    this.hopPhase += 0.45;
    this.wx += this.dir * this.speed * 6;
  } else {
    // normal hop rhythm
    this.hopTimer--;
    if (this.hopTimer <= 0) {
      this.hopping = !this.hopping;
      this.hopTimer = this.hopping ? floor(random(18, 30)) : floor(random(30, 80));
    }
    if (this.hopping) {
      this.wx += this.dir * this.speed;
      this.hopPhase += 0.28;
    }
  }

  if (this.wx < -0.12 || this.wx > 1.12) this.done = true;

    if (this.hopping) {
      this.wx += this.dir * this.speed;
      this.hopPhase += 0.28;
    }

    if (this.wx < -0.12 || this.wx > 1.12) this.done = true;
  }

  // Draws the rabbit inline: body, head, ears, tail, eye, nose, and visible legs when hopping.
  draw() {
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    const ds = depthScale(this.wy);
    const sc = ds * 1.2;
    const hop = this.hopping ? abs(sin(this.hopPhase)) * -8 : 0;

    push();
    translate(sx, sy + hop);
    scale(this.dir, 1);

    noStroke();

    // body
    fill(0, 0, 82);
    ellipse(0, -6, 14, 10);

    // head
    ellipse(7, -12, 9, 8);

    // ears — upright when still, flat when hopping
    const earLean = this.hopping ? 0.3 : 0;
    fill(0, 0, 82);
    push(); translate(5, -16); rotate(-earLean);
    ellipse(0, 0, 3, 8);
    pop();
    push(); translate(8, -16); rotate(earLean);
    ellipse(0, 0, 3, 8);
    pop();
    // inner ear
    fill(340, 35, 80);
    push(); translate(5, -16); rotate(-earLean);
    ellipse(0, 0, 1.5, 5);
    pop();
    push(); translate(8, -16); rotate(earLean);
    ellipse(0, 0, 1.5, 5);
    pop();

    // tail
    fill(0, 0, 96);
    ellipse(-7, -7, 5, 5);

    // eye
    fill(0, 0, 15);
    ellipse(10, -13, 2, 2);

    // nose
    fill(340, 40, 70);
    ellipse(12, -12, 2, 1.5);

    // back legs visible when hopping
    if (this.hopping) {
      stroke(0, 0, 72);
      strokeWeight(2);
      line(-4, -3, -6, 3);
      line( 2, -3,  4, 3);
      noStroke();
    }

    pop();
  }
}


