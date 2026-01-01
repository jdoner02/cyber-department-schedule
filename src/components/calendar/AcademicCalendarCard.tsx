import { useMemo, useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { useAcademicCalendar } from '../../contexts/AcademicCalendarContext';
import { useSchedule } from '../../contexts/ScheduleContext';
import { compareTerms, formatTerm, getCurrentTerm, getNextTerm } from '../../constants/academicTerms';
import { getEventsForTimeframe, type AcademicCalendarTimeframe } from '../../services/academicCalendar';

const TIMEFRAME_LABELS: Record<AcademicCalendarTimeframe, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: 'This Week',
  month: 'This Month',
  term: 'This Quarter',
};

export default function AcademicCalendarCard() {
  const { state: calendarState, refresh } = useAcademicCalendar();
  const { state: scheduleState } = useSchedule();
  const [timeframe, setTimeframe] = useState<AcademicCalendarTimeframe>('today');

  const currentTerm = getCurrentTerm();
  const nextTerm = getNextTerm(currentTerm);
  const scheduleTerm = scheduleState.courses[0]?.term ?? null;

  const focusedTerm = useMemo(() => {
    if (!scheduleTerm) return currentTerm;
    const isCurrentOrNext =
      compareTerms(scheduleTerm, currentTerm) >= 0 && compareTerms(scheduleTerm, nextTerm) <= 0;
    return isCurrentOrNext ? scheduleTerm : currentTerm;
  }, [currentTerm, nextTerm, scheduleTerm]);

  const events = useMemo(() => {
    const now = new Date();
    const raw = getEventsForTimeframe({
      events: calendarState.events,
      now,
      timeframe,
      focusedTermCode: focusedTerm,
    });

    // For "This Quarter", show what's coming up next to avoid overwhelming lists.
    if (timeframe === 'term') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return raw.filter((e) => new Date(e.startDate).getTime() >= startOfToday.getTime()).slice(0, 12);
    }

    return raw.slice(0, 12);
  }, [calendarState.events, focusedTerm, timeframe]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    []
  );

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Academic Calendar</h2>
              <p className="text-sm text-gray-500">
                Focus: {formatTerm(focusedTerm)} • {TIMEFRAME_LABELS[timeframe]}
              </p>
              {calendarState.lastBuildDate && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Feed updated {calendarState.lastBuildDate}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => void refresh()}
            className="btn btn-ghost btn-sm"
            title="Refresh academic calendar"
            disabled={calendarState.loading}
          >
            <RefreshCw className={`w-4 h-4 ${calendarState.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(TIMEFRAME_LABELS) as AcademicCalendarTimeframe[]).map((key) => (
            <button
              key={key}
              onClick={() => setTimeframe(key)}
              className={
                key === timeframe
                  ? 'px-3 py-1.5 rounded-full text-sm font-medium bg-ewu-red text-white'
                  : 'px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            >
              {TIMEFRAME_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="card-body">
        {calendarState.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {calendarState.error}
          </div>
        )}

        {!calendarState.error && events.length === 0 && (
          <div className="text-sm text-gray-500">
            No academic calendar events found for this timeframe.
          </div>
        )}

        {!calendarState.error && events.length > 0 && (
          <div className="space-y-3">
            {events.map((event) => (
              <a
                key={event.id}
                href={event.link ?? undefined}
                target={event.link ? '_blank' : undefined}
                rel={event.link ? 'noopener noreferrer' : undefined}
                className={`block rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:bg-gray-50 transition-colors ${
                  event.link ? '' : 'cursor-default'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{event.title}</div>
                    <div className="text-sm text-gray-600 truncate">
                      {event.category ?? 'Academic event'}
                      {event.termLabel ? ` • ${event.termLabel}` : ''}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 flex-shrink-0">
                    {dateFormatter.format(new Date(event.startDate))}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
