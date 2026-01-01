import type { Course } from '../types/schedule';
import {
  detectAllConflicts,
  markCoursesWithConflicts,
  type Conflict,
  type ConflictDetectionOptions,
} from './conflictDetector';
import {
  findStackedPairs,
  isStackedVersion,
  type StackedCourseInfo,
} from './stackedCourseDetector';

export interface ScheduleAnalysis {
  courses: Course[];
  conflicts: Conflict[];
  stackedPairs: Map<string, StackedCourseInfo>;
}

export interface ScheduleAnalysisOptions {
  conflictOptions?: ConflictDetectionOptions;
  hideStackedVersions?: boolean;
}

/**
 * Single entry point for schedule “business intelligence”:
 * - detects stacked course pairs
 * - optionally hides the stacked versions (typically 500/600-level)
 * - detects real conflicts (with configurable filters)
 * - marks courses with `hasConflicts` for UI filtering/indicators
 */
export function analyzeSchedule(
  courses: Course[],
  options: ScheduleAnalysisOptions = {}
): ScheduleAnalysis {
  const { conflictOptions, hideStackedVersions = true } = options;

  const stackedPairs = findStackedPairs(courses);

  const analysisCourses = hideStackedVersions
    ? courses.filter((course) => !isStackedVersion(course, stackedPairs))
    : courses;

  const conflicts = detectAllConflicts(analysisCourses, conflictOptions);
  const coursesWithConflictMarks = markCoursesWithConflicts(analysisCourses, conflicts);

  return {
    courses: coursesWithConflictMarks,
    conflicts,
    stackedPairs,
  };
}

