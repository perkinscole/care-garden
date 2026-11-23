// ================================================================
// File: rabbit.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the Rabbit class for rabbits that hop across the
//   screen from one side to the other, moving faster during storms.
// ================================================================

// Rabbit class manages a transient rabbit that hops across the garden in bursts,
// with increased speed during storms, and removes itself after crossing the screen.
class Rabbit {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor() {
    this.fromLeft = random() < 0.5;
    this.wx   = this.fromLeft ? -0.05 : 1.05;
    this.wy   = random(0.25, 0.45);  // below sidewalk area
    this.dir  = this.fromLeft ? 1 : -1;
    this.speed = random(0.0016, 0.003);
    this.hopPhase = 0;
    this.hopTimer = 0;
    this.hopping  = false;
    this.done     = false;
  }

  // Advances the rabbit's hop cycle each frame, with faster continuous hopping in storms.
  update() {
    if (weatherState === 'stormy') {
      // storm — hop continuously and fast
      this.hopping = true;
      this.hopPhase += 0.45;
      this.wx += this.dir * this.speed * 3.5;
    } else {
      // normal rhythm — short bursts of hops with pauses to sniff the air
      this.hopTimer--;
      if (this.hopTimer <= 0) {
        this.hopping = !this.hopping;
        this.hopTimer = this.hopping ? floor(random(20, 44)) : floor(random(25, 70));
        if (this.hopping) this.hopPhase = 0;
      }
      if (this.hopping) {
        this.wx += this.dir * this.speed;
        this.hopPhase += 0.28;
      }
    }
    if (this.wx < -0.12 || this.wx > 1.12) this.done = true;
  }

  // Draws the rabbit: sitting when still, crouch → leap while hopping.
  draw() {
    const { x, y } = worldToPx(this.wx, this.wy);
    // Each PI of hopPhase is one hop; the rabbit is airborne in the middle of it
    const arc = this.hopping ? abs(sin(this.hopPhase)) : 0;
    const lift = Math.round(arc * 5);
    const frame = !this.hopping ? 'sit' : (arc > 0.35 ? 'leap' : 'crouch');
    PX.shadow(x, y, 12 - lift);
    PX.spr('rabbit', x, y - lift, { frame, flip: this.dir < 0 });
  }
}
