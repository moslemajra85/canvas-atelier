import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runtimeCompletions, semanticDiagnostics } from "../src/editor/CodeEditor.js";

test("runtime API autocomplete covers the supported artwork globals", () => {
  const labels = new Set(runtimeCompletions.map(completion => completion.label));
  for (const name of ["canvas", "ctx", "width", "height", "random", "createRandom", "onResize", "createButton", "loadImageAsset", "requestAnimationFrame"]) {
    assert.equal(labels.has(name), true, name);
  }
});

test("semantic diagnostics identify reproducibility, safety, and Worker compatibility risks", () => {
  const diagnostics = semanticDiagnostics("Math.random();\nwhile (true) {}\ndocument.body;\nlocalStorage.clear();");
  assert.equal(diagnostics.length, 4);
  assert.deepEqual(diagnostics.map(item => item.line), [1, 2, 3, 4]);
  assert.ok(diagnostics.every(item => item.severity === "warning"));
});

test("application shell defines CSP and keyboard navigation without external runtime resources", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /worker-src blob:/);
  assert.match(html, /connect-src 'self' data: blob:/);
  assert.match(html, /object-src 'none'/);
  assert.doesNotMatch(html, /https:\/\/(fonts\.googleapis|fonts\.gstatic)/);
  assert.match(html, /class="skip-link" href="#codeEditor"/);
  assert.match(html, /id="codeEditor" tabindex="-1"/);
  assert.match(html, /aria-label="Open artwork export settings"/);
});

test("release configuration preserves pending edits and uses the documented dev port", () => {
  const controller = readFileSync(new URL("../src/ui/StudioController.js", import.meta.url), "utf8");
  const viteConfig = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

  assert.match(controller, /addEventListener\("pagehide", \(\) => this\.flushPendingSave\(\)\)/);
  assert.match(controller, /flushPendingSave\(\)[\s\S]*clearTimeout\(this\.saveTimer\)[\s\S]*this\.save\(\)/);
  assert.match(viteConfig, /server:\s*\{\s*port:\s*4173/);
});

test("portfolio deployment and Docker infrastructure are defined", () => {
  const workflow = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  const compose = readFileSync(new URL("../compose.yaml", import.meta.url), "utf8");
  const nginx = readFileSync(new URL("../infra/nginx.conf", import.meta.url), "utf8");

  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /VITE_BASE_PATH: \/canvas-atelier\//);
  assert.match(compose, /image: postgres:17-alpine/);
  assert.match(compose, /postgres-data:/);
  assert.match(nginx, /proxy_pass http:\/\/api:3000/);
});
