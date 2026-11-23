// ================================================================
// File: teacher.js
// Author: Cole Perkins
// Date Created: April 11, 2026
// Last Modified: November 22, 2026
// Description: Teacher characters that walk to/from the school during
//   dawn and dusk arrival/departure events. Each teacher has a random
//   appearance (hair, outfit, sometimes a tote bag or a coffee) and can
//   display a greeting speech bubble. 3D box people built by PEOPLE3
//   (js/g3_people.js).
// ================================================================

// What teachers wear. `top` is an index into PEOPLE.SOFTS (or 'white'),
// `bottom` and `legs` are cloth names on PEOPLE, `tie` a palette colour.
// Fixed lists keep the number of textures small.
const TEACHER_OUTFITS_M = [
  { top: 'white', bottom: 'NAVY', tie: 'bl3' },
  { top: 0, bottom: 'KHAKI' },
  { top: 1, bottom: 'CHARCOAL' },
  { top: 6, bottom: 'NAVY' },
  { top: 0, bottom: 'CHARCOAL', tie: 're3' },
  { top: 7, bottom: 'KHAKI' },
  { top: 'white', bottom: 'COCOA', tie: 'gr4' },
  { top: 5, bottom: 'GREY' },
];
const TEACHER_OUTFITS_F = [
  { kind: 'skirt', top: 2, bottom: 'NAVY', legs: 'CHARCOAL' },
  { kind: 'skirt', top: 5, bottom: 'CHARCOAL', legs: 'CHARCOAL', necklace: true },
  { kind: 'skirt', top: 4, bottom: 'COCOA', legs: 'COCOA' },
  { kind: 'skirt', top: 3, bottom: 'GREY', legs: 'CHARCOAL', necklace: true },
  { kind: 'adult', top: 2, bottom: 'CHARCOAL' },
  { kind: 'adult', top: 3, bottom: 'NAVY' },
  { kind: 'adult', top: 'white', bottom: 'JEANS' },
  { kind: 'adult', top: 4, bottom: 'KHAKI' },
];
// Said on the way home at dusk (the morning greetings are in constants.js)
const TEACHER_GOODBYES = ["See you tomorrow!", "Good night!", "Go Rams!", "Great work today!"];

// Picks a random teacher look. Men get short hair (or none) and sometimes
// a beard or a tie; women get longer styles and sometimes a skirt. A few
// wear glasses (worked out from the rest of the look, so the same random
// draws give the same teachers as before).
function makeTeacherLook(isMale) {
  const P = PEOPLE;
  const skin = floor(random(P.SKIN.length));
  const hairCols = skin <= 1 ? [P.BLONDE, P.GINGER, P.LIGHT, P.BROWN, P.DARK, P.GRAY]
                 : skin === 2 ? [P.BROWN, P.DARK, P.BLACK, P.GRAY]
                 : [P.DARK, P.BLACK, P.BLACK, P.GRAY];
  const hairCol = hairCols[floor(random(hairCols.length))];
  if (isMale) {
    const o = TEACHER_OUTFITS_M[floor(random(TEACHER_OUTFITS_M.length))];
    const hair = random(['short', 'short', 'neat', 'neat', 'buzz', 'swoop', 'fringe', null]);
    return P.look({
      kind: 'adult', skin, hair, hairCol,
      beard: random() < 0.25 ? hairCol : undefined,
      top: o.top === 'white' ? P.WHITE : P.SOFTS[o.top],
      collar: PAL.white,
      tie: o.tie ? PAL[o.tie] : undefined,
      bottom: P[o.bottom],
      shoes: random() < 0.5 ? PAL.wo4 : PAL.black,
      glasses: (skin + hairCol + TEACHER_OUTFITS_M.indexOf(o)) % 3 === 0 ? PAL.g5 : undefined,
    });
  }
  const o = TEACHER_OUTFITS_F[floor(random(TEACHER_OUTFITS_F.length))];
  return P.look({
    kind: o.kind, skin, hairCol,
    hair: random(['bob', 'long', 'long', 'bun', 'pony', 'curly']),
    top: o.top === 'white' ? P.WHITE : P.SOFTS[o.top],
    collar: PAL.white,
    tie: o.necklace ? PAL.ye2 : undefined,
    bottom: P[o.bottom],
    legs: o.legs ? P[o.legs] : undefined,
    shoes: random() < 0.5 ? PAL.wo4 : PAL.black,
    glasses: (skin + hairCol + TEACHER_OUTFITS_F.indexOf(o)) % 4 === 0 ? PAL.re3 : undefined,
  });
}

// Puts whatever a teacher is carrying ('bag', 'coffee' or null) in their
// hand and returns the arm pose that goes with it. Shared by the Teacher
// class and the staff card.
function teacherCarry(m, carry, side) {
  const u = m.userData;
  if (!carry) return 'walk';
  if (!u.prop) u.prop = carry === 'bag' ? PEOPLE3.toteBag() : PEOPLE3.coffeeCup();
  PEOPLE3.hold(m, u.prop, side);
  return carry === 'bag' ? 'hang' : 'hold';   // a tote hanging low, a cup held out in front
}

// A teacher that walks toward or away from the school during arrival/departure
class Teacher {
  static g3 = true;      // drawn as a 3D model (see docs/GARDEN_3D.md)

  constructor(departing) {
    this.departing = departing || false;
    this.fromLeft = random() < 0.5;
    this.dir = this.fromLeft ? 1 : -1;
    this.speed = random(0.002, 0.003);
    this.walkPhase = random(TWO_PI);
    this.done = false;
    this.spoken = false;
    this.age = 0;
    this.name = TEACHER_NAMES[floor(random(TEACHER_NAMES.length))];

    // Appearance
    this.isMale = this.name.startsWith('Mr.');
    this.look = makeTeacherLook(this.isMale);
    const r = random();
    this.carry = r < 0.3 ? 'bag' : r < 0.55 ? 'coffee' : null;
    this.seed = floor(random(1000));
    this.entering = false;   // true for the last steps in through the doors

    if (this.departing) {
      // Start at school door, walk outward
      this.wx = PEOPLE.doorX();
      this.wy = PEOPLE.DOOR_IN_WY;
      this.twx = this.fromLeft ? -0.08 : 1.08;
      this.twy = random(0.3, 0.7);
      this.dir = this.twx < 0.5 ? -1 : 1;
      this.emerging = true;   // first steps out of the doors, toward us
    } else {
      // Start off-screen, walk toward school
      this.wx = this.fromLeft ? -0.08 : 1.08;
      this.wy = random(0.3, 0.7);
      this.twx = PEOPLE.doorX(this.wx);
      this.twy = PEOPLE.DOOR_FRONT_WY;
      this.doorWx = this.twx;
    }
  }

  // Walk toward target, speak once, mark done when arrived
  update() {
    this.age++;
    const dx = this.twx - this.wx;
    const dy = this.twy - this.wy;
    const dist = sqrt(dx * dx + dy * dy);
    const fromX = this.wx, fromY = this.wy;

    if (!this.departing) {
      // along the sidewalk to the doors, then in
      if (PEOPLE.goIn(this, this.speed)) this.done = true;
    } else if (PEOPLE.comeOut(this, this.speed)) {
      // down the step from the doors first
    } else if (dist > 0.02) {
      this.wx += (dx / dist) * this.speed;
      this.wy += (dy / dist) * this.speed;
      this.dir = dx > 0 ? 1 : -1;
    } else {
      this.done = true;
    }
    this.walkPhase += walkStride(this.wx - fromX, this.wy - fromY, PEOPLE.STRIDE_ADULT);

    // Speak once: arrivals as they near the school, departures a moment
    // after stepping out (while they are still on screen)
    const timeToSpeak = this.departing ? this.age > 50 : dist < 0.3;
    if (!this.spoken && timeToSpeak) {
      this.spoken = true;
      if (random() < 0.5) {
        const lines = this.departing ? TEACHER_GOODBYES : TEACHER_GREETINGS;
        const self = this;
        // (the bubble stays behind, fading, if they go in while it is showing)
        PEOPLE.say(lines[floor(random(lines.length))],
          () => PEOPLE.bubblePos(self.wx, self.wy, self.look), () => PEOPLE.hasLeft(self));
      }
    }
  }

  // Poses the teacher walking with their bag or coffee: in at the doors, or out of them and away
  draw() {
    const m = PEOPLE3.model(this, this.emerging ? 0 : this.dir * G3.YAW.right);
    const moving = PEOPLE3.move(m, this.wx, this.wy);
    const side = PEOPLE3.nearSide(m);
    PEOPLE3.pose(m, {
      walk: moving ? this.walkPhase : null, side,
      arm: teacherCarry(m, this.carry, side),
      face: PEOPLE.face(G3.frame, this.seed, 'smile'),
    });
  }
}

// I SPY card: three different members of staff side by side: one with a
// tote bag, one waving, one with a coffee.
G3.cardArt('staff', () => {
  const P = PEOPLE, g = new THREE.Group();
  const a = PEOPLE3.build(P.look({ kind: 'skirt', skin: 3, hair: 'bun', hairCol: P.BLACK, top: P.SOFTS[4], collar: PAL.white,
    tie: PAL.ye2, bottom: P.NAVY, legs: P.CHARCOAL, shoes: PAL.black, glasses: PAL.re3 }));
  const b = PEOPLE3.build(P.look({ kind: 'adult', skin: 1, hair: 'short', hairCol: P.BROWN, top: P.SOFTS[1], collar: PAL.white,
    bottom: P.KHAKI, shoes: PAL.wo4 }));
  const c = PEOPLE3.build(P.look({ kind: 'adult', skin: 0, hair: 'long', hairCol: P.GINGER, top: P.SOFTS[3], collar: PAL.white,
    bottom: P.CHARCOAL, shoes: PAL.black }));
  a.position.set(-1.05, 0, -0.1);
  b.position.set(0, 0, 0.2);
  c.position.set(1.05, 0, -0.1);
  c.rotation.y = -0.5;
  PEOPLE3.pose(a, { side: 'R', arm: teacherCarry(a, 'bag', 'R'), arm2: 'down', snap: true });
  PEOPLE3.pose(b, { side: 'L', arm: 'wave', arm2: 'down', t: 2, snap: true });
  PEOPLE3.pose(c, { side: 'L', arm: teacherCarry(c, 'coffee', 'L'), arm2: 'down', snap: true });
  g.add(a, b, c);
  return g;
});
