// ================================================================
// File: creatures.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Small animated creatures that add atmospheric life
//   to the garden scene. Includes butterflies, bees, and birds, drawn
//   as little 3D box models (ANIMALS3 in js/art/animals_art.js).
//
//   Creatures keep their x / y in SCREEN pixels because the cat's
//   hunting logic reads them; each is drawn at the point in the 3D
//   garden that appears at that pixel (G3.fromArt).
// ================================================================

// ── Creatures ─────────────────────────────────────────

// Butterflies and bees go to bed at dusk: how big to draw them (1 by day,
// shrinking to 0 as night falls). Below 0.05 they are not drawn at all.
function creatureDaySize() {
  const na = nightAmount();
  return na > 0.95 ? 0 : 1 - constrain((na - 0.45) / 0.5, 0, 1);
}

// How far above the lawn butterflies and bees fly, in blocks (about the
// height of the blooms)
const BUTTERFLY_LIFT = 2.2, BEE_LIFT = 1.9;

// Butterfly with smooth drifting flight paths and animated wing flaps
class Butterfly {
  static g3 = true;      // drawn as a 3D box model (see docs/GARDEN_3D.md)

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
    this.colour = floor(random(ANIMALS3.BUTTERFLY_COLOURS.length));   // which wing colours
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
  // Poses the butterfly: it leans the way it is heading, and its wings
  // open flat toward us and close up over its back.
  draw() {
    const day = creatureDaySize();
    if (day < 0.05) return;
    const m = G3.model(this, ANIMALS3.butterfly), u = m.userData;
    ANIMALS3.paintButterfly(m, this.colour);
    G3.fromArt(this.x / PX.S, this.y / PX.S, BUTTERFLY_LIFT, m.position);
    m.scale.setScalar(this.size * 1.25 * day);
    const lean = constrain((this.tx - this.x) / 150, -1, 1) * 0.7;
    m.rotation.z += (-lean - m.rotation.z) * 0.1;
    const beat = 0.6 - 0.6 * Math.cos(t * 0.22 + this.wingPhase);   // 0 open .. 1.2 closed
    u.wings[0].rotation.z = beat;
    u.wings[1].rotation.z = -beat;
    u.tilt.position.y = -beat * 0.05;      // the body dips as the wings close
  }
}

// Bee with faster jittery flight paths and a striped body
class Bee {
  static g3 = true;      // drawn as a 3D box model (see docs/GARDEN_3D.md)

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
  // Poses the bee facing the way it is heading, wings a buzzing blur of two positions.
  draw() {
    const day = creatureDaySize();
    if (day < 0.05) return;
    const m = G3.model(this, ANIMALS3.bee), u = m.userData;
    G3.fromArt(this.x / PX.S, this.y / PX.S, BEE_LIFT, m.position);
    m.scale.setScalar(1.3 * day);
    G3.face(m, this.tx < this.x ? -1 : 1, 0.55, 0.2);
    m.rotation.x = 0.15;
    const buzz = Math.floor((t + this.wingPhase * 3) / 3) % 2 ? 0.75 : 0.1;
    u.wings[0].rotation.z = buzz;
    u.wings[1].rotation.z = -buzz;
  }
}

// Bird with a state machine (fly, descend, landed, takeoff) and animated wings
class Bird {
  static g3 = true;      // drawn as a 3D box model (see docs/GARDEN_3D.md)

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
    this.kind = floor(random(ANIMALS3.BIRD_KINDS.length));
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

  // Poses the bird: standing, pecking or hopping on the ground with its
  // wings folded, or in the air with its wings beating.
  draw() {
    const m = G3.model(this, () => ANIMALS3.bird(this.kind)), u = m.userData;
    m.scale.setScalar(0.85 + this.size * 0.3);
    const legs = u.legs, wings = u.wings;

    if (this.state === 'landed') {
      let gx = this.landX, lift = 0, tip = 0;
      if (this.hopT > 0) {
        // mid-hop: from the old spot to the new one in a small arc
        const k = 1 - this.hopT / 10;
        gx = lerp(this.hopFrom, this.landX, k);
        lift = sin(k * PI) * 0.2;
      } else {
        // peck at the lawn twice every few seconds
        const beat = this.peckClock % 150;
        if ((beat < 9) || (beat > 17 && beat < 26)) tip = 0.85;
      }
      G3.fromArt(gx / PX.S, this.landY / PX.S, 0, m.position);
      this._depth = m.position.z;
      m.position.y += lift;
      G3.face(m, this.face, 0.45, 0.3);
      u.body.rotation.x += (tip - u.body.rotation.x) * 0.4;
      legs[0].visible = legs[1].visible = true;
      legs[0].rotation.x = legs[1].rotation.x = -u.body.rotation.x;     // feet stay under it
      // wings folded down against its sides
      wings[0].rotation.z = -1.45; wings[1].rotation.z = 1.45;
      wings[0].scale.x = wings[1].scale.x = 0.6;
      return;
    }

    // In the air: it is drawn on the line of sight through its pixel. Its
    // depth eases between "high over the back of the garden" and the spot
    // on the lawn it is landing on or leaving, never below the grass.
    const ax = this.x / PX.S, ay = this.y / PX.S;
    const v = Bird._v || (Bird._v = new THREE.Vector3());
    let want = G3.fromArt(ax, ay, 1.6, v).z;
    if (this.state === 'descend') want = Math.max(want, this.landWy * G3.GD);
    if (this._depth === undefined) this._depth = want;
    this._depth += (want - this._depth) * (this.state === 'descend' ? 0.05 : 0.03);
    const depth = Math.max(this._depth, G3.fromArt(ax, ay, 0.15, v).z);
    ANIMALS3.rayAtZ(ax, ay, depth, m.position);

    const flap = sin(this.wingPhase);
    m.position.y -= flap * 0.06;                     // the body lifts on each downstroke
    // when descending the bird turns toward its landing spot
    const dir = this.state === 'descend' ? (this.landX >= this.x ? 1 : -1) : this.dir;
    G3.face(m, dir, 0.3, 0.25);
    const pitch = this.state === 'takeoff' ? -0.45 : this.state === 'descend' ? 0.2 : 0;
    u.body.rotation.x += (pitch - u.body.rotation.x) * 0.2;
    wings[0].rotation.z = flap * 0.95; wings[1].rotation.z = -flap * 0.95;
    wings[0].scale.x = wings[1].scale.x = 1;
    // legs tucked up in flight, dangling when coming in to land or just off the ground
    legs[0].visible = legs[1].visible = this.state !== 'fly';
    legs[0].rotation.x = legs[1].rotation.x = 0.5;
  }
}
