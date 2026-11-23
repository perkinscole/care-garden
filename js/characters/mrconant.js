// ================================================================
// File: mrconant.js
// Author: Cole Perkins
// Date Created: April 12, 2026
// Last Modified: November 22, 2026
// Description: Mr. Conant, head of the CARE team. A beloved teacher
//   who walks in occasionally, shares an encouraging phrase, then exits.
//   Shows up less frequently than Mr. Perkins. Drawn as pixel art from the
//   shared people sprites in js/art/people_art.js: neat dark hair, light
//   blue shirt, blue tie (he always wears a tie) and dark slacks.
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
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

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
          speechBubbles.push(new SpeechBubble(phrase, () => PEOPLE.bubblePos(self.wx, self.wy, self.look)));
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

  // Draws Mr. Conant walking, or standing and talking with his hand out.
  draw() {
    const { x, y } = worldToPx(this.wx, this.wy);
    const walking = (this.state === 'enter' || this.state === 'exit');
    const leg = walking ? PEOPLE.walkFrame(this.walkPhase) : 'stand';
    // while he talks he gestures: hand out, hand down, hand out
    let arm = 'walk';
    if (!walking) arm = PX.anim(2, 24) ? 'hold' : 'down';
    PX.shadow(x, y, 13);
    PEOPLE.draw(x, y, this.look, this.dir, leg, arm, PEOPLE.face(PX.tick, 11, 'smile'));
  }
}

// I SPY card: Mr. Conant standing, gesturing as he talks and giving a wave.
CARD_ART.mrconant = (x, y, tick) => {
  const L = CARD_ART._conantLook || (CARD_ART._conantLook = conantLook());
  const t = tick % 300;
  const arm = t < 80 ? (Math.floor(tick / 9) % 2 ? 'wave1' : 'wave2') : (t > 180 && t < 250 ? 'hold' : 'down');
  PX.shadow(x, y, 13);
  PEOPLE.draw(x, y, L, 1, 'stand', arm, PEOPLE.face(tick, 11, 'smile'));
};
