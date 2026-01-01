import { useEffect, useMemo, useState } from 'react';
import { Info, Search } from 'lucide-react';
import type { Course, DeliveryMethod, SubjectCode, DayOfWeek } from '../../types/schedule';
import { DAYS_OF_WEEK, formatTimeRange } from '../../constants/timeSlots';
import { DELIVERY_COLORS, SUBJECT_COLORS } from '../../constants/colors';
import type { EnrollmentDataStatus } from '../../services/scheduleAnalytics';
import DrilldownModal from '../common/DrilldownModal';

export type TimeBucketConfig = { name: string; startHour: number; endHour: number };

export type AnalyticsDrilldown =
  | { kind: 'subject'; subject: SubjectCode }
  | { kind: 'delivery'; method: DeliveryMethod }
  | { kind: 'faculty'; email: string; fullName: string }
  | { kind: 'timeBucket'; bucket: TimeBucketConfig };

type CourseSort = 'course' | 'title' | 'capacity' | 'fillRate';
type TimeBucketView = 'meeting-blocks' | 'courses';

type MeetingBlock = {
  course: Course;
  meeting: Course['meetings'][number];
};

interface AnalyticsDrilldownModalProps {
  drilldown: AnalyticsDrilldown | null;
  onClose: () => void;
  courses: Course[];
  enrollmentStatus: EnrollmentDataStatus;
  registrationDateLabel: string | null;
  isBeforeRegistration: boolean;
  onOpenCourse: (course: Course) => void;
}

function formatDays(days: DayOfWeek[]): string {
  return days
    .map((day) => DAYS_OF_WEEK.find((d) => d.key === day)?.short ?? day)
    .join(', ');
}

function getCourseSearchText(course: Course): string {
  return [
    course.displayCode,
    course.section,
    course.title,
    course.instructor?.displayName ?? '',
    course.instructor?.email ?? '',
    course.delivery,
    course.campus,
    course.crn,
  ]
    .join(' ')
    .toLowerCase();
}

export default function AnalyticsDrilldownModal({
  drilldown,
  onClose,
  courses,
  enrollmentStatus,
  registrationDateLabel,
  isBeforeRegistration,
  onOpenCourse,
}: AnalyticsDrilldownModalProps) {
  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);

  const [query, setQuery] = useState('');
  const [courseSort, setCourseSort] = useState<CourseSort>('course');
  const [timeBucketView, setTimeBucketView] = useState<TimeBucketView>('meeting-blocks');
  const [showRawEnrollment, setShowRawEnrollment] = useState(false);

  const resetKey = useMemo(() => {
    if (!drilldown) return 'none';
    switch (drilldown.kind) {
      case 'subject':
        return `subject:${drilldown.subject}`;
      case 'delivery':
        return `delivery:${drilldown.method}`;
      case 'faculty':
        return `faculty:${drilldown.email}`;
      case 'timeBucket':
        return `timeBucket:${drilldown.bucket.name}`;
    }
  }, [drilldown]);

  useEffect(() => {
    setQuery('');
    setCourseSort('course');
    setTimeBucketView('meeting-blocks');
    setShowRawEnrollment(false);
  }, [resetKey]);

  const hideEnrollmentMetrics = enrollmentStatus === 'allZero' && isBeforeRegistration;
  const showEnrollmentMetrics = !hideEnrollmentMetrics || showRawEnrollment;

  const baseCourses = useMemo(() => {
    if (!drilldown) return [];

    switch (drilldown.kind) {
      case 'subject':
        return courses.filter((course) => course.subject === drilldown.subject);
      case 'delivery':
        return courses.filter((course) => course.delivery === drilldown.method);
      case 'faculty':
        return courses.filter((course) => course.instructor?.email === drilldown.email);
      case 'timeBucket':
        return courses;
    }
  }, [courses, drilldown]);

  const timeBucketMeetingBlocks = useMemo<MeetingBlock[]>(() => {
    if (!drilldown || drilldown.kind !== 'timeBucket') return [];

    return baseCourses.flatMap((course) =>
      course.meetings.map((meeting) => ({ course, meeting }))
    ).filter(({ meeting }) => {
      const startHour = Math.floor(meeting.startMinutes / 60);
      return startHour >= drilldown.bucket.startHour && startHour < drilldown.bucket.endHour;
    });
  }, [baseCourses, drilldown]);

  const timeBucketCourses = useMemo(() => {
    if (!drilldown || drilldown.kind !== 'timeBucket') return [];
    const ids = new Set(timeBucketMeetingBlocks.map((row) => row.course.id));
    return baseCourses.filter((course) => ids.has(course.id));
  }, [baseCourses, drilldown, timeBucketMeetingBlocks]);

  const searchableRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const courseBase = drilldown?.kind === 'timeBucket' ? timeBucketCourses : baseCourses;

    if (q.length === 0) {
      return {
        courses: courseBase,
        meetingBlocks: timeBucketMeetingBlocks,
      };
    }

    const filteredCourses = courseBase.filter((course) => getCourseSearchText(course).includes(q));

    const filteredBlocks = timeBucketMeetingBlocks.filter(({ course, meeting }) => {
      const meetingText = [
        getCourseSearchText(course),
        formatDays(meeting.days),
        meeting.location,
        meeting.typeDescription,
      ]
        .join(' ')
        .toLowerCase();
      return meetingText.includes(q);
    });

    return { courses: filteredCourses, meetingBlocks: filteredBlocks };
  }, [baseCourses, drilldown?.kind, query, timeBucketCourses, timeBucketMeetingBlocks]);

  const sortedCourses = useMemo(() => {
    const list = [...searchableRows.courses];

    const getCapacity = (course: Course) => course.enrollment.maximum;
    const getFillRate = (course: Course) => {
      const capacity = course.enrollment.maximum;
      if (capacity <= 0) return -1;
      return (course.enrollment.current / capacity) * 100;
    };

    switch (courseSort) {
      case 'title':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'capacity':
        list.sort((a, b) => getCapacity(b) - getCapacity(a));
        break;
      case 'fillRate':
        list.sort((a, b) => getFillRate(b) - getFillRate(a));
        break;
      case 'course':
      default:
        list.sort((a, b) => a.displayCode.localeCompare(b.displayCode) || a.section.localeCompare(b.section));
        break;
    }

    return list;
  }, [courseSort, searchableRows.courses]);

  const sortedMeetingBlocks = useMemo(() => {
    const list = [...searchableRows.meetingBlocks];
    list.sort(
      (a, b) =>
        a.meeting.startMinutes - b.meeting.startMinutes ||
        a.course.displayCode.localeCompare(b.course.displayCode) ||
        a.course.section.localeCompare(b.course.section)
    );
    return list;
  }, [searchableRows.meetingBlocks]);

  const summary = useMemo(() => {
    if (!drilldown) return null;

    const sections =
      drilldown.kind === 'timeBucket' && timeBucketView === 'meeting-blocks'
        ? sortedMeetingBlocks.length
        : sortedCourses.length;

    const credits = sortedCourses.reduce((sum, course) => sum + course.credits, 0);
    const capacity = sortedCourses.reduce((sum, course) => sum + course.enrollment.maximum, 0);
    const enrollment = sortedCourses.reduce((sum, course) => sum + course.enrollment.current, 0);
    const available = sortedCourses.reduce((sum, course) => sum + course.enrollment.available, 0);
    const fillRate = capacity > 0 ? Math.round((enrollment / capacity) * 100) : null;

    return {
      sections,
      credits,
      capacity,
      enrollment,
      available,
      fillRate,
      uniqueCourses:
        drilldown.kind === 'timeBucket' && timeBucketView === 'meeting-blocks'
          ? sortedCourses.length
          : null,
    };
  }, [drilldown, sortedCourses, sortedMeetingBlocks.length, timeBucketView]);

  const title = useMemo(() => {
    if (!drilldown) return '';
    switch (drilldown.kind) {
      case 'subject':
        return `Subject Drilldown: ${drilldown.subject}`;
      case 'delivery':
        return `Delivery Drilldown: ${drilldown.method}`;
      case 'faculty':
        return `Instructor Drilldown: ${drilldown.fullName}`;
      case 'timeBucket':
        return `Time Bucket Drilldown: ${drilldown.bucket.name}`;
    }
  }, [drilldown]);

  const description = useMemo(() => {
    if (!drilldown) return null;
    if (drilldown.kind === 'timeBucket') {
      return (
        <>
          {timeBucketView === 'meeting-blocks'
            ? 'Shows each meeting block counted in the chart (one per section meeting record).'
            : 'Shows the unique sections that have at least one meeting block in this time bucket.'}
          {' '}
          Click a course to open full section details.
        </>
      );
    }
    if (drilldown.kind === 'faculty') {
      return <>Shows each section taught by this instructor with all meeting times. Click a course to open full section details.</>;
    }
    return <>Click a course to open full section details.</>;
  }, [drilldown, timeBucketView]);

  if (!drilldown) return null;

  const resultsCountLabel =
    drilldown.kind === 'timeBucket' && timeBucketView === 'meeting-blocks'
      ? `${sortedMeetingBlocks.length} meeting block${sortedMeetingBlocks.length !== 1 ? 's' : ''}`
      : `${sortedCourses.length} section${sortedCourses.length !== 1 ? 's' : ''}`;

  return (
    <DrilldownModal
      isOpen={true}
      title={title}
      description={description}
      onClose={onClose}
      maxWidthClassName="max-w-6xl"
    >
      {hideEnrollmentMetrics && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              {registrationDateLabel && isBeforeRegistration ? (
                <p className="mb-2">
                  Registration opens <strong>{registrationDateLabel}</strong>. Enrollment counts may not be published yet,
                  so totals are hidden by default.
                </p>
              ) : (
                <p className="mb-2">
                  Enrollment counts may not be published yet for this term, so totals are hidden by default.
                </p>
              )}
              <label className="inline-flex items-center gap-2 text-blue-800">
                <input
                  type="checkbox"
                  className="rounded border-blue-300 text-blue-700 focus:ring-blue-500"
                  checked={showRawEnrollment}
                  onChange={(e) => setShowRawEnrollment(e.target.checked)}
                />
                Show raw enrollment values anyway
              </label>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{numberFormatter.format(summary.sections)}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              {drilldown.kind === 'timeBucket' && timeBucketView === 'meeting-blocks' ? 'Meeting Blocks' : 'Sections'}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{numberFormatter.format(summary.capacity)}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Seats Offered</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {showEnrollmentMetrics ? numberFormatter.format(summary.enrollment) : <span className="text-gray-400">—</span>}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Seats Filled</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {showEnrollmentMetrics && summary.fillRate !== null ? `${summary.fillRate}%` : <span className="text-gray-400">—</span>}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Fill Rate</div>
          </div>
          {drilldown.kind === 'timeBucket' && timeBucketView === 'meeting-blocks' && summary.uniqueCourses !== null && (
            <div className="md:col-span-4 text-sm text-gray-600 -mt-2">
              Unique sections in this bucket: <span className="font-medium text-gray-900">{numberFormatter.format(summary.uniqueCourses)}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between mb-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course, title, instructor, CRN…"
            className="input pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {drilldown.kind === 'timeBucket' && (
            <select
              value={timeBucketView}
              onChange={(e) => setTimeBucketView(e.target.value as TimeBucketView)}
              className="select w-auto"
              aria-label="Select time bucket drilldown view"
            >
              <option value="meeting-blocks">Meeting blocks</option>
              <option value="courses">Unique sections</option>
            </select>
          )}

          {(drilldown.kind !== 'timeBucket' || timeBucketView === 'courses') && (
            <select
              value={courseSort}
              onChange={(e) => setCourseSort(e.target.value as CourseSort)}
              className="select w-auto"
              aria-label="Sort results"
            >
              <option value="course">Sort: course</option>
              <option value="title">Sort: title</option>
              <option value="capacity">Sort: seats offered</option>
              <option value="fillRate">Sort: fill rate</option>
            </select>
          )}

          <span className="text-sm text-gray-500">{resultsCountLabel}</span>
        </div>
      </div>

      {drilldown.kind === 'timeBucket' && timeBucketView === 'meeting-blocks' ? (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Course</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Meeting</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Location</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Instructor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Delivery</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Seats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedMeetingBlocks.map(({ course, meeting }) => {
                const capacity = course.enrollment.maximum;
                const enrollment = course.enrollment.current;
                const fillRate = capacity > 0 ? Math.round((enrollment / capacity) * 100) : null;
                const delivery = DELIVERY_COLORS[course.delivery];

                return (
                  <tr key={`${course.id}-${meeting.startMinutes}-${meeting.endMinutes}-${meeting.location}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => onOpenCourse(course)}
                        className="text-blue-700 hover:underline font-medium"
                      >
                        {course.displayCode} <span className="text-gray-500">({course.section})</span>
                      </button>
                      <div className="text-xs text-gray-500 mt-0.5">{course.title}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      <div className="font-medium">{formatDays(meeting.days)}</div>
                      <div className="text-xs text-gray-500">{formatTimeRange(meeting.startMinutes, meeting.endMinutes)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{meeting.location}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {course.instructor?.displayName ?? <span className="text-gray-400">TBA</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: delivery.bg }}
                      >
                        {course.delivery}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">
                      {showEnrollmentMetrics ? (
                        <span>
                          {numberFormatter.format(enrollment)}/{numberFormatter.format(capacity)}
                          {fillRate !== null && (
                            <span className="text-gray-500 ml-2">({fillRate}%)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {sortedMeetingBlocks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No meeting blocks match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Course</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Instructor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">When</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Campus</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Delivery</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Seats Offered</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Seats Filled</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Fill Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedCourses.map((course) => {
                const colors = SUBJECT_COLORS[course.subject];
                const delivery = DELIVERY_COLORS[course.delivery];
                const showAllMeetingTimes = drilldown.kind === 'faculty';
                const meetings = [...course.meetings].sort(
                  (a, b) =>
                    a.startMinutes - b.startMinutes ||
                    a.endMinutes - b.endMinutes ||
                    (a.location ?? '').localeCompare(b.location ?? '')
                );
                const meeting = meetings[0] ?? null;
                const capacity = course.enrollment.maximum;
                const enrollment = course.enrollment.current;
                const fillRate = capacity > 0 ? Math.round((enrollment / capacity) * 100) : null;

                return (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold text-white"
                          style={{ backgroundColor: colors.bg }}
                          title={course.subject}
                        >
                          {course.subject}
                        </span>
                        <button
                          onClick={() => onOpenCourse(course)}
                          className="text-blue-700 hover:underline font-medium"
                        >
                          {course.displayCode} <span className="text-gray-500">({course.section})</span>
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{course.title}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {course.instructor?.displayName ?? <span className="text-gray-400">TBA</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {meetings.length > 0 && showAllMeetingTimes ? (
                        <div className="space-y-1 whitespace-normal">
                          {meetings.map((row, meetingIndex) => (
                            <div key={`${course.id}-meeting-${meetingIndex}`} className="text-xs">
                              <span className="font-medium text-gray-800">{formatDays(row.days)}</span>{' '}
                              <span className="text-gray-600">
                                {formatTimeRange(row.startMinutes, row.endMinutes)}
                                {row.typeDescription ? ` • ${row.typeDescription}` : ''}
                                {row.location ? ` • ${row.location}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : meeting ? (
                        <>
                          <div className="font-medium">{formatDays(meeting.days)}</div>
                          <div className="text-xs text-gray-500">{formatTimeRange(meeting.startMinutes, meeting.endMinutes)}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">TBA</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{course.campus}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: delivery.bg }}
                      >
                        {course.delivery}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">
                      {numberFormatter.format(capacity)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">
                      {showEnrollmentMetrics ? numberFormatter.format(enrollment) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">
                      {showEnrollmentMetrics && fillRate !== null ? (
                        <span
                          className={`font-medium ${
                            fillRate > 80 ? 'text-red-600' : fillRate > 0 ? 'text-green-600' : 'text-gray-400'
                          }`}
                        >
                          {fillRate}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {sortedCourses.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No sections match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </DrilldownModal>
  );
}
