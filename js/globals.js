// ================================================================
// File: globals.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: Declares all mutable global state variables used
//   across the CARE Garden application at runtime.
// ================================================================

// ── Global State ─────────────────────────────────────

// Face-detection library reference and video/canvas handles
let faceapi;
let detections = [];
let video;
let canvas;
let h = false;
let t = 0;

// Flower spawning and bloom queue
let flowers = [];
let lastFlowerTime = 0;
let nextFlowerImgs = [];
let postSnapPause  = 0;

// Score tracking, smile stats, gallery snapshots, and confetti state
let careScore = 0;
let smileStats = { today: 0, week: 0, record: 0, recordDate: '' };
let statsCycleIdx = 0;
let statsCycleTimer = 0;
let smileGallery = [];
let lastGalleryUpdate = 0;
let updateInterval = 3000;
let pendingPhoto = null;
let lastMilestoneCelebrated = -1;
let confettiParticles = [];

// Per-face smile tracking and snap cooldown
let faceSmileData = {};
let lastSnapTime  = 0;

// Video feed dimensions and canvas offset for centering
let videoW, videoH;
let videoOffsetX = 0;
let videoOffsetY = 0;
let videoDisplayW = 0;
let videoDisplayH = 0;

// Character instances and spawn timers
let ram, gardener, goose, cat;
let kids      = [];
let rabbits   = [];
let mrPerkins = null;
let mrPerkinsTimer = 0;
let characterPositions = [];
let groundhog = null;
let groundhogTimer = 0;
let principal = null;
let teachers = [];
let arrivalKids = [];
let wasDawn = false;
let wasDusk = false;
let arrivalSpawnTimer = 0;

// Ambient creatures (butterflies, etc.) and bird flock arrays
let creatures   = [];
let birds_flock = [];

// Sound effect references and volume controls
let birds, chewing, sheep, dirt, shine, fart, quackSound, rain, lightning, nightSound;
let shineVol = 0;

// Active speech bubbles and per-character cooldown timers
let speechBubbles = [];
let ramSpeechTimer = 0;
let gardenerSpeechTimer = 0;

// Wind, grass, and sun glow environment state
let windX = 0;
let windTarget = 0;
let grassBlades = [];
let sunGlow = 0;

// NSFW content moderation model and readiness flag
let nsfwModel = null;
let nsfwReady = false;

// Hat/decoration overlays drawn on detected faces
let hatImages = [];
let decorationsEnabled = true;
let hatTimeAlpha = 0;
let wasRaining = false;
let hatTimeActive = false;
let hatTimeTimer = 0;
let hatTimeDuration = 0;

// Group photo snap label overlay and fade alpha
let groupSnapLabel = '';
let groupSnapAlpha = 0;

// Celebration sound pools for milestones and photo snaps
let milestoneSounds = [];
let milestone67Sound = null;

// Camera shutter sound pool
let photoSounds = [];

// Side-panel cycling between gallery and character cards
let panelMode = 'gallery';
let panelModeTimer = 0;
let panelCycleIdx = 0;
let panelCycle = [];

// Weather system: state machine, rain/puddle particles, lightning
let weatherState   = 'sunny';
let weatherTimer   = 0;
let weatherAlpha   = 0;
let weatherDuration = 3600;
let nextWeatherState = 'cloudy';
let raindrops      = [];
let fgRaindrops    = [];   // foreground rain layer
let puddles        = [];   // puddle objects
let lightningAlpha = 0;
let lightningTimer = 0;
let rainBoost      = 0;

// Day/night cycle position, speed, and ambient elements (stars, fireflies)
let timeOfDay      = 0.25;   // start at morning
let dayNightT      = Math.round(0.25 * 54000);  // sync frame counter
let daySpeed       = 1;      // arrow keys: up/down to change speed
let stars          = [];
let fireflies      = [];
