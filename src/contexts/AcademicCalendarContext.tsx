import { createContext, useCallback, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { AcademicCalendarEvent, AcademicCalendarFeedResult } from '../services/academicCalendar';
import { loadAcademicCalendarFromPublicRss } from '../services/academicCalendar';

interface AcademicCalendarState {
  events: AcademicCalendarEvent[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  lastBuildDate: string | null;
}

type AcademicCalendarAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: AcademicCalendarFeedResult }
  | { type: 'LOAD_ERROR'; payload: string };

const initialState: AcademicCalendarState = {
  events: [],
  loading: true,
  error: null,
  lastUpdated: null,
  lastBuildDate: null,
};

function reducer(state: AcademicCalendarState, action: AcademicCalendarAction): AcademicCalendarState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_SUCCESS':
      return {
        ...state,
        loading: false,
        error: null,
        events: action.payload.events,
        lastUpdated: new Date(),
        lastBuildDate: action.payload.lastBuildDate,
      };
    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

interface AcademicCalendarContextValue {
  state: AcademicCalendarState;
  refresh: () => Promise<void>;
}

const AcademicCalendarContext = createContext<AcademicCalendarContextValue | undefined>(undefined);

export function AcademicCalendarProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const result = await loadAcademicCalendarFromPublicRss();
      dispatch({ type: 'LOAD_SUCCESS', payload: result });
    } catch (error) {
      dispatch({
        type: 'LOAD_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load academic calendar',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AcademicCalendarContext.Provider value={{ state, refresh: load }}>
      {children}
    </AcademicCalendarContext.Provider>
  );
}

export function useAcademicCalendar() {
  const ctx = useContext(AcademicCalendarContext);
  if (!ctx) {
    throw new Error('useAcademicCalendar must be used within an AcademicCalendarProvider');
  }
  return ctx;
}

export function useAcademicCalendarEvents() {
  const { state } = useAcademicCalendar();
  return state.events;
}
