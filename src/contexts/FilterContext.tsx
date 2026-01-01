import React, { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';
import type { ScheduleFilters, SubjectCode, DayOfWeek, DeliveryMethod, CampusType, Course, ColorByOption } from '../types/schedule';
import { useCourses } from './ScheduleContext';

// Default filters
const defaultFilters: ScheduleFilters = {
  subjects: [],
  instructors: [],
  days: [],
  timeRange: { start: 7 * 60, end: 22 * 60 }, // 7 AM to 10 PM
  delivery: [],
  campus: [],
  showConflictsOnly: false,
  searchQuery: '',
};

// State interface
interface FilterState {
  filters: ScheduleFilters;
  colorBy: ColorByOption;
  viewMode: 'week' | 'day' | 'list';
  selectedDay: DayOfWeek | null;
}

// Action types
type FilterAction =
  | { type: 'SET_SUBJECTS'; payload: SubjectCode[] }
  | { type: 'TOGGLE_SUBJECT'; payload: SubjectCode }
  | { type: 'SET_INSTRUCTORS'; payload: string[] }
  | { type: 'TOGGLE_INSTRUCTOR'; payload: string }
  | { type: 'SET_DAYS'; payload: DayOfWeek[] }
  | { type: 'TOGGLE_DAY'; payload: DayOfWeek }
  | { type: 'SET_TIME_RANGE'; payload: { start: number; end: number } }
  | { type: 'SET_DELIVERY'; payload: DeliveryMethod[] }
  | { type: 'TOGGLE_DELIVERY'; payload: DeliveryMethod }
  | { type: 'SET_CAMPUS'; payload: CampusType[] }
  | { type: 'TOGGLE_CAMPUS'; payload: CampusType }
  | { type: 'SET_CONFLICTS_ONLY'; payload: boolean }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_COLOR_BY'; payload: ColorByOption }
  | { type: 'SET_VIEW_MODE'; payload: 'week' | 'day' | 'list' }
  | { type: 'SET_SELECTED_DAY'; payload: DayOfWeek | null }
  | { type: 'RESET_FILTERS' };

// Initial state
const initialState: FilterState = {
  filters: defaultFilters,
  colorBy: 'subject',
  viewMode: 'week',
  selectedDay: null,
};

// Helper to toggle item in array
function toggleInArray<T>(array: T[], item: T): T[] {
  const index = array.indexOf(item);
  if (index === -1) {
    return [...array, item];
  }
  return array.filter((_, i) => i !== index);
}

// Reducer
function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_SUBJECTS':
      return { ...state, filters: { ...state.filters, subjects: action.payload } };

    case 'TOGGLE_SUBJECT':
      return {
        ...state,
        filters: {
          ...state.filters,
          subjects: toggleInArray(state.filters.subjects, action.payload),
        },
      };

    case 'SET_INSTRUCTORS':
      return { ...state, filters: { ...state.filters, instructors: action.payload } };

    case 'TOGGLE_INSTRUCTOR':
      return {
        ...state,
        filters: {
          ...state.filters,
          instructors: toggleInArray(state.filters.instructors, action.payload),
        },
      };

    case 'SET_DAYS':
      return { ...state, filters: { ...state.filters, days: action.payload } };

    case 'TOGGLE_DAY':
      return {
        ...state,
        filters: {
          ...state.filters,
          days: toggleInArray(state.filters.days, action.payload),
        },
      };

    case 'SET_TIME_RANGE':
      return { ...state, filters: { ...state.filters, timeRange: action.payload } };

    case 'SET_DELIVERY':
      return { ...state, filters: { ...state.filters, delivery: action.payload } };

    case 'TOGGLE_DELIVERY':
      return {
        ...state,
        filters: {
          ...state.filters,
          delivery: toggleInArray(state.filters.delivery, action.payload),
        },
      };

    case 'SET_CAMPUS':
      return { ...state, filters: { ...state.filters, campus: action.payload } };

    case 'TOGGLE_CAMPUS':
      return {
        ...state,
        filters: {
          ...state.filters,
          campus: toggleInArray(state.filters.campus, action.payload),
        },
      };

    case 'SET_CONFLICTS_ONLY':
      return { ...state, filters: { ...state.filters, showConflictsOnly: action.payload } };

    case 'SET_SEARCH_QUERY':
      return { ...state, filters: { ...state.filters, searchQuery: action.payload } };

    case 'SET_COLOR_BY':
      return { ...state, colorBy: action.payload };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'SET_SELECTED_DAY':
      return { ...state, selectedDay: action.payload };

    case 'RESET_FILTERS':
      return { ...state, filters: defaultFilters };

    default:
      return state;
  }
}

// Context interface
interface FilterContextValue {
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  filteredCourses: Course[];
  activeFilterCount: number;
}

// Create context
const FilterContext = createContext<FilterContextValue | undefined>(undefined);

// Provider props
interface FilterProviderProps {
  children: ReactNode;
}

// Apply filters to courses
function applyFilters(courses: Course[], filters: ScheduleFilters): Course[] {
  return courses.filter((course) => {
    // Subject filter
    if (filters.subjects.length > 0 && !filters.subjects.includes(course.subject)) {
      return false;
    }

    // Instructor filter
    if (filters.instructors.length > 0) {
      if (!course.instructor || !filters.instructors.includes(course.instructor.email)) {
        return false;
      }
    }

    // Day filter
    if (filters.days.length > 0) {
      const courseDays = course.meetings.flatMap((m) => m.days);
      if (!filters.days.some((day) => courseDays.includes(day))) {
        return false;
      }
    }

    // Time range filter
    if (course.meetings.length > 0) {
      const hasValidTime = course.meetings.some(
        (m) =>
          m.startMinutes >= filters.timeRange.start &&
          m.endMinutes <= filters.timeRange.end
      );
      if (!hasValidTime) {
        return false;
      }
    }

    // Delivery filter
    if (filters.delivery.length > 0 && !filters.delivery.includes(course.delivery)) {
      return false;
    }

    // Campus filter
    if (filters.campus.length > 0 && !filters.campus.includes(course.campus)) {
      return false;
    }

    // Conflicts only filter
    if (filters.showConflictsOnly && !course.hasConflicts) {
      return false;
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = [
        course.displayCode,
        course.title,
        course.instructor?.displayName ?? '',
        course.crn,
      ]
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

// Provider component
export function FilterProvider({ children }: FilterProviderProps) {
  const [state, dispatch] = useReducer(filterReducer, initialState);
  const courses = useCourses();

  // Compute filtered courses
  const filteredCourses = useMemo(() => {
    return applyFilters(courses, state.filters);
  }, [courses, state.filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (state.filters.subjects.length > 0) count++;
    if (state.filters.instructors.length > 0) count++;
    if (state.filters.days.length > 0) count++;
    if (state.filters.delivery.length > 0) count++;
    if (state.filters.campus.length > 0) count++;
    if (state.filters.showConflictsOnly) count++;
    if (state.filters.searchQuery) count++;
    return count;
  }, [state.filters]);

  return (
    <FilterContext.Provider
      value={{
        state,
        dispatch,
        filteredCourses,
        activeFilterCount,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

// Hook to use the context
export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}

// Convenience hooks
export function useFilteredCourses() {
  const { filteredCourses } = useFilters();
  return filteredCourses;
}

export function useColorBy() {
  const { state, dispatch } = useFilters();
  return {
    colorBy: state.colorBy,
    setColorBy: (value: ColorByOption) => dispatch({ type: 'SET_COLOR_BY', payload: value }),
  };
}

export function useViewMode() {
  const { state, dispatch } = useFilters();
  return {
    viewMode: state.viewMode,
    setViewMode: (value: 'week' | 'day' | 'list') => dispatch({ type: 'SET_VIEW_MODE', payload: value }),
    selectedDay: state.selectedDay,
    setSelectedDay: (value: DayOfWeek | null) => dispatch({ type: 'SET_SELECTED_DAY', payload: value }),
  };
}
