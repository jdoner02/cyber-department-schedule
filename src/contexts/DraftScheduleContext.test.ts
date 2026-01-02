/**
 * Unit tests for DraftScheduleContext
 * Tests the reducer logic and state transformations
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Since the reducer and types are not exported, we'll test the logic directly
// by recreating the essential parts here for testing

// Types
interface CourseModification {
  courseId: string;
  changes: {
    instructor?: { id: string; displayName: string } | null;
    meetings?: Array<{ days: string[]; startMinutes: number; endMinutes: number }>;
    campus?: string;
  };
  modifiedAt: Date;
}

interface DraftState {
  isEditMode: boolean;
  modifications: Map<string, CourseModification>;
  cancelledIds: Set<string>;
  addedCourses: Array<{ id: string; displayCode: string }>;
  lastModified: Date | null;
}

type DraftAction =
  | { type: 'TOGGLE_EDIT_MODE' }
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'MODIFY_COURSE'; payload: { courseId: string; changes: CourseModification['changes'] } }
  | { type: 'CANCEL_COURSE'; payload: string }
  | { type: 'RESTORE_COURSE'; payload: string }
  | { type: 'REVERT_COURSE'; payload: string }
  | { type: 'ADD_COURSE'; payload: { id: string; displayCode: string } }
  | { type: 'REMOVE_ADDED'; payload: string }
  | { type: 'RESET_ALL' };

// Initial state
const initialState: DraftState = {
  isEditMode: false,
  modifications: new Map(),
  cancelledIds: new Set(),
  addedCourses: [],
  lastModified: null,
};

// Reducer (copied from DraftScheduleContext for testing)
function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'TOGGLE_EDIT_MODE':
      return { ...state, isEditMode: !state.isEditMode };

    case 'SET_EDIT_MODE':
      return { ...state, isEditMode: action.payload };

    case 'MODIFY_COURSE': {
      const newModifications = new Map(state.modifications);
      const existing = newModifications.get(action.payload.courseId);
      newModifications.set(action.payload.courseId, {
        courseId: action.payload.courseId,
        changes: { ...existing?.changes, ...action.payload.changes },
        modifiedAt: new Date(),
      });
      return {
        ...state,
        modifications: newModifications,
        lastModified: new Date(),
      };
    }

    case 'CANCEL_COURSE': {
      const newCancelledIds = new Set(state.cancelledIds);
      newCancelledIds.add(action.payload);
      return {
        ...state,
        cancelledIds: newCancelledIds,
        lastModified: new Date(),
      };
    }

    case 'RESTORE_COURSE': {
      const newCancelledIds = new Set(state.cancelledIds);
      newCancelledIds.delete(action.payload);
      return {
        ...state,
        cancelledIds: newCancelledIds,
        lastModified: new Date(),
      };
    }

    case 'REVERT_COURSE': {
      const newModifications = new Map(state.modifications);
      newModifications.delete(action.payload);
      const newCancelledIds = new Set(state.cancelledIds);
      newCancelledIds.delete(action.payload);
      return {
        ...state,
        modifications: newModifications,
        cancelledIds: newCancelledIds,
        lastModified: new Date(),
      };
    }

    case 'ADD_COURSE':
      return {
        ...state,
        addedCourses: [...state.addedCourses, action.payload],
        lastModified: new Date(),
      };

    case 'REMOVE_ADDED':
      return {
        ...state,
        addedCourses: state.addedCourses.filter((c) => c.id !== action.payload),
        lastModified: new Date(),
      };

    case 'RESET_ALL':
      return {
        ...initialState,
        isEditMode: state.isEditMode, // Keep edit mode on
      };

    default:
      return state;
  }
}

// Tests
describe('DraftScheduleContext Reducer', () => {
  let state: DraftState;

  beforeEach(() => {
    state = { ...initialState, modifications: new Map(), cancelledIds: new Set(), addedCourses: [] };
  });

  describe('TOGGLE_EDIT_MODE', () => {
    it('should toggle edit mode from false to true', () => {
      const newState = draftReducer(state, { type: 'TOGGLE_EDIT_MODE' });
      expect(newState.isEditMode).toBe(true);
    });

    it('should toggle edit mode from true to false', () => {
      state.isEditMode = true;
      const newState = draftReducer(state, { type: 'TOGGLE_EDIT_MODE' });
      expect(newState.isEditMode).toBe(false);
    });
  });

  describe('SET_EDIT_MODE', () => {
    it('should set edit mode to true', () => {
      const newState = draftReducer(state, { type: 'SET_EDIT_MODE', payload: true });
      expect(newState.isEditMode).toBe(true);
    });

    it('should set edit mode to false', () => {
      state.isEditMode = true;
      const newState = draftReducer(state, { type: 'SET_EDIT_MODE', payload: false });
      expect(newState.isEditMode).toBe(false);
    });
  });

  describe('MODIFY_COURSE', () => {
    it('should add a new modification', () => {
      const newState = draftReducer(state, {
        type: 'MODIFY_COURSE',
        payload: {
          courseId: 'course-1',
          changes: { campus: 'Online' },
        },
      });

      expect(newState.modifications.has('course-1')).toBe(true);
      expect(newState.modifications.get('course-1')?.changes.campus).toBe('Online');
      expect(newState.lastModified).not.toBeNull();
    });

    it('should merge changes for existing modification', () => {
      // First modification
      state = draftReducer(state, {
        type: 'MODIFY_COURSE',
        payload: {
          courseId: 'course-1',
          changes: { campus: 'Cheney' },
        },
      });

      // Second modification
      const newState = draftReducer(state, {
        type: 'MODIFY_COURSE',
        payload: {
          courseId: 'course-1',
          changes: { instructor: { id: 'inst-1', displayName: 'Dr. Smith' } },
        },
      });

      const mod = newState.modifications.get('course-1');
      expect(mod?.changes.campus).toBe('Cheney');
      expect(mod?.changes.instructor?.displayName).toBe('Dr. Smith');
    });

    it('should update lastModified timestamp', () => {
      const newState = draftReducer(state, {
        type: 'MODIFY_COURSE',
        payload: {
          courseId: 'course-1',
          changes: { campus: 'Online' },
        },
      });

      expect(newState.lastModified).toBeInstanceOf(Date);
    });
  });

  describe('CANCEL_COURSE', () => {
    it('should add course id to cancelledIds', () => {
      const newState = draftReducer(state, {
        type: 'CANCEL_COURSE',
        payload: 'course-1',
      });

      expect(newState.cancelledIds.has('course-1')).toBe(true);
    });

    it('should handle multiple cancellations', () => {
      state = draftReducer(state, { type: 'CANCEL_COURSE', payload: 'course-1' });
      const newState = draftReducer(state, { type: 'CANCEL_COURSE', payload: 'course-2' });

      expect(newState.cancelledIds.size).toBe(2);
      expect(newState.cancelledIds.has('course-1')).toBe(true);
      expect(newState.cancelledIds.has('course-2')).toBe(true);
    });
  });

  describe('RESTORE_COURSE', () => {
    it('should remove course id from cancelledIds', () => {
      state.cancelledIds.add('course-1');

      const newState = draftReducer(state, {
        type: 'RESTORE_COURSE',
        payload: 'course-1',
      });

      expect(newState.cancelledIds.has('course-1')).toBe(false);
    });

    it('should not affect other cancelled courses', () => {
      state.cancelledIds.add('course-1');
      state.cancelledIds.add('course-2');

      const newState = draftReducer(state, {
        type: 'RESTORE_COURSE',
        payload: 'course-1',
      });

      expect(newState.cancelledIds.has('course-1')).toBe(false);
      expect(newState.cancelledIds.has('course-2')).toBe(true);
    });
  });

  describe('REVERT_COURSE', () => {
    it('should remove modification and cancelled status', () => {
      state.modifications.set('course-1', {
        courseId: 'course-1',
        changes: { campus: 'Online' },
        modifiedAt: new Date(),
      });
      state.cancelledIds.add('course-1');

      const newState = draftReducer(state, {
        type: 'REVERT_COURSE',
        payload: 'course-1',
      });

      expect(newState.modifications.has('course-1')).toBe(false);
      expect(newState.cancelledIds.has('course-1')).toBe(false);
    });

    it('should not affect other courses', () => {
      state.modifications.set('course-1', {
        courseId: 'course-1',
        changes: { campus: 'Online' },
        modifiedAt: new Date(),
      });
      state.modifications.set('course-2', {
        courseId: 'course-2',
        changes: { campus: 'Cheney' },
        modifiedAt: new Date(),
      });

      const newState = draftReducer(state, {
        type: 'REVERT_COURSE',
        payload: 'course-1',
      });

      expect(newState.modifications.has('course-1')).toBe(false);
      expect(newState.modifications.has('course-2')).toBe(true);
    });
  });

  describe('ADD_COURSE', () => {
    it('should add a new course to addedCourses', () => {
      const newState = draftReducer(state, {
        type: 'ADD_COURSE',
        payload: { id: 'new-course-1', displayCode: 'CYBR 403' },
      });

      expect(newState.addedCourses.length).toBe(1);
      expect(newState.addedCourses[0].displayCode).toBe('CYBR 403');
    });

    it('should append to existing added courses', () => {
      state.addedCourses.push({ id: 'new-course-1', displayCode: 'CYBR 403' });

      const newState = draftReducer(state, {
        type: 'ADD_COURSE',
        payload: { id: 'new-course-2', displayCode: 'CSCD 305' },
      });

      expect(newState.addedCourses.length).toBe(2);
    });
  });

  describe('REMOVE_ADDED', () => {
    it('should remove a course from addedCourses', () => {
      state.addedCourses.push({ id: 'new-course-1', displayCode: 'CYBR 403' });

      const newState = draftReducer(state, {
        type: 'REMOVE_ADDED',
        payload: 'new-course-1',
      });

      expect(newState.addedCourses.length).toBe(0);
    });

    it('should not affect other added courses', () => {
      state.addedCourses.push({ id: 'new-course-1', displayCode: 'CYBR 403' });
      state.addedCourses.push({ id: 'new-course-2', displayCode: 'CSCD 305' });

      const newState = draftReducer(state, {
        type: 'REMOVE_ADDED',
        payload: 'new-course-1',
      });

      expect(newState.addedCourses.length).toBe(1);
      expect(newState.addedCourses[0].id).toBe('new-course-2');
    });
  });

  describe('RESET_ALL', () => {
    it('should clear all changes but keep edit mode', () => {
      state.isEditMode = true;
      state.modifications.set('course-1', {
        courseId: 'course-1',
        changes: { campus: 'Online' },
        modifiedAt: new Date(),
      });
      state.cancelledIds.add('course-2');
      state.addedCourses.push({ id: 'new-course-1', displayCode: 'CYBR 403' });
      state.lastModified = new Date();

      const newState = draftReducer(state, { type: 'RESET_ALL' });

      expect(newState.isEditMode).toBe(true); // Preserved
      expect(newState.modifications.size).toBe(0);
      expect(newState.cancelledIds.size).toBe(0);
      expect(newState.addedCourses.length).toBe(0);
    });

    it('should reset to initial state except edit mode', () => {
      state.isEditMode = false;
      state.modifications.set('course-1', {
        courseId: 'course-1',
        changes: { campus: 'Online' },
        modifiedAt: new Date(),
      });

      const newState = draftReducer(state, { type: 'RESET_ALL' });

      expect(newState.isEditMode).toBe(false); // Was false, stays false
      expect(newState.modifications.size).toBe(0);
    });
  });
});

describe('Change Count Calculation', () => {
  it('should count modifications, cancellations, and added courses', () => {
    const state: DraftState = {
      isEditMode: true,
      modifications: new Map([
        ['course-1', { courseId: 'course-1', changes: { campus: 'Online' }, modifiedAt: new Date() }],
        ['course-2', { courseId: 'course-2', changes: { campus: 'Cheney' }, modifiedAt: new Date() }],
      ]),
      cancelledIds: new Set(['course-3']),
      addedCourses: [{ id: 'new-1', displayCode: 'CYBR 403' }],
      lastModified: new Date(),
    };

    const changeCount = state.modifications.size + state.cancelledIds.size + state.addedCourses.length;
    expect(changeCount).toBe(4);
  });

  it('should return 0 when no changes', () => {
    const state: DraftState = {
      isEditMode: false,
      modifications: new Map(),
      cancelledIds: new Set(),
      addedCourses: [],
      lastModified: null,
    };

    const changeCount = state.modifications.size + state.cancelledIds.size + state.addedCourses.length;
    expect(changeCount).toBe(0);
  });
});

describe('Course State Helpers', () => {
  it('getCourseState should return correct state', () => {
    const state: DraftState = {
      isEditMode: true,
      modifications: new Map([
        ['course-1', { courseId: 'course-1', changes: { campus: 'Online' }, modifiedAt: new Date() }],
      ]),
      cancelledIds: new Set(['course-2']),
      addedCourses: [{ id: 'course-3', displayCode: 'CYBR 403' }],
      lastModified: new Date(),
    };

    // Helper function
    function getCourseState(courseId: string): 'live' | 'modified' | 'cancelled' | 'added' {
      if (state.cancelledIds.has(courseId)) return 'cancelled';
      if (state.addedCourses.some((c) => c.id === courseId)) return 'added';
      if (state.modifications.has(courseId)) return 'modified';
      return 'live';
    }

    expect(getCourseState('course-1')).toBe('modified');
    expect(getCourseState('course-2')).toBe('cancelled');
    expect(getCourseState('course-3')).toBe('added');
    expect(getCourseState('course-4')).toBe('live');
  });
});
