/**
 * =============================================================================
 * MODULE: Student Context
 * =============================================================================
 *
 * PURPOSE: State management for student personas in the advising system
 *
 * EDUCATIONAL NOTES:
 * - Uses React Context + useReducer pattern for state management
 * - Persists to localStorage for data durability
 * - Follows the same pattern as FilterContext for consistency
 *
 * PRIVACY REMINDER:
 * This system is designed for FICTIONAL personas only. Never store:
 * - Real student names or IDs
 * - Actual grades or transcripts
 * - Any personally identifiable information (PII)
 *
 * DESIGN PATTERNS:
 * - Reducer Pattern: Centralized state logic
 * - Context Pattern: Prop drilling avoidance
 * - Repository Pattern: localStorage abstraction
 * =============================================================================
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import type {
  StudentPersona,
  StudentState,
  StudentAction,
  CompletedCourse,
} from '../types/advising';
import { DEFAULT_EMOJI } from '../components/advising/EmojiPicker';
import { getCurrentTerm, addQuarters } from '../constants/academicTerms';
import { STORAGE_KEYS } from '../constants/storageKeys';

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = STORAGE_KEYS.studentPersonas;

// Privacy reminder shown on first use
const PRIVACY_REMINDER_KEY = STORAGE_KEYS.privacyReminderShown;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: StudentState = {
  personas: [],
  selectedPersonaId: null,
  loading: true,
  error: null,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a UUID v4 for persona IDs
 *
 * EDUCATIONAL NOTE:
 * crypto.randomUUID() is the modern, secure way to generate UUIDs.
 * It uses cryptographically secure random numbers.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Load personas from localStorage
 *
 * EDUCATIONAL NOTE - Error Boundaries:
 * localStorage can throw errors (quota exceeded, disabled, etc.)
 * We wrap all localStorage access in try-catch for robustness.
 */
function loadFromStorage(): StudentPersona[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load personas from storage:', error);
  }
  return [];
}

/**
 * Save personas to localStorage
 */
function saveToStorage(personas: StudentPersona[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(personas));
  } catch (error) {
    console.error('Failed to save personas to storage:', error);
  }
}

/**
 * Check if privacy reminder has been shown
 */
export function hasShownPrivacyReminder(): boolean {
  try {
    return localStorage.getItem(PRIVACY_REMINDER_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark privacy reminder as shown
 */
export function markPrivacyReminderShown(): void {
  try {
    localStorage.setItem(PRIVACY_REMINDER_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

// =============================================================================
// REDUCER
// =============================================================================

/**
 * Student reducer - handles all persona state mutations
 *
 * EDUCATIONAL NOTE - Immutable Updates:
 * React requires immutable state updates for proper change detection.
 * We always return new objects/arrays rather than mutating in place.
 * This enables shallow comparison for efficient re-renders.
 */
function studentReducer(state: StudentState, action: StudentAction): StudentState {
  switch (action.type) {
    case 'ADD_PERSONA': {
      const newPersonas = [...state.personas, action.payload];
      return {
        ...state,
        personas: newPersonas,
        selectedPersonaId: action.payload.id,
      };
    }

    case 'UPDATE_PERSONA': {
      const index = state.personas.findIndex((p) => p.id === action.payload.id);
      if (index === -1) return state;

      const newPersonas = [...state.personas];
      newPersonas[index] = {
        ...action.payload,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        personas: newPersonas,
      };
    }

    case 'DELETE_PERSONA': {
      const newPersonas = state.personas.filter((p) => p.id !== action.payload);
      return {
        ...state,
        personas: newPersonas,
        selectedPersonaId:
          state.selectedPersonaId === action.payload ? null : state.selectedPersonaId,
      };
    }

    case 'SELECT_PERSONA': {
      return {
        ...state,
        selectedPersonaId: action.payload,
      };
    }

    case 'ADD_COMPLETED_COURSE': {
      const { personaId, course } = action.payload;
      const personaIndex = state.personas.findIndex((p) => p.id === personaId);
      if (personaIndex === -1) return state;

      const persona = state.personas[personaIndex];

      // Check if course already exists
      const existingIndex = persona.completedCourses.findIndex(
        (c) => c.courseCode === course.courseCode
      );

      let updatedCourses: CompletedCourse[];
      if (existingIndex !== -1) {
        // Update existing
        updatedCourses = [...persona.completedCourses];
        updatedCourses[existingIndex] = course;
      } else {
        // Add new
        updatedCourses = [...persona.completedCourses, course];
      }

      const newPersonas = [...state.personas];
      newPersonas[personaIndex] = {
        ...persona,
        completedCourses: updatedCourses,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        personas: newPersonas,
      };
    }

    case 'UPDATE_COURSE': {
      const { personaId, courseCode, updates } = action.payload;
      const personaIndex = state.personas.findIndex((p) => p.id === personaId);
      if (personaIndex === -1) return state;

      const persona = state.personas[personaIndex];
      const courseIndex = persona.completedCourses.findIndex(
        (c) => c.courseCode === courseCode
      );
      if (courseIndex === -1) return state;

      const updatedCourses = [...persona.completedCourses];
      updatedCourses[courseIndex] = {
        ...updatedCourses[courseIndex],
        ...updates,
      };

      const newPersonas = [...state.personas];
      newPersonas[personaIndex] = {
        ...persona,
        completedCourses: updatedCourses,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        personas: newPersonas,
      };
    }

    case 'REMOVE_COURSE': {
      const { personaId, courseCode } = action.payload;
      const personaIndex = state.personas.findIndex((p) => p.id === personaId);
      if (personaIndex === -1) return state;

      const persona = state.personas[personaIndex];
      const updatedCourses = persona.completedCourses.filter(
        (c) => c.courseCode !== courseCode
      );

      const newPersonas = [...state.personas];
      newPersonas[personaIndex] = {
        ...persona,
        completedCourses: updatedCourses,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        personas: newPersonas,
      };
    }

    case 'SET_CURRENT_COURSES': {
      const { personaId, courses } = action.payload;
      const personaIndex = state.personas.findIndex((p) => p.id === personaId);
      if (personaIndex === -1) return state;

      const newPersonas = [...state.personas];
      newPersonas[personaIndex] = {
        ...state.personas[personaIndex],
        currentCourses: courses,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        personas: newPersonas,
      };
    }

    case 'LOAD_STATE': {
      return {
        ...state,
        personas: action.payload,
        loading: false,
      };
    }

    case 'CLEAR_ALL': {
      return {
        ...initialState,
        loading: false,
      };
    }

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

interface StudentContextValue {
  state: StudentState;
  dispatch: React.Dispatch<StudentAction>;

  // Convenience methods
  addPersona: (persona: Omit<StudentPersona, 'id' | 'createdAt' | 'updatedAt'>) => StudentPersona;
  updatePersona: (persona: StudentPersona) => void;
  deletePersona: (id: string) => void;
  selectPersona: (id: string | null) => void;

  // Course management
  addCourse: (personaId: string, course: CompletedCourse) => void;
  updateCourse: (personaId: string, courseCode: string, updates: Partial<CompletedCourse>) => void;
  removeCourse: (personaId: string, courseCode: string) => void;

  // Computed values
  selectedPersona: StudentPersona | null;
}

const StudentContext = createContext<StudentContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface StudentProviderProps {
  children: ReactNode;
}

export function StudentProvider({ children }: StudentProviderProps) {
  const [state, dispatch] = useReducer(studentReducer, initialState);

  // Load saved personas on mount
  useEffect(() => {
    const saved = loadFromStorage();
    dispatch({ type: 'LOAD_STATE', payload: saved });
  }, []);

  // Persist personas to localStorage after initial load
  useEffect(() => {
    if (state.loading) return;
    saveToStorage(state.personas);
  }, [state.loading, state.personas]);

  // Selected persona computed value
  const selectedPersona = useMemo(() => {
    if (!state.selectedPersonaId) return null;
    return state.personas.find((p) => p.id === state.selectedPersonaId) ?? null;
  }, [state.personas, state.selectedPersonaId]);

  // Convenience method: Add new persona
  const addPersona = useCallback(
    (data: Omit<StudentPersona, 'id' | 'createdAt' | 'updatedAt'>): StudentPersona => {
      const now = new Date().toISOString();
      const newPersona: StudentPersona = {
        id: generateId(),
        createdAt: now,
        updatedAt: now,
        icon: data.icon || DEFAULT_EMOJI,
        nickname: data.nickname || 'New Student Plan',
        primaryMajor: data.primaryMajor || 'computer-science-cyber-operations-bs',
        secondMajor: data.secondMajor,
        minors: data.minors || [],
        startTerm: data.startTerm || getCurrentTerm(),
        expectedGraduation: data.expectedGraduation || addQuarters(getCurrentTerm(), 12),
        completedCourses: data.completedCourses || [],
        currentCourses: data.currentCourses || [],
        preferredCampus: data.preferredCampus,
        maxCreditsPerQuarter: data.maxCreditsPerQuarter || 15,
        notes: data.notes,
      };

      dispatch({ type: 'ADD_PERSONA', payload: newPersona });
      return newPersona;
    },
    []
  );

  // Convenience method: Update persona
  const updatePersona = useCallback((persona: StudentPersona) => {
    dispatch({ type: 'UPDATE_PERSONA', payload: persona });
  }, []);

  // Convenience method: Delete persona
  const deletePersona = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PERSONA', payload: id });
  }, []);

  // Convenience method: Select persona
  const selectPersona = useCallback((id: string | null) => {
    if (id === null) {
      dispatch({ type: 'SELECT_PERSONA', payload: null });
      return;
    }

    // Only allow selecting valid IDs
    const exists = state.personas.some((p) => p.id === id);
    if (!exists) return;
    dispatch({ type: 'SELECT_PERSONA', payload: id });
  }, [state.personas]);

  // Course management methods
  const addCourse = useCallback((personaId: string, course: CompletedCourse) => {
    dispatch({ type: 'ADD_COMPLETED_COURSE', payload: { personaId, course } });
  }, []);

  const updateCourse = useCallback(
    (personaId: string, courseCode: string, updates: Partial<CompletedCourse>) => {
      dispatch({ type: 'UPDATE_COURSE', payload: { personaId, courseCode, updates } });
    },
    []
  );

  const removeCourse = useCallback((personaId: string, courseCode: string) => {
    dispatch({ type: 'REMOVE_COURSE', payload: { personaId, courseCode } });
  }, []);

  const contextValue: StudentContextValue = {
    state,
    dispatch,
    addPersona,
    updatePersona,
    deletePersona,
    selectPersona,
    addCourse,
    updateCourse,
    removeCourse,
    selectedPersona,
  };

  return (
    <StudentContext.Provider value={contextValue}>{children}</StudentContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Access the full student context
 *
 * @throws Error if used outside StudentProvider
 */
export function useStudentContext(): StudentContextValue {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudentContext must be used within a StudentProvider');
  }
  return context;
}

/**
 * Get all personas
 */
export function usePersonas(): StudentPersona[] {
  const { state } = useStudentContext();
  return state.personas;
}

/**
 * Get a specific persona by ID
 */
export function usePersona(id: string): StudentPersona | null {
  const { state } = useStudentContext();
  return state.personas.find((p) => p.id === id) ?? null;
}

/**
 * Get the currently selected persona
 */
export function useSelectedPersona(): StudentPersona | null {
  const { selectedPersona } = useStudentContext();
  return selectedPersona;
}

/**
 * Get persona CRUD operations
 */
export function usePersonaActions() {
  const { addPersona, updatePersona, deletePersona, selectPersona } = useStudentContext();
  return { addPersona, updatePersona, deletePersona, selectPersona };
}

/**
 * Get course management operations for a specific persona
 */
export function useCourseActions(personaId: string) {
  const { addCourse, updateCourse, removeCourse } = useStudentContext();

  return {
    addCourse: (course: CompletedCourse) => addCourse(personaId, course),
    updateCourse: (courseCode: string, updates: Partial<CompletedCourse>) =>
      updateCourse(personaId, courseCode, updates),
    removeCourse: (courseCode: string) => removeCourse(personaId, courseCode),
  };
}

/**
 * Check if a course has been completed by a persona
 */
export function useCourseCompletion(
  personaId: string,
  courseCode: string
): CompletedCourse | null {
  const persona = usePersona(personaId);
  if (!persona) return null;

  return (
    persona.completedCourses.find(
      (c) => c.courseCode.toLowerCase() === courseCode.toLowerCase()
    ) ?? null
  );
}

/**
 * Calculate total credits completed by a persona
 */
export function useCreditsCompleted(personaId: string): number {
  const persona = usePersona(personaId);
  if (!persona) return 0;

  return persona.completedCourses.reduce((total, course) => {
    // Only count passing grades
    if (course.grade && !['W', 'NP', 'F'].includes(course.grade)) {
      return total + course.credits;
    }
    return total;
  }, 0);
}
