import { useMemo, useState } from 'react';
import { useFilteredCourses, useColorBy, useViewMode } from '../../contexts/FilterContext';
import {
  DAYS_OF_WEEK,
  TIME_SLOTS,
  SCHEDULE_START_HOUR,
  TIME_SLOT_HEIGHT,
  getHourBlockBgStyle,
  getHourBlockBorderStyle,
} from '../../constants/timeSlots';
import CourseBlock from './CourseBlock';
import CourseGroupBlock from './CourseGroupBlock';
import CourseDetailModal from './CourseDetailModal';
import MobileDayTabs from './MobileDayTabs';
import DayTimeline from './DayTimeline';
import { useResponsiveView } from '../../hooks/useResponsiveView';
import { buildCourseGroups } from '../../services/courseGroupDetector';
import type { Course, CourseGroup, DayOfWeek } from '../../types/schedule';

interface GroupPlacement {
  group: CourseGroup;
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
  const { selectedDay, setSelectedDay } = useViewMode();
  const { isMobile } = useResponsiveView();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<CourseGroup | null>(null);

  // Default to Monday if no day selected
  const currentDay: DayOfWeek = selectedDay || 'monday';

  // Build course groups from filtered courses
  const courseGroups = useMemo(() => {
    return buildCourseGroups(filteredCourses);
  }, [filteredCourses]);

  // Calculate course counts per day for mobile tabs (count groups, not individual courses)
  const courseCounts = useMemo(() => {
    const counts: Record<DayOfWeek, number> = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
    };

    courseGroups.forEach((group) => {
      group.primaryCourse.meetings.forEach((meeting) => {
        meeting.days.forEach((day) => {
          counts[day]++;
        });
      });
    });

    return counts;
  }, [courseGroups]);

  // Calculate group placements with overlap handling
  const groupPlacements = useMemo(() => {
    const placements: GroupPlacement[] = [];

    // Group by day
    const groupsByDay = new Map<DayOfWeek, { group: CourseGroup; meeting: Course['meetings'][0] }[]>();

    DAYS_OF_WEEK.forEach(({ key }) => {
      groupsByDay.set(key, []);
    });

    // Collect all group-meeting combinations for each day
    // Use the primary course's meetings for positioning
    courseGroups.forEach((group) => {
      group.primaryCourse.meetings.forEach((meeting) => {
        meeting.days.forEach((day) => {
          groupsByDay.get(day)?.push({ group, meeting });
        });
      });
    });

    // Process each day with two-pass algorithm for correct column widths
    groupsByDay.forEach((dayMeetings, day) => {
      // Sort by start time
      dayMeetings.sort((a, b) => a.meeting.startMinutes - b.meeting.startMinutes);

      // First pass: assign columns
      const columnAssignments: { group: CourseGroup; meeting: Course['meetings'][0]; column: number }[] = [];
      const activeColumns: { end: number; column: number }[] = [];

      dayMeetings.forEach(({ group, meeting }) => {
        // Remove expired columns
        const stillActive = activeColumns.filter((col) => col.end > meeting.startMinutes);
        activeColumns.length = 0;
        activeColumns.push(...stillActive);

        // Find available column
        let column = 0;
        const usedColumns = new Set(activeColumns.map((c) => c.column));
        while (usedColumns.has(column)) {
          column++;
        }

        activeColumns.push({ end: meeting.endMinutes, column });
        columnAssignments.push({ group, meeting, column });
      });

      // Second pass: calculate totalColumns for each placement
      // All overlapping courses must share the same totalColumns
      columnAssignments.forEach(({ group, meeting, column }) => {
        // Find all courses that overlap with this one
        const overlapping = columnAssignments.filter(
          (other) =>
            other.meeting.startMinutes < meeting.endMinutes &&
            other.meeting.endMinutes > meeting.startMinutes
        );

        // totalColumns = max column among all overlapping + 1
        const totalColumns = Math.max(...overlapping.map((o) => o.column)) + 1;

        // Calculate position
        const startOffset = meeting.startMinutes - SCHEDULE_START_HOUR * 60;
        const top = (startOffset / 60) * TIME_SLOT_HEIGHT;
        const height = (meeting.durationMinutes / 60) * TIME_SLOT_HEIGHT;

        placements.push({
          group,
          meeting,
          day,
          top,
          height: Math.max(height, 30), // Minimum height
          column,
          totalColumns,
        });
      });
    });

    return placements;
  }, [courseGroups]);

  // Get placements for a specific day
  const getPlacementsForDay = (day: DayOfWeek) => {
    return groupPlacements.filter((p) => p.day === day);
  };

  // Handle click on a group - open modal with primary course
  const handleGroupClick = (group: CourseGroup) => {
    setSelectedGroup(group);
    setSelectedCourse(group.primaryCourse);
  };

  // Calculate the total grid height
  const gridHeight = TIME_SLOTS.length * TIME_SLOT_HEIGHT;

  // Mobile view: Day tabs + timeline
  if (isMobile) {
    return (
      <>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <MobileDayTabs
            selectedDay={currentDay}
            onDayChange={setSelectedDay}
            courseCounts={courseCounts}
          />
          <DayTimeline
            courses={filteredCourses}
            selectedDay={currentDay}
            onCourseClick={setSelectedCourse}
          />
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

  // Desktop view: Full weekly grid
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
                className="absolute left-0 right-0 px-2 py-1"
                style={{
                  top: (hour - SCHEDULE_START_HOUR) * TIME_SLOT_HEIGHT,
                  height: TIME_SLOT_HEIGHT,
                  ...getHourBlockBgStyle(hour),
                  ...getHourBlockBorderStyle(hour),
                }}
              >
                <span className="text-xs text-gray-500 font-medium">{label}</span>
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
              {/* Hour grid lines with alternating backgrounds (z-0 = behind courses) */}
              {TIME_SLOTS.map(({ hour }) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 z-0"
                  style={{
                    top: (hour - SCHEDULE_START_HOUR) * TIME_SLOT_HEIGHT,
                    height: TIME_SLOT_HEIGHT,
                    ...getHourBlockBgStyle(hour),
                    ...getHourBlockBorderStyle(hour),
                  }}
                />
              ))}

              {/* Course group blocks */}
              {getPlacementsForDay(key).map((placement, index) => (
                placement.group.isStandalone ? (
                  <CourseBlock
                    key={`${placement.group.id}-${placement.meeting.startTime}-${index}`}
                    course={placement.group.primaryCourse}
                    meeting={placement.meeting}
                    top={placement.top}
                    height={placement.height}
                    column={placement.column}
                    totalColumns={placement.totalColumns}
                    colorBy={colorBy}
                    onClick={() => handleGroupClick(placement.group)}
                  />
                ) : (
                  <CourseGroupBlock
                    key={`${placement.group.id}-${placement.meeting.startTime}-${index}`}
                    group={placement.group}
                    meeting={placement.meeting}
                    top={placement.top}
                    height={placement.height}
                    column={placement.column}
                    totalColumns={placement.totalColumns}
                    colorBy={colorBy}
                    onClick={() => handleGroupClick(placement.group)}
                  />
                )
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Course detail modal */}
      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          courseGroup={selectedGroup || undefined}
          onClose={() => {
            setSelectedCourse(null);
            setSelectedGroup(null);
          }}
        />
      )}
    </>
  );
}
