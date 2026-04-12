// ================================================================
// File: kids.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: Defines the Kid class for children who exit the school, wander
//   the garden, pick flowers, pet the ram, then return inside.
// ================================================================

// Kid class manages each child's lifecycle (enter/wander/pickFlower/petting/return/done),
// randomized appearance, flower-picking mechanics, and ram-petting interactions.
class Kid {
  constructor() {
    // start at school door in world coords
    const schoolWX = 0.5 + random(-0.08, 0.08);
    this.wx = schoolWX;
    this.wy = 0.02;  // near the horizon where school sits
    this.twx = random(0.1, 0.9);
    this.twy = random(0.15, 0.85);
    this.speed = random(0.002, 0.004);
    this.walkPhase = random(TWO_PI);
    this.dir = 1;
    this.state = 'enter';
    this.idleTimer = 0;
    this.wanderCount = 0;
    this.maxWanders = floor(random(2, 6));
    this.returning = false;
    this.speechTimer = floor(random(200, 500));
    this.id = null;

    // appearance — random per kid
    this.shirtHue  = random(360);
    this.pantsHue  = random(360);
    this.skinL     = random(52, 78);
    this.hairHue   = random(20, 40);
    this.hairL     = random(18, 55);
    this.height    = random(0.78, 1.0);  // relative height
    this.hasHat    = random() < 0.3;
    this.hatHue    = random(360);
    this.hasPonytail = random() < 0.4;
    this.heldFlower = null;  // { hsl, type } when carrying
this.pickTimer = 0;
    this.pickTargetIdx = null;
  }

  // Advances the kid's state machine each frame: walking, flower picking, petting, and return to school.
  update() {
    if (this.state === 'enter') {
      // walk out from school toward first wander target
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      if (d < 0.03) {
        this.state = 'idle';
        this.idleTimer = floor(random(30, 90));
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        const sep = getSeparation(this.wx, this.wy, this.id);
this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        this.walkPhase += 0.2;
      }

    } else if (this.state === 'wander') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      this.speechTimer--;
    if (this.speechTimer <= 0) {
      const { sx, sy } = worldToScreen(this.wx, this.wy);
      const ds = depthScale(this.wy);
     const phrase = KID_PHRASES[floor(random(KID_PHRASES.length))];
const kRef = this;
speechBubbles.push(new SpeechBubble(phrase, () => {
  const { sx, sy } = worldToScreen(kRef.wx, kRef.wy);
  const ds = depthScale(kRef.wy);
  return { x: sx, y: sy - 35 * ds };
}));
      this.speechTimer = floor(random(300, 700));
    }
      // chance to pet the ram if nearby
if (frameCount % 60 === 0 && random() < 0.3 && !this.heldFlower) {
  if (ram && ram.state !== 'eat') {
    const dx = ram.wx - this.wx;
    const dy = ram.wy - this.wy;
    if (sqrt(dx*dx + dy*dy) < 0.1) {
      this.twx = ram.wx;
      this.twy = ram.wy + 0.03; // approach slightly in front of ram
      this.state = 'approachPet';
    }
  }
}
      
      if (d < 0.03) {
        this.wanderCount++;
        if (this.wanderCount >= this.maxWanders) {
          // head back to school
          this.twx = 0.5 + random(-0.06, 0.06);
          this.twy = 0.01;
          this.state = 'return';
        } else {
          this.state = 'idle';
          this.idleTimer = floor(random(20, 80));
          this.twx = random(0.08, 0.92);
          this.twy = random(0.12, 0.88);
        }
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        const sep = getSeparation(this.wx, this.wy, this.id);
this.wx = constrain(this.wx + sep.nudgeX, 0.02, 0.98);
this.wy = constrain(this.wy + sep.nudgeY, 0.04, 0.98);
        this.walkPhase += 0.2;
        // chance to spot and pick a nearby flower
if (frameCount % 90 === 0 && random() < 0.3 && !this.heldFlower) {
  for (let i = 0; i < flowers.length; i++) {
    const f = flowers[i];
    const fdx = f.wx - this.wx;
    const fdy = f.wy - this.wy;
    if (sqrt(fdx*fdx + fdy*fdy) < 0.08 && f.size > 0.1) {
      this.twx = f.wx;
      this.twy = f.wy;
      this.pickTargetIdx = i;
      this.state = 'approachFlower';
      break;
    }
  }
}
      }

    } else if (this.state === 'return') {
      const dx = this.twx - this.wx;
      const dy = this.twy - this.wy;
      const d  = sqrt(dx*dx + dy*dy);
      this.dir = dx > 0 ? 1 : -1;
      if (d < 0.03) {
        this.state = 'done';
      } else {
        this.wx += (dx / d) * this.speed;
        this.wy += (dy / d) * this.speed;
        this.walkPhase += 0.2;
      }

    } else if (this.state === 'idle') {
      this.idleTimer--;
      this.walkPhase = 0;
      if (this.idleTimer <= 0) {
        this.state = 'wander';
        this.twx = random(0.08, 0.92);
        this.twy = random(0.12, 0.88);
      }
    } else if (this.state === 'approachFlower') {
  if (this.pickTargetIdx === null || this.pickTargetIdx >= flowers.length) {
    this.state = 'wander'; return;
  }
  const f = flowers[this.pickTargetIdx];
  const dx = f.wx - this.wx;
  const dy = f.wy - this.wy;
  const d  = sqrt(dx*dx + dy*dy);
  this.dir = dx > 0 ? 1 : -1;
  if (d < 0.025) {
    this.state = 'pickFlower';
    this.pickTimer = 45;
  } else {
    this.wx += (dx / d) * this.speed;
    this.wy += (dy / d) * this.speed;
    this.walkPhase += 0.2;
  }

}  else if (this.state === 'approachPet') {
  if (!ram) { this.state = 'wander'; return; }
  const dx = ram.wx - this.wx;
  const dy = ram.wy - this.wy;
  const d  = sqrt(dx*dx + dy*dy);
  this.dir = dx > 0 ? 1 : -1;
  if (d < 0.04) {
    this.state = 'petting';
    this.idleTimer = floor(random(60, 120));
    // kid says something sweet
    const kRef = this;
    const petPhrases = ['Good boy!', 'So fluffy!', 'Hi Ramy!',
                        'Aww!', 'Pet pet pet!', 'Soft!'];
    speechBubbles.push(new SpeechBubble(
      petPhrases[floor(random(petPhrases.length))],
      () => {
        const { sx, sy } = worldToScreen(kRef.wx, kRef.wy);
        const ds = depthScale(kRef.wy);
        return { x: sx, y: sy - 35 * ds };
      }
    ));
    this.ramReactTimer = 90; // ram will respond after kid's line has time to show
  } else {
    this.wx += (dx / d) * this.speed;
    this.wy += (dy / d) * this.speed;
    this.walkPhase += 0.2;
  }

} else if (this.state === 'petting') {
  this.idleTimer--;
  this.walkPhase = 0;
  // follow ram position while petting, staying slightly in front
  if (ram) {
    this.wx = lerp(this.wx, ram.wx - 0.03 * this.dir, 0.1);
    this.wy = lerp(this.wy, ram.wy + 0.03, 0.1);
  }
  // delayed ram reaction so it doesn't overlap kid's speech
  if (this.ramReactTimer > 0) {
    this.ramReactTimer--;
    if (this.ramReactTimer === 0 && ram) {
      const ramRef = ram;
      speechBubbles.push(new SpeechBubble('*content baa*', () => {
        const { sx, sy } = worldToScreen(ramRef.wx, ramRef.wy);
        const ds = depthScale(ramRef.wy);
        return { x: sx, y: sy - 40 * ds };
      }));
    }
  }
  if (this.idleTimer <= 0) {
    this.state = 'wander';
    this.twx = random(0.08, 0.92);
    this.twy = random(0.12, 0.88);
  }
}else if (this.state === 'pickFlower') {
  this.pickTimer--;
  if (this.pickTimer <= 0) {
    // grab it
    if (dirt && !dirt.isPlaying()) dirt.play();
    if (this.pickTargetIdx !== null && this.pickTargetIdx < flowers.length) {
      const f = flowers[this.pickTargetIdx];
      this.heldFlower = { hsl: f.hsl, type: f.type };
      f.dispose();
      flowers.splice(this.pickTargetIdx, 1);
    }
    this.pickTargetIdx = null;
    // head back to school
    this.twx = 0.5 + random(-0.06, 0.06);
    this.twy = 0.01;
    this.state = 'carry';
  }

} else if (this.state === 'carry') {
  const dx = this.twx - this.wx;
  const dy = this.twy - this.wy;
  const d  = sqrt(dx*dx + dy*dy);
  this.dir = dx > 0 ? 1 : -1;
  if (d < 0.03) {
    this.heldFlower = null;
    this.state = 'done';
  } else {
    this.wx += (dx / d) * this.speed * 1.1;
    this.wy += (dy / d) * this.speed * 1.1;
    this.walkPhase += 0.2;
  }
}

    // remove done kids from the array
    if (this.state === 'done') {
      const idx = kids.indexOf(this);
      if (idx >= 0) kids.splice(idx, 1);
    }
  }

  // Renders the kid sprite at its world position, scaled by depth and individual height.
  draw() {
    if (this.state === 'done') return;
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    const ds = depthScale(this.wy);
    push();
    translate(sx, sy);
    scale(ds * this.height * 1.4);
    drawKidShape(
      this.walkPhase, this.state,
      this.dir, this.shirtHue, this.pantsHue,
      this.skinL, this.hairHue, this.hairL,
      this.hasHat, this.hatHue, this.hasPonytail,
      this.heldFlower, this.pickTimer, 
      
    );
    pop();
  }
}
// Draws a child figure with randomized clothing, hair, hat, and optional held flower.
function drawKidShape(phase, state, dir, shirtHue, pantsHue, skinL, hairHue, hairL, hasHat, hatHue, hasPonytail, heldFlower, pickTimer, hasBackpack) {
  const walking = (state === 'wander' || state === 'enter' || state === 'return' || state === 'carry' || state === 'approachFlower'|| state === 'approachPet');
  const crouching = state === 'pickFlower';
  push();
  scale(dir, 1);

  const lSwing = walking ? sin(phase) * 7 : 0;
  const aSwing = walking ? sin(phase + PI) * 0.3 : 0;
  const crouchY = crouching ? 8 : 0;  // shift body down when crouching

  // Legs
  strokeWeight(3.5);
  stroke(pantsHue, 55, 38);
  noFill();
  if (crouching) {
    line( 3, -2 + crouchY, -4, 16);   // bent legs
    line( 9, -2 + crouchY, 18, 16);
  } else {
    line( 3, -2,  3 + lSwing, 18);
    line( 9, -2,  9 - lSwing, 18);
  }

  noStroke();
  fill(20, 20, 18);
  ellipse( 3 + (crouching ? -4 : lSwing),  20, 7, 4);
  ellipse( 9 + (crouching ? 9 : -lSwing),  20, 7, 4);

  // Backpack (drawn behind body, visible on back side)
  if (hasBackpack && !crouching) {
    fill((shirtHue + 120) % 360, 55, 35); noStroke();
    rect(-6, -20 + crouchY, 12, 18, 3);
    // Straps
    fill((shirtHue + 120) % 360, 45, 28);
    rect(-5, -20 + crouchY, 3, 12, 1);
    rect(4, -20 + crouchY, 3, 12, 1);
    // Pocket
    fill((shirtHue + 120) % 360, 40, 30);
    rect(-2, -10 + crouchY, 8, 5, 1);
  }

  // Body
  noStroke();
  fill(shirtHue, 70, 55);
  ellipse(6, -12 + crouchY, 18, 18);

  // Arms
  strokeWeight(3);
  stroke(shirtHue, 65, 50);
  noFill();
  if (crouching) {
    // both arms reach down toward flower
    push(); translate(-5, -12 + crouchY); rotate(1.0); line(0, 0, -2, 12); pop();
    push(); translate(17, -12 + crouchY); rotate(-1.0); line(0, 0, 2, 12); pop();
  }  else if (state === 'petting') {
  // one arm raised reaching forward to pat
  push(); translate(-5, -16); rotate(aSwing); line(0, 0, -2, 12); pop();
  push(); translate(17, -16); rotate(-0.8); line(0, 0, 8, -6); pop(); // reach out
} else if (heldFlower) {
  push(); translate(-5, -16); rotate(aSwing); line(0, 0, -2, 12); pop();
  push(); translate(17, -16); rotate(-1.1); line(0, 0, 2, 10); pop();
} 
  
  else if (heldFlower) {
    // one arm raised holding flower
    push(); translate(-5, -16); rotate(aSwing); line(0, 0, -2, 12); pop();
    push(); translate(17, -16); rotate(-1.1); line(0, 0, 2, 10); pop();  // raised arm
  } else {
    push(); translate(-5, -16); rotate(aSwing); line(0, 0, -2, 12); pop();
    push(); translate(17, -16); rotate(-aSwing); line(0, 0, 2, 12); pop();
  }

  // Head
  noStroke();
  fill(28, 45, skinL);
  ellipse(6, -30 + crouchY, 16, 17);

  // Hair
  fill(hairHue, 55, hairL);
  arc(6, -32 + crouchY, 16, 14, PI, TWO_PI, CHORD);
  if (hasPonytail) {
    fill(hairHue, 50, hairL);
    push(); translate(-4, -32 + crouchY); rotate(0.3); ellipse(0, 0, 5, 10); pop();
  }

  // Hat
  if (hasHat) {
    noStroke();
    fill(hatHue, 72, 55);
    ellipse(6, -38 + crouchY, 20, 6);
    rect(1, -46 + crouchY, 10, 9, 2);
    fill(hatHue, 65, 45);
    rect(1, -39 + crouchY, 10, 3);
  }

  // Face
  noStroke();
  fill(20, 10, 12);
  ellipse(4, -31 + crouchY, 2.5, 2.5);
   ellipse(8, -31 + crouchY, 2.5, 2.5);
  noFill();
  stroke(20, 10, 20);
  strokeWeight(1);
  arc(6, -28 + crouchY, 6, 4, 0.1, PI - 0.1);

  // Held flower — small, above the raised arm
  if (heldFlower) {
    push();
    translate(20, -28);   // position above raised hand
    scale(0.18);          // tiny version
    drawFlower(0, 0, heldFlower.hsl, 1.0, heldFlower.type, 0);
    pop();
  }

  pop();
}



// Resizes the canvas to fill the browser window when the window dimensions change.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Toggles fullscreen mode on mouse click.
function mousePressed() {

  if (!fullscreen()) {
    fullscreen(true);
  }else{
    fullscreen(false);
  }
}

// Handles keyboard shortcuts: M toggles music, R/S/T force weather states.
function keyPressed() {
  if (key === 'm' || key === 'M') {
    if (birds && birds.isPlaying()) {
      birds.pause();
    } else if (birds) {
      birds.loop();
    }
  }
  if (key === 'r' || key === 'R') {
    weatherState = 'rainy';
    weatherTimer = 1800;
    weatherDuration = 1800;
    nextWeatherState = 'clearing';
  }
  if (key === 's' || key === 'S') {
    weatherState = 'sunny';
    weatherTimer = 1800;
    weatherDuration = 1800;
    nextWeatherState = 'cloudy';
  }
  if (key === 't' || key === 'T') {
    weatherState = 'stormy';
    weatherTimer = 1800;
    weatherDuration = 1800;
    nextWeatherState = 'clearing';
  }
}

// An arrival/departure kid that walks to/from the school with a backpack
class ArrivalKid {
  constructor(departing) {
    this.departing = departing || false;
    this.fromLeft = random() < 0.5;
    this.dir = this.fromLeft ? 1 : -1;
    this.speed = random(0.002, 0.004);
    this.walkPhase = random(TWO_PI);
    this.done = false;

    // Random appearance
    this.shirtHue = random(360);
    this.pantsHue = random(360);
    this.skinL = random(52, 78);
    this.hairHue = random(20, 40);
    this.hairL = random(18, 55);
    this.height = random(0.78, 1.0);
    this.hasHat = random() < 0.3;
    this.hatHue = random(360);
    this.hasPonytail = random() < 0.4;

    if (this.departing) {
      this.wx = 0.5 + random(-0.06, 0.06);
      this.wy = random(0.03, 0.1);
      this.twx = this.fromLeft ? -0.08 : 1.08;
      this.twy = random(0.3, 0.7);
      this.dir = this.twx < 0.5 ? -1 : 1;
    } else {
      this.wx = this.fromLeft ? -0.08 : 1.08;
      this.wy = random(0.3, 0.7);
      this.twx = 0.5 + random(-0.06, 0.06);
      this.twy = random(0.02, 0.06);
    }
  }

  update() {
    const dx = this.twx - this.wx;
    const dy = this.twy - this.wy;
    const dist = sqrt(dx * dx + dy * dy);
    if (dist > 0.02) {
      this.wx += (dx / dist) * this.speed;
      this.wy += (dy / dist) * this.speed;
      this.walkPhase += 0.2;
      this.dir = dx > 0 ? 1 : -1;
    } else {
      this.done = true;
    }
  }

  draw() {
    const { sx, sy } = worldToScreen(this.wx, this.wy);
    const ds = depthScale(this.wy);
    push();
    translate(sx, sy);
    scale(ds * this.height * 1.4);
    drawKidShape(this.walkPhase, 'enter', this.dir, this.shirtHue, this.pantsHue,
                 this.skinL, this.hairHue, this.hairL, this.hasHat, this.hatHue,
                 this.hasPonytail, null, 0, true);
    pop();
  }
}

