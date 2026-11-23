// ================================================================
// File: kids.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the Kid class for students who exit the school, wander
//   the garden, pick flowers, pet the ram, then return inside, and the
//   ArrivalKid class for students with backpacks walking to school at dawn
//   and home at dusk. Drawn as pixel art from the shared people sprites in
//   js/art/people_art.js; every student gets a skin tone, hairstyle and
//   outfit picked from short fixed lists.
// ================================================================

// What students wear. `top` is an index into PEOPLE.BRIGHTS (or 'white'),
// `bottom` a cloth name on PEOPLE. A fixed list keeps the number of
// recoloured sprites small however many students come and go.
const KID_OUTFITS = [
  { top: 0, bottom: 'JEANS' },
  { top: 1, bottom: 'NAVY', shorts: true },
  { top: 2, bottom: 'JEANS', stripe: true },
  { top: 3, bottom: 'KHAKI' },
  { top: 4, bottom: 'GREY', shorts: true },
  { top: 5, bottom: 'KHAKI', stripe: true },
  { top: 6, bottom: 'JEANS', shorts: true },
  { top: 7, bottom: 'NAVY' },
  { top: 5, bottom: 'GREY', long: true },
  { top: 0, bottom: 'NAVY', long: true, stripe: true },
  { top: 3, bottom: 'JEANS', long: true },
  { top: 7, bottom: 'JEANS', shorts: true, stripe: true },
  { top: 'white', bottom: 'JEANS' },
  { top: 'white', bottom: 'KHAKI', shorts: true },
];
const KID_HAIRSTYLES = ['short', 'swoop', 'curly', 'buzz', 'bob', 'long'];

// Picks a random student look. About 40% have ponytails and 30% wear caps.
function makeKidLook(hasBackpack) {
  const P = PEOPLE;
  const outfit = KID_OUTFITS[floor(random(KID_OUTFITS.length))];
  const skin = floor(random(P.SKIN.length));
  // hair colours that suit the skin tone
  const hairCols = skin <= 1 ? [P.BLONDE, P.GINGER, P.LIGHT, P.BROWN, P.DARK]
                 : skin === 2 ? [P.LIGHT, P.BROWN, P.DARK, P.BLACK]
                 : [P.DARK, P.BLACK, P.BLACK];
  const hasCap = random() < 0.3;
  let hair = random() < 0.4 ? 'pony' : KID_HAIRSTYLES[floor(random(KID_HAIRSTYLES.length))];
  if (hasCap && hair === 'curly') hair = 'short';   // curls would poke through the cap
  const top = outfit.top === 'white' ? P.WHITE : P.BRIGHTS[outfit.top];
  return P.look({
    kind: 'kid',
    skin,
    hair,
    hairCol: hairCols[floor(random(hairCols.length))],
    top,
    stripe: outfit.stripe ? (outfit.top === 'white' ? PAL.re2 : PAL.white) : undefined,
    sleeves: outfit.long ? 'long' : 'short',
    bottom: P[outfit.bottom],
    legs: outfit.shorts ? 'skin' : undefined,
    shoes: random() < 0.5 ? PAL.wo3 : PAL.g5,
    cap: hasCap ? P.BRIGHTS[floor(random(P.BRIGHTS.length))] : null,
    pack: hasBackpack ? P.BRIGHTS[floor(random(P.BRIGHTS.length))] : null,
  });
}

// Kid class manages each child's lifecycle (enter/wander/pickFlower/petting/return/done),
// randomized appearance, flower-picking mechanics, and ram-petting interactions.
class Kid {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor() {
    // start at school door in world coords
    const schoolWX = 0.5 + random(-0.08, 0.08);
    this.wx = schoolWX;
    this.wy = 0.02;  // near the horizon where school sits
    this.twx = random(0.1, 0.9);
    this.twy = random(0.15, 0.85);
    this.speed = random(0.002, 0.004);
    this.walkPhase = random(TWO_PI);
    this.dir = 1;
    this.state = 'enter';
    this.idleTimer = 0;
    this.wanderCount = 0;
    this.maxWanders = floor(random(2, 6));
    this.returning = false;
    this.speechTimer = floor(random(200, 500));
    this.id = null;

    // appearance — random per kid
    this.look = makeKidLook(false);
    this.seed = floor(random(1000));   // staggers blinking and patting
    this.fade = 0;                     // fades in while stepping out of the school
    this.heldFlower = null;  // { hsl, type } when carrying
    this.pickTimer = 0;
    this.pickTargetIdx = null;
    this.ramReactTimer = 0;
  }

  // Speech bubble that floats just above this student's head.
  speak(msg) {
    speechBubbles.push(new SpeechBubble(msg, () => {
      const p = worldToPx(this.wx, this.wy);
      return { x: p.x, y: p.y - 26 };
    }));
  }

  // Advances the kid's state machine each frame: walking, flower picking, petting, and return to school.
  update() {
    if (this.fade < 1) this.fade = min(1, this.fade + 0.06);

    if (this.state === 'enter') {
      // walk out from school toward first wander target
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      if (d < 0.03) {
        this.state = 'idle';
        this.idleTimer = floor(random(30, 90));
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        const sep = getSeparation(this.wx, this.wy, this.id);
        this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
        this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        this.walkPhase += 0.2;
      }

    } else if (this.state === 'wander') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      this.speechTimer--;
      if (this.speechTimer <= 0) {
        this.speak(KID_PHRASES[floor(random(KID_PHRASES.length))]);
        this.speechTimer = floor(random(300, 700));
      }
      // chance to pet the ram if nearby
      if (frameCount % 60 === 0 && random() < 0.3 && !this.heldFlower) {
        if (ram && ram.state !== 'eat') {
          const rdx = ram.wx - this.wx;
          const rdy = ram.wy - this.wy;
          if (sqrt(rdx*rdx + rdy*rdy) < 0.1) {
            this.twx = ram.wx;
            this.twy = ram.wy + 0.03; // approach slightly in front of ram
            this.state = 'approachPet';
          }
        }
      }

      if (d < 0.03) {
        this.wanderCount++;
        if (this.wanderCount >= this.maxWanders) {
          // head back to school
          this.twx = 0.5 + random(-0.06, 0.06);
          this.twy = 0.01;
          this.state = 'return';
        } else {
          this.state = 'idle';
          this.idleTimer = floor(random(20, 80));
          this.twx = random(0.08, 0.92);
          this.twy = random(0.12, 0.88);
        }
      } else if (this.state === 'wander') {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        const sep = getSeparation(this.wx, this.wy, this.id);
        this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
        this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        this.walkPhase += 0.2;
        // chance to spot and pick a nearby flower
        if (frameCount % 90 === 0 && random() < 0.3 && !this.heldFlower) {
          for (let i = 0; i < flowers.length; i++) {
            const f = flowers[i];
            const fdx = f.wx - this.wx;
            const fdy = f.wy - this.wy;
            if (sqrt(fdx*fdx + fdy*fdy) < 0.08 && f.size > 0.1) {
              this.twx = f.wx;
              this.twy = f.wy;
              this.pickTargetIdx = i;
              this.state = 'approachFlower';
              break;
            }
          }
        }
      }

    } else if (this.state === 'return') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      if (d < 0.03) {
        this.state = 'done';
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        this.walkPhase += 0.2;
      }

    } else if (this.state === 'idle') {
      this.idleTimer--;
      this.walkPhase = 0;
      if (this.idleTimer <= 0) {
        this.state = 'wander';
        this.twx = random(0.08, 0.92);
        this.twy = random(0.12, 0.88);
      }

    } else if (this.state === 'approachFlower') {
      if (this.pickTargetIdx === null || this.pickTargetIdx >= flowers.length) {
        this.pickTargetIdx = null;
        this.state = 'wander'; return;
      }
      const f = flowers[this.pickTargetIdx];
      // stop just beside the flower so the crouch reaches its stem
      const dx = f.wx - this.wx;
      const dy = f.wy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      if (d < 0.025) {
        this.state = 'pickFlower';
        this.pickTimer = 45;
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        this.walkPhase += 0.2;
      }

    } else if (this.state === 'approachPet') {
      if (!ram) { this.state = 'wander'; return; }
      const dx = ram.wx - this.wx;
      const dy = ram.wy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      if (d < 0.04) {
        this.state = 'petting';
        this.idleTimer = floor(random(60, 120));
        // kid says something sweet
        const petPhrases = ['Good boy!', 'So fluffy!', 'Hi Ramy!',
                            'Aww!', 'Pet pet pet!', 'Soft!'];
        this.speak(petPhrases[floor(random(petPhrases.length))]);
        this.ramReactTimer = 90; // ram will respond after kid's line has time to show
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        this.walkPhase += 0.2;
      }

    } else if (this.state === 'petting') {
      this.idleTimer--;
      this.walkPhase = 0;
      // follow ram position while petting, standing at its side and a little
      // in front so the outstretched hand lands on its woolly back
      if (ram) {
        this.wx = lerp(this.wx, ram.wx - 0.03 * this.dir, 0.1);
        this.wy = lerp(this.wy, ram.wy + 0.03, 0.1);
      }
      // delayed ram reaction so it doesn't overlap kid's speech
      if (this.ramReactTimer > 0) {
        this.ramReactTimer--;
        if (this.ramReactTimer === 0 && ram) {
          const ramRef = ram;
          speechBubbles.push(new SpeechBubble('*content baa*', () => {
            const p = worldToPx(ramRef.wx, ramRef.wy);
            return { x: p.x, y: p.y - 25 };
          }));
        }
      }
      if (this.idleTimer <= 0) {
        this.state = 'wander';
        this.twx = random(0.08, 0.92);
        this.twy = random(0.12, 0.88);
      }

    } else if (this.state === 'pickFlower') {
      this.pickTimer--;
      if (this.pickTimer <= 0) {
        // grab it
        soundPlay(dirt);
        if (this.pickTargetIdx !== null && this.pickTargetIdx < flowers.length) {
          const f = flowers[this.pickTargetIdx];
          this.heldFlower = { hsl: f.hsl, type: f.type };
          f.dispose();
          flowers.splice(this.pickTargetIdx, 1);
        }
        this.pickTargetIdx = null;
        // head back to school
        this.twx = 0.5 + random(-0.06, 0.06);
        this.twy = 0.01;
        this.state = 'carry';
      }

    } else if (this.state === 'carry') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      if (d < 0.03) {
        this.heldFlower = null;
        this.state = 'done';
      } else {
        this.wx += (dx / d) * this.speed * 1.1;
        this.wy += (dy / d) * this.speed * 1.1;
        this.walkPhase += 0.2;
      }
    }

    // remove done kids from the array
    if (this.state === 'done') {
      const idx = kids.indexOf(this);
      if (idx >= 0) kids.splice(idx, 1);
    }
  }

  // Draws the student: walking, standing, crouching to pick, carrying a flower or petting the ram.
  draw() {
    if (this.state === 'done') return;
    const { x, y } = worldToPx(this.wx, this.wy);
    const s = this.state, L = this.look;
    const walking = (s === 'wander' || s === 'enter' || s === 'return' || s === 'carry' ||
                     s === 'approachFlower' || s === 'approachPet');
    let leg = walking ? PEOPLE.walkFrame(this.walkPhase) : 'stand';
    let arm = 'walk';
    if (s === 'pickFlower') { leg = 'crouch'; arm = 'pick'; }
    else if (s === 'petting') arm = PX.anim(2, 10, this.seed) ? 'reach' : 'hold';   // pat, pat
    else if (this.heldFlower) arm = 'carry';

    // Fade through the school doors on the way back in
    let alpha = this.fade;
    if (s === 'return' || s === 'carry') {
      alpha = min(alpha, PEOPLE.doorFade(dist(this.wx, this.wy, this.twx, this.twy) - 0.01));
    }
    if (alpha <= 0.02) return;

    const c = PX.c, prevAlpha = c.globalAlpha;
    c.globalAlpha = prevAlpha * alpha;
    PX.shadow(x, y, 11);
    PEOPLE.draw(x, y, L, this.dir, leg, arm, PEOPLE.face(PX.tick, this.seed, 'smile'));
    // Held flower — its stem sits in the hand held out in front
    if (this.heldFlower) {
      const top = PEOPLE.top(y, L, leg);
      PEOPLE.tinyFlower(PEOPLE.handX(x, this.dir, L, 'carry'), PEOPLE.handY(top, L, 'carry'), this.heldFlower.hsl);
    }
    c.globalAlpha = prevAlpha;
  }
}

// An arrival/departure kid that walks to/from the school with a backpack
class ArrivalKid {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor(departing) {
    this.departing = departing || false;
    this.fromLeft = random() < 0.5;
    this.dir = this.fromLeft ? 1 : -1;
    this.speed = random(0.002, 0.004);
    this.walkPhase = random(TWO_PI);
    this.done = false;

    // Random appearance, always with a backpack
    this.look = makeKidLook(true);
    this.seed = floor(random(1000));
    this.fade = 1;

    if (this.departing) {
      this.wx = 0.5 + random(-0.06, 0.06);
      this.wy = random(0.03, 0.1);
      this.twx = this.fromLeft ? -0.08 : 1.08;
      this.twy = random(0.3, 0.7);
      this.dir = this.twx < 0.5 ? -1 : 1;
      this.fade = 0;   // fades in coming out of the doors
    } else {
      this.wx = this.fromLeft ? -0.08 : 1.08;
      this.wy = random(0.3, 0.7);
      this.twx = 0.5 + random(-0.06, 0.06);
      this.twy = random(0.02, 0.06);
    }
  }

  // Walks toward the target position; marks done on arrival
  update() {
    if (this.fade < 1) this.fade = min(1, this.fade + 0.06);
    const dx = this.twx - this.wx;
    const dy = this.twy - this.wy;
    const dist = sqrt(dx * dx + dy * dy);
    if (dist > 0.02) {
      this.wx += (dx / dist) * this.speed;
      this.wy += (dy / dist) * this.speed;
      this.walkPhase += 0.2;
      this.dir = dx > 0 ? 1 : -1;
    } else {
      this.done = true;
    }
  }

  // Draws the student walking with a backpack; arrivals fade as they go in through the doors
  draw() {
    const { x, y } = worldToPx(this.wx, this.wy);
    let alpha = this.fade;
    if (!this.departing) alpha = min(alpha, PEOPLE.doorFade(dist(this.wx, this.wy, this.twx, this.twy)));
    if (alpha <= 0.02) return;
    const c = PX.c, prevAlpha = c.globalAlpha;
    c.globalAlpha = prevAlpha * alpha;
    PX.shadow(x, y, 11);
    PEOPLE.draw(x, y, this.look, this.dir, PEOPLE.walkFrame(this.walkPhase), 'walk',
                PEOPLE.face(PX.tick, this.seed, 'smile'));
    c.globalAlpha = prevAlpha;
  }
}

// I SPY card: three different students side by side. One waves, one
// shows off a flower, one has a cap and backpack.
CARD_ART.kids = (x, y, tick) => {
  const P = PEOPLE;
  const looks = CARD_ART._kidLooks || (CARD_ART._kidLooks = [
    P.look({ kind: 'kid', skin: 2, hair: 'pony', hairCol: P.BLACK, top: P.BRIGHTS[7], stripe: PAL.white,
             sleeves: 'short', bottom: P.JEANS, legs: 'skin' }),
    P.look({ kind: 'kid', skin: 4, hair: 'curly', hairCol: P.BLACK, top: P.BRIGHTS[2],
             sleeves: 'short', bottom: P.NAVY }),
    P.look({ kind: 'kid', skin: 0, hair: 'swoop', hairCol: P.GINGER, top: P.BRIGHTS[3],
             sleeves: 'short', bottom: P.KHAKI, cap: P.BRIGHTS[0], pack: P.BRIGHTS[5] }),
  ]);
  // left: waves hello every few seconds
  const waving = tick % 240 < 90;
  PX.shadow(x - 18, y, 11);
  P.draw(x - 18, y, looks[0], 1, 'stand', waving ? (Math.floor(tick / 10) % 2 ? 'wave1' : 'wave2') : 'down',
         P.face(tick, 1, 'smile'));
  // middle: holds up a flower, bouncing on their toes
  const hop = Math.floor(tick / 14) % 6 === 0 ? 1 : 0;
  PX.shadow(x, y, 11);
  P.draw(x, y - hop, looks[1], 1, 'stand', 'carry', P.face(tick, 2, 'smile'));
  P.tinyFlower(P.handX(x, 1, looks[1], 'carry'), P.handY(P.top(y - hop, looks[1], 'stand'), looks[1], 'carry'), [320, 80, 68]);
  // right: cap and backpack, facing the others
  PX.shadow(x + 18, y, 11);
  P.draw(x + 18, y, looks[2], -1, 'stand', 'down', P.face(tick, 3, 'smile'));
};
