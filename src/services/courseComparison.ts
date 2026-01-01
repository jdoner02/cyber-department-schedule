import type { Course, DayOfWeek } from '../types/schedule';

export function haveSameInstructor(course1: Course, course2: Course): boolean {
  if (!course1.instructor || !course2.instructor) {
    return false;
  }
  return course1.instructor.email === course2.instructor.email;
}

export function findTimeOverlap(
  course1: Course,
  course2: Course
): { day: DayOfWeek; start: number; end: number } | null {
  for (const m1 of course1.meetings) {
    for (const m2 of course2.meetings) {
      const commonDays = m1.days.filter((d) => m2.days.includes(d));

      for (const day of commonDays) {
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

export function hasTimeOverlap(course1: Course, course2: Course): boolean {
  return findTimeOverlap(course1, course2) !== null;
}

export function haveSameRoom(course1: Course, course2: Course): boolean {
  for (const m1 of course1.meetings) {
    for (const m2 of course2.meetings) {
      if (!m1.building || !m1.room || !m2.building || !m2.room) continue;
      if (m1.building === m2.building && m1.room === m2.room) return true;
    }
  }
  return false;
}

export function findRoomConflict(
  course1: Course,
  course2: Course
): { day: DayOfWeek; start: number; end: number; location: string } | null {
  for (const m1 of course1.meetings) {
    for (const m2 of course2.meetings) {
      if (!m1.building || !m1.room || !m2.building || !m2.room) continue;
      if (m1.building !== m2.building || m1.room !== m2.room) continue;

      const commonDays = m1.days.filter((d) => m2.days.includes(d));

      for (const day of commonDays) {
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
  return null;
}

