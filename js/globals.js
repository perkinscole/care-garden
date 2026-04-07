// ── Global State ─────────────────────────────────────

let faceapi;
let detections = [];
let video;
let canvas;
let h = false;
let t = 0;

// Flowers
let flowers = [];
let lastFlowerTime = 0;
let nextFlowerImgs = [];
let postSnapPause  = 0;

// Score & gallery
let careScore = 0;
let smileGallery = [];
let lastGalleryUpdate = 0;
let updateInterval = 3000;
let pendingPhoto = null;
let lastMilestoneCelebrated = -1;
let confettiParticles = [];

// Face detection
let faceSmileData = {};
let lastSnapTime  = 0;

// Video layout
let videoW, videoH;
let videoOffsetX = 0;
let videoOffsetY = 0;
let videoDisplayW = 0;
let videoDisplayH = 0;

// Characters
let ram, gardener, goose, cat;
let kids      = [];
let rabbits   = [];
let mrPerkins = null;
let mrPerkinsTimer = 0;
let characterPositions = [];
let groundhog = null;
let groundhogTimer = 0;

// Creatures & birds
let creatures   = [];
let birds_flock = [];

// Sounds
let birds, chewing, sheep, dirt, shine, fart, quackSound, rain, lightning, nightSound;
let shineVol = 0;

// Speech
let speechBubbles = [];
let ramSpeechTimer = 0;
let gardenerSpeechTimer = 0;

// Environment
let windX = 0;
let windTarget = 0;
let grassBlades = [];
let sunGlow = 0;

// Content moderation
let nsfwModel = null;
let nsfwReady = false;

// Hat images for face decorations
let hatImages = [];
let decorationsEnabled = true;
let hatTimeAlpha = 0;
let wasRaining = false;
let hatTimeActive = false;
let hatTimeTimer = 0;
let hatTimeDuration = 0;

// Group snap feedback
let groupSnapLabel = '';
let groupSnapAlpha = 0;

// Milestone sounds
let milestoneSounds = [];
let milestone67Sound = null;

// Photo snap sounds
let photoSounds = [];

// Panel cycle
let panelMode = 'gallery';
let panelModeTimer = 0;
let panelCycleIdx = 0;
let panelCycle = [];

// Weather
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

// Day/Night cycle
let timeOfDay      = 0.25;   // start at morning
let dayNightT      = Math.round(0.25 * 54000);  // sync frame counter
let daySpeed       = 1;      // arrow keys: up/down to change speed
let stars          = [];
let fireflies      = [];
