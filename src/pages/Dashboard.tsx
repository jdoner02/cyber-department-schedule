import { useScheduleLoading } from '../contexts/ScheduleContext';
import { useFilteredCourses } from '../contexts/FilterContext';
import WeeklyGrid from '../components/schedule/WeeklyGrid';
import ScheduleFilters from '../components/schedule/ScheduleFilters';
import ColorLegend from '../components/schedule/ColorLegend';
import { Loader2, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { loading, error } = useScheduleLoading();
  const filteredCourses = useFilteredCourses();

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
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
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
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Schedule</h1>
        <p className="text-gray-600 mt-1">
          Viewing {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} • Spring Quarter 2026
        </p>
      </div>

      {/* Filters */}
      <ScheduleFilters />

      {/* Legend */}
      <div className="mb-4 px-4 py-3 bg-white rounded-lg border border-gray-200">
        <ColorLegend />
      </div>

      {/* Weekly grid */}
      {filteredCourses.length > 0 ? (
        <WeeklyGrid />
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Courses Match Filters</h3>
          <p className="text-gray-500">
            Try adjusting your filters to see more courses.
          </p>
        </div>
      )}
    </div>
  );
}
