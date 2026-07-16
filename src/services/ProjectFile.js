import { normalizeSeed } from "./Seed.js";

const PROJECT_SCHEMA = "canvas-atelier-project";
const PROJECT_VERSION = 2;
const MAX_IMPORTED_REVISIONS = 15;

export function createProjectFile({ lesson, source, seed, completedCheckpointIds, revisions, particlePresets = [], assets = [] }, date = new Date()) {
  return JSON.stringify({
    schema: PROJECT_SCHEMA,
    version: PROJECT_VERSION,
    exportedAt: date.toISOString(),
    lesson: {
      id: lesson.id,
      title: lesson.title,
      kind: lesson.kind === "sketch" ? "sketch" : "lesson",
      baseLessonId: lesson.baseLessonId ?? lesson.id
    },
    source,
    seed: normalizeSeed(seed) ?? "atelier",
    completedCheckpointIds: normalizeStringArray([...completedCheckpointIds]),
    revisions: normalizeRevisions(revisions).slice(0, MAX_IMPORTED_REVISIONS),
    particlePresets: normalizeParticlePresets(particlePresets),
    assets: normalizeAssets(assets)
  }, null, 2);
}

export function parseProjectFile(contents) {
  let value;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error("This file does not contain valid JSON.");
  }

  if (!value || value.schema !== PROJECT_SCHEMA) {
    throw new Error("This is not a Canvas Atelier project file.");
  }
  if (![1, PROJECT_VERSION].includes(value.version)) {
    throw new Error(`Project version ${String(value.version)} is not supported.`);
  }
  if (typeof value.lesson?.id !== "string" || typeof value.source !== "string") {
    throw new Error("The project is missing its lesson or JavaScript source.");
  }

  const lessonTitle = typeof value.lesson.title === "string"
    ? value.lesson.title.trim().slice(0, 60)
    : "";

  return {
    lessonId: value.lesson.id,
    lessonTitle: lessonTitle || "Imported sketch",
    kind: value.lesson.kind === "sketch" ? "sketch" : "lesson",
    baseLessonId: typeof value.lesson.baseLessonId === "string"
      ? value.lesson.baseLessonId
      : value.lesson.id,
    source: value.source,
    seed: normalizeSeed(value.seed),
    completedCheckpointIds: normalizeStringArray(value.completedCheckpointIds),
    revisions: normalizeRevisions(value.revisions).slice(0, MAX_IMPORTED_REVISIONS),
    particlePresets: value.version >= 2 ? normalizeParticlePresets(value.particlePresets) : [],
    assets: value.version >= 2 ? normalizeAssets(value.assets) : []
  };
}

function normalizeParticlePresets(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(preset => (
    preset && /^custom-[a-z0-9-]{1,70}$/.test(preset.id) &&
    typeof preset.title === "string" && preset.title.trim() &&
    preset.config && typeof preset.config === "object" && !Array.isArray(preset.config) &&
    Array.isArray(preset.config.colors) && preset.config.colors.some(color => /^#[0-9a-f]{6}$/i.test(color))
  )).slice(0, 20).map(preset => ({
    id: preset.id,
    title: preset.title.trim().slice(0, 60),
    createdAt: typeof preset.createdAt === "string" ? preset.createdAt : new Date(0).toISOString(),
    config: { ...preset.config, colors: preset.config.colors.filter(color => /^#[0-9a-f]{6}$/i.test(color)).slice(0, 8) }
  }));
}

function normalizeAssets(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(asset => (
    asset && /^user-[a-z0-9-]{1,80}$/.test(asset.id) &&
    typeof asset.name === "string" &&
    ["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(asset.mimeType) &&
    typeof asset.dataUrl === "string" && asset.dataUrl.startsWith(`data:${asset.mimeType};base64,`)
  )).slice(0, 30).map(asset => ({
    id: asset.id,
    name: asset.name.trim().slice(0, 80),
    mimeType: asset.mimeType,
    license: typeof asset.license === "string" ? asset.license.trim().slice(0, 120) : "User supplied",
    dataUrl: asset.dataUrl
  }));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(item => typeof item === "string"))];
}

function normalizeRevisions(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(revision => (
    revision &&
    typeof revision.source === "string" &&
    typeof revision.reason === "string" &&
    typeof revision.createdAt === "string" &&
    !Number.isNaN(new Date(revision.createdAt).getTime())
  )).map(revision => ({
    source: revision.source,
    reason: revision.reason,
    createdAt: revision.createdAt
  }));
}

export function projectFileName(lessonTitle, date = new Date(), seed = null) {
  const slug = lessonTitle
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "artwork";
  const seedSuffix = normalizeSeed(seed) ? `-${normalizeSeed(seed)}` : "";
  return `${slug}${seedSuffix}-${date.toISOString().slice(0, 10)}.atelier.json`;
}
