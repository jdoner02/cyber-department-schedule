/**
 * =============================================================================
 * SERVICE: scheduleOptimizer
 * =============================================================================
 *
 * PURPOSE: Generate conflict-free schedule permutations ranked by similarity
 * to the current schedule. Uses constraint satisfaction with backtracking.
 *
 * ALGORITHM:
 * 1. Extract available time slots, rooms, and instructors from schedule data
 * 2. For each course with conflicts, try alternative time/room assignments
 * 3. Check constraints (no double-booking)
 * 4. Score each permutation by similarity to original
 * 5. Return top N solutions sorted by similarity
 *
 * PERFORMANCE:
 * - Uses early termination when enough good solutions found
 * - Runs in Web Worker for background processing
 * - Target: < 30 seconds for 20 courses
 *
 * =============================================================================
 */

import type { Course, DayOfWeek } from '../types/schedule';
import { hasTimeOverlap, haveSameInstructor, haveSameRoom } from './courseComparison';

/**
 * A possible time slot for a course
 */
export interface TimeSlot {
  days: DayOfWeek[];
  startMinutes: number;
  endMinutes: number;
}

/**
 * A possible assignment for a course
 */
export interface CourseAssignment {
  crn: string;
  timeSlot: TimeSlot;
  room: string;
  instructor: string;
  campus: string;
}

/**
 * A change from the original schedule
 */
export interface ScheduleChange {
  crn: string;
  courseCode: string;
  changeType: 'time' | 'room' | 'instructor' | 'campus';
  from: string;
  to: string;
}

/**
 * A complete schedule permutation
 */
export interface SchedulePermutation {
  assignments: CourseAssignment[];
  conflictCount: number;
  changeCount: number;
  changes: ScheduleChange[];
  similarityScore: number; // 0-1, higher = more similar to original
}

/**
 * Options for the optimizer
 */
export interface OptimizerOptions {
  maxPermutations: number;      // Max solutions to generate
  maxTimeMs: number;            // Max computation time
  allowTimeChange: boolean;     // Can change course times
  allowRoomChange: boolean;     // Can change rooms
  allowInstructorChange: boolean; // Can change instructors
  allowCampusChange: boolean;   // Can change campus
  lockedCRNs?: Set<string>;     // CRNs that cannot be changed (locked in place)
  onProgress?: (progress: number) => void; // Progress callback (0-100)
}

const DEFAULT_OPTIONS: OptimizerOptions = {
  maxPermutations: 50,
  maxTimeMs: 30000,
  allowTimeChange: true,
  allowRoomChange: true,
  allowInstructorChange: true,
  allowCampusChange: true,
};

/**
 * Extract available time slots from schedule
 */
export function extractTimeSlots(courses: Course[]): TimeSlot[] {
  const slots = new Map<string, TimeSlot>();

  for (const course of courses) {
    for (const meeting of course.meetings) {
      const key = `${meeting.days.join(',')}-${meeting.startMinutes}-${meeting.endMinutes}`;
      if (!slots.has(key)) {
        slots.set(key, {
          days: meeting.days,
          startMinutes: meeting.startMinutes,
          endMinutes: meeting.endMinutes,
        });
      }
    }
  }

  return Array.from(slots.values());
}

/**
 * Extract available rooms from schedule
 */
export function extractRooms(courses: Course[]): string[] {
  const rooms = new Set<string>();

  for (const course of courses) {
    for (const meeting of course.meetings) {
      if (meeting.location && meeting.location !== 'TBA') {
        rooms.add(meeting.location);
      }
    }
  }

  return Array.from(rooms);
}

/**
 * Extract instructors from schedule
 */
export function extractInstructors(courses: Course[]): string[] {
  const instructors = new Set<string>();

  for (const course of courses) {
    if (course.instructor) {
      instructors.add(course.instructor.displayName);
    }
  }

  return Array.from(instructors);
}

/**
 * Check if two assignments conflict (same instructor or room at same time)
 */
export function assignmentsConflict(a: CourseAssignment, b: CourseAssignment): boolean {
  // Check if time slots overlap
  const timeOverlap = a.timeSlot.days.some(day => b.timeSlot.days.includes(day)) &&
    a.timeSlot.startMinutes < b.timeSlot.endMinutes &&
    a.timeSlot.endMinutes > b.timeSlot.startMinutes;

  if (!timeOverlap) return false;

  // Same instructor at same time
  if (a.instructor === b.instructor) return true;

  // Same room at same time
  if (a.room === b.room && a.room !== 'TBA') return true;

  return false;
}

/**
 * Count conflicts in a set of assignments
 */
export function countConflicts(assignments: CourseAssignment[]): number {
  let conflicts = 0;

  for (let i = 0; i < assignments.length; i++) {
    for (let j = i + 1; j < assignments.length; j++) {
      if (assignmentsConflict(assignments[i], assignments[j])) {
        conflicts++;
      }
    }
  }

  return conflicts;
}

/**
 * Create initial assignment from a course
 */
export function courseToAssignment(course: Course): CourseAssignment | null {
  if (course.meetings.length === 0) return null;

  const meeting = course.meetings[0];
  return {
    crn: course.crn,
    timeSlot: {
      days: meeting.days,
      startMinutes: meeting.startMinutes,
      endMinutes: meeting.endMinutes,
    },
    room: meeting.location,
    instructor: course.instructor?.displayName || 'TBA',
    campus: course.campus,
  };
}

/**
 * Calculate changes between original and new assignment
 */
export function calculateChanges(
  original: CourseAssignment,
  modified: CourseAssignment,
  courseCode: string
): ScheduleChange[] {
  const changes: ScheduleChange[] = [];

  // Time change
  if (
    original.timeSlot.startMinutes !== modified.timeSlot.startMinutes ||
    original.timeSlot.endMinutes !== modified.timeSlot.endMinutes ||
    JSON.stringify(original.timeSlot.days) !== JSON.stringify(modified.timeSlot.days)
  ) {
    changes.push({
      crn: original.crn,
      courseCode,
      changeType: 'time',
      from: formatTimeSlot(original.timeSlot),
      to: formatTimeSlot(modified.timeSlot),
    });
  }

  // Room change
  if (original.room !== modified.room) {
    changes.push({
      crn: original.crn,
      courseCode,
      changeType: 'room',
      from: original.room,
      to: modified.room,
    });
  }

  // Instructor change
  if (original.instructor !== modified.instructor) {
    changes.push({
      crn: original.crn,
      courseCode,
      changeType: 'instructor',
      from: original.instructor,
      to: modified.instructor,
    });
  }

  // Campus change
  if (original.campus !== modified.campus) {
    changes.push({
      crn: original.crn,
      courseCode,
      changeType: 'campus',
      from: original.campus,
      to: modified.campus,
    });
  }

  return changes;
}

/**
 * Format time slot for display
 */
function formatTimeSlot(slot: TimeSlot): string {
  const days = slot.days.map(d => d.slice(0, 3)).join('/');
  const startHour = Math.floor(slot.startMinutes / 60);
  const startMin = slot.startMinutes % 60;
  const endHour = Math.floor(slot.endMinutes / 60);
  const endMin = slot.endMinutes % 60;
  return `${days} ${startHour}:${startMin.toString().padStart(2, '0')}-${endHour}:${endMin.toString().padStart(2, '0')}`;
}

/**
 * Calculate similarity score (0-1) based on number of changes
 */
export function calculateSimilarity(
  originalAssignments: CourseAssignment[],
  newAssignments: CourseAssignment[]
): number {
  if (originalAssignments.length === 0) return 1;

  let totalChanges = 0;
  const maxChanges = originalAssignments.length * 4; // 4 possible change types per course

  const originalMap = new Map(originalAssignments.map(a => [a.crn, a]));

  for (const newAssignment of newAssignments) {
    const original = originalMap.get(newAssignment.crn);
    if (!original) continue;

    if (
      original.timeSlot.startMinutes !== newAssignment.timeSlot.startMinutes ||
      original.timeSlot.endMinutes !== newAssignment.timeSlot.endMinutes ||
      JSON.stringify(original.timeSlot.days) !== JSON.stringify(newAssignment.timeSlot.days)
    ) {
      totalChanges++;
    }
    if (original.room !== newAssignment.room) totalChanges++;
    if (original.instructor !== newAssignment.instructor) totalChanges++;
    if (original.campus !== newAssignment.campus) totalChanges++;
  }

  return 1 - (totalChanges / maxChanges);
}

/**
 * Main optimizer function - generates conflict-free permutations
 */
export function optimizeSchedule(
  courses: Course[],
  options: Partial<OptimizerOptions> = {}
): SchedulePermutation[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  const permutations: SchedulePermutation[] = [];

  // Extract original assignments
  const originalAssignments: CourseAssignment[] = [];
  const courseMap = new Map<string, Course>();

  for (const course of courses) {
    const assignment = courseToAssignment(course);
    if (assignment) {
      originalAssignments.push(assignment);
      courseMap.set(course.crn, course);
    }
  }

  // If no conflicts in original, return it as the only solution
  const originalConflicts = countConflicts(originalAssignments);
  if (originalConflicts === 0) {
    return [{
      assignments: originalAssignments,
      conflictCount: 0,
      changeCount: 0,
      changes: [],
      similarityScore: 1,
    }];
  }

  // Extract available options
  const availableTimeSlots = opts.allowTimeChange ? extractTimeSlots(courses) : [];
  const availableRooms = opts.allowRoomChange ? extractRooms(courses) : [];
  // Note: Instructor changes are tracked but not currently generated as alternatives
  // const availableInstructors = opts.allowInstructorChange ? extractInstructors(courses) : [];

  // Find conflicting courses
  const conflictingCRNs = new Set<string>();
  for (let i = 0; i < originalAssignments.length; i++) {
    for (let j = i + 1; j < originalAssignments.length; j++) {
      if (assignmentsConflict(originalAssignments[i], originalAssignments[j])) {
        conflictingCRNs.add(originalAssignments[i].crn);
        conflictingCRNs.add(originalAssignments[j].crn);
      }
    }
  }

  // Locked courses are always stable - they cannot be changed even if conflicting
  const lockedCRNs = opts.lockedCRNs || new Set<string>();

  // Generate permutations by trying different assignments for conflicting courses
  // But ONLY if they're not locked
  const conflictingAssignments = originalAssignments.filter(
    a => conflictingCRNs.has(a.crn) && !lockedCRNs.has(a.crn)
  );
  // Stable = not conflicting OR locked (locked courses stay in place)
  const stableAssignments = originalAssignments.filter(
    a => !conflictingCRNs.has(a.crn) || lockedCRNs.has(a.crn)
  );

  // Try each time slot for each conflicting course
  function* generateCandidates(): Generator<CourseAssignment[]> {
    if (conflictingAssignments.length === 0) {
      yield [...stableAssignments];
      return;
    }

    // Simple greedy: try moving each conflicting course to a different time
    for (const assignment of conflictingAssignments) {
      for (const timeSlot of availableTimeSlots) {
        const newAssignment: CourseAssignment = {
          ...assignment,
          timeSlot,
        };

        // Check if this resolves the conflict
        const candidate = [
          ...stableAssignments,
          newAssignment,
          ...conflictingAssignments.filter(a => a.crn !== assignment.crn),
        ];

        yield candidate;
      }

      // Also try different rooms
      for (const room of availableRooms) {
        if (room === assignment.room) continue;

        const newAssignment: CourseAssignment = {
          ...assignment,
          room,
        };

        const candidate = [
          ...stableAssignments,
          newAssignment,
          ...conflictingAssignments.filter(a => a.crn !== assignment.crn),
        ];

        yield candidate;
      }
    }
  }

  // Evaluate candidates
  let evaluated = 0;
  for (const candidate of generateCandidates()) {
    // Check time limit
    if (Date.now() - startTime > opts.maxTimeMs) break;
    if (permutations.length >= opts.maxPermutations) break;

    const conflicts = countConflicts(candidate);
    const similarity = calculateSimilarity(originalAssignments, candidate);

    // Calculate all changes
    const allChanges: ScheduleChange[] = [];
    for (const newAssignment of candidate) {
      const original = originalAssignments.find(a => a.crn === newAssignment.crn);
      if (original) {
        const course = courseMap.get(newAssignment.crn);
        const courseCode = course?.displayCode || newAssignment.crn;
        const changes = calculateChanges(original, newAssignment, courseCode);
        allChanges.push(...changes);
      }
    }

    // Only keep conflict-free or improved solutions
    if (conflicts < originalConflicts) {
      permutations.push({
        assignments: candidate,
        conflictCount: conflicts,
        changeCount: allChanges.length,
        changes: allChanges,
        similarityScore: similarity,
      });
    }

    evaluated++;

    // Report progress
    if (opts.onProgress && evaluated % 100 === 0) {
      const progress = Math.min(100, Math.round((evaluated / 1000) * 100));
      opts.onProgress(progress);
    }
  }

  // Sort by: conflict-free first, then by similarity (most similar first)
  permutations.sort((a, b) => {
    if (a.conflictCount !== b.conflictCount) {
      return a.conflictCount - b.conflictCount;
    }
    return b.similarityScore - a.similarityScore;
  });

  return permutations.slice(0, opts.maxPermutations);
}

/**
 * Quick check if any conflicts exist
 */
export function hasConflicts(courses: Course[]): boolean {
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      if (hasTimeOverlap(courses[i], courses[j])) {
        if (haveSameInstructor(courses[i], courses[j]) || haveSameRoom(courses[i], courses[j])) {
          return true;
        }
      }
    }
  }
  return false;
}
