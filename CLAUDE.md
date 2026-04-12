# CARE Garden

Interactive garden simulation for Robert Adams Middle School built with p5.js. Students smile at a webcam to grow flowers, building a shared CARE score. Runs on a large TV in the school.

## Tech Stack
- **p5.js** — canvas rendering, animation, sound
- **ml5.js** — face detection with expression recognition
- **nsfwjs** — content moderation on camera frames
- No build tools — plain HTML with `<script>` tags, run via local web server

## Running Locally
```
python3 -m http.server 8000
# Open http://localhost:8000 in Chrome
```

## File Structure

| File | Purpose |
|---|---|
| `index.html` | Entry point, loads all scripts in dependency order |
| `sketch.js` | Main `setup()` and `draw()` loop, smile snap logic, event triggers |
| `js/constants.js` | Config: flower types, character cards, phrases, sky/ground keyframes |
| `js/globals.js` | All mutable global state |
| `js/world.js` | Coordinate system: `worldToScreen()`, `depthScale()`, `nightAmount()` |
| `js/scene.js` | Sky, ground, trees, school building, stars, fireflies, sun arc |
| `js/town.js` | Town backdrop with shops, cars, walkers, bikers |
| `js/weather.js` | Weather state machine (sunny/cloudy/rainy/stormy/clearing) |
| `js/flowers.js` | `Flower` class with petal types, group flowers (2-6 faces) |
| `js/creatures.js` | `Butterfly`, `Bee`, `Bird` classes |
| `js/ui.js` | Smile stats (localStorage), gallery, CARE score, confetti, `SpeechBubble` |
| `js/facedetection.js` | Face detection, smile tracking, hat/crown decorations |
| `js/characters/ram.js` | Ram — grazes flowers, poops that become flowers |
| `js/characters/gardener.js` | Gardener — waters flowers, umbrella in rain, flees goose |
| `js/characters/kids.js` | Kid + ArrivalKid — pick flowers, pet ram, backpacks at dawn |
| `js/characters/goose.js` | Goose — chases gardener |
| `js/characters/cat.js` | Cat — stalks butterflies/bees, sleeps, shelters from rain |
| `js/characters/rabbit.js` | Rabbit — hops across screen |
| `js/characters/mrperkins.js` | Mr. Perkins — creator of the garden, cameo visits |
| `js/characters/mrconant.js` | Mr. Conant — CARE team lead, less frequent cameos |
| `js/characters/groundhog.js` | Groundhog — emerges from hole, looks around |
| `js/characters/principal.js` | Principal Manning — greets at door during dawn/dusk/rain |
| `js/characters/teacher.js` | Teacher — walks to/from school at dawn/dusk |

## Keyboard Controls
- `M` — mute/unmute audio
- `R` — force rain
- `S` — force sunny
- `T` — force storm
- `D` — jump to dawn
- `N` — jump to night
- `G` — jump to golden hour
- `H` — toggle face decorations (hats/crowns)
- `UP/DOWN arrows` — speed up/slow down day cycle (for testing)
- `LEFT/RIGHT arrows` — cycle I Spy character panel
- Click — toggle fullscreen

## Core Concepts

### Coordinate System
- World coords are normalized 0-1 for both X and Y
- `wy=0` is the horizon (far), `wy=1` is the front (close)
- `worldToScreen(wx, wy)` converts to pixel positions
- `depthScale(wy)` returns 0.4-0.9 for perspective sizing

### Smile → Flower Pipeline
1. ml5 faceApi detects faces and expressions every frame
2. If a face smiles (>75% happy) for 5+ frames, a snap triggers
3. Co-smiling faces nearby are bundled (up to 6 per group)
4. nsfwjs checks the frame is safe
5. Face images are clipped and embedded in a new flower's center
6. `careScore` increments, stats save to localStorage

### Day/Night Cycle
- `DAY_CYCLE_DURATION = 54000` frames (~15 min full cycle)
- Night is compressed to ~22% of the cycle
- Sky colors interpolate through keyframes with desaturation wash between orange/blue transitions to avoid green/purple artifacts
- Sun arcs from east to west with parabolic trajectory

### Hat Time
- Decorations (crowns, horns, tiaras, hat images) only appear during "Hat Time"
- Triggers when rain/storm starts — Principal Manning also appears
- Hat images are pre-processed one per frame at startup to remove backgrounds

### Dawn/Dusk Events
- Dawn (~0.05-0.12): Principal appears, ArrivalKids with backpacks + Teachers walk toward school
- Dusk (~0.62-0.70): Principal says goodbye, kids and teachers walk away
- Characters spawn in staggered waves (one every 30 frames)

### Stats Persistence
- `localStorage` stores daily smile counts, weekly totals, and all-time record
- All dates use local timezone (not UTC) to avoid off-by-one errors
- Dashboard cycles through: today's smiles, this week, record day

## Key People Referenced in Code
- **Cole Perkins** — author, Mr. Perkins character
- **Mr. Conant** — CARE team lead, looks for Adin and Mrs. Conant
- **Principal Manning** — principal, blonde hair, no glasses
- **Pedroh** — custodian, mentioned in staff card
- **Staff**: Ms. Going, Ms. Rice, Ms. Gavan, Ms. Malinn, Mr. Nauss, Mr. Perry, Ann Marie, Jyoti
