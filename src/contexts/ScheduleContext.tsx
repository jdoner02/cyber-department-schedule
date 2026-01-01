import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { Course, BannerDataResponse } from '../types/schedule';
import { parseScheduleData, getUniqueInstructors, getUniqueSubjects, getUniqueCampuses } from '../services/scheduleParser';
import type { Instructor, SubjectCode, CampusType } from '../types/schedule';
import { analyzeSchedule } from '../services/scheduleAnalysis';
import type { Conflict } from '../services/conflictDetector';
import type { StackedCourseInfo } from '../services/stackedCourseDetector';

// State interface
interface ScheduleState {
  courses: Course[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  dataSource: string;
  conflicts: Conflict[];
  stackedPairs: Map<string, StackedCourseInfo>;
  // Derived data
  instructors: Instructor[];
  subjects: SubjectCode[];
  campuses: CampusType[];
}

// Action types
type ScheduleAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: { courses: Course[]; source: string } }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'CLEAR_DATA' };

// Initial state
const initialState: ScheduleState = {
  courses: [],
  loading: true,
  error: null,
  lastUpdated: null,
  dataSource: '',
  conflicts: [],
  stackedPairs: new Map(),
  instructors: [],
  subjects: [],
  campuses: [],
};

// Reducer
function scheduleReducer(state: ScheduleState, action: ScheduleAction): ScheduleState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };

    case 'LOAD_SUCCESS': {
      const analysis = analyzeSchedule(action.payload.courses, {
        hideStackedVersions: true,
      });
      const courses = analysis.courses;
      return {
        ...state,
        courses,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        dataSource: action.payload.source,
        conflicts: analysis.conflicts,
        stackedPairs: analysis.stackedPairs,
        instructors: getUniqueInstructors(courses),
        subjects: getUniqueSubjects(courses),
        campuses: getUniqueCampuses(courses),
      };
    }

    case 'LOAD_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case 'CLEAR_DATA':
      return initialState;

    default:
      return state;
  }
}

// Context interface
interface ScheduleContextValue {
  state: ScheduleState;
  loadFromFile: (file: File) => Promise<void>;
  loadFromUrl: (url: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

// Create context
const ScheduleContext = createContext<ScheduleContextValue | undefined>(undefined);

// Provider props
interface ScheduleProviderProps {
  children: ReactNode;
}

// Provider component
export function ScheduleProvider({ children }: ScheduleProviderProps) {
  const [state, dispatch] = useReducer(scheduleReducer, initialState);

  // Load data from a File object (for import)
  const loadFromFile = async (file: File): Promise<void> => {
    dispatch({ type: 'LOAD_START' });

    try {
      const text = await file.text();
      const data: BannerDataResponse = JSON.parse(text);
      const courses = parseScheduleData(data);

      if (courses.length === 0) {
        throw new Error('No valid courses found in file');
      }

      dispatch({
        type: 'LOAD_SUCCESS',
        payload: { courses, source: file.name },
      });
    } catch (error) {
      dispatch({
        type: 'LOAD_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load file',
      });
    }
  };

  // Load data from URL
  const loadFromUrl = async (url: string): Promise<void> => {
    dispatch({ type: 'LOAD_START' });

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BannerDataResponse = await response.json();
      const courses = parseScheduleData(data);

      if (courses.length === 0) {
        throw new Error('No valid courses found in data');
      }

      dispatch({
        type: 'LOAD_SUCCESS',
        payload: { courses, source: url },
      });
    } catch (error) {
      dispatch({
        type: 'LOAD_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load data',
      });
    }
  };

  // Refresh data from current source
  const refreshData = async (): Promise<void> => {
    const source = state.dataSource;
    if (!source) return;

    // File imports store only a filename (not fetchable). Refresh only when source is fetchable.
    const isFetchable = source.startsWith('http') || source.startsWith('/');
    if (!isFetchable) return;

    await loadFromUrl(source);
  };

  // Auto-load data on mount
  useEffect(() => {
    // Try to load from the public data folder
    const loadInitialData = async () => {
      const basePath = import.meta.env.BASE_URL || '/';
      const candidates = [
        `${basePath}data/schedule.json`, // canonical location (matches Settings instructions)
        `${basePath}data.json`, // backward-compatible fallback
        '/data/schedule.json', // fallback for root deployments
        '/data.json', // legacy fallback
      ];

      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;

          const data: BannerDataResponse = await response.json();
          const courses = parseScheduleData(data);
          if (courses.length === 0) continue;

          dispatch({
            type: 'LOAD_SUCCESS',
            payload: { courses, source: url },
          });
          return;
        } catch {
          // Try next candidate
        }
      }

      dispatch({
        type: 'LOAD_ERROR',
        payload: 'No schedule data found. Please import a schedule JSON file.',
      });
    };

    loadInitialData();
  }, []);

  return (
    <ScheduleContext.Provider
      value={{
        state,
        loadFromFile,
        loadFromUrl,
        refreshData,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

// Hook to use the context
export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}

// Convenience hooks for specific parts of state
export function useCourses() {
  const { state } = useSchedule();
  return state.courses;
}

export function useScheduleLoading() {
  const { state } = useSchedule();
  return { loading: state.loading, error: state.error };
}
