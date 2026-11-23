// ================================================================
// File: ui.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: UI systems for the CARE Garden, drawn as pixel art on the
//   PX grid: smile stats persistence, the CARE score dashboard panel,
//   the smile gallery of polaroids, the "I SPY" character cards,
//   speech bubbles, and confetti celebrations with a milestone banner.
//   The sprites used here are defined in js/art/ui_art.js.
// ================================================================

// ── UI: Speech Bubbles, Panels, Gallery, Confetti ────

// ── Smile Stats (localStorage) ──────────────────────

// How long to wait for the server's copy of the stats before giving up (ms)
const STATS_LOAD_TIMEOUT = 5000;

// Startup load state. The server is asked for stats.json in the background,
// so these remember what happened while the answer was on its way.
let statsLoading = false;          // true until the server answers or times out
let statsLoadTimer = null;         // the timeout that gives up on a slow server
let statsAddedWhileLoading = 0;    // smiles counted before the server answered
let statsHadLocal = false;         // localStorage had numbers to show straight away
let statsDayKey = '';              // the day the live numbers were worked out for
let statsCache = null;             // last known stats, in case localStorage is unavailable

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

// Applies parsed stats data to live state variables
function applyStatsData(data) {
  const today = getTodayKey();
  statsDayKey = today;
  smileStats.today = (data.dailyCounts && data.dailyCounts[today]) || 0;
  smileStats.week = 0;
  if (data.dailyCounts) {
    for (let key of getWeekDays()) {
      smileStats.week += (data.dailyCounts[key] || 0);
    }
  }
  smileStats.record = data.record || 0;
  smileStats.recordDate = data.recordDate || '';
  careScore = smileStats.today;
  for (let m of CONFETTI_MILESTONES) {
    if (careScore >= m) lastMilestoneCelebrated = m;
  }
}

// Reads the saved stats from localStorage; null if there are none (or they are unreadable)
function readLocalStats() {
  try {
    const raw = localStorage.getItem('careGardenStats');
    const data = raw ? JSON.parse(raw) : null;
    return (data && typeof data === 'object') ? data : null;
  } catch (e) { return null; }
}

// Writes the stats to localStorage (and remembers them in case that fails)
function writeLocalStats(data) {
  statsCache = data;
  try { localStorage.setItem('careGardenStats', JSON.stringify(data)); } catch (e) { /* ignore */ }
}

// Saves the stats to the server (stats.json on disk)
function postStats(data) {
  fetch('/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(() => { /* server save failed, localStorage still has it */ });
}

// Adds new smiles to a stats object: today's count, the record, and pruning old days
function addSmilesToData(data, added) {
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
  return data;
}

// The ?score= test parameter sets the score by hand; a late answer from the
// server must not overwrite it.
function statsSetByHand() {
  return typeof DEBUG !== 'undefined' && !!DEBUG.q && DEBUG.q.has('score');
}

// Loads smile statistics. localStorage is shown immediately, then the server's
// copy (stats.json) replaces it as soon as it arrives. The request runs in the
// background so a slow server can never freeze the garden at startup.
function loadSmileStats() {
  const local = readLocalStats();
  statsHadLocal = !!local;
  if (local) { statsCache = local; applyStatsData(local); }
  else statsDayKey = getTodayKey();

  statsLoading = true;
  statsAddedWhileLoading = 0;
  const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  statsLoadTimer = setTimeout(() => {
    if (ctrl) ctrl.abort();
    finishStatsLoad(null);
  }, STATS_LOAD_TIMEOUT);

  try {
    fetch('/api/stats', { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(res => (res.ok ? res.json() : null))
      .then(data => finishStatsLoad(data && data.dailyCounts ? data : null))
      .catch(() => finishStatsLoad(null));   // server unavailable, keep localStorage
  } catch (e) { finishStatsLoad(null); }
}

// Called once when the server has answered (data) or cannot be reached (null).
// Smiles counted while waiting are added on top of the server's numbers so
// none are lost, and only then is anything written back to the server.
function finishStatsLoad(serverData) {
  if (!statsLoading) return;
  statsLoading = false;
  clearTimeout(statsLoadTimer);
  const added = statsAddedWhileLoading;
  statsAddedWhileLoading = 0;

  if (serverData) {
    if (added > 0) addSmilesToData(serverData, added);
    writeLocalStats(serverData);
    if (!statsSetByHand()) applyStatsData(serverData);
    if (added > 0) postStats(serverData);
  } else if (added > 0) {
    // No server copy to merge with: send what localStorage has, as before
    const local = readLocalStats() || statsCache;
    if (local) postStats(local);
  }
}

// When the garden runs past midnight the day's numbers start again: today's
// count returns to zero and the milestones can be celebrated afresh.
// Returns true if the day changed.
function checkStatsDayRollover() {
  const today = getTodayKey();
  if (!statsDayKey || today === statsDayKey) return false;
  lastMilestoneCelebrated = -1;
  applyStatsData(readLocalStats() || statsCache || {});
  return true;
}

// Persists new smile counts to localStorage, updates records, and prunes old entries
function saveSmileStats(added) {
  try {
    const newDay = checkStatsDayRollover();
    const data = readLocalStats() || statsCache || { dailyCounts: {}, record: 0, recordDate: '' };
    addSmilesToData(data, added);
    writeLocalStats(data);

    // Also save to server (stats.json on disk). While the startup load is
    // still waiting, hold back: finishStatsLoad() merges and sends instead,
    // so stale local numbers never overwrite the server's.
    if (statsLoading) statsAddedWhileLoading += added;
    else postStats(data);

    // Update live stats
    const today = getTodayKey();
    smileStats.today = data.dailyCounts[today];
    smileStats.week = 0;
    for (let key of getWeekDays()) {
      smileStats.week += (data.dailyCounts[key] || 0);
    }
    smileStats.record = data.record;
    smileStats.recordDate = data.recordDate;
    if (newDay) careScore = smileStats.today;
  } catch (e) { /* ignore */ }
}

// ── Shared pixel helpers ─────────────────────────────

const UI_BG   = PAL.sk8;    // inside of the dashboard panels
const UI_RULE = PAL.sk6;    // dotted rules and idle dots on that background

// Layouts are worked out once and remembered. They depend on the bitmap
// fonts, which arrive a moment after startup, so the caches are emptied
// whenever a font is swapped in.
let uiFontSmall = null, uiFontBold = null;
let uiCareLayout = null;
const uiCardLayouts = {};

function uiSyncFonts() {
  if (PX.fonts.small === uiFontSmall && PX.fonts.bold === uiFontBold) return;
  uiFontSmall = PX.fonts.small;
  uiFontBold  = PX.fonts.bold;
  uiCareLayout = null;
  for (const k in uiCardLayouts) delete uiCardLayouts[k];
}

// Width of the visible pixels of one line of text (PX.measure also counts
// the blank column after the last letter).
function uiTextW(str, font, scale = 1) {
  return Math.max(0, PX.measure(str, font, scale) - scale);
}

// Draws one line of text with the TOP OF ITS CAPITALS at y, so text can be
// placed to the pixel. opts: { font, scale, color, shadow, align }.
// Capitals are 7px tall in 'bold' and 5px tall in 'small' (times scale).
function uiText(str, x, y, opts) {
  const font = opts.font || 'small', s = opts.scale || 1;
  let lx = Math.round(x);
  if (opts.align === 'center') lx -= Math.floor(uiTextW(str, font, s) / 2);
  else if (opts.align === 'right') lx -= uiTextW(str, font, s);
  const ty = Math.round(y) - (font === 'bold' ? 0 : 2) * s;   // blank rows above the capitals
  if (opts.shadow) PX.text(str, lx + s, ty + s, { font, scale: s, color: opts.shadow });
  PX.text(str, lx, ty, { font, scale: s, color: opts.color });
}

// Runs fn with drawing clipped to an art-pixel rectangle.
function uiClip(x, y, w, h, fn) {
  const c = PX.c;
  c.save();
  c.beginPath();
  c.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  c.clip();
  try { fn(); } finally { c.restore(); }
}

// Wooden picture-frame panel, the look shared by both dashboard panels.
// The moulding is lit from the top left. Returns the rectangle inside it.
function drawHudFrame(x, y, w, h, fill) {
  PX.rect(x, y, w, h, PAL.ink);
  if (w < 24 || h < 24) {                 // too small for a moulding: plain box
    PX.rect(x + 1, y + 1, w - 2, h - 2, fill);
    return { x: x + 1, y: y + 1, w: w - 2, h: h - 2 };
  }
  PX.rect(x + 1, y + 1, w - 2, h - 2, PAL.wo2);
  PX.rect(x + 1, y + 1, w - 2, 1, PAL.wo1);            // outer edge: lit top and left
  PX.rect(x + 1, y + 1, 1, h - 2, PAL.wo1);
  PX.rect(x + 1, y + h - 2, w - 2, 1, PAL.wo4);        // shaded bottom and right
  PX.rect(x + w - 2, y + 1, 1, h - 2, PAL.wo4);
  PX.rect(x + 3, y + 3, w - 6, h - 6, PAL.wo1);        // inner edge: the bevel reversed
  PX.rect(x + 3, y + 3, w - 6, 1, PAL.wo3);
  PX.rect(x + 3, y + 3, 1, h - 6, PAL.wo3);
  PX.rect(x + 4, y + 4, w - 8, h - 8, PAL.ink);
  PX.rect(x + 5, y + 5, w - 10, h - 10, fill);
  return { x: x + 5, y: y + 5, w: w - 10, h: h - 10 };
}

// One vine creeping along a frame edge from (x0, y0). `dir` is the way it
// grows (+1 / -1) and `inward` the side its leaves hang on.
const UI_VINE_WAVE = [0, 0, 1, 1, 1, 0, 0, -1, -1, -1];
function drawVine(x0, y0, len, horizontal, dir, inward) {
  let vx = x0, vy = y0;
  for (let i = 0; i < len; i++) {
    const wv = UI_VINE_WAVE[i % UI_VINE_WAVE.length];
    vx = horizontal ? x0 + i * dir : x0 + wv;
    vy = horizontal ? y0 + wv : y0 + i * dir;
    PX.px(vx, vy, i % 5 === 4 ? PAL.gr4 : PAL.gr3);
    if (i % 7 === 4 && i < len - 3) {
      if (horizontal) {
        if (inward > 0) PX.spr('ui_leaf', vx - 1, vy + 1, { frame: 'down' });
        else            PX.spr('ui_leaf', vx - 1, vy - 3, { frame: 'up' });
      } else {
        if (inward > 0) PX.spr('ui_leaf', vx + 1, vy - 1, { frame: 'out' });
        else            PX.spr('ui_leaf', vx, vy - 1, { frame: 'out', flip: true });
      }
    }
  }
  PX.px(vx, vy, PAL.gr2);                 // a fresh green tip
}

// Vines and flowers growing over the corners of a framed panel. `corners` is
// a set of bits: 1 top left, 2 top right, 4 bottom right, 8 bottom left.
const UI_FLOWER_PINK   = { p: PAL.pi2, s: PAL.pi3 };
const UI_FLOWER_YELLOW = { p: PAL.ye1, s: PAL.ye3, y: PAL.or2, c: PAL.or3 };
const UI_FLOWER_BLUE   = { p: PAL.bl1, s: PAL.bl2 };
const UI_FLOWER_WHITE  = { p: PAL.white, s: PAL.g2 };
const UI_FLOWER_PURPLE = { p: PAL.pu1, s: PAL.pu2 };
const UI_FLOWER_RED    = { p: PAL.re1, s: PAL.re2 };
function drawFrameVines(x, y, w, h, palA, palB, corners) {
  if (w < 60 || h < 60) return;
  const lenH = Math.min(30, Math.floor(w / 5)), lenV = Math.min(20, Math.floor(h / 5));
  const far = Math.floor(lenH * 0.6);
  if (corners & 1) {                       // top left
    drawVine(x + 3, y + 2, lenH, true, 1, 1);
    drawVine(x + 2, y + 3, lenV, false, 1, 1);
    PX.spr('ui_flower', x + 4, y + 4, { pal: palA });
    PX.spr('ui_bud', x + 3 + far, y + 2, { pal: palB });
  }
  if (corners & 2) {                       // top right
    drawVine(x + w - 4, y + 2, lenH, true, -1, 1);
    drawVine(x + w - 3, y + 3, lenV, false, 1, -1);
    PX.spr('ui_flower', x + w - 5, y + 4, { pal: palA });
    PX.spr('ui_bud', x + w - 4 - far, y + 2, { pal: palB });
  }
  if (corners & 4) {                       // bottom right
    drawVine(x + w - 4, y + h - 3, lenH, true, -1, -1);
    drawVine(x + w - 3, y + h - 4, lenV, false, -1, -1);
    PX.spr('ui_flower', x + w - 5, y + h - 5, { pal: palB });
    PX.spr('ui_bud', x + w - 4 - far, y + h - 3, { pal: palA });
  }
  if (corners & 8) {                       // bottom left
    drawVine(x + 3, y + h - 3, lenH, true, 1, -1);
    drawVine(x + 2, y + h - 4, lenV, false, -1, 1);
    PX.spr('ui_flower', x + 4, y + h - 5, { pal: palB });
    PX.spr('ui_bud', x + 3 + far, y + h - 3, { pal: palA });
  }
}

// Panel heading with a little flower either side and a dotted rule under it.
// `choices` is a list of [text, font] from widest to narrowest; the first
// that fits is used. The rule sits 12px below the top of the panel inside.
function drawPanelTitle(I, choices, color, palA, palB) {
  const cx = I.x + Math.floor(I.w / 2);
  for (const [str, font] of choices) {
    const w = uiTextW(str, font);
    if (w > I.w - 6) continue;
    const capH = font === 'bold' ? 7 : 5;
    uiText(str, cx, I.y + 2 + Math.floor((7 - capH) / 2), { font, color, align: 'center', shadow: PAL.sk7 });
    if (w + 2 * 13 <= I.w - 4) {
      const half = Math.floor(w / 2);
      PX.spr('ui_flower', cx - half - 8, I.y + 5, { pal: palA });
      PX.spr('ui_flower', cx - half + w + 7, I.y + 5, { pal: palB });
    }
    break;
  }
  drawDottedRule(I.x + 4, I.y + 12, I.w - 8, UI_RULE);
}

function drawDottedRule(x, y, w, col) {
  for (let i = 0; i + 2 <= w; i += 4) PX.rect(x + i, y, 2, 1, col);
}

// ── SpeechBubble ─────────────────────────────────────

const BUBBLE_WRAP_W = 110;   // text wraps at this many art pixels
const BUBBLE_LINE_H = 7;
const BUBBLE_TAIL   = 3;     // rows of tail below (or above) the bubble

// Floating speech bubble that fades in, drifts upward, then fades out above a character.
// getPos() returns art pixels { x, y } for the point just above the speaker's
// head: the tip of the bubble's tail starts there.
class SpeechBubble {
  static pixel = true;   // drawn in art pixels (see js/pixel.js)

  constructor(text, getPos) {
    this.text   = text;
    this.getPos = getPos;
    this.alpha  = 0;
    this.age    = 0;
    this.duration = 180;
    this.w      = 0;      // size in art pixels, measured on first draw
    this.h      = 0;
    this.floatY = 0;
    this.lines  = null;
    this.cv     = null;   // the bubble, painted once so it can fade as one piece
    this.cvKey  = '';
  }

  // Advances age, updates float offset and alpha transparency; returns false when expired
  update() {
    this.age++;
    this.floatY -= 0.1;   // art pixels: the same drift as before (0.3 screen pixels)
    if (this.age < 20) {
      this.alpha = map(this.age, 0, 20, 0, 255);
    } else if (this.age > this.duration - 30) {
      this.alpha = map(this.age, this.duration - 30, this.duration, 255, 0);
    } else {
      this.alpha = 255;
    }
    return this.age < this.duration;
  }

  // Wraps the text and sizes the bubble around it
  layout() {
    if (this.lines && this.font === PX.fonts.small) return;
    this.font = PX.fonts.small;
    this.lines = PX.wrap(this.text, BUBBLE_WRAP_W, 'small');
    let tw = 0;
    for (const ln of this.lines) tw = Math.max(tw, uiTextW(ln, 'small'));
    this.w = Math.max(tw + 8, 13);
    this.h = this.lines.length * BUBBLE_LINE_H + 5;
    this.cvKey = '';
  }

  // Paints the bubble into its own small canvas: white panel, ink border and
  // a stepped tail whose tip is `tailX` pixels from the left edge. It is
  // only repainted when the tail has to move or flip.
  paint(tailX, below) {
    const key = tailX + (below ? 'b' : 'a');
    if (key === this.cvKey) return;
    this.cvKey = key;
    const W = this.w, H = this.h, T = BUBBLE_TAIL;
    if (!this.cv) this.cv = document.createElement('canvas');
    this.cv.width = W;
    this.cv.height = H + T;
    const top = below ? T : 0;
    PX.withTarget(this.cv.getContext('2d'), () => {
      PX.panel(0, top, W, H, PAL.white, PAL.ink, 2);
      PX.rect(2, top + H - 2, W - 4, 1, PAL.g1);          // soft shade along the bottom
      for (let i = 0; i < this.lines.length; i++) {
        uiText(this.lines[i], Math.floor(W / 2), top + 3 + i * BUBBLE_LINE_H,
          { color: PAL.ink, align: 'center' });
      }
      // The tail: opens through the border and narrows to a one-pixel tip
      const edge = below ? top : top + H - 1;
      const step = below ? -1 : 1;
      PX.rect(tailX - 2, edge, 5, 1, PAL.white);
      PX.rect(tailX - 2, edge + step, 5, 1, PAL.ink);
      PX.rect(tailX - 1, edge + step, 3, 1, PAL.white);
      PX.rect(tailX - 1, edge + step * 2, 3, 1, PAL.ink);
      PX.px(tailX, edge + step * 2, PAL.white);
      PX.px(tailX, edge + step * 3, PAL.ink);
    });
  }

  // Renders the bubble with its tail tip at the speaker's position, kept on screen
  draw() {
    const pos = this.getPos();
    if (!pos) return;
    this.layout();
    const W = this.w, H = this.h, T = BUBBLE_TAIL;
    const tipX = Math.round(pos.x), baseY = Math.round(pos.y);
    const rise = Math.round(-this.floatY);

    // Normally the bubble sits above the point; if that would leave the top
    // of the screen it hangs below instead, with the tail pointing up.
    const below = baseY - T - H < 1;
    let top;
    if (below) top = baseY + T + rise;
    else       top = Math.max(1, baseY - T - H - rise);

    const left  = Math.max(1, Math.min(PX.W - 1 - W, tipX - Math.floor(W / 2)));
    const tailX = Math.max(4, Math.min(W - 5, tipX - left));
    this.paint(tailX, below);

    const c = PX.c, prev = c.globalAlpha;
    c.globalAlpha = prev * constrain(this.alpha / 255, 0, 1);
    c.drawImage(this.cv, left, below ? top - T : top);
    c.globalAlpha = prev;
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

// Cycles between the gallery panel and character cards on a timed rotation.
// The panel fills the dashboard to the right of the webcam (`ox` is unused
// now that the layout comes from the videoArt rectangle).
function drawSmileGallery(ox) {
  if (millis() - panelModeTimer > PANEL_CYCLE_DURATION) {
    panelCycleIdx = (panelCycleIdx + 1) % panelCycle.length;
    panelMode     = panelCycle[panelCycleIdx];
    panelModeTimer = millis();
  }
  const x = videoArt.x + videoArt.w;
  const w = PX.W - x, y = PX.H, h = PX.SH - PX.H;
  if (w < 12 || h < 12) return;
  uiSyncFonts();
  if (panelMode === 'gallery') {
    drawGalleryPanel(x, y, w, h);
  } else {
    const card = CHARACTER_CARDS.find(c => c.id === panelMode);
    if (card) drawCharacterCard(x, y, w, h, card);
  }
}
drawSmileGallery.pixel = true;

// Ways of arranging small polaroids as [columns, rows], tried in this order;
// the one that gives the biggest photos wins. Shapes too small to hold
// every photo are only considered when the others would be tiny.
const GALLERY_GRIDS = [[3, 2], [6, 1], [2, 3], [1, 6], [5, 1], [1, 5], [2, 2], [2, 1], [1, 2], [1, 1]];
const GALLERY_TITLES = [['SMILE ARCHIVE', 'bold'], ['SMILES', 'bold'], ['SMILE ARCHIVE', 'small'], ['SMILES', 'small']];
// The little flower drawn on the white strip of each polaroid
const GALLERY_MARKS = [UI_FLOWER_PINK, UI_FLOWER_BLUE, UI_FLOWER_YELLOW, UI_FLOWER_PURPLE, UI_FLOWER_RED, UI_FLOWER_BLUE];
const GALLERY_EMPTY_PAL = { o: PAL.sk7, p: UI_BG, s: UI_BG, y: PAL.sk7, c: PAL.sk7 };
const galleryPick = { cols: 1, rows: 1, p: 0 };   // result of pickGalleryGrid(), reused every frame

// A small polaroid is its photo (p pixels square) plus a 3px border and a
// 5px strip underneath: p+6 wide and p+11 tall. 3px are kept free above
// for the tape and for hanging them a little unevenly.
function pickGalleryGrid(w, h, need) {
  let cols = 1, rows = 1, p = 0;
  for (const [gc, gr] of GALLERY_GRIDS) {
    if (gc * gr < need && p >= 12) continue;           // would drop photos for no good reason
    if (gc * gr >= need + Math.min(gc, gr) && gc * gr > 1) continue;   // a whole row or column spare
    const size = Math.floor(Math.min((w - 3 * (gc - 1)) / gc - 6, (h - 3 - 3 * (gr - 1)) / gr - 11));
    if (size > p) { p = size; cols = gc; rows = gr; }
  }
  galleryPick.cols = cols; galleryPick.rows = rows; galleryPick.p = Math.min(p, 44);
  return galleryPick;
}

// Draws the smile photo gallery: up to 6 recent smiles as polaroids taped to the panel
function drawGalleryPanel(x, y, w, h) {
  const I = drawHudFrame(x, y, w, h, UI_BG);
  drawPanelTitle(I, GALLERY_TITLES, PAL.cream, UI_FLOWER_YELLOW, UI_FLOWER_PINK);
  drawFrameVines(x, y, w, h, UI_FLOWER_BLUE, UI_FLOWER_PINK, 5);

  const top = I.y + 15, bottom = I.y + I.h - 10;
  const gx0 = I.x + 2, W = I.w - 4, H = bottom - top;

  if (smileGallery.length === 0) {
    drawGalleryEmpty(gx0, top, W, H);
  } else if (W >= 150 && H >= 60) {
    // Roomy panel: the newest smile gets a big polaroid of its own on the
    // left and the five before it are pinned up beside it.
    const lip = 11;
    const pBig = Math.min(H - 3 - lip - 7, Math.floor(W * 0.36));
    const fwBig = pBig + 6, fhBig = pBig + 4 + lip;
    const gap = 9;
    const g = pickGalleryGrid(W - fwBig - gap, H, MAX_GALLERY - 1);
    const fw = g.p + 6;
    const gx = Math.max(3, Math.min(8, Math.floor((W - fwBig - gap - g.cols * fw) / g.cols)));
    const gridW = g.cols * fw + (g.cols - 1) * gx;
    const bx = gx0 + Math.floor((W - (fwBig + gap + gridW)) / 2);
    const by = top + 3 + Math.floor((H - 3 - fhBig) / 2);
    drawPolaroid(bx, by, pBig, smileGallery[0], GALLERY_MARKS[0], lip,
      uiTextW('Newest smile!', 'small') <= pBig ? 'Newest smile!' : '');
    drawGalleryGrid(bx + fwBig + gap, top, gridW, H, g, gx, 1);
  } else {
    const g = pickGalleryGrid(W, H, MAX_GALLERY);
    const fw = g.p + 6;
    const gx = Math.max(3, Math.min(14, Math.floor((W - g.cols * fw) / (g.cols + 1))));
    const gridW = g.cols * fw + (g.cols - 1) * gx;
    drawGalleryGrid(gx0 + Math.floor((W - gridW) / 2), top, gridW, H, g, gx, 0);
  }
  drawCycleIndicator(I, UI_RULE, PAL.sk7);
}

// Draws the small polaroids for smileGallery[first...] in the chosen grid,
// with its left edge at x and centred in the height h.
function drawGalleryGrid(x, y, w, h, g, gx, first) {
  const p = g.p, cols = g.cols, rows = g.rows;
  if (p < 4) return;
  const fw = p + 6, fh = p + 11;
  const gy = Math.max(3, Math.min(8, Math.floor((h - 3 - rows * fh) / (rows + 1))));
  const y0 = y + 3 + Math.floor((h - 3 - (rows * fh + (rows - 1) * gy)) / 2);
  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const px = x + col * (fw + gx);
    const py = y0 + row * (fh + gy) + ((col + row) % 2 === 0 ? 0 : 1);   // hung a little unevenly
    const n = first + i;
    if (n < smileGallery.length && n < MAX_GALLERY) {
      drawPolaroid(px, py, p, smileGallery[n], GALLERY_MARKS[n % GALLERY_MARKS.length], 6, '');
    } else if (n < MAX_GALLERY) {
      // An empty place waiting for the next smile
      PX.box(px, py, fw, fh, PAL.sk7);
      PX.spr('ui_flower', px + Math.floor(fw / 2), py + Math.floor(fh / 2), { pal: GALLERY_EMPTY_PAL });
    } else if (fh >= 18) {
      // A spare corner of the grid: something growing in it
      PX.spr('ui_sprout', px + Math.floor(fw / 2), py + Math.floor(fh / 2) + 7,
        { frame: PX.anim(2, 40), pal: UI_FLOWER_PINK });
    }
  }
}

// One smile photo in a white polaroid frame held up by a strip of tape.
// The photo itself is drawn smooth at full screen resolution. `lip` is the
// height of the white strip under the photo, which can carry a caption.
function drawPolaroid(x, y, p, photo, markPal, lip, caption) {
  const fw = p + 6, fh = p + 4 + lip;
  PX.alpha(constrain(photo.alpha / 255, 0, 1), () => {
    PX.rect(x + fw, y + 2, 1, fh - 1, PAL.black);          // drop shadow, right and below
    PX.rect(x + 2, y + fh, fw - 2, 1, PAL.black);
    PX.box(x, y, fw, fh, PAL.ink);
    PX.rect(x + 1, y + 1, fw - 2, 2, PAL.white);           // the white card, around the photo
    PX.rect(x + 1, y + 3, 2, p, PAL.white);
    PX.rect(x + fw - 3, y + 3, 2, p, PAL.white);
    PX.rect(x + 1, y + 3 + p, fw - 2, lip - 1, PAL.white);
    PX.rect(x + 1, y + fh - 2, fw - 2, 1, PAL.g1);

    const img = photo.img;
    const src = img && (img.elt || img.canvas || img);
    if (src && src.width && src.height) {
      const side = Math.min(src.width, src.height);
      const c = PX.c;
      c.imageSmoothingEnabled = true;
      c.drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, x + 3, y + 3, p, p);
      c.imageSmoothingEnabled = false;
    } else {
      PX.rect(x + 3, y + 3, p, p, PAL.g2);
    }
    const cx = x + Math.floor(fw / 2);
    if (caption) uiText(caption, cx, y + 3 + p + Math.floor((lip - 6) / 2), { color: PAL.g4, align: 'center' });
    else if (p >= 12) PX.spr('ui_bud', cx, y + p + 5, { pal: { p: markPal.s, y: PAL.ye2 } });
    PX.spr('ui_tape', cx, y);
  });
}

// Shown until the first smile of the day: a camera and a friendly prompt
function drawGalleryEmpty(x, y, w, h) {
  const cx = x + Math.floor(w / 2);
  const big = uiTextW('Smile and hold!', 'small', 2) <= w - 4 ? 2 : 1;
  const lines = PX.wrap('Your photo grows a flower.', w - 4, 'small');
  const showHint = uiTextW('Smile and hold!', 'small') <= w;
  const textH = 5 * big + 5 + lines.length * 7 - 2;
  const camera = w >= 28 && h >= textH + 26;
  let ty = y + Math.floor((h - textH - (camera ? 24 : 0)) / 2);
  if (camera) {
    const flash = PX.tick % 150 < 8 ? 1 : 0;          // the flash pops every few seconds
    PX.spr('ui_camera', cx, ty + 19, { frame: flash });
    ty += 24;
  }
  if (!showHint || h < 5) return;
  uiText('Smile and hold!', cx, ty, { scale: big, color: PAL.ye1, align: 'center', shadow: PAL.sk7 });
  ty += 5 * big + 5;
  for (let i = 0; i < lines.length; i++) {
    if (ty + 5 > y + h) break;
    uiText(lines[i], cx, ty, { color: PAL.sk2, align: 'center' });
    ty += 7;
  }
}

// ── I SPY character cards ────────────────────────────

// Card art is drawn by other modules through CARD_ART[id](x, y, tick). To
// frame it nicely the card needs to know how big each drawing really is, so
// the first time a card is shown its art is painted into a small hidden
// canvas (made once) and measured. Extents are in art pixels relative to the feet.
const CARD_PROBE = { w: 260, h: 170, fx: 130, fy: 140 };
let cardProbeCtx = null;
const cardArtBoxes = {};
const CARD_PLACEHOLDER_BOX = { fn: null, l: -8, r: 8, t: 23, b: 1 };

function measureCardArt(id) {
  const fn = CARD_ART[id];
  if (typeof fn !== 'function') return CARD_PLACEHOLDER_BOX;
  const known = cardArtBoxes[id];
  if (known && known.fn === fn) return known;

  const P = CARD_PROBE;
  if (!cardProbeCtx) {
    const cv = document.createElement('canvas');
    cv.width = P.w; cv.height = P.h;
    cardProbeCtx = cv.getContext('2d', { willReadFrequently: true });
  }
  const g = cardProbeCtx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.clearRect(0, 0, P.w, P.h);
  // Several moments of the animation are stacked so the box holds all of it
  const lights = PX._lights.length;
  let ok = true;
  try {
    PX.withTarget(g, () => { for (let tk = 0; tk < 120; tk += 6) fn(P.fx, P.fy, tk); });
  } catch (e) { ok = false; }
  PX._lights.length = lights;          // card art must not leave glows queued for the garden

  const box = { fn, l: -8, r: 8, t: 23, b: 1, ok };
  if (ok) {
    const d = g.getImageData(0, 0, P.w, P.h).data;
    let x0 = P.w, x1 = -1, y0 = P.h, y1 = -1;
    for (let yy = 0; yy < P.h; yy++) {
      for (let xx = 0; xx < P.w; xx++) {
        if (d[(yy * P.w + xx) * 4 + 3] > 24) {
          if (xx < x0) x0 = xx;
          if (xx > x1) x1 = xx;
          if (yy < y0) y0 = yy;
          if (yy > y1) y1 = yy;
        }
      }
    }
    if (x1 >= 0) {
      box.l = x0 - P.fx; box.r = x1 - P.fx;
      box.t = Math.max(1, P.fy - y0); box.b = Math.max(0, y1 - P.fy + 1);
    } else box.ok = false;             // drew nothing: show the placeholder
  }
  cardArtBoxes[id] = box;
  return box;
}

// Stand-in for a character whose art has not been registered: a mystery tile
function drawCardPlaceholder(x, y, tick) {
  const bob = Math.floor(tick / 24) % 2;
  PX.shadow(x, y, 16 - bob * 2);
  PX.panel(x - 8, y - 22 - bob, 17, 20, PAL.cream, PAL.ink, 2);
  PX.rect(x - 6, y - 5 - bob, 13, 1, PAL.ta2);
  uiText('?', x + 1, y - 19 - bob, { font: 'bold', scale: 2, color: PAL.pu3, align: 'center' });
}

// Dark and light shades of a card's own colour, worked out once per card
const cardToneCache = {};
function cardTones(card) {
  let tn = cardToneCache[card.id];
  if (!tn) {
    const hue = card.color[0], sat = card.color[1];
    tn = cardToneCache[card.id] = {
      bg:   PX.hsl(hue, Math.min(sat, 42), 15),
      rule: PX.hsl(hue, Math.min(sat, 42), 32),
      pill: PX.hsl(hue, Math.min(sat + 5, 58), 40),
      pillLit: PX.hsl(hue, Math.min(sat + 5, 58), 52),
      pillDark: PX.hsl(hue, Math.min(sat + 5, 58), 28),
      soft: PX.hsl(hue, Math.min(sat + 10, 70), 86),
    };
  }
  return tn;
}

// Works out where everything on a card goes for a panel interior I.
// Wide panels put the art window on the left and the words on the right;
// narrow ones stack them. The art is enlarged by the biggest whole number
// (3, 2 or 1) that still leaves room for every word of the body text.
function layoutCard(I, card, box) {
  const key = I.w + '|' + I.h + '|' + box.l + '|' + box.r + '|' + box.t + '|' + box.b;
  let L = uiCardLayouts[card.id];
  if (L && L.key === key) return L;
  L = uiCardLayouts[card.id] = { key };

  // Header: the yellow I SPY tab, then the name beside it (or under it)
  const tabFull = 2 + 9 + 2 + uiTextW('I SPY', 'bold') + 3;
  L.tabW = tabFull <= I.w - 4 ? tabFull : 13;
  L.tabText = L.tabW === tabFull;
  const room = I.w - 4 - L.tabW - 5;
  L.nameLines = null;
  if (uiTextW(card.name, 'bold') <= room)       { L.nameFont = 'bold';  L.nameInline = true; }
  else if (uiTextW(card.name, 'small') <= room) { L.nameFont = 'small'; L.nameInline = true; }
  else {
    L.nameFont = 'small'; L.nameInline = false;
    L.nameLines = PX.wrap(card.name, I.w - 4, 'small').slice(0, 2);
  }
  L.tabX = L.nameInline ? I.x + 2 : I.x + Math.floor((I.w - L.tabW) / 2);
  const headH = L.nameInline ? 12 : 12 + L.nameLines.length * 7 + 1;
  L.ruleY = I.y + headH;

  const cy0 = I.y + headH + 3, cy1 = I.y + I.h - 10;
  const ch = Math.max(0, cy1 - cy0);
  const bw = box.r - box.l + 1;
  L.wide = I.w >= 150;
  L.bodyScale = 1;
  L.center = false;
  L.pillBelow = false;

  if (L.wide) {
    // Tries one arrangement: art enlarged k times in a window winW wide,
    // with the title pill above the body text, or under the window when
    // `pillBelow` is set (which leaves the whole column for the body).
    const attempt = (k, winW, pillBelow, cropArt, cutText) => {
      const ground = Math.max(pillBelow ? 6 : 5 + 3 * k, box.b * k + 2 * k + 3);
      const tw = I.w - 4 - winW - 5;
      const titleLines = PX.wrap(card.title, (pillBelow ? winW : tw) - 6, 'small');
      const pillH = titleLines.length * 7 + 4;
      const winH = pillBelow ? ch - pillH - 3 : ch;
      if (tw < 60 && !cutText) return false;
      if (!cropArt && box.t * k + (pillBelow ? 1 : 4) + ground > winH - 2) return false;
      const head = pillBelow ? 0 : pillH + 4;
      const big = PX.wrap(card.body, tw, 'small', 2);      // very short texts (the goose's) are set double size
      const lines = PX.wrap(card.body, tw, 'small');
      let scale = 0, lh = 0, use = lines;
      if (!pillBelow && pillH + 5 + big.length * 14 - 4 <= ch) { scale = 2; lh = 14; use = big; }
      else if (head + lines.length * 8 - 3 <= ch) { scale = 1; lh = 8; }
      else if (head + lines.length * 7 - 2 <= ch) { scale = 1; lh = 7; }
      else if (cutText) { scale = 1; lh = 7; use = lines.slice(0, Math.max(0, Math.floor((ch - head + 2) / 7))); }
      if (!scale) return false;
      L.k = k; L.ground = ground;
      L.win = { x: I.x + 2, y: cy0, w: winW, h: winH };
      L.tx = I.x + 2 + winW + 5; L.tw = tw;
      L.titleLines = titleLines; L.pillH = pillH; L.pillBelow = pillBelow;
      L.bodyLines = use; L.bodyScale = scale; L.lh = lh;
      const textH = (pillBelow ? 0 : pillH + (scale === 2 ? 5 : 4)) + use.length * lh - (lh - 5 * scale);
      L.center = scale === 2;
      L.ty = cy0 + (L.center ? Math.floor((ch - textH) / 2) : Math.min(10, Math.floor((ch - textH) / 2)));
      return true;
    };
    let done = false;
    for (let k = 3; k >= 1 && !done; k--) done = attempt(k, Math.max(bw * k + 8, 34), false, false, false);
    // A very wide drawing (the school) on a narrower panel: move the title
    // under the picture, then trim the picture's edges, until every word
    // fits. Only if all that fails is the text itself cut short.
    if (!done) done = attempt(1, bw + 4, true, false, false);
    for (let winW = bw; winW >= 40 && !done; winW -= 6) done = attempt(1, winW, true, false, false);
    for (let winW = bw; winW >= 40 && !done; winW -= 6) done = attempt(1, winW, false, true, false);
    if (!done) attempt(1, Math.max(34, Math.min(bw + 4, I.w - 70)), false, true, true);
  } else {
    // Narrow: art window on top, then the title and the body underneath.
    // The picture comes first here; if the words cannot all fit below it,
    // the text ends with "...".
    const winW = I.w - 4;
    let k = 2;
    if (bw * 2 + 6 > winW || box.t * 2 + 12 > ch * 0.55) k = 1;
    const ground = Math.max(5 + 3 * k, box.b * k + 2 * k + 3);
    L.k = k; L.ground = ground;
    L.tx = I.x + 2; L.tw = winW;
    L.titleLines = PX.wrap(card.title, winW - 6, 'small');
    L.pillH = L.titleLines.length * 7 + 4;
    if (L.titleLines.length > 2) { L.titleLines = []; L.pillH = 0; }
    const lines = PX.wrap(card.body, winW, 'small');
    L.lh = 7;
    const winH = Math.max(0, Math.min(box.t * k + 5 + ground, Math.floor(ch * 0.55)));
    L.win = { x: I.x + 2, y: cy0, w: winW, h: winH };
    let ty = cy0 + winH + 3;
    if (ty + L.pillH > cy1) { L.titleLines = []; L.pillH = 0; }
    L.ty = ty;
    ty += L.pillH ? L.pillH + 4 : 0;
    const fit = Math.max(0, Math.floor((cy1 - ty + 2) / 7));
    if (fit >= lines.length) L.bodyLines = lines;
    else if (fit < 2) L.bodyLines = [];
    else {
      L.bodyLines = lines.slice(0, fit);
      let last = L.bodyLines[fit - 1];
      while (last && uiTextW(last + '...', 'small') > winW) last = last.slice(0, -1);
      L.bodyLines[fit - 1] = last.replace(/[ ,.;:!-]+$/, '') + '...';
    }
    L.center = true;
  }
  return L;
}

// A little outdoor scene for the character to stand in: sky, a cloud, a
// far hill and a strip of lawn. `gy` is the top of the grass.
function drawCardWindow(win, gy) {
  const x = win.x, y = win.y, w = win.w, h = win.h;
  PX.rect(x, y, w, h, PAL.ink);
  const ix = x + 1, iy = y + 1, iw = w - 2, ih = h - 2;
  if (iw < 2 || ih < 2) return;
  uiClip(ix, iy, iw, ih, () => {
    const mid = iy + Math.floor((gy - iy) * 0.45);
    PX.rect(ix, iy, iw, ih, PAL.sk3);
    PX.dither(ix, mid - 2, iw, 2, PAL.sk2, 0.5);
    PX.rect(ix, mid, iw, gy - mid, PAL.sk2);
    if (iw >= 30 && gy - iy >= 22) {                       // a small cloud, top right
      const cx = ix + iw - 16, cy = iy + 5;
      PX.rect(cx, cy + 2, 12, 3, PAL.white);
      PX.rect(cx + 2, cy, 5, 2, PAL.white);
      PX.rect(cx + 6, cy + 1, 4, 1, PAL.white);
      PX.rect(cx + 1, cy + 4, 10, 1, PAL.sk1);
    }
    PX.ellipse(ix + Math.floor(iw * 0.28), gy + 2, Math.floor(iw * 0.42), 5, PAL.gr2);   // far hill
    PX.rect(ix, gy, iw, iy + ih - gy, PAL.gr3);
    PX.rect(ix, gy, iw, 1, PAL.gr2);
    for (let i = 3; i < iw - 2; i += 9) {                  // tufts
      PX.px(ix + i, gy + 2 + (i % 3), PAL.gr4);
      PX.px(ix + i + 1, gy + 1 + (i % 3), PAL.gr4);
      PX.px(ix + i + 4, gy + 3 + (i % 2), PAL.gr2);
    }
  });
}

// Renders an "I SPY" character info card with art, name, title, and description
function drawCharacterCard(x, y, w, h, card) {
  const tn = cardTones(card);
  const I = drawHudFrame(x, y, w, h, tn.bg);
  const box = measureCardArt(card.id);
  const L = layoutCard(I, card, box);

  // Header
  PX.panel(L.tabX, I.y + 1, L.tabW, 11, PAL.ye2, PAL.ink, 1);
  PX.rect(L.tabX + 1, I.y + 10, L.tabW - 2, 1, PAL.ye3);
  PX.spr('ui_magnifier', L.tabX + 2, I.y + 2);
  if (L.tabText) uiText('I SPY', L.tabX + 13, I.y + 3, { font: 'bold', color: PAL.ink });
  if (L.nameInline) {
    const capH = L.nameFont === 'bold' ? 7 : 5;
    uiText(card.name, L.tabX + L.tabW + 5, I.y + 3 + Math.floor((7 - capH) / 2),
      { font: L.nameFont, color: PAL.white, shadow: PAL.ink });
  } else {
    for (let i = 0; i < L.nameLines.length; i++) {
      uiText(L.nameLines[i], I.x + Math.floor(I.w / 2), I.y + 14 + i * 7, { color: PAL.white, align: 'center' });
    }
  }
  drawDottedRule(I.x + 4, L.ruleY, I.w - 8, tn.rule);

  // Art window with the character enlarged inside it
  const win = L.win;
  if (win.h >= 8) {
    const gy = win.y + win.h - 1 - L.ground;
    drawCardWindow(win, gy);
    const fn = (box.fn && box.ok) ? box.fn : drawCardPlaceholder;
    const feetX = win.x + Math.floor(win.w / 2) - Math.round((box.l + box.r) / 2 * L.k);
    const feetY = gy + 2 * L.k + 1;        // a little way into the grass
    const lights = PX._lights.length;
    uiClip(win.x + 1, win.y + 1, win.w - 2, win.h - 2, () => {
      try { PX.scaled(feetX, feetY, L.k, () => fn(0, 0, PX.tick)); }
      catch (e) { box.ok = false; }       // broken art: fall back to the placeholder
    });
    PX._lights.length = lights;
  }

  // Title pill and body text
  const cx = L.tx + Math.floor(L.tw / 2);
  let ty = L.ty;
  if (L.pillH) {
    let pw = 0;
    for (const ln of L.titleLines) pw = Math.max(pw, uiTextW(ln, 'small'));
    pw = Math.min(L.pillBelow ? win.w : L.tw, pw + 8);
    let px = L.center ? cx - Math.floor(pw / 2) : L.tx;
    let py = ty;
    if (L.pillBelow) { px = win.x + Math.floor((win.w - pw) / 2); py = win.y + win.h + 3; }
    PX.panel(px, py, pw, L.pillH, tn.pill, tn.pillDark, 1);
    PX.rect(px + 1, py + 1, pw - 2, 1, tn.pillLit);
    for (let i = 0; i < L.titleLines.length; i++) {
      uiText(L.titleLines[i], px + Math.floor(pw / 2), py + 3 + i * 7,
        { color: PAL.white, align: 'center', shadow: tn.pillDark });
    }
    if (!L.pillBelow) ty += L.pillH + (L.bodyScale === 2 ? 5 : 4);
  }
  for (let i = 0; i < L.bodyLines.length; i++) {
    const ln = L.bodyLines[i];
    if (!ln) continue;
    if (L.center) uiText(ln, cx, ty + i * L.lh, { scale: L.bodyScale, color: tn.soft, align: 'center' });
    else          uiText(ln, L.tx, ty + i * L.lh, { scale: L.bodyScale, color: tn.soft });
  }

  drawFrameVines(x, y, w, h, UI_FLOWER_WHITE, UI_FLOWER_YELLOW, 6);
  drawCycleIndicator(I, tn.rule, tn.rule);
}

// Draws dot indicators and a progress bar showing the current panel cycle position
function drawCycleIndicator(I, dotCol, trackCol) {
  const total = panelCycle.length;
  if (total < 1 || I.h < 30) return;
  let sp = 5;
  if (total * sp > I.w - 6) sp = 3;
  const dotsW = total * sp - (sp - 2);
  const y = I.y + I.h - 7;
  if (dotsW <= I.w - 4) {
    const x0 = I.x + Math.floor((I.w - dotsW) / 2);
    for (let i = 0; i < total; i++) {
      if (i === panelCycleIdx) {
        PX.rect(x0 + i * sp, y, 2, 2, PAL.ye2);
        if (sp >= 5) { PX.rect(x0 + i * sp - 1, y, 4, 2, PAL.ye2); PX.rect(x0 + i * sp, y - 1, 2, 4, PAL.ye2); }
      } else {
        PX.rect(x0 + i * sp, y, 2, 2, dotCol);
      }
    }
  }
  const progress = constrain((millis() - panelModeTimer) / PANEL_CYCLE_DURATION, 0, 1);
  const barW = Math.max(10, Math.min(I.w - 8, Math.max(dotsW, 40)));
  const barX = I.x + Math.floor((I.w - barW) / 2);
  PX.rect(barX, y + 4, barW, 1, trackCol);
  PX.rect(barX, y + 4, Math.round(barW * progress), 1, PAL.g1);
}

// ── CARE Score Panel ─────────────────────────────────

const CARE_TAGLINE = 'Spread a smile and make our community beautiful.';
const CARE_TITLES  = [['CARE GARDEN', 'bold'], ['CARE GARDEN', 'small'], ['CARE', 'bold'], ['CARE', 'small']];
const CARE_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The four values: block colours (fill, lit edge, dark edge) and word colour
const CARE_VALUES = [
  { letter: 'C', word: 'Compassion', fill: PAL.pi3, lit: PAL.pi2, dark: PAL.pi4, text: PAL.pi1 },
  { letter: 'A', word: 'Acceptance', fill: PAL.bl3, lit: PAL.bl2, dark: PAL.bl4, text: PAL.bl1 },
  { letter: 'R', word: 'Respect',    fill: PAL.or2, lit: PAL.or1, dark: PAL.or3, text: PAL.ye1 },
  { letter: 'E', word: 'Effort',     fill: PAL.gr3, lit: PAL.gr2, dark: PAL.gr5, text: PAL.gr1 },
];

// Number colours for the three stats: top half, bottom half, drop shadow, flash
const CARE_STAT_COLORS = [
  { top: PAL.ye1, main: PAL.ye2, shade: PAL.or3, flash: PAL.white },   // today
  { top: PAL.sk2, main: PAL.sk3, shade: PAL.bl4, flash: PAL.white },   // this week
  { top: PAL.pi1, main: PAL.pi2, shade: PAL.pi4, flash: PAL.white },   // record day
];

// Ways of showing the C-A-R-E blocks, best first. `b` is the block size and
// `ls` the letter scale; 'row' puts each word under its block, 'grid' beside
// it in two columns, and 'blocks' drops the words when there is no room
// ('blocks2' stacks them two by two for the narrowest panels).
function careModes(wordW) {
  const row = (b, ls, g) => { const cw = Math.max(wordW, b); return { kind: 'row', b, ls, g, cw, w: 4 * cw + 3 * g, h: b + 3 + 5, words: true }; };
  const blocks = (b, ls, g) => ({ kind: 'blocks', b, ls, g, w: 4 * b + 3 * g, h: b, words: false });
  const blocks2 = (b, ls) => ({ kind: 'blocks2', b, ls, g: 3, w: 2 * b + 3, h: 2 * b + 3, words: false });
  return [
    row(20, 2, 8), row(20, 2, 5),
    row(13, 1, 8), row(13, 1, 4),
    { kind: 'grid', b: 13, ls: 1, g: 8, cw: 13 + 3 + wordW, w: 2 * (13 + 3 + wordW) + 8, h: 2 * 13 + 3, words: true },
    blocks(20, 2, 4),
    blocks(13, 1, 3),
    blocks2(20, 2), blocks2(13, 1),
  ];
}

// Chooses the number size, the C-A-R-E arrangement and whether the tagline
// is shown, so that everything fits the panel interior I without touching.
// The big number comes first; the tagline is the first thing to go.
function layoutCarePanel(I, digits) {
  const key = I.w + '|' + I.h + '|' + digits;
  if (uiCareLayout && uiCareLayout.key === key) return uiCareLayout;
  const L = uiCareLayout = { key, s: 1, care: null, tagLines: null };

  const top = I.y + 15, bottom = I.y + I.h - 3;
  const H = bottom - top;
  let wordW = 0;
  for (const v of CARE_VALUES) wordW = Math.max(wordW, uiTextW(v.word, 'small'));
  const modes = careModes(wordW);
  const tagLines = PX.wrap(CARE_TAGLINE, I.w - 12, 'small');
  const tagH = tagLines.length * 7 - 2;
  const numW = s => digits * 8 * s - s;
  let widest = 1;
  for (let s = 6; s >= 1; s--) if (numW(s) <= I.w - 8) { widest = s; break; }

  // The three stat dots stand in a column beside the number when there is
  // room, otherwise in a row under it.
  const dotsBeside = s => numW(s) + 2 * (Math.max(1, s >> 1) + 5 + 3) <= I.w - 6;
  // label (5) + gap + number and its drop shadow (+ dots) = the stat block
  const statH = s => 5 + 3 + 7 * s + Math.max(1, s >> 1) + (dotsBeside(s) ? 0 : 4 + 3);

  // Look for the best arrangement with room to breathe (2px spare around
  // each part) and the tagline; then without the tagline; and only then
  // let things sit tight.
  let best = null;
  for (const minPad of [2, 0]) {
    for (const withTag of [true, false]) {
      if (withTag && tagLines.length > 3) continue;
      let cand = null;
      for (let s = widest; s >= 1; s--) {
        for (let m = 0; m <= modes.length; m++) {
          const mode = m < modes.length ? modes[m] : null;       // null: no blocks at all
          if (mode && mode.w > I.w - 4) continue;
          const parts = 2 + (mode ? 1 : 0) + (withTag ? 1 : 0);
          const total = statH(s) + (mode ? 6 + mode.h : 0) + (withTag ? 6 + tagH : 0);
          if (total + parts * minPad > H) continue;
          // Bigger number first, but words under the blocks are worth two sizes
          const score = s * 4 + (mode ? (mode.words ? 8 : 2) : 0) + (mode && mode.b >= 20 ? 1 : 0);
          if (!cand || score > cand.score) cand = { score, s, mode, withTag, total, parts };
        }
      }
      if (!cand) continue;
      // The tagline stays only while the number is still big and the blocks are there
      if (withTag && !(cand.mode && cand.s >= Math.min(4, widest))) continue;
      if (!withTag && !cand.mode && minPad > 0) continue;
      best = cand;
      break;
    }
    if (best) break;
  }
  if (!best) best = { s: 1, mode: null, withTag: false, total: statH(1), parts: 2 };

  L.s = best.s; L.care = best.mode;
  L.tagLines = best.withTag ? tagLines : null;
  L.dotsBeside = dotsBeside(best.s);
  // Share out whatever height is left over as breathing room
  const slack = Math.max(0, H - best.total);
  const pad = Math.min(14, Math.floor(slack / best.parts));
  L.yLabel = top + pad;
  L.yNum   = L.yLabel + 5 + 3;
  L.yDots  = L.yNum + 7 * L.s + Math.max(1, L.s >> 1) + 4;
  L.yCare  = L.yLabel + statH(L.s) + 6 + pad;
  L.yTag   = bottom - tagH - Math.min(pad, 3);
  return L;
}

// One raised colour block with its letter
function drawCareBlock(x, y, v, b, ls) {
  PX.panel(x, y, b, b, v.fill, PAL.ink, 1);
  PX.rect(x + 1, y + 1, b - 2, 1, v.lit);
  PX.rect(x + 1, y + 1, 1, b - 2, v.lit);
  PX.rect(x + 1, y + b - 2, b - 2, 1, v.dark);
  PX.rect(x + b - 2, y + 1, 1, b - 2, v.dark);
  const lx = x + Math.floor((b - 7 * ls) / 2), ly = y + Math.floor((b - 7 * ls) / 2);
  uiText(v.letter, lx, ly, { font: 'bold', scale: ls, color: PAL.white, shadow: v.dark });
}

// Draws the four C-A-R-E blocks (and their words) centred on cx
function drawCareValues(cx, y, mode) {
  const x0 = cx - Math.floor(mode.w / 2);
  for (let i = 0; i < 4; i++) {
    const v = CARE_VALUES[i];
    if (mode.kind === 'row') {
      const colX = x0 + i * (mode.cw + mode.g);
      drawCareBlock(colX + Math.floor((mode.cw - mode.b) / 2), y, v, mode.b, mode.ls);
      uiText(v.word, colX + Math.floor(mode.cw / 2), y + mode.b + 3, { color: v.text, align: 'center' });
    } else if (mode.kind === 'grid') {
      const bx = x0 + (i % 2) * (mode.cw + mode.g), by = y + Math.floor(i / 2) * (mode.b + 3);
      drawCareBlock(bx, by, v, mode.b, mode.ls);
      uiText(v.word, bx + mode.b + 3, by + 4, { color: v.text });
    } else if (mode.kind === 'blocks2') {
      drawCareBlock(x0 + (i % 2) * (mode.b + mode.g), y + Math.floor(i / 2) * (mode.b + mode.g), v, mode.b, mode.ls);
    } else {
      drawCareBlock(x0 + i * (mode.b + mode.g), y, v, mode.b, mode.ls);
    }
  }
}

// Draws the CARE Garden dashboard panel with cycling stats and C-A-R-E value blocks.
// The panel fills the dashboard to the left of the webcam (`ox` is unused now
// that the layout comes from the videoArt rectangle).
function drawCareScore(ox) {
  // Cycle through stats every 4 seconds
  statsCycleTimer++;
  if (statsCycleTimer > 240) {
    statsCycleTimer = 0;
    statsCycleIdx = (statsCycleIdx + 1) % 3;
  }
  // Start the day's count afresh if the garden has run past midnight
  if (frameCount % 60 === 0) checkStatsDayRollover();

  const x = 0, y = PX.H, w = videoArt.x, h = PX.SH - PX.H;
  if (w < 12 || h < 12) return;
  uiSyncFonts();
  const I = drawHudFrame(x, y, w, h, UI_BG);
  const cx = I.x + Math.floor(I.w / 2);
  drawPanelTitle(I, CARE_TITLES, PAL.cream, UI_FLOWER_PINK, UI_FLOWER_BLUE);

  const todayName = CARE_DAY_NAMES[new Date().getDay()];
  let recordLabel = 'RECORD DAY', recordShort = 'RECORD';
  if (smileStats.recordDate) {
    const parts = smileStats.recordDate.split('-');
    const rd = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (!isNaN(rd.getDay())) recordLabel = 'RECORD DAY (' + CARE_DAY_NAMES[rd.getDay()].toUpperCase() + ')';
  }
  const idx = statsCycleIdx;
  const label = idx === 0 ? todayName.toUpperCase() + "'S SMILES" : idx === 1 ? 'SMILES THIS WEEK' : recordLabel;
  const short = idx === 0 ? 'TODAY' : idx === 1 ? 'WEEK' : recordShort;
  const value = idx === 0 ? smileStats.today : idx === 1 ? smileStats.week : smileStats.record;

  // The number size is chosen for the longest of the three stats so it
  // does not jump about as they cycle.
  const digits = Math.max(2, String(smileStats.today).length, String(smileStats.week).length,
                          String(smileStats.record).length);
  const L = layoutCarePanel(I, digits);
  const col = CARE_STAT_COLORS[idx];

  // Label
  const labelText = uiTextW(label, 'small') <= I.w - 4 ? label : (uiTextW(short, 'small') <= I.w - 2 ? short : '');
  if (labelText) uiText(labelText, cx, L.yLabel, { color: PAL.sk2, align: 'center' });

  // The big number: two-tone digits with a drop shadow. While someone is
  // smiling (sunGlow) it bounces a pixel and flashes on a steady beat.
  const s = L.s;
  // Until the first answer about saved stats arrives there may be nothing to show yet
  const str = (statsLoading && !statsHadLocal && !statsSetByHand()) ? '...' : String(value);
  const beat = sunGlow > 0.15 && Math.floor(frameCount / 10) % 2 === 0;
  const nw = uiTextW(str, 'bold', s);
  const nx = cx - Math.floor(nw / 2), ny = L.yNum - (beat ? 1 : 0);
  const drop = Math.max(1, Math.floor(s / 2));
  uiText(str, nx + drop, ny + drop, { font: 'bold', scale: s, color: col.shade });
  uiText(str, nx, ny, { font: 'bold', scale: s, color: beat ? col.top : col.main });
  uiClip(nx - 1, ny, nw + 2, 3 * s, () => {
    uiText(str, nx, ny, { font: 'bold', scale: s, color: beat ? col.flash : col.top });
  });

  // Stat dots indicator — a column beside the number, or a row below it
  for (let i = 0; i < 3; i++) {
    const dc = i === idx ? col.main : UI_RULE;
    if (L.dotsBeside) PX.rect(nx + nw + drop + 5, L.yNum + Math.floor((7 * s - 15) / 2) + i * 6, 3, 3, dc);
    else              PX.rect(cx - 8 + i * 7, L.yDots, 3, 3, dc);
  }

  if (L.care) drawCareValues(cx, L.yCare, L.care);

  if (L.tagLines) {
    for (let i = 0; i < L.tagLines.length; i++) {
      uiText(L.tagLines[i], cx, L.yTag + i * 7, { color: PAL.cream, align: 'center' });
    }
    // A heart at each end when the tagline sits on one line with room to spare
    const tagW = uiTextW(L.tagLines[0], 'small');
    if (L.tagLines.length === 1 && tagW + 2 * 12 <= I.w - 16) {
      const half = Math.floor(tagW / 2);
      PX.spr('ui_heart', cx - half - 8, L.yTag);
      PX.spr('ui_heart', cx - half + tagW + 7, L.yTag);
    }
  }
  drawFrameVines(x, y, w, h, UI_FLOWER_PINK, UI_FLOWER_YELLOW, 5);
}
drawCareScore.pixel = true;

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

// Confetti colours: [face, underside] pairs from the palette
const CONFETTI_COLORS = [
  [PAL.re2, PAL.re3], [PAL.or2, PAL.or3], [PAL.ye2, PAL.ye3], [PAL.gr2, PAL.gr4],
  [PAL.te2, PAL.te3], [PAL.wa2, PAL.wa3], [PAL.bl2, PAL.bl3], [PAL.pu2, PAL.pu3],
  [PAL.pi2, PAL.pi3], [PAL.white, PAL.g2], [PAL.ye1, PAL.ye3], [PAL.pi1, PAL.pi3],
];

// Spawns 180 confetti squares with random colours and physics. Positions and
// speeds are in art pixels (a third of the old screen-pixel values).
function launchConfetti() {
  for (let i = 0; i < 180; i++) {
    confettiParticles.push({
      x: random(PX.W * 0.2, PX.W * 0.8), y: random(-7, PX.H * 0.5),
      vx: random(-1.33, 1.33), vy: random(-2, 0.67), size: random() < 0.6 ? 2 : 3,
      col: floor(random(CONFETTI_COLORS.length)), rot: random(TWO_PI), rotV: random(-0.15, 0.15),
      alpha: 255,
      gravity: random(0.04, 0.073), wobble: random(TWO_PI),
      wobbleSpeed: random(0.05, 0.12)
    });
  }
}

// Updates confetti particle physics and renders them, plus shows a milestone banner
function updateDrawConfetti() {
  const c = PX.c;
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.vy += p.gravity; p.x += p.vx + sin(p.wobble) * 0.4;
    p.y += p.vy; p.rot += p.rotV; p.wobble += p.wobbleSpeed; p.alpha -= 1.2;
    if (p.alpha <= 0 || p.y > PX.SH) { confettiParticles.splice(i, 1); continue; }
    // A square tumbles by showing its face, then its edge, then its underside
    const turn = sin(p.rot * 3);
    const pair = CONFETTI_COLORS[p.col];
    const px = Math.round(p.x), py = Math.round(p.y);
    c.globalAlpha = p.alpha < 60 ? p.alpha / 60 : 1;      // fades out only at the very end
    if (turn > 0.35)       PX.rect(px, py, p.size, p.size, pair[0]);
    else if (turn < -0.35) PX.rect(px, py, p.size, p.size, pair[1]);
    else                   PX.rect(px, py + 1, p.size, 1, pair[1]);
  }
  c.globalAlpha = 1;
  if (confettiParticles.length > 120) drawMilestoneBanner();
}
updateDrawConfetti.pixel = true;

// A round pixel flower for the banner: six petals around a yellow centre.
// `turn` (0 or 1) swaps the light and dark petals so the flower twinkles.
function drawBloom(cx, cy, r, petal, petalLit, turn) {
  const ring = r * 0.56, pr = Math.max(1, Math.round(r * 0.4));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6;
      const bx = cx + Math.round(Math.cos(a) * ring), by = cy + Math.round(Math.sin(a) * ring);
      if (pass === 0) PX.circle(bx, by, pr + 1, PAL.ink);
      else PX.circle(bx, by, pr, (i + turn) % 2 ? petal : petalLit);
    }
  }
  const cr = Math.max(1, Math.round(r * 0.3));
  PX.circle(cx, cy, cr + 1, PAL.ink);
  PX.circle(cx, cy, cr, PAL.ye2);
  PX.px(cx - 1, cy - 1, PAL.ye1);
}

// The celebration banner: "100 SMILES!" in big pixel letters between two flowers
function drawMilestoneBanner() {
  const big = lastMilestoneCelebrated === 1 ? 'FIRST SMILE!' : lastMilestoneCelebrated + ' SMILES!';
  const sub = 'Thank you for caring!';
  let s = 4;
  while (s > 1 && uiTextW(big, 'bold', s) + 2 * (s >= 3 ? 34 : 20) > PX.W - 8) s--;
  const ss = s >= 3 ? 2 : 1;
  const r = s >= 3 ? 10 : 5;                      // flower size
  const side = r * 2 + (s >= 3 ? 14 : 8);         // room for a flower at each end
  const tw = uiTextW(big, 'bold', s), sw = uiTextW(sub, 'small', ss);
  const w = Math.min(PX.W - 4, Math.max(tw, sw) + 2 * side);
  const h = 7 * s + 5 * ss + 6 * ss + 14;
  const x = Math.floor((PX.W - w) / 2);
  const y = Math.max(2, Math.round(PX.H * 0.38 - h / 2));
  const cx = x + Math.floor(w / 2);
  const beat = Math.floor(PX.tick / 12) % 2;

  PX.alpha(0.3, () => PX.panel(x + 2, y + 3, w, h, PAL.black, null, 2));   // drop shadow
  PX.panel(x, y, w, h, PAL.sk8, PAL.ink, 2);
  PX.box(x + 2, y + 2, w - 4, h - 4, PAL.ye3);
  PX.rect(x + 2, y + 2, w - 4, 1, PAL.ye2);
  PX.rect(x + 2, y + 2, 1, h - 4, PAL.ye2);

  const ty = y + 7;
  const tx = cx - Math.floor(tw / 2);
  uiText(big, tx + Math.max(1, s >> 1), ty + Math.max(1, s >> 1), { font: 'bold', scale: s, color: PAL.or3 });
  uiText(big, tx, ty, { font: 'bold', scale: s, color: PAL.ye2 });
  uiClip(tx - 1, ty, tw + 2, 3 * s, () => uiText(big, tx, ty, { font: 'bold', scale: s, color: PAL.ye1 }));
  uiText(sub, cx, ty + 7 * s + 4 * ss, { scale: ss, color: PAL.white, align: 'center', shadow: PAL.sk6 });

  // A flower at each end, bobbing in turn, with a few small ones for company
  const fy = y + Math.floor(h / 2);
  drawBloom(x + 6 + r, fy - beat, r, PAL.pi3, PAL.pi2, beat);
  drawBloom(x + w - 7 - r, fy - (1 - beat), r, PAL.bl2, PAL.bl1, 1 - beat);
  if (s >= 3) {
    PX.spr('ui_flower', x + 5, y + 4 + beat, { pal: UI_FLOWER_YELLOW });
    PX.spr('ui_flower', x + w - 6, y + h - 5 - beat, { pal: UI_FLOWER_PINK });
    PX.spr('ui_flower', x + w - 6, y + 4 + (1 - beat), { pal: UI_FLOWER_WHITE });
    PX.spr('ui_flower', x + 5, y + h - 5 - (1 - beat), { pal: UI_FLOWER_PURPLE });
  }
}
