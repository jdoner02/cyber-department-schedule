import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useCourses, useSchedule } from '../contexts/ScheduleContext';
import { SUBJECT_COLORS, DELIVERY_COLORS } from '../constants/colors';
import { Download, Users, BookOpen, Building, Clock, Info } from 'lucide-react';
import { computeScheduleAnalytics } from '../services/scheduleAnalytics';
import { useAcademicCalendarEvents } from '../contexts/AcademicCalendarContext';
import { findRegistrationOpensEvent } from '../services/academicCalendar';
import { downloadText } from '../utils/download';

export default function Analytics() {
  const courses = useCourses();
  const { state } = useSchedule();
  const calendarEvents = useAcademicCalendarEvents();

  // Calculate analytics data
  const analytics = useMemo(() => {
    return computeScheduleAnalytics({
      courses,
      instructors: state.instructors,
      subjects: state.subjects,
    });
  }, [courses, state.subjects, state.instructors]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);

  const termLabel = useMemo(() => {
    if (!analytics.term.primary) return 'No term loaded';
    const { code, description } = analytics.term.primary;
    return `${description} (${code})`;
  }, [analytics.term.primary]);

  const registrationInfo = useMemo(() => {
    const termCode = analytics.term.primary?.code ?? null;
    if (!termCode) return null;
    const event = findRegistrationOpensEvent(calendarEvents, termCode);
    if (!event) return null;
    const date = new Date(event.startDate);
    if (Number.isNaN(date.getTime())) return null;
    return { event, date };
  }, [analytics.term.primary?.code, calendarEvents]);

  const registrationDateLabel = useMemo(() => {
    if (!registrationInfo) return null;
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(registrationInfo.date);
  }, [registrationInfo]);

  const isBeforeRegistration = useMemo(() => {
    if (!registrationInfo) return false;
    return new Date().getTime() < registrationInfo.date.getTime();
  }, [registrationInfo]);

  const deliveryChartData = useMemo(
    () =>
      analytics.delivery
        .map((delivery) => ({
          name: delivery.method === 'F2F' ? 'Face-to-Face' : delivery.method,
          value: delivery.courseCount,
          fill: DELIVERY_COLORS[delivery.method].bg,
        }))
        .filter((d) => d.value > 0),
    [analytics.delivery]
  );

  // Export data as CSV
  const handleExport = () => {
    const headers = ['Course', 'Section', 'Title', 'Instructor', 'Credits', 'Enrolled', 'Capacity', 'Delivery'];
    const rows = courses.map((c) => [
      c.displayCode,
      c.section,
      `"${c.title}"`,
      c.instructor?.displayName || 'TBA',
      c.credits,
      c.enrollment.current,
      c.enrollment.maximum,
      c.delivery,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadText(
      csv,
      `ewu-schedule-analytics-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    );
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Term: {analytics.term.isMultiTerm ? 'Multiple terms loaded' : termLabel}
          </p>
        </div>
        <button onClick={handleExport} className="btn btn-primary">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Data quality / enrollment availability */}
      {analytics.summary.totalCourses > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-800 font-medium mb-1">How to read these numbers</p>
              {analytics.enrollmentStatus === 'allZero' ? (
                <p className="text-blue-700 mb-0">
                  {isBeforeRegistration && registrationDateLabel ? (
                    <>
                      Registration opens on <strong>{registrationDateLabel}</strong>. Until then, Banner often publishes
                      seat capacity before enrollment counts are available, so <strong>Seats Filled</strong> and{' '}
                      <strong>Seat Fill Rate</strong> are intentionally hidden here to avoid confusion.
                    </>
                  ) : (
                    <>
                      Enrollment is currently reported as <strong>0</strong> across all sections. For many future terms,
                      Banner publishes seat capacity before enrollment counts are available, so <strong>Seats Filled</strong> and{' '}
                      <strong>Seat Fill Rate</strong> may not be meaningful yet.
                    </>
                  )}
                </p>
              ) : (
                <p className="text-blue-700 mb-0">
                  Enrollment is reported for this term. Sections with non-zero enrollment:{' '}
                  <strong>
                    {numberFormatter.format(analytics.summary.coursesWithReportedEnrollment)}
                  </strong>
                  /{numberFormatter.format(analytics.summary.totalCourses)}.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="card p-4 text-center">
          <BookOpen className="w-6 h-6 text-ewu-red mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {numberFormatter.format(analytics.summary.totalCourses)}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Courses</div>
        </div>
        <div className="card p-4 text-center">
          <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {analytics.enrollmentStatus === 'allZero' && isBeforeRegistration ? (
              <span className="text-gray-400">—</span>
            ) : (
              numberFormatter.format(analytics.summary.totalEnrollment)
            )}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Seats Filled</div>
          {analytics.enrollmentStatus === 'allZero' && (
            <div className="mt-1 text-[11px] text-blue-700">
              {isBeforeRegistration && registrationDateLabel
                ? `Registration opens ${registrationDateLabel}`
                : 'Not published yet'}
            </div>
          )}
        </div>
        <div className="card p-4 text-center">
          <Building className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {numberFormatter.format(analytics.summary.totalCapacity)}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Seats Offered</div>
        </div>
        <div className="card p-4 text-center">
          <Clock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {numberFormatter.format(analytics.summary.totalCredits)}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Total Credits</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {analytics.enrollmentStatus === 'allZero' && isBeforeRegistration ? (
              <span className="text-gray-400">—</span>
            ) : (
              `${analytics.summary.utilizationRate}%`
            )}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Seat Fill Rate</div>
          {analytics.enrollmentStatus === 'allZero' && (
            <div className="mt-1 text-[11px] text-blue-700">
              {isBeforeRegistration && registrationDateLabel
                ? `Registration opens ${registrationDateLabel}`
                : 'Not published yet'}
            </div>
          )}
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {numberFormatter.format(analytics.summary.instructorCount)}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Instructors</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subject seats */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">
              {analytics.enrollmentStatus === 'allZero'
                ? 'Seat Capacity by Subject'
                : 'Seats Filled vs Remaining by Subject'}
            </h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.subjects} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="subject" type="category" width={60} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as (typeof analytics.subjects)[number];
                    const capacity = row.capacity;
                    const enrollment = row.enrollment;
                    const available = row.available;
                    const fillRate = capacity > 0 ? Math.round((enrollment / capacity) * 100) : 0;

                    return (
                      <div className="bg-white p-3 shadow-lg rounded-lg border">
                        <p className="font-medium">{row.subject}</p>
                        <p className="text-sm text-gray-600">
                          Seats offered: {numberFormatter.format(capacity)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Seats filled: {numberFormatter.format(enrollment)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Seats remaining: {numberFormatter.format(available)}
                        </p>
                        <p className="text-sm text-gray-600">Fill rate: {fillRate}%</p>
                        {analytics.enrollmentStatus === 'allZero' && (
                          <p className="text-xs text-blue-700 mt-2 mb-0">
                            {isBeforeRegistration && registrationDateLabel
                              ? `Registration opens ${registrationDateLabel}; enrollment may not be published yet.`
                              : 'Enrollment may not be published yet for this term.'}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                {analytics.enrollmentStatus === 'allZero' ? (
                  <Bar dataKey="capacity" name="Seats offered">
                    {analytics.subjects.map((entry) => (
                      <Cell key={`capacity-${entry.subject}`} fill={SUBJECT_COLORS[entry.subject].bg} />
                    ))}
                  </Bar>
                ) : (
                  <>
                    <Bar dataKey="enrollment" stackId="seats" fill="#A4232E" name="Seats filled" />
                    <Bar dataKey="available" stackId="seats" fill="#E5E7EB" name="Seats remaining" />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delivery method distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Delivery Method Distribution</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deliveryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={100}
                  dataKey="value"
                >
                  {deliveryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Faculty workload */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Faculty Workload (Top 10)</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.facultyWorkload}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 shadow-lg rounded-lg border">
                          <p className="font-medium">{data.fullName}</p>
                          <p className="text-sm text-gray-600">
                            {data.courses} courses • {data.credits} credits
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="courses" fill="#2563EB" name="Courses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Course Time Distribution</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.timeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="courses" fill="#059669" name="Courses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Subject breakdown table */}
      <div className="card mt-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Subject Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Courses
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seats Filled
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seats Offered
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seats Remaining
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fill Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.subjects.map((subject) => (
                <tr key={subject.subject} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="px-2 py-1 rounded text-white text-sm font-medium"
                      style={{ backgroundColor: SUBJECT_COLORS[subject.subject].bg }}
                    >
                      {subject.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {numberFormatter.format(subject.courseCount)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {analytics.enrollmentStatus === 'allZero' ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      numberFormatter.format(subject.enrollment)
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {numberFormatter.format(subject.capacity)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {numberFormatter.format(subject.available)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {analytics.enrollmentStatus === 'allZero' ? (
                      <span className="text-gray-400 font-medium">—</span>
                    ) : (
                      <span
                        className={`font-medium ${
                          subject.capacity > 0
                            ? Math.round((subject.enrollment / subject.capacity) * 100) > 80
                              ? 'text-red-600'
                              : 'text-green-600'
                            : 'text-gray-400'
                        }`}
                      >
                        {subject.capacity > 0
                          ? `${Math.round((subject.enrollment / subject.capacity) * 100)}%`
                          : 'N/A'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
