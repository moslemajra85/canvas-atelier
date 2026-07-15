import { butterflyLesson } from "./butterfly.js";
import { flyingBirdLesson } from "./flyingBird.js";
import { kineticFractalLesson } from "./kineticFractal.js";
import { playgroundLesson } from "./playground.js";

export class LessonCatalog {
  constructor(lessons) {
    this.lessons = lessons;
    this.byId = new Map(lessons.map(lesson => [lesson.id, lesson]));
  }

  get defaultLesson() {
    return this.lessons[0];
  }

  get(lessonId) {
    return this.byId.get(lessonId) ?? this.defaultLesson;
  }

  has(lessonId) {
    return this.byId.has(lessonId);
  }

  add(lesson) {
    if (this.byId.has(lesson.id)) return false;
    this.lessons.push(lesson);
    this.byId.set(lesson.id, lesson);
    return true;
  }

  remove(lessonId) {
    if (!this.byId.has(lessonId)) return false;
    this.byId.delete(lessonId);
    this.lessons = this.lessons.filter(lesson => lesson.id !== lessonId);
    return true;
  }
}

export const lessonCatalog = new LessonCatalog([
  butterflyLesson,
  kineticFractalLesson,
  flyingBirdLesson,
  playgroundLesson
]);

export function createPersonalSketchDefinition(sketch, baseLesson) {
  const fileName = `${sketch.title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "personal-sketch"}.js`;

  return {
    id: sketch.id,
    kind: "sketch",
    baseLessonId: baseLesson.id,
    title: sketch.title,
    fileName,
    description: `A personal sketch based on ${baseLesson.title}.`,
    note: {
      kicker: "Personal sketch",
      title: "Experiment without changing the lesson draft",
      body: `This workspace began from ${baseLesson.title} and keeps its own source, progress, and revision history.`
    },
    checkpoints: baseLesson.checkpoints,
    source: sketch.starterSource,
    createdAt: sketch.createdAt
  };
}
