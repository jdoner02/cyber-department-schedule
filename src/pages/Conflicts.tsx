import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Clock, User, MapPin } from 'lucide-react';
import { useCourses } from '../contexts/ScheduleContext';
import { DAYS_OF_WEEK, formatTimeRange } from '../constants/timeSlots';
import type { Course, DayOfWeek } from '../types/schedule';

interface Conflict {
  id: string;
  type: 'instructor' | 'room';
  course1: Course;
  course2: Course;
  day: DayOfWeek;
  overlapStart: number;
  overlapEnd: number;
  description: string;
}

export default function Conflicts() {
  const courses = useCourses();

  // Detect conflicts
  const conflicts = useMemo(() => {
    const detected: Conflict[] = [];

    // Get courses with scheduled meetings
    const scheduledCourses = courses.filter(
      (c) => c.meetings.length > 0 && c.meetings.some((m) => m.startMinutes > 0)
    );

    // Check each pair
    for (let i = 0; i < scheduledCourses.length; i++) {
      for (let j = i + 1; j < scheduledCourses.length; j++) {
        const course1 = scheduledCourses[i];
        const course2 = scheduledCourses[j];

        // Check instructor conflicts
        if (
          course1.instructor &&
          course2.instructor &&
          course1.instructor.email === course2.instructor.email
        ) {
          const overlap = findTimeOverlap(course1, course2);
          if (overlap) {
            detected.push({
              id: `instructor-${course1.id}-${course2.id}-${overlap.day}`,
              type: 'instructor',
              course1,
              course2,
              day: overlap.day,
              overlapStart: overlap.start,
              overlapEnd: overlap.end,
              description: `${course1.instructor.displayName} is scheduled for both courses at the same time`,
            });
          }
        }

        // Check room conflicts (same building and room)
        const roomOverlap = findRoomOverlap(course1, course2);
        if (roomOverlap) {
          detected.push({
            id: `room-${course1.id}-${course2.id}-${roomOverlap.day}`,
            type: 'room',
            course1,
            course2,
            day: roomOverlap.day,
            overlapStart: roomOverlap.start,
            overlapEnd: roomOverlap.end,
            description: `Both courses are scheduled in ${roomOverlap.location} at the same time`,
          });
        }
      }
    }

    return detected;
  }, [courses]);

  // Group conflicts by type
  const instructorConflicts = conflicts.filter((c) => c.type === 'instructor');
  const roomConflicts = conflicts.filter((c) => c.type === 'room');

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
      {conflicts.length === 0 ? (
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

// Helper function to find time overlap between two courses
function findTimeOverlap(
  course1: Course,
  course2: Course
): { day: DayOfWeek; start: number; end: number } | null {
  for (const m1 of course1.meetings) {
    for (const m2 of course2.meetings) {
      const commonDays = m1.days.filter((d) => m2.days.includes(d));

      for (const day of commonDays) {
        if (m1.startMinutes < m2.endMinutes && m2.startMinutes < m1.endMinutes) {
          return {
            day,
            start: Math.max(m1.startMinutes, m2.startMinutes),
            end: Math.min(m1.endMinutes, m2.endMinutes),
          };
        }
      }
    }
  }
  return null;
}

// Helper function to find room overlap
function findRoomOverlap(
  course1: Course,
  course2: Course
): { day: DayOfWeek; start: number; end: number; location: string } | null {
  for (const m1 of course1.meetings) {
    for (const m2 of course2.meetings) {
      // Check if same room (both have building and room, and they match)
      if (
        m1.building &&
        m1.room &&
        m2.building &&
        m2.room &&
        m1.building === m2.building &&
        m1.room === m2.room
      ) {
        const commonDays = m1.days.filter((d) => m2.days.includes(d));

        for (const day of commonDays) {
          if (m1.startMinutes < m2.endMinutes && m2.startMinutes < m1.endMinutes) {
            return {
              day,
              start: Math.max(m1.startMinutes, m2.startMinutes),
              end: Math.min(m1.endMinutes, m2.endMinutes),
              location: `${m1.building} ${m1.room}`,
            };
          }
        }
      }
    }
  }
  return null;
}
