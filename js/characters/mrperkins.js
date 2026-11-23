// ================================================================
// File: mrperkins.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the MrPerkins class for the creator of the garden, who
//   walks in from off-screen, delivers a speech bubble, then exits. Drawn as
//   pixel art from the shared people sprites in js/art/people_art.js: bald
//   head, dark beard, white shirt, red tie and khakis.
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
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor() {
    this.fromLeft = random() < 0.5;
    this.wx    = this.fromLeft ? -0.05 : 1.05;
    this.wy    = random(0.55, 0.85);
    this.dir   = this.fromLeft ? 1 : -1;
    this.speed = 0.003;
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
    if (this.state === 'enter') {
      const dx = this.targetX - this.wx;
      this.dir = dx > 0 ? 1 : -1;
      this.wx += this.dir * this.speed;
      this.walkPhase += 0.18;

      if (abs(dx) < 0.03) {
        this.state = 'speak';
        this.idleTimer = 180; // 3 seconds
        this.walkPhase = 0;

        if (!this.spoken) {
          this.spoken = true;
          const pRef = this;
          const phrase = PERKINS_PHRASES[floor(random(PERKINS_PHRASES.length))];
          speechBubbles.push(new SpeechBubble(phrase, () => {
            const p = worldToPx(pRef.wx, pRef.wy);
            return { x: p.x, y: p.y - 32 };
          }));
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
      this.walkPhase += 0.18;
      if (this.wx < -0.1 || this.wx > 1.1) this.done = true;
    }
  }

  // Draws Mr. Perkins walking, or standing and waving while he speaks.
  draw() {
    const { x, y } = worldToPx(this.wx, this.wy);
    const walking = (this.state === 'enter' || this.state === 'exit');
    const leg = walking ? PEOPLE.walkFrame(this.walkPhase) : 'stand';
    // a big wave for the first couple of seconds of his visit
    let arm = 'walk';
    if (!walking) arm = this.idleTimer > 70 ? (PX.anim(2, 9) ? 'wave1' : 'wave2') : 'down';
    PX.shadow(x, y, 13);
    PEOPLE.draw(x, y, this.look, this.dir, leg, arm, PEOPLE.face(PX.tick, 7, 'smile'));
  }
}

// I SPY card: Mr. Perkins standing proudly, waving now and then.
CARD_ART.mrperkins = (x, y, tick) => {
  const L = CARD_ART._perkinsLook || (CARD_ART._perkinsLook = perkinsLook());
  const waving = tick % 240 < 100;
  PX.shadow(x, y, 13);
  PEOPLE.draw(x, y, L, 1, 'stand', waving ? (Math.floor(tick / 9) % 2 ? 'wave1' : 'wave2') : 'down',
              PEOPLE.face(tick, 7, 'smile'));
};
