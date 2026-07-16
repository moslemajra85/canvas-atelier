import test from "node:test";
import assert from "node:assert/strict";
import { buildPreviewDocument, extractArtworkLocation } from "../src/runtime/PreviewRuntime.js";

test("preview document contains the run identity and runtime helpers", () => {
  const document = buildPreviewDocument("ctx.fillRect(0, 0, 10, 10);", 42, "c0ffee42");

  assert.match(document, /const RUN_ID = 42/);
  assert.match(document, /function onResize/);
  assert.match(document, /self\.requestAnimationFrame/);
  assert.match(document, /transferControlToOffscreen/);
  assert.match(document, /ExecutionTimeoutError/);
  assert.match(document, /worker\?\.terminate/);
  assert.match(document, /atelier-animation-state/);
  assert.match(document, /atelier-stop/);
  assert.match(document, /sourceURL=artwork\.js/);
  assert.match(document, /send\("diagnostic"/);
  assert.match(document, /c0ffee42/);
  assert.match(document, /const random = createRandom\(seed\)/);
  assert.match(document, /function loadImageAsset/);
  assert.match(document, /atelier-asset-response/);
});

test("preview document escapes a learner closing-script sequence", () => {
  const document = buildPreviewDocument('console.log("</script><p>unsafe</p>")', 1);

  assert.doesNotMatch(document, /console\.log\("<\/script>/);
  assert.match(document, /<\\\/script>/);
});

test("artwork stack locations map past the generated Function wrapper", () => {
  assert.deepEqual(extractArtworkLocation("Error: boom\n at draw (artwork.js:14:9)"), {
    line: 12,
    column: 9
  });
  assert.equal(extractArtworkLocation("Error without a learner frame"), null);
});
