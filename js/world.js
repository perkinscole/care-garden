// ================================================================
// File: world.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: Coordinate system utilities and day/night helpers.
//              Converts normalized world positions to screen pixels
//              and provides time-of-day state for the scene.
// ================================================================

// ── World / Coordinate System ─────────────────────────

// Returns the y-coordinate that divides the sky from the ground (2/3 down the canvas)
function splitY()    { return height * (2/3); }
// Returns the y-coordinate of the front edge of the ground plane
function gndFront()  { return splitY(); }
// Returns the y-coordinate of the horizon line
function gndHorizon(){ return height * 0.27; }
// Returns the left edge of the ground plane (screen left)
function gndLeft()   { return 0; }
// Returns the right edge of the ground plane (screen right)
function gndRight()  { return width; }

// Converts normalized world coordinates (0-1) to screen pixel positions
function worldToScreen(wx, wy) {
  const lx = lerp(gndLeft(),  gndLeft(),  wy);
  const rx = lerp(gndRight(), gndRight(), wy);
  return {
    sx: lerp(lx, rx, wx),
    sy: lerp(gndHorizon(), gndFront(), wy)
  };
}

// Returns a scale factor (0.4 to 0.9) based on depth for perspective sizing
function depthScale(wy) {
  return lerp(0.4, 0.9, wy);
}

// ── Day/Night helpers ─────────────────────────────────

// Interpolates a named property between adjacent keyframes at a given time (0-1)
function lerpKeyframes(keyframes, time, prop) {
  const t = time % 1.0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (t >= keyframes[i].t && t <= keyframes[i + 1].t) {
      const seg = (t - keyframes[i].t) / (keyframes[i + 1].t - keyframes[i].t);
      return lerp(keyframes[i][prop], keyframes[i + 1][prop], seg);
    }
  }
  return keyframes[0][prop];
}

// Returns true if the current time of day falls within the nighttime range
function isNight() {
  return timeOfDay > 0.78 || timeOfDay < 0.03;
}

// Returns a 0-1 value representing how dark it is (0 = full day, 1 = full night)
function nightAmount() {
  // 0 = full day, 1 = full night — shorter night
  if (timeOfDay >= 0.68 && timeOfDay <= 0.78) {
    return map(timeOfDay, 0.68, 0.78, 0, 1);
  } else if (timeOfDay >= 0.78 || timeOfDay <= 0.03) {
    return 1.0;
  } else if (timeOfDay > 0.03 && timeOfDay <= 0.09) {
    return map(timeOfDay, 0.03, 0.09, 1, 0);
  }
  return 0;
}

// Computes a nudge vector to push a character away from nearby characters (collision avoidance)
function getSeparation(wx, wy, selfId, radius = 0.07) {
  let nudgeX = 0, nudgeY = 0;
  for (let other of characterPositions) {
    if (other.id === selfId) continue;
    const dx = wx - other.wx;
    const dy = wy - other.wy;
    const d  = sqrt(dx*dx + dy*dy);
    if (d < radius && d > 0.001) {
      const strength = (radius - d) / radius;
      nudgeX += (dx / d) * strength * 0.004;
      nudgeY += (dy / d) * strength * 0.004;
    }
  }
  return { nudgeX, nudgeY };
}
