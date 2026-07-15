import { textureAssets } from "./assets.js";
import { extendedFractalEntries } from "./extendedFractals.js";
import { createParticleEntry, particleEntries } from "./particles.js";

export class FractalCatalog {
  constructor(entries) {
    this.entries = entries;
    this.byId = new Map(entries.map(entry => [entry.id, entry]));
  }

  get(entryId) {
    return this.byId.get(entryId) ?? null;
  }

  add(entry) {
    if (!entry?.id || this.byId.has(entry.id)) return false;
    this.entries.push(entry);
    this.byId.set(entry.id, entry);
    return true;
  }

  remove(entryId) {
    if (!this.byId.delete(entryId)) return false;
    const index = this.entries.findIndex(entry => entry.id === entryId);
    if (index !== -1) this.entries.splice(index, 1);
    return true;
  }

  categories() {
    return [...new Set(this.entries.map(entry => entry.category))];
  }
}

export const fractalCatalog = new FractalCatalog([
  {
    id: "mandelbrot-field",
    title: "Mandelbrot field",
    category: "Escape-time",
    complexity: "Intermediate",
    description: "Responsive smooth-color Mandelbrot rendering with a bounded pixel budget.",
    source: `// Mandelbrot field — edit CENTER_X, CENTER_Y, ZOOM, or ITERATIONS.
const CENTER_X = -0.62;
const CENTER_Y = 0;
const ZOOM = 1;
const ITERATIONS = 90;

function render() {
  const renderWidth = Math.min(760, Math.max(320, Math.floor(width * 0.72)));
  const renderHeight = Math.max(220, Math.round(renderWidth * height / width));
  const image = ctx.createImageData(renderWidth, renderHeight);
  const aspect = renderWidth / renderHeight;

  for (let py = 0; py < renderHeight; py++) {
    for (let px = 0; px < renderWidth; px++) {
      const cx = CENTER_X + (px / renderWidth - 0.5) * 3.2 * aspect / ZOOM;
      const cy = CENTER_Y + (py / renderHeight - 0.5) * 3.2 / ZOOM;
      let x = 0;
      let y = 0;
      let iteration = 0;
      while (x * x + y * y <= 4 && iteration < ITERATIONS) {
        const nextX = x * x - y * y + cx;
        y = 2 * x * y + cy;
        x = nextX;
        iteration++;
      }

      const offset = (py * renderWidth + px) * 4;
      if (iteration === ITERATIONS) {
        image.data.set([2, 4, 9, 255], offset);
      } else {
        const smooth = iteration + 1 - Math.log2(Math.log2(x * x + y * y));
        const hue = (205 + smooth * 8) % 360;
        const light = 12 + Math.min(64, smooth * 2.2);
        const color = hslToRgb(hue, 0.88, light / 100);
        image.data.set([color[0], color[1], color[2], 255], offset);
      }
    }
  }

  const layer = document.createElement("canvas");
  layer.width = renderWidth;
  layer.height = renderHeight;
  layer.getContext("2d").putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(layer, 0, 0, width, height);
}

function hslToRgb(h, s, l) {
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

onResize(render);
render();
console.info("Mandelbrot rendered at a bounded internal resolution.");`
  },
  {
    id: "julia-nebula",
    title: "Julia nebula",
    category: "Escape-time",
    complexity: "Intermediate",
    description: "Seed-colored Julia set with editable complex constant and smooth iteration bands.",
    source: `// Julia nebula — try C_X = -0.8 and C_Y = 0.156.
const C_X = -0.745;
const C_Y = 0.113;
const ITERATIONS = 100;
const paletteRandom = createRandom(seed + "-julia-palette");
const BASE_HUE = 180 + paletteRandom() * 120;

function render() {
  const size = Math.min(720, Math.max(300, Math.floor(Math.min(width, height) * 0.82)));
  const image = ctx.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let x = (px / size - 0.5) * 3.2;
      let y = (py / size - 0.5) * 3.2;
      let iteration = 0;
      while (x * x + y * y < 4 && iteration < ITERATIONS) {
        const nextX = x * x - y * y + C_X;
        y = 2 * x * y + C_Y;
        x = nextX;
        iteration++;
      }
      const offset = (py * size + px) * 4;
      const energy = iteration === ITERATIONS ? 0 : Math.pow(iteration / ITERATIONS, 0.42);
      image.data[offset] = 8 + energy * (80 + 70 * Math.sin(BASE_HUE));
      image.data[offset + 1] = 7 + energy * 190;
      image.data[offset + 2] = 15 + energy * 240;
      image.data[offset + 3] = 255;
    }
  }
  ctx.fillStyle = "#03040a";
  ctx.fillRect(0, 0, width, height);
  const layer = document.createElement("canvas");
  layer.width = size;
  layer.height = size;
  layer.getContext("2d").putImageData(image, 0, 0);
  const displaySize = Math.min(width, height) * 0.92;
  ctx.drawImage(layer, (width - displaySize) / 2, (height - displaySize) / 2, displaySize, displaySize);
}

onResize(render);
render();
console.info("Julia nebula ready — seed", seed);`
  },
  {
    id: "sierpinski-constellation",
    title: "Sierpiński constellation",
    category: "Chaos game",
    complexity: "Beginner",
    description: "Deterministic chaos-game triangle rendered as a luminous point constellation.",
    source: `// Sierpiński constellation — a chaos game with three attractors.
function render() {
  const rng = createRandom(seed + "-sierpinski");
  ctx.fillStyle = "#03060a";
  ctx.fillRect(0, 0, width, height);
  const size = Math.min(width, height) * 0.82;
  const left = width / 2 - size / 2;
  const top = height / 2 - size * 0.48;
  const points = [
    [width / 2, top],
    [left, top + size * 0.86],
    [left + size, top + size * 0.86]
  ];
  let x = width / 2;
  let y = height / 2;
  ctx.fillStyle = "rgba(105, 235, 255, 0.56)";
  const count = Math.min(90000, Math.floor(width * height * 0.16));
  for (let index = 0; index < count; index++) {
    const target = points[Math.floor(rng() * points.length)];
    x = (x + target[0]) / 2;
    y = (y + target[1]) / 2;
    if (index > 20) ctx.fillRect(x, y, 0.8, 0.8);
  }
}

onResize(render);
render();
console.info("Sierpiński constellation ready — deterministic chaos game.");`
  },
  {
    id: "barnsley-fern",
    title: "Barnsley fern",
    category: "Iterated systems",
    complexity: "Beginner",
    description: "Classic affine iterated-function system with seeded point selection.",
    source: `// Barnsley fern — probabilities choose one of four affine transforms.
function render() {
  const rng = createRandom(seed + "-fern");
  ctx.fillStyle = "#020704";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(104, 255, 142, 0.58)";
  let x = 0;
  let y = 0;
  const scale = Math.min(width / 6.3, height / 11.2);
  const originX = width / 2;
  const originY = height * 0.96;
  const count = Math.min(110000, Math.floor(width * height * 0.2));

  for (let index = 0; index < count; index++) {
    const chance = rng();
    let nextX;
    let nextY;
    if (chance < 0.01) {
      nextX = 0; nextY = 0.16 * y;
    } else if (chance < 0.86) {
      nextX = 0.85 * x + 0.04 * y;
      nextY = -0.04 * x + 0.85 * y + 1.6;
    } else if (chance < 0.93) {
      nextX = 0.2 * x - 0.26 * y;
      nextY = 0.23 * x + 0.22 * y + 1.6;
    } else {
      nextX = -0.15 * x + 0.28 * y;
      nextY = 0.26 * x + 0.24 * y + 0.44;
    }
    x = nextX; y = nextY;
    if (index > 20) ctx.fillRect(originX + x * scale, originY - y * scale, 0.75, 0.75);
  }
}

onResize(render);
render();
console.info("Barnsley fern ready — edit the affine transforms to breed variants.");`
  },
  {
    id: "koch-crystal",
    title: "Koch crystal",
    category: "Recursive curves",
    complexity: "Beginner",
    description: "Export-friendly snowflake path with bounded recursive depth and responsive geometry.",
    source: `// Koch crystal — DEPTH grows segment count by 4^depth.
const DEPTH = 5;

function segment(x1, y1, x2, y2, depth) {
  if (depth === 0) {
    ctx.lineTo(x2, y2);
    return;
  }
  const dx = (x2 - x1) / 3;
  const dy = (y2 - y1) / 3;
  const ax = x1 + dx;
  const ay = y1 + dy;
  const bx = x1 + dx * 2;
  const by = y1 + dy * 2;
  const peakX = ax + dx * Math.cos(-Math.PI / 3) - dy * Math.sin(-Math.PI / 3);
  const peakY = ay + dx * Math.sin(-Math.PI / 3) + dy * Math.cos(-Math.PI / 3);
  segment(x1, y1, ax, ay, depth - 1);
  segment(ax, ay, peakX, peakY, depth - 1);
  segment(peakX, peakY, bx, by, depth - 1);
  segment(bx, by, x2, y2, depth - 1);
}

function render() {
  ctx.fillStyle = "#03060c";
  ctx.fillRect(0, 0, width, height);
  const radius = Math.min(width, height) * 0.34;
  const points = Array.from({ length: 3 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / 3;
    return [width / 2 + Math.cos(angle) * radius, height / 2 + Math.sin(angle) * radius];
  });
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  segment(points[0][0], points[0][1], points[1][0], points[1][1], DEPTH);
  segment(points[1][0], points[1][1], points[2][0], points[2][1], DEPTH);
  segment(points[2][0], points[2][1], points[0][0], points[0][1], DEPTH);
  ctx.strokeStyle = "#9eefff";
  ctx.lineWidth = 1.15;
  ctx.shadowColor = "#3fc8ff";
  ctx.shadowBlur = 8;
  ctx.stroke();
}

onResize(render);
render();
console.info("Koch crystal ready —", 3 * Math.pow(4, DEPTH), "segments.");`
  },
  {
    id: "dragon-curve",
    title: "Dragon curve",
    category: "Recursive curves",
    complexity: "Intermediate",
    description: "Fourteen-fold paper-folding curve normalized to any canvas aspect ratio.",
    source: `// Dragon curve — each fold doubles the number of segments.
const FOLDS = 14;

function buildDragon() {
  const points = [[0, 0], [1, 0]];
  for (let fold = 0; fold < FOLDS; fold++) {
    const pivot = points[points.length - 1];
    for (let index = points.length - 2; index >= 0; index--) {
      const dx = points[index][0] - pivot[0];
      const dy = points[index][1] - pivot[1];
      points.push([pivot[0] - dy, pivot[1] + dx]);
    }
  }
  return points;
}

const dragon = buildDragon();

function render() {
  ctx.fillStyle = "#05040a";
  ctx.fillRect(0, 0, width, height);
  const xs = dragon.map(point => point[0]);
  const ys = dragon.map(point => point[1]);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const scale = Math.min(width * 0.82 / (maxX - minX), height * 0.82 / (maxY - minY));
  const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale;
  ctx.beginPath();
  dragon.forEach((point, index) => {
    const x = offsetX + point[0] * scale;
    const y = offsetY + point[1] * scale;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#bb82ff";
  ctx.lineWidth = Math.max(0.55, Math.min(1.3, scale * 0.08));
  ctx.stroke();
}

onResize(render);
render();
console.info("Dragon curve ready —", dragon.length - 1, "segments.");`
  },
  {
    id: "recursive-canopy",
    title: "Recursive canopy",
    category: "Organic systems",
    complexity: "Intermediate",
    description: "Seed-stable branching tree with independent randomness on every responsive redraw.",
    source: `// Recursive canopy — deterministic branching remains stable after resize.
const DEPTH = 10;

function branch(rng, length, depth) {
  if (depth === 0 || length < 2) return;
  ctx.strokeStyle = "hsla(" + (105 + depth * 5) + ", 65%, " + (32 + depth * 3) + "%, 0.72)";
  ctx.lineWidth = Math.max(0.6, depth * 0.55);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -length);
  ctx.stroke();
  ctx.translate(0, -length);
  const spread = 0.28 + rng() * 0.22;
  const shrink = 0.69 + rng() * 0.06;
  ctx.save();
  ctx.rotate(-spread);
  branch(rng, length * shrink, depth - 1);
  ctx.restore();
  ctx.save();
  ctx.rotate(spread * (0.88 + rng() * 0.24));
  branch(rng, length * shrink, depth - 1);
  ctx.restore();
}

function render() {
  const rng = createRandom(seed + "-canopy");
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#07151b");
  gradient.addColorStop(1, "#030705");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height * 0.94);
  branch(rng, Math.min(width, height) * 0.22, DEPTH);
  ctx.restore();
}

onResize(render);
render();
console.info("Recursive canopy ready — seed", seed);`
  },
  {
    id: "fractal-noise-map",
    title: "Fractal noise map",
    category: "Procedural image",
    complexity: "Advanced",
    description: "Seeded multi-octave value noise for terrain, clouds, masks, and texture generation.",
    source: `// Fractal noise map — combine octaves to create an image-like texture.
const OCTAVES = 6;
const SCALE = 0.018;
const seedValue = createRandom(seed + "-noise")() * 10000;

function hash(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seedValue) * 43758.5453;
  return value - Math.floor(value);
}

function smoothstep(value) { return value * value * (3 - 2 * value); }

function valueNoise(x, y) {
  const ix = Math.floor(x); const iy = Math.floor(y);
  const fx = smoothstep(x - ix); const fy = smoothstep(y - iy);
  const a = hash(ix, iy); const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1); const d = hash(ix + 1, iy + 1);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
}

function fractalNoise(x, y) {
  let total = 0; let amplitude = 0.5; let frequency = 1; let weight = 0;
  for (let octave = 0; octave < OCTAVES; octave++) {
    total += valueNoise(x * frequency, y * frequency) * amplitude;
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / weight;
}

function render() {
  const renderWidth = Math.min(640, Math.max(240, Math.floor(width * 0.62)));
  const renderHeight = Math.max(180, Math.round(renderWidth * height / width));
  const image = ctx.createImageData(renderWidth, renderHeight);
  for (let y = 0; y < renderHeight; y++) {
    for (let x = 0; x < renderWidth; x++) {
      const value = fractalNoise(x * SCALE, y * SCALE);
      const offset = (y * renderWidth + x) * 4;
      image.data[offset] = 8 + value * 42;
      image.data[offset + 1] = 18 + value * 115;
      image.data[offset + 2] = 28 + value * 178;
      image.data[offset + 3] = 255;
    }
  }
  const layer = document.createElement("canvas");
  layer.width = renderWidth; layer.height = renderHeight;
  layer.getContext("2d").putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(layer, 0, 0, width, height);
}

onResize(render);
render();
console.info("Fractal noise map ready — seed", seed);`
  },
  ...extendedFractalEntries
]);

export const imageCatalog = new FractalCatalog(textureAssets);
export const particleCatalog = new FractalCatalog(particleEntries);
export { createParticleEntry, textureAssets };
