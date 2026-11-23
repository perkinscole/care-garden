// ================================================================
// File: cat.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the Cat character that wanders, sits, sleeps, stalks
//   butterflies, pounces, and shelters from rain near the school.
//   Drawn as a 3D box animal (ANIMALS3.cat in js/art/animals_art.js).
// ================================================================

// Cat class manages the cat's state machine (wander/sit/stalk/pounce/sleep/shelter),
// blinking, tail animation, butterfly hunting, and rain shelter behavior.
class Cat {
  static g3 = true;      // drawn as a 3D box model (see docs/GARDEN_3D.md)

  constructor() {
    this.wx = random(0.1, 0.9);
    this.wy = random(0.2, 0.8);
    this.twx = random(0.1, 0.9);
    this.twy = random(0.2, 0.8);
    this.speed = 0.0012;
    this.walkPhase = 0;
    this.dir = 1;
    this.state = 'wander'; // wander | idle | sit | sleep | stalk | pounce | miss | shelter | sheltering
    this.idleTimer = 0;
    this.target = null;    // creature being stalked
    this.pounceVX = 0;
    this.pounceVY = 0;
    this.pounceLen = 1;
    this.tailPhase = random(TWO_PI);
    this.blinkTimer = floor(random(100, 250));
    this.blinking = false;
    this.speechTimer = floor(random(400, 800));
    const pick = random();
    this.coat = pick < 0.33 ? 'orange' : pick < 0.66 ? 'black' : 'grey';   // see ANIMALS3.CAT_COATS
    this.sheltering = false;
    this.sleepTimer = 0;
    this.zzPhase = 0;
  }

  // Finds a nearby butterfly or bee within stalking distance and returns it, or null.
  findNearbyCreature() {
    // creatures keep their positions in screen pixels
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    for (let c of creatures) {
      if (!c.x || !c.y) continue;
      const dx = c.x - sx;
      const dy = c.y - sy;
      if (sqrt(dx*dx + dy*dy) < 180) return c;
    }
    return null;
  }

  // Art-pixel point just above the cat's head, for speech bubbles.
  headPos() {
    const s = this.state, k = ANIMALS3.CAT_SIZE;
    if (s === 'sit' || s === 'miss') return ANIMALS3.artAhead(this, 0.05 * k, 1.2 * k + 0.3);
    if (s === 'sleep') return ANIMALS3.artAhead(this, 0.3 * k, 0.45 * k + 0.3);
    if (s === 'sheltering' || s === 'stalk') return ANIMALS3.artAhead(this, 0.45 * k, 0.65 * k + 0.3);
    return ANIMALS3.artAhead(this, 0.48 * k, 0.9 * k + 0.3);
  }

  // Shows a speech bubble over the cat's head.
  say(text) {
    speechBubbles.push(new SpeechBubble(text, () => this.headPos()));
  }

  // Runs the state machine for a frame, then moves the legs in time with
  // the ground actually covered (a scamper when running for shelter).
  update() {
    const fromX = this.wx, fromY = this.wy;
    this.think();
    if (this.state === 'shelter') this.walkPhase += 0.35;
    else this.walkPhase += walkStride(this.wx - fromX, this.wy - fromY, 22);
  }

  // Advances the cat's state each frame: blinking, speech, rain checks, wandering, stalking, and sleeping.
  think() {
    // blink
    this.blinkTimer--;
    if (this.blinkTimer <= 0) {
      this.blinking = !this.blinking;
      this.blinkTimer = this.blinking ? 6 : floor(random(100, 280));
    }
    this.tailPhase += 0.04;

    // speech — suppress during stalk/pounce so hunting phrases stay contextual,
    // and while asleep
    if (this.state !== 'stalk' && this.state !== 'pounce' && this.state !== 'sleep') {
      this.speechTimer--;
      if (this.speechTimer <= 0) {
        this.say(CAT_PHRASES[floor(random(CAT_PHRASES.length))]);
        this.speechTimer = floor(random(400, 900));
      }
    }

    // check for rain — override everything and run for shelter
    const isRaining = weatherState === 'rainy' || weatherState === 'stormy';

    if (isRaining && !this.sheltering) {
      this.state = 'shelter';
      this.sheltering = true;
      this.target = null;
      // run to shelter near the school but below the sidewalk
      this.twx = 0.48 + random(-0.05, 0.05);
      this.twy = 0.18;
      this.say('NOT THE RAIN!!');
    }

    if (!isRaining && this.sheltering) {
      this.sheltering = false;
      this.state = 'wander';
      this.twx = random(0.1, 0.9);
      this.twy = random(0.2, 0.8);
      this.say('Finally...');
    }

    if (this.state === 'wander') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);

      if (d < 0.025) {
        // usually sit down for a good while, otherwise just pause
        if (random() < 0.7) {
          this.state = 'sit';
          this.idleTimer = floor(random(300, 700));
        } else {
          this.state = 'idle';
          this.idleTimer = floor(random(60, 180));
        }
        this.twx = constrain(this.wx + random(-0.2, 0.2), 0.05, 0.95);
        this.twy = constrain(this.wy + random(-0.15, 0.15), 0.1, 0.9);
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        this.dir = dx > 0 ? 1 : -1;

        const sep = getSeparation(this.wx, this.wy, 'cat');
        this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
        this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);

        // spot a creature to stalk (not at night, when they are hidden)
        if (frameCount % 120 === 0 && random() < 0.2 && nightAmount() < 0.5) {
          const prey = this.findNearbyCreature();
          if (prey) {
            this.target = prey;
            this.state = 'stalk';
          }
        }
      }

    } else if (this.state === 'stalk') {
      if (!this.target) { this.state = 'wander'; return; }

      // the target's position is in screen pixels, so compare on screen
      const { sx, sy } = worldToScreen(this.wx, this.wy);
      const dx = this.target.x - sx;
      const dy = this.target.y - sy;
      const d  = sqrt(dx*dx + dy*dy);
      if (abs(dx) > 6) this.dir = dx > 0 ? 1 : -1;

      if (d < 55) {
        // close enough — POUNCE: a short, quick leap toward it
        this.state = 'pounce';
        this.pounceVX = (dx / max(d, 1)) * 0.006;
        this.pounceVY = (dy / max(d, 1)) * 0.004;
        this.pounceLen = 20;
        this.idleTimer = this.pounceLen;
      } else {
        // creep slowly toward target
        this.wx += (dx / d) * this.speed * 2.0;
        this.wy += (dy / d) * this.speed * 1.2;
      }

      // give up if target flies too far away
      if (d > 350) {
        this.target = null;
        this.state = 'wander';
      }

    } else if (this.state === 'pounce') {
      this.wx += this.pounceVX;
      this.wy += this.pounceVY;
      this.idleTimer--;
      if (this.idleTimer <= 0) {
        // missed! butterfly always escapes
        this.target = null;
        this.state = 'miss';
        this.idleTimer = 90;
        this.say('Almost got it...');
      }

    } else if (this.state === 'miss') {
      // sit and lick paw
      this.idleTimer--;
      this.walkPhase = 0;
      if (this.idleTimer <= 0) {
        this.state = 'wander';
        this.twx = random(0.05, 0.95);
        this.twy = random(0.1, 0.9);
      }

    } else if (this.state === 'sit') {
      this.idleTimer--;
      this.walkPhase = 0;
      if (this.idleTimer < 200 && random() < 0.004) {
        this.state = 'sleep';
        this.sleepTimer = floor(random(400, 900));
      }
      if (this.idleTimer <= 0) this.state = 'wander';

    } else if (this.state === 'shelter') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      if (d < 0.04) {
        // arrived — lie down and wait
        this.state = 'sheltering';
        this.walkPhase = 0;
      } else {
        // run fast toward school
        this.wx += (dx / d) * this.speed * 2.8;
        this.wy += (dy / d) * this.speed * 2.8;
      }

    } else if (this.state === 'sheltering') {
      this.walkPhase = 0;
      // just wait — weather check at top will exit this when rain stops

    } else if (this.state === 'sleep') {
      this.sleepTimer--;
      this.walkPhase = 0;
      this.zzPhase += 0.008;
      if (this.sleepTimer <= 0) {
        this.state = 'sit';
        this.idleTimer = floor(random(60, 120));
      }

    } else if (this.state === 'idle') {
      this.idleTimer--;
      this.walkPhase = 0;
      if (this.idleTimer <= 0) {
        this.state = 'wander';
        this.twx = random(0.05, 0.95);
        this.twy = random(0.1, 0.9);
      }
    }

    this.wx = constrain(this.wx, 0.02, 0.98);
    this.wy = constrain(this.wy, 0.04, 0.98);
  }

  // Poses the cat for its state, plus floating "z"s when asleep.
  draw() {
    const m = G3.model(this, this._build || (this._build = () => ANIMALS3.cat(this.coat))), u = m.userData;
    const s = this.state;
    const tailFlick = sin(this.tailPhase) > 0.3;   // slow sway of the tail
    const pose = (s === 'sit') ? 'sit' : s === 'miss' ? 'lick' : s === 'sleep' ? 'sleep' :
                 s === 'sheltering' ? 'loaf' : s === 'stalk' ? 'stalk' : s === 'pounce' ? 'pounce' : 'stand';
    ANIMALS3.poseCat(m, pose, s === 'pounce' ? 0.45 : 0.16);

    // a pounce is a low arc through the air, nose up and then nose down
    let lift = 0;
    if (s === 'pounce') {
      const k = 1 - this.idleTimer / this.pounceLen;
      lift = Math.sin(k * PI) * 0.6;
      u.torso.rotation.x += -0.45 + k * 0.8;
    }
    G3.place(m, this.wx, this.wy, lift * ANIMALS3.CAT_SIZE);
    // sitting and lying it turns more toward us than when it is on the move
    const settled = s === 'sit' || s === 'miss' || s === 'sleep' || s === 'sheltering';
    ANIMALS3.turn(m, this.wx, this.wy, (this.dir < 0 ? -1 : 1) * (settled ? 0.7 : 1.15), s === 'pounce' ? 0.5 : 0.2);
    this._yaw = m.rotation.y;

    // legs: a walk swings opposite corners, a run for shelter gallops
    if (s === 'wander' || s === 'shelter') {
      const run = s === 'shelter';
      const swing = Math.sin(this.walkPhase) * (run ? 0.9 : 0.5);
      u.front[0].rotation.x += swing;
      u.front[1].rotation.x += run ? swing : -swing;
      u.back[0].rotation.x = -swing;
      u.back[1].rotation.x = run ? -swing : swing;
      if (run) u.torso.rotation.x += Math.cos(this.walkPhase) * 0.08;
    } else if (s === 'stalk') {
      // creeping: small quick steps and a wiggle of the hips
      const creep = Math.sin(frameCount * 0.25) * 0.25;
      u.front[0].rotation.x += creep;
      u.front[1].rotation.x -= creep;
      u.back[0].rotation.x -= creep;
      u.back[1].rotation.x += creep;
      u.tip.rotation.z = tailFlick ? 0.6 : -0.3;
    } else if (s === 'miss') {
      // licking a paw as if nothing happened
      const lick = PX.anim(2, 14);
      u.front[0].rotation.x += lick * 0.25;
      u.head.rotation.x += lick * 0.2;
    } else if (s === 'sleep') {
      u.body.scale.y = 1 + Math.sin(frameCount * 0.05) * 0.06;     // breathing
    }
    if (s !== 'sleep') u.body.scale.y = 1;

    // the tail sways when it is up, and its tip flicks when it is down
    if (pose === 'stand') {
      u.tail.rotation.z += Math.sin(this.tailPhase) * 0.35;
      u.tip.rotation.z = tailFlick ? 0.5 : 0;
    } else if (pose === 'sit' || pose === 'lick' || pose === 'loaf') {
      u.tip.rotation.z = tailFlick ? -0.45 : 0;
    } else if (pose !== 'stalk') u.tip.rotation.z = 0;

    const eyesShut = s === 'sleep' || (this.blinking && s !== 'stalk' && s !== 'pounce');
    u.skull.material[4] = eyesShut ? u.faceShut : u.faceOpen;

    // two little z's drift up and shrink away, one after the other
    for (let i = 0; i < 2; i++) {
      const z = u.zs[i];
      z.visible = s === 'sleep';
      if (!z.visible) continue;
      const k = (this.zzPhase + i * 0.5) % 1;
      const yaw = m.rotation.y;
      z.position.set(Math.sin(yaw) * 0.35 + 0.15 + k * 0.5, 0.55 + k * 1.0, Math.cos(yaw) * 0.35);
      z.rotation.y = -yaw;                                   // always toward the viewer
      z.scale.setScalar((0.6 + k * 0.7) * (k < 0.75 ? 1 : (1 - k) * 4));
    }
  }
}

// I SPY card: the cat sitting, wearing the coat of the cat that is in the
// garden today.
G3.cardArt('cat', () => {
  const m = ANIMALS3.cat((typeof cat !== 'undefined' && cat) ? cat.coat : 'orange');
  ANIMALS3.poseCat(m, 'sit', 1);
  return m;
}, { w: 30, h: 38, yaw: 0.6 });
