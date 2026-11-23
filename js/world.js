// ================================================================
// File: world.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: November 22, 2026
// Description: Coordinate system utilities and day/night helpers.
//              Converts normalized world positions to art pixels (and
//              screen pixels) and provides time-of-day state for the scene.
// ================================================================

// ── World / Coordinate System ─────────────────────────

// Returns the screen y where the garden ends and the dashboard begins (2/3 down)
function splitY()    { return PX.H * PX.S; }
// Returns the screen y of the horizon line
function gndHorizon(){ return PX.HOR * PX.S; }

// Converts normalized world coordinates (0-1) to SCREEN pixel positions.
// Only the flying creatures (and the cat that hunts them) work in screen
// pixels; everything else uses worldToPx below.
function worldToScreen(wx, wy) {
  return {
    sx: wx * PX.W * PX.S,
    sy: lerp(gndHorizon(), splitY(), wy)
  };
}

// Converts normalized world coordinates to ART pixels: the point where a
// character's feet (or a flower's stem) touch the ground. Pixel-art
// characters are all drawn at one size; depth comes from y-position alone.
function worldToPx(wx, wy) {
  return PX.toPx(wx, wy);
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
