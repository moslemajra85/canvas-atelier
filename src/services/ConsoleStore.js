const KNOWN_LEVELS = new Set(["error", "warn", "info"]);

export class ConsoleStore {
  #messages = [];

  get messages() {
    return [...this.#messages];
  }

  add(level, values, date = new Date(), location = null) {
    this.#messages.push({
      level: KNOWN_LEVELS.has(level) ? level : "log",
      values,
      time: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      location
    });
  }

  clear() {
    this.#messages = [];
  }
}
