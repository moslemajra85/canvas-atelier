import { butterflyLesson } from "./butterfly.js";
import { flyingBirdLesson } from "./flyingBird.js";
import { kineticFractalLesson } from "./kineticFractal.js";

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
}

export const lessonCatalog = new LessonCatalog([
  butterflyLesson,
  kineticFractalLesson,
  flyingBirdLesson
]);
