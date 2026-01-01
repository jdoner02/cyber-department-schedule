import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Clock, User, MapPin } from 'lucide-react';
import { useScheduleLoading } from '../contexts/ScheduleContext';
import { useFilteredConflicts } from '../contexts/FilterContext';
import { DAYS_OF_WEEK, formatTimeRange } from '../constants/timeSlots';
import {
  getInstructorConflicts,
  getRoomConflicts,
} from '../services/conflictDetector';

export default function Conflicts() {
  const { loading, error } = useScheduleLoading();
  const filteredConflicts = useFilteredConflicts();

  const conflicts = useMemo(() => {
    const dayIndex = Object.fromEntries(DAYS_OF_WEEK.map((d, i) => [d.key, i] as const));
    return [...filteredConflicts].sort((a, b) => {
      const dayDelta = (dayIndex[a.day] ?? 99) - (dayIndex[b.day] ?? 99);
      if (dayDelta !== 0) return dayDelta;
      const timeDelta = a.overlapStart - b.overlapStart;
      if (timeDelta !== 0) return timeDelta;
      return a.type.localeCompare(b.type);
    });
  }, [filteredConflicts]);

  const instructorConflicts = useMemo(() => getInstructorConflicts(conflicts), [conflicts]);
  const roomConflicts = useMemo(() => getRoomConflicts(conflicts), [conflicts]);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conflict Detection</h1>
        <p className="text-gray-600 mt-1">
          Automatically detect scheduling conflicts in the course schedule
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                conflicts.length > 0 ? 'bg-red-100' : 'bg-green-100'
              }`}
            >
              {conflicts.length > 0 ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{conflicts.length}</div>
              <div className="text-sm text-gray-500">Total Conflicts</div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <User className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {instructorConflicts.length}
              </div>
              <div className="text-sm text-gray-500">Instructor Conflicts</div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{roomConflicts.length}</div>
              <div className="text-sm text-gray-500">Room Conflicts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict list */}
      {loading ? (
        <div className="card p-12 text-center">
          <p className="text-gray-600">Loading schedule data...</p>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <p className="text-red-700">{error}</p>
          <p className="text-sm text-gray-500 mt-2">
            Import a schedule JSON file from the header to run conflict detection.
          </p>
        </div>
      ) : conflicts.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Conflicts Detected</h2>
          <p className="text-gray-600">
            All courses are properly scheduled without any time or room conflicts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="card p-4 border-l-4 border-l-red-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      conflict.type === 'instructor' ? 'bg-amber-100' : 'bg-blue-100'
                    }`}
                  >
                    {conflict.type === 'instructor' ? (
                      <User className="w-4 h-4 text-amber-600" />
                    ) : (
                      <MapPin className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {conflict.type === 'instructor' ? 'Instructor Conflict' : 'Room Conflict'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{conflict.description}</p>
                  </div>
                </div>
                <span className="badge badge-conflict">
                  {DAYS_OF_WEEK.find((d) => d.key === conflict.day)?.short}
                </span>
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                {/* Course 1 */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">
                    {conflict.course1.displayCode} - {conflict.course1.section}
                  </div>
                  <div className="text-sm text-gray-600">{conflict.course1.title}</div>
                  <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {formatTimeRange(conflict.overlapStart, conflict.overlapEnd)}
                  </div>
                </div>

                {/* Course 2 */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">
                    {conflict.course2.displayCode} - {conflict.course2.section}
                  </div>
                  <div className="text-sm text-gray-600">{conflict.course2.title}</div>
                  <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {formatTimeRange(conflict.overlapStart, conflict.overlapEnd)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
