const DEFAULT_PREFIX = "canvas-atelier";
const LEGACY_SOURCE_KEY = "canvas-atelier:artwork";

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
      if (lessonSource) return lessonSource;

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
}
