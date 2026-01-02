/**
 * =============================================================================
 * COMPONENT: CourseGroupBlock
 * =============================================================================
 *
 * PURPOSE: Display a CourseGroup (corequisites + stacked courses) as a single
 * block in the schedule grid. For example, CSCD 477 + 477L + 577 + 577L
 * displays as one card with a combined title.
 *
 * DESIGN NOTES:
 * - Uses the primary course's color scheme
 * - Shows combined enrollment counts
 * - Displays abbreviated course numbers (477/577 instead of full titles)
 * - Indicates stacking with a visual badge
 *
 * =============================================================================
 */

import { useMemo } from 'react';
import { AlertTriangle, Layers } from 'lucide-react';
import type { Course, CourseGroup, ColorByOption } from '../../types/schedule';
import { SUBJECT_COLORS, DELIVERY_COLORS, getInstructorColor } from '../../constants/colors';
import { formatTimeRange } from '../../constants/timeSlots';
import { useSchedule } from '../../contexts/ScheduleContext';

interface CourseGroupBlockProps {
  group: CourseGroup;
  meeting: Course['meetings'][0];
  top: number;
  height: number;
  column: number;
  totalColumns: number;
  colorBy: ColorByOption;
  onClick: () => void;
}

export default function CourseGroupBlock({
  group,
  meeting,
  top,
  height,
  column,
  totalColumns,
  colorBy,
  onClick,
}: CourseGroupBlockProps) {
  const { state } = useSchedule();
  const { primaryCourse } = group;

  // Calculate color based on colorBy option (uses primary course)
  const colors = useMemo(() => {
    switch (colorBy) {
      case 'subject':
        return SUBJECT_COLORS[primaryCourse.subject];

      case 'delivery':
        return DELIVERY_COLORS[primaryCourse.delivery];

      case 'instructor': {
        if (!primaryCourse.instructor) {
          return { bg: '#6B7280', text: '#FFFFFF', border: '#4B5563', light: '#F3F4F6' };
        }
        const instructorIndex = state.instructors.findIndex(
          (i) => i.email === primaryCourse.instructor?.email
        );
        const color = getInstructorColor(instructorIndex >= 0 ? instructorIndex : 0);
        return { bg: color, text: '#FFFFFF', border: color, light: `${color}20` };
      }

      default:
        return SUBJECT_COLORS[primaryCourse.subject];
    }
  }, [colorBy, primaryCourse, state.instructors]);

  // Check if any course in the group has conflicts
  const hasConflicts = group.allCourses.some((c) => c.hasConflicts);

  // Calculate width and left position based on column
  const width = `calc((100% - 8px) / ${totalColumns})`;
  const left = `calc(4px + (100% - 8px) / ${totalColumns} * ${column})`;

  // Compact mode for short time slots
  const isCompact = height < 50;

  // Generate display code (e.g., "477/577" or "477/477L/577/577L")
  const displayNumbers = group.displayCode;

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
      aria-label={`${group.displayTitle}, ${formatTimeRange(meeting.startMinutes, meeting.endMinutes)}`}
    >
      {/* Stacked indicator badge */}
      {!group.isStandalone && (
        <div
          className="absolute top-0.5 right-0.5 p-0.5 rounded bg-white/20"
          title={`${group.allCourses.length} sections grouped`}
        >
          <Layers className="w-2.5 h-2.5" style={{ color: colors.text }} />
        </div>
      )}

      {/* Conflict indicator */}
      {hasConflicts && (
        <div className="conflict-badge" title="Schedule conflict">
          <AlertTriangle className="w-2.5 h-2.5" />
        </div>
      )}

      <div
        className="course-block-content"
        style={{ color: colors.text }}
      >
        {/* Course code with grouped numbers */}
        <div className="course-title">
          {primaryCourse.subject} {displayNumbers}
        </div>

        {/* Title - hide in compact mode */}
        {!isCompact && (
          <div className="course-meta mt-0.5 line-clamp-1">
            {primaryCourse.title}
          </div>
        )}

        {/* Time and location */}
        {!isCompact && (
          <div className="course-meta mt-1">
            {formatTimeRange(meeting.startMinutes, meeting.endMinutes)}
          </div>
        )}

        {/* Instructor */}
        {!isCompact && primaryCourse.instructor && (
          <div className="course-meta">
            {primaryCourse.instructor.lastName}
          </div>
        )}

        {/* Location */}
        {!isCompact && meeting.location !== 'TBA' && (
          <div className="course-meta">
            {meeting.location}
          </div>
        )}

        {/* Enrollment (combined for group) */}
        {!isCompact && !group.isStandalone && (
          <div className="course-meta opacity-75">
            {group.totalEnrollment}/{group.totalCapacity}
          </div>
        )}
      </div>
    </div>
  );
}
