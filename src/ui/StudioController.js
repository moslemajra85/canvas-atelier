const AUTO_RUN_DELAY = 650;
const SAVE_DELAY = 350;

export class StudioController {
  constructor({ editor, runtime, storage, consoleStore, events, lesson, elements }) {
    this.editor = editor;
    this.runtime = runtime;
    this.storage = storage;
    this.consoleStore = consoleStore;
    this.events = events;
    this.lesson = lesson;
    this.elements = elements;
    this.autoRunTimer = null;
    this.saveTimer = null;
    this.toastTimer = null;
    this.bindRuntimeEvents();
    this.bindControls();
  }

  start() {
    this.elements.lessonKicker.textContent = this.lesson.note.kicker;
    this.elements.lessonTitle.textContent = this.lesson.note.title;
    this.elements.lessonBody.textContent = this.lesson.note.body;
    this.renderConsole();
    this.run();
  }

  handleSourceChange() {
    this.elements.dirty.classList.add("visible");
    this.elements.saved.textContent = "Saving…";
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.save(), SAVE_DELAY);

    if (this.elements.autoRun.checked) {
      window.clearTimeout(this.autoRunTimer);
      this.autoRunTimer = window.setTimeout(() => this.run(), AUTO_RUN_DELAY);
    }
  }

  updateCursor({ line, column }) {
    this.elements.cursor.textContent = `Ln ${line}, Col ${column}`;
  }

  save() {
    const saved = this.storage.save(this.editor.getValue());
    this.elements.dirty.classList.toggle("visible", !saved);
    this.elements.saved.textContent = saved ? "Saved locally" : "Local save unavailable";
  }

  run() {
    window.clearTimeout(this.autoRunTimer);
    this.consoleStore.clear();
    this.renderConsole();
    this.setAnimationUi(false);
    this.elements.fps.textContent = "— fps";
    this.runtime.run(this.editor.getValue());
  }

  reset() {
    const accepted = window.confirm(
      "Reset the editor to the original animated butterfly lesson? Your current code will be replaced."
    );
    if (!accepted) return;
    window.clearTimeout(this.autoRunTimer);
    this.editor.setValue(this.lesson.source);
    this.save();
    this.run();
    this.showToast("Starter artwork restored");
  }

  bindRuntimeEvents() {
    this.events.on("runtime:running", () => this.elements.running.classList.add("visible"));
    this.events.on("runtime:ready", () => this.elements.running.classList.remove("visible"));
    this.events.on("runtime:console", ({ level, values }) => {
      this.consoleStore.add(level, values);
      this.renderConsole();
    });
    this.events.on("runtime:fps", ({ fps }) => {
      if (!this.runtime.paused) this.elements.fps.textContent = `${fps} fps`;
    });
    this.events.on("runtime:animation", ({ paused }) => this.setAnimationUi(paused));
    this.events.on("runtime:export", ({ dataUrl }) => this.downloadDataUrl(dataUrl));
  }

  bindControls() {
    this.elements.run.addEventListener("click", () => this.run());
    this.elements.refresh.addEventListener("click", () => this.run());
    this.elements.reset.addEventListener("click", () => this.reset());
    this.elements.clearConsole.addEventListener("click", () => {
      this.consoleStore.clear();
      this.renderConsole();
    });
    this.elements.animation.addEventListener("click", () => this.runtime.toggleAnimation());
    this.elements.download.addEventListener("click", () => this.runtime.requestExport());
    this.elements.fullscreen.addEventListener("click", async () => {
      try {
        await this.elements.canvasStage.requestFullscreen();
      } catch {
        this.showToast("Fullscreen is not available in this browser");
      }
    });
    this.elements.lessonClose.addEventListener("click", () => this.elements.lesson.classList.add("hidden"));
    this.elements.shortcutsButton.addEventListener("click", () => this.elements.shortcuts.showModal());
    this.elements.closeShortcuts.addEventListener("click", () => this.elements.shortcuts.close());
  }

  setAnimationUi(paused) {
    this.elements.animation.classList.toggle("paused", paused);
    this.elements.animation.title = paused ? "Resume animation" : "Pause animation";
    this.elements.animation.setAttribute("aria-label", this.elements.animation.title);
    this.elements.animation.firstElementChild.className = paused ? "resume-icon" : "pause-icon";
    if (paused) this.elements.fps.textContent = "Paused";
  }

  renderConsole() {
    const messages = this.consoleStore.messages;
    this.elements.messageCount.textContent = messages.length;
    if (!messages.length) {
      this.elements.output.innerHTML = '<div class="console-empty">No messages. Your artwork ran cleanly.</div>';
      return;
    }

    this.elements.output.replaceChildren(...messages.map((message) => {
      const row = document.createElement("div");
      row.className = `console-message ${message.level}`;
      const time = document.createElement("span");
      time.className = "time";
      time.textContent = message.time;
      const body = document.createElement("span");
      body.textContent = message.values.map(serializeConsoleValue).join(" ");
      row.append(time, body);
      return row;
    }));
    this.elements.output.scrollTop = this.elements.output.scrollHeight;
  }

  downloadDataUrl(dataUrl) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `canvas-atelier-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
    this.showToast("PNG export ready");
  }

  showToast(message) {
    window.clearTimeout(this.toastTimer);
    this.elements.toast.textContent = message;
    this.elements.toast.classList.add("visible");
    this.toastTimer = window.setTimeout(() => this.elements.toast.classList.remove("visible"), 1800);
  }
}

function serializeConsoleValue(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
