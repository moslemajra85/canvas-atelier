import test from "node:test";
import assert from "node:assert/strict";
import { AssetStore } from "../src/services/AssetStore.js";

test("AssetStore validates IDs and caches converted data URLs", async () => {
  let fetchCount = 0;
  const blob = { size: 128 };
  const fetchResource = async url => {
    fetchCount += 1;
    assert.equal(url, "/texture.png");
    return {
      ok: true,
      headers: { get: () => "128" },
      blob: async () => blob
    };
  };
  const assets = new AssetStore(
    [{ id: "texture", url: "/texture.png" }],
    fetchResource,
    async value => value === blob ? "data:image/png;base64,texture" : ""
  );

  assert.equal(assets.has("texture"), true);
  assert.equal(assets.has("missing"), false);
  assert.equal(await assets.loadDataUrl("texture"), "data:image/png;base64,texture");
  assert.equal(await assets.loadDataUrl("texture"), "data:image/png;base64,texture");
  assert.equal(fetchCount, 1);
  await assert.rejects(() => assets.loadDataUrl("missing"), /Unknown library asset/);
});

test("AssetStore rejects oversized built-in assets before decoding", async () => {
  const assets = new AssetStore(
    [{ id: "huge", url: "/huge.png" }],
    async () => ({
      ok: true,
      headers: { get: () => String(13 * 1024 * 1024) },
      blob: async () => ({ size: 13 * 1024 * 1024 })
    }),
    async () => "should-not-run"
  );

  await assert.rejects(() => assets.loadDataUrl("huge"), /12 MB limit/);
});
