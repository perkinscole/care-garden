// ================================================================
// File: facedetection.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Face detection with smile recognition and head
//   decorations. Tracks smile hold durations, then draws everything
//   that sits on top of the live video in pixel art: friendly corner
//   brackets and a smile meter around each face, the countdown badge,
//   a prompt that tells a newcomer what to do ("Smile to grow a
//   flower!"), and (during Hat Time) hats, crowns, horns and other
//   accessories from js/art/hats_art.js, enlarged by whole numbers to
//   fit each head. Everything is clipped to the video rectangle.
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

// ── Drawing inside the video ─────────────────────────

// Everything drawn over the camera picture is clipped to the video
// rectangle, so a hat on someone standing tall cannot poke up into the
// garden and a bracket at the edge cannot spill onto the side panels.
function videoClipBegin() {
  const c = PX.c;
  c.save();
  c.beginPath();
  c.rect(videoArt.x, videoArt.y, videoArt.w, videoArt.h);
  c.clip();
}
function videoClipEnd() { PX.c.restore(); }

// ── Face boxes ───────────────────────────────────────

// Draws pixel corner brackets around each detected face and a small smile
// meter under the chin. White = "we see you", yellow = smiling (the meter
// fills while the smile is held), green = photo taken. Also draws the
// prompt for newcomers, and decides where each countdown badge will go.
function drawBoxes(detections) {
  if (!videoW || !videoH || !videoArt.w) return;
  // Don't draw boxes for stale detections (detection loop stalled)
  const n = (detections && !facesAreStale()) ? detections.length : 0;

  videoClipBegin();
  try {
    // First pass: whole-pixel boxes, remembered per face so the brackets
    // hold still. Faces are kept in faceBoxes for the passes that follow.
    while (faceBoxes.length < n) faceBoxes.push({ x: 0, y: 0, w: 0, h: 0, data: null, det: null });
    for (let f = 0; f < n; f++) {
      const det  = detections[f];
      const r    = faceToArt(det.alignedRect._box, _faceRect);
      const data = det._smileKey ? faceSmileData[det._smileKey] : null;
      const fb = faceBoxes[f];
      fb.det = det; fb.data = data || null;
      if (data) {
        fb.x = data.boxX = stickyRound(data.boxX, r.x);
        fb.y = data.boxY = stickyRound(data.boxY, r.y);
        fb.w = data.boxW = stickyRound(data.boxW, r.w);
        fb.h = data.boxH = stickyRound(data.boxH, r.h);
      } else {
        fb.x = Math.round(r.x); fb.y = Math.round(r.y); fb.w = Math.round(r.w); fb.h = Math.round(r.h);
      }
    }

    drawCameraPrompt(n);
    for (let f = 0; f < n; f++) placeCountdownBadge(f, n);

    for (let f = 0; f < n; f++) {
      const fb = faceBoxes[f], det = fb.det, data = fb.data;
      const x = fb.x, y = fb.y, w = fb.w, bh = fb.h;

      const smiling = det.expressions.happy > 0.75;
      const snapped = !!(data && data.snapped);
      const held    = data ? Math.min(data.frames, SMILE_HOLD_REQUIRED) : 0;

      let col = PAL.white, icon = 'wait', filled = 0;
      if (snapped)      { col = PAL.gr1; icon = 'done';  filled = SMILE_HOLD_REQUIRED; }
      else if (smiling) { col = PAL.ye2; icon = 'smile'; filled = held; }

      // The brackets breathe out by one pixel while a smile is charging up
      const grow = (smiling && !snapped) ? PX.anim(2, 8) : 0;
      drawFaceBrackets(x - grow, y - grow, w + grow * 2, bh + grow * 2, col);
      // The meter sits under the chin, unless the countdown badge has had
      // to go there because there are faces on both sides
      const badgeUnder = data && data.badgeAt === frameCount && data.badgeSide === 2;
      if (!badgeUnder) {
        drawSmileMeter(x + Math.floor(w / 2), Math.min(y + bh + 3, videoArt.y + videoArt.h - 8), w, icon, filled, snapped);
      }
    }
  } finally { videoClipEnd(); }
}
drawBoxes.pixel = true;

// This frame's faces in art pixels (reused every frame, never reallocated)
const faceBoxes = [];

// True if the rectangle (x, y, w, h) touches the box of any face other than
// `self`, grown by `pad` pixels all round.
function touchesOtherFace(x, y, w, h, self, n, pad) {
  for (let i = 0; i < n; i++) {
    if (i === self) continue;
    const o = faceBoxes[i];
    if (x < o.x + o.w + pad && x + w > o.x - pad && y < o.y + o.h + pad && y + h > o.y - pad) return true;
  }
  return false;
}

// Decides where the countdown badge of face `f` goes and remembers it on
// the face (badgeX, badgeY, badgeSide) for drawCountdown, which runs later
// in the frame. Sides, in order of preference: 0 beside the right cheek,
// 1 beside the left cheek, 2 under the chin in place of the smile meter.
// A side is no good if the badge would leave the video or sit on top of a
// neighbour, so two friends shoulder to shoulder each keep their own badge.
function placeCountdownBadge(f, n) {
  const fb = faceBoxes[f], data = fb.data;
  if (!data) return;
  data.badgeAt = -1;
  if (data.frames <= 0 || data.snapped) { data.badgeSide = undefined; return; }
  const v = videoArt, R = 7;
  const midY = Math.max(v.y + R + 1, Math.min(v.y + v.h - R - 2, fb.y + Math.floor(fb.h / 2)));
  let side = -1, bx = 0, by = 0;
  // Try the side used last frame first so the badge does not hop about
  for (let t = -1; t < 3 && side < 0; t++) {
    const s = t < 0 ? data.badgeSide : t;
    if (s === undefined || (t >= 0 && s === data.badgeSide)) continue;
    if (s === 0)      { bx = fb.x + fb.w + 9; by = midY; }
    else if (s === 1) { bx = fb.x - 10;       by = midY; }
    else {
      bx = Math.max(v.x + R + 1, Math.min(v.x + v.w - R - 2, fb.x + Math.floor(fb.w / 2)));
      by = Math.min(fb.y + fb.h + 3 + R, v.y + v.h - R - 2);
    }
    const inside = bx - R >= v.x + 1 && bx + R <= v.x + v.w - 2;
    if (s === 2 || (inside && !touchesOtherFace(bx - R, by - R, R * 2 + 1, R * 2 + 1, f, n, 2))) side = s;
  }
  data.badgeSide = side;
  data.badgeX = bx;
  data.badgeY = by;
  data.badgeAt = frameCount;
}

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
// (a tick once the smile has been held long enough). Where it goes was
// decided by placeCountdownBadge() when the brackets were drawn.
function drawCountdown() {
  if (!videoW || !videoH || !videoArt.w) return;
  if (facesAreStale()) return;

  for (let i = 0; i < detections.length; i++) {
    const key = detections[i]._smileKey;
    if (!key || !faceSmileData[key]) continue;
    const data = faceSmileData[key];
    const frames = data.frames;
    if (frames <= 0 || data.snapped) continue;
    if (data.badgeAt !== frameCount) continue;      // not placed this frame (no video yet)

    const progress    = min(frames / SMILE_HOLD_REQUIRED, 1.0);
    const secondsLeft = ceil((SMILE_HOLD_REQUIRED - frames));
    const bx = data.badgeX, by = data.badgeY;

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

// ── Prompt for newcomers ─────────────────────────────

// A small sign inside the video that says what to do next, so that someone
// walking up understands the garden within a couple of seconds:
//   nobody in view            "Step up and smile / to grow a flower!"
//   a face, not smiling       "Smile to grow / a flower!"
//   a smile being held        "Hold that smile..."
//   photo just taken          "Planted! Look up!"
// Each state lists its wordings from best to shortest as [line 1, line 2];
// the first that fits the video and stays clear of every face is used.
const PROMPT_TEXTS = {
  none: [['Step up and smile', 'to grow a flower!'], ['Smile to grow', 'a flower!'], ['Smile for a flower!', ''], ['Smile!', '']],
  seen: [['Smile to grow', 'a flower!'], ['Smile for a flower!', ''], ['Big smile!', ''], ['Smile!', '']],
  hold: [['Hold that smile...', ''], ['Hold it...', '']],
  done: [['Planted! Look up!', ''], ['Planted!', '']],
};
const PROMPT_COLORS = { none: PAL.white, seen: PAL.white, hold: PAL.ye2, done: PAL.gr1 };
const PROMPT_TEXT_OPTS = {
  none: { scale: 2, color: PAL.white }, seen: { scale: 2, color: PAL.white },
  hold: { scale: 2, color: PAL.ye2 },   done: { scale: 2, color: PAL.gr1 },
};
// What is showing now. A new state has to last a few frames before the
// sign changes, so it does not flicker when a smile comes and goes.
const promptNow = { state: 'none', want: 'none', wantSince: 0, choice: -1, top: false, lastSnap: 0, snapAt: -1e9 };
const _promptRect = { x: 0, y: 0, w: 0, h: 0 };

// Which of the four states the people in view are in
function cameraPromptState(n) {
  let holding = false, snapped = false;
  for (let f = 0; f < n; f++) {
    const fb = faceBoxes[f], data = fb.data;
    if (!data) continue;
    if (data.snapped) snapped = true;
    else if (data.frames > 0 && fb.det.expressions.happy > 0.75) holding = true;
  }
  // "Planted!" stays up for a few seconds after a photo, and for as long as
  // the people who were photographed keep beaming at the camera
  if (lastSnapTime !== promptNow.lastSnap) {
    promptNow.lastSnap = lastSnapTime;
    if (snapped) promptNow.snapAt = millis();
  }
  if (holding) return 'hold';
  if (snapped || (n > 0 && millis() - promptNow.snapAt < 2500)) return 'done';
  return n > 0 ? 'seen' : 'none';
}

// Works out the rectangle of one wording at the bottom or top of the video
// into _promptRect; returns false if the video is too narrow for it.
function promptRect(lines, top) {
  const v = videoArt;
  const two = !!lines[1];
  const tw = Math.max(PX.measure(lines[0], 'small', 2), two ? PX.measure(lines[1], 'small', 2) : 0) - 2;
  const w = tw + 14 + 4 + 8;                     // icon, gap, padding
  const h = two ? 31 : 18;
  if (w > v.w - 4 || h > v.h * 0.4) return false;
  _promptRect.w = w; _promptRect.h = h;
  _promptRect.x = v.x + Math.floor((v.w - w) / 2);
  _promptRect.y = top ? v.y + 3 : v.y + v.h - h - 3;
  return true;
}

// True if the sign would cover part of a face, its hat or its smile meter
function promptHitsFace(n) {
  const r = _promptRect;
  for (let f = 0; f < n; f++) {
    const fb = faceBoxes[f];
    const above = (hatTimeActive && decorationsEnabled) ? Math.round(fb.w * 0.9) : Math.round(fb.w * 0.25);
    // Below the chin: the smile meter, or the countdown badge when it sits there
    const below = (fb.data && fb.data.badgeSide === 2) ? 20 : 13;
    if (r.x < fb.x + fb.w + 4 && r.x + r.w > fb.x - 4 &&
        r.y < fb.y + fb.h + below && r.y + r.h > fb.y - above) return true;
  }
  return false;
}

// Draws the sign. `n` is the number of faces in faceBoxes this frame.
function drawCameraPrompt(n) {
  const P = promptNow;
  const want = cameraPromptState(n);
  if (want !== P.want) { P.want = want; P.wantSince = frameCount; }
  if (P.state !== P.want && (frameCount - P.wantSince >= 6 || P.want === 'done')) { P.state = P.want; P.choice = -1; }
  const texts = PROMPT_TEXTS[P.state];

  // Keep the wording and place used last frame while they still work;
  // otherwise look again: bottom then top for each wording in turn.
  let ok = P.choice >= 0 && P.choice < texts.length && promptRect(texts[P.choice], P.top) && !promptHitsFace(n);
  if (!ok) {
    for (let c = 0; c < texts.length && !ok; c++) {
      for (let t = 0; t < 2 && !ok; t++) {
        if (promptRect(texts[c], t === 1) && !promptHitsFace(n)) { ok = true; P.choice = c; P.top = t === 1; }
      }
    }
  }
  if (!ok) {
    // Faces everywhere: the shortest wording along the bottom edge
    P.choice = texts.length - 1; P.top = false;
    if (!promptRect(texts[P.choice], false)) return;
  }

  const r = _promptRect, lines = texts[P.choice];
  const col = PROMPT_COLORS[P.state];
  PX.panel(r.x, r.y, r.w, r.h, PAL.sk8, PAL.ink, 2);
  PX.rect(r.x + 2, r.y + 1, r.w - 4, 1, PAL.sk6);          // lit top edge

  // A double-size face that shows what to do: it breaks into a smile every
  // second while waiting, beams while a smile is held, and turns into a
  // flower once the photo is taken
  let icon = 'smile';
  if (P.state === 'done') icon = 'done';
  else if (P.state !== 'hold') icon = PX.anim(2, 30) ? 'smile' : 'wait';
  const iy = r.y + Math.floor((r.h - 14) / 2) - ((P.state === 'hold' && PX.anim(2, 10)) ? 1 : 0);
  const c = PX.c;
  c.save();
  c.translate(r.x + 4, iy);
  c.scale(2, 2);
  PX.spr('smile_icon', 0, 0, SMILE_ICON_FRAMES[icon]);
  c.restore();

  const tx = r.x + 4 + 14 + 4;
  const opts = PROMPT_TEXT_OPTS[P.state];
  if (lines[1]) {
    PX.text(lines[0], tx, r.y + 1, opts);
    PX.text(lines[1], tx, r.y + 14, opts);
  } else {
    PX.text(lines[0], tx, r.y + 0, opts);
  }
}

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

  // Hats are clipped to the video: one worn by someone at the top of the
  // picture is cut off at the edge instead of poking up into the garden
  videoClipBegin();
  try { drawDecorationsClipped(detections); } finally { videoClipEnd(); }
}
drawFaceDecorations.pixel = true;

function drawDecorationsClipped(detections) {
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
