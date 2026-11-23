// ================================================================
// File: kids.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the Kid class for students who exit the school, wander
//   the garden, pick flowers, pet the ram, then return inside, and the
//   ArrivalKid class for students with backpacks walking to school at dawn
//   and home at dusk. 3D box people built by PEOPLE3 (js/g3_people.js);
//   every student gets a skin tone, hairstyle and outfit picked from short
//   fixed lists.
// ================================================================

// What students wear. `top` is an index into PEOPLE.BRIGHTS (or 'white'),
// `bottom` a cloth name on PEOPLE. A fixed list keeps the number of
// textures small however many students come and go.
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
// and from the middle of the ram to pet him (to the side, and nearer the
// front), in blocks.
const KID_PICK_DIST = 0.8;   // (for a full-size person; scaled to the student)
const KID_PET_X = 0.95;
const KID_PET_WY = 0.03;

// Kid class manages each child's lifecycle (enter/wander/pickFlower/petting/return/done),
// randomized appearance, flower-picking mechanics, and ram-petting interactions.
class Kid {
  static g3 = true;      // drawn as a 3D model (see docs/GARDEN_3D.md)

  constructor() {
    // start on the threshold of one of the main doors
    this.wx = PEOPLE.doorX();
    this.wy = PEOPLE.DOOR_IN_WY;
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
    this.heldFlower = null;  // { hsl, type } when carrying
    this.pickTimer = 0;
    this.pickTarget = null;  // the flower this student is going to pick
    this.pickSide = 1;       // which way they face to pick it
    this.ramReactTimer = 0;
    this.entering = false;   // true for the last steps in through the doors
    this.emerging = true;    // true for the first steps out of the doors, toward us
  }

  // Speech bubble that floats just above this student's head (and stays
  // behind, fading, if they go back inside while it is showing).
  speak(msg) {
    PEOPLE.say(msg, () => PEOPLE.bubblePos(this.wx, this.wy, this.look), () => PEOPLE.hasLeft(this));
  }

  // How this student will take a flower as it stands right now. A flower
  // with a bloom is picked standing up, hand on the lower edge of the bloom
  // or as high as the arm goes (the lowest bloom of a group plant); a
  // bud or a stub is picked from a crouch at the foot of the stem. Returns
  // { crouch, arm, wx, wy, x, z }: the arm pose, where to stand, and the
  // point (blocks) the hand goes to.
  pickPlan(f) {
    const L = this.look;
    const wy = min(f.wy + 0.006, 0.99);
    const i = max(0, (f.blooms || 1) - 1);
    const foot = PEOPLE3.foot3(f), head = PEOPLE3.head3(f, i), r = PEOPLE3.bloomR(f, i);
    if (head.y + r <= 0.8) {
      const x = foot.x - this.pickSide * KID_PICK_DIST * PEOPLE3.scale(L);
      return { crouch: true, arm: 'pick', wx: 0.5 + x / G3.GW, wy, x: foot.x, z: foot.z };
    }
    // The hand goes to the lower edge of the bloom, or as near as an arm
    // can get. Under a bloom that is over their head they take the stem;
    // otherwise they stand in front of the photo, not behind it.
    const sh = PEOPLE3.shoulderY(L), reach = PEOPLE3.armReach(L);
    const tall = head.y - r > PEOPLE3.headTop(L) + 0.1;
    const ty = constrain(head.y - r * 0.8, sh - reach * 0.5, sh + reach * 0.85);
    const out = sqrt(max(0.02, reach * reach - (ty - sh) * (ty - sh)));
    const sx = tall ? lerp(foot.x, head.x, constrain(ty / max(0.1, head.y), 0, 1)) : head.x;
    // (under a tall bloom they stand just behind the stem, so that the arm
    // on our side lines up with it)
    const sz = tall ? foot.z : head.z, front = tall ? -0.3 * PEOPLE3.scale(L) : 0.3;
    const x = sx - this.pickSide * (sqrt(max(0.02, out * out - front * front)) + 0.05);
    return { crouch: false, arm: atan2(out, sh - ty), wx: 0.5 + x / G3.GW, wy: min((sz + front) / G3.GD, 0.99), x: sx, z: sz };
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
    if (abs(dx) * G3.GW > 0.06) this.dir = dx > 0 ? 1 : -1;
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
              const lean = PEOPLE3.head3(f, max(0, (f.blooms || 1) - 1)).x - PEOPLE3.foot3(f).x;
              this.pickSide = abs(lean) > 0.15 ? (lean > 0 ? -1 : 1) : (f.wx >= this.wx ? 1 : -1);
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
      if (this.stepToward(plan.wx, plan.wy, this.speed, false) < 0.002) {
        this.dir = this.pickSide;
        this.state = 'pickFlower';
        this.pickPose = plan;
        this.pickTimer = 45;
      }

    } else if (this.state === 'approachPet') {
      if (!ram || weatherState === 'stormy') { this.state = 'wander'; return; }
      // walk up to whichever side of him is nearer
      const side = this.wx <= ram.wx ? -1 : 1;
      const tx = ram.wx + side * KID_PET_X / G3.GW;
      const ty = ram.wy + KID_PET_WY;
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
        this.wx = lerp(this.wx, ram.wx - this.dir * KID_PET_X / G3.GW, 0.15);
        this.wy = lerp(this.wy, ram.wy + KID_PET_WY, 0.15);
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

  // Poses the student's model: walking, standing, crouching or reaching to
  // pick, carrying a flower or petting the ram.
  draw() {
    if (this.state === 'done') return;
    const s = this.state, L = this.look;
    const m = PEOPLE3.model(this, this.emerging ? 0 : this.dir * G3.YAW.right);
    const u = m.userData;
    const x = (this.wx - 0.5) * G3.GW, z = this.wy * G3.GD;

    // Facing: the way they walk; at the flower or the ram while busy with
    // it; standing about, mostly toward us
    let yaw = this.dir * 0.6, force = false, side = null;
    let arm = 'walk', crouch = false, look = 0;
    if (s === 'pickFlower' && this.pickPose) {
      const plan = this.pickPose;
      side = this.pickSide > 0 ? 'R' : 'L';
      yaw = PEOPLE3.aimYaw(x, z, plan.x, plan.z, side, L);
      force = true;
      arm = plan.arm;
      crouch = plan.crouch;
    } else if (s === 'petting' && ram) {
      side = this.dir > 0 ? 'R' : 'L';
      yaw = PEOPLE3.aimYaw(x, z, (ram.wx - 0.5) * G3.GW, ram.wy * G3.GD, side, L);
      force = true;
      arm = 1.2 + 0.28 * sin((G3.frame + this.seed) * 0.3);   // pat, pat
      look = side === 'R' ? -0.5 : 0.5;                       // looking round at us
    }
    const moving = PEOPLE3.move(m, this.wx, this.wy, { yaw, force });
    if (!side) side = PEOPLE3.nearSide(m);

    // Held flower: its stem in the hand held out in front
    if (this.heldFlower) {
      if (!u.flower) {
        u.flower = PEOPLE3.tinyFlower(this.heldFlower.hsl);
        u.flower.scale.setScalar(1 / u.s);
        u.flower.position.set(0, -0.02, 0.1);
      }
      PEOPLE3.hold(m, u.flower, side);
      arm = 'carry';
    }
    PEOPLE3.pose(m, {
      walk: moving ? this.walkPhase : null, side, arm, crouch, look,
      face: PEOPLE.face(G3.frame, this.seed, 'smile'),
    });
  }
}

// An arrival/departure kid that walks to/from the school with a backpack
class ArrivalKid {
  static g3 = true;      // drawn as a 3D model (see docs/GARDEN_3D.md)

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

    if (this.departing) {
      // out of the doors and away across the lawn
      this.wx = PEOPLE.doorX();
      this.wy = PEOPLE.DOOR_IN_WY;
      this.twx = this.fromLeft ? -0.08 : 1.08;
      this.twy = random(0.3, 0.7);
      this.dir = this.twx < 0.5 ? -1 : 1;
      this.emerging = true;   // first steps out of the doors, toward us
    } else {
      this.wx = this.fromLeft ? -0.08 : 1.08;
      this.wy = random(0.3, 0.7);
    }
  }

  // Walks toward the target position; marks done on arrival
  update() {
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

  // Poses the student walking with a backpack: in at the doors, or out of them and away
  draw() {
    const m = PEOPLE3.model(this, this.emerging ? 0 : this.dir * G3.YAW.right);
    const moving = PEOPLE3.move(m, this.wx, this.wy);
    PEOPLE3.pose(m, { walk: moving ? this.walkPhase : null, face: PEOPLE.face(G3.frame, this.seed, 'smile') });
  }
}

// I SPY card: three different students side by side like a class photo:
// one waving, one holding up a flower, one with a cap and a backpack.
G3.cardArt('kids', () => {
  const P = PEOPLE, g = new THREE.Group();
  const looks = [
    P.look({ kind: 'kid', skin: 2, hair: 'bob', hairCol: P.BLACK, top: P.BRIGHTS[7], stripe: PAL.white,
             sleeves: 'short', bottom: P.JEANS, legs: 'skin', height: 1 }),
    P.look({ kind: 'kid', skin: 4, hair: 'curly', hairCol: P.BLACK, top: P.BRIGHTS[2],
             sleeves: 'short', bottom: P.NAVY, height: -1 }),
    P.look({ kind: 'kid', skin: 0, hair: 'swoop', hairCol: P.GINGER, top: P.BRIGHTS[3],
             sleeves: 'short', bottom: P.KHAKI, cap: P.BRIGHTS[0], pack: P.BRIGHTS[5] }),
  ];
  const a = PEOPLE3.build(looks[0]), b = PEOPLE3.build(looks[1]), c = PEOPLE3.build(looks[2]);
  a.position.set(-0.85, 0, -0.1);
  b.position.set(0, 0, 0.25);
  c.position.set(0.85, 0, -0.1);
  c.rotation.y = -0.5;
  PEOPLE3.pose(a, { side: 'R', arm: 'wave', arm2: 'down', t: 2, snap: true });
  const flower = PEOPLE3.hold(b, PEOPLE3.tinyFlower([320, 80, 68]), 'L');
  flower.scale.setScalar(1 / b.userData.s);
  flower.position.set(0, -0.02, 0.1);
  PEOPLE3.pose(b, { side: 'L', arm: 'hold', arm2: 'down', snap: true });
  PEOPLE3.pose(c, { arm: 'down', arm2: 'down', snap: true });
  g.add(a, b, c);
  return g;
});
