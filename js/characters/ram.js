// ================================================================
// File: ram.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines Ramy the Ram, the school mascot, who wanders the
//   garden, grazes on flowers, and produces droppings that grow into new
//   flowers. Drawn as a 3D box animal (ANIMALS3.ram in
//   js/art/animals_art.js).
// ================================================================

// Distances along the ram, in art pixels from the point between his feet
// (the garden is PX.W art pixels wide, so 20 is a little over one block)
const RAM_MOUTH_PX = 20;   // forward to his mouth when he grazes
const RAM_TAIL_PX  = 15;   // back to his tail

// How far his head can reach, in blocks above the lawn
const RAM_REACH_LOW = 0.12, RAM_REACH_HIGH = 1.45;

// Ram class manages the sheep's state machine (wander/approach/eat/idle),
// blink cycle, speech bubbles, storm behavior, and poop-to-flower lifecycle.
class Ram {
  static g3 = true;      // drawn as a 3D box model (see docs/GARDEN_3D.md)

  constructor() {
    this.wx = 0.5;
    this.wy = 0.6;
    this.twx = random(0.1, 0.9); // target world x
    this.twy = random(0.2, 0.9); // target world y
    this.speed = 0.0018;
    this.walkPhase = 0;
    this.dir = 1;           // 1 = facing right, -1 = facing left
    this.state = 'wander';  // wander | approach | eat | idle
    this.idleTimer = 0;
    this.eatTimer = 0;
    this.eatTarget = null;  // the flower he is walking to or eating
    this.eatDir = 1;        // which way he will face while eating it
    this.eatPose = 0;       // how high he holds his head to eat: 0 down in the grass, 1 level, 2 up
    this.approachTimer = 0;
    this.blinkTimer = floor(random(80, 200));
    this.blinking = false;
    this.baaTimer = 0;      // frames left with his mouth open
    this.poopTimer = floor(random(7200, 10800));
    this.poops = [];
  }

  // Searches the flowers for one within grazing range and returns it, or null.
  findNearbyFlower() {
    // Prefer faceless flowers (poop flowers) over ones with faces
    let faceless = null;
    let withFace = null;
    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];
      if (f.size < 0.05) continue; // already eaten/tiny
      const dx = f.wx - this.wx;
      const dy = f.wy - this.wy;
      if (sqrt(dx*dx + dy*dy) < 0.12) {
        if (f.imgs.length === 0 && !faceless) faceless = f;
        else if (f.imgs.length > 0 && !withFace) withFace = f;
      }
      if (faceless) break; // found a faceless one, no need to keep looking
    }
    // Always eat faceless flowers, but only eat face flowers if above 50 total
    if (faceless) return faceless;
    if (flowers.length > 50 && withFace) return withFace;
    return null;
  }

  // Opens his mouth, plays the sheep sound and shows a speech bubble over his head.
  say(text, withSound = true) {
    if (withSound) soundPlay(sheep);
    this.baaTimer = 36;
    speechBubbles.push(new SpeechBubble(text, () => this.headPos()));
  }

  // Art-pixel point just above his head, for speech bubbles.
  headPos() {
    return ANIMALS3.artAhead(this, 0.95, (this._headTop || 1.55) + 0.3);
  }

  // Which grazing pose puts his mouth on a flower as it stands right now:
  // head down for buds and stubs, level for a low bloom, up for a tall one.
  grazePoseFor(f) {
    if (f.height() < 14) return 0;
    const head = f.headPos();
    return f.footPos().y - head.y >= 16 ? 2 : 1;
  }

  // True while a student is stroking him and he is standing still for it.
  isBeingPetted() {
    return this.state === 'idle' && kids.some(k => k.state === 'petting');
  }

  // Runs his state machine for a frame, then moves his legs in time with
  // the ground he actually covered (a flat-out gallop in a storm).
  update() {
    const fromX = this.wx, fromY = this.wy;
    this.think();
    if (weatherState === 'stormy') {
      if (this.wx !== fromX || this.wy !== fromY) this.walkPhase += 0.45;
    } else {
      this.walkPhase += walkStride(this.wx - fromX, this.wy - fromY, 26);
    }
  }

  // Advances the ram's state machine each frame: blinking, storm panic, wandering, eating, and pooping.
  think() {
    // blink
    this.blinkTimer--;
    if (this.blinkTimer <= 0) {
      this.blinking = !this.blinking;
      this.blinkTimer = this.blinking ? 6 : floor(random(80, 220));
    }
    if (this.baaTimer > 0) this.baaTimer--;

    // stand still while a student pets him
    if (kids.some(k => k.state === 'petting') && this.state === 'wander') {
      this.state = 'idle';
      this.idleTimer = 80;
      this.walkPhase = 0;
    }

    // droppings sit for a while, sprout, then turn into a flower
    for (let i = this.poops.length - 1; i >= 0; i--) {
      const p = this.poops[i];
      p.age++;
      p.drop = max(0, p.drop - 1);
      if (p.age >= 300) {
        addFlower(p.wx, p.wy, [random(360), random(60, 90), random(55, 72)]);
        this.poops.splice(i, 1);
      }
    }

    const isStormy = weatherState === 'stormy';

    if (isStormy) {
      // pick new random targets very frequently
      if (frameCount % 30 === 0) {
        this.twx = random(0.05, 0.95);
        this.twy = random(0.08, 0.95);
        this.state = 'wander';
        this.eatTarget = null;
      }
      this.speed = 0.012; // much faster
    } else {
      this.speed = 0.0018; // normal speed
    }

    if (this.state === 'wander') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);

      this.poopTimer--;
      if (this.poopTimer <= 0) {
        // Only actually poop if there are fewer than 5 faceless flowers + active poops
        const facelessCount = flowers.filter(f => f.imgs.length === 0).length + this.poops.length;
        if (facelessCount < 5) {
          // it drops from under his tail, which is behind him
          const buttWX = this.wx - this.dir * RAM_TAIL_PX / PX.W;
          this.poops.push({ wx: buttWX, wy: this.wy, age: 0, drop: 9 });
          soundPlay(fart);
        }
        this.poopTimer = floor(random(7200, 10800));
      }

      if (isStormy && frameCount % 40 === 0 && random() < 0.6) {
        this.say('BAAAA!!');
      }

      ramSpeechTimer--;
      if (ramSpeechTimer <= 0) {
        this.say(RAM_PHRASES[floor(random(RAM_PHRASES.length))], false);
        ramSpeechTimer = floor(random(300, 600));
      }

      if (d < 0.025) {
        // reached target — maybe idle, then pick new destination
        this.state = 'idle';
        this.idleTimer = floor(random(40, 140));
        this.twx = random(0.05, 0.95);
        this.twy = random(0.08, 0.95);
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        const sep = getSeparation(this.wx, this.wy, 'ram');
        this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
        this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        this.dir = dx > 0 ? 1 : -1;

        // random baa
        if (frameCount % 180 === 0 && random() < 0.25) {
          soundPlay(sheep);
          this.baaTimer = 36;
        }

        // randomly decide to hunt a flower (35% chance per check, throttled)
        if (!isStormy && frameCount % 40 === 0 && random() < 0.35) {
          const f = this.findNearbyFlower();
          if (f) {
            this.eatTarget = f;
            // stay on the side of the flower he is already on
            this.eatDir = abs(f.wx - this.wx) < 0.01 ? this.dir : (f.wx > this.wx ? 1 : -1);
            this.approachTimer = 420;
            this.state = 'approach';
          }
        }
      }

    } else if (this.state === 'approach') {
      const f = this.eatTarget;
      this.approachTimer--;
      // the flower may have been picked by a student on the way over
      if (!f || !flowers.includes(f) || this.approachTimer <= 0) {
        this.eatTarget = null;
        this.state = 'wander';
        return;
      }
      // Stand beside the flower so that his mouth lands on the near side of
      // its bloom (wherever that has swayed to), and a touch nearer the
      // front so he is drawn over it.
      const bloomDx = f.headPos().x - f.footPos().x;
      const tx = constrain(f.wx + (bloomDx - this.eatDir * (RAM_MOUTH_PX + 3)) / PX.W, 0.02, 0.98);
      const ty = constrain(f.wy + 0.004, 0.04, 0.98);
      const dx = tx - this.wx;
      const dy = ty - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      if (d < 0.006) {
        this.dir = this.eatDir;
        this.state = 'eat';
        this.eatPose = this.grazePoseFor(f);
        this.eatTimer = 90;
        soundPlay(chewing);
      } else {
        const step = min(this.speed * 1.4, d);
        this.wx += (dx / d) * step;
        this.wy += (dy / d) * step;
        // other characters only push him aside while he is still on his way
        if (d > 0.04) {
          const sep = getSeparation(this.wx, this.wy, 'ram');
          this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
          this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        }
        if (abs(dx) > 0.004) this.dir = dx > 0 ? 1 : -1;
      }

    } else if (this.state === 'eat') {
      this.eatTimer--;
      const f = this.eatTarget;
      const stillThere = f && flowers.includes(f);
      if (stillThere) {
        // shrink the flower as it's eaten
        f.restSize   *= 0.96;
        f.targetSize *= 0.96;
        // and follow it down: his head only ever lowers during a meal, so
        // a nodding bloom cannot make it bob up and down
        this.eatPose = min(this.eatPose, this.grazePoseFor(f));
      }
      if (this.eatTimer <= 0 || !stillThere) {
        // remove it
        if (stillThere) {
          f.dispose();
          flowers.splice(flowers.indexOf(f), 1);
        }
        this.eatTarget = null;
        this.state = 'idle';
        this.idleTimer = floor(random(30, 80));
        this.twx = random(0.05, 0.95);
        this.twy = random(0.08, 0.95);
      }

    } else if (this.state === 'idle') {
      this.idleTimer--;
      this.walkPhase = 0;
      if (this.idleTimer <= 0) this.state = 'wander';
    }
  }

  // How high (in blocks) his mouth should be to eat the flower he is at:
  // down at its foot for a bud or a stub, otherwise at its bloom, as far
  // as his neck will stretch. Leaves the spot he is eating at in Ram._v.
  mouthHeight() {
    const f = this.eatTarget, v = Ram._v;
    if (!f) { G3.pos(this.wx + this.dir * 0.03, this.wy, 0, v); return RAM_REACH_LOW; }
    if (this.eatPose === 0) {
      if (typeof f.foot3 === 'function') f.foot3(v); else G3.pos(f.wx, f.wy, 0, v);
      v.y += 0.1;
    } else if (typeof f.head3 === 'function') f.head3(0, v);
    else G3.pos(f.wx, f.wy, 1, v);
    return constrain(v.y, RAM_REACH_LOW, this.eatPose === 2 ? RAM_REACH_HIGH : 1.0);
  }

  // Poses his droppings (which eventually become flowers) and then the ram himself.
  draw() {
    if (!Ram._v) Ram._v = new THREE.Vector3();
    for (const p of this.poops) this.drawPoop(p);

    const m = G3.model(this, ANIMALS3.ram), u = m.userData;
    const s = this.state;
    const moving = s === 'wander' || s === 'approach';
    const running = moving && weatherState === 'stormy';
    const petted = this.isBeingPetted();

    // where he stands (a gallop bounces) and which way he faces
    G3.place(m, this.wx, this.wy, running ? Math.abs(Math.sin(this.walkPhase)) * 0.14 : 0);
    let reach = 0;
    if (s === 'eat') {
      // turn his head to the flower itself (it is beside him, a block away)
      reach = this.mouthHeight();
      const dx = Ram._v.x - m.position.x, dz = Ram._v.z - m.position.z;
      if (Math.abs(dx) > 0.4) G3.face(m, dx, dz, 0.25);
      else G3.face(m, this.dir, 0.1, 0.25);
    } else ANIMALS3.turn(m, this.wx, this.wy, ANIMALS3.sideYaw(this.dir), 0.2);
    this._yaw = m.rotation.y;

    // legs: opposite corners together at a walk, front pair against back pair at a gallop
    const swing = moving ? Math.sin(this.walkPhase) * (running ? 0.95 : 0.5) : 0;
    u.legs[0].rotation.x = swing;
    u.legs[1].rotation.x = running ? swing : -swing;
    u.legs[2].rotation.x = -swing;
    u.legs[3].rotation.x = running ? -swing : swing;
    u.rig.rotation.x = running ? Math.cos(this.walkPhase) * 0.1 : 0;

    // neck: swing it so his head is at the right height, keeping his face
    // level when it is up and pointed at the grass when it is down
    let headY = 1.26, pitch = 0, jaw = 0;
    if (s === 'eat') {
      const chew = PX.anim(2, 9);
      headY = reach + 0.15 + chew * 0.03;
      jaw = chew ? 0.4 : 0.05;
    } else if (this.baaTimer > 0) {
      if (moving) jaw = Math.floor(frameCount / 6) % 2 ? 0.45 : 0.1;       // talking as he walks
      else { headY = 1.3; pitch = -0.4; jaw = 0.55; }                      // a proper baa, head thrown back
    } else if (petted) {
      headY = 1.2; pitch = 0.15;
    } else if (moving) {
      headY += Math.sin(this.walkPhase * 2) * 0.02;
    }
    const want = Math.acos(constrain((headY - ANIMALS3.RAM_SHOULDER) / ANIMALS3.RAM_NECK, -0.94, 0.96));
    u.neckA = u.neckA === undefined ? want : u.neckA + (want - u.neckA) * 0.14;
    if (s === 'eat') pitch = constrain((u.neckA - 0.6) * 0.62, -0.2, 1.3);
    u.neck.rotation.x = u.neckA;
    u.head.rotation.x = pitch - u.neckA;
    u.jaw.rotation.x = jaw;
    this._headTop = ANIMALS3.RAM_SHOULDER + Math.cos(u.neckA) * ANIMALS3.RAM_NECK + 0.3;

    // eyes shut for a blink, and happily shut while he is petted
    u.skull.material[4] = (petted || (this.blinking && s !== 'eat' && !moving)) ? u.faceShut : u.faceOpen;
    u.tail.rotation.set(0.35, 0, petted ? Math.sin(frameCount * 0.5) * 0.5 : 0);

    // a heart floats up over his head while he is being petted
    u.heart.visible = petted;
    if (petted) {
      const k = (frameCount % 48) / 48;
      u.heart.position.set(Math.sin(m.rotation.y) * 0.9, 1.95 + k * 0.6, Math.cos(m.rotation.y) * 0.9);
      u.heart.rotation.y = -m.rotation.y;                     // always toward the viewer
      u.heart.scale.setScalar(k < 0.7 ? 1 : 1 - (k - 0.7) * 2);
    }
  }

  // One dropping: it falls from under his tail, steams for a while, then a
  // sprout comes up through it before it turns into a flower.
  drawPoop(p) {
    const m = G3.model(p, ANIMALS3.poop), u = m.userData;
    G3.place(m, p.wx, p.wy, p.drop / 9 * 0.55);
    u.sprout.visible = p.age > 190;
    const fresh = p.drop === 0 && p.age < 170;
    for (let i = 0; i < 3; i++) {
      const cube = u.stink[i];
      cube.visible = fresh;
      if (!fresh) continue;
      const k = (frameCount / 50 + i / 3) % 1;
      cube.position.set((i - 1) * 0.14 + Math.sin(k * 7 + i * 2) * 0.06, 0.35 + k * 0.7, 0);
      cube.scale.setScalar(1 - k * 0.8);
    }
  }
}

// I SPY card: Ramy standing proud.
G3.cardArt('ram', () => ANIMALS3.ram(), { w: 34, h: 36, yaw: 0.6 });
