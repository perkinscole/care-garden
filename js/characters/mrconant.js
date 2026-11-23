// ================================================================
// File: mrconant.js
// Author: Cole Perkins
// Date Created: April 12, 2026
// Last Modified: November 22, 2026
// Description: Mr. Conant, head of the CARE team. A beloved teacher
//   who walks in occasionally, shares an encouraging phrase, then exits.
//   Shows up less frequently than Mr. Perkins. A 3D box person built by
//   PEOPLE3 (js/g3_people.js): neat dark hair, light blue shirt, blue tie
//   (he always wears a tie) and dark slacks.
// ================================================================

// Mr. Conant's look: dark side-parted hair, light blue shirt, blue tie, dark slacks.
function conantLook() {
  return PEOPLE.look({
    kind: 'adult', skin: 0, hair: 'neat', hairCol: PEOPLE.BLACK,
    top: PEOPLE.SOFTS[0], collar: PAL.white, tie: PAL.bl3,
    bottom: PEOPLE.CHARCOAL, belt: PAL.black, shoes: PAL.black,
  });
}

// Mr. Conant — walks in from off-screen, speaks, then walks back out
class MrConant {
  static g3 = true;      // drawn as a 3D model (see docs/GARDEN_3D.md)

  constructor() {
    this.fromLeft = random() < 0.5;
    this.wx    = this.fromLeft ? -0.05 : 1.05;
    this.wy    = random(0.55, 0.85);
    this.dir   = this.fromLeft ? 1 : -1;
    this.speed = 0.0022;
    this.walkPhase = 0;
    this.state = 'enter';
    this.idleTimer = 0;
    this.spoken = false;
    this.done = false;
    this.targetX = random(0.25, 0.75);
    this.look = conantLook();
  }

  // Advances through enter, speak, and exit states
  update() {
    const fromX = this.wx;
    this.step();
    this.walkPhase += walkStride(this.wx - fromX, 0, PEOPLE.STRIDE_ADULT);
  }

  // One frame of the enter, speak, exit state machine.
  step() {
    if (this.state === 'enter') {
      const dx = this.targetX - this.wx;
      this.dir = dx > 0 ? 1 : -1;
      this.wx += this.dir * this.speed;

      if (abs(dx) < 0.03) {
        this.state = 'speak';
        this.idleTimer = 210; // 3.5 seconds
        this.walkPhase = 0;

        if (!this.spoken) {
          this.spoken = true;
          const self = this;
          const phrase = CONANT_PHRASES[floor(random(CONANT_PHRASES.length))];
          PEOPLE.say(phrase, () => PEOPLE.bubblePos(self.wx, self.wy, self.look), () => self.done);
        }
      }

    } else if (this.state === 'speak') {
      this.idleTimer--;
      if (this.idleTimer <= 0) {
        this.state = 'exit';
        this.dir = this.fromLeft ? -1 : 1;
      }

    } else if (this.state === 'exit') {
      this.wx += this.dir * this.speed * 1.2;
      if (this.wx < -0.1 || this.wx > 1.1) this.done = true;
    }
  }

  // Poses Mr. Conant walking, or standing turned toward us and talking with his hand out.
  draw() {
    const m = PEOPLE3.model(this, this.dir * G3.YAW.right);
    const moving = PEOPLE3.move(m, this.wx, this.wy, { yaw: this.dir * 0.45 });
    const side = PEOPLE3.nearSide(m);
    const talking = this.state === 'speak';
    PEOPLE3.pose(m, {
      walk: moving ? this.walkPhase : null, side,
      arm: talking ? 'talk' : 'walk',                    // he gestures while he talks
      look: talking ? 0.25 * Math.sin(G3.frame * 0.04) : 0,
      face: PEOPLE.face(G3.frame, 11, 'smile'),
    });
  }
}

// I SPY card: Mr. Conant standing, hand out as he talks.
G3.cardArt('mrconant', () => {
  const m = PEOPLE3.build(conantLook());
  return PEOPLE3.pose(m, { side: 'L', arm: 'hold', arm2: 'down', snap: true });
}, { w: 32, h: 52 });
