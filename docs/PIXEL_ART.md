# CARE Garden 2 pixel-art guide (2D layer)

> In CARE Garden 2 the garden itself is a 3D block world: see
> `GARDEN_3D.md`. This page covers the 2D layer that is still drawn with
> `PX`: the dashboard, I SPY cards, speech bubbles, the forecast strip,
> banners and the hats over the camera view. Parts of it that describe
> drawing the garden (depth sorting, tints, the sky layer, the school
> contract) are history.

Everything in the 2D layer is blocky pixel art drawn on one shared grid of "art pixels".
This page is the contract every drawing module follows. Read it before you
touch any `draw` code.

## The grid

`js/pixel.js` defines `PX`. On a 1080p TV one art pixel is 3×3 screen pixels:

| Name | 1080p value | Meaning |
|---|---|---|
| `PX.S` | 3 | screen pixels per art pixel (always an integer) |
| `PX.W` | 640 | art pixels across |
| `PX.SH` | 360 | art pixels down the whole screen |
| `PX.H` | 240 | art pixels down the garden (top two thirds); the dashboard is `PX.H..PX.SH` |
| `PX.HOR` | 97 | art y of the horizon |

Other screens give other numbers (the art height is always 360–719), so lay
things out from `PX.W`, `PX.H` and `PX.HOR`. Never hard-code 640 or 240.

`worldToPx(wx, wy)` turns world coordinates (0–1) into the art pixel where
something touches the ground. `wy = 0` is the horizon, `wy = 1` the front edge.

**There is no depth scaling.** Every character is drawn at one size wherever
it stands; depth comes from its y position and from draw order (things are
sorted by `wy`). Do not use `depthScale()` in pixel code. Sprites are never
rotated or scaled by fractions: that produces uneven "mixels".

Game logic keeps working in world units (and creatures keep `x`/`y` in screen
pixels, which the cat reads). Only drawing changes.

## Turning a module into pixel art

`sketch.js` calls every draw function through `PX.call(fn)` and every entity
through `PX.drawEntity(obj)`. Until you mark them, they run as old
screen-pixel p5 code. Once converted:

```js
function drawTrees() { ... }
drawTrees.pixel = true;          // functions

class Rabbit {
  static pixel = true;           // classes with a draw() method
  ...
}
```

Pixel code must not call p5 drawing functions (`rect`, `fill`, `ellipse`,
`push`, `text`, `image` …); they would be scaled 3×. Use `PX` for all of it.
p5 maths and state (`sin`, `random`, `lerp`, `frameCount`, `millis`) are fine.

`js/characters/rabbit.js` with its sprite in `js/art/animals_art.js` is the
worked example. Copy its shape.

## Drawing API (art pixels, integers)

```js
PX.rect(x, y, w, h, col)            PX.px(x, y, col)
PX.line(x0, y0, x1, y1, col, t=1)   PX.box(x, y, w, h, border, fill)
PX.ellipse(cx, cy, rx, ry, col)     PX.circle(cx, cy, r, col)     PX.ring(cx, cy, r, col)
PX.poly([[x, y], ...], col)         PX.panel(x, y, w, h, fill, border, r=1)
PX.dither(x, y, w, h, col, 0.25|0.5|0.75)
PX.shadow(cx, y, w)                 // soft contact shadow under feet
PX.alpha(a, () => { ... })          // draw a block at opacity a
PX.scaled(x, y, k, () => { ... })   // integer enlargement (card art only)

PX.define(name, { pal, frames, anchor })   // see Sprites
PX.spr(name, x, y, { frame, flip, pal, alpha })
PX.anim(count, hold, offset)        // looping frame index from the frame counter

PX.text(str, x, y, { color, font, align, scale, maxW, outline, shadow })
PX.measure(str, font, scale)        PX.wrap(str, maxW, font, scale)

PX.hsl(h, s, l)                     // -> '#rrggbb'
PX.ramp(h, s, l)                    // -> { o, d, m, l, h } shaded ramp for a runtime hue
PX.mix(a, b, t)

PX.photo(img, cx, cy, r)            // a real photo, cropped square (2r+1 across)
PX.light(() => { ... })             // draw after the night tint (glows)
```

Colours are `'#rrggbb'` strings. Coordinates are rounded for you, but think
in whole pixels.

## Sprites

```js
PX.define('rabbit', {
  pal: { o: PAL.ink, w: PAL.g1, s: PAL.g2, p: PAL.pi2, e: PAL.black },
  frames: {
    sit:  [ '....oo..', '...owpo.', ... ],
    leap: [ ... ],
  },
});
PX.spr('rabbit', x, y, { frame: 'leap', flip: this.dir < 0 });
```

- One character per pixel; `.` is transparent. Every row in a frame must be
  the same width. `PX.define` warns in the console about ragged rows and
  letters missing from the palette, so check the console.
- Author sprites **facing right**. `flip: true` mirrors them.
- The anchor defaults to bottom-centre, the feet, so `PX.spr(name, x, y)`
  stands the sprite on ground point `(x, y)`.
- `frames` can be an object (named frames) or an array (numbered).
- Recolour at draw time with `pal`: `PX.spr('kid', x, y, { pal: { s: ramp.m } })`.
  Recolours are cached per colour combination, so choose from a small fixed
  list of colours rather than a fresh random hue for every character.
- Sprite definitions live in `js/art/*.js`, which must not call p5 at load
  time. `tools/sprites.html` shows every sprite enlarged.

Big structures (the school, hills, roads) are better drawn with `PX.rect`
and friends than typed out as giant sprites. Small repeated details (a
window, a door, a car, a tree) are good sprites.

## Block style (CARE Garden 2)

This version of the garden is a **block world**: everything looks as if it
were built out of cubes, like a voxel sandbox game. The art is our own. Do
not copy any game's textures, creatures, characters, logo, font or menus;
take only the idea that the world is made of square blocks.

**The block.** One block is `PX.B` = 16 art pixels. Half blocks (8), quarter
blocks (4) and 2-pixel "chunks" are the only other sizes worth thinking in.
Buildings, trees, hills and clouds are stacks of whole, half and quarter
blocks whose edges land on that grid.

**Only rectangles.** No curves, circles, ellipses or slanted edges. Round
things become squares or stacks of rectangles (a square sun, a square moon,
clouds made of two or three slabs, square wheels, a tree canopy of cubes).
Slopes are staircases with steps of at least 2 pixels. Avoid `PX.ellipse`,
`PX.circle`, `PX.ring` and diagonal `PX.line`/`PX.poly`.

**Texture.** A surface is one flat colour with chunky 2×2 flecks of a
lighter and a darker shade (`PX.tex`), never smooth shading, dithering or
single-pixel noise. Three shades per material. Big surfaces show their
block seams: use `PX.block` / `PX.blocks`, which give each block a light top
and left edge and a dark bottom and right edge. Where the top of something
would be seen (a hedge, a canopy, a roof, a block of dirt) give it a
lighter 2–3 pixel "top face" strip so it reads as a cube, not a card.

**No black outlines.** Edges are a darker shade of the thing's own colour
(in sprites, point the old outline letter `o` at a dark shade of the main
material, or drop it). Contact shadows (`PX.shadow`, now a square) and the
light/dark faces keep things readable on the grass.

**Box people.** A person is six boxes: a head 8×8, a torso, two arms and
two legs, all straight-sided. Adults are 2 blocks tall (32: head 8, torso
12, legs 12), students about 1½ (24: head 8, torso 8, legs 8). Seen from
the side the torso is about 6 wide and each limb 4 wide; from the front or
back the torso is 8 wide with a 4-wide arm each side. Faces are a few
pixels on the flat front of the head: eyes two pixels wide (white +
pupil), a short mouth, hair as a cap of solid colour over the top rows and
down the back. Limbs stay rigid boxes and swing as stepped (sheared)
blocks; nothing bends at a knee or elbow. Each named person must still be
recognisable (see "Key People" in `CLAUDE.md`): hair colour and shape,
glasses, beard, clothes.

**Box animals.** Same idea: a box body, a box head, four post legs, a
block tail. The ram's horns are stepped blocks, the goose has a post neck.

**Flowers.** Stems are straight 2-pixel posts with square leaves. A bloom
is a ring of square petal blocks around the photo.

**Photos stay photos.** Smile photos are never pixelated, recoloured or
redrawn. `PX.photo(img, cx, cy, r)` now shows the real photo as a square
`2r+1` art pixels across; give it a dark 1-pixel frame and build the
blocks around it. The same goes for the gallery and the live camera view.

**Light.** The sun is top-left: top faces lightest, faces toward the
viewer mid, right-hand and under sides darkest.

**Palette.** Use `PAL` and `PX.ramp(hue)` as before. Don't invent near
duplicates of palette colours.

**Animation.** Two to four frames, held 6–10 game frames. Things move in
whole pixels; sway is a 1–2 pixel shift of a whole block. Particles
(confetti, sparkles, rain, splashes, hearts, dust) are little squares.

**Readability first.** This plays on a TV across a room. A character
should be recognisable from its silhouette.

### Block helpers

```js
PX.B                                   // 16: one block
PX.hash(x, y, seed)                    // repeatable 0..1 noise for a pixel
PX.tex(x, y, w, h, base, [flecks], amount=0.3, seed=0, cell=2)   // flecked fill
PX.block(x, y, w, h, {l, m, d}, { flecks, amount, seed })        // one bevelled face
PX.blocks(x, y, w, h, {l, m, d}, size=PX.B, { flecks, amount, seed })  // a wall of them
PX.cached(key, x, y, w, h, () => { ... })   // draw once (origin 0,0), stamp every frame
PX.shadow(cx, y, w)                    // square contact shadow
```

`PX.tex` and `PX.blocks` loop over pixels, so wrap anything bigger than a
block or two in `PX.cached` rather than redrawing it every frame.

## Day, night and weather

Draw everything in **daylight colours**. `sketch.js` tints the finished
garden for the time of day and for storms, so do not darken things yourself
with `nightAmount()`.

Things that glow at night (lit windows, lamps, fireflies, the moon's halo on
the ground) are drawn through `PX.light(() => { ... })`, which runs after the
tint. Gate them on `nightAmount()`.

The sky is a separate untinted layer behind the world. `drawSkyLayer()`
(sun, moon, stars, clouds) and `drawWeatherSky()` (storm clouds, rainbow,
far rain, lightning bolt) draw into it; `sketch.js` paints the dithered
gradient first. Those two functions are called with `PX` already aimed at
the sky layer, whose size is `PX.W × PX.H`.

Frame order: town → ground → trees → grass → school → puddles → tint →
scenery lights → characters and flowers (sorted by `wy`, on their own
tinted layer) → sky (slid in behind) → speech bubbles → `drawWeatherFront()`
→ flying creatures → fireflies → forecast → labels.

The flagpole stands against the school wall just left of the tower, so
everyone on the sidewalk passes in front of it. The forecast strip owns the
top-right corner (art y 3–21).

## Contracts between modules

- **Speech bubbles.** `new SpeechBubble(text, getPos)`: `getPos()` returns
  **art pixels** `{ x, y }` for the point just above the speaker's head. The
  bubble draws itself above that point. Anyone who can walk off or go
  inside should speak through `PEOPLE.say(text, getPos, gone)`, which
  leaves the bubble where it was and fades it once the speaker has left.
- **Card art.** Each character registers
  `CARD_ART.<id> = (x, y, tick) => { ... }`, drawing at 1× with the feet at
  `(x, y)`. Ids: `ram`, `gardener`, `kids`, `school`, `goose`, `mrperkins`,
  `cat`, `mrconant`, `principal`, `staff`. Keep each within about 60 wide and
  40 tall (the school may be 120×60); the card enlarges it. Art about 44
  wide or less leaves room for the card's text at double size.
- **Sizes.** Sprites that are repainted keep their names, frame names and
  anchors, and stay within a pixel or two of their old sizes unless the
  module that draws them is updated to match.
- **Tiny flower.** `drawTinyFlower(x, y, hsl)` draws a hand-held flower
  about 8 pixels tall and 7 wide whose stem bottom is at `(x, y)`.
- **Flowers** keep their fields (`wx`, `wy`, `hsl`, `type`, `imgs`, `size`,
  `targetSize`, `restSize`, `baseSize`, `age`, `boost()`, `dispose()`): the
  ram, the gardener and the students read them. A fresh flower is large,
  settles to a compact size after about 90 seconds, and boosts wear off, so
  never assume a height. Ask the flower: `footPos()` and `headPos(i)` give
  art-pixel positions as last drawn, `height()` its height, `blooms` how many
  heads it has.
- **Sounds.** Use `soundPlay`, `soundLoop`, `soundPause`, `soundStop` from
  `js/audio.js`; they are safe before a file has loaded.
- **School.** The main entrance is two pairs of doors either side of
  `wx = 0.5`. Door thresholds sit at art `y = PX.HOR + 3`, and the sidewalk
  runs along the front of the building from about `PX.HOR + 3` to
  `PX.HOR + 12`. People going inside walk to a spot in front of a door,
  turn, and step in seen from behind; people coming out step toward the
  viewer and turn at the sidewalk. Use `PEOPLE.goIn` and `PEOPLE.comeOut`
  in `js/art/people_art.js` rather than picking coordinates.

## Checking your work

```
python3 server.py 8000 &
node tools/shot.js "http://localhost:8000/?t=0.3&flowers=30&spawn=kids&seed=4" out.png
node tools/shot.js "http://localhost:8000/?t=0.3&seed=4" crop.png --clip 600,300,400,300 --zoom 3
node tools/shot.js "http://localhost:8000/tools/sprites.html?only=rabbit&zoom=10" sprites.png
```

Debug parameters (`t`, `weather`, `speed`, `freeze`, `flowers`, `spawn`,
`panel`, `score`, `seed`) are listed above `readDebugParams()` in
`sketch.js`. Look at morning, golden hour, night and a storm before calling
something finished, and read the console output the tool prints.
