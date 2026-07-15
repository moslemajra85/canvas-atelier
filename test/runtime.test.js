import test from "node:test";
import assert from "node:assert/strict";
import { buildPreviewDocument } from "../src/runtime/PreviewRuntime.js";

test("preview document contains the run identity and runtime helpers", () => {
  const document = buildPreviewDocument("ctx.fillRect(0, 0, 10, 10);", 42);

  assert.match(document, /const RUN_ID = 42/);
  assert.match(document, /function onResize/);
  assert.match(document, /window\.requestAnimationFrame/);
  assert.match(document, /atelier-animation-state/);
});

test("preview document escapes a learner closing-script sequence", () => {
  const document = buildPreviewDocument('console.log("</script><p>unsafe</p>")', 1);

  assert.doesNotMatch(document, /console\.log\("<\/script>/);
  assert.match(document, /<\\\/script>/);
});
