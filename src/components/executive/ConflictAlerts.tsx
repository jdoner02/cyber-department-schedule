import { useState } from 'react';
import { AlertTriangle, ChevronRight, CheckCircle, Clock, MapPin, User } from 'lucide-react';
import type { Conflict } from '../../services/conflictDetector';
import { minutesToDisplayTime, DAYS_OF_WEEK } from '../../constants/timeSlots';

interface ConflictAlertsProps {
  conflicts: Conflict[];
  onConflictTap?: (conflict: Conflict) => void;
}

/**
 * Executive-focused conflict alerts component
 * Shows ONLY real conflicts (after filtering stacked courses & lab corequisites)
 * Apple-quality design with tap-to-expand details
 */
export default function ConflictAlerts({ conflicts, onConflictTap }: ConflictAlertsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // No conflicts = show success state
  if (conflicts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-green-800">No Scheduling Conflicts</h2>
            <p className="text-sm text-green-600">All courses are properly scheduled</p>
          </div>
        </div>
      </div>
    );
  }

  // Group conflicts by type
  const instructorConflicts = conflicts.filter(c => c.type === 'instructor');
  const roomConflicts = conflicts.filter(c => c.type === 'room');

  return (
    <div className="space-y-3">
      {/* Alert header */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-red-800">
              {conflicts.length} Scheduling Conflict{conflicts.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-red-600">
              {instructorConflicts.length > 0 && `${instructorConflicts.length} instructor`}
              {instructorConflicts.length > 0 && roomConflicts.length > 0 && ', '}
              {roomConflicts.length > 0 && `${roomConflicts.length} room`}
            </p>
          </div>
        </div>

        {/* Conflict cards */}
        <div className="space-y-2">
          {conflicts.map((conflict) => {
            const isExpanded = expandedId === conflict.id;
            const dayDisplay = DAYS_OF_WEEK.find(d => d.key === conflict.day)?.display || conflict.day;

            return (
              <button
                key={conflict.id}
                onClick={() => {
                  setExpandedId(isExpanded ? null : conflict.id);
                  onConflictTap?.(conflict);
                }}
                className={`
                  w-full text-left bg-white rounded-xl p-3 sm:p-4
                  border transition-all touch-target
                  ${isExpanded ? 'border-red-300 shadow-sm' : 'border-red-100 hover:border-red-200'}
                `}
              >
                {/* Main row */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {conflict.type === 'instructor' ? (
                        <User className="w-4 h-4 text-red-500 flex-shrink-0" />
                      ) : (
                        <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="font-medium text-gray-900 truncate">
                        {conflict.type === 'instructor'
                          ? conflict.course1.instructor?.displayName
                          : `${conflict.course1.meetings[0]?.building} ${conflict.course1.meetings[0]?.room}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {dayDisplay} {minutesToDisplayTime(conflict.overlapStart)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="space-y-2">
                      {/* Course 1 */}
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="font-medium text-gray-900">
                          {conflict.course1.displayCode}
                        </div>
                        <div className="text-sm text-gray-600">
                          {conflict.course1.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {minutesToDisplayTime(conflict.course1.meetings[0]?.startMinutes || 0)} - {' '}
                          {minutesToDisplayTime(conflict.course1.meetings[0]?.endMinutes || 0)}
                        </div>
                      </div>

                      {/* Conflict indicator */}
                      <div className="flex items-center justify-center">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        </div>
                      </div>

                      {/* Course 2 */}
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="font-medium text-gray-900">
                          {conflict.course2.displayCode}
                        </div>
                        <div className="text-sm text-gray-600">
                          {conflict.course2.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {minutesToDisplayTime(conflict.course2.meetings[0]?.startMinutes || 0)} - {' '}
                          {minutesToDisplayTime(conflict.course2.meetings[0]?.endMinutes || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Resolution hint */}
                    <p className="text-xs text-gray-500 mt-3 italic">
                      {conflict.type === 'instructor'
                        ? 'Consider rescheduling one course to a different time slot'
                        : 'Consider moving one course to a different room'
                      }
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
