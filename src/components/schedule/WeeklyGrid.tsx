import { useMemo, useState } from 'react';
import { useFilteredCourses, useColorBy } from '../../contexts/FilterContext';
import { DAYS_OF_WEEK, TIME_SLOTS, SCHEDULE_START_HOUR, TIME_SLOT_HEIGHT } from '../../constants/timeSlots';
import CourseBlock from './CourseBlock';
import CourseDetailModal from './CourseDetailModal';
import type { Course, DayOfWeek } from '../../types/schedule';

interface CoursePlacement {
  course: Course;
  meeting: Course['meetings'][0];
  day: DayOfWeek;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
}

export default function WeeklyGrid() {
  const filteredCourses = useFilteredCourses();
  const { colorBy } = useColorBy();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Calculate course placements with overlap handling
  const coursePlacements = useMemo(() => {
    const placements: CoursePlacement[] = [];

    // Group courses by day
    const coursesByDay = new Map<DayOfWeek, { course: Course; meeting: Course['meetings'][0] }[]>();

    DAYS_OF_WEEK.forEach(({ key }) => {
      coursesByDay.set(key, []);
    });

    // Collect all course-meeting combinations for each day
    filteredCourses.forEach((course) => {
      course.meetings.forEach((meeting) => {
        meeting.days.forEach((day) => {
          coursesByDay.get(day)?.push({ course, meeting });
        });
      });
    });

    // Process each day
    coursesByDay.forEach((dayMeetings, day) => {
      // Sort by start time
      dayMeetings.sort((a, b) => a.meeting.startMinutes - b.meeting.startMinutes);

      // Find overlapping groups and assign columns
      const activeColumns: { end: number; column: number }[] = [];

      dayMeetings.forEach(({ course, meeting }) => {
        // Remove expired columns
        const stillActive = activeColumns.filter((col) => col.end > meeting.startMinutes);

        // Find available column
        let column = 0;
        const usedColumns = new Set(stillActive.map((c) => c.column));
        while (usedColumns.has(column)) {
          column++;
        }

        // Calculate position
        const startOffset = meeting.startMinutes - SCHEDULE_START_HOUR * 60;
        const top = (startOffset / 60) * TIME_SLOT_HEIGHT;
        const height = (meeting.durationMinutes / 60) * TIME_SLOT_HEIGHT;

        stillActive.push({ end: meeting.endMinutes, column });

        // Calculate total columns for this time range
        const overlapping = dayMeetings.filter(
          (other) =>
            other.meeting.startMinutes < meeting.endMinutes &&
            other.meeting.endMinutes > meeting.startMinutes
        );
        const totalColumns = Math.max(
          ...overlapping.map((o) => {
            const cols = activeColumns.filter(
              (c) => c.end > o.meeting.startMinutes && o.meeting.endMinutes > meeting.startMinutes
            );
            return cols.length;
          }),
          column + 1
        );

        placements.push({
          course,
          meeting,
          day,
          top,
          height: Math.max(height, 30), // Minimum height
          column,
          totalColumns,
        });

        // Update active columns
        activeColumns.length = 0;
        activeColumns.push(...stillActive);
      });
    });

    return placements;
  }, [filteredCourses]);

  // Get placements for a specific day
  const getPlacementsForDay = (day: DayOfWeek) => {
    return coursePlacements.filter((p) => p.day === day);
  };

  // Calculate the total grid height
  const gridHeight = TIME_SLOTS.length * TIME_SLOT_HEIGHT;

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header row with day names */}
        <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-gray-200 bg-gray-50">
          <div className="p-3 text-center text-sm font-medium text-gray-500">Time</div>
          {DAYS_OF_WEEK.map(({ key, display, short }) => (
            <div
              key={key}
              className="p-3 text-center border-l border-gray-200"
            >
              <span className="hidden sm:inline font-medium text-gray-900">{display}</span>
              <span className="sm:hidden font-medium text-gray-900">{short}</span>
              <div className="text-xs text-gray-500">
                {getPlacementsForDay(key).length} classes
              </div>
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div className="grid grid-cols-[80px_repeat(5,1fr)] relative">
          {/* Time labels column */}
          <div className="relative" style={{ height: gridHeight }}>
            {TIME_SLOTS.map(({ hour, label }) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-b border-gray-100 px-2 py-1"
                style={{
                  top: (hour - SCHEDULE_START_HOUR) * TIME_SLOT_HEIGHT,
                  height: TIME_SLOT_HEIGHT,
                }}
              >
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS_OF_WEEK.map(({ key }) => (
            <div
              key={key}
              className="relative border-l border-gray-200"
              style={{ height: gridHeight }}
            >
              {/* Hour grid lines */}
              {TIME_SLOTS.map(({ hour }) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-b border-gray-100"
                  style={{
                    top: (hour - SCHEDULE_START_HOUR) * TIME_SLOT_HEIGHT,
                    height: TIME_SLOT_HEIGHT,
                  }}
                />
              ))}

              {/* Course blocks */}
              {getPlacementsForDay(key).map((placement, index) => (
                <CourseBlock
                  key={`${placement.course.id}-${placement.meeting.startTime}-${index}`}
                  course={placement.course}
                  meeting={placement.meeting}
                  top={placement.top}
                  height={placement.height}
                  column={placement.column}
                  totalColumns={placement.totalColumns}
                  colorBy={colorBy}
                  onClick={() => setSelectedCourse(placement.course)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Course detail modal */}
      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </>
  );
}
