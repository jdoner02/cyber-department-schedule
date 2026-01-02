import { useMemo, useState } from 'react';
import { useSchedule, useScheduleLoading } from '../contexts/ScheduleContext';
import { useFilteredCourses, useFilteredConflicts, useViewMode } from '../contexts/FilterContext';
import { useEditMode, useDraft } from '../contexts/DraftScheduleContext';
import MobileDayTabs from '../components/schedule/MobileDayTabs';
import DayTimeline from '../components/schedule/DayTimeline';
import CourseDetailModal from '../components/schedule/CourseDetailModal';
import CourseEditModal from '../components/whatif/CourseEditModal';
import ChangesSummary from '../components/whatif/ChangesSummary';
import ConflictAlerts from '../components/executive/ConflictAlerts';
import QuickInsights from '../components/executive/QuickInsights';
import AcademicCalendarCard from '../components/calendar/AcademicCalendarCard';
import { Loader2, Calendar, Eye, Pencil } from 'lucide-react';
import type { Course, DayOfWeek } from '../types/schedule';
import { formatTerm } from '../constants/academicTerms';

/**
 * Priority 1: REAL conflicts (not stacked courses or lab corequisites)
 * Priority 2: Clean day-by-day schedule view
 * Priority 3: At-a-glance metrics
 */
export default function Dashboard() {
  const { loading, error } = useScheduleLoading();
  const { state, availableTerms, selectedTermCode, selectTerm } = useSchedule();
  const filteredCourses = useFilteredCourses();
  const filteredConflicts = useFilteredConflicts();
  const { selectedDay, setSelectedDay } = useViewMode();
  const { isEditMode, toggleEditMode } = useEditMode();
  const { changeCount } = useDraft();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Default to Monday if no day selected
  const currentDay: DayOfWeek = selectedDay || 'monday';

  const displayCourses = filteredCourses;

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
            {state.courses[0]?.termDescription ?? 'Term'}{state.courses[0]?.term ? ` (${state.courses[0].term})` : ''} •{' '}
            {displayCourses.length} sections
            {state.lastUpdated ? ` • Updated ${state.lastUpdated.toLocaleString()}` : ''}
          </p>
          {state.dataSource ? (
            <p className="text-xs text-gray-400 mt-0.5">Source: {state.dataSource}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {availableTerms.length > 0 ? (
            <select
              className="md:hidden input py-1.5 pr-10 text-sm w-[190px]"
              value={selectedTermCode ?? ''}
              onChange={(e) => void selectTerm(e.target.value)}
              disabled={state.loading}
              title="Select term"
            >
              {selectedTermCode === null ? <option value="">Imported file</option> : null}
              {[...availableTerms]
                .sort((a, b) => b.termCode.localeCompare(a.termCode))
                .map((term) => (
                  <option key={term.termCode} value={term.termCode}>
                    {formatTerm(term.termCode)}
                  </option>
                ))}
            </select>
          ) : null}
          {/* Edit Mode Toggle */}
          <button
            onClick={toggleEditMode}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-xl border transition-all touch-target
              ${isEditMode
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
            aria-label={isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
          >
            {isEditMode ? (
              <>
                <Pencil className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Editing</span>
                {changeCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-white text-blue-600 rounded-full">
                    {changeCount}
                  </span>
                )}
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Conflict Alerts - PRIORITY 1 (filtered to match current subject filter) */}
      <ConflictAlerts
        conflicts={filteredConflicts}
        onConflictTap={(conflict) => {
          // Navigate to the day where the conflict occurs
          setSelectedDay(conflict.day);
        }}
      />

      {/* Quick Insights - PRIORITY 3 */}
      <QuickInsights courses={displayCourses} />

      {/* Academic Calendar - key dates and reminders */}
      <AcademicCalendarCard />

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
          stackedPairs={state.stackedPairs}
        />
      </div>

      {/* Changes Summary - only visible in edit mode */}
      {isEditMode && (
        <ChangesSummary
          onCourseClick={(courseId) => {
            const course = displayCourses.find((c) => c.id === courseId);
            if (course) setSelectedCourse(course);
          }}
        />
      )}

      {/* Course modals - show edit modal in edit mode, detail modal otherwise */}
      {selectedCourse && (
        isEditMode ? (
          <CourseEditModal
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
          />
        ) : (
          <CourseDetailModal
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
          />
        )
      )}
    </div>
  );
}
