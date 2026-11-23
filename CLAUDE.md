# CARE Garden

Interactive garden simulation for Robert Adams Middle School built with p5.js. Students smile at a webcam to grow flowers, building a shared CARE score. Runs on a large TV in the school.

## Tech Stack
- **p5.js** — canvas, input, sound, the `setup()`/`draw()` loop
- **PX** (`js/pixel.js`) — the project's own pixel-art renderer; ALL drawing goes through it (see `docs/PIXEL_ART.md`)
- **ml5.js** — face detection with expression recognition
- **nsfwjs** — content moderation on camera frames
- No build tools — plain HTML with `<script>` tags, run via local web server

## Running Locally
```
python3 server.py            # serves the site and saves smile stats to stats.json
# Open http://localhost:8000 in Chrome   (python3 server.py 8080 for another port)
```
`python3 -m http.server 8000` also works, but then stats only persist in the browser.

## Checking changes without a camera
```
node tools/shot.js "http://localhost:8000/?t=0.9&weather=rainy&flowers=30&spawn=kids&seed=4" out.png
node tools/shot.js "http://localhost:8000/tools/sprites.html?zoom=8" sprites.png
```
`tools/shot.js` needs Playwright. Debug URL parameters (`t`, `weather`, `speed`, `freeze`, `flowers`, `spawn`, `panel`, `score`, `seed`) are documented above `readDebugParams()` in `sketch.js`.

## File Structure

| File | Purpose |
|---|---|
| `index.html` | Entry point, loads all scripts in dependency order |
| `sketch.js` | Main `setup()` and `draw()` loop, smile snap logic, event triggers |
| `js/pixel.js` | PX engine: art-pixel grid, `PAL` palette, primitives, sprites, bitmap text, photo masks, lights |
| `js/art/*.js` | Sprite definitions (`PX.define`) per area; no p5 calls at load time |
| `js/audio.js` | Safe sound helpers (`soundPlay`, `soundLoop`, ...) |
| `js/constants.js` | Config: flower types, character cards, phrases, sky and tint keyframes |
| `js/globals.js` | All mutable global state |
| `js/world.js` | Coordinate system: `worldToPx()`, `worldToScreen()`, `nightAmount()` |
| `js/scene.js` | Sky layer (sun, moon, stars, clouds), lawn, grass, trees, fence, school, fireflies |
| `js/town.js` | Town backdrop with shops, cars, walkers, bikers |
| `js/weather.js` | Weather state machine (sunny/cloudy/rainy/stormy/clearing) |
| `js/flowers.js` | `Flower` class with petal types, group flowers (2-6 faces) |
| `js/creatures.js` | `Butterfly`, `Bee`, `Bird` classes |
| `js/ui.js` | Smile stats (localStorage), gallery, CARE score, confetti, `SpeechBubble` |
| `js/facedetection.js` | Face detection, smile tracking, face brackets, hat/crown sprites |
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
| `docs/PIXEL_ART.md` | The pixel-art contract: grid, API, house style, module contracts |
| `tools/shot.js`, `tools/sprites.html` | Headless screenshots and a sprite sheet viewer |
| `fonts/` | Bundled pixel fonts (Tiny5, Press Start 2P; SIL Open Font License) |
| `server.py` | Static server plus `GET/POST /api/stats` |

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

### Pixel art and coordinates
- Everything is drawn on one grid of "art pixels": 640x360 on a 1080p screen (`PX.W`, `PX.SH`), each art pixel being `PX.S` (3) screen pixels. The garden is the top `PX.H` (240) rows; the dashboard is below.
- World coords are normalized 0-1 for both X and Y; `wy=0` is the horizon (far), `wy=1` is the front (close)
- `worldToPx(wx, wy)` gives the art pixel where something touches the ground
- There is NO depth scaling: every sprite is one size; depth is y-position and draw order (sorted by `wy`)
- Never call p5 drawing functions (`rect`, `fill`, `text`, `image`...) in draw code; use `PX.rect`, `PX.spr`, `PX.text`... Mark draw functions `fn.pixel = true` and classes `static pixel = true`
- Draw in daylight colours. `sketch.js` tints the finished garden for time of day and storms (`TINT_KEYFRAMES`); night glows go through `PX.light(fn)`
- Frame order and module contracts (speech bubbles, card art, school door position) are in `docs/PIXEL_ART.md`

### Smile → Flower Pipeline
1. ml5 faceApi detects faces and expressions every frame
2. If a face smiles (>75% happy) for 5+ frames, a snap triggers
3. Co-smiling faces nearby are bundled (up to 6 per group)
4. nsfwjs checks the frame is safe
5. Face images (square, at most 128px) are shown in the flower's center with `PX.photo`
6. `careScore` increments, stats save to localStorage

### Day/Night Cycle
- `DAY_CYCLE_DURATION = 54000` frames (~15 min full cycle)
- Night is compressed to ~22% of the cycle
- The sky is a dithered gradient from `skyStops()` on its own untinted layer behind the world
- Sun arcs from east to west; it glows and smiles while someone is smiling

### Hat Time
- Decorations (twelve pixel hats and crowns in `js/art/hats_art.js`) only appear during "Hat Time"
- Triggers when rain/storm starts — Principal Manning also appears
- Each tracked face keeps its own decoration, enlarged by a whole number of art pixels to fit the head

### Dawn/Dusk Events
- Dawn (~0.05-0.12): Principal appears, ArrivalKids with backpacks + Teachers walk toward school
- Dusk (~0.62-0.70): Principal says goodbye, kids and teachers walk away
- Characters spawn in staggered waves (one every 30 frames)

### Stats Persistence
- `localStorage` and the server's `stats.json` store daily smile counts, weekly totals, and all-time record
- All dates use local timezone (not UTC) to avoid off-by-one errors
- Dashboard cycles through: today's smiles, this week, record day

## Key People Referenced in Code
- **Cole Perkins** — author, Mr. Perkins character
- **Mr. Conant** — CARE team lead, looks for Adin and Mrs. Conant
- **Principal Manning** — principal, blonde hair, no glasses
- **Pedroh** — custodian, mentioned in staff card
- **Staff**: Ms. Going, Ms. Rice, Ms. Gavan, Ms. Malinn, Mr. Nauss, Mr. Perry, Ann Marie, Jyoti
