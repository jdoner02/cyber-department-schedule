import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  ReactNode,
  useCallback,
} from 'react';
import type { Course, Instructor, Meeting, CampusType } from '../types/schedule';
import { useCourses, useSchedule } from './ScheduleContext';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { type Conflict } from '../services/conflictDetector';
import { analyzeSchedule } from '../services/scheduleAnalysis';

// Types for course modifications
export interface CourseModification {
  courseId: string;
  changes: {
    instructor?: Instructor | null;
    meetings?: Meeting[];
    campus?: CampusType;
  };
  modifiedAt: Date;
}

// Serializable version for localStorage
interface SerializableDraftState {
  isEditMode: boolean;
  modifications: Array<[string, CourseModification]>;
  cancelledIds: string[];
  addedCourses: Course[];
  lastModified: string | null;
}

// Runtime state
interface DraftState {
  isEditMode: boolean;
  modifications: Map<string, CourseModification>;
  cancelledIds: Set<string>;
  addedCourses: Course[];
  lastModified: Date | null;
}

// Action types
type DraftAction =
  | { type: 'TOGGLE_EDIT_MODE' }
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'MODIFY_COURSE'; payload: { courseId: string; changes: CourseModification['changes'] } }
  | { type: 'CANCEL_COURSE'; payload: string }
  | { type: 'RESTORE_COURSE'; payload: string }
  | { type: 'REVERT_COURSE'; payload: string }
  | { type: 'ADD_COURSE'; payload: Course }
  | { type: 'REMOVE_ADDED'; payload: string }
  | { type: 'RESET_ALL' }
  | { type: 'LOAD_STATE'; payload: DraftState };

// Initial state
const initialState: DraftState = {
  isEditMode: false,
  modifications: new Map(),
  cancelledIds: new Set(),
  addedCourses: [],
  lastModified: null,
};

// Reducer
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

    case 'LOAD_STATE':
      return action.payload;

    default:
      return state;
  }
}

// Serialize state for localStorage
function serializeState(state: DraftState): SerializableDraftState {
  return {
    isEditMode: state.isEditMode,
    modifications: Array.from(state.modifications.entries()),
    cancelledIds: Array.from(state.cancelledIds),
    addedCourses: state.addedCourses,
    lastModified: state.lastModified?.toISOString() ?? null,
  };
}

// Deserialize state from localStorage
function deserializeState(data: SerializableDraftState): DraftState {
  return {
    isEditMode: data.isEditMode,
    modifications: new Map(data.modifications),
    cancelledIds: new Set(data.cancelledIds),
    addedCourses: data.addedCourses,
    lastModified: data.lastModified ? new Date(data.lastModified) : null,
  };
}

// Load from localStorage
function loadFromStorage(): DraftState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.draftSchedule);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as SerializableDraftState;
    return deserializeState(parsed);
  } catch (e) {
    console.error('Failed to load draft state:', e);
    return null;
  }
}

// Save to localStorage
function saveToStorage(state: DraftState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.draftSchedule, JSON.stringify(serializeState(state)));
  } catch (e) {
    console.error('Failed to save draft state:', e);
  }
}

// Context value interface
interface DraftContextValue {
  state: DraftState;
  // Mode controls
  toggleEditMode: () => void;
  setEditMode: (enabled: boolean) => void;
  // Course modifications
  modifyCourse: (courseId: string, changes: CourseModification['changes']) => void;
  cancelCourse: (courseId: string) => void;
  restoreCourse: (courseId: string) => void;
  revertCourse: (courseId: string) => void;
  // Add courses
  addCourse: (course: Course) => void;
  removeAddedCourse: (courseId: string) => void;
  // Reset
  resetAll: () => void;
  // Computed values
  draftCourses: Course[];
  draftConflicts: Conflict[];
  changeCount: number;
  hasChanges: boolean;
  // Helpers
  isModified: (courseId: string) => boolean;
  isCancelled: (courseId: string) => boolean;
  isAdded: (courseId: string) => boolean;
  getCourseState: (courseId: string) => 'live' | 'modified' | 'cancelled' | 'added';
  getModification: (courseId: string) => CourseModification | undefined;
}

// Create context
const DraftContext = createContext<DraftContextValue | undefined>(undefined);

// Provider props
interface DraftProviderProps {
  children: ReactNode;
}

// Draft course with state indicator
type DraftCourse = Course & { _draftState: 'live' | 'modified' | 'cancelled' | 'added' };

// Provider component
export function DraftScheduleProvider({ children }: DraftProviderProps) {
  const liveCourses = useCourses();
  useSchedule(); // Required to ensure ScheduleProvider is parent

  // Initialize with localStorage data
  const [state, dispatch] = useReducer(draftReducer, initialState, () => {
    const stored = loadFromStorage();
    return stored ?? initialState;
  });

  // Save to localStorage on changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Compute draft courses by applying modifications
  const draftCourses = useMemo((): DraftCourse[] => {
    // Start with live courses
    const modifiedCourses: DraftCourse[] = liveCourses.map((course) => {
      // Check if cancelled
      if (state.cancelledIds.has(course.id)) {
        return { ...course, _draftState: 'cancelled' as const };
      }
      // Check if modified
      const mod = state.modifications.get(course.id);
      if (mod) {
        return {
          ...course,
          ...(mod.changes.instructor !== undefined && { instructor: mod.changes.instructor }),
          ...(mod.changes.meetings !== undefined && { meetings: mod.changes.meetings }),
          ...(mod.changes.campus !== undefined && { campus: mod.changes.campus }),
          _draftState: 'modified' as const,
        };
      }
      return { ...course, _draftState: 'live' as const };
    });

    // Add new courses
    const addedWithState: DraftCourse[] = state.addedCourses.map((c) => ({
      ...c,
      _draftState: 'added' as const,
    }));

    return [...modifiedCourses, ...addedWithState];
  }, [liveCourses, state.modifications, state.cancelledIds, state.addedCourses]);

  // Compute conflicts for draft state
  const draftConflicts = useMemo(() => {
    // Filter out cancelled courses for conflict detection
    const activeCourses = draftCourses.filter(
      (c) => !state.cancelledIds.has(c.id)
    );

    // Run analysis to get conflicts
    const analysis = analyzeSchedule(activeCourses, {
      hideStackedVersions: true,
    });

    return analysis.conflicts;
  }, [draftCourses, state.cancelledIds]);

  // Change count
  const changeCount = useMemo(() => {
    return (
      state.modifications.size +
      state.cancelledIds.size +
      state.addedCourses.length
    );
  }, [state.modifications.size, state.cancelledIds.size, state.addedCourses.length]);

  // Helper functions
  const isModified = useCallback(
    (courseId: string) => state.modifications.has(courseId),
    [state.modifications]
  );

  const isCancelled = useCallback(
    (courseId: string) => state.cancelledIds.has(courseId),
    [state.cancelledIds]
  );

  const isAdded = useCallback(
    (courseId: string) => state.addedCourses.some((c) => c.id === courseId),
    [state.addedCourses]
  );

  const getCourseState = useCallback(
    (courseId: string): 'live' | 'modified' | 'cancelled' | 'added' => {
      if (state.cancelledIds.has(courseId)) return 'cancelled';
      if (state.addedCourses.some((c) => c.id === courseId)) return 'added';
      if (state.modifications.has(courseId)) return 'modified';
      return 'live';
    },
    [state.cancelledIds, state.addedCourses, state.modifications]
  );

  const getModification = useCallback(
    (courseId: string) => state.modifications.get(courseId),
    [state.modifications]
  );

  // Action dispatchers
  const toggleEditMode = useCallback(() => dispatch({ type: 'TOGGLE_EDIT_MODE' }), []);
  const setEditMode = useCallback((enabled: boolean) => dispatch({ type: 'SET_EDIT_MODE', payload: enabled }), []);
  const modifyCourse = useCallback(
    (courseId: string, changes: CourseModification['changes']) =>
      dispatch({ type: 'MODIFY_COURSE', payload: { courseId, changes } }),
    []
  );
  const cancelCourse = useCallback((courseId: string) => dispatch({ type: 'CANCEL_COURSE', payload: courseId }), []);
  const restoreCourse = useCallback((courseId: string) => dispatch({ type: 'RESTORE_COURSE', payload: courseId }), []);
  const revertCourse = useCallback((courseId: string) => dispatch({ type: 'REVERT_COURSE', payload: courseId }), []);
  const addCourse = useCallback((course: Course) => dispatch({ type: 'ADD_COURSE', payload: course }), []);
  const removeAddedCourse = useCallback((courseId: string) => dispatch({ type: 'REMOVE_ADDED', payload: courseId }), []);
  const resetAll = useCallback(() => dispatch({ type: 'RESET_ALL' }), []);

  const value: DraftContextValue = {
    state,
    toggleEditMode,
    setEditMode,
    modifyCourse,
    cancelCourse,
    restoreCourse,
    revertCourse,
    addCourse,
    removeAddedCourse,
    resetAll,
    draftCourses,
    draftConflicts,
    changeCount,
    hasChanges: changeCount > 0,
    isModified,
    isCancelled,
    isAdded,
    getCourseState,
    getModification,
  };

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

// Hook to use draft context
export function useDraft() {
  const context = useContext(DraftContext);
  if (context === undefined) {
    throw new Error('useDraft must be used within a DraftScheduleProvider');
  }
  return context;
}

// Convenience hooks
export function useEditMode() {
  const { state, toggleEditMode, setEditMode } = useDraft();
  return {
    isEditMode: state.isEditMode,
    toggleEditMode,
    setEditMode,
  };
}

export function useDraftCourses() {
  const { draftCourses, draftConflicts } = useDraft();
  return { draftCourses, draftConflicts };
}

export function useDraftActions() {
  const {
    modifyCourse,
    cancelCourse,
    restoreCourse,
    revertCourse,
    addCourse,
    removeAddedCourse,
    resetAll,
  } = useDraft();
  return {
    modifyCourse,
    cancelCourse,
    restoreCourse,
    revertCourse,
    addCourse,
    removeAddedCourse,
    resetAll,
  };
}

export function useCourseState(courseId: string) {
  const { getCourseState, isModified, isCancelled, isAdded, getModification } = useDraft();
  return {
    state: getCourseState(courseId),
    isModified: isModified(courseId),
    isCancelled: isCancelled(courseId),
    isAdded: isAdded(courseId),
    modification: getModification(courseId),
  };
}
