// ================================================================
// File: creatures.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Small animated creatures that add atmospheric life
//   to the garden scene. Includes butterflies, bees, and birds, drawn
//   as pixel-art sprites (see js/art/weather_art.js).
//
//   Creatures keep their x / y in SCREEN pixels because the cat's
//   hunting logic reads them; they are converted to art pixels only
//   when drawn.
// ================================================================

// ── Creatures ─────────────────────────────────────────

// Wing colours a butterfly can have: m = wing, l = light patch, d = dark
// edge. A short fixed list, so each recoloured sprite is built only once.
const BUTTERFLY_COLOURS = [
  { m: PAL.or2, l: PAL.ye2, d: PAL.or3 },   // monarch orange
  { m: PAL.ye2, l: PAL.ye1, d: PAL.ye3 },   // brimstone yellow
  { m: PAL.white, l: PAL.cream, d: PAL.g2 }, // cabbage white
  { m: PAL.bl2, l: PAL.bl1, d: PAL.bl3 },   // common blue
  { m: PAL.pi2, l: PAL.pi1, d: PAL.pi3 },   // pink
  { m: PAL.pu2, l: PAL.pu1, d: PAL.pu3 },   // purple emperor
  { m: PAL.re2, l: PAL.or1, d: PAL.re3 },   // red admiral
];

// One wing beat: open, half, closed, half.
const BUTTERFLY_BEAT = ['open', 'half', 'closed', 'half'];

// Butterfly with smooth drifting flight paths and animated wing flaps
class Butterfly {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor() {
    this.reset();
    this.y  = random(20, splitY() - 30);
  }
  // Randomizes position, target, speed, colour, and size for a new flight path
  reset() {
    this.x = random(-40, width + 40);
    this.y  = random(20, splitY() - 30);
    this.tx = random(20, width - 20);
    this.ty = random(20, splitY() - 30);
    this.speed = random(0.004, 0.009);
    this.prog = 0;
    this.pal = BUTTERFLY_COLOURS[floor(random(BUTTERFLY_COLOURS.length))];
    this.size = random(0.7, 1.2);
    this.wingPhase = random(TWO_PI);
  }
  // Moves the butterfly along a smooth lerp path with sinusoidal lift
  update() {
    this.prog += this.speed;
    this.tx += windX * 0.4;
    this.tx = constrain(this.tx, 20, width - 20);
    if (this.prog >= 1) this.reset();
    this.x = lerp(this.x, this.tx, this.speed * 4);
    this.y = lerp(this.y, this.ty, this.speed * 4) + sin(this.prog * PI) * -18;
  }
  // Draws the butterfly: the wing beat steps through three frames, and the
  // body dips a pixel as the wings close, which gives the flutter.
  draw() {
    const x = Math.round(this.x / PX.S), y = Math.round(this.y / PX.S);
    const beat = Math.floor((t * 0.22 + this.wingPhase) / (TWO_PI / 4)) % 4;
    const frame = BUTTERFLY_BEAT[beat];
    PX.spr('butterfly', x, y + (frame === 'closed' ? 1 : 0), { frame, pal: this.pal });
  }
}

// Bee with faster jittery flight paths and a striped body
class Bee {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor() {
    this.reset();
    this.y  = random(20, splitY() - 20);
  }
  // Randomizes position, target, speed, and wobble for a new flight segment
  reset() {
    this.x = random(width);
    this.y  = random(20, splitY() - 20);
    this.tx = random(20, width - 20);
    this.ty = random(20, splitY() - 20);
    this.speed = random(0.012, 0.022);
    this.prog = 0;
    this.wingPhase = random(TWO_PI);
    this.wobble = random(TWO_PI);
  }
  // Moves the bee with lerp interpolation and a sinusoidal vertical wobble
  update() {
    this.prog += this.speed;
    this.tx += windX * 0.25;
    this.tx = constrain(this.tx, 20, width - 20);
    if (this.prog >= 1) this.reset();
    this.x = lerp(this.x, this.tx, this.speed * 3);
    this.y = lerp(this.y, this.ty, this.speed * 3) + sin(t * 0.18 + this.wobble) * 2;
  }
  // Draws the bee facing the way it is heading, wings buzzing between two frames
  draw() {
    const x = Math.round(this.x / PX.S), y = Math.round(this.y / PX.S);
    const buzz = Math.floor((t + this.wingPhase * 3) / 3) % 2;
    PX.spr('bee', x, y, { frame: buzz ? 'up' : 'back', flip: this.tx < this.x });
  }
}

// The kinds of bird that visit: m = body, w = wing, l = breast and belly,
// y = beak and legs. Each bird picks one when it appears.
const BIRD_KINDS = [
  { m: '#3d3a4e', w: '#55526a', l: '#55526a', y: PAL.ye3 },     // blackbird
  { m: PAL.wo3,   w: PAL.wo2,   l: PAL.or2,   y: PAL.ye3 },     // robin
  { m: PAL.bl3,   w: PAL.bl2,   l: PAL.white, y: PAL.g5  },     // bluebird
  { m: PAL.wo2,   w: PAL.wo3,   l: PAL.ta1,   y: PAL.ta3 },     // sparrow
  { m: '#3d3a4e', w: '#55526a', l: '#55526a', y: PAL.ye3 },     // blackbirds are the most common
];

// Birds are drawn after the garden has been tinted for the time of day, so
// they are dimmed here instead. A few fixed steps keep the recolours cached.
const BIRD_NIGHT_STEPS = 3;
const birdPalCache = {};
function birdPalette(kind, na) {
  const step = Math.round(na * BIRD_NIGHT_STEPS);
  const key = kind * 10 + step;
  let pal = birdPalCache[key];
  if (!pal) {
    const k = step / BIRD_NIGHT_STEPS * 0.56;      // the same strength as the night tint
    const base = BIRD_KINDS[kind];
    const dim = c => PX.mix(c, '#161c54', k);
    pal = { m: dim(base.m), w: dim(base.w), l: dim(base.l), y: dim(base.y), e: dim(PAL.white), o: dim(PAL.ink) };
    birdPalCache[key] = pal;
  }
  return pal;
}

// Bird with a state machine (fly, descend, landed, takeoff) and animated wings
class Bird {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor() {
    this.done = false;
    this.fromLeft = random() < 0.5;
    this.x = this.fromLeft ? -30 : width + 30;
    this.y = random(gndHorizon() * 0.15, gndHorizon() * 0.85);
    this.speed = random(1.8, 3.5);
    this.dir = this.fromLeft ? 1 : -1;
    this.wingPhase = random(TWO_PI);
    this.state = 'fly';
    this.landTimer = 0;
    this.landX = 0;
    this.landY = 0;
    this.landWy = 0;
    this.willLand = random() < 0.4;
    this.landTriggered = false;
    this.flapSpeed = random(0.18, 0.28);
    this.size = random(0.7, 1.2);
    // flocking — slight vertical drift
    this.yDrift = random(-0.4, 0.4);
    this.kind = floor(random(BIRD_KINDS.length));
    this.face = this.dir;      // which way it looks while on the ground
    this.hopT = 0;             // frames left in the current hop
    this.hopFrom = 0;          // where the hop started (screen x)
    this.peckClock = floor(random(200));
  }

  // Advances the bird through its state machine: fly, descend, landed, takeoff
  update() {
    if (this.state === 'fly') {
      this.x += this.speed * this.dir;
      this.y += this.yDrift;
      this.y = constrain(this.y, 10, gndHorizon() * 0.9);
      this.wingPhase += this.flapSpeed;

      // trigger landing when roughly halfway across
      if (this.willLand && !this.landTriggered && abs(this.x - width/2) < 80) {
        this.landTriggered = true;
        // pick a world position to land on
        this.landWy = random(0.1, 0.7);
        const { sx, sy } = worldToScreen(random(0.1, 0.9), this.landWy);
        this.landX = sx;
        this.landY = sy;
        this.state = 'descend';
      }

      // exit screen
      if (this.x < -60 || this.x > width + 60) this.done = true;

    } else if (this.state === 'descend') {
      this.x = lerp(this.x, this.landX, 0.04);
      this.y = lerp(this.y, this.landY - 8, 0.04);
      this.wingPhase += this.flapSpeed * 0.5;
      if (dist(this.x, this.y, this.landX, this.landY - 8) < 4) {
        this.state = 'landed';
        this.landTimer = floor(random(120, 360));
        this.face = this.landX >= this.x ? 1 : -1;
        this.hopT = 0;
      }

    } else if (this.state === 'landed') {
      this.landTimer--;
      this.peckClock++;
      if (this.hopT > 0) this.hopT--;
      // occasional hop
      if (frameCount % 45 === 0 && random() < 0.3) {
        this.hopFrom = this.landX;
        this.landX += random(-15, 15);
        this.landX = constrain(this.landX, 20, width - 20);
        this.face = this.landX >= this.hopFrom ? 1 : -1;
        this.hopT = 10;
      }
      if (this.landTimer <= 0) {
        this.state = 'takeoff';
        this.wingPhase = 0;
        // leave from where it is standing now, not from where it first landed
        this.x = this.landX;
        this.y = this.landY - 8;
      }

    } else if (this.state === 'takeoff') {
      this.y -= 2.5;
      this.x += this.speed * this.dir;
      this.wingPhase += this.flapSpeed * 1.4;  // fast flap on takeoff
      if (this.y < gndHorizon() * 0.3) {
        this.state = 'fly';
        this.willLand = false;  // don't land again
      }
      if (this.x < -60 || this.x > width + 60) this.done = true;
    }
  }

  // Draws the bird: standing, pecking or hopping on the ground, or in the
  // air with a three-frame wing beat (wings up, level, down).
  draw() {
    const pal = birdPalette(this.kind, nightAmount());

    if (this.state === 'landed') {
      const gy = Math.round(this.landY / PX.S);
      if (this.hopT > 0) {
        // mid-hop: slide from the old spot to the new one in a small arc
        const k = 1 - this.hopT / 10;
        const hx = Math.round(lerp(this.hopFrom, this.landX, k) / PX.S);
        const lift = Math.round(sin(k * PI) * 3);
        PX.shadow(hx, gy, 8 - lift);
        PX.spr('bird_ground', hx, gy - lift, { frame: 'hop', flip: this.face < 0, pal });
      } else {
        // peck at the lawn twice every few seconds
        const beat = this.peckClock % 150;
        const pecking = (beat < 9) || (beat > 17 && beat < 26);
        const gx = Math.round(this.landX / PX.S);
        PX.shadow(gx, gy, 8);
        PX.spr('bird_ground', gx, gy, { frame: pecking ? 'peck' : 'stand', flip: this.face < 0, pal });
      }
      return;
    }

    const x = Math.round(this.x / PX.S), y = Math.round(this.y / PX.S);
    const flap = sin(this.wingPhase);
    const frame = flap > 0.45 ? 'up' : (flap < -0.45 ? 'down' : 'mid');
    // when descending the bird turns toward its landing spot
    const dir = this.state === 'descend' ? (this.landX >= this.x ? 1 : -1) : this.dir;
    // the body lifts a pixel on each downstroke
    PX.spr('bird_fly', x, y - (frame === 'down' ? 1 : 0), { frame, flip: dir < 0, pal });
  }
}
