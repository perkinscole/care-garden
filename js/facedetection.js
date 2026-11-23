// ================================================================
// File: facedetection.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Face detection with smile recognition and head
//   decorations. Tracks smile hold durations, then draws everything
//   that sits on top of the live video in pixel art: friendly corner
//   brackets and a smile meter around each face, the countdown badge,
//   and (during Hat Time) hats, crowns, horns and other accessories
//   from js/art/hats_art.js, enlarged by whole numbers to fit each head.
// ================================================================

// ── Face Detection ───────────────────────────────────

// Initiates asynchronous face detection via the ml5 faceApi
function faceReady() {
  faceapi.detect(gotFaces);
}

// Callback that processes detection results, tracks smile frames per face, and re-triggers detection
function gotFaces(error, result) {
  if (error) {
    console.log(error);
    // Reschedule anyway with a small backoff so one bad frame doesn't kill detection forever.
    setTimeout(() => { try { faceapi.detect(gotFaces); } catch (e) { console.log(e); } }, 500);
    return;
  }

  const now = millis();
  lastFaceUpdate = now;
  detections = result;
  h = false;

  for (let key in faceSmileData) {
    faceSmileData[key].seen = false;
  }

  for (let i = 0; i < detections.length; i++) {
    const box = detections[i].alignedRect._box;
    const cx  = round((box._x + box._width  / 2) / 80) * 80;
    const cy  = round((box._y + box._height / 2) / 80) * 80;
    const key = cx + '_' + cy;

    if (!faceSmileData[key]) {
      // Inherit decoration from nearest existing face (same person shifted slightly)
      let inheritedDeco = -1;
      let bestDist = Infinity;
      for (let oldKey in faceSmileData) {
        const parts = oldKey.split('_');
        const ox = parseInt(parts[0]), oy = parseInt(parts[1]);
        const d = Math.abs(ox - cx) + Math.abs(oy - cy);
        if (d < 200 && d < bestDist) {
          bestDist = d;
          inheritedDeco = faceSmileData[oldKey].decoration;
        }
      }
      // A new face gets a random entry of FACE_DECORATIONS (see below)
      const deco = inheritedDeco >= 0 ? inheritedDeco : Math.floor(Math.random() * FACE_DECORATIONS.length);
      faceSmileData[key] = { frames: 0, seen: true, snapped: false, decoration: deco, lastSeen: now };
    } else {
      faceSmileData[key].seen = true;
      faceSmileData[key].lastSeen = now;
    }

    const happy = detections[i].expressions.happy * 100 > 75;
    if (happy) {
      faceSmileData[key].frames++;
    } else {
      faceSmileData[key].frames  = 0;
      faceSmileData[key].snapped = false;
    }

    detections[i]._smileKey = key;
    if (happy) h = true;
  }

  // Prune entries that haven't been seen in 30s, bounding dict size across grid drift.
  for (let key in faceSmileData) {
    if (!faceSmileData[key].seen &&
        (now - (faceSmileData[key].lastSeen || 0)) > 30000) {
      delete faceSmileData[key];
    }
  }

  faceapi.detect(gotFaces);
}

// ── Face geometry ────────────────────────────────────

// Scratch rectangle reused every frame so nothing is allocated while drawing
const _faceRect = { x: 0, y: 0, w: 0, h: 0 };

// Converts a detection box (video pixels) into art pixels on the mirrored
// video that sketch.js draws inside `videoArt`. The result is not rounded.
function faceToArt(box, out) {
  const sx = videoArt.w / videoW;
  const sy = videoArt.h / videoH;
  out.x = videoArt.x + videoArt.w - (box._x + box._width) * sx;   // mirrored
  out.y = videoArt.y + box._y * sy;
  out.w = box._width * sx;
  out.h = box._height * sy;
  return out;
}

// Rounds to a whole art pixel, but keeps the previous pixel while the value
// has only wobbled a little. Detection is never perfectly steady, and
// without this a hat or bracket flickers one pixel left and right.
function stickyRound(prev, v) {
  if (prev !== undefined && Math.abs(v - prev) <= 0.8) return prev;
  return Math.round(v);
}

// True when the detection loop has stalled and the faces we hold are old
function facesAreStale() {
  return lastFaceUpdate > 0 && millis() - lastFaceUpdate > 2000;
}

// ── Face boxes ───────────────────────────────────────

// Draws pixel corner brackets around each detected face and a small smile
// meter under the chin. White = "we see you", yellow = smiling (the meter
// fills while the smile is held), green = photo taken.
function drawBoxes(detections) {
  if (!detections || detections.length === 0 || !videoW || !videoH || !videoArt.w) return;
  // Don't draw boxes for stale detections (detection loop stalled)
  if (facesAreStale()) return;

  for (let f = 0; f < detections.length; f++) {
    const det  = detections[f];
    const r    = faceToArt(det.alignedRect._box, _faceRect);
    const data = det._smileKey ? faceSmileData[det._smileKey] : null;

    // Whole art pixels, remembered per face so the brackets hold still
    let x, y, w, bh;
    if (data) {
      x  = data.boxX = stickyRound(data.boxX, r.x);
      y  = data.boxY = stickyRound(data.boxY, r.y);
      w  = data.boxW = stickyRound(data.boxW, r.w);
      bh = data.boxH = stickyRound(data.boxH, r.h);
    } else {
      x = Math.round(r.x); y = Math.round(r.y); w = Math.round(r.w); bh = Math.round(r.h);
    }

    const smiling = det.expressions.happy > 0.75;
    const snapped = !!(data && data.snapped);
    const held    = data ? Math.min(data.frames, SMILE_HOLD_REQUIRED) : 0;

    let col = PAL.white, icon = 'wait', filled = 0;
    if (snapped)      { col = PAL.gr1; icon = 'done';  filled = SMILE_HOLD_REQUIRED; }
    else if (smiling) { col = PAL.ye2; icon = 'smile'; filled = held; }

    // The brackets breathe out by one pixel while a smile is charging up
    const grow = (smiling && !snapped) ? PX.anim(2, 8) : 0;
    drawFaceBrackets(x - grow, y - grow, w + grow * 2, bh + grow * 2, col);
    drawSmileMeter(x + Math.floor(w / 2), Math.min(y + bh + 3, PX.SH - 8), w, icon, filled, snapped);
  }
}
drawBoxes.pixel = true;

// Four soft corner brackets around the rectangle (x, y, w, h)
function drawFaceBrackets(x, y, w, h, col) {
  const len = Math.max(4, Math.min(9, Math.round(w * 0.24)));
  drawBracketCorner(x,         y,         1,  1, len, col);
  drawBracketCorner(x + w - 1, y,        -1,  1, len, col);
  drawBracketCorner(x,         y + h - 1, 1, -1, len, col);
  drawBracketCorner(x + w - 1, y + h - 1, -1, -1, len, col);
}

// One L-shaped corner at (cx, cy) with arms reaching `len` pixels toward
// (sx, sy). It is a 1px coloured line on an ink underlay, so it shows up
// against anything the camera sees, and the corner pixel itself is left
// out so the bracket looks rounded rather than like a camera viewfinder.
function drawBracketCorner(cx, cy, sx, sy, len, col) {
  const hx = sx > 0 ? cx + 1 : cx - len + 1;   // left end of the horizontal arm
  const vy = sy > 0 ? cy + 1 : cy - len + 1;   // top end of the vertical arm
  PX.rect(hx - 1, cy - 1, len + 1, 3, PAL.ink);
  PX.rect(cx - 1, vy - 1, 3, len + 1, PAL.ink);
  PX.rect(hx, cy, len - 1, 1, col);
  PX.rect(cx, vy, 1, len - 1, col);
}

// Draw options for the three smile_icon frames, made once so the meter
// does not create new objects every frame
const SMILE_ICON_FRAMES = { wait: { frame: 'wait' }, smile: { frame: 'smile' }, done: { frame: 'done' } };
const COUNTDOWN_TEXT = { font: 'small', align: 'center', color: PAL.white };

// A little face icon and one pip per smile frame still needed, centred on
// cx with its top at y. Small faces only get the icon.
function drawSmileMeter(cx, y, faceW, icon, filled, snapped) {
  const pips  = SMILE_HOLD_REQUIRED;
  const barW  = pips * 3 + 1;
  const showBar = faceW >= 16;
  const total = showBar ? 7 + 1 + barW : 7;
  const x0 = cx - Math.floor(total / 2);
  PX.spr('smile_icon', x0, y, SMILE_ICON_FRAMES[icon]);
  if (!showBar) return;
  const bx = x0 + 8;
  PX.rect(bx, y + 1, barW, 5, PAL.ink);
  for (let i = 0; i < pips; i++) {
    const on = i < filled;
    PX.rect(bx + 1 + i * 3, y + 2, 2, 3, on ? (snapped ? PAL.gr1 : PAL.ye2) : PAL.g4);
    if (on) PX.px(bx + 1 + i * 3, y + 2, snapped ? PAL.white : PAL.ye1);   // glint
  }
}

// ── Smile countdown ──────────────────────────────────

// Cells of a pixel ring of radius 6, in clockwise order starting at the top.
// Built once; drawCountdown lights them up one after another.
const COUNTDOWN_RING = (() => {
  const cells = [], seen = {};
  for (let i = 0; i < 720; i++) {
    const a = -Math.PI / 2 + (i / 720) * Math.PI * 2;
    const x = Math.round(Math.cos(a) * 6), y = Math.round(Math.sin(a) * 6);
    if (!seen[x + ',' + y]) { seen[x + ',' + y] = true; cells.push([x, y]); }
  }
  return cells;
})();
const COUNTDOWN_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Draws a round badge beside each smiling face: a ring that fills as the
// smile is held, with the number of frames still to go in the middle
// (a tick once the smile has been held long enough).
function drawCountdown() {
  if (!videoW || !videoH || !videoArt.w) return;
  if (facesAreStale()) return;

  for (let i = 0; i < detections.length; i++) {
    const key = detections[i]._smileKey;
    if (!key || !faceSmileData[key]) continue;
    const data = faceSmileData[key];
    const frames = data.frames;
    if (frames <= 0 || data.snapped) continue;

    const progress    = min(frames / SMILE_HOLD_REQUIRED, 1.0);
    const secondsLeft = ceil((SMILE_HOLD_REQUIRED - frames));

    // Same whole-pixel box the brackets use, so the badge moves with them
    const r = faceToArt(detections[i].alignedRect._box, _faceRect);
    const x  = data.boxX !== undefined ? data.boxX : Math.round(r.x);
    const y  = data.boxY !== undefined ? data.boxY : Math.round(r.y);
    const w  = data.boxW !== undefined ? data.boxW : Math.round(r.w);
    const bh = data.boxH !== undefined ? data.boxH : Math.round(r.h);

    // Beside the cheek, clear of the hat; flips to the other side at the edge of the video
    let bx = x + w + 9;
    if (bx + 8 > videoArt.x + videoArt.w) bx = x - 10;
    const by = y + Math.floor(bh / 2);

    PX.circle(bx, by, 7, PAL.ink);
    PX.circle(bx, by, 5, PAL.g5);
    const lit = Math.round(progress * COUNTDOWN_RING.length);
    for (let c = 0; c < COUNTDOWN_RING.length; c++) {
      PX.px(bx + COUNTDOWN_RING[c][0], by + COUNTDOWN_RING[c][1], c < lit ? PAL.ye2 : PAL.g4);
    }
    if (frames >= SMILE_HOLD_REQUIRED) {
      PX.spr('smile_tick', bx, by);
    } else {
      PX.text(COUNTDOWN_DIGITS[constrain(secondsLeft, 0, 9)], bx + 1, by - 4, COUNTDOWN_TEXT);
    }
  }
}
drawCountdown.pixel = true;

// ── Face Decorations ────────────────────────────────

// Every decoration a face can be given, by sprite name (js/art/hats_art.js).
// faceSmileData[key].decoration is an index into this list; a face keeps
// its decoration for as long as it is tracked.
const FACE_DECORATIONS = [
  'hat_explorer', 'hat_black', 'hat_sun', 'hat_cowboy', 'hat_straw',   // the five original hats
  'hat_rain', 'hat_bucket',                                            // rainy-day extras
  'deco_flowers', 'deco_ram', 'deco_party', 'deco_stars', 'deco_butterfly',
];

// Animated decorations: which frames to play and how many game frames each lasts
const DECORATION_ANIM = {
  deco_stars:     { seq: [0, 1, 0, 2], hold: 12 },
  deco_butterfly: { seq: [0, 0, 0, 0, 0, 1, 2, 1, 0, 1, 2, 1], hold: 6 },
};

// The sizes a decoration can be drawn at. Each sprite exists in a large
// version (made for a face 20 art pixels wide) and a small "_s" version
// (for a face 14 wide), and either can be enlarged by a whole number, which
// gives a ladder of sizes about 1.4x apart with every pixel still square.
const DECORATION_SIZES = [
  { small: true,  k: 1, face: 14 },
  { small: false, k: 1, face: 20 },
  { small: true,  k: 2, face: 28 },
  { small: false, k: 2, face: 40 },
  { small: false, k: 3, face: 60 },
  { small: false, k: 4, face: 80 },
  { small: false, k: 5, face: 100 },
  { small: false, k: 6, face: 120 },
];

// How far above the top of the detection box (the eyebrows) a hat sits,
// as a fraction of the face width. Sprite anchors rest on this line.
const HAT_LINE = 0.36;

// Picks the entry of DECORATION_SIZES that fits a face `fw` art pixels wide.
// `prev` is the size used last frame: it is kept until the face has clearly
// outgrown it, so a hat does not pop between two sizes.
function pickDecorationSize(fw, prev) {
  if (prev !== undefined && DECORATION_SIZES[prev]) {
    const ratio = fw / DECORATION_SIZES[prev].face;
    if (ratio > 0.78 && ratio < 1.28) return prev;
  }
  let best = 0, bestErr = Infinity;
  for (let i = 0; i < DECORATION_SIZES.length; i++) {
    const err = Math.abs(Math.log(fw / DECORATION_SIZES[i].face));
    if (err < bestErr) { bestErr = err; best = i; }
  }
  return best;
}

// Draws each tracked face's hat or other head decoration over the video
function drawFaceDecorations(detections) {
  if (!decorationsEnabled) return;
  if (!hatTimeActive) return;
  if (!detections || !videoW || !videoH || !videoArt.w) return;
  // Don't draw hats on stale faces (detection loop stalled — avoids frozen hats on screen)
  if (facesAreStale()) return;

  for (let i = 0; i < detections.length; i++) {
    const key = detections[i]._smileKey;
    if (!key || !faceSmileData[key]) continue;
    const data = faceSmileData[key];

    const r = faceToArt(detections[i].alignedRect._box, _faceRect);
    const rawCx = r.x + r.w / 2;
    const rawTy = r.y;
    const rawFw = r.w;

    // Smooth positions to reduce jitter. Start afresh if this entry has not
    // been drawn for a while, otherwise the hat would slide in from wherever
    // the face used to be.
    const smooth = 0.25;
    if (!data.smoothCx || frameCount - (data.smoothAt || 0) > 20) {
      data.smoothCx = rawCx;
      data.smoothTy = rawTy;
      data.smoothFw = rawFw;
      data.hatX = undefined;
      data.hatY = undefined;
    }
    data.smoothAt = frameCount;
    data.smoothCx += (rawCx - data.smoothCx) * smooth;
    data.smoothTy += (rawTy - data.smoothTy) * smooth;
    data.smoothFw += (rawFw - data.smoothFw) * smooth;
    const fw = data.smoothFw;

    // Which sprite, and how many art pixels per sprite pixel
    const name = FACE_DECORATIONS[data.decoration % FACE_DECORATIONS.length];
    data.decoSize = pickDecorationSize(fw, data.decoSize);
    const size = DECORATION_SIZES[data.decoSize];
    const spr = PX.sprites[size.small ? name + '_s' : name];
    if (!spr) continue;
    const k = size.k;

    // Snap to whole art pixels only now, after smoothing
    data.hatX = stickyRound(data.hatX, data.smoothCx);
    data.hatY = stickyRound(data.hatY, data.smoothTy - fw * HAT_LINE);

    let frame = 0;
    const anim = DECORATION_ANIM[name];
    if (anim) frame = anim.seq[Math.floor(PX.tick / anim.hold) % anim.seq.length];

    // The sprite's anchor is the point that rests on the forehead
    const dx = data.hatX - Math.round(spr.ax * k);
    const dy = data.hatY - Math.round(spr.ay * k);
    PX.c.drawImage(spr.frames[frame % spr.frames.length].cv, dx, dy, spr.w * k, spr.h * k);
  }
}
drawFaceDecorations.pixel = true;
