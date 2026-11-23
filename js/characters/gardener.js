// ================================================================
// File: gardener.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines the Gardener character who wanders the garden watering
//   flowers, opens a rainbow umbrella in rain, shelters at the school, flees
//   the goose and goes inside at night. A 3D box person built by PEOPLE3
//   (js/g3_people.js): straw sun hat, floral dress, watering can.
// ================================================================

// How far in front of her the end of the spout is when she pours, in
// blocks: with the can tipped at her waist, and lifted to shoulder height.
const GARDENER_REACH_LOW = 0.78;
const GARDENER_REACH_HIGH = 0.95;
// Roughly how high the spout is in each case
const GARDENER_SPOUT_LOW = 0.45;
const GARDENER_SPOUT_HIGH = 0.85;

// Gardener class handles the gardener's state machine (wander/water/shelter/flee/night),
// watering can, droplet particles, umbrella display, and goose evasion.
class Gardener {
  static g3 = true;      // drawn as a 3D model (see docs/GARDEN_3D.md)

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
    this.droplets = [];     // falling water: { x, y, z } in blocks
    this.spout3 = null;     // where the end of the spout was when she was last drawn
    this.fx = {};           // owns the pool of droplet cubes
    this.spoke = false;
    this.wasFleeing = false;
    this.sheltering = false;
    this.umbrellaOut = false;
    this.goingInside = false;
    // Dark brown hair under a straw sun hat, pink floral dress
    this.look = PEOPLE.look({ kind: 'gardener', skin: 1, hair: 'long', hairCol: PEOPLE.DARK, sunHat: true });
  }

  // Spawns a speech bubble that floats just above her hat (or her umbrella).
  // If she goes in at the doors while it is showing it stays behind on the
  // sidewalk and fades.
  speak(msg) {
    PEOPLE.say(msg,
      () => PEOPLE.bubblePos(this.wx, this.wy, this.look, this.umbrellaOut ? 0.6 : 0),
      () => PEOPLE.hasLeft(this));
  }

  // Works out how to water a flower as it stands right now. Returns
  // { high, x, z, land, front }: whether she lifts the can, the point (in
  // blocks) the water should fall on, the height it lands at, and how far
  // in front of that point she stands. A seedling or a low bloom is
  // watered from above. Anything taller than she can lift the can is
  // watered at the foot of its stem if she fits under the bloom, or else
  // just beside the bloom, standing in front of the photo, not behind it.
  waterPlan(f) {
    const head = PEOPLE3.head3(f, 0), foot = PEOPLE3.foot3(f);
    const r = PEOPLE3.bloomR(f, 0);
    const top = head.y + r;
    if (top <= GARDENER_SPOUT_LOW - 0.05) return { high: false, x: head.x, z: head.z, land: max(0, top - 0.1), front: 0.07 };
    if (top <= GARDENER_SPOUT_HIGH - 0.05) return { high: true, x: head.x, z: head.z, land: max(0, top - 0.1), front: 0.07 };
    if (head.y - r > PEOPLE3.headTop(this.look) + 0.15) return { high: false, x: foot.x, z: foot.z, land: 0, front: 0.07 };
    return { high: true, x: head.x - this.waterSide * (r + 0.15), z: head.z, land: 0, front: 0.25 };
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

    // Night — gardener goes inside
    if (isNightTime && !this.goingInside && this.state !== 'inside') {
      this.goingInside = true;
      this.sheltering = false;
      this.umbrellaOut = false;
      this.waterTarget = null;
      this.droplets = [];
      this.state = 'goInside';
      this.entering = false;
      this.emerging = false;
      this.nightPause = 70;      // she stands and says goodnight before setting off
      this.doorWx = undefined;   // PEOPLE.goIn picks the nearer pair of doors
      this.speak("Time to head in. Goodnight, garden!");
    }

    // Dawn — gardener comes back out
    if (!isNightTime && this.goingInside) {
      this.goingInside = false;
      this.state = 'wander';
      this.entering = false;
      this.wx = PEOPLE.doorX();
      this.wy = PEOPLE.DOOR_IN_WY;
      this.emerging = true;      // first steps out of the doors, toward us
      this.twx = random(0.1, 0.9);
      this.twy = random(0.2, 0.8);
      this.speak("Good morning! Let's tend the garden!");
    }

    // If inside, skip all other logic
    if (this.state === 'inside') return;
    // Stepping out of the doors at dawn: nothing else until she is on the sidewalk
    if (PEOPLE.comeOut(this, this.speed * 1.5)) return;

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

    // update droplets (blocks; they vanish when they land)
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.vy -= 0.004;
      d.x += d.vx;
      d.y += d.vy;
      d.life--;
      if (d.life <= 0 || d.y <= d.ground) this.droplets.splice(i, 1);
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
      // spot to water (see waterPlan), and a touch nearer the front.
      const plan = this.waterPlan(f);
      const reach = plan.high ? GARDENER_REACH_HIGH : GARDENER_REACH_LOW;
      const tx = constrain(0.5 + (plan.x - this.waterSide * reach) / G3.GW, 0.02, 0.98);
      const ty = constrain((plan.z + plan.front) / G3.GD, 0.04, 0.99);
      const dx = tx - this.wx;
      const dy = ty - this.wy;
      const d = sqrt(dx * dx + dy * dy);
      if (d < 0.002) {
        this.dir = this.waterSide;
        this.state = 'water';
        this.pour = plan;
        this.waterTimer = 90;
        this.pourAngle = 0;
      } else {
        const st = min(this.speed, d);
        this.wx += (dx / d) * st;
        this.wy += (dy / d) * st;
        if (abs(dx) * G3.GW > 0.06) this.dir = dx > 0 ? 1 : -1;
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
      // (where it was when she was last drawn) down to the bloom or the
      // ground at the foot of the stem
      if (this.pourAngle < -0.5 && frameCount % 3 === 0 && this.spout3) {
        const sp = this.spout3;
        this.droplets.push({
          x: sp.x + random(-0.04, 0.04),
          y: sp.y,
          z: sp.z + random(-0.04, 0.04),
          vx: this.dir * random(0, 0.004),
          vy: -random(0.006, 0.02),
          life: 60,
          ground: min((stillThere && this.pour) ? this.pour.land : 0, sp.y - 0.2),
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
      // a moment to say goodnight, then along the sidewalk to the doors
      // and through them: she waits inside for dawn
      if (this.nightPause > 0) {
        this.nightPause--;
      } else if (PEOPLE.goIn(this, this.speed * 1.5)) {
        this.state = 'inside';
        this.walkPhase = 0;
      }

    } else if (this.state === 'idle') {
      this.idleTimer--;
      this.walkPhase = 0;
      if (this.idleTimer <= 0) this.state = 'wander';
    }
  }

  // Poses the gardener's model: walking, watering, sheltering under her
  // umbrella, running from the goose; and the falling water.
  draw() {
    const drops = PEOPLE3.specks(this.fx, PAL.wa1, 0.09, 24).children;
    for (let i = 0; i < drops.length; i++) {
      const d = this.droplets[i];
      drops[i].visible = !!d;
      if (d) drops[i].position.set(d.x, d.y, d.z);
    }
    if (this.state === 'inside') return;

    const s = this.state, L = this.look;
    const m = PEOPLE3.model(this, this.emerging ? 0 : this.dir * G3.YAW.right);
    const u = m.userData;
    if (!u.can) {
      u.can = PEOPLE3.wateringCan();
      u.can.position.x = 0.03;
      u.umbrella = PEOPLE3.umbrella();
    }

    // Which way she faces: the way she is walking; at the flower while she
    // waters it; otherwise mostly toward us, a little turned
    const watering = s === 'water';
    const paused = s === 'goInside' && this.nightPause > 0;
    const x = (this.wx - 0.5) * G3.GW, z = this.wy * G3.GD;
    let yaw = this.dir * 0.6, side;
    if (watering && this.pour) {
      side = this.waterSide > 0 ? 'R' : 'L';
      yaw = PEOPLE3.aimYaw(x, z, this.pour.x, this.pour.z, side, L);
    }
    const moving = PEOPLE3.move(m, this.wx, this.wy, { yaw, force: watering || paused });
    if (!side) side = PEOPLE3.nearSide(m);

    // Worried and shouting when the goose is after her, glum in the rain
    let face = s === 'flee' ? 'open' : s === 'sheltering' ? 'flat' : 'smile';
    face = PEOPLE.face(G3.frame, 3, face);

    const walk = moving ? this.walkPhase : null;
    if (this.umbrellaOut) {
      // Rainbow umbrella held up over her hat
      PEOPLE3.hold(m, u.umbrella, side);
      if (u.can.parent) u.can.parent.remove(u.can);
      PEOPLE3.pose(m, { walk, side, arm: 'umbrella', face });
      this.spout3 = null;
    } else {
      // Watering can hanging from her hand, tipped forward while she waters
      PEOPLE3.hold(m, u.can, side);
      if (u.umbrella.parent) u.umbrella.parent.remove(u.umbrella);
      const high = watering && this.pour && this.pour.high;
      const tip = watering ? constrain(-this.pourAngle * 0.62, 0, 0.7) : 0;
      u.can.rotation.x += (tip - u.can.rotation.x) * 0.3;
      PEOPLE3.pose(m, {
        walk, side, face,
        arm: watering ? (high ? 'lift' : 'pour') : 'hang',
        lean: s === 'flee' ? 0.22 : watering ? 0.1 : 0,
      });
      this.spout3 = PEOPLE3.worldPos(m, u.can.userData.spout, this.spout3);
    }
  }
}

// I SPY card: the gardener standing with her watering can.
G3.cardArt('gardener', () => {
  const m = PEOPLE3.build(PEOPLE.look({ kind: 'gardener', skin: 1, hair: 'long', hairCol: PEOPLE.DARK, sunHat: true }));
  const can = PEOPLE3.hold(m, PEOPLE3.wateringCan(), 'L');
  can.rotation.x = 0.35;
  PEOPLE3.pose(m, { side: 'L', arm: 'pour', arm2: 'down', snap: true });
  return m;
});
