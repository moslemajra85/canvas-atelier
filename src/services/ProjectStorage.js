const DEFAULT_PREFIX = "canvas-atelier";
const LEGACY_SOURCE_KEY = "canvas-atelier:artwork";
const MAX_REVISIONS = 15;
const MAX_SKETCHES = 30;
const MAX_PARTICLE_PRESETS = 20;

/** Repository for project persistence. */
export class ProjectStorage {
  constructor(storage = window.localStorage, prefix = DEFAULT_PREFIX) {
    this.storage = storage;
    this.prefix = prefix;
  }

  sourceKey(lessonId) {
    return `${this.prefix}:lesson:${lessonId}`;
  }

  load(lessonId, fallback) {
    try {
      const lessonSource = this.storage.getItem(this.sourceKey(lessonId));
      if (lessonSource !== null) return lessonSource;

      // Preserve work created before lessons were introduced.
      if (lessonId === "bioluminescent-butterfly") {
        return this.storage.getItem(LEGACY_SOURCE_KEY) || fallback;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  save(lessonId, source) {
    try {
      this.storage.setItem(this.sourceKey(lessonId), source);
      return true;
    } catch {
      return false;
    }
  }

  loadActiveLesson(fallback) {
    try {
      return this.storage.getItem(`${this.prefix}:active-lesson`) || fallback;
    } catch {
      return fallback;
    }
  }

  saveActiveLesson(lessonId) {
    try {
      this.storage.setItem(`${this.prefix}:active-lesson`, lessonId);
    } catch {
      // The studio remains usable when persistence is blocked.
    }
  }

  progressKey(lessonId) {
    return `${this.prefix}:progress:${lessonId}`;
  }

  loadProgress(lessonId) {
    try {
      const value = JSON.parse(this.storage.getItem(this.progressKey(lessonId)) ?? "[]");
      return Array.isArray(value) ? value.filter(id => typeof id === "string") : [];
    } catch {
      return [];
    }
  }

  saveProgress(lessonId, completedCheckpointIds) {
    try {
      this.storage.setItem(
        this.progressKey(lessonId),
        JSON.stringify([...new Set(completedCheckpointIds)])
      );
      return true;
    } catch {
      return false;
    }
  }

  revisionsKey(lessonId) {
    return `${this.prefix}:revisions:${lessonId}`;
  }

  loadRevisions(lessonId) {
    try {
      const value = JSON.parse(this.storage.getItem(this.revisionsKey(lessonId)) ?? "[]");
      if (!Array.isArray(value)) return [];
      return value.filter(revision => (
        revision &&
        typeof revision.id === "string" &&
        typeof revision.source === "string" &&
        typeof revision.createdAt === "string" &&
        typeof revision.reason === "string"
      ));
    } catch {
      return [];
    }
  }

  saveRevision(lessonId, source, reason = "Autosave", date = new Date()) {
    try {
      const revisions = this.loadRevisions(lessonId);
      if (revisions[0]?.source === source) return { created: false, revision: revisions[0] };

      const revision = {
        id: `${date.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        source,
        reason,
        createdAt: date.toISOString()
      };
      this.storage.setItem(
        this.revisionsKey(lessonId),
        JSON.stringify([revision, ...revisions].slice(0, MAX_REVISIONS))
      );
      return { created: true, revision };
    } catch {
      return null;
    }
  }

  sketchesKey() {
    return `${this.prefix}:sketches`;
  }

  loadSketches() {
    try {
      const value = JSON.parse(this.storage.getItem(this.sketchesKey()) ?? "[]");
      if (!Array.isArray(value)) return [];
      return value.filter(sketch => (
        sketch &&
        typeof sketch.id === "string" &&
        typeof sketch.title === "string" &&
        typeof sketch.baseLessonId === "string" &&
        typeof sketch.starterSource === "string" &&
        typeof sketch.createdAt === "string"
      )).slice(0, MAX_SKETCHES);
    } catch {
      return [];
    }
  }

  createSketch({ title, baseLessonId, source }, date = new Date()) {
    try {
      const sketches = this.loadSketches();
      if (sketches.length >= MAX_SKETCHES) return null;
      const sketch = {
        id: `sketch-${date.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        baseLessonId,
        starterSource: source,
        createdAt: date.toISOString()
      };
      this.storage.setItem(this.sourceKey(sketch.id), source);
      this.storage.setItem(this.sketchesKey(), JSON.stringify([sketch, ...sketches]));
      return sketch;
    } catch {
      return null;
    }
  }

  deleteSketch(sketchId) {
    try {
      const sketches = this.loadSketches().filter(sketch => sketch.id !== sketchId);
      this.storage.setItem(this.sketchesKey(), JSON.stringify(sketches));
      this.storage.removeItem(this.sourceKey(sketchId));
      this.storage.removeItem(this.progressKey(sketchId));
      this.storage.removeItem(this.revisionsKey(sketchId));
      this.storage.removeItem(this.seedKey(sketchId));
      return true;
    } catch {
      return false;
    }
  }

  seedKey(workspaceId) {
    return `${this.prefix}:seed:${workspaceId}`;
  }

  loadSeed(workspaceId, fallback) {
    try {
      return this.storage.getItem(this.seedKey(workspaceId)) || fallback;
    } catch {
      return fallback;
    }
  }

  saveSeed(workspaceId, seed) {
    try {
      this.storage.setItem(this.seedKey(workspaceId), seed);
      return true;
    } catch {
      return false;
    }
  }

  particlePresetsKey() {
    return `${this.prefix}:particle-presets`;
  }

  loadParticlePresets() {
    try {
      const value = JSON.parse(this.storage.getItem(this.particlePresetsKey()) ?? "[]");
      if (!Array.isArray(value)) return [];
      return value.map(normalizeParticlePreset).filter(Boolean).slice(0, MAX_PARTICLE_PRESETS);
    } catch {
      return [];
    }
  }

  saveParticlePreset(preset) {
    try {
      const normalized = normalizeParticlePreset(preset);
      if (!normalized) return null;
      const presets = this.loadParticlePresets().filter(item => item.id !== normalized.id);
      this.storage.setItem(
        this.particlePresetsKey(),
        JSON.stringify([normalized, ...presets].slice(0, MAX_PARTICLE_PRESETS))
      );
      return normalized;
    } catch {
      return null;
    }
  }

  deleteParticlePreset(presetId) {
    try {
      const presets = this.loadParticlePresets().filter(item => item.id !== presetId);
      this.storage.setItem(this.particlePresetsKey(), JSON.stringify(presets));
      return true;
    } catch {
      return false;
    }
  }
}

function normalizeParticlePreset(value) {
  if (!value || !/^custom-[a-z0-9-]{1,70}$/.test(value.id)) return null;
  if (typeof value.title !== "string" || !value.title.trim()) return null;
  if (!value.config || typeof value.config !== "object" || Array.isArray(value.config)) return null;
  const colors = Array.isArray(value.config.colors)
    ? value.config.colors.filter(color => /^#[0-9a-f]{6}$/i.test(color)).slice(0, 8)
    : [];
  if (!colors.length) return null;
  return {
    id: value.id,
    title: value.title.trim().slice(0, 60),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    config: {
      ...value.config,
      colors
    }
  };
}
