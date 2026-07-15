import test from "node:test";
import assert from "node:assert/strict";
import { createSeededRandom, generateSeed, normalizeSeed } from "../src/services/Seed.js";

test("seeded generators reproduce the same sequence", () => {
  const first = createSeededRandom("c0ffee42");
  const second = createSeededRandom("c0ffee42");
  const different = createSeededRandom("different");
  const firstSequence = Array.from({ length: 5 }, () => first());

  assert.deepEqual(firstSequence, Array.from({ length: 5 }, () => second()));
  assert.notDeepEqual(firstSequence, Array.from({ length: 5 }, () => different()));
  assert.ok(firstSequence.every(value => value >= 0 && value < 1));
});

test("seed generation produces a padded unsigned hexadecimal value", () => {
  const randomSource = {
    getRandomValues(values) {
      values[0] = 0x2a;
      return values;
    }
  };

  assert.equal(generateSeed(randomSource), "0000002a");
});

test("seed normalization trims, bounds, and rejects empty values", () => {
  assert.equal(normalizeSeed("  reusable seed  "), "reusable seed");
  assert.equal(normalizeSeed("x".repeat(80)).length, 64);
  assert.equal(normalizeSeed("   "), null);
  assert.equal(normalizeSeed(42), null);
});
