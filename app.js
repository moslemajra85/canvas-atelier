import { EventBus } from "./src/core/EventBus.js";
import { CodeEditor } from "./src/editor/CodeEditor.js";
import { butterflyLesson } from "./src/lessons/butterfly.js";
import { PreviewRuntime } from "./src/runtime/PreviewRuntime.js";
import { ConsoleStore } from "./src/services/ConsoleStore.js";
import { ProjectStorage } from "./src/services/ProjectStorage.js";
import { StudioController } from "./src/ui/StudioController.js";

const elements = {
  editorHost: document.querySelector("#codeEditor"),
  cursor: document.querySelector("#cursorPosition"),
  frame: document.querySelector("#previewFrame"),
  run: document.querySelector("#runButton"),
  refresh: document.querySelector("#refreshButton"),
  reset: document.querySelector("#resetButton"),
  autoRun: document.querySelector("#autoRunToggle"),
  dirty: document.querySelector("#dirtyIndicator"),
  saved: document.querySelector("#savedLabel"),
  output: document.querySelector("#consoleOutput"),
  messageCount: document.querySelector("#messageCount"),
  clearConsole: document.querySelector("#clearConsoleButton"),
  running: document.querySelector("#runningIndicator"),
  animation: document.querySelector("#animationButton"),
  fps: document.querySelector("#fpsLabel"),
  download: document.querySelector("#downloadButton"),
  fullscreen: document.querySelector("#fullscreenButton"),
  canvasStage: document.querySelector("#canvasStage"),
  toast: document.querySelector("#toast"),
  lesson: document.querySelector("#lessonCard"),
  lessonKicker: document.querySelector("#lessonKicker"),
  lessonTitle: document.querySelector("#lessonTitle"),
  lessonBody: document.querySelector("#lessonBody"),
  lessonClose: document.querySelector("#lessonClose"),
  shortcuts: document.querySelector("#shortcutsDialog"),
  shortcutsButton: document.querySelector("#shortcutsButton"),
  closeShortcuts: document.querySelector("#closeShortcutsButton")
};

const events = new EventBus();
const storage = new ProjectStorage();
const consoleStore = new ConsoleStore();
const runtime = new PreviewRuntime({ frame: elements.frame, events });

let studio;
const editor = new CodeEditor({
  parent: elements.editorHost,
  source: storage.load(butterflyLesson.source),
  onChange: () => studio?.handleSourceChange(),
  onCursorChange: (position) => studio?.updateCursor(position),
  onRun: () => studio?.run()
});

studio = new StudioController({
  editor,
  runtime,
  storage,
  consoleStore,
  events,
  lesson: butterflyLesson,
  elements
});

studio.updateCursor({ line: 1, column: 1 });
studio.start();
