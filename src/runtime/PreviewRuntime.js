const MESSAGE_SOURCE = "canvas-atelier-preview";

/** Adapter around the sandboxed iframe and its postMessage protocol. */
export class PreviewRuntime {
  #runId = 0;
  #paused = false;

  constructor({ frame, events }) {
    this.frame = frame;
    this.events = events;
    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener("message", this.handleMessage);
  }

  get paused() {
    return this.#paused;
  }

  run(source) {
    this.#runId += 1;
    this.#paused = false;
    this.frame.srcdoc = buildPreviewDocument(source, this.#runId);
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

  requestExport() {
    this.frame.contentWindow?.postMessage({ type: "atelier-export" }, "*");
  }

  handleMessage(event) {
    const data = event.data;
    if (
      event.source !== this.frame.contentWindow ||
      data?.source !== MESSAGE_SOURCE ||
      data.runId !== this.#runId
    ) return;

    this.events.emit(`runtime:${data.type}`, data);
  }

  destroy() {
    window.removeEventListener("message", this.handleMessage);
  }
}

export function buildPreviewDocument(source, runId) {
  const encodedSource = JSON.stringify(source).replaceAll("</script", "<\\/script");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #020406; }
    canvas { display: block; width: 100%; height: 100%; }
    .atelier-button {
      position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%);
      padding: 9px 15px; border: 1px solid rgba(255,255,255,.17); border-radius: 999px;
      background: rgba(8,12,16,.62); color: rgba(255,255,255,.82); backdrop-filter: blur(12px);
      font: 500 11px system-ui, sans-serif; letter-spacing: .02em; cursor: pointer;
    }
    .atelier-button:hover { background: rgba(255,255,255,.11); color: white; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script>
    const RUN_ID = ${runId};
    const send = (type, payload = {}) => parent.postMessage({
      source: "${MESSAGE_SOURCE}", runId: RUN_ID, type, ...payload
    }, "*");
    const nativeConsole = { log: console.log, info: console.info, warn: console.warn, error: console.error };

    ["log", "info", "warn", "error"].forEach(level => {
      console[level] = (...values) => {
        nativeConsole[level](...values);
        send("console", { level, values: values.map(value => {
          if (value instanceof Error) return value.name + ": " + value.message;
          if (typeof value === "object") {
            try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
          }
          return value;
        }) });
      };
    });

    window.addEventListener("error", event => {
      send("console", { level: "error", values: [event.message + " (line " + (event.lineno || "?") + ")"] });
    });
    window.addEventListener("unhandledrejection", event => {
      const reason = event.reason instanceof Error ? event.reason.stack : String(event.reason);
      send("console", { level: "error", values: ["Unhandled promise rejection: " + reason] });
    });

    const nativeRequestFrame = window.requestAnimationFrame.bind(window);
    const nativeCancelFrame = window.cancelAnimationFrame.bind(window);
    let nextAnimationId = 1;
    let animationPaused = false;
    let executedFrames = 0;
    let fpsStartedAt = performance.now();
    const animationRequests = new Map();

    function scheduleAnimation(id, callback) {
      const nativeId = nativeRequestFrame(time => {
        const request = animationRequests.get(id);
        if (!request) return;
        if (animationPaused) {
          request.nativeId = null;
          return;
        }
        animationRequests.delete(id);
        executedFrames += 1;
        callback(time);
      });
      animationRequests.set(id, { callback, nativeId });
    }

    window.requestAnimationFrame = callback => {
      const id = nextAnimationId++;
      if (animationPaused) animationRequests.set(id, { callback, nativeId: null });
      else scheduleAnimation(id, callback);
      return id;
    };

    window.cancelAnimationFrame = id => {
      const request = animationRequests.get(id);
      if (request && request.nativeId !== null) nativeCancelFrame(request.nativeId);
      animationRequests.delete(id);
    };

    function setAnimationPaused(paused) {
      animationPaused = paused;
      if (!paused) {
        [...animationRequests.entries()]
          .filter(([, request]) => request.nativeId === null)
          .forEach(([id, request]) => scheduleAnimation(id, request.callback));
      }
    }

    function reportFps(time) {
      const elapsed = time - fpsStartedAt;
      if (elapsed >= 1000) {
        send("fps", { fps: animationPaused ? 0 : Math.round(executedFrames * 1000 / elapsed) });
        executedFrames = 0;
        fpsStartedAt = time;
      }
      nativeRequestFrame(reportFps);
    }
    nativeRequestFrame(reportFps);

    const canvas = document.querySelector("#canvas");
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    const resizeCallbacks = [];

    function fitCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onResize(callback) { resizeCallbacks.push(callback); }
    function createButton(label) {
      const button = document.createElement("button");
      button.className = "atelier-button";
      button.textContent = label;
      document.body.append(button);
      return button;
    }

    fitCanvas();
    window.addEventListener("resize", () => {
      fitCanvas();
      resizeCallbacks.forEach(callback => callback());
    });
    window.addEventListener("message", event => {
      if (event.data?.type === "atelier-animation-state") setAnimationPaused(event.data.paused);
      if (event.data?.type === "atelier-export") {
        try { send("export", { dataUrl: canvas.toDataURL("image/png") }); }
        catch (error) { console.error("Could not export canvas:", error.message); }
      }
    });

    try {
      new Function(${encodedSource})();
      send("ready");
    } catch (error) {
      console.error(error.name + ": " + error.message);
      send("ready");
    }
  <\/script>
</body>
</html>`;
}
