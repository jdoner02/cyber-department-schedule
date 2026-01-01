import { useMemo, useState } from 'react';
import { useScheduleLoading, useCourses } from '../contexts/ScheduleContext';
import { useFilteredCourses, useViewMode } from '../contexts/FilterContext';
import MobileDayTabs from '../components/schedule/MobileDayTabs';
import DayTimeline from '../components/schedule/DayTimeline';
import CourseDetailModal from '../components/schedule/CourseDetailModal';
import ConflictAlerts from '../components/executive/ConflictAlerts';
import QuickInsights from '../components/executive/QuickInsights';
import { detectAllConflicts, markCoursesWithConflicts } from '../services/conflictDetector';
import { findStackedPairs, isStackedVersion } from '../services/stackedCourseDetector';
import { Loader2, Calendar, Settings, Filter } from 'lucide-react';
import type { Course, DayOfWeek } from '../types/schedule';

/**
 * Executive Dashboard - Apple-quality design
 *
 * Priority 1: REAL conflicts (not stacked courses or lab corequisites)
 * Priority 2: Clean day-by-day schedule view
 * Priority 3: At-a-glance metrics
 */
export default function Dashboard() {
  const { loading, error } = useScheduleLoading();
  const allCourses = useCourses();
  const filteredCourses = useFilteredCourses();
  const { selectedDay, setSelectedDay } = useViewMode();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Default to Monday if no day selected
  const currentDay: DayOfWeek = selectedDay || 'monday';

  // Detect REAL conflicts (filtering out stacked courses and lab corequisites)
  const { realConflicts, stackedPairs, coursesWithConflictMarks } = useMemo(() => {
    // Find stacked course pairs first
    const stacked = findStackedPairs(allCourses);

    // Detect conflicts with smart filtering
    const conflicts = detectAllConflicts(allCourses, {
      hideStackedCourses: true,
      hideLabCorequisites: true,
    });

    // Mark courses with conflicts for visual indication
    const marked = markCoursesWithConflicts(allCourses, conflicts);

    return {
      realConflicts: conflicts,
      stackedPairs: stacked,
      coursesWithConflictMarks: marked,
    };
  }, [allCourses]);

  // Filter courses and exclude stacked 500-level versions (show only base 400-level)
  const displayCourses = useMemo(() => {
    // Start with filtered courses
    let courses = filteredCourses;

    // Apply conflict marks
    courses = courses.map(course => {
      const marked = coursesWithConflictMarks.find(c => c.id === course.id);
      return marked ? { ...course, hasConflicts: marked.hasConflicts } : course;
    });

    // Filter out stacked 500-level courses (keep the 400-level base)
    courses = courses.filter(course => !isStackedVersion(course, stackedPairs));

    return courses;
  }, [filteredCourses, coursesWithConflictMarks, stackedPairs]);

  // Calculate course counts per day for mobile tabs
  const courseCounts = useMemo(() => {
    const counts: Record<DayOfWeek, number> = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
    };

    displayCourses.forEach((course) => {
      course.meetings.forEach((meeting) => {
        meeting.days.forEach((day) => {
          counts[day]++;
        });
      });
    });

    return counts;
  }, [displayCourses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ewu-red mx-auto mb-4" />
          <p className="text-gray-600">Loading schedule data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <div className="text-red-600 mb-4">
          <Calendar className="w-12 h-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-red-800 mb-2">Unable to Load Schedule</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <p className="text-sm text-red-500">
          Please import a schedule JSON file using the Import button in the header.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page header - minimal */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Schedule Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Spring Quarter 2026 • {displayCourses.length} sections
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            p-2.5 rounded-xl border transition-colors touch-target
            ${showFilters
              ? 'bg-ewu-red text-white border-ewu-red'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }
          `}
          aria-label="Toggle filters"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Filters panel - collapsible */}
      {showFilters && (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          <p className="text-sm text-gray-500">
            Use the sidebar navigation to access detailed filters and settings.
          </p>
        </div>
      )}

      {/* Conflict Alerts - PRIORITY 1 */}
      <ConflictAlerts
        conflicts={realConflicts}
        onConflictTap={(conflict) => {
          // Could navigate to the conflict or expand details
          console.log('Conflict tapped:', conflict);
        }}
      />

      {/* Quick Insights - PRIORITY 3 */}
      <QuickInsights courses={displayCourses} />

      {/* Day Schedule - PRIORITY 2 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Day tabs */}
        <MobileDayTabs
          selectedDay={currentDay}
          onDayChange={setSelectedDay}
          courseCounts={courseCounts}
        />

        {/* Day timeline */}
        <DayTimeline
          courses={displayCourses}
          selectedDay={currentDay}
          onCourseClick={setSelectedCourse}
          stackedPairs={stackedPairs}
        />
      </div>

      {/* Course detail modal */}
      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  );
}
