// ================================================================
// File: principal.js
// Author: Cole Perkins
// Date Created: April 11, 2026
// Last Modified: November 22, 2026
// Description: Ms. Manning, the principal of Robert Adams Middle School.
//   Appears at the school door during dawn, dusk, and rain to greet
//   students and welcome them inside. A 3D box person built by PEOPLE3
//   (js/g3_people.js): blonde bob, plum blazer and skirt, white blouse,
//   waving.
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
  static g3 = true;      // drawn as a 3D model (see docs/GARDEN_3D.md)

  constructor(reason) {
    // She steps out of one of the main doorways and stands on the sidewalk
    // between the two, so that people going in and out pass on either side
    this.spotWx = 0.5;
    this.spotWy = 0.06;
    this.wx = PEOPLE.doorX();
    this.wy = PEOPLE.DOOR_IN_WY;
    this.emerging = true;
    this.entering = false;
    this.speed = 0.002;
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

  // Updates state: step out, speak, then walk back into school
  update() {
    if (this.state === 'appear') {
      this.alpha = min(this.alpha + 8, 255);
      // out of the doorway, then a few steps along to her spot
      let there = false;
      if (!PEOPLE.comeOut(this, this.speed)) {
        const dx = this.spotWx - this.wx, dy = this.spotWy - this.wy;
        const d = sqrt(dx * dx + dy * dy);
        if (d < 0.003) there = true;
        else {
          const st = min(this.speed, d);
          this.wx += dx / d * st;
          this.wy += dy / d * st;
          this.walkPhase += walkStride(dx / d * st, dy / d * st, PEOPLE.STRIDE_ADULT);
        }
      }
      if (there && this.alpha >= 255) {
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
      // Back along the sidewalk and in through the nearer doorway
      const fromX = this.wx, fromY = this.wy;
      if (PEOPLE.goIn(this, this.speed)) this.done = true;
      this.walkPhase += walkStride(this.wx - fromX, this.wy - fromY, PEOPLE.STRIDE_ADULT);
    }
  }

  // Poses the principal on the sidewalk by the doors, facing us and waving
  // while she welcomes everyone, looking from side to side
  draw() {
    const m = PEOPLE3.model(this, 0);
    const moving = PEOPLE3.move(m, this.wx, this.wy, { yaw: 0.15 });
    const welcoming = this.state === 'welcome';
    PEOPLE3.pose(m, {
      walk: moving ? this.walkPhase : null,
      side: 'L', arm: welcoming ? 'wave' : 'walk',
      look: welcoming ? 0.45 * Math.sin(G3.frame * 0.03) : 0,
      face: PEOPLE.face(G3.frame, 5, 'smile'),
    });
  }
}

// I SPY card: Ms. Manning waving hello.
G3.cardArt('principal', () => {
  const m = PEOPLE3.build(principalLook());
  return PEOPLE3.pose(m, { side: 'L', arm: 'wave', arm2: 'down', t: 2, snap: true });
}, { w: 32, h: 52 });
