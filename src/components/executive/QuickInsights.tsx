import { useMemo } from 'react';
import { Users, TrendingUp, AlertCircle, BookOpen, Clock, GraduationCap } from 'lucide-react';
import type { Course } from '../../types/schedule';
import { useAcademicCalendarEvents } from '../../contexts/AcademicCalendarContext';
import { findRegistrationOpensEvent } from '../../services/academicCalendar';

interface QuickInsightsProps {
  courses: Course[];
}

interface InstructorWorkload {
  name: string;
  email: string;
  sectionCount: number;
  totalStudents: number;
}

/**
 * Executive-focused quick insights component
 * Apple-quality design with key metrics at a glance
 */
export default function QuickInsights({ courses }: QuickInsightsProps) {
  const calendarEvents = useAcademicCalendarEvents();

  const termCode = courses[0]?.term ?? null;

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

  // Calculate all metrics
  const metrics = useMemo(() => {
    const hasAnyEnrollment = courses.some((c) => c.enrollment.current > 0);

    // Total enrollment stats
    const totalEnrolled = courses.reduce((sum, c) => sum + c.enrollment.current, 0);
    const totalCapacity = courses.reduce((sum, c) => sum + c.enrollment.maximum, 0);
    const capacityPercent = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

    // Full courses (at or over capacity)
    const fullCourses = courses.filter(c => c.enrollment.available <= 0);

    // Low enrollment courses (under 50% capacity)
    const lowEnrollmentCourses = courses.filter(
      c => c.enrollment.maximum > 0 && c.enrollment.utilizationPercent < 50
    );

    // Instructor workloads
    const workloadMap = new Map<string, InstructorWorkload>();
    courses.forEach(course => {
      if (course.instructor) {
        const key = course.instructor.email;
        const existing = workloadMap.get(key);
        if (existing) {
          existing.sectionCount++;
          existing.totalStudents += course.enrollment.current;
        } else {
          workloadMap.set(key, {
            name: course.instructor.displayName,
            email: course.instructor.email,
            sectionCount: 1,
            totalStudents: course.enrollment.current,
          });
        }
      }
    });

    // Sort by section count to find busiest
    const instructorWorkloads = Array.from(workloadMap.values())
      .sort((a, b) => b.sectionCount - a.sectionCount);

    const busiestInstructor = instructorWorkloads[0] || null;

    // Subject distribution
    const subjectCounts = {
      CSCD: courses.filter(c => c.subject === 'CSCD').length,
      CYBR: courses.filter(c => c.subject === 'CYBR').length,
      MATH: courses.filter(c => c.subject === 'MATH').length,
    };

    // Online vs In-Person
    const onlineCourses = courses.filter(c => c.delivery === 'Online').length;
    const f2fCourses = courses.filter(c => c.delivery === 'F2F').length;

    return {
      totalCourses: courses.length,
      totalEnrolled,
      totalCapacity,
      capacityPercent,
      hasAnyEnrollment,
      fullCourses,
      lowEnrollmentCourses,
      busiestInstructor,
      instructorCount: workloadMap.size,
      subjectCounts,
      onlineCourses,
      f2fCourses,
    };
  }, [courses]);

  const hideEnrollmentMetrics = metrics.totalCourses > 0 && !metrics.hasAnyEnrollment && isBeforeRegistration;

  return (
    <div className="space-y-4">
      {hideEnrollmentMetrics && registrationDateLabel && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="text-sm text-blue-800">
            <strong>Enrollment not expected yet:</strong> Registration opens {registrationDateLabel}. Until then, Banner
            typically publishes seat capacity before enrollment counts.
          </div>
        </div>
      )}

      {/* Primary metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Sections */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.totalCourses}</div>
          <div className="text-sm text-gray-500">Sections</div>
        </div>

        {/* Overall Capacity */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {hideEnrollmentMetrics ? <span className="text-gray-400">—</span> : `${metrics.capacityPercent}%`}
          </div>
          <div className="text-sm text-gray-500">Seat Fill</div>
        </div>

        {/* Faculty Count */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.instructorCount}</div>
          <div className="text-sm text-gray-500">Faculty</div>
        </div>

        {/* Students Enrolled */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {hideEnrollmentMetrics ? <span className="text-gray-400">—</span> : metrics.totalEnrolled}
          </div>
          <div className="text-sm text-gray-500">Seats Filled</div>
        </div>
      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Full Courses Alert */}
        {metrics.fullCourses.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-amber-800">
                  {metrics.fullCourses.length} Course{metrics.fullCourses.length !== 1 ? 's' : ''} at Capacity
                </div>
                <div className="text-sm text-amber-600 truncate">
                  {metrics.fullCourses.slice(0, 3).map(c => c.displayCode).join(', ')}
                  {metrics.fullCourses.length > 3 && ` +${metrics.fullCourses.length - 3} more`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Busiest Instructor */}
        {metrics.busiestInstructor && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800">
                  Busiest: {metrics.busiestInstructor.name}
                </div>
                <div className="text-sm text-gray-500">
                  {metrics.busiestInstructor.sectionCount} sections • {metrics.busiestInstructor.totalStudents} students
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subject breakdown - compact pills */}
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          CSCD: {metrics.subjectCounts.CSCD}
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium">
          <span className="w-2 h-2 bg-ewu-red rounded-full"></span>
          CYBR: {metrics.subjectCounts.CYBR}
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          MATH: {metrics.subjectCounts.MATH}
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm">
          {metrics.onlineCourses} online • {metrics.f2fCourses} in-person
        </div>
      </div>
    </div>
  );
}
