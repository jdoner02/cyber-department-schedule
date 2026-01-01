import type { Course, DayOfWeek } from '../types/schedule';

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

/**
 * Detect all scheduling conflicts in a list of courses
 */
export function detectAllConflicts(courses: Course[]): Conflict[] {
  const conflicts: Conflict[] = [];

  // Get courses with valid meeting times
  const scheduledCourses = courses.filter(
    (c) => c.meetings.length > 0 && c.meetings.some((m) => m.startMinutes > 0)
  );

  // Check each pair of courses
  for (let i = 0; i < scheduledCourses.length; i++) {
    for (let j = i + 1; j < scheduledCourses.length; j++) {
      const course1 = scheduledCourses[i];
      const course2 = scheduledCourses[j];

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

      // Check room conflicts
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

  return conflicts;
}

/**
 * Check if two courses have the same instructor
 */
export function haveSameInstructor(course1: Course, course2: Course): boolean {
  if (!course1.instructor || !course2.instructor) {
    return false;
  }
  return course1.instructor.email === course2.instructor.email;
}

/**
 * Find time overlap between two courses
 */
export function findTimeOverlap(
  course1: Course,
  course2: Course
): { day: DayOfWeek; start: number; end: number } | null {
  for (const m1 of course1.meetings) {
    for (const m2 of course2.meetings) {
      // Find common days
      const commonDays = m1.days.filter((d) => m2.days.includes(d));

      for (const day of commonDays) {
        // Check if times overlap
        // Overlap exists if: start1 < end2 AND start2 < end1
        if (m1.startMinutes < m2.endMinutes && m2.startMinutes < m1.endMinutes) {
          return {
            day,
            start: Math.max(m1.startMinutes, m2.startMinutes),
            end: Math.min(m1.endMinutes, m2.endMinutes),
          };
        }
      }
    }
  }
  return null;
}

/**
 * Find room conflicts between two courses
 */
export function findRoomConflict(
  course1: Course,
  course2: Course
): { day: DayOfWeek; start: number; end: number; location: string } | null {
  for (const m1 of course1.meetings) {
    for (const m2 of course2.meetings) {
      // Check if same room (both have building and room, and they match)
      if (
        m1.building &&
        m1.room &&
        m2.building &&
        m2.room &&
        m1.building === m2.building &&
        m1.room === m2.room
      ) {
        // Find common days
        const commonDays = m1.days.filter((d) => m2.days.includes(d));

        for (const day of commonDays) {
          // Check if times overlap
          if (m1.startMinutes < m2.endMinutes && m2.startMinutes < m1.endMinutes) {
            return {
              day,
              start: Math.max(m1.startMinutes, m2.startMinutes),
              end: Math.min(m1.endMinutes, m2.endMinutes),
              location: `${m1.building} ${m1.room}`,
            };
          }
        }
      }
    }
  }
  return null;
}

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
