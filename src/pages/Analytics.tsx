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
import { Download, Users, BookOpen, Building, Clock } from 'lucide-react';

export default function Analytics() {
  const courses = useCourses();
  const { state } = useSchedule();

  // Calculate analytics data
  const analytics = useMemo(() => {
    // Subject distribution
    const subjectData = state.subjects.map((subject) => {
      const subjectCourses = courses.filter((c) => c.subject === subject);
      const totalEnrollment = subjectCourses.reduce(
        (sum, c) => sum + c.enrollment.current,
        0
      );
      const totalCapacity = subjectCourses.reduce(
        (sum, c) => sum + c.enrollment.maximum,
        0
      );
      return {
        name: subject,
        courses: subjectCourses.length,
        enrollment: totalEnrollment,
        capacity: totalCapacity,
        available: totalCapacity - totalEnrollment,
        fill: SUBJECT_COLORS[subject].bg,
      };
    });

    // Delivery method distribution
    const deliveryData = ['F2F', 'Online', 'Hybrid', 'Arranged'].map((method) => {
      const methodCourses = courses.filter((c) => c.delivery === method);
      return {
        name: method === 'F2F' ? 'Face-to-Face' : method,
        value: methodCourses.length,
        fill: DELIVERY_COLORS[method as keyof typeof DELIVERY_COLORS].bg,
      };
    }).filter((d) => d.value > 0);

    // Faculty workload
    const facultyWorkload = state.instructors
      .map((instructor) => {
        const instructorCourses = courses.filter(
          (c) => c.instructor?.email === instructor.email
        );
        const totalCredits = instructorCourses.reduce((sum, c) => sum + c.credits, 0);
        return {
          name: instructor.lastName,
          fullName: instructor.displayName,
          courses: instructorCourses.length,
          credits: totalCredits,
        };
      })
      .filter((f) => f.courses > 0)
      .sort((a, b) => b.courses - a.courses)
      .slice(0, 10);

    // Time distribution
    const timeDistribution = [
      { name: '7-9 AM', courses: 0 },
      { name: '9-11 AM', courses: 0 },
      { name: '11AM-1PM', courses: 0 },
      { name: '1-3 PM', courses: 0 },
      { name: '3-5 PM', courses: 0 },
      { name: '5-7 PM', courses: 0 },
      { name: '7-9 PM', courses: 0 },
    ];

    courses.forEach((course) => {
      course.meetings.forEach((meeting) => {
        const startHour = Math.floor(meeting.startMinutes / 60);
        if (startHour >= 7 && startHour < 9) timeDistribution[0].courses++;
        else if (startHour >= 9 && startHour < 11) timeDistribution[1].courses++;
        else if (startHour >= 11 && startHour < 13) timeDistribution[2].courses++;
        else if (startHour >= 13 && startHour < 15) timeDistribution[3].courses++;
        else if (startHour >= 15 && startHour < 17) timeDistribution[4].courses++;
        else if (startHour >= 17 && startHour < 19) timeDistribution[5].courses++;
        else if (startHour >= 19 && startHour < 21) timeDistribution[6].courses++;
      });
    });

    // Summary stats
    const totalEnrollment = courses.reduce((sum, c) => sum + c.enrollment.current, 0);
    const totalCapacity = courses.reduce((sum, c) => sum + c.enrollment.maximum, 0);
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    const avgClassSize =
      courses.length > 0
        ? Math.round(totalEnrollment / courses.filter((c) => c.enrollment.current > 0).length)
        : 0;

    return {
      subjectData,
      deliveryData,
      facultyWorkload,
      timeDistribution,
      summary: {
        totalCourses: courses.length,
        totalEnrollment,
        totalCapacity,
        totalCredits,
        avgClassSize,
        utilizationRate: totalCapacity > 0 ? Math.round((totalEnrollment / totalCapacity) * 100) : 0,
        instructorCount: state.instructors.length,
      },
    };
  }, [courses, state.subjects, state.instructors]);

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
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ewu-schedule-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive schedule analytics and reporting
          </p>
        </div>
        <button onClick={handleExport} className="btn btn-primary">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="card p-4 text-center">
          <BookOpen className="w-6 h-6 text-ewu-red mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {analytics.summary.totalCourses}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Courses</div>
        </div>
        <div className="card p-4 text-center">
          <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {analytics.summary.totalEnrollment}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Enrolled</div>
        </div>
        <div className="card p-4 text-center">
          <Building className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {analytics.summary.totalCapacity}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Capacity</div>
        </div>
        <div className="card p-4 text-center">
          <Clock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {analytics.summary.totalCredits}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Credits</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {analytics.summary.utilizationRate}%
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Utilization</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {analytics.summary.instructorCount}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Instructors</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subject enrollment */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Enrollment by Subject</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.subjectData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={60} />
                <Tooltip
                  formatter={(value, name) => [
                    value,
                    name === 'enrollment' ? 'Enrolled' : 'Capacity',
                  ]}
                />
                <Bar dataKey="enrollment" fill="#A4232E" name="Enrolled" />
                <Bar dataKey="capacity" fill="#E5E7EB" name="Capacity" />
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
                  data={analytics.deliveryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={100}
                  dataKey="value"
                >
                  {analytics.deliveryData.map((entry, index) => (
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
                  Enrolled
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.subjectData.map((subject) => (
                <tr key={subject.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="px-2 py-1 rounded text-white text-sm font-medium"
                      style={{ backgroundColor: subject.fill }}
                    >
                      {subject.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">{subject.courses}</td>
                  <td className="px-6 py-4 text-right text-gray-900">{subject.enrollment}</td>
                  <td className="px-6 py-4 text-right text-gray-900">{subject.capacity}</td>
                  <td className="px-6 py-4 text-right text-gray-900">{subject.available}</td>
                  <td className="px-6 py-4 text-right">
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
