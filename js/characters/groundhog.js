// ================================================================
// File: groundhog.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the Groundhog class for a critter that emerges from
//   a hole, looks around nervously, occasionally speaks, then hides again.
//   Drawn as pixel art from the 'groundhog' sprites in js/art/animals_art.js.
// ================================================================

const GROUNDHOG_ROWS = 13;   // height of the groundhog sprite when fully up

// Groundhog class manages the digging/rising/looking/hiding states, head bob,
// random look direction, and speech bubble spawning for a burrowing critter.
class Groundhog {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

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
          const phrases = ['!', '...', '*sniff*', 'oh.', '?'];
          speechBubbles.push(new SpeechBubble(
            phrases[floor(random(phrases.length))],
            () => {
              const p = worldToPx(this.wx, this.wy);
              return { x: p.x, y: p.y - GROUNDHOG_ROWS - 2 };
            }
          ));
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

  // Draws the hole, then as many rows of the groundhog as have come up out
  // of it, then the dirt lip of the hole in front of him.
  draw() {
    const { x, y } = worldToPx(this.wx, this.wy);
    const holeAlpha = this.hole;
    PX.spr('groundhog_hole', x, y + 3, { frame: 'back', alpha: holeAlpha });

    // He bobs down a pixel now and then while looking around
    const bob = (this.state === 'looking' && sin(this.phase) > 0.7) ? 1 : 0;
    const rows = Math.round(this.emerge * GROUNDHOG_ROWS) - bob;
    if (rows > 0) {
      const pose = this.blink > 0 ? 'blink' : (this.lookDir === 0 ? 'front' : 'side');
      const flip = this.lookDir < 0;
      PX.spr('groundhog', x, y + 1, { frame: pose + rows, flip });
    }

    PX.spr('groundhog_hole', x, y + 3, { frame: 'front', alpha: holeAlpha });
  }
}
