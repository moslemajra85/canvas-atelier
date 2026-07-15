function standaloneSource(snippet) {
  return `// Reusable fractal component in a standalone composition.
(() => {
  function fractalBackground() {
    ctx.fillStyle = "#04070b";
    ctx.fillRect(0, 0, width, height);
  }
  onResize(fractalBackground);
  fractalBackground();
})();

${snippet}`;
}

const hilbertSnippet = `// Reusable component: Hilbert space-filling curve.
(() => {
  const ORDER = 6;
  function rotate(size, point, rx, ry) {
    let [x, y] = point;
    if (ry === 0) {
      if (rx === 1) { x = size - 1 - x; y = size - 1 - y; }
      [x, y] = [y, x];
    }
    return [x, y];
  }
  function pointAt(size, distance) {
    let point = [0, 0];
    for (let scale = 1, value = distance; scale < size; scale *= 2) {
      const rx = 1 & Math.floor(value / 2);
      const ry = 1 & (value ^ rx);
      point = rotate(scale, point, rx, ry);
      point[0] += scale * rx;
      point[1] += scale * ry;
      value = Math.floor(value / 4);
    }
    return point;
  }
  function drawHilbert() {
    const cells = Math.pow(2, ORDER);
    const extent = Math.min(width, height) * 0.78;
    const step = extent / (cells - 1);
    const left = (width - extent) / 2;
    const top = (height - extent) / 2;
    ctx.beginPath();
    for (let distance = 0; distance < cells * cells; distance++) {
      const point = pointAt(cells, distance);
      const x = left + point[0] * step;
      const y = top + point[1] * step;
      if (distance === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(104, 225, 255, 0.82)";
    ctx.lineWidth = Math.max(0.7, step * 0.2);
    ctx.stroke();
  }
  onResize(drawHilbert);
  drawHilbert();
})();`;

const lSystemSnippet = `// Reusable component: branching L-system plant.
(() => {
  const ITERATIONS = 4;
  function buildSentence() {
    let sentence = "F";
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      sentence = sentence.replaceAll("F", "FF-[-F+F+F]+[+F-F-F]");
    }
    return sentence;
  }
  const sentence = buildSentence();
  function drawPlant() {
    const length = Math.min(width, height) * 0.007;
    ctx.save();
    ctx.translate(width / 2, height * 0.94);
    ctx.strokeStyle = "rgba(130, 255, 157, 0.56)";
    ctx.lineWidth = 0.85;
    const stack = [];
    for (const symbol of sentence) {
      if (symbol === "F") {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -length); ctx.stroke();
        ctx.translate(0, -length);
      }
      if (symbol === "+") ctx.rotate(0.38);
      if (symbol === "-") ctx.rotate(-0.38);
      if (symbol === "[") { ctx.save(); stack.push(1); }
      if (symbol === "]" && stack.pop()) ctx.restore();
    }
    ctx.restore();
  }
  onResize(drawPlant);
  drawPlant();
})();`;

const pythagorasSnippet = `// Reusable component: Pythagoras tree.
(() => {
  const DEPTH = 9;
  function square(size, depth) {
    ctx.fillStyle = "hsla(" + (125 + depth * 8) + ", 68%, " + (24 + depth * 3) + "%, 0.72)";
    ctx.fillRect(-size / 2, -size, size, size);
    if (depth === 0) return;
    ctx.save();
    ctx.translate(-size / 2, -size);
    ctx.rotate(-Math.PI / 4);
    square(size * Math.SQRT1_2, depth - 1);
    ctx.restore();
    ctx.save();
    ctx.translate(size / 2, -size);
    ctx.rotate(Math.PI / 4);
    square(size * Math.SQRT1_2, depth - 1);
    ctx.restore();
  }
  function drawPythagoras() {
    ctx.save();
    ctx.translate(width / 2, height * 0.94);
    square(Math.min(width, height) * 0.16, DEPTH);
    ctx.restore();
  }
  onResize(drawPythagoras);
  drawPythagoras();
})();`;

const circlePackingSnippet = `// Reusable component: recursive circle-packing bloom.
(() => {
  const DEPTH = 5;
  function pack(x, y, radius, depth, hue) {
    if (depth < 0 || radius < 1.2) return;
    ctx.strokeStyle = "hsla(" + (hue + depth * 18) + ", 88%, 68%, " + (0.18 + depth * 0.1) + ")";
    ctx.lineWidth = Math.max(0.5, depth * 0.45);
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
    const child = radius * 0.43;
    for (let index = 0; index < 6; index++) {
      const angle = index * Math.PI / 3 + depth * 0.17;
      pack(x + Math.cos(angle) * (radius - child), y + Math.sin(angle) * (radius - child), child, depth - 1, hue + 9);
    }
  }
  function drawPacking() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    pack(width / 2, height / 2, Math.min(width, height) * 0.34, DEPTH, 185);
    ctx.restore();
  }
  onResize(drawPacking);
  drawPacking();
})();`;

export const extendedFractalEntries = [
  {
    id: "hilbert-curve",
    kind: "fractal-component",
    title: "Hilbert curve",
    category: "Space-filling curves",
    complexity: "Reusable component",
    description: "A normalized order-six space-filling curve for paths, reveals, and geometric masks.",
    snippet: hilbertSnippet,
    source: standaloneSource(hilbertSnippet)
  },
  {
    id: "l-system-plant",
    kind: "fractal-component",
    title: "L-system plant",
    category: "Grammar systems",
    complexity: "Reusable component",
    description: "A bracketed rewriting-system plant suited to organic overlays and procedural illustration.",
    snippet: lSystemSnippet,
    source: standaloneSource(lSystemSnippet)
  },
  {
    id: "pythagoras-tree",
    kind: "fractal-component",
    title: "Pythagoras tree",
    category: "Recursive geometry",
    complexity: "Reusable component",
    description: "Recursive square branching for architectural trees, masks, and geometric compositions.",
    snippet: pythagorasSnippet,
    source: standaloneSource(pythagorasSnippet)
  },
  {
    id: "circle-packing-bloom",
    kind: "fractal-component",
    title: "Circle-packing bloom",
    category: "Recursive geometry",
    complexity: "Reusable component",
    description: "A luminous recursive circle hierarchy for mandalas, energy fields, and decorative overlays.",
    snippet: circlePackingSnippet,
    source: standaloneSource(circlePackingSnippet)
  }
];
