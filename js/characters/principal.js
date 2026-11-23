// ================================================================
// File: principal.js
// Author: Cole Perkins
// Date Created: April 11, 2026
// Last Modified: November 22, 2026
// Description: Ms. Manning, the principal of Robert Adams Middle School.
//   Appears at the school door during dawn, dusk, and rain to greet
//   students and welcome them inside. Drawn as pixel art from the shared
//   people sprites in js/art/people_art.js: blonde bob, plum blazer and
//   skirt, white blouse, waving.
// ================================================================

// Ms. Manning's look: blonde bob, no glasses, blazer and skirt.
function principalLook() {
  return PEOPLE.look({
    kind: 'skirt', skin: 1, hair: 'bob', hairCol: PEOPLE.BLONDE,
    top: PX.ramp(322, 45, 42), collar: PAL.white, tie: PAL.ye2,   // gold necklace
    bottom: PX.ramp(322, 42, 27), legs: PEOPLE.COCOA, shoes: PAL.black,
  });
}

// Principal character that stands at the school door during arrival/departure events
class Principal {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor(reason) {
    // On the sidewalk between the two pairs of main doors, so that people
    // going in and out pass on either side of her
    this.wx = 0.5;
    this.wy = 0.06;
    this.dir = 1;
    this.state = 'appear';
    this.reason = reason; // 'dawn', 'dusk', 'rain'
    this.alpha = 0;
    this.timer = 0;
    this.spoken = false;
    this.done = false;
    this.walkPhase = 0;
    this.look = principalLook();
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
        // (if she steps back inside while it is showing, the bubble stays where it was and fades)
        PEOPLE.say(msg, () => PEOPLE.bubblePos(self.wx, self.wy, self.look),
                   () => self.state === 'exit' || self.done);
      }
      this.timer--;
      if (this.timer <= 0) {
        this.state = 'exit';
      }
    }

    if (this.state === 'exit') {
      // Step back through the doors (decrease wy toward 0), fading as she goes
      this.wy -= 0.0012;
      this.walkPhase += 0.2;
      this.alpha = max(0, this.alpha - 12);
      if (this.wy <= PEOPLE.DOOR_WY || this.alpha <= 0) this.done = true;
    }
  }

  // Draws the principal at the school door, waving while she welcomes everyone
  draw() {
    const a = this.alpha / 255;
    if (a <= 0.02) return;
    const { x, y } = worldToPx(this.wx, this.wy);
    let leg = 'stand', arm = 'down';
    if (this.state === 'welcome') {
      arm = PX.anim(2, 9) ? 'wave1' : 'wave2';
    } else if (this.state === 'exit') {
      leg = PEOPLE.backFrame(this.walkPhase);   // seen from behind, going back in
    }
    const c = PX.c, prevAlpha = c.globalAlpha;
    c.globalAlpha = prevAlpha * a;
    PX.shadow(x, y, 12);
    PEOPLE.draw(x, y, this.look, this.dir, leg, arm, PEOPLE.face(PX.tick, 5, 'smile'));
    c.globalAlpha = prevAlpha;
  }
}

// I SPY card: Ms. Manning waving hello.
CARD_ART.principal = (x, y, tick) => {
  const L = CARD_ART._principalLook || (CARD_ART._principalLook = principalLook());
  const waving = tick % 220 < 150;
  PX.shadow(x, y, 12);
  PEOPLE.draw(x, y, L, 1, 'stand', waving ? (Math.floor(tick / 9) % 2 ? 'wave1' : 'wave2') : 'down',
              PEOPLE.face(tick, 5, 'smile'));
};
