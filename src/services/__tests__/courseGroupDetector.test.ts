/**
 * Unit tests for courseGroupDetector
 */

import { describe, it, expect } from 'vitest';
import {
  isCorequisitePair,
  isStackedPair,
  buildCourseGroups,
  getCorequisite,
} from '../courseGroupDetector';
import type { Course } from '../../types/schedule';

// Helper to create mock courses
function createMockCourse(overrides: Partial<Course> & { crn: string; subject: string; courseNumber: string }): Course {
  return {
    id: overrides.crn,
    crn: overrides.crn,
    term: '202510',
    termDescription: 'Winter 2025',
    subject: overrides.subject as Course['subject'],
    subjectRaw: overrides.subject,
    courseNumber: overrides.courseNumber,
    title: overrides.title || 'Test Course',
    displayCode: `${overrides.subject} ${overrides.courseNumber}`,
    section: '01',
    campus: 'Cheney',
    campusRaw: 'Cheney',
    scheduleType: 'Lecture',
    enrollment: {
      current: 10,
      maximum: 30,
      available: 20,
      waitlist: 0,
      waitlistMax: 0,
      utilizationPercent: 33,
    },
    instructor: overrides.instructor || {
      id: 'test-instructor',
      displayName: 'Test Instructor',
      firstName: 'Test',
      lastName: 'Instructor',
      email: 'test@ewu.edu',
      isPrimary: true,
    },
    meetings: overrides.meetings || [
      {
        days: ['monday', 'wednesday', 'friday'],
        startTime: '10:00',
        endTime: '10:50',
        startMinutes: 600,
        endMinutes: 650,
        durationMinutes: 50,
        building: 'CEB',
        room: '101',
        location: 'CEB 101',
        type: 'LEC',
        typeDescription: 'Lecture',
      },
    ],
    delivery: 'F2F',
    deliveryDescription: 'Face to Face',
    credits: 4,
    attributes: [],
    isOpen: true,
  };
}

describe('isCorequisitePair', () => {
  it('returns true for course + lab pair with same instructor and time', () => {
    const course = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
    });
    const lab = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '477L',
    });

    expect(isCorequisitePair(course, lab)).toBe(true);
    expect(isCorequisitePair(lab, course)).toBe(true);
  });

  it('returns false for different subjects', () => {
    const course = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
    });
    const lab = createMockCourse({
      crn: '10002',
      subject: 'CYBR',
      courseNumber: '477L',
    });

    expect(isCorequisitePair(course, lab)).toBe(false);
  });

  it('returns false for different base numbers', () => {
    const course = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
    });
    const lab = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '480L',
    });

    expect(isCorequisitePair(course, lab)).toBe(false);
  });

  it('returns false when both have L or neither has L', () => {
    const course1 = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
    });
    const course2 = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '480',
    });

    expect(isCorequisitePair(course1, course2)).toBe(false);
  });

  it('returns false for different instructors', () => {
    const course = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
      instructor: {
        id: 'instructor-1',
        displayName: 'Dr. Smith',
        firstName: 'John',
        lastName: 'Smith',
        email: 'jsmith@ewu.edu',
        isPrimary: true,
      },
    });
    const lab = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '477L',
      instructor: {
        id: 'instructor-2',
        displayName: 'Dr. Jones',
        firstName: 'Jane',
        lastName: 'Jones',
        email: 'jjones@ewu.edu',
        isPrimary: true,
      },
    });

    expect(isCorequisitePair(course, lab)).toBe(false);
  });

  it('returns false for non-overlapping times', () => {
    const course = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
      meetings: [
        {
          days: ['monday', 'wednesday', 'friday'],
          startTime: '08:00',
          endTime: '08:50',
          startMinutes: 480,
          endMinutes: 530,
          durationMinutes: 50,
          building: 'CEB',
          room: '101',
          location: 'CEB 101',
          type: 'LEC',
          typeDescription: 'Lecture',
        },
      ],
    });
    const lab = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '477L',
      meetings: [
        {
          days: ['tuesday'],
          startTime: '14:00',
          endTime: '16:50',
          startMinutes: 840,
          endMinutes: 1010,
          durationMinutes: 170,
          building: 'CEB',
          room: '102',
          location: 'CEB 102',
          type: 'LAB',
          typeDescription: 'Lab',
        },
      ],
    });

    expect(isCorequisitePair(course, lab)).toBe(false);
  });
});

describe('getCorequisite', () => {
  it('returns primary and lab correctly ordered', () => {
    const course = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
    });
    const lab = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '477L',
    });

    const result = getCorequisite(course, lab);
    expect(result).not.toBeNull();
    expect(result!.primary.courseNumber).toBe('477');
    expect(result!.lab.courseNumber).toBe('477L');

    // Order shouldn't matter
    const result2 = getCorequisite(lab, course);
    expect(result2).not.toBeNull();
    expect(result2!.primary.courseNumber).toBe('477');
    expect(result2!.lab.courseNumber).toBe('477L');
  });
});

describe('isStackedPair', () => {
  it('returns true for 400/500 level pair with same instructor and time', () => {
    const lower = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
    });
    const upper = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '577',
    });

    expect(isStackedPair(lower, upper)).toBe(true);
    expect(isStackedPair(upper, lower)).toBe(true);
  });

  it('returns true for 500/600 level pair', () => {
    const lower = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '520',
    });
    const upper = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '620',
    });

    expect(isStackedPair(lower, upper)).toBe(true);
  });

  it('returns false for 300/400 level pair', () => {
    const lower = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '303',
    });
    const upper = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '403',
    });

    expect(isStackedPair(lower, upper)).toBe(false);
  });

  it('returns false for different base numbers', () => {
    const course1 = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
    });
    const course2 = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '580',
    });

    expect(isStackedPair(course1, course2)).toBe(false);
  });

  it('works with L-suffix lab courses', () => {
    const lower = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477L',
    });
    const upper = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '577L',
    });

    expect(isStackedPair(lower, upper)).toBe(true);
  });
});

describe('buildCourseGroups', () => {
  it('creates standalone group for single course', () => {
    const course = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '210',
    });

    const groups = buildCourseGroups([course]);

    expect(groups).toHaveLength(1);
    expect(groups[0].isStandalone).toBe(true);
    expect(groups[0].hasCorequisite).toBe(false);
    expect(groups[0].hasStackedPair).toBe(false);
    expect(groups[0].allCourses).toHaveLength(1);
  });

  it('groups course with its lab corequisite', () => {
    const course = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
    });
    const lab = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '477L',
    });

    const groups = buildCourseGroups([course, lab]);

    expect(groups).toHaveLength(1);
    expect(groups[0].hasCorequisite).toBe(true);
    expect(groups[0].hasStackedPair).toBe(false);
    expect(groups[0].allCourses).toHaveLength(2);
    expect(groups[0].allCRNs).toContain('10001');
    expect(groups[0].allCRNs).toContain('10002');
    expect(groups[0].displayCode).toContain('477');
    expect(groups[0].displayCode).toContain('477L');
  });

  it('groups stacked courses without corequisites', () => {
    const lower = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
    });
    const upper = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '577',
    });

    const groups = buildCourseGroups([lower, upper]);

    expect(groups).toHaveLength(1);
    expect(groups[0].hasCorequisite).toBe(false);
    expect(groups[0].hasStackedPair).toBe(true);
    expect(groups[0].allCourses).toHaveLength(2);
    expect(groups[0].displayCode).toBe('477/577');
  });

  it('groups full 4-course stack: 477 + 477L + 577 + 577L', () => {
    const course477 = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
      title: 'Applied Cryptography',
    });
    const course477L = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '477L',
      title: 'Applied Cryptography Lab',
    });
    const course577 = createMockCourse({
      crn: '10003',
      subject: 'CSCD',
      courseNumber: '577',
      title: 'Applied Cryptography',
    });
    const course577L = createMockCourse({
      crn: '10004',
      subject: 'CSCD',
      courseNumber: '577L',
      title: 'Applied Cryptography Lab',
    });

    const groups = buildCourseGroups([course477, course477L, course577, course577L]);

    expect(groups).toHaveLength(1);
    expect(groups[0].hasCorequisite).toBe(true);
    expect(groups[0].hasStackedPair).toBe(true);
    expect(groups[0].allCourses).toHaveLength(4);
    expect(groups[0].allCRNs).toEqual(expect.arrayContaining(['10001', '10002', '10003', '10004']));
    expect(groups[0].displayCode).toBe('477/477L/577/577L');
    expect(groups[0].displayTitle).toContain('CSCD 477/477L/577/577L');
  });

  it('keeps unrelated courses as separate groups', () => {
    const course1 = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '210',
      instructor: {
        id: 'instructor-1',
        displayName: 'Dr. Smith',
        firstName: 'John',
        lastName: 'Smith',
        email: 'jsmith@ewu.edu',
        isPrimary: true,
      },
    });
    const course2 = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '320',
      instructor: {
        id: 'instructor-2',
        displayName: 'Dr. Jones',
        firstName: 'Jane',
        lastName: 'Jones',
        email: 'jjones@ewu.edu',
        isPrimary: true,
      },
    });

    const groups = buildCourseGroups([course1, course2]);

    expect(groups).toHaveLength(2);
    expect(groups.every(g => g.isStandalone)).toBe(true);
  });

  it('calculates total enrollment correctly', () => {
    const course = createMockCourse({
      crn: '10001',
      subject: 'CSCD',
      courseNumber: '477',
    });
    course.enrollment.current = 15;
    course.enrollment.maximum = 25;

    const lab = createMockCourse({
      crn: '10002',
      subject: 'CSCD',
      courseNumber: '477L',
    });
    lab.enrollment.current = 15;
    lab.enrollment.maximum = 25;

    const groups = buildCourseGroups([course, lab]);

    expect(groups[0].totalEnrollment).toBe(30);
    expect(groups[0].totalCapacity).toBe(50);
  });
});
