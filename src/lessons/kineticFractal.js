export const kineticFractalLesson = {
  id: "kinetic-fractal",
  title: "Kinetic fractal bloom",
  fileName: "kinetic-fractal.js",
  description: "Animate a recursive structure without tying motion to frame rate.",
  note: {
    kicker: "Creative coding note · 02",
    title: "Bound the work per frame",
    body: "Five recursive levels create detail while absolute time keeps rotation equally smooth on different displays."
  },
  checkpoints: [
    {
      id: "change-arms",
      title: "Change the bloom symmetry",
      description: "Set ARMS to a value from 3 to 8 other than the starter value of 5.",
      hint: "ARMS controls how many rotated copies of the recursive branch are drawn. Higher values multiply the work per frame.",
      validate(source) {
        const arms = Number(source.match(/const\s+ARMS\s*=\s*(\d+)/)?.[1]);
        return arms >= 3 && arms <= 8 && arms !== 5;
      }
    },
    {
      id: "change-speed",
      title: "Retune time-based motion",
      description: "Change SPEED while keeping it positive and no greater than 0.002.",
      hint: "Try a small value such as 0.00035. The timestamp is in milliseconds, so small constants create visible motion.",
      validate(source) {
        const speed = Number(source.match(/const\s+SPEED\s*=\s*([\d.]+)/)?.[1]);
        return speed > 0 && speed <= 0.002 && speed !== 0.00022;
      }
    },
    {
      id: "review-performance",
      title: "Review animation performance",
      description: "Watch the FPS display and confirm that the bloom remains smooth after your changes.",
      hint: "If performance drops, reduce DEPTH or ARMS. Recursion grows the number of branches exponentially.",
      manual: true
    }
  ],
  source: `// Lesson 02 — Kinetic Fractal Bloom
// Change ARMS, DEPTH, or SPEED, then watch the FPS indicator.

const ARMS = 5;
const DEPTH = 5;
const SPEED = 0.00022;

function drawBranch(length, depth, time, hue) {
  if (depth === 0) return;

  const motion = Math.sin(time * 0.0014 + depth * 0.8) * 0.09;
  ctx.strokeStyle = \`hsla(\${hue + depth * 13}, 95%, 64%, \${0.3 + depth * 0.1})\`;
  ctx.lineWidth = depth * 0.75;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -length);
  ctx.stroke();

  ctx.translate(0, -length);

  ctx.save();
  ctx.rotate(0.5 + motion);
  ctx.scale(0.72, 0.72);
  drawBranch(length, depth - 1, time, hue);
  ctx.restore();

  ctx.save();
  ctx.rotate(-0.5 - motion);
  ctx.scale(0.72, 0.72);
  drawBranch(length, depth - 1, time, hue);
  ctx.restore();
}

function drawBackground() {
  const glow = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.65
  );
  glow.addColorStop(0, "#15112b");
  glow.addColorStop(0.48, "#080b18");
  glow.addColorStop(1, "#020306");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function animate(time) {
  drawBackground();
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(time * SPEED);
  ctx.globalCompositeOperation = "lighter";
  // Additive blending creates glow without an expensive shadow per branch.

  const length = Math.min(width, height) * 0.13;
  for (let arm = 0; arm < ARMS; arm++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * arm) / ARMS);
    drawBranch(length, DEPTH, time, 190 + arm * 18);
    ctx.restore();
  }

  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
console.info("Kinetic bloom running — recursion is capped at five levels.");`
};
