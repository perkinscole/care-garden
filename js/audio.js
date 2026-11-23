// ================================================================
// File: audio.js
// Author: Cole Perkins
// Date Created: November 22, 2026
// Description: Safe wrappers around p5.sound playback. A sound that has
//   not finished loading throws if you try to play it, which would stop
//   the whole draw loop for that frame; these helpers simply do nothing
//   until the file is ready.
// ================================================================

// True once a p5.SoundFile exists and its audio has loaded.
function soundReady(s) {
  return !!(s && typeof s.isLoaded === 'function' && s.isLoaded());
}

// Starts a looping sound if it is loaded and not already playing.
function soundLoop(s) {
  try { if (soundReady(s) && !s.isPlaying()) s.loop(); } catch (e) { /* ignore */ }
}

// Plays a one-shot sound. By default it will not restart a sound that
// is still playing; pass restart = true to retrigger it.
function soundPlay(s, restart = false) {
  try { if (soundReady(s) && (restart || !s.isPlaying())) s.play(); } catch (e) { /* ignore */ }
}

// Pauses a sound if it is playing.
function soundPause(s) {
  try { if (soundReady(s) && s.isPlaying()) s.pause(); } catch (e) { /* ignore */ }
}

// Stops a sound if it is playing.
function soundStop(s) {
  try { if (soundReady(s) && s.isPlaying()) s.stop(); } catch (e) { /* ignore */ }
}

// Belt and braces: make play() and loop() on any sound a no-op until it has
// loaded, so a storm that starts in the first seconds (before lightning.mp3
// arrives) cannot throw inside draw() and freeze the garden mid-frame.
if (typeof p5 !== 'undefined' && p5.SoundFile) {
  for (const method of ['play', 'loop']) {
    const original = p5.SoundFile.prototype[method];
    p5.SoundFile.prototype[method] = function (...args) {
      if (!this.isLoaded()) return;
      return original.apply(this, args);
    };
  }
}
