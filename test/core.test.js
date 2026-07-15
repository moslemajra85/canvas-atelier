import test from "node:test";
import assert from "node:assert/strict";
import { EventBus } from "../src/core/EventBus.js";
import { ConsoleStore } from "../src/services/ConsoleStore.js";
import { ProjectStorage } from "../src/services/ProjectStorage.js";
import { createPersonalSketchDefinition, LessonCatalog, lessonCatalog } from "../src/lessons/index.js";

test("EventBus publishes payloads and supports unsubscribe", () => {
  const events = new EventBus();
  const received = [];
  const unsubscribe = events.on("artwork:changed", value => received.push(value));

  events.emit("artwork:changed", 1);
  unsubscribe();
  events.emit("artwork:changed", 2);

  assert.deepEqual(received, [1]);
});

test("ProjectStorage loads and saves through the injected repository", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const projects = new ProjectStorage(storage, "test-project");

  assert.equal(projects.load("lesson-one", "starter"), "starter");
  assert.equal(projects.save("lesson-one", "const art = true;"), true);
  assert.equal(projects.load("lesson-one", "starter"), "const art = true;");
});

test("ProjectStorage preserves an intentionally empty lesson draft", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const projects = new ProjectStorage(storage, "test-project");

  projects.save("lesson-one", "");

  assert.equal(projects.load("lesson-one", "starter"), "");
});

test("ProjectStorage fails safely when browser storage is unavailable", () => {
  const unavailableStorage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); }
  };
  const projects = new ProjectStorage(unavailableStorage);

  assert.equal(projects.load("lesson-one", "fallback"), "fallback");
  assert.equal(projects.save("lesson-one", "source"), false);
});

test("ProjectStorage remembers the active lesson independently", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const projects = new ProjectStorage(storage, "studio");

  assert.equal(projects.loadActiveLesson("default"), "default");
  projects.saveActiveLesson("flying-bird");
  assert.equal(projects.loadActiveLesson("default"), "flying-bird");
});

test("ProjectStorage persists unique checkpoint progress and handles corrupt data", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const projects = new ProjectStorage(storage, "studio");

  assert.equal(projects.saveProgress("lesson-one", ["first", "first", "second"]), true);
  assert.deepEqual(projects.loadProgress("lesson-one"), ["first", "second"]);

  values.set(projects.progressKey("lesson-one"), "not-json");
  assert.deepEqual(projects.loadProgress("lesson-one"), []);
});

test("ProjectStorage keeps bounded, newest-first, distinct revisions", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const projects = new ProjectStorage(storage, "studio");

  for (let index = 0; index < 17; index += 1) {
    projects.saveRevision(
      "lesson-one",
      `source ${index}`,
      "Autosave",
      new Date(`2026-01-01T00:00:${String(index).padStart(2, "0")}Z`)
    );
  }

  const revisions = projects.loadRevisions("lesson-one");
  assert.equal(revisions.length, 15);
  assert.equal(revisions[0].source, "source 16");
  assert.equal(revisions.at(-1).source, "source 2");

  const duplicate = projects.saveRevision("lesson-one", "source 16", "Manual version");
  assert.equal(duplicate.created, false);
  assert.equal(projects.loadRevisions("lesson-one").length, 15);
});

test("ProjectStorage ignores malformed revision history", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const projects = new ProjectStorage(storage, "studio");

  values.set(projects.revisionsKey("lesson-one"), "not-json");

  assert.deepEqual(projects.loadRevisions("lesson-one"), []);
});

test("ProjectStorage creates and fully removes personal sketches", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  const projects = new ProjectStorage(storage, "studio");
  const sketch = projects.createSketch({
    title: "Night bloom",
    baseLessonId: "kinetic-fractal",
    source: "const ARMS = 7;"
  }, new Date("2026-07-15T12:00:00.000Z"));

  assert.equal(projects.loadSketches()[0].title, "Night bloom");
  assert.equal(projects.load(sketch.id, "fallback"), "const ARMS = 7;");

  projects.saveProgress(sketch.id, ["change-arms"]);
  projects.saveRevision(sketch.id, "const ARMS = 8;", "Autosave");
  projects.saveSeed(sketch.id, "c0ffee42");
  assert.equal(projects.loadSeed(sketch.id, "fallback"), "c0ffee42");
  assert.equal(projects.deleteSketch(sketch.id), true);
  assert.deepEqual(projects.loadSketches(), []);
  assert.equal(values.has(projects.sourceKey(sketch.id)), false);
  assert.equal(values.has(projects.progressKey(sketch.id)), false);
  assert.equal(values.has(projects.revisionsKey(sketch.id)), false);
  assert.equal(values.has(projects.seedKey(sketch.id)), false);
});

test("ProjectStorage validates, replaces, and deletes custom particle presets", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const projects = new ProjectStorage(storage, "studio");
  const preset = {
    id: "custom-night-sparks",
    title: "Night sparks",
    createdAt: "2026-07-15T12:00:00.000Z",
    config: { max: 240, rate: 60, colors: ["#ff8800", "invalid"] }
  };

  assert.equal(projects.saveParticlePreset(preset).config.colors.length, 1);
  assert.equal(projects.loadParticlePresets()[0].title, "Night sparks");
  projects.saveParticlePreset({ ...preset, title: "Night sparks v2" });
  assert.equal(projects.loadParticlePresets().length, 1);
  assert.equal(projects.loadParticlePresets()[0].title, "Night sparks v2");
  assert.equal(projects.saveParticlePreset({ ...preset, id: "unsafe id" }), null);
  assert.equal(projects.deleteParticlePreset(preset.id), true);
  assert.deepEqual(projects.loadParticlePresets(), []);
});

test("ConsoleStore normalizes message levels and clears state", () => {
  const consoleStore = new ConsoleStore();
  const date = new Date("2026-01-01T10:30:00Z");

  consoleStore.add("debug", ["value"], date);
  assert.equal(consoleStore.messages[0].level, "log");
  assert.deepEqual(consoleStore.messages[0].values, ["value"]);

  consoleStore.clear();
  assert.deepEqual(consoleStore.messages, []);
});

test("ConsoleStore retains an optional navigable source location", () => {
  const consoleStore = new ConsoleStore();
  const location = { line: 12, column: 4 };

  consoleStore.add("error", ["ReferenceError: missingValue is not defined"], undefined, location);

  assert.deepEqual(consoleStore.messages[0].location, location);
});

test("LessonCatalog resolves registered lessons and falls back safely", () => {
  const first = { id: "first" };
  const second = { id: "second" };
  const catalog = new LessonCatalog([first, second]);

  assert.equal(catalog.get("second"), second);
  assert.equal(catalog.get("missing"), first);
  assert.equal(catalog.has("second"), true);
  assert.equal(catalog.has("missing"), false);

  const sketch = { id: "sketch-one" };
  assert.equal(catalog.add(sketch), true);
  assert.equal(catalog.add(sketch), false);
  assert.equal(catalog.get("sketch-one"), sketch);
  assert.equal(catalog.remove("sketch-one"), true);
  assert.equal(catalog.has("sketch-one"), false);
});

test("personal sketch definitions retain the base lesson learning contract", () => {
  const baseLesson = lessonCatalog.get("kinetic-fractal");
  const sketch = createPersonalSketchDefinition({
    id: "sketch-one",
    title: "Night bloom",
    baseLessonId: baseLesson.id,
    starterSource: "const ARMS = 7;",
    createdAt: "2026-07-15T12:00:00.000Z"
  }, baseLesson);

  assert.equal(sketch.kind, "sketch");
  assert.equal(sketch.baseLessonId, baseLesson.id);
  assert.equal(sketch.source, "const ARMS = 7;");
  assert.equal(sketch.checkpoints, baseLesson.checkpoints);
});

test("standalone playground is checkpoint-free and available as a sketch base", () => {
  const playground = lessonCatalog.get("standalone-playground");

  assert.equal(playground.kind, "playground");
  assert.deepEqual(playground.checkpoints, []);
  assert.match(playground.source, /Start your artwork here/);
});

test("lesson checkpoint validators reject starter code and accept the requested edit", () => {
  for (const lesson of lessonCatalog.lessons) {
    for (const checkpoint of lesson.checkpoints.filter(candidate => !candidate.manual)) {
      assert.equal(checkpoint.validate(lesson.source), false, `${lesson.id}:${checkpoint.id}`);
    }
  }

  const butterfly = lessonCatalog.get("bioluminescent-butterfly");
  assert.equal(
    butterfly.checkpoints[0].validate(butterfly.source.replace("this.levels = 4", "this.levels = 5")),
    true
  );

  const fractal = lessonCatalog.get("kinetic-fractal");
  assert.equal(fractal.checkpoints[0].validate(fractal.source.replace("const ARMS = 5", "const ARMS = 7")), true);

  const bird = lessonCatalog.get("flying-bird");
  assert.equal(bird.checkpoints[0].validate(bird.source.replace("time * 0.009", "time * 0.006")), true);
});
