# CARE Garden pixel-art guide

Everything on screen is pixel art drawn on one shared grid of "art pixels".
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

PX.photo(img, cx, cy, r)            // a real photo inside a stepped circle
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

## House style

**Sizes.** Adults about 30 art pixels tall, students about 22–24, the ram
about 22 tall and 30 long. The school's doors are sized for those people.

**Outline.** Characters, animals, flowers and held objects get a 1px
`PAL.ink` outline so they read against the grass. Scenery (buildings, trees,
hills, clouds) has no black outline: it uses darker shades of its own colour
for edges.

**Light.** The sun is top-left. Highlights go on top and left edges, shadows
on the bottom and right. Three or four shades per material is plenty.

**Palette.** Use `PAL` (in `js/pixel.js`). Ramps run light to dark
(`gr1`…`gr6`, `br1`…`br5`). For colours chosen at runtime (shirts, petals,
cars) use `PX.ramp(hue)` so they shade the same way. Don't invent near
duplicates of palette colours.

**No smooth anything.** No anti-aliasing, no gradients (band or dither
instead), no blur, no fractional positions, no rotation. Use transparency
only for whole-object fades and shadows.

**Animation.** Two to four frames go a long way: a two-frame walk plus an
idle, a blink, a one-pixel bob. Hold frames for 6–10 game frames. Sway is
done by shifting whole rows of pixels.

**Readability first.** This plays on a TV across a room. A character should
be recognisable from its silhouette, and each named person should be
recognisable as themselves (see "Key People" in `CLAUDE.md`).

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
  bubble draws itself above that point.
- **Card art.** Each character registers
  `CARD_ART.<id> = (x, y, tick) => { ... }`, drawing at 1× with the feet at
  `(x, y)`. Ids: `ram`, `gardener`, `kids`, `school`, `goose`, `mrperkins`,
  `cat`, `mrconant`, `principal`, `staff`. Keep each within about 60 wide and
  40 tall (the school may be 120×60); the card enlarges it.
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
  turn, and step in seen from behind: use `PEOPLE.goIn` in
  `js/art/people_art.js` rather than picking coordinates.

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
