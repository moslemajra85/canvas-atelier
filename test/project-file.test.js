import test from "node:test";
import assert from "node:assert/strict";
import { createProjectFile, parseProjectFile, projectFileName } from "../src/services/ProjectFile.js";

test("project files round-trip source, progress, and revisions", () => {
  const contents = createProjectFile({
    lesson: { id: "kinetic-fractal", title: "Kinetic fractal bloom" },
    source: "const ARMS = 7;",
    seed: "c0ffee42",
    completedCheckpointIds: ["change-arms", "change-arms"],
    revisions: [{
      id: "local-only-id",
      source: "const ARMS = 6;",
      reason: "Manual version",
      createdAt: "2026-07-15T10:00:00.000Z"
    }],
    particlePresets: [],
    assets: []
  }, new Date("2026-07-15T12:00:00.000Z"));

  assert.deepEqual(parseProjectFile(contents), {
    lessonId: "kinetic-fractal",
    lessonTitle: "Kinetic fractal bloom",
    kind: "lesson",
    baseLessonId: "kinetic-fractal",
    source: "const ARMS = 7;",
    seed: "c0ffee42",
    completedCheckpointIds: ["change-arms"],
    revisions: [{
      source: "const ARMS = 6;",
      reason: "Manual version",
      createdAt: "2026-07-15T10:00:00.000Z"
    }],
    particlePresets: [],
    assets: []
  });
});

test("personal sketch files retain their installed base lesson", () => {
  const contents = createProjectFile({
    lesson: {
      id: "sketch-local-id",
      title: "Night bloom study",
      kind: "sketch",
      baseLessonId: "kinetic-fractal"
    },
    source: "const DEPTH = 4;",
    seed: "1234abcd",
    completedCheckpointIds: [],
    revisions: []
  });

  const project = parseProjectFile(contents);
  assert.equal(project.kind, "sketch");
  assert.equal(project.baseLessonId, "kinetic-fractal");
  assert.equal(project.lessonTitle, "Night bloom study");
  assert.equal(project.seed, "1234abcd");
});

test("project parser rejects invalid JSON, schema, version, and missing source", () => {
  assert.throws(() => parseProjectFile("not-json"), /valid JSON/);
  assert.throws(() => parseProjectFile('{"schema":"different","version":1}'), /not a Canvas Atelier/);
  assert.throws(
    () => parseProjectFile('{"schema":"canvas-atelier-project","version":99}'),
    /not supported/
  );
  assert.throws(
    () => parseProjectFile('{"schema":"canvas-atelier-project","version":1,"lesson":{"id":"one"}}'),
    /missing/
  );
});

test("project parser drops malformed revisions and caps imported history", () => {
  const revisions = Array.from({ length: 20 }, (_, index) => ({
    source: `source ${index}`,
    reason: "Autosave",
    createdAt: new Date(2026, 0, 1, 0, 0, index).toISOString()
  }));
  revisions.splice(2, 0, { source: 42, reason: "Invalid", createdAt: "yesterday" });

  const project = parseProjectFile(JSON.stringify({
    schema: "canvas-atelier-project",
    version: 1,
    lesson: { id: "one" },
    source: "current",
    revisions
  }));

  assert.equal(project.revisions.length, 15);
  assert.ok(project.revisions.every(revision => typeof revision.source === "string"));
});

test("version two packages portable custom presets and version one migrates safely", () => {
  const contents = createProjectFile({
    lesson: { id: "standalone-playground", title: "Independent artwork" },
    source: "draw();",
    completedCheckpointIds: [],
    revisions: [],
    particlePresets: [{
      id: "custom-blue-fire",
      title: "Blue fire",
      createdAt: "2026-07-16T00:00:00.000Z",
      config: { max: 200, colors: ["#44ccff"] }
    }]
  });
  assert.equal(JSON.parse(contents).version, 2);
  assert.equal(parseProjectFile(contents).particlePresets[0].title, "Blue fire");

  const migrated = parseProjectFile(JSON.stringify({
    schema: "canvas-atelier-project",
    version: 1,
    lesson: { id: "standalone-playground" },
    source: "draw();"
  }));
  assert.deepEqual(migrated.particlePresets, []);
  assert.deepEqual(migrated.assets, []);
});

test("portable assets require a matching allow-listed MIME type and data URL", () => {
  const project = parseProjectFile(JSON.stringify({
    schema: "canvas-atelier-project",
    version: 2,
    lesson: { id: "standalone-playground" },
    source: "loadImageAsset('user-paper');",
    assets: [
      { id: "user-paper", name: "Paper", mimeType: "image/png", license: "Owned", dataUrl: "data:image/png;base64,cG5n" },
      { id: "user-mismatch", name: "Mismatch", mimeType: "image/svg+xml", dataUrl: "data:image/png;base64,cG5n" },
      { id: "user-script", name: "Script", mimeType: "text/html", dataUrl: "data:text/html;base64,PHNjcmlwdD4=" }
    ]
  }));

  assert.equal(project.assets.length, 1);
  assert.equal(project.assets[0].id, "user-paper");
});

test("project filenames are portable and dated", () => {
  assert.equal(
    projectFileName("Bioluminescent Butterfly!", new Date("2026-07-15T12:00:00.000Z")),
    "bioluminescent-butterfly-2026-07-15.atelier.json"
  );
  assert.equal(
    projectFileName("Night Bloom", new Date("2026-07-15T12:00:00.000Z"), "c0ffee42"),
    "night-bloom-c0ffee42-2026-07-15.atelier.json"
  );
});
