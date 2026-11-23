// ================================================================
// File: mrperkins.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the MrPerkins class for the creator of the garden, who
//   walks in from off-screen, delivers a speech bubble, then exits. A 3D box
//   person built by PEOPLE3 (js/g3_people.js): bald head, dark beard, white
//   shirt, red tie and khakis.
// ================================================================

// Mr. Perkins' look: bald, dark beard, white shirt, red tie, khaki trousers.
function perkinsLook() {
  return PEOPLE.look({
    kind: 'adult', skin: 3, hair: null, beard: PEOPLE.BLACK,
    top: PEOPLE.WHITE, tie: PAL.re2, bottom: PEOPLE.KHAKI, belt: PAL.wo4, shoes: PAL.wo4,
  });
}

// MrPerkins class manages the enter/speak/exit lifecycle for a cameo character
// who walks to a random position, says a phrase, then walks back off-screen.
class MrPerkins {
  static g3 = true;      // drawn as a 3D model (see docs/GARDEN_3D.md)

  constructor() {
    this.fromLeft = random() < 0.5;
    this.wx    = this.fromLeft ? -0.05 : 1.05;
    this.wy    = random(0.55, 0.85);
    this.dir   = this.fromLeft ? 1 : -1;
    this.speed = 0.0022;
    this.walkPhase = 0;
    this.state = 'enter';  // enter | speak | exit
    this.idleTimer = 0;
    this.spoken = false;
    this.done = false;
    this.targetX = random(0.25, 0.75); // walk to middle area
    this.look = perkinsLook();
  }

  // Advances MrPerkins through enter, speak, and exit states each frame.
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
        this.idleTimer = 180; // 3 seconds
        this.walkPhase = 0;

        if (!this.spoken) {
          this.spoken = true;
          const pRef = this;
          const phrase = PERKINS_PHRASES[floor(random(PERKINS_PHRASES.length))];
          PEOPLE.say(phrase, () => PEOPLE.bubblePos(pRef.wx, pRef.wy, pRef.look), () => pRef.done);
        }
      }

    } else if (this.state === 'speak') {
      this.idleTimer--;
      if (this.idleTimer <= 0) {
        this.state = 'exit';
        // walk back off the same side he came from
        this.dir = this.fromLeft ? -1 : 1;
      }

    } else if (this.state === 'exit') {
      this.wx += this.dir * this.speed * 1.2;
      if (this.wx < -0.1 || this.wx > 1.1) this.done = true;
    }
  }

  // Poses Mr. Perkins walking, or standing turned toward us and waving while he speaks.
  draw() {
    const m = PEOPLE3.model(this, this.dir * G3.YAW.right);
    const moving = PEOPLE3.move(m, this.wx, this.wy, { yaw: this.dir * 0.45 });
    const side = PEOPLE3.nearSide(m);
    // a big wave for the first couple of seconds of his visit
    const waving = this.state === 'speak' && this.idleTimer > 70;
    PEOPLE3.pose(m, {
      walk: moving ? this.walkPhase : null, side,
      arm: waving ? 'wave' : 'walk',
      face: PEOPLE.face(G3.frame, 7, 'smile'),
    });
  }
}

// I SPY card: Mr. Perkins standing proudly, waving.
G3.cardArt('mrperkins', () => {
  const m = PEOPLE3.build(perkinsLook());
  return PEOPLE3.pose(m, { side: 'L', arm: 'wave', arm2: 'down', t: 2, snap: true });
});
