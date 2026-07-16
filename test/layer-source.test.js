import test from "node:test";
import assert from "node:assert/strict";
import { createLayerBlock, moveLayer, parseLayers, prepareLayeredSource, removeLayer, updateLayer } from "../src/services/LayerSource.js";

const component = { id: "hilbert", title: "Hilbert", kind: "fractal-component", snippet: "drawHilbert();" };
const particle = { id: "snow", title: "Snow", kind: "particle", config: { opacity: 0.8, blend: "lighter" }, snippet: 'AP.createSystem("snow", {\n  "opacity": 0.8,\n  "blend": "lighter"\n});' };

test("layer blocks parse, update visual controls, and hide execution", () => {
  let source = `base();\n\n${createLayerBlock(component, "layer-one")}`;
  assert.doesNotThrow(() => new Function(source));
  assert.equal(parseLayers(source)[0].title, "Hilbert");
  source = updateLayer(source, "layer-one", { opacity: 0.35, blend: "screen", enabled: false });
  assert.match(source, /atelierLayerOpacity = 0\.35/);
  assert.match(source, /atelierLayerBlend = "screen"/);
  assert.match(source, /onResize\(atelierLayerRender\(callback\)\)/);
  assert.match(source, /requestAnimationFrame\(atelierLayerRender\(callback\)\)/);
  assert.doesNotMatch(prepareLayeredSource(source), /drawHilbert\(\)/);
});

test("particle layer updates its generated particle configuration", () => {
  const source = updateLayer(createLayerBlock(particle, "layer-snow"), "layer-snow", { opacity: 0.4, blend: "screen" });
  assert.match(source, /"opacity": 0\.4/);
  assert.match(source, /"blend": "screen"/);
});

test("layers move and remove as complete portable source blocks", () => {
  const source = `${createLayerBlock(component, "layer-one")}\n\n${createLayerBlock({ ...component, title: "Second" }, "layer-two")}`;
  const moved = moveLayer(source, "layer-two", -1);
  assert.deepEqual(parseLayers(moved).map(layer => layer.id), ["layer-two", "layer-one"]);
  assert.equal(parseLayers(removeLayer(moved, "layer-two")).length, 1);
});
