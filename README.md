# CARE Garden

An interactive garden simulation built for **Robert Adams Middle School** in Holliston, MA. Students smile at a webcam to grow flowers, building a shared CARE score displayed on a large TV in the school.

Every smile plants a flower with the student's face at its center. Smile together and you'll grow a group flower. The garden lives and breathes on its own — characters wander, weather changes, and the sun rises and sets throughout the day.

## How It Works

1. Stand in front of the camera and **smile**
2. Hold your smile for about a second
3. A flower grows in the garden with your face in the center
4. Smile with friends nearby to grow a **group flower** (up to 6 faces!)
5. Watch your CARE score climb

## What You'll See

### The Garden
A living world with a full day/night cycle (~15 minutes per day), dynamic weather (sun, clouds, rain, storms), and a hand-drawn school building modeled after Robert Adams Middle School. The town of Holliston appears in the background with its church, town hall, and rail trail.

### The Characters

| Character | What They Do |
|---|---|
| **Ramy the Ram** | School mascot. Grazes on flowers, leaves behind "gifts" that bloom into new flowers. Kids can pet him! |
| **The Gardener** | Waters flowers to help them grow. Opens her umbrella in the rain. Runs from the goose. |
| **The Students** | Explore the garden, pick flowers, and pet the ram. |
| **The Goose** | Local menace. Chases the gardener. Quacks aggressively. |
| **The Cat** | Stalks butterflies and bees, naps in the sun, dramatically flees from rain. |
| **Principal Manning** | Greets students at the door each morning. Waves everyone inside when it rains. |
| **Teachers** | Walk to school at dawn, head home at dusk. |
| **Mr. Perkins** | Creator of the garden. Makes cameo appearances to cheer everyone on. |
| **Mr. Conant** | CARE team lead. Drops by looking for Adin or Mrs. Conant. |
| **Groundhog** | Pops up from a hole, looks around nervously, and disappears. |
| **Rabbits** | Hop across the screen. Panic during storms. |
| **Butterflies, Bees & Birds** | Flutter and fly through the garden during the day. |

### Weather & Time
- The sky transitions through dawn, morning, midday, golden hour, sunset, dusk, and night
- Weather cycles between sunny, cloudy, rainy, and stormy
- When it rains, hats appear on detected faces ("Hat Time!")
- Fireflies come out at night; stars twinkle overhead

### Dawn & Dusk
- At dawn, teachers and students with backpacks walk toward the school
- Principal Manning opens the door to greet them
- At dusk, everyone heads home — teachers, students with backpacks, and the principal says goodbye
- The gardener goes inside at night and returns at dawn

## Running Locally

No build tools required — it's plain HTML with script tags.

```bash
cd care-garden
python3 -m http.server 8000
```

Open **http://localhost:8000** in Chrome. You'll need to allow camera access.

> **Note:** The webcam requires HTTPS or localhost. If hosting remotely, use a service that provides HTTPS (GitHub Pages, Netlify, etc.).

## Keyboard Controls

| Key | Action |
|---|---|
| `M` | Mute / unmute audio |
| `R` | Force rain |
| `S` | Force sunny |
| `T` | Force storm |
| `D` | Jump to dawn |
| `N` | Jump to night |
| `G` | Jump to golden hour |
| `H` | Toggle hat decorations |
| `UP / DOWN` | Speed up / slow down day cycle |
| `LEFT / RIGHT` | Cycle character info panel |
| Click | Toggle fullscreen |

## Tech Stack

- **[p5.js](https://p5js.org/)** — Canvas rendering, animation, and sound
- **[ml5.js](https://ml5js.org/)** — Face detection with expression recognition (faceApi)
- **[nsfwjs](https://nsfwjs.com/)** — Content moderation on camera frames
- Plain HTML, no bundler or build step

## Project Structure

```
care-garden/
  index.html              Entry point — loads all scripts
  sketch.js               Main setup() and draw() loop
  style.css               Minimal styles
  js/
    constants.js           Config, keyframes, character cards, phrases
    globals.js             All mutable global state
    world.js               Coordinate system and day/night helpers
    scene.js               Sky, ground, trees, school building
    town.js                Town backdrop (shops, cars, walkers)
    weather.js             Weather state machine and rain/storm effects
    flowers.js             Flower class with petal types and face images
    creatures.js           Butterfly, Bee, Bird classes
    ui.js                  CARE score, gallery, speech bubbles, confetti
    facedetection.js       Face detection, smile tracking, hat overlays
    characters/
      ram.js               Ramy the Ram
      gardener.js          The Gardener
      kids.js              Kid + ArrivalKid (backpack students)
      goose.js             The Goose
      cat.js               The Cat
      rabbit.js            Rabbit
      mrperkins.js         Mr. Perkins (creator cameo)
      mrconant.js          Mr. Conant (CARE team lead cameo)
      groundhog.js         Groundhog
      principal.js         Principal Manning
      teacher.js           Teacher (dawn/dusk arrivals)
  images/
    hat1-5.png             Hat decoration overlays
  sounds/
    birds.mp3, rain.mp3, night.mp3, sheep.wav, ...
```

## The CARE Score

Every face captured becomes a flower and adds to the school's CARE score. The score is tracked with daily counts, weekly totals, and an all-time record — all saved in the browser's localStorage. Milestones trigger confetti celebrations.

## Credits

Built by **Cole Perkins** for the students, teachers, and staff of Robert Adams Middle School.
