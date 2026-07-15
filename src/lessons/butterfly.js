export const butterflyLesson = {
  id: "bioluminescent-butterfly",
  title: "Bioluminescent butterfly",
  fileName: "butterfly.js",
  description: "Build organic symmetry, then cache expensive recursive drawing for smooth motion.",
  note: {
    kicker: "Creative coding note · 01",
    title: "Cache detail, animate transforms",
    body: "The recursive butterfly is rendered once to a layer. Each frame moves that layer instead of rebuilding hundreds of glowing paths."
  },
  source: `// Lesson 01 — Cached Bioluminescent Butterfly
// Expensive recursion is rendered once; animation moves the cached layer.

class Butterfly {
  constructor() {
    this.hue = Math.random() < 0.75 ? 178 + Math.random() * 35 : 285;
    this.levels = 4;
    this.branches = 3;
    this.spread = 0.46;
    this.scale = 0.69;
  }

  branch(g, level, length) {
    if (level > this.levels) return;

    const lightness = 22 + level * 11;
    g.strokeStyle = \`hsl(\${this.hue + level * 7} 95% \${lightness}%)\`;
    g.lineWidth = Math.max(1, 7 - level * 1.25);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(length, 0);
    g.stroke();

    if (level >= this.levels - 1) {
      g.fillStyle = \`hsl(\${this.hue + 25} 100% 72%)\`;
      g.beginPath();
      g.arc(length, 0, 3.5, 0, Math.PI * 2);
      g.fill();
    }

    for (let i = 0; i < this.branches; i++) {
      const position = length * (1 - i / this.branches);
      const angle = (i / (this.branches - 1) - 0.5) * this.spread;
      g.save();
      g.translate(position, 0);
      g.rotate(angle);
      g.scale(this.scale, this.scale);
      this.branch(g, level + 1, length);
      g.restore();
    }
  }

  wing(g, side, y, angle, size, length) {
    g.save();
    g.translate(side * 11, y);
    g.rotate(side * angle);
    g.scale(size, side * size);
    this.branch(g, 0, length);
    g.restore();
  }

  draw(g, center, size) {
    const length = size * 0.19;
    g.save();
    g.translate(center, center);
    g.rotate(-Math.PI / 2);
    g.shadowColor = \`hsl(\${this.hue} 100% 65%)\`;
    g.shadowBlur = 8;
    this.wing(g, -1, 0, 1.22, 1.05, length);
    this.wing(g, 1, 0, 1.22, 1.05, length);
    this.wing(g, -1, 8, 2.08, 0.72, length);
    this.wing(g, 1, 8, 2.08, 0.72, length);

    g.shadowBlur = 14;
    g.fillStyle = \`hsl(\${this.hue + 35} 100% 62%)\`;
    for (let i = 0; i < 20; i++) {
      const progress = i / 19;
      const radius = 3 + Math.sin(progress * Math.PI) * 8;
      g.beginPath();
      g.arc(0, (progress - 0.5) * length, radius, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
}

const artLayer = document.createElement("canvas");
const artCtx = artLayer.getContext("2d");
let butterfly = new Butterfly();
let layerSize = 600;
let background;

function prepareArtwork() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  layerSize = Math.max(360, Math.min(width, height) * 0.88);
  artLayer.width = Math.round(layerSize * dpr);
  artLayer.height = Math.round(layerSize * dpr);
  artCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  artCtx.clearRect(0, 0, layerSize, layerSize);
  artCtx.lineCap = "round";
  artCtx.globalCompositeOperation = "lighter";
  butterfly.draw(artCtx, layerSize / 2, layerSize);
  artCtx.globalCompositeOperation = "source-over";

  background = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.58
  );
  background.addColorStop(0, "#10252b");
  background.addColorStop(0.48, "#071116");
  background.addColorStop(1, "#020406");
}

function animate(time) {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const hover = Math.sin(time * 0.0016) * 8;
  const breathe = 1 + Math.sin(time * 0.0021) * 0.025;
  ctx.save();
  ctx.translate(width / 2, height / 2 + hover);
  ctx.rotate(Math.sin(time * 0.0008) * 0.025);
  ctx.scale(breathe, breathe);
  ctx.drawImage(artLayer, -layerSize / 2, -layerSize / 2, layerSize, layerSize);
  ctx.restore();

  requestAnimationFrame(animate);
}

createButton("New mutation").addEventListener("click", () => {
  butterfly = new Butterfly();
  prepareArtwork();
  console.info("New cached mutation created");
});

onResize(prepareArtwork);
prepareArtwork();
requestAnimationFrame(animate);
console.info("Butterfly ready — recursive detail is cached for smooth motion.");`
};
