export const flyingBirdLesson = {
  id: "flying-bird",
  title: "Flight study",
  fileName: "flying-bird.js",
  description: "Build smooth character flight with curves and time-based motion.",
  note: {
    kicker: "Creative coding note · 03",
    title: "Animate from elapsed time",
    body: "The bird position and wing shape come from time, so motion stays consistent at 30, 60, or 144 frames per second."
  },
  checkpoints: [
    {
      id: "retune-flap",
      title: "Retune the wing beat",
      description: "Change the starter wing frequency of 0.009 while keeping the motion time-based.",
      hint: "Find Math.sin(time * 0.009). Smaller values flap more slowly; try 0.006 before making larger changes.",
      validate(source) {
        const frequency = Number(source.match(/const\s+flap\s*=\s*Math\.sin\(time\s*\*\s*([\d.]+)/)?.[1]);
        return frequency > 0 && frequency <= 0.03 && frequency !== 0.009;
      }
    },
    {
      id: "recolor-sky",
      title: "Design a new sky palette",
      description: "Replace at least one of the starter sky gradient colors with your own color.",
      hint: "Edit #071527 or #df7c63 in drawSky. Preserve enough contrast for the pale bird to remain visible.",
      validate(source) {
        return !source.includes("#071527") || !source.includes("#df7c63");
      }
    },
    {
      id: "review-flight",
      title: "Review the complete flight",
      description: "Confirm that the bird crosses the canvas smoothly and remains readable against the sky.",
      hint: "Watch a complete pass and resize the preview. Check the entry edge, exit edge, vertical motion, and contrast.",
      manual: true
    }
  ],
  source: `// Lesson 03 — Flight Study
// A bird made from Bézier curves follows a time-based flight path.

function drawSky(time) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#071527");
  sky.addColorStop(0.58, "#183c52");
  sky.addColorStop(1, "#df7c63");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Slow parallax stars make the world feel deeper.
  ctx.fillStyle = "rgba(214, 240, 255, 0.48)";
  for (let i = 0; i < 36; i++) {
    const x = (i * 97 - time * 0.008) % (width + 30);
    const y = 30 + ((i * 53) % Math.max(80, height * 0.48));
    ctx.fillRect(x < 0 ? x + width + 30 : x, y, 1.5, 1.5);
  }

  ctx.fillStyle = "rgba(4, 12, 20, 0.65)";
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width + 80; x += 80) {
    const hill = height * 0.79 + Math.sin(x * 0.012) * 34;
    ctx.lineTo(x, hill);
  }
  ctx.lineTo(width, height);
  ctx.fill();
}

function drawWing(direction, flap) {
  ctx.save();
  ctx.scale(direction, 1);
  ctx.beginPath();
  ctx.moveTo(4, -3);
  ctx.bezierCurveTo(32, -22 - flap * 34, 67, -17 - flap * 48, 91, 2);
  ctx.bezierCurveTo(61, -3, 39, 12 + flap * 9, 5, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBird(x, y, time) {
  const flap = Math.sin(time * 0.009);
  const tilt = Math.cos(time * 0.0018) * 0.08;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(0.92, 0.92);
  ctx.fillStyle = "#eafcff";
  ctx.strokeStyle = "rgba(94, 228, 255, 0.72)";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#51d9ff";
  ctx.shadowBlur = 12;

  drawWing(-1, flap);
  drawWing(1, flap);

  ctx.beginPath();
  ctx.ellipse(0, 5, 29, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(24, 2);
  ctx.lineTo(42, 7);
  ctx.lineTo(24, 10);
  ctx.fillStyle = "#d8ff42";
  ctx.fill();
  ctx.restore();
}

function animate(time) {
  drawSky(time);

  const journey = (time * 0.055) % (width + 260);
  const x = journey - 130;
  const y = height * 0.46 + Math.sin(time * 0.0018) * height * 0.07;
  drawBird(x, y, time);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
console.info("Flight study running — movement is calculated from elapsed time.");`
};
