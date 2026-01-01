import { describe, it, expect } from 'vitest';
import {
  parseScheduleData,
  getUniqueInstructors,
  getUniqueSubjects,
  getUniqueCampuses,
  filterCoursesByDay,
  getCoursesAtHour,
} from './scheduleParser';
import { mockScheduleResponse } from '../test/mocks/scheduleData';
import type { BannerDataResponse, DayOfWeek } from '../types/schedule';

describe('scheduleParser', () => {
  describe('parseScheduleData', () => {
    it('should parse valid schedule data correctly', () => {
      const courses = parseScheduleData(mockScheduleResponse);

      expect(courses).toHaveLength(5);
      expect(courses[0].displayCode).toBe('CSCD 110');
      expect(courses[0].title).toBe('INTRODUCTION TO PROGRAMMING');
    });

    it('should handle empty data gracefully', () => {
      const emptyResponse: BannerDataResponse = {
        success: true,
        totalCount: 0,
        data: [],
      };

      const courses = parseScheduleData(emptyResponse);
      expect(courses).toHaveLength(0);
    });

    it('should handle failed response', () => {
      const failedResponse: BannerDataResponse = {
        success: false,
        totalCount: 0,
        data: [],
      };

      const courses = parseScheduleData(failedResponse);
      expect(courses).toHaveLength(0);
    });

    it('should correctly normalize subject codes', () => {
      const courses = parseScheduleData(mockScheduleResponse);

      const cscdCourses = courses.filter(c => c.subject === 'CSCD');
      const cybrCourses = courses.filter(c => c.subject === 'CYBR');

      expect(cscdCourses.length).toBeGreaterThan(0);
      expect(cybrCourses.length).toBeGreaterThan(0);
    });

    it('should parse instructor information correctly', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const courseWithInstructor = courses[0];

      expect(courseWithInstructor.instructor).not.toBeNull();
      expect(courseWithInstructor.instructor?.displayName).toBe('Steiner, Stu');
      expect(courseWithInstructor.instructor?.email).toBe('ssteiner@ewu.edu');
      expect(courseWithInstructor.instructor?.lastName).toBe('Steiner');
      expect(courseWithInstructor.instructor?.firstName).toBe('Stu');
    });

    it('should parse meeting times correctly', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const course = courses[0];

      expect(course.meetings).toHaveLength(1);
      expect(course.meetings[0].startTime).toBe('0800');
      expect(course.meetings[0].endTime).toBe('0850');
      expect(course.meetings[0].startMinutes).toBe(480); // 8 * 60
      expect(course.meetings[0].endMinutes).toBe(530); // 8 * 60 + 50
      expect(course.meetings[0].durationMinutes).toBe(50);
    });

    it('should parse meeting days correctly', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const course = courses[0];

      expect(course.meetings[0].days).toContain('monday');
      expect(course.meetings[0].days).toContain('tuesday');
      expect(course.meetings[0].days).toContain('wednesday');
      expect(course.meetings[0].days).toContain('thursday');
      expect(course.meetings[0].days).toContain('friday');
      expect(course.meetings[0].days).not.toContain('saturday');
      expect(course.meetings[0].days).not.toContain('sunday');
    });

    it('should parse enrollment data correctly', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const course = courses[0];

      expect(course.enrollment.current).toBe(35);
      expect(course.enrollment.maximum).toBe(40);
      expect(course.enrollment.available).toBe(5);
      expect(course.enrollment.waitlist).toBe(2);
      expect(course.enrollment.waitlistMax).toBe(5);
      expect(course.enrollment.utilizationPercent).toBe(88); // 35/40 * 100 rounded
    });

    it('should parse delivery method correctly', () => {
      const courses = parseScheduleData(mockScheduleResponse);

      const f2fCourse = courses.find(c => c.crn === '21054');
      const onlineCourse = courses.find(c => c.crn === '21058');

      expect(f2fCourse?.delivery).toBe('F2F');
      expect(onlineCourse?.delivery).toBe('Online');
    });

    it('should parse location correctly', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const course = courses[0];

      expect(course.meetings[0].building).toBe('CAT');
      expect(course.meetings[0].room).toBe('221');
      expect(course.meetings[0].location).toBe('CAT 221');
    });

    it('should handle online course with no meeting days', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const onlineCourse = courses.find(c => c.crn === '21058');

      // Online/async courses with no specific days have empty meetings array
      // They're identified by campus and delivery method instead
      expect(onlineCourse?.campus).toBe('Online');
      expect(onlineCourse?.delivery).toBe('Online');
      expect(onlineCourse?.meetings).toHaveLength(0);
    });

    it('should parse course attributes', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const course = courses[0];

      expect(course.attributes).toHaveLength(1);
      expect(course.attributes[0].code).toBe('F011');
      expect(course.attributes[0].description).toBe('State Support Funding');
    });
  });

  describe('getUniqueInstructors', () => {
    it('should return unique instructors sorted by last name', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const instructors = getUniqueInstructors(courses);

      expect(instructors.length).toBeGreaterThan(0);
      // Should be sorted alphabetically by last name
      for (let i = 1; i < instructors.length; i++) {
        expect(
          instructors[i - 1].lastName.localeCompare(instructors[i].lastName)
        ).toBeLessThanOrEqual(0);
      }
    });

    it('should not include duplicates', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const instructors = getUniqueInstructors(courses);
      const emails = instructors.map(i => i.email);
      const uniqueEmails = [...new Set(emails)];

      expect(emails.length).toBe(uniqueEmails.length);
    });
  });

  describe('getUniqueSubjects', () => {
    it('should return unique subjects', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const subjects = getUniqueSubjects(courses);

      expect(subjects).toContain('CSCD');
      expect(subjects).toContain('CYBR');
    });
  });

  describe('getUniqueCampuses', () => {
    it('should return unique campuses', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const campuses = getUniqueCampuses(courses);

      expect(campuses).toContain('Cheney');
      expect(campuses).toContain('Online');
    });
  });

  describe('filterCoursesByDay', () => {
    it('should filter courses by specific day', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const mondayCourses = filterCoursesByDay(courses, 'monday');

      // All our mock courses meet on Monday except online
      expect(mondayCourses.length).toBeGreaterThan(0);

      // Verify all returned courses actually meet on Monday
      mondayCourses.forEach(course => {
        const meetsOnMonday = course.meetings.some(m => m.days.includes('monday'));
        expect(meetsOnMonday).toBe(true);
      });
    });

    it('should return empty array for Saturday', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const saturdayCourses = filterCoursesByDay(courses, 'saturday' as unknown as DayOfWeek);

      expect(saturdayCourses).toHaveLength(0);
    });
  });

  describe('getCoursesAtHour', () => {
    it('should return courses at specific hour', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const coursesAt8am = getCoursesAtHour(courses, 'monday', 8);

      // CSCD 110 meets at 8am
      expect(coursesAt8am.length).toBeGreaterThan(0);
      expect(coursesAt8am.some(c => c.crn === '21054')).toBe(true);
    });

    it('should return empty for hours with no courses', () => {
      const courses = parseScheduleData(mockScheduleResponse);
      const coursesAt6am = getCoursesAtHour(courses, 'monday', 6);

      expect(coursesAt6am).toHaveLength(0);
    });
  });
});
