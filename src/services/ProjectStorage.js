const DEFAULT_KEY = "canvas-atelier:artwork";

/** Repository for project persistence. */
export class ProjectStorage {
  constructor(storage = window.localStorage, key = DEFAULT_KEY) {
    this.storage = storage;
    this.key = key;
  }

  load(fallback) {
    try {
      return this.storage.getItem(this.key) || fallback;
    } catch {
      return fallback;
    }
  }

  save(source) {
    try {
      this.storage.setItem(this.key, source);
      return true;
    } catch {
      return false;
    }
  }
}
