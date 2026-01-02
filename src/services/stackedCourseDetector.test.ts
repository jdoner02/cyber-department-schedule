import { describe, it, expect } from 'vitest';
import { findStackedPairs, isStackedPair, isStackedVersion } from './stackedCourseDetector';
import type { Course } from '../types/schedule';

// Helper to create a minimal course for testing
function makeCourse(overrides: Partial<Course>): Course {
  const defaults: Course = {
    id: `course-${Math.random()}`,
    crn: '12345',
    term: '202510',
    termDescription: 'Fall 2025',
    subject: 'CSCD',
    subjectRaw: 'CSCD',
    courseNumber: '300',
    displayCode: 'CSCD 300',
    section: '01',
    title: 'Test Course',
    credits: 4,
    campusRaw: 'Main Campus',
    campus: 'Cheney',
    scheduleType: 'Lecture',
    delivery: 'F2F',
    deliveryDescription: 'Face-to-Face',
    instructor: {
      id: 'inst-1',
      displayName: 'Dr. Test',
      lastName: 'Test',
      firstName: 'Dr',
      email: 'test@ewu.edu',
      isPrimary: true,
    },
    meetings: [
      {
        days: ['monday', 'wednesday'],
        startMinutes: 480, // 8:00 AM
        endMinutes: 530,   // 8:50 AM
        startTime: '8:00 AM',
        endTime: '8:50 AM',
        building: 'CEB',
        room: '101',
        location: 'CEB 101',
        durationMinutes: 50,
        type: 'Lecture',
        typeDescription: 'Lecture',
      },
    ],
    enrollment: {
      current: 20,
      maximum: 30,
      available: 10,
      waitlist: 0,
      waitlistMax: 0,
      utilizationPercent: 67,
    },
    attributes: [],
    isOpen: true,
    hasConflicts: false,
  };
  return { ...defaults, ...overrides };
}

// Helper to create a meeting
function makeMeeting(overrides: Partial<Course['meetings'][0]> = {}): Course['meetings'][0] {
  return {
    days: ['monday'],
    startMinutes: 480,
    endMinutes: 530,
    startTime: '8:00 AM',
    endTime: '8:50 AM',
    building: 'CEB',
    room: '101',
    location: 'CEB 101',
    durationMinutes: 50,
    type: 'Lecture',
    typeDescription: 'Lecture',
    ...overrides,
  };
}

// Helper to create an instructor
function makeInstructor(overrides: Partial<Course['instructor']> = {}): NonNullable<Course['instructor']> {
  return {
    id: 'inst-1',
    displayName: 'Dr. Smith',
    lastName: 'Smith',
    firstName: 'Dr',
    email: 'smith@ewu.edu',
    isPrimary: true,
    ...overrides,
  };
}

describe('stackedCourseDetector', () => {
  describe('isStackedPair', () => {
    it('should identify 400/500 level pair with same base number', () => {
      const cscd427 = makeCourse({ subject: 'CSCD', courseNumber: '427', displayCode: 'CSCD 427' });
      const cscd527 = makeCourse({ subject: 'CSCD', courseNumber: '527', displayCode: 'CSCD 527' });

      expect(isStackedPair(cscd427, cscd527)).toBe(true);
      expect(isStackedPair(cscd527, cscd427)).toBe(true); // Order shouldn't matter
    });

    it('should identify 500/600 level pair', () => {
      const cscd500 = makeCourse({ subject: 'CSCD', courseNumber: '500', displayCode: 'CSCD 500' });
      const cscd600 = makeCourse({ subject: 'CSCD', courseNumber: '600', displayCode: 'CSCD 600' });

      expect(isStackedPair(cscd500, cscd600)).toBe(true);
    });

    it('should NOT identify 300/400 level pair as stacked', () => {
      const cybr303 = makeCourse({ subject: 'CYBR', courseNumber: '303', displayCode: 'CYBR 303' });
      const cybr403 = makeCourse({ subject: 'CYBR', courseNumber: '403', displayCode: 'CYBR 403' });

      expect(isStackedPair(cybr303, cybr403)).toBe(false);
    });

    it('should NOT pair courses with different subjects', () => {
      const cscd427 = makeCourse({ subject: 'CSCD', courseNumber: '427', displayCode: 'CSCD 427' });
      const cybr527 = makeCourse({ subject: 'CYBR', courseNumber: '527', displayCode: 'CYBR 527' });

      expect(isStackedPair(cscd427, cybr527)).toBe(false);
    });

    it('should NOT pair courses with different base numbers', () => {
      const cscd427 = makeCourse({ subject: 'CSCD', courseNumber: '427', displayCode: 'CSCD 427' });
      const cscd530 = makeCourse({ subject: 'CSCD', courseNumber: '530', displayCode: 'CSCD 530' });

      expect(isStackedPair(cscd427, cscd530)).toBe(false);
    });
  });

  describe('findStackedPairs', () => {
    it('should find stacked pair when same instructor and overlapping times', () => {
      const instructor = makeInstructor();
      const meeting = makeMeeting();

      const cscd427 = makeCourse({
        crn: '11111',
        subject: 'CSCD',
        courseNumber: '427',
        displayCode: 'CSCD 427',
        instructor,
        meetings: [meeting],
      });
      const cscd527 = makeCourse({
        crn: '22222',
        subject: 'CSCD',
        courseNumber: '527',
        displayCode: 'CSCD 527',
        instructor,
        meetings: [meeting],
      });

      const pairs = findStackedPairs([cscd427, cscd527]);

      expect(pairs.size).toBe(1);
      expect(pairs.get('11111')).toBeDefined();
      expect(pairs.get('11111')?.baseCourse.crn).toBe('11111');
      expect(pairs.get('11111')?.stackedCourse.crn).toBe('22222');
    });

    it('should NOT pair courses with different instructors', () => {
      const cscd427 = makeCourse({
        crn: '11111',
        subject: 'CSCD',
        courseNumber: '427',
        displayCode: 'CSCD 427',
        instructor: makeInstructor({ id: 'inst-1', email: 'smith@ewu.edu' }),
      });
      const cscd527 = makeCourse({
        crn: '22222',
        subject: 'CSCD',
        courseNumber: '527',
        displayCode: 'CSCD 527',
        instructor: makeInstructor({ id: 'inst-2', displayName: 'Dr. Jones', lastName: 'Jones', email: 'jones@ewu.edu' }),
      });

      const pairs = findStackedPairs([cscd427, cscd527]);
      expect(pairs.size).toBe(0);
    });

    it('should NOT pair courses at different times', () => {
      const instructor = makeInstructor();

      const cscd427 = makeCourse({
        crn: '11111',
        subject: 'CSCD',
        courseNumber: '427',
        displayCode: 'CSCD 427',
        instructor,
        meetings: [makeMeeting({ startMinutes: 480, endMinutes: 530, startTime: '8:00 AM', endTime: '8:50 AM' })],
      });
      const cscd527 = makeCourse({
        crn: '22222',
        subject: 'CSCD',
        courseNumber: '527',
        displayCode: 'CSCD 527',
        instructor,
        meetings: [makeMeeting({ startMinutes: 600, endMinutes: 650, startTime: '10:00 AM', endTime: '10:50 AM' })],
      });

      const pairs = findStackedPairs([cscd427, cscd527]);
      expect(pairs.size).toBe(0);
    });
  });

  describe('isStackedVersion', () => {
    it('should identify the 500-level course as the stacked version', () => {
      const instructor = makeInstructor();
      const meeting = makeMeeting();

      const cscd427 = makeCourse({
        crn: '11111',
        subject: 'CSCD',
        courseNumber: '427',
        displayCode: 'CSCD 427',
        instructor,
        meetings: [meeting],
      });
      const cscd527 = makeCourse({
        crn: '22222',
        subject: 'CSCD',
        courseNumber: '527',
        displayCode: 'CSCD 527',
        instructor,
        meetings: [meeting],
      });

      const pairs = findStackedPairs([cscd427, cscd527]);

      // cscd427 is the base (not stacked version)
      expect(isStackedVersion(cscd427, pairs)).toBe(false);
      // cscd527 IS the stacked version
      expect(isStackedVersion(cscd527, pairs)).toBe(true);
    });
  });

  describe('all courses accounted for', () => {
    it('should ensure every course is either displayed or appears as a stacked badge', () => {
      const instructor = makeInstructor();
      const meeting = makeMeeting();

      // Create a mix of courses: some stacked, some standalone
      const courses: Course[] = [
        // Stacked pair
        makeCourse({ crn: '11111', subject: 'CSCD', courseNumber: '427', displayCode: 'CSCD 427', instructor, meetings: [meeting] }),
        makeCourse({ crn: '22222', subject: 'CSCD', courseNumber: '527', displayCode: 'CSCD 527', instructor, meetings: [meeting] }),
        // Standalone course
        makeCourse({ crn: '33333', subject: 'CSCD', courseNumber: '300', displayCode: 'CSCD 300' }),
        // Another stacked pair
        makeCourse({ crn: '44444', subject: 'CYBR', courseNumber: '445', displayCode: 'CYBR 445', instructor, meetings: [meeting] }),
        makeCourse({ crn: '55555', subject: 'CYBR', courseNumber: '545', displayCode: 'CYBR 545', instructor, meetings: [meeting] }),
      ];

      const pairs = findStackedPairs(courses);

      // Find which courses would be hidden (stacked versions)
      const hiddenCourses = courses.filter((c) => isStackedVersion(c, pairs));
      const displayedCourses = courses.filter((c) => !isStackedVersion(c, pairs));

      // Every hidden course should appear as a stackedCourse in some pair
      const stackedCoursesCRNs = new Set(Array.from(pairs.values()).map((p) => p.stackedCourse.crn));
      for (const hidden of hiddenCourses) {
        expect(stackedCoursesCRNs.has(hidden.crn)).toBe(true);
      }

      // Total accounted for = displayed + hidden (via badges)
      expect(displayedCourses.length + hiddenCourses.length).toBe(courses.length);

      // Verify specific counts
      expect(displayedCourses.length).toBe(3); // 2 base courses + 1 standalone
      expect(hiddenCourses.length).toBe(2);    // 2 stacked versions
    });
  });
});
