import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect } from 'react';
import type { ScheduleFilters, SubjectCode, DayOfWeek, DeliveryMethod, CampusType, Course, ColorByOption } from '../types/schedule';
import { useCourses, useSchedule } from './ScheduleContext';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { Conflict } from '../services/conflictDetector';
import { SCHEDULE_END_HOUR, SCHEDULE_START_HOUR } from '../constants/timeSlots';

// Storage keys
const STORAGE_KEY = STORAGE_KEYS.scheduleFilters;
const PRESETS_STORAGE_KEY = STORAGE_KEYS.schedulePresets;

// Quick filter presets
export interface FilterPreset {
  id: string;
  name: string;
  filters: Partial<ScheduleFilters>;
  isBuiltIn?: boolean;
}

// Built-in presets
const builtInPresets: FilterPreset[] = [
  {
    id: 'cyber-only',
    name: 'CSCD & CYBR Only',
    filters: { subjects: ['CSCD', 'CYBR'] },
    isBuiltIn: true,
  },
  {
    id: 'conflicts',
    name: 'Show Conflicts',
    filters: { showConflictsOnly: true },
    isBuiltIn: true,
  },
  {
    id: 'in-person',
    name: 'In-Person Only',
    filters: { delivery: ['F2F'] },
    isBuiltIn: true,
  },
  {
    id: 'online',
    name: 'Online Only',
    filters: { delivery: ['Online'] },
    isBuiltIn: true,
  },
];

// Default filters - start with CSCD and CYBR
const defaultFilters: ScheduleFilters = {
  subjects: ['CSCD', 'CYBR'], // Default to department courses
  instructors: [],
  days: [],
  timeRange: { start: SCHEDULE_START_HOUR * 60, end: SCHEDULE_END_HOUR * 60 }, // 7 AM to 10 PM
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
  presets: FilterPreset[];
  activePresetId: string | null;
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
  | { type: 'APPLY_PRESET'; payload: FilterPreset }
  | { type: 'SAVE_PRESET'; payload: { name: string } }
  | { type: 'DELETE_PRESET'; payload: string }
  | { type: 'CLEAR_PRESET' }
  | { type: 'RESET_FILTERS' }
  | { type: 'LOAD_STATE'; payload: Partial<FilterState> };

// Load state from localStorage
function loadSavedState(): Partial<FilterState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new fields
      return {
        filters: { ...defaultFilters, ...parsed.filters },
        colorBy: parsed.colorBy || 'subject',
        viewMode: parsed.viewMode || 'week',
        selectedDay: parsed.selectedDay || null,
        activePresetId: parsed.activePresetId || null,
      };
    }
  } catch (e) {
    console.error('Failed to load filter state:', e);
  }
  return {};
}

// Load custom presets
function loadCustomPresets(): FilterPreset[] {
  try {
    const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load presets:', e);
  }
  return [];
}

// Initial state
const savedState = loadSavedState();
const customPresets = loadCustomPresets();

const initialState: FilterState = {
  filters: savedState.filters || defaultFilters,
  colorBy: savedState.colorBy || 'subject',
  viewMode: savedState.viewMode || 'week',
  selectedDay: savedState.selectedDay || null,
  presets: [...builtInPresets, ...customPresets],
  activePresetId: savedState.activePresetId || 'cyber-only', // Default to CSCD & CYBR preset
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
      return {
        ...state,
        filters: { ...state.filters, subjects: action.payload },
        activePresetId: null,
      };

    case 'TOGGLE_SUBJECT':
      return {
        ...state,
        filters: {
          ...state.filters,
          subjects: toggleInArray(state.filters.subjects, action.payload),
        },
        activePresetId: null,
      };

    case 'SET_INSTRUCTORS':
      return {
        ...state,
        filters: { ...state.filters, instructors: action.payload },
        activePresetId: null,
      };

    case 'TOGGLE_INSTRUCTOR':
      return {
        ...state,
        filters: {
          ...state.filters,
          instructors: toggleInArray(state.filters.instructors, action.payload),
        },
        activePresetId: null,
      };

    case 'SET_DAYS':
      return {
        ...state,
        filters: { ...state.filters, days: action.payload },
        activePresetId: null,
      };

    case 'TOGGLE_DAY':
      return {
        ...state,
        filters: {
          ...state.filters,
          days: toggleInArray(state.filters.days, action.payload),
        },
        activePresetId: null,
      };

    case 'SET_TIME_RANGE':
      return {
        ...state,
        filters: { ...state.filters, timeRange: action.payload },
        activePresetId: null,
      };

    case 'SET_DELIVERY':
      return {
        ...state,
        filters: { ...state.filters, delivery: action.payload },
        activePresetId: null,
      };

    case 'TOGGLE_DELIVERY':
      return {
        ...state,
        filters: {
          ...state.filters,
          delivery: toggleInArray(state.filters.delivery, action.payload),
        },
        activePresetId: null,
      };

    case 'SET_CAMPUS':
      return {
        ...state,
        filters: { ...state.filters, campus: action.payload },
        activePresetId: null,
      };

    case 'TOGGLE_CAMPUS':
      return {
        ...state,
        filters: {
          ...state.filters,
          campus: toggleInArray(state.filters.campus, action.payload),
        },
        activePresetId: null,
      };

    case 'SET_CONFLICTS_ONLY':
      return {
        ...state,
        filters: { ...state.filters, showConflictsOnly: action.payload },
        activePresetId: null,
      };

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        filters: { ...state.filters, searchQuery: action.payload },
        activePresetId: null,
      };

    case 'SET_COLOR_BY':
      return { ...state, colorBy: action.payload };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'SET_SELECTED_DAY':
      return { ...state, selectedDay: action.payload };

    case 'APPLY_PRESET': {
      const preset = action.payload;
      return {
        ...state,
        filters: { ...defaultFilters, ...preset.filters },
        activePresetId: preset.id,
      };
    }

    case 'SAVE_PRESET': {
      const newPreset: FilterPreset = {
        id: `custom-${Date.now()}`,
        name: action.payload.name,
        filters: { ...state.filters },
        isBuiltIn: false,
      };
      const newPresets = [...state.presets, newPreset];
      return {
        ...state,
        presets: newPresets,
        activePresetId: newPreset.id,
      };
    }

    case 'DELETE_PRESET': {
      const newPresets = state.presets.filter(p => p.id !== action.payload);
      return {
        ...state,
        presets: newPresets,
        activePresetId: state.activePresetId === action.payload ? null : state.activePresetId,
      };
    }

    case 'CLEAR_PRESET':
      return { ...state, activePresetId: null };

    case 'RESET_FILTERS':
      return { ...state, filters: defaultFilters, activePresetId: 'cyber-only' };

    case 'LOAD_STATE':
      return { ...state, ...action.payload };

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
  applyPreset: (preset: FilterPreset) => void;
  saveCurrentAsPreset: (name: string) => void;
  deletePreset: (id: string) => void;
}

// Create context
const FilterContext = createContext<FilterContextValue | undefined>(undefined);

// Provider props
interface FilterProviderProps {
  children: ReactNode;
}

// Apply filters to courses
type CourseFilterSpec = {
  id:
    | 'subjects'
    | 'instructors'
    | 'days'
    | 'timeRange'
    | 'delivery'
    | 'campus'
    | 'conflictsOnly'
    | 'searchQuery';
  isEnabled: (filters: ScheduleFilters) => boolean;
  isActive: (filters: ScheduleFilters) => boolean;
  countsTowardActive: boolean;
  matches: (course: Course, filters: ScheduleFilters) => boolean;
};

const COURSE_FILTER_SPECS: CourseFilterSpec[] = [
  {
    id: 'subjects',
    isEnabled: (filters) => filters.subjects.length > 0,
    isActive: (filters) => filters.subjects.length > 0,
    countsTowardActive: true,
    matches: (course, filters) => filters.subjects.includes(course.subject),
  },
  {
    id: 'instructors',
    isEnabled: (filters) => filters.instructors.length > 0,
    isActive: (filters) => filters.instructors.length > 0,
    countsTowardActive: true,
    matches: (course, filters) =>
      Boolean(course.instructor) && filters.instructors.includes(course.instructor!.email),
  },
  {
    id: 'days',
    isEnabled: (filters) => filters.days.length > 0,
    isActive: (filters) => filters.days.length > 0,
    countsTowardActive: true,
    matches: (course, filters) => {
      const courseDays = course.meetings.flatMap((m) => m.days);
      return filters.days.some((day) => courseDays.includes(day));
    },
  },
  {
    id: 'timeRange',
    isEnabled: () => true,
    isActive: (filters) =>
      filters.timeRange.start !== defaultFilters.timeRange.start ||
      filters.timeRange.end !== defaultFilters.timeRange.end,
    countsTowardActive: false,
    matches: (course, filters) => {
      if (course.meetings.length === 0) return true;
      return course.meetings.some(
        (m) => m.startMinutes >= filters.timeRange.start && m.endMinutes <= filters.timeRange.end
      );
    },
  },
  {
    id: 'delivery',
    isEnabled: (filters) => filters.delivery.length > 0,
    isActive: (filters) => filters.delivery.length > 0,
    countsTowardActive: true,
    matches: (course, filters) => filters.delivery.includes(course.delivery),
  },
  {
    id: 'campus',
    isEnabled: (filters) => filters.campus.length > 0,
    isActive: (filters) => filters.campus.length > 0,
    countsTowardActive: true,
    matches: (course, filters) => filters.campus.includes(course.campus),
  },
  {
    id: 'conflictsOnly',
    isEnabled: (filters) => filters.showConflictsOnly,
    isActive: (filters) => filters.showConflictsOnly,
    countsTowardActive: true,
    matches: (course) => Boolean(course.hasConflicts),
  },
  {
    id: 'searchQuery',
    isEnabled: (filters) => Boolean(filters.searchQuery),
    isActive: (filters) => Boolean(filters.searchQuery),
    countsTowardActive: true,
    matches: (course, filters) => {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = [
        course.displayCode,
        course.title,
        course.instructor?.displayName ?? '',
        course.crn,
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(query);
    },
  },
];

function applyFilters(courses: Course[], filters: ScheduleFilters): Course[] {
  return courses.filter((course) =>
    COURSE_FILTER_SPECS.every((spec) => !spec.isEnabled(filters) || spec.matches(course, filters))
  );
}

function countActiveFilters(filters: ScheduleFilters): number {
  return COURSE_FILTER_SPECS.filter(
    (spec) => spec.countsTowardActive && spec.isActive(filters)
  ).length;
}

// Provider component
export function FilterProvider({ children }: FilterProviderProps) {
  const [state, dispatch] = useReducer(filterReducer, initialState);
  const courses = useCourses();

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const toSave = {
      filters: state.filters,
      colorBy: state.colorBy,
      viewMode: state.viewMode,
      selectedDay: state.selectedDay,
      activePresetId: state.activePresetId,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save filter state:', e);
    }
  }, [state.filters, state.colorBy, state.viewMode, state.selectedDay, state.activePresetId]);

  // Persist custom presets to localStorage whenever presets change
  useEffect(() => {
    try {
      const customOnly = state.presets.filter((p) => !p.isBuiltIn);
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customOnly));
    } catch (e) {
      console.error('Failed to save presets:', e);
    }
  }, [state.presets]);

  // Compute filtered courses
  const filteredCourses = useMemo(() => {
    return applyFilters(courses, state.filters);
  }, [courses, state.filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return countActiveFilters(state.filters);
  }, [state.filters]);

  // Helper functions
  const applyPreset = (preset: FilterPreset) => {
    dispatch({ type: 'APPLY_PRESET', payload: preset });
  };

  const saveCurrentAsPreset = (name: string) => {
    dispatch({ type: 'SAVE_PRESET', payload: { name } });
  };

  const deletePreset = (id: string) => {
    dispatch({ type: 'DELETE_PRESET', payload: id });
  };

  return (
    <FilterContext.Provider
      value={{
        state,
        dispatch,
        filteredCourses,
        activeFilterCount,
        applyPreset,
        saveCurrentAsPreset,
        deletePreset,
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

export function usePresets() {
  const { state, applyPreset, saveCurrentAsPreset, deletePreset } = useFilters();
  return {
    presets: state.presets,
    activePresetId: state.activePresetId,
    applyPreset,
    saveCurrentAsPreset,
    deletePreset,
  };
}

/**
 * Hook to get conflicts filtered to only include courses matching current filter
 * A conflict is included only if BOTH courses are in the filtered set
 */
export function useFilteredConflicts(): Conflict[] {
  const { filteredCourses } = useFilters();
  const { state } = useSchedule();

  return useMemo(() => {
    const filteredIds = new Set(filteredCourses.map(c => c.id));
    return state.conflicts.filter(
      conflict => filteredIds.has(conflict.course1.id) && filteredIds.has(conflict.course2.id)
    );
  }, [filteredCourses, state.conflicts]);
}
