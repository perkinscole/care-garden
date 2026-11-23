// ================================================================
// File: ram.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Defines Ramy the Ram, the school mascot, who wanders the
//   garden, grazes on flowers, and produces droppings that grow into new
//   flowers. Drawn as pixel art from the 'ram' sprite in
//   js/art/animals_art.js.
// ================================================================

// Distances on the ram sprite, in art pixels from the point between his feet
const RAM_MOUTH_PX = 19;   // forward to his mouth when his head is down
const RAM_TAIL_PX  = 15;   // back to his tail
const RAM_HEAD_PX  = 11;   // forward to the middle of his raised head

// Ram class manages the sheep's state machine (wander/approach/eat/idle),
// blink cycle, speech bubbles, storm behavior, and poop-to-flower lifecycle.
class Ram {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

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

  // Art-pixel point just above his head, for speech bubbles and hearts.
  headPos() {
    const p = worldToPx(this.wx, this.wy);
    // his head is down by the grass while he grazes
    if (this.state === 'eat') return { x: p.x + this.dir * RAM_MOUTH_PX, y: p.y - 17 };
    return { x: p.x + this.dir * RAM_HEAD_PX, y: p.y - 26 };
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
      // Stand beside the flower so that his lowered mouth lands on its
      // stem, and a touch nearer the front so he is drawn over it.
      const tx = constrain(f.wx - this.eatDir * RAM_MOUTH_PX / PX.W, 0.02, 0.98);
      const ty = constrain(f.wy + 0.004, 0.04, 0.98);
      const dx = tx - this.wx;
      const dy = ty - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      if (d < 0.006) {
        this.dir = this.eatDir;
        this.state = 'eat';
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

  // Picks the sprite frame that matches what the ram is doing right now.
  frameName() {
    const stormy = weatherState === 'stormy';
    if (this.state === 'eat') return PX.anim(2, 9) === 0 ? 'eat0' : 'eat1';
    if (this.state === 'wander' || this.state === 'approach') {
      if (stormy) return floor(this.walkPhase / 1.6) % 2 === 0 ? 'run0' : 'run1';
      const step = floor(this.walkPhase / HALF_PI) % 4;
      return (this.baaTimer > 0 ? 'talk' : 'walk') + step;
    }
    // standing still
    if (this.isBeingPetted()) return 'pet';
    if (this.baaTimer > 0) return 'baa';
    return this.blinking ? 'blink' : 'stand';
  }

  // Draws his droppings (which eventually become flowers) and then the ram himself.
  draw() {
    // poops first, so the ram is in front of a fresh one
    for (const p of this.poops) {
      const pp = worldToPx(p.wx, p.wy);
      const y = pp.y - p.drop;
      if (p.drop === 0) PX.shadow(pp.x, pp.y, 9);
      PX.spr('ram_poop', pp.x, y, { frame: p.age > 190 ? 'sprout' : 'pile' });
      // stink lines while it is fresh
      if (p.drop === 0 && p.age < 170) {
        PX.spr('ram_stink', pp.x, y - 8, { frame: PX.anim(2, 14), alpha: 0.8 });
      }
    }

    const { x, y } = worldToPx(this.wx, this.wy);
    const frame = this.frameName();
    PX.shadow(x + this.dir, y, frame === 'run0' ? 20 : 24);
    PX.spr('ram', x, y, { frame, flip: this.dir < 0 });

    // little hearts float up while he is being petted
    if (frame === 'pet') {
      const k = (frameCount % 48) / 48;
      PX.spr('heart', x + this.dir * RAM_HEAD_PX, y - 27 - Math.round(k * 9), { alpha: k < 0.7 ? 1 : 0.5 });
    }
  }
}

// I SPY card: Ramy standing proud, blinking, with the odd happy baa.
CARD_ART.ram = (x, y, tick) => {
  const beat = tick % 260;
  let frame = 'stand';
  if (beat > 200 && beat < 236) frame = 'baa';
  else if (beat % 90 < 6) frame = 'blink';
  PX.shadow(x - 2, y, 24);
  PX.spr('ram', x - 3, y, { frame });
};
