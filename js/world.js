// ── World / Coordinate System ─────────────────────────

function splitY()    { return height * (2/3); }
function gndFront()  { return splitY(); }
function gndHorizon(){ return height * 0.27; }
function gndLeft()   { return 0; }
function gndRight()  { return width; }

function worldToScreen(wx, wy) {
  const lx = lerp(gndLeft(),  gndLeft(),  wy);
  const rx = lerp(gndRight(), gndRight(), wy);
  return {
    sx: lerp(lx, rx, wx),
    sy: lerp(gndHorizon(), gndFront(), wy)
  };
}

function depthScale(wy) {
  return lerp(0.4, 0.9, wy);
}

// ── Day/Night helpers ─────────────────────────────────

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

function isNight() {
  return timeOfDay > 0.78 || timeOfDay < 0.03;
}

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
