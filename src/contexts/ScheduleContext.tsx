import { createContext, useContext, useEffect, ReactNode, useReducer, useState } from 'react';
import type { Course, BannerDataResponse } from '../types/schedule';
import { parseScheduleData, getUniqueInstructors, getUniqueSubjects, getUniqueCampuses } from '../services/scheduleParser';
import type { Instructor, SubjectCode, CampusType } from '../types/schedule';
import { analyzeSchedule } from '../services/scheduleAnalysis';
import type { Conflict } from '../services/conflictDetector';
import type { StackedCourseInfo } from '../services/stackedCourseDetector';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getCurrentTerm } from '../constants/academicTerms';

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

type TermScheduleSummary = {
  termCode: string;
  termDescription: string | null;
  totalCount: number;
  generatedAt: string | null;
};

type TermScheduleManifest = {
  schemaVersion: number;
  generatedAt: string;
  defaultTermCode: string | null;
  terms: TermScheduleSummary[];
};

// Action types
type ScheduleAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: { courses: Course[]; source: string; lastUpdated?: Date | null } }
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
        lastUpdated: action.payload.lastUpdated ?? new Date(),
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
  availableTerms: TermScheduleSummary[];
  selectedTermCode: string | null;
  selectTerm: (termCode: string) => Promise<void>;
  loadFromFile: (file: File) => Promise<void>;
  loadFromUrl: (url: string) => Promise<boolean>;
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
  const [availableTerms, setAvailableTerms] = useState<TermScheduleSummary[]>([]);
  const [selectedTermCode, setSelectedTermCode] = useState<string | null>(null);

  const manifestPath = 'data/terms/index.json';

  const safeStorageGet = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const safeStorageSet = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors (private browsing, blocked storage, etc.)
    }
  };

  const safeString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const safeNumber = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
    return 0;
  };

  const parseTermScheduleManifest = (value: unknown): TermScheduleManifest | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Record<string, unknown>;
    const termsRaw = raw.terms;
    const terms: TermScheduleSummary[] = Array.isArray(termsRaw)
      ? termsRaw
          .map((entry) => {
            if (!entry || typeof entry !== 'object') return null;
            const e = entry as Record<string, unknown>;
            const termCode = safeString(e.termCode);
            if (!termCode) return null;
            return {
              termCode,
              termDescription: safeString(e.termDescription),
              totalCount: safeNumber(e.totalCount),
              generatedAt: safeString(e.generatedAt),
            } satisfies TermScheduleSummary;
          })
          .filter((entry): entry is TermScheduleSummary => entry !== null)
      : [];

    return {
      schemaVersion: safeNumber(raw.schemaVersion),
      generatedAt: safeString(raw.generatedAt) ?? new Date().toISOString(),
      defaultTermCode: safeString(raw.defaultTermCode),
      terms,
    };
  };

  // Load data from a File object (for import)
  const loadFromFile = async (file: File): Promise<void> => {
    setSelectedTermCode(null);
    dispatch({ type: 'LOAD_START' });

    try {
      const text = await file.text();
      const data: BannerDataResponse = JSON.parse(text);
      const courses = parseScheduleData(data);

      if (courses.length === 0) {
        throw new Error('No valid courses found in file');
      }

      const generatedAtText = (data as unknown as { generatedAt?: unknown }).generatedAt;
      const generatedAt = typeof generatedAtText === 'string' ? new Date(generatedAtText) : null;
      const generatedAtDate = generatedAt && !Number.isNaN(generatedAt.getTime()) ? generatedAt : null;

      dispatch({
        type: 'LOAD_SUCCESS',
        payload: {
          courses,
          source: file.name,
          lastUpdated:
            generatedAtDate ??
            (Number.isFinite(file.lastModified) ? new Date(file.lastModified) : new Date()),
        },
      });
    } catch (error) {
      dispatch({
        type: 'LOAD_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load file',
      });
    }
  };

  // Load data from URL
  const loadFromUrl = async (url: string): Promise<boolean> => {
    dispatch({ type: 'LOAD_START' });

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const lastModifiedHeader = response.headers.get('last-modified');
      const lastModified = lastModifiedHeader ? new Date(lastModifiedHeader) : null;

      const data: BannerDataResponse = await response.json();
      const courses = parseScheduleData(data);

      if (courses.length === 0) {
        throw new Error('No valid courses found in data');
      }

      const generatedAtText = (data as unknown as { generatedAt?: unknown }).generatedAt;
      const generatedAt = typeof generatedAtText === 'string' ? new Date(generatedAtText) : null;
      const generatedAtDate = generatedAt && !Number.isNaN(generatedAt.getTime()) ? generatedAt : null;

      const lastUpdated =
        (lastModified && !Number.isNaN(lastModified.getTime()) ? lastModified : null) ??
        generatedAtDate ??
        new Date();

      dispatch({
        type: 'LOAD_SUCCESS',
        payload: { courses, source: url, lastUpdated },
      });
      return true;
    } catch (error) {
      dispatch({
        type: 'LOAD_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load data',
      });
      return false;
    }
  };

  const selectTerm = async (termCode: string): Promise<void> => {
    const next = termCode.trim();
    if (!next) return;

    const basePath = import.meta.env.BASE_URL || '/';
    const url = `${basePath}data/terms/${next}.json`;
    const success = await loadFromUrl(url);
    if (!success) return;

    setSelectedTermCode(next);
    safeStorageSet(STORAGE_KEYS.scheduleSelectedTerm, next);
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
      const manifestUrl = `${basePath}${manifestPath}`;

      let manifest: TermScheduleManifest | null = null;
      try {
        const response = await fetch(manifestUrl);
        if (response.ok) {
          const json = (await response.json()) as unknown;
          manifest = parseTermScheduleManifest(json);
        }
      } catch {
        // Manifest is optional (older deployments)
      }

      const terms = manifest?.terms ?? [];
      setAvailableTerms(terms);

      const storedTermCode = safeString(safeStorageGet(STORAGE_KEYS.scheduleSelectedTerm));
      const currentTermCode = getCurrentTerm();

      const isAvailable = (code: string | null): boolean => {
        if (!code) return false;
        if (terms.length === 0) return true; // No manifest available; allow optimistic loading.
        return terms.some((term) => term.termCode === code);
      };

      const preferredTermCode =
        (storedTermCode && isAvailable(storedTermCode) ? storedTermCode : null) ??
        (isAvailable(currentTermCode) ? currentTermCode : null) ??
        (isAvailable(manifest?.defaultTermCode ?? null) ? (manifest?.defaultTermCode ?? null) : null);

      const candidates = [
        ...(preferredTermCode ? [`${basePath}data/terms/${preferredTermCode}.json`] : []),
        `${basePath}data/schedule.json`, // canonical location (matches Settings instructions)
        `${basePath}data.json`, // backward-compatible fallback
        '/data/schedule.json', // fallback for root deployments
        '/data.json', // legacy fallback
      ];

      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;

          const lastModifiedHeader = response.headers.get('last-modified');
          const lastModified = lastModifiedHeader ? new Date(lastModifiedHeader) : null;

          const data: BannerDataResponse = await response.json();
          const courses = parseScheduleData(data);
          if (courses.length === 0) continue;

          const generatedAtText = (data as unknown as { generatedAt?: unknown }).generatedAt;
          const generatedAt = typeof generatedAtText === 'string' ? new Date(generatedAtText) : null;
          const generatedAtDate = generatedAt && !Number.isNaN(generatedAt.getTime()) ? generatedAt : null;

          const lastUpdated =
            (lastModified && !Number.isNaN(lastModified.getTime()) ? lastModified : null) ??
            generatedAtDate ??
            new Date();

          dispatch({
            type: 'LOAD_SUCCESS',
            payload: { courses, source: url, lastUpdated },
          });

          const termFromUrl = (() => {
            const match = url.match(/data\/terms\/(\d{6})\.json/i);
            return match?.[1] ?? null;
          })();

          if (termFromUrl && isAvailable(termFromUrl)) {
            setSelectedTermCode(termFromUrl);
          } else if (preferredTermCode && url.includes('data/terms/') && isAvailable(preferredTermCode)) {
            setSelectedTermCode(preferredTermCode);
          } else {
            const termFromData = courses[0]?.term ? safeString(courses[0].term) : null;
            setSelectedTermCode(termFromData && isAvailable(termFromData) ? termFromData : null);
          }

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
        availableTerms,
        selectedTermCode,
        selectTerm,
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
