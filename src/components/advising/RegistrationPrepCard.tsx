import { useMemo } from 'react';
import { CalendarClock, ClipboardList } from 'lucide-react';
import type { StudentPersona } from '../../types/advising';
import { usePersonas } from '../../contexts/StudentContext';
import { useAcademicCalendarEvents } from '../../contexts/AcademicCalendarContext';
import {
  findRegistrationDateForEarnedCredits,
  getPriorityRegistrationWindowsForTerm,
} from '../../services/academicCalendar';
import { formatTerm, getCurrentTerm, getNextTerm } from '../../constants/academicTerms';

function calculateEarnedCredits(persona: StudentPersona): number {
  return persona.completedCourses.reduce((sum, course) => {
    if (!course.grade) return sum;
    if (['W', 'NP', 'F', 'IP', 'I'].includes(course.grade)) return sum;
    return sum + course.credits;
  }, 0);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function RegistrationPrepCard() {
  const personas = usePersonas();
  const calendarEvents = useAcademicCalendarEvents();

  const nextTerm = getNextTerm(getCurrentTerm());

  const windows = useMemo(
    () => getPriorityRegistrationWindowsForTerm(calendarEvents, nextTerm),
    [calendarEvents, nextTerm]
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    []
  );

  const rows = useMemo(() => {
    const now = new Date();
    return personas
      .map((persona) => {
        const earnedCredits = calculateEarnedCredits(persona);
        const window = findRegistrationDateForEarnedCredits({ windows, earnedCredits });
        const registrationDate = window ? new Date(window.event.startDate) : null;
        const reviewBy = registrationDate ? addDays(registrationDate, -7) : null;

        const isDueSoon =
          reviewBy && registrationDate
            ? now.getTime() >= reviewBy.getTime() && now.getTime() < registrationDate.getTime()
            : false;

        return {
          persona,
          earnedCredits,
          window,
          registrationDate,
          reviewBy,
          isDueSoon,
        };
      })
      .sort((a, b) => {
        if (a.registrationDate && b.registrationDate) return a.registrationDate.getTime() - b.registrationDate.getTime();
        if (a.registrationDate) return -1;
        if (b.registrationDate) return 1;
        return b.earnedCredits - a.earnedCredits;
      });
  }, [personas, windows]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <CalendarClock className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Registration Prep</h2>
            <p className="text-sm text-gray-600">
              Upcoming priority registration windows for <strong>{formatTerm(nextTerm)}</strong> (based on earned credits)
            </p>
          </div>
        </div>
      </div>

      <div className="card-body space-y-4">
        {personas.length === 0 ? (
          <div className="text-sm text-gray-600">
            Create a persona to see personalized registration prep dates and reminders.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Persona
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Earned Credits
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Window
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Review By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map(({ persona, earnedCredits, window, registrationDate, reviewBy, isDueSoon }) => (
                  <tr key={persona.id} className={isDueSoon ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{persona.icon}</span>
                        <span className="font-medium text-gray-900">{persona.nickname}</span>
                        {isDueSoon && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Due soon
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">{earnedCredits}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {window && registrationDate ? (
                        <div className="space-y-0.5">
                          <div className="font-medium">{dateFormatter.format(registrationDate)}</div>
                          <div className="text-xs text-gray-500">{window.event.title}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not found in feed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {reviewBy ? (
                        <span className="font-medium">{dateFormatter.format(reviewBy)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-4 h-4 text-gray-700" />
            </div>
            <div className="text-sm text-gray-700">
              <div className="font-medium text-gray-900 mb-1">Advising checklist (suggested)</div>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Watch for cross-campus days (Cheney + Spokane U-District) and allow travel time.</li>
                <li>Avoid back-to-back classes in far buildings (e.g., Kingston ↔ CEB) when possible.</li>
                <li>Balance difficult courses across quarters to reduce overload.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
