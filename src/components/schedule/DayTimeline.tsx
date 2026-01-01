import { useMemo } from 'react';
import { Clock, MapPin, User, AlertTriangle, Users, Layers, Info, X, Pencil, Trash2, Undo2 } from 'lucide-react';
import type { Course, DayOfWeek } from '../../types/schedule';
import type { StackedCourseInfo } from '../../services/stackedCourseDetector';
import { SUBJECT_COLORS } from '../../constants/colors';
import { minutesToDisplayTime, DAYS_OF_WEEK } from '../../constants/timeSlots';
import { useAcademicCalendarEvents } from '../../contexts/AcademicCalendarContext';
import { findRegistrationOpensEvent } from '../../services/academicCalendar';
import { useEditMode, useDraft, useDraftActions } from '../../contexts/DraftScheduleContext';

interface DayTimelineProps {
  courses: Course[];
  selectedDay: DayOfWeek;
  onCourseClick: (course: Course) => void;
  stackedPairs?: Map<string, StackedCourseInfo>;
}

interface TimelineCourse {
  course: Course;
  meeting: Course['meetings'][0];
  startMinutes: number;
  endMinutes: number;
}

/**
 * Mobile-friendly vertical timeline for a single day
 * - Large touch-friendly course cards
 * - Enrollment capacity bar visualization
 * - Conflict indicators inline
 */
export default function DayTimeline({
  courses,
  selectedDay,
  onCourseClick,
  stackedPairs,
}: DayTimelineProps) {
  const calendarEvents = useAcademicCalendarEvents();
  const { isEditMode } = useEditMode();
  const { getCourseState } = useDraft();
  const { cancelCourse, restoreCourse } = useDraftActions();

  // Get courses for selected day, sorted by start time
  const dayCourses = useMemo(() => {
    const result: TimelineCourse[] = [];

    courses.forEach((course) => {
      course.meetings.forEach((meeting) => {
        if (meeting.days.includes(selectedDay)) {
          result.push({
            course,
            meeting,
            startMinutes: meeting.startMinutes,
            endMinutes: meeting.endMinutes,
          });
        }
      });
    });

    // Sort by start time
    return result.sort((a, b) => a.startMinutes - b.startMinutes);
  }, [courses, selectedDay]);

  // Get day display name
  const dayDisplay = DAYS_OF_WEEK.find((d) => d.key === selectedDay)?.display || selectedDay;

  const termCode = courses[0]?.term ?? null;
  const hasAnyEnrollment = courses.some((c) => c.enrollment.current > 0);

  const registrationInfo = useMemo(() => {
    if (!termCode) return null;
    const event = findRegistrationOpensEvent(calendarEvents, termCode);
    if (!event) return null;
    const date = new Date(event.startDate);
    if (Number.isNaN(date.getTime())) return null;
    return { event, date };
  }, [calendarEvents, termCode]);

  const registrationDateLabel = useMemo(() => {
    if (!registrationInfo) return null;
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(registrationInfo.date);
  }, [registrationInfo]);

  const isBeforeRegistration = useMemo(() => {
    if (!registrationInfo) return false;
    return new Date().getTime() < registrationInfo.date.getTime();
  }, [registrationInfo]);

  const hideEnrollmentMetrics = courses.length > 0 && !hasAnyEnrollment && isBeforeRegistration && registrationDateLabel !== null;

  if (dayCourses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-1">No Classes on {dayDisplay}</h3>
        <p className="text-sm text-gray-500">
          Try selecting a different day or adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-3 px-2 sm:px-4">
      {/* Day summary header */}
      <div className="flex items-center justify-between px-2 py-2 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">{dayDisplay}</span>
        <span className="text-sm text-gray-500">
          {dayCourses.length} class{dayCourses.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {hideEnrollmentMetrics && registrationDateLabel && (
        <div className="px-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              Enrollment counts will appear after registration opens <strong>{registrationDateLabel}</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Timeline items */}
      {dayCourses.map(({ course, meeting }, index) => {
        const colors = SUBJECT_COLORS[course.subject];
        const enrollmentPercent = course.enrollment.maximum > 0
          ? (course.enrollment.current / course.enrollment.maximum) * 100
          : 0;
        const isFull = course.enrollment.available <= 0;

        // Check if this is a base course with a stacked pair
        const stackedInfo = stackedPairs?.get(course.crn);

        // Get draft state for this course
        const draftState = isEditMode ? getCourseState(course.id) : 'live';
        const isModified = draftState === 'modified';
        const isCancelled = draftState === 'cancelled';
        const isAdded = draftState === 'added';

        // Compute styles based on draft state
        const cardClasses = [
          'w-full text-left bg-white rounded-lg shadow-sm hover:shadow-md transition-all touch-target overflow-hidden',
          isCancelled ? 'opacity-50' : '',
          isModified ? 'border-2 border-dashed border-blue-400' : '',
          isCancelled ? 'border-2 border-dashed border-red-400' : '',
          isAdded ? 'border-2 border-dashed border-green-400' : '',
          !isModified && !isCancelled && !isAdded ? 'border border-gray-200' : '',
        ].filter(Boolean).join(' ');

        return (
          <button
            key={`${course.crn}-${index}`}
            onClick={() => onCourseClick(course)}
            className={cardClasses}
            aria-label={`${course.displayCode}: ${course.title}`}
          >
            {/* Color accent bar at top */}
            <div
              className="h-1.5"
              style={{ backgroundColor: isCancelled ? '#9CA3AF' : colors.bg }}
            />

            <div className="p-3 sm:p-4">
              {/* Time and conflict indicator row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">
                    {minutesToDisplayTime(meeting.startMinutes)} - {minutesToDisplayTime(meeting.endMinutes)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {course.hasConflicts && (
                    <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Conflict</span>
                    </div>
                  )}
                  {/* Quick actions in edit mode */}
                  {isEditMode && (
                    <div className="flex items-center gap-1">
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCourseClick(course);
                        }}
                        className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="Edit course"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </span>
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCancelled) {
                            restoreCourse(course.id);
                          } else {
                            cancelCourse(course.id);
                          }
                        }}
                        className={`p-1.5 rounded-md transition-colors ${
                          isCancelled
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                        title={isCancelled ? 'Restore course' : 'Cancel course'}
                      >
                        {isCancelled ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Course title row */}
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold text-base ${isCancelled ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {course.displayCode}
                    <span className="font-normal text-gray-500 text-sm ml-2">
                      {course.section}
                    </span>
                  </h3>
                  {/* Draft state badges */}
                  {isModified && (
                    <span className="px-1.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded">
                      MODIFIED
                    </span>
                  )}
                  {isCancelled && (
                    <span className="px-1.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded flex items-center gap-0.5">
                      <X className="w-3 h-3" />
                      CANCELLED
                    </span>
                  )}
                  {isAdded && (
                    <span className="px-1.5 py-0.5 text-xs font-bold bg-green-100 text-green-700 rounded">
                      NEW
                    </span>
                  )}
                </div>
                <p className={`text-sm line-clamp-1 mt-0.5 ${isCancelled ? 'text-gray-400' : 'text-gray-600'}`}>
                  {course.title}
                </p>
              </div>

              {/* Instructor and location row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                {course.instructor && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>{course.instructor.displayName}</span>
                  </div>
                )}
                {meeting.location !== 'TBA' && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{meeting.location}</span>
                  </div>
                )}
              </div>

              {/* Enrollment bar */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {hideEnrollmentMetrics ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      course.enrollment.current
                    )}
                    /{course.enrollment.maximum}
                  </span>
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      hideEnrollmentMetrics
                        ? 'bg-gray-300'
                        : isFull
                          ? 'bg-red-500'
                          : enrollmentPercent > 80
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(hideEnrollmentMetrics ? 0 : enrollmentPercent, 100)}%` }}
                  />
                </div>
                {isFull && !hideEnrollmentMetrics && (
                  <span className="text-xs font-medium text-red-600">FULL</span>
                )}
              </div>

              {/* Delivery method badge and stacked course indicator */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                  ${course.delivery === 'Online' ? 'bg-purple-100 text-purple-700' :
                    course.delivery === 'Hybrid' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'}
                `}>
                  {course.delivery}
                </span>

                {/* Stacked course badge */}
                {stackedInfo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                    <Layers className="w-3 h-3" />
                    Stacked: {stackedInfo.stackedCourse.displayCode}
                    {stackedInfo.enrollmentDiff !== 0 && (
                      <span className="text-indigo-500">
                        ({stackedInfo.enrollmentDiff > 0 ? '+' : ''}{stackedInfo.enrollmentDiff})
                      </span>
                    )}
                  </span>
                )}

                <span className="text-xs text-gray-400">
                  CRN: {course.crn}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
