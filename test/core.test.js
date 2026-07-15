import test from "node:test";
import assert from "node:assert/strict";
import { EventBus } from "../src/core/EventBus.js";
import { ConsoleStore } from "../src/services/ConsoleStore.js";
import { ProjectStorage } from "../src/services/ProjectStorage.js";

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

  assert.equal(projects.load("starter"), "starter");
  assert.equal(projects.save("const art = true;"), true);
  assert.equal(projects.load("starter"), "const art = true;");
});

test("ProjectStorage fails safely when browser storage is unavailable", () => {
  const unavailableStorage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); }
  };
  const projects = new ProjectStorage(unavailableStorage);

  assert.equal(projects.load("fallback"), "fallback");
  assert.equal(projects.save("source"), false);
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
