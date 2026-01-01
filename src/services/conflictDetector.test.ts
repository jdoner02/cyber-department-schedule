import { describe, it, expect } from 'vitest';
import {
  detectAllConflicts,
  haveSameInstructor,
  findTimeOverlap,
  findRoomConflict,
  getConflictsForCourse,
  getInstructorConflicts,
  getRoomConflicts,
  markCoursesWithConflicts,
} from './conflictDetector';
import { parseScheduleData } from './scheduleParser';
import {
  mockScheduleResponse,
  mockBannerCourse,
  mockConflictingCourse,
  mockNonConflictingCourse,
} from '../test/mocks/scheduleData';
import type { Course } from '../types/schedule';

describe('conflictDetector', () => {
  // Parse mock data for testing
  const allCourses = parseScheduleData(mockScheduleResponse);

  describe('haveSameInstructor', () => {
    it('should return true for courses with same instructor', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockConflictingCourse],
      });

      expect(haveSameInstructor(courses[0], courses[1])).toBe(true);
    });

    it('should return false for courses with different instructors', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockNonConflictingCourse],
      });

      expect(haveSameInstructor(courses[0], courses[1])).toBe(false);
    });

    it('should return false when instructor is null', () => {
      const courseWithoutInstructor: Course = {
        ...allCourses[0],
        instructor: null,
      };

      expect(haveSameInstructor(courseWithoutInstructor, allCourses[0])).toBe(false);
    });
  });

  describe('findTimeOverlap', () => {
    it('should detect overlapping times on same day', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockConflictingCourse],
      });

      const overlap = findTimeOverlap(courses[0], courses[1]);

      expect(overlap).not.toBeNull();
      expect(overlap?.day).toBe('monday'); // or any weekday they share
      // Course 1: 0800-0850, Course 2: 0830-0920
      // Overlap should be 0830-0850
      expect(overlap?.start).toBe(510); // 8:30 = 8*60 + 30
      expect(overlap?.end).toBe(530); // 8:50 = 8*60 + 50
    });

    it('should return null for non-overlapping times', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockNonConflictingCourse],
      });

      const overlap = findTimeOverlap(courses[0], courses[1]);

      expect(overlap).toBeNull();
    });

    it('should return null when courses are on different days', () => {
      // Create a modified course that only meets on Saturday
      const saturdayOnlyCourse: Course = {
        ...allCourses[0],
        id: 'saturday-course',
        meetings: [
          {
            ...allCourses[0].meetings[0],
            days: [], // No weekdays
          },
        ],
      };

      const overlap = findTimeOverlap(allCourses[0], saturdayOnlyCourse);
      expect(overlap).toBeNull();
    });

    it('should handle adjacent (non-overlapping) times correctly', () => {
      // Course 1 ends at 8:50, Course 2 starts at 8:50
      const adjacentCourse: Course = {
        ...allCourses[0],
        id: 'adjacent-course',
        meetings: [
          {
            ...allCourses[0].meetings[0],
            startMinutes: 530, // 8:50
            endMinutes: 580, // 9:40
            startTime: '0850',
            endTime: '0940',
          },
        ],
      };

      const overlap = findTimeOverlap(allCourses[0], adjacentCourse);
      expect(overlap).toBeNull(); // Adjacent times should NOT overlap
    });
  });

  describe('findRoomConflict', () => {
    it('should detect room double-booking', () => {
      // Create two courses in the same room at the same time
      const sameRoomCourse1: Course = {
        ...allCourses[0],
        id: 'room-1',
        instructor: { ...allCourses[0].instructor!, email: 'different1@ewu.edu' },
        meetings: [
          {
            ...allCourses[0].meetings[0],
            building: 'CAT',
            room: '100',
          },
        ],
      };

      const sameRoomCourse2: Course = {
        ...allCourses[0],
        id: 'room-2',
        instructor: { ...allCourses[0].instructor!, email: 'different2@ewu.edu' },
        meetings: [
          {
            ...allCourses[0].meetings[0],
            building: 'CAT',
            room: '100',
          },
        ],
      };

      const conflict = findRoomConflict(sameRoomCourse1, sameRoomCourse2);

      expect(conflict).not.toBeNull();
      expect(conflict?.location).toBe('CAT 100');
    });

    it('should return null for different rooms', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockConflictingCourse],
      });

      // These courses are in different rooms (221 vs 222)
      const conflict = findRoomConflict(courses[0], courses[1]);
      expect(conflict).toBeNull();
    });

    it('should return null when building is null', () => {
      const noBuildingCourse: Course = {
        ...allCourses[0],
        meetings: [
          {
            ...allCourses[0].meetings[0],
            building: null,
            room: null,
          },
        ],
      };

      const conflict = findRoomConflict(allCourses[0], noBuildingCourse);
      expect(conflict).toBeNull();
    });
  });

  describe('detectAllConflicts', () => {
    it('should detect instructor conflicts', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockConflictingCourse],
      });

      const conflicts = detectAllConflicts(courses);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some(c => c.type === 'instructor')).toBe(true);
    });

    it('should return empty array for non-conflicting courses', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockNonConflictingCourse],
      });

      const conflicts = detectAllConflicts(courses);

      // Different instructors and different times
      expect(conflicts).toHaveLength(0);
    });

    it('should handle courses without meeting times', () => {
      const onlineOnlyCourses = allCourses.filter(c => c.delivery === 'Online');
      const conflicts = detectAllConflicts(onlineOnlyCourses);

      // Online courses typically don't have specific meeting times
      expect(conflicts).toHaveLength(0);
    });

    it('should generate unique conflict IDs', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockConflictingCourse],
      });

      const conflicts = detectAllConflicts(courses);
      const ids = conflicts.map(c => c.id);
      const uniqueIds = [...new Set(ids)];

      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('getConflictsForCourse', () => {
    it('should return conflicts involving specific course', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockConflictingCourse],
      });

      const allConflicts = detectAllConflicts(courses);
      const courseConflicts = getConflictsForCourse(courses[0], allConflicts);

      expect(courseConflicts.length).toBeGreaterThan(0);
      courseConflicts.forEach(conflict => {
        expect(
          conflict.course1.id === courses[0].id || conflict.course2.id === courses[0].id
        ).toBe(true);
      });
    });

    it('should return empty array for course without conflicts', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockNonConflictingCourse],
      });

      const allConflicts = detectAllConflicts(courses);
      const courseConflicts = getConflictsForCourse(courses[1], allConflicts);

      expect(courseConflicts).toHaveLength(0);
    });
  });

  describe('getInstructorConflicts', () => {
    it('should filter only instructor conflicts', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockConflictingCourse],
      });

      const allConflicts = detectAllConflicts(courses);
      const instructorConflicts = getInstructorConflicts(allConflicts);

      instructorConflicts.forEach(conflict => {
        expect(conflict.type).toBe('instructor');
      });
    });
  });

  describe('getRoomConflicts', () => {
    it('should filter only room conflicts', () => {
      // Create room conflicts
      const sameRoomCourse1: Course = {
        ...allCourses[0],
        id: 'room-conflict-1',
        instructor: { ...allCourses[0].instructor!, email: 'a@ewu.edu' },
        meetings: [{ ...allCourses[0].meetings[0], building: 'TEST', room: '100' }],
      };
      const sameRoomCourse2: Course = {
        ...allCourses[0],
        id: 'room-conflict-2',
        instructor: { ...allCourses[0].instructor!, email: 'b@ewu.edu' },
        meetings: [{ ...allCourses[0].meetings[0], building: 'TEST', room: '100' }],
      };

      const conflicts = detectAllConflicts([sameRoomCourse1, sameRoomCourse2]);
      const roomConflicts = getRoomConflicts(conflicts);

      roomConflicts.forEach(conflict => {
        expect(conflict.type).toBe('room');
      });
    });
  });

  describe('markCoursesWithConflicts', () => {
    it('should mark courses that have conflicts', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockConflictingCourse],
      });

      const conflicts = detectAllConflicts(courses);
      const markedCourses = markCoursesWithConflicts(courses, conflicts);

      // Both courses should be marked as having conflicts
      expect(markedCourses[0].hasConflicts).toBe(true);
      expect(markedCourses[1].hasConflicts).toBe(true);
    });

    it('should not mark courses without conflicts', () => {
      const courses = parseScheduleData({
        success: true,
        totalCount: 2,
        data: [mockBannerCourse, mockNonConflictingCourse],
      });

      const conflicts = detectAllConflicts(courses);
      const markedCourses = markCoursesWithConflicts(courses, conflicts);

      markedCourses.forEach(course => {
        expect(course.hasConflicts).toBe(false);
      });
    });
  });
});
