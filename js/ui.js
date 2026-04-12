// ================================================================
// File: ui.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: UI systems for the CARE Garden including smile stats
//   persistence, gallery panel, character cards, CARE score dashboard,
//   speech bubbles, and confetti celebrations.
// ================================================================

// ── UI: Speech Bubbles, Panels, Gallery, Confetti ────

// ── Smile Stats (localStorage) ──────────────────────

// Formats a Date object into a "YYYY-MM-DD" string using local time
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// Returns today's date as a localStorage-friendly key string
function getTodayKey() {
  return localDateStr(new Date());
}

// Returns an array of 7 date-key strings (Sun-Sat) for the current week
function getWeekDays() {
  // Returns array of 7 date keys (Sun–Sat) for the current week
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + i);
    days.push(localDateStr(d));
  }
  return days;
}

// Loads smile statistics from localStorage and syncs careScore and milestones
function loadSmileStats() {
  try {
    const raw = localStorage.getItem('careGardenStats');
    if (!raw) return;
    const data = JSON.parse(raw);
    const today = getTodayKey();

    // Today's count
    smileStats.today = (data.dailyCounts && data.dailyCounts[today]) || 0;

    // Week total — sum all days in current week
    smileStats.week = 0;
    if (data.dailyCounts) {
      for (let key of getWeekDays()) {
        smileStats.week += (data.dailyCounts[key] || 0);
      }
    }

    // Record day
    smileStats.record = data.record || 0;
    smileStats.recordDate = data.recordDate || '';

    // Restore careScore from today and sync milestones
    careScore = smileStats.today;
    for (let m of CONFETTI_MILESTONES) {
      if (careScore >= m) lastMilestoneCelebrated = m;
    }
  } catch (e) { /* ignore */ }
}

// Persists new smile counts to localStorage, updates records, and prunes old entries
function saveSmileStats(added) {
  try {
    const raw = localStorage.getItem('careGardenStats');
    const data = raw ? JSON.parse(raw) : { dailyCounts: {}, record: 0, recordDate: '' };
    if (!data.dailyCounts) data.dailyCounts = {};

    const today = getTodayKey();
    data.dailyCounts[today] = (data.dailyCounts[today] || 0) + added;

    // Update record
    if (data.dailyCounts[today] > (data.record || 0)) {
      data.record = data.dailyCounts[today];
      data.recordDate = today;
    }

    // Clean up old entries (keep last 14 days)
    const keys = Object.keys(data.dailyCounts).sort();
    while (keys.length > 14) {
      delete data.dailyCounts[keys.shift()];
    }

    localStorage.setItem('careGardenStats', JSON.stringify(data));

    // Update live stats
    smileStats.today = data.dailyCounts[today];
    smileStats.week = 0;
    for (let key of getWeekDays()) {
      smileStats.week += (data.dailyCounts[key] || 0);
    }
    smileStats.record = data.record;
    smileStats.recordDate = data.recordDate;
  } catch (e) { /* ignore */ }
}

// ── SpeechBubble ─────────────────────────────────────

// Floating speech bubble that fades in, drifts upward, then fades out above a character
class SpeechBubble {
  constructor(text, getPos) {
    this.text   = text;
    this.getPos = getPos;
    this.alpha  = 0;
    this.age    = 0;
    this.duration = 180;
    this.w      = max(text.length * 7, 60);
    this.h      = 28;
    this.floatY = 0;
  }

  // Advances age, updates float offset and alpha transparency; returns false when expired
  update() {
    this.age++;
    this.floatY -= 0.3;
    if (this.age < 20) {
      this.alpha = map(this.age, 0, 20, 0, 255);
    } else if (this.age > this.duration - 30) {
      this.alpha = map(this.age, this.duration - 30, this.duration, 255, 0);
    } else {
      this.alpha = 255;
    }
    return this.age < this.duration;
  }

  // Renders the bubble with a triangular tail at the character's position
  draw() {
    const pos = this.getPos();
    const px  = pos.x;
    const py  = pos.y + this.floatY -30;
    push();
    noStroke();
    fill(0, 0, 100, this.alpha * 0.92);
    rect(px - this.w/2, py - this.h, this.w, this.h, 8);
    fill(0, 0, 100, this.alpha * 0.92);
    triangle(px - 6, py, px + 6, py, px, py + 10);
    fill(0, 0, 10, this.alpha);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(11);
    text(this.text, px, py - this.h/2);
    pop();
  }
}

// ── Gallery & Panel Management ───────────────────────

// Adds pending photos to the gallery queue and fades them in over time
function manageGallery() {
  if (millis() - lastGalleryUpdate > updateInterval && pendingPhoto) {
    smileGallery.unshift({ img: pendingPhoto, alpha: 0 });
    if (smileGallery.length > MAX_GALLERY) smileGallery.pop();
    pendingPhoto = null;
    lastGalleryUpdate = millis();
  }
  for (let photo of smileGallery) {
    if (photo.alpha < 255) photo.alpha += 5;
  }
}

// Cycles between the gallery panel and character cards on a timed rotation
function drawSmileGallery(ox) {
  if (millis() - panelModeTimer > PANEL_CYCLE_DURATION) {
    panelCycleIdx = (panelCycleIdx + 1) % panelCycle.length;
    panelMode     = panelCycle[panelCycleIdx];
    panelModeTimer = millis();
  }
  if (panelMode === 'gallery') {
    drawGalleryPanel(ox);
  } else {
    const card = CHARACTER_CARDS.find(c => c.id === panelMode);
    if (card) drawCharacterCard(ox, card);
  }
}

// Draws the smile photo gallery grid panel with up to 6 thumbnail images
function drawGalleryPanel(ox) {
  const panelW = ox, panelH = height - splitY();
  push();
  translate(width - ox, splitY());
  fill(0, 0, 15, 180); noStroke();
  rect(0, 0, panelW, panelH);
  textAlign(CENTER, TOP); fill(0, 0, 95); textStyle(BOLD);
  textSize(min(panelW * 0.12, 14));
  text("SMILE ARCHIVE", panelW / 2, 12);
  drawCycleIndicator(panelW, panelH);

  if (smileGallery.length > 0) {
    const cols = 3, rows = 2, padding = 10;
    const topMargin = 38, bottomMargin = 25;
    const availW = panelW - (padding * (cols + 1));
    const availH = panelH - topMargin - bottomMargin - (padding * (rows - 1));
    const imgSize = min(availW / cols, availH / rows);
    const gridW   = (imgSize * cols) + (padding * (cols - 1));
    const xOff    = (panelW - gridW) / 2;

    const maxDisplay = min(smileGallery.length, 6);
    for (let i = 0; i < maxDisplay; i++) {
      const photoObj = smileGallery[i];
      const col = i % cols, row = floor(i / cols);
      const x   = xOff + col * (imgSize + padding);
      const y   = topMargin + row * (imgSize + padding);
      stroke(0, 0, 100, photoObj.alpha);
      fill(0, 0, 100, photoObj.alpha);
      rect(x - 2, y - 2, imgSize + 4, imgSize + 4, 2);
      tint(255, photoObj.alpha);
      image(photoObj.img, x, y, imgSize, imgSize);
      noTint();
    }
  } else {
    textAlign(CENTER, CENTER); fill(0, 0, 55);
    textSize(min(panelW * 0.08, 12)); textStyle(NORMAL);
    text("Smile and hold!\nYour photo grows\na flower.", panelW / 2, panelH / 2);
  }
  pop();
}

// Renders an "I SPY" character info card with sprite, name, title, and description
function drawCharacterCard(ox, card) {
  const panelW = ox, panelH = height - splitY();
  push();
  translate(width - ox, splitY());

  const [ch, cs, cl] = card.color;
  fill(ch, cs, cl, 230); noStroke();
  rect(0, 0, panelW, panelH);
  fill(0, 0, 0, 70);
  rect(0, panelH * 0.52, panelW, panelH * 0.48);

  const headerH = panelH * 0.1;
  fill(0, 0, 100, 30); noStroke();
  rect(0, 0, panelW, headerH);
  fill(0, 0, 96, 255);
  textAlign(CENTER, CENTER); textStyle(BOLD);
  textSize(min(panelW * 0.13, 18));
  text('I  S P Y', panelW / 2, headerH / 2);
  stroke(0, 0, 100, 60); strokeWeight(0.5);
  line(panelW * 0.1, headerH, panelW * 0.9, headerH); noStroke();

  drawCardSprite(card.id, panelW / 2, panelH * 0.32, panelW);

  fill(0, 0, 96, 255); textStyle(BOLD); textAlign(CENTER, TOP);
  textSize(min(panelW * 0.11, 16));
  text(card.name, panelW / 2, panelH * 0.53);

  const titleY = panelH * 0.615, titleW = panelW * 0.88;
  fill(0, 0, 100, 30);
  rect((panelW - titleW) / 2, titleY - 5, titleW, 18, 9);
  fill(0, 0, 90, 255);
  textSize(min(panelW * 0.075, 11)); textStyle(NORMAL); textAlign(CENTER, CENTER);
  text(card.title, panelW / 2, titleY + 4);

  fill(0, 0, 95, 255); textStyle(NORMAL);
  textSize(min(panelW * 0.095, 20)); textAlign(CENTER, TOP);
  textLeading(min(panelW * 0.12, 17));
  text(card.body, panelW * 0.06, panelH * 0.67, panelW * 0.88, panelH * 0.26);

  drawCycleIndicator(panelW, panelH);
  pop();
}

// Draws the animated character sprite for a given card ID centered at (cx, cy)
function drawCardSprite(id, cx, cy, panelW) {
  const sc = min(panelW * 0.0025, 0.55);
  push();
  translate(cx, cy);
  if      (id === 'ram')       { scale(sc * 2.2); drawRamShape(t * 0.18, 'idle', 0, 1, false); }
  else if (id === 'gardener')  { scale(sc * 2.0); translate(-5, 0); drawGardenerShape(t * 0.15, 'idle', 0, 1); }
  else if (id === 'goose')     { scale(sc * 1.8); translate(0, 10); drawGooseShape(t * 0.15, 'wander', 1); }
  else if (id === 'mrperkins') { scale(sc * 2.2); drawMrPerkinsShape(sin(t * 0.05) * 0.5, 'speak', 1); }
  else if (id === 'cat')       { scale(sc * 1.8); drawCatShape(0, 'sit', 1, 0, 12, false, t * 0.04); }
  else if (id === 'school')    { drawMiniSchool(panelW); }
  else if (id === 'kids') {
    push(); translate(-8 * sc * 18, 0); scale(sc * 1.4);
    drawKidShape(t * 0.2, 'idle', 1, 340, 220, 65, 28, 35, false, 0, false, null, 0); pop();
    push(); scale(sc * 1.4);
    drawKidShape(t * 0.2 + 1.0, 'idle', -1, 42, 200, 72, 32, 42, true, 180, false, null, 0); pop();
    push(); translate(8 * sc * 18, 0); scale(sc * 1.4);
    drawKidShape(t * 0.2 + 2.1, 'idle', 1, 270, 140, 58, 25, 28, false, 0, true, null, 0); pop();
  }
  else if (id === 'principal') { scale(sc * 2.0); drawPrincipalShape(sin(t * 0.05) * 0.3, 'welcome', 1); }
  else if (id === 'staff') {
    // Group of teacher silhouettes
    push(); translate(-10 * sc * 18, 0); scale(sc * 1.6);
    drawTeacherShape(t * 0.12, 1, 210, 220, 28, 65, 25, 30, false); pop();
    push(); scale(sc * 1.6);
    drawTeacherShape(t * 0.12 + 1.0, -1, 320, 230, 25, 58, 30, 22, true); pop();
    push(); translate(10 * sc * 18, 0); scale(sc * 1.6);
    drawTeacherShape(t * 0.12 + 2.0, 1, 280, 220, 30, 72, 35, 45, false); pop();
  }
  pop();
}

// Draws a miniature Robert Adams Middle School building illustration
function drawMiniSchool(panelW) {
  const sc = min(panelW / 380, 0.52);
  push(); colorMode(RGB,255); scale(sc);
  translate(0, 10);

  // ── Left wing (brick) ───────────────────────────────
  noStroke(); fill(128, 78, 58);
  rect(-140, -70, 80, 50);
  fill(74, 100, 122); rect(-140, -75, 80, 5); // parapet trim
  // wing windows
  for (let i = 0; i < 3; i++) {
    fill(168, 200, 220, 200); rect(-128 + i*24, -62, 13, 18);
    fill(80, 110, 130); rect(-128 + i*24 + 6, -62, 1, 18); rect(-128 + i*24, -62 + 9, 13, 1);
  }

  // ── Center glass tower ──────────────────────────────
  fill(198, 208, 214); rect(-60, -90, 55, 70);
  fill(74, 100, 122); rect(-60, -95, 55, 5);
  fill(90, 116, 138); rect(-48, -108, 32, 14); // penthouse
  // glass panels
  for (let i = 0; i < 3; i++) {
    fill(168, 210, 230, 200); rect(-55 + i*17, -85, 12, 30);
  }
  // sign
  fill(255,255,255); textAlign(CENTER,CENTER); textSize(5); textStyle(BOLD);
  text('ROBERT ADAMS', -33, -74);
  textSize(4); textStyle(NORMAL); text('MIDDLE SCHOOL', -33, -67);

  // ── Right wing (brick) ──────────────────────────────
  fill(176, 136, 98); rect(-5, -75, 115, 55);
  fill(74, 100, 122); rect(-5, -80, 115, 5);
  for (let i = 0; i < 5; i++) {
    fill(168, 200, 220, 200); rect(0 + i*20, -68, 13, 16);
    fill(80, 110, 130); rect(0 + i*20 + 6, -68, 1, 16); rect(0 + i*20, -68+8, 13, 1);
  }

  // ── Portico canopy ──────────────────────────────────
  fill(232, 229, 221); rect(-60, -40, 175, 7);
  fill(225, 221, 212);
  for (let px2 of [-60, -44, -28, -12, 4, 20, 36, 52, 68, 84, 100]) {
    rect(px2, -33, 3, 20);
  }

  // ── Sidewalk ────────────────────────────────────────
  fill(195, 190, 180); rect(-145, -20, 290, 7);
  stroke(175,170,160); strokeWeight(0.5);
  for (let sx2 = -145; sx2 < 145; sx2 += 40) line(sx2, -20, sx2, -13);
  noStroke();

  // ── Flagpole ────────────────────────────────────────
  stroke(180, 184, 188); strokeWeight(1.5);
  line(-90, -20, -90, -95);
  noStroke(); fill(255,255,255); rect(-90, -95, 22, 11);
  fill(0,78,42);
  for (let i=0;i<3;i++) rect(-90, -95+i*2.5, 22, 1.2);
  fill(222,70,34); rect(-90, -95, 9, 6);

  colorMode(HSL, 360,100,100,255);
  pop();
}

// Draws dot indicators and a progress bar showing the current panel cycle position
function drawCycleIndicator(panelW, panelH) {
  const total = panelCycle.length, spacing = 10;
  const startX = (panelW - total * spacing) / 2 + spacing / 2;
  const y = panelH - 10;
  noStroke();
  for (let i = 0; i < total; i++) {
    fill(0, 0, 96, i === panelCycleIdx ? 220 : 70);
    ellipse(startX + i * spacing, y, 6, 6);
  }
  const progress = min((millis() - panelModeTimer) / PANEL_CYCLE_DURATION, 1.0);
  fill(0, 0, 96, 140);
  const barW = panelW * 0.7, barX = (panelW - barW) / 2;
  rect(barX, panelH - 5, barW * progress, 2, 1);
}

// ── CARE Score Panel ─────────────────────────────────

// Draws the CARE Garden dashboard panel with cycling stats and C-A-R-E value blocks
function drawCareScore(ox) {
  const panelW = ox, panelH = height - splitY();
  push();
  translate(0, splitY());
  noStroke(); fill(0, 0, 8, 180);
  rect(0, 0, panelW, panelH);

  textAlign(CENTER, TOP); fill(0, 0, 95); textStyle(BOLD);
  textSize(min(panelW * 0.09, 16));
  text("CARE GARDEN DASHBOARD", panelW / 2, 20);

  // Cycle through stats every 4 seconds
  statsCycleTimer++;
  if (statsCycleTimer > 240) {
    statsCycleTimer = 0;
    statsCycleIdx = (statsCycleIdx + 1) % 3;
  }

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayName = dayNames[new Date().getDay()];
  let recordLabel = "RECORD DAY:";
  if (smileStats.recordDate) {
    const parts = smileStats.recordDate.split('-');
    const rd = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    recordLabel = "RECORD (" + dayNames[rd.getDay()] + "):";
  }
  const statsLabels = [
    todayName.toUpperCase() + "'S SMILES:",
    "THIS WEEK:",
    recordLabel
  ];
  const statsValues = [
    smileStats.today,
    smileStats.week,
    smileStats.record
  ];

  textStyle(NORMAL); textSize(min(panelW * 0.06, 12));
  fill(0, 0, 75);
  text(statsLabels[statsCycleIdx], panelW / 2, 45);

  const pulse = 1 + (sunGlow * 0.1);
  const statHues = [55, 200, 340];
  fill(statHues[statsCycleIdx], 85, 75);
  textSize(min(panelW * 0.25, 50) * pulse);
  textStyle(BOLD);
  text(statsValues[statsCycleIdx], panelW / 2, 60);


  const letters = ['C','A','R','E'];
  const words   = ['Compassion','Acceptance','Respect','Effort'];
  const hues    = [340, 200, 42, 140];
  const boxSize = min(panelW * 0.16, 40);
  const gap     = boxSize * 0.6;
  const totalW  = (boxSize * 4) + (gap * 3);
  const startX  = (panelW - totalW) / 2;
  const blockY  = 130;

  for (let i = 0; i < 4; i++) {
    const bx = startX + i * (boxSize + gap);
    noStroke(); fill(hues[i], 75, 50, 220);
    rect(bx, blockY, boxSize, boxSize, 6);
    fill(255); textSize(boxSize * 0.65); textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(letters[i], bx + boxSize/2, blockY + boxSize/2);
    fill(hues[i], 60, 85);
    textSize(min(boxSize * 0.28, 10)); textStyle(NORMAL);
    textAlign(CENTER, TOP);
    text(words[i], bx + boxSize/2, blockY + boxSize + 8);
  }

  // Stat dots indicator — above CARE boxes
  const dotY = blockY - 12;
  for (let i = 0; i < 3; i++) {
    fill(0, 0, i === statsCycleIdx ? 90 : 40);
    ellipse(panelW / 2 + (i - 1) * 12, dotY, 5, 5);
  }

  textAlign(CENTER, BOTTOM); fill(0, 0, 100); textStyle(BOLD);
  const footerSize = min(panelW * 0.06, 50);
  textSize(footerSize); textLeading(footerSize * 1.5);
  text("Spread a smile and make\nour community beautiful.", panelW / 2, panelH - 25);
  pop();
}

// ── Confetti ─────────────────────────────────────────

// Checks if careScore has reached a new milestone and triggers confetti and sound
function checkMilestone() {
  for (let m of CONFETTI_MILESTONES) {
    if (careScore >= m && lastMilestoneCelebrated < m) {
      lastMilestoneCelebrated = m;
      launchConfetti();
      if (m === 67 && milestone67Sound && !milestone67Sound.isPlaying()) {
        milestone67Sound.play();
        setTimeout(() => { if (milestone67Sound.isPlaying()) milestone67Sound.stop(); }, 6000);
      } else if (milestoneSounds.length > 0) {
        const s = milestoneSounds[floor(random(milestoneSounds.length))];
        if (s && !s.isPlaying()) {
          s.play();
          setTimeout(() => { if (s.isPlaying()) s.stop(); }, 6000);
        }
      }
      break;
    }
  }
}

// Spawns 180 confetti particles with random colors, shapes, and physics properties
function launchConfetti() {
  for (let i = 0; i < 180; i++) {
    confettiParticles.push({
      x: random(width * 0.2, width * 0.8), y: random(-20, splitY() * 0.5),
      vx: random(-4, 4), vy: random(-6, 2), size: random(6, 14),
      hue: random(360), rot: random(TWO_PI), rotV: random(-0.15, 0.15),
      shape: random() < 0.5 ? 'rect' : 'circle', alpha: 255,
      gravity: random(0.12, 0.22), wobble: random(TWO_PI),
      wobbleSpeed: random(0.05, 0.12)
    });
  }
}

// Updates confetti particle physics and renders them, plus shows a milestone banner
function updateDrawConfetti() {
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.vy += p.gravity; p.x += p.vx + sin(p.wobble) * 1.2;
    p.y += p.vy; p.rot += p.rotV; p.wobble += p.wobbleSpeed; p.alpha -= 1.2;
    if (p.alpha <= 0 || p.y > height) { confettiParticles.splice(i, 1); continue; }
    push(); translate(p.x, p.y); rotate(p.rot); noStroke();
    fill(p.hue, 85, 65, p.alpha);
    if (p.shape === 'rect') rect(-p.size/2, -p.size/4, p.size, p.size/2);
    else ellipse(0, 0, p.size * 0.7, p.size * 0.7);
    pop();
  }
  if (confettiParticles.length > 120) {
    push();
    const bannerY = splitY() * 0.38;
    noStroke(); fill(0, 0, 8, 200);
    rect(width/2 - 160, bannerY - 30, 320, 58, 12);
    fill(55, 90, 75, 255); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(28);
    text('🌸 ' + lastMilestoneCelebrated + ' SMILES! 🌸', width/2, bannerY);
    fill(0, 0, 88, 255); textSize(13); textStyle(NORMAL);
    text('Thank you for caring!', width/2, bannerY + 22);
    pop();
  }
}
