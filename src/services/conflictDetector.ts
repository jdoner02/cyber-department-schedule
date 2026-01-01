import type { Course, DayOfWeek } from '../types/schedule';
import { isStackedPair } from './stackedCourseDetector';
import {
  haveSameInstructor,
  findTimeOverlap,
  findRoomConflict,
} from './courseComparison';

export interface Conflict {
  id: string;
  type: 'instructor' | 'room';
  severity: 'warning' | 'error';
  course1: Course;
  course2: Course;
  day: DayOfWeek;
  overlapStart: number;
  overlapEnd: number;
  description: string;
}

export interface ConflictDetectionOptions {
  hideStackedCourses?: boolean;    // Filter out 400/500 level stacked courses
  hideLabCorequisites?: boolean;   // Filter out lab+lecture with same instructor
}

/**
 * Check if two courses are the same course (different sections)
 * e.g., CSCD 350.01 and CSCD 350.02 should not conflict
 */
function isSameCourse(course1: Course, course2: Course): boolean {
  return course1.subject === course2.subject &&
         course1.courseNumber === course2.courseNumber;
}

/**
 * Check if a course has "Arranged" scheduling (no fixed meeting times)
 * These courses should never appear in conflict detection
 */
function isArrangedCourse(course: Course): boolean {
  // Check delivery method
  if (course.delivery === 'Arranged') return true;
  // Check if all meetings lack real time slots
  return course.meetings.every(m => m.startMinutes === 0 || m.days.length === 0);
}

/**
 * Check if two courses appear to be lab corequisites
 * (lecture + lab taught by same instructor at overlapping/adjacent times)
 */
export function isLabCorequisite(course1: Course, course2: Course): boolean {
  // Must be same subject
  if (course1.subject !== course2.subject) return false;

  // Check meeting types for lab indicators
  const getTypes = (c: Course) => c.meetings.map(m => m.type.toUpperCase());
  const types1 = getTypes(course1);
  const types2 = getTypes(course2);

  // Check if one has LAB/LPD and other doesn't
  const hasLab1 = types1.some(t => t.includes('LAB') || t === 'LPD');
  const hasLab2 = types2.some(t => t.includes('LAB') || t === 'LPD');

  // If both are labs or neither are labs, not a corequisite pair
  if (hasLab1 === hasLab2) return false;

  // Check if course numbers are related (same or within 1)
  const num1 = parseInt(course1.courseNumber.replace(/[^0-9]/g, ''), 10);
  const num2 = parseInt(course2.courseNumber.replace(/[^0-9]/g, ''), 10);

  // Labs often have course number like X01L or same number as lecture
  const sameBase = Math.abs(num1 - num2) <= 1 ||
                   course1.courseNumber.replace(/L$/i, '') === course2.courseNumber.replace(/L$/i, '');

  return sameBase;
}

/**
 * Detect all scheduling conflicts in a list of courses
 * @param options - Options to filter out false positives
 */
export function detectAllConflicts(
  courses: Course[],
  options: ConflictDetectionOptions = { hideStackedCourses: true, hideLabCorequisites: true }
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Get courses with valid meeting times (exclude arranged courses)
  const scheduledCourses = courses.filter(
    (c) => c.meetings.length > 0 &&
           c.meetings.some((m) => m.startMinutes > 0) &&
           !isArrangedCourse(c)
  );

  // Check each pair of courses
  for (let i = 0; i < scheduledCourses.length; i++) {
    for (let j = i + 1; j < scheduledCourses.length; j++) {
      const course1 = scheduledCourses[i];
      const course2 = scheduledCourses[j];

      // Skip different sections of the same course (e.g., CSCD 350.01 vs 350.02)
      if (isSameCourse(course1, course2)) {
        continue;
      }

      // Skip stacked courses (400/500 level pairs) if option enabled
      if (options.hideStackedCourses && isStackedPair(course1, course2)) {
        continue;
      }

      // Skip lab corequisites if option enabled
      if (options.hideLabCorequisites && isLabCorequisite(course1, course2)) {
        continue;
      }

      // Check instructor conflicts
      if (haveSameInstructor(course1, course2)) {
        const overlap = findTimeOverlap(course1, course2);
        if (overlap) {
          conflicts.push({
            id: `instructor-${course1.id}-${course2.id}-${overlap.day}`,
            type: 'instructor',
            severity: 'error',
            course1,
            course2,
            day: overlap.day,
            overlapStart: overlap.start,
            overlapEnd: overlap.end,
            description: `${course1.instructor?.displayName} is scheduled for both ${course1.displayCode} and ${course2.displayCode} at the same time`,
          });
        }
      }

      // Check room conflicts (stacked courses sharing a room is also intentional)
      if (!(options.hideStackedCourses && isStackedPair(course1, course2))) {
        const roomConflict = findRoomConflict(course1, course2);
        if (roomConflict) {
          conflicts.push({
            id: `room-${course1.id}-${course2.id}-${roomConflict.day}`,
            type: 'room',
            severity: 'error',
            course1,
            course2,
            day: roomConflict.day,
            overlapStart: roomConflict.start,
            overlapEnd: roomConflict.end,
            description: `Room ${roomConflict.location} is double-booked for ${course1.displayCode} and ${course2.displayCode}`,
          });
        }
      }
    }
  }

  return conflicts;
}

export { haveSameInstructor, findTimeOverlap, findRoomConflict };

/**
 * Get conflicts for a specific course
 */
export function getConflictsForCourse(course: Course, allConflicts: Conflict[]): Conflict[] {
  return allConflicts.filter(
    (c) => c.course1.id === course.id || c.course2.id === course.id
  );
}

/**
 * Get instructor conflicts only
 */
export function getInstructorConflicts(conflicts: Conflict[]): Conflict[] {
  return conflicts.filter((c) => c.type === 'instructor');
}

/**
 * Get room conflicts only
 */
export function getRoomConflicts(conflicts: Conflict[]): Conflict[] {
  return conflicts.filter((c) => c.type === 'room');
}

/**
 * Mark courses that have conflicts
 */
export function markCoursesWithConflicts(courses: Course[], conflicts: Conflict[]): Course[] {
  const conflictingCourseIds = new Set<string>();

  conflicts.forEach((conflict) => {
    conflictingCourseIds.add(conflict.course1.id);
    conflictingCourseIds.add(conflict.course2.id);
  });

  return courses.map((course) => ({
    ...course,
    hasConflicts: conflictingCourseIds.has(course.id),
  }));
}
