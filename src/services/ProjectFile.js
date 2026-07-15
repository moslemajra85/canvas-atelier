import { normalizeSeed } from "./Seed.js";

const PROJECT_SCHEMA = "canvas-atelier-project";
const PROJECT_VERSION = 1;
const MAX_IMPORTED_REVISIONS = 15;

export function createProjectFile({ lesson, source, seed, completedCheckpointIds, revisions }, date = new Date()) {
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
    revisions: normalizeRevisions(revisions).slice(0, MAX_IMPORTED_REVISIONS)
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
  if (value.version !== PROJECT_VERSION) {
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
    revisions: normalizeRevisions(value.revisions).slice(0, MAX_IMPORTED_REVISIONS)
  };
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
