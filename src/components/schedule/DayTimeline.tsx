import { useMemo } from 'react';
import { Clock, MapPin, User, AlertTriangle, Users } from 'lucide-react';
import type { Course, DayOfWeek } from '../../types/schedule';
import { SUBJECT_COLORS } from '../../constants/colors';
import { minutesToDisplayTime, DAYS_OF_WEEK } from '../../constants/timeSlots';

interface DayTimelineProps {
  courses: Course[];
  selectedDay: DayOfWeek;
  onCourseClick: (course: Course) => void;
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
}: DayTimelineProps) {
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

      {/* Timeline items */}
      {dayCourses.map(({ course, meeting }, index) => {
        const colors = SUBJECT_COLORS[course.subject];
        const enrollmentPercent = course.enrollment.maximum > 0
          ? (course.enrollment.current / course.enrollment.maximum) * 100
          : 0;
        const isFull = course.enrollment.available <= 0;

        return (
          <button
            key={`${course.crn}-${index}`}
            onClick={() => onCourseClick(course)}
            className="w-full text-left bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow touch-target overflow-hidden"
            aria-label={`${course.displayCode}: ${course.title}`}
          >
            {/* Color accent bar at top */}
            <div
              className="h-1.5"
              style={{ backgroundColor: colors.bg }}
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
                {course.hasConflicts && (
                  <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Conflict</span>
                  </div>
                )}
              </div>

              {/* Course title row */}
              <div className="mb-2">
                <h3 className="font-semibold text-gray-900 text-base">
                  {course.displayCode}
                  <span className="font-normal text-gray-500 text-sm ml-2">
                    {course.section}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">
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
                    {course.enrollment.current}/{course.enrollment.maximum}
                  </span>
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isFull ? 'bg-red-500' : enrollmentPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(enrollmentPercent, 100)}%` }}
                  />
                </div>
                {isFull && (
                  <span className="text-xs font-medium text-red-600">FULL</span>
                )}
              </div>

              {/* Delivery method badge */}
              <div className="mt-3 flex items-center gap-2">
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                  ${course.delivery === 'Online' ? 'bg-purple-100 text-purple-700' :
                    course.delivery === 'Hybrid' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'}
                `}>
                  {course.delivery}
                </span>
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
