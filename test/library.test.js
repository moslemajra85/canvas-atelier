import test from "node:test";
import assert from "node:assert/strict";
import { FractalCatalog, fractalCatalog, imageCatalog, particleCatalog } from "../src/library/index.js";

test("fractal library exposes unique, editable, deterministic templates", () => {
  assert.equal(fractalCatalog.entries.length, 12);
  assert.equal(new Set(fractalCatalog.entries.map(entry => entry.id)).size, 12);

  for (const entry of fractalCatalog.entries) {
    assert.ok(entry.title);
    assert.ok(entry.category);
    assert.ok(entry.description.length >= 40);
    assert.match(entry.source, /onResize\(/);
    assert.doesNotMatch(entry.source, /Math\.random/);
    assert.doesNotThrow(() => new Function(entry.source));
  }
});

test("particle library exposes deterministic, composable component snippets", () => {
  assert.equal(particleCatalog.entries.length, 12);
  assert.equal(new Set(particleCatalog.entries.map(entry => entry.id)).size, 12);

  for (const entry of particleCatalog.entries) {
    assert.equal(entry.kind, "particle");
    assert.match(entry.snippet, /globalThis\.AtelierParticles/);
    assert.match(entry.snippet, /AP\.createSystem/);
    assert.doesNotMatch(entry.snippet, /Math\.random/);
    assert.doesNotThrow(() => new Function(entry.source));
    assert.doesNotThrow(() => new Function(entry.snippet));
  }

  const combined = particleCatalog.entries.slice(0, 3).map(entry => entry.snippet).join("\n");
  assert.doesNotThrow(() => new Function(combined));
});

test("particle scheduler emits and draws particles when animation advances", () => {
  const callbacks = [];
  const drawCalls = [];
  const ctx = {
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {},
    arc() { drawCalls.push("arc"); }, fill() { drawCalls.push("fill"); },
    stroke() { drawCalls.push("stroke"); }, fillRect() {}, translate() {}, rotate() {}
  };
  const canvas = {
    addEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0 }; }
  };
  const requestAnimationFrame = callback => {
    callbacks.push(callback);
    return callbacks.length;
  };
  let state = 17;
  const createRandom = () => () => {
    state = state * 16807 % 2147483647;
    return (state - 1) / 2147483646;
  };
  const run = new Function(
    "ctx", "canvas", "width", "height", "seed", "createRandom",
    "requestAnimationFrame", "performance",
    particleCatalog.get("flame-plume").source
  );

  delete globalThis.AtelierParticles;
  try {
    run(ctx, canvas, 800, 600, "test-seed", createRandom, requestAnimationFrame, { now: () => 0 });
    assert.equal(globalThis.AtelierParticles.systems.size, 1);
    assert.equal(callbacks.length, 2);

    callbacks.splice(0, 2).forEach(callback => callback(1000));
    assert.ok(globalThis.AtelierParticles.systems.get("flame-plume").count > 0);
    assert.ok(drawCalls.length > 0);
  } finally {
    delete globalThis.AtelierParticles;
  }
});

test("extended fractals expose snippets that compose in one source file", () => {
  const components = fractalCatalog.entries.filter(entry => entry.kind === "fractal-component");
  assert.equal(components.length, 4);
  assert.doesNotThrow(() => new Function(components.map(entry => entry.snippet).join("\n")));
});

test("image library exposes project-owned texture templates through the asset API", () => {
  assert.equal(imageCatalog.entries.length, 4);
  for (const entry of imageCatalog.entries) {
    assert.equal(entry.kind, "image");
    assert.match(entry.url, /^\/assets\/textures\/.+\.png$/);
    assert.match(entry.source, new RegExp(`loadImageAsset\\("${entry.id}"\\)`));
    assert.ok(entry.origin);
    assert.ok(entry.distributionNote);
  }
});

test("fractal catalog resolves entries and derives categories", () => {
  const catalog = new FractalCatalog([
    { id: "one", category: "Curves" },
    { id: "two", category: "Curves" },
    { id: "three", category: "Textures" }
  ]);

  assert.equal(catalog.get("two").id, "two");
  assert.equal(catalog.get("missing"), null);
  assert.deepEqual(catalog.categories(), ["Curves", "Textures"]);
  assert.equal(catalog.add({ id: "four", category: "Particles" }), true);
  assert.equal(catalog.add({ id: "four", category: "Duplicate" }), false);
  assert.equal(catalog.remove("four"), true);
  assert.equal(catalog.get("four"), null);
});

test("particle snippets retain explicit layer order in their shared scheduler", () => {
  const entry = particleCatalog.get("floating-embers");
  assert.equal(entry.config.zIndex, 0);
  assert.match(entry.snippet, /zIndex/);
  assert.match(entry.snippet, /sort\(\(left, right\) => left\.zIndex - right\.zIndex\)/);
  assert.match(entry.snippet, /AP\.orderedSystems\.forEach/);
});
