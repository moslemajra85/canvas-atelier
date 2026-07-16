import { createSeededRandom } from "../services/Seed.js";

const MESSAGE_SOURCE = "canvas-atelier-preview";
const EXECUTION_TIMEOUT_MS = 5000;

export function buildWorkerPreviewDocument(source, runId, seed = "atelier") {
  const workerSource = buildArtworkWorker(`${source}\n//# sourceURL=artwork.js`, seed);
  const encodedWorker = JSON.stringify(workerSource).replaceAll("</script", "<\\/script");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #020406; }
    canvas { display: block; width: 100%; height: 100%; }
    .atelier-button { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); padding: 9px 15px; border: 1px solid rgba(255,255,255,.17); border-radius: 999px; background: rgba(8,12,16,.62); color: rgba(255,255,255,.82); backdrop-filter: blur(12px); font: 500 11px system-ui, sans-serif; letter-spacing: .02em; cursor: pointer; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script>
    const RUN_ID = ${JSON.stringify(runId)};
    const send = (type, payload = {}) => parent.postMessage({ source: "${MESSAGE_SOURCE}", runId: RUN_ID, type, ...payload }, "*");
    const canvas = document.querySelector("#canvas");
    let worker = null;
    let ready = false;
    let watchdog = null;
    const buttons = new Map();

    function diagnostic(message) { send("diagnostic", { message, stack: "" }); }
    function finishReady() {
      if (ready) return;
      ready = true;
      window.clearTimeout(watchdog);
      send("ready");
    }
    function stopWorker(reason = "Artwork stopped") {
      worker?.terminate();
      worker = null;
      buttons.forEach(button => button.remove());
      buttons.clear();
      send("animation", { paused: true });
      send("stopped", { reason });
      finishReady();
    }
    function dimensions() {
      return { width: window.innerWidth, height: window.innerHeight, dpr: Math.min(window.devicePixelRatio || 1, 2) };
    }
    function createArtworkButton(id, label) {
      const button = document.createElement("button");
      button.className = "atelier-button";
      button.textContent = label;
      button.addEventListener("click", () => worker?.postMessage({ type: "button-click", id }));
      document.body.append(button);
      buttons.set(id, button);
    }
    function returnExport(buffer, mimeType) {
      const reader = new FileReader();
      reader.addEventListener("load", () => send("export", { dataUrl: reader.result, mimeType }), { once: true });
      reader.addEventListener("error", () => diagnostic("ExportError: Could not encode the canvas."), { once: true });
      reader.readAsDataURL(new Blob([buffer], { type: mimeType }));
    }
    function recordAnimation({ duration = 5, fps = 30 }) {
      if (!canvas.captureStream || typeof MediaRecorder !== "function") {
        diagnostic("ExportError: Animation capture is not supported in this browser.");
        return;
      }
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const chunks = [];
      const recorder = new MediaRecorder(canvas.captureStream(Math.max(1, Math.min(60, fps))), { mimeType });
      recorder.addEventListener("dataavailable", event => { if (event.data.size) chunks.push(event.data); });
      recorder.addEventListener("stop", async () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        returnExport(await blob.arrayBuffer(), "video/webm");
      }, { once: true });
      recorder.addEventListener("error", () => diagnostic("ExportError: Animation recording failed."), { once: true });
      recorder.start(250);
      window.setTimeout(() => recorder.stop(), Math.max(1, Math.min(15, duration)) * 1000);
    }

    if (typeof Worker !== "function" || typeof canvas.transferControlToOffscreen !== "function") {
      diagnostic("CompatibilityError: This browser does not support safe OffscreenCanvas execution.");
      finishReady();
    } else {
      const workerUrl = URL.createObjectURL(new Blob([${encodedWorker}], { type: "text/javascript" }));
      worker = new Worker(workerUrl);
      URL.revokeObjectURL(workerUrl);
      worker.addEventListener("message", event => {
        const data = event.data;
        if (data?.type === "ready") finishReady();
        if (data?.type === "console") send("console", data);
        if (data?.type === "diagnostic") send("diagnostic", data);
        if (data?.type === "fps") send("fps", data);
        if (data?.type === "asset-request") send("asset-request", data);
        if (data?.type === "create-button") createArtworkButton(data.id, data.label);
        if (data?.type === "export-result") returnExport(data.buffer, data.mimeType);
      });
      worker.addEventListener("error", event => {
        diagnostic("WorkerError: " + event.message);
        finishReady();
      });
      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ type: "init", canvas: offscreen, ...dimensions() }, [offscreen]);
      watchdog = window.setTimeout(() => {
        if (ready) return;
        diagnostic("ExecutionTimeoutError: Artwork initialization exceeded ${EXECUTION_TIMEOUT_MS / 1000} seconds and was stopped.");
        stopWorker("Initialization timeout");
      }, ${EXECUTION_TIMEOUT_MS});
    }

    window.addEventListener("resize", () => worker?.postMessage({ type: "resize", ...dimensions() }));
    canvas.addEventListener("pointermove", event => worker?.postMessage({ type: "pointer", eventType: "pointermove", x: event.clientX, y: event.clientY }));
    canvas.addEventListener("pointerdown", event => worker?.postMessage({ type: "pointer", eventType: "pointerdown", x: event.clientX, y: event.clientY }));
    window.addEventListener("message", event => {
      const data = event.data;
      if (data?.type === "atelier-stop") stopWorker("Stopped by user");
      if (data?.type === "atelier-animation-state") worker?.postMessage({ type: "animation-state", paused: data.paused });
      if (data?.type === "atelier-asset-response") worker?.postMessage({ ...data, type: "asset-response" });
      if (data?.type === "atelier-export") worker?.postMessage({ ...data, type: "export" });
      if (data?.type === "atelier-video-export") recordAnimation(data);
    });
  <\/script>
</body>
</html>`;
}

function buildArtworkWorker(source, seed) {
  const encodedSource = JSON.stringify(source);
  const encodedSeed = JSON.stringify(seed);
  return `const seed = ${encodedSeed};
const createRandom = ${createSeededRandom.toString()};
const random = createRandom(seed);
let canvas; let ctx; let width = 0; let height = 0; let dpr = 1;
let initialized = false; let animationPaused = false; let nextAnimationId = 1;
let executedFrames = 0; let fpsStartedAt = performance.now();
const animationRequests = new Map(); const resizeCallbacks = [];
const pointerCallbacks = new Map(); const buttonCallbacks = new Map();
const pendingAssets = new Map(); let nextAssetRequestId = 1; let nextButtonId = 1;
const nativeRequestFrame = self.requestAnimationFrame?.bind(self) ?? (callback => setTimeout(() => callback(performance.now()), 16));
const nativeCancelFrame = self.cancelAnimationFrame?.bind(self) ?? clearTimeout;
const window = self;
const document = {
  createElement(tagName) {
    if (String(tagName).toLowerCase() === "canvas") return new OffscreenCanvas(1, 1);
    throw new Error("Only offscreen canvas elements are available inside artwork code.");
  }
};
try { Object.defineProperty(window, "devicePixelRatio", { configurable: true, get: () => dpr }); } catch {}

function serialize(value) {
  if (value instanceof Error) return value.name + ": " + value.message;
  if (typeof value === "object") { try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); } }
  return value;
}
["log", "info", "warn", "error"].forEach(level => {
  console[level] = (...values) => postMessage({ type: "console", level, values: values.map(serialize) });
});
function reportDiagnostic(error) {
  const match = String(error?.stack || "").match(/artwork\\.js:(\\d+):(\\d+)/);
  postMessage({ type: "diagnostic", message: error?.name ? error.name + ": " + error.message : String(error), stack: String(error?.stack || ""), line: match ? Math.max(1, Number(match[1]) - 2) : undefined, column: match ? Number(match[2]) : undefined });
}
self.addEventListener("error", event => reportDiagnostic(event.error ?? new Error(event.message)));
self.addEventListener("unhandledrejection", event => reportDiagnostic(event.reason instanceof Error ? event.reason : new Error(String(event.reason))));

function scheduleAnimation(id, callback) {
  const nativeId = nativeRequestFrame(time => {
    const request = animationRequests.get(id); if (!request) return;
    if (animationPaused) { request.nativeId = null; return; }
    animationRequests.delete(id); executedFrames += 1; callback(time);
  });
  animationRequests.set(id, { callback, nativeId });
}
self.requestAnimationFrame = callback => { const id = nextAnimationId++; if (animationPaused) animationRequests.set(id, { callback, nativeId: null }); else scheduleAnimation(id, callback); return id; };
self.cancelAnimationFrame = id => { const request = animationRequests.get(id); if (request?.nativeId != null) nativeCancelFrame(request.nativeId); animationRequests.delete(id); };
function setAnimationPaused(paused) {
  animationPaused = paused;
  if (!paused) [...animationRequests.entries()].filter(([, request]) => request.nativeId === null).forEach(([id, request]) => scheduleAnimation(id, request.callback));
}
function reportFps(time) {
  const elapsed = time - fpsStartedAt;
  if (elapsed >= 1000) { postMessage({ type: "fps", fps: animationPaused ? 0 : Math.round(executedFrames * 1000 / elapsed) }); executedFrames = 0; fpsStartedAt = time; }
  nativeRequestFrame(reportFps);
}
nativeRequestFrame(reportFps);

function fitCanvas(nextWidth = width, nextHeight = height, nextDpr = dpr) {
  width = nextWidth; height = nextHeight; dpr = Math.min(nextDpr || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function onResize(callback) { resizeCallbacks.push(callback); }
function createButton(label) {
  const id = nextButtonId++; postMessage({ type: "create-button", id, label: String(label) });
  return { addEventListener(type, callback) { if (type === "click") buttonCallbacks.set(id, callback); }, set onclick(callback) { buttonCallbacks.set(id, callback); } };
}
function loadImageAsset(assetId) {
  return new Promise((resolve, reject) => { const requestId = nextAssetRequestId++; pendingAssets.set(requestId, { resolve, reject }); postMessage({ type: "asset-request", assetId, requestId }); });
}
async function resolveAsset(data) {
  const request = pendingAssets.get(data.requestId); if (!request) return; pendingAssets.delete(data.requestId);
  if (data.error) { request.reject(new Error(data.error)); return; }
  try { request.resolve(await createImageBitmap(await (await fetch(data.dataUrl)).blob())); }
  catch { request.reject(new Error("Asset image decoding failed.")); }
}
async function exportCanvas(options) {
  try {
    const outputWidth = Math.max(64, Math.min(10000, Math.round(options.width || width)));
    const outputHeight = Math.max(64, Math.min(10000, Math.round(options.height || height)));
    if (outputWidth * outputHeight > 100000000) throw new Error("Export exceeds the 100 megapixel limit.");
    const output = new OffscreenCanvas(outputWidth, outputHeight);
    const outputContext = output.getContext("2d", { alpha: true });
    if (!options.preserveTransparency || options.mimeType === "image/jpeg") {
      outputContext.fillStyle = options.backgroundColor || "#020406";
      outputContext.fillRect(0, 0, outputWidth, outputHeight);
    }
    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = "high";
    outputContext.drawImage(canvas, 0, 0, outputWidth, outputHeight);
    const blob = await output.convertToBlob({ type: options.mimeType || "image/png", quality: options.quality ?? 0.92 });
    const buffer = await blob.arrayBuffer();
    postMessage({ type: "export-result", buffer, mimeType: blob.type }, [buffer]);
  }
  catch (error) { reportDiagnostic(new Error("Could not export canvas: " + error.message)); }
}

self.addEventListener("message", event => {
  const data = event.data;
  if (data.type === "init") {
    canvas = data.canvas; ctx = canvas.getContext("2d");
    canvas.addEventListener = (type, callback) => { const callbacks = pointerCallbacks.get(type) ?? []; callbacks.push(callback); pointerCallbacks.set(type, callbacks); };
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height });
    fitCanvas(data.width, data.height, data.dpr);
    try { new Function(${encodedSource})(); initialized = true; postMessage({ type: "ready" }); }
    catch (error) { reportDiagnostic(error); postMessage({ type: "ready" }); }
  }
  if (data.type === "resize" && initialized) { fitCanvas(data.width, data.height, data.dpr); resizeCallbacks.forEach(callback => callback()); }
  if (data.type === "pointer") (pointerCallbacks.get(data.eventType) ?? []).forEach(callback => callback({ clientX: data.x, clientY: data.y }));
  if (data.type === "button-click") buttonCallbacks.get(data.id)?.();
  if (data.type === "animation-state") setAnimationPaused(data.paused);
  if (data.type === "asset-response") resolveAsset(data);
  if (data.type === "export") exportCanvas(data);
});`;
}
