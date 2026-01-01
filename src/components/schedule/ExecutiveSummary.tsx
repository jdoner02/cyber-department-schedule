import { useMemo } from 'react';
import { BookOpen, AlertTriangle, Users, TrendingUp, Clock } from 'lucide-react';
import type { Course, DayOfWeek } from '../../types/schedule';
import { DAYS_OF_WEEK, minutesToDisplayTime } from '../../constants/timeSlots';

interface ExecutiveSummaryProps {
  courses: Course[];
}

/**
 * Executive summary cards for at-a-glance metrics
 * - Designed for quick scanning on mobile
 * - Key metrics: courses, conflicts, capacity
 * - "Next up" card for upcoming classes
 */
export default function ExecutiveSummary({ courses }: ExecutiveSummaryProps) {
  // Calculate metrics
  const metrics = useMemo(() => {
    // Total courses being viewed (after filters)
    const totalCourses = courses.length;

    // Courses with conflicts
    const conflictCourses = courses.filter((c) => c.hasConflicts);
    const conflictCount = conflictCourses.length;

    // Enrollment capacity
    let totalEnrollment = 0;
    let totalCapacity = 0;
    courses.forEach((c) => {
      totalEnrollment += c.enrollment.current;
      totalCapacity += c.enrollment.maximum;
    });
    const capacityPercent = totalCapacity > 0
      ? Math.round((totalEnrollment / totalCapacity) * 100)
      : 0;

    // Unique instructors
    const instructors = new Set(
      courses
        .map((c) => c.instructor?.email)
        .filter(Boolean)
    );
    const instructorCount = instructors.size;

    // Available seats
    const availableSeats = courses.reduce((sum, c) => sum + c.enrollment.available, 0);

    return {
      totalCourses,
      conflictCount,
      capacityPercent,
      instructorCount,
      availableSeats,
      conflictCourses,
    };
  }, [courses]);

  // Find "next up" course - the next class today or earliest tomorrow
  const nextUp = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const dayMap: Record<number, DayOfWeek> = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
    };

    // Try to find next class today
    const todayKey = dayMap[currentDay];
    if (todayKey) {
      const todayCourses: { course: Course; meeting: Course['meetings'][0] }[] = [];
      courses.forEach((course) => {
        course.meetings.forEach((meeting) => {
          if (meeting.days.includes(todayKey) && meeting.startMinutes > currentMinutes) {
            todayCourses.push({ course, meeting });
          }
        });
      });

      if (todayCourses.length > 0) {
        todayCourses.sort((a, b) => a.meeting.startMinutes - b.meeting.startMinutes);
        const next = todayCourses[0];
        return {
          course: next.course,
          time: minutesToDisplayTime(next.meeting.startMinutes),
          day: 'Today',
        };
      }
    }

    // Find earliest class in upcoming days
    for (let offset = 1; offset <= 7; offset++) {
      const targetDay = (currentDay + offset) % 7;
      const targetKey = dayMap[targetDay];
      if (!targetKey) continue;

      const targetCourses: { course: Course; meeting: Course['meetings'][0] }[] = [];
      courses.forEach((course) => {
        course.meetings.forEach((meeting) => {
          if (meeting.days.includes(targetKey)) {
            targetCourses.push({ course, meeting });
          }
        });
      });

      if (targetCourses.length > 0) {
        targetCourses.sort((a, b) => a.meeting.startMinutes - b.meeting.startMinutes);
        const next = targetCourses[0];
        const dayDisplay = DAYS_OF_WEEK.find((d) => d.key === targetKey)?.display || targetKey;
        return {
          course: next.course,
          time: minutesToDisplayTime(next.meeting.startMinutes),
          day: dayDisplay,
        };
      }
    }

    return null;
  }, [courses]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Main metrics row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Courses count */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 bg-blue-100 rounded-full">
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {metrics.totalCourses}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Courses
          </div>
        </div>

        {/* Conflicts count */}
        <div className={`bg-white rounded-lg border p-3 sm:p-4 text-center ${
          metrics.conflictCount > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'
        }`}>
          <div className={`flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full ${
            metrics.conflictCount > 0 ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <AlertTriangle className={`w-4 h-4 ${
              metrics.conflictCount > 0 ? 'text-red-600' : 'text-gray-400'
            }`} />
          </div>
          <div className={`text-2xl sm:text-3xl font-bold ${
            metrics.conflictCount > 0 ? 'text-red-600' : 'text-gray-900'
          }`}>
            {metrics.conflictCount}
          </div>
          <div className={`text-xs sm:text-sm mt-0.5 ${
            metrics.conflictCount > 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            Conflicts
          </div>
        </div>

        {/* Capacity percent */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 bg-green-100 rounded-full">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {metrics.capacityPercent}%
          </div>
          <div className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Capacity
          </div>
        </div>
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Instructors */}
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">
              {metrics.instructorCount}
            </div>
            <div className="text-xs text-gray-500">Instructors</div>
          </div>
        </div>

        {/* Available seats */}
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">
              {metrics.availableSeats}
            </div>
            <div className="text-xs text-gray-500">Open Seats</div>
          </div>
        </div>
      </div>

      {/* Next up card */}
      {nextUp && (
        <div className="bg-gradient-to-r from-ewu-red to-ewu-red-dark rounded-lg p-3 sm:p-4 text-white">
          <div className="flex items-center gap-2 text-white/80 text-xs font-medium uppercase tracking-wide mb-1">
            <Clock className="w-3.5 h-3.5" />
            Next Up • {nextUp.day}
          </div>
          <div className="font-semibold text-base sm:text-lg">
            {nextUp.course.displayCode} at {nextUp.time}
          </div>
          <div className="text-sm text-white/90 mt-0.5">
            {nextUp.course.title}
          </div>
        </div>
      )}

      {/* Conflict alert */}
      {metrics.conflictCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-red-800 text-sm">
                Schedule Conflicts Detected
              </div>
              <div className="text-xs text-red-600 mt-1 space-y-0.5">
                {metrics.conflictCourses.slice(0, 2).map((course) => (
                  <div key={course.crn} className="truncate">
                    {course.displayCode}: {course.title}
                  </div>
                ))}
                {metrics.conflictCourses.length > 2 && (
                  <div className="font-medium">
                    +{metrics.conflictCourses.length - 2} more
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
