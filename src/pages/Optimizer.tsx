/**
 * =============================================================================
 * PAGE: Optimizer
 * =============================================================================
 *
 * PURPOSE: Operations Research tab for generating conflict-free schedule
 * permutations. Allows users to select courses to optimize and view
 * alternative schedules ranked by similarity to the current schedule.
 *
 * FEATURES:
 * - Course selection for optimization
 * - Progress indicator during computation
 * - Ranked list of alternative schedules
 * - Preview mode showing changes highlighted
 *
 * =============================================================================
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Wand2,
  PlayCircle,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Clock,
  MapPin,
  User,
  Building2,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
} from 'lucide-react';
import { useFilteredCourses } from '../contexts/FilterContext';
import type { SchedulePermutation, ScheduleChange } from '../services/scheduleOptimizer';
import { optimizeSchedule, hasConflicts } from '../services/scheduleOptimizer';

export default function Optimizer() {
  // Get filtered courses (already filtered by term and subject from context)
  const filteredCourses = useFilteredCourses();

  // State
  const [selectedCRNs, setSelectedCRNs] = useState<Set<string>>(new Set());
  const [lockedCRNs, setLockedCRNs] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SchedulePermutation[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  // Check for conflicts in selected courses
  const selectedCourses = useMemo(() => {
    return filteredCourses.filter((c) => selectedCRNs.has(c.crn));
  }, [filteredCourses, selectedCRNs]);

  const conflictsExist = useMemo(() => {
    return hasConflicts(selectedCourses);
  }, [selectedCourses]);

  // Toggle course selection
  const toggleCourse = (crn: string) => {
    const newSet = new Set(selectedCRNs);
    if (newSet.has(crn)) {
      newSet.delete(crn);
      // Also remove from locked if deselecting
      if (lockedCRNs.has(crn)) {
        const newLocked = new Set(lockedCRNs);
        newLocked.delete(crn);
        setLockedCRNs(newLocked);
      }
    } else {
      newSet.add(crn);
    }
    setSelectedCRNs(newSet);
  };

  // Toggle course lock (only for selected courses)
  const toggleLock = (crn: string) => {
    if (!selectedCRNs.has(crn)) return;

    const newLocked = new Set(lockedCRNs);
    if (newLocked.has(crn)) {
      newLocked.delete(crn);
    } else {
      newLocked.add(crn);
    }
    setLockedCRNs(newLocked);
  };

  // Select all / deselect all
  const selectAll = () => {
    setSelectedCRNs(new Set(filteredCourses.map((c) => c.crn)));
  };

  const deselectAll = () => {
    setSelectedCRNs(new Set());
    setLockedCRNs(new Set()); // Clear locks when deselecting all
  };

  // Lock all selected / unlock all
  const lockAll = () => {
    setLockedCRNs(new Set(selectedCRNs));
  };

  const unlockAll = () => {
    setLockedCRNs(new Set());
  };

  // Run optimization
  const runOptimization = useCallback(() => {
    if (selectedCourses.length === 0) return;

    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setError(null);
    setElapsed(0);

    const startTime = Date.now();

    // Run optimization (synchronously for now, could use Worker later)
    try {
      const permutations = optimizeSchedule(selectedCourses, {
        maxPermutations: 20,
        maxTimeMs: 30000,
        lockedCRNs: lockedCRNs.size > 0 ? lockedCRNs : undefined,
        onProgress: (p) => setProgress(p),
      });

      setResults(permutations);
      setElapsed(Date.now() - startTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  }, [selectedCourses, lockedCRNs]);

  // Get change type icon
  const getChangeIcon = (type: ScheduleChange['changeType']) => {
    switch (type) {
      case 'time':
        return <Clock className="w-4 h-4" />;
      case 'room':
        return <MapPin className="w-4 h-4" />;
      case 'instructor':
        return <User className="w-4 h-4" />;
      case 'campus':
        return <Building2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Wand2 className="w-7 h-7 text-ewu-red" />
            Schedule Optimizer
          </h1>
          <p className="text-gray-600 mt-1">
            Find conflict-free schedule alternatives with minimal changes
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">How it works</p>
          <p className="mt-1">
            Select courses to optimize. The algorithm will try different time/room combinations
            to eliminate conflicts while minimizing changes from the current schedule.
            Solutions are ranked by similarity - fewer changes means a higher rank.
          </p>
          <p className="mt-2 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" />
            <strong>Lock courses</strong> to keep them fixed - only unlocked courses will be rescheduled.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Course selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                Select Courses ({selectedCRNs.size} of {filteredCourses.length})
                {lockedCRNs.size > 0 && (
                  <span className="ml-2 text-sm font-normal text-amber-600">
                    • {lockedCRNs.size} locked
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={deselectAll}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
              </div>
            </div>
            {selectedCRNs.size > 0 && (
              <div className="mt-2 flex gap-2 text-xs">
                <button
                  onClick={lockAll}
                  className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                >
                  <Lock className="w-3 h-3" />
                  Lock All
                </button>
                <button
                  onClick={unlockAll}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  disabled={lockedCRNs.size === 0}
                >
                  <Unlock className="w-3 h-3" />
                  Unlock All
                </button>
              </div>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
            {filteredCourses.map((course) => (
              <div
                key={course.crn}
                className={`flex items-center gap-3 px-4 py-3 ${
                  lockedCRNs.has(course.crn)
                    ? 'bg-amber-50'
                    : selectedCRNs.has(course.crn)
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCRNs.has(course.crn)}
                    onChange={() => toggleCourse(course.crn)}
                    className="w-4 h-4 text-ewu-red rounded border-gray-300 focus:ring-ewu-red"
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {course.displayCode} - {course.title}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {course.instructor?.displayName || 'TBA'} •{' '}
                    {course.meetings[0]?.location || 'TBA'}
                  </div>
                </div>
                {course.hasConflicts && (
                  <span title="Has conflicts">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </span>
                )}
                {selectedCRNs.has(course.crn) && (
                  <button
                    onClick={() => toggleLock(course.crn)}
                    className={`p-1.5 rounded transition-colors ${
                      lockedCRNs.has(course.crn)
                        ? 'bg-amber-200 text-amber-700 hover:bg-amber-300'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                    }`}
                    title={lockedCRNs.has(course.crn) ? 'Unlock (allow changes)' : 'Lock (keep in place)'}
                  >
                    {lockedCRNs.has(course.crn) ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))}

            {filteredCourses.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No courses available for the selected term/filters.
              </div>
            )}
          </div>
        </div>

        {/* Optimization controls & results */}
        <div className="space-y-4">
          {/* Run button */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Run Optimization</h3>
                <p className="text-sm text-gray-500">
                  {selectedCRNs.size === 0
                    ? 'Select courses to optimize'
                    : conflictsExist
                    ? `Conflicts detected${lockedCRNs.size > 0 ? ` • ${lockedCRNs.size} course${lockedCRNs.size === 1 ? '' : 's'} locked` : ''}`
                    : 'No conflicts in selected courses'}
                </p>
              </div>
              {conflictsExist ? (
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              ) : selectedCRNs.size > 0 ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : null}
            </div>

            <button
              onClick={runOptimization}
              disabled={isRunning || selectedCRNs.size === 0}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                isRunning || selectedCRNs.size === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-ewu-red text-white hover:bg-ewu-red-dark'
              }`}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Optimizing... {progress}%
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
                  Find Alternatives
                </>
              )}
            </button>

            {/* Progress bar */}
            {isRunning && (
              <div className="mt-3">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ewu-red transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Elapsed time */}
            {elapsed > 0 && !isRunning && (
              <p className="mt-2 text-sm text-gray-500 text-center">
                Completed in {(elapsed / 1000).toFixed(2)}s
              </p>
            )}

            {/* Error */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">
                  {results.length} Alternative{results.length !== 1 ? 's' : ''} Found
                </h3>
                <p className="text-sm text-gray-500">
                  Ranked by similarity to current schedule
                </p>
              </div>

              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="px-4 py-3">
                    <button
                      onClick={() =>
                        setExpandedResult(expandedResult === index ? null : index)
                      }
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            result.conflictCount === 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          #{index + 1}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {result.conflictCount === 0
                              ? 'Conflict-free'
                              : `${result.conflictCount} conflict(s)`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.changeCount} change{result.changeCount !== 1 ? 's' : ''} •{' '}
                            {Math.round(result.similarityScore * 100)}% similar
                          </div>
                        </div>
                      </div>
                      {expandedResult === index ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {/* Expanded details */}
                    {expandedResult === index && result.changes.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {result.changes.map((change, changeIndex) => (
                          <div
                            key={changeIndex}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm"
                          >
                            {getChangeIcon(change.changeType)}
                            <span className="font-medium text-gray-700">
                              {change.courseCode}
                            </span>
                            <span className="text-gray-500">{change.changeType}:</span>
                            <span className="text-red-600 line-through">{change.from}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="text-green-600">{change.to}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {expandedResult === index && result.changes.length === 0 && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg text-sm text-gray-500">
                        No changes from current schedule
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results message */}
          {!isRunning && results.length === 0 && elapsed > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">No alternatives found</p>
                <p className="mt-1">
                  The optimizer couldn't find conflict-free alternatives with the available
                  time slots and rooms. Try selecting fewer courses or allowing more flexibility.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
