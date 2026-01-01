import { DAYS_OF_WEEK } from '../../constants/timeSlots';
import type { DayOfWeek } from '../../types/schedule';

interface MobileDayTabsProps {
  selectedDay: DayOfWeek;
  onDayChange: (day: DayOfWeek) => void;
  courseCounts?: Record<DayOfWeek, number>;
}

/**
 * Horizontal day tabs for mobile navigation
 * - Touch targets: 44px minimum height
 * - EWU red active state indicator
 * - Shows course count badges per day
 */
export default function MobileDayTabs({
  selectedDay,
  onDayChange,
  courseCounts,
}: MobileDayTabsProps) {
  // Get current day of week for "today" indicator
  const today = new Date().getDay();
  const todayMap: Record<number, DayOfWeek> = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
  };
  const currentDayKey = todayMap[today];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
      {/* Day tabs - horizontal scroll on very small screens */}
      <div className="flex justify-between px-1 sm:px-2">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = selectedDay === day.key;
          const isToday = currentDayKey === day.key;
          const count = courseCounts?.[day.key] ?? 0;

          return (
            <button
              key={day.key}
              onClick={() => onDayChange(day.key)}
              className={`
                relative flex-1 min-h-[48px] py-2 px-1 sm:px-3
                flex flex-col items-center justify-center
                transition-colors duration-150
                touch-target
                ${isSelected
                  ? 'text-ewu-red'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
              aria-pressed={isSelected}
              aria-label={`${day.display}${isToday ? ' (Today)' : ''}, ${count} courses`}
            >
              {/* Day name */}
              <span className={`text-sm font-semibold ${isSelected ? 'text-ewu-red' : ''}`}>
                {day.short}
              </span>

              {/* Course count badge */}
              {count > 0 && (
                <span
                  className={`
                    text-xs mt-0.5 px-1.5 py-0.5 rounded-full
                    ${isSelected
                      ? 'bg-ewu-red text-white'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}
                >
                  {count}
                </span>
              )}

              {/* Today indicator dot */}
              {isToday && !isSelected && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-ewu-red rounded-full" />
              )}

              {/* Active indicator bar */}
              {isSelected && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-ewu-red rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
