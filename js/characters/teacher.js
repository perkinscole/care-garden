// ================================================================
// File: teacher.js
// Author: Cole Perkins
// Date Created: April 11, 2026
// Last Modified: November 22, 2026
// Description: Teacher characters that walk to/from the school during
//   dawn and dusk arrival/departure events. Each teacher has a random
//   appearance (hair, outfit, sometimes a tote bag or a coffee) and can
//   display a greeting speech bubble. Drawn as pixel art from the shared
//   people sprites in js/art/people_art.js.
// ================================================================

// What teachers wear. `top` is an index into PEOPLE.SOFTS (or 'white'),
// `bottom` and `legs` are cloth names on PEOPLE, `tie` a palette colour.
// Fixed lists keep the number of recoloured sprites small.
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
// a beard or a tie; women get longer styles and sometimes a skirt.
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
  });
}

// Draws a teacher with whatever they are carrying ('bag', 'coffee' or null).
// Shared by the Teacher class and the staff card.
function drawTeacherFigure(x, y, L, dir, leg, carry, face) {
  PX.shadow(x, y, 12);
  const top = PEOPLE.top(y, L, leg);
  if (carry === 'coffee') {
    // cup held out in front at chest height
    PEOPLE.draw(x, y, L, dir, leg, 'hold', face);
    PX.spr('teacherCup', PEOPLE.handX(x, dir, L, 'hold') + dir, top + 4);
  } else if (carry === 'bag') {
    // tote bag hanging from a straight arm
    PEOPLE.draw(x, y, L, dir, leg, 'down', face);
    PX.spr('teacherBag', PEOPLE.handX(x, dir, L, 'down'), top + 11);
  } else {
    PEOPLE.draw(x, y, L, dir, leg, 'walk', face);
  }
}

// A teacher that walks toward or away from the school during arrival/departure
class Teacher {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

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
    this.fade = 1;
    this.entering = false;   // true for the last steps in through the doors

    if (this.departing) {
      // Start at school door, walk outward
      this.wx = PEOPLE.doorX();
      this.wy = PEOPLE.DOOR_WY + 0.008;
      this.twx = this.fromLeft ? -0.08 : 1.08;
      this.twy = random(0.3, 0.7);
      this.dir = this.twx < 0.5 ? -1 : 1;
      this.fade = 0;   // fades in coming out of the doors
      this.emerging = true;   // first steps out, seen from the front
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
    if (this.fade < 1) this.fade = min(1, this.fade + 0.06);
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

  // Draws the teacher walking; arrivals fade as they go in through the doors
  draw() {
    const { x, y } = worldToPx(this.wx, this.wy);
    const alpha = min(this.fade, PEOPLE.doorAlpha(this));
    if (alpha <= 0.02) return;
    const c = PX.c, prevAlpha = c.globalAlpha;
    c.globalAlpha = prevAlpha * alpha;
    if (this.entering || this.emerging) {
      // seen from behind stepping in through the doors, from the front stepping out
      PX.shadow(x, y, 12);
      PEOPLE.draw(x, y, this.look, this.dir,
                  this.entering ? PEOPLE.backFrame(this.walkPhase) : PEOPLE.frontFrame(this.walkPhase));
    } else {
      drawTeacherFigure(x, y, this.look, this.dir, PEOPLE.walkFrame(this.walkPhase), this.carry,
                        PEOPLE.face(PX.tick, this.seed, 'smile'));
    }
    c.globalAlpha = prevAlpha;
  }
}

// I SPY card: three different members of staff bunched together, no wider
// than 44 art pixels so the card can use its big text. The two at the back
// (one with a tote bag, one with a coffee) stand a little higher and are
// drawn first; the one in the middle stands in front and waves.
CARD_ART.staff = (x, y, tick) => {
  const P = PEOPLE;
  const looks = CARD_ART._staffLooks || (CARD_ART._staffLooks = [
    P.look({ kind: 'skirt', skin: 3, hair: 'bun', hairCol: P.BLACK, top: P.SOFTS[4], collar: PAL.white,
             tie: PAL.ye2, bottom: P.NAVY, legs: P.CHARCOAL, shoes: PAL.black }),
    P.look({ kind: 'adult', skin: 1, hair: 'short', hairCol: P.BROWN, top: P.SOFTS[1], collar: PAL.white,
             bottom: P.KHAKI, shoes: PAL.wo4 }),
    P.look({ kind: 'adult', skin: 0, hair: 'long', hairCol: P.GINGER, top: P.SOFTS[3], collar: PAL.white,
             bottom: P.CHARCOAL, shoes: PAL.black }),
  ]);
  drawTeacherFigure(x - 12, y - 2, looks[0], 1, 'stand', 'bag', P.face(tick, 1, 'smile'));
  drawTeacherFigure(x + 13, y - 2, looks[2], -1, 'stand', 'coffee', P.face(tick, 3, 'smile'));
  // the one in front gives a wave now and then
  const waving = tick % 260 > 170;
  PX.shadow(x, y, 12);
  P.draw(x, y, looks[1], 1, 'stand', waving ? (Math.floor(tick / 10) % 2 ? 'wave1' : 'wave2') : 'down',
         P.face(tick, 2, 'smile'));
};
