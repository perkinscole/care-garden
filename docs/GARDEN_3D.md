# CARE Garden 2: the 3D block garden

CARE Garden 2 is the same garden with the same behaviour, drawn as a real
3D world built out of boxes, like a voxel sandbox game. The art is our own:
take only the idea of a world made of blocks. Do not copy any game's
textures, creatures, characters, skins, logo, font or menus.

The garden (the top two thirds of the screen) is rendered with three.js
(`three.min.js`, r149, global `THREE`) by `G3` in `js/g3.js`, on its own
canvas behind the p5 canvas. The dashboard, speech bubbles, the forecast
strip and banners are still 2D pixel art drawn with `PX` on the p5 canvas
(see `PIXEL_ART.md`). Game logic is unchanged and still works in world
coordinates (`wx`, `wy` from 0 to 1).

## The world

- 1 unit = 1 block. `G3.T` = 1/16 block = one texel. +x right, +y up, +z
  toward the viewer.
- The lawn is `G3.GW` (36) blocks wide and `G3.GD` (18) deep. `wy = 0` is
  z = 0, the back of the lawn at the school sidewalk; `wy = 1` is z = 18,
  the front edge. `wx = 0.5` is x = 0. `G3.pos(wx, wy, y)` gives the point,
  `G3.place(obj, wx, wy, y)` puts an object there.
- The school stands behind the lawn (z < 0); the town and hills are
  further back and off to the sides. The camera stands in front at about
  (0, 14, 44), looks toward the school doors and sways slowly. The top of
  the view at the school is about 9 blocks up; the lawn at the back of the
  view is about 60% of the screen width, so there is room for scenery
  either side of the school.
- Sizes: a grown-up is 2 blocks tall (head 0.5 cube, torso 0.5 wide x 0.75
  tall x 0.25 deep, arms and legs 0.25 x 0.75 x 0.25). Students are about
  1.5 blocks. The ram is about 1.3 tall and 1.9 long. A flower's photo is
  1.5-2 blocks across, on a stem 2-4 blocks tall.

## The look

- **Boxes only.** Everything is axis-aligned boxes (limbs and heads may
  rotate as whole boxes). No spheres, cylinders, cones or curved surfaces.
  Round things are cubes or stacks of slabs (a cube sun, slab clouds, a
  canopy of leaf cubes, staircase hills and roofs).
- **Texels.** Detail is 1/16-block texels: build small things from boxes
  whose sizes are multiples of `G3.T` (usually 1/16, 1/8, 1/4), and paint
  faces with tiny pixel textures (`G3.pixelTex`, 8x8 for a head's face,
  16x16 for a block) shown crisp, never smooth.
- **Blocks.** Terrain and buildings use the flecked block textures in
  `g3.js` (`grass`, `dirt`, `stone`, `cobble`, `pavement`, `asphalt`,
  `brick`, `brick_dark`, `sandstone`, `planks`, `planks_white`, `log`,
  `leaves`, `leaves_light`, `leaves_pine`, `roof`, `roof_red`, `concrete`,
  `white`, `glass`, `water`, `wool`, `sand`, `cloud`). Add more with
  `G3.defineBlock`. Use `PAL` colours (`js/pixel.js`) and `PX.ramp(hue)`.
- **Box people and animals.** A head box, a torso box, and arm and leg
  boxes that swing from the shoulder and hip (`G3.limb`). Nothing bends at
  a knee or elbow. Faces, hair, shirts are painted on with pixel textures
  or added as thin boxes (a hair cap, a beard slab, glasses, a skirt).
- **Photos stay photos.** Smile photos and the camera image are never
  pixelated, recoloured or redrawn. `G3.photo(img, size)` shows the real
  photo on a flat square; build the blocks around it.
- **Light.** `G3` lights the scene for the time of day and the weather and
  casts shadows; do not darken things yourself. Things that glow at night
  (windows, lamps, fireflies) use an emissive or basic material whose
  strength you set each frame from `G3.night` (0 day .. 1 night).
- **Readable on a TV across a room.** Bold shapes, strong colours.

## G3 API

```js
G3.scene, G3.camera, G3.frame, G3.night
G3.pos(wx, wy, y, out)            // -> THREE.Vector3 on/above the lawn
G3.place(obj, wx, wy, y)
G3.artAt(wx, wy, y)               // -> { x, y } ART pixels on the p5 canvas (speech bubbles)
G3.toArt(vec3)                    // same for any 3D point
G3.fromArt(ax, ay, lift, out)     // art pixel -> point in the air over the lawn
G3.skyPoint(u, v, dist, out)      // screen fraction (0..1, 0..1) -> far point in the sky
G3.face(model, dx, dz, rate)      // turn a model toward its movement (models face +z)
G3.YAW.front / right / back / left

G3.mat(color, opts)               // cached flat material; opts { emissive, basic, transparent, opacity }
G3.pixelTex(key, w, h, g => {})   // cached crisp canvas texture (key null = uncached)
G3.texMat(tex, opts)              // cached material from a texture
G3.blockTex(name), G3.blockMat(name), G3.defineBlock(name, base, [flecks], opts)

G3.box(w, h, d, mat, x, y, z)     // mesh centred on its origin; mat = material | colour | array of 6
                                  //   face order [+x, -x, +y top, -y, +z front, -z back]
G3.limb(w, h, d, mat)             // Group pivoted at the top of the box (arms, legs, tails)
G3.merged([{x,y,z,w,h,d,c}])      // many small coloured boxes baked into one mesh
G3.blockBox(w, h, d, tex, x, y, z, opts)   // big box, texture repeats once per block;
                                  //   tex = name | { top, side, bottom, front, back, left, right }
G3.photo(img, size)               // unlit real photo on a square facing +z

G3.model(owner, build)            // retained model for a game object (see below)
G3.forget(owner)                  // drop it now
G3.cardArt(id, build, opts)       // I SPY card picture rendered from a model
```

Boxes cast and receive shadows by default. Set `mesh.castShadow = false`
on big flat ground pieces, far scenery and anything transparent.

Performance matters: this runs all day on a school PC. Share materials
and geometry through the cached helpers, bake many small static boxes
into one mesh with `G3.merged`, and never create geometry, materials or
textures per frame. A person should be about 10-20 meshes; a flower 2-3.

## How modules draw

`sketch.js` calls the same functions as before, every frame, but only if
they are marked for 3D.

**Scenery** (`drawTown`, `drawGround`, `drawTrees`, `drawGrass`,
`drawSchool`, `drawPuddles`, `drawSkyLayer`, `drawWeatherSky`,
`updateAndDrawFireflies`, `drawWeatherFront`): build your objects once,
add them to `G3.scene`, then only update what moves.

```js
let _trees = null;
function drawTrees() {
  if (!_trees) { _trees = new THREE.Group(); /* build */ G3.scene.add(_trees); }
  /* per-frame sway, lights... */
}
drawTrees.g3 = true;
```

**Entities** (flowers, people, animals, creatures): `draw()` asks for the
model and poses it from the object's state. The model is removed
automatically the first frame `draw()` is not called for that object.

```js
class Rabbit {
  static g3 = true;
  draw() {
    const m = G3.model(this, () => buildRabbit());   // built once
    G3.place(m, this.wx, this.wy, hopHeight);
    G3.face(m, this.vx * G3.GW, 0, 0.3);
    m.userData.earL.rotation.x = ...;
  }
}
```

Keep references to the parts you animate in `model.userData`. Work out
poses from the same state the old 2D `draw()` used (walk phase, `dir`,
state names); the old sprite frame names tell you which poses exist.
Delete the old 2D drawing code you replace.

## Contracts between modules

- **Speech bubbles** are unchanged 2D: `new SpeechBubble(text, getPos)` /
  `PEOPLE.say(text, getPos, gone)`, where `getPos()` returns ART pixels for
  the point just above the speaker's head: use
  `G3.artAt(wx, wy, headTopInBlocks + 0.3)`.
- **`worldToPx(wx, wy)`** now returns where that lawn point appears
  through the camera (art pixels). Fine for 2D overlays and screen-space
  logic; never use it to place 3D things.
- **Flying creatures** (butterflies, bees, birds) keep their logic in
  screen pixels (`x`, `y`), which the cat reads. Draw them at
  `G3.fromArt(x / PX.S, y / PX.S, lift)`.
- **School.** The front wall is at z = 0; the sidewalk runs along the
  front of the building from z = 0 to z = 1.2 (that is `wy` 0 to about
  0.07) at lawn level. The main entrance is a pair of doorways side by side at the
  middle of the building, one either side of `wx = 0.5`: people aim for
  `wx = 0.5 +/- 0.014..0.022` (x = +/-0.5..0.8 blocks, see `PEOPLE.doorX`),
  so each doorway is about 1.2 blocks wide and 2.25 tall, spanning x from
  0.1 to 1.3 (and mirrored), with a dark open inside that people walk into
  and out of. `PEOPLE.goIn` / `PEOPLE.comeOut` in `js/art/people_art.js`
  hold the walking logic in world coordinates.
- **Flowers** keep their fields (`wx`, `wy`, `hsl`, `type`, `imgs`, `size`,
  `targetSize`, `restSize`, `baseSize`, `age`, `boost()`, `dispose()`,
  `blooms`). `footPos()`, `headPos(i)` and `height()` still answer in art
  pixels (projected), and two new methods answer in blocks:
  `foot3(out)` and `head3(i, out)` return `THREE.Vector3` scene positions
  of the base of the stem and the centre of bloom `i`. People and animals
  that reach for, water, sniff or eat a flower aim at those.
- **Tiny flower.** `makeTinyFlower3(hsl)` (in `flowers.js`) returns a small
  hand-held flower model about 0.6 blocks tall with its origin at the
  bottom of the stem. Callers must cope with it not existing yet
  (`typeof makeTinyFlower3 === 'function'`).
- **People.** `PEOPLE3` in `js/g3_people.js` builds and poses box people;
  `PEOPLE.look(spec)` descriptions still say who someone is.
- **Card art.** `CARD_ART.<id>` for `ram`, `gardener`, `kids`, `school`,
  `goose`, `mrperkins`, `cat`, `mrconant`, `principal`, `staff`: register
  with `G3.cardArt(id, build)` so the cards show the 3D models.
- **Sounds** as before (`js/audio.js`).

## Checking your work

```
python3 server.py 8000 &
node tools/shot.js "http://localhost:8000/?t=0.3&flowers=30&spawn=kids&seed=4&still=1" out.png
node tools/shot.js "http://localhost:8000/?t=0.3&seed=4&still=1" crop.png --clip 600,300,400,300 --zoom 3
```

`still=1` stops the camera sway (repeatable shots); `shadows=0` turns
shadows off. The other debug parameters are listed above
`readDebugParams()` in `sketch.js`. Look at morning, golden hour, night and
a storm, and read the console output the tool prints.
