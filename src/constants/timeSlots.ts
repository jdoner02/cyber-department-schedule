import type { DayOfWeek } from '../types/schedule';

// Time grid configuration
export const SCHEDULE_START_HOUR = 7; // 7:00 AM
export const SCHEDULE_END_HOUR = 22; // 10:00 PM
export const TIME_SLOT_HEIGHT = 60; // pixels per hour
export const MINUTES_PER_PIXEL = 60 / TIME_SLOT_HEIGHT;

// Generate time slots from start to end
export function generateTimeSlots(): { hour: number; label: string }[] {
  const slots: { hour: number; label: string }[] = [];
  for (let hour = SCHEDULE_START_HOUR; hour <= SCHEDULE_END_HOUR; hour++) {
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const amPm = hour >= 12 ? 'PM' : 'AM';
    slots.push({
      hour,
      label: `${displayHour}:00 ${amPm}`,
    });
  }
  return slots;
}

export const TIME_SLOTS = generateTimeSlots();

// Days configuration
export const DAYS_OF_WEEK: { key: DayOfWeek; display: string; short: string }[] = [
  { key: 'monday', display: 'Monday', short: 'Mon' },
  { key: 'tuesday', display: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', display: 'Wednesday', short: 'Wed' },
  { key: 'thursday', display: 'Thursday', short: 'Thu' },
  { key: 'friday', display: 'Friday', short: 'Fri' },
];

// Convert time string (e.g., "0800", "1350") to minutes from midnight
export function timeToMinutes(time: string | null): number {
  if (!time) return 0;
  const hours = parseInt(time.substring(0, 2), 10);
  const minutes = parseInt(time.substring(2, 4), 10);
  return hours * 60 + minutes;
}

// Convert minutes from midnight to display time (e.g., "8:00 AM")
export function minutesToDisplayTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const amPm = hours >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${mins.toString().padStart(2, '0')} ${amPm}`;
}

// Convert minutes to position in grid (pixels from top)
export function minutesToPosition(minutes: number): number {
  const startMinutes = SCHEDULE_START_HOUR * 60;
  return ((minutes - startMinutes) / 60) * TIME_SLOT_HEIGHT;
}

// Convert duration in minutes to height in pixels
export function durationToHeight(durationMinutes: number): number {
  return (durationMinutes / 60) * TIME_SLOT_HEIGHT;
}

// Format time range for display
export function formatTimeRange(startMinutes: number, endMinutes: number): string {
  return `${minutesToDisplayTime(startMinutes)} - ${minutesToDisplayTime(endMinutes)}`;
}

// Check if a time falls within schedule hours
export function isWithinScheduleHours(minutes: number): boolean {
  const startMinutes = SCHEDULE_START_HOUR * 60;
  const endMinutes = SCHEDULE_END_HOUR * 60;
  return minutes >= startMinutes && minutes <= endMinutes;
}

// Format array of days to display string (e.g., "Mon, Wed, Fri")
export function formatDays(days: DayOfWeek[]): string {
  return days
    .map((day) => DAYS_OF_WEEK.find((d) => d.key === day)?.short ?? day)
    .join(', ');
}

// Hour block styling helpers for visual time grouping

/**
 * Check if an hour should have alternating background (even hours)
 * Used to create visual bands across the schedule grid
 * Even hours (8, 10, 12, 14, 16, 18, 20) get gray background
 */
export function isEvenHour(hour: number): boolean {
  return hour % 2 === 0;
}

/**
 * Check if this is a "major" hour that should have stronger visual separation
 * Major hours: 8am, 10am, 12pm, 2pm, 4pm, 6pm (every 2 hours starting at 8)
 * These get thicker border lines for clear visual breaks
 */
export function isMajorHour(hour: number): boolean {
  return hour >= 8 && hour % 2 === 0;
}

/**
 * Get the inline style for hour block background
 * Uses a pronounced alternating pattern for visual clarity:
 * - Even hours (8, 10, 12...) get a visible blue tint
 * - Odd hours (7, 9, 11...) stay white
 * This makes it immediately obvious which courses share the same time block
 */
export function getHourBlockBgStyle(hour: number): React.CSSProperties {
  return {
    backgroundColor: isEvenHour(hour) ? '#DBEAFE' : '#DCFCE7', // blue-100 vs green-100
  };
}

/**
 * Get the inline style for hour block border
 * Major hours get thicker, darker borders for clear visual breaks
 */
export function getHourBlockBorderStyle(hour: number): React.CSSProperties {
  if (isMajorHour(hour)) {
    return {
      borderBottom: '2px solid #93C5FD', // blue-300
    };
  }
  return {
    borderBottom: '1px solid #E5E7EB', // gray-200
  };
}
