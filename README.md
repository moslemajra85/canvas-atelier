# Canvas Atelier

Canvas Atelier is a browser-based creative-coding studio for learning generative art with JavaScript and the Canvas 2D API. It combines a focused code editor, an isolated live preview, a real error console, guided teaching notes, local persistence, and PNG export.

The first lesson produces a bioluminescent fractal butterfly. It is intentionally more ambitious than a toy drawing: learners work with recursion, coordinate transforms, gradients, compositing, randomness, interaction, and responsive canvas rendering.

## Run the project

```bash
cd /home/moslem/Desktop/js-art
npm install
npm run dev
```

Open `http://localhost:4173`.

Create an optimized production build with `npm run build`; preview it with `npm run preview`.

## What the MVP includes

- A responsive two-pane workspace: JavaScript editor on the left, artwork on the right.
- Run button and `Ctrl/⌘ + Enter` shortcut.
- Debounced auto-run, so edits update the preview without rerunning on every keystroke.
- A sandboxed iframe runtime that protects the studio from learner code.
- Captured `console.log`, `console.info`, `console.warn`, runtime errors, syntax errors, and unhandled promise rejections.
- Automatic local saving through `localStorage`.
- CodeMirror 6 syntax highlighting, code folding, bracket matching, search, history, line numbers, and keyboard indentation.
- First-class animation pause/resume and live frame-rate reporting.
- High-DPI canvas rendering and responsive resize helpers.
- PNG export, fullscreen preview, restart, reset, and a starter lesson card.
- Keyboard-accessible controls and reduced-motion support.

## Project structure

```text
js-art/
├── index.html                 # Semantic application shell
├── styles.css                 # Visual system and responsive layout
├── app.js                     # Composition root: constructs and connects modules
├── package.json               # Vite, CodeMirror, and project commands
├── src/
│   ├── core/EventBus.js       # Observer used between independent modules
│   ├── editor/CodeEditor.js   # CodeMirror adapter
│   ├── lessons/               # Extensible lesson definitions and source
│   ├── runtime/               # Iframe runtime and animation scheduler
│   ├── services/              # Persistence and console state
│   └── ui/StudioController.js # UI orchestration
├── test/                      # Node unit tests for core boundaries
├── README.md                  # Setup, features, usage, and roadmap
└── docs/
    ├── ARCHITECTURE.md        # Boundaries, data flow, safety, extension points
    └── CREATIVE-CODING.md     # Canvas API and starter-artwork learning guide
```

## Using the studio

1. Edit `artwork.js` in the left panel.
2. Leave **Auto-run** enabled for quick visual feedback, or disable it while making a large edit.
3. Press **Run** or `Ctrl/⌘ + Enter` to create a fresh preview.
4. Read logs and errors in the console below the canvas.
5. Press **New mutation** inside the artwork to generate another butterfly.
6. Use the pause button above the preview to freeze or resume animation.
7. Use the down-arrow action to export the current canvas as a PNG.
8. Use **Reset** to restore the lesson. Reset is destructive, so the app asks for confirmation.

Your code is stored under the browser key `canvas-atelier:artwork`. This is convenience persistence, not cloud storage or version control. Clearing site data removes it.

## Runtime API available to artwork

Every run starts with a clean document containing a canvas. Learner code receives these globals:

| Name | Type | Purpose |
| --- | --- | --- |
| `canvas` | `HTMLCanvasElement` | The drawing surface. |
| `ctx` | `CanvasRenderingContext2D` | The Canvas 2D drawing context. |
| `width` | `number` | Current preview width in CSS pixels. |
| `height` | `number` | Current preview height in CSS pixels. |
| `fitCanvas()` | `function` | Resizes the backing canvas for the viewport and device pixel ratio. Called once automatically. |
| `onResize(callback)` | `function` | Registers artwork that should redraw after preview resize. |
| `createButton(label)` | `function` | Adds a styled button over the canvas and returns it. |

Minimal example:

```js
function draw() {
  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#d8ff42";
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 80, 0, Math.PI * 2);
  ctx.fill();
}

draw();
onResize(draw);
console.log("Artwork ready");
```

## Error behavior

Each run creates a new iframe document and evaluates the current editor contents. If parsing or execution fails, the exception is caught and displayed in the studio console. Global errors and rejected promises are also forwarded.

The preview is intentionally replaced on every run. This clears old animation loops, DOM elements, event listeners, variables, and drawing state. It gives learners a deterministic reset instead of accumulating invisible state across runs.

If an animation uses `requestAnimationFrame`, it runs until the next code execution replaces the iframe:

```js
let angle = 0;

function animate() {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle);
  ctx.fillStyle = "#8f73ff";
  ctx.fillRect(-70, -4, 140, 8);
  ctx.restore();

  angle += 0.01;
  requestAnimationFrame(animate);
}

animate();
```

## Design decisions

### Vite and CodeMirror, without a UI framework

CodeMirror 6 solves a real product problem: learners need trustworthy JavaScript highlighting, selection, history, folding, bracket matching, and keyboard behavior. Vite bundles its ES modules for development and production. The app does not use React or Tailwind because its current state model and custom visual system do not need them. Avoiding those layers keeps canvas/runtime concepts visible and reduces framework coupling.

### Extension-oriented modules

The application uses small modules around genuine change boundaries. `CodeEditor` adapts CodeMirror, `PreviewRuntime` adapts the iframe protocol, `ProjectStorage` is a repository, `EventBus` implements Observer communication, and `StudioController` orchestrates use cases. Lesson definitions are data modules, so new lessons do not require modifying the runtime. See [the architecture guide](docs/ARCHITECTURE.md).

The design follows Open/Closed Principle pragmatically: stable runtime and editor contracts are open to new lesson content, storage implementations, and UI consumers. It does not add abstract base classes or factories before multiple implementations exist.

### JavaScript-only learner surface

The studio owns the page and canvas scaffolding. Learners edit only the creative code, which keeps early lessons focused. A future advanced mode could expose separate HTML, CSS, and JavaScript tabs, but putting all three languages in the first lesson would increase cognitive load.

### Sandboxed execution

Artwork runs inside an iframe with `allow-scripts`, but without `allow-same-origin`. It cannot directly read the parent document or the studio's local storage. Communication uses small `postMessage` events. See [the architecture guide](docs/ARCHITECTURE.md) for the trust boundary and known limitations.

## Verification

Run unit tests and build the production bundle:

```bash
npm run check
npm run build
```

Manual browser checks for this MVP:

1. The initial butterfly renders and the console reports success.
2. Changing a color rerenders after about 650 ms with auto-run enabled.
3. `throw new Error("test")` produces a visible red console entry.
4. Disabling auto-run prevents edits from executing until **Run** is pressed.
5. Refreshing the browser restores the last edit.
6. Pause stops learner `requestAnimationFrame` callbacks; resume continues them.
7. The FPS label updates for animated sketches.
8. **New mutation** changes the artwork without rerunning the program.
9. PNG export downloads a valid image.
10. Fullscreen preview works and exits with `Escape`.
11. Reset restores the starter only after confirmation.
12. At narrow widths the editor and preview stack vertically.

## Current limitations

- This is a single-file lesson workspace; there are no projects, accounts, cloud sync, or revision history.
- The editor has syntax highlighting and structural editing, but not lint diagnostics, autocomplete, or inline error locations yet.
- Code runs on the browser's main thread inside the preview. An accidental infinite loop can freeze the preview tab. A production execution service should add a Web Worker or instrumented runtime with time limits.
- The console serialization is deliberately simple. Deep, circular, DOM, and function values are shown as simplified strings.
- External images can make a canvas non-exportable because of browser CORS rules.
- User code is not a security boundary against network access; iframe content can still make outgoing requests allowed by the page's Content Security Policy. A hosted release should define an explicit CSP.

## Recommended roadmap

Build in vertical slices rather than adding many disconnected controls:

1. **Diagnostics:** add a JavaScript linter, inline error ranges, and safe autocomplete.
2. **Lesson catalog:** add navigation, checkpoints, expected outcomes, and progress for multiple lesson modules.
3. **Animation tools:** add elapsed time, deterministic random seeds, a timeline, and an animation cleanup API.
4. **Project model:** support named sketches, autosave revisions, import/export, and a small gallery.
5. **Teaching feedback:** detect concepts used in code and connect errors to short explanations without hiding the original browser message.
6. **Production hardening:** add CSP, isolate long-running code, add accessibility/browser tests, and deploy immutable assets.

The next milestone should be inline diagnostics plus the first three structured lessons. Those pieces improve learning value more than social or account features at this stage.
