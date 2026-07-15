export const butterflyLesson = {
  id: "bioluminescent-butterfly",
  title: "Bioluminescent butterfly",
  note: {
    kicker: "Creative coding note · 01",
    title: "Recursion draws the wings",
    body: "drawBranch() calls itself at a smaller scale. Animation then changes the wing scale over time."
  },
  source: `// Canvas Atelier — Animated Bioluminescent Butterfly
// Available globals: canvas, ctx, width, height, onResize(), createButton().

class Butterfly {
  constructor() {
    this.hue = Math.random() < 0.75 ? 178 + Math.random() * 35 : 285;
    this.levels = 4;
    this.branches = 3;
    this.spread = 0.46;
    this.scale = 0.69;
  }

  branch(level, length) {
    if (level > this.levels) return;

    const lightness = 22 + level * 11;
    ctx.strokeStyle = \`hsl(\${this.hue + level * 7} 95% \${lightness}%)\`;
    ctx.lineWidth = Math.max(1, 7 - level * 1.25);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();

    if (level >= this.levels - 1) {
      ctx.fillStyle = \`hsl(\${this.hue + 25} 100% 72%)\`;
      ctx.beginPath();
      ctx.arc(length, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < this.branches; i++) {
      const position = length * (1 - i / this.branches);
      const angle = (i / (this.branches - 1) - 0.5) * this.spread;
      ctx.save();
      ctx.translate(position, 0);
      ctx.rotate(angle);
      ctx.scale(this.scale, this.scale);
      this.branch(level + 1, length);
      ctx.restore();
    }
  }

  wing(side, y, angle, size, length) {
    ctx.save();
    ctx.translate(side * 11, y);
    ctx.rotate(side * angle);
    ctx.scale(size, side * size);
    this.branch(0, length);
    ctx.restore();
  }

  draw(time) {
    const length = Math.min(width, height) * 0.18;
    const breath = 1 + Math.sin(time * 0.0022) * 0.045;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.shadowColor = \`hsl(\${this.hue} 100% 65%)\`;
    ctx.shadowBlur = 11;

    this.wing(-1, 0, 1.22, 1.05 * breath, length);
    this.wing(1, 0, 1.22, 1.05 * breath, length);
    this.wing(-1, 8, 2.08, 0.72 / breath, length);
    this.wing(1, 8, 2.08, 0.72 / breath, length);

    ctx.shadowBlur = 18;
    ctx.fillStyle = \`hsl(\${this.hue + 35} 100% 62%)\`;
    for (let i = 0; i < 20; i++) {
      const progress = i / 19;
      const radius = 3 + Math.sin(progress * Math.PI) * 8;
      ctx.beginPath();
      ctx.arc(0, (progress - 0.5) * length, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

let butterfly = new Butterfly();

function paint(time = 0) {
  ctx.clearRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.55
  );
  glow.addColorStop(0, "#10252b");
  glow.addColorStop(0.48, "#071116");
  glow.addColorStop(1, "#020406");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.lineCap = "round";
  ctx.globalCompositeOperation = "lighter";
  butterfly.draw(time);
  ctx.globalCompositeOperation = "source-over";
}

function animate(time) {
  paint(time);
  requestAnimationFrame(animate);
}

createButton("New mutation").addEventListener("click", () => {
  butterfly = new Butterfly();
  console.info("New mutation created");
});

onResize(() => paint(performance.now()));
paint(performance.now());
requestAnimationFrame(animate);
console.info("Animated butterfly ready — use the studio pause control.");`
};
