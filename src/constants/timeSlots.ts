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
