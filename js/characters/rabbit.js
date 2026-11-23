// ================================================================
// File: rabbit.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the Rabbit class for rabbits that hop across the
//   screen from one side to the other, moving faster during storms.
//   Drawn as a 3D box animal (ANIMALS3.rabbit in js/art/animals_art.js).
// ================================================================

// Rabbit class manages a transient rabbit that hops across the garden in bursts,
// with increased speed during storms, and removes itself after crossing the screen.
class Rabbit {
  static g3 = true;      // drawn as a 3D box model (see docs/GARDEN_3D.md)

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

  // Poses the rabbit: sitting up when still, stretched out in the air while hopping.
  draw() {
    const m = G3.model(this, ANIMALS3.rabbit), u = m.userData;
    // Each PI of hopPhase is one hop; the rabbit is airborne in the middle of it
    const arc = this.hopping ? abs(sin(this.hopPhase)) : 0;
    G3.place(m, this.wx, this.wy, arc * 0.5);
    m.rotation.y = this.dir < 0 ? -1.3 : 1.3;        // side on, a little toward us
    // it takes off nose up and comes down nose first
    const through = this.hopping ? (this.hopPhase % PI) / PI : 0.5;
    u.rig.rotation.x = this.hopping ? (through - 0.5) * 0.8 : -0.12;
    u.hind.rotation.x = arc * 0.9;                   // hind feet kick out behind
    u.fore.rotation.x = -arc * 0.8;                  // front paws reach forward
    // ears up and twitching at rest, laid back in the air
    const twitch = !this.hopping && sin(frameCount * 0.13) > 0.92 ? 0.25 : 0;
    u.ears[0].rotation.set(-0.1 - arc * 0.9, 0, -0.08 - twitch);
    u.ears[1].rotation.set(-0.1 - arc * 0.9, 0, 0.08);
    u.head.rotation.x = this.hopping ? 0 : -0.1 + sin(frameCount * 0.3) * 0.03;   // sniffing the air
  }
}
