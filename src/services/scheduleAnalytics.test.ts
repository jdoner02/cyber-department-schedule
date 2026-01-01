import { describe, it, expect } from 'vitest';
import { parseScheduleData } from './scheduleParser';
import { computeScheduleAnalytics } from './scheduleAnalytics';
import { mockScheduleResponse, mockBannerCourse } from '../test/mocks/scheduleData';

describe('scheduleAnalytics', () => {
  it('computes summary totals and distributions', () => {
    const courses = parseScheduleData(mockScheduleResponse);

    const analytics = computeScheduleAnalytics({
      courses,
      instructors: [],
      subjects: ['CSCD', 'CYBR', 'MATH', 'OTHER'],
    });

    expect(analytics.summary.totalCourses).toBe(5);
    expect(analytics.summary.totalEnrollment).toBe(175);
    expect(analytics.summary.totalCapacity).toBe(200);
    expect(analytics.summary.utilizationRate).toBe(88);
    expect(analytics.enrollmentStatus).toBe('available');

    const cscd = analytics.subjects.find((s) => s.subject === 'CSCD');
    const cybr = analytics.subjects.find((s) => s.subject === 'CYBR');
    expect(cscd?.courseCount).toBe(4);
    expect(cscd?.enrollment).toBe(140);
    expect(cybr?.courseCount).toBe(1);

    expect(analytics.delivery.find((d) => d.method === 'F2F')?.courseCount).toBe(4);
    expect(analytics.delivery.find((d) => d.method === 'Online')?.courseCount).toBe(1);

    // Time distribution counts meeting blocks (not per-day occurrences)
    expect(analytics.timeDistribution.find((b) => b.name === '7-9 AM')?.courses).toBe(2);
  });

  it('marks enrollment as allZero when every section is 0', () => {
    const zeroEnrollmentCourse = {
      ...mockBannerCourse,
      enrollment: 0,
      seatsAvailable: mockBannerCourse.maximumEnrollment,
    };

    const response = {
      ...mockScheduleResponse,
      totalCount: 2,
      data: [
        { ...zeroEnrollmentCourse, id: 1, courseReferenceNumber: '10001' },
        { ...zeroEnrollmentCourse, id: 2, courseReferenceNumber: '10002' },
      ],
    };

    const courses = parseScheduleData(response);
    const analytics = computeScheduleAnalytics({
      courses,
      instructors: [],
      subjects: ['CSCD', 'CYBR', 'MATH', 'OTHER'],
    });

    expect(analytics.enrollmentStatus).toBe('allZero');
    expect(analytics.summary.totalEnrollment).toBe(0);
    expect(analytics.summary.totalCapacity).toBeGreaterThan(0);
    expect(analytics.summary.coursesWithReportedEnrollment).toBe(0);
  });
});

