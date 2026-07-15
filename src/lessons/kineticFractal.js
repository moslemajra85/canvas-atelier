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
