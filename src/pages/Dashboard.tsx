import { useState } from 'react';
import { useScheduleLoading } from '../contexts/ScheduleContext';
import { useFilteredCourses, usePresets, useFilters } from '../contexts/FilterContext';
import WeeklyGrid from '../components/schedule/WeeklyGrid';
import ScheduleFilters from '../components/schedule/ScheduleFilters';
import ColorLegend from '../components/schedule/ColorLegend';
import ExecutiveSummary from '../components/schedule/ExecutiveSummary';
import { Loader2, Calendar, Bookmark, Plus, X, Save, RotateCcw } from 'lucide-react';

export default function Dashboard() {
  const { loading, error } = useScheduleLoading();
  const filteredCourses = useFilteredCourses();
  const { presets, activePresetId, applyPreset, saveCurrentAsPreset, deletePreset } = usePresets();
  const { dispatch } = useFilters();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      saveCurrentAsPreset(newPresetName.trim());
      setNewPresetName('');
      setShowSaveDialog(false);
    }
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_FILTERS' });
  };

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
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Weekly Schedule</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Viewing {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} • Spring Quarter 2026
        </p>
      </div>

      {/* Executive Summary - More prominent on mobile */}
      <div className="mb-4">
        <ExecutiveSummary courses={filteredCourses} />
      </div>

      {/* Quick Filter Presets */}
      <div className="mb-4 p-3 sm:p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Quick Filters</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors touch-target ${
                activePresetId === preset.id
                  ? 'bg-ewu-red text-white border-ewu-red'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-ewu-red hover:text-ewu-red'
              }`}
            >
              {preset.name}
              {!preset.isBuiltIn && activePresetId === preset.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePreset(preset.id);
                  }}
                  className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  title="Delete preset"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>
          ))}

          {/* Save current as preset button */}
          {!showSaveDialog ? (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 touch-target"
            >
              <Plus className="w-3 h-3" />
              Save Current
            </button>
          ) : (
            <div className="inline-flex items-center gap-2">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset name..."
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-ewu-red focus:border-transparent w-32"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePreset();
                  if (e.key === 'Escape') {
                    setShowSaveDialog(false);
                    setNewPresetName('');
                  }
                }}
              />
              <button
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-full disabled:opacity-50"
                title="Save"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewPresetName('');
                }}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 touch-target ml-auto"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <ScheduleFilters />

      {/* Legend */}
      <div className="mb-4 px-3 sm:px-4 py-3 bg-white rounded-lg border border-gray-200">
        <ColorLegend />
      </div>

      {/* Weekly grid */}
      {filteredCourses.length > 0 ? (
        <WeeklyGrid />
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 sm:p-12 text-center">
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
