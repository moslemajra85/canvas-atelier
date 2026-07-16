import { buildWorkerPreviewDocument } from "./WorkerPreviewDocument.js";

const MESSAGE_SOURCE = "canvas-atelier-preview";

/** Adapter around the sandboxed iframe and its postMessage protocol. */
export class PreviewRuntime {
  #runId = 0;
  #paused = false;

  constructor({ frame, events, assets = null }) {
    this.frame = frame;
    this.events = events;
    this.assets = assets;
    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener("message", this.handleMessage);
  }

  get paused() {
    return this.#paused;
  }

  run(source, seed = "atelier") {
    this.#runId += 1;
    this.#paused = false;
    this.frame.srcdoc = buildWorkerPreviewDocument(source, this.#runId, seed);
    this.events.emit("runtime:running");
  }

  toggleAnimation() {
    this.#paused = !this.#paused;
    this.frame.contentWindow?.postMessage({
      type: "atelier-animation-state",
      paused: this.#paused
    }, "*");
    this.events.emit("runtime:animation", { paused: this.#paused });
    return this.#paused;
  }

  requestExport(options = {}) {
    this.frame.contentWindow?.postMessage({ type: "atelier-export", ...options }, "*");
  }

  requestVideoExport(options = {}) {
    this.frame.contentWindow?.postMessage({ type: "atelier-video-export", ...options }, "*");
  }

  stop() {
    this.#paused = true;
    this.frame.contentWindow?.postMessage({ type: "atelier-stop" }, "*");
    this.events.emit("runtime:animation", { paused: true });
  }

  handleMessage(event) {
    const data = event.data;
    if (
      event.source !== this.frame.contentWindow ||
      data?.source !== MESSAGE_SOURCE ||
      data.runId !== this.#runId
    ) return;

    if (data.type === "asset-request") {
      this.resolveAssetRequest(data);
      return;
    }
    this.events.emit(`runtime:${data.type}`, data);
  }

  async resolveAssetRequest({ assetId, requestId, runId }) {
    try {
      if (!this.assets?.has(assetId)) throw new Error("Unknown library asset.");
      const dataUrl = await this.assets.loadDataUrl(assetId);
      if (runId !== this.#runId) return;
      this.frame.contentWindow?.postMessage({
        type: "atelier-asset-response",
        requestId,
        dataUrl
      }, "*");
    } catch (error) {
      if (runId !== this.#runId) return;
      this.frame.contentWindow?.postMessage({
        type: "atelier-asset-response",
        requestId,
        error: error.message
      }, "*");
    }
  }

  destroy() {
    window.removeEventListener("message", this.handleMessage);
  }
}

export const buildPreviewDocument = buildWorkerPreviewDocument;

/** Convert generated Function stack positions back to learner source positions. */
export function extractArtworkLocation(stack) {
  const match = String(stack ?? "").match(/artwork\.js:(\d+):(\d+)/);
  if (!match) return null;
  return {
    line: Math.max(1, Number(match[1]) - 2),
    column: Math.max(1, Number(match[2]))
  };
}
