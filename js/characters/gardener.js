// ================================================================
// File: gardener.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the Gardener character who wanders the garden watering
//   flowers, opens a rainbow umbrella in rain, shelters at the school, flees
//   the goose and goes inside at night. Drawn as pixel art from the shared
//   people sprites in js/art/people_art.js (straw sun hat, floral dress).
// ================================================================

// How far in front of her feet the spout of the tipped can is, in art pixels
const GARDENER_SPOUT_PX = 10;

// Gardener class handles the gardener's state machine (wander/water/shelter/flee/night),
// watering can, droplet particles, umbrella display, and goose evasion.
class Gardener {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor() {
    this.wx = 0.3;
    this.wy = 0.5;
    this.twx = random(0.1, 0.9);
    this.twy = random(0.1, 0.9);
    this.speed = 0.002;
    this.walkPhase = 0;
    this.dir = 1;
    this.state = 'wander';
    this.idleTimer = 0;
    this.waterTarget = null;
    this.waterTimer = 0;
    this.pourAngle = 0;
    this.droplets = [];     // falling water, in art pixels
    this.spoke = false;
    this.wasFleeing = false;
    this.sheltering = false;
    this.umbrellaOut = false;
    this.goingInside = false;
    this.fade = 1;          // 0..1, fades her in as she steps out of the school
    // Dark brown hair under a straw sun hat, pink floral dress
    this.look = PEOPLE.look({ kind: 'gardener', skin: 1, hair: 'long', hairCol: PEOPLE.DARK, sunHat: true });
  }

  // Spawns a speech bubble that floats just above her hat (or her umbrella).
  speak(msg) {
    speechBubbles.push(new SpeechBubble(msg,
      () => PEOPLE.bubblePos(this.wx, this.wy, this.look, this.umbrellaOut ? 6 : 0)));
  }

  // Searches the flowers for one within watering range and returns it, or null.
  findNearbyFlower() {
    for (const f of flowers) {
      const dx = f.wx - this.wx;
      const dy = f.wy - this.wy;
      if (sqrt(dx * dx + dy * dy) < 0.14) return f;
    }
    return null;
  }

  // Runs her state machine for a frame, then moves her legs in time with
  // the ground she actually covered.
  update() {
    const fromX = this.wx, fromY = this.wy;
    this.think();
    this.walkPhase += walkStride(this.wx - fromX, this.wy - fromY, PEOPLE.STRIDE_ADULT);
  }

  // Advances the gardener's state each frame: rain/night checks, flee logic, watering, and movement.
  think() {
    const isRaining = weatherState === 'rainy' || weatherState === 'stormy';
    const isNightTime = nightAmount() > 0.4;
    if (this.fade < 1) this.fade = min(1, this.fade + 0.05);

    // Night — gardener goes inside
    if (isNightTime && !this.goingInside && this.state !== 'inside') {
      this.goingInside = true;
      this.sheltering = false;
      this.umbrellaOut = false;
      this.waterTarget = null;
      this.droplets = [];
      this.state = 'goInside';
      this.entering = false;
      this.doorWx = undefined;   // PEOPLE.goIn picks the nearer pair of doors
      this.speak("Time to head in. Goodnight, garden!");
    }

    // Dawn — gardener comes back out
    if (!isNightTime && this.goingInside) {
      this.goingInside = false;
      this.state = 'wander';
      this.entering = false;
      this.wx = PEOPLE.doorX();
      this.wy = PEOPLE.DOOR_WY + 0.008;
      this.fade = 0;
      this.twx = random(0.1, 0.9);
      this.twy = random(0.2, 0.8);
      this.speak("Good morning! Let's tend the garden!");
    }

    // If inside, skip all other logic
    if (this.state === 'inside') return;

    if (isRaining && !this.sheltering && !this.goingInside) {
      this.sheltering = true;
      this.umbrellaOut = true;
      this.state = 'shelter';
      this.waterTarget = null;
      this.droplets = [];
      // head for the sidewalk under the entrance canopy, beside the doors
      this.twx = 0.5 + (this.wx < 0.5 ? -1 : 1) * random(0.055, 0.075);
      this.twy = 0.065;
      this.speak("Oh dear, rain! My flowers!");
    }

    if (!isRaining && this.sheltering && !this.goingInside) {
      this.sheltering = false;
      this.umbrellaOut = false;
      this.state = 'wander';
      this.twx = random(0.1, 0.9);
      this.twy = random(0.2, 0.8);
      this.speak("Back to work!");
    }

    let currentlyFleeing = false;

    // --- FLEE LOGIC ---
    if (typeof goose !== 'undefined' && goose && goose.state === 'chase' && !this.sheltering && !this.goingInside) {
      let dx = this.wx - goose.wx;
      let dy = this.wy - goose.wy;
      let distSq = dx * dx + dy * dy;

      if (distSq < 0.1) {
        currentlyFleeing = true;
        this.wasFleeing = true; // MEMORY: Remember that she is actively running

        let dist = max(sqrt(distSq), 0.0001);
        this.wx += (dx / dist) * 0.0045;
        this.wy += (dy / dist) * 0.0045;

        this.wx = constrain(this.wx, 0.05, 0.95);
        this.wy = constrain(this.wy, 0.1, 0.95);
        this.dir = dx > 0 ? 1 : -1;
        this.state = 'flee';
        this.waterTarget = null;
        this.pourAngle = 0;

        if (frameCount % 15 === 0 && !this.spoke) {
          this.spoke = true;
          let yells = ["Ah!", "Get away goose!", "Shoo!", "Leave me alone!", "Not again!"];
          this.speak(random(yells));
        }
      }
    }

    // update droplets (art pixels; they vanish when they reach the ground)
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.vy += 0.06;
      d.x += d.vx;
      d.y += d.vy;
      d.life--;
      if (d.life <= 0 || d.y >= d.ground) this.droplets.splice(i, 1);
    }

    // --- RECOVERY & NORMAL LOGIC ---
    if (currentlyFleeing) return;

    // If she was just fleeing on the previous frame, but isn't anymore:
    if (this.wasFleeing) {
      this.spoke = false;
      this.wasFleeing = false;
      this.state = 'idle';
      this.idleTimer = 0;
    }

    if (this.state === 'wander') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d = sqrt(dx * dx + dy * dy);

      gardenerSpeechTimer--;
      if (gardenerSpeechTimer <= 0) {
        this.speak(GARDENER_PHRASES[floor(random(GARDENER_PHRASES.length))]);
        gardenerSpeechTimer = floor(random(300, 600));
      }

      if (d < 0.025) {
        this.state = 'idle';
        this.idleTimer = floor(random(30, 100));
        this.twx = random(0.05, 0.95);
        this.twy = random(0.05, 0.95);
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        const sep = getSeparation(this.wx, this.wy, 'gardener');
        this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
        this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        this.dir = dx > 0 ? 1 : -1;

        if (frameCount % 60 === 0 && random() < 0.5) {
          const f = this.findNearbyFlower();
          if (f) {
            this.waterTarget = f;
            // stay on the side of the flower she is already on
            this.waterSide = f.wx >= this.wx ? 1 : -1;
            this.state = 'approach';
          }
        }
      }

    } else if (this.state === 'approach') {
      const f = this.waterTarget;
      // it may have been picked or eaten on her way over
      if (!f || !flowers.includes(f)) {
        this.waterTarget = null;
        this.state = 'wander'; return;
      }
      // Stand beside the flower so the spout of the tipped can is over the
      // foot of its stem, and a touch nearer the front so she is drawn
      // in front of it.
      const tx = constrain(f.wx - this.waterSide * GARDENER_SPOUT_PX / PX.W, 0.02, 0.98);
      const ty = constrain(f.wy + 0.006, 0.04, 0.99);
      const dx = tx - this.wx;
      const dy = ty - this.wy;
      const d = sqrt(dx * dx + dy * dy);
      if (d < 0.002) {
        this.dir = this.waterSide;
        this.state = 'water';
        this.waterTimer = 90;
        this.pourAngle = 0;
      } else {
        const st = min(this.speed, d);
        this.wx += (dx / d) * st;
        this.wy += (dy / d) * st;
        if (abs(dx) * PX.W > 1) this.dir = dx > 0 ? 1 : -1;
        // other characters only push her aside while she is still on her way
        if (d > 0.04) {
          const sep = getSeparation(this.wx, this.wy, 'gardener');
          this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
          this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        }
      }

    } else if (this.state === 'water') {
      this.waterTimer--;
      // tilt can into pour position
      this.pourAngle = lerp(this.pourAngle, -1.1, 0.08);

      // boost the flower
      const f = this.waterTarget;
      const stillThere = f && flowers.includes(f);
      if (stillThere) f.targetSize = min(f.targetSize + 0.002, f.restSize * 1.6);

      // once the can has tipped, water falls from the end of the spout
      // onto the foot of the flower
      if (this.pourAngle < -0.5 && frameCount % 3 === 0) {
        const p = worldToPx(this.wx, this.wy);
        const spout = GARDENER_SPOUT_PX + floor(random(2));   // art pixels in front of her
        this.droplets.push({
          x: this.dir > 0 ? p.x + spout : p.x - 1 - spout,
          y: p.y - 9,
          vx: this.dir * random(0, 0.08),
          vy: random(0.1, 0.3),
          life: 40,
          ground: p.y,
        });
      }

      if (this.waterTimer <= 0 || !stillThere) {
        this.pourAngle = 0;
        this.waterTarget = null;
        this.state = 'idle';
        this.idleTimer = floor(random(40, 80));
        this.twx = random(0.05, 0.95);
        this.twy = random(0.05, 0.95);
      }

    } else if (this.state === 'shelter') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d = sqrt(dx * dx + dy * dy);
      this.dir = dx > 0 ? 1 : -1;
      if (d < 0.01) {
        this.state = 'sheltering';
        this.walkPhase = 0;
      } else {
        this.wx += (dx / d) * this.speed * 1.8;
        this.wy += (dy / d) * this.speed * 1.8;
      }

    } else if (this.state === 'sheltering') {
      this.walkPhase = 0;
      this.pourAngle = 0;
      // just stand and wait — rain check at top exits this

    } else if (this.state === 'goInside') {
      // along the sidewalk to the doors and through them: she waits inside for dawn
      if (PEOPLE.goIn(this, this.speed * 1.5)) {
        this.state = 'inside';
        this.walkPhase = 0;
      }

    } else if (this.state === 'idle') {
      this.idleTimer--;
      this.walkPhase = 0;
      if (this.idleTimer <= 0) this.state = 'wander';
    }
  }

  // Draws the gardener, her watering can or umbrella, and the falling water.
  draw() {
    if (this.state === 'inside') return;
    const { x, y } = worldToPx(this.wx, this.wy);
    const L = this.look, dir = this.dir;
    const s = this.state;
    const walking = (s === 'wander' || s === 'approach' || s === 'flee' || s === 'shelter' || s === 'goInside');
    let leg = walking ? PEOPLE.walkFrame(this.walkPhase) : 'stand';
    if (s === 'goInside' && this.entering) leg = PEOPLE.backFrame(this.walkPhase);   // seen from behind

    // Worried and shouting when the goose is after her, glum in the rain
    let face = s === 'flee' ? 'open' : s === 'sheltering' ? 'flat' : 'smile';
    face = PEOPLE.face(PX.tick, 3, face);

    // She fades as she walks through the school doors at night, and back in at dawn
    let alpha = this.fade;
    if (s === 'goInside') alpha = min(alpha, PEOPLE.doorAlpha(this));
    if (alpha <= 0.02) return;

    const c = PX.c, prevAlpha = c.globalAlpha;
    c.globalAlpha = prevAlpha * alpha;
    PX.shadow(x, y, 14);
    const top = PEOPLE.top(y, L, leg);
    const handX = PEOPLE.handX(x, dir, L, 'hold');
    const handY = PEOPLE.handY(top, L, 'hold');

    if (this.umbrellaOut) {
      // Rainbow umbrella: the canopy floats just above her hat, the shaft
      // runs down past the brim to her hand, clear of her face
      const shaftX = handX + dir * 2;
      PX.spr('gardenerUmbrella', shaftX, top - 10);
      PX.rect(shaftX, top - 10, 1, handY - top + 13, PAL.g5);
      PX.px(shaftX - dir, handY + 2, PAL.g5);   // the crook of the handle
      PEOPLE.draw(x, y, L, dir, leg, 'hold', face);
    } else {
      // Watering can hanging from her hand, tipped forward while she waters
      PEOPLE.draw(x, y, L, dir, leg, 'hold', face);
      const pouring = s === 'water' && this.pourAngle < -0.5;
      // (from behind, going in at the doors, the can is hidden in front of her)
      if (!(s === 'goInside' && this.entering)) {
        PEOPLE._spr('gardenerCan', x + dir * 4, handY + 2, pouring ? 'pour' : 'carry', dir < 0, null);
      }
    }
    c.globalAlpha = prevAlpha;

    // water droplets: bright as they leave the spout, paler as they fall
    for (const d of this.droplets) {
      PX.px(d.x, d.y, d.life > 30 ? PAL.wa1 : PAL.wa2);
    }
  }
}

// I SPY card: the gardener standing with her can, tipping it to water every few seconds.
CARD_ART.gardener = (x, y, tick) => {
  const L = CARD_ART._gardenerLook || (CARD_ART._gardenerLook =
    PEOPLE.look({ kind: 'gardener', skin: 1, hair: 'long', hairCol: PEOPLE.DARK, sunHat: true }));
  const cx = x - 4;                       // the can sticks out in front, so centre the pair
  const pouring = tick % 200 > 120;
  PX.shadow(cx, y, 14);
  PEOPLE.draw(cx, y, L, 1, 'stand', 'hold', PEOPLE.face(tick, 3, 'smile'));
  const handY = PEOPLE.handY(PEOPLE.top(y, L, 'stand'), L, 'hold');
  PX.spr('gardenerCan', cx + 4, handY + 2, { frame: pouring ? 'pour' : 'carry' });
  if (pouring) {
    // three drops falling in a loop from the spout
    for (let i = 0; i < 3; i++) {
      const fall = (tick * 0.5 + i * 3) % 9;
      PX.px(cx + 10 + (i % 2), y - 9 + fall, fall < 3 ? PAL.wa1 : PAL.wa2);
    }
  }
};
