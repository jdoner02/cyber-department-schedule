/**
 * AppSettingsContext - Global application settings
 *
 * Manages user preferences that affect the entire application:
 * - Subject visibility (which subjects to include in views)
 * - Program filtering (filter courses by degree program)
 */

import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { SubjectCode } from '../types/schedule';

// Settings state interface
export interface AppSettings {
  // Subject visibility - which subjects to show in the schedule
  visibleSubjects: SubjectCode[];

  // Program filter - filter courses to those in a specific program
  // null means show all courses (no program filter)
  programFilter: string | null;

  // Debug mode: Show 500-level stacked versions separately (default: hidden/merged)
  // When true, shows all courses including 500-level cross-listed sections
  showStackedVersions: boolean;
}

// Default settings
const defaultSettings: AppSettings = {
  visibleSubjects: ['CSCD', 'CYBR'], // Default to CSCD and CYBR only
  programFilter: null,
  showStackedVersions: false, // Hide 500-level stacked versions by default
};

// Action types
type SettingsAction =
  | { type: 'SET_VISIBLE_SUBJECTS'; payload: SubjectCode[] }
  | { type: 'TOGGLE_SUBJECT'; payload: SubjectCode }
  | { type: 'SET_PROGRAM_FILTER'; payload: string | null }
  | { type: 'SET_SHOW_STACKED_VERSIONS'; payload: boolean }
  | { type: 'RESET_SETTINGS' }
  | { type: 'LOAD_SETTINGS'; payload: AppSettings };

// Load settings from localStorage
function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.appSettings);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaultSettings,
        ...parsed,
        // Ensure visibleSubjects is always a valid array
        visibleSubjects: Array.isArray(parsed.visibleSubjects)
          ? parsed.visibleSubjects
          : defaultSettings.visibleSubjects,
      };
    }
  } catch (e) {
    console.error('Failed to load app settings:', e);
  }
  return defaultSettings;
}

// Save settings to localStorage
function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.appSettings, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save app settings:', e);
  }
}

// Reducer
function settingsReducer(state: AppSettings, action: SettingsAction): AppSettings {
  switch (action.type) {
    case 'SET_VISIBLE_SUBJECTS':
      return { ...state, visibleSubjects: action.payload };

    case 'TOGGLE_SUBJECT': {
      const subject = action.payload;
      const current = state.visibleSubjects;
      const isEnabled = current.includes(subject);

      // Don't allow removing the last subject
      if (isEnabled && current.length <= 1) {
        return state;
      }

      return {
        ...state,
        visibleSubjects: isEnabled
          ? current.filter((s) => s !== subject)
          : [...current, subject],
      };
    }

    case 'SET_PROGRAM_FILTER':
      return { ...state, programFilter: action.payload };

    case 'SET_SHOW_STACKED_VERSIONS':
      return { ...state, showStackedVersions: action.payload };

    case 'RESET_SETTINGS':
      return defaultSettings;

    case 'LOAD_SETTINGS':
      return action.payload;

    default:
      return state;
  }
}

// Context value interface
interface AppSettingsContextValue {
  settings: AppSettings;
  // Subject visibility
  isSubjectVisible: (subject: SubjectCode) => boolean;
  toggleSubject: (subject: SubjectCode) => void;
  setVisibleSubjects: (subjects: SubjectCode[]) => void;
  // Program filter
  setProgramFilter: (programSlug: string | null) => void;
  // Stacked versions visibility (debug mode)
  setShowStackedVersions: (show: boolean) => void;
  // Reset
  resetSettings: () => void;
}

// Create context
const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

// Provider props
interface AppSettingsProviderProps {
  children: ReactNode;
}

// Provider component
export function AppSettingsProvider({ children }: AppSettingsProviderProps) {
  const [settings, dispatch] = useReducer(settingsReducer, defaultSettings, loadSettings);

  // Save to localStorage when settings change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Helper functions
  const isSubjectVisible = useCallback(
    (subject: SubjectCode) => settings.visibleSubjects.includes(subject),
    [settings.visibleSubjects]
  );

  const toggleSubject = useCallback((subject: SubjectCode) => {
    dispatch({ type: 'TOGGLE_SUBJECT', payload: subject });
  }, []);

  const setVisibleSubjects = useCallback((subjects: SubjectCode[]) => {
    dispatch({ type: 'SET_VISIBLE_SUBJECTS', payload: subjects });
  }, []);

  const setProgramFilter = useCallback((programSlug: string | null) => {
    dispatch({ type: 'SET_PROGRAM_FILTER', payload: programSlug });
  }, []);

  const setShowStackedVersions = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_STACKED_VERSIONS', payload: show });
  }, []);

  const resetSettings = useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' });
  }, []);

  const value: AppSettingsContextValue = {
    settings,
    isSubjectVisible,
    toggleSubject,
    setVisibleSubjects,
    setProgramFilter,
    setShowStackedVersions,
    resetSettings,
  };

  return (
    <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
  );
}

// Hook to use app settings
export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}

// Convenience hooks
export function useVisibleSubjects() {
  const { settings, toggleSubject, setVisibleSubjects, isSubjectVisible } = useAppSettings();
  return {
    visibleSubjects: settings.visibleSubjects,
    toggleSubject,
    setVisibleSubjects,
    isSubjectVisible,
  };
}

export function useProgramFilter() {
  const { settings, setProgramFilter } = useAppSettings();
  return {
    programFilter: settings.programFilter,
    setProgramFilter,
  };
}

export function useStackedVersionsVisibility() {
  const { settings, setShowStackedVersions } = useAppSettings();
  return {
    showStackedVersions: settings.showStackedVersions,
    setShowStackedVersions,
  };
}
