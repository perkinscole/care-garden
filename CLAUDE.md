# CARE Garden 2

Interactive garden simulation for Robert Adams Middle School. Students smile at a webcam to grow flowers, building a shared CARE score. Runs on a large TV in the school.

This branch is **CARE Garden 2**: the same garden and behaviour as the original pixel-art CARE Garden (which lives on `main` and is not replaced), with the garden drawn as a real 3D block world, like a voxel sandbox game. Smile photos stay real photos.

## Tech Stack
- **p5.js** — canvas, input, sound, the `setup()`/`draw()` loop
- **three.js** (`three.min.js`, r149) with **G3** (`js/g3.js`) — the project's own 3D block engine; the whole garden is drawn through it (see `docs/GARDEN_3D.md`)
- **PX** (`js/pixel.js`) — the project's own 2D pixel-art renderer; the dashboard, speech bubbles, forecast and banners go through it (see `docs/PIXEL_ART.md`)
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
`tools/shot.js` needs Playwright. Debug URL parameters (`t`, `weather`, `speed`, `freeze`, `flowers`, `spawn`, `panel`, `score`, `seed`) are documented above `readDebugParams()` in `sketch.js`; `still=1` stops the camera sway and `shadows=0` turns shadows off. Headless Chromium renders the 3D view in software (a few frames a second), so give shots time (`--wait 8000`).

## File Structure

| File | Purpose |
|---|---|
| `index.html` | Entry point, loads all scripts in dependency order |
| `sketch.js` | Main `setup()` and `draw()` loop, smile snap logic, event triggers |
| `js/g3.js` | G3 engine: three.js scene, camera, light for time of day, block textures, box/limb/merged helpers, photos, retained models, card pictures |
| `js/g3_people.js` | PEOPLE3: builds and poses the 3D box people |
| `js/pixel.js` | PX engine: art-pixel grid, `PAL` palette, primitives, sprites, bitmap text, photos (2D overlay and dashboard) |
| `js/art/*.js` | 2D sprite definitions (`PX.define`) for the dashboard, forecast and hats; `people_art.js` also holds `PEOPLE` (looks, door logic) |
| `js/audio.js` | Safe sound helpers (`soundPlay`, `soundLoop`, ...) |
| `js/constants.js` | Config: flower types, character cards, phrases, sky and tint keyframes |
| `js/globals.js` | All mutable global state |
| `js/world.js` | Coordinate helpers: `worldToPx()`, `worldToScreen()` (camera projections), `nightAmount()` |
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
| `docs/GARDEN_3D.md` | The 3D contract: units, the block look, G3 API, how modules draw, module contracts |
| `docs/PIXEL_ART.md` | The 2D pixel-art contract for the dashboard and overlays |
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

### The 3D block world and coordinates
- The garden (top two thirds of the screen) is a three.js scene on its own canvas (`#garden3d`) behind the p5 canvas, which is kept clear over the garden and draws the dashboard and 2D overlays on top.
- Game logic still uses world coords normalized 0-1: `wy=0` is the back of the lawn at the school sidewalk, `wy=1` the front edge. In 3D, 1 unit = 1 block; the lawn is `G3.GW` x `G3.GD` (36 x 18) blocks; `G3.pos(wx, wy, y)` / `G3.place(obj, wx, wy, y)` convert. A grown-up is 2 blocks tall.
- Everything is built from boxes with crisp pixel textures (`G3.box`, `G3.limb`, `G3.merged`, `G3.blockBox`, `G3.pixelTex`). No curved shapes. Art is original: do not copy any game's textures or characters.
- Scenery functions are marked `fn.g3 = true`, entity classes `static g3 = true`; `draw()` gets its model with `G3.model(this, build)` and poses it. Models vanish when `draw()` stops being called for their object.
- `G3` lights the scene for time of day and weather (`G3.setLight`, from `TINT_KEYFRAMES`); night glows are emissive materials driven by `G3.night`.
- `worldToPx(wx, wy)` / `G3.artAt(wx, wy, height)` give ART pixels through the camera, for 2D overlays (speech bubbles). The 2D layer is a grid of art pixels: 640x360 on a 1080p screen (`PX.W`, `PX.SH`), each `PX.S` (3) screen pixels; the dashboard is the rows below `PX.H` (240).
- Smile photos are never pixelated or recoloured: `G3.photo(img, size)` in the garden, `PX.photo` in the dashboard.
- Module contracts (school doors, flowers' `head3`/`foot3`, speech bubbles, card pictures) are in `docs/GARDEN_3D.md`.

### Smile → Flower Pipeline
1. ml5 faceApi detects faces and expressions every frame
2. If a face smiles (>75% happy) for 5+ frames, a snap triggers
3. Co-smiling faces nearby are bundled (up to 6 per group)
4. nsfwjs checks the frame is safe
5. Face images (square, at most 128px) are shown as real photos in the flower's bloom with `G3.photo`
6. `careScore` increments, stats save to localStorage

### Day/Night Cycle
- `DAY_CYCLE_DURATION = 54000` frames (~15 min full cycle)
- Night is compressed to ~22% of the cycle
- The sky is a banded gradient from `skyStops()` set as the 3D scene's background (`G3.setSky`)
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
