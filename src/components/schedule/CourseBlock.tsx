import { useMemo } from 'react';
import { AlertTriangle, StickyNote } from 'lucide-react';
import type { Course, ColorByOption } from '../../types/schedule';
import { SUBJECT_COLORS, DELIVERY_COLORS, getInstructorColor } from '../../constants/colors';
import { formatTimeRange } from '../../constants/timeSlots';
import { useSchedule } from '../../contexts/ScheduleContext';

interface CourseBlockProps {
  course: Course;
  meeting: Course['meetings'][0];
  top: number;
  height: number;
  column: number;
  totalColumns: number;
  colorBy: ColorByOption;
  onClick: () => void;
}

export default function CourseBlock({
  course,
  meeting,
  top,
  height,
  column,
  totalColumns,
  colorBy,
  onClick,
}: CourseBlockProps) {
  const { state } = useSchedule();

  // Calculate color based on colorBy option
  const colors = useMemo(() => {
    switch (colorBy) {
      case 'subject':
        return SUBJECT_COLORS[course.subject];

      case 'delivery':
        return DELIVERY_COLORS[course.delivery];

      case 'instructor': {
        if (!course.instructor) {
          return { bg: '#6B7280', text: '#FFFFFF', border: '#4B5563', light: '#F3F4F6' };
        }
        // Find instructor index for consistent coloring
        const instructorIndex = state.instructors.findIndex(
          (i) => i.email === course.instructor?.email
        );
        const color = getInstructorColor(instructorIndex >= 0 ? instructorIndex : 0);
        return { bg: color, text: '#FFFFFF', border: color, light: `${color}20` };
      }

      default:
        return SUBJECT_COLORS[course.subject];
    }
  }, [colorBy, course, state.instructors]);

  // Calculate width and left position based on column
  const width = `calc((100% - 8px) / ${totalColumns})`;
  const left = `calc(4px + (100% - 8px) / ${totalColumns} * ${column})`;

  // Compact mode for short time slots
  const isCompact = height < 50;

  return (
    <div
      className="course-block"
      style={{
        top,
        height,
        width,
        left,
        backgroundColor: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${course.displayCode}: ${course.title}, ${formatTimeRange(meeting.startMinutes, meeting.endMinutes)}`}
    >
      {/* Conflict indicator */}
      {course.hasConflicts && (
        <div className="conflict-badge" title="Schedule conflict">
          <AlertTriangle className="w-2.5 h-2.5" />
        </div>
      )}

      {/* Note indicator - placeholder */}
      {false && (
        <div className="note-indicator" title="Has notes">
          <StickyNote className="w-2.5 h-2.5" />
        </div>
      )}

      <div
        className="course-block-content"
        style={{ color: colors.text }}
      >
        {/* Course code */}
        <div className="course-title">
          {course.displayCode}
          {!isCompact && (
            <span className="font-normal opacity-80"> - {course.section}</span>
          )}
        </div>

        {/* Title - hide in compact mode */}
        {!isCompact && (
          <div className="course-meta mt-0.5 line-clamp-1">
            {course.title}
          </div>
        )}

        {/* Time and location */}
        {!isCompact && (
          <div className="course-meta mt-1">
            {formatTimeRange(meeting.startMinutes, meeting.endMinutes)}
          </div>
        )}

        {/* Instructor */}
        {!isCompact && course.instructor && (
          <div className="course-meta">
            {course.instructor.lastName}
          </div>
        )}

        {/* Location */}
        {!isCompact && meeting.location !== 'TBA' && (
          <div className="course-meta">
            {meeting.location}
          </div>
        )}
      </div>
    </div>
  );
}
