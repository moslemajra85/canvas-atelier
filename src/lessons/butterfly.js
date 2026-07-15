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
  checkpoints: [
    {
      id: "tune-recursion",
      title: "Tune the recursive depth",
      description: "Change the butterfly's levels from 4 to either 3 or 5, then compare detail and frame rate.",
      hint: "Look for this.levels in the Butterfly constructor. Keep it between 3 and 5 so the branch count remains safe.",
      validate(source) {
        const levels = Number(source.match(/this\.levels\s*=\s*(\d+)/)?.[1]);
        return levels >= 3 && levels <= 5 && levels !== 4;
      }
    },
    {
      id: "add-palette",
      title: "Introduce a color palette",
      description: "Create a palette, hues, or colors array and use it as the starting point for a mutation.",
      hint: "For example: const palette = [178, 205, 285]. Choose one entry before deriving the remaining HSL colors.",
      validate(source) {
        return /(?:palette|hues|colors)\s*=\s*\[[^\]]{3,}\]/i.test(source);
      }
    },
    {
      id: "review-butterfly",
      title: "Review the composition",
      description: "Confirm that the butterfly remains centered, readable, and responsive after your changes.",
      hint: "Resize the preview and create several mutations. Look for clipping, white glowing blobs, or sudden layout jumps.",
      manual: true
    }
  ],
  source: `// Lesson 01 — Cached Bioluminescent Butterfly
// Expensive recursion is rendered once; animation moves the cached layer.

class Butterfly {
  constructor() {
    this.hue = random() < 0.75 ? 178 + random() * 35 : 285;
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
console.info(\`Butterfly ready — seed \${seed}; recursive detail is cached for smooth motion.\`);`
};
