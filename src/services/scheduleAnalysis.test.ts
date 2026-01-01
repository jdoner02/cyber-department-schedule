import { describe, it, expect } from 'vitest';
import { analyzeSchedule } from './scheduleAnalysis';
import { parseScheduleData } from './scheduleParser';
import {
  mockBannerCourse,
  mockConflictingCourse,
  mockScheduleResponse,
} from '../test/mocks/scheduleData';

describe('scheduleAnalysis', () => {
  it('marks courses with conflicts', () => {
    const courses = parseScheduleData(mockScheduleResponse);
    const analysis = analyzeSchedule(courses, { hideStackedVersions: true });

    expect(analysis.conflicts.length).toBeGreaterThan(0);
    expect(analysis.courses.some((c) => c.hasConflicts)).toBe(true);
  });

  it('filters out stacked versions by default', () => {
    const stackedBase = {
      ...mockBannerCourse,
      id: 500440,
      courseReferenceNumber: '44001',
      courseNumber: '440',
      courseTitle: 'SYSTEMS SECURITY (UG)',
      subjectCourse: 'CSCD440',
    };

    const stackedVersion = {
      ...mockBannerCourse,
      id: 500540,
      courseReferenceNumber: '54001',
      courseNumber: '540',
      courseTitle: 'SYSTEMS SECURITY (GR)',
      subjectCourse: 'CSCD540',
    };

    const response = {
      ...mockScheduleResponse,
      totalCount: 4,
      data: [stackedBase, stackedVersion, mockConflictingCourse, mockBannerCourse],
    };

    const courses = parseScheduleData(response);
    const analysis = analyzeSchedule(courses);

    // Stacked version should be removed from display courses
    expect(analysis.courses.some((c) => c.crn === '54001')).toBe(false);
    expect(analysis.courses.some((c) => c.crn === '44001')).toBe(true);

    // Stacked pair metadata should still be available
    expect(analysis.stackedPairs.size).toBeGreaterThan(0);
    expect(analysis.stackedPairs.has('44001')).toBe(true);
  });
});

