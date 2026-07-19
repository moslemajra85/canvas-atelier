# Canvas Atelier

Canvas Atelier is a browser-based creative-coding studio for learning and producing generative art with JavaScript and the Canvas 2D API. It combines guided lessons with an independent professional workspace, isolated execution, reusable fractal and particle components, portable assets, composition layers, and high-resolution image or video export.

[![Canvas Atelier kinetic fractal lesson](images/studio-overview.png)](images/studio-overview.png)

The first lesson produces a bioluminescent fractal butterfly. It is intentionally more ambitious than a toy drawing: learners work with recursion, coordinate transforms, gradients, compositing, randomness, interaction, and responsive canvas rendering.

## Run the project

### Frontend-only development

```bash
cd /home/moslem/Desktop/js-art
npm install
npm run dev
```

Open `http://localhost:4173`.

Create an optimized production build with `npm run build`; preview it with `npm run preview`.

This mode intentionally shows **Demo** in the account control. It needs no backend and keeps all work in browser storage.

### Full Docker stack

The authenticated application runs as three containers: Nginx, the Node account API, and PostgreSQL.

```bash
cp .env.example .env
# Replace POSTGRES_PASSWORD in .env before starting.
docker compose up --build
```

Open `http://localhost:8080`. PostgreSQL is isolated on the internal Docker network and is not published to the host. Account sessions use opaque random tokens in HttpOnly cookies; only token hashes are stored in the database.

For HTTPS production, set `AUTH_ORIGIN` to the exact public origin and `COOKIE_SECURE=true`. See [authentication and deployment](docs/AUTHENTICATION.md) before deploying.

### GitHub Pages portfolio demo

The workflow at `.github/workflows/pages.yml` tests, builds, and deploys an anonymous demo from `main`. In the repository, choose **Settings → Pages → Source: GitHub Actions**. The expected project-page URL is:

```text
https://moslemajra85.github.io/canvas-atelier/
```

GitHub Pages cannot run the API or PostgreSQL, so its account control clearly reports demo mode. To demonstrate real authentication, deploy the Docker stack to a container host or VPS and link that URL instead.

## What version 1 includes

- A responsive two-pane workspace: JavaScript editor on the left, artwork on the right.
- Run button and `Ctrl/⌘ + Enter` shortcut.
- Debounced auto-run, so edits update the preview without rerunning on every keystroke.
- A sandboxed iframe plus dedicated Worker runtime with OffscreenCanvas rendering, manual Stop, and a five-second initialization watchdog.
- Captured `console.log`, `console.info`, `console.warn`, runtime errors, syntax errors, and unhandled promise rejections.
- Highlighted diagnostic lines and clickable console errors that return focus to learner code.
- Automatic local saving through `localStorage`.
- Rolling per-lesson revision history with idle snapshots, manual versions, and protected restore.
- Versioned JSON project export/import containing source, checkpoint progress, revision history, custom particle presets, and referenced user assets.
- Named personal sketches with independent drafts and a local create/open/delete gallery.
- Persisted deterministic seeds with reproducible runtime random generators and seed-aware exports.
- A checkpoint-free standalone playground for independent creative work.
- A lazily loaded creative library with 12 fractal templates/components, 12 reusable particle effects, and four original raster textures.
- A sandboxed visual particle configurator with quality scaling, live code generation, particle layer order, and locally saved custom presets.
- CodeMirror 6 syntax highlighting, code folding, bracket matching, search, history, line numbers, runtime-aware autocomplete, semantic warnings, and keyboard indentation.
- First-class animation pause/resume and live frame-rate reporting.
- Three selectable lessons with independent locally saved drafts.
- Three guided checkpoints per lesson with hints, code checks, manual visual review, and persisted progress.
- An in-app handbook with a real interface screenshot, workflow guidance, runtime concepts, API reference, and shortcuts.
- High-DPI canvas rendering and responsive resize helpers.
- Exact-size PNG, JPEG, and WebP export; WebM animation recording; fullscreen preview; restart; reset; and print/social presets.
- Portable composition layers with visibility, opacity, blend mode, ordering, and protected removal.
- IndexedDB-backed PNG, JPEG, WebP, and sanitized SVG uploads with license notes and project packaging.
- Keyboard-accessible controls and reduced-motion support.
- Anonymous GitHub Pages demo plus an optional Docker-hosted email/password identity system.

## Project structure

```text
js-art/
├── index.html                 # Semantic application shell
├── styles.css                 # Visual system and responsive layout
├── app.js                     # Composition root: constructs and connects modules
├── compose.yaml               # Web, API, and PostgreSQL infrastructure
├── Dockerfile                 # Multi-stage frontend/Nginx image
├── server/                    # Authentication HTTP API and image
├── db/                        # PostgreSQL initialization schema
├── infra/                     # Nginx reverse-proxy and security configuration
├── package.json               # Vite, CodeMirror, and project commands
├── public/assets/textures/    # Built-in original raster texture library
├── src/
│   ├── core/EventBus.js       # Observer used between independent modules
│   ├── editor/CodeEditor.js   # CodeMirror adapter
│   ├── library/               # Lazily loaded professional template catalog
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
5. Open **Goals**, work through the current challenge, and use its hint when you get stuck.
6. Press **New mutation** inside the artwork to generate another butterfly.
7. Use the pause button above the preview to freeze or resume animation.
8. Use the down-arrow action to export an exact-size still image or a WebM animation.
9. Use **Reset** to restore the lesson. Reset is destructive, so the app asks for confirmation.
10. Open the **Revision history** action to save or restore one of the latest 15 distinct versions.
11. Use **Export** to create an `.atelier.json` backup and **Import** to restore it on another browser.
12. Open **My sketches** to duplicate the current artwork into an independent named workspace.
13. Press the seed control above the preview to generate and rerun a reproducible variation.
14. Open the creative library to start a sketch, upload an image, or insert a fractal or particle component.
15. Open **Composition layers** to reorder or non-destructively adjust inserted components.

Each lesson or sketch draft is stored under `canvas-atelier:lesson:<workspace-id>`, checkpoint progress under `canvas-atelier:progress:<workspace-id>`, rolling revisions under `canvas-atelier:revisions:<workspace-id>`, and its seed under `canvas-atelier:seed:<workspace-id>`. Personal sketch metadata is stored separately. This is device-local recovery, not cloud storage or version control. Clearing site data removes it.

## Included lessons

| Lesson | Main concepts | Performance lesson |
| --- | --- | --- |
| Bioluminescent butterfly | Symmetry, recursion, offscreen layers, transforms | Cache expensive static detail and animate the cached bitmap. |
| Kinetic fractal bloom | Bounded recursion, additive color, rotation | Limit recursive depth and use absolute time. |
| Flight study | Bézier curves, character deformation, parallax | Derive position and wing shape from elapsed time. |

The separate **Standalone playground** has no checkpoints and is intended for independent work. The fractal library includes Mandelbrot, Julia, Sierpiński, Barnsley fern, Koch snowflake, dragon curve, recursive canopy, fractal noise, Hilbert curve, L-system plant, Pythagoras tree, and circle-packing bloom. The latter four are reusable components that can be inserted into an existing composition.

The particle library contains flame, smoke, snow, rain, sparks, confetti, fireflies, galaxy, pointer trail, dust, bubbles, and ember presets. **Customize** opens an isolated live preview where emission, budget, forces, size, opacity, shape, blend mode, colors, quality, and particle layer can be adjusted. Configurations can be inserted immediately or saved under **My presets** on this browser.

Particle components use one shared scheduler and named systems, so several effects can coexist without creating a separate animation loop for each effect. Layer sorting is recalculated only when a system is added or removed. Every insertion becomes ordinary editable source inside a portable layer marker, so it remains editable while also supporting visibility, opacity, blend, ordering, and removal controls. The image section includes four original textures plus user uploads loaded through an export-safe bridge.

Open the **?** action for the full in-app handbook. The lesson selector keeps a separate editable draft for every lesson, so moving between exercises does not overwrite work.

## Runtime API available to artwork

Every run starts with a clean document containing a canvas. Learner code receives these globals:

| Name | Type | Purpose |
| --- | --- | --- |
| `canvas` | Canvas-like object | The worker-owned drawing surface. |
| `ctx` | `CanvasRenderingContext2D` | The Canvas 2D drawing context. |
| `width` | `number` | Current preview width in CSS pixels. |
| `height` | `number` | Current preview height in CSS pixels. |
| `fitCanvas()` | `function` | Resizes the backing canvas for the viewport and device pixel ratio. Called once automatically. |
| `onResize(callback)` | `function` | Registers artwork that should redraw after preview resize. |
| `createButton(label)` | `function` | Adds a styled button over the canvas and returns it. |
| `seed` | `string` | The current persisted workspace seed. |
| `random()` | `function` | Returns the next deterministic number from 0 inclusive to 1 exclusive. |
| `createRandom(seed)` | `function` | Creates an independent deterministic generator for a custom seed. |
| `loadImageAsset(id)` | `function` | Loads an allow-listed built-in or user image as an export-safe bitmap. |

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

Each run creates a new iframe document and a dedicated artwork Worker. The Worker evaluates the current editor contents and renders through an `OffscreenCanvas`; the iframe remains responsive and proxies buttons, pointer input, assets, and exports. If parsing or execution fails, the exception is displayed in the studio console. Global errors and rejected promises are also forwarded.

The preview is intentionally replaced on every run. This terminates the previous Worker and clears old animation loops, controls, event listeners, variables, and drawing state. **Stop** terminates it immediately, while initialization that fails to return within five seconds is stopped automatically.

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

### Sandboxed and worker-isolated execution

Artwork runs in a dedicated Worker connected to an `OffscreenCanvas`, hosted by an iframe with `allow-scripts` but without `allow-same-origin`. It cannot directly read the parent document or the studio's local storage. Communication uses small validated `postMessage` events. See [the architecture guide](docs/ARCHITECTURE.md) for the trust boundary and known limitations.

## Verification

Run unit tests and build the production bundle:

```bash
npm run check
npm run build
```

Manual browser checks for version 1:

1. The initial butterfly renders and the console reports success.
2. Changing a color rerenders after about 650 ms with auto-run enabled.
3. `throw new Error("test")` produces a visible red console entry.
4. Disabling auto-run prevents edits from executing until **Run** is pressed.
5. Refreshing the browser restores the last edit.
6. Pause stops learner `requestAnimationFrame` callbacks; resume continues them.
7. The FPS label updates for animated sketches.
8. **New mutation** changes the artwork without rerunning the program.
9. PNG/JPEG/WebP export produces the requested dimensions; WebM recording produces a playable animation.
10. Fullscreen preview works and exits with `Escape`.
11. Reset restores the starter only after confirmation.
12. At narrow widths the editor and preview stack vertically.
13. Standalone playground runs without showing lesson goals.
14. A library template creates an independent sketch and remains editable after reload.
15. A built-in texture loads in the sandbox and the composed canvas still exports as PNG.
16. Two particle components can be inserted into one standalone sketch, rerun, and restored from local source.
17. `while (true) {}` is terminated after five seconds while the studio remains responsive.
18. **Stop** terminates an animated artwork without discarding its source.
19. Uploaded images survive reload, package only when referenced, and restore from project import.
20. Composition layer changes persist as portable source and rerun without errors.
21. Dialogs close with `Escape` and restore focus to their opener.

## Current limitations

- Personal sketches, drafts, and revision history are local to one browser. Accounts are available in the Docker deployment, but there is no cloud sync yet.
- Authentication establishes identity only. Projects and uploaded assets remain local until an owner-scoped cloud schema and synchronization policy are implemented.
- Semantic diagnostics intentionally cover common runtime-specific mistakes rather than replacing a full JavaScript type checker or linter.
- Safe execution requires Worker and `OffscreenCanvas` support. Browsers without them receive a compatibility diagnostic instead of falling back to unsafe main-thread execution.
- The console serialization is deliberately simple. Deep, circular, DOM, and function values are shown as simplified strings.
- Arbitrary remote images are not supported. Import a permitted local image into the asset library to keep rendering and export portable.
- User assets live in IndexedDB on the current browser unless a project referencing them is exported. The uploader is responsible for recording and respecting image rights.
- Particle presets are Canvas 2D source components, not a complete node editor. Very high particle counts still consume Worker CPU/GPU time and can reduce rendering frame rate.
- Canvas export is raster-only. SVG artwork export, color profiles, transparent video, audio, frame sequences, and encoding progress are not implemented.
- WebM availability and codecs depend on the browser; Safari compatibility should be validated before claiming cross-browser video support.
- Worker isolation and CSP protect studio availability and data boundaries, but this is not a hostile-code execution service. Production should also send the CSP as an HTTP header and apply deployment-level monitoring.

## Post-v1 roadmap

Build in vertical slices rather than adding many disconnected controls:

1. **Cross-browser release CI:** automate Chromium, Firefox, and WebKit workflows, including accessibility scans and export downloads.
2. **Performance insight:** add frame-time percentiles, long-frame warnings, worker memory guidance, and an optional profiler graph.
3. **Animation tools:** add a timeline, frame-sequence export, and a documented cleanup lifecycle for complex compositions.
4. **Asset organization:** add folders, tags, thumbnails, usage lookup, and explicit asset/preset package import without opening a full project.
5. **Cloud collaboration:** only after authentication, ownership, conflict handling, quotas, and abuse controls have a concrete product need.

The recommended next milestone is automated cross-browser release coverage. It reduces production risk more than expanding the feature surface again.
