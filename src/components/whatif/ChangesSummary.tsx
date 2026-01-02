import { useMemo } from 'react';
import { X, Undo2, Pencil, Plus, Download } from 'lucide-react';
import { useDraft, useDraftActions } from '../../contexts/DraftScheduleContext';
import { useCourses } from '../../contexts/ScheduleContext';
import { downloadJson } from '../../utils/download';

interface ChangesSummaryProps {
  onCourseClick?: (courseId: string) => void;
}

export default function ChangesSummary({ onCourseClick }: ChangesSummaryProps) {
  const courses = useCourses();
  const { state, changeCount, hasChanges } = useDraft();
  const { resetAll, revertCourse, restoreCourse, removeAddedCourse } = useDraftActions();

  // Build a summary of all changes
  const changesSummary = useMemo(() => {
    const changes: Array<{
      id: string;
      type: 'modified' | 'cancelled' | 'added';
      courseCode: string;
      description: string;
    }> = [];

    // Get cancelled courses
    state.cancelledIds.forEach((courseId) => {
      const course = courses.find((c) => c.id === courseId);
      if (course) {
        changes.push({
          id: courseId,
          type: 'cancelled',
          courseCode: `${course.displayCode}-${course.section}`,
          description: course.instructor?.displayName ?? 'Staff',
        });
      }
    });

    // Get modified courses
    state.modifications.forEach((mod, courseId) => {
      // Don't show if also cancelled
      if (state.cancelledIds.has(courseId)) return;

      const course = courses.find((c) => c.id === courseId);
      if (course) {
        const changesDesc: string[] = [];
        if (mod.changes.instructor !== undefined) {
          const newName = mod.changes.instructor?.displayName ?? 'Staff';
          changesDesc.push(`→ ${newName}`);
        }
        if (mod.changes.campus !== undefined) {
          changesDesc.push(`→ ${mod.changes.campus}`);
        }
        if (mod.changes.meetings !== undefined) {
          changesDesc.push('time changed');
        }

        changes.push({
          id: courseId,
          type: 'modified',
          courseCode: `${course.displayCode}-${course.section}`,
          description: changesDesc.join(', ') || 'modified',
        });
      }
    });

    // Get added courses
    state.addedCourses.forEach((course) => {
      changes.push({
        id: course.id,
        type: 'added',
        courseCode: `${course.displayCode}-${course.section}`,
        description: course.instructor?.displayName ?? 'New section',
      });
    });

    return changes;
  }, [courses, state.cancelledIds, state.modifications, state.addedCourses]);

  if (!hasChanges) {
    return null;
  }

  const handleUndoChange = (change: typeof changesSummary[0]) => {
    switch (change.type) {
      case 'cancelled':
        restoreCourse(change.id);
        break;
      case 'modified':
        revertCourse(change.id);
        break;
      case 'added':
        removeAddedCourse(change.id);
        break;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">Changes</span>
          <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
            {changeCount}
          </span>
        </div>
        <button
          onClick={resetAll}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
          title="Reset all changes"
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Changes list */}
      <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
        {changesSummary.map((change) => (
          <div
            key={change.id}
            className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"
            onClick={() => onCourseClick?.(change.id)}
          >
            {/* Icon based on change type */}
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                change.type === 'cancelled'
                  ? 'bg-red-100 text-red-600'
                  : change.type === 'modified'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-green-100 text-green-600'
              }`}
            >
              {change.type === 'cancelled' ? (
                <X className="w-4 h-4" />
              ) : change.type === 'modified' ? (
                <Pencil className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </div>

            {/* Change details */}
            <div className="flex-1 min-w-0">
              <div
                className={`font-medium text-sm ${
                  change.type === 'cancelled' ? 'line-through text-gray-500' : 'text-gray-900'
                }`}
              >
                {change.courseCode}
              </div>
              <div className="text-xs text-gray-500 truncate">{change.description}</div>
            </div>

            {/* Undo button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUndoChange(change);
              }}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Undo this change"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer with export option */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <button
          onClick={() => {
            const exportData = {
              exportDate: new Date().toISOString(),
              changeCount,
              changes: changesSummary.map((change) => ({
                courseId: change.id,
                courseCode: change.courseCode,
                changeType: change.type,
                description: change.description,
              })),
            };
            downloadJson(exportData, `schedule-changes-${new Date().toISOString().split('T')[0]}.json`);
          }}
          className="w-full btn btn-secondary text-sm py-2 flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Changes
        </button>
      </div>
    </div>
  );
}
