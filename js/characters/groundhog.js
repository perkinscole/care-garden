// ================================================================
// File: groundhog.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the Groundhog class for a critter that emerges from
//   a hole, looks around nervously, occasionally speaks, then hides again.
//   Drawn as a 3D box animal and its hole (ANIMALS3.groundhog in
//   js/art/animals_art.js).
// ================================================================

// Groundhog class manages the digging/rising/looking/hiding states, head bob,
// random look direction, and speech bubble spawning for a burrowing critter.
class Groundhog {
  static g3 = true;      // drawn as a 3D box model (see docs/GARDEN_3D.md)

  constructor() {
    this.wx     = random(0.1, 0.9);
    this.wy     = random(0.2, 0.75);
    this.emerge = 0;      // 0 = underground, 1 = fully up
    this.hole   = 0;      // 0 = no hole yet, 1 = hole fully open
    this.state  = 'digging';   // digging | rising | looking | hiding | closing
    this.lookDir = 0;     // -1 left, 0 straight at us, 1 right
    this.lookTimer = floor(random(30, 60));
    this.stayTimer = floor(random(120, 300));
    this.blink = 0;       // frames left with eyes shut
    this.done  = false;
    this.phase = 0;       // for head bob
  }

  // Advances the groundhog through digging out, rising, looking around, and hiding back underground.
  update() {
    this.phase += 0.08;
    if (this.blink > 0) this.blink--;

    if (this.state === 'digging') {
      // the hole opens up first
      this.hole = min(this.hole + 0.06, 1.0);
      if (this.hole >= 1.0) this.state = 'rising';

    } else if (this.state === 'rising') {
      this.emerge = min(this.emerge + 0.03, 1.0);
      if (this.emerge >= 1.0) this.state = 'looking';

    } else if (this.state === 'looking') {
      this.stayTimer--;
      this.lookTimer--;
      if (this.lookTimer <= 0) {
        // glance left or right, or sometimes straight ahead with a blink
        const r = random();
        this.lookDir = r < 0.4 ? 1 : r < 0.8 ? -1 : 0;
        if (this.lookDir === 0) this.blink = 8;
        this.lookTimer = floor(random(20, 60));
        // occasionally say something
        if (random() < 0.3) {
          // (the bubble fades where it is once he has ducked back down)
          const phrases = ['!', '...', '*sniff*', 'oh.', '?'];
          PEOPLE.say(
            phrases[floor(random(phrases.length))],
            () => G3.artAt(this.wx, this.wy, ANIMALS3.HOG_TALL + 0.3),
            () => this.state === 'hiding' || this.state === 'closing' || this.done
          );
        }
      }
      if (this.stayTimer <= 0) {
        this.state = 'hiding';
        this.lookDir = 0;
      }

    } else if (this.state === 'hiding') {
      this.emerge = max(this.emerge - 0.04, 0.0);
      if (this.emerge <= 0) this.state = 'closing';

    } else if (this.state === 'closing') {
      // the empty hole lingers a moment, then grasses over
      this.hole = max(this.hole - 0.025, 0.0);
      if (this.hole <= 0) this.done = true;
    }
  }

  // Poses the hole (it opens out of the grass and closes again) and the
  // groundhog, who comes straight up out of it; the lawn hides the rest of him.
  draw() {
    const m = G3.model(this, ANIMALS3.groundhog), u = m.userData;
    G3.place(m, this.wx, this.wy, 0);
    u.hole.visible = this.hole > 0.02;
    u.hole.scale.set(this.hole, Math.max(0.05, this.hole), this.hole);

    // He bobs down a little now and then while looking around
    const bob = (this.state === 'looking' && sin(this.phase) > 0.7) ? 0.07 : 0;
    u.hog.visible = this.emerge > 0.01;
    u.hog.position.y = (this.emerge - 1) * (ANIMALS3.HOG_TALL + 0.05) - bob;
    // he turns his head to glance left and right
    u.head.rotation.y += (this.lookDir * 0.95 - u.head.rotation.y) * 0.3;
    u.skull.material[4] = this.blink > 0 ? u.faceShut : u.faceOpen;
  }
}
