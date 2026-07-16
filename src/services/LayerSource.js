const START = "// @atelier-layer ";
const END = "// @atelier-layer-end";
const BLENDS = new Set(["source-over", "lighter", "screen", "multiply", "overlay", "soft-light"]);

export function createLayerBlock(entry, id = `layer-${Date.now().toString(36)}`) {
  const particle = entry.kind === "particle";
  const metadata = {
    id,
    entryId: entry.id,
    title: entry.title,
    kind: particle ? "particle" : "component",
    enabled: true,
    opacity: particle ? entry.config.opacity : 1,
    blend: particle ? entry.config.blend : "source-over"
  };
  const body = particle ? entry.snippet : wrapComponent(entry.snippet, metadata);
  return `${START}${JSON.stringify(metadata)}\n${body.trim()}\n${END}`;
}

export function parseLayers(source) {
  const layers = [];
  let searchFrom = 0;
  while (searchFrom < source.length) {
    const start = source.indexOf(START, searchFrom);
    if (start === -1) break;
    const headerEnd = source.indexOf("\n", start);
    const endMarker = source.indexOf(END, headerEnd + 1);
    if (headerEnd === -1 || endMarker === -1) break;
    const end = endMarker + END.length;
    try {
      const metadata = normalizeMetadata(JSON.parse(source.slice(start + START.length, headerEnd)));
      if (metadata) layers.push({ ...metadata, start, headerEnd, bodyStart: headerEnd + 1, bodyEnd: endMarker, end });
    } catch { /* A malformed marker remains ordinary learner source. */ }
    searchFrom = end;
  }
  return layers;
}

export function prepareLayeredSource(source) {
  const disabled = parseLayers(source).filter(layer => !layer.enabled).reverse();
  return disabled.reduce((result, layer) => (
    result.slice(0, layer.bodyStart) + `// Layer “${layer.title}” is hidden.\n` + result.slice(layer.bodyEnd)
  ), source);
}

export function updateLayer(source, layerId, changes) {
  const layer = parseLayers(source).find(candidate => candidate.id === layerId);
  if (!layer) return source;
  const metadata = normalizeMetadata({ ...layer, ...changes });
  if (!metadata) return source;
  let body = source.slice(layer.bodyStart, layer.bodyEnd);
  if (metadata.kind === "particle") {
    body = body.replace(/"opacity":\s*-?[\d.]+/, `"opacity": ${metadata.opacity}`);
    body = body.replace(/"blend":\s*"[^"]+"/, `"blend": ${JSON.stringify(metadata.blend)}`);
  } else {
    body = body.replace(/const atelierLayerOpacity = -?[\d.]+;/, `const atelierLayerOpacity = ${metadata.opacity};`);
    body = body.replace(/const atelierLayerBlend = "[^"]+";/, `const atelierLayerBlend = ${JSON.stringify(metadata.blend)};`);
  }
  const header = `${START}${JSON.stringify(metadata)}\n`;
  return source.slice(0, layer.start) + header + body + source.slice(layer.bodyEnd);
}

export function removeLayer(source, layerId) {
  const layer = parseLayers(source).find(candidate => candidate.id === layerId);
  if (!layer) return source;
  const before = source.slice(0, layer.start).replace(/\n\n$/, "\n");
  return before + source.slice(layer.end).replace(/^\n\n/, "\n");
}

export function moveLayer(source, layerId, direction) {
  const layers = parseLayers(source);
  const index = layers.findIndex(layer => layer.id === layerId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= layers.length) return source;
  const blocks = layers.map(layer => source.slice(layer.start, layer.end));
  [blocks[index], blocks[targetIndex]] = [blocks[targetIndex], blocks[index]];
  let result = source;
  for (let layerIndex = layers.length - 1; layerIndex >= 0; layerIndex--) {
    result = result.slice(0, layers[layerIndex].start) + blocks[layerIndex] + result.slice(layers[layerIndex].end);
  }
  return result;
}

function wrapComponent(snippet, metadata) {
  return `// Layer rendering controls.
(() => {
  const atelierLayerOpacity = ${metadata.opacity};
  const atelierLayerBlend = ${JSON.stringify(metadata.blend)};
  const atelierLayerRender = callback => (...args) => {
    ctx.save();
    ctx.globalAlpha *= atelierLayerOpacity;
    ctx.globalCompositeOperation = atelierLayerBlend;
    try { return callback(...args); } finally { ctx.restore(); }
  };
  const onResize = callback => globalThis.onResize(atelierLayerRender(callback));
  const requestAnimationFrame = callback => globalThis.requestAnimationFrame(atelierLayerRender(callback));
  const cancelAnimationFrame = id => globalThis.cancelAnimationFrame(id);
  atelierLayerRender(() => {
${snippet.split("\n").map(line => `    ${line}`).join("\n")}
  })();
})();`;
}

function normalizeMetadata(value) {
  if (!value || !/^layer-[a-z0-9-]+$/.test(value.id)) return null;
  return {
    id: value.id,
    entryId: String(value.entryId ?? "component").slice(0, 80),
    title: String(value.title ?? "Untitled layer").slice(0, 80),
    kind: value.kind === "particle" ? "particle" : "component",
    enabled: value.enabled !== false,
    opacity: Math.max(0, Math.min(1, Number(value.opacity) || 0)),
    blend: BLENDS.has(value.blend) ? value.blend : "source-over"
  };
}
