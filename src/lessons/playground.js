export const playgroundLesson = {
  id: "standalone-playground",
  kind: "playground",
  title: "Standalone playground",
  fileName: "artwork.js",
  description: "Create independently with the full Canvas Atelier runtime and no lesson checkpoints.",
  note: {
    kicker: "Independent workspace",
    title: "Your canvas, your direction",
    body: "Use the runtime helpers, console, seeds, revisions, exports, and library without following a guided lesson."
  },
  checkpoints: [],
  source: `// Standalone playground — no lesson checkpoints.
// The runtime provides canvas, ctx, width, height, seed, and random().

function draw() {
  ctx.fillStyle = "#07090d";
  ctx.fillRect(0, 0, width, height);

  // Start your artwork here.
}

onResize(draw);
draw();
console.info(\`Standalone canvas ready — seed \${seed}\`);`
};
