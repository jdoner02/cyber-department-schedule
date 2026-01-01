import type { Course } from '../types/schedule';
import { hasTimeOverlap, haveSameInstructor, haveSameRoom } from './courseComparison';

/**
 * Information about a stacked course pair (e.g., CSCD 400 + CSCD 500)
 */
export interface StackedCourseInfo {
  baseCourse: Course;          // The lower level course (400-level)
  stackedCourse: Course;       // The higher level course (500-level)
  baseLevel: number;           // e.g., 4 for 400-level
  stackedLevel: number;        // e.g., 5 for 500-level
  enrollmentDiff: number;      // Difference in enrollment (stacked - base)
  capacityDiff: number;        // Difference in max enrollment
  sameInstructor: boolean;     // Whether same instructor teaches both
  sameTime: boolean;           // Whether they meet at the same time
  sameRoom: boolean;           // Whether they're in the same room
}

/**
 * Extracts the numeric course level (first digit of course number)
 * e.g., "330" -> 3, "440" -> 4, "501" -> 5
 */
function getCourseLevel(courseNumber: string): number {
  const num = parseInt(courseNumber.replace(/[^0-9]/g, ''), 10);
  return Math.floor(num / 100);
}

/**
 * Extracts the base course number (last 2 digits)
 * e.g., "330" -> 30, "440" -> 40, "501" -> 01
 */
function getBaseCourseNumber(courseNumber: string): string {
  const num = courseNumber.replace(/[^0-9]/g, '');
  return num.slice(-2).padStart(2, '0');
}

/**
 * Checks if two courses are a stacked pair (400/500 or 500/600 level)
 */
export function isStackedPair(course1: Course, course2: Course): boolean {
  // Must be same subject
  if (course1.subject !== course2.subject) return false;

  const level1 = getCourseLevel(course1.courseNumber);
  const level2 = getCourseLevel(course2.courseNumber);
  const base1 = getBaseCourseNumber(course1.courseNumber);
  const base2 = getBaseCourseNumber(course2.courseNumber);

  // Must have same base number (last 2 digits)
  if (base1 !== base2) return false;

  // Must be consecutive levels (4/5 or 5/6)
  const levelDiff = Math.abs(level1 - level2);
  if (levelDiff !== 1) return false;

  // At least one must be 400+ level
  if (level1 < 4 && level2 < 4) return false;

  return true;
}


/**
 * Finds all stacked course pairs in the given courses
 * Returns a Map where key is the base course CRN and value is StackedCourseInfo
 */
export function findStackedPairs(courses: Course[]): Map<string, StackedCourseInfo> {
  const stackedPairs = new Map<string, StackedCourseInfo>();
  const processed = new Set<string>();

  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const course1 = courses[i];
      const course2 = courses[j];

      if (isStackedPair(course1, course2)) {
        const level1 = getCourseLevel(course1.courseNumber);
        const level2 = getCourseLevel(course2.courseNumber);

        // Determine which is base (lower level) and which is stacked (higher level)
        const [baseCourse, stackedCourse] = level1 < level2
          ? [course1, course2]
          : [course2, course1];

        // Skip if already processed
        if (processed.has(baseCourse.crn)) continue;
        processed.add(baseCourse.crn);

        const info: StackedCourseInfo = {
          baseCourse,
          stackedCourse,
          baseLevel: getCourseLevel(baseCourse.courseNumber),
          stackedLevel: getCourseLevel(stackedCourse.courseNumber),
          enrollmentDiff: stackedCourse.enrollment.current - baseCourse.enrollment.current,
          capacityDiff: stackedCourse.enrollment.maximum - baseCourse.enrollment.maximum,
          sameInstructor: haveSameInstructor(baseCourse, stackedCourse),
          sameTime: hasTimeOverlap(baseCourse, stackedCourse),
          sameRoom: haveSameRoom(baseCourse, stackedCourse),
        };

        stackedPairs.set(baseCourse.crn, info);
      }
    }
  }

  return stackedPairs;
}

/**
 * Gets the stacked course info for a given course (if it's a base course)
 */
export function getStackedInfo(
  course: Course,
  stackedPairs: Map<string, StackedCourseInfo>
): StackedCourseInfo | undefined {
  return stackedPairs.get(course.crn);
}

/**
 * Checks if a course is the higher-level stacked version
 */
export function isStackedVersion(
  course: Course,
  stackedPairs: Map<string, StackedCourseInfo>
): boolean {
  for (const info of stackedPairs.values()) {
    if (info.stackedCourse.crn === course.crn) {
      return true;
    }
  }
  return false;
}
