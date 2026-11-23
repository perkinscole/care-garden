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

// Picks a random student look. About 40% have ponytails and 30% wear caps,
// and they come in three heights.
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
    height: random([-1, 0, 0, 1]),
  });
}

// How far a student stands from a flower's stem to pick it from a crouch,
// and from the middle of the ram to pet him, in art pixels.
const KID_PICK_PX = 5;
const KID_PET_PX  = 17;
// Arm frames for taking hold of a bloom while standing, lowest first.
const KID_REACH_ARMS = ['hold', 'reach', 'up'];

// Kid class manages each child's lifecycle (enter/wander/pickFlower/petting/return/done),
// randomized appearance, flower-picking mechanics, and ram-petting interactions.
class Kid {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor() {
    // start on the threshold of one of the main doors
    this.wx = PEOPLE.doorX();
    this.wy = PEOPLE.DOOR_WY + 0.008;
    this.twx = random(0.1, 0.9);
    this.twy = random(0.15, 0.85);
    this.speed = random(0.0016, 0.0028);
    this.walkPhase = random(TWO_PI);
    this.dir = 1;
    this.state = 'enter';
    this.idleTimer = 0;
    this.wanderCount = 0;
    this.maxWanders = floor(random(2, 6));
    this.speechTimer = floor(random(200, 500));

    // appearance — random per kid
    this.look = makeKidLook(false);
    this.seed = floor(random(1000));   // staggers blinking and patting
    this.fade = 0;                     // fades in while stepping out of the school
    this.heldFlower = null;  // { hsl, type } when carrying
    this.pickTimer = 0;
    this.pickTarget = null;  // the flower this student is going to pick
    this.pickSide = 1;       // which way they face to pick it
    this.ramReactTimer = 0;
    this.entering = false;   // true for the last steps in through the doors
    this.emerging = true;    // true for the first steps out of the doors, seen from the front
  }

  // Speech bubble that floats just above this student's head (and stays
  // behind, fading, if they go back inside while it is showing).
  speak(msg) {
    PEOPLE.say(msg, () => PEOPLE.bubblePos(this.wx, this.wy, this.look), () => PEOPLE.hasLeft(this));
  }

  // How this student will take a flower as it stands right now. A flower
  // with a bloom is picked standing up, hand on the near side of the bloom
  // (the lowest one of a group plant); a bud or a stub is picked from a
  // crouch at the foot of the stem. Returns { crouch, arm, x, wy }: the arm
  // frame, the art x to stand at and the world y.
  pickPlan(f) {
    const wy = min(f.wy + 0.006, 0.99);
    const foot = f.footPos();
    if (f.height() <= 12) {
      return { crouch: true, arm: 'pick', x: foot.x - this.pickSide * KID_PICK_PX, wy };
    }
    const b = f.headPos(f.blooms - 1);
    // the hand goes as near the middle of the bloom as an arm can get
    const shoulder = worldToPx(f.wx, wy).y - this.look.h;
    let arm = KID_REACH_ARMS[0], best = Infinity;
    for (const a of KID_REACH_ARMS) {
      const miss = abs(PEOPLE.handY(shoulder, this.look, a) - b.y);
      if (miss < best) { best = miss; arm = a; }
    }
    // stand so the fingertips are on the edge of the petals
    const reach = PEOPLE.HANDS.kidArm[arm][0] + 1;
    return { crouch: false, arm, x: b.x - this.pickSide * (reach + max(2, b.r - 2)), wy };
  }

  // Takes one step toward (tx, ty) at the given speed and returns how far
  // away it still is. Other characters gently push the student aside.
  stepToward(tx, ty, speed, avoid) {
    const dx = tx - this.wx;
    const dy = ty - this.wy;
    const d  = sqrt(dx*dx + dy*dy);
    if (d < 0.0005) return d;
    const st = min(speed, d);
    this.wx += (dx / d) * st;
    this.wy += (dy / d) * st;
    if (abs(dx) * PX.W > 1) this.dir = dx > 0 ? 1 : -1;
    if (avoid) {
      // (each student is 'kid_<index>' in characterPositions, see sketch.js)
      const sep = getSeparation(this.wx, this.wy, 'kid_' + kids.indexOf(this));
      this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
      this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
    }
    return d;
  }

  // Advances the kid's state machine each frame: walking, flower picking, petting, and return to school.
  update() {
    if (this.fade < 1) this.fade = min(1, this.fade + 0.06);
    const fromX = this.wx, fromY = this.wy;

    if (this.state === 'enter') {
      // down the step from the doors, then off toward the first wander target
      if (PEOPLE.comeOut(this, this.speed)) {
        // (nothing else until they are on the sidewalk)
      } else if (this.stepToward(this.twx, this.twy, this.speed, this.wy > 0.1) < 0.03) {
        this.state = 'idle';
        this.idleTimer = floor(random(30, 90));
      }

    } else if (this.state === 'wander') {
      this.speechTimer--;
      if (this.speechTimer <= 0) {
        this.speak(KID_PHRASES[floor(random(KID_PHRASES.length))]);
        this.speechTimer = floor(random(300, 700));
      }
      // chance to pet the ram if nearby
      if (frameCount % 60 === 0 && random() < 0.3 && !this.heldFlower) {
        if (ram && ram.state !== 'eat' && weatherState !== 'stormy') {
          const rdx = ram.wx - this.wx;
          const rdy = ram.wy - this.wy;
          if (sqrt(rdx*rdx + rdy*rdy) < 0.1) this.state = 'approachPet';
        }
      }

      if (this.state === 'wander') {
        const d = this.stepToward(this.twx, this.twy, this.speed, true);
        if (d < 0.03) {
          this.wanderCount++;
          if (this.wanderCount >= this.maxWanders) {
            // head back to school
            this.state = 'return';
          } else {
            this.state = 'idle';
            this.idleTimer = floor(random(20, 80));
            this.twx = random(0.08, 0.92);
            this.twy = random(0.12, 0.88);
          }
        } else if (frameCount % 90 === 0 && random() < 0.3 && !this.heldFlower) {
          // chance to spot and pick a nearby flower
          for (const f of flowers) {
            const fdx = f.wx - this.wx;
            const fdy = f.wy - this.wy;
            if (sqrt(fdx*fdx + fdy*fdy) < 0.08 && f.size > 0.1) {
              this.pickTarget = f;
              // Stay on the side of the flower they are already on, unless
              // the bloom they will take hangs out to one side of a group
              // plant: then they go round to that side of it.
              const lean = f.headPos(f.blooms - 1).x - f.footPos().x;
              this.pickSide = abs(lean) > 2 ? (lean > 0 ? -1 : 1) : (f.wx >= this.wx ? 1 : -1);
              this.state = 'approachFlower';
              break;
            }
          }
        }
      }

    } else if (this.state === 'return' || this.state === 'carry') {
      // along the sidewalk to the doors, then in
      const speed = this.speed * (this.state === 'carry' ? 1.1 : 1);
      if (PEOPLE.goIn(this, speed)) {
        this.heldFlower = null;
        this.state = 'done';
      }

    } else if (this.state === 'idle') {
      this.idleTimer--;
      if (this.idleTimer <= 0) {
        this.state = 'wander';
        this.twx = random(0.08, 0.92);
        this.twy = random(0.12, 0.88);
      }

    } else if (this.state === 'approachFlower') {
      const f = this.pickTarget;
      // the ram may have eaten it, or another student picked it
      if (!f || !flowers.includes(f)) {
        this.pickTarget = null;
        this.state = 'wander'; return;
      }
      // Stop where the hand will reach it (see pickPlan), a touch nearer
      // the front so the student is drawn in front of the flower.
      const plan = this.pickPlan(f);
      if (this.stepToward(plan.x / PX.W, plan.wy, this.speed, false) < 0.002) {
        this.dir = this.pickSide;
        this.state = 'pickFlower';
        this.pickPose = plan;
        this.pickTimer = 45;
      }

    } else if (this.state === 'approachPet') {
      if (!ram || weatherState === 'stormy') { this.state = 'wander'; return; }
      // walk up to whichever side of him is nearer
      const side = this.wx <= ram.wx ? -1 : 1;
      const tx = ram.wx + side * KID_PET_PX / PX.W;
      const ty = ram.wy + 0.03;
      if (this.stepToward(tx, ty, this.speed * 1.2, false) < 0.012) {
        this.state = 'petting';
        this.dir = -side;
        this.idleTimer = floor(random(60, 120));
        // kid says something sweet
        const petPhrases = ['Good boy!', 'So fluffy!', 'Hi Ramy!',
                            'Aww!', 'Pet pet pet!', 'Soft!'];
        this.speak(petPhrases[floor(random(petPhrases.length))]);
        this.ramReactTimer = 90; // ram will respond after kid's line has time to show
      }

    } else if (this.state === 'petting') {
      this.idleTimer--;
      // stay at his side and a little in front, facing him, so the
      // outstretched hand lands on his wool
      if (ram) {
        this.wx = lerp(this.wx, ram.wx - this.dir * KID_PET_PX / PX.W, 0.15);
        this.wy = lerp(this.wy, ram.wy + 0.03, 0.15);
      }
      // delayed ram reaction so it doesn't overlap kid's speech
      if (this.ramReactTimer > 0) {
        this.ramReactTimer--;
        if (this.ramReactTimer === 0 && ram) {
          const ramRef = ram;
          speechBubbles.push(new SpeechBubble('*content baa*', () => ramRef.headPos()));
        }
      }
      if (this.idleTimer <= 0 || !ram) {
        this.state = 'wander';
        this.twx = random(0.08, 0.92);
        this.twy = random(0.12, 0.88);
      }

    } else if (this.state === 'pickFlower') {
      this.pickTimer--;
      const f = this.pickTarget;
      if (!f || !flowers.includes(f)) {
        // it went while they were reaching for it
        this.pickTarget = null;
        this.state = 'wander';
      } else if (this.pickTimer <= 0) {
        // grab it
        soundPlay(dirt);
        this.heldFlower = { hsl: f.hsl, type: f.type };
        f.dispose();
        flowers.splice(flowers.indexOf(f), 1);
        this.pickTarget = null;
        // head back to school
        this.state = 'carry';
      }
    }

    // legs keep time with the ground actually covered
    this.walkPhase += walkStride(this.wx - fromX, this.wy - fromY, PEOPLE.STRIDE_KID);

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
    if (this.entering) leg = PEOPLE.backFrame(this.walkPhase);   // seen from behind, going in
    else if (this.emerging) leg = PEOPLE.frontFrame(this.walkPhase);   // seen from the front, coming out
    else if (s === 'pickFlower') {
      const plan = this.pickPose;
      if (!plan || plan.crouch) { leg = 'crouch'; arm = 'pick'; }
      else arm = plan.arm;    // standing, hand on the bloom
    }
    else if (s === 'petting') arm = PX.anim(2, 10, this.seed) ? 'reach' : 'hold';   // pat, pat
    else if (this.heldFlower) arm = 'carry';

    // Fade through the school doors on the way back in
    const alpha = min(this.fade, PEOPLE.doorAlpha(this));
    if (alpha <= 0.02) return;

    const c = PX.c, prevAlpha = c.globalAlpha;
    c.globalAlpha = prevAlpha * alpha;
    PX.shadow(x, y, 11);
    PEOPLE.draw(x, y, L, this.dir, leg, arm, PEOPLE.face(PX.tick, this.seed, 'smile'));
    // Held flower — its stem sits in the hand held out in front
    if (this.heldFlower && !this.entering) {
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
    this.speed = random(0.0016, 0.0028);
    this.walkPhase = random(TWO_PI);
    this.done = false;
    this.entering = false;   // true for the last steps in through the doors

    // Random appearance, always with a backpack
    this.look = makeKidLook(true);
    this.seed = floor(random(1000));
    this.fade = 1;

    if (this.departing) {
      // out of the doors and away across the lawn
      this.wx = PEOPLE.doorX();
      this.wy = PEOPLE.DOOR_WY + 0.008;
      this.twx = this.fromLeft ? -0.08 : 1.08;
      this.twy = random(0.3, 0.7);
      this.dir = this.twx < 0.5 ? -1 : 1;
      this.fade = 0;   // fades in coming out of the doors
      this.emerging = true;   // first steps out, seen from the front
    } else {
      this.wx = this.fromLeft ? -0.08 : 1.08;
      this.wy = random(0.3, 0.7);
    }
  }

  // Walks toward the target position; marks done on arrival
  update() {
    if (this.fade < 1) this.fade = min(1, this.fade + 0.06);
    const fromX = this.wx, fromY = this.wy;
    if (this.departing) {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d = sqrt(dx * dx + dy * dy);
      if (PEOPLE.comeOut(this, this.speed)) {
        // down the step from the doors first
      } else if (d > 0.02) {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        this.dir = dx > 0 ? 1 : -1;
      } else {
        this.done = true;
      }
    } else if (PEOPLE.goIn(this, this.speed)) {
      this.done = true;
    }
    this.walkPhase += walkStride(this.wx - fromX, this.wy - fromY, PEOPLE.STRIDE_KID);
  }

  // Draws the student walking with a backpack; arrivals fade as they go in through the doors
  draw() {
    const { x, y } = worldToPx(this.wx, this.wy);
    const alpha = min(this.fade, PEOPLE.doorAlpha(this));
    if (alpha <= 0.02) return;
    const c = PX.c, prevAlpha = c.globalAlpha;
    c.globalAlpha = prevAlpha * alpha;
    PX.shadow(x, y, 11);
    const leg = this.entering ? PEOPLE.backFrame(this.walkPhase)
              : this.emerging ? PEOPLE.frontFrame(this.walkPhase)
              : PEOPLE.walkFrame(this.walkPhase);
    PEOPLE.draw(x, y, this.look, this.dir, leg, 'walk', PEOPLE.face(PX.tick, this.seed, 'smile'));
    c.globalAlpha = prevAlpha;
  }
}

// I SPY card: three different students bunched together like a class
// photo, no wider than 44 art pixels so the card can use its big text. The
// two at the back stand a little higher and are drawn first; the one in
// the middle stands in front holding up a flower.
CARD_ART.kids = (x, y, tick) => {
  const P = PEOPLE;
  const looks = CARD_ART._kidLooks || (CARD_ART._kidLooks = [
    P.look({ kind: 'kid', skin: 2, hair: 'bob', hairCol: P.BLACK, top: P.BRIGHTS[7], stripe: PAL.white,
             sleeves: 'short', bottom: P.JEANS, legs: 'skin', height: 1 }),
    P.look({ kind: 'kid', skin: 4, hair: 'curly', hairCol: P.BLACK, top: P.BRIGHTS[2],
             sleeves: 'short', bottom: P.NAVY, height: -1 }),
    P.look({ kind: 'kid', skin: 0, hair: 'swoop', hairCol: P.GINGER, top: P.BRIGHTS[3],
             sleeves: 'short', bottom: P.KHAKI, cap: P.BRIGHTS[0], pack: P.BRIGHTS[5] }),
  ]);
  // back left: waves hello every few seconds
  const waving = tick % 240 < 90;
  PX.shadow(x - 12, y - 2, 11);
  P.draw(x - 12, y - 2, looks[0], 1, 'stand', waving ? (Math.floor(tick / 10) % 2 ? 'wave1' : 'wave2') : 'down',
         P.face(tick, 1, 'smile'));
  // back right: cap and backpack, facing the others
  PX.shadow(x + 13, y - 2, 11);
  P.draw(x + 13, y - 2, looks[2], -1, 'stand', 'down', P.face(tick, 3, 'smile'));
  // front and middle: holds up a flower, bouncing on their toes
  const hop = Math.floor(tick / 14) % 6 === 0 ? 1 : 0;
  PX.shadow(x, y, 11);
  P.draw(x, y - hop, looks[1], 1, 'stand', 'carry', P.face(tick, 2, 'smile'));
  P.tinyFlower(P.handX(x, 1, looks[1], 'carry'), P.handY(P.top(y - hop, looks[1], 'stand'), looks[1], 'carry'), [320, 80, 68]);
};
