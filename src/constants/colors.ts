import type { SubjectCode, DeliveryMethod } from '../types/schedule';

// EWU Brand Colors
export const EWU_COLORS = {
  red: {
    primary: '#A4232E',
    dark: '#8A1D26',
    light: '#C64D55',
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
  },
  black: {
    primary: '#1A1A1A',
    secondary: '#333333',
    tertiary: '#4A4A4A',
  },
  white: '#FFFFFF',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

// Subject Colors
export const SUBJECT_COLORS: Record<SubjectCode, { bg: string; text: string; border: string; light: string }> = {
  CSCD: {
    bg: '#2563EB',
    text: '#FFFFFF',
    border: '#1D4ED8',
    light: '#DBEAFE',
  },
  CYBR: {
    bg: '#A4232E',
    text: '#FFFFFF',
    border: '#8A1D26',
    light: '#FEE2E2',
  },
  MATH: {
    bg: '#059669',
    text: '#FFFFFF',
    border: '#047857',
    light: '#D1FAE5',
  },
  OTHER: {
    bg: '#6B7280',
    text: '#FFFFFF',
    border: '#4B5563',
    light: '#F3F4F6',
  },
};

// Delivery Method Colors
export const DELIVERY_COLORS: Record<DeliveryMethod, { bg: string; text: string; border: string }> = {
  F2F: {
    bg: '#2563EB',
    text: '#FFFFFF',
    border: '#1D4ED8',
  },
  Online: {
    bg: '#7C3AED',
    text: '#FFFFFF',
    border: '#6D28D9',
  },
  Hybrid: {
    bg: '#0891B2',
    text: '#FFFFFF',
    border: '#0E7490',
  },
  Arranged: {
    bg: '#6B7280',
    text: '#FFFFFF',
    border: '#4B5563',
  },
};

// Status Colors
export const STATUS_COLORS = {
  conflict: {
    bg: '#DC2626',
    text: '#FFFFFF',
    border: '#B91C1C',
    light: '#FEE2E2',
  },
  warning: {
    bg: '#F59E0B',
    text: '#000000',
    border: '#D97706',
    light: '#FEF3C7',
  },
  success: {
    bg: '#10B981',
    text: '#FFFFFF',
    border: '#059669',
    light: '#D1FAE5',
  },
  info: {
    bg: '#3B82F6',
    text: '#FFFFFF',
    border: '#2563EB',
    light: '#DBEAFE',
  },
};

// Security Level Colors
export const SECURITY_COLORS = {
  public: {
    bg: '#10B981',
    text: '#FFFFFF',
    badge: 'bg-green-100 text-green-800',
  },
  internal: {
    bg: '#F59E0B',
    text: '#000000',
    badge: 'bg-amber-100 text-amber-800',
  },
  confidential: {
    bg: '#DC2626',
    text: '#FFFFFF',
    badge: 'bg-red-100 text-red-800',
  },
};

// Instructor Colors (for when coloring by instructor)
export const INSTRUCTOR_PALETTE = [
  '#2563EB', // Blue
  '#059669', // Green
  '#7C3AED', // Purple
  '#0891B2', // Cyan
  '#D97706', // Amber
  '#DC2626', // Red
  '#4F46E5', // Indigo
  '#0D9488', // Teal
  '#C026D3', // Fuchsia
  '#EA580C', // Orange
];

export function getInstructorColor(index: number): string {
  return INSTRUCTOR_PALETTE[index % INSTRUCTOR_PALETTE.length];
}
