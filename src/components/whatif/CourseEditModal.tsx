import { useState, useMemo } from 'react';
import { X, User, Clock, MapPin, AlertTriangle, Undo2, Trash2, Save } from 'lucide-react';
import type { Course, Instructor, DayOfWeek, CampusType } from '../../types/schedule';
import { useCourses } from '../../contexts/ScheduleContext';
import { useDraft, useDraftActions } from '../../contexts/DraftScheduleContext';
import { SUBJECT_COLORS } from '../../constants/colors';
import { minutesToDisplayTime } from '../../constants/timeSlots';

interface CourseEditModalProps {
  course: Course;
  onClose: () => void;
}

// Generate time options in 10-minute increments (7 AM to 10 PM)
function generateTimeOptions(): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  for (let hour = 7; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      const totalMinutes = hour * 60 + minute;
      options.push({
        value: totalMinutes,
        label: minutesToDisplayTime(totalMinutes),
      });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();
const CAMPUS_OPTIONS: CampusType[] = ['Cheney', 'Spokane U-District', 'Online'];
const DAY_OPTIONS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'M' },
  { key: 'tuesday', label: 'Tuesday', short: 'T' },
  { key: 'wednesday', label: 'Wednesday', short: 'W' },
  { key: 'thursday', label: 'Thursday', short: 'Th' },
  { key: 'friday', label: 'Friday', short: 'F' },
];

export default function CourseEditModal({ course, onClose }: CourseEditModalProps) {
  const courses = useCourses();
  const { getCourseState, getModification, isCancelled } = useDraft();
  const { modifyCourse, cancelCourse, restoreCourse, revertCourse } = useDraftActions();

  const colors = SUBJECT_COLORS[course.subject];
  const courseState = getCourseState(course.id);
  const modification = getModification(course.id);
  const isCourseCancelled = isCancelled(course.id);
  const hasModifications = courseState === 'modified' || modification !== undefined;

  // Get unique instructors from all courses for the dropdown
  const allInstructors = useMemo(() => {
    const instructorMap = new Map<string, Instructor>();
    courses.forEach((c) => {
      if (c.instructor && ['CSCD', 'CYBR', 'MATH'].includes(c.subject)) {
        instructorMap.set(c.instructor.id, c.instructor);
      }
    });
    return Array.from(instructorMap.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
  }, [courses]);

  // Form state - initialize from course or modification
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(
    modification?.changes.instructor !== undefined
      ? modification.changes.instructor
      : course.instructor
  );

  const initialMeeting = modification?.changes.meetings?.[0] ?? course.meetings[0];
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(initialMeeting?.days ?? []);
  const [startTime, setStartTime] = useState<number>(initialMeeting?.startMinutes ?? 480);
  const [endTime, setEndTime] = useState<number>(initialMeeting?.endMinutes ?? 530);
  const [selectedCampus, setSelectedCampus] = useState<CampusType>(
    modification?.changes.campus ?? course.campus
  );

  // Check if form has unsaved changes (could be used for confirmation dialog)
  const _hasUnsavedChanges = useMemo(() => {
    const originalMeeting = course.meetings[0];
    if (selectedInstructor?.id !== course.instructor?.id) return true;
    if (selectedCampus !== course.campus) return true;
    if (startTime !== originalMeeting?.startMinutes) return true;
    if (endTime !== originalMeeting?.endMinutes) return true;
    if (JSON.stringify(selectedDays.sort()) !== JSON.stringify(originalMeeting?.days?.sort())) return true;
    return false;
  }, [course, selectedInstructor, selectedCampus, startTime, endTime, selectedDays]);
  void _hasUnsavedChanges; // Suppress unused warning, will be used for close confirmation

  // Toggle a day in the selection
  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Handle save
  const handleSave = () => {
    // Build the updated meeting
    const updatedMeeting = course.meetings[0]
      ? {
          ...course.meetings[0],
          days: selectedDays,
          startMinutes: startTime,
          endMinutes: endTime,
          startTime: minutesToDisplayTime(startTime),
          endTime: minutesToDisplayTime(endTime),
          durationMinutes: endTime - startTime,
        }
      : null;

    modifyCourse(course.id, {
      instructor: selectedInstructor,
      campus: selectedCampus,
      ...(updatedMeeting ? { meetings: [updatedMeeting] } : {}),
    });

    onClose();
  };

  // Handle cancel course
  const handleCancelCourse = () => {
    if (isCourseCancelled) {
      restoreCourse(course.id);
    } else {
      cancelCourse(course.id);
    }
    onClose();
  };

  // Handle revert
  const handleRevert = () => {
    revertCourse(course.id);
    onClose();
  };

  return (
    <div
      className="modal-overlay z-50 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content animate-slide-in max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          className="modal-header"
          style={{ backgroundColor: colors.light, borderBottom: `3px solid ${colors.bg}` }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-bold text-white"
                style={{ backgroundColor: colors.bg }}
              >
                {course.subject}
              </span>
              {courseState === 'modified' && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">
                  MODIFIED
                </span>
              )}
              {isCourseCancelled && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                  CANCELLED
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              Edit: {course.displayCode}-{course.section}
            </h2>
            <p className="text-gray-600 text-sm">{course.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body space-y-5">
          {/* Instructor dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Instructor
            </label>
            <select
              value={selectedInstructor?.id ?? ''}
              onChange={(e) => {
                const instructor = allInstructors.find((i) => i.id === e.target.value) ?? null;
                setSelectedInstructor(instructor);
              }}
              className="input w-full"
            >
              <option value="">— TBA / Staff —</option>
              {allInstructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Days toggle buttons */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Days
            </label>
            <div className="flex gap-2">
              {DAY_OPTIONS.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  className={`
                    w-10 h-10 rounded-lg font-medium transition-all
                    ${selectedDays.includes(day.key)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                  title={day.label}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </div>

          {/* Time selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time
            </label>
            <div className="flex items-center gap-3">
              <select
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                className="input flex-1"
              >
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="text-gray-500">to</span>
              <select
                value={endTime}
                onChange={(e) => setEndTime(Number(e.target.value))}
                className="input flex-1"
              >
                {TIME_OPTIONS.filter((opt) => opt.value > startTime).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Duration: {endTime - startTime} minutes
            </p>
          </div>

          {/* Campus selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Campus
            </label>
            <div className="flex flex-wrap gap-2">
              {CAMPUS_OPTIONS.map((campus) => (
                <button
                  key={campus}
                  type="button"
                  onClick={() => setSelectedCampus(campus)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${selectedCampus === campus
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {campus}
                </button>
              ))}
            </div>
          </div>

          {/* Warning if time validation fails */}
          {endTime <= startTime && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-800">
                End time must be after start time
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer flex-wrap gap-2">
          {/* Cancel Course button */}
          <button
            onClick={handleCancelCourse}
            className={`btn flex items-center gap-2 ${
              isCourseCancelled
                ? 'btn-secondary'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {isCourseCancelled ? 'Restore Course' : 'Cancel Course'}
          </button>

          <div className="flex-1" />

          {/* Revert button - only show if there are modifications */}
          {hasModifications && (
            <button
              onClick={handleRevert}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Undo2 className="w-4 h-4" />
              Revert
            </button>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={endTime <= startTime || selectedDays.length === 0}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
