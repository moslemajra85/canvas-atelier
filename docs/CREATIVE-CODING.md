# Creative coding guide

This guide explains the ideas used by the starter butterfly. Read it alongside the code in the editor and change one value at a time.

## 1. The canvas mental model

A canvas is a bitmap: a rectangular grid of pixels. The context is the drawing tool used to change those pixels.

```js
ctx.fillStyle = "orange";
ctx.fillRect(20, 20, 100, 60);
```

Unlike HTML elements, a drawn rectangle does not remain an object you can select later. To move it, clear the canvas and draw the next frame at a new coordinate. This immediate-mode model is why animation functions usually follow the same cycle:

1. Clear or paint the background.
2. Update the scene state.
3. Draw the scene from that state.
4. Request the next frame.

The origin `(0, 0)` is the top-left. Positive x moves right and positive y moves down.

## 2. Paths and drawing state

Complex shapes use a path:

```js
ctx.beginPath();
ctx.moveTo(30, 30);
ctx.lineTo(160, 80);
ctx.stroke();
```

`beginPath()` starts a new path. Without it, later calls can accidentally restroke older path segments.

The context also holds state: color, line width, shadows, transparency, transform, clipping, and compositing mode. `save()` stores the state and `restore()` returns to it:

```js
ctx.save();
ctx.strokeStyle = "cyan";
ctx.lineWidth = 8;
// Draw with temporary state.
ctx.restore();
```

Every `save()` should have a corresponding `restore()`. Missing restores cause settings and transforms to leak into unrelated shapes.

## 3. Coordinate transforms

Transforms change the coordinate system rather than manually changing every point.

```js
ctx.save();
ctx.translate(width / 2, height / 2);
ctx.rotate(Math.PI / 4);
ctx.scale(0.8, 0.8);
ctx.fillRect(0, -5, 120, 10);
ctx.restore();
```

- `translate(x, y)` moves the origin.
- `rotate(radians)` rotates future drawing around the current origin.
- `scale(x, y)` stretches future drawing and coordinates.

Angles use radians. A full rotation is `Math.PI * 2`; a half turn is `Math.PI`; a quarter turn is `Math.PI / 2`.

The butterfly uses a negative scale on one axis to mirror a wing. This is more reliable than writing separate left- and right-wing algorithms.

## 4. Recursion

Recursion occurs when a function calls itself. A safe recursive drawing function needs:

- A **base case** that stops recursion.
- A **change** that moves each call toward the base case.
- A transform or parameter change so each generation looks different.

The starter uses:

```js
branch(level) {
  if (level > this.levels) return;

  // Draw this generation.

  ctx.save();
  ctx.scale(this.scale, this.scale);
  this.branch(level + 1);
  ctx.restore();
}
```

`level + 1` moves toward the base case. Scaling makes every generation smaller. The loop creates several child calls, producing a tree.

The work grows exponentially. With three children and five levels, the theoretical number of calls is:

```text
1 + 3 + 9 + 27 + 81 = 121
```

One additional level roughly triples the work. This is why recursion depth is both an artistic control and a performance control.

## 5. Symmetry and organic variation

Butterflies are visually legible because they are approximately bilateral. The starter draws the same wing structure with `side` equal to `-1` and `1`.

Randomness changes hue and a few parameters each time a `Butterfly` is constructed. Constrained randomness is more useful than changing everything:

```js
this.hue = 178 + Math.random() * 35;
```

This selects a hue from a narrow cyan range. The artwork varies but keeps its visual identity.

For reproducible art, replace `Math.random()` with a seeded pseudo-random function. A seed lets learners share and recreate an exact mutation.

## 6. Color, light, and compositing

HSL is useful in generative art because hue can be treated as a circular numeric parameter:

```js
ctx.strokeStyle = `hsl(${hue} 95% 55%)`;
```

- Hue chooses the color family from `0` through `360`.
- Saturation controls color intensity.
- Lightness controls the dark-to-light range.

The starter uses three lighting techniques:

1. A radial gradient creates a subtle center glow.
2. `shadowColor` and `shadowBlur` bloom bright strokes.
3. `globalCompositeOperation = "lighter"` adds overlapping colors, creating an emitted-light effect.

Always restore the compositing mode to `source-over` when normal drawing should resume. Additive blending can quickly wash out an entire scene.

## 7. Responsive and sharp rendering

The studio sizes the backing canvas using device pixel ratio while keeping learner coordinates in CSS pixels. `width` and `height` therefore represent the visible drawing size.

Do not hardcode the artwork center:

```js
ctx.translate(width / 2, height / 2);
```

Derive major sizes from the smaller viewport dimension:

```js
const size = Math.min(width, height) * 0.2;
```

Register a redraw because resizing clears the bitmap:

```js
draw();
onResize(draw);
```

## 8. Animation

Use `requestAnimationFrame` for browser-synchronized animation:

```js
let previousTime = 0;
let rotation = 0;

function animate(time) {
  const deltaSeconds = Math.min((time - previousTime) / 1000, 0.1);
  previousTime = time;
  rotation += deltaSeconds * 0.6;

  ctx.clearRect(0, 0, width, height);
  // Draw using rotation.
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

The browser supplies `time`. Using elapsed time rather than adding a fixed amount per frame makes motion similar on 60 Hz and 144 Hz displays. Capping a large delta prevents a huge jump when the tab resumes after being hidden.

## 9. Debugging artwork

Visual bugs are easier to isolate when you temporarily reduce the scene:

1. Set recursion levels to `0` or `1`.
2. Disable shadows and compositing.
3. Draw the origin as a bright circle.
4. Log important parameters.
5. Add one transform at a time.

Example transform marker:

```js
ctx.fillStyle = "red";
ctx.beginPath();
ctx.arc(0, 0, 5, 0, Math.PI * 2);
ctx.fill();
```

If the marker appears in the wrong place, the issue is coordinate state, not the shape algorithm. That distinction prevents random edits to unrelated code.

## 10. Cache expensive artwork

If a detailed object keeps its structure while moving, do not reconstruct every path every frame. Draw it to an offscreen canvas when it changes, then animate that bitmap:

```js
const layer = document.createElement("canvas");
const layerCtx = layer.getContext("2d");

// Expensive generation happens once.
drawDetailedObject(layerCtx);

function animate(time) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2 + Math.sin(time * 0.002) * 8);
  ctx.drawImage(layer, -layer.width / 2, -layer.height / 2);
  ctx.restore();
  requestAnimationFrame(animate);
}
```

This is the same separation used by many games: create or load an asset outside the frame loop, then transform and composite it cheaply during rendering.

## 11. Practice challenges

### Challenge 1: Controlled palette

Create a palette array containing three hues. Choose one hue per mutation and derive every other color from it.

Acceptance criteria:

- Each mutation uses one coherent color family.
- Text and background remain readable.
- Overlapping branches do not become solid white.

### Challenge 2: Breathing animation

Animate wing scale slowly with a sine wave.

Acceptance criteria:

- Motion is based on the animation timestamp.
- The butterfly remains centered.
- Resize still redraws correctly.
- The animation does not create new buttons every frame.

### Challenge 3: Deterministic mutations

Implement a small seeded random-number generator and display the seed in the console.

Acceptance criteria:

- The same seed produces the same butterfly.
- A new mutation changes the seed.
- Hue, spread, scale, and branch count are constrained to safe ranges.
- Recursion cannot exceed a defined performance limit.

These challenges move from visual control to animation and finally reproducibility—the same progression used in production generative-art tools.
