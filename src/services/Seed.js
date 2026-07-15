export function createSeededRandom(seed) {
  const value = String(seed);
  let state = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    state ^= value.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return function random() {
    state += 0x6D2B79F5;
    let result = state;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

export function generateSeed(randomSource = globalThis.crypto) {
  if (randomSource?.getRandomValues) {
    const values = new Uint32Array(1);
    randomSource.getRandomValues(values);
    return values[0].toString(16).padStart(8, "0");
  }
  return Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, "0");
}

export function normalizeSeed(seed) {
  if (typeof seed !== "string") return null;
  const normalized = seed.trim().slice(0, 64);
  return normalized || null;
}
