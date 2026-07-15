import { createProjectFile, parseProjectFile, projectFileName } from "../services/ProjectFile.js";
import { createPersonalSketchDefinition } from "../lessons/index.js";
import { generateSeed } from "../services/Seed.js";
import { buildPreviewDocument } from "../runtime/PreviewRuntime.js";

const AUTO_RUN_DELAY = 650;
const SAVE_DELAY = 350;
const REVISION_DELAY = 5000;
const MAX_PROJECT_FILE_SIZE = 1024 * 1024;

export class StudioController {
  constructor({ editor, runtime, storage, consoleStore, events, lessonCatalog, initialLesson, elements }) {
    this.editor = editor;
    this.runtime = runtime;
    this.storage = storage;
    this.consoleStore = consoleStore;
    this.events = events;
    this.lessonCatalog = lessonCatalog;
    this.currentLesson = initialLesson;
    this.currentSeed = this.storage.loadSeed(initialLesson.id, generateSeed());
    this.storage.saveSeed(initialLesson.id, this.currentSeed);
    this.completedCheckpointIds = new Set();
    this.currentCheckpointIndex = 0;
    this.editorDiagnostics = [];
    this.hasUnsnapshottedChanges = false;
    this.fractalCatalog = null;
    this.imageCatalog = null;
    this.particleCatalog = null;
    this.createParticleEntry = null;
    this.particlePreviewTimer = null;
    this.particleBuilderEntry = null;
    this.elements = elements;
    this.isSwitchingLesson = false;
    this.autoRunTimer = null;
    this.saveTimer = null;
    this.toastTimer = null;
    this.revisionTimer = null;
    this.bindRuntimeEvents();
    this.bindControls();
  }

  start() {
    this.loadLessonProgress();
    this.updateLessonUi();
    this.renderConsole();
    this.run();
  }

  handleSourceChange() {
    if (this.isSwitchingLesson) return;
    this.editorDiagnostics = [];
    this.hasUnsnapshottedChanges = true;
    this.elements.dirty.classList.add("visible");
    this.elements.saved.textContent = "Saving…";
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.save(), SAVE_DELAY);
    window.clearTimeout(this.revisionTimer);
    this.revisionTimer = window.setTimeout(
      () => this.createRevision("Autosave"),
      REVISION_DELAY
    );

    if (this.elements.autoRun.checked) {
      window.clearTimeout(this.autoRunTimer);
      this.autoRunTimer = window.setTimeout(() => this.run(), AUTO_RUN_DELAY);
    }
  }

  updateCursor({ line, column }) {
    this.elements.cursor.textContent = `Ln ${line}, Col ${column}`;
  }

  save() {
    const saved = this.storage.save(this.currentLesson.id, this.editor.getValue());
    this.elements.dirty.classList.toggle("visible", !saved);
    this.elements.saved.textContent = saved ? "Saved locally" : "Local save unavailable";
  }

  run() {
    window.clearTimeout(this.autoRunTimer);
    this.editorDiagnostics = this.editor.getSyntaxDiagnostics();
    this.editor.setDiagnostics(this.editorDiagnostics);
    this.consoleStore.clear();
    this.renderConsole();
    this.setAnimationUi(false);
    this.elements.fps.textContent = "— fps";
    this.runtime.run(this.editor.getValue(), this.currentSeed);
  }

  reset() {
    const accepted = window.confirm(
      `Reset ${this.currentLesson.title} to its original lesson code? Your current code will be replaced.`
    );
    if (!accepted) return;
    if (this.editor.getValue() !== this.currentLesson.source) {
      this.createRevision("Before reset");
    }
    window.clearTimeout(this.autoRunTimer);
    window.clearTimeout(this.revisionTimer);
    this.isSwitchingLesson = true;
    this.editor.setValue(this.currentLesson.source);
    this.isSwitchingLesson = false;
    this.save();
    this.hasUnsnapshottedChanges = false;
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
    this.events.on("runtime:diagnostic", ({ message, line, column }) => {
      const runtimeLocation = Number.isInteger(line) ? { line, column } : null;
      const location = runtimeLocation ?? (
        this.editorDiagnostics.length === 1
          ? { line: this.editorDiagnostics[0].line, column: this.editorDiagnostics[0].column }
          : null
      );
      const diagnostic = { message, ...location };
      if (location) {
        const alreadyHighlighted = this.editorDiagnostics.some(existing => (
          existing.line === location.line && existing.column === location.column
        ));
        if (!alreadyHighlighted) this.editorDiagnostics.push(diagnostic);
        this.editor.setDiagnostics(this.editorDiagnostics);
      }
      this.consoleStore.add("error", [message], undefined, location);
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
    this.elements.seedButton.addEventListener("click", () => this.generateNewSeed());
    this.elements.lessonSelect.addEventListener("change", event => this.switchLesson(event.target.value));
    this.elements.download.addEventListener("click", () => this.runtime.requestExport());
    this.elements.fullscreen.addEventListener("click", async () => {
      try {
        await this.elements.canvasStage.requestFullscreen();
      } catch {
        this.showToast("Fullscreen is not available in this browser");
      }
    });
    this.elements.lessonClose.addEventListener("click", () => this.setGoalsOpen(false));
    this.elements.goals.addEventListener("click", () => {
      this.setGoalsOpen(this.elements.lesson.classList.contains("hidden"));
    });
    this.elements.checkpointAction.addEventListener("click", () => this.completeCurrentCheckpoint());
    this.elements.checkpointHintButton.addEventListener("click", () => this.toggleCheckpointHint());
    this.elements.checkpointPrevious.addEventListener("click", () => this.moveCheckpoint(-1));
    this.elements.checkpointNext.addEventListener("click", () => this.moveCheckpoint(1));
    this.elements.helpButton.addEventListener("click", () => this.elements.help.showModal());
    this.elements.closeHelp.addEventListener("click", () => this.elements.help.close());
    this.elements.historyButton.addEventListener("click", () => this.openRevisionHistory());
    this.elements.closeRevision.addEventListener("click", () => this.elements.revisionDialog.close());
    this.elements.saveRevision.addEventListener("click", () => this.createRevision("Manual version", true));
    this.elements.exportProject.addEventListener("click", () => this.exportProjectFile());
    this.elements.importProject.addEventListener("click", () => {
      this.elements.projectFileInput.value = "";
      this.elements.projectFileInput.click();
    });
    this.elements.projectFileInput.addEventListener("change", event => {
      this.importProjectFile(event.target.files?.[0]);
    });
    this.elements.galleryButton.addEventListener("click", () => this.openGallery());
    this.elements.closeGallery.addEventListener("click", () => this.elements.galleryDialog.close());
    this.elements.createSketch.addEventListener("click", () => this.createPersonalSketch());
    this.elements.libraryButton.addEventListener("click", () => this.openLibrary());
    this.elements.closeLibrary.addEventListener("click", () => this.elements.libraryDialog.close());
    this.elements.libraryType.addEventListener("change", () => {
      this.populateLibraryCategories();
      this.renderLibrary();
    });
    this.elements.libraryCategory.addEventListener("change", () => this.renderLibrary());
    this.elements.closeParticleBuilder.addEventListener("click", () => this.elements.particleBuilderDialog.close());
    this.elements.particleBuilderForm.addEventListener("input", () => this.scheduleParticlePreview());
    this.elements.particleBuilderForm.addEventListener("submit", event => {
      event.preventDefault();
      this.insertConfiguredParticle();
    });
    this.elements.saveParticlePreset.addEventListener("click", () => this.saveConfiguredParticlePreset());
  }

  switchLesson(lessonId) {
    window.clearTimeout(this.revisionTimer);
    if (this.hasUnsnapshottedChanges) this.createRevision("Before switching lessons");
    this.save();
    this.currentLesson = this.lessonCatalog.get(lessonId);
    this.currentSeed = this.storage.loadSeed(this.currentLesson.id, generateSeed());
    this.storage.saveSeed(this.currentLesson.id, this.currentSeed);
    this.storage.saveActiveLesson(this.currentLesson.id);
    window.clearTimeout(this.autoRunTimer);
    window.clearTimeout(this.saveTimer);

    this.isSwitchingLesson = true;
    this.editor.setValue(
      this.storage.load(this.currentLesson.id, this.currentLesson.source)
    );
    this.isSwitchingLesson = false;
    this.hasUnsnapshottedChanges = false;
    this.loadLessonProgress();
    this.updateLessonUi();
    this.run();
    this.editor.focus();
  }

  updateLessonUi() {
    this.elements.lessonSelect.value = this.currentLesson.id;
    this.elements.projectName.textContent = this.currentLesson.title;
    this.elements.fileName.textContent = this.currentLesson.fileName;
    this.elements.lessonKicker.textContent = this.currentLesson.note.kicker;
    this.elements.lessonTitle.textContent = this.currentLesson.note.title;
    this.elements.lessonBody.textContent = this.currentLesson.note.body;
    this.elements.seed.textContent = `Seed ${this.currentSeed}`;
    this.renderCheckpoint();
  }

  loadLessonProgress() {
    const validIds = new Set(this.currentLesson.checkpoints.map(checkpoint => checkpoint.id));
    this.completedCheckpointIds = new Set(
      this.storage.loadProgress(this.currentLesson.id).filter(id => validIds.has(id))
    );
    const firstIncomplete = this.currentLesson.checkpoints.findIndex(
      checkpoint => !this.completedCheckpointIds.has(checkpoint.id)
    );
    this.currentCheckpointIndex = firstIncomplete === -1 ? 0 : firstIncomplete;
  }

  renderCheckpoint() {
    const checkpoints = this.currentLesson.checkpoints;
    if (!checkpoints.length) {
      this.elements.goals.hidden = true;
      this.elements.goalsCount.textContent = "Free";
      this.elements.lessonProgress.setAttribute("aria-valuemax", "0");
      this.elements.lessonProgress.setAttribute("aria-valuenow", "0");
      this.elements.lessonProgressBar.style.width = "0%";
      this.setGoalsOpen(false);
      return;
    }
    this.elements.goals.hidden = false;
    const checkpoint = checkpoints[this.currentCheckpointIndex];
    const completed = this.completedCheckpointIds.has(checkpoint.id);
    const completedCount = this.completedCheckpointIds.size;

    this.elements.checkpointPosition.textContent = `Challenge ${this.currentCheckpointIndex + 1} of ${checkpoints.length}`;
    this.elements.checkpointStatus.textContent = completed ? "Complete" : "In progress";
    this.elements.checkpointStatus.classList.toggle("complete", completed);
    this.elements.checkpointTitle.textContent = checkpoint.title;
    this.elements.checkpointDescription.textContent = checkpoint.description;
    this.elements.checkpointHint.textContent = checkpoint.hint;
    this.elements.checkpointHint.classList.add("hidden");
    this.elements.checkpointHintButton.textContent = "Show hint";
    this.elements.checkpointHintButton.setAttribute("aria-expanded", "false");
    this.elements.checkpointAction.textContent = completed
      ? "Completed"
      : checkpoint.manual ? "Mark complete" : "Check code";
    this.elements.checkpointAction.disabled = completed;
    this.elements.checkpointPrevious.disabled = this.currentCheckpointIndex === 0;
    this.elements.checkpointNext.disabled = this.currentCheckpointIndex === checkpoints.length - 1;
    this.elements.checkpointProgressLabel.textContent = `${completedCount} of ${checkpoints.length} complete`;
    this.elements.goalsCount.textContent = `${completedCount}/${checkpoints.length}`;
    this.elements.lessonProgress.setAttribute("aria-valuemax", String(checkpoints.length));
    this.elements.lessonProgress.setAttribute("aria-valuenow", String(completedCount));
    this.elements.lessonProgressBar.style.width = `${completedCount / checkpoints.length * 100}%`;
  }

  completeCurrentCheckpoint() {
    const checkpoint = this.currentLesson.checkpoints[this.currentCheckpointIndex];
    if (!checkpoint.manual && !checkpoint.validate(this.editor.getValue())) {
      this.elements.checkpointStatus.textContent = "Not yet";
      this.elements.checkpointStatus.classList.remove("complete");
      this.showToast("Challenge not complete yet — open the hint and try again");
      return;
    }

    this.completedCheckpointIds.add(checkpoint.id);
    const saved = this.storage.saveProgress(this.currentLesson.id, this.completedCheckpointIds);
    this.renderCheckpoint();
    this.showToast(saved ? "Challenge complete" : "Complete for this session; progress could not be saved");

    const nextIncomplete = this.currentLesson.checkpoints.findIndex(
      (candidate, index) => index > this.currentCheckpointIndex && !this.completedCheckpointIds.has(candidate.id)
    );
    if (nextIncomplete !== -1) {
      this.currentCheckpointIndex = nextIncomplete;
      this.renderCheckpoint();
    }
  }

  moveCheckpoint(direction) {
    const lastIndex = this.currentLesson.checkpoints.length - 1;
    this.currentCheckpointIndex = Math.max(0, Math.min(lastIndex, this.currentCheckpointIndex + direction));
    this.renderCheckpoint();
  }

  toggleCheckpointHint() {
    const willShow = this.elements.checkpointHint.classList.contains("hidden");
    this.elements.checkpointHint.classList.toggle("hidden", !willShow);
    this.elements.checkpointHintButton.textContent = willShow ? "Hide hint" : "Show hint";
    this.elements.checkpointHintButton.setAttribute("aria-expanded", String(willShow));
  }

  setGoalsOpen(open) {
    this.elements.lesson.classList.toggle("hidden", !open);
    this.elements.goals.setAttribute("aria-expanded", String(open));
  }

  openGallery() {
    this.renderGallery();
    this.elements.galleryDialog.showModal();
  }

  async openLibrary() {
    if (!this.fractalCatalog) {
      const module = await import("../library/index.js");
      this.fractalCatalog = module.fractalCatalog;
      this.imageCatalog = module.imageCatalog;
      this.particleCatalog = module.particleCatalog;
      this.createParticleEntry = module.createParticleEntry;
      this.storage.loadParticlePresets().forEach(preset => {
        this.particleCatalog.add(this.createParticleEntry(preset));
      });
    }
    this.populateLibraryCategories();
    this.renderLibrary();
    this.elements.libraryDialog.showModal();
  }

  populateLibraryCategories() {
    const catalog = this.getActiveLibraryCatalog();
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All categories";
    this.elements.libraryCategory.replaceChildren(all, ...catalog.categories().map(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      return option;
    }));
  }

  renderLibrary() {
    const catalog = this.getActiveLibraryCatalog();
    const category = this.elements.libraryCategory.value;
    const entries = category === "all"
      ? catalog.entries
      : catalog.entries.filter(entry => entry.category === category);
    this.elements.libraryCount.textContent = `${entries.length} item${entries.length === 1 ? "" : "s"}`;
    this.elements.libraryList.replaceChildren(...entries.map(entry => {
      const card = document.createElement("article");
      card.className = "library-item";

      const preview = entry.kind === "image"
        ? document.createElement("img")
        : document.createElement("div");
      preview.className = `library-preview preview-${entry.id}`;
      if (entry.kind === "particle") preview.classList.add("particle-preview");
      if (entry.kind === "image") {
        preview.src = entry.url;
        preview.alt = `${entry.title} texture preview`;
      } else {
        preview.setAttribute("aria-hidden", "true");
      }

      const content = document.createElement("div");
      const meta = document.createElement("span");
      meta.className = "library-meta";
      meta.textContent = `${entry.category} · ${entry.complexity}`;
      const title = document.createElement("h3");
      title.textContent = entry.title;
      const description = document.createElement("p");
      description.textContent = entry.description;
      if (entry.origin) description.title = `${entry.origin}. ${entry.distributionNote}`;
      const create = document.createElement("button");
      create.type = "button";
      create.textContent = entry.kind === "image" ? "Create texture sketch" : "Create new sketch";
      create.addEventListener("click", () => this.createLibrarySketch(entry));
      const actions = document.createElement("div");
      actions.className = "library-actions";
      actions.append(create);
      if (entry.snippet) {
        const insert = document.createElement("button");
        insert.type = "button";
        insert.className = "library-insert";
        insert.textContent = "Add to current code";
        insert.addEventListener("click", () => this.insertLibraryEntry(entry));
        actions.append(insert);
      }
      if (entry.kind === "particle") {
        const customize = document.createElement("button");
        customize.type = "button";
        customize.textContent = "Customize";
        customize.addEventListener("click", () => this.openParticleBuilder(entry));
        actions.append(customize);
      }
      if (entry.category === "My presets") {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "danger";
        remove.textContent = "Delete preset";
        remove.addEventListener("click", () => this.deleteParticlePreset(entry));
        actions.append(remove);
      }
      content.append(meta, title, description, actions);
      card.append(preview, content);
      return card;
    }));
  }

  getActiveLibraryCatalog() {
    const catalogs = {
      fractals: this.fractalCatalog,
      images: this.imageCatalog,
      particles: this.particleCatalog
    };
    return catalogs[this.elements.libraryType.value] ?? this.fractalCatalog;
  }

  insertLibraryEntry(entry) {
    this.createRevision("Before library insert");
    this.editor.appendSnippet(entry.snippet);
    this.save();
    this.run();
    this.elements.libraryDialog.close();
    this.showToast(`${entry.title} added to the current code`);
  }

  openParticleBuilder(entry) {
    this.particleBuilderEntry = entry;
    this.elements.particleBuilderTitle.textContent = `Customize ${entry.title}`;
    this.elements.particlePresetName.value = entry.title;
    this.elements.particleQuality.value = "1";
    this.elements.particleZIndex.value = entry.config.zIndex;
    this.elements.particleMax.value = entry.config.max;
    this.elements.particleRate.value = entry.config.rate;
    this.elements.particleGravity.value = entry.config.gravity;
    this.elements.particleWind.value = entry.config.wind;
    this.elements.particleSizeMin.value = entry.config.size[0];
    this.elements.particleSizeMax.value = entry.config.size[1];
    this.elements.particleOpacity.value = entry.config.opacity;
    this.elements.particleShape.value = entry.config.shape;
    this.elements.particleBlend.value = entry.config.blend;
    this.elements.particleColors.value = entry.config.colors.join(", ");
    this.elements.libraryDialog.close();
    this.updateParticlePreview();
    this.elements.particleBuilderDialog.showModal();
  }

  configuredParticleEntry(customId = null) {
    const name = this.elements.particlePresetName.value.trim() || "Custom particles";
    const quality = Number(this.elements.particleQuality.value);
    const base = this.particleBuilderEntry.config;
    const minimumSize = Number(this.elements.particleSizeMin.value);
    const maximumSize = Number(this.elements.particleSizeMax.value);
    const colors = this.elements.particleColors.value
      .split(",")
      .map(color => color.trim())
      .filter(color => /^#[0-9a-f]{6}$/i.test(color));
    const id = customId ?? `configured-${this.particleBuilderEntry.id}`;
    return this.createParticleEntry({
      id,
      title: name,
      config: {
        ...base,
        max: Math.min(1200, Math.max(10, Math.round(Number(this.elements.particleMax.value) * quality))),
        rate: Math.min(400, Math.max(1, Math.round(Number(this.elements.particleRate.value) * quality))),
        gravity: Number(this.elements.particleGravity.value),
        wind: Number(this.elements.particleWind.value),
        size: [Math.min(minimumSize, maximumSize), Math.max(minimumSize, maximumSize)],
        opacity: Number(this.elements.particleOpacity.value),
        shape: this.elements.particleShape.value,
        blend: this.elements.particleBlend.value,
        colors: colors.length ? colors : base.colors,
        zIndex: Number(this.elements.particleZIndex.value)
      }
    });
  }

  scheduleParticlePreview() {
    window.clearTimeout(this.particlePreviewTimer);
    this.particlePreviewTimer = window.setTimeout(() => this.updateParticlePreview(), 120);
  }

  updateParticlePreview() {
    const entry = this.configuredParticleEntry();
    this.elements.particleGeneratedCode.value = entry.snippet;
    this.elements.particleBudget.textContent = `${entry.config.max} max · ${entry.config.rate}/sec · layer ${entry.config.zIndex}`;
    this.elements.particleBuilderPreview.srcdoc = buildPreviewDocument(
      entry.source,
      `particle-builder-${Date.now()}`,
      this.currentSeed
    );
  }

  insertConfiguredParticle() {
    const entry = this.configuredParticleEntry();
    this.elements.particleBuilderDialog.close();
    this.insertLibraryEntry(entry);
  }

  saveConfiguredParticlePreset() {
    const name = this.elements.particlePresetName.value.trim();
    if (!name) {
      this.showToast("Give this preset a name before saving");
      return;
    }
    const slug = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "particles";
    const id = `custom-${slug}`;
    const entry = this.configuredParticleEntry(id);
    const saved = this.storage.saveParticlePreset({
      id,
      title: entry.title,
      config: entry.config,
      createdAt: new Date().toISOString()
    });
    if (!saved) {
      this.showToast("Preset could not be saved locally");
      return;
    }
    this.particleCatalog.remove(id);
    this.particleCatalog.add(this.createParticleEntry(saved));
    this.showToast(`${entry.title} saved to My presets`);
  }

  deleteParticlePreset(entry) {
    if (!window.confirm(`Delete the saved preset “${entry.title}”?`)) return;
    this.storage.deleteParticlePreset(entry.id);
    this.particleCatalog.remove(entry.id);
    this.populateLibraryCategories();
    this.renderLibrary();
    this.showToast("Particle preset deleted");
  }

  createLibrarySketch(entry) {
    const proposedTitle = window.prompt("Name this sketch:", `${entry.title} study`);
    if (proposedTitle === null) return;
    const title = proposedTitle.trim();
    if (!title || title.length > 60) {
      this.showToast("Sketch names must contain 1 to 60 characters");
      return;
    }

    const baseLesson = this.lessonCatalog.get("standalone-playground");
    const sketch = this.storage.createSketch({
      title,
      baseLessonId: baseLesson.id,
      source: entry.source
    });
    if (!sketch) {
      this.showToast("Template could not be created; the local sketch limit is 30");
      return;
    }
    this.storage.saveSeed(sketch.id, generateSeed());
    const definition = createPersonalSketchDefinition(sketch, baseLesson);
    this.lessonCatalog.add(definition);
    this.addSketchOption(definition);
    this.elements.libraryDialog.close();
    this.switchLesson(definition.id);
    this.showToast(`${entry.title} created as an editable sketch`);
  }

  createPersonalSketch() {
    const proposedTitle = window.prompt(
      "Name this personal sketch:",
      `${this.currentLesson.title} variation`
    );
    if (proposedTitle === null) return;
    const title = proposedTitle.trim();
    if (!title || title.length > 60) {
      this.showToast("Sketch names must contain 1 to 60 characters");
      return;
    }

    const baseLessonId = this.currentLesson.kind === "sketch"
      ? this.currentLesson.baseLessonId
      : this.currentLesson.id;
    const sketch = this.storage.createSketch({
      title,
      baseLessonId,
      source: this.editor.getValue()
    });
    if (!sketch) {
      this.showToast("Sketch could not be created; the local limit is 30");
      return;
    }
    this.storage.saveSeed(sketch.id, this.currentSeed);

    const definition = createPersonalSketchDefinition(
      sketch,
      this.lessonCatalog.get(baseLessonId)
    );
    this.lessonCatalog.add(definition);
    this.addSketchOption(definition);
    this.elements.galleryDialog.close();
    this.switchLesson(definition.id);
    this.showToast("Personal sketch created");
  }

  addSketchOption(sketch) {
    const option = document.createElement("option");
    option.value = sketch.id;
    option.textContent = sketch.title;
    this.elements.sketchOptions.append(option);
  }

  renderGallery() {
    const sketches = this.storage.loadSketches();
    if (!sketches.length) {
      const empty = document.createElement("div");
      empty.className = "gallery-empty";
      empty.textContent = "No personal sketches yet. Duplicate a lesson or another sketch to begin.";
      this.elements.galleryList.replaceChildren(empty);
      return;
    }

    this.elements.galleryList.replaceChildren(...sketches.map(sketch => {
      const item = document.createElement("article");
      item.className = "gallery-item";
      if (sketch.id === this.currentLesson.id) item.classList.add("current");

      const details = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = sketch.title;
      const base = document.createElement("span");
      base.textContent = `Based on ${this.lessonCatalog.get(sketch.baseLessonId).title}`;
      const created = document.createElement("time");
      created.dateTime = sketch.createdAt;
      created.textContent = formatRevisionDate(sketch.createdAt);
      details.append(title, base, created);

      const actions = document.createElement("div");
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = "Open";
      open.disabled = sketch.id === this.currentLesson.id;
      open.addEventListener("click", () => {
        this.elements.galleryDialog.close();
        this.switchLesson(sketch.id);
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "danger";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => this.deletePersonalSketch(sketch));
      actions.append(open, remove);
      item.append(details, actions);
      return item;
    }));
  }

  deletePersonalSketch(sketch) {
    const accepted = window.confirm(
      `Delete ${sketch.title}? Its draft, progress, and revision history will be removed from this device.`
    );
    if (!accepted) return;

    if (sketch.id === this.currentLesson.id) this.switchLesson(sketch.baseLessonId);
    if (!this.storage.deleteSketch(sketch.id)) {
      this.showToast("Sketch could not be deleted");
      return;
    }
    this.lessonCatalog.remove(sketch.id);
    [...this.elements.lessonSelect.options]
      .find(option => option.value === sketch.id)
      ?.remove();
    this.renderGallery();
    this.showToast("Personal sketch deleted");
  }

  exportProjectFile() {
    const contents = createProjectFile({
      lesson: this.currentLesson,
      source: this.editor.getValue(),
      seed: this.currentSeed,
      completedCheckpointIds: this.completedCheckpointIds,
      revisions: this.storage.loadRevisions(this.currentLesson.id)
    });
    const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = projectFileName(this.currentLesson.title, new Date(), this.currentSeed);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    this.showToast("Project file exported");
  }

  async importProjectFile(file) {
    if (!file) return;
    if (file.size > MAX_PROJECT_FILE_SIZE) {
      this.showToast("Project file is larger than the 1 MB limit");
      return;
    }

    let project;
    try {
      project = parseProjectFile(await file.text());
    } catch (error) {
      this.showToast(error.message);
      return;
    }

    const canCreateSketch = (
      project.kind === "sketch" &&
      !this.lessonCatalog.has(project.lessonId) &&
      this.lessonCatalog.has(project.baseLessonId)
    );
    if (!this.lessonCatalog.has(project.lessonId) && !canCreateSketch) {
      this.showToast("This project uses a lesson that is not installed");
      return;
    }

    let targetLesson = this.lessonCatalog.has(project.lessonId)
      ? this.lessonCatalog.get(project.lessonId)
      : null;
    const accepted = window.confirm(
      canCreateSketch
        ? `Import ${project.lessonTitle} as a new personal sketch?`
        : `Import this project into ${targetLesson.title}? The current target draft will be saved in revision history first.`
    );
    if (!accepted) return;

    if (canCreateSketch) {
      const sketch = this.storage.createSketch({
        title: project.lessonTitle || "Imported sketch",
        baseLessonId: project.baseLessonId,
        source: project.source
      });
      if (!sketch) {
        this.showToast("Imported sketch could not be created locally");
        return;
      }
      targetLesson = createPersonalSketchDefinition(
        sketch,
        this.lessonCatalog.get(project.baseLessonId)
      );
      this.lessonCatalog.add(targetLesson);
      this.addSketchOption(targetLesson);
    }

    if (!canCreateSketch) {
      const targetSource = targetLesson.id === this.currentLesson.id
        ? this.editor.getValue()
        : this.storage.load(targetLesson.id, targetLesson.source);
      this.storage.saveRevision(targetLesson.id, targetSource, "Before import");
    }

    if (!this.storage.save(targetLesson.id, project.source)) {
      this.showToast("Project could not be saved locally");
      return;
    }
    if (project.seed) this.storage.saveSeed(targetLesson.id, project.seed);

    const validCheckpointIds = new Set(targetLesson.checkpoints.map(checkpoint => checkpoint.id));
    const importedProgress = project.completedCheckpointIds.filter(id => validCheckpointIds.has(id));
    const progressSaved = this.storage.saveProgress(targetLesson.id, importedProgress);

    [...project.revisions].reverse().forEach(revision => {
      this.storage.saveRevision(
        targetLesson.id,
        revision.source,
        `Imported · ${revision.reason}`,
        new Date(revision.createdAt)
      );
    });
    this.storage.saveRevision(targetLesson.id, project.source, "Imported project");

    if (targetLesson.id !== this.currentLesson.id) {
      this.switchLesson(targetLesson.id);
    } else {
      if (project.seed) this.currentSeed = project.seed;
      this.isSwitchingLesson = true;
      this.editor.setValue(project.source);
      this.isSwitchingLesson = false;
      this.hasUnsnapshottedChanges = false;
      this.loadLessonProgress();
      this.updateLessonUi();
      this.save();
      this.run();
    }

    this.renderRevisionHistory();
    this.showToast(progressSaved ? "Project imported" : "Code imported; progress could not be saved");
  }

  createRevision(reason, notify = false) {
    window.clearTimeout(this.revisionTimer);
    const result = this.storage.saveRevision(
      this.currentLesson.id,
      this.editor.getValue(),
      reason
    );

    if (result) this.hasUnsnapshottedChanges = false;
    if (this.elements.revisionDialog.open) this.renderRevisionHistory();
    if (!notify) return result;

    if (!result) this.showToast("Revision could not be saved locally");
    else if (!result.created) this.showToast("Current version is already in history");
    else this.showToast("Version saved");
    return result;
  }

  openRevisionHistory() {
    this.renderRevisionHistory();
    this.elements.revisionDialog.showModal();
  }

  renderRevisionHistory() {
    const revisions = this.storage.loadRevisions(this.currentLesson.id);
    this.elements.revisionLessonName.textContent = this.currentLesson.title;

    if (!revisions.length) {
      const empty = document.createElement("div");
      empty.className = "revision-empty";
      empty.textContent = "No revisions yet. Pause after editing or save the current version manually.";
      this.elements.revisionList.replaceChildren(empty);
      return;
    }

    this.elements.revisionList.replaceChildren(...revisions.map(revision => {
      const item = document.createElement("article");
      item.className = "revision-item";

      const details = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = revision.reason;
      const time = document.createElement("time");
      time.dateTime = revision.createdAt;
      time.textContent = formatRevisionDate(revision.createdAt);
      const preview = document.createElement("code");
      preview.textContent = revisionSourcePreview(revision.source);
      details.append(heading, time, preview);

      const restore = document.createElement("button");
      restore.className = "revision-restore";
      restore.type = "button";
      restore.textContent = "Restore";
      restore.addEventListener("click", () => this.restoreRevision(revision));

      item.append(details, restore);
      return item;
    }));
  }

  restoreRevision(revision) {
    const accepted = window.confirm(
      "Restore this revision? Your current code will be saved in history first."
    );
    if (!accepted) return;

    if (this.editor.getValue() !== revision.source) {
      this.createRevision("Before restore");
    }
    this.isSwitchingLesson = true;
    this.editor.setValue(revision.source);
    this.isSwitchingLesson = false;
    this.save();
    this.hasUnsnapshottedChanges = false;
    this.run();
    this.renderRevisionHistory();
    this.showToast("Revision restored");
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
      if (message.location) {
        const location = document.createElement("span");
        location.className = "console-location";
        location.textContent = `Ln ${message.location.line}:${message.location.column ?? 1}`;
        row.append(location);
        row.classList.add("navigable");
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.setAttribute("aria-label", `${body.textContent}. Go to line ${message.location.line}`);
        const navigate = () => this.editor.focusDiagnostic(message.location);
        row.addEventListener("click", navigate);
        row.addEventListener("keydown", event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          navigate();
        });
      }
      return row;
    }));
    this.elements.output.scrollTop = this.elements.output.scrollHeight;
  }

  downloadDataUrl(dataUrl) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `canvas-atelier-${this.currentSeed}-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
    this.showToast("PNG export ready");
  }

  showToast(message) {
    window.clearTimeout(this.toastTimer);
    this.elements.toast.textContent = message;
    this.elements.toast.classList.add("visible");
    this.toastTimer = window.setTimeout(() => this.elements.toast.classList.remove("visible"), 1800);
  }

  generateNewSeed() {
    this.currentSeed = generateSeed();
    const saved = this.storage.saveSeed(this.currentLesson.id, this.currentSeed);
    this.elements.seed.textContent = `Seed ${this.currentSeed}`;
    this.run();
    this.showToast(saved ? `New seed: ${this.currentSeed}` : "New seed created for this session");
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

function formatRevisionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function revisionSourcePreview(source) {
  const firstLine = source.split("\n").find(line => line.trim())?.trim();
  if (!firstLine) return "(Empty file)";
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}…` : firstLine;
}
