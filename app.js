import { EventBus } from "./src/core/EventBus.js";
import { CodeEditor } from "./src/editor/CodeEditor.js";
import { createPersonalSketchDefinition, lessonCatalog } from "./src/lessons/index.js";
import { PreviewRuntime } from "./src/runtime/PreviewRuntime.js";
import { ConsoleStore } from "./src/services/ConsoleStore.js";
import { ProjectStorage } from "./src/services/ProjectStorage.js";
import { StudioController } from "./src/ui/StudioController.js";
import { AssetStore } from "./src/services/AssetStore.js";
import { builtInAssets } from "./src/services/builtinAssets.js";
import { UserAssetStore } from "./src/services/UserAssetStore.js";

const elements = {
  editorHost: document.querySelector("#codeEditor"),
  cursor: document.querySelector("#cursorPosition"),
  projectName: document.querySelector("#projectName"),
  fileName: document.querySelector("#fileName"),
  lessonSelect: document.querySelector("#lessonSelect"),
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
  stop: document.querySelector("#stopButton"),
  fps: document.querySelector("#fpsLabel"),
  seed: document.querySelector("#seedLabel"),
  seedButton: document.querySelector("#seedButton"),
  download: document.querySelector("#downloadButton"),
  fullscreen: document.querySelector("#fullscreenButton"),
  exportDialog: document.querySelector("#exportDialog"),
  closeExport: document.querySelector("#closeExportButton"),
  cancelExport: document.querySelector("#cancelExportButton"),
  exportForm: document.querySelector("#exportForm"),
  exportType: document.querySelector("#exportType"),
  exportPreset: document.querySelector("#exportPreset"),
  exportWidth: document.querySelector("#exportWidth"),
  exportHeight: document.querySelector("#exportHeight"),
  exportFormat: document.querySelector("#exportFormat"),
  exportQuality: document.querySelector("#exportQuality"),
  exportTransparent: document.querySelector("#exportTransparent"),
  exportBackground: document.querySelector("#exportBackground"),
  exportDuration: document.querySelector("#exportDuration"),
  exportFps: document.querySelector("#exportFps"),
  stillExportFields: document.querySelector("#stillExportFields"),
  videoExportFields: document.querySelector("#videoExportFields"),
  exportSummary: document.querySelector("#exportSummary"),
  canvasStage: document.querySelector("#canvasStage"),
  toast: document.querySelector("#toast"),
  libraryButton: document.querySelector("#libraryButton"),
  layersButton: document.querySelector("#layersButton"),
  layersDialog: document.querySelector("#layersDialog"),
  closeLayers: document.querySelector("#closeLayersButton"),
  layersList: document.querySelector("#layersList"),
  libraryDialog: document.querySelector("#libraryDialog"),
  closeLibrary: document.querySelector("#closeLibraryButton"),
  libraryType: document.querySelector("#libraryType"),
  libraryCategory: document.querySelector("#libraryCategory"),
  libraryCount: document.querySelector("#libraryCount"),
  libraryList: document.querySelector("#libraryList"),
  uploadAsset: document.querySelector("#uploadAssetButton"),
  assetFileInput: document.querySelector("#assetFileInput"),
  particleBuilderDialog: document.querySelector("#particleBuilderDialog"),
  closeParticleBuilder: document.querySelector("#closeParticleBuilderButton"),
  particleBuilderTitle: document.querySelector("#particleBuilderTitle"),
  particleBuilderPreview: document.querySelector("#particleBuilderPreview"),
  particleBuilderForm: document.querySelector("#particleBuilderForm"),
  particlePresetName: document.querySelector("#particlePresetName"),
  particleQuality: document.querySelector("#particleQuality"),
  particleZIndex: document.querySelector("#particleZIndex"),
  particleMax: document.querySelector("#particleMax"),
  particleRate: document.querySelector("#particleRate"),
  particleGravity: document.querySelector("#particleGravity"),
  particleWind: document.querySelector("#particleWind"),
  particleSizeMin: document.querySelector("#particleSizeMin"),
  particleSizeMax: document.querySelector("#particleSizeMax"),
  particleOpacity: document.querySelector("#particleOpacity"),
  particleShape: document.querySelector("#particleShape"),
  particleBlend: document.querySelector("#particleBlend"),
  particleColors: document.querySelector("#particleColors"),
  particleBudget: document.querySelector("#particleBudgetLabel"),
  particleGeneratedCode: document.querySelector("#particleGeneratedCode"),
  saveParticlePreset: document.querySelector("#saveParticlePresetButton"),
  galleryButton: document.querySelector("#galleryButton"),
  galleryDialog: document.querySelector("#galleryDialog"),
  closeGallery: document.querySelector("#closeGalleryButton"),
  createSketch: document.querySelector("#createSketchButton"),
  galleryList: document.querySelector("#galleryList"),
  historyButton: document.querySelector("#historyButton"),
  revisionDialog: document.querySelector("#revisionDialog"),
  closeRevision: document.querySelector("#closeRevisionButton"),
  saveRevision: document.querySelector("#saveRevisionButton"),
  importProject: document.querySelector("#importProjectButton"),
  exportProject: document.querySelector("#exportProjectButton"),
  projectFileInput: document.querySelector("#projectFileInput"),
  revisionLessonName: document.querySelector("#revisionLessonName"),
  revisionList: document.querySelector("#revisionList"),
  lesson: document.querySelector("#lessonCard"),
  goals: document.querySelector("#goalsButton"),
  goalsCount: document.querySelector("#goalsCount"),
  lessonKicker: document.querySelector("#lessonKicker"),
  lessonTitle: document.querySelector("#lessonTitle"),
  lessonBody: document.querySelector("#lessonBody"),
  lessonClose: document.querySelector("#lessonClose"),
  checkpointPosition: document.querySelector("#checkpointPosition"),
  checkpointStatus: document.querySelector("#checkpointStatus"),
  checkpointTitle: document.querySelector("#checkpointTitle"),
  checkpointDescription: document.querySelector("#checkpointDescription"),
  checkpointHint: document.querySelector("#checkpointHint"),
  checkpointAction: document.querySelector("#checkpointAction"),
  checkpointHintButton: document.querySelector("#checkpointHintButton"),
  checkpointPrevious: document.querySelector("#previousCheckpoint"),
  checkpointNext: document.querySelector("#nextCheckpoint"),
  checkpointProgressLabel: document.querySelector("#checkpointProgressLabel"),
  lessonProgress: document.querySelector(".lesson-progress"),
  lessonProgressBar: document.querySelector("#lessonProgressBar"),
  help: document.querySelector("#helpDialog"),
  helpButton: document.querySelector("#helpButton"),
  closeHelp: document.querySelector("#closeHelpButton")
};

const events = new EventBus();
const storage = new ProjectStorage();
storage.loadSketches().forEach(sketch => {
  if (!lessonCatalog.has(sketch.baseLessonId)) return;
  lessonCatalog.add(createPersonalSketchDefinition(
    sketch,
    lessonCatalog.get(sketch.baseLessonId)
  ));
});
const consoleStore = new ConsoleStore();
const userAssets = new UserAssetStore();
const userAssetRecords = await userAssets.list().catch(() => []);
const assets = new AssetStore(builtInAssets);
userAssetRecords.forEach(record => assets.register(record));
const runtime = new PreviewRuntime({ frame: elements.frame, events, assets });
const initialLesson = lessonCatalog.get(
  storage.loadActiveLesson(lessonCatalog.defaultLesson.id)
);

const lessonOptions = document.createElement("optgroup");
lessonOptions.label = "Guided lessons";
const playgroundOptions = document.createElement("optgroup");
playgroundOptions.label = "Independent work";
const sketchOptions = document.createElement("optgroup");
sketchOptions.label = "My sketches";
elements.sketchOptions = sketchOptions;

lessonCatalog.lessons.forEach(lesson => {
  const option = document.createElement("option");
  option.value = lesson.id;
  option.textContent = lesson.title;
  const group = lesson.kind === "sketch"
    ? sketchOptions
    : lesson.kind === "playground" ? playgroundOptions : lessonOptions;
  group.append(option);
});
elements.lessonSelect.append(lessonOptions, playgroundOptions, sketchOptions);

let studio;
const editor = new CodeEditor({
  parent: elements.editorHost,
  source: storage.load(initialLesson.id, initialLesson.source),
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
  lessonCatalog,
  initialLesson,
  elements,
  assets,
  userAssets,
  userAssetRecords
});

studio.updateCursor({ line: 1, column: 1 });
studio.start();
