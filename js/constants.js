// ================================================================
// File: constants.js
// Author: Cole Perkins
// Date Created: March 28, 2026 (refactored April 1, 2026)
// Last Modified: April 11, 2026
// Description: All configuration constants for the CARE Garden,
//   including timing, thresholds, color keyframes, and character data.
// ================================================================

// ── Constants & Data ─────────────────────────────────

// Flower spawning, gallery, and smile detection thresholds
const FLOWER_COOLDOWN      = 5;
const MAX_GALLERY          = 6;
const SMILE_HOLD_REQUIRED  = 5;
const SNAP_COOLDOWN        = 1000;
const PANEL_CYCLE_DURATION = 20000;
const MAX_FLOWERS          = 1000;
const MAX_GROUP_FACES      = 6;

// Day/night cycle timing and ambient element counts
// ── Day/Night Cycle ──────────────────────────────────
const DAY_CYCLE_DURATION   = 54000;  // frames at 60fps ≈ 15 min full cycle
const NUM_STARS            = 120;
const NUM_FIREFLIES        = 10;

// Sky gradient keyframes keyed by normalized time-of-day (0..1)
// Sky color keyframes: [timeOfDay, hue, saturation, lightnessTop, lightnessBottom]
// Sky keyframes — hue transitions between orange(25) and blue(220+) desaturate
// through the crossover so green/purple are never visible
const SKY_KEYFRAMES = [
  { t: 0.00, hue: 230, sat: 40, litTop: 12, litBot: 18 },   // midnight
  { t: 0.03, hue: 230, sat: 35, litTop: 14, litBot: 22 },   // pre-dawn
  { t: 0.05, hue: 220, sat: 10, litTop: 40, litBot: 48 },   // pre-dawn wash out
  { t: 0.07, hue: 30,  sat: 10, litTop: 50, litBot: 58 },   // dawn fade in
  { t: 0.09, hue: 25,  sat: 60, litTop: 55, litBot: 65 },   // dawn (orange)
  { t: 0.11, hue: 30,  sat: 10, litTop: 72, litBot: 70 },   // dawn wash out
  { t: 0.13, hue: 210, sat: 10, litTop: 80, litBot: 74 },   // morning fade in
  { t: 0.15, hue: 210, sat: 45, litTop: 88, litBot: 76 },   // morning (blue)
  { t: 0.50, hue: 210, sat: 45, litTop: 90, litBot: 78 },   // midday
  { t: 0.52, hue: 210, sat: 10, litTop: 86, litBot: 75 },   // midday wash out
  { t: 0.54, hue: 30,  sat: 10, litTop: 80, litBot: 70 },   // golden fade in
  { t: 0.56, hue: 30,  sat: 65, litTop: 78, litBot: 68 },   // golden hour
  { t: 0.64, hue: 15,  sat: 55, litTop: 55, litBot: 50 },   // sunset (orange)
  { t: 0.66, hue: 20,  sat: 10, litTop: 44, litBot: 44 },   // sunset wash out
  { t: 0.68, hue: 235, sat: 10, litTop: 36, litBot: 38 },   // dusk fade in
  { t: 0.72, hue: 240, sat: 45, litTop: 30, litBot: 35 },   // dusk (blue)
  { t: 0.78, hue: 235, sat: 40, litTop: 14, litBot: 20 },   // night begins
  { t: 0.90, hue: 230, sat: 40, litTop: 12, litBot: 18 },   // deep night
  { t: 1.00, hue: 230, sat: 40, litTop: 12, litBot: 18 },   // midnight (wrap)
];

// Ground gradient keyframes keyed by normalized time-of-day (0..1)
// Ground color keyframes: [timeOfDay, hue, satHorizon, litHorizon, satFront, litFront]
const GROUND_KEYFRAMES = [
  { t: 0.00, hue: 108, satH: 20, litH: 16, satF: 35, litF: 10 },
  { t: 0.07, hue: 108, satH: 28, litH: 35, satF: 48, litF: 22 },
  { t: 0.15, hue: 108, satH: 30, litH: 42, satF: 55, litF: 28 },
  { t: 0.50, hue: 108, satH: 30, litH: 42, satF: 55, litF: 28 },
  { t: 0.60, hue: 100, satH: 25, litH: 35, satF: 45, litF: 22 },
  { t: 0.72, hue: 105, satH: 20, litH: 22, satF: 35, litF: 14 },
  { t: 0.78, hue: 108, satH: 18, litH: 16, satF: 30, litF: 10 },
  { t: 1.00, hue: 108, satH: 20, litH: 16, satF: 35, litF: 10 },
];

// Score thresholds that trigger a confetti celebration
const CONFETTI_MILESTONES = [
  1,25,50,67,100,150,200,250,300,350,400,500,750,
  1000,1500,2000,3000,4000,5000,6000,7000,8000,9000,10000
];

// Flower species definitions: petal geometry, disc size, scale range, and stem style
const FLOWER_TYPES = [
  { name:'daisy',     petalCount:13, petalLen:44, petalWidth:7,  petalShape:'narrow',   discSize:45, sizeRange:[0.4,0.8], stemStyle:'straight' },
  { name:'tulip',     petalCount:6,  petalLen:52, petalWidth:18, petalShape:'cup',       discSize:35, sizeRange:[0.4,0.8], stemStyle:'straight' },
  { name:'poppy',     petalCount:4,  petalLen:48, petalWidth:22, petalShape:'round',     discSize:50, sizeRange:[0.4,0.8], stemStyle:'droop'    },
  { name:'sunflower', petalCount:16, petalLen:50, petalWidth:10, petalShape:'pointed',   discSize:65, sizeRange:[0.4,0.8], stemStyle:'thick'    },
  { name:'cosmos',    petalCount:8,  petalLen:42, petalWidth:14, petalShape:'notched',   discSize:40, sizeRange:[0.4,0.8], stemStyle:'wispy'    },
  { name:'rose',      petalCount:12, petalLen:28, petalWidth:16, petalShape:'spiral',    discSize:35, sizeRange:[0.4,0.8], stemStyle:'thorny'   },
  { name:'lily',      petalCount:6,  petalLen:58, petalWidth:16, petalShape:'reflexed',  discSize:40, sizeRange:[0.4,0.8], stemStyle:'straight' },
  { name:'anemone',   petalCount:7,  petalLen:38, petalWidth:18, petalShape:'round',     discSize:48, sizeRange:[0.4,0.8], stemStyle:'wispy'    },
];

// Character info-card data displayed in the side panel
const CHARACTER_CARDS = [
  {
    id:'ram', name:'RAMY THE RAM', title:'Mascot & Spirit Animal',
    body:'Ramy roams the garden freely, grazing on the flowers that kindness grows. He is happiest when the field is full, a reminder that when we care for each other, everyone is nourished. Watch him wander, and keep smiling to keep him fed.',
    color:[30,60,62]
  },
  {
    id:'gardener', name:'THE GARDENER', title:'Our Teachers, Parents & Staff',
    body:'The gardener tends every bloom with patience and purpose. Like the adults in our community — teachers, parents, and staff — they show up every day to water, guide, and nurture. Nothing in this garden grows without their care.',
    color:[140,55,45]
  },
  {
    id:'kids', name:'THE STUDENTS', title:'The Heart of Robert Adams',
    body:'Students explore, discover, and carry beauty with them wherever they go. Each flower picked is a moment of wonder taken home. You are not just part of this garden — you are what makes it bloom.',
    color:[220,65,50]
  },
  {
    id:'school', name:'ROBERT ADAMS M.S.', title:'Our Home Away From Home',
    body:'Standing at the center of our community, Robert Adams is more than a building — it is the soil from which futures grow. Every hallway, classroom, and face here is part of something bigger than any one of us.',
    color:[10,55,38]
  },
  {
    id:'goose', name:'THE GOOSE', title:'Local Menace',
    body:'quack.\n\nquack.',
    color:[25,65,45]
  },
  {
    id:'mrperkins', name:'MR. PERKINS', title:'Creator of the CARE Garden',
    body:'A very proud teacher. Mr. Perkins built this space to celebrate kindness, compassion, and community one smile at a time. When you grow a flower, you make him proud!',
    color:[210,55,35]
  },
  {
    id:'cat', name:'THE CAT', title:'Self-Appointed Garden Supervisor',
    body:'Nobody hired her. Nobody asked. But she shows up every day to inspect the flowers, stalk the butterflies, and nap in the sun. She tolerates the rain about as well as she tolerates everyone else.',
    color:[0,0,18]
  },
  {
    id:'mrconant', name:'MR. CONANT', title:'Head of the CARE Team',
    body:'A beloved teacher and proud member of the community. Mr. Conant leads the CARE team with heart and is always looking out for his students. If you see him, he is probably looking for Adin or Erin.',
    color:[200,50,38]
  },
  {
    id:'principal', name:'PRINCIPAL MANNING', title:'Principal',
    body:'Ms. Manning greets every student with a smile and opens the door rain or shine. She leads Robert Adams with heart and makes sure everyone feels welcome.',
    color:[320,50,42]
  },
  {
    id:'staff', name:'OUR STAFF', title:'Teachers, Administrators & Staff',
    body:'Our wonderful teachers, administrators, and staff — like our amazing custodian Pedroh — show up every day ready to work and make our school run! Thank you for everything you do!',
    color:[280,45,40]
  }
];

// Speech bubble phrases for each character
const RAM_PHRASES = [
  "Baaaa!", "Nom nom nom...", "Go Rams!",
  "Ooh, tasty!", "More flowers please!", "*munches happily*"
];

const GARDENER_PHRASES = [
  "Growing strong!", "Water every day!", "I love this garden!",
  "Bloom, little one!", "Every flower matters.", "So beautiful!"
];

const KID_PHRASES = [
  "Wow! So pretty!", "Go Rams!", "Look at this one!", "Can I keep it?",
  "So colorful!", "I love it here!", "Best school ever!", "CARE garden rocks!"
];

const CAT_PHRASES = [
  "Meow.", "...", "*stares intensely*", "Almost had it!",
  "Mrrrow.", "*ignores everyone*", "Mine.", "*slow blink*"
];

const PERKINS_PHRASES = [
  "I love RAMS!", "What a beautiful garden!", "Go Rams!",
  "Keep smiling!", "This is amazing!", "I'm so proud of you all!",
  "What a great community!", "CARE makes a difference!"
];

// Mr. Conant (CARE team lead) phrases
const CONANT_PHRASES = [
  "What an awesome garden!", "Go Patriots!",
  "Where's Adin?", "Where's Erin?",
  "CARE makes us stronger!", "Keep being kind!"
];

// Principal (Ms. Manning) phrases
const PRINCIPAL_PHRASES = [
  "Good morning!", "Welcome to Robert Adams!",
  "Have a wonderful day!", "Go Rams!",
  "Learn something new today!", "You make us proud!"
];

// Teacher names for speech bubbles during arrival
const TEACHER_NAMES = [
  "Ms. Going", "Ms. Rice", "Ms. Gavan", "Ms. Malinn",
  "Mr. Nauss", "Mr. Perry"
];

const TEACHER_GREETINGS = [
  "Good morning!", "Ready to learn!", "Let's go, Rams!",
  "Great day ahead!", "Hello everyone!", "Go Rams!"
];
