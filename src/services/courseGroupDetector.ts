/**
 * =============================================================================
 * SERVICE: courseGroupDetector
 * =============================================================================
 *
 * PURPOSE: Detect and group courses that should be displayed together:
 * 1. Corequisites: Course + Lab pairs (e.g., CSCD 477 + CSCD 477L)
 * 2. Stacked pairs: 400/500 or 500/600 level courses taught together
 * 3. Combined groups: Corequisites that are also stacked (477+477L+577+577L)
 *
 * DETECTION RULES:
 * - Corequisites: Same subject, same base number, one ends with 'L'
 * - Stacked: Same subject, same base digits (last 2), consecutive levels (4/5 or 5/6)
 * - Both require: Same instructor AND overlapping meeting times
 *
 * =============================================================================
 */

import type { Course, CourseGroup } from '../types/schedule';
import { hasTimeOverlap, haveSameInstructor } from './courseComparison';

/**
 * Check if two courses are corequisites (course + lab pair)
 * Detection: Same subject, same base number, one has 'L' suffix
 */
export function isCorequisitePair(courseA: Course, courseB: Course): boolean {
  // Must be same subject
  if (courseA.subject !== courseB.subject) return false;

  // Extract base course number (remove trailing L if present)
  const aBase = courseA.courseNumber.replace(/L$/, '');
  const bBase = courseB.courseNumber.replace(/L$/, '');

  // Check if base numbers match
  if (aBase !== bBase) return false;

  // One must have L, one must not
  const aHasL = courseA.courseNumber.endsWith('L');
  const bHasL = courseB.courseNumber.endsWith('L');

  if (aHasL === bHasL) return false; // Both have L or neither has L

  // Must have same instructor and overlapping times to be taught together
  if (!haveSameInstructor(courseA, courseB)) return false;
  if (!hasTimeOverlap(courseA, courseB)) return false;

  return true;
}

/**
 * Get the corequisite from a pair (returns the one with 'L' suffix)
 */
export function getCorequisite(courseA: Course, courseB: Course): { primary: Course; lab: Course } | null {
  if (!isCorequisitePair(courseA, courseB)) return null;

  if (courseA.courseNumber.endsWith('L')) {
    return { primary: courseB, lab: courseA };
  } else {
    return { primary: courseA, lab: courseB };
  }
}

/**
 * Extract course level (hundreds digit)
 * e.g., "477" -> 4, "477L" -> 4, "577" -> 5
 */
function getCourseLevel(courseNumber: string): number {
  const numericPart = courseNumber.replace(/[^0-9]/g, '');
  return Math.floor(parseInt(numericPart, 10) / 100);
}

/**
 * Extract base number (last 2 digits, without L suffix)
 * e.g., "477" -> "77", "477L" -> "77", "577" -> "77"
 */
function getBaseNumber(courseNumber: string): string {
  const numericPart = courseNumber.replace(/[^0-9]/g, '');
  return numericPart.slice(-2).padStart(2, '0');
}

/**
 * Check if two courses are a stacked pair (400/500 or 500/600)
 * They must be taught by same instructor at same time
 */
export function isStackedPair(courseA: Course, courseB: Course): boolean {
  // Must be same subject
  if (courseA.subject !== courseB.subject) return false;

  // Get levels and base numbers (ignoring L suffix for base)
  const aBase = getBaseNumber(courseA.courseNumber);
  const bBase = getBaseNumber(courseB.courseNumber);
  const aLevel = getCourseLevel(courseA.courseNumber);
  const bLevel = getCourseLevel(courseB.courseNumber);

  // Must have same base number
  if (aBase !== bBase) return false;

  // Must be consecutive levels (4/5 or 5/6)
  const levelDiff = Math.abs(aLevel - bLevel);
  if (levelDiff !== 1) return false;

  // Both must be 400+ level
  if (aLevel < 4 || bLevel < 4) return false;

  // Must have same instructor and overlapping times
  if (!haveSameInstructor(courseA, courseB)) return false;
  if (!hasTimeOverlap(courseA, courseB)) return false;

  return true;
}

/**
 * Build course groups from a list of courses
 * Groups corequisites and stacked courses together
 */
export function buildCourseGroups(courses: Course[]): CourseGroup[] {
  const groups: CourseGroup[] = [];
  const processed = new Set<string>(); // Track CRNs we've already grouped

  // Step 1: Find all corequisite pairs first
  const coreqPairs = new Map<string, { primary: Course; lab: Course }>();

  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const pair = getCorequisite(courses[i], courses[j]);
      if (pair) {
        coreqPairs.set(pair.primary.crn, pair);
      }
    }
  }

  // Step 2: Build groups, checking for stacking
  for (const course of courses) {
    if (processed.has(course.crn)) continue;

    // Check if this course is part of a corequisite pair
    const coreqPair = coreqPairs.get(course.crn);

    // If this is a lab, it should be grouped with its primary - skip it here
    if (course.courseNumber.endsWith('L')) {
      // Check if there's a primary for this lab
      const potentialPrimary = courses.find(c =>
        c.subject === course.subject &&
        c.courseNumber === course.courseNumber.replace(/L$/, '') &&
        haveSameInstructor(c, course) &&
        hasTimeOverlap(c, course)
      );
      if (potentialPrimary) continue; // Will be processed with primary
    }

    // Find stacked pair for this course (or its coreq pair)
    let stackedPrimary: Course | undefined;
    let stackedLab: Course | undefined;

    // Look for stacked versions of the primary course
    for (const other of courses) {
      if (processed.has(other.crn)) continue;
      if (other.crn === course.crn) continue;
      if (coreqPair?.lab.crn === other.crn) continue;

      if (isStackedPair(course, other)) {
        // Found a stacked pair - determine which is higher level
        const courseLevel = getCourseLevel(course.courseNumber);
        const otherLevel = getCourseLevel(other.courseNumber);

        if (otherLevel > courseLevel) {
          // 'other' is the higher level (500/600)
          stackedPrimary = other;

          // Check if stacked primary has a corequisite
          const stackedCoreqPair = coreqPairs.get(other.crn);
          if (stackedCoreqPair) {
            stackedLab = stackedCoreqPair.lab;
          }
        }
        break;
      }
    }

    // Also check if corequisite lab has a stacked pair
    if (coreqPair && !stackedLab) {
      for (const other of courses) {
        if (processed.has(other.crn)) continue;
        if (other.crn === course.crn) continue;
        if (other.crn === coreqPair.lab.crn) continue;

        if (isStackedPair(coreqPair.lab, other) && other.courseNumber.endsWith('L')) {
          const labLevel = getCourseLevel(coreqPair.lab.courseNumber);
          const otherLevel = getCourseLevel(other.courseNumber);
          if (otherLevel > labLevel) {
            stackedLab = other;
            // If we found the stacked lab, find its primary too
            if (!stackedPrimary) {
              const stackedPrimaryNum = other.courseNumber.replace(/L$/, '');
              stackedPrimary = courses.find(c =>
                c.subject === other.subject &&
                c.courseNumber === stackedPrimaryNum &&
                !processed.has(c.crn)
              );
            }
            break;
          }
        }
      }
    }

    // Build the group
    const allCourses: Course[] = [course];
    const allCRNs: string[] = [course.crn];

    if (coreqPair) {
      allCourses.push(coreqPair.lab);
      allCRNs.push(coreqPair.lab.crn);
      processed.add(coreqPair.lab.crn);
    }

    if (stackedPrimary) {
      allCourses.push(stackedPrimary);
      allCRNs.push(stackedPrimary.crn);
      processed.add(stackedPrimary.crn);
    }

    if (stackedLab) {
      allCourses.push(stackedLab);
      allCRNs.push(stackedLab.crn);
      processed.add(stackedLab.crn);
    }

    processed.add(course.crn);

    // Calculate combined enrollment
    const totalEnrollment = allCourses.reduce((sum, c) => sum + c.enrollment.current, 0);
    const totalCapacity = allCourses.reduce((sum, c) => sum + c.enrollment.maximum, 0);

    // Generate display strings
    const displayTitle = generateDisplayTitle(course, coreqPair?.lab, stackedPrimary, stackedLab);
    const displayCode = generateDisplayCode(course, coreqPair?.lab, stackedPrimary, stackedLab);

    groups.push({
      id: course.crn,
      primaryCourse: course,
      corequisite: coreqPair?.lab,
      stackedPair: stackedPrimary ? {
        primaryCourse: stackedPrimary,
        corequisite: stackedLab,
      } : undefined,
      displayTitle,
      displayCode,
      allCRNs,
      allCourses,
      totalEnrollment,
      totalCapacity,
      isStandalone: allCourses.length === 1,
      hasCorequisite: !!coreqPair,
      hasStackedPair: !!stackedPrimary,
    });
  }

  return groups;
}

/**
 * Generate display title for a course group
 * e.g., "CSCD 477/477L/577/577L - Applied Cryptography"
 */
function generateDisplayTitle(
  primary: Course,
  coreq?: Course,
  stackedPrimary?: Course,
  stackedLab?: Course
): string {
  const parts: string[] = [primary.courseNumber];

  if (coreq) {
    parts.push(coreq.courseNumber);
  }
  if (stackedPrimary) {
    parts.push(stackedPrimary.courseNumber);
  }
  if (stackedLab) {
    parts.push(stackedLab.courseNumber);
  }

  return `${primary.subject} ${parts.join('/')} - ${primary.title}`;
}

/**
 * Generate short display code for a course group
 * e.g., "477/577" or "477/477L/577/577L"
 */
function generateDisplayCode(
  primary: Course,
  coreq?: Course,
  stackedPrimary?: Course,
  stackedLab?: Course
): string {
  const parts: string[] = [primary.courseNumber];

  if (coreq) {
    parts.push(coreq.courseNumber);
  }
  if (stackedPrimary) {
    parts.push(stackedPrimary.courseNumber);
  }
  if (stackedLab) {
    parts.push(stackedLab.courseNumber);
  }

  return parts.join('/');
}

/**
 * Check if a course is part of any group (as a secondary member)
 * Used to avoid double-rendering
 */
export function isSecondaryInGroup(course: Course, groups: CourseGroup[]): boolean {
  for (const group of groups) {
    if (group.primaryCourse.crn === course.crn) continue; // Primary is not secondary

    if (group.allCRNs.includes(course.crn)) {
      return true;
    }
  }
  return false;
}

/**
 * Get the group that contains a specific course
 */
export function getGroupForCourse(course: Course, groups: CourseGroup[]): CourseGroup | undefined {
  return groups.find(g => g.allCRNs.includes(course.crn));
}
