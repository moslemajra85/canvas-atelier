const PARTICLE_CORE = `
  const AP = globalThis.AtelierParticles ??= { systems: new Map() };
  if (!AP.createSystem) {
    AP.orderedSystems = [];
    AP.refreshOrder = () => {
      AP.orderedSystems = [...AP.systems.values()]
        .sort((left, right) => left.zIndex - right.zIndex);
    };
    AP.pointer = { x: width / 2, y: height / 2 };
    canvas.addEventListener("pointermove", event => {
      const bounds = canvas.getBoundingClientRect();
      AP.pointer.x = event.clientX - bounds.left;
      AP.pointer.y = event.clientY - bounds.top;
    });

    AP.createSystem = function createSystem(name, config) {
      AP.systems.get(name)?.destroy();
      const rng = createRandom(seed + "-particle-" + name);
      const particles = [];
      let emission = 0;
      let active = true;

      function range(values) {
        return values[0] + (values[1] - values[0]) * rng();
      }

      function spawn() {
        if (particles.length >= config.max) return;
        let x = width / 2;
        let y = height / 2;
        let spawnAngle = rng() * Math.PI * 2;
        if (config.position === "top") { x = rng() * width; y = -12; }
        if (config.position === "bottom") { x = rng() * width; y = height + 12; }
        if (config.position === "bottom-center") { x = width / 2 + range([-width * 0.08, width * 0.08]); y = height + 8; }
        if (config.position === "full") { x = rng() * width; y = rng() * height; }
        if (config.position === "pointer") { x = AP.pointer.x; y = AP.pointer.y; }
        if (config.position === "ring") {
          const radius = range([Math.min(width, height) * 0.04, Math.min(width, height) * 0.38]);
          x = width / 2 + Math.cos(spawnAngle) * radius;
          y = height / 2 + Math.sin(spawnAngle) * radius;
        }

        let angle = config.angle + range([-config.spread / 2, config.spread / 2]);
        if (config.direction === "radial") angle = spawnAngle;
        if (config.direction === "tangent") angle = spawnAngle + Math.PI / 2;
        const speed = range(config.speed);
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          life: range(config.life),
          size: range(config.size),
          color: config.colors[Math.floor(rng() * config.colors.length)],
          phase: rng() * Math.PI * 2,
          rotation: rng() * Math.PI * 2,
          spin: range(config.spin ?? [0, 0])
        });
      }

      const system = {
        zIndex: config.zIndex,
        update(delta, time) {
          if (!active) return;
          emission += config.rate * delta;
          while (emission >= 1) { spawn(); emission -= 1; }

          ctx.save();
          ctx.globalCompositeOperation = config.blend;
          for (let index = particles.length - 1; index >= 0; index--) {
            const particle = particles[index];
            particle.age += delta;
            if (particle.age >= particle.life) { particles.splice(index, 1); continue; }

            if (config.behavior === "sway") {
              particle.vx += Math.sin(time * config.frequency + particle.phase) * config.force * delta;
            }
            if (config.behavior === "wander") {
              particle.vx += (rng() - 0.5) * config.force * delta;
              particle.vy += (rng() - 0.5) * config.force * delta;
            }
            if (config.behavior === "orbit") {
              const dx = width / 2 - particle.x;
              const dy = height / 2 - particle.y;
              particle.vx += dx * config.force * delta;
              particle.vy += dy * config.force * delta;
            }

            particle.vx += config.wind * delta;
            particle.vy += config.gravity * delta;
            const drag = Math.pow(config.drag, delta * 60);
            particle.vx *= drag;
            particle.vy *= drag;
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            particle.size = Math.max(0.1, particle.size + config.growth * delta);
            particle.rotation += particle.spin * delta;

            const progress = particle.age / particle.life;
            let alpha = Math.min(1, particle.age / Math.min(0.15, particle.life * 0.2)) * (1 - progress);
            if (config.twinkle) alpha *= 0.45 + Math.sin(time * 7 + particle.phase) * 0.35 + 0.35;
            ctx.globalAlpha = Math.max(0, alpha * config.opacity);
            ctx.fillStyle = particle.color;
            ctx.strokeStyle = particle.color;
            if (config.shadow > 0) { ctx.shadowColor = particle.color; ctx.shadowBlur = config.shadow; }

            if (config.shape === "line") {
              ctx.lineWidth = particle.size;
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(particle.x - particle.vx * config.trail, particle.y - particle.vy * config.trail);
              ctx.stroke();
            } else if (config.shape === "square") {
              ctx.save();
              ctx.translate(particle.x, particle.y);
              ctx.rotate(particle.rotation);
              ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.65);
              ctx.restore();
            } else {
              ctx.beginPath();
              ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.shadowBlur = 0;
          }
          ctx.restore();
        },
        destroy() {
          active = false;
          particles.length = 0;
          AP.systems.delete(name);
          AP.refreshOrder();
        },
        get count() { return particles.length; }
      };
      AP.systems.set(name, system);
      AP.refreshOrder();
      return system;
    };

    let previousTime = performance.now();
    function particleFrame(time) {
      const delta = Math.min(0.034, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      AP.orderedSystems.forEach(system => system.update(delta, time / 1000));
      requestAnimationFrame(particleFrame);
    }
    requestAnimationFrame(particleFrame);
  }
`;

const DEFAULTS = {
  max: 300,
  rate: 50,
  position: "center",
  direction: "radial",
  angle: 0,
  spread: Math.PI * 2,
  speed: [20, 80],
  life: [1, 2],
  size: [2, 5],
  colors: ["#ffffff"],
  gravity: 0,
  wind: 0,
  drag: 0.99,
  growth: 0,
  opacity: 1,
  blend: "source-over",
  shape: "circle",
  trail: 0.04,
  shadow: 0,
  behavior: "none",
  force: 0,
  frequency: 1,
  twinkle: false,
  spin: [0, 0],
  zIndex: 0
};

export function buildParticleSnippet(id, config) {
  const merged = { ...DEFAULTS, ...config };
  return `// Particle component: ${id}
// Reinsert safely: the previous instance with this ID is replaced.
(() => {
${PARTICLE_CORE}
  AP.createSystem(${JSON.stringify(id)}, ${JSON.stringify(merged, null, 2)});
})();`;
}

export function buildParticleSketch(snippet) {
  return `// Particle sketch — the background loop runs before the shared particle scheduler.
function particleBackground() {
  ctx.fillStyle = "rgba(3, 5, 9, 0.32)";
  ctx.fillRect(0, 0, width, height);
  requestAnimationFrame(particleBackground);
}
particleBackground();

${snippet}`;
}

const presets = [
  ["flame-plume", "Flame plume", "Atmospheric", "Layered rising flame for torches, engines, and energy sources.", { max: 420, rate: 120, position: "bottom-center", direction: "cone", angle: -Math.PI / 2, spread: 0.72, speed: [55, 155], life: [0.55, 1.45], size: [3, 9], colors: ["#fff2a6", "#ffad32", "#ff5a1f", "#d62910"], gravity: -24, drag: 0.985, growth: 3.5, opacity: 0.9, blend: "lighter", shadow: 8, behavior: "sway", force: 18, frequency: 4.2 }],
  ["soft-smoke", "Soft smoke", "Atmospheric", "Slow volumetric-looking smoke for ambience, exhaust, and transitions.", { max: 190, rate: 34, position: "bottom-center", direction: "cone", angle: -Math.PI / 2, spread: 0.55, speed: [18, 52], life: [2.2, 4.8], size: [9, 24], colors: ["#88919c", "#5e6773", "#343b45"], gravity: -5, wind: 4, drag: 0.985, growth: 13, opacity: 0.22, behavior: "sway", force: 9, frequency: 1.2 }],
  ["snowfall", "Snowfall", "Weather", "Layered snow suitable for winter scenes and quiet atmospheric overlays.", { max: 520, rate: 65, position: "top", direction: "cone", angle: Math.PI / 2, spread: 0.3, speed: [24, 70], life: [5, 10], size: [1, 3.8], colors: ["#ffffff", "#dff5ff", "#b9ddf2"], gravity: 5, wind: 5, drag: 0.998, opacity: 0.78, behavior: "sway", force: 16, frequency: 1.5 }],
  ["driving-rain", "Driving rain", "Weather", "High-density directional rain with velocity-scaled streak rendering.", { max: 650, rate: 180, position: "top", direction: "cone", angle: Math.PI / 2 + 0.08, spread: 0.08, speed: [420, 720], life: [0.8, 1.7], size: [0.7, 1.5], colors: ["#b8dcff", "#6ea7d8"], gravity: 260, wind: 35, drag: 1, opacity: 0.58, shape: "line", trail: 0.045 }],
  ["impact-sparks", "Impact sparks", "Energy", "Radial glowing sparks for impacts, welding, collisions, and bursts.", { max: 360, rate: 100, position: "center", direction: "radial", speed: [90, 310], life: [0.35, 1.25], size: [0.7, 2.2], colors: ["#fff8c7", "#ffc34d", "#ff6a1f"], gravity: 220, drag: 0.986, opacity: 1, blend: "lighter", shape: "line", trail: 0.035, shadow: 5 }],
  ["confetti-fall", "Confetti fall", "Celebration", "Colorful rotating confetti for rewards, launches, and event scenes.", { max: 420, rate: 58, position: "top", direction: "cone", angle: Math.PI / 2, spread: 0.9, speed: [45, 145], life: [3.5, 7], size: [4, 9], colors: ["#d8ff42", "#ff5f8f", "#61d8ff", "#9f7cff", "#ffc857"], gravity: 75, wind: 8, drag: 0.995, opacity: 0.92, shape: "square", behavior: "sway", force: 24, frequency: 2, spin: [-5, 5] }],
  ["firefly-field", "Firefly field", "Organic", "Wandering bioluminescent motes for forests, dreams, and magical scenes.", { max: 120, rate: 16, position: "full", direction: "radial", speed: [2, 11], life: [4, 9], size: [1.4, 3.4], colors: ["#efff8a", "#b8ff62", "#6fffc8"], drag: 0.997, opacity: 0.9, blend: "lighter", shadow: 10, behavior: "wander", force: 38, twinkle: true }],
  ["galaxy-vortex", "Galaxy vortex", "Space", "Orbiting seeded star cloud for galaxies, portals, and abstract motion.", { max: 720, rate: 95, position: "ring", direction: "tangent", speed: [18, 72], life: [5, 11], size: [0.6, 2.3], colors: ["#ffffff", "#8ee7ff", "#a98cff", "#ff9fd8"], drag: 0.999, opacity: 0.78, blend: "lighter", shadow: 4, behavior: "orbit", force: 0.18, twinkle: true }],
  ["magic-trail", "Pointer magic trail", "Interactive", "Pointer-following luminous trail for interactive art and presentation effects.", { max: 300, rate: 85, position: "pointer", direction: "radial", speed: [8, 75], life: [0.45, 1.35], size: [1.5, 5.5], colors: ["#8fffff", "#9b83ff", "#ff8fda", "#ffffff"], gravity: 18, drag: 0.975, growth: -0.6, opacity: 0.92, blend: "lighter", shadow: 8, behavior: "wander", force: 28 }],
  ["dust-motes", "Dust motes", "Atmospheric", "Subtle floating particles for interiors, light shafts, and cinematic depth.", { max: 180, rate: 18, position: "full", direction: "radial", speed: [1, 7], life: [5, 12], size: [0.8, 2.8], colors: ["#fff4cf", "#d8e4ef", "#c6b99a"], gravity: -1, wind: 2, drag: 0.999, opacity: 0.32, behavior: "sway", force: 5, frequency: 0.8, twinkle: true }],
  ["rising-bubbles", "Rising bubbles", "Underwater", "Soft rising bubbles for underwater scenes, liquids, and playful interfaces.", { max: 210, rate: 28, position: "bottom", direction: "cone", angle: -Math.PI / 2, spread: 0.5, speed: [22, 68], life: [3, 7], size: [2, 8], colors: ["#b9f4ff", "#7bdcf5", "#dffbff"], gravity: -8, drag: 0.997, growth: 0.8, opacity: 0.38, blend: "lighter", behavior: "sway", force: 12, frequency: 1.7 }],
  ["floating-embers", "Floating embers", "Atmospheric", "Warm wind-driven embers for fires, ruins, forges, and dramatic scenes.", { max: 300, rate: 48, position: "bottom", direction: "cone", angle: -Math.PI / 2, spread: 0.7, speed: [25, 95], life: [1.6, 4.5], size: [0.8, 3.2], colors: ["#fff1a3", "#ff9e32", "#ef4c16"], gravity: -16, wind: 12, drag: 0.991, growth: -0.2, opacity: 0.88, blend: "lighter", shadow: 7, behavior: "sway", force: 18, frequency: 2.4, twinkle: true }]
];

export const particleEntries = presets.map(([id, title, category, description, config]) => {
  return createParticleEntry({ id, title, category, description, config });
});

export function createParticleEntry({ id, title, category = "My presets", description, config }) {
  const merged = { ...DEFAULTS, ...config };
  const snippet = buildParticleSnippet(id, merged);
  return {
    id,
    kind: "particle",
    title,
    category,
    complexity: "Reusable effect",
    description: description || "A custom particle preset saved locally in this browser.",
    config: merged,
    snippet,
    source: buildParticleSketch(snippet)
  };
}
